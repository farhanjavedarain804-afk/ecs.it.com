const pool = require('./config/db');

async function checkAndCreate() {
  try {
    const [rows] = await pool.query('SHOW TABLES LIKE "service_requests"');
    if (rows.length === 0) {
      console.log('Table service_requests does NOT exist. Creating...');
      await pool.query(`
        CREATE TABLE service_requests (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          phone VARCHAR(20) NOT NULL,
          email VARCHAR(255) DEFAULT NULL,
          service_required VARCHAR(255) NOT NULL,
          city_branch VARCHAR(100) NOT NULL,
          status ENUM('pending','in_progress','resolved','cancelled') NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log('Table service_requests created successfully!');
    } else {
      console.log('Table service_requests EXISTS. DB connection OK.');
    }
    process.exit(0);
  } catch (err) {
    console.error('DB Error:', err.code, '-', err.message);
    process.exit(1);
  }
}

checkAndCreate();
