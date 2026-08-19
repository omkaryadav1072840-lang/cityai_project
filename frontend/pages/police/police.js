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

*/

const CRIME_API_URL = "";


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
   POLICE STAFF CHECK
===================================================== */

function isPoliceStaff() {

    const user =
        getCurrentUser();

    if (!user) {

        return false;

    }


    const type =
        String(
            user.type || ""
        )
        .toLowerCase()
        .trim();


    const department =
        String(
            user.department || ""
        )
        .toLowerCase()
        .trim();


    return (

        type === "staff"

        &&

        department === "police"

    );

}


/* =====================================================
   PAGE START
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        updateUser();

        checkPolicePermission();

        initializeIncidents();

        refreshCrimeData();

    }
);


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


        /*
          Expected backend structure:

          {
            source: "...",
            verified: true,

            monthly: [
              {
                month: "Mar 2026",
                cases: 120
              }
            ],

            areas: [
              {
                area: "Area name",
                cases: 30
              }
            ],

            categories: [
              {
                category: "Theft",
                cases: 40
              }
            ]
          }
        */


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


        status.textContent =
            data.verified
                ? "● VERIFIED DATA"
                : "● UNVERIFIED";


        status.style.color =
            data.verified
                ? "#16a34a"
                : "#d97706";


        source.textContent =
            data.source ||
            "Connected crime-data source";


        renderCrimeCharts(data);

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
