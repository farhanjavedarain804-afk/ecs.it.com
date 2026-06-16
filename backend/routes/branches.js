const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const crypto = require('crypto');

// @route   GET /api/branches
// @desc    Get all branches with their administrators
router.get('/', auth(), async (req, res) => {
    try {
        const { branch_code } = req.query;
        let query = 'SELECT * FROM branches WHERE 1=1';
        let params = [];

        if (branch_code) {
            query += ' AND branch_code LIKE ?';
            params.push(`%${branch_code}%`);
        }

        query += ' ORDER BY created_at DESC';

        const [branches] = await pool.query(query, params);

        // Fetch profiles for each branch to nested structure
        const [profiles] = await pool.query('SELECT * FROM profiles WHERE branch_id IS NOT NULL');
        
        const formatted = branches.map(b => ({
            ...b,
            profiles: profiles.filter(p => p.branch_id === b.id)
        }));

        res.json(formatted);
    } catch (err) {
        console.error('Branches Fetch Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/branches
// @desc    Register a new branch
router.post('/', auth(['super_admin']), async (req, res) => {
    try {
        const { name, address, city, phone, email, branch_code, is_active } = req.body;
        const id = crypto.randomUUID();

        await pool.query(
            'INSERT INTO branches (id, name, address, city, phone, email, branch_code, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, address || null, city || null, phone || null, email || null, branch_code, is_active !== undefined ? is_active : true]
        );

        const [newBranch] = await pool.query('SELECT * FROM branches WHERE id = ?', [id]);
        res.status(201).json(Array.isArray(newBranch) ? newBranch : [newBranch]);
    } catch (err) {
        console.error('Branch Creation Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PATCH /api/branches/:id
// @desc    Update branch details
router.patch('/:id', auth(['super_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No updates provided' });
        }

        const fields = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ');
        const values = [...Object.values(updates), id];

        await pool.query(`UPDATE branches SET ${fields} WHERE id = ?`, values);
        
        const [updated] = await pool.query('SELECT * FROM branches WHERE id = ?', [id]);
        res.json(updated[0]);
    } catch (err) {
        console.error('Branch Update Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE /api/branches/:id
// @desc    Delete branch and unlink related data
router.delete('/:id', auth(['super_admin']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        await connection.beginTransaction();

        // Unlink related records from ALL tables that reference branch_id
        const tablesToUnlink = [
            'profiles',
            'staff',
            'customers',
            'complaints',
            'invoices',
            'financial_entries',
            'attendance',
            'inventory_items',
            'inventory_logs',
            'user_activity_logs'
        ];

        for (const table of tablesToUnlink) {
            // Check if table exists before unlinking to prevent errors on different schema versions
            try {
                await connection.query(`UPDATE \`${table}\` SET branch_id = NULL WHERE branch_id = ?`, [id]);
            } catch (unlinkErr) {
                console.warn(`Could not unlink branch_id in table ${table}:`, unlinkErr.message);
                // Continue with other tables
            }
        }

        // Delete branch
        await connection.query('DELETE FROM branches WHERE id = ?', [id]);

        await connection.commit();
        res.json({ message: 'Branch deleted and related records unlinked successfully' });
    } catch (err) {
        await connection.rollback();
        console.error('Branch Deletion Error:', err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        connection.release();
    }
});

module.exports = router;
