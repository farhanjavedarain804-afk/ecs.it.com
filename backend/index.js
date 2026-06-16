const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Global Exception Handlers to prevent crashing on unhandled DB timeouts/errors
process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]:', err.message || err);
    if (err.stack) console.error(err.stack);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Unhandled Rejection]: at', promise, 'reason:', reason);
});

const app = express();

// Middlewares
app.use(cors({
    origin: [
        'https://ecs.it.com',
        'http://localhost:5173', // Vite default
        'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // Cache preflight for 24 hours
}));
app.use(express.json());
app.use(morgan('dev'));

// Properly serve the uploads directory
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));
console.log(`[Static] Serving files from: ${uploadsPath}`);

// Basic Health Checks
app.get('/health', (req, res) => {
    res.json({ status: 'up', version: '1.0.1', timestamp: new Date() });
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'ECS API is fully functional and reachable!', version: '1.0.1', server_time: new Date() });
});

// Request Logger for debugging
const fs = require('fs');
app.use((req, res, next) => {
    const logMsg = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${req.ip}\n`;
    console.log(`>>> ${req.method} ${req.originalUrl}`);
    fs.appendFileSync(path.join(__dirname, 'debug_requests.log'), logMsg);
    next();
});

// Import Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/branches', require('./routes/branches'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/inventory', require('./routes/inventory')); // Legacy or generic
app.use('/api/inventory_items', require('./routes/inventory_items'));
app.use('/api/inventory_logs', require('./routes/inventory_logs'));
app.use('/api/products', require('./routes/products'));
app.use('/api/services', require('./routes/services'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/financials', require('./routes/financials')); // Alias or legacy
app.use('/api/financial_entries', require('./routes/financial_entries'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/activity_logs', require('./routes/activity_logs'));
app.use('/api/user_activity_logs', require('./routes/activity_logs')); // Alias
app.use('/api/profiles', require('./routes/profiles'));
app.use('/api/user_roles', require('./routes/user_roles'));
app.use('/api/company_settings', require('./routes/company_settings'));
app.use('/api/rpc', require('./routes/rpc'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/public', require('./routes/public'));

// Serve Frontend (Production) - Serves built Vite files from ../dist
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    console.log(`[Static] Serving frontend from: ${distPath}`);
}

// 404 Handler - For API routes return JSON, for everything else serve frontend
app.use((req, res) => {
    // If it's an API request, return JSON error
    if (req.originalUrl.startsWith('/api/') || req.originalUrl === '/health') {
        console.log(`[404] ${req.method} ${req.originalUrl}`);
        fs.appendFileSync(path.join(__dirname, 'debug_requests.log'), `[404] ${req.method} ${req.url}\n`);
        return res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
    }
    // For all other routes, serve the frontend (SPA fallback)
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
    }
    res.status(404).json({ error: 'Frontend not built. Run npm run build first.' });
});

// Error Handling Middleware (Returns JSON instead of HTML)
app.use((err, req, res, next) => {
    console.error('[Global Error]:', err.message);
    fs.appendFileSync(path.join(__dirname, 'debug_requests.log'), `[ERROR] ${err.message}\n${err.stack}\n`);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`ECS Backend running on port ${PORT}`);
});
