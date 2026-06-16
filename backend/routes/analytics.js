const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// Helper: Run a query safely, return empty array on error
const safeQuery = async (sql, params = [], queryErrors = []) => {
    try {
        const [rows] = await pool.query(sql, params);
        return rows;
    } catch (err) {
        console.error('[Analytics SafeQuery Error]', err.message, '| SQL:', sql.substring(0, 100));
        queryErrors.push({ error: err.message, sql: sql.substring(0, 100) });
        return [];
    }
};

// @route   GET /api/analytics
// @desc    Get real-time statistics for dashboard & reports
router.get('/', auth(), async (req, res) => {
    try {
        const { branch_id } = req.query;

        let branchFilter = '';
        let cBranchFilter = ''; // for complaints alias
        let iBranchFilter = ''; // for invoices alias

        const params = [];
        if (branch_id) {
            branchFilter = ' AND branch_id = ?';
            cBranchFilter = ' AND c.branch_id = ?';
            iBranchFilter = ' AND i.branch_id = ?';
            params.push(branch_id);
        }

        const queryErrors = [];

        // Parallel stats queries - each wrapped in safeQuery for resilience
        const [
            complaintsAll,
            invoicesAll,
            finEntries,
            staffAll,
            customerCountRows,
            branchCountRows,
            inventoryCountRows,
            lowStockCountRows,
            servicesCountRows,
            recentComplaintsRaw,
            recentInvoicesRaw,
            monthlyRaw,
            reviewsAll,
        ] = await Promise.all([
            safeQuery(`SELECT id, status, created_at, complaint_number, priority, complaint_type, branch_id FROM complaints WHERE 1=1${branchFilter}`, params, queryErrors),
            safeQuery(`SELECT id, total_amount, payment_status, invoice_number, created_at, branch_id, customer_id FROM invoices WHERE 1=1${branchFilter}`, params, queryErrors),
            safeQuery(`SELECT amount, entry_type, branch_id FROM financial_entries WHERE 1=1${branchFilter}`, params, queryErrors),
            safeQuery(`SELECT id, COALESCE(salary, 0) as salary FROM staff WHERE 1=1${branchFilter}`, params, queryErrors),
            safeQuery(`SELECT COUNT(*) as count FROM customers WHERE 1=1${branchFilter}`, params, queryErrors),
            safeQuery('SELECT COUNT(*) as count FROM branches WHERE is_active = 1', [], queryErrors),
            safeQuery(`SELECT COUNT(*) as count FROM inventory_items WHERE 1=1${branchFilter}`, params, queryErrors),
            safeQuery(`SELECT COUNT(*) as count FROM inventory_items WHERE quantity <= min_stock_level AND min_stock_level > 0${branchFilter}`, params, queryErrors),
            safeQuery('SELECT COUNT(*) as count FROM services WHERE is_active = 1', [], queryErrors),
            // Recent complaints (with customer name)
            safeQuery(
                `SELECT c.id, c.status, c.created_at, c.complaint_number, c.priority, c.complaint_type, cust.name as customer_name
                 FROM complaints c
                 LEFT JOIN customers cust ON c.customer_id = cust.id
                 WHERE 1=1${cBranchFilter}
                 ORDER BY c.created_at DESC LIMIT 6`,
                params,
                queryErrors
            ),
            // Recent invoices (with customer name)
            safeQuery(
                `SELECT i.id, i.invoice_number, i.total_amount, i.payment_status, i.created_at, cust.name as customer_name
                 FROM invoices i
                 LEFT JOIN customers cust ON i.customer_id = cust.id
                 WHERE 1=1${iBranchFilter}
                 ORDER BY i.created_at DESC LIMIT 5`,
                params,
                queryErrors
            ),
            // Monthly complaint data for current year
            safeQuery(
                `SELECT MONTH(created_at) as month, COUNT(*) as total,
                 SUM(CASE WHEN status IN ('completed','closed','solved','invoice_generated') THEN 1 ELSE 0 END) as resolved
                 FROM complaints
                 WHERE YEAR(created_at) = YEAR(CURDATE())${branchFilter}
                 GROUP BY MONTH(created_at)`,
                params,
                queryErrors
            ),
            // Reviews data
            safeQuery(`SELECT q1_rating, q2_rating, q3_rating, q4_rating, q5_rating, refused_ratings, branch_id FROM complaint_reviews WHERE 1=1${branchFilter}`, params, queryErrors),
        ]);

        // Complaint breakdown
        const now = new Date();
        let pending = 0, overdue = 0, critical = 0, resolved = 0, dismissed = 0;
        for (const c of complaintsAll) {
            const isResolved = ['completed', 'closed', 'solved', 'invoice_generated'].includes(c.status);
            const isDismissed = c.status === 'dismissed';
            const diffH = (now - new Date(c.created_at)) / (1000 * 3600);
            if (isResolved) resolved++;
            else if (isDismissed) dismissed++;
            else if (diffH > 48) critical++;
            else if (diffH > 24) overdue++;
            else pending++;
        }

        // Financial summary
        const invoiceRevenue = invoicesAll
            .filter(i => i.payment_status === 'paid')
            .reduce((s, i) => s + Number(i.total_amount || 0), 0);
        const unpaidAmount = invoicesAll
            .filter(i => i.payment_status !== 'paid')
            .reduce((s, i) => s + Number(i.total_amount || 0), 0);
        const otherIncome = finEntries
            .filter(e => e.entry_type === 'income' || e.entry_type === 'Credit')
            .reduce((s, e) => s + Number(e.amount || 0), 0);
        const totalExpenses = finEntries
            .filter(e => e.entry_type === 'expense' || e.entry_type === 'Debit')
            .reduce((s, e) => s + Number(e.amount || 0), 0);
        const totalSalaries = staffAll.reduce((s, m) => s + (Number(m.salary) || 0), 0);
        const totalRevenue = invoiceRevenue + otherIncome;

        // Build monthly chart data (12 months)
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthly = monthNames.map((name, idx) => {
            const row = monthlyRaw.find(r => Number(r.month) === idx + 1);
            return { name, complaints: Number(row?.total || 0), resolved: Number(row?.resolved || 0) };
        });

        // Branch performance (global only)
        let branchStats = [];
        if (!branch_id) {
            const [branches] = await pool.query('SELECT id, name FROM branches WHERE is_active = 1').catch(() => [[]]);
            if (branches && branches.length > 0) {
                const [invByBranch] = await pool.query('SELECT branch_id, total_amount, payment_status FROM invoices').catch(() => [[]]) ;
                const [finByBranch] = await pool.query('SELECT branch_id, amount, entry_type FROM financial_entries').catch(() => [[]]);
                const [compByBranch] = await pool.query('SELECT branch_id, status FROM complaints').catch(() => [[]]);
                const [revByBranch] = await pool.query('SELECT branch_id, q1_rating, q2_rating, q3_rating, q4_rating, q5_rating, refused_ratings FROM complaint_reviews').catch(() => [[]]);

                branchStats = branches.map(b => {
                    const bInv = (invByBranch || []).filter(i => i.branch_id === b.id);
                    const bFin = (finByBranch || []).filter(f => f.branch_id === b.id);
                    const bComp = (compByBranch || []).filter(c => c.branch_id === b.id);
                    const bRev = (revByBranch || []).filter(r => r.branch_id === b.id);

                    const rev = bInv.filter(i => i.payment_status === 'paid').reduce((s, i) => s + Number(i.total_amount || 0), 0)
                              + bFin.filter(f => f.entry_type === 'income' || f.entry_type === 'Credit').reduce((s, e) => s + Number(e.amount || 0), 0);
                    const exp = bFin.filter(f => f.entry_type === 'expense' || f.entry_type === 'Debit').reduce((s, e) => s + Number(e.amount || 0), 0);
                    const resCount = bComp.filter(c => ['completed', 'closed', 'solved'].includes(c.status)).length;
                    
                    const validReviews = bRev.filter(r => !r.refused_ratings);
                    let avgRating = 0;
                    if (validReviews.length > 0) {
                        const totalRatingSum = validReviews.reduce((sum, r) => {
                            const qAvg = (Math.max(0, r.q1_rating) + Math.max(0, r.q2_rating) + Math.max(0, r.q3_rating) + Math.max(0, r.q4_rating) + Math.max(0, r.q5_rating)) / 5;
                            return sum + qAvg;
                        }, 0);
                        avgRating = totalRatingSum / validReviews.length;
                    }

                    return {
                        id: b.id, name: b.name, revenue: rev, expenses: exp, profit: rev - exp,
                        complaintsCount: bComp.length, resolvedCount: resCount,
                        resolutionRatio: bComp.length > 0 ? (resCount / bComp.length) * 100 : 0,
                        avgRating: parseFloat(avgRating.toFixed(2)),
                        reviewCount: bRev.length
                    };
                });
            }
        }

        // Format recent invoices with customer name
        const recentInvoices = recentInvoicesRaw.map(i => ({
            ...i,
            customers: { name: i.customer_name }
        }));

        const totalCustomers = customerCountRows.length > 0 ? Number(customerCountRows[0].count) : 0;
        const totalBranches = branchCountRows.length > 0 ? Number(branchCountRows[0].count) : 0;
        const totalInventory = inventoryCountRows.length > 0 ? Number(inventoryCountRows[0].count) : 0;
        const lowStockItems = lowStockCountRows.length > 0 ? Number(lowStockCountRows[0].count) : 0;
        const totalServices = servicesCountRows.length > 0 ? Number(servicesCountRows[0].count) : 0;

        res.json({
            // Dashboard flat keys
            total_complaints: complaintsAll.length,
            total_customers: totalCustomers,
            total_branches: totalBranches,
            total_invoices: invoicesAll.length,
            pending_complaints: pending,
            overdue_complaints: overdue,
            critical_complaints: critical,
            resolved_complaints: resolved,
            dismissed_complaints: dismissed,
            total_revenue: totalRevenue,
            unpaid_amount: unpaidAmount,
            total_inventory: totalInventory,
            low_stock_items: lowStockItems,
            total_staff: staffAll.length,
            total_services: totalServices,
            other_income: otherIncome,
            total_expenses: totalExpenses,
            total_salaries: totalSalaries,
            recent_complaints: recentComplaintsRaw,
            recent_invoices: recentInvoices,
            monthly_data: monthly,
            // Legacy structure for Reports.tsx
            complaints: {
                total: complaintsAll.length,
                solved: resolved,
                unsolved: complaintsAll.length - resolved,
                ratio: complaintsAll.length > 0 ? (resolved / complaintsAll.length) * 100 : 0
            },
            financials: {
                totalRevenue, totalExpenses: totalExpenses + totalSalaries,
                netProfit: totalRevenue - totalExpenses - totalSalaries,
                collectedInv: invoiceRevenue, outstandingInv: unpaidAmount,
                otherIncome, otherExpenses: totalExpenses, salaries: totalSalaries
            },
            satisfaction: {
                avg: reviewsAll.length > 0 ? (reviewsAll.filter(r => !r.refused_ratings).reduce((s, r) => {
                    const qAvg = (Math.max(0, r.q1_rating) + Math.max(0, r.q2_rating) + Math.max(0, r.q3_rating) + Math.max(0, r.q4_rating) + Math.max(0, r.q5_rating)) / 5;
                    return s + qAvg;
                }, 0) / (reviewsAll.filter(r => !r.refused_ratings).length || 1)).toFixed(2) : 0,
                total: reviewsAll.length,
                refused: reviewsAll.filter(r => !!r.refused_ratings).length
            },
            branches: branchStats,
            counts: {
                customers: totalCustomers,
                branches: totalBranches,
                inventoryItems: totalInventory,
                lowStockItems: lowStockItems
            },
            debug: {
                branch_id,
                roles: req.user.roles,
                query_errors: queryErrors
            }
        });

    } catch (err) {
        console.error('Analytics Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

module.exports = router;
