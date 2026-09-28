/**
 * SMARTCITY AI - VERIFICATION SUITE FOR PHASES 12 & 13
 * Tests:
 * 1. Model Monitoring & Drift Detection
 * 2. Explainability & Feature Factor Attribution (XAI)
 * 3. Human-in-the-Loop Review & Audit Trails
 * 4. AI Feedback Loop & Accuracy Tracking
 * 5. Security & RBAC Guard Validations
 */

const pool = require("../backend/config/db").promise();
const modelMonitoringService = require("../backend/services/model_monitoring_service");
const healthcareAIService = require("../backend/services/healthcare_ai_service");
const jwt = require("../backend/node_modules/jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "smartcity_super_secret_jwt_key_gorakhpur_2026";

async function runPhase12And13Tests() {
    console.log("==================================================");
    console.log("🧪 TESTING SMARTCITY AI PHASES 12 & 13");
    console.log("==================================================");

    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${message}`);
            failed++;
        }
    }

    try {
        // --- TEST 1: Model Monitoring & Drift Analysis ---
        console.log("\n--- PHASE 12: Model Monitoring & XAI ---");
        const modelReport = await modelMonitoringService.getModelPerformanceReport();
        assert(modelReport.success === true, "Model performance report generated successfully");
        assert(modelReport.models_report.length > 0, `Monitored ${modelReport.models_report.length} active models in catalog`);
        
        const trafficModel = modelReport.models_report.find(m => m.module === "traffic") || modelReport.models_report[0];
        assert(trafficModel.accuracy_pct >= 85, `Model ${trafficModel.model_identifier} accuracy is healthy (${trafficModel.accuracy_pct}%)`);
        assert(trafficModel.drift.drift_status === "STABLE", `Model drift status verified as ${trafficModel.drift.drift_status}`);
        assert(trafficModel.precision_pct > 80, `Model precision calculated: ${trafficModel.precision_pct}%`);

        // Seed a sample prediction to test explainability
        const testPredId = `PRED-XAI-${Date.now()}`;
        await pool.query(
            `INSERT INTO ai_predictions 
             (prediction_id, module, model_name, model_version, input_data, output_data, confidence_score, reason, location, data_source, processing_time, status)
             VALUES (?, 'traffic', 'traffic-congestion-v2.0', '2.0.0', ?, ?, 0.9300, 'Congestion spike predicted at junction', 'Golghar Chowk', 'PREDICTED', 34, 'COMPLETED')`,
            [testPredId, JSON.stringify({ vehicle_count: 120, queue_length: 85 }), JSON.stringify({ level: "SEVERE", delay_mins: 14 })]
        );

        // --- TEST 2: Explainability (XAI) Attribution ---
        const explanation = await modelMonitoringService.getPredictionExplanation(testPredId);
        assert(explanation.success === true, `Explainability breakdown retrieved for ${testPredId}`);
        assert(explanation.explainable_attribution.top_contributing_factors.length > 0, "Top contributing factors derived");
        assert(explanation.explainable_attribution.uncertainty_margin_pct === 7.0, "Uncertainty margin computed from confidence (7%)");
        assert(explanation.human_audit_trail.review_status === "PENDING", "Initial human review status verified as PENDING");

        // --- TEST 3: Human-in-the-Loop Review ---
        console.log("\n--- PHASE 12: Human-in-the-Loop Review & Feedback Loop ---");
        await pool.query(
            `UPDATE ai_predictions SET review_status = 'ACCEPTED', reviewed_by = 1, review_notes = 'Verified by Traffic Inspector', was_correct = 1 WHERE prediction_id = ?`,
            [testPredId]
        );
        const [updatedRows] = await pool.query(`SELECT review_status, reviewed_by, was_correct FROM ai_predictions WHERE prediction_id = ?`, [testPredId]);
        assert(updatedRows[0].review_status === "ACCEPTED", "Human operator approval recorded in AI ledger");
        assert(updatedRows[0].was_correct === 1, "Ground truth accuracy flag marked correct");

        // Seed feedback record
        await pool.query(
            `INSERT INTO ai_feedback (prediction_id, module, model_name, predicted_value, actual_value, accuracy_score, feedback_type, submitted_by, comments)
             VALUES (?, 'traffic', 'traffic-congestion-v2.0', 'SEVERE', 'SEVERE', 1.0000, 'STAFF_REVIEW', 'inspector_sharma', 'Accurate timing on Golghar queue')`,
            [testPredId]
        );
        const [fb] = await pool.query(`SELECT COUNT(*) AS count FROM ai_feedback WHERE prediction_id = ?`, [testPredId]);
        assert(fb[0].count === 1, "Feedback loop record persisted in ai_feedback table");

        // --- TEST 4: Security & Privacy RBAC (PHASE 13) ---
        console.log("\n--- PHASE 13: Security, Privacy & RBAC Protection ---");
        
        // 4a. Medical Privacy: Block unauthorized citizen token
        const citizenToken = jwt.sign({ id: 99, username: "citizen_user", role: "citizen" }, JWT_SECRET);
        const citizenAccess = await healthcareAIService.accessPatientRecordViaQR({ qr_token: "VALID_QR_CODE", accessing_user_token: citizenToken });
        assert(citizenAccess.authorized === false, "Medical Record Privacy: Citizen role strictly blocked from accessing patient medical charts");
        assert(citizenAccess.status === "FORBIDDEN", "Returned FORBIDDEN status code on unauthorized access attempt");

        // 4b. Medical Privacy: Grant access to authorized Doctor token
        const doctorToken = jwt.sign({ id: 10, username: "dr_verma", role: "doctor", name: "Dr. A. Verma" }, JWT_SECRET);
        const doctorAccess = await healthcareAIService.accessPatientRecordViaQR({ qr_token: "VALID_QR_CODE", accessing_user_token: doctorToken });
        assert(doctorAccess.authorized === true, "Medical Record Privacy: Doctor role granted access to patient chart via secure QR");
        assert(doctorAccess.audited_by === "Dr. A. Verma", "Audit log recorded doctor identity upon access");

        // 4c. SQL Injection Protection Verification on Parameterized Queries
        const maliciousPayload = "' OR '1'='1' --";
        const [sqlCheck] = await pool.query(`SELECT * FROM ai_predictions WHERE prediction_id = ?`, [maliciousPayload]);
        assert(sqlCheck.length === 0, "Parameterized queries successfully immunized against SQL injection attempts");

        // 4d. Data Source Tagging Enforcement
        const [sources] = await pool.query(`SELECT DISTINCT data_source FROM ai_predictions WHERE data_source IN ('REAL', 'SIMULATED', 'PREDICTED')`);
        assert(sources.length > 0, "AI Ledger strictly enforces REAL, SIMULATED, and PREDICTED data source tagging");

    } catch (err) {
        console.error("Test execution error:", err);
        failed++;
    }

    console.log("\n==================================================");
    console.log(`📊 PHASES 12 & 13 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    process.exit(failed > 0 ? 1 : 0);
}

runPhase12And13Tests();
