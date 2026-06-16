const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Helper to check if user is super admin
const isSuperAdmin = (req) => {
    return req.user && req.user.role === 'super_admin';
};

// @route   POST /api/rpc/:functionName
router.post('/:functionName', auth(), async (req, res) => {
    const { functionName } = req.params;
    const params = req.body;

    if (!isSuperAdmin(req)) {
        return res.status(403).json({ error: 'Unauthorized: Super Admin access required' });
    }

    try {
        switch (functionName) {
            case 'delete_user_permanently':
                return await deleteUserPermanently(params, res);
            case 'admin_update_user_full_name':
                return await updateUserFullName(params, res);
            case 'admin_update_user_email':
                return await updateUserEmail(params, res);
            case 'admin_update_user_password':
                return await updateUserPassword(params, res);
            default:
                return res.status(400).json({ error: `Function ${functionName} not implemented` });
        }
    } catch (err) {
        console.error(`RPC Error (${functionName}):`, err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

async function deleteUserPermanently(params, res) {
    const { target_user_id } = params;
    if (!target_user_id) return res.status(400).json({ error: 'target_user_id is required' });

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        // 1. Delete user roles
        await connection.query('DELETE FROM user_roles WHERE user_id = ?', [target_user_id]);

        // 2. Delete profile
        await connection.query('DELETE FROM profiles WHERE user_id = ?', [target_user_id]);

        // 3. Delete attendance records
        await connection.query('DELETE FROM attendance WHERE staff_id IN (SELECT id FROM staff WHERE user_id = ?)', [target_user_id]);

        // 4. Nullify staff user_id
        await connection.query('UPDATE staff SET user_id = NULL WHERE user_id = ?', [target_user_id]);

        // 5. Delete from users table (Auth)
        await connection.query('DELETE FROM users WHERE id = ?', [target_user_id]);

        await connection.commit();
        res.json({ message: 'User deleted permanently' });
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

async function updateUserFullName(params, res) {
    const { target_user_id, new_full_name } = params;
    if (!target_user_id || !new_full_name) return res.status(400).json({ error: 'Missing parameters' });

    await pool.query('UPDATE profiles SET full_name = ? WHERE user_id = ?', [new_full_name, target_user_id]);
    res.json({ message: 'Full name updated' });
}

async function updateUserEmail(params, res) {
    const { target_user_id, new_email } = params;
    if (!target_user_id || !new_email) return res.status(400).json({ error: 'Missing parameters' });

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        await connection.query('UPDATE users SET email = ? WHERE id = ?', [new_email, target_user_id]);
        await connection.query('UPDATE profiles SET email = ? WHERE user_id = ?', [new_email, target_user_id]);

        await connection.commit();
        res.json({ message: 'Email updated' });
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

async function updateUserPassword(params, res) {
    const { target_user_id, new_password } = params;
    if (!target_user_id || !new_password) return res.status(400).json({ error: 'Missing parameters' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, target_user_id]);
    res.json({ message: 'Password updated' });
}

module.exports = router;
