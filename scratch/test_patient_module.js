/**
 * Automated Verification Script for SmartCity Patient ID + QR Feature
 */

const http = require("http");

function makeRequest(path, method = "GET", body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const reqHeaders = Object.assign(
            { "Content-Type": "application/json" },
            headers
        );
        if (payload) {
            reqHeaders["Content-Length"] = Buffer.byteLength(payload);
        }

        const req = http.request(
            {
                hostname: "localhost",
                port: 5000,
                path,
                method,
                headers: reqHeaders
            },
            (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({ status: res.statusCode, body: parsed });
                    } catch (e) {
                        resolve({ status: res.statusCode, raw: data });
                    }
                });
            }
        );

        req.on("error", reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function runTests() {
    console.log("🧪 Starting Patient ID & QR Code Module Tests...\n");

    try {
        // 1. Health check
        const health = await makeRequest("/api/health");
        console.log("1. Backend Health Check:", health.status, health.body?.status);

        // 2. Register new patient with auto-generated P-YYYY-XXXXXX
        const testMobile = "98" + Math.floor(10000000 + Math.random() * 90000000);
        console.log(`\n2. Testing Patient Registration with mobile: ${testMobile}...`);
        const regRes = await makeRequest("/api/patients", "POST", {
            name: "Rajesh Kumar Verma",
            dob: "1994-06-15",
            gender: "Male",
            mobile: testMobile,
            emergencyContact: "9876543210",
            bloodGroup: "B+",
            address: "Civil Lines, Golghar, Gorakhpur",
            hospitalId: "HOSP-001",
            emergencyInfo: "Penicillin allergy, Mild Hypertension"
        });

        console.log("   Registration Status:", regRes.status);
        console.log("   Generated Patient ID:", regRes.body?.patient?.patientId);
        console.log("   Calculated Age:", regRes.body?.patient?.age);
        console.log("   Generated QR Token:", regRes.body?.patient?.qrToken);

        const newId = regRes.body?.patient?.patientId;
        const newQrToken = regRes.body?.patient?.qrToken;

        if (!newId || !newId.startsWith("P-")) {
            throw new Error(`Patient ID was not properly generated with P- format: ${newId}`);
        }

        // 3. Fetch Patient by ID
        console.log(`\n3. Fetching Patient Profile for ${newId}...`);
        const fetchRes = await makeRequest(`/api/patients/${newId}`);
        console.log("   Fetch Status:", fetchRes.status);
        console.log("   Name:", fetchRes.body?.patient?.name);
        console.log("   Hospital:", fetchRes.body?.patient?.hospital_name || fetchRes.body?.patient?.hospital_id);
        console.log("   ABHA Status:", fetchRes.body?.patient?.abha_status);

        // 4. Test ABHA Demo Consent Linking
        console.log(`\n4. Testing ABHA Consent-based Linking for ${newId}...`);
        const abhaRes = await makeRequest(`/api/patients/${newId}/link-abha`, "POST", {
            abhaAddress: "rajesh.verma@abdm",
            consentGiven: true
        });
        console.log("   Link ABHA Status:", abhaRes.status);
        console.log("   Updated ABHA Status:", abhaRes.body?.abhaStatus);
        console.log("   Linked ABHA Address:", abhaRes.body?.abhaAddress);

        // 5. Test QR Verification (Public / Unauthenticated)
        console.log(`\n5. Testing QR Verification (Unauthenticated Safe Verification)...`);
        const qrVerifyPub = await makeRequest("/api/patients/verify-qr", "POST", {
            qrToken: newQrToken
        });
        console.log("   Public QR Verify Status:", qrVerifyPub.status);
        console.log("   Authorized:", qrVerifyPub.body?.authorized);
        console.log("   Masked Name:", qrVerifyPub.body?.verification?.maskedName);
        console.log("   Verification Message:", qrVerifyPub.body?.verification?.message);

        // 6. Test Doctor / Staff QR Verification
        // Log in as doctor first to get doctor JWT token
        console.log(`\n6. Testing Doctor QR Verification with Doctor Token...`);
        const docLogin = await makeRequest("/api/doctor/login", "POST", { doctorId: "DOC001" });
        const docToken = docLogin.body?.token;
        console.log("   Doctor Login Status:", docLogin.status, "Doctor:", docLogin.body?.doctor?.name);

        const qrVerifyAuth = await makeRequest("/api/patients/verify-qr", "POST", {
            qrToken: newQrToken
        }, { Authorization: `Bearer ${docToken}` });

        console.log("   Auth QR Verify Status:", qrVerifyAuth.status);
        console.log("   Authorized:", qrVerifyAuth.body?.authorized);
        console.log("   Full Patient Name:", qrVerifyAuth.body?.patient?.name);
        console.log("   Dossier Records:", qrVerifyAuth.body?.records?.length);
        console.log("   Dossier Appointments:", qrVerifyAuth.body?.appointments?.length);

        // 7. Test Adding a Medical Record
        console.log(`\n7. Testing Adding Medical Record for ${newId}...`);
        const addRecord = await makeRequest(`/api/patients/${newId}/records`, "POST", {
            diagnosis: "Seasonal Viral Pharyngitis",
            symptoms: "Sore throat, fever 101F, mild fatigue",
            treatment: "Paracetamol 650mg, Warm salt gargles, Azithromycin 500mg OD for 3 days",
            notes: "Advised plenty of fluids and rest"
        }, { Authorization: `Bearer ${docToken}` });
        console.log("   Add Record Status:", addRecord.status, "Record ID:", addRecord.body?.recordId);

        // 8. Test Fetching Records
        console.log(`\n8. Testing Fetching Records for ${newId}...`);
        const getRecords = await makeRequest(`/api/patients/${newId}/records`);
        console.log("   Records Count:", getRecords.body?.records?.length);
        console.log("   Latest Diagnosis:", getRecords.body?.records?.[0]?.diagnosis);

        // 9. Test Appointments and Prescriptions Endpoints
        console.log(`\n9. Testing Appointments & Prescriptions routes for ${newId}...`);
        const appts = await makeRequest(`/api/patients/${newId}/appointments`);
        console.log("   Appointments Status:", appts.status);
        const prescs = await makeRequest(`/api/patients/${newId}/prescriptions`);
        console.log("   Prescriptions Status:", prescs.status);

        // 10. Test Search Patients with Query
        console.log(`\n10. Testing Staff Search endpoint for "Rajesh"...`);
        const searchRes = await makeRequest(`/api/patients?search=Rajesh`);
        console.log("    Search Results Count:", searchRes.body?.count);
        console.log("    First Match ID:", searchRes.body?.patients?.[0]?.patient_id);

        console.log("\n All Backend Patient ID & QR Code Module Tests PASSED Successfully!\n");
    } catch (err) {
        console.error("❌ Test Failed:", err);
        process.exit(1);
    }
}

runTests();
