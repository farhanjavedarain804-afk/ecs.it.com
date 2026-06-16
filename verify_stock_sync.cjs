const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

const API_URL = 'http://localhost:5000';
const TOKEN = process.env.TEST_TOKEN; // Ensure you have a valid token in .env or set it here

async function testStockSync() {
    try {
        console.log("--- Starting Stock Sync Verification ---");

        // 1. Create a test product in catalog
        const productId = "TEST-PROD-" + Date.now();
        const productRes = await axios.post(`${API_URL}/api/products`, {
            product_id: productId,
            name: "Sync Test Product",
            quantity: 100,
            rate: 50,
            unit: "pc"
        }, { headers: { Authorization: `Bearer ${TOKEN}` } });

        const productRowId = productRes.data.id;
        console.log(`[PASS] Created test product ${productId} with quantity 100.`);

        // 2. Assign 20 units to a branch
        const branchRes = await axios.get(`${API_URL}/api/branches`, { headers: { Authorization: `Bearer ${TOKEN}` } });
        const branchId = branchRes.data[0]?.id;

        if (!branchId) throw new Error("No branches found for testing");

        console.log(`Assigning 20 units to branch ${branchId}...`);
        const invRes = await axios.post(`${API_URL}/api/inventory_items`, {
            name: "Sync Test Item",
            sku: productId,
            quantity: 20,
            branch_id: branchId,
            item_type: "inventory"
        }, { headers: { Authorization: `Bearer ${TOKEN}` } });

        const invRowId = invRes.data.id;

        // 3. Verify warehouse stock decreased to 80
        const checkProdRes = await axios.get(`${API_URL}/api/products?query=${productId}&exact=true`, { headers: { Authorization: `Bearer ${TOKEN}` } });
        const currentQty = parseFloat(checkProdRes.data[0].quantity);
        console.log(`Warehouse Stock after assignment: ${currentQty}`);
        if (currentQty === 80) {
            console.log("[PASS] Warehouse stock correctly decreased to 80.");
        } else {
            console.error(`[FAIL] Warehouse stock should be 80, but is ${currentQty}.`);
        }

        // 4. Update branch quantity to 30 (Increase by 10)
        console.log("Updating branch quantity to 30 (+10)...");
        await axios.patch(`${API_URL}/api/inventory_items/${invRowId}`, {
            quantity: 30
        }, { headers: { Authorization: `Bearer ${TOKEN}` } });

        const checkProdRes2 = await axios.get(`${API_URL}/api/products?query=${productId}&exact=true`, { headers: { Authorization: `Bearer ${TOKEN}` } });
        const currentQty2 = parseFloat(checkProdRes2.data[0].quantity);
        console.log(`Warehouse Stock after update: ${currentQty2}`);
        if (currentQty2 === 70) {
            console.log("[PASS] Warehouse stock correctly decreased to 70.");
        } else {
            console.error(`[FAIL] Warehouse stock should be 70, but is ${currentQty2}.`);
        }

        // 5. Delete branch item (Return stock)
        console.log("Deleting branch item (returning stock)...");
        await axios.delete(`${API_URL}/api/inventory_items/${invRowId}`, { headers: { Authorization: `Bearer ${TOKEN}` } });

        const checkProdRes3 = await axios.get(`${API_URL}/api/products?query=${productId}&exact=true`, { headers: { Authorization: `Bearer ${TOKEN}` } });
        const currentQty3 = parseFloat(checkProdRes3.data[0].quantity);
        console.log(`Warehouse Stock after deletion: ${currentQty3}`);
        if (currentQty3 === 100) {
            console.log("[PASS] Warehouse stock correctly returned to 100.");
        } else {
            console.error(`[FAIL] Warehouse stock should be 100, but is ${currentQty3}.`);
        }

        // Cleanup
        await axios.delete(`${API_URL}/api/products/${productRowId}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
        console.log("--- Verification Complete ---");

    } catch (err) {
        console.error("Test Error:", err.response?.data || err.message);
    }
}

testStockSync();
