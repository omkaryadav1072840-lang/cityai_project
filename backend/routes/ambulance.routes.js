const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken, requireRole } = require("../middleware/auth.middleware");

const AMBULANCE_DETAIL_COLUMNS = `
    id, ambulance_id, vehicle_number, driver_name, driver_mobile,
    ambulance_type, hospital_name, location, status,
    latitude, longitude,
    patient_name, patient_mobile, patient_lat, patient_lng, patient_address,
    destination_hospital_id, destination_hospital_name, assigned_at,
    created_at, updated_at
`;

// GET ALL AMBULANCES
router.get("/api/ambulances", (req, res) => {
    const sql = `
        SELECT 
            id, ambulance_id, vehicle_number, driver_name, driver_mobile, 
            ambulance_type, hospital_name, location, status, 
            latitude, longitude,
            patient_name, patient_mobile, patient_lat, patient_lng, patient_address,
            destination_hospital_id, destination_hospital_name, assigned_at,
            created_at, updated_at
        FROM ambulances
        ORDER BY created_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Get all ambulances error:", err);
            return res.status(500).json({ message: "Database error." });
        }
        res.json({
            message: "Ambulances fetched successfully.",
            ambulances: results 
        });
    });
});

// GET SINGLE AMBULANCE
router.get("/api/ambulances/:id", (req, res) => {
    const id = req.params.id;

    const sql = `
        SELECT
            id, ambulance_id, vehicle_number, driver_name, driver_mobile,
            ambulance_type, hospital_name, location, status,
            latitude, longitude, patient_name, patient_mobile,
            patient_lat, patient_lng, patient_address,
            destination_hospital_id, destination_hospital_name,
            assigned_at, created_at, updated_at
        FROM ambulances
        WHERE id = ?
        LIMIT 1
    `;

    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error("Get single ambulance error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "Ambulance not found." });
        }

        res.json({
            message: "Ambulance fetched successfully.",
            ambulance: results[0]
        });
    });
});

// UPDATE AMBULANCE REAL-TIME LOCATION
router.put("/api/ambulances/:id/location", (req, res) => {
    const configuredToken = process.env.AMBULANCE_UPDATE_TOKEN;

    if (configuredToken) {
        const providedToken =
            req.headers["x-ambulance-token"] ||
            (req.headers.authorization || "").replace(/^Bearer\s+/i, "");

        if (providedToken !== configuredToken) {
            return res.status(401).json({
                message: "Invalid or missing ambulance update token."
            });
        }
    }

    const id = req.params.id;
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({
            message: "Latitude and longitude are required."
        });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({
            message: "Invalid latitude or longitude."
        });
    }

    if (lat < -90 || lat > 90) {
        return res.status(400).json({ message: "Invalid latitude." });
    }

    if (lng < -180 || lng > 180) {
        return res.status(400).json({ message: "Invalid longitude." });
    }

    const sql = `
        UPDATE ambulances
        SET
            latitude = ?,
            longitude = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    db.query(sql, [lat, lng, id], (err, result) => {
        if (err) {
            console.error("Ambulance location update error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Ambulance not found." });
        }

        const getSQL = `
            SELECT
                id, ambulance_id, vehicle_number, driver_name, driver_mobile,
                ambulance_type, hospital_name, location, status,
                latitude, longitude, patient_name, patient_mobile,
                patient_lat, patient_lng, patient_address,
                destination_hospital_id, destination_hospital_name,
                assigned_at, updated_at
            FROM ambulances
            WHERE id = ?
            LIMIT 1
        `;

        db.query(getSQL, [id], (getErr, rows) => {
            if (getErr) {
                console.error("Updated ambulance fetch error:", getErr);
                return res.status(500).json({
                    message: "Location updated but data fetch failed."
                });
            }

            const ambulance = rows[0];
            const io = req.app.get("io");
            if (io) {
                io.emit("ambulance-location-updated", ambulance);
            }

            res.json({
                success: true,
                message: "Ambulance location updated successfully.",
                ambulance
            });
        });
    });
});

// ADD AMBULANCE
router.post("/api/ambulances", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const {
        ambulanceId,
        vehicleNumber,
        driverName,
        driverMobile,
        ambulanceType,
        hospitalName,
        location,
        status,
        latitude,
        longitude
    } = req.body;

    if (!ambulanceId || !vehicleNumber) {
        return res.status(400).json({
            message: "Ambulance ID and vehicle number are required."
        });
    }

    const sql = `
        INSERT INTO ambulances
        (
            ambulance_id, vehicle_number, driver_name, driver_mobile,
            ambulance_type, hospital_name, location, status,
            latitude, longitude
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            ambulanceId,
            vehicleNumber,
            driverName || null,
            driverMobile || null,
            ambulanceType || null,
            hospitalName || null,
            location || null,
            status || "Available",
            latitude || null,
            longitude || null
        ],
        (err, result) => {
            if (err) {
                console.error("Add ambulance error:", err);
                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({
                        message: "Ambulance ID or vehicle number already exists."
                    });
                }
                return res.status(500).json({ message: "Database error." });
            }

            res.status(201).json({
                message: "Ambulance added successfully.",
                ambulanceId: result.insertId
            });
        }
    );
});

// UPDATE AMBULANCE
router.put("/api/ambulances/:id", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;
    const {
        driverName,
        driverMobile,
        ambulanceType,
        hospitalName,
        location,
        status,
        latitude,
        longitude
    } = req.body;

    const sql = `
        UPDATE ambulances
        SET
            driver_name = ?,
            driver_mobile = ?,
            ambulance_type = ?,
            hospital_name = ?,
            location = ?,
            status = ?,
            latitude = ?,
            longitude = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            driverName || null,
            driverMobile || null,
            ambulanceType || null,
            hospitalName || null,
            location || null,
            status || "Available",
            latitude || null,
            longitude || null,
            id
        ],
        (err, result) => {
            if (err) {
                console.error("Update ambulance error:", err);
                return res.status(500).json({ message: "Database error." });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Ambulance not found." });
            }

            res.json({
                message: "Ambulance updated successfully."
            });
        }
    );
});

// UPDATE AMBULANCE STATUS
router.put("/api/ambulances/:id/status", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;
    const { status } = req.body;

    const allowedStatuses = [
        "Available",
        "Assigned",
        "On The Way",
        "Arrived at Patient",
        "Transporting Patient",
        "Arrived at Hospital",
        "On Duty",
        "Emergency",
        "Offline"
    ];

    if (!status) {
        return res.status(400).json({
            message: "Ambulance status is required."
        });
    }

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            message: "Invalid ambulance status."
        });
    }

    const sql = `
        UPDATE ambulances
        SET
            status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    db.query(sql, [status, id], (err, result) => {
        if (err) {
            console.error("Ambulance status update error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Ambulance not found." });
        }

        const getSQL = `
            SELECT
                id, ambulance_id, vehicle_number, driver_name, driver_mobile,
                ambulance_type, hospital_name, location, status,
                latitude, longitude, patient_name, patient_mobile,
                patient_lat, patient_lng, patient_address,
                destination_hospital_id, destination_hospital_name,
                assigned_at, updated_at
            FROM ambulances
            WHERE id = ?
            LIMIT 1
        `;

        db.query(getSQL, [id], (getErr, rows) => {
            if (getErr) {
                return res.status(500).json({
                    message: "Status updated but fetch failed."
                });
            }

            const ambulance = rows[0];
            const io = req.app.get("io");
            if (io) {
                io.emit("ambulance-status-updated", ambulance);
            }

            res.json({
                success: true,
                message: "Ambulance status updated successfully.",
                ambulance
            });
        });
    });
});

// ASSIGN AMBULANCE TO AN EMERGENCY
router.put("/api/ambulances/:id/assign", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;
    const {
        patientName,
        patientMobile,
        patientLat,
        patientLng,
        patientAddress,
        destinationHospitalId,
        destinationHospitalName
    } = req.body;

    const pLat = Number(patientLat);
    const pLng = Number(patientLng);

    if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) {
        return res.status(400).json({
            message: "Valid patient latitude and longitude are required."
        });
    }

    const sql = `
        UPDATE ambulances
        SET
            status = 'Assigned',
            patient_name = ?,
            patient_mobile = ?,
            patient_lat = ?,
            patient_lng = ?,
            patient_address = ?,
            destination_hospital_id = ?,
            destination_hospital_name = ?,
            assigned_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'Available'
    `;

    db.query(
        sql,
        [
            patientName || null,
            patientMobile || null,
            pLat,
            pLng,
            patientAddress || null,
            destinationHospitalId || null,
            destinationHospitalName || null,
            id
        ],
        (err, result) => {
            if (err) {
                console.error("Ambulance assign error:", err);
                return res.status(500).json({ message: "Database error." });
            }

            if (result.affectedRows === 0) {
                return res.status(409).json({
                    message: "Ambulance is not available for assignment (already assigned or not found)."
                });
            }

            db.query(
                `SELECT ${AMBULANCE_DETAIL_COLUMNS} FROM ambulances WHERE id = ? LIMIT 1`,
                [id],
                (getErr, rows) => {
                    if (getErr || rows.length === 0) {
                        return res.status(500).json({ message: "Assigned but fetch failed." });
                    }

                    const ambulance = rows[0];
                    const io = req.app.get("io");
                    if (io) {
                        io.emit("ambulance-assigned", ambulance);
                        io.emit("ambulance-status-updated", ambulance);
                    }

                    res.json({
                        success: true,
                        message: "Ambulance assigned successfully.",
                        ambulance
                    });
                }
            );
        }
    );
});

// RESET AMBULANCE
router.put("/api/ambulances/:id/reset", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;

    const sql = `
        UPDATE ambulances
        SET
            status = 'Available',
            patient_name = NULL,
            patient_mobile = NULL,
            patient_lat = NULL,
            patient_lng = NULL,
            patient_address = NULL,
            destination_hospital_id = NULL,
            destination_hospital_name = NULL,
            assigned_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Ambulance reset error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Ambulance not found." });
        }

        db.query(
            `SELECT ${AMBULANCE_DETAIL_COLUMNS} FROM ambulances WHERE id = ? LIMIT 1`,
            [id],
            (getErr, rows) => {
                if (getErr || rows.length === 0) {
                    return res.status(500).json({ message: "Reset but fetch failed." });
                }

                const ambulance = rows[0];
                const io = req.app.get("io");
                if (io) {
                    io.emit("ambulance-reset", ambulance);
                    io.emit("ambulance-status-updated", ambulance);
                }

                res.json({
                    success: true,
                    message: "Ambulance reset successfully.",
                    ambulance
                });
            }
        );
    });
});

// NEAREST AVAILABLE AMBULANCES (Haversine, DB-driven)
router.get("/api/ambulances/nearby/search", (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const limit = Math.min(Number(req.query.limit) || 5, 20);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ message: "lat and lng query params are required." });
    }

    const sql = `
        SELECT
            id, ambulance_id, vehicle_number, driver_name, driver_mobile,
            ambulance_type, hospital_name, location, status,
            latitude, longitude,
            (6371 * ACOS(
                COS(RADIANS(?)) * COS(RADIANS(latitude)) *
                COS(RADIANS(longitude) - RADIANS(?)) +
                SIN(RADIANS(?)) * SIN(RADIANS(latitude))
            )) AS distance_km
        FROM ambulances
        WHERE status = 'Available'
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
        ORDER BY distance_km ASC
        LIMIT ?
    `;

    db.query(sql, [lat, lng, lat, limit], (err, results) => {
        if (err) {
            console.error("Nearby ambulances error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        res.json({
            message: "Nearby ambulances fetched successfully.",
            ambulances: results.map(a => ({
                ...a,
                distance_km: a.distance_km !== null ? Number(a.distance_km.toFixed(2)) : null
            }))
        });
    });
});

// DELETE AMBULANCE
router.delete("/api/ambulances/:id", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;

    const sql = `
        DELETE FROM ambulances
        WHERE id = ?
    `;

    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Delete ambulance error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Ambulance not found." });
        }

        res.json({
            message: "Ambulance deleted successfully."
        });
    });
});

module.exports = router;
