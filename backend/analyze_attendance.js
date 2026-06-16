const { createClient } = require('@supabase/supabase-js');
const pool = require('./config/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function checkSync() {
    console.log('--- Attendance Sync Analysis ---');

    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );

    // Login for RLS bypass
    const email = 'farhanjaved357@gmail.com';
    const password = 'Fur@8899';
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
        console.error('Supabase Login Error:', authError.message);
        return;
    }

    try {
        const [mysqlFields] = await pool.query('DESCRIBE attendance');
        console.log('MySQL Attendance Fields:', mysqlFields.map(f => f.Field).join(', '));

        const { data: sbData, error: sbError } = await supabase.from('attendance').select('*').limit(5);
        if (sbError) {
            console.error('Supabase Error:', sbError.message);
        } else {
            console.log('Supabase Attendance Sample:', JSON.stringify(sbData, null, 2));
            if (sbData && sbData.length > 0) {
                console.log('Supabase Fields:', Object.keys(sbData[0]).join(', '));
            } else {
                console.log('No data found in Supabase attendance table.');
            }
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit(0);
    }
}

checkSync();
