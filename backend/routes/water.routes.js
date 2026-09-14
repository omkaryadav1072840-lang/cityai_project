const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken, requireRole } = require("../middleware/auth.middleware");
const { emitWaterUpdate } = require("../sockets/index");

// =========================================================
// WATER TANKS — GET ALL
// =========================================================

router.get("/api/water/tanks", (req, res) => {
    const sql = `
        SELECT
            id, tank_id, name, zone,
            capacity_liters, current_level_percent,
            status, next_supply_time, updated_at
        FROM water_tanks
        ORDER BY name ASC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Water tanks fetch error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        res.json({
            success: true,
            message: "Water tanks fetched successfully.",
            tanks: results
        });
    });
});

// =========================================================
// WATER TANKS — GET SINGLE
// =========================================================

router.get("/api/water/tanks/:id", (req, res) => {
    const id = req.params.id;

    db.query(
        "SELECT * FROM water_tanks WHERE id = ? OR tank_id = ? LIMIT 1",
        [id, id],
        (err, results) => {
            if (err) {
                console.error("Get tank error:", err);
                return res.status(500).json({ success: false, message: "Database error." });
            }

            if (results.length === 0) {
                return res.status(404).json({ success: false, message: "Water tank not found." });
            }

            res.json({ success: true, tank: results[0] });
        }
    );
});

// =========================================================
// WATER TANKS — UPDATE (Staff/Admin only)
// =========================================================

router.put("/api/water/tanks/:id", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;
    const { currentLevelPercent, status, nextSupplyTime } = req.body;

    const level = currentLevelPercent !== undefined ? Math.min(100, Math.max(0, Number(currentLevelPercent))) : undefined;

    db.query(
        `UPDATE water_tanks
         SET current_level_percent = COALESCE(?, current_level_percent),
             status = COALESCE(?, status),
             next_supply_time = COALESCE(?, next_supply_time)
         WHERE id = ? OR tank_id = ?`,
        [level !== undefined ? level : null, status || null, nextSupplyTime || null, id, id],
        (err, result) => {
            if (err) {
                console.error("Update tank error:", err);
                return res.status(500).json({ message: "Database error." });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Water tank not found." });
            }

            db.query("SELECT * FROM water_tanks WHERE id = ? OR tank_id = ? LIMIT 1", [id, id], (fetchErr, rows) => {
                if (!fetchErr && rows && rows.length > 0) {
                    emitWaterUpdate({
                        type: "tank",
                        tank: rows[0],
                        updatedAt: new Date().toISOString()
                    });
                }
            });

            res.json({ success: true, message: "Water tank updated successfully." });
        }
    );
});

// =========================================================
// WATER REPORTS — GET ALL (with optional status filter)
// =========================================================

router.get("/api/water/reports", (req, res) => {
    const { status, userId } = req.query;
    let sql = `
        SELECT id, report_id, user_id, citizen_name, mobile,
               issue_type, location, description, status,
               created_at, updated_at
        FROM water_reports
    `;

    const params = [];
    const conditions = [];

    if (status) {
        conditions.push("status = ?");
        params.push(status);
    }

    if (userId) {
        conditions.push("user_id = ?");
        params.push(userId);
    }

    if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY created_at DESC";

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Water reports fetch error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        res.json({ success: true, reports: results });
    });
});

// =========================================================
// WATER REPORTS — SUBMIT COMPLAINT (Citizen)
// =========================================================

router.post("/api/water/reports", (req, res) => {
    const { userId, citizenName, mobile, issueType, location, description } = req.body;

    if (!citizenName || !mobile || !issueType || !location) {
        return res.status(400).json({
            message: "Name, mobile, issue type, and location are required."
        });
    }

    const allowedIssues = ["No Supply", "Low Pressure", "Contamination", "Pipe Leak", "Billing Issue", "Other"];
    if (!allowedIssues.includes(issueType)) {
        return res.status(400).json({ message: "Invalid issue type." });
    }

    const reportId = "WR-" + Date.now().toString(36).toUpperCase();

    db.query(
        `INSERT INTO water_reports
         (report_id, user_id, citizen_name, mobile, issue_type, location, description, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Open')`,
        [reportId, userId || null, citizenName, mobile, issueType, location, description || null],
        (err, result) => {
            if (err) {
                console.error("Water report insert error:", err);
                return res.status(500).json({ message: "Database error." });
            }

            res.status(201).json({
                success: true,
                message: "Water supply complaint submitted successfully.",
                report: {
                    id: result.insertId,
                    reportId,
                    citizenName,
                    issueType,
                    location,
                    status: "Open"
                }
            });
        }
    );
});

// =========================================================
// WATER REPORTS — UPDATE STATUS (Staff/Admin only)
// =========================================================

router.put("/api/water/reports/:id/status", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;
    const { status } = req.body;

    const allowed = ["Open", "Under Review", "In Progress", "Resolved", "Closed"];
    if (!allowed.includes(status)) {
        return res.status(400).json({ message: "Invalid status." });
    }

    db.query(
        "UPDATE water_reports SET status = ? WHERE id = ? OR report_id = ?",
        [status, id, id],
        (err, result) => {
            if (err) {
                console.error("Water report status update error:", err);
                return res.status(500).json({ message: "Database error." });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Report not found." });
            }

            res.json({ success: true, message: "Report status updated.", status });
        }
    );
});

// =========================================================
// WATER TANKER BOOKING — BOOK
// =========================================================

router.post("/api/water/tanker-bookings", (req, res) => {
    const { userId, citizenName, mobile, deliveryAddress, capacity, bookingDate } = req.body;

    if (!citizenName || !mobile || !deliveryAddress || !bookingDate) {
        return res.status(400).json({ message: "Name, mobile, address, and date are required." });
    }

    const bookingId = "TKB-" + Date.now().toString(36).toUpperCase();

    db.query(
        `INSERT INTO water_tanker_bookings
         (booking_id, user_id, citizen_name, mobile, delivery_address, capacity, booking_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
        [bookingId, userId || null, citizenName, mobile, deliveryAddress,
         capacity || "5000 Litres", bookingDate],
        (err, result) => {
            if (err) {
                console.error("Tanker booking error:", err);
                return res.status(500).json({ message: "Database error." });
            }

            res.status(201).json({
                success: true,
                message: "Tanker booking submitted successfully.",
                booking: { id: result.insertId, bookingId, status: "Pending" }
            });
        }
    );
});

// =========================================================
// WATER TANKER BOOKING — GET (by user)
// =========================================================

router.get("/api/water/tanker-bookings", (req, res) => {
    const { userId } = req.query;
    let sql = `
        SELECT id, booking_id, user_id, citizen_name, mobile,
               delivery_address, capacity, booking_date, status, created_at
        FROM water_tanker_bookings
    `;

    const params = [];
    if (userId) {
        sql += " WHERE user_id = ?";
        params.push(userId);
    }
    sql += " ORDER BY created_at DESC";

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Tanker bookings fetch error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        res.json({ success: true, bookings: results });
    });
});

module.exports = router;
