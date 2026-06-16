const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function check() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        const email = 'farhanjaved357@gmail.com';
        const [users] = await db.query('SELECT id, email, password_hash FROM users WHERE email = ?', [email]);
        console.log('User found in users table:', users.length > 0);

        if (users.length > 0) {
            console.log('User ID:', users[0].id);
            const [roles] = await db.query('SELECT role FROM user_roles WHERE user_id = ?', [users[0].id]);
            console.log('Roles found:', roles);

            const [profiles] = await db.query('SELECT * FROM profiles WHERE user_id = ?', [users[0].id]);
            console.log('Profile found:', profiles.length > 0);
        }

        await db.end();
    } catch (err) {
        console.error('Check failed:', err.message);
    }
}
check();
