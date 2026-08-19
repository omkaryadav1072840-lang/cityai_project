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


/* =====================================================
   INITIALIZE
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeEmergencyMap();

        checkStaffPermission();

        loadSavedEmergencies();

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
   LOAD SAVED EMERGENCIES
===================================================== */

function loadSavedEmergencies() {

    const emergencies =
        JSON.parse(
            localStorage.getItem(
                "smartCityEmergencies"
            )
        ) || [];


    emergencies.forEach(
        emergency => {

            addEmergencyToUI(
                emergency
            );

        }
    );


    updateActiveCount();

}


/* =====================================================
   ACTIVE COUNT
===================================================== */

function updateActiveCount() {

    const emergencies =
        JSON.parse(
            localStorage.getItem(
                "smartCityEmergencies"
            )
        ) || [];


    const count =
        emergencies.filter(
            item =>
                item.status === "ACTIVE"
        ).length;


    const defaultCount =
        2;


    document.getElementById(
        "activeCount"
    ).textContent =
        defaultCount + count;

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

    // Default: disabled
    updateBtn.disabled = true;
    dispatchBtn.disabled = true;
    closeBtn.disabled = true;

    const session =
        localStorage.getItem("smartCityCurrentUser");

    if (!session) {

        accessText.innerHTML =
            "❌ You are not logged in.";

        return;
    }

    let user;

    try {

        user = JSON.parse(session);

    } catch (error) {

        accessText.innerHTML =
            "❌ Invalid login session.";

        return;
    }

    console.log("CURRENT LOGIN USER:", user);

    /*
    ============================================
    STAFF CHECK
    ============================================
    */

    const userType =
        String(user.type || "").toLowerCase().trim();

    const department =
        String(user.department || "").toLowerCase().trim();

    /*
    Emergency staff
    */

    if (
        userType === "staff" &&
        department === "emergency"
    ) {

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

        updateBtn.disabled = false;
        dispatchBtn.disabled = false;
        closeBtn.disabled = false;

        updateBtn.style.opacity = "1";
        dispatchBtn.style.opacity = "1";
        closeBtn.style.opacity = "1";

        return;
    }

    /*
    Other staff
    */

    if (userType === "staff") {

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

        return;
    }

    /*
    Normal user
    */

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
   CHECK STAFF
===================================================== */

function isEmergencyStaff() {

    const session =
        localStorage.getItem(
            "smartCityCurrentUser"
        );


    if (!session) {

        return false;

    }


    try {

        const user =
            JSON.parse(
                session
            );


        return (

            user.type === "staff" &&

            user.department === "emergency"

        );

    }

    catch {

        return false;

    }

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
   CHECK EMERGENCY STAFF
===================================================== */

function isEmergencyStaff() {

    const user =
        getCurrentEmergencyUser();

    if (!user) {

        return false;

    }

    return (

        String(user.type)
            .toLowerCase()
            .trim() === "staff"

        &&

        String(user.department)
            .toLowerCase()
            .trim() === "emergency"

    );

}


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


    saveEmergencyIncidents(
        incidents
    );


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


/* =====================================================
   UPDATE ACTIVE COUNT
===================================================== */

function updateActiveCount() {

    const incidents =
        getEmergencyIncidents();


    const active =
        incidents.filter(
            incident =>

                incident.status !==
                "RESOLVED"

        ).length;


    const count =
        2 + active;


    const element =
        document.getElementById(
            "activeCount"
        );


    if (element) {

        element.textContent =
            count;

    }

}


/* =====================================================
   UPDATE STAFF PERMISSION
===================================================== */

function checkStaffPermission() {

    const accessText =
        document.getElementById(
            "staffAccessText"
        );


    if (!accessText) {
        return;
    }


    const user =
        getCurrentEmergencyUser();


    if (!user) {

        accessText.innerHTML =
            "❌ Please login to access staff controls.";

        return;

    }


    if (
        isEmergencyStaff()
    ) {

        accessText.innerHTML = `

            <span style="
                color:#16a34a;
                font-weight:800;
            ">
                ✓ Emergency Staff Access
            </span>

            <br>

            <small>
                ${user.name || "Staff"}
                — Full emergency management access.
            </small>

        `;

        initializeIncidentControl();

    }

    else if (
        String(user.type)
            .toLowerCase() === "staff"
    ) {

        accessText.innerHTML = `

            <span style="
                color:#d97706;
                font-weight:800;
            ">
                ⚠ Staff View Only
            </span>

            <br>

            <small>
                ${user.name || "Staff"}
                — ${user.department || "Department"}
                staff cannot edit emergency incidents.
            </small>

        `;

    }

    else {

        accessText.innerHTML = `

            <span style="
                color:#2563eb;
                font-weight:800;
            ">
                👤 Citizen / User
            </span>

            <br>

            <small>
                You can view and report emergencies.
            </small>

        `;

    }

}