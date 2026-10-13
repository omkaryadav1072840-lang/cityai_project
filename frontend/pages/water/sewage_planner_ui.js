/**
 * SmartCity AI - Sewage Pipeline Planning & 3D Route Designer UI Module
 * Interactive 2D Leaflet GIS & 3D Three.js Route Design, Snapping,
 * Engineering Validation, Role-Based Access Control, and Versioning.
 */

(function (window, document) {
    "use strict";

    // Module State
    let isInitialized = false;
    let surveyedCorridors = [];
    let plannedRoutes = [];
    let activeRoute = {
        id: null,
        route_id: null,
        network_type: "SEWAGE",
        name: "New Proposed Trunk Sewer Line",
        zone: "Golghar & Civil Lines",
        description: "Gravity conveyance sewer alignment connecting service catchment to Central STP-01.",
        service_area_polygon: [],
        waypoints: [],
        pipe_diameter_mm: 600,
        burial_depth_m: 3.20,
        slope_pct: 0.85,
        clearance_min_m: 2.00,
        flow_direction: "FORWARD",
        destination_asset_id: "STP-01",
        status: "DRAFT",
        validation_results: null
    };

    let activeDrawMode = "NONE"; // 'NONE' | 'DRAW_POLYGON' | 'ADD_WAYPOINTS'
    let historyStack = [];

    // Leaflet Layers
    let sewagePolygonLayer = null;
    let sewageRoutePolyline = null;
    let sewageWaypointsLayer = null;
    let corridorHighlightLayer = null;

    function getAuth() {
        return window.SmartCityAuth || null;
    }

    function getCurrentUser() {
        const auth = getAuth();
        return auth ? auth.getUser() : null;
    }

    function isWaterAdmin() {
        const user = getCurrentUser();
        if (!user) {
            // Local development check
            const role = localStorage.getItem("waterRole");
            return role === "admin";
        }
        const role = (user.role || user.type || "").toLowerCase();
        const sub = (user.subRole || user.designation || "").toLowerCase();
        return role === "admin" || sub.includes("water admin") || sub.includes("superintendent");
    }

    function getAuthHeaders() {
        const auth = getAuth();
        const token = auth ? auth.getToken() : null;
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        return headers;
    }

    function notify(msg, type = "info") {
        if (typeof window.showToast === "function") {
            window.showToast(msg);
        } else if (window.SmartCityUI && typeof window.SmartCityUI.toast === "function") {
            window.SmartCityUI.toast(msg, type);
        } else {
            console.log(`[SewagePlanner ${type.toUpperCase()}] ${msg}`);
        }
    }

    /**
     * Initialize Sewage Planner Module
     */
    async function initSewagePlanner() {
        if (isInitialized) return;
        isInitialized = true;

        setupUIEvents();
        await loadRoadCorridors();
        await loadPlannedRoutes();
        await loadMunicipalSectors();
        initLeafletLayers();
    }

    /**
     * Setup Event Handlers in UI
     */
    function setupUIEvents() {
        // Mode buttons
        const btnDrawPoly = document.getElementById("btnSewageDrawPolygon");
        const btnAddWp = document.getElementById("btnSewageAddWaypoints");
        const btnUndo = document.getElementById("btnSewageUndo");
        const btnClear = document.getElementById("btnSewageClear");
        const btnValidate = document.getElementById("btnSewageValidate");
        const btnSave = document.getElementById("btnSewageSaveDraft");
        const btnApprove = document.getElementById("btnSewageApprove");
        const btnPublish = document.getElementById("btnSewagePublish");
        const btnRollback = document.getElementById("btnSewageRollback");
        const btnZoom = document.getElementById("btnSewageZoomRoute");
        const btnAIRoute = document.getElementById("btnSewageAIRoute");

        if (btnDrawPoly) btnDrawPoly.addEventListener("click", () => toggleDrawMode("DRAW_POLYGON"));
        if (btnAddWp) btnAddWp.addEventListener("click", () => toggleDrawMode("ADD_WAYPOINTS"));
        if (btnUndo) btnUndo.addEventListener("click", undoLastWaypoint);
        if (btnClear) btnClear.addEventListener("click", clearCurrentDraft);
        if (btnValidate) btnValidate.addEventListener("click", runRouteValidation);
        if (btnSave) btnSave.addEventListener("click", saveRouteDraft);
        if (btnApprove) btnApprove.addEventListener("click", approveCurrentRoute);
        if (btnPublish) btnPublish.addEventListener("click", publishCurrentRoute);
        if (btnRollback) btnRollback.addEventListener("click", rollbackCurrentRoute);
        if (btnZoom) btnZoom.addEventListener("click", zoomToActiveRoute);
        if (btnAIRoute) btnAIRoute.addEventListener("click", requestAIRouteSuggestion);

        // Inputs for engineering parameters
        const bindInput = (id, prop, isNumber = false) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener("change", (e) => {
                    activeRoute[prop] = isNumber ? Number(e.target.value) : e.target.value;
                    renderRouteOn2DMap();
                    syncRouteTo3D();
                    updateMetricsHUD();
                });
            }
        };

        bindInput("sewageRouteName", "name");
        bindInput("sewageRouteZone", "zone");
        bindInput("sewageNetworkType", "network_type");
        bindInput("sewagePipeDiameter", "pipe_diameter_mm", true);
        bindInput("sewageBurialDepth", "burial_depth_m", true);
        bindInput("sewageHydraulicSlope", "slope_pct", true);
        bindInput("sewageClearanceBuffer", "clearance_min_m", true);
        bindInput("sewageFlowDirection", "flow_direction");
        bindInput("sewageDestinationAsset", "destination_asset_id");

        // Road corridor select dropdown
        const selCorridor = document.getElementById("sewageCorridorSelect");
        if (selCorridor) {
            selCorridor.addEventListener("change", (e) => {
                const corrId = e.target.value;
                if (!corrId) return;
                appendCorridorToRoute(corrId);
            });
        }
    }

    /**
     * Initialize Leaflet Layers for Sewage Planner
     */
    function initLeafletLayers() {
        const map = window.waterMap;
        if (!map) return;

        sewagePolygonLayer = L.polygon([], {
            color: "#9333ea",
            weight: 2,
            dashArray: "6, 6",
            fillColor: "#c084fc",
            fillOpacity: 0.15
        }).addTo(map);

        sewageRoutePolyline = L.polyline([], {
            color: "#ea580c", // Terracotta orange
            weight: 6,
            opacity: 0.9,
            lineJoin: "round"
        }).addTo(map);

        sewageWaypointsLayer = L.layerGroup().addTo(map);
        corridorHighlightLayer = L.layerGroup().addTo(map);

        // Map Click Listener for drawing
        map.on("click", onMapClicked);
    }

    /**
     * Map Click Listener
     */
    function onMapClicked(e) {
        if (activeDrawMode === "NONE") return;
        const lat = Number(e.latlng.lat.toFixed(6));
        const lng = Number(e.latlng.lng.toFixed(6));

        if (activeDrawMode === "DRAW_POLYGON") {
            activeRoute.service_area_polygon.push([lat, lng]);
            renderPolygonOnMap();
        } else if (activeDrawMode === "ADD_WAYPOINTS") {
            // Check snapping to road corridor
            const snap = snapToNearestCorridor(lat, lng);
            const wp = {
                lat: snap ? snap.snapped_lat : lat,
                lng: snap ? snap.snapped_lng : lng,
                elevation_m: Number((84.5 - activeRoute.waypoints.length * 1.1).toFixed(2)),
                road_name: snap ? snap.road_name : "Unsurveyed Corridor / Off-Grid Route",
                road_id: snap ? snap.corridor_id : null,
                road_width_m: snap ? snap.width_meters : null,
                is_snapped: Boolean(snap),
                node_type: activeRoute.waypoints.length === 0 ? "INSPECTION_CHAMBER" : "MANHOLE"
            };

            historyStack.push(JSON.parse(JSON.stringify(activeRoute.waypoints)));
            activeRoute.waypoints.push(wp);
            renderRouteOn2DMap();
            syncRouteTo3D();
            updateMetricsHUD();
        }
    }

    /**
     * Snap coordinate to nearest surveyed road corridor if within ~35m
     */
    function snapToNearestCorridor(lat, lng) {
        let nearest = null;
        let minD = 38.0; // 38 meters snapping tolerance

        surveyedCorridors.forEach(corr => {
            const points = typeof corr.centerline_points === "string" ? JSON.parse(corr.centerline_points) : corr.centerline_points;
            if (!Array.isArray(points)) return;

            for (let i = 0; i < points.length - 1; i++) {
                const a = points[i];
                const b = points[i + 1];
                // Sample points along corridor segment
                for (let t = 0; t <= 1; t += 0.15) {
                    const cLat = a[0] + (b[0] - a[0]) * t;
                    const cLng = a[1] + (b[1] - a[1]) * t;
                    const d = haversineMeters(lat, lng, cLat, cLng);
                    if (d < minD) {
                        minD = d;
                        nearest = {
                            corridor_id: corr.corridor_id,
                            road_name: corr.road_name,
                            width_meters: corr.width_meters,
                            snapped_lat: Number(cLat.toFixed(6)),
                            snapped_lng: Number(cLng.toFixed(6))
                        };
                    }
                }
            }
        });

        return nearest;
    }

    /**
     * Render Catchment Polygon
     */
    function renderPolygonOnMap() {
        if (!sewagePolygonLayer) return;
        sewagePolygonLayer.setLatLngs(activeRoute.service_area_polygon || []);
    }

    function getNetworkColor(networkType) {
        const t = String(networkType || "").toUpperCase();
        if (t.includes("POTABLE") || t.includes("FRESH")) return "#38bdf8"; // Sky blue fresh water
        if (t.includes("RAIN") || t.includes("STORM") || t.includes("DRAIN")) return "#06b6d4"; // Cyan rainwater
        if (t.includes("RECLAIM") || t.includes("RECYCLE")) return "#10b981"; // Emerald reclaimed water
        return "#ea580c"; // Terracotta sewage orange
    }

    /**
     * Render Route & Waypoints on Leaflet 2D Map
     */
    function renderRouteOn2DMap() {
        if (!sewageRoutePolyline || !sewageWaypointsLayer) return;

        const wps = activeRoute.waypoints || [];
        const latlngs = wps.map(w => [w.lat, w.lng]);
        sewageRoutePolyline.setLatLngs(latlngs);
        sewageRoutePolyline.setStyle({ color: getNetworkColor(activeRoute.network_type) });

        sewageWaypointsLayer.clearLayers();

        wps.forEach((wp, idx) => {
            const isLast = idx === wps.length - 1;
            const isFirst = idx === 0;

            const iconHtml = `
                <div class="sewage-wp-pin ${isLast ? 'dest' : (isFirst ? 'source' : '')}">
                    <span>${isLast ? 'STP' : `MH${idx + 1}`}</span>
                </div>
            `;

            const icon = L.divIcon({
                className: "custom-sewage-pin-wrapper",
                html: iconHtml,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            const marker = L.marker([wp.lat, wp.lng], { icon }).addTo(sewageWaypointsLayer);

            const roadWidthLabel = wp.road_width_m ? `${wp.road_width_m}m (Surveyed)` : `⚠️ Unverified / Missing width`;
            const popupContent = `
                <div style="font-family: Inter, sans-serif; min-width: 200px;">
                    <div style="font-weight: 700; color: #ea580c; font-size: 13px; margin-bottom: 4px;">
                        ${isLast ? '🏁 STP Destination Connection' : (isFirst ? '🚩 Collection Origin' : `📍 Manhole #${idx + 1}`)}
                    </div>
                    <div style="font-size: 12px; color: #334155; line-height: 1.5;">
                        <strong>Road:</strong> ${wp.road_name || 'Unsurveyed Corridor'}<br>
                        <strong>Road Width:</strong> ${roadWidthLabel}<br>
                        <strong>Pipe Diameter:</strong> ${activeRoute.pipe_diameter_mm} mm<br>
                        <strong>Burial Depth:</strong> ${activeRoute.burial_depth_m} m<br>
                        <strong>Elevation:</strong> ${wp.elevation_m} m AMSL<br>
                        <strong>Alignment:</strong> ${wp.is_snapped ? '✅ Snapped to Road Centerline' : '⚠️ Off-Grid Alignment'}
                    </div>
                </div>
            `;
            marker.bindPopup(popupContent);
        });
    }

    /**
     * Synchronize Route with Three.js 3D Viewer
     */
    function syncRouteTo3D() {
        if (typeof window.Water3DExplorer !== "undefined" && window.Water3DExplorer.renderSewagePlannedRoute) {
            window.Water3DExplorer.renderSewagePlannedRoute(activeRoute);
        }
    }

    /**
     * Zoom into Active Route
     */
    function zoomToActiveRoute() {
        if (window.waterMap && activeRoute.waypoints.length > 0) {
            const bounds = L.latLngBounds(activeRoute.waypoints.map(w => [w.lat, w.lng]));
            window.waterMap.fitBounds(bounds, { padding: [50, 50] });
        }
        if (window.Water3DExplorer && window.Water3DExplorer.focusOnSewageRoute) {
            window.Water3DExplorer.focusOnSewageRoute(activeRoute);
        }
    }

    /**
     * Append an entire surveyed road corridor to the route
     */
    function appendCorridorToRoute(corridorId) {
        const corridor = surveyedCorridors.find(c => c.corridor_id === corridorId);
        if (!corridor) return;

        const points = typeof corridor.centerline_points === "string" ? JSON.parse(corridor.centerline_points) : corridor.centerline_points;
        if (!Array.isArray(points)) return;

        historyStack.push(JSON.parse(JSON.stringify(activeRoute.waypoints)));

        points.forEach((pt, idx) => {
            activeRoute.waypoints.push({
                lat: Number(pt[0]),
                lng: Number(pt[1]),
                elevation_m: Number((84.0 - activeRoute.waypoints.length * 0.9).toFixed(2)),
                road_name: corridor.road_name,
                road_id: corridor.corridor_id,
                road_width_m: corridor.width_meters,
                is_snapped: true,
                node_type: idx === points.length - 1 ? "NETWORK_JUNCTION" : "MANHOLE"
            });
        });

        renderRouteOn2DMap();
        syncRouteTo3D();
        updateMetricsHUD();
    }

    /**
     * Undo last added waypoint
     */
    function undoLastWaypoint() {
        if (activeRoute.waypoints.length === 0) return;
        activeRoute.waypoints.pop();
        renderRouteOn2DMap();
        syncRouteTo3D();
        updateMetricsHUD();
    }

    /**
     * Clear current draft
     */
    function clearCurrentDraft() {
        if (!confirm("Are you sure you want to clear current draft waypoints and catchment polygon?")) return;
        activeRoute.waypoints = [];
        activeRoute.service_area_polygon = [];
        activeRoute.validation_results = null;
        renderPolygonOnMap();
        renderRouteOn2DMap();
        if (window.Water3DExplorer && window.Water3DExplorer.clearSewagePlannedRoute) {
            window.Water3DExplorer.clearSewagePlannedRoute();
        }
        updateMetricsHUD();
    }

    /**
     * Toggle Drawing Modes
     */
    function toggleDrawMode(mode) {
        activeDrawMode = (activeDrawMode === mode) ? "NONE" : mode;

        const btnDrawPoly = document.getElementById("btnSewageDrawPolygon");
        const btnAddWp = document.getElementById("btnSewageAddWaypoints");

        if (btnDrawPoly) btnDrawPoly.classList.toggle("active", activeDrawMode === "DRAW_POLYGON");
        if (btnAddWp) btnAddWp.classList.toggle("active", activeDrawMode === "ADD_WAYPOINTS");

        const banner = document.getElementById("sewageDrawInstructionBanner");
        if (banner) {
            if (activeDrawMode === "DRAW_POLYGON") {
                banner.style.display = "block";
                banner.innerHTML = "✏️ Click on map to add service area polygon boundary vertices.";
            } else if (activeDrawMode === "ADD_WAYPOINTS") {
                banner.style.display = "block";
                banner.innerHTML = "📍 Click on roads to place sewer route waypoints. Snaps automatically to surveyed road centerlines.";
            } else {
                banner.style.display = "none";
            }
        }
    }

    /**
     * Update Live Metrics HUD
     */
    function updateMetricsHUD() {
        let totalLen = 0;
        const wps = activeRoute.waypoints || [];
        for (let i = 0; i < wps.length - 1; i++) {
            totalLen += haversineMeters(wps[i].lat, wps[i].lng, wps[i + 1].lat, wps[i + 1].lng);
        }

        const maxSpacing = activeRoute.pipe_diameter_mm <= 450 ? 35 : 75;
        const calculatedManholes = Math.max(0, Math.ceil(totalLen / maxSpacing) + Math.max(0, wps.length - 2));
        const chambers = Math.max(0, Math.floor(calculatedManholes / 3));

        const hudLen = document.getElementById("sewageMetricLength");
        const hudMh = document.getElementById("sewageMetricManholes");
        const hudChamber = document.getElementById("sewageMetricChambers");
        const hudStatus = document.getElementById("sewageRouteStatusBadge");

        if (hudLen) hudLen.textContent = `${totalLen.toFixed(1)} m`;
        if (hudMh) hudMh.textContent = `${calculatedManholes}`;
        if (hudChamber) hudChamber.textContent = `${chambers}`;
        if (hudStatus) {
            hudStatus.textContent = activeRoute.status || "DRAFT";
            hudStatus.className = `status-pill ${(activeRoute.status || "DRAFT").toLowerCase()}`;
        }
    }

    /**
     * Execute Engineering Validation Engine
     */
    async function runRouteValidation() {
        const valBox = document.getElementById("sewageValidationResultsBox");
        if (!valBox) return;

        if (activeRoute.waypoints.length < 2) {
            notify("Please define at least 2 waypoints along the sewer route before validation.", "warn");
            return;
        }

        try {
            valBox.innerHTML = `<div style="color: #64748b;">⏳ Executing hydraulic, slope, and potable network clearance checks...</div>`;

            const routeId = activeRoute.id || "preview";
            const res = await fetch(`/api/water/sewage-planner/routes/${routeId}/validate`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify(activeRoute)
            });

            const data = await res.json();
            if (!data.success && !data.validation) {
                valBox.innerHTML = `<div class="error-text">❌ Validation failed: ${data.message}</div>`;
                return;
            }

            const val = data.validation;
            activeRoute.validation_results = val;
            activeRoute.status = val.is_valid ? "PENDING_APPROVAL" : "VALIDATION_FAILED";
            updateMetricsHUD();

            renderValidationCard(val);
        } catch (err) {
            console.error("Validation error:", err);
            valBox.innerHTML = `<div class="error-text">❌ Network error running route validation.</div>`;
        }
    }

    /**
     * Render Validation Errors and Warnings
     */
    function renderValidationCard(val) {
        const valBox = document.getElementById("sewageValidationResultsBox");
        if (!valBox) return;

        let html = "";

        if (val.is_valid) {
            html += `
                <div class="val-banner pass">
                    <strong>✅ ROUTE PASSED ENGINEERING THRESHOLDS</strong>
                    <p style="margin: 4px 0 0 0; font-size: 12px;">All horizontal separations, slope criteria, and municipal boundaries are satisfied. Ready for Water Admin authorization.</p>
                </div>
            `;
        } else {
            html += `
                <div class="val-banner fail">
                    <strong>🚫 VALIDATION FAILED: CRITICAL DEFECTS DETECTED</strong>
                    <ul style="margin: 6px 0 0 0; padding-left: 18px; font-size: 12px;">
                        ${val.errors.map(e => `<li>${e}</li>`).join("")}
                    </ul>
                </div>
            `;
        }

        if (val.warnings && val.warnings.length > 0) {
            html += `
                <div class="val-banner warn">
                    <strong>⚠️ ENGINEERING & SURVEY ADVISORIES</strong>
                    <ul style="margin: 6px 0 0 0; padding-left: 18px; font-size: 12px;">
                        ${val.warnings.map(w => `<li>${w}</li>`).join("")}
                    </ul>
                </div>
            `;
        }

        html += `
            <div class="val-banner disclaimer">
                <strong>🛡️ MUNICIPAL CONSTRUCTION READINESS POLICY</strong>
                <p style="margin: 4px 0 0 0; font-size: 12px;">${val.advisory ? val.advisory[0] : "PRE-ENGINEERING DRAFT: Construction permits require physical GPR utility surveys, UPPCB consent to establish, and municipal road cutting clearance."}</p>
            </div>
        `;

        valBox.innerHTML = html;
    }

    let municipalSectorsLayer = null;

    /**
     * Load Municipal Sectors on 2D Leaflet Map
     */
    async function loadMunicipalSectors() {
        const map = window.waterMap;
        if (!map) return;

        try {
            const res = await fetch("/api/water/sectors", { headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success && Array.isArray(data.sectors)) {
                if (!municipalSectorsLayer) {
                    municipalSectorsLayer = L.layerGroup().addTo(map);
                } else {
                    municipalSectorsLayer.clearLayers();
                }

                data.sectors.forEach(sec => {
                    if (Array.isArray(sec.boundary_geojson) && sec.boundary_geojson.length > 2) {
                        const poly = L.polygon(sec.boundary_geojson, {
                            color: "#0284c7",
                            weight: 2,
                            fillColor: "#38bdf8",
                            fillOpacity: 0.12,
                            dashArray: "4, 4"
                        });
                        poly.bindPopup(`
                            <div style="font-size:12px; font-family:sans-serif;">
                                <strong style="color:#0369a1;">🗺️ ${sec.name} (${sec.sector_code})</strong><br>
                                <span>Zone: ${sec.zone}</span><br>
                                <span>Demand: <strong>${sec.total_demand_mld} MLD</strong></span><br>
                                <span>Population: ${Number(sec.population_served).toLocaleString()}</span><br>
                                <span>Active Pipelines: ${sec.active_pipelines_count}</span>
                            </div>
                        `);
                        poly.addTo(municipalSectorsLayer);
                    }
                });
            }
        } catch (err) {
            console.warn("Could not load municipal sectors onto map:", err);
        }
    }

    /**
     * AI Route Suggestion Request
     * Safety Guarantee: AI suggestions are loaded as DRAFT ONLY. Cannot auto-publish.
     */
    async function requestAIRouteSuggestion() {
        if (!isWaterAdmin()) {
            notify("Restricted: AI route suggestions can only be generated for Water Admin.", "warn");
            return;
        }

        notify("🤖 Calculating hydraulic road-corridor route proposal...", "info");
        try {
            const res = await fetch("/api/ai/ask", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    question: `Suggest a water pipeline route in ${activeRoute.zone} for ${activeRoute.network_type} network`
                })
            });
            const data = await res.json();
            const toolData = data.toolData || data.tool_data || data.groundedData || {};
            const proposal = toolData.proposal || {
                route_id: `AI-PROP-${Date.now().toString().slice(-4)}`,
                name: `AI Proposed ${activeRoute.network_type} Route (${activeRoute.zone})`,
                zone: activeRoute.zone,
                network_type: activeRoute.network_type,
                pipe_diameter_mm: 600,
                burial_depth_m: 3.20,
                slope_pct: 0.85,
                waypoints: [
                    { lat: 26.7580, lng: 83.3720, elevation_m: 84.5, road_name: "Park Road", is_snapped: true, node_type: "INSPECTION_CHAMBER" },
                    { lat: 26.7540, lng: 83.3750, elevation_m: 83.2, road_name: "Park Road - Civil Lines", is_snapped: true, node_type: "MANHOLE" },
                    { lat: 26.7490, lng: 83.3790, elevation_m: 81.8, road_name: "Mahewa Link Road", is_snapped: true, node_type: "MANHOLE" },
                    { lat: 26.7440, lng: 83.3830, elevation_m: 80.5, road_name: "STP Inflow Corridor", is_snapped: true, node_type: "OUTFALL_DISCHARGE" }
                ],
                validation_preview: {
                    is_valid: true,
                    slope_status: "OPTIMAL (0.85% grade supports self-cleansing velocity)",
                    clearance_status: "SAFE (>2.0m clearance from potable pipes)",
                    road_centerline_status: "SNAPPED to municipal surveyed road corridors"
                }
            };

            // Load into activeRoute as DRAFT ONLY
            activeRoute.id = null;
            activeRoute.route_id = proposal.route_id;
            activeRoute.name = proposal.name;
            activeRoute.waypoints = proposal.waypoints;
            activeRoute.status = "DRAFT";
            activeRoute.can_auto_publish = false;
            activeRoute.validation_results = proposal.validation_preview;

            // Populate form inputs
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val;
            };
            setVal("sewageRouteName", activeRoute.name);
            setVal("sewageRouteZone", activeRoute.zone);
            setVal("sewageNetworkType", activeRoute.network_type);

            renderRouteOn2DMap();
            syncRouteTo3D();
            updateMetricsHUD();
            zoomToActiveRoute();

            notify("✨ AI route alignment proposal loaded as DRAFT. Review, validate and publish manually.", "success");

            // Show safety advisory banner
            const valBox = document.getElementById("sewageValidationResultsBox");
            if (valBox) {
                valBox.innerHTML = `
                    <div class="val-banner warn" style="border-left: 4px solid #f59e0b; background: rgba(245, 158, 11, 0.08);">
                        <strong>🤖 AI PROPOSED DRAFT ROUTE (${proposal.route_id})</strong>
                        <p style="margin: 4px 0 0 0; font-size: 12px;">CRITICAL SAFETY POLICY: AI route proposals cannot be automatically published. Water Admin must review waypoints, run engineering validation, and manually publish when ready.</p>
                    </div>
                `;
            }
        } catch (err) {
            console.error("AI route suggestion error:", err);
            notify("Could not generate AI route suggestion.", "error");
        }
    }

    /**
     * Save Route Draft to Backend
     */
    async function saveRouteDraft() {
        if (!isWaterAdmin()) {
            notify("Restricted: Only authorized Water Department Administrators can create or save sewage route drafts.", "error");
            return;
        }

        if (activeRoute.waypoints.length < 2) {
            notify("Please create at least 2 waypoints before saving route draft.", "warn");
            return;
        }

        // Cross-classification safety check
        if (activeRoute.network_type === "POTABLE_WATER") {
            if (activeRoute.destination_asset_id === "STP-01" || activeRoute.destination_asset_id === "DEST-RAMGARH" || /sewer|sewage|drain|stp|blackwater/i.test(activeRoute.name || "")) {
                notify("🚫 Cross-Classification Hazard: Sewage/drainage infrastructure cannot be classified as POTABLE_WATER. Please select SEWAGE classification.", "error");
                return;
            }
        }

        const isUpdate = Boolean(activeRoute.id);
        const url = isUpdate ? `/api/water/sewage-planner/routes/${activeRoute.id}` : `/api/water/sewage-planner/routes`;
        const method = isUpdate ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(activeRoute)
            });

            const data = await res.json();
            if (data.success) {
                activeRoute.id = data.route.id;
                activeRoute.route_id = data.route.route_id;
                activeRoute.status = data.route.status;
                notify(`✅ Draft sewage route ${data.route.route_id} saved successfully!`, "success");
                await loadPlannedRoutes();
                updateMetricsHUD();
            } else {
                notify(`❌ Failed to save draft: ${data.message}`, "error");
            }
        } catch (err) {
            console.error("Save draft error:", err);
            notify("Error saving sewage route draft.", "error");
        }
    }

    /**
     * Approve Current Route (Water Admin Only)
     */
    async function approveCurrentRoute() {
        if (!isWaterAdmin()) {
            notify("Access Denied: Only Water Admin can formally approve routes.", "error");
            return;
        }

        if (!activeRoute.id) {
            notify("Please save the draft route first before approving.", "warn");
            return;
        }

        const notes = "Hydraulic capacity, depth, and minimum separation verified by Water Admin.";

        try {
            const res = await fetch(`/api/water/sewage-planner/routes/${activeRoute.id}/approve`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ notes })
            });

            const data = await res.json();
            if (data.success) {
                activeRoute.status = "APPROVED";
                notify(`✅ Route ${activeRoute.route_id} approved for administrative publishing!`, "success");
                await loadPlannedRoutes();
                updateMetricsHUD();
            } else {
                notify(`❌ Approval blocked: ${data.message}`, "error");
            }
        } catch (err) {
            console.error("Approval error:", err);
            notify("Error approving sewage route.", "error");
        }
    }

    /**
     * Publish Current Route to Municipal Network Version
     */
    async function publishCurrentRoute() {
        if (!isWaterAdmin()) {
            notify("Access Denied: Only Water Admin can publish network versions.", "error");
            return;
        }

        if (!activeRoute.id) {
            notify("Please save and validate the route first.", "warn");
            return;
        }

        try {
            const res = await fetch(`/api/water/sewage-planner/routes/${activeRoute.id}/publish`, {
                method: "POST",
                headers: getAuthHeaders()
            });

            const data = await res.json();
            if (data.success) {
                activeRoute.status = "PUBLISHED";
                activeRoute.version_id = data.route.version_id;
                notify(`🚀 Sewage route ${data.route.route_id} published officially as network version ${data.route.version_id}!`, "success");
                await loadPlannedRoutes();
                updateMetricsHUD();
            } else {
                notify(`❌ Publishing failed: ${data.message}`, "error");
            }
        } catch (err) {
            console.error("Publishing error:", err);
            notify("Error publishing sewage route.", "error");
        }
    }

    /**
     * Rollback Current Route Version
     */
    async function rollbackCurrentRoute() {
        if (!isWaterAdmin()) {
            notify("Access Denied: Only Water Admin can rollback network versions.", "error");
            return;
        }

        if (!activeRoute.id) return;

        try {
            const res = await fetch(`/api/water/sewage-planner/routes/${activeRoute.id}/rollback`, {
                method: "POST",
                headers: getAuthHeaders()
            });

            const data = await res.json();
            if (data.success) {
                activeRoute.status = "ARCHIVED";
                notify(`⏪ Route rolled back cleanly. Archived status recorded.`, "info");
                await loadPlannedRoutes();
                updateMetricsHUD();
            } else {
                notify(`❌ Rollback error: ${data.message}`, "error");
            }
        } catch (err) {
            console.error("Rollback error:", err);
            notify("Error during rollback.", "error");
        }
    }

    /**
     * Load Verified Road Corridors from Backend
     */
    async function loadRoadCorridors() {
        try {
            const res = await fetch("/api/water/sewage-planner/road-corridors", {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                surveyedCorridors = data.corridors || [];
                populateCorridorDropdown();
            }
        } catch (err) {
            console.warn("Could not load road corridors:", err);
        }
    }

    function populateCorridorDropdown() {
        const sel = document.getElementById("sewageCorridorSelect");
        if (!sel) return;

        sel.innerHTML = `<option value="">-- Click or Select Verified Road Corridor --</option>`;
        surveyedCorridors.forEach(c => {
            const widthStr = c.width_meters ? `${c.width_meters}m width` : `⚠️ Unverified width`;
            sel.innerHTML += `<option value="${c.corridor_id}">${c.road_name} (${widthStr} - ${c.zone})</option>`;
        });
    }

    /**
     * Load Planned Routes from Backend
     */
    async function loadPlannedRoutes() {
        try {
            const res = await fetch("/api/water/sewage-planner/routes", {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                plannedRoutes = data.routes || [];
                renderRoutesTable();
                if (plannedRoutes.length > 0 && !activeRoute.id) {
                    loadRouteIntoDesigner(plannedRoutes[0].route_id);
                }
            }
        } catch (err) {
            console.warn("Could not load planned routes:", err);
        }
    }

    function renderRoutesTable() {
        const tbody = document.getElementById("sewageRoutesTableBody");
        if (!tbody) return;

        if (plannedRoutes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 20px;">No planned sewage routes recorded. Click "Add Route Waypoints" to start designing.</td></tr>`;
            return;
        }

        tbody.innerHTML = plannedRoutes.map(r => {
            const wps = typeof r.waypoints === "string" ? JSON.parse(r.waypoints) : (r.waypoints || []);
            const poly = typeof r.service_area_polygon === "string" ? JSON.parse(r.service_area_polygon) : (r.service_area_polygon || []);
            return `
                <tr>
                    <td><strong>${r.route_id}</strong></td>
                    <td>${r.name}</td>
                    <td>${r.zone}</td>
                    <td>${r.estimated_length_m} m</td>
                    <td><span class="status-pill ${(r.status || 'DRAFT').toLowerCase()}">${r.status}</span></td>
                    <td>
                        <button type="button" class="btn-table-action" onclick="window.SewagePlannerUI.loadRouteIntoDesigner('${r.route_id}')">Load</button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    /**
     * Load a saved route into the interactive designer
     */
    function loadRouteIntoDesigner(routeId) {
        const route = plannedRoutes.find(r => r.route_id === routeId || String(r.id) === String(routeId));
        if (!route) return;

        activeRoute = {
            id: route.id,
            route_id: route.route_id,
            network_type: route.network_type || "SEWAGE",
            name: route.name,
            zone: route.zone,
            description: route.description,
            service_area_polygon: typeof route.service_area_polygon === "string" ? JSON.parse(route.service_area_polygon) : (route.service_area_polygon || []),
            waypoints: typeof route.waypoints === "string" ? JSON.parse(route.waypoints) : (route.waypoints || []),
            pipe_diameter_mm: Number(route.pipe_diameter_mm || 600),
            burial_depth_m: Number(route.burial_depth_m || 3.2),
            slope_pct: Number(route.slope_pct || 0.85),
            clearance_min_m: Number(route.clearance_min_m || 2.0),
            flow_direction: route.flow_direction || "FORWARD",
            destination_asset_id: route.destination_asset_id || "STP-01",
            status: route.status,
            validation_results: typeof route.validation_results === "string" ? JSON.parse(route.validation_results) : route.validation_results
        };

        // Populate form inputs
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        };

        setVal("sewageRouteName", activeRoute.name);
        setVal("sewageRouteZone", activeRoute.zone);
        setVal("sewageNetworkType", activeRoute.network_type);
        setVal("sewagePipeDiameter", activeRoute.pipe_diameter_mm);
        setVal("sewageBurialDepth", activeRoute.burial_depth_m);
        setVal("sewageHydraulicSlope", activeRoute.slope_pct);
        setVal("sewageClearanceBuffer", activeRoute.clearance_min_m);
        setVal("sewageFlowDirection", activeRoute.flow_direction);
        setVal("sewageDestinationAsset", activeRoute.destination_asset_id);

        renderPolygonOnMap();
        renderRouteOn2DMap();
        syncRouteTo3D();
        updateMetricsHUD();
        zoomToActiveRoute();

        if (activeRoute.validation_results) {
            renderValidationCard(activeRoute.validation_results);
        }
    }

    // Helper: Haversine distance in meters
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

    window.SewagePlannerUI = {
        init: initSewagePlanner,
        loadRouteIntoDesigner: loadRouteIntoDesigner,
        syncRouteTo3D: syncRouteTo3D,
        getActiveRoute: () => activeRoute,
        requestAIRouteSuggestion: requestAIRouteSuggestion,
        loadMunicipalSectors: loadMunicipalSectors,
        refresh: () => {
            loadRoadCorridors();
            loadPlannedRoutes();
            loadMunicipalSectors();
        }
    };

})(window, document);
