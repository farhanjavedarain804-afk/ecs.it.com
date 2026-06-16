const path = require('path');
const fs = require('fs');

// Load backend .env before anything else
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const express = require('express');

// Import the backend Express app (has all /api/* routes, CORS, middleware, etc.)
const backendApp = require('./backend/index.js');

// Serve Frontend (built Vite files from dist/)
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    // Serve static assets (JS, CSS, images) from dist/
    backendApp.use(express.static(distPath));
    console.log(`[Static] Serving frontend from: ${distPath}`);

    // SPA Fallback - For any non-API route, serve index.html
    // This must come AFTER all API routes (which are already in backend/index.js)
    // The backend's 404 handler already handles this, but this is a safety net
}

// Start the server
const PORT = process.env.PORT || 3000;
backendApp.listen(PORT, () => {
    console.log(`✅ ECS Server running on port ${PORT}`);
    console.log(`   Frontend: http://localhost:${PORT}`);
    console.log(`   API:      http://localhost:${PORT}/api/test`);
    console.log(`   Health:   http://localhost:${PORT}/health`);
});
