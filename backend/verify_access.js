const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function verifyAccess() {
    console.log('--- VERIFYING ADMIN ACCESS & REGISTRATION ---');

    try {
        // 1. Test Login for a restored admin
        console.log('\nTesting login for ecs.isbpak@gmail.com...');
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'ecs.isbpak@gmail.com', password: 'Fur@8899' })
        });
        const loginData = await loginRes.json();

        if (loginRes.ok) {
            console.log('SUCCESS: Restored admin logged in.');
            const token = loginData.token;

            // 2. Test Registration (using super_admin token)
            console.log('\nTesting new user registration...');
            const regEmail = `test_admin_${Date.now()}@example.com`;
            const regRes = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: regEmail,
                    password: 'password123',
                    full_name: 'Test Administrator',
                    role: 'branch_admin'
                })
            });
            const regData = await regRes.json();

            if (regRes.ok) {
                console.log(`SUCCESS: Registered ${regEmail}`);
            } else {
                console.log('FAILURE: Registration failed:', regData);
            }
        } else {
            console.log('FAILURE: Restored admin login failed:', loginData);
        }
    } catch (err) {
        console.error('Verification crashed:', err.message);
    }
}

verifyAccess();
