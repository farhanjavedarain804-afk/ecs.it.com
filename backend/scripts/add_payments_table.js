const pool = require('../config/db');

async function migrate() {
    const connection = await pool.getConnection();
    try {
        console.log('Starting migration: branch_settlements table...');
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS branch_settlements (
                id VARCHAR(36) PRIMARY KEY,
                from_branch_id VARCHAR(36), -- NULL represents Head Office
                to_branch_id VARCHAR(36),   -- NULL represents Head Office
                amount DECIMAL(12, 2) NOT NULL,
                transfer_type ENUM('Inter-Branch', 'HO-to-Branch', 'Branch-to-HO', 'Salary', 'Profit-Update') NOT NULL,
                description TEXT,
                created_by VARCHAR(36) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (from_branch_id) REFERENCES branches(id) ON DELETE SET NULL,
                FOREIGN KEY (to_branch_id) REFERENCES branches(id) ON DELETE SET NULL,
                FOREIGN KEY (created_by) REFERENCES users(id)
            ) ENGINE=InnoDB;
        `);

        console.log('Migration successful: branch_settlements table created.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        connection.release();
        process.exit();
    }
}

migrate();
