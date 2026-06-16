const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET /api/reviews
router.get('/', auth(), async (req, res) => {
    try {
        const { branch_id, search } = req.query;
        let query = `
            SELECT 
                r.*, 
                c.complaint_number,
                cust.name as customer_name,
                cust.phone as customer_phone,
                b.name as branch_name
            FROM complaint_reviews r
            JOIN complaints c ON r.complaint_id = c.id
            JOIN customers cust ON r.customer_id = cust.id
            JOIN branches b ON r.branch_id = b.id
            WHERE 1=1`;
        let params = [];

        if (branch_id) {
            query += ' AND r.branch_id = ?';
            params.push(branch_id);
        } else if (req.user.role !== 'developer' && req.user.role !== 'super_admin' && req.user.branch_id) {
            query += ' AND r.branch_id = ?';
            params.push(req.user.branch_id);
        }

        if (search) {
            query += ' AND (c.complaint_number LIKE ? OR cust.name LIKE ? OR r.note LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY r.created_at DESC';

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Reviews GET Error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/reviews
router.post('/', auth(['super_admin', 'developer']), async (req, res) => {
    try {
        const { 
            complaint_id, 
            customer_id, 
            branch_id, 
            q1_rating, 
            q2_rating, 
            q3_rating, 
            q4_rating, 
            q5_rating, 
            refused_ratings, 
            note 
        } = req.body;

        const id = require('crypto').randomUUID();

        await pool.query(
            `INSERT INTO complaint_reviews (
                id, complaint_id, customer_id, branch_id, 
                q1_rating, q2_rating, q3_rating, q4_rating, q5_rating, 
                refused_ratings, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, complaint_id, customer_id, branch_id, 
                q1_rating || 0, q2_rating || 0, q3_rating || 0, q4_rating || 0, q5_rating || 0, 
                refused_ratings || false, note || null
            ]
        );

        res.status(201).json({ id, message: 'Review submitted successfully' });
    } catch (err) {
        console.error('Review POST Error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PATCH /api/reviews/:id
router.patch('/:id', auth(['super_admin', 'developer']), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No update data provided' });
        }

        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), id];

        await pool.query(`UPDATE complaint_reviews SET ${fields} WHERE id = ?`, values);
        res.json({ message: 'Review updated successfully' });
    } catch (err) {
        console.error('Review PATCH Error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE /api/reviews/:id
router.delete('/:id', auth(['super_admin', 'developer']), async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM complaint_reviews WHERE id = ?', [id]);
        res.json({ message: 'Review deleted successfully' });
    } catch (err) {
        console.error('Review DELETE Error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
