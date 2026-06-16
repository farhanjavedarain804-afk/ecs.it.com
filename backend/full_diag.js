const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function fullDiag() {
    console.log('--- EXTENDED SYSTEM DIAGNOSTIC ---');

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
            '/api/inventory_items',
            '/api/financial_entries',
            '/api/attendance',
            '/api/staff',
            '/api/complaints'
        ];

        for (const endpoint of endpoints) {
            console.log(`Testing ${endpoint}...`);
            const res = await fetch(`http://localhost:5000${endpoint}`, { headers });
            if (res.ok) {
                const data = await res.json();
                console.log(`  [OK] ${endpoint} returned ${Array.isArray(data) ? data.length : '1'} items.`);
            } else {
                const text = await res.text();
                console.log(`  [ERROR] ${endpoint} failed with ${res.status}:`, text);
            }
        }

    } catch (err) {
        console.error('Diagnostic crashed:', err.message);
    }
}

fullDiag();
