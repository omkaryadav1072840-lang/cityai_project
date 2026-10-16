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

const {
    validateEnv,
    TRUST_PROXY,
    JWT_SECRET,
    CORS_ORIGIN,
    CORS_ORIGINS
} = require("./config/env.config");

// Validate critical environment secrets before starting
validateEnv();

// Ensure DB pool initializes
const pool = require("./config/db");

// Route Modules
const cityRoutes = require("./routes/city.routes");
const authRoutes = require("./routes/auth.routes");
const patientRoutes = require("./routes/patient.routes");
const appointmentRoutes = require("./routes/appointment.routes");
const doctorRoutes = require("./routes/doctor.routes");
const hospitalRoutes = require("./routes/hospital.routes");
const hospitalConfigRoutes = require("./routes/hospital_config.routes");
const diagnosticsRoutes = require("./routes/diagnostics.routes");
const ambulanceRoutes = require("./routes/ambulance.routes");
const emergencyRoutes = require("./routes/emergency.routes");
const pharmacyRoutes = require("./routes/pharmacy.routes");
const wasteRoutes = require("./routes/waste.routes");
const parkingRoutes = require("./routes/parking.routes");
const waterRoutes = require("./routes/water.routes");
const policeRoutes = require("./routes/police.routes");
const aiRoutes = require("./routes/ai.routes");
const famousPlacesRoutes = require("./routes/famous_places.routes");
const trafficRoutes = require("./routes/traffic.routes");
const requestsRoutes = require("./routes/requests.routes");
const notificationsRoutes = require("./routes/notifications.routes");
const streetLightsRoutes = require("./routes/street_lights.routes");
const environmentRoutes = require("./routes/environment.routes");
const adminRoutes = require("./routes/admin.routes");
const searchRoutes = require("./routes/search.routes");
const mapRoutes = require("./routes/map.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const clinicalCareRoutes = require("./routes/clinical_care_assistant.routes");
const trafficEngine = require("./services/traffic_engine");
const slaEngine = require("./services/sla_engine");


// Middlewares
const {
    multerErrorHandler,
    notFoundHandler,
    generalErrorHandler,
    serveHtmlErrorPage
} = require("./middleware/error.middleware");

const {
    securityHeaders,
    authRateLimiter,
    aiRateLimiter,
    sosRateLimiter,
    globalApiRateLimiter,
    enforceHttpsInProduction
} = require("./middleware/security.middleware");

const { inputSanitizer } = require("./middleware/validation.middleware");

// =========================================================
// APP & SERVER INITIALIZATION
// =========================================================

const app = express();
if (TRUST_PROXY !== false) {
    app.set("trust proxy", TRUST_PROXY);
}
const server = http.createServer(app);

// Explicit CORS Origin Allowlists
const defaultAllowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5501",
    "http://127.0.0.1:5501",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "capacitor://localhost"
];

const customOrigins = (CORS_ORIGINS || CORS_ORIGIN || "")
    .split(",")
    .map(o => o.trim())
    .filter(Boolean);

const allowedOrigins = customOrigins.length > 0 ? customOrigins : defaultAllowedOrigins;

const isLocalDevOrigin = (origin) => {
    return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes("*") || (process.env.NODE_ENV !== "production" && isLocalDevOrigin(origin))) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Access-Token", "X-Requested-With"]
};

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin) || allowedOrigins.includes("*") || (process.env.NODE_ENV !== "production" && isLocalDevOrigin(origin))) {
                return callback(null, true);
            }
            return callback(null, false);
        },
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

// Provide socket.io instance to Express routers via req.app.get("io")
app.set("io", io);

// =========================================================
// BASIC & SECURITY MIDDLEWARES
// =========================================================

// Enforce HTTPS in production deployment (keeps HTTP on localhost/dev)
app.use(enforceHttpsInProduction);

// HTTP Security Headers (anti-sniff, anti-clickjack, XSS filter, HSTS in prod)
app.use(securityHeaders);

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// XSS and script injection sanitizer
app.use(inputSanitizer);

// Rate Limiters for sensitive endpoints (skipped when process.env.NODE_ENV === "test")
app.use(["/api/login", "/api/register"], authRateLimiter);
app.use("/api/emergency/sos", sosRateLimiter);
app.use("/api/ai", aiRateLimiter);

// Medical uploads security guard (Prescriptions & Diagnostic Reports)
app.use(["/uploads/prescriptions", "/uploads/reports"], (req, res, next) => {
    if (process.env.REQUIRE_AUTH === "false") return next();

    const authHeader = req.headers["authorization"] || req.headers["x-access-token"];
    let token = authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : (authHeader || req.query.token);

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Access denied. Valid authentication token required to view confidential clinical documents."
        });
    }

    const jwt = require("jsonwebtoken");
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: "Invalid or expired authorization token."
            });
        }
        req.user = decoded;
        next();
    });
});

// Serve static uploaded files (civic photos, authenticated medical records, etc.)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve static frontend files (dashboard, subpages, CSS, JS, media)
const staticOptions = {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
};
app.use(express.static(path.join(__dirname, "..", "frontend"), staticOptions));
app.use("/frontend", express.static(path.join(__dirname, "..", "frontend"), staticOptions));

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

// Global API rate limiter (protects all API endpoints against DoS)
app.use("/api/", globalApiRateLimiter);

// Specific rate limiters
app.use(["/api/login", "/api/register", "/api/staff-login", "/api/auth/demo-login"], authRateLimiter);
app.use(["/api/ai/chat", "/api/ai/assistant", "/api/ai/clinical-care/chat"], aiRateLimiter);
app.use("/api/emergency/sos", sosRateLimiter);

// =========================================================
// PUBLIC LEGAL & SEO STATIC ROUTES
// =========================================================

app.get("/privacy-policy", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "frontend", "pages", "privacy-policy.html"));
});

app.get("/terms-and-conditions", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "frontend", "pages", "terms-and-conditions.html"));
});

app.get("/robots.txt", (req, res) => {
    res.type("text/plain").sendFile(path.join(__dirname, "..", "frontend", "robots.txt"));
});

app.get("/sitemap.xml", (req, res) => {
    res.type("application/xml").sendFile(path.join(__dirname, "..", "frontend", "sitemap.xml"));
});

// =========================================================
// API ROUTES
// =========================================================

app.use(cityRoutes);
app.use(authRoutes);
app.use(patientRoutes);
app.use(appointmentRoutes);
app.use(doctorRoutes);
app.use(hospitalRoutes);
app.use(hospitalConfigRoutes);
app.use(diagnosticsRoutes);
app.use(ambulanceRoutes);
app.use(emergencyRoutes);
app.use(pharmacyRoutes);
app.use(wasteRoutes);
app.use(parkingRoutes);
app.use(waterRoutes);
app.use(policeRoutes);
app.use(aiRoutes);
app.use(famousPlacesRoutes);
app.use(trafficRoutes);
app.use(requestsRoutes);
app.use(notificationsRoutes);
app.use(streetLightsRoutes);
app.use(environmentRoutes);
app.use(adminRoutes);
app.use(searchRoutes);
app.use(mapRoutes);
app.use(analyticsRoutes);
app.use(clinicalCareRoutes);


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
    trafficEngine.setSocketIO(io);
    trafficEngine.start();
    slaEngine.start(io, 60000);
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

        // Stop SLA engine
        try {
            slaEngine.stop();
        } catch (e) {}

        // Stop traffic engine
        try {
            trafficEngine.stop();
        } catch (e) {}

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

process.on("unhandledRejection", (reason, promise) => {
    console.error("⚠️ [Process] Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (err) => {
    console.error("💥 [Process] Uncaught Exception:", err);
});

module.exports = { app, server, io };