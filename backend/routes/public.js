const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Privacy Masking Helpers for Public Verification
const maskCNIC = (val) => {
    if (!val) return null;
    const clean = String(val).trim();
    const parts = clean.split('-');
    if (parts.length === 3 && parts[1].length >= 7) {
        // e.g. 32203-99*****-9
        return `${parts[0]}-${parts[1].slice(0, 2)}*****-${parts[2]}`;
    }
    if (clean.length >= 13) {
        return `${clean.slice(0, 5)}-${clean.slice(5, 7)}*****-${clean.slice(-1)}`;
    }
    if (clean.length > 6) {
        return clean.slice(0, 4) + '*****' + clean.slice(-2);
    }
    return clean;
};

const maskPhone = (val) => {
    if (!val) return null;
    const s = String(val).trim();
    if (s.length <= 6) return s;
    const prefixLen = s.startsWith('+') ? 6 : 4;
    const suffixLen = 3;
    const maskedLen = Math.max(4, s.length - prefixLen - suffixLen);
    return `${s.slice(0, prefixLen)} ${'*'.repeat(maskedLen)} ${s.slice(-suffixLen)}`;
};

const maskEmail = (val) => {
    if (!val) return null;
    const s = String(val).trim();
    const [name, domain] = s.split('@');
    if (!domain) return s.slice(0, 2) + '****' + s.slice(-2);
    const visible = name.slice(0, Math.min(2, name.length));
    return `${visible}****@${domain}`;
};

const maskAddress = (val) => {
    if (!val) return null;
    const s = String(val).trim();
    if (s.length <= 8) return s;
    const parts = s.split(',').map(p => p.trim());
    if (parts.length >= 2) {
        return `${parts[0]}, ********, ${parts[parts.length - 1]}`;
    }
    const half = Math.floor(s.length / 2);
    return `${s.slice(0, Math.min(half, 15))} ******** ${s.slice(-6)}`;
};

const maskSalary = (val) => {
    if (!val && val !== 0) return null;
    const num = Math.round(Number(val)) || 0;
    const numStr = String(num);
    if (numStr.length <= 3) return 'Rs. ***';
    const firstDigit = numStr[0];
    return `Rs. ${firstDigit}*,*** (Protected)`;
};

// @route   GET /api/public/verify/:id
// @desc    Verify any document/entity by ID (Invoice, Thermal Receipt, Complaint, Staff, Branch, Salary Slip, Service Request)
router.get('/verify/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const rawInput = (id || '').trim();
        const input = rawInput.toUpperCase();
        const cleanInput = input.replace(/^#+/, '').trim();
        let seqNum = null;
        if (/^ECS\d{7}$/i.test(cleanInput)) {
            seqNum = parseInt(cleanInput.slice(-3), 10) || null;
        }

        // 1. Check Invoices & Thermal Receipts
        const [invoices] = await pool.query(`
            SELECT i.invoice_number, i.total_amount, i.payment_status, i.issued_at, i.created_at, i.due_date,
                   i.advance_paid, i.subtotal,
                   b.name as branch_name, b.city as branch_city,
                   c.name as customer_name, c.city as customer_city, c.phone as customer_phone, c.address as customer_address,
                   i.verification_id
            FROM invoices i
            LEFT JOIN branches b ON i.branch_id = b.id
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE i.verification_id = ? OR i.invoice_number = ? OR i.id = ? 
               OR i.invoice_number = ? OR UPPER(i.invoice_number) = ? OR UPPER(i.invoice_number) = ?
               OR (i.id = ? AND ? IS NOT NULL)
               OR (i.invoice_number LIKE ? AND ? IS NOT NULL)
        `, [input, input, input, cleanInput, input, cleanInput, seqNum, seqNum, `%${cleanInput.slice(-3)}`, seqNum]);

        if (invoices.length > 0) {
            const row = invoices[0];
            return res.json({
                type: 'invoice',
                verified: true,
                data: {
                    number: row.invoice_number,
                    customer: row.customer_name,
                    phone: maskPhone(row.customer_phone),
                    address: maskAddress(row.customer_address),
                    amount: row.total_amount,
                    status: row.payment_status,
                    due_date: row.due_date,
                    advance_paid: row.advance_paid,
                    branch: row.branch_name,
                    city: row.customer_city || row.branch_city || '',
                    date: row.issued_at || row.created_at
                }
            });
        }

        // 2. Check Complaints
        const [complaints] = await pool.query(`
            SELECT c.complaint_number, c.status, c.created_at, 
                   b.name as branch_name, b.city as branch_city,
                   cust.name as customer_name, cust.city as customer_city, cust.phone as customer_phone, 
                   cust.address as customer_address, cust.email as customer_email,
                   c.description
            FROM complaints c
            LEFT JOIN branches b ON c.branch_id = b.id
            LEFT JOIN customers cust ON c.customer_id = cust.id
            WHERE c.verification_id = ? OR c.complaint_number = ? OR c.id = ? 
               OR c.complaint_number = ? OR UPPER(c.complaint_number) = ? OR UPPER(c.complaint_number) = ?
        `, [input, input, input, cleanInput, input, cleanInput]);

        if (complaints.length > 0) {
            const row = complaints[0];
            return res.json({
                type: 'complaint',
                verified: true,
                data: {
                    number: row.complaint_number,
                    customer: row.customer_name,
                    phone: maskPhone(row.customer_phone),
                    address: maskAddress(row.customer_address),
                    email: maskEmail(row.customer_email),
                    status: row.status,
                    branch: row.branch_name,
                    city: row.customer_city || row.branch_city || '',
                    date: row.created_at,
                    description: row.description
                }
            });
        }

        // 3. Check Staff (Active, Inactive, Terminated)
        const [staff] = await pool.query(`
            SELECT s.employee_id, s.full_name, s.father_name, s.designation, s.status, s.joining_date, 
                   b.name as branch_name, s.cnic, s.contact_1, s.email, s.department, s.current_address, s.address,
                   s.termination_reason, s.terminated_at, s.terminated_by
            FROM staff s
            LEFT JOIN branches b ON s.branch_id = b.id
            WHERE s.employee_id = ? OR s.id = ? OR UPPER(s.employee_id) = ? 
               OR UPPER(s.employee_id) = ? OR s.cnic = ?
        `, [input, input, cleanInput, `ECS-${cleanInput}`, input]);

        if (staff.length > 0) {
            const row = staff[0];
            return res.json({
                type: 'staff',
                verified: true,
                data: {
                    number: row.employee_id,
                    name: row.full_name,
                    father_name: row.father_name,
                    designation: row.designation,
                    department: row.department,
                    status: row.status || 'active',
                    branch: row.branch_name,
                    date: row.joining_date,
                    cnic: maskCNIC(row.cnic),
                    phone: maskPhone(row.contact_1),
                    email: maskEmail(row.email),
                    address: maskAddress(row.current_address || row.address),
                    terminated_at: row.terminated_at,
                    termination_reason: row.status === 'terminated' ? row.termination_reason : undefined,
                    terminated_by: row.status === 'terminated' ? row.terminated_by : undefined
                }
            });
        }

        // 4. Check Branches
        const [branches] = await pool.query(`
            SELECT branch_code, name, address, city, phone, is_active
            FROM branches
            WHERE branch_code = ? OR name = ? OR id = ? OR UPPER(branch_code) = ?
        `, [input, input, input, cleanInput]);

        if (branches.length > 0) {
            return res.json({
                type: 'branch',
                verified: true,
                data: {
                    number: branches[0].branch_code,
                    name: branches[0].name,
                    address: maskAddress(branches[0].address),
                    city: branches[0].city,
                    phone: maskPhone(branches[0].phone),
                    status: branches[0].is_active ? 'active' : 'inactive'
                }
            });
        }

        // 5. Check Salary Slips
        const [slips] = await pool.query(`
            SELECT ss.slip_number, ss.month, ss.year, ss.net_salary, ss.status, ss.paid_at,
                   s.full_name as staff_name, s.employee_id, s.designation, s.cnic, s.contact_1,
                   b.name as branch_name, b.city as branch_city
            FROM salary_slips ss
            JOIN staff s ON ss.staff_id = s.id
            LEFT JOIN branches b ON s.branch_id = b.id
            WHERE ss.verification_id = ? OR ss.slip_number = ? OR ss.id = ? 
               OR UPPER(ss.slip_number) = ? OR UPPER(ss.slip_number) = ?
        `, [input, input, input, cleanInput, `#${cleanInput}`]);

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
                    cnic: maskCNIC(row.cnic),
                    phone: maskPhone(row.contact_1),
                    month: row.month,
                    year: row.year,
                    amount: maskSalary(row.net_salary),
                    status: row.status,
                    branch: row.branch_name,
                    city: row.branch_city || '',
                    paid_at: row.paid_at
                }
            });
        }

        // 6. Check Service Requests
        try {
            const [sr] = await pool.query(
                `SELECT sr.*, b.name as branch_name, b.city as branch_city
                 FROM service_requests sr
                 LEFT JOIN branches b ON sr.branch_id = b.id
                 WHERE UPPER(sr.id) = ? OR sr.id = ? OR UPPER(sr.id) = ?`,
                [input, input, cleanInput]
            );
            if (sr.length > 0) {
                const row = sr[0];
                const compNum = row.converted_complaint_number || null;
                const isConverted = row.status === 'converted_to_complaint' || Boolean(compNum);
                const message = isConverted 
                    ? `Your service request has been successfully registered and converted into an official Complaint. Your Complaint Number is #${compNum || 'Assigned'}. Please track your real-time service status using your Complaint Number.` 
                    : `Your service request has been received and is currently ${row.status || 'pending'}. Our technical support team is processing your request.`;

                return res.json({
                    type: 'service_request',
                    verified: true,
                    data: {
                        number: row.id,
                        customer: row.name,
                        status: row.status || 'pending',
                        branch: row.branch_name || row.city_branch || row.branch || row.city || '',
                        service: row.service_required || row.service || '',
                        phone: maskPhone(row.phone),
                        email: maskEmail(row.email),
                        address: maskAddress(row.address),
                        date: row.created_at,
                        is_converted: isConverted,
                        converted_complaint_number: compNum,
                        converted_complaint_id: row.converted_complaint_id || null,
                        message: message
                    }
                });
            }
        } catch (e) {
            console.error('[Public Verify Service Request Error]:', e.message);
        }

        res.status(404).json({ error: 'No record found with this ID' });
    } catch (err) {
        console.error('Public Verification Error:', err);
        res.status(500).json({ error: 'Server error during verification' });
    }
});

module.exports = router;
