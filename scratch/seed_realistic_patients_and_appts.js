const db = require('../backend/config/db');

async function seedRealisticData() {
    const p = db.promise();
    console.log('Seeding realistic patients and appointments...');

    const realisticPatients = [
        { id: 'PAT-GKP-101', name: 'Ramesh Kumar Verma', age: 46, gender: 'Male', mobile: '9839012341', bg: 'B+' },
        { id: 'PAT-GKP-102', name: 'Sunita Devi', age: 39, gender: 'Female', mobile: '9839012342', bg: 'O+' },
        { id: 'PAT-GKP-103', name: 'Anjali Sharma', age: 28, gender: 'Female', mobile: '9839012343', bg: 'A+' },
        { id: 'PAT-GKP-104', name: 'Mohammed Rizwan', age: 52, gender: 'Male', mobile: '9839012344', bg: 'AB+' },
        { id: 'PAT-GKP-105', name: 'Priya Singh', age: 33, gender: 'Female', mobile: '9839012345', bg: 'O+' },
        { id: 'PAT-GKP-106', name: 'Vikram Singh Rao', age: 61, gender: 'Male', mobile: '9839012346', bg: 'B+' },
        { id: 'PAT-GKP-107', name: 'Pooja Tiwari', age: 24, gender: 'Female', mobile: '9839012347', bg: 'A+' },
        { id: 'PAT-GKP-108', name: 'Manoj Kumar Gupta', age: 48, gender: 'Male', mobile: '9839012348', bg: 'B+' },
        { id: 'PAT-GKP-109', name: 'Deepak Patel', age: 35, gender: 'Male', mobile: '9839012349', bg: 'O-' },
        { id: 'PAT-GKP-110', name: 'Sneha Verma', age: 31, gender: 'Female', mobile: '9839012350', bg: 'A+' },
        { id: 'PAT-GKP-111', name: 'Amit Pandey', age: 42, gender: 'Male', mobile: '9839012351', bg: 'B+' },
        { id: 'PAT-GKP-112', name: 'Neha Agarwal', age: 27, gender: 'Female', mobile: '9839012352', bg: 'AB-' },
        { id: 'PAT-GKP-113', name: 'Rajesh Srivastava', age: 55, gender: 'Male', mobile: '9839012353', bg: 'O+' },
        { id: 'PAT-GKP-114', name: 'Ritu Mishra', age: 36, gender: 'Female', mobile: '9839012354', bg: 'B+' },
        { id: 'PAT-GKP-115', name: 'Harish Chandra', age: 64, gender: 'Male', mobile: '9839012355', bg: 'A+' },
        { id: 'PAT-GKP-116', name: 'Meenakshi Yadav', age: 29, gender: 'Female', mobile: '9839012356', bg: 'O+' },
        { id: 'PAT-GKP-117', name: 'Sanjay Chaurasia', age: 44, gender: 'Male', mobile: '9839012357', bg: 'B+' },
        { id: 'PAT-GKP-118', name: 'Kavita Tripathi', age: 38, gender: 'Female', mobile: '9839012358', bg: 'A+' }
    ];

    for (const pat of realisticPatients) {
        await p.query(`
            INSERT INTO patients (patient_id, name, age, gender, mobile, blood_group, status, hospital_id)
            VALUES (?, ?, ?, ?, ?, ?, 'Active', 'HOSP-GKP-003')
            ON DUPLICATE KEY UPDATE name = VALUES(name), age = VALUES(age), gender = VALUES(gender), mobile = VALUES(mobile), blood_group = VALUES(blood_group)
        `, [pat.id, pat.name, pat.age, pat.gender, pat.mobile, pat.bg]);
    }

    // Clear old test appointments for Park Hospital to make it clean
    await p.query("DELETE FROM appointments WHERE hospital_id = 'HOSP-GKP-003'");

    // Park Hospital appointments schedule for today
    const parkAppts = [
        { pat: realisticPatients[0], doc: 'Dr. Amit Kumar', docId: 'DOC003', dept: 'General Medicine', time: '09:00', status: 'Completed', token: 'T-01' },
        { pat: realisticPatients[1], doc: 'Dr. Amit Kumar', docId: 'DOC003', dept: 'General Medicine', time: '09:20', status: 'Completed', token: 'T-02' },
        { pat: realisticPatients[2], doc: 'Dr. Richa Pandey', docId: 'DOC-GKP-122', dept: 'Gynecology', time: '09:40', status: 'Completed', token: 'T-03' },
        { pat: realisticPatients[3], doc: 'Dr. R. K. Shahi', docId: 'DOC-GKP-141', dept: 'Cardiology', time: '10:00', status: 'In Consultation', token: 'T-04' },
        { pat: realisticPatients[4], doc: 'Dr. Shalini Tripathi', docId: 'DOC-105', dept: 'Pediatrics', time: '10:15', status: 'In Consultation', token: 'T-05' },
        { pat: realisticPatients[5], doc: 'Dr. Vikramaditya Rao', docId: 'DOC-106', dept: 'General Surgery', time: '10:30', status: 'Waiting', token: 'T-06' },
        { pat: realisticPatients[6], doc: 'Dr. Amit Kumar', docId: 'DOC003', dept: 'General Medicine', time: '10:45', status: 'Waiting', token: 'T-07' },
        { pat: realisticPatients[7], doc: 'Dr. Rajesh Mishra', docId: 'DOC-103', dept: 'Orthopedics', time: '11:00', status: 'Waiting', token: 'T-08' },
        { pat: realisticPatients[8], doc: 'Dr. Amit Kumar', docId: 'DOC003', dept: 'General Medicine', time: '11:15', status: 'Waiting', token: 'T-09' },
        { pat: realisticPatients[9], doc: 'Dr. Richa Pandey', docId: 'DOC-GKP-122', dept: 'Gynecology', time: '11:30', status: 'Waiting', token: 'T-10' },
        { pat: realisticPatients[10], doc: 'Dr. R. K. Shahi', docId: 'DOC-GKP-141', dept: 'Cardiology', time: '11:45', status: 'Waiting', token: 'T-11' },
        { pat: realisticPatients[11], doc: 'Dr. Shalini Tripathi', docId: 'DOC-105', dept: 'Pediatrics', time: '12:00', status: 'Confirmed', token: 'T-12' },
        { pat: realisticPatients[12], doc: 'Dr. Vikramaditya Rao', docId: 'DOC-106', dept: 'General Surgery', time: '12:30', status: 'Confirmed', token: 'T-13' },
        { pat: realisticPatients[13], doc: 'Dr. Rajesh Mishra', docId: 'DOC-103', dept: 'Orthopedics', time: '13:00', status: 'Confirmed', token: 'T-14' },
        { pat: realisticPatients[14], doc: 'Dr. Amit Kumar', docId: 'DOC003', dept: 'General Medicine', time: '14:00', status: 'Confirmed', token: 'T-15' },
        { pat: realisticPatients[15], doc: 'Dr. Richa Pandey', docId: 'DOC-GKP-122', dept: 'Gynecology', time: '14:30', status: 'Confirmed', token: 'T-16' }
    ];

    const todayStr = new Date().toISOString().split('T')[0];

    for (const appt of parkAppts) {
        await p.query(`
            INSERT INTO appointments 
            (patient_id, hospital_id, doctor, doctor_id, department, appointment_date, appointment_time, status, token_number, checkin_status)
            VALUES (?, 'HOSP-GKP-003', ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            appt.pat.id,
            appt.doc,
            appt.docId,
            appt.dept,
            todayStr,
            appt.time,
            appt.status,
            appt.token,
            appt.status === 'Completed' ? 'Completed' : (appt.status === 'In Consultation' ? 'In Consultation' : 'Waiting in OPD')
        ]);
    }

    console.log(`✅ Seeded ${parkAppts.length} realistic appointments and ${realisticPatients.length} patients for Park Hospital!`);
    process.exit(0);
}

seedRealisticData().catch(err => {
    console.error('Error seeding realistic data:', err);
    process.exit(1);
});
