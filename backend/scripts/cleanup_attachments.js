const pool = require('../config/db');

async function cleanupAttachments() {
    try {
        console.log('Fetching all complaints...');
        const [complaints] = await pool.query('SELECT id, attachments FROM complaints');

        let fixedCount = 0;
        for (const row of complaints) {
            let atts = row.attachments;

            // If it's a string, try to parse it
            if (typeof atts === 'string') {
                try {
                    atts = JSON.parse(atts);
                } catch (e) {
                    // Not valid JSON, ignore
                    continue;
                }
            }

            // If it's an array of single characters AND the first one is '[', 
            // it's almost certainly the victim of the spread-string bug.
            if (Array.isArray(atts) && atts.length > 2 && atts[0] === '[' && atts[atts.length - 1] === ']') {
                const originalString = atts.join('');
                try {
                    const restoredArray = JSON.parse(originalString);
                    if (Array.isArray(restoredArray)) {
                        console.log(`Restoring malformed array for complaint ${row.id}: ${originalString}`);
                        await pool.query('UPDATE complaints SET attachments = ? WHERE id = ?', [JSON.stringify(restoredArray), row.id]);
                        fixedCount++;
                    }
                } catch (e) {
                    console.error(`Failed to restore string for complaint ${row.id}: ${originalString}`);
                }
            }
        }

        console.log(`Cleanup complete. Fixed ${fixedCount} corrupted records.`);
        process.exit(0);
    } catch (err) {
        console.error('Cleanup error:', err);
        process.exit(1);
    }
}

cleanupAttachments();
