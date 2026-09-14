/* =====================================================
   RAMGARH TAL - SMARTCITY AI
===================================================== */


/* ================= LOCATION ================= */

const placeLocation = {
    name: "Ramgarh Tal",
    city: "Gorakhpur",
    lat: 26.7428,
    lng: 83.4197
};


/* ================= MAP ================= */

let placeMap;


/* ================= PAGE LOAD ================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializePlaceMap();

        updateLiveTime();

    }
);


/* =====================================================
   MAP INITIALIZATION
===================================================== */

function initializePlaceMap() {

    placeMap = L.map("placeMap").setView(
        [
            placeLocation.lat,
            placeLocation.lng
        ],
        14
    );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,

            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(placeMap);


    /* Main location marker */

    const placeIcon = L.divIcon({

        className: "place-marker",

        html: `
            <div style="
                width:42px;
                height:42px;
                border-radius:50%;
                background:#0284c7;
                border:4px solid white;
                box-shadow:0 4px 15px rgba(0,0,0,.3);
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:21px;
            ">
                📍
            </div>
        `,

        iconSize: [42, 42],

        iconAnchor: [21, 21]

    });


    const marker = L.marker(
        [
            placeLocation.lat,
            placeLocation.lng
        ],
        {
            icon: placeIcon
        }
    )
    .addTo(placeMap);


    marker.bindPopup(`
        
        <div style="
            min-width:190px;
            font-family:Arial;
        ">

            <h3>
                🌊 Ramgarh Tal
            </h3>

            <p style="
                margin-top:6px;
                color:#64748b;
            ">
                📍 Gorakhpur, Uttar Pradesh
            </p>

            <button
                onclick="getDirections()"
                style="
                    margin-top:10px;
                    border:0;
                    background:#0284c7;
                    color:white;
                    padding:8px 12px;
                    border-radius:7px;
                    cursor:pointer;
                "
            >
                🧭 Get Directions
            </button>

        </div>

    `);


    marker.openPopup();


    /* Nearby points */

    addNearbyMarker(
        26.7412,
        83.4230,
        "🅿️ Parking",
        "Ramgarh Tal Parking"
    );


    addNearbyMarker(
        26.7460,
        83.4170,
        "🏥 Hospital",
        "Nearby Hospital"
    );


    addNearbyMarker(
        26.7440,
        83.4140,
        "🍴 Restaurant",
        "Nearby Restaurant"
    );

}


/* =====================================================
   NEARBY MAP MARKER
===================================================== */

function addNearbyMarker(
    lat,
    lng,
    icon,
    title
) {

    const nearbyIcon = L.divIcon({

        className: "nearby-marker",

        html: `
            <div style="
                width:32px;
                height:32px;
                border-radius:50%;
                background:white;
                border:2px solid #0284c7;
                box-shadow:0 3px 10px rgba(0,0,0,.2);
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:15px;
            ">
                ${icon}
            </div>
        `,

        iconSize: [32, 32],

        iconAnchor: [16, 16]

    });


    L.marker(
        [lat, lng],
        {
            icon: nearbyIcon
        }
    )
    .addTo(placeMap)
    .bindPopup(`
        <strong>${title}</strong>
    `);

}


/* =====================================================
   CENTER MAP
===================================================== */

function centerMap() {

    placeMap.flyTo(
        [
            placeLocation.lat,
            placeLocation.lng
        ],
        15,
        {
            duration: 1.2
        }
    );


    showToast(
        "📍 Centered on Ramgarh Tal"
    );

}


/* =====================================================
   DIRECTIONS
===================================================== */

function getDirections() {

    const destination =
        `${placeLocation.lat},${placeLocation.lng}`;


    const url =
        `https://www.google.com/maps/dir/?api=1&destination=${destination}`;


    window.open(
        url,
        "_blank"
    );

}


/* =====================================================
   PLAN VISIT
===================================================== */

function planVisit() {

    const message = `

🌊 RAMGARH TAL - VISIT PLAN

📍 Location:
Gorakhpur, Uttar Pradesh

🚦 Traffic:
Low

🅿️ Parking:
Available

👥 Crowd:
Low

🌦️ Weather:
31°C - Partly Cloudy

⭐ Rating:
4.5/5

Recommended:
Visit during evening hours.

    `;


    alert(message);

}


/* =====================================================
   PLACE INFORMATION
===================================================== */

function showPlaceInfo() {

    const message = `

🌊 RAMGARH TAL

Ramgarh Tal is a popular destination
in Gorakhpur.

📍 City:
Gorakhpur

⭐ Rating:
4.5 / 5

👥 Current Crowd:
Low

🚦 Traffic:
Low

🅿️ Parking:
Available

🌦️ Weather:
31°C

SmartCity AI provides nearby
services, navigation and city
information.

    `;


    alert(message);

}


/* =====================================================
   NEARBY SERVICES
===================================================== */

function findNearby(type) {

    const serviceNames = {

        hospital:
            "🏥 Hospitals",

        police:
            "🚔 Police Stations",

        restaurant:
            "🍴 Restaurants",

        atm:
            "🏧 ATMs",

        parking:
            "🅿️ Parking Areas",

        washroom:
            "🚻 Public Washrooms"

    };


    const name =
        serviceNames[type] ||
        "Nearby Services";


    showToast(
        `🔎 Searching for ${name}...`
    );


    /*
       Future:
       Yahan Google Maps / OpenStreetMap
       / Places API integrate kar sakte ho.
    */


    setTimeout(
        function () {

            const url =
                `https://www.google.com/maps/search/${encodeURIComponent(
                    name + " near Ramgarh Tal Gorakhpur"
                )}`;


            window.open(
                url,
                "_blank"
            );

        },
        700
    );

}


/* =====================================================
   TRAFFIC
===================================================== */

function openTraffic() {

    showToast(
        "🚦 Opening traffic information..."
    );


    setTimeout(
        function () {

            const url =
                "https://www.google.com/maps/search/Ramgarh+Tal+Gorakhpur";


            window.open(
                url,
                "_blank"
            );

        },
        700
    );

}


/* =====================================================
   PARKING NAVIGATION
===================================================== */

function navigateParking() {

    const url =
        "https://www.google.com/maps/search/Parking+near+Ramgarh+Tal+Gorakhpur";


    window.open(
        url,
        "_blank"
    );

}


/* =====================================================
   EMERGENCY
===================================================== */

function callEmergency(number) {

    const confirmCall =
        confirm(
            `Call Emergency ${number}?`
        );


    if (!confirmCall) return;


    window.location.href =
        `tel:${number}`;

}


/* =====================================================
   REVIEW
===================================================== */

function writeReview() {

    const review =
        prompt(
            "Write your review for Ramgarh Tal:"
        );


    if (!review) return;


    const rating =
        prompt(
            "Give rating from 1 to 5:"
        );


    if (!rating) return;


    showToast(
        `⭐ Your ${rating}/5 review was added`
    );

}


/* =====================================================
   AI ASSISTANT
===================================================== */

function openAI() {

    /*
       Agar tumhari main SmartCity AI file
       index.html hai to yahan change karna.
    */

    window.location.href =
        "index.html";

}


/* =====================================================
   BACK TO MAIN APP
===================================================== */

function goToMainApp() {

    /*
       Main SmartCity AI dashboard ka naam
       agar index.html hai to ye directly
       main page par le jayega.
    */

    window.location.href =
        "index.html";

}


/* =====================================================
   LIVE TIME
===================================================== */

function updateLiveTime() {

    const liveElement =
        document.querySelector(".live");


    if (!liveElement) return;


    setInterval(
        function () {

            const now =
                new Date();


            liveElement.title =
                "Last updated: " +
                now.toLocaleTimeString();

        },
        1000
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


    if (!toast) return;


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

function goToMainApp() {
    window.location.href = "../../index.html";
}