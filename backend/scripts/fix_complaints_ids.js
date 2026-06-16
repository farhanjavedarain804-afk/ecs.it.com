const pool = require('../config/db');

async function fixComplaintsIds() {
    try {
        console.log('Fetching complaints...');
        const [complaints] = await pool.query('SELECT id, created_at, complaint_number FROM complaints ORDER BY created_at ASC');

        console.log(`Found ${complaints.length} complaints. Updating IDs...`);

        for (let i = 0; i < complaints.length; i++) {
            const comp = complaints[i];
            const date = new Date(comp.created_at);
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}${mm}${dd}`;

            const prefix = `ECS-${dateStr}-COM-`;

            // For standardization, we'll re-sequence them within the same day
            // But we need to count how many we've already done for this specific date
            const currentNum = i + 1; // Simplistic approach: global sequence
            // A better way is daily sequence, but global is safer for a one-time fix if there are few.
            // Let's do daily sequence.
            const [countRow] = await pool.query(
                "SELECT COUNT(*) as count FROM complaints WHERE id != ? AND complaint_number LIKE ?",
                [comp.id, prefix + '%']
            );
            const nextNum = countRow[0].count + 1;
            const newId = `${prefix}${String(nextNum).padStart(5, '0')}`;

            console.log(`Updating ${comp.complaint_number} -> ${newId}`);
            await pool.query('UPDATE complaints SET complaint_number = ? WHERE id = ?', [newId, comp.id]);
        }

        console.log('Update complete.');
        process.exit(0);
    } catch (err) {
        console.error('Error fixing IDs:', err);
        process.exit(1);
    }
}

fixComplaintsIds();
