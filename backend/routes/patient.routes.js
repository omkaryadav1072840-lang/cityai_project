const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const db = require("../config/db");
const { reportUpload } = require("../middleware/upload.middleware");
const {
    authenticateToken,
    optionalToken,
    requireRole
} = require("../middleware/auth.middleware");

// =========================================================
// HELPER UTILITIES
// =========================================================

function calculateAgeFromDob(dob) {
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : 0;
}

function maskName(name) {
    if (!name) return "P*****";
    const parts = name.trim().split(/\s+/);
    return parts.map(p => {
        if (p.length <= 2) return p[0] + "*";
        return p[0] + "*".repeat(p.length - 2) + p[p.length - 1];
    }).join(" ");
}

async function generateSequentialPatientId() {
    const year = new Date().getFullYear();
    const prefix = `P-${year}-`;

    const [rows] = await db.promise().query(
        "SELECT patient_id FROM patients WHERE patient_id LIKE ? ORDER BY id DESC LIMIT 1",
        [`${prefix}%`]
    );

    let nextSeq = 1;
    if (rows && rows.length > 0) {
        const lastId = rows[0].patient_id;
        const match = lastId.match(/P-\d{4}-(\d+)/);
        if (match && match[1]) {
            nextSeq = parseInt(match[1], 10) + 1;
        }
    }

    const padded = String(nextSeq).padStart(6, "0");
    return `${prefix}${padded}`;
}

async function logPatientAudit(patientId, action, req, details = null) {
    try {
        const user = req.user || null;
        const userId = user ? (user.id || user.userId || null) : null;
        const userName = user ? (user.name || null) : null;
        const role = user ? (user.role || user.type || "guest") : "guest";
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

        await db.promise().query(
            `INSERT INTO patient_audit_logs 
             (patient_id, action, performed_by_id, performed_by_name, role, details, ip_address)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                patientId,
                action,
                userId,
                userName,
                role,
                typeof details === "object" ? JSON.stringify(details) : details,
                ip
            ]
        );
    } catch (auditErr) {
        console.warn("[PATIENT AUDIT LOG WARNING]", auditErr.message);
    }
}

function checkPatientAccess(req, patient) {
    if (!req.user) {
        return false;
    }

    const role = (req.user.role || req.user.type || "").toLowerCase();
    // Admin, staff, and doctors have system access
    if (["admin", "staff", "doctor"].includes(role)) {
        return true;
    }

    // Citizen owner check
    const userId = req.user.id || req.user.userId;
    if (userId && patient.user_id && Number(userId) === Number(patient.user_id)) {
        return true;
    }

    // Mobile match check
    if (req.user.mobile && patient.mobile && req.user.mobile.replace(/\D/g, "") === patient.mobile.replace(/\D/g, "")) {
        return true;
    }

    // Session patientId match check
    if (req.user.patientId && req.user.patientId === patient.patient_id) {
        return true;
    }

    return false;
}

// =========================================================
// 1. PATIENT REGISTRATION (CREATE PATIENT ID)
// =========================================================

router.post("/api/patients", optionalToken, async (req, res) => {
    try {
        let {
            patientId,
            name,
            dob,
            age,
            gender,
            mobile,
            emergencyContact,
            bloodGroup,
            address,
            hospitalId,
            abhaNumber,
            abhaAddress,
            emergencyInfo
        } = req.body;

        // Validation
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "Patient full name is required." });
        }
        if (!mobile || !String(mobile).trim()) {
            return res.status(400).json({ success: false, message: "Mobile number is required." });
        }

        const cleanMobile = String(mobile).replace(/\D/g, "");
        if (cleanMobile.length < 10) {
            return res.status(400).json({ success: false, message: "A valid 10-digit mobile number is required." });
        }

        // DOB & Age calculation
        if (dob) {
            const calculated = calculateAgeFromDob(dob);
            if (calculated !== null) {
                age = calculated;
            }
        }

        // Auto-generate sequential Patient ID if not supplied or format is legacy
        if (!patientId || !patientId.trim()) {
            patientId = await generateSequentialPatientId();
        } else {
            patientId = patientId.trim();
        }

        // Unique QR token
        const qrToken = "SCPAT-" + crypto.randomBytes(16).toString("hex");

        // Associated user_id if logged in citizen
        const loggedUser = req.user || null;
        const userId = loggedUser && (loggedUser.role === "citizen" || !loggedUser.role)
            ? (loggedUser.id || loggedUser.userId || null)
            : null;

        // ABHA initial status
        const initialAbhaStatus = (abhaAddress && abhaAddress.trim()) || (abhaNumber && abhaNumber.trim())
            ? "Linked"
            : "Not Linked";
        const cleanAbhaAddress = (abhaAddress && abhaAddress.trim()) || (abhaNumber && abhaNumber.trim()) || null;

        const sql = `
            INSERT INTO patients 
            (patient_id, user_id, name, dob, age, gender, mobile, emergency_contact, blood_group, address, hospital_id, abha_status, abha_address, qr_token, emergency_info, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
        `;

        const [result] = await db.promise().query(sql, [
            patientId,
            userId,
            name.trim(),
            dob || null,
            age || null,
            gender || null,
            cleanMobile,
            emergencyContact ? String(emergencyContact).trim() : null,
            bloodGroup || null,
            address ? String(address).trim() : null,
            hospitalId || null,
            initialAbhaStatus,
            cleanAbhaAddress,
            qrToken,
            emergencyInfo ? String(emergencyInfo).trim() : null
        ]);

        const newPatient = {
            id: result.insertId,
            patientId,
            patient_id: patientId,
            name: name.trim(),
            dob: dob || null,
            age: age || null,
            gender: gender || null,
            mobile: cleanMobile,
            emergencyContact: emergencyContact || null,
            bloodGroup: bloodGroup || null,
            address: address || null,
            hospitalId: hospitalId || null,
            abhaStatus: initialAbhaStatus,
            abhaAddress: cleanAbhaAddress,
            qrToken,
            emergencyInfo: emergencyInfo || null,
            status: "Active",
            qrPayload: {
                type: "SMARTCITY_PATIENT_ID",
                patientId,
                qrToken,
                verifyUrl: `/api/patients/verify-qr?token=${qrToken}`
            }
        };

        await logPatientAudit(patientId, "CREATED", req, {
            name: newPatient.name,
            hospitalId: newPatient.hospitalId,
            createdVia: loggedUser ? loggedUser.role : "public_registration"
        });

        res.status(201).json({
            success: true,
            message: "Patient registered successfully.",
            patient: newPatient
        });
    } catch (err) {
        console.error("[PATIENT REGISTRATION ERROR]", err);
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Patient ID or QR token already exists. Please try again."
            });
        }
        res.status(500).json({ success: false, message: "Database error during patient registration." });
    }
});

// =========================================================
// 2. GET ALL PATIENTS / SEARCH & FILTER (STAFF / ADMIN / CITIZEN)
// =========================================================

router.get("/api/patients", authenticateToken, async (req, res) => {
    try {
        const { search, hospital, gender, status, page = 1, limit = 50 } = req.query;
        const role = (req.user.role || req.user.type || "").toLowerCase();

        // If citizen, return strictly their own profile(s)
        if (role === "citizen") {
            const userId = req.user.id || req.user.userId;
            const mobile = req.user.mobile ? req.user.mobile.replace(/\D/g, "") : null;

            const [citizenPatients] = await db.promise().query(
                `SELECT p.*, h.hospital_name 
                 FROM patients p
                 LEFT JOIN hospitals h ON p.hospital_id = h.hospital_id
                 WHERE p.user_id = ? OR (p.mobile = ? AND ? IS NOT NULL)
                 ORDER BY p.id DESC`,
                [userId, mobile, mobile]
            );

            return res.json({
                success: true,
                message: "Citizen patient profiles fetched.",
                patients: citizenPatients
            });
        }

        // Restrict general search across all patients to staff, doctor, or admin
        if (!["admin", "staff", "doctor"].includes(role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Action reserved for healthcare staff, doctors, or administrators."
            });
        }

        // Build dynamic query for staff / doctor / admin
        let whereClauses = [];
        let params = [];

        if (search && search.trim()) {
            const term = `%${search.trim()}%`;
            whereClauses.push("(p.patient_id LIKE ? OR p.name LIKE ? OR p.mobile LIKE ? OR p.abha_address LIKE ?)");
            params.push(term, term, term, term);
        }

        if (hospital && hospital.trim()) {
            whereClauses.push("(p.hospital_id = ? OR h.hospital_name LIKE ?)");
            params.push(hospital.trim(), `%${hospital.trim()}%`);
        }

        if (gender && gender.trim()) {
            whereClauses.push("p.gender = ?");
            params.push(gender.trim());
        }

        if (status && status.trim()) {
            whereClauses.push("p.status = ?");
            params.push(status.trim());
        }

        const whereSql = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";
        const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

        const querySql = `
            SELECT p.*, h.hospital_name 
            FROM patients p
            LEFT JOIN hospitals h ON p.hospital_id = h.hospital_id
            ${whereSql}
            ORDER BY p.id DESC
            LIMIT ? OFFSET ?
        `;

        params.push(parseInt(limit, 10), parseInt(offset, 10));

        const [results] = await db.promise().query(querySql, params);

        res.json({
            success: true,
            message: "Patients fetched successfully.",
            count: results.length,
            patients: results
        });
    } catch (err) {
        console.error("[GET PATIENTS ERROR]", err);
        res.status(500).json({ success: false, message: "Failed to fetch patients." });
    }
});

// =========================================================
// 3. GET PATIENT BY PATIENT ID (ACCESS-CONTROLLED)
// =========================================================

router.get("/api/patients/:patientId", optionalToken, async (req, res) => {
    const patientId = req.params.patientId.trim();

    try {
        const [rows] = await db.promise().query(
            `SELECT p.*, h.hospital_name, h.phone AS hospital_phone 
             FROM patients p
             LEFT JOIN hospitals h ON p.hospital_id = h.hospital_id
             WHERE p.patient_id = ? OR p.id = ?
             LIMIT 1`,
            [patientId, isNaN(patientId) ? -1 : parseInt(patientId, 10)]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: "Patient not found in registry." });
        }

        const patient = rows[0];

        // Access control check
        const hasAccess = checkPatientAccess(req, patient);
        if (!hasAccess) {
            return res.status(req.user ? 403 : 401).json({
                success: false,
                message: "Access denied. You can only view your own patient profile."
            });
        }

        await logPatientAudit(patient.patient_id, "VIEWED", req);

        res.json({
            success: true,
            message: "Patient profile found.",
            patient
        });
    } catch (err) {
        console.error("[GET PATIENT BY ID ERROR]", err);
        res.status(500).json({ success: false, message: "Database error fetching patient." });
    }
});

// =========================================================
// 4. UPDATE PATIENT DETAILS (PUT /api/patients/:id)
// =========================================================

router.put("/api/patients/:patientId", optionalToken, async (req, res) => {
    const patientId = req.params.patientId.trim();
    const {
        name,
        dob,
        age,
        gender,
        mobile,
        emergencyContact,
        bloodGroup,
        address,
        hospitalId,
        emergencyInfo
    } = req.body;

    try {
        const [rows] = await db.promise().query(
            "SELECT * FROM patients WHERE patient_id = ? OR id = ? LIMIT 1",
            [patientId, isNaN(patientId) ? -1 : parseInt(patientId, 10)]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: "Patient not found." });
        }

        const patient = rows[0];

        // RBAC check
        const hasAccess = checkPatientAccess(req, patient);
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: "Access denied. You cannot edit this patient." });
        }

        // Recalculate age if dob updated
        let finalAge = age || patient.age;
        if (dob) {
            const calculated = calculateAgeFromDob(dob);
            if (calculated !== null) finalAge = calculated;
        }

        const updateSql = `
            UPDATE patients
            SET name = COALESCE(?, name),
                dob = COALESCE(?, dob),
                age = COALESCE(?, age),
                gender = COALESCE(?, gender),
                mobile = COALESCE(?, mobile),
                emergency_contact = COALESCE(?, emergency_contact),
                blood_group = COALESCE(?, blood_group),
                address = COALESCE(?, address),
                hospital_id = COALESCE(?, hospital_id),
                emergency_info = COALESCE(?, emergency_info)
            WHERE id = ?
        `;

        await db.promise().query(updateSql, [
            name || null,
            dob || null,
            finalAge,
            gender || null,
            mobile || null,
            emergencyContact || null,
            bloodGroup || null,
            address || null,
            hospitalId || null,
            emergencyInfo || null,
            patient.id
        ]);

        await logPatientAudit(patient.patient_id, "UPDATED", req, { updatedFields: Object.keys(req.body) });

        res.json({
            success: true,
            message: "Patient details updated successfully."
        });
    } catch (err) {
        console.error("[UPDATE PATIENT ERROR]", err);
        res.status(500).json({ success: false, message: "Failed to update patient details." });
    }
});

// =========================================================
// 5. GET PATIENT QR CODE PAYLOAD
// =========================================================

router.get("/api/patients/:patientId/qr", optionalToken, async (req, res) => {
    const patientId = req.params.patientId.trim();

    try {
        const [rows] = await db.promise().query(
            "SELECT patient_id, name, qr_token, hospital_id, abha_status, status FROM patients WHERE patient_id = ? OR id = ? LIMIT 1",
            [patientId, isNaN(patientId) ? -1 : parseInt(patientId, 10)]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: "Patient not found." });
        }

        const p = rows[0];

        // If qr_token is missing, generate one
        let token = p.qr_token;
        if (!token) {
            token = "SCPAT-" + crypto.randomBytes(16).toString("hex");
            await db.promise().query("UPDATE patients SET qr_token = ? WHERE patient_id = ?", [token, p.patient_id]);
        }

        const qrPayload = {
            type: "SMARTCITY_PATIENT_ID",
            patientId: p.patient_id,
            qrToken: token,
            verifyUrl: `/api/patients/verify-qr?token=${token}`
        };

        res.json({
            success: true,
            patientId: p.patient_id,
            qrToken: token,
            qrPayload,
            qrText: JSON.stringify(qrPayload)
        });
    } catch (err) {
        console.error("[GET QR ERROR]", err);
        res.status(500).json({ success: false, message: "Failed to load patient QR code." });
    }
});

// =========================================================
// 6. QR SCAN & VERIFICATION WORKFLOW (ROLE-AWARE & SECURE)
// =========================================================

router.post("/api/patients/verify-qr", optionalToken, async (req, res) => {
    try {
        let { qrToken, patientId, qrData } = req.body;

        // Support direct JSON string from camera scanner
        if (qrData) {
            try {
                const parsed = typeof qrData === "string" ? JSON.parse(qrData) : qrData;
                if (parsed.qrToken) qrToken = parsed.qrToken;
                if (parsed.patientId) patientId = parsed.patientId;
            } catch (e) {
                // If not JSON, it might be raw patient ID or token
                if (typeof qrData === "string") {
                    if (qrData.startsWith("SCPAT-")) qrToken = qrData;
                    else patientId = qrData;
                }
            }
        }

        if (!qrToken && !patientId) {
            return res.status(400).json({
                success: false,
                message: "QR Token or Patient ID is required for verification."
            });
        }

        let query = "SELECT p.*, h.hospital_name FROM patients p LEFT JOIN hospitals h ON p.hospital_id = h.hospital_id WHERE ";
        let queryParams = [];

        if (qrToken) {
            query += "p.qr_token = ?";
            queryParams.push(qrToken.trim());
        } else {
            query += "p.patient_id = ?";
            queryParams.push(patientId.trim());
        }
        query += " LIMIT 1";

        const [patients] = await db.promise().query(query, queryParams);

        if (!patients.length) {
            return res.status(404).json({
                success: false,
                isValid: false,
                message: "Invalid or unrecognized Patient QR Code."
            });
        }

        const patient = patients[0];
        const isAuthorized = checkPatientAccess(req, patient);

        // Audit the scan
        await logPatientAudit(patient.patient_id, "QR_SCANNED", req, {
            authorized: isAuthorized,
            scannerRole: req.user ? req.user.role : "unauthenticated"
        });

        // If not authorized (public user / unauthenticated / other citizen):
        // Return safe verification confirmation without medical history
        if (!isAuthorized) {
            return res.json({
                success: true,
                authorized: false,
                requiresAuth: true,
                verification: {
                    isValid: true,
                    patientId: patient.patient_id,
                    maskedName: maskName(patient.name),
                    hospital: patient.hospital_name || patient.hospital_id || "SmartCity Hospital Network",
                    status: patient.status,
                    registeredAt: patient.created_at,
                    message: "Valid SmartCity Patient ID. Please log in as Hospital Staff, Doctor, or Patient to unlock medical dossiers."
                }
            });
        }

        // Authorized: fetch comprehensive medical history (Appointments, Records, Reports, Prescriptions)
        const [records] = await db.promise().query(
            "SELECT * FROM patient_records WHERE patient_id = ? ORDER BY record_date DESC, id DESC",
            [patient.patient_id]
        );

        const [reports] = await db.promise().query(
            "SELECT * FROM patient_reports WHERE patient_id = ? ORDER BY report_date DESC, id DESC",
            [patient.patient_id]
        );

        const [prescriptions] = await db.promise().query(
            "SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY created_at DESC, id DESC",
            [patient.patient_id]
        );

        const [appointments] = await db.promise().query(`
            SELECT a.*, h.hospital_name 
            FROM appointments a
            LEFT JOIN hospitals h ON a.hospital_id = h.hospital_id
            WHERE a.patient_id = ?
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
        `, [patient.patient_id]);

        res.json({
            success: true,
            authorized: true,
            message: "Patient QR verified successfully.",
            patient,
            records,
            reports,
            prescriptions,
            appointments
        });
    } catch (err) {
        console.error("[VERIFY QR ERROR]", err);
        res.status(500).json({ success: false, message: "Error verifying patient QR code." });
    }
});

// =========================================================
// 7. ABHA DEMO / CONSENT LINKING WORKFLOW
// =========================================================

router.post("/api/patients/:patientId/link-abha", optionalToken, async (req, res) => {
    const patientId = req.params.patientId.trim();
    const { abhaAddress, abhaNumber, consentGiven } = req.body;

    if (!consentGiven) {
        return res.status(400).json({
            success: false,
            message: "Patient consent is mandatory under ABDM data privacy guidelines."
        });
    }

    const cleanAbha = (abhaAddress && abhaAddress.trim()) || (abhaNumber && abhaNumber.trim());
    if (!cleanAbha) {
        return res.status(400).json({
            success: false,
            message: "Please provide a valid ABHA Address (e.g. username@abdm)."
        });
    }

    try {
        const [rows] = await db.promise().query(
            "SELECT id, patient_id FROM patients WHERE patient_id = ? OR id = ? LIMIT 1",
            [patientId, isNaN(patientId) ? -1 : parseInt(patientId, 10)]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: "Patient not found." });
        }

        const patient = rows[0];

        await db.promise().query(
            "UPDATE patients SET abha_status = 'Linked', abha_address = ? WHERE id = ?",
            [cleanAbha, patient.id]
        );

        await logPatientAudit(patient.patient_id, "ABHA_LINKED", req, {
            abhaAddress: cleanAbha,
            consentTimestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            message: `ABHA Address "${cleanAbha}" linked successfully under ABDM consent framework.`,
            abhaStatus: "Linked",
            abhaAddress: cleanAbha
        });
    } catch (err) {
        console.error("[LINK ABHA ERROR]", err);
        res.status(500).json({ success: false, message: "Failed to link ABHA address." });
    }
});

router.post("/api/patients/:patientId/unlink-abha", optionalToken, async (req, res) => {
    const patientId = req.params.patientId.trim();

    try {
        const [rows] = await db.promise().query(
            "SELECT id, patient_id FROM patients WHERE patient_id = ? OR id = ? LIMIT 1",
            [patientId, isNaN(patientId) ? -1 : parseInt(patientId, 10)]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: "Patient not found." });
        }

        const patient = rows[0];

        await db.promise().query(
            "UPDATE patients SET abha_status = 'Not Linked', abha_address = NULL WHERE id = ?",
            [patient.id]
        );

        await logPatientAudit(patient.patient_id, "ABHA_UNLINKED", req);

        res.json({
            success: true,
            message: "ABHA Address unlinked successfully.",
            abhaStatus: "Not Linked",
            abhaAddress: null
        });
    } catch (err) {
        console.error("[UNLINK ABHA ERROR]", err);
        res.status(500).json({ success: false, message: "Failed to unlink ABHA." });
    }
});

// =========================================================
// 8. ADMIN PROFILE STATUS TOGGLE (ACTIVE / INACTIVE)
// =========================================================

router.patch("/api/patients/:patientId/status", authenticateToken, requireRole(["admin", "staff"]), async (req, res) => {
    const patientId = req.params.patientId.trim();
    const { status } = req.body;

    if (!["Active", "Inactive"].includes(status)) {
        return res.status(400).json({ success: false, message: "Status must be 'Active' or 'Inactive'." });
    }

    try {
        const [rows] = await db.promise().query(
            "SELECT id, patient_id FROM patients WHERE patient_id = ? OR id = ? LIMIT 1",
            [patientId, isNaN(patientId) ? -1 : parseInt(patientId, 10)]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: "Patient not found." });
        }

        const patient = rows[0];

        await db.promise().query(
            "UPDATE patients SET status = ? WHERE id = ?",
            [status, patient.id]
        );

        await logPatientAudit(patient.patient_id, "STATUS_CHANGED", req, { newStatus: status });

        res.json({
            success: true,
            message: `Patient profile status updated to ${status}.`,
            status
        });
    } catch (err) {
        console.error("[PATIENT STATUS ERROR]", err);
        res.status(500).json({ success: false, message: "Failed to update status." });
    }
});

// =========================================================
// 9. PATIENT APPOINTMENTS LINKAGE
// =========================================================

router.get("/api/patients/:patientId/appointments", optionalToken, async (req, res) => {
    const patientId = req.params.patientId.trim();

    try {
        const [patients] = await db.promise().query(
            "SELECT * FROM patients WHERE patient_id = ? OR id = ? LIMIT 1",
            [patientId, isNaN(patientId) ? -1 : parseInt(patientId, 10)]
        );
        if (!patients.length) {
            return res.status(404).json({ success: false, message: "Patient not found." });
        }
        if (!checkPatientAccess(req, patients[0])) {
            return res.status(req.user ? 403 : 401).json({ success: false, message: "Access denied to patient appointments." });
        }

        const [appointments] = await db.promise().query(`
            SELECT a.*, h.hospital_name 
            FROM appointments a
            LEFT JOIN hospitals h ON a.hospital_id = h.hospital_id
            WHERE a.patient_id = ?
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
        `, [patients[0].patient_id]);

        res.json({
            success: true,
            patientId: patients[0].patient_id,
            appointments
        });
    } catch (err) {
        console.error("[PATIENT APPOINTMENTS ERROR]", err);
        res.status(500).json({ success: false, message: "Failed to load patient appointments." });
    }
});

// =========================================================
// 10. PATIENT PRESCRIPTIONS LINKAGE
// =========================================================

router.get("/api/patients/:patientId/prescriptions", optionalToken, async (req, res) => {
    const patientId = req.params.patientId.trim();

    try {
        const [patients] = await db.promise().query(
            "SELECT * FROM patients WHERE patient_id = ? OR id = ? LIMIT 1",
            [patientId, isNaN(patientId) ? -1 : parseInt(patientId, 10)]
        );
        if (!patients.length) {
            return res.status(404).json({ success: false, message: "Patient not found." });
        }
        if (!checkPatientAccess(req, patients[0])) {
            return res.status(req.user ? 403 : 401).json({ success: false, message: "Access denied to patient prescriptions." });
        }

        const [prescriptions] = await db.promise().query(
            "SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY created_at DESC, id DESC",
            [patients[0].patient_id]
        );

        res.json({
            success: true,
            patientId: patients[0].patient_id,
            prescriptions
        });
    } catch (err) {
        console.error("[PATIENT PRESCRIPTIONS ERROR]", err);
        res.status(500).json({ success: false, message: "Failed to load patient prescriptions." });
    }
});

// =========================================================
// 11. PATIENT MEDICAL RECORDS (CONSULTATIONS & DIAGNOSES)
// =========================================================

router.get("/api/patients/:patientId/records", optionalToken, async (req, res) => {
    const patientId = req.params.patientId.trim();

    if (!patientId) {
        return res.status(400).json({ success: false, message: "Patient ID is required." });
    }

    try {
        const [patients] = await db.promise().query(
            "SELECT * FROM patients WHERE patient_id = ? OR id = ? LIMIT 1",
            [patientId, isNaN(patientId) ? -1 : parseInt(patientId, 10)]
        );
        if (!patients.length) {
            return res.status(404).json({ success: false, message: "Patient not found." });
        }
        if (!checkPatientAccess(req, patients[0])) {
            return res.status(req.user ? 403 : 401).json({ success: false, message: "Access denied to medical records." });
        }

        const [records] = await db.promise().query(
            "SELECT * FROM patient_records WHERE patient_id = ? ORDER BY record_date DESC, id DESC",
            [patients[0].patient_id]
        );

        res.json({
            success: true,
            records
        });
    } catch (err) {
        console.error("[PATIENT RECORDS ERROR]", err);
        res.status(500).json({ success: false, message: "Database error fetching records." });
    }
});

router.post("/api/patients/:patientId/records", authenticateToken, requireRole(["doctor", "staff", "admin"]), async (req, res) => {
    const patientId = req.params.patientId.trim();
    const { doctorName, diagnosis, symptoms, treatment, notes, recordDate } = req.body;

    if (!patientId) {
        return res.status(400).json({ success: false, message: "Patient ID is required." });
    }

    if (!diagnosis && !symptoms && !treatment && !notes) {
        return res.status(400).json({
            success: false,
            message: "At least one of diagnosis, symptoms, treatment, or notes is required."
        });
    }

    try {
        const [lookup] = await db.promise().query(
            "SELECT id, patient_id FROM patients WHERE patient_id = ? OR id = ? LIMIT 1",
            [patientId, isNaN(patientId) ? -1 : parseInt(patientId, 10)]
        );

        if (!lookup.length) {
            return res.status(404).json({ success: false, message: "Patient not found." });
        }

        const canonicalPatientId = lookup[0].patient_id;

        const sql = `
            INSERT INTO patient_records
            (patient_id, doctor_name, diagnosis, symptoms, treatment, notes, record_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.promise().query(sql, [
            canonicalPatientId,
            doctorName || req.user.name || "Attending Doctor",
            diagnosis || null,
            symptoms || null,
            treatment || null,
            notes || null,
            recordDate || new Date()
        ]);

        await logPatientAudit(canonicalPatientId, "RECORD_ADDED", req, { recordId: result.insertId });

        res.status(201).json({
            success: true,
            message: "Medical record added successfully.",
            recordId: result.insertId
        });
    } catch (err) {
        console.error("[ADD RECORD ERROR]", err);
        res.status(500).json({ success: false, message: "Database error adding record." });
    }
});

// =========================================================
// 12. PATIENT DIAGNOSTIC REPORTS
// =========================================================

router.get("/api/patients/:patientId/reports", optionalToken, async (req, res) => {
    const patientId = req.params.patientId.trim();

    try {
        const [patients] = await db.promise().query(
            "SELECT * FROM patients WHERE patient_id = ? OR id = ? LIMIT 1",
            [patientId, isNaN(patientId) ? -1 : parseInt(patientId, 10)]
        );
        if (!patients.length) {
            return res.status(404).json({ success: false, message: "Patient not found." });
        }
        if (!checkPatientAccess(req, patients[0])) {
            return res.status(req.user ? 403 : 401).json({ success: false, message: "Access denied to patient reports." });
        }

        const [reports] = await db.promise().query(
            "SELECT * FROM patient_reports WHERE patient_id = ? ORDER BY report_date DESC, id DESC",
            [patients[0].patient_id]
        );

        res.json({
            success: true,
            reports
        });
    } catch (err) {
        console.error("[PATIENT REPORTS ERROR]", err);
        res.status(500).json({ success: false, message: "Database error fetching reports." });
    }
});

router.post(
    "/api/patients/:patientId/reports",
    authenticateToken,
    requireRole(["doctor", "staff", "admin"]),
    (req, res, next) => {
        reportUpload.single("file")(req, res, (uploadErr) => {
            if (uploadErr) {
                console.error("[REPORT UPLOAD ERROR]", uploadErr);
                return res.status(400).json({ success: false, message: uploadErr.message || "File upload failed." });
            }
            next();
        });
    },
    async (req, res) => {
        const patientId = req.params.patientId.trim();
        const { title, reportType, doctorName, hospitalName, status, reportDate } = req.body;

        if (!patientId || !title) {
            return res.status(400).json({ success: false, message: "Patient ID and report title are required." });
        }

        try {
            const [lookup] = await db.promise().query(
                "SELECT id FROM patients WHERE patient_id = ? LIMIT 1",
                [patientId]
            );

            if (!lookup.length) {
                return res.status(404).json({ success: false, message: "Patient not found." });
            }

            const filePath = req.file ? `/uploads/reports/${req.file.filename}` : null;

            const sql = `
                INSERT INTO patient_reports
                (patient_id, title, report_type, doctor_name, hospital_name, status, file_path, report_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const [result] = await db.promise().query(sql, [
                patientId,
                title,
                reportType || "General Diagnostic",
                doctorName || null,
                hospitalName || null,
                status || "Completed",
                filePath,
                reportDate || new Date()
            ]);

            await logPatientAudit(patientId, "REPORT_ADDED", req, { reportId: result.insertId, title });

            res.status(201).json({
                success: true,
                message: "Report added successfully.",
                reportId: result.insertId,
                filePath
            });
        } catch (err) {
            console.error("[ADD REPORT ERROR]", err);
            res.status(500).json({ success: false, message: "Database error saving report." });
        }
    }
);

// Backward compatibility search endpoint
router.get("/api/patients/search/:patientId", (req, res, next) => {
    req.url = `/api/patients/${encodeURIComponent(req.params.patientId)}`;
    router.handle(req, res, next);
});

module.exports = router;
