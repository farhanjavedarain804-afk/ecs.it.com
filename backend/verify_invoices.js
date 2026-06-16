const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function verifyInvoices() {
    console.log('--- VERIFYING NESTED INVOICE API ---');

    try {
        // 1. Login to get token
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'farhanjaved357@gmail.com', password: 'Fur@8899' })
        });
        const loginData = await loginRes.json();

        if (!loginRes.ok) {
            console.error('Login Failed:', loginData);
            return;
        }

        const { token } = loginData;
        console.log('Logged in successfully.');

        // 2. Fetch Invoices
        const invRes = await fetch('http://localhost:5000/api/invoices', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const invoices = await invRes.json();

        console.log(`Fetched ${invoices.length} invoices.`);

        if (invoices.length > 0) {
            const inv = invoices[0];
            console.log('\nSample Invoice Mapping:');
            console.log('Invoice Number:', inv.invoice_number);
            console.log('Customer Object:', inv.customers);
            console.log('Branch Object:', inv.branches);
            console.log('Complaint Object:', inv.complaints);

            if (inv.customers && inv.customers.name && inv.branches && inv.branches.name) {
                console.log('\nSUCCESS: Nested structure is present.');
            } else {
                console.log('\nFAILURE: Missing nested objects or names.');
                console.log('Keys present:', Object.keys(inv));
            }
        } else {
            console.log('No invoices to verify.');
        }
    } catch (err) {
        console.error('Verification script crashed:', err.message);
    }
}

verifyInvoices();
