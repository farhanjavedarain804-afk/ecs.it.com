const pool = require('./config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function diagnoseLogin() {
    const email = 'farhanjaved357@gmail.com';
    const password = 'Fur@8899';

    console.log('--- LOGIN DIAGNOSTIC ---');

    try {
        console.log('1. Checking database connection...');
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        console.log('Users found:', users.length);

        if (users.length === 0) {
            console.log('FAILED: User not found in DB.');
            return;
        }

        const user = users[0];
        console.log('2. Verifying password...');
        const isMatch = await bcrypt.compare(password, user.password_hash);
        console.log('Password match:', isMatch);

        if (!isMatch) {
            console.log('FAILED: Password mismatch.');
            return;
        }

        console.log('3. Fetching role...');
        const [roles] = await pool.query('SELECT role FROM user_roles WHERE user_id = ?', [user.id]);
        const role = roles.length > 0 ? roles[0].role : 'technician';
        console.log('Role found:', role);

        console.log('4. Signing JWT...');
        if (!process.env.JWT_SECRET) {
            console.error('CRITICAL: JWT_SECRET is missing in .env');
            return;
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        console.log('JWT Signed successfully.');
        console.log('--- DIAGNOSTIC SUCCESS ---');

    } catch (err) {
        console.error('--- DIAGNOSTIC FAILED ---');
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);
        console.error('Stack Trace:', err.stack);
    } finally {
        await pool.end();
    }
}

diagnoseLogin();
