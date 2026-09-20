const express = require("express");
const router = express.Router();
const pool = require("../config/db").promise();
const { authenticateToken } = require("../middleware/auth.middleware");
const { logAudit } = require("../services/audit_logger");

function canManageStreetLights(user) {
    if (!user) return false;
    const role = (user.role || user.type || "").toLowerCase();
    if (role === "admin") return true;
    if (role === "staff") {
        const dept = (user.department || "").toLowerCase();
        return dept === "street_lights" || dept === "admin";
    }
    return false;
}

// =========================================================
// 1. GET ALL STREET LIGHTS
// =========================================================

router.get("/api/street-lights", async (req, res) => {
    try {
        const { status, zone } = req.query;
        let query = "SELECT * FROM street_lights WHERE 1=1";
        const params = [];

        if (status) {
            query += " AND status = ?";
            params.push(status);
        }

        query += " ORDER BY id ASC";
        const [rows] = await pool.query(query, params);

        const total = rows.length;
        const activeCount = rows.filter(l => l.status === "ON").length;
        const faultCount = rows.filter(l => l.status === "FAULT").length;
        const offCount = rows.filter(l => l.status === "OFF").length;

        res.json({
            success: true,
            summary: {
                total,
                on: activeCount,
                fault: faultCount,
                off: offCount
            },
            data: rows
        });
    } catch (err) {
        console.error("Get street lights error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// =========================================================
// 2. GET FAULTY STREET LIGHTS
// =========================================================

router.get("/api/street-lights/faults", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM street_lights WHERE status = 'FAULT' ORDER BY id ASC");
        res.json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (err) {
        console.error("Get faulty street lights error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// =========================================================
// 3. ADD NEW STREET LIGHT (Staff / Admin)
// =========================================================

router.post("/api/street-lights", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        if (!canManageStreetLights(user)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only street lights staff or admin can register new lighting infrastructure."
            });
        }

        const { light_code, name, location, latitude, longitude, brightness = 100, status = "ON" } = req.body;

        if (!name || !location || latitude == null || longitude == null) {
            return res.status(400).json({
                success: false,
                message: "Name, location, latitude, and longitude are required."
            });
        }

        const code = light_code || `SL-GKP-${Date.now().toString().slice(-4)}`;

        const [result] = await pool.query(
            `INSERT INTO street_lights 
             (light_code, name, location, latitude, longitude, status, brightness, department)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'street_lights')`,
            [code, name, location, latitude, longitude, status, brightness]
        );

        await logAudit(req, {
            action: "CREATE_STREET_LIGHT",
            module: "street_lights",
            recordId: code,
            department: "street_lights",
            metadata: { name, location, latitude, longitude, brightness }
        });

        res.status(201).json({
            success: true,
            message: "Street light registered successfully.",
            data: { id: result.insertId, light_code: code, name, location, status, brightness }
        });
    } catch (err) {
        console.error("Create street light error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// =========================================================
// 4. UPDATE STATUS / BRIGHTNESS (Staff / Admin)
// =========================================================

router.put("/api/street-lights/:id/status", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        if (!canManageStreetLights(user)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only street lights department staff can control lighting nodes."
            });
        }

        const { status, brightness, fault_type } = req.body;
        const validStatuses = ["ON", "OFF", "FAULT", "UNKNOWN"];

        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
            });
        }

        const [existing] = await pool.query("SELECT * FROM street_lights WHERE id = ? LIMIT 1", [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Street light not found." });
        }

        const light = existing[0];
        const newStatus = status || light.status;
        const newBrightness = brightness != null ? Number(brightness) : light.brightness;
        const newFault = newStatus === "FAULT" ? (fault_type || light.fault_type || "Electrical failure") : null;

        await pool.query(
            `UPDATE street_lights 
             SET status = ?, brightness = ?, fault_type = ? 
             WHERE id = ?`,
            [newStatus, newBrightness, newFault, light.id]
        );

        await logAudit(req, {
            action: "UPDATE_STREET_LIGHT_STATE",
            module: "street_lights",
            recordId: light.light_code,
            department: "street_lights",
            metadata: { oldStatus: light.status, newStatus, brightness: newBrightness, fault: newFault }
        });

        const io = req.app.get("io");
        if (io) {
            io.emit("street_light:updated", {
                id: light.id,
                light_code: light.light_code,
                status: newStatus,
                brightness: newBrightness
            });
        }

        res.json({
            success: true,
            message: `Street light ${light.light_code} updated to ${newStatus}.`,
            data: { id: light.id, light_code: light.light_code, status: newStatus, brightness: newBrightness }
        });
    } catch (err) {
        console.error("Update street light error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

module.exports = router;
