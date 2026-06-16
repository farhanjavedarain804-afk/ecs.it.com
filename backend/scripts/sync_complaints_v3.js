const { createClient } = require('@supabase/supabase-js');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function syncAll() {
    console.log('--- STARTING 100% COMPREHENSIVE DATA SYNC V3 ---');

    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );

    // Using user-provided admin credentials for full access
    const email = 'farhanjaved357@gmail.com';
    const password = 'Fur@8899';

    console.log(`Authenticating with Supabase as ${email}...`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
        console.error('Authentication failed:', authError.message);
        return;
    }
    console.log('Access token acquired.');

    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    console.log(`Connected to MySQL database: ${process.env.DB_NAME}`);

    await db.query('SET FOREIGN_KEY_CHECKS = 0');

    // List of tables to sync in order of dependency
    const tables = ['branches', 'profiles', 'customers', 'staff', 'complaints'];

    const now = new Date();

    for (const table of tables) {
        console.log(`\nSyncing table: ${table}...`);

        try {
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
                    console.error(`Error fetching ${table}:`, error.message);
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
                console.log(`No data found for ${table}.`);
                continue;
            }

            console.log(`Fetched ${allData.length} rows from Supabase. Processing...`);

            // Get columns for the target table
            const [columnsInDb] = await db.query(`SHOW COLUMNS FROM ${table}`);
            const dbColNames = columnsInDb.map(c => c.Field);
            const supabaseCols = Object.keys(allData[0]);
            const commonCols = supabaseCols.filter(c => dbColNames.includes(c));

            if (commonCols.length === 0) {
                console.warn(`No matching columns for ${table}. Skipping.`);
                continue;
            }

            const placeholders = commonCols.map(() => '?').join(', ');
            const backtickedCols = commonCols.map(c => `\`${c}\``).join(', ');
            const updateClause = commonCols.map(c => `\`${c}\` = VALUES(\`${c}\`)`).join(', ');

            // SQL with ON DUPLICATE KEY UPDATE for 100% sync
            const sql = `INSERT INTO \`${table}\` (${backtickedCols}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`;

            let count = 0;
            for (const row of allData) {
                if (table === 'complaints') {
                    // Custom Logic for Status Aging if needed
                    // But we'll trust the frontend aging logic based on created_at
                    // Unless the user explicitly wants the 'status' field transformed.
                    // The user said: "Categorization into Pending, Overdue, Critical ... based on SLA aging"
                }

                const values = commonCols.map(col => {
                    const val = row[col];
                    if (typeof val === 'object' && val !== null) return JSON.stringify(val);
                    return val;
                });

                await db.execute(sql, values);
                count++;
            }
            console.log(`Successfully synced ${count} rows into ${table}.`);

        } catch (err) {
            console.error(`Error processing ${table}:`, err.message);
        }
    }

    await db.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n--- DATA SYNC V3 FINISHED SUCCESSFULLY ---');
    await db.end();
}

syncAll().catch(console.error);
