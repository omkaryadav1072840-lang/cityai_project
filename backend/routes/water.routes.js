/**
 * SmartCity AI - Master Water Management Routes
 * 3-Layer Architecture: Citizen Water Services, Water Staff Operations, Infrastructure & SCADA Asset Control
 * Integrated with MySQL Connection Pool, RBAC, Real-time Socket.IO, Multer Uploads & Audit Logger
 */

const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../config/db");
const pool = db.promise();
const {
    authenticateToken,
    optionalToken,
    requireRole,
    requireDepartment
} = require("../middleware/auth.middleware");
const { emitWaterUpdate } = require("../sockets/index");
const { logAudit } = require("../services/audit_logger");

// =========================================================
// MULTER STORAGE FOR EVIDENCE UPLOADS
// =========================================================
const uploadDir = path.join(__dirname, "..", "uploads", "water");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || ".jpg";
        const unique = `water-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
        cb(null, unique);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp|gif/i;
        const validExt = allowed.test(path.extname(file.originalname).toLowerCase());
        const validMime = allowed.test(file.mimetype);
        if (validExt && validMime) {
            cb(null, true);
        } else {
            cb(new Error("Only image files (JPEG, PNG, WEBP, GIF) are allowed."));
        }
    }
});

// Helper: Guard for Water Department Staff or Admins
function requireWaterStaff(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Authentication required." });
    }
    const role = (req.user.role || req.user.type || "").toLowerCase();
    if (role === "admin") return next();

    if (role === "staff") {
        const dept = (req.user.department || "").toLowerCase();
        const editable = req.user.editable || [];
        if (dept === "water" || dept === "admin" || editable.includes("water")) {
            return next();
        }
    }

    return res.status(403).json({
        success: false,
        message: "Access denied. Action reserved for Water Works staff or Administrators."
    });
}

// Rule-based Priority Engine for Water Complaints
function calculateWaterPriority({ issueType = "", description = "", location = "" }) {
    const text = `${issueType} ${description} ${location}`.toLowerCase();
    if (
        text.includes("no supply") ||
        text.includes("hospital") ||
        text.includes("burst") ||
        text.includes("toxic") ||
        text.includes("chemical") ||
        text.includes("emergency")
    ) {
        return { priority: "CRITICAL", slaHours: 2 };
    }
    if (
        text.includes("pipe leak") ||
        text.includes("leakage") ||
        text.includes("contamination") ||
        text.includes("dirty") ||
        text.includes("drain")
    ) {
        return { priority: "HIGH", slaHours: 6 };
    }
    if (text.includes("low pressure") || text.includes("pressure")) {
        return { priority: "MEDIUM", slaHours: 24 };
    }
    return { priority: "LOW", slaHours: 48 };
}

// =========================================================
// 1. OPERATIONS SUMMARY KPI (Staff / Admin & Citizen Header)
// =========================================================
router.get("/api/water/operations/summary", async (req, res) => {
    try {
        const [[tanksTotal]] = await pool.query("SELECT COUNT(*) as c, SUM(CASE WHEN pump_status = 'ON' THEN 1 ELSE 0 END) as activePumps, AVG(current_level_percent) as avgLevel FROM water_tanks");
        const [[reportsTotal]] = await pool.query("SELECT COUNT(*) as total, SUM(CASE WHEN status IN ('Open', 'Under Review', 'In Progress') THEN 1 ELSE 0 END) as openReports, SUM(CASE WHEN priority = 'CRITICAL' AND status != 'Resolved' THEN 1 ELSE 0 END) as criticalReports FROM water_reports");
        const [[tankersTotal]] = await pool.query("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pendingTankers FROM water_tanker_bookings");
        const [[pipesTotal]] = await pool.query("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Normal' THEN 1 ELSE 0 END) as normalPipes, SUM(CASE WHEN status LIKE '%Leak%' THEN 1 ELSE 0 END) as leakingPipes FROM water_pipelines");
        const [[techTotal]] = await pool.query("SELECT COUNT(*) as total, SUM(CASE WHEN status IN ('Available', 'On Duty') THEN 1 ELSE 0 END) as activeTechs FROM water_technicians");
        const [[qualityAvg]] = await pool.query("SELECT AVG(ph) as avgPh, AVG(tds) as avgTds FROM water_quality_logs");

        res.json({
            success: true,
            summary: {
                totalTanks: Number(tanksTotal?.c || 0),
                activePumps: Number(tanksTotal?.activePumps || 0),
                avgTankLevel: Math.round(Number(tanksTotal?.avgLevel || 0)),
                totalReports: Number(reportsTotal?.total || 0),
                openReports: Number(reportsTotal?.openReports || 0),
                criticalReports: Number(reportsTotal?.criticalReports || 0),
                pendingTankers: Number(tankersTotal?.pendingTankers || 0),
                totalTankers: Number(tankersTotal?.total || 0),
                totalPipelines: Number(pipesTotal?.total || 0),
                leakingPipelines: Number(pipesTotal?.leakingPipes || 0),
                activeTechnicians: Number(techTotal?.activeTechs || 0),
                waterQualityStatus: (qualityAvg?.avgPh >= 6.5 && qualityAvg?.avgPh <= 8.5) ? "Safe & Compliant" : "Needs Attention"
            }
        });
    } catch (err) {
        console.error("Water summary error:", err);
        res.status(500).json({ success: false, message: "Database query failed." });
    }
});

// =========================================================
// 2. WATER TANKS — GET ALL (SCADA Telemetry)
// =========================================================
router.get("/api/water/tanks", async (req, res) => {
    try {
        const [results] = await pool.query(`
            SELECT
                id, tank_id, name, zone,
                capacity_liters, current_level_percent,
                status, pump_status, latitude, longitude,
                water_quality_score, next_supply_time, updated_at
            FROM water_tanks
            ORDER BY name ASC
        `);

        res.json({
            success: true,
            message: "Water tanks fetched successfully.",
            tanks: results
        });
    } catch (err) {
        console.error("Water tanks fetch error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// =========================================================
// 3. WATER TANKS — GET SINGLE
// =========================================================
router.get("/api/water/tanks/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const [results] = await pool.query(
            "SELECT * FROM water_tanks WHERE id = ? OR tank_id = ? LIMIT 1",
            [id, id]
        );
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Water tank not found." });
        }
        res.json({ success: true, tank: results[0] });
    } catch (err) {
        console.error("Get tank error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// =========================================================
// 4. WATER TANKS — CREATE (Staff / Admin)
// =========================================================
router.post("/api/water/tanks", authenticateToken, requireWaterStaff, async (req, res) => {
    const { name, zone, capacity_liters, current_level_percent, latitude, longitude, pump_status, next_supply_time } = req.body;

    if (!name || !zone) {
        return res.status(400).json({ success: false, message: "Tank name and zone/location are required." });
    }

    const tank_id = "TANK-" + Date.now().toString().slice(-4);
    const capacity = Number(capacity_liters) || 50000;
    const level = Math.min(100, Math.max(0, Number(current_level_percent) || 50));
    const lat = Number(latitude) || 26.7606;
    const lng = Number(longitude) || 83.3732;
    const pump = (pump_status || "ON").toUpperCase();
    const supplyTime = next_supply_time || "06:00 AM";

    try {
        const [result] = await pool.query(`
            INSERT INTO water_tanks
            (tank_id, name, zone, capacity_liters, current_level_percent, latitude, longitude, pump_status, status, next_supply_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Operational', ?)
        `, [tank_id, name, zone, capacity, level, lat, lng, pump, supplyTime]);

        const [created] = await pool.query("SELECT * FROM water_tanks WHERE id = ?", [result.insertId]);

        emitWaterUpdate({
            type: "tank_created",
            tank: created[0],
            updatedAt: new Date().toISOString()
        });

        res.status(201).json({
            success: true,
            message: "Water tank added successfully.",
            tank: created[0]
        });
    } catch (err) {
        console.error("Create tank error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// =========================================================
// 5. WATER TANKS — UPDATE LEVEL / STATUS (Staff / Admin)
// =========================================================
router.put("/api/water/tanks/:id", authenticateToken, requireWaterStaff, async (req, res) => {
    const id = req.params.id;
    const { name, zone, currentLevelPercent, status, pump_status, nextSupplyTime, latitude, longitude, capacity_liters } = req.body;

    const level = currentLevelPercent !== undefined ? Math.min(100, Math.max(0, Number(currentLevelPercent))) : undefined;

    try {
        const [result] = await pool.query(`
            UPDATE water_tanks
            SET name = COALESCE(?, name),
                zone = COALESCE(?, zone),
                current_level_percent = COALESCE(?, current_level_percent),
                status = COALESCE(?, status),
                pump_status = COALESCE(?, pump_status),
                next_supply_time = COALESCE(?, next_supply_time),
                latitude = COALESCE(?, latitude),
                longitude = COALESCE(?, longitude),
                capacity_liters = COALESCE(?, capacity_liters)
            WHERE id = ? OR tank_id = ?
        `, [
            name || null,
            zone || null,
            level !== undefined ? level : null,
            status || null,
            pump_status ? pump_status.toUpperCase() : null,
            nextSupplyTime || null,
            latitude !== undefined ? Number(latitude) : null,
            longitude !== undefined ? Number(longitude) : null,
            capacity_liters !== undefined ? Number(capacity_liters) : null,
            id, id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Water tank not found." });
        }

        const [rows] = await pool.query("SELECT * FROM water_tanks WHERE id = ? OR tank_id = ? LIMIT 1", [id, id]);
        if (rows && rows.length > 0) {
            emitWaterUpdate({
                type: "tank",
                tank: rows[0],
                updatedAt: new Date().toISOString()
            });
        }

        res.json({ success: true, message: "Water tank updated successfully.", tank: rows[0] });
    } catch (err) {
        console.error("Update tank error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// =========================================================
// 6. WATER TANKS — TOGGLE PUMP (SCADA Controls)
// =========================================================
router.put("/api/water/tanks/:id/pump", authenticateToken, requireWaterStaff, async (req, res) => {
    const id = req.params.id;
    const { pump_status } = req.body;

    const validPumps = ["ON", "OFF", "MAINTENANCE"];
    const statusUpper = (pump_status || "ON").toUpperCase();
    if (!validPumps.includes(statusUpper)) {
        return res.status(400).json({ success: false, message: "Invalid pump status. Must be ON, OFF, or MAINTENANCE." });
    }

    try {
        const [result] = await pool.query(
            "UPDATE water_tanks SET pump_status = ? WHERE id = ? OR tank_id = ?",
            [statusUpper, id, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Tank not found." });
        }

        const [rows] = await pool.query("SELECT * FROM water_tanks WHERE id = ? OR tank_id = ? LIMIT 1", [id, id]);
        emitWaterUpdate({
            type: "tank_pump_toggle",
            tank: rows[0],
            pump_status: statusUpper,
            updatedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            message: `Pump status switched to ${statusUpper}.`,
            tank: rows[0]
        });
    } catch (err) {
        console.error("Toggle pump error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// =========================================================
// 7. WATER TANKS — DELETE (Staff / Admin)
// =========================================================
router.delete("/api/water/tanks/:id", authenticateToken, requireWaterStaff, async (req, res) => {
    const id = req.params.id;
    try {
        const [result] = await pool.query("DELETE FROM water_tanks WHERE id = ? OR tank_id = ?", [id, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Water tank not found." });
        }
        res.json({ success: true, message: "Water tank deleted successfully." });
    } catch (err) {
        console.error("Delete tank error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// =========================================================
// 8. WATER REPORTS — GET ALL (Citizen & Staff)
// =========================================================
router.get("/api/water/reports", optionalToken, async (req, res) => {
    const { status, userId, priority } = req.query;
    let sql = `
        SELECT id, report_id, user_id, citizen_name, mobile,
               issue_type, location, description, status, priority,
               assigned_technician_id, assigned_technician_name,
               evidence_image, internal_remarks, created_at, updated_at, resolved_at
        FROM water_reports
    `;

    const params = [];
    const conditions = [];

    if (status) {
        conditions.push("status = ?");
        params.push(status);
    }
    if (priority) {
        conditions.push("priority = ?");
        params.push(priority);
    }
    if (userId) {
        conditions.push("user_id = ?");
        params.push(userId);
    }

    if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY created_at DESC";

    try {
        const [results] = await pool.query(sql, params);
        res.json({ success: true, reports: results });
    } catch (err) {
        console.error("Water reports fetch error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// =========================================================
// 9. WATER REPORTS — SUBMIT COMPLAINT (Citizen, with Photo Upload)
// =========================================================
router.post("/api/water/reports", optionalToken, upload.single("evidenceImage"), async (req, res) => {
    try {
        const citizenName = req.body.citizenName || (req.user && req.user.name) || "Citizen";
        const mobile = req.body.mobile || (req.user && req.user.phone) || "9876543210";
        const issueType = req.body.issueType || "Pipe Leak";
        const location = req.body.location || "Gorakhpur";
        const description = req.body.description || "";
        const userId = req.body.userId || (req.user && req.user.id) || null;

        const allowedIssues = ["No Supply", "Low Pressure", "Contamination", "Pipe Leak", "Billing Issue", "Other"];
        const normalizedIssue = allowedIssues.includes(issueType) ? issueType : "Other";

        const { priority } = calculateWaterPriority({ issueType: normalizedIssue, description, location });
        const reportId = "WR-" + Date.now().toString(36).toUpperCase();
        const evidencePath = req.file ? `/uploads/water/${req.file.filename}` : null;

        const [result] = await pool.query(`
            INSERT INTO water_reports
            (report_id, user_id, citizen_name, mobile, issue_type, location, description, status, priority, evidence_image)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Open', ?, ?)
        `, [reportId, userId, citizenName, mobile, normalizedIssue, location, description, priority, evidencePath]);

        const [created] = await pool.query("SELECT * FROM water_reports WHERE id = ?", [result.insertId]);

        emitWaterUpdate({
            type: "new_water_report",
            report: created[0],
            updatedAt: new Date().toISOString()
        });

        res.status(201).json({
            success: true,
            message: "Water complaint submitted successfully.",
            report: created[0]
        });
    } catch (err) {
        console.error("Water report insert error:", err);
        res.status(500).json({ success: false, message: "Failed to submit water complaint." });
    }
});

// =========================================================
// 10. WATER REPORTS — ASSIGN TECHNICIAN (Staff Operations)
// =========================================================
router.put("/api/water/reports/:id/assign", authenticateToken, requireWaterStaff, async (req, res) => {
    const id = req.params.id;
    const { technician_id, technician_name, priority, internal_remarks } = req.body;

    if (!technician_name) {
        return res.status(400).json({ success: false, message: "Technician / plumber name is required." });
    }

    try {
        const [result] = await pool.query(`
            UPDATE water_reports
            SET assigned_technician_id = ?,
                assigned_technician_name = ?,
                priority = COALESCE(?, priority),
                internal_remarks = COALESCE(?, internal_remarks),
                status = 'In Progress'
            WHERE id = ? OR report_id = ?
        `, [technician_id || null, technician_name, priority || null, internal_remarks || null, id, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Report not found." });
        }

        // Also update technician status in water_technicians table
        if (technician_name) {
            await pool.query("UPDATE water_technicians SET status = 'Assigned' WHERE name = ? OR emp_code = ?", [technician_name, technician_id || '']);
        }

        const [updated] = await pool.query("SELECT * FROM water_reports WHERE id = ? OR report_id = ? LIMIT 1", [id, id]);

        emitWaterUpdate({
            type: "report_assigned",
            report: updated[0],
            updatedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            message: `Assigned to ${technician_name} and marked In Progress.`,
            report: updated[0]
        });
    } catch (err) {
        console.error("Assign technician error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// =========================================================
// 11. WATER REPORTS — UPDATE STATUS (Staff Operations)
// =========================================================
router.put("/api/water/reports/:id/status", authenticateToken, requireWaterStaff, async (req, res) => {
    const id = req.params.id;
    const { status, internal_remarks } = req.body;

    const allowed = ["Open", "Under Review", "In Progress", "Resolved", "Closed"];
    if (!allowed.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status." });
    }

    try {
        const resolvedAt = (status === "Resolved" || status === "Closed") ? new Date() : null;

        const [result] = await pool.query(`
            UPDATE water_reports
            SET status = ?,
                internal_remarks = COALESCE(?, internal_remarks),
                resolved_at = COALESCE(?, resolved_at)
            WHERE id = ? OR report_id = ?
        `, [status, internal_remarks || null, resolvedAt, id, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Report not found." });
        }

        const [updated] = await pool.query("SELECT * FROM water_reports WHERE id = ? OR report_id = ? LIMIT 1", [id, id]);

        emitWaterUpdate({
            type: "report_status_update",
            report: updated[0],
            updatedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            message: `Report status updated to ${status}.`,
            report: updated[0]
        });
    } catch (err) {
        console.error("Water report status update error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// =========================================================
// 12. WATER TANKER BOOKING — BOOK (Citizen)
// =========================================================
router.post("/api/water/tanker-bookings", optionalToken, async (req, res) => {
    const { userId, citizenName, mobile, deliveryAddress, capacity, bookingDate, deliverySlot } = req.body;

    if (!deliveryAddress) {
        return res.status(400).json({ success: false, message: "Delivery address is required." });
    }

    const cName = citizenName || (req.user && req.user.name) || "Citizen";
    const cMobile = mobile || (req.user && req.user.phone) || "9876543210";
    const bookingId = "TKB-" + Date.now().toString(36).toUpperCase();
    const date = bookingDate || new Date().toISOString().split("T")[0];
    const cap = capacity || "5000 Litres";
    const slot = deliverySlot || "Morning (08:00 AM - 12:00 PM)";

    try {
        const [result] = await pool.query(`
            INSERT INTO water_tanker_bookings
            (booking_id, user_id, citizen_name, mobile, delivery_address, capacity, booking_date, delivery_slot, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
        `, [bookingId, userId || (req.user && req.user.id) || null, cName, cMobile, deliveryAddress, cap, date, slot]);

        const [created] = await pool.query("SELECT * FROM water_tanker_bookings WHERE id = ?", [result.insertId]);

        emitWaterUpdate({
            type: "new_tanker_booking",
            booking: created[0],
            updatedAt: new Date().toISOString()
        });

        res.status(201).json({
            success: true,
            message: "Tanker booking requested successfully.",
            booking: created[0]
        });
    } catch (err) {
        console.error("Tanker booking error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// =========================================================
// 13. WATER TANKER BOOKINGS — GET ALL (Citizen & Staff)
// =========================================================
router.get("/api/water/tanker-bookings", optionalToken, async (req, res) => {
    const { userId, status } = req.query;
    let sql = `
        SELECT id, booking_id, user_id, citizen_name, mobile,
               delivery_address, capacity, booking_date, delivery_slot,
               assigned_driver_name, assigned_driver_phone, assigned_tanker_number,
               status, internal_remarks, dispatched_at, delivered_at, created_at
        FROM water_tanker_bookings
    `;

    const params = [];
    const conditions = [];

    if (userId) {
        conditions.push("user_id = ?");
        params.push(userId);
    }
    if (status) {
        conditions.push("status = ?");
        params.push(status);
    }

    if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
    }
    sql += " ORDER BY created_at DESC";

    try {
        const [results] = await pool.query(sql, params);
        res.json({ success: true, bookings: results });
    } catch (err) {
        console.error("Tanker bookings fetch error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// =========================================================
// 14. WATER TANKER — DISPATCH DRIVER & VEHICLE (Staff Operations)
// =========================================================
router.put("/api/water/tanker-bookings/:id/dispatch", authenticateToken, requireWaterStaff, async (req, res) => {
    const id = req.params.id;
    const { assigned_driver_name, assigned_driver_phone, assigned_tanker_number, delivery_slot, internal_remarks } = req.body;

    if (!assigned_driver_name || !assigned_tanker_number) {
        return res.status(400).json({ success: false, message: "Driver name and tanker registration number are required." });
    }

    try {
        const [result] = await pool.query(`
            UPDATE water_tanker_bookings
            SET assigned_driver_name = ?,
                assigned_driver_phone = ?,
                assigned_tanker_number = ?,
                delivery_slot = COALESCE(?, delivery_slot),
                internal_remarks = COALESCE(?, internal_remarks),
                status = 'Dispatched',
                dispatched_at = CURRENT_TIMESTAMP
            WHERE id = ? OR booking_id = ?
        `, [assigned_driver_name, assigned_driver_phone || "9876543204", assigned_tanker_number, delivery_slot || null, internal_remarks || null, id, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Tanker booking not found." });
        }

        const [updated] = await pool.query("SELECT * FROM water_tanker_bookings WHERE id = ? OR booking_id = ? LIMIT 1", [id, id]);

        emitWaterUpdate({
            type: "tanker_dispatched",
            booking: updated[0],
            updatedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            message: `Tanker ${assigned_tanker_number} dispatched with Driver ${assigned_driver_name}.`,
            booking: updated[0]
        });
    } catch (err) {
        console.error("Tanker dispatch error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// =========================================================
// 15. WATER TANKER — UPDATE STATUS (Staff Operations)
// =========================================================
router.put("/api/water/tanker-bookings/:id/status", authenticateToken, requireWaterStaff, async (req, res) => {
    const id = req.params.id;
    const { status, internal_remarks } = req.body;

    const allowed = ["Pending", "Dispatched", "Delivered", "Cancelled"];
    if (!allowed.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status." });
    }

    try {
        const deliveredAt = (status === "Delivered") ? new Date() : null;
        const [result] = await pool.query(`
            UPDATE water_tanker_bookings
            SET status = ?,
                internal_remarks = COALESCE(?, internal_remarks),
                delivered_at = COALESCE(?, delivered_at)
            WHERE id = ? OR booking_id = ?
        `, [status, internal_remarks || null, deliveredAt, id, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }

        const [updated] = await pool.query("SELECT * FROM water_tanker_bookings WHERE id = ? OR booking_id = ? LIMIT 1", [id, id]);

        emitWaterUpdate({
            type: "tanker_status_update",
            booking: updated[0],
            updatedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            message: `Tanker booking status updated to ${status}.`,
            booking: updated[0]
        });
    } catch (err) {
        console.error("Update tanker status error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// =========================================================
// 16. WATER PIPELINES — GET ALL (Infrastructure Monitoring)
// =========================================================
router.get("/api/water/pipelines", async (req, res) => {
    try {
        const [results] = await pool.query("SELECT * FROM water_pipelines ORDER BY id ASC");
        res.json({ success: true, pipelines: results });
    } catch (err) {
        console.error("Pipelines fetch error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// =========================================================
// 17. WATER TECHNICIANS — GET ALL (Roster Directory)
// =========================================================
router.get("/api/water/technicians", async (req, res) => {
    try {
        const [results] = await pool.query("SELECT * FROM water_technicians ORDER BY role, name ASC");
        res.json({ success: true, technicians: results });
    } catch (err) {
        console.error("Technicians fetch error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// =========================================================
// 18. WATER QUALITY LOGS — GET & RECORD (SCADA Lab Telemetry)
// =========================================================
router.get("/api/water/quality", async (req, res) => {
    try {
        const [results] = await pool.query("SELECT * FROM water_quality_logs ORDER BY tested_at DESC LIMIT 20");
        res.json({ success: true, logs: results });
    } catch (err) {
        console.error("Water quality logs fetch error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

router.post("/api/water/quality", authenticateToken, requireWaterStaff, async (req, res) => {
    const { zone, ph, tds, turbidity, chlorine, status, tested_by } = req.body;
    if (!zone) {
        return res.status(400).json({ success: false, message: "Zone name is required." });
    }

    const nPh = Number(ph) || 7.2;
    const nTds = Number(tds) || 280;
    const nTurb = Number(turbidity) || 1.2;
    const nChlor = Number(chlorine) || 0.5;
    const calculatedStatus = (nPh >= 6.5 && nPh <= 8.5 && nTds <= 500) ? "Safe" : (nTds > 700 ? "Unsafe" : "Moderate");

    try {
        const [result] = await pool.query(`
            INSERT INTO water_quality_logs (zone, ph, tds, turbidity, chlorine, status, tested_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [zone, nPh, nTds, nTurb, nChlor, status || calculatedStatus, tested_by || (req.user && req.user.name) || "Gorakhpur Jal Lab"]);

        const [created] = await pool.query("SELECT * FROM water_quality_logs WHERE id = ?", [result.insertId]);

        emitWaterUpdate({
            type: "water_quality_logged",
            qualityLog: created[0],
            updatedAt: new Date().toISOString()
        });

        res.status(201).json({ success: true, message: "Water quality test log recorded.", log: created[0] });
    } catch (err) {
        console.error("Log water quality error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// =========================================================
// 19. WATER SUPPLY SCHEDULES — GET & UPDATE (Ward Distribution)
// =========================================================
router.get("/api/water/schedules", async (req, res) => {
    try {
        const [results] = await pool.query("SELECT * FROM water_supply_schedules ORDER BY id ASC");
        res.json({ success: true, schedules: results });
    } catch (err) {
        console.error("Supply schedules fetch error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

router.put("/api/water/schedules/:id", authenticateToken, requireWaterStaff, async (req, res) => {
    const id = req.params.id;
    const { supply_time, duration, pressure, status } = req.body;

    try {
        const [result] = await pool.query(`
            UPDATE water_supply_schedules
            SET supply_time = COALESCE(?, supply_time),
                duration = COALESCE(?, duration),
                pressure = COALESCE(?, pressure),
                status = COALESCE(?, status)
            WHERE id = ?
        `, [supply_time || null, duration || null, pressure || null, status || null, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Schedule not found." });
        }

        const [updated] = await pool.query("SELECT * FROM water_supply_schedules WHERE id = ?", [id]);
        res.json({ success: true, message: "Supply schedule updated.", schedule: updated[0] });
    } catch (err) {
        console.error("Update supply schedule error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

module.exports = router;
