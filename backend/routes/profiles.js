const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET /api/profiles
router.get('/', auth(), async (req, res) => {
    try {
        const { user_id } = req.query;
        let query = `
            SELECT p.*, r.role
            FROM profiles p
            LEFT JOIN user_roles r ON p.user_id = r.user_id
            WHERE 1=1
        `;
        let params = [];

        if (user_id) {
            query += ' AND p.user_id = ?';
            params.push(user_id);
        }

        query += ' ORDER BY p.created_at DESC';

        const [rows] = await pool.query(query, params);

        // Format to match Supabase nested structure: { ..., user_roles: [{ role: '...' }] }
        const formatted = rows.map(row => ({
            ...row,
            user_roles: row.role ? [{ role: row.role }] : []
        }));

        res.json(formatted);
    } catch (err) {
        console.error('Profiles Fetch Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PATCH /api/profiles/:id
router.patch('/:id', auth(), async (req, res) => {
    try {
        const { id } = req.params; // In some contexts this might be user_id, in others profile id
        const updates = req.body;

        // Handle field mappings if necessary
        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), id];

        // Check if id is user_id or profile id by trying user_id first if it looks like a UUID
        await pool.query(`UPDATE profiles SET ${fields} WHERE user_id = ? OR id = ?`, [...Object.values(updates), id, id]);

        res.json({ message: 'Profile updated' });
    } catch (err) {
        console.error('Profile Update Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
