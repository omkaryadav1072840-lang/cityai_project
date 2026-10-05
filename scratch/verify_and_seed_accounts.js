const db = require('../backend/config/db');
const { hashPassword } = require('../backend/middleware/auth.middleware');

async function verifyAndSeedAccounts() {
    const p = db.promise();
    console.log("Connected to MySQL via existing backend pool.");

    const hash = (pw) => hashPassword(pw);

    const testStaff = [
        {
            staff_id: 'STAFF-001',
            name: 'Vikramaditya Rathore',
            role: 'admin',
            hospital_role: 'admin',
            department: 'Admin',
            hospital_id: null,
            email: 'superadmin@smartcity.gov.in',
            password: 'admin',
            status: 'Active',
            permissions: ["*"],
            modules: ["all"]
        },
        {
            staff_id: 'STAFF-HOSP-ADMIN',
            name: 'Dr. Alok Verma (Admin)',
            role: 'staff',
            hospital_role: 'hospital_admin',
            department: 'Administration',
            hospital_id: 'HOSP-001',
            email: 'admin.aiims@smartcity.gov.in',
            password: 'admin',
            status: 'Active',
            permissions: ["view", "create", "update", "delete", "manage_staff", "manage_doctors", "manage_beds"],
            modules: ["hospital_overview", "departments", "doctors", "doctor_slots", "staff_management", "bed_inventory", "services", "hospital_status", "analytics", "appointments", "diagnostics", "clinical", "beds", "pharmacy", "billing", "emergency"]
        },
        {
            staff_id: 'STAFF-BRD-ADMIN',
            name: 'Dr. Rajesh Pandey (BRD Admin)',
            role: 'staff',
            hospital_role: 'hospital_admin',
            department: 'Administration',
            hospital_id: 'HOSP-002',
            email: 'admin.brd@smartcity.gov.in',
            password: 'admin',
            status: 'Active',
            permissions: ["view", "create", "update", "delete", "manage_staff", "manage_doctors", "manage_beds"],
            modules: ["hospital_overview", "departments", "doctors", "doctor_slots", "staff_management", "bed_inventory", "services", "hospital_status", "analytics", "appointments", "diagnostics", "clinical", "beds", "pharmacy", "billing", "emergency"]
        },
        {
            staff_id: 'STAFF-HOSP-REC',
            name: 'Pooja Srivastava (Reception)',
            role: 'staff',
            hospital_role: 'receptionist',
            department: 'Reception & OPD',
            hospital_id: 'HOSP-001',
            email: 'pooja.rec@aiims.gov.in',
            password: 'admin',
            status: 'Active',
            permissions: ["view", "create", "update"],
            modules: ["patients", "appointments", "queue", "billing"]
        },
        {
            staff_id: 'STAFF-HOSP-NUR',
            name: 'Sister Sunita Sharma (Nurse)',
            role: 'staff',
            hospital_role: 'nurse',
            department: 'Ward & Nursing Care',
            hospital_id: 'HOSP-001',
            email: 'sunita.nur@aiims.gov.in',
            password: 'admin',
            status: 'Active',
            permissions: ["view", "create", "update"],
            modules: ["patients", "beds", "care", "admissions"]
        },
        {
            staff_id: 'STAFF-HOSP-LAB',
            name: 'Rameshwar Yadav (Lab Tech)',
            role: 'staff',
            hospital_role: 'lab_technician',
            department: 'Pathology & Diagnostics',
            hospital_id: 'HOSP-001',
            email: 'ramesh.lab@aiims.gov.in',
            password: 'admin',
            status: 'Active',
            permissions: ["view", "create", "update"],
            modules: ["tests", "samples", "reports"]
        },
        {
            staff_id: 'STAFF-HOSP-PHARM',
            name: 'Amitabh Tripathi (Pharmacist)',
            role: 'staff',
            hospital_role: 'pharmacy',
            department: 'In-House Pharmacy',
            hospital_id: 'HOSP-001',
            email: 'amitabh.pharm@aiims.gov.in',
            password: 'admin',
            status: 'Active',
            permissions: ["view", "create", "update"],
            modules: ["prescriptions", "medicines", "inventory", "billing"]
        },
        {
            staff_id: 'STAFF-HOSP-BILL',
            name: 'Manoj Tiwari (Cashier)',
            role: 'staff',
            hospital_role: 'billing',
            department: 'Billing & Cashier',
            hospital_id: 'HOSP-001',
            email: 'manoj.bill@aiims.gov.in',
            password: 'admin',
            status: 'Active',
            permissions: ["view", "create", "update"],
            modules: ["bills", "payments", "receipts", "reports", "appointments"]
        },
        {
            staff_id: 'STAFF-HOSP-AMB',
            name: 'Dinesh Chauhan (Ambulance)',
            role: 'staff',
            hospital_role: 'ambulance',
            department: 'Emergency & Fleet',
            hospital_id: 'HOSP-001',
            email: 'dinesh.amb@aiims.gov.in',
            password: 'admin',
            status: 'Active',
            permissions: ["view", "update"],
            modules: ["ambulance", "dispatch", "emergency", "status"]
        }
    ];

    for (const s of testStaff) {
        const hashedPw = hash(s.password);
        await p.query(`
            INSERT INTO staff (staff_id, name, role, hospital_role, department, hospital_id, email, password, status, permissions, assigned_modules)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                role = VALUES(role),
                hospital_role = VALUES(hospital_role),
                department = VALUES(department),
                hospital_id = VALUES(hospital_id),
                email = VALUES(email),
                password = VALUES(password),
                status = VALUES(status),
                permissions = VALUES(permissions),
                assigned_modules = VALUES(assigned_modules)
        `, [
            s.staff_id, s.name, s.role, s.hospital_role, s.department, s.hospital_id,
            s.email, hashedPw, s.status, JSON.stringify(s.permissions), JSON.stringify(s.modules)
        ]);

        if (s.hospital_id) {
            await p.query(`
                INSERT INTO hospital_staff (hospital_id, staff_id, name, role, department, email, status, permissions, assigned_modules)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    role = VALUES(role),
                    department = VALUES(department),
                    email = VALUES(email),
                    status = VALUES(status),
                    permissions = VALUES(permissions),
                    assigned_modules = VALUES(assigned_modules)
            `, [
                s.hospital_id, s.staff_id, s.name, s.hospital_role, s.department,
                s.email, s.status, JSON.stringify(s.permissions), JSON.stringify(s.modules)
            ]);
        }
        console.log(`Verified/Seeded staff account: ${s.staff_id} (${s.hospital_role})`);
    }

    // Doctor profile verification
    const [docRows] = await p.query("SELECT id, doctor_id, name, password, hospital_id FROM doctors WHERE doctor_id = 'DOC-101'");
    if (docRows.length > 0) {
        await p.query("UPDATE doctors SET password = ? WHERE doctor_id = 'DOC-101'", [hash('admin')]);
        console.log("Verified doctor account: DOC-101");
    } else {
        await p.query(`
            INSERT INTO doctors (doctor_id, hospital_id, name, specialization, department, consultation_fee, password, status)
            VALUES ('DOC-101', 'HOSP-001', 'Dr. Anand Verma', 'Cardiology', 'Cardiology', 500, ?, 'Active')
        `, [hash('admin')]);
        console.log("Created doctor account: DOC-101");
    }

    // Citizen user verification
    const [userRows] = await p.query("SELECT id, name, mobile, email, password FROM users WHERE mobile = '6306880179' OR email = 'omkaryadav@gmail.com'");
    if (userRows.length > 0) {
        await p.query("UPDATE users SET password = ? WHERE id = ?", [hash('password123'), userRows[0].id]);
        console.log("Verified citizen user: omkaryadav@gmail.com / 6306880179");
    }

    console.log("Database accounts verification complete.");
    process.exit(0);
}

verifyAndSeedAccounts().catch(err => {
    console.error(err);
    process.exit(1);
});
