const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testAttendanceLogic() {
    console.log('--- TESTING ATTENDANCE GET LOGIC ---');
    let db;
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        const query = 'SELECT a.*, s.full_name FROM attendance a LEFT JOIN staff s ON a.staff_id = s.id ORDER BY a.check_in DESC';
        console.log('Running query:', query);

        const [results] = await db.query(query);
        console.log(`  SUCCESS: Found ${results.length} rows.`);

        if (results.length > 0) {
            console.log('  Formatting first row...');
            const r = results[0];
            const formatted = {
                ...r,
                staff: { full_name: r.full_name || 'Unknown Staff' },
                branches: { id: r.branch_id }
            };
            console.log('  Formatted sample:', JSON.stringify(formatted).substring(0, 100) + '...');
        }

    } catch (err) {
        console.error('Logic Test failed:', err.message);
        console.error('Stack:', err.stack);
    } finally {
        if (db) await db.end();
    }
}

testAttendanceLogic();
