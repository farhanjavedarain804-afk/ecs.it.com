const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET /api/activity_logs
// @desc    Get activity logs
router.get('/', auth(), async (req, res) => {
    try {
        const { branch_id, user_id, limit = 200 } = req.query;
        // Join with auth table to get user_email if possible, or profiles
        let query = `
            SELECT al.*, p.full_name, p.user_id as profile_user_id
            FROM activity_logs al
            LEFT JOIN profiles p ON al.user_id = p.user_id
            WHERE 1=1
        `;
        let params = [];

        if (branch_id) {
            query += " AND (JSON_EXTRACT(al.details, '$.branch_id') = ? OR al.details->'$.branch_id' = ?)";
            params.push(branch_id, branch_id);
        }

        if (user_id) {
            query += ' AND al.user_id = ?';
            params.push(user_id);
        }

        query += ' ORDER BY al.created_at DESC LIMIT ?';
        params.push(parseInt(limit.toString()));

        const [rows] = await pool.query(query, params);

        const mapped = rows.map(row => {
            let metadata = {};
            try {
                metadata = typeof row.details === 'string' ? JSON.parse(row.details) : row.details;
            } catch (e) {
                metadata = { raw: row.details };
            }

            return {
                ...row,
                metadata: metadata,
                // Fallback to metadata email or profile full_name if user_email is missing in log
                user_email: row.user_email || metadata.userEmail || row.full_name || 'System',
                activity_type: row.action // frontend compatibility
            };
        });

        res.json(mapped);
    } catch (err) {
        console.error('Activity Logs Fetch Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// @route   POST /api/activity_logs
router.post('/', auth(), async (req, res) => {
    try {
        let { action, activity_type, entity_type, entity_id, details, metadata } = req.body;
        const id = require('crypto').randomUUID();
        const user_id = req.user.id;
        const ip_address = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Support both frontend (activity_type/metadata) and backend (action/details) formats
        const finalAction = action || activity_type;
        const finalDetails = details || metadata;

        if (!finalAction) {
            return res.status(400).json({ error: 'Action or activity_type is required' });
        }

        await pool.query(
            'INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, user_id, finalAction, entity_type || 'generic', entity_id || null, JSON.stringify(finalDetails || {}), ip_address]
        );

        res.status(201).json({ id });
    } catch (err) {
        console.error('Activity Log Create Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
