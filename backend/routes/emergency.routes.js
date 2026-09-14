const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken, requireRole } = require("../middleware/auth.middleware");
const { emitEmergencyAlert, emitEmergencyResolved } = require("../sockets/index");

// Auto-create emergency_incidents table if it doesn't exist
const createIncidentsTableSQL = `
CREATE TABLE IF NOT EXISTS emergency_incidents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incident_code VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    location VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 7) DEFAULT NULL,
    longitude DECIMAL(10, 7) DEFAULT NULL,
    description TEXT,
    caller_name VARCHAR(100) DEFAULT NULL,
    caller_mobile VARCHAR(20) DEFAULT NULL,
    priority VARCHAR(20) DEFAULT 'HIGH',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

db.query(createIncidentsTableSQL, (err) => {
    if (err) console.error("Create emergency_incidents table error:", err.message);
});

// =========================================================
// EMERGENCY DEPARTMENTS
// =========================================================

// GET EMERGENCY INFORMATION
router.get("/api/emergency-departments", (req, res) => {
    const sql = `
        SELECT
            id,
            hospital_name,
            emergency_number,
            emergency_type,
            available_doctors,
            available_beds,
            ambulances_available,
            status,
            location,
            created_at
        FROM emergency_departments
        ORDER BY hospital_name ASC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Emergency fetch error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        res.json({
            message: "Emergency departments fetched successfully.",
            emergencyDepartments: results
        });
    });
});

// ADD EMERGENCY DEPARTMENT
router.post("/api/emergency-departments", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const {
        hospitalName,
        emergencyNumber,
        emergencyType,
        availableDoctors,
        availableBeds,
        ambulancesAvailable,
        status,
        location
    } = req.body;

    if (!hospitalName) {
        return res.status(400).json({ message: "Hospital name is required." });
    }

    const sql = `
        INSERT INTO emergency_departments
        (
            hospital_name, emergency_number, emergency_type,
            available_doctors, available_beds, ambulances_available,
            status, location
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            hospitalName,
            emergencyNumber || null,
            emergencyType || null,
            Number(availableDoctors || 0),
            Number(availableBeds || 0),
            Number(ambulancesAvailable || 0),
            status || "Active",
            location || null
        ],
        (err, result) => {
            if (err) {
                console.error("Add emergency department error:", err);
                return res.status(500).json({ message: "Database error." });
            }

            res.status(201).json({
                message: "Emergency department added successfully.",
                id: result.insertId
            });
        }
    );
});

// UPDATE EMERGENCY DEPARTMENT
router.put("/api/emergency-departments/:id", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;
    const {
        emergencyNumber,
        emergencyType,
        availableDoctors,
        availableBeds,
        ambulancesAvailable,
        status,
        location
    } = req.body;

    const sql = `
        UPDATE emergency_departments
        SET
            emergency_number = ?,
            emergency_type = ?,
            available_doctors = ?,
            available_beds = ?,
            ambulances_available = ?,
            status = ?,
            location = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            emergencyNumber || null,
            emergencyType || null,
            Number(availableDoctors || 0),
            Number(availableBeds || 0),
            Number(ambulancesAvailable || 0),
            status || "Active",
            location || null,
            id
        ],
        (err, result) => {
            if (err) {
                console.error("Emergency update error:", err);
                return res.status(500).json({ message: "Database error." });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Emergency department not found." });
            }

            res.json({ message: "Emergency department updated successfully." });
        }
    );
});

// =========================================================
// EMERGENCY INCIDENTS & REAL-TIME SOS ALERTS
// =========================================================

// GET ACTIVE INCIDENTS
router.get("/api/emergency/incidents", (req, res) => {
    const sql = `
        SELECT id, incident_code, type, location, latitude, longitude,
               description, caller_name, caller_mobile, priority, status, created_at, resolved_at
        FROM emergency_incidents
        ORDER BY created_at DESC
        LIMIT 50
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Get emergency incidents error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        res.json({
            success: true,
            incidents: results
        });
    });
});

// CREATE / SUBMIT EMERGENCY INCIDENT (Citizen or Staff)
router.post("/api/emergency/incidents", (req, res) => {
    const { type, location, latitude, longitude, description, callerName, callerMobile, priority } = req.body;

    if (!location && (!latitude || !longitude)) {
        return res.status(400).json({ message: "Location details are required." });
    }

    const incidentCode = "EMG-" + Date.now().toString(36).toUpperCase();
    const lat = latitude ? Number(latitude) : 26.7606;
    const lng = longitude ? Number(longitude) : 83.3732;

    const sql = `
        INSERT INTO emergency_incidents
        (incident_code, type, location, latitude, longitude, description, caller_name, caller_mobile, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    `;

    db.query(
        sql,
        [
            incidentCode,
            type || "General Emergency",
            location || "Gorakhpur City",
            lat,
            lng,
            description || "Emergency reported via SmartCity portal",
            callerName || "Citizen",
            callerMobile || null,
            priority || "HIGH"
        ],
        (err, result) => {
            if (err) {
                console.error("Create emergency incident error:", err);
                return res.status(500).json({ message: "Database error." });
            }

            const incidentData = {
                id: result.insertId,
                incidentCode,
                type: type || "General Emergency",
                location: location || "Gorakhpur City",
                latitude: lat,
                longitude: lng,
                description: description || "Emergency reported",
                callerName: callerName || "Citizen",
                priority: priority || "HIGH",
                status: "ACTIVE",
                createdAt: new Date().toISOString()
            };

            // Broadcast instant SOS alert over Socket.io across entire city network
            emitEmergencyAlert(incidentData);

            res.status(201).json({
                success: true,
                message: "Emergency incident reported and broadcasted successfully.",
                incident: incidentData
            });
        }
    );
});

// QUICK SOS BROADCAST (Direct one-click SOS endpoint)
router.post("/api/emergency/sos", (req, res) => {
    const { latitude, longitude, address, callerMobile, type } = req.body;

    const incidentCode = "SOS-" + Date.now().toString(36).toUpperCase();
    const lat = latitude ? Number(latitude) : 26.7606;
    const lng = longitude ? Number(longitude) : 83.3732;

    const sql = `
        INSERT INTO emergency_incidents
        (incident_code, type, location, latitude, longitude, description, caller_mobile, priority, status)
        VALUES (?, ?, ?, ?, ?, 'URGENT CITIZEN SOS SIGNAL TRIGGERED', ?, 'CRITICAL', 'ACTIVE')
    `;

    db.query(
        sql,
        [
            incidentCode,
            type || "CRITICAL SOS",
            address || `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            lat,
            lng,
            callerMobile || null
        ],
        (err, result) => {
            const sosPayload = {
                id: result ? result.insertId : Date.now(),
                incidentCode,
                type: type || "CRITICAL SOS",
                location: address || `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                latitude: lat,
                longitude: lng,
                description: "URGENT CITIZEN SOS SIGNAL TRIGGERED",
                priority: "CRITICAL",
                status: "ACTIVE",
                createdAt: new Date().toISOString()
            };

            // Broadcast high-priority alert immediately
            emitEmergencyAlert(sosPayload);

            res.status(201).json({
                success: true,
                message: "Critical SOS alert dispatched to emergency response network.",
                sos: sosPayload
            });
        }
    );
});

// RESOLVE AN EMERGENCY INCIDENT (Staff/Admin)
router.put("/api/emergency/incidents/:id/resolve", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;

    const sql = `
        UPDATE emergency_incidents
        SET status = 'RESOLVED',
            resolved_at = NOW()
        WHERE id = ? OR incident_code = ?
    `;

    db.query(sql, [id, id], (err, result) => {
        if (err) {
            console.error("Resolve incident error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Incident not found." });
        }

        const resolvePayload = {
            id,
            status: "RESOLVED",
            resolvedAt: new Date().toISOString()
        };

        // Broadcast resolution
        emitEmergencyResolved(resolvePayload);

        res.json({
            success: true,
            message: "Emergency incident marked as resolved.",
            incident: resolvePayload
        });
    });
});

module.exports = router;
