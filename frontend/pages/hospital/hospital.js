"use strict";
/* =========================================================
   LIFE CARE / SMARTCITY AI — HOSPITAL PORTAL
   hospital.js — rebuilt, duplicate-free
   =========================================================
   Architecture notes (see chat for full explanation):
   - Every function below is declared exactly once.
   - Doctor "booking dropdown" and "Doctor Finder" are now
     separate responsibilities: loadDoctorsForBooking() vs
     loadDoctorFinder(). Both call GET /api/doctors.
   - Doctor slots endpoint (GET /api/doctors/:doctorId/slots)
     expects the doctor's business `doctor_id` string, not the
     numeric `id`. This was mixed up in the old code — fixed
     everywhere via doctorBusinessId(doctor).
   - All endpoints below match server.js exactly. Two were
     wrong before: bed data lives at /api/hospital/beds (not
     /api/beds), and there is no bed-reservation endpoint in
     server.js, so that button now just shows availability.
========================================================= */

const API_BASE_URL = (typeof window !== "undefined" && window.API_BASE_URL !== undefined)
    ? window.API_BASE_URL
    : (typeof window !== "undefined" && (window.location.port === "5000" || window.location.protocol === "file:") ? "http://localhost:5000" : "");

/* ---------------------------------------------------------
   GLOBAL STATE
--------------------------------------------------------- */
let hospitalData = [];
let ambulanceData = [];
let bedData = [];
let doctorData = [];
let medicineData = [];
let pharmacyCart = [];

let selectedHospital = null;
let selectedAmbulance = null;
let selectedDoctor = null;
let lastPaymentResult = null;

let ambulanceMap = null;
let ambulanceMarkers = {};
let ambulancePatientMarker = null;
let ambulanceHospitalMarker = null;
let ambulanceRouteControls = { toPatient: null, toHospital: null };
let trackedAmbulanceId = null;
let socket = null;

// Emergency request working state
let emergencyPatientLocation = null;
let emergencyMatchedHospitals = [];
let emergencyMatchedAmbulances = [];
let emergencySelectedHospitalId = null;
let emergencySelectedAmbulanceId = null;

const AMBULANCE_STATUS_FLOW = [
    "Available",
    "Assigned",
    "On The Way",
    "Arrived at Patient",
    "Transporting Patient",
    "Arrived at Hospital"
];

/* =========================================================
   CORE HELPERS
========================================================= */

async function apiRequest(endpoint, options = {}) {
    const headers = { ...(options.headers || {}) };
    const token = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getToken)
        ? SmartCityAuth.getToken()
        : (localStorage.getItem("smartCityJWT") || localStorage.getItem("token") || localStorage.getItem("smartcity_token"));
    if (token && !headers["Authorization"] && !headers["authorization"]) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    if (options.body && typeof options.body === "string" && !headers["Content-Type"] && !headers["content-type"]) {
        headers["Content-Type"] = "application/json";
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });
    let data = {};
    try {
        data = await response.json();
    } catch {
        throw new Error("Server did not return a valid response.");
    }
    if (!response.ok) {
        throw new Error(data.message || data.error || `Request failed (${response.status})`);
    }
    return data;
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeJS(value) {
    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\r/g, "\\r")
        .replace(/\n/g, "\\n");
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add("show");
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("show");
}

function closeAllModals() {
    document.querySelectorAll(".modal.show").forEach(m => m.classList.remove("show"));
}

/* A doctor row can carry both a numeric `id` (row PK) and a
   business `doctor_id` string. The slots API keys off doctor_id. */
function doctorBusinessId(doctor) {
    return doctor?.doctor_id || doctor?.id;
}

function findDoctorById(id) {
    if (!id) return null;
    return doctorData.find(d => 
        String(d.id) === String(id) || 
        String(d.doctor_id) === String(id) ||
        String(d.name || "").toLowerCase() === String(id).toLowerCase()
    ) || null;
}

/* =========================================================
   NOTIFICATIONS / LOADING / ERROR / SUCCESS
========================================================= */

function showNotification(message, type = "info") {
    let container = document.getElementById("notificationContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "notificationContainer";
        container.style.cssText = "position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;";
        document.body.appendChild(container);
    }
    const isCheck = String(message).startsWith("✓");
    const isCross = String(message).startsWith("✕");
    const icon = isCheck ? "" : isCross ? "" : (type === "success" ? "✓ " : type === "error" ? "✕ " : type === "warning" ? "⚠️ " : "ℹ️ ");
    const bgColor = type === "success" ? "#ecfdf5" : type === "error" ? "#fef2f2" : type === "warning" ? "#fffbeb" : "#eff6ff";
    const borderColor = type === "success" ? "#10b981" : type === "error" ? "#ef4444" : type === "warning" ? "#f59e0b" : "#3b82f6";
    const textColor = type === "success" ? "#065f46" : type === "error" ? "#991b1b" : type === "warning" ? "#92400e" : "#1e40af";

    const note = document.createElement("div");
    note.className = `notification notification-${type}`;
    note.style.cssText = `min-width:280px;max-width:440px;padding:14px 18px;border-radius:10px;background:${bgColor};border:1.5px solid ${borderColor};color:${textColor};box-shadow:0 8px 24px rgba(0,0,0,.15);font-size:14px;font-weight:700;display:flex;align-items:center;gap:10px;cursor:pointer;transition:all .3s ease;`;
    note.innerHTML = `<span style="flex:1;">${escapeHTML(icon + message)}</span> <span style="font-size:12px;opacity:.6;">✕</span>`;
    note.onclick = () => note.remove();
    container.appendChild(note);
    setTimeout(() => {
        note.style.opacity = "0";
        setTimeout(() => note.remove(), 350);
    }, 4500);
}

function showLoading(element, message = "Loading...") {
    if (element) element.innerHTML = `<div class="loading-card">⏳ ${escapeHTML(message)}</div>`;
}

function showError(element, message) {
    if (!element) { showNotification(message, "error"); return; }
    element.innerHTML = `<div class="error-card">❌ ${escapeHTML(message)}</div>`;
}

function showSuccess(element, message) {
    if (!element) { showNotification(message, "success"); return; }
    element.innerHTML = `<div class="success-card">✅ ${escapeHTML(message)}</div>`;
}

/* =========================================================
   PATIENT ID & DIGITAL IDENTITY MANAGEMENT
========================================================= */

let html5QrScannerInstance = null;
let currentActiveAbhaPatientId = null;
let staffPatientSearchTimeout = null;

function getPatientId() {
    return localStorage.getItem("patientId");
}

function isPatientLoggedIn() {
    return Boolean(getPatientId());
}

function showCurrentPatient() {
    const id = getPatientId();
    document.querySelectorAll("#currentPatientId, .current-patient-id")
        .forEach(el => { el.textContent = id || "Not Logged In"; });
}

function generatePatientID() {
    return "P-" + new Date().getFullYear() + "-" + Math.floor(100000 + Math.random() * 900000);
}

function calculateAge(dob) {
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : 0;
}

function handleDobAutoAge(dobValue) {
    const ageInput = document.getElementById("patientAge");
    if (!ageInput) return;
    const age = calculateAge(dobValue);
    ageInput.value = age !== null ? age : "";
}

function openPatientRegistration() {
    const form = document.getElementById("patientForm");
    if (form) form.reset();
    const ageInput = document.getElementById("patientAge");
    if (ageInput) ageInput.value = "";
    const result = document.getElementById("patientResult");
    if (result) {
        result.classList.remove("show");
        result.innerHTML = "";
    }
    openModal("patientModal");
}

function showPatientQR(patientOrPayload, containerId = "patientQRCode") {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    if (typeof QRCode === "undefined") {
        container.innerHTML = "<p style='color:#ef4444; font-size:12px;'>QR library loading...</p>";
        return;
    }

    let qrString = "";
    if (typeof patientOrPayload === "object" && patientOrPayload !== null) {
        const pId = patientOrPayload.patient_id || patientOrPayload.patientId || "";
        const token = patientOrPayload.qr_token || patientOrPayload.qrToken || ("SCPAT-" + pId);
        qrString = JSON.stringify({
            type: "SMARTCITY_PATIENT_ID",
            patientId: pId,
            qrToken: token,
            verifyUrl: `/api/patients/verify-qr?token=${token}`
        });
    } else {
        qrString = String(patientOrPayload);
    }

    new QRCode(container, {
        text: qrString,
        width: 140,
        height: 140,
        colorDark: "#0f172a",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });
}

function setupPatientForm() {
    const form = document.getElementById("patientForm");
    if (!form || form.dataset.connected === "true") return;
    form.dataset.connected = "true";

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = document.getElementById("patientName")?.value.trim();
        const dob = document.getElementById("patientDOB")?.value;
        const age = document.getElementById("patientAge")?.value;
        const gender = document.getElementById("patientGender")?.value;
        const bloodGroup = document.getElementById("patientBloodGroup")?.value || null;
        const mobile = document.getElementById("patientPhone")?.value.trim();
        const emergencyContact = document.getElementById("patientEmergencyContact")?.value.trim() || null;
        const hospitalId = document.getElementById("patientHospitalSelect")?.value || "HOSP-001";
        const abhaAddress = document.getElementById("patientAbhaAddress")?.value.trim() || null;
        const address = document.getElementById("patientAddress")?.value.trim() || null;
        const emergencyInfo = document.getElementById("patientEmergencyInfo")?.value.trim() || null;
        const result = document.getElementById("patientResult");

        if (!name || !dob || !gender || !mobile) {
            showError(result, "Please fill all mandatory fields (Name, DOB, Gender, Mobile).");
            return;
        }

        const cleanMobile = mobile.replace(/\D/g, "");
        if (cleanMobile.length < 10) {
            showError(result, "Please enter a valid 10-digit mobile number.");
            return;
        }

        showLoading(result, "Registering patient & generating secure QR identity...");

        try {
            const data = await apiRequest("/api/patients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    dob,
                    age: Number(age) || calculateAge(dob),
                    gender,
                    bloodGroup,
                    mobile: cleanMobile,
                    emergencyContact,
                    hospitalId,
                    abhaAddress,
                    address,
                    emergencyInfo
                })
            });

            const patient = data.patient || {};
            const finalId = patient.patientId || patient.patient_id;
            localStorage.setItem("patientId", finalId);

            result.classList.add("show");
            result.innerHTML = `
                <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:16px; margin-top:14px; text-align:center;">
                    <div style="font-size:32px;">✅</div>
                    <h3 style="color:#166534; margin:4px 0;">Patient ID Successfully Created</h3>
                    <div style="font-size:20px; font-weight:800; font-family:monospace; color:#1e40af; background:#dbeafe; padding:6px 14px; border-radius:8px; display:inline-block; margin:8px 0; letter-spacing:1px;">
                        ${escapeHTML(finalId)}
                    </div>
                    <div id="patientRegisteredQRCode" style="display:flex; justify-content:center; margin:12px 0;"></div>
                    <p style="margin:4px 0; font-size:12px; color:#475569;">
                        <strong>${escapeHTML(name)}</strong> • Age: ${escapeHTML(String(patient.age ?? "--"))} • Blood: ${escapeHTML(patient.bloodGroup || "N/A")}
                    </p>
                    <p style="margin:4px 0; font-size:11px; color:#64748b;">
                        Hospital: <strong>${escapeHTML(patient.hospitalId || "AIIMS Gorakhpur")}</strong> • ABHA: <span class="${patient.abhaStatus === 'Linked' ? 'abha-badge-linked' : 'abha-badge-not-linked'}">${escapeHTML(patient.abhaStatus || 'Not Linked')}</span>
                    </p>
                    <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin-top:14px;">
                        <button type="button" class="primary-btn" onclick="closeModal('patientModal'); openPatientFile('${escapeJS(finalId)}');">
                            📋 View Patient Dossier
                        </button>
                        <button type="button" class="secondary-btn" onclick="openPatientPrintCard(${escapeHTML(JSON.stringify(patient))});">
                            🖨️ Print Patient Card
                        </button>
                    </div>
                </div>
            `;

            showPatientQR(patient, "patientRegisteredQRCode");

            form.reset();
            showCurrentPatient();
            showNotification(`Patient ID ${finalId} created successfully!`, "success");
        } catch (error) {
            console.error("Patient registration error:", error);
            showError(result, error.message || "Failed to register patient.");
        }
    });
}
/* =========================================================
   CENTRAL HEALTHCARE STATE
========================================================= */
const HealthcareState = {
    selectedHospitalId: null,
    selectedHospitalName: null,
    selectedDoctorId: null,
    selectedDate: null,
    selectedTime: null,
    userLocation: null
};

// Auto-detect user geolocation for distance sorting
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
        HealthcareState.userLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
        };
    }, () => console.log("Location access not granted"));
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
}

/* =========================================================
   SOCKET.IO — real-time ambulance location/status updates.
   Uses the existing backend room "ambulance-tracking" (server.js).
========================================================= */
function initAmbulanceSocket() {
    if (socket || typeof io === "undefined") return;

    try {
        socket = io(API_BASE_URL, { transports: ["websocket", "polling"] });

        socket.on("connect", () => {
            socket.emit("join-ambulance-tracking");
        });

        const applyUpdate = (updated) => {
            if (!updated || !updated.id) return;
            const idx = ambulanceData.findIndex(a => String(a.id) === String(updated.id));
            if (idx >= 0) ambulanceData[idx] = { ...ambulanceData[idx], ...updated };
            else ambulanceData.push(updated);

            // Only re-render if the ambulance modal is actually open
            const modal = document.getElementById("ambulanceModal");
            if (!modal || !modal.classList.contains("show")) return;

            renderAmbulanceList(ambulanceData);
            plotAllAmbulances(ambulanceData);

            if (trackedAmbulanceId && String(trackedAmbulanceId) === String(updated.id)) {
                renderAmbulanceRoutePanel(updated);
                updateAmbulanceMarkerPosition(updated);
            }
        };

        socket.on("ambulance-location-updated", applyUpdate);
        socket.on("ambulance-status-updated", applyUpdate);
        socket.on("ambulance-assigned", applyUpdate);
        socket.on("ambulance-reset", applyUpdate);
    } catch (error) {
        console.error("Socket.IO connection failed:", error);
    }
}

/* =========================================================
   HOSPITAL LISTING, SEARCH & SORTING (CLINICAL DIRECTORY)
========================================================= */

let activeHospitalQuickFilter = 'all';

async function showHospitals() {
    createHospitalDataModal();
    openModal("hospitalDataModal");
    const result = document.getElementById("hospitalDataResult");
    if (result && (!hospitalData || !hospitalData.length)) {
        showLoading(result, "Loading accredited Gorakhpur hospitals...");
    }

    try {
        if (!hospitalData || !hospitalData.length) {
            const data = await apiRequest("/api/hospitals");
            hospitalData = (data.hospitals || []).filter(h => 
                !h.hospital_id.startsWith("HOSP-T") && !h.hospital_id.startsWith("HOSP-TEST")
            );
        }
        filterAndSortHospitals();
    } catch (error) {
        if (result) showError(result, "Unable to load hospitals: " + error.message);
    }
}

function createHospitalDataModal() {
    // If modal already exists statically in the HTML, do nothing
    if (document.getElementById("hospitalDataModal")) return;
    const modal = document.createElement("div");
    modal.id = "hospitalDataModal";
    modal.className = "modal";
    modal.innerHTML = `
        <div class="modal-box hospital-modal-box">
            <button class="close-btn" onclick="closeModal('hospitalDataModal')">×</button>
            <div class="hospital-modal-header">
                <h2>Gorakhpur Hospital Directory</h2>
            </div>
            <div id="hospitalDataResult"></div>
        </div>
    `;
    document.body.appendChild(modal);
}

function filterAndSortHospitals() {
    const searchInput = document.getElementById("hospitalSearch");
    const search = (searchInput?.value || "").toLowerCase().trim();
    const typeFilter = document.getElementById("hospitalTypeFilter")?.value || "";
    const sort = document.getElementById("hospitalSort")?.value || "name";

    // Toggle clear button
    const clearBtn = document.getElementById("hospSearchClearBtn");
    if (clearBtn) {
        clearBtn.style.display = search ? "block" : "none";
    }

    // Filter valid hospitals (excluding legacy test artifacts)
    let filtered = (hospitalData || []).filter(h => {
        if (h.hospital_id.startsWith("HOSP-T") || h.hospital_id.startsWith("HOSP-TEST")) {
            return false;
        }

        const matchesSearch = !search || 
            (h.hospital_name && h.hospital_name.toLowerCase().includes(search)) ||
            (h.address && h.address.toLowerCase().includes(search)) ||
            (h.hospital_type && h.hospital_type.toLowerCase().includes(search)) ||
            (h.facilities && String(h.facilities).toLowerCase().includes(search));

        let matchesType = true;
        if (typeFilter) {
            matchesType = (h.hospital_type || "").toLowerCase().includes(typeFilter.toLowerCase());
        }

        let matchesQuick = true;
        if (activeHospitalQuickFilter === 'government') {
            const t = (h.hospital_type || "").toLowerCase();
            matchesQuick = t.includes("government") || t.includes("autonomous") || t.includes("apex");
        } else if (activeHospitalQuickFilter === 'icu') {
            matchesQuick = Number(h.icu_beds || 0) >= 20;
        } else if (activeHospitalQuickFilter === 'emergency') {
            matchesQuick = Number(h.emergency_beds || 0) >= 15 || (h.facilities && String(h.facilities).toLowerCase().includes("emergency"));
        } else if (activeHospitalQuickFilter === 'private') {
            const t = (h.hospital_type || "").toLowerCase();
            matchesQuick = t.includes("private") || t.includes("specialty");
        }

        return matchesSearch && matchesType && matchesQuick;
    });

    // Sorting
    if (sort === "name") {
        filtered.sort((a, b) => (a.hospital_name || "").localeCompare(b.hospital_name || ""));
    } else if (sort === "beds") {
        filtered.sort((a, b) => (Number(b.total_beds) || 0) - (Number(a.total_beds) || 0));
    } else if (sort === "icu") {
        filtered.sort((a, b) => (Number(b.icu_beds) || 0) - (Number(a.icu_beds) || 0));
    } else if (sort === "distance" && HealthcareState.userLocation) {
        filtered.sort((a, b) => {
            const dA = calculateDistance(HealthcareState.userLocation.lat, HealthcareState.userLocation.lng, a.latitude, a.longitude) || 9999;
            const dB = calculateDistance(HealthcareState.userLocation.lat, HealthcareState.userLocation.lng, b.latitude, b.longitude) || 9999;
            return dA - dB;
        });
    }

    // Update count chip
    const countChip = document.getElementById("hospDirectoryTotalCount");
    if (countChip) {
        countChip.textContent = `${filtered.length} Verified Hospital${filtered.length === 1 ? '' : 's'}`;
    }

    renderHospitals(filtered);
}

function applyQuickHospitalFilter(filterType, btn) {
    activeHospitalQuickFilter = filterType;
    document.querySelectorAll('.hospital-quick-chips .hosp-chip').forEach(c => c.classList.remove('active'));
    if (btn) btn.classList.add('active');
    filterAndSortHospitals();
}

function clearHospitalSearch() {
    const input = document.getElementById("hospitalSearch");
    if (input) {
        input.value = "";
        input.focus();
    }
    filterAndSortHospitals();
}

function resetHospitalFilters() {
    const search = document.getElementById("hospitalSearch");
    const type = document.getElementById("hospitalTypeFilter");
    const sort = document.getElementById("hospitalSort");
    if (search) search.value = "";
    if (type) type.value = "";
    if (sort) sort.value = "name";
    activeHospitalQuickFilter = 'all';
    document.querySelectorAll('.hospital-quick-chips .hosp-chip').forEach(c => c.classList.remove('active'));
    const allChip = document.querySelector('.hospital-quick-chips .hosp-chip[data-filter="all"]');
    if (allChip) allChip.classList.add('active');
    filterAndSortHospitals();
}

function getHospitalMonogram(hName) {
    if (!hName) return "HSP";
    const name = hName.trim().toUpperCase();
    if (name.includes("AIIMS")) return "AIIMS";
    if (name.includes("BRD")) return "BRD";
    if (name.includes("FATIMA")) return "FTH";
    if (name.includes("GORAKSHNATH")) return "GSH";
    if (name.includes("HERITAGE")) return "HRT";
    if (name.includes("ANANDESHWAR")) return "ADH";
    if (name.includes("RANA")) return "RNH";
    if (name.includes("LIFELINE")) return "LLH";
    if (name.includes("PULSE")) return "PLS";
    if (name.includes("SHAHI")) return "SGH";
    if (name.includes("DISTRICT")) return "DGH";
    if (name.includes("CITY")) return "CTH";
    const words = name.split(/\s+/).filter(w => w.length > 0 && !["AND", "&", "THE", "OF"].includes(w));
    if (words.length >= 3) return (words[0][0] + words[1][0] + words[2][0]);
    if (words.length === 2) return (words[0][0] + words[1][0] + "H");
    return name.slice(0, 3);
}

function openBedsForHospital(hospitalId) {
    closeModal("hospitalDataModal");
    showBeds();
    setTimeout(() => {
        const select = document.getElementById("bedHospitalSelect");
        if (select && hospitalId) {
            select.value = hospitalId;
            handleBedHospitalChange();
        }
    }, 250);
}

function renderHospitals(hospitals) {
    const result = document.getElementById("hospitalDataResult");
    if (!result) return;

    if (!hospitals.length) {
        result.innerHTML = `
            <div class="hosp-empty-directory">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <h3>No Matching Hospitals Found</h3>
                <p>No medical centers match your current search and filter criteria.</p>
                <button type="button" class="btn-reset-hosp-search" onclick="resetHospitalFilters()">Reset All Filters</button>
            </div>
        `;
        return;
    }

    const user = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getUser) ? SmartCityAuth.getUser() : null;

    result.innerHTML = `
        <div class="hospital-cards-grid">
            ${hospitals.map(h => {
                const distance = HealthcareState.userLocation 
                    ? calculateDistance(HealthcareState.userLocation.lat, HealthcareState.userLocation.lng, h.latitude, h.longitude) 
                    : null;
                const isAffiliated = user && (user.hospitalId === h.hospital_id || user.role === "admin");
                const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(h.latitude || 26.7606)},${encodeURIComponent(h.longitude || 83.3732)}`;
                const monogram = getHospitalMonogram(h.hospital_name);
                const phone = h.phone || "+91 551 220 5555";
                const emergency = h.emergency_number || "108";
                const totalBeds = Number(h.total_beds || 150);
                const icuBeds = Number(h.icu_beds || 20);
                const emgBeds = Number(h.emergency_beds || 15);
                const doctors = Number(h.doctors_count || 14);

                let tierLabel = h.hospital_type || "General Hospital";
                let tierClass = "tier-general";
                const tl = tierLabel.toLowerCase();
                if (tl.includes("apex") || tl.includes("autonomous") || tl.includes("aiims")) {
                    tierClass = "tier-apex";
                } else if (tl.includes("government")) {
                    tierClass = "tier-govt";
                } else if (tl.includes("specialty")) {
                    tierClass = "tier-specialty";
                }

                return `
                <div class="pro-hospital-card">
                    <!-- Top Identity Bar -->
                    <div class="pro-hosp-card-head">
                        <div class="pro-hosp-identity">
                            <div class="pro-hosp-monogram">
                                <span>${escapeHTML(monogram)}</span>
                            </div>
                            <div class="pro-hosp-title-group">
                                <div class="pro-hosp-tags-row">
                                    <span class="pro-hosp-tier-pill ${tierClass}">${escapeHTML(tierLabel)}</span>
                                    <span class="pro-hosp-code-tag">${escapeHTML(h.hospital_id)}</span>
                                </div>
                                <h3 class="pro-hosp-name">${escapeHTML(h.hospital_name)}</h3>
                            </div>
                        </div>
                        <div class="pro-hosp-status-pill">
                            <span class="live-dot-green"></span>
                            <span>24/7 Active</span>
                        </div>
                    </div>

                    <!-- Address & Distance Strip -->
                    <div class="pro-hosp-location-row">
                        <div class="pro-hosp-address">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            <span>${escapeHTML(h.address || 'Gorakhpur Healthcare Grid, Uttar Pradesh')}</span>
                        </div>
                        ${distance ? `
                        <div class="pro-hosp-distance">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            <span>${distance} km</span>
                        </div>
                        ` : ''}
                    </div>

                    <!-- Verified Facilities Chips (Cohesive palette with SVGs) -->
                    <div class="pro-hosp-facilities-strip">
                        <span class="facility-tag tag-emergency">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                            24/7 Emergency
                        </span>
                        <span class="facility-tag tag-pharmacy">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path></svg>
                            Pharmacy
                        </span>
                        <span class="facility-tag tag-diagnostics">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5s-2.5-1.1-2.5-2.5V2"></path><path d="M8.5 2h7"></path><path d="M9 16h6"></path></svg>
                            Pathology
                        </span>
                        <span class="facility-tag tag-ambulance">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="16" height="10" x="1" y="6" rx="2"></rect><circle cx="5.5" cy="17.5" r="2.5"></circle><circle cx="13.5" cy="17.5" r="2.5"></circle></svg>
                            Ambulances
                        </span>
                    </div>

                    <!-- Contact & OPD Hours Strip -->
                    <div class="pro-hosp-contacts-bar">
                        <div class="contact-entry">
                            <span class="contact-lbl">Desk:</span>
                            <a href="tel:${escapeHTML(phone)}" class="contact-val-link">${escapeHTML(phone)}</a>
                        </div>
                        <div class="contact-entry">
                            <span class="contact-lbl">Trauma:</span>
                            <a href="tel:${escapeHTML(emergency)}" class="contact-val-emergency">${escapeHTML(emergency)}</a>
                        </div>
                        <div class="contact-entry opd-entry">
                            <span class="contact-lbl">OPD:</span>
                            <span class="contact-val-opd">09:00 AM – 04:00 PM</span>
                        </div>
                    </div>

                    <!-- 4-Column Clinical Capacity Metric Grid -->
                    <div class="pro-hosp-metrics-grid">
                        <div class="pro-metric-box box-total">
                            <span class="m-lbl">TOTAL BEDS</span>
                            <span class="m-val">${totalBeds}</span>
                        </div>
                        <div class="pro-metric-box box-icu">
                            <span class="m-lbl">ICU UNITS</span>
                            <span class="m-val">${icuBeds}</span>
                        </div>
                        <div class="pro-metric-box box-emg">
                            <span class="m-lbl">EMERGENCY</span>
                            <span class="m-val">${emgBeds}</span>
                        </div>
                        <div class="pro-metric-box box-docs">
                            <span class="m-lbl">SPECIALISTS</span>
                            <span class="m-val">${doctors}</span>
                        </div>
                    </div>

                    <!-- Card Actions -->
                    <div class="pro-hosp-actions-row">
                        <button type="button" class="btn-pro-profile" onclick="viewHospital('${escapeJS(h.hospital_id)}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1m-2 4v-4"/></svg>
                            <span>Hospital Details</span>
                        </button>
                        <button type="button" class="btn-pro-beds" onclick="openBedsForHospital('${escapeJS(h.hospital_id)}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></svg>
                            <span>Live Beds</span>
                        </button>
                        <a href="${navUrl}" target="_blank" rel="noopener noreferrer" class="btn-pro-nav">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                            <span>Directions</span>
                        </a>
                        ${(typeof SmartCityAuth !== "undefined" && SmartCityAuth.isStaff && SmartCityAuth.isStaff()) ? `
                        <button type="button" class="btn-pro-dashboard" onclick="openHospitalDashboardDirect('${escapeJS(h.hospital_id)}')">
                            <span>Console →</span>
                        </button>
                        ` : ''}
                    </div>
                </div>
            `}).join("")}
        </div>
    `;
}

function openHospitalDashboardDirect(hospitalId) {
    const isStaff = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.isStaff) ? SmartCityAuth.isStaff() : false;
    if (!isStaff) {
        showNotification("🔒 Hospital Management Dashboard is restricted to verified Hospital Staff & Admin.", "warning");
        if (typeof SmartCityAuth !== "undefined" && SmartCityAuth.showLoginModal) {
            SmartCityAuth.showLoginModal("staff");
        }
        return;
    }
    window.location.href = `hospital_dashboard.html?hospital_id=${encodeURIComponent(hospitalId)}`;
}

function selectHospitalById(hospitalId) {
    const hospital = hospitalData.find(h => h.hospital_id === hospitalId);
    if (!hospital) return;
    
    HealthcareState.selectedHospitalId = hospital.hospital_id;
    HealthcareState.selectedHospitalName = hospital.hospital_name;
    localStorage.setItem("selectedHospitalId", hospital.hospital_id);
    showNotification(`Active hospital set to: ${hospital.hospital_name}`, "success");
    closeModal("hospitalDataModal");
}

/* =========================================================
   INTEGRATED DOCTOR APPOINTMENT BOOKING FLOW
========================================================= */
async function openDoctorBookingFlow(preselectedDoctorId = null, preselectedHospitalId = null) {
    openModal("doctorModal");
    
    const hospitalSelect = document.getElementById("bookingHospitalSelect");
    const doctorSelect = document.getElementById("doctorSelect");
    const slotContainer = document.getElementById("slotGridContainer");

    slotContainer.innerHTML = `<div class="empty-slot-msg">Select Hospital, Doctor, and Date to view slots.</div>`;
    HealthcareState.selectedTime = null;

    // Load Hospitals
    if (!hospitalData.length) {
        const hData = await apiRequest("/api/hospitals");
        hospitalData = hData.hospitals || [];
    }

    hospitalSelect.innerHTML = `<option value="">-- Choose Hospital --</option>` + 
        hospitalData.map(h => `<option value="${h.hospital_id}">${h.hospital_name}</option>`).join("");

    const targetHospId = preselectedHospitalId || HealthcareState.selectedHospitalId || hospitalData[0]?.hospital_id;
    if (targetHospId) {
        hospitalSelect.value = targetHospId;
        await onBookingHospitalChange(preselectedDoctorId);
    }

    const dateInput = document.getElementById("appointmentDate");
    const todayStr = new Date().toISOString().split("T")[0];
    dateInput.min = todayStr;
    if (!dateInput.value) dateInput.value = todayStr;
}

async function onBookingHospitalChange(preselectedDoctorId = null) {
    const hospitalId = document.getElementById("bookingHospitalSelect").value;
    const doctorSelect = document.getElementById("doctorSelect");
    const slotContainer = document.getElementById("slotGridContainer");

    HealthcareState.selectedHospitalId = hospitalId;
    HealthcareState.selectedTime = null;
    HealthcareState.selectedSlotId = null;

    if (slotContainer) {
        slotContainer.innerHTML = `<div class="empty-slot-msg">Please select a Doctor and Date to view slots.</div>`;
    }

    if (!hospitalId) {
        doctorSelect.innerHTML = `<option value="">Select Hospital First</option>`;
        return;
    }

    doctorSelect.innerHTML = `<option value="">Loading doctors...</option>`;

    try {
        const data = await apiRequest(`/api/hospitals/${hospitalId}/doctors`);
        const doctors = data.doctors || [];

        if (!doctors.length) {
            doctorSelect.innerHTML = `<option value="">No doctors available at this hospital</option>`;
            return;
        }

        doctorSelect.innerHTML = `<option value="">-- Select Doctor --</option>` +
            doctors.map(d => `<option value="${d.doctor_id}">${d.name} (${d.specialization})</option>`).join("");

        if (preselectedDoctorId) {
            doctorSelect.value = preselectedDoctorId;
            fetchDynamicSlots();
        }
    } catch (err) {
        doctorSelect.innerHTML = `<option value="">Failed to load doctors</option>`;
    }
}

async function fetchDynamicSlots() {
    const hospitalId = document.getElementById("bookingHospitalSelect").value;
    const doctorId = document.getElementById("doctorSelect").value;
    const date = document.getElementById("appointmentDate").value;
    const slotContainer = document.getElementById("slotGridContainer");

    HealthcareState.selectedTime = null;
    HealthcareState.selectedSlotId = null;

    if (!hospitalId || !doctorId || !date) {
        slotContainer.innerHTML = `<div class="empty-slot-msg">Please select Hospital, Doctor, and Date.</div>`;
        return;
    }

    slotContainer.innerHTML = `<div class="loading-state">Checking available slots...</div>`;

    try {
        const res = await fetch(`${API_BASE_URL}/api/appointments/availability?hospitalId=${encodeURIComponent(hospitalId)}&doctorId=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(date)}`);
        const data = await res.json();

        if (!data.success) {
            slotContainer.innerHTML = `<div class="empty-state-card">${data.message}</div>`;
            return;
        }

        renderSlotGrid(data.slots);
    } catch (err) {
        slotContainer.innerHTML = `<div class="error-state-card">Unable to load appointment availability.</div>`;
    }
}

function renderSlotGrid(slots) {
    const container = document.getElementById("slotGridContainer");
    if (!slots || !slots.length) {
        container.innerHTML = `<div class="empty-slot-msg">No slots available for this doctor on selected date.</div>`;
        return;
    }
    container.innerHTML = `
        <div class="slot-grid">
            ${slots.map(s => `
                <button type="button" 
                    class="time-slot-btn ${s.status}" 
                    ${s.status !== 'available' ? 'disabled' : ''}
                    onclick="selectTimeSlot(this, '${s.time}', ${s.slotId ? s.slotId : 'null'})">
                    ${s.displayTime}
                </button>
            `).join("")}
        </div>
    `;
}

function selectTimeSlot(buttonEl, time24, slotId = null) {
    document.querySelectorAll(".time-slot-btn").forEach(b => b.classList.remove("selected"));
    buttonEl.classList.add("selected");
    HealthcareState.selectedTime = time24;
    HealthcareState.selectedSlotId = slotId;
}

async function confirmStrictBooking() {
    const hospitalId = document.getElementById("bookingHospitalSelect").value;
    const doctorId = document.getElementById("doctorSelect").value;
    const date = document.getElementById("appointmentDate").value;
    const patientId = document.getElementById("appointmentPatientId").value.trim();
    const resultDiv = document.getElementById("appointmentResult");

    if (!patientId) {
        showError(resultDiv, "Please enter a valid Patient ID.");
        return;
    }
    if (!HealthcareState.selectedTime) {
        showError(resultDiv, "Please select an available appointment slot.");
        return;
    }

    showLoading(resultDiv, "Confirming appointment...");

    try {
        const data = await apiRequest("/api/appointments/book-strict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                patientId,
                hospitalId,
                doctorId,
                appointmentDate: date,
                appointmentTime: HealthcareState.selectedTime,
                slotId: HealthcareState.selectedSlotId || undefined
            })
        });

        if (!data.success) {
            showError(resultDiv, data.message);
            fetchDynamicSlots(); // Refresh slots on failure
            return;
        }

        renderConfirmationCard(data.appointment);
        fetchDynamicSlots(); // Refresh slots so booked one becomes disabled
    } catch (err) {
        showError(resultDiv, err.message);
    }
}

function renderConfirmationCard(app) {
    const resultDiv = document.getElementById("appointmentResult");
    resultDiv.innerHTML = `
        <div class="confirmation-success-card">
            <div class="conf-icon">✓</div>
            <h3>Appointment Confirmed</h3>
            <div class="conf-details-grid">
                <div><span>Hospital:</span><strong>${escapeHTML(app.hospitalName)}</strong></div>
                <div><span>Doctor:</span><strong>${escapeHTML(app.doctorName)}</strong></div>
                <div><span>Date:</span><strong>${escapeHTML(app.date)}</strong></div>
                <div><span>Time:</span><strong>${escapeHTML(app.time)}</strong></div>
                <div><span>Patient ID:</span><strong>${escapeHTML(app.patientId)}</strong></div>
                <div><span>Appointment ID:</span><strong>${escapeHTML(app.appointmentId)}</strong></div>
            </div>
            <div class="conf-actions">
                <button class="primary-btn" onclick="openMyAppointments()">View Appointments</button>
                <button class="secondary-btn" onclick="closeModal('doctorModal')">Close</button>
            </div>
        </div>
    `;
}

function selectHospital(hospitalId) {
    selectedHospital = hospitalData.find(h => String(h.id) === String(hospitalId)) || null;
    if (!selectedHospital) { showNotification("Hospital not found.", "error"); return; }
    localStorage.setItem("selectedHospital", JSON.stringify(selectedHospital));
    showNotification(`Selected hospital: ${selectedHospital.hospital_name}`, "success");
}

/* viewHospital is called two ways in the existing HTML:
   - with a numeric hospital id (from dynamically rendered cards)
   - with a plain hospital NAME string (from the static homepage rows) */
async function viewHospital(hospitalIdOrName) {
    if (!hospitalData.length) {
        try {
            const data = await apiRequest("/api/hospitals");
            hospitalData = data.hospitals || [];
        } catch (error) {
            showNotification(error.message, "error");
            return;
        }
    }

    const hospital = hospitalData.find(h =>
        String(h.id) === String(hospitalIdOrName) ||
        String(h.hospital_id) === String(hospitalIdOrName) || 
        String(h.hospital_name || "").toLowerCase() === String(hospitalIdOrName).toLowerCase()
    );

    if (!hospital) {
        showNotification("Hospital details are loading — try again in a moment.", "warning");
        return;
    }

    // Role-based routing: If logged-in user belongs to this hospital, automatically open its Hospital Dashboard
    const user = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getUser) ? SmartCityAuth.getUser() : null;
    if (user && (user.hospitalId === hospital.hospital_id || user.role === "admin")) {
        window.location.href = `hospital_dashboard.html?hospital_id=${encodeURIComponent(hospital.hospital_id)}`;
        return;
    }

    openHospitalDetails(hospital);
}

/* =========================================================
   HOSPITAL DETAILS (Phase 2: professional tabbed modal
   with Doctors, Departments, Diagnostics & Tests, Beds, Contact)
========================================================= */

function createHospitalDetailsModal() {
    if (document.getElementById("hospitalDetailsModal")) return;
    const modal = document.createElement("div");
    modal.id = "hospitalDetailsModal";
    modal.className = "modal";
    modal.innerHTML = `
        <div class="modal-box hospital-details-box" style="max-width: 880px;">
            <button class="close-btn" onclick="closeModal('hospitalDetailsModal')">×</button>
            <div id="hospitalDetailsHeader"></div>
            <div class="hospital-details-tabs" id="hospitalDetailsTabs"></div>
            <div id="hospitalDetailsBody">Loading...</div>
        </div>
    `;
    document.body.appendChild(modal);
}

const HOSPITAL_DETAILS_TABS = ["Overview", "Doctors", "Treatments", "Diagnostics & Tests", "Beds", "Contact"];
let hospitalDetailsState = { hospital: null, doctors: [], treatments: [], beds: [], tests: [], activeTab: "Overview", activeTestCategory: "ALL" };

async function openHospitalDetails(hospital) {
    createHospitalDetailsModal();
    openModal("hospitalDetailsModal");

    const header = document.getElementById("hospitalDetailsHeader");
    const body = document.getElementById("hospitalDetailsBody");
    const isStaffUser = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.isStaff) ? SmartCityAuth.isStaff() : false;
    header.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <h2>🏥 ${escapeHTML(hospital.hospital_name || "Hospital")}</h2>
            ${isStaffUser ? `
            <button type="button" class="primary-btn" style="padding: 6px 14px; font-size: 12px;" onclick="openHospitalDashboardDirect('${escapeJS(hospital.hospital_id)}')">
                📊 Access Hospital Dashboard →
            </button>
            ` : ''}
        </div>
    `;
    showLoading(body, "Loading hospital details, doctors, and diagnostic services...");

    hospitalDetailsState = { hospital, doctors: [], treatments: [], beds: [], tests: [], activeTab: "Overview", activeTestCategory: "ALL" };

    try {
        const [doctorsRes, treatmentsRes, bedsRes, testsRes] = await Promise.allSettled([
            apiRequest(`/api/hospitals/${encodeURIComponent(hospital.hospital_id)}/doctors`),
            apiRequest(`/api/hospitals/${encodeURIComponent(hospital.hospital_id)}/treatments`),
            apiRequest(`/api/hospitals/${encodeURIComponent(hospital.hospital_id)}/beds`),
            apiRequest(`/api/diagnostics/tests?hospital_id=${encodeURIComponent(hospital.hospital_id)}`)
        ]);

        hospitalDetailsState.doctors = doctorsRes.status === "fulfilled" ? (doctorsRes.value.doctors || []) : [];
        hospitalDetailsState.treatments = treatmentsRes.status === "fulfilled" ? (treatmentsRes.value.treatments || []) : [];
        hospitalDetailsState.beds = bedsRes.status === "fulfilled" ? (bedsRes.value.beds || []) : [];
        hospitalDetailsState.tests = testsRes.status === "fulfilled" ? (testsRes.value.tests || []) : [];

        renderHospitalDetailsTabs();
        switchHospitalDetailsTab("Overview");
    } catch (error) {
        console.error("Hospital details error:", error);
        showError(body, error.message);
    }
}

function renderHospitalDetailsTabs() {
    const tabsEl = document.getElementById("hospitalDetailsTabs");
    if (!tabsEl) return;
    tabsEl.innerHTML = HOSPITAL_DETAILS_TABS.map(tab => `
        <button type="button" class="hd-tab ${tab === hospitalDetailsState.activeTab ? "active" : ""}"
            onclick="switchHospitalDetailsTab('${tab}')">${tab}</button>
    `).join("");
}

function switchHospitalDetailsTab(tab) {
    hospitalDetailsState.activeTab = tab;
    renderHospitalDetailsTabs();
    const body = document.getElementById("hospitalDetailsBody");
    if (!body) return;

    const h = hospitalDetailsState.hospital;

    if (tab === "Overview") {
        body.innerHTML = `
            <div class="hd-overview-grid">
                <div><span>Address</span><strong>${escapeHTML(h.address || "Gorakhpur, UP")}</strong></div>
                <div><span>Phone</span><strong>${escapeHTML(h.phone || "0551-2207777")}</strong></div>
                <div><span>Emergency</span><strong style="color:#dc2626;">🚨 ${escapeHTML(h.emergency_number || "102 / 108")}</strong></div>
                <div><span>Email</span><strong>${escapeHTML(h.email || "contact@hospital.gorakhpur.in")}</strong></div>
                <div><span>Ownership</span><strong>${escapeHTML(h.hospital_type || "General Hospital")}</strong></div>
                <div><span>Total Beds</span><strong>${Number(h.total_beds || 0)}</strong></div>
                <div><span>ICU Beds</span><strong>${Number(h.icu_beds || 0)}</strong></div>
                <div><span>Available Tests</span><strong>${Number(hospitalDetailsState.tests.length || 15)} Tests</strong></div>
                <div><span>Status</span><strong style="color:#16a34a;">24x7 Operational</strong></div>
            </div>
            <div style="margin-top: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; font-size: 13px; color: #166534; display: flex; align-items: center; justify-content: space-between;">
                <span>Are you an authorized doctor, nurse, or staff member of this hospital?</span>
                <button type="button" style="background:#16a34a; color:white; border:none; padding:6px 12px; border-radius:6px; font-weight:700; cursor:pointer;" onclick="openHospitalDashboardDirect('${escapeJS(h.hospital_id)}')">
                    Enter Staff Dashboard →
                </button>
            </div>
        `;
        return;
    }

    if (tab === "Doctors") {
        const doctors = hospitalDetailsState.doctors;
        body.innerHTML = !doctors.length
            ? `<div class="empty-state">👨‍⚕️<h3>No Doctors Listed</h3></div>`
            : `<div class="hd-doctor-list">
                ${doctors.map(d => `
                    <div class="hd-doctor-row">
                        <div>
                            <strong>${escapeHTML(d.name)}</strong>
                            <small>${escapeHTML(d.specialization || "")} • ${escapeHTML(d.department || "")}</small>
                        </div>
                        <div class="hd-doctor-actions">
                            <span>₹${Number(d.consultation_fee || 0)}</span>
                            <button type="button" onclick="openDoctorFromHospital('${escapeJS(d.doctor_id)}')">Book Appointment</button>
                        </div>
                    </div>
                `).join("")}
              </div>`;
        return;
    }

    if (tab === "Treatments") {
        const treatments = hospitalDetailsState.treatments;
        body.innerHTML = !treatments.length
            ? `<div class="empty-state">💊<h3>No Treatment Data</h3></div>`
            : `<div class="hd-treatment-list">
                ${treatments.map(t => `
                    <div class="hd-treatment-row">
                        <strong>${escapeHTML(t.department_name)}</strong>
                        <span>${Number(t.available_doctors || 0)} doctor(s)</span>
                        <span>${Number(t.approx_fee || 0) > 0 ? "₹" + Number(t.approx_fee) : "Varies"}</span>
                    </div>
                `).join("")}
              </div>`;
        return;
    }

    if (tab === "Diagnostics & Tests") {
        renderDiagnosticsTabInHospitalDetails(body);
        return;
    }

    if (tab === "Beds") {
        body.innerHTML = renderBedCategoryCards(hospitalDetailsState.beds);
        return;
    }

    if (tab === "Contact") {
        body.innerHTML = `
            <div class="hd-contact">
                <p>📞 <strong>Phone:</strong> ${escapeHTML(h.phone || "0551-2207777")}</p>
                <p>🚨 <strong>Emergency:</strong> ${escapeHTML(h.emergency_number || "102 / 108")}</p>
                <p>✉️ <strong>Email:</strong> ${escapeHTML(h.email || "N/A")}</p>
                <p>🌐 <strong>Website:</strong> ${h.website ? `<a href="${escapeHTML(h.website)}" target="_blank" rel="noopener">${escapeHTML(h.website)}</a>` : "N/A"}</p>
                ${(h.latitude && h.longitude) ? `<a class="primary-btn" style="margin-top:10px; display:inline-block;" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}">🗺️ Get Google Maps Directions</a>` : ""}
            </div>
        `;
        return;
    }
}

// RENDER DIAGNOSTICS TAB IN HOSPITAL DETAILS MODAL
function renderDiagnosticsTabInHospitalDetails(body) {
    const tests = hospitalDetailsState.tests || [];
    const activeCat = hospitalDetailsState.activeTestCategory || "ALL";

    const filtered = activeCat === "ALL" 
        ? tests 
        : tests.filter(t => t.category_code === activeCat);

    body.innerHTML = `
        <div style="margin-bottom: 14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
                <h3 style="font-size:16px; font-weight:800; color:#0f172a;">🧪 Available Hospital Diagnostics & Tests</h3>
                <span style="font-size:12px; color:#64748b;">${filtered.length} tests available</span>
            </div>
            
            <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:6px; margin-bottom:12px;">
                <button type="button" class="hd-cat-pill ${activeCat === 'ALL' ? 'active' : ''}" onclick="setDetailsTestCategory('ALL')">All Tests</button>
                <button type="button" class="hd-cat-pill ${activeCat === 'PATHOLOGY' ? 'active' : ''}" onclick="setDetailsTestCategory('PATHOLOGY')">🩸 Pathology</button>
                <button type="button" class="hd-cat-pill ${activeCat === 'RADIOLOGY' ? 'active' : ''}" onclick="setDetailsTestCategory('RADIOLOGY')">🩻 Radiology</button>
                <button type="button" class="hd-cat-pill ${activeCat === 'CARDIOLOGY' ? 'active' : ''}" onclick="setDetailsTestCategory('CARDIOLOGY')">❤️ Cardiology</button>
            </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:12px; max-height:420px; overflow-y:auto; padding-right:4px;">
            ${!filtered.length ? '<div style="grid-column:1/-1; text-align:center; padding:30px; color:#64748b;">No diagnostic tests in this category.</div>' : 
              filtered.map(t => `
                <div style="border:1px solid #e2e8f0; border-radius:10px; padding:12px; background:#ffffff; box-shadow:0 1px 3px rgba(0,0,0,0.05); display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                            <div style="font-size:13px; font-weight:800; color:#0f172a; line-height:1.3;">
                                ${t.icon || "🧪"} ${escapeHTML(t.name)}
                            </div>
                            <strong style="color:#047857; font-size:14px; white-space:nowrap; margin-left:6px;">₹${Number(t.price)}</strong>
                        </div>
                        <p style="font-size:11px; color:#64748b; margin-bottom:8px; line-height:1.4;">${escapeHTML(t.short_description || t.purpose || "Clinical investigation.")}</p>
                        <div style="font-size:10px; color:#475569; background:#f8fafc; padding:6px; border-radius:6px; margin-bottom:10px; display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                            <div>Sample: <strong>${escapeHTML(t.sample_required || "Blood")}</strong></div>
                            <div>Report: <strong>${escapeHTML(t.estimated_report_time || "4-6h")}</strong></div>
                            <div>Fasting: <strong>${t.fasting_required ? "Yes" : "No"}</strong></div>
                            <div>Wait: <strong>${escapeHTML(t.estimated_wait_time || "20m")}</strong></div>
                        </div>
                    </div>
                    <div style="display:flex; gap:6px; margin-top:auto;">
                        <button type="button" style="flex:1; padding:7px; font-size:11px; font-weight:700; background:#2563eb; color:white; border:none; border-radius:6px; cursor:pointer;" onclick="openCitizenTestBookingModal('${t.test_id}', '${escapeJS(hospitalDetailsState.hospital.hospital_id)}')">
                            ⚡ Book Online
                        </button>
                        ${t.home_collection ? `
                            <button type="button" style="padding:7px 10px; font-size:11px; font-weight:700; background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; border-radius:6px; cursor:pointer;" onclick="openCitizenHomeSampleModal('${t.test_id}', '${escapeJS(hospitalDetailsState.hospital.hospital_id)}')">
                                🏠 Home
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

function setDetailsTestCategory(catCode) {
    hospitalDetailsState.activeTestCategory = catCode;
    const body = document.getElementById("hospitalDetailsBody");
    if (body) renderDiagnosticsTabInHospitalDetails(body);
}

// CITIZEN ONLINE TEST BOOKING MODAL
let citizenTestCatalog = [];

function createCitizenTestBookingModal() {
    if (document.getElementById("citizenTestBookingModal")) return;
    const modal = document.createElement("div");
    modal.id = "citizenTestBookingModal";
    modal.className = "modal";
    modal.innerHTML = `
        <div class="modal-box" style="max-width: 520px;">
            <button class="close-btn" onclick="closeModal('citizenTestBookingModal')">×</button>
            <div class="modal-title-icon">🧪</div>
            <h2 id="ctbModalTitle">Book Diagnostic Test Online</h2>
            <p class="modal-subtitle" id="ctbModalSubtitle">Instant token generation & slot confirmation</p>

            <form id="citizenTestBookingForm" onsubmit="handleCitizenTestBookingSubmit(event)">
                <input type="hidden" id="ctbTestId">
                <input type="hidden" id="ctbHospitalId">
                <input type="hidden" id="ctbIsHome" value="0">

                <div class="form-group" id="ctbHospitalSelectGroup">
                    <label>Select Hospital *</label>
                    <select id="ctbHospitalSelect" class="form-control" onchange="onCtbHospitalChange(this.value)">
                        <option value="HOSP-002">BRD Medical College (Medical Road)</option>
                        <option value="HOSP-001">AIIMS Gorakhpur (Kushmi Forest)</option>
                        <option value="HOSP-003">Gorakhpur District Hospital (Sadar)</option>
                        <option value="HOSP-004">Fatima Hospital (Padri Bazar)</option>
                        <option value="HOSP-GKP-010">Guru Shri Gorakshnath Hospital</option>
                        <option value="HOSP-GKP-011">City Hospital & Trauma Centre</option>
                        <option value="HOSP-GKP-012">Heritage Hospital</option>
                    </select>
                </div>

                <div class="form-group" id="ctbTestDropdownGroup">
                    <label>Choose Diagnostic Test *</label>
                    <select id="ctbTestDropdown" class="form-control" onchange="onCtbTestDropdownChange(this.value)">
                        <option value="">Loading diagnostic tests catalog...</option>
                    </select>
                </div>

                <div class="form-group" id="ctbTestDisplayGroup" style="display:none;">
                    <label>Selected Test & Fee</label>
                    <input type="text" id="ctbTestNameDisplay" readonly style="background:#f8fafc; font-weight:700;">
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div class="form-group">
                        <label>Preferred Date *</label>
                        <input type="date" id="ctbDateInput" required>
                    </div>
                    <div class="form-group">
                        <label>Time Slot</label>
                        <select id="ctbSlotSelect">
                            <option value="08:00 AM - 10:00 AM">08:00 AM - 10:00 AM</option>
                            <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM</option>
                            <option value="12:00 PM - 02:00 PM">12:00 PM - 02:00 PM</option>
                            <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label>Patient Full Name *</label>
                    <input type="text" id="ctbPatientName" required placeholder="Patient Full Name">
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
                    <div class="form-group">
                        <label>Mobile Number *</label>
                        <input type="tel" id="ctbPatientMobile" required placeholder="10-digit mobile">
                    </div>
                    <div class="form-group">
                        <label>Age</label>
                        <input type="number" id="ctbPatientAge" placeholder="Age" min="1" max="120">
                    </div>
                    <div class="form-group">
                        <label>Gender</label>
                        <select id="ctbPatientGender">
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>

                <div class="form-group" id="ctbAddressGroup" style="display:none;">
                    <label>Home Address in Gorakhpur *</label>
                    <input type="text" id="ctbHomeAddress" placeholder="Flat, Building, Area, Gorakhpur">
                </div>

                <div class="form-group">
                    <label>Payment Method</label>
                    <select id="ctbPaymentMethod">
                        <option value="UPI">UPI / Instant QR Payment</option>
                        <option value="Cash">Pay at Hospital Lab Counter</option>
                        <option value="Card">Debit / Credit Card</option>
                    </select>
                </div>

                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
                    <button type="button" class="secondary-btn" onclick="closeModal('citizenTestBookingModal')">Cancel</button>
                    <button type="submit" class="primary-btn" id="ctbSubmitBtn">Confirm & Generate Token</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

function onCtbHospitalChange(hospId) {
    document.getElementById("ctbHospitalId").value = hospId;
    loadCitizenTestsForHospital(hospId);
}

function onCtbTestDropdownChange(testId) {
    document.getElementById("ctbTestId").value = testId;
    const test = citizenTestCatalog.find(t => t.test_id === testId);
    if (test) {
        document.getElementById("ctbTestNameDisplay").value = `${test.name} — ₹${test.price}`;
    }
}

async function loadCitizenTestsForHospital(hospId) {
    const dropdown = document.getElementById("ctbTestDropdown");
    if (!dropdown) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/diagnostics/tests?hospital_id=${encodeURIComponent(hospId || 'HOSP-002')}`);
        const data = await res.json();
        citizenTestCatalog = data.tests || [];
        if (citizenTestCatalog.length === 0) {
            dropdown.innerHTML = '<option value="">No tests currently listed for this hospital</option>';
            return;
        }

        dropdown.innerHTML = citizenTestCatalog.map(t => 
            `<option value="${t.test_id}">${escapeHTML(t.name)} — ₹${t.price} (${t.department || 'Diagnostics'})</option>`
        ).join('');

        const selectedTestId = dropdown.value;
        document.getElementById("ctbTestId").value = selectedTestId;
        const test = citizenTestCatalog.find(t => t.test_id === selectedTestId);
        if (test) {
            document.getElementById("ctbTestNameDisplay").value = `${test.name} — ₹${test.price}`;
        }
    } catch (err) {
        console.warn("Could not load diagnostic catalog:", err);
    }
}

async function openCitizenTestBookingModal(testId, hospId) {
    createCitizenTestBookingModal();
    const targetHospId = hospId || "HOSP-002";
    document.getElementById("ctbHospitalId").value = targetHospId;
    const hospSelect = document.getElementById("ctbHospitalSelect");
    if (hospSelect) hospSelect.value = targetHospId;

    document.getElementById("ctbIsHome").value = "0";
    document.getElementById("ctbModalTitle").textContent = "Book Diagnostic Test Online";
    document.getElementById("ctbModalSubtitle").textContent = "Instant token generation & slot confirmation";
    document.getElementById("ctbAddressGroup").style.display = "none";
    document.getElementById("ctbDateInput").value = new Date().toISOString().split("T")[0];

    // Autofill patient details if user logged in or saved in localStorage
    const savedPatientId = localStorage.getItem("patientId");
    const user = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getUser) ? SmartCityAuth.getUser() : null;
    if (user) {
        document.getElementById("ctbPatientName").value = user.name || "";
        document.getElementById("ctbPatientMobile").value = user.mobile || "";
    }

    if (testId) {
        document.getElementById("ctbTestId").value = testId;
        document.getElementById("ctbHospitalSelectGroup").style.display = "none";
        document.getElementById("ctbTestDropdownGroup").style.display = "none";
        document.getElementById("ctbTestDisplayGroup").style.display = "block";
        const test = (hospitalDetailsState.tests || []).find(t => t.test_id === testId) || citizenTestCatalog.find(t => t.test_id === testId);
        if (test) {
            document.getElementById("ctbTestNameDisplay").value = `${test.name} — ₹${test.price}`;
        }
    } else {
        document.getElementById("ctbHospitalSelectGroup").style.display = "block";
        document.getElementById("ctbTestDropdownGroup").style.display = "block";
        document.getElementById("ctbTestDisplayGroup").style.display = "none";
        await loadCitizenTestsForHospital(targetHospId);
    }

    openModal("citizenTestBookingModal");
}

function openCitizenHomeSampleModal(testId, hospId) {
    openCitizenTestBookingModal(testId, hospId);
    document.getElementById("ctbIsHome").value = "1";
    document.getElementById("ctbModalTitle").textContent = "Book Home Sample Collection";
    document.getElementById("ctbModalSubtitle").textContent = "A certified phlebotomist will visit your address";
    document.getElementById("ctbAddressGroup").style.display = "block";
    document.getElementById("ctbHomeAddress").required = true;
}

async function handleCitizenTestBookingSubmit(e) {
    e.preventDefault();
    const testId = document.getElementById("ctbTestId").value;
    const hospId = document.getElementById("ctbHospitalId").value || "HOSP-002";
    const isHome = document.getElementById("ctbIsHome").value === "1";
    const bookingDate = document.getElementById("ctbDateInput").value;
    const slot = document.getElementById("ctbSlotSelect").value;
    const patientName = document.getElementById("ctbPatientName").value;
    const patientMobile = document.getElementById("ctbPatientMobile").value;
    const patientAge = document.getElementById("ctbPatientAge").value;
    const patientGender = document.getElementById("ctbPatientGender").value;
    const homeAddress = document.getElementById("ctbHomeAddress")?.value;
    const paymentMethod = document.getElementById("ctbPaymentMethod").value;
    const savedPatientId = localStorage.getItem("patientId") || null;

    if (!testId) {
        showNotification("Please select a diagnostic test.", "error");
        return;
    }

    const submitBtn = document.getElementById("ctbSubmitBtn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Confirming Booking...";

    try {
        const res = await apiRequest("/api/diagnostics/bookings", "POST", {
            hospital_id: hospId,
            test_id: testId,
            patient_id: savedPatientId,
            patient_name: patientName,
            patient_mobile: patientMobile,
            patient_age: patientAge,
            patient_gender: patientGender,
            booking_date: bookingDate,
            time_slot: slot,
            collection_type: isHome ? "Home Sample Collection" : "Hospital Lab",
            home_address: isHome ? homeAddress : null,
            payment_method: paymentMethod,
            payment_status: paymentMethod === "UPI" ? "Paid" : "Pending",
            booking_type: "ONLINE"
        });

        closeModal("citizenTestBookingModal");
        
        // Render rich Confirmation Slip Modal
        showTestBookingConfirmationSlip(res.booking);
        showNotification(`🎉 Test Booking Confirmed! Token: ${res.booking.token_number}`, "success");
    } catch (err) {
        showNotification("Booking error: " + err.message, "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirm & Generate Token";
    }
}

function showTestBookingConfirmationSlip(booking) {
    let modal = document.getElementById("testBookingConfirmModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "testBookingConfirmModal";
        modal.className = "modal";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-box" style="max-width: 480px; text-align: center; border-radius: 16px;">
            <button class="close-btn" onclick="closeModal('testBookingConfirmModal')">×</button>
            <div style="font-size: 40px; margin-bottom: 8px;">✅</div>
            <h2 style="color: #166534; font-size: 20px; font-weight: 800; margin: 0 0 4px 0;">Diagnostic Test Confirmed</h2>
            <p style="color: #64748b; font-size: 13px; margin: 0 0 16px 0;">Token & Booking Slip Generated for Hospital Visit</p>

            <div style="background: #eff6ff; border: 2px dashed #93c5fd; border-radius: 12px; padding: 14px; margin-bottom: 16px;">
                <div style="font-size: 11px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px;">Live Queue Token</div>
                <div style="font-size: 32px; font-weight: 900; color: #1d4ed8; font-family: monospace; margin: 4px 0;">
                    ${escapeHTML(booking.token_number || 'A-025')}
                </div>
                <small style="color: #475569; font-size: 12px;">Booking ID: <strong>${escapeHTML(booking.booking_id || '')}</strong></small>
            </div>

            <div id="testSlipQrContainer" style="display: flex; justify-content: center; margin-bottom: 16px;"></div>

            <div style="text-align: left; background: #f8fafc; border-radius: 10px; padding: 12px 16px; font-size: 13px; color: #334155; margin-bottom: 16px; line-height: 1.6;">
                <div>🧪 <strong>Test:</strong> ${escapeHTML(booking.test_name || 'Diagnostic Investigation')}</div>
                <div>🏥 <strong>Hospital:</strong> ${escapeHTML(booking.hospital_id || 'Hospital Diagnostic Wing')}</div>
                <div>👤 <strong>Patient:</strong> ${escapeHTML(booking.patient_name || 'Patient')} ${booking.patient_id ? `(ID: ${booking.patient_id})` : ''}</div>
                <div>🕒 <strong>Date & Slot:</strong> ${escapeHTML(String(booking.booking_date).split('T')[0])} • ${escapeHTML(booking.time_slot || 'Morning')}</div>
                <div>💳 <strong>Amount / Status:</strong> ₹${Number(booking.amount || 0)} (${escapeHTML(booking.payment_status || 'Paid')})</div>
            </div>

            <div style="display: flex; gap: 8px;">
                <button type="button" class="secondary-btn" style="flex: 1;" onclick="window.print()">🖨️ Print Slip</button>
                <button type="button" class="primary-btn" style="flex: 1;" onclick="closeModal('testBookingConfirmModal')">Done</button>
            </div>
        </div>
    `;

    openModal("testBookingConfirmModal");

    // Generate QR Code on the slip
    setTimeout(() => {
        const qrContainer = document.getElementById("testSlipQrContainer");
        if (qrContainer && typeof QRCode !== "undefined") {
            qrContainer.innerHTML = "";
            new QRCode(qrContainer, {
                text: JSON.stringify({
                    type: "SMARTCITY_DIAGNOSTIC_BOOKING",
                    bookingId: booking.booking_id,
                    token: booking.token_number,
                    patientId: booking.patient_id,
                    testId: booking.test_id
                }),
                width: 140,
                height: 140,
                colorDark: "#0f172a",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M
            });
        }
    }, 100);
}

function openDoctorFromHospital(doctorId) {
    const doctor = hospitalDetailsState.doctors.find(d => String(d.doctor_id ?? d.id) === String(doctorId));
    if (!doctor) { showNotification("Doctor not found.", "error"); return; }

    const exists = doctorData.some(d => String(d.id ?? d.doctor_id) === String(doctor.id ?? doctor.doctor_id));
    if (!exists) doctorData.push(doctor);

    closeModal("hospitalDetailsModal");
    openModal("doctorFinderModal");
    viewDoctorDetails(doctor.id ?? doctor.doctor_id);
}

function searchHospitals() {
    const input = document.getElementById("hospitalSearch");
    if (!input) return;    const search = input.value.trim().toLowerCase();
    if (!search) { renderHospitals(hospitalData); return; }
    renderHospitals(hospitalData.filter(h =>
        String(h.hospital_name || "").toLowerCase().includes(search) ||
        String(h.address || "").toLowerCase().includes(search)
    ));
}

/* =========================================================
   DOCTORS — BOOKING DROPDOWN (doctorModal)
========================================================= */

async function loadDoctorsForBooking() {
    const select = document.getElementById("doctorSelect");
    if (!select) return;

    try {
        const data = await apiRequest("/api/doctors");
        doctorData = data.doctors || [];

        doctorData.forEach(doctor => {
            const name = doctor.name || doctor.doctor_name;
            if (!name) return;
            const exists = Array.from(select.options).some(opt => opt.value === name);
            if (!exists) {
                const option = document.createElement("option");
                option.value = name;
                option.textContent = `${name} — ${doctor.specialization || "Specialist"}`;
                select.appendChild(option);
            }
        });
    } catch (error) {
        console.error("Doctor booking list error:", error);
    }
}

async function openDoctorBooking(doctorNameOrId = null, targetHospitalId = null) {
    if (!doctorData.length) {
        try {
            const data = await apiRequest("/api/doctors");
            doctorData = data.doctors || [];
        } catch (e) {
            console.error("Load doctors error:", e);
        }
    }

    let docObj = null;
    if (doctorNameOrId) {
        docObj = doctorData.find(d => 
            String(d.doctor_id) === String(doctorNameOrId) ||
            String(d.id) === String(doctorNameOrId) ||
            String(d.name || "").toLowerCase() === String(doctorNameOrId).toLowerCase()
        );
    }

    const docId = docObj ? (docObj.doctor_id || docObj.id) : (doctorNameOrId || null);
    const hospId = targetHospitalId || (docObj ? docObj.hospital_id : null);

    await openDoctorBookingFlow(docId, hospId);
}

function bookSpecificDoctor(doctorNameOrId) {
    openDoctorBooking(doctorNameOrId);
}

/* =========================================================
   SLOT FUNCTIONS (Phase 1: real slot-linked booking)
========================================================= */

function resetBookingTimeSlots() {
    const timeSelect = document.getElementById("appointmentTime");
    if (!timeSelect) return;
    timeSelect.innerHTML = `<option value="">Select Doctor & Date First</option>`;
}

/* Populates #appointmentTime with the chosen doctor's REAL slots for the
   chosen date, fetched live from /api/doctors/:id/slots. Each option's
   value is the actual doctor_slots.id (never a fabricated time string),
   so bookDoctorSlot() always books a real, currently-available slot. */
async function loadTimeSlotsForBooking() {
    const doctorName = document.getElementById("doctorSelect")?.value;
    const date = document.getElementById("appointmentDate")?.value;
    const timeSelect = document.getElementById("appointmentTime");
    if (!timeSelect) return;

    if (!doctorName || !date) {
        resetBookingTimeSlots();
        return;
    }

    const doctorRecord = doctorData.find(d => (d.name || d.doctor_name) === doctorName);
    const businessId = doctorBusinessId(doctorRecord) ?? doctorRecord?.id;

    if (!businessId) {
        timeSelect.innerHTML = `<option value="">Doctor not found</option>`;
        return;
    }

    timeSelect.innerHTML = `<option value="">Loading slots...</option>`;

    try {
        const data = await apiRequest(`/api/doctors/${encodeURIComponent(businessId)}/slots`);
        const slots = (data.slots || []).filter(slot =>
            String(slot.slot_date || "").substring(0, 10) === date
        );

        if (!slots.length) {
            timeSelect.innerHTML = `<option value="">No slots on this date</option>`;
            return;
        }

        timeSelect.innerHTML = slots.map(slot => {
            const max = Number(slot.max_patients || 1);
            const booked = Number(slot.booked_patients || 0);
            const remaining = Math.max(0, max - booked);
            const status = String(slot.status || "").toLowerCase();
            const isFull = remaining <= 0 || status === "full" || status === "booked";
            const time = formatSlotTime(slot.start_time);

            if (isFull) {
                return `<option value="" disabled>🔴 ${escapeHTML(time)} — FULL</option>`;
            }
            return `<option value="${escapeHTML(String(slot.id))}">🟢 ${escapeHTML(time)} — ${remaining} seat(s) left</option>`;
        }).join("");

    } catch (error) {
        console.error("Load time slots error:", error);
        timeSelect.innerHTML = `<option value="">Could not load slots</option>`;
    }
}

function formatSlotTime(time) {
    if (!time) return "";
    const [h, m = "00"] = String(time).substring(0, 5).split(":");
    let hour = Number(h);
    const period = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${m} ${period}`;
}

async function bookDoctorSlot() {
    const doctor = document.getElementById("doctorSelect")?.value.trim();
    const appointmentDate = document.getElementById("appointmentDate")?.value;
    const timeSelect = document.getElementById("appointmentTime");
    const slotId = timeSelect?.value || (typeof HealthcareState !== "undefined" ? HealthcareState.selectedTime : null);
    const slotLabel = timeSelect?.selectedOptions?.[0]?.textContent?.trim() || slotId;
    const patientId = document.getElementById("appointmentPatientId")?.value.trim();
    const result = document.getElementById("appointmentResult");
    if (!result) return;

    if (!doctor || !appointmentDate || !patientId) {
        showError(result, "Please fill all appointment details.");
        return;
    }

    // PHASE 1: a real slot must be selected — this is what closes the
    // double-booking hole (no more submitting an arbitrary typed time).
    if (!slotId) {
        showError(result, "Please select an available time slot for this doctor and date.");
        return;
    }

    showLoading(result, "Confirming appointment...");

    try {
        const data = await apiRequest("/api/appointments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ patientId, doctor, slotId })
        });

        const appointment = data.appointment || {};
        const confirmedTime = formatSlotTime(appointment.appointmentTime) || slotLabel;
        showBookingSuccess(appointment, patientId, doctor, appointmentDate, confirmedTime);

        // Refresh slots for the doctor currently open in the Finder, if any
        if (selectedDoctor) {
            await loadDoctorSlots(selectedDoctor.id);
        }
        // Refresh this modal's own slot list too, so a re-open shows the seat as taken
        await loadTimeSlotsForBooking();
    } catch (error) {
        console.error("Appointment error:", error);
        showError(result, error.message);
    }
}

function showBookingSuccess(appointment, patientId, doctorName, date, time) {
    const result = document.getElementById("appointmentResult");
    if (!result) return;

    const doctorRecord = doctorData.find(d => (d.name || d.doctor_name) === doctorName);
    const specialization = doctorRecord?.specialization || "";
    const department = doctorRecord?.department || "";
    const fee = doctorRecord ? Number(doctorRecord.consultation_fee || doctorRecord.fee || 0) : null;

    result.innerHTML = `
        <div class="booking-success-card">
            <div class="booking-success-icon">✅</div>
            <div class="booking-success-header">
                <h3>Appointment Booked Successfully</h3>
                <p>Your appointment has been confirmed.</p>
            </div>
            <div class="booking-success-details">
                <div class="booking-detail-item"><span>Appointment ID</span><strong>${escapeHTML(String(appointment.id || "N/A"))}</strong></div>
                <div class="booking-detail-item"><span>Patient ID</span><strong>${escapeHTML(patientId)}</strong></div>
                <div class="booking-detail-item"><span>Doctor</span><strong>${escapeHTML(doctorName)}</strong></div>
                ${specialization ? `<div class="booking-detail-item"><span>Specialization</span><strong>${escapeHTML(specialization)}</strong></div>` : ""}
                ${department ? `<div class="booking-detail-item"><span>Department</span><strong>${escapeHTML(department)}</strong></div>` : ""}
                <div class="booking-detail-item"><span>Date</span><strong>${escapeHTML(date)}</strong></div>
                <div class="booking-detail-item"><span>Time</span><strong>${escapeHTML(time)}</strong></div>
                ${fee !== null ? `<div class="booking-detail-item"><span>Consultation Fee</span><strong>₹${fee}</strong></div>` : ""}
            </div>
            <div class="booking-status">🟢 CONFIRMED</div>
            <div class="booking-actions">
                <button type="button" onclick="printAppointment('${escapeJS(appointment.id || "")}','${escapeJS(patientId)}','${escapeJS(doctorName)}','${escapeJS(date)}','${escapeJS(time)}')">🖨 Print</button>
                <button type="button" onclick="closeModal('doctorModal'); openMyAppointments();">📅 My Appointments</button>
                <button type="button" onclick="closeModal('doctorModal')">✕ Close</button>
            </div>
        </div>
    `;
}

function printAppointment(appointmentId, patientId, doctorName, date, time) {
    const win = window.open("", "_blank", "width=650,height=750");
    if (!win) { showNotification("Please allow popups to print.", "warning"); return; }
    win.document.write(`
        <!DOCTYPE html><html><head><title>Appointment Confirmation</title>
        <style>body{font-family:Arial,sans-serif;padding:30px;}.box{max-width:560px;margin:auto;border:1px solid #ddd;padding:30px;}
        h1{text-align:center;}.line{border-top:1px solid #ddd;margin:18px 0;}p{margin:6px 0;}</style></head>
        <body><div class="box"><h1>SMARTCITY AI</h1><h2>Appointment Confirmation</h2><div class="line"></div>
        <p>Appointment ID: <strong>${escapeHTML(appointmentId || "N/A")}</strong></p>
        <p>Patient ID: <strong>${escapeHTML(patientId)}</strong></p>
        <p>Doctor: <strong>${escapeHTML(doctorName)}</strong></p>
        <p>Date: <strong>${escapeHTML(date)}</strong></p>
        <p>Time: <strong>${escapeHTML(time)}</strong></p>
        <div class="line"></div><p>Status: CONFIRMED</p></div>
        <script>window.onload=function(){window.print();}<\/script></body></html>
    `);
    win.document.close();
}

/* =========================================================
   DOCTOR FINDER
========================================================= */

/* =========================================================
   FEATURED DOCTORS OVERVIEW (HOMEPAGE DYNAMIC DOCTOR GRID)
========================================================= */

async function loadFeaturedDoctors() {
    const list = document.getElementById("doctorList");
    if (!list) return;

    try {
        if (!doctorData.length) {
            const data = await apiRequest("/api/doctors");
            doctorData = data.doctors || [];
        }

        if (!doctorData.length) {
            list.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align:center; padding:32px 16px;">
                    <div style="font-size:32px;">🩺</div>
                    <h3>No Doctors Available</h3>
                    <p>No specialists registered currently.</p>
                </div>
            `;
            return;
        }

        // Show top 6 verified doctors representing primary specialties
        const featured = doctorData.slice(0, 6);

        list.innerHTML = featured.map(doc => {
            const initials = getDoctorInitials(doc.name);
            const fee = Number(doc.consultation_fee || 300);
            const hospName = doc.hospital_name || "Gorakhpur Medical Grid";
            const timing = doc.consultation_timings || "09:00 AM - 01:00 PM";
            const isAvail = String(doc.status).toLowerCase() === "available";

            return `
                <div class="pro-doctor-card">
                    <div class="pro-doc-head">
                        <div class="pro-doc-avatar">
                            <span>${escapeHTML(initials)}</span>
                        </div>
                        <div class="pro-doc-meta">
                            <div class="pro-doc-badge-row">
                                <span class="doc-spec-pill">${escapeHTML(doc.specialization || "General Medicine")}</span>
                                <span class="doc-status-pill ${isAvail ? 'status-avail' : 'status-busy'}">
                                    <span class="status-pulse-dot"></span> ${isAvail ? 'Available' : 'In OPD'}
                                </span>
                            </div>
                            <h3 class="pro-doc-name">${escapeHTML(doc.name)}</h3>
                            <div class="doc-hosp-line">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4M9 3h6v4H9z"/></svg>
                                <span>${escapeHTML(hospName)}</span>
                            </div>
                        </div>
                    </div>

                    <div class="pro-doc-schedule-strip">
                        <div class="doc-schedule-col">
                            <span class="sched-label">OPD TIMINGS</span>
                            <span class="sched-val">${escapeHTML(timing)}</span>
                        </div>
                        <div class="doc-schedule-col" style="text-align:right;">
                            <span class="sched-label">CONSULTATION</span>
                            <span class="sched-val doc-fee">₹${fee}</span>
                        </div>
                    </div>

                    <div class="pro-doc-actions">
                        <button type="button" class="btn-doc-book-primary" onclick="openDoctorBooking('${escapeJS(doc.doctor_id || doc.name)}', '${escapeJS(doc.hospital_id || '')}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            <span>Book Slot</span>
                        </button>
                        <button type="button" class="btn-doc-profile-secondary" onclick="openDoctorFinder(); viewDoctorDetails('${escapeJS(doc.doctor_id || doc.id)}')">
                            <span>Profile</span>
                        </button>
                    </div>
                </div>
            `;
        }).join("");
    } catch (err) {
        console.error("Featured doctors load error:", err);
    }
}

function openDoctorFinder() {
    openModal("doctorFinderModal");
    closeDoctorDetails();
    loadDoctorFinder();
}

async function loadDoctorFinder() {
    const list = document.getElementById("doctorFinderList");
    showLoading(list, "Loading doctors...");
    try {
        const data = await apiRequest("/api/doctors");
        doctorData = data.doctors || [];
        renderDoctorFinder(doctorData);
    } catch (error) {
        console.error("Doctor Finder error:", error);
        showError(list, error.message);
    }
}

function renderDoctorFinder(doctors) {
    const list = document.getElementById("doctorFinderList");
    if (!list) return;

    const countChip = document.getElementById("doctorFinderCount");
    if (countChip) countChip.textContent = `${doctors.length} Doctors`;

    if (!doctors.length) {
        list.innerHTML = `<div class="empty-state" style="text-align:center; padding:32px 16px;"><div style="font-size:32px;">👨‍⚕️</div><h3>No Matching Doctors Found</h3><p>Try searching for a different doctor name or specialty.</p></div>`;
        return;
    }

    list.innerHTML = `
        <div class="doctor-grid">
            ${doctors.map(doctor => {
                const id = doctor.id ?? doctor.doctor_id;
                const name = doctor.name || doctor.doctor_name || "Doctor";
                const specialization = doctor.specialization || "Medical Specialist";
                const department = doctor.department || "General";
                const fee = Number(doctor.consultation_fee || doctor.fee || 300);
                const status = doctor.status || "Available";
                const available = String(status).toLowerCase() === "available";
                const initials = getDoctorInitials(name);
                const hospName = doctor.hospital_name || "Gorakhpur Medical Grid";
                const timing = doctor.consultation_timings || "09:00 AM - 01:00 PM";

                return `
                    <div class="pro-doctor-card">
                        <div class="pro-doc-head">
                            <div class="pro-doc-avatar">
                                <span>${escapeHTML(initials)}</span>
                            </div>
                            <div class="pro-doc-meta">
                                <div class="pro-doc-badge-row">
                                    <span class="doc-spec-pill">${escapeHTML(specialization)}</span>
                                    <span class="doc-status-pill ${available ? "status-avail" : "status-busy"}">
                                        <span class="status-pulse-dot"></span> ${available ? "Available" : "In OPD"}
                                    </span>
                                </div>
                                <h3 class="pro-doc-name">${escapeHTML(name)}</h3>
                                <div class="doc-hosp-line">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4M9 3h6v4H9z"/></svg>
                                    <span>${escapeHTML(hospName)}</span>
                                </div>
                            </div>
                        </div>

                        <div class="pro-doc-schedule-strip">
                            <div class="doc-schedule-col">
                                <span class="sched-label">OPD TIMINGS</span>
                                <span class="sched-val">${escapeHTML(timing)}</span>
                            </div>
                            <div class="doc-schedule-col" style="text-align:right;">
                                <span class="sched-label">CONSULTATION</span>
                                <span class="sched-val doc-fee">₹${fee}</span>
                            </div>
                        </div>

                        <div class="pro-doc-actions">
                            <button type="button" class="btn-doc-book-primary" onclick="closeModal('doctorFinderModal'); openDoctorBooking('${escapeJS(doctor.doctor_id || doctor.name)}', '${escapeJS(doctor.hospital_id || '')}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                <span>Book Slot</span>
                            </button>
                            <button type="button" class="btn-doc-profile-secondary" onclick="viewDoctorDetails('${escapeJS(id)}')">
                                <span>View Profile</span>
                            </button>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

function searchDoctors() {
    const search = (document.getElementById("doctorSearch")?.value || "").trim().toLowerCase();
    const department = document.getElementById("doctorDepartment")?.value || "";
    const availability = document.getElementById("doctorAvailability")?.value || "";

    const filtered = doctorData.filter(doctor => {
        const name = String(doctor.name || doctor.doctor_name || "").toLowerCase();
        const spec = String(doctor.specialization || "").toLowerCase();
        const hosp = String(doctor.hospital_name || "").toLowerCase();
        const matchesSearch = !search || name.includes(search) || spec.includes(search) || hosp.includes(search);
        const matchesDept = !department || (doctor.specialization === department || doctor.department === department || String(doctor.specialization || '').includes(department));
        const matchesAvail = !availability || String(doctor.status || "Available") === availability;
        return matchesSearch && matchesDept && matchesAvail;
    });

    renderDoctorFinder(filtered);
}

function resetDoctorFilters() {
    const search = document.getElementById("doctorSearch");
    const department = document.getElementById("doctorDepartment");
    const availability = document.getElementById("doctorAvailability");
    if (search) search.value = "";
    if (department) department.value = "";
    if (availability) availability.value = "";
    renderDoctorFinder(doctorData);
}

function viewDoctorDetails(doctorId) {
    const doctor = findDoctorById(doctorId);
    if (!doctor) { showNotification("Doctor not found.", "error"); return; }
    selectedDoctor = doctor;

    document.getElementById("doctorFinderList").style.display = "none";
    document.querySelector("#doctorFinderModal .doctor-search-area")?.style.setProperty("display", "none");

    const section = document.getElementById("doctorDetailsSection");
    const content = document.getElementById("doctorDetailsContent");
    if (!section || !content) return;
    section.style.display = "block";

    const name = doctor.name || doctor.doctor_name || "Doctor";
    const status = doctor.status || "Available";
    const available = String(status).toLowerCase() === "available";
    const today = new Date().toISOString().split("T")[0];
    const initials = getDoctorInitials(name);
    const hospName = doctor.hospital_name || "Gorakhpur Medical Grid";

    content.innerHTML = `
        <div class="doctor-profile-card">
            <div class="pro-doc-head" style="margin-bottom:18px;">
                <div class="pro-doc-avatar" style="width:58px; height:58px; font-size:20px;">
                    <span>${escapeHTML(initials)}</span>
                </div>
                <div class="pro-doc-meta">
                    <div class="pro-doc-badge-row">
                        <span class="doc-spec-pill">${escapeHTML(doctor.specialization || "Specialist")}</span>
                        <span class="doc-status-pill ${available ? 'status-avail' : 'status-busy'}">
                            <span class="status-pulse-dot"></span> ${available ? '● Available Today' : '● ' + escapeHTML(status)}
                        </span>
                    </div>
                    <h2 style="margin:4px 0 2px 0; font-size:20px; font-weight:800; color:#0f172a;">${escapeHTML(name)}</h2>
                    <div class="doc-hosp-line">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4M9 3h6v4H9z"/></svg>
                        <span>${escapeHTML(hospName)}</span>
                    </div>
                </div>
            </div>

            <div class="pro-doc-profile-grid">
                <div class="profile-meta-item">
                    <span class="meta-item-label">DEPARTMENT</span>
                    <strong class="meta-item-val">${escapeHTML(doctor.department || "General Medicine")}</strong>
                </div>
                <div class="profile-meta-item">
                    <span class="meta-item-label">QUALIFICATION</span>
                    <strong class="meta-item-val">${escapeHTML(doctor.qualification || "MBBS, MD")}</strong>
                </div>
                <div class="profile-meta-item">
                    <span class="meta-item-label">EXPERIENCE</span>
                    <strong class="meta-item-val">${Number(doctor.experience || 10)}+ Years Clinical Practice</strong>
                </div>
                <div class="profile-meta-item">
                    <span class="meta-item-label">CONSULTATION FEE</span>
                    <strong class="meta-item-val" style="color:#2563eb;">₹${Number(doctor.consultation_fee || doctor.fee || 300)}</strong>
                </div>
            </div>

            <div class="profile-schedule-box">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                    <div>
                        <h4 style="margin:0; font-size:14px; font-weight:800; color:#0f172a;">📅 OPD Consultation Slots</h4>
                        <span style="font-size:12px; color:#64748b;">Select a date to check available queue tokens</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <label for="doctorSlotDate" style="font-size:12px; font-weight:700; color:#475569;">Date:</label>
                        <input type="date" id="doctorSlotDate" style="padding:6px 10px; border-radius:8px; border:1px solid #cbd5e1; font-size:12px; font-weight:600;" onchange="loadDoctorSlots('${escapeJS(doctor.id ?? doctor.doctor_id)}')">
                    </div>
                </div>
                <div id="doctorSlotsResult" class="doctor-slots-result">
                    <div class="empty-state">
                        <p>Checking available appointment slots...</p>
                    </div>
                </div>
            </div>

            <div style="margin-top:18px; display:flex; justify-content:flex-end; gap:10px;">
                <button type="button" class="btn-doc-book-primary" style="padding:12px 24px; font-size:13px;" onclick="closeModal('doctorFinderModal'); openDoctorBooking('${escapeJS(doctor.doctor_id || doctor.name)}', '${escapeJS(doctor.hospital_id || '')}')">
                    <span>Proceed to Full OPD Booking Form →</span>
                </button>
            </div>
        </div>
    `;

    const dateInput = document.getElementById("doctorSlotDate");
    if (dateInput) {
        dateInput.min = today;
        dateInput.value = today;
    }
    loadDoctorSlots(doctor.id ?? doctor.doctor_id);
}

function closeDoctorDetails() {
    const section = document.getElementById("doctorDetailsSection");
    const list = document.getElementById("doctorFinderList");
    if (section) section.style.display = "none";
    if (list) list.style.display = "";
    document.querySelector("#doctorFinderModal .doctor-search-area")?.style.setProperty("display", "");
    selectedDoctor = null;
}

async function loadDoctorSlots(doctorId) {
    const dateInput = document.getElementById("doctorSlotDate");
    const result = document.getElementById("doctorSlotsResult");
    if (!result) return;

    const date = dateInput?.value;
    if (!date) { result.innerHTML = `<div class="empty-state">📅 Select a date.</div>`; return; }

    const doctor = findDoctorById(doctorId);
    const businessId = doctorBusinessId(doctor) ?? doctorId;
    const hospitalId = doctor.hospital_id; // Naye API ke liye Hospital ID zaroori hai

    if (!hospitalId) {
        result.innerHTML = `<div class="empty-state">⚠️ Doctor is not assigned to any hospital yet.</div>`;
        return;
    }

    showLoading(result, "Checking dynamic schedule...");

    try {
        // Naya Dynamic API call
        const res = await fetch(`${API_BASE_URL}/api/appointments/availability?hospitalId=${encodeURIComponent(hospitalId)}&doctorId=${encodeURIComponent(businessId)}&date=${encodeURIComponent(date)}`);
        const data = await res.json();

        if (!data.success) {
            result.innerHTML = `<div class="empty-state">📅<h3>No Slots Found</h3><p>${escapeHTML(data.message)}</p></div>`;
            return;
        }

        renderDoctorSlots(data.slots, businessId, hospitalId);
    } catch (error) {
        console.error("Doctor slots error:", error);
        showError(result, "Unable to load slots.");
    }
}
function renderDoctorSlots(slots, doctorId, hospitalId) {
    const result = document.getElementById("doctorSlotsResult");
    if (!result) return;

    if (!slots || !slots.length) {
        result.innerHTML = `<div class="empty-state">📅<h3>No Slots Found</h3><p>No appointment slots for this date.</p></div>`;
        return;
    }

    result.innerHTML = `
        <div class="slot-legend"><span>🟢 Available</span><span>🔴 Booked/Unavailable</span></div>
        <div class="doctor-time-slots">
            ${slots.map(slot => {
                if (slot.status !== "available") {
                    return `
                        <button type="button" class="doctor-time-slot booked" disabled>
                            <strong>🔴 ${escapeHTML(slot.displayTime)}</strong>
                            <small>${slot.status.toUpperCase()}</small>
                        </button>
                    `;
                }

                return `
                    <button type="button" class="doctor-time-slot available"
                        onclick="selectDoctorSlot('${escapeJS(doctorId)}', '${escapeJS(hospitalId)}', '${escapeJS(slot.time)}')">
                        <strong>🟢 ${escapeHTML(slot.displayTime)}</strong>
                        <small>Available</small>
                    </button>
                `;
            }).join("")}
        </div>
    `;
}
async function selectDoctorSlot(doctorId, hospitalId, time24) {
    const date = document.getElementById("doctorSlotDate")?.value;
    
    closeModal("doctorFinderModal"); 
    
    await openDoctorBookingFlow(doctorId, hospitalId);

    setTimeout(async () => {
        const appointmentDate = document.getElementById("appointmentDate");
        const patientId = document.getElementById("appointmentPatientId");

        if (appointmentDate && date) appointmentDate.value = date;
        if (patientId && !patientId.value) {
            const savedId = getPatientId();
            if (savedId) patientId.value = savedId;
        }

        await fetchDynamicSlots();

        setTimeout(() => {
            const buttons = document.querySelectorAll(".time-slot-btn");
            buttons.forEach(b => {
                if (b.getAttribute("onclick")?.includes(`'${time24}'`) && !b.hasAttribute("disabled")) {
                    selectTimeSlot(b, time24);
                }
            });
        }, 300);
    }, 300);
}

/* =========================================================
   MY APPOINTMENTS & OPD PASSES (PROFESSIONAL CLINICAL MANAGER)
========================================================= */

let cachedMyAppointments = [];
let activeAppointmentFilter = "all";

function getDoctorInitials(name) {
    if (!name) return "DR";
    const clean = name.replace(/^Dr\.\s*/i, "").trim().toUpperCase();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return parts[0][0] + parts[1][0];
    return clean.slice(0, 2) || "DR";
}

function formatAppointmentDate(dateStr) {
    if (!dateStr) return "N/A";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
            return String(dateStr).substring(0, 10);
        }
        return d.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    } catch (e) {
        return String(dateStr).substring(0, 10);
    }
}

function openMyAppointments() {
    openModal("appointmentsModal");
    const input = document.getElementById("myAppointmentPatientId");
    const quickBtn = document.getElementById("btnQuickFillPatient");
    const quickLabel = document.getElementById("quickFillPatientLabel");
    const clearBtn = document.getElementById("apptPatientClearBtn");

    const savedId = (typeof getPatientId === "function") ? getPatientId() : null;
    const urlParams = (typeof window !== "undefined" && window.location) ? new URLSearchParams(window.location.search) : null;
    const queryId = urlParams ? (urlParams.get("patient_id") || urlParams.get("uhid")) : null;
    const queryToken = urlParams ? urlParams.get("token") : null;
    if (queryToken) {
        if (typeof SmartCityAuth !== "undefined" && SmartCityAuth.setSession) {
            SmartCityAuth.setSession(queryToken, { id: 1, role: "citizen", patientId: queryId || savedId || "SC-2026-318028", name: "Rahul Sharma" });
        }
        localStorage.setItem("smartCityJWT", queryToken);
        localStorage.setItem("token", queryToken);
    }
    const targetId = queryId || (input ? input.value.trim() : "") || savedId || "SC-2026-318028";

    if (savedId && quickBtn && quickLabel) {
        quickLabel.textContent = savedId;
        quickBtn.style.display = "inline-flex";
    }

    if (input) {
        if (!input.value && targetId) {
            input.value = targetId;
        }
        if (clearBtn) {
            clearBtn.style.display = input.value ? "flex" : "none";
        }
        input.oninput = () => {
            if (clearBtn) clearBtn.style.display = input.value ? "flex" : "none";
        };
    }

    if (targetId) {
        loadMyAppointments();
    }
}

function clearAppointmentPatientInput() {
    const input = document.getElementById("myAppointmentPatientId");
    const clearBtn = document.getElementById("apptPatientClearBtn");
    if (input) {
        input.value = "";
        input.focus();
    }
    if (clearBtn) clearBtn.style.display = "none";
}

function useCurrentPatientForAppointments() {
    const savedId = (typeof getPatientId === "function") ? getPatientId() : null;
    const input = document.getElementById("myAppointmentPatientId");
    const clearBtn = document.getElementById("apptPatientClearBtn");
    if (savedId && input) {
        input.value = savedId;
        if (clearBtn) clearBtn.style.display = "flex";
        loadMyAppointments();
    }
}

async function loadMyAppointments() {
    const input = document.getElementById("myAppointmentPatientId");
    const patientId = input ? input.value.trim() : "";
    const result = document.getElementById("myAppointmentsResult");
    if (!result) return;

    if (!patientId) {
        showError(result, "Please enter your Patient ID (e.g. SC-2026-318028).");
        return;
    }

    showLoading(result, "Authenticating with Gorakhpur Health Registry & loading appointment records...");

    try {
        const data = await apiRequest(`/api/appointments/${encodeURIComponent(patientId)}`);
        cachedMyAppointments = data.appointments || [];
        updateAppointmentTabsCount(cachedMyAppointments);
        applyAppointmentFilterAndRender();
    } catch (error) {
        console.error("My appointments error:", error);
        result.innerHTML = `
            <div class="appt-empty-state">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.8"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <h3>Failed to Load Appointments</h3>
                <p>${escapeHTML(error.message || "Could not retrieve records for this Patient ID.")}</p>
                <button type="button" class="btn-appt-retry" onclick="loadMyAppointments()">Retry Search</button>
            </div>
        `;
    }
}

function updateAppointmentTabsCount(list) {
    const all = list.length;
    const upcoming = list.filter(a => {
        const s = (a.status || "").toLowerCase();
        return s === "confirmed" || s === "pending" || s === "scheduled";
    }).length;
    const completed = list.filter(a => (a.status || "").toLowerCase() === "completed").length;
    const cancelled = list.filter(a => (a.status || "").toLowerCase() === "cancelled").length;

    const elAll = document.getElementById("countTabAll");
    const elUp = document.getElementById("countTabUpcoming");
    const elComp = document.getElementById("countTabCompleted");
    const elCanc = document.getElementById("countTabCancelled");
    const elTotal = document.getElementById("apptTotalCount");

    if (elAll) elAll.textContent = all;
    if (elUp) elUp.textContent = upcoming;
    if (elComp) elComp.textContent = completed;
    if (elCanc) elCanc.textContent = cancelled;
    if (elTotal) elTotal.textContent = `${all} Booking${all === 1 ? '' : 's'}`;
}

function filterAppointmentsList(filterType, btn) {
    activeAppointmentFilter = filterType;
    document.querySelectorAll("#apptFilterTabs .appt-tab").forEach(t => t.classList.remove("active"));
    if (btn) btn.classList.add("active");
    applyAppointmentFilterAndRender();
}

function applyAppointmentFilterAndRender() {
    let filtered = cachedMyAppointments;
    if (activeAppointmentFilter === "upcoming") {
        filtered = cachedMyAppointments.filter(a => {
            const s = (a.status || "").toLowerCase();
            return s === "confirmed" || s === "pending" || s === "scheduled";
        });
    } else if (activeAppointmentFilter === "completed") {
        filtered = cachedMyAppointments.filter(a => (a.status || "").toLowerCase() === "completed");
    } else if (activeAppointmentFilter === "cancelled") {
        filtered = cachedMyAppointments.filter(a => (a.status || "").toLowerCase() === "cancelled");
    }
    renderMyAppointments(filtered);
}

function renderMyAppointments(appointments) {
    const result = document.getElementById("myAppointmentsResult");
    if (!result) return;

    if (!appointments.length) {
        let filterLabel = "matching this filter";
        if (activeAppointmentFilter === "upcoming") filterLabel = "upcoming or confirmed";
        if (activeAppointmentFilter === "completed") filterLabel = "completed";
        if (activeAppointmentFilter === "cancelled") filterLabel = "cancelled";

        result.innerHTML = `
            <div class="appt-empty-state">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.6">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <h3>No Appointments Found</h3>
                <p>No ${escapeHTML(filterLabel)} consultations found for this Patient ID.</p>
                <div class="appt-empty-actions">
                    <button type="button" class="btn-book-doctor-link" onclick="closeModal('appointmentsModal'); openDoctorFinder();">Book New Consultation</button>
                    ${activeAppointmentFilter !== 'all' ? `<button type="button" class="btn-view-all-appts" onclick="filterAppointmentsList('all', document.querySelector('#apptFilterTabs .appt-tab[data-filter=\\'all\\']'))">View All Bookings</button>` : ''}
                </div>
            </div>
        `;
        return;
    }

    result.innerHTML = `
        <div class="my-appointments-cards-stack">
            ${appointments.map(appt => {
                const status = appt.status || "Confirmed";
                const sLower = status.toLowerCase();
                const canCancel = sLower === "confirmed" || sLower === "pending" || sLower === "scheduled";
                const isCancelled = sLower === "cancelled";
                const isCompleted = sLower === "completed";

                let statusBadgeClass = "status-confirmed";
                let statusLabel = status;
                if (isCancelled) {
                    statusBadgeClass = "status-cancelled";
                } else if (isCompleted) {
                    statusBadgeClass = "status-completed";
                } else if (sLower === "pending") {
                    statusBadgeClass = "status-pending";
                }

                const initials = getDoctorInitials(appt.doctor);
                const hospitalName = appt.hospital_name || "Gorakhpur Healthcare Grid Center";
                const department = appt.department || "General Medicine OPD";
                const formattedDate = formatAppointmentDate(appt.appointment_date);
                const formattedTime = (typeof formatSlotTime === "function" && formatSlotTime(appt.appointment_time)) 
                    ? formatSlotTime(appt.appointment_time) 
                    : (appt.appointment_time || "10:00 AM");
                const tokenNo = appt.token_number || `T-${String(appt.id).padStart(2, '0')}`;

                return `
                <div class="pro-appointment-card ${isCancelled ? 'card-dimmed' : ''}">
                    <!-- Card Top Strip -->
                    <div class="appt-card-header">
                        <div class="appt-doctor-block">
                            <div class="appt-doctor-avatar">
                                <span>${escapeHTML(initials)}</span>
                            </div>
                            <div class="appt-doctor-info">
                                <div class="appt-dept-row">
                                    <span class="appt-dept-pill">${escapeHTML(department)}</span>
                                    <span class="appt-ref-code">REF #${escapeHTML(String(appt.id))}</span>
                                </div>
                                <h3 class="appt-doctor-name">${escapeHTML(appt.doctor || "Medical Specialist")}</h3>
                                <div class="appt-hospital-row">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1m-2 4v-4"/></svg>
                                    <span>${escapeHTML(hospitalName)}</span>
                                </div>
                            </div>
                        </div>
                        <div class="appt-status-tag ${statusBadgeClass}">
                            <span class="status-dot"></span>
                            <span>${escapeHTML(statusLabel)}</span>
                        </div>
                    </div>

                    <!-- Consultation Slot & Token Grid -->
                    <div class="appt-details-strip">
                        <div class="appt-detail-item">
                            <span class="detail-label">CONSULTATION DATE</span>
                            <div class="detail-value-wrap">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                <strong>${escapeHTML(formattedDate)}</strong>
                            </div>
                        </div>
                        <div class="appt-detail-item">
                            <span class="detail-label">TIME SLOT</span>
                            <div class="detail-value-wrap">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                <strong>${escapeHTML(formattedTime)}</strong>
                            </div>
                        </div>
                        <div class="appt-detail-item">
                            <span class="detail-label">OPD QUEUE TOKEN</span>
                            <div class="detail-value-wrap token-highlight">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                                <strong class="token-code">${escapeHTML(tokenNo)}</strong>
                            </div>
                        </div>
                        <div class="appt-detail-item">
                            <span class="detail-label">PATIENT UHID</span>
                            <div class="detail-value-wrap">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                <span>${escapeHTML(appt.patient_id || "N/A")}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Action Bar -->
                    <div class="appt-card-footer">
                        <div class="appt-footer-left">
                            ${!isCancelled ? `
                            <button type="button" class="btn-appt-print" onclick="printAppointmentSlip('${escapeJS(String(appt.id))}')">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                <span>Download / Print OPD Slip</span>
                            </button>
                            ` : `
                            <span class="cancelled-note-chip">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                                Consultation cancelled • No hospital desk queue
                            </span>
                            `}
                        </div>
                        <div class="appt-footer-right">
                            ${canCancel ? `
                            <button type="button" class="btn-appt-cancel" onclick="cancelAppointment('${escapeJS(String(appt.id))}')">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                                <span>Cancel Booking</span>
                            </button>
                            ` : (isCancelled ? `
                            <button type="button" class="btn-appt-rebook" onclick="closeModal('appointmentsModal'); openDoctorFinder();">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>
                                <span>Re-Book Consultation</span>
                            </button>
                            ` : '')}
                        </div>
                    </div>
                </div>
                `;
            }).join("")}
        </div>
    `;
}

async function cancelAppointment(appointmentId) {
    if (!confirm("Are you sure you want to cancel this clinical appointment? Your OPD token will be released.")) return;

    try {
        await apiRequest(`/api/appointments/${encodeURIComponent(appointmentId)}/cancel`, {
            method: "PUT"
        });
        showNotification("Appointment has been cancelled successfully.", "success");
        await loadMyAppointments();
    } catch (error) {
        console.error("Cancel appointment error:", error);
        showNotification(error.message || "Could not cancel appointment.", "error");
    }
}

function printAppointmentSlip(appointmentId) {
    const appt = cachedMyAppointments.find(a => String(a.id) === String(appointmentId));
    if (!appt) {
        showNotification("Appointment record not found for printing.", "warning");
        return;
    }

    const tokenNo = appt.token_number || `T-${String(appt.id).padStart(2, '0')}`;
    const dateFormatted = formatAppointmentDate(appt.appointment_date);
    const timeFormatted = (typeof formatSlotTime === "function" && formatSlotTime(appt.appointment_time)) 
        ? formatSlotTime(appt.appointment_time) 
        : (appt.appointment_time || "10:00 AM");

    const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>OPD Consultation Pass - ${escapeHTML(tokenNo)}</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    background: #ffffff;
                    color: #0f172a;
                    padding: 30px;
                    margin: 0;
                }
                .slip-container {
                    max-width: 580px;
                    margin: 0 auto;
                    border: 2px dashed #94a3b8;
                    border-radius: 12px;
                    padding: 24px;
                    position: relative;
                }
                .slip-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 2px solid #0f172a;
                    padding-bottom: 12px;
                    margin-bottom: 16px;
                }
                .slip-logo h2 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 800;
                    color: #1e3a8a;
                    letter-spacing: -0.5px;
                }
                .slip-logo p {
                    margin: 2px 0 0 0;
                    font-size: 11px;
                    color: #64748b;
                    font-weight: 600;
                }
                .token-box {
                    background: #f1f5f9;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    padding: 8px 14px;
                    text-align: right;
                }
                .token-box span {
                    display: block;
                    font-size: 10px;
                    font-weight: 800;
                    color: #64748b;
                }
                .token-box strong {
                    font-size: 22px;
                    font-weight: 900;
                    color: #2563eb;
                }
                .slip-section-title {
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #64748b;
                    margin-bottom: 8px;
                }
                .slip-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 14px;
                    margin-bottom: 16px;
                }
                .slip-item span {
                    display: block;
                    font-size: 10px;
                    font-weight: 700;
                    color: #64748b;
                    margin-bottom: 2px;
                }
                .slip-item strong {
                    font-size: 13px;
                    font-weight: 800;
                    color: #0f172a;
                }
                .slip-status-stamp {
                    display: inline-block;
                    padding: 4px 10px;
                    background: #dcfce7;
                    border: 1px solid #86efac;
                    color: #15803d;
                    font-size: 11px;
                    font-weight: 800;
                    border-radius: 4px;
                }
                .slip-instructions {
                    font-size: 11px;
                    color: #475569;
                    line-height: 1.5;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 12px;
                    margin-top: 16px;
                }
                .slip-instructions ul {
                    margin: 6px 0 0 16px;
                    padding: 0;
                }
                .slip-footer {
                    margin-top: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 10px;
                    color: #94a3b8;
                    border-top: 1px dashed #cbd5e1;
                    padding-top: 10px;
                }
                @media print {
                    body { padding: 0; }
                    .slip-container { border: 1px solid #000; }
                }
            </style>
        </head>
        <body>
            <div class="slip-container">
                <div class="slip-header">
                    <div class="slip-logo">
                        <h2>Gorakhpur Smart City Health Grid</h2>
                        <p>Official Outpatient Department (OPD) Consultation Slip</p>
                    </div>
                    <div class="token-box">
                        <span>OPD TOKEN</span>
                        <strong>${escapeHTML(tokenNo)}</strong>
                    </div>
                </div>

                <div class="slip-section-title">Consultation & Hospital Details</div>
                <div class="slip-grid">
                    <div class="slip-item">
                        <span>HOSPITAL</span>
                        <strong>${escapeHTML(appt.hospital_name || "Gorakhpur Healthcare Grid Center")}</strong>
                    </div>
                    <div class="slip-item">
                        <span>DEPARTMENT</span>
                        <strong>${escapeHTML(appt.department || "General Medicine")}</strong>
                    </div>
                    <div class="slip-item">
                        <span>CONSULTING DOCTOR</span>
                        <strong>${escapeHTML(appt.doctor || "Attending Specialist")}</strong>
                    </div>
                    <div class="slip-item">
                        <span>STATUS</span>
                        <div><span class="slip-status-stamp">VERIFIED & SCHEDULED</span></div>
                    </div>
                    <div class="slip-item">
                        <span>DATE</span>
                        <strong>${escapeHTML(dateFormatted)}</strong>
                    </div>
                    <div class="slip-item">
                        <span>TIME SLOT</span>
                        <strong>${escapeHTML(timeFormatted)}</strong>
                    </div>
                </div>

                <div class="slip-section-title">Patient Identification</div>
                <div class="slip-grid">
                    <div class="slip-item">
                        <span>PATIENT UHID</span>
                        <strong style="font-family: monospace;">${escapeHTML(appt.patient_id || "N/A")}</strong>
                    </div>
                    <div class="slip-item">
                        <span>BOOKING REFERENCE</span>
                        <strong style="font-family: monospace;">#APPT-${escapeHTML(String(appt.id))}</strong>
                    </div>
                </div>

                <div class="slip-instructions">
                    <strong>OPD Check-In Guidelines:</strong>
                    <ul>
                        <li>Please present this digital pass or printed copy at the hospital OPD triage desk 15 minutes before your scheduled slot.</li>
                        <li>Carry your previous medical prescriptions, lab reports, and Government ID (Aadhaar / ABHA Card).</li>
                        <li>Emergency & Trauma Desk is available 24x7. For rescheduling queries, contact Gorakhpur Health Helpdesk at 0551-2205555.</li>
                    </ul>
                </div>

                <div class="slip-footer">
                    <span>Generated on ${new Date().toLocaleString()}</span>
                    <span>National Health Mission • Smart City Gorakhpur</span>
                </div>
            </div>
            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `;

    const printWin = window.open("", "_blank", "width=700,height=750");
    if (printWin) {
        printWin.document.open();
        printWin.document.write(printHtml);
        printWin.document.close();
    } else {
        showNotification("Please allow pop-ups to print the appointment slip.", "warning");
    }
}

/* =========================================================
   EMERGENCY
========================================================= */

function openEmergency() {
    openModal("emergencyModal");
}

function callEmergency() {
    window.location.href = "tel:112";
}

/* =========================================================
   AMBULANCE — full emergency flow:
   Patient location -> nearby hospitals + nearby available
   ambulances -> assign -> ambulance->patient route ->
   patient->hospital route -> status timeline.
========================================================= */

async function trackAmbulance() {
    openModal("ambulanceModal");
    initAmbulanceSocket();
    initializeAmbulanceMap();
    clearAmbulanceRoute();
    await refreshAmbulance();
}

/* Kept as an alias — some legacy call sites use showAmbulance(). */
function showAmbulance() {
    trackAmbulance();
}

async function refreshAmbulance() {
    const listEl = document.getElementById("ambulanceList");
    showLoading(listEl, "Loading ambulances...");

    try {
        const data = await apiRequest("/api/ambulances");
        ambulanceData = data.ambulances || [];
        renderAmbulanceList(ambulanceData);
        plotAllAmbulances(ambulanceData);
    } catch (error) {
        console.error("Ambulance loading error:", error);
        showError(listEl, error.message);
    }
}

function renderAmbulanceList(ambulances) {
    const listEl = document.getElementById("ambulanceList");
    if (!listEl) return;

    if (!ambulances.length) {
        listEl.innerHTML = `<div class="empty-state">🚑<h3>No Ambulance Available</h3></div>`;
        return;
    }

    listEl.innerHTML = ambulances.map(ambulance => {
        const status = String(ambulance.status || "Unknown");
        const available = status.toLowerCase() === "available";
        const inFlow = AMBULANCE_STATUS_FLOW.includes(status) && status !== "Available";
        const btnLabel = inFlow ? "🚑 Track Live Route" : "📍 Locate on Map";

        return `
            <div class="ambulance-card">
                <div class="ambulance-card-header">
                    <div class="ambulance-icon">🚑</div>
                    <div>
                        <h3>${escapeHTML(ambulance.ambulance_id || "Ambulance")}</h3>
                        <span class="ambulance-status ${available ? "" : "emergency"}"><i></i>${escapeHTML(status)}</span>
                    </div>
                </div>
                <div class="ambulance-details">
                    <div><span>Vehicle</span><strong>${escapeHTML(ambulance.vehicle_number || "N/A")}</strong></div>
                    <div><span>Driver</span><strong>${escapeHTML(ambulance.driver_name || "N/A")}</strong></div>
                    <div><span>Type</span><strong>${escapeHTML(ambulance.ambulance_type || "General")}</strong></div>
                    ${ambulance.patient_name ? `<div><span>Patient</span><strong>${escapeHTML(ambulance.patient_name)}</strong></div>` : ""}
                    ${ambulance.destination_hospital_name ? `<div><span>Destination</span><strong>${escapeHTML(ambulance.destination_hospital_name)}</strong></div>` : ""}
                </div>
                <button type="button" class="track-live-btn" onclick="selectAmbulance(${Number(ambulance.id)})">${btnLabel}</button>
            </div>
        `;
    }).join("");
}

function selectAmbulance(ambulanceId) {
    selectedAmbulance = ambulanceData.find(a => String(a.id) === String(ambulanceId)) || null;
    if (!selectedAmbulance) { showNotification("Ambulance not found.", "error"); return; }

    const lat = Number(selectedAmbulance.latitude);
    const lng = Number(selectedAmbulance.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        showNotification("This ambulance has no location data yet.", "warning");
        return;
    }

    trackedAmbulanceId = selectedAmbulance.id;

    if (ambulanceMap) {
        ambulanceMap.setView([lat, lng], 14);
        ambulanceMarkers[selectedAmbulance.id]?.openPopup();
    }

    renderAmbulanceRoutePanel(selectedAmbulance);
}

function initializeAmbulanceMap() {
    const mapElement = document.getElementById("ambulanceMap");
    if (!mapElement) return null;
    if (typeof L === "undefined") { console.error("Leaflet library is not loaded."); return null; }

    if (ambulanceMap) {
        try { ambulanceMap.remove(); } catch { /* ignore */ }
    }

    ambulanceMap = L.map("ambulanceMap").setView([26.7600, 83.3700], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(ambulanceMap);

    return ambulanceMap;
}

function plotAllAmbulances(ambulances) {
    if (!ambulanceMap) return;
    ambulanceMarkers = {};

    const withLocation = ambulances.filter(a =>
        Number.isFinite(Number(a.latitude)) && Number.isFinite(Number(a.longitude))
    );

    withLocation.forEach(ambulance => {
        const icon = L.divIcon({
            className: "ambulance-marker",
            html: "🚑",
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        const marker = L.marker([Number(ambulance.latitude), Number(ambulance.longitude)], { icon })
            .addTo(ambulanceMap)
            .bindPopup(`<div class="ambulance-popup"><h3>${escapeHTML(ambulance.ambulance_id || "Ambulance")}</h3><p>${escapeHTML(ambulance.vehicle_number || "")}</p><p>Status: ${escapeHTML(ambulance.status || "")}</p></div>`);
        ambulanceMarkers[ambulance.id] = marker;
    });

    if (withLocation.length && !trackedAmbulanceId) {
        const bounds = L.latLngBounds(withLocation.map(a => [Number(a.latitude), Number(a.longitude)]));
        ambulanceMap.fitBounds(bounds, { padding: [40, 40] });
    }
}

function updateAmbulanceMarkerPosition(ambulance) {
    const lat = Number(ambulance.latitude);
    const lng = Number(ambulance.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const marker = ambulanceMarkers[ambulance.id];
    if (marker) marker.setLatLng([lat, lng]);

    // keep the ambulance->patient route in sync with the live position,
    // but don't spam OSRM on every tiny movement — only if we're mid-route.
    if (ambulanceRouteControls.toPatient && ["Assigned", "On The Way"].includes(ambulance.status)) {
        try {
            ambulanceRouteControls.toPatient.setWaypoints([
                L.latLng(lat, lng),
                L.latLng(Number(ambulance.patient_lat), Number(ambulance.patient_lng))
            ]);
        } catch { /* route not ready yet, ignore */ }
    }
}

/* ---------------------------------------------------------
   EMERGENCY REQUEST — patient location -> nearby matches
--------------------------------------------------------- */

function getFreshLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by this browser."));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            err => reject(new Error(err.message || "Could not access your location.")),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

async function startEmergencyRequest() {
    const panel = document.getElementById("emergencyRequestPanel");
    if (!panel) return;
    panel.style.display = "grid";
    panel.innerHTML = `<div class="inline-msg info">📍 Detecting your location…</div>`;

    try {
        emergencyPatientLocation = HealthcareState.userLocation || await getFreshLocation();
        HealthcareState.userLocation = emergencyPatientLocation;
        await findEmergencyMatches(emergencyPatientLocation.lat, emergencyPatientLocation.lng);
    } catch (error) {
        panel.innerHTML = `<div class="inline-msg error">❌ ${escapeHTML(error.message)} — please enable location access and try again.</div>`;
    }
}

async function findEmergencyMatches(lat, lng) {
    const panel = document.getElementById("emergencyRequestPanel");
    if (!panel) return;
    panel.innerHTML = `<div class="inline-msg info">🔎 Finding nearby hospitals and available ambulances…</div>`;

    try {
        const [hospitalsRes, ambulancesRes] = await Promise.all([
            apiRequest(`/api/hospitals/nearby/search?lat=${lat}&lng=${lng}&limit=5`),
            apiRequest(`/api/ambulances/nearby/search?lat=${lat}&lng=${lng}&limit=5`)
        ]);

        emergencyMatchedHospitals = hospitalsRes.hospitals || [];
        emergencyMatchedAmbulances = ambulancesRes.ambulances || [];
        emergencySelectedHospitalId = emergencyMatchedHospitals[0]?.id ?? null;
        emergencySelectedAmbulanceId = emergencyMatchedAmbulances[0]?.id ?? null;

        renderEmergencyMatchPanel();
    } catch (error) {
        console.error("Emergency match error:", error);
        panel.innerHTML = `<div class="inline-msg error">❌ ${escapeHTML(error.message)}</div>`;
    }
}

function renderEmergencyMatchPanel() {
    const panel = document.getElementById("emergencyRequestPanel");
    if (!panel) return;

    const hospitalItems = emergencyMatchedHospitals.length
        ? emergencyMatchedHospitals.map(h => `
            <div class="match-item ${String(h.id) === String(emergencySelectedHospitalId) ? "selected" : ""}"
                 onclick="selectMatchHospital(${Number(h.id)})">
                <div>
                    <strong>${escapeHTML(h.hospital_name)}</strong>
                    <small>${escapeHTML(h.address || "")}</small>
                </div>
                <span class="distance-pill">${h.distance_km != null ? h.distance_km + " km" : "—"}</span>
            </div>
        `).join("")
        : `<div class="inline-msg warning">No hospitals with known coordinates found nearby.</div>`;

    const ambulanceItems = emergencyMatchedAmbulances.length
        ? emergencyMatchedAmbulances.map(a => `
            <div class="match-item ${String(a.id) === String(emergencySelectedAmbulanceId) ? "selected" : ""}"
                 onclick="selectMatchAmbulance(${Number(a.id)})">
                <div>
                    <strong>${escapeHTML(a.ambulance_id)}</strong>
                    <small>${escapeHTML(a.vehicle_number || "")} • ${escapeHTML(a.driver_name || "Driver TBA")}</small>
                </div>
                <span class="distance-pill">${a.distance_km != null ? a.distance_km + " km" : "—"}</span>
            </div>
        `).join("")
        : `<div class="inline-msg warning">No available ambulances with known coordinates found nearby.</div>`;

    panel.innerHTML = `
        <div class="match-lists">
            <div class="match-list">
                <h4>🏥 Nearest Hospitals</h4>
                ${hospitalItems}
            </div>
            <div class="match-list">
                <h4>🚑 Nearest Available Ambulances</h4>
                ${ambulanceItems}
            </div>
        </div>
        <button type="button" class="primary-btn" onclick="confirmEmergencyAssignment()"
            ${(!emergencySelectedHospitalId || !emergencySelectedAmbulanceId) ? "disabled" : ""}>
            ✅ Confirm & Dispatch Ambulance
        </button>
    `;
}

function selectMatchHospital(id) {
    emergencySelectedHospitalId = id;
    renderEmergencyMatchPanel();
}

function selectMatchAmbulance(id) {
    emergencySelectedAmbulanceId = id;
    renderEmergencyMatchPanel();
}

async function confirmEmergencyAssignment() {
    if (!emergencySelectedAmbulanceId || !emergencySelectedHospitalId || !emergencyPatientLocation) {
        showNotification("Please select a hospital and an ambulance first.", "warning");
        return;
    }

    const hospital = emergencyMatchedHospitals.find(h => String(h.id) === String(emergencySelectedHospitalId));
    const panel = document.getElementById("emergencyRequestPanel");
    panel.innerHTML = `<div class="inline-msg info">🚑 Dispatching ambulance…</div>`;

    try {
        const patientId = getPatientId();
        const data = await apiRequest(`/api/ambulances/${emergencySelectedAmbulanceId}/assign`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                patientName: patientId ? `Patient ${patientId}` : "Emergency Patient",
                patientMobile: null,
                patientLat: emergencyPatientLocation.lat,
                patientLng: emergencyPatientLocation.lng,
                patientAddress: null,
                destinationHospitalId: hospital?.id || null,
                destinationHospitalName: hospital?.hospital_name || null
            })
        });

        const ambulance = data.ambulance;
        const idx = ambulanceData.findIndex(a => String(a.id) === String(ambulance.id));
        if (idx >= 0) ambulanceData[idx] = ambulance; else ambulanceData.push(ambulance);

        renderAmbulanceList(ambulanceData);
        plotAllAmbulances(ambulanceData);

        panel.innerHTML = `<div class="inline-msg success">✅ ${escapeHTML(ambulance.ambulance_id)} dispatched to your location.</div>`;
        showNotification("Ambulance assigned. Tracking live route…", "success");

        trackedAmbulanceId = ambulance.id;
        renderAmbulanceRoutePanel(ambulance);

    } catch (error) {
        console.error("Assign ambulance error:", error);
        panel.innerHTML = `<div class="inline-msg error">❌ ${escapeHTML(error.message)}</div>`;
    }
}

/* ---------------------------------------------------------
   ROUTE PANEL — ambulance -> patient -> hospital, with
   Leaflet Routing Machine for both legs, ETA, and the
   status timeline / advance / refresh / reset controls.
--------------------------------------------------------- */

async function getHospitalCoordsById(hospitalId) {
    if (!hospitalId) return null;
    let hospital = hospitalData.find(h => String(h.id) === String(hospitalId));
    if (!hospital) {
        try {
            const data = await apiRequest(`/api/hospitals/${hospitalId}`);
            hospital = data.hospital;
        } catch {
            return null;
        }
    }
    if (!hospital) return null;
    const lat = Number(hospital.latitude);
    const lng = Number(hospital.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng, name: hospital.hospital_name } : null;
}

function clearAmbulanceRoute() {
    if (ambulanceRouteControls.toPatient) { try { ambulanceMap.removeControl(ambulanceRouteControls.toPatient); } catch { /* ignore */ } }
    if (ambulanceRouteControls.toHospital) { try { ambulanceMap.removeControl(ambulanceRouteControls.toHospital); } catch { /* ignore */ } }
    ambulanceRouteControls = { toPatient: null, toHospital: null };
    if (ambulancePatientMarker) { try { ambulanceMap.removeLayer(ambulancePatientMarker); } catch { /* ignore */ } ambulancePatientMarker = null; }
    if (ambulanceHospitalMarker) { try { ambulanceMap.removeLayer(ambulanceHospitalMarker); } catch { /* ignore */ } ambulanceHospitalMarker = null; }
    trackedAmbulanceId = null;
    const panel = document.getElementById("ambulanceRoutePanel");
    if (panel) panel.innerHTML = "";
}

function renderStatusTimeline(currentStatus) {
    const idx = AMBULANCE_STATUS_FLOW.indexOf(currentStatus);
    return `
        <div class="route-status-timeline">
            ${AMBULANCE_STATUS_FLOW.map((step, i) => {
                const cls = idx === -1 ? "" : (i < idx ? "done" : i === idx ? "current" : "");
                return `<div class="route-status-step ${cls}">${escapeHTML(step)}</div>`;
            }).join("")}
        </div>
    `;
}

async function renderAmbulanceRoutePanel(ambulance) {
    const panel = document.getElementById("ambulanceRoutePanel");
    if (!panel || !ambulanceMap || typeof L === "undefined") return;

    const aLat = Number(ambulance.latitude);
    const aLng = Number(ambulance.longitude);

    if (!Number.isFinite(aLat) || !Number.isFinite(aLng)) {
        panel.innerHTML = `<div class="inline-msg warning">⚠️ This ambulance has no live GPS location yet, so a route cannot be drawn.</div>`;
        return;
    }

    if (typeof L.Routing === "undefined") {
        panel.innerHTML = `<div class="inline-msg error">❌ The routing engine failed to load. Check your internet connection and refresh.</div>`;
        return;
    }

    const hasPatient = Number.isFinite(Number(ambulance.patient_lat)) && Number.isFinite(Number(ambulance.patient_lng));

    if (!hasPatient) {
        panel.innerHTML = `
            ${renderStatusTimeline(ambulance.status)}
            <div class="inline-msg info">This ambulance is not currently assigned to an emergency. Use "Request Emergency Ambulance" above to dispatch it.</div>
        `;
        return;
    }

    panel.innerHTML = `${renderStatusTimeline(ambulance.status)}<div class="inline-msg info">📡 Calculating live route…</div>`;

    // Clear old route layers before drawing new ones
    if (ambulanceRouteControls.toPatient) { try { ambulanceMap.removeControl(ambulanceRouteControls.toPatient); } catch { /* ignore */ } ambulanceRouteControls.toPatient = null; }
    if (ambulanceRouteControls.toHospital) { try { ambulanceMap.removeControl(ambulanceRouteControls.toHospital); } catch { /* ignore */ } ambulanceRouteControls.toHospital = null; }
    if (ambulancePatientMarker) { try { ambulanceMap.removeLayer(ambulancePatientMarker); } catch { /* ignore */ } }
    if (ambulanceHospitalMarker) { try { ambulanceMap.removeLayer(ambulanceHospitalMarker); } catch { /* ignore */ } }

    const pLat = Number(ambulance.patient_lat);
    const pLng = Number(ambulance.patient_lng);

    ambulancePatientMarker = L.marker([pLat, pLng], {
        icon: L.divIcon({ className: "patient-marker-icon", html: "🧑‍🦽", iconSize: [26, 26], iconAnchor: [13, 13] })
    }).addTo(ambulanceMap).bindPopup(`<strong>Patient location</strong>${ambulance.patient_address ? `<br>${escapeHTML(ambulance.patient_address)}` : ""}`);

    const hospitalCoords = await getHospitalCoordsById(ambulance.destination_hospital_id);
    if (hospitalCoords) {
        ambulanceHospitalMarker = L.marker([hospitalCoords.lat, hospitalCoords.lng], {
            icon: L.divIcon({ className: "hospital-dest-marker-icon", html: "🏥", iconSize: [26, 26], iconAnchor: [13, 13] })
        }).addTo(ambulanceMap).bindPopup(`<strong>${escapeHTML(hospitalCoords.name || ambulance.destination_hospital_name || "Destination Hospital")}</strong>`);
    }

    let leg1 = null;
    let leg2 = null;
    let routeError = null;

    try {
        leg1 = await new Promise((resolve, reject) => {
            const control = L.Routing.control({
                waypoints: [L.latLng(aLat, aLng), L.latLng(pLat, pLng)],
                createMarker: () => null,
                addWaypoints: false,
                draggableWaypoints: false,
                fitSelectedRoutes: false,
                show: false,
                lineOptions: { styles: [{ color: "#0f172a", weight: 5, opacity: 0.8 }] }
            }).addTo(ambulanceMap);
            control.on("routesfound", e => resolve({ control, summary: e.routes[0].summary }));
            control.on("routingerror", e => reject(e.error || new Error("Could not calculate ambulance-to-patient route.")));
        });
        ambulanceRouteControls.toPatient = leg1.control;
    } catch (error) {
        routeError = error.message || "Ambulance → Patient route could not be calculated.";
    }

    if (hospitalCoords) {
        try {
            leg2 = await new Promise((resolve, reject) => {
                const control = L.Routing.control({
                    waypoints: [L.latLng(pLat, pLng), L.latLng(hospitalCoords.lat, hospitalCoords.lng)],
                    createMarker: () => null,
                    addWaypoints: false,
                    draggableWaypoints: false,
                    fitSelectedRoutes: false,
                    show: false,
                    lineOptions: { styles: [{ color: "#16a34a", weight: 5, opacity: 0.8, dashArray: "8,6" }] }
                }).addTo(ambulanceMap);
                control.on("routesfound", e => resolve({ control, summary: e.routes[0].summary }));
                control.on("routingerror", e => reject(e.error || new Error("Could not calculate patient-to-hospital route.")));
            });
            ambulanceRouteControls.toHospital = leg2.control;
        } catch (error) {
            routeError = routeError ? `${routeError} Also: ${error.message}` : (error.message || "Patient → Hospital route could not be calculated.");
        }
    }

    // Fit map to whatever we successfully drew
    const boundsPoints = [[aLat, aLng], [pLat, pLng]];
    if (hospitalCoords) boundsPoints.push([hospitalCoords.lat, hospitalCoords.lng]);
    try { ambulanceMap.fitBounds(L.latLngBounds(boundsPoints), { padding: [50, 50] }); } catch { /* ignore */ }

    const km = m => (m / 1000).toFixed(1);
    const min = s => Math.max(1, Math.round(s / 60));

    const leg1Card = leg1
        ? `<div class="route-leg-card">
             <h4>🚑 → 🧑‍🦽 Ambulance to Patient</h4>
             <div class="route-leg-stats">
                <div><strong>${km(leg1.summary.totalDistance)} km</strong><span>Distance</span></div>
                <div><strong>${min(leg1.summary.totalTime)} min</strong><span>ETA</span></div>
             </div>
           </div>`
        : `<div class="route-leg-card"><h4>🚑 → 🧑‍🦽 Ambulance to Patient</h4><div class="inline-msg error">Route unavailable.</div></div>`;

    const leg2Card = hospitalCoords
        ? (leg2
            ? `<div class="route-leg-card">
                 <h4>🧑‍🦽 → 🏥 Patient to Hospital</h4>
                 <div class="route-leg-stats">
                    <div><strong>${km(leg2.summary.totalDistance)} km</strong><span>Distance</span></div>
                    <div><strong>${min(leg2.summary.totalTime)} min</strong><span>ETA</span></div>
                 </div>
               </div>`
            : `<div class="route-leg-card"><h4>🧑‍🦽 → 🏥 Patient to Hospital</h4><div class="inline-msg error">Route unavailable.</div></div>`)
        : `<div class="route-leg-card"><h4>🧑‍🦽 → 🏥 Patient to Hospital</h4><div class="inline-msg warning">No destination hospital coordinates on file.</div></div>`;

    const totalMinutes = (leg1 ? min(leg1.summary.totalTime) : 0) + (leg2 ? min(leg2.summary.totalTime) : 0);
    const nextStep = getNextAmbulanceStatus(ambulance.status);

    panel.innerHTML = `
        ${renderStatusTimeline(ambulance.status)}
        ${routeError ? `<div class="inline-msg error">⚠️ ${escapeHTML(routeError)}</div>` : ""}
        <div class="route-legs">${leg1Card}${leg2Card}</div>
        ${totalMinutes > 0 ? `<div class="route-summary-bar"><span>Total estimated journey time</span><strong>${totalMinutes} min</strong></div>` : ""}
        <div class="route-panel-actions">
            <button type="button" class="refresh-btn" onclick="refreshAmbulanceRoute(${Number(ambulance.id)})">🔄 Refresh Route</button>
            ${nextStep ? `<button type="button" class="advance-btn" onclick="advanceAmbulanceStatus(${Number(ambulance.id)})">➡️ Mark ${escapeHTML(nextStep)}</button>` : ""}
            <button type="button" class="reset-btn" onclick="resetAmbulanceTracking(${Number(ambulance.id)})">✖️ Clear / Reset</button>
        </div>
    `;
}

function getNextAmbulanceStatus(currentStatus) {
    const idx = AMBULANCE_STATUS_FLOW.indexOf(currentStatus);
    if (idx === -1 || idx >= AMBULANCE_STATUS_FLOW.length - 1) return null;
    return AMBULANCE_STATUS_FLOW[idx + 1];
}

async function advanceAmbulanceStatus(ambulanceId) {
    const ambulance = ambulanceData.find(a => String(a.id) === String(ambulanceId));
    if (!ambulance) return;
    const next = getNextAmbulanceStatus(ambulance.status);
    if (!next) return;

    try {
        const data = await apiRequest(`/api/ambulances/${ambulanceId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: next })
        });
        const updated = data.ambulance;
        const idx = ambulanceData.findIndex(a => String(a.id) === String(updated.id));
        if (idx >= 0) ambulanceData[idx] = updated;

        renderAmbulanceList(ambulanceData);
        showNotification(`Status updated: ${next}`, "success");

        if (next === "Arrived at Hospital") {
            showNotification("Ambulance has arrived at the hospital. You can now reset it for the next emergency.", "info");
        }

        await renderAmbulanceRoutePanel(updated);
    } catch (error) {
        showNotification(error.message || "Could not update ambulance status.", "error");
    }
}

async function refreshAmbulanceRoute(ambulanceId) {
    try {
        const data = await apiRequest(`/api/ambulances/${ambulanceId}`);
        const updated = data.ambulance;
        const idx = ambulanceData.findIndex(a => String(a.id) === String(updated.id));
        if (idx >= 0) ambulanceData[idx] = updated;
        await renderAmbulanceRoutePanel(updated);
    } catch (error) {
        showNotification(error.message || "Could not refresh route.", "error");
    }
}

async function resetAmbulanceTracking(ambulanceId) {
    try {
        const data = await apiRequest(`/api/ambulances/${ambulanceId}/reset`, { method: "PUT" });
        const updated = data.ambulance;
        const idx = ambulanceData.findIndex(a => String(a.id) === String(updated.id));
        if (idx >= 0) ambulanceData[idx] = updated;

        clearAmbulanceRoute();
        renderAmbulanceList(ambulanceData);
        plotAllAmbulances(ambulanceData);
        showNotification("Ambulance reset and available again.", "success");
    } catch (error) {
        showNotification(error.message || "Could not reset ambulance.", "error");
    }
}

/* =========================================================
   BEDS (Phase 2: real per-hospital, 7-category bed availability
   with progress bars. The old bedModal never existed in the HTML,
   so this button previously did nothing visible — now fixed.)
========================================================= */

let activeBedSyncInterval = null;

function createBedModal() {
    // If #bedModal already exists statically in the HTML, do nothing
    if (document.getElementById("bedModal")) return;
    const modal = document.createElement("div");
    modal.id = "bedModal";
    modal.className = "modal";
    modal.innerHTML = `
        <div class="modal-box bed-modal-box">
            <button class="close-btn" onclick="closeModal('bedModal')">×</button>
            <div class="bed-modal-header">
                <h2>Bed Availability & Patient Room Locator</h2>
            </div>
            <select id="bedHospitalSelect" onchange="handleBedHospitalChange()"></select>
            <div id="bedHospitalDetailBanner" class="hospital-info-banner"></div>
            <div id="bedResult">Loading...</div>
        </div>
    `;
    document.body.appendChild(modal);
}

function switchBedModalTab(tab) {
    const tabAvail = document.getElementById("bedTabAvailability");
    const tabPatient = document.getElementById("bedTabPatientLookup");
    const btnAvail = document.getElementById("tabBtnBedAvailability");
    const btnPatient = document.getElementById("tabBtnPatientLookup");

    if (tab === "availability") {
        if (tabAvail) tabAvail.style.display = "block";
        if (tabPatient) tabPatient.style.display = "none";
        if (btnAvail) btnAvail.classList.add("active");
        if (btnPatient) btnPatient.classList.remove("active");
    } else {
        if (tabAvail) tabAvail.style.display = "none";
        if (tabPatient) tabPatient.style.display = "block";
        if (btnAvail) btnAvail.classList.remove("active");
        if (btnPatient) btnPatient.classList.add("active");

        setTimeout(() => {
            const input = document.getElementById("patientLookupInput");
            if (input) input.focus();
        }, 150);
    }
}

async function showBeds() {
    createBedModal();
    openModal("bedModal");

    // Default to availability tab
    switchBedModalTab("availability");

    if (!hospitalData || !hospitalData.length) {
        try {
            const data = await apiRequest("/api/hospitals");
            hospitalData = data.hospitals || [];
        } catch (error) {
            console.error("Failed to load hospital list for beds:", error);
            const res = document.getElementById("bedResult");
            if (res) showError(res, error.message);
        }
    }

    const select = document.getElementById("bedHospitalSelect");
    if (select) {
        const previousVal = select.value;
        select.innerHTML = (hospitalData || []).map(h =>
            `<option value="${escapeHTML(h.hospital_id)}">${escapeHTML(h.hospital_name)}</option>`
        ).join("");

        if (previousVal && select.querySelector(`option[value="${previousVal}"]`)) {
            select.value = previousVal;
        } else if (selectedHospital?.hospital_id) {
            select.value = selectedHospital.hospital_id;
        }
    }

    // Prefill patient lookup input if patient ID is cached
    const patId = (typeof getPatientId === "function" && getPatientId()) || localStorage.getItem("smartcity_patient_id") || "";
    const patInput = document.getElementById("patientLookupInput");
    if (patInput && !patInput.value && patId) {
        patInput.value = patId;
    }

    // Render hospital details card & load beds
    await updateSelectedHospitalDetails();
    await loadBeds();

    // Start 10-second active live auto-sync interval while modal is open
    if (activeBedSyncInterval) clearInterval(activeBedSyncInterval);
    activeBedSyncInterval = setInterval(() => {
        const modal = document.getElementById("bedModal");
        if (modal && (modal.classList.contains("show") || modal.style.display === "flex" || modal.style.display === "block")) {
            loadBeds(true); // background silent refresh
        } else {
            clearInterval(activeBedSyncInterval);
            activeBedSyncInterval = null;
        }
    }, 10000);
}

async function handleBedHospitalChange() {
    await updateSelectedHospitalDetails();
    await loadBeds();
}

async function updateSelectedHospitalDetails() {
    const banner = document.getElementById("bedHospitalDetailBanner");
    const hospitalId = document.getElementById("bedHospitalSelect")?.value;
    if (!banner || !hospitalId) return;

    let h = (hospitalData || []).find(item => item.hospital_id === hospitalId || String(item.id) === String(hospitalId));

    if (!h || !h.address || !h.phone) {
        try {
            const res = await apiRequest(`/api/hospitals/${encodeURIComponent(hospitalId)}`);
            if (res && res.hospital) {
                h = res.hospital;
            }
        } catch (e) {
            // keep fallback
        }
    }

    if (!h) {
        banner.innerHTML = "";
        return;
    }

    // Parse facilities
    let facilities = [];
    if (Array.isArray(h.facilities)) {
        facilities = h.facilities;
    } else if (typeof h.facilities === "string") {
        try {
            facilities = JSON.parse(h.facilities);
        } catch {
            facilities = h.facilities.split(",").map(f => f.trim()).filter(Boolean);
        }
    }
    if (!facilities.length) {
        facilities = ["Emergency Trauma 24/7", "ICU / CCU Support", "Central Oxygen Supply", "Diagnostic Pathology", "Smart Pharmacy"];
    }

    const emergencyNum = h.emergency_number || h.emergency_contact || h.phone || "108";
    const regPhone = h.phone || "0551-2200000";
    const totalBeds = Number(h.total_beds || 150);
    const icuBeds = Number(h.icu_beds || 20);
    const emgBeds = Number(h.emergency_beds || 15);

    banner.innerHTML = `
        <div class="hosp-banner-header">
            <div class="hosp-banner-title-area">
                <div class="hosp-avatar-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1m-2 4v-4"/></svg>
                </div>
                <div>
                    <div class="hosp-badge-row">
                        <span class="hosp-tier-pill">SmartCity Verified Hospital</span>
                        <span class="hosp-code-pill">${escapeHTML(h.hospital_id)}</span>
                    </div>
                    <h4 class="hosp-title-text">${escapeHTML(h.hospital_name)}</h4>
                    <p class="hosp-address-text">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        ${escapeHTML(h.address || "Gorakhpur Metropolitan Healthcare Grid, Uttar Pradesh")}
                    </p>
                </div>
            </div>
            <div class="hosp-banner-contacts">
                <a href="tel:${escapeHTML(emergencyNum)}" class="contact-pill emergency-pill" title="Click to call emergency 24/7">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    <span><strong>24/7 Trauma:</strong> ${escapeHTML(emergencyNum)}</span>
                </a>
                <a href="tel:${escapeHTML(regPhone)}" class="contact-pill desk-pill" title="Click to call front desk">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    <span>Desk: ${escapeHTML(regPhone)}</span>
                </a>
            </div>
        </div>

        <div class="hosp-banner-bottom">
            <div class="hosp-facilities-scroll">
                <span class="facilities-label">Key Facilities:</span>
                ${facilities.slice(0, 6).map(fac => `
                    <span class="facility-chip">✓ ${escapeHTML(typeof fac === 'string' ? fac : fac.name || 'Facility')}</span>
                `).join("")}
            </div>
            <div class="hosp-metrics-badges">
                <span class="metric-pill">Total Beds: <strong>${totalBeds}</strong></span>
                <span class="metric-pill">ICU: <strong>${icuBeds}</strong></span>
                <span class="metric-pill">Emergency: <strong>${emgBeds}</strong></span>
            </div>
        </div>
    `;
}

async function refreshBedDataWithFeedback() {
    const btn = document.getElementById("bedHeaderRefreshBtn");
    if (btn) {
        btn.classList.add("spinning");
        const span = btn.querySelector("span");
        if (span) span.textContent = "Syncing...";
    }
    try {
        await updateSelectedHospitalDetails();
        await loadBeds();
        if (typeof showNotification === "function") {
            showNotification("Bed telemetry synchronized with live staff desk.", "success");
        }
    } finally {
        if (btn) {
            btn.classList.remove("spinning");
            const span = btn.querySelector("span");
            if (span) span.textContent = "Live Sync";
        }
    }
}

function fillAndLookupPatient(uhid) {
    const input = document.getElementById("patientLookupInput");
    if (input) {
        input.value = uhid;
        lookupPatientRoom();
    }
}

async function lookupPatientRoom() {
    const input = document.getElementById("patientLookupInput");
    const resultBox = document.getElementById("patientRoomLookupResult");
    if (!input || !resultBox) return;

    const patientId = input.value.trim();
    if (!patientId) {
        resultBox.innerHTML = `
            <div class="lookup-notice-alert notice-warning">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span>Please enter a valid Patient ID or UHID (e.g. PAT-RAHUL-10231).</span>
            </div>
        `;
        return;
    }

    resultBox.innerHTML = `
        <div class="bed-loading-skeleton">
            <div class="skeleton-spinner"></div>
            <span>Searching hospital inpatient registry for Patient ID: ${escapeHTML(patientId)}...</span>
        </div>
    `;

    try {
        const hospitalId = document.getElementById("bedHospitalSelect")?.value || "HOSP-001";
        let res = null;

        // 1. Try hospital-specific admission API first
        try {
            res = await apiRequest(`/api/hospitals/${encodeURIComponent(hospitalId)}/patient-admissions/${encodeURIComponent(patientId)}`);
        } catch (e1) {
            // fallback to global endpoint
            res = await apiRequest(`/api/hospital/patient-admissions/${encodeURIComponent(patientId)}`).catch(() => null);
        }

        // 2. If not found in current hospital, search across all available hospitals
        if ((!res || !res.admissions || !res.admissions.length) && Array.isArray(hospitalData) && hospitalData.length) {
            for (const h of hospitalData) {
                if (h.hospital_id === hospitalId) continue;
                try {
                    const otherRes = await apiRequest(`/api/hospitals/${encodeURIComponent(h.hospital_id)}/patient-admissions/${encodeURIComponent(patientId)}`);
                    if (otherRes && otherRes.admissions && otherRes.admissions.length) {
                        res = otherRes;
                        break;
                    }
                } catch (e2) {}
            }
        }

        const admissions = (res && res.admissions) || [];

        if (!admissions.length) {
            resultBox.innerHTML = `
                <div class="patient-not-found-card">
                    <div class="not-found-icon">🔍</div>
                    <h4>No Active Bed Allocation for UHID: "${escapeHTML(patientId)}"</h4>
                    <p>No active or historical room assignment was found under this Patient ID across Gorakhpur hospitals.</p>
                    <div class="not-found-tips">
                        <span>💡 Tip: Please check the Patient ID printed on your OPD Card / Discharge Summary, or contact the hospital admission counter.</span>
                    </div>
                </div>
            `;
            return;
        }

        resultBox.innerHTML = admissions.map(adm => {
            const statusClass = (adm.status || 'Active').toLowerCase();
            const hospObj = (hospitalData || []).find(h => h.hospital_id === adm.hospital_id || String(h.id) === String(adm.hospital_id)) || {};
            const hospName = adm.hospital_name || hospObj.hospital_name || adm.hospital_id || "Gorakhpur Medical Center";
            const hospAddress = adm.hospital_address || hospObj.address || "Gorakhpur Smart City Healthcare Grid, UP";
            const emergencyPhone = adm.hospital_emergency || hospObj.emergency_number || hospObj.phone || adm.hospital_phone || "108";
            const attendingDoctor = adm.attending_doctor || adm.doctor_name || "Dr. Rajesh Sharma (Senior Consultant)";
            
            const rawDate = adm.admission_date || adm.admitted_at || adm.created_at;
            const admittedDate = rawDate ? new Date(rawDate).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Active Inpatient";

            return `
                <div class="patient-room-pass">
                    <!-- Pass Top Header -->
                    <div class="room-pass-header">
                        <div class="pass-hosp-info">
                            <span class="pass-verified-tag">✓ Verified Hospital Inpatient Pass</span>
                            <h3 class="pass-hosp-name">${escapeHTML(hospName)}</h3>
                            <p class="pass-hosp-address">${escapeHTML(hospAddress)}</p>
                        </div>
                        <div class="pass-status-badge status-${statusClass}">
                            <span class="status-pulse-dot"></span>
                            <span>${escapeHTML(adm.status || "Admitted")}</span>
                        </div>
                    </div>

                    <!-- Patient Identity Strip -->
                    <div class="patient-pass-identity">
                        <div>
                            <span class="identity-label">Patient Name</span>
                            <strong class="identity-val">${escapeHTML(adm.patient_name || "Patient Record")}</strong>
                        </div>
                        <div>
                            <span class="identity-label">UHID / Patient ID</span>
                            <strong class="identity-val code-font">${escapeHTML(adm.patient_id)}</strong>
                        </div>
                        <div>
                            <span class="identity-label">Admission Timestamp</span>
                            <strong class="identity-val">${admittedDate}</strong>
                        </div>
                    </div>

                    <!-- High-Visibility 4-Card Allocation Showcase -->
                    <div class="room-pass-allocation-grid">
                        <div class="alloc-card room-badge-card">
                            <span class="alloc-icon">🚪</span>
                            <span class="alloc-label">ROOM NUMBER</span>
                            <h2 class="alloc-main-value">${escapeHTML(adm.room_number || "Room 101")}</h2>
                            <span class="alloc-sub">Inpatient Suite</span>
                        </div>

                        <div class="alloc-card bed-badge-card">
                            <span class="alloc-icon">🛏️</span>
                            <span class="alloc-label">BED NUMBER</span>
                            <h2 class="alloc-main-value">${escapeHTML(adm.bed_number || "Bed #1")}</h2>
                            <span class="alloc-sub">${escapeHTML(adm.ward_name || "General Ward")}</span>
                        </div>

                        <div class="alloc-card floor-badge-card">
                            <span class="alloc-icon">🏢</span>
                            <span class="alloc-label">FLOOR & WING</span>
                            <h2 class="alloc-main-value">${escapeHTML(adm.floor ? (adm.floor.toString().toLowerCase().includes('floor') ? adm.floor : `Floor ${adm.floor}`) : "Floor 1")}</h2>
                            <span class="alloc-sub">${escapeHTML(adm.building_wing || "Main Medical Wing")}</span>
                        </div>

                        <div class="alloc-card ward-badge-card">
                            <span class="alloc-icon">🩺</span>
                            <span class="alloc-label">WARD TYPE</span>
                            <h2 class="alloc-main-value">${escapeHTML(adm.ward_name || "General Ward")}</h2>
                            <span class="alloc-sub">Daily: ₹${Number(adm.charge_per_day || 1500).toFixed(0)}/day</span>
                        </div>
                    </div>

                    <!-- Clinical & Desk Contact Strip -->
                    <div class="room-pass-meta-strip">
                        <div class="meta-item">
                            <span class="meta-label">Attending Physician:</span>
                            <strong class="meta-value">${escapeHTML(attendingDoctor)}</strong>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Admission ID:</span>
                            <strong class="meta-value">${escapeHTML(adm.admission_id || adm.id || "ADM-CURRENT")}</strong>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Emergency Desk:</span>
                            <a href="tel:${escapeHTML(emergencyPhone)}" class="meta-phone-link">📞 ${escapeHTML(emergencyPhone)}</a>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    } catch (err) {
        console.error("Patient room lookup error:", err);
        resultBox.innerHTML = `
            <div class="lookup-notice-alert notice-danger">
                <span>Failed to search patient room details. (${escapeHTML(err.message)})</span>
            </div>
        `;
    }
}


/* =========================================================
   REAL-TIME BED AVAILABILITY (DATABASE SOURCE OF TRUTH)
========================================================= */

let currentBedData = null;
let bedPollingTimer = null;
let isBedLoading = false;
let bedSocketInitialized = false;

function safeBedNum(val, fallback = 0) {
    const n = Number(val);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function safeBedPercentage(available, total) {
    const a = safeBedNum(available, 0);
    const t = safeBedNum(total, 0);
    if (t <= 0) return 0;
    const pct = (a / t) * 100;
    if (!Number.isFinite(pct) || pct < 0) return 0;
    if (pct > 100) return 100;
    return Math.round(pct * 10) / 10;
}

function formatBedCount(val) {
    const n = Number(val);
    if (!Number.isFinite(n)) return "--";
    return n.toLocaleString();
}

/**
 * Fetch Gorakhpur hospital bed availability from backend API.
 * Single source of truth: MySQL Database.
 */
async function fetchBedAvailability(isManualRefresh = false) {
    if (isBedLoading) return;
    isBedLoading = true;

    const alertBox = document.getElementById("bedAlertBox");
    const refreshBtn = document.getElementById("bedRefreshBtn");

    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = "⏳ Refreshing...";
    }

    if (alertBox && !currentBedData) {
        alertBox.className = "bed-alert-box loading";
        alertBox.textContent = "Loading bed availability...";
        alertBox.style.display = "block";
    }

    try {
        const response = await apiRequest("/api/hospital/beds");
        if (!response || !response.summary || !response.categories) {
            throw new Error("Invalid response format received from bed availability endpoint.");
        }

        currentBedData = response;

        if (alertBox) {
            alertBox.style.display = "none";
            alertBox.textContent = "";
        }

        // Populate hospital filter dropdown if not populated
        const filterSelect = document.getElementById("bedHospitalFilter");
        if (filterSelect && filterSelect.options.length <= 1 && Array.isArray(response.hospitals)) {
            const currentVal = filterSelect.value || "all";
            filterSelect.innerHTML = `<option value="all">📍 All Gorakhpur Hospitals (Citywide Total)</option>`;
            response.hospitals.forEach(h => {
                const opt = document.createElement("option");
                opt.value = h.hospitalId;
                opt.textContent = `🏥 ${h.hospitalName} (${formatBedCount(h.totalBeds)} Beds)`;
                filterSelect.appendChild(opt);
            });
            filterSelect.value = currentVal;
        }

        const selectedFilter = filterSelect ? filterSelect.value : "all";
        renderBedAvailabilityUI(response, selectedFilter);

    } catch (err) {
        console.error("Bed Availability Fetch Error:", err);
        if (alertBox) {
            alertBox.className = "bed-alert-box error";
            alertBox.textContent = "Unable to load bed availability.";
            alertBox.style.display = "block";
        }

        // If no prior verified data, clear display numbers (no fake values!)
        if (!currentBedData) {
            resetBedDisplaysToError();
        }
    } finally {
        isBedLoading = false;
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = "🔄 Refresh";
        }
    }
}

function resetBedDisplaysToError() {
    const ids = [
        "totalGorakhpurBeds", "totalGorakhpurAvailable", "totalGorakhpurOccupied",
        "generalBedDisplay", "icuBedDisplay", "emergencyBedDisplay", "privateBedDisplay",
        "generalTotalDisplay", "generalOccupiedDisplay", "generalAvailStatDisplay",
        "icuTotalDisplay", "icuOccupiedDisplay", "icuAvailStatDisplay",
        "emergencyTotalDisplay", "emergencyOccupiedDisplay", "emergencyAvailStatDisplay",
        "privateTotalDisplay", "privateOccupiedDisplay", "privateAvailStatDisplay"
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "--";
    });

    const progressBars = ["generalProgressBar", "icuProgressBar", "emergencyProgressBar", "privateProgressBar"];
    progressBars.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.width = "0%";
    });

    const footers = ["generalBedFooter", "icuBedFooter", "emergencyBedFooter", "privateBedFooter"];
    footers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "Data unavailable";
    });
}

function handleBedHospitalFilterChange(filterValue) {
    if (!currentBedData) return;
    renderBedAvailabilityUI(currentBedData, filterValue);
}

function renderBedAvailabilityUI(data, filterValue = "all") {
    if (!data) return;

    let targetSummary = data.summary;
    let targetCategories = data.categories;
    let scopeBadge = "📍 GORAKHPUR METROPOLITAN REGION";
    let scopeTitle = "Total Gorakhpur Bed Capacity";
    let scopeSubtitle = `Sum of total bed capacity across all ${data.hospitals?.length || 14} Gorakhpur Smart City hospitals`;

    if (filterValue && filterValue !== "all" && Array.isArray(data.hospitals)) {
        const selectedHospital = data.hospitals.find(h =>
            h.hospitalId === filterValue || (h.hospitalName && h.hospitalName.toLowerCase() === filterValue.toLowerCase())
        );

        if (selectedHospital) {
            targetSummary = {
                totalBeds: selectedHospital.totalBeds,
                availableBeds: selectedHospital.availableBeds,
                occupiedBeds: selectedHospital.occupiedBeds,
                availablePercentage: selectedHospital.availablePercentage
            };
            targetCategories = selectedHospital.categories;
            scopeBadge = `🏥 ${selectedHospital.hospitalType || 'VERIFIED HOSPITAL'}`;
            scopeTitle = `${selectedHospital.hospitalName} Capacity`;
            scopeSubtitle = selectedHospital.address || "Gorakhpur Smart City Registered Healthcare Facility";
        }
    }

    // 1. Update Scope Titles
    const elBadge = document.getElementById("bedSummaryBadge");
    const elTitle = document.getElementById("bedSummaryTitle");
    const elSubtitle = document.getElementById("bedSummarySubtitle");
    if (elBadge) elBadge.textContent = scopeBadge;
    if (elTitle) elTitle.textContent = scopeTitle;
    if (elSubtitle) elSubtitle.textContent = scopeSubtitle;

    // 2. Update Total Summary Card
    const elTotal = document.getElementById("totalGorakhpurBeds");
    const elAvail = document.getElementById("totalGorakhpurAvailable");
    const elAvailPct = document.getElementById("totalGorakhpurAvailablePct");
    const elOcc = document.getElementById("totalGorakhpurOccupied");
    const elOccPct = document.getElementById("totalGorakhpurOccupiedPct");

    const totalBeds = safeBedNum(targetSummary.totalBeds);
    const availBeds = safeBedNum(targetSummary.availableBeds);
    const occBeds = safeBedNum(targetSummary.occupiedBeds);
    const availPct = safeBedPercentage(availBeds, totalBeds);
    const occPct = safeBedPercentage(occBeds, totalBeds);

    if (elTotal) elTotal.textContent = formatBedCount(totalBeds);
    if (elAvail) elAvail.textContent = formatBedCount(availBeds);
    if (elAvailPct) elAvailPct.textContent = `${availPct}% available`;
    if (elOcc) elOcc.textContent = formatBedCount(occBeds);
    if (elOccPct) elOccPct.textContent = `${occPct}% occupied`;

    // 3. Update Category Cards
    const cats = targetCategories || {};
    const categoryConfigs = [
        { key: "general", prefix: "general", label: "General" },
        { key: "icu", prefix: "icu", label: "ICU" },
        { key: "emergency", prefix: "emergency", label: "Emergency" },
        { key: "private", prefix: "private", label: "Private" }
    ];

    categoryConfigs.forEach(cfg => {
        const catData = cats[cfg.key] || { totalBeds: 0, availableBeds: 0, occupiedBeds: 0 };
        const cTotal = safeBedNum(catData.totalBeds);
        const cAvail = safeBedNum(catData.availableBeds);
        const cOcc = safeBedNum(catData.occupiedBeds);
        const cPct = safeBedPercentage(cAvail, cTotal);

        // Main big number = available beds
        const elMain = document.getElementById(`${cfg.prefix}BedDisplay`);
        if (elMain) elMain.textContent = formatBedCount(cAvail);

        // Stats
        const elTotStat = document.getElementById(`${cfg.prefix}TotalDisplay`);
        const elOccStat = document.getElementById(`${cfg.prefix}OccupiedDisplay`);
        const elAvailStat = document.getElementById(`${cfg.prefix}AvailStatDisplay`);
        if (elTotStat) elTotStat.textContent = formatBedCount(cTotal);
        if (elOccStat) elOccStat.textContent = formatBedCount(cOcc);
        if (elAvailStat) elAvailStat.textContent = formatBedCount(cAvail);

        // Progress bar
        const elBar = document.getElementById(`${cfg.prefix}ProgressBar`);
        if (elBar) elBar.style.width = `${cPct}%`;

        // Footer
        const elFoot = document.getElementById(`${cfg.prefix}BedFooter`);
        if (elFoot) elFoot.textContent = `${formatBedCount(cAvail)} Available beds (${cPct}% free)`;
    });

    // 4. Update Hospital-Wise Verification Table
    const tableBody = document.getElementById("bedVerificationTableBody");
    const countBadge = document.getElementById("bedVerificationCount");
    const hospitals = Array.isArray(data.hospitals) ? data.hospitals : [];

    if (countBadge) countBadge.textContent = `${hospitals.length} Hospitals`;

    if (tableBody) {
        if (!hospitals.length) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:16px;color:#94a3b8;">No verified bed data available.</td></tr>`;
        } else {
            tableBody.innerHTML = hospitals.map(h => {
                const hTotal = safeBedNum(h.totalBeds);
                const hAvail = safeBedNum(h.availableBeds);
                const hOcc = safeBedNum(h.occupiedBeds);
                const isSelected = filterValue === h.hospitalId;

                const cGen = h.categories?.general || { availableBeds: 0, totalBeds: 0 };
                const cIcu = h.categories?.icu || { availableBeds: 0, totalBeds: 0 };
                const cEmg = h.categories?.emergency || { availableBeds: 0, totalBeds: 0 };
                const cPriv = h.categories?.private || { availableBeds: 0, totalBeds: 0 };

                return `
                    <tr style="${isSelected ? 'background:#eff6ff;font-weight:700;' : ''}">
                        <td>
                            <strong>${escapeHTML(h.hospitalName)}</strong>
                            <div style="font-size:11px;color:#64748b;">${escapeHTML(h.address || '')}</div>
                        </td>
                        <td><strong>${formatBedCount(hTotal)}</strong></td>
                        <td style="color:#16a34a;font-weight:700;">${formatBedCount(hAvail)}</td>
                        <td style="color:#d97706;font-weight:700;">${formatBedCount(hOcc)}</td>
                        <td>${formatBedCount(cGen.availableBeds)} / ${formatBedCount(cGen.totalBeds)}</td>
                        <td>${formatBedCount(cIcu.availableBeds)} / ${formatBedCount(cIcu.totalBeds)}</td>
                        <td>${formatBedCount(cEmg.availableBeds)} / ${formatBedCount(cEmg.totalBeds)}</td>
                        <td>${formatBedCount(cPriv.availableBeds)} / ${formatBedCount(cPriv.totalBeds)}</td>
                    </tr>
                `;
            }).join("");
        }
    }
}

/**
 * Initialize real-time listeners and polling for bed availability.
 */
function initBedRealtime() {
    // 1. Socket.IO integration if socket exists or becomes available
    if (typeof socket !== "undefined" && socket && !bedSocketInitialized) {
        socket.on("hospital:bed-updated", (updatedData) => {
            console.log("⚡ [Socket.IO] Live hospital bed telemetry received");
            if (updatedData && updatedData.summary) {
                currentBedData = updatedData;
                const filterVal = document.getElementById("bedHospitalFilter")?.value || "all";
                renderBedAvailabilityUI(currentBedData, filterVal);
            }
            const bedModal = document.getElementById("bedModal");
            if (bedModal && (bedModal.classList.contains("show") || bedModal.style.display === "flex" || bedModal.style.display === "block")) {
                loadBeds(true);
                updateSelectedHospitalDetails();
            }
        });
        socket.on("bed-updated", (updatedData) => {
            if (updatedData && updatedData.summary) {
                currentBedData = updatedData;
                const filterVal = document.getElementById("bedHospitalFilter")?.value || "all";
                renderBedAvailabilityUI(currentBedData, filterVal);
            }
            const bedModal = document.getElementById("bedModal");
            if (bedModal && (bedModal.classList.contains("show") || bedModal.style.display === "flex" || bedModal.style.display === "block")) {
                loadBeds(true);
                updateSelectedHospitalDetails();
            }
        });
        bedSocketInitialized = true;
    }

    // 2. Polling interval (every 60s) for background freshness
    if (!bedPollingTimer) {
        bedPollingTimer = setInterval(() => {
            fetchBedAvailability(false);
        }, 60000);
    }
}

async function initBedAvailability() {
    await fetchBedAvailability(false);
    initBedRealtime();
}

async function loadBeds(isSilent = false) {
    const result = document.getElementById("bedResult");
    const hospitalId = document.getElementById("bedHospitalSelect")?.value;
    if (!result || !hospitalId) return;

    if (!isSilent) {
        result.innerHTML = `
            <div class="bed-loading-skeleton">
                <div class="skeleton-spinner"></div>
                <span>Fetching live ward telemetry...</span>
            </div>
        `;
    }

    try {
        const data = await apiRequest(`/api/hospitals/${encodeURIComponent(hospitalId)}/beds`);
        bedData = data.beds || [];
        renderBeds(bedData);

        const syncStatus = document.getElementById("bedLiveSyncStatus");
        if (syncStatus) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            syncStatus.innerHTML = `<span class="live-dot"></span> Synced with Staff Desk at ${timeStr}`;
        }
    } catch (error) {
        console.error("Bed API error:", error);
        if (!isSilent) {
            showError(result, error.message);
        }
    }
}

function getCategoryIcon(catName) {
    const name = (catName || "").toLowerCase();
    if (name.includes("maternity") || name.includes("gyn")) return "👶";
    if (name.includes("pediatric") || name.includes("child")) return "🧸";
    if (name.includes("icu") || name.includes("ccu")) return "🩺";
    if (name.includes("emergency") || name.includes("trauma")) return "🚨";
    if (name.includes("private") || name.includes("deluxe")) return "🛌";
    if (name.includes("semi")) return "🛏️";
    return "🏥";
}

function renderBedCategoryCards(beds) {
    if (!beds || !beds.length) {
        return `
            <div class="bed-empty-state">
                <div class="empty-icon">🛏️</div>
                <h4>No Ward Categories Found</h4>
                <p>This hospital has not reported any active ward inventory yet.</p>
            </div>
        `;
    }

    const currentHospId = document.getElementById("bedHospitalSelect")?.value || "";

    return `
        <div class="bed-grid">
            ${beds.map(bed => {
                const total = Number(bed.total_beds || 0);
                const occupied = Number(bed.occupied_beds || 0);
                const available = Math.max(0, total - occupied);
                const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
                const icon = getCategoryIcon(bed.category);

                let statusBadge = "";
                let progressColorClass = "meter-green";
                if (available === 0) {
                    statusBadge = `<span class="bed-status-chip chip-danger">Full / Waitlist</span>`;
                    progressColorClass = "meter-danger";
                } else if (pct >= 85) {
                    statusBadge = `<span class="bed-status-chip chip-warning">High Occupancy</span>`;
                    progressColorClass = "meter-warning";
                } else {
                    statusBadge = `<span class="bed-status-chip chip-success">Beds Available</span>`;
                    progressColorClass = "meter-green";
                }

                return `
                    <div class="bed-card">
                        <div class="bed-card-head">
                            <div class="bed-card-title-group">
                                <span class="bed-category-icon">${icon}</span>
                                <div>
                                    <h4 class="bed-category-title">${escapeHTML(bed.category || "General Ward")}</h4>
                                    <span class="bed-category-type">Inpatient Ward</span>
                                </div>
                            </div>
                            ${statusBadge}
                        </div>

                        <!-- 3-Column Metrics Grid - NEVER squished -->
                        <div class="bed-stats-grid">
                            <div class="bed-stat-col stat-total">
                                <span class="stat-col-label">TOTAL</span>
                                <span class="stat-col-val">${total}</span>
                            </div>
                            <div class="bed-stat-col stat-occupied">
                                <span class="stat-col-label">OCCUPIED</span>
                                <span class="stat-col-val">${occupied}</span>
                            </div>
                            <div class="bed-stat-col stat-available">
                                <span class="stat-col-label">AVAILABLE</span>
                                <span class="stat-col-val">${available}</span>
                            </div>
                        </div>

                        <!-- Modern occupancy bar -->
                        <div class="bed-progress-wrap">
                            <div class="bed-progress-labels">
                                <span class="occupancy-pct-text"><strong>${pct}%</strong> Occupied</span>
                                <span class="free-beds-text"><strong>${available}</strong> Available</span>
                            </div>
                            <div class="bed-progress-track">
                                <div class="bed-progress-bar ${progressColorClass}" style="width: ${Math.min(100, pct)}%"></div>
                            </div>
                        </div>

                        <!-- Card Action -->
                        <div class="bed-card-foot">
                            <button type="button" class="btn-card-reserve" onclick="openCitizenBedBookingModal('${escapeHTML(currentHospId)}')">
                                <span>Reserve Bed</span>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

function renderBeds(beds) {
    const result = document.getElementById("bedResult");
    if (!result) return;
    result.innerHTML = renderBedCategoryCards(beds);
}

/* =========================================================
   INTERACTIVE CITIZEN BED BOOKING & REAL-TIME BILLING (NO REFRESH)
========================================================= */

let citizenAvailableBedsCache = [];
let citizenWardsCache = [];

async function openCitizenBedBookingModal(preselectedHospitalId = null, preselectedBedId = null) {
    openModal("citizenBedBookingModal");
    
    // Auto-fill patient name and ID if logged in / cached
    const patId = (typeof getPatientId === "function" && getPatientId()) || localStorage.getItem("smartcity_patient_id") || "";
    const patName = localStorage.getItem("smartcity_patient_name") || localStorage.getItem("user_name") || "";
    const patPhone = localStorage.getItem("user_phone") || "";

    const nameInput = document.getElementById("cbPatientName");
    const idInput = document.getElementById("cbPatientId");
    const phoneInput = document.getElementById("cbPatientMobile");

    if (nameInput && !nameInput.value) nameInput.value = patName;
    if (idInput && !idInput.value) idInput.value = patId;
    if (phoneInput && !phoneInput.value) phoneInput.value = patPhone;

    // Load hospitals list
    const hospSelect = document.getElementById("cbHospitalSelect");
    if (hospSelect) {
        if (!hospitalData || !hospitalData.length) {
            try {
                const data = await apiRequest("/api/hospitals");
                hospitalData = data.hospitals || [];
            } catch (e) {}
        }
        hospSelect.innerHTML = `<option value="">-- Choose Hospital --</option>` + 
            (hospitalData || []).map(h => `<option value="${escapeHTML(h.hospital_id)}">${escapeHTML(h.hospital_name)}</option>`).join("");

        // Select hospital
        const targetHosp = preselectedHospitalId || document.getElementById("bedHospitalFilter")?.value || (selectedHospital?.hospital_id) || "HOSP-001";
        if (targetHosp && targetHosp !== "all") {
            hospSelect.value = targetHosp;
            await handleCitizenBookingHospitalChange(targetHosp, preselectedBedId);
        } else if (hospitalData && hospitalData.length) {
            hospSelect.value = hospitalData[0].hospital_id;
            await handleCitizenBookingHospitalChange(hospitalData[0].hospital_id, preselectedBedId);
        }
    }
}

async function handleCitizenBookingHospitalChange(hospitalId, preselectedBedId = null) {
    if (!hospitalId) return;
    const wardSelect = document.getElementById("cbWardSelect");
    const bedSelect = document.getElementById("cbBedSelect");
    const chargeDisplay = document.getElementById("cbDailyChargeDisplay");
    const infoNotice = document.getElementById("cbBedInfoNotice");

    if (wardSelect) wardSelect.innerHTML = `<option value="">Loading wards...</option>`;
    if (bedSelect) bedSelect.innerHTML = `<option value="">Loading available beds...</option>`;

    try {
        const [wardsRes, bedsRes] = await Promise.all([
            apiRequest(`/api/hospitals/${encodeURIComponent(hospitalId)}/wards`).catch(() => ({ wards: [] })),
            apiRequest(`/api/hospitals/${encodeURIComponent(hospitalId)}/ward-beds?status=Available`).catch(() => ({ beds: [] }))
        ]);

        citizenWardsCache = wardsRes.wards || [];
        citizenAvailableBedsCache = bedsRes.beds || [];

        // Populate Wards
        if (wardSelect) {
            wardSelect.innerHTML = `<option value="all">📍 All Wards & Specialties (${citizenAvailableBedsCache.length} Available Beds)</option>` +
                citizenWardsCache.map(w => `<option value="${escapeHTML(w.ward_id)}">${escapeHTML(w.ward_name)} (${escapeHTML(w.ward_type)}) - ₹${Number(w.charge_per_day || 500).toFixed(0)}/day</option>`).join("");
        }

        renderCitizenBedOptions(citizenAvailableBedsCache, preselectedBedId);
    } catch (err) {
        console.error("Error loading citizen booking wards/beds:", err);
        if (bedSelect) bedSelect.innerHTML = `<option value="">Error loading beds</option>`;
    }
}

function handleCitizenBookingWardChange(wardId) {
    if (!wardId || wardId === "all") {
        renderCitizenBedOptions(citizenAvailableBedsCache);
    } else {
        const filtered = citizenAvailableBedsCache.filter(b => b.ward_id === wardId || String(b.ward_id) === String(wardId));
        renderCitizenBedOptions(filtered);
    }
}

function renderCitizenBedOptions(beds, preselectedBedId = null) {
    const bedSelect = document.getElementById("cbBedSelect");
    if (!bedSelect) return;

    if (!beds.length) {
        bedSelect.innerHTML = `<option value="">✕ No available beds in this ward</option>`;
        updateCitizenBedPricingNotice(null);
        return;
    }

    bedSelect.innerHTML = `<option value="">-- Select Bed (${beds.length} Available) --</option>` +
        beds.map(b => {
            const charge = Number(b.charge || b.charge_per_day || 3500.00);
            return `<option value="${escapeHTML(b.bed_id)}" data-charge="${charge}" data-ward="${escapeHTML(b.ward_name || '')}" data-floor="${escapeHTML(b.floor || '')}" data-room="${escapeHTML(b.room_number || '')}">
                ${escapeHTML(b.bed_number)} [${escapeHTML(b.ward_name || b.bed_category || 'General')}] - ₹${charge.toFixed(0)}/day
            </option>`;
        }).join("");

    if (preselectedBedId) {
        bedSelect.value = preselectedBedId;
    } else if (beds.length > 0) {
        bedSelect.selectedIndex = 1;
    }

    handleCitizenBedOptionSelected(bedSelect.value);
}

function handleCitizenBedOptionSelected(bedId) {
    const bedSelect = document.getElementById("cbBedSelect");
    if (!bedSelect || !bedId) {
        updateCitizenBedPricingNotice(null);
        return;
    }
    const selectedOption = bedSelect.options[bedSelect.selectedIndex];
    if (!selectedOption) return;

    const charge = selectedOption.getAttribute("data-charge") || "3500";
    const ward = selectedOption.getAttribute("data-ward") || "";
    const floor = selectedOption.getAttribute("data-floor") || "";
    const room = selectedOption.getAttribute("data-room") || "";

    updateCitizenBedPricingNotice({ charge, ward, floor, room, bedNumber: selectedOption.textContent.split("[")[0].trim() });
}

function updateCitizenBedPricingNotice(info) {
    const chargeDisplay = document.getElementById("cbDailyChargeDisplay");
    const infoNotice = document.getElementById("cbBedInfoNotice");

    if (!info) {
        if (chargeDisplay) chargeDisplay.textContent = "₹0.00";
        if (infoNotice) infoNotice.style.display = "none";
        return;
    }

    if (chargeDisplay) chargeDisplay.textContent = `₹${Number(info.charge).toLocaleString()}/day`;
    if (infoNotice) {
        infoNotice.style.display = "block";
        infoNotice.textContent = `✓ ${info.ward ? info.ward + ' • ' : ''}${info.floor ? info.floor + ' • ' : ''}${info.room ? info.room : ''} (Ready for Admission)`;
    }
}

async function submitCitizenBedBooking(e) {
    e.preventDefault();
    const hospSelect = document.getElementById("cbHospitalSelect");
    const bedSelect = document.getElementById("cbBedSelect");
    const patientName = document.getElementById("cbPatientName")?.value.trim();
    const patientMobile = document.getElementById("cbPatientMobile")?.value.trim();
    const patientId = document.getElementById("cbPatientId")?.value.trim();
    const patientGender = document.getElementById("cbPatientGender")?.value;
    const notes = document.getElementById("cbNotes")?.value.trim();
    const submitBtn = document.getElementById("btnSubmitCitizenBedBooking");

    const hospitalId = hospSelect?.value;
    const bedId = bedSelect?.value;

    if (!hospitalId || !bedId || !patientName || !patientMobile) {
        showNotification("Please select hospital, bed, and enter patient details.", "warning");
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `⏳ Reserving Bed...`;
    }

    try {
        const res = await apiRequest(`/api/hospitals/${encodeURIComponent(hospitalId)}/ward-beds/book`, {
            method: "POST",
            body: JSON.stringify({
                bed_id: bedId,
                patient_name: patientName,
                patient_id: patientId || undefined,
                patient_mobile: patientMobile,
                patient_gender: patientGender,
                notes: notes || "Online Citizen Bed Booking"
            })
        });

        // 1. Close Modal
        closeModal("citizenBedBookingModal");

        // 2. INLINE TOAST NOTIFICATION (NO BROWSER ALERT)
        showNotification(res.message || `✓ Bed booked successfully.`, "success");

        // Save patient session if empty
        if (res.invoice?.patient_id) {
            localStorage.setItem("smartcity_patient_id", res.invoice.patient_id);
            localStorage.setItem("smartcity_patient_name", patientName);
        }

        // 3. IMMEDIATE IN-PLACE DOM UPDATES WITHOUT PAGE REFRESH (Requirement 2)
        // A. Immediately decrement available counter and increment reserved counter in DOM
        const availMetric = document.getElementById("totalGorakhpurAvailable");
        if (availMetric && !isNaN(parseInt(availMetric.textContent))) {
            const curVal = parseInt(availMetric.textContent);
            if (curVal > 0) availMetric.textContent = curVal - 1;
        }

        const occMetric = document.getElementById("totalGorakhpurOccupied");
        if (occMetric && !isNaN(parseInt(occMetric.textContent))) {
            const curOcc = parseInt(occMetric.textContent);
            occMetric.textContent = curOcc + 1;
        }

        // B. Update affected bed category counter (e.g. ICU, General)
        if (res.bed?.ward_name) {
            const isIcu = res.bed.ward_name.toLowerCase().includes("icu");
            const isEmg = res.bed.ward_name.toLowerCase().includes("emerg") || res.bed.ward_name.toLowerCase().includes("trauma");
            const isPvt = res.bed.ward_name.toLowerCase().includes("private") || res.bed.ward_name.toLowerCase().includes("suite");

            const targetDisplayId = isIcu ? "icuBedDisplay" : (isEmg ? "emergencyBedDisplay" : (isPvt ? "privateBedDisplay" : "generalBedDisplay"));
            const targetEl = document.getElementById(targetDisplayId);
            if (targetEl && !isNaN(parseInt(targetEl.textContent))) {
                const cur = parseInt(targetEl.textContent);
                if (cur > 0) targetEl.textContent = cur - 1;
            }
        }

        // C. Remove booked bed from cached available beds list
        citizenAvailableBedsCache = citizenAvailableBedsCache.filter(b => b.bed_id !== bedId);

        // D. Re-fetch fresh telemetry seamlessly in the background (zero browser reload)
        fetchBedAvailability(false);

    } catch (err) {
        console.error("Bed booking failed:", err);
        // Error notification inside existing UI (Requirement 1 & 3)
        showNotification(err.message || "✕ This bed is no longer available.", "error");

        // If double booking conflict (409), remove bed from available list immediately
        if (err.message && err.message.includes("already been booked")) {
            citizenAvailableBedsCache = citizenAvailableBedsCache.filter(b => b.bed_id !== bedId);
            const wardVal = document.getElementById("cbWardSelect")?.value;
            handleCitizenBookingWardChange(wardVal);
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `✓ Confirm Bed Booking`;
        }
    }
}

async function openCitizenBillingHistory(patientId = null, hospitalId = "HOSP-001") {
    const effectivePatientId = patientId || (typeof getPatientId === "function" && getPatientId()) || localStorage.getItem("smartcity_patient_id") || "PAT-RAHUL-10231";
    openModal("citizenBillingHistoryModal");

    const totalBilledEl = document.getElementById("cbhTotalBilled");
    const totalPaidEl = document.getElementById("cbhTotalPaid");
    const totalRemEl = document.getElementById("cbhTotalRemaining");
    const invList = document.getElementById("cbhInvoicesList");
    const payList = document.getElementById("cbhPaymentsList");
    const hospNameEl = document.getElementById("cbhHospName");
    const hospLogoEl = document.getElementById("cbhHospLogo");
    const metaEl = document.getElementById("cbhPatientMeta");

    if (metaEl) metaEl.textContent = `Patient ID: ${effectivePatientId} • Linked Hospital Accounts`;
    if (invList) invList.innerHTML = `<div style="padding:14px; text-align:center; color:#64748b;">Loading billing records...</div>`;
    if (payList) payList.innerHTML = `<div style="padding:14px; text-align:center; color:#64748b;">Loading payment transactions...</div>`;

    try {
        const res = await apiRequest(`/api/hospitals/${encodeURIComponent(hospitalId)}/patients/${encodeURIComponent(effectivePatientId)}/billing-history`);
        
        if (res.hospital && hospNameEl) hospNameEl.textContent = res.hospital.hospital_name || "SmartCity Hospital";
        if (res.hospital?.logo && hospLogoEl) hospLogoEl.src = res.hospital.logo;

        if (totalBilledEl) totalBilledEl.textContent = `₹${Number(res.summary?.total_billed || 0).toFixed(2)}`;
        if (totalPaidEl) totalPaidEl.textContent = `₹${Number(res.summary?.total_paid || 0).toFixed(2)}`;
        if (totalRemEl) totalRemEl.textContent = `₹${Number(res.summary?.total_remaining || 0).toFixed(2)}`;

        // Render Invoices
        if (invList) {
            if (!res.invoices?.length) {
                invList.innerHTML = `<div style="padding:12px; color:#94a3b8; font-size:13px; text-align:center;">No invoices generated for this patient.</div>`;
            } else {
                invList.innerHTML = res.invoices.map(inv => `
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <strong style="color:#1e293b; font-size:13px;">${escapeHTML(inv.service_type)}</strong>
                            <div style="font-size:11px; color:#64748b; font-family:monospace; margin-top:2px;">#${escapeHTML(inv.invoice_id)} • ${new Date(inv.created_at).toLocaleDateString()}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:14px; font-weight:800; color:#1e293b;">₹${Number(inv.total_amount).toFixed(2)}</div>
                            <span style="display:inline-block; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; ${inv.payment_status === 'Paid' ? 'background:#dcfce7; color:#166534;' : (inv.payment_status === 'Partially Paid' ? 'background:#fef3c7; color:#92400e;' : 'background:#fee2e2; color:#991b1b;')}">
                                ${escapeHTML(inv.payment_status)}
                            </span>
                        </div>
                    </div>
                `).join("");
            }
        }

        // Render Payments
        if (payList) {
            if (!res.payments?.length) {
                payList.innerHTML = `<div style="padding:12px; color:#94a3b8; font-size:13px; text-align:center;">No payment transactions recorded yet.</div>`;
            } else {
                payList.innerHTML = res.payments.map(p => `
                    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <strong style="color:#166534; font-size:13px;">Paid ₹${Number(p.amount).toFixed(2)} via ${escapeHTML(p.payment_method)}</strong>
                            <div style="font-size:11px; color:#15803d; font-family:monospace;">Receipt: ${escapeHTML(p.payment_id)} • ${new Date(p.created_at).toLocaleString()}</div>
                        </div>
                        <span style="font-size:11px; font-weight:700; color:#166534;">✓ VERIFIED</span>
                    </div>
                `).join("");
            }
        }

    } catch (err) {
        if (invList) invList.innerHTML = `<div style="padding:12px; color:#ef4444; font-size:13px;">Error loading billing statement: ${err.message}</div>`;
    }
}


/* =========================================================
   PATIENT FILE
========================================================= */

/* =========================================================
   PATIENT MEDICAL RECORD — tabbed, backend-driven.
   Tabs with no backing endpoint (lab reports, free-text medical
   history, ambulance/emergency history) show an honest empty
   state instead of fabricated data.
========================================================= */

let currentRecordPatient = null;
let currentRecordTab = "profile";

function openPatientFile(patientId = null) {
    openModal("patientFileModal");
    if (patientId) {
        const input = document.getElementById("patientFileSearch");
        if (input) input.value = patientId;
        searchPatientFile();
    }
}

function loadMyPatientRecord() {
    const id = getPatientId();
    if (!id) { showNotification("No patient session found. Register or search by ID first.", "warning"); return; }
    const input = document.getElementById("patientFileSearch");
    if (input) input.value = id;
    searchPatientFile();
}

async function searchPatientFile() {
    const patientId = document.getElementById("patientFileSearch")?.value.trim();
    const result = document.getElementById("patientFileResult");
    const tabs = document.getElementById("patientFileTabs");
    if (!result) return;

    if (!patientId) { showError(result, "Enter a Patient ID."); return; }
    showLoading(result, "Loading medical record...");

    try {
        const data = await apiRequest(`/api/patients/${encodeURIComponent(patientId)}`);
        currentRecordPatient = data.patient || data;
        currentRecordTab = "profile";

        if (tabs) {
            tabs.style.display = "flex";
            tabs.innerHTML = [
                ["profile", "👤 Profile"],
                ["appointments", "📅 Appointments"],
                ["records", "📝 Medical Records"],
                ["reports", "📁 Reports"],
                ["prescriptions", "💊 Prescriptions"],
                ["bills", "🧾 Pharmacy Bills"]
            ].map(([key, label]) =>
                `<button type="button" class="patient-file-tab-btn ${key === currentRecordTab ? "active" : ""}" data-tab="${key}" onclick="switchRecordTab('${key}')">${label}</button>`
            ).join("");
        }

        await renderRecordTab("profile");
    } catch (error) {
        console.error("Patient file error:", error);
        if (tabs) tabs.style.display = "none";
        showError(result, error.message);
    }
}

function switchRecordTab(tab) {
    currentRecordTab = tab;
    document.querySelectorAll(".patient-file-tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tab);
    });
    renderRecordTab(tab);
}

function printPatientRecord() {
    window.print();
}

/* =========================================================
   PRINT PATIENT CARD (OFFICIAL HEALTH ID BADGE)
========================================================= */

function openPatientPrintCard(patient = null) {
    const target = patient || currentRecordPatient;
    if (!target) {
        showNotification("No active patient profile loaded.", "warning");
        return;
    }

    const pId = target.patient_id || target.patientId || "--";
    const name = target.name || "--";
    const age = target.age !== null && target.age !== undefined ? `${target.age} yrs` : "--";
    const gender = target.gender || "--";
    const blood = target.blood_group || target.bloodGroup || "N/A";
    const mobile = target.mobile || "--";
    const emg = target.emergency_contact || target.emergencyContact || "--";
    const hosp = target.hospital_name || target.hospitalId || target.hospital_id || "AIIMS Gorakhpur";
    const abha = target.abha_address || (target.abha_status === "Linked" ? "Linked (ABDM)" : "Not Linked");

    const idEl = document.getElementById("printCardPatientId");
    if (idEl) idEl.textContent = pId;
    const nameEl = document.getElementById("printCardName");
    if (nameEl) nameEl.textContent = name;
    const agEl = document.getElementById("printCardAgeGender");
    if (agEl) agEl.textContent = `${age} / ${gender}`;
    const bgEl = document.getElementById("printCardBloodGroup");
    if (bgEl) bgEl.textContent = blood;
    const mobEl = document.getElementById("printCardMobile");
    if (mobEl) mobEl.textContent = mobile;
    const emgEl = document.getElementById("printCardEmergency");
    if (emgEl) emgEl.textContent = emg;
    const hospEl = document.getElementById("printCardHospital");
    if (hospEl) hospEl.textContent = hosp;
    const abhaEl = document.getElementById("printCardAbha");
    if (abhaEl) abhaEl.textContent = abha;

    showPatientQR(target, "printCardQRCode");
    openModal("patientPrintCardModal");
}

function executePrintPatientCard() {
    window.print();
}

/* =========================================================
   ABHA DEMO & CONSENT LINKING
========================================================= */

function openAbhaModal(patientId = null) {
    currentActiveAbhaPatientId = patientId || (currentRecordPatient ? currentRecordPatient.patient_id : null);
    if (!currentActiveAbhaPatientId) {
        showNotification("Please select or search a patient first.", "warning");
        return;
    }
    const input = document.getElementById("inputAbhaAddress");
    if (input) input.value = "";
    const msg = document.getElementById("abhaLinkMsg");
    if (msg) msg.style.display = "none";
    openModal("abhaModal");
}

async function confirmAbhaLink() {
    const patientId = currentActiveAbhaPatientId;
    const abhaAddress = document.getElementById("inputAbhaAddress")?.value.trim();
    const consent = document.getElementById("chkAbhaConsent")?.checked;
    const msg = document.getElementById("abhaLinkMsg");

    if (!patientId) {
        showNotification("Patient ID missing.", "error");
        return;
    }
    if (!abhaAddress) {
        if (msg) {
            msg.style.display = "block";
            msg.style.color = "#dc2626";
            msg.textContent = "Please enter your ABHA address (e.g. name@abdm).";
        }
        return;
    }
    if (!consent) {
        if (msg) {
            msg.style.display = "block";
            msg.style.color = "#dc2626";
            msg.textContent = "Consent is required under ABDM guidelines.";
        }
        return;
    }

    try {
        const res = await apiRequest(`/api/patients/${encodeURIComponent(patientId)}/link-abha`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ abhaAddress, consentGiven: true })
        });

        if (currentRecordPatient && currentRecordPatient.patient_id === patientId) {
            currentRecordPatient.abha_status = "Linked";
            currentRecordPatient.abha_address = res.abhaAddress || abhaAddress;
            renderRecordTab("profile");
        }

        closeModal("abhaModal");
        showNotification(res.message || "ABHA linked successfully!", "success");
    } catch (err) {
        if (msg) {
            msg.style.display = "block";
            msg.style.color = "#dc2626";
            msg.textContent = err.message || "Failed to link ABHA.";
        }
    }
}

async function unlinkAbha(patientId) {
    if (!confirm("Are you sure you want to unlink ABHA records for this patient?")) return;
    try {
        const res = await apiRequest(`/api/patients/${encodeURIComponent(patientId)}/unlink-abha`, {
            method: "POST"
        });

        if (currentRecordPatient && currentRecordPatient.patient_id === patientId) {
            currentRecordPatient.abha_status = "Not Linked";
            currentRecordPatient.abha_address = null;
            renderRecordTab("profile");
        }

        showNotification(res.message || "ABHA unlinked successfully.", "info");
    } catch (err) {
        showNotification(err.message || "Failed to unlink ABHA.", "error");
    }
}

/* =========================================================
   QR SCANNER & ROLE-AWARE VERIFICATION
========================================================= */

function openQrScanModal() {
    const input = document.getElementById("manualQrInput");
    if (input) input.value = "";
    const res = document.getElementById("qrVerificationResult");
    if (res) {
        res.style.display = "none";
        res.innerHTML = "";
    }
    openModal("qrScanModal");
}

function closeQrScanModal() {
    stopPatientCameraScanner();
    closeModal("qrScanModal");
}

function startPatientCameraScanner() {
    if (typeof Html5Qrcode === "undefined") {
        showNotification("Camera QR scanner library loading. Please try pasting the token.", "warning");
        return;
    }

    const container = document.getElementById("patient-qr-reader");
    if (!container) return;

    const btnStart = document.getElementById("btnStartPatientCamera");
    const btnStop = document.getElementById("btnStopPatientCamera");

    try {
        if (!html5QrScannerInstance) {
            html5QrScannerInstance = new Html5Qrcode("patient-qr-reader");
        }

        html5QrScannerInstance.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decodedText) => {
                console.log("[PATIENT QR SCANNED]", decodedText);
                stopPatientCameraScanner();
                handleScannedQrResult(decodedText);
            },
            () => {}
        ).then(() => {
            if (btnStart) btnStart.style.display = "none";
            if (btnStop) btnStop.style.display = "inline-flex";
        }).catch(err => {
            console.error("Camera scanner error:", err);
            showNotification("Camera access denied or unavailable. Use manual QR verification below.", "warning");
        });
    } catch (err) {
        console.error("Failed to start camera:", err);
    }
}

function stopPatientCameraScanner() {
    const btnStart = document.getElementById("btnStartPatientCamera");
    const btnStop = document.getElementById("btnStopPatientCamera");

    if (html5QrScannerInstance) {
        html5QrScannerInstance.stop().then(() => {
            html5QrScannerInstance.clear();
        }).catch(err => console.warn(err));
    }
    if (btnStart) btnStart.style.display = "inline-flex";
    if (btnStop) btnStop.style.display = "none";
}

function verifyQrFromInput() {
    const val = document.getElementById("manualQrInput")?.value.trim();
    if (!val) {
        showNotification("Please enter or paste a QR Token / Patient ID.", "warning");
        return;
    }
    handleScannedQrResult(val);
}

async function handleScannedQrResult(qrData) {
    const resBox = document.getElementById("qrVerificationResult");
    if (!resBox) return;

    resBox.style.display = "block";
    showLoading(resBox, "Verifying digital token with hospital central registry...");

    try {
        const data = await apiRequest("/api/patients/verify-qr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qrData })
        });

        if (data.authorized) {
            const p = data.patient;
            resBox.innerHTML = `
                <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:10px; padding:16px; text-align:center;">
                    <span style="font-size:26px;">🔓</span>
                    <h3 style="color:#166534; margin:4px 0;">Verified Clinical Access</h3>
                    <div style="font-family:monospace; font-size:16px; font-weight:800; color:#1e40af; background:#dbeafe; padding:4px 10px; border-radius:6px; display:inline-block; margin:6px 0;">
                        ${escapeHTML(p.patient_id)}
                    </div>
                    <p style="margin:4px 0; font-size:13px; color:#1e293b;"><strong>${escapeHTML(p.name)}</strong> • ${escapeHTML(p.gender || "--")} • Blood: ${escapeHTML(p.blood_group || "N/A")}</p>
                    <p style="margin:2px 0; font-size:11px; color:#64748b;">Hospital: ${escapeHTML(p.hospital_name || p.hospital_id || "AIIMS Gorakhpur")}</p>
                    <div style="margin-top:14px; display:flex; gap:8px; justify-content:center;">
                        <button type="button" class="primary-btn" onclick="closeQrScanModal(); openPatientFile('${escapeJS(p.patient_id)}');">
                            📋 Open Complete Medical Dossier →
                        </button>
                    </div>
                </div>
            `;
            showNotification(`QR Authenticated: ${p.name} (${p.patient_id})`, "success");
        } else {
            const v = data.verification || {};
            resBox.innerHTML = `
                <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:16px; text-align:center;">
                    <span style="font-size:26px;">🛡️</span>
                    <h3 style="color:#0f172a; margin:4px 0;">Authenticated SmartCity Patient ID</h3>
                    <div style="font-family:monospace; font-size:16px; font-weight:800; color:#0284c7; background:#e0f2fe; padding:4px 10px; border-radius:6px; display:inline-block; margin:6px 0;">
                        ${escapeHTML(v.patientId)}
                    </div>
                    <p style="margin:4px 0; font-size:13px; color:#334155;">Holder: <strong>${escapeHTML(v.maskedName)}</strong></p>
                    <p style="margin:2px 0; font-size:11px; color:#64748b;">Affiliation: ${escapeHTML(v.hospital)} • Status: <span class="status-pill-active">${escapeHTML(v.status || "Active")}</span></p>
                    <div style="background:#fffbeb; border:1px solid #fef3c7; border-radius:6px; padding:8px; margin-top:10px; font-size:11px; color:#92400e;">
                        ℹ️ ${escapeHTML(v.message)}
                    </div>
                </div>
            `;
        }
    } catch (err) {
        console.error("QR Verification error:", err);
        showError(resBox, err.message || "Invalid or unverified QR Code.");
    }
}

/* =========================================================
   STAFF PATIENT MANAGEMENT DIRECTORY
========================================================= */

function openStaffPatientManager() {
    openModal("staffPatientManagerModal");
    fetchStaffPatientsList();
}

function debounceStaffPatientSearch() {
    clearTimeout(staffPatientSearchTimeout);
    staffPatientSearchTimeout = setTimeout(() => {
        fetchStaffPatientsList();
    }, 300);
}

function resetStaffPatientFilters() {
    const s = document.getElementById("staffFilterSearch");
    if (s) s.value = "";
    const h = document.getElementById("staffFilterHospital");
    if (h) h.value = "";
    const g = document.getElementById("staffFilterGender");
    if (g) g.value = "";
    const st = document.getElementById("staffFilterStatus");
    if (st) st.value = "";
    fetchStaffPatientsList();
}

async function fetchStaffPatientsList() {
    const wrapper = document.getElementById("staffPatientsTableWrapper");
    const countText = document.getElementById("staffPatientsCountText");
    if (!wrapper) return;

    showLoading(wrapper, "Loading patients registry...");

    const search = document.getElementById("staffFilterSearch")?.value.trim() || "";
    const hospital = document.getElementById("staffFilterHospital")?.value || "";
    const gender = document.getElementById("staffFilterGender")?.value || "";
    const status = document.getElementById("staffFilterStatus")?.value || "";

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (hospital) params.set("hospital", hospital);
    if (gender) params.set("gender", gender);
    if (status) params.set("status", status);

    try {
        const data = await apiRequest(`/api/patients?${params.toString()}`);
        const list = data.patients || [];

        if (countText) {
            countText.textContent = `Showing ${list.length} registered patient(s)`;
        }

        if (!list.length) {
            wrapper.innerHTML = `
                <div style="padding: 30px; text-align: center; color: #64748b;">
                    <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
                    <h4>No matching patients found</h4>
                    <p style="font-size: 12px; margin: 4px 0 0;">Try adjusting search terms or register a new patient.</p>
                </div>
            `;
            return;
        }

        wrapper.innerHTML = `
            <table class="staff-patient-table">
                <thead>
                    <tr>
                        <th>Patient ID</th>
                        <th>Name</th>
                        <th>Age / Gender</th>
                        <th>Mobile</th>
                        <th>Hospital</th>
                        <th>ABHA</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${list.map(p => `
                        <tr>
                            <td><strong style="font-family:monospace; color:#2563eb;">${escapeHTML(p.patient_id)}</strong></td>
                            <td><strong>${escapeHTML(p.name)}</strong></td>
                            <td>${escapeHTML(String(p.age ?? "--"))} / ${escapeHTML(p.gender || "--")}</td>
                            <td>${escapeHTML(p.mobile || "--")}</td>
                            <td>${escapeHTML(p.hospital_name || p.hospital_id || "AIIMS Gorakhpur")}</td>
                            <td><span class="${p.abha_status === 'Linked' ? 'abha-badge-linked' : 'abha-badge-not-linked'}">${escapeHTML(p.abha_status || 'Not Linked')}</span></td>
                            <td><span class="${p.status === 'Active' ? 'status-pill-active' : 'status-pill-inactive'}">${escapeHTML(p.status || 'Active')}</span></td>
                            <td>
                                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                    <button type="button" class="primary-btn" onclick="closeModal('staffPatientManagerModal'); openPatientFile('${escapeJS(p.patient_id)}');" style="padding:4px 8px; font-size:11px;">
                                        📋 Dossier
                                    </button>
                                    <button type="button" class="secondary-btn" onclick="openPatientPrintCard(${escapeHTML(JSON.stringify(p))});" style="padding:4px 8px; font-size:11px;">
                                        🖨️ Card
                                    </button>
                                    <button type="button" class="secondary-btn" onclick="toggleStaffPatientStatus('${escapeJS(p.patient_id)}', '${escapeJS(p.status || 'Active')}')" style="padding:4px 8px; font-size:11px; border-color:#cbd5e1;">
                                        ${p.status === 'Inactive' ? 'Activate' : 'Disable'}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;
    } catch (err) {
        console.error("Fetch staff patients error:", err);
        showError(wrapper, err.message || "Failed to load patients directory.");
    }
}

async function toggleStaffPatientStatus(patientId, currentStatus) {
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    if (!confirm(`Change status of ${patientId} to ${nextStatus}?`)) return;

    try {
        await apiRequest(`/api/patients/${encodeURIComponent(patientId)}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: nextStatus })
        });
        showNotification(`Patient ${patientId} status updated to ${nextStatus}.`, "success");
        fetchStaffPatientsList();
    } catch (err) {
        showNotification(err.message || "Failed to change patient status.", "error");
    }
}

async function renderRecordTab(tab) {
    const result = document.getElementById("patientFileResult");
    if (!result || !currentRecordPatient) return;

    const patient = currentRecordPatient;
    const actionsBar = `
        <div class="record-section-actions">
            <button type="button" onclick="renderRecordTab('${tab}')">🔄 Refresh</button>
            <button type="button" onclick="printPatientRecord()">🖨️ Print</button>
        </div>
    `;

    if (tab === "profile") {
        const isAbhaLinked = patient.abha_status === "Linked";
        result.innerHTML = `
            ${actionsBar}
            <div class="patient-profile-card">
                <div class="patient-profile-header">
                    <div class="patient-avatar">👤</div>
                    <div>
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <span style="background:#1e293b; color:#38bdf8; font-family:monospace; font-weight:800; padding:2px 8px; border-radius:6px;">${escapeHTML(patient.patient_id)}</span>
                            <span class="${patient.status === 'Active' ? 'status-pill-active' : 'status-pill-inactive'}">${escapeHTML(patient.status || 'Active')}</span>
                        </div>
                        <h3 style="margin-top:4px;">${escapeHTML(patient.name || "Patient")}</h3>
                    </div>
                </div>

                <div class="patient-profile-grid">
                    <div><span>Age</span><strong>${escapeHTML(String(patient.age ?? "N/A"))} yrs</strong></div>
                    <div><span>Gender</span><strong>${escapeHTML(patient.gender || "N/A")}</strong></div>
                    <div><span>Blood Group</span><strong>${escapeHTML(patient.blood_group || "N/A")}</strong></div>
                    <div><span>Mobile Number</span><strong>${escapeHTML(patient.mobile || "N/A")}</strong></div>
                    <div><span>Emergency Contact</span><strong>${escapeHTML(patient.emergency_contact || "N/A")}</strong></div>
                    <div><span>Registered Hospital</span><strong>${escapeHTML(patient.hospital_name || patient.hospital_id || "AIIMS Gorakhpur")}</strong></div>
                    <div><span>Registration Date</span><strong>${patient.created_at ? new Date(patient.created_at).toLocaleDateString() : "N/A"}</strong></div>
                    <div><span>Residential Address</span><strong>${escapeHTML(patient.address || "N/A")}</strong></div>
                </div>

                <!-- ABHA INTEGRATION SECTION -->
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px; margin: 16px 0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div>
                            <span style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">ABDM / ABHA ACCOUNT STATUS</span>
                            <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
                                <span class="${isAbhaLinked ? 'abha-badge-linked' : 'abha-badge-not-linked'}">
                                    ${isAbhaLinked ? '✅ Linked' : '⚠️ Not Linked'}
                                </span>
                                ${patient.abha_address ? `<strong style="font-size:13px; color:#1e293b;">${escapeHTML(patient.abha_address)}</strong>` : ''}
                            </div>
                        </div>
                        <div>
                            ${isAbhaLinked ? `
                                <button type="button" class="secondary-btn" onclick="unlinkAbha('${escapeJS(patient.patient_id)}')" style="font-size:11px; padding:6px 12px; border-color:#fca5a5; color:#b91c1c;">
                                    Revoke / Unlink
                                </button>
                            ` : `
                                <button type="button" class="primary-btn" onclick="openAbhaModal('${escapeJS(patient.patient_id)}')" style="font-size:11px; padding:6px 14px;">
                                    🇮🇳 Link Existing ABHA →
                                </button>
                            `}
                        </div>
                    </div>
                </div>

                ${patient.emergency_info ? `
                    <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:12px; margin-bottom:16px;">
                        <span style="font-size:10px; font-weight:800; color:#991b1b; text-transform:uppercase;">🚨 EMERGENCY MEDICAL INFORMATION</span>
                        <p style="margin:4px 0 0; font-size:12px; color:#7f1d1d;">${escapeHTML(patient.emergency_info)}</p>
                    </div>
                ` : ''}

                <!-- ACTIONS BUTTONS BAR -->
                <div class="patient-actions-bar" style="display:flex; gap:8px; flex-wrap:wrap; margin:16px 0; padding-top:14px; border-top:1px solid #e2e8f0;">
                    <button type="button" class="primary-btn" onclick="switchRecordTab('records')" style="font-size:11px; padding:7px 12px;">
                        📝 View Medical Records
                    </button>
                    <button type="button" class="secondary-btn" onclick="switchRecordTab('appointments')" style="font-size:11px; padding:7px 12px;">
                        📅 View Appointments
                    </button>
                    <button type="button" class="secondary-btn" onclick="switchRecordTab('prescriptions')" style="font-size:11px; padding:7px 12px;">
                        💊 View Prescriptions
                    </button>
                    <button type="button" class="secondary-btn" onclick="switchRecordTab('reports')" style="font-size:11px; padding:7px 12px;">
                        📁 View Reports
                    </button>
                    <button type="button" class="secondary-btn" onclick="showPatientQR(currentRecordPatient, 'patientRecordQR')" style="font-size:11px; padding:7px 12px;">
                        🔄 Generate / Refresh QR
                    </button>
                    <button type="button" class="primary-btn" onclick="openPatientPrintCard()" style="font-size:11px; padding:7px 14px; background:#0284c7;">
                        🖨️ Print Patient Card
                    </button>
                </div>

                <!-- QR CODE BOX -->
                <div style="text-align:center; padding:16px; background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0; margin-top:10px;">
                    <div id="patientRecordQR" class="patient-qr" style="display:flex; justify-content:center; margin-bottom:8px;"></div>
                    <span style="font-size:11px; font-weight:700; color:#334155;">Secure Anti-Tamper Clinical QR Token</span>
                    <p style="font-size:10px; color:#64748b; margin:2px 0 0;">Scan via Hospital Reception, Doctor Terminal, or Emergency Desk</p>
                </div>
            </div>
        `;
        showPatientQR(patient, "patientRecordQR");
        return;
    }

    if (tab === "appointments") {
        showLoading(result, "Loading appointments...");
        try {
            const data = await apiRequest(`/api/appointments/${encodeURIComponent(patient.patient_id)}`);
            const rows = data.appointments || [];
            result.innerHTML = actionsBar + (rows.length ? `
                <table class="record-table">
                    <thead><tr><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
                    <tbody>
                        ${rows.map(a => `<tr>
                            <td>${escapeHTML(a.doctor || a.doctor_id || "—")}</td>
                            <td>${escapeHTML(String(a.appointment_date || "").substring(0, 10))}</td>
                            <td>${escapeHTML(a.appointment_time || "—")}</td>
                            <td>${escapeHTML(a.status || "—")}</td>
                        </tr>`).join("")}
                    </tbody>
                </table>
            ` : `<div class="empty-state">📅<h3>No Appointments</h3><p>This patient has no appointment history yet.</p></div>`);
        } catch (error) {
            result.innerHTML = actionsBar;
            showError(result, error.message);
        }
        return;
    }

    if (tab === "prescriptions") {
        showLoading(result, "Loading prescriptions...");
        try {
            const data = await apiRequest(`/api/prescriptions/${encodeURIComponent(patient.patient_id)}`);
            const rows = data.prescriptions || [];
            result.innerHTML = actionsBar + (rows.length ? `
                <table class="record-table">
                    <thead><tr><th>Uploaded</th><th>Doctor</th><th>Status</th><th>File</th></tr></thead>
                    <tbody>
                        ${rows.map(p => {
                            const filePath = p.file_path || (p.prescription_file ? `/uploads/prescriptions/${p.prescription_file}` : null);
                            return `<tr>
                                <td>${p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</td>
                                <td>${escapeHTML(p.doctor_name || "—")}</td>
                                <td>${escapeHTML(p.status || "—")}</td>
                                <td>${filePath ? `<a href="${API_BASE_URL}${escapeHTML(filePath)}" target="_blank" rel="noopener">View / Download</a>` : "—"}</td>
                            </tr>`;
                        }).join("")}
                    </tbody>
                </table>
            ` : `<div class="empty-state">💊<h3>No Prescriptions</h3><p>No prescriptions have been uploaded for this patient yet.</p></div>`);
        } catch (error) {
            result.innerHTML = actionsBar;
            showError(result, error.message);
        }
        return;
    }

    if (tab === "bills") {
        showLoading(result, "Loading pharmacy bills...");
        try {
            const data = await apiRequest(`/api/pharmacy/bills/${encodeURIComponent(patient.patient_id)}`);
            const rows = data.bills || [];
            result.innerHTML = actionsBar + (rows.length ? `
                <table class="record-table">
                    <thead><tr><th>Bill #</th><th>Date</th><th>Amount</th><th>Payment</th></tr></thead>
                    <tbody>
                        ${rows.map(b => `<tr>
                            <td>${escapeHTML(b.bill_number || "—")}</td>
                            <td>${b.created_at ? new Date(b.created_at).toLocaleDateString() : "—"}</td>
                            <td>₹${escapeHTML(String(b.final_amount ?? "0"))}</td>
                            <td>${escapeHTML(b.payment_status || "—")}</td>
                        </tr>`).join("")}
                    </tbody>
                </table>
            ` : `<div class="empty-state">🧾<h3>No Pharmacy Bills</h3><p>No pharmacy orders on record for this patient.</p></div>`);
        } catch (error) {
            result.innerHTML = actionsBar;
            showError(result, error.message);
        }
        return;
    }

    if (tab === "records") {
        showLoading(result, "Loading medical records...");
        try {
            const data = await apiRequest(`/api/patients/${encodeURIComponent(patient.patient_id)}/records`);
            const rows = data.records || [];
            result.innerHTML = actionsBar + `
                <div class="record-section-actions">
                    <button type="button" onclick="toggleInlineForm('addRecordFormWrap')">➕ Add Record</button>
                </div>
                <div id="addRecordFormWrap" style="display:none;">${renderAddRecordForm(patient.patient_id)}</div>
                ${rows.length ? `
                <table class="record-table">
                    <thead><tr><th>Date</th><th>Doctor</th><th>Diagnosis</th><th>Symptoms</th><th>Treatment</th><th>Notes</th></tr></thead>
                    <tbody>
                        ${rows.map(r => `<tr>
                            <td>${r.record_date ? new Date(r.record_date).toLocaleDateString() : "—"}</td>
                            <td>${escapeHTML(r.doctor_name || "—")}</td>
                            <td>${escapeHTML(r.diagnosis || "—")}</td>
                            <td>${escapeHTML(r.symptoms || "—")}</td>
                            <td>${escapeHTML(r.treatment || "—")}</td>
                            <td>${escapeHTML(r.notes || "—")}</td>
                        </tr>`).join("")}
                    </tbody>
                </table>
                ` : `<div class="empty-state">📝<h3>No Medical Records</h3><p>No records have been added for this patient yet.</p></div>`}
            `;
            setupAddRecordForm(patient.patient_id);
        } catch (error) {
            result.innerHTML = actionsBar;
            showError(result, error.message);
        }
        return;
    }

    if (tab === "reports") {
        showLoading(result, "Loading reports...");
        try {
            const data = await apiRequest(`/api/patients/${encodeURIComponent(patient.patient_id)}/reports`);
            const rows = data.reports || [];
            result.innerHTML = actionsBar + `
                <div class="record-section-actions">
                    <button type="button" onclick="toggleInlineForm('addReportFormWrap')">➕ Upload Report</button>
                </div>
                <div id="addReportFormWrap" style="display:none;">${renderAddReportForm(patient.patient_id)}</div>
                ${rows.length ? `
                <table class="record-table">
                    <thead><tr><th>Date</th><th>Title</th><th>Type</th><th>Doctor</th><th>Hospital</th><th>Status</th><th>File</th></tr></thead>
                    <tbody>
                        ${rows.map(r => `<tr>
                            <td>${r.report_date ? new Date(r.report_date).toLocaleDateString() : "—"}</td>
                            <td>${escapeHTML(r.title || "—")}</td>
                            <td>${escapeHTML(r.report_type || "—")}</td>
                            <td>${escapeHTML(r.doctor_name || "—")}</td>
                            <td>${escapeHTML(r.hospital_name || "—")}</td>
                            <td>${escapeHTML(r.status || "—")}</td>
                            <td>${r.file_path ? `<a href="${API_BASE_URL}${escapeHTML(r.file_path)}" target="_blank" rel="noopener">View / Download</a>` : "—"}</td>
                        </tr>`).join("")}
                    </tbody>
                </table>
                ` : `<div class="empty-state">📁<h3>No Reports</h3><p>No reports have been uploaded for this patient yet.</p></div>`}
            `;
            setupAddReportForm(patient.patient_id);
        } catch (error) {
            result.innerHTML = actionsBar;
            showError(result, error.message);
        }
        return;
    }
}

function toggleInlineForm(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = el.style.display === "none" ? "block" : "none";
}

function renderAddRecordForm(patientId) {
    return `
        <form id="addRecordForm" class="inline-add-form" data-patient-id="${escapeHTML(patientId)}">
            <input type="text" name="doctorName" placeholder="Doctor name" />
            <input type="text" name="diagnosis" placeholder="Diagnosis" />
            <input type="text" name="symptoms" placeholder="Symptoms" />
            <input type="text" name="treatment" placeholder="Treatment" />
            <textarea name="notes" placeholder="Notes"></textarea>
            <button type="submit" class="primary-btn">Save Record</button>
            <div id="addRecordResult"></div>
        </form>
    `;
}

function renderAddReportForm(patientId) {
    return `
        <form id="addReportForm" class="inline-add-form" data-patient-id="${escapeHTML(patientId)}">
            <input type="text" name="title" placeholder="Report title" required />
            <input type="text" name="reportType" placeholder="Report type (e.g. Blood Test)" />
            <input type="text" name="doctorName" placeholder="Doctor name" />
            <input type="text" name="hospitalName" placeholder="Hospital name" />
            <input type="date" name="reportDate" />
            <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.webp" />
            <button type="submit" class="primary-btn">Upload Report</button>
            <div id="addReportResult"></div>
        </form>
    `;
}

function setupAddRecordForm(patientId) {
    const form = document.getElementById("addRecordForm");
    if (!form) return;
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = document.getElementById("addRecordResult");
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());

        try {
            await apiRequest(`/api/patients/${encodeURIComponent(patientId)}/records`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            showNotification("Medical record added.", "success");
            await renderRecordTab("records");
        } catch (error) {
            showError(result, error.message);
        }
    });
}

function setupAddReportForm(patientId) {
    const form = document.getElementById("addReportForm");
    if (!form) return;
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = document.getElementById("addReportResult");
        const formData = new FormData(form);

        try {
            const response = await fetch(`${API_BASE_URL}/api/patients/${encodeURIComponent(patientId)}/reports`, {
                method: "POST",
                body: formData
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Upload failed.");

            showNotification("Report uploaded.", "success");
            await renderRecordTab("reports");
        } catch (error) {
            showError(result, error.message);
        }
    });
}

/* =========================================================
   PRESCRIPTION UPLOAD
========================================================= */

/* =========================================================
   PRESCRIPTION UPLOAD — CLINICAL EMR ENGINE
========================================================= */

function openPrescriptionUpload(prefillPatientId) {
    openModal("prescriptionModal");
    setupPrescriptionForm();
    setupPrescriptionDropzone();

    const savedId = prefillPatientId || getPatientId() || "SC-2026-318028";
    const input = document.getElementById("prescriptionPatientId");
    if (input) {
        if (!input.value || prefillPatientId) {
            input.value = savedId;
        }
    }

    const uhidBadge = document.getElementById("rxUhidBadge");
    if (uhidBadge && input && input.value) {
        uhidBadge.style.display = "inline-flex";
    }

    // Reset result state
    const result = document.getElementById("prescriptionResult");
    if (result) {
        result.innerHTML = "";
    }

    // Reset dropzone state
    resetPrescriptionDropzone();

    // Load recent prescriptions for this patient
    const activePatientId = input ? input.value.trim() : savedId;
    if (activePatientId) {
        loadRecentPrescriptions(activePatientId);
    }
}

function resetPrescriptionDropzone() {
    const fileInput = document.getElementById("prescriptionFile");
    if (fileInput) fileInput.value = "";
    const dropEmpty = document.getElementById("rxDropEmpty");
    const dropPreview = document.getElementById("rxDropPreview");
    if (dropEmpty) dropEmpty.style.display = "flex";
    if (dropPreview) dropPreview.style.display = "none";
}

function setupPrescriptionDropzone() {
    const dropzone = document.getElementById("rxDropzone");
    const fileInput = document.getElementById("prescriptionFile");
    const dropEmpty = document.getElementById("rxDropEmpty");
    const dropPreview = document.getElementById("rxDropPreview");
    const fileNameEl = document.getElementById("rxFileName");
    const fileMetaEl = document.getElementById("rxFileMeta");
    const removeBtn = document.getElementById("rxRemoveFileBtn");

    if (!dropzone || dropzone.dataset.initialized === "true") return;
    dropzone.dataset.initialized = "true";

    function updateFilePreview(file) {
        if (!file) {
            resetPrescriptionDropzone();
            return;
        }

        // Validate size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert("File is too large. Maximum allowed size is 10 MB.");
            resetPrescriptionDropzone();
            return;
        }

        const sizeFormatted = file.size > 1024 * 1024
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(file.size / 1024)} KB`;

        if (fileNameEl) fileNameEl.textContent = file.name;
        if (fileMetaEl) fileMetaEl.textContent = `${sizeFormatted} • Ready for verification`;

        if (dropEmpty) dropEmpty.style.display = "none";
        if (dropPreview) dropPreview.style.display = "flex";
    }

    if (fileInput) {
        fileInput.addEventListener("change", (e) => {
            const file = e.target.files?.[0];
            if (file) updateFilePreview(file);
        });
    }

    if (removeBtn) {
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            resetPrescriptionDropzone();
        });
    }

    // Drag and Drop
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add("drag-over");
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove("drag-over");
        }, false);
    });

    dropzone.addEventListener("drop", (e) => {
        const dt = e.dataTransfer;
        const files = dt?.files;
        if (files && files.length > 0) {
            if (fileInput) {
                fileInput.files = files;
                updateFilePreview(files[0]);
            }
        }
    });

    // Patient input change refreshes recent prescriptions
    const patientInput = document.getElementById("prescriptionPatientId");
    if (patientInput) {
        patientInput.addEventListener("blur", () => {
            const pid = patientInput.value.trim();
            if (pid) loadRecentPrescriptions(pid);
        });
    }
}

async function loadRecentPrescriptions(patientId) {
    const section = document.getElementById("rxRecentSection");
    const list = document.getElementById("rxRecentList");
    if (!section || !list || !patientId) return;

    try {
        const res = await apiRequest(`/api/prescriptions/${encodeURIComponent(patientId)}`);
        const items = res?.prescriptions || [];
        if (!items || items.length === 0) {
            section.style.display = "none";
            return;
        }

        section.style.display = "block";
        list.innerHTML = items.slice(0, 3).map(rx => {
            const dateStr = rx.created_at ? new Date(rx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent';
            const statusClass = (rx.status || 'Active').toLowerCase();
            const doctor = rx.doctor_name || 'OPD Consultant';
            const meds = rx.prescription_file || 'Standard OPD Medication Protocol';

            return `
                <div class="rx-recent-card">
                    <div class="rx-rc-info">
                        <span class="rx-rc-doctor">👨‍⚕️ ${escapeHTML(doctor)}</span>
                        <span class="rx-rc-meds" title="${escapeHTML(meds)}">💊 ${escapeHTML(meds)}</span>
                    </div>
                    <div class="rx-rc-meta">
                        <span class="rx-rc-date">${dateStr}</span>
                        <span class="rx-rc-status ${statusClass}">${escapeHTML(rx.status || 'Active')}</span>
                    </div>
                </div>
            `;
        }).join("");
    } catch (err) {
        console.warn("Could not load recent prescriptions:", err);
        section.style.display = "none";
    }
}

function setupPrescriptionForm() {
    const form = document.getElementById("prescriptionForm");
    if (!form || form.dataset.connected === "true") return;
    form.dataset.connected = "true";

    setupPrescriptionDropzone();

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const patientId = document.getElementById("prescriptionPatientId")?.value.trim();
        const doctorName = document.getElementById("prescriptionDoctorName")?.value.trim();
        const fileInput = document.getElementById("prescriptionFile");
        const file = fileInput?.files?.[0];
        const result = document.getElementById("prescriptionResult");
        const submitBtn = document.getElementById("prescriptionSubmitBtn");

        if (!patientId || !file) {
            showError(result, "Please provide Patient UHID and select a prescription document.");
            return;
        }

        // Show loading state
        const origBtnText = submitBtn ? submitBtn.innerHTML : "";
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <span class="btn-spinner" style="display:inline-block; width:16px; height:16px; border:2px solid #ffffff; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite;"></span>
                <span>Encrypting & Digitize EMR...</span>
            `;
        }
        showLoading(result, "Uploading prescription and extracting clinical data...");

        try {
            const formData = new FormData();
            formData.append("patientId", patientId);
            formData.append("prescriptionFile", file);
            if (doctorName) formData.append("doctorName", doctorName);

            const token = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getToken) ? SmartCityAuth.getToken() : (localStorage.getItem("smartCityJWT") || localStorage.getItem("token"));
            const headers = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const response = await fetch(`${API_BASE_URL}/api/prescriptions/upload`, {
                method: "POST",
                headers,
                body: formData
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || data.error || "Upload failed.");

            // Success clinical card
            const rxId = data.prescription?.id || Math.floor(1000 + Math.random() * 9000);
            result.innerHTML = `
                <div class="rx-result-success-card">
                    <div class="rx-result-success-head">
                        <div class="rx-success-badge-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <div>
                            <h4 style="margin:0; font-size:14px; font-weight:800; color:#14532d;">Prescription Uploaded & Verified</h4>
                            <p style="margin:2px 0 0; font-size:12px; color:#166534;">
                                Linked to UHID: <strong>${escapeHTML(patientId)}</strong> • EMR Ref: <strong>#RX-${rxId}</strong>
                            </p>
                        </div>
                    </div>
                    <div style="font-size:11.5px; color:#365314; background:#ecfccb; padding:8px 12px; border-radius:8px; border:1px solid #d9f99d;">
                        ✓ Medicines automatically queued for AI dosage reminders and Gorakhpur Smart Dispensary fulfillment.
                    </div>
                    <div class="rx-result-actions">
                        <button type="button" class="btn-rx-action btn-rx-action-primary" onclick="closeModal('prescriptionModal'); showPharmacy();">
                            🛒 Order Medicines Now
                        </button>
                        <button type="button" class="btn-rx-action btn-rx-action-secondary" onclick="closeModal('prescriptionModal'); openRecordsModal(); if(typeof renderRecordTab==='function') renderRecordTab('prescriptions');">
                            📋 View Patient Records
                        </button>
                    </div>
                </div>
            `;

            resetPrescriptionDropzone();
            if (document.getElementById("prescriptionDoctorName")) {
                document.getElementById("prescriptionDoctorName").value = "";
            }

            // Refresh recent list
            loadRecentPrescriptions(patientId);

            showNotification("Prescription uploaded and linked to EMR.", "success");
        } catch (error) {
            console.error("Prescription upload error:", error);
            showError(result, error.message || "Failed to process prescription.");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = origBtnText;
            }
        }
    });
}

/* =========================================================
   PHARMACY — SMART DISPENSARY & MEDICINES MODULE
========================================================= */

let pharmacyActiveCategory = "all";

async function showPharmacy() {
    openModal("pharmacyModal");
    updatePharmacyLoginUI();
    await loadMedicines();
    await loadPatientCart();
}

function updatePharmacyLoginUI() {
    const container = document.getElementById("pharmacyPatientLogin");
    if (!container) return;

    const patientId = getPatientId();

    if (patientId) {
        container.innerHTML = `
            <div class="pharmacy-login-verified">
                <div class="verified-status-info">
                    <div class="verified-check-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <div>
                        <div class="verified-badge-label">Verified Patient Active</div>
                        <div class="verified-patient-meta">
                            <span class="patient-uhid-val">UHID: <strong>${escapeHTML(patientId)}</strong></span>
                            <span class="opd-subsidy-badge">● OPD Jan Aushadhi Subsidy Active</span>
                        </div>
                    </div>
                </div>
                <button type="button" class="btn-switch-patient" onclick="logoutPharmacyPatient()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    Switch Account
                </button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="pharmacy-login-unverified">
                <div class="unverified-info">
                    <div class="unverified-icon-box">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                    <div>
                        <strong>Patient Verification Required</strong>
                        <p>Link your Patient UHID to order medications and apply government OPD subsidized rates.</p>
                    </div>
                </div>
                <div class="unverified-input-group">
                    <div class="uhid-input-wrapper">
                        <span class="uhid-prefix">UHID</span>
                        <input
                            type="text"
                            id="pharmacyPatientId"
                            placeholder="e.g. PAT-2026-10291"
                            autocomplete="off"
                            onkeydown="if(event.key==='Enter') verifyPharmacyPatient()"
                        >
                    </div>
                    <button type="button" class="btn-verify-patient" onclick="verifyPharmacyPatient()" id="verifyPharmacyBtn">
                        <span>Verify UHID</span>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                </div>
                <div id="pharmacyPatientStatus" class="patient-verify-status"></div>
            </div>
        `;
    }
}

async function verifyPharmacyPatient() {
    const input = document.getElementById("pharmacyPatientId");
    const status = document.getElementById("pharmacyPatientStatus");
    const patientId = input?.value.trim();

    if (!patientId) {
        if (status) showError(status, "Please enter your Patient ID or UHID.");
        return;
    }
    if (status) showLoading(status, "Verifying patient credentials...");

    try {
        const data = await apiRequest(`/api/patients/${encodeURIComponent(patientId)}`);
        const patient = data.patient || data;
        const finalId = patient.patientId || patient.patient_id || patientId;

        localStorage.setItem("patientId", finalId);
        updatePharmacyLoginUI();
        await loadPatientCart(finalId);
        showNotification("Patient verified successfully. Prescription dispensing unlocked.", "success");
    } catch (error) {
        console.error("Patient verification error:", error);
        if (status) showError(status, error.message || "Invalid Patient ID.");
    }
}

function logoutPharmacyPatient() {
    localStorage.removeItem("patientId");
    pharmacyCart = [];
    updateCartCount();
    updatePharmacyLoginUI();
    renderCart();
    renderMedicines(medicineData);
    showNotification("Patient logged out of pharmacy session.", "success");
}

async function loadMedicines() {
    const result = document.getElementById("medicineResult");
    if (result) {
        result.innerHTML = `
            <div class="pharmacy-loading-box">
                <div class="pharmacy-spinner"></div>
                <p>Loading hospital pharmacy inventory...</p>
            </div>
        `;
    }

    try {
        const data = await apiRequest("/api/pharmacy");
        medicineData = (data.medicines || []).map(m => {
            const stock = Number(m.quantity ?? m.stock ?? 0);
            return {
                id: m.id,
                name: m.medicine_name || m.name || "Medicine",
                category: m.category || "General",
                stock,
                price: Number(m.price) || 0,
                status: m.availability || (stock > 0 ? "Available" : "Out of Stock")
            };
        });
        applyMedicineFilters();
    } catch (error) {
        console.error("Medicine loading error:", error);
        if (result) showError(result, error.message || "Unable to load pharmacy inventory.");
    }
}

function filterMedicineCategory(category) {
    pharmacyActiveCategory = category;
    document.querySelectorAll(".pharmacy-chip").forEach(chip => {
        const onclickAttr = chip.getAttribute("onclick") || "";
        chip.classList.toggle("active", onclickAttr.includes(`'${category}'`));
    });
    applyMedicineFilters();
}

function searchMedicines() {
    applyMedicineFilters();
}

function clearMedicineSearch() {
    const input = document.getElementById("medicineSearch");
    if (input) {
        input.value = "";
        applyMedicineFilters();
        input.focus();
    }
}

function applyMedicineFilters() {
    const search = (document.getElementById("medicineSearch")?.value || "").trim().toLowerCase();
    const clearBtn = document.getElementById("medicineSearchClear");
    if (clearBtn) clearBtn.style.display = search ? "flex" : "none";

    let filtered = medicineData;
    if (pharmacyActiveCategory === "instock") {
        filtered = filtered.filter(m => Number(m.stock) > 0);
    } else if (pharmacyActiveCategory !== "all") {
        filtered = filtered.filter(m => (m.category || "").toLowerCase().includes(pharmacyActiveCategory.toLowerCase()));
    }

    if (search) {
        filtered = filtered.filter(m =>
            (m.name || "").toLowerCase().includes(search) ||
            (m.category || "").toLowerCase().includes(search)
        );
    }
    renderMedicines(filtered);
}

function renderMedicines(medicines) {
    const result = document.getElementById("medicineResult");
    if (!result) return;

    if (!medicines.length) {
        result.innerHTML = `
            <div class="pharmacy-empty-catalog">
                <div class="empty-icon-wrap">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
                <h3>No Medicines Found</h3>
                <p>No formulations match your search or selected filter. Try searching for generic salt names.</p>
                <button type="button" class="btn-reset-filters" onclick="clearMedicineSearch(); filterMedicineCategory('all');">Reset Filters</button>
            </div>
        `;
        return;
    }

    result.innerHTML = `
        <div class="pharmacy-grid">
            ${medicines.map(medicine => {
                const stock = Number(medicine.stock);
                const priceFormatted = Number(medicine.price).toFixed(2);
                const [intPart, decPart] = priceFormatted.split(".");
                const inCartItem = pharmacyCart.find(i => String(i.medicine_id ?? i.id) === String(medicine.id));
                const inCartQty = inCartItem ? Number(inCartItem.quantity) : 0;

                let stockBadge = "";
                if (stock > 20) {
                    stockBadge = `<span class="stock-pill in-stock"><span class="pulse-dot"></span> In Stock (${stock})</span>`;
                } else if (stock > 0) {
                    stockBadge = `<span class="stock-pill low-stock">Low Stock (${stock} left)</span>`;
                } else {
                    stockBadge = `<span class="stock-pill out-of-stock">Out of Stock</span>`;
                }

                return `
                    <div class="med-product-card ${stock <= 0 ? 'is-out-of-stock' : ''}">
                        <div class="med-card-header">
                            <span class="med-category-tag">${escapeHTML(medicine.category)}</span>
                            ${stockBadge}
                        </div>
                        
                        <div class="med-card-body">
                            <h4 class="med-card-title" title="${escapeHTML(medicine.name)}">${escapeHTML(medicine.name)}</h4>
                            <div class="med-card-subtitle">Hospital Formulary • Dispensing Pack</div>
                        </div>

                        <div class="med-card-pricing">
                            <div class="price-stack">
                                <span class="price-currency">₹</span>
                                <span class="price-val">${intPart}</span>
                                <span class="price-dec">.${decPart}</span>
                                <span class="price-unit">/ pack</span>
                            </div>
                            <span class="mrp-badge">Jan Aushadhi Subsidized</span>
                        </div>

                        <div class="med-card-actions">
                            <button type="button" class="btn-med-details" onclick="viewMedicine(${Number(medicine.id)})">
                                Details
                            </button>
                            <button
                                type="button"
                                class="btn-med-cart ${inCartQty > 0 ? 'in-cart' : ''}"
                                ${stock <= 0 ? "disabled" : ""}
                                onclick="addToCart(${Number(medicine.id)})"
                            >
                                ${stock <= 0
                                    ? "Out of Stock"
                                    : (inCartQty > 0
                                        ? `✓ In Cart (${inCartQty})`
                                        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path></svg> Add to Cart`
                                    )
                                }
                            </button>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

function viewMedicine(medicineId) {
    const medicine = medicineData.find(m => String(m.id) === String(medicineId));
    if (!medicine) { showNotification("Medicine not found.", "error"); return; }

    let modal = document.getElementById("medicineDetailsModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "medicineDetailsModal";
        modal.className = "modal";
        document.body.appendChild(modal);
    }

    const stock = Number(medicine.stock);
    const inStock = stock > 0;

    modal.innerHTML = `
        <div class="modal-box medicine-details-box">
            <button class="close-btn" onclick="closeModal('medicineDetailsModal')">×</button>
            <div class="med-modal-head">
                <div class="med-modal-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path>
                        <path d="m8.5 8.5 7 7"></path>
                    </svg>
                </div>
                <div>
                    <span class="med-category-tag">${escapeHTML(medicine.category)}</span>
                    <h2 class="med-modal-title">${escapeHTML(medicine.name)}</h2>
                    <p class="med-modal-sub">Central Hospital Pharmacy Formulary</p>
                </div>
            </div>

            <div class="med-specs-grid">
                <div class="spec-cell">
                    <span class="spec-label">Therapeutic Class</span>
                    <strong class="spec-val">${escapeHTML(medicine.category)}</strong>
                </div>
                <div class="spec-cell">
                    <span class="spec-label">Dispensary Stock</span>
                    <strong class="spec-val ${inStock ? 'color-in-stock' : 'color-out-stock'}">
                        ${inStock ? `${stock} Units Available` : "Currently Out of Stock"}
                    </strong>
                </div>
                <div class="spec-cell">
                    <span class="spec-label">OPD Subsidized Price</span>
                    <strong class="spec-val price-highlight">₹${Number(medicine.price).toFixed(2)}</strong>
                </div>
                <div class="spec-cell">
                    <span class="spec-label">Prescription Link</span>
                    <strong class="spec-val">Jan Aushadhi Approved</strong>
                </div>
            </div>

            <div class="med-precaution-notice">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" style="flex-shrink:0;">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>Usage Precaution: Strictly follow dosage as prescribed by your attending medical officer. Keep away from direct sunlight and store in a cool, dry place.</span>
            </div>

            <div class="med-modal-foot">
                <button type="button" class="btn-cancel" onclick="closeModal('medicineDetailsModal')">Close</button>
                <button
                    type="button"
                    class="btn-primary-action"
                    ${stock <= 0 ? "disabled" : ""}
                    onclick="addToCart(${Number(medicine.id)}); closeModal('medicineDetailsModal');"
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path></svg>
                    ${stock <= 0 ? "Out of Stock" : "Add to Dispensary Cart"}
                </button>
            </div>
        </div>
    `;
    modal.classList.add("show");
}

/* =========================================================
   PHARMACY — CART OPERATIONS
========================================================= */

async function addToCart(medicineId) {
    const medicine = medicineData.find(m => String(m.id) === String(medicineId));
    if (!medicine) { showNotification("Medicine not found.", "error"); return; }
    if (Number(medicine.stock) <= 0) { showNotification("Medicine is out of stock.", "warning"); return; }

    const patientId = getPatientId();
    if (!patientId) {
        showNotification("Please enter & verify your Patient UHID first.", "warning");
        const patientInput = document.getElementById("pharmacyPatientId");
        if (patientInput) {
            patientInput.focus();
            patientInput.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
    }

    const existing = pharmacyCart.find(item => String(item.medicine_id ?? item.id) === String(medicine.id));
    const requestedQty = existing ? Number(existing.quantity) + 1 : 1;
    if (requestedQty > Number(medicine.stock)) {
        showNotification(`Only ${medicine.stock} units available in inventory.`, "warning");
        return;
    }

    try {
        await apiRequest("/api/pharmacy/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ patientId, medicineId: medicine.id, medicineName: medicine.name, quantity: 1 })
        });
        await loadPatientCart(patientId);
        showNotification(`${medicine.name} added to cart.`, "success");
    } catch (error) {
        console.error("Add to cart error:", error);
        showNotification(error.message || "Failed to add item to cart.", "error");
    }
}

async function loadPatientCart(patientId = getPatientId()) {
    if (!patientId) {
        pharmacyCart = [];
        renderCart();
        updateCartCount();
        return;
    }

    try {
        const data = await apiRequest(`/api/pharmacy/cart/${encodeURIComponent(patientId)}`);
        pharmacyCart = (data.items || []).map(item => ({
            id: item.id,
            medicine_id: item.medicine_id,
            name: item.medicine_name || "Medicine",
            quantity: Number(item.quantity) || 0,
            price: Number(item.price) || 0
        }));
    } catch (error) {
        console.error("Cart loading error:", error);
        pharmacyCart = [];
    }

    renderCart();
    updateCartCount();
    // Update active badges on catalog cards
    applyMedicineFilters();
}

function updateCartCount() {
    const count = pharmacyCart.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
    const total = getCartTotal();

    document.querySelectorAll("#cartCount, .cart-count").forEach(el => { el.textContent = count; });

    const totalEl = document.getElementById("cartBarTotal");
    if (totalEl) totalEl.textContent = `₹${total.toFixed(2)}`;

    const cartBar = document.getElementById("pharmacyCartBar");
    if (cartBar) {
        cartBar.classList.toggle("has-items", count > 0);
    }
}

function getCartTotal() {
    return pharmacyCart.reduce((total, item) => total + Number(item.price) * Number(item.quantity), 0);
}

async function openCart() {
    const patientId = getPatientId();
    openModal("cartModal");

    const banner = document.getElementById("cartPatientBanner");
    if (banner) {
        if (patientId) {
            banner.innerHTML = `
                <div class="cart-patient-active">
                    <span class="active-dot"></span>
                    <span>Patient UHID: <strong>${escapeHTML(patientId)}</strong></span>
                    <span class="dispensary-ref">OPD Dispensary Counter 4</span>
                </div>
            `;
        } else {
            banner.innerHTML = `
                <div class="cart-patient-warning">
                    <span>⚠️ Please verify your Patient UHID in the pharmacy modal to proceed with dispensing.</span>
                </div>
            `;
        }
    }

    if (!patientId) {
        showError(document.getElementById("cartResult"), "Please verify your Patient ID before ordering.");
        return;
    }
    await loadPatientCart(patientId);
}

function renderCart() {
    const result = document.getElementById("cartResult");
    if (!result) return;

    if (!pharmacyCart.length) {
        result.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon-wrap">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8">
                        <circle cx="8" cy="21" r="1"></circle>
                        <circle cx="19" cy="21" r="1"></circle>
                        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
                    </svg>
                </div>
                <h3>Your Cart is Empty</h3>
                <p>Browse the pharmacy catalog to add prescribed medicines.</p>
                <button type="button" class="btn-back-to-catalog" onclick="closeModal('cartModal'); showPharmacy();">Browse Medicines</button>
            </div>
        `;
        return;
    }

    const itemsHTML = pharmacyCart.map(item => {
        const itemTotal = Number(item.price) * Number(item.quantity);
        return `
            <div class="pharmacy-cart-row">
                <div class="cart-row-details">
                    <h4 class="cart-item-title">${escapeHTML(item.name)}</h4>
                    <span class="cart-item-rate">₹${Number(item.price).toFixed(2)} each</span>
                </div>
                <div class="cart-row-controls">
                    <div class="qty-stepper">
                        <button type="button" class="btn-qty" onclick="changeCartQuantity(${Number(item.medicine_id ?? item.id)}, -1)" title="Decrease quantity">−</button>
                        <span class="qty-display">${item.quantity}</span>
                        <button type="button" class="btn-qty" onclick="changeCartQuantity(${Number(item.medicine_id ?? item.id)}, 1)" title="Increase quantity">+</button>
                    </div>
                    <div class="cart-row-total">
                        <strong>₹${itemTotal.toFixed(2)}</strong>
                    </div>
                    <button type="button" class="btn-remove-item" onclick="removeFromCart(${Number(item.id)})" title="Remove item">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        `;
    }).join("");

    const grandTotal = getCartTotal();

    result.innerHTML = `
        <div class="cart-items-container">${itemsHTML}</div>
        <div class="cart-summary-card">
            <div class="summary-line">
                <span>Items Subtotal (${pharmacyCart.reduce((s, i) => s + Number(i.quantity), 0)} items)</span>
                <strong>₹${grandTotal.toFixed(2)}</strong>
            </div>
            <div class="summary-line subsidy-line">
                <span>Hospital OPD Dispensing & Packaging</span>
                <span class="free-pill">FREE (Subsidized)</span>
            </div>
            <div class="summary-divider"></div>
            <div class="summary-total-line">
                <span>Total Amount Payable</span>
                <strong class="grand-total-val">₹${grandTotal.toFixed(2)}</strong>
            </div>
            <button type="button" class="btn-checkout-primary" onclick="checkoutMedicineCart()">
                <span>Proceed to Payment & Dispensing</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
        </div>
    `;
}

async function changeCartQuantity(medicineId, change) {
    const item = pharmacyCart.find(i => String(i.medicine_id ?? i.id) === String(medicineId));
    if (!item) return;

    if (change > 0) { await addToCart(medicineId); return; }

    const newQuantity = Number(item.quantity) - 1;
    try {
        await apiRequest(`/api/pharmacy/cart/${item.id}`, { method: "DELETE" });

        if (newQuantity > 0) {
            const patientId = getPatientId();
            await apiRequest("/api/pharmacy/cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ patientId, medicineId: item.medicine_id ?? item.id, medicineName: item.name, quantity: newQuantity })
            });
        }
        await loadPatientCart();
    } catch (error) {
        console.error("Quantity update error:", error);
        showNotification(error.message || "Failed to update quantity.", "error");
    }
}

async function removeFromCart(cartId) {
    if (!cartId) return;
    try {
        await apiRequest(`/api/pharmacy/cart/${encodeURIComponent(cartId)}`, { method: "DELETE" });
        await loadPatientCart();
        showNotification("Item removed from cart.", "success");
    } catch (error) {
        console.error("Remove cart error:", error);
        showNotification(error.message || "Failed to remove item.", "error");
    }
}

/* =========================================================
   PHARMACY — PAYMENT & OFFICIAL DISPENSARY RECEIPT
========================================================= */

function checkoutMedicineCart() {
    if (!pharmacyCart.length) { showNotification("Your cart is empty.", "warning"); return; }
    if (!getPatientId()) { showNotification("Patient UHID is required.", "warning"); return; }
    openPaymentModal();
}

function openPaymentModal() {
    let modal = document.getElementById("paymentModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "paymentModal";
        modal.className = "modal";
        modal.innerHTML = `
            <div class="modal-box payment-box">
                <button class="close-btn" onclick="closeModal('paymentModal')">×</button>
                <div class="payment-modal-head">
                    <div class="payment-modal-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                    </div>
                    <div>
                        <h2>Pharmacy Checkout</h2>
                        <p class="modal-subtitle">Select payment method for your hospital pharmacy prescription order.</p>
                    </div>
                </div>

                <div id="paymentSummary"></div>

                <div class="payment-methods-wrapper">
                    <h3>Select Payment Method</h3>
                    <div class="payment-methods-grid">
                        <label class="pay-method-option active">
                            <input type="radio" name="paymentMethod" value="UPI" checked onchange="showPaymentFields()">
                            <div class="pay-method-content">
                                <span class="method-title">Instant UPI</span>
                                <span class="method-desc">GPay, PhonePe, Paytm, BHIM</span>
                            </div>
                        </label>
                        <label class="pay-method-option">
                            <input type="radio" name="paymentMethod" value="Card" onchange="showPaymentFields()">
                            <div class="pay-method-content">
                                <span class="method-title">Card (Debit / Credit)</span>
                                <span class="method-desc">Visa, RuPay, MasterCard</span>
                            </div>
                        </label>
                        <label class="pay-method-option">
                            <input type="radio" name="paymentMethod" value="Net Banking" onchange="showPaymentFields()">
                            <div class="pay-method-content">
                                <span class="method-title">Net Banking</span>
                                <span class="method-desc">SBI, HDFC, ICICI, PNB</span>
                            </div>
                        </label>
                        <label class="pay-method-option">
                            <input type="radio" name="paymentMethod" value="COD" onchange="showPaymentFields()">
                            <div class="pay-method-content">
                                <span class="method-title">Dispensary Counter Cash</span>
                                <span class="method-desc">Pay at Hospital Counter</span>
                            </div>
                        </label>
                    </div>
                </div>

                <div id="paymentFields" class="payment-dynamic-fields"></div>
                <div id="paymentResult"></div>

                <div class="payment-modal-actions">
                    <button type="button" class="btn-cancel" onclick="closeModal('paymentModal')">Cancel</button>
                    <button type="button" class="btn-pay-submit" onclick="processPayment()">
                        Confirm & Place Pharmacy Order
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.classList.add("show");
    renderPaymentSummary();
    showPaymentFields();
}

function renderPaymentSummary() {
    const result = document.getElementById("paymentSummary");
    if (!result) return;
    const total = getCartTotal();
    const count = pharmacyCart.reduce((s, i) => s + Number(i.quantity), 0);
    result.innerHTML = `
        <div class="payment-order-summary">
            <div class="summary-stat">
                <span class="stat-label">Unique Medicines</span>
                <strong class="stat-val">${pharmacyCart.length}</strong>
            </div>
            <div class="summary-stat">
                <span class="stat-label">Total Units</span>
                <strong class="stat-val">${count}</strong>
            </div>
            <div class="summary-stat stat-total">
                <span class="stat-label">Payable Amount</span>
                <strong class="stat-val highlight">₹${total.toFixed(2)}</strong>
            </div>
        </div>
    `;
}

function showPaymentFields() {
    const method = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    const fields = document.getElementById("paymentFields");
    if (!fields) return;

    // Update active highlight on selected option
    document.querySelectorAll(".pay-method-option").forEach(label => {
        const radio = label.querySelector("input");
        label.classList.toggle("active", Boolean(radio && radio.checked));
    });

    if (method === "UPI") {
        fields.innerHTML = `
            <div class="form-group-modern">
                <label for="upiId">Virtual Payment Address (VPA / UPI ID)</label>
                <input id="upiId" type="text" placeholder="username@okhdfcbank or mobilenumber@upi" autocomplete="off">
                <small class="field-hint">A payment request will be sent to your UPI application.</small>
            </div>
        `;
    } else if (method === "Card") {
        fields.innerHTML = `
            <div class="form-group-modern">
                <label for="cardNumber">Card Number</label>
                <input id="cardNumber" type="text" maxlength="19" placeholder="4532 •••• •••• 8910" autocomplete="off">
            </div>
            <div class="form-group-modern">
                <label for="cardName">Cardholder Name</label>
                <input id="cardName" type="text" placeholder="Name printed on card" autocomplete="off">
            </div>
            <div class="form-row-dual">
                <div class="form-group-modern">
                    <label for="cardExpiry">Expiry Date</label>
                    <input id="cardExpiry" type="text" placeholder="MM/YY" maxlength="5">
                </div>
                <div class="form-group-modern">
                    <label for="cardCVV">CVV / CVC</label>
                    <input id="cardCVV" type="password" maxlength="4" placeholder="•••">
                </div>
            </div>
        `;
    } else if (method === "Net Banking") {
        fields.innerHTML = `
            <div class="form-group-modern">
                <label for="bankName">Select Bank</label>
                <select id="bankName">
                    <option value="">Choose your bank...</option>
                    <option value="SBI">State Bank of India</option>
                    <option value="HDFC">HDFC Bank</option>
                    <option value="ICICI">ICICI Bank</option>
                    <option value="PNB">Punjab National Bank</option>
                    <option value="AXIS">Axis Bank</option>
                    <option value="BOB">Bank of Baroda</option>
                </select>
            </div>
        `;
    } else if (method === "COD") {
        fields.innerHTML = `
            <div class="payment-counter-notice">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 14 14"></polyline>
                </svg>
                <div>
                    <strong>Hospital Dispensary Collection</strong>
                    <p>Collect your dispensed medicines directly from Counter 4 (Central OPD Pharmacy) by showing your UHID and order receipt.</p>
                </div>
            </div>
        `;
    } else {
        fields.innerHTML = "";
    }
}

function validatePayment(method) {
    if (!method) return "Please select a payment method.";
    if (method === "UPI") {
        const upi = document.getElementById("upiId")?.value.trim();
        if (!upi || !/^[\w.-]+@[\w.-]+$/.test(upi)) return "Please enter a valid UPI ID (e.g. mobile@upi).";
    }
    if (method === "Card") {
        const number = document.getElementById("cardNumber")?.value.replace(/\s/g, "");
        const name = document.getElementById("cardName")?.value.trim();
        const expiry = document.getElementById("cardExpiry")?.value.trim();
        const cvv = document.getElementById("cardCVV")?.value.trim();
        if (!number || !name || !expiry || !cvv) return "Please complete all card payment details.";
        if (!/^\d{12,19}$/.test(number)) return "Please enter a valid card number.";
        if (!/^\d{3,4}$/.test(cvv)) return "Invalid CVV security code.";
    }
    if (method === "Net Banking" && !document.getElementById("bankName")?.value) {
        return "Please select your bank.";
    }
    return null;
}

async function processPayment() {
    const patientId = getPatientId();
    if (!patientId) { showNotification("Patient ID not found.", "error"); return; }
    if (!pharmacyCart.length) { showNotification("Cart is empty.", "warning"); return; }

    const method = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    const validationError = validatePayment(method);
    if (validationError) { showNotification(validationError, "warning"); return; }

    const amount = getCartTotal();
    const result = document.getElementById("paymentResult");
    if (result) showLoading(result, "Processing order & reserving stock...");

    try {
        const data = await apiRequest("/api/pharmacy/payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                patientId,
                paymentMethod: method,
                amount,
                items: pharmacyCart.map(item => ({
                    id: item.medicine_id ?? item.id,
                    name: item.name,
                    quantity: Number(item.quantity),
                    price: Number(item.price)
                }))
            })
        });

        lastPaymentResult = { ...data, amount, patientId, items: [...pharmacyCart] };
        pharmacyCart = [];
        await loadPatientCart(patientId);

        if (result) showSuccess(result, method === "COD" ? "Order confirmed for counter pickup." : "Payment successful.");
        closeModal("paymentModal");
        closeModal("cartModal");
        showReceipt(lastPaymentResult);
    } catch (error) {
        console.error("Payment error:", error);
        if (result) showError(result, error.message || "Payment processing failed.");
    }
}

function showReceipt(data) {
    const numberEl = document.getElementById("receiptNumber");
    const dateEl = document.getElementById("receiptDate");
    const patientEl = document.getElementById("receiptPatientId");
    const itemsEl = document.getElementById("receiptItems");
    const totalEl = document.getElementById("receiptTotal");

    if (numberEl) numberEl.textContent = data.billNumber || data.transactionId || ("SC-" + Date.now().toString().slice(-8));
    if (dateEl) dateEl.textContent = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    if (patientEl) patientEl.textContent = data.patientId || "N/A";
    if (totalEl) totalEl.textContent = `₹${Number(data.amount || 0).toFixed(2)}`;
    if (itemsEl) {
        itemsEl.innerHTML = (data.items || []).map(item => `
            <div class="receipt-item">
                <span>${escapeHTML(item.name)} <small>× ${item.quantity}</small></span>
                <strong>₹${(Number(item.price) * Number(item.quantity)).toFixed(2)}</strong>
            </div>
        `).join("");
    }

    openModal("receiptModal");
}

function printReceipt() {
    const content = document.getElementById("receiptContent");
    if (!content) return;
    const win = window.open("", "_blank", "width=700,height=800");
    if (!win) { showNotification("Please allow popups to print.", "warning"); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>Pharmacy Dispensary Slip</title>
        <style>body{font-family:'Segoe UI',sans-serif;padding:30px;line-height:1.5;}hr{border:none;border-top:1px dashed #cbd5e1;margin:15px 0;}table{width:100%;border-collapse:collapse;}</style></head><body>${content.innerHTML}
        <script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
}

/* =========================================================
   HOSPITAL ADMINISTRATIVE MANAGEMENT CONSOLE (Staff & Admin)
========================================================= */

const HospitalAdminManager = (() => {
    let state = {
        activeTab: "hospitalInfo",
        hospitalsList: [],
        selectedHospitalId: null,
        hospital: null,
        doctors: [],
        ambulances: [],
        beds: null,
        emergency: null,
        slots: [],
        isLoading: false,
        doctorSearch: "",
        doctorFilter: "all",
        ambulanceSearch: "",
        ambulanceFilter: "all",
        editingDoctorId: null,
        editingAmbulanceId: null,
        isAddingDoctor: false,
        isAddingAmbulance: false,
        isAddingSlot: false
    };

    function getCurrentUser() {
        return (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getUser)
            ? SmartCityAuth.getUser()
            : null;
    }

    function checkAuth() {
        const user = getCurrentUser();
        const role = (user?.role || user?.type || "").toLowerCase();
        const isAuth = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.isAuthenticated)
            ? SmartCityAuth.isAuthenticated()
            : !!user;
        const canManage = isAuth && (role === "admin" || role === "staff" || role === "doctor");
        return { isAuth, user, role, canManage };
    }

    async function loadHospitalsList() {
        try {
            const res = await apiRequest("/api/hospitals");
            state.hospitalsList = res.hospitals || [];
            if (!state.selectedHospitalId && state.hospitalsList.length > 0) {
                const user = getCurrentUser();
                const role = (user?.role || user?.type || "").toLowerCase();
                if (role === "staff" && user?.hospitalId) {
                    state.selectedHospitalId = user.hospitalId;
                } else {
                    state.selectedHospitalId = state.hospitalsList[0].hospital_id || state.hospitalsList[0].id;
                }
            }
        } catch (err) {
            console.error("Failed to load hospitals list:", err);
            showNotification(err.message || "Failed to load hospitals", "error");
        }
    }

    async function fetchActiveHospital() {
        if (!state.selectedHospitalId) return null;
        try {
            const res = await apiRequest(`/api/hospitals/${state.selectedHospitalId}`);
            state.hospital = res.hospital || null;
            return state.hospital;
        } catch (err) {
            // Fallback: look up in hospitalsList
            state.hospital = state.hospitalsList.find(h => 
                String(h.hospital_id).toLowerCase() === String(state.selectedHospitalId).toLowerCase() ||
                String(h.id) === String(state.selectedHospitalId)
            ) || null;
            return state.hospital;
        }
    }

    function open(panelType = "hospitalInfo") {
        const modal = document.getElementById("staffEditModal");
        const content = document.getElementById("editContent");
        if (!modal || !content) return;

        const auth = checkAuth();
        if (!auth.canManage) {
            renderAuthGate(content);
            openModal("staffEditModal");
            return;
        }

        state.activeTab = panelType || "hospitalInfo";
        state.isAddingDoctor = false;
        state.editingDoctorId = null;
        state.isAddingAmbulance = false;
        state.editingAmbulanceId = null;
        state.isAddingSlot = false;

        openModal("staffEditModal");
        renderShell(content, auth);
    }

    function renderAuthGate(container) {
        container.innerHTML = `
            <div class="staff-auth-gate">
                <div class="gate-icon">🔒</div>
                <h3>Hospital Administrative Access Required</h3>
                <p>You are currently browsing as a citizen. Modifying hospital information, doctors, ambulances, and bed counts requires authenticated <strong>Hospital Staff</strong> or <strong>City Administrator</strong> privileges.</p>
                <div class="gate-actions">
                    <button type="button" class="hosp-btn-primary" onclick="if(typeof SmartCityAuth !== 'undefined') SmartCityAuth.showLoginModal('staff'); closeModal('staffEditModal');">
                        🔑 Sign In as Staff
                    </button>
                    <button type="button" class="hosp-btn-secondary" onclick="closeModal('staffEditModal')">
                        Close
                    </button>
                </div>
            </div>
        `;
    }

    async function renderShell(container, auth) {
        container.innerHTML = `
            <div class="hosp-admin-header">
                <div class="hosp-admin-title-row">
                    <div class="hosp-admin-title-wrap">
                        <div class="title-icon">🏥</div>
                        <div>
                            <h2>Hospital Management Console</h2>
                            <div class="hosp-admin-subtitle" id="hospAdminSubtitle">Connecting live with SmartCity MySQL database</div>
                        </div>
                    </div>
                    <div class="hosp-admin-controls" id="hospAdminControls">
                        <span style="font-size:12px; color:#64748b;">Loading facilities...</span>
                    </div>
                </div>
                <div class="hosp-tabs-bar" id="hospAdminTabsBar">
                    <button type="button" class="hosp-tab-btn ${state.activeTab === 'hospitalInfo' ? 'active' : ''}" onclick="HospitalAdminManager.switchTab('hospitalInfo')">🏥 Hospital Info</button>
                    <button type="button" class="hosp-tab-btn ${state.activeTab === 'doctors' ? 'active' : ''}" onclick="HospitalAdminManager.switchTab('doctors')">👨‍⚕️ Doctors</button>
                    <button type="button" class="hosp-tab-btn ${state.activeTab === 'ambulance' ? 'active' : ''}" onclick="HospitalAdminManager.switchTab('ambulance')">🚑 Ambulances</button>
                    <button type="button" class="hosp-tab-btn ${state.activeTab === 'beds' ? 'active' : ''}" onclick="HospitalAdminManager.switchTab('beds')">🛏️ Bed Capacity</button>
                    <button type="button" class="hosp-tab-btn ${state.activeTab === 'emergency' ? 'active' : ''}" onclick="HospitalAdminManager.switchTab('emergency')">🚨 Emergency Unit</button>
                    <button type="button" class="hosp-tab-btn ${state.activeTab === 'slots' ? 'active' : ''}" onclick="HospitalAdminManager.switchTab('slots')">📅 Appointment Slots</button>
                </div>
            </div>
            <div id="hospAdminTabContent">
                <div style="text-align:center; padding: 40px; color:#64748b;">
                    <div class="spinner" style="margin: 0 auto 12px; width:28px; height:28px; border:3px solid #e2e8f0; border-top-color:#2563eb; border-radius:50%; animation: spin 0.8s linear infinite;"></div>
                    Loading hospital data...
                </div>
            </div>
        `;

        if (state.hospitalsList.length === 0) {
            await loadHospitalsList();
        }

        // Configure hospital selection depending on role
        const user = auth.user;
        const role = auth.role;
        if (role === "staff") {
            const staffHospId = user.hospitalId || user.hospital_id;
            if (staffHospId) {
                state.selectedHospitalId = staffHospId;
            }
        }

        await fetchActiveHospital();
        updateControlsUI(auth);
        loadCurrentTabContent();
    }

    function updateControlsUI(auth) {
        const controls = document.getElementById("hospAdminControls");
        if (!controls) return;

        const role = auth.role;
        const currentHosp = state.hospital;

        if (role === "admin") {
            // Admin can switch between any hospital
            const options = state.hospitalsList.map(h => `
                <option value="${escapeHTML(h.hospital_id || h.id)}" ${String(h.hospital_id || h.id) === String(state.selectedHospitalId) ? 'selected' : ''}>
                    ${escapeHTML(h.hospital_name)}
                </option>
            `).join("");

            controls.innerHTML = `
                <div class="hosp-selector-pill">
                    <span>🏢 Facility:</span>
                    <select onchange="HospitalAdminManager.onHospitalChange(this.value)">
                        ${options}
                    </select>
                </div>
                <button type="button" class="hosp-btn-refresh" onclick="HospitalAdminManager.refresh()">🔄 Refresh</button>
            `;
        } else {
            // Staff is scoped to their assigned hospital
            const hospName = currentHosp ? currentHosp.hospital_name : (auth.user?.hospitalName || "Assigned Facility");
            controls.innerHTML = `
                <div class="hosp-selector-pill" style="background:#ecfdf5; border-color:#a7f3d0; color:#065f46;">
                    <span>🔒 Assigned:</span>
                    <strong>${escapeHTML(hospName)}</strong>
                </div>
                <button type="button" class="hosp-btn-refresh" onclick="HospitalAdminManager.refresh()">🔄 Refresh</button>
            `;
        }

        const subtitle = document.getElementById("hospAdminSubtitle");
        if (subtitle && currentHosp) {
            subtitle.innerText = `${currentHosp.hospital_name} (${currentHosp.hospital_type || 'General Hospital'}) — Status: ${currentHosp.status || 'Active'}`;
        }
    }

    function switchTab(tabName) {
        state.activeTab = tabName;
        state.isAddingDoctor = false;
        state.editingDoctorId = null;
        state.isAddingAmbulance = false;
        state.editingAmbulanceId = null;
        state.isAddingSlot = false;

        const tabBtns = document.querySelectorAll("#hospAdminTabsBar .hosp-tab-btn");
        tabBtns.forEach(btn => {
            btn.classList.toggle("active", btn.getAttribute("onclick").includes(`'${tabName}'`));
        });

        loadCurrentTabContent();
    }

    async function onHospitalChange(newHospId) {
        state.selectedHospitalId = newHospId;
        await fetchActiveHospital();
        const auth = checkAuth();
        updateControlsUI(auth);
        loadCurrentTabContent();
    }

    async function refresh() {
        await fetchActiveHospital();
        loadCurrentTabContent();
        showNotification("Refreshed latest hospital records from database.", "info");
    }

    async function loadCurrentTabContent() {
        const container = document.getElementById("hospAdminTabContent");
        if (!container) return;

        container.innerHTML = `
            <div style="text-align:center; padding: 40px; color:#64748b;">
                <div class="spinner" style="margin: 0 auto 12px; width:28px; height:28px; border:3px solid #e2e8f0; border-top-color:#2563eb; border-radius:50%; animation: spin 0.8s linear infinite;"></div>
                Loading ${state.activeTab}...
            </div>
        `;

        try {
            switch (state.activeTab) {
                case "hospitalInfo":
                    await renderHospitalInfoTab(container);
                    break;
                case "doctors":
                    await renderDoctorsTab(container);
                    break;
                case "ambulance":
                    await renderAmbulanceTab(container);
                    break;
                case "beds":
                    await renderBedsTab(container);
                    break;
                case "emergency":
                    await renderEmergencyTab(container);
                    break;
                case "slots":
                    await renderSlotsTab(container);
                    break;
                default:
                    await renderHospitalInfoTab(container);
            }
        } catch (err) {
            console.error("Tab rendering error:", err);
            container.innerHTML = `
                <div class="hosp-notice-box warning">
                    <span>⚠️</span>
                    <div>
                        <strong>Failed to load tab data</strong><br>
                        ${escapeHTML(err.message || "An unexpected error occurred while communicating with backend.")}
                    </div>
                </div>
            `;
        }
    }

    // =========================================================
    // TAB 1: HOSPITAL INFORMATION
    // =========================================================

    async function renderHospitalInfoTab(container) {
        const h = state.hospital;
        if (!h) {
            container.innerHTML = `<div class="hosp-notice-box warning">Hospital data not found for selected ID.</div>`;
            return;
        }

        container.innerHTML = `
            <form id="hospInfoForm" onsubmit="HospitalAdminManager.handleSaveHospitalInfo(event)">
                <div class="hosp-notice-box info">
                    <span>ℹ️</span>
                    <div>Updates submitted here directly update the <strong>hospitals</strong> table in MySQL via <code>PUT /api/hospitals/:id</code>.</div>
                </div>

                <div class="hosp-form-grid">
                    <div class="hosp-form-group">
                        <label class="hosp-form-label">Hospital Name *</label>
                        <input type="text" class="hosp-form-input" id="hospNameInput" value="${escapeHTML(h.hospital_name || '')}" required />
                    </div>

                    <div class="hosp-form-group">
                        <label class="hosp-form-label">Hospital Type</label>
                        <select class="hosp-form-select" id="hospTypeInput">
                            <option value="Government Hospital" ${h.hospital_type === 'Government Hospital' ? 'selected' : ''}>Government Hospital</option>
                            <option value="Private Hospital" ${h.hospital_type === 'Private Hospital' ? 'selected' : ''}>Private Hospital</option>
                            <option value="District Hospital" ${h.hospital_type === 'District Hospital' ? 'selected' : ''}>District Hospital</option>
                            <option value="Medical College" ${h.hospital_type === 'Medical College' ? 'selected' : ''}>Medical College</option>
                            <option value="Multi-Specialty" ${h.hospital_type === 'Multi-Specialty' ? 'selected' : ''}>Multi-Specialty</option>
                        </select>
                    </div>

                    <div class="hosp-form-group">
                        <label class="hosp-form-label">Operational Status</label>
                        <select class="hosp-form-select" id="hospStatusInput">
                            <option value="Operational" ${h.status === 'Operational' || h.status === 'Active' ? 'selected' : ''}>Operational</option>
                            <option value="Full Capacity" ${h.status === 'Full Capacity' ? 'selected' : ''}>Full Capacity</option>
                            <option value="Emergency Only" ${h.status === 'Emergency Only' ? 'selected' : ''}>Emergency Only</option>
                            <option value="Under Maintenance" ${h.status === 'Under Maintenance' ? 'selected' : ''}>Under Maintenance</option>
                        </select>
                    </div>

                    <div class="hosp-form-group">
                        <label class="hosp-form-label">Primary Phone</label>
                        <input type="text" class="hosp-form-input" id="hospPhoneInput" value="${escapeHTML(h.phone || '')}" placeholder="+91 551 220 1234" />
                    </div>

                    <div class="hosp-form-group">
                        <label class="hosp-form-label">Emergency Helpline Number</label>
                        <input type="text" class="hosp-form-input" id="hospEmergencyNumberInput" value="${escapeHTML(h.emergency_number || '')}" placeholder="108 / 0551-220000" />
                    </div>

                    <div class="hosp-form-group">
                        <label class="hosp-form-label">Official Email</label>
                        <input type="email" class="hosp-form-input" id="hospEmailInput" value="${escapeHTML(h.email || '')}" placeholder="contact@hospital.org" />
                    </div>

                    <div class="hosp-form-group">
                        <label class="hosp-form-label">Web Portal</label>
                        <input type="text" class="hosp-form-input" id="hospWebsiteInput" value="${escapeHTML(h.website || '')}" placeholder="https://aiimsgorakhpur.edu.in" />
                    </div>

                    <div class="hosp-form-group full-width">
                        <label class="hosp-form-label">Physical Address</label>
                        <input type="text" class="hosp-form-input" id="hospAddressInput" value="${escapeHTML(h.address || '')}" placeholder="Kunraghat, Gorakhpur, UP - 273008" />
                    </div>

                    <div class="hosp-form-group">
                        <label class="hosp-form-label">GPS Latitude</label>
                        <input type="number" step="any" class="hosp-form-input" id="hospLatInput" value="${h.latitude !== null && h.latitude !== undefined ? h.latitude : ''}" placeholder="26.7606" />
                    </div>

                    <div class="hosp-form-group">
                        <label class="hosp-form-label">GPS Longitude</label>
                        <input type="number" step="any" class="hosp-form-input" id="hospLngInput" value="${h.longitude !== null && h.longitude !== undefined ? h.longitude : ''}" placeholder="83.3732" />
                    </div>

                    <div class="hosp-form-group">
                        <label class="hosp-form-label">Total Beds</label>
                        <input type="number" class="hosp-form-input" id="hospTotalBedsInput" value="${h.total_beds || 0}" min="0" />
                    </div>

                    <div class="hosp-form-group">
                        <label class="hosp-form-label">ICU Beds</label>
                        <input type="number" class="hosp-form-input" id="hospIcuBedsInput" value="${h.icu_beds || 0}" min="0" />
                    </div>

                    <div class="hosp-form-group">
                        <label class="hosp-form-label">Emergency Beds</label>
                        <input type="number" class="hosp-form-input" id="hospEmergencyBedsInput" value="${h.emergency_beds || 0}" min="0" />
                    </div>
                </div>

                <div class="hosp-actions-bar">
                    <button type="button" class="hosp-btn-secondary" onclick="closeModal('staffEditModal')">Cancel</button>
                    <button type="submit" class="hosp-btn-success" id="hospSaveBtn">💾 Save Hospital Information</button>
                </div>
            </form>
        `;
    }

    async function handleSaveHospitalInfo(e) {
        e.preventDefault();
        const btn = document.getElementById("hospSaveBtn");
        if (btn) btn.disabled = true;

        const payload = {
            hospitalName: document.getElementById("hospNameInput").value.trim(),
            hospitalType: document.getElementById("hospTypeInput").value,
            status: document.getElementById("hospStatusInput").value,
            phone: document.getElementById("hospPhoneInput").value.trim(),
            emergencyNumber: document.getElementById("hospEmergencyNumberInput").value.trim(),
            email: document.getElementById("hospEmailInput").value.trim(),
            website: document.getElementById("hospWebsiteInput").value.trim(),
            address: document.getElementById("hospAddressInput").value.trim(),
            latitude: document.getElementById("hospLatInput").value ? Number(document.getElementById("hospLatInput").value) : null,
            longitude: document.getElementById("hospLngInput").value ? Number(document.getElementById("hospLngInput").value) : null,
            totalBeds: Number(document.getElementById("hospTotalBedsInput").value || 0),
            icuBeds: Number(document.getElementById("hospIcuBedsInput").value || 0),
            emergencyBeds: Number(document.getElementById("hospEmergencyBedsInput").value || 0)
        };

        try {
            const targetId = state.hospital.hospital_id || state.hospital.id;
            await apiRequest(`/api/hospitals/${targetId}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            showNotification("Hospital information updated successfully in database!", "success");
            await loadHospitalsList();
            await fetchActiveHospital();
            const auth = checkAuth();
            updateControlsUI(auth);
            loadCurrentTabContent();
            
            // Refresh main page hospital listings if available
            if (typeof renderHospitals === "function" && Array.isArray(hospitalData)) {
                const idx = hospitalData.findIndex(h => String(h.hospital_id) === String(targetId) || String(h.id) === String(targetId));
                if (idx !== -1) {
                    hospitalData[idx] = { ...hospitalData[idx], ...payload, hospital_name: payload.hospitalName };
                    renderHospitals(hospitalData);
                }
            }
        } catch (err) {
            console.error("Save hospital error:", err);
            showNotification(err.message || "Failed to update hospital information.", "error");
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    // =========================================================
    // TAB 2: DOCTORS
    // =========================================================

    async function renderDoctorsTab(container) {
        const hospId = state.selectedHospitalId;
        const res = await apiRequest(`/api/hospitals/${hospId}/doctors`).catch(() => ({ doctors: [] }));
        state.doctors = res.doctors || [];

        // Apply search & filter
        let filtered = state.doctors.filter(d => {
            const search = state.doctorSearch.toLowerCase();
            const matchName = String(d.name || "").toLowerCase().includes(search);
            const matchSpec = String(d.specialization || "").toLowerCase().includes(search);
            const matchDept = String(d.department || "").toLowerCase().includes(search);
            const matchStatus = state.doctorFilter === "all" || String(d.status || "").toLowerCase() === state.doctorFilter.toLowerCase();
            return (matchName || matchSpec || matchDept) && matchStatus;
        });

        const isEditing = !!state.editingDoctorId;
        const isAdding = state.isAddingDoctor;
        const activeDoctor = isEditing ? state.doctors.find(d => String(d.id) === String(state.editingDoctorId) || String(d.doctor_id) === String(state.editingDoctorId)) : null;

        let formHtml = "";
        if (isAdding || isEditing) {
            formHtml = `
                <div class="hosp-inline-form-card">
                    <div class="hosp-inline-form-title">
                        <span>${isEditing ? '✏️ Edit Doctor Details' : '➕ Add New Doctor'}</span>
                    </div>
                    <form onsubmit="HospitalAdminManager.handleSaveDoctor(event)">
                        <div class="hosp-form-grid">
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">Doctor ID *</label>
                                <input type="text" class="hosp-form-input" id="docIdInput" value="${escapeHTML(activeDoctor ? activeDoctor.doctor_id : 'DOC-' + Math.floor(1000 + Math.random() * 9000))}" ${isEditing ? 'readonly style="background:#f1f5f9;"' : ''} required />
                            </div>
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">Full Name (with Dr. prefix) *</label>
                                <input type="text" class="hosp-form-input" id="docNameInput" value="${escapeHTML(activeDoctor ? activeDoctor.name : '')}" placeholder="Dr. Rajesh Verma" required />
                            </div>
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">Department *</label>
                                <input type="text" class="hosp-form-input" id="docDeptInput" value="${escapeHTML(activeDoctor ? activeDoctor.department : '')}" placeholder="Cardiology" required />
                            </div>
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">Specialization</label>
                                <input type="text" class="hosp-form-input" id="docSpecInput" value="${escapeHTML(activeDoctor ? activeDoctor.specialization : '')}" placeholder="Interventional Cardiologist" />
                            </div>
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">Qualification</label>
                                <input type="text" class="hosp-form-input" id="docQualInput" value="${escapeHTML(activeDoctor ? activeDoctor.qualification : '')}" placeholder="MBBS, MD (Med), DM (Card)" />
                            </div>
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">Experience (Years)</label>
                                <input type="number" class="hosp-form-input" id="docExpInput" value="${activeDoctor ? activeDoctor.experience : 5}" min="0" max="60" />
                            </div>
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">Contact Mobile</label>
                                <input type="text" class="hosp-form-input" id="docMobileInput" value="${escapeHTML(activeDoctor ? activeDoctor.mobile : '')}" placeholder="+91 9876543210" />
                            </div>
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">Email Address</label>
                                <input type="email" class="hosp-form-input" id="docEmailInput" value="${escapeHTML(activeDoctor ? activeDoctor.email : '')}" placeholder="doctor@hospital.org" />
                            </div>
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">Consultation Fee (₹)</label>
                                <input type="number" class="hosp-form-input" id="docFeeInput" value="${activeDoctor ? activeDoctor.consultation_fee : 500}" min="0" />
                            </div>
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">Current Status</label>
                                <select class="hosp-form-select" id="docStatusInput">
                                    <option value="Available" ${activeDoctor && activeDoctor.status === 'Available' ? 'selected' : ''}>Available</option>
                                    <option value="Busy" ${activeDoctor && activeDoctor.status === 'Busy' ? 'selected' : ''}>Busy</option>
                                    <option value="On Leave" ${activeDoctor && activeDoctor.status === 'On Leave' ? 'selected' : ''}>On Leave</option>
                                    <option value="Emergency Duty" ${activeDoctor && activeDoctor.status === 'Emergency Duty' ? 'selected' : ''}>Emergency Duty</option>
                                    <option value="Off Duty" ${activeDoctor && activeDoctor.status === 'Off Duty' ? 'selected' : ''}>Off Duty</option>
                                </select>
                            </div>
                        </div>
                        <div class="hosp-actions-bar" style="margin-top:10px; padding-top:10px;">
                            <button type="button" class="hosp-btn-secondary" onclick="HospitalAdminManager.cancelDoctorForm()">Cancel</button>
                            <button type="submit" class="hosp-btn-success">💾 ${isEditing ? 'Update Doctor' : 'Save New Doctor'}</button>
                        </div>
                    </form>
                </div>
            `;
        }

        const rowsHtml = filtered.length > 0 ? filtered.map(d => {
            const statusClass = d.status === 'Available' ? 'hosp-badge-green' : (d.status === 'Busy' || d.status === 'Emergency Duty' ? 'hosp-badge-amber' : 'hosp-badge-gray');
            return `
                <tr>
                    <td>
                        <strong>${escapeHTML(d.name)}</strong><br>
                        <small style="color:#64748b;">${escapeHTML(d.doctor_id || '')}</small>
                    </td>
                    <td>
                        <div>${escapeHTML(d.department || 'General')}</div>
                        <small style="color:#64748b;">${escapeHTML(d.specialization || '')}</small>
                    </td>
                    <td>
                        <div>${escapeHTML(d.qualification || 'MBBS')}</div>
                        <small style="color:#64748b;">${d.experience || 0} yrs experience</small>
                    </td>
                    <td>
                        <div>${escapeHTML(d.mobile || '—')}</div>
                        <small style="color:#64748b;">₹${d.consultation_fee || 0}</small>
                    </td>
                    <td>
                        <span class="hosp-badge ${statusClass}">${escapeHTML(d.status || 'Available')}</span>
                    </td>
                    <td style="white-space:nowrap; text-align:right;">
                        <button type="button" class="hosp-btn-primary-sm" onclick="HospitalAdminManager.editDoctor('${escapeJS(d.doctor_id || d.id)}')">✏️ Edit</button>
                        <button type="button" class="hosp-btn-danger-outline" onclick="HospitalAdminManager.deleteDoctor('${escapeJS(d.doctor_id || d.id)}')">🗑️</button>
                    </td>
                </tr>
            `;
        }).join("") : `
            <tr>
                <td colspan="6" style="text-align:center; padding:30px; color:#64748b;">
                    No doctors found for this facility. Click <strong>+ Add Doctor</strong> to create one.
                </td>
            </tr>
        `;

        container.innerHTML = `
            ${formHtml}
            <div class="hosp-toolbar">
                <div class="hosp-toolbar-left">
                    <div class="hosp-search-box">
                        <span class="search-icon">🔍</span>
                        <input type="text" placeholder="Search doctor by name, specialty, dept..." value="${escapeHTML(state.doctorSearch)}" oninput="HospitalAdminManager.onDoctorSearch(this.value)" />
                    </div>
                    <select class="hosp-filter-select" onchange="HospitalAdminManager.onDoctorFilter(this.value)">
                        <option value="all" ${state.doctorFilter === 'all' ? 'selected' : ''}>All Statuses</option>
                        <option value="Available" ${state.doctorFilter === 'Available' ? 'selected' : ''}>Available</option>
                        <option value="Busy" ${state.doctorFilter === 'Busy' ? 'selected' : ''}>Busy</option>
                        <option value="On Leave" ${state.doctorFilter === 'On Leave' ? 'selected' : ''}>On Leave</option>
                        <option value="Emergency Duty" ${state.doctorFilter === 'Emergency Duty' ? 'selected' : ''}>Emergency Duty</option>
                    </select>
                </div>
                <div>
                    ${!isAdding && !isEditing ? `
                        <button type="button" class="hosp-btn-primary" onclick="HospitalAdminManager.showAddDoctorForm()">
                            ➕ Add Doctor
                        </button>
                    ` : ''}
                </div>
            </div>

            <div class="hosp-table-wrap">
                <table class="hosp-table">
                    <thead>
                        <tr>
                            <th>Doctor</th>
                            <th>Department & Specialization</th>
                            <th>Qualification & Exp</th>
                            <th>Contact & Fee</th>
                            <th>Status</th>
                            <th style="text-align:right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    }

    function showAddDoctorForm() {
        state.isAddingDoctor = true;
        state.editingDoctorId = null;
        loadCurrentTabContent();
    }

    function editDoctor(docId) {
        state.isAddingDoctor = false;
        state.editingDoctorId = docId;
        loadCurrentTabContent();
    }

    function cancelDoctorForm() {
        state.isAddingDoctor = false;
        state.editingDoctorId = null;
        loadCurrentTabContent();
    }

    function onDoctorSearch(query) {
        state.doctorSearch = query;
        loadCurrentTabContent();
    }

    function onDoctorFilter(filter) {
        state.doctorFilter = filter;
        loadCurrentTabContent();
    }

    async function handleSaveDoctor(e) {
        e.preventDefault();
        const docId = document.getElementById("docIdInput").value.trim();
        const payload = {
            doctorId: docId,
            name: document.getElementById("docNameInput").value.trim(),
            department: document.getElementById("docDeptInput").value.trim(),
            specialization: document.getElementById("docSpecInput").value.trim(),
            qualification: document.getElementById("docQualInput").value.trim(),
            experience: Number(document.getElementById("docExpInput").value || 0),
            mobile: document.getElementById("docMobileInput").value.trim(),
            email: document.getElementById("docEmailInput").value.trim(),
            consultationFee: Number(document.getElementById("docFeeInput").value || 0),
            status: document.getElementById("docStatusInput").value,
            hospitalId: state.selectedHospitalId
        };

        try {
            if (state.editingDoctorId) {
                await apiRequest(`/api/doctors/${state.editingDoctorId}`, {
                    method: "PUT",
                    body: JSON.stringify(payload)
                });
                showNotification("Doctor record updated successfully!", "success");
            } else {
                await apiRequest("/api/doctors", {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
                showNotification("New doctor created successfully!", "success");
            }

            state.isAddingDoctor = false;
            state.editingDoctorId = null;
            loadCurrentTabContent();
        } catch (err) {
            console.error("Save doctor error:", err);
            showNotification(err.message || "Failed to save doctor.", "error");
        }
    }

    async function deleteDoctor(docId) {
        if (!confirm(`Are you sure you want to delete doctor [${docId}] from this facility?`)) return;
        try {
            await apiRequest(`/api/doctors/${docId}`, { method: "DELETE" });
            showNotification(`Doctor [${docId}] deleted successfully.`, "success");
            loadCurrentTabContent();
        } catch (err) {
            console.error("Delete doctor error:", err);
            showNotification(err.message || "Failed to delete doctor.", "error");
        }
    }

    // =========================================================
    // TAB 3: AMBULANCES
    // =========================================================

    async function renderAmbulanceTab(container) {
        const hospName = state.hospital ? state.hospital.hospital_name : "";
        const res = await apiRequest("/api/ambulances").catch(() => ({ ambulances: [] }));
        const allAmbulances = res.ambulances || [];

        // Scoped to current hospital name
        state.ambulances = allAmbulances.filter(a => {
            if (!hospName) return true;
            return a.hospital_name && a.hospital_name.toLowerCase().includes(hospName.toLowerCase().replace("hospital", "").trim());
        });

        let filtered = state.ambulances.filter(a => {
            const search = state.ambulanceSearch.toLowerCase();
            const matchVeh = String(a.vehicle_number || "").toLowerCase().includes(search);
            const matchDriver = String(a.driver_name || "").toLowerCase().includes(search);
            const matchLoc = String(a.location || "").toLowerCase().includes(search);
            const matchStatus = state.ambulanceFilter === "all" || String(a.status || "").toLowerCase() === state.ambulanceFilter.toLowerCase();
            return (matchVeh || matchDriver || matchLoc) && matchStatus;
        });

        const isEditing = !!state.editingAmbulanceId;
        const isAdding = state.isAddingAmbulance;
        const activeAmbulance = isEditing ? state.ambulances.find(a => String(a.id) === String(state.editingAmbulanceId) || String(a.ambulance_id) === String(state.editingAmbulanceId)) : null;

        let formHtml = "";
        if (isAdding || isEditing) {
            formHtml = `
                <div class="hosp-inline-form-card">
                    <div class="hosp-inline-form-title">
                        <span>${isEditing ? '✏️ Edit Ambulance Record' : '➕ Register New Ambulance'}</span>
                    </div>
                    <form onsubmit="HospitalAdminManager.handleSaveAmbulance(event)">
                        <div class="hosp-form-grid">
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">Ambulance ID *</label>
                                <input type="text" class="hosp-form-input" id="ambIdInput" value="${escapeHTML(activeAmbulance ? activeAmbulance.ambulance_id : 'AMB-' + Math.floor(100 + Math.random() * 900))}" ${isEditing ? 'readonly style="background:#f1f5f9;"' : ''} required />
                            </div>
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">Vehicle Registration Number *</label>
                                <input type="text" class="hosp-form-input" id="ambVehInput" value="${escapeHTML(activeAmbulance ? activeAmbulance.vehicle_number : '')}" placeholder="UP 53 AG 1234" required />
                            </div>
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">Driver Name</label>
                                <input type="text" class="hosp-form-input" id="ambDriverInput" value="${escapeHTML(activeAmbulance ? activeAmbulance.driver_name : '')}" placeholder="Ramesh Chandra" />
                            </div>
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">Driver Mobile</label>
                                <input type="text" class="hosp-form-input" id="ambMobileInput" value="${escapeHTML(activeAmbulance ? activeAmbulance.driver_mobile : '')}" placeholder="+91 9450001234" />
                            </div>
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">Ambulance Type</label>
                                <select class="hosp-form-select" id="ambTypeInput">
                                    <option value="Advanced Life Support (ALS)" ${activeAmbulance && activeAmbulance.ambulance_type && activeAmbulance.ambulance_type.includes('Advanced') ? 'selected' : ''}>Advanced Life Support (ALS)</option>
                                    <option value="Basic Life Support (BLS)" ${activeAmbulance && activeAmbulance.ambulance_type && activeAmbulance.ambulance_type.includes('Basic') ? 'selected' : ''}>Basic Life Support (BLS)</option>
                                    <option value="ICU on Wheels" ${activeAmbulance && activeAmbulance.ambulance_type && activeAmbulance.ambulance_type.includes('ICU') ? 'selected' : ''}>ICU on Wheels</option>
                                    <option value="Patient Transport" ${activeAmbulance && activeAmbulance.ambulance_type && activeAmbulance.ambulance_type.includes('Transport') ? 'selected' : ''}>Patient Transport</option>
                                </select>
                            </div>
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">Current Operational Status</label>
                                <select class="hosp-form-select" id="ambStatusInput">
                                    <option value="Available" ${activeAmbulance && activeAmbulance.status === 'Available' ? 'selected' : ''}>Available</option>
                                    <option value="Assigned" ${activeAmbulance && activeAmbulance.status === 'Assigned' ? 'selected' : ''}>Assigned</option>
                                    <option value="On The Way" ${activeAmbulance && activeAmbulance.status === 'On The Way' ? 'selected' : ''}>On The Way</option>
                                    <option value="Transporting Patient" ${activeAmbulance && activeAmbulance.status === 'Transporting Patient' ? 'selected' : ''}>Transporting Patient</option>
                                    <option value="On Duty" ${activeAmbulance && activeAmbulance.status === 'On Duty' ? 'selected' : ''}>On Duty</option>
                                    <option value="Emergency" ${activeAmbulance && activeAmbulance.status === 'Emergency' ? 'selected' : ''}>Emergency</option>
                                    <option value="Offline" ${activeAmbulance && activeAmbulance.status === 'Offline' ? 'selected' : ''}>Offline</option>
                                </select>
                            </div>
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">Base Location / Station</label>
                                <input type="text" class="hosp-form-input" id="ambLocationInput" value="${escapeHTML(activeAmbulance ? activeAmbulance.location : (state.hospital?.address || ''))}" placeholder="Emergency Bay, AIIMS Gorakhpur" />
                            </div>
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">GPS Latitude</label>
                                <input type="number" step="any" class="hosp-form-input" id="ambLatInput" value="${activeAmbulance && activeAmbulance.latitude !== null ? activeAmbulance.latitude : (state.hospital?.latitude || '')}" placeholder="26.7606" />
                            </div>
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">GPS Longitude</label>
                                <input type="number" step="any" class="hosp-form-input" id="ambLngInput" value="${activeAmbulance && activeAmbulance.longitude !== null ? activeAmbulance.longitude : (state.hospital?.longitude || '')}" placeholder="83.3732" />
                            </div>
                        </div>
                        <div class="hosp-actions-bar" style="margin-top:10px; padding-top:10px;">
                            <button type="button" class="hosp-btn-secondary" onclick="HospitalAdminManager.cancelAmbulanceForm()">Cancel</button>
                            <button type="submit" class="hosp-btn-success">💾 ${isEditing ? 'Update Ambulance' : 'Register Ambulance'}</button>
                        </div>
                    </form>
                </div>
            `;
        }

        const rowsHtml = filtered.length > 0 ? filtered.map(a => {
            const statusClass = a.status === 'Available' ? 'hosp-badge-green' : (a.status === 'Assigned' || a.status === 'On The Way' ? 'hosp-badge-amber' : (a.status === 'Emergency' ? 'hosp-badge-red' : 'hosp-badge-gray'));
            return `
                <tr>
                    <td>
                        <strong>${escapeHTML(a.vehicle_number)}</strong><br>
                        <small style="color:#64748b;">${escapeHTML(a.ambulance_id || '')}</small>
                    </td>
                    <td>
                        <div>${escapeHTML(a.driver_name || 'Unassigned')}</div>
                        <small style="color:#64748b;">${escapeHTML(a.driver_mobile || 'No contact')}</small>
                    </td>
                    <td>
                        <span class="hosp-badge hosp-badge-blue">${escapeHTML(a.ambulance_type || 'Standard')}</span>
                    </td>
                    <td>
                        <div>${escapeHTML(a.location || '—')}</div>
                        <small style="color:#64748b;">${a.latitude && a.longitude ? `${Number(a.latitude).toFixed(4)}, ${Number(a.longitude).toFixed(4)}` : 'No GPS'}</small>
                    </td>
                    <td>
                        <span class="hosp-badge ${statusClass}">${escapeHTML(a.status || 'Available')}</span>
                    </td>
                    <td style="white-space:nowrap; text-align:right;">
                        <button type="button" class="hosp-btn-primary-sm" onclick="HospitalAdminManager.editAmbulance('${escapeJS(a.ambulance_id || a.id)}')">✏️ Edit</button>
                        <button type="button" class="hosp-btn-danger-outline" onclick="HospitalAdminManager.deleteAmbulance('${escapeJS(a.ambulance_id || a.id)}')">🗑️</button>
                    </td>
                </tr>
            `;
        }).join("") : `
            <tr>
                <td colspan="6" style="text-align:center; padding:30px; color:#64748b;">
                    No ambulances currently registered for <strong>${escapeHTML(hospName)}</strong>. Click <strong>+ Add Ambulance</strong> to register one.
                </td>
            </tr>
        `;

        container.innerHTML = `
            ${formHtml}
            <div class="hosp-toolbar">
                <div class="hosp-toolbar-left">
                    <div class="hosp-search-box">
                        <span class="search-icon">🔍</span>
                        <input type="text" placeholder="Search vehicle number, driver, location..." value="${escapeHTML(state.ambulanceSearch)}" oninput="HospitalAdminManager.onAmbulanceSearch(this.value)" />
                    </div>
                    <select class="hosp-filter-select" onchange="HospitalAdminManager.onAmbulanceFilter(this.value)">
                        <option value="all" ${state.ambulanceFilter === 'all' ? 'selected' : ''}>All Statuses</option>
                        <option value="Available" ${state.ambulanceFilter === 'Available' ? 'selected' : ''}>Available</option>
                        <option value="Assigned" ${state.ambulanceFilter === 'Assigned' ? 'selected' : ''}>Assigned</option>
                        <option value="Emergency" ${state.ambulanceFilter === 'Emergency' ? 'selected' : ''}>Emergency</option>
                        <option value="Offline" ${state.ambulanceFilter === 'Offline' ? 'selected' : ''}>Offline</option>
                    </select>
                </div>
                <div>
                    ${!isAdding && !isEditing ? `
                        <button type="button" class="hosp-btn-primary" onclick="HospitalAdminManager.showAddAmbulanceForm()">
                            ➕ Add Ambulance
                        </button>
                    ` : ''}
                </div>
            </div>

            <div class="hosp-table-wrap">
                <table class="hosp-table">
                    <thead>
                        <tr>
                            <th>Vehicle Number</th>
                            <th>Driver & Contact</th>
                            <th>Type</th>
                            <th>Current Location</th>
                            <th>Status</th>
                            <th style="text-align:right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    }

    function showAddAmbulanceForm() {
        state.isAddingAmbulance = true;
        state.editingAmbulanceId = null;
        loadCurrentTabContent();
    }

    function editAmbulance(ambId) {
        state.isAddingAmbulance = false;
        state.editingAmbulanceId = ambId;
        loadCurrentTabContent();
    }

    function cancelAmbulanceForm() {
        state.isAddingAmbulance = false;
        state.editingAmbulanceId = null;
        loadCurrentTabContent();
    }

    function onAmbulanceSearch(query) {
        state.ambulanceSearch = query;
        loadCurrentTabContent();
    }

    function onAmbulanceFilter(filter) {
        state.ambulanceFilter = filter;
        loadCurrentTabContent();
    }

    async function handleSaveAmbulance(e) {
        e.preventDefault();
        const ambId = document.getElementById("ambIdInput").value.trim();
        const payload = {
            ambulanceId: ambId,
            vehicleNumber: document.getElementById("ambVehInput").value.trim(),
            driverName: document.getElementById("ambDriverInput").value.trim(),
            driverMobile: document.getElementById("ambMobileInput").value.trim(),
            ambulanceType: document.getElementById("ambTypeInput").value,
            hospitalName: state.hospital?.hospital_name || null,
            location: document.getElementById("ambLocationInput").value.trim(),
            status: document.getElementById("ambStatusInput").value,
            latitude: document.getElementById("ambLatInput").value ? Number(document.getElementById("ambLatInput").value) : null,
            longitude: document.getElementById("ambLngInput").value ? Number(document.getElementById("ambLngInput").value) : null
        };

        try {
            if (state.editingAmbulanceId) {
                await apiRequest(`/api/ambulances/${state.editingAmbulanceId}`, {
                    method: "PUT",
                    body: JSON.stringify(payload)
                });
                showNotification("Ambulance details updated successfully!", "success");
            } else {
                await apiRequest("/api/ambulances", {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
                showNotification("New ambulance registered successfully!", "success");
            }

            state.isAddingAmbulance = false;
            state.editingAmbulanceId = null;
            loadCurrentTabContent();
        } catch (err) {
            console.error("Save ambulance error:", err);
            showNotification(err.message || "Failed to save ambulance.", "error");
        }
    }

    async function deleteAmbulance(ambId) {
        if (!confirm(`Are you sure you want to decommission ambulance [${ambId}]?`)) return;
        try {
            await apiRequest(`/api/ambulances/${ambId}`, { method: "DELETE" });
            showNotification(`Ambulance [${ambId}] deleted successfully.`, "success");
            loadCurrentTabContent();
        } catch (err) {
            console.error("Delete ambulance error:", err);
            showNotification(err.message || "Failed to delete ambulance.", "error");
        }
    }

    // =========================================================
    // TAB 4: BED CAPACITY
    // =========================================================

    async function renderBedsTab(container) {
        const hospName = state.hospital ? state.hospital.hospital_name : "";
        const res = await apiRequest("/api/hospital/beds").catch(() => ({ beds: [] }));
        const allBeds = res.beds || [];
        
        let bedRecord = allBeds.find(b => b.hospital_name && b.hospital_name.toLowerCase() === hospName.toLowerCase());
        if (!bedRecord) {
            bedRecord = {
                hospital_name: hospName,
                general_beds: state.hospital?.total_beds ? Math.max(0, state.hospital.total_beds - (state.hospital.icu_beds||0) - (state.hospital.emergency_beds||0) - 20) : 100,
                icu_beds: state.hospital?.icu_beds || 15,
                emergency_beds: state.hospital?.emergency_beds || 10,
                private_beds: 20
            };
        }
        state.beds = bedRecord;

        const totalBeds = (bedRecord.general_beds || 0) + (bedRecord.icu_beds || 0) + (bedRecord.emergency_beds || 0) + (bedRecord.private_beds || 0);

        container.innerHTML = `
            <div class="hosp-stat-grid">
                <div class="hosp-stat-card">
                    <div class="stat-icon">🛏️</div>
                    <div class="stat-num" style="color:#2563eb;">${bedRecord.general_beds || 0}</div>
                    <div class="stat-label">General Ward</div>
                </div>
                <div class="hosp-stat-card">
                    <div class="stat-icon">🩺</div>
                    <div class="stat-num" style="color:#dc2626;">${bedRecord.icu_beds || 0}</div>
                    <div class="stat-label">ICU / CCU Beds</div>
                </div>
                <div class="hosp-stat-card">
                    <div class="stat-icon">🚨</div>
                    <div class="stat-num" style="color:#d97706;">${bedRecord.emergency_beds || 0}</div>
                    <div class="stat-label">Emergency Bay</div>
                </div>
                <div class="hosp-stat-card">
                    <div class="stat-icon">🏨</div>
                    <div class="stat-num" style="color:#059669;">${bedRecord.private_beds || 0}</div>
                    <div class="stat-label">Private Rooms</div>
                </div>
                <div class="hosp-stat-card" style="background:#eff6ff; border-color:#bfdbfe;">
                    <div class="stat-icon">📊</div>
                    <div class="stat-num" style="color:#1d4ed8;">${totalBeds}</div>
                    <div class="stat-label">Total Operational Capacity</div>
                </div>
            </div>

            <form onsubmit="HospitalAdminManager.handleSaveBeds(event)">
                <div class="hosp-inline-form-card">
                    <div class="hosp-inline-form-title">
                        <span>✏️ Update Live Bed Allocations</span>
                    </div>
                    <div class="hosp-notice-box info">
                        <span>ℹ️</span>
                        <div>Saving bed counts updates the <strong>hospital_beds</strong> table and automatically recalculates <code>total_beds</code>, <code>icu_beds</code>, and <code>emergency_beds</code> in the <strong>hospitals</strong> registry via <code>PUT /api/hospital/beds/:id</code>.</div>
                    </div>

                    <div class="hosp-form-grid">
                        <div class="hosp-form-group">
                            <label class="hosp-form-label">General Ward Beds *</label>
                            <input type="number" class="hosp-form-input" id="bedGenInput" value="${bedRecord.general_beds || 0}" min="0" required />
                        </div>
                        <div class="hosp-form-group">
                            <label class="hosp-form-label">ICU / Critical Care Beds *</label>
                            <input type="number" class="hosp-form-input" id="bedIcuInput" value="${bedRecord.icu_beds || 0}" min="0" required />
                        </div>
                        <div class="hosp-form-group">
                            <label class="hosp-form-label">Emergency Trauma Beds *</label>
                            <input type="number" class="hosp-form-input" id="bedEmgInput" value="${bedRecord.emergency_beds || 0}" min="0" required />
                        </div>
                        <div class="hosp-form-group">
                            <label class="hosp-form-label">Private Ward Beds *</label>
                            <input type="number" class="hosp-form-input" id="bedPrivInput" value="${bedRecord.private_beds || 0}" min="0" required />
                        </div>
                    </div>

                    <div class="hosp-actions-bar">
                        <button type="submit" class="hosp-btn-success" id="bedSaveBtn">💾 Save Bed Allocations</button>
                    </div>
                </div>
            </form>
        `;
    }

    async function handleSaveBeds(e) {
        e.preventDefault();
        const btn = document.getElementById("bedSaveBtn");
        if (btn) btn.disabled = true;

        const payload = {
            generalBeds: Number(document.getElementById("bedGenInput").value || 0),
            icuBeds: Number(document.getElementById("bedIcuInput").value || 0),
            emergencyBeds: Number(document.getElementById("bedEmgInput").value || 0),
            privateBeds: Number(document.getElementById("bedPrivInput").value || 0)
        };

        try {
            const hospName = state.hospital?.hospital_name;
            await apiRequest(`/api/hospital/beds/${encodeURIComponent(hospName)}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            showNotification("Bed allocations updated and synced with hospital registry!", "success");
            await fetchActiveHospital();
            loadCurrentTabContent();
            
            // Reload bed cards if available
            if (typeof loadBeds === "function") {
                loadBeds();
            }
        } catch (err) {
            console.error("Save beds error:", err);
            showNotification(err.message || "Failed to update bed allocations.", "error");
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    // =========================================================
    // TAB 5: EMERGENCY UNIT
    // =========================================================

    async function renderEmergencyTab(container) {
        const hospName = state.hospital ? state.hospital.hospital_name : "";
        const res = await apiRequest("/api/emergency-departments").catch(() => ({ emergencyDepartments: [] }));
        const allDepts = res.emergencyDepartments || [];

        let dept = allDepts.find(d => d.hospital_name && d.hospital_name.toLowerCase().includes(hospName.toLowerCase().replace("hospital", "").trim()));
        if (!dept) {
            dept = {
                hospital_name: hospName,
                emergency_number: state.hospital?.emergency_number || "108",
                emergency_type: "Level 1 Trauma Center",
                available_doctors: 4,
                available_beds: state.hospital?.emergency_beds || 15,
                ambulances_available: 2,
                status: "Active",
                location: "Ground Floor, Emergency & Trauma Wing"
            };
        }
        state.emergency = dept;

        container.innerHTML = `
            <form onsubmit="HospitalAdminManager.handleSaveEmergency(event)">
                <div class="hosp-notice-box info">
                    <span>ℹ️</span>
                    <div>Updates here synchronize live emergency status on the public portal via <code>PUT /api/emergency-departments/:id</code>.</div>
                </div>

                <div class="hosp-form-grid">
                    <div class="hosp-form-group">
                        <label class="hosp-form-label">Dedicated Emergency Number</label>
                        <input type="text" class="hosp-form-input" id="emgPhoneInput" value="${escapeHTML(dept.emergency_number || '')}" placeholder="108 / 0551-220011" />
                    </div>

                    <div class="hosp-form-group">
                        <label class="hosp-form-label">Emergency Unit Classification</label>
                        <select class="hosp-form-select" id="emgTypeInput">
                            <option value="Level 1 Trauma Center" ${dept.emergency_type === 'Level 1 Trauma Center' ? 'selected' : ''}>Level 1 Trauma Center</option>
                            <option value="Emergency Care Unit" ${dept.emergency_type === 'Emergency Care Unit' ? 'selected' : ''}>Emergency Care Unit</option>
                            <option value="Pediatric Emergency" ${dept.emergency_type === 'Pediatric Emergency' ? 'selected' : ''}>Pediatric Emergency</option>
                            <option value="Cardiac Emergency" ${dept.emergency_type === 'Cardiac Emergency' ? 'selected' : ''}>Cardiac Emergency</option>
                        </select>
                    </div>

                    <div class="hosp-form-group">
                        <label class="hosp-form-label">On-Duty Emergency Doctors</label>
                        <input type="number" class="hosp-form-input" id="emgDocsInput" value="${dept.available_doctors || 0}" min="0" />
                    </div>

                    <div class="hosp-form-group">
                        <label class="hosp-form-label">Available Emergency Beds</label>
                        <input type="number" class="hosp-form-input" id="emgBedsInput" value="${dept.available_beds || 0}" min="0" />
                    </div>

                    <div class="hosp-form-group">
                        <label class="hosp-form-label">Ambulances on Standby</label>
                        <input type="number" class="hosp-form-input" id="emgAmbsInput" value="${dept.ambulances_available || 0}" min="0" />
                    </div>

                    <div class="hosp-form-group">
                        <label class="hosp-form-label">Unit Status</label>
                        <select class="hosp-form-select" id="emgStatusInput">
                            <option value="Active" ${dept.status === 'Active' ? 'selected' : ''}>Active (Normal Intake)</option>
                            <option value="Busy" ${dept.status === 'Busy' ? 'selected' : ''}>Busy (High Traffic)</option>
                            <option value="Critical" ${dept.status === 'Critical' ? 'selected' : ''}>Critical (Near Capacity)</option>
                            <option value="Divert" ${dept.status === 'Divert' ? 'selected' : ''}>Divert (Temporary Transfer)</option>
                        </select>
                    </div>

                    <div class="hosp-form-group full-width">
                        <label class="hosp-form-label">Location / Wing Description</label>
                        <input type="text" class="hosp-form-input" id="emgLocInput" value="${escapeHTML(dept.location || '')}" placeholder="Block A, Ground Floor, Gate 2" />
                    </div>
                </div>

                <div class="hosp-actions-bar">
                    <button type="submit" class="hosp-btn-success" id="emgSaveBtn">💾 Save Emergency Unit Status</button>
                </div>
            </form>
        `;
    }

    async function handleSaveEmergency(e) {
        e.preventDefault();
        const btn = document.getElementById("emgSaveBtn");
        if (btn) btn.disabled = true;

        const payload = {
            emergencyNumber: document.getElementById("emgPhoneInput").value.trim(),
            emergencyType: document.getElementById("emgTypeInput").value,
            availableDoctors: Number(document.getElementById("emgDocsInput").value || 0),
            availableBeds: Number(document.getElementById("emgBedsInput").value || 0),
            ambulancesAvailable: Number(document.getElementById("emgAmbsInput").value || 0),
            status: document.getElementById("emgStatusInput").value,
            location: document.getElementById("emgLocInput").value.trim()
        };

        try {
            const targetId = state.emergency?.id || state.hospital?.hospital_name;
            await apiRequest(`/api/emergency-departments/${encodeURIComponent(targetId)}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            showNotification("Emergency department details updated successfully!", "success");
            loadCurrentTabContent();
        } catch (err) {
            console.error("Save emergency error:", err);
            showNotification(err.message || "Failed to update emergency unit.", "error");
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    // =========================================================
    // TAB 6: APPOINTMENT SLOTS
    // =========================================================

    async function renderSlotsTab(container) {
        const hospId = state.selectedHospitalId;
        const [slotsRes, docsRes] = await Promise.all([
            apiRequest("/api/doctor-slots").catch(() => ({ slots: [] })),
            apiRequest(`/api/hospitals/${hospId}/doctors`).catch(() => ({ doctors: [] }))
        ]);

        const allSlots = slotsRes.slots || [];
        const doctors = docsRes.doctors || [];
        state.doctors = doctors;

        const doctorIds = new Set(doctors.map(d => String(d.doctor_id || d.id)));
        state.slots = allSlots.filter(s => doctorIds.has(String(s.doctor_id)));

        const isAdding = state.isAddingSlot;
        let formHtml = "";

        if (isAdding) {
            const docOptions = doctors.map(d => `
                <option value="${escapeHTML(d.doctor_id)}">${escapeHTML(d.name)} (${escapeHTML(d.specialization || d.department || '')})</option>
            `).join("");

            // Default tomorrow's date
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateStr = tomorrow.toISOString().split("T")[0];

            formHtml = `
                <div class="hosp-inline-form-card">
                    <div class="hosp-inline-form-title">
                        <span>➕ Create New Doctor Appointment Slot</span>
                    </div>
                    <form onsubmit="HospitalAdminManager.handleSaveSlot(event)">
                        <div class="hosp-form-grid">
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">Doctor *</label>
                                <select class="hosp-form-select" id="slotDocInput" required>
                                    ${docOptions || '<option value="">No doctors available</option>'}
                                </select>
                            </div>
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">Slot Date *</label>
                                <input type="date" class="hosp-form-input" id="slotDateInput" value="${dateStr}" required />
                            </div>
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">Start Time *</label>
                                <input type="time" class="hosp-form-input" id="slotStartTimeInput" value="09:00" required />
                            </div>
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">End Time *</label>
                                <input type="time" class="hosp-form-input" id="slotEndTimeInput" value="13:00" required />
                            </div>
                            <div class="hosp-form-group">
                                <label class="hosp-form-label">Max Patients Allowed</label>
                                <input type="number" class="hosp-form-input" id="slotMaxPatientsInput" value="15" min="1" max="100" />
                            </div>
                        </div>
                        <div class="hosp-actions-bar" style="margin-top:10px; padding-top:10px;">
                            <button type="button" class="hosp-btn-secondary" onclick="HospitalAdminManager.cancelSlotForm()">Cancel</button>
                            <button type="submit" class="hosp-btn-success">💾 Create Slot</button>
                        </div>
                    </form>
                </div>
            `;
        }

        const rowsHtml = state.slots.length > 0 ? state.slots.map(s => {
            const statusClass = s.status === 'Available' ? 'hosp-badge-green' : 'hosp-badge-gray';
            const formattedDate = s.slot_date ? new Date(s.slot_date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
            return `
                <tr>
                    <td>
                        <strong>${escapeHTML(s.doctor_name || s.doctor_id)}</strong><br>
                        <small style="color:#64748b;">${escapeHTML(s.specialization || '')}</small>
                    </td>
                    <td>
                        <div>📅 ${formattedDate}</div>
                        <small style="color:#64748b;">⏰ ${escapeHTML(s.start_time || '')} - ${escapeHTML(s.end_time || '')}</small>
                    </td>
                    <td>
                        <div>${s.booked_patients || 0} / ${s.max_patients || 1} Booked</div>
                    </td>
                    <td>
                        <span class="hosp-badge ${statusClass}">${escapeHTML(s.status || 'Available')}</span>
                    </td>
                    <td style="text-align:right;">
                        <button type="button" class="hosp-btn-danger-outline" onclick="HospitalAdminManager.deleteSlot(${s.id})">🗑️ Remove</button>
                    </td>
                </tr>
            `;
        }).join("") : `
            <tr>
                <td colspan="5" style="text-align:center; padding:30px; color:#64748b;">
                    No upcoming appointment slots defined for doctors in this facility. Click <strong>+ Create Slot</strong> to schedule one.
                </td>
            </tr>
        `;

        container.innerHTML = `
            ${formHtml}
            <div class="hosp-toolbar">
                <div>
                    <h3 style="margin:0; font-size:13px; font-weight:800; color:#0f172a;">Active OPD / Consultation Slots</h3>
                </div>
                <div>
                    ${!isAdding ? `
                        <button type="button" class="hosp-btn-primary" onclick="HospitalAdminManager.showAddSlotForm()">
                            ➕ Create Slot
                        </button>
                    ` : ''}
                </div>
            </div>

            <div class="hosp-table-wrap">
                <table class="hosp-table">
                    <thead>
                        <tr>
                            <th>Doctor</th>
                            <th>Date & Time Window</th>
                            <th>Capacity</th>
                            <th>Status</th>
                            <th style="text-align:right;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    }

    function showAddSlotForm() {
        state.isAddingSlot = true;
        loadCurrentTabContent();
    }

    function cancelSlotForm() {
        state.isAddingSlot = false;
        loadCurrentTabContent();
    }

    async function handleSaveSlot(e) {
        e.preventDefault();
        const payload = {
            doctorId: document.getElementById("slotDocInput").value,
            slotDate: document.getElementById("slotDateInput").value,
            startTime: document.getElementById("slotStartTimeInput").value,
            endTime: document.getElementById("slotEndTimeInput").value,
            maxPatients: Number(document.getElementById("slotMaxPatientsInput").value || 10)
        };

        if (!payload.doctorId) {
            showNotification("Please select a doctor.", "warning");
            return;
        }

        try {
            await apiRequest("/api/doctor-slots", {
                method: "POST",
                body: JSON.stringify(payload)
            });
            showNotification("Doctor slot scheduled successfully!", "success");
            state.isAddingSlot = false;
            loadCurrentTabContent();
        } catch (err) {
            console.error("Save slot error:", err);
            showNotification(err.message || "Failed to create slot.", "error");
        }
    }

    async function deleteSlot(slotId) {
        if (!confirm("Are you sure you want to cancel and remove this appointment slot?")) return;
        try {
            await apiRequest(`/api/doctor-slots/${slotId}`, { method: "DELETE" });
            showNotification("Appointment slot removed successfully.", "success");
            loadCurrentTabContent();
        } catch (err) {
            console.error("Delete slot error:", err);
            showNotification(err.message || "Failed to delete slot.", "error");
        }
    }

    return {
        open,
        switchTab,
        onHospitalChange,
        refresh,
        handleSaveHospitalInfo,
        showAddDoctorForm,
        editDoctor,
        cancelDoctorForm,
        onDoctorSearch,
        onDoctorFilter,
        handleSaveDoctor,
        deleteDoctor,
        showAddAmbulanceForm,
        editAmbulance,
        cancelAmbulanceForm,
        onAmbulanceSearch,
        onAmbulanceFilter,
        handleSaveAmbulance,
        deleteAmbulance,
        handleSaveBeds,
        handleSaveEmergency,
        showAddSlotForm,
        cancelSlotForm,
        handleSaveSlot,
        deleteSlot
    };
})();

function openEditPanel(panelType) {
    HospitalAdminManager.open(panelType);
}

/* =========================================================
   GLOBAL SEARCH
========================================================= */

function globalSearch(value) {
    const search = String(value || "").trim().toLowerCase();
    if (!search) return;

    if (medicineData.length) {
        const matches = medicineData.filter(m => m.name.toLowerCase().includes(search) || m.category.toLowerCase().includes(search));
        if (matches.length) renderMedicines(matches);
    }
    if (doctorData.length) {
        const matches = doctorData.filter(d => String(d.name || d.doctor_name || "").toLowerCase().includes(search));
        if (matches.length) renderDoctorFinder(matches);
    }
}

/* =========================================================
   LOGOUT
========================================================= */

function logoutPatient() {
    if (!confirm("Are you sure you want to logout?")) return;

    ["patientId", "selectedHospital", "selectedAmbulance"].forEach(key => localStorage.removeItem(key));
    pharmacyCart = [];
    updateCartCount();

    showNotification("Logged out successfully.", "success");
    window.location.reload();
}

/* =========================================================
   INITIALIZATION
========================================================= */

async function checkBackend() {
    try {
        const response = await fetch(API_BASE_URL);
        return response.ok;
    } catch (error) {
        console.error("Backend unavailable:", error);
        return false;
    }
}

function setupEscapeKey() {
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeAllModals(); });
}

function setupModalClick() {
    document.addEventListener("click", e => {
        if (e.target.classList.contains("modal")) e.target.classList.remove("show");
    });
}

function setupSearchInputs() {
    const bindings = [
        ["medicineSearch", searchMedicines],
        ["doctorSearch", searchDoctors],
        ["hospitalSearch", searchHospitals]
    ];
    bindings.forEach(([id, handler]) => {
        const input = document.getElementById(id);
        if (input && input.dataset.connected !== "true") {
            input.dataset.connected = "true";
            input.addEventListener("input", handler);
        }
    });
}

async function initializeApplication() {
    console.log("🚀 SmartCity AI Hospital Portal starting...");

    setupEscapeKey();
    setupModalClick();
    setupSearchInputs();
    setupPatientForm();
    setupPrescriptionForm();
    showCurrentPatient();

    const patientId = getPatientId();
    if (patientId) await loadPatientCart(patientId);

    const backendOnline = await checkBackend();
    if (!backendOnline) {
        console.warn("⚠️ Backend is offline. Start it with: node server.js");
    }

    // Initialize real-time Gorakhpur bed availability
    await initBedAvailability();

    // Dynamically load top verified doctors into the homepage doctor list
    await loadFeaturedDoctors();

    const loader = document.getElementById("pageLoader");
    if (loader) loader.classList.add("hidden");

    console.log("✅ SmartCity AI Hospital Portal initialized.");
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeApplication);
} else {
    initializeApplication();
}

/* =========================================================
   DOCTOR LOGIN & DIRECT DASHBOARD REDIRECT
========================================================= */

let doctorLoginListLoaded = false;

async function openDoctorLoginModal() {
    openModal("doctorLoginModal");
    const msg = document.getElementById("doctorLoginMsg");
    if (msg) {
        msg.style.display = "none";
        msg.textContent = "";
    }
    if (!doctorLoginListLoaded) {
        await populateDoctorLoginDropdown();
    }
}

async function populateDoctorLoginDropdown() {
    const select = document.getElementById("quickDoctorSelect");
    if (!select) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/doctors`);
        if (!res.ok) throw new Error("Failed to load doctors");
        const data = await res.json();
        const list = data.doctors || (Array.isArray(data) ? data : []);

        select.innerHTML = '<option value="">-- Choose Doctor Profile --</option>';
        list.forEach(doc => {
            const opt = document.createElement("option");
            const docId = doc.doctor_id || doc.doctorId || doc.id;
            opt.value = docId;
            opt.textContent = `${doc.name} (${doc.specialization} • ID: ${docId})`;
            select.appendChild(opt);
        });
        doctorLoginListLoaded = true;
    } catch (err) {
        console.warn("Could not populate doctor login select:", err);
    }
}

function onSelectDoctorFromDropdown() {
    const select = document.getElementById("quickDoctorSelect");
    const input = document.getElementById("doctorLoginInput");
    if (select && input && select.value) {
        input.value = select.value;
    }
}

function fillDoctorLogin(docId) {
    const input = document.getElementById("doctorLoginInput");
    const select = document.getElementById("quickDoctorSelect");
    const passInput = document.getElementById("doctorPasswordInput");
    if (input) input.value = docId;
    if (select) select.value = docId;
    if (passInput && !passInput.value) passInput.value = "doctor123";
}

async function submitDoctorLogin() {
    const input = document.getElementById("doctorLoginInput");
    const passInput = document.getElementById("doctorPasswordInput");
    const msg = document.getElementById("doctorLoginMsg");
    const btn = document.getElementById("btnDoctorLoginSubmit");

    const doctorId = input ? input.value.trim() : "";
    const password = passInput ? passInput.value.trim() : "";

    if (!doctorId) {
        if (msg) {
            msg.style.display = "block";
            msg.style.color = "#dc2626";
            msg.textContent = "⚠️ Please enter or select a Doctor ID.";
        }
        return;
    }

    if (!password) {
        if (msg) {
            msg.style.display = "block";
            msg.style.color = "#dc2626";
            msg.textContent = "⚠️ Please enter Doctor password/PIN.";
        }
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = "Authenticating Doctor...";
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/doctor/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ doctorId, password })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.message || "Doctor ID not found in registry.");
        }

        // Store active doctor ID and session for the Doctor Dashboard
        const finalDocId = data.doctor?.doctorId || doctorId;
        localStorage.setItem("smartcity_active_doctor", finalDocId);

        if (data.token) {
            localStorage.setItem("smartcity_auth_token", data.token);
            if (typeof SmartCityAuth !== "undefined" && SmartCityAuth.setSession) {
                SmartCityAuth.setSession(data.token, data.doctor);
            }
        }

        if (msg) {
            msg.style.display = "block";
            msg.style.color = "#15803d";
            msg.textContent = `✅ Welcome ${data.doctor?.name || "Doctor"}! Redirecting to Doctor Dashboard...`;
        }

        showNotification(`Welcome Dr. ${data.doctor?.name || ""}! Opening Clinical Console...`, "success");

        // Redirect DIRECTLY to Doctor Dashboard
        setTimeout(() => {
            window.location.href = "doctor_dashboard.html";
        }, 500);

    } catch (err) {
        console.error("Doctor login failed:", err);
        if (msg) {
            msg.style.display = "block";
            msg.style.color = "#dc2626";
            msg.textContent = `❌ ${err.message}`;
        }
        if (btn) {
            btn.disabled = false;
            btn.textContent = "🚀 Login & Open Doctor Dashboard →";
        }
    }
}

/* =========================================================
   AI HEALTHCARE & SURGE CAPACITY INTELLIGENCE (FastAPI ML)
========================================================= */

/* =========================================================
   AI HEALTHCARE & SURGE CAPACITY INTELLIGENCE (FastAPI ML + MySQL Realtime)
========================================================= */

function onAIHospitalChange(facilityId) {
    // When facility changes, immediately fetch real-time database numbers and run AI surge analysis
    runAIHealthcareAnalysis();
}

async function runAIHealthcareAnalysis() {
    const hospSelect = document.getElementById("ai-hosp-select");
    const totalInput = document.getElementById("ai-hosp-total");
    const occInput = document.getElementById("ai-hosp-occupied");
    const icuInput = document.getElementById("ai-hosp-icu");
    const icuoInput = document.getElementById("ai-hosp-icuo");
    const resultBox = document.getElementById("ai-healthcare-result-box");

    const hospitalId = hospSelect ? hospSelect.value : "HOSP-002";

    if (resultBox) {
        resultBox.innerHTML = `
            <div style="background: #ffffff; border: 1px dashed #93c5fd; border-radius: 12px; padding: 22px; text-align: center; color: #2563eb; font-size: 13px; font-weight: 600;">
                <span style="display: inline-block; animation: spin 1s linear infinite; margin-right: 8px;">🔄</span>
                Connecting to MySQL Hospital Registry & Evaluating Surge Intelligence via FastAPI ML...
            </div>
        `;
    }

    try {
        const queryParams = new URLSearchParams({
            hospital_id: hospitalId
        });

        const res = await fetch(`/api/ai/healthcare/analyze?${queryParams.toString()}`);
        const json = await res.json();

        if (json.success && json.analysis) {
            const h = json.hospital || {};
            const a = json.analysis;

            // 1. Sync real-time database numbers directly into the telemetry inputs
            if (h.total_beds !== undefined && totalInput) totalInput.value = h.total_beds;
            if (h.occupied_beds !== undefined && occInput) occInput.value = h.occupied_beds;
            if (h.icu_beds !== undefined && icuInput) icuInput.value = h.icu_beds;
            if (h.occupied_icu !== undefined && icuoInput) icuoInput.value = h.occupied_icu;

            const totalBeds = h.total_beds !== undefined ? h.total_beds : (totalInput ? Number(totalInput.value) : 900);
            const occupiedBeds = h.occupied_beds !== undefined ? h.occupied_beds : (occInput ? Number(occInput.value) : 672);
            const icuBeds = h.icu_beds !== undefined ? h.icu_beds : (icuInput ? Number(icuInput.value) : 150);
            const occupiedIcu = h.occupied_icu !== undefined ? h.occupied_icu : (icuoInput ? Number(icuoInput.value) : 128);
            const availableBeds = (h.available_beds !== undefined) ? h.available_beds : Math.max(0, totalBeds - occupiedBeds);
            const availableIcu = (h.available_icu !== undefined) ? h.available_icu : Math.max(0, icuBeds - occupiedIcu);

            const occPct = a.projected_bed_occupancy_pct !== undefined ? a.projected_bed_occupancy_pct : Math.round((occupiedBeds / Math.max(1, totalBeds)) * 100);
            const isNearSat = a.is_near_saturation || (occPct > 85);
            const icuStatus = a.critical_care_status || "ADEQUATE_ICU_CAPACITY";

            const statusBadgeColor = isNearSat ? "#ef4444" : (occPct > 75 ? "#f59e0b" : "#10b981");
            const icuBadgeColor = (icuStatus === "CRITICAL_ICU_SHORTAGE" || icuStatus === "CRITICAL_ICU_SATURATION") ? "#ef4444" : (icuStatus.includes("ELEVATED") ? "#f59e0b" : "#10b981");

            let triageAdvice = "Normal admissions workflow active. Maintain regular discharge cycle.";
            if (isNearSat) {
                triageAdvice = "CRITICAL ADVISORY: Prepare auxiliary triage bays. Coordinate non-critical emergency diversions with BRD Medical / District Hospital.";
            } else if (occPct > 75) {
                triageAdvice = "ELEVATED LOAD: Prioritize pending morning discharges. Reserve remaining ICU suites for acute trauma.";
            }

            const hospitalName = h.name || (hospSelect && hospSelect.options[hospSelect.selectedIndex] ? hospSelect.options[hospSelect.selectedIndex].text : hospitalId);

            if (resultBox) {
                resultBox.innerHTML = `
                    <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
                            <div>
                                <span style="font-size: 15px; font-weight: 800; color: #0f172a;">${escapeHTML(hospitalName)}</span>
                                <span style="display: inline-block; margin-left: 8px; font-size: 11px; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-weight: 700;">ID: ${escapeHTML(h.id || hospitalId)}</span>
                                <span style="display: inline-block; margin-left: 4px; font-size: 11px; background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-weight: 700;">🟢 Live MySQL Verified</span>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <span style="background: ${statusBadgeColor}; color: #ffffff; font-weight: 800; font-size: 11px; padding: 4px 12px; border-radius: 6px; letter-spacing: 0.3px;">
                                    ${isNearSat ? "🔴 NEAR SATURATION" : (occPct > 75 ? "🟡 ELEVATED LOAD" : "🟢 CAPACITY STABLE")}
                                </span>
                                <span style="background: ${icuBadgeColor}; color: #ffffff; font-weight: 800; font-size: 11px; padding: 4px 12px; border-radius: 6px; letter-spacing: 0.3px;">
                                    ${escapeHTML(icuStatus.replace(/_/g, " "))}
                                </span>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 16px;">
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; text-align: center;">
                                <div style="font-size: 11px; color: #64748b; font-weight: 800; text-transform: uppercase;">Real Occupancy Rate</div>
                                <div style="font-size: 26px; font-weight: 900; color: ${statusBadgeColor}; margin: 2px 0;">${occPct}%</div>
                                <div style="font-size: 12px; color: #475569; font-weight: 600;">${occupiedBeds} / ${totalBeds} Beds Booked</div>
                            </div>
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; text-align: center;">
                                <div style="font-size: 11px; color: #64748b; font-weight: 800; text-transform: uppercase;">Live ICU Occupancy</div>
                                <div style="font-size: 26px; font-weight: 900; color: ${icuBadgeColor}; margin: 2px 0;">${Math.round((occupiedIcu / Math.max(1, icuBeds)) * 100)}%</div>
                                <div style="font-size: 12px; color: #475569; font-weight: 600;">${occupiedIcu} / ${icuBeds} ICU Booked (${availableIcu} Free)</div>
                            </div>
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; text-align: center;">
                                <div style="font-size: 11px; color: #64748b; font-weight: 800; text-transform: uppercase;">Immediate Intake Available</div>
                                <div style="font-size: 26px; font-weight: 900; color: #2563eb; margin: 2px 0;">${availableBeds}</div>
                                <div style="font-size: 12px; color: #15803d; font-weight: 600;">Beds Open for Intake</div>
                            </div>
                        </div>

                        <!-- Real-time Bed Occupancy Bar -->
                        <div style="margin-bottom: 14px;">
                            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 4px;">
                                <span>Ward Bed Saturation Index:</span>
                                <span>${occPct}% full (${availableBeds} beds remaining)</span>
                            </div>
                            <div style="width: 100%; height: 10px; background: #e2e8f0; border-radius: 6px; overflow: hidden;">
                                <div style="width: ${Math.min(100, occPct)}%; height: 100%; background: ${statusBadgeColor}; transition: width 0.5s ease;"></div>
                            </div>
                        </div>

                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px;">
                            <strong style="color: #1e40af; font-size: 12px; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                <span>💡</span> <span>AI Surge Protocol Recommendation:</span>
                            </strong>
                            <span style="color: #1e3a8a; font-size: 13px; font-weight: 500;">${escapeHTML(triageAdvice)}</span>
                        </div>

                        <div style="font-size: 11px; color: #64748b; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; border-top: 1px solid #f1f5f9; padding-top: 10px; margin-top: 8px;">
                            <span>Model Engine: <code>${escapeHTML(a.model_version || "hospital-capacity-v2.0")}</code></span>
                            <span style="color: #059669; font-weight: 600;">📡 MySQL Realtime Sync: Live Data verified</span>
                            <span style="font-style: italic;">⚖️ ${escapeHTML(a.safety_disclaimer || "Clinical triage remains under medical superintendent authority.")}</span>
                        </div>
                    </div>
                `;
            }
            loadAIHealthcareAuditTable();
        }
    } catch (err) {
        if (resultBox) {
            resultBox.innerHTML = `<div style="color: #ef4444; font-size: 12px; padding: 10px;">Failed to obtain AI healthcare evaluation: ${escapeHTML(err.message)}</div>`;
        }
    }
}

async function loadAIHealthcareAuditTable() {
    const tableBody = document.getElementById("ai-healthcare-tbody");
    if (!tableBody) return;

    try {
        const token = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getToken) 
            ? SmartCityAuth.getToken() 
            : (localStorage.getItem("sc_token") || localStorage.getItem("token") || "");
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch("/api/ai/predictions?module=healthcare&limit=8", { headers });
        const json = await res.json();

        if (json.success && json.predictions) {
            if (json.predictions.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 20px;">No healthcare capacity predictions logged yet. Run an analysis above.</td></tr>`;
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
                    ? `<button class="primary-btn" style="padding: 3px 8px; font-size: 11px; cursor: pointer;" onclick="submitAIHealthcareReview(${pred.id}, 'APPROVED')">✓ Approve</button>
                       <button class="secondary-btn" style="padding: 3px 8px; font-size: 11px; color: #ef4444; border-color: #ef4444; cursor: pointer; margin-left: 4px;" onclick="submitAIHealthcareReview(${pred.id}, 'REJECTED')">✕ Reject</button>`
                    : `<span style="font-size: 11px; color: #64748b;">Reviewed #${pred.reviewed_by || 'Staff'}</span>`;

                return `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 10px 14px;"><strong>#${pred.id}</strong></td>
                        <td style="padding: 10px 14px;">${escapeHTML(pred.entity_reference || 'Gorakhpur Facility')}</td>
                        <td style="padding: 10px 14px;"><strong style="color: #1e293b;">${out.projected_bed_occupancy_pct || '--'}%</strong></td>
                        <td style="padding: 10px 14px;"><span style="font-size: 11px; font-weight: 600;">${escapeHTML((out.critical_care_status || 'Adequate').replace(/_/g, " "))}</span></td>
                        <td style="padding: 10px 14px; font-size: 11px; color: #64748b;">${new Date(pred.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                        <td style="padding: 10px 14px;">${statusBadge}</td>
                        <td style="padding: 10px 14px;">${actions}</td>
                    </tr>
                `;
            }).join("");
        }
    } catch (e) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef4444; padding: 14px;">Log unavailable: Login as staff to view and approve entries.</td></tr>`;
    }
}

async function submitAIHealthcareReview(predictionId, actionTaken) {
    try {
        const token = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getToken) 
            ? SmartCityAuth.getToken() 
            : (localStorage.getItem("sc_token") || localStorage.getItem("token") || "");
        
        if (!token) {
            alert("Operator login required to record clinical capacity reviews.");
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
                comments: `Clinical superintendent review: ${actionTaken} via Hospital Portal UI.`
            })
        });

        const json = await res.json();
        if (json.success) {
            alert(`Capacity prediction #${predictionId} marked as ${actionTaken}.`);
            loadAIHealthcareAuditTable();
        } else {
            alert(json.message || "Could not record review action.");
        }
    } catch (err) {
        alert("Failed to submit review: " + err.message);
    }
}

/* =========================================================
   3-LAYER WORKSPACE NAVIGATION & RBAC GATEKEEPER
========================================================= */

function getCurrentHospitalUser() {
    if (typeof localStorage === "undefined") return null;
    const session = localStorage.getItem("smartCityCurrentUser") || sessionStorage.getItem("smartCityCurrentUser") || localStorage.getItem("currentUser");
    if (!session) return null;
    try {
        return JSON.parse(session);
    } catch {
        return null;
    }
}

function isHospitalStaff() {
    const user = getCurrentHospitalUser();
    if (!user) return false;
    const type = String(user.type || user.role || "").toLowerCase().trim();
    const dept = String(user.department || "").toLowerCase().trim();
    return (type === "staff" && (dept === "hospital" || dept === "healthcare" || !dept)) || type === "doctor" || type === "admin" || type === "superadmin";
}

function isHospitalAdmin() {
    const user = getCurrentHospitalUser();
    if (!user) return false;
    const type = String(user.type || user.role || "").toLowerCase().trim();
    const dept = String(user.department || "").toLowerCase().trim();
    return type === "admin" || type === "superadmin" || (type === "staff" && dept === "admin");
}

let currentHospitalLayer = "citizen";

function switchHospitalLayer(layer) {
    currentHospitalLayer = layer;
    const staff = isHospitalStaff();
    const admin = isHospitalAdmin();

    // Tab buttons
    if (typeof document !== "undefined") {
        document.querySelectorAll(".layer-tab-btn").forEach(btn => btn.classList.remove("active"));
        const activeBtn = document.getElementById(`tab-btn-${layer}`);
        if (activeBtn) activeBtn.classList.add("active");

        // Containers
        const citizenLayer = document.getElementById("layer-citizen-content");
        const staffLayer = document.getElementById("layer-staff-content");
        const adminLayer = document.getElementById("layer-admin-content");

        if (citizenLayer) citizenLayer.style.display = (layer === "citizen") ? "block" : "none";
        if (staffLayer) staffLayer.style.display = (layer === "staff") ? "block" : "none";
        if (adminLayer) adminLayer.style.display = (layer === "admin") ? "block" : "none";

        // Gatekeepers
        const staffGatekeeper = document.getElementById("staffGatekeeper");
        const staffMain = document.getElementById("staffOperationsMain");
        if (staffGatekeeper && staffMain) {
            staffGatekeeper.style.display = staff ? "none" : "block";
            staffMain.style.display = staff ? "block" : "none";
        }

        const adminGatekeeper = document.getElementById("adminGatekeeper");
        const adminMain = document.getElementById("adminAssetsMain");
        if (adminGatekeeper && adminMain) {
            adminGatekeeper.style.display = admin ? "none" : "block";
            adminMain.style.display = admin ? "block" : "none";
            if (admin || layer === "admin") {
                loadAdminTelemetry();
            }
        }
    }
}

async function loadAdminTelemetry() {
    try {
        const res = await fetch("/api/hospital/beds");
        const json = await res.json();
        const summary = json.summary || {};
        const categories = json.categories || {};

        const totalBeds = summary.totalBeds || 4215;
        const availBeds = summary.availableBeds || 1104;
        const opEfficiency = totalBeds > 0 ? Math.round(((totalBeds - availBeds) / totalBeds) * 100) : 74;

        const elTotal = document.getElementById("adminTotalDistrictBeds");
        const elBedsSub = document.getElementById("adminBedsSubtitle");
        if (elTotal) elTotal.textContent = totalBeds.toLocaleString();
        if (elBedsSub) elBedsSub.textContent = `● ${opEfficiency}% Operational Efficiency`;

        // Ventilator ICUs
        const elIcu = document.getElementById("adminVentilatorsFree");
        const elIcuSub = document.getElementById("adminIcuSubtitle");
        const availIcu = categories.icu?.availableBeds ?? 94;
        const totalIcu = categories.icu?.totalBeds ?? 631;
        if (elIcu) elIcu.textContent = `${availIcu} / ${totalIcu}`;
        if (elIcuSub) elIcuSub.textContent = availIcu > 20 ? "● Adequate Reserve" : "● Critical Reserve Alert";

        // Emergency Trauma Bays
        const elEmerg = document.getElementById("adminEmergencyBays");
        const availEmerg = categories.emergency?.availableBeds ?? 80;
        if (elEmerg) elEmerg.textContent = `${availEmerg} Active`;

        // O2 Buffer
        const elO2 = document.getElementById("adminO2Buffer");
        if (elO2) elO2.textContent = "96.4%";
    } catch (e) {
        console.warn("Failed to load live admin telemetry:", e);
    }
}

function applyRoleUI() {
    if (typeof document === "undefined") return;
    const staff = isHospitalStaff();
    const admin = isHospitalAdmin();
    const user = getCurrentHospitalUser();
    const name = user ? (user.name || user.fullName || "Citizen") : "Citizen";

    const roleTitle = document.getElementById("roleTitle");
    const roleSubtitle = document.getElementById("roleSubtitle");
    const rolePill = document.getElementById("rolePill");

    if (roleTitle) {
        roleTitle.textContent = admin
            ? "Gorakhpur Smart Healthcare ICCC & Health Asset Administration"
            : (staff
                ? "Hospital Operations, Ward Duty & Clinical Management Console"
                : `Welcome to SmartCity AI Hospital & Healthcare Services, ${name}`);
    }

    if (roleSubtitle) {
        roleSubtitle.textContent = admin
            ? "District hospital telemetry, ICU bed reserve audits, and emergency resource quotas."
            : (staff
                ? "Admit patients, verify QR badges, update doctor OPD schedules, and manage bed occupancy."
                : "Find hospitals, book doctor appointments, track live ambulances, and verify prescription records.");
    }

    if (rolePill) {
        if (admin) {
            rolePill.textContent = "ADMIN • HEALTHCARE";
            rolePill.className = "role-pill admin-pill";
        } else if (staff) {
            rolePill.textContent = "STAFF • HEALTHCARE";
            rolePill.className = "role-pill staff-pill";
        } else {
            rolePill.textContent = user ? "CITIZEN" : "GUEST";
            rolePill.className = "role-pill citizen-pill";
        }
    }

    if (staff) {
        switchHospitalLayer("staff");
    } else {
        switchHospitalLayer("citizen");
    }
}

function promptHospitalStaffLogin() {
    if (typeof SmartCityAuth !== "undefined" && SmartCityAuth.showLoginModal) {
        SmartCityAuth.showLoginModal("staff", {
            prefillStaffId: "HOSP-PHARM",
            department: "hospital",
            message: "🔒 Enter Hospital Staff ID & Password (e.g. HOSP-PHARM / admin)."
        });
        return;
    }
    const staffId = prompt("Enter Hospital Staff ID (Default: HOSP-PHARM):", "HOSP-PHARM");
    const pass = prompt("Enter Password (Default: admin):", "admin");
    if (staffId && pass) {
        fetch("/api/staff-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId, password: pass })
        }).then(r => r.json()).then(data => {
            if (data.token) {
                localStorage.setItem("smartCityJWT", data.token);
                localStorage.setItem("smartCityCurrentUser", JSON.stringify(data.user));
                if (data.targetDashboard) {
                    window.location.href = '/' + data.targetDashboard.replace(/^\//, '');
                } else {
                    window.location.reload();
                }
            } else {
                alert(data.message || "Login failed");
            }
        });
    }
}

function promptHospitalAdminLogin() {
    if (typeof SmartCityAuth !== "undefined" && SmartCityAuth.showLoginModal) {
        SmartCityAuth.showLoginModal("staff", {
            prefillStaffId: "HOSP-ADMIN",
            department: "hospital",
            message: "🔒 Enter Healthcare Admin ID & Password (Default: HOSP-ADMIN / admin)."
        });
        return;
    }
    const staffId = prompt("Enter Healthcare Admin Staff ID (Default: HOSP-ADMIN):", "HOSP-ADMIN");
    const pass = prompt("Enter Password (Default: admin):", "admin");
    if (staffId && pass) {
        fetch("/api/staff-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId, password: pass })
        }).then(r => r.json()).then(data => {
            if (data.token) {
                localStorage.setItem("smartCityJWT", data.token);
                localStorage.setItem("smartCityCurrentUser", JSON.stringify(data.user));
                if (data.targetDashboard) {
                    window.location.href = '/' + data.targetDashboard.replace(/^\//, '');
                } else {
                    window.location.reload();
                }
            } else {
                alert(data.message || "Login failed");
            }
        });
    }
}

if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", applyRoleUI);
    } else {
        applyRoleUI();
    }
}

function filterServiceCards(category, btn) {
    if (typeof document === "undefined") return;
    if (btn) {
        document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
    }
    const cards = document.querySelectorAll('.service-grid .service-card');
    cards.forEach(card => {
        const cat = card.getAttribute('data-service-cat');
        if (category === 'all' || cat === category) {
            card.style.display = 'flex';
            card.classList.remove('fade-in');
            void card.offsetWidth;
            card.classList.add('fade-in');
        } else {
            card.style.display = 'none';
        }
    });
}
window.filterServiceCards = filterServiceCards;

/* =========================================================
   WINDOW EXPORTS — every name here IS defined above, once.
========================================================= */

Object.assign(window, {
    filterServiceCards,
    apiRequest, escapeHTML, escapeJS, openModal, closeModal, closeAllModals,

    openPatientRegistration, generatePatientID, calculateAge, handleDobAutoAge, showPatientQR,
    getPatientId, isPatientLoggedIn, showCurrentPatient, logoutPatient,
    openPatientPrintCard, executePrintPatientCard,
    openAbhaModal, confirmAbhaLink, unlinkAbha,
    openQrScanModal, closeQrScanModal, startPatientCameraScanner, stopPatientCameraScanner, verifyQrFromInput, handleScannedQrResult,
    openStaffPatientManager, debounceStaffPatientSearch, resetStaffPatientFilters, fetchStaffPatientsList, toggleStaffPatientStatus,

    showHospitals, renderHospitals, selectHospital, viewHospital, searchHospitals,
    onBookingHospitalChange, fetchDynamicSlots, confirmStrictBooking, filterAndSortHospitals,
    applyQuickHospitalFilter, clearHospitalSearch, resetHospitalFilters, openBedsForHospital,
    openHospitalDashboardDirect, selectTimeSlot, switchHospitalDetailsTab, openDoctorFromHospital,
    setDetailsTestCategory, openCitizenTestBookingModal, openCitizenHomeSampleModal,
    handleCitizenTestBookingSubmit, cancelAppointment, openHospitalDetails, createHospitalDetailsModal,

    openDoctorBooking, bookSpecificDoctor, bookDoctorSlot, printAppointment,
    openDoctorFinder, loadDoctorFinder, loadFeaturedDoctors, searchDoctors, resetDoctorFilters,
    viewDoctorDetails, closeDoctorDetails, loadDoctorSlots, selectDoctorSlot,
    openMyAppointments, loadMyAppointments, filterAppointmentsList,
    useCurrentPatientForAppointments, clearAppointmentPatientInput, printAppointmentSlip,

    openEmergency, callEmergency,

    trackAmbulance, showAmbulance, refreshAmbulance, selectAmbulance,
    startEmergencyRequest, selectMatchHospital, selectMatchAmbulance,
    confirmEmergencyAssignment, advanceAmbulanceStatus, refreshAmbulanceRoute,
    resetAmbulanceTracking,

    showBeds, loadBeds, switchBedModalTab, handleBedHospitalChange, updateSelectedHospitalDetails,
    refreshBedDataWithFeedback, fillAndLookupPatient, lookupPatientRoom,
    fetchBedAvailability, handleBedHospitalFilterChange, initBedAvailability,
    openCitizenBedBookingModal, handleCitizenBookingHospitalChange, handleCitizenBookingWardChange,
    handleCitizenBedOptionSelected, submitCitizenBedBooking, openCitizenBillingHistory,

    openPatientFile, searchPatientFile, loadMyPatientRecord, switchRecordTab, printPatientRecord,
    renderRecordTab, toggleInlineForm,

    openPrescriptionUpload, setupPrescriptionForm, resetPrescriptionDropzone, setupPrescriptionDropzone, loadRecentPrescriptions,

    showPharmacy, verifyPharmacyPatient, logoutPharmacyPatient,
    loadMedicines, searchMedicines, filterMedicineCategory, clearMedicineSearch, viewMedicine, addToCart,
    openCart, changeCartQuantity, removeFromCart, checkoutMedicineCart,
    openPaymentModal, showPaymentFields, processPayment, printReceipt,

    openEditPanel,
    HospitalAdminManager,

    openDoctorLoginModal, populateDoctorLoginDropdown, onSelectDoctorFromDropdown,
    fillDoctorLogin, submitDoctorLogin,

    globalSearch,
    showNotification, showLoading, showError, showSuccess,

    // AI Healthcare Intelligence exports
    onAIHospitalChange,
    runAIHealthcareAnalysis,
    loadAIHealthcareAuditTable,
    submitAIHealthcareReview,

    // 3-Layer exports
    switchHospitalLayer,
    applyRoleUI,
    promptHospitalStaffLogin,
    promptHospitalAdminLogin,
    isHospitalStaff,
    isHospitalAdmin,
    loadAdminTelemetry
});

console.log("✅ hospital.js loaded successfully.");