const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken, optionalToken, requireRole } = require("../middleware/auth.middleware");

// =========================================================
// POLICE STATIONS — GET ALL
// =========================================================

router.get("/api/police/stations", (req, res) => {
    const sql = `
        SELECT
            id, station_id, name, sho_name, phone,
            jurisdiction, location, latitude, longitude,
            created_at
        FROM police_stations
        ORDER BY name ASC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Police stations fetch error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        res.json({
            success: true,
            message: "Police stations fetched successfully.",
            stations: results
        });
    });
});

// =========================================================
// POLICE STATS — GET MONTHLY CRIME STATISTICS
// =========================================================

router.get("/api/police/stats", (req, res) => {
    // Ordered chronologically; limit configurable via query param
    const limit = Math.min(Number(req.query.limit) || 6, 12);

    const sql = `
        SELECT
            month_year, theft, assault, traffic_violations,
            domestic, cybercrime, other, total
        FROM police_stats
        ORDER BY id ASC
        LIMIT ?
    `;

    db.query(sql, [limit], (err, results) => {
        if (err) {
            console.error("Police stats fetch error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        // Also compute per-category totals for summary cards
        const summary = results.reduce(
            (acc, row) => {
                acc.theft            += Number(row.theft            || 0);
                acc.assault          += Number(row.assault          || 0);
                acc.traffic_violations += Number(row.traffic_violations || 0);
                acc.domestic         += Number(row.domestic         || 0);
                acc.cybercrime       += Number(row.cybercrime       || 0);
                acc.other            += Number(row.other            || 0);
                acc.total            += Number(row.total            || 0);
                return acc;
            },
            { theft: 0, assault: 0, traffic_violations: 0, domestic: 0, cybercrime: 0, other: 0, total: 0 }
        );

        res.json({
            success: true,
            message: "Police statistics fetched. Data is for demonstration purposes only.",
            verified: false,
            monthly: results,
            summary
        });
    });
});

// =========================================================
// POLICE COMPLAINTS — SUBMIT
// =========================================================

router.post("/api/police/complaint", optionalToken, (req, res) => {
    const { userId, citizenName, mobile, category, subject, description, stationId } = req.body;
    const finalUserId = req.user ? req.user.id : (userId || null);
    const finalCitizenName = (req.user && req.user.name) ? req.user.name : citizenName;
    const finalMobile = (req.user && req.user.mobile) ? req.user.mobile : mobile;

    if (!finalCitizenName || !finalMobile || !category || !subject || !description) {
        return res.status(400).json({
            message: "Name, mobile, category, subject, and description are required."
        });
    }

    const allowedCategories = [
        "Theft", "Assault", "Domestic Violence", "Cybercrime",
        "Traffic Violation", "Missing Person", "Property Dispute",
        "Harassment", "Fraud", "Other"
    ];

    if (!allowedCategories.includes(category)) {
        return res.status(400).json({ message: "Invalid complaint category." });
    }

    const complaintId = "CMP-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(Math.random() * 1000);

    db.query(
        `INSERT INTO police_complaints
         (complaint_id, user_id, citizen_name, mobile, category, subject, description, status, station_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Under Review', ?)`,
        [complaintId, finalUserId, finalCitizenName, finalMobile, category, subject, description, stationId || null],
        (err, result) => {
            if (err) {
                console.error("Police complaint insert error:", err);
                return res.status(500).json({ message: "Database error." });
            }

            res.status(201).json({
                success: true,
                message: "Complaint registered successfully. You will receive a response within 24–48 hours.",
                complaint: {
                    id: result.insertId,
                    complaintId,
                    citizenName,
                    category,
                    status: "Under Review"
                }
            });
        }
    );
});

// =========================================================
// POLICE COMPLAINTS — GET (by user or all for staff)
// =========================================================

router.get("/api/police/complaints", authenticateToken, (req, res) => {
    const { userId } = req.query;
    const isStaffOrAdmin = ["staff", "admin"].includes(req.user.role) || ["staff", "admin"].includes(req.user.type);

    let sql = `
        SELECT id, complaint_id, citizen_name, mobile,
               category, subject, status, station_id, created_at
        FROM police_complaints
    `;

    const params = [];
    if (!isStaffOrAdmin) {
        // Citizens strictly isolated to their own complaints
        sql += " WHERE (user_id = ? OR mobile = ?)";
        params.push(req.user.id, req.user.mobile || "");
    } else if (userId) {
        sql += " WHERE user_id = ?";
        params.push(userId);
    }

    sql += " ORDER BY created_at DESC";

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Police complaints fetch error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        res.json({ success: true, complaints: results });
    });
});

// =========================================================
// POLICE COMPLAINTS — UPDATE STATUS (Staff/Admin)
// =========================================================

router.put("/api/police/complaints/:id/status", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;
    const { status } = req.body;

    const allowed = ["Under Review", "Acknowledged", "Under Investigation", "Resolved", "Closed"];
    if (!allowed.includes(status)) {
        return res.status(400).json({ message: "Invalid status." });
    }

    db.query(
        "UPDATE police_complaints SET status = ? WHERE id = ? OR complaint_id = ?",
        [status, id, id],
        (err, result) => {
            if (err) {
                console.error("Complaint status update error:", err);
                return res.status(500).json({ message: "Database error." });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Complaint not found." });
            }

            res.json({ success: true, message: "Complaint status updated.", status });
        }
    );
});

module.exports = router;
