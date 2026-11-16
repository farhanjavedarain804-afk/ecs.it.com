const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const emailService = require('../utils/emailService');

// @route   GET /api/customers
// @desc    Get all customers or search
router.get('/', auth(), async (req, res) => {
    try {
        const { search, branch_id, sort_by, order = 'desc' } = req.query;
        let query = `
            SELECT c.*, b.name as branch_name, b.city as branch_city
            FROM customers c 
            LEFT JOIN branches b ON c.branch_id = b.id 
            WHERE 1=1
        `;
        let params = [];

        if (branch_id) {
            query += ' AND c.branch_id = ?';
            params.push(branch_id);
        } else if (req.user.role !== 'developer' && req.user.role !== 'super_admin' && req.user.branch_id) {
            query += ' AND c.branch_id = ?';
            params.push(req.user.branch_id);
        }

        if (search) {
            query += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.customer_id LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Add Sorting
        const validSortFields = ['name', 'created_at', 'customer_id'];
        const finalSortBy = validSortFields.includes(sort_by) ? `c.${sort_by}` : 'c.created_at';
        const finalOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        query += ` ORDER BY ${finalSortBy} ${finalOrder}`;

        const [results] = await pool.query(query, params);

        // Format to match Supabase nested object expectation: c.branches.name
        const formatted = results.map(row => ({
            ...row,
            branches: row.branch_name ? { name: row.branch_name, city: row.branch_city } : null
        }));

        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// @route   GET /api/customers/lookup
// @desc    Fast customer lookup by phone or email for service requests / conversions
router.get('/lookup', auth(), async (req, res) => {
    try {
        const { phone, email } = req.query;
        if (!phone && !email) {
            return res.status(400).json({ error: 'Phone or email required for lookup' });
        }

        let query = `
            SELECT c.*, b.name as branch_name, b.city as branch_city
            FROM customers c
            LEFT JOIN branches b ON c.branch_id = b.id
            WHERE 1=0
        `;
        let params = [];

        if (phone && phone.trim()) {
            const cleanPhone = phone.trim();
            // Match exact phone or matching last 7 digits
            const digitsOnly = cleanPhone.replace(/\D/g, '');
            const suffix = digitsOnly.length >= 7 ? digitsOnly.slice(-7) : cleanPhone;
            query += ' OR c.phone = ? OR c.phone LIKE ?';
            params.push(cleanPhone, '%' + suffix);
        }

        if (email && email.trim()) {
            query += ' OR LOWER(c.email) = ?';
            params.push(email.trim().toLowerCase());
        }

        query += ' ORDER BY c.created_at DESC LIMIT 1';

        const [rows] = await pool.query(query, params);
        if (rows.length > 0) {
            return res.json({ found: true, customer: rows[0] });
        }

        res.json({ found: false });
    } catch (err) {
        console.error('Customer Lookup Error:', err);
        res.status(500).json({ error: 'Lookup failed' });
    }
});

// @route   POST /api/customers
// @desc    Add new customer
router.post('/', auth(), async (req, res) => {
    try {
        const { name, phone, email, address, city, branch_id } = req.body;
        if (!name || !phone) {
            return res.status(400).json({ error: 'Name and phone are required' });
        }

        const id = require('crypto').randomUUID();

        let finalBranchId = branch_id;
        if (!finalBranchId) {
            const [branches] = await pool.query('SELECT id FROM branches LIMIT 1');
            if (branches.length > 0) {
                finalBranchId = branches[0].id;
            } else {
                return res.status(400).json({ error: 'No branches found. Please create a branch first.' });
            }
        }

        // ── Duplicate Check ──────────────────────────────────────────────────
        // A customer is considered duplicate if they have the same phone number
        // in the same branch.
        const [existing] = await pool.query(
            'SELECT id, customer_id, name, phone, email, address, city, branch_id FROM customers WHERE phone = ? LIMIT 1',
            [phone.trim()]
        );
        if (existing.length > 0) {
            return res.status(409).json({
                error: `Customer already exists with this phone number.`,
                id: existing[0].id,
                customer_id: existing[0].customer_id,
                existing_customer_id: existing[0].customer_id,
                existing_name: existing[0].name,
                customer: existing[0]
            });
        }
        // ────────────────────────────────────────────────────────────────────

        // Generate a readable customer_id (e.g., ECS-2026-CUS-XXXXX)
        const year = new Date().getFullYear();

        // Find the global maximum suffix across all customer IDs
        const [maxRow] = await pool.query("SELECT MAX(CAST(SUBSTRING_INDEX(customer_id, '-', -1) AS UNSIGNED)) as max_val FROM customers");
        const nextNum = (maxRow[0].max_val || 0) + 1;
        const customer_id = `ECS-${year}-CUS-${String(nextNum).padStart(5, '0')}`;

        await pool.query(
            'INSERT INTO customers (id, customer_id, name, phone, email, address, city, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, customer_id, name, phone, email, address, city, finalBranchId]
        );

        // Automatic Welcome Email (non-blocking)
        if (email) {
            emailService.sendWelcomeEmail({ id, customer_id, name, phone, email, address, city }).catch(e => {
                console.error('[Customers] Welcome email background error:', e.message);
            });
        }

        res.status(201).json({ id, customer_id, name });
    } catch (err) {
        console.error('Customer Creation Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// @route   PATCH /api/customers/:id
// @desc    Update customer
router.patch('/:id', auth(), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No update data provided' });
        }

        // RBAC & Time Lock
        const [current] = await pool.query('SELECT branch_id, created_at FROM customers WHERE id = ?', [id]);
        if (current.length === 0) return res.status(404).json({ error: 'Customer not found' });

        if (req.user.role !== 'developer' && req.user.role !== 'super_admin') {
            if (current[0].branch_id !== req.user.branch_id) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            
            const hoursSinceCreation = (new Date() - new Date(current[0].created_at)) / (1000 * 60 * 60);
            if (hoursSinceCreation > 2) {
                return res.status(403).json({ error: 'Update locked: Records older than 2 hours can only be modified by Super Admin.' });
            }
        }

        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), id];

        await pool.query(`UPDATE customers SET ${fields} WHERE id = ?`, values);
        res.json({ message: 'Customer updated successfully' });
    } catch (err) {
        console.error('Customer Update Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// @route   DELETE /api/customers/:id
// @desc    Delete customer
router.delete('/:id', auth(), async (req, res) => {
    try {
        const { id } = req.params;

        // RBAC & Time Lock
        const [current] = await pool.query('SELECT branch_id, created_at FROM customers WHERE id = ?', [id]);
        if (current.length === 0) return res.status(404).json({ error: 'Customer not found' });

        if (req.user.role !== 'developer' && req.user.role !== 'super_admin') {
            if (current[0].branch_id !== req.user.branch_id) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            
            const hoursSinceCreation = (new Date() - new Date(current[0].created_at)) / (1000 * 60 * 60);
            if (hoursSinceCreation > 2) {
                return res.status(403).json({ error: 'Delete locked: Records older than 2 hours can only be removed by Super Admin.' });
            }
        }

        const [result] = await pool.query('DELETE FROM customers WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json({ message: 'Customer deleted successfully' });
    } catch (err) {
        console.error('Customer Deletion Error:', err);
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: 'Cannot delete customer with active complaints or invoices.' });
        }
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

module.exports = router;
