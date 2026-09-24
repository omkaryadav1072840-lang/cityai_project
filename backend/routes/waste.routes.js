/**
 * SmartCity AI - Master Waste Management Routes
 * 3-Layer Architecture: Citizen, Waste Staff Operations, Waste Admin & Asset Control
 * Integrated with MySQL Connection Pool, RBAC, SLA Engine, Audit Logger & Socket.IO
 */

const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../config/db");
const pool = db.promise();
const {
    authenticateToken,
    optionalToken,
    requireRole,
    requireDepartment
} = require("../middleware/auth.middleware");
const { logAudit } = require("../services/audit_logger");

// =========================================================
// MULTER STORAGE FOR EVIDENCE UPLOADS
// =========================================================
const uploadDir = path.join(__dirname, "..", "uploads", "waste");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || ".jpg";
        const unique = `waste-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
        cb(null, unique);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp|gif/i;
        const validExt = allowed.test(path.extname(file.originalname).toLowerCase());
        const validMime = allowed.test(file.mimetype);
        if (validExt && validMime) {
            cb(null, true);
        } else {
            cb(new Error("Only image files (JPEG, PNG, WEBP, GIF) are allowed."));
        }
    }
});

// Guard helper: allows admin or staff in waste department
function requireWasteStaff(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Authentication required." });
    }
    const role = (req.user.role || req.user.type || "").toLowerCase();
    if (role === "admin") return next();

    if (role === "staff") {
        const dept = (req.user.department || "").toLowerCase();
        const editable = req.user.editable || [];
        if (dept === "waste" || editable.includes("waste")) {
            return next();
        }
    }

    return res.status(403).json({
        success: false,
        message: "Access denied. Action reserved for Waste Management staff or Administrators."
    });
}

// Rule-based Smart Priority & SLA Calculator for Waste Complaints
function calculateWastePriority({ category = "", description = "", wasteType = "", fillLevel = 0, repeatCount = 0 }) {
    const text = `${category} ${description} ${wasteType}`.toLowerCase();

    // 1. Critical cases: Hazardous, medical waste, severe biohazard, or high repeat count
    if (
        text.includes("hazardous") ||
        text.includes("medical") ||
        text.includes("hospital") ||
        text.includes("chemical") ||
        text.includes("toxic") ||
        text.includes("dead animal") ||
        fillLevel >= 95 ||
        repeatCount >= 4
    ) {
        return {
            priority: "CRITICAL",
            slaHours: 2,
            slaDeadline: new Date(Date.now() + 2 * 3600 * 1000),
            reason: "Hazardous / severe biohazard or critical spill detected."
        };
    }

    // 2. High priority: Overflowing bin, blocked road, market area, large dump
    if (
        text.includes("overflow") ||
        text.includes("road") ||
        text.includes("dump") ||
        text.includes("market") ||
        text.includes("drain") ||
        text.includes("choked") ||
        fillLevel >= 75 ||
        repeatCount >= 2
    ) {
        return {
            priority: "HIGH",
            slaHours: 6,
            slaDeadline: new Date(Date.now() + 6 * 3600 * 1000),
            reason: "Public thoroughfare obstruction or overflowing community container."
        };
    }

    // 3. Medium priority: General litter, plastic waste, scheduled pickup
    if (text.includes("plastic") || text.includes("pickup") || text.includes("organic") || fillLevel >= 40) {
        return {
            priority: "MEDIUM",
            slaHours: 24,
            slaDeadline: new Date(Date.now() + 24 * 3600 * 1000),
            reason: "Standard municipal sanitation and scheduled collection."
        };
    }

    // 4. Low priority: Minor civic inquiry or routine bin request
    return {
        priority: "LOW",
        slaHours: 48,
        slaDeadline: new Date(Date.now() + 48 * 3600 * 1000),
        reason: "Routine civic request or low-density public space maintenance."
    };
}

// =========================================================
// 0. EVIDENCE UPLOAD API
// =========================================================

router.post("/api/waste/upload-evidence", upload.single("evidence"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No image file provided." });
    }

    const fileUrl = `/uploads/waste/${req.file.filename}`;
    return res.json({
        success: true,
        message: "Evidence image uploaded successfully.",
        fileUrl,
        filename: req.file.filename
    });
});

// =========================================================
// LAYER 1: CITIZEN / PUBLIC ENDPOINTS
// =========================================================

/**
 * 1.1 List Public Smart Dustbins
 */
router.get("/api/waste/bins", async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = "SELECT * FROM waste_bins WHERE status != 'Inactive'";
        const params = [];

        if (status && status !== "all") {
            query += " AND LOWER(status) = ?";
            params.push(status.toLowerCase());
        }

        if (search) {
            query += " AND (name LIKE ? OR location LIKE ? OR bin_code LIKE ?)";
            const s = `%${search}%`;
            params.push(s, s, s);
        }

        query += " ORDER BY fill_level DESC, id ASC";
        const [bins] = await pool.query(query, params);

        return res.json({
            success: true,
            count: bins.length,
            bins
        });
    } catch (err) {
        console.error("Fetch waste bins error:", err);
        return res.status(500).json({ success: false, message: "Database error fetching dustbins." });
    }
});

/**
 * 1.2 Citizen Report Waste / Garbage Problem
 */
router.post("/api/waste/reports", optionalToken, upload.single("evidence"), async (req, res) => {
    try {
        const {
            category = "Garbage Dump",
            wasteType = "Mixed Waste",
            location,
            address,
            description,
            latitude,
            longitude,
            citizenName,
            citizenMobile,
            evidenceImageUrl
        } = req.body;

        const loc = address || location;
        if (!loc || !description) {
            return res.status(400).json({
                success: false,
                message: "Location and description are required to file a waste report."
            });
        }

        const lat = latitude ? Number(latitude) : 26.7606;
        const lng = longitude ? Number(longitude) : 83.3732;

        // Evidence image from upload or body URL
        let evidence = null;
        if (req.file) {
            evidence = `/uploads/waste/${req.file.filename}`;
        } else if (evidenceImageUrl) {
            evidence = evidenceImageUrl;
        }

        // Authenticated citizen linkage
        let userId = null;
        let cName = citizenName || "Citizen";
        let cMobile = citizenMobile || null;

        if (req.user) {
            userId = req.user.id || req.user.userId || null;
            cName = req.user.name || cName;
            cMobile = req.user.mobile || cMobile;
        }

        // Check recent complaints in same area to assess repeat count for smart priority
        const [recentComplaints] = await pool.query(
            "SELECT COUNT(*) as cnt FROM service_requests WHERE department = 'waste' AND address LIKE ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)",
            [`%${loc.substring(0, 15)}%`]
        );
        const repeatCount = recentComplaints[0]?.cnt || 0;

        // Calculate Smart Priority & SLA
        const { priority, slaDeadline, reason } = calculateWastePriority({
            category,
            description,
            wasteType,
            repeatCount
        });

        const requestCode = `REQ-WAS-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;

        const [result] = await pool.query(
            `INSERT INTO service_requests
             (request_code, user_id, citizen_name, citizen_mobile, department, category, waste_type,
              description, address, latitude, longitude, priority, status, sla_deadline, evidence_image, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'waste', ?, ?, ?, ?, ?, ?, ?, 'Submitted', ?, ?, NOW(), NOW())`,
            [
                requestCode,
                userId,
                cName,
                cMobile,
                category,
                wasteType,
                description,
                loc,
                lat,
                lng,
                priority,
                slaDeadline,
                evidence
            ]
        );

        const requestId = result.insertId;

        // Notification for waste staff
        await pool.query(
            `INSERT INTO notifications (role, department, type, title, message, module, reference_id)
             VALUES ('staff', 'waste', 'new_request', ?, ?, 'waste', ?)`,
            [
                `New Waste Complaint: ${requestCode}`,
                `${category} reported at ${loc}. Priority: ${priority}`,
                requestCode
            ]
        );

        // Audit Log
        await logAudit(req, {
            userId,
            userName: cName,
            role: req.user ? (req.user.role || "citizen") : "citizen",
            department: "waste",
            action: "CREATE_WASTE_REPORT",
            module: "waste",
            recordId: requestCode,
            metadata: { category, wasteType, location: loc, priority, slaDeadline }
        });

        // Realtime Socket broadcast
        const io = req.app.get("io");
        if (io) {
            io.emit("waste:request_created", {
                id: requestId,
                requestCode,
                category,
                wasteType,
                location: loc,
                latitude: lat,
                longitude: lng,
                priority,
                status: "Submitted",
                evidence,
                citizenName: cName,
                slaDeadline
            });
            io.emit("notification:new", {
                department: "waste",
                title: `New Waste Complaint (${priority})`,
                message: `${requestCode} submitted at ${loc}.`
            });
        }

        return res.status(201).json({
            success: true,
            message: "Waste complaint submitted successfully. Waste operations team notified.",
            request: {
                id: requestId,
                requestCode,
                category,
                wasteType,
                location: loc,
                latitude: lat,
                longitude: lng,
                priority,
                status: "Submitted",
                slaDeadline,
                priorityReason: reason,
                evidenceImage: evidence
            }
        });
    } catch (err) {
        console.error("Create waste report error:", err);
        return res.status(500).json({ success: false, message: "Database error while submitting waste report." });
    }
});

/**
 * 1.3 Citizen Request Scheduled Doorstep Pickup
 */
router.post("/api/waste/pickups", optionalToken, async (req, res) => {
    try {
        const {
            wasteType = "General Waste",
            pickupDate,
            pickupTime = "8:00 AM - 10:00 AM",
            location,
            latitude,
            longitude,
            description
        } = req.body;

        if (!location || !pickupDate) {
            return res.status(400).json({
                success: false,
                message: "Location and pickup date are required."
            });
        }

        const lat = latitude ? Number(latitude) : 26.7606;
        const lng = longitude ? Number(longitude) : 83.3732;

        let userId = null;
        let cName = req.body.citizenName || "Citizen";
        let cMobile = req.body.citizenMobile || null;

        if (req.user) {
            userId = req.user.id || req.user.userId || null;
            cName = req.user.name || cName;
            cMobile = req.user.mobile || cMobile;
        }

        const requestCode = `REQ-PCK-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;
        const slaDeadline = new Date(Date.now() + 24 * 3600 * 1000);

        const [result] = await pool.query(
            `INSERT INTO service_requests
             (request_code, user_id, citizen_name, citizen_mobile, department, category, waste_type,
              description, address, latitude, longitude, priority, status, sla_deadline,
              collection_date, collection_time, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'waste', 'Scheduled Pickup', ?, ?, ?, ?, ?, 'MEDIUM', 'Submitted', ?, ?, ?, NOW(), NOW())`,
            [
                requestCode,
                userId,
                cName,
                cMobile,
                wasteType,
                description || `Doorstep collection on ${pickupDate} (${pickupTime})`,
                location,
                lat,
                lng,
                slaDeadline,
                pickupDate,
                pickupTime
            ]
        );

        const requestId = result.insertId;

        // Broadcast realtime
        const io = req.app.get("io");
        if (io) {
            io.emit("waste:request_created", {
                id: requestId,
                requestCode,
                category: "Scheduled Pickup",
                wasteType,
                location,
                status: "Submitted",
                collectionDate: pickupDate,
                collectionTime: pickupTime
            });
        }

        return res.status(201).json({
            success: true,
            message: "Pickup scheduled successfully.",
            pickup: {
                id: requestId,
                requestCode,
                wasteType,
                location,
                pickupDate,
                pickupTime,
                status: "Submitted"
            }
        });
    } catch (err) {
        console.error("Create pickup error:", err);
        return res.status(500).json({ success: false, message: "Database error while scheduling pickup." });
    }
});

/**
 * 1.4 Citizen Track Own Requests & History
 */
router.get("/api/waste/my-requests", optionalToken, async (req, res) => {
    try {
        let userId = req.user?.id || req.user?.userId || req.query.userId || null;
        let mobile = req.user?.mobile || req.query.mobile || null;

        let reports = [];
        let binRequests = [];

        if (userId || mobile) {
            const [rows] = await pool.query(
                `SELECT * FROM service_requests 
                 WHERE department = 'waste' AND (user_id = ? OR citizen_mobile = ?)
                 ORDER BY created_at DESC`,
                [userId || 0, mobile || ""]
            );
            reports = rows;

            const [binRows] = await pool.query(
                `SELECT * FROM waste_bin_requests 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC`,
                [userId || 0]
            );
            binRequests = binRows;
        }

        return res.json({
            success: true,
            count: reports.length + binRequests.length,
            reports,
            binRequests
        });
    } catch (err) {
        console.error("Fetch my requests error:", err);
        return res.status(500).json({ success: false, message: "Database error fetching requests." });
    }
});

/**
 * 1.5 Nearby Waste Facilities & Recycling Points
 */
router.get("/api/waste/facilities", (req, res) => {
    res.json({
        success: true,
        facilities: [
            {
                id: 1,
                name: "Gorakhpur Municipal Composting Facility",
                type: "Composting Plant",
                address: "Maheshra, Gorakhpur",
                latitude: 26.7850,
                longitude: 83.3550,
                operatingHours: "06:00 AM - 06:00 PM",
                contact: "0551-2334455"
            },
            {
                id: 2,
                name: "Central Solid Waste Transfer Station",
                type: "Transfer Station",
                address: "Transport Nagar, Gorakhpur",
                latitude: 26.7320,
                longitude: 83.3620,
                operatingHours: "24 Hours Active",
                contact: "0551-2334466"
            },
            {
                id: 3,
                name: "Gorakhpur E-Waste & Plastic Recycling Hub",
                type: "Recycling Center",
                address: "GIDA Sector 15, Gorakhpur",
                latitude: 26.7150,
                longitude: 83.2850,
                operatingHours: "09:00 AM - 05:00 PM",
                contact: "0551-2334477"
            },
            {
                id: 4,
                name: "Medical Biohazard Disposal Facility",
                type: "Biomedical Plant",
                address: "Near BRD Medical College, Gorakhpur",
                latitude: 26.7510,
                longitude: 83.3680,
                operatingHours: "24 Hours Specialized",
                contact: "0551-2334488"
            }
        ]
    });
});

/**
 * 1.6 Citizen Dustbin Request (Preserve & Enhance Existing Endpoint)
 */
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

    if (!reason || !wasteType || !location || latitude === undefined || longitude === undefined) {
        return res.status(400).json({
            success: false,
            message: "Reason, waste type, location and GPS coordinates are required."
        });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({
            success: false,
            message: "Invalid latitude or longitude."
        });
    }

    const requestCode = "BIN-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(Math.random() * 10000);

    const sql = `
        INSERT INTO waste_bin_requests
        (request_code, user_id, citizen_name, reason, waste_type, location, latitude, longitude, description, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted')
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
            description || null
        ],
        (err, result) => {
            if (err) {
                console.error("Waste bin request insert error:", err);
                return res.status(500).json({
                    success: false,
                    message: "Database error while submitting dustbin request."
                });
            }

            const io = req.app.get("io");
            if (io) {
                io.emit("waste:bin_request_created", {
                    id: result.insertId,
                    requestCode,
                    citizenName: citizenName || "Citizen",
                    location,
                    reason,
                    wasteType,
                    status: "Submitted"
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

/**
 * 1.7 Get Waste Bin Requests (Preserve & Enhance Existing Endpoint)
 */
router.get("/api/waste/bin-requests", authenticateToken, (req, res) => {
    const { userId } = req.query;
    const role = (req.user.role || req.user.type || "").toLowerCase();
    const isStaffOrAdmin = role === "admin" || (role === "staff" && ((req.user.department || "").toLowerCase() === "waste" || (req.user.editable || []).includes("waste")));

    let sql = `
        SELECT id, request_code, user_id, citizen_name, reason,
               waste_type, location, latitude, longitude,
               description, status, created_at, updated_at
        FROM waste_bin_requests
    `;
    const params = [];
    if (!isStaffOrAdmin) {
        sql += ` WHERE user_id = ? `;
        params.push(req.user.id);
    } else if (userId) {
        sql += ` WHERE user_id = ? `;
        params.push(userId);
    }
    sql += ` ORDER BY created_at DESC `;

    db.query(sql, params, (err, rows) => {
        if (err) {
            console.error("Waste bin request fetch error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }
        res.json({ success: true, requests: rows });
    });
});

/**
 * 1.8 Update Dustbin Request Status (Preserve & Enhance Existing Endpoint)
 */
router.put("/api/waste/bin-requests/:requestCode/status", authenticateToken, requireWasteStaff, (req, res) => {
    const { requestCode } = req.params;
    const { status, internal_remarks, scheduled_date } = req.body;

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
        SET status = ?, 
            internal_remarks = COALESCE(?, internal_remarks),
            scheduled_date = COALESCE(?, scheduled_date),
            assigned_staff_id = COALESCE(?, assigned_staff_id),
            assigned_staff_name = COALESCE(?, assigned_staff_name)
        WHERE request_code = ?
    `;

    db.query(
        sql,
        [
            status,
            internal_remarks || null,
            scheduled_date || null,
            req.user.id || null,
            req.user.name || null,
            requestCode
        ],
        (err, result) => {
            if (err) {
                console.error("Waste bin request status update error:", err);
                return res.status(500).json({ success: false, message: "Database error." });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "Dustbin request not found." });
            }

            const io = req.app.get("io");
            if (io) {
                io.emit("waste:bin_request_updated", { requestCode, status });
            }

            res.json({
                success: true,
                message: "Dustbin request status updated successfully.",
                requestCode,
                status
            });
        }
    );
});

// =========================================================
// LAYER 2: WASTE STAFF / OPERATIONS ENDPOINTS
// =========================================================

/**
 * 2.1 View All Citizen Waste Requests (Search / Filter / Sort)
 */
router.get("/api/waste/requests", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        const {
            status,
            priority,
            wasteType,
            location,
            search,
            workerId,
            vehicleId,
            date,
            page = 1,
            limit = 50
        } = req.query;

        let query = "SELECT * FROM service_requests WHERE department = 'waste'";
        const params = [];

        if (status && status !== "all") {
            query += " AND status = ?";
            params.push(status);
        }

        if (priority && priority !== "all") {
            query += " AND priority = ?";
            params.push(priority);
        }

        if (wasteType && wasteType !== "all") {
            query += " AND (waste_type LIKE ? OR category LIKE ?)";
            params.push(`%${wasteType}%`, `%${wasteType}%`);
        }

        if (location) {
            query += " AND address LIKE ?";
            params.push(`%${location}%`);
        }

        if (workerId) {
            query += " AND assigned_worker_id = ?";
            params.push(Number(workerId));
        }

        if (vehicleId) {
            query += " AND assigned_vehicle_id = ?";
            params.push(Number(vehicleId));
        }

        if (date) {
            query += " AND DATE(created_at) = ?";
            params.push(date);
        }

        if (search) {
            query += " AND (request_code LIKE ? OR category LIKE ? OR address LIKE ? OR citizen_name LIKE ? OR description LIKE ?)";
            const s = `%${search}%`;
            params.push(s, s, s, s, s);
        }

        query += " ORDER BY CASE priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END, created_at DESC";

        const offset = (Number(page) - 1) * Number(limit);
        query += " LIMIT ? OFFSET ?";
        params.push(Number(limit), Number(offset));

        const [rows] = await pool.query(query, params);

        const now = Date.now();
        const enriched = rows.map(r => {
            let slaRemainingMinutes = null;
            let isOverdue = false;
            if (r.sla_deadline && !["Resolved", "Rejected"].includes(r.status)) {
                const diffMs = new Date(r.sla_deadline).getTime() - now;
                slaRemainingMinutes = Math.round(diffMs / 60000);
                isOverdue = slaRemainingMinutes < 0;
            }
            return { ...r, slaRemainingMinutes, isOverdue };
        });

        return res.json({
            success: true,
            count: enriched.length,
            page: Number(page),
            data: enriched
        });
    } catch (err) {
        console.error("List waste requests error:", err);
        return res.status(500).json({ success: false, message: "Database error listing waste requests." });
    }
});

/**
 * 2.2 Get Request Details & Citizen History
 */
router.get("/api/waste/requests/:id", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        const idOrCode = req.params.id;
        const [rows] = await pool.query(
            "SELECT * FROM service_requests WHERE (id = ? OR request_code = ?) AND department = 'waste' LIMIT 1",
            [idOrCode, idOrCode]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Waste request not found." });
        }

        const request = rows[0];

        // Fetch citizen previous history if user_id or mobile exists
        let citizenHistory = [];
        if (request.user_id || request.citizen_mobile) {
            const [history] = await pool.query(
                `SELECT id, request_code, category, waste_type, address, status, priority, created_at 
                 FROM service_requests 
                 WHERE department = 'waste' AND id != ? AND (user_id = ? OR citizen_mobile = ?)
                 ORDER BY created_at DESC LIMIT 5`,
                [request.id, request.user_id || 0, request.citizen_mobile || ""]
            );
            citizenHistory = history;
        }

        return res.json({
            success: true,
            data: request,
            citizenHistory
        });
    } catch (err) {
        console.error("Get waste request error:", err);
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

/**
 * 2.3 Operational Control: Staff Updates Request Properties
 * Edit: status, priority, assigned worker, vehicle, route, remarks, location, waste type, evidence
 */
router.put("/api/waste/requests/:id", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        const idOrCode = req.params.id;
        const [rows] = await pool.query(
            "SELECT * FROM service_requests WHERE (id = ? OR request_code = ?) AND department = 'waste' LIMIT 1",
            [idOrCode, idOrCode]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Waste request not found." });
        }

        const current = rows[0];
        const {
            status,
            priority,
            assigned_worker_id,
            assigned_worker_name,
            assigned_vehicle_id,
            assigned_vehicle_number,
            assigned_route_id,
            internal_remarks,
            resolution_notes,
            address,
            waste_type,
            evidence_image
        } = req.body;

        const newStatus = status || current.status;
        const newPriority = priority || current.priority;
        const isResolved = newStatus === "Resolved";

        await pool.query(
            `UPDATE service_requests
             SET status = ?,
                 priority = ?,
                 assigned_worker_id = COALESCE(?, assigned_worker_id),
                 assigned_worker_name = COALESCE(?, assigned_worker_name),
                 assigned_vehicle_id = COALESCE(?, assigned_vehicle_id),
                 assigned_vehicle_number = COALESCE(?, assigned_vehicle_number),
                 assigned_route_id = COALESCE(?, assigned_route_id),
                 internal_remarks = COALESCE(?, internal_remarks),
                 resolution_notes = COALESCE(?, resolution_notes),
                 address = COALESCE(?, address),
                 waste_type = COALESCE(?, waste_type),
                 evidence_image = COALESCE(?, evidence_image),
                 assigned_staff_id = ?,
                 assigned_staff_name = ?,
                 resolved_at = ${isResolved ? "COALESCE(resolved_at, NOW())" : "NULL"},
                 updated_at = NOW()
             WHERE id = ?`,
            [
                newStatus,
                newPriority,
                assigned_worker_id || null,
                assigned_worker_name || null,
                assigned_vehicle_id || null,
                assigned_vehicle_number || null,
                assigned_route_id || null,
                internal_remarks || null,
                resolution_notes || null,
                address || null,
                waste_type || null,
                evidence_image || null,
                req.user.id || req.user.userId,
                req.user.name || "Waste Staff",
                current.id
            ]
        );

        // Notify Citizen on status update
        if (current.user_id && newStatus !== current.status) {
            await pool.query(
                `INSERT INTO notifications (user_id, role, department, type, title, message, module, reference_id)
                 VALUES (?, 'citizen', 'waste', 'status_update', ?, ?, 'waste', ?)`,
                [
                    current.user_id,
                    `Waste Request Updated: ${current.request_code}`,
                    `Your waste request status is now '${newStatus}'. ${resolution_notes ? 'Notes: ' + resolution_notes : ''}`,
                    current.request_code
                ]
            );
        }

        // Audit Log
        await logAudit(req, {
            action: `OPERATIONAL_UPDATE_REQUEST_${newStatus.toUpperCase()}`,
            module: "waste",
            recordId: current.request_code,
            department: "waste",
            metadata: {
                oldStatus: current.status,
                newStatus,
                worker: assigned_worker_name,
                vehicle: assigned_vehicle_number,
                priority: newPriority
            }
        });

        // Realtime Socket broadcast
        const io = req.app.get("io");
        if (io) {
            io.emit("waste:request_updated", {
                id: current.id,
                requestCode: current.request_code,
                status: newStatus,
                priority: newPriority,
                assignedWorkerName: assigned_worker_name || current.assigned_worker_name,
                assignedVehicleNumber: assigned_vehicle_number || current.assigned_vehicle_number,
                resolutionNotes: resolution_notes || current.resolution_notes
            });
            io.emit("request:status_updated", {
                id: current.id,
                requestCode: current.request_code,
                status: newStatus
            });
        }

        return res.json({
            success: true,
            message: `Waste request ${current.request_code} updated successfully.`,
            data: {
                id: current.id,
                requestCode: current.request_code,
                status: newStatus,
                priority: newPriority,
                assigned_worker_name: assigned_worker_name || current.assigned_worker_name,
                assigned_vehicle_number: assigned_vehicle_number || current.assigned_vehicle_number
            }
        });
    } catch (err) {
        console.error("Update waste request error:", err);
        return res.status(500).json({ success: false, message: "Database error updating request." });
    }
});

/**
 * 2.4 Reopen Resolved Request
 */
router.post("/api/waste/requests/:id/reopen", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        const idOrCode = req.params.id;
        const [rows] = await pool.query(
            "SELECT * FROM service_requests WHERE (id = ? OR request_code = ?) AND department = 'waste' LIMIT 1",
            [idOrCode, idOrCode]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Waste request not found." });
        }

        const request = rows[0];
        const reason = req.body.reason || "Citizen reported recurring problem or incomplete clearing.";

        await pool.query(
            `UPDATE service_requests
             SET status = 'In Progress',
                 priority = 'HIGH',
                 resolved_at = NULL,
                 internal_remarks = CONCAT(COALESCE(internal_remarks, ''), '\n[Reopened]: ', ?),
                 updated_at = NOW()
             WHERE id = ?`,
            [reason, request.id]
        );

        // Notify citizen
        if (request.user_id) {
            await pool.query(
                `INSERT INTO notifications (user_id, role, department, type, title, message, module, reference_id)
                 VALUES (?, 'citizen', 'waste', 'status_update', ?, ?, 'waste', ?)`,
                [
                    request.user_id,
                    `Request Reopened: ${request.request_code}`,
                    `Your request has been reopened for follow-up inspection and clearance.`,
                    request.request_code
                ]
            );
        }

        const io = req.app.get("io");
        if (io) {
            io.emit("waste:request_updated", {
                id: request.id,
                requestCode: request.request_code,
                status: "In Progress",
                priority: "HIGH"
            });
        }

        return res.json({
            success: true,
            message: `Request ${request.request_code} reopened successfully.`,
            status: "In Progress"
        });
    } catch (err) {
        console.error("Reopen waste request error:", err);
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

/**
 * 2.5 Realtime Operations Summary Counters
 */
router.get("/api/waste/operations/summary", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        const [requests] = await pool.query(`
            SELECT 
                COUNT(*) as totalRequests,
                SUM(CASE WHEN status = 'Submitted' THEN 1 ELSE 0 END) as pendingRequests,
                SUM(CASE WHEN status = 'Assigned' THEN 1 ELSE 0 END) as assignedRequests,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inProgressOperations,
                SUM(CASE WHEN status = 'Resolved' AND DATE(resolved_at) = CURDATE() THEN 1 ELSE 0 END) as resolvedToday,
                SUM(CASE WHEN status NOT IN ('Resolved', 'Rejected') AND sla_deadline < NOW() THEN 1 ELSE 0 END) as delayedCollections
            FROM service_requests
            WHERE department = 'waste'
        `);

        const [bins] = await pool.query(`
            SELECT 
                COUNT(*) as totalBins,
                SUM(CASE WHEN fill_level >= 85 OR status = 'Overflowing' THEN 1 ELSE 0 END) as overflowingBins,
                SUM(CASE WHEN fill_level = 0 OR status = 'Empty' THEN 1 ELSE 0 END) as emptyBins,
                SUM(CASE WHEN fill_level > 0 AND fill_level <= 50 THEN 1 ELSE 0 END) as normalBins,
                SUM(CASE WHEN fill_level > 50 AND fill_level < 85 THEN 1 ELSE 0 END) as halfBins
            FROM waste_bins
            WHERE status != 'Inactive'
        `);

        const [vehicles] = await pool.query(`
            SELECT 
                COUNT(*) as totalVehicles,
                SUM(CASE WHEN status = 'On Route' THEN 1 ELSE 0 END) as onRouteVehicles,
                SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as availableVehicles
            FROM waste_vehicles
        `);

        const [workers] = await pool.query(`
            SELECT 
                COUNT(*) as totalWorkers,
                SUM(CASE WHEN status IN ('Active', 'On Duty') THEN 1 ELSE 0 END) as activeWorkers
            FROM waste_workers
        `);

        return res.json({
            success: true,
            data: {
                ...requests[0],
                ...bins[0],
                ...vehicles[0],
                ...workers[0]
            }
        });
    } catch (err) {
        console.error("Operations summary error:", err);
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

// =========================================================
// LAYER 3: WASTE ADMIN / ASSET MANAGEMENT ENDPOINTS (CRUD)
// =========================================================

// --- BINS CRUD ---
router.post("/api/waste/bins", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        const {
            name,
            location,
            latitude,
            longitude,
            capacity_liters = 500,
            bin_type = "Mixed Waste",
            fill_level = 0,
            collection_schedule = "Daily 07:00 AM",
            route_id
        } = req.body;

        if (!name || !location || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ success: false, message: "Name, location and coordinates are required." });
        }

        const binCode = `BIN-${location.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
        const fill = Math.min(100, Math.max(0, Number(fill_level) || 0));
        let status = "Normal";
        if (fill === 0) status = "Empty";
        else if (fill >= 90) status = "Overflowing";
        else if (fill >= 70) status = "Nearly Full";

        const [result] = await pool.query(
            `INSERT INTO waste_bins 
             (bin_code, name, location, latitude, longitude, capacity_liters, bin_type, fill_level, status, collection_schedule, route_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [binCode, name, location, latitude, longitude, capacity_liters, bin_type, fill, status, collection_schedule, route_id || null]
        );

        const io = req.app.get("io");
        if (io) {
            io.emit("waste:bin_updated", { id: result.insertId, binCode, name, fill_level: fill, status });
        }

        return res.status(201).json({
            success: true,
            message: "Smart bin created successfully.",
            bin: { id: result.insertId, binCode, name, location, fill_level: fill, status }
        });
    } catch (err) {
        console.error("Create bin error:", err);
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

router.put("/api/waste/bins/:id", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        const binId = req.params.id;
        const {
            name,
            location,
            latitude,
            longitude,
            capacity_liters,
            bin_type,
            fill_level,
            status,
            collection_schedule,
            route_id
        } = req.body;

        let derivedStatus = status;
        if (fill_level !== undefined && !status) {
            const fill = Number(fill_level);
            if (fill === 0) derivedStatus = "Empty";
            else if (fill >= 90) derivedStatus = "Overflowing";
            else if (fill >= 70) derivedStatus = "Nearly Full";
            else derivedStatus = "Normal";
        }

        await pool.query(
            `UPDATE waste_bins
             SET name = COALESCE(?, name),
                 location = COALESCE(?, location),
                 latitude = COALESCE(?, latitude),
                 longitude = COALESCE(?, longitude),
                 capacity_liters = COALESCE(?, capacity_liters),
                 bin_type = COALESCE(?, bin_type),
                 fill_level = COALESCE(?, fill_level),
                 status = COALESCE(?, status),
                 collection_schedule = COALESCE(?, collection_schedule),
                 route_id = COALESCE(?, route_id),
                 last_emptied_at = CASE WHEN ? = 0 THEN NOW() ELSE last_emptied_at END
             WHERE id = ?`,
            [
                name || null,
                location || null,
                latitude !== undefined ? Number(latitude) : null,
                longitude !== undefined ? Number(longitude) : null,
                capacity_liters !== undefined ? Number(capacity_liters) : null,
                bin_type || null,
                fill_level !== undefined ? Number(fill_level) : null,
                derivedStatus || null,
                collection_schedule || null,
                route_id || null,
                fill_level !== undefined ? Number(fill_level) : null,
                binId
            ]
        );

        const io = req.app.get("io");
        if (io) {
            io.emit("waste:bin_updated", { id: binId, fill_level, status: derivedStatus });
        }

        return res.json({ success: true, message: "Bin updated successfully." });
    } catch (err) {
        console.error("Update bin error:", err);
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

router.delete("/api/waste/bins/:id", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        await pool.query("UPDATE waste_bins SET status = 'Inactive' WHERE id = ?", [req.params.id]);
        return res.json({ success: true, message: "Bin deactivated successfully." });
    } catch (err) {
        console.error("Delete bin error:", err);
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

router.put("/api/waste/bins/:id/fill", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        const binId = req.params.id;
        const fill = Math.min(100, Math.max(0, Number(req.body.fill_level) || 0));

        let status = "Normal";
        if (fill === 0) status = "Empty";
        else if (fill >= 90) status = "Overflowing";
        else if (fill >= 70) status = "Nearly Full";

        await pool.query(
            "UPDATE waste_bins SET fill_level = ?, status = ?, last_emptied_at = CASE WHEN ? = 0 THEN NOW() ELSE last_emptied_at END WHERE id = ?",
            [fill, status, fill, binId]
        );

        const io = req.app.get("io");
        if (io) {
            io.emit("waste:bin_updated", { id: binId, fill_level: fill, status });
        }

        return res.json({ success: true, message: "Fill level updated.", fill_level: fill, status });
    } catch (err) {
        console.error("Update fill error:", err);
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

// --- VEHICLES CRUD ---
router.get("/api/waste/vehicles", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        const [vehicles] = await pool.query("SELECT * FROM waste_vehicles ORDER BY id ASC");
        return res.json({ success: true, vehicles });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

router.post("/api/waste/vehicles", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        const { vehicle_number, vehicle_type, capacity_tons, driver_name, driver_phone, status } = req.body;
        if (!vehicle_number || !driver_name || !driver_phone) {
            return res.status(400).json({ success: false, message: "Vehicle number, driver name and phone are required." });
        }

        const [result] = await pool.query(
            `INSERT INTO waste_vehicles (vehicle_number, vehicle_type, capacity_tons, driver_name, driver_phone, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [vehicle_number, vehicle_type || "Hydraulic Compactor", capacity_tons || 5.0, driver_name, driver_phone, status || "Available"]
        );

        return res.status(201).json({ success: true, message: "Vehicle added successfully.", id: result.insertId });
    } catch (err) {
        console.error("Create vehicle error:", err);
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

router.put("/api/waste/vehicles/:id", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        const { vehicle_number, vehicle_type, capacity_tons, driver_name, driver_phone, status, current_route_id } = req.body;
        await pool.query(
            `UPDATE waste_vehicles
             SET vehicle_number = COALESCE(?, vehicle_number),
                 vehicle_type = COALESCE(?, vehicle_type),
                 capacity_tons = COALESCE(?, capacity_tons),
                 driver_name = COALESCE(?, driver_name),
                 driver_phone = COALESCE(?, driver_phone),
                 status = COALESCE(?, status),
                 current_route_id = COALESCE(?, current_route_id)
             WHERE id = ?`,
            [vehicle_number || null, vehicle_type || null, capacity_tons || null, driver_name || null, driver_phone || null, status || null, current_route_id || null, req.params.id]
        );
        return res.json({ success: true, message: "Vehicle updated successfully." });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

router.delete("/api/waste/vehicles/:id", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        await pool.query("UPDATE waste_vehicles SET status = 'Inactive' WHERE id = ?", [req.params.id]);
        return res.json({ success: true, message: "Vehicle deactivated." });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

// --- WORKERS CRUD ---
router.get("/api/waste/workers", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        const [workers] = await pool.query("SELECT * FROM waste_workers WHERE status != 'Inactive' ORDER BY id ASC");
        return res.json({ success: true, workers });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

router.post("/api/waste/workers", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        const { name, phone, role, status, assigned_vehicle_id, assigned_route_id } = req.body;
        if (!name || !phone) {
            return res.status(400).json({ success: false, message: "Worker name and phone are required." });
        }

        const workerCode = `WRK-${Math.floor(100 + Math.random() * 900)}`;
        const [result] = await pool.query(
            `INSERT INTO waste_workers (worker_code, name, phone, role, status, assigned_vehicle_id, assigned_route_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [workerCode, name, phone, role || "Sanitation Worker", status || "Active", assigned_vehicle_id || null, assigned_route_id || null]
        );

        return res.status(201).json({ success: true, message: "Worker registered successfully.", id: result.insertId, workerCode });
    } catch (err) {
        console.error("Create worker error:", err);
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

router.put("/api/waste/workers/:id", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        const { name, phone, role, status, assigned_vehicle_id, assigned_route_id } = req.body;
        await pool.query(
            `UPDATE waste_workers
             SET name = COALESCE(?, name),
                 phone = COALESCE(?, phone),
                 role = COALESCE(?, role),
                 status = COALESCE(?, status),
                 assigned_vehicle_id = COALESCE(?, assigned_vehicle_id),
                 assigned_route_id = COALESCE(?, assigned_route_id)
             WHERE id = ?`,
            [name || null, phone || null, role || null, status || null, assigned_vehicle_id || null, assigned_route_id || null, req.params.id]
        );
        return res.json({ success: true, message: "Worker updated successfully." });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

router.delete("/api/waste/workers/:id", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        await pool.query("UPDATE waste_workers SET status = 'Inactive' WHERE id = ?", [req.params.id]);
        return res.json({ success: true, message: "Worker deactivated." });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

// --- ROUTES CRUD ---
router.get("/api/waste/routes", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        const [routes] = await pool.query(`
            SELECT r.*, v.vehicle_number, v.driver_name
            FROM waste_routes r
            LEFT JOIN waste_vehicles v ON r.assigned_vehicle_id = v.id
            WHERE r.status != 'Suspended'
            ORDER BY r.id ASC
        `);
        return res.json({ success: true, routes });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

router.post("/api/waste/routes", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        const { route_name, area, schedule, assigned_vehicle_id, waypoints_json } = req.body;
        if (!route_name || !area) {
            return res.status(400).json({ success: false, message: "Route name and area are required." });
        }

        const routeCode = `RT-${area.substring(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;
        const [result] = await pool.query(
            `INSERT INTO waste_routes (route_code, route_name, area, schedule, assigned_vehicle_id, waypoints_json)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [routeCode, route_name, area, schedule || "Daily 06:00 AM - 10:00 AM", assigned_vehicle_id || null, waypoints_json || null]
        );

        return res.status(201).json({ success: true, message: "Route created successfully.", id: result.insertId, routeCode });
    } catch (err) {
        console.error("Create route error:", err);
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

router.put("/api/waste/routes/:id", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        const { route_name, area, schedule, assigned_vehicle_id, status, waypoints_json } = req.body;
        await pool.query(
            `UPDATE waste_routes
             SET route_name = COALESCE(?, route_name),
                 area = COALESCE(?, area),
                 schedule = COALESCE(?, schedule),
                 assigned_vehicle_id = COALESCE(?, assigned_vehicle_id),
                 status = COALESCE(?, status),
                 waypoints_json = COALESCE(?, waypoints_json)
             WHERE id = ?`,
            [route_name || null, area || null, schedule || null, assigned_vehicle_id || null, status || null, waypoints_json || null, req.params.id]
        );
        return res.json({ success: true, message: "Route updated successfully." });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

router.delete("/api/waste/routes/:id", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        await pool.query("UPDATE waste_routes SET status = 'Suspended' WHERE id = ?", [req.params.id]);
        return res.json({ success: true, message: "Route suspended." });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

// =========================================================
// SMART WASTE FEATURES & ANALYTICS
// =========================================================

/**
 * 4.1 Comprehensive Waste Analytics
 */
router.get("/api/waste/analytics", authenticateToken, requireWasteStaff, async (req, res) => {
    try {
        // Status breakdown
        const [statusCounts] = await pool.query(`
            SELECT 
                COUNT(*) as totalRequests,
                SUM(CASE WHEN status = 'Submitted' THEN 1 ELSE 0 END) as submitted,
                SUM(CASE WHEN status = 'Assigned' THEN 1 ELSE 0 END) as assigned,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inProgress,
                SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
                SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected
            FROM service_requests
            WHERE department = 'waste'
        `);

        // Waste types breakdown
        const [wasteTypes] = await pool.query(`
            SELECT COALESCE(waste_type, category) as typeName, COUNT(*) as count
            FROM service_requests
            WHERE department = 'waste'
            GROUP BY typeName
            ORDER BY count DESC
            LIMIT 6
        `);

        // Requests by Area
        const [areas] = await pool.query(`
            SELECT SUBSTRING_INDEX(address, ',', 1) as areaName, COUNT(*) as count
            FROM service_requests
            WHERE department = 'waste' AND address IS NOT NULL
            GROUP BY areaName
            ORDER BY count DESC
            LIMIT 5
        `);

        // 7-day trend
        const [trend] = await pool.query(`
            SELECT DATE(created_at) as date, COUNT(*) as createdCount,
                   SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolvedCount
            FROM service_requests
            WHERE department = 'waste' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);

        // Bin status breakdown
        const [bins] = await pool.query(`
            SELECT 
                COUNT(*) as totalBins,
                SUM(CASE WHEN fill_level >= 85 THEN 1 ELSE 0 END) as overflowing,
                SUM(CASE WHEN fill_level >= 60 AND fill_level < 85 THEN 1 ELSE 0 END) as full,
                SUM(CASE WHEN fill_level >= 30 AND fill_level < 60 THEN 1 ELSE 0 END) as half,
                SUM(CASE WHEN fill_level < 30 THEN 1 ELSE 0 END) as emptyBins
            FROM waste_bins
            WHERE status != 'Inactive'
        `);

        const total = statusCounts[0].totalRequests || 0;
        const resolved = statusCounts[0].resolved || 0;
        const collectionEfficiency = total > 0 ? Math.round((resolved / total) * 100) : 100;

        return res.json({
            success: true,
            analytics: {
                summary: {
                    ...statusCounts[0],
                    collectionEfficiency,
                    ...bins[0]
                },
                wasteTypes,
                topAreas: areas,
                trend
            }
        });
    } catch (err) {
        console.error("Waste analytics error:", err);
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

/**
 * 4.2 Waste Hotspot Detection
 * Clusters recurring complaints & overflowing bins in Gorakhpur
 */
router.get("/api/waste/hotspots", async (req, res) => {
    try {
        const [complaintClusters] = await pool.query(`
            SELECT 
                address as location,
                AVG(latitude) as latitude,
                AVG(longitude) as longitude,
                COUNT(*) as complaintCount,
                SUM(CASE WHEN priority = 'CRITICAL' THEN 2 ELSE 1 END) as severityScore,
                MAX(created_at) as lastIncidentAt
            FROM service_requests
            WHERE department = 'waste' AND address IS NOT NULL AND status != 'Resolved'
            GROUP BY address
            HAVING complaintCount >= 1
            ORDER BY severityScore DESC, complaintCount DESC
            LIMIT 10
        `);

        const [overflowingBins] = await pool.query(`
            SELECT 
                id, bin_code, name, location, latitude, longitude, fill_level,
                'Overflowing Dustbin' as type
            FROM waste_bins
            WHERE fill_level >= 80 AND status != 'Inactive'
        `);

        const hotspots = complaintClusters.map(c => {
            let level = "LOW";
            if (c.complaintCount >= 3 || c.severityScore >= 5) level = "CRITICAL";
            else if (c.complaintCount >= 2 || c.severityScore >= 3) level = "HIGH";
            else level = "MEDIUM";

            return {
                location: c.location,
                latitude: Number(c.latitude) || 26.7606,
                longitude: Number(c.longitude) || 83.3732,
                complaints: c.complaintCount,
                severityScore: c.severityScore,
                level,
                lastIncident: c.lastIncidentAt
            };
        });

        return res.json({
            success: true,
            count: hotspots.length,
            hotspots,
            overflowingBins
        });
    } catch (err) {
        console.error("Hotspots error:", err);
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

/**
 * 4.3 Rule-based Smart Priority Evaluator
 */
router.post("/api/waste/smart-priority", (req, res) => {
    const { category, description, wasteType, fillLevel, repeatCount } = req.body;
    const assessment = calculateWastePriority({
        category,
        description,
        wasteType,
        fillLevel: Number(fillLevel) || 0,
        repeatCount: Number(repeatCount) || 0
    });

    return res.json({
        success: true,
        ...assessment
    });
});

module.exports = router;
