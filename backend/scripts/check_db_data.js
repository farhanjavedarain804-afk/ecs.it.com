const pool = require('../config/db');
require('dotenv').config();

async function checkData() {
    const tables = [
        'branches', 'customers', 'staff', 'complaints', 'invoices',
        'inventory_items', 'services', 'user_roles', 'profiles', 'users'
    ];

    console.log('--- DATABASE DATA CHECK ---');
    for (const table of tables) {
        try {
            const [rows] = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
            console.log(`${table.padEnd(20)}: ${rows[0].count} rows`);
        } catch (err) {
            console.error(`${table.padEnd(20)}: ERROR - ${err.message}`);
        }
    }
    process.exit(0);
}

checkData();
