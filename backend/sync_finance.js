const pool = require('./config/db');

async function sync() {
    try {
        console.log('Syncing financial_entries table...');
        
        // Drop then recreate to be safe and clean since it's early development/fix state
        // Alternatively, use ALTER statements if data preservation is critical, but here "Server Error" suggests it might be empty or broken already.
        // I'll use ALTER to be safer.
        
        const [rows] = await pool.query('SHOW COLUMNS FROM financial_entries');
        const columns = rows.map(r => r.Field);
        
        if (!columns.includes('cash_amount')) {
            await pool.query('ALTER TABLE financial_entries ADD COLUMN cash_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER amount');
        }
        if (!columns.includes('bank_amount')) {
            await pool.query('ALTER TABLE financial_entries ADD COLUMN bank_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER cash_amount');
        }
        if (!columns.includes('entry_time')) {
            await pool.query('ALTER TABLE financial_entries ADD COLUMN entry_time TIME NOT NULL AFTER entry_date');
        }
        
        // Fix column names/types if they were old
        if (columns.includes('type')) {
            await pool.query('ALTER TABLE financial_entries CHANGE COLUMN type entry_type ENUM("Credit", "Debit") NOT NULL');
        }
        if (columns.includes('date')) {
            await pool.query('ALTER TABLE financial_entries CHANGE COLUMN date entry_date DATE NOT NULL');
        }
        if (columns.includes('trx_id')) {
            await pool.query('ALTER TABLE financial_entries CHANGE COLUMN trx_id transaction_id VARCHAR(100) UNIQUE');
        }

        console.log('Table synced successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Sync failed:', err);
        process.exit(1);
    }
}

sync();
