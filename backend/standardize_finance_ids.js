const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./config/db');

async function standardize() {
    console.log('Starting Financial ID Standardization...');
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get all financial entries sorted by date
        const [entries] = await connection.query(
            'SELECT id, entry_date, created_at FROM financial_entries ORDER BY entry_date ASC, created_at ASC'
        );

        console.log(`Processing ${entries.length} records...`);

        // Group by date to maintain consistent counters per day
        const dailyCounters = {};

        for (const entry of entries) {
            const dateStr = new Date(entry.entry_date).toISOString().slice(0, 10).replace(/-/g, '');
            if (!dailyCounters[dateStr]) dailyCounters[dateStr] = 0;
            dailyCounters[dateStr]++;

            const prefix = `ECS-FIN-${dateStr}-`;
            const newId = `${prefix}${String(dailyCounters[dateStr]).padStart(5, '0')}`;

            await connection.query(
                'UPDATE financial_entries SET transaction_id = ? WHERE id = ?',
                [newId, entry.id]
            );
        }

        await connection.commit();
        console.log('✅ Financial IDs standardized successfully.');
        process.exit(0);
    } catch (err) {
        await connection.rollback();
        console.error('❌ Standardization failed:', err);
        process.exit(1);
    } finally {
        connection.release();
    }
}

standardize();
