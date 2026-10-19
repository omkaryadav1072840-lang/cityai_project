/**
 * SmartCity AI - Master Real-Time Socket.IO Module
 * Centralized room management, lifecycle handlers, and broadcast helpers
 */

const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env.config");
const { isTokenRevoked, isUserSessionRevoked } = require("../middleware/auth.middleware");

let ioInstance = null;

/**
 * Initialize Socket.io with all event listeners & rooms
 * @param {import("socket.io").Server} io 
 */
function initSockets(io) {
    ioInstance = io;

    // Layer 1: Handshake Authentication Middleware
    io.use((socket, next) => {
        const rawToken = socket.handshake.auth?.token ||
                         socket.handshake.headers?.authorization ||
                         socket.handshake.query?.token;

        const token = rawToken && rawToken.startsWith("Bearer ")
            ? rawToken.slice(7).trim()
            : rawToken;

        if (token) {
            if (isTokenRevoked(token)) {
                return next(new Error("Authentication token has been revoked / logged out."));
            }
            jwt.verify(token, JWT_SECRET, (err, decoded) => {
                if (err) {
                    return next(new Error("Invalid or expired authentication token."));
                }
                if (decoded && isUserSessionRevoked(decoded.id, decoded.iat)) {
                    return next(new Error("Authentication session has been revoked following a password change."));
                }
                socket.user = decoded;
                next();
            });
        } else {
            // Allow unauthenticated connection for public telemetry channels
            socket.user = null;
            next();
        }
    });

    io.on("connection", (socket) => {
        console.log(`🟢 [Socket.IO] Client connected: ${socket.id} (User: ${socket.user ? socket.user.name : "Guest"})`);

        // Room subscriptions
        socket.on("join-ambulance-tracking", () => {
            socket.join("ambulance-tracking");
            console.log(`🚑 [Socket.IO] ${socket.id} joined ambulance-tracking`);
        });

        socket.on("leave-ambulance-tracking", () => {
            socket.leave("ambulance-tracking");
        });

        socket.on("join-parking", () => {
            socket.join("parking-updates");
            console.log(`🅿️ [Socket.IO] ${socket.id} joined parking-updates`);
        });

        socket.on("join-emergency", () => {
            socket.join("emergency-alerts");
            console.log(`🚨 [Socket.IO] ${socket.id} joined emergency-alerts`);
        });

        socket.on("join-water", () => {
            socket.join("water-updates");
            console.log(`💧 [Socket.IO] ${socket.id} joined water-updates`);
        });

        socket.on("join-waste", () => {
            socket.join("waste-updates");
            console.log(`♻️ [Socket.IO] ${socket.id} joined waste-updates`);
        });

        socket.on("leave-waste", () => {
            socket.leave("waste-updates");
        });

        socket.on("join-city", () => {
            socket.join("city-updates");
            console.log(`🏙️ [Socket.IO] ${socket.id} joined city-updates`);
        });

        socket.on("disconnect", (reason) => {
            console.log(`🔴 [Socket.IO] Client disconnected: ${socket.id} (${reason})`);
        });
    });

    return io;
}

/**
 * Broadcast ambulance real-time location update
 * Emits both new event name 'ambulance:location-updated' and legacy 'ambulance-location-updated'
 */
function emitAmbulanceLocation(ambulance) {
    if (!ioInstance) return;
    ioInstance.to("ambulance-tracking").emit("ambulance:location-updated", ambulance);
    ioInstance.emit("ambulance-location-updated", ambulance);
}

/**
 * Broadcast ambulance status update
 */
function emitAmbulanceStatus(ambulance) {
    if (!ioInstance) return;
    ioInstance.to("ambulance-tracking").emit("ambulance:status-updated", ambulance);
    ioInstance.emit("ambulance-status-updated", ambulance);
}

/**
 * Broadcast parking slot / lot availability changes
 */
function emitParkingUpdate(parkingData) {
    if (!ioInstance) return;
    ioInstance.to("parking-updates").emit("parking:slot-updated", parkingData);
    ioInstance.emit("parking:slot-updated", parkingData);
}

/**
 * Broadcast emergency SOS / incident alert to all connected operators & citizens
 */
function emitEmergencyAlert(alertData) {
    if (!ioInstance) return;
    // Broadcast to emergency room and general city channel
    ioInstance.to("emergency-alerts").emit("emergency:new-sos", alertData);
    ioInstance.emit("emergency:new-sos", alertData);
}

/**
 * Broadcast incident resolution
 */
function emitEmergencyResolved(incidentData) {
    if (!ioInstance) return;
    ioInstance.to("emergency-alerts").emit("emergency:resolved", incidentData);
    ioInstance.emit("emergency:resolved", incidentData);
}

/**
 * Broadcast water tank level or supply alert
 */
function emitWaterUpdate(waterData) {
    if (!ioInstance) return;
    ioInstance.to("water-updates").emit("water:tank-updated", waterData);
    ioInstance.emit("water:tank-updated", waterData);
}

/**
 * Broadcast general city status update (traffic, AQI, alert)
 */
function emitCityUpdate(cityData) {
    if (!ioInstance) return;
    ioInstance.to("city-updates").emit("city:status-updated", cityData);
    ioInstance.emit("city:status-updated", cityData);
}

/**
 * Broadcast hospital bed availability updates (telemetry & ward sync)
 */
function emitHospitalBedUpdate(bedData) {
    if (!ioInstance) return;
    ioInstance.to("city-updates").emit("hospital:bed-updated", bedData);
    ioInstance.emit("hospital:bed-updated", bedData);
    ioInstance.emit("bed-updated", bedData);
}

/**
 * Broadcast waste bin fill level and status updates
 */
function emitWasteBinUpdate(binData) {
    if (!ioInstance) return;
    ioInstance.to("waste-updates").emit("waste:bin-updated", binData);
    ioInstance.emit("waste-bin-updated", binData);
}

/**
 * Broadcast waste vehicle GPS location tracking
 */
function emitWasteVehicleLocation(vehicleData) {
    if (!ioInstance) return;
    ioInstance.to("waste-updates").emit("waste:vehicle-location", vehicleData);
    ioInstance.emit("waste-vehicle-location", vehicleData);
}

/**
 * Broadcast general waste management operational alerts
 */
function emitWasteAlert(alertData) {
    if (!ioInstance) return;
    ioInstance.to("waste-updates").emit("waste:alert", alertData);
    ioInstance.emit("waste-alert", alertData);
}

module.exports = {
    initSockets,
    emitAmbulanceLocation,
    emitAmbulanceStatus,
    emitParkingUpdate,
    emitEmergencyAlert,
    emitEmergencyResolved,
    emitWaterUpdate,
    emitCityUpdate,
    emitHospitalBedUpdate,
    emitWasteBinUpdate,
    emitWasteVehicleLocation,
    emitWasteAlert,
    getIO: () => ioInstance
};

