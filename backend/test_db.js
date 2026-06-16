const pool = require('./config/db');

async function test() {
    console.log('Testing DB query...');
    try {
        const [rows] = await pool.query('SELECT id FROM customers LIMIT 5');
        console.log('Result:', rows);
    } catch (err) {
        console.error('Query failed:', err);
    } finally {
        process.exit(0);
    }
}

test();
