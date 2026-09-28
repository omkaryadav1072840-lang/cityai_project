const pool = require('../backend/config/db');
const { verifyPassword } = require('../backend/middleware/auth.middleware');

async function testPasswords() {
    const p = pool.promise();
    const [staff] = await p.query('SELECT staff_id, name, department, role, password FROM staff');
    const candidates = ['staff123', 'admin123', 'password123', 'demo123', 'traffic123', 'parking123', 'waste123', 'water123', 'emergency123', 'police123', 'verma123', 'pandey123', '123456', 'omkar'];
    
    console.log("=== STAFF PASSWORD RECOVERY ===");
    for (const s of staff) {
        let matched = null;
        for (const c of candidates) {
            if (verifyPassword(c, s.password)) {
                matched = c;
                break;
            }
        }
        console.log(`Staff ID: ${s.staff_id} (${s.name}) -> Password: ${matched || 'UNKNOWN'}`);
    }

    const [users] = await p.query('SELECT id, name, email, mobile, password FROM users');
    console.log("\n=== USERS PASSWORD RECOVERY ===");
    for (const u of users) {
        let matched = null;
        for (const c of candidates) {
            if (verifyPassword(c, u.password)) {
                matched = c;
                break;
            }
        }
        console.log(`User: ${u.email} (${u.name}) -> Password: ${matched || 'UNKNOWN'}`);
    }
    process.exit(0);
}
testPasswords();
