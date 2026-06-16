async function testValidLogin() {
    console.log('--- TESTING VALID LOGIN ---');
    try {
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'farhanjaved357@gmail.com', password: 'Fur@8899' })
        });
        const loginData = await loginRes.json();
        console.log('Login Result:', loginRes.status, loginData);
    } catch (e) {
        console.log('Login Test FAILED:', e.message);
    }
}

testValidLogin();
