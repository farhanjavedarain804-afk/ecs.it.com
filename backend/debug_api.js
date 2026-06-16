const API_URL = 'http://localhost:5000/api';

async function runTests() {
    try {
        console.log('--- ECS API Diagnostic ---');

        // 1. Login with found credentials
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'farhanjaved357@gmail.com',
                password: 'Fur@8899'
            })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
        const token = loginData.token;
        console.log('Login: OK');

        const headers = { 'Authorization': `Bearer ${token}` };

        const endpoints = [
            '/invoices',
            '/customers',
            '/branches',
            '/complaints?status=completed&status=in_progress&status=assigned&status=solved',
            '/staff',
            '/services',
            '/products'
        ];

        for (const endpoint of endpoints) {
            try {
                const res = await fetch(`${API_URL}${endpoint}`, { headers });
                const data = await res.json();
                if (res.ok) {
                    console.log(`GET ${endpoint}: OK (${Array.isArray(data) ? data.length : 'object'} results)`);
                } else {
                    console.error(`GET ${endpoint}: FAILED [${res.status}] ${JSON.stringify(data)}`);
                }
            } catch (err) {
                console.error(`GET ${endpoint}: ERROR ${err.message}`);
            }
        }

    } catch (err) {
        console.error('DIAGNOSTIC CRASHED:', err.message);
    }
}

runTests();
