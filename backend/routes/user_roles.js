const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET /api/user_roles
router.get('/', auth(), async (req, res) => {
    try {
        const { user_id } = req.query;
        let query = 'SELECT * FROM user_roles';
        let params = [];

        if (user_id) {
            query += ' WHERE user_id = ?';
            params.push(user_id);
        } else if (req.user.role !== 'developer' && req.user.role !== 'super_admin') {
            // Restrictions: Non-admins can only see their own roles
            query += ' WHERE user_id = ?';
            params.push(req.user.id);
        }

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/user_roles
router.post('/', auth(['super_admin']), async (req, res) => {
    try {
        const { user_id, role } = req.body;

        // Protection: Non-developers cannot assign the 'developer' role
        const isDeveloper = req.user.role === 'developer' || req.user.email === 'farhanjaved357@gmail.com';
        if (role === 'developer' && !isDeveloper) {
            return res.status(403).json({ error: 'Only developers can assign developer roles' });
        }

        const id = require('crypto').randomUUID();
        await pool.query('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)', [id, user_id, role]);
        res.status(201).json({ id });
    } catch (err) {
        console.error('User Role POST Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE /api/user_roles/:id
router.delete('/:id', auth(['super_admin']), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if the role being deleted is 'developer'
        const [targetRole] = await pool.query('SELECT role FROM user_roles WHERE id = ? OR user_id = ?', [id, id]);
        
        const isDeveloper = req.user.role === 'developer' || req.user.email === 'farhanjaved357@gmail.com';
        if (targetRole.length > 0 && targetRole[0].role === 'developer' && !isDeveloper) {
            return res.status(403).json({ error: 'Developer roles cannot be modified by Super Admins' });
        }

        await pool.query('DELETE FROM user_roles WHERE id = ? OR user_id = ?', [id, id]);
        res.json({ message: 'Role deleted' });
    } catch (err) {
        console.error('User Role DELETE Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
