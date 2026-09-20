/**
 * SmartCity AI - Live Ambulance GPS Movement Simulator
 * Simulates real-time telemetry for active ambulances moving along realistic Gorakhpur city transit routes.
 */

const db = require("../config/db");
const { emitAmbulanceLocation, emitAmbulanceStatus } = require("../sockets/index");
const trafficEngine = require("./traffic_engine");

// Pre-defined transit corridors in Gorakhpur with realistic GPS waypoints
const GORAKHPUR_ROUTES = [
    // Route 1: BRD Medical College to District Hospital via Golghar
    [
        { lat: 26.7900, lng: 83.3750, name: "BRD Medical College" },
        { lat: 26.7810, lng: 83.3780, name: "Medical Road" },
        { lat: 26.7720, lng: 83.3810, name: "Asuran Chowk" },
        { lat: 26.7640, lng: 83.3770, name: "Dharamshala Bazar" },
        { lat: 26.7580, lng: 83.3730, name: "Golghar Commercial Hub" },
        { lat: 26.7560, lng: 83.3710, name: "District Hospital Gorakhpur" }
    ],
    // Route 2: AIIMS Gorakhpur to Railway Station via Mohaddipur
    [
        { lat: 26.7380, lng: 83.4350, name: "AIIMS Gorakhpur" },
        { lat: 26.7430, lng: 83.4180, name: "Kunraghat Intersection" },
        { lat: 26.7490, lng: 83.4020, name: "Mohaddipur Flyover" },
        { lat: 26.7520, lng: 83.3890, name: "University Gate" },
        { lat: 26.7540, lng: 83.3820, name: "Gorakhpur Junction Station" }
    ],
    // Route 3: Gorakhnath Temple to Cantt Area
    [
        { lat: 26.7820, lng: 83.3550, name: "Gorakhnath Temple" },
        { lat: 26.7700, lng: 83.3600, name: "Alinagar" },
        { lat: 26.7580, lng: 83.3650, name: "Shastri Chowk" },
        { lat: 26.7460, lng: 83.3720, name: "Cantt Hospital Road" }
    ]
];

let simulationInterval = null;
let simulatedAmbulances = [];
let isSimulationActive = false;

/**
 * Initialize simulated vehicles from existing DB ambulances
 */
async function loadSimulatedVehicles() {
    return new Promise((resolve) => {
        db.query(
            "SELECT id, ambulance_id, vehicle_number, driver_name, driver_mobile, ambulance_type, hospital_name, location, status, latitude, longitude FROM ambulances LIMIT 6",
            (err, results) => {
                if (err || !results || results.length === 0) {
                    // Fallback vehicles if DB is unreachable
                    simulatedAmbulances = [
                        {
                            id: 1,
                            ambulance_id: "AMB-001",
                            vehicle_number: "UP-53-AZ-1001",
                            driver_name: "Ramesh Verma",
                            driver_mobile: "+91 98765 43210",
                            ambulance_type: "Advanced Life Support (ALS)",
                            hospital_name: "BRD Medical College",
                            status: "On The Way",
                            latitude: 26.7900,
                            longitude: 83.3750,
                            routeIndex: 0,
                            waypointIndex: 0,
                            direction: 1,
                            speedKmh: 45
                        },
                        {
                            id: 2,
                            ambulance_id: "AMB-002",
                            vehicle_number: "UP-53-AZ-1002",
                            driver_name: "Amit Tiwari",
                            driver_mobile: "+91 98765 43211",
                            ambulance_type: "Basic Life Support (BLS)",
                            hospital_name: "AIIMS Gorakhpur",
                            status: "On Duty",
                            latitude: 26.7380,
                            longitude: 83.4350,
                            routeIndex: 1,
                            waypointIndex: 0,
                            direction: 1,
                            speedKmh: 52
                        },
                        {
                            id: 3,
                            ambulance_id: "AMB-003",
                            vehicle_number: "UP-53-AZ-1003",
                            driver_name: "Sunil Pandey",
                            driver_mobile: "+91 98765 43212",
                            ambulance_type: "Neonatal Intensive Care",
                            hospital_name: "District Hospital Gorakhpur",
                            status: "Transporting Patient",
                            latitude: 26.7820,
                            longitude: 83.3550,
                            routeIndex: 2,
                            waypointIndex: 0,
                            direction: 1,
                            speedKmh: 40
                        }
                    ];
                    return resolve(simulatedAmbulances);
                }

                simulatedAmbulances = results.map((amb, i) => {
                    const routeIdx = i % GORAKHPUR_ROUTES.length;
                    const route = GORAKHPUR_ROUTES[routeIdx];
                    const startWp = route[0];
                    return {
                        id: amb.id,
                        ambulance_id: amb.ambulance_id,
                        vehicle_number: amb.vehicle_number,
                        driver_name: amb.driver_name,
                        driver_mobile: amb.driver_mobile,
                        ambulance_type: amb.ambulance_type,
                        hospital_name: amb.hospital_name,
                        status: amb.status || "On Duty",
                        latitude: Number(amb.latitude) || startWp.lat,
                        longitude: Number(amb.longitude) || startWp.lng,
                        routeIndex: routeIdx,
                        waypointIndex: 0,
                        direction: 1,
                        progress: 0.0, // 0.0 to 1.0 along current segment
                        speedKmh: 40 + Math.floor(Math.random() * 20)
                    };
                });

                resolve(simulatedAmbulances);
            }
        );
    });
}

/**
 * Execute one movement tick across all active simulated ambulances
 */
function tickSimulation() {
    if (!simulatedAmbulances || simulatedAmbulances.length === 0) return;

    simulatedAmbulances.forEach((amb) => {
        const route = GORAKHPUR_ROUTES[amb.routeIndex];
        if (!route || route.length < 2) return;

        const currentWp = route[amb.waypointIndex];
        const nextWpIdx = amb.waypointIndex + amb.direction;

        if (nextWpIdx >= route.length) {
            // Reached end of route, reverse
            amb.direction = -1;
            amb.waypointIndex = route.length - 1;
            return;
        } else if (nextWpIdx < 0) {
            // Reached start of route, forward
            amb.direction = 1;
            amb.waypointIndex = 0;
            return;
        }

        const targetWp = route[nextWpIdx];

        // Step progress forward by ~0.15 (takes ~7 steps per waypoint segment)
        amb.progress = (amb.progress || 0) + 0.15;

        if (amb.progress >= 1.0) {
            // Arrived at target waypoint
            amb.waypointIndex = nextWpIdx;
            amb.progress = 0.0;
            amb.latitude = targetWp.lat;
            amb.longitude = targetWp.lng;
            amb.location = targetWp.name;
        } else {
            // Linear interpolation between current and target
            amb.latitude = Number((currentWp.lat + (targetWp.lat - currentWp.lat) * amb.progress).toFixed(6));
            amb.longitude = Number((currentWp.lng + (targetWp.lng - currentWp.lng) * amb.progress).toFixed(6));
        }

        // Vary speed slightly for realism (faster if in critical transit)
        const baseSpeed = amb.isCritical ? 65 : 40;
        amb.speedKmh = Math.max(30, Math.min(85, (amb.speedKmh || baseSpeed) + (Math.floor(Math.random() * 7) - 3)));

        // Payload matching frontend expectations
        const updatePayload = {
            id: amb.id,
            ambulance_id: amb.ambulance_id,
            vehicle_number: amb.vehicle_number,
            driver_name: amb.driver_name,
            driver_mobile: amb.driver_mobile,
            ambulance_type: amb.ambulance_type,
            hospital_name: amb.hospital_name,
            location: amb.location || route[amb.waypointIndex].name,
            status: amb.status,
            latitude: amb.latitude,
            longitude: amb.longitude,
            speedKmh: amb.speedKmh,
            isCritical: !!amb.isCritical,
            destinationHospital: amb.destinationHospital || amb.hospital_name || "BRD Medical College",
            routeWaypoints: route,
            updated_at: new Date().toISOString()
        };

        // Broadcast to all connected clients via Socket.io
        emitAmbulanceLocation(updatePayload);

        // Auto Green Wave signal preemption check
        if (amb.isCritical) {
            trafficEngine.preemptCriticalAmbulanceCorridor(updatePayload).catch(() => {});
        } else {
            trafficEngine.handleAmbulanceMovement(updatePayload).catch(() => {});
        }
    });

    // Periodically (every 10 ticks = 30 seconds) persist coordinates to MySQL
    if (Math.random() < 0.1) {
        simulatedAmbulances.forEach((amb) => {
            db.query(
                "UPDATE ambulances SET latitude = ?, longitude = ?, status = ?, updated_at = NOW() WHERE id = ?",
                [amb.latitude, amb.longitude, amb.status, amb.id],
                () => {} // silent
            );
        });
    }
}

/**
 * Mark an ambulance as Critical Transit or restore to normal
 */
async function setAmbulanceCritical(ambIdentifier, isCritical = true, destinationHospital = null) {
    if (!simulatedAmbulances || simulatedAmbulances.length === 0) {
        await loadSimulatedVehicles();
    }

    const amb = simulatedAmbulances.find(
        a => String(a.id) === String(ambIdentifier) ||
             String(a.ambulance_id).toUpperCase() === String(ambIdentifier).toUpperCase() ||
             String(a.vehicle_number).toUpperCase() === String(ambIdentifier).toUpperCase()
    );

    if (!amb) {
        throw new Error(`Ambulance '${ambIdentifier}' not found in active telemetry pool.`);
    }

    amb.isCritical = !!isCritical;
    amb.status = isCritical ? "Critical Transit" : "On Duty";
    if (destinationHospital) {
        amb.destinationHospital = destinationHospital;
    } else if (!amb.destinationHospital) {
        amb.destinationHospital = amb.hospital_name || "BRD Medical College";
    }

    const route = GORAKHPUR_ROUTES[amb.routeIndex] || [];
    const payload = {
        id: amb.id,
        ambulance_id: amb.ambulance_id,
        vehicle_number: amb.vehicle_number,
        driver_name: amb.driver_name,
        driver_mobile: amb.driver_mobile,
        ambulance_type: amb.ambulance_type,
        hospital_name: amb.hospital_name,
        location: amb.location || route[amb.waypointIndex]?.name || "En Route",
        status: amb.status,
        latitude: amb.latitude,
        longitude: amb.longitude,
        speedKmh: amb.speedKmh,
        isCritical: amb.isCritical,
        destinationHospital: amb.destinationHospital,
        routeWaypoints: route,
        updated_at: new Date().toISOString()
    };

    // Broadcast immediate updates
    emitAmbulanceLocation(payload);
    emitAmbulanceStatus(payload);

    if (isCritical) {
        const affectedJunctions = await trafficEngine.preemptCriticalAmbulanceCorridor(payload);
        return {
            success: true,
            ambulance: payload,
            preemptedJunctions: affectedJunctions
        };
    } else {
        await trafficEngine.clearCriticalAmbulanceCorridor(payload);
        return {
            success: true,
            ambulance: payload,
            preemptedJunctions: []
        };
    }
}

/**
 * Return all simulated ambulances with full route telemetry
 */
function getSimulatedAmbulances() {
    return simulatedAmbulances.map(a => {
        const route = GORAKHPUR_ROUTES[a.routeIndex] || [];
        return {
            id: a.id,
            ambulance_id: a.ambulance_id,
            vehicle_number: a.vehicle_number,
            driver_name: a.driver_name,
            driver_mobile: a.driver_mobile,
            ambulance_type: a.ambulance_type,
            hospital_name: a.hospital_name,
            location: a.location || route[a.waypointIndex]?.name || "Gorakhpur City",
            status: a.status,
            latitude: a.latitude,
            longitude: a.longitude,
            speedKmh: a.speedKmh,
            isCritical: !!a.isCritical,
            destinationHospital: a.destinationHospital || a.hospital_name || "BRD Medical College",
            routeWaypoints: route
        };
    });
}

/**
 * Start the live movement simulation
 * @param {number} intervalMs Milliseconds per movement step (default: 3000ms)
 */
async function startSimulation(intervalMs = 3000) {
    if (isSimulationActive) return;

    await loadSimulatedVehicles();

    simulationInterval = setInterval(tickSimulation, intervalMs);
    isSimulationActive = true;
    console.log(`🚑 [Simulator] Live Ambulance GPS movement simulation started (${simulatedAmbulances.length} ambulances, interval ${intervalMs}ms)`);
}

/**
 * Stop the live movement simulation
 */
function stopSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
    isSimulationActive = false;
    console.log("🛑 [Simulator] Live Ambulance GPS simulation paused");
}

/**
 * Toggle simulation state
 */
async function toggleSimulation() {
    if (isSimulationActive) {
        stopSimulation();
        return { active: false };
    } else {
        await startSimulation();
        return { active: true, count: simulatedAmbulances.length };
    }
}

/**
 * Get current simulation status
 */
function getStatus() {
    return {
        active: isSimulationActive,
        ambulanceCount: simulatedAmbulances.length,
        ambulances: getSimulatedAmbulances()
    };
}

module.exports = {
    startSimulation,
    stopSimulation,
    toggleSimulation,
    getStatus,
    setAmbulanceCritical,
    getSimulatedAmbulances,
    GORAKHPUR_ROUTES
};
