const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET /api/company_settings
router.get('/', auth(), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM company_settings LIMIT 1');
        res.json(rows[0] ? [rows[0]] : []); // Return as array for .select().single() compatibility
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PATCH /api/company_settings/:id
router.patch('/:id', auth(['super_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        // Remove id from updates to avoid primary key update error
        delete updates.id;

        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), id];

        await pool.query(`UPDATE company_settings SET ${fields} WHERE id = ?`, values);
        res.json({ message: 'Company settings updated' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
