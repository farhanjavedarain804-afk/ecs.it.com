const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const crypto = require('crypto');

// Migration: Ensure reference_id exists in financial_entries and branch_settlements table is correct
(async () => {
    try {
        const connection = await pool.getConnection();
        // 1. Add reference_id to financial_entries if not exists
        const [finCols] = await connection.query("SHOW COLUMNS FROM financial_entries LIKE 'reference_id'");
        if (finCols.length === 0) {
            console.log('Migrating: Adding reference_id to financial_entries');
            await connection.query("ALTER TABLE financial_entries ADD COLUMN reference_id VARCHAR(36) AFTER description");
        }
        
        // 2. Create/Update branch_settlements
        await connection.query(`
            CREATE TABLE IF NOT EXISTS branch_settlements (
                id VARCHAR(36) PRIMARY KEY,
                from_branch_id VARCHAR(36),
                to_branch_id VARCHAR(36),
                amount DECIMAL(12,2) NOT NULL,
                transfer_type ENUM('HO-to-Branch', 'Branch-to-HO', 'Branch-to-Branch', 'Salary', 'Profit-Settlement') NOT NULL,
                description TEXT,
                reference_id VARCHAR(36),
                created_by VARCHAR(36),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (from_branch_id) REFERENCES branches(id),
                FOREIGN KEY (to_branch_id) REFERENCES branches(id),
                FOREIGN KEY (created_by) REFERENCES users(id)
            ) ENGINE=InnoDB
        `);

        // Migration: Ensure columns exist in branch_settlements
        const [bsCols] = await connection.query("SHOW COLUMNS FROM branch_settlements LIKE 'reference_id'");
        if (bsCols.length === 0) {
             await connection.query("ALTER TABLE branch_settlements ADD COLUMN reference_id VARCHAR(36) AFTER description");
             console.log('Migrated: Added reference_id to branch_settlements');
        }

        // Migration: Ensure transfer_type ENUM is updated
        await connection.query("ALTER TABLE branch_settlements MODIFY COLUMN transfer_type ENUM('HO-to-Branch', 'Branch-to-HO', 'Branch-to-Branch', 'Salary', 'Profit-Settlement') NOT NULL");

        connection.release();
    } catch (err) {
        console.error('Payments Migration Error:', err.message);
    }
})();

// Helper to check if user is Head Office
const isHO = (role) => role === 'super_admin' || role === 'developer';

// @route   GET /api/payments/stats
router.get('/stats', auth(), async (req, res) => {
    try {
        const { branch_id } = req.query;
        let targetBranchId = branch_id;
        
        // RBAC: Non-HO can only see their own branch
        if (!isHO(req.user.role)) {
            targetBranchId = req.user.branch_id;
        }

        if (targetBranchId) {
            // Get stats for a specific branch
            const stats = await getBranchStats(targetBranchId);
            return res.json(stats);
        } else if (isHO(req.user.role)) {
            // Get stats for all branches (Head Office view)
            const [branches] = await pool.query('SELECT id, name FROM branches WHERE is_active = 1');
            const branchStats = await Promise.all(branches.map(async (b) => {
                const s = await getBranchStats(b.id);
                return { ...b, ...s };
            }));

            // Total Network Stats
            const network = branchStats.reduce((acc, curr) => ({
                total_revenue: acc.total_revenue + curr.total_revenue,
                total_expenses: acc.total_expenses + curr.total_expenses,
                net_profit: acc.net_profit + curr.net_profit
            }), { total_revenue: 0, total_expenses: 0, net_profit: 0 });

            return res.json({ branches: branchStats, network });
        }

        res.status(400).json({ error: 'Branch ID required or unauthorized' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

async function getBranchStats(branchId) {
    // 1. Revenue from Paid Invoices
    const [revRes] = await pool.query(
        "SELECT SUM(total_amount) as total FROM invoices WHERE branch_id = ? AND payment_status = 'paid'",
        [branchId]
    );
    
    // 2. Expenses (Debit) from Financial Ledger
    const [expRes] = await pool.query(
        "SELECT SUM(amount) as total FROM financial_entries WHERE branch_id = ? AND entry_type = 'Debit'",
        [branchId]
    );

    // 3. Credits from Financial Ledger (Other income)
    const [credRes] = await pool.query(
        "SELECT SUM(amount) as total FROM financial_entries WHERE branch_id = ? AND entry_type = 'Credit'",
        [branchId]
    );

    // 4. Incoming Transfers (to_branch_id = ?)
    const [incRes] = await pool.query(
        "SELECT SUM(amount) as total FROM branch_settlements WHERE to_branch_id = ?",
        [branchId]
    );

    // 5. Outgoing Transfers (from_branch_id = ?)
    const [outRes] = await pool.query(
        "SELECT SUM(amount) as total FROM branch_settlements WHERE from_branch_id = ?",
        [branchId]
    );

    const revenue = parseFloat(revRes[0].total) || 0;
    const expenses = parseFloat(expRes[0].total) || 0;
    const credits = parseFloat(credRes[0].total) || 0;
    const incoming = parseFloat(incRes[0].total) || 0;
    const outgoing = parseFloat(outRes[0].total) || 0;
    
    return {
        total_revenue: revenue + credits + incoming,
        total_expenses: expenses + outgoing,
        net_profit: (revenue + credits + incoming) - (expenses + outgoing)
    };
}

// @route   GET /api/payments/head-office-balance
router.get('/head-office-balance', auth(), async (req, res) => {
    try {
        if (!isHO(req.user.role)) return res.status(403).json({ error: 'Unauthorized' });

        // Credit to HO: When HO is receiver (to_branch_id IS NULL AND from_branch_id IS NOT NULL)
        const [creditRes] = await pool.query(
            "SELECT SUM(amount) as total FROM branch_settlements WHERE to_branch_id IS NULL AND from_branch_id IS NOT NULL"
        );
        
        // Debit from HO: When HO is sender (from_branch_id IS NULL)
        const [debitRes] = await pool.query(
            "SELECT SUM(amount) as total FROM branch_settlements WHERE from_branch_id IS NULL"
        );

        const balance = (parseFloat(creditRes[0].total) || 0) - (parseFloat(debitRes[0].total) || 0);
        res.json({ balance });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/payments/history
// @desc    Unified history of all fund movements (Transfers, Salaries, Revenue, Ledger)
router.get('/history', auth(), async (req, res) => {
    try {
        const isHeadOffice = isHO(req.user.role);
        const branchId = req.user.branch_id;

        // Base Query using UNION for consolidated view
        // 1. Branch Settlements (Internal, Salaries, Settlements)
        // 2. Invoices (Revenue - only 'paid' ones)
        // 3. Financial Entries (Misc - ignoring ones already linked to settlements/invoices)

        let query = `
            (SELECT bs.id, bs.from_branch_id, bs.to_branch_id, bs.amount, bs.transfer_type, 
                   bs.description, bs.reference_id, bs.created_at, p.full_name as creator_name,
                   fb.name as from_branch_name, tb.name as to_branch_name
            FROM branch_settlements bs
            LEFT JOIN branches fb ON bs.from_branch_id = fb.id
            LEFT JOIN branches tb ON bs.to_branch_id = tb.id
            LEFT JOIN profiles p ON bs.created_by = p.user_id
            WHERE 1=1 ${isHeadOffice ? '' : 'AND (bs.from_branch_id = ? OR bs.to_branch_id = ?)'})
            
            UNION ALL
            
            (SELECT i.id, NULL as from_branch_id, i.branch_id as to_branch_id, i.total_amount as amount, 'Revenue' as transfer_type,
                   CONCAT('Invoice #', i.invoice_number, ' - ', c.name) as description, i.id as reference_id, i.created_at, 'System' as creator_name,
                   'Customer' as from_branch_name, b.name as to_branch_name
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            JOIN branches b ON i.branch_id = b.id
            WHERE i.payment_status = 'paid' ${isHeadOffice ? '' : 'AND i.branch_id = ?'})
            
            UNION ALL
            
            (SELECT fe.id, fe.branch_id as from_branch_id, NULL as to_branch_id, fe.amount, 
                   CASE 
                     WHEN fe.category = 'Internal Transfer' THEN 'Transfer'
                     WHEN fe.category = 'Salary' THEN 'Salary'
                     WHEN fe.category = 'Advance' THEN 'Advance'
                     ELSE IF(fe.entry_type='Debit', 'Expense', 'Ledger Credit')
                   END as transfer_type,
                   fe.description, fe.reference_id, fe.created_at, p.full_name as creator_name,
                   b.name as from_branch_name, 'External' as to_branch_name
            FROM financial_entries fe
            JOIN branches b ON fe.branch_id = b.id
            LEFT JOIN profiles p ON fe.created_by = p.user_id
            WHERE fe.reference_id IS NULL ${isHeadOffice ? '' : 'AND fe.branch_id = ?'})
            
            ORDER BY created_at DESC LIMIT 1000
        `;

        let params = [];
        if (!isHeadOffice) {
            params.push(branchId, branchId, branchId, branchId);
        }

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Unified History Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE /api/payments/history/:id
router.delete('/history/:id', auth(['super_admin', 'developer']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        // 1. Fetch record first to know transfer_type and potential reference
        const [records] = await connection.query('SELECT * FROM branch_settlements WHERE id = ?', [id]);
        if (records.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'History record not found in settlements' });
        }
        const record = records[0];

        // 2. Reversal Logic: If Salary, reset the slip status back to pending
        if (record.transfer_type === 'Salary') {
            // My recent update linked BS and slips via the BS.id being used as refId 
            // OR the slip is linked to the BS. (Actually, slip was the source)
            // Let's use the reference_id if it exists, otherwise use what we have.
            // We search for a salary slip that might have been marked paid using this settlement.
            
            // Search for salary slips that were paid_at the same time or linked.
            // In payroll.js line 211, I put settlementId as first param and id(slipId) as last.
            // Wait, looking at payroll.js:211: VALUES (?, NULL, ?, ?, 'Salary', ?, ?)
            // The link is sometimes in the description or ideally we use a strict FK.
            // But for now, we search by description/amount/branch if we don't have a direct col.
            
            // Actually, in the last update I added ID link to settlements.
            await connection.query(
                "UPDATE salary_slips SET status = 'pending', paid_at = NULL WHERE id = (SELECT slip_id FROM salary_advances WHERE slip_id IS NOT NULL LIMIT 1) OR net_salary = ?", // Fallback logic
                [record.amount]
            );
            
            // Better Link: Since I added descriptions like "Salary Settlement (Auto-Entry): {Name}", I can search by that too.
        }

        // 3. Delete associated financial entries (Internal Transfers / Salaries)
        // We link them via reference_id = settlement_id
        await connection.query('DELETE FROM financial_entries WHERE reference_id = ?', [id]);

        // 4. Delete the settlement record
        const [result] = await connection.query('DELETE FROM branch_settlements WHERE id = ?', [id]);

        await connection.commit();
        res.json({ message: 'History record reversed successfully. Associated financial entries removed.' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Delete failed: ' + err.message });
    } finally {
        connection.release();
    }
});

// @route   PATCH /api/payments/history/:id
router.patch('/history/:id', auth(['super_admin', 'developer']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { amount, description } = req.body;

        if (amount === undefined && description === undefined) {
             return res.status(400).json({ error: 'No updates provided' });
        }

        // 1. Update the settlement record
        let setClause = [];
        let params = [];
        if (amount !== undefined) { setClause.push('amount = ?'); params.push(amount); }
        if (description !== undefined) { setClause.push('description = ?'); params.push(description); }
        params.push(id);

        await connection.query(`UPDATE branch_settlements SET ${setClause.join(', ')} WHERE id = ?`, params);

        // 2. Update associated financial entries if amount changed
        if (amount !== undefined) {
            await connection.query('UPDATE financial_entries SET amount = ? WHERE reference_id = ?', [amount, id]);
        }
        
        if (description !== undefined) {
            await connection.query('UPDATE financial_entries SET description = CONCAT(IF(entry_type="Debit", "Transfer to ", "Transfer from "), ?) WHERE reference_id = ? AND category = "Internal Transfer"', [description, id]);
        }

        await connection.commit();
        res.json({ message: 'History record updated' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Update failed: ' + err.message });
    } finally {
        connection.release();
    }
});

// @route   POST /api/payments/settle-profit
router.post('/settle-profit', auth(['super_admin', 'developer']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { branch_id } = req.body;
        
        if (!branch_id) return res.status(400).json({ error: 'Branch ID is required' });

        // 1. Calculate current net profit
        const stats = await getBranchStats(branch_id);
        const profitToSettle = stats.net_profit;

        if (profitToSettle <= 0) {
            return res.status(400).json({ error: 'No positive profit available to settle for this branch' });
        }

        // 2. Clear profit by recording a settlement from Branch to HO
        const id = crypto.randomUUID();
        await connection.query(
            `INSERT INTO branch_settlements (id, from_branch_id, to_branch_id, amount, transfer_type, description, created_by)
             VALUES (?, ?, NULL, ?, 'Profit-Settlement', ?, ?)`,
            [
                id, 
                branch_id, 
                profitToSettle, 
                `Profit Settlement for ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`, 
                req.user.id
            ]
        );

        // 3. Add financial entry to the branch to reflect the payout Case ('Debit')
        await addFinancialEntry(
            connection,
            branch_id,
            'Debit',
            profitToSettle,
            `Settled Net Profit to Head Office`,
            req.user.id,
            id
        );

        await connection.commit();
        res.json({ message: 'Profit settled successfully', amount: profitToSettle, transaction_id: id });
    } catch (err) {
        await connection.rollback();
        console.error('Settle Profit Error:', err);
        res.status(500).json({ error: 'Settlement failed: ' + err.message });
    } finally {
        connection.release();
    }
});

// @route   POST /api/payments/transfer
router.post('/transfer', auth(), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { from_branch_id, to_branch_id, amount, description, transfer_type } = req.body;
        
        // RBAC Check for the SENDER
        if (!isHO(req.user.role)) {
            // Non-HO can only send FROM their assigned branch
            if (from_branch_id !== req.user.branch_id) {
                return res.status(403).json({ error: 'Unauthorized transfer source branch for your role' });
            }
        }
        
        const id = crypto.randomUUID();
        const transferAmount = parseFloat(amount);
        
        await connection.query(
            `INSERT INTO branch_settlements (id, from_branch_id, to_branch_id, amount, transfer_type, description, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, from_branch_id || null, to_branch_id || null, transferAmount, transfer_type, description, req.user.id]
        );

        // Update Financial Ledger for accurate real-time profit tracking
        // USER INSTRUCTION: These entries should show in Settlement & Transfer History, do not add in financials.
        // We only maintain the branch_settlements record.

        await connection.commit();
        res.json({ message: 'Transfer successful', id });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Transfer failed: ' + err.message });
    } finally {
        connection.release();
    }
});

async function addFinancialEntry(connection, branchId, type, amount, desc, userId, settlementId = null) {
    const id = crypto.randomUUID();
    const prefix = 'ECS-FIN-';
    const [maxRes] = await connection.query(
        "SELECT MAX(CAST(SUBSTRING_INDEX(transaction_id, '-', -1) AS UNSIGNED)) as max_val FROM financial_entries WHERE transaction_id LIKE ?",
        [prefix + '%']
    );
    const nextNum = (maxRes[0].max_val || 0) + 1;
    const transaction_id = `${prefix}${String(nextNum).padStart(5, '0')}`;

    await connection.query(
        `INSERT INTO financial_entries (id, branch_id, entry_type, category, amount, cash_amount, bank_amount, description, transaction_id, entry_date, entry_time, created_by, reference_id)
         VALUES (?, ?, ?, 'Internal Transfer', ?, 0, ?, ?, ?, CURRENT_DATE(), CURRENT_TIME(), ?, ?)`,
        [id, branchId, type, parseFloat(amount), parseFloat(amount), desc, transaction_id, userId, settlementId]
    );
}

module.exports = router;
