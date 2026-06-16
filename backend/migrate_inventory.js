
const { createClient } = require('@supabase/supabase-js');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, './.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const mysqlConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
};

async function migrate() {
    console.log('Starting Inventory Migration...');
    const pool = await mysql.createPool(mysqlConfig);

    try {
        // 1. Migrate inventory_items
        console.log('Fetching inventory items from Supabase...');
        const { data: items, error: itemsError } = await supabase
            .from('inventory_items')
            .select('*');

        if (itemsError) throw itemsError;
        console.log(`Found ${items.length} items.`);

        for (const item of items) {
            console.log(`Migrating item: ${item.name}`);
            await pool.query(
                `INSERT INTO inventory_items (id, name, sku, category, unit, quantity, min_stock_level, unit_price, branch_id, is_active, item_type, description, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE name=VALUES(name), quantity=VALUES(quantity), unit_price=VALUES(unit_price)`,
                [
                    item.id,
                    item.name,
                    item.sku,
                    item.category,
                    item.unit || 'piece',
                    item.quantity || 0,
                    item.min_stock_level || 0,
                    item.unit_price || 0,
                    item.branch_id,
                    item.is_active !== false,
                    item.item_type || 'inventory',
                    item.description,
                    item.created_at
                ]
            );
        }

        // 2. Migrate inventory_logs
        console.log('Fetching inventory logs from Supabase...');
        const { data: logs, error: logsError } = await supabase
            .from('inventory_logs')
            .select('*');

        if (logsError) throw logsError;
        console.log(`Found ${logs.length} logs.`);

        for (const log of logs) {
            console.log(`Migrating log: ${log.id}`);
            
            // Check if item exists in MySQL to avoid FK failure
            const [itemCheck] = await pool.query('SELECT id FROM inventory_items WHERE id = ?', [log.item_id]);
            if (itemCheck.length === 0) {
                console.warn(`Skipping log ${log.id}: referenced item ${log.item_id} does not exist in MySQL.`);
                continue;
            }

            await pool.query(
                `INSERT INTO inventory_logs (id, item_id, branch_id, staff_id, entry_type, qty, date, notes, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE qty=VALUES(qty)`,
                [
                    log.id,
                    log.item_id,
                    log.branch_id,
                    log.staff_id,
                    log.entry_type,
                    log.qty || 0,
                    log.date,
                    log.notes,
                    log.created_at
                ]
            );
        }

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
