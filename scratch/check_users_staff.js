const pool = require('../backend/config/db');

async function showAuth() {
    const p = pool.promise();
    const [uCols] = await p.query('DESCRIBE users');
    console.log("USERS COLUMNS:", uCols.map(c => c.Field).join(", "));
    const [users] = await p.query('SELECT * FROM users');
    const [staff] = await p.query('SELECT id, name, staff_id, department, role FROM staff');
    console.log("=== USERS ===");
    console.table(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })));
    console.log("=== STAFF ===");
    console.table(staff);
    process.exit(0);
}
showAuth();
