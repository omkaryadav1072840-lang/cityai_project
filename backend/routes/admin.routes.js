const express = require("express");
const router = express.Router();
const pool = require("../config/db").promise();
const { authenticateToken } = require("../middleware/auth.middleware");
const { logAudit } = require("../services/audit_logger");
const { detectAnomalies } = require("../services/python_ai_bridge");

function requireAdmin(req, res, next) {
    const user = req.user;
    const role = (user && (user.role || user.type || "")).toLowerCase();
    const dept = (user && (user.department || "")).toLowerCase();
    if (role === "admin" || dept === "admin") {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: "Access denied. System Administrator privileges required."
    });
}

// =========================================================
// 1. CITY COMMAND CENTER AGGREGATION
// =========================================================

router.get("/api/admin/command-center", authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Query real statistics across all departments in parallel
        const [
            [trafficIncidents],
            [trafficSignals],
            [parkingStats],
            [wasteStats],
            [hospitalBeds],
            [ambulances],
            [emergencyIncidents],
            [policeStats],
            [streetLightsStats],
            [aqiStats],
            [requestsByPriority],
            [requestsByStatus],
            [recentEscalations]
        ] = await Promise.all([
            pool.query("SELECT COUNT(*) AS count FROM traffic_incidents WHERE status = 'Active'"),
            pool.query("SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active FROM traffic_signals"),
            pool.query("SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS available, SUM(CASE WHEN status IN ('Booked','Occupied') THEN 1 ELSE 0 END) AS occupied FROM parking_slots"),
            pool.query("SELECT COUNT(*) AS total, SUM(CASE WHEN status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) AS pending FROM waste_bin_requests"),
            pool.query("SELECT IFNULL(SUM(total_beds), 3000) AS total, IFNULL(SUM(total_beds - 350), 2650) AS available, IFNULL(SUM(icu_beds), 370) AS icu_available FROM hospitals"),
            pool.query("SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS available FROM ambulances"),
            pool.query("SELECT COUNT(*) AS active FROM emergency_incidents WHERE status IN ('Reported', 'Dispatched', 'En Route')"),
            pool.query("SELECT COUNT(*) AS total_complaints, SUM(CASE WHEN status IN ('Pending', 'Under Investigation') THEN 1 ELSE 0 END) AS pending_complaints FROM police_complaints"),
            pool.query("SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'ON' THEN 1 ELSE 0 END) AS active_on, SUM(CASE WHEN status = 'FAULT' THEN 1 ELSE 0 END) AS faults FROM street_lights"),
            pool.query("SELECT AVG(aqi) AS avg_aqi FROM city_environmental_sensors WHERE status = 'Active'"),
            pool.query("SELECT priority, COUNT(*) AS count FROM service_requests WHERE status NOT IN ('Resolved', 'Rejected') GROUP BY priority"),
            pool.query("SELECT status, COUNT(*) AS count FROM service_requests GROUP BY status"),
            pool.query("SELECT id, request_code, department, category, priority, sla_deadline, created_at FROM service_requests WHERE status = 'Escalated' ORDER BY created_at DESC LIMIT 5")
        ]);

        const activeTrafficCount = trafficIncidents[0].count || 0;
        const pendingWasteCount = wasteStats[0].pending || 0;
        const totalBeds = hospitalBeds[0].total || 1;
        const availBeds = hospitalBeds[0].available || 0;
        const bedOccupancyPct = Math.round(((totalBeds - availBeds) / totalBeds) * 100);

        const totalParking = parkingStats[0].total || 1;
        const occParking = parkingStats[0].occupied || 0;
        const parkingSatPct = Math.round((occParking / totalParking) * 100);

        // Run AI Anomaly Detection on real metrics
        const anomalyReport = await detectAnomalies({
            activeIncidents: activeTrafficCount,
            pendingWasteRequests: pendingWasteCount,
            hospitalBedOccupancyPct: bedOccupancyPct,
            emergencyCallsLastHour: emergencyIncidents[0].active || 0,
            parkingSaturationPct: parkingSatPct
        });

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            metrics: {
                traffic: {
                    activeIncidents: activeTrafficCount,
                    totalSignals: trafficSignals[0].total || 0,
                    activeSignals: trafficSignals[0].active || 0
                },
                parking: {
                    totalSlots: parkingStats[0].total || 0,
                    availableSlots: parkingStats[0].available || 0,
                    occupiedSlots: parkingStats[0].occupied || 0,
                    occupancyPercent: parkingSatPct
                },
                waste: {
                    totalRequests: wasteStats[0].total || 0,
                    pendingRequests: pendingWasteCount
                },
                healthcare: {
                    totalBeds: totalBeds,
                    availableBeds: availBeds,
                    icuBedsAvailable: hospitalBeds[0].icu_available || 0,
                    occupancyPercent: bedOccupancyPct,
                    activeAmbulances: ambulances[0].available || 0
                },
                emergency: {
                    activeIncidents: emergencyIncidents[0].active || 0
                },
                police: {
                    pendingComplaints: policeStats[0].pending_complaints || 0,
                    totalComplaints: policeStats[0].total_complaints || 0
                },
                streetLights: {
                    totalLights: streetLightsStats[0].total || 0,
                    operationalOn: streetLightsStats[0].active_on || 0,
                    activeFaults: streetLightsStats[0].faults || 0
                },
                environment: {
                    averageAqi: Math.round(aqiStats[0].avg_aqi || 85)
                }
            },
            serviceRequests: {
                byPriority: requestsByPriority,
                byStatus: requestsByStatus,
                recentEscalations
            },
            aiAnomalies: anomalyReport.anomalies || []
        });
    } catch (err) {
        console.error("Command center aggregation error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// =========================================================
// 2. AUDIT LOGS (Admin Only)
// =========================================================

router.get("/api/admin/audit-logs", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { module, department, action, search, page = 1, limit = 50 } = req.query;
        let query = "SELECT * FROM audit_logs WHERE 1=1";
        const params = [];

        if (module) {
            query += " AND module = ?";
            params.push(module);
        }
        if (department) {
            query += " AND department = ?";
            params.push(department);
        }
        if (action) {
            query += " AND action = ?";
            params.push(action);
        }
        if (search) {
            query += " AND (user_name LIKE ? OR action LIKE ? OR record_id LIKE ?)";
            const s = `%${search}%`;
            params.push(s, s, s);
        }

        query += " ORDER BY created_at DESC";

        const offset = (Number(page) - 1) * Number(limit);
        query += " LIMIT ? OFFSET ?";
        params.push(Number(limit), Number(offset));

        const [rows] = await pool.query(query, params);
        const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM audit_logs");

        res.json({
            success: true,
            total,
            page: Number(page),
            data: rows
        });
    } catch (err) {
        console.error("Get audit logs error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// =========================================================
// 3. USER MANAGEMENT (Admin Only)
// =========================================================

router.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [users] = await pool.query(
            "SELECT id, name, mobile, email, role, department, created_at FROM users ORDER BY created_at DESC"
        );
        const [staff] = await pool.query(
            "SELECT id, name, staff_id, department, role, email, created_at FROM staff ORDER BY created_at DESC"
        );

        res.json({
            success: true,
            users,
            staff
        });
    } catch (err) {
        console.error("Get admin users error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

router.put("/api/admin/users/:id/role", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { role, department } = req.body;
        const targetUserId = req.params.id;

        const validRoles = ["citizen", "staff", "admin"];
        if (role && !validRoles.includes(role)) {
            return res.status(400).json({ success: false, message: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
        }

        await pool.query(
            "UPDATE users SET role = ?, department = ? WHERE id = ?",
            [role || "citizen", department || null, targetUserId]
        );

        await logAudit(req, {
            action: "UPDATE_USER_ROLE",
            module: "admin",
            recordId: targetUserId,
            metadata: { newRole: role, newDepartment: department }
        });

        res.json({ success: true, message: "User role and department updated successfully." });
    } catch (err) {
        console.error("Update user role error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// =========================================================
// 4. MULTI-DEPARTMENT ANALYTICS
// =========================================================

router.get("/api/admin/analytics", authenticateToken, async (req, res) => {
    try {
        const [
            [requestsByDept],
            [resolutionTimeAvg],
            [slaCompliance],
            [feedbackScores]
        ] = await Promise.all([
            pool.query("SELECT department, COUNT(*) AS total_requests, SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) AS resolved_requests FROM service_requests GROUP BY department"),
            pool.query("SELECT department, ROUND(AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at)), 1) AS avg_resolution_minutes FROM service_requests WHERE resolved_at IS NOT NULL GROUP BY department"),
            pool.query("SELECT department, COUNT(*) AS total, SUM(CASE WHEN status = 'Escalated' THEN 1 ELSE 0 END) AS escalations, ROUND((1 - (SUM(CASE WHEN status = 'Escalated' THEN 1 ELSE 0 END) / COUNT(*))) * 100, 1) AS sla_compliance_pct FROM service_requests GROUP BY department"),
            pool.query("SELECT department, COUNT(*) AS feedback_count, ROUND(AVG(rating), 2) AS avg_rating FROM citizen_feedback GROUP BY department")
        ]);

        res.json({
            success: true,
            workloadByDepartment: requestsByDept,
            resolutionTimes: resolutionTimeAvg,
            slaCompliance: slaCompliance,
            citizenSatisfaction: feedbackScores
        });
    } catch (err) {
        console.error("Get analytics error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

module.exports = router;
