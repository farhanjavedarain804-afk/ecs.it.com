const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const emailService = require('../utils/emailService');
const { upsertSetting } = require('../utils/settingsHelper');

// @route   POST /api/settings/smtp_test
// @desc    Test SMTP connection and optionally send a test email
router.post('/smtp_test', auth(['super_admin', 'developer']), async (req, res) => {
    try {
        const { host, port, secure, user, pass, sender_name, sender_email, test_email } = req.body;
        
        let config = { host, port, secure, user, pass, sender_name, sender_email };

        // If credentials are not passed in body, try to load saved SMTP settings
        if (!config.host || !config.user || !config.pass) {
            const saved = await emailService.getSmtpSettings();
            if (!saved) {
                return res.status(400).json({ error: 'Please enter SMTP Host, Username/Email, and Password.' });
            }
            config = { ...saved, ...config };
            if (!config.pass && saved.pass) config.pass = saved.pass;
        }

        const result = await emailService.testSmtpConnection(config, test_email);
        res.json(result);
    } catch (err) {
        console.error('[SMTP Test Error]:', err);
        res.status(400).json({ error: err.message || 'SMTP Connection test failed' });
    }
});

// @route   GET /api/settings/:key
// @desc    Get a specific setting
router.get('/:key', async (req, res) => {
    try {
        const [results] = await pool.query('SELECT value FROM settings WHERE `key` = ?', [req.params.key]);
        if (results.length === 0) {
            return res.json({ key: req.params.key, value: null });
        }
        res.json({ key: req.params.key, value: results[0].value ? (typeof results[0].value === 'string' ? JSON.parse(results[0].value) : results[0].value) : null });
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

        await upsertSetting(pool, key, value);
        
        res.json({ success: true, message: `Setting ${key} updated` });
    } catch (err) {
        console.error('[Settings Error]:', err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

module.exports = router;
