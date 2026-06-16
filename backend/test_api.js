const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'ecs_secure_secret_2026_remote';
const API_URL = 'http://localhost:5000';

async function testApi() {
    // 1. Generate token for Mehmood (Branch Admin)
    const payload = {
        id: 'user-id-mehmood',
        email: 'ecs.haier.bhk@gmail.com',
        role: 'branch_admin',
        branch_id: 'a3dba7a2-0704-4dd9-9cea-37f6f894378a'
    };
    const token = jwt.sign(payload, JWT_SECRET);

    console.log('--- Testing Analytics API ---');
    console.log('Payload:', payload);
    
    try {
        const fetch = (await import('node-fetch')).default;
        
        // Test 1: Branch Admin View
        console.log('\n--- Test 1: Branch Admin View ---');
        const res1 = await fetch(`${API_URL}/api/analytics?branch_id=${payload.branch_id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data1 = await res1.json();
        console.log('Status:', res1.status);
        console.log('Data:', JSON.stringify(data1, null, 2));

        // Test 2: Global View (if allowed)
        console.log('\n--- Test 2: Global View (No branch_id) ---');
        const res2 = await fetch(`${API_URL}/api/analytics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data2 = await res2.json();
        console.log('Status:', res2.status);
        console.log('Data Summary:', {
            total_complaints: data2.total_complaints,
            total_customers: data2.total_customers
        });

    } catch (err) {
        console.error('API Test failed:', err);
    }
}

testApi();
