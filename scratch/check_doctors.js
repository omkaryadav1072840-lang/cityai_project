const pool = require('../backend/config/db');
const { verifyPassword } = require('../backend/middleware/auth.middleware');

async function testDoctors() {
    const p = pool.promise();
    const [docs] = await p.query('SELECT id, doctor_id, name, department, specialization, mobile, email, password FROM doctors LIMIT 10');
    console.log("=== DOCTORS (Sample) ===");
    for (const d of docs) {
        const pass123 = verifyPassword('doctor123', d.password);
        const passStaff = verifyPassword('staff123', d.password);
        const pass123456 = verifyPassword('123456', d.password);
        console.log(`Doc ID: ${d.doctor_id} | Name: ${d.name} | Spec: ${d.specialization} | doctor123:${pass123} | staff123:${passStaff} | 123456:${pass123456} | Raw: ${d.password.substring(0, 15)}...`);
    }
    process.exit(0);
}
testDoctors();
