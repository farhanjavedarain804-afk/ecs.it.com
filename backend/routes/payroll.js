const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const crypto = require('crypto');

// Migration: Ensure salary_advances table exists and salary_slips has advance_deduction column
const runMigration = async () => {
    const connection = await pool.getConnection();
    try {
        console.log('Running Payroll Migrations...');
        
        // 1. Create salary_advances table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS salary_advances (
                id VARCHAR(36) PRIMARY KEY,
                staff_id VARCHAR(36) NOT NULL,
                amount DECIMAL(12, 2) NOT NULL,
                purpose TEXT,
                advance_date DATE NOT NULL,
                status ENUM('pending', 'paid', 'deducted', 'cancelled') DEFAULT 'pending',
                slip_id VARCHAR(36),
                paid_at DATETIME,
                created_by VARCHAR(36),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);

        // Migration: Ensure status ENUM is updated if it exists
        await connection.query("ALTER TABLE salary_advances MODIFY COLUMN status ENUM('pending', 'paid', 'deducted', 'cancelled') DEFAULT 'pending'");
        
        // Migration: Add paid_at column if not exists
        const [advCols] = await connection.query("SHOW COLUMNS FROM salary_advances LIKE 'paid_at'");
        if (advCols.length === 0) {
            await connection.query("ALTER TABLE salary_advances ADD COLUMN paid_at DATETIME AFTER slip_id");
            console.log('Added paid_at column to salary_advances');
        }

        // 2. Add advance_deduction to salary_slips if not exists
        const [columns] = await connection.query("SHOW COLUMNS FROM salary_slips LIKE 'advance_deduction'");
        if (columns.length === 0) {
            await connection.query("ALTER TABLE salary_slips ADD COLUMN advance_deduction DECIMAL(12, 2) DEFAULT 0 AFTER deductions");
            console.log('Added advance_deduction column to salary_slips');
        }

        console.log('Payroll Migrations COMPLETED.');
    } catch (err) {
        console.error('Payroll Migration Error:', err);
    } finally {
        connection.release();
    }
};
runMigration();

// Helper to check if user is Head Office
const isHO = (role) => role === 'super_admin' || role === 'developer';



// @route   GET /api/payroll/staff
// @desc    Get staff filtered by branch for payroll
router.get('/staff', auth(['view_only', 'manager']), async (req, res) => {
    try {
        const { branch_id } = req.query;
        // Relaxed status filter to ensure staff are visible; usually active but showing all for transparency
        // Update: Now only showing 'active' staff for new payroll entries as per new requirement
        let query = "SELECT s.id, s.employee_id, s.full_name, s.designation, s.salary, b.name as branch_name FROM staff s LEFT JOIN branches b ON s.branch_id = b.id WHERE s.status = 'active'";
        let params = [];

        if (branch_id) {
            query += ' AND s.branch_id = ?';
            params.push(branch_id);
        }

        const [results] = await pool.query(query, params);
        res.json(results);
    } catch (err) {
        console.error('Payroll Staff Fetch Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/payroll/generate
// @desc    Generate a salary slip
router.post('/generate', auth(['super_admin']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const {
            staff_id, month, year, basic_salary,
            allowances, deductions, notes
        } = req.body;

        if (!staff_id || !month || !year) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 1. Auto-fetch PAID advances (Money already given to employee)
        const [pendingAdvances] = await connection.query(
            "SELECT id, amount FROM salary_advances WHERE staff_id = ? AND status = 'paid'",
            [staff_id]
        );

        const totalAdvance = pendingAdvances.reduce((sum, adv) => sum + parseFloat(adv.amount), 0);
        const n = (val) => parseFloat(val) || 0;
        
        // Total deductions = manual deductions + auto-deducted advances
        const totalDeductions = n(deductions) + totalAdvance;
        const netSalary = n(basic_salary) + n(allowances) - totalDeductions;

        // Check if slip already exists for this month/year/staff
        const [existing] = await connection.query(
            'SELECT id FROM salary_slips WHERE staff_id = ? AND month = ? AND year = ?',
            [staff_id, month, year]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Salary slip already exists for this month/year' });
        }

        const slipId = crypto.randomUUID();
        const verificationId = Math.floor(10000000 + Math.random() * 90000000).toString(); 

        // Generate slip number (ECS-YYYYMMDD-SS-XXXXX)
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const slipPrefix = `ECS-${dateStr}-SS-`;

        const [maxId] = await connection.query(
            "SELECT MAX(CAST(SUBSTRING_INDEX(slip_number, '-', -1) AS UNSIGNED)) as max_val FROM salary_slips WHERE slip_number LIKE ?",
            [slipPrefix + '%']
        );
        const nextNum = (maxId[0].max_val || 0) + 1;
        const slipNumber = `${slipPrefix}${String(nextNum).padStart(5, '0')}`;

        await connection.query(
            `INSERT INTO salary_slips (
                id, slip_number, verification_id, staff_id, month, year, 
                basic_salary, allowances, deductions, advance_deduction, net_salary,
                status, generated_by, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                slipId, slipNumber, verificationId, staff_id, month, year,
                n(basic_salary), n(allowances), n(deductions), totalAdvance, netSalary,
                'pending', req.user.id, notes || null
            ]
        );

        // 3. Mark advances as deducted and link to the slip
        if (pendingAdvances.length > 0) {
            const advIds = pendingAdvances.map(a => a.id);
            await connection.query(
                "UPDATE salary_advances SET status = 'deducted', slip_id = ? WHERE id IN (?)",
                [slipId, advIds]
            );
        }

        await connection.commit();
        res.status(201).json({ id: slipId, slip_number: slipNumber, verification_id: verificationId });
    } catch (err) {
        await connection.rollback();
        console.error('Salary Generation Error:', err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        connection.release();
    }
});

// @route   PATCH /api/payroll/pay/:id
// @desc    Mark a slip as paid & deduct from Head Office balance
router.patch('/pay/:id', auth(['super_admin']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        // 1. Get slip details for the settlement record
        const [slips] = await connection.query(
            'SELECT ss.net_salary, s.full_name, s.branch_id FROM salary_slips ss JOIN staff s ON ss.staff_id = s.id WHERE ss.id = ?',
            [id]
        );

        if (slips.length === 0) {
            return res.status(404).json({ error: 'Salary slip not found' });
        }

        const slip = slips[0];

        // 2. Update status to paid
        await connection.query(
            'UPDATE salary_slips SET status = "paid", paid_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );

        // 3. Record in branch_settlements (Deducted strictly from Head Office, NOT branch)
        const settlementId = crypto.randomUUID();
        await connection.query(
            `INSERT INTO branch_settlements (id, from_branch_id, to_branch_id, amount, transfer_type, description, created_by, reference_id)
             VALUES (?, NULL, NULL, ?, 'Salary', ?, ?, ?)`,
            [
                settlementId, 
                slip.net_salary, 
                `Salary Settlement (Auto-Entry): ${slip.full_name}`, 
                req.user.id,
                id // Link to slip
            ]
        );

        await connection.commit();
        res.json({ message: 'Salary slip marked as paid & deducted from HO profit' });
    } catch (err) {
        await connection.rollback();
        console.error('Salary Payment Error:', err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        connection.release();
    }
});

// @route   GET /api/payroll/slips
// @desc    Get salary slip history
router.get('/slips', auth(['view_only', 'manager']), async (req, res) => {
    try {
        const { staff_id, branch_id, month, year } = req.query;
        let query = `
            SELECT ss.*, s.full_name as staff_name, s.employee_id, s.designation, s.joining_date, b.name as branch_name 
            FROM salary_slips ss 
            JOIN staff s ON ss.staff_id = s.id 
            LEFT JOIN branches b ON s.branch_id = b.id 
            WHERE 1=1
        `;
        let params = [];

        if (staff_id) {
            query += ' AND ss.staff_id = ?';
            params.push(staff_id);
        }
        if (branch_id) {
            query += ' AND s.branch_id = ?';
            params.push(branch_id);
        }
        if (month) {
            query += ' AND ss.month = ?';
            params.push(month);
        }
        if (year) {
            query += ' AND ss.year = ?';
            params.push(year);
        }

        query += ' ORDER BY ss.created_at DESC';

        const [results] = await pool.query(query, params);
        res.json(results);
    } catch (err) {
        console.error('Payroll Slips History Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/payroll/slips/:id
// @desc    Get a single salary slip by ID
router.get('/slips/:id', auth(['view_only', 'manager']), async (req, res) => {
    try {
        const { id } = req.params;
        const [results] = await pool.query(`
            SELECT ss.*, s.full_name as staff_name, s.employee_id, s.designation, s.joining_date, b.name as branch_name 
            FROM salary_slips ss 
            JOIN staff s ON ss.staff_id = s.id 
            LEFT JOIN branches b ON s.branch_id = b.id 
            WHERE ss.id = ?
        `, [id]);

        if (results.length === 0) {
            return res.status(404).json({ error: 'Salary slip not found' });
        }

        res.json(results[0]);
    } catch (err) {
        console.error('Fetch Slip Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE /api/payroll/slips/:id
// @desc    Delete a salary slip
router.delete('/slips/:id', auth(['super_admin']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        // 1. Reset any linked advances
        await connection.query(
            "UPDATE salary_advances SET status = 'pending', slip_id = NULL WHERE slip_id = ?",
            [id]
        );

        // 2. Delete from branch_settlements (Restore HO Balance)
        await connection.query("DELETE FROM branch_settlements WHERE reference_id = ?", [id]);

        await connection.commit();
        res.json({ message: 'Salary slip deleted successfully, financial entries reversed, and linked advances reset' });
    } catch (err) {
        await connection.rollback();
        console.error('Delete Slip Error:', err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        connection.release();
    }
});

// @route   POST /api/payroll/advance
// @desc    Record a new salary advance
router.post('/advance', auth(['super_admin', 'developer']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { staff_id, amount, purpose, advance_date } = req.body;

        if (!staff_id || !amount || !advance_date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get staff branch and name
        const [staffRes] = await connection.query(
            "SELECT full_name, branch_id FROM staff WHERE id = ?",
            [staff_id]
        );
        if (staffRes.length === 0) throw new Error('Staff not found');
        const staffMember = staffRes[0];

        const id = crypto.randomUUID();
        await connection.query(
            `INSERT INTO salary_advances (id, staff_id, amount, purpose, advance_date, status, created_by)
             VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
            [id, staff_id, amount, purpose || null, advance_date, req.user.id]
        );

        // USER INSTRUCTION: Do not add to financials on creation.
        // Financial entry will be added when marked as 'paid' via /advance/:id/pay

        await connection.commit();
        res.status(201).json({ id, message: 'Advance recorded successfully' });
    } catch (err) {
        await connection.rollback();
        console.error('Advance Recording Error:', err);
        res.status(500).json({ error: err.message || 'Server error' });
    } finally {
        connection.release();
    }
});

// @route   GET /api/payroll/advances
// @desc    Get all advances
router.get('/advances', auth(['view_only', 'manager']), async (req, res) => {
    try {
        const { branch_id } = req.query;
        let query = `
            SELECT sa.*, s.full_name as staff_name, s.employee_id, b.name as branch_name 
            FROM salary_advances sa
            JOIN staff s ON sa.staff_id = s.id
            LEFT JOIN branches b ON s.branch_id = b.id
            WHERE 1=1
        `;
        let params = [];

        if (branch_id && branch_id !== 'all') {
            query += ' AND s.branch_id = ?';
            params.push(branch_id);
        } else if (!isHO(req.user.role)) {
            query += ' AND s.branch_id = ?';
            params.push(req.user.branch_id);
        }

        query += ' ORDER BY sa.created_at DESC';
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Fetch Advances Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PATCH /api/payroll/advance/:id/pay
// @desc    Mark an advance as paid and add to financial ledger
router.patch('/advance/:id/pay', auth(['super_admin', 'developer']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        // 1. Get advance details
        const [advances] = await connection.query(
            'SELECT sa.*, s.full_name, s.branch_id FROM salary_advances sa JOIN staff s ON sa.staff_id = s.id WHERE sa.id = ?',
            [id]
        );

        if (advances.length === 0) return res.status(404).json({ error: 'Advance not found' });
        if (advances[0].status !== 'pending') return res.status(400).json({ error: 'Only pending advances can be marked as paid' });

        const adv = advances[0];

        // 2. Update status
        await connection.query(
            "UPDATE salary_advances SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?",
            [id]
        );

        // 3. Record in branch_settlements (Deducted strictly from Head Office, NOT branch)
        await connection.query(
            `INSERT INTO branch_settlements (id, from_branch_id, to_branch_id, amount, transfer_type, description, created_by, reference_id)
             VALUES (?, NULL, NULL, ?, 'Salary', ?, ?, ?)`,
            [
                crypto.randomUUID(), 
                adv.amount, 
                `Salary Advance Payout: ${adv.full_name}`, 
                req.user.id,
                id // Link to advance
            ]
        );

        await connection.commit();
        res.json({ message: 'Advance marked as paid and recorded in ledger' });
    } catch (err) {
        await connection.rollback();
        console.error('Pay Advance Error:', err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        connection.release();
    }
});

// @route   GET /api/payroll/pending-advances/:staff_id
// @desc    Get paid advances for a staff member that are ready to be deducted
router.get('/pending-advances/:staff_id', auth(['view_only', 'manager']), async (req, res) => {
    try {
        const { staff_id } = req.params;
        const [results] = await pool.query(
            "SELECT id, amount, purpose, advance_date FROM salary_advances WHERE staff_id = ? AND status = 'paid'",
            [staff_id]
        );
        res.json(results);
    } catch (err) {
        console.error('Fetch Pending Advances Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE /api/payroll/advances/:id
// @desc    Cancel/Delete an advance and remove from ledger (reversal)
router.delete('/advances/:id', auth(['super_admin', 'developer']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        // 1. Check if advance exists
        const [current] = await connection.query("SELECT status FROM salary_advances WHERE id = ?", [id]);
        if (current.length === 0) {
            return res.status(404).json({ error: 'Advance not found' });
        }
        
        const advStatus = current[0].status;
        if (advStatus === 'deducted' && !isHO(req.user.role)) {
            return res.status(400).json({ error: 'Already deducted from salary—cannot delete' });
        }

        // 2. Delete from branch_settlements (Restore HO Balance)
        await connection.query("DELETE FROM branch_settlements WHERE reference_id = ?", [id]);

        // 4. Delete from advances
        await connection.query("DELETE FROM salary_advances WHERE id = ?", [id]);

        await connection.commit();
        res.json({ message: 'Advance record and associated ledger entries reversed successfully' });
    } catch (err) {
        await connection.rollback();
        console.error('Delete Advance Error:', err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;
