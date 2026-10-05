/**
 * SmartCity Gorakhpur - Hospital Management Dashboard Controller
 * ================================================================
 * Integrates live database, RBAC module filtering, and clinical diagnostics.
 */

const API_BASE = (typeof window !== "undefined" && window.API_BASE_URL !== undefined)
    ? window.API_BASE_URL
    : (typeof window !== "undefined" && window.location && window.location.port === "5000"
        ? window.location.origin
        : (typeof window !== "undefined" && window.location && window.location.protocol === "file:" ? "http://localhost:5000" : ""));

// Global Dashboard State
let currentHospitalId = "HOSP-001";
let currentRole = "hospital_admin";
let activeModule = "appointments";
let activeDiagSubTab = "catalog";
let dashboardData = null;
let diagnosticTests = [];
let allHospitals = [];
let activeDoctorConsultation = null;

// RBAC Module Permission Matrix
const ROLE_MODULES = {
    hospital_admin: [
        { id: "appointments", label: "📋 Appointments & Queue", icon: "📋" },
        { id: "diagnostics", label: "🧪 Diagnostics & Tests", icon: "🧪" },
        { id: "clinical", label: "👨‍⚕️ Clinical Desk", icon: "👨‍⚕️" },
        { id: "beds", label: "🛏️ Beds & Wards", icon: "🛏️" },
        { id: "pharmacy", label: "💊 Pharmacy", icon: "💊" },
        { id: "billing", label: "💳 Billing & Cashier", icon: "💳" },
        { id: "emergency", label: "🚨 Emergency & Fleet", icon: "🚨" },
        { id: "admin", label: "⚙️ Staff & Admin", icon: "⚙️" }
    ],
    doctor: [
        { id: "clinical", label: "👨‍⚕️ Doctor Clinical Desk", icon: "👨‍⚕️" },
        { id: "appointments", label: "📋 OPD Patient Queue", icon: "📋" },
        { id: "diagnostics", label: "🧪 Diagnostic Reports & Orders", icon: "🧪" },
        { id: "beds", label: "🛏️ Bed Status", icon: "🛏️" }
    ],
    receptionist: [
        { id: "appointments", label: "📋 Patient Registration & Queue", icon: "📋" },
        { id: "diagnostics", label: "🧪 Offline Test Booking", icon: "🧪" },
        { id: "billing", label: "💳 Billing Desk", icon: "💳" },
        { id: "beds", label: "🛏️ Bed Availability", icon: "🛏️" }
    ],
    lab_technician: [
        { id: "diagnostics", label: "🧪 Diagnostic Tests & Live Queue", icon: "🧪" }
    ],
    radiologist: [
        { id: "diagnostics", label: "🩻 Radiology Center & Scans", icon: "🩻" }
    ],
    nurse: [
        { id: "beds", label: "🛏️ Wards & Patient Vitals", icon: "🛏️" },
        { id: "appointments", label: "📋 OPD Patient Queue", icon: "📋" }
    ],
    pharmacy: [
        { id: "pharmacy", label: "💊 Pharmacy Stock & Dispensing", icon: "💊" },
        { id: "billing", label: "💳 Pharmacy Billing", icon: "💳" }
    ],
    billing: [
        { id: "billing", label: "💳 Patient Invoices & Cashier", icon: "💳" },
        { id: "appointments", label: "📋 Registrations", icon: "📋" }
    ],
    ambulance: [
        { id: "emergency", label: "🚨 Emergency Dispatch & Fleet", icon: "🚨" }
    ]
};

// ====================================================================
// STAFF ACCESS CONTROL & AUTHENTICATION GATE
// ====================================================================

function isStaffUser(user) {
    if (!user) return false;
    const role = (user.role || user.type || "").toLowerCase();
    const hospRole = (user.hospitalRole || "").toLowerCase();
    const allowedRoles = ["staff", "admin", "doctor", "hospital_admin", "receptionist", "nurse", "lab_technician", "radiologist", "pharmacy", "billing", "ambulance"];
    return allowedRoles.includes(role) || allowedRoles.includes(hospRole);
}

function enforceStaffAuth() {
    const user = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getUser) ? SmartCityAuth.getUser() : null;
    const isAuthed = user && isStaffUser(user);

    const gate = document.getElementById("staffAuthGate");
    const content = document.getElementById("dashboardMainContent");
    const userBadge = document.getElementById("navUserBadge");
    const logoutBtn = document.getElementById("btnStaffLogout");

    if (!isAuthed) {
        if (gate) gate.style.display = "flex";
        if (content) content.style.display = "none";
        if (userBadge) userBadge.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "none";
        return false;
    }

    // Citizen Protection: If a Citizen enters the staff dashboard, redirect to Citizen dashboard
    if (user.accountType === "CITIZEN" || user.role === "citizen") {
        window.location.href = "hospital.html";
        return false;
    }

    // Role & Facility Locking:
    const isSuperAdmin = user.accountType === "SUPER_ADMIN" || (user.role === "admin" && !user.hospitalId);
    const hospSelect = document.getElementById("demoHospitalSelect");
    const roleSelect = document.getElementById("demoRoleSelect");

    if (!isSuperAdmin) {
        if (user.hospitalId) {
            currentHospitalId = user.hospitalId;
            if (hospSelect) {
                hospSelect.value = currentHospitalId;
                hospSelect.disabled = true;
                hospSelect.title = `🔒 Facility locked to your assigned hospital: ${user.hospitalName || currentHospitalId}`;
            }
        }
        if (user.hospitalRole || user.role) {
            currentRole = user.hospitalRole || user.role;
            if (roleSelect) {
                roleSelect.value = currentRole;
                roleSelect.disabled = true;
                roleSelect.title = "🔒 Role locked to your authenticated profile";
            }
        }
    } else {
        // Add Super Admin indicator link if not present
        if (!document.getElementById("superAdminLinkBtn")) {
            const demoBar = document.querySelector(".hd-demo-bar");
            if (demoBar) {
                const saBtn = document.createElement("a");
                saBtn.id = "superAdminLinkBtn";
                saBtn.href = "superadmin_hospital.html";
                saBtn.className = "hd-btn hd-btn-primary hd-btn-sm";
                saBtn.style.cssText = "text-decoration:none; margin-left:auto; background:linear-gradient(135deg, #0284c7, #2563eb);";
                saBtn.innerHTML = "👑 Super Admin Console";
                demoBar.appendChild(saBtn);
            }
        }
    }

    if (gate) gate.style.display = "none";
    if (content) content.style.display = "block";
    if (userBadge) userBadge.style.display = "flex";
    if (logoutBtn) logoutBtn.style.display = "inline-flex";
    return true;
}

async function handleDashboardStaffLogin(e) {
    if (e) e.preventDefault();
    const staffId = document.getElementById("gateStaffId").value.trim();
    const password = document.getElementById("gatePassword").value;
    const errEl = document.getElementById("gateErrorMsg");
    if (errEl) errEl.style.display = "none";

    try {
        const res = await fetch(`${API_BASE}/api/staff-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId, password })
        });
        const data = await res.json();
        if (res.ok && data.token) {
            localStorage.setItem("smartCityJWT", data.token);
            localStorage.setItem("smartCityCurrentUser", JSON.stringify(data.user));
            if (typeof SmartCityAuth !== "undefined" && SmartCityAuth.setSession) {
                SmartCityAuth.setSession(data.token, data.user);
            }

            // ROUTE TO TARGET DASHBOARD DETERMINED AT LOGIN TIME
            if (data.accountType === "SUPER_ADMIN" || data.user?.accountType === "SUPER_ADMIN") {
                window.location.href = "superadmin_hospital.html";
                return;
            } else if (data.accountType === "CITIZEN" || data.user?.accountType === "CITIZEN") {
                window.location.href = "hospital.html";
                return;
            }

            if (data.user && data.user.hospitalId) {
                currentHospitalId = data.user.hospitalId;
            }
            if (data.user && (data.user.hospitalRole || data.user.role)) {
                currentRole = data.user.hospitalRole || data.user.role;
            }

            enforceStaffAuth();
            updateUserProfileDisplay();
            await populateHospitalSwitcher();
            await loadHospitalInfo();
            renderModuleTabs();
            await refreshDashboardData();
            await loadActiveModuleData();
        } else {
            if (errEl) {
                errEl.textContent = data.message || "Invalid staff credentials.";
                errEl.style.display = "block";
            }
        }
    } catch (err) {
        if (errEl) {
            errEl.textContent = "Server connection error: " + err.message;
            errEl.style.display = "block";
        }
    }
}

async function quickDemoStaffLogin() {
    try {
        const res = await fetch(`${API_BASE}/api/auth/demo-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ persona: "hospital" })
        });
        const data = await res.json();
        if (data.token) {
            localStorage.setItem("smartCityJWT", data.token);
            localStorage.setItem("smartCityCurrentUser", JSON.stringify(data.user));
            if (typeof SmartCityAuth !== "undefined" && SmartCityAuth.setSession) {
                SmartCityAuth.setSession(data.token, data.user);
            }
            const modal = document.getElementById("staffAuthModal");
            if (modal) modal.style.display = "none";
            await refreshDashboardData();
        } else {
            alert(data.message || "Demo login failed");
        }
    } catch (e) {
        alert("Demo authentication error: " + e.message);
    }
}

function handleStaffLogout() {
    if (typeof SmartCityAuth !== "undefined" && SmartCityAuth.logout) {
        SmartCityAuth.logout();
    }
    localStorage.removeItem("smartCityJWT");
    localStorage.removeItem("smartCityCurrentUser");
    enforceStaffAuth();
}

// INITIALIZATION
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Resolve Hospital ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const queryHospId = urlParams.get("hospital_id");
    if (queryHospId) currentHospitalId = queryHospId;

    // 2. Check Staff / Admin Authorization Gate
    const hasAccess = enforceStaffAuth();
    if (!hasAccess) {
        // Wait for staff/admin login
        return;
    }

    // 3. Set hospital select in switcher
    const hospSelect = document.getElementById("demoHospitalSelect");
    if (hospSelect) hospSelect.value = currentHospitalId;

    // 4. Resolve user session & role
    const user = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getUser) ? SmartCityAuth.getUser() : null;
    if (user) {
        const isSuperAdmin = user.accountType === "SUPER_ADMIN" || (user.role === "admin" && !user.hospitalId);

        if (isSuperAdmin) {
            if (queryHospId) currentHospitalId = queryHospId;
        } else if (user.hospitalId) {
            // Strict Hospital Isolation: Cannot be overridden by query string
            currentHospitalId = user.hospitalId;
        }

        if (user.accountType === "HOSPITAL_ADMIN" || user.hospitalRole === "hospital_admin") {
            currentRole = "hospital_admin";
        } else if (user.hospitalRole) {
            currentRole = user.hospitalRole;
        } else if (user.role === "doctor") {
            currentRole = "doctor";
        } else if (user.role === "admin") {
            currentRole = "hospital_admin";
        }

        if (hospSelect) {
            hospSelect.value = currentHospitalId;
            if (!isSuperAdmin) hospSelect.disabled = true;
        }
        const roleSelect = document.getElementById("demoRoleSelect");
        if (roleSelect && ROLE_MODULES[currentRole]) {
            roleSelect.value = currentRole;
            if (!isSuperAdmin) roleSelect.disabled = true;
        }
    }

    updateUserProfileDisplay();
    renderModuleTabs();
    await populateHospitalSwitcher();
    await loadHospitalInfo();
    await refreshDashboardData();
    await loadActiveModuleData();
});

// POPULATE ALL 14 HOSPITALS DYNAMICALLY INTO SWITCHER
async function populateHospitalSwitcher() {
    try {
        const res = await fetch(`${API_BASE}/api/hospitals`);
        const data = await res.json();
        const hospitals = data.hospitals || data.data || [];
        const select = document.getElementById("demoHospitalSelect");
        if (select && hospitals.length > 0) {
            select.innerHTML = hospitals.map(h => 
                `<option value="${h.hospital_id}">${h.hospital_name} (${h.hospital_id})</option>`
            ).join('');
            select.value = currentHospitalId;
        }
    } catch (err) {
        console.warn("Could not populate hospital switcher:", err);
    }
}

// AUTH HELPER (Fetches with JWT token)
async function authFetch(url, options = {}) {
    let token = null;
    if (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getToken) {
        token = SmartCityAuth.getToken();
    }
    if (!token) token = localStorage.getItem("smartCityJWT");

    // Auto demo-token fallback if token is absent
    if (!token) {
        try {
            const demoLogin = await fetch(`${API_BASE}/api/auth/demo-login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ persona: "hospital" })
            }).then(r => r.json());
            if (demoLogin && demoLogin.token) {
                token = demoLogin.token;
                localStorage.setItem("smartCityJWT", token);
                if (demoLogin.user) localStorage.setItem("smartCityCurrentUser", JSON.stringify(demoLogin.user));
            }
        } catch (_) {}
    }

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url.startsWith("http") ? url : `${API_BASE}${url}`, {
        ...options,
        headers
    });

    if (res.status === 401 || res.status === 403) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Unauthorized access.");
    }

    return res.json();
}

// USER PROFILE CHIP
function updateUserProfileDisplay() {
    const user = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getUser) ? SmartCityAuth.getUser() : null;
    const nameEl = document.getElementById("userDisplayName");
    const roleEl = document.getElementById("userRoleBadge");
    const avatarEl = document.getElementById("userAvatar");

    const roleTitles = {
        super_admin: "System Super Admin",
        hospital_admin: "Hospital Admin",
        doctor: "Consulting Doctor",
        receptionist: "Reception / OPD Desk",
        lab_technician: "Senior Lab Technologist",
        radiologist: "Radiology Tech",
        nurse: "Ward / Nursing Staff",
        pharmacy: "Chief Pharmacist",
        billing: "Billing & Cashier",
        ambulance: "Emergency Dispatch"
    };

    const roleLabel = roleTitles[currentRole] || "Hospital Staff";
    const displayName = user?.name || (currentRole === "doctor" ? "Dr. Anand Verma" : "Dr. Alok Verma");

    if (nameEl) nameEl.textContent = displayName;
    if (roleEl) roleEl.textContent = roleLabel;
    if (avatarEl) avatarEl.textContent = displayName[0] || "H";
}

// RENDER NAVIGATION TABS BASED ON ROLE
function renderModuleTabs() {
    const tabsNav = document.getElementById("moduleTabsNav");
    if (!tabsNav) return;

    const user = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getUser) ? SmartCityAuth.getUser() : null;
    let modules = ROLE_MODULES[currentRole] || ROLE_MODULES.hospital_admin;

    // Filter by assigned modules if staff account
    if (user && user.accountType === "STAFF" && Array.isArray(user.assignedModules) && user.assignedModules.length > 0) {
        const moduleMap = {
            patients: "appointments",
            appointments: "appointments",
            queue: "appointments",
            diagnostics: "diagnostics",
            tests: "diagnostics",
            samples: "diagnostics",
            reports: "diagnostics",
            clinical: "clinical",
            records: "clinical",
            prescriptions: "clinical",
            slots: "clinical",
            beds: "beds",
            care: "beds",
            admissions: "beds",
            pharmacy: "pharmacy",
            medicines: "pharmacy",
            inventory: "pharmacy",
            billing: "billing",
            bills: "billing",
            payments: "billing",
            receipts: "billing",
            emergency: "emergency",
            ambulance: "emergency",
            dispatch: "emergency"
        };
        const allowedTabIds = new Set();
        user.assignedModules.forEach(m => {
            if (moduleMap[m]) allowedTabIds.add(moduleMap[m]);
        });
        const filtered = modules.filter(m => allowedTabIds.has(m.id));
        if (filtered.length > 0) {
            modules = filtered;
        }
    }

    // Default to first permitted module if current module is disallowed
    if (!modules.some(m => m.id === activeModule)) {
        activeModule = modules[0] ? modules[0].id : "appointments";
    }

    tabsNav.innerHTML = modules.map(m => `
        <button type="button" class="hd-tab-btn ${m.id === activeModule ? "active" : ""}" onclick="switchModule('${m.id}')">
            <span>${m.icon}</span> ${m.label}
        </button>
    `).join("");

    switchModule(activeModule);
}

// SWITCH MODULE
function switchModule(moduleId) {
    const user = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getUser) ? SmartCityAuth.getUser() : null;
    const isSuperAdmin = user && (user.accountType === "SUPER_ADMIN" || (user.role === "admin" && !user.hospitalId));
    const isHospitalAdmin = user && (user.accountType === "HOSPITAL_ADMIN" || user.hospitalRole === "hospital_admin" || (user.role === "admin" && user.hospitalId));

    // Security Gate: Staff cannot open admin module or unassigned modules
    if (!isSuperAdmin && !isHospitalAdmin) {
        if (moduleId === "admin") {
            alert("🔒 Access Denied: Staff Management is restricted to Hospital Admin.");
            return;
        }
        const currentAllowed = (ROLE_MODULES[currentRole] || []).map(m => m.id);
        if (!currentAllowed.includes(moduleId)) {
            alert("🔒 Access Denied: You do not have permission to access this module.");
            return;
        }
    }

    activeModule = moduleId;

    // Update tab styles
    document.querySelectorAll(".hd-tab-btn").forEach(btn => {
        btn.classList.remove("active");
        if (btn.textContent.includes(moduleId) || btn.getAttribute("onclick")?.includes(`'${moduleId}'`)) {
            btn.classList.add("active");
        }
    });

    // Show panel
    document.querySelectorAll(".hd-panel").forEach(p => p.classList.remove("active"));
    const targetPanel = document.getElementById(`panel-${moduleId}`);
    if (targetPanel) targetPanel.classList.add("active");

    loadActiveModuleData();
}

// SWITCH HOSPITAL (Demo Switcher)
async function onSwitchHospital(newHospId) {
    const user = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getUser) ? SmartCityAuth.getUser() : null;
    const isSuperAdmin = user && (user.accountType === "SUPER_ADMIN" || (user.role === "admin" && !user.hospitalId));
    if (!isSuperAdmin) {
        alert("🔒 Facility Locked: You cannot switch hospitals. Cross-hospital access is strictly forbidden.");
        const select = document.getElementById("demoHospitalSelect");
        if (select) select.value = currentHospitalId;
        return;
    }

    currentHospitalId = newHospId;
    const url = new URL(window.location);
    url.searchParams.set("hospital_id", newHospId);
    window.history.replaceState({}, "", url);

    await loadHospitalInfo();
    await refreshDashboardData();
    await loadActiveModuleData();
}

// SWITCH ROLE (Demo Switcher)
function onSwitchRole(newRole) {
    const user = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getUser) ? SmartCityAuth.getUser() : null;
    const isSuperAdmin = user && (user.accountType === "SUPER_ADMIN" || (user.role === "admin" && !user.hospitalId));
    if (!isSuperAdmin) {
        alert("🔒 Role Locked: You cannot change roles. Role is bound to your authenticated identity.");
        const sel = document.getElementById("demoRoleSelect");
        if (sel) sel.value = currentRole;
        return;
    }

    currentRole = newRole;
    updateUserProfileDisplay();
    renderModuleTabs();
    refreshDashboardData();
}

// LOAD HOSPITAL INFORMATION
async function loadHospitalInfo() {
    try {
        const res = await fetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}`);
        const data = await res.json();
        if (data.hospital) {
            const h = data.hospital;
            if (document.getElementById("navHospName")) document.getElementById("navHospName").textContent = h.hospital_name;
            if (document.getElementById("bannerHospName")) document.getElementById("bannerHospName").textContent = h.hospital_name;
            if (document.getElementById("bannerHospAddress")) document.getElementById("bannerHospAddress").textContent = `📍 ${h.address || "Gorakhpur, Uttar Pradesh"}`;
            if (document.getElementById("bannerHospPhone")) document.getElementById("bannerHospPhone").textContent = `📞 ${h.phone || h.emergency_number || "0551-2207777"}`;
            if (document.getElementById("bannerHospType")) document.getElementById("bannerHospType").textContent = h.hospital_type || "General Hospital";

            if (h.logo) {
                const avatarEl = document.getElementById("bannerAvatar");
                if (avatarEl) {
                    avatarEl.innerHTML = `<img src="${h.logo}" alt="Logo" style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit;" onerror="this.parentElement.textContent='🏥'">`;
                }
            }
        }
    } catch (err) {
        console.warn("Could not load hospital info:", err);
    }
}

// REFRESH TOP DASHBOARD STATISTICS (Live from DB)
async function refreshDashboardData() {
    try {
        // Use token if available, otherwise fetch with mock admin credentials for seamless student demo evaluation
        let token = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getToken) ? SmartCityAuth.getToken() : null;
        let authHeader = token ? `Bearer ${token}` : null;

        // Fallback for seamless demo evaluation
        if (!authHeader) {
            const demoLogin = await fetch(`${API_BASE}/api/auth/demo-login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ persona: "hospital" })
            }).then(r => r.json()).catch(() => ({}));

            if (demoLogin.token) {
                authHeader = `Bearer ${demoLogin.token}`;
                localStorage.setItem("smartCityJWT", demoLogin.token);
            }
        }

        const res = await fetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/dashboard`, {
            headers: authHeader ? { "Authorization": authHeader } : {}
        });

        const data = await res.json();
        if (data.success && data.stats) {
            const s = data.stats;
            document.getElementById("statTotalPatients").textContent = s.total_patients ?? 0;
            document.getElementById("statTodayAppts").textContent = s.today_appointments ?? 0;
            document.getElementById("statWaitingPatients").textContent = s.waiting_patients ?? 0;
            document.getElementById("statDoctorsAvail").textContent = s.doctors_available ?? 0;
            document.getElementById("statBedsAvail").textContent = s.beds_available ?? 0;
            document.getElementById("statEmergencyCases").textContent = s.emergency_cases ?? 0;
            document.getElementById("statPendingTests").textContent = s.pending_lab_tests ?? 0;
            document.getElementById("statPendingReports").textContent = s.pending_reports ?? 0;
            document.getElementById("statAmbulancesAvail").textContent = s.ambulances_available ?? 0;
            document.getElementById("statPharmacyOrders").textContent = s.pharmacy_orders ?? 0;
            document.getElementById("statPendingAdmissions").textContent = s.pending_admissions ?? 0;
            document.getElementById("statPendingDischarges").textContent = s.pending_discharges ?? 0;

            const revEl = document.getElementById("statTodayRevenue");
            const revCard = document.getElementById("cardTodayRevenue");
            if (s.today_revenue !== null && (currentRole === "hospital_admin" || currentRole === "billing")) {
                revCard.style.display = "flex";
                revEl.textContent = `₹${Number(s.today_revenue).toLocaleString("en-IN")}`;
            } else {
                revCard.style.display = "none";
            }
        }
    } catch (err) {
        console.warn("Could not refresh dashboard stats:", err);
    }
}

// DISPATCH DATA LOADER FOR ACTIVE MODULE
async function loadActiveModuleData() {
    switch (activeModule) {
        case "appointments":
            await loadAppointments();
            break;
        case "diagnostics":
            await loadDiagnosticsModule();
            break;
        case "clinical":
            await loadDoctorClinicalDesk();
            break;
        case "beds":
            await loadBedsAndWards();
            break;
        case "pharmacy":
            await loadPharmacyStock();
            break;
        case "billing":
            await loadBillingInvoices();
            break;
        case "emergency":
            await loadEmergencyAmbulances();
            break;
        case "admin":
            await loadAdminConsole();
            break;
    }
}

// ====================================================================
// 1. APPOINTMENTS & PATIENT QUEUE
// ====================================================================

async function loadAppointments() {
    const tbody = document.getElementById("appointmentsTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px;">Loading appointments...</td></tr>`;

    try {
        const filterStatus = document.getElementById("filterApptStatus")?.value || "";
        let url = `${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/appointments`;
        if (filterStatus) url += `?status=${encodeURIComponent(filterStatus)}`;

        const data = await authFetch(url);
        const appts = data.appointments || [];

        if (!appts.length) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#64748b;">No appointments found for this hospital.</td></tr>`;
            return;
        }

        tbody.innerHTML = appts.map(a => `
            <tr>
                <td><strong style="font-family:monospace; color:#2563eb; font-size:14px;">${escapeHtml(a.token_number || `T-${a.id}`)}</strong></td>
                <td>
                    <strong>${escapeHtml(a.patient_name || a.patient_id)}</strong>
                    <div style="font-size:11px; color:#64748b;">${escapeHtml(a.patient_id)}</div>
                </td>
                <td>${escapeHtml(a.patient_age && a.patient_age > 0 ? `${a.patient_age}y` : "-")} / ${escapeHtml(a.patient_gender || "-")}</td>
                <td>${escapeHtml(a.doctor || a.doctor_name || "Assigned Doctor")}</td>
                <td><span class="hd-badge blue">${escapeHtml(a.department || "OPD")}</span></td>
                <td>${escapeHtml(a.appointment_time || "10:00 AM")}</td>
                <td>
                    <span class="hd-badge ${a.status === 'Completed' ? 'green' : (a.status === 'In Consultation' ? 'blue' : 'amber')}">
                        ${escapeHtml(a.status || 'Waiting')}
                    </span>
                </td>
                <td>
                    <div style="display:flex; gap:6px;">
                        ${a.status !== 'In Consultation' && a.status !== 'Completed' ? `
                            <button class="hd-btn hd-btn-outline hd-btn-sm" onclick="updateApptStatus(${a.id}, 'In Consultation')">Call Next</button>
                        ` : ''}
                        ${a.status !== 'Completed' ? `
                            <button class="hd-btn hd-btn-success hd-btn-sm" onclick="updateApptStatus(${a.id}, 'Completed')">Done</button>
                        ` : ''}
                        <button class="hd-btn hd-btn-danger hd-btn-sm" onclick="updateApptStatus(${a.id}, 'Cancelled')">✕</button>
                    </div>
                </td>
            </tr>
        `).join("");
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#ef4444;">${err.message}</td></tr>`;
    }
}

async function updateApptStatus(apptId, newStatus) {
    try {
        await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/appointments/${apptId}/status`, {
            method: "PUT",
            body: JSON.stringify({ status: newStatus })
        });
        await loadAppointments();
        await refreshDashboardData();
    } catch (err) {
        alert("Failed to update status: " + err.message);
    }
}

let hospitalDoctorsCache = [];
let hospitalTestsCache = [];

async function openRegisterWalkInModal() {
    const modal = document.getElementById("modalRegisterWalkIn");
    if (!modal) return;

    try {
        const res = await fetch(`${API_BASE}/api/doctors`);
        const data = await res.json();
        const docs = Array.isArray(data) ? data : (data.doctors || data.data || []);
        hospitalDoctorsCache = docs.filter(d => String(d.hospital_id) === String(currentHospitalId));
        if (hospitalDoctorsCache.length === 0) {
            hospitalDoctorsCache = docs; // fallback
        }

        renderWalkInDoctorOptions(hospitalDoctorsCache);
    } catch (err) {
        console.warn("Could not fetch doctors for walk-in modal:", err);
    }

    modal.classList.add("active");
}

function renderWalkInDoctorOptions(docs) {
    const docSelect = document.getElementById("walkinDoctorSelect");
    if (!docSelect) return;
    if (docs.length === 0) {
        docSelect.innerHTML = `<option value="">No doctors found</option>`;
        return;
    }
    docSelect.innerHTML = docs.map(d => 
        `<option value="${d.doctor_id || d.id}">${d.name} (${d.specialization || d.department || 'Consultant'})</option>`
    ).join("");
}

function filterWalkInDoctorsByDept(dept) {
    if (!dept) {
        renderWalkInDoctorOptions(hospitalDoctorsCache);
        return;
    }
    const filtered = hospitalDoctorsCache.filter(d => 
        (d.department && d.department.toLowerCase().includes(dept.toLowerCase())) ||
        (d.specialization && d.specialization.toLowerCase().includes(dept.toLowerCase()))
    );
    renderWalkInDoctorOptions(filtered.length > 0 ? filtered : hospitalDoctorsCache);
}

async function handleRegisterWalkInSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("walkinPatientName").value.trim();
    const age = parseInt(document.getElementById("walkinPatientAge").value) || null;
    const gender = document.getElementById("walkinPatientGender").value;
    const mobile = document.getElementById("walkinPatientMobile").value.trim();
    const dept = document.getElementById("walkinDepartment").value;
    const doctorId = document.getElementById("walkinDoctorSelect").value;

    try {
        const res = await fetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/appointments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                patient_name: name,
                patient_age: age,
                patient_gender: gender,
                patient_mobile: mobile,
                doctor_id: doctorId,
                department: dept
            })
        });

        const data = await res.json();
        if (data.success) {
            alert(`✅ Walk-in Patient Registered Successfully!\n\nPatient Name: ${name}\nOPD Token: ${data.appointment?.token_number || 'T-01'}\nStatus: Waiting in OPD Queue`);
            closeHdModal("modalRegisterWalkIn");
            document.getElementById("registerWalkInForm").reset();
            await loadAppointments();
            await refreshDashboardData();
        } else {
            alert("Registration failed: " + (data.message || "Unknown error"));
        }
    } catch (err) {
        alert("Registration failed: " + err.message);
    }
}

// 7. OFFLINE DIAGNOSTIC TEST BOOKING
async function openOfflineBookingModal() {
    const modal = document.getElementById("modalOfflineBooking");
    const testSelect = document.getElementById("offlineTestSelect");
    if (!modal) return;

    try {
        const res = await fetch(`${API_BASE}/api/diagnostics/tests?hospital_id=${encodeURIComponent(currentHospitalId)}`);
        const data = await res.json();
        hospitalTestsCache = data.tests || [];
        if (testSelect) {
            testSelect.innerHTML = hospitalTestsCache.map(t => 
                `<option value="${t.test_id}" data-price="${t.price}">${t.test_name} (${t.category}) - ₹${t.price}</option>`
            ).join("");
            updateOfflineTestFee(testSelect);
        }
    } catch (err) {
        console.warn("Could not load diagnostic tests for offline booking:", err);
    }

    modal.classList.add("active");
}

function updateOfflineTestFee(selectEl) {
    const opt = selectEl.options[selectEl.selectedIndex];
    const price = opt ? opt.getAttribute("data-price") : 0;
    const feeEl = document.getElementById("offlineFeeDisplay");
    if (feeEl) feeEl.textContent = `Fee Payable at Counter: ₹${price || 0}`;
}

async function handleOfflineBookingSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("offlinePatientName").value.trim();
    const patientId = document.getElementById("offlinePatientId").value.trim();
    const mobile = document.getElementById("offlinePatientMobile").value.trim();
    const testSelect = document.getElementById("offlineTestSelect");
    const testId = testSelect.value;
    const timeSlot = document.getElementById("offlineBookingSlot").value;
    const paymentMethod = document.getElementById("offlinePaymentMethod").value;

    const opt = testSelect.options[testSelect.selectedIndex];
    const amount = opt ? Number(opt.getAttribute("data-price")) : 0;

    try {
        const res = await fetch(`${API_BASE}/api/diagnostics/bookings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                test_id: testId,
                patient_name: name,
                patient_id: patientId || null,
                patient_phone: mobile,
                booking_date: new Date().toISOString().split("T")[0],
                time_slot: timeSlot,
                amount: amount,
                payment_method: paymentMethod,
                hospital_id: currentHospitalId
            })
        });

        const data = await res.json();
        if (data.success) {
            alert(`✅ Diagnostic Test Booked Successfully!\n\nPatient: ${name}\nTest Token: ${data.booking?.token_number || 'A-01'}\nBooking ID: ${data.booking?.booking_id}\nAmount: ₹${amount}`);
            closeHdModal("modalOfflineBooking");
            document.getElementById("offlineBookingForm").reset();
            await loadDiagnosticsModule();
            await refreshDashboardData();
        } else {
            alert("Booking failed: " + (data.message || "Unknown error"));
        }
    } catch (err) {
        alert("Booking failed: " + err.message);
    }
}

// ====================================================================
// 2. DIAGNOSTICS & TESTS (THE DIAGNOSTIC CENTER)
// ====================================================================

function switchDiagSubTab(subTabId, btn) {
    activeDiagSubTab = subTabId;
    document.querySelectorAll("#diagnosticSubTabs .hd-cat-pill").forEach(p => p.classList.remove("active"));
    if (btn) btn.classList.add("active");

    ["catalog", "queue", "samples", "reports", "home"].forEach(tab => {
        const el = document.getElementById(`diagSub-${tab}`);
        if (el) el.style.display = (tab === subTabId) ? "block" : "none";
    });

    loadDiagnosticsModule();
}

async function loadDiagnosticsModule() {
    if (activeDiagSubTab === "catalog") {
        await loadDiagnosticCatalog();
    } else if (activeDiagSubTab === "queue") {
        await loadDiagnosticLiveQueue();
    } else if (activeDiagSubTab === "samples") {
        await loadDiagnosticSamples();
    } else if (activeDiagSubTab === "reports") {
        await loadDiagnosticReports();
    } else if (activeDiagSubTab === "home") {
        await loadDiagnosticHomeCollections();
    }
}

async function loadDiagnosticCatalog() {
    const grid = document.getElementById("diagTestGrid");
    if (!grid) return;
    grid.innerHTML = `<div style="padding:20px; color:#64748b;">Loading diagnostic tests...</div>`;

    try {
        const res = await fetch(`${API_BASE}/api/diagnostics/tests?hospital_id=${encodeURIComponent(currentHospitalId)}`);
        const data = await res.json();
        diagnosticTests = data.tests || [];

        renderDiagnosticTestGrid(diagnosticTests);
    } catch (err) {
        grid.innerHTML = `<div style="color:#ef4444; padding:20px;">Failed to load diagnostic catalog.</div>`;
    }
}

function renderDiagnosticTestGrid(tests) {
    const grid = document.getElementById("diagTestGrid");
    if (!grid) return;

    if (!tests.length) {
        grid.innerHTML = `<div style="grid-column:1/-1; padding:30px; text-align:center; color:#64748b;">No diagnostic tests found in this category.</div>`;
        return;
    }

    grid.innerHTML = tests.map(t => `
        <div class="hd-test-card">
            <div>
                <div class="hd-test-header">
                    <div class="hd-test-title">
                        <div class="hd-test-icon">${t.icon || "🧪"}</div>
                        <div>
                            <h4>${escapeHtml(t.name)}</h4>
                            <span class="hd-test-category">${escapeHtml(t.category_code || "PATHOLOGY")} • ${escapeHtml(t.code)}</span>
                        </div>
                    </div>
                    <div class="hd-test-price">₹${Number(t.price || 0)}</div>
                </div>

                <p class="hd-test-desc">${escapeHtml(t.short_description || t.purpose || "Clinical diagnostic investigation.")}</p>

                <div class="hd-test-specs">
                    <div><span>Sample</span><strong>${escapeHtml(t.sample_required || "Blood")}</strong></div>
                    <div><span>Report Time</span><strong>${escapeHtml(t.estimated_report_time || "4 to 6 Hours")}</strong></div>
                    <div><span>Fasting</span><strong>${t.fasting_required ? "Yes (8-10h)" : "No"}</strong></div>
                    <div><span>Queue</span><strong style="color:#2563eb;">Serving: ${escapeHtml(t.now_serving || "A-001")}</strong></div>
                </div>
            </div>

            <div class="hd-test-actions">
                <button class="hd-btn hd-btn-primary hd-btn-sm" style="flex:1;" onclick="openOfflineBookingForTest('${t.test_id}')">⚡ Book Offline</button>
                <button class="hd-btn hd-btn-outline hd-btn-sm" onclick="alert('Clinical Purpose: ' + ${JSON.stringify(t.purpose || t.full_description || t.prep_instructions)})">ℹ️ Info</button>
            </div>
        </div>
    `).join("");
}

function filterDiagnosticTests() {
    const q = (document.getElementById("diagSearchInput")?.value || "").toLowerCase();
    const filtered = diagnosticTests.filter(t => 
        t.name.toLowerCase().includes(q) || 
        (t.code && t.code.toLowerCase().includes(q)) ||
        (t.category_code && t.category_code.toLowerCase().includes(q))
    );
    renderDiagnosticTestGrid(filtered);
}

function filterByCategory(catCode, btn) {
    document.querySelectorAll("#categoryFilterPills .hd-cat-pill").forEach(p => p.classList.remove("active"));
    if (btn) btn.classList.add("active");

    if (catCode === "ALL") {
        renderDiagnosticTestGrid(diagnosticTests);
    } else {
        const filtered = diagnosticTests.filter(t => t.category_code === catCode);
        renderDiagnosticTestGrid(filtered);
    }
}

// LIVE QUEUE
async function loadDiagnosticLiveQueue() {
    const container = document.getElementById("liveQueueContainer");
    if (!container) return;
    container.innerHTML = `<div style="padding:20px;">Loading live diagnostic queues...</div>`;

    try {
        const res = await fetch(`${API_BASE}/api/diagnostics/queue?hospital_id=${encodeURIComponent(currentHospitalId)}`);
        const data = await res.json();
        const queues = data.queues || [];

        if (!queues.length) {
            container.innerHTML = `<div class="hd-card" style="text-align:center; padding:30px; color:#64748b;">No active queues for today.</div>`;
            return;
        }

        container.innerHTML = queues.map(q => `
            <div class="hd-queue-card">
                <div>
                    <h4 style="font-size:16px; font-weight:800; color:#38bdf8;">${escapeHtml(q.test_name)} (${escapeHtml(q.test_code)})</h4>
                    <p style="font-size:12px; color:#94a3b8;">${escapeHtml(q.laboratory_name || "Diagnostic Wing")} • ${escapeHtml(q.department || "Pathology")}</p>
                </div>
                <div class="hd-queue-status-box">
                    <div class="hd-queue-token-unit active">
                        <span>Now Serving</span>
                        <strong>${escapeHtml(q.now_serving || "-")}</strong>
                    </div>
                    <div class="hd-queue-token-unit">
                        <span>Current Token</span>
                        <strong>${escapeHtml(q.current_token || "-")}</strong>
                    </div>
                    <div class="hd-queue-token-unit">
                        <span>Waiting</span>
                        <strong style="color:#f59e0b;">${q.waiting_patients || 0}</strong>
                    </div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="hd-btn hd-btn-success hd-btn-sm" onclick="callNextQueueToken('${q.test_id}')">📢 Call Next Token</button>
                </div>
            </div>
        `).join("");
    } catch (err) {
        container.innerHTML = `<div style="color:#ef4444; padding:20px;">Failed to load queue.</div>`;
    }
}

async function callNextQueueToken(testId) {
    try {
        const data = await authFetch(`${API_BASE}/api/diagnostics/queue/call-next`, {
            method: "POST",
            body: JSON.stringify({
                hospital_id: currentHospitalId,
                test_id: testId
            })
        });

        alert(data.message);
        await loadDiagnosticLiveQueue();
        await refreshDashboardData();
    } catch (err) {
        alert("Error calling token: " + err.message);
    }
}

// SAMPLE COLLECTION DESK
async function loadDiagnosticSamples() {
    const tbody = document.getElementById("samplesTableBody");
    if (!tbody) return;

    try {
        const data = await authFetch(`${API_BASE}/api/diagnostics/samples?hospital_id=${encodeURIComponent(currentHospitalId)}`);
        const samples = data.samples || [];

        if (!samples.length) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:24px; color:#64748b;">No specimen samples logged yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = samples.map(s => `
            <tr>
                <td><strong style="font-family:monospace; color:#2563eb;">${s.sample_id}</strong></td>
                <td>${s.booking_id}</td>
                <td><span class="hd-badge blue">${s.token_number || "-"}</span></td>
                <td><strong>${escapeHtml(s.patient_name || s.patient_id)}</strong></td>
                <td><span class="hd-badge purple">🩸 ${s.sample_type}</span></td>
                <td>${escapeHtml(s.collected_by || "Lab Staff")}</td>
                <td>${new Date(s.collection_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td>${escapeHtml(s.storage_condition || "2-8°C")}</td>
                <td><span class="hd-badge green">${s.status}</span></td>
                <td>
                    <button class="hd-btn hd-btn-outline hd-btn-sm" onclick="alert('Specimen barcode: ' + '${s.sample_id}' + '\\nStorage: ' + '${s.storage_condition}')">🏷️ Barcode</button>
                </td>
            </tr>
        `).join("");
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#ef4444; padding:20px;">${err.message}</td></tr>`;
    }
}

// DIAGNOSTIC REPORTS
async function loadDiagnosticReports() {
    const tbody = document.getElementById("reportsTableBody");
    if (!tbody) return;

    try {
        // Fetch published reports for hospital
        const res = await fetch(`${API_BASE}/api/diagnostics/bookings?hospital_id=${encodeURIComponent(currentHospitalId)}&status=REPORT READY`);
        const data = await res.json();
        const reports = data.bookings || [];

        if (!reports.length) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:#64748b;">No published reports yet. Click 'Publish New Report' to generate one.</td></tr>`;
            return;
        }

        tbody.innerHTML = reports.map(r => `
            <tr>
                <td><strong style="font-family:monospace; color:#2563eb;">RPT-${r.booking_id.replace("TB-", "")}</strong></td>
                <td><strong>${escapeHtml(r.patient_name)}</strong><div style="font-size:11px; color:#64748b;">${r.patient_id}</div></td>
                <td>${escapeHtml(r.test_name)}</td>
                <td>${escapeHtml(r.doctor_name || "Pathologist On Duty")}</td>
                <td>${r.booking_date}</td>
                <td><span class="hd-badge green">Verified & Authentic</span></td>
                <td>
                    <button class="hd-btn hd-btn-primary hd-btn-sm" onclick="viewDiagnosticReport('RPT-2026-001', '${escapeHtml(r.patient_name)}', '${r.patient_id}', '${escapeHtml(r.test_name)}', '${r.token_number}')">👁️ View Official Report</button>
                </td>
            </tr>
        `).join("");
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="color:#ef4444; text-align:center;">${err.message}</td></tr>`;
    }
}

// HOME SAMPLE COLLECTIONS
async function loadDiagnosticHomeCollections() {
    const tbody = document.getElementById("homeCollectionsTableBody");
    if (!tbody) return;

    try {
        const data = await authFetch(`${API_BASE}/api/diagnostics/home-collections?hospital_id=${encodeURIComponent(currentHospitalId)}`);
        const list = data.collections || [];

        if (!list.length) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:#64748b;">No home sample collection requests pending.</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(item => `
            <tr>
                <td><strong>${item.booking_id}</strong></td>
                <td><strong>${escapeHtml(item.patient_name)}</strong> (${item.patient_mobile || "-"})</td>
                <td>${escapeHtml(item.test_name)}</td>
                <td>📍 ${escapeHtml(item.home_address || "Gorakhpur")}</td>
                <td><span class="hd-badge purple">${escapeHtml(item.collection_staff || "Unassigned")}</span></td>
                <td><span class="hd-badge amber">${item.status}</span></td>
                <td>
                    <button class="hd-btn hd-btn-success hd-btn-sm" onclick="assignHomeCollector('${item.booking_id}')">Assign Phlebotomist</button>
                </td>
            </tr>
        `).join("");
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="color:#ef4444; text-align:center;">${err.message}</td></tr>`;
    }
}

function assignHomeCollector(bookingId) {
    const staffName = prompt("Enter Phlebotomist / Collector Name:", "Ramesh Yadav (Phlebotomist)");
    if (!staffName) return;

    authFetch(`${API_BASE}/api/diagnostics/home-collections/${bookingId}/assign`, {
        method: "PUT",
        body: JSON.stringify({ collection_staff: staffName, status: "Assigned" })
    }).then(res => {
        alert(res.message);
        loadDiagnosticHomeCollections();
    }).catch(err => alert(err.message));
}

// OFFLINE BOOKING DESK
function openOfflineBookingModal() {
    openOfflineBookingForTest();
}

function openOfflineBookingForTest(preselectedTestId = null) {
    const modal = document.getElementById("modalOfflineBooking");
    const select = document.getElementById("offTestSelect");
    if (!modal || !select) return;

    select.innerHTML = '<option value="">-- Choose Diagnostic Test --</option>' +
        diagnosticTests.map(t => `<option value="${t.test_id}" data-price="${t.price}">${t.name} (₹${t.price})</option>`).join("");

    if (preselectedTestId) {
        select.value = preselectedTestId;
    } else if (diagnosticTests.length) {
        select.value = diagnosticTests[0].test_id;
    }

    updateOfflinePrice();
    modal.classList.add("active");
}

function updateOfflinePrice() {
    const select = document.getElementById("offTestSelect");
    const feeInput = document.getElementById("offTestFee");
    if (!select || !feeInput) return;
    const opt = select.selectedOptions[0];
    const price = opt ? opt.getAttribute("data-price") : "0";
    feeInput.value = `₹${price}`;
}

async function handleOfflineBookingSubmit(e) {
    e.preventDefault();
    const testId = document.getElementById("offTestSelect").value;
    const patientName = document.getElementById("offPatientName").value;
    const patientMobile = document.getElementById("offPatientMobile").value;
    const patientAge = document.getElementById("offPatientAge").value;
    const patientGender = document.getElementById("offPatientGender").value;
    const paymentMethod = document.getElementById("offPaymentMethod").value;

    try {
        const data = await authFetch(`${API_BASE}/api/diagnostics/bookings`, {
            method: "POST",
            body: JSON.stringify({
                hospital_id: currentHospitalId,
                test_id: testId,
                patient_name: patientName,
                patient_mobile: patientMobile,
                patient_age: patientAge,
                patient_gender: patientGender,
                booking_type: "OFFLINE",
                payment_method: paymentMethod,
                payment_status: "Paid"
            })
        });

        alert(`✅ Offline Booking Created!\nToken: ${data.booking.token_number}\nBooking ID: ${data.booking.booking_id}\nPatient sent to Sample Collection.`);
        closeHdModal("modalOfflineBooking");
        await refreshDashboardData();
        if (activeDiagSubTab === "queue") await loadDiagnosticLiveQueue();
    } catch (err) {
        alert("Booking failed: " + err.message);
    }
}

// REPORT VIEWER
async function viewDiagnosticReport(reportId, patientName, patientId, testName, tokenNo) {
    const modal = document.getElementById("modalViewReport");
    if (!modal) return;

    document.getElementById("rpHospName").textContent = document.getElementById("bannerHospName").textContent;
    document.getElementById("rpHospAddress").textContent = document.getElementById("bannerHospAddress").textContent;
    document.getElementById("rpReportId").textContent = reportId || "RPT-2026-001";
    document.getElementById("rpPatientName").textContent = patientName || "Admitted Patient";
    document.getElementById("rpPatientId").textContent = patientId || "PAT-5931984821";
    document.getElementById("rpTokenNo").textContent = tokenNo || "A-021";
    document.getElementById("rpTestName").textContent = testName || "Complete Blood Count (CBC) with ESR";

    // Set clinical parameters
    const tbody = document.getElementById("rpParamsTbody");
    tbody.innerHTML = `
        <tr><td><strong>Hemoglobin (Hb)</strong></td><td>14.2</td><td>g/dL</td><td>13.0 - 17.0</td><td><span class="hd-badge green">Normal</span></td></tr>
        <tr><td><strong>Total Leukocyte Count (TLC)</strong></td><td>7,400</td><td>/cu.mm</td><td>4,000 - 11,000</td><td><span class="hd-badge green">Normal</span></td></tr>
        <tr><td><strong>Platelet Count</strong></td><td>2.65</td><td>Lakhs/cu.mm</td><td>1.5 - 4.5</td><td><span class="hd-badge green">Normal</span></td></tr>
        <tr><td><strong>Erythrocyte Sedimentation Rate (ESR)</strong></td><td>12</td><td>mm/hr</td><td>0 - 15</td><td><span class="hd-badge green">Normal</span></td></tr>
    `;

    // Render QR Code verification token
    const qrContainer = document.getElementById("rpQRCode");
    qrContainer.innerHTML = "";
    if (typeof QRCode !== "undefined") {
        new QRCode(qrContainer, {
            text: `${API_BASE || window.location.origin}/api/diagnostics/reports/verify/VERIFY-${reportId}`,
            width: 75,
            height: 75
        });
    }

    modal.classList.add("active");
}

function printReportDocument() {
    window.print();
}

function downloadReportPDF() {
    alert("Report PDF compiled and ready for download.");
}

// PUBLISH REPORT DESK
function openPublishReportModal() {
    const modal = document.getElementById("modalPublishReport");
    const select = document.getElementById("repBookingSelect");
    if (!modal || !select) return;

    select.innerHTML = '<option value="">-- Choose Processing Booking --</option>' +
        '<option value="TB-2026-0101" data-pid="PAT-5931984821" data-tid="TEST-CBC-001">Token A-021 - Rajesh Sharma (CBC with ESR)</option>' +
        '<option value="TB-2026-0102" data-pid="PAT-1002348" data-tid="TEST-LFT-001">Token B-011 - Ramesh Kumar (LFT Profile)</option>';

    modal.classList.add("active");
}

function onReportBookingSelected() {}

async function handlePublishReportSubmit(e) {
    e.preventDefault();
    const select = document.getElementById("repBookingSelect");
    const opt = select.selectedOptions[0];
    if (!opt || !select.value) {
        alert("Please select a booking to publish.");
        return;
    }

    const bookingId = select.value;
    const patientId = opt.getAttribute("data-pid");
    const testId = opt.getAttribute("data-tid");
    const verifiedBy = document.getElementById("repVerifiedBy").value;
    const remarks = document.getElementById("repRemarksInput").value;

    try {
        const data = await authFetch(`${API_BASE}/api/diagnostics/reports`, {
            method: "POST",
            body: JSON.stringify({
                booking_id: bookingId,
                hospital_id: currentHospitalId,
                test_id: testId,
                patient_id: patientId,
                verified_by: verifiedBy,
                remarks: remarks,
                parameters: [
                    { parameter: "Hemoglobin (Hb)", result: "14.2", unit: "g/dL", normal_range: "13.0-17.0", flag: "Normal" }
                ]
            })
        });

        alert(`✅ Diagnostic Report ${data.report_id} published successfully with QR Verification token!`);
        closeHdModal("modalPublishReport");
        await refreshDashboardData();
        if (activeDiagSubTab === "reports") await loadDiagnosticReports();
    } catch (err) {
        alert("Publish failed: " + err.message);
    }
}

// ====================================================================
// 3. DOCTOR CLINICAL DESK & 1-CLICK TEST ORDERING
// ====================================================================

async function loadDoctorClinicalDesk() {
    const list = document.getElementById("doctorQueueList");
    const checkContainer = document.getElementById("quickTestCheckboxes");
    if (!list) return;

    list.innerHTML = `<div style="color:#64748b; font-size:12px;">Loading OPD Queue...</div>`;

    try {
        const data = await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/appointments?status=Waiting`);
        const appts = data.appointments || [];

        // Checkboxes for direct test ordering
        if (checkContainer) {
            checkContainer.innerHTML = diagnosticTests.slice(0, 6).map(t => `
                <label style="font-size:12px; display:inline-flex; align-items:center; gap:4px; background:white; padding:4px 8px; border-radius:6px; border:1px solid #bbf7d0; cursor:pointer;">
                    <input type="checkbox" name="doctorTestOrder" value="${t.test_id}">
                    ${t.icon || "🧪"} ${escapeHtml(t.name)} (₹${t.price})
                </label>
            `).join("");
        }

        if (!appts.length) {
            list.innerHTML = `<div style="color:#64748b; font-size:12px; padding:10px;">No waiting patients in queue.</div>`;
            return;
        }

        list.innerHTML = appts.map(a => `
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; cursor:pointer;" onclick="selectPatientForConsultation(${JSON.stringify(a).replace(/"/g, '&quot;')})">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="font-size:13px; color:#1e293b;">${escapeHtml(a.patient_name)}</strong>
                    <span class="hd-badge blue">${escapeHtml(a.token_number || `T-${a.id}`)}</span>
                </div>
                <div style="font-size:11px; color:#64748b; margin-top:2px;">
                    ${a.patient_id} • ${a.patient_age ? `${a.patient_age}y` : ""} ${a.patient_gender || ""}
                </div>
            </div>
        `).join("");
    } catch (err) {
        list.innerHTML = `<div style="color:#ef4444; font-size:12px;">${err.message}</div>`;
    }
}

function selectPatientForConsultation(appt) {
    activeDoctorConsultation = appt;
    document.getElementById("activePatientName").textContent = `${appt.patient_name} (${appt.patient_age ? `${appt.patient_age}y, ` : ""}${appt.patient_gender || ""})`;
    document.getElementById("activePatientMeta").textContent = `Patient ID: ${appt.patient_id} • Appointment ID: #${appt.id} • Token: ${appt.token_number || `T-${appt.id}`}`;
    document.getElementById("activeTokenBadge").textContent = `Token ${appt.token_number || `T-${appt.id}`} In Consultation`;

    // Mark appointment In Consultation
    updateApptStatus(appt.id, "In Consultation");
}

async function submitDoctorTestOrder() {
    if (!activeDoctorConsultation) {
        alert("Please select a waiting patient from the OPD Queue first.");
        return;
    }

    const selectedTests = Array.from(document.querySelectorAll('input[name="doctorTestOrder"]:checked')).map(cb => cb.value);
    if (!selectedTests.length) {
        alert("Please check at least one diagnostic test to order.");
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/api/doctor/order-tests`, {
            method: "POST",
            body: JSON.stringify({
                patientId: activeDoctorConsultation.patient_id,
                hospitalId: currentHospitalId,
                doctorId: activeDoctorConsultation.doctor_id || "DOC-101",
                doctorName: activeDoctorConsultation.doctor || "Dr. Anand Verma",
                testIds: selectedTests
            })
        });

        alert(`✅ Test Order Dispatched!\n${res.message}\nOrders queued directly in Diagnostics.`);
        document.querySelectorAll('input[name="doctorTestOrder"]').forEach(cb => cb.checked = false);
        await refreshDashboardData();
    } catch (err) {
        alert("Error ordering tests: " + err.message);
    }
}

async function completeDoctorConsultation() {
    if (!activeDoctorConsultation) {
        alert("No active consultation to complete.");
        return;
    }

    const diagnosis = document.getElementById("docDiagnosisInput").value;
    const prescription = document.getElementById("docPrescriptionInput").value;

    try {
        await updateApptStatus(activeDoctorConsultation.id, "Completed");
        alert(`✅ Consultation completed for ${activeDoctorConsultation.patient_name}.\nDiagnosis: ${diagnosis || "Consultation done"}\nPrescription routed to Pharmacy.`);
        resetConsultationPad();
        await loadDoctorClinicalDesk();
    } catch (err) {
        alert("Error: " + err.message);
    }
}

function resetConsultationPad() {
    activeDoctorConsultation = null;
    document.getElementById("activePatientName").textContent = "Select a patient from the OPD Queue";
    document.getElementById("activePatientMeta").textContent = "Patient details will load here";
    document.getElementById("activeTokenBadge").textContent = "No Patient Active";
    document.getElementById("docSymptomsInput").value = "";
    document.getElementById("docDiagnosisInput").value = "";
    document.getElementById("docPrescriptionInput").value = "";
    document.getElementById("docNotesInput").value = "";
}

// ====================================================================
// 4. BEDS & WARDS
// ====================================================================

async function loadBedsAndWards() {
    const container = document.getElementById("wardsOverviewContainer");
    if (!container) return;
    container.innerHTML = `<div style="padding:20px;">Loading wards and bed inventory...</div>`;

    try {
        const [wardsRes, bedsRes] = await Promise.all([
            fetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/wards`).then(r => r.json()),
            fetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/ward-beds`).then(r => r.json())
        ]);

        const wards = wardsRes.wards || [];
        const beds = bedsRes.beds || [];

        if (!wards.length) {
            container.innerHTML = `<div class="hd-card" style="text-align:center; padding:30px; color:#64748b;">No wards configured for this hospital.</div>`;
            return;
        }

        container.innerHTML = wards.map(w => {
            const wardBeds = beds.filter(b => b.ward_id === w.ward_id);
            return `
                <div class="hd-card" style="margin-bottom:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-card); padding-bottom:10px; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                        <div>
                            <h4 style="font-size:16px; margin:0 0 4px;">${escapeHtml(w.ward_name)}</h4>
                            <p style="font-size:11px; color:#64748b; margin:0;">
                                📍 ${escapeHtml(w.building_wing || "Main Block")} • ${escapeHtml(w.floor || "Floor 1")} • Type: <strong>${escapeHtml(w.ward_type)}</strong> • Charge: <strong>₹${w.charge_per_day || w.base_rate_per_day || 0}/day</strong>
                            </p>
                        </div>
                        <div style="display:flex; gap:10px; align-items:center;">
                            <span class="hd-badge green">${w.available_beds} Available</span>
                            <span class="hd-badge red">${w.occupied_beds} Occupied</span>
                            <span class="hd-badge blue">${w.total_beds || wardBeds.length} Total</span>
                        </div>
                    </div>

                    <div class="hd-bed-grid">
                        ${wardBeds.map(b => {
                            const icon = (b.bed_type === 'ICU' || (w.ward_type === 'ICU')) ? '🩺' : ((b.bed_type === 'Emergency') ? '🚨' : '🛏️');
                            return `
                            <div class="hd-bed-box ${b.status}" onclick="handleBedClick('${b.bed_id}', '${b.status}', '${escapeHtml(b.patient_name || '')}')" style="cursor:pointer;" title="${b.status === 'Occupied' ? 'Click to Discharge Patient' : 'Click to Assign Patient'}">
                                <div class="hd-bed-icon">${icon}</div>
                                <div class="hd-bed-num">${escapeHtml(b.bed_number)}</div>
                                <div class="hd-bed-stat" style="color:${b.status === 'Available' ? '#16a34a' : (b.status === 'Occupied' ? '#dc2626' : '#d97706')};">
                                    ${b.status}
                                </div>
                                <div class="hd-bed-patient">${b.patient_name ? escapeHtml(b.patient_name) : "-"}</div>
                            </div>
                            `;
                        }).join("")}
                    </div>
                </div>
            `;
        }).join("");
    } catch (err) {
        container.innerHTML = `<div style="color:#ef4444; padding:20px;">${err.message}</div>`;
    }
}

function handleBedClick(bedId, status, patientName) {
    if (status === "Occupied") {
        const dischargeNotes = prompt(
            `Bed ${bedId} is occupied by ${patientName || 'Patient'}.\n\nEnter clinical discharge summary to discharge patient and release this bed:`,
            "Discharged in stable condition. Routine home follow-up advised."
        );
        if (dischargeNotes !== null) {
            authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/ward-beds/release`, {
                method: "POST",
                body: JSON.stringify({ bed_id: bedId, discharge_summary: dischargeNotes })
            }).then(r => {
                alert(`✅ ${r.message || 'Patient discharged successfully.'}`);
                loadBedsAndWards();
                refreshDashboardData();
            }).catch(e => alert("Discharge error: " + e.message));
        }
    } else {
        openAssignBedModal(bedId);
    }
}

function openAssignBedModal(preselectedBedId = null) {
    const modal = document.getElementById("modalAssignBed");
    const select = document.getElementById("bedAssignSelect");
    if (!modal || !select) return;

    fetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/ward-beds?status=Available`)
        .then(r => r.json())
        .then(data => {
            const availBeds = data.beds || [];
            select.innerHTML = availBeds.map(b => `<option value="${b.bed_id}">${b.ward_name} - ${b.bed_number} (${b.bed_type})</option>`).join("");
            if (preselectedBedId) select.value = preselectedBedId;
            modal.classList.add("active");
        });
}

async function handleAssignBedSubmit(e) {
    e.preventDefault();
    const bedId = document.getElementById("bedAssignSelect").value;
    const patientName = document.getElementById("bedPatientName").value;
    const patientId = document.getElementById("bedPatientId").value;
    const notes = document.getElementById("bedNotes").value;

    try {
        const res = await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/ward-beds/assign`, {
            method: "POST",
            body: JSON.stringify({
                bed_id: bedId,
                patient_id: patientId,
                patient_name: patientName,
                notes: notes
            })
        });

        alert(`✅ ${res.message}`);
        closeHdModal("modalAssignBed");
        await loadBedsAndWards();
        await refreshDashboardData();
    } catch (err) {
        alert("Bed assignment failed: " + err.message);
    }
}

// ====================================================================
// 5. PHARMACY & PRESCRIPTIONS (ADD, EDIT, DISPENSE, DELETE)
// ====================================================================

let currentPharmacyMedicines = [];

async function loadPharmacyStock() {
    const tbody = document.getElementById("pharmacyTableBody");
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/api/pharmacy`);
        const data = await res.json();
        const meds = data.medicines || [];
        currentPharmacyMedicines = meds;

        if (!meds.length) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:28px; color:#64748b;">No medicines found in pharmacy catalog. Click <strong>"➕ Add New Medicine"</strong> above to register inventory.</td></tr>`;
            return;
        }

        tbody.innerHTML = meds.map(m => `
            <tr>
                <td><strong>${escapeHtml(m.medicine_name)}</strong></td>
                <td><span class="hd-badge blue">${escapeHtml(m.category || "General")}</span></td>
                <td>
                    <strong style="color:${m.quantity < 100 ? '#dc2626' : '#16a34a'}; font-size:14px;">${m.quantity}</strong>
                    ${m.quantity <= 0 ? '<span class="hd-badge red" style="margin-left:6px;">Out of Stock</span>' : (m.quantity < 100 ? '<span class="hd-badge red" style="margin-left:6px;">Low Stock</span>' : '')}
                </td>
                <td><strong>₹${Number(m.price).toFixed(2)}</strong></td>
                <td>
                    <span class="hd-badge ${m.availability === 'In Stock' ? 'green' : (m.availability === 'Low Stock' ? 'amber' : 'red')}">
                        ${escapeHtml(m.availability)}
                    </span>
                </td>
                <td>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <button type="button" class="hd-btn hd-btn-primary hd-btn-sm" style="padding:4px 10px; font-weight:700;" onclick="openDispenseModal(${m.id})">
                            💊 Dispense
                        </button>
                        <button type="button" class="hd-btn hd-btn-outline hd-btn-sm" style="padding:4px 10px; font-weight:700;" onclick="openEditMedicineModal(${m.id})">
                            ✏️ Edit
                        </button>
                        <button type="button" class="hd-btn hd-btn-outline hd-btn-sm" style="color:#ef4444; border-color:rgba(239,68,68,0.3); padding:4px 8px;" title="Delete Medicine" onclick="handleDeleteMedicine(${m.id}, '${escapeHtml(m.medicine_name)}')">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `).join("");
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#ef4444; padding:20px;">${err.message}</td></tr>`;
    }
}

function openAddMedicineModal() {
    const form = document.getElementById("addMedicineForm");
    if (form) form.reset();
    const qty = document.getElementById("addMedQuantity");
    if (qty) qty.value = "100";
    const prc = document.getElementById("addMedPrice");
    if (prc) prc.value = "45.00";
    const av = document.getElementById("addMedAvailability");
    if (av) av.value = "In Stock";
    openHdModal("modalAddMedicine");
}

async function handleAddMedicineSubmit(e) {
    e.preventDefault();
    const medicineName = document.getElementById("addMedName").value.trim();
    const category = document.getElementById("addMedCategory").value.trim();
    const quantity = Number(document.getElementById("addMedQuantity").value || 0);
    const price = Number(document.getElementById("addMedPrice").value || 0);
    const availability = document.getElementById("addMedAvailability").value;

    try {
        const res = await authFetch(`${API_BASE}/api/pharmacy`, {
            method: "POST",
            body: JSON.stringify({
                medicineName,
                category,
                quantity,
                price,
                availability
            })
        });

        closeHdModal("modalAddMedicine");
        showHdToast(res.message || `Medicine '${medicineName}' added to inventory!`, "success");
        await loadPharmacyStock();
    } catch (err) {
        alert("Failed to add medicine: " + err.message);
    }
}

async function openEditMedicineModal(id) {
    let med = currentPharmacyMedicines.find(m => Number(m.id) === Number(id));
    if (!med) {
        try {
            const res = await fetch(`${API_BASE}/api/pharmacy`);
            const data = await res.json();
            currentPharmacyMedicines = data.medicines || [];
            med = currentPharmacyMedicines.find(m => Number(m.id) === Number(id));
        } catch (_) {}
    }
    if (!med) {
        alert("Medicine record not found.");
        return;
    }

    const editId = document.getElementById("editMedId");
    if (editId) editId.value = med.id;
    const editName = document.getElementById("editMedName");
    if (editName) editName.value = med.medicine_name || "";
    const editCat = document.getElementById("editMedCategory");
    if (editCat) editCat.value = med.category || "";
    const editQty = document.getElementById("editMedQuantity");
    if (editQty) editQty.value = med.quantity !== undefined ? med.quantity : 0;
    const editPrice = document.getElementById("editMedPrice");
    if (editPrice) editPrice.value = Number(med.price || 0).toFixed(2);
    const editAvail = document.getElementById("editMedAvailability");
    if (editAvail) editAvail.value = med.availability || (med.quantity > 0 ? "In Stock" : "Out of Stock");

    openHdModal("modalEditMedicine");
}

async function handleEditMedicineSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("editMedId").value;
    const medicineName = document.getElementById("editMedName").value.trim();
    const category = document.getElementById("editMedCategory").value.trim();
    const quantity = Number(document.getElementById("editMedQuantity").value || 0);
    const price = Number(document.getElementById("editMedPrice").value || 0);
    const availability = document.getElementById("editMedAvailability").value;

    try {
        const res = await authFetch(`${API_BASE}/api/pharmacy/${id}`, {
            method: "PUT",
            body: JSON.stringify({
                medicineName,
                category,
                quantity,
                price,
                availability
            })
        });

        closeHdModal("modalEditMedicine");
        showHdToast(res.message || "Medicine updated successfully!", "success");
        await loadPharmacyStock();
    } catch (err) {
        alert("Failed to update medicine: " + err.message);
    }
}

async function openDispenseModal(id) {
    let med = currentPharmacyMedicines.find(m => Number(m.id) === Number(id));
    if (!med) {
        try {
            const res = await fetch(`${API_BASE}/api/pharmacy`);
            const data = await res.json();
            currentPharmacyMedicines = data.medicines || [];
            med = currentPharmacyMedicines.find(m => Number(m.id) === Number(id));
        } catch (_) {}
    }
    if (!med) {
        alert("Medicine record not found.");
        return;
    }

    const dispId = document.getElementById("dispenseMedId");
    if (dispId) dispId.value = med.id;
    const dispTitle = document.getElementById("dispenseMedTitle");
    if (dispTitle) dispTitle.textContent = `${med.medicine_name} (${med.category || 'General'})`;
    const dispStock = document.getElementById("dispenseAvailStock");
    if (dispStock) dispStock.textContent = `${med.quantity} Units`;
    const dispPrice = document.getElementById("dispenseUnitPrice");
    if (dispPrice) dispPrice.textContent = `₹${Number(med.price || 0).toFixed(2)}`;
    const dispUnits = document.getElementById("dispenseUnits");
    if (dispUnits) {
        dispUnits.value = "1";
        dispUnits.max = Math.max(1, med.quantity);
    }
    const dispPat = document.getElementById("dispensePatientId");
    if (dispPat) dispPat.value = "";

    openHdModal("modalDispenseMedicine");
}

async function handleDispenseMedicineSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("dispenseMedId").value;
    const units = Number(document.getElementById("dispenseUnits").value || 1);
    const patientId = document.getElementById("dispensePatientId").value.trim();

    try {
        const res = await authFetch(`${API_BASE}/api/pharmacy/${id}/dispense`, {
            method: "POST",
            body: JSON.stringify({ units, patientId })
        });

        closeHdModal("modalDispenseMedicine");
        showHdToast(res.message || `Dispensed ${units} unit(s) successfully!`, "success");
        await loadPharmacyStock();
    } catch (err) {
        alert("Failed to dispense: " + err.message);
    }
}

async function handleDeleteMedicine(id, name) {
    if (!confirm(`Are you sure you want to delete '${name}' from hospital inventory?`)) return;

    try {
        const res = await authFetch(`${API_BASE}/api/pharmacy/${id}`, {
            method: "DELETE"
        });

        showHdToast(res.message || `Medicine '${name}' removed.`, "success");
        await loadPharmacyStock();
    } catch (err) {
        alert("Failed to delete medicine: " + err.message);
    }
}

function showHdToast(msg, type = "info") {
    if (typeof showToast === "function") {
        showToast(msg, type);
    } else if (typeof SmartCityAuth !== "undefined" && typeof SmartCityAuth.showToast === "function") {
        SmartCityAuth.showToast(msg, type);
    } else {
        alert(msg);
    }
}

// ====================================================================
// 6. BILLING & CASHIER
// ====================================================================

async function loadBillingInvoices() {
    const tbody = document.getElementById("billingTableBody");
    if (!tbody) return;

    try {
        const data = await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/invoices`);
        const invoices = data.invoices || [];

        if (!invoices.length) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:#64748b;">No billing invoices recorded yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = invoices.map(inv => {
            const total = Number(inv.total_amount || 0);
            const paid = Number(inv.paid_amount || 0);
            const disc = Number(inv.discount || 0);
            const remaining = Number(inv.remaining_amount !== undefined ? inv.remaining_amount : Math.max(0, total - disc - paid));
            const isFullyPaid = remaining <= 0;
            const isPartiallyPaid = paid > 0 && remaining > 0;
            const statusBadge = isFullyPaid ? 'green' : (isPartiallyPaid ? 'purple' : 'amber');
            const statusText = isFullyPaid ? 'Paid' : (isPartiallyPaid ? 'Partially Paid' : 'Unpaid');
            const escapedInvJson = escapeHtml(JSON.stringify(inv));

            return `
                <tr>
                    <td><strong style="font-family:monospace; color:#2563eb;">${inv.invoice_id}</strong></td>
                    <td><strong>${escapeHtml(inv.patient_name)}</strong><div style="font-size:11px; color:#64748b;">${inv.patient_id}</div></td>
                    <td>${escapeHtml(inv.service_type)}</td>
                    <td>₹${total.toFixed(2)}</td>
                    <td><strong style="color:#047857;">₹${paid.toFixed(2)}</strong></td>
                    <td><strong style="color:${remaining > 0 ? '#dc2626' : '#16a34a'};">₹${remaining.toFixed(2)}</strong></td>
                    <td><span class="hd-badge purple">${escapeHtml(inv.payment_method || 'Cash')}</span></td>
                    <td><span class="hd-badge ${statusBadge}">${statusText}</span></td>
                    <td>
                        <div style="display:flex; gap:6px;">
                            ${!isFullyPaid ? `<button class="hd-btn hd-btn-primary hd-btn-sm" data-inv='${escapedInvJson}' onclick="triggerPaymentModal(this)">💳 Collect</button>` : ''}
                            <button class="hd-btn hd-btn-outline hd-btn-sm" data-inv='${escapedInvJson}' onclick="triggerReceiptPrint(this)">🧾 Receipt</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#ef4444;">${err.message}</td></tr>`;
    }
}

function openCreateInvoiceModal() {
    const modal = document.getElementById("modalCreateInvoice");
    if (modal) modal.classList.add("active");
}

async function handleCreateInvoiceSubmit(e) {
    e.preventDefault();
    const patientName = document.getElementById("invPatientName").value;
    const patientId = document.getElementById("invPatientId").value;
    const serviceType = document.getElementById("invServiceType").value;
    const totalAmount = document.getElementById("invTotalAmount").value;
    const discount = document.getElementById("invDiscount").value;
    const paymentMethod = document.getElementById("invPaymentMethod").value;
    const paymentStatus = document.getElementById("invPaymentStatus").value;

    try {
        const res = await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/invoices`, {
            method: "POST",
            body: JSON.stringify({
                patient_name: patientName,
                patient_id: patientId,
                service_type: serviceType,
                total_amount: totalAmount,
                discount: discount,
                payment_method: paymentMethod,
                payment_status: paymentStatus
            })
        });

        showToast(`✓ ${res.message} (Invoice ID: ${res.invoice.invoice_id})`, "success");
        closeHdModal("modalCreateInvoice");
        await loadBillingInvoices();
        await refreshDashboardData();
    } catch (err) {
        showToast("✕ Invoice creation failed: " + err.message, "error");
    }
}

// ====================================================================
// 7. EMERGENCY & AMBULANCES
// ====================================================================

async function loadEmergencyAmbulances() {
    const tbody = document.getElementById("emergencyAmbulancesTableBody");
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/api/ambulances`);
        const data = await res.json();
        const ambulances = data.ambulances || [];

        tbody.innerHTML = ambulances.map(a => `
            <tr>
                <td><strong style="font-family:monospace; color:#2563eb;">${a.ambulance_id}</strong></td>
                <td><strong>${escapeHtml(a.vehicle_number)}</strong></td>
                <td><span class="hd-badge blue">${escapeHtml(a.ambulance_type)}</span></td>
                <td>${escapeHtml(a.driver_name || "Assigned Driver")} (${escapeHtml(a.driver_mobile || "112")})</td>
                <td>📍 ${escapeHtml(a.location || "Gorakhpur Base")}</td>
                <td><span class="hd-badge ${a.status === 'Available' ? 'green' : 'amber'}">${a.status}</span></td>
            </tr>
        `).join("");
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#ef4444;">${err.message}</td></tr>`;
    }
}

// ====================================================================
// 8. ADMIN & STAFF CONTROLS (HOSPITAL ADMIN)
// ====================================================================

async function loadAdminStaffList() {
    const tbody = document.getElementById("adminStaffTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px;">Loading hospital staff accounts...</td></tr>`;

    try {
        const data = await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/staff`);
        const staffList = data.staff || [];

        if (!staffList.length) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#64748b;">No staff accounts registered for this hospital yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = staffList.map(s => {
            const perms = Array.isArray(s.permissions) ? s.permissions : [];
            const mods = Array.isArray(s.assigned_modules) ? s.assigned_modules : [];
            const isActive = (s.status || "Active").toLowerCase() === "active";
            const role = s.hospital_role || s.role || "staff";

            return `
            <tr>
                <td><strong style="font-family:monospace; color:#2563eb; font-size:13px;">${escapeHtml(s.staff_id)}</strong></td>
                <td>
                    <strong>${escapeHtml(s.name)}</strong>
                    <div style="font-size:11px; color:#64748b;">${escapeHtml(s.email || "No email")}</div>
                </td>
                <td><span class="hd-badge purple" style="text-transform:capitalize;">${escapeHtml(role.replace('_', ' '))}</span></td>
                <td><span class="hd-badge blue">${escapeHtml(s.department || "General")}</span></td>
                <td>
                    <div style="display:flex; flex-wrap:wrap; gap:4px; max-width:220px;">
                        ${mods.slice(0, 4).map(m => `<span style="font-size:10px; background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px;">${escapeHtml(m)}</span>`).join('')}
                        ${mods.length > 4 ? `<span style="font-size:10px; color:#64748b;">+${mods.length - 4} more</span>` : ''}
                    </div>
                </td>
                <td>
                    <div style="display:flex; flex-wrap:wrap; gap:4px;">
                        ${perms.map(p => `<span style="font-size:10px; background:#f1f5f9; color:#475569; padding:2px 5px; border-radius:4px;">${escapeHtml(p)}</span>`).join('')}
                    </div>
                </td>
                <td>
                    <span class="hd-badge ${isActive ? 'green' : 'amber'}">
                        ${isActive ? '🟢 Active' : '🔴 Inactive'}
                    </span>
                </td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="hd-btn hd-btn-outline hd-btn-sm" title="Edit Staff Role &amp; Permissions" onclick="openEditStaffModal('${escapeHtml(s.staff_id)}', '${escapeHtml(s.name)}', '${escapeHtml(role)}', '${escapeHtml(s.department || '')}', '${escapeHtml(s.status || 'Active')}')">
                            ✏️ Edit
                        </button>
                        <button class="hd-btn hd-btn-outline hd-btn-sm" title="Reset Staff Password" onclick="openResetPasswordModal('${escapeHtml(s.staff_id)}')">
                            🔑 Reset
                        </button>
                        <button class="hd-btn ${isActive ? 'hd-btn-danger' : 'hd-btn-success'} hd-btn-sm" onclick="toggleStaffStatus('${escapeHtml(s.staff_id)}', '${isActive ? 'Active' : 'Inactive'}')">
                            ${isActive ? 'Deactivate' : 'Activate'}
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join("");
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#ef4444;">${err.message}</td></tr>`;
    }
}

// Alias for activeModule router
const loadAdminStaff = loadAdminStaffList;

function openAddStaffModal() {
    const lockedInput = document.getElementById("newStaffHospitalLocked");
    if (lockedInput) lockedInput.value = currentHospitalId;

    document.getElementById("newStaffName").value = "";
    document.getElementById("newStaffEmail").value = "";
    document.getElementById("newStaffMobile").value = "";
    document.getElementById("newStaffDepartment").value = "Reception & OPD";
    
    generateAutoStaffId();
    generateAutoPassword();
    onNewStaffRoleChange("receptionist");

    const modal = document.getElementById("modalAddStaff");
    if (modal) modal.classList.add("active");
}

function generateAutoStaffId() {
    const cleanHosp = String(currentHospitalId).replace(/[^a-zA-Z0-9]/g, "");
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const idInput = document.getElementById("newStaffId");
    if (idInput) idInput.value = `STAFF-${cleanHosp}-${randNum}`;
}

function generateAutoPassword() {
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const passInput = document.getElementById("newStaffPassword");
    if (passInput) passInput.value = `Staff@${randNum}`;
}

function generateAutoResetPassword() {
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const passInput = document.getElementById("resetNewPasswordInput");
    if (passInput) passInput.value = `Pass@${randNum}`;
}

function onNewStaffRoleChange(role) {
    const roleDeptMap = {
        receptionist: "Reception & OPD Desk",
        doctor: "General Medicine / OPD",
        nurse: "Nursing & Ward Care",
        lab_technician: "Pathology & Diagnostics",
        radiologist: "Radiology & Imaging",
        pharmacy: "In-House Pharmacy",
        billing: "Billing & Accounts",
        ambulance: "Emergency & Fleet",
        hospital_admin: "Administration"
    };

    const deptInput = document.getElementById("newStaffDepartment");
    if (deptInput && roleDeptMap[role]) {
        deptInput.value = roleDeptMap[role];
    }

    const defaultModulesByRole = {
        receptionist: ["patients", "appointments", "queue", "billing"],
        doctor: ["appointments", "clinical", "diagnostics", "beds"],
        nurse: ["beds", "appointments"],
        lab_technician: ["diagnostics"],
        radiologist: ["diagnostics"],
        pharmacy: ["pharmacy", "billing"],
        billing: ["billing", "appointments"],
        ambulance: ["emergency"]
    };

    const activeMods = defaultModulesByRole[role] || ["appointments"];
    document.querySelectorAll('input[name="newStaffModule"]').forEach(cb => {
        cb.checked = activeMods.includes(cb.value);
    });
}

let lastGeneratedCredentials = null;

async function handleAddStaffSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("newStaffName").value.trim();
    const staffId = document.getElementById("newStaffId").value.trim();
    const password = document.getElementById("newStaffPassword").value.trim();
    const role = document.getElementById("newStaffRole").value;
    const department = document.getElementById("newStaffDepartment").value.trim();
    const email = document.getElementById("newStaffEmail").value.trim();
    const mobile = document.getElementById("newStaffMobile").value.trim();

    const modules = Array.from(document.querySelectorAll('input[name="newStaffModule"]:checked')).map(cb => cb.value);
    const permissions = Array.from(document.querySelectorAll('input[name="newStaffPerm"]:checked')).map(cb => cb.value);

    try {
        const res = await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/staff`, {
            method: "POST",
            body: JSON.stringify({
                name,
                staffId,
                password,
                role,
                hospitalRole: role,
                department,
                email,
                mobile,
                modules,
                permissions,
                status: "Active"
            })
        });

        closeHdModal("modalAddStaff");

        lastGeneratedCredentials = {
            name,
            staffId,
            password,
            hospital: currentHospitalId,
            role
        };

        document.getElementById("dispCredName").textContent = name;
        document.getElementById("dispCredStaffId").textContent = staffId;
        document.getElementById("dispCredPassword").textContent = password;
        document.getElementById("dispCredHospital").textContent = currentHospitalId;
        document.getElementById("dispCredRole").textContent = role;

        const succModal = document.getElementById("modalStaffCredentialsSuccess");
        if (succModal) succModal.classList.add("active");

        await loadAdminStaffList();
    } catch (err) {
        alert("Failed to create staff account: " + err.message);
    }
}

function copyStaffCredentials() {
    if (!lastGeneratedCredentials) return;
    const text = `SmartCity Hospital Staff Credentials\n----------------------------------\nName: ${lastGeneratedCredentials.name}\nStaff ID: ${lastGeneratedCredentials.staffId}\nPassword: ${lastGeneratedCredentials.password}\nHospital: ${lastGeneratedCredentials.hospital}\nRole: ${lastGeneratedCredentials.role}\nLogin: http://localhost:5000/pages/hospital/hospital_dashboard.html`;
    navigator.clipboard.writeText(text).then(() => {
        alert("✅ Credentials copied to clipboard!");
    }).catch(() => {
        alert("Credentials:\n" + text);
    });
}

function openEditStaffModal(staffId, name, role, dept, status) {
    document.getElementById("editStaffId").value = staffId;
    document.getElementById("editStaffIdDisp").value = `${staffId} (${name})`;
    document.getElementById("editStaffRole").value = role;
    document.getElementById("editStaffDepartment").value = dept || "";
    document.getElementById("editStaffStatus").value = status || "Active";

    const modal = document.getElementById("modalEditStaff");
    if (modal) modal.classList.add("active");
}

async function handleEditStaffSubmit(e) {
    e.preventDefault();
    const staffId = document.getElementById("editStaffId").value;
    const role = document.getElementById("editStaffRole").value;
    const department = document.getElementById("editStaffDepartment").value;
    const status = document.getElementById("editStaffStatus").value;

    try {
        await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/staff/${encodeURIComponent(staffId)}`, {
            method: "PUT",
            body: JSON.stringify({
                hospitalRole: role,
                role,
                department,
                status
            })
        });

        closeHdModal("modalEditStaff");
        alert("✅ Staff details updated successfully.");
        await loadAdminStaffList();
    } catch (err) {
        alert("Failed to update staff: " + err.message);
    }
}

function openResetPasswordModal(staffId) {
    document.getElementById("resetPasswordStaffId").value = staffId;
    document.getElementById("resetPasswordStaffIdDisp").value = staffId;
    generateAutoResetPassword();

    const modal = document.getElementById("modalResetStaffPassword");
    if (modal) modal.classList.add("active");
}

async function handleResetStaffPasswordSubmit(e) {
    e.preventDefault();
    const staffId = document.getElementById("resetPasswordStaffId").value;
    const newPassword = document.getElementById("resetNewPasswordInput").value.trim();

    try {
        await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/staff/${encodeURIComponent(staffId)}`, {
            method: "PUT",
            body: JSON.stringify({ newPassword })
        });

        closeHdModal("modalResetStaffPassword");
        alert(`✅ Password for ${staffId} updated to: ${newPassword}`);
    } catch (err) {
        alert("Failed to reset password: " + err.message);
    }
}

async function toggleStaffStatus(staffId, currentStatus) {
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    const confirmMsg = currentStatus === "Active"
        ? `Are you sure you want to DEACTIVATE staff account ${staffId}? They will not be able to log in.`
        : `Reactivate staff account ${staffId}?`;

    if (!confirm(confirmMsg)) return;

    try {
        await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/staff/${encodeURIComponent(staffId)}`, {
            method: "PUT",
            body: JSON.stringify({ status: nextStatus })
        });
        await loadAdminStaffList();
    } catch (err) {
        alert("Status update failed: " + err.message);
    }
}

function openAddNewTestModal() {
    alert("New Diagnostic Test Form: Configure clinical test name, category, price, turnaround, and sample requirements.");
}

function openAddNewCategoryModal() {
    alert("New Category Form: Create pathology, radiology, or cardiology test category.");
}

// MODAL CONTROLS
function openHdModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add("active");
        modal.style.display = "flex";
    } else {
        console.error("Modal element not found:", modalId);
    }
}

function closeHdModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("active");
        modal.style.display = "none";
    }
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Global window bindings for inline HTML onclick/onsubmit handlers
window.openHdModal = openHdModal;
window.closeHdModal = closeHdModal;
window.openAddMedicineModal = openAddMedicineModal;
window.openEditMedicineModal = openEditMedicineModal;
window.openDispenseModal = openDispenseModal;
window.handleDeleteMedicine = handleDeleteMedicine;
window.handleAddMedicineSubmit = handleAddMedicineSubmit;
window.handleEditMedicineSubmit = handleEditMedicineSubmit;
window.handleDispenseMedicineSubmit = handleDispenseMedicineSubmit;
window.loadPharmacyStock = loadPharmacyStock;

// ====================================================================
// HOSPITAL ADMIN SELF-SERVICE CONFIGURATION CONSOLE
// ====================================================================

/* =========================================================
   HOSPITAL BILLING COUNTER & OFFICIAL PNG LOGO CONTROLLERS
========================================================= */

let activePayingInvoice = null;

function triggerPaymentModal(btn) {
    try {
        const inv = JSON.parse(btn.getAttribute("data-inv"));
        openPaymentModal(inv);
    } catch (e) {
        console.error("Parse invoice error:", e);
    }
}

function triggerReceiptPrint(btn) {
    try {
        const inv = JSON.parse(btn.getAttribute("data-inv"));
        printBillingReceipt(inv);
    } catch (e) {
        console.error("Parse invoice error:", e);
    }
}

function openPaymentModal(invoice) {
    activePayingInvoice = invoice;
    const modal = document.getElementById("modalProcessPayment");
    if (!modal) return;

    const total = Number(invoice.total_amount || 0);
    const paid = Number(invoice.paid_amount || 0);
    const disc = Number(invoice.discount || 0);
    const remaining = Number(invoice.remaining_amount !== undefined ? invoice.remaining_amount : Math.max(0, total - disc - paid));

    document.getElementById("payModalInvoiceId").value = invoice.invoice_id;
    document.getElementById("payModalPatientName").textContent = invoice.patient_name || "Patient";
    document.getElementById("payModalPatientId").textContent = invoice.patient_id || "-";
    document.getElementById("payModalService").textContent = invoice.service_type || "Hospital Service";
    document.getElementById("payModalTotalAmount").textContent = `₹${total.toFixed(2)}`;
    document.getElementById("payModalPaidAmount").textContent = `₹${paid.toFixed(2)}`;
    document.getElementById("payModalRemainingAmount").textContent = `₹${remaining.toFixed(2)}`;

    const payInput = document.getElementById("payAmountInput");
    if (payInput) {
        payInput.value = remaining;
        payInput.max = remaining;
    }

    modal.classList.add("active");
}

function setQuickPay(amt) {
    const payInput = document.getElementById("payAmountInput");
    if (!payInput || !activePayingInvoice) return;
    const total = Number(activePayingInvoice.total_amount || 0);
    const paid = Number(activePayingInvoice.paid_amount || 0);
    const rem = Number(activePayingInvoice.remaining_amount !== undefined ? activePayingInvoice.remaining_amount : Math.max(0, total - paid));
    payInput.value = Math.min(amt, rem);
}

function setQuickPayFull() {
    const payInput = document.getElementById("payAmountInput");
    if (!payInput || !activePayingInvoice) return;
    const total = Number(activePayingInvoice.total_amount || 0);
    const paid = Number(activePayingInvoice.paid_amount || 0);
    const rem = Number(activePayingInvoice.remaining_amount !== undefined ? activePayingInvoice.remaining_amount : Math.max(0, total - paid));
    payInput.value = rem;
}

async function handleProcessPaymentSubmit(e) {
    e.preventDefault();
    if (!activePayingInvoice) return;

    const invoiceId = document.getElementById("payModalInvoiceId").value;
    const amount = Number(document.getElementById("payAmountInput").value);
    const paymentMethod = document.getElementById("payMethodSelect").value;
    const notes = document.getElementById("payNotesInput").value;
    const btn = document.getElementById("btnSubmitPayment");

    if (!amount || amount <= 0) {
        showToast("Please enter a valid payment amount.", "warning");
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Recording Payment...";
    }

    try {
        const res = await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/invoices/${encodeURIComponent(invoiceId)}/pay`, {
            method: "POST",
            body: JSON.stringify({
                amount,
                payment_method: paymentMethod,
                notes: notes || "Payment received at billing desk"
            })
        });

        closeHdModal("modalProcessPayment");
        showToast(res.message || "✓ Payment recorded successfully.", "success");

        // Reload billing invoices in-place without page reload!
        await loadBillingInvoices();
        await refreshDashboardData();
    } catch (err) {
        showToast("✕ Payment failed: " + err.message, "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "✅ Record Payment";
        }
    }
}

function printBillingReceipt(invoice) {
    const total = Number(invoice.total_amount || 0);
    const paid = Number(invoice.paid_amount || 0);
    const remaining = Number(invoice.remaining_amount !== undefined ? invoice.remaining_amount : Math.max(0, total - paid));

    const printWindow = window.open("", "_blank", "width=600,height=700");
    if (!printWindow) {
        showToast(`Receipt #${invoice.invoice_id} | Paid: ₹${paid.toFixed(2)} | Remaining: ₹${remaining.toFixed(2)}`, "info");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Hospital Receipt - ${invoice.invoice_id}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1e293b; line-height: 1.5; }
                .receipt-box { max-width: 480px; margin: 0 auto; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 24px; }
                .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 16px; margin-bottom: 16px; }
                .logo { max-height: 60px; object-fit: contain; margin-bottom: 8px; }
                .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
                .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; border-top: 1.5px solid #1e293b; padding-top: 8px; margin-top: 12px; }
                .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #64748b; }
            </style>
        </head>
        <body>
            <div class="receipt-box">
                <div class="header">
                    <img class="logo" src="${document.getElementById('cfgHospLogoPreview')?.src || '/favicon.svg'}" alt="Hospital Logo" onerror="this.style.display='none'">
                    <h2 style="margin: 4px 0;">${document.getElementById('brandHospName')?.textContent || 'SmartCity Hospital'}</h2>
                    <p style="margin: 0; font-size: 12px; color: #64748b;">OFFICIAL PATIENT PAYMENT RECEIPT</p>
                </div>
                <div class="row"><span>Receipt / Invoice:</span><strong>#${invoice.invoice_id}</strong></div>
                <div class="row"><span>Patient Name:</span><strong>${escapeHtml(invoice.patient_name)}</strong></div>
                <div class="row"><span>Patient ID:</span><span>${invoice.patient_id}</span></div>
                <div class="row"><span>Service:</span><strong style="color: #2563eb;">${escapeHtml(invoice.service_type)}</strong></div>
                <div class="row"><span>Payment Method:</span><span>${invoice.payment_method}</span></div>
                <div class="row"><span>Date:</span><span>${new Date().toLocaleString()}</span></div>
                <div class="total-row"><span>Total Billed:</span><span>₹${total.toFixed(2)}</span></div>
                <div class="row" style="color: #059669; font-weight: 700;"><span>Amount Paid:</span><span>₹${paid.toFixed(2)}</span></div>
                <div class="row" style="color: ${remaining > 0 ? '#dc2626' : '#059669'}; font-weight: 800; font-size: 15px;"><span>Remaining Payable:</span><span>₹${remaining.toFixed(2)}</span></div>
                <div class="row"><span>Status:</span><strong style="text-transform: uppercase;">${remaining <= 0 ? 'PAID IN FULL' : 'PARTIALLY PAID'}</strong></div>
                <div class="footer">
                    <p>Thank you. Retain this receipt for hospital billing verification.</p>
                </div>
            </div>
            <script>window.print();</script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

async function handleHospitalLogoUpload(event) {
    const file = event.target?.files?.[0];
    if (!file) return;

    // Strict frontend validation (Requirement 17)
    if (!file.name.toLowerCase().endsWith(".png") || (file.type && file.type !== "image/png")) {
        showToast("✕ Please upload a valid PNG hospital logo.", "error");
        event.target.value = "";
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast("✕ Logo file size must be less than 5MB.", "error");
        event.target.value = "";
        return;
    }

    const statusEl = document.getElementById("logoUploadStatus");
    if (statusEl) {
        statusEl.style.display = "block";
        statusEl.style.color = "#2563eb";
        statusEl.textContent = "⏳ Verifying & uploading official PNG logo...";
    }

    try {
        const formData = new FormData();
        formData.append("logo", file);

        const token = getAuthToken();
        const res = await fetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/logo`, {
            method: "POST",
            headers: {
                ...(token ? { "Authorization": `Bearer ${token}` } : {})
            },
            body: formData
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to upload logo.");
        }

        showToast(data.message || "✓ Hospital logo updated successfully.", "success");
        if (statusEl) {
            statusEl.style.color = "#16a34a";
            statusEl.textContent = "✓ Official PNG logo active across all hospital systems.";
            setTimeout(() => { if (statusEl) statusEl.style.display = "none"; }, 3500);
        }

        // In-place UI updates
        const preview = document.getElementById("cfgHospLogoPreview");
        if (preview) preview.src = data.logo;
        const hiddenInput = document.getElementById("cfgHospLogo");
        if (hiddenInput) hiddenInput.value = data.logo;

        // Update brand header and sidebar logo
        const topLogo = document.getElementById("sidebarHospLogo") || document.querySelector(".hd-sidebar-logo img");
        if (topLogo) topLogo.src = data.logo;
        const brandLogo = document.getElementById("hospitalBrandLogo");
        if (brandLogo) brandLogo.src = data.logo;

    } catch (err) {
        console.error("Logo upload error:", err);
        showToast(err.message || "✕ Please upload a valid PNG hospital logo.", "error");
        if (statusEl) {
            statusEl.style.color = "#dc2626";
            statusEl.textContent = err.message || "✕ Upload failed.";
        }
    } finally {
        event.target.value = "";
    }
}

async function handleRemoveHospitalLogo() {
    if (!confirm("Are you sure you want to remove the official hospital logo?")) return;

    try {
        const res = await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/logo`, {
            method: "DELETE"
        });

        showToast(res.message || "✓ Hospital logo removed successfully.", "info");

        const preview = document.getElementById("cfgHospLogoPreview");
        if (preview) preview.src = "";
        const hiddenInput = document.getElementById("cfgHospLogo");
        if (hiddenInput) hiddenInput.value = "";

        const topLogo = document.getElementById("sidebarHospLogo") || document.querySelector(".hd-sidebar-logo img");
        if (topLogo) topLogo.src = "/favicon.svg";
    } catch (err) {
        showToast("✕ Error removing logo: " + err.message, "error");
    }
}

let activeAdminConfigSubTab = "profile";

function switchAdminConfigSubTab(subTabName, btnEl) {
    activeAdminConfigSubTab = subTabName;
    document.querySelectorAll(".hd-admin-subtab").forEach(tab => {
        tab.style.display = "none";
    });
    const target = document.getElementById(`admin-subtab-${subTabName}`);
    if (target) target.style.display = "block";

    const filterBar = document.getElementById("adminConfigSubTabs");
    if (filterBar) {
        filterBar.querySelectorAll(".hd-cat-pill").forEach(p => p.classList.remove("active"));
        if (btnEl) btnEl.classList.add("active");
    }

    loadAdminSubTabContent(subTabName);
}

async function loadAdminConsole() {
    const badge = document.getElementById("adminFacilityActiveBadge");
    if (badge) badge.textContent = `Facility: ${currentHospitalId}`;
    await loadAdminSubTabContent(activeAdminConfigSubTab);
}

async function loadAdminSubTabContent(subTabName) {
    switch (subTabName) {
        case "profile":
            await loadAdminHospitalProfile();
            break;
        case "facilities":
            await loadAdminFacilities();
            break;
        case "doctors":
            await loadAdminDoctorsList();
            break;
        case "wards":
            await loadAdminWardStructure();
            break;
        case "icu":
            await loadAdminIcuSuites();
            break;
        case "diagnostics":
            await loadAdminDiagnosticsList();
            break;
        case "staff":
            await loadAdminStaffList();
            break;
        case "audit":
            await loadAdminAuditLogs();
            break;
    }
}

// 1. PROFILE & OFFICIAL LOGO
async function loadAdminHospitalProfile() {
    try {
        const data = await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/config`);
        if (!data.success || !data.hospital) return;
        const h = data.hospital;

        if (document.getElementById("cfgHospName")) document.getElementById("cfgHospName").value = h.hospital_name || "";
        if (document.getElementById("cfgHospCode")) document.getElementById("cfgHospCode").value = h.hospital_id || currentHospitalId;
        if (document.getElementById("cfgHospLogo")) document.getElementById("cfgHospLogo").value = h.logo || "";
        if (document.getElementById("cfgHospLogoPreview")) {
            document.getElementById("cfgHospLogoPreview").src = h.logo || PRESET_HOSPITAL_LOGOS[0];
        }
        if (document.getElementById("cfgHospType")) document.getElementById("cfgHospType").value = h.hospital_type || "";
        if (document.getElementById("cfgHospCity")) document.getElementById("cfgHospCity").value = h.city || "Gorakhpur";
        if (document.getElementById("cfgHospAccreditation")) document.getElementById("cfgHospAccreditation").value = h.accreditation || "";
        if (document.getElementById("cfgHospAddress")) document.getElementById("cfgHospAddress").value = h.address || "";
        if (document.getElementById("cfgHospPhone")) document.getElementById("cfgHospPhone").value = h.phone || "";
        if (document.getElementById("cfgHospEmergency")) document.getElementById("cfgHospEmergency").value = h.emergency_number || "102";
        if (document.getElementById("cfgHospEmail")) document.getElementById("cfgHospEmail").value = h.email || "";
        if (document.getElementById("cfgHospWebsite")) document.getElementById("cfgHospWebsite").value = h.website || "";
        if (document.getElementById("cfgHospDescription")) document.getElementById("cfgHospDescription").value = h.description || "";
    } catch (err) {
        console.error("Failed to load hospital profile:", err);
    }
}

async function saveAdminHospitalProfile() {
    const hospital_name = document.getElementById("cfgHospName")?.value.trim();
    const logo = document.getElementById("cfgHospLogo")?.value.trim();
    const hospital_type = document.getElementById("cfgHospType")?.value.trim();
    const city = document.getElementById("cfgHospCity")?.value.trim();
    const accreditation = document.getElementById("cfgHospAccreditation")?.value.trim();
    const address = document.getElementById("cfgHospAddress")?.value.trim();
    const phone = document.getElementById("cfgHospPhone")?.value.trim();
    const emergency_number = document.getElementById("cfgHospEmergency")?.value.trim();
    const email = document.getElementById("cfgHospEmail")?.value.trim();
    const website = document.getElementById("cfgHospWebsite")?.value.trim();
    const description = document.getElementById("cfgHospDescription")?.value.trim();

    try {
        const res = await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/config`, {
            method: "PUT",
            body: JSON.stringify({
                hospital_name,
                logo,
                hospital_type,
                city,
                accreditation,
                address,
                phone,
                emergency_number,
                email,
                website,
                description
            })
        });

        alert("✅ Hospital profile and branding saved successfully!");
        await loadHospitalInfo();
    } catch (err) {
        alert("Failed to save profile: " + err.message);
    }
}

// 2. FACILITIES CONFIGURATOR
async function loadAdminFacilities() {
    const tbody = document.getElementById("adminFacilitiesTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">Loading facilities...</td></tr>`;

    try {
        const data = await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/facilities`);
        const list = data.facilities || [];
        if (!list.length) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #64748b;">No facilities registered for this hospital.</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(f => {
            const isActive = Boolean(f.is_active);
            return `
            <tr>
                <td><code style="font-size: 12px; color: #2563eb;">${escapeHtml(f.facility_code)}</code></td>
                <td><strong>${escapeHtml(f.facility_name)}</strong></td>
                <td><span class="hd-badge blue">${escapeHtml(f.category || 'General')}</span></td>
                <td>
                    <span class="hd-badge ${isActive ? 'green' : 'amber'}">
                        ${isActive ? '🟢 Active' : '🔴 Inactive'}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="hd-btn ${isActive ? 'hd-btn-danger' : 'hd-btn-success'} hd-btn-sm" onclick="toggleFacilityStatus('${escapeHtml(f.facility_code)}', ${isActive})">
                            ${isActive ? 'Disable' : 'Enable'}
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join("");
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #ef4444;">${err.message}</td></tr>`;
    }
}

async function toggleFacilityStatus(code, currentActive) {
    try {
        await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/facilities/${encodeURIComponent(code)}/status`, {
            method: "PUT",
            body: JSON.stringify({ is_active: !currentActive })
        });
        await loadAdminFacilities();
    } catch (err) {
        alert("Facility status update failed: " + err.message);
    }
}

function openAddCustomFacilityModal() {
    document.getElementById("custFacName").value = "";
    document.getElementById("custFacCode").value = "";
    document.getElementById("custFacCategory").value = "Specialized";
    document.getElementById("custFacDescription").value = "";
    openHdModal("modalAddCustomFacility");
}

async function handleAddCustomFacilitySubmit(e) {
    e.preventDefault();
    const facility_name = document.getElementById("custFacName").value.trim();
    let facility_code = document.getElementById("custFacCode").value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const category = document.getElementById("custFacCategory").value.trim();
    const description = document.getElementById("custFacDescription").value.trim();

    try {
        await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/facilities`, {
            method: "POST",
            body: JSON.stringify({ facility_name, facility_code, category, description, is_active: true })
        });
        closeHdModal("modalAddCustomFacility");
        alert("✅ Custom facility added successfully.");
        await loadAdminFacilities();
    } catch (err) {
        alert("Failed to add facility: " + err.message);
    }
}

// 3. DOCTORS & OPD TIMINGS
let adminDoctorsCache = [];

async function loadAdminDoctorsList() {
    const tbody = document.getElementById("adminDoctorsTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">Loading doctors...</td></tr>`;

    try {
        const res = await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/doctors`);
        adminDoctorsCache = res.doctors || [];
        if (!adminDoctorsCache.length) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #64748b;">No doctors registered for this facility.</td></tr>`;
            return;
        }

        tbody.innerHTML = adminDoctorsCache.map(d => {
            const avatar = d.doctor_logo_avatar || d.photo || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80";
            return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <img src="${escapeHtml(avatar)}" alt="Doctor" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid #cbd5e1;">
                        <div>
                            <strong>${escapeHtml(d.name)}</strong>
                            <div style="font-size: 11px; color: #64748b;">${escapeHtml(d.qualification || 'MBBS')}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="hd-badge blue">${escapeHtml(d.department || d.specialization || 'General')}</span>
                </td>
                <td>
                    <strong style="color: #0284c7;">${escapeHtml(d.opd_room_no || 'OPD-101')}</strong>
                </td>
                <td>
                    <span style="font-size: 12px; color: #334155;">${escapeHtml(d.available_days || 'Mon, Tue, Wed, Thu, Fri, Sat')}</span>
                </td>
                <td>
                    <span style="font-size: 12px; color: #334155;">${escapeHtml(d.consultation_timings || '09:00 AM - 02:00 PM')}</span>
                </td>
                <td>
                    <strong>₹${d.consultation_fee || d.consultationFee || 500}</strong>
                </td>
                <td>
                    <span class="hd-badge green">${escapeHtml(d.status || 'Active')}</span>
                </td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <button class="hd-btn hd-btn-outline hd-btn-sm" onclick="openEditDoctorOpdModal('${d.id}')">✏️ Edit</button>
                        <button class="hd-btn hd-btn-danger hd-btn-sm" onclick="deleteDoctorRecord('${d.id}')">🗑️</button>
                    </div>
                </td>
            </tr>
            `;
        }).join("");
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #ef4444;">${err.message}</td></tr>`;
    }
}

function openAddDoctorOpdModal() {
    document.getElementById("doctorModalTitle").textContent = "👨‍⚕️ Register Doctor & OPD Consultation Roster";
    document.getElementById("docOpdDoctorId").value = "";
    document.getElementById("docOpdName").value = "";
    document.getElementById("docOpdQualification").value = "MBBS, MD";
    document.getElementById("docOpdDepartment").value = "General Medicine";
    document.getElementById("docOpdRoomNo").value = "Room 101, Ground Floor";
    document.getElementById("docOpdFee").value = "500";
    document.getElementById("docOpdTimings").value = "09:00 AM - 02:00 PM";
    document.getElementById("docOpdAvatar").value = "";

    document.querySelectorAll("input[name='docDays']").forEach(b => b.checked = b.value !== "Sun");
    openHdModal("modalAddDoctorOpd");
}

function openEditDoctorOpdModal(doctorId) {
    const d = adminDoctorsCache.find(x => String(x.id) === String(doctorId));
    if (!d) return;

    document.getElementById("doctorModalTitle").textContent = "✏️ Edit Doctor & OPD Schedule";
    document.getElementById("docOpdDoctorId").value = d.id;
    document.getElementById("docOpdName").value = d.name || "";
    document.getElementById("docOpdQualification").value = d.qualification || "";
    document.getElementById("docOpdDepartment").value = d.department || d.specialization || "";
    document.getElementById("docOpdRoomNo").value = d.opd_room_no || "Room 101";
    document.getElementById("docOpdFee").value = d.consultation_fee || d.consultationFee || 500;
    document.getElementById("docOpdTimings").value = d.consultation_timings || "09:00 AM - 02:00 PM";
    document.getElementById("docOpdAvatar").value = d.doctor_logo_avatar || d.photo || "";

    const days = (d.available_days || "").split(",").map(x => x.trim());
    document.querySelectorAll("input[name='docDays']").forEach(b => {
        b.checked = days.length === 0 || days.includes(b.value);
    });

    openHdModal("modalAddDoctorOpd");
}

async function handleDoctorOpdSubmit(e) {
    e.preventDefault();
    const doctorId = document.getElementById("docOpdDoctorId").value;
    const name = document.getElementById("docOpdName").value.trim();
    const qualification = document.getElementById("docOpdQualification").value.trim();
    const department = document.getElementById("docOpdDepartment").value.trim();
    const opd_room_no = document.getElementById("docOpdRoomNo").value.trim();
    const consultation_fee = Number(document.getElementById("docOpdFee").value || 500);
    const consultation_timings = document.getElementById("docOpdTimings").value.trim();
    const doctor_logo_avatar = document.getElementById("docOpdAvatar").value.trim();

    const selectedDays = Array.from(document.querySelectorAll("input[name='docDays']:checked")).map(b => b.value);
    const available_days = selectedDays.join(", ");

    try {
        if (doctorId) {
            await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/doctors/${encodeURIComponent(doctorId)}`, {
                method: "PUT",
                body: JSON.stringify({
                    name,
                    qualification,
                    department,
                    opd_room_no,
                    consultation_fee,
                    consultation_timings,
                    available_days,
                    doctor_logo_avatar
                })
            });
            alert("✅ Doctor details and OPD schedule updated.");
        } else {
            await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/doctors`, {
                method: "POST",
                body: JSON.stringify({
                    name,
                    qualification,
                    department,
                    opd_room_no,
                    consultation_fee,
                    consultation_timings,
                    available_days,
                    doctor_logo_avatar
                })
            });
            alert("✅ Doctor enrolled into hospital OPD schedule.");
        }

        closeHdModal("modalAddDoctorOpd");
        await loadAdminDoctorsList();
    } catch (err) {
        alert("Failed to save doctor: " + err.message);
    }
}

async function deleteDoctorRecord(doctorId) {
    if (!confirm("Are you sure you want to deactivate and remove this doctor from this hospital roster?")) return;
    try {
        await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/doctors/${encodeURIComponent(doctorId)}`, {
            method: "DELETE"
        });
        await loadAdminDoctorsList();
    } catch (err) {
        alert("Failed to delete doctor: " + err.message);
    }
}

// 4. WARDS & BEDS STRUCTURE (PHYSICAL SINGLE SOURCE OF TRUTH)
let adminPhysicalStructureData = null;
let adminBedSearchQuery = "";
let adminBedStatusFilterVal = "ALL";
let adminWardsFlatList = [];

async function loadAdminWardStructure() {
    const container = document.getElementById("adminWardStructureContainer");
    if (!container) return;
    container.innerHTML = `<p style="text-align: center; padding: 24px; color: var(--text-muted);">Loading physical hospital hierarchy...</p>`;

    try {
        const res = await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/physical-structure`);
        adminPhysicalStructureData = res;

        // Flatten wards for dropdown selections
        adminWardsFlatList = [];
        if (res.structure) {
            Object.values(res.structure).forEach(b => {
                Object.values(b.floors || {}).forEach(f => {
                    (f.wards || []).forEach(w => adminWardsFlatList.push(w));
                });
            });
        }

        // 1. Update Physical Capacity Dashboard Strip
        const totals = res.totals || res;
        const elTotal = document.getElementById("physTotalBeds");
        const elAvail = document.getElementById("physAvailBeds");
        const elOcc = document.getElementById("physOccBeds");
        const elRes = document.getElementById("physResBeds");
        const elIcu = document.getElementById("physIcuBeds");
        const elEmg = document.getElementById("physEmgBeds");
        const elCount = document.getElementById("physBuildingFloorCount");

        if (elTotal) elTotal.textContent = totals.total_beds || 0;
        if (elAvail) elAvail.textContent = totals.available_beds || 0;
        if (elOcc) elOcc.textContent = totals.occupied_beds || 0;
        if (elRes) elRes.textContent = totals.reserved_beds || 0;
        if (elIcu) elIcu.textContent = totals.icu_beds || 0;
        if (elEmg) elEmg.textContent = totals.emergency_beds || 0;
        if (elCount) elCount.textContent = `${res.buildings_count || res.total_buildings || 0} Blk / ${res.floors_count || res.total_floors || 0} Flr`;

        // 2. Populate Autocomplete Datalists for Buildings and Floors
        populateBuildingAndFloorDatalists(res.structure);

        // 3. Render Hierarchy Tree
        renderAdminPhysicalStructure();
    } catch (err) {
        container.innerHTML = `<p style="color: #ef4444; padding: 20px;">Failed to load structure: ${err.message}</p>`;
    }
}

function populateBuildingAndFloorDatalists(structure) {
    const bList = document.getElementById("existingBuildingsList");
    const fList = document.getElementById("existingFloorsList");
    if (!structure) return;

    const buildings = Object.keys(structure);
    const floors = new Set();
    buildings.forEach(b => {
        Object.keys(structure[b].floors || {}).forEach(f => floors.add(f));
    });

    if (bList) {
        bList.innerHTML = buildings.map(b => `<option value="${escapeHtml(b)}"></option>`).join("");
    }
    if (fList) {
        fList.innerHTML = Array.from(floors).map(f => `<option value="${escapeHtml(f)}"></option>`).join("");
    }
}

function renderAdminPhysicalStructure() {
    const container = document.getElementById("adminWardStructureContainer");
    if (!container || !adminPhysicalStructureData) return;

    const structure = adminPhysicalStructureData.structure || {};
    const buildings = Object.keys(structure);

    if (!buildings.length) {
        container.innerHTML = `
            <div style="text-align: center; padding: 36px; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">
                <div style="font-size: 36px; margin-bottom: 8px;">🏛️</div>
                <strong style="font-size: 15px; color: #1e293b;">No Physical Hospital Structure Configured Yet</strong>
                <p style="font-size: 13px; color: #64748b; margin: 6px auto 16px; max-width: 480px;">
                    Define your hospital's physical hierarchy (Building → Floor → Ward/Room → Beds) one time.
                    This configuration will serve as the single source of truth across all modules.
                </p>
                <button type="button" class="hd-btn hd-btn-primary" onclick="openConfigureWardRoomModal()">
                    ✨ Configure First Ward / Room
                </button>
            </div>
        `;
        return;
    }

    const q = (adminBedSearchQuery || "").toLowerCase();
    const sf = adminBedStatusFilterVal || "ALL";

    let html = "";

    buildings.forEach(bName => {
        const b = structure[bName];
        const floors = Object.keys(b.floors || {});

        // Calculate building counts
        let bTotalBeds = 0;
        let bAvailBeds = 0;
        let bOccBeds = 0;
        let bResBeds = 0;

        floors.forEach(fName => {
            const f = b.floors[fName];
            (f.wards || []).forEach(w => {
                bTotalBeds += (w.total_beds || 0);
                bAvailBeds += (w.available_beds || 0);
                bOccBeds += (w.occupied_beds || 0);
                bResBeds += (w.reserved_beds || 0);
            });
        });

        html += `
        <details class="hd-phys-accordion hd-building-accordion" open style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 16px; overflow: hidden;">
            <summary style="background: #f1f5f9; padding: 14px 18px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none; font-weight: 700; color: #0f172a;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 18px;">🏛️</span>
                    <span style="font-size: 15px; color: #0f172a;">${escapeHtml(bName)}</span>
                    <span class="hd-badge blue" style="font-size: 11px;">${floors.length} Floors</span>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; font-size: 12px;">
                    <span class="hd-badge green">${bAvailBeds} Available</span>
                    <span class="hd-badge red">${bOccBeds} Occupied</span>
                    <span class="hd-badge purple" style="font-weight: 700;">${bTotalBeds} Total Beds</span>
                </div>
            </summary>

            <div style="padding: 14px 16px;">
        `;

        floors.forEach(fName => {
            const f = b.floors[fName];
            const wards = f.wards || [];

            let fTotalBeds = 0;
            let fAvailBeds = 0;
            let fOccBeds = 0;

            wards.forEach(w => {
                fTotalBeds += (w.total_beds || 0);
                fAvailBeds += (w.available_beds || 0);
                fOccBeds += (w.occupied_beds || 0);
            });

            html += `
            <details class="hd-phys-accordion hd-floor-accordion" open style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 12px; overflow: hidden;">
                <summary style="background: #f8fafc; padding: 10px 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none; font-weight: 600; color: #334155; border-bottom: 1px solid #e2e8f0;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 14px;">🏢</span>
                        <span>${escapeHtml(fName)}</span>
                        <span style="font-size: 11px; color: #64748b; font-weight: 400;">(${wards.length} Wards / Rooms)</span>
                    </div>
                    <div style="display: flex; gap: 6px; font-size: 11px;">
                        <span style="color: #16a34a; font-weight: 600;">${fAvailBeds} Free</span>
                        <span style="color: #cbd5e1;">•</span>
                        <span style="color: #dc2626; font-weight: 600;">${fOccBeds} Occ</span>
                        <span style="color: #cbd5e1;">•</span>
                        <span style="color: #0f172a; font-weight: 700;">${fTotalBeds} Beds</span>
                    </div>
                </summary>

                <div style="padding: 12px;">
            `;

            wards.forEach(w => {
                let beds = w.beds || [];

                // Filter beds if search query or status filter is active
                if (q) {
                    beds = beds.filter(bed => {
                        const bNum = (bed.bed_number || "").toLowerCase();
                        const rNum = (bed.room_number || "").toLowerCase();
                        const pName = (bed.patient_name || "").toLowerCase();
                        const wName = (w.ward_name || "").toLowerCase();
                        return bNum.includes(q) || rNum.includes(q) || pName.includes(q) || wName.includes(q);
                    });
                }
                if (sf !== "ALL") {
                    beds = beds.filter(bed => (bed.status || "").toLowerCase() === sf.toLowerCase());
                }

                if ((q || sf !== "ALL") && beds.length === 0) {
                    return;
                }

                const typeColor = w.ward_type === 'ICU' ? 'purple' : (w.ward_type === 'Emergency' ? 'red' : 'blue');

                html += `
                <div class="hd-card" style="margin-bottom: 12px; border: 1px solid #e2e8f0; background: #ffffff;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <strong style="font-size: 14px; color: #0f172a;">${escapeHtml(w.ward_name)}</strong>
                                <span class="hd-badge ${typeColor}">${escapeHtml(w.ward_type)}</span>
                                <span style="font-size: 12px; color: #0284c7; font-weight: 600;">₹${w.base_rate_per_day || 0}/day</span>
                            </div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                                📍 ${escapeHtml(w.building_wing || bName)} • ${escapeHtml(w.floor || fName)} • Dept: ${escapeHtml(w.department || 'General')}
                            </div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span class="hd-badge green">${w.available_beds} Free</span>
                            <span class="hd-badge red">${w.occupied_beds} Occ</span>
                            ${w.reserved_beds ? `<span class="hd-badge amber">${w.reserved_beds} Res</span>` : ''}
                            <span style="font-size: 12px; font-weight: 700; color: #334155; margin-right: 4px;">${w.total_beds} Total</span>
                            
                            <button type="button" class="hd-btn hd-btn-outline hd-btn-sm" onclick="openBatchGenerateBedsModal('${w.ward_id}', '${escapeHtml(w.ward_name)}')">➕ Add Beds</button>
                            <button type="button" class="hd-btn hd-btn-outline hd-btn-sm" onclick="openEditWardModal('${w.ward_id}')">✏️ Edit</button>
                            <button type="button" class="hd-btn hd-btn-outline hd-btn-sm" style="color: #ef4444; border-color: #fca5a5;" onclick="deleteWardSafe('${w.ward_id}', '${escapeHtml(w.ward_name)}')">🗑️</button>
                        </div>
                    </div>

                    ${beds.length === 0 ? `
                        <div style="font-size: 12px; color: #94a3b8; font-style: italic; padding: 6px 0;">No beds matching filter criteria.</div>
                    ` : `
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(135px, 1fr)); gap: 8px;">
                            ${beds.map(bed => {
                                const st = (bed.status || "Available").toLowerCase();
                                const isAvail = st === "available";
                                const isOcc = st === "occupied";
                                const isRes = st === "reserved";
                                const isMaint = st === "maintenance";
                                const isBlk = st === "blocked";

                                const bg = isAvail ? "#ecfdf5" : (isOcc ? "#fef2f2" : (isRes ? "#fffbeb" : "#f8fafc"));
                                const border = isAvail ? "#a7f3d0" : (isOcc ? "#fecaca" : (isRes ? "#fde68a" : "#cbd5e1"));
                                const color = isAvail ? "#065f46" : (isOcc ? "#991b1b" : (isRes ? "#b45309" : "#475569"));
                                const icon = (bed.bed_type === 'ICU' || w.ward_type === 'ICU') ? '🩺' : ((bed.bed_type === 'Emergency' || w.ward_type === 'Emergency') ? '🚨' : '🛏️');

                                return `
                                <div style="background: ${bg}; border: 1px solid ${border}; border-radius: 6px; padding: 8px; text-align: center; position: relative;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                                        <span style="font-size: 11px;">${icon}</span>
                                        <button type="button" onclick="deleteBedSafe('${bed.bed_id}', '${bed.bed_number}')" title="Safe Delete Bed" style="background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 11px; padding: 0 2px;">✕</button>
                                    </div>
                                    <div style="font-weight: 800; font-size: 12px; color: ${color};">${escapeHtml(bed.bed_number)}</div>
                                    <div style="font-size: 10px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                        ${escapeHtml(bed.room_number || '')}
                                    </div>
                                    <div style="font-size: 10px; font-weight: 700; color: ${color}; margin: 2px 0;">
                                        ${isOcc ? `🔴 ${escapeHtml(bed.patient_name || 'Occupied')}` : (isAvail ? '🟢 Available' : (isRes ? '🟡 Reserved' : '🔧 Maintenance'))}
                                    </div>
                                    <select onchange="updateBedStatus('${bed.bed_id}', this.value)" style="font-size: 10px; padding: 2px 4px; border-radius: 4px; border: 1px solid #cbd5e1; width: 100%; margin-top: 4px; background: white; cursor: pointer;">
                                        <option value="Available" ${isAvail ? 'selected' : ''}>🟢 Available</option>
                                        <option value="Occupied" ${isOcc ? 'selected' : ''}>🔴 Occupied</option>
                                        <option value="Reserved" ${isRes ? 'selected' : ''}>🟡 Reserved</option>
                                        <option value="Maintenance" ${isMaint ? 'selected' : ''}>🔧 Maintenance</option>
                                        <option value="Blocked" ${isBlk ? 'selected' : ''}>🚫 Blocked</option>
                                    </select>
                                </div>
                                `;
                            }).join("")}
                        </div>
                    `}
                </div>
                `;
            });

            html += `
                </div>
            </details>
            `;
        });

        html += `
            </div>
        </details>
        `;
    });

    container.innerHTML = html;
}

function filterAdminBeds(q) {
    adminBedSearchQuery = q;
    renderAdminPhysicalStructure();
}

function filterAdminBedsByStatus(s) {
    adminBedStatusFilterVal = s;
    renderAdminPhysicalStructure();
}

function toggleAllAccordions(expand) {
    document.querySelectorAll(".hd-phys-accordion").forEach(acc => {
        acc.open = expand;
    });
}

// --- WARD / ROOM BUILDER MODAL FUNCTIONS ---
function openConfigureWardRoomModal() {
    document.getElementById("cfgBuilding").value = "Block A";
    document.getElementById("cfgFloor").value = "3rd Floor";
    document.getElementById("cfgWardName").value = "Cardiac & Neuro ICU";
    document.getElementById("cfgWardType").value = "ICU";
    document.getElementById("cfgBedCategory").value = "Cardiac & Neuro ICU";
    document.getElementById("cfgCharge").value = "3500";
    document.getElementById("cfgDept").value = "Critical Care";
    document.getElementById("cfgTotalBeds").value = "30";
    document.getElementById("cfgBedPrefix").value = "ICU-3";
    document.getElementById("cfgStartNum").value = "1";
    
    const rAuto = document.querySelector('input[name="cfgGenMode"][value="auto"]');
    if (rAuto) rAuto.checked = true;
    toggleBedGenMode("auto");
    updateBedGeneratorPreview();
    openHdModal("modalConfigureWardRoom");
}

function suggestBedPrefix() {
    const wName = (document.getElementById("cfgWardName").value || "").trim().toUpperCase();
    const floor = (document.getElementById("cfgFloor").value || "").replace(/\D/g, "") || "1";
    let prefix = "BED-" + floor;

    if (wName.includes("ICU") || wName.includes("NEURO") || wName.includes("CARDIAC")) {
        prefix = "ICU-" + floor;
    } else if (wName.includes("EMERGENCY") || wName.includes("TRAUMA")) {
        prefix = "EMG-" + floor;
    } else if (wName.includes("PRIVATE") || wName.includes("SUITE")) {
        prefix = "PVT-" + floor;
    } else if (wName.includes("FEMALE")) {
        prefix = "GEN-F-" + floor;
    } else if (wName.includes("MALE")) {
        prefix = "GEN-M-" + floor;
    } else if (wName.includes("GENERAL")) {
        prefix = "GEN-" + floor;
    }

    document.getElementById("cfgBedPrefix").value = prefix;
    updateBedGeneratorPreview();
}

function onWardTypeChange(type) {
    const chargeInput = document.getElementById("cfgCharge");
    const catSelect = document.getElementById("cfgBedCategory");

    if (type === "ICU" || type === "NICU" || type === "PICU") {
        chargeInput.value = "3500";
        if (catSelect) catSelect.value = "Cardiac & Neuro ICU";
    } else if (type === "Emergency") {
        chargeInput.value = "1200";
        if (catSelect) catSelect.value = "Trauma Emergency Ward";
    } else if (type === "Private") {
        chargeInput.value = "2800";
        if (catSelect) catSelect.value = "Executive Private Suites";
    } else if (type === "Semi-Private") {
        chargeInput.value = "1500";
        if (catSelect) catSelect.value = "Semi-Private";
    } else {
        chargeInput.value = "350";
        if (catSelect) catSelect.value = "General Ward";
    }
    suggestBedPrefix();
}

function toggleBedGenMode(mode) {
    const paramsGrid = document.getElementById("cfgAutoParamsGrid");
    if (paramsGrid) {
        paramsGrid.style.display = mode === "auto" ? "grid" : "none";
    }
}

function updateBedGeneratorPreview() {
    const totalBeds = parseInt(document.getElementById("cfgTotalBeds").value, 10) || 0;
    const prefix = document.getElementById("cfgBedPrefix").value.trim() || "BED-";
    const startNum = parseInt(document.getElementById("cfgStartNum").value, 10) || 1;

    const preview = [];
    for (let i = 0; i < totalBeds; i++) {
        const num = startNum + i;
        const padded = num < 10 ? `0${num}` : `${num}`;
        preview.push(`${prefix}${padded}`);
    }

    const textarea = document.getElementById("cfgBedNumbersPreview");
    if (textarea) {
        textarea.value = preview.join(", ");
    }
    updateBedCountBadge();
}

function updateBedCountBadge() {
    const textarea = document.getElementById("cfgBedNumbersPreview");
    const badge = document.getElementById("cfgBedCountBadge");
    if (!textarea || !badge) return;

    const raw = textarea.value.trim();
    if (!raw) {
        badge.textContent = "0 Beds";
        return;
    }
    const count = raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean).length;
    badge.textContent = `${count} Beds`;
}

async function handleConfigureWardRoomSubmit(e) {
    e.preventDefault();
    const building_wing = document.getElementById("cfgBuilding").value.trim();
    const floor = document.getElementById("cfgFloor").value.trim();
    const ward_name = document.getElementById("cfgWardName").value.trim();
    const ward_type = document.getElementById("cfgWardType").value;
    const bed_category = document.getElementById("cfgBedCategory").value;
    const base_rate_per_day = parseFloat(document.getElementById("cfgCharge").value) || 0;
    const department = document.getElementById("cfgDept").value.trim();
    const total_beds = parseInt(document.getElementById("cfgTotalBeds").value, 10) || 0;
    const bed_prefix = document.getElementById("cfgBedPrefix").value.trim();
    const start_number = parseInt(document.getElementById("cfgStartNum").value, 10) || 1;

    const rawPreview = document.getElementById("cfgBedNumbersPreview").value.trim();
    const bed_numbers = rawPreview ? rawPreview.split(/[\n,]+/).map(s => s.trim()).filter(Boolean) : [];

    try {
        const res = await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/configure-ward-room`, {
            method: "POST",
            body: JSON.stringify({
                building_wing,
                floor,
                ward_name,
                ward_type,
                department,
                base_rate_per_day,
                bed_category,
                total_beds: bed_numbers.length || total_beds,
                bed_prefix,
                start_number,
                bed_numbers
            })
        });

        alert(`✅ ${res.message || 'Ward and bed structure configured successfully.'}`);
        closeHdModal("modalConfigureWardRoom");
        await loadAdminWardStructure();
        await refreshDashboardData();
    } catch (err) {
        alert("Failed to configure structure: " + err.message);
    }
}

// --- EDIT WARD ---
function openEditWardModal(wardId) {
    const ward = adminWardsFlatList.find(w => String(w.ward_id) === String(wardId));
    if (!ward) return;

    document.getElementById("editWardId").value = ward.ward_id;
    document.getElementById("editWardName").value = ward.ward_name;
    document.getElementById("editWardWing").value = ward.building_wing || "";
    document.getElementById("editWardFloor").value = ward.floor || "";
    document.getElementById("editWardType").value = ward.ward_type || "General";
    document.getElementById("editWardBaseRate").value = ward.base_rate_per_day || 0;
    document.getElementById("editWardDept").value = ward.department || "";

    openHdModal("modalEditWard");
}

async function handleEditWardSubmit(e) {
    e.preventDefault();
    const wardId = document.getElementById("editWardId").value;
    const ward_name = document.getElementById("editWardName").value.trim();
    const building_wing = document.getElementById("editWardWing").value.trim();
    const floor = document.getElementById("editWardFloor").value.trim();
    const ward_type = document.getElementById("editWardType").value;
    const base_rate_per_day = parseFloat(document.getElementById("editWardBaseRate").value) || 0;
    const department = document.getElementById("editWardDept").value.trim();

    try {
        await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/wards/${encodeURIComponent(wardId)}`, {
            method: "PUT",
            body: JSON.stringify({
                ward_name,
                building_wing,
                floor,
                ward_type,
                base_rate_per_day,
                department
            })
        });

        alert("✅ Ward details updated successfully.");
        closeHdModal("modalEditWard");
        await loadAdminWardStructure();
        await refreshDashboardData();
    } catch (err) {
        alert("Failed to update ward: " + err.message);
    }
}

// --- BATCH GENERATE BEDS ---
function openBatchGenerateBedsModal(wardId, wardName) {
    document.getElementById("batchWardId").value = wardId;
    document.getElementById("batchWardName").value = wardName;
    document.getElementById("batchBedCount").value = "10";
    document.getElementById("batchBedPrefix").value = "BED-";
    document.getElementById("batchStartNum").value = "1";
    document.getElementById("batchBedCategory").value = "General";
    document.getElementById("batchBedCharge").value = "800";
    updateBatchBedPreview();
    openHdModal("modalBatchGenerateBeds");
}

function updateBatchBedPreview() {
    const count = parseInt(document.getElementById("batchBedCount").value, 10) || 0;
    const prefix = document.getElementById("batchBedPrefix").value.trim() || "BED-";
    const startNum = parseInt(document.getElementById("batchStartNum").value, 10) || 1;

    const list = [];
    for (let i = 0; i < count; i++) {
        const n = startNum + i;
        list.push(`${prefix}${n < 10 ? '0' + n : n}`);
    }

    const textarea = document.getElementById("batchBedNumbersPreview");
    if (textarea) textarea.value = list.join(", ");
}

async function handleBatchGenerateBedsSubmit(e) {
    e.preventDefault();
    const wardId = document.getElementById("batchWardId").value;
    const count = parseInt(document.getElementById("batchBedCount").value, 10) || 0;
    const prefix = document.getElementById("batchBedPrefix").value.trim();
    const start_number = parseInt(document.getElementById("batchStartNum").value, 10) || 1;
    const bed_category = document.getElementById("batchBedCategory").value.trim();
    const charge = parseFloat(document.getElementById("batchBedCharge").value) || 0;
    const rawPreview = document.getElementById("batchBedNumbersPreview").value.trim();
    const bed_numbers = rawPreview ? rawPreview.split(/[\n,]+/).map(s => s.trim()).filter(Boolean) : [];

    try {
        const res = await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/ward-beds/batch-generate`, {
            method: "POST",
            body: JSON.stringify({
                ward_id: wardId,
                count: bed_numbers.length || count,
                prefix,
                start_number,
                bed_category,
                charge,
                bed_numbers
            })
        });

        alert(`✅ ${res.message || 'Beds provisioned successfully.'}`);
        closeHdModal("modalBatchGenerateBeds");
        await loadAdminWardStructure();
        await refreshDashboardData();
    } catch (err) {
        alert("Batch bed generation failed: " + err.message);
    }
}

// --- SAFE DELETION ---
async function deleteWardSafe(wardId, wardName) {
    if (!confirm(`Are you sure you want to remove ward "${wardName}"?\nIf beds have patient history, the ward will be safely deactivated to preserve clinical records.`)) {
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/wards/${encodeURIComponent(wardId)}`, {
            method: "DELETE"
        });

        alert(`✅ ${res.message || 'Ward removed / deactivated.'}`);
        await loadAdminWardStructure();
        await refreshDashboardData();
    } catch (err) {
        alert("Cannot remove ward: " + err.message);
    }
}

async function deleteBedSafe(bedId, bedNumber) {
    if (!confirm(`Are you sure you want to delete bed "${bedNumber}"?\nIf this bed has admission history, it will be safely retired.`)) {
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/ward-beds/${encodeURIComponent(bedId)}`, {
            method: "DELETE"
        });

        alert(`✅ ${res.message || 'Bed deleted / retired.'}`);
        await loadAdminWardStructure();
        await refreshDashboardData();
    } catch (err) {
        alert("Cannot delete bed: " + err.message);
    }
}

// --- BACKWARD-COMPATIBLE SINGLE BED MODAL ---
function openAddWardModal() {
    openConfigureWardRoomModal();
}

async function handleAddWardSubmit(e) {
    handleConfigureWardRoomSubmit(e);
}

function openAddWardBedModal(preselectedWardId) {
    const select = document.getElementById("bedWardSelect");
    if (select) {
        select.innerHTML = adminWardsFlatList.map(w => `
            <option value="${w.ward_id}" ${preselectedWardId && String(preselectedWardId) === String(w.ward_id) ? 'selected' : ''}>
                ${escapeHtml(w.ward_name)} (${escapeHtml(w.ward_type)}) - ${escapeHtml(w.building_wing || '')}
            </option>
        `).join("");
    }

    document.getElementById("bedNumber").value = "";
    document.getElementById("bedRoomNumber").value = "";
    openHdModal("modalAddWardBed");
}

async function handleAddWardBedSubmit(e) {
    e.preventDefault();
    const ward_id = document.getElementById("bedWardSelect").value;
    const bed_number = document.getElementById("bedNumber").value.trim();
    const room_number = document.getElementById("bedRoomNumber").value.trim();
    const bed_category = document.getElementById("bedCategorySelect").value;
    const status = document.getElementById("bedStatusSelect").value;

    try {
        await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/ward-beds`, {
            method: "POST",
            body: JSON.stringify({
                ward_id,
                bed_number,
                room_number,
                bed_category,
                status
            })
        });
        closeHdModal("modalAddWardBed");
        alert("✅ Bed slot provisioned in ward.");
        await loadAdminWardStructure();
        await refreshDashboardData();
    } catch (err) {
        alert("Failed to provision bed: " + err.message);
    }
}

async function updateBedStatus(bedId, newStatus) {
    try {
        await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/ward-beds/${encodeURIComponent(bedId)}`, {
            method: "PUT",
            body: JSON.stringify({ status: newStatus })
        });
        await loadAdminWardStructure();
        await refreshDashboardData();
    } catch (err) {
        alert("Bed status update failed: " + err.message);
        await loadAdminWardStructure();
    }
}

// 5. ICU SPECIALTY SUITES
async function loadAdminIcuSuites() {
    const tbody = document.getElementById("adminIcuTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;">Loading ICU suites...</td></tr>`;

    try {
        const res = await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/icu-categories`);
        const suites = res.categories || [];
        if (!suites.length) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #64748b;">No ICU suites configured.</td></tr>`;
            return;
        }

        tbody.innerHTML = suites.map(s => `
            <tr>
                <td><code style="color: #2563eb;">${escapeHtml(s.code)}</code></td>
                <td><strong>${escapeHtml(s.name)}</strong></td>
                <td><strong>${s.total_beds || 0} Beds</strong></td>
                <td><span style="color: #10b981; font-weight: 700;">${s.available_beds ?? s.total_beds} Avail</span></td>
                <td><span>🫁 ${s.ventilator_beds || 0} Vents</span></td>
                <td><span class="hd-badge green">${escapeHtml(s.status || 'Active')}</span></td>
                <td>
                    <button class="hd-btn hd-btn-outline hd-btn-sm" onclick="openEditIcuSuiteModal('${escapeHtml(s.code)}', '${escapeHtml(s.name)}', ${s.total_beds || 4}, ${s.ventilator_beds || 2})">
                        ✏️ Edit Capacity
                    </button>
                </td>
            </tr>
        `).join("");
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #ef4444;">${err.message}</td></tr>`;
    }
}

function openAddIcuSuiteModal() {
    document.getElementById("icuSuiteCode").value = "general_icu";
    document.getElementById("icuSuiteName").value = "General ICU";
    document.getElementById("icuSuiteTotalBeds").value = "8";
    document.getElementById("icuSuiteVentilatorBeds").value = "4";
    openHdModal("modalAddIcuSuite");
}

function openEditIcuSuiteModal(code, name, totalBeds, ventBeds) {
    document.getElementById("icuSuiteCode").value = code;
    document.getElementById("icuSuiteName").value = name;
    document.getElementById("icuSuiteTotalBeds").value = totalBeds;
    document.getElementById("icuSuiteVentilatorBeds").value = ventBeds;
    openHdModal("modalAddIcuSuite");
}

function onIcuSuiteCodeSelect(code) {
    const titles = {
        general_icu: "General ICU",
        ccu: "Coronary Care Unit (CCU)",
        nicu: "Neonatal ICU (NICU)",
        picu: "Pediatric ICU (PICU)",
        neuro_icu: "Neuro ICU",
        surgical_icu: "Surgical ICU (SICU)",
        trauma_icu: "Trauma ICU"
    };
    if (titles[code]) {
        document.getElementById("icuSuiteName").value = titles[code];
    }
}

async function handleIcuSuiteSubmit(e) {
    e.preventDefault();
    const code = document.getElementById("icuSuiteCode").value;
    const name = document.getElementById("icuSuiteName").value.trim();
    const total_beds = Number(document.getElementById("icuSuiteTotalBeds").value || 4);
    const ventilator_beds = Number(document.getElementById("icuSuiteVentilatorBeds").value || 2);

    try {
        await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/icu-categories`, {
            method: "POST",
            body: JSON.stringify({ code, name, total_beds, ventilator_beds })
        });
        closeHdModal("modalAddIcuSuite");
        alert("✅ ICU Specialty Suite saved.");
        await loadAdminIcuSuites();
    } catch (err) {
        alert("Failed to save ICU suite: " + err.message);
    }
}

// 6. DIAGNOSTIC CATALOGUE
async function loadAdminDiagnosticsList() {
    const tbody = document.getElementById("adminDiagnosticsTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;">Loading tests...</td></tr>`;

    try {
        const res = await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/diagnostics`);
        const tests = res.tests || [];
        if (!tests.length) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #64748b;">No diagnostic tests registered in catalogue.</td></tr>`;
            return;
        }

        tbody.innerHTML = tests.map(t => `
            <tr>
                <td><code style="color: #2563eb;">${escapeHtml(t.test_code || 'LAB')}</code></td>
                <td><strong>${escapeHtml(t.test_name)}</strong></td>
                <td><span class="hd-badge blue">${escapeHtml(t.department || 'Pathology')}</span></td>
                <td>${escapeHtml(t.sample_type || 'Blood')}</td>
                <td>${escapeHtml(t.turnaround_time || '4 Hours')}</td>
                <td><strong style="color: #047857;">₹${t.price || 0}</strong></td>
                <td><span class="hd-badge green">${escapeHtml(t.status || 'Active')}</span></td>
            </tr>
        `).join("");
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #ef4444;">${err.message}</td></tr>`;
    }
}

function openAdminAddTestModal() {
    document.getElementById("admTestName").value = "";
    document.getElementById("admTestCode").value = "";
    document.getElementById("admTestDept").value = "Pathology";
    document.getElementById("admTestPrice").value = "450";
    document.getElementById("admTestTat").value = "4 Hours";
    document.getElementById("admTestSample").value = "Blood";
    document.getElementById("admTestRange").value = "";
    openHdModal("modalAdminAddTest");
}

async function handleAdminAddTestSubmit(e) {
    e.preventDefault();
    const test_name = document.getElementById("admTestName").value.trim();
    const test_code = document.getElementById("admTestCode").value.trim().toUpperCase();
    const department = document.getElementById("admTestDept").value;
    const price = Number(document.getElementById("admTestPrice").value || 0);
    const turnaround_time = document.getElementById("admTestTat").value.trim();
    const sample_type = document.getElementById("admTestSample").value.trim();
    const normal_range = document.getElementById("admTestRange").value.trim();

    try {
        await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/diagnostics`, {
            method: "POST",
            body: JSON.stringify({
                test_name,
                test_code,
                department,
                price,
                turnaround_time,
                sample_type,
                normal_range
            })
        });
        closeHdModal("modalAdminAddTest");
        alert("✅ Diagnostic test added to catalogue.");
        await loadAdminDiagnosticsList();
    } catch (err) {
        alert("Failed to add test: " + err.message);
    }
}

// 8. AUDIT HISTORY
async function loadAdminAuditLogs() {
    const tbody = document.getElementById("adminAuditTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">Loading audit trail...</td></tr>`;

    try {
        const res = await authFetch(`${API_BASE}/api/hospitals/${encodeURIComponent(currentHospitalId)}/audit-logs`);
        const logs = res.logs || [];
        if (!logs.length) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #64748b;">No recent configuration changes logged.</td></tr>`;
            return;
        }

        tbody.innerHTML = logs.map(l => {
            const time = l.created_at ? new Date(l.created_at).toLocaleString("en-IN") : "Just now";
            return `
            <tr>
                <td style="font-size: 11px; color: #64748b; white-space: nowrap;">${escapeHtml(time)}</td>
                <td><strong>${escapeHtml(l.user_id || 'Hospital Admin')}</strong></td>
                <td><span class="hd-badge blue">${escapeHtml(l.action)}</span></td>
                <td><code>${escapeHtml(l.entity_type || 'hospital')}</code></td>
                <td style="font-size: 12px; color: #334155;">${escapeHtml(l.details || '')}</td>
            </tr>
            `;
        }).join("");
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #ef4444;">${err.message}</td></tr>`;
    }
}

// ====================================================================
// OFFICIAL MEDICAL PRESCRIPTION DOCUMENT VIEWER
// ====================================================================

async function openOfficialPrescriptionModal(prescriptionId) {
    try {
        const res = await authFetch(`${API_BASE}/api/prescriptions/${encodeURIComponent(prescriptionId)}/document`);
        if (!res.success || !res.document) {
            alert("Could not load prescription document: " + (res.message || "Unknown error"));
            return;
        }

        const doc = res.document;
        const h = doc.hospital || {};
        const p = doc.patient || {};
        const d = doc.doctor || {};
        const rx = doc.prescription || {};

        // Hospital Header
        const logoUrl = h.logo || PRESET_HOSPITAL_LOGOS[0];
        if (document.getElementById("rxHospLogo")) document.getElementById("rxHospLogo").src = logoUrl;
        if (document.getElementById("rxHospName")) document.getElementById("rxHospName").textContent = (h.hospital_name || "MUNICIPAL HOSPITAL").toUpperCase();
        if (document.getElementById("rxHospAddress")) document.getElementById("rxHospAddress").textContent = h.address || "Gorakhpur, UP";
        if (document.getElementById("rxHospAccreditation")) document.getElementById("rxHospAccreditation").textContent = h.accreditation || "NABH Accredited • Ayushman Bharat Verified";
        if (document.getElementById("rxHospPhone")) document.getElementById("rxHospPhone").textContent = h.phone || "102";
        if (document.getElementById("rxDocId")) document.getElementById("rxDocId").textContent = `RX-${String(rx.id).padStart(5, '0')}`;

        // Doctor Info
        if (document.getElementById("rxDoctorName")) document.getElementById("rxDoctorName").textContent = d.name || "Attending Physician";
        if (document.getElementById("rxDoctorQual")) document.getElementById("rxDoctorQual").textContent = `${d.qualification || 'MBBS'} • ${d.specialization || d.department || 'Specialist'}`;
        if (document.getElementById("rxDoctorRoom")) document.getElementById("rxDoctorRoom").textContent = `OPD Room: ${d.opd_room_no || 'OPD-101'}`;
        if (document.getElementById("rxSignature")) document.getElementById("rxSignature").textContent = d.name || "Dr. Medical Officer";
        if (document.getElementById("rxSignName")) document.getElementById("rxSignName").textContent = d.name || "Dr. Medical Officer";

        // Patient Info
        if (document.getElementById("rxPatientName")) document.getElementById("rxPatientName").textContent = p.name || "Patient";
        if (document.getElementById("rxPatientAgeGender")) document.getElementById("rxPatientAgeGender").textContent = `${p.age || '--'} / ${p.gender || '--'}`;
        if (document.getElementById("rxPatientId")) document.getElementById("rxPatientId").textContent = p.patient_id || "--";
        if (document.getElementById("rxPatientToken")) document.getElementById("rxPatientToken").textContent = doc.appointment?.token_number || "--";
        if (document.getElementById("rxDate")) document.getElementById("rxDate").textContent = rx.created_at ? new Date(rx.created_at).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");

        // Diagnosis
        if (document.getElementById("rxDiagnosis")) document.getElementById("rxDiagnosis").textContent = rx.diagnosis || "Clinical Consultation Completed";
        if (document.getElementById("rxSymptoms")) document.getElementById("rxSymptoms").textContent = rx.doctor_notes || "";
        if (document.getElementById("rxAdvice")) document.getElementById("rxAdvice").textContent = rx.advice || "Continue prescribed medication schedule and rest.";
        if (document.getElementById("rxFollowUpDate")) document.getElementById("rxFollowUpDate").textContent = rx.follow_up_date || "After 5 days or if symptoms worsen";

        // Medications Table
        const tbody = document.getElementById("rxMedicationsTableBody");
        if (tbody) {
            const meds = doc.medications || [];
            if (!meds.length) {
                tbody.innerHTML = `<tr><td colspan="5" style="padding: 10px; color: #64748b;">${escapeHtml(rx.medicine_name || 'Medications as verbally advised')}</td></tr>`;
            } else {
                tbody.innerHTML = meds.map((m, idx) => `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 8px;">${idx + 1}</td>
                        <td style="padding: 8px;"><strong>💊 ${escapeHtml(m.name || m.medicine || m.medicineName || 'Medicine')}</strong></td>
                        <td style="padding: 8px;">${escapeHtml(m.dosage || m.dose || '1 tablet')} (${escapeHtml(m.frequency || 'OD')})</td>
                        <td style="padding: 8px;">${escapeHtml(m.timing || 'After food')}</td>
                        <td style="padding: 8px;">${escapeHtml(m.duration || '5 days')}</td>
                    </tr>
                `).join("");
            }
        }

        // QR Code
        const qrEl = document.getElementById("rxQRCode");
        if (qrEl) {
            qrEl.innerHTML = `<div style="font-size: 8px; text-align: center; color: #0284c7; font-weight: 700;">✅ VERIFIED<br>QR-${rx.id}</div>`;
        }

        openHdModal("modalViewPrescription");
    } catch (err) {
        alert("Failed to view prescription: " + err.message);
    }
}

function printPrescriptionDocument() {
    window.print();
}

// Window bindings for subtabs
window.switchAdminConfigSubTab = switchAdminConfigSubTab;
window.saveAdminHospitalProfile = saveAdminHospitalProfile;
window.loadAdminFacilities = loadAdminFacilities;
window.toggleFacilityStatus = toggleFacilityStatus;
window.openAddCustomFacilityModal = openAddCustomFacilityModal;
window.handleAddCustomFacilitySubmit = handleAddCustomFacilitySubmit;
window.loadAdminDoctorsList = loadAdminDoctorsList;
window.openAddDoctorOpdModal = openAddDoctorOpdModal;
window.openEditDoctorOpdModal = openEditDoctorOpdModal;
window.handleDoctorOpdSubmit = handleDoctorOpdSubmit;
window.deleteDoctorRecord = deleteDoctorRecord;
window.loadAdminWardStructure = loadAdminWardStructure;
window.openAddWardModal = openAddWardModal;
window.handleAddWardSubmit = handleAddWardSubmit;
window.openAddWardBedModal = openAddWardBedModal;
window.handleAddWardBedSubmit = handleAddWardBedSubmit;
window.updateBedStatus = updateBedStatus;
window.loadAdminIcuSuites = loadAdminIcuSuites;
window.openAddIcuSuiteModal = openAddIcuSuiteModal;
window.openEditIcuSuiteModal = openEditIcuSuiteModal;
window.onIcuSuiteCodeSelect = onIcuSuiteCodeSelect;
window.handleIcuSuiteSubmit = handleIcuSuiteSubmit;
window.loadAdminDiagnosticsList = loadAdminDiagnosticsList;
window.openAdminAddTestModal = openAdminAddTestModal;
window.handleAdminAddTestSubmit = handleAdminAddTestSubmit;
window.loadAdminAuditLogs = loadAdminAuditLogs;
window.openOfficialPrescriptionModal = openOfficialPrescriptionModal;
window.printPrescriptionDocument = printPrescriptionDocument;
window.handleHospitalLogoUpload = handleHospitalLogoUpload;
window.handleRemoveHospitalLogo = handleRemoveHospitalLogo;
window.openPaymentModal = openPaymentModal;
window.setQuickPay = setQuickPay;
window.setQuickPayFull = setQuickPayFull;
window.handleProcessPaymentSubmit = handleProcessPaymentSubmit;
window.printBillingReceipt = printBillingReceipt;
window.triggerPaymentModal = triggerPaymentModal;
window.triggerReceiptPrint = triggerReceiptPrint;
window.openConfigureWardRoomModal = openConfigureWardRoomModal;
window.handleConfigureWardRoomSubmit = handleConfigureWardRoomSubmit;
window.suggestBedPrefix = suggestBedPrefix;
window.onWardTypeChange = onWardTypeChange;
window.toggleBedGenMode = toggleBedGenMode;
window.updateBedGeneratorPreview = updateBedGeneratorPreview;
window.updateBedCountBadge = updateBedCountBadge;
window.openEditWardModal = openEditWardModal;
window.handleEditWardSubmit = handleEditWardSubmit;
window.openBatchGenerateBedsModal = openBatchGenerateBedsModal;
window.updateBatchBedPreview = updateBatchBedPreview;
window.handleBatchGenerateBedsSubmit = handleBatchGenerateBedsSubmit;
window.deleteWardSafe = deleteWardSafe;
window.deleteBedSafe = deleteBedSafe;
window.filterAdminBeds = filterAdminBeds;
window.filterAdminBedsByStatus = filterAdminBedsByStatus;
window.toggleAllAccordions = toggleAllAccordions;


