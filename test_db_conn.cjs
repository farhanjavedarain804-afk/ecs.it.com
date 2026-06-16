const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);

const mysql = require('mysql2/promise');

async function test() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });
        const [rows] = await pool.query('SELECT 1 + 1 AS result');
        console.log('Connection test result:', rows[0].result);
        process.exit(0);
    } catch (err) {
        console.error('Connection test failed:', err.message);
        process.exit(1);
    }
}

test();
