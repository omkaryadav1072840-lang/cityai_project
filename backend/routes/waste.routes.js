const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken, requireRole } = require("../middleware/auth.middleware");

// =========================================================
// CREATE WASTE BIN REQUEST
// =========================================================

router.post("/api/waste/bin-requests", (req, res) => {
    const {
        userId,
        citizenName,
        reason,
        wasteType,
        location,
        latitude,
        longitude,
        description
    } = req.body;

    if (
        !reason ||
        !wasteType ||
        !location ||
        latitude === undefined ||
        longitude === undefined
    ) {
        return res.status(400).json({
            success: false,
            message: "Reason, waste type, location and GPS coordinates are required."
        });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
        Number.isNaN(lat) ||
        Number.isNaN(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid latitude or longitude."
        });
    }

    const requestCode =
        "BIN-" +
        Date.now().toString(36).toUpperCase() +
        "-" +
        Math.floor(Math.random() * 10000);

    const sql = `
        INSERT INTO waste_bin_requests
        (
            request_code, user_id, citizen_name, reason, waste_type,
            location, latitude, longitude, description, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            requestCode,
            userId || null,
            citizenName || "Citizen",
            reason,
            wasteType,
            location,
            lat,
            lng,
            description || null,
            "Submitted"
        ],
        (err, result) => {
            if (err) {
                console.error("Waste bin request insert error:", err);
                return res.status(500).json({
                    success: false,
                    message: "Database error while submitting dustbin request."
                });
            }

            res.status(201).json({
                success: true,
                message: "Dustbin request submitted successfully.",
                request: {
                    id: result.insertId,
                    requestCode,
                    userId: userId || null,
                    citizenName: citizenName || "Citizen",
                    reason,
                    wasteType,
                    location,
                    latitude: lat,
                    longitude: lng,
                    description: description || null,
                    status: "Submitted"
                }
            });
        }
    );
});

// =========================================================
// GET WASTE BIN REQUESTS
// =========================================================

router.get("/api/waste/bin-requests", (req, res) => {
    const { userId } = req.query;

    let sql = `
        SELECT
            id, request_code, user_id, citizen_name, reason,
            waste_type, location, latitude, longitude,
            description, status, created_at, updated_at
        FROM waste_bin_requests
    `;

    const params = [];
    if (userId) {
        sql += ` WHERE user_id = ? `;
        params.push(userId);
    }

    sql += ` ORDER BY created_at DESC `;

    db.query(sql, params, (err, rows) => {
        if (err) {
            console.error("Waste bin request fetch error:", err);
            return res.status(500).json({
                success: false,
                message: "Database error."
            });
        }

        res.json({
            success: true,
            requests: rows
        });
    });
});

// =========================================================
// UPDATE WASTE BIN REQUEST STATUS
// =========================================================

router.put("/api/waste/bin-requests/:requestCode/status", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const { requestCode } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
        "Submitted",
        "Under Review",
        "Approved",
        "Installation Scheduled",
        "Installed",
        "Rejected"
    ];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: "Invalid waste bin request status."
        });
    }

    const sql = `
        UPDATE waste_bin_requests
        SET status = ?
        WHERE request_code = ?
    `;

    db.query(sql, [status, requestCode], (err, result) => {
        if (err) {
            console.error("Waste bin request status update error:", err);
            return res.status(500).json({
                success: false,
                message: "Database error."
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Dustbin request not found."
            });
        }

        res.json({
            success: true,
            message: "Dustbin request status updated successfully.",
            requestCode,
            status
        });
    });
});

module.exports = router;
