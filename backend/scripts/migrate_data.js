const { createClient } = require('@supabase/supabase-js');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function migrateAll() {
    console.log('--- STARTING 100% COMPREHENSIVE AUTHENTICATED MIGRATION ---');

    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );

    // Bypassing RLS by logging in as the admin user
    const email = 'farhanjaved357@gmail.com';
    const password = 'Fur@8899';

    console.log(`Logging in as ${email}...`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
        console.error('Migration failed: Could not authenticate with Supabase.', authError.message);
        return;
    }
    console.log('Login successful. Access token acquired.');

    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    await db.query('SET FOREIGN_KEY_CHECKS = 0');

    const tableGuesses = [
        'branches', 'profiles', 'user_roles', 'customers', 'staff', 'complaints',
        'invoices', 'invoice_items', 'attendance', 'inventory_items', 'products',
        'services', 'inventory_logs', 'financial_entries', 'activity_logs',
        'user_activity_logs', 'notifications', 'settings', 'company_settings', 'users'
    ];

    for (const table of tableGuesses) {
        console.log(`\nProcessing table: ${table}...`);

        // Add a small delay between tables
        await new Promise(r => setTimeout(r, 1000));

        try {
            // Fetch all records - handle pagination if more than 1000
            let allData = [];
            let from = 0;
            const step = 1000;
            let finished = false;

            while (!finished) {
                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .range(from, from + step - 1);

                if (error) {
                    console.log(`[SKIP] Table ${table} error: ${error.message}`);
                    finished = true;
                    continue;
                }

                if (!data || data.length === 0) {
                    finished = true;
                    continue;
                }

                allData = allData.concat(data);
                if (data.length < step) finished = true;
                else from += step;
            }

            if (allData.length === 0) {
                console.log(`[EMPTY] Table ${table} has no data.`);
                continue;
            }

            console.log(`[DATA FOUND] Table ${table} has ${allData.length} rows. Migrating...`);

            const targetTable = table;
            const [columnsInDb] = await db.query(`SHOW COLUMNS FROM ${targetTable}`).catch(e => [[]]);

            if (columnsInDb.length === 0) {
                console.warn(`[WARN] Target table ${targetTable} does not exist in MySQL. Skipping.`);
                continue;
            }

            const dbColNames = columnsInDb.map(c => c.Field);
            const supabaseCols = Object.keys(allData[0]);
            const commonCols = supabaseCols.filter(c => dbColNames.includes(c));

            if (commonCols.length === 0) {
                console.warn(`[WARN] No common columns for ${table}.`);
                continue;
            }

            const placeholders = commonCols.map(() => '?').join(', ');
            const backtickedCols = commonCols.map(c => `\`${c}\``).join(', ');
            const sql = `INSERT IGNORE INTO ${targetTable} (${backtickedCols}) VALUES (${placeholders})`;

            let count = 0;
            for (const row of allData) {
                const values = commonCols.map(col => {
                    const val = row[col];
                    if (typeof val === 'object' && val !== null) return JSON.stringify(val);
                    return val;
                });
                await db.execute(sql, values);
                count++;
            }
            console.log(`[SUCCESS] Migrated ${count} rows to ${targetTable}`);

        } catch (err) {
            console.error(`[ERROR] Failed migrating ${table}:`, err.message);
        }
    }

    await db.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n--- 100% COMPREHENSIVE MIGRATION FINISHED ---');
    await db.end();
}

migrateAll().catch(console.error);
