const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const admins = [
    {
        id: 'b3708eea-5a8e-48a0-9818-8ec956f8c551',
        email: 'ecs.isbpak@gmail.com',
        full_name: 'Aamir Haseeb',
        role: 'super_admin'
    },
    {
        id: '06fe5d39-aad2-43d0-bb0e-6cded2ac32de',
        email: 'ecs.haier.bhk@gmail.com',
        full_name: 'Mehmood',
        role: 'branch_admin'
    },
    {
        id: '026546a3-87dc-4d12-8a25-e8036df8f30d',
        email: 'ecs.dawlance@gmail.com',
        full_name: 'Mohad Nadeem',
        role: 'branch_admin'
    }
];

const DEFAULT_PASSWORD = 'Fur@8899'; // Use a consistent default password for restoration

async function restoreAdmins() {
    console.log('--- RESTORING ADMIN USERS ---');
    let db;
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

        for (const admin of admins) {
            console.log(`Processing: ${admin.email}...`);

            // 1. Insert/Update User
            await db.query(
                'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE email = VALUES(email), password_hash = VALUES(password_hash)',
                [admin.id, admin.email, passwordHash]
            );

            // 2. Insert/Update Profile
            await db.query(
                'INSERT INTO profiles (id, user_id, email, full_name) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE email = VALUES(email), full_name = VALUES(full_name)',
                [require('crypto').randomUUID(), admin.id, admin.email, admin.full_name]
            );

            // 3. Insert/Update Role
            await db.query(
                'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)',
                [require('crypto').randomUUID(), admin.id, admin.role]
            );

            console.log(`Success: ${admin.email} restored with role ${admin.role}`);
        }

        console.log('\n--- ALL ADMINS RESTORED ---');
        console.log(`Login Password for all: ${DEFAULT_PASSWORD}`);

    } catch (err) {
        console.error('Restoration failed:', err.message);
    } finally {
        if (db) await db.end();
    }
}

restoreAdmins();
