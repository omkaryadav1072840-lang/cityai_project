/**
 * SmartCity AI Traffic Engine - Gorakhpur
 * Handles real-time signal phase cycles, emergency corridor overrides,
 * simulated AI camera telemetry, and audit logging.
 */

const pool = require("../config/db");

class TrafficEngine {
    constructor() {
        this.io = null;
        this.timer = null;
        this.telemetryTimer = null;
        this.activeCorridors = new Map();
        this.running = false;
    }

    setSocketIO(io) {
        this.io = io;
    }

    start() {
        if (this.running) return;
        this.running = true;
        console.log("🚦 [Traffic Engine] Starting real-time signal cycles & AI telemetry...");

        // Signal countdown cycle tick every 1 second
        this.timer = setInterval(() => {
            this.tickSignalCycles().catch(err => {
                // Avoid flooding logs on small transient errors
            });
        }, 1000);

        // Simulated AI camera telemetry updates every 4 seconds
        this.telemetryTimer = setInterval(() => {
            this.updateSimulatedTelemetry().catch(() => {});
        }, 4000);
    }

    stop() {
        this.running = false;
        if (this.timer) clearInterval(this.timer);
        if (this.telemetryTimer) clearInterval(this.telemetryTimer);
        console.log("🛑 [Traffic Engine] Stopped.");
    }

    /**
     * Ticks signal countdowns and transitions phases
     */
    async tickSignalCycles() {
        try {
            // Fetch operational junctions not locked in manual override
            const [junctions] = await pool.promise().query(
                `SELECT id, name, mode, cycle_time, active_phase, status 
                 FROM traffic_junctions 
                 WHERE status != 'Offline'`
            );

            for (const jnc of junctions) {
                // If in emergency corridor or manual override with force red/flash amber, skip standard cycle
                if (jnc.mode === 'Emergency Corridor') continue;

                // Decrement countdown on active green/yellow signals
                const [signals] = await pool.promise().query(
                    `SELECT id, approach, current_color, countdown, green_time, yellow_time, red_time, override_color
                     FROM traffic_signals 
                     WHERE junction_id = ?`,
                    [jnc.id]
                );

                if (!signals || signals.length === 0) continue;

                let stateChanged = false;

                for (const sig of signals) {
                    if (sig.override_color && sig.override_color !== 'None') {
                        // Handled by override
                        continue;
                    }

                    let newCd = sig.countdown - 1;
                    let newColor = sig.current_color;

                    if (newCd <= 0) {
                        stateChanged = true;
                        if (sig.current_color === 'Green') {
                            newColor = 'Yellow';
                            newCd = sig.yellow_time || 4;
                        } else if (sig.current_color === 'Yellow') {
                            newColor = 'Red';
                            newCd = (sig.red_time || 70);
                        } else {
                            // Interlocking conflict monitor: oppose green/yellow cross-traffic
                            const isSigNS = /north|south/i.test(sig.approach || '');
                            const isSigEW = /east|west/i.test(sig.approach || '');
                            const opposingActive = signals.some(other => {
                                if (other.id === sig.id) return false;
                                const isOtherNS = /north|south/i.test(other.approach || '');
                                const isOtherEW = /east|west/i.test(other.approach || '');
                                const isOpposing = (isSigNS && isOtherEW) || (isSigEW && isOtherNS) || (!isSigNS && !isSigEW && other.id !== sig.id);
                                return isOpposing && (other.current_color === 'Green' || other.current_color === 'Yellow');
                            });

                            if (opposingActive) {
                                newColor = 'Red';
                                newCd = 2;
                            } else {
                                newColor = 'Green';
                                newCd = sig.green_time || 45;
                            }
                        }
                    }

                    const colorChanged = newColor !== sig.current_color;
                    const shouldPersist = colorChanged || (newCd % 15 === 0);

                    if (shouldPersist) {
                        await pool.promise().query(
                            `UPDATE traffic_signals SET countdown = ?, current_color = ? WHERE id = ?`,
                            [newCd, newColor, sig.id]
                        ).catch(() => {});
                    }
                    sig.current_color = newColor;
                    sig.countdown = newCd;
                }

                // If phase state transitioned or periodically, broadcast to socket clients
                if (this.io && (stateChanged || Math.random() < 0.2)) {
                    this.io.emit("traffic:signal_update", {
                        junctionId: jnc.id,
                        name: jnc.name,
                        mode: jnc.mode,
                        timestamp: Date.now()
                    });
                }
            }
        } catch (err) {
            // Silently suppress transient DB disconnects
        }
    }

    /**
     * Dynamically updates simulated vehicle counts & sensor speeds
     */
    /**
     * Dynamically updates simulated vehicle counts & sensor speeds on cameras,
     * then recalculates junction congestion scores directly from the camera traffic data.
     */
    async updateSimulatedTelemetry() {
        try {
            const [cams] = await pool.promise().query(
                `SELECT id, junction_id, vehicles_per_min, avg_speed 
                 FROM traffic_cameras 
                 WHERE is_simulated = 1`
            );

            for (const cam of cams) {
                // Natural jitter (+- 1 to 5 vehicles/min, +- 1 to 3 km/h)
                const jitterVeh = Math.floor(Math.random() * 7) - 3;
                const jitterSpd = (Math.random() * 3 - 1.5);

                const newVeh = Math.max(12, Math.min(95, cam.vehicles_per_min + jitterVeh));
                const newSpd = Math.max(8.0, Math.min(50.0, Number((cam.avg_speed + jitterSpd).toFixed(1))));

                await pool.promise().query(
                    `UPDATE traffic_cameras SET vehicles_per_min = ?, avg_speed = ? WHERE id = ?`,
                    [newVeh, newSpd, cam.id]
                );
            }

            // Recalculate junction congestion scores directly from camera averages
            const updatedJunctions = await this.recalculateJunctionCongestionFromCameras();

            if (this.io) {
                this.io.emit("traffic:telemetry_tick", {
                    timestamp: Date.now(),
                    junctions: updatedJunctions
                });
            }
        } catch (err) {
            // Silently handle transient DB blips
        }
    }

    /**
     * Recalculates junction congestion directly from real-time camera-collected traffic data
     * Uses Indian Road Congress (IRC) Level of Service (LOS) volume-to-capacity and speed reduction
     */
    async recalculateJunctionCongestionFromCameras(specificJunctionId = null) {
        try {
            let query = `
                SELECT c.junction_id,
                       COUNT(c.id) as camera_count,
                       SUM(c.vehicles_per_min) as total_vehicles_per_min,
                       AVG(c.vehicles_per_min) as avg_vehicles_per_min,
                       AVG(c.avg_speed) as avg_speed_kmh
                FROM traffic_cameras c
                WHERE c.status != 'Offline'
            `;
            const params = [];
            if (specificJunctionId) {
                query += ` AND c.junction_id = ?`;
                params.push(specificJunctionId);
            }
            query += ` GROUP BY c.junction_id`;

            const [jncAvgs] = await pool.promise().query(query, params);
            const updatedJunctions = [];

            for (const row of jncAvgs) {
                const camCount = Math.max(1, row.camera_count);
                const avgVeh = Number(row.avg_vehicles_per_min) || 30;
                const totalVeh = Number(row.total_vehicles_per_min) || 60;
                const avgSpd = Number(row.avg_speed_kmh) || 30.0;

                // Capacity threshold per approach camera is ~70 vehicles/min
                // Volume factor (0 to 100)
                const volumeRatio = Math.min(1.0, avgVeh / 70.0);
                const volumeFactor = volumeRatio * 100;

                // Speed reduction factor from nominal 45 km/h urban speed limit
                const nominalSpeed = 45.0;
                const speedDeficit = Math.max(0, nominalSpeed - avgSpd);
                const speedFactor = (speedDeficit / nominalSpeed) * 100;

                // Weighted Congestion Score (55% volume load + 45% speed drop)
                let congestion = Math.round(0.55 * volumeFactor + 0.45 * speedFactor);
                congestion = Math.min(98, Math.max(15, congestion));

                // Valid MySQL ENUM: ('Operational','Heavy Congestion','Maintenance','Emergency Priority','Offline')
                let dbStatus = 'Operational';
                if (congestion >= 65) dbStatus = 'Heavy Congestion';
                else dbStatus = 'Operational';

                const telemetryStatus = congestion >= 80 ? 'Severe Congestion' : (congestion >= 65 ? 'Heavy Congestion' : (congestion >= 40 ? 'Moderate Congestion' : 'Free Flow'));

                await pool.promise().query(
                    `UPDATE traffic_junctions 
                     SET congestion_level = ?, avg_speed_kmh = ?, 
                         status = CASE WHEN mode IN ('Emergency Corridor', 'Manual Override') THEN status ELSE ? END 
                     WHERE id = ?`,
                    [congestion, avgSpd.toFixed(1), dbStatus, row.junction_id]
                );

                updatedJunctions.push({
                    id: row.junction_id,
                    congestion_level: congestion,
                    avg_speed_kmh: Number(avgSpd.toFixed(1)),
                    total_vehicles_per_min: Math.round(totalVeh),
                    avg_vehicles_per_min: Math.round(avgVeh),
                    cameras_active: camCount,
                    status: telemetryStatus
                });
            }

            if (this.io && updatedJunctions.length > 0) {
                this.io.emit("traffic:congestion_updated", {
                    timestamp: Date.now(),
                    source: "CCTV_AI_OPTICAL_SENSORS",
                    junctions: updatedJunctions
                });
            }

            return updatedJunctions;
        } catch (err) {
            console.error("Recalculate congestion error:", err);
            return [];
        }
    }

    /**
     * Dispatch an emergency priority green corridor
     */
    async dispatchEmergencyCorridor(corridorId, operator = "ICCC Command Center", role = "Traffic Controller") {
        const [corridors] = await pool.promise().query(
            `SELECT * FROM traffic_corridors WHERE id = ?`,
            [corridorId]
        );

        if (!corridors || corridors.length === 0) {
            throw new Error(`Corridor ${corridorId} not found`);
        }

        const corridor = corridors[0];
        const junctionIds = JSON.parse(corridor.junction_sequence || "[]");

        // 1. Mark corridor as Active
        await pool.promise().query(
            `UPDATE traffic_corridors 
             SET status = 'Active', activated_at = NOW(), triggered_by = ? 
             WHERE id = ?`,
            [operator, corridorId]
        );

        // 2. Preempt each junction in sequence
        for (const jncId of junctionIds) {
            await pool.promise().query(
                `UPDATE traffic_junctions 
                 SET status = 'Emergency Priority', mode = 'Emergency Corridor' 
                 WHERE id = ?`,
                [jncId]
            );

            // Force all signals to Green for the primary transit axis and Red for cross streets
            await pool.promise().query(
                `UPDATE traffic_signals 
                 SET current_color = CASE WHEN approach IN ('North', 'South') THEN 'Green' ELSE 'Red' END,
                     countdown = 180,
                     override_color = CASE WHEN approach IN ('North', 'South') THEN 'Force Green' ELSE 'Force Red' END
                 WHERE junction_id = ?`,
                [jncId]
            );
        }

        // 3. Log to audit trail
        await this.logAudit({
            userId: operator,
            userName: operator,
            role: role,
            action: 'EMERGENCY_CORRIDOR_DISPATCH',
            target: corridor.name,
            details: `Emergency Priority Green Corridor activated across ${junctionIds.length} junctions (${junctionIds.join(', ')}). Travel ETA: ${corridor.estimated_travel_min} mins.`
        });

        // 4. Emit real-time notification
        if (this.io) {
            this.io.emit("traffic:emergency_corridor_active", {
                corridorId: corridor.id,
                name: corridor.name,
                origin: corridor.origin,
                destination: corridor.destination,
                emergencyType: corridor.emergency_type,
                junctions: junctionIds,
                activatedAt: new Date().toISOString()
            });
        }

        return {
            success: true,
            corridorId,
            name: corridor.name,
            affectedJunctions: junctionIds
        };
    }

    /**
     * Deactivate emergency corridor and restore normal operations
     */
    async deactivateEmergencyCorridor(corridorId, operator = "ICCC Command Center", role = "Traffic Controller") {
        const [corridors] = await pool.promise().query(
            `SELECT * FROM traffic_corridors WHERE id = ?`,
            [corridorId]
        );

        if (!corridors || corridors.length === 0) return;
        const corridor = corridors[0];
        const junctionIds = JSON.parse(corridor.junction_sequence || "[]");

        await pool.promise().query(
            `UPDATE traffic_corridors 
             SET status = 'Completed', cleared_at = NOW() 
             WHERE id = ?`,
            [corridorId]
        );

        for (const jncId of junctionIds) {
            await pool.promise().query(
                `UPDATE traffic_junctions 
                 SET status = 'Operational', mode = 'AI Adaptive' 
                 WHERE id = ?`,
                [jncId]
            );

            // Clear overrides
            await pool.promise().query(
                `UPDATE traffic_signals 
                 SET override_color = 'None',
                     countdown = CASE WHEN approach IN ('North', 'South') THEN 30 ELSE 45 END,
                     current_color = CASE WHEN approach IN ('North', 'South') THEN 'Green' ELSE 'Red' END
                 WHERE junction_id = ?`,
                [jncId]
            );
        }

        await this.logAudit({
            userId: operator,
            userName: operator,
            role: role,
            action: 'EMERGENCY_CORRIDOR_DEACTIVATED',
            target: corridor.name,
            details: `Emergency Priority Corridor returned to normal AI Adaptive mode.`
        });

        if (this.io) {
            this.io.emit("traffic:emergency_corridor_cleared", {
                corridorId: corridor.id,
                name: corridor.name
            });
        }
    }

    /**
     * Proximity check for moving emergency ambulances.
     * If an emergency vehicle approaches within 600m of an intersection,
     * triggers automatic green signal preemption ("Green Wave").
     */
    async handleAmbulanceMovement(ambulance) {
        if (!ambulance || !ambulance.latitude || !ambulance.longitude) return;
        if (!this.preemptionCooldowns) this.preemptionCooldowns = new Map();
        if (!this.junctionCache || Date.now() - (this.lastJunctionCacheTime || 0) > 30000) {
            try {
                const [jnc] = await pool.promise().query("SELECT id, name, latitude, longitude FROM traffic_junctions");
                this.junctionCache = jnc;
                this.lastJunctionCacheTime = Date.now();
            } catch (e) {
                return;
            }
        }

        const R = 6371e3; // meters
        const now = Date.now();

        for (const jnc of this.junctionCache) {
            const φ1 = ambulance.latitude * Math.PI / 180;
            const φ2 = jnc.latitude * Math.PI / 180;
            const Δφ = (jnc.latitude - ambulance.latitude) * Math.PI / 180;
            const Δλ = (jnc.longitude - ambulance.longitude) * Math.PI / 180;

            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                      Math.cos(φ1) * Math.cos(φ2) *
                      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const dist = R * c; // distance in meters

            // Preempt if within 600m and not preempted within the last 45 seconds
            if (dist <= 600) {
                const lastPreempt = this.preemptionCooldowns.get(jnc.id) || 0;
                if (now - lastPreempt > 45000) {
                    this.preemptionCooldowns.set(jnc.id, now);

                    console.log(`🚑 [Green Wave Auto-Preempt] Ambulance ${ambulance.vehicle_number} within ${Math.round(dist)}m of ${jnc.name}. Preempting to Green!`);

                    // 1. Preempt junction signals
                    await pool.promise().query(
                        `UPDATE traffic_junctions SET status = 'Emergency Priority', mode = 'Emergency Corridor' WHERE id = ?`,
                        [jnc.id]
                    );

                    await pool.promise().query(
                        `UPDATE traffic_signals 
                         SET current_color = CASE WHEN approach IN ('North', 'South') THEN 'Green' ELSE 'Red' END,
                             countdown = 40,
                             override_color = CASE WHEN approach IN ('North', 'South') THEN 'Force Green' ELSE 'Force Red' END
                         WHERE junction_id = ?`,
                        [jnc.id]
                    );

                    // 2. Log audit trail
                    await this.logAudit({
                        userId: ambulance.ambulance_id || 'AMB_AUTO',
                        userName: ambulance.driver_name || 'Emergency Pilot',
                        role: 'Ambulance AI Responder',
                        action: 'AMBULANCE_AUTO_GREEN_WAVE',
                        target: jnc.name,
                        details: `Auto Green Wave Preemption triggered: Ambulance ${ambulance.vehicle_number} (${ambulance.ambulance_type}) within ${Math.round(dist)}m of ${jnc.name}. Approaches set to Green for 40s.`
                    });

                    // 3. Broadcast real-time event to dashboard
                    if (this.io) {
                        this.io.emit("traffic:ambulance_green_wave", {
                            ambulanceId: ambulance.ambulance_id,
                            vehicleNumber: ambulance.vehicle_number,
                            driverName: ambulance.driver_name,
                            hospitalName: ambulance.hospital_name,
                            junctionId: jnc.id,
                            junctionName: jnc.name,
                            distanceMeters: Math.round(dist),
                            durationSeconds: 40,
                            timestamp: new Date().toISOString()
                        });
                    }

                    // 4. Auto-revert after 40 seconds
                    setTimeout(async () => {
                        try {
                            await pool.promise().query(
                                `UPDATE traffic_junctions SET status = 'Operational', mode = 'AI Adaptive' WHERE id = ? AND mode = 'Emergency Corridor'`,
                                [jnc.id]
                            );
                            await pool.promise().query(
                                `UPDATE traffic_signals SET override_color = 'None', countdown = 35 WHERE junction_id = ?`,
                                [jnc.id]
                            );
                            console.log(`🟢 [Green Wave Cleared] Normal AI Adaptive restored for ${jnc.name}`);
                        } catch (err) {}
                    }, 40000);
                }
            }
        }
    }

    /**
     * Preempt all traffic signals along a critical ambulance corridor
     */
    async preemptCriticalAmbulanceCorridor(ambulance) {
        if (!ambulance) return [];
        try {
            const [junctions] = await pool.promise().query("SELECT id, name, latitude, longitude FROM traffic_junctions");
            const waypoints = ambulance.routeWaypoints || [];
            const R = 6371e3;
            const affectedJunctions = [];

            for (const jnc of junctions) {
                let isNearRoute = false;
                // Check proximity to any route waypoint or current ambulance position
                const checkPoints = [...waypoints, { lat: ambulance.latitude, lng: ambulance.longitude }];
                for (const pt of checkPoints) {
                    if (!pt || !pt.lat || !pt.lng) continue;
                    const dLat = (jnc.latitude - pt.lat) * Math.PI / 180;
                    const dLng = (jnc.longitude - pt.lng) * Math.PI / 180;
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                              Math.cos(pt.lat * Math.PI / 180) * Math.cos(jnc.latitude * Math.PI / 180) *
                              Math.sin(dLng / 2) * Math.sin(dLng / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    if (R * c <= 1500) { // 1.5km corridor buffer
                        isNearRoute = true;
                        break;
                    }
                }

                if (isNearRoute) {
                    affectedJunctions.push(jnc);
                    await pool.promise().query(
                        `UPDATE traffic_junctions SET status = 'Emergency Priority', mode = 'Emergency Corridor' WHERE id = ?`,
                        [jnc.id]
                    );
                    await pool.promise().query(
                        `UPDATE traffic_signals 
                         SET current_color = CASE WHEN approach IN ('North', 'South') THEN 'Green' ELSE 'Red' END,
                             countdown = 120,
                             override_color = CASE WHEN approach IN ('North', 'South') THEN 'Force Green' ELSE 'Force Red' END
                         WHERE junction_id = ?`,
                        [jnc.id]
                    );
                }
            }

            await this.logAudit({
                userId: ambulance.ambulance_id || 'AMB_CRITICAL',
                userName: ambulance.driver_name || 'Emergency Pilot',
                role: 'Ambulance AI Responder',
                action: 'CRITICAL_AMBULANCE_CORRIDOR_PREEMPT',
                target: ambulance.vehicle_number,
                details: `Critical Transit Corridor Activated: Ambulance ${ambulance.vehicle_number} bound for ${ambulance.destinationHospital || 'Hospital'}. Preempted ${affectedJunctions.length} junctions to Force Green.`
            });

            if (this.io) {
                this.io.emit("traffic:ambulance_critical_transit", {
                    ambulanceId: ambulance.ambulance_id,
                    vehicleNumber: ambulance.vehicle_number,
                    driverName: ambulance.driver_name,
                    destinationHospital: ambulance.destinationHospital,
                    latitude: ambulance.latitude,
                    longitude: ambulance.longitude,
                    routeWaypoints: waypoints,
                    affectedJunctions: affectedJunctions.map(j => ({ id: j.id, name: j.name })),
                    timestamp: new Date().toISOString()
                });
            }

            return affectedJunctions;
        } catch (err) {
            console.error("Critical corridor preemption error:", err);
            return [];
        }
    }

    /**
     * Clear critical transit preemption and restore normal AI signals
     */
    async clearCriticalAmbulanceCorridor(ambulance) {
        if (!ambulance) return;
        try {
            const [junctions] = await pool.promise().query("SELECT id, name, latitude, longitude FROM traffic_junctions");
            const waypoints = ambulance.routeWaypoints || [];
            const R = 6371e3;

            for (const jnc of junctions) {
                let isNearRoute = false;
                const checkPoints = [...waypoints, { lat: ambulance.latitude, lng: ambulance.longitude }];
                for (const pt of checkPoints) {
                    if (!pt || !pt.lat || !pt.lng) continue;
                    const dLat = (jnc.latitude - pt.lat) * Math.PI / 180;
                    const dLng = (jnc.longitude - pt.lng) * Math.PI / 180;
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                              Math.cos(pt.lat * Math.PI / 180) * Math.cos(jnc.latitude * Math.PI / 180) *
                              Math.sin(dLng / 2) * Math.sin(dLng / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    if (R * c <= 1500) {
                        isNearRoute = true;
                        break;
                    }
                }

                if (isNearRoute) {
                    await pool.promise().query(
                        `UPDATE traffic_junctions SET status = 'Operational', mode = 'AI Adaptive' WHERE id = ?`,
                        [jnc.id]
                    );
                    await pool.promise().query(
                        `UPDATE traffic_signals 
                         SET override_color = 'None',
                             countdown = 35,
                             current_color = CASE WHEN approach IN ('North', 'South') THEN 'Green' ELSE 'Red' END
                         WHERE junction_id = ?`,
                        [jnc.id]
                    );
                }
            }

            if (this.io) {
                this.io.emit("traffic:ambulance_critical_cleared", {
                    ambulanceId: ambulance.ambulance_id,
                    vehicleNumber: ambulance.vehicle_number,
                    clearedAt: new Date().toISOString()
                });
            }
        } catch (err) {
            console.error("Clear critical corridor error:", err);
        }
    }

    /**
     * Audit log helper
     */
    async logAudit({ userId, userName, role, action, target, details, ip = '127.0.0.1' }) {
        try {
            await pool.promise().query(
                `INSERT INTO traffic_audit_logs (user_id, user_name, role, action, target, details, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [userId || 'SYSTEM', userName || 'System Staff', role || 'Officer', action, target, details, ip]
            );
        } catch (e) {
            console.error("Audit log error:", e.message);
        }
    }
}

const trafficEngine = new TrafficEngine();
module.exports = trafficEngine;
