/* =====================================================
   SMARTCITY AI
   EMERGENCY SYSTEM
===================================================== */


/* =====================================================
   MAP
===================================================== */

let emergencyMap;

let userMarker = null;

let emergencyMarkers = [];

let currentFilter = "all";

const API_BASE = (typeof window !== "undefined" && window.API_BASE_URL !== undefined)
    ? window.API_BASE_URL
    : (typeof window !== "undefined" && (window.location.port === "5000" || window.location.protocol === "file:") ? "http://localhost:5000" : "");


/* =====================================================
   INITIALIZE
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeEmergencyMap();

        applyRoleUI();

        checkStaffPermission();

        loadSavedEmergencies();

        fetchLiveEmergencyData();

        initEmergencyRealtime();

        setInterval(fetchLiveEmergencyData, 30000);

    }
);



/* =====================================================
   MAP INITIALIZATION
===================================================== */

function initializeEmergencyMap() {

    /*
       Default location:
       India

       This is only the starting map.
       User can use "My Location".
    */

    emergencyMap = L.map(
        "emergencyMap"
    ).setView(
        [26.7606, 83.3732],
        12
    );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(
        emergencyMap
    );


    addDemoMarkers();

}


/* =====================================================
   DEMO EMERGENCY MARKERS
===================================================== */

function addDemoMarkers() {

    const markers = [

        {
            lat: 26.7606,
            lng: 83.3732,
            type: "fire",
            title: "Fire Incident",
            description:
                "Emergency fire response required."
        },

        {
            lat: 26.7655,
            lng: 83.3805,
            type: "ambulance",
            title: "Medical Emergency",
            description:
                "Ambulance currently responding."
        },

        {
            lat: 26.7540,
            lng: 83.3650,
            type: "police",
            title: "Police Response",
            description:
                "Police response unit dispatched."
        }

    ];


    markers.forEach(
        markerData => {

            createEmergencyMarker(
                markerData
            );

        }
    );

}


/* =====================================================
   CREATE MARKER
===================================================== */

function createEmergencyMarker(
    data
) {

    let icon = "🚨";


    if (data.type === "fire") {

        icon = "🚒";

    }

    else if (
        data.type === "ambulance"
    ) {

        icon = "🚑";

    }

    else if (
        data.type === "police"
    ) {

        icon = "👮";

    }


    const marker =
        L.marker(
            [
                data.lat,
                data.lng
            ]
        ).addTo(
            emergencyMap
        );


    marker.bindPopup(`

        <div style="
            min-width:190px;
            font-family:Arial;
        ">

            <h3 style="
                margin-bottom:6px;
            ">
                ${icon}
                ${data.title}
            </h3>

            <p style="
                font-size:11px;
                color:#64748b;
            ">
                ${data.description}
            </p>

            <hr>

            <strong>
                Emergency Response
            </strong>

        </div>

    `);


    marker.emergencyType =
        data.type;


    emergencyMarkers.push(
        marker
    );

}


/* =====================================================
   MAP FILTER
===================================================== */

function showMapFilter(
    filter
) {

    currentFilter =
        filter;


    emergencyMarkers.forEach(
        marker => {

            if (
                filter === "all" ||
                marker.emergencyType === filter
            ) {

                marker.addTo(
                    emergencyMap
                );

            }

            else {

                emergencyMap.removeLayer(
                    marker
                );

            }

        }
    );

}


/* =====================================================
   CURRENT LOCATION
===================================================== */

function getCurrentLocation() {

    if (
        !navigator.geolocation
    ) {

        showToast(
            "Location is not supported by this browser."
        );

        return;

    }


    showToast(
        "Getting your location..."
    );


    navigator.geolocation.getCurrentPosition(

        function (position) {

            const lat =
                position.coords.latitude;

            const lng =
                position.coords.longitude;


            emergencyMap.setView(
                [lat, lng],
                15
            );


            if (userMarker) {

                emergencyMap.removeLayer(
                    userMarker
                );

            }


            userMarker =
                L.marker(
                    [lat, lng]
                ).addTo(
                    emergencyMap
                );


            userMarker.bindPopup(
                "<b>📍 Your Location</b>"
            ).openPopup();


            document.getElementById(
                "emergencyLocation"
            ).value =
                `${lat.toFixed(6)}, ${lng.toFixed(6)}`;


            showToast(
                "Your location has been detected."
            );

        },

        function () {

            showToast(
                "Unable to access your location."
            );

        }

    );

}


/* =====================================================
   CALL EMERGENCY
===================================================== */

function callEmergency(
    number
) {

    showToast(
        `Emergency number ${number}`
    );


    /*
       On a mobile device this can
       open the phone application.
    */

    window.location.href =
        `tel:${number}`;

}


/* =====================================================
   OPEN MODAL
===================================================== */

function openEmergencyModal() {

    document.getElementById(
        "emergencyModal"
    ).style.display =
        "flex";

}


/* =====================================================
   CLOSE MODAL
===================================================== */

function closeEmergencyModal() {

    document.getElementById(
        "emergencyModal"
    ).style.display =
        "none";

}


/* =====================================================
   OPEN MODAL WITH TYPE
===================================================== */

function openEmergencyWithType(
    type
) {

    document.getElementById(
        "emergencyType"
    ).value =
        type;


    openEmergencyModal();

}


/* =====================================================
   AMBULANCE
===================================================== */

function requestAmbulance() {

    document.getElementById(
        "emergencyType"
    ).value =
        "Medical";


    openEmergencyModal();


    showToast(
        "Please provide your emergency location."
    );

}


/* =====================================================
   SUBMIT EMERGENCY
===================================================== */

function submitEmergency() {

    const type =
        document.getElementById(
            "emergencyType"
        ).value;


    const location =
        document.getElementById(
            "emergencyLocation"
        ).value.trim();


    const description =
        document.getElementById(
            "emergencyDescription"
        ).value.trim();


    if (!location) {

        showToast(
            "Please enter your location."
        );

        return;

    }


    if (!description) {

        showToast(
            "Please describe the emergency."
        );

        return;

    }


    const emergency = {

        id:
            "EMG-" +
            Date.now(),

        type:
            type,

        location:
            location,

        description:
            description,

        status:
            "ACTIVE",

        createdAt:
            new Date().toLocaleString()

    };


    let emergencies =
        JSON.parse(
            localStorage.getItem(
                "smartCityEmergencies"
            )
        ) || [];


    emergencies.push(
        emergency
    );


    localStorage.setItem(
        "smartCityEmergencies",
        JSON.stringify(
            emergencies
        )
    );

    // Broadcast incident to live backend & socket network
    fetch(`${API_BASE}/api/emergency/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            type: type,
            location: location,
            description: description,
            latitude: (userMarker && userMarker.getLatLng) ? userMarker.getLatLng().lat : 26.7606,
            longitude: (userMarker && userMarker.getLatLng) ? userMarker.getLatLng().lng : 83.3732
        })
    }).catch(err => console.warn("Emergency broadcast network warning:", err));


    addEmergencyToUI(
        emergency
    );


    updateActiveCount();


    closeEmergencyModal();


    document.getElementById(
        "emergencyLocation"
    ).value = "";


    document.getElementById(
        "emergencyDescription"
    ).value = "";


    showToast(
        `Emergency ${emergency.id} submitted successfully.`
    );

}


/* =====================================================
   ADD EMERGENCY TO UI
===================================================== */

function addEmergencyToUI(
    emergency
) {

    const list =
        document.getElementById(
            "incidentList"
        );


    const row =
        document.createElement(
            "div"
        );


    row.className =
        "incident-row";


    let icon = "🚨";


    if (
        emergency.type === "Fire"
    ) {

        icon = "🚒";

    }

    else if (
        emergency.type === "Medical"
    ) {

        icon = "🚑";

    }

    else if (
        emergency.type === "Police"
    ) {

        icon = "👮";

    }


    row.innerHTML = `

        <div class="incident-type fire-type">

            ${icon}

        </div>


        <div class="incident-info">

            <h3>
                ${escapeHTML(
                    emergency.type
                )}
                Emergency
            </h3>

            <p>
                ${escapeHTML(
                    emergency.location
                )}
                · Just now
            </p>

        </div>


        <span class="incident-status active">

            ACTIVE

        </span>

    `;


    list.prepend(
        row
    );

}


/* =====================================================
   LOAD SAVED EMERGENCIES (FROM BACKEND MYSQL DATABASE)
===================================================== */

async function loadSavedEmergencies() {
    let emergencies = [];
    try {
        const res = await fetch(`${API_BASE}/api/emergency/incidents`);
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.incidents)) {
                emergencies = data.incidents.map(inc => ({
                    id: inc.incident_code || inc.id,
                    type: inc.type,
                    location: inc.location,
                    description: inc.description,
                    status: inc.status,
                    priority: inc.priority || "HIGH",
                    callerName: inc.caller_name || "Citizen",
                    createdAt: inc.created_at ? new Date(inc.created_at).toLocaleString() : new Date().toLocaleString()
                }));
                localStorage.setItem("smartCityEmergencies", JSON.stringify(emergencies));
            }
        }
    } catch (err) {
        console.warn("Backend emergency incidents fetch error:", err);
    }

    if (!emergencies.length) {
        emergencies = JSON.parse(localStorage.getItem("smartCityEmergencies")) || [];
    }

    const listEl = document.getElementById("emergencyList");
    if (listEl) listEl.innerHTML = "";

    emergencies.forEach(emergency => {
        addEmergencyToUI(emergency);
    });

    updateActiveCount();
}


/* =====================================================
   ACTIVE COUNT
===================================================== */

function updateActiveCount() {
    try {
        const incidents = getEmergencyIncidents();
        const active = incidents.filter(i => (i.status || "").toUpperCase() === "ACTIVE").length;
        const element = document.getElementById("activeCount");
        if (element) {
            element.textContent = active;
        }
    } catch (e) {
        console.warn("Error updating active count:", e);
    }
}


/* =====================================================
   FETCH LIVE AMBULANCES & EMERGENCY DEPARTMENTS
===================================================== */

async function fetchLiveEmergencyData() {
    // 1. Ambulances
    try {
        const res = await fetch(`${API_BASE}/api/ambulances`);
        if (res.ok) {
            const json = await res.json();
            const ambulances = json.ambulances || [];
            const ambCountEl = document.getElementById("ambulanceCount");
            if (ambCountEl && ambulances.length) {
                const activeAmbs = ambulances.filter(a => (a.status || "").toLowerCase() !== "offline");
                ambCountEl.textContent = activeAmbs.length || ambulances.length;
            }

            // Add live ambulance markers to emergencyMap
            if (typeof emergencyMap !== "undefined" && emergencyMap) {
                ambulances.forEach(amb => {
                    if (amb.latitude && amb.longitude) {
                        createEmergencyMarker({
                            lat: Number(amb.latitude),
                            lng: Number(amb.longitude),
                            type: "ambulance",
                            title: `${amb.vehicle_number} (${amb.ambulance_type || 'Ambulance'})`,
                            description: `Driver: ${amb.driver_name || 'Active'} | Hospital: ${amb.hospital_name || 'Gorakhpur'} | Status: ${amb.status}`
                        });
                    }
                });
            }
        }
    } catch (err) {
        console.warn("Could not fetch ambulances:", err);
    }

    // 2. Emergency Departments
    try {
        const res = await fetch(`${API_BASE}/api/emergency-departments`);
        if (res.ok) {
            const json = await res.json();
            const depts = json.emergencyDepartments || [];
            const unitsEl = document.getElementById("responseUnitsCount");
            if (unitsEl && depts.length) {
                unitsEl.textContent = depts.length;
            }
        }
    } catch (err) {
        console.warn("Could not fetch emergency departments:", err);
    }
}

/* =====================================================
   REAL-TIME LIVE TRACKING & SOS SOCKET HANDLERS
===================================================== */

let liveAmbulanceMarkers = {};

function initEmergencyRealtime() {
    if (typeof SmartCityRealtime === "undefined") {
        console.warn("SmartCityRealtime library not loaded");
        return;
    }

    SmartCityRealtime.init();
    SmartCityRealtime.renderLiveIndicator(".navbar");

    // 1. Real-time Live Ambulance GPS Tracking
    SmartCityRealtime.onAmbulanceLocation((amb) => {
        if (!amb || !amb.latitude || !amb.longitude || !emergencyMap) return;

        const ambKey = String(amb.id || amb.ambulance_id || amb.vehicle_number);
        const lat = Number(amb.latitude);
        const lng = Number(amb.longitude);

        if (liveAmbulanceMarkers[ambKey]) {
            // Smoothly glide marker to new GPS coordinate
            liveAmbulanceMarkers[ambKey].setLatLng([lat, lng]);
            liveAmbulanceMarkers[ambKey].setPopupContent(`
                <div style="font-size:12px; line-height:1.4; min-width:180px;">
                    <h3 style="margin:0 0 4px; color:#dc2626;">🚑 ${amb.vehicle_number || ambKey}</h3>
                    <b>Status:</b> <span style="color:#16a34a; font-weight:bold;">${amb.status || 'Active'}</span><br>
                    <b>Location:</b> ${amb.location || 'Gorakhpur transit'}<br>
                    <b>Speed:</b> ${amb.speedKmh ? amb.speedKmh + ' km/h' : 'En route'}<br>
                    <b>Hospital:</b> ${amb.hospital_name || 'BRD / AIIMS'}<br>
                    <small style="color:#059669; font-weight:600;">● Live GPS Telemetry</small>
                </div>
            `);
        } else {
            // Create dynamic Leaflet marker for this vehicle
            const ambIcon = L.divIcon({
                className: "custom-amb-icon",
                html: `<div style="background:#ef4444; color:#fff; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 10px rgba(239,68,68,0.8); border:2px solid #fff; font-size:16px;">🚑</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            const marker = L.marker([lat, lng], { icon: ambIcon }).addTo(emergencyMap);
            marker.emergencyType = "ambulance";
            marker.bindPopup(`
                <div style="font-size:12px; line-height:1.4; min-width:180px;">
                    <h3 style="margin:0 0 4px; color:#dc2626;">🚑 ${amb.vehicle_number || ambKey}</h3>
                    <b>Status:</b> <span style="color:#16a34a; font-weight:bold;">${amb.status || 'Active'}</span><br>
                    <b>Location:</b> ${amb.location || 'Gorakhpur transit'}<br>
                    <b>Speed:</b> ${amb.speedKmh ? amb.speedKmh + ' km/h' : 'En route'}<br>
                    <b>Hospital:</b> ${amb.hospital_name || 'BRD / AIIMS'}<br>
                    <small style="color:#059669; font-weight:600;">● Live GPS Telemetry</small>
                </div>
            `);
            liveAmbulanceMarkers[ambKey] = marker;
            emergencyMarkers.push(marker);
        }
    });

    // 2. Ambulance Status Updates (e.g. Assigned, Available)
    SmartCityRealtime.onAmbulanceStatus((amb) => {
        if (!amb) return;
        const ambCountEl = document.getElementById("ambulanceCount");
        if (ambCountEl) {
            fetch(`${API_BASE}/api/ambulances`)
                .then(r => r.json())
                .then(d => {
                    const active = (d.ambulances || []).filter(a => (a.status || "").toLowerCase() !== "offline");
                    ambCountEl.textContent = active.length;
                })
                .catch(() => {});
        }
    });

    // 3. High-Priority Emergency SOS Broadcasts
    SmartCityRealtime.onEmergencyAlert((alert) => {
        if (!alert) return;

        // Plot onto map with pulsing emergency icon
        if (alert.latitude && alert.longitude && emergencyMap) {
            const sosIcon = L.divIcon({
                className: "custom-sos-icon",
                html: `<div style="background:#dc2626; color:#fff; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 16px #dc2626; border:2px solid #fff; font-size:18px;">🚨</div>`,
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            });

            const marker = L.marker([Number(alert.latitude), Number(alert.longitude)], { icon: sosIcon }).addTo(emergencyMap);
            marker.emergencyType = "sos";
            marker.bindPopup(`
                <div style="font-size:12px; line-height:1.4;">
                    <h3 style="margin:0 0 4px; color:#dc2626;">🚨 CRITICAL SOS: ${alert.type || 'EMERGENCY'}</h3>
                    <b>Location:</b> ${alert.location || 'Reported'}<br>
                    <p style="margin:4px 0;">${alert.description || 'Immediate assistance requested.'}</p>
                    <small style="color:#ef4444; font-weight:bold;">● BROADCASTED LIVE TO UNITS</small>
                </div>
            `).openPopup();
            emergencyMarkers.push(marker);
        }
    });
}



/* =====================================================
   STAFF PERMISSION
===================================================== */

function checkStaffPermission() {

    const accessText =
        document.getElementById("staffAccessText");

    const updateBtn =
        document.getElementById("updateIncidentBtn");

    const dispatchBtn =
        document.getElementById("dispatchBtn");

    const closeBtn =
        document.getElementById("closeIncidentBtn");

    // Default: disabled if elements exist
    if (updateBtn) updateBtn.disabled = true;
    if (dispatchBtn) dispatchBtn.disabled = true;
    if (closeBtn) closeBtn.disabled = true;

    const session =
        localStorage.getItem("smartCityCurrentUser");

    if (!session) {
        if (accessText) {
            accessText.innerHTML = "❌ You are not logged in.";
        }
        return;
    }

    let user;

    try {
        user = JSON.parse(session);
    } catch (error) {
        if (accessText) {
            accessText.innerHTML = "❌ Invalid login session.";
        }
        return;
    }

    console.log("CURRENT LOGIN USER:", user);

    /*
    ============================================
    STAFF CHECK
    ============================================
    */

    const userType =
        String(user.type || user.role || "").toLowerCase().trim();

    const department =
        String(user.department || "").toLowerCase().trim();

    /*
    Emergency staff / Admin
    */

    if (
        userType === "admin" ||
        (userType === "staff" && (department === "emergency" || !department))
    ) {
        if (accessText) {
            accessText.innerHTML = `
                <span style="color:#16a34a;font-weight:800;">
                    ✓ Emergency Staff Access
                </span>
                <br>
                <small>
                    ${user.name || "Staff"} —
                    You can manage emergency incidents.
                </small>
            `;
        }

        if (updateBtn) {
            updateBtn.disabled = false;
            updateBtn.style.opacity = "1";
        }
        if (dispatchBtn) {
            dispatchBtn.disabled = false;
            dispatchBtn.style.opacity = "1";
        }
        if (closeBtn) {
            closeBtn.disabled = false;
            closeBtn.style.opacity = "1";
        }

        return;
    }

    /*
    Other staff
    */

    if (userType === "staff") {
        if (accessText) {
            accessText.innerHTML = `
                <span style="color:#d97706;font-weight:800;">
                    ⚠ Staff View Access
                </span>
                <br>
                <small>
                    ${user.name || "Staff"} —
                    ${user.department || "Unknown Department"}
                    staff can view emergency information,
                    but cannot edit it.
                </small>
            `;
        }
        return;
    }

    /*
    Normal user
    */

    if (accessText) {
        accessText.innerHTML = `
            <span style="color:#2563eb;font-weight:800;">
                👤 Citizen / User
            </span>
            <br>
            <small>
                View and report emergencies.
                Staff controls are unavailable.
            </small>
        `;
    }
}
/* =====================================================
   STAFF UPDATE
===================================================== */

function updateIncidentStatus() {

    if (
        !isEmergencyStaff()
    ) {

        showToast(
            "Only Emergency Staff can update incidents."
        );

        return;

    }


    showToast(
        "Incident status updated successfully."
    );

}


/* =====================================================
   DISPATCH
===================================================== */

function dispatchUnit() {

    if (
        !isEmergencyStaff()
    ) {

        showToast(
            "Only Emergency Staff can dispatch units."
        );

        return;

    }


    showToast(
        "Emergency response unit dispatched."
    );

}


/* =====================================================
   CLOSE INCIDENT
===================================================== */

function closeIncident() {

    if (
        !isEmergencyStaff()
    ) {

        showToast(
            "Only Emergency Staff can close incidents."
        );

        return;

    }


    showToast(
        "Incident marked as resolved."
    );

}





/* =====================================================
   TOAST
===================================================== */

function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(
        function () {

            toast.classList.remove(
                "show"
            );

        },
        3000
    );

}


/* =====================================================
   SECURITY HELPER
===================================================== */

function escapeHTML(
    value
) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}
/* =====================================================
   EMERGENCY INCIDENT CONTROL SYSTEM
===================================================== */


/* =====================================================
   GET CURRENT USER
===================================================== */

function getCurrentEmergencyUser() {

    const session =
        localStorage.getItem(
            "smartCityCurrentUser"
        );

    if (!session) {
        return null;
    }

    try {

        return JSON.parse(session);

    } catch {

        return null;

    }

}


/* =====================================================
   CHECK EMERGENCY STAFF & 3-LAYER NAVIGATION
===================================================== */

function isEmergencyStaff() {
    const user = getCurrentEmergencyUser();
    if (!user) return false;
    const type = String(user.type || user.role || "").toLowerCase().trim();
    const dept = String(user.department || "").toLowerCase().trim();
    return (type === "staff" && (dept === "emergency" || !dept)) || type === "admin" || type === "superadmin";
}

function isEmergencyAdmin() {
    const user = getCurrentEmergencyUser();
    if (!user) return false;
    const type = String(user.type || user.role || "").toLowerCase().trim();
    const dept = String(user.department || "").toLowerCase().trim();
    return type === "admin" || type === "superadmin" || (type === "staff" && dept === "admin");
}

let currentEmergencyLayer = "citizen";

function switchEmergencyLayer(layer) {
    currentEmergencyLayer = layer;
    const staff = isEmergencyStaff();
    const admin = isEmergencyAdmin();

    // Tab buttons
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
    }

    if (layer === "admin" && admin) {
        loadAIEmergencyAuditTable();
    }

    // Refresh map dimensions
    setTimeout(() => {
        if (typeof map !== "undefined" && map && map.invalidateSize) {
            map.invalidateSize();
        }
    }, 120);
}
window.switchEmergencyLayer = switchEmergencyLayer;

function applyRoleUI() {
    const staff = isEmergencyStaff();
    const admin = isEmergencyAdmin();
    const user = getCurrentEmergencyUser();
    const name = user ? (user.name || user.fullName || "Citizen") : "Citizen";

    const roleTitle = document.getElementById("roleTitle");
    const roleSubtitle = document.getElementById("roleSubtitle");
    const rolePill = document.getElementById("rolePill");

    if (roleTitle) {
        roleTitle.textContent = admin
            ? "Gorakhpur Disaster Management Command & Fleet Oversight"
            : (staff
                ? "Emergency 112/108 Dispatch & First Responder Command"
                : `Welcome to SmartCity AI Emergency Services, ${name}`);
    }

    if (roleSubtitle) {
        roleSubtitle.textContent = admin
            ? "Multi-agency emergency routing telemetry, AI travel-time models, and disaster fleet inventory."
            : (staff
                ? "Manage real-time incident dispatches, triage distress alerts, and coordinate paramedic units."
                : "Instant SOS panic trigger, live multi-agency helpline directory, and nearby trauma centers.");
    }

    if (rolePill) {
        if (admin) {
            rolePill.textContent = "ADMIN • EMERGENCY";
            rolePill.className = "role-pill admin-pill";
        } else if (staff) {
            rolePill.textContent = "STAFF • 112 DISPATCH";
            rolePill.className = "role-pill staff-pill";
        } else {
            rolePill.textContent = user ? "CITIZEN" : "GUEST";
            rolePill.className = "role-pill citizen-pill";
        }
    }

    if (staff) {
        switchEmergencyLayer("staff");
    } else {
        switchEmergencyLayer("citizen");
    }
}
window.applyRoleUI = applyRoleUI;

function promptEmergencyStaffLogin() {
    if (typeof SmartCityAuth !== "undefined" && SmartCityAuth.showLoginModal) {
        SmartCityAuth.showLoginModal("staff", {
            prefillStaffId: "EMG001",
            department: "emergency",
            message: "🔒 Enter Emergency Staff ID & Password to access dispatcher controls."
        });
        return;
    }
    const staffId = prompt("Enter Emergency Staff ID (Default: EMG001):", "EMG001");
    const pass = prompt("Enter Password (Default: staff123):", "staff123");
    if (staffId && pass) {
        fetch("/api/staff-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId, password: pass })
        }).then(r => r.json()).then(data => {
            if (data.token) {
                localStorage.setItem("smartCityJWT", data.token);
                localStorage.setItem("smartCityCurrentUser", JSON.stringify(data.user));
                window.location.reload();
            } else {
                alert(data.message || "Login failed");
            }
        });
    }
}
window.promptEmergencyStaffLogin = promptEmergencyStaffLogin;

function promptEmergencyAdminLogin() {
    if (typeof SmartCityAuth !== "undefined" && SmartCityAuth.showLoginModal) {
        SmartCityAuth.showLoginModal("staff", {
            prefillStaffId: "EMG-ADMIN",
            department: "emergency",
            message: "🔒 Enter Emergency Admin ID & Password to access Disaster Command Console."
        });
        return;
    }
    const staffId = prompt("Enter Admin ID (Default: EMG-ADMIN):", "EMG-ADMIN");
    const pass = prompt("Enter Password (Default: staff123):", "staff123");
    if (staffId && pass) {
        fetch("/api/staff-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId, password: pass })
        }).then(r => r.json()).then(data => {
            if (data.token) {
                localStorage.setItem("smartCityJWT", data.token);
                localStorage.setItem("smartCityCurrentUser", JSON.stringify(data.user));
                window.location.reload();
            } else {
                alert(data.message || "Login failed");
            }
        });
    }
}
window.promptEmergencyAdminLogin = promptEmergencyAdminLogin;


/* =====================================================
   LOAD INCIDENT CONTROL
===================================================== */

function initializeIncidentControl() {

    const panel =
        document.getElementById(
            "incidentControlPanel"
        );

    if (!panel) {
        return;
    }


    if (!isEmergencyStaff()) {

        panel.style.display =
            "none";

        return;

    }


    panel.style.display =
        "block";


    populateIncidentSelector();

}


/* =====================================================
   GET ALL INCIDENTS
===================================================== */

function getEmergencyIncidents() {

    return JSON.parse(

        localStorage.getItem(
            "smartCityEmergencies"
        )

    ) || [];

}


/* =====================================================
   SAVE INCIDENTS
===================================================== */

function saveEmergencyIncidents(
    incidents
) {

    localStorage.setItem(

        "smartCityEmergencies",

        JSON.stringify(
            incidents
        )

    );

}


/* =====================================================
   POPULATE INCIDENT SELECTOR
===================================================== */

function populateIncidentSelector() {

    const select =
        document.getElementById(
            "controlIncident"
        );

    if (!select) {
        return;
    }


    const incidents =
        getEmergencyIncidents();


    select.innerHTML = `

        <option value="">
            Select an incident
        </option>

    `;


    /*
       Demo incidents
    */

    const demoIncidents = [

        {
            id: "DEMO-FIRE-001",
            type: "Fire",
            location: "Sector 12",
            status: "ACTIVE",
            priority: "HIGH",
            unit: "fire",
            team: "Fire Response Team A"
        },

        {
            id: "DEMO-MED-001",
            type: "Medical",
            location: "City Hospital Road",
            status: "RESPONDING",
            priority: "CRITICAL",
            unit: "ambulance",
            team: "Medical Team A"
        }

    ];


    const allIncidents =
        [
            ...demoIncidents,
            ...incidents
        ];


    allIncidents.forEach(
        incident => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                incident.id;

            option.textContent =

                `${incident.id} — ` +
                `${incident.type} — ` +
                `${incident.location}`;

            select.appendChild(
                option
            );

        }
    );


    select.addEventListener(
        "change",
        loadSelectedIncident
    );

}


/* =====================================================
   LOAD SELECTED INCIDENT
===================================================== */

function loadSelectedIncident() {

    const id =
        document.getElementById(
            "controlIncident"
        ).value;


    if (!id) {
        return;
    }


    const incidents =
        getEmergencyIncidents();


    let incident =
        incidents.find(
            item =>
                item.id === id
        );


    /*
       Demo incident fallback
    */

    if (!incident) {

        if (id === "DEMO-FIRE-001") {

            incident = {

                id: id,

                type: "Fire",

                location: "Sector 12",

                status: "ACTIVE",

                priority: "HIGH",

                unit: "fire",

                team:
                    "Fire Response Team A"

            };

        }

        else if (
            id === "DEMO-MED-001"
        ) {

            incident = {

                id: id,

                type: "Medical",

                location:
                    "City Hospital Road",

                status:
                    "RESPONDING",

                priority:
                    "CRITICAL",

                unit:
                    "ambulance",

                team:
                    "Medical Team A"

            };

        }

    }


    if (!incident) {
        return;
    }


    document.getElementById(
        "incidentStatus"
    ).value =
        incident.status || "ACTIVE";


    document.getElementById(
        "incidentPriority"
    ).value =
        incident.priority || "MEDIUM";


    document.getElementById(
        "responseUnit"
    ).value =
        incident.unit || "none";


    document.getElementById(
        "incidentLocation"
    ).value =
        incident.location || "";


    document.getElementById(
        "responseTeam"
    ).value =
        incident.team || "";

}


/* =====================================================
   SAVE ALL INCIDENT CONTROLS
===================================================== */

function saveIncidentControls() {

    if (!isEmergencyStaff()) {

        showToast(
            "Only Emergency Staff can edit incidents."
        );

        return;

    }


    const id =
        document.getElementById(
            "controlIncident"
        ).value;


    if (!id) {

        showToast(
            "Please select an incident first."
        );

        return;

    }


    let incidents =
        getEmergencyIncidents();


    let incidentIndex =
        incidents.findIndex(
            item =>
                item.id === id
        );


    /*
       Demo incident:
       Convert it into a real saved incident
    */

    if (incidentIndex === -1) {

        incidentIndex =
            incidents.length;


        incidents.push({

            id: id,

            type:
                id.includes("FIRE")
                    ? "Fire"
                    : "Medical",

            location: "",

            status: "ACTIVE",

            priority: "MEDIUM",

            unit: "none",

            team: ""

        });

    }


    /*
       1. INCIDENT STATUS
    */

    incidents[
        incidentIndex
    ].status =

        document.getElementById(
            "incidentStatus"
        ).value;


    /*
       2. PRIORITY
    */

    incidents[
        incidentIndex
    ].priority =

        document.getElementById(
            "incidentPriority"
        ).value;


    /*
       3. RESPONSE UNIT
    */

    incidents[
        incidentIndex
    ].unit =

        document.getElementById(
            "responseUnit"
        ).value;


    /*
       4. LOCATION
    */

    const location =
        document.getElementById(
            "incidentLocation"
        ).value.trim();


    if (location) {

        incidents[
            incidentIndex
        ].location =
            location;

    }


    /*
       6. RESPONSE TEAM
    */

    incidents[
        incidentIndex
    ].team =

        document.getElementById(
            "responseTeam"
        ).value.trim();


    /*
       LAST UPDATED
    */

    incidents[
        incidentIndex
    ].lastUpdated =
        new Date().toLocaleString();


    saveEmergencyIncidents(
        incidents
    );


    /*
       Refresh UI
    */

    loadSavedEmergencies();


    updateActiveCount();


    showToast(
        "✓ Incident changes saved successfully."
    );

}


/* =====================================================
   4. USE CURRENT LOCATION
===================================================== */

function useIncidentLocation() {

    if (
        !navigator.geolocation
    ) {

        showToast(
            "Location is not supported."
        );

        return;

    }


    showToast(
        "Detecting current location..."
    );


    navigator.geolocation.getCurrentPosition(

        function (position) {

            const lat =
                position.coords.latitude;

            const lng =
                position.coords.longitude;


            document.getElementById(
                "incidentLocation"
            ).value =

                `${lat.toFixed(6)}, ` +
                `${lng.toFixed(6)}`;


            showToast(
                "✓ Incident location updated."
            );

        },

        function () {

            showToast(
                "Unable to get current location."
            );

        }

    );

}


/* =====================================================
   5. RESOLVE / CLOSE INCIDENT
===================================================== */

function resolveSelectedIncident() {

    if (!isEmergencyStaff()) {

        showToast(
            "Only Emergency Staff can close incidents."
        );

        return;

    }


    const id =
        document.getElementById(
            "controlIncident"
        ).value;


    if (!id) {

        showToast(
            "Please select an incident first."
        );

        return;

    }


    const confirmClose =
        confirm(
            "Are you sure you want to resolve this incident?"
        );


    if (!confirmClose) {

        return;

    }


    let incidents =
        getEmergencyIncidents();


    const index =
        incidents.findIndex(
            item =>
                item.id === id
        );


    if (index === -1) {

        /*
           Demo incident
        */

        incidents.push({

            id: id,

            type:
                id.includes("FIRE")
                    ? "Fire"
                    : "Medical",

            location:
                document.getElementById(
                    "incidentLocation"
                ).value,

            status:
                "RESOLVED",

            priority:
                document.getElementById(
                    "incidentPriority"
                ).value,

            unit:
                document.getElementById(
                    "responseUnit"
                ).value,

            team:
                document.getElementById(
                    "responseTeam"
                ).value,

            resolvedAt:
                new Date().toLocaleString()

        });

    }

    else {

        incidents[index].status =
            "RESOLVED";

        incidents[index].resolvedAt =
            new Date().toLocaleString();

    }


    const incidentCode = incidents[index] ? (incidents[index].id || incidents[index].incidentCode) : selectedId;
    if (incidentCode) {
        const token = (window.SmartCityAuth && SmartCityAuth.getToken()) || localStorage.getItem("smartCityJWT") || "";
        fetch(`${API_BASE}/api/emergency/incidents/${encodeURIComponent(incidentCode)}/resolve`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token ? `Bearer ${token}` : ""
            }
        }).catch(err => console.warn("Incident resolve backend sync warning:", err));
    }

    document.getElementById(
        "incidentStatus"
    ).value =
        "RESOLVED";


    loadSavedEmergencies();


    updateActiveCount();


    showToast(
        "✓ Incident resolved successfully."
    );

}

/* =========================================================
   AI EMERGENCY DISPATCH & ROUTE-ETA ASSISTANT (FastAPI ML)
========================================================= */

function onAIEmergencyPresetChange(presetVal) {
    const select = document.getElementById("ai-em-incident-select");
    if (!select) return;
    const option = select.options[select.selectedIndex];
    if (!option) return;

    const olat = option.getAttribute("data-olat");
    const olng = option.getAttribute("data-olng");
    const dlat = option.getAttribute("data-dlat");
    const dlng = option.getAttribute("data-dlng");
    const sev = option.getAttribute("data-sev");

    if (olat && document.getElementById("ai-em-olat")) document.getElementById("ai-em-olat").value = olat;
    if (olng && document.getElementById("ai-em-olng")) document.getElementById("ai-em-olng").value = olng;
    if (dlat && document.getElementById("ai-em-dlat")) document.getElementById("ai-em-dlat").value = dlat;
    if (dlng && document.getElementById("ai-em-dlng")) document.getElementById("ai-em-dlng").value = dlng;
    if (sev && document.getElementById("ai-em-severity")) document.getElementById("ai-em-severity").value = sev;
}

async function runAIEmergencyDispatchEstimate() {
    const incSelect = document.getElementById("ai-em-incident-select");
    const sevSelect = document.getElementById("ai-em-severity");
    const olatInput = document.getElementById("ai-em-olat");
    const olngInput = document.getElementById("ai-em-olng");
    const dlatInput = document.getElementById("ai-em-dlat");
    const dlngInput = document.getElementById("ai-em-dlng");
    const resultBox = document.getElementById("ai-emergency-result-box");

    const incidentId = incSelect ? incSelect.value : "EM-SOS-101";
    const severity = sevSelect ? sevSelect.value : "HIGH";
    const olat = olatInput ? Number(olatInput.value) : 26.7606;
    const olng = olngInput ? Number(olngInput.value) : 83.3732;
    const dlat = dlatInput ? Number(dlatInput.value) : 26.7588;
    const dlng = dlngInput ? Number(dlngInput.value) : 83.3920;

    if (resultBox) {
        resultBox.innerHTML = `<div style="text-align: center; padding: 20px; color: #64748b; font-size: 13px;">🔄 Calculating emergency route transit & ETA via FastAPI ML Layer...</div>`;
    }

    try {
        const payload = {
            incident_id: incidentId,
            origin_lat: olat,
            origin_lng: olng,
            dest_lat: dlat,
            dest_lng: dlng,
            incident_severity: severity
        };

        const res = await fetch("/api/ai/emergency/dispatch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const json = await res.json();

        if (json.success && json.estimation) {
            const e = json.estimation;
            const etaMinutes = e.estimated_travel_minutes || 4.5;
            const distKm = e.distance_km || 2.1;
            const priority = e.priority_level || "P2_URGENT_DISPATCH";
            const corridor = e.suggested_corridor || "Civil Lines - Shastri Chowk Arterial";

            const badgeColor = priority.includes("P1") ? "#dc2626" : (priority.includes("P2") ? "#ea580c" : "#2563eb");

            if (resultBox) {
                resultBox.innerHTML = `
                    <div style="background: #ffffff; border: 1px solid #fecaca; border-radius: 12px; padding: 18px; box-shadow: 0 4px 14px rgba(220,38,38,0.06);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
                            <span style="font-size: 14px; font-weight: 700; color: #1e293b;">INCIDENT DISPATCH ESTIMATION: <strong>${escapeHTML(e.incident_id)}</strong></span>
                            <span style="background: ${badgeColor}; color: #ffffff; font-weight: 800; font-size: 11px; padding: 3px 10px; border-radius: 6px;">
                                ${escapeHTML(priority)}
                            </span>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 14px;">
                            <div style="background: #fff5f5; border: 1px solid #fee2e2; border-radius: 8px; padding: 12px; text-align: center;">
                                <div style="font-size: 11px; color: #991b1b; font-weight: 700;">PREDICTED ETA</div>
                                <div style="font-size: 26px; font-weight: 900; color: #dc2626;">${etaMinutes} min</div>
                                <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Transit to Hospital</div>
                            </div>
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
                                <div style="font-size: 11px; color: #64748b; font-weight: 700;">TRAVEL DISTANCE</div>
                                <div style="font-size: 24px; font-weight: 900; color: #2563eb;">${distKm} km</div>
                                <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Optimal Road Route</div>
                            </div>
                            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; text-align: center;">
                                <div style="font-size: 11px; color: #166534; font-weight: 700;">GREEN WAVE SIGNAL</div>
                                <div style="font-size: 15px; font-weight: 900; color: #15803d; margin-top: 6px;">AUTO-PREEMPT</div>
                                <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Clear Corridor Priority</div>
                            </div>
                        </div>

                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px;">
                            <strong style="color: #1e40af; font-size: 12px; display: block; margin-bottom: 2px;">🛣️ Recommended High-Priority Corridor:</strong>
                            <span style="color: #1e3a8a; font-size: 13px; font-weight: 600;">${escapeHTML(corridor)}</span>
                        </div>

                        <!-- Human-in-the-Loop Dispatch Action -->
                        <div style="display: flex; justify-content: space-between; align-items: center; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                            <div style="font-size: 12px; color: #92400e;">
                                <strong>⚠️ Human Dispatcher Action Required:</strong> Confirm estimated route and authorize immediate unit turn-out.
                            </div>
                            <button type="button" class="danger-btn" style="padding: 6px 14px; font-size: 12px; font-weight: 700; background: #dc2626; color: #fff; border: none; border-radius: 6px; cursor: pointer;" onclick="confirmAIEmergencyDispatch('${escapeHTML(e.incident_id)}')">
                                🚑 Authorize 108/112 Turn-Out
                            </button>
                        </div>

                        <div style="font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
                            <span>Model: <code>emergency-dispatch-v2.0</code></span>
                            <span style="font-style: italic;">⚖️ ${escapeHTML(e.disclaimer || "Dispatches remain under human 108/112 operator authority.")}</span>
                        </div>
                    </div>
                `;
            }
            loadAIEmergencyAuditTable();
        }
    } catch (err) {
        if (resultBox) {
            resultBox.innerHTML = `<div style="color: #ef4444; font-size: 12px; padding: 10px;">Failed to obtain dispatch route estimate: ${escapeHTML(err.message)}</div>`;
        }
    }
}

async function confirmAIEmergencyDispatch(incidentId) {
    alert(`Ambulance / emergency unit turn-out authorized for incident ${incidentId}. Dispatch transmission broadcasted.`);
    loadAIEmergencyAuditTable();
}

async function loadAIEmergencyAuditTable() {
    const tableBody = document.getElementById("ai-emergency-tbody");
    if (!tableBody) return;

    try {
        const token = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getToken) 
            ? SmartCityAuth.getToken() 
            : (localStorage.getItem("sc_token") || localStorage.getItem("token") || "");
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch("/api/ai/predictions?module=emergency&limit=8", { headers });
        const json = await res.json();

        if (json.success && json.predictions) {
            if (json.predictions.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #64748b; padding: 20px;">No emergency dispatch predictions logged yet. Calculate a route ETA above to log an entry.</td></tr>`;
                return;
            }

            tableBody.innerHTML = json.predictions.map(pred => {
                const out = typeof pred.prediction_output === "string" ? JSON.parse(pred.prediction_output) : (pred.prediction_output || {});
                const statusBadge = pred.review_status === "ACCEPTED"
                    ? `<span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">AUTHORIZED</span>`
                    : (pred.review_status === "REJECTED"
                        ? `<span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">ABORTED</span>`
                        : `<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">PENDING DISPATCH</span>`);

                const actions = pred.review_status === "PENDING"
                    ? `<button class="btn-primary" style="padding: 3px 8px; font-size: 11px; background: #dc2626; color: #fff; border: none; border-radius: 4px; cursor: pointer;" onclick="submitAIEmergencyReview(${pred.id}, 'APPROVED')">✓ Authorize</button>
                       <button class="btn-secondary" style="padding: 3px 8px; font-size: 11px; color: #64748b; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; cursor: pointer; margin-left: 4px;" onclick="submitAIEmergencyReview(${pred.id}, 'REJECTED')">✕ Stand Down</button>`
                    : `<span style="font-size: 11px; color: #64748b;">Reviewed #${pred.reviewed_by || 'Staff'}</span>`;

                return `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 10px 14px;"><strong>#${pred.id}</strong></td>
                        <td style="padding: 10px 14px;">${escapeHTML(pred.entity_reference || 'EM-SOS')}</td>
                        <td style="padding: 10px 14px;"><strong style="color: #dc2626;">${out.estimated_travel_minutes != null ? out.estimated_travel_minutes + ' min' : '--'}</strong></td>
                        <td style="padding: 10px 14px;">${out.distance_km != null ? out.distance_km + ' km' : '--'}</td>
                        <td style="padding: 10px 14px;"><span style="font-size: 11px; font-weight: 700;">${escapeHTML(out.priority_level || 'P2_URGENT')}</span></td>
                        <td style="padding: 10px 14px; font-size: 11px; color: #64748b;">${new Date(pred.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                        <td style="padding: 10px 14px;">${statusBadge}</td>
                        <td style="padding: 10px 14px;">${actions}</td>
                    </tr>
                `;
            }).join("");
        }
    } catch (e) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #ef4444; padding: 14px;">Log unavailable: Login as staff to view and authorize entries.</td></tr>`;
    }
}

async function submitAIEmergencyReview(predictionId, actionTaken) {
    try {
        const token = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getToken) 
            ? SmartCityAuth.getToken() 
            : (localStorage.getItem("sc_token") || localStorage.getItem("token") || "");
        
        if (!token) {
            alert("Dispatcher login required to record review actions.");
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
                comments: `Emergency dispatcher review: ${actionTaken} via Emergency UI.`
            })
        });

        const json = await res.json();
        if (json.success) {
            alert(`Dispatch prediction #${predictionId} marked as ${actionTaken}.`);
            loadAIEmergencyAuditTable();
        } else {
            alert(json.message || "Could not record dispatch review.");
        }
    } catch (err) {
        alert("Failed to submit review: " + err.message);
    }
}

// Window exports
window.onAIEmergencyPresetChange = onAIEmergencyPresetChange;
window.runAIEmergencyDispatchEstimate = runAIEmergencyDispatchEstimate;
window.confirmAIEmergencyDispatch = confirmAIEmergencyDispatch;
window.loadAIEmergencyAuditTable = loadAIEmergencyAuditTable;
window.submitAIEmergencyReview = submitAIEmergencyReview;

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", function () {
    if (typeof loadAIEmergencyAuditTable === "function") {
        loadAIEmergencyAuditTable();
    }
});

