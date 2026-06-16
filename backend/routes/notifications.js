const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET /api/notifications
// @desc    Get user notifications
router.get('/', auth(), async (req, res) => {
    try {
        const [results] = await pool.query(
            'SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT 50',
            [req.user.id]
        );
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
