const express = require("express");
const router = express.Router();
const pool = require("../config/db").promise();
const { authenticateToken } = require("../middleware/auth.middleware");
const { logAudit } = require("../services/audit_logger");

function getAqiAdvisory(aqi) {
    if (aqi <= 50) return { category: "Good", color: "#10b981", advisory: "Air quality is satisfactory and poses little or no risk." };
    if (aqi <= 100) return { category: "Moderate", color: "#f59e0b", advisory: "Air quality is acceptable; very sensitive people should limit prolonged outdoor exertion." };
    if (aqi <= 150) return { category: "Unhealthy for Sensitive Groups", color: "#f97316", advisory: "Members of sensitive groups may experience health effects; general public is less likely to be affected." };
    if (aqi <= 200) return { category: "Unhealthy", color: "#ef4444", advisory: "Everyone may begin to experience health effects; sensitive groups may experience more serious effects." };
    if (aqi <= 300) return { category: "Very Unhealthy", color: "#8b5cf6", advisory: "Health alert: risk of health effects is increased for everyone. Avoid outdoor cardio." };
    return { category: "Hazardous", color: "#7f1d1d", advisory: "Health warning of emergency conditions: the entire population is likely to be affected." };
}

// =========================================================
// 1. GET CITYWIDE AQI & SENSORS
// =========================================================

router.get("/api/environment/aqi", async (req, res) => {
    try {
        const [sensors] = await pool.query(
            "SELECT * FROM city_environmental_sensors WHERE status = 'Active' ORDER BY aqi DESC"
        );

        if (sensors.length === 0) {
            return res.json({
                success: true,
                summary: {
                    averageAqi: 85,
                    category: "Moderate",
                    color: "#f59e0b",
                    activeStations: 0,
                    advisory: "Baseline air quality estimation."
                },
                stations: []
            });
        }

        const avgAqi = Math.round(sensors.reduce((acc, s) => acc + s.aqi, 0) / sensors.length);
        const avgPm25 = (sensors.reduce((acc, s) => acc + Number(s.pm25), 0) / sensors.length).toFixed(1);
        const avgPm10 = (sensors.reduce((acc, s) => acc + Number(s.pm10), 0) / sensors.length).toFixed(1);
        const avgTemp = (sensors.reduce((acc, s) => acc + Number(s.temp_c), 0) / sensors.length).toFixed(1);
        const avgHumidity = (sensors.reduce((acc, s) => acc + Number(s.humidity_pct), 0) / sensors.length).toFixed(1);

        const advisory = getAqiAdvisory(avgAqi);

        res.json({
            success: true,
            summary: {
                averageAqi: avgAqi,
                category: advisory.category,
                color: advisory.color,
                advisory: advisory.advisory,
                avgPm25: Number(avgPm25),
                avgPm10: Number(avgPm10),
                avgTempC: Number(avgTemp),
                avgHumidityPct: Number(avgHumidity),
                activeStations: sensors.length,
                updatedAt: new Date().toISOString()
            },
            stations: sensors
        });
    } catch (err) {
        console.error("Get AQI error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// =========================================================
// 2. GET GEOJSON STATIONS FOR MAP
// =========================================================

router.get("/api/environment/stations", async (req, res) => {
    try {
        const [sensors] = await pool.query("SELECT * FROM city_environmental_sensors");
        const geojson = {
            type: "FeatureCollection",
            features: sensors.map(s => {
                const adv = getAqiAdvisory(s.aqi);
                return {
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [Number(s.longitude), Number(s.latitude)]
                    },
                    properties: {
                        id: s.id,
                        code: s.sensor_code,
                        location: s.location,
                        zone: s.zone,
                        aqi: s.aqi,
                        category: adv.category,
                        color: adv.color,
                        pm25: s.pm25,
                        pm10: s.pm10,
                        temp_c: s.temp_c,
                        humidity_pct: s.humidity_pct,
                        status: s.status
                    }
                };
            })
        };

        res.json(geojson);
    } catch (err) {
        console.error("Get stations error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// =========================================================
// 3. CALIBRATE / UPDATE SENSOR (Environment Staff / Admin)
// =========================================================

router.put("/api/environment/sensors/:id", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const role = (user.role || user.type || "").toLowerCase();
        const dept = (user.department || "").toLowerCase();

        if (role !== "admin" && dept !== "environment") {
            return res.status(403).json({ success: false, message: "Only environment department staff can calibrate sensors." });
        }

        const { aqi, pm25, pm10, temp_c, humidity_pct, status } = req.body;
        const [existing] = await pool.query("SELECT * FROM city_environmental_sensors WHERE id = ? LIMIT 1", [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Sensor not found." });
        }

        const sensor = existing[0];
        await pool.query(
            `UPDATE city_environmental_sensors 
             SET aqi = ?, pm25 = ?, pm10 = ?, temp_c = ?, humidity_pct = ?, status = ?
             WHERE id = ?`,
            [
                aqi != null ? aqi : sensor.aqi,
                pm25 != null ? pm25 : sensor.pm25,
                pm10 != null ? pm10 : sensor.pm10,
                temp_c != null ? temp_c : sensor.temp_c,
                humidity_pct != null ? humidity_pct : sensor.humidity_pct,
                status || sensor.status,
                sensor.id
            ]
        );

        await logAudit(req, {
            action: "UPDATE_ENV_SENSOR",
            module: "environment",
            recordId: sensor.sensor_code,
            department: "environment",
            metadata: { oldAqi: sensor.aqi, newAqi: aqi }
        });

        res.json({ success: true, message: "Sensor updated successfully." });
    } catch (err) {
        console.error("Update sensor error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

module.exports = router;
