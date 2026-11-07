const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const emailService = require('../utils/emailService');

// @route   GET /api/invoices
router.get('/', auth(), async (req, res) => {
    try {
        const { branch_id, status, customer_id } = req.query;
        let query = `
            SELECT i.*, 
                   c.name as customer_name, c.address as customer_address, c.phone as customer_phone, c.email as customer_email, c.city as customer_city,
                   b.name as branch_name, b.address as branch_address, b.branch_code, b.city as branch_city,
                   comp.complaint_number, s.full_name as technician_name 
            FROM invoices i 
            JOIN customers c ON i.customer_id = c.id 
            JOIN branches b ON i.branch_id = b.id 
            LEFT JOIN complaints comp ON i.complaint_id = comp.id
            LEFT JOIN staff s ON i.technician_id = s.id
            WHERE 1=1
        `;
        let params = [];
        if (branch_id) {
            query += ' AND i.branch_id = ?';
            params.push(branch_id);
        } else if (req.user.role !== 'developer' && req.user.role !== 'super_admin' && req.user.branch_id) {
            query += ' AND i.branch_id = ?';
            params.push(req.user.branch_id);
        }
        if (customer_id) {
            query += ' AND i.customer_id = ?';
            params.push(customer_id);
        }
        if (status) {
            const statusArr = Array.isArray(status) ? status : [status];
            query += ` AND i.payment_status IN (${statusArr.map(() => '?').join(',')})`;
            params.push(...statusArr);
        }

        const { or, invoice_number, verification_id } = req.query;
        if (or) {
            const parts = or.split(',');
            const orConditions = [];
            parts.forEach(part => {
                const [col, op, val] = part.split('.');
                const cleanVal = val ? val.replace(/%/g, '') : '';
                if (op === 'ilike' || op === 'like') {
                    orConditions.push(`i.${col} LIKE ?`);
                    params.push(`%${cleanVal}%`);
                } else if (op === 'eq') {
                    orConditions.push(`i.${col} = ?`);
                    params.push(cleanVal);
                }
            });
            if (orConditions.length > 0) {
                query += ` AND (${orConditions.join(' OR ')})`;
            }
        }

        if (invoice_number) {
            query += " AND i.invoice_number LIKE ?";
            params.push(`%${invoice_number}%`);
        }
        if (verification_id) {
            query += " AND i.verification_id = ?";
            params.push(verification_id);
        }

        query += ' ORDER BY i.created_at DESC';
        const [rows] = await pool.query(query, params);
        const results = rows.map(row => ({
            ...row,
            customers: { id: row.customer_id, name: row.customer_name, address: row.customer_address, phone: row.customer_phone, email: row.customer_email, city: row.customer_city || row.branch_city || '' },
            branches: { id: row.branch_id, name: row.branch_name, address: row.branch_address, branch_code: row.branch_code, city: row.branch_city },
            complaints: row.complaint_id ? { id: row.complaint_id, complaint_number: row.complaint_number } : null,
            staff: row.technician_id ? { id: row.technician_id, full_name: row.technician_name } : null
        }));
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/invoices/:id
router.get('/:id', auth(), async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT i.*, 
                   c.name as customer_name, c.address as customer_address, c.phone as customer_phone, c.email as customer_email, c.city as customer_city,
                   b.name as branch_name, b.address as branch_address, b.branch_code, b.city as branch_city,
                   comp.complaint_number, comp.description as complaint_description, comp.complaint_type,
                   s.full_name as technician_name 
            FROM invoices i 
            JOIN customers c ON i.customer_id = c.id 
            JOIN branches b ON i.branch_id = b.id 
            LEFT JOIN complaints comp ON i.complaint_id = comp.id
            LEFT JOIN staff s ON i.technician_id = s.id
            WHERE i.id = ?
        `;
        const [rows] = await pool.query(query, [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
        const row = rows[0];

        // Priority 1: Fetch items from the invoice_items table
        let [items] = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);

        // Priority 2: Fallback to JSON column if invoice_items table has no rows
        if (items.length === 0 && row.items) {
            try {
                const parsed = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
                if (Array.isArray(parsed) && parsed.length > 0) items = parsed;
            } catch (e) {
                console.error('[Invoice] Failed to parse items JSON column:', e.message);
            }
        }

        // Priority 3: Last resort — synthesize a single line from subtotal + available description fields
        if (items.length === 0 && (parseFloat(row.subtotal) || 0) > 0) {
            let desc = '';
            if (row.notes && row.notes.trim()) {
                desc = row.notes.replace(/^Complaint Description:\s*/i, '').trim().substring(0, 150);
            }
            if (!desc && row.complaint_description && row.complaint_description.trim()) {
                desc = row.complaint_description.trim().substring(0, 150);
            }
            if (!desc && row.complaint_type) {
                const typeMap = { installation: 'Installation Service', repair: 'Repair Service', maintenance: 'Maintenance Service' };
                desc = typeMap[row.complaint_type] || row.complaint_type;
            }
            items = [{
                id: null,
                invoice_id: row.id,
                description: desc || 'Repair / Service Work',
                quantity: 1,
                unit_price: parseFloat(row.subtotal) || 0,
                total_price: parseFloat(row.subtotal) || 0,
                qty: 1,
                unitPrice: parseFloat(row.subtotal) || 0
            }];
        }

        const result = {
            ...row,
            items,
            customers: { id: row.customer_id, name: row.customer_name, address: row.customer_address, phone: row.customer_phone, email: row.customer_email },
            branches: { id: row.branch_id, name: row.branch_name, address: row.branch_address, branch_code: row.branch_code },
            complaints: row.complaint_id ? { id: row.complaint_id, complaint_number: row.complaint_number } : null,
            staff: row.technician_id ? { id: row.technician_id, full_name: row.technician_name } : null
        };
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/invoices
router.post('/', auth(), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const {
            customer_id, branch_id, complaint_id, technician_id, items,
            subtotal, tax_amount, sales_tax_rate, shipping_handling,
            discount_amount, advance_paid, total_amount, due_date, notes
        } = req.body;

        const n = (val) => parseFloat(val) || 0;
        const currentYear = new Date().getFullYear();
        const [maxNum] = await connection.query("SELECT MAX(CAST(SUBSTRING_INDEX(invoice_number, '-', -1) AS UNSIGNED)) as max_val FROM invoices WHERE invoice_number LIKE ?", [`INV-${currentYear}-%`]);
        const nextNum = (maxNum[0] ? (maxNum[0].max_val || 0) : 0) + 1;
        const invoiceNumber = `INV-${currentYear}-${String(nextNum).padStart(5, '0')}`;
        const invoiceId = require('crypto').randomUUID();
        const verificationId = require('crypto').randomUUID();

        let finalBranchId = branch_id;
        if (req.user.role !== 'developer' && req.user.role !== 'super_admin') {
            finalBranchId = req.user.branch_id;
        }

        await connection.query(
            `INSERT INTO invoices (
                id, invoice_number, verification_id, complaint_id, customer_id, 
                branch_id, technician_id, subtotal, tax_amount, sales_tax_rate,
                shipping_handling, discount_amount, advance_paid, total_amount, 
                payment_status, due_date, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                invoiceId, invoiceNumber, verificationId, complaint_id || null, customer_id,
                finalBranchId, technician_id || null, n(subtotal), n(tax_amount), n(sales_tax_rate),
                n(shipping_handling), n(discount_amount), n(advance_paid), n(total_amount),
                'unpaid', due_date || null, notes || null
            ]
        );

        for (const item of (items || [])) {
            const itemId = require('crypto').randomUUID();
            const qty = parseFloat(item.qty || item.quantity) || 0;
            const up = parseFloat(item.unitPrice || item.unit_price) || 0;
            const tp = qty * up;

            await connection.query(
                'INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total_price, amount) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [itemId, invoiceId, item.description, qty, up, tp, tp]
            );
        }

        // Update complaint status if linked
        if (complaint_id) {
            await connection.query('UPDATE complaints SET status = "invoice_generated" WHERE id = ?', [complaint_id]);
        }
        await connection.commit();

        // Send automatic Invoice Email (non-blocking)
        try {
            const [custRows] = await pool.query('SELECT name, email, phone FROM customers WHERE id = ?', [customer_id]);
            const [brRows] = await pool.query('SELECT name, address, branch_code FROM branches WHERE id = ?', [finalBranchId]);
            if (custRows.length > 0 && custRows[0].email) {
                emailService.sendInvoiceEmail(
                    { id: invoiceId, invoice_number: invoiceNumber, verification_id: verificationId, total_amount, subtotal, tax_amount, discount_amount, payment_status: 'unpaid', due_date, notes },
                    custRows[0],
                    items || [],
                    brRows[0] || null
                ).catch(e => console.error('[Invoices] Automatic invoice email error:', e.message));
            }
        } catch (e) {
            console.error('[Invoices] Error preparing automatic invoice email:', e.message);
        }

        res.status(201).json({ id: invoiceId, invoice_number: invoiceNumber });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: err.message || 'Server error' });
    } finally {
        connection.release();
    }
});

// @route   POST /api/invoices/:id/send_email
// @desc    Send / resend invoice email to customer
router.post('/:id/send_email', auth(), async (req, res) => {
    try {
        const { id } = req.params;
        const [invRows] = await pool.query(`
            SELECT i.*, 
                   c.name as customer_name, c.email as customer_email, c.phone as customer_phone, c.address as customer_address,
                   b.name as branch_name, b.address as branch_address, b.branch_code
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            JOIN branches b ON i.branch_id = b.id
            WHERE i.id = ?
        `, [id]);

        if (invRows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const inv = invRows[0];
        if (!inv.customer_email) {
            return res.status(400).json({ error: 'Customer does not have an email address on file.' });
        }

        const [items] = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);

        const result = await emailService.sendInvoiceEmail(
            inv,
            { name: inv.customer_name, email: inv.customer_email, phone: inv.customer_phone },
            items,
            { name: inv.branch_name, address: inv.branch_address, branch_code: inv.branch_code }
        );

        if (result && result.success === false) {
            return res.status(500).json({ error: result.error || 'Failed to send invoice email' });
        }

        res.json({ success: true, message: `Invoice emailed to ${inv.customer_email}` });
    } catch (err) {
        console.error('[Invoice Email Error]:', err);
        res.status(500).json({ error: err.message || 'Server error' });
    }
});

// @route   PUT /api/invoices/:id/items
// @desc    Replace all line items for an existing invoice
router.put('/:id/items', auth(), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { items, subtotal, tax_amount, sales_tax_rate, shipping_handling, discount_amount, advance_paid, total_amount } = req.body;

        // Check invoice exists
        const [inv] = await connection.query('SELECT id, branch_id FROM invoices WHERE id = ?', [id]);
        if (inv.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Delete existing items
        await connection.query('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);

        // Insert new items
        const n = (v) => parseFloat(v) || 0;
        for (const item of (items || [])) {
            const itemId = require('crypto').randomUUID();
            const qty = n(item.qty || item.quantity);
            const up = n(item.unitPrice || item.unit_price);
            const tp = qty * up;
            await connection.query(
                'INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total_price, amount) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [itemId, id, item.description, qty, up, tp, tp]
            );
        }

        // Update invoice totals
        await connection.query(
            'UPDATE invoices SET subtotal=?, tax_amount=?, sales_tax_rate=?, shipping_handling=?, discount_amount=?, advance_paid=?, total_amount=? WHERE id=?',
            [n(subtotal), n(tax_amount), n(sales_tax_rate), n(shipping_handling), n(discount_amount), n(advance_paid), n(total_amount), id]
        );

        await connection.commit();
        res.json({ message: 'Invoice items updated successfully' });
    } catch (err) {
        await connection.rollback();
        console.error('[Invoice Items PUT Error]:', err);
        res.status(500).json({ error: err.message || 'Server error' });
    } finally {
        connection.release();
    }
});

// @route   PATCH /api/invoices/:id
router.patch('/:id', auth(), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No update data provided' });
        }

        // RBAC & Status Lock
        const [current] = await pool.query('SELECT branch_id, payment_status FROM invoices WHERE id = ?', [id]);
        if (current.length === 0) return res.status(404).json({ error: 'Invoice not found' });

        if (req.user.role !== 'developer' && req.user.role !== 'super_admin') {
            // Branch isolation
            if (current[0].branch_id !== req.user.branch_id) {
                return res.status(403).json({ error: 'Forbidden: You can only update invoices from your own branch.' });
            }
            // Lock: paid invoices cannot be modified by branch admins
            if (current[0].payment_status === 'paid') {
                return res.status(403).json({ error: 'This invoice is locked: paid invoices cannot be modified.' });
            }
        }

        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), id];
        await pool.query(`UPDATE invoices SET ${fields} WHERE id = ?`, values);
        res.json({ message: 'Invoice updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE /api/invoices/:id
router.delete('/:id', auth(), async (req, res) => {
    try {
        const { id } = req.params;
        
        // RBAC & Locks
        const [current] = await pool.query('SELECT branch_id, payment_status, created_at FROM invoices WHERE id = ?', [id]);
        if (current.length === 0) return res.status(404).json({ error: 'Invoice not found' });

        if (req.user.role !== 'developer' && req.user.role !== 'super_admin') {
            if (current[0].branch_id !== req.user.branch_id) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            if (current[0].payment_status === 'paid') {
                return res.status(403).json({ error: 'Deletion locked: Paid invoices cannot be deleted.' });
            }
        }

        await pool.query('DELETE FROM invoices WHERE id = ?', [id]);
        res.json({ message: 'Invoice deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
