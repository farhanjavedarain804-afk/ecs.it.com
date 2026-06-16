const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function migrateCustomerNumbers() {
    console.log('--- STARTING CUSTOMER NUMBERING MIGRATION ---');

    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    console.log(`Connected to MySQL: ${process.env.DB_NAME}`);

    try {
        // Fetch all customers sorted by creation date
        const [customers] = await db.query('SELECT id, created_at FROM customers ORDER BY created_at ASC');
        console.log(`Found ${customers.length} customers to re-number.`);

        // Step 1: Set temporary IDs to avoid collisions
        console.log('Setting temporary IDs to prevent collisions...');
        for (const customer of customers) {
            await db.execute('UPDATE customers SET customer_id = ? WHERE id = ?', [`TEMP-${customer.id.substring(0, 8)}`, customer.id]);
        }
        console.log('Temporary IDs applied.');

        let counter = 1;
        for (const customer of customers) {
            const date = new Date(customer.created_at);
            const year = date.getFullYear();
            const newId = `ECS-${year}-CUS-${String(counter).padStart(5, '0')}`;

            await db.execute('UPDATE customers SET customer_id = ? WHERE id = ?', [newId, customer.id]);

            if (counter % 50 === 0 || counter === customers.length) {
                console.log(`Processed ${counter}/${customers.length}...`);
            }
            counter++;
        }

        console.log('Successfully re-numbered all customers.');

        // Final check
        const [maxRow] = await db.query("SELECT MAX(CAST(SUBSTRING_INDEX(customer_id, '-', -1) AS UNSIGNED)) as max_val FROM customers");
        console.log(`Final Global Max Suffix: ${maxRow[0].max_val}`);

    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await db.end();
        console.log('--- MIGRATION FINISHED ---');
    }
}

migrateCustomerNumbers().catch(console.error);
