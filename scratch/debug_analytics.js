const pool = require("../backend/config/db").promise();

async function run() {
    try {
        console.log("Testing Q1...");
        const [q1] = await pool.query("SELECT COUNT(*) as totalRequests, SUM(CASE WHEN status = 'Submitted' THEN 1 ELSE 0 END) as submitted, SUM(CASE WHEN status = 'Assigned' THEN 1 ELSE 0 END) as assigned, SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inProgress, SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved, SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected FROM service_requests WHERE department = 'waste'");
        console.log("Q1 OK:", q1);

        console.log("Testing Q2...");
        const [q2] = await pool.query("SELECT COALESCE(waste_type, category) as typeName, COUNT(*) as count FROM service_requests WHERE department = 'waste' GROUP BY typeName ORDER BY count DESC LIMIT 6");
        console.log("Q2 OK:", q2);

        console.log("Testing Q3...");
        const [q3] = await pool.query("SELECT SUBSTRING_INDEX(address, ',', 1) as areaName, COUNT(*) as count FROM service_requests WHERE department = 'waste' AND address IS NOT NULL GROUP BY areaName ORDER BY count DESC LIMIT 5");
        console.log("Q3 OK:", q3);

        console.log("Testing Q4...");
        const [q4] = await pool.query("SELECT DATE(created_at) as date, COUNT(*) as createdCount, SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolvedCount FROM service_requests WHERE department = 'waste' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY date ASC");
        console.log("Q4 OK:", q4);

        console.log("Testing Q5...");
        const [q5] = await pool.query("SELECT COUNT(*) as totalBins, SUM(CASE WHEN fill_level >= 85 THEN 1 ELSE 0 END) as overflowing, SUM(CASE WHEN fill_level >= 60 AND fill_level < 85 THEN 1 ELSE 0 END) as full, SUM(CASE WHEN fill_level >= 30 AND fill_level < 60 THEN 1 ELSE 0 END) as half, SUM(CASE WHEN fill_level < 30 THEN 1 ELSE 0 END) as empty FROM waste_bins WHERE status != 'Inactive'");
        console.log("Q5 OK:", q5);

        console.log("ALL QUERIES PASSED!");
    } catch (err) {
        console.error("QUERY ERROR:", err.message);
    }
    process.exit(0);
}

run();
