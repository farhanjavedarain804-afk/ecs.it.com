const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET /api/inventory_items
router.get('/', auth(), async (req, res) => {
    try {
        const { branch_id, item_type } = req.query;
        let query = `
            SELECT ii.*, b.name as branch_name 
            FROM inventory_items ii
            LEFT JOIN branches b ON ii.branch_id = b.id
            WHERE ii.is_active = true
        `;
        let params = [];

        // RBAC: Filter by branch for non-admins
        if (req.user.role !== 'developer' && req.user.role !== 'super_admin') {
            if (req.user.branch_id) {
                query += ' AND (ii.branch_id = ? OR ii.branch_id IS NULL)';
                params.push(req.user.branch_id);
            }
        } else if (branch_id) {
            query += ' AND ii.branch_id = ?';
            params.push(branch_id);
        }

        if (item_type) {
            query += ' AND ii.item_type = ?';
            params.push(item_type);
        }

        const { or } = req.query;
        if (or) {
            const parts = or.split(',');
            const orConditions = [];
            parts.forEach(part => {
                const [col, op, val] = part.split('.');
                const cleanVal = val ? val.replace(/%/g, '') : '';
                if (op === 'ilike' || op === 'like') {
                    orConditions.push(`ii.${col} LIKE ?`);
                    params.push(`%${cleanVal}%`);
                } else if (op === 'eq') {
                    orConditions.push(`ii.${col} = ?`);
                    params.push(cleanVal);
                }
            });
            if (orConditions.length > 0) {
                query += ` AND (${orConditions.join(' OR ')})`;
            }
        }

        query += ' ORDER BY ii.name ASC';
        const [results] = await pool.query(query, params);
        const formatted = results.map(r => ({
            ...r,
            branches: { name: r.branch_name }
        }));
        res.json(formatted);
    } catch (err) {
        console.error('Error fetching inventory_items:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/inventory_items
router.post('/', auth(['super_admin', 'developer', 'store_manager']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { name, sku, category, unit, quantity, min_stock_level, unit_price, branch_id, description, item_type } = req.body;
        const crypto = require('crypto');
        const qtyToSubtract = parseFloat(quantity) || 0;

        if (branch_id === 'all') {
            const [branches] = await connection.query('SELECT id FROM branches WHERE is_active = true');
            if (branches.length === 0) {
                await connection.rollback();
                return res.status(400).json({ error: 'No active branches found' });
            }

            const values = [];
            branches.forEach(b => {
                values.push([
                    crypto.randomUUID(),
                    name,
                    sku ? `${sku}-${b.id.substring(0, 4)}` : null,
                    category,
                    unit,
                    quantity,
                    min_stock_level,
                    unit_price,
                    b.id,
                    description,
                    item_type || 'inventory'
                ]);
            });

            await connection.query(
                `INSERT INTO inventory_items (id, name, sku, category, unit, quantity, min_stock_level, unit_price, branch_id, description, item_type) 
                 VALUES ?`,
                [values]
            );

            // Subtract from Warehouse for each branch created if SKU matches
            if (sku && qtyToSubtract > 0) {
                const totalToSubtract = qtyToSubtract * branches.length;
                await connection.query(
                    'UPDATE products SET quantity = quantity - ? WHERE product_id = ?',
                    [totalToSubtract, sku]
                );
            }

            await connection.commit();
            return res.status(201).json({ message: `Item created for ${branches.length} branches` });
        }

        const id = crypto.randomUUID();
        await connection.query(
            'INSERT INTO inventory_items (id, name, sku, category, unit, quantity, min_stock_level, unit_price, branch_id, description, item_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, sku, category, unit, quantity, min_stock_level, unit_price, branch_id || null, description, item_type || 'inventory']
        );

        // Subtract from Warehouse if item assigned to specific branch
        if (sku && branch_id && qtyToSubtract > 0) {
            await connection.query(
                'UPDATE products SET quantity = quantity - ? WHERE product_id = ?',
                [qtyToSubtract, sku]
            );
        }

        await connection.commit();
        res.status(201).json({ id });
    } catch (err) {
        await connection.rollback();
        console.error('Inventory Item POST Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    } finally {
        connection.release();
    }
});

// @route   PATCH /api/inventory_items/:id
router.patch('/:id', auth(['super_admin', 'developer', 'store_manager']), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), id];
        await pool.query(`UPDATE inventory_items SET ${fields} WHERE id = ?`, values);
        res.json({ message: 'Item updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE /api/inventory_items/:id
router.delete('/:id', auth(['super_admin', 'developer', 'store_manager']), async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM inventory_items WHERE id = ?', [id]);
        res.json({ message: 'Item deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
