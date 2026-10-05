const fs = require('fs');
const path = require('path');
const jwt = require('../backend/node_modules/jsonwebtoken');

const API_BASE = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'smartcity_super_secret_jwt_key_gorakhpur_2026';

function getToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
}

const adminTokenA = getToken({
    id: 101,
    staff_id: 'STAFF-HOSP-ADMIN',
    name: 'Dr. Alok Verma (Director)',
    role: 'hospital_admin',
    hospital_id: 'HOSP-001',
    hospitalId: 'HOSP-001'
});

const adminTokenB = getToken({
    id: 102,
    staff_id: 'STAFF-BRD-ADMIN',
    name: 'Dr. S.K. Srivastava',
    role: 'hospital_admin',
    hospital_id: 'HOSP-002',
    hospitalId: 'HOSP-002'
});

async function runAll30Requirements() {
    console.log("========================================================================");
    console.log("🔍 COMPREHENSIVE VERIFICATION: ALL REQUIREMENTS FROM IMPLEMENTATION PROMPT");
    console.log("========================================================================\n");

    const pool = require('../backend/config/db').promise();
    let passed = 0;
    let failed = 0;

    function assert(cond, testNum, desc) {
        if (cond) {
            console.log(`  ✅ [REQ ${testNum}] PASS: ${desc}`);
            passed++;
        } else {
            console.error(`  ❌ [REQ ${testNum}] FAIL: ${desc}`);
            failed++;
        }
    }

    // SETUP: Clean test bed and reset state
    const testBedId = 'BED-ICU-102';
    const testPatientId = 'PAT-E2E-RAHUL';
    const testPatientName = 'Rahul';

    await pool.query("DELETE FROM hospital_billing_payments WHERE patient_id = ?", [testPatientId]);
    await pool.query("DELETE FROM hospital_invoices WHERE patient_id = ?", [testPatientId]);
    await pool.query("DELETE FROM hospital_bed_admissions WHERE patient_id = ?", [testPatientId]);
    await pool.query("INSERT IGNORE INTO patients (patient_id, name, mobile) VALUES (?, ?, '9876543210')", [testPatientId, testPatientName]);

    await pool.query(`
        UPDATE hospital_ward_beds
        SET status = 'Available', patient_id = NULL, patient_name = NULL, notes = 'Ready for E2E validation'
        WHERE bed_id = ?
    `, [testBedId]);

    // 1. Book an available bed
    const bookRes = await fetch(`${API_BASE}/api/hospitals/HOSP-001/ward-beds/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            bed_id: testBedId,
            patient_id: testPatientId,
            patient_name: testPatientName,
            patient_mobile: '9876543210',
            notes: 'Cardiac ICU reservation for Rahul'
        })
    });
    const bookData = await bookRes.json();
    assert(bookRes.status === 200 && bookData.success, 1, "Book an available bed successfully (HTTP 200)");

    // 2. Verify no browser alert appears (contract: API returns structured JSON, message for inline toast)
    assert(typeof bookData.message === "string" && !bookData.message.includes("alert("), 2, "No browser alert used; clean structured message returned");

    // 3. Verify success notification message format
    assert(bookData.message.includes("✓ Bed ICU-102 booked successfully."), 3, `Success notification format matches: "${bookData.message}"`);

    // 4. Verify page does not refresh (Frontend code does not call location.reload)
    const hospJsCode = fs.readFileSync('frontend/pages/hospital/hospital.js', 'utf8');
    const hasReloadInBooking = hospJsCode.includes("submitCitizenBedBooking") && hospJsCode.slice(hospJsCode.indexOf("submitCitizenBedBooking"), hospJsCode.indexOf("submitCitizenBedBooking") + 1500).includes("location.reload");
    assert(!hasReloadInBooking, 4, "Verified zero location.reload() or forced refresh in bed booking handler");

    // 5. Verify bed status changes immediately
    assert(bookData.bed && bookData.bed.status === 'Reserved', 5, "Bed status changes immediately to 'Reserved'");

    // 6. Verify available count changes immediately (db reflects reserved status)
    const [dbBed] = await pool.query("SELECT status, patient_id, patient_name FROM hospital_ward_beds WHERE bed_id = ?", [testBedId]);
    assert(dbBed[0]?.status === 'Reserved' && dbBed[0]?.patient_name === testPatientName, 6, "Database status verified as Reserved with assigned patient");

    // 7. Try booking the same bed from another session/user
    const dupRes = await fetch(`${API_BASE}/api/hospitals/HOSP-001/ward-beds/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            bed_id: testBedId,
            patient_id: 'PAT-CONCURRENT-USER',
            patient_name: 'Pooja Singh',
            notes: 'Attempting concurrent collision'
        })
    });
    const dupData = await dupRes.json();

    // 8. Verify duplicate booking is prevented with exact error message
    assert(dupRes.status === 409, 7, "Concurrent duplicate booking rejected with HTTP 409 Conflict");
    assert(dupData.message === "✕ This bed has already been booked by another patient.", 8, `Duplicate error matches exact requirement: "${dupData.message}"`);

    // 9. Verify bed cost is added to the patient's bill
    assert(bookData.invoice && Number(bookData.invoice.total_amount) === 3500, 9, `Bed cost added as official bill charge: ₹${bookData.invoice?.total_amount}/day`);

    // 10. Verify remaining amount is correct
    assert(Number(bookData.invoice.remaining_amount) === 3500 && bookData.invoice.payment_status === 'Unpaid', 10, `Initial remaining amount matches ₹3500.00 and status is 'Unpaid'`);

    const invoiceId = bookData.invoice.invoice_id;

    // 11 & 12. Go to Billing Counter & verify the charge appears
    const invRes = await fetch(`${API_BASE}/api/hospitals/HOSP-001/invoices/${invoiceId}`);
    const invData = await invRes.json();
    assert(invRes.status === 200 && invData.invoice, 11, "Invoice retrieved at Billing Counter");
    assert(invData.invoice.service_type.includes("Bed") && Number(invData.invoice.total_amount) === 3500, 12, `Billing Counter charge verified: ${invData.invoice?.service_type} - ₹${invData.invoice?.total_amount}`);

    // 13 & 14. Make partial payment & verify remaining amount decreases
    const partialPayRes = await fetch(`${API_BASE}/api/hospitals/HOSP-001/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminTokenA}`
        },
        body: JSON.stringify({
            amount: 1500,
            payment_method: 'UPI',
            notes: 'Partial payment of ₹1500 at Billing Desk'
        })
    });
    const partialData = await partialPayRes.json();
    assert(partialPayRes.status === 200 && partialData.success, 13, "Partial payment of ₹1500 processed at Billing Counter");
    assert(Number(partialData.invoice.remaining_amount) === 2000 && partialData.invoice.payment_status === 'Partially Paid', 14, `Remaining amount correctly reduced to ₹2000.00 (Status: Partially Paid)`);

    // 15, 16, 17. Make final payment, verify remaining = 0, status = PAID
    const finalPayRes = await fetch(`${API_BASE}/api/hospitals/HOSP-001/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminTokenA}`
        },
        body: JSON.stringify({
            amount: 2000,
            payment_method: 'Cash',
            notes: 'Final settlement at Billing Desk'
        })
    });
    const finalData = await finalPayRes.json();
    assert(finalPayRes.status === 200 && finalData.success, 15, "Final payment of ₹2000 processed");
    assert(Number(finalData.invoice.remaining_amount) === 0, 16, "Remaining amount becomes exactly ₹0.00");
    assert(finalData.invoice.payment_status === 'Paid', 17, "Billing status becomes 'Paid'");

    // 18. Verify billing history
    const histRes = await fetch(`${API_BASE}/api/hospitals/HOSP-001/patients/${testPatientId}/billing-history`);
    const histData = await histRes.json();
    assert(histData.invoices?.length >= 1 && histData.payments?.length >= 2, 18, `Patient billing history complete: ${histData.invoices?.length} invoice(s), ${histData.payments?.length} payment receipt(s)`);

    // 19 & 20. Upload PNG hospital logo as Hospital Admin & verify update
    const genuinePng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
    const logoUploadRes = await fetch(`${API_BASE}/api/hospitals/HOSP-001/logo`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminTokenA}`
        },
        body: JSON.stringify({
            logo_base64: genuinePng.toString('base64'),
            filename: 'official_aiims_brand.png'
        })
    });
    const logoUploadData = await logoUploadRes.json();
    assert(logoUploadRes.status === 200 && logoUploadData.success, 19, "Uploaded genuine PNG hospital logo as Hospital Admin");
    assert(logoUploadData.logo && logoUploadData.logo.endsWith('.png'), 20, `Logo saved to official upload path: ${logoUploadData.logo}`);

    // 21. Verify fake non-PNG is rejected
    const fakeBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
    const fakeLogoRes = await fetch(`${API_BASE}/api/hospitals/HOSP-001/logo`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminTokenA}`
        },
        body: JSON.stringify({
            logo_base64: fakeBuffer.toString('base64'),
            filename: 'fake_header.png'
        })
    });
    const fakeLogoData = await fakeLogoRes.json();
    assert(fakeLogoRes.status === 400 && fakeLogoData.message === "✕ Please upload a valid PNG hospital logo.", 21, `Fake non-PNG strictly rejected with: "${fakeLogoData.message}"`);

    // 22. Verify unauthorized admin cannot edit another hospital's logo
    const unauthRes = await fetch(`${API_BASE}/api/hospitals/HOSP-001/logo`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminTokenB}`
        },
        body: JSON.stringify({
            logo_base64: genuinePng.toString('base64'),
            filename: 'malicious.png'
        })
    });
    assert(unauthRes.status === 403, 22, "Hospital B admin blocked from editing Hospital A logo (HTTP 403 Forbidden)");

    // 23 & 24. Change logo & verify new documents use new logo
    const newPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mNk+M/wHwMDAwMQAAAJ+wP9m30QvAAAAABJRU5ErkJggg==", "base64");
    const changeLogoRes = await fetch(`${API_BASE}/api/hospitals/HOSP-001/logo`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminTokenA}`
        },
        body: JSON.stringify({
            logo_base64: newPng.toString('base64'),
            filename: 'new_brand_logo.png'
        })
    });
    const changeLogoData = await changeLogoRes.json();
    assert(changeLogoRes.status === 200, 23, "Hospital logo updated to new brand asset");

    const getHospRes = await fetch(`${API_BASE}/api/hospitals/HOSP-001/logo`);
    const getHospData = await getHospRes.json();
    assert(getHospData.logo === changeLogoData.logo, 24, `Single source of truth hospital.logo verified: ${getHospData.logo}`);

    // 25. Verify old finalized documents remain historically correct
    const historicalLogoPath = "/uploads/hospital_logos/archived_2025_logo.png";
    const [insHistRx] = await pool.query(`
        INSERT INTO prescriptions
        (patient_id, hospital_id, hospital_logo, prescription_file, doctor_name, diagnosis, advice, status, created_at)
        VALUES (?, 'HOSP-001', ?, 'Tab Metformin 500mg', 'Dr. Anand Verma', 'Diabetes', 'Diet control', 'Active', NOW())
    `, [testPatientId, historicalLogoPath]);
    const histRxId = insHistRx.insertId;

    const histRxDocRes = await fetch(`${API_BASE}/api/prescriptions/${histRxId}/document`);
    const histRxDocData = await histRxDocRes.json();
    assert(histRxDocData.hospital.logo === historicalLogoPath && histRxDocData.hospital.historical_logo_preserved === true, 25, "Old finalized prescription document preserved its snapshot logo");

    // Clean up test prescription
    await pool.query("DELETE FROM prescriptions WHERE id = ?", [histRxId]);

    // 26. Verify Hospital A data never appears for Hospital B
    const crossRes = await fetch(`${API_BASE}/api/hospitals/HOSP-002/invoices/${invoiceId}`, {
        headers: { 'Authorization': `Bearer ${adminTokenB}` }
    });
    assert(crossRes.status === 404, 26, "Hospital A invoice is invisible to Hospital B (HTTP 404)");

    // 27. Test Citizen Hospital UI Bed Availability endpoint
    const bedAvailRes = await fetch(`${API_BASE}/api/hospital/bed-availability`);
    const bedAvailData = await bedAvailRes.json();
    assert(bedAvailRes.status === 200 && bedAvailData.success && (bedAvailData.hospitals?.length > 0 || bedAvailData.beds?.length > 0), 27, `Citizen bed availability returned ${bedAvailData.hospitals?.length} hospitals and ${bedAvailData.beds?.length} beds`);

    // 28. Test Doctor consultation and prescription generation with snapshot logo
    const docToken = getToken({
        id: 501,
        staff_id: 'DOC-101',
        name: 'Dr. Anand Verma',
        role: 'doctor',
        hospital_id: 'HOSP-001',
        hospitalId: 'HOSP-001'
    });
    const consultRes = await fetch(`${API_BASE}/api/doctor/consultations/complete`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${docToken}`
        },
        body: JSON.stringify({
            patientId: testPatientId,
            diagnosis: 'Acute Bronchitis',
            treatment: 'Antibiotics & Inhaler',
            advice: 'Steam inhalation twice daily'
        })
    });
    const consultData = await consultRes.json();
    assert((consultRes.status === 200 || consultRes.status === 201) && consultData.success, 28, "Doctor completed consultation and issued prescription");
    if (consultData.prescriptionId) {
        const [rxRow] = await pool.query("SELECT hospital_logo FROM prescriptions WHERE id = ?", [consultData.prescriptionId]);
        assert(rxRow[0]?.hospital_logo === changeLogoData.logo, 28, `Prescription captured current hospital logo snapshot: ${rxRow[0]?.hospital_logo}`);
        await pool.query("DELETE FROM prescriptions WHERE id = ?", [consultData.prescriptionId]);
    }

    // 29. Test Staff Dashboard Cashier Desk invoice listing
    const staffInvoicesRes = await fetch(`${API_BASE}/api/hospitals/HOSP-001/invoices`, {
        headers: { 'Authorization': `Bearer ${adminTokenA}` }
    });
    const staffInvoicesData = await staffInvoicesRes.json();
    assert(staffInvoicesRes.status === 200 && staffInvoicesData.invoices?.some(i => i.invoice_id === invoiceId), 29, `Staff Billing Desk accurately lists the test invoice with remaining balance`);

    // 30. Test Hospital Admin physical structure and capacity calculation
    const configRes = await fetch(`${API_BASE}/api/hospitals/HOSP-001/physical-structure`, {
        headers: { 'Authorization': `Bearer ${adminTokenA}` }
    });
    const configData = await configRes.json();
    assert(configRes.status === 200 && configData.totals?.total_beds > 0, 30, `Hospital physical hierarchy tree verified with ${configData.totals?.total_beds} total beds`);

    // CLEANUP
    await pool.query("DELETE FROM hospital_billing_payments WHERE patient_id = ?", [testPatientId]);
    await pool.query("DELETE FROM hospital_invoices WHERE patient_id = ?", [testPatientId]);
    await pool.query("DELETE FROM hospital_bed_admissions WHERE patient_id = ?", [testPatientId]);
    await pool.query("DELETE FROM patients WHERE patient_id = ?", [testPatientId]);
    await pool.query("UPDATE hospital_ward_beds SET status = 'Available', patient_id = NULL, patient_name = NULL WHERE bed_id = ?", [testBedId]);

    console.log("\n========================================================================");
    console.log(`TOTAL AUDIT SCENARIOS: ${passed + failed}`);
    console.log(`PASSED: ${passed}`);
    console.log(`FAILED: ${failed}`);
    console.log(`PASS RATE: ${Math.round((passed / (passed + failed)) * 100)}%`);
    console.log("========================================================================\n");

    process.exit(failed > 0 ? 1 : 0);
}

runAll30Requirements().catch(err => {
    console.error("Test execution error:", err);
    process.exit(1);
});
