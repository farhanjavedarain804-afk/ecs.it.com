const { createClient } = require('@supabase/supabase-js');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const logFile = path.join(__dirname, 'sync_log.txt');
function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
}

async function syncAttendance() {
    if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    log('--- STARTING ATTENDANCE DATA SYNC ---');

    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );

    const email = 'farhanjaved357@gmail.com';
    const password = 'Fur@8899';
    log(`Logging in to Supabase as ${email}...`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
        log('Supabase Login Error: ' + authError.message);
        process.exit(1);
    }
    log('Supabase login successful.');

    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
    });

    try {
        log('Fetching attendance from Supabase...');
        const { data: sbAttendance, error: sbError } = await supabase.from('attendance').select('*');
        if (sbError) throw sbError;
        log(`Fetched ${sbAttendance.length} records from Supabase.`);

        log('Setting foreign key checks to 0...');
        await db.query('SET FOREIGN_KEY_CHECKS = 0');

        log('Syncing records to MySQL...');
        let syncedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const record of sbAttendance) {
            try {
                const [existing] = await db.query('SELECT id FROM attendance WHERE id = ?', [record.id]);
                if (existing.length > 0) {
                    skippedCount++;
                    continue;
                }

                const fields = {
                    id: record.id,
                    staff_id: record.staff_id,
                    branch_id: record.branch_id,
                    attendance_date: record.attendance_date,
                    check_in: record.check_in ? new Date(record.check_in).toISOString().slice(0, 19).replace('T', ' ') : null,
                    check_out: record.check_out ? new Date(record.check_out).toISOString().slice(0, 19).replace('T', ' ') : null,
                    status: record.status || 'present',
                    notes: record.notes || null,
                    created_at: record.created_at ? new Date(record.created_at).toISOString().slice(0, 19).replace('T', ' ') : null
                };

                const columns = Object.keys(fields);
                const values = Object.values(fields);
                const placeholders = columns.map(() => '?').join(', ');
                const sql = `INSERT INTO attendance (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`;

                await db.execute(sql, values);
                syncedCount++;
            } catch (err) {
                log(`Error syncing record ${record.id}: ${err.message}`);
                errorCount++;
            }
        }

        log(`\n--- ATTENDANCE SYNC SUMMARY ---`);
        log(`Successfully Synced: ${syncedCount}`);
        log(`Skipped (Exists):    ${skippedCount}`);
        log(`Errors:              ${errorCount}`);

    } catch (err) {
        log('Migration failed: ' + err.message);
    } finally {
        await db.query('SET FOREIGN_KEY_CHECKS = 1');
        await db.end();
        log('Finalized.');
        process.exit(0);
    }
}

syncAttendance().catch(err => {
    log('FATAL ERROR: ' + err.message);
    process.exit(1);
});
