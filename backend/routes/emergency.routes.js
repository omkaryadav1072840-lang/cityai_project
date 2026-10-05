const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken, optionalToken, requireRole } = require("../middleware/auth.middleware");
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

// GET EMERGENCY INFORMATION (Supports both hyphen and slash format)
router.get(["/api/emergency-departments", "/api/emergency/departments"], (req, res) => {
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
    const numericId = !isNaN(id) ? Number(id) : 0;
    const {
        emergencyNumber,
        emergencyType,
        availableDoctors,
        availableBeds,
        ambulancesAvailable,
        status,
        location
    } = req.body;

    const performUpdate = (record) => {
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
                emergencyNumber !== undefined ? emergencyNumber : record.emergency_number,
                emergencyType !== undefined ? emergencyType : record.emergency_type,
                availableDoctors !== undefined ? Number(availableDoctors) : record.available_doctors,
                availableBeds !== undefined ? Number(availableBeds) : record.available_beds,
                ambulancesAvailable !== undefined ? Number(ambulancesAvailable) : record.ambulances_available,
                status !== undefined ? status : record.status,
                location !== undefined ? location : record.location,
                record.id
            ],
            (err, result) => {
                if (err) {
                    console.error("Emergency update error:", err);
                    return res.status(500).json({ message: "Database error." });
                }

                res.json({ success: true, message: "Emergency department updated successfully." });
            }
        );
    };

    db.query("SELECT * FROM emergency_departments WHERE id = ? OR hospital_name = ? LIMIT 1", [numericId, id], (findErr, findRows) => {
        if (findErr) return res.status(500).json({ message: "Database error." });
        if (findRows.length === 0) return res.status(404).json({ message: "Emergency department not found." });

        const record = findRows[0];
        const userRole = (req.user.role || req.user.type || "").toLowerCase();

        if (userRole === "staff") {
            const staffHospitalId = req.user.hospitalId || req.user.hospital_id;
            if (staffHospitalId) {
                db.query("SELECT hospital_name FROM hospitals WHERE hospital_id = ? OR id = ? LIMIT 1", [staffHospitalId, !isNaN(staffHospitalId) ? Number(staffHospitalId) : 0], (hErr, hRows) => {
                    if (!hErr && hRows.length > 0) {
                        const assignedName = hRows[0].hospital_name;
                        const normAssigned = assignedName.toLowerCase().replace(/hospital|trauma|center|emergency/gi, '').trim();
                        const normRecord = (record.hospital_name || '').toLowerCase().replace(/hospital|trauma|center|emergency/gi, '').trim();
                        if (normAssigned && !normRecord.includes(normAssigned) && !normAssigned.includes(normRecord)) {
                            return res.status(403).json({
                                message: `Access denied. Hospital staff can only update emergency departments for their assigned hospital (${assignedName}).`
                            });
                        }
                    }
                    performUpdate(record);
                });
                return;
            }
        }
        performUpdate(record);
    });
});

// =========================================================
// EMERGENCY INCIDENTS & REAL-TIME SOS ALERTS
// =========================================================

// GET ACTIVE INCIDENTS
router.get("/api/emergency/incidents", optionalToken, (req, res) => {
    const isStaffOrAdmin = req.user && (["staff", "admin"].includes(req.user.role) || ["staff", "admin"].includes(req.user.type));

    const sql = `
        SELECT id, incident_code, type, location, latitude, longitude,
               description, 
               ${isStaffOrAdmin ? "caller_name, caller_mobile," : "'Citizen Caller' AS caller_name, NULL AS caller_mobile,"}
               priority, status, created_at, resolved_at
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
            if (err) {
                console.error("Critical SOS database error:", err);
                return res.status(500).json({
                    success: false,
                    message: "Failed to persist SOS incident into emergency database."
                });
            }

            const sosPayload = {
                id: result.insertId,
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
router.put(["/api/emergency/incidents/:id/resolve", "/api/emergency/incidents/:id/status"], authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;
    const newStatus = (req.body && req.body.status) ? req.body.status.toUpperCase() : 'RESOLVED';

    const sql = `
        UPDATE emergency_incidents
        SET status = ?,
            resolved_at = ${newStatus === 'RESOLVED' ? 'NOW()' : 'NULL'}
        WHERE id = ? OR incident_code = ?
    `;

    db.query(sql, [newStatus, id, id], (err, result) => {
        if (err) {
            console.error("Resolve incident error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Incident not found." });
        }

        const resolvePayload = {
            id,
            status: newStatus,
            resolvedAt: newStatus === 'RESOLVED' ? new Date().toISOString() : null
        };

        // Broadcast resolution
        if (newStatus === 'RESOLVED') {
            emitEmergencyResolved(resolvePayload);
        }

        res.json({
            success: true,
            message: `Emergency incident marked as ${newStatus}.`,
            incident: resolvePayload
        });
    });
});

// EMERGENCY HELPLINES & CONTACT NUMBERS (Gorakhpur City)
const GORAKHPUR_EMERGENCY_CONTACTS = [
    { service: "Unified Emergency Response", number: "112", description: "Police, Fire, and Medical Integrated Control", category: "Immediate" },
    { service: "National Ambulance Service", number: "108", description: "Free 24/7 Trauma and Medical Transport", category: "Medical" },
    { service: "Pregnant Women & Infant Transport", number: "102", description: "Mother and Child Janani Suraksha Vahan", category: "Medical" },
    { service: "Fire & Rescue Control Room", number: "101", description: "Gorakhpur Central Fire Station, Golghar", category: "Fire" },
    { service: "Women Power Line", number: "1090", description: "Dedicated Safety & Harassment Redressal", category: "Police" },
    { service: "Disaster Management Cell", number: "1077", description: "Gorakhpur Flood & Disaster Relief Centre", category: "Disaster" },
    { service: "Child Helpline", number: "1098", description: "Child Protection and Emergency Support", category: "Social" },
    { service: "Gorakhpur Municipal Corporation", number: "1800-180-2026", description: "Civic Emergency & Disaster Toll-Free", category: "Civic" }
];

router.get(["/api/emergency/contacts", "/api/emergency-contacts"], (req, res) => {
    res.json({
        success: true,
        city: "Gorakhpur",
        state: "Uttar Pradesh",
        contacts: GORAKHPUR_EMERGENCY_CONTACTS
    });
});

// GREEN WAVE AMBULANCE PREEMPTION ROUTE
const EmergencyController = require("../controllers/emergency.controller");
router.post(["/api/emergency/green-wave", "/api/emergency/critical-dispatch"], authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    return EmergencyController.criticalDispatch(req, res);
});

module.exports = router;
