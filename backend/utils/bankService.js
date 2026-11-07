const crypto = require('crypto');

// Default initial bank account if none configured yet
const DEFAULT_BANK_ACCOUNT = {
    id: 'default-hbl-primary',
    bank_name: 'Habib Bank Limited',
    account_title: 'ECS (PVT) Ltd',
    account_number: '0050417901614255',
    iban: '0050417901614255',
    branch_name: 'Blue Area, Islamabad',
    notes: 'Primary Master Account',
    is_default: true
};

/**
 * Get all configured bank accounts and branch mappings
 */
const getBankSettings = async (pool) => {
    try {
        const [rows] = await pool.query("SELECT value FROM settings WHERE `key` = 'bank_settings'");
        if (rows.length > 0 && rows[0].value) {
            const data = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
            if (data && Array.isArray(data.accounts) && data.accounts.length > 0) {
                return {
                    accounts: data.accounts,
                    branch_mappings: data.branch_mappings || {}
                };
            }
        }
    } catch (err) {
        console.error('[BankService] Error reading bank_settings:', err.message);
    }

    // Fallback: check company_settings table
    try {
        const [compRows] = await pool.query("SELECT bank_name, account_title, iban, account_number, branch FROM company_settings LIMIT 1");
        if (compRows.length > 0 && compRows[0] && compRows[0].bank_name) {
            const c = compRows[0];
            return {
                accounts: [{
                    id: 'default-primary',
                    bank_name: c.bank_name || DEFAULT_BANK_ACCOUNT.bank_name,
                    account_title: c.account_title || DEFAULT_BANK_ACCOUNT.account_title,
                    account_number: c.account_number || c.iban || DEFAULT_BANK_ACCOUNT.account_number,
                    iban: c.iban || c.account_number || DEFAULT_BANK_ACCOUNT.iban,
                    branch_name: c.branch || DEFAULT_BANK_ACCOUNT.branch_name,
                    notes: 'Default Company Account',
                    is_default: true
                }],
                branch_mappings: {}
            };
        }
    } catch (e) {}

    return {
        accounts: [DEFAULT_BANK_ACCOUNT],
        branch_mappings: {}
    };
};

/**
 * Save bank accounts and branch mappings, and sync default account to company_settings
 */
const saveBankSettings = async (pool, bankSettings) => {
    const accounts = Array.isArray(bankSettings.accounts) ? bankSettings.accounts : [];
    const branch_mappings = bankSettings.branch_mappings || {};

    // Ensure at least one account is marked as default
    let defaultAcc = accounts.find(a => a.is_default);
    if (!defaultAcc && accounts.length > 0) {
        accounts[0].is_default = true;
        defaultAcc = accounts[0];
    }

    const payload = { accounts, branch_mappings };

    // 1. Save in settings table
    const [exists] = await pool.query("SELECT `key` FROM settings WHERE `key` = 'bank_settings'");
    if (exists.length > 0) {
        await pool.query("UPDATE settings SET value = ?, updated_at = NOW() WHERE `key` = 'bank_settings'", [JSON.stringify(payload)]);
    } else {
        await pool.query("INSERT INTO settings (id, `key`, value) VALUES (?, 'bank_settings', ?)", [crypto.randomUUID(), JSON.stringify(payload)]);
    }

    // 2. Sync default bank account into company_settings table for backward compatibility
    if (defaultAcc) {
        try {
            const [compRows] = await pool.query("SELECT id FROM company_settings LIMIT 1");
            if (compRows.length > 0) {
                await pool.query(
                    "UPDATE company_settings SET bank_name = ?, account_title = ?, iban = ?, account_number = ? WHERE id = ?",
                    [defaultAcc.bank_name, defaultAcc.account_title, defaultAcc.iban, defaultAcc.account_number || defaultAcc.iban, compRows[0].id]
                );
            }
        } catch (syncErr) {
            console.warn('[BankService] Could not sync default account to company_settings:', syncErr.message);
        }
    }

    return payload;
};

/**
 * Resolve bank account for a given branchId
 * If branch has mapped account, use it; else use the default account
 */
const getBankAccountForBranch = async (pool, branchId) => {
    const bankSettings = await getBankSettings(pool);
    const accounts = bankSettings.accounts || [];
    const mappings = bankSettings.branch_mappings || {};

    let targetAccountId = null;
    if (branchId && mappings[branchId]) {
        targetAccountId = mappings[branchId];
    }

    if (targetAccountId && targetAccountId !== 'default') {
        const found = accounts.find(a => a.id === targetAccountId);
        if (found) return found;
    }

    // Default account fallback
    const defaultAcc = accounts.find(a => a.is_default);
    if (defaultAcc) return defaultAcc;
    if (accounts.length > 0) return accounts[0];

    return DEFAULT_BANK_ACCOUNT;
};

module.exports = {
    DEFAULT_BANK_ACCOUNT,
    getBankSettings,
    saveBankSettings,
    getBankAccountForBranch
};
