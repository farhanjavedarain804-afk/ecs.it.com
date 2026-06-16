const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// @route   GET /api/public/verify/:id
// @desc    Verify a document by ID (Invoice, Complaint, Staff, Branch, Salary Slip)
router.get('/verify/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const input = id.trim().toUpperCase();

        // 1. Check Invoices
        const [invoices] = await pool.query(`
            SELECT i.invoice_number, i.total_amount, i.payment_status, i.issued_at, 
                   b.name as branch_name, b.city as branch_city,
                   c.name as customer_name, c.city as customer_city,
                   i.verification_id
            FROM invoices i
            LEFT JOIN branches b ON i.branch_id = b.id
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE i.verification_id = ? OR i.invoice_number = ?
        `, [input, input]);

        if (invoices.length > 0) {
            const row = invoices[0];
            return res.json({
                type: 'invoice',
                verified: true,
                data: {
                    number: row.invoice_number,
                    customer: row.customer_name,
                    amount: row.total_amount,
                    status: row.payment_status,
                    branch: row.branch_name,
                    city: row.customer_city || row.branch_city || '',
                    date: row.issued_at
                }
            });
        }

        // 2. Check Complaints
        const [complaints] = await pool.query(`
            SELECT c.complaint_number, c.status, c.created_at, 
                   b.name as branch_name, b.city as branch_city,
                   cust.name as customer_name, cust.city as customer_city,
                   c.description
            FROM complaints c
            LEFT JOIN branches b ON c.branch_id = b.id
            LEFT JOIN customers cust ON c.customer_id = cust.id
            WHERE c.complaint_number = ?
        `, [input]);

        if (complaints.length > 0) {
            const row = complaints[0];
            return res.json({
                type: 'complaint',
                verified: true,
                data: {
                    number: row.complaint_number,
                    customer: row.customer_name,
                    status: row.status,
                    branch: row.branch_name,
                    city: row.customer_city || row.branch_city || '',
                    date: row.created_at,
                    description: row.description
                }
            });
        }

        // 3. Check Staff
        const [staff] = await pool.query(`
            SELECT s.employee_id, s.full_name, s.designation, s.status, s.joining_date, 
                   b.name as branch_name, s.cnic, s.contact_1
            FROM staff s
            LEFT JOIN branches b ON s.branch_id = b.id
            WHERE s.employee_id = ?
        `, [input]);

        if (staff.length > 0) {
            return res.json({
                type: 'staff',
                verified: true,
                data: {
                    number: staff[0].employee_id,
                    name: staff[0].full_name,
                    designation: staff[0].designation,
                    status: staff[0].status,
                    branch: staff[0].branch_name,
                    date: staff[0].joining_date,
                    cnic: staff[0].cnic ? staff[0].cnic.replace(/^(.{5})(.+)(.{4})$/, "$1*****$3") : null,
                    phone: staff[0].contact_1
                }
            });
        }

        // 4. Check Branches
        const [branches] = await pool.query(`
            SELECT branch_code, name, address, city, phone, is_active
            FROM branches
            WHERE branch_code = ?
        `, [input]);

        if (branches.length > 0) {
            return res.json({
                type: 'branch',
                verified: true,
                data: {
                    number: branches[0].branch_code,
                    name: branches[0].name,
                    address: branches[0].address,
                    city: branches[0].city,
                    phone: branches[0].phone,
                    status: branches[0].is_active ? 'active' : 'inactive'
                }
            });
        }

        // 5. Check Salary Slips
        const [slips] = await pool.query(`
            SELECT ss.slip_number, ss.month, ss.year, ss.net_salary, ss.status, ss.paid_at,
                   s.full_name as staff_name, s.employee_id, s.designation, 
                   b.name as branch_name, b.city as branch_city
            FROM salary_slips ss
            JOIN staff s ON ss.staff_id = s.id
            LEFT JOIN branches b ON s.branch_id = b.id
            WHERE ss.verification_id = ? OR ss.slip_number = ?
        `, [input, input]);

        if (slips.length > 0) {
            const row = slips[0];
            return res.json({
                type: 'salary_slip',
                verified: true,
                data: {
                    number: row.slip_number,
                    staff: row.staff_name,
                    employee_id: row.employee_id,
                    designation: row.designation,
                    month: row.month,
                    year: row.year,
                    amount: row.net_salary,
                    status: row.status,
                    branch: row.branch_name,
                    city: row.branch_city || '',
                    paid_at: row.paid_at
                }
            });
        }

        res.status(404).json({ error: 'No record found with this ID' });
    } catch (err) {
        console.error('Public Verification Error:', err);
        res.status(500).json({ error: 'Server error during verification' });
    }
});

module.exports = router;
