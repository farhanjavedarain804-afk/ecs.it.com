const pool = require('./config/db');
async function fix() {
    const email = 'farhanjaved357@gmail.com';
    try {
        const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (users.length > 0) {
            const userId = users[0].id;
            // Delete any existing roles and insert the correct developer role
            await pool.query('DELETE FROM user_roles WHERE user_id = ?', [userId]);
            await pool.query('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)', [
                require('crypto').randomUUID(),
                userId,
                'developer'
            ]);
            console.log('---FIX_START---');
            console.log('Developer role successfully applied to:', email);
            console.log('---FIX_END---');
        } else {
            console.log('---FIX_START---');
            console.log('ERROR: User not found:', email);
            console.log('---FIX_END---');
        }
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        process.exit(0);
    }
}
fix();
