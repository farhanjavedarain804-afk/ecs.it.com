const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function fixCustomerIds() {
    console.log('--- STANDARDIZING ALL CUSTOMER IDS (PARALLEL) ---');
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        const [customers] = await db.query('SELECT id, created_at FROM customers ORDER BY created_at ASC');
        console.log(`Found ${customers.length} customers.`);

        const dateCounters = {};
        const updates = [];

        for (const customer of customers) {
            const date = customer.created_at ? new Date(customer.created_at) : new Date();
            const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

            if (!dateCounters[dateStr]) {
                dateCounters[dateStr] = 0;
            }
            dateCounters[dateStr]++;

            const newId = `ECS-${dateStr}-CUS-${String(dateCounters[dateStr]).padStart(5, '0')}`;
            updates.push({ newId, id: customer.id });
        }

        console.log(`Executing ${updates.length} updates in chunks...`);

        const chunkSize = 20;
        for (let i = 0; i < updates.length; i += chunkSize) {
            const chunk = updates.slice(i, i + chunkSize);
            await Promise.all(chunk.map(u =>
                db.query('UPDATE customers SET customer_id = ? WHERE id = ?', [u.newId, u.id])
            ));
            console.log(`Progress: ${Math.min(i + chunkSize, updates.length)}/${updates.length}`);
        }

        console.log('✅ Final Success: All customer IDs standardized.');
        await db.end();
    } catch (err) {
        console.error('❌ Error details:', err);
    }
}

fixCustomerIds();
