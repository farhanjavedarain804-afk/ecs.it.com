const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function listSupabaseTables() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );

    console.log('--- SUPABASE TABLE LIST ---');

    const guesses = [
        'attendance', 'attendance_records', 'monthly_attendance', 'attendance_log',
        'inventory', 'inventory_items', 'inventory_logs', 'stock_logs', 'products', 'services', 'stock',
        'logs', 'activity_logs', 'system_logs', 'audit_logs',
        'financials', 'financial_entries', 'transactions', 'ledger', 'payments', 'expenses', 'income',
        'settings', 'company_settings', 'system_settings', 'app_settings',
        'customers', 'staff', 'branches', 'invoices', 'invoice_items', 'profiles', 'user_roles'
    ];

    for (const table of guesses) {
        try {
            const { data: tableData, error: tableError } = await supabase.from(table).select('*').limit(1);
            if (!tableError) {
                const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
                console.log(`[OK] Table: ${table.padEnd(20)} | Rows: ${count}`);
            }
        } catch (e) { }
    }
}

listSupabaseTables();
