const http = require('http');
const mysql = require('mysql2/promise');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function probe() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        // 1. Get a valid user for the token
        const [u] = await db.query('SELECT * FROM users WHERE email = "farhanjaved357@gmail.com" LIMIT 1');
        const user = u[0];
        const token = jwt.sign({ id: user.id, email: user.email, role: 'super_admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        await db.end();

        // 2. Try to POST a new customer
        const postData = JSON.stringify({
            name: "Test Customer " + Date.now(),
            phone: "0300" + Math.floor(Math.random() * 9999999),
            email: "test@example.com",
            city: "Lahore"
        });

        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/customers',
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            console.log('Status Code:', res.statusCode);
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log('Response:', data);
            });
        });

        req.on('error', (err) => console.error('Fetch Error:', err.message));
        req.write(postData);
        req.end();

    } catch (e) {
        console.error('PROBE_ERROR:', e.message);
    }
}

probe();
