/**
 * SmartCity AI - Master Real-Time Socket.IO Module
 * Centralized room management, lifecycle handlers, and broadcast helpers
 */

let ioInstance = null;

/**
 * Initialize Socket.io with all event listeners & rooms
 * @param {import("socket.io").Server} io 
 */
function initSockets(io) {
    ioInstance = io;

    io.on("connection", (socket) => {
        console.log(`🟢 [Socket.IO] Client connected: ${socket.id}`);

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

module.exports = {
    initSockets,
    emitAmbulanceLocation,
    emitAmbulanceStatus,
    emitParkingUpdate,
    emitEmergencyAlert,
    emitEmergencyResolved,
    emitWaterUpdate,
    emitCityUpdate,
    getIO: () => ioInstance
};
