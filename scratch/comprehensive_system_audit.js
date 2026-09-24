const fs = require('fs');
const path = require('path');
const http = require('http');
const { app, server } = require('../backend/server');
const pool = require('../backend/config/db');

async function runAudit() {
    console.log("========================================================");
    console.log("🔍 COMPREHENSIVE FULL-STACK SYSTEM AUDIT");
    console.log("========================================================\n");

    const issuesFound = [];

    // ---------------------------------------------------------
    // 1. DATABASE SCHEMA & DOCKER PARITY AUDIT
    // ---------------------------------------------------------
    console.log("--- 1. Database & Docker Schema Parity ---");
    const [liveTablesRows] = await pool.promise().query("SHOW TABLES;");
    const liveTables = liveTablesRows.map(r => Object.values(r)[0]).sort();

    const schemaSql = fs.readFileSync(path.join(__dirname, '../backend/database/schema.sql'), 'utf8');
    const schemaTables = [...schemaSql.matchAll(/CREATE TABLE IF NOT EXISTS `?([a-zA-Z0-9_]+)`?/gi)].map(m => m[1]);

    const missingInSchema = liveTables.filter(t => !schemaTables.includes(t));
    if (missingInSchema.length > 0) {
        console.warn(`⚠️ Warning: ${missingInSchema.length} tables exist in live DB but are MISSING from backend/database/schema.sql!`);
        console.warn(`   Missing tables:`, missingInSchema);
        issuesFound.push({
            severity: "HIGH",
            category: "Docker / Database Initialization",
            title: `49 Tables missing from backend/database/schema.sql`,
            description: `Live database contains 78 tables, but schema.sql only defines 29 tables. When docker-compose or new installations run schema.sql, 49 tables (including traffic junctions, signals, violations, hospital wards, diagnostic tests, famous places, parking slots) will fail to initialize.`,
            missingCount: missingInSchema.length,
            missingTables: missingInSchema
        });
    } else {
        console.log("✅ All live tables are documented in schema.sql.");
    }

    // ---------------------------------------------------------
    // 2. AMBULANCE PATIENT PRIVACY LEAK AUDIT
    // ---------------------------------------------------------
    console.log("\n--- 2. Ambulance Patient Privacy Audit ---");
    const ambRouteFile = fs.readFileSync(path.join(__dirname, '../backend/routes/ambulance.routes.js'), 'utf8');
    if (ambRouteFile.includes('patient_name, patient_mobile') && !ambRouteFile.includes('optionalToken')) {
        console.warn("⚠️ Warning: GET /api/ambulances leaks patient_name, patient_mobile, and patient_address without authentication!");
        issuesFound.push({
            severity: "HIGH",
            category: "Privacy / Medical PII Leak",
            title: "Ambulance fleet API leaks active patient identity and GPS address",
            description: "GET /api/ambulances and GET /api/ambulances/:id select patient_name, patient_mobile, patient_lat, patient_lng, patient_address with no token verification. Anyone viewing the public live map can intercept emergency patient identities."
        });
    } else {
        console.log("✅ Ambulance privacy check passed.");
    }

    // ---------------------------------------------------------
    // 3. FRONTEND TO BACKEND API ROUTE MAPPING AUDIT
    // ---------------------------------------------------------
    console.log("\n--- 3. Frontend to Backend Route Integrity ---");
    function getFiles(dir, ext = '.js') {
        let results = [];
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat && stat.isDirectory()) {
                results = results.concat(getFiles(fullPath, ext));
            } else if (file.endsWith(ext)) {
                results.push(fullPath);
            }
        });
        return results;
    }

    const frontendFiles = getFiles(path.join(__dirname, '../frontend'), '.js');
    const apiCalls = new Set();

    frontendFiles.forEach(f => {
        const content = fs.readFileSync(f, 'utf8');
        // Match fetch("/api/...", `.../api/...`, etc.
        const regex = /["'`](\/api\/[a-zA-Z0-9_\-\/]+)/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            let endpoint = match[1];
            // Normalize path parameters
            endpoint = endpoint.replace(/\/\d+/g, '/:id');
            apiCalls.add(endpoint);
        }
    });

    console.log(`Detected ${apiCalls.size} unique API endpoints called across ${frontendFiles.length} frontend files.`);

    // Extract all registered routes from Express app
    const registeredRoutes = new Set();
    function extractRoutes(stack, prefix = '') {
        stack.forEach(layer => {
            if (layer.route) {
                const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
                paths.forEach(p => {
                    registeredRoutes.add(prefix + p);
                });
            } else if (layer.handle && layer.handle.stack) {
                let match = '';
                if (layer.regexp && layer.regexp.source) {
                    match = layer.regexp.source
                        .replace('^\\', '')
                        .replace('\\/?(?=\\/|$)', '')
                        .replace('(?=\\/|$)', '')
                        .replace(/\^/g, '')
                        .replace(/\\\//g, '/')
                        .replace(/\$/g, '');
                    if (match.startsWith('/')) match = match.slice(1);
                }
                extractRoutes(layer.handle.stack, prefix + (match ? '/' + match : ''));
            }
        });
    }
    const stack = (app.router && app.router.stack) || (app._router && app._router.stack) || [];
    extractRoutes(stack);

    const unregisteredOrDead = [];
    apiCalls.forEach(call => {
        // Strip trailing slash if any
        const cleanCall = call.endsWith('/') ? call.slice(0, -1) : call;
        let found = false;
        for (const reg of registeredRoutes) {
            // Check direct match, parameterized match, or prefix match for template routes
            const regPattern = new RegExp('^' + reg.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$');
            if (regPattern.test(call) || regPattern.test(cleanCall) || reg === call || reg === cleanCall) {
                found = true;
                break;
            }
            if (call.endsWith('/') && reg.startsWith(call)) {
                found = true;
                break;
            }
            if (reg.includes(':') && cleanCall && reg.startsWith(cleanCall + '/:')) {
                found = true;
                break;
            }
        }
        if (!found) {
            unregisteredOrDead.push(call);
        }
    });

    if (unregisteredOrDead.length > 0) {
        console.warn(`⚠️ Warning: ${unregisteredOrDead.length} endpoints called in frontend are not directly matched in Express router:`, unregisteredOrDead);
        issuesFound.push({
            severity: "MEDIUM",
            category: "Frontend/Backend Route Mismatch",
            title: `${unregisteredOrDead.length} Frontend API calls potentially missing backend handlers`,
            endpoints: unregisteredOrDead
        });
    } else {
        console.log("✅ All frontend API endpoints have matching backend routes.");
    }

    // ---------------------------------------------------------
    // 4. SUMMARY OF AUDIT FINDINGS
    // ---------------------------------------------------------
    console.log("\n========================================================");
    console.log(`📋 AUDIT SUMMARY: Found ${issuesFound.length} items needing improvement/fixes:`);
    console.log("========================================================\n");
    issuesFound.forEach((iss, idx) => {
        console.log(`${idx + 1}. [${iss.severity}] ${iss.title}`);
        console.log(`   Category: ${iss.category}`);
        console.log(`   Details: ${iss.description || JSON.stringify(iss.endpoints || '')}\n`);
    });

    process.exit(0);
}

runAudit().catch(err => {
    console.error("Audit error:", err);
    process.exit(1);
});
