/**
 * SmartCity AI - Master Project Analysis PDF Generator
 * Pure Node.js implementation generating a valid, multi-page PDF (PDF-1.4 standard)
 * without external npm dependencies.
 */

const fs = require('fs');
const path = require('path');

class PDFDocumentBuilder {
    constructor(title = "SMARTCITY AI - MASTER PROJECT ANALYSIS") {
        this.title = title;
        this.pages = [];
        this.currentPage = null;
        this.y = 750;
        this.pageHeight = 792;
        this.pageWidth = 612;
        this.margin = 40;
        this.contentWidth = this.pageWidth - (this.margin * 2);
    }

    newPage() {
        this.currentPage = {
            commands: []
        };
        this.pages.push(this.currentPage);
        this.y = 740;

        // Draw running header on pages > 1
        if (this.pages.length > 1) {
            this.currentPage.commands.push(
                `BT /F2 8 Tf 0.4 0.4 0.4 rg ${this.margin} 765 Td (SMARTCITY AI - GORAKHPUR MUNICIPAL PLATFORM | TECHNICAL AUDIT) Tj ET`,
                `0.8 0.8 0.8 RG 1 w ${this.margin} 758 m ${this.pageWidth - this.margin} 758 l S`
            );
        }

        // Draw running footer
        const pageNum = this.pages.length;
        this.currentPage.commands.push(
            `0.8 0.8 0.8 RG 1 w ${this.margin} 35 m ${this.pageWidth - this.margin} 35 l S`,
            `BT /F2 8 Tf 0.4 0.4 0.4 rg ${this.margin} 25 Td (CONFIDENTIAL & PROPRIETARY | B.TECH MAJOR PROJECT AUDIT) Tj ET`,
            `BT /F2 8 Tf 0.4 0.4 0.4 rg ${this.pageWidth - this.margin - 50} 25 Td (Page ${pageNum}) Tj ET`
        );
    }

    checkPageBreak(neededSpace = 25) {
        if (!this.currentPage || (this.y - neededSpace) < 50) {
            this.newPage();
        }
    }

    addTitle(text) {
        this.checkPageBreak(50);
        this.currentPage.commands.push(
            `0.1 0.25 0.5 RG 2 w ${this.margin} ${this.y + 15} m ${this.pageWidth - this.margin} ${this.y + 15} l S`,
            `BT /F3 18 Tf 0.05 0.15 0.4 rg ${this.margin} ${this.y} Td (${this.escape(text)}) Tj ET`
        );
        this.y -= 28;
    }

    addSubtitle(text) {
        this.checkPageBreak(35);
        this.currentPage.commands.push(
            `BT /F3 13 Tf 0.1 0.3 0.6 rg ${this.margin} ${this.y} Td (${this.escape(text)}) Tj ET`
        );
        this.y -= 20;
    }

    addSectionHeader(text) {
        this.checkPageBreak(30);
        this.currentPage.commands.push(
            `0.85 0.9 0.95 rg ${this.margin} ${this.y - 4} ${this.contentWidth} 18 re f`,
            `0.2 0.4 0.7 RG 1 w ${this.margin} ${this.y - 4} ${this.contentWidth} 18 re S`,
            `BT /F3 11 Tf 0.1 0.25 0.5 rg ${this.margin + 6} ${this.y} Td (${this.escape(text)}) Tj ET`
        );
        this.y -= 24;
    }

    addParagraph(text, isBold = false) {
        const words = text.split(' ');
        let currentLine = '';
        const font = isBold ? '/F3' : '/F1';
        const fontSize = 9;
        const maxChars = 92;

        for (const word of words) {
            if ((currentLine + ' ' + word).trim().length > maxChars) {
                this.checkPageBreak(13);
                this.currentPage.commands.push(
                    `BT ${font} ${fontSize} Tf 0.15 0.15 0.15 rg ${this.margin} ${this.y} Td (${this.escape(currentLine)}) Tj ET`
                );
                this.y -= 12;
                currentLine = word;
            } else {
                currentLine = (currentLine + ' ' + word).trim();
            }
        }

        if (currentLine.length > 0) {
            this.checkPageBreak(13);
            this.currentPage.commands.push(
                `BT ${font} ${fontSize} Tf 0.15 0.15 0.15 rg ${this.margin} ${this.y} Td (${this.escape(currentLine)}) Tj ET`
            );
            this.y -= 14;
        }
    }

    addBullet(bulletTitle, desc) {
        this.checkPageBreak(18);
        const prefix = `  *  ${bulletTitle}: `;
        const full = prefix + desc;
        this.addParagraph(full);
    }

    addCodeBox(lines) {
        const boxHeight = (lines.length * 11) + 10;
        this.checkPageBreak(boxHeight + 10);

        this.currentPage.commands.push(
            `0.94 0.95 0.97 rg ${this.margin} ${this.y - boxHeight + 8} ${this.contentWidth} ${boxHeight} re f`,
            `0.75 0.8 0.88 RG 0.5 w ${this.margin} ${this.y - boxHeight + 8} ${this.contentWidth} ${boxHeight} re S`
        );

        let boxY = this.y - 3;
        for (const line of lines) {
            this.currentPage.commands.push(
                `BT /F2 8 Tf 0.1 0.15 0.25 rg ${this.margin + 8} ${boxY} Td (${this.escape(line)}) Tj ET`
            );
            boxY -= 11;
        }
        this.y -= (boxHeight + 8);
    }

    addSpacing(space = 10) {
        this.y -= space;
    }

    escape(str) {
        return String(str || '')
            .replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/[^\x20-\x7E]/g, ' '); // Keep printable ASCII for standard PDF Helvetica font
    }

    build() {
        const objects = [];
        let pdf = '%PDF-1.4\n';

        function writeObject(content) {
            const offset = Buffer.byteLength(pdf, 'latin1');
            const index = objects.length + 1;
            const objStr = `${index} 0 obj\n${content}\nendobj\n`;
            pdf += objStr;
            objects.push({ index, offset });
            return index;
        }

        // Obj 1: Catalog
        // Will point to Obj 2 (Pages)
        const catalogOffset = Buffer.byteLength(pdf, 'latin1');
        pdf += `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
        objects.push({ index: 1, offset: catalogOffset });

        // Placeholders for Page Objects
        const pageObjIndices = [];
        const contentObjIndices = [];

        // Font Objects
        // /F1: Helvetica, /F2: Courier, /F3: Helvetica-Bold
        const font1Index = 3;
        const font2Index = 4;
        const font3Index = 5;

        // Reserve indices for font and pages root
        // 2 is Pages root
        let nextIndex = 6;
        for (let i = 0; i < this.pages.length; i++) {
            pageObjIndices.push(nextIndex++);
            contentObjIndices.push(nextIndex++);
        }

        // Obj 2: Pages Root
        const pagesKids = pageObjIndices.map(idx => `${idx} 0 R`).join(' ');
        const pagesOffset = Buffer.byteLength(pdf, 'latin1');
        pdf += `2 0 obj\n<< /Type /Pages /Kids [${pagesKids}] /Count ${this.pages.length} >>\nendobj\n`;
        objects.push({ index: 2, offset: pagesOffset });

        // Obj 3: Helvetica
        const f1Offset = Buffer.byteLength(pdf, 'latin1');
        pdf += `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
        objects.push({ index: 3, offset: f1Offset });

        // Obj 4: Courier
        const f2Offset = Buffer.byteLength(pdf, 'latin1');
        pdf += `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n`;
        objects.push({ index: 4, offset: f2Offset });

        // Obj 5: Helvetica-Bold
        const f3Offset = Buffer.byteLength(pdf, 'latin1');
        pdf += `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`;
        objects.push({ index: 5, offset: f3Offset });

        // Write Pages and Content streams
        for (let i = 0; i < this.pages.length; i++) {
            const pageObjIndex = pageObjIndices[i];
            const contentObjIndex = contentObjIndices[i];
            const pageData = this.pages[i];

            // Page Object
            const pOffset = Buffer.byteLength(pdf, 'latin1');
            pdf += `${pageObjIndex} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Contents ${contentObjIndex} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> >>\nendobj\n`;
            objects.push({ index: pageObjIndex, offset: pOffset });

            // Stream Object
            const streamContent = pageData.commands.join('\n');
            const streamLen = Buffer.byteLength(streamContent, 'latin1');
            const cOffset = Buffer.byteLength(pdf, 'latin1');
            pdf += `${contentObjIndex} 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream\nendobj\n`;
            objects.push({ index: contentObjIndex, offset: cOffset });
        }

        // Sort objects by index to write correct xref table
        objects.sort((a, b) => a.index - b.index);

        const xrefStart = Buffer.byteLength(pdf, 'latin1');
        pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
        for (const obj of objects) {
            pdf += String(obj.offset).padStart(10, '0') + ' 00000 n \n';
        }

        pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

        return Buffer.from(pdf, 'latin1');
    }
}

// -------------------------------------------------------------
// COMPILING COMPREHENSIVE AUDIT DATA INTO DOCUMENT
// -------------------------------------------------------------

console.log("Generating SmartCity AI Master Technical Audit PDF...");

const doc = new PDFDocumentBuilder();
doc.newPage();

// COVER / HEADER
doc.addTitle("SMARTCITY AI - PLATFORM TECHNICAL ARCHITECTURE");
doc.addSubtitle("Gorakhpur Smart City Operations & Intelligent Municipal Operating System");
doc.addParagraph("Version: 2.5.0 Enterprise | Node.js Express 5 + MySQL 8.0 + Python FastAPI ML + Leaflet GIS + Socket.IO");
doc.addParagraph("Target Deployment: Municipal Corporation Gorakhpur (Nagar Nigam) & ICCC Command Center");
doc.addSpacing(10);

// SECTION 1: ARCHITECTURAL OVERVIEW
doc.addSectionHeader("1. SYSTEM ARCHITECTURE & TOPOLOGY");
doc.addParagraph("SMARTCITY AI is designed around a high-concurrency, Single Source of Truth municipal architecture. It integrates citizen portals, staff workstations, IoT sensor telemetry, and administrative control under a unified event-driven backend.");
doc.addBullet("Express 5 Gateway (Port 5000)", "High-throughput Node.js API server handling 29 REST route modules, Gzip/Deflate zlib payload compression (70-85% bandwidth reduction), JWT token lifecycle, and role-based access control.");
doc.addBullet("Socket.IO Real-Time Engine (Port 5000)", "WebSocket server managing active rooms (ambulance-tracking, parking-updates, emergency-alerts, water-updates, waste-updates, city-updates) with real-time push daemons.");
doc.addBullet("FastAPI ML Intelligence Service (Port 8000)", "Asynchronous Python 3.13 microservice hosting Scikit-Learn Random Forest Regressors, Gradient Boosting Classifiers, and Tfidf/Logistic Regression clinical NLP models.");
doc.addBullet("MySQL 8.0 Enterprise Relational Store", "117 active tables with connection pooling (max 20 concurrent connections), storing users, sensors, hospital beds, parking bays, traffic junctions, and immutable audit logs.");
doc.addBullet("Dual GIS Spatial Engine", "Leaflet 1.9.4 and OpenLayers 9.2.4 running in client browsers, supporting custom GeoJSON layers, vector styling, and dynamic GPS vehicle radar tracking.");
doc.addBullet("IoT Hardware & Firmware Tier", "ESP32 microcontrollers deployed with ultrasonic depth sensors (HC-SR04), PIR footfall detection (HC-SR501), and WiFi REST telemetry ingestion.");

// SECTION 2: MASTER ALGORITHM CATALOG
doc.addSectionHeader("2. MASTER ALGORITHM CATALOG (FORMULAS, MATH & CODE LOCATION)");
doc.addParagraph("The platform incorporates 12 production-grade deterministic and machine-learning algorithms across municipal domains:");

doc.addBullet("1. Webster Signal Optimization (IRC:93)", "Calculates optimum cycle length C0 and green phase splits for 42 junctions.");
doc.addCodeBox([
    "Formula: C0 = (1.5L + 5) / (1 - Y)",
    "L = Total lost time = (lost_per_phase * num_phases) + all_red = 12s",
    "Y = Sum of critical flow ratios (q_i / s_i), s_i = 1800 vph saturation flow",
    "Effective Green Split: g_i = (y_i / Y) * (C0 - L)",
    "Safety Constraints: 45s <= C0 <= 150s, Min Green = 15s, Max Green = 120s, Yellow = 4s",
    "Location: backend/services/traffic_engine.js | backend/services/traffic_ai_service.js"
]);

doc.addBullet("2. Topological Graph Dijkstra Pathfinding", "Calculates 3 real route alternatives across Gorakhpur road network (17 nodes, 18 arterial links).");
doc.addCodeBox([
    "Graph G = (V, E), Adjacency list with live junction congestion weights",
    "Cost Function 1 (Fastest Arterial): Time = Distance / (SpeedLimit * (1 - Congestion/100 * 0.7))",
    "Cost Function 2 (Low-Traffic Bypass): Cost = BaseTime * (1 + ((max(0, Congestion - 30)/15)^2.2))",
    "Cost Function 3 (Min-Junction Route): Cost = BaseTime + (isJunction ? 4.5 mins : 0.5 mins)",
    "Location: backend/services/gorakhpur_road_graph.js"
]);

doc.addBullet("3. Geodesic Haversine Spherical Distance", "Measures true earth-curvature distance between vehicles and intersections for emergency preemption.");
doc.addCodeBox([
    "a = sin^2(dLat/2) + cos(lat1)*cos(lat2)*sin^2(dLon/2)",
    "c = 2 * atan2(sqrt(a), sqrt(1-a))",
    "Distance d = R * c  (Earth Radius R = 6,371,000 meters)",
    "Green Wave Trigger: When Ambulance distance d <= 600m to approaching junction",
    "Action: Interlocking lock opposing cross streets to Red; lock transit axis Green for 180s",
    "Location: backend/services/traffic_ai_service.js | backend/services/ambulance_corridor_service.js"
]);

doc.addBullet("4. Waste Collection TSP Nearest-Neighbor", "Solves Traveling Salesperson Problem for municipal compactor trucks collecting overflowing dustbins.");
doc.addCodeBox([
    "Heuristic: Greedy Nearest Neighbor across bins with fill_level >= 70%",
    "Estimated Route Time = Sum(Collection_Time_per_bin [8 min] + Transit_Time [3.5 min/km])",
    "Location: backend/services/waste_ai_service.js | backend/controllers/waste.controller.js"
]);

doc.addBullet("5. Hydraulic Leak & Pipe Burst Anomaly Detection", "SCADA water loss and pressure gradient evaluation.");
doc.addCodeBox([
    "Loss Rate Pct = ((Inflow_Rate_LPS - Outflow_Rate_LPS) / Inflow_Rate_LPS) * 100",
    "Critical Rupture: Pressure < 1.6 bar AND Loss > 22% -> Score 0.94 (Immediate Valve Shutoff)",
    "Pressure Drop: Pressure < 2.0 bar AND Loss > 15% -> Score 0.78 (Acoustic Leak Inspection)",
    "Location: backend/services/water_ai_service.js | backend/services/water_intelligence_service.js"
]);

doc.addBullet("6. Clinical RAG Hybrid Lexical-Semantic Search", "Evidence-based clinical decision support querying ICMR, MoHFW, AIIMS, and WHO guidelines.");
doc.addCodeBox([
    "Step 1: Multilingual tokenization + 3-character n-gram shingles (handles Hinglish typos)",
    "Step 2: BM25 / TF-IDF token overlap scoring + Keyword (+6.0) + Topic Boost (+8.0)",
    "Step 3: Score normalization (>= 0.15 threshold) + SHA-256 Checksum Verification",
    "Location: backend/services/clinical_rag_service.js | backend/services/clinical_care_assistant_service.js"
]);

doc.addBullet("7. Multi-Criteria Priority Scoring & SLA Ladder", "Determines incident urgency and escalates delinquent requests automatically.");
doc.addCodeBox([
    "SLA Deadlines: CRITICAL = 2 Hours, HIGH = 6 Hours, MEDIUM = 24 Hours, LOW = 72 Hours",
    "Escalation Daemon: Ticks every 60s, queries overdue requests, sets status = 'Escalated'",
    "Emits WebSocket alerts: 'request:escalated' and 'notification:new'",
    "Location: backend/services/priority_engine.js | backend/services/sla_engine.js"
]);

doc.addBullet("8. Computer Vision & ANPR Staging Workflow", "Vehicle detection, license plate OCR, and violation staging.");
doc.addCodeBox([
    "Plate Pattern Validation: ^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$ (e.g. UP53BZ4821)",
    "Human-in-the-Loop Guardrail: Violations staged as 'AI_FLAGGED'; require staff sign-off",
    "Location: backend/services/cv_anpr_service.js | ai_service/camera_vision.py"
]);

doc.addBullet("9. Machine Learning Predictive Pipelines", "Offline and online Scikit-Learn models with joblib persistence.");
doc.addCodeBox([
    "Traffic Congestion: RandomForestRegressor with TimeSeriesSplit cross-validation",
    "Waste Priority: GradientBoostingClassifier (Normal, Medium, High, Immediate Dispatch)",
    "Clinical Intent: TfidfVectorizer + Calibrated Logistic Regression (0% Emergency False Negatives)",
    "Location: ai_service/artifacts/models/*.joblib | ai_service/training/*.py"
]);

doc.addBullet("10. Ultrasonic Time-of-Flight Firmware Physics", "IoT dustbin depth measurement.");
doc.addCodeBox([
    "Sound Velocity in Air: 343 m/s = 0.0343 cm/microsecond",
    "Distance (cm) = (Echo_Duration_us * 0.0343) / 2.0",
    "Fill Percentage (%) = ((Total_Bin_Depth_cm - Distance) / Total_Bin_Depth_cm) * 100",
    "PIR Interrupt: Footfall deposit increment via IRAM_ATTR ISR on pin change",
    "Location: iot_hardware/esp32_smart_dustbin.ino"
]);

// SECTION 3: COMPLETE FUNCTION CATALOG
doc.addSectionHeader("3. CORE MODULES & FUNCTION INVENTORY");
doc.addParagraph("The table below catalogs key functions across core backend services and their operational responsibilities:");

doc.addBullet("backend/services/traffic_engine.js", "");
doc.addParagraph("  * start() / stop(): Initializes 1s signal phase timer and 4s simulated camera telemetry tick.");
doc.addParagraph("  * tickSignalCycles(): Manages countdowns, transitions Green->Yellow->Red, checks phase conflict interlocking.");
doc.addParagraph("  * updateSimulatedTelemetry(): Applies natural vehicle flow jitter (+-7 veh/min) and triggers congestion updates.");
doc.addParagraph("  * recalculateJunctionCongestionFromCameras(): Computes Level of Service (LOS) volume-to-capacity and speed drop.");
doc.addParagraph("  * dispatchEmergencyCorridor(corridorId): Activates priority route, sets mode='Emergency Corridor', locks transit Green.");
doc.addParagraph("  * deactivateEmergencyCorridor(corridorId): Restores junctions to 'Operational' AI Adaptive mode.");

doc.addBullet("backend/services/gorakhpur_road_graph.js", "");
doc.addParagraph("  * findNearestNode(queryOrCoords): Resolves landmark names or GPS coordinates to topological road network nodes.");
doc.addParagraph("  * calculateThreeRoutes(origin, destination): Computes Fastest, Low-Traffic, and Min-Junction paths simultaneously.");
doc.addParagraph("  * _dijkstra(startId, targetId, costFn): Generic Dijkstra priority-queue shortest-path solver.");

doc.addBullet("backend/services/clinical_care_assistant_service.js", "");
doc.addParagraph("  * detectLanguage(text): Analyzes Devanagari Unicode range [\\u0900-\\u097F] and Hinglish markers to select Hindi/English.");
doc.addParagraph("  * extractMedicineFromQuery(text): Fuzzy regex normalizer for brand/generic medicines (paracetamol, metformin).");
doc.addParagraph("  * triageEmergency(text): Evaluates acute cardiac, stroke, trauma, or respiratory red-flags.");
doc.addParagraph("  * generateClinicalResponse(): Synthesizes 7-part comprehensive patient guidance with MySQL database grounding.");

doc.addBullet("backend/services/water_intelligence_service.js", "");
doc.addParagraph("  * haversineMeters(lat1, lon1, lat2, lon2): Calculates sphere geodesic distance.");
doc.addParagraph("  * distToSegmentMeters(pLat, pLng, aLat, aLng, bLat, bLng): Calculates point-to-pipeline perpendicular distance.");
doc.addParagraph("  * verifyWaterQualityAgainstRegulations(): Validates BOD, COD, TSS, pH, and Coliform against CPCB standards.");

// SECTION 4: REAL-TIME TELEMETRY & SOCKET.IO
doc.addSectionHeader("4. SOCKET.IO REAL-TIME CHANNELS & DAEMONS");
doc.addParagraph("Socket.IO handles bi-directional messaging with JWT handshake authentication and room segregation:");

doc.addBullet("Rooms", "ambulance-tracking, parking-updates, emergency-alerts, water-updates, waste-updates, city-updates");
doc.addBullet("Traffic Signal Update", "traffic:signal_update (emitted every 1s on phase change) | traffic:telemetry_tick (every 4s)");
doc.addBullet("Ambulance Radar Tracking", "ambulance:location-updated (emitted every 2s with lat, lng, speed, bearing, battery)");
doc.addBullet("Green Wave Alerts", "traffic:ambulance_green_wave | traffic:emergency_corridor_active | traffic:emergency_corridor_cleared");
doc.addBullet("Emergency SOS Ticker", "emergency:new-sos (instant high-priority broadcast) | emergency:resolved");
doc.addBullet("Civic SLA Ticker", "request:escalated (emitted by 60s SLA daemon when deadline is breached) | notification:new");
doc.addBullet("IoT Dustbin Updates", "waste:bin-updated (triggered on ESP32 sensor ingest) | waste:vehicle-location");
doc.addBullet("Hospital Bed Telemetry", "hospital:bed-updated | bed_status_changed (real-time ward occupancy sync)");

// SECTION 5: COMPLETE API ENDPOINT CATALOG
doc.addSectionHeader("5. REST API ENDPOINT CATALOG (29 ROUTE MODULES)");
doc.addParagraph("All APIs follow RESTful conventions, prefixed with /api, and secured via security middlewares:");

doc.addBullet("Authentication (/api/auth)", "POST /api/register, POST /api/login, POST /api/staff-login, POST /api/auth/otp/send, POST /api/auth/otp/verify, GET /api/auth/me, PUT /api/auth/profile, GET /api/user/activities");
doc.addBullet("Traffic & ATCS (/api/traffic)", "GET /api/traffic/junctions, GET /api/traffic/signals, POST /api/traffic/optimize-signal, POST /api/traffic/signals/override, GET /api/traffic/alternative-routes, GET /api/traffic/cameras, GET /api/traffic/violations/search, POST /api/traffic/violations/:id/dispute");
doc.addBullet("Emergency & Ambulances (/api/emergency, /api/ambulances)", "POST /api/emergency/sos, GET /api/emergency/incidents, PUT /api/emergency/incidents/:id/status, GET /api/ambulances, POST /api/ambulances/:id/location, POST /api/traffic/ambulance-preemption");
doc.addBullet("Hospital & Health (/api/hospital, /api/patients, /api/doctors)", "GET /api/hospitals, GET /api/hospital/beds, GET /api/hospital/bed-surge, POST /api/appointments/book-strict, GET /api/patients/:id/qr, POST /api/patients/verify-qr, POST /api/doctor/consultation");
doc.addBullet("Smart Parking (/api/parking)", "GET /api/parking/lots, GET /api/parking/slots, POST /api/parking/book, GET /api/parking/my-bookings, POST /api/parking/entry, POST /api/parking/exit");
doc.addBullet("Smart Waste (/api/waste)", "GET /api/waste/bins, POST /api/waste/prediction, POST /api/waste/optimize-route, POST /api/waste/report, POST /api/waste/dustbin-terminal/sensor-data");
doc.addBullet("SCADA Water (/api/water)", "GET /api/water/tanks, GET /api/water/pipelines, GET /api/water/anomalies, GET /api/water/schedules, POST /api/water/tanker-bookings");
doc.addBullet("AI Assistant & RAG (/api/ai)", "POST /api/ai/chat, POST /api/ai/assistant, POST /api/ai/clinical-care/chat, GET /api/ai/predictions");
doc.addBullet("Public Safety & Tourism (/api/police, /api/famous-places)", "GET /api/police/stations, POST /api/police/complaints, GET /api/famous-places, GET /api/famous/reviews");
doc.addBullet("ICCC Command Center (/api/admin)", "GET /api/admin/command-center, GET /api/admin/stats, POST /api/admin/what-if-simulation");

// SECTION 6: TECHNOLOGY STACK & SECURITY
doc.addSectionHeader("6. TECHNOLOGY STACK & SECURITY SPECIFICATIONS");
doc.addParagraph("Frontend: HTML5, CSS3 Glassmorphic Token System, Vanilla ES6+ JS, Leaflet 1.9.4, OpenLayers 9.2.4, Socket.IO Client 4.8.1, QRCode.js, Capacitor 8.5 (Android APK).");
doc.addParagraph("Backend: Node.js 20+, Express.js 5.2.1, Socket.IO 4.8.3, mysql2/promise (Connection Pool: 20 conns), jsonwebtoken (JWT), zlib HTTP compression, multer, helmet, nodemailer.");
doc.addParagraph("AI & Machine Learning: Python 3.13, FastAPI, Uvicorn, Scikit-learn (RandomForest, GradientBoosting, LogisticRegression), Pandas, NumPy, Joblib, OpenCV (cv2), Google Gemini 1.5 Flash.");
doc.addParagraph("Database: MySQL 8.0+ Enterprise, 117 tables, utf8mb4_unicode_ci charset, ACID compliant transactions.");
doc.addParagraph("Security & Privacy: DPDP Act PII redaction (Aadhaar, PAN, Cards, Passwords), in-memory token blacklist, rate limiters (authRateLimiter: 10 req/15m, sosRateLimiter: 5 req/1m, aiRateLimiter: 30 req/1m), inputSanitizer XSS protection.");

// WRITE TO FILE
const outputPath = path.join(__dirname, '..', 'SMARTCITY_AI_FULL_PROJECT_ANALYSIS.pdf');
const pdfBytes = doc.build();
fs.writeFileSync(outputPath, pdfBytes, 'binary');

console.log(`Master Technical Audit PDF generated successfully at: ${outputPath}`);
console.log(`File size: ${(pdfBytes.length / 1024).toFixed(2)} KB | Total Pages: ${doc.pages.length}`);

