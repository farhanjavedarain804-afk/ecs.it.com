const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET /api/financials
// @desc    Get ledger entries
router.get('/', auth(), async (req, res) => {
    try {
        const { branch_id, type, category } = req.query;
        let query = 'SELECT * FROM financial_entries WHERE 1=1';
        let params = [];

        if (branch_id) {
            query += ' AND branch_id = ?';
            params.push(branch_id);
        }
        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }
        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        query += ' ORDER BY date DESC, created_at DESC';
        const [results] = await pool.query(query, params);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
