const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const crypto = require('crypto');

// @route   POST /api/service-requests/public
// @desc    Submit a new service request from the public landing page
// @access  Public
router.post('/public', async (req, res) => {
    try {
        const { name, phone, email, service_required, city_branch } = req.body;

        if (!name || !phone || !service_required || !city_branch) {
            return res.status(400).json({ error: 'Please provide all required fields: name, phone, service_required, city_branch' });
        }

        // Validate name and phone lengths
        if (name.trim().length < 2) return res.status(400).json({ error: 'Name must be at least 2 characters' });
        if (phone.trim().length < 7) return res.status(400).json({ error: 'Please enter a valid phone number' });

        const id = crypto.randomUUID();
        
        // Dynamically get columns to avoid ER_BAD_FIELD_ERROR on older DB schemas
        const [columns] = await pool.query("SHOW COLUMNS FROM service_requests");
        const colNames = columns.map(c => c.Field);

        const dbServiceCol = colNames.includes('service_required') ? 'service_required' : (colNames.includes('service') ? 'service' : null);
        const dbBranchCol = colNames.includes('city_branch') ? 'city_branch' : (colNames.includes('branch') ? 'branch' : (colNames.includes('city') ? 'city' : null));
        
        const insertFields = ['id', 'name', 'phone', 'status'];
        const insertValues = [id, name.trim(), phone.trim(), 'pending'];
        
        if (colNames.includes('email')) {
            insertFields.push('email');
            insertValues.push(email?.trim() || null);
        }
        
        if (dbServiceCol) {
            insertFields.push(dbServiceCol);
            insertValues.push(service_required.trim());
        }
        
        if (dbBranchCol) {
            insertFields.push(dbBranchCol);
            insertValues.push(city_branch.trim());
        }

        const placeholders = insertFields.map(() => '?').join(', ');

        await pool.query(`
            INSERT INTO service_requests (${insertFields.join(', ')})
            VALUES (${placeholders})
        `, insertValues);

        res.status(201).json({ success: true, message: 'Service request submitted successfully' });
    } catch (err) {
        console.error('[Service Request Error]:', err);
        // Send the real error message back so the frontend can display it
        const msg = err.code === 'ECONNREFUSED'
            ? 'Database is currently unreachable. Please try again later.'
            : err.code === 'ER_NO_SUCH_TABLE'
            ? 'Service request table not found. Please contact support.'
            : err.sqlMessage || err.message || 'Server error';
        res.status(500).json({ error: msg });
    }
});

// @route   GET /api/service-requests
// @desc    Get all service requests (filtered by branch for branch_admin)
// @access  Private
router.get('/', auth(), async (req, res) => {
    try {
        let query = 'SELECT * FROM service_requests WHERE 1=1';
        let params = [];

        // Determine column for branch filtering
        const [columns] = await pool.query("SHOW COLUMNS FROM service_requests");
        const colNames = columns.map(c => c.Field);
        const dbBranchCol = colNames.includes('city_branch') ? 'city_branch' : (colNames.includes('branch') ? 'branch' : null);

        // If user is branch_admin or restricted, only show their branch
        if (req.user.role !== 'developer' && req.user.role !== 'super_admin' && req.user.branch_id && dbBranchCol) {
            // We need to match the city_branch string to their branch name/city
            // To do this reliably, let's get the branch name from the database first
            const [branch] = await pool.query('SELECT name, city FROM branches WHERE id = ?', [req.user.branch_id]);
            if (branch.length > 0) {
                const bName = branch[0].name;
                const bCity = branch[0].city;
                query += ` AND (${dbBranchCol} = ? OR ${dbBranchCol} = ?)`;
                params.push(bName, bCity);
            }
        }

        query += ' ORDER BY created_at DESC';

        const [requests] = await pool.query(query, params);
        
        // Map old columns to expected new columns for frontend compatibility
        const mappedRequests = requests.map(req => ({
            ...req,
            service_required: req.service_required || req.service,
            city_branch: req.city_branch || req.branch
        }));

        res.json(mappedRequests);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PUT /api/service-requests/:id
// @desc    Update a service request status
// @access  Private
router.put('/:id', auth(), async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        await pool.query(
            'UPDATE service_requests SET status = ? WHERE id = ?',
            [status, req.params.id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE /api/service-requests/:id
// @desc    Delete a service request
// @access  Private (Super Admin)
router.delete('/:id', auth(['super_admin', 'developer']), async (req, res) => {
    try {
        await pool.query('DELETE FROM service_requests WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
