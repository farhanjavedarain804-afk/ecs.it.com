const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET /api/products
router.get('/', auth(), async (req, res) => {
    try {
        const { query, exact } = req.query;
        let sql = 'SELECT * FROM products';
        let params = [];

        if (query) {
            if (exact === 'true') {
                sql += ' WHERE product_id = ? OR name = ?';
                params.push(query, query);
            } else {
                sql += ' WHERE name LIKE ? OR product_id LIKE ?';
                params.push(`%${query}%`, `%${query}%`);
            }
        }

        sql += ' ORDER BY created_at DESC';
        const [results] = await pool.query(sql, params);
        res.json(results);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/products
router.post('/', auth(['super_admin']), async (req, res) => {
    try {
        let { product_id, name, description, rate, category, unit, quantity, min_stock_level } = req.body;

        if (!product_id) {
            return res.status(400).json({ error: 'Product ID is mandatory' });
        }

        const id = require('crypto').randomUUID();
        await pool.query(
            'INSERT INTO products (id, product_id, name, description, rate, category, unit, quantity, min_stock_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, product_id, name, description, rate || 0, category, unit || 'piece', quantity || 0, min_stock_level || 0]
        );
        res.status(201).json({ id, product_id });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Product ID already exists' });
        }
        console.error('Error adding product:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PATCH /api/products/:id
router.patch('/:id', auth(['super_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), id];
        await pool.query(`UPDATE products SET ${fields} WHERE id = ?`, values);
        res.json({ message: 'Product updated' });
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE /api/products/:id
router.delete('/:id', auth(['super_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM products WHERE id = ?', [id]);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
