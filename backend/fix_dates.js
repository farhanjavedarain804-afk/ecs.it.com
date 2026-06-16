const pool = require('./config/db');

async function fixDates() {
    try {
        const [result] = await pool.query(
            "UPDATE attendance SET attendance_date = DATE(check_in) WHERE attendance_date = '0000-00-00'"
        );
        console.log('Fixed dates:', result.affectedRows);
    } catch (e) {
        console.error('Error fixing dates:', e);
    } finally {
        process.exit(0);
    }
}

fixDates();
