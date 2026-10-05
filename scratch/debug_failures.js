const jwt = require('../backend/node_modules/jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'smartcity_super_secret_jwt_key_gorakhpur_2026';
const BASE_URL = 'http://localhost:5000';

const adminTokenHosp1 = jwt.sign({
    id: 101,
    name: 'Dr. Alok Verma',
    role: 'hospital_admin',
    hospitalId: 'HOSP-001',
    hospitalRole: 'admin'
}, JWT_SECRET, { expiresIn: '1h' });

const doctorToken = jwt.sign({
    id: 303,
    name: 'Dr. Rajiv Ranjan',
    role: 'doctor',
    hospitalId: 'HOSP-001',
    hospitalRole: 'doctor'
}, JWT_SECRET, { expiresIn: '1h' });

async function debug() {
    // 1. Check assign
    const beds = await fetch(`${BASE_URL}/api/hospitals/HOSP-001/ward-beds?status=Available`, {
        headers: { 'Authorization': `Bearer ${adminTokenHosp1}` }
    }).then(r => r.json());

    const bed = beds.beds[0];
    console.log('Testing bed assign with bed:', bed.bed_id, bed.bed_number);

    const assignRes = await fetch(`${BASE_URL}/api/hospitals/HOSP-001/ward-beds/assign`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminTokenHosp1}`
        },
        body: JSON.stringify({
            bed_id: bed.bed_id,
            patient_id: 'PAT-DEBUG-1',
            patient_name: 'Test Patient',
            notes: 'Test diagnosis'
        })
    }).then(r => r.json());
    console.log('Assign response:', assignRes);

    // 2. Check release
    const releaseRes = await fetch(`${BASE_URL}/api/hospitals/HOSP-001/ward-beds/release`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminTokenHosp1}`
        },
        body: JSON.stringify({
            bed_id: bed.bed_id,
            discharge_summary: 'Discharged ok'
        })
    }).then(r => r.json());
    console.log('Release response:', releaseRes);

    // 3. Check patient records
    const recordsRes = await fetch(`${BASE_URL}/api/hospitals/HOSP-001/patient-records/PAT-DEBUG-1`, {
        headers: { 'Authorization': `Bearer ${doctorToken}` }
    }).then(r => r.json());
    console.log('Patient records response:', recordsRes);
}

debug();
