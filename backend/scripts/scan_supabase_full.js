const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function listAllTables() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );

    console.log('--- SCANNING SUPABASE SCHEMA ---');

    // We try to query a common set of possible table names and search the public schema
    const possibleTables = [
        'branches', 'profiles', 'user_roles', 'customers', 'staff', 'complaints',
        'invoices', 'invoice_items', 'attendance', 'attendance_records', 'monthly_attendance',
        'inventory_items', 'inventory_logs', 'products', 'services', 'stock', 'stock_logs',
        'financial_entries', 'financials', 'transactions', 'ledger', 'payments', 'expenses', 'income',
        'notifications', 'activity_logs', 'logs', 'system_logs', 'settings', 'company_settings',
        'fixed_assets', 'assets', 'reports', 'audit_logs', 'categories'
    ];

    for (const table of possibleTables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (!error) {
                console.log(`[OK] Table: ${table.padEnd(25)} | Rows: ${count}`);
            } else if (error.code !== 'PGRST116' && !error.message.includes('not found')) {
                // console.log(`[ERR] Table: ${table.padEnd(25)} | Error: ${error.message}`);
            }
        } catch (e) {
            // console.log(`[EXC] Table: ${table.padEnd(25)} | Exception: ${e.message}`);
        }
    }
}

listAllTables();
