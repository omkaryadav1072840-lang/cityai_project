const db = require('../backend/config/db');
const { hashPassword } = require('../backend/middleware/auth.middleware');

async function seedAliases() {
    const p = db.promise();
    const hash = (pw) => hashPassword(pw);
    const defaultPw = hash('admin');

    const accounts = [
        {
            ids: ['HOSP-PHARM', 'STAFF-HOSP-PHARM', 'PHARMACY'],
            name: 'Amitabh Tripathi (Pharmacist)',
            role: 'pharmacy',
            department: 'In-House Pharmacy',
            hospital_id: 'HOSP-001',
            email: 'pharmacy.aiims@smartcity.gov.in',
            modules: ["prescriptions", "medicines", "inventory", "billing"],
            perms: ["view", "create", "update"]
        },
        {
            ids: ['HOSP-REC', 'STAFF-HOSP-REC', 'RECEPTIONIST'],
            name: 'Pooja Srivastava (Reception)',
            role: 'receptionist',
            department: 'Reception & OPD',
            hospital_id: 'HOSP-001',
            email: 'reception.aiims@smartcity.gov.in',
            modules: ["patients", "appointments", "queue", "billing"],
            perms: ["view", "create", "update"]
        },
        {
            ids: ['HOSP-NUR', 'STAFF-HOSP-NUR', 'NURSE'],
            name: 'Sister Sunita Sharma (Nurse)',
            role: 'nurse',
            department: 'Ward & Nursing Care',
            hospital_id: 'HOSP-001',
            email: 'nurse.aiims@smartcity.gov.in',
            modules: ["patients", "beds", "care", "admissions"],
            perms: ["view", "create", "update"]
        },
        {
            ids: ['HOSP-LAB', 'STAFF-HOSP-LAB', 'LAB'],
            name: 'Rameshwar Yadav (Lab Tech)',
            role: 'lab_technician',
            department: 'Pathology & Diagnostics',
            hospital_id: 'HOSP-001',
            email: 'lab.aiims@smartcity.gov.in',
            modules: ["tests", "samples", "reports"],
            perms: ["view", "create", "update"]
        },
        {
            ids: ['HOSP-BILL', 'STAFF-HOSP-BILL', 'BILLING'],
            name: 'Manoj Tiwari (Cashier)',
            role: 'billing',
            department: 'Billing & Cashier',
            hospital_id: 'HOSP-001',
            email: 'billing.aiims@smartcity.gov.in',
            modules: ["bills", "payments", "receipts", "reports", "appointments"],
            perms: ["view", "create", "update"]
        },
        {
            ids: ['HOSP-AMB', 'STAFF-HOSP-AMB', 'AMBULANCE'],
            name: 'Dinesh Chauhan (Ambulance)',
            role: 'ambulance',
            department: 'Emergency & Fleet',
            hospital_id: 'HOSP-001',
            email: 'ambulance.aiims@smartcity.gov.in',
            modules: ["ambulance", "dispatch", "emergency", "status"],
            perms: ["view", "update"]
        },
        {
            ids: ['HOSP-ADMIN', 'STAFF-HOSP-ADMIN', 'AIIMS-ADMIN'],
            name: 'Dr. Alok Verma (Admin)',
            role: 'hospital_admin',
            department: 'Administration',
            hospital_id: 'HOSP-001',
            email: 'admin.aiims@smartcity.gov.in',
            modules: ["hospital_overview", "departments", "doctors", "doctor_slots", "staff_management", "bed_inventory", "services", "hospital_status", "analytics", "appointments", "diagnostics", "clinical", "beds", "pharmacy", "billing", "emergency"],
            perms: ["view", "create", "update", "delete", "manage_staff", "manage_doctors", "manage_beds"]
        },
        {
            ids: ['BRD-ADMIN', 'STAFF-BRD-ADMIN'],
            name: 'Dr. Rajesh Pandey (BRD Admin)',
            role: 'hospital_admin',
            department: 'Administration',
            hospital_id: 'HOSP-002',
            email: 'admin.brd@smartcity.gov.in',
            modules: ["hospital_overview", "departments", "doctors", "doctor_slots", "staff_management", "bed_inventory", "services", "hospital_status", "analytics", "appointments", "diagnostics", "clinical", "beds", "pharmacy", "billing", "emergency"],
            perms: ["view", "create", "update", "delete", "manage_staff", "manage_doctors", "manage_beds"]
        }
    ];

    for (const acc of accounts) {
        for (const sid of acc.ids) {
            await p.query(`
                INSERT INTO staff (staff_id, name, role, hospital_role, department, hospital_id, email, password, status, permissions, assigned_modules)
                VALUES (?, ?, 'staff', ?, ?, ?, ?, ?, 'Active', ?, ?)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    hospital_role = VALUES(hospital_role),
                    department = VALUES(department),
                    hospital_id = VALUES(hospital_id),
                    email = VALUES(email),
                    password = VALUES(password),
                    status = 'Active',
                    permissions = VALUES(permissions),
                    assigned_modules = VALUES(assigned_modules)
            `, [
                sid, acc.name, acc.role, acc.department, acc.hospital_id,
                acc.email, defaultPw, JSON.stringify(acc.perms), JSON.stringify(acc.modules)
            ]);

            await p.query(`
                INSERT INTO hospital_staff (hospital_id, staff_id, name, role, department, email, status, permissions, assigned_modules)
                VALUES (?, ?, ?, ?, ?, ?, 'Active', ?, ?)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    role = VALUES(role),
                    department = VALUES(department),
                    email = VALUES(email),
                    status = 'Active',
                    permissions = VALUES(permissions),
                    assigned_modules = VALUES(assigned_modules)
            `, [
                acc.hospital_id, sid, acc.name, acc.role, acc.department,
                acc.email, JSON.stringify(acc.perms), JSON.stringify(acc.modules)
            ]);
            console.log(`Seeded ID variant: ${sid} -> ${acc.role}`);
        }
    }

    console.log("All staff ID variations seeded successfully.");
    process.exit(0);
}

seedAliases().catch(err => {
    console.error(err);
    process.exit(1);
});
