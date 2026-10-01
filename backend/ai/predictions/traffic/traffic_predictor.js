/**
 * SMARTCITY AI - TRAFFIC PREDICTOR
 * 
 * Predicts traffic level, congestion percentage, and expected speed
 * using historical traffic density, junction telemetry, time-of-day,
 * and active traffic incidents.
 * 
 * Bridges to Python FastAPI ML service with statistical fallback to MySQL data.
 */

const pool = require("../../../config/db").promise();
const aiClient = require("../../../services/ai_service_client");
const trafficAIService = require("../../../services/traffic_ai_service");

class TrafficPredictor {
    /**
     * Predict traffic conditions for a given junction and horizon
     * @param {Object} params
     * @param {string} [params.junction_id="JNC-01"]
     * @param {number} [params.horizon_minutes=15]
     * @param {number} [params.vehicle_count]
     * @param {number} [params.avg_speed_kmh]
     * @param {string} [params.weather="CLEAR"]
     * @returns {Promise<Object>}
     */
    static async predictTraffic({
        junction_id = "JNC-01",
        horizon_minutes = 15,
        vehicle_count = null,
        avg_speed_kmh = null,
        weather = "CLEAR"
    } = {}) {
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay(); // 0 = Sun, 6 = Sat

        // 1. Fetch real junction baseline from MySQL
        const [jncRows] = await pool.query(
            `SELECT id, name, zone, congestion_level, avg_speed_kmh, cycle_time, active_phase 
             FROM traffic_junctions 
             WHERE id = ? LIMIT 1`,
            [junction_id]
        );
        const junction = jncRows[0] || {
            id: junction_id,
            name: "Golghar Chowk",
            zone: "Central",
            avg_speed_kmh: 30,
            congestion_level: "MODERATE"
        };

        // 2. Query active incidents affecting this junction
        const [incidents] = await pool.query(
            `SELECT id, incident_type, severity, description 
             FROM traffic_incidents 
             WHERE junction_id = ? AND status = 'Active'`,
            [junction_id]
        );
        const activeIncidents = incidents.length;

        // 3. Attempt Python ML Service inference
        try {
            const pythonResult = await aiClient.predictTraffic({
                junction_id,
                hour,
                day_of_week: dayOfWeek,
                vehicle_count: vehicle_count || junction.cycle_time || 80,
                active_incidents: activeIncidents,
                weather
            });

            if (pythonResult && pythonResult.success) {
                return {
                    success: true,
                    junction_id: junction.id,
                    junction_name: junction.name,
                    zone: junction.zone,
                    horizon_minutes,
                    predicted_traffic_level: pythonResult.traffic_level || "MEDIUM",
                    predicted_congestion_percent: pythonResult.congestion_percent || 55,
                    expected_speed_kmh: pythonResult.predicted_speed_kmh || junction.avg_speed_kmh,
                    confidence: pythonResult.confidence || 0.92,
                    active_incidents: activeIncidents,
                    source: "PYTHON_ML_SERVICE",
                    timestamp: new Date().toISOString()
                };
            }
        } catch (mlErr) {
            // Log notice and proceed to statistical fallback
            console.warn("[TrafficPredictor] Python ML service unreachable, using grounded statistical model:", mlErr.message);
        }

        // 4. Fallback: Grounded Statistical Multi-Horizon Engine
        const prediction = await trafficAIService.predictMultiHorizon({
            junction_id: junction.id,
            vehicle_count,
            queue_length: null
        });

        const targetHorizon = prediction.horizons.find(h => h.horizon_minutes === Number(horizon_minutes)) 
            || prediction.horizons[0] 
            || { traffic_level: "MODERATE", congestion_score: 50, estimated_speed_kmh: 28 };

        // Normalize level to LOW, MEDIUM, HIGH, CRITICAL
        let normalizedLevel = "MEDIUM";
        if (targetHorizon.congestion_score < 35) normalizedLevel = "LOW";
        else if (targetHorizon.congestion_score < 65) normalizedLevel = "MEDIUM";
        else if (targetHorizon.congestion_score < 85) normalizedLevel = "HIGH";
        else normalizedLevel = "CRITICAL";

        return {
            success: true,
            junction_id: junction.id,
            junction_name: junction.name,
            zone: junction.zone,
            horizon_minutes: Number(horizon_minutes),
            predicted_traffic_level: normalizedLevel,
            predicted_congestion_percent: targetHorizon.congestion_score,
            expected_speed_kmh: targetHorizon.estimated_speed_kmh,
            confidence: 0.88,
            active_incidents: activeIncidents,
            source: "STATISTICAL_FALLBACK",
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = TrafficPredictor;
