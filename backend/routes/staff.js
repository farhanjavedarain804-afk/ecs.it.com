// Helper to automatically ensure all expanded staff columns exist in the DB schema
const ensureStaffColumns = async () => {
    try {
        const [cols] = await pool.query("SHOW COLUMNS FROM staff");
        const colNames = cols.map(c => c.Field);

        const newCols = [
            { name: 'dob', def: 'DATE DEFAULT NULL' },
            { name: 'gender', def: "VARCHAR(20) DEFAULT 'Male'" },
            { name: 'marital_status', def: "VARCHAR(20) DEFAULT 'Single'" },
            { name: 'blood_group', def: 'VARCHAR(10) DEFAULT NULL' },
            { name: 'email', def: 'VARCHAR(255) DEFAULT NULL' },
            { name: 'current_address', def: 'TEXT DEFAULT NULL' },
            { name: 'department', def: "VARCHAR(100) DEFAULT 'Operations'" },
            { name: 'employment_type', def: "VARCHAR(50) DEFAULT 'Full-Time'" },
            { name: 'shift_timing', def: "VARCHAR(50) DEFAULT 'Morning'" },
            { name: 'reporting_manager', def: 'VARCHAR(255) DEFAULT NULL' },
            { name: 'payment_mode', def: "VARCHAR(50) DEFAULT 'Bank Transfer'" },
            { name: 'bank_name', def: 'VARCHAR(100) DEFAULT NULL' },
            { name: 'account_title', def: 'VARCHAR(255) DEFAULT NULL' },
            { name: 'account_number', def: 'VARCHAR(100) DEFAULT NULL' },
            { name: 'allowances', def: 'DECIMAL(12,2) DEFAULT 0' },
            { name: 'emergency_contact_name', def: 'VARCHAR(255) DEFAULT NULL' },
            { name: 'emergency_relation', def: 'VARCHAR(100) DEFAULT NULL' },
            { name: 'emergency_phone', def: 'VARCHAR(50) DEFAULT NULL' },
            { name: 'profile_photo', def: 'TEXT DEFAULT NULL' },
            { name: 'doc_cnic', def: 'TEXT DEFAULT NULL' },
            { name: 'doc_resume', def: 'TEXT DEFAULT NULL' },
            { name: 'doc_appointment', def: 'TEXT DEFAULT NULL' },
            { name: 'termination_reason', def: 'TEXT DEFAULT NULL' },
            { name: 'terminated_at', def: 'DATETIME DEFAULT NULL' },
            { name: 'terminated_by', def: 'VARCHAR(255) DEFAULT NULL' },
            { name: 'status_changed_at', def: 'DATETIME DEFAULT NULL' }
        ];

        for (const col of newCols) {
            if (!colNames.includes(col.name)) {
                await pool.query(`ALTER TABLE staff ADD COLUMN ${col.name} ${col.def}`);
            }
        }
    } catch (e) {
        console.error('Error ensuring staff columns:', e.message);
    }
};
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET /api/staff
// @desc    Get all staff members
router.get('/', auth(), async (req, res) => {
    try {
        await ensureStaffColumns();
        const { branch_id, employee_id, status } = req.query;
        let query = 'SELECT s.*, b.name as branch_name FROM staff s LEFT JOIN branches b ON s.branch_id = b.id WHERE 1=1';
        let params = [];

        if (branch_id) {
            query += ' AND s.branch_id = ?';
            params.push(branch_id);
        } else if (req.user.role !== 'developer' && req.user.role !== 'super_admin' && req.user.branch_id) {
            // Restriction: Branch isolation
            query += ' AND s.branch_id = ?';
            params.push(req.user.branch_id);
        }

        if (employee_id) {
            query += ' AND s.employee_id LIKE ?';
            params.push(`%${employee_id}%`);
        }

        if (status) {
            query += ' AND s.status = ?';
            params.push(status);
        }

        const [results] = await pool.query(query, params);
        const formatted = results.map(r => {
            const row = { ...r, branches: { name: r.branch_name } };
            // Restriction: Mask salary for Branch Admin and restricted roles
            if (req.user.role === 'branch_admin' || req.user.role === 'view_only') {
                delete row.salary;
            }
            return row;
        });
        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/staff
// @desc    Add new staff member with full identity, job, payroll, emergency, and document details
router.post('/', auth(['super_admin', 'manager']), async (req, res) => {
    try {
        await ensureStaffColumns();
        let {
            employee_id, full_name, father_name, cnic, designation,
            branch_id, status, joining_date, salary, contact_1,
            contact_2, address,
            dob, gender, marital_status, blood_group, email, current_address,
            department, employment_type, shift_timing, reporting_manager,
            payment_mode, bank_name, account_title, account_number, allowances,
            emergency_contact_name, emergency_relation, emergency_phone,
            profile_photo, doc_cnic, doc_resume, doc_appointment
        } = req.body;

        if (!full_name || !branch_id) {
            return res.status(400).json({ error: 'Full name and branch are required' });
        }

        const id = require('crypto').randomUUID();

        // Auto-generate employee_id if missing (e.g., ECS-2026-STF-00001)
        if (!employee_id) {
            const year = new Date().getFullYear();
            const prefix = `ECS-${year}-STF-`;
            const [maxId] = await pool.query("SELECT MAX(CAST(SUBSTRING_INDEX(employee_id, '-', -1) AS UNSIGNED)) as max_val FROM staff WHERE employee_id LIKE ?", [prefix + '%']);
            const nextNum = (maxId[0].max_val || 0) + 1;
            employee_id = `${prefix}${String(nextNum).padStart(5, '0')}`;
        }

        let finalBranchId = branch_id;
        if (req.user.role !== 'developer' && req.user.role !== 'super_admin') {
            finalBranchId = req.user.branch_id;
        }

        const insertQuery = `
            INSERT INTO staff (
                id, employee_id, full_name, father_name, cnic, designation, branch_id, status, 
                joining_date, salary, contact_1, contact_2, address,
                dob, gender, marital_status, blood_group, email, current_address,
                department, employment_type, shift_timing, reporting_manager,
                payment_mode, bank_name, account_title, account_number, allowances,
                emergency_contact_name, emergency_relation, emergency_phone,
                profile_photo, doc_cnic, doc_resume, doc_appointment
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const insertParams = [
            id, employee_id, full_name, father_name || null, cnic || null, designation || null, finalBranchId, status || 'active',
            joining_date || null, (req.user.role === 'branch_admin' ? 0 : (salary || 0)), contact_1 || null, contact_2 || null, address || null,
            dob || null, gender || 'Male', marital_status || 'Single', blood_group || null, email || null, current_address || null,
            department || 'Operations', employment_type || 'Full-Time', shift_timing || 'Morning', reporting_manager || null,
            payment_mode || 'Bank Transfer', bank_name || null, account_title || null, account_number || null, allowances || 0,
            emergency_contact_name || null, emergency_relation || null, emergency_phone || null,
            profile_photo || null, doc_cnic || null, doc_resume || null, doc_appointment || null
        ];

        await pool.query(insertQuery, insertParams);

        res.status(201).json({ id, employee_id, full_name });
    } catch (err) {
        console.error('Staff Creation Error:', err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// @route   PATCH /api/staff/:id
// @desc    Update staff member
router.patch('/:id', auth(['super_admin', 'manager', 'branch_admin']), async (req, res) => {
    try {
        await ensureStaffColumns();
        const { id } = req.params;
        const updates = req.body;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No update data provided' });
        }

        // RBAC & Time Lock
        const [current] = await pool.query('SELECT branch_id, created_at FROM staff WHERE id = ?', [id]);
        if (current.length === 0) return res.status(404).json({ error: 'Staff not found' });

        if (req.user.role !== 'developer' && req.user.role !== 'super_admin') {
            if (current[0].branch_id !== req.user.branch_id) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            // Branch admins can't edit staff after 2 hours (allow status / termination updates anytime)
            const isStatusOnly = Object.keys(updates).every(k => ['status', 'termination_reason', 'terminated_at', 'terminated_by', 'status_changed_at', 'notes'].includes(k));
            if (!isStatusOnly) {
                const hoursSinceCreation = (new Date() - new Date(current[0].created_at)) / (1000 * 60 * 60);
                if (hoursSinceCreation > 2) {
                    return res.status(403).json({ error: 'Update locked: Branch Admins cannot edit records older than 2 hours.' });
                }
            }
            
            // Mask salary from updates if attempted
            if (updates.salary !== undefined) delete updates.salary;
        }

        // Handle status change timestamp
        if (updates.status && updates.status !== current[0].status) {
            try {
                // Check if status_changed_at column exists
                const [cols] = await pool.query('SHOW COLUMNS FROM staff LIKE ?', ['status_changed_at']);
                if (cols.length > 0) {
                    if (updates.status === 'terminated' || updates.status === 'inactive') {
                        updates.status_changed_at = new Date().toISOString().slice(0, 19).replace('T', ' '); // MySQL format
                    } else if (updates.status === 'active') {
                        updates.status_changed_at = null;
                    }
                }
            } catch (colErr) {
                console.warn('[Staff] Migration pending: status_changed_at column not found.');
            }
        }

        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), id];
        await pool.query(`UPDATE staff SET ${fields} WHERE id = ?`, values);
        res.json({ message: 'Staff member updated' });
    } catch (err) {
        console.error('Staff Update Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE /api/staff/:id
// @desc    Delete staff member
router.delete('/:id', auth(['super_admin', 'manager']), async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM staff WHERE id = ?', [id]);
        res.json({ message: 'Staff member deleted' });
    } catch (err) {
        console.error('Staff Deletion Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
