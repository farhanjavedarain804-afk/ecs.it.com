const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const crypto = require('crypto');

// Helper: Get current Pakistan time as YYYY-MM-DD
const getPKTDate = () => {
    const now = new Date();
    const pkt = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
    const pad = (n) => String(n).padStart(2, '0');
    return `${pkt.getFullYear()}-${pad(pkt.getMonth()+1)}-${pad(pkt.getDate())}`;
};

// Helper: Get current Pakistan time as YYYY-MM-DD HH:MM:SS (for MySQL DATETIME)
const getPKTDateTime = () => {
    const now = new Date();
    const pkt = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
    const pad = (n) => String(n).padStart(2, '0');
    return `${pkt.getFullYear()}-${pad(pkt.getMonth()+1)}-${pad(pkt.getDate())} ${pad(pkt.getHours())}:${pad(pkt.getMinutes())}:${pad(pkt.getSeconds())}`;
};

// @route   GET /api/attendance
router.get('/', auth(), async (req, res) => {
    try {
        const { branch_id, staff_id, date, month, year, all_records } = req.query;
        let query = `
            SELECT 
                a.id, a.staff_id, a.branch_id, a.status, a.notes,
                DATE_FORMAT(a.attendance_date, '%Y-%m-%d') as attendance_date,
                DATE_FORMAT(a.check_in, '%Y-%m-%dT%H:%i:%s') as check_in,
                DATE_FORMAT(a.check_out, '%Y-%m-%dT%H:%i:%s') as check_out,
                s.full_name as staff_full_name,
                s.branch_id as staff_branch_id,
                b.name as branch_name
            FROM attendance a 
            LEFT JOIN staff s ON a.staff_id = s.id 
            LEFT JOIN branches b ON a.branch_id = b.id
            WHERE 1=1
        `;
        let params = [];

        // Branch isolation logic
        if (branch_id) {
            query += ' AND a.branch_id = ?';
            params.push(branch_id);
        } else if (req.user.role !== 'developer' && req.user.role !== 'super_admin' && req.user.branch_id) {
            query += ' AND a.branch_id = ?';
            params.push(req.user.branch_id);
        }
        
        if (staff_id) {
            query += ' AND a.staff_id = ?';
            params.push(staff_id);
        }
        if (date) {
            query += ' AND a.attendance_date = ?';
            params.push(date);
        }
        if (all_records === 'true') {
            // No date filter, fetch all
        } else if (month && year) {
            query += ' AND MONTH(a.attendance_date) = ? AND YEAR(a.attendance_date) = ?';
            params.push(month, year);
        } else if (!date) {
            query += " AND a.attendance_date >= DATE_FORMAT(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), '%Y-%m-01')";
        }

        query += ' ORDER BY a.check_in DESC';
        const [results] = await pool.query(query, params);

        res.json(results);
    } catch (err) {
        console.error('Attendance GET Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/attendance/summary
router.get('/summary', auth(), async (req, res) => {
    try {
        const { month, year, branch_id } = req.query;
        const finalBranchId = branch_id || (req.user.role !== 'developer' && req.user.role !== 'super_admin' ? req.user.branch_id : null);
        
        const [staffMembers] = await pool.query(
            'SELECT id, full_name, branch_id FROM staff WHERE status = "active" ' + 
            (finalBranchId ? 'AND branch_id = ?' : ''), 
            finalBranchId ? [finalBranchId] : []
        );

        const summaries = await Promise.all(staffMembers.map(async (s) => {
            const [attendance] = await pool.query(
                `SELECT 
                    id, 
                    DATE_FORMAT(attendance_date, '%Y-%m-%d') as attendance_date,
                    DATE_FORMAT(check_in, '%Y-%m-%dT%H:%i:%s') as check_in,
                    DATE_FORMAT(check_out, '%Y-%m-%dT%H:%i:%s') as check_out
                FROM attendance 
                WHERE staff_id = ? AND MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?`,
                [s.id, month, year]
            );

            // Calculate presents (unique dates with attendance)
            const presents = new Set(attendance.map(a => a.attendance_date)).size;
            
            // Total Working Time
            let totalMinutes = 0;
            attendance.forEach(a => {
                if (a.check_in && a.check_out) {
                    totalMinutes += Math.floor((new Date(a.check_out) - new Date(a.check_in)) / 60000);
                }
            });

            // Total working days in month (Mon-Sat = 26 approx)
            const daysInMonth = new Date(year, month, 0).getDate();
            const absents = Math.max(0, daysInMonth - presents);

            return {
                ...s,
                presents,
                absents,
                totalMinutes,
                history: attendance // Include history for the "View" button
            };
        }));

        res.json(summaries);
    } catch (err) {
        console.error('Summary Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/attendance/check-in
router.post('/check-in', auth(['branch_admin']), async (req, res) => {
    try {
        const { staff_id, branch_id, custom_datetime } = req.body;
        
        let pktNow = getPKTDateTime();
        let pktDate = getPKTDate();

        // If custom datetime is provided (Admin/Developer only)
        if (custom_datetime) {
            const d = new Date(custom_datetime);
            if (!isNaN(d.getTime())) {
                const pad = (n) => String(n).padStart(2, '0');
                pktNow = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
                pktDate = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
            }
        }

        console.log(`[CHECK-IN] staff=${staff_id} pktDate=${pktDate} pktNow=${pktNow}`);

        // One record per day check
        const [existing] = await pool.query(
            'SELECT id FROM attendance WHERE staff_id = ? AND attendance_date = ?',
            [staff_id, pktDate]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Attendance already marked for today' });
        }

        const id = crypto.randomUUID();
        await pool.query(
            'INSERT INTO attendance (id, staff_id, branch_id, attendance_date, check_in, status) VALUES (?, ?, ?, ?, ?, "present")',
            [id, staff_id, branch_id, pktDate, pktNow]
        );

        res.status(201).json({ 
            message: 'Checked in successfully', 
            id,
            attendance_date: pktDate,
            check_in: pktNow
        });
    } catch (err) {
        console.error('Check-in Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/attendance/check-out
router.post('/check-out', auth(['branch_admin']), async (req, res) => {
    try {
        const { staff_id, custom_checkout_time } = req.body;
        const pktDate = getPKTDate();
        let pktNow = getPKTDateTime();

        if (custom_checkout_time && req.user.role === 'developer') {
            const d = new Date(custom_checkout_time);
            if (!isNaN(d.getTime())) {
                const pad = (n) => String(n).padStart(2, '0');
                pktNow = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            }
        }

        console.log(`[CHECK-OUT] staff=${staff_id} pktDate=${pktDate} pktNow=${pktNow}`);

        const [existing] = await pool.query(
            "SELECT id, DATE_FORMAT(attendance_date, '%Y-%m-%d') as attendance_date FROM attendance WHERE staff_id = ? AND check_out IS NULL ORDER BY check_in DESC LIMIT 1",
            [staff_id]
        );

        if (existing.length === 0) {
            return res.status(400).json({ error: 'No active session found to check out' });
        }

        // Session overlap/expiry security: Standard admins can only check out sessions from TODAY
        if (existing[0].attendance_date !== pktDate && req.user.role !== 'developer') {
            return res.status(403).json({ error: 'Session expired. Only Developers can close previous-day sessions.' });
        }

        await pool.query(
            'UPDATE attendance SET check_out = ? WHERE id = ?',
            [pktNow, existing[0].id]
        );

        res.json({ 
            message: 'Checked out successfully',
            check_out: pktNow
        });
    } catch (err) {
        console.error('Check-out Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE /api/attendance/:id
router.delete('/:id', auth(['developer']), async (req, res) => {
    try {
        await pool.query('DELETE FROM attendance WHERE id = ?', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
