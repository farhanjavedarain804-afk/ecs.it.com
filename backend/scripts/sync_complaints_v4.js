const { createClient } = require('@supabase/supabase-js');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function syncAll() {
    console.log('--- STARTING 100% COMPREHENSIVE DATA SYNC V4 ---');
    console.log('--- OBJECTIVE: SYNC 281 COMPLAINTS WITH NEW PREFIX ---');

    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );

    const email = 'farhanjaved357@gmail.com';
    const password = 'Fur@8899';

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
        console.error('Authentication failed:', authError.message);
        return;
    }
    console.log('Authenticated with Supabase.');

    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    console.log(`Connected to MySQL: ${process.env.DB_NAME}`);

    await db.query('SET FOREIGN_KEY_CHECKS = 0');

    // Steps:
    // 1. Fetch complaints from Supabase
    // 2. Fetch dependencies (branches, profiles, customers, staff)

    const tables = ['branches', 'profiles', 'customers', 'staff', 'invoices'];

    for (const table of tables) {
        try {
            console.log(`Syncing ${table}...`);
            const { data, error } = await supabase.from(table).select('*');
            if (error) { throw new Error(`Error fetching ${table}: ${error.message}`); }

            if (data.length === 0) {
                console.log(`No data for ${table}, skipping.`);
                continue;
            }

            const [columnsInDb] = await db.query(`SHOW COLUMNS FROM \`${table}\``);
            const dbColNames = columnsInDb.map(c => c.Field);
            const commonCols = Object.keys(data[0] || {}).filter(c => dbColNames.includes(c));

            if (commonCols.length === 0) {
                console.log(`No common columns for ${table}, skipping.`);
                continue;
            }

            const placeholders = commonCols.map(() => '?').join(', ');
            const backtickedCols = commonCols.map(c => `\`${c}\``).join(', ');
            const updateClause = commonCols.map(c => `\`${c}\` = VALUES(\`${c}\`)`).join(', ');
            const sql = `INSERT INTO \`${table}\` (${backtickedCols}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`;

            for (const row of data) {
                try {
                    const values = commonCols.map(col => {
                        const val = row[col];
                        if (typeof val === 'object' && val !== null) return JSON.stringify(val);
                        return val;
                    });
                    await db.execute(sql, values);
                } catch (rowErr) {
                    console.error(`  - Row Failure in ${table}:`, rowErr.message, JSON.stringify(row).substring(0, 100));
                    throw rowErr; // Re-throw to stop if needed, or comment out to continue
                }
            }
            console.log(`Synced ${data.length} rows for ${table}.`);
        } catch (err) {
            console.error(`FAILED Syncing ${table}:`, err.message);
            // Optionally continue or break
        }
    }

    // Special Handling for Complaints
    console.log('\nProcessing Complaints with new numbering logic...');

    // TRUNCATE or DELETE to avoid UNIQUE constraint clashes on complaint_number
    console.log('Clearing old complaints in MySQL to avoid numbering clashes...');
    await db.query('DELETE FROM complaints');
    const { data: complaints, error: compErr } = await supabase.from('complaints').select('*').order('created_at', { ascending: true });

    if (compErr) {
        console.error('Error fetching complaints:', compErr.message);
    } else {
        console.log(`Fetched ${complaints.length} complaints.`);

        const [columnsInDb] = await db.query(`SHOW COLUMNS FROM \`complaints\``);
        const dbColNames = columnsInDb.map(c => c.Field);
        const commonCols = Object.keys(complaints[0] || {}).filter(c => dbColNames.includes(c));

        // Counter for daily numbering
        const dateCounters = {};

        for (const comp of complaints) {
            const dateObj = new Date(comp.created_at);
            const yyyy = dateObj.getFullYear();
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}${mm}${dd}`;

            if (!dateCounters[dateStr]) {
                dateCounters[dateStr] = 1;
            } else {
                dateCounters[dateStr]++;
            }

            const sequenceNum = String(dateCounters[dateStr]).padStart(5, '0');
            const newComplaintNumber = `ECS-${dateStr}-COM-${sequenceNum}`;

            // Override the complaint_number in the object
            comp.complaint_number = newComplaintNumber;

            const placeholders = commonCols.map(() => '?').join(', ');
            const backtickedCols = commonCols.map(c => `\`${c}\``).join(', ');
            const updateClause = commonCols.map(c => `\`${c}\` = VALUES(\`${c}\`)`).join(', ');
            const sql = `INSERT INTO \`complaints\` (${backtickedCols}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`;

            const values = commonCols.map(col => {
                const val = comp[col];
                if (typeof val === 'object' && val !== null) return JSON.stringify(val);
                return val;
            });
            await db.execute(sql, values);
        }
        console.log(`Successfully synced and re-numbered ${complaints.length} complaints.`);

        // Final Status Breakdown Verification
        const [statusCounts] = await db.query('SELECT status, COUNT(*) as count FROM complaints GROUP BY status');
        console.log('\nFinal MySQL Status Breakdown:');
        statusCounts.forEach(s => console.log(`${s.status}: ${s.count}`));
    }

    await db.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n--- DATA SYNC V4 FINISHED ---');
    await db.end();
}

syncAll().catch(console.error);
