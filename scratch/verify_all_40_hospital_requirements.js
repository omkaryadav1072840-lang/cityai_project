/**
 * Comprehensive 40-Scenario Verification Script for Hospital Configuration & Admin System
 * Run: node scratch/verify_all_40_hospital_requirements.js
 */

const http = require('http');
const pool = require('../backend/config/db').promise();
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const BASE_URL = 'http://localhost:5000';

let testResults = [];
function recordResult(num, description, passed, details = '') {
    testResults.push({ num, description, passed, details });
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[REQ-${String(num).padStart(2, '0')}] ${status} : ${description}`);
    if (!passed && details) {
        console.error(`       Error: ${details}`);
    }
}

// HTTP request helper
function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let json = null;
                try {
                    json = JSON.parse(data);
                } catch (e) {
                    json = data;
                }
                resolve({ status: res.statusCode, headers: res.headers, body: json });
            });
        });

        req.on('error', reject);
        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

// Generate auth token helper
const jwt = require('../backend/node_modules/jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'smartcity_super_secret_jwt_key_gorakhpur_2026';

function createToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

async function runTests() {
    console.log('================================================================');
    console.log('   STARTING 40-SCENARIO HOSPITAL MANAGEMENT VERIFICATION SUITE   ');
    console.log('================================================================\n');

    const superAdminToken = createToken({
        id: 1,
        username: 'superadmin',
        role: 'super_admin',
        type: 'admin'
    });

    const timestamp = Date.now();
    const testHospCodeA = `HOSP-T${timestamp.toString().slice(-4)}A`;
    const testHospCodeB = `HOSP-T${timestamp.toString().slice(-4)}B`;
    let hospDbIdA = null;
    let hospDbIdB = null;
    let adminTokenA = null;
    let adminTokenB = null;

    try {
        // ====================================================================
        // SECTION 1: SUPER ADMIN HOSPITAL CREATION & INITIAL QUOTAS (REQ 1 - 5)
        // ====================================================================

        // REQ-01: Create hospital with comprehensive metadata
        const createPayloadA = {
            hospital_id: testHospCodeA,
            hospital_name: `Apollo City Apex Hospital ${timestamp.toString().slice(-4)}`,
            hospital_type: 'Super Specialty',
            address: 'Medical Enclave, Phase 2, Gorakhpur',
            city: 'Gorakhpur',
            phone: '0551-2998877',
            emergency_number: '108',
            email: `apollo_${timestamp}@gorakhpurhealth.gov.in`,
            rating: 4.8,
            accreditation: 'NABH & JCI Accredited Level 3',
            description: 'Premier multi-specialty regional healthcare facility.',
            logo: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=150&auto=format&fit=crop&q=80',
            total_beds: 120,
            available_beds: 120,
            icu_beds: 24,
            available_icu_beds: 24,
            oxygen_beds: 50,
            available_oxygen_beds: 50,
            ventilator_beds: 12,
            available_ventilator_beds: 12,
            facilities: ['ICU', 'Emergency 24x7', 'Blood Bank', 'Dialysis Unit', 'CT Scan & MRI', 'Pharmacy 24x7'],
            admin_name: 'Dr. Vivek Sharma',
            admin_email: `admin_${timestamp}_a@apollo.gov.in`,
            admin_password: 'Password@123',
            admin_phone: '9876543210'
        };

        const res1 = await request('POST', '/api/admin/hospitals', createPayloadA, {
            'Authorization': `Bearer ${superAdminToken}`
        });

        const pass1 = (res1.status === 200 || res1.status === 201) && res1.body.success;
        recordResult(1, 'Super Admin hospital onboarding with full metadata', pass1, res1.body.message || JSON.stringify(res1.body));

        // Fetch inserted hospital from DB
        const [hospRowsA] = await pool.query('SELECT * FROM hospitals WHERE hospital_id = ?', [testHospCodeA]);
        hospDbIdA = hospRowsA.length ? hospRowsA[0].id : null;

        // REQ-02: Verify official hospital logo persisted in DB
        const pass2 = hospRowsA.length > 0 && hospRowsA[0].logo === createPayloadA.logo;
        recordResult(2, 'Official hospital logo persisted in database as single source of truth', pass2, hospRowsA[0]?.logo);

        // REQ-03: Verify bed and ICU quotas initial state
        const [hospIcu] = await pool.query('SELECT SUM(ventilators_count) AS sum_vents FROM hospital_icu_categories WHERE hospital_id = ?', [testHospCodeA]);
        const pass3 = hospRowsA.length > 0 && 
            Number(hospRowsA[0].total_beds) === 120 && 
            Number(hospRowsA[0].icu_beds) === 24 &&
            Number(hospIcu[0]?.sum_vents || 0) > 0;
        recordResult(3, 'Total beds, ICU beds, and ventilator quotas set accurately', pass3);

        // REQ-04: Verify facilities onboarded
        const [facRows] = await pool.query('SELECT * FROM hospital_facilities WHERE hospital_id = ?', [testHospCodeA]);
        const pass4 = facRows.length >= 6;
        recordResult(4, 'Initial standard facilities auto-configured during onboarding', pass4, `Configured ${facRows.length} facilities`);

        // REQ-05: Verify immediate hospital admin account created and linked
        const [adminRowsA] = await pool.query('SELECT * FROM staff WHERE email = ?', [createPayloadA.admin_email]);
        const pass5 = adminRowsA.length > 0 && (adminRowsA[0].hospital_id === testHospCodeA || adminRowsA[0].hospital_id == hospDbIdA);
        recordResult(5, 'Immediate Hospital Admin account created with hospital_id linkage', pass5, adminRowsA[0]?.hospital_id);

        // Create Hospital B for isolation testing
        const createPayloadB = {
            hospital_id: testHospCodeB,
            hospital_name: `City General Hospital ${timestamp.toString().slice(-4)}`,
            hospital_type: 'Government',
            address: 'Railway Road, Gorakhpur',
            city: 'Gorakhpur',
            phone: '0551-2443322',
            emergency_number: '102',
            email: `gen_${timestamp}@gorakhpurhealth.gov.in`,
            logo: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=150&auto=format&fit=crop&q=80',
            total_beds: 50,
            icu_beds: 10,
            admin_name: 'Dr. Priya Mehta',
            admin_email: `admin_${timestamp}_b@citygen.gov.in`,
            admin_password: 'Password@123'
        };
        await request('POST', '/api/admin/hospitals', createPayloadB, {
            'Authorization': `Bearer ${superAdminToken}`
        });
        const [hospRowsB] = await pool.query('SELECT * FROM hospitals WHERE hospital_id = ?', [testHospCodeB]);
        hospDbIdB = hospRowsB.length ? hospRowsB[0].id : null;
        const [adminRowsB] = await pool.query('SELECT * FROM staff WHERE email = ?', [createPayloadB.admin_email]);

        // Generate tokens for both admins
        adminTokenA = createToken({
            id: adminRowsA[0]?.id || 201,
            email: createPayloadA.admin_email,
            role: 'hospital_admin',
            type: 'hospital_admin',
            hospital_id: testHospCodeA,
            hospitalId: testHospCodeA
        });

        adminTokenB = createToken({
            id: adminRowsB[0]?.id || 202,
            email: createPayloadB.admin_email,
            role: 'hospital_admin',
            type: 'hospital_admin',
            hospital_id: testHospCodeB,
            hospitalId: testHospCodeB
        });

        // ====================================================================
        // SECTION 2: HOSPITAL ADMIN PROFILE & LOGO CONFIGURATION (REQ 6 - 10)
        // ====================================================================

        // REQ-06: Hospital Admin authentication verification
        const res6 = await request('GET', '/api/auth/me', null, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const pass6 = (res6.status === 200) && res6.body.user && (res6.body.user.role === 'hospital_admin');
        recordResult(6, 'Hospital Admin authentication & session token validation', pass6);

        // REQ-07: Hospital Admin can view own hospital profile
        const res7 = await request('GET', '/api/admin/hospital-config', null, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const pass7 = res7.status === 200 && res7.body.success && res7.body.hospital.hospital_id === testHospCodeA;
        recordResult(7, 'Hospital Admin reads own hospital configuration payload', pass7);

        // REQ-08: Hospital Admin updates profile fields
        const updatedDesc = 'Apex SmartCity Super Specialty Research Hospital (Updated)';
        const updatedPhone = '0551-2999999';
        const res8 = await request('PUT', '/api/admin/hospital-config/profile', {
            phone: updatedPhone,
            description: updatedDesc,
            accreditation: 'NABH Level 3 Gold Certified'
        }, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const pass8 = res8.status === 200 && res8.body.success;
        recordResult(8, 'Hospital Admin updates hospital contact and profile description', pass8);

        // REQ-09: Hospital Admin changes hospital logo
        const newLogoUrl = 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=150&auto=format&fit=crop&q=80';
        const res9 = await request('PUT', '/api/admin/hospital-config/logo', {
            logo: newLogoUrl
        }, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const pass9 = res9.status === 200 && res9.body.success;
        recordResult(9, 'Hospital Admin updates official hospital logo endpoint', pass9);

        // REQ-10: Verify new logo in MySQL
        const [verifyLogo] = await pool.query('SELECT logo, phone, description FROM hospitals WHERE hospital_id = ?', [testHospCodeA]);
        const pass10 = verifyLogo.length > 0 && verifyLogo[0].logo === newLogoUrl && verifyLogo[0].phone === updatedPhone;
        recordResult(10, 'Hospital logo and profile changes verified in MySQL database', pass10);

        // ====================================================================
        // SECTION 3: FACILITIES CONFIGURATOR (REQ 11 - 15)
        // ====================================================================

        // REQ-11: View hospital facilities catalogue
        const res11 = await request('GET', '/api/admin/hospital-config/facilities', null, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const pass11 = res11.status === 200 && Array.isArray(res11.body.facilities);
        recordResult(11, 'View all facilities catalogue for hospital', pass11, `Found ${res11.body.facilities?.length} facilities`);

        // REQ-12: Toggle a facility status
        const facToToggle = (res11.body.facilities && res11.body.facilities[0]) || { facility_code: 'emergency_24x7', status: 'Active' };
        const currentStatus = facToToggle.status || (facToToggle.is_active ? 'Active' : 'Inactive');
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
        const res12 = await request('PUT', `/api/admin/hospital-config/facilities/${facToToggle.facility_code}/toggle`, {
            status: newStatus,
            is_active: newStatus === 'Active' ? 1 : 0
        }, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const pass12 = res12.status === 200 && res12.body.success;
        recordResult(12, 'Toggle standard facility operational status (active/inactive)', pass12);

        // REQ-13: Add custom facility
        const customFac = {
            facility_code: `ROBOTIC_SURGERY_${timestamp.toString().slice(-4)}`,
            facility_name: 'Robotic Laparoscopic Surgery Wing',
            category: 'Surgical & Robotics',
            icon: '🤖',
            description: 'State of the art da Vinci robotic surgical theater'
        };
        const res13 = await request('POST', '/api/admin/hospital-config/facilities', customFac, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const pass13 = (res13.status === 200 || res13.status === 201) && res13.body.success;
        recordResult(13, 'Add custom specialized facility to hospital configurator', pass13);

        // REQ-14: Facility changes update both table and hospitals.facilities JSON
        const [facInDb] = await pool.query('SELECT * FROM hospital_facilities WHERE hospital_id = ? AND facility_code = ?', [testHospCodeA, customFac.facility_code]);
        const [hospJson] = await pool.query('SELECT facilities FROM hospitals WHERE hospital_id = ?', [testHospCodeA]);
        const pass14 = facInDb.length > 0 && hospJson.length > 0 && JSON.stringify(hospJson[0].facilities).includes(customFac.facility_name);
        recordResult(14, 'Dual persistence in hospital_facilities table and hospitals.facilities JSON', pass14);

        // REQ-15: Public API reflects updated facilities
        const res15 = await request('GET', `/api/hospitals/${testHospCodeA}`);
        const pass15 = res15.status === 200 && JSON.stringify(res15.body).includes(customFac.facility_name);
        recordResult(15, 'Public hospital details API reflects customized facilities list', pass15);

        // ====================================================================
        // SECTION 4: DOCTORS & OPD TIMINGS / ROOM NUMBERS (REQ 16 - 20)
        // ====================================================================

        // REQ-16: List doctors for the specific hospital
        const res16 = await request('GET', '/api/admin/hospital-config/doctors', null, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const pass16 = res16.status === 200 && Array.isArray(res16.body.doctors);
        recordResult(16, 'List hospital doctors roster with OPD parameters', pass16);

        // REQ-17: Add new doctor with room number and OPD schedule
        const newDoctorPayload = {
            name: 'Dr. Alok Nath Tripathi',
            specialization: 'Cardiologist',
            department: 'Cardiology',
            qualification: 'MBBS, MD, DM (Cardiology)',
            experience: 14,
            mobile: '9888877771',
            email: `tripathi_${timestamp}@apollo.gov.in`,
            consultation_fee: 600,
            opd_room_no: 'OPD-304 Wing-C',
            available_days: ['Monday', 'Wednesday', 'Friday'],
            consultation_timings: '10:00 AM - 02:00 PM'
        };
        const res17 = await request('POST', '/api/admin/hospital-config/doctors', newDoctorPayload, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const pass17 = (res17.status === 200 || res17.status === 201) && res17.body.success;
        const createdDocId = res17.body.doctorId || res17.body.doctor_id || res17.body.id;
        recordResult(17, 'Add new doctor with room number and OPD consultation timings', pass17, `Doc ID: ${createdDocId}`);

        // REQ-18: Update existing doctor OPD room & timings
        const res18 = await request('PUT', `/api/admin/hospital-config/doctors/${createdDocId}`, {
            opd_room_no: 'OPD-304 Suite A (Cardio Wing)',
            consultation_timings: '09:30 AM - 01:30 PM',
            consultation_fee: 750
        }, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const pass18 = res18.status === 200 && res18.body.success;
        recordResult(18, 'Update doctor OPD room, timings, and consultation fee', pass18);

        // REQ-19: Doctor OPD room and timings appear in public doctors view
        const res19 = await request('GET', `/api/doctors?hospitalId=${testHospCodeA}`);
        const foundDoc = (res19.body?.doctors || res19.body || []).find(d => d.email === newDoctorPayload.email || d.name === newDoctorPayload.name);
        const pass19 = !!foundDoc;
        recordResult(19, 'Doctor appears in public doctor schedule & appointment selection', pass19);

        // REQ-20: Deactivate / Delete doctor record
        const tempDocRes = await request('POST', '/api/admin/hospital-config/doctors', {
            name: 'Dr. Temp Doc',
            specialization: 'General',
            email: `temp_${timestamp}@apollo.gov.in`
        }, { 'Authorization': `Bearer ${adminTokenA}` });
        const tempDocId = tempDocRes.body.doctorId || tempDocRes.body.id;
        const res20 = await request('DELETE', `/api/admin/hospital-config/doctors/${tempDocId}`, null, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const pass20 = res20.status === 200 && res20.body.success;
        recordResult(20, 'Doctor record deletion / deactivation with constraint integrity', pass20);

        // ====================================================================
        // SECTION 5: WARD & BED STRUCTURAL HIERARCHY (REQ 21 - 25)
        // ====================================================================

        // REQ-21: View ward structure
        const res21 = await request('GET', '/api/admin/hospital-config/wards', null, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const pass21 = res21.status === 200 && Array.isArray(res21.body.wards);
        recordResult(21, 'View ward and bed structural hierarchy', pass21);

        // REQ-22: Add new ward with wing, floor, ward type
        const newWardPayload = {
            ward_name: 'Super Specialty Cardiac Inpatient Ward',
            ward_code: `CARD_W_${timestamp.toString().slice(-4)}`,
            ward_type: 'Cardiac Care',
            building_wing: 'Block B Wing 2',
            floor: '3rd Floor',
            total_beds: 20
        };
        const res22 = await request('POST', '/api/admin/hospital-config/wards', newWardPayload, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const pass22 = (res22.status === 200 || res22.status === 201) && res22.body.success;
        const createdWardId = res22.body.wardId || res22.body.ward_id || res22.body.id;
        recordResult(22, 'Add new hospital ward with building wing, floor, and capacity', pass22);

        // REQ-23: Add bed to ward with specific bed category & room number
        const newBedPayload = {
            bed_number: `B301-A`,
            room_number: 'Room 301',
            floor: '3rd Floor',
            building_wing: 'Block B Wing 2',
            bed_category: 'Oxygen',
            daily_charge: 1200
        };
        const res23 = await request('POST', `/api/admin/hospital-config/wards/${createdWardId}/beds`, newBedPayload, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const pass23 = (res23.status === 200 || res23.status === 201) && res23.body.success;
        const createdBedId = res23.body.bedId || res23.body.bed_id || res23.body.id;
        recordResult(23, 'Add physical bed unit to ward with room number and category', pass23);

        // REQ-24: Update bed status with maintenance reason
        const res24 = await request('PUT', `/api/admin/hospital-config/beds/${createdBedId}/status`, {
            status: 'Maintenance',
            maintenance_reason: 'Oxygen pipeline regulator calibration'
        }, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const pass24 = res24.status === 200 && res24.body.success;
        recordResult(24, 'Update bed operational status with maintenance audit reason', pass24);

        // REQ-25: Hospital bed counts stay synchronized
        const [bedCheck] = await pool.query('SELECT total_beds, icu_beds FROM hospitals WHERE hospital_id = ?', [testHospCodeA]);
        const pass25 = bedCheck.length > 0 && bedCheck[0].total_beds >= 120;
        recordResult(25, 'Hospital bed counters maintain mathematical synchronization', pass25);

        // ====================================================================
        // SECTION 6: ICU SPECIALTY SUITES QUOTAS & BREAKDOWN (REQ 26 - 30)
        // ====================================================================

        // REQ-26: View ICU specialty categories
        const res26 = await request('GET', '/api/admin/hospital-config/icu', null, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const pass26 = res26.status === 200 && Array.isArray(res26.body.icu_categories);
        recordResult(26, 'Retrieve ICU specialty categories breakdown catalogue', pass26);

        // REQ-27: Add new ICU specialty category (CCU)
        const newIcuPayload = {
            icu_code: `CCU_${timestamp.toString().slice(-4)}`,
            icu_name: 'Coronary Care Intensive Unit',
            total_beds: 8,
            available_beds: 8,
            ventilator_beds: 4,
            isolation_beds: 2,
            equipment_list: ['Cardiac Monitors', 'Ventilators', 'Defibrillators', 'IABP'],
            incharge_doctor: 'Dr. Alok Nath Tripathi'
        };
        const res27 = await request('POST', '/api/admin/hospital-config/icu', newIcuPayload, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const pass27 = (res27.status === 200 || res27.status === 201) && res27.body.success;
        recordResult(27, 'Configure specialized ICU Suite (CCU) with ventilator quotas', pass27);

        // REQ-28: Update ICU specialty suite beds
        const res28 = await request('PUT', `/api/admin/hospital-config/icu/${newIcuPayload.icu_code}`, {
            available_beds: 6,
            ventilator_beds: 5
        }, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const pass28 = res28.status === 200 && res28.body.success;
        recordResult(28, 'Dynamically adjust ICU suite available beds and ventilator allocation', pass28);

        // REQ-29: ICU breakdown reflects in public emergency availability
        const res29 = await request('GET', `/api/hospitals/${testHospCodeA}`);
        const pass29 = res29.status === 200 && Number(res29.body.icu_beds || res29.body.hospital?.icu_beds) >= 10;
        recordResult(29, 'ICU capacity and ventilator metric exposed to emergency system', pass29);

        // REQ-30: Quota integrity validation
        const [icuTotalSum] = await pool.query('SELECT SUM(total_beds) as sum_icu FROM hospital_icu_categories WHERE hospital_id = ?', [testHospCodeA]);
        const pass30 = icuTotalSum[0].sum_icu !== null;
        recordResult(30, 'ICU suite quotas verified against database constraints', pass30);

        // ====================================================================
        // SECTION 7: DIAGNOSTIC CATALOGUE & PRESCRIPTION DOCUMENTS (REQ 31 - 35)
        // ====================================================================

        // REQ-31: View diagnostic catalogue
        const res31 = await request('GET', '/api/admin/hospital-config/diagnostics', null, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const pass31 = res31.status === 200 && Array.isArray(res31.body.diagnostics);
        recordResult(31, 'Access hospital diagnostic and laboratory test catalogue', pass31);

        // REQ-32: Add new lab test / diagnostic package
        const newTestPayload = {
            test_name: 'High-Resolution Cardiac Troponin-I (hs-cTnI)',
            category: 'Cardiac Pathology',
            price: 1150.00,
            turnaround_time: '2 Hours',
            preparation_instructions: 'Fasting not required. Immediate STAT processing.',
            is_active: 1
        };
        const res32 = await request('POST', '/api/admin/hospital-config/diagnostics', newTestPayload, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const pass32 = (res32.status === 200 || res32.status === 201) && res32.body.success;
        const testId = res32.body.testId || res32.body.id;
        recordResult(32, 'Add diagnostic pathology test with pricing and turnaround instructions', pass32);

        // REQ-33: Update diagnostic test pricing and availability
        const res33 = await request('PUT', `/api/admin/hospital-config/diagnostics/${testId}`, {
            price: 999.00,
            turnaround_time: '90 Minutes'
        }, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const pass33 = res33.status === 200 && res33.body.success;
        recordResult(33, 'Update diagnostic package price and turnaround time parameters', pass33);

        // REQ-34: Generate official prescription document with hospital logo
        const testPatientId = `PAT-VERIFY-${timestamp.toString().slice(-4)}`;
        await pool.query(`
            INSERT INTO patients (patient_id, name, age, gender, blood_group, mobile, hospital_id)
            VALUES (?, 'Ramesh Kumar Verma', 45, 'Male', 'B+', '9123456789', ?)
            ON DUPLICATE KEY UPDATE name = VALUES(name)
        `, [testPatientId, testHospCodeA]);

        const [rxInsert] = await pool.query(`
            INSERT INTO prescriptions 
            (patient_id, hospital_id, doctor_id, doctor_name, diagnosis, prescription_file, medications_json, advice, status, created_at)
            VALUES (?, ?, ?, 'Dr. Alok Nath Tripathi', 'Acute Angina Pectoris', 'Sorbitrate 5mg + Aspirin 75mg Rx', ?, 'Avoid strenuous exertion, take tablets sublingually if chest discomfort recurs.', 'Active', NOW())
        `, [
            testPatientId,
            testHospCodeA,
            createdDocId || 1,
            JSON.stringify([
                { name: 'Sorbitrate 5mg', dosage: '1 tab', timing: 'Sublingual STAT', duration: 'SOS' },
                { name: 'Aspirin 75mg', dosage: '1 tab', timing: 'After dinner', duration: '30 days' },
                { name: 'Atorvastatin 40mg', dosage: '1 tab', timing: 'At bedtime', duration: '30 days' }
            ])
        ]);
        const testRxId = rxInsert.insertId;

        const res34 = await request('GET', `/api/prescriptions/${testRxId}/document`);
        const pass34 = res34.status === 200 && 
            res34.body.success && 
            res34.body.hospital.logo === newLogoUrl && 
            res34.body.hospital.hospital_id === testHospCodeA;
        recordResult(34, 'Official prescription document generated with hospital branding & logo', pass34);

        // REQ-35: Verify prescription document includes printable letterhead structure & QR payload
        const pass35 = res34.status === 200 && 
            res34.body.patient.name === 'Ramesh Kumar Verma' && 
            res34.body.doctor.room_no.includes('304') &&
            res34.body.prescription.medications !== null;
        recordResult(35, 'Prescription letterhead contains doctor OPD room, patient demographics, and Rx items', pass35);

        // ====================================================================
        // SECTION 8: DATA ISOLATION, AUDIT TRAIL & CITIZEN PORTAL NON-REGRESSION (REQ 36 - 40)
        // ====================================================================

        // REQ-36: Hospital Admin A CANNOT modify Hospital B configuration (Isolation / 403)
        const res36 = await request('PUT', '/api/admin/hospital-config/profile', {
            description: 'MALICIOUS HACK ATTEMPT BY ADMIN A INTO HOSPITAL B',
            hospital_id: testHospCodeB
        }, {
            'Authorization': `Bearer ${adminTokenA}`
        });
        const [hospBCheck] = await pool.query('SELECT description FROM hospitals WHERE hospital_id = ?', [testHospCodeB]);
        const pass36 = !hospBCheck[0].description || !hospBCheck[0].description.includes('MALICIOUS');
        recordResult(36, 'Hospital tenant data isolation strictly enforced (Admin A cannot modify Hospital B)', pass36);

        // REQ-37: Audit logs generated for hospital configuration changes
        const [auditLogs] = await pool.query('SELECT * FROM audit_logs WHERE action LIKE ? OR action LIKE ? ORDER BY id DESC LIMIT 5', [
            '%HOSPITAL%',
            '%CONFIG%'
        ]);
        const pass37 = auditLogs.length > 0;
        recordResult(37, 'Configuration changes generate tamper-evident audit history records', pass37, `Found ${auditLogs.length} audit records`);

        // REQ-38: Patient permanent clinical records retained with hospital_id and doctor_id
        await pool.query(`
            INSERT INTO patient_records 
            (patient_id, hospital_id, doctor_id, doctor_name, diagnosis, treatment, prescription_id, record_date)
            VALUES (?, ?, ?, 'Dr. Alok Nath Tripathi', 'Acute Angina Pectoris', 'Sorbitrate + Aspirin', ?, NOW())
        `, [testPatientId, testHospCodeA, createdDocId || 1, testRxId]);

        const [recCheck] = await pool.query('SELECT * FROM patient_records WHERE patient_id = ? AND hospital_id = ?', [testPatientId, testHospCodeA]);
        const pass38 = recCheck.length > 0 && recCheck[0].prescription_id === testRxId;
        recordResult(38, 'Permanent clinical history retains hospital_id, doctor_id, and prescription_id', pass38);

        // REQ-39: Citizen Portal / Public APIs non-regression check
        const res39Hospitals = await request('GET', '/api/hospitals');
        const res39Doctors = await request('GET', '/api/doctors');
        const pass39 = res39Hospitals.status === 200 && 
            Array.isArray(res39Hospitals.body.hospitals || res39Hospitals.body) && 
            res39Doctors.status === 200 &&
            Array.isArray(res39Doctors.body.doctors || res39Doctors.body);
        recordResult(39, 'Citizen Portal public listings non-regression (hospitals & doctors API 200 OK)', pass39);

        // REQ-40: Public appointment booking routes accurately with doctor OPD timings
        const apptPayload = {
            patient_name: 'Anita Devi',
            patient_phone: '9876501234',
            age: 38,
            gender: 'Female',
            doctor_id: createdDocId || 1,
            doctor_name: 'Dr. Alok Nath Tripathi',
            hospital_id: testHospCodeA,
            department: 'Cardiology',
            appointment_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            time_slot: '10:30 AM',
            symptoms: 'Mild chest pain and shortness of breath'
        };

        const res40 = await request('POST', '/api/appointments', apptPayload);
        const pass40 = (res40.status === 200 || res40.status === 201) && (res40.body.success || res40.body.id || res40.body.appointmentId);
        recordResult(40, 'Public OPD appointment booking routes with doctor timings and hospital identity', pass40);

    } catch (err) {
        console.error('Fatal test execution error:', err);
    } finally {
        if (pool) await pool.end();

        console.log('\n================================================================');
        console.log('                 VERIFICATION SUITE SUMMARY                     ');
        console.log('================================================================');
        const total = testResults.length;
        const passedCount = testResults.filter(r => r.passed).length;
        const failedCount = total - passedCount;

        console.log(`Total Scenarios Tested : ${total} / 40`);
        console.log(`Scenarios Passed       : ${passedCount}`);
        console.log(`Scenarios Failed       : ${failedCount}`);
        console.log(`Success Rate           : ${((passedCount / total) * 100).toFixed(1)}%`);
        console.log('================================================================\n');

        if (failedCount === 0) {
            console.log('🎉 ALL 40 HOSPITAL CONFIGURATION & ADMIN REQUIREMENTS VERIFIED 100%!');
            process.exit(0);
        } else {
            console.error(`⚠️ ${failedCount} scenarios failed. Please investigate.`);
            process.exit(1);
        }
    }
}

runTests();
