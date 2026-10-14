const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'pages', 'water', 'water.js');
let content = fs.readFileSync(filePath, 'utf8');

const targetStart = '    function setupCurveBendingInterface() {';
const targetEnd = '    window.confirmCurvedPipeDrawing = confirmCurvedPipeDrawing;';

const startIdx = content.indexOf(targetStart);
const endIdx = content.indexOf(targetEnd);

if (startIdx === -1 || endIdx === -1) {
    console.error("Could not find start or end index:", { startIdx, endIdx });
    process.exit(1);
}

const replacementCode = `    function extendActiveRoutePrompt() {
        if (pipelines.length === 0) {
            showToast("No existing pipelines available in network to extend.", "warning");
            return;
        }
        if (multiPointState.active && multiPointState.points.length > 0) {
            showToast("📍 Continue route active. Click anywhere on map to add further pipeline points.", "info");
            return;
        }
        switchWaterWorkspace("existing");
        showToast("Select a pipeline from the list and click '➕ Extend' to continue its path.", "info");
    }
    window.extendActiveRoutePrompt = extendActiveRoutePrompt;

    function extendExistingPipeline(pipeId, endSide = "END") {
        if (!isWaterAdmin()) {
            showToast("Water Administrator privileges required.", "warning");
            return;
        }
        const pipe = pipelines.find(p => p.id === pipeId || p.pipeline_code === String(pipeId));
        if (!pipe) return;

        cancelMultiPointRoute();

        let pts = [];
        let rawCurve = pipe.curve_points;
        let parsed = null;
        if (Array.isArray(rawCurve)) parsed = rawCurve;
        else if (typeof rawCurve === "string") {
            try { parsed = JSON.parse(rawCurve); } catch (e) { parsed = null; }
        }

        if (Array.isArray(parsed) && parsed.length > 0) {
            pts = parsed.map(p => ({ lat: Number(p.lat), lng: Number(p.lng), roadName: pipe.road_name }));
        } else {
            pts = [
                { lat: Number(pipe.start_lat), lng: Number(pipe.start_lng), roadName: pipe.road_name },
                { lat: Number(pipe.end_lat), lng: Number(pipe.end_lng), roadName: pipe.road_name }
            ];
        }

        if (endSide === "START") pts.reverse();

        multiPointState.active = true;
        multiPointState.mode = pipe.pipe_type || "POTABLE";
        multiPointState.points = pts;
        multiPointState.undoStack = [];
        multiPointState.redoStack = [];
        multiPointState.isExtending = true;
        multiPointState.extendingPipeId = pipe.id;
        multiPointState.extendFrom = endSide;
        multiPointState.activeRoadCorridor = pipe.road_name;

        switchWaterWorkspace("build");

        const mapEl = document.getElementById("waterMap");
        if (mapEl) mapEl.style.cursor = "crosshair";

        redrawMultiPointPolylines();
        updateRouteMetricsUI();

        showToast(\`📍 Route for \${pipe.pipeline_code} loaded with \${pts.length} vertices. Click on map to extend!\`, "success");
    }
    window.extendExistingPipeline = extendExistingPipeline;

    function finishMultiPointRoute() {
        if (!multiPointState.active) return;
        if (multiPointState.points.length < 2) {
            showToast("At least 2 points are required to finish a pipeline route.", "warning");
            return;
        }

        const panel = document.getElementById("pipeContextualPanel");
        const titleEl = document.getElementById("ctxPipePanelTitle");
        const nameInput = document.getElementById("ctxPipeName");
        const typeSelect = document.getElementById("ctxPipeType");
        const slopeBox = document.getElementById("ctxSewageSlopeBox");
        const invertBox = document.getElementById("ctxSewageInvertBox");
        const elevDisc = document.getElementById("ctxElevationDisclaimer");
        const corrExplainer = document.getElementById("ctxCorridorExplainer");

        if (typeSelect) typeSelect.value = multiPointState.mode;

        const isSewage = multiPointState.mode === "WASTEWATER";
        const isCorridor = multiPointState.mode === "COMBINED_CORRIDOR";

        if (slopeBox) slopeBox.style.display = isSewage ? "flex" : "none";
        if (invertBox) invertBox.style.display = isSewage ? "flex" : "none";
        if (elevDisc) elevDisc.style.display = isSewage ? "block" : "none";
        if (corrExplainer) corrExplainer.style.display = isCorridor ? "block" : "none";

        if (titleEl) {
            titleEl.innerHTML = \`<span>\${isCorridor ? '🛣️' : (isSewage ? '☣️' : '💧')}</span> Configure \${isCorridor ? 'Dual Corridor' : (isSewage ? 'Sewage Pipe' : 'Potable Pipe')} (\${multiPointState.points.length} vertices)\`;
        }

        if (nameInput) {
            const prefix = isCorridor ? "Combined Utility Corridor" : (isSewage ? "Sewage Gravity Trunk" : "Potable Water Feeder");
            nameInput.value = \`\${prefix} — \${multiPointState.activeRoadCorridor || "Gorakhpur Road"}\`;
        }

        if (panel) panel.style.display = "flex";
    }
    window.finishMultiPointRoute = finishMultiPointRoute;
    window.confirmCurvedPipeDrawing = finishMultiPointRoute;

    function handleContextualPipeTypeChange(val) {
        multiPointState.mode = val;
        setMultiPointPipeMode(val);
        const slopeBox = document.getElementById("ctxSewageSlopeBox");
        const invertBox = document.getElementById("ctxSewageInvertBox");
        const elevDisc = document.getElementById("ctxElevationDisclaimer");
        const corrExplainer = document.getElementById("ctxCorridorExplainer");

        const isSewage = val === "WASTEWATER";
        const isCorridor = val === "COMBINED_CORRIDOR";

        if (slopeBox) slopeBox.style.display = isSewage ? "flex" : "none";
        if (invertBox) invertBox.style.display = isSewage ? "flex" : "none";
        if (elevDisc) elevDisc.style.display = isSewage ? "block" : "none";
        if (corrExplainer) corrExplainer.style.display = isCorridor ? "block" : "none";
    }
    window.handleContextualPipeTypeChange = handleContextualPipeTypeChange;

    function closePipeContextualPanel() {
        const panel = document.getElementById("pipeContextualPanel");
        if (panel) panel.style.display = "none";
    }
    window.closePipeContextualPanel = closePipeContextualPanel;

    async function saveContextualPipeline() {
        if (!isWaterAdmin()) {
            showToast("Water Administrator privileges required.", "warning");
            return;
        }

        if (multiPointState.points.length < 2) {
            showToast("Route must contain at least 2 points.", "warning");
            return;
        }

        const name = document.getElementById("ctxPipeName").value.trim() || "Gorakhpur Distribution Pipeline";
        const mode = document.getElementById("ctxPipeType").value;
        const diameter = Number(document.getElementById("ctxPipeDiameter").value) || 450;
        const material = document.getElementById("ctxPipeMaterial").value;
        const depth = Number(document.getElementById("ctxPipeDepth").value) || 1.8;
        const direction = document.getElementById("ctxPipeDirection").value;
        const status = document.getElementById("ctxPipeStatus").value;
        const slope = Number(document.getElementById("ctxSewageSlope").value) || 1.0;
        const invert = Number(document.getElementById("ctxSewageInvert").value) || 78.4;

        try {
            // Case A: Combined Road Corridor (Dual separate pipes)
            if (mode === "COMBINED_CORRIDOR") {
                const res = await fetch(\`\${API_BASE}/api/water/pipelines/combined-corridor\`, {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        roadName: multiPointState.activeRoadCorridor || "Gorakhpur Surveyed Arterial Corridor",
                        points: multiPointState.points,
                        potableSpecs: {
                            name: \`\${name} (Potable Main)\`,
                            diameter_mm: diameter,
                            material: "Ductile Iron",
                            depth_m: 1.8
                        },
                        sewageSpecs: {
                            name: \`\${name} (Sewage Trunk)\`,
                            diameter_mm: Math.max(diameter, 600),
                            material: "Reinforced Concrete",
                            depth_m: 2.8,
                            slope_percent: slope,
                            invert_level_m: invert
                        }
                    })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(\`✅ Combined corridor created: Potable & Sewage pipes deployed in dual verges!\`, "success");
                    closePipeContextualPanel();
                    cancelMultiPointRoute();
                    await fetchPipelines();
                } else {
                    showToast(\`⚠️ \${data.message || 'Failed to save combined corridor'}\`, "error");
                }
                return;
            }

            // Case B: Extending existing pipeline
            if (multiPointState.isExtending && multiPointState.extendingPipeId) {
                const startPt = multiPointState.points[0];
                const endPt = multiPointState.points[multiPointState.points.length - 1];
                let totalMeters = 0;
                for (let i = 0; i < multiPointState.points.length - 1; i++) {
                    totalMeters += getGeoDistance(multiPointState.points[i].lat, multiPointState.points[i].lng, multiPointState.points[i + 1].lat, multiPointState.points[i + 1].lng);
                }

                const res = await fetch(\`\${API_BASE}/api/water/pipelines/\${multiPointState.extendingPipeId}\`, {
                    method: "PUT",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        name,
                        start_lat: startPt.lat,
                        start_lng: startPt.lng,
                        end_lat: endPt.lat,
                        end_lng: endPt.lng,
                        curve_points: multiPointState.points,
                        total_length_m: Math.round(totalMeters),
                        pipe_diameter_mm: diameter,
                        material,
                        burial_depth_m: depth,
                        slope_percent: mode === "WASTEWATER" ? slope : null,
                        invert_level_m: mode === "WASTEWATER" ? invert : null,
                        status
                    })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(\`✅ Route successfully extended with \${multiPointState.points.length} vertices!\`, "success");
                    closePipeContextualPanel();
                    cancelMultiPointRoute();
                    await fetchPipelines();
                } else {
                    showToast(\`⚠️ \${data.message || 'Failed to extend pipeline route'}\`, "error");
                }
                return;
            }

            // Case C: New Multi-Point Route
            const startPt = multiPointState.points[0];
            const endPt = multiPointState.points[multiPointState.points.length - 1];
            let totalMeters = 0;
            for (let i = 0; i < multiPointState.points.length - 1; i++) {
                totalMeters += getGeoDistance(multiPointState.points[i].lat, multiPointState.points[i].lng, multiPointState.points[i + 1].lat, multiPointState.points[i + 1].lng);
            }

            const prefix = mode === "POTABLE" ? "PL-FW-" : (mode === "WASTEWATER" ? "PL-SW-" : "PL-REC-");
            const pipeline_code = prefix + Math.floor(100 + Math.random() * 900);

            const res = await fetch(\`\${API_BASE}/api/water/pipelines\`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    pipeline_code,
                    name,
                    pipe_type: mode,
                    start_lat: startPt.lat,
                    start_lng: startPt.lng,
                    end_lat: endPt.lat,
                    end_lng: endPt.lng,
                    curve_points: multiPointState.points,
                    total_length_m: Math.round(totalMeters),
                    pipe_diameter_mm: diameter,
                    material,
                    burial_depth_m: depth,
                    flow_direction: direction,
                    slope_percent: mode === "WASTEWATER" ? slope : null,
                    invert_level_m: mode === "WASTEWATER" ? invert : null,
                    status
                })
            });
            const data = await res.json();
            if (data.success) {
                showToast(\`✅ Pipeline \${pipeline_code} saved with \${multiPointState.points.length} vertices!\`, "success");
                closePipeContextualPanel();
                cancelMultiPointRoute();
                await fetchPipelines();
            } else {
                showToast(\`⚠️ \${data.message || 'Failed to save pipeline'}\`, "error");
            }
        } catch (err) {
            console.error("Save pipeline error:", err);
            showToast("Network error saving pipeline.", "error");
        }
    }
    window.saveContextualPipeline = saveContextualPipeline;

    function promptSplitRoute() {
        if (pipelines.length === 0) {
            showToast("No pipelines available to split.", "warning");
            return;
        }
        switchWaterWorkspace("existing");
        showToast("✂️ Select a pipeline below and click '✂️ Split' to divide into two connected segments.", "info");
    }
    window.promptSplitRoute = promptSplitRoute;

    async function splitPipelineRoute(pipeId) {
        if (!isWaterAdmin()) {
            showToast("Water Administrator privileges required to split pipelines.", "warning");
            return;
        }
        const pipe = pipelines.find(p => p.id === pipeId || p.pipeline_code === String(pipeId));
        if (!pipe) return;

        let pts = [];
        let rawCurve = pipe.curve_points;
        let parsed = null;
        if (Array.isArray(rawCurve)) parsed = rawCurve;
        else if (typeof rawCurve === "string") {
            try { parsed = JSON.parse(rawCurve); } catch (e) { parsed = null; }
        }

        let splitCoord = null;
        if (Array.isArray(parsed) && parsed.length > 2) {
            const mid = Math.floor(parsed.length / 2);
            splitCoord = { lat: Number(parsed[mid].lat), lng: Number(parsed[mid].lng) };
        } else {
            splitCoord = {
                lat: Number(((Number(pipe.start_lat) + Number(pipe.end_lat)) / 2).toFixed(6)),
                lng: Number(((Number(pipe.start_lng) + Number(pipe.end_lng)) / 2).toFixed(6))
            };
        }

        if (!confirm(\`Split pipeline \${pipe.pipeline_code} (\${pipe.name}) at junction point (\${splitCoord.lat}, \${splitCoord.lng}) into two connected segments?\`)) {
            return;
        }

        try {
            const res = await fetch(\`\${API_BASE}/api/water/pipelines/split\`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    pipelineId: pipe.id,
                    splitCoord
                })
            });
            const data = await res.json();
            if (data.success) {
                showToast(\`✅ \${data.message}\`, "success");
                await fetchPipelines();
                await fetchNetworkAssets();
                renderExistingNetwork("ALL");
            } else {
                showToast(\`⚠️ \${data.message || 'Failed to split pipeline'}\`, "error");
            }
        } catch (err) {
            console.error("Split pipe error:", err);
            showToast("Network error splitting pipeline.", "error");
        }
    }
    window.splitPipelineRoute = splitPipelineRoute;

    function promptBranchRoute() {
        if (!isWaterAdmin()) {
            showToast("Water Administrator privileges required.", "warning");
            return;
        }
        showToast("🌿 Select a junction on the map or existing network to branch a new pipeline from.", "info");
        switchWaterWorkspace("existing");
    }
    window.promptBranchRoute = promptBranchRoute;

    function branchFromJunction(junctionId, lat, lng, parentPipeId) {
        cancelMultiPointRoute();
        multiPointState.active = true;
        multiPointState.mode = "POTABLE";
        multiPointState.points = [{ lat: Number(lat), lng: Number(lng), junctionId }];
        multiPointState.undoStack = [];
        multiPointState.redoStack = [];

        switchWaterWorkspace("build");
        const mapEl = document.getElementById("waterMap");
        if (mapEl) mapEl.style.cursor = "crosshair";

        redrawMultiPointPolylines();
        updateRouteMetricsUI();
        showToast(\`🌿 Branching from junction \${junctionId}. Click map to draw the branch route!\`, "success");
    }
    window.branchFromJunction = branchFromJunction;

    // EQUIPMENT LIBRARY CATALOG & BLUEPRINTS
    const UTILITY_EQUIPMENT_BLUEPRINTS = [
        {
            type: "BOOSTER_PUMP",
            category: "PUMPS",
            icon: "⛽",
            name: "High-Capacity Booster Pump Station",
            desc: "Multi-stage centrifugal booster providing water head pressure across trunk lines.",
            capacity_lps: 350,
            power_kw: 90,
            status: "ONLINE"
        },
        {
            type: "MOTOR",
            category: "PUMPS",
            icon: "⚡",
            name: "Centrifugal Induction Motor",
            desc: "Three-phase electric motor driving municipal distribution impellers.",
            capacity_lps: 200,
            power_kw: 55,
            status: "ONLINE"
        },
        {
            type: "CONTROL_TOWER",
            category: "CONTROL",
            icon: "🏢",
            name: "SCADA Central Control Center",
            desc: "Sub-zonal supervisory telecontrol tower coordinating telemetry and valves.",
            capacity_lps: 0,
            power_kw: 25,
            status: "ONLINE"
        },
        {
            type: "TREATMENT_PLANT",
            category: "TREATMENT",
            icon: "🏭",
            name: "Water Treatment Plant (WTP)",
            desc: "Clarification, sand filtration, and chlorination clean water processing station.",
            capacity_lps: 1200,
            power_kw: 250,
            status: "ONLINE"
        },
        {
            type: "TREATMENT_PLANT",
            category: "TREATMENT",
            icon: "🏭",
            name: "Sewage Treatment Plant (STP)",
            desc: "Sequential Batch Reactor (SBR) biological wastewater treatment facility.",
            capacity_lps: 800,
            power_kw: 180,
            status: "ONLINE"
        },
        {
            type: "STORAGE_RESERVOIR",
            category: "TANKS",
            icon: "🛢️",
            name: "Elevated Storage Reservoir (ESR)",
            desc: "Reinforced concrete overhead balancing reservoir with continuous level monitoring.",
            capacity_lps: 500,
            power_kw: 0,
            status: "ONLINE"
        },
        {
            type: "CONTROL_VALVE",
            category: "VALVES",
            icon: "🔴",
            name: "Pressure Reducing Valve (PRV)",
            desc: "Pilot-operated diaphragm valve maintaining downstream pressure boundary.",
            pressure_setpoint: 3.5,
            status: "ONLINE"
        },
        {
            type: "PRESSURE_SENSOR",
            category: "SENSORS",
            icon: "📍",
            name: "SCADA Pressure Sensor",
            desc: "Piezoresistive pressure transmitter monitoring pipe line hydraulic stress.",
            sensor_units: "bar",
            alarm_min: 1.5,
            alarm_max: 6.5,
            status: "ONLINE"
        },
        {
            type: "FLOW_METER",
            category: "SENSORS",
            icon: "📊",
            name: "Ultrasonic Flow Meter",
            desc: "Transit-time electromagnetic flow meter measuring non-invasive bulk velocity.",
            sensor_units: "L/s",
            alarm_min: 20,
            alarm_max: 400,
            status: "ONLINE"
        },
        {
            type: "LEAK_DETECTOR",
            category: "SENSORS",
            icon: "📡",
            name: "Acoustic Leak Correlator",
            desc: "Vibration acoustic sensor detecting pipe micro-fractures before burst events.",
            sensor_units: "dB",
            alarm_min: 0,
            alarm_max: 45,
            status: "ONLINE"
        },
        {
            type: "NETWORK_JUNCTION",
            category: "JUNCTIONS",
            icon: "🔗",
            name: "4-Way Hydraulic SCADA Junction",
            desc: "Multi-pipe manifold chamber with motorized sluice isolation valves.",
            status: "ONLINE"
        }
    ];

    let currentEquipCategory = "ALL";
    let currentEquipSearch = "";

    function filterEquipCategory(cat) {
        currentEquipCategory = cat;
        document.querySelectorAll(".equipment-category-pills .equip-pill").forEach(p => {
            p.classList.toggle("active", p.textContent.toUpperCase().includes(cat) || (cat === "ALL" && p.textContent === "All"));
        });
        renderEquipmentCatalog(cat, currentEquipSearch);
    }
    window.filterEquipCategory = filterEquipCategory;

    function filterEquipmentCatalog(search) {
        currentEquipSearch = search;
        renderEquipmentCatalog(currentEquipCategory, search);
    }
    window.filterEquipmentCatalog = filterEquipmentCatalog;

    function renderEquipmentCatalog(category = "ALL", searchQuery = "") {
        const grid = document.getElementById("equipmentCatalogGrid");
        if (!grid) return;

        grid.innerHTML = "";

        let items = UTILITY_EQUIPMENT_BLUEPRINTS.slice();

        if (category !== "ALL") {
            items = items.filter(it => it.category === category);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            items = items.filter(it => it.name.toLowerCase().includes(q) || it.desc.toLowerCase().includes(q) || it.type.toLowerCase().includes(q));
        }

        if (items.length === 0) {
            grid.innerHTML = \`<div style="grid-column: 1/-1; text-align:center; padding:30px; color:#64748b;">No equipment items matched your search filter.</div>\`;
            return;
        }

        items.forEach((item, idx) => {
            const card = document.createElement("div");
            card.className = "equipment-card";
            card.innerHTML = \`
                <div class="equipment-card-header">
                    <span class="equipment-card-icon">\${item.icon}</span>
                    <div class="equipment-card-info">
                        <div class="equipment-card-name">\${escapeHTML(item.name)}</div>
                        <div class="equipment-card-desc">\${escapeHTML(item.desc)}</div>
                    </div>
                </div>
                <div class="equipment-card-meta">
                    <span>\${item.capacity_lps ? item.capacity_lps + ' L/s' : (item.sensor_units ? 'Unit: ' + item.sensor_units : item.category)}</span>
                    <button type="button" class="btn-place-equipment" onclick="startEquipmentPlacement(\${idx})">
                        🎯 Place on Map
                    </button>
                </div>
            \`;
            grid.appendChild(card);
        });
    }

    function startEquipmentPlacement(index) {
        if (!isWaterAdmin()) {
            showToast("Water Administrator privileges required to place equipment.", "warning");
            return;
        }

        const blueprint = UTILITY_EQUIPMENT_BLUEPRINTS[index];
        if (!blueprint) return;

        isPlacingEquipment = true;
        pendingEquipmentBlueprint = blueprint;

        const mapEl = document.getElementById("waterMap");
        if (mapEl) {
            mapEl.style.cursor = "crosshair";
            mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        showToast(\`🎯 Click on the map in Gorakhpur to position \${blueprint.name}\`, "info");
    }
    window.startEquipmentPlacement = startEquipmentPlacement;

    function handleEquipmentMapClick(e) {
        isPlacingEquipment = false;
        const blueprint = pendingEquipmentBlueprint;
        pendingEquipmentBlueprint = null;

        const mapEl = document.getElementById("waterMap");
        if (mapEl) mapEl.style.cursor = "default";

        let clickLat = Number(e.latlng.lat);
        let clickLng = Number(e.latlng.lng);

        if (isRoadSnapActive) {
            const snap = snapPointToRoadNetwork(clickLat, clickLng);
            if (snap.distanceMeters <= 100) {
                clickLat = snap.snappedPoint.lat;
                clickLng = snap.snappedPoint.lng;
            }
        }

        openEquipmentContextualPanel(blueprint, clickLat, clickLng);
    }

    function openEquipmentContextualPanel(blueprint, lat, lng) {
        const panel = document.getElementById("equipmentContextualPanel");
        const titleEl = document.getElementById("ctxEquipPanelTitle");
        const nameInput = document.getElementById("ctxEquipName");
        const typeSelect = document.getElementById("ctxEquipType");
        const latInput = document.getElementById("ctxEquipLat");
        const lngInput = document.getElementById("ctxEquipLng");
        const capInput = document.getElementById("ctxEquipCapacity");
        const pwrInput = document.getElementById("ctxEquipPower");
        const statusSelect = document.getElementById("ctxEquipStatus");
        const pressInput = document.getElementById("ctxEquipPressureSetpoint");
        const flowInput = document.getElementById("ctxEquipFlowSetpoint");
        const unitsInput = document.getElementById("ctxEquipUnits");
        const minInput = document.getElementById("ctxEquipAlarmMin");
        const maxInput = document.getElementById("ctxEquipAlarmMax");

        if (titleEl) titleEl.innerHTML = \`<span>\${blueprint.icon}</span> Place \${escapeHTML(blueprint.name)}\`;
        const defaultZone = (document.getElementById("ctxEquipZone") && document.getElementById("ctxEquipZone").value) || "Golghar Central";
        if (nameInput) nameInput.value = \`\${blueprint.name} - \${defaultZone}\`;
        if (typeSelect) typeSelect.value = blueprint.type;
        if (latInput) latInput.value = lat.toFixed(6);
        if (lngInput) lngInput.value = lng.toFixed(6);
        if (capInput) capInput.value = blueprint.capacity_lps || 250;
        if (pwrInput) pwrInput.value = blueprint.power_kw || 75;
        if (statusSelect) statusSelect.value = blueprint.status || "ONLINE";
        if (pressInput) pressInput.value = blueprint.pressure_setpoint || 3.5;
        if (flowInput) flowInput.value = blueprint.flow_setpoint || 120;
        if (unitsInput) unitsInput.value = blueprint.sensor_units || "bar";
        if (minInput) minInput.value = blueprint.alarm_min !== undefined ? blueprint.alarm_min : 1.5;
        if (maxInput) maxInput.value = blueprint.alarm_max !== undefined ? blueprint.alarm_max : 6.5;

        handleContextualEquipTypeChange(blueprint.type);

        if (panel) panel.style.display = "flex";
    }

    function handleContextualEquipTypeChange(type) {
        const isMotor = type === "BOOSTER_PUMP" || type === "MOTOR" || type === "TREATMENT_PLANT";
        const isValve = type === "CONTROL_VALVE";
        const isSensor = type === "PRESSURE_SENSOR" || type === "FLOW_METER" || type === "LEAK_DETECTOR";

        document.querySelectorAll(".ctx-motor-field").forEach(el => el.style.display = isMotor ? "flex" : "none");
        document.querySelectorAll(".ctx-valve-field").forEach(el => el.style.display = isValve ? "flex" : "none");
        document.querySelectorAll(".ctx-sensor-field").forEach(el => el.style.display = isSensor ? "flex" : "none");
    }
    window.handleContextualEquipTypeChange = handleContextualEquipTypeChange;

    function closeEquipmentContextualPanel() {
        const panel = document.getElementById("equipmentContextualPanel");
        if (panel) panel.style.display = "none";
    }
    window.closeEquipmentContextualPanel = closeEquipmentContextualPanel;

    async function saveContextualEquipment() {
        if (!isWaterAdmin()) {
            showToast("Water Administrator privileges required.", "warning");
            return;
        }

        const name = document.getElementById("ctxEquipName").value.trim();
        const asset_type = document.getElementById("ctxEquipType").value;
        const lat = Number(document.getElementById("ctxEquipLat").value);
        const lng = Number(document.getElementById("ctxEquipLng").value);
        const zone = (document.getElementById("ctxEquipZone") && document.getElementById("ctxEquipZone").value.trim()) || "Golghar Central";

        if (!name || isNaN(lat) || isNaN(lng)) {
            showToast("Valid asset name and coordinates are required.", "warning");
            return;
        }

        const pump_capacity_lps = Number(document.getElementById("ctxEquipCapacity").value) || null;
        const motor_power_kw = Number(document.getElementById("ctxEquipPower").value) || null;
        const status = document.getElementById("ctxEquipStatus").value;
        const pressure_setpoint_bar = Number(document.getElementById("ctxEquipPressureSetpoint").value) || null;
        const flow_setpoint_lps = Number(document.getElementById("ctxEquipFlowSetpoint").value) || null;
        const sensor_units = document.getElementById("ctxEquipUnits").value || null;
        const alarm_min_threshold = Number(document.getElementById("ctxEquipAlarmMin").value) || null;
        const alarm_max_threshold = Number(document.getElementById("ctxEquipAlarmMax").value) || null;

        const asset_id = \`AST-\${asset_type.substring(0, 3)}-\${Math.floor(100 + Math.random() * 900)}\`;

        try {
            const res = await fetch(\`\${API_BASE}/api/water/network/assets\`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    asset_id,
                    name,
                    asset_type,
                    latitude: lat,
                    longitude: lng,
                    zone,
                    status,
                    pump_capacity_lps,
                    motor_power_kw,
                    pressure_setpoint_bar,
                    flow_setpoint_lps,
                    sensor_units,
                    alarm_min_threshold,
                    alarm_max_threshold
                })
            });
            const data = await res.json();
            if (data.success) {
                showToast(\`✅ Asset \${name} placed and recorded in database!\`, "success");
                closeEquipmentContextualPanel();
                await fetchNetworkAssets();
                renderExistingNetwork("ALL");
            } else {
                showToast(\`⚠️ \${data.message || 'Failed to save equipment'}\`, "error");
            }
        } catch (err) {
            console.error("Save equipment error:", err);
            showToast("Network error saving equipment.", "error");
        }
    }
    window.saveContextualEquipment = saveContextualEquipment;

    // EXISTING NETWORK EXPLORER & EDITOR
    let currentExistingFilter = "ALL";
    let currentExistingSearch = "";

    function filterExistingType(type) {
        currentExistingFilter = type;
        document.querySelectorAll(".ws-existing-deck .equip-pill").forEach(p => {
            p.classList.toggle("active", p.id === \`filterExist\${type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}\`);
        });
        renderExistingNetwork(type, currentExistingSearch);
    }
    window.filterExistingType = filterExistingType;

    function filterExistingNetwork(search) {
        currentExistingSearch = search;
        renderExistingNetwork(currentExistingFilter, search);
    }
    window.filterExistingNetwork = filterExistingNetwork;

    function renderExistingNetwork(type = "ALL", searchQuery = "") {
        const grid = document.getElementById("existingItemsGrid");
        if (!grid) return;

        grid.innerHTML = "";

        let items = [];

        if (type === "ALL" || type === "PIPELINES") {
            pipelines.forEach(pipe => {
                items.push({ kind: "PIPELINE", data: pipe });
            });
        }

        if (type === "ALL" || type === "ASSETS") {
            networkAssets.forEach(asset => {
                items.push({ kind: "ASSET", data: asset });
            });
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            items = items.filter(it => {
                const d = it.data;
                const name = (d.name || "").toLowerCase();
                const code = (d.pipeline_code || d.asset_id || "").toLowerCase();
                const zone = (d.zone || d.road_name || "").toLowerCase();
                return name.includes(q) || code.includes(q) || zone.includes(q);
            });
        }

        if (items.length === 0) {
            grid.innerHTML = \`<div style="grid-column: 1/-1; text-align:center; padding:30px; color:#64748b;">No network pipelines or assets found.</div>\`;
            return;
        }

        items.forEach(it => {
            const card = document.createElement("div");
            card.className = "existing-item-card";

            if (it.kind === "PIPELINE") {
                const pipe = it.data;
                const isSewage = pipe.pipe_type === "WASTEWATER";
                card.innerHTML = \`
                    <div class="existing-item-title-row">
                        <div class="existing-item-title">
                            <span>\${isSewage ? '☣️' : '💧'}</span>
                            <span>\${escapeHTML(pipe.name || pipe.pipeline_code)}</span>
                        </div>
                        <span style="font-size:10.5px; font-weight:700; color:\${pipe.status === 'OPERATIONAL' ? '#34d399' : '#f59e0b'}; background:rgba(0,0,0,0.3); padding:2px 6px; border-radius:4px;">\${pipe.status || 'ACTIVE'}</span>
                    </div>
                    <div class="existing-item-specs">
                        <div><span class="k">Code:</span> <span class="v">\${pipe.pipeline_code}</span></div>
                        <div><span class="k">Type:</span> <span class="v">\${pipe.pipe_type || 'POTABLE'}</span></div>
                        <div><span class="k">Diameter:</span> <span class="v">\${pipe.pipe_diameter_mm || 450} mm</span></div>
                        <div><span class="k">Depth:</span> <span class="v">\${pipe.burial_depth_m || 1.8} m</span></div>
                    </div>
                    <div class="existing-card-actions">
                        <button type="button" class="existing-card-btn primary" onclick="focusPipelineOnMap(\${pipe.id})">🎯 Focus</button>
                        <button type="button" class="existing-card-btn" onclick="extendExistingPipeline(\${pipe.id}, 'END')">➕ Extend</button>
                        <button type="button" class="existing-card-btn" onclick="splitPipelineRoute(\${pipe.id})">✂️ Split</button>
                        <button type="button" class="existing-card-btn" style="color:#ef4444;" onclick="handleDeletePipelineFromExisting(\${pipe.id})">🗑️ Delete</button>
                    </div>
                \`;
            } else {
                const asset = it.data;
                const connectedCount = pipelines.filter(p => p.source_node === asset.asset_id || p.target_node === asset.asset_id).length;
                card.innerHTML = \`
                    <div class="existing-item-title-row">
                        <div class="existing-item-title">
                            <span>⚙️</span>
                            <span>\${escapeHTML(asset.name || asset.asset_id)}</span>
                        </div>
                        <span style="font-size:10.5px; font-weight:700; color:\${asset.status === 'ONLINE' ? '#34d399' : '#f59e0b'}; background:rgba(0,0,0,0.3); padding:2px 6px; border-radius:4px;">\${asset.status || 'ONLINE'}</span>
                    </div>
                    <div class="existing-item-specs">
                        <div><span class="k">ID:</span> <span class="v">\${asset.asset_id}</span></div>
                        <div><span class="k">Type:</span> <span class="v">\${asset.asset_type}</span></div>
                        <div><span class="k">Zone:</span> <span class="v">\${asset.zone || 'Central'}</span></div>
                        <div><span class="k">Pipes:</span> <span class="v">\${connectedCount} connected</span></div>
                    </div>
                    <div class="existing-card-actions">
                        <button type="button" class="existing-card-btn primary" onclick="focusAssetOnMap('\${asset.asset_id}')">🎯 Focus</button>
                        <button type="button" class="existing-card-btn" onclick="promptRelocateAsset('\${asset.asset_id}')">📍 Relocate Asset</button>
                        <button type="button" class="existing-card-btn" style="color:#ef4444;" onclick="handleDeleteAssetFromExisting('\${asset.asset_id}')">🗑️ Delete</button>
                    </div>
                \`;
            }
            grid.appendChild(card);
        });
    }

    function focusPipelineOnMap(pipeId) {
        const pipe = pipelines.find(p => p.id === pipeId);
        if (!pipe || !waterMap) return;

        let bounds = null;
        let rawCurve = pipe.curve_points;
        let parsed = null;
        if (Array.isArray(rawCurve)) parsed = rawCurve;
        else if (typeof rawCurve === "string") {
            try { parsed = JSON.parse(rawCurve); } catch (e) { parsed = null; }
        }

        if (Array.isArray(parsed) && parsed.length > 0) {
            bounds = L.latLngBounds(parsed.map(p => [Number(p.lat), Number(p.lng)]));
        } else {
            bounds = L.latLngBounds([
                [Number(pipe.start_lat), Number(pipe.start_lng)],
                [Number(pipe.end_lat), Number(pipe.end_lng)]
            ]);
        }

        waterMap.fitBounds(bounds, { padding: [50, 50] });
        showToast(\`🎯 Centered on pipeline \${pipe.pipeline_code}\`, "info");
    }
    window.focusPipelineOnMap = focusPipelineOnMap;

    function focusAssetOnMap(assetId) {
        const asset = networkAssets.find(a => a.asset_id === assetId);
        if (!asset || !waterMap) return;

        waterMap.setView([Number(asset.latitude), Number(asset.longitude)], 17, { animate: true });
        showToast(\`🎯 Centered on asset \${asset.name}\`, "info");
    }
    window.focusAssetOnMap = focusAssetOnMap;

    async function handleDeletePipelineFromExisting(pipeId) {
        if (!isWaterAdmin()) {
            showToast("Water Administrator privileges required.", "warning");
            return;
        }
        const pipe = pipelines.find(p => p.id === pipeId);
        if (!pipe) return;
        if (!confirm(\`Are you sure you want to delete pipeline \${pipe.pipeline_code} (\${pipe.name})?\`)) return;

        try {
            const res = await fetch(\`\${API_BASE}/api/water/pipelines/\${pipe.id}\`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                showToast(\`🗑️ Pipeline \${pipe.pipeline_code} deleted.\`, "info");
                await fetchPipelines();
                renderExistingNetwork(currentExistingFilter, currentExistingSearch);
            } else {
                showToast(\`⚠️ \${data.message || 'Delete failed'}\`, "error");
            }
        } catch (err) {
            console.error("Delete pipe error:", err);
            showToast("Network error deleting pipeline.", "error");
        }
    }
    window.handleDeletePipelineFromExisting = handleDeletePipelineFromExisting;

    async function handleDeleteAssetFromExisting(assetId) {
        if (!isWaterAdmin()) {
            showToast("Water Administrator privileges required.", "warning");
            return;
        }
        const asset = networkAssets.find(a => a.asset_id === assetId);
        if (!asset) return;
        if (!confirm(\`Are you sure you want to decommission & delete asset \${asset.name} (\${asset.asset_id})? Connected pipelines will lose node reference.\`)) return;

        try {
            const res = await fetch(\`\${API_BASE}/api/water/network/assets/\${asset.id}\`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                showToast(\`🗑️ Asset \${asset.name} decommissioned.\`, "info");
                await fetchNetworkAssets();
                renderExistingNetwork(currentExistingFilter, currentExistingSearch);
            } else {
                showToast(\`⚠️ \${data.message || 'Delete failed'}\`, "error");
            }
        } catch (err) {
            console.error("Delete asset error:", err);
            showToast("Network error deleting asset.", "error");
        }
    }
    window.handleDeleteAssetFromExisting = handleDeleteAssetFromExisting;

    // ASSET RELOCATION WITH CONNECTED-ROUTE VALIDATION
    function promptRelocateAsset(assetId) {
        if (!isWaterAdmin()) {
            showToast("Water Administrator privileges required.", "warning");
            return;
        }

        const asset = networkAssets.find(a => a.asset_id === assetId);
        if (!asset) return;

        isRelocatingAsset = true;
        activeRelocatingAsset = asset;

        const mapEl = document.getElementById("waterMap");
        if (mapEl) {
            mapEl.style.cursor = "crosshair";
            mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        showToast(\`📍 Click on the map in Gorakhpur to propose new relocation coordinate for \${asset.name}.\`, "info");
    }
    window.promptRelocateAsset = promptRelocateAsset;

    function handleAssetRelocationMapClick(e) {
        isRelocatingAsset = false;
        const asset = activeRelocatingAsset;
        activeRelocatingAsset = null;

        const mapEl = document.getElementById("waterMap");
        if (mapEl) mapEl.style.cursor = "default";

        let newLat = Number(e.latlng.lat);
        let newLng = Number(e.latlng.lng);

        if (isRoadSnapActive) {
            const snap = snapPointToRoadNetwork(newLat, newLng);
            if (snap.distanceMeters <= 100) {
                newLat = snap.snappedPoint.lat;
                newLng = snap.snappedPoint.lng;
            }
        }

        openAssetRelocationModal(asset, newLat, newLng);
    }

    function openAssetRelocationModal(asset, targetLat, targetLng) {
        const modal = document.getElementById("assetRelocationModal");
        if (!modal) return;

        document.getElementById("relocAssetId").value = asset.asset_id;
        document.getElementById("relocTargetLat").value = targetLat.toFixed(6);
        document.getElementById("relocTargetLng").value = targetLng.toFixed(6);

        document.getElementById("relocAssetName").textContent = asset.name;
        document.getElementById("relocAssetCode").textContent = \`ID: \${asset.asset_id} • \${asset.asset_type}\`;
        document.getElementById("relocPrevCoords").textContent = \`\${Number(asset.latitude).toFixed(6)}, \${Number(asset.longitude).toFixed(6)}\`;
        document.getElementById("relocNewCoords").textContent = \`\${targetLat.toFixed(6)}, \${targetLng.toFixed(6)}\`;

        const connectedPipes = pipelines.filter(p => {
            if (p.source_node === asset.asset_id || p.target_node === asset.asset_id) return true;
            const dStart = getGeoDistance(asset.latitude, asset.longitude, p.start_lat, p.start_lng);
            const dEnd = getGeoDistance(asset.latitude, asset.longitude, p.end_lat, p.end_lng);
            return dStart <= 35 || dEnd <= 35;
        });

        const listEl = document.getElementById("relocConnectedPipesList");
        const countEl = document.getElementById("relocConnectedCount");
        if (countEl) countEl.textContent = String(connectedPipes.length);

        if (listEl) {
            if (connectedPipes.length === 0) {
                listEl.innerHTML = \`<div style="color:#94a3b8; padding:6px;">No currently connected pipelines detected for this node.</div>\`;
            } else {
                listEl.innerHTML = connectedPipes.map(p => \`
                    <div style="background:#0f172a; padding:6px 10px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:600; color:#38bdf8;">\${escapeHTML(p.pipeline_code)} — \${escapeHTML(p.name)}</span>
                        <span style="font-size:11px; color:#34d399;">Endpoint Re-anchoring Verified</span>
                    </div>
                \`).join("");
            }
        }

        modal.style.display = "flex";
    }

    function closeAssetRelocationModal() {
        const modal = document.getElementById("assetRelocationModal");
        if (modal) modal.style.display = "none";
    }
    window.closeAssetRelocationModal = closeAssetRelocationModal;

    async function executeAssetRelocation() {
        if (!isWaterAdmin()) {
            showToast("Water Administrator privileges required.", "warning");
            return;
        }

        const assetId = document.getElementById("relocAssetId").value;
        const targetLat = Number(document.getElementById("relocTargetLat").value);
        const targetLng = Number(document.getElementById("relocTargetLng").value);

        try {
            const res = await fetch(\`\${API_BASE}/api/water/network/assets/relocate\`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ assetId, targetLat, targetLng })
            });
            const data = await res.json();
            if (data.success) {
                showToast(\`✅ \${data.message}\`, "success");
                closeAssetRelocationModal();
                await fetchNetworkAssets();
                await fetchPipelines();
                renderExistingNetwork("ALL");
            } else {
                showToast(\`⚠️ \${data.message || 'Relocation failed'}\`, "error");
            }
        } catch (err) {
            console.error("Relocation error:", err);
            showToast("Network error executing asset relocation.", "error");
        }
    }
    window.executeAssetRelocation = executeAssetRelocation;

    // NETWORK AUDIT TRAIL LOGS
    async function openNetworkAuditModal() {
        const modal = document.getElementById("networkAuditModal");
        if (modal) modal.style.display = "flex";
        await loadNetworkAuditLogs();
    }
    window.openNetworkAuditModal = openNetworkAuditModal;

    function closeNetworkAuditModal() {
        const modal = document.getElementById("networkAuditModal");
        if (modal) modal.style.display = "none";
    }
    window.closeNetworkAuditModal = closeNetworkAuditModal;

    let networkAuditLogsData = [];

    async function loadNetworkAuditLogs() {
        const tbody = document.getElementById("auditTrailTableBody");
        if (tbody) tbody.innerHTML = \`<tr><td colspan="5" style="text-align:center; padding:20px; color:#64748b;">Loading audit logs...</td></tr>\`;

        try {
            const res = await fetch(\`\${API_BASE}/api/water/network/audit-logs\`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.auditLogs)) {
                    networkAuditLogsData = data.auditLogs;
                    renderAuditLogsTable(networkAuditLogsData);
                    return;
                }
            }
            if (tbody) tbody.innerHTML = \`<tr><td colspan="5" style="text-align:center; padding:20px; color:#ef4444;">Failed to load audit logs.</td></tr>\`;
        } catch (err) {
            console.error("Fetch audit logs error:", err);
            if (tbody) tbody.innerHTML = \`<tr><td colspan="5" style="text-align:center; padding:20px; color:#ef4444;">Network error fetching audit logs.</td></tr>\`;
        }
    }
    window.loadNetworkAuditLogs = loadNetworkAuditLogs;

    function renderAuditLogsTable(logs) {
        const tbody = document.getElementById("auditTrailTableBody");
        if (!tbody) return;

        if (logs.length === 0) {
            tbody.innerHTML = \`<tr><td colspan="5" style="text-align:center; padding:20px; color:#64748b;">No network audit records yet.</td></tr>\`;
            return;
        }

        tbody.innerHTML = logs.map(l => {
            const dateStr = new Date(l.created_at).toLocaleString();
            let actionBadge = \`<span style="background:rgba(2,132,199,0.2); color:#38bdf8; padding:2px 6px; border-radius:4px; font-weight:700;">\${escapeHTML(l.action_type)}</span>\`;
            if (l.action_type.includes("DELETE") || l.action_type.includes("DECOMMISSION")) {
                actionBadge = \`<span style="background:rgba(239,68,68,0.2); color:#f87171; padding:2px 6px; border-radius:4px; font-weight:700;">\${escapeHTML(l.action_type)}</span>\`;
            } else if (l.action_type.includes("RELOCAT") || l.action_type.includes("SPLIT")) {
                actionBadge = \`<span style="background:rgba(245,158,11,0.2); color:#fbbf24; padding:2px 6px; border-radius:4px; font-weight:700;">\${escapeHTML(l.action_type)}</span>\`;
            }

            return \`
                <tr>
                    <td style="font-family:monospace; font-size:11px;">\${dateStr}</td>
                    <td>\${actionBadge}</td>
                    <td><strong>\${escapeHTML(l.entity_type)}</strong>: \${escapeHTML(l.entity_id || '')}</td>
                    <td style="color:#e2e8f0;">\${escapeHTML(l.impact_summary || '')}</td>
                    <td style="color:#94a3b8;">\${escapeHTML(l.changed_by_name || 'Admin')}</td>
                </tr>
            \`;
        }).join("");
    }

    function filterAuditLogsTable(query) {
        if (!query) {
            renderAuditLogsTable(networkAuditLogsData);
            return;
        }
        const q = query.toLowerCase();
        const filtered = networkAuditLogsData.filter(l => {
            return (l.action_type && l.action_type.toLowerCase().includes(q)) ||
                   (l.entity_id && l.entity_id.toLowerCase().includes(q)) ||
                   (l.entity_name && l.entity_name.toLowerCase().includes(q)) ||
                   (l.impact_summary && l.impact_summary.toLowerCase().includes(q)) ||
                   (l.changed_by_name && l.changed_by_name.toLowerCase().includes(q));
        });
        renderAuditLogsTable(filtered);
    }
    window.filterAuditLogsTable = filterAuditLogsTable;\n`;

const endTargetLen = targetEnd.length;
content = content.substring(0, startIdx) + replacementCode + content.substring(endIdx + endTargetLen);

// Also hook into fetchPipelines to update badges and existing network
const oldFetchPipelines = 'pipelines = data.pipelines;\n                    renderPipelines();\n                    renderPipelinesOnMap();';
const newFetchPipelines = `pipelines = data.pipelines;
                    renderPipelines();
                    renderPipelinesOnMap();
                    const bPipes = document.getElementById("badgePipeCount");
                    if (bPipes) bPipes.textContent = \`\${pipelines.length} Lines\`;
                    if (currentWaterWorkspace === "existing") renderExistingNetwork(currentExistingFilter, currentExistingSearch);`;

if (content.includes(oldFetchPipelines)) {
    content = content.replace(oldFetchPipelines, newFetchPipelines);
} else {
    // Try with CRLF
    const oldFetchPipelinesCRLF = 'pipelines = data.pipelines;\r\n                    renderPipelines();\r\n                    renderPipelinesOnMap();';
    if (content.includes(oldFetchPipelinesCRLF)) {
        content = content.replace(oldFetchPipelinesCRLF, newFetchPipelines);
    }
}

// Also hook into fetchNetworkAssets to update badges and equipment catalog
const oldFetchAssets = 'networkAssets = data.assets;\n                    renderNetworkAssetsOnMap();';
const newFetchAssets = `networkAssets = data.assets;
                    renderNetworkAssetsOnMap();
                    const bAssets = document.getElementById("badgeAssetCount");
                    if (bAssets) bAssets.textContent = \`\${networkAssets.length} Assets\`;
                    if (currentWaterWorkspace === "library") renderEquipmentCatalog(currentEquipCategory, currentEquipSearch);
                    if (currentWaterWorkspace === "existing") renderExistingNetwork(currentExistingFilter, currentExistingSearch);`;

if (content.includes(oldFetchAssets)) {
    content = content.replace(oldFetchAssets, newFetchAssets);
} else {
    const oldFetchAssetsCRLF = 'networkAssets = data.assets;\r\n                    renderNetworkAssetsOnMap();';
    if (content.includes(oldFetchAssetsCRLF)) {
        content = content.replace(oldFetchAssetsCRLF, newFetchAssets);
    }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated water.js!");
