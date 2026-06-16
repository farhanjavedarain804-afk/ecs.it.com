const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const auth = require('../middleware/auth');

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const user = users[0];

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Get ALL user roles and profile
        const [[rolesRows], [profiles]] = await Promise.all([
            pool.query('SELECT role FROM user_roles WHERE user_id = ?', [user.id]),
            pool.query('SELECT branch_id, full_name FROM profiles WHERE user_id = ?', [user.id])
        ]);
        
        // Build roles array and pick primary role for JWT
        const roles = rolesRows.map(r => r.role);
        const primaryRole = roles.length > 0 ? roles[0] : 'technician';
        const branch_id = profiles.length > 0 ? profiles[0].branch_id : null;
        const full_name = profiles.length > 0 ? profiles[0].full_name : email;

        // Sign JWT with primary role (for RBAC middleware)
        const token = jwt.sign(
            { id: user.id, email: user.email, role: primaryRole, branch_id: branch_id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: primaryRole,
                roles: roles,         // All roles as array for AuthContext
                full_name: full_name,
                branch_id: branch_id
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: `Server error: ${err.message}` });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user profile (flat structure for AuthContext)
router.get('/me', auth(), async (req, res) => {
    try {
        // Fetch ALL roles and the full profile
        const [[rolesRows], [profiles]] = await Promise.all([
            pool.query('SELECT role FROM user_roles WHERE user_id = ?', [req.user.id]),
            pool.query('SELECT full_name, branch_id FROM profiles WHERE user_id = ?', [req.user.id])
        ]);

        const roles = rolesRows.map(r => r.role);
        const profile = profiles[0] || {};

        // Return flat structure so AuthContext can read roles[], full_name, branch_id directly
        res.json({
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,    // Primary role from JWT
            roles: roles,           // All roles array
            full_name: profile.full_name || req.user.email,
            branch_id: profile.branch_id || null
        });
    } catch (err) {
        console.error('Error in /api/auth/me:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/auth/register
// @desc    Register a new user (Super Admin only)
router.post('/register', auth(['super_admin']), async (req, res) => {
    const { email, password, full_name, role, branch_id } = req.body;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Check if user exists
        const [existing] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'User already registered' });
        }

        const userId = require('crypto').randomUUID();
        const passwordHash = await bcrypt.hash(password, 10);

        // 1. Create User
        await connection.query(
            'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
            [userId, email, passwordHash]
        );

        // 2. Create Profile
        await connection.query(
            'INSERT INTO profiles (id, user_id, email, full_name, branch_id) VALUES (?, ?, ?, ?, ?)',
            [require('crypto').randomUUID(), userId, email, full_name, branch_id || null]
        );

        // 3. Create Role
        await connection.query(
            'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
            [require('crypto').randomUUID(), userId, role || 'branch_admin']
        );

        await connection.commit();
        res.status(201).json({ message: 'User registered successfully', userId });

    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        connection.release();
    }
});

module.exports = router;
