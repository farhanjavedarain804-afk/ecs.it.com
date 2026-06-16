const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function checkMetadata() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );

    console.log('--- PRODUCT METADATA SCAN ---');
    const { data: prods, error } = await supabase.from('products').select('*');
    if (error) {
        console.log('Error:', error.message);
        return;
    }

    console.log(`Total Products: ${prods.length}`);
    const categories = [...new Set(prods.map(p => p.category))];
    console.log('Categories:', categories);

    const inventoryFound = prods.filter(p =>
        (p.category && p.category.toLowerCase().includes('inventory')) ||
        (p.name && p.name.toLowerCase().includes('inventory'))
    );
    console.log(`Potential Inventory in Products: ${inventoryFound.length}`);

    console.log('--- EXPLORING ATTENDANCE ---');
    const { data: att } = await supabase.from('attendance').select('*');
    console.log(`Attendance rows: ${att ? att.length : 0}`);

    console.log('--- EXPLORING INVOICES ---');
    const { data: invs } = await supabase.from('invoices').select('*');
    if (invs) {
        let paid = invs.filter(i => i.payment_status === 'paid').length;
        let unpaid = invs.filter(i => i.payment_status !== 'paid').length;
        console.log(`Invoices: Total ${invs.length}, Paid ${paid}, Unpaid ${unpaid}`);
    }
}

checkMetadata();
