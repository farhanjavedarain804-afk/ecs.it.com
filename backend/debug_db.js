const pool = require('./config/db');

async function debug() {
    console.log('--- Database Types Debug ---');
    try {
        const tables = ['complaints', 'invoices', 'customers', 'inventory_items', 'staff'];
        
        for (const table of tables) {
            console.log(`\n--- Table: ${table} ---`);
            try {
                const [cols] = await pool.query(`DESCRIBE ${table}`);
                cols.forEach(c => {
                    if (c.Field === 'branch_id' || c.Field === 'id' || c.Field === 'created_at' || c.Field === 'salary' || c.Field === 'amount' || c.Field === 'total_amount') {
                        console.log(`Column [${c.Field}]: Type=${c.Type}, Null=${c.Null}`);
                    }
                });
            } catch (err) {
                console.log(`❌ Error describing ${table}: ${err.message}`);
            }
        }

        console.log('\n--- Date Check in Complaints ---');
        try {
            const [rows] = await pool.query('SELECT MIN(created_at) as min_date, MAX(created_at) as max_date, COUNT(*) as count FROM complaints');
            console.log('Complaint data range:', rows[0]);
            const [rows2] = await pool.query('SELECT YEAR(CURDATE()) as current_year');
            console.log('Server reports year:', rows2[0].current_year);
        } catch (err) {
            console.log('Error checking dates:', err.message);
        }

    } catch (err) {
        console.error('Debug script failed:', err);
    } finally {
        process.exit();
    }
}

debug();
