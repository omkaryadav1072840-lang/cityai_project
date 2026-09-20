const db = require('../backend/config/db');

async function seedAll() {
    const p = db.promise();
    console.log("=== Starting Complete Healthcare System Seeding ===");

    // 1. UPDATE HOSPITALS: Doctors count, Ambulances count, and total bed metadata
    console.log("1. Updating hospitals metadata...");
    const hospitalUpdates = [
        { id: 'HOSP-001', doctors: 25, ambulances: 6, total: 750, icu: 120, emg: 50 },
        { id: 'HOSP-002', doctors: 12, ambulances: 4, total: 900, icu: 150, emg: 80 },
        { id: 'HOSP-003', doctors: 16, ambulances: 3, total: 300, icu: 40,  emg: 30 },
        { id: 'HOSP-004', doctors: 18, ambulances: 4, total: 350, icu: 60,  emg: 25 },
        { id: 'HOSP-GKP-003', doctors: 22, ambulances: 5, total: 500, icu: 60,  emg: 30 },
        { id: 'HOSP-GKP-005', doctors: 14, ambulances: 4, total: 200, icu: 10,  emg: 15 },
        { id: 'HOSP-GKP-010', doctors: 20, ambulances: 4, total: 350, icu: 45,  emg: 30 },
        { id: 'HOSP-GKP-011', doctors: 10, ambulances: 2, total: 120, icu: 20,  emg: 15 },
        { id: 'HOSP-GKP-012', doctors: 15, ambulances: 3, total: 180, icu: 28,  emg: 20 },
        { id: 'HOSP-GKP-013', doctors: 8,  ambulances: 1, total: 90,  icu: 15,  emg: 10 },
        { id: 'HOSP-GKP-014', doctors: 14, ambulances: 2, total: 150, icu: 25,  emg: 18 },
        { id: 'HOSP-GKP-015', doctors: 11, ambulances: 2, total: 110, icu: 22,  emg: 14 },
        { id: 'HOSP-GKP-016', doctors: 12, ambulances: 2, total: 130, icu: 24,  emg: 16 },
        { id: 'HOSP-GKP-017', doctors: 8,  ambulances: 1, total: 85,  icu: 12,  emg: 10 }
    ];

    for (const h of hospitalUpdates) {
        await p.query(`
            UPDATE hospitals 
            SET doctors_count = ?, ambulance_count = ?, total_beds = ?, icu_beds = ?, emergency_beds = ?
            WHERE hospital_id = ?
        `, [h.doctors, h.ambulances, h.total, h.icu, h.emg, h.id]);
    }
    console.log("✓ Updated all 14 hospitals metadata.");

    // 2. SEED HOSPITAL WARDS FOR BRD MEDICAL COLLEGE (HOSP-002) - 900 TOTAL BEDS
    console.log("2. Seeding hospital_wards for BRD Medical College (HOSP-002)...");
    const brdWards = [
        ['WARD-BRD-GEN-01', 'HOSP-002', 'General Medicine Ward', 'General', '1st Floor - Block A', 350, 260, 100.00],
        ['WARD-BRD-GEN-02', 'HOSP-002', 'General Surgery & Ortho', 'General', '1st Floor - Block B', 200, 160, 100.00],
        ['WARD-BRD-ICU-01', 'HOSP-002', 'Critical Care & Neuro ICU', 'ICU', '2nd Floor - Main Campus', 100, 85, 1000.00],
        ['WARD-BRD-PICU-01', 'HOSP-002', 'Pediatric ICU (PICU)', 'ICU', '2nd Floor - Pediatric Wing', 50, 45, 800.00],
        ['WARD-BRD-EMG-01', 'HOSP-002', 'Trauma & Emergency Care', 'Emergency', 'Ground Floor - Trauma Center', 80, 65, 500.00],
        ['WARD-BRD-PVT-01', 'HOSP-002', 'Special & Post-Op Recovery', 'Private', '3rd Floor - Tower', 120, 80, 1200.00]
    ];

    for (const w of brdWards) {
        await p.query(`
            INSERT INTO hospital_wards (ward_id, hospital_id, ward_name, ward_type, floor, total_beds, occupied_beds, charge_per_day)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                ward_name = VALUES(ward_name), total_beds = VALUES(total_beds), occupied_beds = VALUES(occupied_beds)
        `, w);
    }

    // Seed wards for other hospitals if they have none
    const otherHospitals = [
        { id: 'HOSP-003', name: 'District Hospital', total: 300, icu: 40, emg: 30 },
        { id: 'HOSP-004', name: 'Fatima Hospital', total: 350, icu: 60, emg: 25 },
        { id: 'HOSP-GKP-010', name: 'Gorakshnath Hospital', total: 350, icu: 45, emg: 30 }
    ];

    for (const oh of otherHospitals) {
        const genBeds = oh.total - (oh.icu + oh.emg);
        await p.query(`
            INSERT IGNORE INTO hospital_wards (ward_id, hospital_id, ward_name, ward_type, floor, total_beds, occupied_beds, charge_per_day) VALUES
            (?, ?, 'General Medicine Ward', 'General', '1st Floor', ?, ?, 150.00),
            (?, ?, 'Intensive Care Unit (ICU)', 'ICU', '2nd Floor', ?, ?, 1500.00),
            (?, ?, 'Trauma & Emergency Ward', 'Emergency', 'Ground Floor', ?, ?, 800.00)
        `, [
            `WARD-${oh.id}-GEN`, oh.id, genBeds, Math.round(genBeds * 0.7),
            `WARD-${oh.id}-ICU`, oh.id, oh.icu, Math.round(oh.icu * 0.8),
            `WARD-${oh.id}-EMG`, oh.id, oh.emg, Math.round(oh.emg * 0.75)
        ]);
    }
    console.log("✓ Seeded hospital_wards.");

    // 3. SEED HOSPITAL WARD BEDS FOR BRD MEDICAL COLLEGE
    console.log("3. Seeding hospital_ward_beds for BRD...");
    const brdBeds = [
        ['BED-BRD-ICU-01', 'HOSP-002', 'WARD-BRD-ICU-01', 'ICU-B1', 'ICU', 'Occupied', 'PAT-5931984821', 'Omkar Yadav', '2026-09-19 09:00:00', 'Post-procedure observation'],
        ['BED-BRD-ICU-02', 'HOSP-002', 'WARD-BRD-ICU-01', 'ICU-B2', 'ICU', 'Occupied', 'PAT-1002348', 'Ramesh Kumar', '2026-09-18 14:20:00', 'Cardiac telemetry'],
        ['BED-BRD-ICU-03', 'HOSP-002', 'WARD-BRD-ICU-01', 'ICU-B3', 'ICU', 'Available', null, null, null, 'Cleaned & sanitized'],
        ['BED-BRD-EMG-01', 'HOSP-002', 'WARD-BRD-EMG-01', 'EMG-B1', 'Emergency', 'Occupied', 'PAT-1009941', 'Sunita Devi', '2026-09-20 04:30:00', 'Acute trauma intake'],
        ['BED-BRD-EMG-02', 'HOSP-002', 'WARD-BRD-EMG-01', 'EMG-B2', 'Emergency', 'Occupied', 'P-2026-000004', 'Omkar Test Patient', '2026-09-20 06:15:00', 'Emergency observation'],
        ['BED-BRD-EMG-03', 'HOSP-002', 'WARD-BRD-EMG-01', 'EMG-B3', 'Emergency', 'Available', null, null, null, 'Ready for intake'],
        ['BED-BRD-GEN-01', 'HOSP-002', 'WARD-BRD-GEN-01', 'GEN-B1', 'General', 'Occupied', 'PAT-1009941', 'Sunita Devi', '2026-09-17 11:00:00', 'Recovery - pending discharge'],
        ['BED-BRD-GEN-02', 'HOSP-002', 'WARD-BRD-GEN-01', 'GEN-B2', 'General', 'Reserved', null, null, null, 'Reserved - pending admission'],
        ['BED-BRD-GEN-03', 'HOSP-002', 'WARD-BRD-GEN-01', 'GEN-B3', 'General', 'Available', null, null, null, 'Sanitized general bed']
    ];

    for (const b of brdBeds) {
        await p.query(`
            INSERT INTO hospital_ward_beds (bed_id, hospital_id, ward_id, bed_number, bed_type, status, patient_id, patient_name, admission_date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE status = VALUES(status), patient_id = VALUES(patient_id), patient_name = VALUES(patient_name), notes = VALUES(notes)
        `, b);
    }
    console.log("✓ Seeded hospital_ward_beds for BRD.");

    // 4. SEED HOSPITAL BED CATEGORIES FOR ALL 14 HOSPITALS
    console.log("4. Seeding hospital_bed_categories for all 14 hospitals...");
    for (const h of hospitalUpdates) {
        const gen = h.total - (h.icu + h.emg);
        const cats = [
            ['General Ward', gen, Math.round(gen * 0.72)],
            ['ICU', h.icu, Math.round(h.icu * 0.85)],
            ['Emergency Trauma', h.emg, Math.round(h.emg * 0.78)]
        ];
        for (const [cat, total, occupied] of cats) {
            await p.query(`
                INSERT INTO hospital_bed_categories (hospital_id, category, total_beds, occupied_beds)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE total_beds = VALUES(total_beds), occupied_beds = VALUES(occupied_beds)
            `, [h.id, cat, total, occupied]);
        }
    }
    console.log("✓ Seeded bed categories for all 14 hospitals.");

    // 5. SEED DOCTORS FOR ALL HOSPITALS
    console.log("5. Seeding doctors for all hospitals...");
    const extraDoctors = [
        // BRD Medical College (HOSP-002) - Add more doctors so count matches 12
        ['DOC-BRD-01', 'HOSP-002', 'Dr. Manisha Pandey', 'Cardiologist', 'Cardiology', 'MBBS, MD, DM', 15, '9415022001', 'manisha.pandey@brdmc.ac.in', 200.00, 'Available'],
        ['DOC-BRD-02', 'HOSP-002', 'Dr. Alok Kumar Rai', 'Orthopedic Surgeon', 'Orthopedics', 'MBBS, MS', 18, '9415022002', 'alok.rai@brdmc.ac.in', 150.00, 'Available'],
        ['DOC-BRD-03', 'HOSP-002', 'Dr. Rekha Srivastava', 'Gynecologist & Obstetrician', 'Gynecology', 'MBBS, MS, DGO', 14, '9415022003', 'rekha.sri@brdmc.ac.in', 150.00, 'Available'],
        ['DOC-BRD-04', 'HOSP-002', 'Dr. Tariq Anwar', 'Neurologist', 'Neurology', 'MBBS, MD, DM', 12, '9415022004', 'tariq.anwar@brdmc.ac.in', 250.00, 'Available'],
        ['DOC-BRD-05', 'HOSP-002', 'Dr. Swati Mishra', 'Dermatologist', 'Dermatology', 'MBBS, MD', 8, '9415022005', 'swati.m@brdmc.ac.in', 150.00, 'Available'],
        ['DOC-BRD-06', 'HOSP-002', 'Dr. Rajendra Prasad', 'Pulmonologist', 'Pulmonology', 'MBBS, DTCD, MD', 20, '9415022006', 'rajendra.p@brdmc.ac.in', 180.00, 'Available'],
        ['DOC-BRD-07', 'HOSP-002', 'Dr. Ananya Sen', 'General Physician', 'General Medicine', 'MBBS, MD', 7, '9415022007', 'ananya.sen@brdmc.ac.in', 100.00, 'Available'],
        ['DOC-BRD-08', 'HOSP-002', 'Dr. Vivek Upadhyay', 'ENT Specialist', 'ENT', 'MBBS, MS (ENT)', 11, '9415022008', 'vivek.u@brdmc.ac.in', 150.00, 'Available'],
        ['DOC-BRD-09', 'HOSP-002', 'Dr. Nidhi Yadav', 'Ophthalmologist', 'Ophthalmology', 'MBBS, MS (Ophth)', 9, '9415022009', 'nidhi.y@brdmc.ac.in', 150.00, 'Available'],

        // Guru Shri Gorakshnath Hospital (HOSP-GKP-010)
        ['DOC-GKP-101', 'HOSP-GKP-010', 'Dr. Mahant S. Nath', 'General Medicine', 'Medicine', 'MBBS, MD', 16, '9415033001', 'doctor@gorakshnath.org', 100.00, 'Available'],
        ['DOC-GKP-102', 'HOSP-GKP-010', 'Dr. Kavita Dubey', 'Pediatrician', 'Pediatrics', 'MBBS, DCH', 10, '9415033002', 'kavita@gorakshnath.org', 100.00, 'Available'],
        ['DOC-GKP-103', 'HOSP-GKP-010', 'Dr. Sunil K. Jha', 'General Surgeon', 'General Surgery', 'MBBS, MS', 14, '9415033003', 'sunil@gorakshnath.org', 150.00, 'Available'],

        // City Hospital & Trauma Centre (HOSP-GKP-011)
        ['DOC-GKP-111', 'HOSP-GKP-011', 'Dr. Ashish Agarwal', 'Trauma & Critical Care', 'Trauma Care', 'MBBS, MS', 12, '9415044001', 'ashish@cityhospital.com', 400.00, 'Available'],
        ['DOC-GKP-112', 'HOSP-GKP-011', 'Dr. Pooja Mehrotra', 'Physician', 'Medicine', 'MBBS, MD', 9, '9415044002', 'pooja@cityhospital.com', 300.00, 'Available'],

        // Heritage Hospital (HOSP-GKP-012)
        ['DOC-GKP-121', 'HOSP-GKP-012', 'Dr. Sudhir Saxena', 'Cardiologist', 'Cardiology', 'MBBS, MD, DM', 15, '9415055001', 'sudhir@heritagegkp.com', 500.00, 'Available'],
        ['DOC-GKP-122', 'HOSP-GKP-012', 'Dr. Richa Pandey', 'Gynecologist', 'Obstetrics', 'MBBS, MS', 11, '9415055002', 'richa@heritagegkp.com', 450.00, 'Available'],

        // Rana Hospital (HOSP-GKP-013)
        ['DOC-GKP-131', 'HOSP-GKP-013', 'Dr. Arvind Rana', 'Laparoscopic Surgeon', 'Surgery', 'MBBS, MS, FIAGES', 17, '9415066001', 'arvind@ranahospital.com', 400.00, 'Available'],

        // Shahi Global Hospital (HOSP-GKP-014)
        ['DOC-GKP-141', 'HOSP-GKP-014', 'Dr. R. K. Shahi', 'Interventional Cardiologist', 'Cardiology', 'MBBS, MD, DM', 19, '9415077001', 'shahi@shahiglobal.com', 500.00, 'Available'],

        // Lifeline Hospital (HOSP-GKP-015)
        ['DOC-GKP-151', 'HOSP-GKP-015', 'Dr. Gaurav Asthana', 'Cardiac Surgeon', 'Cardiology', 'MBBS, MCh', 13, '9415088001', 'gaurav@lifelinegkp.com', 600.00, 'Available'],

        // Pulse Hospital (HOSP-GKP-016)
        ['DOC-GKP-161', 'HOSP-GKP-016', 'Dr. Deepak Chaurasia', 'Critical Care Specialist', 'Intensive Care', 'MBBS, MD, IDCCM', 11, '9415099001', 'deepak@pulsehospital.com', 450.00, 'Available'],

        // Anandeshwar Hospital (HOSP-GKP-017)
        ['DOC-GKP-171', 'HOSP-GKP-017', 'Dr. Anita Anand', 'Gynecologist & Obstetrician', 'Gynecology', 'MBBS, MS', 14, '9415011991', 'anita@anandeshwar.com', 300.00, 'Available']
    ];

    for (const d of extraDoctors) {
        await p.query(`
            INSERT INTO doctors (doctor_id, hospital_id, name, specialization, department, qualification, experience, mobile, email, consultation_fee, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                status = VALUES(status), specialization = VALUES(specialization), consultation_fee = VALUES(consultation_fee)
        `, d);
    }
    console.log("✓ Seeded doctors for all hospitals.");

    // 6. SEED DIAGNOSTIC TESTS FOR BRD AND OTHER HOSPITALS
    console.log("6. Seeding diagnostic tests across all hospitals...");
    const standardTests = [
        ['TEST-CBC', 'CAT-PATH', 'PATHOLOGY', 'Complete Blood Count (CBC) with ESR', 'CBC', '🩸', 'Measures red blood cells, white blood cells, platelets, and hemoglobin.', 'Standard hemogram investigation.', 'Assesses overall blood health, immune status, anemia, infections.', 'Blood (EDTA 2ml)', 'No special preparation needed.', 0, '2 to 4 Hours', 180.00, 'Central Pathology Lab', 'Pathology'],
        ['TEST-LFT', 'CAT-PATH', 'PATHOLOGY', 'Liver Function Test (LFT Profile)', 'LFT', '🧪', 'Evaluates total protein, albumin, bilirubin, AST, ALT, alkaline phosphatase.', 'Comprehensive liver profile.', 'Monitors liver health and detects hepatic disorders.', 'Blood (Serum 3ml)', 'Overnight fasting of 8 hours recommended.', 1, '4 to 6 Hours', 450.00, 'Biochemistry Wing', 'Biochemistry'],
        ['TEST-KFT', 'CAT-PATH', 'PATHOLOGY', 'Kidney Function Test (KFT Profile)', 'KFT', '🧬', 'Measures creatinine, urea, BUN, uric acid, and electrolytes.', 'Renal function assessment.', 'Checks renal clearance and kidney health.', 'Blood (Serum 3ml)', 'Overnight fasting recommended.', 1, '4 to 6 Hours', 400.00, 'Biochemistry Wing', 'Biochemistry'],
        ['TEST-LIP', 'CAT-PATH', 'PATHOLOGY', 'Lipid Profile (Cholesterol & Triglycerides)', 'LIPID', '🫀', 'Measures Total Cholesterol, HDL, LDL, VLDL, and Triglycerides.', 'Cardiac risk stratification.', 'Cardiovascular risk evaluation.', 'Blood (Serum 3ml)', 'Strict 10-12 hours fasting required.', 1, '4 to 6 Hours', 400.00, 'Biochemistry Wing', 'Biochemistry'],
        ['TEST-BSF', 'CAT-PATH', 'PATHOLOGY', 'Blood Sugar Fasting & Post-Prandial', 'FBS', '🩺', 'Checks blood glucose level after 8-10 hours fasting and 2h post-meal.', 'Essential diabetes monitoring.', 'Screens for diabetes mellitus.', 'Blood (Fluoride 2ml)', 'Strict 8-10 hours fasting.', 1, '1 to 2 Hours', 90.00, 'Central Pathology Lab', 'Pathology'],
        ['TEST-THY', 'CAT-PATH', 'PATHOLOGY', 'Thyroid Profile Total (T3, T4, TSH)', 'THYROID', '🦋', 'Measures Triiodothyronine, Thyroxine, and TSH.', 'Thyroid gland activity evaluation.', 'Diagnoses hypo- and hyper-thyroidism.', 'Blood (Serum 3ml)', 'Early morning sample preferred.', 0, '6 to 8 Hours', 350.00, 'Endocrinology Lab', 'Endocrinology'],
        ['TEST-XRY', 'CAT-RAD', 'RADIOLOGY', 'Digital X-Ray Chest PA View', 'XRAY_CHEST', '🩻', 'High-resolution digital radiograph of chest cavity and lungs.', 'Screens for pneumonia, bronchitis, cardiomegaly, fractures.', 'Examines lungs and heart.', 'None (Imaging)', 'Remove all metal jewelry.', 0, '1 to 2 Hours', 200.00, 'Digital Radiology Wing', 'Radiology'],
        ['TEST-ECG', 'CAT-CARD', 'CARDIOLOGY', '12-Lead Electrocardiogram (ECG)', 'ECG_12L', '📈', 'Records electrical activity of heart to detect rhythm disturbances.', 'Baseline cardiac check for chest pain.', 'Diagnoses arrhythmias, infarction, ischemia.', 'None (Electrodes)', 'Rest 5 minutes prior.', 0, '20 Mins', 100.00, 'Cardiac Diagnostic Wing', 'Cardiology'],
        ['TEST-CT',  'CAT-RAD', 'RADIOLOGY', '128-Slice CT Scan Brain / Head', 'CT_BRAIN', '🧠', 'Cross-sectional computed tomography of brain and skull bones.', 'Fast diagnostic imaging for stroke, trauma, headache.', 'Emergency trauma assessment.', 'None (Imaging)', '4h fasting if IV contrast is prescribed.', 0, '2 to 4 Hours', 1500.00, 'Advanced CT Suite', 'Radiology'],
        ['TEST-MRI', 'CAT-RAD', 'RADIOLOGY', '3T MRI Lumbar Spine / Brain', 'MRI_SPINE', '🧲', 'Magnetic resonance imaging with superior soft tissue detail.', 'Evaluates disc herniation, spinal stenosis, sciatica.', 'Neuro and spine diagnostics.', 'None (Imaging)', 'Remove all metal objects.', 0, '4 to 6 Hours', 3000.00, 'Advanced MRI Suite', 'Radiology']
    ];

    // Seed standard tests for each hospital ID
    for (const h of hospitalUpdates) {
        for (const st of standardTests) {
            const testId = `${st[0]}-${h.id}`;
            await p.query(`
                INSERT INTO diagnostic_tests
                (test_id, hospital_id, category_id, category_code, name, code, icon, short_description, full_description, purpose, sample_required, prep_instructions, fasting_required, estimated_report_time, price, online_booking, offline_booking, home_collection, emergency_available, daily_slots, current_token, now_serving, estimated_wait_time, laboratory_name, department)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, 1, 50, 'A-010', 'A-007', '15 Mins', ?, ?)
                ON DUPLICATE KEY UPDATE price = VALUES(price), name = VALUES(name)
            `, [testId, h.id, st[1], st[2], st[3], `${st[4]}_${h.id}`, st[5], st[6], st[7], st[8], st[9], st[10], st[11], st[12], st[13], st[14], st[15]]);
        }
    }
    console.log("✓ Seeded diagnostic tests for all 14 hospitals.");

    // 6.5 SEED DEMO PATIENTS
    console.log("6.5 Seeding demo patients...");
    const demoPatients = [
        ['PAT-1002348', 'Ramesh Kumar', '1981-05-12', 45, 'Male', '9415011002', 'B+', 'Golghar, Gorakhpur', 'HOSP-002', 'Active'],
        ['PAT-1009941', 'Sunita Devi', '1988-08-20', 38, 'Female', '9415011004', 'O+', 'Medical Road, Gorakhpur', 'HOSP-002', 'Active']
    ];
    for (const dp of demoPatients) {
        await p.query(`
            INSERT IGNORE INTO patients (patient_id, name, dob, age, gender, mobile, blood_group, address, hospital_id, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, dp);
    }
    console.log("✓ Demo patients verified.");

    // 7. SEED TODAY'S APPOINTMENTS FOR BRD MEDICAL COLLEGE (HOSP-002)
    console.log("7. Seeding today's appointments for BRD...");
    const today = new Date().toISOString().split('T')[0];
    const brdAppts = [
        ['P-2026-000004', 'HOSP-002', 'Dr. Rahul Sharma', 'DOC001', today, '09:30:00', 'Confirmed', 'T-01', 'Waiting in OPD', 'Cardiology'],
        ['PAT-5931984821', 'HOSP-002', 'Dr. Rahul Sharma', 'DOC001', today, '10:00:00', 'In Consultation', 'T-02', 'In Consultation Room', 'Cardiology'],
        ['PAT-1002348', 'HOSP-002', 'Dr. Sanjay Gupta', 'DOC-104', today, '10:30:00', 'Confirmed', 'T-03', 'Waiting in OPD', 'General Medicine'],
        ['PAT-1009941', 'HOSP-002', 'Dr. Shalini Tripathi', 'DOC-105', today, '11:00:00', 'Completed', 'T-04', 'Consultation Complete', 'Pediatrics']
    ];

    for (const a of brdAppts) {
        await p.query(`
            INSERT INTO appointments (patient_id, hospital_id, doctor, doctor_id, appointment_date, appointment_time, status, token_number, checkin_status, department)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE status = VALUES(status), token_number = VALUES(token_number)
        `, a);
    }
    console.log("✓ Seeded today's appointments for BRD.");

    // 8. SEED TEST BOOKINGS FOR BRD MEDICAL COLLEGE
    console.log("8. Seeding test bookings for BRD...");
    const brdTestBookings = [
        ['TB-BRD-001', 'ONLINE', 'HOSP-002', 'TEST-CBC-HOSP-002', 'Complete Blood Count (CBC) with ESR', 'PAT-5931984821', 'Omkar Yadav', '9876543210', 22, 'Male', 'DOC001', 'Dr. Rahul Sharma', today, '09:00 AM', 'A-012', 180.00, 'UPI', 'Paid', 'Hospital Lab', 'REPORT READY', 'QR-TB-BRD01'],
        ['TB-BRD-002', 'ONLINE', 'HOSP-002', 'TEST-LIP-HOSP-002', 'Lipid Profile (Cholesterol & Triglycerides)', 'P-2026-000004', 'Omkar Test Patient', '9876543210', 26, 'Male', 'DOC001', 'Dr. Rahul Sharma', today, '09:30 AM', 'L-008', 400.00, 'UPI', 'Paid', 'Hospital Lab', 'PROCESSING', 'QR-TB-BRD02'],
        ['TB-BRD-003', 'ONLINE', 'HOSP-002', 'TEST-XRY-HOSP-002', 'Digital X-Ray Chest PA View', 'PAT-1002348', 'Ramesh Kumar', '9415011002', 45, 'Male', 'DOC-104', 'Dr. Sanjay Gupta', today, '10:00 AM', 'X-005', 200.00, 'Cash', 'Pending', 'Hospital Lab', 'BOOKED', 'QR-TB-BRD03'],
        ['TB-BRD-004', 'ONLINE', 'HOSP-002', 'TEST-ECG-HOSP-002', '12-Lead Electrocardiogram (ECG)', 'PAT-1009941', 'Sunita Devi', '9415011004', 38, 'Female', 'DOC001', 'Dr. Rahul Sharma', today, '10:30 AM', 'E-014', 100.00, 'UPI', 'Paid', 'Hospital Lab', 'REPORT READY', 'QR-TB-BRD04']
    ];

    for (const tb of brdTestBookings) {
        await p.query(`
            INSERT INTO test_bookings 
            (booking_id, booking_type, hospital_id, test_id, test_name, patient_id, patient_name, patient_mobile, patient_age, patient_gender, doctor_id, doctor_name, booking_date, time_slot, token_number, amount, payment_method, payment_status, collection_type, status, qr_token)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE status = VALUES(status), token_number = VALUES(token_number)
        `, tb);
    }
    console.log("✓ Seeded test bookings for BRD.");

    // 9. CLEAN UP DUPLICATE MEDICINES IN PHARMACY (Deduplicate without breaking bill item foreign keys)
    console.log("9. Cleaning up duplicate medicines in pharmacy...");
    await p.query(`
        UPDATE pharmacy 
        SET medicine_name = 'Ibuprofen 400mg', category = 'Pain Relief & Anti-inflammatory', price = 35.00
        WHERE id = 1 AND medicine_name = 'Paracetamol'
    `);
    await p.query(`
        UPDATE pharmacy 
        SET medicine_name = 'Ciprofloxacin 500mg', category = 'Antibiotic', price = 95.00
        WHERE id = 2 AND medicine_name = 'Amoxicillin'
    `);
    console.log("✓ Deduplicated pharmacy medicines.");

    // 10. SEED AMBULANCES FOR BRD & GORAKSHNATH
    console.log("10. Seeding ambulances...");
    const ambulances = [
        ['AMB-BRD-01', 'UP 53 AG 1201', 'Satish Rai', '9415012001', 'Advanced Cardiac Life Support (ACLS)', 'BRD Medical College', 'Medical Road Emergency Gate', 'Available', 26.7884000, 83.3986000],
        ['AMB-BRD-02', 'UP 53 AG 1202', 'Manish Yadav', '9415012002', 'Basic Life Support (BLS)', 'BRD Medical College', 'Trauma Centre Standby', 'Available', 26.7884000, 83.3986000],
        ['AMB-BRD-03', 'UP 53 AG 1203', 'Raju Verma', '9415012003', 'Patient Transport Vehicle (PTV)', 'BRD Medical College', 'Asuran Chauraha Outpost', 'Available', 26.7720000, 83.3780000],
        ['AMB-BRD-04', 'UP 53 AG 1204', 'Deepak Tiwari', '9415012004', 'Neonatal Intensive Care Ambulance', 'BRD Medical College', 'Pediatric Wing Standby', 'Available', 26.7884000, 83.3986000],
        ['AMB-GKP-10', 'UP 53 AG 1301', 'Sunil Chauhan', '9415013001', 'Basic Life Support (BLS)', 'Guru Shri Gorakshnath Hospital', 'Gorakhnath Mandir Gate', 'Available', 26.7915000, 83.3562000]
    ];

    for (const amb of ambulances) {
        await p.query(`
            INSERT INTO ambulances (ambulance_id, vehicle_number, driver_name, driver_mobile, ambulance_type, hospital_name, location, status, latitude, longitude)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE status = VALUES(status), location = VALUES(location)
        `, amb);
    }
    console.log("✓ Seeded ambulances.");

    console.log("=== All Healthcare Seeding Completed Successfully! ===");
    process.exit(0);
}

seedAll().catch(err => {
    console.error("Seeding error:", err);
    process.exit(1);
});
