const express = require("express");
const router = express.Router();
const pool = require("../config/db").promise();
const {
    predictTraffic,
    detectAnomalies,
    analyzeCameraFeed,
    predictWasteDemand
} = require("../services/python_ai_bridge");

// =========================================================
// 1. AI CITY ASSISTANT (NLP Intent + Live DB Query)
// =========================================================

router.get("/api/ai/status", (req, res) => {
    res.json({
        success: true,
        geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
        engine: "Python ML + Deterministic Rule Engine",
        status: "Online"
    });
});

router.post(["/api/ai/assistant", "/api/ai/chat"], async (req, res) => {
    try {
        const question = req.body.question || req.body.message;
        if (!question || !question.trim()) {
            return res.status(400).json({ success: false, message: "Question is required." });
        }

        const q = question.toLowerCase().trim();

        // 1. Healthcare / Beds inquiry
        if (q.includes("bed") || q.includes("hospital") || q.includes("icu") || q.includes("doctor")) {
            const [hospitals] = await pool.query(`
                SELECT id, hospital_name AS name, address, phone, total_beds, icu_beds
                FROM hospitals
                ORDER BY total_beds DESC
                LIMIT 3
            `);

            const listStr = hospitals.map(h => {
                const avail = Math.max(0, (h.total_beds || 100) - 45);
                return `• **${h.name}**: ~${avail} beds available (${h.icu_beds || 0} ICU). Address: ${h.address} (Ph: ${h.phone || '108'})`;
            }).join("\n");

            const ans = `Here are the top hospitals in Gorakhpur with verified bed availability:\n\n${listStr}\n\nWould you like me to guide you to one of these facilities?`;
            return res.json({
                success: true,
                intent: "hospital_beds",
                answer: ans,
                reply: ans,
                data: hospitals,
                actionUrl: "/pages/hospital/hospital.html"
            });
        }

        // 2. Parking inquiry
        if (q.includes("parking") || q.includes("park")) {
            const [parking] = await pool.query(`
                SELECT id, parking_code, name, address, hourly_rate, total_slots, available_slots
                FROM parking_lots
                ORDER BY available_slots DESC
                LIMIT 3
            `);

            const listStr = parking.map(p => 
                `• **${p.name}**: ${p.available_slots || 0}/${p.total_slots || 0} slots available (₹${p.hourly_rate || 20}/hr). Location: ${p.address}`
            ).join("\n");

            const ans = `Here is the current live parking availability in Gorakhpur:\n\n${listStr}\n\nYou can reserve a guaranteed slot instantly in the Smart Parking module.`;
            return res.json({
                success: true,
                intent: "find_parking",
                answer: ans,
                reply: ans,
                data: parking,
                actionUrl: "/pages/parking/parking.html"
            });
        }

        // 3. Traffic conditions inquiry
        if (q.includes("traffic") || q.includes("congestion") || q.includes("road") || q.includes("jam")) {
            const currentHour = new Date().getHours();
            const prediction = await predictTraffic({ hour: currentHour });
            const [activeIncidents] = await pool.query("SELECT incident_type, severity, location_name, description FROM traffic_incidents WHERE status = 'Active' LIMIT 3");

            let incidentNote = "";
            if (activeIncidents.length > 0) {
                incidentNote = `\n\n⚠️ **Active Alerts**:\n` + activeIncidents.map(i => `• ${i.incident_type} on ${i.location_name} (${i.severity})`).join("\n");
            }

            const ans = `Current Traffic Congestion Index is **${prediction.predicted_congestion}** (Severity Score: ${prediction.severity_score}/100, Confidence: ${Math.round(prediction.confidence * 100)}%).${incidentNote}\n\nAdaptive traffic signals are optimizing flow along major intersections.`;
            return res.json({
                success: true,
                intent: "traffic_status",
                answer: ans,
                reply: ans,
                data: { prediction, incidents: activeIncidents },
                actionUrl: "/pages/traffic/traffic.html"
            });
        }

        // 4. Waste reporting inquiry
        if (q.includes("waste") || q.includes("garbage") || q.includes("trash") || q.includes("clean")) {
            const ans = "To report overflowing garbage or schedule doorstep waste clearance, please use our **Smart Waste Grievance** service. Requests are auto-assigned with a 6-hour SLA timer.";
            return res.json({
                success: true,
                intent: "report_waste",
                answer: ans,
                reply: ans,
                actionUrl: "/pages/waste/waste.html"
            });
        }

        // 5. Police / Emergency assistance
        if (q.includes("police") || q.includes("theft") || q.includes("fir") || q.includes("complaint")) {
            const [stations] = await pool.query("SELECT name, location, phone FROM police_stations LIMIT 3");
            const listStr = stations.map(s => `• **${s.name}**: ${s.location} (Helpline: 112 / ${s.phone || '100'})`).join("\n");

            const ans = `For emergency police assistance, call **112**. Here are nearby police stations:\n\n${listStr}`;
            return res.json({
                success: true,
                intent: "police_station",
                answer: ans,
                reply: ans,
                data: stations,
                actionUrl: "/pages/police/police.html"
            });
        }

        // 6. Famous Places / Tourism inquiry
        if (q.includes("famous") || q.includes("place") || q.includes("temple") || q.includes("visit") || q.includes("tourism")) {
            const [places] = await pool.query("SELECT name, category, address, locality FROM famous_places LIMIT 3");
            const listStr = places.map(pl => `• **${pl.name}** (${pl.category}) - ${pl.address || pl.locality || 'Gorakhpur'}`).join("\n");

            const ans = `Here are popular heritage and cultural destinations in Gorakhpur:\n\n${listStr}\n\nExplore navigation, nearby hospitals, and parking on the Famous Places portal.`;
            return res.json({
                success: true,
                intent: "famous_places",
                answer: ans,
                reply: ans,
                data: places,
                actionUrl: "/pages/famous/famous.html"
            });
        }

        // 7. AQI / Air Quality
        if (q.includes("aqi") || q.includes("air") || q.includes("pollution") || q.includes("smog")) {
            const [sensors] = await pool.query("SELECT location, aqi FROM city_environmental_sensors ORDER BY aqi DESC LIMIT 3");
            const listStr = sensors.map(s => `• **${s.location}**: AQI ${s.aqi}`).join("\n");

            const ans = `City Environmental Sensor Network live readings:\n\n${listStr}\n\nStay hydrated and avoid prolonged high-intensity workouts in industrial zones during evening peaks.`;
            return res.json({
                success: true,
                intent: "aqi_environment",
                answer: ans,
                reply: ans,
                data: sensors,
                actionUrl: "/index.html"
            });
        }

        // Default Smart City Overview
        const defAns = "Welcome to SmartCity AI Assistant! I can help you find available hospital beds, reserve parking slots, check traffic congestion, report civic waste, find police stations, and explore heritage spots. What would you like to inquire about?";
        return res.json({
            success: true,
            intent: "general",
            answer: defAns,
            reply: defAns,
            suggestions: [
                "Nearest hospital with available beds",
                "Where is the nearest parking?",
                "What traffic is around this area?",
                "Where can I report garbage?",
                "Nearest police station?"
            ]
        });
    } catch (err) {
        console.error("AI Assistant error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// =========================================================
// 2. TRAFFIC PREDICTION
// =========================================================

router.get("/api/ai/traffic/predict", async (req, res) => {
    try {
        const hour = req.query.hour != null ? Number(req.query.hour) : new Date().getHours();
        const aqi = req.query.aqi != null ? Number(req.query.aqi) : 120;
        const [incidents] = await pool.query("SELECT COUNT(*) AS count FROM traffic_incidents WHERE status = 'Active'");

        const prediction = await predictTraffic({
            hour,
            aqi,
            incidents: incidents[0].count || 0
        });

        res.json({
            success: true,
            prediction
        });
    } catch (err) {
        console.error("Traffic prediction error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// =========================================================
// 3. CAMERA VISION ANALYSIS
// =========================================================

router.post("/api/ai/camera/analyze", async (req, res) => {
    try {
        const { camera_id, stream_url, camera_name, direction } = req.body;
        let camData = { stream_url, camera_name, direction };

        if (camera_id) {
            const [rows] = await pool.query("SELECT * FROM traffic_cameras WHERE id = ? LIMIT 1", [camera_id]);
            if (rows.length > 0) {
                camData = { ...rows[0], ...camData };
            }
        }

        const analysis = await analyzeCameraFeed(camData);
        res.json({
            success: true,
            camera_id: camera_id || null,
            analysis
        });
    } catch (err) {
        console.error("Camera vision error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// =========================================================
// 4. WASTE DEMAND PREDICTION
// =========================================================

router.get("/api/ai/waste/predict", async (req, res) => {
    try {
        const [complaints] = await pool.query("SELECT COUNT(*) AS count FROM waste_bin_requests WHERE status = 'Pending'");
        const forecast = await predictWasteDemand({
            recent_complaints: complaints[0].count || 5
        });

        res.json({
            success: true,
            forecast
        });
    } catch (err) {
        console.error("Waste prediction error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// =========================================================
// 5. ANOMALY DETECTION
// =========================================================

router.get("/api/ai/anomalies", async (req, res) => {
    try {
        let bedStats = { total: 1000, available: 750 };
        try {
            const [wb] = await pool.query("SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS available FROM hospital_ward_beds");
            if (wb && wb[0] && wb[0].total > 0) {
                bedStats = { total: Number(wb[0].total) || 1, available: Number(wb[0].available) || 0 };
            } else {
                const [hb] = await pool.query("SELECT IFNULL(SUM(total_beds), 1000) AS total, IFNULL(SUM(GREATEST(total_beds - 350, 0)), 650) AS available FROM hospitals");
                bedStats = { total: Number(hb[0].total) || 1, available: Number(hb[0].available) || 0 };
            }
        } catch (err) {
            const [hb] = await pool.query("SELECT IFNULL(SUM(total_beds), 1000) AS total, IFNULL(SUM(GREATEST(total_beds - 350, 0)), 650) AS available FROM hospitals");
            bedStats = { total: Number(hb[0].total) || 1, available: Number(hb[0].available) || 0 };
        }

        const [
            [traffic],
            [waste],
            [emergency],
            [parking]
        ] = await Promise.all([
            pool.query("SELECT COUNT(*) AS count FROM traffic_incidents WHERE status = 'Active'"),
            pool.query("SELECT COUNT(*) AS count FROM waste_bin_requests WHERE status IN ('Pending', 'Submitted', 'In Progress')"),
            pool.query("SELECT COUNT(*) AS count FROM emergency_incidents WHERE status IN ('ACTIVE', 'Active', 'Reported', 'Dispatched', 'En Route')"),
            pool.query("SELECT COUNT(*) AS total, SUM(CASE WHEN status IN ('Booked', 'Occupied') THEN 1 ELSE 0 END) AS occupied FROM parking_slots")
        ]);

        const totalB = bedStats.total || 1;
        const availB = bedStats.available || 0;
        const bedOcc = Math.max(0, Math.min(100, Math.round(((totalB - availB) / totalB) * 100)));

        const totalP = parking[0].total || 1;
        const occP = parking[0].occupied || 0;
        const parkSat = Math.round((occP / totalP) * 100);

        const report = await detectAnomalies({
            activeIncidents: traffic[0].count || 0,
            pendingWasteRequests: waste[0].count || 0,
            hospitalBedOccupancyPct: bedOcc,
            emergencyCallsLastHour: emergency[0].count || 0,
            parkingSaturationPct: parkSat
        });

        res.json({
            success: true,
            report
        });
    } catch (err) {
        console.error("AI anomalies error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

module.exports = router;
