const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function checkSpecifics() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );

    const tables = ['inventory', 'stock', 'ledger', 'transactions', 'financials', 'payments', 'expenses'];

    for (const table of tables) {
        try {
            const { data, error, count } = await supabase.from(table).select('*', { count: 'exact' }).limit(5);
            if (!error) {
                console.log(`[FOUND] Table: ${table.padEnd(15)} | Count: ${count}`);
                if (data && data.length > 0) {
                    console.log(`Sample data from ${table}:`, JSON.stringify(data[0]).slice(0, 100));
                }
            } else {
                // console.log(`[NOT FOUND] Table: ${table}`);
            }
        } catch (e) {
            console.log(`[ERR] Table: ${table} | ${e.message}`);
        }
    }
}

checkSpecifics();
