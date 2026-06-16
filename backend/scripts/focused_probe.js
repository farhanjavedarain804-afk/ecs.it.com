const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function focusedProbe() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );

    console.log('--- FOCUSED PROBE ---');

    console.log('Querying inventory_items...');
    const { data: inv, error: invErr } = await supabase.from('inventory_items').select('*').limit(5);
    if (invErr) console.log('Inventory Err:', invErr.message);
    else console.log('Inventory Sample:', inv);

    console.log('Querying financial_entries...');
    const { data: fin, error: finErr } = await supabase.from('financial_entries').select('*').limit(5);
    if (finErr) console.log('Financial Err:', finErr.message);
    else console.log('Financial Sample:', fin);

    console.log('Checking for other tables like fixed_assets or stock...');
    const { data: stock } = await supabase.from('stock').select('*').limit(1);
    console.log('Stock table exists:', !!stock);
}

focusedProbe();
