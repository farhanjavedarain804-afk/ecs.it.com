const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function checkSpecificTables() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );

    const tables = [
        'attendance_records', 'monthly_attendance', 'attendance_log',
        'inventory', 'stock_logs', 'audit_logs', 'logs',
        'financials', 'transactions', 'ledger', 'system_settings'
    ];

    for (const table of tables) {
        try {
            const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
            if (!error) {
                console.log(`[FOUND] Table: ${table.padEnd(20)} | Rows: ${count}`);
            }
        } catch (e) { }
    }
}

checkSpecificTables();
