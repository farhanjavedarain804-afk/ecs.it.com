const pool = require('../config/db');

async function addReviewsTable() {
    try {
        console.log('Adding complaint_reviews table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS complaint_reviews (
                id VARCHAR(36) PRIMARY KEY,
                complaint_id VARCHAR(36) NOT NULL,
                customer_id VARCHAR(36) NOT NULL,
                branch_id VARCHAR(36) NOT NULL,
                q1_rating INT DEFAULT 0, -- Did our team contact you on time?
                q2_rating INT DEFAULT 0, -- How was the technician’s behavior?
                q3_rating INT DEFAULT 0, -- Was the technician in uniform?
                q4_rating INT DEFAULT 0, -- Was the technician’s working style professional?
                q5_rating INT DEFAULT 0, -- How much payment did he take and did he provide a bill?
                refused_ratings BOOLEAN DEFAULT false,
                note TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (branch_id) REFERENCES branches(id)
            ) ENGINE=InnoDB;
        `);
        console.log('✅ complaint_reviews table added successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error adding table:', err.message);
        process.exit(1);
    }
}

addReviewsTable();
