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
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
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
    return doctorData.find(d => String(d.id ?? d.doctor_id) === String(id)) || null;
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
    const icon = type === "success" ? "✅" : type === "error" ? "❌" : type === "warning" ? "⚠️" : "ℹ️";
    const note = document.createElement("div");
    note.className = `notification notification-${type}`;
    note.style.cssText = "min-width:280px;max-width:400px;padding:15px 18px;border-radius:10px;background:#fff;box-shadow:0 5px 20px rgba(0,0,0,.15);font-size:14px;cursor:pointer;";
    note.innerHTML = `<strong>${icon}</strong> <span>${escapeHTML(message)}</span>`;
    note.onclick = () => note.remove();
    container.appendChild(note);
    setTimeout(() => note.remove(), 5000);
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
   HOSPITAL LISTING, SEARCH & SORTING
========================================================= */
async function showHospitals() {
    createHospitalDataModal();
    openModal("hospitalDataModal");
    const result = document.getElementById("hospitalDataResult");
    showLoading(result, "Loading hospitals...");

    try {
        const data = await apiRequest("/api/hospitals");
        hospitalData = data.hospitals || [];
        renderHospitals(hospitalData);
    } catch (error) {
        showError(result, "Unable to load hospitals.");
    }
}

function createHospitalDataModal() {
    if (document.getElementById("hospitalDataModal")) return;
    const modal = document.createElement("div");
    modal.id = "hospitalDataModal";
    modal.className = "modal";
    modal.innerHTML = `
        <div class="modal-box hospital-modal-lg" style="max-width: 960px;">
            <button class="close-btn" onclick="closeModal('hospitalDataModal')">×</button>
            <div class="modal-title-icon">🏥</div>
            <h2>Hospitals</h2>
            <p class="modal-subtitle">Browse hospitals, specialized departments, diagnostics catalog, bed availability, and hospital management dashboards.</p>
            
            <div class="hospital-filter-bar">
                <input type="text" id="hospitalSearch" placeholder="Search by hospital name, address, or type..." oninput="filterAndSortHospitals()">
                <select id="hospitalTypeFilter" onchange="filterAndSortHospitals()">
                    <option value="">All Ownership Types</option>
                    <option value="Government">Government</option>
                    <option value="Autonomous">Autonomous Institute</option>
                    <option value="Private">Private</option>
                </select>
                <select id="hospitalSort" onchange="filterAndSortHospitals()">
                    <option value="name">Sort by Name</option>
                    <option value="beds">Most Available Beds</option>
                    <option value="icu">Most ICU Beds</option>
                    <option value="distance">Nearest to Me</option>
                </select>
            </div>

            <div id="hospitalDataResult"></div>
        </div>
    `;
    document.body.appendChild(modal);
}

function filterAndSortHospitals() {
    const search = (document.getElementById("hospitalSearch")?.value || "").toLowerCase();
    const typeFilter = document.getElementById("hospitalTypeFilter")?.value;
    const sort = document.getElementById("hospitalSort")?.value;

    let filtered = hospitalData.filter(h => {
        const matchesSearch = !search || 
            (h.hospital_name && h.hospital_name.toLowerCase().includes(search)) ||
            (h.address && h.address.toLowerCase().includes(search)) ||
            (h.hospital_type && h.hospital_type.toLowerCase().includes(search));
        const matchesType = !typeFilter || (h.hospital_type && h.hospital_type.includes(typeFilter));
        return matchesSearch && matchesType;
    });

    if (sort === "name") {
        filtered.sort((a, b) => a.hospital_name.localeCompare(b.hospital_name));
    } else if (sort === "beds") {
        filtered.sort((a, b) => (b.total_beds || 0) - (a.total_beds || 0));
    } else if (sort === "icu") {
        filtered.sort((a, b) => (b.icu_beds || 0) - (a.icu_beds || 0));
    } else if (sort === "distance" && HealthcareState.userLocation) {
        filtered.sort((a, b) => {
            const dA = calculateDistance(HealthcareState.userLocation.lat, HealthcareState.userLocation.lng, a.latitude, a.longitude) || 9999;
            const dB = calculateDistance(HealthcareState.userLocation.lat, HealthcareState.userLocation.lng, b.latitude, b.longitude) || 9999;
            return dA - dB;
        });
    }

    renderHospitals(filtered);
}

function renderHospitals(hospitals) {
    const result = document.getElementById("hospitalDataResult");
    if (!result) return;

    if (!hospitals.length) {
        result.innerHTML = `<div class="empty-state"><h3>No Hospitals Found</h3><p>Try adjusting your search filters.</p></div>`;
        return;
    }

    const user = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getUser) ? SmartCityAuth.getUser() : null;

    result.innerHTML = `
        <div class="hospital-cards-grid">
            ${hospitals.map(h => {
                const distance = HealthcareState.userLocation 
                    ? calculateDistance(HealthcareState.userLocation.lat, HealthcareState.userLocation.lng, h.latitude, h.longitude) 
                    : null;
                const emgPercent = h.emergency_beds > 0 ? Math.min(100, Math.round((h.emergency_beds / (h.total_beds || 1)) * 100 * 5)) : 50;
                const isAffiliated = user && (user.hospitalId === h.hospital_id || user.role === "admin");
                const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(h.latitude || 26.7606)},${encodeURIComponent(h.longitude || 83.3732)}`;

                return `
                <div class="pro-hospital-card" style="border: 1px solid #cbd5e1; border-radius: 14px; padding: 18px; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 16px;">
                    <div class="card-header" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px;">
                        <div class="hospital-identity" style="display: flex; align-items: center; gap: 12px;">
                            <div class="hospital-avatar" style="width: 48px; height: 48px; border-radius: 12px; background: #eff6ff; display: flex; align-items: center; justify-content: center; font-size: 24px; border: 1px solid #bfdbfe;">🏥</div>
                            <div>
                                <h3 class="hospital-name" style="font-size: 17px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">${escapeHTML(h.hospital_name)}</h3>
                                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                    <span class="hospital-type-badge" style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 8px; font-size: 11px; font-weight: 700;">${escapeHTML(h.hospital_type || 'General Hospital')}</span>
                                    <span style="font-size: 11px; color: #64748b; font-weight: 600;">Gorakhpur, UP</span>
                                </div>
                            </div>
                        </div>
                        <span class="status-pill active" style="background: #dcfce7; color: #15803d; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 12px;">🚨 24x7 ACTIVE</span>
                    </div>

                    <p class="hospital-address" style="font-size: 13px; color: #475569; margin-bottom: 8px;">
                        📍 ${escapeHTML(h.address || 'Gorakhpur, UP')}
                    </p>

                    <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">
                        <span style="background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">🚨 24x7 Emergency</span>
                        <span style="background: #d1fae5; color: #065f46; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">💊 In-Hospital Pharmacy</span>
                        <span style="background: #ede9fe; color: #5b21b6; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">🔬 Diagnostic Lab & Imaging</span>
                        <span style="background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">🚑 Emergency Ambulances</span>
                    </div>

                    <div class="hospital-contacts" style="display: flex; gap: 14px; font-size: 12px; color: #334155; margin-bottom: 12px; flex-wrap: wrap;">
                        <span>📞 Phone: <strong>${escapeHTML(h.phone || '0551-2207777')}</strong></span>
                        <span class="emergency-tag" style="color: #dc2626; font-weight: 700;">🚨 Emergency: <strong>${escapeHTML(h.emergency_number || '102')}</strong></span>
                        <span>🕒 Hours: <strong>24 Hours (OPD: 09:00 AM - 04:00 PM)</strong></span>
                        ${distance ? `<span class="distance-tag" style="color: #2563eb; font-weight: 700;">🚗 ${distance} km from you</span>` : ''}
                    </div>

                    <div class="card-stats-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: #f8fafc; padding: 10px; border-radius: 10px; margin-bottom: 14px; text-align: center;">
                        <div class="stat-unit">
                            <span class="label" style="display: block; font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Total Beds</span>
                            <span class="val" style="font-size: 15px; font-weight: 800; color: #0f172a;">${Number(h.total_beds || 0)}</span>
                        </div>
                        <div class="stat-unit">
                            <span class="label" style="display: block; font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">ICU Beds</span>
                            <span class="val" style="font-size: 15px; font-weight: 800; color: #2563eb;">${Number(h.icu_beds || 0)}</span>
                        </div>
                        <div class="stat-unit">
                            <span class="label" style="display: block; font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Emergency</span>
                            <span class="val" style="font-size: 15px; font-weight: 800; color: #dc2626;">${Number(h.emergency_beds || 0)}</span>
                        </div>
                        <div class="stat-unit">
                            <span class="label" style="display: block; font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Doctors</span>
                            <span class="val" style="font-size: 15px; font-weight: 800; color: #16a34a;">${Number(h.doctors_count || 12)}</span>
                        </div>
                    </div>

                    <div class="card-actions" style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="details-btn" style="flex: 1; padding: 9px 14px; background: #2563eb; color: #ffffff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;" onclick="viewHospital('${escapeJS(h.hospital_id)}')">
                            🏥 View Hospital
                        </button>
                        ${(typeof SmartCityAuth !== "undefined" && SmartCityAuth.isStaff && SmartCityAuth.isStaff()) ? `
                        <button class="select-btn" style="padding: 9px 14px; background: #0f172a; color: #ffffff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;" onclick="openHospitalDashboardDirect('${escapeJS(h.hospital_id)}')">
                            📊 Hospital Dashboard →
                        </button>
                        ` : ''}
                        <a href="${navUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; justify-content: center; padding: 9px 14px; background: #ffffff; color: #0284c7; border: 1px solid #bae6fd; border-radius: 8px; font-weight: 700; text-decoration: none; cursor: pointer;">
                            🗺️ Navigate
                        </a>
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
    HealthcareState.selectedHospitalId = hospitalId;

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
    container.innerHTML = `
        <div class="slot-grid">
            ${slots.map(s => `
                <button type="button" 
                    class="time-slot-btn ${s.status}" 
                    ${s.status !== 'available' ? 'disabled' : ''}
                    onclick="selectTimeSlot(this, '${s.time}')">
                    ${s.displayTime}
                </button>
            `).join("")}
        </div>
    `;
}

function selectTimeSlot(buttonEl, time24) {
    document.querySelectorAll(".time-slot-btn").forEach(b => b.classList.remove("selected"));
    buttonEl.classList.add("selected");
    HealthcareState.selectedTime = time24;
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
                appointmentTime: HealthcareState.selectedTime
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

function openDoctorBooking() {
    openModal("doctorModal");
    loadDoctorsForBooking();
    resetBookingTimeSlots();
}

/* Used by the static homepage "Book Slot" buttons, which pass a
   doctor NAME string. Real doctor options are loaded async by
   loadDoctorsForBooking(), so we wait briefly then select by name
   and load that doctor's real slots. */
function bookSpecificDoctor(doctorNameOrId) {
    openDoctorBooking();
    setTimeout(() => {
        const select = document.getElementById("doctorSelect");
        if (!select) return;
        const exists = Array.from(select.options).some(opt => opt.value === doctorNameOrId);
        if (exists) {
            select.value = doctorNameOrId;
            loadTimeSlotsForBooking();
        }
    }, 350);
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

    if (!doctors.length) {
        list.innerHTML = `<div class="empty-state"><div>👨‍⚕️</div><h3>No Doctors Found</h3><p>Try a different search or filter.</p></div>`;
        return;
    }

    list.innerHTML = `
        <div class="doctor-grid">
            ${doctors.map(doctor => {
                const id = doctor.id ?? doctor.doctor_id;
                const name = doctor.name || doctor.doctor_name || "Doctor";
                const specialization = doctor.specialization || "Medical Specialist";
                const department = doctor.department || "General";
                const experience = Number(doctor.experience || 0);
                const fee = Number(doctor.consultation_fee || doctor.fee || 0);
                const status = doctor.status || "Available";
                const available = String(status).toLowerCase() === "available";

                return `
                    <div class="doctor-card">
                        <div class="doctor-avatar">👨‍⚕️</div>
                        <h3>${escapeHTML(name)}</h3>
                        <p>🩺 ${escapeHTML(specialization)}</p>
                        <p>🏥 ${escapeHTML(department)}</p>
                        <p>💼 ${experience} years • 💰 ₹${fee}</p>
                        <div class="doctor-status ${available ? "" : "busy-text"}">${available ? "🟢 Available" : "🟠 " + escapeHTML(status)}</div>
                        <div class="doctor-card-actions">
                            <button type="button" onclick="viewDoctorDetails('${escapeJS(id)}')">👁 View Details</button>
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
        const matchesSearch = !search || name.includes(search) || spec.includes(search);
        const matchesDept = !department || (doctor.specialization === department || doctor.department === department);
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

    content.innerHTML = `
        <div class="doctor-profile-card">
            <div class="doctor-avatar">👨‍⚕️</div>
            <h2>${escapeHTML(name)}</h2>
            <p>🩺 ${escapeHTML(doctor.specialization || "Medical Specialist")}</p>
            <div class="doctor-profile-status ${available ? "" : "busy-text"}">${available ? "🟢 Available" : "🟠 " + escapeHTML(status)}</div>
            <hr>
            <div class="doctor-info-grid">
                <div><strong>Department</strong><span>${escapeHTML(doctor.department || "N/A")}</span></div>
                <div><strong>Qualification</strong><span>${escapeHTML(doctor.qualification || "N/A")}</span></div>
                <div><strong>Experience</strong><span>${Number(doctor.experience || 0)} years</span></div>
                <div><strong>Consultation Fee</strong><span>₹${Number(doctor.consultation_fee || doctor.fee || 0)}</span></div>
            </div>
            <hr>
            <h3>📅 Check Appointment Availability</h3>
            <label for="doctorSlotDate">Select Date</label>
            <input type="date" id="doctorSlotDate" onchange="loadDoctorSlots('${escapeJS(doctor.id ?? doctor.doctor_id)}')">
            <div id="doctorSlotsResult" class="doctor-slots-result">
                <div class="empty-state">📅<h3>Select a date</h3><p>Available slots will appear here.</p></div>
            </div>
        </div>
    `;

    const dateInput = document.getElementById("doctorSlotDate");
    dateInput.min = today;
    dateInput.value = today;
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
   MY APPOINTMENTS
========================================================= */

function openMyAppointments() {
    openModal("appointmentsModal");
    const input = document.getElementById("myAppointmentPatientId");
    const savedId = getPatientId();
    if (input && savedId && !input.value) {
        input.value = savedId;
        loadMyAppointments();
    }
}

async function loadMyAppointments() {
    const patientId = document.getElementById("myAppointmentPatientId")?.value.trim();
    const result = document.getElementById("myAppointmentsResult");
    if (!result) return;

    if (!patientId) { showError(result, "Please enter your Patient ID."); return; }
    showLoading(result, "Loading your appointments...");

    try {
        const data = await apiRequest(`/api/appointments/${encodeURIComponent(patientId)}`);
        renderMyAppointments(data.appointments || []);
    } catch (error) {
        console.error("My appointments error:", error);
        showError(result, error.message);
    }
}

function renderMyAppointments(appointments) {
    const result = document.getElementById("myAppointmentsResult");
    if (!result) return;

    if (!appointments.length) {
        result.innerHTML = `<div class="empty-state">📅<h3>No Appointments Found</h3></div>`;
        return;
    }

    const badges = { Confirmed: "🟢", Cancelled: "🔴", Pending: "🟡", Completed: "🔵" };

    result.innerHTML = `
        <div class="my-appointments-list">
            ${appointments.map(appt => {
                const status = appt.status || "Confirmed";
                const badge = badges[status] || "🟢";
                const canCancel = status === "Confirmed" || status === "Pending";
                return `
                    <div class="appointment-card">
                        <h3>👨‍⚕️ ${escapeHTML(appt.doctor || "Doctor")}</h3>
                        <p>📅 ${escapeHTML(String(appt.appointment_date || "").substring(0, 10))} • ⏰ ${escapeHTML(formatSlotTime(appt.appointment_time) || appt.appointment_time || "N/A")}</p>
                        <p>🪪 Appointment ID: ${escapeHTML(String(appt.id))}</p>
                        <div class="appointment-status">${badge} ${escapeHTML(status)}</div>
                        ${canCancel ? `<button type="button" class="danger-btn" onclick="cancelAppointment('${escapeJS(String(appt.id))}')">✕ Cancel Appointment</button>` : ""}
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

async function cancelAppointment(appointmentId) {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
        await apiRequest(`/api/appointments/${encodeURIComponent(appointmentId)}/cancel`, {
            method: "PUT"
        });
        showNotification("Appointment cancelled.", "success");
        await loadMyAppointments();
    } catch (error) {
        console.error("Cancel appointment error:", error);
        showNotification(error.message || "Could not cancel appointment.", "error");
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

function createBedModal() {
    if (document.getElementById("bedModal")) return;
    const modal = document.createElement("div");
    modal.id = "bedModal";
    modal.className = "modal";
    modal.innerHTML = `
        <div class="modal-box">
            <button class="close-btn" onclick="closeModal('bedModal')">×</button>
            <div class="modal-title-icon">🛏️</div>
            <h2>Bed Availability</h2>
            <p class="modal-subtitle">Live bed capacity by hospital.</p>
            <select id="bedHospitalSelect" onchange="loadBeds()"></select>
            <div id="bedResult">Loading...</div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function showBeds() {
    createBedModal();
    openModal("bedModal");

    if (!hospitalData.length) {
        try {
            const data = await apiRequest("/api/hospitals");
            hospitalData = data.hospitals || [];
        } catch (error) {
            showError(document.getElementById("bedResult"), error.message);
            return;
        }
    }

    const select = document.getElementById("bedHospitalSelect");
    if (select && !select.options.length) {
        select.innerHTML = hospitalData.map(h =>
            `<option value="${escapeHTML(h.hospital_id)}">${escapeHTML(h.hospital_name)}</option>`
        ).join("");
    }

    // If the user already picked a hospital elsewhere, default to it
    if (select && selectedHospital?.hospital_id) {
        select.value = selectedHospital.hospital_id;
    }

    loadBeds();
}

async function loadBeds() {
    const result = document.getElementById("bedResult");
    const hospitalId = document.getElementById("bedHospitalSelect")?.value;
    if (!result || !hospitalId) return;

    showLoading(result, "Loading bed availability...");

    try {
        const data = await apiRequest(`/api/hospitals/${encodeURIComponent(hospitalId)}/beds`);
        bedData = data.beds || [];
        renderBeds(bedData);
    } catch (error) {
        console.error("Bed API error:", error);
        showError(result, error.message);
    }
}

function renderBedCategoryCards(beds) {
    if (!beds.length) {
        return `<div class="empty-state">🛏️<h3>No Bed Data Found</h3></div>`;
    }
    return `
        <div class="bed-grid">
            ${beds.map(bed => {
                const total = Number(bed.total_beds || 0);
                const occupied = Number(bed.occupied_beds || 0);
                const available = Math.max(0, total - occupied);
                const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
                return `
                    <div class="bed-card">
                        <h3>${escapeHTML(bed.category || "Beds")}</h3>
                        <div class="bed-stats">
                            <span>Total: <strong>${total}</strong></span>
                            <span>Occupied: <strong>${occupied}</strong></span>
                            <span>Available: <strong>${available}</strong></span>
                        </div>
                        <div class="progress"><i style="width:${pct}%"></i></div>
                        <small>${pct}% occupied</small>
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

function openPrescriptionUpload() {
    openModal("prescriptionModal");
    const savedId = getPatientId();
    const input = document.getElementById("prescriptionPatientId");
    if (input && savedId && !input.value) input.value = savedId;
}

function setupPrescriptionForm() {
    const form = document.getElementById("prescriptionForm");
    if (!form || form.dataset.connected === "true") return;
    form.dataset.connected = "true";

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const patientId = document.getElementById("prescriptionPatientId")?.value.trim();
        const fileInput = document.getElementById("prescriptionFile");
        const file = fileInput?.files?.[0];
        const result = document.getElementById("prescriptionResult");

        if (!patientId || !file) { showError(result, "Patient ID and a file are required."); return; }

        showLoading(result, "Uploading prescription...");

        try {
            const formData = new FormData();
            formData.append("patientId", patientId);
            formData.append("prescriptionFile", file);

            const response = await fetch(`${API_BASE_URL}/api/prescriptions/upload`, {
                method: "POST",
                body: formData
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Upload failed.");

            showSuccess(result, "Prescription uploaded successfully.");
            form.reset();
        } catch (error) {
            console.error("Prescription upload error:", error);
            showError(result, error.message);
        }
    });
}

/* =========================================================
   PHARMACY — LOGIN / MEDICINES
========================================================= */

async function showPharmacy() {
    openModal("pharmacyModal");
    updatePharmacyLoginUI();
    await loadMedicines();
}

function updatePharmacyLoginUI() {
    const input = document.getElementById("pharmacyPatientId");
    const status = document.getElementById("pharmacyPatientStatus");
    const patientId = getPatientId();
    if (!status) return;

    if (patientId) {
        if (input) input.value = patientId;
        status.innerHTML = `<span style="color:#16a34a;font-weight:bold;">✅ Patient Logged In</span><br>Patient ID: <strong>${escapeHTML(patientId)}</strong><br><button type="button" onclick="logoutPharmacyPatient()">Logout</button>`;
    } else {
        if (input) input.value = "";
        status.innerHTML = `<span style="color:#d97706;">🔐 Please verify your Patient ID before adding medicine.</span>`;
    }
}

async function verifyPharmacyPatient() {
    const input = document.getElementById("pharmacyPatientId");
    const status = document.getElementById("pharmacyPatientStatus");
    const patientId = input?.value.trim();

    if (!patientId) { showError(status, "Enter a Patient ID."); return; }
    showLoading(status, "Verifying Patient ID...");

    try {
        const data = await apiRequest(`/api/patients/${encodeURIComponent(patientId)}`);
        const patient = data.patient || data;
        const finalId = patient.patientId || patient.patient_id || patientId;

        localStorage.setItem("patientId", finalId);
        updatePharmacyLoginUI();
        await loadPatientCart(finalId);
        showNotification("Patient verified successfully.", "success");
    } catch (error) {
        console.error("Patient verification error:", error);
        showError(status, error.message);
    }
}

function logoutPharmacyPatient() {
    localStorage.removeItem("patientId");
    pharmacyCart = [];
    updateCartCount();
    updatePharmacyLoginUI();
    renderCart();
    showNotification("Patient logged out.", "success");
}

async function loadMedicines() {
    const result = document.getElementById("medicineResult");
    showLoading(result, "Loading medicines...");

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
        renderMedicines(medicineData);
    } catch (error) {
        console.error("Medicine loading error:", error);
        showError(result, error.message);
    }
}

function renderMedicines(medicines) {
    const result = document.getElementById("medicineResult");
    if (!result) return;

    if (!medicines.length) {
        result.innerHTML = `<div class="empty-state"><div>💊</div><h3>Medicine Not Found</h3><p>Try another medicine name.</p></div>`;
        return;
    }

    result.innerHTML = `
        <div class="medicine-grid">
            ${medicines.map(medicine => `
                <div class="medicine-card">
                    <h3>💊 ${escapeHTML(medicine.name)}</h3>
                    <p>Category: <strong>${escapeHTML(medicine.category)}</strong></p>
                    <p>Stock: <strong>${Number(medicine.stock)}</strong></p>
                    <p>Price: <strong>₹${Number(medicine.price).toFixed(2)}</strong></p>
                    <p>Status: <strong>${escapeHTML(medicine.status)}</strong></p>
                    <div class="medicine-actions">
                        <button type="button" onclick="viewMedicine(${Number(medicine.id)})">👁️ View</button>
                        <button type="button" class="add-cart-btn" ${medicine.stock <= 0 ? "disabled" : ""} onclick="addToCart(${Number(medicine.id)})">🛒 ${medicine.stock > 0 ? "Add to Cart" : "Out of Stock"}</button>
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

function searchMedicines() {
    const search = (document.getElementById("medicineSearch")?.value || "").trim().toLowerCase();
    if (!search) { renderMedicines(medicineData); return; }
    renderMedicines(medicineData.filter(m =>
        m.name.toLowerCase().includes(search) || m.category.toLowerCase().includes(search)
    ));
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

    modal.innerHTML = `
        <div class="modal-box">
            <button class="close-btn" onclick="closeModal('medicineDetailsModal')">×</button>
            <h2>💊 ${escapeHTML(medicine.name)}</h2>
            <p>Category: <strong>${escapeHTML(medicine.category)}</strong></p>
            <p>Available Stock: <strong>${Number(medicine.stock)}</strong></p>
            <p>Price: <strong>₹${Number(medicine.price).toFixed(2)}</strong></p>
            <p>Status: <strong>${escapeHTML(medicine.status)}</strong></p>
            <button type="button" ${Number(medicine.stock) <= 0 ? "disabled" : ""}
                onclick="addToCart(${Number(medicine.id)}); closeModal('medicineDetailsModal');">🛒 Add To Cart</button>
        </div>
    `;
    modal.classList.add("show");
}

/* =========================================================
   PHARMACY — CART
========================================================= */

async function addToCart(medicineId) {
    const medicine = medicineData.find(m => String(m.id) === String(medicineId));
    if (!medicine) { showNotification("Medicine not found.", "error"); return; }
    if (Number(medicine.stock) <= 0) { showNotification("Medicine is out of stock.", "warning"); return; }

    const patientId = getPatientId();
    if (!patientId) {
        showNotification("Please verify your Patient ID first.", "warning");
        document.getElementById("pharmacyPatientId")?.focus();
        return;
    }

    const existing = pharmacyCart.find(item => String(item.medicine_id ?? item.id) === String(medicine.id));
    const requestedQty = existing ? Number(existing.quantity) + 1 : 1;
    if (requestedQty > Number(medicine.stock)) {
        showNotification(`Only ${medicine.stock} units available.`, "warning");
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
        showNotification(error.message, "error");
    }
}

async function loadPatientCart(patientId = getPatientId()) {
    if (!patientId) { pharmacyCart = []; renderCart(); updateCartCount(); return; }

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
}

function updateCartCount() {
    const count = pharmacyCart.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
    document.querySelectorAll("#cartCount, .cart-count").forEach(el => { el.textContent = count; });
}

async function openCart() {
    const patientId = getPatientId();
    openModal("cartModal");
    const input = document.getElementById("cartPatientId");
    if (input) input.value = patientId || "";
    if (!patientId) { showError(document.getElementById("cartResult"), "Please verify your Patient ID in the Pharmacy tab first."); return; }
    await loadPatientCart(patientId);
}

function getCartTotal() {
    return pharmacyCart.reduce((total, item) => total + Number(item.price) * Number(item.quantity), 0);
}

function renderCart() {
    const result = document.getElementById("cartResult");
    if (!result) return;

    if (!pharmacyCart.length) {
        result.innerHTML = `<div class="empty-state">🛒<h3>Cart is Empty</h3><p>Add medicines from the pharmacy.</p></div>`;
        return;
    }

    const itemsHTML = pharmacyCart.map(item => {
        const total = Number(item.price) * Number(item.quantity);
        return `
            <div class="cart-item">
                <div><h3>💊 ${escapeHTML(item.name)}</h3><p>₹${Number(item.price).toFixed(2)} each × ${item.quantity} = ₹${total.toFixed(2)}</p></div>
                <div>
                    <button type="button" onclick="changeCartQuantity(${Number(item.medicine_id ?? item.id)}, -1)">−</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="changeCartQuantity(${Number(item.medicine_id ?? item.id)}, 1)">+</button>
                </div>
                <button type="button" onclick="removeFromCart(${Number(item.id)})">🗑️</button>
            </div>
        `;
    }).join("");

    result.innerHTML = `
        <div class="cart-list">${itemsHTML}</div>
        <div class="cart-total">
            <h2>Total: ₹${getCartTotal().toFixed(2)}</h2>
            <button type="button" class="primary-btn" onclick="checkoutMedicineCart()">💳 Proceed To Payment</button>
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
        showNotification(error.message, "error");
    }
}

async function removeFromCart(cartId) {
    if (!cartId) return;
    try {
        await apiRequest(`/api/pharmacy/cart/${encodeURIComponent(cartId)}`, { method: "DELETE" });
        await loadPatientCart();
    } catch (error) {
        console.error("Remove cart error:", error);
        showNotification(error.message, "error");
    }
}

/* =========================================================
   PHARMACY — PAYMENT & RECEIPT
========================================================= */

function checkoutMedicineCart() {
    if (!pharmacyCart.length) { showNotification("Cart is empty.", "warning"); return; }
    if (!getPatientId()) { showNotification("Patient ID required.", "warning"); return; }
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
                <h2>💳 Pharmacy Payment</h2>
                <div id="paymentSummary"></div>
                <div class="payment-methods">
                    <h3>Select Payment Method</h3>
                    <label><input type="radio" name="paymentMethod" value="UPI" onchange="showPaymentFields()"> 📱 UPI</label>
                    <label><input type="radio" name="paymentMethod" value="Card" onchange="showPaymentFields()"> 💳 Card</label>
                    <label><input type="radio" name="paymentMethod" value="Net Banking" onchange="showPaymentFields()"> 🏦 Net Banking</label>
                    <label><input type="radio" name="paymentMethod" value="COD" onchange="showPaymentFields()"> 💵 Cash On Delivery</label>
                </div>
                <div id="paymentFields"></div>
                <div id="paymentResult"></div>
                <button type="button" class="primary-btn" onclick="processPayment()">🔐 Pay / Place Order</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.classList.add("show");
    renderPaymentSummary();
}

function renderPaymentSummary() {
    const result = document.getElementById("paymentSummary");
    if (!result) return;
    result.innerHTML = `
        <div class="payment-summary">
            <p>Medicines: <strong>${pharmacyCart.length}</strong></p>
            <p>Items: <strong>${pharmacyCart.reduce((s, i) => s + Number(i.quantity), 0)}</strong></p>
            <h2>Total: ₹${getCartTotal().toFixed(2)}</h2>
        </div>
    `;
}

function showPaymentFields() {
    const method = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    const fields = document.getElementById("paymentFields");
    if (!fields) return;

    if (method === "UPI") {
        fields.innerHTML = `<label>UPI ID</label><input id="upiId" type="text" placeholder="example@upi">`;
    } else if (method === "Card") {
        fields.innerHTML = `
            <label>Card Number</label><input id="cardNumber" type="text" maxlength="19" placeholder="XXXX XXXX XXXX XXXX">
            <label>Card Holder Name</label><input id="cardName" type="text" placeholder="Name on card">
            <div style="display:flex;gap:10px;">
                <input id="cardExpiry" type="text" placeholder="MM/YY">
                <input id="cardCVV" type="password" maxlength="3" placeholder="CVV">
            </div>
        `;
    } else if (method === "Net Banking") {
        fields.innerHTML = `
            <label>Select Bank</label>
            <select id="bankName">
                <option value="">Select Bank</option>
                <option value="SBI">State Bank of India</option>
                <option value="HDFC">HDFC Bank</option>
                <option value="ICICI">ICICI Bank</option>
                <option value="AXIS">Axis Bank</option>
            </select>
        `;
    } else if (method === "COD") {
        fields.innerHTML = `<div class="info-card">💵 <strong>Cash On Delivery</strong> — payment collected on delivery.</div>`;
    } else {
        fields.innerHTML = "";
    }
}

function validatePayment(method) {
    if (!method) return "Please select a payment method.";
    if (method === "UPI") {
        const upi = document.getElementById("upiId")?.value.trim();
        if (!upi || !/^[\w.-]+@[\w.-]+$/.test(upi)) return "Please enter a valid UPI ID.";
    }
    if (method === "Card") {
        const number = document.getElementById("cardNumber")?.value.replace(/\s/g, "");
        const name = document.getElementById("cardName")?.value.trim();
        const expiry = document.getElementById("cardExpiry")?.value.trim();
        const cvv = document.getElementById("cardCVV")?.value.trim();
        if (!number || !name || !expiry || !cvv) return "Please fill all card details.";
        if (!/^\d{12,19}$/.test(number)) return "Invalid card number.";
        if (!/^\d{3,4}$/.test(cvv)) return "Invalid CVV.";
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
    showLoading(result, "Processing order...");

    try {
        const data = await apiRequest("/api/pharmacy/payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                patientId,
                paymentMethod: method,
                amount,
                items: pharmacyCart.map(item => ({ id: item.medicine_id ?? item.id, name: item.name, quantity: Number(item.quantity), price: Number(item.price) }))
            })
        });

        lastPaymentResult = { ...data, amount, patientId, items: [...pharmacyCart] };
        pharmacyCart = [];
        await loadPatientCart(patientId);

        showSuccess(result, method === "COD" ? "Order placed successfully." : "Payment successful.");
        closeModal("paymentModal");
        closeModal("cartModal");
        showReceipt(lastPaymentResult);
    } catch (error) {
        console.error("Payment error:", error);
        showError(result, error.message);
    }
}

function showReceipt(data) {
    const numberEl = document.getElementById("receiptNumber");
    const dateEl = document.getElementById("receiptDate");
    const patientEl = document.getElementById("receiptPatientId");
    const itemsEl = document.getElementById("receiptItems");
    const totalEl = document.getElementById("receiptTotal");

    if (numberEl) numberEl.textContent = data.billNumber || data.transactionId || "N/A";
    if (dateEl) dateEl.textContent = new Date().toLocaleString();
    if (patientEl) patientEl.textContent = data.patientId || "N/A";
    if (totalEl) totalEl.textContent = `₹${Number(data.amount || 0).toFixed(2)}`;
    if (itemsEl) {
        itemsEl.innerHTML = (data.items || []).map(item => `
            <div class="receipt-item"><span>${escapeHTML(item.name)} × ${item.quantity}</span><strong>₹${(Number(item.price) * Number(item.quantity)).toFixed(2)}</strong></div>
        `).join("");
    }

    openModal("receiptModal");
}

function printReceipt() {
    const content = document.getElementById("receiptContent");
    if (!content) return;
    const win = window.open("", "_blank", "width=700,height=800");
    if (!win) { showNotification("Please allow popups to print.", "warning"); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
        <style>body{font-family:Arial,sans-serif;padding:30px;}</style></head><body>${content.innerHTML}
        <script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
}

/* =========================================================
   STAFF PANEL (basic — Part 1 requires it stay reachable)
========================================================= */

function openEditPanel(panelType) {
    const modal = document.getElementById("staffEditModal");
    const content = document.getElementById("editContent");
    if (!modal || !content) return;

    const titles = {
        hospitalInfo: "🏥 Hospital Information",
        doctors: "👨‍⚕️ Doctors",
        slots: "📅 Doctor Slots",
        ambulance: "🚑 Ambulance Status",
        beds: "🛏️ Bed Availability",
        emergency: "🚨 Emergency Status"
    };

    content.innerHTML = `
        <h2>${titles[panelType] || "Edit"}</h2>
        <p class="modal-subtitle">Staff editing for this section uses the existing hospital admin APIs.
        Open the relevant record from its list (Find Hospitals / Find Doctors / Ambulance Tracking / Bed Availability)
        and use the corresponding update endpoint already exposed by the backend.</p>
        <div class="edit-notice">This lightweight panel intentionally avoids inventing new admin UI/endpoints
        beyond what server.js already exposes. Tell me which of these you want a full editor for
        and I'll build it against the matching PUT endpoint.</div>
    `;
    openModal("staffEditModal");
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
   WINDOW EXPORTS — every name here IS defined above, once.
========================================================= */

Object.assign(window, {
    apiRequest, escapeHTML, escapeJS, openModal, closeModal, closeAllModals,

    openPatientRegistration, generatePatientID, calculateAge, handleDobAutoAge, showPatientQR,
    getPatientId, isPatientLoggedIn, showCurrentPatient, logoutPatient,
    openPatientPrintCard, executePrintPatientCard,
    openAbhaModal, confirmAbhaLink, unlinkAbha,
    openQrScanModal, closeQrScanModal, startPatientCameraScanner, stopPatientCameraScanner, verifyQrFromInput, handleScannedQrResult,
    openStaffPatientManager, debounceStaffPatientSearch, resetStaffPatientFilters, fetchStaffPatientsList, toggleStaffPatientStatus,

    showHospitals, renderHospitals, selectHospital, viewHospital, searchHospitals,
    onBookingHospitalChange, fetchDynamicSlots, confirmStrictBooking, filterAndSortHospitals,
    openHospitalDashboardDirect, selectTimeSlot, switchHospitalDetailsTab, openDoctorFromHospital,
    setDetailsTestCategory, openCitizenTestBookingModal, openCitizenHomeSampleModal,
    handleCitizenTestBookingSubmit, cancelAppointment, openHospitalDetails, createHospitalDetailsModal,

    openDoctorBooking, bookSpecificDoctor, bookDoctorSlot, printAppointment,
    openDoctorFinder, loadDoctorFinder, searchDoctors, resetDoctorFilters,
    viewDoctorDetails, closeDoctorDetails, loadDoctorSlots, selectDoctorSlot,
    openMyAppointments, loadMyAppointments,

    openEmergency, callEmergency,

    trackAmbulance, showAmbulance, refreshAmbulance, selectAmbulance,
    startEmergencyRequest, selectMatchHospital, selectMatchAmbulance,
    confirmEmergencyAssignment, advanceAmbulanceStatus, refreshAmbulanceRoute,
    resetAmbulanceTracking,

    showBeds, loadBeds,

    openPatientFile, searchPatientFile, loadMyPatientRecord, switchRecordTab, printPatientRecord,
    renderRecordTab, toggleInlineForm,

    openPrescriptionUpload,

    showPharmacy, verifyPharmacyPatient, logoutPharmacyPatient,
    loadMedicines, searchMedicines, viewMedicine, addToCart,
    openCart, changeCartQuantity, removeFromCart, checkoutMedicineCart,
    openPaymentModal, showPaymentFields, processPayment, printReceipt,

    openEditPanel,

    openDoctorLoginModal, populateDoctorLoginDropdown, onSelectDoctorFromDropdown,
    fillDoctorLogin, submitDoctorLogin,

    globalSearch,
    showNotification, showLoading, showError, showSuccess
});

console.log("✅ hospital.js loaded successfully.");