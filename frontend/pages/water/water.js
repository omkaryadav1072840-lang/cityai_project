/**
 * SmartCity AI - Master Water Management Module
 * 3-Layer Architecture:
 *   Layer 1: Citizen Water Services (Complaints, Tanker Request, Supply Status, Telemetry)
 *   Layer 2: Water Staff Operations & Dispatch (Plumber Assignment, SLA Engine, Tanker Fleet)
 *   Layer 3: Water Infrastructure & SCADA (Pump Remote Control, Pipeline Health, Lab Quality Registry)
 * Fully integrated with SmartCityAuth, SmartCityRealtime, and MySQL REST Endpoints.
 */

(function () {
    "use strict";

    // -------------------------------------------------------
    // 1. GLOBAL STATE & CONFIG
    // -------------------------------------------------------
    const API_BASE = (typeof window !== "undefined" && window.API_BASE_URL !== undefined)
        ? window.API_BASE_URL
        : (typeof window !== "undefined" && (window.location.port === "5000" || window.location.protocol === "file:") ? "http://localhost:5000" : "");

    let currentLayer = "citizen";
    let waterMap = null;
    let mapMarkers = [];
    let pipelineLayers = [];

    // Local in-memory caches
    let tanks = [];
    let reports = [];
    let tankerBookings = [];
    let pipelines = [];
    let technicians = [];
    let qualityLogs = [];
    let schedules = [];

    // -------------------------------------------------------
    // 2. AUTHENTICATION & ROLE DETECTION
    // -------------------------------------------------------
    function getAuth() {
        return (typeof window !== "undefined" && window.SmartCityAuth) ? window.SmartCityAuth : null;
    }

    function getCurrentUser() {
        const auth = getAuth();
        return auth ? auth.getUser() : null;
    }

    function isWaterStaff() {
        const user = getCurrentUser();
        if (user) {
            const role = (user.role || user.type || "").toLowerCase();
            const accountType = (user.accountType || "").toLowerCase();
            const dept = (user.department || "").toLowerCase();
            const sub = (user.subRole || user.designation || "").toLowerCase();
            const staffId = (user.staffId || user.staff_id || "").toUpperCase();

            // Other departments are strictly blocked from water staff views
            const otherDepts = ["hospital", "healthcare", "traffic", "police", "waste", "sanitation", "emergency", "fire"];
            if (otherDepts.includes(dept) && !dept.includes("water") && !(user.editable && user.editable.includes("water"))) {
                return false;
            }
            if ((user.hospitalId || user.hospitalRole) && !(user.editable && user.editable.includes("water"))) {
                return false;
            }

            if (role === "super_admin" || accountType === "super_admin") return true;
            if (role === "water_admin" || accountType === "water_admin" || staffId === "WTR-ADMIN") return true;
            if (role === "water_staff" || accountType === "water_staff" || staffId.startsWith("WTR")) return true;
            if (role.includes("water") || sub.includes("water") || sub.includes("engineer")) return true;
            if ((role === "staff" || role === "admin") && (dept === "water" || dept === "admin" || !dept)) return true;
        }
        return localStorage.getItem("waterRole") === "worker";
    }

    function isWaterAdmin() {
        const user = getCurrentUser();
        if (user) {
            const role = (user.role || user.type || "").toLowerCase();
            const accountType = (user.accountType || "").toLowerCase();
            const dept = (user.department || "").toLowerCase();
            const sub = (user.subRole || user.designation || "").toLowerCase();
            const staffId = (user.staffId || user.staff_id || "").toUpperCase();

            // Other departments cannot be Water Admin
            const otherDepts = ["hospital", "healthcare", "traffic", "police", "waste", "sanitation", "emergency", "fire"];
            if (otherDepts.includes(dept) && !dept.includes("water")) {
                return false;
            }
            if (user.hospitalId || user.hospitalRole) {
                return false;
            }

            if (role === "super_admin" || accountType === "super_admin") return true;
            if (role === "water_admin" || accountType === "water_admin" || staffId === "WTR-ADMIN") return true;
            if (role === "admin" && (dept === "water" || dept === "admin" || !dept)) return true;
            if (sub.includes("water admin") || sub.includes("superintendent")) return true;
        }
        return localStorage.getItem("waterRole") === "admin";
    }
    window.isWaterAdmin = isWaterAdmin;

    window.toggle3DSewageVisibility = function(val) {
        if (typeof window.Water3DExplorer !== "undefined" && window.Water3DExplorer.setSewageRouteVisibility) {
            window.Water3DExplorer.setSewageRouteVisibility(val);
        }
    };

    function getAuthHeaders() {
        const auth = getAuth();
        const token = auth ? auth.getToken() : null;
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        return headers;
    }

    // -------------------------------------------------------
    // 3. 3-LAYER NAVIGATION
    // -------------------------------------------------------
    function switchWaterLayer(layer) {
        currentLayer = layer;
        const staff = isWaterStaff();
        const adminAuth = isWaterAdmin();

        // Update tab buttons
        document.querySelectorAll(".layer-tab-btn").forEach(btn => btn.classList.remove("active"));
        const activeBtn = document.getElementById(`tab-btn-${layer}`);
        if (activeBtn) activeBtn.classList.add("active");

        // Toggle layer containers
        const citizenLayer = document.getElementById("layer-citizen-content");
        const staffLayer = document.getElementById("layer-staff-content");
        const flowLayer = document.getElementById("layer-flow-content");
        const faultsLayer = document.getElementById("layer-faults-content");
        const adminLayer = document.getElementById("layer-admin-content");
        const sewageLayer = document.getElementById("layer-sewage-content");

        if (citizenLayer) citizenLayer.style.display = (layer === "citizen") ? "block" : "none";
        if (staffLayer) staffLayer.style.display = (layer === "staff") ? "block" : "none";
        if (flowLayer) flowLayer.style.display = (layer === "flow") ? "block" : "none";
        if (faultsLayer) faultsLayer.style.display = (layer === "faults") ? "block" : "none";
        if (adminLayer) adminLayer.style.display = (layer === "admin") ? "block" : "none";
        if (sewageLayer) sewageLayer.style.display = (layer === "sewage") ? "block" : "none";

        // Gatekeepers for staff and admin
        const staffGatekeeper = document.getElementById("staffGatekeeper");
        const staffMain = document.getElementById("staffOperationsMain");
        if (staffGatekeeper && staffMain) {
            staffGatekeeper.style.display = staff ? "none" : "block";
            staffMain.style.display = staff ? "block" : "none";
        }

        const flowGatekeeper = document.getElementById("flowGatekeeper");
        const flowMain = document.getElementById("flowMain");
        if (flowGatekeeper && flowMain) {
            flowGatekeeper.style.display = staff ? "none" : "block";
            flowMain.style.display = staff ? "block" : "none";
        }

        const adminGatekeeper = document.getElementById("adminGatekeeper");
        const adminMain = document.getElementById("adminAssetsMain");
        if (adminGatekeeper && adminMain) {
            adminGatekeeper.style.display = staff ? "none" : "block";
            adminMain.style.display = staff ? "block" : "none";
        }

        // Gatekeeper for Sewage Network Planner (Water Admin Only)
        const sewageGatekeeper = document.getElementById("sewageGatekeeper");
        const sewageMain = document.getElementById("sewagePlannerMain");
        if (sewageGatekeeper && sewageMain) {
            sewageGatekeeper.style.display = adminAuth ? "none" : "block";
            sewageMain.style.display = adminAuth ? "block" : "none";
        }

        if (layer === "flow" && typeof window.loadFlowControlDesk === "function") {
            window.loadFlowControlDesk();
        }
        if (layer === "faults" && typeof window.loadFaultsDesk === "function") {
            window.loadFaultsDesk();
        }
        if (layer === "staff" && typeof window.loadWorkOrders === "function") {
            window.loadWorkOrders();
        }
        if (layer === "sewage" && typeof window.SewagePlannerUI !== "undefined" && window.SewagePlannerUI.init) {
            window.SewagePlannerUI.init();
        }
        if (layer === "admin" && typeof window.loadAdminFacilities === "function") {
            window.loadAdminFacilities();
        }

        // Map resize trigger
        setTimeout(() => {
            if (waterMap) waterMap.invalidateSize();
        }, 120);
    }
    window.switchWaterLayer = switchWaterLayer;

    function applyRoleUI() {
        const staff = isWaterStaff();
        const user = getCurrentUser();
        const name = user ? (user.name || user.username || "Citizen") : (localStorage.getItem("waterRole") === "worker" ? "Water Worker" : "Citizen");

        const profileName = document.getElementById("profileName");
        const profileNavName = document.getElementById("profileNavName");
        const profileRole = document.getElementById("profileRole");
        const roleBadge = document.getElementById("roleBadge");
        const rolePill = document.getElementById("rolePill");
        const roleTitle = document.getElementById("roleTitle");
        const roleSubtitle = document.getElementById("roleSubtitle");

        const adminAuth = isWaterAdmin();
        const banner = document.getElementById("staffAuthorityScopeBanner");
        if (banner) {
            if (staff && !adminAuth) {
                banner.style.display = "block";
                const scopeName = document.getElementById("staffScopeName");
                const scopeSectors = document.getElementById("staffScopeSectors");
                const scopeAssets = document.getElementById("staffScopeAssets");
                if (scopeName) scopeName.textContent = `${name} (${user?.staffId || user?.staff_id || 'WTR-STAFF'})`;
                const secs = Array.isArray(user?.permitted_sectors) && user.permitted_sectors.length ? user.permitted_sectors.join(", ") : "All Municipal Sectors";
                const asts = Array.isArray(user?.permitted_assets) && user.permitted_assets.length ? user.permitted_assets.join(", ") : "All Municipal Assets";
                if (scopeSectors) scopeSectors.textContent = secs;
                if (scopeAssets) scopeAssets.textContent = asts;
            } else {
                banner.style.display = "none";
            }
        }

        if (profileName) profileName.textContent = name;
        if (profileNavName) profileNavName.textContent = name;
        if (profileRole) profileRole.textContent = adminAuth ? "Water Department Administrator" : (staff ? "Water Works Staff" : "Citizen");

        if (roleBadge) {
            roleBadge.textContent = adminAuth ? "WATER ADMIN" : (staff ? "STAFF • WATER" : "CITIZEN");
            roleBadge.style.background = adminAuth ? "#fef3c7" : (staff ? "#dbeafe" : "#e0f2fe");
            roleBadge.style.color = adminAuth ? "#b45309" : (staff ? "#1d4ed8" : "#0369a1");
        }

        if (rolePill) {
            rolePill.textContent = adminAuth ? "WATER ADMIN" : (staff ? "STAFF • WATER" : "CITIZEN");
            rolePill.className = adminAuth ? "role-pill admin-pill" : (staff ? "role-pill staff-pill" : "role-pill citizen-pill");
        }

        if (roleTitle) {
            roleTitle.textContent = adminAuth
                ? "Water Department Command Center & SCADA Administration"
                : (staff
                    ? "Water Works Operations & SCADA Control Room"
                    : `Welcome to SmartCity AI Water Services, ${name}`);
        }

        if (roleSubtitle) {
            roleSubtitle.textContent = adminAuth
                ? "Full administrative control over pipeline networks, municipal sectors, flow telemetry, work orders, versioning and rollback."
                : (staff
                    ? "Manage civic pipeline complaints, dispatch emergency tankers, control overhead pumps, and inspect telemetry."
                    : "Monitor clean water supply timings, report leaks, request doorstep water tankers, and view purity test scores.");
        }

        // Auto-switch layer based on role on page load only if no explicit URL param/tab is requested
        const urlParams = new URLSearchParams(window.location.search);
        const hasUrlRoute = urlParams.has("tab") || urlParams.has("view") || Boolean(window.location.hash);
        if (!hasUrlRoute) {
            if (adminAuth) {
                switchWaterLayer("sewage");
            } else if (staff) {
                switchWaterLayer("staff");
            } else {
                switchWaterLayer("citizen");
            }
        }
    }

    // -------------------------------------------------------
    // 4. MAP INITIALIZATION & VISUALIZATION
    // -------------------------------------------------------
    function initWaterMap() {
        const mapEl = document.getElementById("waterMap");
        if (!mapEl) return;

        waterMap = L.map("waterMap").setView([26.7606, 83.3732], 13);
        window.waterLeafletMapInstance = waterMap;
        window.waterMap = waterMap;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors | Gorakhpur Jal Sansthan"
        }).addTo(waterMap);

        renderMapMarkers();
    }

    function renderMapMarkers() {
        if (!waterMap) return;

        // Clear existing markers
        mapMarkers.forEach(m => waterMap.removeLayer(m));
        mapMarkers = [];
        pipelineLayers.forEach(l => waterMap.removeLayer(l));
        pipelineLayers = [];

        // 1. Water Tanks Markers
        tanks.forEach(tank => {
            const lat = Number(tank.latitude || tank.lat || 26.7606);
            const lng = Number(tank.longitude || tank.lng || 83.3732);
            const level = Number(tank.current_level_percent !== undefined ? tank.current_level_percent : (tank.level || 50));
            const pump = (tank.pump_status || tank.pump || "ON").toUpperCase();

            let color = "#0284c7";
            if (level <= 25) color = "#dc2626";
            else if (level <= 50) color = "#ea580c";
            else color = "#16a34a";

            const icon = L.divIcon({
                className: "water-tank-marker",
                html: `
                    <div style="
                        width: 36px; height: 36px; border-radius: 50%;
                        background: ${color}; border: 3px solid white;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                        display: flex; align-items: center; justify-content: center;
                        color: white; font-size: 16px; font-weight: bold;
                    ">
                        💧
                    </div>
                `,
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            });

            const marker = L.marker([lat, lng], { icon }).addTo(waterMap);
            marker.bindPopup(`
                <div style="min-width: 220px; font-family: sans-serif;">
                    <h3 style="margin: 0 0 6px; color: #0f172a; font-size: 15px;">💧 ${escapeHTML(tank.name)}</h3>
                    <p style="margin: 2px 0; font-size: 13px; color: #64748b;">📍 <strong>Zone:</strong> ${escapeHTML(tank.zone || tank.location || 'Gorakhpur')}</p>
                    <p style="margin: 2px 0; font-size: 13px; color: #334155;"><strong>Capacity:</strong> ${Number(tank.capacity_liters || tank.capacity || 50000).toLocaleString()} L</p>
                    <p style="margin: 2px 0; font-size: 13px; color: #334155;"><strong>Level:</strong> <span style="color:${color}; font-weight:bold;">${level}%</span></p>
                    <p style="margin: 2px 0; font-size: 13px; color: #334155;"><strong>Pump:</strong> <span style="color:${pump === 'ON' ? '#16a34a' : '#dc2626'}; font-weight:bold;">${pump}</span></p>
                    ${isWaterStaff() ? `
                        <div style="margin-top: 10px; display: flex; gap: 6px;">
                            <button onclick="window.togglePumpStatus(${tank.id}, '${pump}')" style="background: ${pump === 'ON' ? '#fee2e2' : '#dcfce7'}; color: ${pump === 'ON' ? '#b91c1c' : '#15803d'}; border: 0; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">
                                ${pump === 'ON' ? 'Turn Pump OFF' : 'Turn Pump ON'}
                            </button>
                            <button onclick="window.editTank(${tank.id})" style="background: #0284c7; color: white; border: 0; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">
                                Edit Tank
                            </button>
                        </div>
                    ` : ''}
                </div>
            `);
            mapMarkers.push(marker);
        });

        // 2. Active Leakage Complaints Markers
        reports.filter(r => r.status !== "Resolved" && (r.issue_type === "Pipe Leak" || r.issue_type === "No Supply" || r.type === "leakage")).forEach((rep, idx) => {
            const baseLat = 26.7550 + (idx * 0.008);
            const baseLng = 83.3750 + (idx * 0.006);

            const leakIcon = L.divIcon({
                className: "water-leak-marker",
                html: `
                    <div style="
                        width: 30px; height: 30px; border-radius: 50%;
                        background: #dc2626; border: 2px solid white;
                        box-shadow: 0 0 12px rgba(220, 38, 38, 0.7);
                        display: flex; align-items: center; justify-content: center;
                        color: white; font-size: 14px;
                    ">
                        💦
                    </div>
                `,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            const marker = L.marker([baseLat, baseLng], { icon: leakIcon }).addTo(waterMap);
            marker.bindPopup(`
                <div style="min-width: 190px;">
                    <h4 style="margin:0 0 4px; color:#dc2626;">⚠️ Active Leak: ${escapeHTML(rep.report_id || 'Complaint')}</h4>
                    <p style="margin:2px 0; font-size:12px;">📍 ${escapeHTML(rep.location)}</p>
                    <p style="margin:2px 0; font-size:12px;"><strong>Priority:</strong> ${escapeHTML(rep.priority || 'HIGH')}</p>
                    <p style="margin:2px 0; font-size:12px;"><strong>Status:</strong> ${escapeHTML(rep.status)}</p>
                </div>
            `);
            mapMarkers.push(marker);
        });
    }

    // -------------------------------------------------------
    // 5. REST API SYNC ENGINE
    // -------------------------------------------------------
    async function fetchAllWaterData() {
        try {
            await Promise.all([
                fetchSummary(),
                fetchTanks(),
                fetchReports(),
                fetchTankers(),
                fetchPipelines(),
                fetchTechnicians(),
                fetchQualityLogs(),
                fetchSchedules()
            ]);
        } catch (err) {
            console.warn("Water API sync error:", err);
        }
    }

    async function fetchSummary() {
        try {
            const res = await fetch(`${API_BASE}/api/water/operations/summary`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.summary) {
                    const s = data.summary;
                    const sc = document.getElementById("supplyCount");
                    const tc = document.getElementById("tankCount");
                    const ic = document.getElementById("issueCount");
                    const pi = document.getElementById("pendingIssues");
                    const ci = document.getElementById("criticalIssuesCount");
                    const pt = document.getElementById("pendingTankersCount");
                    const at = document.getElementById("availableTechsCount");
                    const psc = document.getElementById("pumpStatusCount");
                    const critBadge = document.getElementById("criticalIssuesBadge");

                    if (sc) sc.textContent = String(s.totalPipelines || 6).padStart(2, "0");
                    if (tc) tc.textContent = String(s.totalTanks || 5).padStart(2, "0");
                    if (ic) ic.textContent = String(s.openReports || 3).padStart(2, "0");
                    if (pi) pi.textContent = String(s.openReports || 3).padStart(2, "0");
                    if (ci) ci.textContent = String(s.criticalReports || 1).padStart(2, "0");
                    if (pt) pt.textContent = String(s.pendingTankers || 1).padStart(2, "0");
                    if (at) at.textContent = String(s.activeTechnicians || 6).padStart(2, "0");
                    if (psc) psc.textContent = `${s.activePumps || 4} Pumps Active`;
                    if (critBadge) critBadge.textContent = `${s.criticalReports || 1} Critical`;
                }
            }
        } catch (e) {
            console.warn("Failed to fetch summary:", e);
        }
    }

    async function fetchTanks() {
        try {
            const res = await fetch(`${API_BASE}/api/water/tanks`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.tanks) {
                    tanks = data.tanks;
                    renderTanks();
                    renderAdminTanks();
                    renderMapMarkers();
                }
            }
        } catch (e) {
            console.warn("Failed to fetch tanks:", e);
        }
    }

    async function fetchReports() {
        try {
            const res = await fetch(`${API_BASE}/api/water/reports`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.reports) {
                    reports = data.reports;
                    renderUserReports();
                    renderStaffComplaints();
                }
            }
        } catch (e) {
            console.warn("Failed to fetch reports:", e);
        }
    }

    async function fetchTankers() {
        try {
            const res = await fetch(`${API_BASE}/api/water/tanker-bookings`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.bookings) {
                    tankerBookings = data.bookings;
                    renderUserTankers();
                    renderStaffTankers();
                }
            }
        } catch (e) {
            console.warn("Failed to fetch tankers:", e);
        }
    }

    async function fetchPipelines() {
        try {
            const res = await fetch(`${API_BASE}/api/water/pipelines`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.pipelines) {
                    pipelines = data.pipelines;
                    renderPipelines();
                }
            }
        } catch (e) {
            console.warn("Failed to fetch pipelines:", e);
        }
    }

    async function fetchTechnicians() {
        try {
            const res = await fetch(`${API_BASE}/api/water/technicians`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.technicians) {
                    technicians = data.technicians;
                    renderTechnicians();
                    populateTechSelect();
                }
            }
        } catch (e) {
            console.warn("Failed to fetch technicians:", e);
        }
    }

    async function fetchQualityLogs() {
        try {
            const res = await fetch(`${API_BASE}/api/water/quality`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.logs) {
                    qualityLogs = data.logs;
                    renderQualityLogs();
                    if (qualityLogs.length > 0) {
                        const top = qualityLogs[0];
                        const phEl = document.getElementById("qPh");
                        const tdsEl = document.getElementById("qTds");
                        const turbEl = document.getElementById("qTurb");
                        const chlorEl = document.getElementById("qChlor");
                        if (phEl) phEl.textContent = top.ph;
                        if (tdsEl) tdsEl.textContent = top.tds;
                        if (turbEl) turbEl.textContent = top.turbidity;
                        if (chlorEl) chlorEl.textContent = top.chlorine;
                    }
                }
            }
        } catch (e) {
            console.warn("Failed to fetch quality logs:", e);
        }
    }

    async function fetchSchedules() {
        try {
            const res = await fetch(`${API_BASE}/api/water/schedules`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.schedules) {
                    schedules = data.schedules;
                    renderSchedules();
                }
            }
        } catch (e) {
            console.warn("Failed to fetch schedules:", e);
        }
    }

    // -------------------------------------------------------
    // 6. UI RENDERERS — LAYER 1: CITIZEN SERVICES
    // -------------------------------------------------------
    function renderTanks() {
        const container = document.getElementById("tankContainer");
        if (!container) return;

        container.innerHTML = "";
        if (tanks.length === 0) {
            container.innerHTML = "<p style='color:#64748b;'>No water tanks found.</p>";
            return;
        }

        tanks.forEach(tank => {
            const level = Number(tank.current_level_percent !== undefined ? tank.current_level_percent : 50);
            let color = "#16a34a";
            if (level <= 25) color = "#dc2626";
            else if (level <= 50) color = "#ea580c";

            container.innerHTML += `
                <div class="tank-card">
                    <div class="tank-top">
                        <h3>💧 ${escapeHTML(tank.name)}</h3>
                        <span style="font-weight:700; color:${color}">${level}%</span>
                    </div>
                    <p class="tank-location">📍 ${escapeHTML(tank.zone || 'Gorakhpur')}</p>
                    <div class="tank-level">
                        <div class="tank-level-fill" style="width: ${level}%; background: ${color};"></div>
                    </div>
                    <div class="tank-info">
                        <span>${Number(tank.capacity_liters || 50000).toLocaleString()} L</span>
                        <span>Pump: <strong>${escapeHTML(tank.pump_status || 'ON')}</strong></span>
                    </div>
                </div>
            `;
        });
    }

    function renderUserReports() {
        const container = document.getElementById("userReports");
        if (!container) return;

        const user = getCurrentUser();
        const userName = user ? (user.name || user.username) : null;
        let list = reports;
        if (userName) {
            const myOnly = reports.filter(r => r.citizen_name === userName || r.user === userName);
            if (myOnly.length > 0) list = myOnly;
        }

        container.innerHTML = "";
        if (list.length === 0) {
            container.innerHTML = "<p style='padding:15px; color:#64748b;'>No complaints submitted yet.</p>";
            return;
        }

        list.slice(0, 8).forEach(r => {
            const priorityClass = `priority-${(r.priority || 'medium').toLowerCase()}`;
            const photoBadge = r.evidence_image ? `<a href="${r.evidence_image}" target="_blank" style="color:#0284c7; text-decoration:none; font-size:12px; font-weight:600; margin-left:8px;">📷 View Photo</a>` : '';

            container.innerHTML += `
                <div class="report-item" style="display:flex; justify-content:space-between; align-items:flex-start; padding:12px; border-bottom:1px solid #f1f5f9;">
                    <div>
                        <h4 style="margin:0 0 4px; font-size:14px; color:#0f172a;">
                            ${getIssueIcon(r.issue_type)} ${escapeHTML(r.issue_type || 'Complaint')}
                            <span class="priority-tag ${priorityClass}">${escapeHTML(r.priority || 'MEDIUM')}</span>
                        </h4>
                        <p style="margin:2px 0; font-size:12px; color:#64748b;">📍 ${escapeHTML(r.location)}</p>
                        <p style="margin:2px 0; font-size:12px; color:#334155;">${escapeHTML(r.description || '')}</p>
                        <small style="color:#94a3b8; font-size:11px;">ID: ${escapeHTML(r.report_id || 'WR')} | ${new Date(r.created_at || Date.now()).toLocaleDateString()}</small>
                        ${photoBadge}
                    </div>
                    <span class="report-status" style="background:${getStatusBg(r.status)}; color:${getStatusFg(r.status)}; padding:4px 10px; border-radius:12px; font-size:11px; font-weight:700;">
                        ${escapeHTML(r.status || 'Open')}
                    </span>
                </div>
            `;
        });
    }

    function renderUserTankers() {
        const container = document.getElementById("userTankers");
        if (!container) return;

        const user = getCurrentUser();
        const userName = user ? (user.name || user.username) : null;
        let list = tankerBookings;
        if (userName) {
            const myOnly = tankerBookings.filter(b => b.citizen_name === userName);
            if (myOnly.length > 0) list = myOnly;
        }

        container.innerHTML = "";
        if (list.length === 0) {
            container.innerHTML = "<p style='padding:15px; color:#64748b;'>No tanker requests requested yet.</p>";
            return;
        }

        list.slice(0, 8).forEach(b => {
            const driverInfo = b.assigned_driver_name ? `🚛 Driver: <strong>${escapeHTML(b.assigned_driver_name)}</strong> (${escapeHTML(b.assigned_driver_phone || '')}) • Tanker: <strong>${escapeHTML(b.assigned_tanker_number || '')}</strong>` : '⏳ Awaiting Tanker Dispatch';
            container.innerHTML += `
                <div class="report-item" style="display:flex; justify-content:space-between; align-items:flex-start; padding:12px; border-bottom:1px solid #f1f5f9;">
                    <div>
                        <h4 style="margin:0 0 4px; font-size:14px; color:#0f172a;">🚛 Tanker: ${escapeHTML(b.capacity || '5000 Litres')}</h4>
                        <p style="margin:2px 0; font-size:12px; color:#64748b;">📍 ${escapeHTML(b.delivery_address || '')}</p>
                        <p style="margin:2px 0; font-size:12px; color:#0284c7;">${driverInfo}</p>
                        <small style="color:#94a3b8; font-size:11px;">Slot: ${escapeHTML(b.delivery_slot || 'Morning')} | ID: ${escapeHTML(b.booking_id || '')}</small>
                    </div>
                    <span class="report-status" style="background:${getTankerStatusBg(b.status)}; color:${getTankerStatusFg(b.status)}; padding:4px 10px; border-radius:12px; font-size:11px; font-weight:700;">
                        ${escapeHTML(b.status || 'Pending')}
                    </span>
                </div>
            `;
        });
    }

    function renderSchedules() {
        const citTbody = document.querySelector("#citizenSchedulesTable tbody");
        const admTbody = document.querySelector("#adminSchedulesTable tbody");

        if (citTbody) {
            citTbody.innerHTML = "";
            schedules.forEach(s => {
                citTbody.innerHTML += `
                    <tr>
                        <td><strong>${escapeHTML(s.zone)}</strong></td>
                        <td>${escapeHTML(s.supply_time)}</td>
                        <td><span style="color:#16a34a; font-weight:600;">● ${escapeHTML(s.status)}</span></td>
                    </tr>
                `;
            });
        }

        if (admTbody) {
            admTbody.innerHTML = "";
            schedules.forEach(s => {
                admTbody.innerHTML += `
                    <tr>
                        <td><strong>${escapeHTML(s.zone)}</strong></td>
                        <td>${escapeHTML(s.supply_time)}</td>
                        <td>${escapeHTML(s.duration)}</td>
                        <td>${escapeHTML(s.pressure)}</td>
                        <td><span style="color:#16a34a; font-weight:600;">● ${escapeHTML(s.status)}</span></td>
                    </tr>
                `;
            });
        }
    }

    // -------------------------------------------------------
    // 7. UI RENDERERS — LAYER 2: STAFF OPERATIONS
    // -------------------------------------------------------
    function renderStaffComplaints() {
        const tbody = document.querySelector("#staffComplaintsTable tbody");
        if (!tbody) return;

        tbody.innerHTML = "";
        if (reports.length === 0) {
            tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; padding:15px;'>No complaints logged.</td></tr>";
            return;
        }

        reports.forEach(r => {
            const pClass = `priority-${(r.priority || 'medium').toLowerCase()}`;
            const photoHtml = r.evidence_image ? `<a href="${r.evidence_image}" target="_blank" class="action-btn-sm btn-blue">📷 Photo</a>` : '<span style="color:#94a3b8; font-size:11px;">None</span>';
            const techName = r.assigned_technician_name ? `👷 <strong>${escapeHTML(r.assigned_technician_name)}</strong>` : '<span style="color:#ea580c; font-weight:600;">Unassigned</span>';

            tbody.innerHTML += `
                <tr>
                    <td><strong>${escapeHTML(r.report_id || 'WR-' + r.id)}</strong><br><small style="color:#94a3b8;">${new Date(r.created_at || Date.now()).toLocaleDateString()}</small></td>
                    <td><strong>${getIssueIcon(r.issue_type)} ${escapeHTML(r.issue_type || 'Other')}</strong><br><small style="color:#64748b;">📍 ${escapeHTML(r.location)}</small></td>
                    <td><span class="priority-tag ${pClass}">${escapeHTML(r.priority || 'MEDIUM')}</span></td>
                    <td>${techName}</td>
                    <td><span class="report-status" style="background:${getStatusBg(r.status)}; color:${getStatusFg(r.status)}; padding:4px 8px; border-radius:10px; font-size:11px; font-weight:700;">${escapeHTML(r.status)}</span></td>
                    <td>${photoHtml}</td>
                    <td>
                        <div style="display:flex; gap:4px;">
                            <button class="action-btn-sm btn-blue" onclick="window.openAssignModal('${r.id}', '${escapeHTML(r.priority || 'MEDIUM')}')">
                                👷 Assign
                            </button>
                            <button class="action-btn-sm btn-green" onclick="window.updateReportStatus('${r.id}', 'Resolved')">
                                ✅ Resolve
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }

    function renderStaffTankers() {
        const tbody = document.querySelector("#staffTankersTable tbody");
        if (!tbody) return;

        tbody.innerHTML = "";
        if (tankerBookings.length === 0) {
            tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:15px;'>No tanker bookings logged.</td></tr>";
            return;
        }

        tankerBookings.forEach(b => {
            const driverBadge = b.assigned_driver_name ? `<strong>${escapeHTML(b.assigned_driver_name)}</strong> (${escapeHTML(b.assigned_tanker_number || '')})` : '<span style="color:#ea580c; font-weight:600;">Unassigned</span>';

            tbody.innerHTML += `
                <tr>
                    <td><strong>${escapeHTML(b.booking_id || 'TKB')}</strong><br><small style="color:#94a3b8;">${escapeHTML(b.booking_date || '')}</small></td>
                    <td><strong>${escapeHTML(b.citizen_name || 'Citizen')}</strong> (${escapeHTML(b.mobile || '')})<br><small style="color:#64748b;">📍 ${escapeHTML(b.delivery_address || '')}</small></td>
                    <td><strong>${escapeHTML(b.capacity || '5000 Litres')}</strong><br><small style="color:#64748b;">${escapeHTML(b.delivery_slot || '')}</small></td>
                    <td>${driverBadge}</td>
                    <td><span class="report-status" style="background:${getTankerStatusBg(b.status)}; color:${getTankerStatusFg(b.status)}; padding:4px 8px; border-radius:10px; font-size:11px; font-weight:700;">${escapeHTML(b.status)}</span></td>
                    <td>
                        <div style="display:flex; gap:4px;">
                            <button class="action-btn-sm btn-blue" onclick="window.openDispatchTankerModal('${b.id}')">
                                🚛 Dispatch
                            </button>
                            <button class="action-btn-sm btn-green" onclick="window.updateTankerStatus('${b.id}', 'Delivered')">
                                ✅ Delivered
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }

    function renderTechnicians() {
        const tbody = document.querySelector("#staffTechniciansTable tbody");
        if (!tbody) return;

        tbody.innerHTML = "";
        technicians.forEach(t => {
            const statusColor = t.status === "Available" ? "#16a34a" : (t.status === "On Duty" ? "#0284c7" : "#ea580c");
            tbody.innerHTML += `
                <tr>
                    <td><strong>${escapeHTML(t.emp_code)}</strong></td>
                    <td><strong>${escapeHTML(t.name)}</strong></td>
                    <td>${escapeHTML(t.role)}</td>
                    <td>📍 ${escapeHTML(t.zone)}</td>
                    <td>📞 ${escapeHTML(t.phone)}</td>
                    <td><span style="color:${statusColor}; font-weight:700;">● ${escapeHTML(t.status)}</span></td>
                </tr>
            `;
        });
    }

    function populateTechSelect() {
        const sel = document.getElementById("assignTechSelect");
        if (!sel) return;
        sel.innerHTML = "";
        technicians.forEach(t => {
            sel.innerHTML += `<option value="${t.id}" data-name="${escapeHTML(t.name)}">${escapeHTML(t.name)} (${escapeHTML(t.role)} - ${escapeHTML(t.zone)}) - ${escapeHTML(t.status)}</option>`;
        });
    }

    // -------------------------------------------------------
    // 8. UI RENDERERS — LAYER 3: SCADA ASSETS & INFRASTRUCTURE
    // -------------------------------------------------------
    function renderAdminTanks() {
        const container = document.getElementById("adminTankGrid");
        if (!container) return;

        container.innerHTML = "";
        tanks.forEach(tank => {
            const level = Number(tank.current_level_percent !== undefined ? tank.current_level_percent : 50);
            const pump = (tank.pump_status || "ON").toUpperCase();
            let color = "#16a34a";
            if (level <= 25) color = "#dc2626";
            else if (level <= 50) color = "#ea580c";

            container.innerHTML += `
                <div class="tank-card" style="position:relative;">
                    <div class="tank-top">
                        <h3>💧 ${escapeHTML(tank.name)}</h3>
                        <span style="font-weight:700; color:${color}">${level}%</span>
                    </div>
                    <p class="tank-location">📍 ${escapeHTML(tank.zone || 'Gorakhpur')}</p>
                    <div class="tank-level">
                        <div class="tank-level-fill" style="width: ${level}%; background: ${color};"></div>
                    </div>
                    <div class="tank-info" style="margin-bottom: 12px;">
                        <span>${Number(tank.capacity_liters || 50000).toLocaleString()} L</span>
                        <span class="scada-pump-badge ${pump === 'ON' ? 'pump-on' : (pump === 'OFF' ? 'pump-off' : 'pump-maint')}">
                            Pump: <strong>${pump}</strong>
                        </span>
                    </div>
                    <div class="tank-actions" style="display:flex; gap:6px; flex-wrap:wrap;">
                        <button class="action-btn-sm ${pump === 'ON' ? 'btn-amber' : 'btn-green'}" onclick="window.togglePumpStatus(${tank.id}, '${pump}')">
                            ${pump === 'ON' ? '🛑 Stop Pump' : '⚡ Start Pump'}
                        </button>
                        <button class="action-btn-sm btn-blue" onclick="window.editTank(${tank.id})">
                            ✏️ Edit
                        </button>
                        <button class="action-btn-sm" style="background:#fee2e2; color:#b91c1c;" onclick="window.deleteTank(${tank.id})">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            `;
        });
    }

    function renderPipelines() {
        const tbody = document.querySelector("#adminPipelinesTable tbody");
        if (!tbody) return;

        tbody.innerHTML = "";
        pipelines.forEach(p => {
            let statusBadge = `<span style="color:#16a34a; font-weight:700;">● Normal</span>`;
            if (p.status.includes("Leak")) statusBadge = `<span style="color:#dc2626; font-weight:700;">⚠️ ${escapeHTML(p.status)}</span>`;
            else if (p.status.includes("Low")) statusBadge = `<span style="color:#ea580c; font-weight:700;">⚠️ ${escapeHTML(p.status)}</span>`;

            tbody.innerHTML += `
                <tr>
                    <td><strong>${escapeHTML(p.pipeline_code)}</strong></td>
                    <td>${escapeHTML(p.name)}</td>
                    <td>📍 ${escapeHTML(p.zone)}</td>
                    <td><strong>${p.pressure_bar} bar</strong></td>
                    <td>${p.flow_rate_lps} L/s</td>
                    <td>${statusBadge}</td>
                    <td>${p.last_inspection || '2026-09-18'}</td>
                </tr>
            `;
        });
    }

    function renderQualityLogs() {
        const tbody = document.querySelector("#adminQualityTable tbody");
        if (!tbody) return;

        tbody.innerHTML = "";
        qualityLogs.forEach(q => {
            const safe = q.status === "Safe";
            tbody.innerHTML += `
                <tr>
                    <td><strong>${escapeHTML(q.zone)}</strong></td>
                    <td>${q.ph}</td>
                    <td>${q.tds} ppm</td>
                    <td><span style="color:${safe ? '#16a34a' : '#dc2626'}; font-weight:700;">● ${escapeHTML(q.status)}</span></td>
                    <td>${escapeHTML(q.tested_by || 'Jal Lab')}</td>
                </tr>
            `;
        });
    }

    // -------------------------------------------------------
    // 9. EVENT HANDLERS & MODAL ACTIONS
    // -------------------------------------------------------
    function openReportModal(type) {
        const problemType = document.getElementById("problemType");
        if (problemType) {
            if (type === "leakage") problemType.value = "Pipe Leak";
            else if (type === "no-water") problemType.value = "No Supply";
            else if (type === "dirty-water") problemType.value = "Contamination";
            else if (type === "low-pressure") problemType.value = "Low Pressure";
        }
        const modal = document.getElementById("reportModal");
        if (modal) modal.style.display = "flex";
    }
    window.openReportModal = openReportModal;

    function openTankerModal() {
        const modal = document.getElementById("tankerModal");
        if (modal) modal.style.display = "flex";
    }
    window.openTankerModal = openTankerModal;

    function openAssignModal(reportId, priority) {
        document.getElementById("assignReportId").value = reportId;
        const prioSel = document.getElementById("assignPriority");
        if (prioSel && priority) prioSel.value = priority;
        document.getElementById("assignModal").style.display = "flex";
    }
    window.openAssignModal = openAssignModal;

    function openDispatchTankerModal(bookingId) {
        document.getElementById("dispatchBookingId").value = bookingId;
        document.getElementById("dispatchTankerModal").style.display = "flex";
    }
    window.openDispatchTankerModal = openDispatchTankerModal;

    function openTankModal(tankId = null) {
        const modal = document.getElementById("tankModal");
        const form = document.getElementById("tankForm");
        form.reset();
        document.getElementById("tankId").value = "";
        document.getElementById("tankModalTitle").textContent = "🏢 Add New Water Tank";

        if (tankId) {
            const t = tanks.find(x => Number(x.id) === Number(tankId));
            if (t) {
                document.getElementById("tankId").value = t.id;
                document.getElementById("tankName").value = t.name;
                document.getElementById("tankLocation").value = t.zone || t.location || "";
                document.getElementById("tankLat").value = t.latitude || t.lat || 26.7606;
                document.getElementById("tankLng").value = t.longitude || t.lng || 83.3732;
                document.getElementById("tankCapacity").value = t.capacity_liters || t.capacity || 50000;
                document.getElementById("tankLevel").value = t.current_level_percent !== undefined ? t.current_level_percent : (t.level || 50);
                document.getElementById("pumpStatus").value = (t.pump_status || t.pump || "ON").toUpperCase();
                document.getElementById("tankModalTitle").textContent = "🏢 Edit Water Tank";
            }
        }

        if (modal) modal.style.display = "flex";
    }
    window.openTankModal = openTankModal;
    window.editTank = openTankModal;

    function openQualityModal() {
        const modal = document.getElementById("qualityModal");
        if (modal) modal.style.display = "flex";
    }
    window.openQualityModal = openQualityModal;

    function closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = "none";
    }
    window.closeModal = closeModal;

    // -------------------------------------------------------
    // 9B. VISITOR COMPLAINTS WITH MAP PICKER & TRACKING
    // -------------------------------------------------------
    let complaintPickMarker = null;
    let isPickingComplaintLocation = false;

    function startPickingComplaintLocation() {
        isPickingComplaintLocation = true;
        closeModal("reportModal");
        showToast("📍 Click anywhere on the map to set complaint location", "info");

        const mapEl = document.getElementById("waterMap");
        if (mapEl) mapEl.scrollIntoView({ behavior: "smooth" });

        function onMapClickForComplaint(e) {
            if (!isPickingComplaintLocation) return;
            isPickingComplaintLocation = false;
            if (waterMap) waterMap.off("click", onMapClickForComplaint);

            const lat = Number(e.latlng.lat).toFixed(6);
            const lng = Number(e.latlng.lng).toFixed(6);

            if (complaintPickMarker && waterMap) {
                waterMap.removeLayer(complaintPickMarker);
            }

            const icon = L.divIcon({
                className: "custom-complaint-pin",
                html: '<div style="background:#ef4444; color:#fff; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; box-shadow:0 0 10px rgba(239,68,68,0.7); border:2px solid #fff;">📍</div>',
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });

            if (waterMap) {
                complaintPickMarker = L.marker([lat, lng], { icon }).addTo(waterMap);
                complaintPickMarker.bindPopup(`<b>Complaint Pin</b><br>Lat: ${lat}<br>Lng: ${lng}`).openPopup();
            }

            const latInput = document.getElementById("reportLat");
            const lngInput = document.getElementById("reportLng");
            const coordBadge = document.getElementById("reportCoordBadge");
            const coordValues = document.getElementById("reportCoordValues");
            const locInput = document.getElementById("reportLocation");

            if (latInput) latInput.value = lat;
            if (lngInput) lngInput.value = lng;
            if (coordBadge) coordBadge.innerHTML = "✅ Map Coordinates Picked:";
            if (coordValues) coordValues.textContent = `${lat}, ${lng}`;

            if (locInput && (!locInput.value || locInput.value === "Golghar Central, Near City Mall")) {
                locInput.value = `Geo-Location [${lat}, ${lng}]`;
            }

            showToast(`📍 Location set: ${lat}, ${lng}`, "success");
            openReportModal();
        }

        if (waterMap) {
            waterMap.on("click", onMapClickForComplaint);
        }
    }
    window.startPickingComplaintLocation = startPickingComplaintLocation;

    // Report form submit
    const reportForm = document.getElementById("reportForm");
    if (reportForm) {
        reportForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const submitBtn = document.getElementById("submitReportBtn");
            if (submitBtn) submitBtn.disabled = true;

            const category = document.getElementById("problemType") ? document.getElementById("problemType").value : "Water Quality";
            const location = document.getElementById("reportLocation") ? document.getElementById("reportLocation").value.trim() : "Gorakhpur";
            const description = document.getElementById("reportDescription") ? document.getElementById("reportDescription").value.trim() : "";
            const citizenName = document.getElementById("reportCitizenName") ? document.getElementById("reportCitizenName").value.trim() : "";
            const mobile = document.getElementById("reportMobile") ? document.getElementById("reportMobile").value.trim() : "";
            const lat = document.getElementById("reportLat") ? document.getElementById("reportLat").value : null;
            const lng = document.getElementById("reportLng") ? document.getElementById("reportLng").value : null;
            const photoInput = document.getElementById("reportPhoto");

            const formData = new FormData();
            formData.append("category", category);
            formData.append("issueType", category);
            formData.append("location", location);
            formData.append("description", description);
            if (lat) formData.append("latitude", lat);
            if (lng) formData.append("longitude", lng);

            const user = getCurrentUser();
            formData.append("citizenName", citizenName || (user ? (user.name || user.username) : "Concerned Citizen"));
            formData.append("mobile", mobile || (user ? (user.phone || user.mobile) : "9876543210"));
            if (user) formData.append("userId", user.id || user.userId || "");

            if (photoInput && photoInput.files.length > 0) {
                formData.append("evidenceImage", photoInput.files[0]);
            }

            try {
                const token = getAuth() ? getAuth().getToken() : null;
                const headers = {};
                if (token) headers["Authorization"] = `Bearer ${token}`;

                let res = await fetch(`${API_BASE}/api/water/complaints`, {
                    method: "POST",
                    headers,
                    body: formData
                });

                if (!res.ok) {
                    res = await fetch(`${API_BASE}/api/water/reports`, {
                        method: "POST",
                        headers,
                        body: formData
                    });
                }

                const data = await res.json();
                if (data.success) {
                    const trackingId = data.tracking_id || data.report_id || `WTR-CMP-${Date.now().toString(36).toUpperCase()}`;
                    showToast(`✅ Complaint registered! Tracking ID: ${trackingId}`, "success");
                    closeModal("reportModal");
                    reportForm.reset();

                    renderComplaintTrackingResult({
                        tracking_id: trackingId,
                        category,
                        location,
                        status: "Open",
                        priority: (data.complaint && data.complaint.priority) || "MEDIUM",
                        created_at: new Date().toISOString(),
                        description
                    });

                    fetchAllWaterData();
                } else {
                    alert(data.message || "Failed to submit complaint.");
                }
            } catch (err) {
                console.error("Report submit error:", err);
                showToast("✅ Complaint recorded (offline fallback)", "info");
                closeModal("reportModal");
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    async function trackPublicWaterComplaint() {
        const input = document.getElementById("publicComplaintSearchInput");
        const container = document.getElementById("publicComplaintResultContainer");
        if (!input || !container) return;

        const trackingId = input.value.trim();
        if (!trackingId) {
            showToast("Please enter a tracking ID or mobile number", "warning");
            return;
        }

        container.style.display = "block";
        container.innerHTML = `<div style="text-align:center; padding:16px; color:#64748b;">🔍 Looking up complaint #${escapeHTML(trackingId)} on municipal ledger...</div>`;

        try {
            const res = await fetch(`${API_BASE}/api/water/complaints/track/${encodeURIComponent(trackingId)}`);
            const data = await res.json();
            if (data.success && data.complaint) {
                renderComplaintTrackingResult(data.complaint);
            } else {
                container.innerHTML = `
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px; color: #991b1b; text-align: center;">
                        <strong>❌ Tracking ID Not Found:</strong> Could not find an active complaint matching "<b>${escapeHTML(trackingId)}</b>". Please verify and try again.
                    </div>
                `;
            }
        } catch (err) {
            container.innerHTML = `<div style="color:red; text-align:center; padding:10px;">Network error: ${escapeHTML(err.message)}</div>`;
        }
    }
    window.trackPublicWaterComplaint = trackPublicWaterComplaint;

    function renderComplaintTrackingResult(comp) {
        const container = document.getElementById("publicComplaintResultContainer");
        if (!container) return;
        container.style.display = "block";

        const isResolved = comp.status && comp.status.toLowerCase() === "resolved";
        const statusColor = isResolved ? "#16a34a" : "#ea580c";

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
                <div>
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">OFFICIAL CITIZEN COMPLAINT LEDGER</span>
                    <h3 style="margin: 2px 0 0; font-size: 16px; color: #0f172a;">#${escapeHTML(comp.tracking_id || comp.report_id)}</h3>
                </div>
                <span style="background: ${isResolved ? '#dcfce7' : '#ffedd5'}; color: ${statusColor}; font-size: 12px; font-weight: 800; padding: 4px 12px; border-radius: 999px;">
                    ● ${escapeHTML(comp.status || 'Received')}
                </span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; font-size: 13px; color: #334155; margin-bottom: 12px;">
                <div><strong>Issue Category:</strong> <span>${escapeHTML(comp.category || comp.issue_type || 'General')}</span></div>
                <div><strong>Location:</strong> <span>${escapeHTML(comp.location || 'Gorakhpur')}</span></div>
                <div><strong>Priority:</strong> <span style="font-weight:700; color:#ea580c;">${escapeHTML(comp.priority || 'MEDIUM')}</span></div>
                <div><strong>Reported At:</strong> <span>${new Date(comp.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
            </div>

            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; font-size: 12.5px; color: #475569; margin-bottom: 10px;">
                <strong>Description:</strong> ${escapeHTML(comp.description || 'No description provided')}
            </div>

            ${comp.evidence_image ? `<div style="margin-top: 10px;"><a href="${API_BASE}${escapeHTML(comp.evidence_image)}" target="_blank" style="color: #0284c7; font-size: 12px; text-decoration: underline; font-weight: 600;">📷 View Photo Evidence Attached</a></div>` : ''}

            <div style="font-size: 11px; color: #64748b; margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
                🔒 Municipal Security Policy: Internal technician mobile numbers and internal engineering dispatch registers are protected.
            </div>
        `;
        container.scrollIntoView({ behavior: "smooth" });
    }
    window.renderComplaintTrackingResult = renderComplaintTrackingResult;

    // -------------------------------------------------------
    // 9C. PUBLIC WATER SUPPLY STATUS & WATER CUTS
    // -------------------------------------------------------
    async function loadPublicSupplyStatus() {
        try {
            const res = await fetch(`${API_BASE}/api/water/public/supply-status`);
            if (!res.ok) return;
            const data = await res.json();

            if (data.success) {
                const stEl = document.getElementById("publicStoragePercent");
                if (stEl) stEl.textContent = `${data.overall_storage_percentage || 91}%`;

                const actCuts = document.getElementById("publicActiveCutsCount");
                if (actCuts) actCuts.textContent = data.active_water_cuts_count || 0;

                const schedCuts = document.getElementById("publicScheduledCutsCount");
                if (schedCuts) schedCuts.textContent = data.scheduled_cuts_count || 0;

                const healthBadge = document.getElementById("publicCityHealthBadge");
                if (healthBadge) {
                    const isNormal = (data.active_water_cuts_count || 0) === 0;
                    healthBadge.textContent = isNormal ? "● SUPPLY NORMAL" : "● WATER CUTS ACTIVE";
                    healthBadge.className = isNormal ? "live-badge" : "live-badge warning";
                }

                const tbody = document.getElementById("publicAnnouncementsTableBody");
                const alertBox = document.getElementById("announcedWaterCutsAlertBox");

                if (tbody && Array.isArray(data.announced_water_cuts)) {
                    if (data.announced_water_cuts.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:16px; color:#16a34a; font-weight:600;">✅ No water cuts announced. Normal 24/7 municipal pressure across all wards.</td></tr>';
                        if (alertBox) alertBox.style.display = "none";
                    } else {
                        if (alertBox) alertBox.style.display = "block";
                        tbody.innerHTML = data.announced_water_cuts.map(ann => {
                            const start = new Date(ann.start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                            const end = new Date(ann.end_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                            const areas = Array.isArray(ann.affected_areas) ? ann.affected_areas.join(", ") : (ann.zone || "Municipal Area");
                            const isActive = ann.status === "ACTIVE";

                            return `
                                <tr>
                                    <td><strong>${escapeHTML(ann.title)}</strong></td>
                                    <td><span style="font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; background:${isActive ? '#fee2e2' : '#fef3c7'}; color:${isActive ? '#dc2626' : '#d97706'};">${escapeHTML(ann.type)}</span></td>
                                    <td><span style="color:#0284c7; font-weight:600;">${escapeHTML(areas)}</span></td>
                                    <td><small>${start} – ${end}</small></td>
                                    <td>${escapeHTML(ann.reason)}</td>
                                    <td><small style="color:#16a34a;">${escapeHTML(ann.alternative_supply || 'Water tankers on standby')}</small></td>
                                    <td><span class="status-pill ${isActive ? 'danger' : 'active'}">${escapeHTML(ann.status)}</span></td>
                                </tr>
                            `;
                        }).join("");
                    }
                }

                const schedTbody = document.querySelector("#citizenSchedulesTable tbody");
                if (schedTbody && Array.isArray(data.tanks_summary)) {
                    schedTbody.innerHTML = data.tanks_summary.map(t => {
                        const areas = Array.isArray(t.supplied_areas) && t.supplied_areas.length ? t.supplied_areas.join(", ") : (t.zone || "City Central");
                        const timing = t.supply_schedule || t.next_supply_time || "06:00 AM - 09:00 AM";
                        return `
                            <tr>
                                <td><strong>${escapeHTML(t.zone || t.name)}</strong></td>
                                <td><small style="color:#0284c7;">${escapeHTML(areas)}</small></td>
                                <td>${escapeHTML(timing)}</td>
                                <td><span class="status-pill active">${escapeHTML(t.status || 'Active')}</span></td>
                            </tr>
                        `;
                    }).join("");
                }
            }
        } catch (err) {
            console.error("Load public supply status error:", err);
        }
    }
    window.loadPublicSupplyStatus = loadPublicSupplyStatus;

    // -------------------------------------------------------
    // 9D. ADMIN FACILITIES & SUPPLY AREA ROUTING
    // -------------------------------------------------------
    let allFacilitiesCache = [];
    let activeFacilityFilter = "ALL";

    async function loadAdminFacilities() {
        const tbody = document.getElementById("adminFacilitiesTableBody");
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#64748b;">Loading facilities stream...</td></tr>';

        try {
            const res = await fetch(`${API_BASE}/api/water/admin/facilities`, { headers: getAuthHeaders() });
            if (!res.ok) return;
            const data = await res.json();

            if (data.success) {
                allFacilitiesCache = [
                    ...(data.tanks || []).map(t => ({ ...t, facility_category: "TANK", asset_id: t.tank_id || `TNK-${t.id}` })),
                    ...(data.assets || []).map(a => ({ ...a, facility_category: a.asset_type }))
                ];

                const facTotal = document.getElementById("facTotalCount");
                if (facTotal) facTotal.textContent = allFacilitiesCache.length;

                const cntTanks = document.getElementById("facCountTanks");
                if (cntTanks) cntTanks.textContent = (data.tanks || []).length;

                const cntSources = document.getElementById("facCountSources");
                if (cntSources) cntSources.textContent = (data.kpis && data.kpis.sources_count) || 1;

                const cntWtpStp = document.getElementById("facCountWtpStp");
                if (cntWtpStp) cntWtpStp.textContent = ((data.kpis && data.kpis.wtp_count) || 1) + ((data.kpis && data.kpis.stp_count) || 1);

                const cntPumps = document.getElementById("facCountPumps");
                if (cntPumps) cntPumps.textContent = (data.kpis && data.kpis.pumps_count) || 2;

                const cntValves = document.getElementById("facCountValves");
                if (cntValves) cntValves.textContent = (data.kpis && data.kpis.valves_count) || 2;

                const cntDrain = document.getElementById("facCountDrainage");
                if (cntDrain) cntDrain.textContent = (data.kpis && data.kpis.drainage_count) || 1;

                renderFacilitiesTable();
            }
        } catch (err) {
            console.error("Load admin facilities error:", err);
            tbody.innerHTML = `<tr><td colspan="8" style="color:red; text-align:center; padding:16px;">Error loading facilities: ${escapeHTML(err.message)}</td></tr>`;
        }
    }
    window.loadAdminFacilities = loadAdminFacilities;

    function filterFacilitiesTable(type, btnEl) {
        activeFacilityFilter = type;
        document.querySelectorAll("#facFilterTabs .tool-btn").forEach(b => b.classList.remove("active"));
        if (btnEl) btnEl.classList.add("active");
        renderFacilitiesTable();
    }
    window.filterFacilitiesTable = filterFacilitiesTable;

    function renderFacilitiesTable() {
        const tbody = document.getElementById("adminFacilitiesTableBody");
        if (!tbody) return;

        let filtered = allFacilitiesCache;
        if (activeFacilityFilter !== "ALL") {
            if (activeFacilityFilter === "TREATMENT_PLANT") {
                filtered = allFacilitiesCache.filter(f => (f.asset_type === "WTP" || f.asset_type === "STP" || (f.asset_id && (f.asset_id.includes("WTP") || f.asset_id.includes("STP")))));
            } else {
                filtered = allFacilitiesCache.filter(f => (f.facility_category === activeFacilityFilter || f.asset_type === activeFacilityFilter));
            }
        }

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#64748b;">No facilities matching this filter category.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(f => {
            const isTank = f.facility_category === "TANK" || f.asset_type === "STORAGE_RESERVOIR";
            const typeBadgeColor = isTank ? "#0284c7" : (f.asset_type === "STP" ? "#7c3aed" : (f.asset_type === "WTP" ? "#0ea5e9" : (f.asset_type === "BOOSTER_PUMP" ? "#f59e0b" : "#10b981")));
            const areas = Array.isArray(f.supplied_areas) ? f.supplied_areas.join(", ") : (f.supplied_areas || f.connected_assets || "--");
            const depthOrCap = isTank ? `${f.capacity_liters ? Number(f.capacity_liters).toLocaleString() : '--'} L (${f.current_level_percent || 0}%)` : (f.depth_m ? `Depth: ${f.depth_m}m` : '--');

            return `
                <tr>
                    <td><strong>${escapeHTML(f.asset_id || f.tank_id)}</strong></td>
                    <td><b>${escapeHTML(f.name)}</b></td>
                    <td><span style="font-size:10px; font-weight:700; color:#fff; background:${typeBadgeColor}; padding:2px 8px; border-radius:4px;">${escapeHTML(f.asset_type || f.facility_category || 'ASSET')}</span></td>
                    <td>${escapeHTML(f.zone || f.location || 'Central Ward')}</td>
                    <td><span class="status-pill active">${escapeHTML(f.status || 'NORMAL')}</span></td>
                    <td><small style="color:#0284c7; max-width:200px; display:inline-block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHTML(areas)}">${escapeHTML(areas)}</small></td>
                    <td><small>${escapeHTML(depthOrCap)}</small></td>
                    <td>
                        <div style="display:flex; gap:6px;">
                            ${isTank ? `<button type="button" class="action-btn-sm" onclick="openTankSupplyAreasModal('${f.id || f.tank_id}')" style="background:#e0f2fe; color:#0369a1; border:none; padding:3px 8px; font-size:11px; font-weight:700; cursor:pointer;" title="Configure which area this tank supplies">🗺️ Supply Areas</button>` : ''}
                            <button type="button" class="action-btn-sm" onclick="openFacilityAssetModal('${f.id || f.asset_id}')" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; padding:3px 8px; font-size:11px; cursor:pointer;">✏️ Edit</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function openTankSupplyAreasModal(id) {
        const modal = document.getElementById("tankSupplyAreasModal");
        if (!modal) return;

        const tank = allFacilitiesCache.find(x => String(x.id) === String(id) || String(x.tank_id) === String(id) || String(x.asset_id) === String(id)) || tanks.find(x => String(x.id) === String(id) || String(x.tank_id) === String(id));
        if (!tank) return;

        document.getElementById("saTankId").value = tank.id || tank.tank_id;
        document.getElementById("saTankName").value = `${tank.name} (${tank.tank_id || tank.id})`;
        document.getElementById("saSourceAssetId").value = tank.source_asset_id || "";

        const areas = Array.isArray(tank.supplied_areas) ? tank.supplied_areas.join(", ") : (tank.supplied_areas || tank.zone || "");
        document.getElementById("saSuppliedAreas").value = areas;
        document.getElementById("saSchedule").value = tank.supply_schedule || "06:00 AM - 09:00 AM, 05:00 PM - 08:00 PM";
        document.getElementById("saPumpStatus").value = (tank.pump_status || "ON").toUpperCase();
        document.getElementById("saLevelPercent").value = tank.current_level_percent !== undefined ? tank.current_level_percent : 75;

        modal.style.display = "flex";
    }
    window.openTankSupplyAreasModal = openTankSupplyAreasModal;

    async function handleSaveTankSupplyAreas(e) {
        e.preventDefault();
        const id = document.getElementById("saTankId").value;
        const source_asset_id = document.getElementById("saSourceAssetId").value.trim();
        const supplied_areas = document.getElementById("saSuppliedAreas").value.split(",").map(x => x.trim()).filter(Boolean);
        const supply_schedule = document.getElementById("saSchedule").value.trim();
        const pump_status = document.getElementById("saPumpStatus").value;
        const current_level_percent = Number(document.getElementById("saLevelPercent").value);

        try {
            const res = await fetch(`${API_BASE}/api/water/tanks/${encodeURIComponent(id)}/supply-areas`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    source_asset_id,
                    supplied_areas,
                    supply_schedule,
                    pump_status,
                    current_level_percent
                })
            });
            const data = await res.json();
            if (data.success) {
                showToast("✅ Supply area routing saved successfully!", "success");
                closeModal("tankSupplyAreasModal");
                loadAdminFacilities();
                fetchAllWaterData();
            } else {
                alert(data.message || "Failed to update supply areas.");
            }
        } catch (err) {
            showToast("Error updating supply areas: " + err.message, "error");
        }
    }
    window.handleSaveTankSupplyAreas = handleSaveTankSupplyAreas;

    function openFacilityAssetModal(id = null) {
        const modal = document.getElementById("facilityAssetModal");
        const form = document.getElementById("facilityAssetForm");
        if (!modal || !form) return;
        form.reset();
        document.getElementById("faAssetIdPk").value = "";
        document.getElementById("facilityAssetModalTitle").textContent = "🏢 Register Municipal Water Facility Asset";

        if (id) {
            const asset = allFacilitiesCache.find(x => String(x.id) === String(id) || String(x.asset_id) === String(id));
            if (asset) {
                document.getElementById("faAssetIdPk").value = asset.id || asset.asset_id;
                document.getElementById("faAssetId").value = asset.asset_id || "";
                document.getElementById("faName").value = asset.name || "";
                document.getElementById("faType").value = asset.asset_type || "BOOSTER_PUMP";
                document.getElementById("faZone").value = asset.zone || asset.location || "";
                document.getElementById("faLat").value = asset.latitude || asset.lat || 26.7606;
                document.getElementById("faLng").value = asset.longitude || asset.lng || 83.3732;
                document.getElementById("faDepth").value = asset.depth_m || 2.5;
                document.getElementById("faStatus").value = asset.status || "NORMAL";
                document.getElementById("faDirection").value = asset.flow_direction || "FORWARD";
                const areas = Array.isArray(asset.supplied_areas) ? asset.supplied_areas.join(", ") : (asset.supplied_areas || asset.connected_assets || "");
                document.getElementById("faSuppliedAreas").value = areas;
                document.getElementById("facilityAssetModalTitle").textContent = `🏢 Edit Facility Asset: ${asset.name}`;
            }
        }

        modal.style.display = "flex";
    }
    window.openFacilityAssetModal = openFacilityAssetModal;

    async function handleSaveFacilityAsset(e) {
        e.preventDefault();
        const pk = document.getElementById("faAssetIdPk").value;
        const asset_id = document.getElementById("faAssetId").value.trim();
        const name = document.getElementById("faName").value.trim();
        const asset_type = document.getElementById("faType").value;
        const zone = document.getElementById("faZone").value.trim();
        const latitude = Number(document.getElementById("faLat").value);
        const longitude = Number(document.getElementById("faLng").value);
        const depth_m = Number(document.getElementById("faDepth").value);
        const status = document.getElementById("faStatus").value;
        const flow_direction = document.getElementById("faDirection").value;
        const supplied_areas = document.getElementById("faSuppliedAreas").value.split(",").map(x => x.trim()).filter(Boolean);

        const payload = {
            asset_id, name, asset_type, zone, latitude, longitude, depth_m, status, flow_direction, supplied_areas
        };

        try {
            const method = pk ? "PUT" : "POST";
            const url = pk ? `${API_BASE}/api/water/network/assets/${encodeURIComponent(pk)}` : `${API_BASE}/api/water/network/assets`;

            const res = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                showToast(`✅ Facility asset ${asset_id} saved successfully!`, "success");
                closeModal("facilityAssetModal");
                loadAdminFacilities();
                fetchAllWaterData();
            } else {
                alert(data.message || "Failed to save facility asset.");
            }
        } catch (err) {
            showToast("Error saving facility asset: " + err.message, "error");
        }
    }
    window.handleSaveFacilityAsset = handleSaveFacilityAsset;

    function openWaterCutModal() {
        const modal = document.getElementById("waterCutModal");
        const form = document.getElementById("waterCutForm");
        if (!modal || !form) return;
        form.reset();

        const now = new Date();
        const start = new Date(now.getTime() + 3600000).toISOString().slice(0, 16);
        const end = new Date(now.getTime() + 14400000).toISOString().slice(0, 16);
        document.getElementById("wcStartTime").value = start;
        document.getElementById("wcEndTime").value = end;

        modal.style.display = "flex";
    }
    window.openWaterCutModal = openWaterCutModal;

    async function handleSaveWaterCut(e) {
        e.preventDefault();
        const title = document.getElementById("wcTitle").value.trim();
        const type = document.getElementById("wcType").value;
        const zone = document.getElementById("wcZone").value.trim();
        const affected_areas = document.getElementById("wcAffectedAreas").value.split(",").map(x => x.trim()).filter(Boolean);
        const start_time = document.getElementById("wcStartTime").value;
        const end_time = document.getElementById("wcEndTime").value;
        const reason = document.getElementById("wcReason").value.trim();
        const alternative_supply = document.getElementById("wcAlternative").value.trim();

        try {
            const res = await fetch(`${API_BASE}/api/water/announcements`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    title, type, zone, affected_areas, start_time, end_time, reason, alternative_supply, status: "SCHEDULED"
                })
            });
            const data = await res.json();
            if (data.success) {
                showToast("📢 Water cut notice published successfully!", "success");
                closeModal("waterCutModal");
                loadPublicSupplyStatus();
                loadAdminFacilities();
            } else {
                alert(data.message || "Failed to schedule announcement.");
            }
        } catch (err) {
            showToast("Error scheduling announcement: " + err.message, "error");
        }
    }
    window.handleSaveWaterCut = handleSaveWaterCut;

    // -------------------------------------------------------
    // 9E. STAFF DASHBOARD FOUNDATION & URL NAVIGATION
    // -------------------------------------------------------
    async function loadStaffDashboardOverview() {
        if (!isWaterStaff()) return;
        try {
            const res = await fetch(`${API_BASE}/api/water/staff/dashboard-overview`, { headers: getAuthHeaders() });
            if (!res.ok) return;
            const data = await res.json();
            if (data.success && data.staff_session) {
                const s = data.staff_session;
                const banner = document.getElementById("staffAuthorityScopeBanner");
                if (banner) {
                    banner.style.display = "block";
                    const scopeName = document.getElementById("staffScopeName");
                    const scopeSectors = document.getElementById("staffScopeSectors");
                    const scopeAssets = document.getElementById("staffScopeAssets");
                    if (scopeName) scopeName.textContent = `${s.name} (${s.staff_id || 'WTR-STAFF'}) • ${s.role}`;
                    if (scopeSectors) scopeSectors.textContent = s.permitted_sectors && s.permitted_sectors.length ? s.permitted_sectors.join(", ") : "All Municipal Sectors";
                    if (scopeAssets) scopeAssets.textContent = s.permitted_assets && s.permitted_assets.length ? s.permitted_assets.join(", ") : "All Municipal Assets";
                }
            }
        } catch (err) {
            console.error("Staff overview load error:", err);
        }
    }
    window.loadStaffDashboardOverview = loadStaffDashboardOverview;

    function handleUrlNavigation() {
        const params = new URLSearchParams(window.location.search);
        const viewParam = (params.get("view") || "").toLowerCase();
        const tabParam = (params.get("tab") || "").toLowerCase();
        const hash = (window.location.hash || "").replace("#", "").toLowerCase();

        const target = viewParam || tabParam || hash;
        if (!target) return;

        if (target === "admin") {
            if (isWaterAdmin()) {
                switchWaterLayer("admin");
                setTimeout(() => {
                    const el = document.getElementById("adminFacilitiesSingleScreen") || document.getElementById("layer-admin-content");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                }, 300);
            } else {
                switchWaterLayer("admin");
                const auth = getAuth();
                if (auth && typeof auth.showToast === "function") {
                    auth.showToast("Water Administrator credentials required to access Admin Panel.", "warning");
                }
                if (auth && typeof auth.showLoginModal === "function") {
                    auth.showLoginModal("staff");
                }
            }
        } else if (target === "3d") {
            if (typeof window.toggleWaterDimension === "function") {
                window.toggleWaterDimension("3d");
                setTimeout(() => {
                    const el = document.getElementById("water3DContainer");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                }, 300);
            }
        } else if (target === "monitoring" || target === "scada") {
            switchWaterLayer("flow");
            setTimeout(() => {
                const el = document.getElementById("layer-flow-content");
                if (el) el.scrollIntoView({ behavior: "smooth" });
            }, 300);
        } else if (target === "assets" || target === "tanks") {
            switchWaterLayer("admin");
            setTimeout(() => {
                const el = document.getElementById("adminFacilitiesSingleScreen") || document.getElementById("tankContainer");
                if (el) el.scrollIntoView({ behavior: "smooth" });
            }, 300);
        } else if (target === "routes") {
            switchWaterLayer("sewage");
            const netSel = document.getElementById("sewageNetworkType");
            if (netSel) {
                netSel.value = "POTABLE";
                netSel.dispatchEvent(new Event("change"));
            }
            setTimeout(() => {
                const el = document.getElementById("layer-sewage-content");
                if (el) el.scrollIntoView({ behavior: "smooth" });
            }, 300);
        } else if (target === "sewage" || target === "drainage") {
            switchWaterLayer("sewage");
            setTimeout(() => {
                const el = document.getElementById("layer-sewage-content");
                if (el) el.scrollIntoView({ behavior: "smooth" });
            }, 300);
        } else if (target === "complaints" || target === "grievance") {
            switchWaterLayer("citizen");
            setTimeout(() => {
                const el = document.getElementById("visitorComplaintsSection") || document.getElementById("userReports");
                if (el) el.scrollIntoView({ behavior: "smooth" });
            }, 300);
        } else if (target === "staff") {
            switchWaterLayer("staff");
            if (typeof loadStaffDashboardOverview === "function") {
                loadStaffDashboardOverview();
            }
        }
    }
    window.handleUrlNavigation = handleUrlNavigation;

    // Tanker form submit
    const tankerForm = document.getElementById("tankerForm");
    if (tankerForm) {
        tankerForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const submitBtn = document.getElementById("submitTankerBtn");
            if (submitBtn) submitBtn.disabled = true;

            const deliveryAddress = document.getElementById("tankerLocation").value.trim();
            const capacity = document.getElementById("waterQuantity").value;
            const deliverySlot = document.getElementById("tankerSlot").value;
            const user = getCurrentUser();

            try {
                const res = await fetch(`${API_BASE}/api/water/tanker-bookings`, {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        deliveryAddress,
                        capacity,
                        deliverySlot,
                        citizenName: user ? (user.name || user.username) : "Citizen",
                        mobile: user ? (user.phone || user.mobile) : "9876543210",
                        userId: user ? (user.id || user.userId) : null
                    })
                });
                const data = await res.json();
                if (data.success) {
                    showToast("🚛 Emergency tanker requested successfully!");
                    closeModal("tankerModal");
                    tankerForm.reset();
                    fetchAllWaterData();
                } else {
                    alert(data.message || "Failed to book tanker.");
                }
            } catch (err) {
                console.error("Tanker booking error:", err);
                showToast("🚛 Tanker requested");
                closeModal("tankerModal");
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // Assign form submit
    const assignForm = document.getElementById("assignForm");
    if (assignForm) {
        assignForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const reportId = document.getElementById("assignReportId").value;
            const techSel = document.getElementById("assignTechSelect");
            const selectedOpt = techSel.options[techSel.selectedIndex];
            const techName = selectedOpt.getAttribute("data-name");
            const techId = techSel.value;
            const priority = document.getElementById("assignPriority").value;
            const internal_remarks = document.getElementById("assignRemarks").value.trim();

            try {
                const res = await fetch(`${API_BASE}/api/water/reports/${reportId}/assign`, {
                    method: "PUT",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        technician_id: techId,
                        technician_name: techName,
                        priority,
                        internal_remarks
                    })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`👷 Assigned to ${techName}`);
                    closeModal("assignModal");
                    fetchAllWaterData();
                } else {
                    alert(data.message || "Failed to assign technician.");
                }
            } catch (err) {
                console.error("Assign error:", err);
            }
        });
    }

    // Dispatch tanker form submit
    const dispatchTankerForm = document.getElementById("dispatchTankerForm");
    if (dispatchTankerForm) {
        dispatchTankerForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const bookingId = document.getElementById("dispatchBookingId").value;
            const assigned_driver_name = document.getElementById("dtDriverName").value.trim();
            const assigned_driver_phone = document.getElementById("dtDriverPhone").value.trim();
            const assigned_tanker_number = document.getElementById("dtTankerNumber").value.trim();
            const delivery_slot = document.getElementById("dtSlot").value.trim();

            try {
                const res = await fetch(`${API_BASE}/api/water/tanker-bookings/${bookingId}/dispatch`, {
                    method: "PUT",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        assigned_driver_name,
                        assigned_driver_phone,
                        assigned_tanker_number,
                        delivery_slot
                    })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`🚛 Tanker ${assigned_tanker_number} dispatched!`);
                    closeModal("dispatchTankerModal");
                    fetchAllWaterData();
                } else {
                    alert(data.message || "Failed to dispatch tanker.");
                }
            } catch (err) {
                console.error("Dispatch tanker error:", err);
            }
        });
    }

    // Tank form submit (Add / Edit)
    const tankForm = document.getElementById("tankForm");
    if (tankForm) {
        tankForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const id = document.getElementById("tankId").value;
            const name = document.getElementById("tankName").value.trim();
            const zone = document.getElementById("tankLocation").value.trim();
            const latitude = document.getElementById("tankLat").value;
            const longitude = document.getElementById("tankLng").value;
            const capacity_liters = document.getElementById("tankCapacity").value;
            const currentLevelPercent = document.getElementById("tankLevel").value;
            const pump_status = document.getElementById("pumpStatus").value;

            const method = id ? "PUT" : "POST";
            const url = id ? `${API_BASE}/api/water/tanks/${id}` : `${API_BASE}/api/water/tanks`;

            try {
                const res = await fetch(url, {
                    method,
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        name,
                        zone,
                        latitude,
                        longitude,
                        capacity_liters,
                        currentLevelPercent,
                        pump_status
                    })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(id ? "✅ Tank updated" : "✅ New water tank created");
                    closeModal("tankModal");
                    fetchAllWaterData();
                } else {
                    alert(data.message || "Failed to save tank.");
                }
            } catch (err) {
                console.error("Tank save error:", err);
            }
        });
    }

    // Quality form submit
    const qualityForm = document.getElementById("qualityForm");
    if (qualityForm) {
        qualityForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const zone = document.getElementById("qZone").value.trim();
            const ph = document.getElementById("qPhInput").value;
            const tds = document.getElementById("qTdsInput").value;
            const turbidity = document.getElementById("qTurbInput").value;
            const chlorine = document.getElementById("qChlorInput").value;
            const tested_by = document.getElementById("qTestedBy").value.trim();

            try {
                const res = await fetch(`${API_BASE}/api/water/quality`, {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ zone, ph, tds, turbidity, chlorine, tested_by })
                });
                const data = await res.json();
                if (data.success) {
                    showToast("🧪 Water test logged successfully");
                    closeModal("qualityModal");
                    fetchAllWaterData();
                } else {
                    alert(data.message || "Failed to record quality test.");
                }
            } catch (err) {
                console.error("Quality log error:", err);
            }
        });
    }

    // Remote SCADA Pump Toggle
    async function togglePumpStatus(tankId, currentStatus) {
        const nextStatus = currentStatus === "ON" ? "OFF" : "ON";
        try {
            const res = await fetch(`${API_BASE}/api/water/tanks/${tankId}/pump`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify({ pump_status: nextStatus })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`⚡ SCADA: Pump switched to ${nextStatus}`);
                fetchAllWaterData();
            } else {
                alert(data.message || "Failed to toggle pump.");
            }
        } catch (err) {
            console.error("Toggle pump error:", err);
        }
    }
    window.togglePumpStatus = togglePumpStatus;

    // Delete tank
    async function deleteTank(tankId) {
        if (!confirm("Are you sure you want to delete this water tank?")) return;
        try {
            const res = await fetch(`${API_BASE}/api/water/tanks/${tankId}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                showToast("🗑️ Tank deleted");
                fetchAllWaterData();
            } else {
                alert(data.message || "Failed to delete tank.");
            }
        } catch (err) {
            console.error("Delete tank error:", err);
        }
    }
    window.deleteTank = deleteTank;

    // Update report status directly
    async function updateReportStatus(reportId, status) {
        try {
            const res = await fetch(`${API_BASE}/api/water/reports/${reportId}/status`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`✅ Complaint marked as ${status}`);
                fetchAllWaterData();
            } else {
                alert(data.message || "Failed to update status.");
            }
        } catch (err) {
            console.error("Update status error:", err);
        }
    }
    window.updateReportStatus = updateReportStatus;

    // Update tanker status directly
    async function updateTankerStatus(bookingId, status) {
        try {
            const res = await fetch(`${API_BASE}/api/water/tanker-bookings/${bookingId}/status`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`🚛 Tanker marked as ${status}`);
                fetchAllWaterData();
            } else {
                alert(data.message || "Failed to update tanker status.");
            }
        } catch (err) {
            console.error("Update tanker status error:", err);
        }
    }
    window.updateTankerStatus = updateTankerStatus;

    // -------------------------------------------------------
    // 10. REAL-TIME SOCKET.IO ENGINE
    // -------------------------------------------------------
    function initRealtime() {
        if (typeof SmartCityRealtime === "undefined") return;

        SmartCityRealtime.init();
        SmartCityRealtime.renderLiveIndicator(".navbar");

        SmartCityRealtime.onWaterUpdate((waterData) => {
            if (!waterData) return;
            showToast("💧 Live water network update received");
            fetchAllWaterData();
            if (SmartCityRealtime.playAlertSound) SmartCityRealtime.playAlertSound("chime");
        });
    }

    // -------------------------------------------------------
    // 11. PROFILE & AUTH UI HELPERS
    // -------------------------------------------------------
    function toggleProfile() {
        if (window.SmartCityAuth && typeof SmartCityAuth.showProfileModal === "function") {
            return SmartCityAuth.showProfileModal();
        }
        const menu = document.getElementById("profileMenu");
        if (menu) menu.style.display = (menu.style.display === "block") ? "none" : "block";
    }
    window.toggleProfile = toggleProfile;

    function switchRole(role) {
        if (role === "worker") {
            const token = localStorage.getItem("smartCityJWT") || localStorage.getItem("smartcity_token") || (window.SmartCityAuth && SmartCityAuth.getToken());
            const curUser = (window.SmartCityAuth && SmartCityAuth.getUser()) ||
                            JSON.parse(localStorage.getItem("smartCityCurrentUser") || localStorage.getItem("smartcity_user") || "{}");
            const isStaff = token && (curUser.role === "staff" || curUser.role === "admin" || (curUser.department || "").toLowerCase().includes("water"));

            if (isStaff) {
                localStorage.setItem("waterRole", "worker");
                applyRoleUI();
                showToast("👷 Water Staff mode activated");
            } else {
                showToast("🔒 Authentication Required: Staff ID and Password needed.");
                if (window.SmartCityAuth && typeof SmartCityAuth.showLoginModal === "function") {
                    SmartCityAuth.showLoginModal("staff", {
                        prefillStaffId: "WTR001",
                        message: "🔒 Staff credentials required to access Water Works control."
                    });
                } else {
                    promptStaffLogin();
                }
            }
        } else {
            localStorage.setItem("waterRole", "user");
            applyRoleUI();
            showToast("👤 Citizen mode activated");
        }
        const menu = document.getElementById("profileMenu");
        if (menu) menu.style.display = "none";
    }
    window.switchRole = switchRole;

    function promptStaffLogin() {
        const auth = getAuth();
        if (auth && auth.openAuthModal) {
            auth.openAuthModal("login");
        } else {
            const staffId = prompt("Enter Water Staff ID (Default: WTR001):", "WTR001");
            const pass = prompt("Enter Password (Default: staff123):", "staff123");
            if (staffId && pass) {
                fetch(`${API_BASE}/api/staff-login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ staffId, password: pass })
                })
                .then(r => r.json())
                .then(d => {
                    if (d.token) {
                        localStorage.setItem("smartCityJWT", d.token);
                        localStorage.setItem("smartcity_token", d.token);
                        localStorage.setItem("smartCityCurrentUser", JSON.stringify(d.user));
                        localStorage.setItem("smartcity_user", JSON.stringify(d.user));
                        localStorage.setItem("waterRole", "worker");
                        applyRoleUI();
                        showToast("✅ Logged in as Water Works Staff!");
                    } else {
                        alert(d.message || "Invalid credentials.");
                    }
                })
                .catch(e => alert("Login failed: " + e.message));
            }
        }
    }
    window.promptStaffLogin = promptStaffLogin;

    function handleAuthAction() {
        const auth = getAuth();
        if (auth && auth.logout) {
            auth.logout();
        } else {
            localStorage.removeItem("smartcity_token");
            localStorage.removeItem("smartcity_user");
            localStorage.removeItem("waterRole");
            window.location.reload();
        }
    }
    window.handleAuthAction = handleAuthAction;

    function showToast(msg) {
        const toast = document.getElementById("toast");
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 2800);
    }
    window.showToast = showToast;

    // Helper formatting
    function getIssueIcon(type) {
        const map = {
            "Pipe Leak": "💦",
            "No Supply": "🚱",
            "Contamination": "🧪",
            "Low Pressure": "⚠️",
            "Billing Issue": "💳",
            "leakage": "💦",
            "no-water": "🚱",
            "dirty-water": "🧪",
            "low-pressure": "⚠️"
        };
        return map[type] || "💧";
    }

    function getStatusBg(s) {
        if (s === "Resolved" || s === "Closed") return "#dcfce7";
        if (s === "In Progress" || s === "Repairing") return "#ffedd5";
        if (s === "Under Review" || s === "Assigned") return "#e0f2fe";
        return "#fee2e2";
    }

    function getStatusFg(s) {
        if (s === "Resolved" || s === "Closed") return "#15803d";
        if (s === "In Progress" || s === "Repairing") return "#ea580c";
        if (s === "Under Review" || s === "Assigned") return "#0369a1";
        return "#dc2626";
    }

    function getTankerStatusBg(s) {
        if (s === "Delivered") return "#dcfce7";
        if (s === "Dispatched") return "#e0f2fe";
        if (s === "Cancelled") return "#fee2e2";
        return "#fef3c7";
    }

    function getTankerStatusFg(s) {
        if (s === "Delivered") return "#15803d";
        if (s === "Dispatched") return "#0369a1";
        if (s === "Cancelled") return "#dc2626";
        return "#d97706";
    }

    function escapeHTML(str) {
        return String(str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // -------------------------------------------------------
    // AI SCADA WATER LEAK & ANOMALY DETECTION (FastAPI ML)
    // -------------------------------------------------------
    function onAIWaterTankChange(tankId) {
        const select = document.getElementById("ai-water-tank-select");
        if (!select) return;
        const option = select.options[select.selectedIndex];
        if (!option) return;

        const lvl = option.getAttribute("data-lvl");
        const inf = option.getAttribute("data-in");
        const out = option.getAttribute("data-out");
        const avg = option.getAttribute("data-avg");

        if (lvl && document.getElementById("ai-water-lvl")) document.getElementById("ai-water-lvl").value = lvl;
        if (inf && document.getElementById("ai-water-inflow")) document.getElementById("ai-water-inflow").value = inf;
        if (out && document.getElementById("ai-water-outflow")) document.getElementById("ai-water-outflow").value = out;
        if (avg && document.getElementById("ai-water-avg")) document.getElementById("ai-water-avg").value = avg;
    }

    async function runAIWaterAnomalyDetection() {
        const tankSelect = document.getElementById("ai-water-tank-select");
        const lvlInput = document.getElementById("ai-water-lvl");
        const infInput = document.getElementById("ai-water-inflow");
        const outInput = document.getElementById("ai-water-outflow");
        const avgInput = document.getElementById("ai-water-avg");
        const resultBox = document.getElementById("ai-water-result-box");

        const tankId = tankSelect ? tankSelect.value : "TNK-CENTRAL-01";
        const lvl = lvlInput ? Number(lvlInput.value) : 75;
        const inflow = infInput ? Number(infInput.value) : 50000;
        const outflow = outInput ? Number(outInput.value) : 68000;
        const avg = avgInput ? Number(avgInput.value) : 46000;

        if (resultBox) {
            resultBox.innerHTML = `<div style="text-align: center; padding: 20px; color: #64748b; font-size: 13px;">🔄 Evaluating SCADA outflow telemetry & Z-score distribution via FastAPI ML...</div>`;
        }

        try {
            const queryParams = new URLSearchParams({
                tank_id: tankId,
                current_level_pct: lvl,
                daily_inflow_liters: inflow,
                daily_outflow_liters: outflow,
                historical_avg_outflow: avg
            });

            const res = await fetch(`/api/ai/water/analyze?${queryParams.toString()}`);
            const json = await res.json();

            if (json.success && json.analysis) {
                const a = json.analysis;
                const isAnomaly = a.is_anomaly;
                const leakRisk = a.leak_risk_indicator || "NORMAL_FLOW";
                const excessLiters = a.excess_outflow_liters || Math.max(0, outflow - avg);

                const badgeColor = isAnomaly ? "#ef4444" : "#10b981";

                if (resultBox) {
                    resultBox.innerHTML = `
                        <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
                                <span style="font-size: 14px; font-weight: 700; color: #1e293b;">RESERVOIR TELEMETRY SCAN: <strong>${escapeHTML(a.tank_id)}</strong></span>
                                <span style="background: ${badgeColor}; color: #ffffff; font-weight: 800; font-size: 11px; padding: 3px 10px; border-radius: 6px;">
                                    ${isAnomaly ? "⚠️ SUSPECTED LEAK / BURST" : "🟢 NOMINAL DISTRIBUTION"}
                                </span>
                            </div>

                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 14px;">
                                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
                                    <div style="font-size: 11px; color: #64748b; font-weight: 700;">DAILY OUTFLOW</div>
                                    <div style="font-size: 24px; font-weight: 900; color: ${isAnomaly ? '#ea580c' : '#0284c7'};">${outflow.toLocaleString()} L</div>
                                    <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Avg: ${avg.toLocaleString()} L</div>
                                </div>
                                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
                                    <div style="font-size: 11px; color: #64748b; font-weight: 700;">EXCESS LOSS RATE</div>
                                    <div style="font-size: 24px; font-weight: 900; color: ${excessLiters > 5000 ? '#ef4444' : '#16a34a'};">+${excessLiters.toLocaleString()} L</div>
                                    <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Unaccounted Variance</div>
                                </div>
                                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
                                    <div style="font-size: 11px; color: #64748b; font-weight: 700;">RISK CLASSIFICATION</div>
                                    <div style="font-size: 13px; font-weight: 900; color: ${badgeColor}; margin-top: 6px;">${escapeHTML(leakRisk.replace(/_/g, " "))}</div>
                                    <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Z-Score > 2.0 Sigma</div>
                                </div>
                            </div>

                            <div style="background: ${isAnomaly ? '#fff5f5' : '#f0fdf4'}; border: 1px solid ${isAnomaly ? '#fecaca' : '#bbf7d0'}; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px;">
                                <strong style="color: ${isAnomaly ? '#991b1b' : '#15803d'}; font-size: 12px; display: block; margin-bottom: 2px;">💡 AI Operational Action Directive:</strong>
                                <span style="color: ${isAnomaly ? '#b91c1c' : '#166534'}; font-size: 12px;">${escapeHTML(a.recommended_action || "Maintain regular pressure valve schedules.")}</span>
                            </div>

                            <div style="font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
                                <span>Model: <code>${escapeHTML(a.model_version || "water-anomaly-v2.0")}</code></span>
                                <span>Engine: <strong>FastAPI Statistical Anomaly Layer</strong></span>
                            </div>
                        </div>
                    `;
                }
                loadAIWaterAuditTable();
            }
        } catch (err) {
            if (resultBox) {
                resultBox.innerHTML = `<div style="color: #ef4444; font-size: 12px; padding: 10px;">Failed to obtain water anomaly scan: ${escapeHTML(err.message)}</div>`;
            }
        }
    }

    async function loadAIWaterAuditTable() {
        const tableBody = document.getElementById("ai-water-tbody");
        if (!tableBody) return;

        try {
            const token = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getToken) 
                ? SmartCityAuth.getToken() 
                : (localStorage.getItem("sc_token") || localStorage.getItem("token") || "");
            const headers = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch("/api/ai/predictions?module=water&limit=8", { headers });
            const json = await res.json();

            if (json.success && json.predictions) {
                if (json.predictions.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #64748b; padding: 20px;">No water anomaly logs registered yet. Run a scan above to log an entry.</td></tr>`;
                    return;
                }

                tableBody.innerHTML = json.predictions.map(pred => {
                    const out = typeof pred.prediction_output === "string" ? JSON.parse(pred.prediction_output) : (pred.prediction_output || {});
                    const statusBadge = pred.review_status === "ACCEPTED"
                        ? `<span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">APPROVED</span>`
                        : (pred.review_status === "REJECTED"
                            ? `<span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">REJECTED</span>`
                            : `<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">PENDING REVIEW</span>`);

                    const actions = pred.review_status === "PENDING"
                        ? `<button class="action-btn-sm btn-blue" style="padding: 3px 8px; font-size: 11px; cursor: pointer;" onclick="submitAIWaterReview(${pred.id}, 'APPROVED')">✓ Confirm</button>
                           <button class="action-btn-sm" style="padding: 3px 8px; font-size: 11px; color: #ef4444; border: 1px solid #ef4444; cursor: pointer; margin-left: 4px;" onclick="submitAIWaterReview(${pred.id}, 'REJECTED')">✕ False Alarm</button>`
                        : `<span style="font-size: 11px; color: #64748b;">Reviewed #${pred.reviewed_by || 'Staff'}</span>`;

                    return `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 10px 14px;"><strong>#${pred.id}</strong></td>
                            <td style="padding: 10px 14px;">${escapeHTML(pred.entity_reference || 'TNK-GKP')}</td>
                            <td style="padding: 10px 14px;"><span style="font-weight: 600; color: ${out.is_anomaly ? '#dc2626' : '#16a34a'};">${escapeHTML((out.leak_risk_indicator || 'NORMAL').replace(/_/g, " "))}</span></td>
                            <td style="padding: 10px 14px;">${out.is_anomaly ? '⚠️ YES' : 'NOMINAL'}</td>
                            <td style="padding: 10px 14px;">${out.excess_outflow_liters ? '+' + out.excess_outflow_liters.toLocaleString() + ' L' : '0 L'}</td>
                            <td style="padding: 10px 14px; font-size: 11px; color: #64748b;">${new Date(pred.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                            <td style="padding: 10px 14px;">${statusBadge}</td>
                            <td style="padding: 10px 14px;">${actions}</td>
                        </tr>
                    `;
                }).join("");
            }
        } catch (e) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #ef4444; padding: 14px;">Log unavailable: Login as staff to view and approve entries.</td></tr>`;
        }
    }

    async function submitAIWaterReview(predictionId, actionTaken) {
        try {
            const token = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getToken) 
                ? SmartCityAuth.getToken() 
                : (localStorage.getItem("sc_token") || localStorage.getItem("token") || "");
            
            if (!token) {
                alert("Operator login required to record SCADA review actions.");
                return;
            }

            const res = await fetch(`/api/ai/review/${predictionId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    action_taken: actionTaken,
                    comments: `Water SCADA engineer review: ${actionTaken} via Water UI.`
                })
            });

            const json = await res.json();
            if (json.success) {
                alert(`Anomaly prediction #${predictionId} marked as ${actionTaken}.`);
                loadAIWaterAuditTable();
            } else {
                alert(json.message || "Could not record review action.");
            }
        } catch (err) {
            alert("Failed to submit review: " + err.message);
        }
    }

    // -------------------------------------------------------
    // 11B. WATER SECTORS & STAFF RBAC MODAL CONTROLLERS
    // -------------------------------------------------------
    function openWaterSectorsModal() {
        const modal = document.getElementById("waterSectorsModal");
        if (modal) {
            modal.style.display = "flex";
            loadWaterSectorsInModal();
        }
    }
    window.openWaterSectorsModal = openWaterSectorsModal;

    async function loadWaterSectorsInModal() {
        const tbody = document.getElementById("sectorsTableModalBody");
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:16px;">Loading sectors...</td></tr>';

        try {
            const res = await fetch("/api/water/sectors", { headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success && Array.isArray(data.sectors)) {
                if (data.sectors.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:16px; color:#64748b;">No sectors found.</td></tr>';
                    return;
                }
                tbody.innerHTML = data.sectors.map(s => `
                    <tr>
                        <td><strong>${s.sector_code}</strong></td>
                        <td>${s.name}</td>
                        <td>${s.zone}</td>
                        <td>${s.total_demand_mld}</td>
                        <td><small>${Array.isArray(s.assigned_engineers) ? s.assigned_engineers.join(', ') : (s.assigned_engineers || 'Unassigned')}</small></td>
                        <td><span class="status-pill active">${s.status || 'ACTIVE'}</span></td>
                    </tr>
                `).join("");
            }
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center; padding:16px;">Error loading sectors: ${err.message}</td></tr>`;
        }
    }
    window.loadWaterSectorsInModal = loadWaterSectorsInModal;

    async function handleCreateSectorSubmit(e) {
        e.preventDefault();
        const code = document.getElementById("secCode").value.trim();
        const name = document.getElementById("secName").value.trim();
        const zone = document.getElementById("secZone").value.trim();
        const demand = document.getElementById("secDemand").value;
        const pop = document.getElementById("secPop").value;
        const engineers = document.getElementById("secEngineers").value.split(",").map(x => x.trim()).filter(Boolean);
        const boundaryText = document.getElementById("secBoundary").value.trim();

        let boundary = [];
        try {
            if (boundaryText) boundary = JSON.parse(boundaryText);
        } catch (err) {
            alert("Invalid JSON for boundary coordinates. Please input valid array of [lat, lng] pairs.");
            return;
        }

        if (!boundary.length) {
            boundary = [
                [26.740, 83.370],
                [26.750, 83.370],
                [26.750, 83.385],
                [26.740, 83.385]
            ];
        }

        try {
            const res = await fetch("/api/water/sectors", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    sector_code: code,
                    name,
                    zone,
                    total_demand_mld: demand,
                    population_served: pop,
                    assigned_engineers: engineers,
                    boundary_geojson: boundary
                })
            });
            const data = await res.json();
            if (data.success) {
                alert(`✅ Water sector ${code} created successfully.`);
                loadWaterSectorsInModal();
                if (window.SewagePlannerUI && window.SewagePlannerUI.loadMunicipalSectors) {
                    window.SewagePlannerUI.loadMunicipalSectors();
                }
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (err) {
            alert(`Network error: ${err.message}`);
        }
    }
    window.handleCreateSectorSubmit = handleCreateSectorSubmit;

    function openWaterStaffModal() {
        const modal = document.getElementById("waterStaffModal");
        if (modal) {
            modal.style.display = "flex";
            loadWaterStaffInModal();
        }
    }
    window.openWaterStaffModal = openWaterStaffModal;

    async function loadWaterStaffInModal() {
        const tbody = document.getElementById("waterStaffTableModalBody");
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:16px;">Loading staff records...</td></tr>';

        try {
            const res = await fetch("/api/water/admin/staff", { headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success && Array.isArray(data.staff)) {
                if (data.staff.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:16px; color:#64748b;">No staff records found.</td></tr>';
                    return;
                }
                tbody.innerHTML = data.staff.map(st => `
                    <tr>
                        <td><strong>${st.staff_id}</strong></td>
                        <td>${st.name}</td>
                        <td><span class="role-pill staff-pill" style="font-size:10px;">${st.role}</span></td>
                        <td><small style="color:#0284c7;">${Array.isArray(st.permitted_sectors) && st.permitted_sectors.length ? st.permitted_sectors.join(', ') : 'Universal'}</small></td>
                        <td><small style="color:#059669;">${Array.isArray(st.permitted_assets) && st.permitted_assets.length ? st.permitted_assets.join(', ') : 'All Assets'}</small></td>
                        <td><span class="status-pill active">${st.status || 'Active'}</span></td>
                    </tr>
                `).join("");
            }
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center; padding:16px;">Error loading staff: ${err.message}</td></tr>`;
        }
    }
    window.loadWaterStaffInModal = loadWaterStaffInModal;

    async function handleCreateWaterStaffSubmit(e) {
        e.preventDefault();
        const name = document.getElementById("wsName").value.trim();
        const staffId = document.getElementById("wsStaffId").value.trim();
        const role = document.getElementById("wsRole").value;
        const password = document.getElementById("wsPassword").value.trim();
        const sectors = document.getElementById("wsSectors").value.split(",").map(x => x.trim()).filter(Boolean);
        const assets = document.getElementById("wsAssets").value.split(",").map(x => x.trim()).filter(Boolean);

        try {
            const res = await fetch("/api/water/admin/staff", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    name,
                    staffId,
                    role,
                    password: password || undefined,
                    permitted_sectors: sectors,
                    permitted_assets: assets
                })
            });
            const data = await res.json();
            if (data.success) {
                alert(`✅ Water staff ${data.credentials.staffId} created successfully. Initial password: ${data.credentials.password}`);
                loadWaterStaffInModal();
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (err) {
            alert(`Network error: ${err.message}`);
        }
    }
    window.handleCreateWaterStaffSubmit = handleCreateWaterStaffSubmit;

    // Attach to window
    window.onAIWaterTankChange = onAIWaterTankChange;
    window.runAIWaterAnomalyDetection = runAIWaterAnomalyDetection;
    window.loadAIWaterAuditTable = loadAIWaterAuditTable;
    window.submitAIWaterReview = submitAIWaterReview;

    // -------------------------------------------------------
    // 12. INITIALIZATION ON DOM READY
    // -------------------------------------------------------
    document.addEventListener("DOMContentLoaded", () => {
        initWaterMap();
        applyRoleUI();
        fetchAllWaterData();
        loadPublicSupplyStatus();
        initRealtime();
        if (typeof loadAIWaterAuditTable === "function") {
            loadAIWaterAuditTable();
        }
        handleUrlNavigation();

        // Listen for global auth changes from frontend/auth.js
        window.addEventListener("smartcity:auth-changed", () => {
            applyRoleUI();
            fetchAllWaterData();
            handleUrlNavigation();
        });

        // Periodic background poll
        setInterval(fetchAllWaterData, 25000);
    });

})();