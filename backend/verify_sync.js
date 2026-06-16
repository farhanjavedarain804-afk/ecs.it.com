const pool = require('./config/db');

async function verify() {
    console.log('--- DATA VERIFICATION ---');
    try {
        const [c1] = await pool.query('SELECT COUNT(*) as count FROM customers');
        const [c2] = await pool.query('SELECT COUNT(*) as count FROM complaints');
        const [c3] = await pool.query('SELECT COUNT(*) as count FROM invoices');
        
        console.log('COUNTS:', { 
            customers: c1[0].count, 
            complaints: c2[0].count, 
            invoices: c3[0].count 
        });

        const [s1] = await pool.query('SELECT customer_id, name FROM customers ORDER BY created_at DESC LIMIT 3');
        const [s2] = await pool.query('SELECT complaint_number, customer_id FROM complaints ORDER BY created_at DESC LIMIT 3');
        const [s3] = await pool.query('SELECT invoice_number, total_amount FROM invoices ORDER BY created_at DESC LIMIT 3');

        console.log('\nSAMPLES:');
        console.log('CUSTOMERS:', JSON.stringify(s1, null, 2));
        console.log('COMPLAINTS:', JSON.stringify(s2, null, 2));
        console.log('INVOICES:', JSON.stringify(s3, null, 2));

    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        process.exit(0);
    }
}

verify();
