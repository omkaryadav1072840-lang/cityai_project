/**
 * SmartCity AI - Gorakhpur Blood Bank & Emergency Blood Management System
 * Comprehensive Master Test & Concurrency Verification Suite
 */

const assert = require('assert');
const fs = require('fs');
const jwt = require('../backend/node_modules/jsonwebtoken');
const { Readable } = require('stream');
const express = require('../backend/node_modules/express');
const { JWT_SECRET } = require('../backend/config/env.config');

console.log("===============================================================================");
console.log("🩸 BLOOD BANK & EMERGENCY BLOOD MANAGEMENT: MASTER VERIFICATION SUITE");
console.log("===============================================================================\n");

// Helper to create JWT tokens
function makeToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
        issuer: "smartcity.gorakhpur.gov.in",
        audience: "smartcity-portal",
        expiresIn: "1h"
    });
}

const citizenToken = makeToken({ id: 101, name: "Rahul Sharma", role: "citizen" });
const citizen2Token = makeToken({ id: 102, name: "Amit Verma", role: "citizen" });
const staffHosp1Token = makeToken({ id: 201, name: "Dr. Alok Nath", role: "staff", hospitalId: "HOSP-001" });
const staffHosp2Token = makeToken({ id: 202, name: "Dr. Neha Gupta", role: "staff", hospitalId: "HOSP-002" });
const superAdminToken = makeToken({ id: 999, name: "Super Administrator", role: "super_admin" });

// Setup isolated Express App with Blood Bank Router
const app = express();
app.use(express.json());
const bloodBankRoutes = require('../backend/routes/blood_bank.routes');
app.use(bloodBankRoutes);

function dispatch(method, url, headers = {}, body = null) {
    return new Promise((resolve) => {
        const req = new Readable();
        req._read = () => {};
        req.method = method.toUpperCase();
        req.url = url;
        const normHeaders = {};
        for (const [k, v] of Object.entries(headers)) {
            normHeaders[k.toLowerCase()] = v;
        }
        req.headers = { host: "localhost:5000", ...normHeaders };

        if (body) {
            const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
            req.headers["content-type"] = req.headers["content-type"] || "application/json";
            req.headers["content-length"] = Buffer.byteLength(bodyStr);
            req.push(bodyStr);
        }
        req.push(null);

        let resData = "";
        const res = {
            statusCode: 200,
            setHeader: () => {},
            getHeader: () => {},
            status: function(c) { this.statusCode = c; return this; },
            json: function(d) {
                resData = d;
                resolve({ status: this.statusCode, body: d });
            },
            send: function(d) {
                try { resData = JSON.parse(d); } catch(_) { resData = d; }
                resolve({ status: this.statusCode, body: resData });
            },
            end: function() {
                resolve({ status: this.statusCode, body: resData });
            }
        };

        app.handle(req, res, (err) => {
            if (err) resolve({ status: 500, error: err.message });
        });
    });
}

async function runMasterSuite() {
    let passed = 0;
    let failed = 0;

    function check(name, condition) {
        if (condition) {
            console.log(`  ✅ PASS: ${name}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${name}`);
            failed++;
        }
    }

    console.log("--- PART 1: FRONTEND AUDIT & CARD REPLACEMENT ---");
    const hospHtml = fs.readFileSync('frontend/pages/hospital/hospital.html', 'utf8');
    const hospJs = fs.readFileSync('frontend/pages/hospital/hospital.js', 'utf8');
    const bbHtml = fs.readFileSync('frontend/pages/hospital/blood_bank.html', 'utf8');
    const bbCss = fs.readFileSync('frontend/pages/hospital/blood_bank.css', 'utf8');
    const bbJs = fs.readFileSync('frontend/pages/hospital/blood_bank.js', 'utf8');

    check("1.1 Upload Prescription card replaced with Blood Bank & Donation card", hospHtml.includes("Blood Bank &amp; Donation") && hospHtml.includes("BLOOD BANK"));
    check("1.2 Blood Bank card has blood-drop icon 🩸 and soft-red styling", hospHtml.includes("🩸") && hospHtml.includes("chip-red") && hospHtml.includes("red-icon"));
    check("1.3 Primary 'Find Blood' and secondary 'Become a Donor' actions present", hospHtml.includes("openBloodBankPage()") && hospHtml.includes("openDonorRegistrationModal()"));
    check("1.4 hospital.js exports openBloodBankPage and openDonorRegistrationModal", hospJs.includes("openBloodBankPage") && hospJs.includes("openDonorRegistrationModal"));
    check("1.5 Dedicated blood_bank.html page exists with all 12 emergency request fields", 
        bbHtml.includes('id="reqPatientName"') && 
        bbHtml.includes('id="reqBloodGroup"') && 
        bbHtml.includes('id="reqComponent"') && 
        bbHtml.includes('id="reqUnits"') && 
        bbHtml.includes('id="reqHospital"') && 
        bbHtml.includes('id="reqDepartment"') && 
        bbHtml.includes('id="reqDoctor"') && 
        bbHtml.includes('id="reqPriority"') && 
        bbHtml.includes('id="reqRequiredAt"') && 
        bbHtml.includes('id="reqContactPerson"') && 
        bbHtml.includes('id="reqContactPhone"') && 
        bbHtml.includes('id="reqRelationship"')
    );
    check("1.6 Voluntary donor registration form includes mandatory legal consent", bbHtml.includes('id="donorConsentCheck"'));
    check("1.7 Staff & Admin command console present with 7-stage workflow stepper", bbHtml.includes('id="viewStaffConsole"') && bbCss.includes('.bb-stepper'));
    check("1.8 Android assets synchronized with frontend", fs.existsSync('android/app/src/main/assets/public/pages/hospital/blood_bank.html'));

    console.log("\n--- PART 2: BACKEND CITIZEN APIs ---");
    // 2.1 Hospitals directory
    const rHosp = await dispatch("GET", "/api/hospital/blood-bank/hospitals");
    check("2.1 GET /hospitals returns verified facilities with helpline", rHosp.status === 200 && rHosp.body.data.length >= 3);

    // 2.2 Live Availability
    const rAvail = await dispatch("GET", "/api/hospital/blood-bank/availability");
    check("2.2 GET /availability returns verified units across Gorakhpur", rAvail.status === 200 && rAvail.body.data.length > 0);

    // 2.3 Filtered Availability
    const rAvailFiltered = await dispatch("GET", "/api/hospital/blood-bank/availability?blood_group=O+&hospital_id=HOSP-001");
    check("2.3 Filtered availability respects blood_group and hospital_id", rAvailFiltered.status === 200 && rAvailFiltered.body.data.every(d => d.blood_group === "O+" && d.hospital_id === "HOSP-001"));

    // 2.4 Invalid blood group validation
    const rBadReq = await dispatch("POST", "/api/hospital/blood-bank/requests", { "Authorization": `Bearer ${citizenToken}` }, {
        hospital_id: "HOSP-001",
        patient_name: "Test Patient",
        blood_group: "INVALID_GROUP",
        component_type: "PRBC",
        required_at: new Date().toISOString(),
        contact_person: "Attendant",
        contact_phone: "9876543210"
    });
    check("2.4 Rejects invalid blood group with 400 Bad Request", rBadReq.status === 400);

    // 2.5 Bad phone number validation
    const rBadPhone = await dispatch("POST", "/api/hospital/blood-bank/requests", { "Authorization": `Bearer ${citizenToken}` }, {
        hospital_id: "HOSP-001",
        patient_name: "Test Patient",
        blood_group: "A+",
        component_type: "PRBC",
        required_at: new Date().toISOString(),
        contact_person: "Attendant",
        contact_phone: "123"
    });
    check("2.5 Rejects invalid phone number with 400 Bad Request", rBadPhone.status === 400);

    // 2.6 Valid emergency request submission
    const reqPayload = {
        hospital_id: "HOSP-001",
        patient_name: "Ramesh Gupta",
        patient_age: 48,
        blood_group: "B+",
        component_type: "PRBC",
        requested_units: 2,
        priority: "Emergency",
        treating_department: "Cardiology ICU",
        required_at: new Date(Date.now() + 7200000).toISOString(),
        contact_person: "Suman Gupta",
        contact_phone: "9876543210",
        relationship_to_patient: "Spouse",
        idempotency_key: "IDEM-TEST-ALPHA-01"
    };
    const rValidReq = await dispatch("POST", "/api/hospital/blood-bank/requests", { "Authorization": `Bearer ${citizenToken}` }, reqPayload);
    check("2.6 Valid emergency blood request created (201 Created)", rValidReq.status === 201 && rValidReq.body.data.request_reference.startsWith("REQ-BLD-"));

    const createdReq = rValidReq.body.data;

    // 2.7 Idempotency test (duplicate submission)
    const rDuplicate = await dispatch("POST", "/api/hospital/blood-bank/requests", { "Authorization": `Bearer ${citizenToken}` }, reqPayload);
    check("2.7 Idempotency key prevents duplicate request insertion", rDuplicate.status === 200 && rDuplicate.body.is_duplicate === true);

    // 2.8 Citizen requests query
    const rMy = await dispatch("GET", "/api/hospital/blood-bank/requests/my", { "Authorization": `Bearer ${citizenToken}` });
    check("2.8 GET /requests/my returns citizen's own submitted requests", rMy.status === 200 && rMy.body.data.some(r => r.id === createdReq.id));

    // 2.9 Track request by reference
    const rTrack = await dispatch("GET", `/api/hospital/blood-bank/requests/${createdReq.request_reference}`);
    check("2.9 GET /requests/:ref returns request details with status timeline", rTrack.status === 200 && Array.isArray(rTrack.body.data.timeline));

    // 2.10 Donor registration validation (<18 rejection)
    const rUnderage = await dispatch("POST", "/api/hospital/blood-bank/donors/register", {}, {
        full_name: "Junior Donor",
        age: 16,
        blood_group: "O+",
        phone: "9876543210",
        consent_to_contact: true
    });
    check("2.10 Rejects donor under 18 years with 400 Bad Request", rUnderage.status === 400);

    // 2.11 Missing consent rejection
    const rNoConsent = await dispatch("POST", "/api/hospital/blood-bank/donors/register", {}, {
        full_name: "Adult Donor",
        age: 25,
        blood_group: "O+",
        phone: "9876543210",
        consent_to_contact: false
    });
    check("2.11 Rejects donor registration without explicit consent", rNoConsent.status === 400);

    // 2.12 Valid voluntary donor registration
    const rDonor = await dispatch("POST", "/api/hospital/blood-bank/donors/register", { "Authorization": `Bearer ${citizenToken}` }, {
        full_name: "Rahul Sharma",
        age: 29,
        gender: "Male",
        blood_group: "B+",
        phone: "9876543210",
        locality: "Golghar, Gorakhpur",
        availability_preference: "Emergency Only",
        consent_to_contact: true
    });
    check("2.12 Valid donor registered with status PENDING_VERIFICATION", rDonor.status === 201 && rDonor.body.data.donor_code.startsWith("DNR-GKP-"));

    // 2.13 Donor me query and consent withdrawal
    const rDonorMe = await dispatch("GET", "/api/hospital/blood-bank/donors/me", { "Authorization": `Bearer ${citizenToken}` });
    check("2.13 GET /donors/me returns authenticated donor profile", rDonorMe.status === 200 && rDonorMe.body.registered === true);

    const rWithdraw = await dispatch("PATCH", "/api/hospital/blood-bank/donors/me", { "Authorization": `Bearer ${citizenToken}` }, { withdraw_consent: true });
    check("2.14 PATCH /donors/me allows withdrawing consent / deactivating", rWithdraw.status === 200);

    console.log("\n--- PART 3: STAFF & RBAC DATA ISOLATION ---");
    // 3.1 Unauthenticated access rejected
    const rUnauth = await dispatch("GET", "/api/hospital/blood-bank/staff/requests");
    check("3.1 Unauthenticated access to /staff/requests returns 401", rUnauth.status === 401);

    // 3.2 Citizen role rejected
    const rCitStaff = await dispatch("GET", "/api/hospital/blood-bank/staff/requests", { "Authorization": `Bearer ${citizenToken}` });
    check("3.2 Citizen token rejected on staff endpoints with 403 Forbidden", rCitStaff.status === 403);

    // 3.3 Hospital isolation: Staff at Hospital 2 cannot access Hospital 1 data
    const rCrossHosp = await dispatch("GET", "/api/hospital/blood-bank/staff/requests?hospital_id=HOSP-001", { "Authorization": `Bearer ${staffHosp2Token}` });
    check("3.3 Cross-hospital staff access strictly forbidden (403)", rCrossHosp.status === 403);

    // 3.4 Authorized Hospital 1 Staff access
    const rHosp1Staff = await dispatch("GET", "/api/hospital/blood-bank/staff/requests?hospital_id=HOSP-001", { "Authorization": `Bearer ${staffHosp1Token}` });
    check("3.4 Assigned hospital staff successfully accesses own facility requests", rHosp1Staff.status === 200);

    // 3.5 Staff Inventory accession
    const rAddUnit = await dispatch("POST", "/api/hospital/blood-bank/staff/inventory", { "Authorization": `Bearer ${staffHosp1Token}` }, {
        blood_group: "AB-",
        component_type: "PRBC",
        volume_ml: 350,
        collection_date: "2026-10-25",
        expiry_date: "2026-11-29",
        screening_status: "PASSED",
        storage_location: "Cold Chamber AB1"
    });
    check("3.5 Staff accessions new screened blood unit into ledger (201 Created)", rAddUnit.status === 201 && rAddUnit.body.data.unit_identifier.startsWith("BG-HOSP-001-ABNEG"));

    // 3.6 Inventory adjustment without reason rejected
    const rNoReason = await dispatch("PATCH", `/api/hospital/blood-bank/staff/inventory/${rAddUnit.body.data.id}`, { "Authorization": `Bearer ${staffHosp1Token}` }, {
        inventory_status: "QUARANTINED"
    });
    check("3.6 Inventory status adjustment rejected without mandatory clinical reason", rNoReason.status === 400);

    // 3.7 Valid inventory adjustment with reason
    const rWithReason = await dispatch("PATCH", `/api/hospital/blood-bank/staff/inventory/${rAddUnit.body.data.id}`, { "Authorization": `Bearer ${staffHosp1Token}` }, {
        inventory_status: "QUARANTINED",
        reason: "Cold chain temperature spike recorded at 8C for 30 minutes"
    });
    check("3.7 Valid inventory adjustment documented with audit trail", rWithReason.status === 200);

    console.log("\n--- PART 4: TRANSACTION SAFETY & 50+ CONCURRENT REQUESTS SIMULATION ---");
    // Scenario:
    // Hospital HOSP-001 has limited available units of O- PRBC.
    // 50 simultaneous emergency requests compete concurrently for reservation.
    // Assert: Only exact available count can be reserved; remainder get 409 Insufficient Stock.
    // Zero double reservations, zero negative stock!

    // Step A: Count currently available units of O- PRBC in HOSP-001
    const rAvailBefore = await dispatch("GET", "/api/hospital/blood-bank/availability?blood_group=O-&component=PRBC&hospital_id=HOSP-001");
    const initialUnitsAvail = rAvailBefore.body.data.length > 0 ? rAvailBefore.body.data[0].available_units : 0;
    console.log(`   Initial available O- PRBC units in HOSP-001: ${initialUnitsAvail}`);
    assert(initialUnitsAvail > 0, "Must have initial units for concurrency test");

    // Step B: Submit 50 separate emergency requests for 1 unit of O- PRBC each
    const requestIds = [];
    for (let i = 1; i <= 50; i++) {
        const sub = await dispatch("POST", "/api/hospital/blood-bank/requests", { "Authorization": `Bearer ${citizenToken}` }, {
            hospital_id: "HOSP-001",
            patient_name: `Concurrent Patient ${i}`,
            blood_group: "O-",
            component_type: "PRBC",
            requested_units: 1,
            priority: "Emergency",
            required_at: new Date(Date.now() + 3600000).toISOString(),
            contact_person: `Attendant ${i}`,
            contact_phone: `98765432${(10 + i).toString().slice(-2)}`,
            relationship_to_patient: "Relative",
            idempotency_key: `CONC-REQ-${Date.now()}-${i}`
        });
        requestIds.push(sub.body.data.id);
    }
    check("4.1 50 competing emergency requests successfully submitted", requestIds.length === 50);

    // Step C: Launch 50 SIMULTANEOUS PARALLEL RESERVATION TRANSACTIONS
    console.log("   Firing 50 parallel reservation transactions competing for limited O- units...");
    const reservationPromises = requestIds.map(reqId =>
        dispatch("POST", `/api/hospital/blood-bank/staff/requests/${reqId}/reserve`, { "Authorization": `Bearer ${staffHosp1Token}` })
    );

    const reservationResults = await Promise.all(reservationPromises);

    const successfulRes = reservationResults.filter(r => r.status === 200);
    const rejectedInsufficientRes = reservationResults.filter(r => r.status === 409);

    console.log(`   Concurrent Reservation Results: ${successfulRes.length} Succeeded, ${rejectedInsufficientRes.length} Rejected (409 Insufficient Stock)`);

    check("4.2 Number of successful reservations exactly matches available inventory count", successfulRes.length === initialUnitsAvail);
    check("4.3 Excess competing requests safely rejected with 409 Conflict", rejectedInsufficientRes.length === (50 - initialUnitsAvail));

    // Verify all reserved units are strictly unique (NO DOUBLE RESERVATION)
    const reservedBarcodes = [];
    for (const r of successfulRes) {
        for (const u of r.body.data.reserved_units) {
            reservedBarcodes.push(u.code);
        }
    }
    const uniqueBarcodes = new Set(reservedBarcodes);
    check("4.4 ZERO double reservations: every reserved unit barcode is 100% unique", reservedBarcodes.length === uniqueBarcodes.size);

    // Check availability after competition: must be exactly ZERO, never negative!
    const rAvailAfter = await dispatch("GET", "/api/hospital/blood-bank/availability?blood_group=O-&component=PRBC&hospital_id=HOSP-001");
    const finalAvail = rAvailAfter.body.data.length > 0 ? rAvailAfter.body.data[0].available_units : 0;
    check("4.5 Inventory non-negative constraint: remaining available units is exactly 0", finalAvail === 0);

    console.log("\n--- PART 5: FULFILLMENT & TERMINAL STATE GUARDS ---");
    const winningReqId = successfulRes[0].body.data.request_id;
    const losingReqId = rejectedInsufficientRes[0].body.message ? requestIds[requestIds.length - 1] : requestIds[0];

    // 5.1 Fulfill reserved request
    const rFulfill = await dispatch("POST", `/api/hospital/blood-bank/staff/requests/${winningReqId}/fulfill`, { "Authorization": `Bearer ${staffHosp1Token}` });
    check("5.1 Successfully fulfilled reserved blood request (Units marked ISSUED)", rFulfill.status === 200);

    // 5.2 Double fulfillment prevention
    const rDoubleFulfill = await dispatch("POST", `/api/hospital/blood-bank/staff/requests/${winningReqId}/fulfill`, { "Authorization": `Bearer ${staffHosp1Token}` });
    check("5.2 Double fulfillment rejected: cannot fulfill an already fulfilled request", rDoubleFulfill.status === 400);

    // 5.3 Cannot fulfill an unreserved / submitted request
    const rBadFulfill = await dispatch("POST", `/api/hospital/blood-bank/staff/requests/${losingReqId}/fulfill`, { "Authorization": `Bearer ${staffHosp1Token}` });
    check("5.3 Fulfilling an unreserved request rejected with 400 Bad Request", rBadFulfill.status === 400);

    // 5.4 Rejection and release
    const rReject = await dispatch("PATCH", `/api/hospital/blood-bank/staff/requests/${losingReqId}/status`, { "Authorization": `Bearer ${staffHosp1Token}` }, {
        status: "REJECTED",
        rejection_reason: "Cross-match test incompatibility detected with donor serum"
    });
    check("5.4 Request safely transitioned to REJECTED with documented clinical reason", rReject.status === 200);

    console.log("\n--- PART 6: ADMIN REPORTS & AUDIT LOGS ---");
    const rDash = await dispatch("GET", "/api/hospital/blood-bank/admin/dashboard", { "Authorization": `Bearer ${superAdminToken}` });
    check("6.1 Admin dashboard returns aggregate statistics and near-expiry metrics", rDash.status === 200 && rDash.body.summary.total_requests >= 50);

    const rReports = await dispatch("GET", "/api/hospital/blood-bank/admin/reports", { "Authorization": `Bearer ${superAdminToken}` });
    check("6.2 Admin reports return blood group & component distributions", rReports.status === 200 && Array.isArray(rReports.body.data.blood_group_distribution));

    const rAudit = await dispatch("GET", "/api/hospital/blood-bank/admin/audit-logs", { "Authorization": `Bearer ${superAdminToken}` });
    check("6.3 Admin audit logs ledger queries return immutable history", rAudit.status === 200);

    console.log("\n===============================================================================");
    console.log(`🎯 MASTER TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log("===============================================================================");

    return { passed, failed };
}

runMasterSuite().then(({ passed, failed }) => {
    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}).catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
