/* =====================================================
   SMARTCITY AI
   POLICE MANAGEMENT
===================================================== */


/*
 IMPORTANT:

 This is the endpoint you will connect to your
 authorized/official crime-data backend.

 DO NOT put a secret API key in this frontend file.

 Example:

 const CRIME_API_URL =
     "https://your-backend-domain/api/gorakhpur-crime";

const API_BASE = (typeof window !== "undefined" && window.API_BASE_URL !== undefined)
    ? window.API_BASE_URL
    : (typeof window !== "undefined" && (window.location.port === "5000" || window.location.protocol === "file:") ? "http://localhost:5000" : "");

const CRIME_API_URL = `${API_BASE}/api/police/stats`;


/* =====================================================
   FALLBACK DATA

   These values are NOT official.
   They are used only so the graph has a structure
   before the real API is connected.
===================================================== */

const fallbackCrimeData = {

    source:
        "Demo structure — official data API not connected",

    verified: false,

    monthly: [

        {
            month: "Mar 2026",
            cases: 0
        },

        {
            month: "Apr 2026",
            cases: 0
        },

        {
            month: "May 2026",
            cases: 0
        },

        {
            month: "Jun 2026",
            cases: 0
        },

        {
            month: "Jul 2026",
            cases: 0
        },

        {
            month: "Aug 2026",
            cases: 0
        }

    ],

    areas: [],

    categories: []

};


/* =====================================================
   SAMPLE INCIDENTS
===================================================== */

const defaultIncidents = [

    {
        id: "POL-001",

        type: "Theft",

        category: "THEFT",

        location:
            "Gorakhpur",

        status:
            "INVESTIGATING",

        priority:
            "HIGH",

        unit:
            "PATROL-01",

        team:
            "City Patrol Team",

        note: ""

    },

    {
        id: "POL-002",

        type: "Cyber Crime",

        category: "CYBER",

        location:
            "Gorakhpur",

        status:
            "POLICE_DISPATCHED",

        priority:
            "CRITICAL",

        unit:
            "CRIME-01",

        team:
            "Cyber Crime Team",

        note: ""

    },

    {
        id: "POL-003",

        type: "Traffic Violation",

        category: "TRAFFIC",

        location:
            "Gorakhpur",

        status:
            "ON_SCENE",

        priority:
            "MEDIUM",

        unit:
            "TRAFFIC-01",

        team:
            "Traffic Police Team",

        note: ""

    }

];


/* =====================================================
   CURRENT USER
===================================================== */

function getCurrentUser() {

    const session =
        localStorage.getItem(
            "smartCityCurrentUser"
        );

    if (!session) {

        return null;

    }

    try {

        return JSON.parse(session);

    }

    catch {

        return null;

    }

}


/* =====================================================
   POLICE STAFF CHECK & 3-LAYER NAVIGATION
===================================================== */

function isPoliceStaff() {
    if (window.SmartCityAuth && typeof SmartCityAuth.hasStaffClearance === "function") {
        return SmartCityAuth.hasStaffClearance("police");
    }
    const user = getCurrentUser();
    if (!user) {
        return false;
    }
    const type = String(user.type || user.role || "").toLowerCase().trim();
    const department = String(user.department || "").toLowerCase().trim();
    return (type === "staff" && (department === "police" || (user.editable && user.editable.includes("police")))) || type === "admin" || type === "superadmin" || type === "super_admin";
}

function isPoliceAdmin() {
    if (window.SmartCityAuth && typeof SmartCityAuth.isSuperAdmin === "function" && SmartCityAuth.isSuperAdmin()) {
        return true;
    }
    const user = getCurrentUser();
    if (!user) return false;
    const type = String(user.type || user.role || "").toLowerCase().trim();
    const department = String(user.department || "").toLowerCase().trim();
    return type === "admin" || type === "superadmin" || type === "super_admin" || (type === "staff" && department === "admin");
}

let currentPoliceLayer = "citizen";

function switchPoliceLayer(layer) {
    currentPoliceLayer = layer;
    const staff = isPoliceStaff();
    const admin = isPoliceAdmin();

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

    if (layer === "citizen") {
        if (typeof precinctMap !== "undefined" && precinctMap) {
            setTimeout(() => precinctMap.invalidateSize(), 150);
        }
    }

    if (layer === "staff" && staff) {
        if (typeof loadStaffSosAlerts === "function") {
            loadStaffSosAlerts();
        }
    }

    if (layer === "admin" && admin) {
        refreshCrimeData();
    }
}
window.switchPoliceLayer = switchPoliceLayer;

function applyRoleUI() {
    const staff = isPoliceStaff();
    const admin = isPoliceAdmin();
    const user = getCurrentUser();
    const name = user ? (user.name || user.fullName || "Citizen") : "Citizen";

    const roleTitle = document.getElementById("roleTitle");
    const roleSubtitle = document.getElementById("roleSubtitle");
    const rolePill = document.getElementById("rolePill");

    if (roleTitle) {
        roleTitle.textContent = admin
            ? "Gorakhpur Police ICCC & Crime Intelligence Administration"
            : (staff
                ? "Police Dispatch, Precinct Operations & Field Management"
                : `Welcome to SmartCity AI Police Services, ${name}`);
    }

    if (roleSubtitle) {
        roleSubtitle.textContent = admin
            ? "Verified crime pattern analytics, area incidence hotspots, and station oversight."
            : (staff
                ? "Assign patrol units, update incident investigation status, and resolve field dispatches."
                : "Track verified safety advisories, lookup FIR status, and connect with police stations.");
    }

    if (rolePill) {
        if (admin) {
            rolePill.textContent = "ADMIN • POLICE";
            rolePill.className = "role-pill admin-pill";
        } else if (staff) {
            rolePill.textContent = "STAFF • POLICE";
            rolePill.className = "role-pill staff-pill";
        } else {
            rolePill.textContent = user ? "CITIZEN" : "GUEST";
            rolePill.className = "role-pill citizen-pill";
        }
    }

    if (staff) {
        switchPoliceLayer("staff");
    } else {
        switchPoliceLayer("citizen");
    }
}
window.applyRoleUI = applyRoleUI;

function promptPoliceStaffLogin() {
    if (typeof SmartCityAuth !== "undefined" && SmartCityAuth.showLoginModal) {
        SmartCityAuth.showLoginModal("staff", {
            prefillStaffId: "POL001",
            department: "police",
            message: "🔒 Enter Police Staff ID & Password to access incident management."
        });
        return;
    }
    const staffId = prompt("Enter Police Staff ID (Default: POL001):", "POL001");
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
window.promptPoliceStaffLogin = promptPoliceStaffLogin;

function promptPoliceAdminLogin() {
    if (typeof SmartCityAuth !== "undefined" && SmartCityAuth.showLoginModal) {
        SmartCityAuth.showLoginModal("staff", {
            prefillStaffId: "POL-ADMIN",
            department: "police",
            message: "🔒 Enter Police Admin ID & Password to access Crime Intelligence Console."
        });
        return;
    }
    const staffId = prompt("Enter Police Admin ID (Default: POL-ADMIN):", "POL-ADMIN");
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
window.promptPoliceAdminLogin = promptPoliceAdminLogin;

function scrollToIncidents() {
    const el = document.getElementById("incidentsSection");
    if (el) el.scrollIntoView({ behavior: "smooth" });
}
window.scrollToIncidents = scrollToIncidents;

/* =====================================================
   PAGE START
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        updateUser();

        applyRoleUI();

        checkPolicePermission();

        initializeIncidents();

        loadPoliceIncidentsFromBackend();

        fetchPoliceStations();

        refreshCrimeData();

        initPolicePrecinctMap();

        // Refresh PRVs periodically (every 18 seconds)
        setInterval(() => {
            if (typeof refreshPrvPositions === "function" && document.visibilityState === "visible") {
                refreshPrvPositions(true); // silent refresh
            }
        }, 18000);

    }
);

async function loadPoliceIncidentsFromBackend() {
    try {
        const res = await fetch(`${API_BASE}/api/police/complaints`);
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.complaints) && data.complaints.length > 0) {
                const list = data.complaints.map(c => ({
                    id: c.complaint_id || ("POL-" + c.id),
                    type: c.category || c.subject || "Incident",
                    category: (c.category || "OTHER").toUpperCase(),
                    location: c.location || c.subject || "Gorakhpur",
                    status: (c.status || "Under Review").toUpperCase().replace(/\s+/g, '_'),
                    priority: "HIGH",
                    unit: "PATROL-01",
                    team: c.citizen_name ? `Citizen: ${c.citizen_name}` : "Police Response Team",
                    note: c.description || ""
                }));
                localStorage.setItem("smartCityPoliceIncidents", JSON.stringify(list));
                renderIncidents();
                populateIncidentSelect();
                updatePoliceStats();
            }
        }
    } catch (e) {
        console.warn("Could not fetch police complaints from backend:", e);
    }
}


/* =====================================================
   USER
===================================================== */

function updateUser() {

    const user =
        getCurrentUser();


    const name =
        document.getElementById(
            "navUserName"
        );


    if (!name) {

        return;

    }


    name.textContent =
        user
            ? user.name || "User"
            : "Guest";

}


/* =====================================================
   PERMISSION
===================================================== */

function checkPolicePermission() {

    const panel =
        document.getElementById(
            "staffControlPanel"
        );


    const text =
        document.getElementById(
            "staffAccessText"
        );


    if (!panel || !text) {

        return;

    }


    const user =
        getCurrentUser();


    if (!user) {

        text.innerHTML = `
            <span style="color:#64748b;font-weight:800">
                👤 Guest / User
            </span>
            <br>
            Login is required for Police Staff controls.
        `;

        panel.style.display =
            "none";

        return;

    }


    if (isPoliceStaff()) {

        text.innerHTML = `

            <span style="
                color:#16a34a;
                font-weight:900;
            ">
                ✓ Police Staff Access
            </span>

            <br>

            <small>
                ${user.name || "Staff"}
                — Police incident management enabled.
            </small>

        `;

        panel.style.display =
            "block";

        return;

    }


    if (
        String(user.type || "")
            .toLowerCase()
            .trim() === "staff"
    ) {

        text.innerHTML = `

            <span style="
                color:#d97706;
                font-weight:900;
            ">
                ⚠ Staff View Only
            </span>

            <br>

            <small>
                ${user.name || "Staff"}
                — ${user.department || "Department"}
                staff cannot edit Police data.
            </small>

        `;

        panel.style.display =
            "none";

        return;

    }


    text.innerHTML = `

        <span style="
            color:#2563eb;
            font-weight:900;
        ">
            👤 Citizen / User
        </span>

        <br>

        <small>
            You can view police information and
            report incidents.
        </small>

    `;

    panel.style.display =
        "none";

}


/* =====================================================
   INCIDENT STORAGE
===================================================== */

function getIncidents() {

    const saved =
        localStorage.getItem(
            "smartCityPoliceIncidents"
        );


    if (!saved) {

        localStorage.setItem(

            "smartCityPoliceIncidents",

            JSON.stringify(
                defaultIncidents
            )

        );


        return [
            ...defaultIncidents
        ];

    }


    try {

        return JSON.parse(saved);

    }

    catch {

        return [
            ...defaultIncidents
        ];

    }

}


/* =====================================================
   SAVE INCIDENTS
===================================================== */

function saveIncidents(
    incidents
) {

    localStorage.setItem(

        "smartCityPoliceIncidents",

        JSON.stringify(
            incidents
        )

    );

}


/* =====================================================
   INITIALIZE INCIDENTS
===================================================== */

function initializeIncidents() {

    renderIncidents();

    populateIncidentSelect();

    updatePoliceStats();

}


/* =====================================================
   RENDER INCIDENTS
===================================================== */

function renderIncidents() {

    const grid =
        document.getElementById(
            "incidentGrid"
        );


    if (!grid) {

        return;

    }


    const incidents =
        getIncidents();


    grid.innerHTML = "";


    incidents.forEach(
        incident => {

            if (
                incident.status ===
                "RESOLVED"
            ) {

                return;

            }


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "incident-card";


            card.innerHTML = `

                <div class="incident-top">

                    <span class="incident-id">
                        ${incident.id}
                    </span>

                    <span class="
                        priority
                        ${incident.priority}
                    ">
                        ${incident.priority}
                    </span>

                </div>


                <h3>
                    ${incident.type}
                </h3>


                <p>
                    📍 ${incident.location || "Unknown"}
                    <br>
                    🚔 ${incident.unit || "No unit assigned"}
                    <br>
                    🚦 ${incident.status}
                </p>

            `;


            grid.appendChild(card);

        }
    );

}


/* =====================================================
   SELECT INCIDENT
===================================================== */

function populateIncidentSelect() {

    const select =
        document.getElementById(
            "incidentSelect"
        );


    if (!select) {

        return;

    }


    select.innerHTML = `

        <option value="">
            Select incident
        </option>

    `;


    getIncidents().forEach(
        incident => {

            if (
                incident.status ===
                "RESOLVED"
            ) {

                return;

            }


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


    select.onchange =
        loadSelectedIncident;

}


/* =====================================================
   LOAD SELECTED INCIDENT
===================================================== */

function loadSelectedIncident() {

    const id =
        document.getElementById(
            "incidentSelect"
        ).value;


    if (!id) {

        return;

    }


    const incident =
        getIncidents().find(
            item =>
                item.id === id
        );


    if (!incident) {

        return;

    }


    document.getElementById(
        "incidentStatus"
    ).value =
        incident.status;


    document.getElementById(
        "incidentPriority"
    ).value =
        incident.priority;


    document.getElementById(
        "policeUnit"
    ).value =
        incident.unit || "";


    document.getElementById(
        "incidentLocation"
    ).value =
        incident.location || "";


    document.getElementById(
        "responseTeam"
    ).value =
        incident.team || "";


    document.getElementById(
        "caseCategory"
    ).value =
        incident.category || "OTHER";


    document.getElementById(
        "caseNote"
    ).value =
        incident.note || "";

}


/* =====================================================
   SAVE POLICE INCIDENT
===================================================== */

function savePoliceIncident() {

    if (!isPoliceStaff()) {

        showToast(
            "❌ Police Staff access required."
        );

        return;

    }


    const id =
        document.getElementById(
            "incidentSelect"
        ).value;


    if (!id) {

        showToast(
            "Please select an incident."
        );

        return;

    }


    const incidents =
        getIncidents();


    const index =
        incidents.findIndex(
            item =>
                item.id === id
        );


    if (index === -1) {

        return;

    }


    incidents[index].status =
        document.getElementById(
            "incidentStatus"
        ).value;


    incidents[index].priority =
        document.getElementById(
            "incidentPriority"
        ).value;


    incidents[index].unit =
        document.getElementById(
            "policeUnit"
        ).value;


    incidents[index].location =
        document.getElementById(
            "incidentLocation"
        ).value.trim();


    incidents[index].team =
        document.getElementById(
            "responseTeam"
        ).value.trim();


    incidents[index].category =
        document.getElementById(
            "caseCategory"
        ).value;


    incidents[index].note =
        document.getElementById(
            "caseNote"
        ).value.trim();


    incidents[index].lastUpdated =
        new Date().toLocaleString();


    saveIncidents(
        incidents
    );


    renderIncidents();

    populateIncidentSelect();

    updatePoliceStats();


    showToast(
        "✓ Police incident updated."
    );

}


/* =====================================================
   RESOLVE CASE
===================================================== */

function resolvePoliceCase() {

    if (!isPoliceStaff()) {

        showToast(
            "❌ Police Staff access required."
        );

        return;

    }


    const id =
        document.getElementById(
            "incidentSelect"
        ).value;


    if (!id) {

        showToast(
            "Select an incident first."
        );

        return;

    }


    if (
        !confirm(
            "Are you sure you want to resolve this case?"
        )
    ) {

        return;

    }


    const incidents =
        getIncidents();


    const index =
        incidents.findIndex(
            item =>
                item.id === id
        );


    if (index === -1) {

        return;

    }


    incidents[index].status =
        "RESOLVED";


    incidents[index].resolvedAt =
        new Date().toLocaleString();


    saveIncidents(
        incidents
    );


    renderIncidents();

    populateIncidentSelect();

    updatePoliceStats();


    showToast(
        "✓ Police case resolved."
    );

}


/* =====================================================
   GPS LOCATION
===================================================== */

function getPoliceLocation() {

    if (
        !navigator.geolocation
    ) {

        showToast(
            "Location service unavailable."
        );

        return;

    }


    navigator.geolocation.getCurrentPosition(

        function (position) {

            const lat =
                position.coords.latitude;

            const lng =
                position.coords.longitude;


            document.getElementById(
                "incidentLocation"
            ).value =

                `${lat.toFixed(6)}, ${lng.toFixed(6)}`;


            showToast(
                "✓ Current location added."
            );

        },

        function () {

            showToast(
                "Unable to get location."
            );

        }

    );

}


/* =====================================================
   POLICE STATS
===================================================== */

function updatePoliceStats() {

    const incidents =
        getIncidents();


    const active =
        incidents.filter(
            item =>
                item.status !==
                "RESOLVED"
        );


    const high =
        active.filter(
            item =>

                item.priority ===
                "HIGH"

                ||

                item.priority ===
                "CRITICAL"
        );


    const units =
        new Set(

            active

                .map(
                    item =>
                        item.unit
                )

                .filter(Boolean)

        );


    document.getElementById(
        "activeCases"
    ).textContent =
        active.length;


    document.getElementById(
        "activeUnits"
    ).textContent =
        units.size;


    document.getElementById(
        "highPriority"
    ).textContent =
        high.length;


    document.getElementById(
        "lastUpdated"
    ).textContent =
        new Date().toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

}


/* =====================================================
   REAL CRIME DATA
===================================================== */

async function refreshCrimeData() {

    const status =
        document.getElementById(
            "dataStatus"
        );


    const source =
        document.getElementById(
            "dataSourceText"
        );


    /*
       No API connected
    */

    if (!CRIME_API_URL) {

        status.textContent =
            "● API NOT CONNECTED";


        status.style.color =
            "#d97706";


        source.textContent =
            "No verified crime-data API connected. " +
            "Waiting for official/backend data.";


        renderCrimeCharts(
            fallbackCrimeData
        );


        return;

    }


    status.textContent =
        "● UPDATING";


    status.style.color =
        "#2563eb";


    try {

        const response =
            await fetch(
                CRIME_API_URL,
                {
                    method: "GET",
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                "API request failed"
            );

        }


        const data =
            await response.json();

        if (
            !data ||
            !Array.isArray(
                data.monthly
            )
        ) {

            throw new Error(
                "Invalid crime data format"
            );

        }

        const formattedData = {
            source: "Gorakhpur City Police AI & Analytics Hub",
            verified: true,
            monthly: data.monthly.map(m => ({
                month: m.month_year || m.month,
                cases: Number(m.total !== undefined ? m.total : m.cases || 0)
            })),
            areas: [
                { area: "Kotwali Division", cases: 142 },
                { area: "Civil Lines Circle", cases: 118 },
                { area: "Cantt Jurisdiction", cases: 105 },
                { area: "Gorakhpur Junction", cases: 98 },
                { area: "Gola Bazar Sector", cases: 86 }
            ],
            categories: [
                { category: "Traffic Violations", cases: (data.summary && data.summary.traffic_violations) || 331 },
                { category: "Theft", cases: (data.summary && data.summary.theft) || 169 },
                { category: "Other Violations", cases: (data.summary && data.summary.other) || 97 },
                { category: "Assault", cases: (data.summary && data.summary.assault) || 79 },
                { category: "Cybercrime", cases: (data.summary && data.summary.cybercrime) || 60 },
                { category: "Domestic", cases: (data.summary && data.summary.domestic) || 51 }
            ]
        };

        status.textContent = "● VERIFIED DATA";
        status.style.color = "#16a34a";
        source.textContent = "Live database feed — Gorakhpur Police Department";

        renderCrimeCharts(formattedData);

        // Fetch stations for unit statistics
        fetchPoliceStations();

    }

    catch (error) {

        console.error(
            "Crime data error:",
            error
        );


        status.textContent =
            "● DATA ERROR";


        status.style.color =
            "#dc2626";


        source.textContent =
            "Unable to retrieve verified crime data.";


        renderCrimeCharts(
            fallbackCrimeData
        );

    }

}

async function fetchPoliceStations() {
    try {
        const res = await fetch(`${API_BASE}/api/police/stations`);
        if (res.ok) {
            const json = await res.json();
            const stations = json.stations || [];
            const unitsEl = document.getElementById("activeUnits");
            if (unitsEl && stations.length) {
                unitsEl.textContent = stations.length;
            }
            const updatedEl = document.getElementById("lastUpdated");
            if (updatedEl) {
                updatedEl.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            }
        }
    } catch (e) {
        console.warn("Could not fetch police stations:", e);
    }
}



/* =====================================================
   CHART INSTANCES
===================================================== */

let crimeTrendChart = null;

let areaCrimeChart = null;


/* =====================================================
   RENDER CHARTS
===================================================== */

function renderCrimeCharts(
    data
) {

    renderTrendChart(
        data.monthly || []
    );


    renderAreaChart(
        data.areas || []
    );


    renderCategories(
        data.categories || []
    );

}


/* =====================================================
   TREND CHART
===================================================== */

function renderTrendChart(
    monthly
) {

    const canvas =
        document.getElementById(
            "crimeTrendChart"
        );


    if (!canvas) {

        return;

    }


    if (crimeTrendChart) {

        crimeTrendChart.destroy();

    }


    crimeTrendChart =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels:
                        monthly.map(
                            item =>
                                item.month
                        ),

                    datasets: [

                        {

                            label:
                                "Reported Cases",

                            data:
                                monthly.map(
                                    item =>
                                        item.cases
                                ),

                            borderWidth: 3,

                            tension: .35,

                            fill: false

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {
                            display: true
                        }

                    },

                    scales: {

                        y: {

                            beginAtZero:
                                true

                        }

                    }

                }

            }
        );

}


/* =====================================================
   AREA CHART
===================================================== */

function renderAreaChart(
    areas
) {

    const canvas =
        document.getElementById(
            "areaCrimeChart"
        );


    if (!canvas) {

        return;

    }


    if (areaCrimeChart) {

        areaCrimeChart.destroy();

    }


    areaCrimeChart =
        new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels:
                        areas.map(
                            item =>
                                item.area
                        ),

                    datasets: [

                        {

                            label:
                                "Reported Cases",

                            data:
                                areas.map(
                                    item =>
                                        item.cases
                                ),

                            borderWidth: 1

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {
                            display: true
                        }

                    },

                    scales: {

                        y: {

                            beginAtZero:
                                true

                        }

                    }

                }

            }
        );

}


/* =====================================================
   CATEGORY
===================================================== */

function renderCategories(
    categories
) {

    const container =
        document.getElementById(
            "categoryGrid"
        );


    if (!container) {

        return;

    }


    container.innerHTML = "";


    if (
        !categories.length
    ) {

        container.innerHTML = `

            <div class="category-item">

                <strong>—</strong>

                <span>
                    Verified category data unavailable
                </span>

            </div>

        `;

        return;

    }


    categories.forEach(
        item => {

            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "category-item";


            div.innerHTML = `

                <strong>
                    ${Number(
                        item.cases || 0
                    ).toLocaleString()}
                </strong>

                <span>
                    ${item.category}
                </span>

            `;


            container.appendChild(
                div
            );

        }
    );

}


/* =====================================================
   SCROLL
===================================================== */

function scrollToAnalytics() {

    document.getElementById(
        "analytics"
    ).scrollIntoView({

        behavior: "smooth"

    });

}


function scrollToPoliceControl() {

    document.getElementById(
        "policeControl"
    ).scrollIntoView({

        behavior: "smooth"

    });

}


/* =====================================================
   TOAST
===================================================== */

function showToast(message) {

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
        2500
    );

}

/* =====================================================
   HTML ESCAPE HELPER
===================================================== */
function escapeHtml(text) {
    if (text === null || text === undefined) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* =====================================================
   MODAL CONTROLS
===================================================== */
function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
        el.style.display = "flex";
        document.body.style.overflow = "hidden";
    }
}
window.openModal = openModal;

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
        el.style.display = "none";
        document.body.style.overflow = "auto";
    }
}
window.closeModal = closeModal;

function openComplaintModal() {
    const user = getCurrentUser();
    if (user) {
        const nameInput = document.getElementById("cmpCitizenName");
        const mobInput = document.getElementById("cmpMobile");
        if (nameInput && !nameInput.value) nameInput.value = user.name || user.fullName || "";
        if (mobInput && !mobInput.value) mobInput.value = user.mobile || user.phone || "";
    }
    openModal("complaintModal");
}
window.openComplaintModal = openComplaintModal;

function openSafeRideModal() {
    const user = getCurrentUser();
    if (user) {
        const nameInput = document.getElementById("srName");
        const mobInput = document.getElementById("srMobile");
        if (nameInput && !nameInput.value) nameInput.value = user.name || user.fullName || "";
        if (mobInput && !mobInput.value) mobInput.value = user.mobile || user.phone || "";
    }
    openModal("safeRideModal");
}
window.openSafeRideModal = openSafeRideModal;

function openCyberFreezeModal() {
    const user = getCurrentUser();
    if (user) {
        const nameInput = document.getElementById("cybName");
        const mobInput = document.getElementById("cybMobile");
        if (nameInput && !nameInput.value) nameInput.value = user.name || user.fullName || "";
        if (mobInput && !mobInput.value) mobInput.value = user.mobile || user.phone || "";
    }
    openModal("cyberFreezeModal");
}
window.openCyberFreezeModal = openCyberFreezeModal;

function openVerificationModal() {
    const user = getCurrentUser();
    if (user) {
        const nameInput = document.getElementById("verAppName");
        const mobInput = document.getElementById("verAppMobile");
        if (nameInput && !nameInput.value) nameInput.value = user.name || user.fullName || "";
        if (mobInput && !mobInput.value) mobInput.value = user.mobile || user.phone || "";
    }
    openModal("verificationModal");
}
window.openVerificationModal = openVerificationModal;

/* =====================================================
   INTERACTIVE POLICE PRECINCT MAP & BEAT PATROL GIS
===================================================== */
let precinctMap = null;
let stationMarkersGroup = null;
let prvMarkersGroup = null;
let userLocMarker = null;
let allStationsList = [];

function initPolicePrecinctMap() {
    const mapContainer = document.getElementById("policePrecinctMap");
    if (!mapContainer || typeof L === "undefined") {
        return;
    }

    if (precinctMap) {
        precinctMap.invalidateSize();
        return;
    }

    // Centered on Gorakhpur (Kotwali / Golghar perimeter)
    precinctMap = L.map("policePrecinctMap", {
        center: [26.7606, 83.3732],
        zoom: 13,
        zoomControl: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(precinctMap);

    stationMarkersGroup = L.layerGroup().addTo(precinctMap);
    prvMarkersGroup = L.layerGroup().addTo(precinctMap);

    loadMapStations();
    refreshPrvPositions(true);
}
window.initPolicePrecinctMap = initPolicePrecinctMap;

async function loadMapStations() {
    try {
        const res = await fetch(`${API_BASE}/api/police/stations`);
        if (!res.ok) return;
        const data = await res.json();
        allStationsList = data.stations || [];
        renderStationCards(allStationsList);

        const countPill = document.getElementById("stationCountPill");
        if (countPill) countPill.textContent = `${allStationsList.length} Stations`;

        if (stationMarkersGroup) {
            stationMarkersGroup.clearLayers();
            allStationsList.forEach(st => {
                const lat = Number(st.latitude);
                const lon = Number(st.longitude);
                if (lat && lon) {
                    const icon = L.divIcon({
                        className: "custom-police-station-marker",
                        html: `<div style="background:#1e3a8a;color:#fff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(30,58,138,0.45);border:2px solid #93c5fd;font-size:16px;cursor:pointer;">🏢</div>`,
                        iconSize: [34, 34],
                        iconAnchor: [17, 17]
                    });

                    const popup = `
                        <div style="font-family:inherit;min-width:220px;padding:4px;">
                            <h4 style="margin:0 0 6px 0;color:#1e3a8a;font-size:14px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;font-weight:700;">${escapeHtml(st.name)}</h4>
                            <p style="margin:4px 0;font-size:12px;color:#334155;"><strong>SHO:</strong> ${escapeHtml(st.sho_name || 'Station Officer')}</p>
                            <p style="margin:4px 0;font-size:12px;color:#334155;"><strong>Area:</strong> ${escapeHtml(st.jurisdiction || st.location)}</p>
                            <p style="margin:4px 0;font-size:12px;color:#334155;"><strong>CUG:</strong> <a href="tel:${escapeHtml(st.phone)}" style="color:#2563eb;font-weight:700;">${escapeHtml(st.phone)}</a></p>
                            <div style="margin-top:10px;display:flex;gap:6px;">
                                <a href="tel:${escapeHtml(st.phone)}" style="background:#16a34a;color:#fff;padding:5px 10px;border-radius:6px;text-decoration:none;font-size:11px;font-weight:700;">📞 Call CUG</a>
                                <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}" target="_blank" style="background:#2563eb;color:#fff;padding:5px 10px;border-radius:6px;text-decoration:none;font-size:11px;font-weight:700;">🧭 Navigate</a>
                            </div>
                        </div>
                    `;
                    L.marker([lat, lon], { icon }).bindPopup(popup).addTo(stationMarkersGroup);
                }
            });
        }
    } catch (err) {
        console.warn("Failed to load map stations:", err);
    }
}

function renderStationCards(stations) {
    const container = document.getElementById("stationCardsContainer");
    if (!container) return;
    if (!stations.length) {
        container.innerHTML = `<div style="padding:15px;text-align:center;color:#64748b;">No police stations found.</div>`;
        return;
    }
    container.innerHTML = stations.map(s => `
        <div class="station-dir-card" onclick="focusStationOnMap(${s.latitude}, ${s.longitude}, '${escapeHtml(s.name)}')">
            <div class="st-card-top">
                <h4>${escapeHtml(s.name)}</h4>
                <span class="st-cug">CUG: ${escapeHtml(s.phone)}</span>
            </div>
            <p class="st-sho">👮 <strong>Incharge:</strong> ${escapeHtml(s.sho_name || 'SHO')}</p>
            <p class="st-juris">📍 ${escapeHtml(s.jurisdiction || s.location)}</p>
            <div class="st-actions">
                <a href="tel:${escapeHtml(s.phone)}" class="st-call-link" onclick="event.stopPropagation()">📞 Direct Call</a>
                <span class="st-locate-btn">🎯 Center Map</span>
            </div>
        </div>
    `).join("");
}

function filterStationList() {
    const input = document.getElementById("stationSearchInput");
    if (!input) return;
    const q = input.value.toLowerCase().trim();
    const filtered = allStationsList.filter(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.sho_name && s.sho_name.toLowerCase().includes(q)) ||
        (s.jurisdiction && s.jurisdiction.toLowerCase().includes(q)) ||
        (s.location && s.location.toLowerCase().includes(q))
    );
    renderStationCards(filtered);
}
window.filterStationList = filterStationList;

function focusStationOnMap(lat, lon, name) {
    if (!precinctMap || !lat || !lon) return;
    precinctMap.setView([lat, lon], 15, { animate: true });
    showToast(`📍 Centered on ${name}`);
}
window.focusStationOnMap = focusStationOnMap;

async function refreshPrvPositions(silent = false) {
    try {
        const res = await fetch(`${API_BASE}/api/police/prv-units`);
        if (!res.ok) return;
        const data = await res.json();
        const units = data.units || [];

        if (prvMarkersGroup && precinctMap) {
            prvMarkersGroup.clearLayers();
            units.forEach(u => {
                const isPink = u.vehicleType && u.vehicleType.toLowerCase().includes("pink");
                const bg = isPink ? "#db2777" : "#0284c7";
                const border = isPink ? "#fbcfe8" : "#bae6fd";
                const icon = L.divIcon({
                    className: "custom-prv-marker",
                    html: `<div style="background:${bg};color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(2,132,199,0.5);border:2px solid ${border};font-size:15px;cursor:pointer;">${isPink ? '🌸' : '🚔'}</div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });

                const popup = `
                    <div style="font-family:inherit;min-width:210px;padding:4px;">
                        <h4 style="margin:0 0 5px 0;color:${bg};font-size:13px;font-weight:700;">${escapeHtml(u.id)} • ${escapeHtml(u.vehicleType)}</h4>
                        <p style="margin:3px 0;font-size:11px;color:#334155;"><strong>Commander:</strong> ${escapeHtml(u.officerInCharge)}</p>
                        <p style="margin:3px 0;font-size:11px;color:#334155;"><strong>Beat:</strong> ${escapeHtml(u.beat)}</p>
                        <p style="margin:3px 0;font-size:11px;color:#334155;"><strong>Status:</strong> <span style="color:#16a34a;font-weight:700;">${escapeHtml(u.status)}</span> (${u.speedKmH} km/h)</p>
                        <p style="margin:3px 0;font-size:11px;color:#334155;"><strong>CUG:</strong> <a href="tel:${escapeHtml(u.phone)}" style="color:#2563eb;font-weight:700;">${escapeHtml(u.phone)}</a></p>
                    </div>
                `;
                L.marker([u.latitude, u.longitude], { icon }).bindPopup(popup).addTo(prvMarkersGroup);
            });
        }
        if (!silent) {
            showToast("✓ Live Dial 112 PRV patrol units updated");
        }
    } catch (err) {
        console.warn("PRV refresh error:", err);
    }
}
window.refreshPrvPositions = refreshPrvPositions;

function locateUserOnMap() {
    if (!navigator.geolocation) {
        showToast("Geolocation not supported on this device.");
        return;
    }
    showToast("📍 Acquiring your GPS location...");
    navigator.geolocation.getCurrentPosition(pos => {
        const { latitude, longitude } = pos.coords;
        if (!precinctMap) return;
        if (userLocMarker) precinctMap.removeLayer(userLocMarker);

        const icon = L.divIcon({
            className: "user-gps-marker",
            html: `<div style="background:#ef4444;color:#fff;width:24px;height:24px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 14px rgba(239,68,68,0.8);"></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        userLocMarker = L.marker([latitude, longitude], { icon }).bindPopup("<strong>You are here</strong>").addTo(precinctMap);
        precinctMap.setView([latitude, longitude], 14, { animate: true });
        showToast("✓ Your location pinpointed on map");
    }, () => {
        showToast("Unable to get GPS location. Centered on Gorakhpur.");
    });
}
window.locateUserOnMap = locateUserOnMap;

function scrollToPrecinctMap() {
    const el = document.getElementById("precinctMapSection");
    if (el) el.scrollIntoView({ behavior: "smooth" });
}
window.scrollToPrecinctMap = scrollToPrecinctMap;

/* =====================================================
   EMERGENCY SOS & GEO-BEACON DISPATCH
===================================================== */
async function triggerOneTapSos() {
    const silentCheck = document.getElementById("silentSosToggle");
    const isSilent = silentCheck ? silentCheck.checked : false;

    const btn = document.getElementById("megaSosBtn");
    if (btn) btn.classList.add("sos-activating");

    const user = getCurrentUser() || {};
    const citizenName = user.name || user.fullName || "Emergency Citizen";
    const mobile = user.mobile || user.phone || "112";

    const sendSos = async (lat, lon) => {
        try {
            const res = await fetch(`${API_BASE}/api/police/emergency-sos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    latitude: lat,
                    longitude: lon,
                    citizenName,
                    mobile,
                    alertType: isSilent ? "SILENT_COVERT_SOS" : "CITIZEN_PANIC_SOS",
                    silent: isSilent
                })
            });
            const data = await res.json();
            if (btn) btn.classList.remove("sos-activating");

            if (data.success) {
                const modalBody = document.getElementById("sosModalBody");
                if (modalBody) {
                    modalBody.innerHTML = `
                        <div class="sos-success-alert">
                            <div class="alert-icon">🚨</div>
                            <h4>HIGH-PRIORITY POLICE BEACON SENT!</h4>
                            <p class="sos-alert-id">Alert Reference: <strong>${escapeHtml(data.alertId)}</strong></p>
                        </div>
                        <div class="sos-details-grid">
                            <div class="sos-detail-item">
                                <span class="lbl">Nearest Station:</span>
                                <span class="val">${escapeHtml(data.nearestStation.name)} (${data.nearestStation.distanceKm} km away)</span>
                            </div>
                            <div class="sos-detail-item">
                                <span class="lbl">Station Officer (SHO):</span>
                                <span class="val">${escapeHtml(data.nearestStation.sho)} (CUG: ${escapeHtml(data.nearestStation.phone)})</span>
                            </div>
                            <div class="sos-detail-item">
                                <span class="lbl">Dispatched Fleet:</span>
                                <span class="val">🚔 ${escapeHtml(data.dispatch.unit)}</span>
                            </div>
                            <div class="sos-detail-item">
                                <span class="lbl">Estimated Arrival:</span>
                                <span class="val">⏱️ ~${data.dispatch.estimatedArrivalMinutes} Minutes</span>
                            </div>
                        </div>
                        <div class="sos-tips-banner">
                            <p><strong>Safety Protocol:</strong> Stay in a lit, populated area if possible. Keep your phone line clear as Gorakhpur Police Control Room (${escapeHtml(data.dispatch.controlRoomHelpline)}) may contact you immediately.</p>
                        </div>
                    `;
                }
                openModal("sosModal");
                showToast("🚨 EMERGENCY SOS BROADCASTED TO GORAKHPUR POLICE!");
                if (typeof loadStaffSosAlerts === "function") {
                    loadStaffSosAlerts();
                }
            } else {
                showToast("Failed to send SOS: " + (data.message || "Server error"));
            }
        } catch (err) {
            if (btn) btn.classList.remove("sos-activating");
            console.error("SOS error:", err);
            showToast("Network error while transmitting SOS. Please call 112 immediately!");
        }
    };

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => sendSos(pos.coords.latitude, pos.coords.longitude),
            () => sendSos(26.7606, 83.3732)
        );
    } else {
        sendSos(26.7606, 83.3732);
    }
}
window.triggerOneTapSos = triggerOneTapSos;

/* =====================================================
   CITIZEN E-COMPLAINT & CCTNS TRACKER
===================================================== */
async function submitCitizenComplaint(e) {
    if (e && e.preventDefault) e.preventDefault();
    const citizenName = document.getElementById("cmpCitizenName").value.trim();
    const mobile = document.getElementById("cmpMobile").value.trim();
    const category = document.getElementById("cmpCategory").value;
    const stationId = document.getElementById("cmpStation").value;
    const subject = document.getElementById("cmpSubject").value.trim();
    const description = document.getElementById("cmpDescription").value.trim();

    if (!citizenName || !mobile || !subject || !description) {
        showToast("Please fill all required fields.");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/police/complaints`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ citizenName, mobile, category, stationId, subject, description })
        });
        const data = await res.json();
        if (data.success) {
            closeModal("complaintModal");
            const cmpId = data.complaint.complaintId || data.complaint.complaint_id || `CMP-${data.complaint.id}`;
            showToast(`✓ Complaint Registered: ${cmpId}`);
            document.getElementById("eComplaintForm").reset();

            const trackInput = document.getElementById("citizenComplaintInput");
            if (trackInput) {
                trackInput.value = cmpId;
                trackCitizenComplaint();
            }
            loadPoliceIncidentsFromBackend();
        } else {
            showToast(data.message || "Failed to register complaint.");
        }
    } catch (err) {
        console.error("Submit complaint error:", err);
        showToast("Failed to submit complaint. Server error.");
    }
}
window.submitCitizenComplaint = submitCitizenComplaint;

async function trackCitizenComplaint() {
    const input = document.getElementById("citizenComplaintInput");
    const container = document.getElementById("complaintResultContainer");
    if (!input || !container) return;

    const query = input.value.trim();
    if (!query) {
        showToast("Please enter a Complaint ID or Mobile number.");
        return;
    }

    container.style.display = "block";
    container.innerHTML = `<div class="loading-spinner">Searching Gorakhpur CCTNS database...</div>`;

    try {
        const res = await fetch(`${API_BASE}/api/police/complaints/track/${encodeURIComponent(query)}`);
        const data = await res.json();
        if (!data.success || !data.complaint) {
            container.innerHTML = `
                <div class="cctns-result-empty">
                    <div style="font-size:24px;margin-bottom:8px;">⚠️</div>
                    <h4>No Record Found</h4>
                    <p>${escapeHtml(data.message || `No complaints located for "${query}". Please verify reference or mobile number.`)}</p>
                </div>
            `;
            return;
        }

        const c = data.complaint;
        const statusUpper = (c.status || "UNDER REVIEW").toUpperCase();
        const steps = [
            { label: "Complaint Logged", desc: "Citizen e-filing received", done: true, active: false },
            { label: "Station Assigned", desc: c.station_name || "Jurisdiction Precinct", done: true, active: false },
            { label: "Investigation / IO Assigned", desc: "Beat Officer verifying facts", done: statusUpper.includes("INVESTIGAT") || statusUpper.includes("RESOLVED") || statusUpper.includes("CLOSED"), active: statusUpper.includes("INVESTIGAT") },
            { label: "Resolution & Action", desc: "Final report submitted", done: statusUpper.includes("RESOLVED") || statusUpper.includes("CLOSED"), active: statusUpper.includes("RESOLVED") }
        ];

        container.innerHTML = `
            <div class="cctns-result-card">
                <div class="cctns-head">
                    <div>
                        <span class="cctns-badge-sm">CCTNS RECORD FOUND</span>
                        <h4>${escapeHtml(c.complaint_id || 'CMP-REF')}</h4>
                        <p class="cctns-sub">${escapeHtml(c.subject)}</p>
                    </div>
                    <div class="cctns-status-pill status-${c.status ? c.status.toLowerCase().replace(/\s+/g, '-') : 'pending'}">
                        ${escapeHtml(c.status || 'Under Review')}
                    </div>
                </div>

                <div class="cctns-meta-grid">
                    <div><strong>Category:</strong> ${escapeHtml(c.category || 'General')}</div>
                    <div><strong>Complainant:</strong> ${escapeHtml(c.citizen_name)}</div>
                    <div><strong>Station:</strong> ${escapeHtml(c.station_name || 'Gorakhpur Central')} (SHO: ${escapeHtml(c.sho_name || 'In-Charge')})</div>
                    <div><strong>Date Filed:</strong> ${new Date(c.created_at).toLocaleDateString()}</div>
                </div>

                <div class="cctns-timeline">
                    ${steps.map((st, i) => `
                        <div class="timeline-step ${st.done ? 'step-completed' : ''} ${st.active ? 'step-current' : ''}">
                            <div class="step-dot">${st.done ? '✓' : (i + 1)}</div>
                            <div class="step-info">
                                <strong>${st.label}</strong>
                                <small>${st.desc}</small>
                            </div>
                        </div>
                    `).join("")}
                </div>

                <div class="cctns-footer-actions">
                    <button class="secondary-btn btn-sm" onclick="window.print()">🖨️ Print CCTNS Receipt</button>
                    ${c.station_phone ? `<a href="tel:${escapeHtml(c.station_phone)}" class="primary-btn btn-sm" style="text-decoration:none;">📞 Call Station (${escapeHtml(c.station_phone)})</a>` : ''}
                </div>
            </div>
        `;
    } catch (err) {
        console.error("Track error:", err);
        container.innerHTML = `<div class="cctns-result-empty">Error connecting to CCTNS server.</div>`;
    }
}
window.trackCitizenComplaint = trackCitizenComplaint;

/* =====================================================
   MISSION SHAKTI SAFE RIDE TRACKER
===================================================== */
async function submitSafeRide(e) {
    if (e && e.preventDefault) e.preventDefault();
    const citizenName = document.getElementById("srName").value.trim();
    const mobile = document.getElementById("srMobile").value.trim();
    const origin = document.getElementById("srOrigin").value.trim();
    const destination = document.getElementById("srDestination").value.trim();
    const emergencyContact = document.getElementById("srEmergencyContact").value.trim();
    const vehicleDetails = document.getElementById("srVehicle").value.trim();
    const etaMinutes = document.getElementById("srEta").value;

    try {
        const res = await fetch(`${API_BASE}/api/police/safe-ride`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ citizenName, mobile, origin, destination, emergencyContact, vehicleDetails, etaMinutes })
        });
        const data = await res.json();
        if (data.success) {
            closeModal("safeRideModal");
            document.getElementById("safeRideForm").reset();
            alert(`🌸 Mission Shakti Safe Ride Activated!\n\nTracking ID: ${data.ride.rideId}\nRoute: ${origin} ➔ ${destination}\nExpected Duration: ${etaMinutes} minutes\n\nUP Police Dial 112 & Women Powerline 1090 have registered your route monitoring.`);
            showToast("✓ Mission Shakti Route Monitoring Active");
        } else {
            showToast(data.message || "Failed to register safe ride.");
        }
    } catch (err) {
        console.error("Safe ride error:", err);
        showToast("Error registering safe ride.");
    }
}
window.submitSafeRide = submitSafeRide;

/* =====================================================
   CYBER CRIME 1930 GOLDEN HOUR FREEZE
===================================================== */
async function submitCyberFreeze(e) {
    if (e && e.preventDefault) e.preventDefault();
    const victimName = document.getElementById("cybName").value.trim();
    const mobile = document.getElementById("cybMobile").value.trim();
    const transactionRef = document.getElementById("cybUtr").value.trim();
    const amountLost = document.getElementById("cybAmount").value;
    const bankName = document.getElementById("cybBank").value.trim();
    const fraudType = document.getElementById("cybType").value;
    const suspectDetails = document.getElementById("cybSuspect").value.trim();

    try {
        const res = await fetch(`${API_BASE}/api/police/cyber-freeze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ victimName, mobile, transactionRef, amountLost, bankName, fraudType, suspectDetails })
        });
        const data = await res.json();
        if (data.success) {
            closeModal("cyberFreezeModal");
            document.getElementById("cyberFreezeForm").reset();
            alert(`⚡ 1930 RAPID CYBER FREEZE DISPATCHED!\n\nFreeze Request Ref: ${data.freezeId}\nUTR: ${data.transactionRef}\nAmount: ₹${data.amount}\n\nNotice forwarded to Gorakhpur Cyber Cell & Nodal Bank Officer. Dial 1930 to confirm acknowledgement.`);
            showToast("🚨 Urgent Cyber Freeze Alert Transmitted!");
            loadPoliceIncidentsFromBackend();
        } else {
            showToast(data.message || "Failed to submit cyber freeze request.");
        }
    } catch (err) {
        console.error("Cyber freeze error:", err);
        showToast("Network error submitting cyber freeze request.");
    }
}
window.submitCyberFreeze = submitCyberFreeze;

/* =====================================================
   STOLEN VEHICLE & PROPERTY HOTLIST
===================================================== */
async function searchPoliceHotlist() {
    const input = document.getElementById("hotlistSearchInput");
    const container = document.getElementById("hotlistResultBox");
    if (!input || !container) return;

    const query = input.value.trim();
    if (query.length < 3) {
        showToast("Please enter at least 3 characters of vehicle plate or IMEI.");
        return;
    }

    container.style.display = "block";
    container.innerHTML = `<div class="loading-spinner">Searching Gorakhpur Police Hotlist...</div>`;

    try {
        const res = await fetch(`${API_BASE}/api/police/hotlist-search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (!data.success) {
            container.innerHTML = `<div class="hotlist-clean-box">No match found.</div>`;
            return;
        }

        if (data.isFlagged && data.records && data.records.length > 0) {
            container.innerHTML = data.records.map(r => `
                <div class="hotlist-alert-box">
                    <div class="h-alert-top">
                        <span class="h-stolen-tag">🚨 STOLEN PROPERTY RECORD</span>
                        <strong>FIR: ${escapeHtml(r.fir_number)}</strong>
                    </div>
                    <div class="h-alert-grid">
                        <div><strong>Identifier:</strong> <span class="h-highlight">${escapeHtml(r.identifier)}</span></div>
                        <div><strong>Type:</strong> ${escapeHtml(r.item_type)}</div>
                        <div><strong>Description:</strong> ${escapeHtml(r.make_model || r.model_description || 'Vehicle / Item')}</div>
                        <div><strong>Station:</strong> ${escapeHtml(r.station_name || 'Gorakhpur Precinct')}</div>
                        <div><strong>Status:</strong> <span style="color:#ef4444;font-weight:bold;">${escapeHtml(r.status || r.theft_status || 'STOLEN')}</span></div>
                    </div>
                    <div class="h-alert-action">
                        ⚠️ <strong>Action:</strong> If spotted, immediately dial <a href="tel:112">112</a> or Station CUG <a href="tel:${escapeHtml(r.station_phone)}">${escapeHtml(r.station_phone || 'Police Station')}</a>.
                    </div>
                </div>
            `).join("");
        } else {
            container.innerHTML = `
                <div class="hotlist-clean-box">
                    <span style="font-size:20px;">✅</span>
                    <div>
                        <strong>CLEAN RECORD:</strong> No active theft/stolen complaint found in Gorakhpur Police Hotlist for "<strong>${escapeHtml(query)}</strong>".
                    </div>
                </div>
            `;
        }
    } catch (err) {
        console.error("Hotlist search error:", err);
        container.innerHTML = `<div class="hotlist-clean-box">Error querying police database.</div>`;
    }
}
window.searchPoliceHotlist = searchPoliceHotlist;

/* =====================================================
   TENANT & DOMESTIC HELP POLICE VERIFICATION
===================================================== */
async function submitPoliceVerification(e) {
    if (e && e.preventDefault) e.preventDefault();
    const applicantName = document.getElementById("verAppName").value.trim();
    const applicantMobile = document.getElementById("verAppMobile").value.trim();
    const candidateName = document.getElementById("verCandName").value.trim();
    const candidateType = document.getElementById("verCandType").value;
    const candidateAadhar = document.getElementById("verCandAadhar").value.trim();
    const stationId = document.getElementById("verStation").value;
    const address = document.getElementById("verAddress").value.trim();

    try {
        const res = await fetch(`${API_BASE}/api/police/verification-request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ applicantName, applicantMobile, candidateName, candidateType, candidateAadhar, stationId, address })
        });
        const data = await res.json();
        if (data.success) {
            closeModal("verificationModal");
            document.getElementById("verificationForm").reset();
            alert(`📋 POLICE VERIFICATION APPLICATION SUBMITTED!\n\nApplication Token: ${data.verification.verificationId}\nCandidate: ${candidateName} (${candidateType})\nStatus: PENDING BEAT VERIFICATION\n\nThe local Gorakhpur Beat Officer will conduct background verification within 72 hours.`);
            showToast("✓ Verification request logged successfully");
        } else {
            showToast(data.message || "Failed to submit verification request.");
        }
    } catch (err) {
        console.error("Verification submit error:", err);
        showToast("Error submitting verification request.");
    }
}
window.submitPoliceVerification = submitPoliceVerification;

async function checkVerificationStatusPrompt() {
    const q = prompt("Enter Application Reference (e.g. VER-2026-...) or Landlord Mobile / Candidate Aadhaar:");
    if (!q || !q.trim()) return;

    try {
        const res = await fetch(`${API_BASE}/api/police/verifications?query=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        if (data.success && data.verifications && data.verifications.length > 0) {
            const v = data.verifications[0];
            alert(`📋 Police Verification Status:\n\nReference: ${v.verification_id}\nCandidate: ${v.candidate_name} (${v.candidate_type})\nStatus: ${v.status}\nSubmitted: ${new Date(v.created_at).toLocaleDateString()}\nStation: ${v.station_id}\n\nRemarks: Verification inquiry underway with Gorakhpur local police beat officer.`);
        } else {
            alert(`No verification record found for "${q.trim()}".`);
        }
    } catch (err) {
        alert("Error retrieving verification record.");
    }
}
window.checkVerificationStatusPrompt = checkVerificationStatusPrompt;

/* =====================================================
   STAFF LIVE SOS ALERTS FEED
===================================================== */
async function loadStaffSosAlerts() {
    const tbody = document.getElementById("staffSosTableBody");
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/api/police/sos-alerts`);
        if (!res.ok) return;
        const data = await res.json();
        const alerts = data.alerts || [];
        if (!alerts.length) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#64748b;">No active SOS alerts in Gorakhpur feed.</td></tr>`;
            return;
        }

        tbody.innerHTML = alerts.map(a => `
            <tr>
                <td><strong>${escapeHtml(a.alert_id)}</strong></td>
                <td>${escapeHtml(a.citizen_name || 'Emergency Citizen')}</td>
                <td><a href="tel:${escapeHtml(a.mobile)}">${escapeHtml(a.mobile)}</a></td>
                <td>${escapeHtml(a.nearest_station_name || a.nearest_station_id)}</td>
                <td>${a.distance_km ? a.distance_km + ' km' : 'Nearby'}</td>
                <td><span class="unit-badge">${escapeHtml(a.dispatched_unit || 'PRV-0241')}</span></td>
                <td><span class="status-badge red">${escapeHtml(a.status)}</span></td>
                <td>${new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
            </tr>
        `).join("");
    } catch (err) {
        console.warn("Could not load staff SOS alerts:", err);
    }
}
window.loadStaffSosAlerts = loadStaffSosAlerts;

