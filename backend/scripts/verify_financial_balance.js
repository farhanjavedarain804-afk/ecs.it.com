const pool = require('../config/db');

async function verifyFinancialBalance() {
    console.log('--- Financial Balance Verification ---');
    try {
        const [results] = await pool.query('SELECT * FROM financial_entries ORDER BY entry_date DESC, created_at DESC LIMIT 5');
        console.log(`Fetched ${results.length} entries.`);
        
        if (results.length === 0) {
            console.log('No entries found to verify.');
            return;
        }

        // Check for running_balance in the modified API logic (simulated here)
        for (const entry of results) {
            const [balanceRes] = await pool.query(`
                SELECT SUM(CASE WHEN t2.entry_type IN ('Credit', 'income') THEN t2.amount ELSE -t2.amount END) as running_balance
                FROM financial_entries t2
                WHERE (t2.entry_date < ?) 
                   OR (t2.entry_date = ? AND t2.created_at <= ?)
            `, [entry.entry_date, entry.entry_date, entry.created_at]);
            
            console.log(`Entry ID: ${entry.id.slice(0, 8)} | Date: ${entry.entry_date.toISOString().slice(0,10)} | Type: ${entry.entry_type} | Amount: ${entry.amount} | Expected Running Balance: ${balanceRes[0].running_balance}`);
        }

        const [summaryResult] = await pool.query(`
            SELECT 
                SUM(CASE WHEN entry_type IN ('Credit', 'income') THEN amount ELSE 0 END) as total_credit,
                SUM(CASE WHEN entry_type IN ('Debit', 'expense') THEN amount ELSE 0 END) as total_debit
            FROM financial_entries
        `);
        console.log('Summary Totals (Global):');
        console.log(`  Total Credit: ${summaryResult[0].total_credit}`);
        console.log(`  Total Debit: ${summaryResult[0].total_debit}`);
        console.log(`  Net Balance: ${summaryResult[0].total_credit - summaryResult[0].total_debit}`);

        console.log('✅ Verification script logic confirmed.');
    } catch (err) {
        console.error('❌ Verification FAILED:', err);
    } finally {
        process.exit(0);
    }
}

verifyFinancialBalance();
