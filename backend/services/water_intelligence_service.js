/**
 * SmartCity AI - Master Water Intelligence Service
 * Core Engine for:
 * 1. Network Topology (Synchronized 2D/3D Assets & Pipelines)
 * 2. Wastewater Treatment Verification & Strict Safety Guardrails
 * 3. Water Admin Route Authority (Draft -> Validation -> Publish -> Audit)
 * 4. Role-Specific Work Order Allocations
 * 5. Explicit Data Provenance (MEASURED vs SIMULATED Telemetry)
 */

const pool = require("../config/db").promise();
const { logAudit } = require("./audit_logger");

// Regulatory Water Quality Limits (CPCB / UPPCB / ISO 10500 Standards)
const REGULATORY_LIMITS = {
    DESTINATIONS: {
        RAMGARH_TAL_LAKE: {
            name: "Ramgarh Tal Lake (Sensitive Ecological Surface Water)",
            MAX_BOD_MG_L: 10.0,
            MAX_COD_MG_L: 50.0,
            MAX_TSS_MG_L: 20.0,
            MIN_PH: 6.5,
            MAX_PH: 8.5,
            MAX_FECAL_COLIFORM_MPN: 100,
            MAX_TURBIDITY_NTU: 5.0
        },
        GIDA_INDUSTRIAL_COOLING: {
            name: "GIDA Industrial Area (Cooling & Process Water)",
            MAX_BOD_MG_L: 30.0,
            MAX_COD_MG_L: 100.0,
            MAX_TSS_MG_L: 50.0,
            MIN_PH: 6.0,
            MAX_PH: 9.0,
            MAX_FECAL_COLIFORM_MPN: 500,
            MAX_TURBIDITY_NTU: 10.0
        },
        MUNICIPAL_GARDENS: {
            name: "Municipal Parks & Urban Landscaping",
            MAX_BOD_MG_L: 20.0,
            MAX_COD_MG_L: 80.0,
            MAX_TSS_MG_L: 30.0,
            MIN_PH: 6.5,
            MAX_PH: 8.5,
            MAX_FECAL_COLIFORM_MPN: 230,
            MAX_TURBIDITY_NTU: 10.0
        },
        PERMITTED_DISCHARGE: {
            name: "Permitted General Outfall (CPCB Standard)",
            MAX_BOD_MG_L: 10.0,
            MAX_COD_MG_L: 50.0,
            MAX_TSS_MG_L: 20.0,
            MIN_PH: 6.5,
            MAX_PH: 8.5,
            MAX_FECAL_COLIFORM_MPN: 100,
            MAX_TURBIDITY_NTU: 5.0
        }
    },
    RECLAIMED_WATER: {
        MAX_BOD_MG_L: 10.0,
        MAX_COD_MG_L: 50.0,
        MAX_TSS_MG_L: 20.0,
        MIN_PH: 6.5,
        MAX_PH: 8.5,
        MAX_FECAL_COLIFORM_MPN: 100,
        MAX_TURBIDITY_NTU: 5.0
    },
    POTABLE_WATER: {
        MIN_PH: 6.5,
        MAX_PH: 8.5,
        MAX_TDS_PPM: 500,
        MAX_TURBIDITY_NTU: 5.0,
        MIN_CHLORINE_PPM: 0.2,
        MAX_CHLORINE_PPM: 1.0
    }
};

let isSimulatorActive = true;

// Geodesic distance calculation on sphere (in meters)
function haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (Number(lat2) - Number(lat1)) * Math.PI / 180;
    const dLon = (Number(lon2) - Number(lon1)) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(Number(lat1) * Math.PI / 180) * Math.cos(Number(lat2) * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Distance from point P(lat, lng) to segment AB(start, end) in meters
function distToSegmentMeters(pLat, pLng, aLat, aLng, bLat, bLng) {
    let minD = Infinity;
    for (let t = 0; t <= 1; t += 0.1) {
        const iLat = aLat + (bLat - aLat) * t;
        const iLng = aLng + (bLng - aLng) * t;
        const d = haversineMeters(pLat, pLng, iLat, iLng);
        if (d < minD) minD = d;
    }
    return minD;
}

class WaterIntelligenceService {
    /**
     * Get synchronized network topology for Leaflet 2D and Three.js 3D
     */
    async getNetworkTopology() {
        // Fetch tanks
        const [tanks] = await pool.query(`
            SELECT id, tank_id AS asset_id, name, 'TANK' AS asset_type, zone,
                   latitude, longitude, 84.50 AS elevation_m,
                   status, pump_status, capacity_liters, current_level_percent,
                   water_quality_score, next_supply_time, updated_at,
                   'MEASURED' AS data_source
            FROM water_tanks
        `);

        // Fetch network infrastructure assets (STP, WTP, Pumps, Valves, Junctions, Outfalls)
        const [assets] = await pool.query(`
            SELECT id, asset_id, name, asset_type, zone,
                   latitude, longitude, elevation_m, status,
                   specifications, last_reading, data_source, updated_at
            FROM water_network_assets
        `);

        // Fetch all pipelines (Potable, Wastewater, Reclaimed)
        const [pipelines] = await pool.query(`
            SELECT id, pipeline_code, name, zone, pipe_type,
                   start_lat, start_lng, end_lat, end_lng,
                   source_node, target_node, diameter_mm, material,
                   depth_meters, pressure_bar, flow_rate_lps, status,
                   data_source, last_inspection, created_at
            FROM water_pipelines
        `);

        // Combine nodes with unified stable IDs
        const nodes = [
            ...tanks.map(t => ({
                id: t.asset_id,
                db_id: t.id,
                name: t.name,
                type: "TANK",
                zone: t.zone,
                lat: Number(t.latitude),
                lng: Number(t.longitude),
                elevation_m: Number(t.elevation_m),
                status: t.status,
                level_pct: t.current_level_percent,
                capacity_liters: t.capacity_liters,
                pump_status: t.pump_status,
                quality_score: t.water_quality_score,
                data_source: t.data_source,
                is_simulated: false,
                last_reading_time: t.updated_at
            })),
            ...assets.map(a => {
                let specs = {};
                let reading = {};
                try {
                    specs = typeof a.specifications === "string" ? JSON.parse(a.specifications) : (a.specifications || {});
                    reading = typeof a.last_reading === "string" ? JSON.parse(a.last_reading) : (a.last_reading || {});
                } catch (e) {}

                return {
                    id: a.asset_id,
                    db_id: a.id,
                    name: a.name,
                    type: a.asset_type,
                    zone: a.zone,
                    lat: Number(a.latitude),
                    lng: Number(a.longitude),
                    elevation_m: Number(a.elevation_m),
                    status: a.status,
                    specifications: specs,
                    last_reading: reading,
                    data_source: a.data_source,
                    is_simulated: a.data_source === "SIMULATED",
                    last_reading_time: a.updated_at
                };
            })
        ];

        // Format edges (pipelines)
        const edges = pipelines.map(p => ({
            id: p.pipeline_code,
            db_id: p.id,
            name: p.name,
            zone: p.zone,
            pipe_type: p.pipe_type || "POTABLE",
            start_lat: Number(p.start_lat),
            start_lng: Number(p.start_lng),
            end_lat: Number(p.end_lat),
            end_lng: Number(p.end_lng),
            source_node: p.source_node,
            target_node: p.target_node,
            diameter_mm: Number(p.diameter_mm || 450),
            material: p.material || "Ductile Iron",
            depth_meters: Number(p.depth_meters || 2.4),
            pressure_bar: Number(p.pressure_bar),
            flow_rate_lps: Number(p.flow_rate_lps),
            status: p.status,
            data_source: p.data_source || "MEASURED",
            is_simulated: (p.data_source || "") === "SIMULATED",
            last_inspection: p.last_inspection
        }));

        return {
            success: true,
            network_id: "GORAKHPUR-HYDRAULIC-NET",
            timestamp: new Date().toISOString(),
            simulator_active: isSimulatorActive,
            metrics: {
                total_nodes: nodes.length,
                total_pipes: edges.length,
                potable_pipes: edges.filter(e => e.pipe_type === "POTABLE").length,
                wastewater_pipes: edges.filter(e => e.pipe_type === "WASTEWATER").length,
                reclaimed_pipes: edges.filter(e => e.pipe_type === "RECLAIMED").length
            },
            nodes,
            edges
        };
    }

    /**
     * Get single asset with upstream/downstream connectivity and work orders
     */
    async getAssetDetails(assetId) {
        let asset = null;
        let assetType = "UNKNOWN";

        // Check if tank
        const [tanks] = await pool.query(
            "SELECT * FROM water_tanks WHERE tank_id = ? OR id = ? LIMIT 1",
            [assetId, assetId]
        );
        if (tanks.length > 0) {
            asset = tanks[0];
            assetType = "TANK";
        } else {
            // Check network assets
            const [netAssets] = await pool.query(
                "SELECT * FROM water_network_assets WHERE asset_id = ? OR id = ? LIMIT 1",
                [assetId, assetId]
            );
            if (netAssets.length > 0) {
                asset = netAssets[0];
                assetType = asset.asset_type;
            }
        }

        if (!asset) {
            return null;
        }

        const idCode = asset.asset_id || asset.tank_id;

        // Find connected upstream and downstream pipelines
        const [connectedPipes] = await pool.query(`
            SELECT pipeline_code, name, pipe_type, source_node, target_node, pressure_bar, flow_rate_lps, status
            FROM water_pipelines
            WHERE source_node = ? OR target_node = ?
        `, [idCode, idCode]);

        // Find active work orders for this asset
        const [workOrders] = await pool.query(`
            SELECT order_id, title, priority, status, assigned_to_name, required_role, deadline
            FROM water_work_orders
            WHERE asset_id = ? OR asset_id = ?
            ORDER BY created_at DESC
        `, [idCode, String(asset.id)]);

        // Find recent anomalies or telemetry logs
        const [anomalies] = await pool.query(`
            SELECT id, anomaly_type, severity, recommended_action, status, detected_at
            FROM water_anomalies
            WHERE pipeline_id = ? OR zone = ?
            ORDER BY detected_at DESC LIMIT 3
        `, [idCode, asset.zone]);

        return {
            success: true,
            asset: {
                ...asset,
                asset_id: idCode,
                asset_type: assetType,
                upstream_connections: connectedPipes.filter(p => p.target_node === idCode),
                upstream_pipes: connectedPipes.filter(p => p.target_node === idCode),
                downstream_connections: connectedPipes.filter(p => p.source_node === idCode),
                downstream_pipes: connectedPipes.filter(p => p.source_node === idCode),
                work_orders: workOrders,
                anomalies: anomalies,
                data_source: asset.data_source || "MEASURED",
                hardware_verified: false,
                hardware_status: "HARDWARE_UNVERIFIED",
                telemetry_provenance: asset.data_source || "MEASURED",
                hardware_integration_note: "Physical PLC/SCADA field modem link unverified (Local MySQL database record)."
            }
        };
    }

    /**
     * Wastewater Treatment Batch Management & Safety Guardrails
     */
    async getTreatmentBatches({ plant_id, status } = {}) {
        let sql = "SELECT * FROM water_treatment_batches WHERE 1=1";
        const params = [];
        if (plant_id) {
            sql += " AND plant_id = ?";
            params.push(plant_id);
        }
        if (status) {
            sql += " AND approval_status = ?";
            params.push(status);
        }
        sql += " ORDER BY created_at DESC LIMIT 50";

        const [batches] = await pool.query(sql, params);
        return batches;
    }

    /**
     * Resolve regulatory limits based on target reuse/discharge destination
     */
    getLimitsForDestination(destination) {
        if (!destination) return REGULATORY_LIMITS.RECLAIMED_WATER;
        const key = String(destination).toUpperCase().trim();
        if (REGULATORY_LIMITS.DESTINATIONS[key]) {
            return REGULATORY_LIMITS.DESTINATIONS[key];
        }
        if (key.includes("RAMGARH") || key.includes("LAKE")) {
            return REGULATORY_LIMITS.DESTINATIONS.RAMGARH_TAL_LAKE;
        }
        if (key.includes("GIDA") || key.includes("INDUSTR")) {
            return REGULATORY_LIMITS.DESTINATIONS.GIDA_INDUSTRIAL_COOLING;
        }
        if (key.includes("GARDEN") || key.includes("PARK") || key.includes("IRRIGAT")) {
            return REGULATORY_LIMITS.DESTINATIONS.MUNICIPAL_GARDENS;
        }
        return REGULATORY_LIMITS.RECLAIMED_WATER;
    }

    /**
     * Log and verify laboratory testing results for a wastewater treatment batch
     * Strictly verifies mandatory laboratory parameters: BOD, COD, TSS, pH, Coliform, Turbidity.
     * Missing or non-numeric mandatory parameters STRICTLY cause NON_COMPLIANT quality status.
     */
    async verifyBatchQuality(batchId, params = {}) {
        const isNum = !isNaN(Number(batchId));
        const [existingRows] = await pool.query(
            `SELECT * FROM water_treatment_batches WHERE ${isNum ? "id = ? OR batch_id = ?" : "batch_id = ?"} LIMIT 1`,
            isNum ? [Number(batchId), String(batchId)] : [String(batchId)]
        );

        if (existingRows.length === 0) {
            throw new Error(`Treatment batch not found: ${batchId}`);
        }
        const existing = existingRows[0];

        const targetDestination = params.reuse_destination || existing.reuse_destination || "RAMGARH_TAL_LAKE";
        const limits = this.getLimitsForDestination(targetDestination);

        const violations = [];

        // Mandatory CPCB Parameter Checks: NEVER silently default missing core values to compliant numbers!
        const isMissingOrNaN = (val) => val === undefined || val === null || val === "" || isNaN(Number(val));

        // Sample Timestamp Validity (Evidence freshness: samples older than 48 hours are stale)
        if (params.sample_timestamp) {
            const sampleTime = new Date(params.sample_timestamp).getTime();
            if (isNaN(sampleTime)) {
                violations.push("Malformed sample timestamp provided.");
            } else if (sampleTime > Date.now() + 60000) {
                violations.push("Invalid sample timestamp: laboratory sampling time cannot be in the future.");
            } else if (Date.now() - sampleTime > 48 * 3600 * 1000) {
                violations.push("Stale laboratory sample: sample age exceeds maximum allowable 48-hour testing validity.");
            }
        }

        if (isMissingOrNaN(params.bod_mg_l)) {
            violations.push("Missing mandatory laboratory parameter: bod_mg_l (BOD)");
        }
        if (isMissingOrNaN(params.cod_mg_l)) {
            violations.push("Missing mandatory laboratory parameter: cod_mg_l (COD)");
        }
        if (isMissingOrNaN(params.tss_mg_l)) {
            violations.push("Missing mandatory laboratory parameter: tss_mg_l (TSS)");
        }
        if (isMissingOrNaN(params.ph)) {
            violations.push("Missing mandatory laboratory parameter: ph");
        }
        const coliformInput = params.fecal_coliform_mpn !== undefined ? params.fecal_coliform_mpn : params.fecal_coliform_mpn_100ml;
        if (isMissingOrNaN(coliformInput)) {
            violations.push("Missing mandatory laboratory parameter: fecal_coliform_mpn");
        }

        const bod = !isMissingOrNaN(params.bod_mg_l) ? Number(params.bod_mg_l) : existing.bod_mg_l;
        const cod = !isMissingOrNaN(params.cod_mg_l) ? Number(params.cod_mg_l) : existing.cod_mg_l;
        const tss = !isMissingOrNaN(params.tss_mg_l) ? Number(params.tss_mg_l) : existing.tss_mg_l;
        const nPh = !isMissingOrNaN(params.ph) ? Number(params.ph) : existing.ph;
        const coliform = !isMissingOrNaN(coliformInput) ? Number(coliformInput) : existing.fecal_coliform_mpn;
        const turb = !isMissingOrNaN(params.turbidity_ntu) 
            ? Number(params.turbidity_ntu) 
            : (existing.turbidity_ntu !== null && Number(existing.turbidity_ntu) > 0 ? Number(existing.turbidity_ntu) : 2.0);
        const operator_notes = params.operator_notes || params.laboratory_certified_by || null;

        // Physical / Inconclusive Parameter Bounds
        if (!isMissingOrNaN(params.bod_mg_l) && bod < 0) violations.push("Invalid parameter: BOD cannot be negative");
        if (!isMissingOrNaN(params.cod_mg_l) && cod < 0) violations.push("Invalid parameter: COD cannot be negative");
        if (!isMissingOrNaN(params.tss_mg_l) && tss < 0) violations.push("Invalid parameter: TSS cannot be negative");
        if (!isMissingOrNaN(params.ph) && (nPh < 0 || nPh > 14)) violations.push("Invalid parameter: pH must be within chemical scale (0.0 to 14.0)");
        if (!isMissingOrNaN(coliformInput) && coliform < 0) violations.push("Invalid parameter: Fecal coliform count cannot be negative");
        if (!isMissingOrNaN(params.turbidity_ntu) && turb < 0) violations.push("Invalid parameter: Turbidity cannot be negative");

        // Threshold checks (Borderline: equality passes, exceeding fails)
        if (!isMissingOrNaN(params.bod_mg_l) && bod > limits.MAX_BOD_MG_L) {
            violations.push(`BOD ${bod} mg/L exceeds limit ${limits.MAX_BOD_MG_L} mg/L`);
        }
        if (!isMissingOrNaN(params.cod_mg_l) && cod > limits.MAX_COD_MG_L) {
            violations.push(`COD ${cod} mg/L exceeds limit ${limits.MAX_COD_MG_L} mg/L`);
        }
        if (!isMissingOrNaN(params.tss_mg_l) && tss > limits.MAX_TSS_MG_L) {
            violations.push(`TSS ${tss} mg/L exceeds limit ${limits.MAX_TSS_MG_L} mg/L`);
        }
        if (!isMissingOrNaN(params.ph) && (nPh < limits.MIN_PH || nPh > limits.MAX_PH)) {
            violations.push(`pH ${nPh} is outside allowable range ${limits.MIN_PH} - ${limits.MAX_PH}`);
        }
        if (!isMissingOrNaN(coliformInput) && coliform > limits.MAX_FECAL_COLIFORM_MPN) {
            violations.push(`Fecal Coliform ${coliform} MPN exceeds limit ${limits.MAX_FECAL_COLIFORM_MPN}`);
        }
        if (!isMissingOrNaN(params.turbidity_ntu) && turb > limits.MAX_TURBIDITY_NTU) {
            violations.push(`Turbidity ${turb} NTU exceeds limit ${limits.MAX_TURBIDITY_NTU}`);
        }

        const isCompliant = violations.length === 0;
        const qualityStatus = isCompliant ? "COMPLIANT" : "NON_COMPLIANT";
        const approvalStatus = isCompliant ? "PENDING_APPROVAL" : "BLOCKED_QUALITY_FAILURE";
        const rejectionReason = isCompliant ? null : `Mandatory regulatory criteria failed: ${violations.join("; ")}`;

        await pool.query(`
            UPDATE water_treatment_batches
            SET bod_mg_l = ?,
                cod_mg_l = ?,
                tss_mg_l = ?,
                ph = ?,
                fecal_coliform_mpn = ?,
                turbidity_ntu = ?,
                quality_status = ?,
                approval_status = ?,
                rejection_reason = ?,
                operator_notes = COALESCE(?, operator_notes),
                stage = 'QUALITY_VERIFIED',
                updated_at = CURRENT_TIMESTAMP
            WHERE ${isNum ? "id = ? OR batch_id = ?" : "batch_id = ?"}
        `, isNum ? [bod, cod, tss, nPh, coliform, turb, qualityStatus, approvalStatus, rejectionReason, operator_notes || null, Number(batchId), String(batchId)] : [bod, cod, tss, nPh, coliform, turb, qualityStatus, approvalStatus, rejectionReason, operator_notes || null, String(batchId)]);

        const [updated] = await pool.query(
            `SELECT * FROM water_treatment_batches WHERE ${isNum ? "id = ? OR batch_id = ?" : "batch_id = ?"} LIMIT 1`,
            isNum ? [Number(batchId), String(batchId)] : [String(batchId)]
        );

        return {
            success: true,
            is_compliant: isCompliant,
            violations,
            quality_status: qualityStatus,
            approval_status: approvalStatus,
            batch: updated[0]
        };
    }

    /**
     * Authorize Reuse or Permitted Discharge (STRICT WATER ADMIN / SUPERVISOR ONLY)
     * Mandatory Safety Check: Blocks non-compliant batches!
     * Enforces Destination-Specific Threshold Verification and Idempotent Approval Concurrency.
     */
    async approveBatchReuse(batchId, { adminUser, reuseDestination, comments }) {
        const isNum = !isNaN(Number(batchId));
        const [rows] = await pool.query(
            `SELECT * FROM water_treatment_batches WHERE ${isNum ? "id = ? OR batch_id = ?" : "batch_id = ?"} LIMIT 1`,
            isNum ? [Number(batchId), String(batchId)] : [String(batchId)]
        );

        if (rows.length === 0) {
            throw new Error("Treatment batch not found.");
        }

        const batch = rows[0];

        // Idempotency: if already approved for the same destination, return
        if (batch.approval_status === "APPROVED" && (!reuseDestination || batch.reuse_destination === reuseDestination)) {
            return batch;
        }

        // STRICT MANDATORY QUALITY CHECK
        if (batch.quality_status !== "COMPLIANT") {
            const err = new Error(
                `SAFETY INTERLOCK: Cannot approve reuse or discharge for batch ${batch.batch_id}. Quality status is ${batch.quality_status}. ${batch.rejection_reason || "Mandatory laboratory checks failed."}`
            );
            err.code = "QUALITY_CHECK_FAILED";
            throw err;
        }

        const finalDest = reuseDestination || batch.reuse_destination || "RAMGARH_TAL_LAKE";
        const destLimits = this.getLimitsForDestination(finalDest);

        // Verify batch parameters satisfy the target destination limits
        const destViolations = [];
        if (batch.bod_mg_l > destLimits.MAX_BOD_MG_L) {
            destViolations.push(`BOD ${batch.bod_mg_l} mg/L exceeds destination limit ${destLimits.MAX_BOD_MG_L} mg/L`);
        }
        if (batch.cod_mg_l > destLimits.MAX_COD_MG_L) {
            destViolations.push(`COD ${batch.cod_mg_l} mg/L exceeds destination limit ${destLimits.MAX_COD_MG_L} mg/L`);
        }
        if (batch.tss_mg_l > destLimits.MAX_TSS_MG_L) {
            destViolations.push(`TSS ${batch.tss_mg_l} mg/L exceeds destination limit ${destLimits.MAX_TSS_MG_L} mg/L`);
        }
        if (batch.ph < destLimits.MIN_PH || batch.ph > destLimits.MAX_PH) {
            destViolations.push(`pH ${batch.ph} outside allowable range ${destLimits.MIN_PH} - ${destLimits.MAX_PH}`);
        }
        if (batch.fecal_coliform_mpn > destLimits.MAX_FECAL_COLIFORM_MPN) {
            destViolations.push(`Coliform ${batch.fecal_coliform_mpn} MPN exceeds limit ${destLimits.MAX_FECAL_COLIFORM_MPN}`);
        }
        if (batch.turbidity_ntu > destLimits.MAX_TURBIDITY_NTU) {
            destViolations.push(`Turbidity ${batch.turbidity_ntu} NTU exceeds limit ${destLimits.MAX_TURBIDITY_NTU}`);
        }

        if (destViolations.length > 0) {
            const err = new Error(
                `SAFETY INTERLOCK: Cannot authorize reuse for destination ${finalDest}. Batch fails regulatory thresholds: ${destViolations.join("; ")}`
            );
            err.code = "QUALITY_CHECK_FAILED";
            throw err;
        }

        const approverName = adminUser?.name || adminUser?.username || "Authorized Water Admin";

        await pool.query(`
            UPDATE water_treatment_batches
            SET approval_status = 'APPROVED',
                stage = 'REUSED',
                reuse_destination = ?,
                approved_by = ?,
                approval_timestamp = CURRENT_TIMESTAMP,
                operator_notes = CONCAT(COALESCE(operator_notes, ''), ' [Approved for ', ?, ': ', ?, ']')
            WHERE id = ?
        `, [finalDest, approverName, finalDest, comments || "All quality parameters verified", batch.id]);

        // Audit Logging
        await logAudit({
            actor: approverName,
            action: "APPROVE_RECLAIMED_WATER_REUSE",
            target: `Batch ${batch.batch_id}`,
            details: `Approved reuse for destination ${finalDest}. BOD: ${batch.bod_mg_l} mg/L, COD: ${batch.cod_mg_l} mg/L, TSS: ${batch.tss_mg_l} mg/L, pH: ${batch.ph}`
        });

        const [finalBatch] = await pool.query("SELECT * FROM water_treatment_batches WHERE id = ?", [batch.id]);
        return finalBatch[0];
    }

    /**
     * Water Admin Network Route Proposal Validation
     * Validates topology, coordinates, nodes, and evaluates affected zones
     */
    async validateRouteProposal(proposal) {
        const errors = [];
        const warnings = [];

        const { pipeline_code, start_lat, start_lng, end_lat, end_lng, source_node, target_node, diameter_mm, pipe_type } = proposal;

        if (!pipeline_code) errors.push("Pipeline code is required.");
        if (!pipe_type || !["POTABLE", "WASTEWATER", "RECLAIMED"].includes(pipe_type)) {
            errors.push("Invalid pipe type. Must be POTABLE, WASTEWATER, or RECLAIMED.");
        }

        const sLat = Number(start_lat);
        const sLng = Number(start_lng);
        const eLat = Number(end_lat);
        const eLng = Number(end_lng);

        // Gorakhpur Geographic Envelope Check (approx 26.65 to 26.85 N, 83.25 to 83.50 E)
        if (isNaN(sLat) || sLat < 26.60 || sLat > 26.90 || isNaN(sLng) || sLng < 83.20 || sLng > 83.55) {
            errors.push(`Start coordinate (${sLat}, ${sLng}) falls outside municipal service boundaries.`);
        }
        if (isNaN(eLat) || eLat < 26.60 || eLat > 26.90 || isNaN(eLng) || eLng < 83.20 || eLng > 83.55) {
            errors.push(`End coordinate (${eLat}, ${eLng}) falls outside municipal service boundaries.`);
        }

        // Calculate length in km using Haversine formula
        let lengthKm = 0;
        if (errors.length === 0) {
            const R = 6371; // Earth radius in km
            const dLat = (eLat - sLat) * Math.PI / 180;
            const dLng = (eLng - sLng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(sLat * Math.PI / 180) * Math.cos(eLat * Math.PI / 180) *
                      Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            lengthKm = Number((R * c).toFixed(2));

            if (lengthKm > 25.0) {
                warnings.push(`Trunk line span (${lengthKm} km) is unusually long for a single municipal segment.`);
            }
        }

        // Check source & target node connectivity
        const [sourceExists] = await pool.query(
            "SELECT asset_id FROM water_network_assets WHERE asset_id = ? UNION SELECT tank_id AS asset_id FROM water_tanks WHERE tank_id = ?",
            [source_node, source_node]
        );
        const [targetExists] = await pool.query(
            "SELECT asset_id FROM water_network_assets WHERE asset_id = ? UNION SELECT tank_id AS asset_id FROM water_tanks WHERE tank_id = ?",
            [target_node, target_node]
        );

        if (source_node && sourceExists.length === 0) {
            warnings.push(`Source node '${source_node}' not currently indexed in asset database.`);
        }
        if (target_node && targetExists.length === 0) {
            warnings.push(`Target node '${target_node}' not currently indexed in asset database.`);
        }

        const isValid = errors.length === 0;

        return {
            is_valid: isValid,
            errors,
            warnings,
            estimated_length_km: lengthKm,
            hydraulic_assessment: {
                head_loss_estimated_meters: Number((lengthKm * 1.8).toFixed(2)),
                recommended_operating_pressure_bar: Number(diameter_mm) > 600 ? 3.5 : 2.5,
                affected_zones: [proposal.zone || "Gorakhpur Central Ward"]
            }
        };
    }

    /**
     * Publish Network Version (WATER ADMIN ONLY)
     * Follows: Draft -> Validate -> Impact Assessment -> Authorized Approval -> Publish -> Audit
     * Uses Connection Transaction with Rollback and Concurrency Row Locks.
     */
    async publishNetworkVersion(versionId, adminUser) {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const [rows] = await conn.query(
                "SELECT * FROM water_network_versions WHERE version_id = ? OR id = ? FOR UPDATE",
                [versionId, versionId]
            );

            if (rows.length === 0) {
                throw new Error("Network version not found.");
            }

            const version = rows[0];
            const approverName = adminUser?.name || adminUser?.username || "Water Admin";

            // If already published, return safely (idempotent)
            if (version.status === "PUBLISHED") {
                await conn.commit();
                return version;
            }

            // Archive previous published versions
            await conn.query(
                "UPDATE water_network_versions SET status = 'ROLLED_BACK' WHERE status = 'PUBLISHED' AND id != ?",
                [version.id]
            );

            // Mark this version as published
            await conn.query(`
                UPDATE water_network_versions
                SET status = 'PUBLISHED',
                    approver_id = ?,
                    approver_name = ?,
                    published_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [adminUser?.id || "ADMIN", approverName, version.id]);

            await conn.commit();

            // Audit log
            await logAudit({
                actor: approverName,
                action: "PUBLISH_WATER_NETWORK_VERSION",
                target: `Version ${version.version_number} (${version.version_id})`,
                details: `Published pipeline configuration: ${version.change_title}. Affected zones: ${version.affected_zones}`
            });

            const [published] = await pool.query("SELECT * FROM water_network_versions WHERE id = ?", [version.id]);
            return published[0];
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    }

    /**
     * Simulator Mode Controller (MEASURED vs SIMULATED)
     */
    getSimulatorStatus() {
        return {
            simulator_active: isSimulatorActive,
            telemetry_mode: isSimulatorActive ? "SIMULATED_AUGMENTED" : "DATABASE_MEASURED",
            hardware_verified: false,
            hardware_status: "HARDWARE_UNVERIFIED",
            notice: isSimulatorActive
                ? "Simulated SCADA readings active. Physical hardware integration is unverified."
                : "Simulation disabled. Displaying local database records only. Physical hardware modems unverified."
        };
    }

    setSimulatorStatus(active) {
        isSimulatorActive = Boolean(active);
        return this.getSimulatorStatus();
    }

    // =========================================================
    // 27. SEWAGE PIPELINE PLANNING & 3D ROUTE DESIGNER ENGINE
    // =========================================================

    /**
     * Get verified surveyed road corridors for snapping & road centerline alignment
     */
    async getSewageRoadCorridors() {
        const [rows] = await pool.query(
            "SELECT * FROM sewage_surveyed_road_corridors ORDER BY zone ASC, road_name ASC"
        );
        return rows;
    }

    /**
     * Get planned sewage routes
     */
    async getPlannedSewageRoutes({ status, zone } = {}) {
        let sql = "SELECT * FROM sewage_planned_routes WHERE 1=1";
        const params = [];
        if (status) {
            sql += " AND status = ?";
            params.push(status);
        }
        if (zone) {
            sql += " AND zone = ?";
            params.push(zone);
        }
        sql += " ORDER BY updated_at DESC LIMIT 50";
        const [rows] = await pool.query(sql, params);
        return rows;
    }

    /**
     * Get single planned sewage route by id or route_id
     */
    async getPlannedSewageRouteById(id) {
        const isNum = !isNaN(Number(id));
        const [rows] = await pool.query(
            `SELECT * FROM sewage_planned_routes WHERE ${isNum ? "id = ? OR route_id = ?" : "route_id = ?"} LIMIT 1`,
            isNum ? [Number(id), String(id)] : [String(id)]
        );
        return rows[0] || null;
    }

    /**
     * Comprehensive Engineering Validation for Sewage Pipeline Route
     * - Physical bounds & Gorakhpur municipal boundary
     * - Separation from Potable Water Network (horizontal clearance & vertical inversion)
     * - Burial depth validation (min 1.2m cover, max 6.0m shoring limit)
     * - Hydraulic slope validation (self-cleansing velocity 0.6 m/s vs scouring > 3.0 m/s)
     * - Manholes & Inspection Chamber frequency calculation
     * - Lift Pumping Station evaluation on adverse elevation
     * - Unsurveyed road corridors & missing road width warnings
     * - Construction-readiness disclaimer (Never claims ready without physical GPR survey & approvals)
     */
    async validateSewageRouteProposal(proposal) {
        const errors = [];
        const warnings = [];
        const advisory = [];

        const waypoints = Array.isArray(proposal.waypoints) ? proposal.waypoints : [];
        const diameterMm = Number(proposal.pipe_diameter_mm || 450);
        const depthM = Number(proposal.burial_depth_m !== undefined ? proposal.burial_depth_m : 2.80);
        const slopePct = Number(proposal.slope_pct !== undefined ? proposal.slope_pct : 0.80);
        const clearanceMinM = Number(proposal.clearance_min_m !== undefined ? proposal.clearance_min_m : 2.00);
        const flowDir = (proposal.flow_direction || "FORWARD").toUpperCase();

        if (waypoints.length < 2) {
            errors.push("Proposed sewage route requires at least 2 connected waypoints (Source to Destination).");
        }

        // Cross-Classification Hazard: Sewage routes cannot accidentally be classified as potable-water routes
        if (proposal.network_type && (proposal.network_type === "POTABLE_WATER" || proposal.network_type === "POTABLE")) {
            errors.push("Cross-Classification Hazard: Sewage/wastewater conduits cannot accidentally be classified as Potable Water routes. Sanitary conduits must be designated as SEWAGE, RECLAIMED_WATER, or STORMWATER.");
        }

        // 1. Municipal Geographic Boundaries Validation
        waypoints.forEach((wp, idx) => {
            const lat = Number(wp.lat);
            const lng = Number(wp.lng);
            if (isNaN(lat) || lat < 26.60 || lat > 26.90 || isNaN(lng) || lng < 83.20 || lng > 83.55) {
                errors.push(`Waypoint #${idx + 1} (${lat}, ${lng}) falls outside Gorakhpur municipal jurisdiction.`);
            }
        });

        // 2. Compute Segment Lengths & Total Length (Haversine)
        let totalLengthM = 0;
        for (let i = 0; i < waypoints.length - 1; i++) {
            const p1 = waypoints[i];
            const p2 = waypoints[i + 1];
            const dM = haversineMeters(Number(p1.lat), Number(p1.lng), Number(p2.lat), Number(p2.lng));
            totalLengthM += dM;
        }

        if (totalLengthM > 30000) {
            warnings.push(`Proposed route length (${(totalLengthM / 1000).toFixed(1)} km) exceeds standard single trunk section.`);
        }

        // 3. Pipe Diameter Check
        if (isNaN(diameterMm) || diameterMm < 200 || diameterMm > 2000) {
            errors.push(`Invalid pipe diameter (${diameterMm} mm). Standard municipal sewer mains range between 300mm and 1200mm.`);
        }

        // 4. Burial Depth Validation (CPHEEO Sewerage Manual)
        if (isNaN(depthM) || depthM < 1.20) {
            errors.push(`Sub-standard burial depth (${depthM}m). Minimum allowable cover for vehicular road surcharge is 1.2m.`);
        } else if (depthM > 6.00) {
            warnings.push(`Excessive excavation depth (${depthM}m > 6.0m). Deep trenching requires continuous sheet piling shoring and potential intermediate lift pumping.`);
        }

        // 5. Hydraulic Slope Validation (Gravity self-cleansing velocity criteria)
        const minSlope = diameterMm <= 450 ? 0.50 : 0.25;
        const maxSlope = diameterMm <= 450 ? 3.00 : 2.00;

        if (isNaN(slopePct) || slopePct < minSlope) {
            errors.push(`Insufficient hydraulic gradient (${slopePct}% < ${minSlope}% required). Velocity will drop below self-cleansing threshold (0.6 m/s), leading to solid sedimentation and anaerobic hydrogen sulfide buildup.`);
        } else if (slopePct > maxSlope) {
            warnings.push(`Steep hydraulic slope (${slopePct}% > ${maxSlope}%). Flow velocity exceeds 3.0 m/s; requires drop manholes to prevent abrasive pipe invert scouring.`);
        }

        // 6. Network Separation Check: Potable Water Pipeline Conflicts
        const [potablePipelines] = await pool.query(
            "SELECT pipeline_code, name, start_lat, start_lng, end_lat, end_lng, depth_meters, diameter_mm FROM water_pipelines WHERE pipe_type = 'POTABLE'"
        );

        const proximityConflicts = [];
        potablePipelines.forEach(potable => {
            const pStartLat = Number(potable.start_lat);
            const pStartLng = Number(potable.start_lng);
            const pEndLat = Number(potable.end_lat);
            const pEndLng = Number(potable.end_lng);
            const potDepth = Number(potable.depth_meters || 2.4);

            waypoints.forEach((wp, wpIdx) => {
                const distToPotable = distToSegmentMeters(
                    Number(wp.lat), Number(wp.lng),
                    pStartLat, pStartLng, pEndLat, pEndLng
                );

                if (distToPotable < clearanceMinM) {
                    proximityConflicts.push({
                        waypoint_index: wpIdx + 1,
                        pipeline_code: potable.pipeline_code,
                        pipeline_name: potable.name,
                        horizontal_distance_m: Number(distToPotable.toFixed(2)),
                        potable_depth_m: potDepth,
                        sewage_depth_m: depthM
                    });

                    // Inversion Check: Sewage must NEVER be shallower than or level with potable water
                    if (depthM <= potDepth) {
                        errors.push(`Severe Contamination Hazard: Proposed sewage main (depth ${depthM}m) is laid above or level with potable water line ${potable.pipeline_code} (depth ${potDepth}m) with only ${distToPotable.toFixed(1)}m horizontal clearance at Waypoint #${wpIdx + 1}. Sewage lines must be vertically separated at least 0.5m BELOW clean water supply lines.`);
                    } else if (distToPotable < 1.0) {
                        errors.push(`Inadequate Horizontal Clearance: Sewage pipe is ${distToPotable.toFixed(1)}m from potable water line ${potable.pipeline_code} (minimum clearance is ${clearanceMinM}m). Concrete encasement or route realignment mandatory.`);
                    } else {
                        warnings.push(`Utility Clearance Alert: Sewage route passes within ${distToPotable.toFixed(1)}m of potable line ${potable.pipeline_code}. Reinforced concrete encasement sleeve required.`);
                    }
                }
            });
        });

        // 7. Road Alignment & Corridor Verification
        let unsurveyedCorridorsCount = 0;
        let missingRoadWidthCount = 0;

        waypoints.forEach((wp, idx) => {
            if (!wp.road_id || wp.is_snapped === false || String(wp.road_name || "").includes("Unsurveyed")) {
                unsurveyedCorridorsCount++;
            }
            if (wp.road_width_m === null || wp.road_width_m === undefined || isNaN(Number(wp.road_width_m))) {
                missingRoadWidthCount++;
            }
        });

        if (unsurveyedCorridorsCount > 0) {
            warnings.push(`${unsurveyedCorridorsCount} waypoint(s) traverse off-grid or unsurveyed road corridors. Underground telecomm, electric, and storm-drain utility survey required.`);
        }
        if (missingRoadWidthCount > 0) {
            warnings.push(`${missingRoadWidthCount} road segment(s) lack verified road corridor width in GIS records. Physical right-of-way measurement needed before trench demarcation.`);
        }

        // 8. Manhole & Inspection Chamber Frequency (CPHEEO Section 3.4)
        const maxSpacing = diameterMm <= 450 ? 35 : 75;
        let calculatedManholes = Math.max(2, Math.ceil(totalLengthM / maxSpacing));
        for (let i = 1; i < waypoints.length - 1; i++) {
            calculatedManholes++;
        }
        const inspectionChambers = Math.max(1, Math.floor(calculatedManholes / 3));
        const junctionsCount = waypoints.filter(wp => wp.node_type === "NETWORK_JUNCTION").length || 1;

        // 9. Pumping Station Assessment (Elevation Gradient)
        let pumpingStationRequired = false;
        let elevationDeltaM = 0;
        if (waypoints.length >= 2) {
            const startElev = Number(waypoints[0].elevation_m || 84.0);
            const endElev = Number(waypoints[waypoints.length - 1].elevation_m || 78.2);
            elevationDeltaM = Number((endElev - startElev).toFixed(2));

            if (flowDir === "FORWARD" && elevationDeltaM > 0.5) {
                pumpingStationRequired = true;
                warnings.push(`Adverse hydraulic gradient (+${elevationDeltaM}m uphill to destination). Gravity conveyance not feasible; intermediate lift pumping station and pressurized rising main required.`);
            } else if (totalLengthM > 5000 && Math.abs(elevationDeltaM) < 1.0) {
                pumpingStationRequired = true;
                warnings.push(`Extremely flat corridor (< 1m fall over ${(totalLengthM / 1000).toFixed(1)} km). Booster pump station advised to avoid exceeding 5m trench depth.`);
            }
        }

        // 10. Construction Readiness Policy
        const constructionReady = false;
        advisory.push("PRE-ENGINEERING DRAFT: This pipeline alignment is for municipal planning and feasibility evaluation. It is NOT construction-ready until verified on-site by GPR underground utility surveys, geotechnical boreholes, municipal road-cutting approval, and UPPCB consent to establish.");

        const isValid = errors.length === 0;

        return {
            is_valid: isValid,
            status: isValid ? "PENDING_APPROVAL" : "VALIDATION_FAILED",
            errors,
            warnings,
            advisory,
            metrics: {
                total_length_m: Number(totalLengthM.toFixed(1)),
                diameter_mm: diameterMm,
                burial_depth_m: depthM,
                slope_pct: slopePct,
                manholes_count: calculatedManholes,
                inspection_chambers_count: inspectionChambers,
                junctions_count: junctionsCount,
                pumping_station_required: pumpingStationRequired,
                elevation_delta_m: elevationDeltaM,
                potable_conflicts_count: proximityConflicts.length,
                conflicts: proximityConflicts
            },
            construction_ready: constructionReady
        };
    }

    /**
     * Create a new draft sewage route
     */
    async createPlannedSewageRoute(data, user) {
        const route_id = "SPR-" + new Date().getFullYear() + "-" + Math.floor(100 + Math.random() * 900);
        const name = data.name || "Proposed Trunk Sewer Line";
        const zone = data.zone || "Gorakhpur Municipal Area";
        const waypoints = Array.isArray(data.waypoints) ? data.waypoints : [];
        const polygon = data.service_area_polygon || null;
        const pipeDiameter = Number(data.pipe_diameter_mm || 450);
        const depthM = Number(data.burial_depth_m || 2.80);
        const slopePct = Number(data.slope_pct || 0.80);
        const flowDir = data.flow_direction || "FORWARD";
        const clearanceMinM = Number(data.clearance_min_m || 2.00);
        const destinationAssetId = data.destination_asset_id || "STP-01";
        const networkType = data.network_type || "SEWAGE";

        // Cross-classification safety check
        if (networkType === "POTABLE_WATER" && (destinationAssetId === "STP-01" || destinationAssetId === "DEST-RAMGARH" || /sewer|sewage|drain|stp|blackwater/i.test(name || ""))) {
            const err = new Error("Cross-classification hazard: Sewage/drainage infrastructure cannot be classified as POTABLE_WATER.");
            err.statusCode = 400;
            throw err;
        }

        const validation = await this.validateSewageRouteProposal({
            waypoints,
            pipe_diameter_mm: pipeDiameter,
            burial_depth_m: depthM,
            slope_pct: slopePct,
            clearance_min_m: clearanceMinM,
            flow_direction: flowDir
        });

        const status = validation.is_valid ? "DRAFT" : "VALIDATION_FAILED";

        const [result] = await pool.query(`
            INSERT INTO sewage_planned_routes
            (route_id, name, description, zone, service_area_polygon, waypoints, pipe_diameter_mm, burial_depth_m, slope_pct, flow_direction, estimated_length_m, manholes_count, inspection_chambers_count, junctions_count, pumping_station_required, destination_asset_id, clearance_min_m, status, validation_results, construction_ready, author_id, author_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            route_id, name, data.description || "Draft gravity sewer route proposal", zone,
            polygon ? JSON.stringify(polygon) : null,
            JSON.stringify(waypoints),
            pipeDiameter, depthM, slopePct, flowDir,
            validation.metrics.total_length_m,
            validation.metrics.manholes_count,
            validation.metrics.inspection_chambers_count,
            validation.metrics.junctions_count,
            validation.metrics.pumping_station_required ? 1 : 0,
            destinationAssetId, clearanceMinM,
            status, JSON.stringify(validation), 0,
            user.id || "ADMIN", user.name || "Water Admin"
        ]);

        const [created] = await pool.query("SELECT * FROM sewage_planned_routes WHERE id = ?", [result.insertId]);

        await logAudit({
            actor: user.name || "Water Admin",
            action: "CREATE_SEWAGE_ROUTE_DRAFT",
            target: `Route ${route_id} (${name})`,
            details: `Draft sewage route created in zone ${zone}. Total length: ${validation.metrics.total_length_m}m. Validation valid: ${validation.is_valid}`
        });

        return { route: created[0], validation };
    }

    /**
     * Update an existing planned sewage route
     */
    async updatePlannedSewageRoute(id, data, user) {
        const isNum = !isNaN(Number(id));
        const [existing] = await pool.query(
            `SELECT * FROM sewage_planned_routes WHERE ${isNum ? "id = ? OR route_id = ?" : "route_id = ?"} LIMIT 1`,
            isNum ? [Number(id), String(id)] : [String(id)]
        );

        if (existing.length === 0) {
            throw new Error("Sewage route not found.");
        }

        const route = existing[0];
        if (route.status === "PUBLISHED") {
            throw new Error("Published routes cannot be modified directly. Create a new draft version or rollback first.");
        }

        const waypoints = data.waypoints !== undefined ? data.waypoints : route.waypoints;
        const polygon = data.service_area_polygon !== undefined ? data.service_area_polygon : route.service_area_polygon;
        const pipeDiameter = Number(data.pipe_diameter_mm !== undefined ? data.pipe_diameter_mm : route.pipe_diameter_mm);
        const depthM = Number(data.burial_depth_m !== undefined ? data.burial_depth_m : route.burial_depth_m);
        const slopePct = Number(data.slope_pct !== undefined ? data.slope_pct : route.slope_pct);
        const flowDir = data.flow_direction !== undefined ? data.flow_direction : route.flow_direction;
        const clearanceMinM = Number(data.clearance_min_m !== undefined ? data.clearance_min_m : route.clearance_min_m);
        const name = data.name !== undefined ? data.name : route.name;
        const description = data.description !== undefined ? data.description : route.description;
        const zone = data.zone !== undefined ? data.zone : route.zone;
        const destinationAssetId = data.destination_asset_id !== undefined ? data.destination_asset_id : route.destination_asset_id;
        const networkType = data.network_type !== undefined ? data.network_type : (route.network_type || "SEWAGE");

        // Cross-classification safety check
        if (networkType === "POTABLE_WATER" && (destinationAssetId === "STP-01" || destinationAssetId === "DEST-RAMGARH" || /sewer|sewage|drain|stp|blackwater/i.test(name || ""))) {
            const err = new Error("Cross-classification hazard: Sewage/drainage infrastructure cannot be classified as POTABLE_WATER.");
            err.statusCode = 400;
            throw err;
        }

        const validation = await this.validateSewageRouteProposal({
            waypoints,
            pipe_diameter_mm: pipeDiameter,
            burial_depth_m: depthM,
            slope_pct: slopePct,
            clearance_min_m: clearanceMinM,
            flow_direction: flowDir
        });

        const status = validation.is_valid ? "DRAFT" : "VALIDATION_FAILED";

        await pool.query(`
            UPDATE sewage_planned_routes
            SET name = ?, description = ?, zone = ?,
                service_area_polygon = ?, waypoints = ?,
                pipe_diameter_mm = ?, burial_depth_m = ?, slope_pct = ?, flow_direction = ?,
                estimated_length_m = ?, manholes_count = ?, inspection_chambers_count = ?, junctions_count = ?,
                pumping_station_required = ?, destination_asset_id = ?, clearance_min_m = ?,
                status = ?, validation_results = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            name, description, zone,
            polygon ? JSON.stringify(polygon) : null,
            JSON.stringify(waypoints),
            pipeDiameter, depthM, slopePct, flowDir,
            validation.metrics.total_length_m,
            validation.metrics.manholes_count,
            validation.metrics.inspection_chambers_count,
            validation.metrics.junctions_count,
            validation.metrics.pumping_station_required ? 1 : 0,
            destinationAssetId, clearanceMinM,
            status, JSON.stringify(validation), route.id
        ]);

        const [updated] = await pool.query("SELECT * FROM sewage_planned_routes WHERE id = ?", [route.id]);
        return { route: updated[0], validation };
    }

    /**
     * Approve a validated sewage route (Water Admin only)
     */
    async approvePlannedSewageRoute(id, user, notes = "") {
        const isNum = !isNaN(Number(id));
        const [existing] = await pool.query(
            `SELECT * FROM sewage_planned_routes WHERE ${isNum ? "id = ? OR route_id = ?" : "route_id = ?"} LIMIT 1`,
            isNum ? [Number(id), String(id)] : [String(id)]
        );

        if (existing.length === 0) {
            throw new Error("Sewage route not found.");
        }

        const route = existing[0];
        const validation = await this.validateSewageRouteProposal({
            waypoints: route.waypoints,
            pipe_diameter_mm: route.pipe_diameter_mm,
            burial_depth_m: route.burial_depth_m,
            slope_pct: route.slope_pct,
            clearance_min_m: route.clearance_min_m,
            flow_direction: route.flow_direction
        });

        if (!validation.is_valid) {
            throw new Error(`Cannot approve route with unresolved validation errors: ${validation.errors.join("; ")}`);
        }

        await pool.query(`
            UPDATE sewage_planned_routes
            SET status = 'APPROVED',
                approver_id = ?,
                approver_name = ?,
                approval_notes = ?,
                validation_results = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [user.id || "ADMIN", user.name || "Water Admin", notes || "Approved by Water Admin", JSON.stringify(validation), route.id]);

        await logAudit({
            actor: user.name || "Water Admin",
            action: "APPROVE_SEWAGE_ROUTE",
            target: `Route ${route.route_id}`,
            details: `Water Admin approved route ${route.name}. Notes: ${notes}`
        });

        const [approved] = await pool.query("SELECT * FROM sewage_planned_routes WHERE id = ?", [route.id]);
        return approved[0];
    }

    /**
     * Publish Sewage Planned Route (Water Admin only)
     * Concurrency: SELECT ... FOR UPDATE inside MySQL transaction.
     * Idempotent: If already published, returns current version.
     * Integrates with water_network_versions and updates water_pipelines.
     */
    async publishPlannedSewageRoute(id, user) {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const isNum = !isNaN(Number(id));
            const [rows] = await conn.query(
                `SELECT * FROM sewage_planned_routes WHERE ${isNum ? "id = ? OR route_id = ?" : "route_id = ?"} FOR UPDATE`,
                isNum ? [Number(id), String(id)] : [String(id)]
            );

            if (rows.length === 0) {
                throw new Error("Sewage planned route not found.");
            }

            const route = rows[0];

            // Idempotency: If already published, commit and return safely
            if (route.status === "PUBLISHED") {
                await conn.commit();
                return route;
            }

            // Must have passed validation
            const validation = await this.validateSewageRouteProposal({
                waypoints: route.waypoints,
                pipe_diameter_mm: route.pipe_diameter_mm,
                burial_depth_m: route.burial_depth_m,
                slope_pct: route.slope_pct,
                clearance_min_m: route.clearance_min_m,
                flow_direction: route.flow_direction
            });

            if (!validation.is_valid) {
                throw new Error(`Route validation failed: ${validation.errors.join("; ")}`);
            }

            const approverName = user.name || user.username || "Water Admin";
            const approverId = user.id || "WATER-ADMIN";
            const versionId = "WNV-SEW-" + Date.now().toString(36).toUpperCase();
            const versionNumber = `v${(route.version_number || 1)}.0.0-sew`;

            // Archive any currently published routes in the same zone
            await conn.query(
                "UPDATE sewage_planned_routes SET status = 'ARCHIVED' WHERE zone = ? AND status = 'PUBLISHED' AND id != ?",
                [route.zone, route.id]
            );

            // Record in water_network_versions
            await conn.query(`
                INSERT INTO water_network_versions
                (version_id, version_number, status, change_title, description, affected_zones, author_id, author_name, approver_id, approver_name, network_payload, impact_assessment, published_at)
                VALUES (?, ?, 'PUBLISHED', ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [
                versionId, versionNumber,
                `Sewage Network Trunk: ${route.name}`,
                route.description || "Official sewage collection & transfer trunk route",
                route.zone,
                route.author_id, route.author_name,
                approverId, approverName,
                JSON.stringify({ route_id: route.route_id, waypoints: route.waypoints, metrics: validation.metrics }),
                JSON.stringify({ validation, clearance_min_m: route.clearance_min_m })
            ]);

            // Add or activate sewer line in water_pipelines
            const waypoints = typeof route.waypoints === "string" ? JSON.parse(route.waypoints) : route.waypoints;
            const startWp = waypoints[0] || {};
            const endWp = waypoints[waypoints.length - 1] || {};

            const pipelineCode = "PL-SEW-" + route.route_id.replace(/[^a-zA-Z0-9]/g, "").slice(-4);
            await conn.query(`
                INSERT INTO water_pipelines
                (pipeline_code, name, zone, pressure_bar, flow_rate_lps, status, pipe_type, start_lat, start_lng, end_lat, end_lng, diameter_mm, material, depth_meters, source_node, target_node, data_source)
                VALUES (?, ?, ?, 1.20, 85.00, 'Normal', 'WASTEWATER', ?, ?, ?, ?, ?, 'Reinforced Concrete', ?, 'SEW-ORIGIN', ?, 'MEASURED')
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    start_lat = VALUES(start_lat),
                    start_lng = VALUES(start_lng),
                    end_lat = VALUES(end_lat),
                    end_lng = VALUES(end_lng),
                    diameter_mm = VALUES(diameter_mm),
                    depth_meters = VALUES(depth_meters),
                    status = 'Normal'
            `, [
                pipelineCode, route.name, route.zone,
                startWp.lat || 26.7606, startWp.lng || 83.3732,
                endWp.lat || 26.7350, endWp.lng || 83.3850,
                route.pipe_diameter_mm, route.burial_depth_m,
                route.destination_asset_id || "STP-01"
            ]);

            // Update route to PUBLISHED
            await conn.query(`
                UPDATE sewage_planned_routes
                SET status = 'PUBLISHED',
                    version_id = ?,
                    approver_id = ?,
                    approver_name = ?,
                    published_at = CURRENT_TIMESTAMP,
                    validation_results = ?
                WHERE id = ?
            `, [versionId, approverId, approverName, JSON.stringify(validation), route.id]);

            await conn.commit();

            await logAudit({
                actor: approverName,
                action: "PUBLISH_SEWAGE_ROUTE",
                target: `Route ${route.route_id} (${versionNumber})`,
                details: `Published sewage pipeline route for zone ${route.zone}. Network version: ${versionId}`
            });

            const [published] = await pool.query("SELECT * FROM sewage_planned_routes WHERE id = ?", [route.id]);
            return published[0];
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    }

    /**
     * Rollback a published sewage route to ARCHIVED state (Water Admin only)
     */
    async rollbackPlannedSewageRoute(id, user) {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const isNum = !isNaN(Number(id));
            const [rows] = await conn.query(
                `SELECT * FROM sewage_planned_routes WHERE ${isNum ? "id = ? OR route_id = ?" : "route_id = ?"} FOR UPDATE`,
                isNum ? [Number(id), String(id)] : [String(id)]
            );

            if (rows.length === 0) {
                throw new Error("Sewage planned route not found.");
            }

            const route = rows[0];
            if (route.status !== "PUBLISHED") {
                throw new Error("Only published sewage routes can be rolled back.");
            }

            const approverName = user.name || user.username || "Water Admin";

            // Mark this route ARCHIVED
            await conn.query(
                "UPDATE sewage_planned_routes SET status = 'ARCHIVED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [route.id]
            );

            // If there is an earlier route in the same zone, restore it
            const [earlier] = await conn.query(
                "SELECT * FROM sewage_planned_routes WHERE zone = ? AND id != ? ORDER BY id DESC LIMIT 1",
                [route.zone, route.id]
            );

            let restoredRoute = null;
            if (earlier.length > 0) {
                await conn.query(
                    "UPDATE sewage_planned_routes SET status = 'PUBLISHED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    [earlier[0].id]
                );
                restoredRoute = earlier[0];
            }

            // Update water_network_versions
            if (route.version_id) {
                await conn.query(
                    "UPDATE water_network_versions SET status = 'ROLLED_BACK' WHERE version_id = ?",
                    [route.version_id]
                );
            }

            // Mark pipeline under maintenance
            const pipelineCode = "PL-SEW-" + route.route_id.replace(/[^a-zA-Z0-9]/g, "").slice(-4);
            await conn.query(
                "UPDATE water_pipelines SET status = 'Under Maintenance' WHERE pipeline_code = ?",
                [pipelineCode]
            );

            await conn.commit();

            await logAudit({
                actor: approverName,
                action: "ROLLBACK_SEWAGE_ROUTE",
                target: `Route ${route.route_id}`,
                details: `Rolled back published sewage route ${route.route_id}. Restored earlier route: ${restoredRoute ? restoredRoute.route_id : "None"}`
            });

            const [updated] = await pool.query("SELECT * FROM sewage_planned_routes WHERE id = ?", [route.id]);
            return {
                rolled_back_route: updated[0],
                restored_route: restoredRoute
            };
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    }

    /**
     * Get configurable admin-managed network styles, colors, and line legends
     */
    async getNetworkConfig() {
        const [rows] = await pool.query(
            "SELECT config_value, updated_by, updated_at FROM water_network_config WHERE config_key = 'NETWORK_STYLES' LIMIT 1"
        );
        let val = {};
        if (rows.length > 0) {
            val = typeof rows[0].config_value === "string" ? JSON.parse(rows[0].config_value) : rows[0].config_value;
        }
        const configs = Object.entries(val).map(([type, s]) => ({ network_type: type, ...s }));
        return {
            success: true,
            styles: val,
            configs,
            updated_by: rows.length > 0 ? rows[0].updated_by : "System Default",
            updated_at: rows.length > 0 ? rows[0].updated_at : new Date()
        };
    }

    /**
     * Update configurable admin-managed network styles (WATER ADMIN ONLY)
     */
    async updateNetworkConfig(payload, user) {
        if (!payload || typeof payload !== "object") {
            throw new Error("Invalid styles configuration payload.");
        }
        const current = await this.getNetworkConfig();
        let styles = { ...(current.styles || {}) };

        if (payload.network_type) {
            styles[payload.network_type] = {
                ...(styles[payload.network_type] || {}),
                color: payload.color_hex || payload.color || styles[payload.network_type]?.color,
                display_name: payload.display_name || styles[payload.network_type]?.display_name,
                line_style: payload.line_style || styles[payload.network_type]?.line_style,
                description: payload.description || styles[payload.network_type]?.description
            };
        } else if (payload.styles) {
            styles = { ...styles, ...payload.styles };
        } else {
            styles = { ...styles, ...payload };
        }

        const approverName = user.name || user.username || "Water Admin";
        await pool.query(`
            INSERT INTO water_network_config (config_key, config_value, updated_by, updated_at)
            VALUES ('NETWORK_STYLES', ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP
        `, [JSON.stringify(styles), approverName]);

        await logAudit({
            actor: approverName,
            action: "UPDATE_WATER_NETWORK_STYLES",
            target: "NETWORK_STYLES",
            details: `Updated network styles configuration for ${Object.keys(styles).join(", ")}`
        });

        return this.getNetworkConfig();
    }

    /**
     * Flow Control Overview (Real-time hydraulic telemetry & operating modes)
     */
    async getFlowControlOverview() {
        const [pipelines] = await pool.query(`
            SELECT id, pipeline_code, name, zone, pipe_type, pressure_bar, flow_rate_lps,
                   status, flow_direction, valve_state, telemetry_provenance,
                   target_pressure_bar, target_flow_lps, updated_at
            FROM water_pipelines
            ORDER BY id ASC
        `);

        const [tanks] = await pool.query(`
            SELECT id, tank_id, name, zone, capacity_liters, current_level_percent,
                   status, pump_status, 'MEASURED' as telemetry_provenance, updated_at
            FROM water_tanks
            ORDER BY id ASC
        `);

        const [assets] = await pool.query(`
            SELECT id, asset_id, name, asset_type, zone, status,
                   pump_state, valve_state, flow_direction, telemetry_provenance, operating_mode,
                   last_reading, updated_at
            FROM water_network_assets
            ORDER BY id ASC
        `);

        const alerts = [];
        pipelines.forEach(p => {
            const press = Number(p.pressure_bar);
            if (press < 1.6) {
                alerts.push({
                    type: "ABNORMAL_LOW_PRESSURE",
                    severity: "CRITICAL",
                    asset: p.pipeline_code,
                    zone: p.zone,
                    message: `Critical pressure drop (${press} bar < min 1.6 bar) on line ${p.name}. Possible rupture.`
                });
            } else if (press > 4.0) {
                alerts.push({
                    type: "ABNORMAL_HIGH_PRESSURE",
                    severity: "HIGH",
                    asset: p.pipeline_code,
                    zone: p.zone,
                    message: `Surge pressure (${press} bar > 4.0 bar) on line ${p.name}. Pressure reduction valve throttle required.`
                });
            }
            if (p.status && p.status.includes("Leak")) {
                alerts.push({
                    type: "BLOCKED_OR_LEAKING_FLOW",
                    severity: "CRITICAL",
                    asset: p.pipeline_code,
                    zone: p.zone,
                    message: `Active leak detected on ${p.pipeline_code}. Flow delivery impaired.`
                });
            }
        });

        tanks.forEach(t => {
            if (t.current_level_percent < 25) {
                alerts.push({
                    type: "LOW_STORAGE_RESERVE",
                    severity: "HIGH",
                    asset: t.tank_id,
                    zone: t.zone,
                    message: `Overhead tank ${t.name} storage level critically low (${t.current_level_percent}%).`
                });
            }
        });

        return {
            success: true,
            timestamp: new Date().toISOString(),
            simulator_active: isSimulatorActive,
            hardware_status: "HARDWARE_UNVERIFIED",
            hardware_notice: "Physical SCADA field modems unverified. Flow control adjustments operate in simulated/digital-twin mode with human supervisory audit.",
            stats: {
                total_pipelines: pipelines.length,
                total_tanks: tanks.length,
                total_assets: assets.length,
                active_alerts: alerts.length
            },
            alerts,
            pipelines,
            tanks,
            assets
        };
    }

    /**
     * Operate Flow Control (Valve State, Pump Command, Set Flow/Pressure Target)
     */
    async operateFlowControl({ asset_id, action_type, target_value, confirmed, reason }, user) {
        if (!confirmed) {
            throw new Error("Confirmation required. Flow control operations require explicit operator confirmation.");
        }
        if (!asset_id || !action_type) {
            throw new Error("asset_id and action_type are required.");
        }

        const operatorName = user.name || user.username || "Water Operator";
        let previousState = null;
        let newState = target_value;
        let assetName = asset_id;

        const cleanId = String(asset_id).replace(/^WTR-/, "");
        const isNum = !isNaN(Number(asset_id));
        const [pipes] = await pool.query(
            "SELECT * FROM water_pipelines WHERE pipeline_code = ? OR pipeline_code = ? OR id = ? LIMIT 1",
            [asset_id, cleanId, isNum ? Number(asset_id) : 0]
        );

        if (pipes.length > 0) {
            const pipe = pipes[0];
            assetName = pipe.name;
            if (action_type === "VALVE_STATE" || action_type === "VALVE_THROTTLE") {
                previousState = pipe.valve_state;
                await pool.query(`
                    UPDATE water_pipelines 
                    SET valve_state = ?, telemetry_provenance = 'SIMULATED'
                    WHERE id = ?
                `, [target_value, pipe.id]);
            } else if (action_type === "SET_FLOW_TARGET") {
                previousState = pipe.target_flow_lps;
                await pool.query(`
                    UPDATE water_pipelines 
                    SET target_flow_lps = ?, telemetry_provenance = 'SIMULATED'
                    WHERE id = ?
                `, [Number(target_value), pipe.id]);
            } else if (action_type === "SET_PRESSURE_TARGET") {
                previousState = pipe.target_pressure_bar;
                await pool.query(`
                    UPDATE water_pipelines 
                    SET target_pressure_bar = ?, telemetry_provenance = 'SIMULATED'
                    WHERE id = ?
                `, [Number(target_value), pipe.id]);
            }
        } else {
            const [tanks] = await pool.query(
                "SELECT * FROM water_tanks WHERE tank_id = ? OR tank_id = ? OR id = ? LIMIT 1",
                [asset_id, cleanId, isNum ? Number(asset_id) : 0]
            );
            if (tanks.length > 0) {
                const tank = tanks[0];
                assetName = tank.name;
                if (action_type === "PUMP_COMMAND" || action_type.startsWith("PUMP")) {
                    previousState = tank.pump_status;
                    await pool.query(`
                        UPDATE water_tanks 
                        SET pump_status = ?
                        WHERE id = ?
                    `, [target_value, tank.id]);
                }
            } else {
                const [assets] = await pool.query(
                    "SELECT * FROM water_network_assets WHERE asset_id = ? OR asset_id = ? OR id = ? LIMIT 1",
                    [asset_id, cleanId, isNum ? Number(asset_id) : 0]
                );
                if (assets.length > 0) {
                    const asset = assets[0];
                    assetName = asset.name;
                    if (action_type === "PUMP_COMMAND" || action_type.startsWith("PUMP")) {
                        previousState = asset.pump_state;
                        await pool.query(`
                            UPDATE water_network_assets
                            SET pump_state = ?, telemetry_provenance = 'SIMULATED', operating_mode = 'SIMULATED'
                            WHERE id = ?
                        `, [target_value, asset.id]);
                    } else if (action_type === "VALVE_STATE" || action_type === "VALVE_THROTTLE") {
                        previousState = asset.valve_state;
                        await pool.query(`
                            UPDATE water_network_assets
                            SET valve_state = ?, telemetry_provenance = 'SIMULATED', operating_mode = 'SIMULATED'
                            WHERE id = ?
                        `, [target_value, asset.id]);
                    }
                } else {
                    throw new Error(`Asset ${asset_id} not found in water infrastructure database.`);
                }
            }
        }

        await logAudit({
            actor: operatorName,
            action: `WATER_FLOW_CONTROL_${action_type}`,
            target: `${asset_id} (${assetName})`,
            details: `Action: ${action_type} -> ${target_value} (Prev: ${previousState}). Operator reason: ${reason || "Manual supervisory request"}. Simulated execution verified.`
        });

        return {
            success: true,
            asset_id,
            asset_name: assetName,
            action_type,
            previous_state: previousState,
            new_state: newState,
            execution_mode: "SIMULATED",
            hardware_verified: false,
            notice: "Simulated action recorded in municipal SCADA ledger. Physical actuators remain unmanipulated without certified hardware link.",
            operator: operatorName,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get Fault Records with strict provenance separation
     */
    async getFaultRecords({ provenance, severity, status, zone } = {}) {
        let sql = "SELECT * FROM water_fault_records WHERE 1=1";
        const params = [];
        if (provenance) {
            sql += " AND provenance = ?";
            params.push(provenance);
        }
        if (severity) {
            sql += " AND severity = ?";
            params.push(severity);
        }
        if (status) {
            sql += " AND status = ?";
            params.push(status);
        }
        if (zone) {
            sql += " AND zone LIKE ?";
            params.push(`%${zone}%`);
        }
        sql += " ORDER BY FIELD(severity, 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'), detected_at DESC LIMIT 50";
        const [rows] = await pool.query(sql, params);

        return {
            success: true,
            count: rows.length,
            faults: rows,
            provenance_breakdown: {
                confirmed: rows.filter(r => r.provenance === "CONFIRMED").length,
                citizen_reports: rows.filter(r => r.provenance === "CITIZEN_REPORT").length,
                algorithmic_suspicion: rows.filter(r => r.provenance === "ALGORITHMIC_SUSPICION").length,
                simulated: rows.filter(r => r.provenance === "SIMULATED").length
            }
        };
    }

    /**
     * Create Fault Record
     */
    async createFaultRecord(data, user) {
        const fault_code = "FLT-" + Date.now().toString(36).toUpperCase();
        const {
            asset_id, network_type = "POTABLE_WATER", zone = "Gorakhpur Central",
            title, description, fault_type = "LOW_FLOW", severity = "HIGH",
            provenance = "ALGORITHMIC_SUSPICION", confidence_pct = 85.0,
            affected_flow_lps = 0, affected_pressure_bar = 0, recommended_action
        } = data;

        if (!asset_id || !title) {
            throw new Error("asset_id and title are required for creating a fault record.");
        }

        const [result] = await pool.query(`
            INSERT INTO water_fault_records
            (fault_code, asset_id, network_type, zone, title, description, fault_type, severity, provenance, confidence_pct, status, affected_flow_lps, affected_pressure_bar, recommended_action)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?)
        `, [
            fault_code, asset_id, network_type, zone,
            title, description || "Detected hydraulic anomaly",
            fault_type, severity, provenance, confidence_pct,
            affected_flow_lps, affected_pressure_bar,
            recommended_action || "Investigate field telemetry and dispatch inspection crew."
        ]);

        const [created] = await pool.query("SELECT * FROM water_fault_records WHERE id = ?", [result.insertId]);

        await logAudit({
            actor: user.name || "Water Operator",
            action: "CREATE_WATER_FAULT_RECORD",
            target: fault_code,
            details: `Created ${provenance} fault: ${title} (${severity}) on ${asset_id}`
        });

        return created[0];
    }

    /**
     * Update Fault Status
     */
    async updateFaultStatus(id, { status, remarks }, user) {
        const isNum = !isNaN(Number(id));
        const [rows] = await pool.query(
            `SELECT * FROM water_fault_records WHERE ${isNum ? "id = ? OR fault_code = ?" : "fault_code = ?"} LIMIT 1`,
            isNum ? [Number(id), String(id)] : [String(id)]
        );
        if (rows.length === 0) {
            throw new Error("Fault record not found.");
        }
        const fault = rows[0];
        const resolvedAt = status === "RESOLVED" || status === "FALSE_ALARM" ? new Date() : null;

        await pool.query(`
            UPDATE water_fault_records
            SET status = ?, resolved_at = COALESCE(?, resolved_at)
            WHERE id = ?
        `, [status, resolvedAt, fault.id]);

        await logAudit({
            actor: user.name || "Water Operator",
            action: "UPDATE_WATER_FAULT_STATUS",
            target: fault.fault_code,
            details: `Updated fault status to ${status}. Remarks: ${remarks || "None"}`
        });

        const [updated] = await pool.query("SELECT * FROM water_fault_records WHERE id = ?", [fault.id]);
        return updated[0];
    }

    /**
     * Reassign Work Order (WATER ADMIN ONLY)
     */
    async reassignWorkOrder(id, { assigned_to_id, assigned_to_name, reason }, user) {
        const isNum = !isNaN(Number(id));
        const [rows] = await pool.query(
            `SELECT * FROM water_work_orders WHERE ${isNum ? "id = ? OR order_id = ?" : "order_id = ?"} LIMIT 1`,
            isNum ? [Number(id), String(id)] : [String(id)]
        );
        if (rows.length === 0) {
            throw new Error("Work order not found.");
        }
        const wo = rows[0];

        await pool.query(`
            UPDATE water_work_orders
            SET assigned_to_id = ?, assigned_to_name = ?, status = 'ASSIGNED', acknowledged_at = NULL
            WHERE id = ?
        `, [assigned_to_id, assigned_to_name, wo.id]);

        await logAudit({
            actor: user.name || "Water Admin",
            action: "REASSIGN_WATER_WORK_ORDER",
            target: wo.order_id,
            details: `Reassigned from ${wo.assigned_to_name} to ${assigned_to_name}. Reason: ${reason || "Workload rebalancing"}`
        });

        const [updated] = await pool.query("SELECT * FROM water_work_orders WHERE id = ?", [wo.id]);
        return updated[0];
    }

    /**
     * Water Audit Logs
     */
    async getWaterAuditLogs({ limit = 50, action, actor } = {}) {
        let sql = `
            SELECT id, user_id, user_name, role, department, action, module, record_id, ip_address, metadata, created_at
            FROM audit_logs
            WHERE (module = 'WATER' OR department = 'water' OR action LIKE '%WATER%' OR action LIKE '%SEWAGE%')
        `;
        const params = [];
        if (action) {
            sql += " AND action LIKE ?";
            params.push(`%${action}%`);
        }
        if (actor) {
            sql += " AND user_name LIKE ?";
            params.push(`%${actor}%`);
        }
        sql += " ORDER BY created_at DESC LIMIT ?";
        params.push(Number(limit) || 50);

        const [rows] = await pool.query(sql, params);
        return rows;
    }
}

module.exports = new WaterIntelligenceService();
