const fetch = require('node-fetch');

async function test() {
    const baseUrl = 'http://localhost:5000';
    console.log('Testing GET /api/settings/maintenance_mode...');
    try {
        const getRes = await fetch(`${baseUrl}/api/settings/maintenance_mode`);
        const getData = await getRes.json();
        console.log('GET Result:', getRes.status, getData);
    } catch (e) {
        console.error('GET Failed:', e.message);
    }

    console.log('\nTesting PATCH /api/settings/maintenance_mode...');
    try {
        const patchRes = await fetch(`${baseUrl}/api/settings/maintenance_mode`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: true })
        });
        const patchData = await patchRes.json();
        console.log('PATCH Result:', patchRes.status, patchData);
    } catch (e) {
        console.error('PATCH Failed:', e.message);
    }
}

test();
