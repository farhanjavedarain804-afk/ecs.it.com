const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET /api/financial_entries
router.get('/', auth(), async (req, res) => {
    try {
        const { branch_id } = req.query;
        let whereClause = 'WHERE 1=1';
        let params = [];
        
        if (branch_id) {
            whereClause += ' AND fe.branch_id = ?';
            params.push(branch_id);
        } else if (req.user.role !== 'developer' && req.user.role !== 'super_admin' && req.user.branch_id) {
            whereClause += ' AND fe.branch_id = ?';
            params.push(req.user.branch_id);
        }

        // 1. Fetch Entries with Running Balance
        // Note: Using a subquery for running balance to ensure compatibility if window functions are tricky with order
        const entriesQuery = `
            SELECT fe.*, b.name as branch_name,
            (
                SELECT SUM(CASE WHEN t2.entry_type IN ('Credit', 'income') THEN t2.amount ELSE -t2.amount END)
                FROM financial_entries t2
                WHERE (t2.entry_date < fe.entry_date) 
                   OR (t2.entry_date = fe.entry_date AND t2.created_at <= fe.created_at)
                   ${branch_id ? ' AND t2.branch_id = ?' : (req.user.role !== 'developer' && req.user.role !== 'super_admin' && req.user.branch_id ? ' AND t2.branch_id = ?' : '')}
            ) as running_balance
            FROM financial_entries fe
            LEFT JOIN branches b ON fe.branch_id = b.id
            ${whereClause}
            ORDER BY fe.entry_date DESC, fe.created_at DESC 
            LIMIT 100
        `;
        
        // Adjust params for subquery
        const subqueryBranchId = branch_id || (req.user.role !== 'developer' && req.user.role !== 'super_admin' ? req.user.branch_id : null);
        const entriesParams = subqueryBranchId ? [subqueryBranchId, ...params] : params;

        const [entries] = await pool.query(entriesQuery, entriesParams);

        // 2. Fetch Summary Totals (Independent of LIMIT)
        const summaryQuery = `
            SELECT 
                SUM(CASE WHEN entry_type IN ('Credit', 'income') THEN amount ELSE 0 END) as total_credit,
                SUM(CASE WHEN entry_type IN ('Debit', 'expense') THEN amount ELSE 0 END) as total_debit,
                SUM(CASE WHEN entry_type IN ('Credit', 'income') THEN cash_amount ELSE -cash_amount END) as total_cash,
                SUM(CASE WHEN entry_type IN ('Credit', 'income') THEN bank_amount ELSE -bank_amount END) as total_bank,
                COUNT(*) as month_activity
            FROM financial_entries fe
            ${whereClause}
            ${whereClause.includes('AND') ? '' : ''} 
        `;
        
        // Filter month activity to current month for the specific count
        const currentMonthQuery = summaryQuery + " AND MONTH(entry_date) = MONTH(CURRENT_DATE()) AND YEAR(entry_date) = YEAR(CURRENT_DATE())";
        
        const [summaryResult] = await pool.query(summaryQuery, params);
        const [monthResult] = await pool.query(currentMonthQuery, params);

        const summary = {
            total_credit: parseFloat(summaryResult[0].total_credit) || 0,
            total_debit: parseFloat(summaryResult[0].total_debit) || 0,
            total_cash: parseFloat(summaryResult[0].total_cash) || 0,
            total_bank: parseFloat(summaryResult[0].total_bank) || 0,
            net_balance: (parseFloat(summaryResult[0].total_credit) || 0) - (parseFloat(summaryResult[0].total_debit) || 0),
            month_activity: parseInt(monthResult[0].month_activity) || 0
        };

        const formatted = entries.map(r => ({
            ...r,
            branches: { name: r.branch_name },
            transaction_id: r.transaction_id || `#${r.id.slice(0, 8)}`,
            amount: parseFloat(r.amount) || 0,
            cash_amount: parseFloat(r.cash_amount) || 0,
            bank_amount: parseFloat(r.bank_amount) || 0,
            running_balance: parseFloat(r.running_balance) || 0
        }));

        res.json({ entries: formatted, summary });
    } catch (err) {
        console.error('Error fetching financial_entries:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

const crypto = require('crypto');

// @route   POST /api/financial_entries
router.post('/', auth(), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { branch_id, entry_type, category, cash_amount, bank_amount, description, entry_date, entry_time } = req.body;
        
        let finalBranchId = branch_id;
        if (req.user.role !== 'developer' && req.user.role !== 'super_admin') {
            finalBranchId = req.user.branch_id;
        }

        const id = crypto.randomUUID();
        const n = (val) => parseFloat(val) || 0;
        const amount = n(cash_amount) + n(bank_amount);

        // Generate global sequential transaction_id (ECS-FIN-XXXXX)
        const prefix = 'ECS-FIN-';
        const [maxRes] = await connection.query(
            "SELECT MAX(CAST(SUBSTRING_INDEX(transaction_id, '-', -1) AS UNSIGNED)) as max_val FROM financial_entries WHERE transaction_id LIKE ?",
            [prefix + '%']
        );
        const nextNum = (maxRes[0].max_val || 0) + 1;
        const transaction_id = `${prefix}${String(nextNum).padStart(5, '0')}`;

        await connection.query(
            `INSERT INTO financial_entries (
                id, branch_id, entry_type, category, amount, 
                cash_amount, bank_amount, description, transaction_id,
                entry_date, entry_time, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, finalBranchId, entry_type, category || 'Ledger', amount,
                n(cash_amount), n(bank_amount), description, transaction_id,
                entry_date, entry_time || '00:00:00', req.user.id
            ]
        );

        await connection.commit();
        res.status(201).json({ id, transaction_id });
    } catch (err) {
        await connection.rollback();
        console.error('Financial Entry Creation Error:', err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    } finally {
        connection.release();
    }
});

// @route   PATCH /api/financial_entries/:id
router.patch('/:id', auth(), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        // RBAC & Time Lock
        const [current] = await pool.query('SELECT branch_id, created_at FROM financial_entries WHERE id = ?', [id]);
        if (current.length === 0) return res.status(404).json({ error: 'Entry not found' });

        if (req.user.role !== 'developer' && req.user.role !== 'super_admin') {
            if (current[0].branch_id !== req.user.branch_id) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            const hoursSinceCreation = (new Date() - new Date(current[0].created_at)) / (1000 * 60 * 60);
            if (hoursSinceCreation > 2) {
                return res.status(403).json({ error: 'Update locked: Records older than 2 hours can only be modified by Super Admin.' });
            }
        }

        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), id];
        await pool.query(`UPDATE financial_entries SET ${fields} WHERE id = ?`, values);
        res.json({ message: 'Entry updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE /api/financial_entries/:id
router.delete('/:id', auth(), async (req, res) => {
    try {
        const { id } = req.params;

        // RBAC & Time Lock
        const [current] = await pool.query('SELECT branch_id, created_at FROM financial_entries WHERE id = ?', [id]);
        if (current.length === 0) return res.status(404).json({ error: 'Entry not found' });

        if (req.user.role !== 'developer' && req.user.role !== 'super_admin') {
            if (current[0].branch_id !== req.user.branch_id) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            const hoursSinceCreation = (new Date() - new Date(current[0].created_at)) / (1000 * 60 * 60);
            if (hoursSinceCreation > 2) {
                return res.status(403).json({ error: 'Delete locked: Records older than 2 hours can only be removed by Super Admin.' });
            }
        }

        await pool.query('DELETE FROM financial_entries WHERE id = ?', [id]);
        res.json({ message: 'Entry deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
