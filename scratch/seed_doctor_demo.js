const db = require('../backend/config/db');

async function seedDoctorDemoData() {
    console.log('Seeding rich clinical history for doctor portal demo...');

    // 1. Enrich patient records with varied hospital visits
    await db.promise().query(`
        DELETE FROM patient_records WHERE patient_id IN ('PAT-5931984821', 'SC-2026-318028')
    `);

    await db.promise().query(`
        INSERT INTO patient_records 
        (patient_id, doctor_name, diagnosis, symptoms, treatment, notes, record_date)
        VALUES
        ('PAT-5931984821', 'Dr. Rajesh Sharma (Cardiologist, AIIMS Gorakhpur)', 'Grade 1 Essential Hypertension', 'Occasional morning headaches, mild palpitation upon exertion', '1. Tab Telmisartan 40mg OD in morning\\n2. Tab Amlodipine 5mg OD\\n3. Low sodium DASH diet', 'Blood pressure noted 142/92 mmHg. ECG normal sinus rhythm. Advised daily 30min brisk walk.', '2026-03-12 10:30:00'),
        ('PAT-5931984821', 'Dr. Priya Verma (Chest Physician, BRD Medical College)', 'Acute Allergic Bronchitis with Wheeze', 'Productive dry cough for 7 days, chest tightness at night', '1. Inhaler Budesonide+Formoterol 2 puffs BD x 14 days\\n2. Tab Montelukast 10mg HS\\n3. Steam inhalation twice daily', 'Chest clear on auscultation, mild bilateral ronchi. SpO2 98% on room air. Avoid dust exposure.', '2026-06-25 11:15:00'),
        ('PAT-5931984821', 'Dr. Amit Kumar (General Medicine, SmartCity Hospital)', 'Viral Upper Respiratory Infection', 'Low grade fever (100.2 F), sore throat, body ache', '1. Tab Paracetamol 650mg TDS x 3 days\\n2. Tab Levocetirizine 5mg HS x 5 days\\n3. Betadine gargle TDS', 'Hydration emphasized. Review if symptoms worsen after 72 hours.', '2026-08-10 09:45:00'),

        ('SC-2026-318028', 'Dr. Sunita Patel (Endocrinologist, City Care Clinic)', 'Type 2 Diabetes Mellitus - Controlled', 'Polyuria, mild lethargy in afternoons', '1. Tab Metformin 500mg BD after meals\\n2. Tab Glimepiride 1mg OD\\n3. Diabetic diet chart', 'HbA1c 6.8%. Fasting glucose 118 mg/dL. Retinal fundoscopy normal.', '2026-05-18 14:00:00'),
        ('SC-2026-318028', 'Dr. Amit Kumar (General Medicine, SmartCity Hospital)', 'Gastroesophageal Reflux Disease (GERD)', 'Retrosternal heartburn, acid reflux after dinner', '1. Cap Pantoprazole-DSR 40mg OD before breakfast\\n2. Gelusil liquid 2 tsp post dinner', 'Avoid late heavy dinners. Elevate bed head 15 degrees.', '2026-07-29 16:30:00')
    `);

    // 2. Add lab reports
    await db.promise().query(`
        DELETE FROM patient_reports WHERE patient_id IN ('PAT-5931984821', 'SC-2026-318028')
    `);

    await db.promise().query(`
        INSERT INTO patient_reports
        (patient_id, title, report_type, doctor_name, hospital_name, status, file_path, report_date)
        VALUES
        ('PAT-5931984821', 'Complete Blood Count (CBC) & ESR', 'Pathology Lab', 'Dr. K. S. Murthy', 'AIIMS Central Diagnostic Lab', 'Verified / Normal', '/uploads/reports/cbc_omkar_2026.pdf', '2026-03-12 14:00:00'),
        ('PAT-5931984821', 'Lipid Profile & Serum Electrolytes', 'Biochemistry', 'Dr. Anita Joshi', 'SmartCity Diagnostic Hub', 'Mild Hypercholesterolemia (Chol: 215)', '/uploads/reports/lipid_profile_2026.pdf', '2026-06-26 15:30:00'),
        ('PAT-5931984821', 'Chest X-Ray PA View', 'Radiology', 'Dr. Sanjay Gupta', 'BRD Imaging Centre', 'Normal Lung Fields & Cardiac Shadow', '/uploads/reports/cxr_2026.pdf', '2026-06-25 12:45:00'),

        ('SC-2026-318028', 'HbA1c & Fasting Plasma Glucose', 'Endocrine Lab', 'Dr. Sunita Patel', 'City Pathology Core', 'HbA1c 6.8% (Target Reached)', '/uploads/reports/hba1c_2026.pdf', '2026-05-18 10:00:00'),
        ('SC-2026-318028', 'Kidney Function Test (KFT)', 'Biochemistry', 'Dr. Amit Kumar', 'SmartCity Hospital Labs', 'Normal Serum Creatinine (0.9 mg/dL)', '/uploads/reports/kft_2026.pdf', '2026-07-29 17:00:00')
    `);

    // 3. Add Prescriptions
    await db.promise().query(`
        DELETE FROM prescriptions WHERE patient_id IN ('PAT-5931984821', 'SC-2026-318028')
    `);

    await db.promise().query(`
        INSERT INTO prescriptions
        (patient_id, doctor_name, prescription_file, status, created_at)
        VALUES
        ('PAT-5931984821', 'Dr. Rajesh Sharma', 'Telmisartan 40mg + Amlodipine 5mg (Cardiology Rx)', 'Active', '2026-03-12 11:00:00'),
        ('PAT-5931984821', 'Dr. Priya Verma', 'Budesonide Rotahaler 200mcg (Pulmonology Rx)', 'Completed', '2026-06-25 11:30:00'),
        ('SC-2026-318028', 'Dr. Sunita Patel', 'Metformin 500mg BD + Glimepiride 1mg (Diabetes Rx)', 'Active', '2026-05-18 14:30:00')
    `);

    console.log('✅ Doctor demo data successfully seeded!');
    process.exit(0);
}

seedDoctorDemoData().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
});
