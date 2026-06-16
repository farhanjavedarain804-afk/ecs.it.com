const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET /api/services
router.get('/', auth(), async (req, res) => {
    try {
        const [results] = await pool.query('SELECT * FROM services ORDER BY created_at DESC');
        res.json(results);
    } catch (err) {
        console.error('Error fetching services:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/services
router.post('/', auth(['super_admin']), async (req, res) => {
    try {
        let { service_id, name, description, rate, category } = req.body;
        const id = require('crypto').randomUUID();

        // Auto-generate service_id if missing (Format: SRV-00001)
        if (!service_id) {
            const [maxId] = await pool.query("SELECT MAX(CAST(SUBSTRING_INDEX(service_id, '-', -1) AS UNSIGNED)) as max_val FROM services WHERE service_id LIKE 'SRV-%'");
            const nextNum = (maxId[0].max_val || 0) + 1;
            service_id = `SRV-${String(nextNum).padStart(5, '0')}`;
        }

        await pool.query(
            'INSERT INTO services (id, service_id, name, description, rate, category) VALUES (?, ?, ?, ?, ?, ?)',
            [id, service_id, name, description, rate || 0, category]
        );
        res.status(201).json({ id, service_id });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Service ID already exists' });
        }
        console.error('Error adding service:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PATCH /api/services/:id
router.patch('/:id', auth(['super_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), id];
        await pool.query(`UPDATE services SET ${fields} WHERE id = ?`, values);
        res.json({ message: 'Service updated' });
    } catch (err) {
        console.error('Error updating service:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE /api/services/:id
router.delete('/:id', auth(['super_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM services WHERE id = ?', [id]);
        res.json({ message: 'Service deleted' });
    } catch (err) {
        console.error('Error deleting service:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
