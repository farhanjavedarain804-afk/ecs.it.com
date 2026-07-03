const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET /api/complaints
router.get('/', auth(), async (req, res) => {
    try {
        const { branch_id, search, complaint_number, customer_id, month, year } = req.query;
        let { status } = req.query;
        let statusArray = [];
        if (status) {
            statusArray = Array.isArray(status) ? status : status.split(',');
        }

        let query = `
            SELECT 
                c.*, 
                cust.name as customer_name,
                cust.address as customer_address,
                cust.phone as customer_phone,
                cust.city as customer_city,
                b.name as branch_name,
                b.city as branch_city,
                s1.full_name as technician_name,
                s2.full_name as helper_name
            FROM complaints c 
            LEFT JOIN customers cust ON c.customer_id = cust.id 
            LEFT JOIN branches b ON c.branch_id = b.id
            LEFT JOIN staff s1 ON c.assigned_to = s1.id
            LEFT JOIN staff s2 ON c.assigned_helper = s2.id
            WHERE 1=1`;
        let params = [];

        if (statusArray.length > 0) {
            const placeholders = statusArray.map(() => '?').join(',');
            query += ` AND c.status IN (${placeholders})`;
            params.push(...statusArray);
        }

        if (branch_id) {
            query += ' AND c.branch_id = ?';
            params.push(branch_id);
        } else if (req.user.role !== 'developer' && req.user.role !== 'super_admin' && req.user.branch_id) {
            // Restriction: Branch Admins and others can only see their own branch complaints
            query += ' AND c.branch_id = ?';
            params.push(req.user.branch_id);
        }
        if (customer_id) {
            query += ' AND c.customer_id = ?';
            params.push(customer_id);
        }
        if (complaint_number) {
            query += ' AND c.complaint_number = ?';
            params.push(complaint_number);
        }
        if (search) {
            query += ' AND (c.complaint_number LIKE ? OR cust.name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        if (month && year) {
            query += ' AND MONTH(c.created_at) = ? AND YEAR(c.created_at) = ?';
            params.push(month, year);
        } else {
            // Default to last 2 months (current month and previous month)
            query += " AND c.created_at >= DATE_FORMAT(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), '%Y-%m-01')";
        }

        query += ' ORDER BY c.created_at DESC';

        const [rows] = await pool.query(query, params);
        const results = rows.map(r => {
            let attachments = [];
            try {
                if (typeof r.attachments === 'string') {
                    attachments = JSON.parse(r.attachments);
                } else if (Buffer.isBuffer(r.attachments)) {
                    attachments = JSON.parse(r.attachments.toString());
                } else if (Array.isArray(r.attachments)) {
                    attachments = r.attachments;
                } else if (r.attachments && typeof r.attachments === 'object') {
                    attachments = r.attachments; // Already parsed by mysql2
                }
            } catch (e) {
                console.error('Failed to parse attachments for complaint', r.id, e);
                attachments = [];
            }

            return {
                ...r,
                attachments: Array.isArray(attachments) ? attachments : [],
                customers: { 
                    name: r.customer_name,
                    address: r.customer_address,
                    phone: r.customer_phone,
                    city: r.customer_city || r.branch_city || ''
                },
                branches: { name: r.branch_name, city: r.branch_city },
                staff: r.technician_name ? { full_name: r.technician_name } : null,
                helper: r.helper_name ? { full_name: r.helper_name } : null
            };
        });

        res.json(results);
    } catch (err) {
        console.error('Complaints GET Error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/complaints
router.post('/', auth(), async (req, res) => {
    try {
        const { customer_id, branch_id, complaint_type, priority, description, notes, warranty_type, assigned_to, assigned_helper, attachments } = req.body;

        // Format: ECS-MMYYYY-COM-XXXXX
        const date = new Date();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        const dateStr = `${mm}${yyyy}`;

        // Find the global maximum suffix across all complaints
        const [maxNum] = await pool.query("SELECT MAX(CAST(SUBSTRING_INDEX(complaint_number, '-', -1) AS UNSIGNED)) as max_val FROM complaints");
        const nextNum = (maxNum[0].max_val || 0) + 1;

        // Ensure new numbers start from at least 282 as per user request
        const finalNum = Math.max(nextNum, 282);
        const complaintNumber = `ECS-${dateStr}-COM-${String(finalNum).padStart(5, '0')}`;

        const id = require('crypto').randomUUID();
        const verificationId = require('crypto').randomBytes(4).toString('hex').toUpperCase();

        let finalAttachments = (attachments && Array.isArray(attachments)) ? JSON.stringify(attachments) : (attachments || '[]');

        await pool.query(
            'INSERT INTO complaints (id, complaint_number, verification_id, customer_id, branch_id, complaint_type, priority, status, description, notes, warranty_type, assigned_to, assigned_helper, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, complaintNumber, verificationId, customer_id, branch_id, complaint_type, priority, 'registered', description, notes, warranty_type || 'non_warranty', assigned_to || null, assigned_helper || null, finalAttachments]
        );
        res.status(201).json({ id, complaint_number: complaintNumber, verification_id: verificationId });
    } catch (err) {
        console.error('Complaint Creation Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PATCH /api/complaints/:id
router.patch('/:id', auth(), async (req, res) => {
    try {
        const { id } = req.params;
        let updates = { ...req.body };

        // Handle JSON fields
        if (updates.attachments) {
            if (Array.isArray(updates.attachments)) {
                updates.attachments = JSON.stringify(updates.attachments);
            } else if (typeof updates.attachments === 'string' && !updates.attachments.startsWith('[')) {
                // If it's a string but doesn't look like JSON, wrap it in an array
                updates.attachments = JSON.stringify([updates.attachments]);
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No update data provided' });
        }

        // RBAC: Check branch access
        const [current] = await pool.query('SELECT status, branch_id FROM complaints WHERE id = ?', [id]);
        if (current.length === 0) return res.status(404).json({ error: 'Complaint not found' });
        
        if (req.user.role !== 'developer' && req.user.role !== 'super_admin') {
            if (current[0].branch_id !== req.user.branch_id) {
                return res.status(403).json({ error: 'Forbidden: You can only edit complaints from your own branch' });
            }
            // Lock logic: Solved complaints cannot be edited by Branch Admin
            if (current[0].status === 'solved') {
                return res.status(403).json({ error: 'This complaint is locked and cannot be edited.' });
            }
        }

        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), id];

        await pool.query(`UPDATE complaints SET ${fields} WHERE id = ?`, values);
        res.json({ message: 'Complaint updated' });
    } catch (err) {
        console.error('Complaint Update Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE /api/complaints/:id
router.delete('/:id', auth(), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        
        // RBAC: Check branch access and status
        const [current] = await connection.query('SELECT branch_id, status FROM complaints WHERE id = ?', [id]);
        if (current.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Complaint not found' });
        }

        if (req.user.role !== 'developer' && req.user.role !== 'super_admin') {
            // Branch admin can only delete from their own branch
            if (current[0].branch_id !== req.user.branch_id) {
                await connection.rollback();
                return res.status(403).json({ error: 'Forbidden: You can only delete complaints from your own branch' });
            }
            // Cannot delete solved complaints
            if (current[0].status === 'solved') {
                await connection.rollback();
                return res.status(403).json({ error: 'This complaint is locked and cannot be deleted.' });
            }
        }

        // Unlink invoices before deletion to avoid constraint errors
        await connection.query('UPDATE invoices SET complaint_id = NULL WHERE complaint_id = ?', [id]);

        // Delete the complaint
        await connection.query('DELETE FROM complaints WHERE id = ?', [id]);
        
        await connection.commit();
        res.json({ message: 'Complaint deleted and linked records unlinked' });
    } catch (err) {
        await connection.rollback();
        console.error('Complaint Deletion Error:', err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;
