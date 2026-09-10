/* =====================================================
   CITIZEN WASTE SERVICES - ADDITIVE MODULE
===================================================== */

(function () {

    const BIN_REQUEST_API =
        "http://localhost:5000/api/waste/bin-requests";

    let citizenBinRequests =
        JSON.parse(
            localStorage.getItem(
                "wasteBinRequests"
            ) || "[]"
        );


    /* =====================================================
       GET CURRENT LOGGED-IN USER
       Supports index.html login storage
    ===================================================== */

    function currentUser() {

        try {

            const saved =
                localStorage.getItem(
                    "smartCityCurrentUser"
                ) ||
                localStorage.getItem(
                    "currentUser"
                ) ||
                localStorage.getItem(
                    "user"
                );

            if (!saved) {
                return null;
            }

            return JSON.parse(saved);

        } catch (error) {

            console.error(
                "Current user error:",
                error
            );

            return null;
        }
    }


    /* =====================================================
       GET USER ID
    ===================================================== */

    function userId() {

        const user =
            currentUser();

        if (!user) {
            return null;
        }

        return (
            user.userId ??
            user.id ??
            user.user_id ??
            null
        );
    }


    /* =====================================================
       CHECK WASTE STAFF
    ===================================================== */

    function isStaffUser() {

        const user =
            currentUser();

        if (!user) {
            return false;
        }


        const type =
            String(
                user.type ??
                user.role ??
                user.userType ??
                ""
            )
                .trim()
                .toLowerCase();


        const department =
            String(
                user.department ??
                ""
            )
                .trim()
                .toLowerCase();


        const departmentName =
            String(
                user.departmentName ??
                ""
            )
                .trim()
                .toLowerCase();


        const staffType =
            type === "staff" ||
            type === "admin" ||
            type === "superadmin" ||
            type === "waste_staff";


        const wasteDepartment =
            department === "waste" ||
            department === "waste management" ||
            departmentName === "waste" ||
            departmentName === "waste management" ||
            department.includes("waste") ||
            departmentName.includes("waste");


        return (
            user.isStaff === true ||
            (
                staffType &&
                (
                    wasteDepartment ||
                    type === "admin" ||
                    type === "superadmin" ||
                    type === "waste_staff"
                )
            )
        );
    }


    /* =====================================================
       ROLE UI
    ===================================================== */

    function setRoleUI() {

        const staff =
            isStaffUser();


        document.body.classList.toggle(
            "citizen-mode",
            !staff
        );


        document.body.classList.toggle(
            "staff-mode",
            staff
        );


        document
            .querySelectorAll(
                ".staff-only"
            )
            .forEach(
                element => {

                    element.style.display =
                        staff
                            ? ""
                            : "none";

                }
            );


        const citizenDashboard =
            document.getElementById(
                "citizenDashboard"
            );


        if (citizenDashboard) {

            citizenDashboard.style.display =
                staff
                    ? "none"
                    : "";

        }


        const roleTitle =
            document.getElementById(
                "roleTitle"
            );


        const roleSubtitle =
            document.getElementById(
                "roleSubtitle"
            );


        const rolePill =
            document.getElementById(
                "rolePill"
            );


        const user =
            currentUser();


        const name =
            user?.name ||
            user?.fullName ||
            "Citizen";


        const profileName =
            document.getElementById(
                "profileName"
            );


        if (profileName) {

            profileName.textContent =
                name;

        }


        if (roleTitle) {

            roleTitle.textContent =
                staff
                    ? "Waste Management Staff Dashboard"
                    : `Welcome, ${name}`;

        }


        if (roleSubtitle) {

            roleSubtitle.textContent =
                staff
                    ? "Monitor bins, complaints, pickups and citizen requests."
                    : "Access citizen waste services and track your requests.";

        }


        if (rolePill) {

            rolePill.textContent =
                staff
                    ? "STAFF"
                    : "CITIZEN";


            rolePill.className =
                staff
                    ? "role-pill staff-pill"
                    : "role-pill citizen-pill";

        }

    }


    /* =====================================================
       CITIZEN DUSTBIN REQUEST MODAL
    ===================================================== */

    window.openCitizenBinRequestModal =
        function () {

            if (isStaffUser()) {

                showToast(
                    "Staff should manage citizen requests from the Staff Dashboard."
                );

                return;
            }


            const modal =
                document.getElementById(
                    "citizenBinRequestModal"
                );


            if (!modal) {

                alert(
                    "Citizen dustbin request modal not found in waste.html"
                );

                return;
            }


            modal.classList.add(
                "active"
            );


            modal.style.display =
                "flex";
        };


    window.closeCitizenBinRequestModal =
        function () {

            const modal =
                document.getElementById(
                    "citizenBinRequestModal"
                );


            if (!modal) {
                return;
            }


            modal.classList.remove(
                "active"
            );


            modal.style.display =
                "none";
        };


    /* =====================================================
       GPS LOCATION
    ===================================================== */

    window.useCurrentLocationForBinRequest =
        function () {

            if (
                !navigator.geolocation
            ) {

                showToast(
                    "Geolocation is not supported by your browser."
                );

                return;
            }


            showToast(
                "📍 Getting your location..."
            );


            navigator.geolocation.getCurrentPosition(

                function (position) {

                    const lat =
                        document.getElementById(
                            "binReqLat"
                        );


                    const lng =
                        document.getElementById(
                            "binReqLng"
                        );


                    if (lat) {

                        lat.value =
                            position.coords.latitude
                                .toFixed(7);

                    }


                    if (lng) {

                        lng.value =
                            position.coords.longitude
                                .toFixed(7);

                    }


                    showToast(
                        "✅ Current location added."
                    );

                },


                function (error) {

                    console.error(
                        "GPS error:",
                        error
                    );


                    showToast(
                        "❌ Unable to get location. Please allow GPS permission."
                    );

                },


                {
                    enableHighAccuracy:
                        true,

                    timeout:
                        10000,

                    maximumAge:
                        0
                }

            );

        };


    /* =====================================================
       LOCAL STORAGE SAVE
    ===================================================== */

    function saveLocal(
        request
    ) {

        citizenBinRequests.unshift(
            request
        );


        localStorage.setItem(
            "wasteBinRequests",
            JSON.stringify(
                citizenBinRequests
            )
        );

    }


    /* =====================================================
       SUBMIT NEW DUSTBIN REQUEST
    ===================================================== */

    window.submitCitizenBinRequest =
        async function () {

            if (isStaffUser()) {

                showToast(
                    "Staff cannot submit citizen dustbin requests."
                );

                return;
            }


            const reason =
                document.getElementById(
                    "binReqReason"
                )?.value.trim();


            const wasteType =
                document.getElementById(
                    "binReqWasteType"
                )?.value;


            const location =
                document.getElementById(
                    "binReqLocation"
                )?.value.trim();


            const latitude =
                parseFloat(
                    document.getElementById(
                        "binReqLat"
                    )?.value
                );


            const longitude =
                parseFloat(
                    document.getElementById(
                        "binReqLng"
                    )?.value
                );


            const description =
                document.getElementById(
                    "binReqDescription"
                )?.value.trim();


            if (
                !reason ||
                !wasteType ||
                !location ||
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {

                showToast(
                    "⚠️ Please fill all required fields and valid coordinates."
                );

                return;
            }


            const user =
                currentUser();


            const request = {

                requestCode:
                    `DBR-${Date.now()}`,

                userId:
                    userId(),

                citizenName:
                    user?.name ||
                    user?.fullName ||
                    "Citizen",

                reason:
                    reason,

                wasteType:
                    wasteType,

                location:
                    location,

                latitude:
                    latitude,

                longitude:
                    longitude,

                description:
                    description,

                status:
                    "Submitted",

                createdAt:
                    new Date().toISOString()

            };


            try {

                const response =
                    await fetch(
                        BIN_REQUEST_API,
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    request
                                )
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    data.success === false
                ) {

                    throw new Error(
                        data.message ||
                        "Request failed."
                    );

                }


                if (data.request) {

                    request.id =
                        data.request.id ||
                        data.id ||
                        request.requestCode;


                    request.requestCode =
                        data.request.requestCode ||
                        data.request.request_code ||
                        request.requestCode;


                    request.status =
                        data.request.status ||
                        "Submitted";

                }

            }

            catch (error) {

                console.warn(
                    "Dustbin API unavailable:",
                    error.message
                );

            }


            saveLocal(
                request
            );


            window.closeCitizenBinRequestModal();


            [
                "binReqReason",
                "binReqLocation",
                "binReqLat",
                "binReqLng",
                "binReqDescription"
            ]
                .forEach(
                    id => {

                        const element =
                            document.getElementById(
                                id
                            );


                        if (element) {
                            element.value = "";
                        }

                    }
                );


            await loadCitizenBinRequests(
                false
            );


            showToast(
                "✅ Dustbin request submitted successfully."
            );

        };


    /* =====================================================
       STATUS CLASS
    ===================================================== */

    function statusClass(
        status
    ) {

        return String(
            status || ""
        )
            .toLowerCase()
            .replace(
                /[^a-z0-9]+/g,
                "-"
            );

    }


    /* =====================================================
       REQUEST CARD
    ===================================================== */

    function requestCard(
        request,
        staff
    ) {

        const status =
            request.status ||
            "Submitted";


        const code =
            request.requestCode ||
            request.request_code ||
            "DBR";


        const citizen =
            request.citizenName ||
            request.citizen_name ||
            "Citizen";


        const wasteType =
            request.wasteType ||
            request.waste_type ||
            "-";


        const latitude =
            Number(
                request.latitude
            );


        const longitude =
            Number(
                request.longitude
            );


        const coordinates =
            Number.isFinite(latitude) &&
            Number.isFinite(longitude)
                ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
                : "-";


        const createdAt =
            request.createdAt ||
            request.created_at;


        const dateText =
            createdAt
                ? new Date(
                    createdAt
                  ).toLocaleString(
                    "en-IN"
                  )
                : "";


        return `

            <article class="request-card">

                <div class="request-card-head">

                    <div>

                        <strong>
                            ${escapeHTML(code)}
                        </strong>

                        <span>
                            ${escapeHTML(citizen)}
                        </span>

                    </div>


                    <span class="
                        request-status
                        ${statusClass(status)}
                    ">

                        ${escapeHTML(status)}

                    </span>

                </div>


                <div class="request-grid">

                    <div>

                        <small>
                            Reason
                        </small>

                        <p>
                            ${escapeHTML(
                                request.reason ||
                                "-"
                            )}
                        </p>

                    </div>


                    <div>

                        <small>
                            Waste Type
                        </small>

                        <p>
                            ${escapeHTML(
                                wasteType
                            )}
                        </p>

                    </div>


                    <div>

                        <small>
                            Location
                        </small>

                        <p>
                            📍
                            ${escapeHTML(
                                request.location ||
                                "-"
                            )}
                        </p>

                    </div>


                    <div>

                        <small>
                            Coordinates
                        </small>

                        <p>
                            ${escapeHTML(
                                coordinates
                            )}
                        </p>

                    </div>

                </div>


                ${
                    request.description
                        ? `
                            <p class="request-description">
                                ${escapeHTML(
                                    request.description
                                )}
                            </p>
                        `
                        : ""
                }


                <div class="request-card-foot">

                    <small>
                        ${escapeHTML(
                            dateText
                        )}
                    </small>


                    ${
                        staff
                            ? `
                                <div class="staff-request-buttons">

                                    <button
                                        class="small-btn"
                                        onclick="
                                            updateCitizenBinRequestStatus(
                                                '${escapeHTML(code)}',
                                                'Under Review'
                                            )
                                        ">
                                        Review
                                    </button>


                                    <button
                                        class="small-btn"
                                        onclick="
                                            updateCitizenBinRequestStatus(
                                                '${escapeHTML(code)}',
                                                'Approved'
                                            )
                                        ">
                                        Approve
                                    </button>


                                    <button
                                        class="small-btn"
                                        onclick="
                                            updateCitizenBinRequestStatus(
                                                '${escapeHTML(code)}',
                                                'Installation Scheduled'
                                            )
                                        ">
                                        Schedule
                                    </button>


                                    <button
                                        class="small-btn"
                                        onclick="
                                            updateCitizenBinRequestStatus(
                                                '${escapeHTML(code)}',
                                                'Installed'
                                            )
                                        ">
                                        Installed
                                    </button>


                                    <button
                                        class="small-btn danger"
                                        onclick="
                                            updateCitizenBinRequestStatus(
                                                '${escapeHTML(code)}',
                                                'Rejected'
                                            )
                                        ">
                                        Reject
                                    </button>

                                </div>
                            `
                            : ""
                    }

                </div>

            </article>

        `;

    }


    /* =====================================================
       CITIZEN REQUEST LIST
    ===================================================== */

    function renderCitizenBinRequests(
        list
    ) {

        const box =
            document.getElementById(
                "citizenBinRequestList"
            );


        if (!box) {
            return;
        }


        if (!list.length) {

            box.innerHTML = `

                <div class="empty-state">

                    No dustbin requests yet.

                    <br>

                    Request a new smart dustbin
                    for your area.

                </div>

            `;

        }

        else {

            box.innerHTML =
                list
                    .map(
                        request =>
                            requestCard(
                                request,
                                false
                            )
                    )
                    .join("");

        }


        const count =
            document.getElementById(
                "citizenBinRequestCount"
            );


        if (count) {

            count.textContent =
                list.length;

        }

    }


    /* =====================================================
       STAFF REQUEST LIST
    ===================================================== */

    function renderStaffBinRequests(
        list
    ) {

        const box =
            document.getElementById(
                "staffBinRequestList"
            );


        if (!box) {
            return;
        }


        if (!list.length) {

            box.innerHTML = `

                <div class="empty-state">

                    No citizen dustbin requests found.

                </div>

            `;

        }

        else {

            box.innerHTML =
                list
                    .map(
                        request =>
                            requestCard(
                                request,
                                true
                            )
                    )
                    .join("");

        }

    }


    /* =====================================================
       LOAD REQUESTS
    ===================================================== */

    window.loadCitizenBinRequests =
        async function (
            staff = isStaffUser()
        ) {

            let list = [];


            try {

                const url =
                    staff
                        ? BIN_REQUEST_API
                        : `${BIN_REQUEST_API}?userId=${encodeURIComponent(
                            userId() || ""
                        )}`;


                const response =
                    await fetch(
                        url
                    );


                if (!response.ok) {

                    throw new Error(
                        "API request failed."
                    );

                }


                const data =
                    await response.json();


                list =
                    Array.isArray(
                        data.requests
                    )
                        ? data.requests
                        : [];


                citizenBinRequests =
                    list;


                localStorage.setItem(
                    "wasteBinRequests",
                    JSON.stringify(
                        list
                    )
                );

            }

            catch (error) {

                console.warn(
                    "Using local dustbin requests:",
                    error.message
                );


                list =
                    [
                        ...citizenBinRequests
                    ];


                if (
                    !staff &&
                    userId() !== null
                ) {

                    list =
                        list.filter(
                            request =>
                                String(
                                    request.userId ??
                                    request.user_id ??
                                    ""
                                ) ===
                                String(
                                    userId()
                                )
                        );

                }

            }


            if (staff) {

                renderStaffBinRequests(
                    list
                );

            }

            else {

                renderCitizenBinRequests(
                    list
                );

            }

        };


    /* =====================================================
       UPDATE STATUS
    ===================================================== */

    window.updateCitizenBinRequestStatus =
        async function (
            code,
            newStatus
        ) {

            if (!isStaffUser()) {

                showToast(
                    "❌ Only Waste Staff can change request status."
                );

                return;
            }


            if (!code || !newStatus) {

                return;
            }


            try {

                const response =
                    await fetch(
                        `${BIN_REQUEST_API}/${encodeURIComponent(
                            code
                        )}/status`,
                        {
                            method:
                                "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    status:
                                        newStatus
                                })
                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        "Status update failed."
                    );

                }

            }

            catch (error) {

                console.warn(
                    "Status API unavailable:",
                    error.message
                );

            }


            citizenBinRequests =
                citizenBinRequests.map(
                    request => {

                        const requestCode =
                            request.requestCode ||
                            request.request_code;


                        if (
                            String(
                                requestCode
                            ) ===
                            String(
                                code
                            )
                        ) {

                            return {
                                ...request,
                                status:
                                    newStatus
                            };

                        }


                        return request;

                    }
                );


            localStorage.setItem(
                "wasteBinRequests",
                JSON.stringify(
                    citizenBinRequests
                )
            );


            await loadCitizenBinRequests(
                true
            );


            showToast(
                `✅ Request ${code} → ${newStatus}`
            );

        };


    /* =====================================================
       CITIZEN DASHBOARD DATA
    ===================================================== */

    function updateCitizenDashboard() {

        if (
            isStaffUser()
        ) {
            return;
        }


        const uid =
            userId();


        const storedReports =
            JSON.parse(
                localStorage.getItem(
                    "smartReports"
                ) || "[]"
            );


        const storedPickups =
            JSON.parse(
                localStorage.getItem(
                    "smartPickups"
                ) || "[]"
            );


        const myReports =
            uid === null
                ? storedReports
                : storedReports.filter(
                    report =>
                        String(
                            report.userId ??
                            report.user_id ??
                            ""
                        ) ===
                        String(
                            uid
                        )
                );


        const myPickups =
            uid === null
                ? storedPickups
                : storedPickups.filter(
                    pickup =>
                        String(
                            pickup.userId ??
                            pickup.user_id ??
                            ""
                        ) ===
                        String(
                            uid
                        )
                );


        const myRequests =
            citizenBinRequests.filter(
                request =>
                    uid === null ||
                    String(
                        request.userId ??
                        request.user_id ??
                        ""
                    ) ===
                    String(
                        uid
                    )
            );


        const reportCount =
            document.getElementById(
                "citizenReportCount"
            );


        const pickupCount =
            document.getElementById(
                "citizenPickupCount"
            );


        const requestCount =
            document.getElementById(
                "citizenBinRequestCount"
            );


        if (reportCount) {

            reportCount.textContent =
                myReports.length;

        }


        if (pickupCount) {

            pickupCount.textContent =
                myPickups.length;

        }


        if (requestCount) {

            requestCount.textContent =
                myRequests.length;

        }


        const scoreElement =
            document.getElementById(
                "citizenScore"
            );


        if (scoreElement) {

            scoreElement.textContent =
                score;

        }


        /* ===============================
           NEARBY BINS
        =============================== */

        const nearby =
            document.getElementById(
                "citizenNearbyBins"
            );


        if (nearby) {

            if (!bins.length) {

                nearby.innerHTML = `

                    <div class="empty-state">

                        No smart bin data available.

                    </div>

                `;

            }

            else {

                nearby.innerHTML =
                    bins
                        .slice(
                            0,
                            6
                        )
                        .map(
                            bin => {

                                const status =
                                    getStatus(
                                        bin.fill
                                    );


                                return `

                                    <div class="mini-item">

                                        <strong>

                                            🗑️
                                            ${escapeHTML(
                                                bin.name ||
                                                "Smart Bin"
                                            )}

                                        </strong>

                                        <span>

                                            📍
                                            ${escapeHTML(
                                                bin.location ||
                                                "City"
                                            )}

                                        </span>

                                        <b>

                                            ${escapeHTML(
                                                status
                                            )}

                                        </b>

                                    </div>

                                `;

                            }
                        )
                        .join("");

            }

        }


        /* ===============================
           COLLECTION SCHEDULE
        =============================== */

        const collection =
            document.getElementById(
                "citizenCollectionList"
            );


        if (collection) {

            if (!myPickups.length) {

                collection.innerHTML = `

                    <div class="empty-state">

                        No collection requests yet.

                    </div>

                `;

            }

            else {

                collection.innerHTML =
                    myPickups
                        .slice(
                            0,
                            6
                        )
                        .map(
                            pickup => `

                                <div class="mini-item">

                                    <strong>

                                        🚛
                                        ${escapeHTML(
                                            pickup.date ||
                                            "Scheduled"
                                        )}

                                    </strong>

                                    <span>

                                        📍
                                        ${escapeHTML(
                                            pickup.location ||
                                            "Pickup location"
                                        )}

                                    </span>

                                    <b>

                                        ${escapeHTML(
                                            pickup.status ||
                                            "Requested"
                                        )}

                                    </b>

                                </div>

                            `
                        )
                        .join("");

            }

        }

    }


    /* =====================================================
       STAFF BIN ACCESS PROTECTION
    ===================================================== */

    const originalOpenBin =
        window.openBinModal;


    window.openBinModal =
        function () {

            if (!isStaffUser()) {

                showToast(
                    "❌ Only Waste Staff can add or manage waste bins."
                );

                return;
            }


            if (
                typeof originalOpenBin ===
                "function"
            ) {

                return originalOpenBin.apply(
                    this,
                    arguments
                );

            }

        };


    /* =====================================================
       STAFF EDIT PROTECTION
    ===================================================== */

    const originalEditBin =
        window.editBin;


    window.editBin =
        function (
            id
        ) {

            if (!isStaffUser()) {

                showToast(
                    "❌ Only Waste Staff can edit waste bins."
                );

                return;
            }


            if (
                typeof originalEditBin ===
                "function"
            ) {

                return originalEditBin.apply(
                    this,
                    arguments
                );

            }

        };


    /* =====================================================
       STAFF DELETE PROTECTION
    ===================================================== */

    const originalDeleteBin =
        window.deleteBin;


    window.deleteBin =
        function (
            id
        ) {

            if (!isStaffUser()) {

                showToast(
                    "❌ Only Waste Staff can delete waste bins."
                );

                return;
            }


            if (
                typeof originalDeleteBin ===
                "function"
            ) {

                return originalDeleteBin.apply(
                    this,
                    arguments
                );

            }

        };


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initWasteRoleSystem() {

        setRoleUI();

        updateCitizenDashboard();

        loadCitizenBinRequests(
            isStaffUser()
        );


        setInterval(
            function () {

                if (
                    isStaffUser()
                ) {

                    loadCitizenBinRequests(
                        true
                    );

                }

            },
            30000
        );

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initWasteRoleSystem
        );

    }

    else {

        initWasteRoleSystem();

    }

})();