/* =====================================================
   SMARTCITY AI
   PARKING MANAGEMENT SYSTEM
===================================================== */


/* =====================================================
   DEFAULT PARKING DATA
===================================================== */

const defaultParkingData = {

    "PARK-001": {

        name: "City Center Parking",

        location: "Main City Center",

        total: 50,

        available: 28,

        rate: 20,

        status: "OPEN",

        team: "Parking Team A"

    },

    "PARK-002": {

        name: "Railway Station Parking",

        location: "Railway Station",

        total: 30,

        available: 16,

        rate: 15,

        status: "OPEN",

        team: "Parking Team B"

    },

    "PARK-003": {

        name: "Hospital Parking",

        location: "City Hospital",

        total: 25,

        available: 12,

        rate: 10,

        status: "OPEN",

        team: "Parking Team C"

    },

    "PARK-004": {

        name: "Mall Parking",

        location: "Central Mall",

        total: 30,

        available: 15,

        rate: 25,

        status: "OPEN",

        team: "Parking Team D"

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

        department === "parking"

    );

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

    const data =
        getParkingData();


    let total = 0;

    let available = 0;


    Object.values(data).forEach(
        parking => {

            total +=
                Number(parking.total);

            available +=
                Number(parking.available);

        }
    );


    const occupied =
        Math.max(
            0,
            total - available
        );


    const occupancy =
        total > 0

            ? Math.round(
                (occupied / total) * 100
            )

            : 0;


    document.getElementById(
        "totalSlots"
    ).textContent =
        total;


    document.getElementById(
        "availableSlots"
    ).textContent =
        available;


    document.getElementById(
        "occupiedSlots"
    ).textContent =
        occupied;


    document.getElementById(
        "occupancy"
    ).textContent =
        occupancy + "%";


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

function saveParkingChanges() {

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


    if (!id) {

        showToast(
            "Please select a parking area."
        );

        return;

    }


    const data =
        getParkingData();


    const total =
        Number(
            document.getElementById(
                "totalAreaSlots"
            ).value
        );


    const available =
        Number(
            document.getElementById(
                "availableAreaSlots"
            ).value
        );


    if (total < 0 || available < 0) {

        showToast(
            "Slot values cannot be negative."
        );

        return;

    }


    if (available > total) {

        showToast(
            "Available slots cannot exceed total slots."
        );

        return;

    }


    data[id].status =
        document.getElementById(
            "parkingStatus"
        ).value;


    data[id].total =
        total;


    data[id].available =
        available;


    data[id].rate =
        Number(
            document.getElementById(
                "parkingRate"
            ).value
        );


    data[id].location =
        document.getElementById(
            "parkingLocation"
        ).value.trim();


    data[id].team =
        document.getElementById(
            "parkingTeam"
        ).value.trim();


    data[id].lastUpdated =
        new Date().toLocaleString();


    saveParkingData(data);


    loadParkingUI();


    showToast(
        "✓ Parking changes saved successfully."
    );

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

function bookParking(id) {

    const user =
        getCurrentUser();


    if (!user) {

        showToast(
            "Please login first to book parking."
        );

        return;

    }


    const data =
        getParkingData();


    if (
        data[id].available <= 0
    ) {

        showToast(
            "❌ No slot available."
        );

        return;

    }


    data[id].available--;


    saveParkingData(data);


    loadParkingUI();


    showToast(
        "✓ Parking slot booked successfully."
    );

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