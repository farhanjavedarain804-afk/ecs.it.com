const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Use the path/filename provided in the body if available, 
        // fall back to a unique name if not.
        const name = req.body.path || req.body.filename || (Date.now() + '-' + file.originalname);
        cb(null, name);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// @route   POST /api/upload
// @desc    Upload a file
router.post('/', auth(), upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Return the filename so the frontend can build the public URL
    res.json({
        message: 'File uploaded successfully',
        filename: req.file.filename,
        path: req.file.path
    });
});

module.exports = router;
