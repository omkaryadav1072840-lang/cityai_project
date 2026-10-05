/**
 * SmartCity Gorakhpur - Super Admin Hospital Controller
 * =======================================================
 * Cross-facility management, hospital provisioning, and Hospital Admin assignment.
 */

const API_BASE = (typeof window !== "undefined" && window.API_BASE_URL !== undefined)
    ? window.API_BASE_URL
    : (typeof window !== "undefined" && window.location && window.location.port === "5000"
        ? window.location.origin
        : (typeof window !== "undefined" && window.location && window.location.protocol === "file:" ? "http://localhost:5000" : ""));

let hospitalsData = [];

// AUTH TOKEN WRAPPER
async function adminAuthFetch(url, options = {}) {
    let token = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getToken) ? SmartCityAuth.getToken() : null;
    if (!token) token = localStorage.getItem("smartCityJWT");

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url.startsWith("http") ? url : `${API_BASE}${url}`, {
        ...options,
        headers
    });

    if (res.status === 401 || res.status === 403) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Super Admin authorization required.");
    }

    return res.json();
}

// CHECK SUPER ADMIN PERMISSION
function enforceSuperAdminGate() {
    const user = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getUser) ? SmartCityAuth.getUser() : null;
    const isSuperAdmin = user && (user.accountType === "SUPER_ADMIN" || (user.role === "admin" && !user.hospitalId));

    const gate = document.getElementById("superAdminGate");
    const content = document.getElementById("superAdminContent");

    if (!isSuperAdmin) {
        if (gate) gate.style.display = "flex";
        if (content) content.style.display = "none";
        return false;
    }

    if (gate) gate.style.display = "none";
    if (content) content.style.display = "block";

    const nameEl = document.getElementById("saUserDisplayName");
    if (nameEl) nameEl.textContent = user.name || "System Super Admin";

    return true;
}

async function handleSuperAdminGateLogin(e) {
    if (e) e.preventDefault();
    const staffId = document.getElementById("saGateAdminId").value.trim();
    const password = document.getElementById("saGatePassword").value;
    const errEl = document.getElementById("saGateErrorMsg");
    if (errEl) errEl.style.display = "none";

    try {
        const res = await fetch(`${API_BASE}/api/staff-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId, password })
        });
        const data = await res.json();

        if (res.ok && data.token) {
            if (data.accountType !== "SUPER_ADMIN" && data.user?.role !== "admin") {
                if (errEl) {
                    errEl.textContent = "🔒 Access Denied: This account is not a Super Admin.";
                    errEl.style.display = "block";
                }
                return;
            }

            localStorage.setItem("smartCityJWT", data.token);
            localStorage.setItem("smartCityCurrentUser", JSON.stringify(data.user));
            if (typeof SmartCityAuth !== "undefined" && SmartCityAuth.setSession) {
                SmartCityAuth.setSession(data.token, data.user);
            }

            enforceSuperAdminGate();
            await loadHospitalsDirectory();
        } else {
            if (errEl) {
                errEl.textContent = data.message || "Invalid credentials.";
                errEl.style.display = "block";
            }
        }
    } catch (err) {
        if (errEl) {
            errEl.textContent = "Server error: " + err.message;
            errEl.style.display = "block";
        }
    }
}

function handleSuperAdminLogout() {
    if (typeof SmartCityAuth !== "undefined" && SmartCityAuth.logout) {
        SmartCityAuth.logout();
    }
    localStorage.removeItem("smartCityJWT");
    localStorage.removeItem("smartCityCurrentUser");
    enforceSuperAdminGate();
}

// INITIALIZE
document.addEventListener("DOMContentLoaded", async () => {
    const isAuthed = enforceSuperAdminGate();
    if (isAuthed) {
        await loadHospitalsDirectory();
    }
});

// LOAD HOSPITALS DIRECTORY & METRICS
async function loadHospitalsDirectory() {
    const tbody = document.getElementById("superAdminHospitalsTableBody");
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px;">Loading hospital directory...</td></tr>`;
    }

    try {
        const data = await adminAuthFetch(`${API_BASE}/api/admin/hospitals`);
        hospitalsData = data.hospitals || [];

        // Compute Metrics
        const totalHosp = hospitalsData.length;
        const activeHosp = hospitalsData.filter(h => (h.status || "Operational").toLowerCase() === "operational").length;
        const totalBeds = hospitalsData.reduce((acc, h) => acc + (Number(h.total_beds) || 0), 0);
        const assignedAdmins = hospitalsData.filter(h => Boolean(h.admin_staff_id)).length;
        const totalDoctors = hospitalsData.reduce((acc, h) => acc + (Number(h.total_doctors) || 0), 0);

        document.getElementById("statTotalHospitals").textContent = totalHosp;
        document.getElementById("statActiveHospitals").textContent = activeHosp;
        document.getElementById("statTotalBeds").textContent = totalBeds.toLocaleString("en-IN");
        document.getElementById("statAssignedAdmins").textContent = assignedAdmins;
        document.getElementById("statTotalDoctors").textContent = totalDoctors;

        renderHospitalsTable(hospitalsData);
    } catch (err) {
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: #ef4444;">${err.message}</td></tr>`;
        }
    }
}

// STANDARD 20 MUNICIPAL HEALTHCARE FACILITIES
const STANDARD_FACILITIES = [
    { code: "emergency_24x7", name: "24x7 Emergency & Trauma Care", category: "Emergency" },
    { code: "icu_ccu", name: "Intensive Care Units (ICU/CCU/NICU)", category: "Critical Care" },
    { code: "pathology_lab", name: "Advanced Diagnostic & Pathology Lab", category: "Diagnostics" },
    { code: "radiology_imaging", name: "Digital X-Ray, CT Scan & MRI", category: "Diagnostics" },
    { code: "pharmacy_24x7", name: "In-House 24x7 Pharmacy", category: "Support" },
    { code: "opd_clinics", name: "Outpatient Department (OPD) Clinics", category: "Consultation" },
    { code: "operation_theatres", name: "Modular Operation Theatres", category: "Surgical" },
    { code: "blood_bank", name: "Dedicated Blood Bank & Storage", category: "Support" },
    { code: "dialysis_unit", name: "Dialysis & Nephrology Unit", category: "Specialized" },
    { code: "cath_lab", name: "Cardiac Cath Lab & Angiography", category: "Specialized" },
    { code: "maternal_neonatal", name: "Maternal & Neonatal Care (NICU/PICU)", category: "Maternity" },
    { code: "stroke_neuro", name: "Comprehensive Stroke & Neuro Center", category: "Specialized" },
    { code: "oncology_daycare", name: "Daycare Chemotherapy & Oncology", category: "Specialized" },
    { code: "orthopedics_trauma", name: "Orthopedics, Joint Replacement & Trauma", category: "Surgical" },
    { code: "physiotherapy_rehab", name: "Physiotherapy & Rehabilitation Center", category: "Rehab" },
    { code: "telemedicine", name: "Telemedicine & Remote Consultation", category: "Digital" },
    { code: "isolation_ward", name: "Dedicated Isolation & Infectious Ward", category: "Inpatient" },
    { code: "cashless_tpa", name: "Cashless Insurance & TPA Desk", category: "Administrative" },
    { code: "ambulance_als", name: "24x7 Advanced Life Support Ambulance", category: "Emergency" },
    { code: "dietary_cafeteria", name: "Hospital Cafeteria & Patient Dietary Service", category: "Support" }
];

const PRESET_LOGOS = [
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=150&auto=format&fit=crop&q=80", // General
    "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=150&auto=format&fit=crop&q=80", // Cardiac
    "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=150&auto=format&fit=crop&q=80", // Trauma
    "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=150&auto=format&fit=crop&q=80"  // Maternity
];

function updateLogoPreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const img = document.getElementById(previewId);
    if (!input || !img) return;
    const url = input.value.trim() || PRESET_LOGOS[0];
    img.src = url;
}

function setPresetLogo(inputId, previewId, index) {
    const url = PRESET_LOGOS[index - 1] || PRESET_LOGOS[0];
    const input = document.getElementById(inputId);
    if (input) input.value = url;
    updateLogoPreview(inputId, previewId);
}

function recalcIcuQuotas() {
    const icuTotal = Number(document.getElementById("newHospIcuBeds")?.value || 24);
    const gen = Math.max(2, Math.floor(icuTotal * 0.4));
    const ccu = Math.max(1, Math.floor(icuTotal * 0.25));
    const nicu = Math.max(1, Math.floor(icuTotal * 0.2));
    const trauma = Math.max(1, icuTotal - gen - ccu - nicu);

    if (document.getElementById("newIcuGeneral")) document.getElementById("newIcuGeneral").value = gen;
    if (document.getElementById("newIcuCcu")) document.getElementById("newIcuCcu").value = ccu;
    if (document.getElementById("newIcuNicu")) document.getElementById("newIcuNicu").value = nicu;
    if (document.getElementById("newIcuTrauma")) document.getElementById("newIcuTrauma").value = trauma;
}

function handleNewHospNameChange() {
    const name = document.getElementById("newHospName")?.value || "";
    const idInput = document.getElementById("newHospId");
    if (idInput && !idInput.dataset.manual) {
        const clean = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
        if (clean) idInput.value = `HOSP-${clean}-${Math.floor(100 + Math.random() * 900)}`;
    }
    autoGenerateNewAdminStaffId();
}

function autoGenerateNewAdminStaffId() {
    const hospId = document.getElementById("newHospId")?.value || "HOSP";
    const clean = hospId.replace(/[^a-zA-Z0-9]/g, "");
    const staffInput = document.getElementById("newAdminStaffId");
    if (staffInput) staffInput.value = `STAFF-${clean}-ADMIN`;
}

function toggleImmediateAdminFields() {
    const chk = document.getElementById("assignAdminImmediately");
    const container = document.getElementById("immediateAdminFields");
    if (!chk || !container) return;
    container.style.display = chk.checked ? "block" : "none";
}

function renderFacilitiesCheckboxes() {
    const c = document.getElementById("newHospFacilitiesContainer");
    if (!c) return;
    c.innerHTML = STANDARD_FACILITIES.map(f => `
        <label style="display: flex; align-items: center; gap: 6px; padding: 4px; border-radius: 4px; cursor: pointer; background: #f8fafc;">
            <input type="checkbox" name="newHospFac" value="${f.code}" checked style="cursor: pointer;">
            <span>${escapeHtml(f.name)}</span>
        </label>
    `).join("");
}

function toggleAllFacilities(selectAll) {
    const boxes = document.querySelectorAll("input[name='newHospFac']");
    boxes.forEach(b => b.checked = selectAll);
}

// RENDER HOSPITALS TABLE
function renderHospitalsTable(hospitals) {
    const tbody = document.getElementById("superAdminHospitalsTableBody");
    if (!tbody) return;

    if (!hospitals.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: #64748b;">No matching hospital facilities found.</td></tr>`;
        return;
    }

    tbody.innerHTML = hospitals.map(h => {
        const isOperational = (h.status || "Operational").toLowerCase() === "operational";
        const hasAdmin = Boolean(h.admin_staff_id);
        const logoUrl = h.logo || PRESET_LOGOS[0];

        return `
        <tr>
            <td>
                <strong style="font-family: monospace; color: #2563eb; font-size: 13px;">${escapeHtml(h.hospital_id)}</strong>
            </td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${escapeHtml(logoUrl)}" alt="Logo" style="width: 36px; height: 36px; border-radius: 8px; object-fit: cover; border: 1px solid #cbd5e1; background: #fff;" onerror="this.src='${PRESET_LOGOS[0]}'">
                    <div>
                        <strong style="font-size: 14px; color: #0f172a;">${escapeHtml(h.hospital_name)}</strong>
                        <div style="font-size: 11px; color: #64748b;">📍 ${escapeHtml(h.city || 'Gorakhpur')} • ${escapeHtml(h.address || '')}</div>
                    </div>
                </div>
            </td>
            <td>
                <span class="hd-badge blue">${escapeHtml(h.hospital_type || "General")}</span>
                ${h.accreditation ? `<div style="font-size: 10px; color: #0284c7; margin-top: 2px;">🏅 ${escapeHtml(h.accreditation)}</div>` : ''}
            </td>
            <td>
                <strong>${h.total_beds || 0} Beds</strong>
                <div style="font-size: 11px; color: #64748b;">ICU: ${h.icu_beds || 0} • Emg: ${h.emergency_beds || 0}</div>
            </td>
            <td>
                <strong>${h.total_doctors || 0}</strong> Doctors
            </td>
            <td>
                ${hasAdmin ? `
                    <div class="sa-admin-chip">
                        <span>👤</span>
                        <div>
                            <strong>${escapeHtml(h.admin_name)}</strong>
                            <div style="font-size: 10px; color: #64748b; font-family: monospace;">${escapeHtml(h.admin_staff_id)}</div>
                        </div>
                    </div>
                ` : `
                    <div class="sa-admin-chip unassigned">
                        <span>⚠️</span> Unassigned
                    </div>
                `}
            </td>
            <td>
                <span class="hd-badge ${isOperational ? 'green' : 'amber'}">
                    ${isOperational ? '🟢 Operational' : '🔴 Inactive'}
                </span>
            </td>
            <td>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    <button class="hd-btn hd-btn-primary hd-btn-sm" title="Assign / Change Hospital Admin" onclick="openAssignAdminModal('${escapeHtml(h.hospital_id)}', '${escapeHtml(h.hospital_name)}')">
                        👤 ${hasAdmin ? 'Change Admin' : 'Assign Admin'}
                    </button>
                    <button class="hd-btn hd-btn-outline hd-btn-sm" title="Edit Configuration" onclick="openEditHospitalModal('${escapeHtml(h.hospital_id)}')">
                        ✏️ Edit
                    </button>
                    <button class="hd-btn ${isOperational ? 'hd-btn-danger' : 'hd-btn-success'} hd-btn-sm" onclick="toggleHospitalStatus('${escapeHtml(h.hospital_id)}', '${isOperational ? 'Operational' : 'Inactive'}')">
                        ${isOperational ? 'Deactivate' : 'Activate'}
                    </button>
                    <a href="hospital_dashboard.html?hospital_id=${encodeURIComponent(h.hospital_id)}" class="hd-btn hd-btn-outline hd-btn-sm" style="text-decoration: none;" title="Inspect Live Facility Dashboard">
                        🚀 Open
                    </a>
                </div>
            </td>
        </tr>
        `;
    }).join("");
}

// FILTER TABLE
function filterHospitalsTable() {
    const q = (document.getElementById("saSearchInput")?.value || "").toLowerCase().trim();
    const statusF = (document.getElementById("saStatusFilter")?.value || "").toLowerCase();
    const typeF = (document.getElementById("saTypeFilter")?.value || "").toLowerCase();

    const filtered = hospitalsData.filter(h => {
        const matchesQ = !q ||
            (h.hospital_name && h.hospital_name.toLowerCase().includes(q)) ||
            (h.hospital_id && h.hospital_id.toLowerCase().includes(q)) ||
            (h.address && h.address.toLowerCase().includes(q));

        const matchesStatus = !statusF ||
            (statusF === "operational" && (h.status || "operational").toLowerCase() === "operational") ||
            (statusF === "inactive" && (h.status || "").toLowerCase() !== "operational");

        const matchesType = !typeF ||
            (h.hospital_type && h.hospital_type.toLowerCase().includes(typeF));

        return matchesQ && matchesStatus && matchesType;
    });

    renderHospitalsTable(filtered);
}

// 1. ADD NEW HOSPITAL MODAL & HANDLER
function openAddHospitalModal() {
    document.getElementById("newHospName").value = "";
    document.getElementById("newHospId").value = "";
    delete document.getElementById("newHospId").dataset.manual;
    document.getElementById("newHospLogo").value = PRESET_LOGOS[0];
    updateLogoPreview("newHospLogo", "newHospLogoPreview");
    document.getElementById("newHospCity").value = "Gorakhpur";
    document.getElementById("newHospAccreditation").value = "NABH Accredited • Ayushman Bharat Verified";
    document.getElementById("newHospDescription").value = "";
    document.getElementById("newHospAddress").value = "";
    document.getElementById("newHospPhone").value = "";
    document.getElementById("newHospEmergency").value = "102";
    document.getElementById("newHospEmail").value = "";
    document.getElementById("newHospWebsite").value = "";
    document.getElementById("newHospTotalBeds").value = "120";
    document.getElementById("newHospIcuBeds").value = "24";
    document.getElementById("newHospEmgBeds").value = "12";
    recalcIcuQuotas();

    renderFacilitiesCheckboxes();

    const chkAdmin = document.getElementById("assignAdminImmediately");
    if (chkAdmin) chkAdmin.checked = true;
    toggleImmediateAdminFields();
    document.getElementById("newAdminName").value = "";
    document.getElementById("newAdminStaffId").value = "";
    document.getElementById("newAdminPassword").value = "Admin@2026";
    document.getElementById("newAdminEmail").value = "";
    document.getElementById("newAdminPhone").value = "";

    const modal = document.getElementById("modalAddHospital");
    if (modal) modal.classList.add("active");
}

async function handleAddHospitalSubmit(e) {
    e.preventDefault();
    const hospital_name = document.getElementById("newHospName").value.trim();
    const hospital_id = document.getElementById("newHospId").value.trim();
    const logo = document.getElementById("newHospLogo").value.trim();
    const city = document.getElementById("newHospCity").value.trim();
    const accreditation = document.getElementById("newHospAccreditation").value.trim();
    const description = document.getElementById("newHospDescription").value.trim();
    const address = document.getElementById("newHospAddress").value.trim();
    const phone = document.getElementById("newHospPhone").value.trim();
    const emergency_number = document.getElementById("newHospEmergency").value.trim();
    const email = document.getElementById("newHospEmail").value.trim();
    const website = document.getElementById("newHospWebsite").value.trim();
    const hospital_type = document.getElementById("newHospType").value;
    const status = document.getElementById("newHospStatus").value;
    const total_beds = Number(document.getElementById("newHospTotalBeds").value || 120);
    const icu_beds = Number(document.getElementById("newHospIcuBeds").value || 24);
    const emergency_beds = Number(document.getElementById("newHospEmgBeds").value || 12);

    // Facilities selected
    const selectedFacBoxes = document.querySelectorAll("input[name='newHospFac']:checked");
    const facilities = Array.from(selectedFacBoxes).map(b => b.value);

    // ICU Suites
    const icu_suites = [
        { code: "general_icu", name: "General ICU", beds: Number(document.getElementById("newIcuGeneral")?.value || 10) },
        { code: "ccu", name: "Coronary Care Unit (CCU)", beds: Number(document.getElementById("newIcuCcu")?.value || 6) },
        { code: "nicu", name: "Neonatal ICU (NICU)", beds: Number(document.getElementById("newIcuNicu")?.value || 4) },
        { code: "trauma_icu", name: "Trauma & Neuro ICU", beds: Number(document.getElementById("newIcuTrauma")?.value || 4) }
    ];

    // Admin assignment
    const assignAdmin = document.getElementById("assignAdminImmediately")?.checked;
    const admin_name = assignAdmin ? document.getElementById("newAdminName")?.value.trim() : null;
    const admin_staff_id = assignAdmin ? document.getElementById("newAdminStaffId")?.value.trim() : null;
    const admin_password = assignAdmin ? document.getElementById("newAdminPassword")?.value.trim() : null;
    const admin_email = assignAdmin ? document.getElementById("newAdminEmail")?.value.trim() : null;
    const admin_mobile = assignAdmin ? document.getElementById("newAdminPhone")?.value.trim() : null;

    try {
        const res = await adminAuthFetch(`${API_BASE}/api/admin/hospitals`, {
            method: "POST",
            body: JSON.stringify({
                hospital_name,
                hospital_id: hospital_id || undefined,
                logo,
                city,
                accreditation,
                description,
                address,
                phone,
                emergency_number,
                email,
                website,
                hospital_type,
                status,
                total_beds,
                icu_beds,
                emergency_beds,
                facilities,
                icu_suites,
                admin_name,
                admin_staff_id,
                admin_password,
                admin_email,
                admin_mobile
            })
        });

        closeHdModal("modalAddHospital");
        
        let msg = `✅ ${res.message}\nHospital ID: ${res.hospital.hospital_id}`;
        if (res.hospital.assigned_admin) {
            msg += `\n\n👤 Assigned Admin:\nName: ${res.hospital.assigned_admin.name}\nStaff ID: ${res.hospital.assigned_admin.staff_id}\nPassword: ${admin_password}`;
        }
        alert(msg);
        await loadHospitalsDirectory();
    } catch (err) {
        alert("Failed to add hospital: " + err.message);
    }
}

// 2. ASSIGN / CHANGE HOSPITAL ADMIN
function openAssignAdminModal(hospId, hospName) {
    document.getElementById("assignAdminHospId").value = hospId;
    document.getElementById("assignAdminHospNameDisp").value = `${hospName} (${hospId})`;
    document.getElementById("assignAdminName").value = "";
    document.getElementById("assignAdminEmail").value = "";
    document.getElementById("assignAdminMobile").value = "";

    generateAutoAdminStaffId();
    generateAutoAdminPassword();

    const modal = document.getElementById("modalAssignAdmin");
    if (modal) modal.classList.add("active");
}

function generateAutoAdminStaffId() {
    const hospId = document.getElementById("assignAdminHospId").value;
    const cleanHosp = String(hospId).replace(/[^a-zA-Z0-9]/g, "");
    const rand = Math.floor(100 + Math.random() * 900);
    const input = document.getElementById("assignAdminStaffId");
    if (input) input.value = `STAFF-${cleanHosp}-ADMIN`;
}

function generateAutoAdminPassword() {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const input = document.getElementById("assignAdminPassword");
    if (input) input.value = `Admin@${rand}`;
}

async function handleAssignAdminSubmit(e) {
    e.preventDefault();
    const hospitalId = document.getElementById("assignAdminHospId").value;
    const name = document.getElementById("assignAdminName").value.trim();
    const staffId = document.getElementById("assignAdminStaffId").value.trim();
    const password = document.getElementById("assignAdminPassword").value.trim();
    const email = document.getElementById("assignAdminEmail").value.trim();
    const mobile = document.getElementById("assignAdminMobile").value.trim();

    try {
        const res = await adminAuthFetch(`${API_BASE}/api/admin/hospitals/${encodeURIComponent(hospitalId)}/admin`, {
            method: "POST",
            body: JSON.stringify({
                name,
                staffId,
                password,
                email,
                mobile
            })
        });

        closeHdModal("modalAssignAdmin");
        alert(`✅ Hospital Admin Assigned!\n---------------------------\nAdmin Name: ${name}\nStaff ID: ${staffId}\nInitial Password: ${password}\nHospital: ${hospitalId}\n\nCredentials are saved securely.`);
        await loadHospitalsDirectory();
    } catch (err) {
        alert("Failed to assign Hospital Admin: " + err.message);
    }
}

// 3. EDIT HOSPITAL DETAILS
function openEditHospitalModal(hospId) {
    const h = hospitalsData.find(x => String(x.hospital_id) === String(hospId) || String(x.id) === String(hospId));
    if (!h) {
        alert("Hospital data not found.");
        return;
    }

    document.getElementById("editHospId").value = h.hospital_id;
    document.getElementById("editHospIdDisp").value = h.hospital_id;
    document.getElementById("editHospName").value = h.hospital_name || "";
    document.getElementById("editHospLogo").value = h.logo || PRESET_LOGOS[0];
    updateLogoPreview("editHospLogo", "editHospLogoPreview");
    document.getElementById("editHospCity").value = h.city || "Gorakhpur";
    document.getElementById("editHospAccreditation").value = h.accreditation || "";
    document.getElementById("editHospAddress").value = h.address || "";
    document.getElementById("editHospPhone").value = h.phone || "";
    document.getElementById("editHospTotalBeds").value = h.total_beds || 100;
    document.getElementById("editHospIcuBeds").value = h.icu_beds || 15;
    document.getElementById("editHospDescription").value = h.description || "";
    document.getElementById("editHospStatus").value = h.status || "Operational";

    const modal = document.getElementById("modalEditHospital");
    if (modal) modal.classList.add("active");
}

async function handleEditHospitalSubmit(e) {
    e.preventDefault();
    const hospId = document.getElementById("editHospId").value;
    const hospital_name = document.getElementById("editHospName").value.trim();
    const logo = document.getElementById("editHospLogo").value.trim();
    const city = document.getElementById("editHospCity").value.trim();
    const accreditation = document.getElementById("editHospAccreditation").value.trim();
    const address = document.getElementById("editHospAddress").value.trim();
    const phone = document.getElementById("editHospPhone").value.trim();
    const total_beds = Number(document.getElementById("editHospTotalBeds").value || 100);
    const icu_beds = Number(document.getElementById("editHospIcuBeds").value || 15);
    const description = document.getElementById("editHospDescription").value.trim();
    const status = document.getElementById("editHospStatus").value;

    try {
        const res = await adminAuthFetch(`${API_BASE}/api/admin/hospitals/${encodeURIComponent(hospId)}`, {
            method: "PUT",
            body: JSON.stringify({
                hospital_name,
                logo,
                city,
                accreditation,
                address,
                phone,
                total_beds,
                icu_beds,
                description,
                status
            })
        });

        closeHdModal("modalEditHospital");
        alert("✅ " + res.message);
        await loadHospitalsDirectory();
    } catch (err) {
        alert("Failed to update hospital: " + err.message);
    }
}

// 4. TOGGLE HOSPITAL STATUS (OPERATIONAL <-> INACTIVE)
async function toggleHospitalStatus(hospId, currentStatus) {
    const nextStatus = currentStatus === "Operational" ? "Inactive" : "Operational";
    const confirmMsg = currentStatus === "Operational"
        ? `Are you sure you want to DEACTIVATE hospital ${hospId}? Medical staff will not be able to log in.`
        : `Reactivate hospital ${hospId}?`;

    if (!confirm(confirmMsg)) return;

    try {
        await adminAuthFetch(`${API_BASE}/api/admin/hospitals/${encodeURIComponent(hospId)}`, {
            method: "PUT",
            body: JSON.stringify({ status: nextStatus })
        });
        await loadHospitalsDirectory();
    } catch (err) {
        alert("Status update failed: " + err.message);
    }
}

// UTILITIES
function closeHdModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("active");
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
