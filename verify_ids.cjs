const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const mysql = require('mysql2/promise');

async function verify() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });
        const [rows] = await pool.query('SELECT complaint_number, created_at FROM complaints ORDER BY created_at DESC LIMIT 5');
        console.log('Last 5 Complaints:');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err.message);
        process.exit(1);
    }
}

verify();
