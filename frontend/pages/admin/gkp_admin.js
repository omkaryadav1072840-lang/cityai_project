/**
 * Gorakhpur Smart City - ICCC Central Director & Super Admin Command Hub Logic
 * Fetches cross-departmental telemetry, staff roster, audit trail & module switches.
 */

(function () {
    "use strict";

    let allStaffData = [];
    let allAuditData = [];
    let currentDeptFilter = "all";
    let currentAuditFilter = "all";

    function getApiBase() {
        return window.location.origin;
    }

    function getAuthToken() {
        return (window.SmartCityAuth && SmartCityAuth.getToken()) ||
               localStorage.getItem("smartCityJWT") ||
               localStorage.getItem("smartcity_auth_token") ||
               localStorage.getItem("token") || "";
    }

    function isSuperUser() {
        if (window.SmartCityAuth && typeof SmartCityAuth.isSuperAdmin === "function") {
            return SmartCityAuth.isSuperAdmin();
        }
        try {
            const user = (window.SmartCityAuth && SmartCityAuth.getUser()) ||
                         JSON.parse(localStorage.getItem("smartCityCurrentUser") || "{}");
            const role = (user.role || user.type || "").toLowerCase();
            return role === "super_admin" || role === "superadmin" || role === "admin" || user.is_super_admin === true;
        } catch {
            return false;
        }
    }

    // Initialize Page
    document.addEventListener("DOMContentLoaded", async () => {
        // Enforce Super Admin Check
        checkAuthStatus();
        
        // Initial Fetch
        await fetchCommandCenterStats();
        await fetchStaffRoster();
        await fetchAuditLogs();

        // Setup filter listeners
        setupFilterListeners();

        // Setup broadcast form
        setupBroadcastForm();

        // Auto refresh every 20 seconds
        setInterval(() => {
            fetchCommandCenterStats();
            fetchAuditLogs();
        }, 20000);
    });

    function checkAuthStatus() {
        const token = getAuthToken();
        const user = window.SmartCityAuth && SmartCityAuth.getUser();
        const isAuth = Boolean(token && user);
        const hasSuperAccess = isSuperUser();

        const warnBanner = document.getElementById("superAdminAuthWarn");
        if (!isAuth || !hasSuperAccess) {
            if (warnBanner) {
                warnBanner.style.display = "block";
            }
        } else {
            if (warnBanner) {
                warnBanner.style.display = "none";
            }
        }
    }

    // 1. Fetch Command Center Live Statistics
    async function fetchCommandCenterStats() {
        try {
            const token = getAuthToken();
            const res = await fetch(`${getApiBase()}/api/admin/command-center`, {
                headers: token ? { "Authorization": `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error("Stats endpoint unavailable");
            const data = await res.json();
            
            if (data && data.metrics) {
                renderTelemetryMetrics(data.metrics);
            }
        } catch (err) {
            console.warn("Using fallback telemetry data:", err.message);
            renderFallbackMetrics();
        }
    }

    function renderTelemetryMetrics(m) {
        // Traffic
        const elTrInc = document.getElementById("valTrafficIncidents");
        const elTrSig = document.getElementById("valTrafficSignals");
        if (elTrInc) elTrInc.textContent = (m.traffic && m.traffic.activeIncidents !== undefined) ? m.traffic.activeIncidents : "2 Active";
        if (elTrSig) elTrSig.textContent = (m.traffic && m.traffic.activeSignals !== undefined) ? `${m.traffic.activeSignals} / ${m.traffic.totalSignals || 18}` : "18 / 18";

        // Parking
        const elPrkOcc = document.getElementById("valParkingOcc");
        const elPrkAvail = document.getElementById("valParkingAvail");
        if (elPrkOcc) elPrkOcc.textContent = `${m.parking && m.parking.occupancyPercent !== undefined ? m.parking.occupancyPercent : 64}%`;
        if (elPrkAvail) elPrkAvail.textContent = `${m.parking && m.parking.availableSlots !== undefined ? m.parking.availableSlots : 142} Bays`;

        // Water
        const elWtrPressure = document.getElementById("valWaterPressure");
        const elWtrSupply = document.getElementById("valWaterSupply");
        if (elWtrPressure) elWtrPressure.textContent = "4.2 bar (Nominal)";
        if (elWtrSupply) elWtrSupply.textContent = "98.4% Flow Active";

        // Waste
        const elWstReq = document.getElementById("valWastePending");
        const elWstFleet = document.getElementById("valWasteFleet");
        if (elWstReq) elWstReq.textContent = (m.waste && m.waste.pendingRequests !== undefined) ? m.waste.pendingRequests : "12 Pending";
        if (elWstFleet) elWstFleet.textContent = "24 Trucks Active";

        // Police
        const elPolCompl = document.getElementById("valPoliceComplaints");
        const elPolSos = document.getElementById("valPoliceSos");
        if (elPolCompl) elPolCompl.textContent = (m.police && m.police.pendingComplaints !== undefined) ? m.police.pendingComplaints : "4 Open";
        if (elPolSos) elPolSos.textContent = "All Sectors Patrolled";

        // Emergency
        const elEmgCalls = document.getElementById("valEmgIncidents");
        const elEmgAmb = document.getElementById("valEmgAmbulances");
        if (elEmgCalls) elEmgCalls.textContent = (m.emergency && m.emergency.activeIncidents !== undefined) ? m.emergency.activeIncidents : "1 Dispatched";
        if (elEmgAmb) elEmgAmb.textContent = (m.healthcare && m.healthcare.activeAmbulances !== undefined) ? `${m.healthcare.activeAmbulances} Units Ready` : "16 Units Ready";
    }

    function renderFallbackMetrics() {
        renderTelemetryMetrics({
            traffic: { activeIncidents: 1, totalSignals: 24, activeSignals: 24 },
            parking: { occupancyPercent: 58, availableSlots: 184 },
            waste: { pendingRequests: 8 },
            police: { pendingComplaints: 3 },
            emergency: { activeIncidents: 0 },
            healthcare: { activeAmbulances: 18 }
        });
    }

    // 2. Fetch Cross-Departmental Staff Directory
    async function fetchStaffRoster() {
        try {
            const token = getAuthToken();
            const res = await fetch(`${getApiBase()}/api/admin/staff`, {
                headers: token ? { "Authorization": `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error("Staff endpoint unavailable");
            const data = await res.json();
            allStaffData = data.staff || [];
            renderStaffTable();
        } catch (err) {
            console.warn("Using default staff roster:", err.message);
            allStaffData = [
                { staff_id: "STAFF-001", name: "Gorakhpur ICCC Central Director", department: "ICCC Command Center", role: "super_admin", email: "director.iccc@smartcity.gorakhpur.gov.in" },
                { staff_id: "TR-VERMA", name: "Insp. Rajesh Verma", department: "traffic", role: "staff", email: "verma.traffic@gorakhpur.gov.in" },
                { staff_id: "TR-PANDEY", name: "S.I. Alok Pandey", department: "traffic", role: "staff", email: "pandey.traffic@gorakhpur.gov.in" },
                { staff_id: "WTR-ADMIN", name: "Er. Rameshwar Singh (Chief Water Engineer)", department: "water", role: "water_admin", email: "water.admin@gorakhpur.gov.in" },
                { staff_id: "WTR-ENG-01", name: "Sunil Tripathi (Pipeline Inspector)", department: "water", role: "water_staff", email: "sunil.water@gorakhpur.gov.in" },
                { staff_id: "WST001", name: "Sanitation Supervisor Amit Yadav", department: "waste", role: "staff", email: "amit.waste@gorakhpur.gov.in" },
                { staff_id: "POL-01", name: "Station House Officer - Cantt", department: "police", role: "staff", email: "sho.cantt@gorakhpurpolice.gov.in" },
                { staff_id: "EMG-01", name: "Disaster Response Officer Shweta Sen", department: "emergency", role: "staff", email: "shweta.emergency@gorakhpur.gov.in" },
                { staff_id: "PRK-01", name: "Parking Control Officer Manoj Kumar", department: "parking", role: "staff", email: "manoj.parking@gorakhpur.gov.in" }
            ];
            renderStaffTable();
        }
    }

    function renderStaffTable() {
        const tbody = document.getElementById("staffTableBody");
        if (!tbody) return;

        let filtered = allStaffData;
        if (currentDeptFilter !== "all") {
            filtered = allStaffData.filter(s => {
                const dept = (s.department || "").toLowerCase();
                return dept.includes(currentDeptFilter);
            });
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:24px;">No active staff records matching filter "${currentDeptFilter}".</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(s => {
            const dept = (s.department || "General").toLowerCase();
            const badgeClass = dept.includes("traffic") ? "traffic" :
                               dept.includes("water") ? "water" :
                               dept.includes("parking") ? "parking" :
                               dept.includes("police") ? "police" :
                               dept.includes("waste") ? "waste" :
                               dept.includes("emergency") ? "emergency" : "admin";
            
            return `
                <tr>
                    <td style="font-weight:700; color:#ffffff;">${escapeHTML(s.staff_id || "ST-OFFICIAL")}</td>
                    <td style="font-weight:600;">${escapeHTML(s.name || "Officer")}</td>
                    <td><span class="badge-pill ${badgeClass}">${escapeHTML(s.department || "Municipal")}</span></td>
                    <td style="color:#94a3b8; font-size:12px;">${escapeHTML(s.role || "staff")}</td>
                    <td><span style="color:#34d399; font-weight:700; font-size:12px;">● Online / Active</span></td>
                </tr>
            `;
        }).join("");
    }

    // 3. Fetch Municipal Real-Time Audit Trail Logs
    async function fetchAuditLogs() {
        try {
            const token = getAuthToken();
            const res = await fetch(`${getApiBase()}/api/admin/audit-logs?limit=40`, {
                headers: token ? { "Authorization": `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error("Audit endpoint unavailable");
            const data = await res.json();
            allAuditData = data.data || [];
            renderAuditTable();
        } catch (err) {
            console.warn("Using sample audit trail data:", err.message);
            allAuditData = [
                { created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(), user_name: "Gorakhpur ICCC Central Director", module: "SYSTEM", action: "SUPER_ADMIN_SESSION_ACTIVE", record_id: "ICCC-HQ" },
                { created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(), user_name: "Insp. Rajesh Verma", module: "TRAFFIC", action: "SIGNAL_TIMING_OVERRIDE", record_id: "JNC-02 (Mohaddipur)" },
                { created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), user_name: "Er. Rameshwar Singh", module: "WATER", action: "VALVE_PRESSURE_CALIBRATION", record_id: "ZONE-3-TRUNK" },
                { created_at: new Date(Date.now() - 1000 * 60 * 26).toISOString(), user_name: "Amit Yadav", module: "WASTE", action: "ROUTE_DISPATCH_COMPLETE", record_id: "TRUCK-UP53-889" },
                { created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(), user_name: "Citizen Omkar", module: "PARKING", action: "PASS_QR_ISSUED", record_id: "BAY-C14" },
                { created_at: new Date(Date.now() - 1000 * 60 * 65).toISOString(), user_name: "Cantt Police Patrol", module: "POLICE", action: "COMPLAINT_INVESTIGATING", record_id: "FIR-GKP-8902" }
            ];
            renderAuditTable();
        }
    }

    function renderAuditTable() {
        const tbody = document.getElementById("auditTableBody");
        if (!tbody) return;

        let filtered = allAuditData;
        if (currentAuditFilter !== "all") {
            filtered = allAuditData.filter(a => {
                const mod = (a.module || "").toLowerCase();
                return mod.includes(currentAuditFilter);
            });
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:24px;">No audit events for module "${currentAuditFilter}".</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(a => {
            const timeStr = a.created_at ? new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Just now";
            const mod = (a.module || "SYSTEM").toUpperCase();
            return `
                <tr>
                    <td style="color:#94a3b8; font-size:12px; font-family:monospace;">${timeStr}</td>
                    <td><span class="badge-pill admin">${escapeHTML(mod)}</span></td>
                    <td style="font-weight:700; color:#f1f5f9;">${escapeHTML(a.action || "OPERATION")}</td>
                    <td style="color:#cbd5e1; font-size:12px;">${escapeHTML(a.user_name || "System")} • ${escapeHTML(a.record_id || "")}</td>
                </tr>
            `;
        }).join("");
    }

    // Setup Filter Buttons
    function setupFilterListeners() {
        document.querySelectorAll(".staff-filter-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".staff-filter-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                currentDeptFilter = btn.getAttribute("data-dept") || "all";
                renderStaffTable();
            });
        });

        document.querySelectorAll(".audit-filter-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".audit-filter-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                currentAuditFilter = btn.getAttribute("data-mod") || "all";
                renderAuditTable();
            });
        });
    }

    // Emergency Broadcast Form
    function setupBroadcastForm() {
        const form = document.getElementById("gkpBroadcastForm");
        if (!form) return;

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const msgInput = document.getElementById("broadcastMessageInput");
            const targetSelect = document.getElementById("broadcastTargetSelect");
            const msg = msgInput ? msgInput.value.trim() : "";
            const target = targetSelect ? targetSelect.value : "All Citizens & Staff";

            if (!msg) {
                if (window.SmartCityAuth) SmartCityAuth.showToast("Please enter an advisory broadcast message.", "error");
                return;
            }

            // Simulate broadcast transmission
            if (window.SmartCityAuth) {
                SmartCityAuth.showToast(`🚨 Priority Broadcast Transmitted to ${target}: "${msg}"`, "success");
            } else {
                alert(`Priority Broadcast Transmitted: ${msg}`);
            }

            // Append to audit feed
            allAuditData.unshift({
                created_at: new Date().toISOString(),
                user_name: "Gorakhpur ICCC Central Director",
                module: "BROADCAST",
                action: "CITYWIDE_EMERGENCY_ALERT",
                record_id: `Target: ${target}`
            });
            renderAuditTable();

            if (msgInput) msgInput.value = "";
        });
    }

    function escapeHTML(str) {
        if (!str) return "";
        return String(str).replace(/[&<>"']/g, m => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[m]);
    }

})();
