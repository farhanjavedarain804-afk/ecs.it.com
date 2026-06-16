const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function createAdmin() {
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
        console.log('Usage: node create_admin.js <email> <password>');
        process.exit(1);
    }

    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        const userId = crypto.randomUUID();
        const roleId = crypto.randomUUID();
        const passwordHash = await bcrypt.hash(password, 10);

        // 1. Insert into users
        await db.execute(
            'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
            [userId, email, passwordHash]
        );

        // 2. Insert into user_roles
        await db.execute(
            'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
            [roleId, userId, 'super_admin']
        );

        // 3. Insert a basic profile
        await db.execute(
            'INSERT INTO profiles (id, user_id, full_name, email) VALUES (?, ?, ?, ?)',
            [crypto.randomUUID(), userId, 'System Admin', email]
        );

        console.log(`Admin user ${email} created successfully!`);
    } catch (err) {
        console.error('Failed to create admin:', err.message);
    } finally {
        await db.end();
    }
}

createAdmin();
