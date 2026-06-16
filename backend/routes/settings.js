const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET /api/settings/:key
// @desc    Get a specific setting
router.get('/:key', async (req, res) => {
    try {
        const [results] = await pool.query('SELECT value FROM settings WHERE `key` = ?', [req.params.key]);
        if (results.length === 0) {
            return res.json({ key: req.params.key, value: null });
        }
        res.json({ key: req.params.key, value: results[0].value ? JSON.parse(results[0].value) : null });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PATCH /api/settings/:key
// @desc    Update or create a specific setting
router.patch('/:key', auth(), async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        
        console.log(`[Settings] Update request for ${key}:`, value);

        // Check if setting exists
        const [exists] = await pool.query('SELECT `key` FROM settings WHERE `key` = ?', [key]);
        
        if (exists.length > 0) {
            await pool.query('UPDATE settings SET value = ?, updated_at = NOW() WHERE `key` = ?', [JSON.stringify(value), key]);
        } else {
            const id = require('crypto').randomUUID();
            await pool.query('INSERT INTO settings (id, `key`, value) VALUES (?, ?, ?)', [id, key, JSON.stringify(value)]);
        }
        
        res.json({ success: true, message: `Setting ${key} updated` });
    } catch (err) {
        console.error('[Settings Error]:', err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

module.exports = router;
