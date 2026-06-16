const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function testSupabaseAuth() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );

    const email = 'farhanjaved357@gmail.com';
    const password = 'Fur@8899';

    console.log(`--- TESTING SUPABASE AUTH for ${email} ---`);
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.log('Auth Failed:', error.message);
    } else {
        console.log('Auth SUCCESS! Token acquired.');
        const token = data.session.access_token;

        // Now try to query inventory_items with this token
        const { data: items, error: itemErr, count } = await supabase
            .from('inventory_items')
            .select('*', { count: 'exact' });

        if (itemErr) {
            console.log('Query Failed even with Auth:', itemErr.message);
        } else {
            console.log(`Inventory items count with auth: ${count}`);
        }

        const { data: fin, count: finCount } = await supabase.from('financial_entries').select('*', { count: 'exact' });
        console.log(`Financial entries count with auth: ${finCount}`);

        const { data: att, count: attCount } = await supabase.from('attendance').select('*', { count: 'exact' });
        console.log(`Attendance count with auth: ${attCount}`);
    }
}

testSupabaseAuth();
