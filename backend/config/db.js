const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: '127.0.0.1', // HARDCODED: force IPv4 localhost to bypass ETIMEDOUT and IPv6 bugs
    user: process.env.DB_USER || 'devionic_ecsuser', // Fallback if .env is missing
    password: process.env.DB_PASS || 'Furhan112233344555Javed', // Fallback if .env is missing
    database: process.env.DB_NAME || 'devionic_ecs', // Fallback if .env is missing
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 20000, // 20s
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

// Prevent backend crashes due to unhandled database connection errors
pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err.message);
});
pool.on('connection', (connection) => {
    connection.on('error', (err) => {
        console.error('Unexpected database connection error:', err.message);
    });
});

// Immediate connection test with improved diagnostics
// Immediate connection test commented out to prevent startup crashes when offline/not whitelisted
/*
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Remote Database Connected Successfully');
        connection.release();
    } catch (err) {
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\n❌ DATABASE ACCESS DENIED');
            console.error('Check if your IP is whitelisted on the remote server (159.195.26.89).');
            console.error('Verify DB_USER/DB_PASS in your .env file.\n');
        } else if (err.code === 'ETIMEDOUT') {
            console.error('\n❌ DATABASE CONNECTION TIMEOUT');
            console.error('The remote server is too slow or unreachable. Check your internet or whitelist.\n');
        } else {
            console.error('❌ Database Connection Error:', err.message);
        }
    }
})();
*/

module.exports = pool;
