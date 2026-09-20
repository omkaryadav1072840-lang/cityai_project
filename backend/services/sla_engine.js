/**
 * SmartCity AI - SLA & Automatic Escalation Monitor
 * Regularly checks active service requests against real timestamps and triggers
 * SLA escalations and real-time alerts when deadlines expire.
 */

const pool = require("../config/db").promise();

let intervalHandle = null;

async function checkEscalations(io) {
    try {
        const [overdue] = await pool.query(`
            SELECT id, request_code, department, category, priority, 
                   assigned_staff_id, assigned_staff_name, sla_deadline, created_at
            FROM service_requests
            WHERE status IN ('Submitted', 'Acknowledged', 'Assigned', 'In Progress')
              AND sla_deadline IS NOT NULL
              AND sla_deadline < NOW()
        `);

        if (overdue.length === 0) return;

        console.log(`⏱️ [SLA Engine] Detected ${overdue.length} overdue service request(s). Escalating...`);

        for (const req of overdue) {
            // 1. Update status to 'Escalated'
            await pool.query(
                `UPDATE service_requests 
                 SET status = 'Escalated', 
                     resolution_notes = CONCAT(IFNULL(resolution_notes, ''), '\n[AUTO-ESCALATION] Request exceeded SLA deadline at ', NOW())
                 WHERE id = ? AND status IN ('Submitted', 'Acknowledged', 'Assigned', 'In Progress')`,
                [req.id]
            );

            // 2. Insert notification for assigned staff if any
            if (req.assigned_staff_id) {
                await pool.query(
                    `INSERT INTO notifications (user_id, role, department, type, title, message, module, reference_id)
                     VALUES (?, 'staff', ?, 'sla_breach', ?, ?, 'requests', ?)`,
                    [
                        req.assigned_staff_id,
                        req.department,
                        `🚨 SLA Breach: ${req.request_code}`,
                        `Request ${req.request_code} (${req.category}) exceeded SLA deadline. Escalated to department supervisor.`,
                        req.request_code
                    ]
                );
            }

            // 3. Insert notification for department supervisor / admin
            await pool.query(
                `INSERT INTO notifications (role, department, type, title, message, module, reference_id)
                 VALUES ('admin', ?, 'sla_breach', ?, ?, 'requests', ?)`,
                [
                    req.department,
                    `🚨 Supervisor Alert: Escalated ${req.request_code}`,
                    `Request ${req.request_code} (${req.department} - ${req.category}) breached SLA. Immediate intervention required.`,
                    req.request_code
                ]
            );

            // 4. Real-time broadcast via Socket.IO if available
            if (io) {
                io.emit("request:escalated", {
                    requestId: req.id,
                    requestCode: req.request_code,
                    department: req.department,
                    category: req.category,
                    priority: req.priority,
                    assignedStaffId: req.assigned_staff_id,
                    timestamp: new Date().toISOString()
                });
                io.emit("notification:new", {
                    department: req.department,
                    title: `🚨 Escalated: ${req.request_code}`,
                    message: `Request exceeded SLA deadline in ${req.department}.`,
                    type: "sla_breach"
                });
            }
        }
    } catch (err) {
        console.error("⚠️ [SLA Engine Error]:", err.message);
    }
}

function start(io, intervalMs = 60000) {
    if (intervalHandle) {
        clearInterval(intervalHandle);
    }
    console.log(`⏱️ [SLA Engine] Started monitoring active requests (interval: ${intervalMs / 1000}s).`);
    // Run an initial check after 5 seconds
    setTimeout(() => checkEscalations(io), 5000);
    intervalHandle = setInterval(() => checkEscalations(io), intervalMs);
}

function stop() {
    if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
        console.log("⏱️ [SLA Engine] Stopped.");
    }
}

module.exports = {
    start,
    stop,
    checkEscalations
};
