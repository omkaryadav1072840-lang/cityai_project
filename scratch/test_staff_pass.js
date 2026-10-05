const db = require('../backend/config/db');
const { verifyPassword, hashPassword } = require('../backend/middleware/auth.middleware');

(async () => {
  const [st] = await db.promise().query("SELECT staff_id, password FROM staff WHERE staff_id LIKE 'STAFF-%'");
  for (const s of st) {
    const test1 = verifyPassword('password123', s.password);
    const test2 = verifyPassword('staff123', s.password);
    const test3 = verifyPassword('admin123', s.password);
    console.log(s.staff_id, 'matches:', { p123: test1, s123: test2, a123: test3 }, 'starts:', s.password ? s.password.substring(0, 10) : 'null');
  }
  process.exit(0);
})();
