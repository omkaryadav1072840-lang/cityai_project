const fs = require('fs');
const path = require('path');
const jwt = require('../backend/node_modules/jsonwebtoken');

const API_BASE = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'smartcity_super_secret_jwt_key_gorakhpur_2026';

function getAdminToken(hospitalId = 'HOSP-001') {
    return jwt.sign({
        id: 999,
        staff_id: 'STAFF-HOSP-ADMIN',
        name: 'Dr. Alok Verma (Director)',
        role: 'hospital_admin',
        hospital_id: hospitalId,
        hospitalId: hospitalId
    }, JWT_SECRET, { expiresIn: '2h' });
}

function getOtherHospitalAdminToken(hospitalId = 'HOSP-002') {
    return jwt.sign({
        id: 998,
        staff_id: 'STAFF-BRD-ADMIN',
        name: 'Dr. S.K. Srivastava',
        role: 'hospital_admin',
        hospital_id: hospitalId,
        hospitalId: hospitalId
    }, JWT_SECRET, { expiresIn: '2h' });
}

async function runTests() {
    console.log("🧪 Starting Automated Verification of Bed Booking, Billing, and PNG Logo Requirements...\n");
    let passed = 0;
    let failed = 0;

    function assert(cond, msg) {
        if (cond) {
            console.log(`  ✅ PASS: ${msg}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${msg}`);
            failed++;
        }
    }

    // Prepare clean test data in HOSP-001
    const pool = require('../backend/config/db').promise();
    await pool.query("DELETE FROM hospital_billing_payments WHERE patient_id = 'PAT-RAHUL-10231'");
    await pool.query("DELETE FROM hospital_invoices WHERE patient_id = 'PAT-RAHUL-10231'");
    await pool.query(`
        UPDATE hospital_ward_beds 
        SET status = 'Available', patient_id = NULL, patient_name = NULL, notes = 'Sanitized test bed'
        WHERE bed_id = 'BED-ICU-102' AND hospital_id = 'HOSP-001'
    `);

    // =========================================================================
    // 1. BED BOOKING: SUCCESSFUL FIRST BOOKING (NO ALERT, INVOICE GENERATION)
    // =========================================================================
    console.log("--- 1. Testing Bed Booking & Concurrency ---");
    const bookRes1 = await fetch(`${API_BASE}/api/hospitals/HOSP-001/ward-beds/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            bed_id: 'BED-ICU-102',
            patient_id: 'PAT-RAHUL-10231',
            patient_name: 'Rahul',
            patient_mobile: '9876543210',
            notes: 'Cardiac ICU reservation'
        })
    });
    const bookData1 = await bookRes1.json();
    assert(bookRes1.status === 200 && bookData1.success, "First bed booking request succeeded with status 200");
    assert(bookData1.message.includes("✓ Bed ICU-102 booked successfully."), `Message matches expected inline notification: "${bookData1.message}"`);
    assert(bookData1.bed && bookData1.bed.status === 'Reserved', "Bed status immediately updated to 'Reserved'");
    assert(bookData1.invoice && Number(bookData1.invoice.total_amount) > 0, `Real invoice created: ${bookData1.invoice?.invoice_id}, Amount: ₹${bookData1.invoice?.total_amount}`);
    assert(bookData1.invoice && Number(bookData1.invoice.remaining_amount) === Number(bookData1.invoice.total_amount), `Remaining amount matches total amount: ₹${bookData1.invoice?.remaining_amount}`);
    assert(bookData1.invoice && bookData1.invoice.payment_status === 'Unpaid', "Initial billing status is 'Unpaid'");

    const createdInvoiceId = bookData1.invoice.invoice_id;

    // =========================================================================
    // 2. DOUBLE BOOKING CONCURRENCY: SECOND USER MUST BE REJECTED
    // =========================================================================
    console.log("\n--- 2. Testing Double Booking Prevention ---");
    const bookRes2 = await fetch(`${API_BASE}/api/hospitals/HOSP-001/ward-beds/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            bed_id: 'BED-ICU-102',
            patient_id: 'PAT-SECOND-USER',
            patient_name: 'Amit Kumar',
            notes: 'Attempting concurrent double booking'
        })
    });
    const bookData2 = await bookRes2.json();
    assert(bookRes2.status === 409, `Second user booking rejected with HTTP 409 Conflict (got ${bookRes2.status})`);
    assert(bookData2.message === "✕ This bed has already been booked by another patient.", `Exact error message returned: "${bookData2.message}"`);

    // =========================================================================
    // 3. BILLING COUNTER & PARTIAL PAYMENTS
    // =========================================================================
    console.log("\n--- 3. Testing Billing Counter & Partial Payments ---");
    const adminToken = getAdminToken('HOSP-001');

    // Make partial payment of ₹1500
    const payRes1 = await fetch(`${API_BASE}/api/hospitals/HOSP-001/invoices/${createdInvoiceId}/pay`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            amount: 1500,
            payment_method: 'UPI',
            transaction_ref: 'UPI-TXN-99120',
            notes: 'Partial payment at Billing Counter'
        })
    });
    const payData1 = await payRes1.json();
    assert(payRes1.status === 200 && payData1.success, "Partial payment of ₹1500 succeeded");
    assert(Number(payData1.invoice.paid_amount) === 1500, `Paid amount updated to ₹1500.00`);
    const expectedRemaining1 = Number(bookData1.invoice.total_amount) - 1500;
    assert(Number(payData1.invoice.remaining_amount) === expectedRemaining1, `Remaining amount is ₹${expectedRemaining1} (Total - Paid)`);
    assert(payData1.invoice.payment_status === 'Partially Paid', `Payment status is 'Partially Paid'`);

    // Pay remaining balance to make it fully paid
    const payRes2 = await fetch(`${API_BASE}/api/hospitals/HOSP-001/invoices/${createdInvoiceId}/pay`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            amount: expectedRemaining1,
            payment_method: 'Cash',
            transaction_ref: 'CASH-REC-001',
            notes: 'Final settlement'
        })
    });
    const payData2 = await payRes2.json();
    assert(payRes2.status === 200 && payData2.success, `Final settlement payment of ₹${expectedRemaining1} succeeded`);
    assert(Number(payData2.invoice.remaining_amount) === 0, `Remaining amount is exactly ₹0.00`);
    assert(payData2.invoice.payment_status === 'Paid', `Payment status updated to 'Paid'`);

    // =========================================================================
    // 4. PATIENT BILLING HISTORY & COUNTER STATEMENT
    // =========================================================================
    console.log("\n--- 4. Testing Patient Billing History ---");
    const histRes = await fetch(`${API_BASE}/api/hospitals/HOSP-001/patients/PAT-RAHUL-10231/billing-history`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const histData = await histRes.json();
    assert(histRes.status === 200 && histData.success, "Fetched patient billing history successfully");
    assert(histData.invoices && histData.invoices.length >= 1, `Contains invoice record (${histData.invoices.length} found)`);
    assert(histData.payments && histData.payments.length >= 2, `Contains all individual payment transactions (${histData.payments.length} found)`);
    assert(histData.summary && histData.summary.total_remaining === 0, `Summary indicates total remaining = 0 and status = PAID`);

    // =========================================================================
    // 5. HOSPITAL-WISE ISOLATION
    // =========================================================================
    console.log("\n--- 5. Testing Hospital-Wise Billing Isolation ---");
    const brdAdminToken = getOtherHospitalAdminToken('HOSP-002');
    const isoRes = await fetch(`${API_BASE}/api/hospitals/HOSP-002/invoices/${createdInvoiceId}/pay`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${brdAdminToken}`
        },
        body: JSON.stringify({ amount: 100 })
    });
    assert(isoRes.status === 404, `Hospital B (BRD) cannot access or pay Hospital A invoice (HTTP 404 expected, got ${isoRes.status})`);

    // =========================================================================
    // 6. OFFICIAL PNG LOGO UPLOAD & MAGIC BYTE VALIDATION
    // =========================================================================
    console.log("\n--- 6. Testing Strict PNG Logo Upload & Validation ---");
    // Test A: Fake PNG (JPEG content with .png name)
    const fakePngBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]); // JPEG header
    const fakeRes = await fetch(`${API_BASE}/api/hospitals/HOSP-001/logo`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            logo_base64: fakePngBuffer.toString('base64'),
            filename: 'fake_logo.png'
        })
    });
    const fakeData = await fakeRes.json();
    assert(fakeRes.status === 400, `Fake PNG rejected with HTTP 400 (got ${fakeRes.status})`);
    assert(fakeData.message === "✕ Please upload a valid PNG hospital logo.", `Exact error message returned: "${fakeData.message}"`);

    // Test B: Genuine PNG buffer (1x1 transparent PNG)
    // Magic Bytes: 89 50 4E 47 0D 0A 1A 0A
    const genuine1x1Png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
    const validRes = await fetch(`${API_BASE}/api/hospitals/HOSP-001/logo`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            logo_base64: genuine1x1Png.toString('base64'),
            filename: 'official_aiims_logo.png'
        })
    });
    const validData = await validRes.json();
    assert(validRes.status === 200 && validData.success, `Valid PNG uploaded successfully (HTTP 200)`);
    assert(validData.logo && validData.logo.endsWith('.png'), `Logo URL returned: ${validData.logo}`);

    // Verify GET /api/hospitals/HOSP-001/logo
    const getLogoRes = await fetch(`${API_BASE}/api/hospitals/HOSP-001/logo`);
    const getLogoData = await getLogoRes.json();
    assert(getLogoRes.status === 200 && getLogoData.logo === validData.logo, `GET logo endpoint returns single source of truth: ${getLogoData.logo}`);

    // Test C: Unauthorized admin cannot change another hospital's logo
    const unauthLogoRes = await fetch(`${API_BASE}/api/hospitals/HOSP-001/logo`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${brdAdminToken}`
        },
        body: JSON.stringify({
            logo_base64: genuine1x1Png.toString('base64'),
            filename: 'hacked_logo.png'
        })
    });
    assert(unauthLogoRes.status === 403, `Hospital B admin blocked from editing Hospital A logo (HTTP 403 expected, got ${unauthLogoRes.status})`);

    // =========================================================================
    // 7. HISTORICAL MEDICAL DOCUMENT PRESERVATION
    // =========================================================================
    console.log("\n--- 7. Testing Historical Prescription Document Branding ---");
    // Ensure patient exists in patients table
    await pool.query("INSERT IGNORE INTO patients (patient_id, name) VALUES ('PAT-HIST-01', 'Test Historical Patient')");

    // Insert test prescription with specific snapshot logo
    const [insRx] = await pool.query(`
        INSERT INTO prescriptions
        (patient_id, hospital_id, hospital_logo, prescription_file, doctor_name, diagnosis, advice, status, created_at)
        VALUES ('PAT-HIST-01', 'HOSP-001', '/uploads/hospital_logos/historical_archived_logo.png', 'Tab Amlodipine 5mg', 'Dr. Anand Verma', 'Hypertension', 'Daily walk', 'Active', NOW())
    `);
    const testRxId = insRx.insertId;

    const rxDocRes = await fetch(`${API_BASE}/api/prescriptions/${testRxId}/document`);
    const rxDocData = await rxDocRes.json();
    assert(rxDocRes.status === 200, "Retrieved prescription printable document");
    assert(rxDocData.hospital.logo === '/uploads/hospital_logos/historical_archived_logo.png', `Preserved historical document logo snapshot: ${rxDocData.hospital.logo}`);
    assert(rxDocData.hospital.historical_logo_preserved === true, "Indicates historical logo is preserved despite current hospital logo change");

    // Clean up test bed and prescription
    await pool.query("DELETE FROM prescriptions WHERE id = ?", [testRxId]);
    await pool.query("UPDATE hospital_ward_beds SET status = 'Available', patient_id = NULL, patient_name = NULL WHERE bed_id = 'BED-ICU-102'");

    console.log(`\n========================================`);
    console.log(`TOTAL SCENARIOS TESTED: ${passed + failed}`);
    console.log(`PASSED: ${passed}`);
    console.log(`FAILED: ${failed}`);
    console.log(`SUCCESS RATE: ${Math.round((passed / (passed + failed)) * 100)}%`);
    console.log(`========================================\n`);

    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error("Test runner encountered error:", err);
    process.exit(1);
});
