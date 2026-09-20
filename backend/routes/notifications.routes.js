const express = require("express");
const router = express.Router();
const pool = require("../config/db").promise();
const { authenticateToken } = require("../middleware/auth.middleware");

// =========================================================
// 1. GET USER / DEPARTMENT NOTIFICATIONS
// =========================================================

router.get("/api/notifications", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const userId = user.id || user.userId;
        const role = (user.role || user.type || "").toLowerCase();
        const dept = (user.department || "").toLowerCase();

        let query = `
            SELECT * FROM notifications 
            WHERE (user_id = ?) 
               OR (user_id IS NULL AND role = ? AND (department = ? OR department IS NULL))
               OR (user_id IS NULL AND role = 'admin' AND ? = 'admin')
            ORDER BY created_at DESC 
            LIMIT 50
        `;
        const params = [userId, role, dept, role];

        const [rows] = await pool.query(query, params);

        res.json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (err) {
        console.error("Get notifications error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// =========================================================
// 2. GET UNREAD NOTIFICATION COUNT (For header bell)
// =========================================================

router.get("/api/notifications/unread-count", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const userId = user.id || user.userId;
        const role = (user.role || user.type || "").toLowerCase();
        const dept = (user.department || "").toLowerCase();

        let query = `
            SELECT COUNT(*) AS unreadCount FROM notifications 
            WHERE is_read = 0 
              AND (
                  (user_id = ?) 
                  OR (user_id IS NULL AND role = ? AND (department = ? OR department IS NULL))
                  OR (user_id IS NULL AND role = 'admin' AND ? = 'admin')
              )
        `;
        const params = [userId, role, dept, role];

        const [rows] = await pool.query(query, params);

        res.json({
            success: true,
            unreadCount: rows[0].unreadCount || 0
        });
    } catch (err) {
        console.error("Unread notifications count error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// =========================================================
// 3. MARK SINGLE NOTIFICATION AS READ
// =========================================================

router.put("/api/notifications/:id/read", authenticateToken, async (req, res) => {
    try {
        await pool.query("UPDATE notifications SET is_read = 1 WHERE id = ?", [req.params.id]);
        res.json({ success: true, message: "Notification marked as read." });
    } catch (err) {
        console.error("Mark notification read error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// =========================================================
// 4. MARK ALL NOTIFICATIONS AS READ
// =========================================================

router.put("/api/notifications/read-all", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const userId = user.id || user.userId;
        const role = (user.role || user.type || "").toLowerCase();
        const dept = (user.department || "").toLowerCase();

        await pool.query(`
            UPDATE notifications 
            SET is_read = 1 
            WHERE is_read = 0 
              AND (
                  (user_id = ?) 
                  OR (user_id IS NULL AND role = ? AND (department = ? OR department IS NULL))
                  OR (user_id IS NULL AND role = 'admin' AND ? = 'admin')
              )
        `, [userId, role, dept, role]);

        res.json({ success: true, message: "All notifications marked as read." });
    } catch (err) {
        console.error("Mark all notifications read error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

module.exports = router;
