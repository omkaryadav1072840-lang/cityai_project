/**
 * SmartCity AI - Master Backend Server
 * Modular Architecture (Express 5 + Socket.io + MySQL2 Connection Pool)
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Ensure DB pool initializes
const pool = require("./config/db");

// Route Modules
const cityRoutes = require("./routes/city.routes");
const authRoutes = require("./routes/auth.routes");
const patientRoutes = require("./routes/patient.routes");
const appointmentRoutes = require("./routes/appointment.routes");
const doctorRoutes = require("./routes/doctor.routes");
const hospitalRoutes = require("./routes/hospital.routes");
const ambulanceRoutes = require("./routes/ambulance.routes");
const emergencyRoutes = require("./routes/emergency.routes");
const pharmacyRoutes = require("./routes/pharmacy.routes");
const wasteRoutes = require("./routes/waste.routes");
const parkingRoutes = require("./routes/parking.routes");
const waterRoutes = require("./routes/water.routes");
const policeRoutes = require("./routes/police.routes");
const aiRoutes = require("./routes/ai.routes");

// Middlewares
const {
    multerErrorHandler,
    notFoundHandler,
    generalErrorHandler
} = require("./middleware/error.middleware");

const {
    securityHeaders,
    authRateLimiter,
    aiRateLimiter,
    sosRateLimiter
} = require("./middleware/security.middleware");

// =========================================================
// APP & SERVER INITIALIZATION
// =========================================================

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// Provide socket.io instance to Express routers via req.app.get("io")
app.set("io", io);

// =========================================================
// BASIC & SECURITY MIDDLEWARES
// =========================================================

// HTTP Security Headers (anti-sniff, anti-clickjack, XSS filter)
app.use(securityHeaders);

app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files (prescriptions, reports, etc.)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve static frontend files (dashboard, subpages, CSS, JS, media)
app.use(express.static(path.join(__dirname, "..", "frontend")));

// Modular Socket.io real-time handler
const { initSockets } = require("./sockets/index");
initSockets(io);

// Live Ambulance GPS Movement Simulator
const ambulanceSimulator = require("./services/ambulance_simulator");

// =========================================================
// SYSTEM HEALTH & DIAGNOSTICS (Production Monitoring)
// =========================================================

app.get(["/api/health", "/health"], async (req, res) => {
    const startTime = Date.now();
    let dbStatus = "healthy";
    let dbLatencyMs = 0;

    try {
        const pingStart = Date.now();
        await pool.promise().query("SELECT 1 AS alive");
        dbLatencyMs = Date.now() - pingStart;
    } catch (err) {
        dbStatus = "unhealthy: " + err.message;
    }

    const isHealthy = dbStatus === "healthy";
    const statusPayload = {
        status: isHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || "development",
        version: require("./package.json").version || "1.0.0",
        services: {
            database: {
                status: dbStatus,
                latencyMs: dbLatencyMs,
                pool: {
                    totalConnections: pool._allConnections ? pool._allConnections.length : 0,
                    freeConnections: pool._freeConnections ? pool._freeConnections.length : 0,
                    queuedRequests: pool._connectionQueue ? pool._connectionQueue.length : 0
                }
            },
            realtime: {
                status: "active",
                activeClients: io ? (io.engine ? io.engine.clientsCount : 0) : 0
            },
            ambulanceSimulation: {
                status: ambulanceSimulator ? (ambulanceSimulator.getStatus().isRunning ? "running" : "stopped") : "inactive"
            }
        },
        memory: {
            heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024)
        },
        responseTimeMs: Date.now() - startTime
    };

    return res.status(isHealthy ? 200 : 503).json(statusPayload);
});

// =========================================================
// SIMULATION CONTROL ROUTES
// =========================================================

app.get("/api/simulation/status", (req, res) => {
    res.json({ success: true, ...ambulanceSimulator.getStatus() });
});

app.post("/api/simulation/toggle", async (req, res) => {
    const result = await ambulanceSimulator.toggleSimulation();
    res.json({ success: true, ...result });
});

app.post("/api/simulation/start", async (req, res) => {
    await ambulanceSimulator.startSimulation();
    res.json({ success: true, message: "Ambulance simulation started." });
});

app.post("/api/simulation/stop", (req, res) => {
    ambulanceSimulator.stopSimulation();
    res.json({ success: true, message: "Ambulance simulation stopped." });
});

// =========================================================
// RATE LIMITERS FOR SENSITIVE ENDPOINTS
// =========================================================

app.use(["/api/login", "/api/register", "/api/staff-login"], authRateLimiter);
app.use("/api/ai/chat", aiRateLimiter);
app.use("/api/emergency/sos", sosRateLimiter);

// =========================================================
// API ROUTES
// =========================================================

app.use(cityRoutes);
app.use(authRoutes);
app.use(patientRoutes);
app.use(appointmentRoutes);
app.use(doctorRoutes);
app.use(hospitalRoutes);
app.use(ambulanceRoutes);
app.use(emergencyRoutes);
app.use(pharmacyRoutes);
app.use(wasteRoutes);
app.use(parkingRoutes);
app.use(waterRoutes);
app.use(policeRoutes);
app.use(aiRoutes);

// =========================================================
// ERROR HANDLERS
// =========================================================

app.use(multerErrorHandler);
app.use(notFoundHandler);
app.use(generalErrorHandler);

// =========================================================
// SERVER START
// =========================================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`🚀 SmartCity AI Backend running at http://localhost:${PORT}`);
    console.log(`📡 Socket.IO real-time server running`);
    if (process.env.SIMULATE_AMBULANCES !== "false") {
        ambulanceSimulator.startSimulation().catch(err => {
            console.warn("Ambulance simulation init warning:", err.message);
        });
    }
});

// =========================================================
// GRACEFUL SHUTDOWN
// =========================================================

function gracefulShutdown(signal) {
    console.log(`\n🛑 [Shutdown] Received ${signal}. Starting graceful shutdown...`);

    // Stop acceptance of new requests
    server.close(async () => {
        console.log("🔒 [Shutdown] HTTP & WebSocket servers closed.");

        // Stop simulator
        try {
            ambulanceSimulator.stopSimulation();
            console.log("🚑 [Shutdown] Ambulance simulation stopped.");
        } catch (e) {}

        // Drain DB pool
        try {
            await pool.promise().end();
            console.log("🟢 [Shutdown] MySQL connection pool closed.");
        } catch (err) {
            console.warn("⚠️ [Shutdown] Error closing MySQL pool:", err.message);
        }

        console.log("👋 [Shutdown] Graceful shutdown completed cleanly.");
        process.exit(0);
    });

    // Force close after 10 seconds if anything hangs
    setTimeout(() => {
        console.error("⚠️ [Shutdown] Forced shutdown after timeout.");
        process.exit(1);
    }, 10000).unref();
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

module.exports = { app, server, io };