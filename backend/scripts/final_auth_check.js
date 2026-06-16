const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function finalCheck() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );

    const email = 'farhanjaved357@gmail.com';
    const password = 'Fur@8899';

    console.log('Logging in to Supabase...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
        console.error('Login failed:', authError.message);
        return;
    }
    console.log('Login successful.');

    const tables = [
        'branches', 'customers', 'staff', 'complaints',
        'invoices', 'products', 'services', 'inventory_items',
        'financial_entries', 'attendance', 'profiles'
    ];

    console.log('--- FINAL AUTHENTICATED ROW COUNTS ---');
    for (const table of tables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (error) {
                console.log(`${table.padEnd(20)}: Error - ${error.message} (Code: ${error.code})`);
            } else {
                console.log(`${table.padEnd(20)}: ${count} rows`);
            }
        } catch (e) {
            console.log(`${table.padEnd(20)}: Exception - ${e.message}`);
        }
    }
}

finalCheck();
