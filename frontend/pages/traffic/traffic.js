/**
 * SmartCity AI - Gorakhpur Traffic Management Module Controller
 * Seamlessly integrated with existing SmartCity AI platform & Shared Database
 */

let trafficMap = null;
let socket = null;

// Application State
let allJunctions = [];
let allSignals = [];
let allCameras = [];
let allParkingLots = [];
let allViolations = [];
let selectedJunctionId = "JNC-01";
let activeCoordinateTarget = null; // 'jnc' | 'sig'

// Clock Runner
function initClock() {
    const clockEl = document.getElementById("clock");
    setInterval(() => {
        const now = new Date();
        if (clockEl) {
            clockEl.textContent = now.toLocaleTimeString("en-US", { hour12: false });
        }
    }, 1000);
}

// =========================================================
// 1. INITIALIZATION ON DOM READY
// =========================================================
document.addEventListener("DOMContentLoaded", async () => {
    initClock();

    // 1. Check & Initialize Auth from SmartCityAuth
    initUserSession();

    // 2. Initialize OpenLayers Map
    trafficMap = new SmartCityTrafficMap("traffic-ol-map");
    trafficMap.init();

    // Set popup handler
    trafficMap.setMarkerClickHandler((props, coord) => {
        handleMapMarkerPopup(props, coord);
    });

    // 3. Connect Socket.IO
    initSocketConnection();

    // 4. Initial Shared Data Load
    await loadSharedTrafficData();

    // Auto-update map canvas size on window resize
    window.addEventListener("resize", () => {
        if (trafficMap) trafficMap.updateSize();
    });
});

// User Session & Profile Dropdown
function initUserSession() {
    const currentUser = (window.SmartCityAuth && SmartCityAuth.getUser()) || {
        name: "Omkar Yadav",
        role: "citizen",
        department: "citizen"
    };

    const userNameEl = document.getElementById("navUserName");
    const userStatusEl = document.getElementById("navUserStatus");
    const userAvatarCircle = document.getElementById("userAvatarCircle");
    const ddUserFullName = document.getElementById("ddUserFullName");
    const ddUserContact = document.getElementById("ddUserContact");

    if (userNameEl) userNameEl.textContent = currentUser.name;
    if (ddUserFullName) ddUserFullName.textContent = currentUser.name;

    const initials = currentUser.name.split(" ").map(p => p[0]).join("").substring(0, 2).toUpperCase() || "OY";
    if (userAvatarCircle) userAvatarCircle.textContent = initials;

    if (currentUser.role === "admin" || currentUser.department === "admin") {
        if (userStatusEl) userStatusEl.textContent = "🛡️ System Admin";
        if (ddUserContact) ddUserContact.textContent = "Administrator • ICCC";
    } else if (currentUser.role === "staff" || currentUser.department === "traffic") {
        if (userStatusEl) userStatusEl.textContent = "👮 Traffic Staff";
        if (ddUserContact) ddUserContact.textContent = "Traffic Officer • Gorakhpur";
    }
}

// Check if currently authenticated user is Traffic Staff or Administrator
function isStaffUser() {
    if (window.SmartCityAuth && typeof SmartCityAuth.isStaff === "function") {
        if (SmartCityAuth.isStaff()) return true;
    }
    const user = (window.SmartCityAuth && SmartCityAuth.getUser()) ||
                 JSON.parse(localStorage.getItem("smartCityCurrentUser") || "{}");
    const role = ((user && (user.role || user.department)) || "").toLowerCase();
    return role.includes("staff") || role.includes("admin") || role.includes("traffic") || role.includes("controller") || role.includes("officer") || role.includes("police");
}

// Attach active role & JWT bearer token to staff mutation API requests
function getAuthHeaders() {
    const user = (window.SmartCityAuth && SmartCityAuth.getUser()) ||
                 JSON.parse(localStorage.getItem("smartCityCurrentUser") || "{}");
    const role = user.role || user.department || (isStaffUser() ? "staff" : "citizen");
    const name = user.name || (document.getElementById("navUserName") && document.getElementById("navUserName").textContent) || "Omkar Yadav";
    const token = (window.SmartCityAuth && SmartCityAuth.getToken()) || localStorage.getItem("smartCityJWT") || localStorage.getItem("token") || "";

    const headers = {
        "Content-Type": "application/json",
        "x-user-role": role,
        "x-user-name": name
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
}

function toggleUserDropdown(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById("userDropdownMenu");
    if (menu) {
        menu.style.display = menu.style.display === "none" ? "block" : "none";
    }
}

document.addEventListener("click", () => {
    const menu = document.getElementById("userDropdownMenu");
    if (menu) menu.style.display = "none";
});

function switchRoleProfile(role) {
    if (role === "citizen") {
        localStorage.setItem("smartCityCurrentUser", JSON.stringify({ name: "Omkar Yadav", role: "citizen", department: "citizen" }));
        initUserSession();
        switchLayer("citizen");
    } else if (role === "officer") {
        localStorage.setItem("smartCityCurrentUser", JSON.stringify({ name: "Insp. R.K. Verma", role: "staff", department: "traffic" }));
        initUserSession();
        switchLayer("control");
    } else if (role === "admin") {
        localStorage.setItem("smartCityCurrentUser", JSON.stringify({ name: "ICCC Director", role: "admin", department: "admin" }));
        initUserSession();
        switchLayer("admin");
    }
    const menu = document.getElementById("userDropdownMenu");
    if (menu) menu.style.display = "none";
}

function handleUserLogout() {
    if (window.SmartCityAuth) SmartCityAuth.logout();
    else localStorage.removeItem("smartCityCurrentUser");
    window.location.reload();
}

// =========================================================
// 2. LAYER SWITCHING (CITIZEN, STAFF, ADMIN)
// =========================================================
function switchLayer(layer) {
    document.querySelectorAll(".layer-tab-btn").forEach(b => b.classList.remove("active"));
    const activeTab = document.getElementById(`tab-btn-${layer}`);
    if (activeTab) activeTab.classList.add("active");

    document.getElementById("layer-citizen-content").style.display = "none";
    document.getElementById("layer-control-content").style.display = "none";
    document.getElementById("layer-admin-content").style.display = "none";

    const targetLayer = document.getElementById(`layer-${layer}-content`);
    if (targetLayer) targetLayer.style.display = "block";

    if (layer === "control") {
        selectControlJunction(selectedJunctionId);
        loadDynamicCCTVWall();
        loadViolationsData();
        loadMovementRules();
    } else if (layer === "admin") {
        loadAdminJunctionsTable();
        loadAdminSignalsTable();
        loadAdminStaff();
        loadAdminAISettings();
        loadAuditLogs();
    }

    // Refresh map canvas dimensions on tab switch
    setTimeout(() => {
        if (trafficMap) trafficMap.updateSize();
    }, 60);
}

// =========================================================
// 3. SOCKET.IO REAL-TIME CONNECTION
// =========================================================
function initSocketConnection() {
    try {
        socket = io();
        socket.on("connect", () => {
            console.log("🟢 Connected to Gorakhpur SmartCity Real-time Socket");
            socket.emit("join-ambulance-tracking");
            socket.emit("join-parking");
        });

        socket.on("traffic:signal_update", (data) => {
            if (data.junctionId === selectedJunctionId) {
                refreshActiveJunctionSignals(data.junctionId);
            }
        });

        socket.on("traffic:emergency_corridor_active", (data) => {
            trafficMap.renderActiveCorridor(data, allJunctions);
            showEmergencyCorridorBanner(data);
            showToast(`🚨 EMERGENCY CORRIDOR DISPATCHED: ${data.name}`);
        });

        socket.on("traffic:emergency_corridor_cleared", (data) => {
            trafficMap.clearCorridor();
            hideEmergencyCorridorBanner();
            showToast(`✅ Emergency Corridor cleared. Normal signal timings restored.`);
        });

        socket.on("traffic:incident_reported", (data) => {
            showToast(`⚠️ Traffic Hazard Alert: ${data.incident_type} at ${data.location_name}`);
            loadIncidentsData();
        });

        socket.on("traffic:ambulance_green_wave", (data) => {
            showAmbulanceGreenWaveBanner(data);
            showToast(`🚨 AUTO GREEN WAVE: Ambulance ${data.vehicleNumber} within ${data.distanceMeters}m of ${data.junctionName}!`);
            loadSharedTrafficData();
        });

        socket.on("traffic:vms_update", (data) => {
            loadVMSBoards();
        });

        // Live Moving Ambulance Socket Telemetry
        socket.on("ambulance-location-updated", (amb) => {
            if (trafficMap && trafficMap.updateAmbulancePosition) {
                trafficMap.updateAmbulancePosition(amb);
            }
            updateAmbulanceRowInFleetTable(amb);
        });

        socket.on("ambulance:location-updated", (amb) => {
            if (trafficMap && trafficMap.updateAmbulancePosition) {
                trafficMap.updateAmbulancePosition(amb);
            }
            updateAmbulanceRowInFleetTable(amb);
        });

        socket.on("traffic:ambulance_critical_transit", (data) => {
            onCriticalTransitActivated(data);
        });

        socket.on("traffic:ambulance_critical_cleared", (data) => {
            onCriticalTransitCleared(data);
        });

        // Real Spot Parking Live Updates
        socket.on("parking:slot-updated", () => {
            loadConnectedParkingData();
        });

        // Traffic Light Relocation Live Updates
        socket.on("traffic:signal_location_updated", (data) => {
            if (trafficMap && trafficMap.updateSignalPosition) {
                trafficMap.updateSignalPosition(data.id, data.latitude, data.longitude);
            }
            const sig = allSignals.find(s => s.id === data.id);
            if (sig) {
                sig.latitude = data.latitude;
                sig.longitude = data.longitude;
            }
            loadAdminSignalsTable();
            showToast(`📍 Traffic light ${data.id} relocated to (${Number(data.latitude).toFixed(5)}, ${Number(data.longitude).toFixed(5)}).`);
        });

        // Real-Time CCTV Camera Infrastructure Updates
        socket.on("traffic:camera_added", (cam) => {
            showToast(`📹 New CCTV Unit Added: ${cam.camera_name || cam.id}`);
            loadDynamicCCTVWall();
        });

        socket.on("traffic:camera_updated", (cam) => {
            loadDynamicCCTVWall();
        });

        socket.on("traffic:camera_deleted", (data) => {
            showToast(`📹 CCTV Unit ${data.id} decommissioned.`);
            loadDynamicCCTVWall();
        });

        // Live Congestion Updates Calculated Dynamically From Camera Traffic Telemetry
        socket.on("traffic:congestion_updated", (data) => {
            if (data && data.junctions && data.junctions.length) {
                data.junctions.forEach(uj => {
                    const j = allJunctions.find(x => x.id === uj.id);
                    if (j) {
                        j.congestion_level = uj.congestion_level;
                        j.avg_speed_kmh = uj.avg_speed_kmh;
                        j.status = uj.status;
                        j.total_vehicles_per_min = uj.total_vehicles_per_min;
                        j.cameras_active = uj.cameras_active;
                    }
                });
                // OpenLayers Heatmap dynamically re-renders from camera-collected traffic!
                if (trafficMap && trafficMap.renderJunctions) {
                    trafficMap.renderJunctions(allJunctions);
                }
                // If currently viewing a junction in control layer, update gauges live
                if (typeof selectedJunctionId !== "undefined" && selectedJunctionId) {
                    const sel = allJunctions.find(x => x.id === selectedJunctionId);
                    if (sel) {
                        const congEl = document.getElementById("ctrl-congestion-val");
                        const spdEl = document.getElementById("ctrl-speed-val");
                        const statEl = document.getElementById("ctrl-status-badge");
                        if (congEl) congEl.textContent = `${sel.congestion_level}%`;
                        if (spdEl) spdEl.textContent = `${sel.avg_speed_kmh} km/h`;
                        if (statEl) statEl.textContent = sel.status;
                    }
                }
            }
        });
    } catch (e) {
        console.warn("Socket.io not active; running in standard REST API mode.");
    }
}

// =========================================================
// 4. SHARED DATA LOADERS
// =========================================================
async function loadSharedTrafficData() {
    try {
        // 1. Fetch Junctions
        const resJnc = await fetch("/api/traffic/junctions");
        const jsonJnc = await resJnc.json();
        if (jsonJnc.success) {
            allJunctions = jsonJnc.junctions;
            trafficMap.renderJunctions(allJunctions);
            populateJunctionSelects(allJunctions);
        }

        // 2. Fetch Traffic Signals
        const resSig = await fetch("/api/traffic/signals");
        const jsonSig = await resSig.json();
        if (jsonSig.success) {
            allSignals = jsonSig.signals;
            trafficMap.renderSignals(allSignals);
        }

        // 3. Fetch Connected Real Spot Parking Data (direct DB join from parking_lots + parking_slots)
        await loadConnectedParkingData();

        // 4. Fetch Live Moving Ambulances Fleet
        await loadLiveAmbulancesFleet();

        // 5. Fetch Incidents
        await loadIncidentsData();

        // 6. Fetch Monsoon Waterlogging Zones
        await loadWaterloggingData();

        // 7. Fetch Variable Message Signs (VMS Boards)
        await loadVMSBoards();

        // 8. Fetch City KPIs
        await loadCityAnalyticsKPIs();
    } catch (err) {
        console.error("Shared data load error:", err);
    }
}

async function loadConnectedParkingData() {
    try {
        // Query dedicated real-time parking lots endpoint with exact joined parking_slots counts
        const res = await fetch("/api/traffic/parking-lots");
        const json = await res.json();
        let lots = [];
        let summary = null;

        if (json.success && json.lots) {
            lots = json.lots;
            summary = json.summary;
        } else {
            const fallbackRes = await fetch("/api/parking");
            const fallbackJson = await fallbackRes.json();
            lots = fallbackJson.parkingLots || fallbackJson.lots || [];
        }

        allParkingLots = lots;
        trafficMap.renderParking(allParkingLots);

        // Exact Vacant Smart Parking KPI
        const totalAvail = summary ? summary.availableCitySpots : allParkingLots.reduce((acc, l) => acc + (l.availableSpots || l.available_slots || 0), 0);
        const totalCity = summary ? summary.totalCitySpots : allParkingLots.reduce((acc, l) => acc + (l.totalSpots || l.total_slots || 0), 0);
        const kpiParking = document.getElementById("kpi-parking");
        if (kpiParking) {
            kpiParking.textContent = `${totalAvail} / ${totalCity} Spots`;
        }

        // Render citizen real spot parking list
        const citizenList = document.getElementById("citizen-parking-list");
        if (citizenList) {
            citizenList.innerHTML = allParkingLots.map(l => {
                const avail = l.availableSpots !== undefined ? l.availableSpots : (l.available_slots || 0);
                const total = l.totalSpots !== undefined ? l.totalSpots : (l.total_slots || 0);
                const occ = l.occupiedSpots !== undefined ? l.occupiedSpots : (l.occupied_slots || 0);
                const rate = l.hourlyRate || l.hourly_rate || 20;
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px;">
                        <div>
                            <div style="display:flex; align-items:center; gap:6px;">
                                <strong style="font-size:13px; color:#0f172a;">${l.name}</strong>
                                <span style="font-size:10px; background:#e2e8f0; color:#475569; padding:1px 5px; border-radius:4px; font-weight:700;">${l.parking_code || 'LOT'}</span>
                            </div>
                            <div style="font-size:11px; color:#64748b; margin-top:2px;">
                                ${l.address || l.area || 'Gorakhpur'} • ₹${rate}/hr • <span style="color:#0284c7; font-weight:700;">${l.status || 'OPEN'}</span>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <span class="badge ${avail > 5 ? 'badge-online' : (avail > 0 ? 'badge-warning' : 'badge-offline')}" style="font-size:11px; font-weight:800;">
                                🅿️ ${avail} / ${total} Free
                            </span>
                            <div style="font-size:10px; color:#64748b; margin-top:2px;">${occ} currently occupied</div>
                        </div>
                    </div>
                `;
            }).join("");
        }
    } catch (e) {
        console.error("Load connected parking error:", e);
    }
}

async function loadIncidentsData() {
    try {
        const res = await fetch("/api/traffic/incidents");
        const json = await res.json();
        if (json.success) {
            trafficMap.renderIncidents(json.incidents);
        }
    } catch (e) {}
}

async function loadCityAnalyticsKPIs() {
    try {
        const res = await fetch("/api/traffic/analytics/summary");
        const json = await res.json();
        if (json.success && json.summary) {
            const s = json.summary;
            const kpiIndex = document.getElementById("kpi-index");
            const kpiSpeed = document.getElementById("kpi-speed");
            const kpiJnc = document.getElementById("kpi-junctions");

            if (kpiIndex) kpiIndex.textContent = `${s.cityTrafficIndex}%`;
            if (kpiSpeed) kpiSpeed.innerHTML = `${s.averageSpeedKmh} <small style="font-size:14px;">km/h</small>`;
            if (kpiJnc) kpiJnc.textContent = `${s.totalJunctions}`;
        }
    } catch (e) {}
}

function populateJunctionSelects(junctions) {
    const ctrlSelect = document.getElementById("control-junction-select");
    const camSelect = document.getElementById("cam-junction-select");
    const sigSelect = document.getElementById("sig-junction-select");

    const options = junctions.map(j => `<option value="${j.id}">${j.name} (${j.zone})</option>`).join("");

    if (ctrlSelect) ctrlSelect.innerHTML = options;
    if (camSelect) camSelect.innerHTML = options;
    if (sigSelect) sigSelect.innerHTML = options;
}

// 5. CITIZEN LAYER: ALTERNATIVE ROUTE PLANNER
// =========================================================
async function calculateAlternativeRoutes() {
    const fromVal = document.getElementById("route-from-select").value;
    const toVal = document.getElementById("route-to-select").value;
    const container = document.getElementById("route-results-container");

    container.style.display = "flex";
    container.innerHTML = `<div style="text-align:center; padding:14px; font-size:12px; color:#2563eb;"><i class="fa-solid fa-spinner fa-spin"></i> Calculating optimal path, Park & Walk options, and congestion bypass...</div>`;

    try {
        const res = await fetch(`/api/traffic/alternative-routes?from=${encodeURIComponent(fromVal)}&to=${encodeURIComponent(toVal)}`);
        const json = await res.json();

        if (json.success && json.routes) {
            trafficMap.renderRoutes(json.routes, json.parkAndWalkRoute);

            let html = `
                <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:10px 14px; border-radius:8px; font-size:12px; color:#15803d; line-height: 1.5;">
                    <strong><i class="fa-solid fa-wand-magic-sparkles"></i> AI Route Recommendation:</strong> ${json.aiAdvice}
                </div>
            `;

            // 1. Direct vs Bypass Routes
            html += json.routes.map(r => `
                <div style="background:${r.recommended ? '#f0fdf4' : '#ffffff'}; border:1px solid ${r.recommended ? '#16a34a' : '#e2e8f0'}; border-radius:8px; padding:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="font-size:13px; color:${r.recommended ? '#15803d' : '#0f172a'};">${r.name}</strong>
                        ${r.recommended ? '<span class="badge badge-online">RECOMMENDED BYPASS</span>' : '<span class="badge badge-offline">CONGESTED</span>'}
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:8px; font-size:12px; flex-wrap: wrap; gap: 6px;">
                        <span>ETA: <strong style="font-size:14px; color:${r.recommended ? '#16a34a' : '#dc2626'};">${r.currentEtaMin} mins</strong></span>
                        <span>Distance: <strong>${r.distanceKm} km</strong></span>
                        ${r.timeSavedMin ? `<span style="color:#16a34a; font-weight:700;">⚡ Saves ~${r.timeSavedMin} mins</span>` : `<span style="color:#dc2626;">+${r.trafficPenaltyMin}m jam delay</span>`}
                    </div>
                </div>
            `).join("");

            // 2. Park & Walk Multi-Modal Route Card
            if (json.parkAndWalkRoute) {
                const pw = json.parkAndWalkRoute;
                html += `
                    <div style="background:#eff6ff; border:1px solid #93c5fd; border-radius:8px; padding:14px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <strong style="font-size:13px; color:#1e40af;"><i class="fa-solid fa-person-walking"></i> ${pw.name}</strong>
                            <span class="badge" style="background:#2563eb; color:#ffffff;">PARK & WALK</span>
                        </div>
                        <p style="font-size:11px; color:#475569; margin-bottom:8px;">
                            Avoid inner-city market gridlock: drive directly to parking hub, then stroll on foot to your destination.
                        </p>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; background:#ffffff; border:1px solid #bfdbfe; border-radius:6px; padding:8px 12px; font-size:12px; margin-bottom:8px;">
                            <div>
                                <span style="color:#64748b;">Parking Hub:</span> <strong>${pw.parkingLot.name}</strong><br>
                                <span style="color:#64748b;">Live Slots:</span> <strong style="color:#0284c7;">${pw.parkingLot.availableSlots} free</strong> (${pw.parkingLot.ratePerHour})
                            </div>
                            <div>
                                <span style="color:#64748b;">Transit Breakdown:</span><br>
                                🚗 <strong>${pw.drivingEtaMin}m</strong> drive + 🚶 <strong>${pw.walkingEtaMin}m</strong> walk (${pw.walkingDistanceM}m)
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#1e40af; flex-wrap: wrap; gap: 6px;">
                            <span>Total Trip: <strong>${pw.totalTravelEtaMin} mins</strong> (Saves ~${pw.timeSavedMin} mins)</span>
                            <span style="color:#059669; font-weight:700;"><i class="fa-solid fa-leaf"></i> -${pw.sustainabilitySavings.fuelSavedLitres}L Fuel Saved</span>
                        </div>
                    </div>
                `;
            }

            // 3. Departure Predictor Widget
            if (json.departurePredictions && json.departurePredictions.length) {
                html += `
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
                        <div style="font-size:12px; font-weight:800; color:#0f172a; margin-bottom:8px;">
                            ⏱️ DEPARTURE TIME PREDICTOR (Gorakhpur Rush Hour Optimizer)
                        </div>
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap:8px;">
                            ${json.departurePredictions.map(dp => `
                                <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:8px; text-align:center;">
                                    <div style="font-size:11px; color:#64748b; font-weight:700;">${dp.label}</div>
                                    <div style="font-size:16px; font-weight:900; color:#0f172a; margin:2px 0;">${dp.etaMin}m</div>
                                    <div style="font-size:10px; font-weight:700; color:${dp.delayMin < 0 ? '#16a34a' : (dp.delayMin > 0 ? '#dc2626' : '#2563eb')};">
                                        ${dp.badge}
                                    </div>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                `;
            }

            container.innerHTML = html;
        }
    } catch (e) {
        console.error("Route error:", e);
        container.innerHTML = `<div style="color:#dc2626; font-size:12px; padding:12px;">Failed to calculate route. Verify network connection.</div>`;
    }
}

// =========================================================
// 6. STAFF LAYER: JUNCTION SIGNAL CONTROLLER
// =========================================================
async function selectControlJunction(jncId) {
    selectedJunctionId = jncId;
    try {
        const res = await fetch(`/api/traffic/junctions/${jncId}`);
        const json = await res.json();
        if (json.success && json.junction) {
            renderSignalDisplay(json.junction.signals);
        }
    } catch (e) {}
}

function renderSignalDisplay(signals) {
    if (!signals) return;
    signals.forEach(s => {
        const dir = s.approach.toLowerCase();
        const red = document.getElementById(`sig-${dir}-red`);
        const yel = document.getElementById(`sig-${dir}-yel`);
        const grn = document.getElementById(`sig-${dir}-grn`);
        const timer = document.getElementById(`sig-${dir}-timer`);

        if (red && yel && grn && timer) {
            red.classList.remove("active");
            yel.classList.remove("active");
            grn.classList.remove("active");

            if (s.current_color === "Red") {
                red.classList.add("active");
                timer.style.color = "#dc2626";
            } else if (s.current_color === "Yellow") {
                yel.classList.add("active");
                timer.style.color = "#d97706";
            } else {
                grn.classList.add("active");
                timer.style.color = "#16a34a";
            }

            timer.textContent = `${s.countdown}s`;

            if (dir === "north") {
                document.getElementById("slider-ns-green").value = s.green_time;
                document.getElementById("label-ns-green").textContent = `${s.green_time}s`;
            } else if (dir === "east") {
                document.getElementById("slider-ew-green").value = s.green_time;
                document.getElementById("label-ew-green").textContent = `${s.green_time}s`;
            }
        }
    });
}

function updateTimingSliders() {
    const ns = document.getElementById("slider-ns-green").value;
    const ew = document.getElementById("slider-ew-green").value;
    document.getElementById("label-ns-green").textContent = `${ns}s`;
    document.getElementById("label-ew-green").textContent = `${ew}s`;
}

async function saveSignalTimingConfig() {
    const nsGreen = parseInt(document.getElementById("slider-ns-green").value);
    const ewGreen = parseInt(document.getElementById("slider-ew-green").value);

    try {
        const res = await fetch(`/api/traffic/junctions/${selectedJunctionId}/signals`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify({
                cycle_time: nsGreen + ewGreen + 16,
                signals: [
                    { green_time: nsGreen, id: `SIG-${selectedJunctionId}-NORTH` },
                    { green_time: nsGreen, id: `SIG-${selectedJunctionId}-SOUTH` },
                    { green_time: ewGreen, id: `SIG-${selectedJunctionId}-EAST` },
                    { green_time: ewGreen, id: `SIG-${selectedJunctionId}-WEST` }
                ],
                operator: document.getElementById("navUserName").textContent,
                role: "Traffic Staff"
            })
        });

        const json = await res.json();
        if (json.success) {
            showToast("Signal timings updated successfully!");
        }
    } catch (e) {
        showToast("Error updating signal timings.");
    }
}

async function applyManualOverride(action, approach = "North") {
    try {
        const res = await fetch(`/api/traffic/junctions/${selectedJunctionId}/override`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
                action,
                approach,
                reason: "Operator manual signal override",
                operator: document.getElementById("navUserName").textContent,
                role: "Traffic Staff"
            })
        });

        const json = await res.json();
        if (json.success) {
            showToast(json.message);
            selectControlJunction(selectedJunctionId);
        }
    } catch (e) {
        showToast("Error applying manual override.");
    }
}

async function refreshActiveJunctionSignals(jncId) {
    try {
        const res = await fetch(`/api/traffic/junctions/${jncId}`);
        const json = await res.json();
        if (json.success && json.junction) {
            renderSignalDisplay(json.junction.signals);
        }
    } catch (e) {}
}

// =========================================================
// 7. DYNAMIC CCTV CAMERA SYSTEM (DATABASE-DRIVEN & MULTI-STREAM ENGINE)
// =========================================================

/**
 * Universal Camera Stream Renderer
 * Selects and mounts the proper playback method according to source_type & playback_type:
 * - MJPEG: Direct stream via <img> (e.g. Android IP Webcam /video)
 * - HLS: Native video or Hls.js (.m3u8)
 * - MP4: Native HTML5 <video>
 * - WebRTC: Native video stream placeholder / WebRTC receiver
 * - Camera Web Page: <iframe> embed with explicit notice
 * - Demo: Interactive Simulated AI Vision Canvas
 * - RTSP: Notice that media server (MediaMTX/FFmpeg) is required for browser playback
 */
function renderCameraStream(cam, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const streamUrl = (cam.stream_url || "").trim();
    const playbackType = (cam.playback_type || "auto").toLowerCase();
    const sourceType = (cam.source_type || "").toLowerCase();

    // Determine actual effective playback mode
    let effectiveType = playbackType;
    if (effectiveType === "auto") {
        if (!streamUrl || sourceType === "demo" || streamUrl.includes("demo")) {
            effectiveType = "demo";
        } else if (streamUrl.startsWith("rtsp://")) {
            effectiveType = "rtsp";
        } else if (streamUrl.includes(".m3u8")) {
            effectiveType = "hls";
        } else if (streamUrl.match(/\.(mp4|webm|ogg)$/i)) {
            effectiveType = "mp4";
        } else if (streamUrl.endsWith("/video") || streamUrl.includes("mjpeg") || sourceType === "mjpeg") {
            effectiveType = "mjpeg";
        } else if (streamUrl.startsWith("webrtc://") || sourceType === "webrtc") {
            effectiveType = "webrtc";
        } else if (streamUrl.startsWith("http://") || streamUrl.startsWith("https://")) {
            // Default HTTP camera URL without video extension or path is likely the camera web page
            effectiveType = "web_page";
        } else {
            effectiveType = "demo";
        }
    }

    container.innerHTML = "";

    // A. MJPEG Stream (<img> rendering)
    if (effectiveType === "mjpeg") {
        let mjpegUrl = streamUrl;
        // If user entered phone base url http://ip:port without path, append /video for IP Webcam
        if (mjpegUrl && !mjpegUrl.endsWith("/video") && (sourceType === "phone_ip" || !mjpegUrl.includes("/"))) {
            const trimmed = mjpegUrl.replace(/\/+$/, "");
            if (trimmed.match(/:\d+$/)) {
                mjpegUrl = `${trimmed}/video`;
            }
        }

        const img = document.createElement("img");
        img.src = mjpegUrl;
        img.alt = cam.camera_name || "MJPEG Live Feed";
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.loading = "lazy";

        img.onload = () => {
            const badge = document.querySelector(`#cam-card-${cam.id} .badge`);
            if (badge) {
                badge.className = "badge badge-online";
                badge.textContent = "Online";
            }
        };

        img.onerror = () => {
            container.innerHTML = `
                <div class="camera-offline-placeholder" style="padding:14px; text-align:center;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size:22px; color:#f59e0b; margin-bottom:6px;"></i>
                    <strong style="font-size:12px; color:#e2e8f0;">MJPEG Feed Reachability Warning</strong>
                    <p style="font-size:10px; color:#94a3b8; margin:4px 0;">Cannot load: <code>${mjpegUrl}</code></p>
                    <span style="font-size:10px; color:#cbd5e1;">Verify phone IP Webcam is active & device is on the same local Wi-Fi network.</span>
                </div>
            `;
            const badge = document.querySelector(`#cam-card-${cam.id} .badge`);
            if (badge && cam.status !== "Online") {
                badge.className = "badge badge-offline";
                badge.textContent = "Unreachable";
            }
        };

        container.appendChild(img);
        return;
    }

    // B. HLS Stream (.m3u8)
    if (effectiveType === "hls") {
        const video = document.createElement("video");
        video.controls = true;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.objectFit = "cover";

        if (window.Hls && Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
            hls.loadSource(streamUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(() => {});
                const badge = document.querySelector(`#cam-card-${cam.id} .badge`);
                if (badge) { badge.className = "badge badge-online"; badge.textContent = "Online"; }
            });
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    container.innerHTML = `
                        <div class="camera-offline-placeholder">
                            <i class="fa-solid fa-video-slash" style="color:#ef4444;"></i>
                            <span>HLS Stream Error</span>
                            <small style="color:#94a3b8;">${data.type || 'Connection failed'}</small>
                        </div>
                    `;
                }
            });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = streamUrl;
            video.addEventListener("loadedmetadata", () => video.play().catch(() => {}));
        } else {
            container.innerHTML = `<div class="camera-offline-placeholder">HLS playback unsupported on this browser.</div>`;
            return;
        }

        container.appendChild(video);
        return;
    }

    // C. MP4 HTML5 Video
    if (effectiveType === "mp4") {
        const video = document.createElement("video");
        video.src = streamUrl;
        video.controls = true;
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.objectFit = "cover";

        video.onplaying = () => {
            const badge = document.querySelector(`#cam-card-${cam.id} .badge`);
            if (badge) { badge.className = "badge badge-online"; badge.textContent = "Online"; }
        };

        video.onerror = () => {
            container.innerHTML = `
                <div class="camera-offline-placeholder">
                    <i class="fa-solid fa-video-slash" style="color:#ef4444;"></i>
                    <span>MP4 Video Unavailable</span>
                    <small style="color:#94a3b8;">Check stream URL accessibility</small>
                </div>
            `;
        };

        container.appendChild(video);
        return;
    }

    // D. Camera Web Page (IP Webcam Web Interface via iframe)
    if (effectiveType === "web_page") {
        const iframe = document.createElement("iframe");
        iframe.src = streamUrl;
        iframe.title = `${cam.camera_name || 'Camera'} Web Interface`;
        iframe.allow = "autoplay; fullscreen";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";

        // Label ribbon
        const badgeTag = document.createElement("div");
        badgeTag.style.position = "absolute";
        badgeTag.style.top = "6px";
        badgeTag.style.left = "6px";
        badgeTag.style.background = "rgba(15, 23, 42, 0.85)";
        badgeTag.style.color = "#38bdf8";
        badgeTag.style.fontSize = "10px";
        badgeTag.style.fontWeight = "700";
        badgeTag.style.padding = "2px 6px";
        badgeTag.style.borderRadius = "4px";
        badgeTag.style.zIndex = "10";
        badgeTag.innerHTML = `🌐 Camera Web Interface`;

        container.appendChild(badgeTag);
        container.appendChild(iframe);
        return;
    }

    // E. WebRTC Stream
    if (effectiveType === "webrtc") {
        container.innerHTML = `
            <div class="camera-offline-placeholder" style="padding:16px; text-align:center;">
                <i class="fa-solid fa-tower-broadcast" style="font-size:24px; color:#38bdf8; margin-bottom:6px;"></i>
                <strong style="color:#e2e8f0; font-size:12px;">WebRTC Live Stream Channel</strong>
                <p style="color:#94a3b8; font-size:10px; margin:4px 0;">Signaling channel: <code>${streamUrl || 'Signaling Peer'}</code></p>
                <span style="font-size:10px; color:#64748b;">Ready for SDP negotiation with WebRTC Media Gateway.</span>
            </div>
        `;
        return;
    }

    // F. RTSP Stream (Diagnostic / Media Gateway Required)
    if (effectiveType === "rtsp") {
        container.innerHTML = `
            <div class="camera-offline-placeholder" style="padding:16px; text-align:center;">
                <i class="fa-solid fa-server" style="font-size:22px; color:#eab308; margin-bottom:6px;"></i>
                <strong style="color:#fef08a; font-size:12px;">RTSP Protocol Detected</strong>
                <p style="color:#cbd5e1; font-size:10px; margin:4px 0;"><code>${streamUrl}</code></p>
                <span style="color:#94a3b8; font-size:10px; line-height:1.4; display:block;">
                    Browsers cannot play raw RTSP directly. RTSP streams require an active media proxy server (such as MediaMTX or FFmpeg) to transcode into WebRTC or HLS.
                </span>
            </div>
        `;
        return;
    }

    // G. Demo Camera / Simulated AI Vision Canvas
    const canvasId = `canvas-cam-${cam.id}`;
    const canvas = document.createElement("canvas");
    canvas.id = canvasId;
    canvas.width = 280;
    canvas.height = 180;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.objectFit = "cover";
    container.appendChild(canvas);

    if (window.TrafficAIVisionCanvas) {
        setTimeout(() => {
            const emulator = new TrafficAIVisionCanvas(canvasId);
            emulator.setCamera(cam, cam.junction_name || "Gorakhpur Sector");
            emulator.start();
        }, 50);
    }
}

async function loadDynamicCCTVWall() {
    const container = document.getElementById("dynamic-cctv-wall-container");
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding:24px; color:#64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Loading CCTV camera feeds from database...</div>`;

    try {
        const res = await fetch("/api/traffic/cameras");
        const json = await res.json();

        if (json.success && json.cameras) {
            allCameras = json.cameras;

            if (allCameras.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center; padding:32px; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:10px;">
                        <i class="fa-solid fa-video-slash" style="font-size:32px; color:#94a3b8; margin-bottom:10px; display:block;"></i>
                        <h4 style="font-size:15px; color:#0f172a; margin-bottom:4px;">No cameras configured yet</h4>
                        <p style="color:#64748b; font-size:13px; margin-bottom:14px;">Add a CCTV camera or phone optical unit to begin real-time traffic monitoring.</p>
                        <button class="btn-primary btn-sm" onclick="openAddCameraModal()"><i class="fa-solid fa-plus"></i> Add CCTV Optical Unit</button>
                    </div>
                `;
                return;
            }

            // Group cameras by junction
            const grouped = {};
            allCameras.forEach(cam => {
                const jName = cam.junction_name || "General Corridor";
                if (!grouped[jName]) grouped[jName] = [];
                grouped[jName].push(cam);
            });

            // Generate HTML dynamically
            let html = "";
            for (const [juncName, cams] of Object.entries(grouped)) {
                html += `
                    <div class="junction-camera-group">
                        <div class="junction-camera-group-header">
                            <strong style="font-size:14px; color:#0f172a;"><i class="fa-solid fa-video" style="color:#2563eb;"></i> ${juncName} (${cams.length} ${cams.length === 1 ? 'Camera' : 'Cameras'})</strong>
                            <span style="font-size:12px; color:#64748b;">${cams[0].junction_zone || ''}</span>
                        </div>
                        <div class="camera-cards-grid">
                            ${cams.map(cam => renderSingleCameraCard(cam)).join("")}
                        </div>
                    </div>
                `;
            }

            container.innerHTML = html;

            // Render stream playback for all loaded cameras
            allCameras.forEach(cam => {
                renderCameraStream(cam, `stream-container-${cam.id}`);
            });
        }
    } catch (e) {
        container.innerHTML = `<div style="color:#dc2626; padding:16px;">Failed to load CCTV cameras: ${e.message}</div>`;
    }
}

function renderSingleCameraCard(cam) {
    const rawStatus = cam.status || "Configured";
    let statusBadgeClass = "badge-offline";
    if (rawStatus === "Online") statusBadgeClass = "badge-online";
    else if (rawStatus === "Maintenance") statusBadgeClass = "badge-maintenance";
    else if (rawStatus.includes("Configured")) statusBadgeClass = "badge-warning";

    const sourceTypeDisplay = {
        "phone_ip": "📱 Phone IP Cam",
        "cctv_ip": "📹 IP CCTV Cam",
        "hls": "📡 HLS Stream",
        "webrtc": "⚡ WebRTC Stream",
        "mp4": "🎞️ MP4 Video",
        "mjpeg": "📷 MJPEG Stream",
        "web_page": "🌐 Web Interface",
        "demo": "🤖 Simulated AI Cam"
    }[cam.source_type] || (cam.source_type || "CCTV Unit");

    const playbackDisplay = (cam.playback_type || "auto").toUpperCase();

    return `
        <div class="camera-card" id="cam-card-${cam.id}">
            <div class="camera-card-header">
                <div>
                    <strong style="display:block; font-size:13px; color:#0f172a;">${cam.camera_name}</strong>
                    <small style="font-size:10px; color:#64748b;">${sourceTypeDisplay} • ${playbackDisplay}</small>
                </div>
                <span class="badge ${statusBadgeClass}" id="cam-status-badge-${cam.id}">${rawStatus}</span>
            </div>
            <div class="camera-stream-container" id="stream-container-${cam.id}">
                <!-- Rendered dynamically by renderCameraStream -->
            </div>
            <div class="camera-card-body">
                <div><strong>Assigned Junction:</strong> ${cam.junction_name || cam.junction_id || 'Corridor'}</div>
                <div><strong>Coverage:</strong> ${cam.direction} Approach</div>
                <div><strong>Specs:</strong> ${cam.resolution || '1080p FHD'} • ${cam.fps || 30} FPS</div>
                <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:5px 8px; margin:6px 0; font-size:11px; color:#1e40af;">
                    <i class="fa-solid fa-calculator"></i> <strong>Live Camera Flow:</strong> ${cam.vehicles_per_min || 35} veh/min • ${cam.avg_speed || 28} km/h
                </div>
                ${cam.stream_url ? `
                    <div style="font-size:10px; color:#64748b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${cam.stream_url}">
                        🔗 <span style="font-family:monospace;">${cam.stream_url}</span>
                    </div>
                ` : ''}
            </div>
            <div class="camera-card-actions" style="display:flex; flex-wrap:wrap; gap:6px; justify-content:space-between; align-items:center;">
                <div style="display:flex; gap:4px;">
                    <button class="btn-secondary btn-sm" onclick="testSingleCameraCard('${cam.id}')" title="Test Reachability" style="font-size:10px; padding:3px 7px;">
                        <i class="fa-solid fa-satellite-dish"></i> Test
                    </button>
                    <button class="btn-secondary btn-sm" onclick="fullscreenCameraCard('${cam.id}')" title="Fullscreen Feed" style="font-size:10px; padding:3px 7px;">
                        <i class="fa-solid fa-expand"></i> Full
                    </button>
                </div>
                <div style="display:flex; gap:4px;">
                    ${isStaffUser() ? `
                        <button class="btn-primary btn-sm" onclick="promptCameraTrafficSurge('${cam.id}', '${cam.camera_name}')" style="font-size:10px; background:#ea580c; border-color:#ea580c; padding:3px 7px;" title="Test Camera-Driven Congestion Surge">
                            <i class="fa-solid fa-bolt"></i> Surge
                        </button>
                        <button class="btn-secondary btn-sm" onclick="openEditCameraModal('${cam.id}')" style="font-size:10px; padding:3px 7px;">Edit</button>
                        <button class="btn-secondary btn-sm" onclick="deleteCamera('${cam.id}')" style="font-size:10px; padding:3px 7px; color:#dc2626;">Delete</button>
                    ` : `
                        <span style="font-size:10px; color:#64748b;"><i class="fa-solid fa-eye"></i> Sensor</span>
                    `}
                </div>
            </div>
        </div>
    `;
}

function fullscreenCameraCard(camId) {
    const streamContainer = document.getElementById(`stream-container-${camId}`);
    if (!streamContainer) return;

    if (streamContainer.requestFullscreen) {
        streamContainer.requestFullscreen();
    } else if (streamContainer.webkitRequestFullscreen) {
        streamContainer.webkitRequestFullscreen();
    }
}

async function testSingleCameraCard(camId) {
    const cam = allCameras.find(c => c.id === camId);
    if (!cam || !cam.stream_url) {
        showToast("No stream URL configured to test.");
        return;
    }

    const badge = document.getElementById(`cam-status-badge-${camId}`);
    if (badge) {
        badge.className = "badge badge-warning";
        badge.textContent = "Testing...";
    }

    try {
        const res = await fetch("/api/traffic/cameras/test-connection", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                stream_url: cam.stream_url,
                source_type: cam.source_type,
                playback_type: cam.playback_type
            })
        });
        const data = await res.json();
        if (data.reachable) {
            showToast(`✅ Camera reachable (${data.suggestedPlaybackType.toUpperCase()})`);
            if (badge) {
                badge.className = "badge badge-online";
                badge.textContent = "Online";
            }
        } else {
            showToast(`⚠️ Camera unreachable: ${data.message || 'Offline'}`);
            if (badge) {
                badge.className = "badge badge-offline";
                badge.textContent = "Unreachable";
            }
        }
        // Re-render feed
        renderCameraStream(cam, `stream-container-${camId}`);
    } catch (e) {
        showToast("Connection test error.");
        if (badge) {
            badge.className = "badge badge-offline";
            badge.textContent = "Offline";
        }
    }
}

// =========================================================
// 8. AI TRAFFIC VIOLATIONS & CHALLAN REFERRAL
// =========================================================
async function loadViolationsData() {
    const tbody = document.getElementById("violations-tbody");
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Loading AI violations...</td></tr>`;

    try {
        const res = await fetch("/api/traffic/violations");
        const json = await res.json();

        if (json.success && json.violations) {
            allViolations = json.violations;

            if (allViolations.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#64748b;">No active violations flagged.</td></tr>`;
                return;
            }

            tbody.innerHTML = allViolations.map(v => {
                const isFlagged = v.status === "AI_FLAGGED" || v.status === "UNDER_REVIEW";
                const isReferred = v.status === "VERIFIED_CHALLAN_REFERRED";

                return `
                    <tr>
                        <td><strong style="font-family:monospace;">${v.id}</strong></td>
                        <td>${v.junction_name}</td>
                        <td><strong style="color:#b91c1c;">${v.violation_type}</strong></td>
                        <td><strong style="font-family:monospace; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${v.vehicle_number}</strong></td>
                        <td>${Math.round(v.confidence_score * 100)}%</td>
                        <td>₹${v.fine_amount}</td>
                        <td>
                            <span class="badge ${isReferred ? 'badge-online' : (isFlagged ? 'badge-maintenance' : 'badge-offline')}">
                                ${v.status}
                            </span>
                        </td>
                        <td>
                            <button class="btn-secondary btn-sm" onclick="inspectANPREvidence('${v.id}')" style="font-size:11px; color:#2563eb; font-weight:700; border-color:#93c5fd;">
                                <i class="fa-solid fa-camera"></i> 📷 ANPR Proof
                            </button>
                        </td>
                        <td>
                            ${isFlagged ? `
                                <div style="display:flex; gap:6px;">
                                    <button class="btn-primary btn-sm" onclick="reviewViolation('${v.id}', 'VERIFY')" style="background:#16a34a; font-size:11px;">
                                        ✓ Refer to Challan
                                    </button>
                                    <button class="btn-secondary btn-sm" onclick="reviewViolation('${v.id}', 'DISMISS')" style="font-size:11px; color:#dc2626;">
                                        ✕ Dismiss
                                    </button>
                                </div>
                            ` : `<span style="font-size:11px; color:#64748b;">Reviewed</span>`}
                        </td>
                    </tr>
                `;
            }).join("");
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#dc2626;">Error loading violations.</td></tr>`;
    }
}

async function reviewViolation(vioId, action) {
    const notes = prompt(`Enter review notes for violation ${vioId}:`, action === 'VERIFY' ? 'Vehicle plate and red light breach verified from CCTV evidence' : 'Dismissed as camera calibration reflection');
    if (notes === null) return;

    try {
        const res = await fetch(`/api/traffic/violations/${vioId}/review`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action,
                notes,
                operator: document.getElementById("navUserName").textContent,
                role: "Traffic Staff"
            })
        });

        const json = await res.json();
        if (json.success) {
            showToast(json.message);
            loadViolationsData();
        }
    } catch (e) {
        showToast("Error processing violation review.");
    }
}

// Emergency Corridor Dispatch
async function dispatchEmergencyCorridor() {
    const corrId = document.getElementById("emergency-corridor-select").value;
    try {
        const res = await fetch("/api/traffic/corridors/dispatch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                corridor_id: corrId,
                operator: document.getElementById("navUserName").textContent,
                role: "Traffic Staff"
            })
        });
        const json = await res.json();
        if (json.success) {
            showToast(json.message);
            document.getElementById("btn-dispatch-corridor").style.display = "none";
            document.getElementById("btn-cancel-corridor").style.display = "inline-flex";
        }
    } catch (e) {
        showToast("Error dispatching corridor.");
    }
}

async function deactivateEmergencyCorridor() {
    const corrId = document.getElementById("emergency-corridor-select").value;
    try {
        const res = await fetch(`/api/traffic/corridors/${corrId}/deactivate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                operator: document.getElementById("navUserName").textContent,
                role: "Traffic Staff"
            })
        });
        const json = await res.json();
        if (json.success) {
            showToast(json.message);
            document.getElementById("btn-dispatch-corridor").style.display = "inline-flex";
            document.getElementById("btn-cancel-corridor").style.display = "none";
        }
    } catch (e) {
        showToast("Error deactivating corridor.");
    }
}

function showEmergencyCorridorBanner(data) {
    const dBtn = document.getElementById("btn-dispatch-corridor");
    const cBtn = document.getElementById("btn-cancel-corridor");
    if (dBtn) dBtn.style.display = "none";
    if (cBtn) cBtn.style.display = "inline-flex";
    if (data && data.name) {
        showToast(`🚨 Priority Green Corridor Activated: ${data.name}`);
    }
}

function hideEmergencyCorridorBanner() {
    const dBtn = document.getElementById("btn-dispatch-corridor");
    const cBtn = document.getElementById("btn-cancel-corridor");
    if (dBtn) dBtn.style.display = "inline-flex";
    if (cBtn) cBtn.style.display = "none";
}

// Movement Rules
async function loadMovementRules() {
    try {
        const res = await fetch("/api/traffic/movement-rules");
        const json = await res.json();
        const listEl = document.getElementById("movement-rules-list");
        if (json.success && json.rules) {
            listEl.innerHTML = json.rules.map(r => `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px; font-size:12px;">
                    <div>
                        <strong>${r.title}</strong>
                        <div style="color:#64748b; font-size:11px;">${r.junction_name} • ${r.start_time}-${r.end_time}</div>
                    </div>
                    <button class="badge ${r.is_active ? 'badge-online' : 'badge-offline'}" onclick="toggleRuleStatus('${r.id}', ${r.is_active ? 0 : 1})" style="cursor:pointer; border:none;">
                        ${r.is_active ? 'ENFORCED' : 'SUSPENDED'}
                    </button>
                </div>
            `).join("");
        }
    } catch (e) {}
}

async function toggleRuleStatus(id, newStatus) {
    try {
        const res = await fetch(`/api/traffic/movement-rules/${id}/toggle`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                is_active: newStatus,
                operator: document.getElementById("navUserName").textContent
            })
        });
        const json = await res.json();
        if (json.success) {
            showToast(json.message);
            loadMovementRules();
        }
    } catch (e) {}
}

// =========================================================
// 9. ADMIN LAYER: INVENTORY CRUD & AUDIT
// =========================================================
async function loadAdminJunctionsTable() {
    const tbody = document.getElementById("admin-junctions-tbody");
    const isStaff = isStaffUser();
    try {
        const res = await fetch("/api/traffic/junctions");
        const json = await res.json();
        if (json.success && json.junctions) {
            tbody.innerHTML = json.junctions.map(j => `
                <tr>
                    <td><strong>${j.id}</strong></td>
                    <td>${j.name}</td>
                    <td>${j.zone}</td>
                    <td style="font-family:monospace;">${j.latitude}, ${j.longitude}</td>
                    <td><span class="badge badge-online">${j.mode}</span></td>
                    <td>${j.assigned_officer_name || 'Unassigned'}</td>
                    <td>
                        <button class="btn-secondary btn-sm" onclick="showJunctionCameraTrafficSummary('${j.id}')" title="View Camera Traffic Collection" style="font-size:11px; padding:3px 6px;">
                            <i class="fa-solid fa-camera"></i> Cams
                        </button>
                        ${isStaff ? `
                            <button class="btn-secondary btn-sm" onclick="openEditJunctionModal('${j.id}')">Edit</button>
                            <button class="btn-secondary btn-sm" onclick="deleteJunction('${j.id}')" style="color:#dc2626;">Delete</button>
                        ` : `
                            <span class="badge badge-offline" style="font-size:10px; background:#e2e8f0; color:#64748b;"><i class="fa-solid fa-lock"></i> Staff Only</span>
                        `}
                    </td>
                </tr>
            `).join("");
        }
    } catch (e) {}
}

async function loadAdminSignalsTable() {
    const tbody = document.getElementById("admin-signals-tbody");
    const isStaff = isStaffUser();
    try {
        const res = await fetch("/api/traffic/signals");
        const json = await res.json();
        if (json.success && json.signals) {
            tbody.innerHTML = json.signals.map(s => `
                <tr>
                    <td><strong>${s.id}</strong></td>
                    <td>${s.junction_name}</td>
                    <td>${s.approach}</td>
                    <td style="font-family:monospace;">${s.latitude || '--'}, ${s.longitude || '--'}</td>
                    <td>${s.signal_type || 'Standard'}</td>
                    <td>${s.green_time}s / ${s.yellow_time}s / ${s.red_time}s</td>
                    <td><span class="badge ${s.status === 'Active' ? 'badge-online' : 'badge-offline'}">${s.status || 'Active'}</span></td>
                    <td>
                        ${isStaff ? `
                            <button class="btn-primary btn-sm" onclick="openModifySignalLocationModal('${s.id}')" style="font-size:11px; padding:3px 7px; background:#2563eb; margin-right:3px;" title="Relocate / Set Map Coordinates">
                                <i class="fa-solid fa-location-dot"></i> Move
                            </button>
                            <button class="btn-secondary btn-sm" onclick="openEditSignalModal('${s.id}')">Edit</button>
                            <button class="btn-secondary btn-sm" onclick="deleteSignal('${s.id}')" style="color:#dc2626;">Delete</button>
                        ` : `
                            <span class="badge badge-offline" style="font-size:10px; background:#e2e8f0; color:#64748b;"><i class="fa-solid fa-lock"></i> Staff Only</span>
                        `}
                    </td>
                </tr>
            `).join("");
        }
    } catch (e) {}
}

async function loadAdminStaff() {
    const container = document.getElementById("admin-staff-table-container");
    try {
        const res = await fetch("/api/traffic/admin/users");
        const json = await res.json();
        if (json.success && json.staff) {
            container.innerHTML = `
                <table class="custom-table">
                    <thead><tr><th>Name</th><th>Badge ID</th><th>Department</th></tr></thead>
                    <tbody>
                        ${json.staff.map(s => `
                            <tr>
                                <td><strong>${s.name}</strong></td>
                                <td style="font-family:monospace;">${s.staff_id}</td>
                                <td><span class="badge badge-online">${s.department}</span></td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            `;
        }
    } catch (e) {}
}

async function loadAdminAISettings() {
    const container = document.getElementById("admin-ai-settings-container");
    try {
        const res = await fetch("/api/traffic/admin/ai-settings");
        const json = await res.json();
        if (json.success && json.settings) {
            container.innerHTML = json.settings.map(s => `
                <div class="form-group">
                    <label>${s.setting_key}</label>
                    <input type="text" class="form-control admin-ai-field" data-key="${s.setting_key}" value="${s.setting_value}">
                    <small style="color:#64748b; font-size:11px;">${s.description}</small>
                </div>
            `).join("");
        }
    } catch (e) {}
}

async function saveAdminAISettings() {
    const fields = document.querySelectorAll(".admin-ai-field");
    const settings = Array.from(fields).map(f => ({
        setting_key: f.dataset.key,
        setting_value: f.value
    }));

    try {
        const res = await fetch("/api/traffic/admin/ai-settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                settings,
                operator: document.getElementById("navUserName").textContent
            })
        });
        const json = await res.json();
        if (json.success) {
            showToast("AI hyperparameters saved successfully.");
        }
    } catch (e) {
        showToast("Error saving AI settings.");
    }
}

async function loadAuditLogs() {
    const tbody = document.getElementById("admin-audit-tbody");
    try {
        const res = await fetch("/api/traffic/admin/audit-logs");
        const json = await res.json();
        if (json.success && json.logs) {
            tbody.innerHTML = json.logs.map(l => `
                <tr>
                    <td style="color:#64748b; font-size:11px;">${new Date(l.created_at).toLocaleTimeString()}</td>
                    <td><strong>${l.user_name}</strong></td>
                    <td>${l.role}</td>
                    <td style="color:#2563eb; font-weight:700;">${l.action}</td>
                    <td>${l.target}</td>
                    <td style="font-size:12px;">${l.details}</td>
                </tr>
            `).join("");
        }
    } catch (e) {}
}

// =========================================================
// 10. MODALS, COORDINATE PICKER & FORM SUBMISSIONS
// =========================================================
function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add("active");
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove("active");
}

function openReportIncidentModal() { openModal("modal-incident"); }

// Admin / Staff Modals & Map Coordinate Pickers
function openAddJunctionModal() {
    document.getElementById("modal-jnc-title").textContent = "🚦 Add Traffic Junction";
    const idInput = document.getElementById("jnc-id-input");
    if (idInput) {
        idInput.value = `JNC-0${allJunctions.length + 1}`;
        idInput.disabled = false;
    }
    const nameInput = document.getElementById("jnc-name-input");
    if (nameInput) nameInput.value = "";
    const zoneInput = document.getElementById("jnc-zone-input");
    if (zoneInput) zoneInput.value = "Urban Core";
    const landmarkInput = document.getElementById("jnc-landmark-input");
    if (landmarkInput) landmarkInput.value = "";
    const latInput = document.getElementById("jnc-lat-input");
    if (latInput) latInput.value = "26.7588";
    const lngInput = document.getElementById("jnc-lng-input");
    if (lngInput) lngInput.value = "83.3731";
    const officerInput = document.getElementById("jnc-officer-input");
    if (officerInput) officerInput.value = "Insp. R.K. Verma";
    const cycleInput = document.getElementById("jnc-cycle-input");
    if (cycleInput) cycleInput.value = "120";

    openModal("modal-junction");
}

function openAddSignalModal() {
    document.getElementById("modal-sig-title").textContent = "🚦 Add Traffic Light";
    const editIdInput = document.getElementById("sig-edit-id");
    if (editIdInput) editIdInput.value = "";

    const sigJncSelect = document.getElementById("sig-junction-select");
    if (sigJncSelect && allJunctions.length) {
        sigJncSelect.innerHTML = allJunctions.map(j => `<option value="${j.id}">${j.name} (${j.zone})</option>`).join("");
        if (selectedJunctionId) sigJncSelect.value = selectedJunctionId;
    }

    const appSelect = document.getElementById("sig-approach-select");
    if (appSelect) appSelect.value = "North";
    const streetInput = document.getElementById("sig-street-input");
    if (streetInput) streetInput.value = "";
    const latInput = document.getElementById("sig-lat-input");
    if (latInput) latInput.value = "26.7592";
    const lngInput = document.getElementById("sig-lng-input");
    if (lngInput) lngInput.value = "83.3731";
    const typeSelect = document.getElementById("sig-type-select");
    if (typeSelect) typeSelect.value = "Standard 3-Phase";
    const statusSelect = document.getElementById("sig-status-select");
    if (statusSelect) statusSelect.value = "Active";
    const grnInput = document.getElementById("sig-green-input");
    if (grnInput) grnInput.value = "45";
    const yelInput = document.getElementById("sig-yellow-input");
    if (yelInput) yelInput.value = "4";
    const redInput = document.getElementById("sig-red-input");
    if (redInput) redInput.value = "70";

    openModal("modal-signal");
}

function openAddStaffModal() {
    const nameInput = document.getElementById("staff-name-input");
    if (nameInput) nameInput.value = "";
    const idInput = document.getElementById("staff-id-input");
    if (idInput) idInput.value = `TR-${Math.floor(100 + Math.random() * 900)}`;
    const passInput = document.getElementById("staff-pass-input");
    if (passInput) passInput.value = "police123";
    const deptSelect = document.getElementById("staff-dept-select");
    if (deptSelect) deptSelect.value = "traffic";

    openModal("modal-staff");
}

function pickCoordsFor(target) {
    activeCoordinateTarget = target;
    // Temporarily hide open modal so user sees the map
    if (target === "jnc") {
        const modal = document.getElementById("modal-junction");
        if (modal) modal.style.display = "none";
    } else if (target === "sig") {
        const modal = document.getElementById("modal-signal");
        if (modal) modal.style.display = "none";
    }

    // Scroll smoothly to map card
    const mapCard = document.querySelector(".map-container-card");
    if (mapCard) {
        mapCard.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    showToast("📍 Map Crosshair Active: Click any point on the map to set coordinates.");

    trafficMap.startCoordinatePickMode((lat, lng) => {
        const latFixed = Number(lat).toFixed(5);
        const lngFixed = Number(lng).toFixed(5);

        if (activeCoordinateTarget === "jnc") {
            const latInput = document.getElementById("jnc-lat-input");
            const lngInput = document.getElementById("jnc-lng-input");
            if (latInput) latInput.value = latFixed;
            if (lngInput) lngInput.value = lngFixed;
            const modal = document.getElementById("modal-junction");
            if (modal) modal.style.display = "";
            openModal("modal-junction");
        } else if (activeCoordinateTarget === "sig") {
            const latInput = document.getElementById("sig-lat-input");
            const lngInput = document.getElementById("sig-lng-input");
            if (latInput) latInput.value = latFixed;
            if (lngInput) lngInput.value = lngFixed;
            const modal = document.getElementById("modal-signal");
            if (modal) modal.style.display = "";
            openModal("modal-signal");
        }
        showToast(`📍 Coordinates Selected: (${latFixed}, ${lngFixed})`);
        activeCoordinateTarget = null;
    });
}

function cancelCoordinatePick() {
    if (trafficMap) trafficMap.stopCoordinatePickMode();
    if (activeCoordinateTarget === "jnc") {
        const modal = document.getElementById("modal-junction");
        if (modal) modal.style.display = "";
        openModal("modal-junction");
    } else if (activeCoordinateTarget === "sig") {
        const modal = document.getElementById("modal-signal");
        if (modal) modal.style.display = "";
        openModal("modal-signal");
    }
    activeCoordinateTarget = null;
}
function handleCameraSourceChange() {
    const srcType = document.getElementById("cam-source-select").value;
    const playSelect = document.getElementById("cam-playback-select");
    const streamInput = document.getElementById("cam-stream-input");
    const warnBox = document.getElementById("cam-network-warning");
    const helpText = document.getElementById("cam-url-help-text");

    if (srcType === "phone_ip") {
        playSelect.value = "mjpeg";
        if (!streamInput.value || streamInput.value.includes("demo")) {
            streamInput.value = "http://192.168.1.4:8080";
        }
        if (warnBox) warnBox.style.display = "block";
        if (helpText) helpText.innerHTML = "<strong>Phone IP Webcam:</strong> For direct browser video, use <code>http://[phone-ip]:8080/video</code> (MJPEG). For full camera web dashboard, select 'Camera Web Page' (iframe).";
    } else if (srcType === "web_page") {
        playSelect.value = "web_page";
        if (warnBox) warnBox.style.display = "none";
        if (helpText) helpText.innerHTML = "<strong>Camera Web Page:</strong> Embedded via iframe. Note: the camera server must allow iframe embedding.";
    } else if (srcType === "hls") {
        playSelect.value = "hls";
        if (warnBox) warnBox.style.display = "none";
        if (helpText) helpText.innerHTML = "<strong>HLS Stream:</strong> Compatible with <code>.m3u8</code> streaming playlists.";
    } else if (srcType === "mp4") {
        playSelect.value = "mp4";
        if (warnBox) warnBox.style.display = "none";
        if (helpText) helpText.innerHTML = "<strong>MP4 Video:</strong> Direct link to standard H.264/MP4 video file.";
    } else if (srcType === "webrtc") {
        playSelect.value = "webrtc";
        if (warnBox) warnBox.style.display = "none";
        if (helpText) helpText.innerHTML = "<strong>WebRTC:</strong> Ultra low-latency stream channel.";
    } else if (srcType === "demo") {
        playSelect.value = "auto";
        streamInput.value = "demo://sensor-optical-feed";
        if (warnBox) warnBox.style.display = "none";
        if (helpText) helpText.innerHTML = "<strong>Simulated Demo Camera:</strong> Renders real-time AI optical bounding boxes and vehicle counting emulation.";
    } else {
        if (warnBox) warnBox.style.display = "none";
        if (helpText) helpText.innerHTML = "Enter an actual compatible stream link, or leave demo placeholder for simulated AI vision.";
    }
}

function handlePlaybackTypeChange() {
    const playType = document.getElementById("cam-playback-select").value;
    const warnBox = document.getElementById("cam-network-warning");
    const streamInput = document.getElementById("cam-stream-input").value.trim();

    if (streamInput.includes("192.168.") || streamInput.includes("10.") || streamInput.includes("172.")) {
        if (warnBox) warnBox.style.display = "block";
    }
}

async function testCameraConnectionInModal() {
    const streamUrl = document.getElementById("cam-stream-input").value.trim();
    const sourceType = document.getElementById("cam-source-select").value;
    const playbackType = document.getElementById("cam-playback-select").value;

    const previewContainer = document.getElementById("modal-cam-preview-container");
    const statusBadge = document.getElementById("modal-preview-status-badge");
    const diagEl = document.getElementById("modal-preview-diagnosis");
    const camStatusSelect = document.getElementById("cam-status-select");

    if (!streamUrl) {
        alert("Please enter a Stream URL or Camera Address first.");
        return;
    }

    if (statusBadge) {
        statusBadge.className = "badge badge-warning";
        statusBadge.textContent = "Testing connection...";
    }
    if (diagEl) {
        diagEl.style.display = "block";
        diagEl.innerHTML = `<span style="color:#2563eb;"><i class="fa-solid fa-spinner fa-spin"></i> Probing stream endpoint and protocol...</span>`;
    }

    // Call backend connection test API
    try {
        const res = await fetch("/api/traffic/cameras/test-connection", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                stream_url: streamUrl,
                source_type: sourceType,
                playback_type: playbackType
            })
        });
        const data = await res.json();

        // Check if phone URL suggestion exists
        if (data.suggestedStreamUrl && data.suggestedStreamUrl !== streamUrl) {
            const accept = confirm(`Phone IP Camera detected!\n\nThe entered URL (${streamUrl}) is a Web Interface.\nFor direct in-browser live video streaming, the recommended URL is:\n${data.suggestedStreamUrl}\n\nWould you like to automatically switch to this URL and use MJPEG playback?`);
            if (accept) {
                document.getElementById("cam-stream-input").value = data.suggestedStreamUrl;
                document.getElementById("cam-playback-select").value = "mjpeg";
                testCameraConnectionInModal();
                return;
            }
        }

        // Render preview inside modal
        const testCamObj = {
            id: "modal-preview",
            camera_name: document.getElementById("cam-name-input").value.trim() || "Preview Feed",
            stream_url: document.getElementById("cam-stream-input").value.trim(),
            source_type: sourceType,
            playback_type: document.getElementById("cam-playback-select").value,
            status: data.reachable ? "Online" : "Configured — Not Verified"
        };

        renderCameraStream(testCamObj, "modal-cam-preview-container");

        if (data.reachable) {
            if (statusBadge) {
                statusBadge.className = "badge badge-online";
                statusBadge.textContent = "Reachable • Live";
            }
            if (camStatusSelect) camStatusSelect.value = "Online";
            if (diagEl) {
                diagEl.innerHTML = `<span style="color:#15803d;"><i class="fa-solid fa-circle-check"></i> ${data.message} • Detected Format: <strong>${(data.detectedFormat || data.suggestedPlaybackType).toUpperCase()}</strong></span>`;
            }
        } else {
            if (statusBadge) {
                statusBadge.className = "badge badge-warning";
                statusBadge.textContent = data.isLocalNetwork ? "Local LAN • Unverified" : "Unreachable / Offline";
            }
            if (camStatusSelect) camStatusSelect.value = "Configured";
            if (diagEl) {
                diagEl.innerHTML = `<span style="color:#b45309;"><i class="fa-solid fa-circle-exclamation"></i> ${data.message}</span>`;
            }
        }
    } catch (err) {
        if (statusBadge) {
            statusBadge.className = "badge badge-offline";
            statusBadge.textContent = "Test Failed";
        }
        if (diagEl) {
            diagEl.innerHTML = `<span style="color:#b91c1c;">Unable to reach backend diagnostic service: ${err.message}</span>`;
        }
    }
}

function openAddCameraModal() {
    document.getElementById("modal-cam-title").textContent = "📹 Add CCTV Optical Unit";
    document.getElementById("cam-edit-id").value = "";
    document.getElementById("cam-name-input").value = "";
    document.getElementById("cam-stream-input").value = "http://192.168.1.4:8080";
    document.getElementById("cam-source-select").value = "phone_ip";
    document.getElementById("cam-playback-select").value = "mjpeg";
    document.getElementById("cam-status-select").value = "Configured";
    document.getElementById("cam-res-select").value = "1080p FHD";

    const warnBox = document.getElementById("cam-network-warning");
    if (warnBox) warnBox.style.display = "block";

    const diagEl = document.getElementById("modal-preview-diagnosis");
    if (diagEl) diagEl.style.display = "none";

    const statusBadge = document.getElementById("modal-preview-status-badge");
    if (statusBadge) {
        statusBadge.className = "badge";
        statusBadge.style.background = "#f1f5f9";
        statusBadge.style.color = "#64748b";
        statusBadge.textContent = "Idle / Not Tested";
    }

    const previewContainer = document.getElementById("modal-cam-preview-container");
    if (previewContainer) {
        previewContainer.innerHTML = `
            <div id="modal-preview-placeholder" style="text-align: center; color: #64748b; font-size: 12px; padding: 16px;">
                <i class="fa-solid fa-video" style="font-size: 28px; margin-bottom: 8px; display: block; color: #475569;"></i>
                <span>Enter Stream URL & click <strong>Test Connection</strong> to preview live video feed</span>
            </div>
        `;
    }

    openModal("modal-camera");
}

function openEditCameraModal(camId) {
    const cam = allCameras.find(c => c.id === camId);
    if (!cam) return;

    document.getElementById("modal-cam-title").textContent = `Edit Camera (${cam.id})`;
    document.getElementById("cam-edit-id").value = cam.id;
    document.getElementById("cam-junction-select").value = cam.junction_id;
    document.getElementById("cam-name-input").value = cam.camera_name;
    document.getElementById("cam-dir-select").value = cam.direction;
    document.getElementById("cam-stream-input").value = cam.stream_url;
    document.getElementById("cam-source-select").value = cam.source_type || "cctv_ip";
    document.getElementById("cam-playback-select").value = cam.playback_type || "auto";
    document.getElementById("cam-status-select").value = cam.status;
    document.getElementById("cam-res-select").value = cam.resolution;

    handlePlaybackTypeChange();

    // Render current preview
    renderCameraStream(cam, "modal-cam-preview-container");

    const statusBadge = document.getElementById("modal-preview-status-badge");
    if (statusBadge) {
        statusBadge.className = cam.status === "Online" ? "badge badge-online" : "badge badge-warning";
        statusBadge.textContent = cam.status;
    }

    openModal("modal-camera");
}

// Camera Form Submission (With Full Authorization & Live State Updates)
async function submitCameraForm() {
    const editId = document.getElementById("cam-edit-id").value;
    const jncId = document.getElementById("cam-junction-select").value;
    const name = document.getElementById("cam-name-input").value.trim();
    const dir = document.getElementById("cam-dir-select").value;
    const stream = document.getElementById("cam-stream-input").value.trim();
    const sourceType = document.getElementById("cam-source-select").value;
    const playbackType = document.getElementById("cam-playback-select").value;
    const status = document.getElementById("cam-status-select").value;
    const resVal = document.getElementById("cam-res-select").value;

    if (!name) {
        alert("Please provide a camera name.");
        return;
    }

    const saveBtn = document.getElementById("btn-save-camera");
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving Camera...`;
    }

    try {
        const url = editId ? `/api/traffic/cameras/${editId}` : `/api/traffic/cameras`;
        const method = editId ? "PUT" : "POST";

        // Retrieve current operator and auth headers
        const token = (window.SmartCityAuth && SmartCityAuth.getToken()) || localStorage.getItem("smartCityJWT") || "";
        const currentUser = (window.SmartCityAuth && SmartCityAuth.getUser()) ||
                            JSON.parse(localStorage.getItem("smartCityCurrentUser") || "{}");
        const operatorName = currentUser.name || (document.getElementById("navUserName") && document.getElementById("navUserName").textContent) || "Traffic Officer";
        const userRole = currentUser.role || currentUser.department || "staff";

        const headers = {
            "Content-Type": "application/json",
            "x-user-role": userRole
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(url, {
            method,
            headers,
            body: JSON.stringify({
                junction_id: jncId,
                camera_name: name,
                direction: dir,
                stream_url: stream,
                source_type: sourceType,
                playback_type: playbackType,
                status,
                resolution: resVal,
                operator: operatorName
            })
        });

        const json = await res.json();

        if (res.ok && json.success) {
            closeModal("modal-camera");
            showToast(json.message || "Camera saved successfully!");

            // Immediately update frontend state if camera object is returned
            if (json.camera) {
                const createdCam = json.camera;
                const existingIdx = allCameras.findIndex(c => c.id === createdCam.id);
                if (existingIdx >= 0) {
                    allCameras[existingIdx] = createdCam;
                } else {
                    allCameras.push(createdCam);
                }
            }

            // Reload camera wall to re-render all cards including new one
            await loadDynamicCCTVWall();
        } else {
            console.error("Camera Save Error:", json);
            const errMsg = json.message || "Failed to save camera to database.";
            alert(`Error Saving Camera:\n${errMsg}`);
            showToast(`❌ ${errMsg}`);
        }
    } catch (e) {
        console.error("Network / Server error during camera save:", e);
        alert(`Failed to save camera. Please verify backend connectivity: ${e.message}`);
        showToast("❌ Network error saving camera.");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `Save Camera`;
        }
    }
}

async function deleteCamera(camId) {
    if (!confirm(`Are you sure you want to decommission camera unit ${camId}?`)) return;

    try {
        const token = (window.SmartCityAuth && SmartCityAuth.getToken()) || localStorage.getItem("smartCityJWT") || "";
        const currentUser = (window.SmartCityAuth && SmartCityAuth.getUser()) ||
                            JSON.parse(localStorage.getItem("smartCityCurrentUser") || "{}");
        const userRole = currentUser.role || currentUser.department || "staff";

        const headers = {
            "Content-Type": "application/json",
            "x-user-role": userRole
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`/api/traffic/cameras/${camId}`, {
            method: "DELETE",
            headers,
            body: JSON.stringify({ operator: currentUser.name || "Traffic Controller" })
        });
        const json = await res.json();
        if (res.ok && json.success) {
            showToast(json.message || `Camera ${camId} deleted.`);
            allCameras = allCameras.filter(c => c.id !== camId);
            await loadDynamicCCTVWall();
        } else {
            showToast(`❌ Delete failed: ${json.message || 'Unauthorized'}`);
        }
    } catch (e) {
        showToast("Error deleting camera.");
    }
}

// Junction Form Submission
async function submitJunctionForm() {
    const id = document.getElementById("jnc-id-input").value.trim();
    const name = document.getElementById("jnc-name-input").value.trim();
    const zone = document.getElementById("jnc-zone-input").value.trim();
    const landmark = document.getElementById("jnc-landmark-input").value.trim();
    const lat = parseFloat(document.getElementById("jnc-lat-input").value);
    const lng = parseFloat(document.getElementById("jnc-lng-input").value);
    const officer = document.getElementById("jnc-officer-input").value.trim();
    const cycle = parseInt(document.getElementById("jnc-cycle-input").value);

    if (!id || !name || isNaN(lat) || isNaN(lng)) {
        alert("Please fill all required junction fields.");
        return;
    }

    try {
        const res = await fetch("/api/traffic/junctions", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
                id, name, zone, landmark, latitude: lat, longitude: lng,
                officer_name: officer, cycle_time: cycle,
                operator: document.getElementById("navUserName").textContent
            })
        });

        const json = await res.json();
        if (json.success) {
            closeModal("modal-junction");
            showToast(json.message);
            loadSharedTrafficData();
            loadAdminJunctionsTable();
        }
    } catch (e) {
        showToast("Error saving junction.");
    }
}

async function deleteJunction(id) {
    if (!confirm(`Are you sure you want to delete junction ${id}? This will remove its connected signals and cameras.`)) return;
    try {
        const res = await fetch(`/api/traffic/junctions/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
            body: JSON.stringify({ operator: document.getElementById("navUserName").textContent })
        });
        const json = await res.json();
        if (json.success) {
            showToast(json.message);
            loadSharedTrafficData();
            loadAdminJunctionsTable();
        }
    } catch (e) {
        showToast("Error deleting junction.");
    }
}

// Traffic Light (Signal) Form Submission
async function submitSignalForm() {
    const editId = document.getElementById("sig-edit-id").value;
    const jncId = document.getElementById("sig-junction-select").value;
    const app = document.getElementById("sig-approach-select").value;
    const street = document.getElementById("sig-street-input").value.trim();
    const lat = parseFloat(document.getElementById("sig-lat-input").value) || null;
    const lng = parseFloat(document.getElementById("sig-lng-input").value) || null;
    const sigType = document.getElementById("sig-type-select").value;
    const status = document.getElementById("sig-status-select").value;
    const green = parseInt(document.getElementById("sig-green-input").value);
    const yel = parseInt(document.getElementById("sig-yellow-input").value);
    const red = parseInt(document.getElementById("sig-red-input").value);

    try {
        const url = editId ? `/api/traffic/signals/${editId}` : `/api/traffic/signals`;
        const method = editId ? "PUT" : "POST";

        const res = await fetch(url, {
            method,
            headers: getAuthHeaders(),
            body: JSON.stringify({
                junction_id: jncId,
                approach: app,
                street_name: street,
                latitude: lat,
                longitude: lng,
                signal_type: sigType,
                status,
                green_time: green,
                yellow_time: yel,
                red_time: red,
                operator: document.getElementById("navUserName").textContent
            })
        });

        const json = await res.json();
        if (json.success) {
            closeModal("modal-signal");
            showToast(json.message);
            loadSharedTrafficData();
            loadAdminSignalsTable();
        }
    } catch (e) {
        showToast("Error saving signal.");
    }
}

function openEditSignalModal(sigId) {
    const s = allSignals.find(sig => sig.id === sigId);
    if (!s) return;

    document.getElementById("modal-sig-title").textContent = `Edit Traffic Light (${s.id})`;
    document.getElementById("sig-edit-id").value = s.id;
    document.getElementById("sig-junction-select").value = s.junction_id;
    document.getElementById("sig-approach-select").value = s.approach;
    document.getElementById("sig-street-input").value = s.street_name;
    document.getElementById("sig-lat-input").value = s.latitude || "";
    document.getElementById("sig-lng-input").value = s.longitude || "";
    document.getElementById("sig-type-select").value = s.signal_type || "Standard 3-Phase";
    document.getElementById("sig-status-select").value = s.status || "Active";
    document.getElementById("sig-green-input").value = s.green_time;
    document.getElementById("sig-yellow-input").value = s.yellow_time;
    document.getElementById("sig-red-input").value = s.red_time;
    openModal("modal-signal");
}

async function deleteSignal(sigId) {
    if (!confirm(`Are you sure you want to delete traffic light ${sigId}?`)) return;
    try {
        const res = await fetch(`/api/traffic/signals/${sigId}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
            body: JSON.stringify({ operator: document.getElementById("navUserName").textContent })
        });
        const json = await res.json();
        if (json.success) {
            showToast(json.message);
            loadSharedTrafficData();
            loadAdminSignalsTable();
        }
    } catch (e) {
        showToast("Error deleting signal.");
    }
}

// Staff Form Submission
async function submitStaffForm() {
    const name = document.getElementById("staff-name-input").value.trim();
    const id = document.getElementById("staff-id-input").value.trim();
    const pass = document.getElementById("staff-pass-input").value;
    const dept = document.getElementById("staff-dept-select").value;

    if (!name || !id) {
        alert("Please enter officer name and staff ID.");
        return;
    }

    try {
        const res = await fetch("/api/traffic/admin/users", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
                name, staff_id: id, password: pass, department: dept,
                operator: document.getElementById("navUserName").textContent
            })
        });
        const json = await res.json();
        if (json.success) {
            closeModal("modal-staff");
            showToast(json.message);
            loadAdminStaff();
        }
    } catch (e) {
        showToast("Error creating staff.");
    }
}

// Incident Report Submission
async function submitTrafficIncident() {
    const cat = document.getElementById("inc-category").value;
    const loc = document.getElementById("inc-location").value.trim();
    const sev = document.getElementById("inc-severity").value;
    const desc = document.getElementById("inc-description").value.trim();
    const name = document.getElementById("inc-name").value.trim();
    const phone = document.getElementById("inc-phone").value.trim();

    if (!loc || !desc) {
        alert("Please provide location and description.");
        return;
    }

    try {
        const res = await fetch("/api/traffic/incidents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                incident_type: cat,
                location_name: loc,
                latitude: 26.7588 + (Math.random() * 0.02 - 0.01),
                longitude: 83.3731 + (Math.random() * 0.02 - 0.01),
                description: desc,
                severity: sev,
                reporter_name: name || "Anonymous Citizen",
                reporter_phone: phone
            })
        });

        const json = await res.json();
        if (json.success) {
            closeModal("modal-incident");
            showToast("Incident report submitted to Traffic Control!");
            loadIncidentsData();
        }
    } catch (e) {
        showToast("Error submitting incident.");
    }
}

// Map Marker Popups
function handleMapMarkerPopup(props, coord) {
    if (!props || !props.type) return;
    const popupContent = document.getElementById("popup-content");
    const d = props.data || {};

    if (props.type === "junction") {
        popupContent.innerHTML = `
            <h4>🚦 ${d.name}</h4>
            <p style="color:#64748b; font-size:12px; margin-bottom:6px;">${d.landmark}</p>
            <div style="font-size:12px; margin-bottom:4px;">Status: <strong>${d.status}</strong></div>
            <div style="font-size:12px; margin-bottom:4px;">Congestion Level: <strong style="color:${d.congestion_level > 70 ? '#dc2626' : (d.congestion_level > 40 ? '#ea580c' : '#16a34a')}">${d.congestion_level}%</strong> (Camera Telemetry)</div>
            <div style="font-size:12px; margin-bottom:8px;">Avg Speed: <strong>${d.avg_speed_kmh || 28.5} km/h</strong></div>
            <div style="display:flex; flex-direction:column; gap:5px;">
                <button class="btn-secondary btn-sm" onclick="showJunctionCameraTrafficSummary('${d.id}')" style="width:100%; font-size:11px;">
                    <i class="fa-solid fa-camera"></i> Camera Traffic Accounting
                </button>
                ${isStaffUser() ? `
                    <button class="btn-primary btn-sm" onclick="switchLayer('control'); selectControlJunction('${d.id}');" style="width:100%; font-size:11px;">
                        Control Junction →
                    </button>
                ` : `
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:4px 6px; font-size:10px; color:#64748b; text-align:center;">
                        <i class="fa-solid fa-lock"></i> Staff Login Required for Signal Override
                    </div>
                `}
            </div>
        `;
    } else if (props.type === "signal") {
        popupContent.innerHTML = `
            <h4>🚦 ${d.street_name || (d.approach + ' Approach Signal')}</h4>
            <div style="font-size:12px; margin-bottom:3px;">Approach: <strong>${d.approach}</strong></div>
            <div style="font-size:12px; margin-bottom:3px;">Current Light: <strong style="color:${d.current_color === 'Green' ? '#16a34a' : '#dc2626'}">${d.current_color} (${d.countdown}s)</strong></div>
            <div style="font-size:12px; margin-bottom:4px;">Position: <code style="font-size:11px; color:#475569;">${Number(d.latitude || 0).toFixed(5)}, ${Number(d.longitude || 0).toFixed(5)}</code></div>
            <div style="font-size:12px; margin-bottom:8px;">Type: <strong>${d.signal_type || 'Standard 3-Phase'}</strong></div>
            ${isStaffUser() ? `
                <button class="btn-primary btn-sm" onclick="openModifySignalLocationModal('${d.id}')" style="width:100%; font-size:11px; background:#2563eb;">
                    <i class="fa-solid fa-location-dot"></i> Modify / Move Signal Location
                </button>
            ` : `
                <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:6px 8px; font-size:11px; color:#64748b; text-align:center;">
                    <i class="fa-solid fa-lock" style="color:#94a3b8;"></i> Staff Authorization Required to Move Signal
                </div>
            `}
        `;
    } else if (props.type === "parking") {
        const avail = d.available_slots !== undefined ? d.available_slots : d.availableSlots;
        const total = d.total_slots !== undefined ? d.total_slots : d.totalSlots;
        popupContent.innerHTML = `
            <h4>🅿️ ${d.name}</h4>
            <p style="color:#64748b; font-size:12px; margin-bottom:6px;">${d.address || d.area}</p>
            <div style="font-size:13px; color:#15803d; font-weight:800; margin-bottom:4px;">
                ${avail} / ${total} Free Slots
            </div>
            <div style="font-size:12px;">Rate: ₹${d.hourly_rate}/hr</div>
        `;
    } else if (props.type === "incident") {
        popupContent.innerHTML = `
            <h4 style="color:#dc2626;">⚠️ ${d.incident_type}</h4>
            <p style="font-size:12px; margin-bottom:4px;">${d.location_name}</p>
            <p style="font-size:12px; color:#475569;">${d.description}</p>
        `;
    } else if (props.type === "waterlogging") {
        popupContent.innerHTML = `
            <h4 style="color:#0284c7;">🌧️ ${d.name}</h4>
            <p style="color:#64748b; font-size:12px; margin-bottom:4px;">${d.landmark || 'Gorakhpur Lowlands'}</p>
            <div style="font-size:12px; margin-bottom:4px;">
                Water Depth: <strong style="color:${d.riskLevel === 'HIGH_RISK' ? '#dc2626' : '#0284c7'};">${d.waterDepthCm} cm</strong>
                <span class="badge ${d.riskLevel === 'HIGH_RISK' ? 'badge-offline' : 'badge-online'}" style="margin-left:6px;">${d.status}</span>
            </div>
            <div style="font-size:11px; color:#475569; margin-bottom:4px;"><strong>Pumps:</strong> ${d.drainagePumps}</div>
            <div style="background:#f0f9ff; border:1px solid #bae6fd; padding:6px 8px; border-radius:6px; font-size:11px; color:#0369a1;">
                <strong>Detour:</strong> ${d.recommendedAction}
            </div>
        `;
    } else if (props.type === "ambulance") {
        const isCrit = !!d.isCritical;
        popupContent.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                <span style="font-size:20px;">${isCrit ? '🚨' : '🚑'}</span>
                <div>
                    <h4 style="margin:0; color:${isCrit ? '#dc2626' : '#1e3a8a'};">${d.vehicle_number || d.ambulance_id}</h4>
                    <span class="badge ${isCrit ? 'badge-offline' : 'badge-online'}" style="font-size:10px;">${d.status || 'Active'}</span>
                </div>
            </div>
            <div style="font-size:12px; margin-bottom:3px;"><strong>Driver:</strong> ${d.driver_name || 'Pilot'} (${d.driver_mobile || 'N/A'})</div>
            <div style="font-size:12px; margin-bottom:3px;"><strong>Hospital:</strong> ${d.destinationHospital || d.hospital_name || 'BRD Medical'}</div>
            <div style="font-size:12px; margin-bottom:3px;"><strong>Speed:</strong> <strong style="color:${d.speedKmh > 55 ? '#dc2626' : '#2563eb'};">${d.speedKmh} km/h</strong></div>
            <div style="font-size:12px; margin-bottom:8px;"><strong>Location:</strong> ${d.location || 'Transit Route'}</div>
            ${!isCrit ? `
                <button class="btn-danger btn-sm" onclick="dispatchAmbulanceCriticalCorridor('${d.id}', '${d.vehicle_number}', '${d.destinationHospital}')" style="width:100%; font-size:11px;">
                    <i class="fa-solid fa-bolt"></i> Declare Critical & Preempt Signals
                </button>
            ` : `
                <button class="btn-primary btn-sm" onclick="clearAmbulanceCriticalCorridor('${d.id}', '${d.vehicle_number}')" style="width:100%; font-size:11px; background:#16a34a; border-color:#16a34a;">
                    <i class="fa-solid fa-circle-check"></i> Clear Critical Transit
                </button>
            `}
        `;
    } else if (props.type === "hospital_destination") {
        popupContent.innerHTML = `
            <h4 style="color:#16a34a;">🏥 ${d.name}</h4>
            <div style="font-size:12px; margin-bottom:4px;"><strong>Status:</strong> Emergency Trauma Receiving Ready</div>
            <div style="font-size:12px; color:#475569;">Green wave signal priority active on inbound corridors.</div>
        `;
    }

    if (trafficMap.overlay) trafficMap.overlay.setPosition(coord);
}

// Map Toggles
function toggleHeatmapLayer() {
    const btn = document.getElementById("btn-toggle-heatmap");
    const active = btn.classList.toggle("active");
    trafficMap.toggleHeatmap(active);
}

function toggleAmbulancesLayer() {
    const isVis = trafficMap.toggleAmbulances();
    const btn = document.getElementById("btn-toggle-ambulances");
    if (btn) {
        if (isVis) btn.classList.add("active");
        else btn.classList.remove("active");
    }
}

function toggleSignalsLayer() {
    const btn = document.getElementById("btn-toggle-signals");
    const active = btn.classList.toggle("active");
    trafficMap.toggleLayer("signals", active);
}

function toggleParkingLayer() {
    const btn = document.getElementById("btn-toggle-parking");
    const active = btn.classList.toggle("active");
    trafficMap.toggleLayer("parking", active);
}

function toggleIncidentsLayer() {
    const btn = document.getElementById("btn-toggle-incidents");
    const active = btn.classList.toggle("active");
    trafficMap.toggleLayer("incidents", active);
}

function toggleWaterloggingLayer() {
    const isVis = trafficMap.toggleWaterlogging();
    const btn = document.getElementById("btn-toggle-waterlogging");
    if (btn) {
        if (isVis) btn.classList.add("active");
        else btn.classList.remove("active");
    }
}

function toggleVMSLayer() {
    const isVis = trafficMap.toggleVMS();
    const btn = document.getElementById("btn-toggle-vms");
    if (btn) {
        if (isVis) btn.classList.add("active");
        else btn.classList.remove("active");
    }
}

// =========================================================
// 7. MONSOON WATERLOGGING LOADER
// =========================================================
let allWaterloggingZones = [];
async function loadWaterloggingData() {
    try {
        const res = await fetch("/api/traffic/waterlogging");
        const json = await res.json();
        if (json.success && json.zones) {
            allWaterloggingZones = json.zones;
            trafficMap.renderWaterlogging(allWaterloggingZones);
        }
    } catch (e) {
        console.warn("Waterlogging fetch failed:", e);
    }
}

// =========================================================
// 8. CITIZEN E-CHALLAN SEARCH & SIMULATED UPI PAYMENT
// =========================================================
let currentPayingChallan = null;

async function searchCitizenChallans() {
    const plateInput = document.getElementById("citizen-plate-input");
    const container = document.getElementById("citizen-challans-container");
    if (!plateInput || !container) return;

    const plate = plateInput.value.trim();
    if (!plate) {
        showToast("Please enter a vehicle registration number (e.g. UP-53-AZ-1001)");
        return;
    }

    container.style.display = "block";
    container.innerHTML = `<div style="text-align:center; padding:16px; color:#2563eb; font-size:13px;"><i class="fa-solid fa-spinner fa-spin"></i> Searching Parivahan & Traffic Police databases for ${plate.toUpperCase()}...</div>`;

    try {
        const res = await fetch(`/api/traffic/violations/search?plate=${encodeURIComponent(plate)}`);
        const json = await res.json();

        if (json.success) {
            if (!json.violations || json.violations.length === 0) {
                container.innerHTML = `
                    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px; text-align:center;">
                        <i class="fa-solid fa-circle-check" style="font-size:28px; color:#16a34a; margin-bottom:8px;"></i>
                        <h4 style="color:#15803d; margin-bottom:4px;">No Pending Challans Found</h4>
                        <p style="font-size:12px; color:#166534; margin:0;">
                            Vehicle <strong>${json.searchedPlate}</strong> has a clean compliance record with Gorakhpur Traffic Police.
                        </p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div style="margin-bottom:12px; font-size:13px; font-weight:700; color:#0f172a;">
                    Found ${json.count} Violation Record(s) for <span style="color:#2563eb;">${json.searchedPlate}</span>:
                </div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    ${json.violations.map(v => {
                        const isSettled = v.status === 'PAID_SETTLED';
                        return `
                            <div style="background:${isSettled ? '#f8fafc' : '#ffffff'}; border:1px solid ${isSettled ? '#cbd5e1' : '#fca5a5'}; border-radius:10px; padding:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                                <div>
                                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                                        <strong style="font-size:14px; color:#0f172a;">${v.id}</strong>
                                        <span class="badge ${isSettled ? 'badge-online' : 'badge-offline'}">${isSettled ? 'PAID & SETTLED' : 'FINE PENDING'}</span>
                                        <span style="font-size:11px; color:#64748b;">${new Date(v.timestamp).toLocaleString()}</span>
                                    </div>
                                    <div style="font-size:13px; color:#334155; font-weight:600; margin-bottom:3px;">
                                        ${v.violation_type} • <span style="color:#2563eb;">${v.vehicle_number}</span> (${v.vehicle_type || 'Vehicle'})
                                    </div>
                                    <div style="font-size:12px; color:#64748b;">
                                        📍 Location: <strong>${v.junction_name}</strong> (${v.junction_landmark || 'Gorakhpur'}) | Camera: ${v.camera_name || 'AI Optical Sensor'}
                                    </div>
                                    ${v.notes ? `<div style="font-size:11px; color:#475569; margin-top:3px;"><em>${v.notes}</em></div>` : ''}
                                </div>
                                <div style="text-align:right;">
                                    <div style="font-size:18px; font-weight:800; color:${isSettled ? '#16a34a' : '#dc2626'}; margin-bottom:6px;">
                                        ₹${Number(v.fine_amount).toFixed(2)}
                                    </div>
                                    ${isSettled 
                                        ? `<button class="btn-secondary btn-sm" onclick="showToast('Receipt verified: ${v.id} is settled.')" style="color:#16a34a;"><i class="fa-solid fa-receipt"></i> Settled</button>` 
                                        : `<button class="btn-primary btn-sm" onclick="openPayChallanModal('${v.id}', '${v.vehicle_number}', ${v.fine_amount}, '${v.violation_type}')"><i class="fa-solid fa-qrcode"></i> Pay via UPI</button>`}
                                </div>
                            </div>
                        `;
                    }).join("")}
                </div>
            `;
        }
    } catch (e) {
        container.innerHTML = `<div style="color:#dc2626; font-size:12px; padding:12px;">Failed to search challans. Please verify network connection.</div>`;
    }
}

function fillSamplePlate(plate) {
    const input = document.getElementById("citizen-plate-input");
    if (input) {
        input.value = plate;
        searchCitizenChallans();
    }
}

function openPayChallanModal(id, vehicleNo, amount, violationType) {
    currentPayingChallan = { id, vehicleNo, amount, violationType };
    const summary = document.getElementById("pay-challan-summary");
    if (summary) {
        summary.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span style="color:#64748b; font-size:12px;">Challan ID:</span>
                <strong style="font-size:12px;">${id}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span style="color:#64748b; font-size:12px;">Vehicle Number:</span>
                <strong style="font-size:12px; color:#2563eb;">${vehicleNo}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span style="color:#64748b; font-size:12px;">Violation Type:</span>
                <span style="font-size:12px;">${violationType}</span>
            </div>
            <div style="border-top:1px dashed #cbd5e1; margin-top:8px; padding-top:8px; display:flex; justify-content:space-between; align-items:center;">
                <strong style="font-size:13px;">Fine Payable:</strong>
                <strong style="font-size:18px; color:#dc2626;">₹${Number(amount).toFixed(2)}</strong>
            </div>
        `;
    }
    openModal("modal-pay-challan");
}

async function processChallanPayment() {
    if (!currentPayingChallan) return;
    const btn = document.getElementById("btn-submit-pay-challan");
    const channel = document.getElementById("pay-channel-select").value;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing UPI Authorization...`;
    }

    try {
        const res = await fetch(`/api/traffic/violations/${currentPayingChallan.id}/pay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                payment_method: channel,
                paid_by: (window.SmartCityAuth && SmartCityAuth.getUser() && SmartCityAuth.getUser().name) || "Citizen User"
            })
        });

        const json = await res.json();
        if (json.success) {
            closeModal("modal-pay-challan");
            WebAudioEngine.playChime();
            showToast(`✅ Payment Successful! Receipt: ${json.receipt.receiptNo}`);
            searchCitizenChallans();
            loadViolationsData();
        } else {
            showToast(json.error || "Payment could not be processed.");
        }
    } catch (e) {
        showToast("Payment network error.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-lock"></i> Authorize & Settle Fine Now`;
        }
    }
}

// =========================================================
// 9. MUNICIPAL TRAFFIC REPORT EXPORT
// =========================================================
function exportMunicipalReport() {
    showToast("Preparing Gorakhpur Municipal Traffic Report (CSV)...");
    window.location.href = "/api/traffic/reports/export-csv";
}

// =========================================================
// 10. AMBULANCE AUTO GREEN WAVE NOTIFICATIONS
// =========================================================
function showAmbulanceGreenWaveBanner(data) {
    const banner = document.getElementById("ambulance-green-wave-banner");
    const text = document.getElementById("amb-banner-text");
    if (banner && text) {
        text.innerHTML = `Emergency Ambulance <strong>${data.vehicleNumber}</strong> (${data.hospitalName || 'Emergency'}) is within <strong>${data.distanceMeters}m</strong> of <strong>${data.junctionName}</strong>. Signals preempted to GREEN.`;
        banner.style.display = "flex";

        if (window.ambBannerTimeout) clearTimeout(window.ambBannerTimeout);
        window.ambBannerTimeout = setTimeout(() => {
            banner.style.display = "none";
        }, 40000);
    }
}


// Simple Toast
function showToast(msg) {
    const existing = document.querySelector(".toast-msg");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "toast-msg";
    toast.innerHTML = `<i class="fa-solid fa-bell"></i> ${msg}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// =========================================================
// 11. BROWSER-NATIVE WEB AUDIO ENGINE (ZERO EXTERNAL ASSETS)
// =========================================================
const WebAudioEngine = {
    ctx: null,
    sirenOsc1: null,
    sirenGain: null,
    sirenInterval: null,
    isSirenPlaying: false,

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume();
        }
    },

    playSiren() {
        try {
            this.init();
            if (!this.ctx || this.isSirenPlaying) return;
            this.isSirenPlaying = true;
            this.sirenGain = this.ctx.createGain();
            this.sirenGain.gain.setValueAtTime(0.14, this.ctx.currentTime);
            this.sirenGain.connect(this.ctx.destination);

            this.sirenOsc1 = this.ctx.createOscillator();
            this.sirenOsc1.type = "sawtooth";
            this.sirenOsc1.connect(this.sirenGain);
            this.sirenOsc1.start();

            let toggle = false;
            this.sirenOsc1.frequency.setValueAtTime(740, this.ctx.currentTime);

            this.sirenInterval = setInterval(() => {
                if (!this.isSirenPlaying || !this.ctx) return;
                const now = this.ctx.currentTime;
                const targetFreq = toggle ? 740 : 960;
                this.sirenOsc1.frequency.exponentialRampToValueAtTime(targetFreq, now + 0.35);
                toggle = !toggle;
            }, 400);
        } catch (e) {
            console.warn("WebAudio siren error:", e);
        }
    },

    stopSiren() {
        try {
            if (this.sirenInterval) {
                clearInterval(this.sirenInterval);
                this.sirenInterval = null;
            }
            if (this.sirenOsc1) {
                this.sirenOsc1.stop();
                this.sirenOsc1.disconnect();
                this.sirenOsc1 = null;
            }
            this.isSirenPlaying = false;
        } catch (e) {
            console.warn("Stop siren error:", e);
        }
    },

    playChime() {
        try {
            this.init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
            gain.gain.setValueAtTime(0.16, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.7);
        } catch (e) {
            console.warn("WebAudio chime error:", e);
        }
    }
};

// =========================================================
// 12. VARIABLE MESSAGE SIGNS (VMS) ROADSIDE BILLBOARDS
// =========================================================
let allVMSBoards = [];
let activeVMSIndex = 0;

async function loadVMSBoards() {
    try {
        const res = await fetch("/api/traffic/vms-boards");
        const json = await res.json();
        if (json.success && json.boards) {
            allVMSBoards = json.boards;
            trafficMap.renderVMSBoards(allVMSBoards);
            renderActiveVMSBoard();
        }
    } catch (e) {
        console.warn("VMS boards load failed:", e);
    }
}

function renderActiveVMSBoard() {
    if (!allVMSBoards.length) return;
    const b = allVMSBoards[activeVMSIndex];
    if (!b) return;

    const nameEl = document.getElementById("vms-board-name");
    const statusBadge = document.getElementById("vms-status-badge");
    const counterLabel = document.getElementById("vms-counter-label");
    const line1El = document.getElementById("vms-line-1");
    const line2El = document.getElementById("vms-line-2");
    const line3El = document.getElementById("vms-line-3");
    const locEl = document.getElementById("vms-board-location");
    const specsEl = document.getElementById("vms-board-specs");
    const updatedEl = document.getElementById("vms-board-updated");

    if (nameEl) nameEl.textContent = b.name.toUpperCase();
    if (counterLabel) counterLabel.textContent = `${activeVMSIndex + 1} / ${allVMSBoards.length}`;
    if (locEl) locEl.textContent = b.location;
    if (specsEl) specsEl.textContent = `${b.matrixDimensions} • ${b.mode}`;
    if (updatedEl) updatedEl.textContent = new Date(b.lastUpdated).toLocaleTimeString();

    if (line1El) {
        const isEmergency = b.status === "EMERGENCY_ALERT";
        line1El.innerHTML = (isEmergency ? `<i class="fa-solid fa-triangle-exclamation"></i> ` : "") + b.line1;
        line1El.className = `vms-led-line primary ${isEmergency ? "emergency" : ""}`;
        line1El.style.color = isEmergency ? "#ef4444" : (b.ledColor || "#ffb703");
    }
    if (line2El) {
        line2El.textContent = b.line2;
        line2El.className = `vms-led-line secondary ${b.status === "EMERGENCY_ALERT" ? "emergency" : ""}`;
    }
    if (line3El) {
        line3El.textContent = b.line3;
        line3El.className = `vms-led-line tertiary`;
    }

    if (statusBadge) {
        if (b.status === "EMERGENCY_ALERT") {
            statusBadge.style.background = "#dc2626";
            statusBadge.textContent = "CRITICAL ALERT";
        } else {
            statusBadge.style.background = "#16a34a";
            statusBadge.textContent = "LIVE BROADCAST";
        }
    }
}

function prevVMSBoard() {
    if (!allVMSBoards.length) return;
    activeVMSIndex = (activeVMSIndex - 1 + allVMSBoards.length) % allVMSBoards.length;
    renderActiveVMSBoard();
}

function nextVMSBoard() {
    if (!allVMSBoards.length) return;
    activeVMSIndex = (activeVMSIndex + 1) % allVMSBoards.length;
    renderActiveVMSBoard();
}

function openVMSEditModal() {
    if (!allVMSBoards.length) return;
    const b = allVMSBoards[activeVMSIndex];
    document.getElementById("vms-select-board").value = b.id;
    document.getElementById("vms-edit-line1").value = b.line1;
    document.getElementById("vms-edit-line2").value = b.line2;
    document.getElementById("vms-edit-line3").value = b.line3;
    openModal("modal-vms-edit");
}

async function submitVMSMessage() {
    const boardId = document.getElementById("vms-select-board").value;
    const line1 = document.getElementById("vms-edit-line1").value.trim();
    const line2 = document.getElementById("vms-edit-line2").value.trim();
    const line3 = document.getElementById("vms-edit-line3").value.trim();
    const statusVal = document.getElementById("vms-edit-status").value.split("|");
    const status = statusVal[0];
    const ledColor = statusVal[1];

    if (!line1) {
        alert("Please provide at least Line 1 text for the roadside display.");
        return;
    }

    try {
        const res = await fetch(`/api/traffic/vms-boards/${boardId}/message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                line1, line2, line3, status, ledColor,
                operator: document.getElementById("navUserName").textContent
            })
        });
        const json = await res.json();
        if (json.success) {
            closeModal("modal-vms-edit");
            showToast(`📢 Roadside VMS broadcast updated on ${boardId}!`);
            WebAudioEngine.playChime();
            await loadVMSBoards();
        } else {
            showToast(json.error || "Failed to update VMS.");
        }
    } catch (e) {
        showToast("Error updating VMS message.");
    }
}

// =========================================================
// 13. CITIZEN DAILY COMMUTE ROUTE ALERT SUBSCRIPTION
// =========================================================
async function subscribeCommuteAlert() {
    const name = document.getElementById("commute-name-input").value.trim();
    const contact = document.getElementById("commute-contact-input").value.trim();
    const corridor = document.getElementById("commute-corridor-select").value;
    const prefTime = document.getElementById("commute-time-select").value;

    const parts = corridor.split(" to ");
    const from_route = parts[0] ? parts[0].trim() : "Gorakhpur Junction";
    const to_route = parts[1] ? parts[1].trim() : "AIIMS Gorakhpur";

    try {
        const res = await fetch("/api/traffic/commute-alerts/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                citizen_name: name || "Omkar Yadav",
                phone_or_email: contact || "+91 98765 43210",
                from_route,
                to_route,
                notification_time: prefTime
            })
        });

        const json = await res.json();
        if (json.success) {
            WebAudioEngine.playChime();
            showToast(`✅ Commute corridor alert active (${json.subscriptionId})`);

            const preview = document.getElementById("commute-preview-box");
            if (preview) {
                preview.style.display = "block";
                preview.innerHTML = `
                    <div style="font-weight: 800; font-size: 14px; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-circle-check" style="color: #059669;"></i>
                        Commute Alert Subscribed (${json.subscriptionId})
                    </div>
                    <div style="font-size: 12px; color: #047857; margin-bottom: 8px;">
                        Channel: <strong>${json.livePreviewAdvisory.deliveryChannel}</strong> • Scheduled Broadcast: <strong>${prefTime}</strong>
                    </div>
                    <div style="background: #ffffff; border: 1px solid #6ee7b7; border-radius: 6px; padding: 10px; color: #1e293b;">
                        <div style="font-weight: 700; color: #059669; font-size: 12px; margin-bottom: 4px;">
                            CURRENT CORRIDOR STATUS: ${json.livePreviewAdvisory.currentStatus}
                        </div>
                        <div style="font-size: 12px; margin-bottom: 2px;">
                            ⏱️ <strong>Estimated Transit:</strong> ${json.livePreviewAdvisory.currentEtaMinutes} mins
                        </div>
                        <div style="font-size: 12px; margin-bottom: 2px;">
                            💡 <strong>Smart Advisory:</strong> ${json.livePreviewAdvisory.recommendedDeparture}
                        </div>
                        <div style="font-size: 11px; color: #64748b;">
                            Obstructions: ${json.livePreviewAdvisory.activeObstructions}
                        </div>
                    </div>
                `;
            }
        }
    } catch (e) {
        showToast("Failed to subscribe commute alerts.");
    }
}

// =========================================================
// 14. WEBSTER'S OPTIMUM SIGNAL TIMING ENGINE
// =========================================================
let latestWebsterData = null;

async function computeWebsterTimingForActiveJunction() {
    const jncId = selectedJunctionId || "JNC-01";
    showToast(`Computing Webster optimal timing for ${jncId}...`);

    try {
        const res = await fetch(`/api/traffic/junctions/${jncId}/webster-timing`);
        const json = await res.json();
        if (json.success) {
            latestWebsterData = json;
            const p = json.websterParameters;
            const r = json.recommendation;
            const d = json.formulaDerivation;

            document.getElementById("webster-lost-time").textContent = p.lostTime_L;
            document.getElementById("webster-flow-ratio").textContent = `Y = ${p.flowRatios_y.sum_Y} (y₁:${p.flowRatios_y.y_ns}, y₂:${p.flowRatios_y.y_ew})`;
            document.getElementById("webster-opt-cycle").textContent = `${r.optimalCycleTime}s (Current: ${json.junction.current_cycle}s)`;
            document.getElementById("webster-ns-green").textContent = `${r.recommendedNorthSouthGreen}s`;
            document.getElementById("webster-ew-green").textContent = `${r.recommendedEastWestGreen}s`;
            document.getElementById("webster-delay-reduction").textContent = `-${r.expectedDelayReductionPct}%`;

            const stepsBox = document.getElementById("webster-derivation-steps");
            if (stepsBox) {
                stepsBox.innerHTML = `
                    <strong>DERIVATION: ${d.equation}</strong><br>
                    • ${d.stepByStep[0]}<br>
                    • ${d.stepByStep[1]}<br>
                    • ${d.stepByStep[2]}<br>
                    • <strong>Optimum:</strong> ${d.stepByStep[3]} (Green: NS=${r.recommendedNorthSouthGreen}s, EW=${r.recommendedEastWestGreen}s, Amber=${r.yellowAmberTime}s, All-Red=${r.allRedClearance}s)
                `;
            }

            const applyBtn = document.getElementById("btn-apply-webster");
            if (applyBtn) applyBtn.style.display = "inline-flex";

            WebAudioEngine.playChime();
            showToast(`Optimal Webster cycle computed: ${r.optimalCycleTime}s`);
        }
    } catch (e) {
        showToast("Error calculating Webster timing.");
    }
}

function applyWebsterTimingsToSliders() {
    if (!latestWebsterData) return;
    const r = latestWebsterData.recommendation;
    const nsSlider = document.getElementById("slider-ns-green");
    const ewSlider = document.getElementById("slider-ew-green");

    if (nsSlider) nsSlider.value = r.recommendedNorthSouthGreen;
    if (ewSlider) ewSlider.value = r.recommendedEastWestGreen;

    updateTimingSliders();
    saveSignalTimingConfig();
    showToast(`✅ Webster timings applied to controller (${r.recommendedNorthSouthGreen}s / ${r.recommendedEastWestGreen}s)`);
}

// =========================================================
// 15. AMBULANCE LIVE RADAR & AUDIO SIREN LAUNCHER
// =========================================================
let ambSimInterval = null;
let ambSimDistance = 800;

function startAmbulanceSimulation() {
    if (ambSimInterval) return;

    ambSimDistance = 800;
    const startBtn = document.getElementById("btn-start-amb-sim");
    const stopBtn = document.getElementById("btn-stop-amb-sim");
    const badge = document.getElementById("amb-sim-badge");
    const distEl = document.getElementById("amb-sim-distance");
    const sigStatus = document.getElementById("amb-sim-signal-status");

    if (startBtn) startBtn.style.display = "none";
    if (stopBtn) stopBtn.style.display = "inline-flex";
    if (badge) {
        badge.className = "badge badge-online";
        badge.textContent = "APPROACHING";
    }

    WebAudioEngine.playSiren();
    showToast("🚨 Emergency dispatch active! Audio siren warbling & radar pinging Golghar...");

    // Center map on Golghar for radar visibility
    if (trafficMap && trafficMap.map) {
        trafficMap.map.getView().animate({
            center: ol.proj.fromLonLat([83.3731, 26.7588]),
            zoom: 15,
            duration: 900
        });
        trafficMap.renderAmbulanceRadar(83.3731, 26.7588, ambSimDistance);
    }

    ambSimInterval = setInterval(async () => {
        ambSimDistance -= 50;
        if (distEl) distEl.textContent = `${Math.max(0, ambSimDistance)} m`;

        if (ambSimDistance > 0 && trafficMap) {
            trafficMap.renderAmbulanceRadar(83.3731, 26.7588, ambSimDistance);
        }

        // At 500m threshold: Preempt traffic light automatically
        if (ambSimDistance === 500) {
            if (sigStatus) {
                sigStatus.textContent = "🟢 GREEN WAVE PREEMPTED";
                sigStatus.style.color = "#16a34a";
            }
            if (badge) {
                badge.className = "badge badge-online";
                badge.textContent = "GREEN WAVE ACTIVE";
            }
            showToast("🚑 500m Threshold reached! Auto Green Wave Preemption engaged.");
            showAmbulanceGreenWaveBanner({
                vehicleNumber: "UP-53-AMB-108",
                hospitalName: "AIIMS Emergency Trauma Care",
                distanceMeters: 500,
                junctionName: "Golghar Central Crossing"
            });
            try {
                await fetch("/api/traffic/junctions/JNC-01/override", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        override_action: "FORCE_GREEN",
                        approach: "North",
                        operator: "Auto-Radar Dispatcher"
                    })
                });
            } catch (e) {}
        }

        // At 0m: Arrival
        if (ambSimDistance <= 0) {
            stopAmbulanceSimulation();
            showToast("🏥 Ambulance cleared Golghar Junction safely! Restoring normal signals.");
            WebAudioEngine.playChime();
        }
    }, 900);
}

function stopAmbulanceSimulation() {
    if (ambSimInterval) {
        clearInterval(ambSimInterval);
        ambSimInterval = null;
    }
    WebAudioEngine.stopSiren();
    if (trafficMap) trafficMap.clearAmbulanceRadar();

    const startBtn = document.getElementById("btn-start-amb-sim");
    const stopBtn = document.getElementById("btn-stop-amb-sim");
    const badge = document.getElementById("amb-sim-badge");
    const distEl = document.getElementById("amb-sim-distance");
    const sigStatus = document.getElementById("amb-sim-signal-status");

    if (startBtn) startBtn.style.display = "inline-flex";
    if (stopBtn) stopBtn.style.display = "none";
    if (badge) {
        badge.className = "badge badge-offline";
        badge.textContent = "IDLE";
    }
    if (distEl) distEl.textContent = "-- m";
    if (sigStatus) {
        sigStatus.textContent = "Normal AI";
        sigStatus.style.color = "#64748b";
    }

    fetch("/api/traffic/junctions/JNC-01/override", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            override_action: "RESTORE_AUTO",
            operator: "Auto-Radar Dispatcher"
        })
    }).catch(() => {});
}

// =========================================================
// 16. ANPR OPTICAL EVIDENCE INSPECTION MODAL
// =========================================================
let currentEvidenceData = null;

async function inspectANPREvidence(violationId) {
    openModal("modal-anpr-evidence");
    const body = document.getElementById("anpr-evidence-modal-body");
    body.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #2563eb;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 24px;"></i>
            <div style="margin-top: 10px; font-weight: 700;">Retrieving optical ANPR camera sensor frames for ${violationId}...</div>
        </div>
    `;

    try {
        const res = await fetch(`/api/traffic/violations/${violationId}/evidence`);
        const data = await res.json();
        if (!data.success) {
            body.innerHTML = `<div style="color: #dc2626; padding: 20px; text-align: center;">Evidence record not found.</div>`;
            return;
        }

        currentEvidenceData = data;
        const m = data.anprMetadata;
        const t = data.telemetry;
        const c = data.virtualCourtNotice;
        const isSpeed = data.violationType.includes("Speed");
        const isRed = data.violationType.includes("Red Light");

        body.innerHTML = `
            <!-- ANPR High-Resolution Viewport HUD -->
            <div class="anpr-optical-viewport">
                <div class="anpr-crosshair-h"></div>
                <div class="anpr-crosshair-v"></div>

                <!-- Vehicle Silhouette & Reticle -->
                <div class="anpr-target-vehicle-box"></div>
                <div class="anpr-plate-target-box">
                    <span class="anpr-plate-label">OCR TARGET</span>
                    <strong style="font-family: monospace; font-size: 15px; color: #ffffff; letter-spacing: 1px; text-shadow: 0 0 8px #22c55e;">
                        ${data.vehicleNumber}
                    </strong>
                </div>

                <!-- Camera Optical Specs Watermark -->
                <div class="anpr-hud-watermark">
                    <div>CAM: ${data.location.junctionName} • ${m.cameraSensorModel}</div>
                    <div>OPTICS: ${m.opticalLensSpecs} • EXP: ${m.shutterSpeed}</div>
                    <div>LUX: ${m.ambientLuxLevel} • GPS: ${data.location.latitude.toFixed(4)}°N, ${data.location.longitude.toFixed(4)}°E</div>
                    <div>TIMESTAMP: ${new Date(data.timestamp).toLocaleString()}</div>
                </div>

                <!-- Telemetry Stamp -->
                <div class="anpr-hud-telemetry">
                    <div style="color: ${isSpeed ? '#ef4444' : '#22c55e'}; font-weight: 800;">
                        RADAR SPEED: ${t.radarObservedSpeedKmh} (LIMIT ${t.radarSpeedLimitKmh})
                    </div>
                    <div>EXCESS: ${t.speedExcessDelta}</div>
                    ${isRed ? `<div style="color: #ef4444; font-weight: 700;">PHASE: ${t.signalPhaseAtBreach}</div>` : ''}
                    <div>OCR CONF: <strong>${m.ocrConfidence}</strong></div>
                </div>
            </div>

            <!-- Optical & Vehicle Details Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                    <strong style="font-size: 12px; color: #0f172a; display: block; margin-bottom: 6px;">
                        <i class="fa-solid fa-car" style="color: #2563eb;"></i> VEHICLE CLASSIFICATION
                    </strong>
                    <div style="font-size: 12px; color: #475569;">Registration: <strong style="color: #0f172a;">${data.vehicleNumber}</strong></div>
                    <div style="font-size: 12px; color: #475569;">Class: <strong>${m.detectedVehicleClass}</strong></div>
                    <div style="font-size: 12px; color: #475569;">Plate Spec: <strong>${m.licensePlateType}</strong></div>
                    <div style="font-size: 12px; color: #475569;">Fine Amount: <strong style="color: #b91c1c;">₹${data.fineAmount}</strong></div>
                </div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                    <strong style="font-size: 12px; color: #0f172a; display: block; margin-bottom: 6px;">
                        <i class="fa-solid fa-gauge-high" style="color: #ef4444;"></i> TELEMETRY & BREACH ANALYSIS
                    </strong>
                    <div style="font-size: 12px; color: #475569;">Violation: <strong style="color: #dc2626;">${data.violationType}</strong></div>
                    <div style="font-size: 12px; color: #475569;">Radar Speed: <strong>${t.radarObservedSpeedKmh}</strong></div>
                    <div style="font-size: 12px; color: #475569;">Stop Line Breach: <strong>${t.stopLineCrossedMeters}</strong></div>
                    <div style="font-size: 12px; color: #475569;">Current Status: <span class="badge badge-online">${data.status}</span></div>
                </div>
            </div>

            <!-- Virtual Court Statutory Legal Sheet -->
            <div class="virtual-court-sheet">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span class="court-seal-badge"><i class="fa-solid fa-scale-balanced"></i> ${c.issuingCourt}</span>
                    <strong style="font-family: monospace; font-size: 11px; color: #1e3a8a;">${c.noticeNumber}</strong>
                </div>
                <div style="font-size: 12px; margin-bottom: 4px;">
                    <strong>Statutory Provision:</strong> ${c.statutorySection}
                </div>
                <div style="font-size: 12px; color: #475569; margin-bottom: 4px;">
                    <strong>Enforcement Authority:</strong> ${c.policeStationJurisdiction}
                </div>
                <div style="font-size: 11px; color: #64748b; font-style: italic;">
                    Notice issued electronically via Gorakhpur SmartCity ICCC ITMS Automated Enforcement Core. Verified digital evidence record.
                </div>
            </div>
        `;
    } catch (e) {
        body.innerHTML = `<div style="color: #dc2626; padding: 20px; text-align: center;">Failed to load optical evidence.</div>`;
    }
}

function printVirtualCourtNotice() {
    if (!currentEvidenceData) {
        window.print();
        return;
    }
    showToast(`🖨️ Generating printable Court Notice ${currentEvidenceData.virtualCourtNotice.noticeNumber}...`);
    window.print();
}

// =========================================================
// 17. LIVE MOVING AMBULANCE FLEET & CRITICAL PREEMPTION
// =========================================================
let allLiveAmbulances = [];
let activeCriticalAmbulance = null;

async function loadLiveAmbulancesFleet() {
    try {
        const res = await fetch("/api/traffic/ambulances/live");
        const data = await res.json();
        if (data.success && Array.isArray(data.ambulances)) {
            allLiveAmbulances = data.ambulances;
            trafficMap.renderLiveAmbulances(allLiveAmbulances);

            const badge = document.getElementById("map-amb-badge");
            if (badge) badge.textContent = allLiveAmbulances.length;

            renderLiveAmbulancesTable(allLiveAmbulances);

            // Check if any is currently critical
            const crit = allLiveAmbulances.find(a => a.isCritical);
            if (crit) {
                activeCriticalAmbulance = crit;
                showCriticalTransitBanner(crit);
            }
        }
    } catch (err) {
        console.error("Load live ambulances fleet error:", err);
    }
}

function renderLiveAmbulancesTable(ambulances) {
    const tbody = document.getElementById("live-ambulances-tbody");
    if (!tbody) return;

    if (!ambulances || ambulances.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:18px; color:#64748b;">No active ambulances detected in transit pool.</td></tr>`;
        return;
    }

    tbody.innerHTML = ambulances.map(amb => {
        const isCrit = !!amb.isCritical;
        return `
            <tr id="amb-row-${amb.id || amb.ambulance_id}" style="${isCrit ? 'background: #fef2f2;' : ''}">
                <td>
                    <div style="font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 6px;">
                        <span>${isCrit ? '🚨' : '🚑'}</span>
                        <span>${amb.vehicle_number}</span>
                    </div>
                    <small style="color: #64748b; font-size: 11px;">${amb.ambulance_type || 'ALS Unit'}</small>
                </td>
                <td>
                    <div style="font-size: 12px; font-weight: 600;">${amb.driver_name || 'Assigned Driver'}</div>
                    <small style="color: #2563eb; font-size: 11px;"><i class="fa-solid fa-phone"></i> ${amb.driver_mobile || '+91 98765 43210'}</small>
                </td>
                <td>
                    <span style="font-size: 12px; font-weight: 600; color: #1e3a8a;">
                        <i class="fa-solid fa-hospital" style="color: #2563eb;"></i> ${amb.destinationHospital || amb.hospital_name || 'BRD Medical'}
                    </span>
                </td>
                <td>
                    <div style="font-size: 12px; font-family: monospace; color: #334155;">
                        ${Number(amb.latitude).toFixed(4)}°N, ${Number(amb.longitude).toFixed(4)}°E
                    </div>
                    <small style="color: #64748b; font-size: 11px;">${amb.location || 'Gorakhpur Transit'}</small>
                </td>
                <td>
                    <span style="font-weight: 800; font-size: 13px; color: ${amb.speedKmh > 55 ? '#dc2626' : '#2563eb'};">
                        ${amb.speedKmh} km/h
                    </span>
                </td>
                <td>
                    <span class="badge ${isCrit ? 'badge-offline' : 'badge-online'}" style="${isCrit ? 'background:#dc2626; color:#fff; animation:pulse 1.5s infinite;' : ''}">
                        ${isCrit ? '🚨 CRITICAL TRANSIT' : 'PATROL / DUTY'}
                    </span>
                </td>
                <td>
                    ${!isCrit ? `
                        <button class="btn-danger btn-sm" onclick="dispatchAmbulanceCriticalCorridor('${amb.id}', '${amb.vehicle_number}', '${amb.destinationHospital}')" style="font-size: 11px; padding: 4px 10px;">
                            <i class="fa-solid fa-bolt"></i> Declare Critical & Preempt Signals
                        </button>
                    ` : `
                        <button class="btn-primary btn-sm" onclick="clearAmbulanceCriticalCorridor('${amb.id}', '${amb.vehicle_number}')" style="background: #16a34a; border-color: #16a34a; font-size: 11px; padding: 4px 10px;">
                            <i class="fa-solid fa-circle-check"></i> Clear & Restore AI Signals
                        </button>
                    `}
                </td>
            </tr>
        `;
    }).join("");
}

function updateAmbulanceRowInFleetTable(amb) {
    const row = document.getElementById(`amb-row-${amb.id || amb.ambulance_id}`);
    if (!row) {
        loadLiveAmbulancesFleet();
        return;
    }

    // Update in memory
    const idx = allLiveAmbulances.findIndex(a => String(a.id) === String(amb.id) || String(a.ambulance_id) === String(amb.ambulance_id));
    if (idx !== -1) {
        allLiveAmbulances[idx] = { ...allLiveAmbulances[idx], ...amb };
    }

    const isCrit = !!amb.isCritical;
    row.style.background = isCrit ? "#fef2f2" : "";
    const speedCell = row.cells[4];
    if (speedCell) {
        speedCell.innerHTML = `<span style="font-weight:800; font-size:13px; color:${amb.speedKmh > 55 ? '#dc2626' : '#2563eb'};">${amb.speedKmh} km/h</span>`;
    }
    const gpsCell = row.cells[3];
    if (gpsCell) {
        gpsCell.innerHTML = `
            <div style="font-size:12px; font-family:monospace; color:#334155;">
                ${Number(amb.latitude).toFixed(4)}°N, ${Number(amb.longitude).toFixed(4)}°E
            </div>
            <small style="color:#64748b; font-size:11px;">${amb.location || 'Transit'}</small>
        `;
    }
}

async function dispatchAmbulanceCriticalCorridor(ambId, vehicleNumber, destHospital) {
    try {
        showToast(`🚨 Dispatching Critical Corridor for ${vehicleNumber}...`);
        WebAudioEngine.playSiren();

        const res = await fetch(`/api/traffic/ambulances/${ambId}/critical-dispatch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                destinationHospital: destHospital || "BRD Medical College",
                reason: "Acute Trauma Emergency Transit"
            })
        });

        const data = await res.json();
        if (data.success) {
            showToast(`✅ CRITICAL CORRIDOR ACTIVE: All signals along route set to FORCE GREEN.`);
            onCriticalTransitActivated(data.ambulance || { vehicle_number: vehicleNumber, destinationHospital: destHospital });
            await loadSharedTrafficData();
        } else {
            showToast(`Error: ${data.error || 'Failed to dispatch'}`);
        }
    } catch (e) {
        showToast(`Network error triggering critical dispatch: ${e.message}`);
    }
}

async function clearAmbulanceCriticalCorridor(ambId, vehicleNumber) {
    try {
        showToast(`Restoring normal traffic signals for ${vehicleNumber}...`);
        WebAudioEngine.stopSiren();

        const res = await fetch(`/api/traffic/ambulances/${ambId}/clear-critical`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        const data = await res.json();
        if (data.success) {
            showToast(`✅ Critical transit cleared. AI Adaptive signals restored.`);
            onCriticalTransitCleared(data.ambulance || { vehicle_number: vehicleNumber });
            await loadSharedTrafficData();
        } else {
            showToast(`Error: ${data.error || 'Failed to clear'}`);
        }
    } catch (e) {
        showToast(`Network error clearing critical dispatch.`);
    }
}

function onCriticalTransitActivated(data) {
    activeCriticalAmbulance = data;
    showCriticalTransitBanner(data);
    WebAudioEngine.playSiren();
    if (trafficMap && trafficMap.renderCriticalAmbulanceRoute) {
        trafficMap.renderCriticalAmbulanceRoute(data);
    }
    loadLiveAmbulancesFleet();
}

function onCriticalTransitCleared(data) {
    activeCriticalAmbulance = null;
    hideCriticalTransitBanner();
    WebAudioEngine.stopSiren();
    if (trafficMap && trafficMap.clearCriticalAmbulanceRoute) {
        trafficMap.clearCriticalAmbulanceRoute();
    }
    loadLiveAmbulancesFleet();
}

function showCriticalTransitBanner(amb) {
    const banner = document.getElementById("critical-transit-banner");
    if (!banner) return;
    banner.style.display = "block";
    const ambNo = document.getElementById("crit-banner-amb-no");
    const hosp = document.getElementById("crit-banner-hospital");
    const jncCount = document.getElementById("crit-banner-jnc-count");

    if (ambNo) ambNo.textContent = amb.vehicle_number || amb.vehicleNumber || "AMB-001";
    if (hosp) hosp.textContent = amb.destinationHospital || amb.hospitalName || "BRD Medical College";
    if (jncCount) jncCount.textContent = (amb.affectedJunctions ? amb.affectedJunctions.length : 4);
}

function hideCriticalTransitBanner() {
    const banner = document.getElementById("critical-transit-banner");
    if (banner) banner.style.display = "none";
}

function focusCriticalAmbulanceOnMap() {
    if (!activeCriticalAmbulance || !trafficMap || !trafficMap.map) {
        showToast("Tracking moving emergency fleet on map.");
        trafficMap.resetView();
        return;
    }
    const lat = Number(activeCriticalAmbulance.latitude) || 26.7640;
    const lng = Number(activeCriticalAmbulance.longitude) || 83.3770;
    trafficMap.map.getView().animate({
        center: ol.proj.fromLonLat([lng, lat]),
        zoom: 15.5,
        duration: 800
    });
}

function clearActiveCriticalTransit() {
    if (activeCriticalAmbulance && (activeCriticalAmbulance.id || activeCriticalAmbulance.ambulance_id)) {
        clearAmbulanceCriticalCorridor(activeCriticalAmbulance.id || activeCriticalAmbulance.ambulance_id, activeCriticalAmbulance.vehicle_number);
    } else {
        hideCriticalTransitBanner();
        if (trafficMap) trafficMap.clearCriticalAmbulanceRoute();
        showToast("Critical corridor banner dismissed.");
    }
}

// =========================================================
// 17. CONGESTION HEATMAP LIVE CONTROLS
// =========================================================
function onHeatmapRadiusChange(val) {
    const lbl = document.getElementById("hm-radius-val");
    if (lbl) lbl.textContent = `${val}px`;
    if (trafficMap && trafficMap.setHeatmapRadius) {
        trafficMap.setHeatmapRadius(val);
    }
}

function onHeatmapBlurChange(val) {
    const lbl = document.getElementById("hm-blur-val");
    if (lbl) lbl.textContent = `${val}px`;
    if (trafficMap && trafficMap.setHeatmapBlur) {
        trafficMap.setHeatmapBlur(val);
    }
}

function onHeatmapOpacityChange(val) {
    const lbl = document.getElementById("hm-opacity-val");
    if (lbl) lbl.textContent = `${val}%`;
    if (trafficMap && trafficMap.setHeatmapOpacity) {
        trafficMap.setHeatmapOpacity(parseFloat(val) / 100);
    }
}

// =========================================================
// 18. TRAFFIC LIGHT LOCATION MODIFICATION & MAP PICKER
// =========================================================
function openModifySignalLocationModal(sigId) {
    if (!isStaffUser()) {
        showToast("🔒 Access Denied: Only authorized traffic control staff can edit traffic lights.");
        return;
    }

    let sig = allSignals.find(s => String(s.id) === String(sigId));
    if (!sig) {
        for (const j of allJunctions) {
            if (j.signals) {
                const found = j.signals.find(s => String(s.id) === String(sigId));
                if (found) { sig = found; break; }
            }
        }
    }

    const idInput = document.getElementById("mod-sig-id");
    const labelId = document.getElementById("mod-sig-label-id");
    const badge = document.getElementById("mod-sig-approach-badge");
    const streetLabel = document.getElementById("mod-sig-street-label");
    const latInput = document.getElementById("mod-sig-lat-input");
    const lngInput = document.getElementById("mod-sig-lng-input");

    if (idInput) idInput.value = sigId;
    if (labelId) labelId.textContent = sigId;

    if (sig) {
        if (badge) badge.textContent = `${sig.approach || 'Signal'} Approach`;
        if (streetLabel) streetLabel.textContent = `${sig.street_name || (sig.junction_name ? sig.junction_name + ' (' + sig.approach + ')' : sigId)}`;
        if (latInput) latInput.value = sig.latitude !== undefined && sig.latitude !== null ? Number(sig.latitude).toFixed(7) : '26.7588000';
        if (lngInput) lngInput.value = sig.longitude !== undefined && sig.longitude !== null ? Number(sig.longitude).toFixed(7) : '83.3731000';
    } else {
        if (badge) badge.textContent = "Signal Head";
        if (streetLabel) streetLabel.textContent = "Gorakhpur Urban Traffic Light";
        if (latInput) latInput.value = '26.7588000';
        if (lngInput) lngInput.value = '83.3731000';
    }

    openModal("modal-modify-signal-location");
}

function pickCoordsForSignalRelocation() {
    if (!isStaffUser()) {
        showToast("🔒 Access Denied: Only authorized traffic control staff can edit traffic lights.");
        return;
    }

    closeModal("modal-modify-signal-location");
    const mapEl = document.getElementById("traffic-ol-map");
    if (mapEl) mapEl.scrollIntoView({ behavior: "smooth" });

    showToast("🎯 Click anywhere on the map to set the new traffic light position...");

    trafficMap.startCoordinatePickMode((lat, lng) => {
        const latInput = document.getElementById("mod-sig-lat-input");
        const lngInput = document.getElementById("mod-sig-lng-input");
        if (latInput) latInput.value = Number(lat).toFixed(7);
        if (lngInput) lngInput.value = Number(lng).toFixed(7);

        openModal("modal-modify-signal-location");
        showToast(`📍 Selected coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    });
}

async function submitSignalLocationModification() {
    if (!isStaffUser()) {
        showToast("🔒 Access Denied: Only authorized traffic staff can edit traffic light locations.");
        return;
    }

    const sigId = document.getElementById("mod-sig-id").value;
    const latVal = parseFloat(document.getElementById("mod-sig-lat-input").value);
    const lngVal = parseFloat(document.getElementById("mod-sig-lng-input").value);

    if (!sigId) {
        showToast("Error: No traffic light selected.");
        return;
    }

    if (isNaN(latVal) || isNaN(lngVal)) {
        showToast("Please enter valid numeric latitude and longitude coordinates.");
        return;
    }

    try {
        const operatorName = (window.SmartCityAuth && SmartCityAuth.getUser() && SmartCityAuth.getUser().name) ||
                             document.getElementById("navUserName").textContent ||
                             "Traffic Staff";
        const role = (window.SmartCityAuth && SmartCityAuth.getUser() && SmartCityAuth.getUser().role) || "Traffic Staff";

        const token = window.SmartCityAuth && SmartCityAuth.getToken();
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        headers["x-user-role"] = role;

        const res = await fetch(`/api/traffic/signals/${encodeURIComponent(sigId)}/location`, {
            method: "PUT",
            headers,
            body: JSON.stringify({
                latitude: latVal,
                longitude: lngVal,
                operator: operatorName,
                role: role
            })
        });

        const json = await res.json();
        if (json.success) {
            closeModal("modal-modify-signal-location");
            showToast(`✅ Traffic light ${sigId} relocated to (${latVal.toFixed(5)}, ${lngVal.toFixed(5)}).`);

            // Immediately update map feature position
            if (trafficMap && trafficMap.updateSignalPosition) {
                trafficMap.updateSignalPosition(sigId, latVal, lngVal);
            }

            // Update in-memory signals cache
            const sig = allSignals.find(s => String(s.id) === String(sigId));
            if (sig) {
                sig.latitude = latVal;
                sig.longitude = lngVal;
            }

            loadAdminSignalsTable();
            loadAuditLogs();
        } else {
            showToast(`Error: ${json.error || 'Failed to update location'}`);
        }
    } catch (e) {
        showToast("Network error updating traffic light location.");
    }
}

// =========================================================
// 19. CAMERA TRAFFIC DATA ACCOUNTING & CONGESTION SUMMARY
// =========================================================
async function showJunctionCameraTrafficSummary(jncId) {
    try {
        const res = await fetch(`/api/traffic/junctions/${jncId}/camera-traffic-summary`);
        const json = await res.json();
        if (!json.success || !json.junction) {
            showToast("Failed to fetch camera traffic telemetry.");
            return;
        }

        const j = json.junction;
        const cams = json.cameras || [];

        const jncNameEl = document.getElementById("cam-summary-jnc-name");
        const jncZoneEl = document.getElementById("cam-summary-jnc-zone");
        const congBadgeEl = document.getElementById("cam-summary-cong-badge");
        const spdLabelEl = document.getElementById("cam-summary-spd-label");
        const tableContainer = document.getElementById("cam-summary-table-container");

        if (jncNameEl) jncNameEl.textContent = j.name;
        if (jncZoneEl) jncZoneEl.textContent = `${j.zone || 'Urban Corridor'} • ${cams.length} CCTV Optical Sensor Units Reporting`;
        if (congBadgeEl) {
            congBadgeEl.textContent = `${j.congestion_level}% ${j.status || ''}`;
            congBadgeEl.className = `badge ${j.congestion_level > 70 ? 'badge-offline' : (j.congestion_level > 40 ? 'badge-maintenance' : 'badge-online')}`;
        }
        if (spdLabelEl) spdLabelEl.textContent = `Average Flow Speed: ${json.average_speed_kmh} km/h • Total Junction Flow: ${json.total_vehicles_per_min} veh/min`;

        if (tableContainer) {
            if (cams.length === 0) {
                tableContainer.innerHTML = `<div style="text-align:center; padding:18px; color:#64748b;">No active CCTV cameras configured at this junction.</div>`;
            } else {
                tableContainer.innerHTML = `
                    <table class="data-table" style="font-size:12px; margin-top:8px;">
                        <thead>
                            <tr>
                                <th>Camera Unit</th>
                                <th>Approach</th>
                                <th>Vehicles / min</th>
                                <th>Approach Speed</th>
                                <th>Sensor Type</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${cams.map(c => `
                                <tr>
                                    <td><strong>${c.camera_name}</strong><br><small style="color:#64748b;">${c.id}</small></td>
                                    <td><span class="badge badge-online" style="font-size:10px;">${c.direction}</span></td>
                                    <td><strong style="color:#2563eb; font-size:13px;">${c.vehicles_per_min || 0}</strong> veh/min</td>
                                    <td><strong>${c.avg_speed || 0}</strong> km/h</td>
                                    <td style="font-size:11px; color:#475569;">${c.sensor_type || 'AI Optical Vision'}</td>
                                    <td><span class="badge ${c.status === 'Online' ? 'badge-online' : 'badge-offline'}" style="font-size:10px;">${c.status}</span></td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                `;
            }
        }

        openModal("modal-camera-traffic-summary");
    } catch (e) {
        showToast("Error retrieving camera traffic summary.");
    }
}

async function promptCameraTrafficSurge(camId, camName) {
    if (!isStaffUser()) {
        showToast("🔒 Access Denied: Staff authorization required to simulate camera traffic feeds.");
        return;
    }

    const testVeh = Math.floor(75 + Math.random() * 25);
    const testSpd = Number((10 + Math.random() * 6).toFixed(1));

    try {
        const token = window.SmartCityAuth && SmartCityAuth.getToken();
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        headers["x-user-role"] = "staff";

        const res = await fetch(`/api/traffic/cameras/${camId}/traffic-feed`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                vehicles_per_min: testVeh,
                avg_speed: testSpd,
                operator: (window.SmartCityAuth && SmartCityAuth.getUser() && SmartCityAuth.getUser().name) || "Traffic Staff",
                role: "Traffic Staff"
            })
        });

        const json = await res.json();
        if (json.success) {
            showToast(`🚨 Camera ${camName} surge: ${testVeh} veh/min! Recalculated junction congestion to ${json.junctionUpdate?.congestion_level || '--'}%. Heatmap updated.`);
            loadDynamicCCTVWall();
            loadSharedTrafficData();
        } else {
            showToast(`Error: ${json.error || 'Failed to simulate feed'}`);
        }
    } catch (e) {
        showToast("Network error submitting camera traffic feed.");
    }
}