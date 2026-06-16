const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET /api/inventory_logs
router.get('/', auth(), async (req, res) => {
    try {
        const { branch_id, item_type } = req.query;
        let query = `
            SELECT il.*,
                   ii.name as item_name, ii.item_type, ii.sku,
                   s.full_name as staff_name,
                   b.name as branch_name
            FROM inventory_logs il
            LEFT JOIN inventory_items ii ON il.item_id = ii.id
            LEFT JOIN staff s ON il.staff_id = s.id
            LEFT JOIN branches b ON il.branch_id = b.id
            WHERE 1=1
        `;
        let params = [];

        // RBAC: Filter by branch for non-admins
        if (req.user.role !== 'developer' && req.user.role !== 'super_admin') {
            if (req.user.branch_id) {
                query += ' AND il.branch_id = ?';
                params.push(req.user.branch_id);
            }
        } else if (branch_id) {
            query += ' AND il.branch_id = ?';
            params.push(branch_id);
        }

        if (item_type) {
            query += ' AND ii.item_type = ?';
            params.push(item_type);
        }

        query += ' ORDER BY il.date DESC, il.created_at DESC LIMIT 200';

        const [results] = await pool.query(query, params);

        const formatted = results.map(r => ({
            ...r,
            inventory_items: { name: r.item_name, item_type: r.item_type, sku: r.sku },
            staff: { full_name: r.staff_name },
            branches: { name: r.branch_name }
        }));

        res.json(formatted);
    } catch (err) {
        console.error('Error fetching inventory_logs:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/inventory_logs
router.post('/', auth(), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { item_id, branch_id, staff_id, entry_type, qty, date, notes } = req.body;
        const id = require('crypto').randomUUID();

        // RBAC Check: Branch Admin can only log for their own branch
        if (req.user.role !== 'developer' && req.user.role !== 'super_admin' && req.user.role !== 'store_manager') {
            if (branch_id !== req.user.branch_id) {
                await connection.rollback();
                return res.status(403).json({ error: 'Forbidden: You can only log movements for your own branch' });
            }
        }

        // 1. Check item exists and check stock level for 'issued'
        const [items] = await connection.query('SELECT name, quantity, min_stock_level, unit, sku FROM inventory_items WHERE id = ?', [item_id]);
        if (items.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Item not found' });
        }
        const item = items[0];

        if (entry_type === 'issued' && item.quantity < qty) {
            await connection.rollback();
            return res.status(400).json({ error: `Insufficient stock. Available: ${item.quantity} ${item.unit}` });
        }

        // 2. Insert Log
        await connection.query(
            'INSERT INTO inventory_logs (id, item_id, branch_id, staff_id, entry_type, qty, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, item_id, branch_id, staff_id || null, entry_type, qty, date || new Date(), notes]
        );

        // 3. Update stock quantity
        const multiplier = entry_type === 'issued' ? -1 : 1;
        await connection.query(
            'UPDATE inventory_items SET quantity = quantity + ? WHERE id = ?',
            [qty * multiplier, item_id]
        );

        // 4. Subtract from Warehouse if 'received' into a branch
        if (entry_type === 'received' && item.sku) {
            await connection.query(
                'UPDATE products SET quantity = quantity - ? WHERE product_id = ?',
                [qty, item.sku]
            );
        }

        // 5. Trigger Low Stock Notification if applicable
        const newQty = item.quantity + (qty * multiplier);
        if (newQty <= item.min_stock_level && item.min_stock_level > 0 && entry_type === 'issued') {
            const [admins] = await connection.query("SELECT user_id FROM user_roles WHERE role IN ('super_admin', 'developer')");
            const [branch] = await connection.query('SELECT name FROM branches WHERE id = ?', [branch_id]);
            const branchName = branch[0]?.name || 'Unknown Branch';

            const notifications = admins.map(a => [
                require('crypto').randomUUID(),
                a.user_id,
                'Low Stock Alert',
                `Stock for "${item.name}" at "${branchName}" has reached ${newQty} ${item.unit}. Please restock soon.`,
                'warning'
            ]);

            if (notifications.length > 0) {
                await connection.query(
                    'INSERT INTO notifications (id, user_id, title, message, type) VALUES ?',
                    [notifications]
                );
            }
        }

        await connection.commit();
        res.status(201).json({ id });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Inventory Log POST Error:', err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        if (connection) connection.release();
    }
});

// @route   DELETE /api/inventory_logs/:id
router.delete('/:id', auth(['super_admin', 'developer', 'store_manager']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        // 1. Get log details to reverse stock
        const [logs] = await connection.query(`
            SELECT il.item_id, il.qty, il.entry_type, ii.sku 
            FROM inventory_logs il 
            JOIN inventory_items ii ON il.item_id = ii.id 
            WHERE il.id = ?
        `, [id]);

        if (logs.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Log entry not found' });
        }

        const log = logs[0];

        // 2. Reverse stock update for the branch item
        const reverseMultiplier = log.entry_type === 'issued' ? 1 : -1;
        await connection.query(
            'UPDATE inventory_items SET quantity = quantity + ? WHERE id = ?',
            [log.qty * reverseMultiplier, log.item_id]
        );

        // 3. Reverse stock update for the Warehouse (if 'received' log)
        if (log.entry_type === 'received' && log.sku) {
            await connection.query(
                'UPDATE products SET quantity = quantity + ? WHERE product_id = ?',
                [log.qty, log.sku]
            );
        }

        // 4. Delete log
        await connection.query('DELETE FROM inventory_logs WHERE id = ?', [id]);

        await connection.commit();
        res.json({ message: 'Log entry deleted and stock updated' });
    } catch (err) {
        await connection.rollback();
        console.error('Inventory Log DELETE Error:', err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        connection.release();
    }
});

module.exports = router;
