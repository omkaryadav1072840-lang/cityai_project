const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken, requireRole } = require("../middleware/auth.middleware");

// =========================================================
// GET BED AVAILABILITY (Legacy table)
// =========================================================

router.get("/api/hospital/beds", (req, res) => {
    const sql = `
        SELECT
            id,
            hospital_name,
            general_beds,
            icu_beds,
            emergency_beds,
            private_beds,
            updated_at
        FROM hospital_beds
        ORDER BY hospital_name
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Bed fetch error:", err);
            return res.status(500).json({
                message: "Database error."
            });
        }

        res.json({
            message: "Bed availability fetched successfully.",
            beds: results
        });
    });
});

// UPDATE BED AVAILABILITY
router.put("/api/hospital/beds/:id", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;
    const { generalBeds, icuBeds, emergencyBeds, privateBeds } = req.body;

    if (
        generalBeds === undefined ||
        icuBeds === undefined ||
        emergencyBeds === undefined ||
        privateBeds === undefined
    ) {
        return res.status(400).json({
            message: "All bed values are required."
        });
    }

    const sql = `
        UPDATE hospital_beds
        SET
            general_beds = ?,
            icu_beds = ?,
            emergency_beds = ?,
            private_beds = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [generalBeds, icuBeds, emergencyBeds, privateBeds, id],
        (err, result) => {
            if (err) {
                console.error("Bed update error:", err);
                return res.status(500).json({
                    message: "Database error."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Hospital bed record not found."
                });
            }

            res.json({
                message: "Bed availability updated successfully."
            });
        }
    );
});

// =========================================================
// HOSPITAL INFORMATION
// =========================================================

// GET ALL HOSPITALS
router.get("/api/hospitals", (req, res) => {
    const sql = `
        SELECT
            id,
            hospital_id,
            hospital_name,
            address,
            phone,
            emergency_number,
            email,
            website,
            hospital_type,
            total_beds,
            icu_beds,
            emergency_beds,
            latitude,
            longitude,
            status,
            created_at
        FROM hospitals
        ORDER BY hospital_name ASC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Hospital fetch error:", err);
            return res.status(500).json({
                message: "Database error."
            });
        }

        res.json({
            message: "Hospital information fetched successfully.",
            hospitals: results
        });
    });
});

// GET NEAREST HOSPITALS (Haversine, DB-driven) — used by the emergency flow
router.get("/api/hospitals/nearby/search", (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const limit = Math.min(Number(req.query.limit) || 5, 20);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ message: "lat and lng query params are required." });
    }

    const sql = `
        SELECT
            id, hospital_id, hospital_name, address, phone, emergency_number,
            hospital_type, total_beds, icu_beds, emergency_beds, status,
            latitude, longitude,
            (6371 * ACOS(
                COS(RADIANS(?)) * COS(RADIANS(latitude)) *
                COS(RADIANS(longitude) - RADIANS(?)) +
                SIN(RADIANS(?)) * SIN(RADIANS(latitude))
            )) AS distance_km
        FROM hospitals
        WHERE latitude IS NOT NULL
          AND longitude IS NOT NULL
        ORDER BY distance_km ASC
        LIMIT ?
    `;

    db.query(sql, [lat, lng, lat, limit], (err, results) => {
        if (err) {
            console.error("Nearby hospitals error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        res.json({
            message: "Nearby hospitals fetched successfully.",
            hospitals: results.map(h => ({
                ...h,
                distance_km: h.distance_km !== null ? Number(h.distance_km.toFixed(2)) : null
            }))
        });
    });
});

// GET SINGLE HOSPITAL
router.get("/api/hospitals/:hospitalId", (req, res) => {
    const hospitalId = req.params.hospitalId;

    const sql = `
        SELECT
            id,
            hospital_id,
            hospital_name,
            address,
            phone,
            emergency_number,
            email,
            website,
            hospital_type,
            total_beds,
            icu_beds,
            emergency_beds,
            latitude,
            longitude,
            status
        FROM hospitals
        WHERE hospital_id = ?
        LIMIT 1
    `;

    db.query(sql, [hospitalId], (err, results) => {
        if (err) {
            console.error("Hospital search error:", err);
            return res.status(500).json({
                message: "Database error."
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Hospital not found."
            });
        }

        res.json({
            message: "Hospital found.",
            hospital: results[0]
        });
    });
});

// =========================================================
// HOSPITAL BEDS BY CATEGORY (Phase 2)
// =========================================================

router.get("/api/hospitals/:hospitalId/beds", (req, res) => {
    const hospitalId = req.params.hospitalId;

    const sql = `
        SELECT
            category,
            total_beds,
            occupied_beds,
            (total_beds - occupied_beds) AS available_beds,
            updated_at
        FROM hospital_bed_categories
        WHERE hospital_id = ?
        ORDER BY FIELD(category, 'General','ICU','Emergency','Private','Semi-Private','Pediatric','Maternity')
    `;

    db.query(sql, [hospitalId], (err, results) => {
        if (err) {
            console.error("Hospital beds fetch error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        res.json({
            message: "Bed availability fetched successfully.",
            beds: results
        });
    });
});

// =========================================================
// HOSPITAL TREATMENTS / DEPARTMENTS (Phase 2)
// =========================================================

router.get("/api/hospitals/:hospitalId/treatments", (req, res) => {
    const hospitalId = req.params.hospitalId;

    const sql = `
        SELECT
            hd.department_name,
            hd.approx_fee,
            (
                SELECT COUNT(*) FROM doctors doc
                WHERE doc.hospital_id = hd.hospital_id
                AND doc.department = hd.department_name
            ) AS available_doctors
        FROM hospital_departments hd
        WHERE hd.hospital_id = ?
        ORDER BY hd.department_name
    `;

    db.query(sql, [hospitalId], (err, results) => {
        if (err) {
            console.error("Hospital treatments fetch error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        res.json({
            message: "Treatments fetched successfully.",
            treatments: results
        });
    });
});

// =========================================================
// HOSPITAL DOCTORS (Phase 2)
// =========================================================

router.get("/api/hospitals/:hospitalId/doctors", (req, res) => {
    const hospitalId = req.params.hospitalId;

    const sql = `
        SELECT
            id, doctor_id, name, specialization, department,
            qualification, experience, mobile, email,
            consultation_fee, status
        FROM doctors
        WHERE hospital_id = ?
        ORDER BY name
    `;

    db.query(sql, [hospitalId], (err, results) => {
        if (err) {
            console.error("Hospital doctors fetch error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        res.json({
            message: "Hospital doctors fetched successfully.",
            doctors: results
        });
    });
});

// ADD HOSPITAL
router.post("/api/hospitals", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const {
        hospitalId,
        hospitalName,
        address,
        phone,
        emergencyNumber,
        email,
        website,
        hospitalType,
        totalBeds,
        icuBeds,
        emergencyBeds,
        latitude,
        longitude,
        status
    } = req.body;

    if (!hospitalId || !hospitalName) {
        return res.status(400).json({
            message: "Hospital ID and hospital name are required."
        });
    }

    const sql = `
        INSERT INTO hospitals
        (
            hospital_id,
            hospital_name,
            address,
            phone,
            emergency_number,
            email,
            website,
            hospital_type,
            total_beds,
            icu_beds,
            emergency_beds,
            latitude,
            longitude,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            hospitalId,
            hospitalName,
            address || null,
            phone || null,
            emergencyNumber || null,
            email || null,
            website || null,
            hospitalType || null,
            Number(totalBeds || 0),
            Number(icuBeds || 0),
            Number(emergencyBeds || 0),
            latitude || null,
            longitude || null,
            status || "Operational"
        ],
        (err, result) => {
            if (err) {
                console.error("Add hospital error:", err);
                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({
                        message: "Hospital ID already exists."
                    });
                }
                return res.status(500).json({
                    message: "Database error."
                });
            }

            res.status(201).json({
                message: "Hospital added successfully.",
                hospitalId: result.insertId
            });
        }
    );
});

// UPDATE HOSPITAL
router.put("/api/hospitals/:id", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;
    const {
        hospitalName,
        address,
        phone,
        emergencyNumber,
        email,
        website,
        hospitalType,
        totalBeds,
        icuBeds,
        emergencyBeds,
        latitude,
        longitude,
        status
    } = req.body;

    const sql = `
        UPDATE hospitals
        SET
            hospital_name = ?,
            address = ?,
            phone = ?,
            emergency_number = ?,
            email = ?,
            website = ?,
            hospital_type = ?,
            total_beds = ?,
            icu_beds = ?,
            emergency_beds = ?,
            latitude = ?,
            longitude = ?,
            status = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            hospitalName,
            address || null,
            phone || null,
            emergencyNumber || null,
            email || null,
            website || null,
            hospitalType || null,
            Number(totalBeds || 0),
            Number(icuBeds || 0),
            Number(emergencyBeds || 0),
            latitude || null,
            longitude || null,
            status || "Operational",
            id
        ],
        (err, result) => {
            if (err) {
                console.error("Hospital update error:", err);
                return res.status(500).json({
                    message: "Database error."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Hospital not found."
                });
            }

            res.json({
                message: "Hospital information updated successfully."
            });
        }
    );
});

module.exports = router;
