const pool = require('../backend/config/db');
const { verifyPassword, isLegacyPlainPassword } = require('../backend/middleware/auth.middleware');

async function testAllStaffLogins() {
    const p = pool.promise();
    const [staff] = await p.query('SELECT id, name, staff_id, department, role, password FROM staff');
    console.log("=== STAFF AUTH INSPECTION ===");
    for (const s of staff) {
        const isLegacy = isLegacyPlainPassword(s.password);
        const passPreview = s.password ? s.password.substring(0, 15) + "..." : "NULL";
        console.log(`Staff ID: ${s.staff_id} | Name: ${s.name} | Dept: ${s.department} | Role: ${s.role} | Legacy: ${isLegacy} | Pass: ${passPreview}`);
    }

    const [users] = await p.query('SELECT id, name, email, mobile, role, password FROM users');
    console.log("\n=== USERS AUTH INSPECTION ===");
    for (const u of users) {
        const isLegacy = isLegacyPlainPassword(u.password);
        const passPreview = u.password ? u.password.substring(0, 15) + "..." : "NULL";
        console.log(`User ID: ${u.id} | Email: ${u.email} | Mobile: ${u.mobile} | Role: ${u.role} | Legacy: ${isLegacy} | Pass: ${passPreview}`);
    }
    process.exit(0);
}

testAllStaffLogins();
