let token = '';
const API_URL = 'http://localhost:5000/api';

async function login() {
    try {
        console.log('Attempting login...');
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@ecs.com', password: 'admin' })
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Login failed with status ${res.status}: ${errText}`);
        }
        const data = await res.json();
        token = data.token;
        console.log('Login successful, token length:', token ? token.length : 0);
    } catch (err) {
        console.error('Login ERROR:', err.message);
    }
}

async function testCRUD(entity, payload) {
    console.log(`\n--- Testing ${entity} ---`);
    if (!token) {
        console.error('No token available, skipping test');
        return;
    }
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
    try {
        // 1. Create
        console.log(`Step 1: Creating ${entity}...`);
        const createRes = await fetch(`${API_URL}/${entity}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });
        if (!createRes.ok) {
            const errText = await createRes.text();
            throw new Error(`Create failed with status ${createRes.status}: ${errText}`);
        }
        const createData = await createRes.json();
        const id = createData.id;
        console.log(`SUCCESS: Created ${entity} ID: ${id}`);

        if (!id) throw new Error('No ID returned from create');

        // 2. Patch
        console.log(`Step 2: Patching ${entity} ${id}...`);
        const patchRes = await fetch(`${API_URL}/${entity}/${id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ description: 'Updated Description' })
        });
        if (!patchRes.ok) {
            const errText = await patchRes.text();
            throw new Error(`Patch failed with status ${patchRes.status}: ${errText}`);
        }
        const patchData = await patchRes.json();
        console.log(`SUCCESS: PATCH ${entity}: ${patchData.message}`);

        // 3. Delete
        console.log(`Step 3: Deleting ${entity} ${id}...`);
        const deleteRes = await fetch(`${API_URL}/${entity}/${id}`, {
            method: 'DELETE',
            headers
        });
        if (!deleteRes.ok) {
            const errText = await deleteRes.text();
            throw new Error(`Delete failed with status ${deleteRes.status}: ${errText}`);
        }
        const deleteData = await deleteRes.json();
        console.log(`SUCCESS: DELETE ${entity}: ${deleteData.message}`);
    } catch (err) {
        console.error(`FAILED ${entity}:`, err.message);
    }
}

async function run() {
    await login();
    if (!token) {
        console.error('Exiting due to login failure');
        return;
    }

    await testCRUD('inventory_items', {
        name: 'Test Item',
        sku: 'TEST-001',
        category: 'Test',
        unit: 'piece',
        quantity: 10,
        min_stock_level: 2,
        unit_price: 100,
        item_type: 'inventory'
    });

    await testCRUD('financial_entries', {
        branch_id: 'test-branch',
        entry_type: 'Credit',
        category: 'Test',
        amount: 500,
        description: 'Test Entry',
        entry_date: new Date().toISOString().split('T')[0]
    });

    console.log('\n--- All tests completed ---');
}

run().catch(err => console.error('GLOBAL ERROR:', err));
