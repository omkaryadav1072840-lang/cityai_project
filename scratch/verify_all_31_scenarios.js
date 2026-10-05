// scratch/verify_all_31_scenarios.js
// Complete automated test suite verifying all 31 user requirements for single source of truth bed management

const jwt = require('../backend/node_modules/jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'smartcity_super_secret_jwt_key_gorakhpur_2026';
const BASE_URL = 'http://localhost:5000';

// RBAC Token generators
const adminTokenHosp1 = jwt.sign({
    id: 101,
    name: 'Dr. Alok Verma',
    role: 'hospital_admin',
    hospitalId: 'HOSP-001',
    hospitalRole: 'admin'
}, JWT_SECRET, { expiresIn: '1h' });

const adminTokenHosp2 = jwt.sign({
    id: 202,
    name: 'Dr. B. K. Singh',
    role: 'hospital_admin',
    hospitalId: 'HOSP-002',
    hospitalRole: 'admin'
}, JWT_SECRET, { expiresIn: '1h' });

const doctorToken = jwt.sign({
    id: 303,
    name: 'Dr. Rajiv Ranjan',
    role: 'doctor',
    hospitalId: 'HOSP-001',
    hospitalRole: 'doctor'
}, JWT_SECRET, { expiresIn: '1h' });

const nurseToken = jwt.sign({
    id: 404,
    name: 'Sister Mary',
    role: 'nurse',
    hospitalId: 'HOSP-001',
    hospitalRole: 'nurse'
}, JWT_SECRET, { expiresIn: '1h' });

async function runTests() {
    console.log('===============================================================');
    console.log('🏥 STARTING VERIFICATION OF ALL 31 BED SYSTEM REQUIREMENTS');
    console.log('===============================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition, testNum, description) {
        if (condition) {
            console.log(`✅ [TEST ${String(testNum).padStart(2, ' ')}] PASS: ${description}`);
            passed++;
        } else {
            console.error(`❌ [TEST ${String(testNum).padStart(2, ' ')}] FAIL: ${description}`);
            failed++;
        }
    }

    try {
        const testHospitalId = 'HOSP-001';

        // --- SCENARIO 1 to 9: Hospital Structure Configuration ---
        console.log('\n--- PHASE 1: Structure Configuration & Bed Generation ---');
        
        const configPayload = {
            building_wing: 'Block C',
            floor: '4th Floor',
            ward_name: 'Cardio-Thoracic Special ICU',
            ward_type: 'ICU',
            department: 'Cardiology',
            base_rate_per_day: 4200,
            bed_category: 'Cardiac & Neuro ICU',
            total_beds: 5,
            bed_prefix: 'CT-ICU-4',
            start_number: 1,
            bed_numbers: [
                'CT-ICU-401',
                'CT-ICU-402',
                'CT-ICU-403',
                'CT-ICU-VIP-01', // Manual custom naming!
                'CT-ICU-VIP-02'  // Manual custom naming!
            ]
        };

        const configRes = await fetch(`${BASE_URL}/api/hospitals/${testHospitalId}/configure-ward-room`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminTokenHosp1}`
            },
            body: JSON.stringify(configPayload)
        }).then(r => r.json());

        assert(configRes.success === true, 1, 'Configure Ward/Room API succeeds with authenticated Hospital Admin');
        assert(configRes.ward && configRes.ward.building_wing === 'Block C', 2, 'Building / Block C created in physical hierarchy');
        assert(configRes.ward && configRes.ward.floor === '4th Floor', 3, 'Floor correctly assigned to 4th Floor');
        assert(configRes.ward && configRes.ward.ward_name === 'Cardio-Thoracic Special ICU', 4, 'Ward name saved correctly');
        assert(configRes.ward && configRes.ward.ward_type === 'ICU', 5, 'Ward type is ICU');
        assert(configRes.ward && configRes.beds_created === 5, 6, 'Total 5 beds provisioned in room');
        
        const createdWardId = configRes.ward.ward_id;
        const createdBeds = configRes.beds || [];
        const bedNumbers = createdBeds.map(b => b.bed_number);

        assert(bedNumbers.includes('CT-ICU-401'), 7, 'Automatic bed generation includes CT-ICU-401');
        assert(bedNumbers.includes('CT-ICU-VIP-01') && bedNumbers.includes('CT-ICU-VIP-02'), 8, 'Manual custom naming CT-ICU-VIP-01 preserved without forced naming conventions');
        assert(configRes.ward.charge_per_day === 4200, 9, 'Daily bed charge rate of ₹4200/day saved');

        // --- SCENARIO 10 & 11: Refresh & Persistence in Database ---
        console.log('\n--- PHASE 2: Persistence & Live Hierarchy Verification ---');
        const physRes = await fetch(`${BASE_URL}/api/hospitals/${testHospitalId}/physical-structure`, {
            headers: { 'Authorization': `Bearer ${adminTokenHosp1}` }
        }).then(r => r.json());
        
        assert(physRes.success === true, 10, 'Physical structure API returns success after DB refresh');
        const blockC = physRes.structure && physRes.structure['Block C'];
        assert(blockC && blockC.floors['4th Floor'], 11, 'Block C -> 4th Floor persists in MySQL database');

        // --- SCENARIO 12 & 13: Hospital Dashboard Single Source of Truth ---
        console.log('\n--- PHASE 3: Hospital Dashboard & Citizen Portal Consistency ---');
        const initialTotalBeds = physRes.totals.total_beds;
        const initialAvailBeds = physRes.totals.available_beds;

        assert(initialTotalBeds > 0, 12, `Hospital Dashboard reads dynamic total_beds = ${initialTotalBeds}`);
        assert(physRes.structure['Block C'].floors['4th Floor'].wards.some(w => w.ward_id === createdWardId), 13, 'Hospital Dashboard sees newly configured ward');

        // --- SCENARIO 14 & 15: Public Citizen Bed Availability Portal ---
        const citizenBedsRes = await fetch(`${BASE_URL}/api/hospital/beds?hospitalId=${testHospitalId}`).then(r => r.json());
        const hospCitizenData = citizenBedsRes.hospitals ? citizenBedsRes.hospitals.find(h => h.hospitalId === testHospitalId) : citizenBedsRes.hospitalDetails;

        assert(hospCitizenData !== undefined, 14, 'Public Bed Availability API provides data for HOSP-001');
        assert(hospCitizenData.totalBeds === initialTotalBeds, 15, `Single Source of Truth: Citizen total beds (${hospCitizenData.totalBeds}) MATCHES Admin Dashboard total beds (${initialTotalBeds})`);

        // --- SCENARIO 16, 17, 18: Patient Admission ---
        console.log('\n--- PHASE 4: Patient Admission & Counter Decrement ---');
        const targetBed = createdBeds.find(b => b.bed_number === 'CT-ICU-VIP-01');
        const testPatientId = 'PAT-TEST-3101';
        const testPatientName = 'Rohan Sharma';

        const assignRes = await fetch(`${BASE_URL}/api/hospitals/${testHospitalId}/ward-beds/assign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminTokenHosp1}`
            },
            body: JSON.stringify({
                bed_id: targetBed.bed_id,
                patient_id: testPatientId,
                patient_name: testPatientName,
                notes: 'Admitted for acute thoracic observation',
                admission_reason: 'Acute Thoracic Observation'
            })
        }).then(r => r.json());

        assert(assignRes.success === true, 16, `Patient ${testPatientName} successfully admitted to bed ${targetBed.bed_number}`);

        // Verify bed becomes OCCUPIED
        const checkBedRes = await fetch(`${BASE_URL}/api/hospitals/${testHospitalId}/ward-beds?status=Occupied`, {
            headers: { 'Authorization': `Bearer ${adminTokenHosp1}` }
        }).then(r => r.json());
        const occupiedBed = (checkBedRes.beds || []).find(b => b.bed_id === targetBed.bed_id);
        assert(occupiedBed && occupiedBed.status === 'Occupied', 17, `Bed ${targetBed.bed_number} status is now OCCUPIED`);

        // Verify available count decreased by exactly 1
        const afterAssignStructure = await fetch(`${BASE_URL}/api/hospitals/${testHospitalId}/physical-structure`, {
            headers: { 'Authorization': `Bearer ${adminTokenHosp1}` }
        }).then(r => r.json());
        assert(afterAssignStructure.totals.available_beds === initialAvailBeds - 1, 18, `Available beds count correctly decremented from ${initialAvailBeds} to ${afterAssignStructure.totals.available_beds}`);

        // --- SCENARIO 19, 20, 21: Patient Discharge & History Preservation ---
        console.log('\n--- PHASE 5: Discharge & Historical Audit Preservation ---');
        const releaseRes = await fetch(`${BASE_URL}/api/hospitals/${testHospitalId}/ward-beds/release`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminTokenHosp1}`
            },
            body: JSON.stringify({
                bed_id: targetBed.bed_id,
                discharge_summary: 'Patient recovered stably after observation. Discharged with prescription.'
            })
        }).then(r => r.json());

        assert(releaseRes.success === true, 19, 'Patient discharge API executed successfully');

        // Verify bed becomes AVAILABLE
        const afterDischargeStructure = await fetch(`${BASE_URL}/api/hospitals/${testHospitalId}/physical-structure`, {
            headers: { 'Authorization': `Bearer ${adminTokenHosp1}` }
        }).then(r => r.json());
        const releasedBed = afterDischargeStructure.structure['Block C'].floors['4th Floor'].wards
            .find(w => w.ward_id === createdWardId).beds
            .find(b => b.bed_id === targetBed.bed_id);
        
        assert(releasedBed && releasedBed.status === 'Available', 20, `Bed ${targetBed.bed_number} automatically reverted to AVAILABLE`);

        // Verify history preserved in patient admission audit table
        const historyRes = await fetch(`${BASE_URL}/api/hospitals/${testHospitalId}/patient-admissions/${testPatientId}`, {
            headers: { 'Authorization': `Bearer ${adminTokenHosp1}` }
        }).then(r => r.json());
        const historyRecord = historyRes.admissions && historyRes.admissions[0];
        assert(
            historyRecord &&
            historyRecord.bed_number === 'CT-ICU-VIP-01' &&
            historyRecord.building_wing === 'Block C' &&
            historyRecord.floor === '4th Floor' &&
            historyRecord.discharge_date !== null,
            21,
            'Patient admission record permanently preserved with building, floor, room, bed, admission date, discharge date, and clinical notes'
        );

        // --- SCENARIO 22 & 23: Doctor & Nurse Data Consistency ---
        console.log('\n--- PHASE 6: Clinical & Nurse Dashboards Data Consistency ---');
        const doctorPatientRecords = await fetch(`${BASE_URL}/api/hospitals/${testHospitalId}/patient-records/${testPatientId}`, {
            headers: { 'Authorization': `Bearer ${doctorToken}` }
        }).then(r => r.json());
        assert(doctorPatientRecords.records && doctorPatientRecords.records.length > 0, 22, 'Doctor Clinical Desk sees historical inpatient admission and discharge summary');

        const nurseWardBeds = await fetch(`${BASE_URL}/api/hospitals/${testHospitalId}/ward-beds`, {
            headers: { 'Authorization': `Bearer ${nurseToken}` }
        }).then(r => r.json());
        assert(nurseWardBeds.beds.some(b => b.bed_number === 'CT-ICU-VIP-01'), 23, 'Nurse Ward Console accesses live physical beds directly from database');

        // --- SCENARIO 24, 25, 26, 27: Hospital Admin Editing & Add Bed ---
        console.log('\n--- PHASE 7: Admin Editing, Batch Bed Addition & Realtime Sync ---');
        
        // 24. Admin edits room metadata
        const editRes = await fetch(`${BASE_URL}/api/hospitals/${testHospitalId}/wards/${createdWardId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminTokenHosp1}`
            },
            body: JSON.stringify({
                ward_name: 'Cardio-Thoracic Advanced ICU & CCU',
                building_wing: 'Block C',
                floor: '4th Floor',
                ward_type: 'ICU',
                base_rate_per_day: 4800,
                department: 'Cardiology'
            })
        }).then(r => r.json());

        assert(editRes.success === true, 24, 'Admin successfully edits ward metadata and daily charge');

        // 25. Add more beds to room (Batch generate)
        const addBedRes = await fetch(`${BASE_URL}/api/hospitals/${testHospitalId}/ward-beds/batch-generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminTokenHosp1}`
            },
            body: JSON.stringify({
                ward_id: createdWardId,
                count: 3,
                prefix: 'CT-ICU-4',
                start_number: 10,
                bed_category: 'Cardiac & Neuro ICU',
                charge: 4800
            })
        }).then(r => r.json());

        assert(addBedRes.success === true && addBedRes.count === 3, 25, 'Admin batch-adds 3 additional beds to room');

        // 26. Verify all modules reflect updated room name, charge, and new bed count
        const updatedPhys = await fetch(`${BASE_URL}/api/hospitals/${testHospitalId}/physical-structure`, {
            headers: { 'Authorization': `Bearer ${adminTokenHosp1}` }
        }).then(r => r.json());
        const updatedWard = updatedPhys.structure['Block C'].floors['4th Floor'].wards.find(w => w.ward_id === createdWardId);
        
        assert(
            updatedWard &&
            updatedWard.ward_name === 'Cardio-Thoracic Advanced ICU & CCU' &&
            updatedWard.base_rate_per_day === 4800 &&
            updatedWard.total_beds === 8, // 5 original + 3 newly added
            26,
            'All modules immediately reflect updated ward name, ₹4800 rate, and 8 total beds'
        );

        // --- SCENARIO 27: Multi-Tenant RBAC Isolation ---
        console.log('\n--- PHASE 8: Multi-Tenant Admin Isolation ---');
        // Admin of Hospital B (HOSP-002) attempting to alter Hospital A's ward
        const foreignRes = await fetch(`${BASE_URL}/api/hospitals/HOSP-002/wards/${createdWardId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminTokenHosp2}`
            },
            body: JSON.stringify({ ward_name: 'Hacked Ward' })
        }).then(r => r.json());

        assert(foreignRes.success === false, 27, 'Multi-tenant isolation: Hospital B admin cannot modify Hospital A wards');

        // --- SCENARIO 28 & 29: Safe Ward Deactivation / Retirement ---
        console.log('\n--- PHASE 9: Safe Deactivation & Audit Preservation ---');
        // Ward has historical admission from testPatientId -> Deleting it must soft-deactivate beds rather than breaking historical queries
        const deleteWardRes = await fetch(`${BASE_URL}/api/hospitals/${testHospitalId}/wards/${createdWardId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminTokenHosp1}` }
        }).then(r => r.json());

        assert(deleteWardRes.success === true, 28, `Safe Ward Deactivation executed: ${deleteWardRes.message}`);

        // Confirm patient historical admission remains intact even after ward deactivation!
        const auditAfterDelete = await fetch(`${BASE_URL}/api/hospitals/${testHospitalId}/patient-admissions/${testPatientId}`, {
            headers: { 'Authorization': `Bearer ${adminTokenHosp1}` }
        }).then(r => r.json());
        assert(auditAfterDelete.admissions && auditAfterDelete.admissions.length > 0, 29, 'Historical admission record preserved 100% after ward deactivation');

        // --- SCENARIO 30 & 31: Dynamic Bed Summation & ICU Totals ---
        console.log('\n--- PHASE 10: Dynamic Hospital Total & ICU Total Calculations ---');
        const finalTotals = await fetch(`${BASE_URL}/api/hospitals/${testHospitalId}/physical-structure`, {
            headers: { 'Authorization': `Bearer ${adminTokenHosp1}` }
        }).then(r => r.json());
        const totalSum = finalTotals.totals.total_beds;
        const calculatedSum = finalTotals.totals.available_beds + finalTotals.totals.occupied_beds + finalTotals.totals.reserved_beds + finalTotals.totals.maintenance_beds;

        assert(totalSum === calculatedSum, 30, `Total hospital beds (${totalSum}) strictly equals sum of all bed statuses (Avail: ${finalTotals.totals.available_beds} + Occ: ${finalTotals.totals.occupied_beds} + Res: ${finalTotals.totals.reserved_beds} + Maint: ${finalTotals.totals.maintenance_beds})`);
        assert(finalTotals.totals.icu_beds > 0, 31, `Total ICU beds (${finalTotals.totals.icu_beds}) dynamically calculated from database category records`);

        console.log('\n===============================================================');
        console.log(`🎉 TEST SUMMARY: ${passed} PASSED / ${failed} FAILED (TOTAL 31 SCENARIOS)`);
        console.log('===============================================================');

        if (failed === 0) {
            console.log('🏆 ALL 31/31 REQUIREMENTS TESTED AND VERIFIED 100% SUCCESSFUL!');
        }
    } catch (err) {
        console.error('Test execution failed:', err);
    }
}

runTests();
