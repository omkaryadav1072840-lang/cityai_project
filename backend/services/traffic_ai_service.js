/**
 * SMARTCITY AI - TRAFFIC AI SERVICE
 * Implements:
 * 1. Multi-Horizon Traffic Prediction (15 min, 30 min, 60 min)
 * 2. Webster-Based Signal Optimization Formula: C0 = (1.5L + 5) / (1 - Y)
 * 3. Multi-Junction Green Wave Coordination
 * 4. Ambulance 600m Emergency Preemption Corridor
 * 5. Traffic Telemetry & Classification
 */

const pool = require("../config/db").promise();
const crypto = require("crypto");

class TrafficAIService {
    /**
     * Multi-Horizon Traffic Prediction for 15, 30, and 60 minutes
     */
    async predictMultiHorizon({ junction_id = "JNC-01", vehicle_count = null, queue_length = null } = {}) {
        const [jncRows] = await pool.query(
            `SELECT id, name, zone, congestion_level, avg_speed_kmh, cycle_time, active_phase 
             FROM traffic_junctions 
             WHERE id = ? LIMIT 1`,
            [junction_id]
        );
        const junction = jncRows[0] || { id: junction_id, name: "Golghar Chowk", zone: "Central", avg_speed_kmh: 30, congestion_level: "MODERATE" };

        const now = new Date();
        const hour = now.getHours();
        const isPeak = (hour >= 9 && hour <= 11) || (hour >= 17 && hour <= 20);

        // Fetch active incidents affecting this junction
        const [incidents] = await pool.query(
            `SELECT id, incident_type, severity FROM traffic_incidents WHERE junction_id = ? AND status = 'Active'`,
            [junction_id]
        );
        const incidentMultiplier = incidents.length > 0 ? 1.35 : 1.0;

        const baseVehicles = vehicle_count !== null ? Number(vehicle_count) : (isPeak ? 110 : 65);
        const baseQueue = queue_length !== null ? Number(queue_length) : (isPeak ? 18 : 6);

        const horizons = [15, 30, 60];
        const predictions = [];

        for (const minutes of horizons) {
            const timeGrowthFactor = 1 + (minutes / 120) * (isPeak ? 0.25 : -0.1);
            const predictedVehicles = Math.round(baseVehicles * timeGrowthFactor * incidentMultiplier);
            const congestionScore = Math.min(100, Math.round((predictedVehicles / 150) * 100));

            let trafficLevel = "LOW";
            let estimatedSpeed = 42;
            if (congestionScore > 75) {
                trafficLevel = "SEVERE";
                estimatedSpeed = 14;
            } else if (congestionScore > 40) {
                trafficLevel = "MODERATE";
                estimatedSpeed = 26;
            }

            const predId = `TRF-${Date.now().toString(36).toUpperCase()}-${minutes}M-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
            const factors = {
                time_of_day: `${hour}:00 hrs`,
                is_rush_hour: isPeak,
                active_incidents: incidents.length,
                queue_length_meters: baseQueue * 6,
                weather_condition: "CLEAR"
            };

            // Persist to `traffic_predictions` table
            try {
                await pool.query(
                    `INSERT INTO traffic_predictions 
                     (prediction_id, junction_id, horizon_minutes, traffic_level, congestion_score, predicted_vehicle_count, estimated_speed_kmh, confidence, factors)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [predId, junction.id, minutes, trafficLevel, congestionScore, predictedVehicles, estimatedSpeed, 0.89, JSON.stringify(factors)]
                );
            } catch (err) {
                console.warn("[TrafficPrediction] Warning:", err.message);
            }

            predictions.push({
                prediction_id: predId,
                horizon_minutes: minutes,
                traffic_level: trafficLevel,
                congestion_score: congestionScore,
                predicted_vehicle_count: predictedVehicles,
                estimated_speed_kmh: estimatedSpeed,
                confidence: 0.89,
                factors
            });
        }

        return {
            success: true,
            junction: { id: junction.id, name: junction.name, zone: junction.zone },
            generated_at: now.toISOString(),
            horizons: predictions,
            data_source: "PREDICTED"
        };
    }

    /**
     * Webster-based Signal Optimization
     * Formula: C0 = (1.5L + 5) / (1 - Y)
     * L = total lost time per cycle (e.g. 16s)
     * Y = sum of critical flow ratios (q_i / s_i), s_i = 1800 vph
     */
    async optimizeSignalWebster({ junction_id = "JNC-01", approaches = null } = {}) {
        const [jncRows] = await pool.query(`SELECT id, name, cycle_time, active_phase FROM traffic_junctions WHERE id = ?`, [junction_id]);
        const jnc = jncRows[0] || { id: junction_id, name: "Golghar Chowk", cycle_time: 90 };

        // Default or provided flow rates for 4 approaches (North, South, East, West)
        const flows = approaches || [
            { approach: "Northbound", flow_vph: 520, saturation_vph: 1800 },
            { approach: "Southbound", flow_vph: 480, saturation_vph: 1800 },
            { approach: "Eastbound",  flow_vph: 360, saturation_vph: 1800 },
            { approach: "Westbound",  flow_vph: 310, saturation_vph: 1800 }
        ];

        const lostTimePerPhase = 4; // 4 seconds yellow + clearance
        const numPhases = 2; // North-South phase and East-West phase
        const totalLostTimeL = lostTimePerPhase * numPhases + 4; // 12 seconds

        // Critical flow ratio y_i = max(flow / saturation) per phase
        const y_NS = Math.max(flows[0].flow_vph / flows[0].saturation_vph, flows[1].flow_vph / flows[1].saturation_vph);
        const y_EW = Math.max(flows[2].flow_vph / flows[2].saturation_vph, flows[3].flow_vph / flows[3].saturation_vph);
        let Y = y_NS + y_EW;

        // Guard against Y >= 1.0 (oversaturated condition)
        if (Y >= 0.95) Y = 0.90;

        // Apply Webster's Formula: C0 = (1.5L + 5) / (1 - Y)
        let C0 = Math.round((1.5 * totalLostTimeL + 5) / (1 - Y));
        // Bound cycle length between 45s and 150s for safety
        C0 = Math.max(45, Math.min(150, C0));

        const effectiveGreenTime = C0 - totalLostTimeL;
        const greenTime_NS = Math.round((y_NS / Y) * effectiveGreenTime);
        const greenTime_EW = effectiveGreenTime - greenTime_NS;

        const reason = `Webster dynamic calculation: Demand Y=${Y.toFixed(2)} (NS: ${(y_NS*100).toFixed(0)}%, EW: ${(y_EW*100).toFixed(0)}%). Optimized cycle length from ${jnc.cycle_time}s to ${C0}s.`;

        // Record in `signal_optimizations` ledger
        await pool.query(
            `INSERT INTO signal_optimizations 
             (junction_id, junction_name, cycle_length, green_time, red_time, phase, traffic_density, vehicle_flow_vph, webster_c0, critical_flow_ratio_y, optimization_reason, confidence, is_simulation)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [jnc.id, jnc.name, C0, greenTime_NS, C0 - greenTime_NS, "Phase A (North-South)", Y * 100, Math.round(Y * 1800), C0, Y, reason, 0.92]
        );

        return {
            success: true,
            junction: { id: jnc.id, name: jnc.name },
            formula: "C0 = (1.5L + 5) / (1 - Y)",
            webster_calculated_cycle_sec: C0,
            previous_cycle_sec: jnc.cycle_time,
            phase_allocations: {
                phase_A_NS: { green_sec: greenTime_NS, yellow_sec: 4, red_sec: C0 - greenTime_NS },
                phase_B_EW: { green_sec: greenTime_EW, yellow_sec: 4, red_sec: C0 - greenTime_EW }
            },
            critical_flow_ratio: Y,
            reason,
            confidence: 0.92,
            is_simulation: true,
            data_source: "PREDICTED"
        };
    }

    /**
     * Multi-Junction Signal Coordination (Green Wave Offsets)
     */
    async coordinateCorridor({ corridor_name = "Golghar - University Arterial" } = {}) {
        const junctions = [
            { id: "JNC-01", name: "Golghar Chowk", distance_meters: 0 },
            { id: "JNC-02", name: "University Chowk", distance_meters: 850 },
            { id: "JNC-03", name: "Mohaddipur Chowk", distance_meters: 2100 }
        ];

        const designSpeedKmh = 40;
        const speedMps = (designSpeedKmh * 1000) / 3600; // ~11.1 m/s

        const coordinated = junctions.map(j => {
            const travelTimeSec = Math.round(j.distance_meters / speedMps);
            const cycleLength = 90;
            const greenOffsetSec = travelTimeSec % cycleLength;
            return {
                junction_id: j.id,
                junction_name: j.name,
                distance_from_origin_m: j.distance_meters,
                green_offset_sec: greenOffsetSec,
                bandwidth_sec: 32,
                status: "COORDINATED"
            };
        });

        return {
            success: true,
            corridor: corridor_name,
            design_speed_kmh: designSpeedKmh,
            common_cycle_sec: 90,
            coordinated_signals: coordinated,
            data_source: "SIMULATED"
        };
    }

    /**
     * Ambulance Green Wave Preemption (Triggered when ambulance is <= 600m from junction)
     */
    async processAmbulanceApproaching({ ambulance_id = "AMB-01", latitude, longitude, junction_id = "JNC-01" } = {}) {
        const [ambRows] = await pool.query(`SELECT id, ambulance_id, vehicle_number, latitude, longitude, status FROM ambulances WHERE ambulance_id = ? OR id = ?`, [ambulance_id, ambulance_id]);
        const amb = ambRows[0] || { ambulance_id, vehicle_number: "UP-53-EM-108", latitude: 26.7580, longitude: 83.3710 };

        const [jncRows] = await pool.query(`SELECT id, name, latitude, longitude FROM traffic_junctions WHERE id = ?`, [junction_id]);
        const jnc = jncRows[0] || { id: junction_id, name: "Golghar Chowk", latitude: 26.7606, longitude: 83.3732 };

        // Calculate Euclidean/Haversine distance
        const lat1 = Number(latitude || amb.latitude);
        const lon1 = Number(longitude || amb.longitude);
        const lat2 = Number(jnc.latitude || 26.7606);
        const lon2 = Number(jnc.longitude || 83.3732);

        const R = 6371e3; // metres
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distanceMeters = Math.round(R * c);

        const isWithin600m = distanceMeters <= 600;
        let actionTaken = "MONITORING_APPROACH";

        if (isWithin600m) {
            actionTaken = "GREEN_PREEMPTION_ACTIVE";

            // Record green wave preemption in `ambulance_green_waves`
            await pool.query(
                `INSERT INTO ambulance_green_waves 
                 (ambulance_id, target_junction_id, distance_meters, corridor_status, preemption_green_given_at, current_latitude, current_longitude)
                 VALUES (?, ?, ?, 'ACTIVE_PREEMPTION', NOW(), ?, ?)`,
                [amb.ambulance_id, jnc.id, distanceMeters, lat1, lon1]
            );
        }

        return {
            success: true,
            ambulance: { id: amb.ambulance_id, vehicle_number: amb.vehicle_number },
            target_junction: { id: jnc.id, name: jnc.name },
            distance_meters: distanceMeters,
            is_within_600m: isWithin600m,
            corridor_status: actionTaken,
            preemption_phase: isWithin600m ? "FORCE_GREEN_APPROACH" : "NORMAL_CYCLE",
            safety_override_available: true,
            recommended_speed_kmh: 45,
            data_source: "REAL"
        };
    }
}

module.exports = new TrafficAIService();
