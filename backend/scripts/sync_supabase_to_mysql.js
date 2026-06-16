const { createClient } = require('@supabase/supabase-js');
const pool = require('../config/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function syncData() {
    console.log('--- STARTING SURGICAL DATA SYNC WITH RETRY ---');

    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );

    // Authenticate with Supabase
    const email = 'farhanjaved357@gmail.com';
    const password = 'Fur@8899';

    console.log(`Logging in to Supabase as ${email}...`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
        console.error('Login failed:', authError.message);
        return;
    }
    console.log('Supabase login successful.');

    const mapFields = (row, table) => {
        const mapped = {};
        for (const key in row) {
            let val = row[key];
            if (typeof val === 'object' && val !== null) {
                mapped[key] = JSON.stringify(val);
            } else {
                mapped[key] = val;
            }
        }
        return mapped;
    };

    const syncTable = async (tableName, idField, prefix, countSeed) => {
        console.log(`\nSyncing ${tableName}...`);
        try {
            const { data: sbRows, error: fetchError } = await supabase.from(tableName).select('*');
            if (fetchError) {
                console.error(`Fetch error for ${tableName}:`, fetchError);
                return;
            }
            console.log(`Fetched ${sbRows.length} rows for ${tableName} from Supabase.`);

            const [columnsInDb] = await pool.query(`SHOW COLUMNS FROM ${tableName}`);
            const dbColNames = columnsInDb.map(c => c.Field);

            let [maxRow] = await pool.query(`SELECT MAX(CAST(SUBSTRING_INDEX(${idField}, '-', -1) AS UNSIGNED)) as max_val FROM ${tableName}`);
            let nextCounter = Math.max((maxRow[0].max_val || 0), countSeed) + 1;
            console.log(`Current max ${idField} suffix: ${maxRow[0].max_val}, next: ${nextCounter}`);

            let newCount = 0;
            for (const row of sbRows) {
                if (!row.id) {
                    console.warn(`[WARN] Row in ${tableName} missing primary 'id'. Skipping.`);
                    continue;
                }

                try {
                    const [existing] = await pool.query(`SELECT id FROM ${tableName} WHERE id = ?`, [row.id]);
                    if (existing.length === 1) continue;

                    const mapped = mapFields(row, tableName);
                    
                    // Filter out columns that don't exist in MySQL
                    const commonMapped = {};
                    for (const col in mapped) {
                        if (dbColNames.includes(col)) {
                            commonMapped[col] = mapped[col];
                        }
                    }

                    // Assign new ID if it's missing the prefix or is a new entry
                    if (tableName === 'complaints') {
                        const date = new Date(row.created_at);
                        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
                        commonMapped[idField] = `ECS-${dateStr}-COM-${String(nextCounter++).padStart(5, '0')}`;
                    } else if (tableName === 'customers') {
                        const year = new Date(row.created_at).getFullYear();
                        commonMapped[idField] = `ECS-${year}-CUS-${String(nextCounter++).padStart(5, '0')}`;
                    } else if (tableName === 'invoices') {
                        const year = new Date(row.created_at).getFullYear();
                        commonMapped[idField] = `INV-${year}-${String(nextCounter++).padStart(5, '0')}`;
                    }

                    const columns = Object.keys(commonMapped);
                    const values = Object.values(commonMapped);
                    if (columns.length === 0) continue;

                    const sql = `INSERT INTO ${tableName} (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
                    await pool.execute(sql, values);
                    newCount++;
                } catch (rowErr) {
                    console.error(`[ERROR] Failed to sync ${tableName} row ID ${row.id}:`, rowErr.message);
                }
            }
            console.log(`[SUCCESS] Table ${tableName}: Synced ${newCount} new records.`);

        } catch (tableErr) {
            console.error(`[CRITICAL ERROR] Failed syncing table ${tableName}:`, tableErr.message);
        }
    };

    try {
        console.log('Setting foreign key checks to 0...');
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');

        await syncTable('customers', 'customer_id', 'CUS', 0);
        await syncTable('complaints', 'complaint_number', 'COM', 281);
        await syncTable('invoices', 'invoice_number', 'INV', 0);
        await syncTable('invoice_items', 'id', '', 0);

        console.log('\n--- ALL TABLES PROCESSED ---');
    } catch (err) {
        console.error('Core sync logic failed:', err);
    } finally {
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Finalizing sync...');
        process.exit(0);
    }
}

syncData().catch(err => {
    console.error('TOP LEVEL SYNC FAILED:', err);
    process.exit(1);
});
