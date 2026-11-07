const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const bankService = require('../utils/bankService');

const DEFAULT_COMPANY_SETTINGS = {
    company_name: 'Electric Complaint Solutions',
    company_phone: '+92 310 1111 327',
    company_email: 'ecs.isbpak@gmail.com',
    company_address: '1st Floor, Zain Plaza, Islamabad',
    tax_id: '3220139033321',
    invoice_prefix: 'ECS-',
    next_invoice_number: 1001,
    default_resolution_time: 48,
    bank_name: 'Habib Bank Limited',
    account_title: 'ECS (PVT) Ltd',
    iban: '0050417901614255',
    terms_and_conditions: 'Payment is due within 7 days. Thank you for your business.',
    authorized_signatory: 'Muhammad Aamir',
    signatory_designation: 'Chief Executive Officer'
};

// @route   GET /api/company_settings/bank_settings
// @desc    Get multi-bank accounts and branch assignments
router.get('/bank_settings', auth(), async (req, res) => {
    try {
        const data = await bankService.getBankSettings(pool);
        res.json(data);
    } catch (err) {
        console.error('Error fetching bank settings:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PATCH /api/company_settings/bank_settings
// @desc    Update multi-bank accounts and branch assignments
router.patch('/bank_settings', auth(['super_admin', 'developer']), async (req, res) => {
    try {
        const saved = await bankService.saveBankSettings(pool, req.body);
        res.json({ message: 'Bank accounts and branch mappings updated successfully', data: saved });
    } catch (err) {
        console.error('Error saving bank settings:', err);
        res.status(500).json({ error: 'Failed to save bank settings' });
    }
});

// @route   GET /api/company_settings
router.get('/', auth(), async (req, res) => {
    try {
        let [rows] = await pool.query('SELECT * FROM company_settings LIMIT 1');
        let comp = rows[0] || null;

        // If no row exists in DB, create one
        if (!comp) {
            const id = crypto.randomUUID();
            try {
                await pool.query(
                    `INSERT INTO company_settings (id, bank_name, account_title, iban, default_resolution_time, terms_and_conditions) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [id, DEFAULT_COMPANY_SETTINGS.bank_name, DEFAULT_COMPANY_SETTINGS.account_title, DEFAULT_COMPANY_SETTINGS.iban, DEFAULT_COMPANY_SETTINGS.default_resolution_time, DEFAULT_COMPANY_SETTINGS.terms_and_conditions]
                );
                comp = { id, ...DEFAULT_COMPANY_SETTINGS };
            } catch (insErr) {
                comp = { id, ...DEFAULT_COMPANY_SETTINGS };
            }
        }

        // Overlay with settings table (company_profile) if present
        try {
            const [setRows] = await pool.query("SELECT value FROM settings WHERE `key` = 'company_profile'");
            if (setRows.length > 0 && setRows[0].value) {
                const setVal = typeof setRows[0].value === 'string' ? JSON.parse(setRows[0].value) : setRows[0].value;
                comp = { ...comp, ...setVal };
            }
        } catch (e) {}

        // Ensure all default properties are present if null/empty
        comp = {
            ...DEFAULT_COMPANY_SETTINGS,
            ...comp
        };

        res.json([comp]); // Return as array for .select().single() compatibility
    } catch (err) {
        console.error('Error fetching company settings:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PATCH /api/company_settings/:id
router.patch('/:id', auth(['super_admin', 'developer']), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };
        delete updates.id;

        if (Object.keys(updates).length === 0) {
            return res.json({ message: 'No updates provided' });
        }

        // 1. Sync full settings into settings table under 'company_profile'
        try {
            const [exists] = await pool.query("SELECT `key`, value FROM settings WHERE `key` = 'company_profile'");
            let merged = { ...updates };
            if (exists.length > 0 && exists[0].value) {
                const current = typeof exists[0].value === 'string' ? JSON.parse(exists[0].value) : exists[0].value;
                merged = { ...current, ...updates };
                await pool.query("UPDATE settings SET value = ?, updated_at = NOW() WHERE `key` = 'company_profile'", [JSON.stringify(merged)]);
            } else {
                await pool.query("INSERT INTO settings (id, `key`, value) VALUES (?, 'company_profile', ?)", [crypto.randomUUID(), JSON.stringify(merged)]);
            }
        } catch (setErr) {
            console.error('Settings backup error:', setErr.message);
        }

        // 2. Dynamically add missing columns to company_settings if needed
        try {
            const [cols] = await pool.query('SHOW COLUMNS FROM company_settings');
            const colNames = cols.map(c => c.Field);

            for (const key of Object.keys(updates)) {
                if (!colNames.includes(key)) {
                    try {
                        await pool.query(`ALTER TABLE company_settings ADD COLUMN \`${key}\` TEXT`);
                        colNames.push(key);
                    } catch (alterErr) {
                        console.warn(`Could not add column ${key}:`, alterErr.message);
                    }
                }
            }

            const validUpdates = {};
            for (const key of Object.keys(updates)) {
                if (colNames.includes(key)) {
                    validUpdates[key] = updates[key];
                }
            }

            if (Object.keys(validUpdates).length > 0) {
                const fields = Object.keys(validUpdates).map(k => `\`${k}\` = ?`).join(', ');
                const values = [...Object.values(validUpdates), id];
                await pool.query(`UPDATE company_settings SET ${fields} WHERE id = ?`, values);
            }
        } catch (tblErr) {
            console.warn('Table update error:', tblErr.message);
        }

        res.json({ message: 'Company settings updated successfully', data: updates });
    } catch (err) {
        console.error('Company settings update error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
