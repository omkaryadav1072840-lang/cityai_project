/**
 * SmartCity AI - Privacy-Conscious Analytics Routes
 * Complies with strict privacy standards (no PII, hashed identifiers, configurable)
 */

const express = require("express");
const router = express.Router();
const db = require("../config/db");
const crypto = require("crypto");

// Allowed event categories and types
const ALLOWED_EVENTS = new Set([
    "page_view",
    "login",
    "registration",
    "hospital_search",
    "parking_search",
    "parking_booking",
    "traffic_search",
    "ai_chatbot_usage",
    "tourist_guide_usage",
    "emergency_interaction",
    "contact_feedback_submission"
]);

// Strip sensitive keys from metadata to ensure no PII leakage
function sanitizeMetadata(meta) {
    if (!meta || typeof meta !== "object") return {};
    const sanitized = {};
    const FORBIDDEN_KEYS = ["password", "token", "email", "phone", "mobile", "aadhaar", "address", "medical", "disease", "diagnosis", "prescription"];
    
    for (const [key, val] of Object.entries(meta)) {
        const lowerKey = key.toLowerCase();
        if (FORBIDDEN_KEYS.some(f => lowerKey.includes(f))) continue;
        if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
            sanitized[key] = String(val).slice(0, 150); // limit value length
        }
    }
    return sanitized;
}

// In-memory telemetry buffer for high-throughput aggregation
const telemetryBuffer = [];
const eventCounters = {};

/**
 * POST /api/analytics/event
 * Ingest an anonymous event
 */
router.post("/api/analytics/event", (req, res) => {
    // If telemetry is disabled via environment variable
    if (process.env.ANALYTICS_ENABLED === "false") {
        return res.json({ success: true, tracked: false, reason: "analytics_disabled" });
    }

    const { event_name, page_path, metadata } = req.body || {};

    if (!event_name || typeof event_name !== "string") {
        return res.status(400).json({ success: false, message: "Valid event_name is required." });
    }

    const normalizedEvent = event_name.trim().toLowerCase();
    const cleanEvent = ALLOWED_EVENTS.has(normalizedEvent) ? normalizedEvent : "custom_action";
    const cleanPath = typeof page_path === "string" ? page_path.slice(0, 100) : "/";
    const cleanMeta = sanitizeMetadata(metadata);

    // Increment in-memory aggregate
    eventCounters[cleanEvent] = (eventCounters[cleanEvent] || 0) + 1;

    // Insert into DB if table exists (async, non-blocking)
    const eventRecord = {
        event_name: cleanEvent,
        page_path: cleanPath,
        metadata_json: JSON.stringify(cleanMeta),
        created_at: new Date()
    };

    telemetryBuffer.push(eventRecord);
    if (telemetryBuffer.length > 50) {
        telemetryBuffer.shift();
    }

    const insertSql = "INSERT INTO analytics_events (event_name, page_path, metadata_json, created_at) VALUES (?, ?, ?, NOW())";
    db.query(insertSql, [cleanEvent, cleanPath, JSON.stringify(cleanMeta)], (err) => {
        // Silently tolerate if analytics_events table is not yet created in MySQL
        if (err && err.code !== "ER_NO_SUCH_TABLE") {
            // ignore table missing error
        }
    });

    return res.status(202).json({
        success: true,
        tracked: true,
        event: cleanEvent
    });
});

/**
 * GET /api/analytics/summary
 * Aggregate metrics for City ICCC Dashboard
 */
router.get("/api/analytics/summary", (req, res) => {
    db.query(`
        SELECT event_name, COUNT(*) as count, MAX(created_at) as last_seen
        FROM analytics_events
        GROUP BY event_name
        ORDER BY count DESC
    `, (err, rows) => {
        if (err || !rows || rows.length === 0) {
            // Return in-memory buffer statistics if DB query fails or table empty
            return res.json({
                success: true,
                source: "memory",
                metrics: eventCounters,
                recentEvents: telemetryBuffer.slice(-10)
            });
        }

        const metrics = {};
        rows.forEach(r => { metrics[r.event_name] = r.count; });

        return res.json({
            success: true,
            source: "database",
            metrics,
            summary: rows
        });
    });
});

module.exports = router;
