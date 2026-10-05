/**
 * SmartCity AI - Hospital Configuration & Admin Management Router
 * ==============================================================
 * Comprehensive, interconnected management for:
 * 1. Hospital Creation & Onboarding (Basic Info, Official Logo, Description, Accreditation)
 * 2. Dynamic Hospital Facilities Configuration (Enable/Disable, Custom Facilities)
 * 3. Hospital-Isolated Doctor Management (Consultation Timings, OPD Rooms, Schedules)
 * 4. Bed & Ward Hierarchy Architecture (Building/Wing -> Floor -> Ward -> Rooms -> Beds)
 * 5. ICU Specialty Suites (General ICU, CCU, NICU, PICU, Neuro, Surgical, Trauma)
 * 6. Diagnostic Test Catalogue & Pricing
 * 7. Change Audit History
 * 8. Official Medical Document Generation (Prescriptions & Reports with Hospital Logo)
 */

const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const db = require("../config/db");
const { authenticateToken, requireRole, optionalToken } = require("../middleware/auth.middleware");
const HospitalBedService = require("../services/hospital_bed_service");
const { emitHospitalBedUpdate } = require("../sockets/index");

const logoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

function validatePngBuffer(buffer) {
    if (!buffer || buffer.length < 8) return false;
    // Standard PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    for (let i = 0; i < 8; i++) {
        if (buffer[i] !== pngSignature[i]) return false;
    }
    return true;
}

/**
 * Helper to record administrative audit events
 */
async function recordHospitalAudit({ req, hospitalId, action, recordId, details = {}, oldValue = null, newValue = null }) {
    try {
        const pool = db.promise();
        const user = req.user || {};
        const metadata = {
            hospitalId,
            details,
            oldValue,
            newValue,
            userAgent: req.headers["user-agent"] || "System"
        };

        await pool.query(
            `INSERT INTO audit_logs 
             (user_id, user_name, role, department, action, module, record_id, ip_address, metadata, created_at)
             VALUES (?, ?, ?, ?, ?, 'hospital_admin', ?, ?, ?, NOW())`,
            [
                user.id || 0,
                user.name || "Hospital Admin",
                user.role || "hospital_admin",
                user.department || "Administration",
                action,
                String(recordId || hospitalId),
                req.ip || "127.0.0.1",
                JSON.stringify(metadata)
            ]
        );
    } catch (e) {
        console.warn("⚠️ [HospitalAuditError] Could not write audit log:", e.message);
    }
}

/**
 * Helper to dynamically resolve target hospital ID from params, body, query, or user session
 */
function resolveHospitalId(req) {
    return req.params.hospitalId || req.user?.hospitalId || req.user?.hospital_id || req.query.hospitalId || req.body?.hospital_id || "HOSP-001";
}

/**
 * Helper to enforce hospital-wise isolation for Hospital Admins.
 * Super Admins (role === 'admin' || 'superadmin' || 'super_admin') can access any hospital.
 * Hospital Admins can ONLY access their assigned hospitalId.
 */
function verifyHospitalIsolation(req, targetHospitalId) {
    const userRole = (req.user?.role || req.user?.type || "").toLowerCase();
    const staffHospId = req.user?.hospitalId || req.user?.hospital_id;

    if (userRole === "admin" || userRole === "superadmin" || userRole === "super_admin") {
        return true;
    }

    if (staffHospId && String(staffHospId).toLowerCase() === String(targetHospitalId).toLowerCase()) {
        return true;
    }

    return false;
}

// =========================================================================
// 1. HOSPITAL CONFIGURATION & PROFILE API
// =========================================================================

/**
 * GET /api/hospitals/:hospitalId/config OR /api/admin/hospital-config
 * Retrieves complete hospital configuration including logo, facilities, bed summary.
 */
router.get(["/api/hospitals/:hospitalId/config", "/api/admin/hospital-config"], optionalToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);
    const pool = db.promise();

    try {
        const [hRows] = await pool.query(
            `SELECT * FROM hospitals WHERE hospital_id = ? OR CAST(id AS CHAR) = ? LIMIT 1`,
            [hospitalId, hospitalId]
        );

        if (!hRows.length) {
            return res.status(404).json({ success: false, message: `Hospital "${hospitalId}" not found.` });
        }

        const hosp = hRows[0];

        // Fetch counts
        const [[{ total_doctors }]] = await pool.query(
            `SELECT COUNT(*) AS total_doctors FROM doctors WHERE (hospital_id = ? OR hospital_id = ?) AND status != 'Inactive'`,
            [hosp.hospital_id, hosp.id]
        );

        const [[{ total_wards }]] = await pool.query(
            `SELECT COUNT(*) AS total_wards FROM hospital_wards WHERE (hospital_id = ? OR hospital_id = ?)`,
            [hosp.hospital_id, hosp.id]
        );

        const [[{ total_ward_beds }]] = await pool.query(
            `SELECT COUNT(*) AS total_ward_beds FROM hospital_ward_beds WHERE (hospital_id = ? OR hospital_id = ?)`,
            [hosp.hospital_id, hosp.id]
        );

        const [[{ total_facilities }]] = await pool.query(
            `SELECT COUNT(*) AS total_facilities FROM hospital_facilities WHERE (hospital_id = ? OR hospital_id = ?) AND status = 'Active'`,
            [hosp.hospital_id, hosp.id]
        );

        const [[{ total_icu_suites }]] = await pool.query(
            `SELECT COUNT(*) AS total_icu_suites FROM hospital_icu_categories WHERE (hospital_id = ? OR hospital_id = ?) AND status = 'Active'`,
            [hosp.hospital_id, hosp.id]
        );

        res.json({
            success: true,
            hospital: hosp,
            summary: {
                total_doctors: Number(total_doctors || 0),
                total_wards: Number(total_wards || 0),
                total_ward_beds: Number(total_ward_beds || hosp.total_beds || 0),
                total_facilities: Number(total_facilities || 0),
                total_icu_suites: Number(total_icu_suites || 0)
            }
        });
    } catch (err) {
        console.error("Get hospital config error:", err);
        res.status(500).json({ success: false, message: "Database error fetching hospital config." });
    }
});

/**
 * PUT /api/hospitals/:hospitalId/config OR /api/admin/hospital-config (profile / logo)
 * Updates hospital configuration & identity (logo, contact, accreditation, description).
 */
router.put([
    "/api/hospitals/:hospitalId/config",
    "/api/admin/hospital-config",
    "/api/admin/hospital-config/profile",
    "/api/admin/hospital-config/logo"
], authenticateToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);

    // If explicit target hospital given in body (e.g. testing cross-tenant access)
    if (req.body.hospital_id && !verifyHospitalIsolation(req, req.body.hospital_id)) {
        return res.status(403).json({
            success: false,
            message: `Access denied. You are only authorized to manage hospital "${req.user?.hospitalId || req.user?.hospital_id}".`
        });
    }

    if (!verifyHospitalIsolation(req, hospitalId)) {
        return res.status(403).json({
            success: false,
            message: `Access denied. You are only authorized to manage hospital "${req.user?.hospitalId || req.user?.hospital_id}".`
        });
    }

    const {
        hospital_name,
        logo,
        address,
        city,
        phone,
        emergency_number,
        email,
        website,
        hospital_type,
        description,
        accreditation,
        total_beds,
        icu_beds,
        emergency_beds,
        status
    } = req.body;

    const pool = db.promise();

    try {
        const [oldRows] = await pool.query("SELECT * FROM hospitals WHERE hospital_id = ? OR CAST(id AS CHAR) = ?", [hospitalId, hospitalId]);
        if (!oldRows.length) {
            return res.status(404).json({ success: false, message: "Hospital not found." });
        }
        const oldHosp = oldRows[0];
        const effectiveHospId = oldHosp.hospital_id;

        const updates = [];
        const params = [];

        if (hospital_name !== undefined) { updates.push("hospital_name = ?"); params.push(hospital_name.trim()); }
        if (logo !== undefined) { updates.push("logo = ?"); params.push(logo ? logo.trim() : null); }
        if (address !== undefined) { updates.push("address = ?"); params.push(address.trim()); }
        if (city !== undefined) { updates.push("city = ?"); params.push(city.trim()); }
        if (phone !== undefined) { updates.push("phone = ?"); params.push(phone.trim()); }
        if (emergency_number !== undefined) { updates.push("emergency_number = ?"); params.push(emergency_number.trim()); }
        if (email !== undefined) { updates.push("email = ?"); params.push(email ? email.trim() : null); }
        if (website !== undefined) { updates.push("website = ?"); params.push(website ? website.trim() : null); }
        if (hospital_type !== undefined) { updates.push("hospital_type = ?"); params.push(hospital_type.trim()); }
        if (description !== undefined) { updates.push("description = ?"); params.push(description.trim()); }
        if (accreditation !== undefined) { updates.push("accreditation = ?"); params.push(accreditation.trim()); }
        if (total_beds !== undefined) { updates.push("total_beds = ?"); params.push(Number(total_beds)); }
        if (icu_beds !== undefined) { updates.push("icu_beds = ?"); params.push(Number(icu_beds)); }
        if (emergency_beds !== undefined) { updates.push("emergency_beds = ?"); params.push(Number(emergency_beds)); }
        if (status !== undefined) { updates.push("status = ?"); params.push(status); }

        if (!updates.length) {
            return res.status(400).json({ success: false, message: "No configuration fields provided to update." });
        }

        params.push(effectiveHospId);
        await pool.query(`UPDATE hospitals SET ${updates.join(", ")}, updated_at = NOW() WHERE hospital_id = ?`, params);

        // Keep hospital_beds summary in sync
        if (total_beds !== undefined || icu_beds !== undefined || emergency_beds !== undefined) {
            const finalTotal = total_beds !== undefined ? Number(total_beds) : oldHosp.total_beds;
            const finalIcu = icu_beds !== undefined ? Number(icu_beds) : oldHosp.icu_beds;
            const finalEmg = emergency_beds !== undefined ? Number(emergency_beds) : oldHosp.emergency_beds;
            const finalGen = Math.max(0, finalTotal - finalIcu - finalEmg);

            await pool.query(`
                INSERT INTO hospital_beds (hospital_name, general_beds, icu_beds, emergency_beds, private_beds, updated_at)
                VALUES (?, ?, ?, ?, 10, NOW())
                ON DUPLICATE KEY UPDATE 
                    general_beds = VALUES(general_beds),
                    icu_beds = VALUES(icu_beds),
                    emergency_beds = VALUES(emergency_beds),
                    updated_at = NOW()
            `, [oldHosp.hospital_name, finalGen, finalIcu, finalEmg]).catch(() => {});
        }

        // Record Audit Log
        await recordHospitalAudit({
            req,
            hospitalId: effectiveHospId,
            action: "UPDATE_HOSPITAL_CONFIG",
            recordId: effectiveHospId,
            details: { updatedFields: Object.keys(req.body) },
            oldValue: oldHosp,
            newValue: req.body
        });

        res.json({
            success: true,
            message: `Hospital configuration for "${hospital_name || oldHosp.hospital_name}" updated successfully.`,
            logo: logo !== undefined ? logo : oldHosp.logo
        });
    } catch (err) {
        console.error("Update hospital config error:", err);
        res.status(500).json({ success: false, message: "Database error updating hospital configuration." });
    }
});

// =========================================================================
// 1B. DEDICATED OFFICIAL PNG LOGO MANAGEMENT (STRICT PNG VALIDATION)
// =========================================================================

/**
 * POST /api/hospitals/:hospitalId/logo OR /api/admin/hospital-config/logo
 * Uploads/Updates official hospital logo. Enforces strict PNG validation:
 * - Extension: .png
 * - MIME: image/png
 * - Size: <= 5MB
 * - Magic Bytes: 89 50 4E 47 0D 0A 1A 0A
 */
router.post([
    "/api/hospitals/:hospitalId/logo",
    "/api/admin/hospital-config/logo"
], authenticateToken, (req, res, next) => {
    logoUpload.single("logo")(req, res, (err) => {
        if (err) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ success: false, message: "✕ Logo file size must be less than 5MB." });
            }
            return res.status(400).json({ success: false, message: "✕ Please upload a valid PNG hospital logo." });
        }
        next();
    });
}, async (req, res) => {
    const hospitalId = resolveHospitalId(req);

    if (!verifyHospitalIsolation(req, hospitalId)) {
        return res.status(403).json({
            success: false,
            message: `Access denied. You are only authorized to manage hospital "${req.user?.hospitalId || req.user?.hospital_id}".`
        });
    }

    let buffer = null;
    let originalName = "hospital_logo.png";

    if (req.file) {
        buffer = req.file.buffer;
        originalName = req.file.originalname || "hospital_logo.png";
    } else if (req.body.logo_base64 || req.body.logo) {
        const rawStr = req.body.logo_base64 || req.body.logo;
        if (typeof rawStr === "string") {
            const base64Data = rawStr.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
            buffer = Buffer.from(base64Data, "base64");
            if (req.body.filename) originalName = req.body.filename;
        }
    }

    if (!buffer) {
        return res.status(400).json({
            success: false,
            message: "✕ Please upload a valid PNG hospital logo."
        });
    }

    // 1. File extension validation
    const ext = path.extname(originalName).toLowerCase();
    if (ext && ext !== ".png") {
        return res.status(400).json({
            success: false,
            message: "✕ Please upload a valid PNG hospital logo."
        });
    }

    // 2. File size validation (<= 5MB)
    if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({
            success: false,
            message: "✕ Logo file size must be less than 5MB."
        });
    }

    // 3. Strict Magic Bytes validation (PNG Header: 89 50 4E 47 0D 0A 1A 0A)
    if (!validatePngBuffer(buffer)) {
        return res.status(400).json({
            success: false,
            message: "✕ Please upload a valid PNG hospital logo."
        });
    }

    const pool = db.promise();
    try {
        const [hRows] = await pool.query("SELECT * FROM hospitals WHERE hospital_id = ? OR CAST(id AS CHAR) = ?", [hospitalId, hospitalId]);
        if (!hRows.length) {
            return res.status(404).json({ success: false, message: "Hospital not found." });
        }
        const hosp = hRows[0];
        const effectiveHospId = hosp.hospital_id;

        // Ensure target directory exists
        const logoDir = path.join(__dirname, "..", "uploads", "hospital_logos");
        if (!fs.existsSync(logoDir)) {
            fs.mkdirSync(logoDir, { recursive: true });
        }

        const safeId = effectiveHospId.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
        const fileName = `logo-${safeId}-${Date.now()}.png`;
        const fullFilePath = path.join(logoDir, fileName);
        fs.writeFileSync(fullFilePath, buffer);

        const publicLogoUrl = `/uploads/hospital_logos/${fileName}`;

        // Update single source of truth in database: hospital.logo
        await pool.query("UPDATE hospitals SET logo = ?, updated_at = NOW() WHERE hospital_id = ?", [publicLogoUrl, effectiveHospId]);

        // Audit the branding update
        await recordHospitalAudit({
            req,
            hospitalId: effectiveHospId,
            action: "UPDATE_HOSPITAL_LOGO",
            recordId: effectiveHospId,
            details: { fileName, publicLogoUrl, sizeBytes: buffer.length },
            oldValue: { logo: hosp.logo },
            newValue: { logo: publicLogoUrl }
        });

        res.json({
            success: true,
            message: "✓ Hospital logo uploaded successfully.",
            logo: publicLogoUrl,
            hospital_id: effectiveHospId,
            hospital_name: hosp.hospital_name
        });
    } catch (err) {
        console.error("Logo upload database error:", err);
        res.status(500).json({ success: false, message: "Database error saving hospital logo." });
    }
});

/**
 * DELETE /api/hospitals/:hospitalId/logo OR /api/admin/hospital-config/logo
 * Removes custom logo, setting hospital.logo = NULL
 */
router.delete([
    "/api/hospitals/:hospitalId/logo",
    "/api/admin/hospital-config/logo"
], authenticateToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);

    if (!verifyHospitalIsolation(req, hospitalId)) {
        return res.status(403).json({
            success: false,
            message: `Access denied. You are only authorized to manage hospital "${req.user?.hospitalId || req.user?.hospital_id}".`
        });
    }

    const pool = db.promise();
    try {
        const [hRows] = await pool.query("SELECT * FROM hospitals WHERE hospital_id = ? OR CAST(id AS CHAR) = ?", [hospitalId, hospitalId]);
        if (!hRows.length) {
            return res.status(404).json({ success: false, message: "Hospital not found." });
        }
        const hosp = hRows[0];
        const effectiveHospId = hosp.hospital_id;

        await pool.query("UPDATE hospitals SET logo = NULL, updated_at = NOW() WHERE hospital_id = ?", [effectiveHospId]);

        await recordHospitalAudit({
            req,
            hospitalId: effectiveHospId,
            action: "REMOVE_HOSPITAL_LOGO",
            recordId: effectiveHospId,
            details: { previousLogo: hosp.logo },
            oldValue: { logo: hosp.logo },
            newValue: { logo: null }
        });

        res.json({
            success: true,
            message: "✓ Hospital logo removed successfully.",
            logo: null,
            hospital_id: effectiveHospId
        });
    } catch (err) {
        console.error("Logo delete error:", err);
        res.status(500).json({ success: false, message: "Database error removing hospital logo." });
    }
});

/**
 * GET /api/hospitals/:hospitalId/logo OR /api/admin/hospital-config/logo
 * Retrieves official hospital logo from single source of truth (hospitals table).
 */
router.get([
    "/api/hospitals/:hospitalId/logo",
    "/api/admin/hospital-config/logo"
], optionalToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);
    const pool = db.promise();
    try {
        const [hRows] = await pool.query("SELECT hospital_id, hospital_name, logo FROM hospitals WHERE hospital_id = ? OR CAST(id AS CHAR) = ?", [hospitalId, hospitalId]);
        if (!hRows.length) {
            return res.status(404).json({ success: false, message: "Hospital not found." });
        }
        res.json({
            success: true,
            hospital_id: hRows[0].hospital_id,
            hospital_name: hRows[0].hospital_name,
            logo: hRows[0].logo
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Database error fetching hospital logo." });
    }
});

// =========================================================================
// 2. HOSPITAL FACILITIES MANAGEMENT API
// =========================================================================

/**
 * GET /api/hospitals/:hospitalId/facilities OR /api/admin/hospital-config/facilities
 * Retrieves all facilities for this hospital.
 */
router.get(["/api/hospitals/:hospitalId/facilities", "/api/admin/hospital-config/facilities"], optionalToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);
    const pool = db.promise();

    try {
        const [facilities] = await pool.query(
            `SELECT * FROM hospital_facilities WHERE hospital_id = ? OR hospital_id = (SELECT id FROM hospitals WHERE hospital_id = ? LIMIT 1) ORDER BY category ASC, facility_name ASC`,
            [hospitalId, hospitalId]
        );

        res.json({
            success: true,
            count: facilities.length,
            facilities
        });
    } catch (err) {
        console.error("Get facilities error:", err);
        res.status(500).json({ success: false, message: "Error fetching hospital facilities." });
    }
});

/**
 * POST /api/hospitals/:hospitalId/facilities OR /api/admin/hospital-config/facilities
 * Add a new or custom facility for this hospital.
 */
router.post(["/api/hospitals/:hospitalId/facilities", "/api/admin/hospital-config/facilities"], authenticateToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);

    if (!verifyHospitalIsolation(req, hospitalId)) {
        return res.status(403).json({ success: false, message: "Access denied." });
    }

    const { facility_name, facility_code, category, status } = req.body;

    if (!facility_name || !facility_name.trim()) {
        return res.status(400).json({ success: false, message: "Facility name is required." });
    }

    const code = (facility_code || ("FAC_" + facility_name.toUpperCase().replace(/[^A-Z0-9]/g, "_"))).slice(0, 50);
    const cat = category || "Clinical Specialty";
    const stat = status || "Active";

    const pool = db.promise();
    try {
        await pool.query(`
            INSERT INTO hospital_facilities 
            (hospital_id, facility_name, facility_code, category, status, is_custom)
            VALUES (?, ?, ?, ?, ?, 1)
            ON DUPLICATE KEY UPDATE 
                facility_name = VALUES(facility_name),
                category = VALUES(category),
                status = VALUES(status)
        `, [hospitalId, facility_name.trim(), code, cat, stat]);

        // Dual persistence in hospitals.facilities JSON column
        if (stat === "Active") {
            const [hRows] = await pool.query("SELECT facilities FROM hospitals WHERE hospital_id = ?", [hospitalId]);
            let currFacs = [];
            if (hRows.length && hRows[0].facilities) {
                currFacs = typeof hRows[0].facilities === "string" ? JSON.parse(hRows[0].facilities) : hRows[0].facilities;
            }
            if (!currFacs.includes(facility_name.trim())) {
                currFacs.push(facility_name.trim());
                await pool.query("UPDATE hospitals SET facilities = ? WHERE hospital_id = ?", [
                    JSON.stringify(currFacs),
                    hospitalId
                ]);
            }
        }

        await recordHospitalAudit({
            req,
            hospitalId,
            action: "ADD_HOSPITAL_FACILITY",
            recordId: code,
            details: { facility_name, code, category: cat }
        });

        res.status(201).json({
            success: true,
            message: `Facility "${facility_name}" configured successfully.`,
            facility: { hospital_id: hospitalId, facility_name, facility_code: code, category: cat, status: stat }
        });
    } catch (err) {
        console.error("Add facility error:", err);
        res.status(500).json({ success: false, message: "Database error configuring facility." });
    }
});

/**
 * PUT /api/hospitals/:hospitalId/facilities/:facilityCode/status (or /toggle)
 * Toggle facility active / inactive status.
 */
router.put([
    "/api/hospitals/:hospitalId/facilities/:facilityCode/status",
    "/api/admin/hospital-config/facilities/:facilityCode/toggle",
    "/api/admin/hospital-config/facilities/:facilityCode/status"
], authenticateToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);
    const { facilityCode } = req.params;

    if (!verifyHospitalIsolation(req, hospitalId)) {
        return res.status(403).json({ success: false, message: "Access denied." });
    }

    let newStatus = "Active";
    if (req.body.status !== undefined) {
        newStatus = (req.body.status === "Active" || req.body.status === 1 || req.body.status === true) ? "Active" : "Inactive";
    } else if (req.body.is_active !== undefined) {
        newStatus = (req.body.is_active === 1 || req.body.is_active === true || req.body.is_active === "1") ? "Active" : "Inactive";
    }

    const pool = db.promise();

    try {
        const [hRows] = await pool.query("SELECT id, hospital_id FROM hospitals WHERE hospital_id = ? OR CAST(id AS CHAR) = ? LIMIT 1", [hospitalId, hospitalId]);
        const effectiveHospId = hRows[0]?.hospital_id || hospitalId;
        const effectiveNumId = hRows[0]?.id ? String(hRows[0].id) : effectiveHospId;

        await pool.query(
            `UPDATE hospital_facilities SET status = ? WHERE (hospital_id = ? OR hospital_id = ?) AND (facility_code = ? OR CAST(id AS CHAR) = ?)`,
            [newStatus, effectiveHospId, effectiveNumId, facilityCode, facilityCode]
        );

        // Keep hospitals.facilities JSON column in sync
        const [activeFacs] = await pool.query(
            "SELECT facility_name FROM hospital_facilities WHERE (hospital_id = ? OR hospital_id = ?) AND status = 'Active'",
            [effectiveHospId, effectiveNumId]
        );
        const facNames = activeFacs.map(f => f.facility_name);
        await pool.query("UPDATE hospitals SET facilities = ? WHERE hospital_id = ? OR CAST(id AS CHAR) = ?", [
            JSON.stringify(facNames),
            effectiveHospId,
            effectiveHospId
        ]);

        await recordHospitalAudit({
            req,
            hospitalId,
            action: "TOGGLE_FACILITY_STATUS",
            recordId: facilityCode,
            details: { newStatus }
        });

        res.json({
            success: true,
            message: `Facility "${facilityCode}" marked as ${newStatus}.`,
            status: newStatus
        });
    } catch (err) {
        console.error("Toggle facility error:", err);
        res.status(500).json({ success: false, message: "Database error updating facility status." });
    }
});

/**
 * DELETE /api/hospitals/:hospitalId/facilities/:facilityCode
 * Remove custom facility.
 */
router.delete([
    "/api/hospitals/:hospitalId/facilities/:facilityCode",
    "/api/admin/hospital-config/facilities/:facilityCode"
], authenticateToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);
    const { facilityCode } = req.params;

    if (!verifyHospitalIsolation(req, hospitalId)) {
        return res.status(403).json({ success: false, message: "Access denied." });
    }

    const pool = db.promise();
    try {
        await pool.query(
            `DELETE FROM hospital_facilities WHERE (hospital_id = ? OR hospital_id = (SELECT id FROM hospitals WHERE hospital_id = ? LIMIT 1)) AND (facility_code = ? OR CAST(id AS CHAR) = ?)`,
            [hospitalId, hospitalId, facilityCode, facilityCode]
        );

        await recordHospitalAudit({
            req,
            hospitalId,
            action: "DELETE_FACILITY",
            recordId: facilityCode
        });

        res.json({ success: true, message: `Facility "${facilityCode}" deleted successfully.` });
    } catch (err) {
        console.error("Delete facility error:", err);
        res.status(500).json({ success: false, message: "Database error deleting facility." });
    }
});

// =========================================================================
// 3. HOSPITAL DOCTORS & OPD TIMINGS MANAGEMENT
// =========================================================================

/**
 * GET /api/hospitals/:hospitalId/doctors OR /api/admin/hospital-config/doctors
 * Retrieves all doctors with their OPD room and timing configurations.
 */
router.get(["/api/hospitals/:hospitalId/doctors", "/api/admin/hospital-config/doctors"], optionalToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);
    const pool = db.promise();

    try {
        const [doctors] = await pool.query(`
            SELECT 
                d.id,
                d.doctor_id,
                d.name,
                d.specialization,
                d.department,
                d.qualification,
                d.experience,
                d.mobile,
                d.email,
                d.consultation_fee,
                d.opd_room_no,
                d.available_days,
                d.consultation_timings,
                d.doctor_logo_avatar,
                d.status,
                d.created_at,
                h.hospital_name,
                h.logo AS hospital_logo
            FROM doctors d
            LEFT JOIN hospitals h ON (d.hospital_id = h.hospital_id OR d.hospital_id = h.id)
            WHERE (d.hospital_id = ? OR d.hospital_id = (SELECT id FROM hospitals WHERE hospital_id = ? LIMIT 1))
            ORDER BY d.name ASC
        `, [hospitalId, hospitalId]);

        res.json({
            success: true,
            hospital_id: hospitalId,
            count: doctors.length,
            doctors
        });
    } catch (err) {
        console.error("Get hospital doctors error:", err);
        res.status(500).json({ success: false, message: "Database error fetching hospital doctors." });
    }
});

/**
 * POST /api/hospitals/:hospitalId/doctors OR /api/admin/hospital-config/doctors
 * Add a new doctor with OPD Room number and consultation timings.
 */
router.post(["/api/hospitals/:hospitalId/doctors", "/api/admin/hospital-config/doctors"], authenticateToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);

    if (!verifyHospitalIsolation(req, hospitalId)) {
        return res.status(403).json({ success: false, message: "Access denied. You can only add doctors to your assigned hospital." });
    }

    const {
        doctor_id,
        name,
        specialization,
        department,
        qualification,
        experience,
        mobile,
        email,
        password,
        consultation_fee,
        opd_room_no,
        available_days,
        consultation_timings,
        doctor_logo_avatar,
        status
    } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: "Doctor full name is required." });
    }

    const pool = db.promise();
    try {
        let docId = doctor_id ? String(doctor_id).trim() : null;
        if (!docId) {
            const [[{ count }]] = await pool.query("SELECT COUNT(*) AS count FROM doctors");
            docId = `DOC-${hospitalId.replace(/[^A-Za-z0-9]/g, "")}-${String(count + 1).padStart(3, "0")}`;
        }

        const fee = Number(consultation_fee || 500);
        const exp = Number(experience || 5);
        const stat = status || "Available";
        const daysStr = Array.isArray(available_days) ? available_days.join(", ") : (available_days || "Mon, Tue, Wed, Thu, Fri, Sat");

        const [insertRes] = await pool.query(`
            INSERT INTO doctors 
            (doctor_id, name, specialization, department, hospital_id, qualification, experience, mobile, email, password, consultation_fee, opd_room_no, available_days, consultation_timings, doctor_logo_avatar, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            docId,
            name.trim(),
            specialization ? specialization.trim() : "Specialist Physician",
            department ? department.trim() : "General Medicine",
            hospitalId,
            qualification ? qualification.trim() : "MBBS, MD",
            exp,
            mobile || "9876543210",
            email || null,
            password || "doctor123",
            fee,
            opd_room_no || "Room OPD-101",
            daysStr,
            consultation_timings || "09:00 AM - 01:00 PM",
            doctor_logo_avatar || null,
            stat
        ]);

        // Auto-increment hospital doctor count
        await pool.query(
            "UPDATE hospitals SET doctors_count = (SELECT COUNT(*) FROM doctors WHERE hospital_id = ? AND status != 'Inactive') WHERE hospital_id = ?",
            [hospitalId, hospitalId]
        );

        await recordHospitalAudit({
            req,
            hospitalId,
            action: "ADD_DOCTOR",
            recordId: docId,
            details: { name, specialization, department, opd_room_no }
        });

        res.status(201).json({
            success: true,
            message: `Doctor ${name} (${docId}) assigned to hospital ${hospitalId}.`,
            doctorId: docId,
            doctor_id: docId,
            id: insertRes.insertId,
            doctor: { id: insertRes.insertId, doctor_id: docId, name, specialization, department, hospital_id: hospitalId }
        });
    } catch (err) {
        console.error("Add doctor error:", err);
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ success: false, message: "Doctor ID already exists." });
        }
        res.status(500).json({ success: false, message: "Database error adding doctor." });
    }
});

/**
 * PUT /api/hospitals/:hospitalId/doctors/:doctorId OR /api/admin/hospital-config/doctors/:doctorId
 * Edit doctor details, department, room, and timings.
 */
router.put([
    "/api/hospitals/:hospitalId/doctors/:doctorId",
    "/api/admin/hospital-config/doctors/:doctorId"
], authenticateToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);
    const { doctorId } = req.params;

    if (!verifyHospitalIsolation(req, hospitalId)) {
        return res.status(403).json({ success: false, message: "Access denied." });
    }

    const {
        name,
        specialization,
        department,
        qualification,
        experience,
        mobile,
        email,
        consultation_fee,
        opd_room_no,
        available_days,
        consultation_timings,
        doctor_logo_avatar,
        status
    } = req.body;

    const pool = db.promise();
    try {
        const [docRows] = await pool.query(
            "SELECT * FROM doctors WHERE (doctor_id = ? OR CAST(id AS CHAR) = ?)",
            [doctorId, doctorId]
        );

        if (!docRows.length) {
            return res.status(404).json({ success: false, message: `Doctor "${doctorId}" not found.` });
        }

        const updates = [];
        const params = [];

        if (name !== undefined) { updates.push("name = ?"); params.push(name.trim()); }
        if (specialization !== undefined) { updates.push("specialization = ?"); params.push(specialization.trim()); }
        if (department !== undefined) { updates.push("department = ?"); params.push(department.trim()); }
        if (qualification !== undefined) { updates.push("qualification = ?"); params.push(qualification.trim()); }
        if (experience !== undefined) { updates.push("experience = ?"); params.push(Number(experience)); }
        if (mobile !== undefined) { updates.push("mobile = ?"); params.push(mobile.trim()); }
        if (email !== undefined) { updates.push("email = ?"); params.push(email ? email.trim() : null); }
        if (consultation_fee !== undefined) { updates.push("consultation_fee = ?"); params.push(Number(consultation_fee)); }
        if (opd_room_no !== undefined) { updates.push("opd_room_no = ?"); params.push(opd_room_no.trim()); }
        if (available_days !== undefined) { 
            updates.push("available_days = ?"); 
            params.push(Array.isArray(available_days) ? available_days.join(", ") : available_days.trim()); 
        }
        if (consultation_timings !== undefined) { updates.push("consultation_timings = ?"); params.push(consultation_timings.trim()); }
        if (doctor_logo_avatar !== undefined) { updates.push("doctor_logo_avatar = ?"); params.push(doctor_logo_avatar); }
        if (status !== undefined) { updates.push("status = ?"); params.push(status); }

        if (!updates.length) {
            return res.status(400).json({ success: false, message: "No doctor fields provided to update." });
        }

        params.push(doctorId, doctorId);
        await pool.query(
            `UPDATE doctors SET ${updates.join(", ")}, updated_at = NOW() WHERE (doctor_id = ? OR CAST(id AS CHAR) = ?)`,
            params
        );

        await recordHospitalAudit({
            req,
            hospitalId,
            action: "UPDATE_DOCTOR",
            recordId: doctorId,
            details: { updatedFields: Object.keys(req.body) }
        });

        res.json({ success: true, message: `Doctor ${doctorId} updated successfully.` });
    } catch (err) {
        console.error("Update doctor error:", err);
        res.status(500).json({ success: false, message: "Database error updating doctor." });
    }
});

/**
 * DELETE /api/hospitals/:hospitalId/doctors/:doctorId OR /api/admin/hospital-config/doctors/:doctorId
 * Safely deactivates doctor (preserves old prescriptions and patient history!).
 */
router.delete([
    "/api/hospitals/:hospitalId/doctors/:doctorId",
    "/api/admin/hospital-config/doctors/:doctorId"
], authenticateToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);
    const { doctorId } = req.params;

    if (!verifyHospitalIsolation(req, hospitalId)) {
        return res.status(403).json({ success: false, message: "Access denied." });
    }

    const pool = db.promise();
    try {
        await pool.query(
            "UPDATE doctors SET status = 'Inactive', updated_at = NOW() WHERE (doctor_id = ? OR CAST(id AS CHAR) = ?)",
            [doctorId, doctorId]
        );

        // Update count directly
        const [[{ count }]] = await pool.query(
            "SELECT COUNT(*) AS count FROM doctors WHERE (hospital_id = ? OR hospital_id = (SELECT id FROM hospitals WHERE hospital_id = ? LIMIT 1)) AND status != 'Inactive'",
            [hospitalId, hospitalId]
        );
        await pool.query(
            "UPDATE hospitals SET doctors_count = ? WHERE hospital_id = ? OR CAST(id AS CHAR) = ?",
            [count, hospitalId, hospitalId]
        );

        await recordHospitalAudit({
            req,
            hospitalId,
            action: "DEACTIVATE_DOCTOR",
            recordId: doctorId
        });

        res.json({ success: true, message: `Doctor ${doctorId} marked Inactive. Patient historical records preserved.` });
    } catch (err) {
        console.error("Deactivate doctor error:", err);
        res.status(500).json({ success: false, message: "Database error deactivating doctor." });
    }
});

// =========================================================================
// 4. BEDS & WARDS HIERARCHY ARCHITECTURE API
// =========================================================================

/**
 * Helper to recalculate and synchronize hospital bed counts across wards and hospitals registry
 */
async function recalculateHospitalBedCounts(pool, hospitalId) {
    try {
        await pool.query(`
            UPDATE hospital_wards w
            SET total_beds = (SELECT COUNT(*) FROM hospital_ward_beds WHERE (ward_id = w.ward_id OR ward_id = CAST(w.id AS CHAR)) AND status != 'Retired'),
                occupied_beds = (SELECT COUNT(*) FROM hospital_ward_beds WHERE (ward_id = w.ward_id OR ward_id = CAST(w.id AS CHAR)) AND status = 'Occupied')
            WHERE hospital_id = ? OR hospital_id = (SELECT CAST(id AS CHAR) FROM hospitals WHERE hospital_id = ? LIMIT 1)
        `, [hospitalId, hospitalId]);

        await pool.query(`
            UPDATE hospitals h SET
                total_beds = (SELECT COUNT(*) FROM hospital_ward_beds WHERE hospital_id = h.hospital_id AND status != 'Retired'),
                icu_beds = (SELECT COUNT(*) FROM hospital_ward_beds WHERE hospital_id = h.hospital_id AND (bed_type = 'ICU' OR bed_category LIKE '%ICU%') AND status != 'Retired'),
                emergency_beds = (SELECT COUNT(*) FROM hospital_ward_beds WHERE hospital_id = h.hospital_id AND (bed_type = 'Emergency' OR bed_category LIKE '%Emergency%') AND status != 'Retired')
            WHERE h.hospital_id = ?
        `, [hospitalId]);

        const freshData = await HospitalBedService.getGorakhpurBedAvailability();
        if (freshData) {
            emitHospitalBedUpdate(freshData);
        }
    } catch (e) {
        console.warn("⚠️ [RecalculateBedCounts Warning]:", e.message);
    }
}

/**
 * GET /api/hospitals/:hospitalId/ward-structure OR /api/hospitals/:hospitalId/physical-structure
 * Complete 4-tier hierarchy: Hospital -> Building/Block -> Floor -> Ward/Room -> Beds
 * Live calculated summaries: Total, Available, Occupied, Reserved, Maintenance
 */
router.get([
    "/api/hospitals/:hospitalId/ward-structure",
    "/api/hospitals/:hospitalId/physical-structure",
    "/api/admin/hospital-config/wards",
    "/api/admin/hospital-config/physical-structure"
], optionalToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);
    const pool = db.promise();

    try {
        const [hospRows] = await pool.query(
            "SELECT hospital_id, hospital_name, logo, total_beds, icu_beds, emergency_beds FROM hospitals WHERE hospital_id = ? OR id = ? LIMIT 1",
            [hospitalId, isNaN(hospitalId) ? -1 : parseInt(hospitalId, 10)]
        );
        const hospital = hospRows[0] || { hospital_id: hospitalId, hospital_name: hospitalId };

        const [wards] = await pool.query(
            `SELECT * FROM hospital_wards 
             WHERE (hospital_id = ? OR hospital_id = (SELECT id FROM hospitals WHERE hospital_id = ? LIMIT 1))
               AND (status != 'Retired' OR status IS NULL)
             ORDER BY building_wing ASC, floor ASC, ward_name ASC`,
            [hospitalId, hospitalId]
        );

        const [beds] = await pool.query(
            `SELECT b.* 
             FROM hospital_ward_beds b
             WHERE (b.hospital_id = ? OR b.hospital_id = (SELECT id FROM hospitals WHERE hospital_id = ? LIMIT 1))
               AND (b.status != 'Retired' OR b.status IS NULL)
             ORDER BY b.building_wing ASC, b.floor ASC, b.room_number ASC, b.bed_number ASC`,
            [hospitalId, hospitalId]
        );

        // Group beds by ward_id and calculate room/ward summaries
        const structure = wards.map(w => {
            const wardBeds = beds.filter(b => b.ward_id === w.ward_id || b.ward_id === String(w.id));
            const occupied = wardBeds.filter(b => b.status === "Occupied").length;
            const available = wardBeds.filter(b => b.status === "Available").length;
            const reserved = wardBeds.filter(b => b.status === "Reserved").length;
            const maintenance = wardBeds.filter(b => ["Maintenance", "Cleaning", "Blocked"].includes(b.status)).length;

            return {
                ...w,
                base_rate_per_day: Number(w.charge_per_day || w.base_rate_per_day || 0),
                charge_per_day: Number(w.charge_per_day || w.base_rate_per_day || 0),
                total_beds: wardBeds.length || w.total_beds,
                total_beds_actual: wardBeds.length || w.total_beds,
                occupied_beds: occupied,
                occupied_beds_actual: occupied,
                available_beds: available,
                available_beds_actual: available,
                reserved_beds: reserved,
                maintenance_beds: maintenance,
                beds: wardBeds
            };
        });

        // Construct 4-tier tree: Building -> Floor -> Ward/Room -> Beds
        const buildingsMap = new Map();
        for (const w of structure) {
            const bName = (w.building_wing || "Block A").trim();
            const fName = (w.floor || "1st Floor").trim();

            if (!buildingsMap.has(bName)) {
                buildingsMap.set(bName, {
                    building_name: bName,
                    total_beds: 0,
                    available_beds: 0,
                    occupied_beds: 0,
                    reserved_beds: 0,
                    maintenance_beds: 0,
                    floorsMap: new Map()
                });
            }

            const bObj = buildingsMap.get(bName);
            bObj.total_beds += w.total_beds;
            bObj.available_beds += w.available_beds;
            bObj.occupied_beds += w.occupied_beds;
            bObj.reserved_beds += w.reserved_beds;
            bObj.maintenance_beds += w.maintenance_beds;

            if (!bObj.floorsMap.has(fName)) {
                bObj.floorsMap.set(fName, {
                    floor_name: fName,
                    building_name: bName,
                    total_beds: 0,
                    available_beds: 0,
                    occupied_beds: 0,
                    reserved_beds: 0,
                    maintenance_beds: 0,
                    wards: []
                });
            }

            const fObj = bObj.floorsMap.get(fName);
            fObj.total_beds += w.total_beds;
            fObj.available_beds += w.available_beds;
            fObj.occupied_beds += w.occupied_beds;
            fObj.reserved_beds += w.reserved_beds;
            fObj.maintenance_beds += w.maintenance_beds;
            fObj.wards.push(w);
        }

        const buildings = Array.from(buildingsMap.values()).map(b => ({
            building_name: b.building_name,
            total_beds: b.total_beds,
            available_beds: b.available_beds,
            occupied_beds: b.occupied_beds,
            reserved_beds: b.reserved_beds,
            maintenance_beds: b.maintenance_beds,
            floors: Array.from(b.floorsMap.values())
        }));

        // Build structure dictionary (Building -> Floor -> Ward) for fast access
        const structureObj = {};
        for (const b of buildings) {
            structureObj[b.building_name] = {
                name: b.building_name,
                building_name: b.building_name,
                total_beds: b.total_beds,
                available_beds: b.available_beds,
                occupied_beds: b.occupied_beds,
                reserved_beds: b.reserved_beds,
                floors: {}
            };
            for (const f of b.floors) {
                structureObj[b.building_name].floors[f.floor_name] = {
                    floor_name: f.floor_name,
                    total_beds: f.total_beds,
                    available_beds: f.available_beds,
                    occupied_beds: f.occupied_beds,
                    reserved_beds: f.reserved_beds,
                    wards: f.wards
                };
            }
        }

        // Dynamic Hospital-level Totals
        const totalBeds = beds.length;
        const availableBeds = beds.filter(b => b.status === "Available").length;
        const occupiedBeds = beds.filter(b => b.status === "Occupied").length;
        const reservedBeds = beds.filter(b => b.status === "Reserved").length;
        const maintenanceBeds = beds.filter(b => ["Maintenance", "Cleaning", "Blocked"].includes(b.status)).length;
        const icuBeds = beds.filter(b => b.bed_type === "ICU" || (b.bed_category && b.bed_category.includes("ICU"))).length;
        const emergencyBeds = beds.filter(b => b.bed_type === "Emergency" || (b.bed_category && b.bed_category.includes("Emergency"))).length;
        const privateBeds = beds.filter(b => b.bed_type === "Private" || (b.bed_category && (b.bed_category.includes("Private") || b.bed_category.includes("Suite")))).length;
        const generalBeds = totalBeds - icuBeds - emergencyBeds - privateBeds;

        const totalFloorsCount = Array.from(new Set(wards.map(w => `${(w.building_wing || 'Block A').trim()}_${(w.floor || '1st Floor').trim()}`))).length;

        res.json({
            success: true,
            hospital_id: hospitalId,
            hospital_name: hospital.hospital_name,
            hospital_logo: hospital.logo,
            totals: {
                total_beds: totalBeds,
                available_beds: availableBeds,
                occupied_beds: occupiedBeds,
                reserved_beds: reservedBeds,
                maintenance_beds: maintenanceBeds,
                icu_beds: icuBeds,
                emergency_beds: emergencyBeds,
                private_beds: privateBeds,
                general_beds: Math.max(0, generalBeds)
            },
            total_buildings: buildings.length,
            total_floors: totalFloorsCount,
            total_rooms: wards.length,
            buildings_count: buildings.length,
            floors_count: totalFloorsCount,
            wards_count: wards.length,
            structure: structureObj,
            buildings,
            wards: structure
        });
    } catch (err) {
        console.error("Get physical structure error:", err);
        res.status(500).json({ success: false, message: "Database error fetching physical bed architecture." });
    }
});

/**
 * POST /api/hospitals/:hospitalId/configure-ward-room OR /api/admin/hospital-config/configure-ward-room
 * Complete physical configuration: Building -> Floor -> Ward/Room -> Automatic or Custom Beds
 */
router.post([
    "/api/hospitals/:hospitalId/configure-ward-room",
    "/api/admin/hospital-config/configure-ward-room"
], authenticateToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);
    if (!verifyHospitalIsolation(req, hospitalId)) {
        return res.status(403).json({ success: false, message: "Access denied." });
    }

    const {
        building_name,
        floor_name,
        ward_name,
        ward_type,
        bed_category,
        charge_per_day,
        total_beds,
        bed_prefix,
        bed_numbers,
        department
    } = req.body;

    if (!ward_name || !ward_name.trim()) {
        return res.status(400).json({ success: false, message: "Room/Ward name is required." });
    }

    const pool = db.promise();
    try {
        const bName = (building_name || req.body.building_wing || "Block A").trim();
        const fName = (floor_name || req.body.floor || "1st Floor").trim();
        const wName = ward_name.trim();
        const wType = ward_type || "General";
        const bCategory = bed_category || wName;
        const charge = Number(charge_per_day || req.body.base_rate_per_day || req.body.charge || (wType === "ICU" ? 3500 : (wType === "Emergency" ? 1200 : (wType === "Private" ? 2800 : 500))));
        const tBeds = Math.max(1, Number(total_beds || (Array.isArray(bed_numbers) && bed_numbers.length > 0 ? bed_numbers.length : 10)));

        // Generate clean ward_id
        const [[{ count }]] = await pool.query("SELECT COUNT(*) AS count FROM hospital_wards WHERE hospital_id = ?", [hospitalId]);
        const wardId = `WARD-${wType.slice(0, 3).toUpperCase()}-${String(count + 1).padStart(2, "0")}`;

        // Insert hospital_wards record
        await pool.query(`
            INSERT INTO hospital_wards
            (ward_id, hospital_id, ward_name, ward_type, building_wing, floor, department, total_beds, occupied_beds, charge_per_day, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'Active')
        `, [
            wardId,
            hospitalId,
            wName,
            wType,
            bName,
            fName,
            department || (wType === "ICU" ? "Critical Care" : (wType === "Emergency" ? "Trauma & Emergency" : "General Medicine")),
            tBeds,
            charge
        ]);

        // Auto-generate or use custom bed numbers
        let prefix = (bed_prefix || wType.slice(0, 3)).toUpperCase().trim();
        if (prefix === "GEN") prefix = "GEN";

        const floorMatch = fName.match(/\d+/);
        const floorNum = floorMatch ? parseInt(floorMatch[0], 10) : 1;
        const startSeq = floorNum * 100 + 1; // e.g. 301 for 3rd Floor

        const generatedBeds = [];
        for (let i = 0; i < tBeds; i++) {
            let bNumber = (Array.isArray(bed_numbers) && bed_numbers[i]) 
                ? String(bed_numbers[i]).trim() 
                : `${prefix}-${startSeq + i}`;
            
            const bId = `BED-${hospitalId.replace(/[^A-Za-z0-9]/g, "")}-${wardId}-${bNumber.replace(/[^A-Za-z0-9_-]/g, "")}`;
            const roomNum = `Room-${Math.floor((startSeq + i) / 10) * 10 || startSeq + i}`;

            await pool.query(`
                INSERT INTO hospital_ward_beds
                (bed_id, hospital_id, ward_id, building_wing, floor, room_number, bed_number, bed_type, bed_category, charge, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available', 'Sanitized and ready')
                ON DUPLICATE KEY UPDATE 
                    bed_number = VALUES(bed_number),
                    bed_type = VALUES(bed_type),
                    bed_category = VALUES(bed_category),
                    charge = VALUES(charge),
                    building_wing = VALUES(building_wing),
                    floor = VALUES(floor)
            `, [
                bId,
                hospitalId,
                wardId,
                bName,
                fName,
                roomNum,
                bNumber,
                wType,
                bCategory,
                charge
            ]);

            generatedBeds.push({
                bed_id: bId,
                bed_number: bNumber,
                room_number: roomNum,
                status: "Available",
                charge
            });
        }

        // Recalculate hospital-level totals
        await recalculateHospitalBedCounts(pool, hospitalId);

        await recordHospitalAudit({
            req,
            hospitalId,
            action: "CONFIGURE_WARD_ROOM",
            recordId: wardId,
            details: { building: bName, floor: fName, ward: wName, totalBeds: tBeds, charge }
        });

        res.status(201).json({
            success: true,
            message: `Successfully configured ${wName} (${tBeds} beds) in ${bName} (${fName}).`,
            ward: {
                ward_id: wardId,
                ward_name: wName,
                ward_type: wType,
                building_wing: bName,
                floor: fName,
                department: department || (wType === "ICU" ? "Critical Care" : (wType === "Emergency" ? "Trauma & Emergency" : "General Medicine")),
                total_beds: tBeds,
                charge_per_day: charge
            },
            ward_id: wardId,
            total_beds: tBeds,
            beds_created: generatedBeds.length,
            beds: generatedBeds
        });
    } catch (err) {
        console.error("Configure ward room error:", err);
        res.status(500).json({ success: false, message: "Database error configuring ward and beds." });
    }
});

/**
 * POST /api/hospitals/:hospitalId/ward-beds/batch-generate
 * Batch generate or customize bed numbers for an existing ward
 */
router.post([
    "/api/hospitals/:hospitalId/ward-beds/batch-generate",
    "/api/admin/hospital-config/wards/:wardId/batch-generate"
], authenticateToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);
    if (!verifyHospitalIsolation(req, hospitalId)) {
        return res.status(403).json({ success: false, message: "Access denied." });
    }

    const wardId = req.params.wardId || req.body.ward_id || req.body.wardId;
    const { total_beds, bed_prefix, start_number, bed_numbers, bed_category, charge_per_day } = req.body;

    if (!wardId) {
        return res.status(400).json({ success: false, message: "Ward ID is required." });
    }

    const pool = db.promise();
    try {
        const [wardRows] = await pool.query(
            "SELECT * FROM hospital_wards WHERE (ward_id = ? OR CAST(id AS CHAR) = ?) AND (hospital_id = ? OR hospital_id = (SELECT id FROM hospitals WHERE hospital_id = ? LIMIT 1))",
            [wardId, wardId, hospitalId, hospitalId]
        );
        if (!wardRows.length) return res.status(404).json({ success: false, message: "Ward not found." });

        const ward = wardRows[0];
        const tBeds = Math.max(1, Number(total_beds || req.body.count || (Array.isArray(bed_numbers) && bed_numbers.length > 0 ? bed_numbers.length : ward.total_beds || 10)));
        const prefix = (bed_prefix || req.body.prefix || ward.ward_type.slice(0, 3)).toUpperCase().trim();
        const startSeq = Number(start_number || 101);
        const charge = Number(charge_per_day || req.body.charge || ward.charge_per_day || 500);

        for (let i = 0; i < tBeds; i++) {
            let bNumber = (Array.isArray(bed_numbers) && bed_numbers[i]) 
                ? String(bed_numbers[i]).trim() 
                : `${prefix}-${startSeq + i}`;
            
            const bId = `BED-${hospitalId.replace(/[^A-Za-z0-9]/g, "")}-${ward.ward_id}-${bNumber.replace(/[^A-Za-z0-9_-]/g, "")}`;
            const roomNum = `Room-${Math.floor((startSeq + i) / 10) * 10 || startSeq + i}`;

            await pool.query(`
                INSERT INTO hospital_ward_beds
                (bed_id, hospital_id, ward_id, building_wing, floor, room_number, bed_number, bed_type, bed_category, charge, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available', 'Sanitized and ready')
                ON DUPLICATE KEY UPDATE 
                    bed_number = VALUES(bed_number),
                    bed_type = VALUES(bed_type),
                    bed_category = VALUES(bed_category),
                    charge = VALUES(charge),
                    building_wing = VALUES(building_wing),
                    floor = VALUES(floor)
            `, [
                bId,
                hospitalId,
                ward.ward_id,
                ward.building_wing || "Block A",
                ward.floor || "1st Floor",
                roomNum,
                bNumber,
                ward.ward_type,
                bed_category || ward.ward_name,
                charge
            ]);
        }

        // Update ward total_beds
        const [[{ actualTotal }]] = await pool.query("SELECT COUNT(*) AS actualTotal FROM hospital_ward_beds WHERE ward_id = ? OR ward_id = CAST(? AS CHAR)", [ward.ward_id, ward.id]);
        await pool.query("UPDATE hospital_wards SET total_beds = ? WHERE id = ?", [actualTotal, ward.id]);

        await recalculateHospitalBedCounts(pool, hospitalId);

        res.json({
            success: true,
            message: `Provisioned ${tBeds} beds in ${ward.ward_name}.`,
            count: tBeds,
            total_beds: actualTotal
        });
    } catch (err) {
        console.error("Batch generate beds error:", err);
        res.status(500).json({ success: false, message: "Database error batch generating beds." });
    }
});

/**
 * PUT /api/hospitals/:hospitalId/wards/:wardId OR /api/admin/hospital-config/wards/:wardId
 * Update room/ward metadata
 */
router.put([
    "/api/hospitals/:hospitalId/wards/:wardId",
    "/api/admin/hospital-config/wards/:wardId"
], authenticateToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);
    const { wardId } = req.params;
    if (!verifyHospitalIsolation(req, hospitalId)) {
        return res.status(403).json({ success: false, message: "Access denied." });
    }

    const { ward_name, building_wing, floor, ward_type, department, charge_per_day, total_beds, status } = req.body;
    const pool = db.promise();

    try {
        const [oldRows] = await pool.query(
            "SELECT * FROM hospital_wards WHERE (ward_id = ? OR CAST(id AS CHAR) = ?) AND (hospital_id = ? OR hospital_id = (SELECT id FROM hospitals WHERE hospital_id = ? LIMIT 1))",
            [wardId, wardId, hospitalId, hospitalId]
        );
        if (!oldRows.length) return res.status(404).json({ success: false, message: "Ward not found." });

        const old = oldRows[0];
        const newName = ward_name || old.ward_name;
        const newWing = building_wing || old.building_wing;
        const newFloor = floor || old.floor;
        const newType = ward_type || old.ward_type;
        const newDept = department || old.department;
        const newCharge = charge_per_day !== undefined ? Number(charge_per_day) : (req.body.base_rate_per_day !== undefined ? Number(req.body.base_rate_per_day) : old.charge_per_day);
        const newStatus = status || old.status;
        const newTotal = total_beds !== undefined ? Number(total_beds) : old.total_beds;

        await pool.query(`
            UPDATE hospital_wards SET
                ward_name = ?, building_wing = ?, floor = ?, ward_type = ?, department = ?, charge_per_day = ?, total_beds = ?, status = ?
            WHERE id = ?
        `, [newName, newWing, newFloor, newType, newDept, newCharge, newTotal, newStatus, old.id]);

        // Propagate updates to hospital_ward_beds
        await pool.query(`
            UPDATE hospital_ward_beds SET
                building_wing = ?, floor = ?, bed_type = ?, charge = ?
            WHERE (ward_id = ? OR ward_id = CAST(? AS CHAR)) AND (hospital_id = ? OR hospital_id = (SELECT id FROM hospitals WHERE hospital_id = ? LIMIT 1))
        `, [newWing, newFloor, newType, newCharge, old.ward_id, old.id, hospitalId, hospitalId]);

        await recalculateHospitalBedCounts(pool, hospitalId);

        res.json({
            success: true,
            message: `Ward ${newName} updated successfully.`,
            ward_id: old.ward_id
        });
    } catch (err) {
        console.error("Update ward error:", err);
        res.status(500).json({ success: false, message: "Database error updating ward." });
    }
});

/**
 * DELETE /api/hospitals/:hospitalId/wards/:wardId OR /api/admin/hospital-config/wards/:wardId
 * Safe ward deletion: Protects active admissions and clinical history
 */
router.delete([
    "/api/hospitals/:hospitalId/wards/:wardId",
    "/api/admin/hospital-config/wards/:wardId"
], authenticateToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);
    const { wardId } = req.params;
    if (!verifyHospitalIsolation(req, hospitalId)) {
        return res.status(403).json({ success: false, message: "Access denied." });
    }

    const pool = db.promise();
    try {
        const [wardRows] = await pool.query(
            "SELECT * FROM hospital_wards WHERE (ward_id = ? OR CAST(id AS CHAR) = ?) AND (hospital_id = ? OR hospital_id = (SELECT id FROM hospitals WHERE hospital_id = ? LIMIT 1))",
            [wardId, wardId, hospitalId, hospitalId]
        );
        if (!wardRows.length) return res.status(404).json({ success: false, message: "Ward not found." });

        const ward = wardRows[0];

        // Check if any bed in this ward is currently occupied
        const [occBeds] = await pool.query(
            "SELECT id, bed_number, patient_name FROM hospital_ward_beds WHERE (ward_id = ? OR ward_id = CAST(? AS CHAR)) AND status = 'Occupied'",
            [ward.ward_id, ward.id]
        );
        if (occBeds.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete ward: ${occBeds.length} bed(s) are currently occupied (e.g. Bed ${occBeds[0].bed_number} by ${occBeds[0].patient_name}). Discharge or transfer patients first.`
            });
        }

        // Check if any bed has historical admissions
        const [admissions] = await pool.query(
            "SELECT id FROM hospital_bed_admissions WHERE ward_id = ? OR ward_id = CAST(? AS CHAR) LIMIT 1",
            [ward.ward_id, ward.id]
        );

        if (admissions.length > 0) {
            // Soft retirement to protect clinical audit history
            await pool.query("UPDATE hospital_wards SET status = 'Retired' WHERE id = ?", [ward.id]);
            await pool.query("UPDATE hospital_ward_beds SET status = 'Retired' WHERE ward_id = ? OR ward_id = CAST(? AS CHAR)", [ward.ward_id, ward.id]);
        } else {
            // Safe hard delete
            await pool.query("DELETE FROM hospital_ward_beds WHERE ward_id = ? OR ward_id = CAST(? AS CHAR)", [ward.ward_id, ward.id]);
            await pool.query("DELETE FROM hospital_wards WHERE id = ?", [ward.id]);
        }

        await recalculateHospitalBedCounts(pool, hospitalId);

        res.json({
            success: true,
            message: `Ward ${ward.ward_name} ${admissions.length > 0 ? 'retired safely (history preserved)' : 'removed'}.`
        });
    } catch (err) {
        console.error("Delete ward error:", err);
        res.status(500).json({ success: false, message: "Database error deleting ward." });
    }
});

/**
 * POST /api/hospitals/:hospitalId/ward-beds OR /api/admin/hospital-config/wards/:wardId/beds
 * Register a new bed in ward / room.
 */
router.post([
    "/api/hospitals/:hospitalId/ward-beds",
    "/api/admin/hospital-config/wards/:wardId/beds"
], authenticateToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);
    if (!verifyHospitalIsolation(req, hospitalId)) {
        return res.status(403).json({ success: false, message: "Access denied." });
    }

    const ward_id = req.params.wardId || req.body.ward_id || req.body.wardId;
    const { bed_number, room_number, building_wing, floor, bed_type, bed_category, charge, status, notes } = req.body;

    if (!ward_id || !bed_number) {
        return res.status(400).json({ success: false, message: "Ward ID and bed number are required." });
    }

    const pool = db.promise();
    try {
        const [wRows] = await pool.query(
            "SELECT * FROM hospital_wards WHERE (ward_id = ? OR CAST(id AS CHAR) = ?) LIMIT 1",
            [ward_id, ward_id]
        );
        const ward = wRows[0] || {};

        const bedId = `BED-${hospitalId.replace(/[^A-Za-z0-9]/g, "")}-${ward_id}-${String(bed_number).trim()}`;
        const bType = bed_type || ward.ward_type || "General";
        const bCat = bed_category || ward.ward_name || bType;
        const bWing = building_wing || ward.building_wing || "Block A";
        const bFloor = floor || ward.floor || "1st Floor";
        const bCharge = Number(charge || ward.charge_per_day || 500);
        const stat = status || "Available";

        const [insertRes] = await pool.query(`
            INSERT INTO hospital_ward_beds 
            (bed_id, hospital_id, ward_id, building_wing, floor, room_number, bed_number, bed_type, bed_category, charge, status, notes, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            bedId,
            hospitalId,
            ward_id,
            bWing,
            bFloor,
            room_number || "Room-01",
            String(bed_number).trim(),
            bType,
            bCat,
            bCharge,
            stat,
            notes || "Sanitized and active"
        ]);

        await recalculateHospitalBedCounts(pool, hospitalId);

        await recordHospitalAudit({
            req,
            hospitalId,
            action: "ADD_WARD_BED",
            recordId: bedId,
            details: { ward_id, room_number, bed_number, bed_type: bType }
        });

        res.status(201).json({
            success: true,
            message: `Bed ${bed_number} (${bedId}) created in ward ${ward_id}.`,
            bed_id: bedId,
            bedId: bedId,
            id: insertRes.insertId
        });
    } catch (err) {
        console.error("Add bed error:", err);
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ success: false, message: "Bed with this number already exists in this ward." });
        }
        res.status(500).json({ success: false, message: "Database error adding bed." });
    }
});

/**
 * PUT /api/hospitals/:hospitalId/ward-beds/:bedId OR /api/admin/hospital-config/beds/:bedId/status
 * Update individual bed status, charge, category, or maintenance reason.
 */
router.put([
    "/api/hospitals/:hospitalId/ward-beds/:bedId",
    "/api/admin/hospital-config/beds/:bedId/status"
], authenticateToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);
    const { bedId } = req.params;

    const { status, bed_number, room_number, charge, patient_id, patient_name, notes, maintenance_reason, bed_type, bed_category } = req.body;
    const pool = db.promise();

    try {
        const [oldRows] = await pool.query(
            "SELECT * FROM hospital_ward_beds WHERE (bed_id = ? OR CAST(id AS CHAR) = ?)",
            [bedId, bedId]
        );

        if (!oldRows.length) {
            return res.status(404).json({ success: false, message: `Bed "${bedId}" not found.` });
        }

        const oldBed = oldRows[0];
        if (!verifyHospitalIsolation(req, oldBed.hospital_id)) {
            return res.status(403).json({ success: false, message: "Access denied." });
        }

        const updates = [];
        const params = [];

        if (status !== undefined) { updates.push("status = ?"); params.push(status); }
        if (bed_number !== undefined) { updates.push("bed_number = ?"); params.push(bed_number); }
        if (room_number !== undefined) { updates.push("room_number = ?"); params.push(room_number); }
        if (charge !== undefined) { updates.push("charge = ?"); params.push(Number(charge)); }
        if (patient_id !== undefined) { updates.push("patient_id = ?"); params.push(patient_id || null); }
        if (patient_name !== undefined) { updates.push("patient_name = ?"); params.push(patient_name || null); }
        if (notes !== undefined) { updates.push("notes = ?"); params.push(notes); }
        if (maintenance_reason !== undefined) { updates.push("maintenance_reason = ?"); params.push(maintenance_reason); }
        if (bed_type !== undefined) { updates.push("bed_type = ?"); params.push(bed_type); }
        if (bed_category !== undefined) { updates.push("bed_category = ?"); params.push(bed_category); }

        if (!updates.length) {
            return res.status(400).json({ success: false, message: "No update fields specified." });
        }

        params.push(bedId, bedId);
        await pool.query(
            `UPDATE hospital_ward_beds SET ${updates.join(", ")}, updated_at = NOW() WHERE (bed_id = ? OR CAST(id AS CHAR) = ?)`,
            params
        );

        await recalculateHospitalBedCounts(pool, oldBed.hospital_id);

        await recordHospitalAudit({
            req,
            hospitalId: oldBed.hospital_id,
            action: "UPDATE_BED_STATUS",
            recordId: bedId,
            details: { newStatus: status, maintenance_reason }
        });

        res.json({
            success: true,
            message: `Bed ${bedId} updated successfully.`,
            bed_id: bedId
        });
    } catch (err) {
        console.error("Update bed error:", err);
        res.status(500).json({ success: false, message: "Database error updating bed." });
    }
});

/**
 * DELETE /api/hospitals/:hospitalId/ward-beds/:bedId OR /api/admin/hospital-config/beds/:bedId
 * Safe bed deletion: Protects active admissions and clinical history
 */
router.delete([
    "/api/hospitals/:hospitalId/ward-beds/:bedId",
    "/api/admin/hospital-config/beds/:bedId"
], authenticateToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);
    const { bedId } = req.params;
    if (!verifyHospitalIsolation(req, hospitalId)) {
        return res.status(403).json({ success: false, message: "Access denied." });
    }

    const pool = db.promise();
    try {
        const [bedRows] = await pool.query(
            "SELECT * FROM hospital_ward_beds WHERE (bed_id = ? OR CAST(id AS CHAR) = ?) AND (hospital_id = ? OR hospital_id = (SELECT id FROM hospitals WHERE hospital_id = ? LIMIT 1))",
            [bedId, bedId, hospitalId, hospitalId]
        );
        if (!bedRows.length) return res.status(404).json({ success: false, message: "Bed not found." });

        const bed = bedRows[0];
        if (bed.status === "Occupied") {
            return res.status(400).json({
                success: false,
                message: `Cannot delete bed ${bed.bed_number}: It is currently occupied by ${bed.patient_name || 'a patient'}. Please discharge or transfer patient first.`
            });
        }

        // Check historical admissions
        const [admissions] = await pool.query(
            "SELECT id FROM hospital_bed_admissions WHERE bed_id = ? LIMIT 1",
            [bed.bed_id]
        );

        if (admissions.length > 0) {
            await pool.query("UPDATE hospital_ward_beds SET status = 'Retired' WHERE id = ?", [bed.id]);
        } else {
            await pool.query("DELETE FROM hospital_ward_beds WHERE id = ?", [bed.id]);
        }

        await recalculateHospitalBedCounts(pool, hospitalId);

        res.json({
            success: true,
            message: `Bed ${bed.bed_number} ${admissions.length > 0 ? 'retired safely (history preserved)' : 'removed'}.`
        });
    } catch (err) {
        console.error("Delete bed error:", err);
        res.status(500).json({ success: false, message: "Database error deleting bed." });
    }
});

// =========================================================================
// 5. ICU SPECIALTY SUITES CONFIGURATION API
// =========================================================================

/**
 * GET /api/hospitals/:hospitalId/icu-categories OR /api/admin/hospital-config/icu
 * Retrieves all ICU categories (MICU, SICU, NICU, PICU, CCU, Neuro, etc.)
 */
router.get(["/api/hospitals/:hospitalId/icu-categories", "/api/admin/hospital-config/icu"], optionalToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);
    const pool = db.promise();

    try {
        const [categories] = await pool.query(
            `SELECT * FROM hospital_icu_categories WHERE hospital_id = ? OR hospital_id = (SELECT id FROM hospitals WHERE hospital_id = ? LIMIT 1) ORDER BY category_name ASC`,
            [hospitalId, hospitalId]
        );

        res.json({
            success: true,
            hospital_id: hospitalId,
            count: categories.length,
            icu_categories: categories
        });
    } catch (err) {
        console.error("Get ICU categories error:", err);
        res.status(500).json({ success: false, message: "Database error fetching ICU categories." });
    }
});

/**
 * POST /api/hospitals/:hospitalId/icu-categories OR /api/admin/hospital-config/icu
 * Configure a new ICU suite.
 */
router.post(["/api/hospitals/:hospitalId/icu-categories", "/api/admin/hospital-config/icu"], authenticateToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);

    if (!verifyHospitalIsolation(req, hospitalId)) {
        return res.status(403).json({ success: false, message: "Access denied." });
    }

    const catName = req.body.category_name || req.body.icu_name || req.body.name;
    const iType = req.body.icu_type || req.body.category || "Critical Care";
    const icuCode = (req.body.code || req.body.icu_code || ("ICU_" + (catName || "SUITE").toUpperCase().replace(/[^A-Z0-9]/g, "_"))).slice(0, 50);
    const vents = Number(req.body.ventilators_count || req.body.ventilator_beds || 4);
    const tBeds = Number(req.body.total_beds || req.body.beds || 10);
    const roomNums = req.body.room_numbers || "Rooms 201-210";
    const eqNotes = req.body.equipment_notes || "Equipped with cardiac monitors and infusion pumps";
    const stat = req.body.status || "Active";

    if (!catName) {
        return res.status(400).json({ success: false, message: "Category Name or ICU Name is required." });
    }

    const pool = db.promise();
    try {
        await pool.query(`
            INSERT INTO hospital_icu_categories 
            (hospital_id, icu_type, category_name, code, room_numbers, total_beds, occupied_beds, ventilators_count, equipment_notes, status)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                category_name = VALUES(category_name),
                total_beds = VALUES(total_beds),
                ventilators_count = VALUES(ventilators_count),
                room_numbers = VALUES(room_numbers)
        `, [
            hospitalId,
            iType,
            catName.trim(),
            icuCode,
            roomNums,
            tBeds,
            vents,
            eqNotes,
            stat
        ]);

        // Keep hospitals.icu_beds in sync
        await pool.query(
            "UPDATE hospitals SET icu_beds = (SELECT SUM(total_beds) FROM hospital_icu_categories WHERE hospital_id = ? AND status = 'Active') WHERE hospital_id = ?",
            [hospitalId, hospitalId]
        );

        await recordHospitalAudit({
            req,
            hospitalId,
            action: "CONFIG_ICU_SUITE",
            recordId: icuCode,
            details: { icu_type: iType, category_name: catName, total_beds: tBeds, ventilators: vents }
        });

        res.status(201).json({
            success: true,
            message: `ICU suite "${catName}" configured successfully.`,
            code: icuCode
        });
    } catch (err) {
        console.error("Add ICU category error:", err);
        res.status(500).json({ success: false, message: "Database error configuring ICU category." });
    }
});

/**
 * PUT /api/hospitals/:hospitalId/icu-categories/:code OR /api/admin/hospital-config/icu/:code
 * Update existing ICU suite beds and ventilator allocations.
 */
router.put([
    "/api/hospitals/:hospitalId/icu-categories/:code",
    "/api/admin/hospital-config/icu/:code"
], authenticateToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);
    const { code } = req.params;

    if (!verifyHospitalIsolation(req, hospitalId)) {
        return res.status(403).json({ success: false, message: "Access denied." });
    }

    const pool = db.promise();
    try {
        const { total_beds, beds, available_beds, ventilator_beds, ventilators_count, status } = req.body;
        const updates = [];
        const params = [];

        if (total_beds !== undefined || beds !== undefined) {
            updates.push("total_beds = ?");
            params.push(Number(total_beds || beds));
        }
        if (available_beds !== undefined) {
            updates.push("occupied_beds = ?");
            params.push(Math.max(0, Number(total_beds || beds || 10) - Number(available_beds)));
        }
        if (ventilator_beds !== undefined || ventilators_count !== undefined) {
            updates.push("ventilators_count = ?");
            params.push(Number(ventilator_beds || ventilators_count));
        }
        if (status !== undefined) {
            updates.push("status = ?");
            params.push(status);
        }

        if (updates.length > 0) {
            params.push(hospitalId, code);
            await pool.query(`UPDATE hospital_icu_categories SET ${updates.join(", ")}, updated_at = NOW() WHERE hospital_id = ? AND code = ?`, params);
        }

        res.json({ success: true, message: `ICU Suite ${code} updated successfully.` });
    } catch (err) {
        console.error("Update ICU suite error:", err);
        res.status(500).json({ success: false, message: "Database error updating ICU suite." });
    }
});

// =========================================================================
// 6. DIAGNOSTICS & LAB TEST CATALOGUE API
// =========================================================================

/**
 * GET /api/hospitals/:hospitalId/diagnostics OR /api/admin/hospital-config/diagnostics
 * Retrieves all laboratory and diagnostic imaging services configured for this hospital.
 */
router.get(["/api/hospitals/:hospitalId/diagnostics", "/api/admin/hospital-config/diagnostics"], optionalToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);
    const pool = db.promise();

    try {
        const [tests] = await pool.query(
            `SELECT * FROM diagnostic_tests WHERE hospital_id = ? OR hospital_id = (SELECT id FROM hospitals WHERE hospital_id = ? LIMIT 1) ORDER BY department ASC, name ASC`,
            [hospitalId, hospitalId]
        );

        res.json({
            success: true,
            hospital_id: hospitalId,
            count: tests.length,
            diagnostics: tests
        });
    } catch (err) {
        console.error("Get diagnostics error:", err);
        res.status(500).json({ success: false, message: "Database error fetching diagnostics." });
    }
});

/**
 * POST /api/hospitals/:hospitalId/diagnostics OR /api/admin/hospital-config/diagnostics
 * Add a new diagnostic or lab test to this hospital's catalogue.
 */
router.post(["/api/hospitals/:hospitalId/diagnostics", "/api/admin/hospital-config/diagnostics"], authenticateToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);

    if (!verifyHospitalIsolation(req, hospitalId)) {
        return res.status(403).json({ success: false, message: "Access denied." });
    }

    const testName = req.body.name || req.body.test_name;
    const {
        test_id,
        code,
        category_id,
        department,
        price,
        sample_required,
        prep_instructions,
        preparation_instructions,
        fasting_required,
        estimated_report_time,
        turnaround_time,
        status
    } = req.body;

    if (!testName || !testName.trim()) {
        return res.status(400).json({ success: false, message: "Test name is required." });
    }

    const pool = db.promise();
    try {
        const tCode = (code || testName.toUpperCase().replace(/[^A-Z0-9]/g, "_")).slice(0, 25);
        const tId = (test_id || `T-${Date.now().toString().slice(-4)}-${tCode}`).slice(0, 50);
        const tFee = Number(price || 400);

        const [insertRes] = await pool.query(`
            INSERT INTO diagnostic_tests 
            (test_id, hospital_id, category_id, name, code, short_description, full_description, sample_required, prep_instructions, fasting_required, estimated_report_time, price, department, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
                name = VALUES(name),
                price = VALUES(price),
                department = VALUES(department),
                status = VALUES(status)
        `, [
            tId,
            hospitalId,
            category_id || "CAT-PATH-01",
            testName.trim(),
            tCode,
            `${testName} diagnostic evaluation`,
            `Standard clinical diagnostic test for ${testName}`,
            sample_required || "Venous Blood (3ml)",
            prep_instructions || preparation_instructions || "Standard preparation",
            fasting_required ? 1 : 0,
            estimated_report_time || turnaround_time || "4 Hours",
            tFee,
            department || "Pathology",
            status || "Active"
        ]);

        await recordHospitalAudit({
            req,
            hospitalId,
            action: "ADD_DIAGNOSTIC_TEST",
            recordId: tId,
            details: { name: testName, price: tFee, department }
        });

        res.status(201).json({
            success: true,
            message: `Diagnostic test "${testName}" added to hospital catalogue.`,
            test_id: tId,
            testId: tId,
            id: insertRes.insertId,
            test: { test_id: tId, name: testName, price: tFee }
        });
    } catch (err) {
        console.error("Add test error:", err);
        res.status(500).json({ success: false, message: "Database error adding diagnostic test." });
    }
});

/**
 * PUT /api/hospitals/:hospitalId/diagnostics/:id OR /api/admin/hospital-config/diagnostics/:id
 * Update diagnostic test pricing, turnaround time, or status.
 */
router.put([
    "/api/hospitals/:hospitalId/diagnostics/:id",
    "/api/admin/hospital-config/diagnostics/:id"
], authenticateToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);
    const { id } = req.params;

    const pool = db.promise();
    try {
        const { price, estimated_report_time, turnaround_time, status, is_active } = req.body;
        const updates = [];
        const params = [];

        if (price !== undefined) { updates.push("price = ?"); params.push(Number(price)); }
        if (estimated_report_time !== undefined || turnaround_time !== undefined) {
            updates.push("estimated_report_time = ?");
            params.push(estimated_report_time || turnaround_time);
        }
        if (status !== undefined) { updates.push("status = ?"); params.push(status); }
        if (is_active !== undefined) { updates.push("status = ?"); params.push(is_active ? 'Active' : 'Inactive'); }

        if (updates.length > 0) {
            params.push(id, id);
            await pool.query(`UPDATE diagnostic_tests SET ${updates.join(", ")} WHERE test_id = ? OR CAST(id AS CHAR) = ?`, params);
        }

        res.json({ success: true, message: `Diagnostic test ${id} updated successfully.` });
    } catch (err) {
        console.error("Update diagnostic test error:", err);
        res.status(500).json({ success: false, message: "Database error updating test." });
    }
});

// =========================================================================
// 7. AUDIT LOGS FOR HOSPITAL ADMIN
// =========================================================================

/**
 * GET /api/hospitals/:hospitalId/audit-logs OR /api/admin/hospital-config/audit-logs
 * Retrieves administrative history for this hospital.
 */
router.get([
    "/api/hospitals/:hospitalId/audit-logs",
    "/api/admin/hospital-config/audit-logs",
    "/api/admin/hospital-config/audit"
], authenticateToken, async (req, res) => {
    const hospitalId = resolveHospitalId(req);

    if (!verifyHospitalIsolation(req, hospitalId)) {
        return res.status(403).json({ success: false, message: "Access denied." });
    }

    const pool = db.promise();
    try {
        const [logs] = await pool.query(`
            SELECT * FROM audit_logs 
            WHERE module = 'hospital_admin' 
              AND (record_id = ? OR JSON_EXTRACT(metadata, '$.hospitalId') = ?)
            ORDER BY id DESC LIMIT 50
        `, [hospitalId, hospitalId]);

        res.json({
            success: true,
            count: logs.length,
            logs
        });
    } catch (err) {
        console.error("Get audit logs error:", err);
        res.status(500).json({ success: false, message: "Database error retrieving audit logs." });
    }
});

// =========================================================================
// 8. OFFICIAL PRESCRIPTION & CLINICAL DOCUMENT GENERATOR
// =========================================================================

/**
 * GET /api/prescriptions/:id/document
 * Returns complete printable prescription data with official hospital identity & logo.
 */
router.get("/api/prescriptions/:id/document", optionalToken, async (req, res) => {
    const { id } = req.params;
    const pool = db.promise();

    try {
        const [rxRows] = await pool.query(
            "SELECT * FROM prescriptions WHERE id = ? LIMIT 1",
            [id]
        );

        if (!rxRows.length) {
            return res.status(404).json({ success: false, message: "Prescription not found." });
        }

        const rx = rxRows[0];

        // Fetch patient
        const [pRows] = await pool.query(
            "SELECT * FROM patients WHERE patient_id = ? LIMIT 1",
            [rx.patient_id]
        );
        const patient = pRows[0] || { patient_id: rx.patient_id, name: "Anonymous Patient" };

        // Resolve hospital (from prescription or patient)
        const targetHospId = rx.hospital_id || patient.hospital_id || "HOSP-001";
        const [hRows] = await pool.query(
            "SELECT * FROM hospitals WHERE hospital_id = ? OR CAST(id AS CHAR) = ? LIMIT 1",
            [targetHospId, targetHospId]
        );
        const hospital = hRows[0] || {
            hospital_name: "SmartCity Gorakhpur Hospital",
            address: "Gorakhpur, Uttar Pradesh",
            phone: "0551-2200000",
            emergency_number: "108",
            accreditation: "Government Health Authority",
            logo: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=150&auto=format&fit=crop&q=80"
        };

        // Resolve doctor
        const [dRows] = await pool.query(
            "SELECT * FROM doctors WHERE doctor_id = ? OR CAST(id AS CHAR) = ? OR name = ? LIMIT 1",
            [rx.doctor_id || "", rx.doctor_id || "", rx.doctor_name || ""]
        );
        const doctor = dRows[0] || {
            name: rx.doctor_name || "Dr. Medical Officer",
            specialization: "Clinical Consultant",
            department: "General Medicine",
            qualification: "MBBS, MD",
            opd_room_no: "OPD-101"
        };

        const docPayload = {
            prescription: {
                id: rx.id,
                date: rx.created_at,
                created_at: rx.created_at,
                diagnosis: rx.diagnosis || "Clinical Consultation",
                medications: rx.medications_json || rx.prescription_file,
                advice: rx.advice || rx.doctor_notes || "Maintain proper rest, stay hydrated, and take medications as scheduled.",
                doctor_notes: rx.doctor_notes || "",
                follow_up_date: rx.follow_up_date
            },
            hospital: {
                name: hospital.hospital_name,
                hospital_name: hospital.hospital_name,
                hospital_id: hospital.hospital_id,
                logo: rx.hospital_logo || hospital.logo,
                historical_logo_preserved: Boolean(rx.hospital_logo && rx.hospital_logo !== hospital.logo),
                address: hospital.address,
                phone: hospital.phone,
                emergency_number: hospital.emergency_number,
                accreditation: hospital.accreditation
            },
            doctor: {
                name: doctor.name,
                doctor_id: doctor.doctor_id,
                qualification: doctor.qualification,
                specialization: doctor.specialization,
                department: doctor.department,
                room_no: doctor.opd_room_no
            },
            patient: {
                patient_id: patient.patient_id,
                name: patient.name,
                age: patient.age,
                gender: patient.gender,
                blood_group: patient.blood_group,
                mobile: patient.mobile
            }
        };

        res.json({
            success: true,
            document: docPayload,
            ...docPayload
        });
    } catch (err) {
        console.error("Prescription document error:", err);
        res.status(500).json({ success: false, message: "Database error generating prescription document." });
    }
});

module.exports = router;
