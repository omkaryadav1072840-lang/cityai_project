/* =====================================================
   SMARTCITY AI
   WASTE MANAGEMENT V2
   Fully Interactive Frontend
===================================================== */


/* =====================================================
   DEFAULT DATA
===================================================== */

const defaultBins = [

    {
        id: 1,
        name: "Bin - Golghar",
        location: "Golghar",
        lat: 26.7606,
        lng: 83.3732,
        fill: 15
    },

    {
        id: 2,
        name: "Bin - City Market",
        location: "City Market",
        lat: 26.7655,
        lng: 83.3680,
        fill: 55
    },

    {
        id: 3,
        name: "Bin - Railway Colony",
        location: "Railway Colony",
        lat: 26.7545,
        lng: 83.3810,
        fill: 92
    },

    {
        id: 4,
        name: "Bin - University Road",
        location: "University Road",
        lat: 26.7720,
        lng: 83.3805,
        fill: 65
    },

    {
        id: 5,
        name: "Bin - Medical College",
        location: "Medical College",
        lat: 26.7480,
        lng: 83.3650,
        fill: 100
    }

];


const defaultReports = [

    {
        id: 1,
        type: "Garbage Dump",
        location: "Golghar",
        description: "Large garbage pile near road",
        status: "Completed"
    },

    {
        id: 2,
        type: "Overflowing Bin",
        location: "Railway Colony",
        description: "Bin is overflowing",
        status: "Cleaning"
    }

];


const defaultPickups = [

    {
        id: 1,
        type: "General Waste",
        date: "Tomorrow",
        time: "8:00 AM - 10:00 AM",
        location: "Golghar",
        status: "Scheduled"
    }

];


/* =====================================================
   LOAD DATA FROM LOCAL STORAGE
===================================================== */

let bins =
    JSON.parse(localStorage.getItem("smartBins"))
    || defaultBins;

let reports =
    JSON.parse(localStorage.getItem("smartReports"))
    || defaultReports;

let pickups =
    JSON.parse(localStorage.getItem("smartPickups"))
    || defaultPickups;

let score =
    Number(localStorage.getItem("cleanScore"))
    || 780;


/* =====================================================
   SAVE DATA
===================================================== */

function saveData() {

    localStorage.setItem(
        "smartBins",
        JSON.stringify(bins)
    );

    localStorage.setItem(
        "smartReports",
        JSON.stringify(reports)
    );

    localStorage.setItem(
        "smartPickups",
        JSON.stringify(pickups)
    );

    localStorage.setItem(
        "cleanScore",
        score
    );

}


/* =====================================================
   MAP
===================================================== */

const map =
    L.map("wasteMap")
    .setView(
        [26.7606, 83.3732],
        13
    );


L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: "© OpenStreetMap"
    }
).addTo(map);


let binMarkers = [];


/* =====================================================
   BIN STATUS
===================================================== */

function getStatus(fill) {

    fill = Number(fill);

    if (fill >= 80) {

        return "Full";

    }

    if (fill >= 40) {

        return "Half Full";

    }

    return "Empty";

}


function getStatusClass(status) {

    if (status === "Full") {

        return "status-full";

    }

    if (status === "Half Full") {

        return "status-half";

    }

    return "status-empty";

}


function getStatusColor(status) {

    if (status === "Full") {

        return "#ef4444";

    }

    if (status === "Half Full") {

        return "#eab308";

    }

    return "#22c55e";

}


/* =====================================================
   MAP BIN ICON
===================================================== */

function createBinIcon(color) {

    return L.divIcon({

        className: "",

        html: `
            <div style="
                width:30px;
                height:30px;
                background:${color};
                border:4px solid white;
                border-radius:50%;
                box-shadow:0 2px 10px #0005;
            "></div>
        `,

        iconSize: [30, 30],

        iconAnchor: [15, 15]

    });

}


/* =====================================================
   RENDER MAP
===================================================== */

function renderMap(focusBinId = null) {

    // Remove old markers
    binMarkers.forEach(marker => {
        map.removeLayer(marker);
    });

    binMarkers = [];

    let focusBin = null;

    bins.forEach(bin => {

        const status = getStatus(bin.fill);
        const color = getStatusColor(status);

        // Validate coordinates
        const lat = Number(bin.lat);
        const lng = Number(bin.lng);

        if (
            Number.isNaN(lat) ||
            Number.isNaN(lng) ||
            lat < -90 ||
            lat > 90 ||
            lng < -180 ||
            lng > 180
        ) {
            console.warn(
                "Invalid coordinates for bin:",
                bin
            );

            return;
        }

        const marker = L.marker(
            [lat, lng],
            {
                icon: createBinIcon(color)
            }
        ).addTo(map);

        marker.bindPopup(`
            <div style="min-width:220px">

                <h3>🗑️ ${escapeHTML(bin.name)}</h3>

                <p style="margin-top:6px">
                    📍 ${escapeHTML(bin.location)}
                </p>

                <p>
                    Fill:
                    <strong>${bin.fill}%</strong>
                </p>

                <p>
                    Status:
                    <strong style="color:${color}">
                        ${status}
                    </strong>
                </p>

                <div style="margin-top:12px">

                    <button
                        onclick="editBin(${bin.id})"
                        style="
                            padding:8px 12px;
                            border:0;
                            border-radius:7px;
                            background:#15803d;
                            color:white;
                            cursor:pointer;
                            margin-right:5px;
                        ">
                        ✏️ Edit
                    </button>

                    <button
                        onclick="deleteBin(${bin.id})"
                        style="
                            padding:8px 12px;
                            border:0;
                            border-radius:7px;
                            background:#fee2e2;
                            color:#b91c1c;
                            cursor:pointer;
                        ">
                        🗑️ Delete
                    </button>

                </div>

            </div>
        `);

        binMarkers.push(marker);

        // Check newly added/edited bin
        if (focusBinId !== null &&
            Number(bin.id) === Number(focusBinId)) {

            focusBin = bin;
        }

    });


    // If a new/edit bin exists, move map to it
    if (focusBin) {

        const lat = Number(focusBin.lat);
        const lng = Number(focusBin.lng);

        setTimeout(() => {

            map.invalidateSize();

            map.flyTo(
                [lat, lng],
                17,
                {
                    animate: true,
                    duration: 1
                }
            );

            // Find marker and open popup
            const markerIndex =
                bins.findIndex(
                    b => Number(b.id) === Number(focusBin.id)
                );

            if (markerIndex !== -1 &&
                binMarkers[markerIndex]) {

                setTimeout(() => {

                    binMarkers[markerIndex].openPopup();

                }, 1000);

            }

        }, 200);

    }

}

/* =====================================================
   DASHBOARD
===================================================== */

function updateDashboard() {

    const empty =
        bins.filter(
            bin => getStatus(bin.fill) === "Empty"
        ).length;


    const half =
        bins.filter(
            bin => getStatus(bin.fill) === "Half Full"
        ).length;


    const full =
        bins.filter(
            bin => getStatus(bin.fill) === "Full"
        ).length;


    document.getElementById("totalBins")
        .textContent = bins.length;


    document.getElementById("emptyBins")
        .textContent = empty;


    document.getElementById("halfBins")
        .textContent = half;


    document.getElementById("fullBins")
        .textContent = full;


    document.getElementById("notificationCount")
        .textContent = full + reports.filter(
            r => r.status !== "Completed"
        ).length;

}


/* =====================================================
   RENDER BIN LIST
===================================================== */

function renderBins() {

    const list =
        document.getElementById("binList");


    const search =
        document.getElementById("binSearch")
        .value
        .toLowerCase();


    const filter =
        document.getElementById("binFilter")
        .value;


    const filtered =
        bins.filter(bin => {

            const status =
                getStatus(bin.fill);


            const matchesSearch =
                bin.name.toLowerCase()
                    .includes(search)
                ||
                bin.location.toLowerCase()
                    .includes(search);


            let matchesFilter = true;


            if (filter === "empty") {

                matchesFilter =
                    status === "Empty";

            }

            if (filter === "half") {

                matchesFilter =
                    status === "Half Full";

            }

            if (filter === "full") {

                matchesFilter =
                    status === "Full";

            }


            return matchesSearch &&
                   matchesFilter;

        });


    list.innerHTML = "";


    if (filtered.length === 0) {

        list.innerHTML = `
            <div class="empty-state">
                No bins found.
            </div>
        `;

        return;

    }


    filtered.forEach(bin => {

        const status =
            getStatus(bin.fill);

        const statusClass =
            getStatusClass(status);

        const color =
            getStatusColor(status);


        const item =
            document.createElement("div");

        item.className = "bin-item";


        item.innerHTML = `

            <div
                class="bin-icon"
                style="
                    background:${color}22;
                ">

                🗑️

            </div>


            <div class="bin-info">

                <h3>
                    ${escapeHTML(bin.name)}
                </h3>

                <p>
                    📍 ${escapeHTML(bin.location)}
                </p>


                <span class="
                    status
                    ${statusClass}">

                    ${status}

                </span>


                <div class="fill-bar">

                    <div
                        class="fill-value"
                        style="
                            width:${bin.fill}%;
                            background:${color};
                        ">
                    </div>

                </div>


                <small>
                    ${bin.fill}% full
                </small>

            </div>


            <div class="bin-actions">

                <button
                    class="action-btn"
                    title="Increase fill"
                    onclick="changeFill(${bin.id}, 10)">

                    ➕

                </button>

                <button
                    class="action-btn"
                    title="Decrease fill"
                    onclick="changeFill(${bin.id}, -10)">

                    ➖

                </button>

                <button
                    class="action-btn"
                    title="Edit"
                    onclick="editBin(${bin.id})">

                    ✏️

                </button>

                <button
                    class="action-btn"
                    title="Delete"
                    onclick="deleteBin(${bin.id})">

                    🗑️

                </button>

            </div>

        `;


        list.appendChild(item);

    });

}


/* =====================================================
   CHANGE BIN FILL
===================================================== */

function changeFill(id, amount) {

    const bin =
        bins.find(
            b => b.id === id
        );


    if (!bin) return;


    bin.fill =
        Math.max(
            0,
            Math.min(
                100,
                Number(bin.fill) + amount
            )
        );


    saveData();

    refresh();


    if (bin.fill >= 80) {

        showToast(
            `🔴 ${bin.name} is now ${bin.fill}% full`
        );

    }

}


/* =====================================================
   OPEN BIN MODAL
===================================================== */

function openBinModal() {

    document.getElementById("binModalTitle")
        .textContent = "Add Smart Bin";


    document.getElementById("binId")
        .value = "";


    document.getElementById("binName")
        .value = "";


    document.getElementById("binLocation")
        .value = "";


    document.getElementById("binLat")
        .value = "26.7606";


    document.getElementById("binLng")
        .value = "83.3732";


    document.getElementById("binFill")
        .value = "0";


    updateModalStatus();


    document
        .getElementById("binModal")
        .classList.add("active");

}


/* =====================================================
   EDIT BIN
===================================================== */

function editBin(id) {

    const bin =
        bins.find(
            b => b.id === id
        );


    if (!bin) return;


    document.getElementById("binModalTitle")
        .textContent = "Edit Smart Bin";


    document.getElementById("binId")
        .value = bin.id;


    document.getElementById("binName")
        .value = bin.name;


    document.getElementById("binLocation")
        .value = bin.location;


    document.getElementById("binLat")
        .value = bin.lat;


    document.getElementById("binLng")
        .value = bin.lng;


    document.getElementById("binFill")
        .value = bin.fill;


    updateModalStatus();


    document
        .getElementById("binModal")
        .classList.add("active");

}


/* =====================================================
   SAVE BIN
===================================================== */

function saveBin() {

    const id =
        document.getElementById("binId").value;


    const name =
        document.getElementById("binName")
        .value.trim();


    const location =
        document.getElementById("binLocation")
        .value.trim();


    const lat =
        Number(
            document.getElementById("binLat").value
        );


    const lng =
        Number(
            document.getElementById("binLng").value
        );


    const fill =
        Number(
            document.getElementById("binFill").value
        );


    // Validation

    if (!name) {

        alert("Please enter bin name.");

        return;

    }


    if (!location) {

        alert("Please enter bin location.");

        return;

    }


    if (
        Number.isNaN(lat) ||
        Number.isNaN(lng)
    ) {

        alert(
            "Please enter valid latitude and longitude."
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
            "Invalid latitude or longitude."
        );

        return;

    }


    if (
        fill < 0 ||
        fill > 100
    ) {

        alert(
            "Fill percentage must be between 0 and 100."
        );

        return;

    }


    let savedBinId;


    // ================= EDIT =================

    if (id) {

        const bin =
            bins.find(
                b => Number(b.id) === Number(id)
            );


        if (!bin) {

            alert("Bin not found.");

            return;

        }


        bin.name = name;
        bin.location = location;
        bin.lat = lat;
        bin.lng = lng;
        bin.fill = fill;


        savedBinId = bin.id;


        showToast(
            "✅ Bin updated successfully"
        );

    }


    // ================= ADD =================

    else {

        const newBin = {

            id: Date.now(),

            name: name,

            location: location,

            lat: lat,

            lng: lng,

            fill: fill

        };


        bins.push(newBin);


        savedBinId = newBin.id;


        showToast(
            "✅ New bin added to map"
        );

    }


    // Save data

    saveData();


    // Close modal

    closeModal("binModal");


    // Refresh everything

    renderBins();

    updateDashboard();

    updateScore();


    // IMPORTANT:
    // Render map and focus newly added bin

    renderMap(savedBinId);

}

/* =====================================================
   DELETE BIN
===================================================== */

function deleteBin(id) {

    const bin =
        bins.find(
            b => b.id === id
        );


    if (!bin) return;


    const confirmDelete =
        confirm(
            `Delete "${bin.name}"?`
        );


    if (!confirmDelete) return;


    bins =
        bins.filter(
            b => b.id !== id
        );


    saveData();

    refresh();


    showToast(
        "🗑️ Bin deleted"
    );

}


/* =====================================================
   MODAL STATUS
===================================================== */

function updateModalStatus() {

    const fill =
        Number(
            document.getElementById("binFill")
                .value
        );


    const status =
        getStatus(fill);


    const element =
        document.getElementById(
            "modalBinStatus"
        );


    element.textContent = status;

    element.style.color =
        getStatusColor(status);

}


/* =====================================================
   REPORT FUNCTIONS
===================================================== */

function openReportModal(id = null) {

    document.getElementById("reportId")
        .value = "";


    document.getElementById("reportLocation")
        .value = "";


    document.getElementById("reportDescription")
        .value = "";


    document.getElementById("reportModalTitle")
        .textContent = "Report Waste";


    if (id) {

        const report =
            reports.find(
                r => r.id === id
            );


        if (!report) return;


        document.getElementById("reportId")
            .value = report.id;


        document.getElementById("reportType")
            .value = report.type;


        document.getElementById("reportLocation")
            .value = report.location;


        document.getElementById("reportDescription")
            .value = report.description;


        document.getElementById("reportModalTitle")
            .textContent = "Edit Waste Report";

    }


    document
        .getElementById("reportModal")
        .classList.add("active");

}


function saveReport() {

    const id =
        document.getElementById("reportId")
            .value;


    const type =
        document.getElementById("reportType")
            .value;


    const location =
        document.getElementById("reportLocation")
            .value.trim();


    const description =
        document.getElementById("reportDescription")
            .value.trim();


    if (!location) {

        alert(
            "Please enter location."
        );

        return;

    }


    if (id) {

        const report =
            reports.find(
                r => r.id === Number(id)
            );


        report.type = type;

        report.location = location;

        report.description =
            description;


        showToast(
            "✅ Report updated"
        );

    } else {

        reports.unshift({

            id: Date.now(),

            type,

            location,

            description,

            status: "Submitted"

        });


        score += 10;


        showToast(
            "📍 Report submitted +10 points"
        );

    }


    saveData();

    closeModal("reportModal");

    refresh();

}


/* =====================================================
   CHANGE REPORT STATUS
===================================================== */

function changeReportStatus(id) {

    const report =
        reports.find(
            r => r.id === id
        );


    if (!report) return;


    const statuses = [

        "Submitted",

        "Assigned",

        "Cleaning",

        "Completed"

    ];


    const current =
        statuses.indexOf(
            report.status
        );


    report.status =
        statuses[
            (current + 1) %
            statuses.length
        ];


    if (report.status === "Completed") {

        score += 5;

    }


    saveData();

    refresh();

}


/* =====================================================
   DELETE REPORT
===================================================== */

function deleteReport(id) {

    if (
        !confirm(
            "Delete this report?"
        )
    ) return;


    reports =
        reports.filter(
            r => r.id !== id
        );


    saveData();

    refresh();

}


/* =====================================================
   RENDER REPORTS
===================================================== */

function renderReports() {

    const list =
        document.getElementById(
            "reportList"
        );


    list.innerHTML = "";


    if (!reports.length) {

        list.innerHTML = `
            <div class="empty-state">
                No reports available.
            </div>
        `;

        return;

    }


    reports.forEach(report => {

        const item =
            document.createElement("div");


        item.className =
            "item-row";


        item.innerHTML = `

            <div class="item-icon">
                🗑️
            </div>

            <div class="item-content">

                <h4>
                    ${escapeHTML(report.type)}
                </h4>

                <p>
                    📍 ${escapeHTML(report.location)}
                </p>

                <p>
                    ${escapeHTML(
                        report.description || ""
                    )}
                </p>

                <p>
                    Status:
                    <strong>
                        ${report.status}
                    </strong>
                </p>

            </div>

            <div class="item-actions">

                <button
                    class="action-btn"
                    title="Change Status"
                    onclick="
                        changeReportStatus(${report.id})
                    ">

                    🔄

                </button>

                <button
                    class="action-btn"
                    title="Edit"
                    onclick="
                        openReportModal(${report.id})
                    ">

                    ✏️

                </button>

                <button
                    class="action-btn"
                    title="Delete"
                    onclick="
                        deleteReport(${report.id})
                    ">

                    🗑️

                </button>

            </div>

        `;


        list.appendChild(item);

    });

}


/* =====================================================
   PICKUP FUNCTIONS
===================================================== */

function openPickupModal(id = null) {

    document.getElementById("pickupId")
        .value = "";


    document.getElementById("pickupLocation")
        .value = "";


    document.getElementById("pickupModalTitle")
        .textContent = "Request Pickup";


    if (id) {

        const pickup =
            pickups.find(
                p => p.id === id
            );


        if (!pickup) return;


        document.getElementById("pickupId")
            .value = pickup.id;


        document.getElementById("pickupType")
            .value = pickup.type;


        document.getElementById("pickupDate")
            .value = pickup.dateValue || "";


        document.getElementById("pickupTime")
            .value = pickup.time;


        document.getElementById("pickupLocation")
            .value = pickup.location;


        document.getElementById("pickupModalTitle")
            .textContent = "Edit Pickup";

    }


    document
        .getElementById("pickupModal")
        .classList.add("active");

}


function savePickup() {

    const id =
        document.getElementById("pickupId")
            .value;


    const type =
        document.getElementById("pickupType")
            .value;


    const date =
        document.getElementById("pickupDate")
            .value;


    const time =
        document.getElementById("pickupTime")
            .value;


    const location =
        document.getElementById("pickupLocation")
            .value.trim();


    if (!date || !location) {

        alert(
            "Please select date and location."
        );

        return;

    }


    if (id) {

        const pickup =
            pickups.find(
                p => p.id === Number(id)
            );


        pickup.type = type;

        pickup.date = formatDate(date);

        pickup.dateValue = date;

        pickup.time = time;

        pickup.location = location;


        showToast(
            "✅ Pickup updated"
        );

    } else {

        pickups.unshift({

            id: Date.now(),

            type,

            date: formatDate(date),

            dateValue: date,

            time,

            location,

            status: "Scheduled"

        });


        score += 5;


        showToast(
            "🚛 Pickup scheduled +5 points"
        );

    }


    saveData();

    closeModal("pickupModal");

    refresh();

}


/* =====================================================
   CHANGE PICKUP STATUS
===================================================== */

function changePickupStatus(id) {

    const pickup =
        pickups.find(
            p => p.id === id
        );


    if (!pickup) return;


    const statuses = [

        "Scheduled",

        "Assigned",

        "On The Way",

        "Collected",

        "Cancelled"

    ];


    const current =
        statuses.indexOf(
            pickup.status
        );


    pickup.status =
        statuses[
            (current + 1) %
            statuses.length
        ];


    if (pickup.status === "Collected") {

        score += 10;

    }


    saveData();

    refresh();

}


/* =====================================================
   DELETE PICKUP
===================================================== */

function deletePickup(id) {

    if (
        !confirm(
            "Cancel/delete this pickup?"
        )
    ) return;


    pickups =
        pickups.filter(
            p => p.id !== id
        );


    saveData();

    refresh();

}


/* =====================================================
   RENDER PICKUPS
===================================================== */

function renderPickups() {

    const list =
        document.getElementById(
            "pickupList"
        );


    list.innerHTML = "";


    if (!pickups.length) {

        list.innerHTML = `
            <div class="empty-state">
                No pickup requests.
            </div>
        `;

        return;

    }


    pickups.forEach(pickup => {

        const item =
            document.createElement("div");


        item.className =
            "item-row";


        item.innerHTML = `

            <div class="item-icon">
                🚛
            </div>


            <div class="item-content">

                <h4>
                    ${escapeHTML(pickup.type)}
                </h4>

                <p>
                    📅 ${escapeHTML(pickup.date)}
                </p>

                <p>
                    ⏰ ${escapeHTML(pickup.time)}
                </p>

                <p>
                    📍 ${escapeHTML(pickup.location)}
                </p>

                <p>
                    Status:
                    <strong>
                        ${escapeHTML(pickup.status)}
                    </strong>
                </p>

            </div>


            <div class="item-actions">

                <button
                    class="action-btn"
                    title="Change Status"
                    onclick="
                        changePickupStatus(${pickup.id})
                    ">

                    🔄

                </button>


                <button
                    class="action-btn"
                    title="Edit"
                    onclick="
                        openPickupModal(${pickup.id})
                    ">

                    ✏️

                </button>


                <button
                    class="action-btn"
                    title="Delete"
                    onclick="
                        deletePickup(${pickup.id})
                    ">

                    🗑️

                </button>

            </div>

        `;


        list.appendChild(item);

    });

}


/* =====================================================
   SCORE
===================================================== */

function updateScore() {

    document.getElementById(
        "scoreValue"
    ).textContent = score;


    const percentage =
        Math.min(
            100,
            score % 1000 / 10
        );


    document.getElementById(
        "scoreBar"
    ).style.width =
        percentage + "%";


    let level = "🥉 Bronze";


    if (score >= 500) {

        level = "🥈 Silver";

    }

    if (score >= 750) {

        level = "🥇 Gold";

    }

    if (score >= 1000) {

        level = "💎 Eco Champion";

    }


    document.getElementById(
        "scoreLevel"
    ).textContent = level;

}


/* =====================================================
   CLOSE MODAL
===================================================== */

function closeModal(id) {

    document.getElementById(id)
        .classList.remove("active");

}


/* =====================================================
   CLOSE MODAL OUTSIDE
===================================================== */

document
    .querySelectorAll(".modal")
    .forEach(modal => {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target === modal
                ) {

                    modal.classList.remove(
                        "active"
                    );

                }

            }
        );

    });


/* =====================================================
   NOTIFICATIONS
===================================================== */

function showNotifications() {

    const fullBins =
        bins.filter(
            b => getStatus(b.fill) === "Full"
        );


    let message =
        "🔔 SmartCity AI Notifications\n\n";


    if (fullBins.length) {

        message +=
            `🔴 ${fullBins.length} bin(s) are full.\n`;

    }


    const pendingReports =
        reports.filter(
            r => r.status !== "Completed"
        ).length;


    if (pendingReports) {

        message +=
            `📋 ${pendingReports} report(s) pending.\n`;

    }


    if (!fullBins.length && !pendingReports) {

        message +=
            "✅ Everything looks good!";

    }


    alert(message);

}


/* =====================================================
   TOAST
===================================================== */

function showToast(message) {

    const old =
        document.querySelector(".toast");


    if (old) old.remove();


    const toast =
        document.createElement("div");


    toast.className = "toast";


    toast.textContent = message;


    document.body.appendChild(toast);


    setTimeout(() => {

        toast.remove();

    }, 3000);

}


/* =====================================================
   DATE FORMAT
===================================================== */

function formatDate(date) {

    const d =
        new Date(
            date + "T00:00:00"
        );


    return d.toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );

}


/* =====================================================
   HTML ESCAPE
===================================================== */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function refresh() {

    renderBins();

    renderReports();

    renderPickups();

    renderMap();

    updateDashboard();

    updateScore();

}


/* =====================================================
   INITIAL LOAD
===================================================== */

refresh();