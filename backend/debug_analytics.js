const pool = require('./config/db');

const safeQuery = async (label, sql, params = []) => {
    try {
        const [rows] = await pool.query(sql, params);
        console.log(`[${label}] SQL: ${sql.substring(0, 50)}... | Params: ${JSON.stringify(params)} | Result Count: ${rows.length}`);
        return rows;
    } catch (err) {
        console.error(`[${label}] ERROR:`, err.message);
        return [];
    }
};

async function debugAnalytics(branch_id = null) {
    console.log(`\n--- Simulating /api/analytics for Branch: ${branch_id || 'GLOBAL'} ---`);

    let branchFilter = '';
    const params = [];
    if (branch_id) {
        branchFilter = ' AND branch_id = ?';
        params.push(branch_id);
    }

    try {
        const [
            complaintsAll,
            invoicesAll,
            finEntries,
            staffAll,
            customerCountRows,
            branchCountRows,
            inventoryCountRows,
            lowStockCountRows,
            servicesCountRows,
        ] = await Promise.all([
            safeQuery('complaintsAll', `SELECT id FROM complaints WHERE 1=1${branchFilter}`, params),
            safeQuery('invoicesAll', `SELECT id, total_amount, payment_status FROM invoices WHERE 1=1${branchFilter}`, params),
            safeQuery('finEntries', `SELECT amount, entry_type FROM financial_entries WHERE 1=1${branchFilter}`, params),
            safeQuery('staffAll', `SELECT id FROM staff WHERE 1=1${branchFilter}`, params),
            safeQuery('customerCountRows', `SELECT COUNT(*) as count FROM customers WHERE 1=1${branchFilter}`, params),
            safeQuery('branchCountRows', 'SELECT COUNT(*) as count FROM branches WHERE is_active = 1', []),
            safeQuery('inventoryCountRows', `SELECT COUNT(*) as count FROM inventory_items WHERE 1=1${branchFilter}`, params),
            safeQuery('lowStockCountRows', `SELECT COUNT(*) as count FROM inventory_items WHERE quantity <= min_stock_level AND min_stock_level > 0${branchFilter}`, params),
            safeQuery('servicesCountRows', 'SELECT COUNT(*) as count FROM services WHERE is_active = 1', []),
        ]);

        console.log('--- Summary ---');
        console.log('Total Complaints:', complaintsAll.length);
        console.log('Total Invoices:', invoicesAll.length);
        console.log('Total Customers:', customerCountRows.length > 0 ? customerCountRows[0].count : 0);
        console.log('Total Staff:', staffAll.length);
        console.log('Total Branches:', branchCountRows.length > 0 ? branchCountRows[0].count : 0);
        console.log('Total Services:', servicesCountRows.length > 0 ? servicesCountRows[0].count : 0);
        console.log('Total Inventory:', inventoryCountRows.length > 0 ? inventoryCountRows[0].count : 0);

    } catch (err) {
        console.error('Debug script failed:', err);
    }
}

async function run() {
    await debugAnalytics('a3dba7a2-0704-4dd9-9cea-37f6f894378a'); // Mehmood
    await debugAnalytics(null); // Global
    process.exit();
}

run();
