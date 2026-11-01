const fs = require('fs');
const path = 'frontend/pages/emergency/emergency.js';
let content = fs.readFileSync(path, 'utf8');

const ambulanceCode = `
/* =====================================================
   AMBULANCE — CONNECTED TO GORAKHPUR HOSPITAL NETWORK
===================================================== */

let ambulanceMap = null;
let ambulanceMarkers = {};
let selectedAmbulance = null;
let trackedAmbulanceId = null;
let ambulanceRouteControls = { toPatient: null, toHospital: null };
let ambulanceData = [];
let emergencyPatientLocation = null;
let emergencyMatchedHospitals = [];
let emergencyMatchedAmbulances = [];
let emergencySelectedHospitalId = null;
let emergencySelectedAmbulanceId = null;
let ambulanceSocket = null;

const AMBULANCE_STATUS_FLOW = [
    "Available",
    "Assigned",
    "On The Way",
    "Arrived at Patient",
    "Transporting Patient",
    "Arrived at Hospital"
];

function requestAmbulance() {
    trackAmbulance(true);
}

async function trackAmbulance(autoRequest = false) {
    const modal = document.getElementById("ambulanceModal");
    if (!modal) {
        openEmergencyWithType("Medical");
        return;
    }

    modal.style.display = "flex";
    initAmbulanceSocket();
    initializeAmbulanceMap();
    clearAmbulanceRoute();
    await refreshAmbulance();

    if (autoRequest) {
        startEmergencyRequest();
    }
}

function closeAmbulanceModal() {
    const modal = document.getElementById("ambulanceModal");
    if (modal) modal.style.display = "none";
}

function initAmbulanceSocket() {
    if (ambulanceSocket || typeof io === "undefined") return;

    try {
        ambulanceSocket = io(API_BASE, { transports: ["websocket", "polling"] });

        ambulanceSocket.on("connect", () => {
            ambulanceSocket.emit("join-ambulance-tracking");
        });

        const applyUpdate = (updated) => {
            if (!updated || !updated.id) return;
            const idx = ambulanceData.findIndex(a => String(a.id) === String(updated.id));
            if (idx >= 0) ambulanceData[idx] = { ...ambulanceData[idx], ...updated };
            else ambulanceData.push(updated);

            const modal = document.getElementById("ambulanceModal");
            if (!modal || modal.style.display === "none") return;

            renderAmbulanceList(ambulanceData);
            plotAllAmbulances(ambulanceData);

            if (trackedAmbulanceId && String(trackedAmbulanceId) === String(updated.id)) {
                renderAmbulanceRoutePanel(updated);
                updateAmbulanceMarkerPosition(updated);
            }
        };

        ambulanceSocket.on("ambulance-location-updated", applyUpdate);
        ambulanceSocket.on("ambulance-status-updated", applyUpdate);
        ambulanceSocket.on("ambulance-assigned", applyUpdate);
        ambulanceSocket.on("ambulance-reset", applyUpdate);
    } catch (error) {
        console.warn("Ambulance Socket.IO setup:", error);
    }
}

async function refreshAmbulance() {
    const listEl = document.getElementById("ambulanceList");
    if (listEl) listEl.innerHTML = \`<div style="padding: 16px; text-align: center; color: #94a3b8;">Loading ambulances from Gorakhpur Hospital Network...</div>\`;

    try {
        const res = await fetch(\`\${API_BASE}/api/ambulances\`);
        const data = await res.json();
        ambulanceData = data.ambulances || [];
        renderAmbulanceList(ambulanceData);
        plotAllAmbulances(ambulanceData);
    } catch (error) {
        console.error("Ambulance loading error:", error);
        if (listEl) listEl.innerHTML = \`<div class="inline-msg error">❌ Unable to load ambulances: \${escapeHTML(error.message)}</div>\`;
    }
}

function renderAmbulanceList(ambulances) {
    const listEl = document.getElementById("ambulanceList");
    if (!listEl) return;

    if (!ambulances || !ambulances.length) {
        listEl.innerHTML = \`<div style="padding: 20px; text-align: center; color: #94a3b8; background: rgba(15,23,42,0.6); border-radius: 12px;">🚑 No active ambulances currently reported.</div>\`;
        return;
    }

    listEl.innerHTML = ambulances.map(ambulance => {
        const status = String(ambulance.status || "Unknown");
        const available = status.toLowerCase() === "available";
        const inFlow = AMBULANCE_STATUS_FLOW.includes(status) && status !== "Available";
        const btnLabel = inFlow ? "🚑 Track Live Route" : "📍 Locate on Map";

        return \`
            <div class="ambulance-card">
                <div class="ambulance-card-header">
                    <div class="ambulance-icon">🚑</div>
                    <div>
                        <h3>\${escapeHTML(ambulance.ambulance_id || "Ambulance")}</h3>
                        <span class="ambulance-status \${available ? "" : "emergency"}"><i></i>\${escapeHTML(status)}</span>
                    </div>
                </div>
                <div class="ambulance-details">
                    <div><span>Vehicle</span><strong>\${escapeHTML(ambulance.vehicle_number || "N/A")}</strong></div>
                    <div><span>Driver</span><strong>\${escapeHTML(ambulance.driver_name || "N/A")}</strong></div>
                    <div><span>Type</span><strong>\${escapeHTML(ambulance.ambulance_type || "General BLS")}</strong></div>
                    \${ambulance.patient_name ? \`<div><span>Patient</span><strong>\${escapeHTML(ambulance.patient_name)}</strong></div>\` : ""}
                    \${ambulance.destination_hospital_name ? \`<div><span>Destination</span><strong>\${escapeHTML(ambulance.destination_hospital_name)}</strong></div>\` : ""}
                </div>
                <button type="button" class="track-live-btn" onclick="selectAmbulance(\${Number(ambulance.id)})">\${btnLabel}</button>
            </div>
        \`;
    }).join("");
}

function selectAmbulance(ambulanceId) {
    selectedAmbulance = ambulanceData.find(a => String(a.id) === String(ambulanceId)) || null;
    if (!selectedAmbulance) {
        showToast("Ambulance not found.");
        return;
    }

    const lat = Number(selectedAmbulance.latitude);
    const lng = Number(selectedAmbulance.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        showToast("This ambulance has no location telemetry yet.");
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
    if (typeof L === "undefined") {
        console.error("Leaflet is not loaded.");
        return null;
    }

    if (ambulanceMap) {
        try { ambulanceMap.remove(); } catch { }
    }

    ambulanceMap = L.map("ambulanceMap").setView([26.7600, 83.3700], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors | Gorakhpur SmartCity Hospital Network"
    }).addTo(ambulanceMap);

    setTimeout(() => {
        if (ambulanceMap) ambulanceMap.invalidateSize();
    }, 250);

    return ambulanceMap;
}

function plotAllAmbulances(ambulances) {
    if (!ambulanceMap) return;
    ambulanceMarkers = {};

    const withLocation = (ambulances || []).filter(a =>
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
            .bindPopup(\`
                <div class="ambulance-popup">
                    <h3>\${escapeHTML(ambulance.ambulance_id || "Ambulance")}</h3>
                    <p><strong>Vehicle:</strong> \${escapeHTML(ambulance.vehicle_number || "")}</p>
                    <p><strong>Driver:</strong> \${escapeHTML(ambulance.driver_name || "N/A")}</p>
                    <p><strong>Status:</strong> \${escapeHTML(ambulance.status || "Unknown")}</p>
                    \${ambulance.destination_hospital_name ? \`<p><strong>Destination:</strong> \${escapeHTML(ambulance.destination_hospital_name)}</p>\` : ""}
                </div>
            \`);
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

    if (ambulanceRouteControls.toPatient && ["Assigned", "On The Way"].includes(ambulance.status)) {
        try {
            ambulanceRouteControls.toPatient.setWaypoints([
                L.latLng(lat, lng),
                L.latLng(Number(ambulance.patient_lat), Number(ambulance.patient_lng))
            ]);
        } catch { }
    }
}

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
    panel.innerHTML = \`<div class="inline-msg info">📍 Detecting your location via GPS…</div>\`;

    try {
        emergencyPatientLocation = await getFreshLocation().catch(() => ({ lat: 26.7606, lng: 83.3732 }));
        await findEmergencyMatches(emergencyPatientLocation.lat, emergencyPatientLocation.lng);
    } catch (error) {
        panel.innerHTML = \`<div class="inline-msg error">❌ \${escapeHTML(error.message)} — using Gorakhpur Central Hospital Corridor.</div>\`;
        emergencyPatientLocation = { lat: 26.7606, lng: 83.3732 };
        await findEmergencyMatches(26.7606, 83.3732);
    }
}

async function findEmergencyMatches(lat, lng) {
    const panel = document.getElementById("emergencyRequestPanel");
    if (!panel) return;
    panel.innerHTML = \`<div class="inline-msg info">🔎 Finding nearby hospitals & available ambulances…</div>\`;

    try {
        const [hospitalsRes, ambulancesRes] = await Promise.all([
            fetch(\`\${API_BASE}/api/hospitals/nearby/search?lat=\${lat}&lng=\${lng}&limit=5\`).then(r => r.json()),
            fetch(\`\${API_BASE}/api/ambulances/nearby/search?lat=\${lat}&lng=\${lng}&limit=5\`).then(r => r.json())
        ]);

        emergencyMatchedHospitals = hospitalsRes.hospitals || [];
        emergencyMatchedAmbulances = ambulancesRes.ambulances || [];
        emergencySelectedHospitalId = emergencyMatchedHospitals[0]?.id ?? null;
        emergencySelectedAmbulanceId = emergencyMatchedAmbulances[0]?.id ?? null;

        renderEmergencyMatchPanel();
    } catch (error) {
        console.error("Emergency match error:", error);
        panel.innerHTML = \`<div class="inline-msg error">❌ \${escapeHTML(error.message)}</div>\`;
    }
}

function renderEmergencyMatchPanel() {
    const panel = document.getElementById("emergencyRequestPanel");
    if (!panel) return;

    const hospitalItems = emergencyMatchedHospitals.length
        ? emergencyMatchedHospitals.map(h => \`
            <div class="match-item \${String(h.id) === String(emergencySelectedHospitalId) ? "selected" : ""}"
                 onclick="selectMatchHospital(\${Number(h.id)})">
                <div>
                    <strong>\${escapeHTML(h.hospital_name)}</strong>
                    <small>\${escapeHTML(h.address || "Gorakhpur")}</small>
                </div>
                <span class="distance-pill">\${h.distance_km != null ? h.distance_km + " km" : "Nearby"}</span>
            </div>
        \`).join("")
        : \`<div class="inline-msg warning">No hospitals with known coordinates found nearby.</div>\`;

    const ambulanceItems = emergencyMatchedAmbulances.length
        ? emergencyMatchedAmbulances.map(a => \`
            <div class="match-item \${String(a.id) === String(emergencySelectedAmbulanceId) ? "selected" : ""}"
                 onclick="selectMatchAmbulance(\${Number(a.id)})">
                <div>
                    <strong>\${escapeHTML(a.ambulance_id)}</strong>
                    <small>\${escapeHTML(a.vehicle_number || "")} • \${escapeHTML(a.driver_name || "Emergency Pilot")}</small>
                </div>
                <span class="distance-pill">\${a.distance_km != null ? a.distance_km + " km" : "Available"}</span>
            </div>
        \`).join("")
        : \`<div class="inline-msg warning">No available ambulances currently in radius.</div>\`;

    panel.innerHTML = \`
        <div class="match-lists">
            <div class="match-list">
                <h4>🏥 Destination Hospital</h4>
                \${hospitalItems}
            </div>
            <div class="match-list">
                <h4>🚑 Available Ambulance</h4>
                \${ambulanceItems}
            </div>
        </div>
        <button type="button" class="emergency-request-btn" onclick="confirmEmergencyAssignment()"
            \${(!emergencySelectedHospitalId || !emergencySelectedAmbulanceId) ? "disabled" : ""} style="margin-top: 10px;">
            ✅ Confirm &amp; Dispatch Ambulance (Green-Wave Priority)
        </button>
    \`;
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
        showToast("Please select a hospital and an ambulance first.");
        return;
    }

    const hospital = emergencyMatchedHospitals.find(h => String(h.id) === String(emergencySelectedHospitalId));
    const panel = document.getElementById("emergencyRequestPanel");
    panel.innerHTML = \`<div class="inline-msg info">🚑 Dispatching ambulance and activating green-wave corridor…</div>\`;

    try {
        const token = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getToken ? SmartCityAuth.getToken() : null) || 
                      localStorage.getItem("smartCityJWT") || 
                      localStorage.getItem("token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = \`Bearer \${token}\`;

        const res = await fetch(\`\${API_BASE}/api/ambulances/\${emergencySelectedAmbulanceId}/assign\`, {
            method: "PUT",
            headers,
            body: JSON.stringify({
                patientName: "Emergency Citizen (Medical SOS)",
                patientMobile: null,
                patientLat: emergencyPatientLocation.lat,
                patientLng: emergencyPatientLocation.lng,
                patientAddress: \`\${hospital?.hospital_name || "Hospital"} corridor\`,
                destinationHospitalId: hospital?.id || null,
                destinationHospitalName: hospital?.hospital_name || null
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to dispatch ambulance.");

        const assigned = data.ambulance;
        const idx = ambulanceData.findIndex(a => String(a.id) === String(assigned.id));
        if (idx >= 0) ambulanceData[idx] = assigned;
        else ambulanceData.push(assigned);

        // Also register medical emergency in City Emergency Command log
        try {
            await fetch(\`\${API_BASE}/api/emergency/incidents\`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "Medical",
                    location: \`\${hospital?.hospital_name || "Hospital"} area (Lat: \${emergencyPatientLocation.lat.toFixed(4)}, Lng: \${emergencyPatientLocation.lng.toFixed(4)})\`,
                    description: \`Ambulance \${assigned.ambulance_id} dispatched for Medical Emergency to \${hospital?.hospital_name || "Hospital"}\`,
                    status: "Dispatched",
                    latitude: emergencyPatientLocation.lat,
                    longitude: emergencyPatientLocation.lng
                })
            });
        } catch (e) { }

        panel.innerHTML = \`<div class="inline-msg success">✅ Ambulance <strong>\${escapeHTML(assigned.ambulance_id)}</strong> dispatched! Tracking live route below.</div>\`;
        trackedAmbulanceId = assigned.id;
        selectedAmbulance = assigned;

        renderAmbulanceList(ambulanceData);
        plotAllAmbulances(ambulanceData);
        renderAmbulanceRoutePanel(assigned);
        showToast(\`Ambulance \${assigned.ambulance_id} dispatched!\`);

    } catch (error) {
        console.error("Assign ambulance error:", error);
        panel.innerHTML = \`<div class="inline-msg error">❌ \${escapeHTML(error.message)}</div>\`;
    }
}

function clearAmbulanceRoute() {
    if (ambulanceRouteControls.toPatient) {
        try { ambulanceMap?.removeControl(ambulanceRouteControls.toPatient); } catch { }
        ambulanceRouteControls.toPatient = null;
    }
    if (ambulanceRouteControls.toHospital) {
        try { ambulanceMap?.removeControl(ambulanceRouteControls.toHospital); } catch { }
        ambulanceRouteControls.toHospital = null;
    }
}

function renderAmbulanceRoutePanel(ambulance) {
    const panel = document.getElementById("ambulanceRoutePanel");
    if (!panel) return;

    if (!ambulance || ambulance.status === "Available") {
        clearAmbulanceRoute();
        panel.innerHTML = "";
        return;
    }

    const currentIdx = AMBULANCE_STATUS_FLOW.indexOf(ambulance.status);
    const timeline = AMBULANCE_STATUS_FLOW.slice(1).map((step, i) => {
        const stepIdx = i + 1;
        const cls = stepIdx < currentIdx ? "done" : (stepIdx === currentIdx ? "current" : "");
        return \`<div class="route-status-step \${cls}">\${escapeHTML(step)}</div>\`;
    }).join("");

    const hasPatient = Number.isFinite(Number(ambulance.patient_lat)) && Number.isFinite(Number(ambulance.patient_lng));
    const hasHospital = Number.isFinite(Number(ambulance.destination_lat)) && Number.isFinite(Number(ambulance.destination_lng));

    panel.innerHTML = \`
        <div class="route-status-timeline">\${timeline}</div>
        <div class="route-summary-bar">
            <span>🚨 Active Emergency Mission</span>
            <strong>\${escapeHTML(ambulance.ambulance_id)} → \${escapeHTML(ambulance.destination_hospital_name || "Hospital")}</strong>
        </div>
        <div class="route-panel-actions">
            <button type="button" class="refresh-btn" onclick="refreshAmbulanceRoute(\${Number(ambulance.id)})">🔄 Refresh Route</button>
            <button type="button" class="advance-btn" onclick="advanceAmbulanceStatus(\${Number(ambulance.id)})">⏩ Advance Mission Step</button>
            <button type="button" class="reset-btn" onclick="resetAmbulanceTracking(\${Number(ambulance.id)})">⏹️ Complete / Reset</button>
        </div>
    \`;

    // Draw route if Leaflet Routing Machine is present
    if (ambulanceMap && typeof L.Routing !== "undefined" && hasPatient && hasHospital) {
        clearAmbulanceRoute();
        try {
            const ambLatLng = L.latLng(Number(ambulance.latitude), Number(ambulance.longitude));
            const patLatLng = L.latLng(Number(ambulance.patient_lat), Number(ambulance.patient_lng));
            const hospLatLng = L.latLng(Number(ambulance.destination_lat), Number(ambulance.destination_lng));

            ambulanceRouteControls.toPatient = L.Routing.control({
                waypoints: [ambLatLng, patLatLng],
                lineOptions: { styles: [{ color: "#22c55e", weight: 6, opacity: 0.8 }] },
                addWaypoints: false,
                draggableWaypoints: false,
                fitSelectedRoutes: true,
                show: false
            }).addTo(ambulanceMap);

            ambulanceRouteControls.toHospital = L.Routing.control({
                waypoints: [patLatLng, hospLatLng],
                lineOptions: { styles: [{ color: "#38bdf8", weight: 6, opacity: 0.8, dashArray: "8, 8" }] },
                addWaypoints: false,
                draggableWaypoints: false,
                fitSelectedRoutes: false,
                show: false
            }).addTo(ambulanceMap);
        } catch (e) {
            console.warn("Routing engine note:", e);
        }
    }
}

async function advanceAmbulanceStatus(ambulanceId, nextStatus) {
    const ambulance = ambulanceData.find(a => String(a.id) === String(ambulanceId));
    if (!ambulance) return;

    if (!nextStatus) {
        const curIdx = AMBULANCE_STATUS_FLOW.indexOf(ambulance.status);
        if (curIdx >= 0 && curIdx < AMBULANCE_STATUS_FLOW.length - 1) {
            nextStatus = AMBULANCE_STATUS_FLOW[curIdx + 1];
        } else {
            nextStatus = "Available";
        }
    }

    try {
        const token = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getToken ? SmartCityAuth.getToken() : null) || 
                      localStorage.getItem("smartCityJWT") || 
                      localStorage.getItem("token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = \`Bearer \${token}\`;

        const res = await fetch(\`\${API_BASE}/api/ambulances/\${ambulanceId}/status\`, {
            method: "PUT",
            headers,
            body: JSON.stringify({ status: nextStatus })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to update status.");

        const updated = data.ambulance;
        const idx = ambulanceData.findIndex(a => String(a.id) === String(updated.id));
        if (idx >= 0) ambulanceData[idx] = updated;

        renderAmbulanceList(ambulanceData);
        plotAllAmbulances(ambulanceData);
        renderAmbulanceRoutePanel(updated);
        showToast(\`Ambulance status: \${nextStatus}\`);
    } catch (error) {
        showToast(error.message || "Status update failed.");
    }
}

async function resetAmbulanceTracking(ambulanceId) {
    try {
        const token = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getToken ? SmartCityAuth.getToken() : null) || 
                      localStorage.getItem("smartCityJWT") || 
                      localStorage.getItem("token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = \`Bearer \${token}\`;

        const res = await fetch(\`\${API_BASE}/api/ambulances/\${ambulanceId}/reset\`, {
            method: "PUT",
            headers
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to reset ambulance.");

        const updated = data.ambulance;
        const idx = ambulanceData.findIndex(a => String(a.id) === String(updated.id));
        if (idx >= 0) ambulanceData[idx] = updated;

        clearAmbulanceRoute();
        renderAmbulanceList(ambulanceData);
        plotAllAmbulances(ambulanceData);
        renderAmbulanceRoutePanel(null);
        showToast("Ambulance reset and available again.");
    } catch (error) {
        showToast(error.message || "Could not reset ambulance.");
    }
}

function refreshAmbulanceRoute(ambulanceId) {
    const ambulance = ambulanceData.find(a => String(a.id) === String(ambulanceId));
    if (ambulance) renderAmbulanceRoutePanel(ambulance);
}

// Global window exposure for HTML event handlers
window.requestAmbulance = requestAmbulance;
window.trackAmbulance = trackAmbulance;
window.closeAmbulanceModal = closeAmbulanceModal;
window.refreshAmbulance = refreshAmbulance;
window.selectAmbulance = selectAmbulance;
window.startEmergencyRequest = startEmergencyRequest;
window.selectMatchHospital = selectMatchHospital;
window.selectMatchAmbulance = selectMatchAmbulance;
window.confirmEmergencyAssignment = confirmEmergencyAssignment;
window.advanceAmbulanceStatus = advanceAmbulanceStatus;
window.refreshAmbulanceRoute = refreshAmbulanceRoute;
window.resetAmbulanceTracking = resetAmbulanceTracking;
`;

// Locate requestAmbulance function in content
const oldFnMarker = 'function requestAmbulance()';
const oldFnIdx = content.indexOf(oldFnMarker);

if (oldFnIdx !== -1) {
    // Find the closing brace of the old function
    const openBraceIdx = content.indexOf('{', oldFnIdx);
    const closeBraceIdx = content.indexOf('}', openBraceIdx);
    
    // Replace the old requestAmbulance with the complete new ambulance system
    content = content.slice(0, oldFnIdx) + ambulanceCode + content.slice(closeBraceIdx + 1);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully integrated hospital ambulance tracking into emergency.js');
} else {
    console.error('requestAmbulance marker not found!');
}

