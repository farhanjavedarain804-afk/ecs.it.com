const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkData() {
    console.log('--- DETAILED MYSQL DATA CHECK ---');
    let db;
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            connectTimeout: 10000
        });

        console.log('Connected to MySQL.');

        // Check Users
        const [users] = await db.query('SELECT id, email FROM users');
        console.log(`\nUsers found: ${users.length}`);
        users.forEach(u => console.log(` - ${u.email} (${u.id})`));

        // Check Roles
        const [roles] = await db.query('SELECT * FROM user_roles');
        console.log(`\nUser Roles found: ${roles.length}`);
        roles.forEach(r => console.log(` - UserID: ${r.user_id}, Role: ${r.role}`));

        // Check Invoices (Raw)
        const [invRaw] = await db.query('SELECT COUNT(*) as count FROM invoices');
        console.log(`\nInvoices (Raw count): ${invRaw[0].count}`);

        // check if any invoices are missing customers or branches
        const [missingCust] = await db.query('SELECT COUNT(*) as count FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE c.id IS NULL');
        console.log(`Invoices with missing customers: ${missingCust[0].count}`);

        const [missingBranch] = await db.query('SELECT COUNT(*) as count FROM invoices i LEFT JOIN branches b ON i.branch_id = b.id WHERE b.id IS NULL');
        console.log(`Invoices with missing branches: ${missingBranch[0].count}`);

    } catch (err) {
        console.error('Check failed:', err.message);
    } finally {
        if (db) await db.end();
    }
}

checkData();
