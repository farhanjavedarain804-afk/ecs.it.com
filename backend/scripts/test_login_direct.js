const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testLogin() {
    const email = 'farhanjaved357@gmail.com';
    const password = 'Fur@8899';

    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        const [users] = await db.query('SELECT password_hash FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            console.error('User not found');
            return;
        }

        const isMatch = await bcrypt.compare(password, users[0].password_hash);
        console.log('Login Result:', isMatch ? 'SUCCESS' : 'FAILURE');

        await db.end();
    } catch (err) {
        console.error('Test failed:', err.message);
    }
}
testLogin();
