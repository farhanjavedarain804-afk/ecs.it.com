const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function migrateInvoicesTable() {
    console.log('--- ADDING MISSING COLUMNS TO INVOICES TABLE ---');

    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        const columnsToAdd = [
            { name: 'sales_tax_rate', type: 'DECIMAL(12,2) DEFAULT 0' },
            { name: 'shipping_handling', type: 'DECIMAL(12,2) DEFAULT 0' },
            { name: 'advance_paid', type: 'DECIMAL(12,2) DEFAULT 0' }
        ];

        for (const col of columnsToAdd) {
            try {
                // Check if column exists first
                const [cols] = await db.query(`SHOW COLUMNS FROM invoices LIKE ?`, [col.name]);
                if (cols.length === 0) {
                    console.log(`Adding column ${col.name}...`);
                    await db.execute(`ALTER TABLE invoices ADD COLUMN ${col.name} ${col.type}`);
                    console.log(`Column ${col.name} added.`);
                } else {
                    console.log(`Column ${col.name} already exists.`);
                }
            } catch (colErr) {
                console.error(`Error processing ${col.name}:`, colErr.message);
            }
        }

        console.log('Database migration successful.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await db.end();
        console.log('--- MIGRATION FINISHED ---');
    }
}

migrateInvoicesTable().catch(console.error);
