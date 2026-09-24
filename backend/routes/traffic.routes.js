/**
 * SmartCity AI Traffic Platform - Master Express Routes
 * Gorakhpur Urban Traffic Control & Management System
 */

const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const trafficEngine = require("../services/traffic_engine");
const ambulanceSimulator = require("../services/ambulance_simulator");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "smartcity_super_secret_jwt_key_gorakhpur_2026";
const { authenticateToken, requireRole, hashPassword } = require("../middleware/auth.middleware");

/**
 * Access Control Guard: Restricts editing actions to authorized Traffic Staff and Admins only.
 * Citizens / Unauthenticated users are strictly blocked with 401 Unauthorized or 403 Forbidden.
 */
function requireStaffRole(req, res, next) {
    let role = null;
    let operatorName = null;

    if (req.user) {
        role = req.user.role || req.user.type;
        operatorName = req.user.name || req.user.username;
    }

    // 1. Check Bearer Token
    if (!role) {
        const authHeader = req.headers["authorization"] || req.headers["x-access-token"];
        if (authHeader) {
            const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader;
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                if (decoded) {
                    role = decoded.role || decoded.type;
                    operatorName = decoded.name || decoded.username;
                    req.user = decoded;
                }
            } catch (e) {
                return res.status(401).json({
                    success: false,
                    error: "Invalid or expired authorization token."
                });
            }
        }
    }

    if (!role) {
        return res.status(401).json({
            success: false,
            error: "Authentication required: Please provide a valid Bearer token."
        });
    }

    const normalizedRole = (role || "").toLowerCase().trim();
    const staffKeywords = ["staff", "admin", "traffic", "controller", "operator", "officer", "police"];

    // Reject explicitly if role is non-staff
    if (normalizedRole === "citizen" || normalizedRole === "user" || normalizedRole === "guest") {
        return res.status(403).json({
            success: false,
            error: "Access Denied: Only authorized traffic control staff and administrators can modify traffic lights, timings, overrides, or junction configurations."
        });
    }

    if (staffKeywords.some(k => normalizedRole.includes(k))) {
        req.staffUser = { name: operatorName || "Traffic Staff", role: normalizedRole };
        return next();
    }

    return res.status(403).json({
        success: false,
        error: "Access Denied: Only authorized traffic control staff and administrators can modify traffic lights, timings, overrides, or junction configurations."
    });
}

// =========================================================
// 1. JUNCTIONS & SIGNALS
// =========================================================

// 1A. Get all junctions with live status and signal summary
router.get("/api/traffic/junctions", async (req, res) => {
    try {
        const [junctions] = await pool.promise().query(
            `SELECT j.*, 
                    (SELECT COUNT(*) FROM traffic_cameras WHERE junction_id = j.id) as camera_count,
                    (SELECT COUNT(*) FROM traffic_movement_rules WHERE junction_id = j.id AND is_active = 1) as active_rules_count
             FROM traffic_junctions j
             ORDER BY j.id ASC`
        );

        // Attach signal heads
        for (const j of junctions) {
            const [signals] = await pool.promise().query(
                `SELECT * FROM traffic_signals WHERE junction_id = ? ORDER BY approach ASC`,
                [j.id]
            );
            j.signals = signals;
        }

        res.json({
            success: true,
            total: junctions.length,
            junctions
        });
    } catch (err) {
        console.error("Fetch junctions error:", err);
        res.status(500).json({ error: "Failed to fetch traffic junctions" });
    }
});

// 1B. Get single junction details
router.get("/api/traffic/junctions/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.promise().query(
            `SELECT * FROM traffic_junctions WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "Junction not found" });
        }

        const junction = rows[0];

        // Fetch signals
        const [signals] = await pool.promise().query(
            `SELECT * FROM traffic_signals WHERE junction_id = ?`,
            [id]
        );

        // Fetch cameras
        const [cameras] = await pool.promise().query(
            `SELECT * FROM traffic_cameras WHERE junction_id = ?`,
            [id]
        );

        // Fetch rules
        const [rules] = await pool.promise().query(
            `SELECT * FROM traffic_movement_rules WHERE junction_id = ?`,
            [id]
        );

        junction.signals = signals;
        junction.cameras = cameras;
        junction.rules = rules;

        res.json({ success: true, junction });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch junction details" });
    }
});

// 1B-2. Webster's Optimum Signal Timing Engineering Engine
router.get("/api/traffic/junctions/:id/webster-timing", async (req, res) => {
    try {
        const { id } = req.params;
        const [jnc] = await pool.promise().query(`SELECT * FROM traffic_junctions WHERE id = ?`, [id]);
        if (jnc.length === 0) {
            return res.status(404).json({ error: "Junction not found" });
        }

        const [signals] = await pool.promise().query(`SELECT * FROM traffic_signals WHERE junction_id = ?`, [id]);
        const [cameras] = await pool.promise().query(`SELECT * FROM traffic_cameras WHERE junction_id = ?`, [id]);

        // IRC Indian Road Congress Traffic Engineering Parameters
        const saturationFlowS = 1800; // PCU per hour per lane
        const lostTimePerPhaseL = 4.0; // Seconds lost due to acceleration & yellow clearance
        const numPhases = 2; // North-South and East-West phases
        const totalLostTimeL = numPhases * lostTimePerPhaseL; // 8 seconds

        // Calculate flow for Phase 1 (N-S) and Phase 2 (E-W)
        const nsCams = cameras.filter(c => ['North', 'South'].includes(c.approach));
        const ewCams = cameras.filter(c => ['East', 'West'].includes(c.approach));

        const nsVehPerMin = nsCams.length > 0 
            ? nsCams.reduce((sum, c) => sum + (c.vehicles_per_min || 35), 0) / nsCams.length 
            : 42;
        const ewVehPerMin = ewCams.length > 0 
            ? ewCams.reduce((sum, c) => sum + (c.vehicles_per_min || 25), 0) / ewCams.length 
            : 32;

        const q1 = Math.round(nsVehPerMin * 60); // Vehicles per hour (North-South)
        const q2 = Math.round(ewVehPerMin * 60); // Vehicles per hour (East-West)

        const y1 = Number((q1 / saturationFlowS).toFixed(3));
        const y2 = Number((q2 / saturationFlowS).toFixed(3));
        const Y = Number(Math.min(0.85, Math.max(0.20, y1 + y2)).toFixed(3)); // Sum of critical flow ratios

        // Webster's Optimum Cycle Formula: C0 = (1.5 * L + 5) / (1 - Y)
        const rawC0 = (1.5 * totalLostTimeL + 5) / (1 - Y);
        const optimumCycleC0 = Math.min(130, Math.max(45, Math.round(rawC0)));

        // Effective green times
        const totalEffectiveGreen = optimumCycleC0 - totalLostTimeL;
        const greenNS = Math.max(20, Math.round((y1 / Y) * totalEffectiveGreen));
        const greenEW = Math.max(18, optimumCycleC0 - totalLostTimeL - greenNS);

        res.json({
            success: true,
            junctionId: id,
            junctionName: jnc[0].name,
            junction: {
                id: jnc[0].id,
                name: jnc[0].name,
                zone: jnc[0].zone,
                current_cycle: jnc[0].cycle_time
            },
            engineeringFormula: "C₀ = (1.5L + 5) / (1 - Y)",
            formulaDerivation: {
                equation: "C₀ = (1.5 × L + 5) / (1 - Y)",
                stepByStep: [
                    `Numerator: 1.5 × ${totalLostTimeL} + 5 = ${(1.5 * totalLostTimeL + 5).toFixed(1)}`,
                    `Denominator: 1 - ${Y} = ${(1 - Y).toFixed(3)}`,
                    `Theoretical C₀: ${rawC0.toFixed(1)} seconds`,
                    `Bounded Optimal Cycle Time: ${optimumCycleC0} seconds`
                ]
            },
            parameters: {
                totalLostTimeSeconds: totalLostTimeL,
                saturationFlowPCUPerHour: saturationFlowS,
                flowNorthSouthVehPerHour: q1,
                flowEastWestVehPerHour: q2,
                ratio_y1_NS: y1,
                ratio_y2_EW: y2,
                sumCriticalFlowRatio_Y: Y,
                theoreticalCycleSeconds: Number(rawC0.toFixed(1)),
                optimumCycleSeconds: optimumCycleC0
            },
            websterParameters: {
                saturationFlow_s: {
                    northSouth: `${saturationFlowS} PCU/hr`,
                    eastWest: `${saturationFlowS} PCU/hr`,
                    standardReference: "IRC:93-1985 Design of Traffic Signals"
                },
                criticalFlowRates_q: {
                    northSouth: `${q1} PCU/hr (${Math.round(q1 / 60)} veh/min)`,
                    eastWest: `${q2} PCU/hr (${Math.round(q2 / 60)} veh/min)`
                },
                flowRatios_y: {
                    y_ns: y1,
                    y_ew: y2,
                    sum_Y: Y
                },
                lostTime_L: `${totalLostTimeL} seconds`
            },
            recommendedGreenPhases: {
                northSouthGreenSeconds: greenNS,
                eastWestGreenSeconds: greenEW,
                yellowClearanceSeconds: 4,
                allRedSafetySeconds: 2
            },
            recommendation: {
                optimalCycleTime: optimumCycleC0,
                recommendedNorthSouthGreen: greenNS,
                recommendedEastWestGreen: greenEW,
                yellowAmberTime: 4,
                allRedClearance: 2,
                expectedDelayReductionPct: Math.round(14 + Math.random() * 8)
            },
            academicReference: "Webster, F.V. (1958). Traffic Signal Settings. Road Research Technical Paper No. 39 & IRC:93-1985 Guidelines."
        });
    } catch (err) {
        console.error("Webster timing error:", err);
        res.status(500).json({ error: "Failed to compute Webster timing" });
    }
});

// 1C. Create New Junction (Admin)
router.post("/api/traffic/junctions", requireStaffRole, async (req, res) => {
    try {
        const { id, name, zone, landmark, latitude, longitude, mode, cycle_time, officer_name } = req.body;
        if (!id || !name || !latitude || !longitude) {
            return res.status(400).json({ error: "Missing required fields (id, name, latitude, longitude)" });
        }

        await pool.promise().query(
            `INSERT INTO traffic_junctions (id, name, zone, landmark, latitude, longitude, mode, cycle_time, assigned_officer_name)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, name, zone || 'Urban Core', landmark || '', latitude, longitude, mode || 'AI Adaptive', cycle_time || 120, officer_name || 'Unassigned']
        );

        // Create 4 default signals
        const approaches = ['North', 'South', 'East', 'West'];
        for (const app of approaches) {
            const sigId = `SIG-${id}-${app.toUpperCase()}`;
            await pool.promise().query(
                `INSERT INTO traffic_signals (id, junction_id, approach, street_name, green_time, yellow_time, red_time, current_color, countdown)
                 VALUES (?, ?, ?, ?, 45, 4, 71, 'Red', 45)`,
                [sigId, id, app, `${name} (${app} Approach)`]
            );
        }

        await trafficEngine.logAudit({
            userId: req.body.operator || 'ADMIN',
            userName: req.body.operator || 'Admin',
            role: 'Admin',
            action: 'CREATE_JUNCTION',
            target: name,
            details: `Created new junction ${id} with 4 directional signal heads at coordinates (${latitude}, ${longitude}).`
        });

        res.status(201).json({ success: true, message: `Junction ${name} created successfully.` });
    } catch (err) {
        console.error("Create junction error:", err);
        res.status(500).json({ error: "Failed to create junction" });
    }
});

// 1D. Edit Existing Junction (Staff / Admin)
router.put("/api/traffic/junctions/:id", requireStaffRole, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, zone, landmark, latitude, longitude, mode, cycle_time, assigned_officer_name, operator, role } = req.body;

        await pool.promise().query(
            `UPDATE traffic_junctions 
             SET name = COALESCE(?, name),
                 zone = COALESCE(?, zone),
                 landmark = COALESCE(?, landmark),
                 latitude = COALESCE(?, latitude),
                 longitude = COALESCE(?, longitude),
                 mode = COALESCE(?, mode),
                 cycle_time = COALESCE(?, cycle_time),
                 assigned_officer_name = COALESCE(?, assigned_officer_name)
             WHERE id = ?`,
            [name, zone, landmark, latitude, longitude, mode, cycle_time, assigned_officer_name, id]
        );

        await trafficEngine.logAudit({
            userId: operator || 'STAFF',
            userName: operator || 'Traffic Staff',
            role: role || 'Staff',
            action: 'UPDATE_JUNCTION',
            target: `Junction ${id}`,
            details: `Updated parameters for junction ${id} (${name || 'unchanged'}).`
        });

        res.json({ success: true, message: `Junction ${id} updated successfully.` });
    } catch (err) {
        console.error("Update junction error:", err);
        res.status(500).json({ error: "Failed to update junction" });
    }
});

// 1E. Delete Junction (Admin)
router.delete("/api/traffic/junctions/:id", requireStaffRole, async (req, res) => {
    try {
        const { id } = req.params;
        const { operator } = req.body || {};

        await pool.promise().query(`DELETE FROM traffic_junctions WHERE id = ?`, [id]);

        await trafficEngine.logAudit({
            userId: operator || 'ADMIN',
            userName: operator || 'Admin',
            role: 'Admin',
            action: 'DELETE_JUNCTION',
            target: `Junction ${id}`,
            details: `Deleted traffic junction ${id} and all cascaded signals/cameras.`
        });

        res.json({ success: true, message: `Junction ${id} deleted successfully.` });
    } catch (err) {
        console.error("Delete junction error:", err);
        res.status(500).json({ error: "Failed to delete junction" });
    }
});

// =========================================================
// 1F. TRAFFIC LIGHTS (SIGNALS) INDEPENDENT CRUD
// =========================================================

// Get all traffic lights with junction info
router.get("/api/traffic/signals", async (req, res) => {
    try {
        const [signals] = await pool.promise().query(
            `SELECT s.*, j.name as junction_name, j.zone, j.mode as junction_mode
             FROM traffic_signals s
             JOIN traffic_junctions j ON s.junction_id = j.id
             ORDER BY s.junction_id ASC, s.approach ASC`
        );
        res.json({ success: true, count: signals.length, signals });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch traffic signals" });
    }
});

// Add new traffic light with exact coordinates and type
router.post("/api/traffic/signals", requireStaffRole, async (req, res) => {
    try {
        const { junction_id, approach, street_name, latitude, longitude, signal_type, status, green_time, yellow_time, red_time, operator, role } = req.body;

        if (!junction_id || !approach) {
            return res.status(400).json({ error: "Junction ID and Approach are required." });
        }

        const signalId = `SIG-${junction_id}-${approach.toUpperCase()}-${Date.now().toString().slice(-4)}`;

        await pool.promise().query(
            `INSERT INTO traffic_signals 
             (id, junction_id, approach, street_name, latitude, longitude, signal_type, status, green_time, yellow_time, red_time, current_color, countdown)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Red', 45)`,
            [signalId, junction_id, approach, street_name || `${approach} Approach Light`, latitude || null, longitude || null, signal_type || 'Standard 3-Phase', status || 'Active', green_time || 45, yellow_time || 4, red_time || 70]
        );

        await trafficEngine.logAudit({
            userId: operator || 'STAFF',
            userName: operator || 'Traffic Staff',
            role: role || 'Staff',
            action: 'CREATE_TRAFFIC_LIGHT',
            target: signalId,
            details: `Installed new ${signal_type || 'Standard'} traffic light at Junction ${junction_id} (${approach} approach) at (${latitude}, ${longitude}).`
        });

        res.status(201).json({ success: true, message: "Traffic light added successfully.", signalId });
    } catch (err) {
        console.error("Create signal error:", err);
        res.status(500).json({ error: "Failed to create traffic light" });
    }
});

// Edit traffic light
router.put("/api/traffic/signals/:id", requireStaffRole, async (req, res) => {
    try {
        const { id } = req.params;
        const { street_name, latitude, longitude, signal_type, status, green_time, yellow_time, red_time, operator } = req.body;

        await pool.promise().query(
            `UPDATE traffic_signals 
             SET street_name = COALESCE(?, street_name),
                 latitude = COALESCE(?, latitude),
                 longitude = COALESCE(?, longitude),
                 signal_type = COALESCE(?, signal_type),
                 status = COALESCE(?, status),
                 green_time = COALESCE(?, green_time),
                 yellow_time = COALESCE(?, yellow_time),
                 red_time = COALESCE(?, red_time)
             WHERE id = ?`,
            [street_name, latitude, longitude, signal_type, status, green_time, yellow_time, red_time, id]
        );

        await trafficEngine.logAudit({
            userId: operator || 'STAFF',
            userName: operator || 'Traffic Staff',
            role: 'Staff',
            action: 'UPDATE_TRAFFIC_LIGHT',
            target: `Signal ${id}`,
            details: `Updated parameters for traffic light ${id}.`
        });

        res.json({ success: true, message: `Traffic light ${id} updated.` });
    } catch (err) {
        res.status(500).json({ error: "Failed to update traffic light" });
    }
});

// Dedicated Update Geographic Location of Traffic Light
router.put("/api/traffic/signals/:id/location", requireStaffRole, async (req, res) => {
    try {
        const { id } = req.params;
        const { latitude, longitude, operator, role } = req.body;

        if (latitude === undefined || longitude === undefined || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
            return res.status(400).json({ error: "Valid numeric latitude and longitude coordinates are required." });
        }

        const lat = Number(Number(latitude).toFixed(7));
        const lng = Number(Number(longitude).toFixed(7));

        const [existing] = await pool.promise().query("SELECT * FROM traffic_signals WHERE id = ?", [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: `Traffic light ${id} not found.` });
        }

        await pool.promise().query(
            "UPDATE traffic_signals SET latitude = ?, longitude = ?, updated_at = NOW() WHERE id = ?",
            [lat, lng, id]
        );

        const updatedSignal = { ...existing[0], latitude: lat, longitude: lng };

        await trafficEngine.logAudit({
            userId: operator || 'STAFF',
            userName: operator || 'Traffic Staff',
            role: role || 'Traffic Controller',
            action: 'MODIFY_TRAFFIC_LIGHT_LOCATION',
            target: `Signal ${id}`,
            details: `Relocated traffic light ${id} (${updatedSignal.street_name || updatedSignal.approach}) to coordinates (${lat}, ${lng}).`
        });

        // Broadcast to OpenLayers map & all active clients
        if (req.app.get("io")) {
            req.app.get("io").emit("traffic:signal_location_updated", {
                id,
                latitude: lat,
                longitude: lng,
                signal: updatedSignal
            });
        }

        res.json({
            success: true,
            message: `Traffic light ${id} location updated to (${lat}, ${lng}).`,
            signal: updatedSignal
        });
    } catch (err) {
        console.error("Update traffic light location error:", err);
        res.status(500).json({ error: "Failed to update traffic light location" });
    }
});

// Delete traffic light
router.delete("/api/traffic/signals/:id", requireStaffRole, async (req, res) => {
    try {
        const { id } = req.params;
        const { operator } = req.body || {};

        await pool.promise().query(`DELETE FROM traffic_signals WHERE id = ?`, [id]);

        await trafficEngine.logAudit({
            userId: operator || 'ADMIN',
            userName: operator || 'Admin',
            role: 'Admin',
            action: 'DELETE_TRAFFIC_LIGHT',
            target: `Signal ${id}`,
            details: `Decommissioned traffic light ${id}.`
        });

        res.json({ success: true, message: `Traffic light ${id} removed.` });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete traffic light" });
    }
});

// 1G. Configure Signal Timings for a Junction (Controller / Admin)
router.put("/api/traffic/junctions/:id/signals", requireStaffRole, async (req, res) => {
    try {
        const { id } = req.params;
        const { cycle_time, mode, signals, operator, role } = req.body;

        if (cycle_time || mode) {
            await pool.promise().query(
                `UPDATE traffic_junctions 
                 SET cycle_time = COALESCE(?, cycle_time), 
                     mode = COALESCE(?, mode) 
                 WHERE id = ?`,
                [cycle_time, mode, id]
            );
        }

        if (Array.isArray(signals)) {
            for (const sig of signals) {
                await pool.promise().query(
                    `UPDATE traffic_signals 
                     SET green_time = ?, yellow_time = ?, red_time = ?, pedestrian_walk = ? 
                     WHERE id = ? AND junction_id = ?`,
                    [sig.green_time, sig.yellow_time || 4, sig.red_time, sig.pedestrian_walk ? 1 : 0, sig.id, id]
                );
            }
        }

        await trafficEngine.logAudit({
            userId: operator || 'TR-CONTROLLER',
            userName: operator || 'Traffic Officer',
            role: role || 'Traffic Controller',
            action: 'SIGNAL_TIMING_MODIFIED',
            target: `Junction ${id}`,
            details: `Signal timings updated. Total Cycle: ${cycle_time || 'preserved'}s, Mode: ${mode || 'preserved'}.`
        });

        res.json({ success: true, message: "Signal configuration saved successfully." });
    } catch (err) {
        console.error("Update signal timing error:", err);
        res.status(500).json({ error: "Failed to update signal timings" });
    }
});

// 1E. Manual Signal Override (Controller / Admin / Emergency Radar)
const handleJunctionOverride = async (req, res) => {
    try {
        const { id } = req.params;
        const action = req.body.action || req.body.override_action;
        const { approach, reason, operator, role } = req.body;

        if (!action) {
            return res.status(400).json({ error: "Action is required (FORCE_GREEN, FORCE_RED, FLASH_AMBER, RESTORE_AUTO)" });
        }

        let details = "";

        if (action === "RESTORE_AUTO") {
            await pool.promise().query(
                `UPDATE traffic_junctions SET mode = 'AI Adaptive', status = 'Operational' WHERE id = ?`,
                [id]
            );
            await pool.promise().query(
                `UPDATE traffic_signals SET override_color = 'None' WHERE junction_id = ?`,
                [id]
            );
            details = "Manual override cleared; restored to AI Adaptive mode.";
        } else if (action === "FORCE_GREEN") {
            const targetApproach = approach || 'North';
            await pool.promise().query(
                `UPDATE traffic_junctions SET mode = 'Manual Override', status = 'Operational' WHERE id = ?`,
                [id]
            );
            await pool.promise().query(
                `UPDATE traffic_signals 
                 SET current_color = CASE WHEN approach = ? THEN 'Green' ELSE 'Red' END,
                     override_color = CASE WHEN approach = ? THEN 'Force Green' ELSE 'Force Red' END,
                     countdown = 120
                 WHERE junction_id = ?`,
                [targetApproach, targetApproach, id]
            );
            details = `Force GREEN applied on ${targetApproach} approach for 120s. Reason: ${reason || 'Congestion clearance'}.`;
        } else if (action === "FORCE_RED") {
            await pool.promise().query(
                `UPDATE traffic_junctions SET mode = 'Manual Override', status = 'Maintenance' WHERE id = ?`,
                [id]
            );
            await pool.promise().query(
                `UPDATE traffic_signals 
                 SET current_color = 'Red', override_color = 'Force Red', countdown = 999
                 WHERE junction_id = ?`,
                [id]
            );
            details = `All approaches locked to FORCE RED. Reason: ${reason || 'Police emergency stop'}.`;
        } else if (action === "FLASH_AMBER") {
            await pool.promise().query(
                `UPDATE traffic_junctions SET mode = 'Manual Override', status = 'Operational' WHERE id = ?`,
                [id]
            );
            await pool.promise().query(
                `UPDATE traffic_signals 
                 SET current_color = 'Yellow', override_color = 'Flash Amber', countdown = 0
                 WHERE junction_id = ?`,
                [id]
            );
            details = `Junction set to FLASHING AMBER caution mode. Reason: ${reason || 'Off-peak caution'}.`;
        }

        await trafficEngine.logAudit({
            userId: operator || 'TR-CONTROLLER',
            userName: operator || 'Traffic Officer',
            role: role || 'Traffic Controller',
            action: `MANUAL_OVERRIDE_${action}`,
            target: `Junction ${id}`,
            details
        });

        res.json({ success: true, message: details });
    } catch (err) {
        console.error("Manual override error:", err);
        res.status(500).json({ error: "Failed to apply manual override" });
    }
};
router.post("/api/traffic/junctions/:id/override", requireStaffRole, handleJunctionOverride);
router.put("/api/traffic/junctions/:id/override", requireStaffRole, handleJunctionOverride);

// =========================================================
// 2. CCTV CAMERAS & AI VISION
// =========================================================

// 2A. Get all cameras across city or for a specific junction
router.get("/api/traffic/cameras", async (req, res) => {
    try {
        const { junction_id } = req.query;
        let query = `
            SELECT c.*, j.name as junction_name, j.zone as junction_zone, j.latitude as junction_lat, j.longitude as junction_lng
            FROM traffic_cameras c
            JOIN traffic_junctions j ON c.junction_id = j.id
        `;
        const params = [];
        if (junction_id) {
            query += ` WHERE c.junction_id = ?`;
            params.push(junction_id);
        }
        query += ` ORDER BY j.name ASC, c.camera_name ASC`;

        const [cameras] = await pool.promise().query(query, params);
        res.json({ success: true, count: cameras.length, cameras });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch cameras" });
    }
});

// 2B. Get cameras for a specific junction
router.get("/api/traffic/junctions/:id/cameras", async (req, res) => {
    try {
        const { id } = req.params;
        const [cameras] = await pool.promise().query(
            `SELECT c.*, j.name as junction_name, j.zone as junction_zone 
             FROM traffic_cameras c
             JOIN traffic_junctions j ON c.junction_id = j.id
             WHERE c.junction_id = ? ORDER BY c.camera_name ASC`,
            [id]
        );
        res.json({ success: true, cameras });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch cameras" });
    }
});

// 2B-2. Test Camera Stream Connection & Detect Protocol
router.post("/api/traffic/cameras/test-connection", async (req, res) => {
    try {
        const { stream_url, source_type, playback_type } = req.body;
        if (!stream_url || !stream_url.trim()) {
            return res.status(400).json({ success: false, error: "Stream URL is required to test connection." });
        }

        const urlStr = stream_url.trim();
        let isLocalNetwork = false;
        let hostname = "";
        let port = "";
        let protocol = "";

        // Check if RTSP protocol
        if (urlStr.toLowerCase().startsWith("rtsp://")) {
            return res.json({
                success: true,
                reachable: false,
                detectedPlaybackType: "rtsp",
                isLocalNetwork: true,
                message: "RTSP protocol detected. Direct browser playback requires a media gateway (e.g. MediaMTX or FFmpeg) to transcode into WebRTC or HLS.",
                requiresMediaServer: true,
                status: "Unsupported"
            });
        }

        try {
            const parsed = new URL(urlStr);
            hostname = parsed.hostname;
            port = parsed.port;
            protocol = parsed.protocol;
            if (
                hostname === "localhost" ||
                hostname === "127.0.0.1" ||
                hostname.startsWith("192.168.") ||
                hostname.startsWith("10.") ||
                /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
            ) {
                isLocalNetwork = true;
            }
        } catch (err) {
            return res.status(400).json({ success: false, error: "Invalid URL format. Please enter a valid HTTP, HTTPS, or RTSP address." });
        }

        // Detect known stream formats from URL patterns
        let detected = playback_type && playback_type !== "auto" ? playback_type : "auto";
        let suggestedStreamUrl = null;
        const lower = urlStr.toLowerCase();

        if (lower.endsWith(".m3u8") || lower.includes("/hls/")) {
            detected = "hls";
        } else if (lower.endsWith(".mp4") || lower.endsWith(".webm")) {
            detected = "mp4";
        } else if (lower.includes("/video") || lower.endsWith(".mjpg") || lower.includes("mjpeg") || lower.includes("/mjpg/video.mjpg")) {
            detected = "mjpeg";
        } else if (lower.includes("webrtc") || lower.startsWith("webrtc://") || lower.includes(":8554")) {
            detected = "webrtc";
        } else if (port === "8080" || lower.includes(":8080")) {
            // Typical phone IP Webcam server
            if (lower.endsWith(":8080") || lower.endsWith(":8080/")) {
                detected = "camera_web_page";
                suggestedStreamUrl = urlStr.replace(/\/+$/, "") + "/video";
            }
        }

        // Probe connectivity via Node http/https
        let reachable = false;
        let statusCode = null;
        let contentType = null;
        let networkError = null;

        const httpModule = protocol === "https:" ? require("https") : require("http");
        try {
            const probeReq = await new Promise((resolve, reject) => {
                const reqObj = httpModule.request(urlStr, { method: "GET", timeout: 3000 }, (resp) => {
                    statusCode = resp.statusCode;
                    contentType = resp.headers["content-type"] || "";
                    resp.destroy(); // Got headers, don't stream full video to node process
                    resolve({ statusCode, contentType });
                });
                reqObj.on("timeout", () => {
                    reqObj.destroy();
                    reject(new Error("Connection timed out after 3s"));
                });
                reqObj.on("error", (e) => reject(e));
                reqObj.end();
            });

            reachable = (statusCode >= 200 && statusCode < 400);
            if (contentType.includes("multipart/x-mixed-replace") || contentType.includes("image/jpeg")) {
                detected = "mjpeg";
            } else if (contentType.includes("text/html")) {
                if (detected !== "mjpeg") detected = "camera_web_page";
            } else if (contentType.includes("application/vnd.apple.mpegurl") || contentType.includes("application/x-mpegurl")) {
                detected = "hls";
            } else if (contentType.includes("video/mp4")) {
                detected = "mp4";
            }
        } catch (probeErr) {
            networkError = probeErr.message;
        }

        return res.json({
            success: true,
            reachable,
            statusCode,
            contentType,
            detectedPlaybackType: detected,
            isLocalNetwork,
            suggestedStreamUrl,
            errorDetails: networkError,
            message: reachable
                ? `Camera stream reachable (HTTP ${statusCode}). Detected format: ${detected.toUpperCase()}.`
                : (isLocalNetwork 
                    ? "Local IP stream detected. If camera is running on your phone, verify your PC and phone are connected to the same Wi-Fi/LAN." 
                    : (networkError || "Stream endpoint unreachable.")),
            status: reachable ? "Online" : (isLocalNetwork ? "Configured — Not Verified" : "Unreachable")
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2C. Add new CCTV Camera (Real Database Operation + Complete Object Return)
router.post("/api/traffic/cameras", requireStaffRole, async (req, res) => {
    try {
        const { 
            junction_id, 
            camera_name, 
            direction, 
            stream_url, 
            resolution, 
            fps, 
            sensor_type, 
            source_type, 
            playback_type, 
            status, 
            operator, 
            role 
        } = req.body;

        if (!junction_id || !camera_name || !direction) {
            return res.status(400).json({ error: "Junction ID, Camera name, and Direction are required." });
        }

        // Verify junction exists
        const [jncRows] = await pool.promise().query("SELECT * FROM traffic_junctions WHERE id = ?", [junction_id]);
        if (jncRows.length === 0) {
            return res.status(404).json({ error: `Junction ${junction_id} not found.` });
        }

        const camId = `CAM-${junction_id}-${direction.substring(0, 1).toUpperCase()}-${Date.now().toString().slice(-4)}`;
        const finalStatus = status || (stream_url ? "Configured" : "Online");
        const finalSource = source_type || "phone_ip";
        const finalPlayback = playback_type || "auto";

        await pool.promise().query(
            `INSERT INTO traffic_cameras 
             (id, junction_id, camera_name, direction, stream_url, resolution, fps, status, is_simulated, sensor_type, source_type, playback_type, vehicles_per_min, avg_speed)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 35, 28.0)`,
            [
                camId, 
                junction_id, 
                camera_name.trim(), 
                direction, 
                stream_url ? stream_url.trim() : 'simulated_feed.mp4', 
                resolution || '1080p FHD', 
                fps || 30, 
                finalStatus, 
                sensor_type || 'AI Optical Vision + Radar Speed',
                finalSource,
                finalPlayback
            ]
        );

        // Fetch the full newly created camera object joined with junction details
        const [rows] = await pool.promise().query(
            `SELECT c.*, j.name as junction_name, j.zone as junction_zone, j.latitude as junction_lat, j.longitude as junction_lng
             FROM traffic_cameras c
             JOIN traffic_junctions j ON c.junction_id = j.id
             WHERE c.id = ?`,
            [camId]
        );

        const createdCamera = rows[0];

        await trafficEngine.logAudit({
            userId: operator || req.staffUser?.name || 'STAFF',
            userName: operator || req.staffUser?.name || 'Traffic Staff',
            role: role || req.staffUser?.role || 'Staff',
            action: 'ADD_CCTV_CAMERA',
            target: `${camId} (${camera_name})`,
            details: `Installed CCTV camera at Junction ${junction_id} (${direction} Approach). Source: ${finalSource}, Playback: ${finalPlayback}, Status: ${finalStatus}.`
        });

        // Broadcast to all active clients via Socket.IO
        if (req.app.get("io")) {
            req.app.get("io").emit("traffic:camera_added", createdCamera);
        }

        res.status(201).json({ 
            success: true, 
            message: `Camera "${camera_name}" registered and saved to database successfully.`, 
            cameraId: camId,
            camera: createdCamera
        });
    } catch (err) {
        console.error("Add camera error:", err);
        res.status(500).json({ error: "Failed to register camera in database: " + err.message });
    }
});

router.post("/api/traffic/junctions/:id/cameras", requireStaffRole, async (req, res) => {
    req.body.junction_id = req.params.id;
    const { junction_id, camera_name, direction, stream_url, resolution, fps, sensor_type, source_type, playback_type, status, operator, role } = req.body;

    const camId = `CAM-${junction_id}-${direction.substring(0, 1).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    await pool.promise().query(
        `INSERT INTO traffic_cameras 
         (id, junction_id, camera_name, direction, stream_url, resolution, fps, status, is_simulated, sensor_type, source_type, playback_type, vehicles_per_min, avg_speed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 35, 28.0)`,
        [
            camId, 
            junction_id, 
            camera_name.trim(), 
            direction, 
            stream_url ? stream_url.trim() : 'simulated_feed.mp4', 
            resolution || '1080p FHD', 
            fps || 30, 
            status || 'Configured', 
            sensor_type || 'AI Optical Vision + Radar Speed',
            source_type || 'phone_ip',
            playback_type || 'auto'
        ]
    );

    const [rows] = await pool.promise().query(
        `SELECT c.*, j.name as junction_name, j.zone as junction_zone 
         FROM traffic_cameras c JOIN traffic_junctions j ON c.junction_id = j.id WHERE c.id = ?`,
        [camId]
    );

    res.status(201).json({ success: true, message: `Camera ${camera_name} added successfully.`, cameraId: camId, camera: rows[0] });
});

// 2D. Edit CCTV Camera
router.put("/api/traffic/cameras/:id", requireStaffRole, async (req, res) => {
    try {
        const { id } = req.params;
        const { camera_name, direction, stream_url, resolution, fps, status, sensor_type, source_type, playback_type, operator } = req.body;

        await pool.promise().query(
            `UPDATE traffic_cameras 
             SET camera_name = COALESCE(?, camera_name),
                 direction = COALESCE(?, direction),
                 stream_url = COALESCE(?, stream_url),
                 resolution = COALESCE(?, resolution),
                 fps = COALESCE(?, fps),
                 status = COALESCE(?, status),
                 sensor_type = COALESCE(?, sensor_type),
                 source_type = COALESCE(?, source_type),
                 playback_type = COALESCE(?, playback_type)
             WHERE id = ?`,
            [camera_name, direction, stream_url, resolution, fps, status, sensor_type, source_type, playback_type, id]
        );

        const [rows] = await pool.promise().query(
            `SELECT c.*, j.name as junction_name, j.zone as junction_zone 
             FROM traffic_cameras c JOIN traffic_junctions j ON c.junction_id = j.id WHERE c.id = ?`,
            [id]
        );

        const updatedCamera = rows[0];

        await trafficEngine.logAudit({
            userId: operator || req.staffUser?.name || 'STAFF',
            userName: operator || req.staffUser?.name || 'Traffic Staff',
            role: req.staffUser?.role || 'Staff',
            action: 'UPDATE_CCTV_CAMERA',
            target: `Camera ${id}`,
            details: `Updated camera settings (${camera_name}). Status: ${status || 'preserved'}.`
        });

        if (req.app.get("io") && updatedCamera) {
            req.app.get("io").emit("traffic:camera_updated", updatedCamera);
        }

        res.json({ success: true, message: `Camera ${id} updated.`, camera: updatedCamera });
    } catch (err) {
        res.status(500).json({ error: "Failed to update camera: " + err.message });
    }
});

// 2E. Delete CCTV Camera
router.delete("/api/traffic/cameras/:id", requireStaffRole, async (req, res) => {
    try {
        const { id } = req.params;
        const { operator } = req.body || {};

        await pool.promise().query(`DELETE FROM traffic_cameras WHERE id = ?`, [id]);

        await trafficEngine.logAudit({
            userId: operator || req.staffUser?.name || 'STAFF',
            userName: operator || req.staffUser?.name || 'Traffic Staff',
            role: req.staffUser?.role || 'Staff',
            action: 'DELETE_CCTV_CAMERA',
            target: `Camera ${id}`,
            details: `Decommissioned camera unit ${id}.`
        });

        if (req.app.get("io")) {
            req.app.get("io").emit("traffic:camera_deleted", { id });
        }

        res.json({ success: true, message: `Camera ${id} deleted successfully.` });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete camera: " + err.message });
    }
});

// 2C. Get live AI vision telemetry & bounding boxes for a camera
router.get("/api/traffic/cameras/:id/telemetry", async (req, res) => {
    try {
        const { id } = req.params;
        const [cams] = await pool.promise().query(
            `SELECT c.*, j.name as junction_name 
             FROM traffic_cameras c
             JOIN traffic_junctions j ON c.junction_id = j.id
             WHERE c.id = ?`,
            [id]
        );

        if (cams.length === 0) {
            return res.status(404).json({ error: "Camera not found" });
        }

        const cam = cams[0];
        // Generate realistic simulated bounding boxes matching vehicle density
        const vehicleCount = cam.vehicles_per_min || 40;
        const boxesCount = Math.max(3, Math.min(9, Math.round(vehicleCount / 8)));
        const classes = ['Car', 'Two-Wheeler', 'Auto-Rickshaw', 'Bus', 'Commercial Truck'];
        const simulatedBoxes = [];

        for (let i = 0; i < boxesCount; i++) {
            const cls = classes[Math.floor(Math.random() * classes.length)];
            simulatedBoxes.push({
                id: `veh_${i + 1}`,
                label: cls,
                confidence: (0.78 + Math.random() * 0.19).toFixed(2),
                speedKmh: Math.round(cam.avg_speed + (Math.random() * 10 - 5)),
                bbox: {
                    x: Math.round(15 + Math.random() * 65),
                    y: Math.round(20 + Math.random() * 55),
                    w: Math.round(12 + Math.random() * 14),
                    h: Math.round(10 + Math.random() * 14)
                }
            });
        }

        res.json({
            success: true,
            camera: cam,
            telemetry: {
                streamType: "SIMULATED DEMO STREAM / AI EMULATION",
                vehicleDensity: cam.vehicles_per_min,
                averageSpeed: cam.avg_speed,
                queueSpillbackMeters: Math.round(cam.vehicles_per_min * 2.2),
                aiModel: "YOLOv8-Traffic-Urban-GKP (Synthetic Feed Inference)",
                fps: cam.fps,
                activeDetections: simulatedBoxes,
                congestionClassification: cam.vehicles_per_min > 65 ? "High Congestion" : cam.vehicles_per_min > 40 ? "Moderate Flow" : "Free Flow"
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch camera telemetry" });
    }
});

// 2C-1. Submit Live Traffic Feed Data from Camera (Staff / Vision Sensor Integration)
// Dynamically recalculates junction congestion directly from camera traffic data
router.post("/api/traffic/cameras/:id/traffic-feed", requireStaffRole, async (req, res) => {
    try {
        const { id } = req.params;
        const { vehicles_per_min, avg_speed, operator } = req.body;

        if (vehicles_per_min === undefined || isNaN(Number(vehicles_per_min))) {
            return res.status(400).json({ error: "Valid numeric vehicles_per_min count is required." });
        }

        const vehCount = Math.max(0, Math.min(200, Math.round(Number(vehicles_per_min))));
        const speedVal = avg_speed !== undefined ? Math.max(2, Math.min(80, Number(Number(avg_speed).toFixed(1)))) : 25.0;

        const [cams] = await pool.promise().query("SELECT * FROM traffic_cameras WHERE id = ?", [id]);
        if (cams.length === 0) {
            return res.status(404).json({ error: `Camera ${id} not found.` });
        }
        const cam = cams[0];

        await pool.promise().query(
            "UPDATE traffic_cameras SET vehicles_per_min = ?, avg_speed = ?, status = 'Online' WHERE id = ?",
            [vehCount, speedVal, id]
        );

        // Immediately recalculate junction congestion from all cameras at this junction
        const updatedJunctions = await trafficEngine.recalculateJunctionCongestionFromCameras(cam.junction_id);
        const jncUpdate = updatedJunctions.find(j => j.id === cam.junction_id);

        await trafficEngine.logAudit({
            userId: operator || req.staffUser?.name || 'STAFF',
            userName: operator || req.staffUser?.name || 'Traffic Staff',
            role: req.staffUser?.role || 'Traffic Staff',
            action: 'UPDATE_CAMERA_TRAFFIC_FEED',
            target: `Camera ${id}`,
            details: `Updated camera traffic data: ${vehCount} veh/min (${speedVal} km/h). Recalculated Junction ${cam.junction_id} congestion to ${jncUpdate ? jncUpdate.congestion_level : '--'}%.`
        });

        res.json({
            success: true,
            message: `Camera ${id} traffic feed updated. Junction ${cam.junction_id} congestion is now ${jncUpdate ? jncUpdate.congestion_level : '--'}%.`,
            camera: { id, vehicles_per_min: vehCount, avg_speed: speedVal },
            junctionUpdate: jncUpdate
        });
    } catch (err) {
        console.error("Camera traffic feed error:", err);
        res.status(500).json({ error: "Failed to update camera traffic feed" });
    }
});

// 2C-2. Get Camera-Aggregated Traffic Summary for a Junction
router.get("/api/traffic/junctions/:id/camera-traffic-summary", async (req, res) => {
    try {
        const { id } = req.params;
        const [cameras] = await pool.promise().query(
            "SELECT id, camera_name, direction, vehicles_per_min, avg_speed, status, sensor_type FROM traffic_cameras WHERE junction_id = ?",
            [id]
        );

        const [junctions] = await pool.promise().query(
            "SELECT id, name, congestion_level, avg_speed_kmh, status, mode FROM traffic_junctions WHERE id = ?",
            [id]
        );

        if (junctions.length === 0) {
            return res.status(404).json({ error: "Junction not found" });
        }

        const totalVeh = cameras.reduce((sum, c) => sum + (c.vehicles_per_min || 0), 0);
        const avgSpd = cameras.length > 0
            ? Number((cameras.reduce((sum, c) => sum + (Number(c.avg_speed) || 0), 0) / cameras.length).toFixed(1))
            : 0;

        res.json({
            success: true,
            junction: junctions[0],
            camera_count: cameras.length,
            total_vehicles_per_min: totalVeh,
            average_speed_kmh: avgSpd,
            cameras,
            methodology: "IRC:106-1990 Urban Road Capacity & Sensor Aggregation"
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch camera traffic summary" });
    }
});

// =========================================================
// 2D. TRAFFIC VIOLATIONS & CHALLAN REFERRAL SYSTEM
// =========================================================

// Citizen Vehicle e-Challan Search by Number Plate (UP-53-XX-0000)
router.get("/api/traffic/violations/search", async (req, res) => {
    try {
        const { plate } = req.query;
        if (!plate || !plate.trim()) {
            return res.status(400).json({ error: "Vehicle registration plate is required." });
        }

        const normalizedPlate = plate.replace(/[-\s]/g, '').toUpperCase();
        const [violations] = await pool.promise().query(
            `SELECT v.*, j.name as junction_name, j.landmark as junction_landmark, c.camera_name 
             FROM traffic_violations v
             JOIN traffic_junctions j ON v.junction_id = j.id
             LEFT JOIN traffic_cameras c ON v.camera_id = c.id
             WHERE UPPER(REPLACE(REPLACE(v.vehicle_number, '-', ''), ' ', '')) LIKE ?
             ORDER BY v.timestamp DESC`,
            [`%${normalizedPlate}%`]
        );

        res.json({
            success: true,
            searchedPlate: plate.trim().toUpperCase(),
            count: violations.length,
            violations
        });
    } catch (err) {
        console.error("Search violations error:", err);
        res.status(500).json({ error: "Failed to search violations by plate" });
    }
});

// Citizen e-Challan Settlement / Simulated UPI Payment
router.post("/api/traffic/violations/:id/pay", async (req, res) => {
    try {
        const { id } = req.params;
        const { payment_method, transaction_ref, paid_by } = req.body;

        const [existing] = await pool.promise().query(
            `SELECT * FROM traffic_violations WHERE id = ?`,
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: "Violation record / Challan not found." });
        }

        if (existing[0].status === 'PAID_SETTLED') {
            return res.status(400).json({ error: "This e-challan has already been paid and settled." });
        }

        const txnId = transaction_ref || `UPI-GKP-${Date.now().toString().slice(-6)}`;
        const receiptNo = `GKP-E-REC-${Date.now().toString().slice(-5)}`;

        await pool.promise().query(
            `UPDATE traffic_violations 
             SET status = 'PAID_SETTLED', 
                 notes = CONCAT(COALESCE(notes, ''), ' | Paid via ', ?, ' Txn: ', ?, ' Rec: ', ?),
                 reviewed_at = NOW() 
             WHERE id = ?`,
            [payment_method || 'UPI', txnId, receiptNo, id]
        );

        await trafficEngine.logAudit({
            userId: paid_by || 'CITIZEN',
            userName: paid_by || 'Citizen User',
            role: 'Citizen',
            action: 'PAY_TRAFFIC_CHALLAN',
            target: `Challan ${id}`,
            details: `Online fine settlement of ₹${existing[0].fine_amount} completed via ${payment_method || 'UPI Gateway'}. Receipt: ${receiptNo}, Txn: ${txnId}`
        });

        res.json({
            success: true,
            message: `Challan ${id} settled successfully. Legal compliance updated.`,
            receipt: {
                receiptNo,
                transactionId: txnId,
                violationId: id,
                vehicleNumber: existing[0].vehicle_number,
                fineAmount: existing[0].fine_amount,
                paidAt: new Date().toISOString(),
                paymentMethod: payment_method || 'UPI (SmartCity Payment Gateway)'
            }
        });
    } catch (err) {
        console.error("Pay challan error:", err);
        res.status(500).json({ error: "Failed to process challan payment." });
    }
});

// Get all violations
router.get("/api/traffic/violations", async (req, res) => {
    try {
        const { status, junction_id } = req.query;
        let query = `
            SELECT v.*, j.name as junction_name, c.camera_name 
            FROM traffic_violations v
            JOIN traffic_junctions j ON v.junction_id = j.id
            LEFT JOIN traffic_cameras c ON v.camera_id = c.id
        `;
        const params = [];
        const conditions = [];

        if (status) {
            conditions.push(`v.status = ?`);
            params.push(status);
        }
        if (junction_id) {
            conditions.push(`v.junction_id = ?`);
            params.push(junction_id);
        }

        if (conditions.length > 0) {
            query += ` WHERE ` + conditions.join(" AND ");
        }

        query += ` ORDER BY v.timestamp DESC`;

        const [violations] = await pool.promise().query(query, params);

        // Check if caller is authorized staff/admin
        let isStaff = false;
        const authHeader = req.headers["authorization"] || req.headers["x-access-token"];
        if (authHeader) {
            const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader;
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                const role = ((decoded && (decoded.role || decoded.type)) || "").toLowerCase();
                isStaff = ["admin", "staff", "traffic", "police", "controller"].some(k => role.includes(k));
            } catch (e) {}
        }

        const sanitizedViolations = violations.map(v => {
            if (isStaff) return v;
            return {
                ...v,
                vehicle_number: v.vehicle_number ? v.vehicle_number.slice(0, 4) + "-**-****" : "UP-53-**-****"
            };
        });

        res.json({
            success: true,
            count: sanitizedViolations.length,
            isStaffView: isStaff,
            disclaimer: "Demo / Simulated AI Detection - Verified cases can be referred to Traffic Police Challan Wing.",
            violations: sanitizedViolations
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch traffic violations" });
    }
});

// 2E. ANPR Optical Evidence Snapshot Inspector
router.get("/api/traffic/violations/:id/evidence", async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.promise().query(
            `SELECT v.*, j.name as junction_name, j.landmark as junction_landmark, j.latitude, j.longitude,
                    c.camera_name, c.resolution, c.fps
             FROM traffic_violations v
             JOIN traffic_junctions j ON v.junction_id = j.id
             LEFT JOIN traffic_cameras c ON v.camera_id = c.id
             WHERE v.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "Violation not found" });
        }

        const v = rows[0];
        const isSpeed = v.violation_type.includes("Speed");
        const isRedLight = v.violation_type.includes("Red Light");
        const speedVal = v.speed_kmh || (isSpeed ? 76.8 : 34.2);
        const speedLimit = 40;

        let isStaff = false;
        const authHeader = req.headers["authorization"] || req.headers["x-access-token"];
        if (authHeader) {
            const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader;
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                const role = ((decoded && (decoded.role || decoded.type)) || "").toLowerCase();
                isStaff = ["admin", "staff", "traffic", "police", "controller"].some(k => role.includes(k));
            } catch (e) {}
        }

        const evidenceData = {
            success: true,
            violationId: v.id,
            vehicleNumber: isStaff ? v.vehicle_number : (v.vehicle_number ? v.vehicle_number.slice(0, 4) + "-**-****" : "UP-53-**-****"),
            vehicleType: v.vehicle_type || 'Motorcycle / Car',
            violationType: v.violation_type,
            fineAmount: v.fine_amount,
            status: v.status,
            timestamp: v.timestamp,
            location: {
                junctionId: v.junction_id,
                junctionName: v.junction_name,
                landmark: v.junction_landmark,
                latitude: v.latitude,
                longitude: v.longitude
            },
            opticalSensor: {
                cameraName: v.camera_name || "ANPR Optical Sentinel-01",
                model: "Sony Starvis IMX485 4K Ultra-Low-Light ITS Sensor",
                resolution: v.resolution || "4K Ultra-HD (3840x2160)",
                fps: v.fps || 30,
                infraredNightVision: "Active (Dual 850nm Strobe)",
                sensorGps: { lat: v.latitude, lng: v.longitude },
                junctionName: v.junction_name,
                landmark: v.junction_landmark || "Gorakhpur City Crossing"
            },
            anprMetadata: {
                ocrReadout: v.vehicle_number,
                ocrConfidence: `${(Number(v.confidence_score || 0.984) * 100).toFixed(1)}%`,
                detectedVehicleClass: v.vehicle_type || "Light Motor Vehicle (Four Wheeler / Sedan)",
                licensePlateType: "High Security Registration Plate (HSRP Ind-Embossed)",
                cameraSensorModel: "Sony Starvis IMX485 4K Ultra-Low-Light ITS",
                opticalLensSpecs: "50mm Fixed ITS Telephoto F/1.4",
                shutterSpeed: "1/1200s anti-motion blur",
                ambientLuxLevel: "1420 Lux (Daylight Arterial)"
            },
            anprOcrTelemetry: {
                detectedPlate: v.vehicle_number,
                ocrConfidence: `${(Number(v.confidence_score || 0.984) * 100).toFixed(1)}%`,
                boundingCoordinates: { top: "54%", left: "42%", width: "24%", height: "16%" },
                plateState: "Uttar Pradesh (Gorakhpur RTO - UP53)",
                plateClass: "High Security Registration Plate (HSRP Ind-Embossed)"
            },
            telemetry: {
                radarObservedSpeedKmh: `${speedVal} km/h`,
                radarSpeedLimitKmh: `${speedLimit} km/h`,
                speedExcessDelta: isSpeed ? `+${(speedVal - speedLimit).toFixed(1)} km/h` : "Within Limit",
                signalPhaseAtBreach: isRedLight ? "RED (+3.42s into Stop Phase)" : "N/A",
                stopLineCrossedMeters: isRedLight ? "2.6 meters past white stop threshold" : "N/A"
            },
            violationTimeline: {
                signalPhaseAtTrigger: "RED",
                redLightElapsedSeconds: "3.4s after red transition",
                measuredSpeedKmh: `${speedVal} km/h`,
                speedLimitKmh: "40.0 km/h",
                inductiveStopBarCrossed: true
            },
            virtualCourtNotice: {
                noticeNumber: `VC-GKP-2026-${v.id.replace('VIO-', '')}`,
                statutorySection: isSpeed ? "Section 112 / 183 MV Act (Over-speeding)" : (isRedLight ? "Section 119 / 177 MV Act (Traffic Signal Non-compliance)" : "Section 129 / 194D MV Act (Safety Violation)"),
                issuingCourt: "Gorakhpur Virtual Traffic Court & Judicial Magistrate (Civil Lines)",
                policeStationJurisdiction: `Gorakhpur Traffic Police Division (${v.junction_name})`,
                eChallanReceiptUrl: `https://traffic.gorakhpur.up.gov.in/challan/view/${v.id}`,
                qrVerificationPayload: `UPPOLICE-GKP-ECHALLAN-${v.id}-PLATE-${v.vehicle_number}-AMT-${v.fine_amount}`
            },
            legalNotice: {
                virtualCourtNoticeId: `UP-VC-GKP-${v.id.replace('VIO-', '')}`,
                mvActSection: isSpeed ? "Section 112 / 183 MV Act (Exceeding Prescribed Speed)" : (isRedLight ? "Section 119 / 177 MV Act (Disobeying Traffic Signal / Line)" : "Section 184 MV Act (Dangerous Driving)"),
                issuingAuthority: "Gorakhpur Traffic Police & Transport Department, Uttar Pradesh",
                disclaimer: "Simulated Automated Number Plate Recognition (ANPR) Evidence Frame for SmartCity AI Evaluation."
            }
        };

        res.json(evidenceData);
    } catch (err) {
        console.error("Evidence error:", err);
        res.status(500).json({ error: "Failed to fetch ANPR optical evidence" });
    }
});

// Flag new violation (AI or Staff)
router.post("/api/traffic/violations", requireStaffRole, async (req, res) => {
    try {
        const { junction_id, camera_id, violation_type, vehicle_number, vehicle_type, speed_kmh, fine_amount, notes } = req.body;

        if (!junction_id || !violation_type) {
            return res.status(400).json({ error: "Junction ID and Violation Type are required." });
        }

        const vioId = `VIO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

        await pool.promise().query(
            `INSERT INTO traffic_violations 
             (id, junction_id, camera_id, violation_type, vehicle_number, vehicle_type, speed_kmh, confidence_score, status, fine_amount, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0.94, 'AI_FLAGGED', ?, ?)`,
            [vioId, junction_id, camera_id || null, violation_type, vehicle_number || 'UP-53-XX-0000', vehicle_type || 'Two-Wheeler', speed_kmh || null, fine_amount || 1000.00, notes || 'AI Optical Sensor Flagged']
        );

        res.status(201).json({ success: true, message: "Violation flagged for review.", violationId: vioId });
    } catch (err) {
        res.status(500).json({ error: "Failed to flag violation" });
    }
});

// Review violation: Verify & refer to challan system OR dismiss
router.put("/api/traffic/violations/:id/review", requireStaffRole, async (req, res) => {
    try {
        const { id } = req.params;
        const { action, notes, operator, role } = req.body;

        const newStatus = action === 'VERIFY' ? 'VERIFIED_CHALLAN_REFERRED' : 'DISMISSED';

        await pool.promise().query(
            `UPDATE traffic_violations 
             SET status = ?, reviewed_by = ?, notes = COALESCE(?, notes), reviewed_at = NOW() 
             WHERE id = ?`,
            [newStatus, operator || 'Traffic Officer', notes, id]
        );

        await trafficEngine.logAudit({
            userId: operator || 'STAFF',
            userName: operator || 'Traffic Staff',
            role: role || 'Staff',
            action: action === 'VERIFY' ? 'VERIFY_VIOLATION_CHALLAN' : 'DISMISS_VIOLATION',
            target: `Violation ${id}`,
            details: `Violation ${id} marked as ${newStatus}. Notes: ${notes || 'Reviewed'}`
        });

        res.json({
            success: true,
            message: action === 'VERIFY' 
                ? `Violation ${id} verified and referred to Gorakhpur Traffic Police Challan wing.`
                : `Violation ${id} dismissed as false positive.`
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to review violation" });
    }
});

// =========================================================
// 3. TRAFFIC MOVEMENT RULES
// =========================================================

router.get("/api/traffic/movement-rules", async (req, res) => {
    try {
        const [rules] = await pool.promise().query(
            `SELECT r.*, j.name as junction_name 
             FROM traffic_movement_rules r
             JOIN traffic_junctions j ON r.junction_id = j.id
             ORDER BY r.is_active DESC, r.created_at DESC`
        );
        res.json({ success: true, rules });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch movement rules" });
    }
});

router.post("/api/traffic/movement-rules", requireStaffRole, async (req, res) => {
    try {
        const { junction_id, rule_type, title, description, start_time, end_time, penalty_amount, operator } = req.body;
        const ruleId = `RULE-${Date.now().toString().slice(-4)}`;

        await pool.promise().query(
            `INSERT INTO traffic_movement_rules (id, junction_id, rule_type, title, description, start_time, end_time, is_active, penalty_amount)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
            [ruleId, junction_id, rule_type, title, description, start_time || '08:00', end_time || '20:00', penalty_amount || 1000]
        );

        await trafficEngine.logAudit({
            userId: operator || 'CONTROLLER',
            userName: operator || 'Traffic Officer',
            role: 'Traffic Controller',
            action: 'CREATE_MOVEMENT_RULE',
            target: title,
            details: `Enacted new ${rule_type} rule for Junction ${junction_id}. Timings: ${start_time} to ${end_time}. Fine: Rs. ${penalty_amount}`
        });

        res.status(201).json({ success: true, message: `Rule "${title}" enacted successfully.`, ruleId });
    } catch (err) {
        res.status(500).json({ error: "Failed to create movement rule" });
    }
});

router.put("/api/traffic/movement-rules/:id/toggle", requireStaffRole, async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active, operator } = req.body;

        await pool.promise().query(
            `UPDATE traffic_movement_rules SET is_active = ? WHERE id = ?`,
            [is_active ? 1 : 0, id]
        );

        await trafficEngine.logAudit({
            userId: operator || 'CONTROLLER',
            userName: operator || 'Traffic Officer',
            role: 'Traffic Controller',
            action: is_active ? 'ENABLE_MOVEMENT_RULE' : 'SUSPEND_MOVEMENT_RULE',
            target: `Rule ${id}`,
            details: `Rule status toggled to ${is_active ? 'ACTIVE' : 'SUSPENDED'}`
        });

        res.json({ success: true, message: `Rule status updated.` });
    } catch (err) {
        res.status(500).json({ error: "Failed to toggle rule" });
    }
});

// =========================================================
// 4. INCIDENT REPORTING & MANAGEMENT
// =========================================================

router.get("/api/traffic/incidents", async (req, res) => {
    try {
        const { status } = req.query;
        let query = `SELECT * FROM traffic_incidents`;
        const params = [];

        if (status) {
            query += ` WHERE status = ?`;
            params.push(status);
        }
        query += ` ORDER BY reported_at DESC`;

        const [incidents] = await pool.promise().query(query, params);
        res.json({ success: true, incidents });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch incidents" });
    }
});

router.post("/api/traffic/incidents", async (req, res) => {
    try {
        const { reporter_name, reporter_phone, junction_id, incident_type, location_name, latitude, longitude, description, severity, citizen_id } = req.body;

        if (!incident_type || !location_name || !latitude || !longitude || !description) {
            return res.status(400).json({ error: "Required fields missing for incident report." });
        }

        const incidentId = `INC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

        await pool.promise().query(
            `INSERT INTO traffic_incidents 
             (id, citizen_id, reporter_name, reporter_phone, junction_id, incident_type, location_name, latitude, longitude, description, severity, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted')`,
            [incidentId, citizen_id || null, reporter_name || 'Anonymous Citizen', reporter_phone || null, junction_id || null, incident_type, location_name, latitude, longitude, description, severity || 'Moderate']
        );

        // Notify socket clients
        if (req.app.get("io")) {
            req.app.get("io").emit("traffic:incident_reported", {
                id: incidentId,
                incident_type,
                location_name,
                severity: severity || 'Moderate',
                latitude,
                longitude,
                timestamp: new Date().toISOString()
            });
        }

        res.status(201).json({
            success: true,
            message: "Traffic incident submitted to Traffic Control Command Center.",
            incidentId
        });
    } catch (err) {
        console.error("Submit incident error:", err);
        res.status(500).json({ error: "Failed to submit incident" });
    }
});

router.put("/api/traffic/incidents/:id/status", requireStaffRole, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, assigned_officer, resolution_notes, operator, role } = req.body;

        const resolvedAt = status === 'Resolved' ? new Date() : null;

        await pool.promise().query(
            `UPDATE traffic_incidents 
             SET status = ?, 
                 assigned_officer = COALESCE(?, assigned_officer), 
                 resolution_notes = COALESCE(?, resolution_notes),
                 resolved_at = CASE WHEN ? = 'Resolved' THEN NOW() ELSE resolved_at END
             WHERE id = ?`,
            [status, assigned_officer, resolution_notes, status, id]
        );

        await trafficEngine.logAudit({
            userId: operator || 'CONTROLLER',
            userName: operator || 'Traffic Officer',
            role: role || 'Traffic Controller',
            action: 'UPDATE_INCIDENT_STATUS',
            target: `Incident ${id}`,
            details: `Incident marked as ${status}. Assigned to: ${assigned_officer || 'Existing'}. Notes: ${resolution_notes || 'None'}`
        });

        res.json({ success: true, message: `Incident ${id} updated to ${status}.` });
    } catch (err) {
        res.status(500).json({ error: "Failed to update incident status" });
    }
});

// Delete traffic incident (Staff/Admin)
router.delete("/api/traffic/incidents/:id", requireStaffRole, async (req, res) => {
    try {
        const { id } = req.params;
        const { operator } = req.body || {};

        await pool.promise().query("DELETE FROM traffic_incidents WHERE id = ?", [id]);

        await trafficEngine.logAudit({
            userId: operator || req.staffUser?.name || 'STAFF',
            userName: operator || req.staffUser?.name || 'Traffic Staff',
            role: req.staffUser?.role || 'Traffic Controller',
            action: 'DELETE_TRAFFIC_INCIDENT',
            target: `Incident ${id}`,
            details: `Deleted traffic incident ${id}.`
        });

        if (req.app.get("io")) {
            req.app.get("io").emit("traffic:incident_deleted", { id });
        }

        res.json({ success: true, message: `Incident ${id} deleted successfully.` });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete incident: " + err.message });
    }
});


// =========================================================
// 5. EMERGENCY GREEN CORRIDORS
// =========================================================

router.get("/api/traffic/corridors", async (req, res) => {
    try {
        const [corridors] = await pool.promise().query(
            `SELECT * FROM traffic_corridors ORDER BY status = 'Active' DESC, id ASC`
        );
        res.json({ success: true, corridors });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch corridors" });
    }
});

router.post("/api/traffic/corridors/dispatch", requireStaffRole, async (req, res) => {
    try {
        const { corridor_id, operator, role } = req.body;
        if (!corridor_id) {
            return res.status(400).json({ error: "Corridor ID is required." });
        }

        const result = await trafficEngine.dispatchEmergencyCorridor(corridor_id, operator, role);
        res.json({
            success: true,
            message: `Emergency Green Corridor "${result.name}" ACTIVATED. Signals preempted.`,
            data: result
        });
    } catch (err) {
        console.error("Dispatch corridor error:", err);
        res.status(500).json({ error: err.message || "Failed to dispatch corridor" });
    }
});

router.post("/api/traffic/corridors/:id/deactivate", requireStaffRole, async (req, res) => {
    try {
        const { id } = req.params;
        const { operator, role } = req.body;

        await trafficEngine.deactivateEmergencyCorridor(id, operator, role);
        res.json({
            success: true,
            message: `Emergency Corridor deactivated. Normal signal cycles restored.`
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to deactivate corridor" });
    }
});

// =========================================================
// 6. ALTERNATIVE ROUTES & CONGESTION AVOIDANCE
// =========================================================

router.get("/api/traffic/alternative-routes", async (req, res) => {
    try {
        const { from, to } = req.query;

        // Realistic Gorakhpur route planner with congestion-aware alternatives
        const origin = from || "Gorakhpur Junction Railway Station";
        const destination = to || "AIIMS Gorakhpur";

        // Simulated route calculation with live bottleneck avoidance
        const standardRoute = {
            id: "route_standard",
            name: "Direct Arterial (Via Mohaddipur & Deoria Road)",
            distanceKm: 9.2,
            standardEtaMin: 22,
            currentEtaMin: 34,
            trafficPenaltyMin: 12,
            congestionIndex: "High Congestion (Mohaddipur Bottleneck)",
            chokepoints: ["Mohaddipur Flyover Descent", "University Main Crossing"],
            coordinates: [
                [83.3670, 26.7645], // Dharamshala
                [83.3731, 26.7588], // Golghar
                [83.3820, 26.7570], // Shastri Chowk
                [83.3980, 26.7535], // Mohaddipur
                [83.4250, 26.7410], // Ranidiha
                [83.4475, 26.7329]  // AIIMS
            ],
            color: "#ef4444"
        };

        const alternativeRoute = {
            id: "route_smart_bypass",
            name: "AI Smart Bypass (Via Ramgarh Taal & Ring Road)",
            distanceKm: 11.4,
            standardEtaMin: 24,
            currentEtaMin: 25,
            trafficPenaltyMin: 1,
            congestionIndex: "Free Flow (Bypasses Mohaddipur Jam)",
            timeSavedMin: 9,
            chokepoints: [],
            coordinates: [
                [83.3670, 26.7645], // Dharamshala
                [83.3700, 26.7510], // Rustampur
                [83.3881, 26.7503], // Ramgarh Taal Lake View Road
                [83.4150, 26.7380], // Nausarh Ring Link
                [83.4475, 26.7329]  // AIIMS
            ],
            color: "#10b981",
            recommended: true
        };

        // Query nearest open parking lot from existing database table
        let recommendedParking = null;
        try {
            const [lots] = await pool.promise().query(
                `SELECT id, parking_code as parking_id, name, address, area as zone, total_slots, available_slots, hourly_rate, latitude, longitude 
                 FROM parking_lots 
                 WHERE UPPER(status) = 'OPEN' AND available_slots > 0 
                 ORDER BY available_slots DESC 
                 LIMIT 1`
            );
            if (lots.length > 0) {
                recommendedParking = lots[0];
            }
        } catch (e) {
            console.warn("Parking lots query in route planner:", e.message);
        }

        if (!recommendedParking) {
            recommendedParking = {
                parking_id: "PKG-001",
                name: "Golghar Smart Multi-Level Parking",
                address: "Golghar Commercial Center, Gorakhpur",
                available_slots: 42,
                total_slots: 150,
                hourly_rate: 20.00,
                latitude: 26.7585,
                longitude: 83.3735
            };
        }

        // Park & Walk End-to-End Route: Drive to parking hub, then walk to destination
        const parkAndWalkRoute = {
            id: "route_park_walk",
            name: `Park & Walk (${recommendedParking.name})`,
            parkingLot: {
                name: recommendedParking.name,
                availableSlots: recommendedParking.available_slots,
                ratePerHour: `₹${recommendedParking.hourly_rate || 20}/hr`,
                location: [recommendedParking.longitude || 83.3735, recommendedParking.latitude || 26.7585]
            },
            drivingDistanceKm: 7.8,
            drivingEtaMin: 18,
            walkingDistanceM: 280,
            walkingEtaMin: 4,
            totalTravelEtaMin: 22,
            timeSavedMin: 12,
            sustainabilitySavings: {
                fuelSavedLitres: 0.45,
                co2SavedKg: 1.08
            },
            driveCoordinates: [
                [83.3670, 26.7645], // Origin
                [83.3710, 26.7610],
                [recommendedParking.longitude || 83.3735, recommendedParking.latitude || 26.7585] // Parking lot
            ],
            walkCoordinates: [
                [recommendedParking.longitude || 83.3735, recommendedParking.latitude || 26.7585],
                [83.3750, 26.7578],
                [83.3765, 26.7570] // Nearby pedestrian destination
            ],
            color: "#3b82f6"
        };

        // Departure Time Predictor (Dynamic estimates based on Gorakhpur rush hour curve)
        const departurePredictions = [
            { label: "Leave Now", etaMin: 25, delayMin: 0, status: "Normal Flow", badge: "Live Now" },
            { label: "Leave in +15 mins", etaMin: 29, delayMin: 4, status: "Peak Flow Rising", badge: "+4m delay" },
            { label: "Leave in +30 mins", etaMin: 24, delayMin: -1, status: "Flow Moderating", badge: "Best Window" },
            { label: "Leave in +45 mins", etaMin: 21, delayMin: -4, status: "Free Flowing", badge: "Save 4 mins" }
        ];

        // Gorakhpur Sustainability Impact Counters
        const sustainabilitySummary = {
            monthlyFuelSavedLitres: 1420,
            monthlyCo2ReductionTons: 3.12,
            reducedVehicleIdlingHours: 890,
            activeEcoRouteUsers: 6400
        };

        res.json({
            success: true,
            origin,
            destination,
            routes: [alternativeRoute, standardRoute],
            parkAndWalkRoute,
            departurePredictions,
            sustainabilitySummary,
            aiAdvice: "Mohaddipur corridor experiencing heavy 82% vehicle saturation. The Ramgarh Taal bypass saves approximately 9 minutes. For shopping or visits near Golghar, use 'Park & Walk' to save 12 mins and reserve guaranteed parking."
        });
    } catch (err) {
        console.error("Alternative routes error:", err);
        res.status(500).json({ error: "Failed to generate alternative routes" });
    }
});

// =========================================================
// 7. SMART PARKING INTEGRATION (CONNECTED REAL SPOT COUNTS)
// =========================================================

router.get("/api/traffic/parking-lots", async (req, res) => {
    try {
        const [lots] = await pool.promise().query(
            `SELECT pl.id, pl.parking_code, pl.name, pl.address, pl.area, pl.latitude, pl.longitude,
                    pl.hourly_rate, pl.status, pl.vehicle_types,
                    COUNT(ps.id) as total_spots,
                    SUM(CASE WHEN LOWER(ps.status) = 'available' THEN 1 ELSE 0 END) as available_spots,
                    SUM(CASE WHEN LOWER(ps.status) IN ('occupied', 'booked') THEN 1 ELSE 0 END) as occupied_spots
             FROM parking_lots pl
             LEFT JOIN parking_slots ps ON ps.lot_id = pl.parking_code
             WHERE pl.active = 1
             GROUP BY pl.id
             ORDER BY pl.id ASC`
        );

        const summary = {
            totalFacilities: lots.length,
            totalCitySpots: lots.reduce((acc, l) => acc + Number(l.total_spots || 0), 0),
            availableCitySpots: lots.reduce((acc, l) => acc + Number(l.available_spots || 0), 0),
            occupiedCitySpots: lots.reduce((acc, l) => acc + Number(l.occupied_spots || 0), 0)
        };

        res.json({
            success: true,
            summary,
            lots: lots.map(l => ({
                id: l.id,
                parking_code: l.parking_code,
                name: l.name,
                address: l.address,
                area: l.area,
                latitude: Number(l.latitude),
                longitude: Number(l.longitude),
                hourlyRate: Number(l.hourly_rate),
                status: l.status,
                vehicleTypes: l.vehicle_types,
                totalSpots: Number(l.total_spots),
                availableSpots: Number(l.available_spots),
                occupiedSpots: Number(l.occupied_spots),
                occupancyRatePercent: Number(l.total_spots) > 0 ? Math.round((Number(l.occupied_spots) / Number(l.total_spots)) * 100) : 0
            }))
        });
    } catch (err) {
        console.error("Fetch connected parking error:", err);
        res.status(500).json({ error: "Failed to fetch connected parking data" });
    }
});

// =========================================================
// 8. AI INSIGHTS & AUTOMATED RECOMMENDATIONS
// =========================================================

router.get("/api/traffic/ai-insights", async (req, res) => {
    try {
        const [junctions] = await pool.promise().query(
            `SELECT j.*, 
                    (SELECT AVG(vehicles_per_min) FROM traffic_cameras WHERE junction_id = j.id) as avg_veh,
                    (SELECT AVG(avg_speed) FROM traffic_cameras WHERE junction_id = j.id) as avg_spd
             FROM traffic_junctions j`
        );

        const recommendations = [];

        for (const j of junctions) {
            if (j.congestion_level >= 70) {
                recommendations.push({
                    id: `REC-${j.id}-01`,
                    junctionId: j.id,
                    junctionName: j.name,
                    type: "PHASE_EXTENSION",
                    severity: "High",
                    title: `Queue Spillback Mitigation at ${j.name}`,
                    description: `Vehicle density reached ${Math.round(j.avg_veh || 75)} veh/min with slow flow (${j.avg_speed_kmh} km/h). Recommend extending North-South Green phase by +15 seconds to clear upstream corridor.`,
                    action: "EXTEND_GREEN",
                    suggestedAdjustment: { approach: "North-South", extraSeconds: 15 },
                    confidence: "94%"
                });
            } else if (j.congestion_level <= 35 && j.cycle_time > 110) {
                recommendations.push({
                    id: `REC-${j.id}-02`,
                    junctionId: j.id,
                    junctionName: j.name,
                    type: "CYCLE_COMPRESSION",
                    severity: "Low",
                    title: `Energy & Idle Time Optimization at ${j.name}`,
                    description: `Low vehicle demand (${Math.round(j.avg_veh || 25)} veh/min). Cycle length can be reduced from ${j.cycle_time}s to 90s to cut pedestrian waiting times.`,
                    action: "REDUCE_CYCLE",
                    suggestedAdjustment: { targetCycle: 90 },
                    confidence: "89%"
                });
            }
        }

        res.json({
            success: true,
            modelInfo: {
                engine: "Gorakhpur AI Flow Neural Engine v2.4 (Simulated Telemetry Inference)",
                status: "Online & Monitoring 8 Urban Junctions",
                disclaimer: "AI insights generated from optical sensor emulation. Automatic signal interventions require authorized supervisory approval."
            },
            recommendations
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to generate AI insights" });
    }
});

router.post("/api/traffic/ai-recommendation/apply", requireStaffRole, async (req, res) => {
    try {
        const { recommendation_id, junction_id, action, operator, role } = req.body;

        if (action === "EXTEND_GREEN") {
            await pool.promise().query(
                `UPDATE traffic_signals 
                 SET green_time = green_time + 15 
                 WHERE junction_id = ? AND approach IN ('North', 'South')`,
                [junction_id]
            );
            await pool.promise().query(
                `UPDATE traffic_junctions SET cycle_time = cycle_time + 15 WHERE id = ?`,
                [junction_id]
            );
        } else if (action === "REDUCE_CYCLE") {
            await pool.promise().query(
                `UPDATE traffic_junctions SET cycle_time = 90 WHERE id = ?`,
                [junction_id]
            );
        }

        await trafficEngine.logAudit({
            userId: operator || 'CONTROLLER',
            userName: operator || 'Traffic Officer',
            role: role || 'Traffic Controller',
            action: 'APPLY_AI_RECOMMENDATION',
            target: `Junction ${junction_id}`,
            details: `Applied AI recommendation ${recommendation_id} (${action}). Signals adjusted dynamically.`
        });

        res.json({ success: true, message: `AI recommendation successfully applied to Junction ${junction_id}.` });
    } catch (err) {
        res.status(500).json({ error: "Failed to apply AI recommendation" });
    }
});

// =========================================================
// 9. ADMIN LAYER (RBAC, AUDIT LOGS, AI SETTINGS)
// =========================================================

router.get("/api/traffic/admin/users", authenticateToken, requireRole(["admin", "staff"]), async (req, res) => {
    try {
        const [staff] = await pool.promise().query(
            `SELECT id, name, staff_id, department, created_at FROM staff ORDER BY id ASC`
        );
        const [citizens] = await pool.promise().query(
            `SELECT id, name, mobile, email, 'citizen' AS role, created_at FROM users LIMIT 20`
        );
        res.json({ success: true, staff, citizens });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

router.post("/api/traffic/admin/users", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
        const { name, staff_id, password, department, operator } = req.body;
        if (!name || !staff_id || !password) {
            return res.status(400).json({ error: "Name, Staff ID, and password are required." });
        }

        const passwordHash = hashPassword(password);
        await pool.promise().query(
            `INSERT INTO staff (name, staff_id, password, department) VALUES (?, ?, ?, ?)`,
            [name, staff_id, passwordHash, department || 'traffic']
        );

        await trafficEngine.logAudit({
            userId: operator || 'ADMIN',
            userName: operator || 'Admin',
            role: 'Admin',
            action: 'CREATE_STAFF_USER',
            target: `${staff_id} (${name})`,
            details: `Assigned new staff member to department: ${department || 'traffic'}`
        });

        res.status(201).json({ success: true, message: `User ${name} created.` });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: "Staff ID already exists." });
        }
        res.status(500).json({ error: "Failed to create staff user" });
    }
});

router.get("/api/traffic/admin/audit-logs", authenticateToken, requireRole(["admin", "staff"]), async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 40;
        const [logs] = await pool.promise().query(
            `SELECT * FROM traffic_audit_logs ORDER BY created_at DESC LIMIT ?`,
            [limit]
        );
        res.json({ success: true, count: logs.length, logs });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch audit logs" });
    }
});

router.get("/api/traffic/admin/ai-settings", authenticateToken, requireRole(["admin", "staff"]), async (req, res) => {
    try {
        const [settings] = await pool.promise().query(
            `SELECT * FROM traffic_ai_settings ORDER BY category, setting_key`
        );
        res.json({ success: true, settings });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch AI settings" });
    }
});

router.put("/api/traffic/admin/ai-settings", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
        const { settings, operator } = req.body;
        if (!Array.isArray(settings)) {
            return res.status(400).json({ error: "Settings array required." });
        }

        for (const s of settings) {
            await pool.promise().query(
                `UPDATE traffic_ai_settings SET setting_value = ? WHERE setting_key = ?`,
                [s.setting_value, s.setting_key]
            );
        }

        await trafficEngine.logAudit({
            userId: operator || 'ADMIN',
            userName: operator || 'Admin',
            role: 'Admin',
            action: 'UPDATE_AI_HYPERPARAMETERS',
            target: 'Platform AI Configuration',
            details: `Updated ${settings.length} AI parameters including confidence thresholds and cycle bounds.`
        });

        res.json({ success: true, message: "AI platform settings updated." });
    } catch (err) {
        res.status(500).json({ error: "Failed to update AI settings" });
    }
});

// =========================================================
// 10. ANALYTICS & HISTORICAL TRAFFIC REPORTS
// =========================================================

router.get("/api/traffic/analytics/summary", async (req, res) => {
    try {
        const [jncStats] = await pool.promise().query(
            `SELECT COUNT(*) as total_junctions, 
                    AVG(congestion_level) as avg_congestion, 
                    AVG(avg_speed_kmh) as avg_speed,
                    SUM(CASE WHEN congestion_level >= 70 THEN 1 ELSE 0 END) as congested_count
             FROM traffic_junctions`
        );

        const [camStats] = await pool.promise().query(
            `SELECT COUNT(*) as total_cameras, SUM(vehicles_per_min) as total_vehicles_flow FROM traffic_cameras`
        );

        const [corridorStats] = await pool.promise().query(
            `SELECT COUNT(*) as active_corridors FROM traffic_corridors WHERE status = 'Active'`
        );

        const [incidentStats] = await pool.promise().query(
            `SELECT COUNT(*) as open_incidents FROM traffic_incidents WHERE status IN ('Submitted', 'Verified', 'Officer Dispatched')`
        );

        res.json({
            success: true,
            summary: {
                cityTrafficIndex: Math.round(jncStats[0].avg_congestion || 50),
                averageSpeedKmh: Number(jncStats[0].avg_speed || 24.5).toFixed(1),
                totalJunctions: jncStats[0].total_junctions,
                congestedJunctions: jncStats[0].congested_count,
                totalCctvCameras: camStats[0].total_cameras,
                vehiclesPerMinuteCitywide: camStats[0].total_vehicles_flow || 520,
                activeGreenCorridors: corridorStats[0].active_corridors,
                openIncidents: incidentStats[0].open_incidents,
                systemMode: "Simulated Telemetry & Real-Time Controller Active"
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch analytics summary" });
    }
});

router.get("/api/traffic/analytics/historical", async (req, res) => {
    try {
        // Hourly traffic volume trend for Gorakhpur (06:00 to 22:00)
        const hourlyTrend = [
            { hour: "06:00", volume: 140, avgSpeed: 38.0 },
            { hour: "07:00", volume: 290, avgSpeed: 34.5 },
            { hour: "08:00", volume: 680, avgSpeed: 21.0 },
            { hour: "09:00", volume: 890, avgSpeed: 16.5 }, // Morning Peak
            { hour: "10:00", volume: 920, avgSpeed: 14.8 }, // Morning Peak
            { hour: "11:00", volume: 710, avgSpeed: 22.0 },
            { hour: "12:00", volume: 640, avgSpeed: 25.0 },
            { hour: "13:00", volume: 590, avgSpeed: 27.2 },
            { hour: "14:00", volume: 620, avgSpeed: 26.5 },
            { hour: "15:00", volume: 680, avgSpeed: 23.0 },
            { hour: "16:00", volume: 790, avgSpeed: 19.5 },
            { hour: "17:00", volume: 910, avgSpeed: 15.0 }, // Evening Peak
            { hour: "18:00", volume: 980, avgSpeed: 13.5 }, // Peak Evening Rush
            { hour: "19:00", volume: 940, avgSpeed: 14.0 },
            { hour: "20:00", volume: 760, avgSpeed: 20.5 },
            { hour: "21:00", volume: 480, avgSpeed: 29.0 },
            { hour: "22:00", volume: 260, avgSpeed: 36.0 }
        ];

        res.json({ success: true, hourlyTrend });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch historical analytics" });
    }
});

// =========================================================
// 11. MONSOON WATERLOGGING & ROAD HAZARDS (GORAKHPUR)
// =========================================================

router.get("/api/traffic/waterlogging", async (req, res) => {
    try {
        const waterloggingZones = [
            {
                id: "WL-01",
                name: "Dharamshala Railway Underpass",
                landmark: "Station Approach Road Underpass",
                latitude: 26.7645,
                longitude: 83.3670,
                waterDepthCm: 38,
                riskLevel: "HIGH_RISK",
                severityBadge: "High Risk (Deep Water)",
                status: "Traffic Diverted",
                drainagePumps: "3/4 Heavy Pumps Active",
                recommendedAction: "Avoid underpass. Divert via Asuran or Mohaddipur Flyover.",
                lastUpdated: new Date().toISOString()
            },
            {
                id: "WL-02",
                name: "Rustampur Lowlands / Ring Link",
                landmark: "Near Rapti River Embankment",
                latitude: 26.7510,
                longitude: 83.3700,
                waterDepthCm: 18,
                riskLevel: "MODERATE",
                severityBadge: "Moderate Waterlogging",
                status: "Slow Moving Traffic",
                drainagePumps: "2 Dewatering Pumps Operating",
                recommendedAction: "Heavy vehicles allowed; small two-wheelers proceed with caution.",
                lastUpdated: new Date().toISOString()
            },
            {
                id: "WL-03",
                name: "Surajkund Overbridge Approach",
                landmark: "Surajkund Road Junction corner",
                latitude: 26.7450,
                longitude: 83.3550,
                waterDepthCm: 10,
                riskLevel: "LOW_RISK",
                severityBadge: "Low Risk",
                status: "Passable (Drains Flowing)",
                drainagePumps: "Sluice Gates Fully Discharging",
                recommendedAction: "Passable at normal reduced speeds (20-30 km/h).",
                lastUpdated: new Date().toISOString()
            },
            {
                id: "WL-04",
                name: "Basharatpur Medical Enclave Road",
                landmark: "Between Medical College Link & Rapti Nagar",
                latitude: 26.7720,
                longitude: 83.3850,
                waterDepthCm: 26,
                riskLevel: "MODERATE",
                severityBadge: "Moderate Waterlogging",
                status: "Submerged Shoulder Lane",
                drainagePumps: "1 Municipal Pump Deployed",
                recommendedAction: "Single lane operation in center of road.",
                lastUpdated: new Date().toISOString()
            }
        ];

        res.json({
            success: true,
            totalZones: waterloggingZones.length,
            cityMonsoonStatus: "Monsoon Watch Active (Heavy Rainfall Protocol Ready)",
            zones: waterloggingZones
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch waterlogging data" });
    }
});

// =========================================================
// 12. MUNICIPAL TRAFFIC AUDIT & CSV REPORT EXPORT
// =========================================================

router.get("/api/traffic/reports/export-csv", async (req, res) => {
    try {
        const [junctions] = await pool.promise().query(`SELECT * FROM traffic_junctions ORDER BY id ASC`);
        const [signals] = await pool.promise().query(`SELECT * FROM traffic_signals ORDER BY junction_id ASC, approach ASC`);
        const [cameras] = await pool.promise().query(`SELECT * FROM traffic_cameras ORDER BY junction_id ASC`);
        const [violations] = await pool.promise().query(`SELECT * FROM traffic_violations ORDER BY timestamp DESC LIMIT 50`);

        let csv = `SMARTCITY AI GORAKHPUR - MUNICIPAL TRAFFIC CONTROL REPORT\n`;
        csv += `Generated On,"${new Date().toISOString()}"\n`;
        csv += `Authority,"Gorakhpur Municipal Corporation & Traffic Police ICCC Command Center"\n\n`;

        csv += `--- SECTION 1: JUNCTION STATUS & REAL-TIME PERFORMANCE ---\n`;
        csv += `Junction ID,Name,Zone,Landmark,Mode,Status,Congestion (%),Avg Speed (km/h),Cycle Time (s)\n`;
        junctions.forEach(j => {
            csv += `"${j.id}","${j.name}","${j.zone}","${j.landmark || ''}","${j.mode}","${j.status}",${j.congestion_level},${j.avg_speed_kmh},${j.cycle_time}\n`;
        });

        csv += `\n--- SECTION 2: SIGNAL PHASING & APPROACH HEADS ---\n`;
        csv += `Signal ID,Junction ID,Approach,Direction,Current Color,Time Left (s),Green (s),Yellow (s),Red (s),Override\n`;
        signals.forEach(s => {
            csv += `"${s.id}","${s.junction_id}","${s.approach}","${s.direction}","${s.current_color}",${s.countdown},${s.green_time},${s.yellow_time},${s.red_time},"${s.override_color}"\n`;
        });

        csv += `\n--- SECTION 3: CCTV SURVEILLANCE & VEHICLE FLOW ---\n`;
        csv += `Camera ID,Junction ID,Camera Name,Approach,Status,Vehicles/Min,Avg Speed (km/h),Resolution\n`;
        cameras.forEach(c => {
            csv += `"${c.id}","${c.junction_id}","${c.camera_name}","${c.approach}","${c.status}",${c.vehicles_per_min},${c.avg_speed},"${c.resolution}"\n`;
        });

        csv += `\n--- SECTION 4: RECENT VIOLATIONS & E-CHALLANS ---\n`;
        csv += `Challan ID,Junction ID,Vehicle Number,Type,Fine (INR),Confidence,Status,Timestamp\n`;
        violations.forEach(v => {
            csv += `"${v.id}","${v.junction_id}","${v.vehicle_number}","${v.violation_type}",${v.fine_amount},${v.confidence_score},"${v.status}","${v.timestamp}"\n`;
        });

        const filename = `Gorakhpur_Traffic_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.status(200).send(csv);
    } catch (err) {
        console.error("Export CSV error:", err);
        res.status(500).json({ error: "Failed to export municipal report" });
    }
});

// =========================================================
// 13. VARIABLE MESSAGE SIGNS (VMS) ROADSIDE DIGITAL BOARDS
// =========================================================
let vmsBoards = [
    {
        id: "VMS-01",
        name: "Mohaddipur Flyover Gateway VMS",
        location: "Mohaddipur Intersection Overhead Gantry",
        latitude: 26.7535,
        longitude: 83.3980,
        matrixDimensions: "192x64 Amber LED",
        line1: "MOHADDIPUR FLYOVER: SLOW TRAFFIC",
        line2: "USE RAMGARH TAAL SMART BYPASS",
        line3: "AIIMS: 14 MINS VIA RING ROAD",
        status: "ONLINE",
        ledColor: "#ffb703",
        mode: "ROTATING_ADVISORY",
        lastUpdated: new Date().toISOString()
    },
    {
        id: "VMS-02",
        name: "Golghar Commercial Center VMS",
        location: "Golghar Central Crossing Pedestrian Plaza",
        latitude: 26.7588,
        longitude: 83.3731,
        matrixDimensions: "160x48 Amber LED",
        line1: "GOLGHAR SMART PARKING: 42 SLOTS FREE",
        line2: "SPEED LIMIT: 40 KM/H • WEAR HELMET",
        line3: "AIR QUALITY: MODERATE (AQI 118)",
        status: "ONLINE",
        ledColor: "#ffb703",
        mode: "PARKING_AND_SAFETY",
        lastUpdated: new Date().toISOString()
    },
    {
        id: "VMS-03",
        name: "Dharamshala Station Approach VMS",
        location: "Dharamshala Bazar Railway Link Gantry",
        latitude: 26.7645,
        longitude: 83.3670,
        matrixDimensions: "192x64 Dual-Color Alert VMS",
        line1: "⚠️ DHARAMSHALA UNDERPASS FLOODED",
        line2: "WATER DEPTH 38CM • DIVERSION ON",
        line3: "DIVERT VIA ASURAN / MEDICAL ROAD",
        status: "EMERGENCY_ALERT",
        ledColor: "#ef4444",
        mode: "MONSOON_ALERT",
        lastUpdated: new Date().toISOString()
    }
];

router.get("/api/traffic/vms-boards", (req, res) => {
    res.json({ success: true, count: vmsBoards.length, boards: vmsBoards });
});

router.post("/api/traffic/vms-boards/:id/message", requireStaffRole, async (req, res) => {
    try {
        const { id } = req.params;
        const { line1, line2, line3, status, ledColor, operator } = req.body;

        const board = vmsBoards.find(b => b.id === id);
        if (!board) {
            return res.status(404).json({ error: "VMS Board not found" });
        }

        if (line1 !== undefined) board.line1 = line1;
        if (line2 !== undefined) board.line2 = line2;
        if (line3 !== undefined) board.line3 = line3;
        if (status !== undefined) board.status = status;
        if (ledColor !== undefined) board.ledColor = ledColor;
        board.lastUpdated = new Date().toISOString();

        await trafficEngine.logAudit({
            userId: operator || 'OPERATOR',
            userName: operator || 'VMS Controller',
            role: 'Traffic Controller',
            action: 'UPDATE_VMS_DISPLAY_MESSAGE',
            target: board.name,
            details: `Broadcast updated: "${board.line1} | ${board.line2}" Status: ${board.status}`
        });

        if (req.app.get("io")) {
            req.app.get("io").emit("traffic:vms_update", {
                boardId: board.id,
                board
            });
        }

        res.json({ success: true, message: `VMS Board "${board.name}" updated successfully.`, board });
    } catch (err) {
        res.status(500).json({ error: "Failed to update VMS message" });
    }
});

// =========================================================
// 14. CITIZEN DAILY COMMUTE CORRIDOR ALERTS
// =========================================================
router.post("/api/traffic/commute-alerts/subscribe", async (req, res) => {
    try {
        const { citizen_name, phone_or_email, from_route, to_route, notification_time } = req.body;
        if (!from_route || !to_route) {
            return res.status(400).json({ error: "Commute origin and destination required." });
        }

        const subscriptionId = `SUB-COM-${Date.now().toString().slice(-5)}`;
        
        await trafficEngine.logAudit({
            userId: phone_or_email || 'CITIZEN',
            userName: citizen_name || 'Citizen Commuter',
            role: 'Citizen',
            action: 'SUBSCRIBE_COMMUTE_ALERTS',
            target: `${from_route} -> ${to_route}`,
            details: `Subscribed to real-time traffic broadcast for route: ${from_route} to ${to_route}. Delivery time: ${notification_time || '08:30 AM'}`
        });

        res.json({
            success: true,
            subscriptionId,
            message: `Commute advisory active for "${from_route} ➔ ${to_route}".`,
            livePreviewAdvisory: {
                currentStatus: "Flow Clear (Green)",
                recommendedDeparture: "Leave at 08:35 AM for fastest arrival",
                currentEtaMinutes: 21,
                activeObstructions: "None reported on this corridor.",
                deliveryChannel: phone_or_email ? `Push to ${phone_or_email}` : "In-App Notification"
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to subscribe commute alerts" });
    }
});

// =========================================================
// 15. LIVE MOVING AMBULANCES & CRITICAL TRANSIT CORRIDOR
// =========================================================

// 16A. Get live active ambulances with GPS telemetry & waypoints
router.get("/api/traffic/ambulances/live", async (req, res) => {
    try {
        const ambulances = ambulanceSimulator.getSimulatedAmbulances();
        res.json({
            success: true,
            count: ambulances.length,
            ambulances
        });
    } catch (err) {
        console.error("Fetch live ambulances error:", err);
        res.status(500).json({ error: "Failed to fetch live ambulances" });
    }
});

// 16B. Declare Critical Condition Transit - Preempt Signals on Corridor
router.post("/api/traffic/ambulances/:id/critical-dispatch", requireStaffRole, async (req, res) => {
    try {
        const { id } = req.params;
        const { destinationHospital, reason } = req.body;

        const result = await ambulanceSimulator.setAmbulanceCritical(id, true, destinationHospital);

        res.json({
            success: true,
            message: `Ambulance ${result.ambulance.vehicle_number} declared in CRITICAL TRANSIT. Green Wave corridor active.`,
            ambulance: result.ambulance,
            preemptedJunctions: result.preemptedJunctions
        });
    } catch (err) {
        console.error("Critical dispatch error:", err);
        res.status(400).json({ error: err.message || "Failed to trigger critical dispatch" });
    }
});

// 16C. Clear Critical Condition - Restore Normal AI Adaptive Traffic Signals
router.post("/api/traffic/ambulances/:id/clear-critical", requireStaffRole, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await ambulanceSimulator.setAmbulanceCritical(id, false);

        res.json({
            success: true,
            message: `Ambulance ${result.ambulance.vehicle_number} critical transit resolved. Normal signal operations restored.`,
            ambulance: result.ambulance
        });
    } catch (err) {
        console.error("Clear critical dispatch error:", err);
        res.status(400).json({ error: err.message || "Failed to clear critical status" });
    }
});

module.exports = router;



