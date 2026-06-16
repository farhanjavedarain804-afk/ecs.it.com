const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function updateSchema() {
    console.log('--- STARTING SCHEMA UPDATE ---');

    // Path to the schema file in the brain folder
    // Since I cannot know the exact path on your machine easily, 
    // I will read it from the scripts folder where I will also save a copy.
    const schemaPath = path.join(__dirname, 'mysql_schema.sql');

    if (!fs.existsSync(schemaPath)) {
        console.error('Schema file not found at:', schemaPath);
        process.exit(1);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    try {
        console.log('Applying schema to database:', process.env.DB_NAME);
        await db.query(schemaSql);
        console.log('--- SCHEMA UPDATED SUCCESSFULLY ---');
    } catch (err) {
        console.error('Schema update failed:', err.message);
    } finally {
        await db.end();
    }
}

updateSchema();
