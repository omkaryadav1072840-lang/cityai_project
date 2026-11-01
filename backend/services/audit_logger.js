/**
 * SmartCity AI - Centralized Audit Logger
 * Asynchronously writes audit trails for sensitive operations, administrative changes,
 * and departmental staff actions.
 */

const pool = require("../config/db").promise();

// Resilient in-memory audit log store for offline/development survivability
const memoryAuditLogs = [];
const MAX_MEMORY_LOGS = 200;

/**
 * Log an audit event.
 * @param {Object} req - Express request object (optional, extracts user & IP)
 * @param {Object} entry - { userId, userName, role, department, action, module, recordId, metadata }
 */
async function logAudit(req, entry) {
    try {
        if (!entry && req && typeof req === "object" && (req.action || req.module || req.userId)) {
            entry = req;
            req = null;
        }
        entry = entry || {};

        let userId = entry.userId || null;
        let userName = entry.userName || null;
        let role = entry.role || null;
        let department = entry.department || null;
        let ipAddress = null;

        if (req && typeof req === "object") {
            const user = req.user || {};
            userId = userId || user.id || user.userId || null;
            userName = userName || user.name || null;
            role = role || user.role || user.type || null;
            department = department || user.department || null;

            ipAddress = (req.headers && (req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "")).split(",")[0].trim();
        }

        const action = entry.action || "UNKNOWN_ACTION";
        const moduleName = entry.module || "SYSTEM";
        const recordId = entry.recordId ? String(entry.recordId) : null;
        const metadata = entry.metadata ? JSON.stringify(entry.metadata) : null;

        const logRecord = {
            id: memoryAuditLogs.length + 1,
            user_id: userId,
            user_name: userName || "Officer",
            role: role || "staff",
            department: department || "general",
            action,
            module: moduleName,
            record_id: recordId,
            ip_address: ipAddress || "127.0.0.1",
            metadata: entry.metadata || {},
            created_at: new Date().toISOString()
        };

        // Always store in in-memory ring buffer
        memoryAuditLogs.unshift(logRecord);
        if (memoryAuditLogs.length > MAX_MEMORY_LOGS) memoryAuditLogs.pop();

        await pool.query(
            `INSERT INTO audit_logs (user_id, user_name, role, department, action, module, record_id, ip_address, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, userName, role, department, action, moduleName, recordId, ipAddress, metadata]
        );
    } catch (err) {
        if (process.env.NODE_ENV === "production") {
            console.error("⚠️ [AuditLogger Error]:", err.message);
        }
    }
}

function getMemoryAuditLogs() {
    return memoryAuditLogs;
}

module.exports = {
    logAudit,
    getMemoryAuditLogs
};
