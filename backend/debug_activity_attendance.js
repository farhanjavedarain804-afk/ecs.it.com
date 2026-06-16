// Using global fetch (standard in modern Node.js)

async function test() {
    console.log('--- Activity & Attendance Diagnostic ---');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'farhanjaved357@gmail.com', password: 'Fur@8899' })
    });
    const { token } = await loginRes.json();
    const headers = { 'Authorization': `Bearer ${token}` };

    // 1. Activity Logs
    const actRes = await fetch('http://localhost:5000/api/activity_logs?limit=5', { headers });
    const acts = await actRes.json();
    console.log('Activity Logs:', Array.isArray(acts) ? `OK (${acts.length} results)` : 'FAILED');
    if (acts.length > 0) {
        console.log(' - First log user_email:', acts[0].user_email);
    }

    // 2. Attendance
    const attRes = await fetch('http://localhost:5000/api/attendance?limit=5', { headers });
    const atts = await attRes.json();
    console.log('Attendance Records:', Array.isArray(atts) ? `OK (${atts.length} results)` : 'FAILED');
    if (atts.length > 0) {
        console.log(' - First record staff object:', atts[0].staff ? 'FOUND' : 'MISSING');
        console.log(' - First record branches object:', atts[0].branches ? 'FOUND' : 'MISSING');
    }
}

test().catch(console.error);
