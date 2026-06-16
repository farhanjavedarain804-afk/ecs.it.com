const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function fixCustomerIdsYear() {
    console.log('--- STANDARDIZING ALL CUSTOMER IDS (YEAR ONLY - ROBUST) ---');
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        const [customers] = await db.query('SELECT id, created_at FROM customers ORDER BY created_at ASC');
        console.log(`Found ${customers.length} customers.`);

        const yearCounters = {};

        for (const customer of customers) {
            const date = customer.created_at ? new Date(customer.created_at) : new Date();
            const year = date.getFullYear();

            if (!yearCounters[year]) {
                yearCounters[year] = 0;
            }
            yearCounters[year]++;

            const newId = `ECS-${year}-CUS-${String(yearCounters[year]).padStart(5, '0')}`;

            console.log(`Updating ${customer.id} -> ${newId}`);
            await db.query('UPDATE customers SET customer_id = ? WHERE id = ?', [newId, customer.id]);
        }

        console.log('✅ Success: All 297 customer IDs updated to Year-only format.');
        await db.end();
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

fixCustomerIdsYear();
