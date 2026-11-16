const crypto = require('crypto');

/**
 * Robustly upsert a setting into the settings table,
 * gracefully handling different database schemas (with or without 'id', with or without 'updated_at').
 */
const upsertSetting = async (pool, key, value, userId = null) => {
    const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);

    // 0. Ensure settings table exists
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                \`key\` VARCHAR(100) PRIMARY KEY,
                \`value\` LONGTEXT,
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
    let hasUpdatedBy = false;

    try {
        const [cols] = await pool.query('SHOW COLUMNS FROM settings');
        if (Array.isArray(cols)) {
            cols.forEach(col => {
                const colName = String(col.Field || col.field || col.COLUMN_NAME || col.column_name || Object.values(col)[0] || '').toLowerCase();
                if (colName === 'id') hasId = true;
                if (colName === 'updated_at') hasUpdatedAt = true;
                if (colName === 'updated_by') hasUpdatedBy = true;
            });
        }
    } catch (colErr) {
        console.warn('[SettingsHelper] Could not inspect columns:', colErr.message);
    }

    // 2. Check if setting key already exists
    const [exists] = await pool.query('SELECT `key` FROM settings WHERE `key` = ?', [key]);

    if (exists.length > 0) {
        // UPDATE existing record
        if (hasUpdatedAt && hasUpdatedBy && userId) {
            await pool.query('UPDATE settings SET `value` = ?, updated_at = NOW(), updated_by = ? WHERE `key` = ?', [jsonValue, userId, key]);
        } else if (hasUpdatedAt) {
            await pool.query('UPDATE settings SET `value` = ?, updated_at = NOW() WHERE `key` = ?', [jsonValue, key]);
        } else {
            await pool.query('UPDATE settings SET `value` = ? WHERE `key` = ?', [jsonValue, key]);
        }
    } else {
        // INSERT new record
        if (hasId) {
            const id = crypto.randomUUID();
            if (hasUpdatedBy && userId) {
                await pool.query('INSERT INTO settings (`id`, `key`, `value`, `updated_by`) VALUES (?, ?, ?, ?)', [id, key, jsonValue, userId]);
            } else {
                await pool.query('INSERT INTO settings (`id`, `key`, `value`) VALUES (?, ?, ?)', [id, key, jsonValue]);
            }
        } else {
            if (hasUpdatedBy && userId) {
                await pool.query('INSERT INTO settings (`key`, `value`, `updated_by`) VALUES (?, ?, ?)', [key, jsonValue, userId]);
            } else {
                await pool.query('INSERT INTO settings (`key`, `value`) VALUES (?, ?)', [key, jsonValue]);
            }
        }
    }

    return true;
};

module.exports = {
    upsertSetting
};
