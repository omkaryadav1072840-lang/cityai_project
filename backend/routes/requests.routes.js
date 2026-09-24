const express = require("express");
const router = express.Router();
const pool = require("../config/db").promise();
const { authenticateToken, optionalToken, requireRole } = require("../middleware/auth.middleware");
const { calculatePriorityAndSLA } = require("../services/priority_engine");
const { logAudit } = require("../services/audit_logger");

// Helper: check if staff or admin is authorized for a given department
function canManageDepartment(user, dept) {
    if (!user) return false;
    const role = (user.role || user.type || "").toLowerCase();
    if (role === "admin") return true;
    if (role === "staff") {
        const staffDept = (user.department || "").toLowerCase();
        const targetDept = (dept || "").toLowerCase();
        return staffDept === targetDept;
    }
    return false;
}

// =========================================================
// 1. CREATE SERVICE REQUEST / COMPLAINT
// =========================================================

router.post("/api/requests", optionalToken, async (req, res) => {
    try {
        const {
            department,
            category,
            description,
            latitude,
            longitude,
            address,
            urgency,
            citizen_name,
            citizen_mobile
        } = req.body;

        if (!department || !category || !description) {
            return res.status(400).json({
                success: false,
                message: "Department, category, and description are required."
            });
        }

        // Calculate intelligent priority & SLA
        const { priority, slaDeadline, reason } = calculatePriorityAndSLA({
            department,
            category,
            description,
            urgency
        });

        // Generate unique human-readable request code
        const deptPrefix = department.substring(0, 3).toUpperCase();
        const randSuffix = Math.floor(1000 + Math.random() * 9000);
        const requestCode = `REQ-${deptPrefix}-${Date.now().toString().slice(-4)}${randSuffix}`;

        let userId = null;
        let cName = citizen_name || "Citizen";
        let cMobile = citizen_mobile || null;

        // If authenticated via verified JWT, associate user ID securely
        if (req.user) {
            userId = req.user.id || req.user.userId || null;
            cName = req.user.name || cName;
            cMobile = req.user.mobile || cMobile;
        }

        const [result] = await pool.query(
            `INSERT INTO service_requests 
             (request_code, user_id, citizen_name, citizen_mobile, department, category, description, latitude, longitude, address, priority, status, sla_deadline)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', ?)`,
            [
                requestCode,
                userId,
                cName,
                cMobile,
                department,
                category,
                description,
                latitude || null,
                longitude || null,
                address || null,
                priority,
                slaDeadline
            ]
        );

        const requestId = result.insertId;

        // Insert notification for department staff & admin
        await pool.query(
            `INSERT INTO notifications (role, department, type, title, message, module, reference_id)
             VALUES ('staff', ?, 'new_request', ?, ?, 'requests', ?)`,
            [
                department,
                `New ${priority} Request: ${requestCode}`,
                `Citizen reported ${category} in ${address || department}. SLA: ${slaDeadline.toLocaleTimeString()}`,
                requestCode
            ]
        );

        // Audit log
        await logAudit(req, {
            userId,
            userName: cName,
            role: "citizen",
            department,
            action: "CREATE_SERVICE_REQUEST",
            module: "requests",
            recordId: requestCode,
            metadata: { priority, category, department, slaDeadline }
        });

        // Broadcast real-time socket event
        const io = req.app.get("io");
        if (io) {
            io.emit("request:created", {
                id: requestId,
                requestCode,
                department,
                category,
                priority,
                status: "Submitted",
                slaDeadline,
                created_at: new Date().toISOString()
            });
            io.emit("notification:new", {
                department,
                title: `New ${priority} Request`,
                message: `${requestCode} submitted in ${department}.`
            });
        }

        res.status(201).json({
            success: true,
            message: "Request submitted successfully.",
            data: {
                id: requestId,
                requestCode,
                department,
                category,
                priority,
                status: "Submitted",
                slaDeadline,
                priorityAssessment: reason
            }
        });
    } catch (err) {
        console.error("Create request error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// =========================================================
// 2. LIST SERVICE REQUESTS (Scoped by role & department)
// =========================================================

router.get("/api/requests", authenticateToken, async (req, res) => {
    try {
        const { department, status, priority, search, page = 1, limit = 50 } = req.query;
        const user = req.user;
        const role = (user.role || user.type || "").toLowerCase();

        let query = "SELECT * FROM service_requests WHERE 1=1";
        const params = [];

        // Role-based scoping:
        // Staff can strictly view ONLY requests in their assigned department!
        if (role === "staff") {
            const staffDept = (user.department || "").toLowerCase();
            query += " AND LOWER(department) = ?";
            params.push(staffDept);
        } else if (role === "citizen") {
            // Citizen sees strictly their own submitted requests (isolated by user_id or verified mobile)
            const uid = user.id || user.userId || -1;
            const mobile = user.mobile ? String(user.mobile).trim() : null;
            if (mobile) {
                query += " AND (user_id = ? OR citizen_mobile = ?)";
                params.push(uid, mobile);
            } else {
                query += " AND user_id = ?";
                params.push(uid);
            }
        } else if (department && role === "admin") {
            // Admin can filter by any department
            query += " AND LOWER(department) = ?";
            params.push(department.toLowerCase());
        }

        if (status) {
            query += " AND status = ?";
            params.push(status);
        }

        if (priority) {
            query += " AND priority = ?";
            params.push(priority);
        }

        if (search) {
            query += " AND (request_code LIKE ? OR category LIKE ? OR description LIKE ? OR address LIKE ?)";
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }

        query += " ORDER BY CASE priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END, created_at DESC";

        const offset = (Number(page) - 1) * Number(limit);
        query += " LIMIT ? OFFSET ?";
        params.push(Number(limit), Number(offset));

        const [rows] = await pool.query(query, params);

        // Annotate with real-time remaining SLA calculations
        const now = Date.now();
        const enriched = rows.map(r => {
            let slaRemainingMinutes = null;
            let isOverdue = false;
            if (r.sla_deadline && !["Resolved", "Rejected"].includes(r.status)) {
                const diffMs = new Date(r.sla_deadline).getTime() - now;
                slaRemainingMinutes = Math.round(diffMs / 60000);
                isOverdue = slaRemainingMinutes < 0;
            }
            return {
                ...r,
                slaRemainingMinutes,
                isOverdue
            };
        });

        res.json({
            success: true,
            count: enriched.length,
            page: Number(page),
            data: enriched
        });
    } catch (err) {
        console.error("List requests error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// =========================================================
// 3. GET SINGLE REQUEST DETAILS
// =========================================================

router.get("/api/requests/:id", optionalToken, async (req, res) => {
    try {
        const idOrCode = req.params.id;
        const [rows] = await pool.query(
            "SELECT * FROM service_requests WHERE id = ? OR request_code = ? LIMIT 1",
            [idOrCode, idOrCode]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Request not found." });
        }

        const request = rows[0];

        // Access check:
        const user = req.user;
        const role = (user && (user.role || user.type) ? String(user.role || user.type) : "").toLowerCase();
        const userDept = (user && user.department ? String(user.department) : "").toLowerCase();
        const isAuthorizedStaffOrAdmin = role === "admin" || (role === "staff" && userDept === (request.department || "").toLowerCase());
        const isOwner = user && (String(user.id) === String(request.user_id) || (user.mobile && user.mobile === request.citizen_mobile));

        if (role === "citizen" && !isOwner) {
            return res.status(403).json({ success: false, message: "Access denied. You can only view your own service requests." });
        }

        // Fetch feedback if any
        const [feedback] = await pool.query(
            "SELECT * FROM citizen_feedback WHERE request_id = ? LIMIT 1",
            [request.id]
        );

        // SLA remaining time
        let slaRemainingMinutes = null;
        let isOverdue = false;
        if (request.sla_deadline && !["Resolved", "Rejected"].includes(request.status)) {
            const diffMs = new Date(request.sla_deadline).getTime() - Date.now();
            slaRemainingMinutes = Math.round(diffMs / 60000);
            isOverdue = slaRemainingMinutes < 0;
        }

        res.json({
            success: true,
            data: {
                ...request,
                citizen_mobile: (isAuthorizedStaffOrAdmin || isOwner) ? request.citizen_mobile : null,
                slaRemainingMinutes,
                isOverdue,
                feedback: feedback[0] || null
            }
        });
    } catch (err) {
        console.error("Get request error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// =========================================================
// 4. ASSIGN STAFF TO REQUEST (Admin or Dept Supervisor)
// =========================================================

router.put("/api/requests/:id/assign", authenticateToken, async (req, res) => {
    try {
        const { assigned_staff_id, assigned_staff_name } = req.body;
        const user = req.user;

        if (!assigned_staff_id) {
            return res.status(400).json({ success: false, message: "Staff ID is required." });
        }

        // Fetch request
        const [requests] = await pool.query("SELECT * FROM service_requests WHERE id = ? LIMIT 1", [req.params.id]);
        if (requests.length === 0) {
            return res.status(404).json({ success: false, message: "Request not found." });
        }

        const request = requests[0];

        // Check permission
        if (!canManageDepartment(user, request.department)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. You cannot assign tasks for the '${request.department}' department.`
            });
        }

        // Update assignment
        await pool.query(
            `UPDATE service_requests 
             SET assigned_staff_id = ?, assigned_staff_name = ?, status = 'Assigned'
             WHERE id = ?`,
            [assigned_staff_id, assigned_staff_name || "Assigned Staff", request.id]
        );

        // Notify assigned staff
        await pool.query(
            `INSERT INTO notifications (user_id, role, department, type, title, message, module, reference_id)
             VALUES (?, 'staff', ?, 'task_assignment', ?, ?, 'requests', ?)`,
            [
                assigned_staff_id,
                request.department,
                `New Task Assigned: ${request.request_code}`,
                `You have been assigned ${request.category} in ${request.address || request.department}.`,
                request.request_code
            ]
        );

        // Audit log
        await logAudit(req, {
            action: "ASSIGN_REQUEST_STAFF",
            module: "requests",
            recordId: request.request_code,
            department: request.department,
            metadata: { assigned_staff_id, assigned_staff_name }
        });

        // Real-time notification
        const io = req.app.get("io");
        if (io) {
            io.emit("request:status_updated", {
                id: request.id,
                requestCode: request.request_code,
                status: "Assigned",
                assignedStaffId: assigned_staff_id,
                assignedStaffName: assigned_staff_name
            });
        }

        res.json({
            success: true,
            message: `Request assigned to ${assigned_staff_name || 'Staff'}.`,
            data: { id: request.id, status: "Assigned", assigned_staff_id, assigned_staff_name }
        });
    } catch (err) {
        console.error("Assign request error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// =========================================================
// 5. UPDATE REQUEST STATUS (Department Staff / Admin)
// =========================================================

router.put("/api/requests/:id/status", authenticateToken, async (req, res) => {
    try {
        const { status, resolution_notes } = req.body;
        const user = req.user;

        const validStatuses = ["Acknowledged", "Assigned", "In Progress", "Resolved", "Rejected"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
            });
        }

        const [requests] = await pool.query("SELECT * FROM service_requests WHERE id = ? LIMIT 1", [req.params.id]);
        if (requests.length === 0) {
            return res.status(404).json({ success: false, message: "Request not found." });
        }

        const request = requests[0];

        // Strictly verify staff belongs to this department
        if (!canManageDepartment(user, request.department)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Staff in '${user.department || 'other'}' department cannot modify '${request.department}' requests.`
            });
        }

        const isResolved = status === "Resolved";
        await pool.query(
            `UPDATE service_requests 
             SET status = ?, 
                 resolution_notes = ?,
                 resolved_at = ${isResolved ? "NOW()" : "resolved_at"}
             WHERE id = ?`,
            [status, resolution_notes || null, request.id]
        );

        // Notify citizen if user_id is linked
        if (request.user_id) {
            await pool.query(
                `INSERT INTO notifications (user_id, role, department, type, title, message, module, reference_id)
                 VALUES (?, 'citizen', ?, 'status_update', ?, ?, 'requests', ?)`,
                [
                    request.user_id,
                    request.department,
                    `Request ${status}: ${request.request_code}`,
                    `Your request for ${request.category} has been updated to '${status}'.`,
                    request.request_code
                ]
            );
        }

        // Audit log
        await logAudit(req, {
            action: `UPDATE_REQUEST_STATUS_${status.toUpperCase()}`,
            module: "requests",
            recordId: request.request_code,
            department: request.department,
            metadata: { oldStatus: request.status, newStatus: status, resolution_notes }
        });

        // Socket broadcast
        const io = req.app.get("io");
        if (io) {
            io.emit("request:status_updated", {
                id: request.id,
                requestCode: request.request_code,
                status,
                resolved: isResolved
            });
        }

        res.json({
            success: true,
            message: `Request status updated to '${status}'.`,
            data: { id: request.id, status, resolution_notes }
        });
    } catch (err) {
        console.error("Update request status error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// =========================================================
// 6. STAFF MY TASKS
// =========================================================

router.get("/api/staff/my-tasks", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const role = (user.role || user.type || "").toLowerCase();
        if (role !== "staff" && role !== "admin") {
            return res.status(403).json({ success: false, message: "Staff access required." });
        }

        const staffId = user.id || user.userId;
        const staffDept = (user.department || "").toLowerCase();

        // Get tasks assigned to this staff or unassigned in this department
        const [tasks] = await pool.query(
            `SELECT * FROM service_requests 
             WHERE (assigned_staff_id = ? OR (assigned_staff_id IS NULL AND LOWER(department) = ?))
             ORDER BY CASE priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END, created_at DESC`,
            [staffId, staffDept]
        );

        const now = Date.now();
        const pending = [];
        const inProgress = [];
        const completed = [];
        const escalated = [];

        tasks.forEach(t => {
            let slaRemainingMinutes = null;
            let isOverdue = false;
            if (t.sla_deadline && !["Resolved", "Rejected"].includes(t.status)) {
                const diffMs = new Date(t.sla_deadline).getTime() - now;
                slaRemainingMinutes = Math.round(diffMs / 60000);
                isOverdue = slaRemainingMinutes < 0;
            }

            const item = { ...t, slaRemainingMinutes, isOverdue };

            if (t.status === "Escalated") {
                escalated.push(item);
            } else if (t.status === "Resolved" || t.status === "Rejected") {
                completed.push(item);
            } else if (t.status === "In Progress") {
                inProgress.push(item);
            } else {
                pending.push(item);
            }
        });

        res.json({
            success: true,
            summary: {
                total: tasks.length,
                pendingCount: pending.length,
                inProgressCount: inProgress.length,
                completedCount: completed.length,
                escalatedCount: escalated.length
            },
            data: {
                pending,
                inProgress,
                completed,
                escalated
            }
        });
    } catch (err) {
        console.error("Get staff tasks error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// =========================================================
// 7. CITIZEN FEEDBACK SUBMISSION
// =========================================================

router.post("/api/requests/:id/feedback", authenticateToken, async (req, res) => {
    try {
        const { rating, comments } = req.body;
        const user = req.user;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "A rating between 1 and 5 stars is required."
            });
        }

        const [requests] = await pool.query("SELECT * FROM service_requests WHERE id = ? LIMIT 1", [req.params.id]);
        if (requests.length === 0) {
            return res.status(404).json({ success: false, message: "Request not found." });
        }

        const request = requests[0];
        const userId = user.id || user.userId;

        // Prevent duplicate feedback
        const [existing] = await pool.query("SELECT id FROM citizen_feedback WHERE request_id = ?", [request.id]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: "Feedback already submitted for this request." });
        }

        await pool.query(
            `INSERT INTO citizen_feedback 
             (request_id, user_id, citizen_name, department, rating, comments, staff_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                request.id,
                userId,
                user.name || "Citizen",
                request.department,
                rating,
                comments || null,
                request.assigned_staff_id
            ]
        );

        // Audit log
        await logAudit(req, {
            action: "SUBMIT_CITIZEN_FEEDBACK",
            module: "feedback",
            recordId: request.request_code,
            department: request.department,
            metadata: { rating, comments }
        });

        res.status(201).json({
            success: true,
            message: "Thank you for your feedback! It helps improve smart city services."
        });
    } catch (err) {
        console.error("Submit feedback error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

module.exports = router;
