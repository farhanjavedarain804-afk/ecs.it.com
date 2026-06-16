const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET /api/inventory
// @desc    Get all products
router.get('/', auth(), async (req, res) => {
    try {
        const { type } = req.query;
        let query = 'SELECT * FROM products WHERE is_active = true';
        let params = [];

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }

        const [results] = await pool.query(query, params);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/inventory/log
// @desc    Log inventory movement (in/out)
router.post('/log', auth(['super_admin', 'store_manager', 'branch_admin']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { product_id, branch_id, quantity, type, reason, reference_id } = req.body;

        const id = require('crypto').randomUUID();

        // 1. Insert Log
        await connection.query(
            'INSERT INTO inventory_logs (id, product_id, branch_id, quantity, type, reason, reference_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, product_id, branch_id, quantity, type, reason, reference_id, req.user.id]
        );

        // Note: Actual stock calculation might be a view or as-of-now table. 
        // For simplicity, we just log. If we had a stock table, we'd update it here.

        await connection.commit();
        res.status(201).json({ id });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        connection.release();
    }
});

module.exports = router;
