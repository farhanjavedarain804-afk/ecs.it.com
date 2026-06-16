const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function exhaustiveScan() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );

    const email = 'farhanjaved357@gmail.com';
    const password = 'Fur@8899';

    await supabase.auth.signInWithPassword({ email, password });

    const allPossibleTables = [
        'branches', 'profiles', 'user_roles', 'customers', 'staff', 'complaints',
        'invoices', 'invoice_items', 'attendance', 'attendance_records', 'monthly_attendance',
        'inventory_items', 'products', 'services', 'inventory_logs', 'stock_logs',
        'financial_entries', 'transactions', 'ledger', 'activity_logs', 'system_logs',
        'notifications', 'settings', 'company_settings', 'audit_logs',
        'items', 'catalog', 'stock', 'assets', 'fixed_assets', 'payments', 'expenses', 'income'
    ];

    console.log('--- EXHAUSTIVE AUTHENTICATED SCAN ---');
    for (const table of allPossibleTables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (!error && count > 0) {
                console.log(`${table.padEnd(20)}: ${count} rows`);
            }
        } catch (e) { }
    }
}

exhaustiveScan();
