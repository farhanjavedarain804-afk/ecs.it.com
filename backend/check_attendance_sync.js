const { createClient } = require('@supabase/supabase-js');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function checkAttendance() {
    console.log('--- Checking Attendance Data ---');

    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );

    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
    });

    try {
        const [mysqlFields] = await db.query('DESCRIBE attendance');
        console.log('MySQL Attendance Fields:', mysqlFields.map(f => f.Field).join(', '));

        const { data: sbData, error: sbError } = await supabase.from('attendance').select('*').limit(5);
        if (sbError) {
            console.error('Supabase Error:', sbError.message);
        } else {
            console.log('Supabase Attendance Sample:', JSON.stringify(sbData, null, 2));
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await db.end();
    }
}

checkAttendance();
