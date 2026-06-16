const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function fullInvoicesDiag() {
    console.log('--- FULL INVOICES MODULE DIAGNOSTIC ---');

    try {
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'farhanjaved357@gmail.com', password: 'Fur@8899' })
        });
        const { token } = await loginRes.json();
        const headers = { 'Authorization': `Bearer ${token}` };

        const endpoints = [
            '/api/invoices',
            '/api/customers',
            '/api/branches',
            '/api/complaints',
            '/api/staff',
            '/api/services',
            '/api/products'
        ];

        for (const endpoint of endpoints) {
            console.log(`Testing ${endpoint}...`);
            const res = await fetch(`http://localhost:5000${endpoint}`, { headers });
            const data = await res.json();
            if (res.ok) {
                console.log(`  [OK] ${endpoint} returned ${Array.isArray(data) ? data.length : '1'} items.`);
                if (endpoint === '/api/invoices' && Array.isArray(data)) {
                    console.log('  Invoices Sample:', JSON.stringify(data.slice(0, 1), null, 2));
                }
            } else {
                console.log(`  [ERROR] ${endpoint} failed with ${res.status}:`, data);
            }
        }

    } catch (err) {
        console.error('Diagnostic crashed:', err.message);
    }
}

fullInvoicesDiag();
