const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function syncUsers() {
    console.log('--- SYNCING USERS FROM PROFILES ---');
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        const [profiles] = await db.query('SELECT user_id, email, full_name FROM profiles');
        console.log(`Found ${profiles.length} profiles.`);

        const defaultPassword = 'Fur@8899'; // Standard placeholder
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);

        for (const profile of profiles) {
            console.log(`Syncing user: ${profile.email}...`);
            await db.query(`
                INSERT IGNORE INTO users (id, email, password_hash)
                VALUES (?, ?, ?)
            `, [
                profile.user_id,
                profile.email,
                hashedPassword
            ]);
        }

        console.log('--- USER SYNC FINISHED ---');
    } catch (err) {
        console.error('User sync error:', err.message);
    } finally {
        await db.end();
    }
}

syncUsers().catch(console.error);
