/**
 * SmartCity AI - Master Water Intelligence UI Controller
 * Bridges 2D Leaflet & 3D Three.js Explorer, Wastewater Recycling Safety,
 * Water Admin Route Authority, Role-Based Work Orders, and Data Provenance.
 */

(function (window, document) {
    "use strict";

    const API_BASE = (typeof window !== "undefined" && window.API_BASE_URL !== undefined)
        ? window.API_BASE_URL
        : (typeof window !== "undefined" && (window.location.port === "5000" || window.location.protocol === "file:") ? "http://localhost:5000" : "");

    let activeDimension = "2d";
    let cachedTopology = null;
    let leafletPolylines = [];
    let leafletAssetMarkers = [];

    function getAuth() {
        return window.SmartCityAuth || null;
    }

    function getAuthToken() {
        const auth = getAuth();
        return auth ? auth.getToken() : localStorage.getItem("smartCityJWT") || "";
    }

    function isWaterAdmin() {
        const auth = getAuth();
        const user = auth ? auth.getUser() : null;
        if (!user) return false;
        const role = (user.role || "").toLowerCase();
        const subRole = (user.subRole || user.designation || "").toLowerCase();
        return role === "admin" || subRole.includes("water admin") || subRole.includes("superintendent");
    }

    function authHeaders() {
        const token = getAuthToken();
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        return headers;
    }

    // -------------------------------------------------------
    // 1. 2D / 3D DIMENSION SWITCHER
    // -------------------------------------------------------
    window.toggleWaterDimension = function (dimension) {
        activeDimension = dimension;
        const map2dEl = document.getElementById("waterMap");
        const map3dEl = document.getElementById("water3DContainer");
        const btn2d = document.getElementById("btnView2D");
        const btn3d = document.getElementById("btnView3D");

        if (dimension === "3d") {
            if (map2dEl) map2dEl.style.display = "none";
            if (map3dEl) map3dEl.style.display = "block";
            if (btn2d) btn2d.classList.remove("active");
            if (btn3d) btn3d.classList.add("active");

            // Initialize and render 3D
            if (window.Water3DExplorer) {
                window.Water3DExplorer.init();
                if (cachedTopology) {
                    window.Water3DExplorer.renderTopology(cachedTopology);
                } else {
                    fetchTopologyAndRender();
                }

                // Synchronize active planned sewage route in 3D
                if (window.SewagePlannerUI && typeof window.SewagePlannerUI.syncRouteTo3D === "function") {
                    window.SewagePlannerUI.syncRouteTo3D();
                }
            }
        } else {
            if (map2dEl) map2dEl.style.display = "block";
            if (map3dEl) map3dEl.style.display = "none";
            if (btn2d) btn2d.classList.add("active");
            if (btn3d) btn3d.classList.remove("active");

            // Invalidate 2D Leaflet size
            setTimeout(() => {
                const map = window.waterLeafletMapInstance || window.waterMap;
                if (map && typeof map.invalidateSize === "function") {
                    map.invalidateSize();
                }
            }, 100);
        }
    };

    // -------------------------------------------------------
    // 2. NETWORK TOPOLOGY FETCH & SYNCHRONIZED RENDERING
    // -------------------------------------------------------
    async function fetchTopologyAndRender() {
        try {
            const res = await fetch(`${API_BASE}/api/water/network/topology`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.success) {
                cachedTopology = data;

                // Render in 2D Leaflet Map
                render2DTopologyLayers(data);

                // Render in 3D Three.js if 3D is active
                if (activeDimension === "3d" && window.Water3DExplorer) {
                    window.Water3DExplorer.renderTopology(data);
                }

                // Update Network Status Counter
                const pipeCountEl = document.getElementById("topologyTotalPipes");
                const nodeCountEl = document.getElementById("topologyTotalNodes");
                if (pipeCountEl) pipeCountEl.textContent = data.metrics.total_pipes;
                if (nodeCountEl) nodeCountEl.textContent = data.metrics.total_nodes;
            }
        } catch (e) {
            console.warn("[WaterIntelligence] Error loading network topology:", e);
        }
    }

    function render2DTopologyLayers(data) {
        const map = window.waterLeafletMapInstance || window.waterMap;
        if (!map || typeof L === "undefined") return;

        // Clear existing custom 2D topology layers
        leafletPolylines.forEach(l => map.removeLayer(l));
        leafletPolylines = [];
        leafletAssetMarkers.forEach(m => map.removeLayer(m));
        leafletAssetMarkers = [];

        // 1. Draw Pipelines on Leaflet Map
        const edges = data.edges || [];
        edges.forEach(edge => {
            const sLat = Number(edge.start_lat);
            const sLng = Number(edge.start_lng);
            const eLat = Number(edge.end_lat);
            const eLng = Number(edge.end_lng);

            if (isNaN(sLat) || isNaN(eLat)) return;

            // Pipeline Color Coding
            let color = "#0284c7"; // Potable Clean Water (Cyan Blue)
            let dashArray = null;
            let weight = 4;

            if (edge.pipe_type === "WASTEWATER") {
                color = "#92400e"; // Untreated Wastewater (Amber Brown)
                dashArray = "8, 6";
                weight = 5;
            } else if (edge.pipe_type === "RECLAIMED") {
                color = "#10b981"; // Reclaimed Water (Emerald Teal)
                dashArray = "12, 4";
                weight = 4;
            }

            if (edge.status && (edge.status.includes("Leak") || edge.status.includes("Low Pressure"))) {
                color = "#ef4444";
                weight = 6;
            }

            const polyline = L.polyline([[sLat, sLng], [eLat, eLng]], {
                color,
                weight,
                dashArray,
                opacity: 0.9
            }).addTo(map);

            polyline.bindTooltip(`<b>${edge.id}</b>: ${edge.name} (${edge.pipe_type})<br>Pressure: ${edge.pressure_bar} bar | Flow: ${edge.flow_rate_lps} L/s`, {
                sticky: true
            });

            polyline.on("click", () => {
                window.inspectWaterAsset(edge.id, edge);
            });

            leafletPolylines.push(polyline);
        });

        // 2. Plot Network Infrastructure Assets (STP, WTP, Pumps, Valves, Outfalls)
        const nodes = data.nodes || [];
        nodes.forEach(node => {
            if (node.type === "TANK") return; // Tanks are handled by base water.js

            const iconMap = {
                TREATMENT_PLANT_STP: { symbol: "🏭", bg: "#7c3aed" },
                TREATMENT_PLANT_WTP: { symbol: "💧", bg: "#0284c7" },
                BOOSTER_PUMP: { symbol: "⚡", bg: "#f59e0b" },
                CONTROL_VALVE: { symbol: "🎛️", bg: "#10b981" },
                NETWORK_JUNCTION: { symbol: "🔀", bg: "#475569" },
                DISCHARGE_POINT: { symbol: "🌊", bg: "#06b6d4" }
            };

            const cfg = iconMap[node.type] || { symbol: "📍", bg: "#3b82f6" };

            const customIcon = L.divIcon({
                className: "water-network-asset-marker",
                html: `
                    <div style="width: 32px; height: 32px; border-radius: 8px; background: ${cfg.bg}; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 15px; cursor: pointer;">
                        ${cfg.symbol}
                    </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            const marker = L.marker([node.lat, node.lng], { icon: customIcon }).addTo(map);

            marker.bindPopup(`
                <div style="min-width: 220px; font-family: sans-serif;">
                    <div style="font-size: 11px; font-weight: 800; color: ${cfg.bg}; text-transform: uppercase;">● ${node.type.replace(/_/g, ' ')}</div>
                    <h4 style="margin: 3px 0 6px; font-size: 14px; color: #0f172a;">${node.name}</h4>
                    <p style="margin: 2px 0; font-size: 12px; color: #64748b;">ID: <strong>${node.id}</strong> | Zone: ${node.zone}</p>
                    <p style="margin: 2px 0; font-size: 12px; color: #334155;">Status: <span style="font-weight:700; color:#10b981;">${node.status}</span></p>
                    <button onclick="window.inspectWaterAsset('${node.id}')" style="margin-top: 8px; width: 100%; padding: 6px; background: #0284c7; color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
                        Open 3D Telemetry Inspector
                    </button>
                </div>
            `);

            leafletAssetMarkers.push(marker);
        });
    }

    // -------------------------------------------------------
    // 3. ASSET INSPECTION DRAWER (CLICK TO INSPECT)
    // -------------------------------------------------------
    window.inspectWaterAsset = async function (assetId, preloadedData = null) {
        const drawer = document.getElementById("waterAssetDrawer");
        if (!drawer) return;

        drawer.classList.add("active");
        drawer.style.display = "block";

        const titleEl = document.getElementById("drawerAssetTitle");
        const idEl = document.getElementById("drawerAssetId");
        const typeEl = document.getElementById("drawerAssetType");
        const zoneEl = document.getElementById("drawerAssetZone");
        const statusEl = document.getElementById("drawerAssetStatus");
        const telemetryEl = document.getElementById("drawerTelemetryBody");
        const workOrdersEl = document.getElementById("drawerWorkOrdersList");
        const provenanceEl = document.getElementById("drawerProvenanceBadge");

        if (titleEl) titleEl.textContent = "Loading Asset Telemetry...";

        try {
            const res = await fetch(`${API_BASE}/api/water/network/assets/${assetId}`);
            let assetData = preloadedData;
            if (res.ok) {
                const resJson = await res.json();
                if (resJson.success && resJson.asset) {
                    assetData = resJson.asset;
                }
            }

            if (!assetData) {
                if (titleEl) titleEl.textContent = `Asset ${assetId}`;
                return;
            }

            if (titleEl) titleEl.textContent = assetData.name || assetId;
            if (idEl) idEl.textContent = assetData.asset_id || assetData.pipeline_code || assetId;
            if (typeEl) typeEl.textContent = (assetData.asset_type || assetData.pipe_type || "INFRASTRUCTURE").replace(/_/g, ' ');
            if (zoneEl) zoneEl.textContent = assetData.zone || "Gorakhpur Municipal Grid";
            if (statusEl) {
                statusEl.textContent = assetData.status || "OPERATIONAL";
                statusEl.style.color = (assetData.status || "").includes("Leak") ? "#ef4444" : "#10b981";
            }

            // Provenance Badge (Accurately reflects data origin: SIMULATED / MEASURED / STALE / UNAVAILABLE / HARDWARE UNVERIFIED)
            // Physical field SCADA hardware is unverified in this testbed runtime.
            if (provenanceEl) {
                const src = String(assetData.data_source || "").toUpperCase();
                const isOffline = assetData.status === "OFFLINE" || assetData.status === "UNAVAILABLE";
                const updatedTime = assetData.updated_at ? new Date(assetData.updated_at).getTime() : 0;
                const isStale = updatedTime && (Date.now() - updatedTime > 7 * 24 * 3600 * 1000);

                let badgeHtml = "";
                if (isOffline) {
                    badgeHtml = `<span style="background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.4); padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;">⚪ UNAVAILABLE</span>`;
                } else if (isStale) {
                    badgeHtml = `<span style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;">🟠 STALE TELEMETRY</span>`;
                } else if (src === "SIMULATED") {
                    badgeHtml = `<span style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4); padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;">🟡 SIMULATED SCADA</span>`;
                } else {
                    // Physical hardware is not connected in local environment
                    badgeHtml = `<span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;">🔵 MEASURED (HARDWARE UNVERIFIED)</span>`;
                }
                provenanceEl.innerHTML = badgeHtml;
            }

            // Telemetry Body
            if (telemetryEl) {
                let html = "";
                if (assetData.pipe_type || assetData.pressure_bar !== undefined) {
                    // Pipeline Attributes
                    html += `
                        <div class="inspector-stat-grid">
                            <div class="stat-box"><span class="lbl">Operating Pressure</span><span class="val">${assetData.pressure_bar || 2.4} bar</span></div>
                            <div class="stat-box"><span class="lbl">Flow Rate</span><span class="val">${assetData.flow_rate_lps || 55} L/s</span></div>
                            <div class="stat-box"><span class="lbl">Diameter</span><span class="val">${assetData.diameter_mm || 450} mm</span></div>
                            <div class="stat-box"><span class="lbl">Pipe Material</span><span class="val">${assetData.material || 'Ductile Iron'}</span></div>
                            <div class="stat-box"><span class="lbl">Underground Depth</span><span class="val">${assetData.depth_meters || 2.4} m</span></div>
                            <div class="stat-box"><span class="lbl">Classification</span><span class="val" style="color:#38bdf8;">${assetData.pipe_type || 'POTABLE'}</span></div>
                        </div>
                    `;
                } else if (assetData.capacity_liters || assetData.current_level_percent !== undefined) {
                    // Tank Attributes
                    html += `
                        <div class="inspector-stat-grid">
                            <div class="stat-box"><span class="lbl">Current Storage</span><span class="val" style="color:#0ea5e9;">${assetData.current_level_percent || 50}%</span></div>
                            <div class="stat-box"><span class="lbl">Total Capacity</span><span class="val">${Number(assetData.capacity_liters || 50000).toLocaleString()} L</span></div>
                            <div class="stat-box"><span class="lbl">Pump Telemetry</span><span class="val" style="color:#10b981;">${assetData.pump_status || 'ON'}</span></div>
                            <div class="stat-box"><span class="lbl">Quality Index</span><span class="val">${assetData.water_quality_score || 92}/100</span></div>
                        </div>
                    `;
                } else {
                    // Plant / Pump Attributes
                    html += `
                        <div style="background: rgba(30, 41, 59, 0.5); padding: 12px; border-radius: 8px; font-size: 13px;">
                            <div>📍 Coordinates: <strong>${Number(assetData.latitude || 26.76).toFixed(4)}, ${Number(assetData.longitude || 83.37).toFixed(4)}</strong></div>
                            <div style="margin-top: 4px;">⚡ Elevation: <strong>${assetData.elevation_m || 82.5} meters AMSL</strong></div>
                        </div>
                    `;
                }
                telemetryEl.innerHTML = html;
            }

            // Work Orders List
            if (workOrdersEl) {
                const orders = assetData.work_orders || [];
                if (orders.length === 0) {
                    workOrdersEl.innerHTML = `<div style="font-size: 12px; color: #94a3b8; font-style: italic;">No pending maintenance work orders.</div>`;
                } else {
                    workOrdersEl.innerHTML = orders.map(o => `
                        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid #334155; padding: 10px; border-radius: 8px; margin-bottom: 8px; font-size: 12px;">
                            <div style="font-weight: 700; color: #f8fafc;">#${o.order_id}: ${o.title}</div>
                            <div style="color: #94a3b8; margin-top: 2px;">Assigned: ${o.assigned_to_name} (${o.required_role}) | Priority: <strong style="color:#f59e0b;">${o.priority}</strong></div>
                            <div style="color: #38bdf8; margin-top: 2px;">Status: ${o.status} | Due: ${o.deadline}</div>
                        </div>
                    `).join("");
                }
            }

            // Highlight in 3D Scene if available
            if (window.Water3DExplorer) {
                window.Water3DExplorer.highlightAsset(assetId);
            }
        } catch (err) {
            console.error("Inspect asset error:", err);
        }
    };

    window.closeWaterAssetDrawer = function () {
        const drawer = document.getElementById("waterAssetDrawer");
        if (drawer) {
            drawer.classList.remove("active");
            drawer.style.display = "none";
        }
    };

    // -------------------------------------------------------
    // 4. WASTEWATER TREATMENT & RECYCLING BATCHES
    // -------------------------------------------------------
    window.fetchTreatmentBatches = async function () {
        const tableBody = document.getElementById("treatmentBatchesTableBody");
        if (!tableBody) return;

        try {
            const res = await fetch(`${API_BASE}/api/water/treatment/batches`, { headers: authHeaders() });
            if (!res.ok) return;
            const data = await res.json();
            const batches = data.batches || [];

            if (batches.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#94a3b8;">No treatment batches recorded.</td></tr>`;
                return;
            }

            tableBody.innerHTML = batches.map(b => {
                const isCompliant = (b.quality_status === "COMPLIANT");
                const qColor = isCompliant ? "#10b981" : "#ef4444";
                const canApprove = (b.approval_status === "PENDING_APPROVAL" && isCompliant);

                return `
                    <tr>
                        <td><strong>${b.batch_id}</strong></td>
                        <td>${b.plant_name}</td>
                        <td>${Number(b.inlet_volume_kl).toLocaleString()} / ${Number(b.outlet_volume_kl).toLocaleString()} kL</td>
                        <td><span style="color:#38bdf8;font-weight:700;">${b.stage.replace(/_/g, ' ')}</span></td>
                        <td>
                            <div style="font-size:11px;">
                                BOD: <strong>${b.bod_mg_l}</strong> mg/L (≤10)<br>
                                COD: <strong>${b.cod_mg_l}</strong> mg/L (≤50)<br>
                                TSS: <strong>${b.tss_mg_l}</strong> mg/L (≤20)<br>
                                pH: <strong>${b.ph}</strong>
                            </div>
                        </td>
                        <td>
                            <span style="background: ${isCompliant ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color: ${qColor}; border: 1px solid ${qColor}; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 800;">
                                ${b.quality_status}
                            </span>
                            <div style="font-size:10px; color:#94a3b8; margin-top:4px;">Appr: <strong>${b.approval_status}</strong></div>
                        </td>
                        <td>
                            ${b.approval_status === "APPROVED" 
                                ? `<span style="color:#10b981;font-size:11px;font-weight:700;">✓ Reused at ${b.reuse_destination.replace(/_/g, ' ')}</span>`
                                : (isCompliant 
                                    ? `<button onclick="window.authorizeReuseBatch('${b.batch_id}')" style="background:#10b981;color:white;border:none;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">Authorize Reuse</button>`
                                    : `<span style="color:#ef4444;font-size:11px;font-weight:700;">🚫 Blocked (Non-Compliant)</span>`
                                )
                            }
                            <button onclick="window.openLabVerifyModal('${b.batch_id}')" style="background:#334155;color:#f8fafc;border:none;padding:5px 8px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;margin-left:4px;">Log Lab Test</button>
                        </td>
                    </tr>
                `;
            }).join("");
        } catch (e) {
            console.warn("Error fetching treatment batches:", e);
        }
    };

    window.authorizeReuseBatch = async function (batchId) {
        if (!confirm(`Are you sure you want to approve Batch ${batchId} for municipal reuse? This will authorize effluent valve discharge for ecological replenishment.`)) return;

        try {
            const res = await fetch(`${API_BASE}/api/water/treatment/batches/${batchId}/approve-reuse`, {
                method: "PUT",
                headers: authHeaders(),
                body: JSON.stringify({
                    reuse_destination: "RAMGARH_TAL_LAKE",
                    comments: "Approved via Water Admin operations console."
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                if (window.SmartCityUI) {
                    window.SmartCityUI.toast(`Batch ${batchId} approved for Ramgarh Tal lake replenishment!`, "success");
                } else {
                    alert(`Success: ${data.message}`);
                }
                window.fetchTreatmentBatches();
            } else {
                alert(`Approval Blocked: ${data.message}`);
            }
        } catch (err) {
            alert(`Error authorizing reuse: ${err.message}`);
        }
    };

    // -------------------------------------------------------
    // 5. WATER ADMIN ROUTE PROPOSALS & NETWORK VERSIONS
    // -------------------------------------------------------
    window.fetchNetworkVersions = async function () {
        const listEl = document.getElementById("networkVersionsList");
        if (!listEl) return;

        try {
            const res = await fetch(`${API_BASE}/api/water/admin/network-versions`, { headers: authHeaders() });
            if (!res.ok) return;
            const data = await res.json();
            const versions = data.versions || [];

            listEl.innerHTML = versions.map(v => {
                const isPublished = (v.status === "PUBLISHED");
                return `
                    <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid ${isPublished ? '#10b981' : '#334155'}; border-radius: 10px; padding: 14px; margin-bottom: 12px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <span style="font-weight: 800; font-size: 15px; color: #f8fafc;">${v.change_title}</span>
                                <span style="margin-left: 8px; font-size: 11px; background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 2px 8px; border-radius: 4px; font-weight: 700;">${v.version_number}</span>
                            </div>
                            <span style="font-size: 11px; font-weight: 800; color: ${isPublished ? '#10b981' : '#f59e0b'}; background: ${isPublished ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)'}; padding: 3px 8px; border-radius: 999px;">
                                ${v.status}
                            </span>
                        </div>
                        <p style="font-size: 12px; color: #cbd5e1; margin: 6px 0;">${v.description || 'Route configuration proposal'}</p>
                        <div style="font-size: 11px; color: #94a3b8; display:flex; gap:16px;">
                            <span>Zones: <strong>${v.affected_zones}</strong></span>
                            <span>Author: <strong>${v.author_name}</strong></span>
                            ${v.approver_name ? `<span>Approver: <strong>${v.approver_name}</strong></span>` : ''}
                        </div>
                        ${!isPublished && isWaterAdmin() ? `
                            <div style="margin-top: 10px; display:flex; gap:8px;">
                                <button onclick="window.publishNetworkVersion('${v.version_id}')" style="background:#2563eb; color:white; border:none; padding:6px 14px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;">
                                    Publish Network Version
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join("");
        } catch (e) {
            console.warn("Error fetching network versions:", e);
        }
    };

    window.publishNetworkVersion = async function (versionId) {
        if (!confirm(`Are you sure you want to publish network version ${versionId}? This action will permanently update the municipal pipeline GIS configuration.`)) return;

        try {
            const res = await fetch(`${API_BASE}/api/water/admin/network-versions/${versionId}/publish`, {
                method: "POST",
                headers: authHeaders()
            });

            const data = await res.json();
            if (res.ok && data.success) {
                alert(`Version Published Successfully: ${data.message}`);
                window.fetchNetworkVersions();
                fetchTopologyAndRender();
            } else {
                alert(`Failed to publish version: ${data.message}`);
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    window.validateDraftRouteProposal = async function () {
        const code = document.getElementById("propPipeCode")?.value;
        const name = document.getElementById("propPipeName")?.value;
        const type = document.getElementById("propPipeType")?.value;
        const sLat = document.getElementById("propStartLat")?.value;
        const sLng = document.getElementById("propStartLng")?.value;
        const eLat = document.getElementById("propEndLat")?.value;
        const eLng = document.getElementById("propEndLng")?.value;
        const diam = document.getElementById("propDiameter")?.value;
        const zone = document.getElementById("propZone")?.value;

        const resultBox = document.getElementById("routeValidationResult");
        if (!resultBox) return;

        resultBox.style.display = "block";
        resultBox.innerHTML = "<span style='color:#38bdf8;'>Validating network topology against Gorakhpur GIS coordinates...</span>";

        try {
            const res = await fetch(`${API_BASE}/api/water/admin/network-versions/validate-route`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                    pipeline_code: code,
                    name: name,
                    pipe_type: type,
                    start_lat: sLat,
                    start_lng: sLng,
                    end_lat: eLat,
                    end_lng: eLng,
                    diameter_mm: diam,
                    zone: zone
                })
            });

            const data = await res.json();
            if (data.is_valid) {
                resultBox.innerHTML = `
                    <div style="background:rgba(16,185,129,0.15); border:1px solid #10b981; padding:10px; border-radius:8px; font-size:12px; color:#f8fafc;">
                        <strong style="color:#10b981;">✓ Route Topology Valid</strong><br>
                        • Length: <strong>${data.estimated_length_km} km</strong><br>
                        • Estimated Head Loss: <strong>${data.hydraulic_assessment.head_loss_estimated_meters} m</strong><br>
                        • Recommended Pressure: <strong>${data.hydraulic_assessment.recommended_operating_pressure_bar} bar</strong>
                    </div>
                `;
            } else {
                resultBox.innerHTML = `
                    <div style="background:rgba(239,68,68,0.15); border:1px solid #ef4444; padding:10px; border-radius:8px; font-size:12px; color:#fca5a5;">
                        <strong>⚠️ Validation Issues Detected:</strong><br>
                        ${data.errors.map(e => `• ${e}`).join("<br>")}
                    </div>
                `;
            }
        } catch (e) {
            resultBox.innerHTML = `<span style='color:#ef4444;'>Validation failed: ${e.message}</span>`;
        }
    };

    // -------------------------------------------------------
    // 6. ROLE-SPECIFIC WORK ORDERS COMMAND DESK
    // -------------------------------------------------------
    window.fetchWorkOrders = async function () {
        const listEl = document.getElementById("workOrdersTableBody");
        if (!listEl) return;

        try {
            const res = await fetch(`${API_BASE}/api/water/work-orders`, { headers: authHeaders() });
            if (!res.ok) return;
            const data = await res.json();
            const orders = data.orders || [];

            if (orders.length === 0) {
                listEl.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:18px;">No assigned work orders.</td></tr>`;
                return;
            }

            const statusColors = {
                ASSIGNED: "#38bdf8",
                ACKNOWLEDGED: "#60a5fa",
                IN_PROGRESS: "#f59e0b",
                BLOCKED: "#ef4444",
                RESOLVED: "#10b981",
                VERIFIED: "#8b5cf6",
                COMPLETED: "#10b981",
                CANCELLED: "#64748b"
            };

            const user = getAuth() ? getAuth().getUser() : null;
            const isAdmin = isWaterAdmin() || (user && (user.role === "admin" || user.role === "super_admin"));

            listEl.innerHTML = orders.map(o => {
                const sColor = statusColors[o.status] || "#94a3b8";
                const netType = o.network_type ? `<span style="font-size:10px; background:rgba(56,189,248,0.15); color:#38bdf8; padding:1px 5px; border-radius:4px; margin-left:4px;">${o.network_type}</span>` : "";

                return `
                <tr>
                    <td>
                        <strong>${o.order_id || o.order_number}</strong><br>
                        ${netType}
                    </td>
                    <td>
                        <strong>${o.title}</strong>
                        ${o.observations ? `<br><small style="color:#94a3b8;">Obs: ${o.observations}</small>` : ''}
                        ${o.blocked_reason ? `<br><small style="color:#ef4444;">Blocked: ${o.blocked_reason}</small>` : ''}
                    </td>
                    <td>
                        <button type="button" onclick="window.focusWorkOrderPipe('${o.asset_id || o.pipe_id}')" style="background:none; border:none; color:#38bdf8; text-decoration:underline; cursor:pointer; font-weight:700; font-size:12px;" title="Highlight in 2D & 3D">
                            🎯 ${o.asset_id || o.pipe_id}
                        </button><br>
                        <small style="color:#94a3b8;">${o.zone || 'Central Zone'}</small>
                    </td>
                    <td>
                        <strong>${(o.required_role || 'STAFF').replace(/_/g, ' ')}</strong><br>
                        <small style="color:#cbd5e1;">👤 ${o.assigned_to_name || o.assigned_to || 'Unassigned'}</small>
                        ${isAdmin ? `<button type="button" onclick="window.promptReassignWorkOrder('${o.order_id || o.order_number}')" style="font-size:10px; background:rgba(255,255,255,0.08); border:1px solid #475569; color:#94a3b8; border-radius:4px; padding:1px 4px; margin-left:4px; cursor:pointer;" title="Reassign staff">🔄</button>` : ''}
                    </td>
                    <td><span style="color:${o.priority === 'CRITICAL' ? '#ef4444' : (o.priority === 'HIGH' ? '#f97316' : '#f59e0b')}; font-weight:700;">${o.priority}</span></td>
                    <td><small style="color:#cbd5e1;">${o.deadline || '--'}</small></td>
                    <td>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${sColor};"></span>
                            <select onchange="window.transitionWorkOrderStatus('${o.order_id || o.order_number}', this.value, '${o.status}')" style="background:#0f172a; color:#f8fafc; border:1px solid #334155; padding:4px 6px; border-radius:6px; font-size:11px; cursor:pointer;">
                                <option value="ASSIGNED" ${o.status === 'ASSIGNED' ? 'selected' : ''}>ASSIGNED</option>
                                <option value="ACKNOWLEDGED" ${o.status === 'ACKNOWLEDGED' ? 'selected' : ''}>ACKNOWLEDGED</option>
                                <option value="IN_PROGRESS" ${o.status === 'IN_PROGRESS' ? 'selected' : ''}>IN_PROGRESS</option>
                                <option value="BLOCKED" ${o.status === 'BLOCKED' ? 'selected' : ''}>BLOCKED</option>
                                <option value="RESOLVED" ${o.status === 'RESOLVED' ? 'selected' : ''}>RESOLVED</option>
                                <option value="VERIFIED" ${o.status === 'VERIFIED' ? 'selected' : ''} ${!isAdmin ? 'disabled' : ''}>VERIFIED (Admin)</option>
                                <option value="CANCELLED" ${o.status === 'CANCELLED' ? 'selected' : ''} ${!isAdmin ? 'disabled' : ''}>CANCELLED (Admin)</option>
                            </select>
                        </div>
                    </td>
                </tr>`;
            }).join("");
        } catch (e) {
            console.warn("Error fetching work orders:", e);
        }
    };
    window.loadWorkOrders = window.fetchWorkOrders;

    window.transitionWorkOrderStatus = async function (orderId, newStatus, currentStatus) {
        if (newStatus === currentStatus) return;

        const user = getAuth() ? getAuth().getUser() : null;
        const isAdmin = isWaterAdmin() || (user && (user.role === "admin" || user.role === "super_admin"));

        if ((newStatus === "VERIFIED" || newStatus === "CANCELLED") && !isAdmin) {
            alert("⚠️ Policy Control: Only Water Admin or Super Admin can mark tasks as VERIFIED or CANCELLED.");
            window.fetchWorkOrders();
            return;
        }

        let observations = "";
        let blockedReason = "";
        let evidenceNotes = "";

        if (newStatus === "BLOCKED") {
            blockedReason = prompt("Please provide reason for blocking this work order (e.g. Utility clash, flooding, missing equipment):");
            if (!blockedReason) {
                alert("Action cancelled: Blocked reason is required.");
                window.fetchWorkOrders();
                return;
            }
        } else if (newStatus === "RESOLVED" || newStatus === "VERIFIED") {
            observations = prompt(`Enter inspection observations / repair notes for ${newStatus}:`, "Repairs completed and hydraulic pressure restored.") || "";
            evidenceNotes = prompt("Enter photo / sensor verification evidence reference (optional):", "Visual inspection confirmed zero leakage.") || "";
        } else if (newStatus === "IN_PROGRESS") {
            observations = prompt("Enter work start notes (optional):", "Team dispatched to site.") || "";
        }

        try {
            const res = await fetch(`${API_BASE}/api/water/work-orders/${orderId}/status`, {
                method: "PUT",
                headers: authHeaders(),
                body: JSON.stringify({
                    status: newStatus,
                    observations: observations,
                    blocked_reason: blockedReason,
                    evidence_notes: evidenceNotes
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                if (window.SmartCityUI && window.SmartCityUI.toast) {
                    window.SmartCityUI.toast(`Work order ${orderId} transitioned to ${newStatus}`, "success");
                } else {
                    alert(`✅ Work order ${orderId} transitioned to ${newStatus}`);
                }
                window.fetchWorkOrders();
            } else {
                alert(`⚠️ Error: ${data.message || 'Failed to update work order'}`);
                window.fetchWorkOrders();
            }
        } catch (e) {
            alert(`Network error: ${e.message}`);
            window.fetchWorkOrders();
        }
    };
    window.updateWorkOrderStatus = window.transitionWorkOrderStatus;

    window.promptReassignWorkOrder = async function (orderId) {
        const staffId = prompt("Enter Staff Officer / Engineer ID to reassign (e.g. WTR-ENG-01, WTR001):");
        if (!staffId) return;
        const notes = prompt("Enter reassignment instruction note:", "Reassigned per shift roster.") || "";

        try {
            const res = await fetch(`${API_BASE}/api/water/work-orders/${orderId}/reassign`, {
                method: "PUT",
                headers: authHeaders(),
                body: JSON.stringify({ assigned_to: staffId, notes: notes })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(`✅ Task ${orderId} reassigned to ${staffId}`);
                window.fetchWorkOrders();
            } else {
                alert(`⚠️ Reassignment failed: ${data.message}`);
            }
        } catch (e) {
            alert(`Network error: ${e.message}`);
        }
    };

    window.focusWorkOrderPipe = function (pipeOrAssetId) {
        if (!pipeOrAssetId) return;
        // Highlight in 3D
        if (window.Water3DExplorer && typeof window.Water3DExplorer.highlightAsset === "function") {
            window.Water3DExplorer.highlightAsset(pipeOrAssetId);
        }
        // Pan Leaflet 2D Map if available
        const map = window.waterLeafletMapInstance || window.waterMap;
        if (map && leafletPolylines.length > 0) {
            const matched = leafletPolylines.find(p => p.assetId === pipeOrAssetId);
            if (matched) {
                map.fitBounds(matched.getBounds(), { maxZoom: 16 });
                matched.openPopup();
            }
        }
    };

    // -------------------------------------------------------
    // 7. TELEMETRY SIMULATOR TOGGLE
    // -------------------------------------------------------
    window.toggleTelemetrySimulator = async function () {
        try {
            const res = await fetch(`${API_BASE}/api/water/telemetry/mode`);
            const curr = await res.json();
            const nextState = !curr.simulator_active;

            const updateRes = await fetch(`${API_BASE}/api/water/telemetry/toggle-simulator`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({ active: nextState })
            });

            if (updateRes.ok) {
                const updated = await updateRes.json();
                updateTelemetryBadge(updated.simulator_active);
                fetchTopologyAndRender();
            }
        } catch (e) {
            console.warn("Error toggling simulator:", e);
        }
    };

    function updateTelemetryBadge(isActive) {
        const badge = document.getElementById("telemetryModeBadge");
        if (badge) {
            badge.innerHTML = isActive 
                ? "● Telemetry: <strong>SIMULATED SCADA</strong>"
                : "● Telemetry: <strong>DATABASE RECORDS (HARDWARE UNVERIFIED)</strong>";
            badge.style.color = isActive ? "#f59e0b" : "#38bdf8";
        }
    }

    // Aliases
    window.switchWaterView = window.toggleWaterDimension;
    window.toggleTelemetrySimulatorMode = window.toggleTelemetrySimulator;

    // -------------------------------------------------------
    // 8. MODAL HANDLERS & FORM SUBMISSIONS
    // -------------------------------------------------------
    window.openLabVerifyModal = function (batchId) {
        const modal = document.getElementById("verifyQualityModal");
        if (!modal) return;
        const idInput = document.getElementById("vBatchId");
        if (idInput) idInput.value = batchId;
        const sub = document.getElementById("verifyQualityModalSubtitle");
        if (sub) sub.textContent = `Log certified laboratory analysis for Treatment Batch: ${batchId}`;
        modal.style.display = "flex";
    };

    window.submitLabVerification = async function (e) {
        if (e && e.preventDefault) e.preventDefault();
        const batchId = document.getElementById("vBatchId")?.value;
        const bod = Number(document.getElementById("vBod")?.value || 8.5);
        const cod = Number(document.getElementById("vCod")?.value || 35);
        const tss = Number(document.getElementById("vTss")?.value || 12);
        const ph = Number(document.getElementById("vPh")?.value || 7.3);
        const coliform = Number(document.getElementById("vColiform")?.value || 45);
        const chemist = document.getElementById("vChemist")?.value || "Dr. S. Verma (Senior Water Chemist)";

        try {
            const res = await fetch(`${API_BASE}/api/water/treatment/batches/${batchId}/verify-quality`, {
                method: "PUT",
                headers: authHeaders(),
                body: JSON.stringify({
                    bod_mg_l: bod,
                    cod_mg_l: cod,
                    tss_mg_l: tss,
                    ph: ph,
                    fecal_coliform_mpn_100ml: coliform,
                    laboratory_certified_by: chemist
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                alert(`Lab Verification Logged! Result: ${data.batch.quality_status}`);
                const modal = document.getElementById("verifyQualityModal");
                if (modal) modal.style.display = "none";
                window.fetchTreatmentBatches();
            } else {
                alert(`Error: ${data.message || 'Verification update failed'}`);
            }
        } catch (err) {
            alert(`Network error: ${err.message}`);
        }
    };

    window.openCreateBatchModal = function () {
        const modal = document.getElementById("createBatchModal");
        if (modal) modal.style.display = "flex";
    };

    window.submitCreateBatch = async function (e) {
        if (e && e.preventDefault) e.preventDefault();
        const plant = document.getElementById("cbPlant")?.value || "STP-01 (Ramgarh Tal Central STP)";
        const inlet = Number(document.getElementById("cbInlet")?.value || 25000);
        const outlet = Number(document.getElementById("cbOutlet")?.value || 23800);
        const stage = document.getElementById("cbStage")?.value || "TERTIARY_DISINFECTED";
        const bod = Number(document.getElementById("cbBod")?.value || 9.0);
        const cod = Number(document.getElementById("cbCod")?.value || 40.0);
        const tss = Number(document.getElementById("cbTss")?.value || 14.0);
        const ph = Number(document.getElementById("cbPh")?.value || 7.2);
        const dest = document.getElementById("cbDest")?.value || "RAMGARH_TAL_LAKE";

        try {
            const res = await fetch(`${API_BASE}/api/water/treatment/batches`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                    plant_name: plant,
                    inlet_volume_kl: inlet,
                    outlet_volume_kl: outlet,
                    stage: stage,
                    bod_mg_l: bod,
                    cod_mg_l: cod,
                    tss_mg_l: tss,
                    ph: ph,
                    reuse_destination: dest
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                alert(`Batch Created: ${data.batch.batch_id} (Status: ${data.batch.quality_status})`);
                const modal = document.getElementById("createBatchModal");
                if (modal) modal.style.display = "none";
                window.fetchTreatmentBatches();
            } else {
                alert(`Error: ${data.message || 'Creation failed'}`);
            }
        } catch (err) {
            alert(`Network error: ${err.message}`);
        }
    };

    window.openCreateWorkOrderModal = function () {
        const modal = document.getElementById("createWorkOrderModal");
        if (modal) modal.style.display = "flex";
    };

    window.submitCreateWorkOrder = async function (e) {
        if (e && e.preventDefault) e.preventDefault();
        const title = document.getElementById("cwoTitle")?.value;
        const asset = document.getElementById("cwoAsset")?.value;
        const role = document.getElementById("cwoRole")?.value;
        const assignee = document.getElementById("cwoAssignee")?.value;
        const priority = document.getElementById("cwoPriority")?.value;
        const zone = document.getElementById("cwoZone")?.value;
        const deadline = document.getElementById("cwoDeadline")?.value;
        const desc = document.getElementById("cwoDesc")?.value;

        try {
            const res = await fetch(`${API_BASE}/api/water/work-orders`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                    title: title,
                    asset_id: asset,
                    required_role: role,
                    assigned_to_name: assignee,
                    priority: priority,
                    zone: zone,
                    deadline: deadline,
                    description: desc
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                alert(`Work Order ${data.order.order_id} assigned successfully!`);
                const modal = document.getElementById("createWorkOrderModal");
                if (modal) modal.style.display = "none";
                window.fetchWorkOrders();
            } else {
                alert(`Error: ${data.message || 'Failed to assign work order'}`);
            }
        } catch (err) {
            alert(`Network error: ${err.message}`);
        }
    };

    window.saveDraftRouteProposal = async function () {
        const code = document.getElementById("propPipeCode")?.value;
        const name = document.getElementById("propPipeName")?.value;
        const type = document.getElementById("propPipeType")?.value;
        const sLat = Number(document.getElementById("propStartLat")?.value || 26.755);
        const sLng = Number(document.getElementById("propStartLng")?.value || 83.375);
        const eLat = Number(document.getElementById("propEndLat")?.value || 26.765);
        const eLng = Number(document.getElementById("propEndLng")?.value || 83.385);
        const diam = Number(document.getElementById("propDiameter")?.value || 400);
        const zone = document.getElementById("propZone")?.value || "Central Gorakhpur";
        const title = document.getElementById("propChangeTitle")?.value || `Proposed route ${code} (${type})`;

        const changes = [{
            pipeline_code: code,
            name: name,
            pipe_type: type,
            start_lat: sLat,
            start_lng: sLng,
            end_lat: eLat,
            end_lng: eLng,
            diameter_mm: diam,
            zone: zone,
            action: "ADD_OR_MODIFY"
        }];

        try {
            const res = await fetch(`${API_BASE}/api/water/admin/network-versions/draft`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                    change_title: title,
                    description: `Admin draft proposal for ${name} under zone ${zone}`,
                    affected_zones: [zone],
                    draft_pipeline_changes: changes
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                alert(`Draft Version Created: ${data.version.version_id}`);
                window.fetchNetworkVersions();
            } else {
                alert(`Error creating draft: ${data.message}`);
            }
        } catch (e) {
            alert(`Error: ${e.message}`);
        }
    };

    // -------------------------------------------------------
    // 10. FLOW CONTROL & SUPERVISORY DESK
    // -------------------------------------------------------
    window.loadFlowControlDesk = async function () {
        try {
            const res = await fetch(`${API_BASE}/api/water/flow-control/overview`, { headers: authHeaders() });
            if (!res.ok) return;
            const data = await res.json();

            // Update Metrics HUD
            const summary = data.summary || {};
            const elPipes = document.getElementById("flowMetricTotalPipes");
            const elPress = document.getElementById("flowMetricAvgPressure");
            const elPumps = document.getElementById("flowMetricActivePumps");
            const elValves = document.getElementById("flowMetricOpenValves");

            if (elPipes) elPipes.textContent = summary.total_pipelines || "0";
            if (elPress) elPress.textContent = `${summary.avg_system_pressure_bar || 0} bar`;
            if (elPumps) elPumps.textContent = `${summary.active_pumps_count || 0} Active`;
            if (elValves) elValves.textContent = `${summary.open_valves_count || 0} Open`;

            // Populate Pipelines Telemetry Table
            const tbody = document.getElementById("flowPipelinesTableBody");
            const pipelines = data.pipelines || [];
            if (tbody) {
                if (pipelines.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:16px; color:#94a3b8;">No monitored pipelines found.</td></tr>`;
                } else {
                    tbody.innerHTML = pipelines.map(p => {
                        const provBadge = p.telemetry_provenance === "MEASURED"
                            ? `<span style="font-size:10px; background:rgba(16,185,129,0.15); color:#34d399; padding:2px 6px; border-radius:4px; font-weight:700;">MEASURED</span>`
                            : `<span style="font-size:10px; background:rgba(245,158,11,0.15); color:#f59e0b; padding:2px 6px; border-radius:4px; font-weight:700;">SIMULATED</span>`;

                        const valveBadge = p.valve_state === "OPEN"
                            ? `<span style="color:#10b981; font-weight:700;">OPEN</span>`
                            : `<span style="color:#ef4444; font-weight:700;">${p.valve_state || 'CLOSED'}</span>`;

                        return `
                        <tr>
                            <td><strong>${p.pipeline_code}</strong><br><small style="color:#94a3b8;">${p.name}</small></td>
                            <td>${p.zone}</td>
                            <td><strong>${p.pressure_bar}</strong> bar</td>
                            <td>${p.flow_rate_lps} L/s</td>
                            <td><span style="color:#38bdf8; font-weight:600;">${p.flow_direction || 'FORWARD'}</span></td>
                            <td>${valveBadge}</td>
                            <td>${provBadge}</td>
                        </tr>`;
                    }).join("");
                }
            }

            // Populate Target Asset Dropdown
            const sel = document.getElementById("flowTargetAsset");
            if (sel) {
                const currentVal = sel.value;
                sel.innerHTML = `<option value="">-- Select Monitored Asset --</option>` +
                    pipelines.map(p => `<option value="${p.pipeline_code}">${p.pipeline_code} - ${p.name} (${p.zone})</option>`).join("") +
                    (data.assets || []).map(a => `<option value="${a.asset_id}">${a.asset_id} - ${a.name} [${a.asset_type}]</option>`).join("");
                if (currentVal) sel.value = currentVal;
            }

            // Also load Audit Logs
            window.loadAuditLogs();
        } catch (e) {
            console.warn("Error loading flow control desk:", e);
        }
    };

    window.submitFlowCommand = async function (e) {
        if (e && e.preventDefault) e.preventDefault();

        const assetId = document.getElementById("flowTargetAsset")?.value;
        const actionType = document.getElementById("flowActionType")?.value;
        const targetValue = document.getElementById("flowTargetValue")?.value;
        const reason = document.getElementById("flowReason")?.value;
        const confirmed = document.getElementById("flowConfirmCheck")?.checked;

        if (!assetId || !actionType || !targetValue || !confirmed) {
            alert("Please fill all required command fields and check confirmation.");
            return;
        }

        const confirmExecute = confirm(`⚡ Confirm Supervisory Command (Simulated):\nAction: ${actionType}\nTarget: ${assetId}\nTarget Value: ${targetValue}\n\nThis command executes in sandbox simulation mode.`);
        if (!confirmExecute) return;

        try {
            const res = await fetch(`${API_BASE}/api/water/flow-control/operate`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                    asset_id: assetId,
                    action_type: actionType,
                    target_value: targetValue,
                    reason: reason,
                    confirmed: true
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                alert(`✅ Command Executed (SIMULATED):\n${data.message}\nOutcome: ${data.command_outcome}\nLogged in Municipal Audit Ledger.`);
                document.getElementById("flowControlForm")?.reset();
                window.loadFlowControlDesk();
            } else {
                alert(`⚠️ Command Error: ${data.message || 'Operation rejected'}`);
            }
        } catch (err) {
            alert(`Network error: ${err.message}`);
        }
    };

    window.loadAuditLogs = async function () {
        const tbody = document.getElementById("flowAuditTableBody");
        if (!tbody) return;

        try {
            const res = await fetch(`${API_BASE}/api/water/admin/audit-logs`, { headers: authHeaders() });
            if (!res.ok) return;
            const data = await res.json();
            const logs = data.logs || [];

            if (logs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:16px; color:#94a3b8;">No audit records found.</td></tr>`;
                return;
            }

            tbody.innerHTML = logs.map(l => {
                const ts = new Date(l.created_at).toLocaleTimeString();
                const provBadge = l.provenance === "MEASURED"
                    ? `<span style="font-size:10px; color:#34d399; font-weight:700;">MEASURED</span>`
                    : `<span style="font-size:10px; color:#f59e0b; font-weight:700;">SIMULATED</span>`;

                return `
                <tr>
                    <td><small style="color:#94a3b8;">${ts}</small></td>
                    <td><strong>${l.action}</strong></td>
                    <td><span style="color:#38bdf8;">${l.target_entity_id || '--'}</span></td>
                    <td><small>${l.details || l.target_entity_type || ''}</small></td>
                    <td><small style="color:#cbd5e1;">${l.performed_by || 'SYSTEM'}</small></td>
                    <td>${provBadge}</td>
                </tr>`;
            }).join("");
        } catch (e) {
            console.warn("Error loading audit logs:", e);
        }
    };

    // -------------------------------------------------------
    // 11. FAULTS & PROVENANCE DESK
    // -------------------------------------------------------
    let activeFaultProvenance = "ALL";

    window.loadFaultsDesk = async function (provenanceFilter = null) {
        if (provenanceFilter) activeFaultProvenance = provenanceFilter;

        try {
            const url = activeFaultProvenance && activeFaultProvenance !== "ALL"
                ? `${API_BASE}/api/water/faults?provenance=${activeFaultProvenance}`
                : `${API_BASE}/api/water/faults`;

            const res = await fetch(url, { headers: authHeaders() });
            if (!res.ok) return;
            const data = await res.json();

            // Update Counts
            const bd = data.breakdown || {};
            const elAll = document.getElementById("cntFaultsAll");
            const elConf = document.getElementById("cntFaultsConfirmed");
            const elCit = document.getElementById("cntFaultsCitizen");
            const elAlgo = document.getElementById("cntFaultsAlgo");
            const elSim = document.getElementById("cntFaultsSim");

            if (elAll) elAll.textContent = data.count || "0";
            if (elConf) elConf.textContent = bd.CONFIRMED || "0";
            if (elCit) elCit.textContent = bd.CITIZEN_REPORT || "0";
            if (elAlgo) elAlgo.textContent = bd.ALGORITHMIC_SUSPICION || "0";
            if (elSim) elSim.textContent = bd.SIMULATED || "0";

            // Render Table
            const tbody = document.getElementById("faultsTableBody");
            const faults = data.faults || [];
            if (tbody) {
                if (faults.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:#94a3b8;">No fault records in this category.</td></tr>`;
                    return;
                }

                tbody.innerHTML = faults.map(f => {
                    const provTag = f.provenance === "CONFIRMED"
                        ? `<span style="background:rgba(16,185,129,0.15); color:#34d399; padding:2px 6px; border-radius:4px; font-weight:700; font-size:10px;">✅ CONFIRMED</span>`
                        : (f.provenance === "SIMULATED"
                            ? `<span style="background:rgba(168,85,247,0.15); color:#c084fc; padding:2px 6px; border-radius:4px; font-weight:700; font-size:10px;">🧪 SIMULATED</span>`
                            : (f.provenance === "ALGORITHMIC_SUSPICION"
                                ? `<span style="background:rgba(245,158,11,0.15); color:#fbbf24; padding:2px 6px; border-radius:4px; font-weight:700; font-size:10px;">🤖 ALGORITHMIC</span>`
                                : `<span style="background:rgba(56,189,248,0.15); color:#38bdf8; padding:2px 6px; border-radius:4px; font-weight:700; font-size:10px;">👤 CITIZEN</span>`));

                    const sevColor = f.severity === "CRITICAL" ? "#ef4444" : (f.severity === "HIGH" ? "#f97316" : "#f59e0b");
                    const confPct = f.confidence ? `${Math.round(Number(f.confidence) * 100)}%` : '--';
                    const ts = new Date(f.reported_at).toLocaleDateString();

                    return `
                    <tr>
                        <td><strong>${f.fault_code}</strong></td>
                        <td><span style="color:#38bdf8;">${f.asset_id}</span></td>
                        <td><strong>${f.issue_type}</strong><br><small style="color:#94a3b8;">${f.description || ''}</small></td>
                        <td><span style="color:${sevColor}; font-weight:700;">${f.severity}</span></td>
                        <td>${provTag}</td>
                        <td>${confPct}</td>
                        <td><span class="status-pill active" style="font-size:10px;">${f.status}</span></td>
                        <td><small style="color:#94a3b8;">${ts}</small></td>
                        <td>
                            <select onchange="window.updateFaultStatus('${f.fault_code}', this.value)" style="background:#0f172a; color:#f8fafc; border:1px solid #334155; padding:3px 6px; border-radius:4px; font-size:11px; cursor:pointer;">
                                <option value="OPEN" ${f.status === 'OPEN' ? 'selected' : ''}>OPEN</option>
                                <option value="INVESTIGATING" ${f.status === 'INVESTIGATING' ? 'selected' : ''}>INVESTIGATING</option>
                                <option value="CONFIRMED" ${f.status === 'CONFIRMED' ? 'selected' : ''}>CONFIRMED</option>
                                <option value="MITIGATED" ${f.status === 'MITIGATED' ? 'selected' : ''}>MITIGATED</option>
                                <option value="CLOSED" ${f.status === 'CLOSED' ? 'selected' : ''}>CLOSED</option>
                            </select>
                        </td>
                    </tr>`;
                }).join("");
            }
        } catch (e) {
            console.warn("Error loading faults desk:", e);
        }
    };

    window.filterFaultsProvenance = function (prov, btn) {
        const tabs = document.querySelectorAll("#faultProvenanceTabs .tool-btn");
        tabs.forEach(t => t.classList.remove("active"));
        if (btn) btn.classList.add("active");
        window.loadFaultsDesk(prov);
    };

    window.updateFaultStatus = async function (faultCode, newStatus) {
        const notes = prompt(`Enter resolution / status change notes for ${faultCode}:`, "Investigation updated by Command Center.") || "";

        try {
            const res = await fetch(`${API_BASE}/api/water/faults/${faultCode}/status`, {
                method: "PUT",
                headers: authHeaders(),
                body: JSON.stringify({ status: newStatus, resolution_notes: notes })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                if (window.SmartCityUI && window.SmartCityUI.toast) {
                    window.SmartCityUI.toast(`Fault ${faultCode} updated to ${newStatus}`, "success");
                } else {
                    alert(`✅ Fault ${faultCode} updated to ${newStatus}`);
                }
                window.loadFaultsDesk();
            } else {
                alert(`⚠️ Error updating fault: ${data.message || 'Operation failed'}`);
                window.loadFaultsDesk();
            }
        } catch (err) {
            alert(`Network error: ${err.message}`);
            window.loadFaultsDesk();
        }
    };

    // -------------------------------------------------------
    // INIT ON DOM READY
    // -------------------------------------------------------
    document.addEventListener("DOMContentLoaded", () => {
        // Fetch and plot topology on launch
        setTimeout(() => {
            fetchTopologyAndRender();
            window.fetchTreatmentBatches();
            window.fetchNetworkVersions();
            window.fetchWorkOrders();
        }, 600);
    });

})(window, document);
