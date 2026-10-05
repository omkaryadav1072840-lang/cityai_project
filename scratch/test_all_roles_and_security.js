/**
 * Comprehensive Human-Like Login & Security Test Suite
 * Tests all 11 account types + all security restrictions
 */

const BASE_URL = "http://localhost:5000";

let testResults = [];

function recordResult(category, testName, passed, details) {
    testResults.push({ category, testName, passed, details });
    const statusIcon = passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${statusIcon} [${category}] ${testName}: ${details}`);
}

async function request(endpoint, options = {}) {
    const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, body };
}

async function runAllTests() {
    console.log("============================================================");
    console.log("STARTING SMARTCITY HOSPITAL AUTH & ROLE VERIFICATION TESTS");
    console.log("============================================================\n");

    let citizenToken = null;
    let recToken = null;
    let docToken = null;
    let nurToken = null;
    let labToken = null;
    let pharmToken = null;
    let billToken = null;
    let ambToken = null;
    let adminAToken = null;
    let adminBToken = null;
    let superAdminToken = null;

    // ---------------------------------------------------------
    // 1. CITIZEN LOGIN TEST
    // ---------------------------------------------------------
    console.log("\n--- TEST 1: Citizen Login & Verification ---");
    const citRes = await request("/api/login", {
        method: "POST",
        body: JSON.stringify({ loginId: "omkaryadav@gmail.com", password: "password123" })
    });
    if (citRes.ok && citRes.body.accountType === "CITIZEN" && citRes.body.targetDashboard.includes("hospital.html")) {
        citizenToken = citRes.body.token;
        recordResult("CITIZEN", "Login & Dashboard Route", true, `AccountType=${citRes.body.accountType}, Target=${citRes.body.targetDashboard}`);
    } else {
        recordResult("CITIZEN", "Login & Dashboard Route", false, `Status=${citRes.status}, Body=${JSON.stringify(citRes.body)}`);
    }

    // ---------------------------------------------------------
    // 2. RECEPTIONIST LOGIN & TASK TEST
    // ---------------------------------------------------------
    console.log("\n--- TEST 2: Receptionist Login & Scoped Access ---");
    const recRes = await request("/api/staff-login", {
        method: "POST",
        body: JSON.stringify({ staffId: "STAFF-HOSP-REC", password: "admin" })
    });
    if (recRes.ok && recRes.body.role === "receptionist" && recRes.body.hospitalId === "HOSP-001") {
        recToken = recRes.body.token;
        recordResult("RECEPTIONIST", "Identity & Hospital Verification", true, `Role=${recRes.body.role}, Hosp=${recRes.body.hospitalId}, Modules=${JSON.stringify(recRes.body.assignedModules)}`);

        // Allowed task: View appointments queue
        const apptRes = await request("/api/hospitals/HOSP-001/appointments", {
            headers: { Authorization: `Bearer ${recToken}` }
        });
        recordResult("RECEPTIONIST", "Allowed Task: View Queue", apptRes.ok, `Status=${apptRes.status}`);

        // Restricted task: Try to view staff management
        const staffRes = await request("/api/hospitals/HOSP-001/staff", {
            headers: { Authorization: `Bearer ${recToken}` }
        });
        recordResult("RECEPTIONIST", "Restricted Task Blocked: Manage Staff", staffRes.status === 403, `Status=${staffRes.status} (Expected 403)`);
    } else {
        recordResult("RECEPTIONIST", "Identity & Hospital Verification", false, JSON.stringify(recRes.body));
    }

    // ---------------------------------------------------------
    // 3. DOCTOR LOGIN & CLINICAL DESK
    // ---------------------------------------------------------
    console.log("\n--- TEST 3: Doctor Login & Scoped Access ---");
    const docRes = await request("/api/staff-login", {
        method: "POST",
        body: JSON.stringify({ staffId: "DOC-101", password: "admin" })
    });
    if (docRes.ok && docRes.body.role === "doctor" && docRes.body.hospitalId === "HOSP-001") {
        docToken = docRes.body.token;
        recordResult("DOCTOR", "Doctor Profile Verification", true, `Doctor=${docRes.body.user.name}, Target=${docRes.body.targetDashboard}`);

        // Allowed task: View Doctor Slots
        const slotRes = await request("/api/doctors/DOC-101/slots");
        recordResult("DOCTOR", "Allowed Task: Query Doctor Slots", slotRes.ok, `Slots count=${slotRes.body.slots?.length || 0}`);
    } else {
        recordResult("DOCTOR", "Doctor Profile Verification", false, JSON.stringify(docRes.body));
    }

    // ---------------------------------------------------------
    // 4. NURSE LOGIN & BED ACCESS
    // ---------------------------------------------------------
    console.log("\n--- TEST 4: Nurse Login & Ward Access ---");
    const nurRes = await request("/api/staff-login", {
        method: "POST",
        body: JSON.stringify({ staffId: "STAFF-HOSP-NUR", password: "admin" })
    });
    if (nurRes.ok && nurRes.body.role === "nurse" && nurRes.body.hospitalId === "HOSP-001") {
        nurToken = nurRes.body.token;
        recordResult("NURSE", "Nurse Identity & Permissions", true, `Modules=${JSON.stringify(nurRes.body.assignedModules)}`);

        // Allowed task: View beds & wards dashboard
        const dashRes = await request("/api/hospitals/HOSP-001/dashboard", {
            headers: { Authorization: `Bearer ${nurToken}` }
        });
        recordResult("NURSE", "Allowed Task: Hospital Ward Dashboard", dashRes.ok, `Beds Avail=${dashRes.body.stats?.beds_available}`);
    } else {
        recordResult("NURSE", "Nurse Identity & Permissions", false, JSON.stringify(nurRes.body));
    }

    // ---------------------------------------------------------
    // 5. LAB TECHNICIAN LOGIN
    // ---------------------------------------------------------
    console.log("\n--- TEST 5: Lab Technician Login ---");
    const labRes = await request("/api/staff-login", {
        method: "POST",
        body: JSON.stringify({ staffId: "STAFF-HOSP-LAB", password: "admin" })
    });
    if (labRes.ok && labRes.body.role === "lab_technician") {
        labToken = labRes.body.token;
        recordResult("LAB_TECH", "Lab Tech Login & Modules", true, `Modules=${JSON.stringify(labRes.body.assignedModules)}`);
    } else {
        recordResult("LAB_TECH", "Lab Tech Login & Modules", false, JSON.stringify(labRes.body));
    }

    // ---------------------------------------------------------
    // 6. PHARMACY STAFF LOGIN
    // ---------------------------------------------------------
    console.log("\n--- TEST 6: Pharmacy Staff Login ---");
    const pharmRes = await request("/api/staff-login", {
        method: "POST",
        body: JSON.stringify({ staffId: "STAFF-HOSP-PHARM", password: "admin" })
    });
    if (pharmRes.ok && pharmRes.body.role === "pharmacy") {
        pharmToken = pharmRes.body.token;
        recordResult("PHARMACY", "Pharmacy Login & Modules", true, `Modules=${JSON.stringify(pharmRes.body.assignedModules)}`);
    } else {
        recordResult("PHARMACY", "Pharmacy Login & Modules", false, JSON.stringify(pharmRes.body));
    }

    // ---------------------------------------------------------
    // 7. BILLING STAFF LOGIN
    // ---------------------------------------------------------
    console.log("\n--- TEST 7: Billing Staff Login ---");
    const billRes = await request("/api/staff-login", {
        method: "POST",
        body: JSON.stringify({ staffId: "STAFF-HOSP-BILL", password: "admin" })
    });
    if (billRes.ok && billRes.body.role === "billing") {
        billToken = billRes.body.token;
        recordResult("BILLING", "Billing Login & Modules", true, `Modules=${JSON.stringify(billRes.body.assignedModules)}`);
    } else {
        recordResult("BILLING", "Billing Login & Modules", false, JSON.stringify(billRes.body));
    }

    // ---------------------------------------------------------
    // 8. AMBULANCE STAFF LOGIN
    // ---------------------------------------------------------
    console.log("\n--- TEST 8: Ambulance Staff Login ---");
    const ambRes = await request("/api/staff-login", {
        method: "POST",
        body: JSON.stringify({ staffId: "STAFF-HOSP-AMB", password: "admin" })
    });
    if (ambRes.ok && ambRes.body.role === "ambulance") {
        ambToken = ambRes.body.token;
        recordResult("AMBULANCE", "Ambulance Login & Fleet Access", true, `Role=${ambRes.body.role}`);

        const ambFleet = await request("/api/ambulances");
        recordResult("AMBULANCE", "Allowed Task: View Fleet Status", ambFleet.ok, `Ambulances count=${ambFleet.body.ambulances?.length}`);
    } else {
        recordResult("AMBULANCE", "Ambulance Login & Fleet Access", false, JSON.stringify(ambRes.body));
    }

    // ---------------------------------------------------------
    // 9. HOSPITAL ADMIN A (HOSP-001) LOGIN & FULL MANAGEMENT
    // ---------------------------------------------------------
    console.log("\n--- TEST 9: Hospital Admin A (HOSP-001) Complete Management ---");
    const admARes = await request("/api/staff-login", {
        method: "POST",
        body: JSON.stringify({ staffId: "STAFF-HOSP-ADMIN", password: "admin" })
    });
    if (admARes.ok && admARes.body.accountType === "HOSPITAL_ADMIN" && admARes.body.hospitalId === "HOSP-001") {
        adminAToken = admARes.body.token;
        recordResult("HOSPITAL_ADMIN_A", "Identity & Hospital Binding", true, `Admin bound to ${admARes.body.hospitalId}`);

        // Allowed task: View Staff Directory
        const staffListRes = await request("/api/hospitals/HOSP-001/staff", {
            headers: { Authorization: `Bearer ${adminAToken}` }
        });
        recordResult("HOSPITAL_ADMIN_A", "Allowed Task: View Hospital Staff", staffListRes.ok, `Staff count=${staffListRes.body.staff?.length}`);

        // Staff Provisioning Task: Create New Staff for HOSP-001
        const newStaffId = `TEST-STAFF-${Date.now().toString().slice(-4)}`;
        const createStaffRes = await request("/api/hospitals/HOSP-001/staff", {
            method: "POST",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: JSON.stringify({
                name: "Test Receptionist Junior",
                staffId: newStaffId,
                password: "Staff@Junior123",
                role: "receptionist",
                department: "Front Desk",
                email: "junior@aiims.gov.in",
                modules: ["patients", "appointments"],
                permissions: ["view", "create"]
            })
        });
        recordResult("HOSPITAL_ADMIN_A", "Staff Provisioning: Add Staff to HOSP-001", createStaffRes.ok, `Created StaffId=${newStaffId}`);

        // Test newly created staff can log in!
        const juniorLoginRes = await request("/api/staff-login", {
            method: "POST",
            body: JSON.stringify({ staffId: newStaffId, password: "Staff@Junior123" })
        });
        recordResult("HOSPITAL_ADMIN_A", "Verification: Created Staff Successfully Logs In", juniorLoginRes.ok && juniorLoginRes.body.hospitalId === "HOSP-001", `Login OK, HospId=${juniorLoginRes.body.hospitalId}`);

        // Staff Modification: Update junior staff role
        const editStaffRes = await request(`/api/hospitals/HOSP-001/staff/${newStaffId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: JSON.stringify({
                department: "Senior Front Desk",
                status: "Active"
            })
        });
        recordResult("HOSPITAL_ADMIN_A", "Staff Modification: Update Staff Profile", editStaffRes.ok, `Status=${editStaffRes.status}`);

        // Staff Deactivation: Deactivate test staff
        const deactStaffRes = await request(`/api/hospitals/HOSP-001/staff/${newStaffId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: JSON.stringify({ status: "Inactive" })
        });
        recordResult("HOSPITAL_ADMIN_A", "Staff Deactivation: Mark Inactive", deactStaffRes.ok, `Status=${deactStaffRes.status}`);

        // Verify deactivated staff CANNOT log in!
        const inactiveLoginRes = await request("/api/staff-login", {
            method: "POST",
            body: JSON.stringify({ staffId: newStaffId, password: "Staff@Junior123" })
        });
        recordResult("SECURITY", "Inactive Staff Login Must Fail (403)", inactiveLoginRes.status === 403, `Status=${inactiveLoginRes.status} (Expected 403)`);

        // Cross-hospital security test: Admin A cannot create staff in Hospital B (HOSP-002)
        const crossCreateRes = await request("/api/hospitals/HOSP-002/staff", {
            method: "POST",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: JSON.stringify({
                name: "Intruder Staff",
                staffId: "INTRUDER-001",
                password: "admin",
                role: "nurse"
            })
        });
        recordResult("SECURITY", "Admin A -> Hospital B Staff Creation Must Fail (403)", crossCreateRes.status === 403, `Status=${crossCreateRes.status} (Expected 403)`);

        // Cross-hospital security test: Admin A cannot view Hospital B staff directory
        const crossViewRes = await request("/api/hospitals/HOSP-002/staff", {
            headers: { Authorization: `Bearer ${adminAToken}` }
        });
        recordResult("SECURITY", "Admin A -> Hospital B Staff View Must Fail (403)", crossViewRes.status === 403, `Status=${crossViewRes.status} (Expected 403)`);
    } else {
        recordResult("HOSPITAL_ADMIN_A", "Identity & Hospital Binding", false, JSON.stringify(admARes.body));
    }

    // ---------------------------------------------------------
    // 10. HOSPITAL ADMIN B (HOSP-002) LOGIN & ISOLATION
    // ---------------------------------------------------------
    console.log("\n--- TEST 10: Hospital Admin B (HOSP-002) Isolation ---");
    const admBRes = await request("/api/staff-login", {
        method: "POST",
        body: JSON.stringify({ staffId: "STAFF-BRD-ADMIN", password: "admin" })
    });
    if (admBRes.ok && admBRes.body.accountType === "HOSPITAL_ADMIN" && admBRes.body.hospitalId === "HOSP-002") {
        adminBToken = admBRes.body.token;
        recordResult("HOSPITAL_ADMIN_B", "Identity & Hospital Binding", true, `Admin bound to ${admBRes.body.hospitalId}`);

        // Cross-hospital security test: Admin B cannot view Hospital A staff
        const crossViewB = await request("/api/hospitals/HOSP-001/staff", {
            headers: { Authorization: `Bearer ${adminBToken}` }
        });
        recordResult("SECURITY", "Admin B -> Hospital A Staff View Must Fail (403)", crossViewB.status === 403, `Status=${crossViewB.status} (Expected 403)`);
    } else {
        recordResult("HOSPITAL_ADMIN_B", "Identity & Hospital Binding", false, JSON.stringify(admBRes.body));
    }

    // ---------------------------------------------------------
    // 11. SUPER ADMIN LOGIN & SYSTEM-WIDE MANAGEMENT
    // ---------------------------------------------------------
    console.log("\n--- TEST 11: Super Admin System-Wide Authority ---");
    const superRes = await request("/api/staff-login", {
        method: "POST",
        body: JSON.stringify({ staffId: "STAFF-001", password: "admin" })
    });
    if (superRes.ok && superRes.body.accountType === "SUPER_ADMIN") {
        superAdminToken = superRes.body.token;
        recordResult("SUPER_ADMIN", "Super Admin Authentication & Dashboard", true, `AccountType=${superRes.body.accountType}, Target=${superRes.body.targetDashboard}`);

        // View all hospitals
        const allHospRes = await request("/api/admin/hospitals", {
            headers: { Authorization: `Bearer ${superAdminToken}` }
        });
        recordResult("SUPER_ADMIN", "Allowed Task: View All Hospitals in Registry", allHospRes.ok, `Total Hospitals=${allHospRes.body.hospitals?.length}`);

        // Add new hospital
        const testHospCode = `HOSP-TEST-${Date.now().toString().slice(-4)}`;
        const addHospRes = await request("/api/admin/hospitals", {
            method: "POST",
            headers: { Authorization: `Bearer ${superAdminToken}` },
            body: JSON.stringify({
                hospital_id: testHospCode,
                hospital_name: "SmartCity Experimental Trauma Center",
                address: "Medical Enclave Sector 12",
                city: "Gorakhpur",
                phone: "0551-2998877",
                hospital_type: "Specialized Trauma",
                total_beds: 150,
                icu_beds: 25,
                emergency_beds: 20,
                status: "Operational"
            })
        });
        recordResult("SUPER_ADMIN", "System Action: Add New Hospital", addHospRes.ok, `Hospital Created=${testHospCode}`);

        // Assign Hospital Admin to newly created hospital
        const assignRes = await request(`/api/admin/hospitals/${testHospCode}/admin`, {
            method: "POST",
            headers: { Authorization: `Bearer ${superAdminToken}` },
            body: JSON.stringify({
                name: "Dr. Chandra Prakash",
                staffId: `ADMIN-${testHospCode}`,
                password: "Admin@Trauma123",
                email: "admin.trauma@gorakhpur.gov.in"
            })
        });
        recordResult("SUPER_ADMIN", "System Action: Assign Hospital Admin", assignRes.ok, `Admin assigned to ${testHospCode}`);

        // Verify newly assigned Hospital Admin can log in and manage their hospital!
        const newAdminLogin = await request("/api/staff-login", {
            method: "POST",
            body: JSON.stringify({
                staffId: `ADMIN-${testHospCode}`,
                password: "Admin@Trauma123"
            })
        });
        recordResult("SUPER_ADMIN", "Verification: Assigned Admin Logs In Successfully", newAdminLogin.ok && newAdminLogin.body.hospitalId === testHospCode, `HospId=${newAdminLogin.body.hospitalId}`);

        // Clean up test hospital
        const toggleHospRes = await request(`/api/admin/hospitals/${testHospCode}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${superAdminToken}` },
            body: JSON.stringify({ status: "Inactive" })
        });
        recordResult("SUPER_ADMIN", "System Action: Deactivate Hospital Facility", toggleHospRes.ok, `Status updated`);
    } else {
        recordResult("SUPER_ADMIN", "Super Admin Authentication & Dashboard", false, JSON.stringify(superRes.body));
    }

    // ---------------------------------------------------------
    // 12. GENERAL SECURITY NEGATIVE TESTS
    // ---------------------------------------------------------
    console.log("\n--- TEST 12: General Security & Authentication Negative Tests ---");

    // Wrong password test
    const wrongPwRes = await request("/api/staff-login", {
        method: "POST",
        body: JSON.stringify({ staffId: "STAFF-HOSP-REC", password: "wrong_password_xyz" })
    });
    recordResult("SECURITY", "Wrong Password Must Fail (401)", wrongPwRes.status === 401, `Status=${wrongPwRes.status}`);

    // Invalid staff ID test
    const invalidIdRes = await request("/api/staff-login", {
        method: "POST",
        body: JSON.stringify({ staffId: "NON-EXISTENT-STAFF-9999", password: "admin" })
    });
    recordResult("SECURITY", "Invalid Staff ID Must Fail (401)", invalidIdRes.status === 401, `Status=${invalidIdRes.status}`);

    // Staff user attempting Super Admin API endpoint
    const staffBypassRes = await request("/api/admin/hospitals", {
        headers: { Authorization: `Bearer ${recToken}` }
    });
    recordResult("SECURITY", "Staff Attempting Super Admin Endpoint Must Fail (403)", staffBypassRes.status === 403, `Status=${staffBypassRes.status}`);

    // Cross-hospital staff appointment query
    const crossApptRes = await request("/api/hospitals/HOSP-002/appointments", {
        headers: { Authorization: `Bearer ${recToken}` }
    });
    recordResult("SECURITY", "Staff A -> Hospital B Appointments Query Must Fail (403)", crossApptRes.status === 403, `Status=${crossApptRes.status}`);

    console.log("\n============================================================");
    console.log("TEST SUMMARY");
    console.log("============================================================");
    const passedCount = testResults.filter(r => r.passed).length;
    const failedCount = testResults.filter(r => !r.passed).length;
    console.log(`Total Tests Run: ${testResults.length}`);
    console.log(`Passed: ${passedCount}`);
    console.log(`Failed: ${failedCount}`);

    process.exit(failedCount > 0 ? 1 : 0);
}

runAllTests().catch(err => {
    console.error("Test runner encountered an error:", err);
    process.exit(1);
});
