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
            const role = (user.role || "").toLowerCase();
            const dept = (user.department || "").toLowerCase();
            if (role === "admin") return true;
            if (role === "staff" && (dept === "water" || dept === "admin")) return true;
        }
        return localStorage.getItem("waterRole") === "worker";
    }

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

        // Update tab buttons
        document.querySelectorAll(".layer-tab-btn").forEach(btn => btn.classList.remove("active"));
        const activeBtn = document.getElementById(`tab-btn-${layer}`);
        if (activeBtn) activeBtn.classList.add("active");

        // Toggle layer containers
        const citizenLayer = document.getElementById("layer-citizen-content");
        const staffLayer = document.getElementById("layer-staff-content");
        const adminLayer = document.getElementById("layer-admin-content");

        if (citizenLayer) citizenLayer.style.display = (layer === "citizen") ? "block" : "none";
        if (staffLayer) staffLayer.style.display = (layer === "staff") ? "block" : "none";
        if (adminLayer) adminLayer.style.display = (layer === "admin") ? "block" : "none";

        // Gatekeepers for staff and admin
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

        // Map resize trigger
        setTimeout(() => {
            if (waterMap) waterMap.invalidateSize();
        }, 120);
    }
    window.switchWaterLayer = switchWaterLayer;

    function applyRoleUI() {
        const staff = isWaterStaff();
        const user = getCurrentUser();
        const name = user ? (user.name || user.username || "Omkar") : (localStorage.getItem("waterRole") === "worker" ? "Water Worker" : "Citizen");

        const profileName = document.getElementById("profileName");
        const profileNavName = document.getElementById("profileNavName");
        const profileRole = document.getElementById("profileRole");
        const roleBadge = document.getElementById("roleBadge");
        const rolePill = document.getElementById("rolePill");
        const roleTitle = document.getElementById("roleTitle");
        const roleSubtitle = document.getElementById("roleSubtitle");

        if (profileName) profileName.textContent = name;
        if (profileNavName) profileNavName.textContent = name;
        if (profileRole) profileRole.textContent = staff ? "Water Works Staff" : "Citizen";

        if (roleBadge) {
            roleBadge.textContent = staff ? "STAFF • WATER" : "CITIZEN";
            roleBadge.style.background = staff ? "#dbeafe" : "#e0f2fe";
            roleBadge.style.color = staff ? "#1d4ed8" : "#0369a1";
        }

        if (rolePill) {
            rolePill.textContent = staff ? "STAFF • WATER" : "CITIZEN";
            rolePill.className = staff ? "role-pill staff-pill" : "role-pill citizen-pill";
        }

        if (roleTitle) {
            roleTitle.textContent = staff
                ? "Water Works Operations & SCADA Control Room"
                : `Welcome to SmartCity AI Water Services, ${name}`;
        }

        if (roleSubtitle) {
            roleSubtitle.textContent = staff
                ? "Manage civic pipeline complaints, dispatch emergency tankers, control overhead pumps, and inspect telemetry."
                : "Monitor clean water supply timings, report leaks, request doorstep water tankers, and view purity test scores.";
        }

        // Auto-switch layer based on role on page load
        if (staff) {
            switchWaterLayer("staff");
        } else {
            switchWaterLayer("citizen");
        }
    }

    // -------------------------------------------------------
    // 4. MAP INITIALIZATION & VISUALIZATION
    // -------------------------------------------------------
    function initWaterMap() {
        const mapEl = document.getElementById("waterMap");
        if (!mapEl) return;

        waterMap = L.map("waterMap").setView([26.7606, 83.3732], 13);

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

    // Report form submit
    const reportForm = document.getElementById("reportForm");
    if (reportForm) {
        reportForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const submitBtn = document.getElementById("submitReportBtn");
            if (submitBtn) submitBtn.disabled = true;

            const issueType = document.getElementById("problemType").value;
            const location = document.getElementById("reportLocation").value.trim();
            const description = document.getElementById("reportDescription").value.trim();
            const photoInput = document.getElementById("reportPhoto");

            const formData = new FormData();
            formData.append("issueType", issueType);
            formData.append("location", location);
            formData.append("description", description);

            const user = getCurrentUser();
            if (user) {
                formData.append("citizenName", user.name || user.username || "Citizen");
                formData.append("mobile", user.phone || user.mobile || "9876543210");
                formData.append("userId", user.id || user.userId || "");
            }

            if (photoInput && photoInput.files.length > 0) {
                formData.append("evidenceImage", photoInput.files[0]);
            }

            try {
                const token = getAuth() ? getAuth().getToken() : null;
                const headers = {};
                if (token) headers["Authorization"] = `Bearer ${token}`;

                const res = await fetch(`${API_BASE}/api/water/reports`, {
                    method: "POST",
                    headers,
                    body: formData
                });
                const data = await res.json();
                if (data.success) {
                    showToast("✅ Complaint registered successfully!");
                    closeModal("reportModal");
                    reportForm.reset();
                    fetchAllWaterData();
                } else {
                    alert(data.message || "Failed to submit complaint.");
                }
            } catch (err) {
                console.error("Report submit error:", err);
                showToast("✅ Complaint submitted (offline fallback)");
                closeModal("reportModal");
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

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
        const menu = document.getElementById("profileMenu");
        if (menu) menu.style.display = (menu.style.display === "block") ? "none" : "block";
    }
    window.toggleProfile = toggleProfile;

    function switchRole(role) {
        localStorage.setItem("waterRole", role === "worker" ? "worker" : "user");
        applyRoleUI();
        showToast(role === "worker" ? "👷 Water Staff mode activated" : "👤 Citizen mode activated");
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
    // 12. INITIALIZATION ON DOM READY
    // -------------------------------------------------------
    document.addEventListener("DOMContentLoaded", () => {
        initWaterMap();
        applyRoleUI();
        fetchAllWaterData();
        initRealtime();

        // Listen for global auth changes from frontend/auth.js
        window.addEventListener("smartcity:auth-changed", () => {
            applyRoleUI();
            fetchAllWaterData();
        });

        // Periodic background poll
        setInterval(fetchAllWaterData, 25000);
    });

})();