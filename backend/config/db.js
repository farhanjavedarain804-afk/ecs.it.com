const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'u168718068_ecsuser',
    password: process.env.DB_PASS || 'Furhan1122334455Javed',
    database: process.env.DB_NAME || 'u168718068_ecs',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
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
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database Connected Successfully');
        connection.release();
    } catch (err) {
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\n❌ DATABASE ACCESS DENIED');
            console.error('Verify DB_USER/DB_PASS in your .env file.\n');
        } else if (err.code === 'ETIMEDOUT') {
            console.error('\n❌ DATABASE CONNECTION TIMEOUT');
            console.error('The database server is unreachable. Check your network.\n');
        } else {
            console.error('❌ Database Connection Error:', err.message);
        }
    }
})();

module.exports = pool;
