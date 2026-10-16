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
    requireDepartment,
    hashPassword
} = require("../middleware/auth.middleware");
const { emitWaterUpdate } = require("../sockets/index");
const { logAudit } = require("../services/audit_logger");
const waterIntelligenceService = require("../services/water_intelligence_service");

// Helper: Safely parse JSON
function safeParseJson(str, fallback) {
    if (!str) return fallback;
    if (typeof str === "object") return str;
    try {
        return JSON.parse(str);
    } catch {
        return fallback;
    }
}

// Helper: Record Network Audit Log for Digital Twin Operations
async function recordNetworkAudit({
    action_type,
    entity_type,
    entity_id,
    entity_name,
    changed_by_id = "WTR-ADMIN-01",
    changed_by_name = "Water Admin",
    previous_state = null,
    new_state = null,
    impact_summary = ""
}) {
    try {
        await pool.query(`
            INSERT INTO water_network_audit_logs
            (action_type, entity_type, entity_id, entity_name, changed_by_id, changed_by_name, previous_state, new_state, impact_summary)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            action_type,
            entity_type,
            String(entity_id || "NET-ID"),
            entity_name || String(entity_id || "Network Entity"),
            changed_by_id,
            changed_by_name,
            previous_state ? (typeof previous_state === "string" ? previous_state : JSON.stringify(previous_state)) : null,
            new_state ? (typeof new_state === "string" ? new_state : JSON.stringify(new_state)) : null,
            impact_summary || ""
        ]);
    } catch (e) {
        console.warn("Could not record network audit log:", e.message);
    }
}

// Helper: Check if user is Super Admin
function isSuperAdminUser(user) {
    if (!user) return false;
    const role = (user.role || user.type || "").toLowerCase();
    const accountType = (user.accountType || "").toLowerCase();
    const dept = (user.department || "").toLowerCase();
    return role === "super_admin" || role === "superadmin" || accountType === "super_admin" || (role === "admin" && (dept === "admin" || !dept || dept === "municipal"));
}

// Helper: Check if user is Water Admin
function isWaterAdminUser(user) {
    if (!user) return false;
    if (isSuperAdminUser(user)) return true;

    const role = (user.role || user.type || "").toLowerCase();
    const accountType = (user.accountType || "").toLowerCase();
    const subRole = (user.subRole || user.designation || "").toLowerCase();
    const dept = (user.department || "").toLowerCase();
    const staffId = (user.staffId || user.staff_id || "").toUpperCase();

    // Strict Department Isolation: block Hospital, Traffic, Police, Waste, Emergency
    const otherDepts = ["hospital", "healthcare", "traffic", "police", "waste", "sanitation", "emergency", "fire"];
    if (otherDepts.includes(dept) && !dept.includes("water")) {
        return false;
    }
    if (user.hospitalId || user.hospitalRole) {
        return false;
    }

    if (
        role === "water_admin" ||
        accountType === "water_admin" ||
        staffId === "WTR-ADMIN" ||
        subRole.includes("water admin") ||
        subRole.includes("superintendent") ||
        (role === "admin" && (dept === "water" || dept.includes("water works") || dept.includes("jal nigam")))
    ) {
        return true;
    }
    return false;
}

// Helper: Check if user is Water Staff
function isWaterStaffUser(user) {
    if (!user) return false;
    if (isWaterAdminUser(user)) return true;

    const role = (user.role || user.type || "").toLowerCase();
    const accountType = (user.accountType || "").toLowerCase();
    const subRole = (user.subRole || user.designation || "").toLowerCase();
    const dept = (user.department || "").toLowerCase();
    const staffId = (user.staffId || user.staff_id || "").toUpperCase();
    const editable = Array.isArray(user.editable) ? user.editable.map(e => String(e).toLowerCase()) : [];

    // Strict Department Isolation: block Hospital, Traffic, Police, Waste, Emergency
    const otherDepts = ["hospital", "healthcare", "traffic", "police", "waste", "sanitation", "emergency", "fire"];
    if (otherDepts.includes(dept) && !dept.includes("water") && !editable.includes("water")) {
        return false;
    }
    if ((user.hospitalId || user.hospitalRole) && !editable.includes("water")) {
        return false;
    }

    if (
        role === "staff" ||
        role === "water_staff" ||
        role === "engineer" ||
        role === "technician" ||
        staffId.startsWith("WTR")
    ) {
        if (
            dept === "water" ||
            dept.includes("water works") ||
            dept.includes("jal nigam") ||
            subRole.includes("water") ||
            subRole.includes("pipeline") ||
            subRole.includes("engineer") ||
            editable.includes("water") ||
            staffId.startsWith("WTR")
        ) {
            return true;
        }
    }
    return false;
}

// Helper: Guard strictly for Water Administrators
function requireWaterAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Authentication required." });
    }
    if (isWaterAdminUser(req.user)) {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: "Access denied. Privileged action reserved strictly for Water Administrator."
    });
}

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
    if (isWaterStaffUser(req.user)) {
        return next();
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
router.get(["/api/water/reports", "/api/water/complaints"], optionalToken, async (req, res) => {
    const { status, userId, priority } = req.query;
    const role = (req.user ? (req.user.role || req.user.type || "") : "").toLowerCase();
    const isStaffOrAdmin = role === "admin" || (role === "staff" && ((req.user.department || "").toLowerCase() === "water" || (req.user.editable || []).includes("water")));

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

    if (isStaffOrAdmin) {
        if (userId) {
            conditions.push("user_id = ?");
            params.push(userId);
        }
    } else if (req.user) {
        // Authenticated citizen: restrict to their own reports
        conditions.push("user_id = ?");
        params.push(req.user.id);
    }

    let sql = `
        SELECT id, report_id, user_id, 
               ${isStaffOrAdmin || req.user ? "citizen_name, mobile," : "'Verified Citizen' AS citizen_name, NULL AS mobile,"}
               issue_type, location, description, status, priority,
               assigned_technician_id, assigned_technician_name,
               ${isStaffOrAdmin ? "evidence_image, internal_remarks," : "NULL AS evidence_image, NULL AS internal_remarks,"}
               created_at, updated_at, resolved_at
        FROM water_reports
    `;

    if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY created_at DESC LIMIT 50";

    try {
        const [results] = await pool.query(sql, params);
        res.json({ success: true, reports: results, complaints: results });
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
router.post(["/api/water/tanker-bookings", "/api/water/tanker-booking", "/api/water/book-tanker"], optionalToken, async (req, res) => {
    const {
        userId, citizenName, name, mobile, deliveryAddress, address, capacity, capacityLiters, bookingDate, deliverySlot,
        citizen_name, contact_number, delivery_address, capacity_liters, delivery_slot
    } = req.body;

    const finalAddress = deliveryAddress || address || delivery_address;
    if (!finalAddress) {
        return res.status(400).json({ success: false, message: "Delivery address is required." });
    }

    const cName = citizenName || name || citizen_name || (req.user && req.user.name) || "Citizen";
    const cMobile = mobile || contact_number || (req.user && req.user.phone) || (req.user && req.user.mobile) || "9876543210";
    const bookingId = "TKB-" + Date.now().toString(36).toUpperCase();
    const date = bookingDate || new Date().toISOString().split("T")[0];
    const finalCapacity = capacity || capacityLiters || capacity_liters || 3000;
    const finalSlot = deliverySlot || delivery_slot || "MORNING";
    const cap = capacity || (capacityLiters ? `${capacityLiters} Litres` : "5000 Litres");
    const slot = deliverySlot || "Morning (08:00 AM - 12:00 PM)";

    try {
        const [result] = await pool.query(`
            INSERT INTO water_tanker_bookings
            (booking_id, user_id, citizen_name, mobile, delivery_address, capacity, booking_date, delivery_slot, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
        `, [bookingId, String(userId || (req.user && req.user.id) || "guest-citizen"), cName, cMobile, finalAddress, cap, date, slot]);

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
router.get(["/api/water/tanker-bookings", "/api/water/tanker-requests"], optionalToken, async (req, res) => {
    const { userId, status } = req.query;
    const role = (req.user ? (req.user.role || req.user.type || "") : "").toLowerCase();
    const isStaffOrAdmin = role === "admin" || (role === "staff" && ((req.user.department || "").toLowerCase() === "water" || (req.user.editable || []).includes("water")));

    if (!req.user) {
        // Unauthenticated users cannot view private tanker bookings
        return res.json({ success: true, count: 0, bookings: [], tankerRequests: [] });
    }

    let sql = `
        SELECT id, booking_id, user_id, citizen_name, mobile,
               delivery_address, capacity, booking_date, delivery_slot,
               assigned_driver_name, assigned_driver_phone, assigned_tanker_number,
               status, internal_remarks, dispatched_at, delivered_at, created_at
        FROM water_tanker_bookings
    `;

    const params = [];
    const conditions = [];

    if (!isStaffOrAdmin) {
        conditions.push("user_id = ?");
        params.push(req.user.id);
    } else if (userId) {
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
        res.json({ success: true, count: results.length, bookings: results, tankerRequests: results });
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

// Helper: Normalize pipeline status to match ENUM('Normal', 'High Pressure', 'Low Pressure', 'Leakage Detected', 'Under Maintenance')
function normalizePipelineStatus(st) {
    if (!st) return 'Normal';
    const s = String(st).trim().toLowerCase();
    if (s.includes('leak')) return 'Leakage Detected';
    if (s.includes('maint')) return 'Under Maintenance';
    if (s.includes('high')) return 'High Pressure';
    if (s.includes('low')) return 'Low Pressure';
    return 'Normal';
}

// Admin Create New Pipeline from Map (Fresh Water, Sewage, or Multi-Point Feeder)
router.post(["/api/water/pipelines", "/api/water/network/pipelines"], authenticateToken, requireWaterAdmin, async (req, res) => {
    try {
        let {
            pipeline_code, name, zone, pipe_type,
            start_lat, start_lng, end_lat, end_lng,
            diameter_mm, material, depth_meters, pressure_bar, flow_rate_lps,
            source_node, target_node, status, curve_points,
            road_name, lane_count, road_width_m, flow_direction,
            branch_from_id, junction_id, slope_percent, invert_level_m
        } = req.body;

        // Auto-extract start and end coordinates if curve_points array is supplied
        let pts = null;
        if (curve_points) {
            pts = typeof curve_points === "string" ? JSON.parse(curve_points) : curve_points;
        }
        if (pts && Array.isArray(pts) && pts.length >= 2) {
            const p0 = pts[0];
            const pN = pts[pts.length - 1];
            if (start_lat === undefined || start_lat === null) start_lat = p0.lat !== undefined ? p0.lat : p0[0];
            if (start_lng === undefined || start_lng === null) start_lng = p0.lng !== undefined ? p0.lng : p0[1];
            if (end_lat === undefined || end_lat === null) end_lat = pN.lat !== undefined ? pN.lat : pN[0];
            if (end_lng === undefined || end_lng === null) end_lng = pN.lng !== undefined ? pN.lng : pN[1];
        }

        if (!name || start_lat === undefined || start_lng === undefined || end_lat === undefined || end_lng === undefined) {
            return res.status(400).json({ success: false, message: "Pipeline name and start/end coordinates are required." });
        }

        // Normalize pipe type
        const normType = String(pipe_type || "POTABLE").toUpperCase();
        const validTypes = ["POTABLE", "WASTEWATER", "SEWAGE", "RECLAIMED", "STORMWATER", "POTABLE_WATER", "RECLAIMED_WATER"];
        const finalType = validTypes.includes(normType) ? normType : (normType.includes("SEW") || normType.includes("WASTE") ? "WASTEWATER" : "POTABLE");

        if (!pipeline_code) {
            const prefix = (finalType === "WASTEWATER" || finalType === "SEWAGE") ? "PL-SEW-" : "PL-WAT-" ;
            pipeline_code = prefix + Math.floor(1000 + Math.random() * 9000);
        }

        const normalizedCurve = curve_points ? (typeof curve_points === "string" ? curve_points : JSON.stringify(curve_points)) : (pts ? JSON.stringify(pts) : null);

        const defaultDepth = (finalType === "WASTEWATER" || finalType === "SEWAGE") ? 2.8 : 1.8;

        const [result] = await pool.query(`
            INSERT INTO water_pipelines
            (pipeline_code, name, zone, pressure_bar, flow_rate_lps, status, pipe_type, start_lat, start_lng, end_lat, end_lng, diameter_mm, material, depth_meters, source_node, target_node, data_source, curve_points, road_name, lane_count, road_width_m, flow_direction, branch_from_id, junction_id, slope_percent, invert_level_m)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MEASURED', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            pipeline_code,
            name.trim(),
            zone || "Gorakhpur Municipal Area",
            Number(pressure_bar) || (finalType === "POTABLE" ? 3.4 : 0.0),
            Number(flow_rate_lps) || 45.0,
            normalizePipelineStatus(status),
            finalType,
            Number(start_lat),
            Number(start_lng),
            Number(end_lat),
            Number(end_lng),
            Number(diameter_mm) || 450,
            material || (finalType === "POTABLE" ? "Ductile Iron" : "Reinforced Concrete (RCC)"),
            Number(depth_meters) || defaultDepth,
            source_node || "NODE-SRC",
            target_node || "NODE-TGT",
            normalizedCurve,
            road_name || null,
            Number(lane_count) || (road_name ? 4 : null),
            Number(road_width_m) || (road_name ? 24 : null),
            flow_direction || "FORWARD",
            branch_from_id || null,
            junction_id || null,
            Number(slope_percent) || 0.60,
            Number(invert_level_m) || 82.10
        ]);

        const [created] = await pool.query("SELECT * FROM water_pipelines WHERE id = ?", [result.insertId]);

        await recordNetworkAudit({
            action_type: "PIPELINE_CREATED",
            entity_type: "PIPELINE",
            entity_id: pipeline_code,
            entity_name: name.trim(),
            changed_by_id: req.user?.id || "WTR-ADMIN-01",
            changed_by_name: req.user?.name || "Water Admin",
            new_state: created[0],
            impact_summary: `Created ${finalType} pipeline ${name.trim()} (${pipeline_code}) with ${pts ? pts.length : 2} coordinates.`
        });

        emitWaterUpdate({
            type: "pipeline_created",
            pipeline: created[0],
            updatedAt: new Date().toISOString()
        });

        res.status(201).json({
            success: true,
            message: `Pipeline ${pipeline_code} created successfully on GIS map.`,
            pipeline: created[0]
        });
    } catch (err) {
        console.error("Create pipeline error:", err);
        res.status(500).json({ success: false, message: err.message || "Database error creating pipeline." });
    }
});

// Admin Update Pipeline Location Coordinates & Attributes via Map
router.put(["/api/water/pipelines/:id", "/api/water/network/pipelines/:id"], authenticateToken, requireWaterAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        const isNum = !isNaN(Number(id));
        const [existing] = await pool.query(
            `SELECT * FROM water_pipelines WHERE ${isNum ? "id = ? OR pipeline_code = ?" : "pipeline_code = ?"} LIMIT 1`,
            isNum ? [Number(id), String(id)] : [String(id)]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Pipeline not found." });
        }

        const pipe = existing[0];
        const {
            name, zone, pipe_type,
            start_lat, start_lng, end_lat, end_lng,
            diameter_mm, material, depth_meters, pressure_bar, flow_rate_lps,
            source_node, target_node, status, curve_points,
            road_name, lane_count, road_width_m, flow_direction,
            branch_from_id, junction_id, slope_percent, invert_level_m
        } = req.body;

        const updates = [];
        const params = [];

        if (name !== undefined) { updates.push("name = ?"); params.push(name.trim()); }
        if (zone !== undefined) { updates.push("zone = ?"); params.push(zone.trim()); }
        if (pipe_type !== undefined) { updates.push("pipe_type = ?"); params.push(pipe_type); }
        if (start_lat !== undefined) { updates.push("start_lat = ?"); params.push(Number(start_lat)); }
        if (start_lng !== undefined) { updates.push("start_lng = ?"); params.push(Number(start_lng)); }
        if (end_lat !== undefined) { updates.push("end_lat = ?"); params.push(Number(end_lat)); }
        if (end_lng !== undefined) { updates.push("end_lng = ?"); params.push(Number(end_lng)); }
        if (diameter_mm !== undefined) { updates.push("diameter_mm = ?"); params.push(Number(diameter_mm)); }
        if (material !== undefined) { updates.push("material = ?"); params.push(material); }
        if (depth_meters !== undefined) { updates.push("depth_meters = ?"); params.push(Number(depth_meters)); }
        if (pressure_bar !== undefined) { updates.push("pressure_bar = ?"); params.push(Number(pressure_bar)); }
        if (flow_rate_lps !== undefined) { updates.push("flow_rate_lps = ?"); params.push(Number(flow_rate_lps)); }
        if (source_node !== undefined) { updates.push("source_node = ?"); params.push(source_node); }
        if (target_node !== undefined) { updates.push("target_node = ?"); params.push(target_node); }
        if (status !== undefined) { updates.push("status = ?"); params.push(normalizePipelineStatus(status)); }
        if (road_name !== undefined) { updates.push("road_name = ?"); params.push(road_name); }
        if (lane_count !== undefined) { updates.push("lane_count = ?"); params.push(Number(lane_count)); }
        if (road_width_m !== undefined) { updates.push("road_width_m = ?"); params.push(Number(road_width_m)); }
        if (flow_direction !== undefined) { updates.push("flow_direction = ?"); params.push(flow_direction); }
        if (branch_from_id !== undefined) { updates.push("branch_from_id = ?"); params.push(branch_from_id); }
        if (junction_id !== undefined) { updates.push("junction_id = ?"); params.push(junction_id); }
        if (slope_percent !== undefined) { updates.push("slope_percent = ?"); params.push(Number(slope_percent)); }
        if (invert_level_m !== undefined) { updates.push("invert_level_m = ?"); params.push(Number(invert_level_m)); }
        if (curve_points !== undefined) {
            updates.push("curve_points = ?");
            params.push(curve_points ? (typeof curve_points === "string" ? curve_points : JSON.stringify(curve_points)) : null);

            // Auto-update start and end coords if not explicitly provided
            const pts = typeof curve_points === "string" ? safeParseJson(curve_points, null) : curve_points;
            if (Array.isArray(pts) && pts.length >= 2) {
                const p0 = pts[0];
                const pN = pts[pts.length - 1];
                if (start_lat === undefined) {
                    updates.push("start_lat = ?");
                    params.push(Number(p0.lat !== undefined ? p0.lat : p0[0]));
                }
                if (start_lng === undefined) {
                    updates.push("start_lng = ?");
                    params.push(Number(p0.lng !== undefined ? p0.lng : p0[1]));
                }
                if (end_lat === undefined) {
                    updates.push("end_lat = ?");
                    params.push(Number(pN.lat !== undefined ? pN.lat : pN[0]));
                }
                if (end_lng === undefined) {
                    updates.push("end_lng = ?");
                    params.push(Number(pN.lng !== undefined ? pN.lng : pN[1]));
                }
            }
        }

        if (updates.length > 0) {
            params.push(pipe.id);
            await pool.query(`UPDATE water_pipelines SET ${updates.join(", ")} WHERE id = ?`, params);
        }

        const [updated] = await pool.query("SELECT * FROM water_pipelines WHERE id = ?", [pipe.id]);

        await recordNetworkAudit({
            action_type: "PIPELINE_UPDATED",
            entity_type: "PIPELINE",
            entity_id: pipe.pipeline_code,
            entity_name: pipe.name,
            changed_by_id: req.user?.id || "WTR-ADMIN-01",
            changed_by_name: req.user?.name || "Water Admin",
            previous_state: pipe,
            new_state: updated[0],
            impact_summary: `Updated pipeline ${pipe.name} (${pipe.pipeline_code}) parameters and geometry.`
        });

        emitWaterUpdate({
            type: "pipeline_updated",
            pipeline: updated[0],
            updatedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            message: `Pipeline ${pipe.pipeline_code} location & parameters updated.`,
            pipeline: updated[0]
        });
    } catch (err) {
        console.error("Update pipeline error:", err);
        res.status(500).json({ success: false, message: err.message || "Database error updating pipeline." });
    }
});

// Admin Delete Pipeline
router.delete(["/api/water/pipelines/:id", "/api/water/network/pipelines/:id"], authenticateToken, requireWaterAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        const isNum = !isNaN(Number(id));
        const [existing] = await pool.query(
            `SELECT * FROM water_pipelines WHERE ${isNum ? "id = ? OR pipeline_code = ?" : "pipeline_code = ?"} LIMIT 1`,
            isNum ? [Number(id), String(id)] : [String(id)]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Pipeline not found." });
        }

        await pool.query("DELETE FROM water_pipelines WHERE id = ?", [existing[0].id]);

        await recordNetworkAudit({
            action_type: "PIPELINE_DELETED",
            entity_type: "PIPELINE",
            entity_id: existing[0].pipeline_code,
            entity_name: existing[0].name,
            changed_by_id: req.user?.id || "WTR-ADMIN-01",
            changed_by_name: req.user?.name || "Water Admin",
            previous_state: existing[0],
            impact_summary: `Deleted pipeline ${existing[0].name} (${existing[0].pipeline_code}) from network.`
        });

        emitWaterUpdate({
            type: "pipeline_deleted",
            pipeline_code: existing[0].pipeline_code,
            updatedAt: new Date().toISOString()
        });

        res.json({ success: true, message: `Pipeline ${existing[0].pipeline_code} deleted from map.` });
    } catch (err) {
        console.error("Delete pipeline error:", err);
        res.status(500).json({ success: false, message: "Database error deleting pipeline." });
    }
});

// =========================================================
// 16A-1. MULTI-POINT PIPELINE SPLIT & JUNCTION INSERTION
// =========================================================
router.post("/api/water/pipelines/split", authenticateToken, requireWaterAdmin, async (req, res) => {
    try {
        const pipeline_id = req.body.pipeline_id || req.body.pipelineId;
        const split_lat = req.body.split_lat !== undefined ? req.body.split_lat : (req.body.splitCoord ? req.body.splitCoord.lat : undefined);
        const split_lng = req.body.split_lng !== undefined ? req.body.split_lng : (req.body.splitCoord ? req.body.splitCoord.lng : undefined);
        const { junction_name, new_pipe_name } = req.body;

        if (!pipeline_id || split_lat === undefined || split_lng === undefined) {
            return res.status(400).json({ success: false, message: "pipeline_id, split_lat, and split_lng are required." });
        }

        const isNum = !isNaN(Number(pipeline_id));
        const [existing] = await pool.query(
            `SELECT * FROM water_pipelines WHERE ${isNum ? "id = ? OR pipeline_code = ?" : "pipeline_code = ?"} LIMIT 1`,
            isNum ? [Number(pipeline_id), String(pipeline_id)] : [String(pipeline_id)]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Pipeline not found." });
        }

        const origPipe = existing[0];
        let pts = [];
        if (origPipe.curve_points) {
            pts = typeof origPipe.curve_points === "string" ? JSON.parse(origPipe.curve_points) : origPipe.curve_points;
        }
        if (!pts || !Array.isArray(pts) || pts.length < 2) {
            pts = [
                { lat: Number(origPipe.start_lat), lng: Number(origPipe.start_lng) },
                { lat: Number(origPipe.end_lat), lng: Number(origPipe.end_lng) }
            ];
        }

        const sLat = Number(Number(split_lat).toFixed(6));
        const sLng = Number(Number(split_lng).toFixed(6));

        // Find nearest vertex index to split coordinates
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < pts.length; i++) {
            const pLat = pts[i].lat !== undefined ? pts[i].lat : pts[i][0];
            const pLng = pts[i].lng !== undefined ? pts[i].lng : pts[i][1];
            const d = Math.hypot(pLat - sLat, pLng - sLng);
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
        }

        // Clamp index so both segments have at least 2 points
        const splitIdx = Math.max(1, Math.min(pts.length - 1, bestIdx));

        const seg1Pts = pts.slice(0, splitIdx + 1);
        seg1Pts[seg1Pts.length - 1] = { lat: sLat, lng: sLng };

        const seg2Pts = [{ lat: sLat, lng: sLng }, ...pts.slice(splitIdx)];

        // Generate junction ID and insert into water_network_assets
        const juncId = `JNC-SPLIT-${Date.now().toString().slice(-4)}`;
        const juncName = junction_name || `${origPipe.name} Junction Node`;

        await pool.query(`
            INSERT INTO water_network_assets
            (asset_id, name, asset_type, zone, latitude, longitude, elevation_m, status, data_source)
            VALUES (?, ?, 'NETWORK_JUNCTION', ?, ?, ?, 84.50, 'OPERATIONAL', 'MEASURED')
        `, [
            juncId,
            juncName,
            origPipe.zone || "Gorakhpur Central",
            sLat,
            sLng
        ]);

        // Update Segment 1 (original pipeline)
        await pool.query(`
            UPDATE water_pipelines
            SET end_lat = ?, end_lng = ?, target_node = ?, curve_points = ?, junction_id = ?
            WHERE id = ?
        `, [
            sLat,
            sLng,
            juncId,
            JSON.stringify(seg1Pts),
            juncId,
            origPipe.id
        ]);

        // Insert Segment 2
        const seg2Code = `${origPipe.pipeline_code || "PL"}-B-${Math.floor(100 + Math.random() * 900)}`;
        const seg2Name = new_pipe_name || `${origPipe.name} (Segment 2)`;

        const [insResult] = await pool.query(`
            INSERT INTO water_pipelines
            (pipeline_code, name, zone, pressure_bar, flow_rate_lps, status, pipe_type, start_lat, start_lng, end_lat, end_lng, diameter_mm, material, depth_meters, source_node, target_node, data_source, curve_points, road_name, lane_count, road_width_m, flow_direction, branch_from_id, junction_id, slope_percent, invert_level_m)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MEASURED', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            seg2Code,
            seg2Name,
            origPipe.zone,
            origPipe.pressure_bar,
            origPipe.flow_rate_lps,
            origPipe.status,
            origPipe.pipe_type,
            sLat,
            sLng,
            Number(origPipe.end_lat),
            Number(origPipe.end_lng),
            origPipe.diameter_mm,
            origPipe.material,
            origPipe.depth_meters,
            juncId,
            origPipe.target_node,
            JSON.stringify(seg2Pts),
            origPipe.road_name,
            origPipe.lane_count,
            origPipe.road_width_m,
            origPipe.flow_direction,
            origPipe.pipeline_code,
            juncId,
            origPipe.slope_percent || 0.60,
            origPipe.invert_level_m || 82.10
        ]);

        const [createdSeg2] = await pool.query("SELECT * FROM water_pipelines WHERE id = ?", [insResult.insertId]);
        const [updatedSeg1] = await pool.query("SELECT * FROM water_pipelines WHERE id = ?", [origPipe.id]);
        const [createdJunc] = await pool.query("SELECT * FROM water_network_assets WHERE asset_id = ?", [juncId]);

        await recordNetworkAudit({
            action_type: "PIPELINE_SPLIT",
            entity_type: "PIPELINE",
            entity_id: origPipe.pipeline_code,
            entity_name: origPipe.name,
            changed_by_id: req.user?.id || "WTR-ADMIN-01",
            changed_by_name: req.user?.name || "Water Admin",
            previous_state: { pipeline: origPipe },
            new_state: { segment1: updatedSeg1[0], segment2: createdSeg2[0], junction: createdJunc[0] },
            impact_summary: `Split pipeline ${origPipe.name} at junction ${juncId} into two connected segments.`
        });

        emitWaterUpdate({ type: "pipeline_updated", pipeline: updatedSeg1[0], updatedAt: new Date().toISOString() });
        emitWaterUpdate({ type: "pipeline_created", pipeline: createdSeg2[0], updatedAt: new Date().toISOString() });

        res.status(201).json({
            success: true,
            message: `Pipeline ${origPipe.name} split successfully at junction ${juncId}.`,
            junction: createdJunc[0],
            junctionAsset: createdJunc[0],
            segment1: updatedSeg1[0],
            segment2: createdSeg2[0],
            segmentA: updatedSeg1[0],
            segmentB: createdSeg2[0]
        });
    } catch (err) {
        console.error("Split pipeline error:", err);
        res.status(500).json({ success: false, message: err.message || "Database error splitting pipeline." });
    }
});

// =========================================================
// 16A-2. CREATE BRANCH ROUTE FROM EXISTING JUNCTION
// =========================================================
router.post("/api/water/pipelines/branch", authenticateToken, requireWaterAdmin, async (req, res) => {
    try {
        const parent_pipeline_id = req.body.parent_pipeline_id || req.body.parentPipelineId;
        const branch_coords = req.body.branch_coords || req.body.points || req.body.curve_points;
        const junction_id = req.body.junction_id || req.body.junctionId;
        const depth_meters = req.body.depth_meters || req.body.depth_m;
        const {
            name,
            pipe_type,
            diameter_mm,
            material,
            target_node
        } = req.body;

        if (!branch_coords || !Array.isArray(branch_coords) || branch_coords.length < 2) {
            return res.status(400).json({ success: false, message: "branch_coords must be an array of at least 2 points." });
        }

        const isNum = !isNaN(Number(parent_pipeline_id));
        const [parent] = await pool.query(
            `SELECT * FROM water_pipelines WHERE ${isNum ? "id = ? OR pipeline_code = ?" : "pipeline_code = ?"} LIMIT 1`,
            isNum ? [Number(parent_pipeline_id), String(parent_pipeline_id)] : [String(parent_pipeline_id)]
        );

        const parentPipe = parent[0] || null;
        const startPoint = branch_coords[0];
        const endPoint = branch_coords[branch_coords.length - 1];

        const sLat = Number(startPoint.lat !== undefined ? startPoint.lat : startPoint[0]);
        const sLng = Number(startPoint.lng !== undefined ? startPoint.lng : startPoint[1]);
        const eLat = Number(endPoint.lat !== undefined ? endPoint.lat : endPoint[0]);
        const eLng = Number(endPoint.lng !== undefined ? endPoint.lng : endPoint[1]);

        const juncCode = junction_id || `JNC-BR-${Date.now().toString().slice(-4)}`;

        // Verify or create junction asset
        const [existJunc] = await pool.query("SELECT * FROM water_network_assets WHERE asset_id = ? LIMIT 1", [juncCode]);
        if (existJunc.length === 0) {
            await pool.query(`
                INSERT INTO water_network_assets
                (asset_id, name, asset_type, zone, latitude, longitude, elevation_m, status, data_source)
                VALUES (?, ?, 'NETWORK_JUNCTION', ?, ?, ?, 84.50, 'OPERATIONAL', 'MEASURED')
            `, [
                juncCode,
                `${name || "Branch"} T-Junction Hub`,
                parentPipe?.zone || "Gorakhpur Central",
                sLat,
                sLng
            ]);
        }

        const normType = String(pipe_type || parentPipe?.pipe_type || "POTABLE").toUpperCase();
        const branchCode = `PL-BR-${Math.floor(1000 + Math.random() * 9000)}`;
        const branchName = name || `${parentPipe?.name || "Main Line"} Distribution Branch`;

        const [result] = await pool.query(`
            INSERT INTO water_pipelines
            (pipeline_code, name, zone, pressure_bar, flow_rate_lps, status, pipe_type, start_lat, start_lng, end_lat, end_lng, diameter_mm, material, depth_meters, source_node, target_node, data_source, curve_points, road_name, lane_count, road_width_m, flow_direction, branch_from_id, junction_id)
            VALUES (?, ?, ?, ?, ?, 'Normal', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MEASURED', ?, ?, ?, ?, 'FORWARD', ?, ?)
        `, [
            branchCode,
            branchName,
            parentPipe?.zone || "Gorakhpur Central",
            parentPipe ? Number(parentPipe.pressure_bar) * 0.95 : 2.5,
            parentPipe ? Number(parentPipe.flow_rate_lps) * 0.5 : 30.0,
            normType,
            sLat,
            sLng,
            eLat,
            eLng,
            Number(diameter_mm) || 300,
            material || "HDPE",
            Number(depth_meters) || (normType.includes("SEW") ? 2.8 : 1.8),
            juncCode,
            target_node || "NODE-DEST",
            JSON.stringify(branch_coords),
            parentPipe?.road_name || "Surveyed Sector Link",
            2,
            12.0,
            parentPipe ? parentPipe.id : (parent_pipeline_id || null),
            juncCode
        ]);

        const [created] = await pool.query("SELECT * FROM water_pipelines WHERE id = ?", [result.insertId]);

        await recordNetworkAudit({
            action_type: "CREATE_BRANCH",
            entity_type: "PIPELINE",
            entity_id: branchCode,
            entity_name: branchName,
            changed_by_id: req.user?.id || "WTR-ADMIN-01",
            changed_by_name: req.user?.name || "Water Admin",
            previous_state: { parent_pipeline: parentPipe?.pipeline_code },
            new_state: { branch_pipeline: created[0], junction_id: juncCode },
            impact_summary: `Created branch route ${branchName} (${branchCode}) from junction ${juncCode}.`
        });

        emitWaterUpdate({ type: "pipeline_created", pipeline: created[0], updatedAt: new Date().toISOString() });

        res.status(201).json({
            success: true,
            message: `Branch pipeline ${branchName} created successfully.`,
            branchPipeline: {
                ...created[0],
                branch_from_id: parentPipe ? parentPipe.id : parent_pipeline_id
            },
            junction_id: juncCode
        });
    } catch (err) {
        console.error("Create branch error:", err);
        res.status(500).json({ success: false, message: err.message || "Database error creating branch." });
    }
});

// =========================================================
// 16A-3. COMBINED ROAD CORRIDOR PLANNING (DUAL PARALLEL PIPES)
// =========================================================
router.post("/api/water/pipelines/combined-corridor", authenticateToken, requireWaterAdmin, async (req, res) => {
    try {
        const road_name = req.body.road_name || req.body.roadName;
        const zone = req.body.zone;
        const centerline_points = req.body.centerline_points || req.body.points;
        const water_specs = req.body.water_specs || req.body.potableSpecs || {};
        const sewage_specs = req.body.sewage_specs || req.body.sewageSpecs || {};

        if (!centerline_points || !Array.isArray(centerline_points) || centerline_points.length < 2) {
            return res.status(400).json({ success: false, message: "centerline_points array (minimum 2 points) is required." });
        }

        const road = road_name || "Gorakhpur Arterial Road Corridor";
        const corridorZone = zone || "Gorakhpur Central";

        // Offset polyline laterally in meters
        function offsetCoords(pts, offsetMeters) {
            const result = [];
            const degPerMeterLat = 1 / 111320;
            for (let i = 0; i < pts.length; i++) {
                const prev = pts[Math.max(0, i - 1)];
                const next = pts[Math.min(pts.length - 1, i + 1)];
                const pLat = prev.lat !== undefined ? prev.lat : prev[0];
                const pLng = prev.lng !== undefined ? prev.lng : prev[1];
                const nLat = next.lat !== undefined ? next.lat : next[0];
                const nLng = next.lng !== undefined ? next.lng : next[1];
                const cLat = pts[i].lat !== undefined ? pts[i].lat : pts[i][0];
                const cLng = pts[i].lng !== undefined ? pts[i].lng : pts[i][1];

                const dLat = nLat - pLat;
                const dLng = (nLng - pLng) * Math.cos((pLat * Math.PI) / 180);
                const len = Math.hypot(dLat, dLng) || 0.0001;

                const normLat = -dLng / len;
                const normLng = dLat / len;

                const degPerMeterLng = 1 / (111320 * Math.cos((cLat * Math.PI) / 180));
                result.push({
                    lat: Number((cLat + normLat * offsetMeters * degPerMeterLat).toFixed(6)),
                    lng: Number((cLng + normLng * offsetMeters * degPerMeterLng).toFixed(6))
                });
            }
            return result;
        }

        // Potable pipeline on LEFT verge (-4.0m lateral offset)
        const waterPoints = offsetCoords(centerline_points, -4.0);
        // Sewage pipeline on RIGHT verge (+4.0m lateral offset)
        const sewagePoints = offsetCoords(centerline_points, 4.0);

        const waterCode = `PL-FW-${Math.floor(1000 + Math.random() * 9000)}`;
        const sewageCode = `PL-SW-${Math.floor(1000 + Math.random() * 9000)}`;

        const waterName = water_specs.name || `${road} Potable Water Feeder (Left Verge)`;
        const sewageName = sewage_specs.name || `${road} Sewage Trunk Line (Right Verge)`;

        const waterDepth = Number(water_specs.depth_meters || water_specs.depth_m) || 1.8;
        const sewageDepth = Math.max(2.5, Number(sewage_specs.depth_meters || sewage_specs.depth_m) || 2.8);

        const slopePercent = Number(sewage_specs.slope_percent) || 0.65;
        const invertLevel = Number(sewage_specs.invert_level_m) || 82.20;

        // Insert Water Pipeline
        const [wRes] = await pool.query(`
            INSERT INTO water_pipelines
            (pipeline_code, name, zone, pressure_bar, flow_rate_lps, status, pipe_type, start_lat, start_lng, end_lat, end_lng, diameter_mm, material, depth_meters, source_node, target_node, data_source, curve_points, road_name, lane_count, road_width_m, flow_direction)
            VALUES (?, ?, ?, 3.4, 85.0, 'Normal', 'POTABLE', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MEASURED', ?, ?, 4, 24, 'FORWARD')
        `, [
            waterCode,
            waterName,
            corridorZone,
            waterPoints[0].lat,
            waterPoints[0].lng,
            waterPoints[waterPoints.length - 1].lat,
            waterPoints[waterPoints.length - 1].lng,
            Number(water_specs.diameter_mm) || 600,
            water_specs.material || "Ductile Iron",
            waterDepth,
            water_specs.source_node || "PUMP-01",
            water_specs.target_node || "TANK-001",
            JSON.stringify(waterPoints),
            road
        ]);

        // Insert Sewage Pipeline
        const [sRes] = await pool.query(`
            INSERT INTO water_pipelines
            (pipeline_code, name, zone, pressure_bar, flow_rate_lps, status, pipe_type, start_lat, start_lng, end_lat, end_lng, diameter_mm, material, depth_meters, source_node, target_node, data_source, curve_points, road_name, lane_count, road_width_m, flow_direction, slope_percent, invert_level_m)
            VALUES (?, ?, ?, 0.0, 110.0, 'Normal', 'WASTEWATER', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MEASURED', ?, ?, 4, 24, 'FORWARD', ?, ?)
        `, [
            sewageCode,
            sewageName,
            corridorZone,
            sewagePoints[0].lat,
            sewagePoints[0].lng,
            sewagePoints[sewagePoints.length - 1].lat,
            sewagePoints[sewagePoints.length - 1].lng,
            Number(sewage_specs.diameter_mm) || 800,
            sewage_specs.material || "Reinforced Concrete (RCC)",
            sewageDepth,
            sewage_specs.source_node || "JNC-CTRL-01",
            sewage_specs.target_node || "STP-01",
            JSON.stringify(sewagePoints),
            road,
            slopePercent,
            invertLevel
        ]);

        const [createdWater] = await pool.query("SELECT * FROM water_pipelines WHERE id = ?", [wRes.insertId]);
        const [createdSewage] = await pool.query("SELECT * FROM water_pipelines WHERE id = ?", [sRes.insertId]);

        await recordNetworkAudit({
            action_type: "COMBINED_CORRIDOR_CREATED",
            entity_type: "CORRIDOR",
            entity_id: road,
            entity_name: road,
            changed_by_id: req.user?.id || "WTR-ADMIN-01",
            changed_by_name: req.user?.name || "Water Admin",
            new_state: { waterPipeline: createdWater[0], sewagePipeline: createdSewage[0] },
            impact_summary: `Created combined dual-pipe corridor along ${road}: Potable (${waterCode}, 1.8m depth, Left Verge) and Sewage (${sewageCode}, 2.8m depth, Right Verge).`
        });

        emitWaterUpdate({ type: "pipeline_created", pipeline: createdWater[0], updatedAt: new Date().toISOString() });
        emitWaterUpdate({ type: "pipeline_created", pipeline: createdSewage[0], updatedAt: new Date().toISOString() });

        const pPipe = { ...createdWater[0], burial_depth_m: Number(createdWater[0].depth_meters) };
        const sPipe = { ...createdSewage[0], burial_depth_m: Number(createdSewage[0].depth_meters) };

        res.status(201).json({
            success: true,
            message: `Combined corridor deployed along ${road}: Separate Potable Feeder (Left) and Sewage Trunk (Right).`,
            potablePipeline: pPipe,
            sewagePipeline: sPipe,
            waterPipeline: pPipe
        });
    } catch (err) {
        console.error("Combined corridor error:", err);
        res.status(500).json({ success: false, message: err.message || "Database error creating combined corridor." });
    }
});

// =========================================================
// 16A-4. ASSET RELOCATION WITH CONNECTED-ROUTE VALIDATION
// =========================================================
router.post("/api/water/network/assets/relocate", authenticateToken, requireWaterAdmin, async (req, res) => {
    try {
        const asset_id = req.body.asset_id || req.body.assetId;
        const new_lat = req.body.new_lat !== undefined ? req.body.new_lat : req.body.targetLat;
        const new_lng = req.body.new_lng !== undefined ? req.body.new_lng : req.body.targetLng;
        const confirm_update_connections = req.body.confirm_update_connections;

        if (!asset_id || new_lat === undefined || new_lng === undefined) {
            return res.status(400).json({ success: false, message: "asset_id, new_lat, and new_lng are required." });
        }

        const targetLat = Number(Number(new_lat).toFixed(6));
        const targetLng = Number(Number(new_lng).toFixed(6));

        const isNum = !isNaN(Number(asset_id));
        const [assets] = await pool.query(
            `SELECT * FROM water_network_assets WHERE ${isNum ? "id = ? OR asset_id = ?" : "asset_id = ?"} LIMIT 1`,
            isNum ? [Number(asset_id), String(asset_id)] : [String(asset_id)]
        );

        if (assets.length === 0) {
            return res.status(404).json({ success: false, message: "Asset not found." });
        }

        const asset = assets[0];
        const prevLat = Number(asset.latitude);
        const prevLng = Number(asset.longitude);

        // Find connected pipelines
        const [connectedPipes] = await pool.query(
            "SELECT * FROM water_pipelines WHERE source_node = ? OR target_node = ?",
            [asset.asset_id, asset.asset_id]
        );

        const updatedPipeDetails = [];

        // Update connected pipelines' endpoints
        for (const pipe of connectedPipes) {
            let pts = [];
            if (pipe.curve_points) {
                pts = typeof pipe.curve_points === "string" ? JSON.parse(pipe.curve_points) : pipe.curve_points;
            }
            if (!pts || !Array.isArray(pts) || pts.length === 0) {
                pts = [
                    { lat: Number(pipe.start_lat), lng: Number(pipe.start_lng) },
                    { lat: Number(pipe.end_lat), lng: Number(pipe.end_lng) }
                ];
            }

            const updates = [];
            const params = [];

            if (pipe.source_node === asset.asset_id) {
                updates.push("start_lat = ?", "start_lng = ?");
                params.push(targetLat, targetLng);
                pts[0] = { lat: targetLat, lng: targetLng };
            }
            if (pipe.target_node === asset.asset_id) {
                updates.push("end_lat = ?", "end_lng = ?");
                params.push(targetLat, targetLng);
                pts[pts.length - 1] = { lat: targetLat, lng: targetLng };
            }

            updates.push("curve_points = ?");
            params.push(JSON.stringify(pts));
            params.push(pipe.id);

            await pool.query(`UPDATE water_pipelines SET ${updates.join(", ")} WHERE id = ?`, params);
            updatedPipeDetails.push({ id: pipe.id, pipeline_code: pipe.pipeline_code, name: pipe.name });
        }

        // Update asset location
        await pool.query(
            "UPDATE water_network_assets SET latitude = ?, longitude = ? WHERE id = ?",
            [targetLat, targetLng, asset.id]
        );

        const [updatedAsset] = await pool.query("SELECT * FROM water_network_assets WHERE id = ?", [asset.id]);

        await recordNetworkAudit({
            action_type: "ASSET_RELOCATED",
            entity_type: "ASSET",
            entity_id: asset.asset_id,
            entity_name: asset.name,
            changed_by_id: req.user?.id || "WTR-ADMIN-01",
            changed_by_name: req.user?.name || "Water Admin",
            previous_state: { latitude: prevLat, longitude: prevLng },
            new_state: { latitude: targetLat, longitude: targetLng },
            impact_summary: `Relocated asset ${asset.name} (${asset.asset_id}) from (${prevLat}, ${prevLng}) to (${targetLat}, ${targetLng}). Updated ${updatedPipeDetails.length} connected pipeline endpoints.`
        });

        res.json({
            success: true,
            message: `Asset ${asset.name} relocated successfully. ${updatedPipeDetails.length} connected pipelines updated.`,
            asset: updatedAsset[0],
            previous_coords: { lat: prevLat, lng: prevLng },
            proposed_coords: { lat: targetLat, lng: targetLng },
            connectedPipelinesUpdated: updatedPipeDetails
        });
    } catch (err) {
        console.error("Relocate asset error:", err);
        res.status(500).json({ success: false, message: err.message || "Database error relocating asset." });
    }
});

// =========================================================
// 16A-5. NETWORK AUDIT TRAIL LOGS (ADMIN & STAFF)
// =========================================================
router.get("/api/water/network/audit-logs", authenticateToken, requireWaterStaff, async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM water_network_audit_logs ORDER BY created_at DESC LIMIT 60"
        );
        res.json({ success: true, count: rows.length, auditLogs: rows });
    } catch (err) {
        console.error("Fetch network audit logs error:", err);
        res.status(500).json({ success: false, message: "Database error fetching network audit logs." });
    }
});

// =========================================================
// 16B. 1-KM ZONE MONITORING CENTERS WITH MOTOR CONTROLS
// =========================================================
const GORAKHPUR_MONITORING_CENTERS = [
    {
        id: "MC-01",
        code: "WMC-GOLGHAR",
        name: "Golghar Commercial Area Monitoring Station",
        zone: "Golghar Central",
        latitude: 26.7606,
        longitude: 83.3732,
        coverage_radius_meters: 1000,
        status: "ACTIVE",
        fresh_water_motor: {
            motor_id: "MOT-FW-01",
            name: "Golghar Potable Supply Booster Motor #1",
            status: "RUNNING",
            speed_rpm: 1450,
            flow_lps: 52.4,
            pressure_bar: 3.2,
            target_pressure_bar: 3.0,
            power_kw: 37.5,
            valve_state: "OPEN"
        },
        sewage_water_motor: {
            motor_id: "MOT-SW-01",
            name: "Golghar Sub-Catchment Sewage Lift Motor #1",
            status: "RUNNING",
            speed_rpm: 960,
            flow_lps: 38.1,
            sump_level_pct: 62,
            power_kw: 45.0,
            valve_state: "OPEN"
        },
        last_heartbeat: new Date().toISOString()
    },
    {
        id: "MC-02",
        code: "WMC-CIVIL-LINES",
        name: "Civil Lines & Park Road Monitoring Station",
        zone: "Civil Lines",
        latitude: 26.7559,
        longitude: 83.3705,
        coverage_radius_meters: 1000,
        status: "ACTIVE",
        fresh_water_motor: {
            motor_id: "MOT-FW-02",
            name: "Civil Lines Feeder Pump Motor #2",
            status: "RUNNING",
            speed_rpm: 1420,
            flow_lps: 46.8,
            pressure_bar: 2.9,
            target_pressure_bar: 2.8,
            power_kw: 30.0,
            valve_state: "OPEN"
        },
        sewage_water_motor: {
            motor_id: "MOT-SW-02",
            name: "Civil Lines Sump Gravity Sluice Motor #2",
            status: "RUNNING",
            speed_rpm: 940,
            flow_lps: 34.0,
            sump_level_pct: 58,
            power_kw: 40.0,
            valve_state: "OPEN"
        },
        last_heartbeat: new Date().toISOString()
    },
    {
        id: "MC-03",
        code: "WMC-RAILWAY-JN",
        name: "Gorakhpur Junction & Railway Colony Station",
        zone: "Railway Colony",
        latitude: 26.7615,
        longitude: 83.3662,
        coverage_radius_meters: 1000,
        status: "ACTIVE",
        fresh_water_motor: {
            motor_id: "MOT-FW-03",
            name: "Junction High-Pressure Supply Motor #3",
            status: "RUNNING",
            speed_rpm: 1480,
            flow_lps: 61.2,
            pressure_bar: 3.6,
            target_pressure_bar: 3.5,
            power_kw: 45.0,
            valve_state: "OPEN"
        },
        sewage_water_motor: {
            motor_id: "MOT-SW-03",
            name: "Railway North Sump Lift Motor #3",
            status: "STANDBY",
            speed_rpm: 0,
            flow_lps: 0.0,
            sump_level_pct: 34,
            power_kw: 37.0,
            valve_state: "CLOSED"
        },
        last_heartbeat: new Date().toISOString()
    },
    {
        id: "MC-04",
        code: "WMC-BRD-MED",
        name: "BRD Medical College & Asuran Station",
        zone: "BRD Medical College",
        latitude: 26.7884,
        longitude: 83.3986,
        coverage_radius_meters: 1000,
        status: "ACTIVE",
        fresh_water_motor: {
            motor_id: "MOT-FW-04",
            name: "Medical Campus Hospital Potable Pump #4",
            status: "RUNNING",
            speed_rpm: 1460,
            flow_lps: 58.0,
            pressure_bar: 3.4,
            target_pressure_bar: 3.2,
            power_kw: 42.0,
            valve_state: "OPEN"
        },
        sewage_water_motor: {
            motor_id: "MOT-SW-04",
            name: "North Sewage Interceptor Trunk Pump #4",
            status: "RUNNING",
            speed_rpm: 980,
            flow_lps: 42.5,
            sump_level_pct: 71,
            power_kw: 55.0,
            valve_state: "OPEN"
        },
        last_heartbeat: new Date().toISOString()
    },
    {
        id: "MC-05",
        code: "WMC-MOHADDIPUR",
        name: "Mohaddipur & University Zone Station",
        zone: "Mohaddipur",
        latitude: 26.7480,
        longitude: 83.3820,
        coverage_radius_meters: 1000,
        status: "ACTIVE",
        fresh_water_motor: {
            motor_id: "MOT-FW-05",
            name: "University Sector Main Potable Pump #5",
            status: "RUNNING",
            speed_rpm: 1410,
            flow_lps: 48.0,
            pressure_bar: 3.0,
            target_pressure_bar: 3.0,
            power_kw: 35.0,
            valve_state: "OPEN"
        },
        sewage_water_motor: {
            motor_id: "MOT-SW-05",
            name: "Mohaddipur Drainage Transfer Lift Pump #5",
            status: "RUNNING",
            speed_rpm: 950,
            flow_lps: 36.2,
            sump_level_pct: 55,
            power_kw: 45.0,
            valve_state: "OPEN"
        },
        last_heartbeat: new Date().toISOString()
    },
    {
        id: "MC-06",
        code: "WMC-RAMGARH",
        name: "Ramgarh Tal Lakefront & STP Terminal Station",
        zone: "Ramgarh Tal Lakefront",
        latitude: 26.7350,
        longitude: 83.3850,
        coverage_radius_meters: 1000,
        status: "ACTIVE",
        fresh_water_motor: {
            motor_id: "MOT-FW-06",
            name: "Lakefront Reclaimed Ring Motor #6",
            status: "STANDBY",
            speed_rpm: 0,
            flow_lps: 0.0,
            pressure_bar: 2.1,
            target_pressure_bar: 2.2,
            power_kw: 30.0,
            valve_state: "CLOSED"
        },
        sewage_water_motor: {
            motor_id: "MOT-SW-06",
            name: "Central STP-01 High-Capacity Inflow Lift Motor #6",
            status: "RUNNING",
            speed_rpm: 1100,
            flow_lps: 85.0,
            sump_level_pct: 82,
            power_kw: 75.0,
            valve_state: "OPEN"
        },
        last_heartbeat: new Date().toISOString()
    }
];

// Get all 1km monitoring stations (Public/Visitor, Staff, Admin)
router.get("/api/water/monitoring-stations", (req, res) => {
    res.json({
        success: true,
        count: GORAKHPUR_MONITORING_CENTERS.length,
        monitoring_radius_km: 1.0,
        stations: GORAKHPUR_MONITORING_CENTERS
    });
});

// Operate Motor at a Monitoring Station (Staff / Admin)
router.post("/api/water/monitoring-stations/:id/motor-operate", authenticateToken, requireWaterStaff, (req, res) => {
    const stationId = req.params.id;
    const { motor_type, action, target_state, target_speed_rpm } = req.body;

    const station = GORAKHPUR_MONITORING_CENTERS.find(s => s.id === stationId || s.code === stationId);
    if (!station) {
        return res.status(404).json({ success: false, message: "Monitoring station not found." });
    }

    const isSewage = String(motor_type || "").toLowerCase().includes("sewage");
    const motor = isSewage ? station.sewage_water_motor : station.fresh_water_motor;

    const newState = target_state ? target_state.toUpperCase() : (action === "STOP" ? "STANDBY" : "RUNNING");
    motor.status = newState;
    motor.valve_state = newState === "RUNNING" ? "OPEN" : "CLOSED";
    if (newState === "RUNNING") {
        motor.speed_rpm = target_speed_rpm ? Number(target_speed_rpm) : (isSewage ? 960 : 1450);
        motor.flow_lps = isSewage ? 42.0 : 50.0;
    } else {
        motor.speed_rpm = 0;
        motor.flow_lps = 0.0;
    }
    station.last_heartbeat = new Date().toISOString();

    emitWaterUpdate({
        type: "motor_operated",
        station_id: station.id,
        motor_type: isSewage ? "SEWAGE" : "FRESH_WATER",
        motor,
        operated_by: req.user.name,
        updatedAt: station.last_heartbeat
    });

    res.json({
        success: true,
        message: `${motor.name} switched to ${newState} by ${req.user.name}.`,
        station_id: station.id,
        motor
    });
});

// =========================================================
// 16C. COMMAND CENTER REPORTING & FUTURE PREDICTIONS (BHAVISHYA)
// =========================================================
router.get("/api/water/predictions/future-forecast", (req, res) => {
    const now = new Date();
    const forecast = {
        generated_at: now.toISOString(),
        location: "Gorakhpur Municipal Corporation",
        ai_model: "WaterNet LSTM-ARIMA Hybrid Forecast v2.6",
        provenance: "ALGORITHMIC_PREDICTION",
        citywide_daily_demand_mld: {
            current_day: 142.5,
            tomorrow_predicted_mld: 148.2,
            peak_demand_hour: "07:00 AM - 09:30 AM",
            evening_peak_hour: "06:00 PM - 08:30 PM",
            trend: "INCREASING (+4.0%)"
        },
        rainfall_and_sewage_surge_forecast: {
            monsoon_inflow_multiplier: 1.65,
            predicted_rainfall_mm: 18.4,
            sewage_overflow_risk: "MODERATE",
            highest_risk_catchment: "Civil Lines & Padleyganj Low-Lying Sump",
            recommended_action: "Pre-empty Sump MC-02 to 35% capacity before 05:00 PM rainfall."
        },
        leakage_risk_probability: [
            { sector: "Golghar Central (PL-101)", risk_pct: 12, reason: "Normal cyclical pressure (2.8 - 3.2 bar)" },
            { sector: "Railway Junction (PL-103)", risk_pct: 28, reason: "Elevated vibration along railway crossing" },
            { sector: "Mohaddipur East (PL-105)", risk_pct: 18, reason: "Age 12+ years; cathodic protection active" },
            { sector: "BRD Medical North (PL-104)", risk_pct: 8, reason: "Newly reinforced ductile iron pipe" }
        ],
        hourly_schedule_recommendation: [
            { time: "05:00 AM - 08:30 AM", motor_state: "ALL FRESH WATER PUMPS RUNNING (HIGH PRESSURE)", expected_consumption_mld: 55.4 },
            { time: "08:30 AM - 12:00 PM", motor_state: "STANDARD REGULATION (2.4 bar)", expected_consumption_mld: 28.1 },
            { time: "12:00 PM - 04:30 PM", motor_state: "LOW DEMAND SANDBOX (1.8 bar, Tank Inflow Priority)", expected_consumption_mld: 18.6 },
            { time: "04:30 PM - 08:30 PM", motor_state: "EVENING SUPPLY BOOSTER (3.0 bar)", expected_consumption_mld: 44.2 },
            { time: "08:30 PM - 05:00 AM", motor_state: "GRAVITY TRANSFER TO STP-01 & REPAIR WINDOW", expected_consumption_mld: 6.2 }
        ]
    };
    res.json({ success: true, forecast });
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
router.get(["/api/water/schedules", "/api/water/supply-schedules"], async (req, res) => {
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

// =========================================================
// 20. WATER SCADA ANOMALIES & SENSOR LEAK DETECTION
// =========================================================
router.get("/api/water/anomalies", async (req, res) => {
    try {
        const [pipes] = await pool.query(`
            SELECT id, 'Pipeline Pressure Drop' AS anomaly_type, pipeline_code AS asset_code,
                   zone AS location, status, pressure_bar, 'Pressure below critical threshold (1.2 bar)' AS description,
                   created_at AS updated_at
            FROM water_pipelines
            WHERE status LIKE '%Leak%' OR pressure_bar < 1.5
        `);
        const [tanks] = await pool.query(`
            SELECT id, 'Tank Low Level Alert' AS anomaly_type, tank_id AS asset_code,
                   zone AS location, status, current_level_percent AS pressure_bar, 'Water storage depleted below 20%' AS description,
                   updated_at
            FROM water_tanks
            WHERE current_level_percent < 20
        `);
        const anomalies = [...pipes, ...tanks];
        res.json({ success: true, count: anomalies.length, anomalies });
    } catch (err) {
        console.error("Water anomalies error:", err);
        res.status(500).json({ success: false, message: "Database error fetching anomalies." });
    }
});

// =========================================================
// 21. WATER NETWORK TOPOLOGY (SYNCHRONIZED 2D & 3D ASSETS)
// =========================================================
router.get("/api/water/network/topology", async (req, res) => {
    try {
        const topology = await waterIntelligenceService.getNetworkTopology();
        res.json(topology);
    } catch (err) {
        console.error("Network topology fetch error:", err);
        res.status(500).json({ success: false, message: "Failed to generate network topology." });
    }
});

// =========================================================
// 22. WATER NETWORK ASSETS — GET ALL & SINGLE
// =========================================================
router.get("/api/water/network/assets", async (req, res) => {
    const { type, zone } = req.query;
    let sql = "SELECT * FROM water_network_assets WHERE 1=1";
    const params = [];
    if (type) {
        sql += " AND asset_type = ?";
        params.push(type);
    }
    if (zone) {
        sql += " AND zone = ?";
        params.push(zone);
    }
    sql += " ORDER BY asset_type, name ASC";

    try {
        const [assets] = await pool.query(sql, params);
        res.json({ success: true, count: assets.length, assets });
    } catch (err) {
        console.error("Network assets fetch error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch network assets." });
    }
});

router.get("/api/water/network/assets/:id", optionalToken, async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, private");
    try {
        const details = await waterIntelligenceService.getAssetDetails(req.params.id);
        if (!details) {
            return res.status(404).json({ success: false, message: "Asset not found." });
        }

        const user = req.user;
        const role = (user && (user.role || user.type) || "").toLowerCase();
        const dept = (user && user.department || "").toLowerCase();
        const isPrivileged = role === "admin" || (role === "staff" && (dept === "water" || dept === "admin"));

        if (!isPrivileged) {
            // Public callers do not receive internal staff work orders
            details.asset.work_orders = [];
        }

        res.json(details);
    } catch (err) {
        console.error("Get asset details error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch asset details." });
    }
});

// =========================================================
// 23. WASTEWATER TREATMENT BATCHES & REUSE SAFETY INTERLOCK
// =========================================================
router.get("/api/water/treatment/batches", optionalToken, async (req, res) => {
    // Anti-caching headers: Prevents proxies/browsers from caching privileged staff data and leaking to public
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const user = req.user;
    const role = (user && (user.role || user.type) || "").toLowerCase();
    const dept = (user && user.department || "").toLowerCase();
    const isPrivilegedWater = role === "admin" || (role === "staff" && (dept === "water" || dept === "admin"));

    try {
        if (isPrivilegedWater) {
            // Privileged Water Staff/Admin: Full operational view with diagnostic and internal notes
            const batches = await waterIntelligenceService.getTreatmentBatches(req.query);
            return res.json({ success: true, count: batches.length, batches });
        }

        // Public / Unauthenticated: Return ONLY explicitly approved, publishable environmental compliance fields
        // If unauthenticated caller explicitly requests non-approved status, deny access by returning empty set
        if (req.query.status && req.query.status !== "APPROVED") {
            return res.json({ success: true, count: 0, batches: [] });
        }

        const publicQuery = {
            plant_id: req.query.plant_id,
            status: "APPROVED" // Public cannot see blocked batches or batches under review
        };
        const rawBatches = await waterIntelligenceService.getTreatmentBatches(publicQuery);

        const publicBatches = rawBatches
            .filter(b => b.approval_status === "APPROVED" && b.quality_status === "COMPLIANT")
            .map(b => ({
                batch_id: b.batch_id,
                plant_name: b.plant_name,
                stage: b.stage,
                bod_mg_l: Number(b.bod_mg_l),
                cod_mg_l: Number(b.cod_mg_l),
                tss_mg_l: Number(b.tss_mg_l),
                ph: Number(b.ph),
                fecal_coliform_mpn: Number(b.fecal_coliform_mpn),
                turbidity_ntu: Number(b.turbidity_ntu),
                quality_status: b.quality_status,
                reuse_destination: b.reuse_destination,
                approval_status: b.approval_status,
                approval_timestamp: b.approval_timestamp || b.created_at
            }));

        res.json({ success: true, count: publicBatches.length, batches: publicBatches });
    } catch (err) {
        console.error("Treatment batches fetch error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch treatment batches." });
    }
});

router.post("/api/water/treatment/batches", authenticateToken, requireWaterStaff, async (req, res) => {
    const { plant_id, plant_name, source_type, inlet_volume_kl, outlet_volume_kl, stage, bod_mg_l, cod_mg_l, tss_mg_l, ph, fecal_coliform_mpn, turbidity_ntu, reuse_destination, operator_notes } = req.body;

    const pId = plant_id || (plant_name ? plant_name.split(' ')[0] : "STP-01");
    if (!pId || !inlet_volume_kl) {
        return res.status(400).json({ success: false, message: "Plant ID and inlet volume are required." });
    }

    const batch_id = "BATCH-" + new Date().getFullYear() + "-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(1000 + Math.random() * 9000);
    const pName = plant_name || "Gorakhpur Central STP";
    const inVol = Number(inlet_volume_kl);
    const outVol = Number(outlet_volume_kl || inVol * 0.95);
    const isProvided = (v) => v !== undefined && v !== null && v !== "" && !isNaN(Number(v));
    const hasLabData = isProvided(bod_mg_l) || isProvided(cod_mg_l) || isProvided(tss_mg_l) || isProvided(ph);

    let nBod = isProvided(bod_mg_l) ? Number(bod_mg_l) : 0;
    let nCod = isProvided(cod_mg_l) ? Number(cod_mg_l) : 0;
    let nTss = isProvided(tss_mg_l) ? Number(tss_mg_l) : 0;
    let nPh = isProvided(ph) ? Number(ph) : 7.0;
    const coliformInput = fecal_coliform_mpn !== undefined ? fecal_coliform_mpn : req.body.fecal_coliform_mpn_100ml;
    let coliform = isProvided(coliformInput) ? Number(coliformInput) : 0;
    let turb = isProvided(turbidity_ntu) ? Number(turbidity_ntu) : 0;

    let qStatus = "PENDING";
    let appStatus = "PENDING_APPROVAL";

    if (hasLabData) {
        const dest = reuse_destination || "RAMGARH_TAL_LAKE";
        const limits = waterIntelligenceService.getLimitsForDestination(dest);

        const allMandatoryPresent = isProvided(bod_mg_l) && isProvided(cod_mg_l) && isProvided(tss_mg_l) && isProvided(ph);
        const withinLimits = nBod <= limits.MAX_BOD_MG_L && nCod <= limits.MAX_COD_MG_L && nTss <= limits.MAX_TSS_MG_L && nPh >= limits.MIN_PH && nPh <= limits.MAX_PH && coliform <= limits.MAX_FECAL_COLIFORM_MPN && turb <= limits.MAX_TURBIDITY_NTU;

        if (!allMandatoryPresent || !withinLimits) {
            qStatus = "NON_COMPLIANT";
            appStatus = "BLOCKED_QUALITY_FAILURE";
        } else {
            qStatus = "COMPLIANT";
            appStatus = "PENDING_APPROVAL";
        }
    }

    const validStages = ['COLLECTION', 'SCREENING', 'AERATION_BIO', 'SECONDARY_CLARIFIER', 'FILTRATION_UV', 'QUALITY_VERIFIED', 'DISCHARGED', 'REUSED'];
    let normalizedStage = String(stage || 'QUALITY_VERIFIED').toUpperCase();
    if (!validStages.includes(normalizedStage)) {
        if (normalizedStage.includes('TERTIARY') || normalizedStage.includes('FILTRATION') || normalizedStage.includes('DISINFECT')) {
            normalizedStage = 'FILTRATION_UV';
        } else if (normalizedStage.includes('AERATION') || normalizedStage.includes('SECONDARY')) {
            normalizedStage = 'AERATION_BIO';
        } else if (normalizedStage.includes('SCREEN')) {
            normalizedStage = 'SCREENING';
        } else {
            normalizedStage = 'QUALITY_VERIFIED';
        }
    }

    try {
        const [result] = await pool.query(`
            INSERT INTO water_treatment_batches
            (batch_id, plant_id, plant_name, source_type, inlet_volume_kl, outlet_volume_kl, stage, bod_mg_l, cod_mg_l, tss_mg_l, ph, fecal_coliform_mpn, turbidity_ntu, quality_status, reuse_destination, approval_status, operator_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            batch_id, pId, pName, source_type || "SEWAGE",
            inVol, outVol, normalizedStage,
            nBod, nCod, nTss, nPh, coliform, turb,
            qStatus, reuse_destination || "RAMGARH_TAL_LAKE",
            appStatus, operator_notes || "Batch logged by treatment operator"
        ]);

        const [created] = await pool.query("SELECT * FROM water_treatment_batches WHERE id = ?", [result.insertId]);

        emitWaterUpdate({
            type: "treatment_batch_logged",
            batch: created[0],
            updatedAt: new Date().toISOString()
        });

        res.status(201).json({
            success: true,
            message: `Wastewater treatment batch ${batch_id} logged. Status: ${qStatus}`,
            batch: created[0]
        });
    } catch (err) {
        console.error("Create treatment batch error:", err);
        res.status(500).json({ success: false, message: "Database error creating batch: " + (err.message || err) });
    }
});

router.put("/api/water/treatment/batches/:id/verify-quality", authenticateToken, requireWaterStaff, async (req, res) => {
    try {
        const result = await waterIntelligenceService.verifyBatchQuality(req.params.id, req.body);
        emitWaterUpdate({
            type: "treatment_quality_verified",
            batch: result.batch,
            updatedAt: new Date().toISOString()
        });
        res.json(result);
    } catch (err) {
        console.error("Verify batch quality error:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to record lab results." });
    }
});

router.put("/api/water/treatment/batches/:id/approve-reuse", authenticateToken, requireWaterAdmin, async (req, res) => {
    try {
        const approvedBatch = await waterIntelligenceService.approveBatchReuse(req.params.id, {
            adminUser: req.user,
            reuseDestination: req.body.reuse_destination,
            comments: req.body.comments
        });

        emitWaterUpdate({
            type: "reclaimed_reuse_approved",
            batch: approvedBatch,
            updatedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            message: `Batch ${approvedBatch.batch_id} authorized for reuse destination: ${approvedBatch.reuse_destination}.`,
            batch: approvedBatch
        });
    } catch (err) {
        if (err.code === "QUALITY_CHECK_FAILED") {
            return res.status(400).json({ success: false, message: err.message });
        }
        console.error("Approve batch error:", err);
        res.status(500).json({ success: false, message: err.message || "Approval transaction failed." });
    }
});

// =========================================================
// 24. WATER ADMIN NETWORK ROUTE AUTHORITY & VERSIONING
// =========================================================
router.get("/api/water/admin/network-versions", authenticateToken, requireWaterStaff, async (req, res) => {
    try {
        const [versions] = await pool.query("SELECT * FROM water_network_versions ORDER BY created_at DESC");
        res.json({ success: true, count: versions.length, versions });
    } catch (err) {
        console.error("Network versions fetch error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch network versions." });
    }
});

router.post("/api/water/admin/network-versions/validate-route", authenticateToken, requireWaterStaff, async (req, res) => {
    try {
        const assessment = await waterIntelligenceService.validateRouteProposal(req.body);
        res.json({ success: true, ...assessment });
    } catch (err) {
        console.error("Route validation error:", err);
        res.status(500).json({ success: false, message: "Route validation failed." });
    }
});

router.post("/api/water/admin/network-versions/draft", authenticateToken, requireWaterStaff, async (req, res) => {
    const { change_title, description, affected_zones, route_proposal, draft_pipeline_changes } = req.body;

    if (!change_title) {
        return res.status(400).json({ success: false, message: "Change title is required." });
    }

    const version_id = "WNV-" + Date.now().toString(36).toUpperCase();
    const version_number = "v1." + Math.floor(1 + Math.random() * 9) + ".0-draft";
    const authorId = req.user.id || "STAFF";
    const authorName = req.user.name || "Operations Engineer";
    const routePayload = route_proposal || draft_pipeline_changes || {};
    const affZonesStr = Array.isArray(affected_zones) ? affected_zones.join(', ') : String(affected_zones || "Gorakhpur City");

    try {
        const validation = await waterIntelligenceService.validateRouteProposal(Array.isArray(routePayload) ? (routePayload[0] || {}) : routePayload);

        const [result] = await pool.query(`
            INSERT INTO water_network_versions
            (version_id, version_number, status, change_title, description, affected_zones, author_id, author_name, network_payload, impact_assessment)
            VALUES (?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?)
        `, [
            version_id, version_number, change_title, description || "Proposed pipeline network modification",
            affZonesStr, authorId, authorName,
            JSON.stringify(routePayload), JSON.stringify(validation)
        ]);

        const [created] = await pool.query("SELECT * FROM water_network_versions WHERE id = ?", [result.insertId]);

        res.status(201).json({
            success: true,
            message: `Draft network version ${version_number} saved for Water Admin review.`,
            version: created[0],
            validation
        });
    } catch (err) {
        console.error("Create draft route error:", err);
        res.status(500).json({ success: false, message: "Database error saving draft route." });
    }
});

router.post("/api/water/admin/network-versions/:id/publish", authenticateToken, requireWaterAdmin, async (req, res) => {
    try {
        const published = await waterIntelligenceService.publishNetworkVersion(req.params.id, req.user);
        emitWaterUpdate({
            type: "network_version_published",
            version: published,
            updatedAt: new Date().toISOString()
        });
        res.json({
            success: true,
            message: `Network version ${published.version_number} officially approved and published by Water Admin.`,
            version: published
        });
    } catch (err) {
        console.error("Publish network version error:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to publish version." });
    }
});

// =========================================================
// 25. ROLE-SPECIFIC WORK ORDERS (FIELD TASK ALLOCATIONS)
// =========================================================
router.get("/api/water/work-orders", authenticateToken, requireWaterStaff, async (req, res) => {
    const { status, role } = req.query;
    const isAdmin = isWaterAdminUser(req.user);

    let sql = "SELECT * FROM water_work_orders WHERE 1=1";
    const params = [];

    if (!isAdmin) {
        // Staff sees tasks: assigned to them, or within their permitted sectors, or matching permitted assets
        const staffId = req.user.staffId || req.user.staff_id || String(req.user.id);
        const staffName = req.user.name || "";
        const permittedSectors = Array.isArray(req.user.permitted_sectors) ? req.user.permitted_sectors : [];
        const permittedAssets = Array.isArray(req.user.permitted_assets) ? req.user.permitted_assets : [];

        const conditions = [];
        conditions.push("(assigned_to_id = ? OR assigned_to_id = ? OR assigned_to_name = ?)");
        params.push(String(req.user.id), staffId, staffName);

        if (permittedSectors.length > 0 && !permittedSectors.includes("ALL_SECTORS")) {
            const placeholders = permittedSectors.map(() => "?").join(",");
            conditions.push(`(zone IN (${placeholders}))`);
            params.push(...permittedSectors);
        }

        if (permittedAssets.length > 0 && !permittedAssets.includes("ALL_ASSETS")) {
            const placeholders = permittedAssets.map(() => "?").join(",");
            conditions.push(`(asset_id IN (${placeholders}))`);
            params.push(...permittedAssets);
        }

        sql += ` AND (${conditions.join(" OR ")})`;
    } else if (role) {
        sql += " AND required_role = ?";
        params.push(role);
    }

    if (status) {
        sql += " AND status = ?";
        params.push(status);
    }
    sql += " ORDER BY deadline ASC, priority DESC";

    try {
        const [orders] = await pool.query(sql, params);
        res.json({ success: true, count: orders.length, orders });
    } catch (err) {
        console.error("Work orders fetch error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch work orders." });
    }
});

router.post("/api/water/work-orders", authenticateToken, requireWaterAdmin, async (req, res) => {
    let { title, description, asset_id, asset_type, zone, assigned_to_id, assigned_to_name, required_role, priority, deadline, sector, related_pipe_id, assigned_staff_id, network_type } = req.body;

    if (!title) {
        return res.status(400).json({ success: false, message: "Title is required." });
    }

    asset_id = asset_id || related_pipe_id || "PIPE-SEC1";
    asset_type = asset_type || (asset_id.startsWith("PIPE") ? "PIPELINE" : "MANHOLE");
    zone = zone || sector || "Golghar Central";
    assigned_to_id = assigned_to_id || assigned_staff_id || "WTR-ENG-01";
    assigned_to_name = assigned_to_name || (assigned_to_id === "WTR-ENG-01" ? "Er. Saurabh Mishra" : "Assigned Field Staff");
    required_role = required_role ? String(required_role).toLowerCase() : "pipeline_engineer";
    priority = priority || "MEDIUM";
    deadline = deadline || new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    network_type = network_type || "POTABLE_WATER";

    const order_id = "WO-WAT-" + Date.now().toString().slice(-6) + "-" + Math.floor(100 + Math.random() * 900);

    try {
        const [result] = await pool.query(`
            INSERT INTO water_work_orders
            (order_id, title, description, asset_id, asset_type, zone, assigned_to_id, assigned_to_name, required_role, priority, deadline, status, created_by, network_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ASSIGNED', ?, ?)
        `, [
            order_id, title, description || "Routine maintenance task", asset_id,
            asset_type, zone,
            assigned_to_id, assigned_to_name,
            required_role, priority, deadline,
            req.user.name || "Water Admin Office",
            network_type
        ]);

        const [created] = await pool.query("SELECT * FROM water_work_orders WHERE id = ?", [result.insertId]);

        emitWaterUpdate({
            type: "work_order_created",
            order: created[0],
            updatedAt: new Date().toISOString()
        });

        res.status(201).json({
            success: true,
            message: "Work order assigned successfully.",
            work_order_id: created[0].id,
            id: created[0].id,
            order_id: created[0].order_id,
            order: created[0]
        });
    } catch (err) {
        console.error("Create work order error:", err);
        res.status(500).json({ success: false, message: "Database error assigning work order." });
    }
});

router.put("/api/water/work-orders/:id/status", authenticateToken, requireWaterStaff, async (req, res) => {
    const id = req.params.id;
    const { status, completion_notes, evidence_photo, observations, blocked_reason, evidence_notes } = req.body;

    const allowed = ["ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS", "BLOCKED", "RESOLVED", "VERIFIED", "COMPLETED", "CANCELLED"];
    if (!allowed.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid work order status. Allowed: [${allowed.join(", ")}]` });
    }

    // Verification and Cancellation Policy Guard: strictly Water Administrator or Super Admin
    if ((status === "VERIFIED" || status === "CANCELLED") && !isWaterAdminUser(req.user)) {
        return res.status(403).json({
            success: false,
            message: "Access denied. Only authorized Water Administrator or Super Admin can verify or close work orders."
        });
    }

    try {
        const isNum = !isNaN(Number(id));
        const [existing] = await pool.query(
            `SELECT * FROM water_work_orders WHERE ${isNum ? "id = ? OR order_id = ?" : "order_id = ?"} LIMIT 1`,
            isNum ? [Number(id), String(id)] : [String(id)]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Work order not found." });
        }
        const wo = existing[0];

        const completedAt = status === "COMPLETED" || status === "VERIFIED" ? (wo.completed_at || new Date()) : null;
        const acknowledgedAt = status === "ACKNOWLEDGED" || status === "IN_PROGRESS" ? (wo.acknowledged_at || new Date()) : wo.acknowledged_at;
        const verifiedBy = status === "VERIFIED" ? (req.user.name || "Water Admin") : wo.verified_by;
        const verifiedAt = status === "VERIFIED" ? (wo.verified_at || new Date()) : wo.verified_at;

        await pool.query(`
            UPDATE water_work_orders
            SET status = ?,
                completion_notes = COALESCE(?, completion_notes),
                evidence_photo = COALESCE(?, evidence_photo),
                observations = COALESCE(?, observations),
                blocked_reason = COALESCE(?, blocked_reason),
                evidence_notes = COALESCE(?, evidence_notes),
                acknowledged_at = ?,
                completed_at = ?,
                verified_by = ?,
                verified_at = ?
            WHERE id = ?
        `, [
            status,
            completion_notes || null,
            evidence_photo || null,
            observations || null,
            blocked_reason || null,
            evidence_notes || null,
            acknowledgedAt,
            completedAt,
            verifiedBy,
            verifiedAt,
            wo.id
        ]);

        const [updated] = await pool.query("SELECT * FROM water_work_orders WHERE id = ?", [wo.id]);

        await logAudit(req, {
            userId: req.user.id,
            userName: req.user.name,
            role: req.user.role,
            department: "water",
            action: `UPDATE_WATER_WORK_ORDER_${status}`,
            module: "WATER",
            record_id: wo.order_id,
            metadata: {
                previous_status: wo.status,
                new_status: status,
                observations: observations || null,
                blocked_reason: blocked_reason || null
            }
        });

        emitWaterUpdate({
            type: "work_order_updated",
            order: updated[0],
            updatedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            message: `Work order ${wo.order_id} updated to ${status}.`,
            status: updated[0].status,
            verified_by: updated[0].verified_by,
            order: updated[0]
        });
    } catch (err) {
        console.error("Update work order status error:", err);
        res.status(500).json({ success: false, message: "Database error updating work order." });
    }
});

// Reassign Work Order (WATER ADMIN ONLY - supports PUT and POST)
const handleReassignWorkOrder = async (req, res) => {
    const id = req.params.id;
    let { assigned_to_id, assigned_to_name, assigned_staff_id, reason } = req.body;
    assigned_to_id = assigned_to_id || assigned_staff_id;

    if (!assigned_to_id) {
        return res.status(400).json({ success: false, message: "assigned_to_id is required." });
    }
    if (!assigned_to_name) {
        assigned_to_name = assigned_to_id === "WTR001" ? "Manoj Yadav (Field Supervisor)" : (assigned_to_id === "WTR-ENG-01" ? "Er. Saurabh Mishra" : `Technician ${assigned_to_id}`);
    }

    try {
        const reassigned = await waterIntelligenceService.reassignWorkOrder(id, { assigned_to_id, assigned_to_name, reason }, req.user);
        emitWaterUpdate({
            type: "work_order_reassigned",
            order: reassigned,
            updatedAt: new Date().toISOString()
        });
        res.json({ success: true, message: `Work order reassigned to ${assigned_to_name}.`, order: reassigned });
    } catch (err) {
        console.error("Reassign work order error:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to reassign work order." });
    }
};

router.put("/api/water/work-orders/:id/reassign", authenticateToken, requireWaterAdmin, handleReassignWorkOrder);
router.post("/api/water/work-orders/:id/reassign", authenticateToken, requireWaterAdmin, handleReassignWorkOrder);

// =========================================================
// 26. NETWORK CONFIG & STYLE LEGENDS
// =========================================================
router.get(["/api/water/network/config", "/api/water/network-config"], optionalToken, async (req, res) => {
    try {
        const config = await waterIntelligenceService.getNetworkConfig();
        res.json(config);
    } catch (err) {
        console.error("Network config fetch error:", err);
        res.status(500).json({ success: false, message: "Failed to load network configuration styles." });
    }
});

router.put(["/api/water/network/config", "/api/water/network-config"], authenticateToken, requireWaterAdmin, async (req, res) => {
    try {
        const styles = req.body.styles || req.body;
        const updated = await waterIntelligenceService.updateNetworkConfig(styles, req.user);
        emitWaterUpdate({
            type: "network_styles_updated",
            styles: updated.styles,
            updatedAt: new Date().toISOString()
        });
        res.json({ success: true, message: "Network configuration styles updated.", config: updated });
    } catch (err) {
        console.error("Update network config error:", err);
        res.status(400).json({ success: false, message: err.message || "Failed to update network styles." });
    }
});

// =========================================================
// 27. WATER FLOW CONTROL (SUPERVISORY & SIMULATION SANDBOX)
// =========================================================
router.get("/api/water/flow-control/overview", authenticateToken, requireWaterStaff, async (req, res) => {
    try {
        const overview = await waterIntelligenceService.getFlowControlOverview();
        res.json(overview);
    } catch (err) {
        console.error("Flow control overview error:", err);
        res.status(500).json({ success: false, message: "Database error loading flow control overview." });
    }
});

router.post("/api/water/flow-control/operate", authenticateToken, requireWaterStaff, async (req, res) => {
    let { asset_id, action_type, target_value, confirmed, reason, action, target_pct, notes } = req.body;

    action_type = action_type || action;
    if (action_type === "VALVE_THROTTLE") {
        action_type = "VALVE_STATE";
        target_value = target_pct !== undefined ? `THROTTLED_${target_pct}%` : "THROTTLED";
    }
    target_value = target_value !== undefined ? target_value : (target_pct !== undefined ? `${target_pct}%` : "OPERATED");
    reason = reason || notes || "Operator supervisory command";
    if (confirmed === undefined) confirmed = true;

    if (!asset_id || !action_type) {
        return res.status(400).json({ success: false, message: "asset_id and action_type are required." });
    }

    try {
        const outcome = await waterIntelligenceService.operateFlowControl({
            asset_id, action_type, target_value, confirmed, reason
        }, req.user);

        emitWaterUpdate({
            type: "flow_control_operated",
            outcome,
            updatedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            message: outcome.notice,
            is_hardware_actuated: false,
            provenance: "SIMULATED",
            outcome: {
                ...outcome,
                is_hardware_actuated: false,
                provenance: "SIMULATED"
            }
        });
    } catch (err) {
        console.error("Flow control command error:", err);
        res.status(400).json({ success: false, message: err.message || "Flow command failed." });
    }
});

// =========================================================
// 28. FAULT DETECTION & ISSUE MANAGEMENT
// =========================================================
router.get("/api/water/faults", optionalToken, async (req, res) => {
    try {
        const userRole = req.user ? (req.user.role || req.user.type || "").toLowerCase() : "citizen";
        const isInternalStaff = userRole === "admin" || userRole === "staff" || Boolean(req.user?.department === "water");

        const result = await waterIntelligenceService.getFaultRecords(req.query);

        // Citizen privacy filter: only show public-safe confirmed/general summary without internal notes
        if (!isInternalStaff) {
            const sanitized = result.faults.map(f => ({
                fault_code: f.fault_code,
                zone: f.zone,
                title: f.title,
                network_type: f.network_type,
                severity: f.severity,
                status: f.status,
                detected_at: f.detected_at,
                is_confirmed: f.provenance === "CONFIRMED"
            }));
            return res.json({ success: true, count: sanitized.length, faults: sanitized, public_view: true });
        }

        res.json(result);
    } catch (err) {
        console.error("Fetch water faults error:", err);
        res.status(500).json({ success: false, message: "Database error fetching faults." });
    }
});

router.post("/api/water/faults", authenticateToken, requireWaterStaff, async (req, res) => {
    try {
        const created = await waterIntelligenceService.createFaultRecord(req.body, req.user);
        emitWaterUpdate({
            type: "water_fault_created",
            fault: created,
            updatedAt: new Date().toISOString()
        });
        res.status(201).json({ success: true, message: "Fault record created successfully.", fault: created });
    } catch (err) {
        console.error("Create fault error:", err);
        res.status(400).json({ success: false, message: err.message || "Database error creating fault." });
    }
});

router.put("/api/water/faults/:id/status", authenticateToken, requireWaterStaff, async (req, res) => {
    try {
        const updated = await waterIntelligenceService.updateFaultStatus(req.params.id, req.body, req.user);
        emitWaterUpdate({
            type: "water_fault_updated",
            fault: updated,
            updatedAt: new Date().toISOString()
        });
        res.json({ success: true, message: `Fault ${updated.fault_code} status updated.`, fault: updated });
    } catch (err) {
        console.error("Update fault status error:", err);
        res.status(400).json({ success: false, message: err.message || "Failed to update fault status." });
    }
});

// =========================================================
// 29. WATER ADMIN AUDIT TRAIL LOGS
// =========================================================
router.get(["/api/water/admin/audit-logs", "/api/water/audit-logs"], authenticateToken, requireWaterAdmin, async (req, res) => {
    try {
        const logs = await waterIntelligenceService.getWaterAuditLogs(req.query);
        res.json({ success: true, count: logs.length, logs });
    } catch (err) {
        console.error("Water audit logs error:", err);
        res.status(500).json({ success: false, message: "Failed to load water operational audit logs." });
    }
});

// =========================================================
// 26. TELEMETRY SIMULATOR MODE (PROVENANCE & HARDWARE ISOLATION)
// =========================================================
router.get("/api/water/telemetry/mode", (req, res) => {
    res.json({ success: true, ...waterIntelligenceService.getSimulatorStatus() });
});

router.post("/api/water/telemetry/toggle-simulator", authenticateToken, requireWaterStaff, (req, res) => {
    const { active } = req.body;
    const updated = waterIntelligenceService.setSimulatorStatus(active);
    res.json({ success: true, message: "Simulator state toggled.", ...updated });
});

// =========================================================
// 27. SEWAGE NETWORK PLANNER & 3D ROUTE DESIGNER ROUTES
// =========================================================

// Verified Road Corridors for Centerline Alignment (Public Map Read & Staff GIS Snapping)
router.get(["/api/water/road-corridors", "/api/water/roads"], async (req, res) => {
    try {
        const corridors = await waterIntelligenceService.getSewageRoadCorridors();
        res.json({ success: true, count: corridors.length, corridors });
    } catch (err) {
        console.error("Public road corridors fetch error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch surveyed road corridors." });
    }
});

router.get("/api/water/sewage-planner/road-corridors", authenticateToken, requireWaterStaff, async (req, res) => {
    try {
        const corridors = await waterIntelligenceService.getSewageRoadCorridors();
        res.json({ success: true, count: corridors.length, corridors });
    } catch (err) {
        console.error("Road corridors fetch error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch surveyed road corridors." });
    }
});

// List Planned Sewage Routes
router.get(["/api/water/sewage-planner/routes", "/api/water/planned-routes"], authenticateToken, requireWaterStaff, async (req, res) => {
    try {
        const routes = await waterIntelligenceService.getPlannedSewageRoutes(req.query);
        res.json({ success: true, count: routes.length, routes });
    } catch (err) {
        console.error("Planned sewage routes fetch error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch planned sewage routes." });
    }
});

// Get Single Planned Sewage Route
router.get(["/api/water/sewage-planner/routes/:id", "/api/water/planned-routes/:id"], authenticateToken, requireWaterStaff, async (req, res) => {
    try {
        const route = await waterIntelligenceService.getPlannedSewageRouteById(req.params.id);
        if (!route) {
            return res.status(404).json({ success: false, message: "Planned sewage route not found." });
        }
        res.json({ success: true, route });
    } catch (err) {
        console.error("Planned sewage route fetch error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch planned sewage route." });
    }
});

// Create New Draft Sewage Route (WATER ADMIN ONLY)
router.post(["/api/water/sewage-planner/routes", "/api/water/planned-routes"], authenticateToken, requireWaterAdmin, async (req, res) => {
    const { name, zone, waypoints } = req.body;
    if (!name || !waypoints || !Array.isArray(waypoints)) {
        return res.status(400).json({ success: false, message: "Route name and waypoints array are required." });
    }

    try {
        const result = await waterIntelligenceService.createPlannedSewageRoute(req.body, req.user);
        res.status(201).json({
            success: true,
            message: `Draft sewage route ${result.route.route_id} created successfully.`,
            route_id: result.route.route_id,
            id: result.route.id,
            route: result.route,
            validation: result.validation
        });
    } catch (err) {
        console.error("Create planned sewage route error:", err);
        res.status(err.statusCode || 500).json({ success: false, message: err.message || "Database error creating sewage route." });
    }
});

// Update Existing Sewage Route (WATER ADMIN ONLY)
router.put(["/api/water/sewage-planner/routes/:id", "/api/water/planned-routes/:id"], authenticateToken, requireWaterAdmin, async (req, res) => {
    try {
        const result = await waterIntelligenceService.updatePlannedSewageRoute(req.params.id, req.body, req.user);
        res.json({
            success: true,
            message: `Sewage route ${result.route.route_id} updated.`,
            route_id: result.route.route_id,
            id: result.route.id,
            route: result.route,
            validation: result.validation
        });
    } catch (err) {
        console.error("Update planned sewage route error:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to update sewage route." });
    }
});

// Validate Sewage Route (WATER ADMIN ONLY - Supports saved routes or on-the-fly preview)
router.post(["/api/water/sewage-planner/routes/:id/validate", "/api/water/sewage-planner/validate", "/api/water/planned-routes/:id/validate", "/api/water/planned-routes/validate"], authenticateToken, requireWaterAdmin, async (req, res) => {
    try {
        let route = null;
        if (req.params.id && req.params.id !== "0" && req.params.id !== "preview") {
            route = await waterIntelligenceService.getPlannedSewageRouteById(req.params.id);
        }

        const b = req.body || {};
        const waypoints = b.waypoints || (route ? route.waypoints : []);
        const validation = await waterIntelligenceService.validateSewageRouteProposal({
            waypoints,
            pipe_diameter_mm: b.pipe_diameter_mm || (route ? route.pipe_diameter_mm : 450),
            burial_depth_m: b.burial_depth_m || (route ? route.burial_depth_m : 2.8),
            slope_pct: b.slope_pct || (route ? route.slope_pct : 0.8),
            clearance_min_m: b.clearance_min_m || (route ? route.clearance_min_m : 2.0),
            flow_direction: b.flow_direction || (route ? route.flow_direction : "FORWARD")
        });

        // Update validation results in database if saved route exists
        let newStatus = validation.is_valid ? "PENDING_APPROVAL" : "VALIDATION_FAILED";
        if (route) {
            newStatus = validation.is_valid ? (route.status === "APPROVED" || route.status === "PUBLISHED" ? route.status : "PENDING_APPROVAL") : "VALIDATION_FAILED";
            await pool.query(
                "UPDATE sewage_planned_routes SET validation_results = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [JSON.stringify(validation), newStatus, route.id]
            );
        }

        res.json({ success: true, validation, status: newStatus });
    } catch (err) {
        console.error("Validate sewage route error:", err);
        res.status(500).json({ success: false, message: err.message || "Validation engine failure." });
    }
});

// Approve Sewage Route (WATER ADMIN ONLY)
router.post(["/api/water/sewage-planner/routes/:id/approve", "/api/water/planned-routes/:id/approve"], authenticateToken, requireWaterAdmin, async (req, res) => {
    try {
        const notes = (req.body && req.body.notes) ? req.body.notes : "Approved by Water Admin";
        const approved = await waterIntelligenceService.approvePlannedSewageRoute(req.params.id, req.user, notes);
        res.json({
            success: true,
            message: `Sewage route ${approved.route_id} approved for administrative publishing.`,
            route_id: approved.route_id,
            id: approved.id,
            route: approved
        });
    } catch (err) {
        console.error("Approve sewage route error:", err);
        res.status(400).json({ success: false, message: err.message || "Approval failed." });
    }
});

// Publish Sewage Route (WATER ADMIN ONLY - Concurrency Safe Transaction)
router.post(["/api/water/sewage-planner/routes/:id/publish", "/api/water/planned-routes/:id/publish"], authenticateToken, requireWaterAdmin, async (req, res) => {
    try {
        const published = await waterIntelligenceService.publishPlannedSewageRoute(req.params.id, req.user);
        emitWaterUpdate({
            type: "sewage_route_published",
            route: published,
            updatedAt: new Date().toISOString()
        });
        res.json({
            success: true,
            message: `Sewage route ${published.route_id} officially published to municipal network version.`,
            version_id: published.version_id,
            version: { version_id: published.version_id },
            route_id: published.route_id,
            id: published.id,
            route: published
        });
    } catch (err) {
        console.error("Publish sewage route error:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to publish sewage route." });
    }
});

// Rollback Published Sewage Route (WATER ADMIN ONLY)
router.post(["/api/water/sewage-planner/routes/:id/rollback", "/api/water/planned-routes/:id/rollback"], authenticateToken, requireWaterAdmin, async (req, res) => {
    try {
        const result = await waterIntelligenceService.rollbackPlannedSewageRoute(req.params.id, req.user);
        emitWaterUpdate({
            type: "sewage_route_rolled_back",
            result,
            updatedAt: new Date().toISOString()
        });
        res.json({
            success: true,
            message: `Published sewage route ${req.params.id} rolled back to archived status.`,
            route: result.rolled_back_route,
            ...result
        });
    } catch (err) {
        console.error("Rollback sewage route error:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to rollback sewage route." });
    }
});

// Delete or Archive Draft Sewage Route (WATER ADMIN ONLY)
router.delete(["/api/water/sewage-planner/routes/:id", "/api/water/planned-routes/:id"], authenticateToken, requireWaterAdmin, async (req, res) => {
    try {
        const isNum = !isNaN(Number(req.params.id));
        const [existing] = await pool.query(
            `SELECT * FROM sewage_planned_routes WHERE ${isNum ? "id = ? OR route_id = ?" : "route_id = ?"} LIMIT 1`,
            isNum ? [Number(req.params.id), String(req.params.id)] : [String(req.params.id)]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Route not found." });
        }

        const route = existing[0];
        if (route.status === "PUBLISHED") {
            return res.status(400).json({ success: false, message: "Cannot delete published route. Rollback first." });
        }

        await pool.query("DELETE FROM sewage_planned_routes WHERE id = ?", [route.id]);
        res.json({ success: true, message: `Sewage route ${route.route_id} removed.` });
    } catch (err) {
        console.error("Delete sewage route error:", err);
        res.status(500).json({ success: false, message: "Database error deleting sewage route." });
    }
});

// =========================================================
// 29. WATER SECTORS (MAP SECTORS PLANNING & RBAC SCOPING)
// =========================================================

// List Sectors (Scoped for Water Staff, Universal for Water Admin & Super Admin)
router.get("/api/water/sectors", authenticateToken, async (req, res) => {
    try {
        const isAdmin = isWaterAdminUser(req.user);
        let sql = "SELECT * FROM water_sectors WHERE status = 'ACTIVE' ORDER BY sector_code ASC";
        let params = [];

        if (!isAdmin) {
            // Staff sees only their permitted sectors
            const permittedSectors = Array.isArray(req.user.permitted_sectors) ? req.user.permitted_sectors : [];
            if (!permittedSectors.includes("ALL_SECTORS")) {
                if (permittedSectors.length === 0) {
                    return res.json({ success: true, count: 0, sectors: [] });
                }
                const placeholders = permittedSectors.map(() => "?").join(",");
                sql = `SELECT * FROM water_sectors WHERE status = 'ACTIVE' AND (name IN (${placeholders}) OR sector_code IN (${placeholders}) OR zone IN (${placeholders})) ORDER BY sector_code ASC`;
                params = [...permittedSectors, ...permittedSectors, ...permittedSectors];
            }
        }

        const [sectors] = await pool.query(sql, params);
        const formatted = sectors.map(s => ({
            ...s,
            boundary_geojson: safeParseJson(s.boundary_geojson, []),
            assigned_engineers: safeParseJson(s.assigned_engineers, [])
        }));

        res.json({ success: true, count: formatted.length, sectors: formatted });
    } catch (err) {
        console.error("Water sectors fetch error:", err);
        res.status(500).json({ success: false, message: "Database error fetching water sectors." });
    }
});

// Create Water Sector (WATER ADMIN ONLY)
router.post("/api/water/sectors", authenticateToken, requireWaterAdmin, async (req, res) => {
    const { sector_code, name, zone, boundary_geojson, total_demand_mld, population_served, active_pipelines_count, assigned_engineers } = req.body;

    if (!name || !boundary_geojson) {
        return res.status(400).json({ success: false, message: "Sector name and boundary polygon are required." });
    }

    let normalizedGeoJson = boundary_geojson;
    if (typeof normalizedGeoJson === "string") {
        try {
            normalizedGeoJson = JSON.parse(normalizedGeoJson);
        } catch (e) {
            return res.status(400).json({ success: false, message: "Invalid boundary GeoJSON text: must be valid JSON." });
        }
    } else if (typeof normalizedGeoJson !== "object" || normalizedGeoJson === null) {
        return res.status(400).json({ success: false, message: "Invalid boundary GeoJSON format." });
    }
    const finalGeoJsonStr = JSON.stringify(normalizedGeoJson);

    const code = sector_code || `SEC-WTR-${Math.floor(100 + Math.random() * 900)}`;

    try {
        await pool.query(`
            INSERT INTO water_sectors 
            (sector_code, name, zone, boundary_geojson, total_demand_mld, population_served, active_pipelines_count, assigned_engineers, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                zone = VALUES(zone),
                boundary_geojson = VALUES(boundary_geojson),
                total_demand_mld = VALUES(total_demand_mld),
                population_served = VALUES(population_served),
                active_pipelines_count = VALUES(active_pipelines_count),
                assigned_engineers = VALUES(assigned_engineers)
        `, [
            code,
            name.trim(),
            zone || name.trim(),
            finalGeoJsonStr,
            Number(total_demand_mld) || 15.0,
            Number(population_served) || 100000,
            Number(active_pipelines_count) || 0,
            assigned_engineers ? (typeof assigned_engineers === "string" ? assigned_engineers : JSON.stringify(assigned_engineers)) : JSON.stringify([]),
            req.user.name || "Water Admin"
        ]);

        await logAudit(req, {
            userId: req.user.id,
            userName: req.user.name,
            role: req.user.role,
            department: "water",
            action: "WATER_SECTOR_CREATED",
            module: "WATER",
            record_id: code,
            metadata: { code, name, zone }
        });

        res.status(201).json({
            success: true,
            message: `Water sector ${code} created successfully.`,
            sector: { sector_code: code, name, zone }
        });
    } catch (err) {
        console.error("Create sector error:", err);
        res.status(500).json({ success: false, message: "Database error creating sector." });
    }
});

// Update Water Sector (WATER ADMIN ONLY)
router.put("/api/water/sectors/:id", authenticateToken, requireWaterAdmin, async (req, res) => {
    const id = req.params.id;
    const { name, zone, boundary_geojson, total_demand_mld, population_served, active_pipelines_count, assigned_engineers, status } = req.body;

    let finalGeoJsonStr = undefined;
    if (boundary_geojson !== undefined) {
        if (typeof boundary_geojson === "string") {
            try {
                finalGeoJsonStr = JSON.stringify(JSON.parse(boundary_geojson));
            } catch (e) {
                return res.status(400).json({ success: false, message: "Invalid boundary GeoJSON text: must be valid JSON." });
            }
        } else if (typeof boundary_geojson === "object" && boundary_geojson !== null) {
            finalGeoJsonStr = JSON.stringify(boundary_geojson);
        } else {
            return res.status(400).json({ success: false, message: "Invalid boundary GeoJSON format." });
        }
    }

    try {
        const isNum = !isNaN(Number(id));
        const [existing] = await pool.query(
            `SELECT * FROM water_sectors WHERE ${isNum ? "id = ? OR sector_code = ?" : "sector_code = ?"} LIMIT 1`,
            isNum ? [Number(id), String(id)] : [String(id)]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Sector not found." });
        }
        const current = existing[0];

        await pool.query(`
            UPDATE water_sectors
            SET name = COALESCE(?, name),
                zone = COALESCE(?, zone),
                boundary_geojson = COALESCE(?, boundary_geojson),
                total_demand_mld = COALESCE(?, total_demand_mld),
                population_served = COALESCE(?, population_served),
                active_pipelines_count = COALESCE(?, active_pipelines_count),
                assigned_engineers = COALESCE(?, assigned_engineers),
                status = COALESCE(?, status)
            WHERE id = ?
        `, [
            name || null,
            zone || null,
            finalGeoJsonStr !== undefined ? finalGeoJsonStr : null,
            total_demand_mld !== undefined ? Number(total_demand_mld) : null,
            population_served !== undefined ? Number(population_served) : null,
            active_pipelines_count !== undefined ? Number(active_pipelines_count) : null,
            assigned_engineers ? (typeof assigned_engineers === "string" ? assigned_engineers : JSON.stringify(assigned_engineers)) : null,
            status || null,
            current.id
        ]);

        await logAudit(req, {
            userId: req.user.id,
            userName: req.user.name,
            role: req.user.role,
            department: "water",
            action: "WATER_SECTOR_UPDATED",
            module: "WATER",
            record_id: current.sector_code
        });

        res.json({ success: true, message: `Water sector ${current.sector_code} updated successfully.` });
    } catch (err) {
        console.error("Update sector error:", err);
        res.status(500).json({ success: false, message: "Database error updating sector." });
    }
});

// Delete Water Sector (WATER ADMIN ONLY)
router.delete("/api/water/sectors/:id", authenticateToken, requireWaterAdmin, async (req, res) => {
    const id = req.params.id;
    try {
        const isNum = !isNaN(Number(id));
        const [existing] = await pool.query(
            `SELECT * FROM water_sectors WHERE ${isNum ? "id = ? OR sector_code = ?" : "sector_code = ?"} LIMIT 1`,
            isNum ? [Number(id), String(id)] : [String(id)]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Sector not found." });
        }
        const current = existing[0];

        await pool.query("DELETE FROM water_sectors WHERE id = ?", [current.id]);

        await logAudit(req, {
            userId: req.user.id,
            userName: req.user.name,
            role: req.user.role,
            department: "water",
            action: "WATER_SECTOR_DELETED",
            module: "WATER",
            record_id: current.sector_code
        });

        res.json({ success: true, message: `Sector ${current.sector_code} deleted successfully.` });
    } catch (err) {
        console.error("Delete sector error:", err);
        res.status(500).json({ success: false, message: "Database error deleting sector." });
    }
});

// Assign Staff / Engineers to Sector (WATER ADMIN ONLY)
router.post(["/api/water/sectors/:id/assign-staff", "/api/water/sectors/:id/assign"], authenticateToken, requireWaterAdmin, async (req, res) => {
    const id = req.params.id;
    const { staff_ids, engineers } = req.body;
    const assigned = staff_ids || engineers || [];
    const assignedArr = Array.isArray(assigned) ? assigned : [assigned];

    try {
        const isNum = !isNaN(Number(id));
        const [existing] = await pool.query(
            `SELECT * FROM water_sectors WHERE ${isNum ? "id = ? OR sector_code = ?" : "sector_code = ?"} LIMIT 1`,
            isNum ? [Number(id), String(id)] : [String(id)]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Sector not found." });
        }
        const current = existing[0];

        await pool.query(
            "UPDATE water_sectors SET assigned_engineers = ? WHERE id = ?",
            [JSON.stringify(assignedArr), current.id]
        );

        // Synchronize permitted_sectors in staff table
        for (const sId of assignedArr) {
            const [sRows] = await pool.query("SELECT id, permitted_sectors FROM staff WHERE staff_id = ? OR name = ?", [sId, sId]);
            if (sRows.length > 0) {
                let pSec = safeParseJson(sRows[0].permitted_sectors, []);
                if (!Array.isArray(pSec)) pSec = [];
                if (!pSec.includes(current.name)) {
                    pSec.push(current.name);
                    await pool.query("UPDATE staff SET permitted_sectors = ? WHERE id = ?", [JSON.stringify(pSec), sRows[0].id]);
                }
            }
        }

        await logAudit(req, {
            userId: req.user.id,
            userName: req.user.name,
            role: req.user.role,
            department: "water",
            action: "WATER_SECTOR_STAFF_ASSIGNED",
            module: "WATER",
            record_id: current.sector_code,
            metadata: { sector_code: current.sector_code, assigned_engineers: assignedArr }
        });

        res.json({
            success: true,
            message: `Staff assigned to sector ${current.sector_code} successfully.`,
            sector_code: current.sector_code,
            assigned_engineers: assignedArr
        });
    } catch (err) {
        console.error("Assign staff to sector error:", err);
        res.status(500).json({ success: false, message: "Database error assigning staff to sector." });
    }
});

router.put(["/api/water/sectors/:id/assign-staff", "/api/water/sectors/:id/assign"], authenticateToken, requireWaterAdmin, async (req, res) => {
    const id = req.params.id;
    const { staff_ids, engineers } = req.body;
    const assigned = staff_ids || engineers || [];
    const assignedArr = Array.isArray(assigned) ? assigned : [assigned];

    try {
        const isNum = !isNaN(Number(id));
        const [existing] = await pool.query(
            `SELECT * FROM water_sectors WHERE ${isNum ? "id = ? OR sector_code = ?" : "sector_code = ?"} LIMIT 1`,
            isNum ? [Number(id), String(id)] : [String(id)]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Sector not found." });
        }
        const current = existing[0];

        await pool.query(
            "UPDATE water_sectors SET assigned_engineers = ? WHERE id = ?",
            [JSON.stringify(assignedArr), current.id]
        );

        for (const sId of assignedArr) {
            const [sRows] = await pool.query("SELECT id, permitted_sectors FROM staff WHERE staff_id = ? OR name = ?", [sId, sId]);
            if (sRows.length > 0) {
                let pSec = safeParseJson(sRows[0].permitted_sectors, []);
                if (!Array.isArray(pSec)) pSec = [];
                if (!pSec.includes(current.name)) {
                    pSec.push(current.name);
                    await pool.query("UPDATE staff SET permitted_sectors = ? WHERE id = ?", [JSON.stringify(pSec), sRows[0].id]);
                }
            }
        }

        await logAudit(req, {
            userId: req.user.id,
            userName: req.user.name,
            role: req.user.role,
            department: "water",
            action: "WATER_SECTOR_STAFF_ASSIGNED",
            module: "WATER",
            record_id: current.sector_code,
            metadata: { sector_code: current.sector_code, assigned_engineers: assignedArr }
        });

        res.json({
            success: true,
            message: `Staff assigned to sector ${current.sector_code} successfully.`,
            sector_code: current.sector_code,
            assigned_engineers: assignedArr
        });
    } catch (err) {
        console.error("Assign staff to sector error:", err);
        res.status(500).json({ success: false, message: "Database error assigning staff to sector." });
    }
});

// =========================================================
// 30. WATER STAFF & PERMISSION MANAGEMENT (WATER ADMIN ONLY)
// =========================================================

// List Water Department Staff
router.get("/api/water/admin/staff", authenticateToken, requireWaterAdmin, async (req, res) => {
    try {
        const [staffMembers] = await pool.query(`
            SELECT id, name, staff_id, department, role, email, status, permissions, assigned_modules, permitted_sectors, permitted_assets, created_at
            FROM staff
            WHERE department = 'water' 
               OR department LIKE '%water%'
               OR staff_id LIKE 'WTR%'
               OR role IN ('water_admin', 'water_staff', 'engineer', 'technician')
            ORDER BY name ASC
        `);

        const formatted = staffMembers.map(s => ({
            ...s,
            permissions: safeParseJson(s.permissions, ["view"]),
            assigned_modules: safeParseJson(s.assigned_modules, ["water_pipelines"]),
            permitted_sectors: safeParseJson(s.permitted_sectors, []),
            permitted_assets: safeParseJson(s.permitted_assets, [])
        }));

        res.json({ success: true, count: formatted.length, staff: formatted });
    } catch (err) {
        console.error("Water staff fetch error:", err);
        res.status(500).json({ success: false, message: "Database error fetching water staff." });
    }
});

// Create Water Department Staff (WATER ADMIN ONLY)
router.post("/api/water/admin/staff", authenticateToken, requireWaterAdmin, async (req, res) => {
    let { name, staffId, role, email, mobile, password, permissions, modules, permitted_sectors, permitted_assets, status } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: "Staff name is required." });
    }

    const staffRole = (role && (role.toLowerCase() === "admin" || role.toLowerCase() === "water_admin")) ? "admin" : "staff";
    const designation = (role || "engineer").toLowerCase();

    // Auto-generate Staff ID if omitted
    if (!staffId || !staffId.trim()) {
        const randNum = Math.floor(100 + Math.random() * 900);
        staffId = `WTR-${designation.includes("tech") ? "TECH" : "ENG"}-${randNum}`;
    }

    const rawPassword = (password && password.trim()) ? password.trim() : `Water@${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await hashPassword(rawPassword);

    const defaultPerms = ["view", "update", "work_orders", "inspect_assets", "update_status"];
    const defaultModules = ["water_pipelines", "assigned_work_orders", "fault_reports", "flow_telemetry"];

    const finalPerms = Array.isArray(permissions) ? permissions : defaultPerms;
    const finalModules = Array.isArray(modules) ? modules : defaultModules;
    const finalSectors = Array.isArray(permitted_sectors) ? permitted_sectors : [];
    const finalAssets = Array.isArray(permitted_assets) ? permitted_assets : [];
    const finalStatus = status || "Active";

    try {
        await pool.query(`
            INSERT INTO staff 
            (name, staff_id, password, department, role, hospital_role, email, status, permissions, assigned_modules, permitted_sectors, permitted_assets)
            VALUES (?, ?, ?, 'water', ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                department = 'water',
                role = VALUES(role),
                hospital_role = VALUES(hospital_role),
                password = VALUES(password),
                email = VALUES(email),
                status = VALUES(status),
                permissions = VALUES(permissions),
                assigned_modules = VALUES(assigned_modules),
                permitted_sectors = VALUES(permitted_sectors),
                permitted_assets = VALUES(permitted_assets)
        `, [
            name.trim(),
            staffId.trim(),
            hashedPassword,
            staffRole,
            designation,
            email || null,
            finalStatus,
            JSON.stringify(finalPerms),
            JSON.stringify(finalModules),
            JSON.stringify(finalSectors),
            JSON.stringify(finalAssets)
        ]);

        await logAudit(req, {
            userId: req.user.id,
            userName: req.user.name,
            role: req.user.role,
            department: "water",
            action: "WATER_STAFF_CREATED",
            module: "WATER",
            record_id: staffId.trim(),
            metadata: { staffId, name, role: staffRole, designation, permitted_sectors: finalSectors }
        });

        res.status(201).json({
            success: true,
            message: `Water staff account created successfully for ${name} (${staffId}).`,
            credentials: {
                staffId: staffId.trim(),
                password: rawPassword,
                name: name.trim(),
                role: staffRole,
                designation,
                department: "water",
                permissions: finalPerms,
                modules: finalModules,
                permitted_sectors: finalSectors,
                permitted_assets: finalAssets,
                status: finalStatus
            }
        });
    } catch (err) {
        console.error("Add water staff error:", err);
        res.status(500).json({ success: false, message: "Database error adding water staff." });
    }
});

// Update Water Staff Permissions and Permitted Sectors/Assets (WATER ADMIN ONLY)
router.put("/api/water/admin/staff/:staffId/permissions", authenticateToken, requireWaterAdmin, async (req, res) => {
    const { staffId } = req.params;
    const { permissions, modules, permitted_sectors, permitted_assets, role } = req.body;

    try {
        const [existing] = await pool.query(
            "SELECT * FROM staff WHERE LOWER(staff_id) = LOWER(?) OR id = ? LIMIT 1",
            [staffId, isNaN(Number(staffId)) ? 0 : Number(staffId)]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Water staff member not found." });
        }
        const member = existing[0];

        const updates = [];
        const params = [];

        if (permissions) {
            updates.push("permissions = ?");
            params.push(typeof permissions === "string" ? permissions : JSON.stringify(permissions));
        }
        if (modules) {
            updates.push("assigned_modules = ?");
            params.push(typeof modules === "string" ? modules : JSON.stringify(modules));
        }
        if (permitted_sectors) {
            updates.push("permitted_sectors = ?");
            params.push(typeof permitted_sectors === "string" ? permitted_sectors : JSON.stringify(permitted_sectors));
        }
        if (permitted_assets) {
            updates.push("permitted_assets = ?");
            params.push(typeof permitted_assets === "string" ? permitted_assets : JSON.stringify(permitted_assets));
        }
        if (role) {
            const staffRole = (role.toLowerCase() === "admin" || role.toLowerCase() === "water_admin") ? "admin" : "staff";
            updates.push("role = ?");
            params.push(staffRole);
            updates.push("hospital_role = ?");
            params.push(role.toLowerCase());
        }

        if (updates.length > 0) {
            params.push(member.id);
            await pool.query(`UPDATE staff SET ${updates.join(", ")} WHERE id = ?`, params);
        }

        await logAudit(req, {
            userId: req.user.id,
            userName: req.user.name,
            role: req.user.role,
            department: "water",
            action: "WATER_STAFF_PERMISSIONS_UPDATED",
            module: "WATER",
            record_id: member.staff_id,
            metadata: { permitted_sectors, permitted_assets, permissions }
        });

        res.json({
            success: true,
            message: `Permissions updated successfully for staff ${member.staff_id}.`
        });
    } catch (err) {
        console.error("Update water staff permissions error:", err);
        res.status(500).json({ success: false, message: "Database error updating staff permissions." });
    }
});

// Update Water Staff Status (WATER ADMIN ONLY)
router.put("/api/water/admin/staff/:staffId/status", authenticateToken, requireWaterAdmin, async (req, res) => {
    const { staffId } = req.params;
    const { status } = req.body;

    if (!status || !["Active", "Inactive", "Suspended"].includes(status)) {
        return res.status(400).json({ success: false, message: "Valid status ('Active', 'Inactive', 'Suspended') is required." });
    }

    try {
        const [existing] = await pool.query(
            "SELECT * FROM staff WHERE LOWER(staff_id) = LOWER(?) OR id = ? LIMIT 1",
            [staffId, isNaN(Number(staffId)) ? 0 : Number(staffId)]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Water staff member not found." });
        }
        const member = existing[0];

        await pool.query("UPDATE staff SET status = ? WHERE id = ?", [status, member.id]);

        await logAudit(req, {
            userId: req.user.id,
            userName: req.user.name,
            role: req.user.role,
            department: "water",
            action: `WATER_STAFF_STATUS_${status.toUpperCase()}`,
            module: "WATER",
            record_id: member.staff_id
        });

        res.json({ success: true, message: `Staff ${member.staff_id} status updated to ${status}.` });
    } catch (err) {
        console.error("Update water staff status error:", err);
        res.status(500).json({ success: false, message: "Database error updating staff status." });
    }
});

// General Staff Update (WATER ADMIN ONLY)
router.put("/api/water/admin/staff/:staffId", authenticateToken, requireWaterAdmin, async (req, res) => {
    const { staffId } = req.params;
    const { name, role, email, status, permissions, modules, permitted_sectors, permitted_assets, newPassword } = req.body;

    try {
        const [existing] = await pool.query(
            "SELECT * FROM staff WHERE LOWER(staff_id) = LOWER(?) OR id = ? LIMIT 1",
            [staffId, isNaN(Number(staffId)) ? 0 : Number(staffId)]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Water staff member not found." });
        }
        const member = existing[0];

        const updates = [];
        const params = [];

        if (name) { updates.push("name = ?"); params.push(name.trim()); }
        if (role) { updates.push("role = ?"); params.push(role); }
        if (email !== undefined) { updates.push("email = ?"); params.push(email || null); }
        if (status) { updates.push("status = ?"); params.push(status); }
        if (permissions) { updates.push("permissions = ?"); params.push(typeof permissions === "string" ? permissions : JSON.stringify(permissions)); }
        if (modules) { updates.push("assigned_modules = ?"); params.push(typeof modules === "string" ? modules : JSON.stringify(modules)); }
        if (permitted_sectors) { updates.push("permitted_sectors = ?"); params.push(typeof permitted_sectors === "string" ? permitted_sectors : JSON.stringify(permitted_sectors)); }
        if (permitted_assets) { updates.push("permitted_assets = ?"); params.push(typeof permitted_assets === "string" ? permitted_assets : JSON.stringify(permitted_assets)); }
        if (newPassword && newPassword.trim()) { updates.push("password = ?"); params.push(await hashPassword(newPassword.trim())); }

        if (updates.length > 0) {
            params.push(member.id);
            await pool.query(`UPDATE staff SET ${updates.join(", ")} WHERE id = ?`, params);
        }

        await logAudit(req, {
            userId: req.user.id,
            userName: req.user.name,
            role: req.user.role,
            department: "water",
            action: "WATER_STAFF_UPDATED",
            module: "WATER",
            record_id: member.staff_id
        });

        res.json({ success: true, message: `Staff ${member.staff_id} updated successfully.` });
    } catch (err) {
        console.error("Update water staff error:", err);
        res.status(500).json({ success: false, message: "Database error updating staff." });
    }
});

// =========================================================
// 31. WATER ADMIN FACILITIES MANAGEMENT & SINGLE SCREEN MONITOR
// =========================================================

// Unified Facilities Screen: Tanks, Sources, WTPs, STPs, Pumps, Valves, Drainage Outlets, Connections & Pipelines
router.get("/api/water/admin/facilities", authenticateToken, requireWaterAdmin, async (req, res) => {
    try {
        const [tanks] = await pool.query(`
            SELECT id, tank_id, name, zone, capacity_liters, current_level_percent,
                   status, pump_status, latitude, longitude, water_quality_score,
                   next_supply_time, supplied_areas, source_asset_id, supply_schedule, updated_at
            FROM water_tanks
            ORDER BY name ASC
        `);

        const [assets] = await pool.query(`
            SELECT id, asset_id, name, asset_type, zone, latitude, longitude,
                   elevation_m, depth_m, status, pump_state, valve_state,
                   flow_direction, telemetry_provenance, specifications,
                   supplied_areas, connected_assets, data_source, updated_at
            FROM water_network_assets
            ORDER BY asset_type, name ASC
        `);

        const [pipelines] = await pool.query(`
            SELECT id, pipeline_code AS pipe_id, name, pipe_type AS network_type, zone,
                   source_node AS origin_asset_id, target_node AS destination_asset_id,
                   diameter_mm AS pipe_diameter_mm, depth_meters AS burial_depth_m,
                   flow_rate_lps, pressure_bar, flow_direction, status,
                   telemetry_provenance, start_lat, start_lng, end_lat, end_lng
            FROM water_pipelines
            ORDER BY name ASC
        `);

        const [announcements] = await pool.query(`
            SELECT * FROM water_supply_announcements
            ORDER BY start_time DESC LIMIT 10
        `);

        // Format JSON fields
        const formattedTanks = tanks.map(t => ({
            ...t,
            supplied_areas: safeParseJson(t.supplied_areas, [])
        }));

        const formattedAssets = assets.map(a => ({
            ...a,
            specifications: safeParseJson(a.specifications, {}),
            supplied_areas: safeParseJson(a.supplied_areas, []),
            connected_assets: safeParseJson(a.connected_assets, [])
        }));

        const formattedPipelines = pipelines.map(p => ({
            ...p,
            waypoints: safeParseJson(p.waypoints, [
                { lat: Number(p.start_lat || 26.7606), lng: Number(p.start_lng || 83.3732) },
                { lat: Number(p.end_lat || 26.7559), lng: Number(p.end_lng || 83.3705) }
            ])
        }));

        const formattedAnnouncements = announcements.map(an => ({
            ...an,
            affected_areas: safeParseJson(an.affected_areas, [])
        }));

        const kpis = {
            sources_count: formattedAssets.filter(a => a.asset_type === "WATER_SOURCE").length,
            wtp_count: formattedAssets.filter(a => a.asset_type === "TREATMENT_PLANT_WTP").length,
            stp_count: formattedAssets.filter(a => a.asset_type === "TREATMENT_PLANT_STP").length,
            pumps_count: formattedAssets.filter(a => a.asset_type === "BOOSTER_PUMP").length,
            valves_count: formattedAssets.filter(a => a.asset_type === "CONTROL_VALVE").length,
            drainage_outlets_count: formattedAssets.filter(a => a.asset_type === "DRAINAGE_OUTLET" || a.asset_type === "DISCHARGE_POINT").length,
            total_tanks: formattedTanks.length,
            total_pipelines: formattedPipelines.length
        };

        // Categorize assets for convenient single-screen tabs/filters
        const facilities = {
            tanks: formattedTanks,
            sources: formattedAssets.filter(a => a.asset_type === "WATER_SOURCE"),
            wtp: formattedAssets.filter(a => a.asset_type === "TREATMENT_PLANT_WTP"),
            stp: formattedAssets.filter(a => a.asset_type === "TREATMENT_PLANT_STP"),
            pumps: formattedAssets.filter(a => a.asset_type === "BOOSTER_PUMP"),
            valves: formattedAssets.filter(a => a.asset_type === "CONTROL_VALVE"),
            drainage_outlets: formattedAssets.filter(a => a.asset_type === "DRAINAGE_OUTLET" || a.asset_type === "DISCHARGE_POINT"),
            connections: formattedAssets.filter(a => a.asset_type === "NETWORK_JUNCTION" || a.asset_type === "STORAGE_RESERVOIR"),
            all_assets: formattedAssets,
            pipelines: formattedPipelines,
            announcements: formattedAnnouncements,
            stats: {
                total_tanks: formattedTanks.length,
                total_sources: kpis.sources_count,
                total_wtp: kpis.wtp_count,
                total_stp: kpis.stp_count,
                total_pumps: kpis.pumps_count,
                total_valves: kpis.valves_count,
                total_drainage_outlets: kpis.drainage_outlets_count,
                total_pipelines: formattedPipelines.length,
                active_water_cuts: formattedAnnouncements.filter(a => a.status === "ACTIVE").length
            }
        };

        res.json({
            success: true,
            facilities,
            tanks: formattedTanks,
            assets: formattedAssets,
            pipelines: formattedPipelines,
            announcements: formattedAnnouncements,
            kpis,
            stats: facilities.stats
        });
    } catch (err) {
        console.error("Admin facilities fetch error:", err);
        res.status(500).json({ success: false, message: "Database error fetching facilities." });
    }
});

// Create Facility Asset (WATER ADMIN ONLY)
router.post("/api/water/network/assets", authenticateToken, requireWaterAdmin, async (req, res) => {
    const {
        asset_id, name, asset_type, zone, latitude, longitude,
        elevation_m, depth_m, status, pump_state, valve_state,
        flow_direction, specifications, supplied_areas, connected_assets,
        pump_capacity_lps, motor_power_kw, pressure_setpoint_bar, flow_setpoint_lps,
        sensor_units, alarm_min_threshold, alarm_max_threshold, model_asset_path
    } = req.body;

    if (!name || !asset_type || !zone) {
        return res.status(400).json({ success: false, message: "Name, asset_type, and zone are required." });
    }

    const cleanType = String(asset_type).toUpperCase();
    const allowedTypes = [
        "TREATMENT_PLANT_STP", "TREATMENT_PLANT_WTP", "WATER_SOURCE",
        "BOOSTER_PUMP", "CONTROL_VALVE", "DRAINAGE_OUTLET",
        "NETWORK_JUNCTION", "STORAGE_RESERVOIR", "DISCHARGE_POINT",
        "CONTROL_TOWER", "MOTOR", "PRESSURE_SENSOR", "FLOW_METER", "LEAK_DETECTOR"
    ];

    if (!allowedTypes.includes(cleanType)) {
        return res.status(400).json({ success: false, message: `Invalid asset_type. Allowed: ${allowedTypes.join(", ")}` });
    }

    const idCode = asset_id || `${cleanType.slice(0, 4)}-${Math.floor(100 + Math.random() * 900)}`;

    let normalizedStatus = "OPERATIONAL";
    if (status) {
        const s = String(status).toUpperCase();
        if (["OPERATIONAL", "MAINTENANCE", "STANDBY", "OFFLINE"].includes(s)) normalizedStatus = s;
        else if (s === "NORMAL" || s === "ACTIVE" || s === "ONLINE") normalizedStatus = "OPERATIONAL";
    }

    // Default 3D model path based on equipment type
    let defaultModel = model_asset_path || null;
    if (!defaultModel) {
        if (cleanType === "BOOSTER_PUMP") defaultModel = "/assets/models/water/pump.gltf";
        else if (cleanType === "MOTOR") defaultModel = "/assets/models/water/motor.gltf";
        else if (cleanType === "CONTROL_VALVE") defaultModel = "/assets/models/water/valve.gltf";
        else if (cleanType === "CONTROL_TOWER") defaultModel = "/assets/models/water/control_tower.gltf";
    }

    const specObj = typeof specifications === "object" && specifications !== null ? specifications : (specifications ? JSON.parse(specifications) : {});
    if (pump_capacity_lps) specObj.pump_capacity_lps = Number(pump_capacity_lps);
    if (motor_power_kw) specObj.motor_power_kw = Number(motor_power_kw);
    if (pressure_setpoint_bar) specObj.pressure_setpoint_bar = Number(pressure_setpoint_bar);
    if (flow_setpoint_lps) specObj.flow_setpoint_lps = Number(flow_setpoint_lps);
    if (sensor_units) specObj.sensor_units = sensor_units;
    if (alarm_min_threshold) specObj.alarm_min_threshold = Number(alarm_min_threshold);
    if (alarm_max_threshold) specObj.alarm_max_threshold = Number(alarm_max_threshold);

    try {
        await pool.query(`
            INSERT INTO water_network_assets
            (asset_id, name, asset_type, zone, latitude, longitude, elevation_m, depth_m, status, pump_state, valve_state, flow_direction, specifications, supplied_areas, connected_assets, telemetry_provenance, data_source, pump_capacity_lps, motor_power_kw, pressure_setpoint_bar, flow_setpoint_lps, sensor_units, alarm_min_threshold, alarm_max_threshold, model_asset_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MEASURED', 'MEASURED', ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                asset_type = VALUES(asset_type),
                zone = VALUES(zone),
                latitude = VALUES(latitude),
                longitude = VALUES(longitude),
                elevation_m = VALUES(elevation_m),
                depth_m = VALUES(depth_m),
                status = VALUES(status),
                pump_state = VALUES(pump_state),
                valve_state = VALUES(valve_state),
                flow_direction = VALUES(flow_direction),
                specifications = VALUES(specifications),
                supplied_areas = VALUES(supplied_areas),
                connected_assets = VALUES(connected_assets),
                pump_capacity_lps = VALUES(pump_capacity_lps),
                motor_power_kw = VALUES(motor_power_kw),
                pressure_setpoint_bar = VALUES(pressure_setpoint_bar),
                flow_setpoint_lps = VALUES(flow_setpoint_lps),
                sensor_units = VALUES(sensor_units),
                alarm_min_threshold = VALUES(alarm_min_threshold),
                alarm_max_threshold = VALUES(alarm_max_threshold),
                model_asset_path = VALUES(model_asset_path)
        `, [
            idCode,
            name.trim(),
            cleanType,
            zone.trim(),
            Number(latitude) || 26.7606,
            Number(longitude) || 83.3732,
            Number(elevation_m) || 84.50,
            Number(depth_m) || 2.50,
            normalizedStatus,
            pump_state || "ON",
            valve_state || "OPEN",
            flow_direction || "FORWARD",
            JSON.stringify(specObj),
            supplied_areas ? (typeof supplied_areas === "string" ? supplied_areas : JSON.stringify(supplied_areas)) : JSON.stringify([]),
            connected_assets ? (typeof connected_assets === "string" ? connected_assets : JSON.stringify(connected_assets)) : JSON.stringify([]),
            pump_capacity_lps ? Number(pump_capacity_lps) : null,
            motor_power_kw ? Number(motor_power_kw) : null,
            pressure_setpoint_bar ? Number(pressure_setpoint_bar) : 3.40,
            flow_setpoint_lps ? Number(flow_setpoint_lps) : 85.00,
            sensor_units || "bar",
            alarm_min_threshold ? Number(alarm_min_threshold) : 1.50,
            alarm_max_threshold ? Number(alarm_max_threshold) : 5.50,
            defaultModel
        ]);

        const [createdAsset] = await pool.query("SELECT * FROM water_network_assets WHERE asset_id = ?", [idCode]);

        await recordNetworkAudit({
            action_type: "ASSET_CREATED",
            entity_type: "ASSET",
            entity_id: idCode,
            entity_name: name.trim(),
            changed_by_id: req.user?.id || "WTR-ADMIN-01",
            changed_by_name: req.user?.name || "Water Admin",
            new_state: createdAsset[0],
            impact_summary: `Created ${cleanType} equipment asset "${name.trim()}" in ${zone.trim()}.`
        });

        await logAudit(req, {
            userId: req.user.id,
            userName: req.user.name,
            role: req.user.role,
            department: "water",
            action: "WATER_ASSET_CREATED",
            module: "WATER",
            record_id: idCode,
            metadata: { asset_id: idCode, name, asset_type: cleanType, zone }
        });

        res.status(201).json({
            success: true,
            message: `Facility asset ${name} (${idCode}) saved successfully.`,
            asset: createdAsset[0]
        });
    } catch (err) {
        console.error("Create asset error:", err);
        res.status(500).json({ success: false, message: "Database error saving facility asset." });
    }
});

// Update Facility Asset (WATER ADMIN ONLY)
router.put("/api/water/network/assets/:id", authenticateToken, requireWaterAdmin, async (req, res) => {
    const id = req.params.id;
    const {
        name, asset_type, zone, latitude, longitude,
        elevation_m, depth_m, status, pump_state, valve_state,
        flow_direction, specifications, supplied_areas, connected_assets,
        pump_capacity_lps, motor_power_kw, pressure_setpoint_bar, flow_setpoint_lps,
        sensor_units, alarm_min_threshold, alarm_max_threshold, model_asset_path
    } = req.body;

    try {
        const [existing] = await pool.query(
            "SELECT * FROM water_network_assets WHERE asset_id = ? OR id = ? LIMIT 1",
            [id, isNaN(Number(id)) ? 0 : Number(id)]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Facility asset not found." });
        }
        const current = existing[0];

        const updates = [];
        const params = [];

        if (name) { updates.push("name = ?"); params.push(name.trim()); }
        if (asset_type) { updates.push("asset_type = ?"); params.push(asset_type); }
        if (zone) { updates.push("zone = ?"); params.push(zone.trim()); }
        if (latitude !== undefined) { updates.push("latitude = ?"); params.push(Number(latitude)); }
        if (longitude !== undefined) { updates.push("longitude = ?"); params.push(Number(longitude)); }
        if (elevation_m !== undefined) { updates.push("elevation_m = ?"); params.push(Number(elevation_m)); }
        if (depth_m !== undefined) { updates.push("depth_m = ?"); params.push(Number(depth_m)); }
        if (status) { updates.push("status = ?"); params.push(status); }
        if (pump_state) { updates.push("pump_state = ?"); params.push(pump_state); }
        if (valve_state) { updates.push("valve_state = ?"); params.push(valve_state); }
        if (flow_direction) { updates.push("flow_direction = ?"); params.push(flow_direction); }
        if (specifications) { updates.push("specifications = ?"); params.push(typeof specifications === "string" ? specifications : JSON.stringify(specifications)); }
        if (supplied_areas) { updates.push("supplied_areas = ?"); params.push(typeof supplied_areas === "string" ? supplied_areas : JSON.stringify(supplied_areas)); }
        if (connected_assets) { updates.push("connected_assets = ?"); params.push(typeof connected_assets === "string" ? connected_assets : JSON.stringify(connected_assets)); }
        if (pump_capacity_lps !== undefined) { updates.push("pump_capacity_lps = ?"); params.push(Number(pump_capacity_lps)); }
        if (motor_power_kw !== undefined) { updates.push("motor_power_kw = ?"); params.push(Number(motor_power_kw)); }
        if (pressure_setpoint_bar !== undefined) { updates.push("pressure_setpoint_bar = ?"); params.push(Number(pressure_setpoint_bar)); }
        if (flow_setpoint_lps !== undefined) { updates.push("flow_setpoint_lps = ?"); params.push(Number(flow_setpoint_lps)); }
        if (sensor_units !== undefined) { updates.push("sensor_units = ?"); params.push(sensor_units); }
        if (alarm_min_threshold !== undefined) { updates.push("alarm_min_threshold = ?"); params.push(Number(alarm_min_threshold)); }
        if (alarm_max_threshold !== undefined) { updates.push("alarm_max_threshold = ?"); params.push(Number(alarm_max_threshold)); }
        if (model_asset_path !== undefined) { updates.push("model_asset_path = ?"); params.push(model_asset_path); }

        if (updates.length > 0) {
            params.push(current.id);
            await pool.query(`UPDATE water_network_assets SET ${updates.join(", ")} WHERE id = ?`, params);
        }

        const [updatedAsset] = await pool.query("SELECT * FROM water_network_assets WHERE id = ?", [current.id]);

        await recordNetworkAudit({
            action_type: "ASSET_UPDATED",
            entity_type: "ASSET",
            entity_id: current.asset_id,
            entity_name: current.name,
            changed_by_id: req.user?.id || "WTR-ADMIN-01",
            changed_by_name: req.user?.name || "Water Admin",
            previous_state: current,
            new_state: updatedAsset[0],
            impact_summary: `Updated parameters for equipment asset ${current.name} (${current.asset_id}).`
        });

        await logAudit(req, {
            userId: req.user.id,
            userName: req.user.name,
            role: req.user.role,
            department: "water",
            action: "WATER_ASSET_UPDATED",
            module: "WATER",
            record_id: current.asset_id
        });

        res.json({ success: true, message: `Facility asset ${current.asset_id} updated successfully.` });
    } catch (err) {
        console.error("Update asset error:", err);
        res.status(500).json({ success: false, message: "Database error updating facility asset." });
    }
});

// Delete Facility Asset (WATER ADMIN ONLY)
router.delete("/api/water/network/assets/:id", authenticateToken, requireWaterAdmin, async (req, res) => {
    const id = req.params.id;
    try {
        const [existing] = await pool.query(
            "SELECT * FROM water_network_assets WHERE asset_id = ? OR id = ? LIMIT 1",
            [id, isNaN(Number(id)) ? 0 : Number(id)]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Facility asset not found." });
        }
        const current = existing[0];

        await pool.query("DELETE FROM water_network_assets WHERE id = ?", [current.id]);

        await logAudit(req, {
            userId: req.user.id,
            userName: req.user.name,
            role: req.user.role,
            department: "water",
            action: "WATER_ASSET_DELETED",
            module: "WATER",
            record_id: current.asset_id
        });

        res.json({ success: true, message: `Facility asset ${current.asset_id} removed.` });
    } catch (err) {
        console.error("Delete asset error:", err);
        res.status(500).json({ success: false, message: "Database error deleting facility asset." });
    }
});

// Decide / Update Which Tank/Source Supplies Which Area (WATER ADMIN ONLY)
router.put("/api/water/tanks/:id/supply-areas", authenticateToken, requireWaterAdmin, async (req, res) => {
    const id = req.params.id;
    const { supplied_areas, source_asset_id, supply_schedule, pump_status, current_level_percent } = req.body;

    try {
        const [existing] = await pool.query(
            "SELECT * FROM water_tanks WHERE tank_id = ? OR id = ? LIMIT 1",
            [id, isNaN(Number(id)) ? 0 : Number(id)]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Water tank not found." });
        }
        const current = existing[0];

        const updates = [];
        const params = [];

        if (supplied_areas !== undefined) {
            updates.push("supplied_areas = ?");
            params.push(typeof supplied_areas === "string" ? supplied_areas : JSON.stringify(supplied_areas));
        }
        if (source_asset_id !== undefined) {
            updates.push("source_asset_id = ?");
            params.push(source_asset_id || null);
        }
        if (supply_schedule !== undefined) {
            updates.push("supply_schedule = ?");
            params.push(supply_schedule || "06:00 AM - 09:00 AM, 05:00 PM - 08:00 PM");
        }
        if (pump_status) {
            updates.push("pump_status = ?");
            params.push(pump_status);
        }
        if (current_level_percent !== undefined) {
            updates.push("current_level_percent = ?");
            params.push(Number(current_level_percent));
        }

        if (updates.length > 0) {
            params.push(current.id);
            await pool.query(`UPDATE water_tanks SET ${updates.join(", ")} WHERE id = ?`, params);
        }

        await logAudit(req, {
            userId: req.user.id,
            userName: req.user.name,
            role: req.user.role,
            department: "water",
            action: "WATER_TANK_SUPPLY_MAPPING_UPDATED",
            module: "WATER",
            record_id: current.tank_id,
            metadata: { tank_id: current.tank_id, supplied_areas, source_asset_id }
        });

        res.json({
            success: true,
            message: `Supply area routing updated for tank ${current.name} (${current.tank_id}).`,
            tank: { tank_id: current.tank_id, supplied_areas, source_asset_id }
        });
    } catch (err) {
        console.error("Tank supply mapping error:", err);
        res.status(500).json({ success: false, message: "Database error updating tank supply areas." });
    }
});

// =========================================================
// 32. PUBLIC WATER SUPPLY STATUS & ANNOUNCED WATER CUTS
// =========================================================

// Public Water Supply Status & Cuts (For Visitors & Citizens — No internal data leaks)
router.get("/api/water/public/supply-status", async (req, res) => {
    try {
        const [announcements] = await pool.query(`
            SELECT announcement_id, title, type, zone, affected_areas,
                   start_time, end_time, reason, alternative_supply, status
            FROM water_supply_announcements
            WHERE status IN ('ACTIVE', 'SCHEDULED')
            ORDER BY start_time ASC
        `);

        const [tanks] = await pool.query(`
            SELECT name, zone, capacity_liters, current_level_percent,
                   status, next_supply_time, supplied_areas, supply_schedule
            FROM water_tanks
            ORDER BY zone ASC
        `);

        const [sectors] = await pool.query(`
            SELECT sector_code, name, zone, total_demand_mld, population_served
            FROM water_sectors
            WHERE status = 'ACTIVE'
            ORDER BY name ASC
        `);

        // Format clean visitor-facing response
        const formattedAnnouncements = announcements.map(a => ({
            ...a,
            affected_areas: safeParseJson(a.affected_areas, [])
        }));

        const formattedTanks = tanks.map(t => ({
            ...t,
            supplied_areas: safeParseJson(t.supplied_areas, [])
        }));

        res.json({
            success: true,
            city_supply_health: "NORMAL",
            overall_storage_percentage: Math.round(tanks.reduce((acc, t) => acc + (t.current_level_percent || 0), 0) / (tanks.length || 1)),
            active_water_cuts_count: formattedAnnouncements.filter(a => a.status === "ACTIVE").length,
            scheduled_cuts_count: formattedAnnouncements.filter(a => a.status === "SCHEDULED").length,
            announced_water_cuts: formattedAnnouncements,
            tanks_summary: formattedTanks,
            sectors_summary: sectors,
            citizen_helpline: "1800-180-2026",
            emergency_tanker_contact: "0551-2334455"
        });
    } catch (err) {
        console.error("Public supply status fetch error:", err);
        res.status(500).json({ success: false, message: "Error fetching public supply status." });
    }
});

// Admin Announcements CRUD
router.get("/api/water/announcements", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM water_supply_announcements ORDER BY start_time DESC");
        const formatted = rows.map(r => ({
            ...r,
            affected_areas: safeParseJson(r.affected_areas, [])
        }));
        res.json({ success: true, count: formatted.length, announcements: formatted });
    } catch (err) {
        console.error("Fetch announcements error:", err);
        res.status(500).json({ success: false, message: "Database error fetching announcements." });
    }
});

router.post("/api/water/announcements", authenticateToken, requireWaterAdmin, async (req, res) => {
    const { title, type, zone, affected_areas, start_time, end_time, reason, alternative_supply, status } = req.body;

    if (!title || !zone || !start_time || !end_time || !reason) {
        return res.status(400).json({ success: false, message: "Title, zone, start_time, end_time, and reason are required." });
    }

    const annId = `ANN-WTR-${Date.now().toString().slice(-4)}`;

    try {
        await pool.query(`
            INSERT INTO water_supply_announcements
            (announcement_id, title, type, zone, affected_areas, start_time, end_time, reason, alternative_supply, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            annId,
            title.trim(),
            type || "WATER_CUT",
            zone.trim(),
            affected_areas ? (typeof affected_areas === "string" ? affected_areas : JSON.stringify(affected_areas)) : JSON.stringify([zone.trim()]),
            new Date(start_time),
            new Date(end_time),
            reason.trim(),
            alternative_supply || "Emergency water tankers on standby.",
            status || "SCHEDULED",
            req.user.name || "Water Admin"
        ]);

        await logAudit(req, {
            userId: req.user.id,
            userName: req.user.name,
            role: req.user.role,
            department: "water",
            action: "WATER_ANNOUNCEMENT_CREATED",
            module: "WATER",
            record_id: annId
        });

        res.status(201).json({
            success: true,
            message: `Announcement ${title} scheduled successfully.`,
            announcement_id: annId
        });
    } catch (err) {
        console.error("Create announcement error:", err);
        res.status(500).json({ success: false, message: "Database error creating announcement." });
    }
});

router.put("/api/water/announcements/:id", authenticateToken, requireWaterAdmin, async (req, res) => {
    const id = req.params.id;
    const { title, type, zone, affected_areas, start_time, end_time, reason, alternative_supply, status } = req.body;

    try {
        const [existing] = await pool.query(
            "SELECT * FROM water_supply_announcements WHERE announcement_id = ? OR id = ? LIMIT 1",
            [id, isNaN(Number(id)) ? 0 : Number(id)]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Announcement not found." });
        }
        const current = existing[0];

        const updates = [];
        const params = [];

        if (title) { updates.push("title = ?"); params.push(title.trim()); }
        if (type) { updates.push("type = ?"); params.push(type); }
        if (zone) { updates.push("zone = ?"); params.push(zone.trim()); }
        if (affected_areas) { updates.push("affected_areas = ?"); params.push(typeof affected_areas === "string" ? affected_areas : JSON.stringify(affected_areas)); }
        if (start_time) { updates.push("start_time = ?"); params.push(new Date(start_time)); }
        if (end_time) { updates.push("end_time = ?"); params.push(new Date(end_time)); }
        if (reason) { updates.push("reason = ?"); params.push(reason.trim()); }
        if (alternative_supply) { updates.push("alternative_supply = ?"); params.push(alternative_supply); }
        if (status) { updates.push("status = ?"); params.push(status); }

        if (updates.length > 0) {
            params.push(current.id);
            await pool.query(`UPDATE water_supply_announcements SET ${updates.join(", ")} WHERE id = ?`, params);
        }

        await logAudit(req, {
            userId: req.user.id,
            userName: req.user.name,
            role: req.user.role,
            department: "water",
            action: "WATER_ANNOUNCEMENT_UPDATED",
            module: "WATER",
            record_id: current.announcement_id
        });

        res.json({ success: true, message: `Announcement ${current.announcement_id} updated.` });
    } catch (err) {
        console.error("Update announcement error:", err);
        res.status(500).json({ success: false, message: "Database error updating announcement." });
    }
});

router.delete("/api/water/announcements/:id", authenticateToken, requireWaterAdmin, async (req, res) => {
    const id = req.params.id;
    try {
        const [existing] = await pool.query(
            "SELECT * FROM water_supply_announcements WHERE announcement_id = ? OR id = ? LIMIT 1",
            [id, isNaN(Number(id)) ? 0 : Number(id)]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Announcement not found." });
        }
        const current = existing[0];

        await pool.query("DELETE FROM water_supply_announcements WHERE id = ?", [current.id]);

        await logAudit(req, {
            userId: req.user.id,
            userName: req.user.name,
            role: req.user.role,
            department: "water",
            action: "WATER_ANNOUNCEMENT_DELETED",
            module: "WATER",
            record_id: current.announcement_id
        });

        res.json({ success: true, message: `Announcement ${current.announcement_id} removed.` });
    } catch (err) {
        console.error("Delete announcement error:", err);
        res.status(500).json({ success: false, message: "Database error deleting announcement." });
    }
});

// =========================================================
// 33. VISITOR COMPLAINTS WITH MAP LOCATION & PHOTO
// =========================================================

// Submit Water Complaint (Public / Citizen with Map Coordinates & Optional Photo)
router.post("/api/water/complaints", optionalToken, upload.single("evidenceImage"), async (req, res) => {
    try {
        const citizenName = (req.body.citizenName || req.body.citizen_name || (req.user && req.user.name) || "Concerned Citizen").trim();
        const mobile = (req.body.mobile || (req.user && req.user.phone) || "9876543210").trim();
        const rawCategory = (req.body.category || req.body.issue_type || req.body.issueType || "Water Quality").trim();
        const locationName = (req.body.location || req.body.location_name || "Gorakhpur Municipal Area").trim();
        const description = (req.body.description || "").trim();
        const userId = req.body.userId || (req.user && req.user.id) || null;

        const lat = req.body.latitude ? Number(req.body.latitude) : null;
        const lng = req.body.longitude ? Number(req.body.longitude) : null;

        // Normalize Categories to requested standard:
        // water quality, dirty water, low pressure, insufficient/no supply, leakage, sewage overflow
        let normalizedCategory = "Water Quality";
        const catLower = rawCategory.toLowerCase();
        if (catLower.includes("dirty") || catLower.includes("muddy") || catLower.includes("discolor")) {
            normalizedCategory = "Dirty Water";
        } else if (catLower.includes("low pressure") || catLower.includes("pressure")) {
            normalizedCategory = "Low Pressure";
        } else if (catLower.includes("no supply") || catLower.includes("insufficient") || catLower.includes("no water")) {
            normalizedCategory = "Insufficient / No Supply";
        } else if (catLower.includes("leak") || catLower.includes("burst")) {
            normalizedCategory = "Leakage";
        } else if (catLower.includes("sewage") || catLower.includes("drain") || catLower.includes("overflow") || catLower.includes("gutter")) {
            normalizedCategory = "Sewage Overflow";
        } else {
            normalizedCategory = "Water Quality";
        }

        const { priority, slaHours } = calculateWaterPriority({
            issueType: normalizedCategory,
            description,
            location: locationName
        });

        const trackingId = `WTR-CMP-${Date.now().toString(36).toUpperCase()}`;
        const evidencePath = req.file ? `/uploads/water/${req.file.filename}` : null;

        const [insertResult] = await pool.query(`
            INSERT INTO water_reports
            (report_id, user_id, citizen_name, mobile, issue_type, category, location, latitude, longitude, description, status, priority, evidence_image)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?, ?)
        `, [
            trackingId,
            userId,
            citizenName,
            mobile,
            normalizedCategory,
            normalizedCategory,
            locationName,
            lat,
            lng,
            description || `Complaint regarding ${normalizedCategory} at ${locationName}`,
            priority,
            evidencePath
        ]);

        const [createdRows] = await pool.query("SELECT * FROM water_reports WHERE id = ?", [insertResult.insertId]);
        const complaint = createdRows[0];

        // Notify authorized Admin / Staff dashboards in real-time
        emitWaterUpdate({
            type: "new_water_complaint",
            complaint,
            trackingId,
            category: normalizedCategory,
            location: locationName,
            priority,
            updatedAt: new Date().toISOString()
        });

        res.status(201).json({
            success: true,
            message: "Water complaint successfully registered.",
            tracking_id: trackingId,
            report_id: trackingId,
            complaint: {
                tracking_id: trackingId,
                citizen_name: citizenName,
                category: normalizedCategory,
                location: locationName,
                latitude: lat,
                longitude: lng,
                status: "Open",
                priority,
                sla_hours: slaHours || 24,
                evidence_image: evidencePath,
                created_at: complaint.created_at
            }
        });
    } catch (err) {
        console.error("Submit water complaint error:", err);
        res.status(500).json({ success: false, message: "Database error registering water complaint." });
    }
});

// Track Complaint Status by Tracking ID or Mobile (Publicly accessible)
router.get("/api/water/complaints/track/:trackingId", async (req, res) => {
    const trackingId = req.params.trackingId.trim();
    try {
        const [rows] = await pool.query(`
            SELECT report_id AS tracking_id, citizen_name, issue_type AS category,
                   location, status, priority, description, evidence_image,
                   created_at, updated_at, resolved_at
            FROM water_reports
            WHERE LOWER(report_id) = LOWER(?) OR id = ?
            LIMIT 1
        `, [trackingId, isNaN(Number(trackingId)) ? 0 : Number(trackingId)]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Complaint tracking ID not found." });
        }

        const comp = rows[0];
        res.json({
            success: true,
            complaint: comp
        });
    } catch (err) {
        console.error("Track complaint error:", err);
        res.status(500).json({ success: false, message: "Database error tracking complaint." });
    }
});

// =========================================================
// 34. ROLE-BASED SECURE STAFF DASHBOARD FOUNDATION
// =========================================================
router.get("/api/water/staff/dashboard-overview", authenticateToken, requireWaterStaff, async (req, res) => {
    try {
        const permittedSectors = Array.isArray(req.user.permitted_sectors) ? req.user.permitted_sectors : [];
        const permittedAssets = Array.isArray(req.user.permitted_assets) ? req.user.permitted_assets : [];
        const staffId = req.user.staffId || req.user.staff_id || "";

        // Scoped work orders: assigned to this staff or matching permitted sectors
        let woSql = "SELECT * FROM water_work_orders WHERE (assigned_to_id = ? OR assigned_to_name = ?)";
        let woParams = [staffId, req.user.name || ""];

        if (permittedSectors.length > 0 && !permittedSectors.includes("ALL_SECTORS")) {
            const placeholders = permittedSectors.map(() => "?").join(",");
            woSql += ` OR zone IN (${placeholders})`;
            woParams.push(...permittedSectors);
        }
        woSql += " ORDER BY created_at DESC LIMIT 20";

        const [workOrders] = await pool.query(woSql, woParams);

        // Scoped tanks in permitted sectors
        let tankSql = "SELECT id, tank_id, name, zone, capacity_liters, current_level_percent, pump_status, status, supplied_areas FROM water_tanks";
        let tankParams = [];
        if (permittedSectors.length > 0 && !permittedSectors.includes("ALL_SECTORS")) {
            const placeholders = permittedSectors.map(() => "?").join(",");
            tankSql += ` WHERE zone IN (${placeholders})`;
            tankParams.push(...permittedSectors);
        }
        const [scopedTanks] = await pool.query(tankSql, tankParams);

        // Scoped assets
        let assetSql = "SELECT id, asset_id, name, asset_type, zone, status, pump_state, valve_state, flow_direction FROM water_network_assets";
        let assetParams = [];
        if (permittedAssets.length > 0) {
            const placeholders = permittedAssets.map(() => "?").join(",");
            assetSql += ` WHERE asset_id IN (${placeholders})`;
            assetParams.push(...permittedAssets);
        }
        const [scopedAssets] = await pool.query(assetSql, assetParams);

        res.json({
            success: true,
            staff_session: {
                staff_id: staffId,
                name: req.user.name,
                role: req.user.role,
                department: "water",
                permitted_sectors: permittedSectors,
                permitted_assets: permittedAssets
            },
            assigned_work_orders: workOrders,
            permitted_tanks: scopedTanks.map(t => ({ ...t, supplied_areas: safeParseJson(t.supplied_areas, []) })),
            permitted_assets: scopedAssets
        });
    } catch (err) {
        console.error("Staff dashboard overview error:", err);
        res.status(500).json({ success: false, message: "Database error fetching staff dashboard overview." });
    }
});

// ============================================================================
// 🌊 HYDRAULIC AI ENGINE & MULTI-PIPE JUNCTION SCADA CONTROL SECTION ENDPOINTS
// ============================================================================

/**
 * GET /api/water/hydraulic-ai/status
 * Returns full real-time pre-check diagnostics: motors (RPM, vibration, temp),
 * pipelines (pressure margin, silt deposit %), heavy monsoon forecast,
 * city flood evacuation status, and household clean water delivery guarantee.
 */
router.get("/api/water/hydraulic-ai/status", optionalToken, async (req, res) => {
    try {
        const status = await waterIntelligenceService.getHydraulicAIStatus();
        res.json({ system_healthy: true, ...status });
    } catch (err) {
        console.error("Hydraulic AI status error:", err);
        res.status(500).json({ success: false, message: "Error computing hydraulic AI status: " + err.message });
    }
});

/**
 * POST /api/water/hydraulic-ai/evacuation-protocol
 * Toggles between MONSOON_SURGE (automated storm turbine evacuation) and NORMAL_BALANCED.
 * Protected: Water Staff or Water Admin.
 */
router.post("/api/water/hydraulic-ai/evacuation-protocol", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const role = (user.role || "").toLowerCase();
        const dept = (user.department || "").toLowerCase();
        if (role !== "admin" && role !== "staff" && !dept.includes("water") && !isSuperAdminUser(user)) {
            return res.status(403).json({ success: false, message: "Only Water Staff or Water Admin can toggle monsoon evacuation protocol." });
        }

        const { mode } = req.body;
        const result = await waterIntelligenceService.setEvacuationProtocol({
            mode: mode || "MONSOON_SURGE",
            user
        });

        emitWaterUpdate("monsoon_evacuation_update", {
            mode: result.hydraulic_ai_system_mode,
            monsoon_evacuation_active: result.monsoon_evacuation_active,
            timestamp: result.last_ai_precheck_timestamp
        });

        res.json(result);
    } catch (err) {
        console.error("Evacuation protocol error:", err);
        res.status(500).json({ success: false, message: "Failed to update evacuation protocol: " + err.message });
    }
});

/**
 * GET /api/water/junctions
 * Returns all Multi-Way SCADA Hydraulic Junction Control Hubs with telemetry.
 */
router.get("/api/water/junctions", optionalToken, async (req, res) => {
    try {
        const status = await waterIntelligenceService.getHydraulicAIStatus();
        res.json({
            success: true,
            count: status.junction_control_hubs.length,
            junctions: status.junction_control_hubs
        });
    } catch (err) {
        console.error("Get junctions error:", err);
        res.status(500).json({ success: false, message: "Error fetching junctions: " + err.message });
    }
});

/**
 * POST /api/water/junctions/:junctionId/operate
 * Operates individual branch valves or booster motors at any of the 6 junction hubs.
 * Protected: Water Staff or Admin.
 */
router.post("/api/water/junctions/:junctionId/operate", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const role = (user.role || "").toLowerCase();
        const dept = (user.department || "").toLowerCase();
        if (role !== "admin" && role !== "staff" && !dept.includes("water") && !isSuperAdminUser(user)) {
            return res.status(403).json({ success: false, message: "Only Water Staff or Water Admin can operate junction hubs." });
        }

        const { junctionId } = req.params;
        const { valve_states, motor_command } = req.body;

        const result = await waterIntelligenceService.operateJunctionHub({
            junctionId,
            valve_states,
            motor_command,
            user
        });

        emitWaterUpdate("junction_operation_update", result);
        res.json(result);
    } catch (err) {
        console.error("Operate junction error:", err);
        res.status(500).json({ success: false, message: "Failed to operate junction: " + err.message });
    }
});

module.exports = router;

