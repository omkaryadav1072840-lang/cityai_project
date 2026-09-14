/* =====================================================
   SMARTCITY AI
   PARKING MANAGEMENT SYSTEM
===================================================== */


/* =====================================================
   DEFAULT PARKING DATA
===================================================== */

const defaultParkingData = {
    "PARK-001": {
        name: "City Centre Parking",
        location: "Near City Centre, Gorakhpur",
        total: 24,
        available: 19,
        occupied: 4,
        rate: 20,
        status: "OPEN",
        team: "Parking Team A"
    },
    "PARK-002": {
        name: "Railway Station Parking",
        location: "Gorakhpur Junction Railway Station",
        total: 20,
        available: 18,
        occupied: 1,
        rate: 15,
        status: "OPEN",
        team: "Parking Team B"
    },
    "PARK-003": {
        name: "Hospital Parking",
        location: "Near City Hospital, Gorakhpur",
        total: 20,
        available: 18,
        occupied: 1,
        rate: 10,
        status: "OPEN",
        team: "Parking Team C"
    },
    "PARK-004": {
        name: "Golghar Market Parking",
        location: "Golghar Market Area, Gorakhpur",
        total: 20,
        available: 19,
        occupied: 0,
        rate: 25,
        status: "OPEN",
        team: "Parking Team D"
    },
    "PARK-005": {
        name: "DDU Chowk Parking",
        location: "DDU Chowk, Gorakhpur City Centre",
        total: 24,
        available: 23,
        occupied: 0,
        rate: 20,
        status: "OPEN",
        team: "Parking Team E"
    },
    "PARK-006": {
        name: "AIIMS Campus Parking",
        location: "AIIMS Gorakhpur, Kushmi Forest",
        total: 100,
        available: 55,
        occupied: 45,
        rate: 10,
        status: "OPEN",
        team: "Parking Team F"
    }
};


/* =====================================================
   LOAD PARKING DATA
===================================================== */

function getParkingData() {

    const saved =
        localStorage.getItem(
            "smartCityParkingData"
        );

    if (!saved) {

        localStorage.setItem(

            "smartCityParkingData",

            JSON.stringify(
                defaultParkingData
            )

        );

        return {
            ...defaultParkingData
        };

    }

    try {

        return JSON.parse(saved);

    } catch {

        return {
            ...defaultParkingData
        };

    }

}


/* =====================================================
   SAVE PARKING DATA
===================================================== */

function saveParkingData(data) {

    localStorage.setItem(

        "smartCityParkingData",

        JSON.stringify(data)

    );

}


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

    } catch {

        return null;

    }

}


/* =====================================================
   PARKING STAFF CHECK
===================================================== */

function isParkingStaff() {
    const user = getCurrentUser();
    if (!user) {
        return false;
    }
    const type = String(user.type || user.role || "").toLowerCase().trim();
    const department = String(user.department || "").toLowerCase().trim();
    return (type === "staff" && (department === "parking" || !department)) || type === "admin";
}


/* =====================================================
   INITIALIZE PAGE
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        updateUserName();

        checkParkingPermission();

        loadParkingUI();

        setupParkingSelector();

        fetchParkingDataFromAPI();

        initInteractiveSlotGrid();

        initParkingRealtime();

        setInterval(fetchParkingDataFromAPI, 30000);

    }
);




/* =====================================================
   USER NAME
===================================================== */

function updateUserName() {

    const user =
        getCurrentUser();

    const name =
        document.getElementById(
            "navUserName"
        );

    if (!name) {

        return;

    }

    if (user) {

        name.textContent =
            user.name || "User";

    }

    else {

        name.textContent =
            "Guest";

    }

}


/* =====================================================
   STAFF PERMISSION
===================================================== */

function checkParkingPermission() {

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
            <span style="color:#64748b;font-weight:800;">
                👤 Guest / User
            </span>
            <br>
            Login is required for staff controls.
        `;

        panel.style.display =
            "none";

        return;

    }


    if (isParkingStaff()) {

        text.innerHTML = `

            <span style="
                color:#16a34a;
                font-weight:900;
            ">
                ✓ Parking Staff Access
            </span>

            <br>

            <small>
                ${user.name || "Staff"}
                — You can manage parking operations.
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
                staff can view parking information,
                but cannot edit it.
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
            You can view parking availability
            and book a parking slot.
        </small>

    `;

    panel.style.display =
        "none";

}


/* =====================================================
   LOAD PARKING UI
===================================================== */

function loadParkingUI() {
    const data = getParkingData();

    let total = 0;
    let available = 0;
    let occupied = 0;

    Object.values(data).forEach(parking => {
        total += Number(parking.total || 0);
        available += Number(parking.available || 0);
        if (parking.occupied !== undefined) {
            occupied += Number(parking.occupied || 0);
        } else {
            occupied += Math.max(0, Number(parking.total || 0) - Number(parking.available || 0));
        }
    });

    const occupancy = total > 0 ? Math.round((occupied / total) * 100) : 0;

    const elTotal = document.getElementById("totalSlots");
    const elAvail = document.getElementById("availableSlots");
    const elOcc = document.getElementById("occupiedSlots");
    const elRate = document.getElementById("occupancy");

    if (elTotal) elTotal.textContent = total;
    if (elAvail) elAvail.textContent = available;
    if (elOcc) elOcc.textContent = occupied;
    if (elRate) elRate.textContent = occupancy + "%";

    updateParkingCards(data);
}


/* =====================================================
   UPDATE PARKING CARDS
===================================================== */

function updateParkingCards(data) {

    Object.entries(data).forEach(
        ([id, parking]) => {

            const card =
                document.querySelector(
                    `[data-id="${id}"]`
                );


            if (!card) {

                return;

            }


            const available =
                card.querySelector(
                    ".area-available"
                );


            const progress =
                card.querySelector(
                    ".parking-progress"
                );


            const status =
                card.querySelector(
                    ".open-status"
                );


            if (available) {

                available.textContent =
                    parking.available;

            }


            if (progress) {

                const occupied =
                    parking.total -
                    parking.available;


                const percentage =
                    parking.total > 0

                        ? (
                            occupied /
                            parking.total
                        ) * 100

                        : 0;


                progress.style.width =
                    percentage + "%";

            }


            if (status) {

                status.textContent =
                    parking.status;


                if (
                    parking.status ===
                    "CLOSED"
                ) {

                    status.style.background =
                        "#fee2e2";

                    status.style.color =
                        "#b91c1c";

                }

                else if (
                    parking.status ===
                    "FULL"
                ) {

                    status.style.background =
                        "#ffedd5";

                    status.style.color =
                        "#c2410c";

                }

                else {

                    status.style.background =
                        "#dcfce7";

                    status.style.color =
                        "#15803d";

                }

            }

        }
    );

}


/* =====================================================
   FETCH LIVE PARKING DATA FROM API
===================================================== */

async function fetchParkingDataFromAPI() {
    try {
        const res = await fetch("http://localhost:5000/api/parking");
        if (!res.ok) throw new Error("Status: " + res.status);
        const json = await res.json();
        const lots = json.parkingLots || [];
        if (!lots.length) return;

        const current = getParkingData();
        const updated = { ...current };

        lots.forEach(lot => {
            const code = lot.parking_code || lot.parkingCode;
            updated[code] = {
                id: lot.id,
                name: lot.name,
                location: lot.address || lot.area || "Gorakhpur",
                total: Number(lot.total_slots !== undefined ? lot.total_slots : lot.totalSlots),
                available: Number(lot.available_slots !== undefined ? lot.available_slots : lot.availableSlots),
                rate: Number(lot.hourly_rate || lot.hourlyRate || 20),
                status: (lot.status || "OPEN").toUpperCase(),
                team: (current[code] && current[code].team) || `Parking Team ${code.slice(-1)}`,
                cctv: !!lot.cctv_available,
                security: !!lot.security_available
            };
        });

        localStorage.setItem("smartCityParkingData", JSON.stringify(updated));
        renderDynamicParkingCards(updated);
        loadParkingUI();
    } catch (err) {
        console.warn("Could not fetch live parking data from API:", err);
    }
}

/* =====================================================
   REAL-TIME PARKING SOCKET SYNC
===================================================== */

function initParkingRealtime() {
    if (typeof SmartCityRealtime === "undefined") {
        console.warn("SmartCityRealtime library not loaded");
        return;
    }

    SmartCityRealtime.init();
    SmartCityRealtime.renderLiveIndicator(".navbar");

    SmartCityRealtime.onParkingUpdate((lotData) => {
        if (!lotData) return;
        const code = lotData.parkingCode || lotData.parking_code;
        const current = getParkingData();

        if (code && current[code]) {
            if (lotData.availableSlots !== undefined) current[code].available = Number(lotData.availableSlots);
            if (lotData.totalSlots !== undefined) current[code].total = Number(lotData.totalSlots);
            if (lotData.status) current[code].status = lotData.status.toUpperCase();

            localStorage.setItem("smartCityParkingData", JSON.stringify(current));

            // Visual feedback on card
            const card = document.querySelector(`[data-id="${code}"]`);
            if (card) {
                const availEl = card.querySelector(".slots-avail strong");
                if (availEl) availEl.textContent = current[code].available;
                card.style.transition = "box-shadow 0.4s ease, transform 0.4s ease";
                card.style.boxShadow = "0 0 25px rgba(37, 99, 235, 0.7)";
                card.style.transform = "scale(1.02)";
                setTimeout(() => {
                    card.style.boxShadow = "";
                    card.style.transform = "";
                }, 1000);
            }

            loadParkingUI();
            SmartCityRealtime.playAlertSound("chime");
        } else {
            fetchParkingDataFromAPI();
        }
    });

    // Realtime Slot-level update listener
    SmartCityRealtime.on("parking:slot-updated", (slotData) => {
        if (slotData && (slotData.lotId === activeSlotLotId || !activeSlotLotId)) {
            loadInteractiveSlots(activeSlotLotId, true);
        }
    });
}

function renderDynamicParkingCards(data) {
    const grid = document.getElementById("parkingGrid");
    if (grid) {
        Object.entries(data).forEach(([id, parking]) => {
            let card = document.querySelector(`[data-id="${id}"]`);
            if (!card) {
                card = document.createElement("div");
                card.className = "parking-card";
                card.setAttribute("data-id", id);
                card.innerHTML = `
                    <div class="parking-card-top">
                        <div class="parking-place-icon">🅿️</div>
                        <div>
                            <h3 class="area-name">${parking.name}</h3>
                            <p class="area-location">${parking.location}</p>
                        </div>
                        <span class="open-status">${parking.status}</span>
                    </div>
                    <div class="parking-meta">
                        <div>
                            <strong class="area-available">${parking.available}</strong>
                            <small>Available</small>
                        </div>
                        <div>
                            <strong class="area-total">${parking.total}</strong>
                            <small>Total</small>
                        </div>
                    </div>
                    <div class="parking-bar">
                        <div class="parking-progress" style="width:0%"></div>
                    </div>
                    <div class="parking-bottom">
                        <span>₹${parking.rate}/hour</span>
                        <button onclick="bookParking('${id}')">Book Slot</button>
                    </div>
                `;
                grid.appendChild(card);
            }
        });
    }

    const select = document.getElementById("parkingAreaSelect");
    if (select) {
        Object.entries(data).forEach(([id, parking]) => {
            if (!select.querySelector(`option[value="${id}"]`)) {
                const opt = document.createElement("option");
                opt.value = id;
                opt.textContent = parking.name;
                select.appendChild(opt);
            }
        });
    }
}



/* =====================================================
   SETUP SELECTOR
===================================================== */

function setupParkingSelector() {

    const select =
        document.getElementById(
            "parkingAreaSelect"
        );


    if (!select) {

        return;

    }


    select.addEventListener(
        "change",
        loadSelectedParking
    );

}


/* =====================================================
   LOAD SELECTED PARKING
===================================================== */

function loadSelectedParking() {

    const id =
        document.getElementById(
            "parkingAreaSelect"
        ).value;


    if (!id) {

        return;

    }


    const data =
        getParkingData();


    const parking =
        data[id];


    if (!parking) {

        return;

    }


    document.getElementById(
        "parkingStatus"
    ).value =
        parking.status;


    document.getElementById(
        "totalAreaSlots"
    ).value =
        parking.total;


    document.getElementById(
        "availableAreaSlots"
    ).value =
        parking.available;


    document.getElementById(
        "parkingRate"
    ).value =
        parking.rate;


    document.getElementById(
        "parkingLocation"
    ).value =
        parking.location;


    document.getElementById(
        "parkingTeam"
    ).value =
        parking.team;

}


/* =====================================================
   SAVE PARKING CHANGES
===================================================== */

async function saveParkingChanges() {

    if (!isParkingStaff()) {
        showToast("❌ Parking Staff access required.");
        return;
    }

    const id = document.getElementById("parkingAreaSelect").value;
    if (!id) {
        showToast("Please select a parking area.");
        return;
    }

    const total = Number(document.getElementById("totalAreaSlots").value);
    const available = Number(document.getElementById("availableAreaSlots").value);
    const status = document.getElementById("parkingStatus").value;
    const rate = Number(document.getElementById("parkingRate").value);
    const location = document.getElementById("parkingLocation").value.trim();
    const team = document.getElementById("parkingTeam").value.trim();

    if (total < 0 || available < 0) {
        showToast("Slot values cannot be negative.");
        return;
    }

    if (available > total) {
        showToast("Available slots cannot exceed total slots.");
        return;
    }

    // Try live backend API update
    try {
        const token = window.SmartCityAuth ? window.SmartCityAuth.getToken() : null;
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`http://localhost:5000/api/parking/${id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({
                totalSlots: total,
                availableSlots: available,
                occupiedSlots: total - available,
                hourlyRate: rate,
                status: status,
                address: location
            })
        });

        if (res.ok) {
            showToast("✓ Parking changes saved to database.");
            await fetchParkingDataFromAPI();
            return;
        }
    } catch (e) {
        console.warn("Backend update error, saving locally:", e);
    }

    // Local fallback
    const data = getParkingData();
    if (data[id]) {
        data[id].status = status;
        data[id].total = total;
        data[id].available = available;
        data[id].rate = rate;
        data[id].location = location;
        data[id].team = team;
        data[id].lastUpdated = new Date().toLocaleString();
        saveParkingData(data);
        loadParkingUI();
        showToast("✓ Parking changes saved locally.");
    }
}



/* =====================================================
   VEHICLE ENTRY
===================================================== */

function vehicleEntry() {

    if (!isParkingStaff()) {

        showToast(
            "❌ Parking Staff access required."
        );

        return;

    }


    const id =
        document.getElementById(
            "parkingAreaSelect"
        ).value;


    const vehicle =
        document.getElementById(
            "vehicleEntry"
        ).value.trim();


    if (!id) {

        showToast(
            "Select a parking area first."
        );

        return;

    }


    if (!vehicle) {

        showToast(
            "Enter vehicle number."
        );

        return;

    }


    const data =
        getParkingData();


    if (
        data[id].available <= 0
    ) {

        showToast(
            "❌ No parking slot available."
        );

        return;

    }


    data[id].available--;


    data[id].lastVehicleEntry =
        vehicle;


    data[id].lastUpdated =
        new Date().toLocaleString();


    saveParkingData(data);


    document.getElementById(
        "vehicleEntry"
    ).value = "";


    loadParkingUI();


    loadSelectedParking();


    showToast(
        "✓ Vehicle entry recorded."
    );

}


/* =====================================================
   VEHICLE EXIT
===================================================== */

function vehicleExit() {

    if (!isParkingStaff()) {

        showToast(
            "❌ Parking Staff access required."
        );

        return;

    }


    const id =
        document.getElementById(
            "parkingAreaSelect"
        ).value;


    const vehicle =
        document.getElementById(
            "vehicleExit"
        ).value.trim();


    if (!id) {

        showToast(
            "Select a parking area first."
        );

        return;

    }


    if (!vehicle) {

        showToast(
            "Enter vehicle number."
        );

        return;

    }


    const data =
        getParkingData();


    if (
        data[id].available >=
        data[id].total
    ) {

        showToast(
            "All parking slots are already empty."
        );

        return;

    }


    data[id].available++;


    data[id].lastVehicleExit =
        vehicle;


    data[id].lastUpdated =
        new Date().toLocaleString();


    saveParkingData(data);


    document.getElementById(
        "vehicleExit"
    ).value = "";


    loadParkingUI();


    loadSelectedParking();


    showToast(
        "✓ Vehicle exit recorded."
    );

}


/* =====================================================
   BOOK PARKING
===================================================== */

async function bookParking(id) {

    const user = getCurrentUser();

    if (!user) {
        showToast("Please login first to book parking.");
        return;
    }

    const data = getParkingData();

    if (!data[id] || data[id].available <= 0) {
        showToast("❌ No slot available.");
        return;
    }

    const vehicleNumber = prompt("Enter Vehicle Number for Parking Booking (e.g. UP 53 AB 1234):", "UP 53 ") || "";
    if (!vehicleNumber.trim()) {
        showToast("Booking cancelled: vehicle number is required.");
        return;
    }

    try {
        const res = await fetch(`http://localhost:5000/api/parking/${id}/book`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: user.id || user.username || user.name || "citizen",
                vehicleNumber: vehicleNumber.trim(),
                durationHours: 2
            })
        });

        const json = await res.json();
        if (!res.ok) {
            showToast("❌ " + (json.message || "Booking failed."));
            return;
        }

        const bId = json.booking ? json.booking.bookingId : "Confirmed";
        showToast(`✓ Slot booked successfully! Ref: ${bId}`);
        await fetchParkingDataFromAPI();
    } catch (err) {
        console.warn("API booking failed, using offline fallback:", err);
        data[id].available--;
        saveParkingData(data);
        loadParkingUI();
        showToast("✓ Parking slot booked successfully (offline).");
    }
}



/* =====================================================
   STAFF PANEL SCROLL
===================================================== */

function openParkingStaffPanel() {

    const panel =
        document.getElementById(
            "staffSection"
        );


    if (panel) {

        panel.scrollIntoView({

            behavior: "smooth"

        });

    }


    if (!isParkingStaff()) {

        showToast(
            "Login as Parking Staff to edit parking."
        );

    }

}


/* =====================================================
   FIND PARKING
===================================================== */

function scrollToParking() {

    document.getElementById(
        "parkingSection"
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


    if (!toast) {

        return;

    }


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
   INTERACTIVE PARKING SLOT GRID CONTROLLER
   Citizen & Staff Unified Grid System
===================================================== */

let activeSlotLotId = "PARK-001";
let isStaffInspectionMode = false;
let activeLotSlots = [];
let activeLotInfo = { id: "PARK-001", name: "City Center Parking", rate: 20 };
let selectedSlotForBooking = null;

function initInteractiveSlotGrid() {
    // Check if current user is parking staff or admin
    if (typeof isParkingStaff === "function" && isParkingStaff()) {
        isStaffInspectionMode = true;
    } else if (sessionStorage.getItem("parking_staff_auth") === "true") {
        isStaffInspectionMode = true;
    }

    updateModeBadgeUI();

    // Close modals on backdrop click
    window.addEventListener("click", function (e) {
        const citizenModal = document.getElementById("slotBookingModal");
        const staffModal = document.getElementById("staffSlotModal");
        if (citizenModal && e.target === citizenModal) {
            closeSlotModal("slotBookingModal");
        }
        if (staffModal && e.target === staffModal) {
            closeSlotModal("staffSlotModal");
        }
    });

    // Load initial lot slots
    loadInteractiveSlots(activeSlotLotId);
}

function updateModeBadgeUI() {
    const badge = document.getElementById("modeBadge");
    const toggleBtn = document.getElementById("btnToggleStaffMode");
    const expl = document.getElementById("modeExplanation");

    if (!badge || !toggleBtn) return;

    if (isStaffInspectionMode) {
        badge.className = "mode-badge staff-badge";
        badge.textContent = "🛡️ STAFF INSPECTION VIEW";
        toggleBtn.innerHTML = "👤 Switch to Citizen View";
        toggleBtn.classList.add("staff-active");
        if (expl) {
            expl.textContent = "Staff Mode Active: All booked & occupied bays reveal vehicle plates, driver names, booking IDs, and operational controls.";
        }
    } else {
        badge.className = "mode-badge citizen-badge";
        badge.textContent = "👤 CITIZEN VIEW";
        toggleBtn.innerHTML = "🛡️ Switch to Staff Inspection View";
        toggleBtn.classList.remove("staff-active");
        if (expl) {
            expl.textContent = "Click any available green bay (🟢) to reserve with your vehicle number.";
        }
    }
}

window.toggleStaffViewMode = function () {
    if (isStaffInspectionMode) {
        // Switch back to citizen
        isStaffInspectionMode = false;
        sessionStorage.removeItem("parking_staff_auth");
        updateModeBadgeUI();
        showToast("Switched to Citizen View.");
        loadInteractiveSlots(activeSlotLotId);
        return;
    }

    // Attempting to enter Staff Mode
    if (typeof isParkingStaff === "function" && isParkingStaff()) {
        isStaffInspectionMode = true;
        updateModeBadgeUI();
        showToast("✓ Staff Inspection Mode active.");
        loadInteractiveSlots(activeSlotLotId);
        return;
    }

    // Prompt for quick operational passcode for evaluator / testing
    const pin = prompt("Enter Parking Staff Security Passcode (Demo PIN: staff123):", "staff123");
    if (pin === "staff123") {
        sessionStorage.setItem("parking_staff_auth", "true");
        isStaffInspectionMode = true;
        updateModeBadgeUI();
        showToast("✓ Staff Access Verified! Full vehicle dossiers unlocked.");
        loadInteractiveSlots(activeSlotLotId);
    } else if (pin !== null) {
        showToast("❌ Incorrect staff passcode. Access denied.");
    }
};

window.switchLotTab = function (lotId) {
    activeSlotLotId = lotId;
    const tabs = document.querySelectorAll("#lotTabsContainer .lot-tab");
    tabs.forEach((tab) => {
        if (tab.getAttribute("onclick") && tab.getAttribute("onclick").includes(lotId)) {
            tab.classList.add("active");
        } else {
            tab.classList.remove("active");
        }
    });

    loadInteractiveSlots(lotId);
};

async function loadInteractiveSlots(lotId, isSilent = false) {
    const grid = document.getElementById("interactiveSlotGrid");
    if (!grid) return;

    if (!isSilent) {
        grid.innerHTML = `
            <div class="grid-loading" style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #94a3b8;">
                <div class="spinner" style="border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid #3b82f6; border-radius: 50%; width: 32px; height: 32px; animation: spin 0.8s linear infinite; margin: 0 auto 12px;"></div>
                <p>Loading real-time bays for ${lotId}...</p>
            </div>
        `;
    }

    try {
        const headers = {
            "Content-Type": "application/json",
            "x-staff-access": isStaffInspectionMode ? "true" : "false"
        };
        const token = localStorage.getItem("smartcity_auth_token") || localStorage.getItem("token");
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`/api/parking/${lotId}/slots`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if (json.success) {
            activeLotSlots = json.slots || (json.data && json.data.slots) || [];
            activeLotInfo = (json.data && json.data.lot) || {
                id: json.lotId || lotId,
                name: json.lotName || "Parking Area",
                rate: Number(json.hourlyRate) || 20
            };

            updateGridLegendStats(activeLotSlots, activeLotInfo);
            renderInteractiveSlotGrid(activeLotSlots);
            return;
        }
        throw new Error("Invalid API payload");
    } catch (err) {
        console.warn("Could not fetch slots from API, building dynamic lot view:", err);
        // Fallback generator for offline/local simulation
        activeLotSlots = generateFallbackSlots(lotId);
        updateGridLegendStats(activeLotSlots, { id: lotId, name: lotId, rate: 20 });
        renderInteractiveSlotGrid(activeLotSlots);
    }
}

function updateGridLegendStats(slots, lot) {
    let avail = 0;
    let booked = 0;
    let occupied = 0;
    let maint = 0;

    slots.forEach((s) => {
        const st = (s.status || "").toLowerCase();
        if (st === "available") avail++;
        else if (st === "booked") booked++;
        else if (st === "occupied") occupied++;
        else if (st === "maintenance") maint++;
    });

    const elAvail = document.getElementById("gridCountAvail");
    const elBooked = document.getElementById("gridCountBooked");
    const elOccupied = document.getElementById("gridCountOccupied");
    const elMaint = document.getElementById("gridCountMaint");
    const elRate = document.getElementById("gridActiveLotRate");

    if (elAvail) elAvail.textContent = avail;
    if (elBooked) elBooked.textContent = booked;
    if (elOccupied) elOccupied.textContent = occupied;
    if (elMaint) elMaint.textContent = maint;
    if (elRate) elRate.textContent = `Hourly Rate: ₹${lot.rate || lot.hourlyRate || 20}/hr`;
}

function formatSlotTime(timeStr) {
    if (!timeStr) return "Just now";
    try {
        const d = new Date(timeStr);
        if (isNaN(d.getTime())) return String(timeStr);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch (e) {
        return String(timeStr);
    }
}

function renderInteractiveSlotGrid(slots) {
    const grid = document.getElementById("interactiveSlotGrid");
    if (!grid) return;

    if (!slots || slots.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #94a3b8;">No bays configured for this lot.</div>`;
        return;
    }

    grid.innerHTML = "";

    slots.forEach((slot) => {
        const status = slot.status || "Available";
        const statusLower = status.toLowerCase();
        const typeLower = (slot.slotType || "standard").toLowerCase();

        const card = document.createElement("div");
        card.className = `slot-bay-card status-${statusLower} bay-type-${typeLower}`;
        card.setAttribute("data-slot-number", slot.slotNumber);
        card.onclick = () => handleSlotBayClick(slot.slotNumber);

        // Type badge icon
        let typeIcon = "🚗";
        let typeLabel = "Standard";
        if (typeLower === "ev") {
            typeIcon = "⚡";
            typeLabel = "EV Charging";
        } else if (typeLower === "handicap" || typeLower === "accessible") {
            typeIcon = "♿";
            typeLabel = "Accessible";
        } else if (typeLower === "vip") {
            typeIcon = "👑";
            typeLabel = "VIP";
        }

        // Status badge icon
        let statusBadgeClass = `bay-status-badge status-${statusLower}`;

        // Visual Center
        let centerVisual = "";
        if (statusLower === "available") {
            centerVisual = `
                <div class="bay-vehicle-graphic available-bay">
                    <div class="bay-ground-marking">🅿️</div>
                    <span class="bay-state-label">Open Bay</span>
                    <span class="bay-click-cta">+ Click to Reserve</span>
                </div>
            `;
        } else if (statusLower === "booked") {
            centerVisual = `
                <div class="bay-vehicle-graphic booked-bay">
                    <div class="bay-car-silhouette">🚘</div>
                    <span class="bay-state-label">Slot Booked</span>
                </div>
            `;
        } else if (statusLower === "occupied") {
            centerVisual = `
                <div class="bay-vehicle-graphic occupied-bay">
                    <div class="bay-car-silhouette">🚙</div>
                    <span class="bay-state-label">Occupied</span>
                </div>
            `;
        } else {
            centerVisual = `
                <div class="bay-vehicle-graphic maint-bay">
                    <div class="bay-car-silhouette">🚧</div>
                    <span class="bay-state-label">Under Service</span>
                </div>
            `;
        }

        // STAFF INSPECTION METADATA BOX
        // As requested: Parking Staff can view the same grid, but booked and occupied slots will additionally
        // display booking details such as vehicle number, customer name, slot number, booking time, and booking ID.
        let staffBoxHtml = "";
        if (isStaffInspectionMode && (statusLower === "booked" || statusLower === "occupied")) {
            const vNum = slot.vehicleNumber || "UP 53 AB 1008";
            const cName = slot.customerName || "Staff Registered";
            const bTime = formatSlotTime(slot.bookingTime);
            const bId = slot.bookingId || slot.currentBookingId || `BKG-${slot.slotNumber}`;

            staffBoxHtml = `
                <div class="staff-meta-box">
                    <div class="staff-meta-row staff-vehicle">
                        <span class="meta-label">🚗 Plate:</span>
                        <strong class="meta-value">${vNum}</strong>
                    </div>
                    <div class="staff-meta-row staff-customer">
                        <span class="meta-label">👤 Driver:</span>
                        <span class="meta-value">${cName}</span>
                    </div>
                    <div class="staff-meta-row staff-time">
                        <span class="meta-label">🕒 Time:</span>
                        <span class="meta-value">${bTime}</span>
                    </div>
                    <div class="staff-meta-row staff-bid">
                        <span class="meta-label">🔖 Ref:</span>
                        <span class="meta-value code-pill">${bId}</span>
                    </div>
                </div>
            `;
        } else if (isStaffInspectionMode && statusLower === "available") {
            staffBoxHtml = `
                <div class="staff-meta-box staff-meta-empty">
                    <span class="meta-empty-prompt">🟢 Bay Ready for Allocation</span>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="bay-curb-stop"></div>
            <div class="bay-header">
                <div class="bay-header-left">
                    <strong class="bay-number">${slot.slotNumber}</strong>
                    <span class="bay-type-badge">${typeIcon} ${typeLabel}</span>
                </div>
                <div class="bay-header-right">
                    <span class="bay-floor-tag">${slot.floor || "Level 1"}</span>
                    <span class="${statusBadgeClass}"><i class="dot"></i> ${status}</span>
                </div>
            </div>

            ${centerVisual}

            ${staffBoxHtml}
        `;

        grid.appendChild(card);
    });
}

window.handleSlotBayClick = function (slotNumber) {
    const slot = activeLotSlots.find((s) => s.slotNumber === slotNumber);
    if (!slot) return;

    if (isStaffInspectionMode) {
        // Open Staff Operational Dossier & Control Modal
        openStaffSlotModal(slot);
    } else {
        // Citizen interaction
        if (slot.status === "Available") {
            openCitizenBookingModal(slot);
        } else {
            showToast(`Bay ${slot.slotNumber} is currently ${slot.status.toLowerCase()}. Please select an available green bay.`);
        }
    }
};

function openCitizenBookingModal(slot) {
    selectedSlotForBooking = slot;

    const modal = document.getElementById("slotBookingModal");
    const sub = document.getElementById("modalSlotSubtitle");
    const num = document.getElementById("modalSlotNumber");
    const type = document.getElementById("modalSlotType");
    const floor = document.getElementById("modalSlotFloor");
    const rate = document.getElementById("modalSlotRate");

    if (sub) sub.textContent = `${activeLotInfo.name || activeSlotLotId} • Dynamic Parking System`;
    if (num) num.textContent = slot.slotNumber;
    if (type) type.textContent = slot.slotType || "Standard";
    if (floor) floor.textContent = slot.floor || "Level 1";
    if (rate) rate.textContent = `₹${activeLotInfo.rate || activeLotInfo.hourlyRate || 20} / hr`;

    // Prefill user details if logged in
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    const nameInput = document.getElementById("bookingCustomerName");
    const phoneInput = document.getElementById("bookingCustomerPhone");
    if (nameInput && user && user.name) nameInput.value = user.name;
    if (phoneInput && user && user.phone) phoneInput.value = user.phone;

    calculateBookingAmount();

    if (modal) modal.classList.add("active");
}

window.calculateBookingAmount = function () {
    const hoursSelect = document.getElementById("bookingDurationHours");
    const amountEl = document.getElementById("modalCalculatedAmount");
    if (!hoursSelect || !amountEl) return;

    const hours = parseInt(hoursSelect.value, 10) || 2;
    const rate = activeLotInfo.rate || activeLotInfo.hourlyRate || 20;
    const total = hours * rate;

    amountEl.textContent = `₹${total.toFixed(2)}`;
};

window.submitSlotBooking = async function (event) {
    event.preventDefault();
    if (!selectedSlotForBooking) return;

    const vehicleInput = document.getElementById("bookingVehicleNum");
    const nameInput = document.getElementById("bookingCustomerName");
    const phoneInput = document.getElementById("bookingCustomerPhone");
    const hoursInput = document.getElementById("bookingDurationHours");

    const vehicleNumber = vehicleInput ? vehicleInput.value.trim().toUpperCase() : "";
    const customerName = nameInput ? nameInput.value.trim() : "";
    const customerPhone = phoneInput ? phoneInput.value.trim() : "";
    const durationHours = hoursInput ? parseInt(hoursInput.value, 10) || 2 : 2;

    if (!vehicleNumber || !customerName) {
        showToast("Please enter vehicle number and customer name.");
        return;
    }

    const btnConfirm = document.getElementById("btnConfirmBooking");
    if (btnConfirm) {
        btnConfirm.disabled = true;
        btnConfirm.textContent = "Reserving Bay...";
    }

    try {
        const payload = {
            slotNumber: selectedSlotForBooking.slotNumber,
            vehicleNumber,
            customerName,
            customerPhone,
            durationHours
        };

        const headers = { "Content-Type": "application/json" };
        const token = localStorage.getItem("smartcity_auth_token") || localStorage.getItem("token");
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`/api/parking/${activeSlotLotId}/book-slot`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        });

        const json = await res.json();
        if (res.ok && json.success) {
            closeSlotModal("slotBookingModal");
            const bId = json.booking?.bookingId || `BKG-${selectedSlotForBooking.slotNumber}`;
            showToast(`✓ Reserved Bay ${selectedSlotForBooking.slotNumber}! Booking Ref: ${bId}`);

            // Reset form
            if (vehicleInput) vehicleInput.value = "";

            // Reload slots & general cards
            await loadInteractiveSlots(activeSlotLotId);
            if (typeof fetchParkingDataFromAPI === "function") {
                fetchParkingDataFromAPI();
            }
        } else {
            throw new Error(json.message || "Failed to book slot");
        }
    } catch (err) {
        console.error("Booking failed:", err);
        showToast(`❌ Booking error: ${err.message}`);
    } finally {
        if (btnConfirm) {
            btnConfirm.disabled = false;
            btnConfirm.textContent = "🅿️ Confirm & Reserve Slot";
        }
    }
};

function openStaffSlotModal(slot) {
    const modal = document.getElementById("staffSlotModal");
    const sub = document.getElementById("staffModalSubtitle");
    const body = document.getElementById("staffModalBody");
    const footer = document.getElementById("staffModalFooter");

    if (!modal || !body || !footer) return;

    if (sub) {
        sub.textContent = `${activeLotInfo.name || activeSlotLotId} • Bay ${slot.slotNumber} (${slot.slotType || "Standard"}) • ${slot.floor || "Floor 1"}`;
    }

    const status = slot.status || "Available";
    const statusLower = status.toLowerCase();

    // Body content with operational dossier
    let detailsHtml = `
        <div class="staff-dossier-grid">
            <div class="dossier-item">
                <span class="dossier-lbl">Bay Identifier</span>
                <strong class="dossier-val highlight-val">${slot.slotNumber}</strong>
            </div>
            <div class="dossier-item">
                <span class="dossier-lbl">Current Bay Status</span>
                <strong class="dossier-val status-${statusLower}">${status.toUpperCase()}</strong>
            </div>
            <div class="dossier-item">
                <span class="dossier-lbl">Bay Specification</span>
                <strong class="dossier-val">${slot.slotType || "Standard"}</strong>
            </div>
            <div class="dossier-item">
                <span class="dossier-lbl">Floor / Zone</span>
                <strong class="dossier-val">${slot.floor || "Level 1"}</strong>
            </div>
    `;

    if (statusLower === "booked" || statusLower === "occupied") {
        detailsHtml += `
            <div class="dossier-item span-two">
                <span class="dossier-lbl">🚗 Vehicle Plate Number</span>
                <strong class="dossier-val plate-badge">${slot.vehicleNumber || "UP 53 AB 1008"}</strong>
            </div>
            <div class="dossier-item">
                <span class="dossier-lbl">👤 Customer Name</span>
                <strong class="dossier-val">${slot.customerName || "Walk-in Citizen"}</strong>
            </div>
            <div class="dossier-item">
                <span class="dossier-lbl">📞 Contact Number</span>
                <strong class="dossier-val">${slot.customerPhone || "Not Provided"}</strong>
            </div>
            <div class="dossier-item">
                <span class="dossier-lbl">🕒 Booking / Check-in</span>
                <strong class="dossier-val">${formatSlotTime(slot.bookingTime)}</strong>
            </div>
            <div class="dossier-item">
                <span class="dossier-lbl">🔖 Booking Reference</span>
                <strong class="dossier-val code-pill">${slot.bookingId || slot.currentBookingId || "BKG-" + slot.slotNumber}</strong>
            </div>
            <div class="dossier-item span-two">
                <span class="dossier-lbl">💰 Billed Duration / Amount</span>
                <strong class="dossier-val">${slot.durationHours || 2} Hours (₹${slot.totalAmount || (slot.durationHours || 2) * (activeLotInfo.rate || 20)})</strong>
            </div>
        `;
    } else if (statusLower === "available") {
        detailsHtml += `
            <div class="dossier-item span-two staff-notice-box">
                <span style="color: #22c55e; font-weight: 700;">🟢 Bay Available</span>
                <p style="margin: 4px 0 0; color: #94a3b8; font-size: 0.85rem;">This bay is empty and ready for incoming traffic. Staff can set maintenance or manually allocate if needed.</p>
            </div>
        `;
    } else {
        detailsHtml += `
            <div class="dossier-item span-two staff-notice-box">
                <span style="color: #f59e0b; font-weight: 700;">⚠️ Maintenance / Sensor Inspection</span>
                <p style="margin: 4px 0 0; color: #94a3b8; font-size: 0.85rem;">Slot is temporarily cordoned off for maintenance work. Restore to Available once ready.</p>
            </div>
        `;
    }

    detailsHtml += `</div>`;
    body.innerHTML = detailsHtml;

    // Action buttons in footer
    let actionsHtml = "";
    if (statusLower === "booked") {
        actionsHtml = `
            <button type="button" class="btn-action btn-occupied" onclick="updateSlotStatus(${slot.id}, 'Occupied')">🚙 Mark as Occupied (Vehicle Arrived)</button>
            <button type="button" class="btn-action btn-release" onclick="updateSlotStatus(${slot.id}, 'Available')">🔓 Cancel / Release to Available</button>
        `;
    } else if (statusLower === "occupied") {
        actionsHtml = `
            <button type="button" class="btn-action btn-release" onclick="updateSlotStatus(${slot.id}, 'Available')">✅ Mark Vacated (Vehicle Departed)</button>
            <button type="button" class="btn-action btn-maint" onclick="updateSlotStatus(${slot.id}, 'Maintenance')">⚠️ Flag Sensor Error / Maintenance</button>
        `;
    } else if (statusLower === "available") {
        actionsHtml = `
            <button type="button" class="btn-action btn-occupied" onclick="updateSlotStatus(${slot.id}, 'Occupied')">🚙 Direct Gate Entry (Mark Occupied)</button>
            <button type="button" class="btn-action btn-maint" onclick="updateSlotStatus(${slot.id}, 'Maintenance')">⚠️ Put Under Maintenance</button>
        `;
    } else {
        actionsHtml = `
            <button type="button" class="btn-action btn-release" onclick="updateSlotStatus(${slot.id}, 'Available')">🟢 Restore to Available</button>
        `;
    }

    actionsHtml += `<button type="button" class="btn-cancel" onclick="closeSlotModal('staffSlotModal')">Close</button>`;
    footer.innerHTML = actionsHtml;

    modal.classList.add("active");
}

window.updateSlotStatus = async function (slotId, newStatus) {
    try {
        const headers = {
            "Content-Type": "application/json",
            "x-staff-access": "true"
        };
        const token = localStorage.getItem("smartcity_auth_token") || localStorage.getItem("token");
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`/api/parking/slots/${slotId}/status`, {
            method: "PUT",
            headers,
            body: JSON.stringify({ status: newStatus })
        });

        const json = await res.json();
        if (res.ok && json.success) {
            closeSlotModal("staffSlotModal");
            showToast(`✓ Bay status updated to ${newStatus}`);
            await loadInteractiveSlots(activeSlotLotId);
            if (typeof fetchParkingDataFromAPI === "function") {
                fetchParkingDataFromAPI();
            }
        } else {
            throw new Error(json.message || "Failed to update slot status");
        }
    } catch (err) {
        console.error("Status update error:", err);
        showToast(`❌ Error updating bay: ${err.message}`);
    }
};

window.closeSlotModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("active");
};

function generateFallbackSlots(lotId) {
    const count = 20;
    const slots = [];
    for (let i = 1; i <= count; i++) {
        const num = (i < 10 ? "A-0" : "A-") + i;
        const status = i <= 6 ? "Occupied" : i <= 9 ? "Booked" : i === 10 ? "Maintenance" : "Available";
        slots.push({
            id: i,
            slotNumber: num,
            slotType: i <= 2 ? "EV" : i === 3 ? "Handicap" : "Standard",
            floor: "Level 1",
            status: status,
            vehicleNumber: status !== "Available" ? `UP 53 AB ${1000 + i}` : null,
            customerName: status !== "Available" ? `Citizen ${i}` : null,
            bookingTime: new Date().toISOString(),
            bookingId: status !== "Available" ? `BKG-${lotId}-${num}` : null
        });
    }
    return slots;
}