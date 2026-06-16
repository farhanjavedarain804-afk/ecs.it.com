const pool = require('./config/db');

async function testQuery(name, query, params = []) {
    try {
        console.log(`Testing ${name}...`);
        const [rows] = await pool.query(query, params);
        console.log(`${name}: SUCCESS (${rows.length} rows)`);
    } catch (err) {
        console.error(`${name}: FAILED - ${err.message}`);
        if (err.sql) console.error(`SQL: ${err.sql}`);
    }
}

async function run() {
    console.log('--- SQL Diagnostic ---');

    // Invoices Query
    await testQuery('Invoices', `
        SELECT i.*, 
               c.name as customer_name, c.address as customer_address, c.phone as customer_phone,
               b.name as branch_name, b.address as branch_address, b.branch_code, 
               comp.complaint_number, s.full_name as technician_name 
        FROM invoices i 
        JOIN customers c ON i.customer_id = c.id 
        JOIN branches b ON i.branch_id = b.id 
        LEFT JOIN complaints comp ON i.complaint_id = comp.id
        LEFT JOIN staff s ON i.technician_id = s.id
        ORDER BY i.created_at DESC
    `);

    // Complaints Query (with status array simulation)
    await testQuery('Complaints', `
        SELECT c.*, cust.name as customer_name, b.name as branch_name 
        FROM complaints c 
        JOIN customers cust ON c.customer_id = cust.id 
        JOIN branches b ON c.branch_id = b.id 
        WHERE c.status IN (?, ?, ?, ?)
        ORDER BY c.created_at DESC
    `, ['completed', 'in_progress', 'assigned', 'solved']);

    // Staff Query
    await testQuery('Staff', `
        SELECT s.*, b.name as branch_name 
        FROM staff s 
        LEFT JOIN branches b ON s.branch_id = b.id 
        WHERE 1=1
    `);

    process.exit(0);
}

run();
