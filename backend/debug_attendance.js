const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function debugAttendance() {
    console.log('--- DEBUGGING ATTENDANCE JOIN ---');
    let db;
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('\n1. Checking attendance columns:');
        const [attCols] = await db.query('DESCRIBE attendance');
        attCols.forEach(c => console.log(`  - ${c.Field}: ${c.Type}`));

        console.log('\n2. Checking profiles columns:');
        const [profCols] = await db.query('DESCRIBE profiles');
        profCols.forEach(c => console.log(`  - ${c.Field}: ${c.Type}`));

        console.log('\n3. Testing Join Query:');
        try {
            const [results] = await db.query('SELECT a.*, p.full_name FROM attendance a JOIN profiles p ON a.user_id = p.user_id LIMIT 1');
            console.log('  SUCCESS. Sample data found.');
        } catch (e) {
            console.error('  FAILED:', e.message);
        }

    } catch (err) {
        console.error('Debug failed:', err.message);
    } finally {
        if (db) await db.end();
    }
}

debugAttendance();
