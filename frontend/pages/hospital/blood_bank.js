/**
 * SmartCity AI - Gorakhpur Blood Bank & Emergency Blood Management System
 * Production Frontend Controller
 */

// Global State
let currentInventory = [];
let myRequests = [];
let currentTrackingRequest = null;
let activeHospitalId = "HOSP-001";
let activeStaffRole = false;

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    initAuthAndRoles();
    fetchHospitals();
    loadAvailability();
    loadOverviewStats();
    checkUrlHash();

    // Default datetime-local input to now + 4 hours
    const reqTimeInput = document.getElementById("reqRequiredAt");
    if (reqTimeInput) {
        const target = new Date(Date.now() + 4 * 3600 * 1000);
        reqTimeInput.value = target.toISOString().slice(0, 16);
    }
});

// -------------------------------------------------------------
// 1. AUTHENTICATION & ROLE DETECTION
// -------------------------------------------------------------
function getAuthToken() {
    return localStorage.getItem("smartcity_token") || localStorage.getItem("token") || "";
}

function getStoredUser() {
    try {
        const u = localStorage.getItem("smartcity_user") || localStorage.getItem("user");
        return u ? JSON.parse(u) : null;
    } catch (_) {
        return null;
    }
}

function initAuthAndRoles() {
    const user = getStoredUser();
    const token = getAuthToken();
    const staffTab = document.getElementById("tabStaffConsole");

    if (token && user) {
        const role = (user.role || user.type || "").toLowerCase();
        const hospRole = (user.hospital_role || user.hospitalRole || "").toLowerCase();
        const isStaffOrAdmin = role === "admin" || role === "super_admin" || role === "superadmin" ||
                               role === "hospital_admin" || hospRole === "hospital_admin" ||
                               role === "staff" || Boolean(user.hospitalId);

        if (isStaffOrAdmin) {
            activeStaffRole = true;
            activeHospitalId = user.hospitalId || user.hospital_id || "HOSP-001";
            if (staffTab) staffTab.style.display = "inline-flex";

            const hospTitle = document.getElementById("staffHospitalNameTitle");
            if (hospTitle) {
                hospTitle.textContent = `${user.hospitalName || activeHospitalId} - Blood Center Operations`;
            }
        }

        // Fetch citizen-specific data
        loadMyRequests();
        loadDonorProfile();
    }
}

function checkUrlHash() {
    const hash = window.location.hash;
    if (hash === "#donor-register" || hash === "#donor") {
        openDonorModal();
    } else if (hash === "#emergency-request" || hash === "#request") {
        openEmergencyRequestModal();
    } else if (hash === "#my-requests") {
        switchMainTab("myRequests");
    } else if (hash === "#staff" && activeStaffRole) {
        switchMainTab("staffConsole");
    }
}

// -------------------------------------------------------------
// 2. TAB SWITCHING
// -------------------------------------------------------------
function switchMainTab(tabName) {
    const tabs = ["availability", "myRequests", "donorProfile", "staffConsole"];
    tabs.forEach(t => {
        const btn = document.getElementById("tab" + capitalize(t));
        const view = document.getElementById("view" + capitalize(t));
        if (btn) btn.classList.toggle("active", t === tabName);
        if (view) {
            view.style.display = (t === tabName) ? "block" : "none";
            view.classList.toggle("active", t === tabName);
        }
    });

    if (tabName === "myRequests") loadMyRequests();
    if (tabName === "donorProfile") loadDonorProfile();
    if (tabName === "staffConsole") loadStaffConsoleData();
}

function switchStaffSubTab(subTabName) {
    const subtabs = ["inventory", "requests", "expiry", "donors", "reports"];
    const subBtns = document.querySelectorAll(".bb-subtab");

    subtabs.forEach((st, idx) => {
        const panel = document.getElementById("staffSub" + capitalize(st));
        if (panel) panel.style.display = (st === subTabName) ? "block" : "none";
        if (subBtns[idx]) subBtns[idx].classList.toggle("active", st === subTabName);
    });

    if (subTabName === "inventory") loadStaffInventory();
    if (subTabName === "requests") loadStaffRequests();
    if (subTabName === "expiry") loadStaffExpiryAlerts();
    if (subTabName === "donors") loadStaffDonors();
    if (subTabName === "reports") loadStaffReports();
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// -------------------------------------------------------------
// 3. OVERVIEW METRICS & HOSPITALS
// -------------------------------------------------------------
async function fetchHospitals() {
    try {
        const res = await fetch("/api/hospital/blood-bank/hospitals");
        const json = await res.json();
        if (json.success && json.data) {
            const selectFilter = document.getElementById("filterHospital");
            const reqHospSelect = document.getElementById("reqHospital");

            if (selectFilter) {
                selectFilter.innerHTML = '<option value="">All Verified Facilities</option>' +
                    json.data.map(h => `<option value="${h.hospital_id}">${h.facility_name || h.hospital_name}</option>`).join("");
            }
            if (reqHospSelect) {
                reqHospSelect.innerHTML = json.data.map(h =>
                    `<option value="${h.hospital_id}">${h.facility_name || h.hospital_name} (${h.helpline_number})</option>`
                ).join("");
            }

            const statHosp = document.getElementById("statVerifiedHospitals");
            if (statHosp) statHosp.textContent = json.data.length;
        }
    } catch (err) {
        console.warn("Error fetching hospitals:", err);
    }
}

async function loadOverviewStats() {
    try {
        const res = await fetch("/api/hospital/blood-bank/summary");
        const json = await res.json();

        if (json.success && json.data) {
            const hospEl = document.getElementById("statVerifiedHospitals");
            const availEl = document.getElementById("statAvailableUnits");
            const groupsEl = document.getElementById("statBloodGroupsAvailable");
            const univEl = document.getElementById("statUniversalUnits");
            const donorEl = document.getElementById("statVoluntaryDonors");

            if (hospEl) hospEl.textContent = json.data.verified_facilities || 3;
            if (availEl) availEl.textContent = json.data.total_available_units || 0;
            if (groupsEl) groupsEl.textContent = `${json.data.blood_groups_available || 8} / 8 Active`;
            if (univEl) univEl.textContent = json.data.total_available_units || 0;
            if (donorEl) donorEl.textContent = json.data.voluntary_donors || 0;
        }
    } catch (err) {
        console.warn("Public summary fetch error:", err);
    }
}

// -------------------------------------------------------------
// 4. LIVE BLOOD AVAILABILITY & SEARCH
// -------------------------------------------------------------
async function loadAvailability() {
    const loader = document.getElementById("availabilityLoader");
    const grid = document.getElementById("availabilityGrid");
    const emptyState = document.getElementById("availabilityEmptyState");

    if (loader) loader.style.display = "block";
    if (grid) grid.innerHTML = "";
    if (emptyState) emptyState.style.display = "none";

    const bg = document.getElementById("filterBloodGroup")?.value || "";
    const comp = document.getElementById("filterComponent")?.value || "";
    const hosp = document.getElementById("filterHospital")?.value || "";

    const params = new URLSearchParams();
    if (bg) params.set("blood_group", bg);
    if (comp) params.set("component", comp);
    if (hosp) params.set("hospital_id", hosp);

    try {
        const res = await fetch(`/api/hospital/blood-bank/availability?${params.toString()}`);
        const json = await res.json();

        if (loader) loader.style.display = "none";

        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            currentInventory = json.data;
            renderAvailabilityCards(currentInventory);

            // Real-time telemetry fallback for overview metric cards
            const availEl = document.getElementById("statAvailableUnits");
            if (availEl && (availEl.textContent === "--" || availEl.textContent === "")) {
                const totalUnits = currentInventory.reduce((acc, i) => acc + (Number(i.available_units) || 0), 0);
                availEl.textContent = totalUnits;
            }
            const groupsEl = document.getElementById("statBloodGroupsAvailable");
            if (groupsEl && (groupsEl.textContent === "--" || groupsEl.textContent === "")) {
                const distinctGroups = new Set(currentInventory.filter(i => i.available_units > 0).map(i => i.blood_group)).size;
                groupsEl.textContent = `${distinctGroups} / 8 Active`;
            }
        } else {
            if (emptyState) emptyState.style.display = "block";
        }
    } catch (err) {
        if (loader) loader.style.display = "none";
        if (emptyState) emptyState.style.display = "block";
        console.error("Availability load error:", err);
    }
}

function renderAvailabilityCards(items) {
    const grid = document.getElementById("availabilityGrid");
    const emptyState = document.getElementById("availabilityEmptyState");
    const statusFilter = document.getElementById("filterAvailabilityStatus")?.value || "";

    let filtered = items;
    if (statusFilter === "available") {
        filtered = items.filter(i => i.available_units >= 5);
    } else if (statusFilter === "limited") {
        filtered = items.filter(i => i.available_units >= 1 && i.available_units < 5);
    } else if (statusFilter === "critical") {
        filtered = items.filter(i => i.available_units <= 2);
    }

    if (!filtered || filtered.length === 0) {
        if (grid) grid.innerHTML = "";
        if (emptyState) emptyState.style.display = "block";
        return;
    }

    if (emptyState) emptyState.style.display = "none";

    grid.innerHTML = filtered.map(item => {
        let badgeClass = "stock-available";
        let statusText = "Verified In Stock";
        const isExhausted = item.available_units <= 0;

        if (isExhausted) {
            badgeClass = "stock-unavailable";
            statusText = "Exhausted / Unavailable";
        } else if (item.available_units < 3) {
            badgeClass = "stock-critical";
            statusText = "Critical Low";
        } else if (item.available_units < 5) {
            badgeClass = "stock-limited";
            statusText = "Limited Stock";
        }

        const formattedTime = item.last_verified_time ?
            new Date(item.last_verified_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now";

        return `
            <div class="bb-blood-card ${isExhausted ? 'card-unavailable' : ''}">
                <div>
                    <div class="bb-card-top">
                        <span class="bb-group-badge" aria-label="Blood Group ${item.blood_group}">${item.blood_group}</span>
                        <span class="bb-stock-badge ${badgeClass}">${statusText}</span>
                    </div>
                    <div class="bb-card-details">
                        <h3 class="bb-comp-title">${item.component_type}</h3>
                        <div class="bb-hosp-name" title="${item.hospital_name}">🏥 ${item.hospital_name}</div>
                        <div class="bb-hosp-loc">📍 ${item.location || 'Kunraghat, Gorakhpur'}</div>
                        <div class="bb-unit-count-row">
                            <span class="bb-unit-big">${item.available_units}</span>
                            <span class="bb-unit-label">verified units available</span>
                        </div>
                        <div class="bb-last-verified">🕒 Last laboratory verification: Today, ${formattedTime}</div>
                    </div>
                </div>
                <button type="button" class="bb-card-action-btn ${isExhausted ? 'btn-emergency-source' : ''}" onclick="requestSpecificUnit('${item.hospital_id}', '${item.blood_group}', '${item.component_type}')" aria-label="Request ${item.blood_group} ${item.component_type} from ${item.hospital_name}">
                    ${isExhausted ? '🚨 Request Emergency Sourcing →' : 'Request This Blood Group →'}
                </button>
            </div>
        `;
    }).join("");
}

function applyAvailabilityFilters() {
    loadAvailability();
}

function resetAvailabilityFilters() {
    if (document.getElementById("filterBloodGroup")) document.getElementById("filterBloodGroup").value = "";
    if (document.getElementById("filterComponent")) document.getElementById("filterComponent").value = "";
    if (document.getElementById("filterHospital")) document.getElementById("filterHospital").value = "";
    if (document.getElementById("filterAvailabilityStatus")) document.getElementById("filterAvailabilityStatus").value = "";
    document.querySelectorAll(".bb-pill").forEach(p => p.classList.remove("active"));
    loadAvailability();
}

function quickSelectGroup(bg) {
    const sel = document.getElementById("filterBloodGroup");
    if (sel) {
        sel.value = bg;
        document.querySelectorAll(".bb-pill").forEach(p => {
            p.classList.toggle("active", p.textContent.trim() === bg);
        });
        loadAvailability();
    }
}

function requestSpecificUnit(hospitalId, bg, comp) {
    openEmergencyRequestModal();
    if (document.getElementById("reqHospital")) document.getElementById("reqHospital").value = hospitalId;
    if (document.getElementById("reqBloodGroup")) document.getElementById("reqBloodGroup").value = bg;
    if (document.getElementById("reqComponent")) document.getElementById("reqComponent").value = comp;
}

// -------------------------------------------------------------
// 5. EMERGENCY BLOOD REQUEST FORM & SUBMISSION
// -------------------------------------------------------------
let previousFocusedElement = null;

function handleEmergencyModalKeydown(event) {
    if (event.key === "Escape") {
        closeEmergencyRequestModal();
    }
}

function handleEmergencyModalOverlayClick(event) {
    if (event.target && event.target.id === "modalEmergencyRequest") {
        closeEmergencyRequestModal();
    }
}

function openEmergencyRequestModal() {
    const modal = document.getElementById("modalEmergencyRequest");
    if (!modal) return;
    previousFocusedElement = document.activeElement;
    modal.style.display = "flex";

    // Set default required date/time if empty (current datetime)
    const reqDateField = document.getElementById("reqRequiredAt");
    if (reqDateField && !reqDateField.value) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        reqDateField.value = now.toISOString().slice(0, 16);
    }

    // Accessible focus management
    const firstInput = document.getElementById("reqPatientName");
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 60);
    }

    document.addEventListener("keydown", handleEmergencyModalKeydown);
}

function closeEmergencyRequestModal() {
    const modal = document.getElementById("modalEmergencyRequest");
    if (modal) modal.style.display = "none";
    document.removeEventListener("keydown", handleEmergencyModalKeydown);
    if (previousFocusedElement && typeof previousFocusedElement.focus === "function") {
        previousFocusedElement.focus();
    }
}

async function handleEmergencyRequestSubmit(event) {
    event.preventDefault();
    const btn = document.getElementById("reqSubmitBtn");

    const patientName = document.getElementById("reqPatientName")?.value.trim();
    const bloodGroup = document.getElementById("reqBloodGroup")?.value;
    const componentType = document.getElementById("reqComponent")?.value;
    const hospitalId = document.getElementById("reqHospital")?.value;
    const contactPerson = document.getElementById("reqContactPerson")?.value.trim();
    const contactPhone = document.getElementById("reqContactPhone")?.value.trim();
    const relationship = document.getElementById("reqRelationship")?.value;
    const consentCheck = document.getElementById("reqConsentCheck")?.checked;

    if (!patientName || !bloodGroup || !componentType || !hospitalId || !contactPerson || !contactPhone || !relationship) {
        alert("⚠️ Please fill in all mandatory fields marked with an asterisk (*).");
        return;
    }

    if (!consentCheck) {
        alert("⚠️ Please review and accept the medical declaration and transfusion consent before submitting.");
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳ Processing Transfusion Request...</span>';
    }

    const payload = {
        patient_name: patientName,
        patient_age: Number(document.getElementById("reqPatientAge").value) || null,
        patient_gender: document.getElementById("reqPatientGender").value,
        blood_group: bloodGroup,
        component_type: componentType,
        requested_units: Number(document.getElementById("reqUnits").value) || 1,
        hospital_id: hospitalId,
        treating_department: document.getElementById("reqDepartment")?.value.trim() || "Emergency / Trauma",
        treating_doctor: document.getElementById("reqDoctor")?.value.trim() || null,
        priority: document.getElementById("reqPriority")?.value || "Emergency",
        required_at: document.getElementById("reqRequiredAt")?.value,
        contact_person: contactPerson,
        contact_phone: contactPhone,
        relationship_to_patient: relationship,
        additional_notes: document.getElementById("reqNotes")?.value.trim() || null,
        idempotency_key: `REQ-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    };

    try {
        const token = getAuthToken();
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch("/api/hospital/blood-bank/requests", {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        });

        const json = await res.json();
        if (res.ok && json.success) {
            closeEmergencyRequestModal();
            document.getElementById("emergencyRequestForm").reset();

            alert(`✅ Blood Request Submitted Successfully!\nReference Code: ${json.data.request_reference}\n\nHospital Blood Center: ${json.data.hospital_name}\nHelpline: ${json.data.hospital_helpline}\n\nOur medical team has received your request and is reviewing compatibility.`);

            switchMainTab("myRequests");
            trackRequest(json.data.request_reference);
        } else {
            alert(`⚠️ Submission Error: ${json.message || "Failed to submit request"}`);
        }
    } catch (err) {
        alert("Network or connection error. Please call the emergency hotline directly: 108 or 0551-2207701.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>🚨 Submit Emergency Request</span>';
        }
    }
}

// -------------------------------------------------------------
// 6. REQUEST TRACKING & CITIZEN REQUESTS LIST
// -------------------------------------------------------------
async function loadMyRequests() {
    const container = document.getElementById("myRequestsContainer");
    const counter = document.getElementById("myReqCounter");
    const token = getAuthToken();

    if (!token) {
        if (container) {
            container.innerHTML = `
                <div class="bb-empty-card">
                    <div class="bb-empty-icon">🔐</div>
                    <h3>Sign In to View Your Requests</h3>
                    <p>Track live verification, unit reservation, and collection times for your family's blood requests.</p>
                    <a href="../auth/login.html" class="bb-btn bb-btn-primary">Sign In to Citizen Portal</a>
                </div>
            `;
        }
        return;
    }

    try {
        const res = await fetch("/api/hospital/blood-bank/requests/my", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const json = await res.json();

        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            myRequests = json.data;
            if (counter) {
                counter.textContent = myRequests.length;
                counter.style.display = "inline-block";
            }

            container.innerHTML = myRequests.map(r => `
                <div class="bb-blood-card" style="margin-bottom: 12px;">
                    <div class="bb-card-top">
                        <div>
                            <span class="bb-group-badge" style="font-size: 18px; padding: 2px 10px;">${r.blood_group}</span>
                            <span style="font-weight:700; color:var(--bb-text-main); margin-left:8px;">${r.component_type} (${r.requested_units} Units)</span>
                        </div>
                        <span class="bb-prio-${r.priority.toLowerCase()}">${r.priority}</span>
                    </div>
                    <div style="font-size: 13px; margin: 8px 0; color: var(--bb-text-muted);">
                        <strong>Patient:</strong> ${r.patient_name} | <strong>Hospital:</strong> ${r.hospital_name || r.hospital_id}
                    </div>
                    <div style="font-size: 11px; color: var(--bb-text-muted); margin-bottom: 12px;">
                        Reference: <code>${r.request_reference}</code> | Submitted: ${new Date(r.created_at).toLocaleString()}
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="bb-st-${r.status.toLowerCase()}">Status: ${r.status}</span>
                        <button type="button" class="bb-btn bb-btn-secondary" style="font-size:11px; padding:6px 14px;" onclick="trackRequest('${r.request_reference}')">
                            Live Progress Tracker →
                        </button>
                    </div>
                </div>
            `).join("");
        } else {
            if (container) {
                container.innerHTML = `
                    <div class="bb-empty-card">
                        <div class="bb-empty-icon">📋</div>
                        <h3>No Active Blood Requests</h3>
                        <p>You have not submitted any routine or emergency blood requests yet.</p>
                        <button type="button" class="bb-btn bb-btn-emergency" onclick="openEmergencyRequestModal()">Create Emergency Blood Request</button>
                    </div>
                `;
            }
        }
    } catch (_) {}
}

async function trackRequestByRef() {
    const ref = document.getElementById("trackReferenceInput")?.value.trim();
    if (!ref) {
        alert("Please enter a valid request reference code (e.g. REQ-BLD-2026-9481).");
        return;
    }
    trackRequest(ref);
}

async function trackRequest(refOrId) {
    const card = document.getElementById("activeTrackingContainer");
    if (!card) return;

    card.style.display = "block";
    card.innerHTML = `<div class="bb-loader"><div class="bb-spinner"></div><p>Fetching real-time transfusion progress...</p></div>`;

    try {
        const token = getAuthToken();
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};
        const res = await fetch(`/api/hospital/blood-bank/requests/${refOrId}`, { headers });
        const json = await res.json();

        if (json.success && json.data) {
            renderTrackingCard(json.data);
            card.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
            card.innerHTML = `
                <div class="bb-empty-card">
                    <h3>Request Not Found</h3>
                    <p>No record found matching '${refOrId}'. Please verify the reference code.</p>
                </div>
            `;
        }
    } catch (err) {
        card.innerHTML = `<div class="bb-empty-card"><p>Unable to load tracking details at this time.</p></div>`;
    }
}

function renderTrackingCard(req) {
    const card = document.getElementById("activeTrackingContainer");
    if (!card) return;

    const stages = [
        { code: "SUBMITTED", label: "1. Submitted" },
        { code: "UNDER_REVIEW", label: "2. Under Review" },
        { code: "VERIFIED", label: "3. Verified" },
        { code: "APPROVED", label: "4. Approved" },
        { code: "RESERVED", label: "5. Units Reserved" },
        { code: "READY_FOR_COLLECTION", label: "6. Ready to Collect" },
        { code: "FULFILLED", label: "7. Fulfilled" }
    ];

    const currentIdx = stages.findIndex(s => s.code === req.status);
    const isTerminal = ["REJECTED", "CANCELLED", "EXPIRED"].includes(req.status);

    let stepperHtml = "";
    if (isTerminal) {
        stepperHtml = `
            <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); padding: 14px; border-radius: 10px; margin: 20px 0; color: #fca5a5;">
                <strong>Notice:</strong> This request ended in terminal state: <strong>${req.status}</strong>.<br>
                ${req.rejection_reason ? `Reason: ${req.rejection_reason}` : "Please contact the blood bank nodal desk for alternative matches."}
            </div>
        `;
    } else {
        stepperHtml = `
            <div class="bb-stepper">
                ${stages.map((s, idx) => {
                    let cls = "";
                    if (idx < currentIdx) cls = "completed";
                    else if (idx === currentIdx) cls = "active";
                    return `
                        <div class="bb-step ${cls}">
                            <div class="bb-step-circle">${idx < currentIdx ? "✓" : idx + 1}</div>
                            <span class="bb-step-label">${s.label}</span>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    }

    card.innerHTML = `
        <div class="bb-tracker-header">
            <div>
                <span class="bb-prio-${req.priority.toLowerCase()}">${req.priority} PRIORITY</span>
                <h3 class="bb-track-ref">${req.request_reference}</h3>
                <div style="font-size: 13px; color: var(--bb-text-muted); margin-top: 4px;">
                    Patient: <strong>${req.patient_name}</strong> (${req.blood_group} ${req.component_type}, ${req.requested_units} Units)
                </div>
            </div>
            <div style="text-align: right;">
                <span class="bb-track-status-pill bb-st-${req.status.toLowerCase()}">${req.status}</span>
                <div style="font-size: 11px; color: var(--bb-text-sub); margin-top: 6px;">Required by: ${new Date(req.required_at).toLocaleString()}</div>
            </div>
        </div>

        ${stepperHtml}

        <div style="background: #f8fafc; padding: 16px; border-radius: 10px; border: 1px solid var(--bb-border); display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-top: 20px;">
            <div>
                <div style="font-size:11px; color:var(--bb-text-muted);">Assigned Blood Center</div>
                <div style="font-size:13px; font-weight:800; color:var(--bb-text-main);">${req.hospital_name || req.hospital_id}</div>
                <div style="font-size:11px; color:var(--bb-text-sub);">${req.location_address || "Kunraghat, Gorakhpur"}</div>
            </div>
            <div>
                <div style="font-size:11px; color:var(--bb-text-muted);">Transfusion Desk Helpline</div>
                <div style="font-size:14px; font-weight:800; color:var(--bb-blue);">📞 ${req.helpline_number || "0551-2207701"}</div>
                <div style="font-size:11px; color:var(--bb-text-sub);">24x7 Emergency Line: 108</div>
            </div>
            <div>
                <div style="font-size:11px; color:var(--bb-text-muted);">Attendant / Requester</div>
                <div style="font-size:13px; font-weight:700; color:var(--bb-text-main);">${req.contact_person} (${req.relationship_to_patient})</div>
                <div style="font-size:11px; color:var(--bb-text-sub);">Phone: ${req.contact_phone}</div>
            </div>
        </div>

        ${req.reserved_units && req.reserved_units.length > 0 ? `
            <div style="margin-top: 20px; padding: 14px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px;">
                <h4 style="color:#15803d; margin:0 0 8px 0; font-size:13px; font-weight:800;">🔒 Locked &amp; Reserved Blood Units for Transfusion:</h4>
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                    ${req.reserved_units.map(u => `
                        <span style="background:#ffffff; border:1px solid #10b981; color:#065f46; padding:4px 10px; border-radius:6px; font-size:11px; font-family:monospace; font-weight:700;">
                            Barcode: ${u.unit_identifier} | Group: ${u.blood_group} | Exp: ${u.expiry_date}
                        </span>
                    `).join("")}
                </div>
                <p style="font-size:11px; color:var(--bb-text-muted); margin:8px 0 0 0;">
                    Please present this Reference Number and a signed doctor requisition slip at the blood center counter for issue.
                </p>
            </div>
        ` : ""}
    `;
}

// -------------------------------------------------------------
// 7. VOLUNTARY DONOR REGISTRATION & PROFILE
// -------------------------------------------------------------
function openDonorModal() {
    const modal = document.getElementById("modalDonorRegister");
    if (modal) modal.style.display = "flex";
}

function closeDonorModal() {
    const modal = document.getElementById("modalDonorRegister");
    if (modal) modal.style.display = "none";
}

async function handleDonorRegisterSubmit(event) {
    event.preventDefault();
    const btn = document.getElementById("donorSubmitBtn");
    if (btn) btn.disabled = true;

    const payload = {
        full_name: document.getElementById("donorFullName").value.trim(),
        age: Number(document.getElementById("donorAge").value),
        gender: document.getElementById("donorGender").value,
        blood_group: document.getElementById("donorBloodGroup").value,
        phone: document.getElementById("donorPhone").value.trim(),
        city: document.getElementById("donorCity").value.trim() || "Gorakhpur",
        locality: document.getElementById("donorLocality").value.trim() || null,
        preferred_contact_method: document.getElementById("donorContactMethod").value,
        availability_preference: document.getElementById("donorAvailability").value,
        last_donation_date: document.getElementById("donorLastDate").value || null,
        consent_to_contact: document.getElementById("donorConsentCheck").checked
    };

    try {
        const token = getAuthToken();
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch("/api/hospital/blood-bank/donors/register", {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        });

        const json = await res.json();
        if (res.ok && json.success) {
            closeDonorModal();
            document.getElementById("donorRegisterForm").reset();

            alert(`❤️ Thank You For Registering as a Voluntary Blood Donor!\n\nDonor Code: ${json.data.donor_code}\nGroup: ${json.data.blood_group}\nStatus: ${json.data.donor_status}\n\nYour profile has been confidentially logged. A medical officer will review your screening eligibility.`);

            switchMainTab("donorProfile");
            loadDonorProfile();
        } else {
            alert(`⚠️ Registration Error: ${json.message || "Failed to register"}`);
        }
    } catch (err) {
        alert("Failed to submit donor registration. Please try again.");
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function loadDonorProfile() {
    const card = document.getElementById("donorProfileCard");
    const token = getAuthToken();

    if (!token) {
        if (card) {
            card.innerHTML = `
                <div class="bb-empty-card">
                    <div class="bb-empty-icon">🩸</div>
                    <h3>Become a Voluntary Life Saver</h3>
                    <p>Register in Gorakhpur's voluntary donor registry to be contacted when emergency trauma blood is critically needed.</p>
                    <button type="button" class="bb-btn bb-btn-donor" onclick="openDonorModal()">Register as Voluntary Donor</button>
                </div>
            `;
        }
        return;
    }

    try {
        const res = await fetch("/api/hospital/blood-bank/donors/me", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const json = await res.json();

        if (json.success && json.registered && json.data) {
            const d = json.data;
            card.innerHTML = `
                <div class="bb-card-top">
                    <div>
                        <span class="bb-badge-donor">REGISTERED DONOR</span>
                        <h3 style="color:var(--bb-text-main); margin:6px 0 0 0; font-weight:800;">${d.full_name}</h3>
                        <div style="font-size:12px; color:var(--bb-text-muted);">Donor Code: <code>${d.donor_code}</code></div>
                    </div>
                    <span class="bb-group-badge" style="font-size:20px;">${d.blood_group}</span>
                </div>

                <div style="margin: 16px 0; font-size:13px; line-height:1.6; color:var(--bb-text-muted);">
                    <div>📍 <strong>Locality:</strong> ${d.locality || "Gorakhpur City"}</div>
                    <div>📞 <strong>Contact Preference:</strong> ${d.preferred_contact_method} (Confidential)</div>
                    <div>⏰ <strong>Availability:</strong> ${d.availability_preference}</div>
                    <div>📅 <strong>Last Donation:</strong> ${d.last_donation_date || "First-time donor"}</div>
                    <div>🛡️ <strong>Screening Verification:</strong> <span style="color:#34d399; font-weight:700;">${d.donor_status}</span></div>
                </div>

                <div style="border-top: 1px solid var(--bb-border); padding-top: 14px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:11px; color:#34d399;">✓ Active Emergency Consent</span>
                    <button type="button" class="bb-btn bb-btn-secondary" style="font-size:11px; color:#f87171;" onclick="withdrawDonorConsent()">
                        Withdraw Consent / Deactivate
                    </button>
                </div>
            `;
        } else {
            card.innerHTML = `
                <div class="bb-empty-card">
                    <div class="bb-empty-icon">❤️</div>
                    <h3>You are not yet registered as a donor</h3>
                    <p>Join hundreds of registered voluntary blood donors helping save lives during trauma and surgical emergencies across Gorakhpur.</p>
                    <button type="button" class="bb-btn bb-btn-donor" onclick="openDonorModal()">Register as Voluntary Donor</button>
                </div>
            `;
        }
    } catch (_) {}
}

async function withdrawDonorConsent() {
    if (!confirm("Are you sure you want to deactivate your donor profile and withdraw emergency contact consent?")) return;

    try {
        const token = getAuthToken();
        const res = await fetch("/api/hospital/blood-bank/donors/me", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ withdraw_consent: true })
        });
        const json = await res.json();
        if (json.success) {
            alert("Your donor profile has been deactivated and consent withdrawn.");
            loadDonorProfile();
        }
    } catch (_) {
        alert("Error updating consent.");
    }
}

// -------------------------------------------------------------
// 8. STAFF & ADMIN COMMAND CONSOLE
// -------------------------------------------------------------
let staffInventoryList = [];
let staffRequestsList = [];

function loadStaffConsoleData() {
    loadStaffInventory();
    loadStaffRequests();
}

function refreshStaffData() {
    loadStaffInventory();
    loadStaffRequests();
}

async function loadStaffInventory() {
    const tbody = document.getElementById("staffInventoryTableBody");
    if (!tbody) return;

    try {
        const token = getAuthToken();
        const res = await fetch(`/api/hospital/blood-bank/staff/inventory?hospital_id=${activeHospitalId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const json = await res.json();

        if (json.success && Array.isArray(json.data)) {
            staffInventoryList = json.data;
            renderStaffInventory(staffInventoryList);
        }
    } catch (err) {
        console.error("Error loading staff inventory:", err);
    }
}

function renderStaffInventory(list) {
    const tbody = document.getElementById("staffInventoryTableBody");
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px;">No inventory records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(u => `
        <tr>
            <td><code>${u.unit_identifier}</code></td>
            <td><strong style="color:#ef4444;">${u.blood_group}</strong></td>
            <td>${u.component_type}</td>
            <td>${u.volume_ml} mL</td>
            <td>${u.collection_date}</td>
            <td>${u.expiry_date}</td>
            <td>${u.storage_location || "Cold Chamber"}</td>
            <td><span style="color:${u.screening_status === 'PASSED' ? '#34d399' : '#f87171'}; font-weight:700;">${u.screening_status}</span></td>
            <td><span class="bb-st-${u.inventory_status.toLowerCase()}">${u.inventory_status}</span></td>
            <td>
                ${u.inventory_status === 'AVAILABLE' ? `
                    <button class="bb-btn bb-btn-secondary" style="font-size:10px; padding:4px 8px; color:#f87171;" onclick="promptQuarantineUnit(${u.id})">Quarantine</button>
                ` : `<span style="font-size:10px; color:var(--bb-text-sub);">Locked</span>`}
            </td>
        </tr>
    `).join("");
}

function filterStaffInventoryTable() {
    const q = document.getElementById("staffInvSearch")?.value.toLowerCase() || "";
    const bg = document.getElementById("staffInvGroupFilter")?.value || "";
    const st = document.getElementById("staffInvStatusFilter")?.value || "";

    const filtered = staffInventoryList.filter(u => {
        if (q && !u.unit_identifier.toLowerCase().includes(q) && !u.blood_group.toLowerCase().includes(q)) return false;
        if (bg && u.blood_group !== bg) return false;
        if (st && u.inventory_status !== st) return false;
        return true;
    });

    renderStaffInventory(filtered);
}

function promptQuarantineUnit(id) {
    const reason = prompt("Enter mandatory clinical reason for quarantining this unit (e.g. Temperature excursion / bag leakage / repeat screening failed):");
    if (!reason || reason.trim().length < 5) {
        alert("Action cancelled. A valid clinical explanation is required for all inventory state transitions.");
        return;
    }

    const token = getAuthToken();
    fetch(`/api/hospital/blood-bank/staff/inventory/${id}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ inventory_status: "QUARANTINED", reason })
    }).then(r => r.json()).then(res => {
        if (res.success) {
            alert(res.message);
            loadStaffInventory();
        } else {
            alert(res.message || "Failed to update unit.");
        }
    });
}

// Staff Add Unit Modal
function openAddUnitModal() {
    const modal = document.getElementById("modalAddUnit");
    if (modal) {
        const today = new Date().toISOString().slice(0, 10);
        const exp = new Date(Date.now() + 35 * 86400000).toISOString().slice(0, 10);
        document.getElementById("addUnitCollectionDate").value = today;
        document.getElementById("addUnitExpiryDate").value = exp;
        modal.style.display = "flex";
    }
}

function closeAddUnitModal() {
    const modal = document.getElementById("modalAddUnit");
    if (modal) modal.style.display = "none";
}

async function handleAddUnitSubmit(event) {
    event.preventDefault();
    const payload = {
        hospital_id: activeHospitalId,
        blood_group: document.getElementById("addUnitBloodGroup").value,
        component_type: document.getElementById("addUnitComponent").value,
        volume_ml: Number(document.getElementById("addUnitVolume").value) || 350,
        collection_date: document.getElementById("addUnitCollectionDate").value,
        expiry_date: document.getElementById("addUnitExpiryDate").value,
        storage_location: document.getElementById("addUnitStorage").value,
        batch_number: document.getElementById("addUnitBatch").value.trim() || null,
        screening_status: document.getElementById("addUnitScreening").value
    };

    try {
        const token = getAuthToken();
        const res = await fetch("/api/hospital/blood-bank/staff/inventory", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (res.ok && json.success) {
            alert(json.message);
            closeAddUnitModal();
            loadStaffInventory();
            loadAvailability();
            loadOverviewStats();
        } else {
            alert(`Error: ${json.message}`);
        }
    } catch (_) {
        alert("Failed to accession unit.");
    }
}

// Staff Request Queue & Concurrency-Safe Reservations
async function loadStaffRequests() {
    const tbody = document.getElementById("staffRequestsTableBody");
    if (!tbody) return;

    try {
        const token = getAuthToken();
        const res = await fetch(`/api/hospital/blood-bank/staff/requests?hospital_id=${activeHospitalId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const json = await res.json();

        if (json.success && Array.isArray(json.data)) {
            staffRequestsList = json.data;
            renderStaffRequests(staffRequestsList);
        }
    } catch (err) {
        console.error("Error loading staff requests:", err);
    }
}

function renderStaffRequests(list) {
    const tbody = document.getElementById("staffRequestsTableBody");
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px;">No incoming requests.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(r => `
        <tr>
            <td><code>${r.request_reference}</code></td>
            <td><span class="bb-prio-${r.priority.toLowerCase()}">${r.priority}</span></td>
            <td><strong>${r.patient_name}</strong><br><span style="font-size:10px; color:var(--bb-text-muted);">${r.treating_department || ""}</span></td>
            <td><strong style="color:#ef4444;">${r.blood_group}</strong> ${r.component_type}</td>
            <td><strong>${r.requested_units}</strong></td>
            <td>${new Date(r.required_at).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
            <td>${r.contact_person}<br><span style="font-size:10px; color:var(--bb-text-sub);">${r.contact_phone}</span></td>
            <td><span class="bb-st-${r.status.toLowerCase()}">${r.status}</span></td>
            <td>
                <div style="display:flex; gap:4px; flex-wrap:wrap;">
                    ${r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW' || r.status === 'VERIFIED' || r.status === 'APPROVED' ? `
                        <button class="bb-btn bb-btn-emergency" style="font-size:10px; padding:4px 8px;" onclick="reserveUnitsForRequest(${r.id}, '${r.request_reference}')">
                            🔒 Lock &amp; Reserve Units (FEFO)
                        </button>
                    ` : ""}
                    ${r.status === 'RESERVED' ? `
                        <button class="bb-btn bb-btn-primary" style="font-size:10px; padding:4px 8px;" onclick="updateStaffRequestStatus(${r.id}, 'READY_FOR_COLLECTION')">
                            Ready for Collection
                        </button>
                    ` : ""}
                    ${r.status === 'READY_FOR_COLLECTION' ? `
                        <button class="bb-btn bb-btn-primary" style="font-size:10px; padding:4px 8px; background:#10b981;" onclick="fulfillStaffRequest(${r.id})">
                            ✓ Dispense &amp; Fulfill
                        </button>
                    ` : ""}
                    ${r.status !== 'FULFILLED' && r.status !== 'REJECTED' && r.status !== 'CANCELLED' ? `
                        <button class="bb-btn bb-btn-secondary" style="font-size:10px; padding:4px 8px; color:#f87171;" onclick="rejectStaffRequest(${r.id})">
                            Reject
                        </button>
                    ` : ""}
                </div>
            </td>
        </tr>
    `).join("");
}

function filterStaffRequestsTable() {
    const q = document.getElementById("staffReqSearch")?.value.toLowerCase() || "";
    const prio = document.getElementById("staffReqPriorityFilter")?.value || "";
    const st = document.getElementById("staffReqStatusFilter")?.value || "";

    const filtered = staffRequestsList.filter(r => {
        if (q && !r.patient_name.toLowerCase().includes(q) && !r.request_reference.toLowerCase().includes(q) && !r.contact_phone.includes(q)) return false;
        if (prio && r.priority !== prio) return false;
        if (st && r.status !== st) return false;
        return true;
    });

    renderStaffRequests(filtered);
}

// Atomic Reserve Call
async function reserveUnitsForRequest(reqId, ref) {
    if (!confirm(`Atomically reserve verified matching blood units for request ${ref} using FEFO algorithm?`)) return;

    try {
        const token = getAuthToken();
        const res = await fetch(`/api/hospital/blood-bank/staff/requests/${reqId}/reserve`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        const json = await res.json();
        if (res.ok && json.success) {
            alert(`✅ ${json.message}\nReserved Unit(s): ${json.data.reserved_units.map(u => u.code).join(", ")}`);
            loadStaffRequests();
            loadStaffInventory();
            loadAvailability();
        } else {
            alert(`⚠️ Reservation Failure: ${json.message}`);
        }
    } catch (_) {
        alert("Failed to execute reservation transaction.");
    }
}

async function fulfillStaffRequest(reqId) {
    if (!confirm("Confirm physical blood issue to patient attendant? This transitions units to ISSUED and marks the request FULFILLED.")) return;

    try {
        const token = getAuthToken();
        const res = await fetch(`/api/hospital/blood-bank/staff/requests/${reqId}/fulfill`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const json = await res.json();
        if (res.ok && json.success) {
            alert(`✅ ${json.message}`);
            loadStaffRequests();
            loadStaffInventory();
            loadAvailability();
        } else {
            alert(`⚠️ Error: ${json.message}`);
        }
    } catch (_) {
        alert("Failed to fulfill request.");
    }
}

async function updateStaffRequestStatus(reqId, status) {
    try {
        const token = getAuthToken();
        const res = await fetch(`/api/hospital/blood-bank/staff/requests/${reqId}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        const json = await res.json();
        if (json.success) {
            loadStaffRequests();
        } else {
            alert(json.message || "Failed to update status.");
        }
    } catch (_) {}
}

function rejectStaffRequest(reqId) {
    const reason = prompt("Enter mandatory clinical or administrative reason for rejection (e.g. Cross-match incompatibility / Requisition incomplete):");
    if (!reason || reason.trim().length < 5) {
        alert("Rejection cancelled. Reason required.");
        return;
    }

    const token = getAuthToken();
    fetch(`/api/hospital/blood-bank/staff/requests/${reqId}/status`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: "REJECTED", rejection_reason: reason })
    }).then(r => r.json()).then(res => {
        if (res.success) {
            alert("Request marked as REJECTED and any locked units released.");
            loadStaffRequests();
            loadStaffInventory();
        } else {
            alert(res.message);
        }
    });
}

// Expiry Management Subtab
function loadStaffExpiryAlerts() {
    const container = document.getElementById("staffExpiryDashboard");
    if (!container) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const nearDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

    const nearExpiry = staffInventoryList.filter(u => u.expiry_date <= nearDate && u.inventory_status === "AVAILABLE");
    const expired = staffInventoryList.filter(u => u.expiry_date < todayStr && u.inventory_status !== "DISCARDED");

    container.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
            <div style="background:rgba(245, 158, 11, 0.1); border:1px solid rgba(245, 158, 11, 0.3); padding:16px; border-radius:10px;">
                <h3 style="color:#fbbf24; margin:0 0 6px 0;">⚠️ Units Expiring Within 72 Hours (${nearExpiry.length})</h3>
                <p style="font-size:12px; color:var(--bb-text-muted); margin:0;">
                    These units must be prioritized for compatible transfusion matching or apheresis component processing.
                </p>
            </div>
            <div style="background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.3); padding:16px; border-radius:10px;">
                <h3 style="color:#f87171; margin:0 0 6px 0;">🛑 Expired Units (${expired.length})</h3>
                <p style="font-size:12px; color:var(--bb-text-muted); margin:0;">
                    Expired units are automatically blocked from reservation and must be incinerated / discarded according to bio-waste norms.
                </p>
            </div>
        </div>

        <div class="bb-table-card">
            <div class="bb-table-wrapper">
                <table class="bb-data-table">
                    <thead>
                        <tr>
                            <th>Unit Barcode</th>
                            <th>Group</th>
                            <th>Component</th>
                            <th>Expiry Date</th>
                            <th>Days Remaining</th>
                            <th>Current Status</th>
                            <th>Safety Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${nearExpiry.concat(expired).map(u => {
                            const isPast = u.expiry_date < todayStr;
                            return `
                                <tr>
                                    <td><code>${u.unit_identifier}</code></td>
                                    <td><strong style="color:#ef4444;">${u.blood_group}</strong></td>
                                    <td>${u.component_type}</td>
                                    <td>${u.expiry_date}</td>
                                    <td><span style="color:${isPast ? '#f87171' : '#fbbf24'}; font-weight:700;">${isPast ? 'EXPIRED' : 'Expiring Soon'}</span></td>
                                    <td>${u.inventory_status}</td>
                                    <td>
                                        <button class="bb-btn bb-btn-secondary" style="font-size:10px; padding:4px 8px; color:#f87171;" onclick="promptQuarantineUnit(${u.id})">
                                            ${isPast ? 'Discard' : 'Quarantine'}
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Donors Subtab
async function loadStaffDonors() {
    const tbody = document.getElementById("staffDonorsTableBody");
    if (!tbody) return;

    try {
        const token = getAuthToken();
        const res = await fetch("/api/hospital/blood-bank/admin/donors", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            tbody.innerHTML = json.data.map(d => `
                <tr>
                    <td><code>${d.donor_code}</code></td>
                    <td><strong>${d.full_name}</strong></td>
                    <td>${d.age} / ${d.gender || "N/A"}</td>
                    <td><strong style="color:#ef4444;">${d.blood_group}</strong></td>
                    <td>${d.locality || "Gorakhpur"}</td>
                    <td>${d.availability_preference}</td>
                    <td><span style="color:#34d399; font-weight:700;">${d.donor_status}</span></td>
                    <td>${d.is_consent_active ? "✓ Granted" : "Revoked"}</td>
                    <td>
                        ${d.donor_status !== 'VERIFIED' ? `
                            <button class="bb-btn bb-btn-secondary" style="font-size:10px; padding:3px 8px;" onclick="verifyDonorStatus(${d.id})">Verify</button>
                        ` : `<span style="font-size:10px; color:#34d399;">Verified</span>`}
                    </td>
                </tr>
            `).join("");
        }
    } catch (_) {}
}

function verifyDonorStatus(donorId) {
    const token = getAuthToken();
    fetch(`/api/hospital/blood-bank/admin/donors/${donorId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ donor_status: "VERIFIED" })
    }).then(r => r.json()).then(res => {
        if (res.success) {
            alert("Donor marked as VERIFIED.");
            loadStaffDonors();
        }
    });
}

// Reports Subtab
async function loadStaffReports() {
    const container = document.getElementById("staffReportsContainer");
    if (!container) return;

    try {
        const token = getAuthToken();
        const res = await fetch(`/api/hospital/blood-bank/admin/reports?hospital_id=${activeHospitalId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const json = await res.json();

        if (json.success && json.data) {
            const bgDist = json.data.blood_group_distribution || [];
            const compDist = json.data.component_distribution || [];

            container.innerHTML = `
                <div class="bb-table-card" style="padding:20px; margin-bottom:20px;">
                    <h3 style="color:var(--bb-text-main); margin:0 0 14px 0; font-weight:800;">Blood Group Distribution in Active Inventory</h3>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(110px, 1fr)); gap:12px;">
                        ${bgDist.map(g => `
                            <div style="background:#f8fafc; border:1px solid var(--bb-border); padding:12px; border-radius:8px; text-align:center;">
                                <div style="font-size:20px; font-weight:900; color:#dc2626;">${g.blood_group}</div>
                                <div style="font-size:16px; font-weight:800; color:var(--bb-text-main); margin-top:4px;">${g.count}</div>
                                <div style="font-size:11px; color:var(--bb-text-sub); font-weight:600;">Units</div>
                            </div>
                        `).join("")}
                    </div>
                </div>

                <div class="bb-table-card" style="padding:20px;">
                    <h3 style="color:var(--bb-text-main); margin:0 0 14px 0; font-weight:800;">Component Distribution</h3>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:12px;">
                        ${compDist.map(c => `
                            <div style="background:#f8fafc; border:1px solid var(--bb-border); padding:12px; border-radius:8px; text-align:center;">
                                <div style="font-size:13px; font-weight:700; color:var(--bb-blue);">${c.component_type}</div>
                                <div style="font-size:18px; font-weight:800; color:var(--bb-text-main); margin-top:4px;">${c.count}</div>
                                <div style="font-size:11px; color:var(--bb-text-sub); font-weight:600;">Units Ready</div>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        }
    } catch (_) {}
}

// Global window bindings for inline HTML onclick handlers
window.switchMainTab = switchMainTab;
window.switchStaffSubTab = switchStaffSubTab;
window.applyAvailabilityFilters = applyAvailabilityFilters;
window.resetAvailabilityFilters = resetAvailabilityFilters;
window.quickSelectGroup = quickSelectGroup;
window.requestSpecificUnit = requestSpecificUnit;
window.openEmergencyRequestModal = openEmergencyRequestModal;
window.closeEmergencyRequestModal = closeEmergencyRequestModal;
window.handleEmergencyModalOverlayClick = handleEmergencyModalOverlayClick;
window.handleEmergencyRequestSubmit = handleEmergencyRequestSubmit;
window.trackRequestByRef = trackRequestByRef;
window.trackRequest = trackRequest;
window.openDonorModal = openDonorModal;
window.closeDonorModal = closeDonorModal;
window.handleDonorRegisterSubmit = handleDonorRegisterSubmit;
window.withdrawDonorConsent = withdrawDonorConsent;
window.filterStaffInventoryTable = filterStaffInventoryTable;
window.promptQuarantineUnit = promptQuarantineUnit;
window.openAddUnitModal = openAddUnitModal;
window.closeAddUnitModal = closeAddUnitModal;
window.handleAddUnitSubmit = handleAddUnitSubmit;
window.filterStaffRequestsTable = filterStaffRequestsTable;
window.reserveUnitsForRequest = reserveUnitsForRequest;
window.fulfillStaffRequest = fulfillStaffRequest;
window.updateStaffRequestStatus = updateStaffRequestStatus;
window.rejectStaffRequest = rejectStaffRequest;
window.verifyDonorStatus = verifyDonorStatus;
window.refreshStaffData = refreshStaffData;

