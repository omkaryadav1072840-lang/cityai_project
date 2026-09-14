/* =====================================================
   SMARTCITY AI
   WATER MANAGEMENT
===================================================== */


/* =====================================================
   GLOBAL DATA
===================================================== */

let currentRole =
    localStorage.getItem("waterRole") || "user";


let tanks =
    JSON.parse(
        localStorage.getItem("waterTanks")
    ) || [

        {
            id: 1,
            name: "Tank #101",
            location: "Gorakhpur University",
            lat: 26.7606,
            lng: 83.3732,
            capacity: 50000,
            level: 78,
            pump: "on"
        },

        {
            id: 2,
            name: "Tank #102",
            location: "Golghar",
            lat: 26.7559,
            lng: 83.3705,
            capacity: 40000,
            level: 54,
            pump: "on"
        },

        {
            id: 3,
            name: "Tank #103",
            location: "Railway Colony",
            lat: 26.7615,
            lng: 83.3662,
            capacity: 60000,
            level: 31,
            pump: "maintenance"
        }

    ];


let reports =
    JSON.parse(
        localStorage.getItem("waterReports")
    ) || [

        {
            id: 1001,
            type: "leakage",
            location: "Golghar",
            description: "Main road pipe leakage",
            status: "Repairing",
            user: "Omkar"
        },

        {
            id: 1002,
            type: "no-water",
            location: "Railway Colony",
            description: "No water supply",
            status: "Assigned",
            user: "Rahul"
        }

    ];


let maintenance =
    JSON.parse(
        localStorage.getItem("waterMaintenance")
    ) || [

        {
            id: 1,
            title: "Main Pipe Repair",
            location: "Golghar",
            status: "Repairing"
        },

        {
            id: 2,
            title: "Tank Pump Maintenance",
            location: "Railway Colony",
            status: "Pending"
        }

    ];


let supplyData =
    JSON.parse(
        localStorage.getItem("waterSupply")
    ) || {

        status: "Available",
        pressure: "Normal",
        nextSupply: "06:00 AM",
        duration: "2 Hours"

    };


let qualityData =
    JSON.parse(
        localStorage.getItem("waterQuality")
    ) || {

        ph: "7.2",
        tds: "310",
        turbidity: "Normal",
        chlorine: "Normal"

    };


/* =====================================================
   MAP VARIABLES
===================================================== */

let waterMap;

let tankMarkers = [];


/* =====================================================
   PAGE LOAD
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeMap();

        updateRoleUI();

        renderTanks();

        renderUserReports();

        renderWorkerComplaints();

        renderMaintenance();

        updateDashboard();

        updateSupplyUI();

        updateQualityUI();

        fetchWaterDataFromAPI();

        initWaterRealtime();

        setInterval(fetchWaterDataFromAPI, 30000);

    }
);

/* =====================================================
   REAL-TIME WATER SOCKET HANDLER
===================================================== */

function initWaterRealtime() {
    if (typeof SmartCityRealtime === "undefined") {
        console.warn("SmartCityRealtime library not loaded");
        return;
    }

    SmartCityRealtime.init();
    SmartCityRealtime.renderLiveIndicator(".navbar");

    SmartCityRealtime.onWaterUpdate((waterData) => {
        if (!waterData) return;

        if (waterData.type === "tank" && waterData.tank) {
            const updatedTank = waterData.tank;
            const idx = tanks.findIndex(t => t.id === updatedTank.id || t.tank_id === updatedTank.tank_id);
            if (idx >= 0) {
                tanks[idx].level = Number(updatedTank.current_level_percent !== undefined ? updatedTank.current_level_percent : tanks[idx].level);
                tanks[idx].status = updatedTank.status || tanks[idx].status;
                tanks[idx].pump = (tanks[idx].status || "").toLowerCase() === "operational" ? "on" : "maintenance";
                localStorage.setItem("waterTanks", JSON.stringify(tanks));
                renderTanks();
                updateDashboard();
                SmartCityRealtime.playAlertSound("chime");
            }
        } else {
            fetchWaterDataFromAPI();
        }
    });
}


/* =====================================================
   FETCH LIVE WATER DATA FROM API
===================================================== */

async function fetchWaterDataFromAPI() {
    // 1. Fetch live tanks
    try {
        const res = await fetch("http://localhost:5000/api/water/tanks");
        if (res.ok) {
            const json = await res.json();
            if (json.tanks && json.tanks.length) {
                const tankGeo = {
                    "TANK-001": { lat: 26.7606, lng: 83.3732 },
                    "TANK-002": { lat: 26.7559, lng: 83.3705 },
                    "TANK-003": { lat: 26.7615, lng: 83.3662 },
                    "TANK-004": { lat: 26.7884, lng: 83.3986 },
                    "TANK-005": { lat: 26.7252, lng: 83.4322 }
                };

                tanks = json.tanks.map((t, idx) => {
                    const geo = tankGeo[t.tank_id] || { lat: 26.7606 + idx * 0.005, lng: 83.3732 + idx * 0.005 };
                    return {
                        id: t.id,
                        tank_id: t.tank_id,
                        name: t.name,
                        location: t.zone || "Gorakhpur",
                        lat: geo.lat,
                        lng: geo.lng,
                        capacity: Number(t.capacity_liters || 50000),
                        level: Number(t.current_level_percent || 50),
                        pump: (t.status || "Operational").toLowerCase() === "operational" ? "on" : "maintenance",
                        status: t.status || "Operational",
                        nextSupply: t.next_supply_time || "06:00 AM"
                    };
                });
                localStorage.setItem("waterTanks", JSON.stringify(tanks));
                renderTanks();
                updateDashboard();
            }
        }
    } catch (err) {
        console.warn("Could not fetch water tanks from API:", err);
    }

    // 2. Fetch live reports
    try {
        const res = await fetch("http://localhost:5000/api/water/reports");
        if (res.ok) {
            const json = await res.json();
            if (json.reports && json.reports.length) {
                reports = json.reports.map(r => ({
                    id: r.id,
                    report_id: r.report_id,
                    type: (r.issue_type || "other").toLowerCase().replace(/\s+/g, "-"),
                    location: r.location,
                    description: r.description || "",
                    status: r.status || "Pending",
                    user: r.citizen_name || "Citizen",
                    date: new Date(r.created_at).toLocaleString()
                }));
                localStorage.setItem("waterReports", JSON.stringify(reports));
                renderUserReports();
                renderWorkerComplaints();
                updateDashboard();
            }
        }
    } catch (err) {
        console.warn("Could not fetch water reports from API:", err);
    }
}



/* =====================================================
   ROLE SYSTEM
===================================================== */

function switchRole(role) {

    currentRole = role;

    localStorage.setItem(
        "waterRole",
        role
    );

    updateRoleUI();

    showToast(
        role === "worker"
            ? "👷 Worker mode activated"
            : "👤 User mode activated"
    );

}


function updateRoleUI() {

    const badge =
        document.getElementById("roleBadge");

    const name =
        document.getElementById("profileName");

    const roleText =
        document.getElementById("profileRole");

    const workerPanel =
        document.getElementById("workerPanel");


    if (currentRole === "worker") {

        badge.textContent = "WORKER";

        badge.style.background = "#fef3c7";

        badge.style.color = "#92400e";

        name.textContent = "Water Worker";

        roleText.textContent =
            "Maintenance Department";

        workerPanel.style.display =
            "block";

    } else {

        badge.textContent = "USER";

        badge.style.background = "#e0f2fe";

        badge.style.color = "#0369a1";

        name.textContent = "Omkar";

        roleText.textContent = "User";

        workerPanel.style.display =
            "none";

    }

    renderTanks();

}


/* =====================================================
   PROFILE
===================================================== */

function toggleProfile() {

    const menu =
        document.getElementById(
            "profileMenu"
        );

    menu.style.display =
        menu.style.display === "block"
            ? "none"
            : "block";

}


/* =====================================================
   MAP INITIALIZATION
===================================================== */

function initializeMap() {

    waterMap =
        L.map("waterMap")
            .setView(
                [26.7606, 83.3732],
                13
            );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(waterMap);


    renderMapMarkers();

}


/* =====================================================
   MAP MARKERS
===================================================== */

function renderMapMarkers(
    focusTankId = null
) {

    tankMarkers.forEach(
        marker => waterMap.removeLayer(marker)
    );

    tankMarkers = [];


    tanks.forEach(
        tank => {

            const lat =
                Number(tank.lat);

            const lng =
                Number(tank.lng);


            if (
                Number.isNaN(lat) ||
                Number.isNaN(lng)
            ) {

                return;

            }


            let markerColor =
                "#0284c7";


            if (tank.level <= 20) {

                markerColor =
                    "#dc2626";

            } else if (tank.level <= 40) {

                markerColor =
                    "#ea580c";

            } else {

                markerColor =
                    "#0284c7";

            }


            const icon =
                L.divIcon({

                    className:
                        "custom-water-marker",

                    html: `
                        <div style="
                            width:34px;
                            height:34px;
                            border-radius:50%;
                            background:${markerColor};
                            border:4px solid white;
                            box-shadow:0 3px 10px rgba(0,0,0,.3);
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            color:white;
                            font-size:16px;
                        ">
                            💧
                        </div>
                    `,

                    iconSize: [34, 34],

                    iconAnchor: [17, 17]

                });


            const marker =
                L.marker(
                    [lat, lng],
                    {
                        icon: icon
                    }
                )
                .addTo(waterMap);


            marker.bindPopup(`
                
                <div style="min-width:220px">

                    <h3>
                        💧 ${escapeHTML(tank.name)}
                    </h3>

                    <p style="margin:6px 0">
                        📍 ${escapeHTML(tank.location)}
                    </p>

                    <p>
                        Level:
                        <strong>
                            ${tank.level}%
                        </strong>
                    </p>

                    <p>
                        Capacity:
                        ${Number(tank.capacity).toLocaleString()} L
                    </p>

                    <p>
                        Pump:
                        <strong>
                            ${tank.pump.toUpperCase()}
                        </strong>
                    </p>

                    ${
                        currentRole === "worker"
                        ? `
                            <div style="
                                display:flex;
                                gap:5px;
                                margin-top:12px;
                            ">

                                <button
                                    onclick="editTank(${tank.id})"
                                    style="
                                        border:0;
                                        padding:7px 9px;
                                        border-radius:6px;
                                        background:#0284c7;
                                        color:white;
                                        cursor:pointer;
                                    "
                                >
                                    Edit
                                </button>

                                <button
                                    onclick="deleteTank(${tank.id})"
                                    style="
                                        border:0;
                                        padding:7px 9px;
                                        border-radius:6px;
                                        background:#fee2e2;
                                        color:#b91c1c;
                                        cursor:pointer;
                                    "
                                >
                                    Delete
                                </button>

                            </div>
                        `
                        : ""
                    }

                </div>

            `);


            tankMarkers.push(marker);


            if (
                focusTankId &&
                Number(tank.id) ===
                Number(focusTankId)
            ) {

                setTimeout(
                    () => {

                        waterMap.flyTo(
                            [lat, lng],
                            16
                        );

                        marker.openPopup();

                    },
                    300
                );

            }

        }
    );

}


/* =====================================================
   TANK RENDER
===================================================== */

function renderTanks() {

    const container =
        document.getElementById(
            "tankContainer"
        );


    if (!container) return;


    container.innerHTML = "";


    tanks.forEach(
        tank => {

            let levelColor =
                "#16a34a";


            if (tank.level <= 20) {

                levelColor =
                    "#dc2626";

            } else if (tank.level <= 40) {

                levelColor =
                    "#ea580c";

            }


            container.innerHTML += `

                <div class="tank-card">

                    <div class="tank-top">

                        <h3>
                            💧 ${escapeHTML(tank.name)}
                        </h3>

                        <span>
                            ${tank.level}%
                        </span>

                    </div>


                    <p class="tank-location">
                        📍 ${escapeHTML(tank.location)}
                    </p>


                    <div class="tank-level">

                        <div
                            class="tank-level-fill"
                            style="
                                width:${tank.level}%;
                                background:${levelColor};
                            "
                        ></div>

                    </div>


                    <div class="tank-info">

                        <span>
                            ${Number(
                                tank.capacity *
                                tank.level / 100
                            ).toLocaleString()} L
                        </span>

                        <span>
                            Pump:
                            ${tank.pump}
                        </span>

                    </div>


                    ${
                        currentRole === "worker"
                        ? `

                            <div class="tank-actions">

                                <button
                                    onclick="editTank(${tank.id})"
                                >
                                    ✏️ Edit
                                </button>

                                <button
                                    onclick="deleteTank(${tank.id})"
                                    style="
                                        background:#fee2e2;
                                        color:#b91c1c;
                                    "
                                >
                                    🗑️ Delete
                                </button>

                            </div>

                        `
                        : ""

                    }

                </div>

            `;

        }
    );


    renderMapMarkers();

}


/* =====================================================
   ADD / EDIT TANK MODAL
===================================================== */

function openTankModal() {

    if (currentRole !== "worker") {

        showToast(
            "❌ Worker access required"
        );

        return;

    }


    document.getElementById(
        "tankForm"
    ).reset();


    document.getElementById(
        "tankId"
    ).value = "";


    document.getElementById(
        "tankModal"
    ).style.display = "flex";

}


function editTank(id) {

    if (currentRole !== "worker") {

        showToast(
            "❌ Worker access required"
        );

        return;

    }


    const tank =
        tanks.find(
            t => Number(t.id) === Number(id)
        );


    if (!tank) return;


    document.getElementById(
        "tankId"
    ).value = tank.id;


    document.getElementById(
        "tankName"
    ).value = tank.name;


    document.getElementById(
        "tankLocation"
    ).value = tank.location;


    document.getElementById(
        "tankLat"
    ).value = tank.lat;


    document.getElementById(
        "tankLng"
    ).value = tank.lng;


    document.getElementById(
        "tankCapacity"
    ).value = tank.capacity;


    document.getElementById(
        "tankLevel"
    ).value = tank.level;


    document.getElementById(
        "pumpStatus"
    ).value = tank.pump;


    document.getElementById(
        "tankModal"
    ).style.display = "flex";

}


/* =====================================================
   SAVE TANK
===================================================== */

document.getElementById(
    "tankForm"
).addEventListener(
    "submit",
    function (e) {

        e.preventDefault();


        if (currentRole !== "worker") {

            return;

        }


        const id =
            document.getElementById(
                "tankId"
            ).value;


        const name =
            document.getElementById(
                "tankName"
            ).value.trim();


        const location =
            document.getElementById(
                "tankLocation"
            ).value.trim();


        const lat =
            Number(
                document.getElementById(
                    "tankLat"
                ).value
            );


        const lng =
            Number(
                document.getElementById(
                    "tankLng"
                ).value
            );


        const capacity =
            Number(
                document.getElementById(
                    "tankCapacity"
                ).value
            );


        const level =
            Number(
                document.getElementById(
                    "tankLevel"
                ).value
            );


        const pump =
            document.getElementById(
                "pumpStatus"
            ).value;


        if (!name || !location) {

            alert(
                "Please enter tank name and location."
            );

            return;

        }


        if (
            Number.isNaN(lat) ||
            Number.isNaN(lng)
        ) {

            alert(
                "Enter valid latitude and longitude."
            );

            return;

        }


        if (
            lat < -90 ||
            lat > 90 ||
            lng < -180 ||
            lng > 180
        ) {

            alert(
                "Invalid coordinates."
            );

            return;

        }


        if (
            level < 0 ||
            level > 100
        ) {

            alert(
                "Tank level must be between 0 and 100."
            );

            return;

        }


        let savedId;


        if (id) {

            const tank =
                tanks.find(
                    t =>
                        Number(t.id) ===
                        Number(id)
                );


            if (tank) {

                tank.name = name;

                tank.location =
                    location;

                tank.lat = lat;

                tank.lng = lng;

                tank.capacity =
                    capacity;

                tank.level =
                    level;

                tank.pump =
                    pump;

                savedId =
                    tank.id;

            }


            showToast(
                "✅ Tank updated"
            );

        } else {

            const newTank = {

                id: Date.now(),

                name: name,

                location: location,

                lat: lat,

                lng: lng,

                capacity: capacity,

                level: level,

                pump: pump

            };


            tanks.push(newTank);

            savedId =
                newTank.id;


            showToast(
                "✅ New tank added"
            );

        }


        saveAllData();


        closeModal(
            "tankModal"
        );


        renderTanks();

        updateDashboard();


        setTimeout(
            () => {

                renderMapMarkers(
                    savedId
                );

            },
            200
        );

    }
);


/* =====================================================
   DELETE TANK
===================================================== */

function deleteTank(id) {

    if (currentRole !== "worker") {

        showToast(
            "❌ Worker access required"
        );

        return;

    }


    const tank =
        tanks.find(
            t => Number(t.id) === Number(id)
        );


    if (!tank) return;


    const confirmDelete =
        confirm(
            `Delete ${tank.name}?`
        );


    if (!confirmDelete) return;


    tanks =
        tanks.filter(
            t =>
                Number(t.id) !==
                Number(id)
        );


    saveAllData();

    renderTanks();

    updateDashboard();


    showToast(
        "🗑️ Tank deleted"
    );

}


/* =====================================================
   REPORT MODAL
===================================================== */

function openReportModal(type) {

    document.getElementById(
        "reportType"
    ).value = type;


    document.getElementById(
        "problemType"
    ).value = type;


    document.getElementById(
        "reportModal"
    ).style.display = "flex";

}


document.getElementById(
    "reportForm"
).addEventListener(
    "submit",
    async function (e) {

        e.preventDefault();

        const type =
            document.getElementById(
                "problemType"
            ).value;

        const location =
            document.getElementById(
                "reportLocation"
            ).value.trim();

        const description =
            document.getElementById(
                "reportDescription"
            ).value.trim();

        if (!location || !description) {
            alert(
                "Please complete all required fields."
            );
            return;
        }

        const userObj = window.SmartCityAuth ? window.SmartCityAuth.getUser() : null;
        const citizenName = (userObj && (userObj.name || userObj.username)) || "Citizen";
        const mobile = (userObj && (userObj.phone || userObj.mobile)) || "9876543210";

        const issueMap = {
            "leakage": "Pipe Leak",
            "no-water": "No Supply",
            "low-pressure": "Low Pressure",
            "dirty": "Contamination",
            "billing": "Billing Issue"
        };
        const issueType = issueMap[type] || "Other";

        const newReport = {
            id: Date.now(),
            type: type,
            location: location,
            description: description,
            status: "Pending",
            user: citizenName,
            date: new Date().toLocaleString()
        };

        reports.unshift(newReport);
        saveAllData();
        renderUserReports();
        renderWorkerComplaints();
        updateDashboard();

        closeModal("reportModal");
        this.reset();
        showToast("✅ Report submitted successfully");

        // Send to live backend API
        try {
            const token = window.SmartCityAuth ? window.SmartCityAuth.getToken() : null;
            const headers = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            await fetch("http://localhost:5000/api/water/reports", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    userId: userObj ? (userObj.id || userObj.userId) : null,
                    citizenName,
                    mobile,
                    issueType,
                    location,
                    description
                })
            });
            fetchWaterDataFromAPI();
        } catch (apiErr) {
            console.warn("Water report API error:", apiErr);
        }
    }
);


/* =====================================================
   USER REPORTS
===================================================== */

function renderUserReports() {

    const container =
        document.getElementById(
            "userReports"
        );

    if (!container) return;

    const userObj = window.SmartCityAuth ? window.SmartCityAuth.getUser() : null;
    const currentName = (userObj && (userObj.name || userObj.username)) || "";

    let userReports = currentName ? reports.filter(r => r.user === currentName) : [];
    if (userReports.length === 0 && reports.length > 0) {
        userReports = reports.slice(0, 10);
    }

    if (userReports.length === 0) {

        container.innerHTML = `
            <div class="report-item">
                <p>No reports submitted.</p>
            </div>
        `;

        return;

    }



    container.innerHTML = "";


    userReports.forEach(
        report => {

            container.innerHTML += `

                <div class="report-item">

                    <div>

                        <h3>
                            ${getReportIcon(report.type)}
                            ${formatReportType(report.type)}
                        </h3>

                        <p>
                            📍 ${escapeHTML(report.location)}
                        </p>

                        <p>
                            ${escapeHTML(report.description)}
                        </p>

                    </div>

                    <span class="report-status"
                        style="
                            background:${getStatusBackground(report.status)};
                            color:${getStatusColor(report.status)};
                        "
                    >
                        ${report.status}
                    </span>

                </div>

            `;

        }
    );

}


/* =====================================================
   WORKER COMPLAINTS
===================================================== */

function renderWorkerComplaints() {

    const container =
        document.getElementById(
            "workerComplaints"
        );


    if (!container) return;


    container.innerHTML = `

        <div class="worker-row header">

            <span>Problem</span>
            <span>Location</span>
            <span>User</span>
            <span>Status</span>
            <span>Action</span>

        </div>

    `;


    reports.forEach(
        report => {

            container.innerHTML += `

                <div class="worker-row">

                    <span>
                        ${getReportIcon(report.type)}
                        ${formatReportType(report.type)}
                    </span>

                    <span>
                        ${escapeHTML(report.location)}
                    </span>

                    <span>
                        ${escapeHTML(report.user)}
                    </span>

                    <span>
                        ${report.status}
                    </span>

                    <div class="worker-buttons">

                        <button
                            onclick="assignComplaint(${report.id})"
                        >
                            👷 Assign
                        </button>

                        <button
                            onclick="startRepair(${report.id})"
                        >
                            🔧 Repair
                        </button>

                        <button
                            onclick="resolveComplaint(${report.id})"
                        >
                            ✅ Resolve
                        </button>

                    </div>

                </div>

            `;

        }
    );

}


/* =====================================================
   COMPLAINT ACTIONS
===================================================== */

function findReport(id) {

    return reports.find(
        r =>
            Number(r.id) ===
            Number(id)
    );

}


function assignComplaint(id) {

    if (currentRole !== "worker") return;


    const report =
        findReport(id);


    if (!report) return;


    report.status =
        "Assigned";


    saveAllData();

    renderUserReports();

    renderWorkerComplaints();


    showToast(
        "👷 Complaint assigned"
    );

}


function startRepair(id) {

    if (currentRole !== "worker") return;


    const report =
        findReport(id);


    if (!report) return;


    report.status =
        "Repairing";


    saveAllData();

    renderUserReports();

    renderWorkerComplaints();


    showToast(
        "🔧 Repair started"
    );

}


function resolveComplaint(id) {

    if (currentRole !== "worker") return;


    const report =
        findReport(id);


    if (!report) return;


    report.status =
        "Resolved";


    saveAllData();

    renderUserReports();

    renderWorkerComplaints();

    updateDashboard();


    showToast(
        "✅ Complaint resolved"
    );

}


/* =====================================================
   MAINTENANCE
===================================================== */

function renderMaintenance() {

    const container =
        document.getElementById(
            "maintenanceList"
        );


    if (!container) return;


    container.innerHTML = "";


    maintenance.forEach(
        item => {

            container.innerHTML += `

                <div class="maintenance-card">

                    <div>

                        <h3>
                            🔧 ${escapeHTML(item.title)}
                        </h3>

                        <p>
                            📍 ${escapeHTML(item.location)}
                        </p>

                    </div>

                    <div>

                        <span class="report-status"
                            style="
                                background:#fef3c7;
                                color:#92400e;
                            "
                        >
                            ${item.status}
                        </span>

                        <button
                            onclick="completeMaintenance(${item.id})"
                            style="
                                margin-left:8px;
                                border:0;
                                padding:8px;
                                border-radius:7px;
                                cursor:pointer;
                            "
                        >
                            Complete
                        </button>

                    </div>

                </div>

            `;

        }
    );

}


function completeMaintenance(id) {

    if (currentRole !== "worker") return;


    const item =
        maintenance.find(
            m =>
                Number(m.id) ===
                Number(id)
        );


    if (!item) return;


    item.status =
        "Completed";


    saveAllData();

    renderMaintenance();


    showToast(
        "✅ Maintenance completed"
    );

}


/* =====================================================
   SUPPLY
===================================================== */

function updateSupply() {

    if (currentRole !== "worker") {

        showToast(
            "❌ Worker access required"
        );

        return;

    }


    const status =
        prompt(
            "Supply status:",
            supplyData.status
        );


    if (!status) return;


    const pressure =
        prompt(
            "Pressure:",
            supplyData.pressure
        );


    if (!pressure) return;


    const nextSupply =
        prompt(
            "Next supply:",
            supplyData.nextSupply
        );


    if (!nextSupply) return;


    supplyData.status =
        status;

    supplyData.pressure =
        pressure;

    supplyData.nextSupply =
        nextSupply;


    saveAllData();

    updateSupplyUI();


    showToast(
        "🚰 Supply updated"
    );

}


function updateSupplyUI() {

    const title =
        document.querySelector(
            ".supply-status h2"
        );


    if (!title) return;


    title.textContent =
        supplyData.status;


    const info =
        document.querySelectorAll(
            ".info-list strong"
        );


    if (info.length >= 3) {

        info[0].textContent =
            supplyData.pressure;

        info[1].textContent =
            supplyData.nextSupply;

        info[2].textContent =
            supplyData.duration;

    }

}


/* =====================================================
   WATER QUALITY
===================================================== */

function updateWaterQuality() {

    if (currentRole !== "worker") {

        showToast(
            "❌ Worker access required"
        );

        return;

    }


    const ph =
        prompt(
            "pH:",
            qualityData.ph
        );


    if (!ph) return;


    const tds =
        prompt(
            "TDS:",
            qualityData.tds
        );


    if (!tds) return;


    const turbidity =
        prompt(
            "Turbidity:",
            qualityData.turbidity
        );


    if (!turbidity) return;


    const chlorine =
        prompt(
            "Chlorine:",
            qualityData.chlorine
        );


    if (!chlorine) return;


    qualityData.ph =
        ph;

    qualityData.tds =
        tds;

    qualityData.turbidity =
        turbidity;

    qualityData.chlorine =
        chlorine;


    saveAllData();

    updateQualityUI();


    showToast(
        "🧪 Water quality updated"
    );

}


function updateQualityUI() {

    const boxes =
        document.querySelectorAll(
            ".quality-box strong"
        );


    if (boxes.length >= 4) {

        boxes[0].textContent =
            qualityData.ph;

        boxes[1].textContent =
            qualityData.tds;

        boxes[2].textContent =
            qualityData.turbidity;

        boxes[3].textContent =
            qualityData.chlorine;

    }

}


/* =====================================================
   TANKER
===================================================== */

function openTankerModal() {

    document.getElementById(
        "tankerModal"
    ).style.display = "flex";

}


document.getElementById(
    "tankerForm"
).addEventListener(
    "submit",
    async function (e) {

        e.preventDefault();

        const location =
            document.getElementById(
                "tankerLocation"
            ).value;

        const quantity =
            document.getElementById(
                "waterQuantity"
            ).value;

        const priority =
            document.getElementById(
                "tankerPriority"
            ).value;

        closeModal(
            "tankerModal"
        );

        this.reset();

        showToast(
            `🚛 Tanker requested: ${quantity} L (${priority})`
        );

        // Send to backend API
        try {
            const userObj = window.SmartCityAuth ? window.SmartCityAuth.getUser() : null;
            const citizenName = (userObj && (userObj.name || userObj.username)) || "Citizen";
            const mobile = (userObj && (userObj.phone || userObj.mobile)) || "9876543210";

            await fetch("http://localhost:5000/api/water/tanker-bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: userObj ? (userObj.id || userObj.userId) : null,
                    citizenName,
                    mobile,
                    deliveryAddress: location,
                    capacity: `${quantity} Litres`,
                    bookingDate: new Date().toISOString().split("T")[0]
                })
            });
        } catch (tErr) {
            console.warn("Could not save tanker booking to API:", tErr);
        }

    }
);



/* =====================================================
   DASHBOARD
===================================================== */

function updateDashboard() {

    const tankCount =
        document.getElementById(
            "tankCount"
        );


    if (tankCount) {

        tankCount.textContent =
            tanks.length;

    }


    const issueCount =
        document.getElementById(
            "issueCount"
        );


    const openIssues =
        reports.filter(
            r =>
                r.status !==
                "Resolved"
        ).length;


    if (issueCount) {

        issueCount.textContent =
            String(
                openIssues
            ).padStart(2, "0");

    }


    const pending =
        document.getElementById(
            "pendingIssues"
        );


    if (pending) {

        pending.textContent =
            String(
                openIssues
            ).padStart(2, "0");

    }

}


/* =====================================================
   MODAL
===================================================== */

function closeModal(id) {

    const modal =
        document.getElementById(id);


    if (modal) {

        modal.style.display =
            "none";

    }

}


/* =====================================================
   EDIT SELECTED TANK
===================================================== */

function editSelectedTank() {

    if (tanks.length === 0) {

        showToast(
            "No tanks available"
        );

        return;

    }


    editTank(
        tanks[0].id
    );

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
        () => {

            toast.classList.remove(
                "show"
            );

        },
        2500
    );

}


/* =====================================================
   SAVE DATA
===================================================== */

function saveAllData() {

    localStorage.setItem(
        "waterTanks",
        JSON.stringify(tanks)
    );


    localStorage.setItem(
        "waterReports",
        JSON.stringify(reports)
    );


    localStorage.setItem(
        "waterMaintenance",
        JSON.stringify(maintenance)
    );


    localStorage.setItem(
        "waterSupply",
        JSON.stringify(supplyData)
    );


    localStorage.setItem(
        "waterQuality",
        JSON.stringify(qualityData)
    );

}


/* =====================================================
   REPORT HELPERS
===================================================== */

function getReportIcon(type) {

    const icons = {

        leakage: "💦",

        "no-water": "🚱",

        "dirty-water": "🧪",

        "low-pressure": "⚠️"

    };


    return icons[type] || "💧";

}


function formatReportType(type) {

    const names = {

        leakage:
            "Water Leakage",

        "no-water":
            "No Water Supply",

        "dirty-water":
            "Dirty Water",

        "low-pressure":
            "Low Pressure"

    };


    return names[type] || type;

}


function getStatusColor(status) {

    if (status === "Resolved") {

        return "#15803d";

    }

    if (status === "Repairing") {

        return "#ea580c";

    }

    if (status === "Assigned") {

        return "#0369a1";

    }

    return "#92400e";

}


function getStatusBackground(status) {

    if (status === "Resolved") {

        return "#dcfce7";

    }

    if (status === "Repairing") {

        return "#ffedd5";

    }

    if (status === "Assigned") {

        return "#e0f2fe";

    }

    return "#fef3c7";

}


/* =====================================================
   SECURITY / HTML ESCAPE
===================================================== */

function escapeHTML(value) {

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