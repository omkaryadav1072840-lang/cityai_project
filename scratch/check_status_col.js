const pool = require('../backend/config/db').promise();
(async () => {
    await pool.query("ALTER TABLE hospital_bed_admissions MODIFY COLUMN status VARCHAR(50) DEFAULT 'Admitted'");
    console.log("✅ Altered hospital_bed_admissions.status to VARCHAR(50)");
    const [a] = await pool.query("SHOW COLUMNS FROM hospital_bed_admissions LIKE 'status'");
    console.log('ADM STATUS NOW:', a);
    process.exit(0);
})();
