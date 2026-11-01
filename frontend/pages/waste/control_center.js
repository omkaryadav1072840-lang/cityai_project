/**
 * SmartCity AI - Control Center Dashboard Controller
 * Connects GIS map, Area Analytics, AI Worker Recommendation, and Proof Verification.
 */

(function () {
    "use strict";

    const API_BASE = (typeof window !== "undefined" && window.API_BASE_URL)
        ? window.API_BASE_URL
        : ((typeof window !== "undefined" && (window.location.port === "5000" || window.location.protocol === "file:"))
            ? "http://localhost:5000"
            : "");

    let ccMap = null;
    let markersLayer = null;
    let routesLayer = null;
    let allComplaints = [];
    let currentRecommendData = null;

    function getAuthToken() {
        return localStorage.getItem("smartCityJWT") || localStorage.getItem("smartcity_token");
    }

    function getCurrentUser() {
        try {
            const raw = localStorage.getItem("smartCityCurrentUser") || localStorage.getItem("smartcity_user");
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    async function authFetch(url, options = {}) {
        const token = getAuthToken();
        const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
        if (token) headers["Authorization"] = `Bearer ${token}`;
        return fetch(url, Object.assign({}, options, { headers }));
    }

    function showToast(msg, isError = false) {
        const old = document.querySelector(".sc-toast");
        if (old) old.remove();

        const toast = document.createElement("div");
        toast.className = "sc-toast";
        toast.style.cssText = `
            position: fixed; bottom: 25px; right: 25px; z-index: 10000;
            padding: 12px 20px; border-radius: 10px; font-weight: 700; font-size: 13px;
            color: #ffffff; background: ${isError ? '#dc2626' : '#059669'};
            box-shadow: 0 4px 15px rgba(0,0,0,0.2); transition: all 0.3s ease;
        `;
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    // -------------------------------------------------------------------------
    // 1. INITIALIZATION & AUTH CHECK
    // -------------------------------------------------------------------------
    async function init() {
        const user = getCurrentUser();
        const token = getAuthToken();
        const role = (user && (user.role || user.accountType || "")).toLowerCase();
        const isAuthorized = token && user && (role === "control_center" || role === "admin" || role === "super_admin" || (user.staffId && user.staffId.startsWith("WST-CC")));
        if (!isAuthorized) {
            window.location.replace("waste.html");
            return;
        }

        const nameEl = document.getElementById("ccOperatorName");
        const idEl = document.getElementById("ccOperatorId");
        if (nameEl) nameEl.textContent = user.name || "Control Center Operator";
        if (idEl) idEl.textContent = `${user.staffId || 'WST-CC-01'} (${user.role || 'Control Center'})`;

        initMap();
        initSockets();
        await refreshAllData();
    }

    function initMap() {
        if (typeof L === "undefined" || ccMap) return;

        ccMap = L.map("ccGisMap").setView([26.7606, 83.3732], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "© OpenStreetMap contributors"
        }).addTo(ccMap);

        markersLayer = L.layerGroup().addTo(ccMap);
        routesLayer = L.layerGroup().addTo(ccMap);
    }

    function initSockets() {
        if (typeof io === "undefined") return;
        try {
            const socket = io({ auth: { token: getAuthToken() } });
            socket.emit("join-waste");

            socket.on("waste-proof-submitted", (data) => {
                showToast(`📸 New collection proof submitted for task ${data.request_code}!`);
                loadComplaints();
                loadProofVerificationDesk();
            });

            socket.on("waste-bin-overflow-alert", (data) => {
                showToast(`🚨 AUTOMATED ALERT: Bin ${data.bin_code} overflowed! Collection queued.`);
                loadComplaints();
                refreshMapData();
            });
        } catch (e) {
            console.warn("Socket init error:", e.message);
        }
    }

    // -------------------------------------------------------------------------
    // 2. DATA LOADERS
    // -------------------------------------------------------------------------
    async function refreshAllData() {
        await Promise.all([
            refreshMapData(),
            loadAreaAnalytics(),
            loadComplaints()
        ]);
    }

    async function refreshMapData() {
        if (!ccMap || !markersLayer) return;
        try {
            const res = await authFetch(`${API_BASE}/api/waste/control-center/map-data`);
            const data = await res.json();
            if (!res.ok || !data.gis) return;

            markersLayer.clearLayers();
            routesLayer.clearLayers();

            const { bins, workers, complaints, routes } = data.gis;

            // Bins
            bins.forEach(b => {
                let color = "#10b981";
                if (b.fill_level >= 85) color = "#ef4444";
                else if (b.fill_level >= 70) color = "#f59e0b";

                const icon = L.divIcon({
                    className: "bin-icon",
                    html: `<div style="background:${color}; color:white; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3);">🗑️</div>`,
                    iconSize: [28, 28]
                });

                L.marker([b.lat, b.lng], { icon })
                    .addTo(markersLayer)
                    .bindPopup(`<b>${b.name} (${b.bin_code})</b><br>Fill: <b>${b.fill_level}%</b> (${b.status})<br>Type: ${b.type}<br>Location: ${b.location}`);
            });

            // Active Workers
            workers.forEach(w => {
                if (w.location && w.location.lat) {
                    const wIcon = L.divIcon({
                        className: "worker-icon",
                        html: `<div style="background:#2563eb; color:white; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:15px; border:2px solid white; box-shadow:0 3px 8px rgba(37,99,235,0.4);">👷</div>`,
                        iconSize: [30, 30]
                    });

                    L.marker([w.location.lat, w.location.lng], { icon: wIcon })
                        .addTo(markersLayer)
                        .bindPopup(`<b>${w.name}</b><br>Assigned Area: ${w.assigned_area}<br>Active Queue: <b>${w.active_tasks_count} tasks</b><br>Phone: ${w.phone}`);
                }
            });

            // Complaints
            complaints.forEach(c => {
                const cIcon = L.divIcon({
                    className: "complaint-icon",
                    html: `<div style="background:#dc2626; color:white; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3);">📍</div>`,
                    iconSize: [26, 26]
                });

                L.marker([c.latitude, c.longitude], { icon: cIcon })
                    .addTo(markersLayer)
                    .bindPopup(`<b>${c.request_code}</b> (${c.priority})<br>${c.description}<br>Status: <b>${c.status}</b>`);
            });

            // Routes
            routes.forEach(r => {
                if (r.waypoints && r.waypoints.length > 1) {
                    L.polyline(r.waypoints, { color: "#059669", weight: 4, opacity: 0.75, dashArray: "4, 6" })
                        .addTo(routesLayer)
                        .bindTooltip(`🚛 ${r.route_name}`);
                }
            });

            // Update KPI
            const kpiBins = document.getElementById("kpiBinsCount");
            const kpiWorkers = document.getElementById("kpiWorkersCount");
            if (kpiBins) kpiBins.textContent = `${bins.length} Units`;
            if (kpiWorkers) kpiWorkers.textContent = `${workers.length} On Duty`;
        } catch (e) {
            console.warn("Map data error:", e.message);
        }
    }

    async function loadAreaAnalytics() {
        try {
            const res = await authFetch(`${API_BASE}/api/waste/control-center/area-analytics`);
            const data = await res.json();
            if (!res.ok || !data.wards) return;

            const tbody = document.getElementById("ccWardAnalyticsTbody");
            if (!tbody) return;

            tbody.innerHTML = data.wards.map(w => `
                <tr>
                    <td><strong>Ward ${w.ward_number}</strong><br><small style="color:#64748b;">${w.ward_name}</small></td>
                    <td><b>${w.population.toLocaleString('en-IN')}</b></td>
                    <td>${w.daily_waste_estimated_tons} T</td>
                    <td><b style="color:#059669;">${w.daily_waste_collected_tons} T</b></td>
                    <td>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <div style="flex:1; height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
                                <div style="width:${w.collection_efficiency_pct}%; height:100%; background:#10b981;"></div>
                            </div>
                            <span style="font-weight:700;">${w.collection_efficiency_pct}%</span>
                        </div>
                    </td>
                </tr>
            `).join("");

            if (data.summary) {
                const kpiWaste = document.getElementById("kpiWasteTons");
                const kpiEff = document.getElementById("kpiEfficiency");
                if (kpiWaste) kpiWaste.textContent = `${data.summary.total_daily_waste_estimated_tons} Tons`;
                if (kpiEff) kpiEff.textContent = `${data.summary.citywide_collection_efficiency_pct}%`;
            }
        } catch (e) {
            console.warn("Area analytics error:", e.message);
        }
    }

    async function loadComplaints() {
        try {
            const res = await authFetch(`${API_BASE}/api/waste/control-center/complaints`);
            const data = await res.json();
            if (!res.ok || !data.complaints) return;

            allComplaints = data.complaints;
            const tbody = document.getElementById("ccComplaintsTbody");
            const kpiComp = document.getElementById("kpiComplaintsCount");

            const pending = allComplaints.filter(t => !["Resolved", "Completed"].includes(t.status));
            if (kpiComp) kpiComp.textContent = `${pending.length} Pending`;

            if (!tbody) return;

            tbody.innerHTML = allComplaints.map(c => {
                const prioClass = `prio-${(c.priority || 'medium').toLowerCase()}`;
                const isUnderVerif = c.status === "Under Verification";
                const isCompleted = c.status === "Completed" || c.status === "Resolved";

                return `
                    <tr>
                        <td>
                            <strong>${c.request_code}</strong><br>
                            <small style="color:#64748b;">${c.address}</small>
                        </td>
                        <td><span class="prio-pill ${prioClass}">${c.priority}</span></td>
                        <td>${c.category}</td>
                        <td>${c.assigned_worker_name ? `👷 ${c.assigned_worker_name}` : '<span style="color:#dc2626; font-weight:700;">Unassigned</span>'}</td>
                        <td>
                            ${isCompleted ? '<span style="color:#059669; font-weight:800;">✓ Done</span>' : `
                                <button class="btn btn-sm green-btn" onclick="openAIRecommendModal(${c.id})" style="font-size:11px; padding:4px 8px;">
                                    🤖 AI Assign
                                </button>
                            `}
                        </td>
                    </tr>
                `;
            }).join("");

            loadProofVerificationDesk();
        } catch (e) {
            console.warn("Complaints load error:", e.message);
        }
    }

    function loadProofVerificationDesk() {
        const container = document.getElementById("ccProofCardsContainer");
        if (!container) return;

        const underVerifTasks = allComplaints.filter(t => t.status === "Under Verification" && t.proof);

        if (underVerifTasks.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; background: #ffffff; padding: 24px; text-align: center; border-radius: 12px; border: 1px dashed #cbd5e1; color: #64748b;">
                    ✓ All submitted collection proofs have been verified. No pending items in review queue.
                </div>
            `;
            return;
        }

        container.innerHTML = underVerifTasks.map(t => `
            <div class="proof-card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <strong style="color:#0f172a;">${t.request_code}</strong>
                    <span class="prio-pill prio-high">UNDER VERIFICATION</span>
                </div>
                <div style="font-size:12px; color:#475569; margin-bottom:10px;">
                    📍 ${t.address}<br>
                    👷 Worker: <b>${t.assigned_worker_name}</b><br>
                    ⚖️ Collected Waste Weight: <b>${t.proof.waste_weight_kg || 42.5} kg</b>
                </div>

                <!-- Before & After Comparison -->
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:12px;">
                    <div>
                        <small style="display:block; font-size:10px; font-weight:700; color:#64748b;">BEFORE IMAGE</small>
                        <div style="height:90px; background:#f1f5f9; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:24px; border:1px solid #cbd5e1;">📸</div>
                    </div>
                    <div>
                        <small style="display:block; font-size:10px; font-weight:700; color:#059669;">CLEARED PROOF (AFTER)</small>
                        <div style="height:90px; background:#ecfdf5; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:24px; border:1px solid #a7f3d0;">✨</div>
                    </div>
                </div>

                <div style="font-size:11px; background:#f8fafc; padding:6px 10px; border-radius:6px; margin-bottom:12px; color:#334155;">
                    💬 <i>"${t.proof.remarks || 'Cleaned and cleared per municipal protocol.'}"</i>
                </div>

                <div style="display:flex; gap:8px;">
                    <button class="btn btn-sm green-btn" onclick="verifyProof(${t.id}, 'APPROVED')" style="flex:1;">
                        ✓ Approve &amp; Complete
                    </button>
                    <button class="btn btn-sm red-btn" onclick="verifyProof(${t.id}, 'REJECTED')" style="flex:1;">
                        ✕ Reject
                    </button>
                </div>
            </div>
        `).join("");
    }

    // -------------------------------------------------------------------------
    // 3. AI RECOMMENDATION MODAL & ASSIGNMENT
    // -------------------------------------------------------------------------
    window.openAIRecommendModal = async function (complaintId) {
        const modal = document.getElementById("ccAssignmentModal");
        const body = document.getElementById("assignmentModalContent");
        if (!modal || !body) return;

        body.innerHTML = `<div style="text-align:center; padding:30px;"><div class="sc-spinner"></div><p style="margin-top:12px; font-size:13px; color:#64748b;">Running multi-factor AI scoring algorithm...</p></div>`;
        modal.style.display = "flex";

        try {
            const res = await authFetch(`${API_BASE}/api/waste/control-center/ai-recommend-worker`, {
                method: "POST",
                body: JSON.stringify({ complaintId })
            });

            const data = await res.json();
            if (!res.ok || !data.recommended_worker) {
                body.innerHTML = `<p style="color:#dc2626;">Error: ${data.message || 'Unable to calculate worker recommendation.'}</p>`;
                return;
            }

            currentRecommendData = { complaintId, ...data };
            const rec = data.recommended_worker;
            const sb = rec.score_breakdown;

            body.innerHTML = `
                <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:10px; padding:16px; margin-bottom:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <span style="font-size:11px; background:#059669; color:white; padding:2px 8px; border-radius:6px; font-weight:800;">TOP AI MATCH</span>
                            <h4 style="margin:4px 0 0 0; font-size:16px; color:#064e3b;">${rec.name}</h4>
                            <p style="margin:2px 0 0 0; font-size:12px; color:#047857;">${rec.assigned_area} • ${rec.phone}</p>
                        </div>
                        <div style="text-align:right;">
                            <span style="font-size:26px; font-weight:900; color:#059669;">${sb.composite_score}</span>
                            <small style="display:block; font-size:10px; color:#64748b;">/ 100 PTS</small>
                        </div>
                    </div>

                    <!-- Transparent Factor Scoring Bars -->
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap:10px; margin-top:14px; background:white; padding:10px; border-radius:8px;">
                        <div>
                            <small style="display:block; font-size:10px; color:#64748b;">DISTANCE (30%)</small>
                            <strong style="color:#0f172a;">${rec.distance_km} km (${sb.distance_score} pts)</strong>
                        </div>
                        <div>
                            <small style="display:block; font-size:10px; color:#64748b;">WORKLOAD (25%)</small>
                            <strong style="color:#0f172a;">${rec.current_active_tasks} tasks (${sb.workload_score} pts)</strong>
                        </div>
                        <div>
                            <small style="display:block; font-size:10px; color:#64748b;">AVAILABILITY (20%)</small>
                            <strong style="color:#059669;">100% On Duty</strong>
                        </div>
                        <div>
                            <small style="display:block; font-size:10px; color:#64748b;">SKILL MATCH (15%)</small>
                            <strong style="color:#2563eb;">${sb.skill_score} pts</strong>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom:16px;">
                    <label style="font-size:12px; font-weight:700; color:#334155; display:block; margin-bottom:6px;">OR MANUALLY OVERRIDE ASSIGNMENT:</label>
                    <select id="manualWorkerSelect" class="form-control" style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid #cbd5e1; font-weight:600;">
                        ${data.candidate_rankings.map(c => `
                            <option value="${c.worker_id}" ${c.worker_id === rec.worker_id ? 'selected' : ''}>
                                Rank #${c.recommendation_rank}: ${c.name} (${c.score_breakdown.composite_score} pts • ${c.distance_km} km • ${c.current_active_tasks} tasks)
                            </option>
                        `).join("")}
                    </select>
                </div>

                <div style="margin-bottom:16px;">
                    <label style="font-size:12px; font-weight:700; color:#334155; display:block; margin-bottom:6px;">DISPATCH REASON / AUDIT NOTE:</label>
                    <input type="text" id="assignmentAuditReason" class="form-control" value="AI optimal match accepted by Control Center" style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid #cbd5e1;">
                </div>

                <div style="display:flex; justify-content:flex-end; gap:10px;">
                    <button class="btn btn-sm outline-btn" onclick="closeAssignmentModal()">Cancel</button>
                    <button class="btn btn-sm green-btn" onclick="confirmWorkerAssignment()">
                        Confirm &amp; Dispatch Worker
                    </button>
                </div>
            `;
        } catch (e) {
            body.innerHTML = `<p style="color:#dc2626;">Error: ${e.message}</p>`;
        }
    };

    window.closeAssignmentModal = function () {
        const modal = document.getElementById("ccAssignmentModal");
        if (modal) modal.style.display = "none";
    };

    window.confirmWorkerAssignment = async function () {
        if (!currentRecommendData) return;
        const workerSelect = document.getElementById("manualWorkerSelect");
        const reasonInput = document.getElementById("assignmentAuditReason");

        const workerId = Number(workerSelect?.value || currentRecommendData.recommended_worker.worker_id);
        const reason = reasonInput?.value || "Assigned via Control Center";
        const isAI = (workerId === currentRecommendData.recommended_worker.worker_id);

        try {
            const res = await authFetch(`${API_BASE}/api/waste/control-center/assign-complaint`, {
                method: "POST",
                body: JSON.stringify({
                    complaintId: currentRecommendData.complaintId,
                    workerId,
                    assignmentType: isAI ? "AI_AUTOMATIC" : "MANUAL",
                    reason
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                showToast(`✅ Complaint assigned successfully to worker #${workerId}!`);
                closeAssignmentModal();
                loadComplaints();
                refreshMapData();
            } else {
                showToast(`❌ Error: ${data.message}`, true);
            }
        } catch (e) {
            showToast("Error confirming assignment.", true);
        }
    };

    window.verifyProof = async function (complaintId, decision) {
        let rejectionReason = "";
        if (decision === "REJECTED") {
            rejectionReason = prompt("Please provide reason for rejecting this collection proof (sent to worker for correction):", "Photo evidence unclear or waste remains on curbside.");
            if (!rejectionReason) return;
        }

        try {
            const res = await authFetch(`${API_BASE}/api/waste/control-center/verify-proof`, {
                method: "POST",
                body: JSON.stringify({
                    complaintId,
                    decision,
                    rejectionReason,
                    remarks: decision === "APPROVED" ? "Inspected and verified by Control Center Officer." : rejectionReason
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                showToast(decision === "APPROVED" ? "✅ Collection proof verified and task completed!" : "⚠️ Proof rejected and returned to worker for correction.");
                loadComplaints();
                refreshMapData();
            } else {
                showToast(`❌ Verification failed: ${data.message}`, true);
            }
        } catch (e) {
            showToast("Error processing verification decision.", true);
        }
    };

    window.logoutControlCenter = function () {
        localStorage.removeItem("smartCityJWT");
        localStorage.removeItem("smartCityCurrentUser");
        window.location.href = "waste.html";
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();

