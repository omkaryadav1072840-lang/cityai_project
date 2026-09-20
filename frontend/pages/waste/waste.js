/**
 * SmartCity AI - Master Waste Management Controller (3-Layer System)
 * Layer 1: Citizen Waste Services & Request Tracking
 * Layer 2: Waste Staff Operations & Task Assignment
 * Layer 3: Waste Admin Asset Management (Bins, Vehicles, Workers, Routes, Analytics, Hotspots)
 * Integrated with SmartCityAuth, MySQL Backend APIs, Leaflet Maps & Socket.IO Realtime
 */

(function () {
    "use strict";

    // -------------------------------------------------------
    // 1. GLOBAL CONSTANTS & STATE
    // -------------------------------------------------------
    const API_BASE = (typeof window !== "undefined" && window.API_BASE_URL)
        ? window.API_BASE_URL
        : ((typeof window !== "undefined" && (window.location.port === "5000" || window.location.protocol === "file:"))
            ? "http://localhost:5000"
            : "");

    // State collections
    let allBins = [];
    let allRequests = [];
    let citizenMyRequests = [];
    let citizenMyBinRequests = [];
    let allVehicles = [];
    let allWorkers = [];
    let allRoutes = [];
    let allHotspots = [];
    let currentActiveTab = "tab-vehicles";
    let selectedEvidenceFile = null;

    // Leaflet Map State
    let wasteMap = null;
    let mapMarkers = [];
    let vehicleMarkers = [];
    let hotspotMarkers = [];
    let routeLayers = [];

    // Socket.io instance
    let socket = null;

    // -------------------------------------------------------
    // 2. AUTHENTICATION & RBAC HELPERS
    // -------------------------------------------------------
    function getAuth() {
        return window.SmartCityAuth || null;
    }

    function getCurrentUser() {
        const auth = getAuth();
        if (auth && typeof auth.getUser === "function") {
            return auth.getUser();
        }
        try {
            const raw = localStorage.getItem("smartCityCurrentUser") || localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function getAuthToken() {
        const auth = getAuth();
        if (auth && typeof auth.getToken === "function") {
            return auth.getToken();
        }
        return localStorage.getItem("smartCityJWT") || null;
    }

    function isWasteStaff() {
        const user = getCurrentUser();
        if (!user) return false;
        const role = (user.role || user.type || "").toLowerCase();
        if (role === "admin" || role === "superadmin") return true;
        if (role === "staff") {
            const dept = (user.department || "").toLowerCase();
            const editable = user.editable || [];
            return dept === "waste" || editable.includes("waste");
        }
        return false;
    }

    async function authFetch(url, options = {}) {
        const token = getAuthToken();
        const headers = Object.assign({}, options.headers || {});
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        return fetch(url, Object.assign({}, options, { headers }));
    }

    function escapeHTML(str) {
        if (!str) return "";
        return String(str).replace(/[&<>"']/g, m => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[m]);
    }

    // -------------------------------------------------------
    // 3. TOAST NOTIFICATIONS
    // -------------------------------------------------------
    function showToast(message, isError = false) {
        const existing = document.querySelector(".toast");
        if (existing) existing.remove();

        const toast = document.createElement("div");
        toast.className = "toast";
        if (isError) {
            toast.style.background = "#991b1b";
            toast.style.border = "1px solid #f87171";
        } else {
            toast.style.background = "#064e3b";
            toast.style.border = "1px solid #34d399";
        }
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = "opacity 0.3s";
            toast.style.opacity = "0";
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
    window.showToast = showToast;

    // -------------------------------------------------------
    // 4. ROLE & 3-LAYER UI SYNCHRONIZATION
    // -------------------------------------------------------
    let currentWasteLayer = "citizen";

    function switchWasteLayer(layer) {
        currentWasteLayer = layer;
        const staff = isWasteStaff();

        // Update tab buttons
        document.querySelectorAll(".layer-tab-btn").forEach(btn => btn.classList.remove("active"));
        const activeBtn = document.getElementById(`tab-btn-${layer}`);
        if (activeBtn) activeBtn.classList.add("active");

        // Layers visibility
        const citizenLayer = document.getElementById("layer-citizen-content");
        const staffLayer = document.getElementById("layer-staff-content");
        const adminLayer = document.getElementById("layer-admin-content");

        if (citizenLayer) citizenLayer.style.display = (layer === "citizen") ? "block" : "none";
        if (staffLayer) staffLayer.style.display = (layer === "staff") ? "block" : "none";
        if (adminLayer) adminLayer.style.display = (layer === "admin") ? "block" : "none";

        // Gatekeeper control for staff & admin layers
        const staffGatekeeper = document.getElementById("staffGatekeeper");
        const staffMain = document.getElementById("staffOperationsMain");
        if (staffGatekeeper && staffMain) {
            staffGatekeeper.style.display = staff ? "none" : "block";
            staffMain.style.display = staff ? "block" : "none";
        }

        const adminGatekeeper = document.getElementById("adminGatekeeper");
        const adminMain = document.getElementById("adminAssetsMain");
        if (adminGatekeeper && adminMain) {
            adminGatekeeper.style.display = staff ? "none" : "block";
            adminMain.style.display = staff ? "block" : "none";
        }

        // Invalidate map dimensions for responsive Leaflet rendering
        setTimeout(() => {
            if (wasteMap) wasteMap.invalidateSize();
        }, 100);
    }
    window.switchWasteLayer = switchWasteLayer;

    function applyRoleUI() {
        const staff = isWasteStaff();
        const user = getCurrentUser();
        const name = user ? (user.name || user.fullName || "User") : "Guest";

        // Body class markers
        document.body.classList.toggle("citizen-mode", !staff);
        document.body.classList.toggle("staff-mode", staff);

        // Role banner texts
        const roleTitle = document.getElementById("roleTitle");
        const roleSubtitle = document.getElementById("roleSubtitle");
        const rolePill = document.getElementById("rolePill");
        const profileName = document.getElementById("profileName");

        if (profileName) profileName.textContent = name;

        if (roleTitle) {
            roleTitle.textContent = staff
                ? "Waste Management Operations & Staff Dashboard"
                : (user ? `Welcome, ${name}` : "Welcome to SmartCity AI Waste Services");
        }

        if (roleSubtitle) {
            roleSubtitle.textContent = staff
                ? "Real-time municipal waste operations, dispatching, route assignments and bin telemetry."
                : "Report civic garbage problems, schedule doorstep collection, track resolution and view smart bins.";
        }

        if (rolePill) {
            rolePill.textContent = staff ? "STAFF • WASTE" : (user ? "CITIZEN" : "GUEST");
            rolePill.className = staff ? "role-pill staff-pill" : "role-pill citizen-pill";
        }

        // Default layer assignment based on authentication
        if (staff) {
            switchWasteLayer("staff");
        } else {
            switchWasteLayer("citizen");
        }

        // Profile button handler
        const profileBtn = document.getElementById("profileButton");
        if (profileBtn) {
            profileBtn.onclick = () => {
                const auth = getAuth();
                if (auth) {
                    if (auth.isAuthenticated()) {
                        if (confirm(`Logged in as: ${name} (${staff ? 'Staff' : 'Citizen'})\nDo you want to log out?`)) {
                            auth.logout();
                        }
                    } else {
                        auth.showLoginModal("citizen");
                    }
                }
            };
        }

        // Notification Bell Button
        const notifBtn = document.querySelector(".notification-btn");
        if (notifBtn) {
            notifBtn.onclick = () => {
                const auth = getAuth();
                if (auth && typeof auth.showLoginModal === "function") {
                    if (!auth.isAuthenticated()) {
                        auth.showLoginModal("citizen");
                    } else {
                        showNotificationsDrawer();
                    }
                }
            };
        }
    }

    function showNotificationsDrawer() {
        showToast("🔔 Fetching real-time municipal notifications...");
    }
    window.showNotifications = showNotificationsDrawer;

    // -------------------------------------------------------
    // 5. LEAFLET MAP INITIALIZATION & RENDERING
    // -------------------------------------------------------
    function initMap() {
        const mapEl = document.getElementById("wasteMap");
        if (!mapEl || wasteMap) return;

        wasteMap = L.map("wasteMap").setView([26.7606, 83.3732], 13);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "© OpenStreetMap contributors | Gorakhpur SmartCity AI"
        }).addTo(wasteMap);

        // Fix leaflet tile rendering on tab switch / resize
        setTimeout(() => {
            if (wasteMap) wasteMap.invalidateSize();
        }, 500);
    }

    function createColorIcon(color, emoji = "🗑️") {
        return L.divIcon({
            className: "custom-map-icon",
            html: `
                <div style="
                    background: ${color};
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: 2px solid #ffffff;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.35);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    color: white;
                ">${emoji}</div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
        });
    }

    function renderMapMarkers() {
        if (!wasteMap) return;

        // Clear existing markers
        mapMarkers.forEach(m => wasteMap.removeLayer(m));
        mapMarkers = [];
        vehicleMarkers.forEach(m => wasteMap.removeLayer(m));
        vehicleMarkers = [];
        hotspotMarkers.forEach(m => wasteMap.removeLayer(m));
        hotspotMarkers = [];
        routeLayers.forEach(l => wasteMap.removeLayer(l));
        routeLayers = [];

        // 1. Render Bins
        allBins.forEach(bin => {
            const lat = Number(bin.latitude || bin.lat);
            const lng = Number(bin.longitude || bin.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

            const fill = Number(bin.fill_level ?? bin.fill ?? 0);
            let color = "#16a34a"; // Green (Empty / Normal)
            if (fill >= 90) color = "#dc2626"; // Red (Overflowing)
            else if (fill >= 60) color = "#d97706"; // Yellow (Half / Full)

            const marker = L.marker([lat, lng], {
                icon: createColorIcon(color, "🗑️")
            }).addTo(wasteMap);

            const staffControls = isWasteStaff() ? `
                <div style="display:flex; gap:6px; margin-top:10px;">
                    <button class="small-btn" onclick="window.editBin(${bin.id})" style="padding:4px 8px; font-size:11px;">✏️ Edit</button>
                    <button class="small-btn" onclick="window.quickUpdateBinFill(${bin.id}, 0)" style="padding:4px 8px; font-size:11px; background:#16a34a; color:#fff;">✓ Empty</button>
                    <button class="small-btn" onclick="window.quickUpdateBinFill(${bin.id}, 95)" style="padding:4px 8px; font-size:11px; background:#dc2626; color:#fff;">⚠️ Fill 95%</button>
                </div>
            ` : "";

            marker.bindPopup(`
                <div style="font-family:inherit; min-width:210px;">
                    <strong style="font-size:14px; color:#15803d;">🗑️ ${escapeHTML(bin.name || "Smart Bin")}</strong>
                    <div style="font-size:12px; color:#64748b; margin:4px 0;">📍 ${escapeHTML(bin.location || "Gorakhpur")}</div>
                    <div style="margin:8px 0; font-size:12px;">
                        <div>Fill Level: <b>${fill}%</b></div>
                        <div style="height:6px; background:#e2e8f0; border-radius:4px; margin-top:3px; overflow:hidden;">
                            <div style="width:${fill}%; height:100%; background:${color};"></div>
                        </div>
                    </div>
                    <div style="font-size:11px; color:#475569;">
                        Type: <b>${escapeHTML(bin.bin_type || "Mixed")}</b><br>
                        Schedule: <b>${escapeHTML(bin.collection_schedule || "Daily")}</b>
                    </div>
                    ${staffControls}
                </div>
            `);
            mapMarkers.push(marker);
        });

        // 2. Render Vehicles (Staff View)
        if (isWasteStaff()) {
            allVehicles.forEach(v => {
                const lat = Number(v.latitude) || 26.7606;
                const lng = Number(v.longitude) || 83.3732;
                const marker = L.marker([lat, lng], {
                    icon: createColorIcon("#2563eb", "🚛")
                }).addTo(wasteMap);

                marker.bindPopup(`
                    <div style="font-family:inherit; min-width:200px;">
                        <strong style="font-size:14px; color:#1d4ed8;">🚛 ${escapeHTML(v.vehicle_number)}</strong>
                        <div style="font-size:12px; margin:4px 0;">Type: <b>${escapeHTML(v.vehicle_type)}</b></div>
                        <div style="font-size:12px;">Driver: <b>${escapeHTML(v.driver_name)}</b> (${escapeHTML(v.driver_phone)})</div>
                        <div style="font-size:11px; color:#475569; margin-top:4px;">Status: <b style="color:${v.status === 'On Route' ? '#16a34a' : '#64748b'}">${escapeHTML(v.status)}</b></div>
                    </div>
                `);
                vehicleMarkers.push(marker);
            });
        }

        // 3. Render Waste Hotspots
        allHotspots.forEach(h => {
            const lat = Number(h.latitude);
            const lng = Number(h.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

            const marker = L.marker([lat, lng], {
                icon: createColorIcon("#ea580c", "🔥")
            }).addTo(wasteMap);

            marker.bindPopup(`
                <div style="font-family:inherit; min-width:200px;">
                    <strong style="font-size:13px; color:#c2410c;">🔥 Hotspot: ${escapeHTML(h.location)}</strong>
                    <div style="font-size:12px; margin:4px 0;">Repeat Complaints: <b>${h.complaints}</b></div>
                    <div style="font-size:12px;">Risk Level: <span class="priority-badge priority-${(h.level || 'medium').toLowerCase()}">${h.level}</span></div>
                    <div style="font-size:11px; color:#64748b; margin-top:6px;">High incidence garbage area flagged for daily compulsory route inspection.</div>
                </div>
            `);
            hotspotMarkers.push(marker);
        });

        // 4. Render Route Polylines
        allRoutes.forEach(r => {
            if (r.waypoints_json) {
                try {
                    const coords = JSON.parse(r.waypoints_json);
                    if (Array.isArray(coords) && coords.length > 1) {
                        const polyline = L.polyline(coords, {
                            color: "#15803d",
                            weight: 3,
                            opacity: 0.7,
                            dashArray: "6, 6"
                        }).addTo(wasteMap);
                        polyline.bindTooltip(`🗺️ ${escapeHTML(r.route_name)} (${escapeHTML(r.schedule)})`);
                        routeLayers.push(polyline);
                    }
                } catch (e) {}
            }
        });
    }

    // -------------------------------------------------------
    // 6. DATA LOADING & SYNCHRONIZATION
    // -------------------------------------------------------
    async function refreshAllData() {
        await Promise.allSettled([
            loadBins(),
            loadHotspots(),
            isWasteStaff() ? loadStaffRequests() : loadCitizenRequests(),
            isWasteStaff() ? loadStaffAssets() : Promise.resolve(),
            isWasteStaff() ? loadOperationsSummary() : Promise.resolve(),
            isWasteStaff() ? window.loadCitizenBinRequests() : Promise.resolve()
        ]);
        renderMapMarkers();
        updateCitizenStats();
    }

    // 6.1 Load Smart Bins
    async function loadBins() {
        try {
            const res = await fetch(`${API_BASE}/api/waste/bins`);
            const data = await res.json();
            if (res.ok && Array.isArray(data.bins)) {
                allBins = data.bins;
                localStorage.setItem("smartBinsCache", JSON.stringify(allBins));
            } else {
                throw new Error("Invalid response");
            }
        } catch (e) {
            allBins = JSON.parse(localStorage.getItem("smartBinsCache") || "[]");
        }
        renderBinsList();
        renderNearbyBinsCitizen();
    }

    // 6.2 Load Hotspots
    async function loadHotspots() {
        try {
            const res = await fetch(`${API_BASE}/api/waste/hotspots`);
            const data = await res.json();
            if (res.ok && Array.isArray(data.hotspots)) {
                allHotspots = data.hotspots;
            }
        } catch (e) {
            allHotspots = [];
        }
        renderHotspotsTable();
    }

    // 6.3 Load Citizen Requests & Complaints
    async function loadCitizenRequests(showUserFeedback = false) {
        const user = getCurrentUser();
        const uid = user ? (user.userId || user.id) : null;
        const mobile = user ? user.mobile : null;

        try {
            const url = `${API_BASE}/api/waste/my-requests?userId=${encodeURIComponent(uid || "")}&mobile=${encodeURIComponent(mobile || "")}`;
            const res = await authFetch(url);
            const data = await res.json();
            if (res.ok && data.success) {
                citizenMyRequests = data.reports || [];
                citizenMyBinRequests = data.binRequests || [];
            }
        } catch (e) {
            citizenMyRequests = JSON.parse(localStorage.getItem("smartReports") || "[]");
            citizenMyBinRequests = JSON.parse(localStorage.getItem("wasteBinRequests") || "[]");
        }

        renderCitizenComplaintsList();
        renderCitizenBinRequestsList();
        renderCitizenPickupSchedule();
        updateCitizenStats();

        if (showUserFeedback) {
            showToast("✅ My complaints & requests updated.");
        }
    }
    window.loadCitizenRequests = loadCitizenRequests;

    // 6.4 Load Staff Requests
    async function loadStaffRequests() {
        try {
            const res = await authFetch(`${API_BASE}/api/waste/requests?limit=100`);
            const data = await res.json();
            if (res.ok && Array.isArray(data.data)) {
                allRequests = data.data;
            }
        } catch (e) {
            allRequests = [];
        }
        filterStaffRequests();
    }

    // 6.5 Load Staff Assets (Vehicles, Workers, Routes)
    async function loadStaffAssets() {
        try {
            const [vRes, wRes, rRes] = await Promise.all([
                authFetch(`${API_BASE}/api/waste/vehicles`),
                authFetch(`${API_BASE}/api/waste/workers`),
                authFetch(`${API_BASE}/api/waste/routes`)
            ]);
            const vData = await vRes.json();
            const wData = await wRes.json();
            const rData = await rRes.json();

            if (vRes.ok) allVehicles = vData.vehicles || [];
            if (wRes.ok) allWorkers = wData.workers || [];
            if (rRes.ok) allRoutes = rData.routes || [];
        } catch (e) {}

        populateStaffDropdowns();
        renderVehiclesTable();
        renderWorkersTable();
        renderRoutesTable();
    }
    window.refreshStaffAssets = loadStaffAssets;

    // 6.6 Operations Summary & Counters
    async function loadOperationsSummary() {
        try {
            const res = await authFetch(`${API_BASE}/api/waste/operations/summary`);
            const data = await res.json();
            if (res.ok && data.data) {
                const s = data.data;
                const totalBinsEl = document.getElementById("totalBins");
                const emptyBinsEl = document.getElementById("emptyBins");
                const halfBinsEl = document.getElementById("halfBins");
                const fullBinsEl = document.getElementById("fullBins");
                const activeOpsEl = document.getElementById("activeOperationsCount");
                const pendingReqsEl = document.getElementById("pendingRequestsCount");
                const resolvedTodayEl = document.getElementById("resolvedTodayCount");
                const effEl = document.getElementById("collectionEfficiencyVal");

                if (totalBinsEl) totalBinsEl.textContent = s.totalBins || allBins.length;
                if (emptyBinsEl) emptyBinsEl.textContent = s.emptyBins || 0;
                if (halfBinsEl) halfBinsEl.textContent = s.halfBins || 0;
                if (fullBinsEl) fullBinsEl.textContent = Number(s.overflowingBins || 0) + Number(s.halfBins || 0);
                if (activeOpsEl) activeOpsEl.textContent = s.inProgressOperations || 0;
                if (pendingReqsEl) pendingReqsEl.textContent = s.pendingRequests || 0;
                if (resolvedTodayEl) resolvedTodayEl.textContent = s.resolvedToday || 0;

                const total = Number(s.totalRequests) || 1;
                const resolved = Number(s.resolvedToday) || 0;
                const efficiency = Math.min(100, Math.round((resolved / (total || 1)) * 100)) || 85;
                if (effEl) effEl.textContent = `${efficiency}%`;
            }
        } catch (e) {}
    }

    // -------------------------------------------------------
    // 7. CITIZEN UI RENDERING
    // -------------------------------------------------------
    function updateCitizenStats() {
        const reportCountEl = document.getElementById("citizenReportCount");
        const pickupCountEl = document.getElementById("citizenPickupCount");
        const binReqCountEl = document.getElementById("citizenBinRequestCount");
        const scoreEl = document.getElementById("citizenScore");

        const reports = citizenMyRequests.filter(r => r.category !== "Scheduled Pickup");
        const pickups = citizenMyRequests.filter(r => r.category === "Scheduled Pickup");

        if (reportCountEl) reportCountEl.textContent = reports.length;
        if (pickupCountEl) pickupCountEl.textContent = pickups.length;
        if (binReqCountEl) binReqCountEl.textContent = citizenMyBinRequests.length;
        if (scoreEl) scoreEl.textContent = (reports.length * 50) + (pickups.length * 30) + 750;
    }

    function renderCitizenComplaintsList() {
        const container = document.getElementById("citizenComplaintsList");
        if (!container) return;

        if (citizenMyRequests.length === 0) {
            container.innerHTML = `<div class="empty-state">No complaints or pickup requests filed yet. Use the buttons above to submit a report!</div>`;
            return;
        }

        container.innerHTML = citizenMyRequests.map(r => {
            const status = r.status || "Submitted";
            const priority = r.priority || "MEDIUM";
            const code = r.request_code || `REQ-${r.id}`;
            const category = r.category || "Waste Report";
            const address = r.address || "Gorakhpur";
            const date = new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
            const assignedWorker = r.assigned_worker_name ? `👷 Assigned: <b>${escapeHTML(r.assigned_worker_name)}</b>` : "⏳ Pending Assignment";
            const resolution = r.resolution_notes ? `<div style="margin-top:6px; font-size:12px; color:#15803d; background:#dcfce7; padding:6px 10px; border-radius:6px;"><b>Resolution:</b> ${escapeHTML(r.resolution_notes)}</div>` : "";

            return `
                <article class="request-card">
                    <div class="request-card-head">
                        <div>
                            <strong>${escapeHTML(code)}</strong>
                            <span>${escapeHTML(category)} • ${date}</span>
                        </div>
                        <div style="display:flex; gap:6px; align-items:center;">
                            <span class="priority-badge priority-${priority.toLowerCase()}">${priority}</span>
                            <span class="status-badge status-${status.toLowerCase().replace(/[^a-z0-9]/g, '')}">${escapeHTML(status)}</span>
                        </div>
                    </div>
                    <div class="request-grid">
                        <div><small>Location</small><p>📍 ${escapeHTML(address)}</p></div>
                        <div><small>Waste Type</small><p>${escapeHTML(r.waste_type || "Mixed")}</p></div>
                        <div><small>Field Crew</small><p>${assignedWorker}</p></div>
                        <div><small>SLA Deadline</small><p>${r.sla_deadline ? new Date(r.sla_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Standard'}</p></div>
                    </div>
                    <div class="request-description">
                        ${escapeHTML(r.description || "No description provided.")}
                    </div>
                    ${resolution}
                </article>
            `;
        }).join("");
    }

    function renderCitizenBinRequestsList() {
        const container = document.getElementById("citizenBinRequestList");
        if (!container) return;

        if (citizenMyBinRequests.length === 0) {
            container.innerHTML = `<div class="empty-state">No dustbin installation requests submitted.</div>`;
            return;
        }

        container.innerHTML = citizenMyBinRequests.map(b => {
            const status = b.status || "Submitted";
            const code = b.request_code || `BIN-${b.id}`;
            const date = new Date(b.created_at).toLocaleDateString("en-IN");
            return `
                <article class="request-card">
                    <div class="request-card-head">
                        <div>
                            <strong>🗑️ ${escapeHTML(code)}</strong>
                            <span>Requested on ${date}</span>
                        </div>
                        <span class="status-badge status-${status.toLowerCase().replace(/[^a-z0-9]/g, '')}">${escapeHTML(status)}</span>
                    </div>
                    <div class="request-grid">
                        <div><small>Reason</small><p>${escapeHTML(b.reason || "Public need")}</p></div>
                        <div><small>Waste Type</small><p>${escapeHTML(b.waste_type || "Mixed")}</p></div>
                        <div><small>Location</small><p>📍 ${escapeHTML(b.location || "City")}</p></div>
                        <div><small>Coordinates</small><p>${Number(b.latitude).toFixed(4)}, ${Number(b.longitude).toFixed(4)}</p></div>
                    </div>
                </article>
            `;
        }).join("");
    }

    function renderNearbyBinsCitizen() {
        const container = document.getElementById("citizenNearbyBins");
        if (!container) return;

        if (allBins.length === 0) {
            container.innerHTML = `<div class="empty-state">No smart bins located in vicinity.</div>`;
            return;
        }

        container.innerHTML = allBins.slice(0, 6).map(bin => {
            const fill = Number(bin.fill_level ?? 0);
            let statusText = "🟢 Normal";
            if (fill >= 90) statusText = "🔴 Full";
            else if (fill >= 60) statusText = "🟡 Half";

            return `
                <div class="mini-item">
                    <strong>🗑️ ${escapeHTML(bin.name || "Smart Bin")}</strong>
                    <span>📍 ${escapeHTML(bin.location || "City")}</span>
                    <b>${statusText} (${fill}%)</b>
                </div>
            `;
        }).join("");
    }

    function renderCitizenPickupSchedule() {
        const container = document.getElementById("citizenCollectionList");
        if (!container) return;

        const pickups = citizenMyRequests.filter(r => r.category === "Scheduled Pickup");
        if (pickups.length === 0) {
            container.innerHTML = `<div class="empty-state">No scheduled doorstep collections. Click 'Request Pickup' above.</div>`;
            return;
        }

        container.innerHTML = pickups.slice(0, 6).map(p => `
            <div class="mini-item">
                <strong>🚛 ${escapeHTML(p.collection_date || "Scheduled")}</strong>
                <span>📍 ${escapeHTML(p.address || "Pickup Location")}</span>
                <b>${escapeHTML(p.status || "Scheduled")}</b>
            </div>
        `).join("");
    }

    // -------------------------------------------------------
    // 8. STAFF REQUESTS FILTERING & RENDERING
    // -------------------------------------------------------
    function filterStaffRequests() {
        const searchVal = (document.getElementById("reqSearchInput")?.value || "").toLowerCase().trim();
        const statusVal = document.getElementById("reqStatusFilter")?.value || "all";
        const priorityVal = document.getElementById("reqPriorityFilter")?.value || "all";
        const workerVal = document.getElementById("reqWorkerFilter")?.value || "all";
        const vehicleVal = document.getElementById("reqVehicleFilter")?.value || "all";

        let filtered = allRequests.filter(r => {
            if (statusVal !== "all" && r.status !== statusVal) return false;
            if (priorityVal !== "all" && r.priority !== priorityVal) return false;
            if (workerVal !== "all" && String(r.assigned_worker_id) !== String(workerVal)) return false;
            if (vehicleVal !== "all" && String(r.assigned_vehicle_id) !== String(vehicleVal)) return false;
            if (searchVal) {
                const combined = `${r.request_code} ${r.address} ${r.category} ${r.citizen_name} ${r.description}`.toLowerCase();
                if (!combined.includes(searchVal)) return false;
            }
            return true;
        });

        // Split into reports vs scheduled pickups
        const reports = filtered.filter(r => r.category !== "Scheduled Pickup");
        const pickups = filtered.filter(r => r.category === "Scheduled Pickup");

        renderStaffReportsList(reports);
        renderStaffPickupsList(pickups);
    }
    window.filterStaffRequests = filterStaffRequests;

    function renderStaffReportsList(reports) {
        const container = document.getElementById("reportList");
        if (!container) return;

        if (reports.length === 0) {
            container.innerHTML = `<div class="empty-state">No matching complaints found.</div>`;
            return;
        }

        container.innerHTML = reports.map(r => {
            const status = r.status || "Submitted";
            const priority = r.priority || "MEDIUM";
            const isResolved = status === "Resolved";
            const overdueBadge = r.isOverdue ? `<span style="background:#fee2e2; color:#b91c1c; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px; margin-left:6px;">⚠️ SLA BREACH</span>` : "";
            const evidenceImg = r.evidence_image ? `<img src="${escapeHTML(r.evidence_image)}" class="evidence-thumb-preview" onclick="window.open(this.src, '_blank')" title="Click to view photo evidence">` : "";

            return `
                <div class="item-row" style="flex-direction:column; align-items:stretch; gap:8px; padding:16px; border:1px solid #e2e8f0; border-radius:12px; margin-bottom:12px; background:#fff;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <strong style="font-size:14px;">${escapeHTML(r.request_code)}</strong>
                            <span style="font-size:12px; color:#64748b; margin-left:6px;">👤 ${escapeHTML(r.citizen_name || "Citizen")}</span>
                        </div>
                        <div style="display:flex; gap:6px; align-items:center;">
                            <span class="priority-badge priority-${priority.toLowerCase()}">${priority}</span>
                            <span class="status-badge status-${status.toLowerCase().replace(/[^a-z0-9]/g, '')}">${escapeHTML(status)}</span>
                            ${overdueBadge}
                        </div>
                    </div>

                    <div style="display:flex; gap:12px; align-items:flex-start; margin-top:4px;">
                        ${evidenceImg}
                        <div style="flex:1;">
                            <div style="font-size:13px; font-weight:600; color:#1e293b;">${escapeHTML(r.category)} • 📍 ${escapeHTML(r.address || "Gorakhpur")}</div>
                            <div style="font-size:12px; color:#64748b; margin-top:2px;">${escapeHTML(r.description || "")}</div>
                        </div>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f1f5f9; padding-top:8px; font-size:12px; color:#475569;">
                        <div>
                            👷 <b>${escapeHTML(r.assigned_worker_name || "Unassigned")}</b> 
                            ${r.assigned_vehicle_number ? ` • 🚛 <b>${escapeHTML(r.assigned_vehicle_number)}</b>` : ''}
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button class="small-btn" onclick="openStaffRequestModal(${r.id})" style="background:#0284c7; color:#fff;">⚡ Manage / Assign</button>
                            ${!isResolved ? `
                                <button class="small-btn" onclick="quickResolveRequest(${r.id})" style="background:#16a34a; color:#fff;">✓ Resolve</button>
                            ` : `
                                <button class="small-btn" onclick="reopenRequest(${r.id})" style="background:#d97706; color:#fff;">↻ Reopen</button>
                            `}
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    function renderStaffPickupsList(pickups) {
        const container = document.getElementById("pickupList");
        if (!container) return;

        if (pickups.length === 0) {
            container.innerHTML = `<div class="empty-state">No scheduled pickups found.</div>`;
            return;
        }

        container.innerHTML = pickups.map(p => `
            <div class="item-row" style="flex-direction:column; align-items:stretch; gap:8px; padding:16px; border:1px solid #e2e8f0; border-radius:12px; margin-bottom:12px; background:#fff;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${escapeHTML(p.request_code)}</strong>
                    <span class="status-badge status-${(p.status || 'submitted').toLowerCase().replace(/[^a-z0-9]/g, '')}">${escapeHTML(p.status || 'Submitted')}</span>
                </div>
                <div style="font-size:13px;">📅 <b>${escapeHTML(p.collection_date || "Pending")}</b> (${escapeHTML(p.collection_time || "Morning")})</div>
                <div style="font-size:12px; color:#64748b;">📍 ${escapeHTML(p.address || "Gorakhpur")} • Type: <b>${escapeHTML(p.waste_type || "General")}</b></div>
                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f1f5f9; padding-top:8px;">
                    <span style="font-size:12px;">👷 <b>${escapeHTML(p.assigned_worker_name || "Unassigned")}</b></span>
                    <button class="small-btn" onclick="openStaffRequestModal(${p.id})" style="background:#0284c7; color:#fff;">⚡ Assign / Dispatch</button>
                </div>
            </div>
        `).join("");
    }

    // -------------------------------------------------------
    // 9. BINS MANAGEMENT (CRUD)
    // -------------------------------------------------------
    function renderBinsList() {
        const container = document.getElementById("binList");
        if (!container) return;

        const search = (document.getElementById("binSearch")?.value || "").toLowerCase().trim();
        const filter = document.getElementById("binFilter")?.value || "all";

        let filtered = allBins.filter(b => {
            const fill = Number(b.fill_level ?? b.fill ?? 0);
            if (filter === "empty" && fill > 25) return false;
            if (filter === "half" && (fill <= 25 || fill >= 75)) return false;
            if (filter === "full" && fill < 75) return false;
            if (search) {
                const text = `${b.name} ${b.location} ${b.bin_code}`.toLowerCase();
                if (!text.includes(search)) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            container.innerHTML = `<div class="empty-state">No matching smart bins found.</div>`;
            return;
        }

        container.innerHTML = filtered.map(bin => {
            const fill = Number(bin.fill_level ?? bin.fill ?? 0);
            let color = "#16a34a";
            let statusText = "Empty";
            if (fill >= 90) { color = "#dc2626"; statusText = "Overflowing"; }
            else if (fill >= 70) { color = "#d97706"; statusText = "Full"; }
            else if (fill >= 30) { color = "#eab308"; statusText = "Half Full"; }

            return `
                <div class="bin-item">
                    <div class="bin-icon">🗑️</div>
                    <div class="bin-info">
                        <h4>${escapeHTML(bin.name || "Smart Bin")} (${escapeHTML(bin.bin_code || "BIN")})</h4>
                        <p>📍 ${escapeHTML(bin.location || "Gorakhpur")} • Cap: ${bin.capacity_liters || 500}L • ${escapeHTML(bin.bin_type || "Mixed")}</p>
                        <div class="fill-bar">
                            <div class="fill-value" style="width: ${fill}%; background: ${color};"></div>
                        </div>
                        <span class="status" style="background: ${color}20; color: ${color};">${statusText} (${fill}%)</span>
                    </div>
                    <div class="bin-actions">
                        <button class="action-btn" title="Quick Empty" onclick="window.quickUpdateBinFill(${bin.id}, 0)">🟢</button>
                        <button class="action-btn" title="Set 95%" onclick="window.quickUpdateBinFill(${bin.id}, 95)">🔴</button>
                        <button class="action-btn" title="Edit Bin" onclick="window.editBin(${bin.id})">✏️</button>
                        <button class="action-btn" title="Deactivate" onclick="window.deleteBin(${bin.id})">🗑️</button>
                    </div>
                </div>
            `;
        }).join("");
    }
    window.renderBins = renderBinsList;

    window.openBinModal = function (binId = null) {
        if (!isWasteStaff()) {
            showToast("❌ Only Waste Staff can manage waste bins.", true);
            return;
        }
        const modal = document.getElementById("binModal");
        if (!modal) return;

        const titleEl = document.getElementById("binModalTitle");
        const idInput = document.getElementById("binId");
        const nameInput = document.getElementById("binName");
        const locInput = document.getElementById("binLocation");
        const latInput = document.getElementById("binLat");
        const lngInput = document.getElementById("binLng");
        const fillInput = document.getElementById("binFill");

        if (binId) {
            const b = allBins.find(x => Number(x.id) === Number(binId));
            if (b) {
                if (titleEl) titleEl.textContent = "Edit Smart Bin";
                if (idInput) idInput.value = b.id;
                if (nameInput) nameInput.value = b.name || "";
                if (locInput) locInput.value = b.location || "";
                if (latInput) latInput.value = b.latitude || b.lat || "";
                if (lngInput) lngInput.value = b.longitude || b.lng || "";
                if (fillInput) fillInput.value = b.fill_level ?? b.fill ?? 0;
            }
        } else {
            if (titleEl) titleEl.textContent = "Add Smart Dustbin";
            if (idInput) idInput.value = "";
            if (nameInput) nameInput.value = "";
            if (locInput) locInput.value = "";
            if (latInput) latInput.value = "26.7606";
            if (lngInput) lngInput.value = "83.3732";
            if (fillInput) fillInput.value = 0;
        }

        updateModalStatus();
        modal.classList.add("active");
        modal.style.display = "flex";
    };

    window.updateModalStatus = function () {
        const fill = Number(document.getElementById("binFill")?.value || 0);
        const statusEl = document.getElementById("modalBinStatus");
        if (!statusEl) return;
        if (fill === 0) statusEl.textContent = "🟢 Empty";
        else if (fill >= 90) statusEl.textContent = "🔴 Overflowing";
        else if (fill >= 70) statusEl.textContent = "🟠 Full";
        else statusEl.textContent = "🟡 Normal";
    };

    window.saveBin = async function () {
        if (!isWasteStaff()) {
            showToast("❌ Permission denied.", true);
            return;
        }
        const id = document.getElementById("binId")?.value;
        const name = document.getElementById("binName")?.value.trim();
        const location = document.getElementById("binLocation")?.value.trim();
        const lat = Number(document.getElementById("binLat")?.value || 26.7606);
        const lng = Number(document.getElementById("binLng")?.value || 83.3732);
        const fill = Number(document.getElementById("binFill")?.value || 0);

        if (!name || !location) {
            showToast("Please enter bin name and location.", true);
            return;
        }

        try {
            const url = id ? `${API_BASE}/api/waste/bins/${id}` : `${API_BASE}/api/waste/bins`;
            const method = id ? "PUT" : "POST";
            const res = await authFetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, location, latitude: lat, longitude: lng, fill_level: fill })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast(id ? "✅ Bin updated successfully." : "✅ Bin created successfully.");
                closeModal("binModal");
                await loadBins();
                renderMapMarkers();
            } else {
                throw new Error(data.message || "Failed to save bin.");
            }
        } catch (err) {
            showToast(`Error: ${err.message}`, true);
        }
    };

    window.editBin = function (id) {
        window.openBinModal(id);
    };

    window.deleteBin = async function (id) {
        if (!isWasteStaff()) return;
        if (!confirm("Are you sure you want to deactivate this smart bin?")) return;

        try {
            const res = await authFetch(`${API_BASE}/api/waste/bins/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast("✅ Bin deactivated.");
                await loadBins();
                renderMapMarkers();
            }
        } catch (e) {
            showToast("Error deactivating bin.", true);
        }
    };

    window.quickUpdateBinFill = async function (id, fill) {
        if (!isWasteStaff()) return;
        try {
            const res = await authFetch(`${API_BASE}/api/waste/bins/${id}/fill`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fill_level: fill })
            });
            if (res.ok) {
                showToast(`✅ Bin #${id} fill level updated to ${fill}%.`);
                await loadBins();
                renderMapMarkers();
                loadOperationsSummary();
            }
        } catch (e) {
            showToast("Failed to update fill level.", true);
        }
    };

    // -------------------------------------------------------
    // 10. CITIZEN ACTION HANDLERS (Report, Pickup, Bin Req)
    // -------------------------------------------------------
    window.openReportModal = function () {
        const modal = document.getElementById("reportModal");
        if (!modal) return;
        modal.classList.add("active");
        modal.style.display = "flex";
    };

    window.openPickupModal = function () {
        const modal = document.getElementById("pickupModal");
        if (!modal) return;
        // Default tomorrow
        const tom = new Date(Date.now() + 86400000).toISOString().split("T")[0];
        const dateInput = document.getElementById("pickupDate");
        if (dateInput && !dateInput.value) dateInput.value = tom;
        modal.classList.add("active");
        modal.style.display = "flex";
    };

    window.useCurrentLocationForReport = function () {
        if (!navigator.geolocation) {
            showToast("Geolocation not supported.", true);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            pos => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const latInput = document.getElementById("reportLat");
                const lngInput = document.getElementById("reportLng");
                const locInput = document.getElementById("reportLocation");
                if (latInput) latInput.value = lat.toFixed(6);
                if (lngInput) lngInput.value = lng.toFixed(6);
                if (locInput && !locInput.value) locInput.value = `Current GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
                showToast("📍 Coordinates captured!");
            },
            () => showToast("Unable to retrieve GPS coordinates.", true)
        );
    };

    window.useCurrentLocationForPickup = function () {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(pos => {
            const latInput = document.getElementById("pickupLat");
            const lngInput = document.getElementById("pickupLng");
            if (latInput) latInput.value = pos.coords.latitude.toFixed(6);
            if (lngInput) lngInput.value = pos.coords.longitude.toFixed(6);
            showToast("📍 Coordinates captured!");
        });
    };

    window.useCurrentLocationForBinRequest = function () {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(pos => {
            const latInput = document.getElementById("binReqLat");
            const lngInput = document.getElementById("binReqLng");
            if (latInput) latInput.value = pos.coords.latitude.toFixed(6);
            if (lngInput) lngInput.value = pos.coords.longitude.toFixed(6);
            showToast("📍 Coordinates captured!");
        });
    };

    window.handleEvidencePreview = function (event) {
        const file = event.target.files[0];
        selectedEvidenceFile = file || null;
        const previewCont = document.getElementById("reportPhotoPreview");
        const previewImg = document.getElementById("reportPhotoPreviewImg");
        if (file && previewCont && previewImg) {
            const reader = new FileReader();
            reader.onload = e => {
                previewImg.src = e.target.result;
                previewCont.style.display = "block";
            };
            reader.readAsDataURL(file);
        } else if (previewCont) {
            previewCont.style.display = "none";
        }
    };

    window.saveReport = async function () {
        const category = document.getElementById("reportCategory")?.value || "Garbage Dump";
        const wasteType = document.getElementById("reportType")?.value || "Mixed Waste";
        const location = document.getElementById("reportLocation")?.value.trim();
        const description = document.getElementById("reportDescription")?.value.trim();
        const lat = document.getElementById("reportLat")?.value || "26.7606";
        const lng = document.getElementById("reportLng")?.value || "83.3732";

        if (!location || !description) {
            showToast("Location and description are required.", true);
            return;
        }

        const formData = new FormData();
        formData.append("category", category);
        formData.append("wasteType", wasteType);
        formData.append("location", location);
        formData.append("description", description);
        formData.append("latitude", lat);
        formData.append("longitude", lng);

        const fileInput = document.getElementById("reportEvidenceFile");
        if (fileInput && fileInput.files && fileInput.files[0]) {
            formData.append("evidence", fileInput.files[0]);
        }

        try {
            const res = await authFetch(`${API_BASE}/api/waste/reports`, {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast("✅ Waste report submitted! Request Code: " + data.request.requestCode);
                closeModal("reportModal");
                // Reset form
                if (document.getElementById("reportLocation")) document.getElementById("reportLocation").value = "";
                if (document.getElementById("reportDescription")) document.getElementById("reportDescription").value = "";
                if (fileInput) fileInput.value = "";
                if (document.getElementById("reportPhotoPreview")) document.getElementById("reportPhotoPreview").style.display = "none";

                await loadCitizenRequests();
                if (isWasteStaff()) await loadStaffRequests();
            } else {
                throw new Error(data.message || "Failed to submit report.");
            }
        } catch (e) {
            showToast(`Error: ${e.message}`, true);
        }
    };

    window.savePickup = async function () {
        const wasteType = document.getElementById("pickupType")?.value || "General Waste";
        const pickupDate = document.getElementById("pickupDate")?.value;
        const pickupTime = document.getElementById("pickupTime")?.value || "8:00 AM - 10:00 AM";
        const location = document.getElementById("pickupLocation")?.value.trim();
        const lat = document.getElementById("pickupLat")?.value || "26.7606";
        const lng = document.getElementById("pickupLng")?.value || "83.3732";

        if (!pickupDate || !location) {
            showToast("Pickup date and location are required.", true);
            return;
        }

        try {
            const res = await authFetch(`${API_BASE}/api/waste/pickups`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    wasteType,
                    pickupDate,
                    pickupTime,
                    location,
                    latitude: lat,
                    longitude: lng
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast("✅ Pickup scheduled successfully!");
                closeModal("pickupModal");
                await loadCitizenRequests();
                if (isWasteStaff()) await loadStaffRequests();
            } else {
                throw new Error(data.message || "Failed to schedule pickup.");
            }
        } catch (e) {
            showToast(`Error: ${e.message}`, true);
        }
    };

    window.openCitizenBinRequestModal = function () {
        const modal = document.getElementById("citizenBinRequestModal");
        if (modal) {
            modal.classList.add("active");
            modal.style.display = "flex";
        }
    };

    window.closeCitizenBinRequestModal = function () {
        const modal = document.getElementById("citizenBinRequestModal");
        if (modal) {
            modal.classList.remove("active");
            modal.style.display = "none";
        }
    };

    window.submitCitizenBinRequest = async function () {
        const reason = document.getElementById("binReqReason")?.value.trim();
        const wasteType = document.getElementById("binReqWasteType")?.value;
        const location = document.getElementById("binReqLocation")?.value.trim();
        const lat = Number(document.getElementById("binReqLat")?.value);
        const lng = Number(document.getElementById("binReqLng")?.value);
        const description = document.getElementById("binReqDescription")?.value.trim();

        if (!reason || !location || Number.isNaN(lat) || Number.isNaN(lng)) {
            showToast("Reason, location, and valid coordinates are required.", true);
            return;
        }

        const user = getCurrentUser();
        const payload = {
            userId: user ? (user.userId || user.id) : null,
            citizenName: user ? user.name : "Citizen",
            reason,
            wasteType,
            location,
            latitude: lat,
            longitude: lng,
            description
        };

        try {
            const res = await authFetch(`${API_BASE}/api/waste/bin-requests`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast("✅ Dustbin request submitted successfully!");
                closeCitizenBinRequestModal();
                await loadCitizenRequests();
            } else {
                throw new Error(data.message || "Submission failed.");
            }
        } catch (e) {
            showToast(`Error: ${e.message}`, true);
        }
    };

    // -------------------------------------------------------
    // 10B. STAFF CITIZEN DUSTBIN REQUEST MANAGEMENT
    // -------------------------------------------------------
    let staffBinRequests = [];

    window.loadCitizenBinRequests = async function (showFeedback = false) {
        const container = document.getElementById("staffBinRequestList");
        if (!container) return;

        try {
            const res = await authFetch(`${API_BASE}/api/waste/bin-requests`);
            if (res.ok) {
                const data = await res.json();
                staffBinRequests = data.requests || [];
            }
        } catch (e) {
            console.error("Failed to fetch staff bin requests:", e);
        }

        if (staffBinRequests.length === 0) {
            container.innerHTML = `<div class="empty-state">No citizen dustbin installation requests pending.</div>`;
            return;
        }

        container.innerHTML = staffBinRequests.map(r => {
            const statusLower = (r.status || "pending").toLowerCase().replace(/[^a-z0-9]/g, "");
            return `
                <div class="request-card" style="margin-bottom: 12px;">
                    <div class="request-card-head">
                        <div>
                            <strong>🗑️ ${escapeHTML(r.landmark || r.request_code)}</strong>
                            <span>📍 ${escapeHTML(r.location)} • Citizen: ${escapeHTML(r.citizen_name || "Citizen")} (${escapeHTML(r.mobile || "N/A")})</span>
                        </div>
                        <span class="status-badge status-${statusLower}">${escapeHTML(r.status)}</span>
                    </div>
                    <div style="font-size: 13px; color: #475569; margin: 8px 0;">
                        <strong>Type:</strong> ${escapeHTML(r.bin_type || "Standard 240L")} | 
                        <strong>Reason:</strong> ${escapeHTML(r.reason || "General Civic Need")}
                    </div>
                    ${r.internal_remarks ? `<div style="font-size: 12px; color: #64748b; font-style: italic;">Remarks: ${escapeHTML(r.internal_remarks)}</div>` : ""}
                    <div style="display: flex; gap: 8px; margin-top: 10px; justify-content: flex-end;">
                        ${r.status !== "Approved" && r.status !== "Installed" ? `
                            <button class="small-btn" onclick="window.updateBinRequestStatus('${r.request_code}', 'Approved')" style="background:#16a34a; color:#fff;">✓ Approve</button>
                            <button class="small-btn" onclick="window.updateBinRequestStatus('${r.request_code}', 'Installation Scheduled')" style="background:#0284c7; color:#fff;">📅 Schedule</button>
                        ` : ""}
                        ${r.status !== "Installed" ? `
                            <button class="small-btn" onclick="window.updateBinRequestStatus('${r.request_code}', 'Installed')" style="background:#059669; color:#fff;">✅ Mark Installed</button>
                        ` : ""}
                        ${r.status !== "Rejected" && r.status !== "Installed" ? `
                            <button class="small-btn" onclick="window.updateBinRequestStatus('${r.request_code}', 'Rejected')" style="background:#fee2e2; color:#b91c1c;">✕ Reject</button>
                        ` : ""}
                    </div>
                </div>
            `;
        }).join("");

        if (showFeedback) showToast("Dustbin requests refreshed.");
    };

    window.updateBinRequestStatus = async function (requestCode, status) {
        const remarks = prompt(`Enter internal remarks for setting status to ${status} (optional):`) || "";
        try {
            const res = await authFetch(`${API_BASE}/api/waste/bin-requests/${requestCode}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status, internalRemarks: remarks })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast(`✅ Request ${requestCode} updated to ${status}.`);
                await window.loadCitizenBinRequests();
            } else {
                showToast(data.message || "Failed to update dustbin request.", true);
            }
        } catch (e) {
            showToast("Failed to update status.", true);
        }
    };
    // -------------------------------------------------------
    // 11. STAFF OPERATIONAL MODAL (Assign Worker, Vehicle, Status)
    // -------------------------------------------------------
    function populateStaffDropdowns() {
        const workerSelect = document.getElementById("staffReqWorkerSelect");
        const vehicleSelect = document.getElementById("staffReqVehicleSelect");
        const routeSelect = document.getElementById("staffReqRouteSelect");
        const rVehSelect = document.getElementById("rVehicleSelect");

        const workerFilter = document.getElementById("reqWorkerFilter");
        const vehicleFilter = document.getElementById("reqVehicleFilter");

        if (workerSelect) {
            workerSelect.innerHTML = `<option value="">-- Unassigned --</option>` +
                allWorkers.map(w => `<option value="${w.id}" data-name="${escapeHTML(w.name)}">${escapeHTML(w.name)} (${escapeHTML(w.role || 'Worker')})</option>`).join("");
        }

        if (vehicleSelect) {
            vehicleSelect.innerHTML = `<option value="">-- Unassigned --</option>` +
                allVehicles.map(v => `<option value="${v.id}" data-num="${escapeHTML(v.vehicle_number)}">${escapeHTML(v.vehicle_number)} (${escapeHTML(v.driver_name)})</option>`).join("");
        }

        if (routeSelect) {
            routeSelect.innerHTML = `<option value="">-- None --</option>` +
                allRoutes.map(r => `<option value="${r.id}">${escapeHTML(r.route_code)}: ${escapeHTML(r.route_name)}</option>`).join("");
        }

        if (rVehSelect) {
            rVehSelect.innerHTML = `<option value="">-- None --</option>` +
                allVehicles.map(v => `<option value="${v.id}">${escapeHTML(v.vehicle_number)} (${escapeHTML(v.driver_name)})</option>`).join("");
        }

        if (workerFilter) {
            workerFilter.innerHTML = `<option value="all">All Workers</option>` +
                allWorkers.map(w => `<option value="${w.id}">${escapeHTML(w.name)}</option>`).join("");
        }

        if (vehicleFilter) {
            vehicleFilter.innerHTML = `<option value="all">All Vehicles</option>` +
                allVehicles.map(v => `<option value="${v.id}">${escapeHTML(v.vehicle_number)}</option>`).join("");
        }
    }

    window.openStaffRequestModal = function (requestId) {
        if (!isWasteStaff()) return;

        const req = allRequests.find(r => Number(r.id) === Number(requestId));
        if (!req) return;

        const modal = document.getElementById("staffRequestModal");
        if (!modal) return;

        document.getElementById("staffReqId").value = req.id;
        document.getElementById("staffReqCodeDisplay").textContent = req.request_code || `REQ-${req.id}`;
        document.getElementById("staffReqCitizenDisplay").textContent = `Citizen: ${req.citizen_name || "Anonymous"} (${req.citizen_mobile || "No phone"})`;
        document.getElementById("staffReqLocationDisplay").textContent = `📍 ${req.address || "Gorakhpur"}`;
        document.getElementById("staffReqDescDisplay").textContent = `"${req.description || "No description"}"`;

        const evidenceCont = document.getElementById("staffReqEvidenceContainer");
        const evidenceImg = document.getElementById("staffReqEvidenceImg");
        if (req.evidence_image && evidenceCont && evidenceImg) {
            evidenceImg.src = req.evidence_image;
            evidenceCont.style.display = "block";
        } else if (evidenceCont) {
            evidenceCont.style.display = "none";
        }

        // Prefill form controls
        const statusSelect = document.getElementById("staffReqStatus");
        const prioritySelect = document.getElementById("staffReqPriority");
        const workerSelect = document.getElementById("staffReqWorkerSelect");
        const vehicleSelect = document.getElementById("staffReqVehicleSelect");
        const routeSelect = document.getElementById("staffReqRouteSelect");
        const remarksInput = document.getElementById("staffReqRemarks");
        const resInput = document.getElementById("staffReqResolutionNotes");

        if (statusSelect) statusSelect.value = req.status || "Submitted";
        if (prioritySelect) prioritySelect.value = req.priority || "MEDIUM";
        if (workerSelect) workerSelect.value = req.assigned_worker_id || "";
        if (vehicleSelect) vehicleSelect.value = req.assigned_vehicle_id || "";
        if (routeSelect) routeSelect.value = req.assigned_route_id || "";
        if (remarksInput) remarksInput.value = req.internal_remarks || "";
        if (resInput) resInput.value = req.resolution_notes || "";

        modal.classList.add("active");
        modal.style.display = "flex";
    };

    window.submitStaffRequestUpdate = async function () {
        if (!isWasteStaff()) return;

        const id = document.getElementById("staffReqId")?.value;
        const status = document.getElementById("staffReqStatus")?.value;
        const priority = document.getElementById("staffReqPriority")?.value;
        const workerSelect = document.getElementById("staffReqWorkerSelect");
        const vehicleSelect = document.getElementById("staffReqVehicleSelect");
        const routeSelect = document.getElementById("staffReqRouteSelect");
        const remarks = document.getElementById("staffReqRemarks")?.value;
        const resolution = document.getElementById("staffReqResolutionNotes")?.value;

        const workerId = workerSelect?.value ? Number(workerSelect.value) : null;
        const workerName = workerSelect?.options[workerSelect.selectedIndex]?.getAttribute("data-name") || null;

        const vehicleId = vehicleSelect?.value ? Number(vehicleSelect.value) : null;
        const vehicleNum = vehicleSelect?.options[vehicleSelect.selectedIndex]?.getAttribute("data-num") || null;

        const routeId = routeSelect?.value ? Number(routeSelect.value) : null;

        const payload = {
            status,
            priority,
            assigned_worker_id: workerId,
            assigned_worker_name: workerName,
            assigned_vehicle_id: vehicleId,
            assigned_vehicle_number: vehicleNum,
            assigned_route_id: routeId,
            internal_remarks: remarks,
            resolution_notes: resolution
        };

        try {
            const res = await authFetch(`${API_BASE}/api/waste/requests/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast("✅ Operational updates saved successfully!");
                closeModal("staffRequestModal");
                await loadStaffRequests();
                loadOperationsSummary();
            } else {
                throw new Error(data.message || "Failed to update request.");
            }
        } catch (e) {
            showToast(`Error: ${e.message}`, true);
        }
    };

    window.quickResolveRequest = async function (id) {
        if (!isWasteStaff()) return;
        const notes = prompt("Enter resolution details (e.g. Cleared 2 tons waste, sanitized site):", "Area cleared and sanitized.");
        if (notes === null) return;

        try {
            const res = await authFetch(`${API_BASE}/api/waste/requests/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "Resolved", resolution_notes: notes })
            });
            if (res.ok) {
                showToast("✅ Request marked as Resolved.");
                await loadStaffRequests();
                loadOperationsSummary();
            }
        } catch (e) {
            showToast("Failed to resolve request.", true);
        }
    };

    window.reopenRequest = async function (id) {
        if (!isWasteStaff()) return;
        const reason = prompt("Enter reason for reopening request:", "Citizen reported residual waste.");
        if (reason === null) return;

        try {
            const res = await authFetch(`${API_BASE}/api/waste/requests/${id}/reopen`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason })
            });
            if (res.ok) {
                showToast("✅ Request reopened for follow-up.");
                await loadStaffRequests();
                loadOperationsSummary();
            }
        } catch (e) {
            showToast("Failed to reopen request.", true);
        }
    };

    // -------------------------------------------------------
    // 12. TAB SWITCHER & ASSET MANAGEMENT (Vehicles, Workers, Routes)
    // -------------------------------------------------------
    window.switchWasteTab = function (tabId) {
        currentActiveTab = tabId;
        document.querySelectorAll(".waste-tab-btn").forEach(btn => {
            btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
        });
        document.querySelectorAll(".waste-tab-content").forEach(content => {
            content.style.display = content.id === tabId ? "" : "none";
        });

        // Update "+ Add Asset" button label
        const btn = document.getElementById("btnAddAssetBtn");
        if (btn) {
            if (tabId === "tab-vehicles") btn.textContent = "+ Add Vehicle";
            else if (tabId === "tab-workers") btn.textContent = "+ Add Worker";
            else if (tabId === "tab-routes") btn.textContent = "+ Add Route";
            else btn.textContent = "↻ Refresh";
        }

        if (tabId === "tab-analytics") {
            loadAnalyticsData();
        }
    };

    window.openActiveAssetModal = function () {
        if (currentActiveTab === "tab-vehicles") window.openVehicleModal();
        else if (currentActiveTab === "tab-workers") window.openWorkerModal();
        else if (currentActiveTab === "tab-routes") window.openRouteModal();
        else loadAnalyticsData();
    };

    // --- VEHICLES ---
    function renderVehiclesTable() {
        const tbody = document.getElementById("vehiclesTableBody");
        if (!tbody) return;

        if (allVehicles.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">No vehicles registered.</td></tr>`;
            return;
        }

        tbody.innerHTML = allVehicles.map(v => `
            <tr>
                <td><strong>🚛 ${escapeHTML(v.vehicle_number)}</strong></td>
                <td>${escapeHTML(v.vehicle_type || "Compactor")}</td>
                <td>${v.capacity_tons || 5} Tons</td>
                <td>${escapeHTML(v.driver_name)}</td>
                <td>${escapeHTML(v.driver_phone)}</td>
                <td><span class="status-badge status-${(v.status || 'available').toLowerCase().replace(/[^a-z0-9]/g, '')}">${escapeHTML(v.status)}</span></td>
                <td>
                    <button class="small-btn" onclick="window.openVehicleModal(${v.id})">✏️ Edit</button>
                    <button class="small-btn" onclick="window.deleteVehicle(${v.id})" style="background:#fee2e2; color:#b91c1c;">✕</button>
                </td>
            </tr>
        `).join("");
    }

    window.openVehicleModal = function (id = null) {
        const modal = document.getElementById("vehicleModal");
        if (!modal) return;

        if (id) {
            const v = allVehicles.find(x => Number(x.id) === Number(id));
            if (v) {
                document.getElementById("vehicleId").value = v.id;
                document.getElementById("vNumber").value = v.vehicle_number;
                document.getElementById("vType").value = v.vehicle_type;
                document.getElementById("vCapacity").value = v.capacity_tons;
                document.getElementById("vDriverName").value = v.driver_name;
                document.getElementById("vDriverPhone").value = v.driver_phone;
                document.getElementById("vStatus").value = v.status;
            }
        } else {
            document.getElementById("vehicleId").value = "";
            document.getElementById("vNumber").value = "";
            document.getElementById("vCapacity").value = "5.0";
            document.getElementById("vDriverName").value = "";
            document.getElementById("vDriverPhone").value = "";
        }
        modal.classList.add("active");
        modal.style.display = "flex";
    };

    window.saveVehicle = async function () {
        const id = document.getElementById("vehicleId")?.value;
        const vehicle_number = document.getElementById("vNumber")?.value.trim();
        const vehicle_type = document.getElementById("vType")?.value;
        const capacity_tons = Number(document.getElementById("vCapacity")?.value || 5);
        const driver_name = document.getElementById("vDriverName")?.value.trim();
        const driver_phone = document.getElementById("vDriverPhone")?.value.trim();
        const status = document.getElementById("vStatus")?.value;

        if (!vehicle_number || !driver_name || !driver_phone) {
            showToast("Vehicle number, driver name and phone are required.", true);
            return;
        }

        try {
            const url = id ? `${API_BASE}/api/waste/vehicles/${id}` : `${API_BASE}/api/waste/vehicles`;
            const method = id ? "PUT" : "POST";
            const res = await authFetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vehicle_number, vehicle_type, capacity_tons, driver_name, driver_phone, status })
            });
            if (res.ok) {
                showToast("✅ Vehicle saved.");
                closeModal("vehicleModal");
                await loadStaffAssets();
                renderMapMarkers();
            }
        } catch (e) {
            showToast("Failed to save vehicle.", true);
        }
    };

    window.deleteVehicle = async function (id) {
        if (!confirm("Deactivate this vehicle?")) return;
        try {
            const res = await authFetch(`${API_BASE}/api/waste/vehicles/${id}`, { method: "DELETE" });
            if (res.ok) {
                showToast("Vehicle deactivated.");
                await loadStaffAssets();
                renderMapMarkers();
            }
        } catch (e) {}
    };

    // --- WORKERS ---
    function renderWorkersTable() {
        const tbody = document.getElementById("workersTableBody");
        if (!tbody) return;

        if (allWorkers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">No workers registered.</td></tr>`;
            return;
        }

        tbody.innerHTML = allWorkers.map(w => `
            <tr>
                <td><strong>${escapeHTML(w.worker_code || `WRK-${w.id}`)}</strong></td>
                <td>👷 ${escapeHTML(w.name)}</td>
                <td>${escapeHTML(w.phone)}</td>
                <td>${escapeHTML(w.role || "Sanitation Worker")}</td>
                <td><span class="status-badge status-${(w.status || 'active').toLowerCase().replace(/[^a-z0-9]/g, '')}">${escapeHTML(w.status)}</span></td>
                <td>
                    <button class="small-btn" onclick="window.openWorkerModal(${w.id})">✏️ Edit</button>
                    <button class="small-btn" onclick="window.deleteWorker(${w.id})" style="background:#fee2e2; color:#b91c1c;">✕</button>
                </td>
            </tr>
        `).join("");
    }

    window.openWorkerModal = function (id = null) {
        const modal = document.getElementById("workerModal");
        if (!modal) return;

        if (id) {
            const w = allWorkers.find(x => Number(x.id) === Number(id));
            if (w) {
                document.getElementById("workerId").value = w.id;
                document.getElementById("wName").value = w.name;
                document.getElementById("wPhone").value = w.phone;
                document.getElementById("wRole").value = w.role;
                document.getElementById("wStatus").value = w.status;
            }
        } else {
            document.getElementById("workerId").value = "";
            document.getElementById("wName").value = "";
            document.getElementById("wPhone").value = "";
        }
        modal.classList.add("active");
        modal.style.display = "flex";
    };

    window.saveWorker = async function () {
        const id = document.getElementById("workerId")?.value;
        const name = document.getElementById("wName")?.value.trim();
        const phone = document.getElementById("wPhone")?.value.trim();
        const role = document.getElementById("wRole")?.value;
        const status = document.getElementById("wStatus")?.value;

        if (!name || !phone) {
            showToast("Name and phone are required.", true);
            return;
        }

        try {
            const url = id ? `${API_BASE}/api/waste/workers/${id}` : `${API_BASE}/api/waste/workers`;
            const method = id ? "PUT" : "POST";
            const res = await authFetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, phone, role, status })
            });
            if (res.ok) {
                showToast("✅ Worker saved.");
                closeModal("workerModal");
                await loadStaffAssets();
            }
        } catch (e) {
            showToast("Failed to save worker.", true);
        }
    };

    window.deleteWorker = async function (id) {
        if (!confirm("Deactivate this worker?")) return;
        try {
            const res = await authFetch(`${API_BASE}/api/waste/workers/${id}`, { method: "DELETE" });
            if (res.ok) {
                showToast("Worker deactivated.");
                await loadStaffAssets();
            }
        } catch (e) {}
    };

    // --- ROUTES ---
    function renderRoutesTable() {
        const tbody = document.getElementById("routesTableBody");
        if (!tbody) return;

        if (allRoutes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">No routes configured.</td></tr>`;
            return;
        }

        tbody.innerHTML = allRoutes.map(r => `
            <tr>
                <td><strong>${escapeHTML(r.route_code || `RT-${r.id}`)}</strong></td>
                <td>🗺️ ${escapeHTML(r.route_name)}</td>
                <td>${escapeHTML(r.area)}</td>
                <td>${escapeHTML(r.schedule || "Daily")}</td>
                <td>${escapeHTML(r.vehicle_number || "Unassigned")}</td>
                <td><span class="status-badge status-resolved">${escapeHTML(r.status || "Active")}</span></td>
                <td>
                    <button class="small-btn" onclick="window.openRouteModal(${r.id})">✏️ Edit</button>
                    <button class="small-btn" onclick="window.deleteRoute(${r.id})" style="background:#fee2e2; color:#b91c1c;">✕</button>
                </td>
            </tr>
        `).join("");
    }

    window.openRouteModal = function (id = null) {
        const modal = document.getElementById("routeModal");
        if (!modal) return;

        if (id) {
            const r = allRoutes.find(x => Number(x.id) === Number(id));
            if (r) {
                document.getElementById("routeId").value = r.id;
                document.getElementById("rName").value = r.route_name;
                document.getElementById("rArea").value = r.area;
                document.getElementById("rSchedule").value = r.schedule;
                document.getElementById("rVehicleSelect").value = r.assigned_vehicle_id || "";
            }
        } else {
            document.getElementById("routeId").value = "";
            document.getElementById("rName").value = "";
            document.getElementById("rArea").value = "";
        }
        modal.classList.add("active");
        modal.style.display = "flex";
    };

    window.saveRoute = async function () {
        const id = document.getElementById("routeId")?.value;
        const route_name = document.getElementById("rName")?.value.trim();
        const area = document.getElementById("rArea")?.value.trim();
        const schedule = document.getElementById("rSchedule")?.value.trim();
        const assigned_vehicle_id = document.getElementById("rVehicleSelect")?.value ? Number(document.getElementById("rVehicleSelect").value) : null;

        if (!route_name || !area) {
            showToast("Route name and area are required.", true);
            return;
        }

        try {
            const url = id ? `${API_BASE}/api/waste/routes/${id}` : `${API_BASE}/api/waste/routes`;
            const method = id ? "PUT" : "POST";
            const res = await authFetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ route_name, area, schedule, assigned_vehicle_id })
            });
            if (res.ok) {
                showToast("✅ Route saved.");
                closeModal("routeModal");
                await loadStaffAssets();
                renderMapMarkers();
            }
        } catch (e) {
            showToast("Failed to save route.", true);
        }
    };

    window.deleteRoute = async function (id) {
        if (!confirm("Suspend this route?")) return;
        try {
            const res = await authFetch(`${API_BASE}/api/waste/routes/${id}`, { method: "DELETE" });
            if (res.ok) {
                showToast("Route suspended.");
                await loadStaffAssets();
            }
        } catch (e) {}
    };

    // --- ANALYTICS & HOTSPOTS ---
    async function loadAnalyticsData() {
        try {
            const res = await authFetch(`${API_BASE}/api/waste/analytics`);
            const data = await res.json();
            if (res.ok && data.analytics) {
                const typesList = document.getElementById("wasteTypeBreakdownList");
                const areasList = document.getElementById("wasteTopAreasList");

                if (typesList && Array.isArray(data.analytics.wasteTypes)) {
                    typesList.innerHTML = data.analytics.wasteTypes.map(t => `
                        <div style="display:flex; justify-content:space-between; font-size:13px; border-bottom:1px solid #f1f5f9; padding:4px 0;">
                            <span>🏷️ ${escapeHTML(t.typeName)}</span>
                            <strong>${t.count} complaints</strong>
                        </div>
                    `).join("");
                }

                if (areasList && Array.isArray(data.analytics.topAreas)) {
                    areasList.innerHTML = data.analytics.topAreas.map(a => `
                        <div style="display:flex; justify-content:space-between; font-size:13px; border-bottom:1px solid #f1f5f9; padding:4px 0;">
                            <span>📍 ${escapeHTML(a.areaName)}</span>
                            <strong>${a.count} incidents</strong>
                        </div>
                    `).join("");
                }
            }
        } catch (e) {}
    }

    function renderHotspotsTable() {
        const tbody = document.getElementById("hotspotsTableBody");
        if (!tbody) return;

        if (allHotspots.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">No critical waste hotspots detected. City cleanliness status is optimal!</td></tr>`;
            return;
        }

        tbody.innerHTML = allHotspots.map(h => `
            <tr>
                <td><strong>📍 ${escapeHTML(h.location)}</strong></td>
                <td><b>${h.complaints}</b> complaints</td>
                <td>Score: <b>${h.severityScore}</b></td>
                <td><span class="priority-badge priority-${(h.level || 'medium').toLowerCase()}">${h.level}</span></td>
                <td>
                    <button class="small-btn" onclick="focusMapLocation(${h.latitude}, ${h.longitude})">🗺️ View on Map</button>
                </td>
            </tr>
        `).join("");
    }

    window.focusMapLocation = function (lat, lng) {
        if (!wasteMap) return;
        wasteMap.setView([lat, lng], 16);
        const mapCard = document.querySelector(".map-card");
        if (mapCard) mapCard.scrollIntoView({ behavior: "smooth" });
    };

    // -------------------------------------------------------
    // 13. MODAL CLOSE UTILITY
    // -------------------------------------------------------
    window.closeModal = function (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove("active");
            modal.style.display = "none";
        }
    };

    // -------------------------------------------------------
    // 14. REALTIME SOCKET.IO INTEGRATION
    // -------------------------------------------------------
    function initSocket() {
        try {
            if (typeof io !== "undefined") {
                socket = io();
                socket.on("waste:request_created", () => {
                    refreshAllData();
                });
                socket.on("waste:request_updated", () => {
                    refreshAllData();
                });
                socket.on("waste:bin_updated", () => {
                    loadBins();
                });
                socket.on("waste:bin_request_created", () => {
                    loadCitizenRequests();
                });
                socket.on("waste:bin_request_updated", () => {
                    loadCitizenRequests();
                });
            }
        } catch (e) {
            console.warn("Socket.io init warning:", e.message);
        }
    }

    // -------------------------------------------------------
    // 15. INITIALIZATION ON DOM READY
    // -------------------------------------------------------
    async function init() {
        applyRoleUI();
        initMap();
        initSocket();
        await refreshAllData();

        // Cross-tab and local auth session sync
        window.addEventListener("smartcity:auth-change", () => {
            applyRoleUI();
            refreshAllData();
        });
        window.addEventListener("storage", e => {
            if (e.key === "smartCityJWT" || e.key === "smartCityCurrentUser") {
                applyRoleUI();
                refreshAllData();
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();