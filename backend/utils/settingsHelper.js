const crypto = require('crypto');

/**
 * Robustly upsert a setting into the settings table,
 * gracefully handling different database schemas (with or without 'id', with or without 'updated_at').
 */
const upsertSetting = async (pool, key, value) => {
    const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);

    // 0. Ensure settings table exists
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                \`key\` VARCHAR(100) PRIMARY KEY,
                value JSON,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                updated_by VARCHAR(36)
            ) ENGINE=InnoDB
        `);
    } catch (tableErr) {
        // Table might already exist with different definition, ignore
    }

    // 1. Detect columns available in the settings table
    let hasId = false;
    let hasUpdatedAt = false;

    try {
        const [cols] = await pool.query('SHOW COLUMNS FROM settings');
        const colNames = cols.map(c => c.Field.toLowerCase());
        hasId = colNames.includes('id');
        hasUpdatedAt = colNames.includes('updated_at');
    } catch (colErr) {
        console.warn('[SettingsHelper] Could not inspect columns, falling back to safe query:', colErr.message);
    }

    // 2. Check if setting key already exists
    const [exists] = await pool.query('SELECT `key` FROM settings WHERE `key` = ?', [key]);

    if (exists.length > 0) {
        if (hasUpdatedAt) {
            await pool.query('UPDATE settings SET value = ?, updated_at = NOW() WHERE `key` = ?', [jsonValue, key]);
        } else {
            await pool.query('UPDATE settings SET value = ? WHERE `key` = ?', [jsonValue, key]);
        }
    } else {
        if (hasId) {
            const id = crypto.randomUUID();
            await pool.query('INSERT INTO settings (id, `key`, value) VALUES (?, ?, ?)', [id, key, jsonValue]);
        } else {
            try {
                await pool.query('INSERT INTO settings (`key`, value) VALUES (?, ?)', [key, jsonValue]);
            } catch (insErr) {
                // If it failed because 'id' is required after all, retry with generated UUID
                if (insErr.message && insErr.message.includes('id')) {
                    const id = crypto.randomUUID();
                    await pool.query('INSERT INTO settings (id, `key`, value) VALUES (?, ?, ?)', [id, key, jsonValue]);
                } else {
                    throw insErr;
                }
            }
        }
    }

    return true;
};

module.exports = {
    upsertSetting
};
