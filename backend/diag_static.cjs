const http = require('http');
const fs = require('fs');
const path = require('path');

// When running from backend/, uploads is just ./uploads
const testFile = 'diag_test_final.txt';
const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
    console.log('Upload dir not found at:', uploadDir);
    process.exit(1);
}

fs.writeFileSync(path.join(uploadDir, testFile), 'Static File System Working');

console.log('Test file created. Attempting to fetch via http://localhost:5000/uploads/' + testFile);

const req = http.get('http://localhost:5000/uploads/' + testFile, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('Response Status:', res.statusCode);
        console.log('Response Body:', data);
        if (data === 'Static File System Working') {
            console.log('✅ Static Serving is working correctly.');
        } else {
            console.log('❌ Static Serving failed or returned wrong content.');
        }
        process.exit(0);
    });
});

req.on('error', (err) => {
    console.error('Connection error:', err.message);
    process.exit(1);
});
