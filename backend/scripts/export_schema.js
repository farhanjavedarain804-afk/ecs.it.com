const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function exportSchema() {
    console.log('--- EXPORTING SCHEMA ---');
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        const tables = ['customers', 'branches', 'staff', 'complaints'];
        const schema = {};

        for (const table of tables) {
            console.log(`Fetching schema for ${table}...`);
            const [rows] = await db.query(`DESCRIBE ${table}`);
            schema[table] = rows;
        }

        fs.writeFileSync(path.join(__dirname, 'schema_dump.json'), JSON.stringify(schema, null, 2));
        console.log('✅ Schema exported to schema_dump.json');
        await db.end();
    } catch (err) {
        console.error('❌ Schema export failed:', err);
        fs.writeFileSync(path.join(__dirname, 'schema_error.txt'), err.message);
    }
}

exportSchema();
