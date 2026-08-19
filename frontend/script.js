/* =========================================================
   SMARTCITY AI - COMPLETE FRONTEND SCRIPT
   Gorakhpur, Uttar Pradesh

   Features:
   - Leaflet Map
   - Real User Location
   - OpenStreetMap Places
   - Search
   - Navigation / Routing
   - Demo Traffic
   - Smart Waste / Water / Emergency Data
   - Healthcare / Patient System
   - QR Patient ID
   - Doctor Booking
   - Citizen Register / Login
   - Staff Login / Permissions
   - Backend Connection
   - City Status API
========================================================= */


/* =========================================================
   BACKEND
========================================================= */

const BACKEND_URL = "http://localhost:5000";


/* =========================================================
   MAP VARIABLES
========================================================= */

let map = null;

let userLocation = null;

let userMarker = null;

let accuracyCircle = null;

let routingControl = null;

let allMarkers = [];

let trafficLayers = [];

let currentPlaces = [];

let searchMarker = null;


/* =========================================================
   GORAKHPUR FALLBACK
========================================================= */

const GORAKHPUR = {
    lat: 26.7606,
    lng: 83.3732
};


/* =========================================================
   ICONS
========================================================= */

const ICONS = {

    waste: "🗑️",

    hospital: "🏥",

    parking: "🅿️",

    emergency: "🚨",

    police: "👮",

    fire: "🚒",

    water: "💧",

    places: "⭐",

    pharmacy: "💊",

    fuel: "⛽",

    bus: "🚌",

    restaurant: "🍴",

    school: "🏫",

    traffic: "🚦",

    all: "📍"

};


/* =========================================================
   DEMO SMART CITY DATA
========================================================= */

const DEMO_DATA = [

    {
        type: "waste",
        name: "Demo Smart Dustbin - Golghar",
        lat: 26.7619,
        lng: 83.3668,
        status: "Attention",
        value: "78% Full"
    },

    {
        type: "waste",
        name: "Demo Smart Dustbin - Railway Area",
        lat: 26.7582,
        lng: 83.3739,
        status: "Normal",
        value: "38% Full"
    },

    {
        type: "waste",
        name: "Demo Smart Dustbin - University Area",
        lat: 26.7294,
        lng: 83.3818,
        status: "Critical",
        value: "94% Full"
    },

    {
        type: "water",
        name: "Demo Water Monitoring Point",
        lat: 26.7446,
        lng: 83.3894,
        status: "Normal",
        value: "Water Supply 91%"
    },

    {
        type: "water",
        name: "Demo Water Sensor - City Zone",
        lat: 26.7702,
        lng: 83.3597,
        status: "Attention",
        value: "Pressure 68%"
    },

    {
        type: "emergency",
        name: "Demo Police Response Point",
        lat: 26.7665,
        lng: 83.3795,
        status: "Available",
        value: "Emergency Response"
    },

    {
        type: "emergency",
        name: "Demo Fire Response Point",
        lat: 26.7487,
        lng: 83.3640,
        status: "Available",
        value: "24/7 Response"
    },

    {
        type: "hospital",
        name: "Demo City Hospital",
        lat: 26.7558,
        lng: 83.3825,
        status: "Open",
        value: "24/7 Emergency"
    },

    {
        type: "hospital",
        name: "Demo District Medical Centre",
        lat: 26.7730,
        lng: 83.3705,
        status: "Open",
        value: "Emergency Available"
    },

    {
        type: "parking",
        name: "Demo Smart Parking - Golghar",
        lat: 26.7641,
        lng: 83.3688,
        status: "Available",
        value: "42 Slots"
    },

    {
        type: "parking",
        name: "Demo Smart Parking - Railway",
        lat: 26.7598,
        lng: 83.3721,
        status: "Limited",
        value: "8 Slots"
    },

    {
        type: "places",
        name: "Demo Famous City Point",
        lat: 26.7685,
        lng: 83.3615,
        status: "Open",
        value: "Popular Destination"
    }

];


/* =========================================================
   PAGE LOAD
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeMap();

    initializePatientForm();

    initializeAIButton();

    checkBackend();

    loadCityStatus();

    setTimeout(() => {

        checkExistingLogin();

    }, 15000);

});


/* =========================================================
   INITIALIZE MAP
========================================================= */

function initializeMap() {

    const mapElement =
        document.getElementById("cityMap");


    if (!mapElement) {

        console.warn(
            "#cityMap not found. Map skipped."
        );

        return;

    }


    if (typeof L === "undefined") {

        console.error(
            "Leaflet is not loaded."
        );

        return;

    }


    map = L.map("cityMap").setView(

        [
            GORAKHPUR.lat,
            GORAKHPUR.lng
        ],

        13

    );


    L.tileLayer(

        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

        {

            maxZoom: 19,

            attribution:
                "&copy; OpenStreetMap contributors"

        }

    ).addTo(map);


    showFeature("all");

}


/* =========================================================
   BACKEND CONNECTION
========================================================= */

async function checkBackend() {

    try {

        const response =
            await fetch(
                `${BACKEND_URL}/`
            );


        if (!response.ok) {

            throw new Error(
                "Backend response failed"
            );

        }


        const data =
            await response.json();


        console.log(
            "✅ Backend Connected"
        );

        console.log(
            "Server:",
            data.message
        );


    }

    catch (error) {

        console.error(
            "❌ Backend Connection Failed:",
            error
        );

    }

}


/* =========================================================
   CITY STATUS FROM BACKEND
========================================================= */

async function loadCityStatus() {

    try {

        const response =
            await fetch(
                `${BACKEND_URL}/api/city-status`
            );


        if (!response.ok) {

            throw new Error(
                "City status API failed"
            );

        }


        const data =
            await response.json();


        console.log(
            "✅ City Status:",
            data
        );


        const trafficValue =
            document.getElementById(
                "trafficValue"
            );


        if (trafficValue) {

            trafficValue.textContent =
                data.traffic === "Moderate"
                    ? "75%"
                    : data.traffic;

        }


        const aqiValue =
            document.getElementById(
                "aqiValue"
            );


        if (aqiValue) {

            aqiValue.textContent =
                `${data.aqi} AQI`;

        }


        const aqiStatus =
            document.getElementById(
                "aqiStatus"
            );


        if (aqiStatus) {

            aqiStatus.textContent =
                data.aqi <= 50
                    ? "Good"
                    : data.aqi <= 100
                        ? "Moderate"
                        : "Poor";

        }


        const ambulanceValue =
            document.getElementById(
                "ambulanceValue"
            );


        if (ambulanceValue) {

            ambulanceValue.textContent =
                data.ambulances;

        }


        const temperatureValue =
            document.getElementById(
                "temperatureValue"
            );


        if (temperatureValue) {

            temperatureValue.textContent =
                `${data.temperature}°C`;

        }


        const hospitalValue =
            document.getElementById(
                "hospitalValue"
            );


        if (hospitalValue) {

            hospitalValue.textContent =
                data.hospitals;

        }

    }

    catch (error) {

        console.error(
            "❌ City Status Error:",
            error
        );

    }

}


/* =========================================================
   USER LOCATION
========================================================= */

function getMyLocation() {

    if (!navigator.geolocation) {

        alert(
            "Your browser does not support GPS location."
        );

        return;

    }


    navigator.geolocation.getCurrentPosition(

        async (position) => {

            userLocation = {

                lat:
                    position.coords.latitude,

                lng:
                    position.coords.longitude,

                accuracy:
                    position.coords.accuracy

            };


            drawUserLocation();


            if (map) {

                map.setView(

                    [
                        userLocation.lat,
                        userLocation.lng
                    ],

                    15

                );

            }


            await loadRealPlaces(

                userLocation.lat,

                userLocation.lng

            );


            showFeature("all");

        },


        (error) => {

            console.error(
                "GPS ERROR:",
                error
            );


            if (error.code === 1) {

                alert(
                    "Location permission denied. Please allow location access."
                );

            }

            else if (error.code === 2) {

                alert(
                    "Your location could not be found."
                );

            }

            else {

                alert(
                    "Location request timed out."
                );

            }


            userLocation = {

                lat:
                    GORAKHPUR.lat,

                lng:
                    GORAKHPUR.lng,

                fallback:
                    true

            };


            if (map) {

                map.setView(

                    [
                        GORAKHPUR.lat,
                        GORAKHPUR.lng
                    ],

                    13

                );

            }

        },

        {

            enableHighAccuracy: true,

            timeout: 20000,

            maximumAge: 0

        }

    );

}


/* =========================================================
   DRAW USER LOCATION
========================================================= */

function drawUserLocation() {

    if (!map || !userLocation) return;


    if (userMarker) {

        map.removeLayer(
            userMarker
        );

    }


    if (accuracyCircle) {

        map.removeLayer(
            accuracyCircle
        );

    }


    userMarker =
        L.circleMarker(

            [
                userLocation.lat,
                userLocation.lng
            ],

            {

                radius: 9,

                color: "#ffffff",

                weight: 3,

                fillColor: "#2563eb",

                fillOpacity: 1

            }

        ).addTo(map);


    userMarker.bindPopup(
        "<b>📍 You are here</b>"
    );


    if (userLocation.accuracy) {

        accuracyCircle =
            L.circle(

                [
                    userLocation.lat,
                    userLocation.lng
                ],

                {

                    radius:
                        userLocation.accuracy,

                    color:
                        "#2563eb",

                    weight: 1,

                    fillColor:
                        "#2563eb",

                    fillOpacity:
                        0.08

                }

            ).addTo(map);

    }

}


/* =========================================================
   LOAD REAL OSM PLACES
========================================================= */

async function loadRealPlaces(lat, lng) {

    const radius = 10000;


    const query = `

        [out:json][timeout:45];

        (

            nwr["amenity"="hospital"]
            (around:${radius},${lat},${lng});

            nwr["amenity"="police"]
            (around:${radius},${lat},${lng});

            nwr["amenity"="fire_station"]
            (around:${radius},${lat},${lng});

            nwr["amenity"="parking"]
            (around:${radius},${lat},${lng});

            nwr["amenity"="pharmacy"]
            (around:${radius},${lat},${lng});

            nwr["amenity"="fuel"]
            (around:${radius},${lat},${lng});

            nwr["amenity"="restaurant"]
            (around:${radius},${lat},${lng});

            nwr["amenity"="school"]
            (around:${radius},${lat},${lng});

            nwr["highway"="bus_stop"]
            (around:${radius},${lat},${lng});

            nwr["tourism"]
            (around:${radius},${lat},${lng});

        );

        out center tags;

    `;


    const endpoints = [

        "https://overpass-api.de/api/interpreter",

        "https://overpass.kumi.systems/api/interpreter",

        "https://overpass.private.coffee/api/interpreter"

    ];


    for (const endpoint of endpoints) {

        try {

            const response =
                await fetch(

                    endpoint,

                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/x-www-form-urlencoded;charset=UTF-8"

                        },

                        body:
                            "data=" +
                            encodeURIComponent(query)

                    }

                );


            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );

            }


            const data =
                await response.json();


            currentPlaces =
                data.elements || [];


            console.log(
                "REAL PLACES:",
                currentPlaces.length
            );


            return;

        }

        catch (error) {

            console.warn(
                "Overpass failed:",
                endpoint,
                error
            );

        }

    }


    currentPlaces = [];

}


/* =========================================================
   SHOW MAP FEATURE
========================================================= */

async function showFeature(type, button) {

    if (!map) return;


    clearMarkers();

    clearTraffic();


    if (routingControl) {

        map.removeControl(
            routingControl
        );

        routingControl = null;

    }


    document
        .querySelectorAll(".map-filter")
        .forEach((btn) => {

            btn.classList.remove(
                "active"
            );

        });


    if (button) {

        button.classList.add(
            "active"
        );

    }


    const center =
        userLocation || GORAKHPUR;


    if (currentPlaces.length === 0) {

        await loadRealPlaces(

            center.lat,

            center.lng

        );

    }


    currentPlaces.forEach((place) => {

        const realType =
            detectRealType(
                place.tags || {}
            );


        if (

            type === "all" ||

            typeMatches(
                type,
                realType
            )

        ) {

            addRealMarker(place);

        }

    });


    DEMO_DATA.forEach((item) => {

        if (

            type === "all" ||

            type === item.type

        ) {

            addDemoMarker(item);

        }

    });


    if (

        type === "traffic" ||

        type === "all"

    ) {

        showDemoTraffic(

            center.lat,

            center.lng

        );

    }

}


/* =========================================================
   TYPE MATCH
========================================================= */

function typeMatches(selected, actual) {

    if (selected === actual) {

        return true;

    }


    if (

        selected === "emergency" &&

        (

            actual === "police" ||

            actual === "fire"

        )

    ) {

        return true;

    }


    return false;

}


/* =========================================================
   DETECT REAL PLACE TYPE
========================================================= */

function detectRealType(tags) {

    if (tags.amenity === "hospital")
        return "hospital";

    if (tags.amenity === "police")
        return "police";

    if (tags.amenity === "fire_station")
        return "fire";

    if (tags.amenity === "parking")
        return "parking";

    if (tags.amenity === "pharmacy")
        return "pharmacy";

    if (tags.amenity === "fuel")
        return "fuel";

    if (tags.highway === "bus_stop")
        return "bus";

    if (tags.amenity === "restaurant")
        return "restaurant";

    if (tags.amenity === "school")
        return "school";

    if (tags.tourism)
        return "places";

    return "places";

}


/* =========================================================
   ADD REAL MARKER
========================================================= */

function addRealMarker(place) {

    const coords =
        getPlaceCoordinates(place);


    if (!coords) return;


    const tags =
        place.tags || {};


    const type =
        detectRealType(tags);


    const name =
        tags.name ||
        tags["name:en"] ||
        defaultName(type);


    const marker =
        L.marker(

            [
                coords.lat,
                coords.lng
            ]

        ).addTo(map);


    marker.bindPopup(`

        <div class="map-popup">

            <h3>
                ${getIcon(type)}
                ${escapeHTML(name)}
            </h3>

            <p>
                <b>Type:</b>
                ${escapeHTML(type)}
            </p>

            ${
                tags.phone
                    ? `
                        <p>
                            📞
                            ${escapeHTML(tags.phone)}
                        </p>
                    `
                    : ""
            }

            ${
                tags.opening_hours
                    ? `
                        <p>
                            🕒
                            ${escapeHTML(
                                tags.opening_hours
                            )}
                        </p>
                    `
                    : ""
            }

            <button
                class="navigate-btn"
                onclick="
                    startNavigation(
                        ${coords.lat},
                        ${coords.lng},
                        '${escapeJS(name)}'
                    )
                "
            >
                🧭 Navigate Here
            </button>

        </div>

    `);


    marker.on("click", () => {

        showLocationInfo(

            name,

            type,

            coords.lat,

            coords.lng,

            false

        );

    });


    allMarkers.push(marker);

}


/* =========================================================
   ADD DEMO MARKER
========================================================= */

function addDemoMarker(item) {

    const marker =
        L.marker(

            [
                item.lat,
                item.lng
            ]

        ).addTo(map);


    marker.bindPopup(`

        <div class="map-popup">

            <div style="
                display:inline-block;
                padding:4px 8px;
                margin-bottom:8px;
                border-radius:6px;
                background:#fff7ed;
                color:#c2410c;
                font-size:11px;
                font-weight:700;
            ">
                DEMO / TEST DATA
            </div>

            <h3>
                ${getIcon(item.type)}
                ${escapeHTML(item.name)}
            </h3>

            <p>
                <b>Status:</b>
                ${escapeHTML(item.status)}
            </p>

            <p>
                <b>Information:</b>
                ${escapeHTML(item.value)}
            </p>

            <button
                class="navigate-btn"
                onclick="
                    startNavigation(
                        ${item.lat},
                        ${item.lng},
                        '${escapeJS(item.name)}'
                    )
                "
            >
                🧭 Navigate Here
            </button>

        </div>

    `);


    marker.on("click", () => {

        showLocationInfo(

            item.name,

            item.type,

            item.lat,

            item.lng,

            true

        );

    });


    allMarkers.push(marker);

}


/* =========================================================
   PLACE COORDINATES
========================================================= */

function getPlaceCoordinates(place) {

    if (

        typeof place.lat === "number" &&

        typeof place.lon === "number"

    ) {

        return {

            lat: place.lat,

            lng: place.lon

        };

    }


    if (

        place.center &&

        typeof place.center.lat === "number" &&

        typeof place.center.lon === "number"

    ) {

        return {

            lat: place.center.lat,

            lng: place.center.lon

        };

    }


    return null;

}


/* =========================================================
   LOCATION INFO
========================================================= */

function showLocationInfo(

    name,

    type,

    lat,

    lng,

    isDemo

) {

    const panel =
        document.getElementById(
            "navigationInfo"
        );


    if (!panel) return;


    panel.innerHTML = `

        <div class="navigation-icon">
            ${getIcon(type)}
        </div>

        <div>

            <h3>
                ${escapeHTML(name)}
            </h3>

            <p>
                ${
                    isDemo
                        ? "🧪 Demo/Test Location"
                        : "📍 Real mapped location"
                }
            </p>

            <button
                class="navigate-btn"
                onclick="
                    startNavigation(
                        ${lat},
                        ${lng},
                        '${escapeJS(name)}'
                    )
                "
            >
                🧭 Start Navigation
            </button>

        </div>

    `;

}


/* =========================================================
   START NAVIGATION
========================================================= */

function startNavigation(

    destinationLat,

    destinationLng,

    destinationName

) {

    if (
        !userLocation ||
        userLocation.fallback
    ) {

        if (!navigator.geolocation) {

            useGorakhpurForNavigation(

                destinationLat,
                destinationLng,
                destinationName

            );

            return;

        }


        navigator.geolocation.getCurrentPosition(

            (position) => {

                userLocation = {

                    lat:
                        position.coords.latitude,

                    lng:
                        position.coords.longitude,

                    accuracy:
                        position.coords.accuracy

                };


                drawUserLocation();


                createRoute(

                    destinationLat,
                    destinationLng,
                    destinationName

                );

            },

            () => {

                useGorakhpurForNavigation(

                    destinationLat,
                    destinationLng,
                    destinationName

                );

            },

            {

                enableHighAccuracy: true,

                timeout: 15000,

                maximumAge: 0

            }

        );


        return;

    }


    createRoute(

        destinationLat,

        destinationLng,

        destinationName

    );

}


/* =========================================================
   FALLBACK NAVIGATION
========================================================= */

function useGorakhpurForNavigation(

    destinationLat,

    destinationLng,

    destinationName

) {

    userLocation = {

        lat:
            GORAKHPUR.lat,

        lng:
            GORAKHPUR.lng,

        fallback:
            true

    };


    createRoute(

        destinationLat,

        destinationLng,

        destinationName

    );

}


/* =========================================================
   CREATE ROUTE
========================================================= */

function createRoute(

    destinationLat,

    destinationLng,

    destinationName

) {

    if (
        typeof L === "undefined" ||
        typeof L.Routing === "undefined"
    ) {

        alert(
            "Leaflet Routing Machine is not loaded."
        );

        return;

    }


    if (routingControl) {

        map.removeControl(
            routingControl
        );

        routingControl = null;

    }


    routingControl =
        L.Routing.control({

            waypoints: [

                L.latLng(

                    userLocation.lat,
                    userLocation.lng

                ),

                L.latLng(

                    destinationLat,
                    destinationLng

                )

            ],


            router:
                L.Routing.osrmv1({

                    serviceUrl:
                        "https://router.project-osrm.org/route/v1"

                }),


            routeWhileDragging:
                false,

            addWaypoints:
                false,

            draggableWaypoints:
                false,

            fitSelectedRoutes:
                true,

            showAlternatives:
                false,

            createMarker:
                () => null,

            lineOptions: {

                styles: [

                    {

                        color:
                            "#2563eb",

                        weight:
                            6,

                        opacity:
                            0.85

                    }

                ]

            },

            show:
                true,

            collapsible:
                true

        })


        .addTo(map);


    routingControl.on(

        "routesfound",

        (event) => {

            if (
                !event.routes ||
                !event.routes.length
            ) {

                return;

            }


            const route =
                event.routes[0];


            const distance =
                (
                    route.summary.totalDistance /
                    1000
                ).toFixed(2);


            const minutes =
                Math.max(

                    1,

                    Math.round(
                        route.summary.totalTime /
                        60
                    )

                );


            const panel =
                document.getElementById(
                    "navigationInfo"
                );


            if (panel) {

                panel.innerHTML = `

                    <div class="navigation-icon">
                        🧭
                    </div>

                    <div>

                        <h3>
                            Navigation
                        </h3>

                        <p>
                            <b>
                                ${escapeHTML(
                                    destinationName
                                )}
                            </b>
                        </p>

                        <p>
                            📏
                            <b>${distance} km</b>
                        </p>

                        <p>
                            ⏱️
                            <b>${minutes} min</b>
                        </p>

                        <p>
                            🚗 Route calculated
                        </p>

                    </div>

                `;

            }

        }

    );


    routingControl.on(

        "routingerror",

        (error) => {

            console.error(
                "Routing error:",
                error
            );


            alert(
                "Route could not be calculated. Try again."
            );

        }

    );

}


/* =========================================================
   DEMO TRAFFIC
========================================================= */

function showDemoTraffic(lat, lng) {

    const roads = [

        {

            name:
                "Demo Main Road",

            points: [

                [
                    lat + 0.008,
                    lng - 0.014
                ],

                [
                    lat + 0.004,
                    lng - 0.005
                ],

                [
                    lat,
                    lng + 0.005
                ],

                [
                    lat - 0.004,
                    lng + 0.014
                ]

            ],

            color:
                "#ef4444",

            status:
                "Heavy Traffic - DEMO"

        },


        {

            name:
                "Demo City Road",

            points: [

                [
                    lat - 0.010,
                    lng - 0.011
                ],

                [
                    lat - 0.004,
                    lng - 0.004
                ],

                [
                    lat + 0.002,
                    lng + 0.003
                ],

                [
                    lat + 0.009,
                    lng + 0.011
                ]

            ],

            color:
                "#f59e0b",

            status:
                "Moderate Traffic - DEMO"

        },


        {

            name:
                "Demo Outer Road",

            points: [

                [
                    lat - 0.013,
                    lng + 0.014
                ],

                [
                    lat - 0.005,
                    lng + 0.009
                ],

                [
                    lat + 0.004,
                    lng + 0.010
                ],

                [
                    lat + 0.013,
                    lng + 0.014
                ]

            ],

            color:
                "#10b981",

            status:
                "Normal Traffic - DEMO"

        }

    ];


    roads.forEach((road) => {

        const line =
            L.polyline(

                road.points,

                {

                    color:
                        road.color,

                    weight:
                        8,

                    opacity:
                        0.85

                }

            ).addTo(map);


        line.bindPopup(`

            <div class="map-popup">

                <h3>
                    🚦
                    ${escapeHTML(road.name)}
                </h3>

                <p>
                    ${escapeHTML(road.status)}
                </p>

                <small>
                    Demo traffic visualization.
                </small>

            </div>

        `);


        trafficLayers.push(line);

    });

}


/* =========================================================
   SEARCH LOCATION
========================================================= */

async function searchLocation() {

    const input =
        document.getElementById(
            "mapSearch"
        );


    if (!input) return;


    const query =
        input.value.trim();


    if (!query) {

        alert(
            "Enter a place or area."
        );

        return;

    }


    try {

        const url =
            "https://nominatim.openstreetmap.org/search?" +

            new URLSearchParams({

                q:
                    query + ", India",

                format:
                    "json",

                limit:
                    1

            });


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "Search failed"
            );

        }


        const data =
            await response.json();


        if (!data.length) {

            alert(
                "Location not found."
            );

            return;

        }


        const result =
            data[0];


        const lat =
            parseFloat(result.lat);


        const lng =
            parseFloat(result.lon);


        map.setView(

            [
                lat,
                lng
            ],

            15

        );


        if (searchMarker) {

            map.removeLayer(
                searchMarker
            );

        }


        searchMarker =
            L.marker(

                [
                    lat,
                    lng
                ]

            ).addTo(map);


        searchMarker
            .bindPopup(

                `
                    <b>
                        📍
                        ${escapeHTML(
                            result.display_name
                        )}
                    </b>
                `

            )
            .openPopup();


        userLocation = {

            lat,
            lng

        };


        await loadRealPlaces(
            lat,
            lng
        );


        showFeature("all");

    }

    catch (error) {

        console.error(
            error
        );


        alert(
            "Unable to search location."
        );

    }

}


/* =========================================================
   REFRESH MAP
========================================================= */

async function refreshMapData() {

    const center =
        userLocation ||
        GORAKHPUR;


    await loadRealPlaces(

        center.lat,
        center.lng

    );


    showFeature("all");

}


/* =========================================================
   CLEAR MARKERS
========================================================= */

function clearMarkers() {

    allMarkers.forEach((marker) => {

        if (
            map &&
            map.hasLayer(marker)
        ) {

            map.removeLayer(marker);

        }

    });


    allMarkers = [];

}


/* =========================================================
   CLEAR TRAFFIC
========================================================= */

function clearTraffic() {

    trafficLayers.forEach((layer) => {

        if (
            map &&
            map.hasLayer(layer)
        ) {

            map.removeLayer(layer);

        }

    });


    trafficLayers = [];

}


/* =========================================================
   ICON
========================================================= */

function getIcon(type) {

    return (
        ICONS[type] ||
        ICONS.all
    );

}


/* =========================================================
   DEFAULT NAME
========================================================= */

function defaultName(type) {

    const names = {

        hospital:
            "Hospital",

        police:
            "Police Station",

        fire:
            "Fire Station",

        parking:
            "Parking Area",

        pharmacy:
            "Pharmacy",

        fuel:
            "Fuel Station",

        bus:
            "Bus Stop",

        restaurant:
            "Restaurant",

        school:
            "School",

        places:
            "Tourist Place"

    };


    return (
        names[type] ||
        "City Location"
    );

}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================================
   JAVASCRIPT STRING ESCAPE
========================================================= */

function escapeJS(value) {

    return String(value)

        .replaceAll(
            "\\",
            "\\\\"
        )

        .replaceAll(
            "'",
            "\\'"
        )

        .replaceAll(
            "\n",
            " "
        );

}


/* =========================================================
   AI BUTTON
========================================================= */

function initializeAIButton() {

    const sendButton =
        document.getElementById(
            "sendButton"
        );


    if (!sendButton) return;


    sendButton.addEventListener(
        "click",
        () => {

            const input =
                document.getElementById(
                    "userInput"
                );


            if (!input) return;


            const text =
                input.value.trim();


            if (!text) return;


            alert(

                "Smart City AI received:\n\n" +
                text

            );


            input.value = "";

        }
    );

}


/* =========================================================
   PATIENT SYSTEM
========================================================= */

function generatePatientID() {

    const year =
        new Date().getFullYear();


    const random =
        Math.floor(
            100000 +
            Math.random() * 900000
        );


    return (
        "SC-" +
        year +
        "-" +
        random
    );

}


/* =========================================================
   PATIENT FORM INITIALIZATION
========================================================= */

/* =========================================================
   PATIENT FORM - BACKEND CONNECTION
========================================================= */

function initializePatientForm() {

    const form = document.getElementById("patientForm");

    if (!form) return;

    form.addEventListener("submit", async function (event) {

        event.preventDefault();

        // Get form values
        const name =
            document.getElementById("patientName")?.value.trim();

        const dob =
            document.getElementById("patientDOB")?.value || "";

        const gender =
            document.getElementById("patientGender")?.value || "";

        const mobile =
            document.getElementById("patientPhone")?.value.trim() || "";


        // Validation
        if (!name || !mobile) {

            alert("Please enter patient name and mobile number.");

            return;
        }


        // Generate Patient ID
        const patientId = generatePatientID();


        try {

            const response = await fetch(
                `${BACKEND_URL}/api/patients`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        patientId: patientId,

                        name: name,

                        age: dob
                            ? calculateAge(dob)
                            : null,

                        gender: gender || null,

                        mobile: mobile,

                        bloodGroup: null,

                        address: null

                    })
                }
            );


            const data = await response.json();


            // Backend error
            if (!response.ok) {

                alert(
                    data.message ||
                    "Patient registration failed."
                );

                return;
            }


            // SUCCESS
            console.log(
                "✅ Patient saved in database:",
                data
            );


            // Show Patient ID
            const generated =
                document.getElementById(
                    "generatedPatientId"
                );

            if (generated) {

                generated.textContent =
                    data.patient.patientId;

            }


            // Show result
            const result =
                document.getElementById(
                    "patientResult"
                );

            if (result) {

                result.style.display = "block";

            }


            // Generate QR
// Generate QR
const qrContainer =
    document.getElementById("patientQRCode");

if (
    qrContainer &&
    typeof QRCode !== "undefined"
) {

    qrContainer.innerHTML = "";

    const qrData = JSON.stringify({

        patientId:
            data.patient.patientId,

        name:
            data.patient.name,

        age:
            data.patient.age,

        gender:
            data.patient.gender,

        mobile:
            data.patient.mobile

    });

    new QRCode(
        qrContainer,
        {
            text: qrData,
            width: 180,
            height: 180
        }
    );

}


            alert(
                "✅ Patient registered successfully!\n\n" +
                "Patient ID: " +
                data.patient.patientId
            );


            // Clear form
            form.reset();


        } catch (error) {

            console.error(
                "❌ Patient Registration Error:",
                error
            );

            alert(
                "Backend connection failed. " +
                "Please make sure server is running."
            );

        }

    });

}


/* =========================================================
   CALCULATE AGE FROM DOB
========================================================= */

function calculateAge(dob) {

    const birthDate = new Date(dob);

    const today = new Date();

    let age =
        today.getFullYear() -
        birthDate.getFullYear();

    const month =
        today.getMonth() -
        birthDate.getMonth();

    if (
        month < 0 ||
        (
            month === 0 &&
            today.getDate() < birthDate.getDate()
        )
    ) {
        age--;
    }

    return age;
}

/* =========================================================
   HEALTHCARE MODALS
========================================================= */

function openPatientRegistration() {

    const modal =
        document.getElementById(
            "patientModal"
        );


    if (modal) {

        modal.classList.add("show");

    }

}


function openDoctorBooking() {

    const modal =
        document.getElementById(
            "doctorModal"
        );


    if (modal) {

        modal.classList.add("show");

    }

}


function openHospitalContacts() {

    const modal =
        document.getElementById(
            "hospitalModal"
        );


    if (modal) {

        modal.classList.add("show");

    }

}


function closeHealthModal(id) {

    const modal =
        document.getElementById(id);


    if (modal) {

        modal.classList.remove("show");

    }

}


/* =========================================================
   DOCTOR BOOKING
========================================================= */

/* =========================================================
   DOCTOR BOOKING - BACKEND CONNECTION
========================================================= */

async function bookDoctorSlot() {

    const doctor =
        document.getElementById(
            "doctorSelect"
        )?.value;


    const date =
        document.getElementById(
            "appointmentDate"
        )?.value;


    const time =
        document.getElementById(
            "appointmentTime"
        )?.value;


    const patientID =
        document.getElementById(
            "appointmentPatientId"
        )?.value.trim();


    const result =
        document.getElementById(
            "appointmentResult"
        );


    // =====================================================
    // VALIDATION
    // =====================================================

    if (
        !doctor ||
        !date ||
        !patientID
    ) {

        alert(
            "Please enter doctor, date and patient ID."
        );

        return;

    }


    if (!result) {

        console.error(
            "appointmentResult element not found."
        );

        return;

    }


    // =====================================================
    // LOADING
    // =====================================================

    result.innerHTML = `

        <div>

            <strong>
                ⏳ Booking Appointment...
            </strong>

            <p>
                Please wait.
            </p>

        </div>

    `;


    try {

        // =================================================
        // SEND DATA TO BACKEND
        // =================================================

        const response =
            await fetch(
                `${BACKEND_URL}/api/appointments`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            patientId:
                                patientID,

                            doctor:
                                doctor,

                            appointmentDate:
                                date,

                            appointmentTime:
                                time || null

                        })

                }

            );


        const data =
            await response.json();


        // =================================================
        // BACKEND ERROR
        // =================================================

        if (!response.ok) {

            result.innerHTML = `

                <div>

                    <strong>
                        ❌ Appointment Failed
                    </strong>

                    <p>
                        ${escapeHTML(
                            data.message ||
                            "Unable to book appointment."
                        )}
                    </p>

                </div>

            `;

            return;

        }


        // =================================================
        // SUCCESS
        // =================================================

        const appointment =
            data.appointment;


        result.innerHTML = `

            <div class="appointment-success">

                <strong>
                    ✅ Appointment Confirmed
                </strong>

                <p>
                    <b>
                        Appointment ID:
                    </b>

                    ${escapeHTML(
                        String(
                            appointment.id
                        )
                    )}

                </p>


                <p>

                    <b>
                        Patient:
                    </b>

                    ${escapeHTML(
                        appointment.patientName
                    )}

                </p>


                <p>

                    <b>
                        Doctor:
                    </b>

                    ${escapeHTML(
                        appointment.doctor
                    )}

                </p>


                <p>

                    <b>
                        Date:
                    </b>

                    ${escapeHTML(
                        appointment.appointmentDate
                    )}

                </p>


                <p>

                    <b>
                        Time:
                    </b>

                    ${escapeHTML(
                        appointment.appointmentTime ||
                        "Not selected"
                    )}

                </p>


                <p>

                    <b>
                        Patient ID:
                    </b>

                    ${escapeHTML(
                        appointment.patientId
                    )}

                </p>


                <p>

                    <b>
                        Status:
                    </b>

                    <span>
                        ✅ Confirmed
                    </span>

                </p>

            </div>

        `;


        // =================================================
        // SUCCESS ALERT
        // =================================================

        alert(

            "✅ Appointment booked successfully!\n\n" +

            "Appointment ID: " +
            appointment.id

        );


        console.log(
            "✅ Appointment saved:",
            appointment
        );


    }

    catch (error) {

        console.error(
            "❌ Appointment Booking Error:",
            error
        );


        result.innerHTML = `

            <div>

                <strong>
                    ❌ Backend Connection Failed
                </strong>

                <p>
                    Please make sure the SmartCity
                    backend server is running.
                </p>

            </div>

        `;

    }

}


/* =========================================================
   HEALTHCARE BUTTONS
========================================================= */

function trackAmbulance() {

    alert(
        "🚑 Ambulance tracking module will open here."
    );

}


function openHospitalBooking() {

    alert(
        "🏥 Hospital booking module will open here."
    );

}


/* =========================================================
   OPEN PATIENT FILE
========================================================= */

function openPatientFile() {

    const modal = document.getElementById("patientFileModal");

    if (!modal) {
        console.error("Patient File Modal not found");
        return;
    }

    // Clear old data
    document.getElementById("patientFileId").value = "";

    document.getElementById("patientFileEmpty").style.display = "block";

    document.getElementById("patientFileData").style.display = "none";

    document.getElementById("fileQRCode").innerHTML = "";

    // Open modal
    modal.classList.add("show");
}


/* =========================================================
   SEARCH PATIENT FILE
========================================================= */

async function searchPatientFile() {

    const patientId =
        document
            .getElementById("searchPatientId")
            ?.value
            .trim();

    const result =
        document.getElementById("patientFileResult");


    if (!patientId) {

        alert("Please enter Patient ID.");

        return;

    }


    result.innerHTML = `

        <div class="empty-patient">

            <span>⏳</span>

            <h3>
                Loading Patient File...
            </h3>

            <p>
                Please wait.
            </p>

        </div>

    `;


    try {

        const response =
            await fetch(
                `${BACKEND_URL}/api/patients/${encodeURIComponent(patientId)}`
            );


        const data =
            await response.json();


        if (!response.ok || !data.patient) {

            result.innerHTML = `

                <div class="empty-patient">

                    <span>❌</span>

                    <h3>
                        Patient Not Found
                    </h3>

                    <p>
                        No patient found with ID:
                        <b>${escapeHTML(patientId)}</b>
                    </p>

                </div>

            `;

            return;

        }


        const patient =
            data.patient;


        /* =========================================
           SHOW PATIENT DATA
        ========================================= */

        result.innerHTML = `

            <div class="patient-card">

                <div class="patient-card-top">

                    <div>

                        <h3>
                            👤
                            ${escapeHTML(
                                patient.name
                            )}
                        </h3>

                    </div>

                    <span class="patient-id">

                        ${escapeHTML(
                            patient.patient_id
                        )}

                    </span>

                </div>


                <div class="patient-details">


                    <div class="patient-detail">

                        <small>
                            Patient ID
                        </small>

                        <strong>
                            ${escapeHTML(
                                patient.patient_id
                            )}
                        </strong>

                    </div>


                    <div class="patient-detail">

                        <small>
                            Name
                        </small>

                        <strong>
                            ${escapeHTML(
                                patient.name
                            )}
                        </strong>

                    </div>


                    <div class="patient-detail">

                        <small>
                            Date of Birth
                        </small>

                        <strong>
                            ${
                                patient.dob ||
                                "N/A"
                            }
                        </strong>

                    </div>


                    <div class="patient-detail">

                        <small>
                            Gender
                        </small>

                        <strong>
                            ${
                                patient.gender ||
                                "N/A"
                            }
                        </strong>

                    </div>


                    <div class="patient-detail">

                        <small>
                            Mobile
                        </small>

                        <strong>
                            ${
                                patient.mobile ||
                                "N/A"
                            }
                        </strong>

                    </div>


                    <div class="patient-detail">

                        <small>
                            Blood Group
                        </small>

                        <strong>
                            ${
                                patient.blood_group ||
                                "N/A"
                            }
                        </strong>

                    </div>


                    <div class="patient-detail">

                        <small>
                            Address
                        </small>

                        <strong>
                            ${
                                patient.address ||
                                "N/A"
                            }
                        </strong>

                    </div>

                </div>


                <!-- QR -->

                <div class="patient-file-qr">

                    <h4>
                        📱 Patient QR Code
                    </h4>

                    <div id="fileQRCode"></div>

                    <p>
                        Scan this QR code to
                        identify the patient.
                    </p>

                </div>

            </div>

        `;


        /* =========================================
           GENERATE QR
        ========================================= */

        const qr =
            document.getElementById(
                "fileQRCode"
            );


        if (
            qr &&
            typeof QRCode !== "undefined"
        ) {

            new QRCode(

                qr,

                {

                    text:
                        patient.patient_id,

                    width:
                        150,

                    height:
                        150

                }

            );

        }

    }

    catch (error) {

        console.error(
            "Patient File Error:",
            error
        );


        result.innerHTML = `

            <div class="empty-patient">

                <span>⚠️</span>

                <h3>
                    Backend Connection Failed
                </h3>

                <p>
                    Make sure your backend
                    server is running.
                </p>

            </div>

        `;

    }

}


/* =========================================================
   GLOBAL
========================================================= */

window.openPatientFile =
    openPatientFile;

window.searchPatientFile =
    searchPatientFile;


/* =========================================================
   AUTHENTICATION
========================================================= */


/*
   Current logged-in user
*/

let currentAuthUser = null;


/* =========================================================
   STAFF ACCOUNTS
========================================================= */

const STAFF_ACCOUNTS = {


    traffic: {

        employeeId: "TRF001",

        password: "traffic123",

        name: "Traffic Officer",

        department: "Traffic Department",

        editable: [
            "traffic"
        ]

    },


    waste: {

        employeeId: "WST001",

        password: "waste123",

        name: "Waste Officer",

        department: "Waste Management",

        editable: [
            "waste"
        ]

    },


    water: {

        employeeId: "WTR001",

        password: "water123",

        name: "Water Officer",

        department: "Water Department",

        editable: [
            "water"
        ]

    },


    emergency: {

        employeeId: "EMG001",

        password: "emergency123",

        name: "Emergency Officer",

        department: "Emergency Department",

        editable: [
            "emergency"
        ]

    },


    parking: {

        employeeId: "PRK001",

        password: "parking123",

        name: "Parking Officer",

        department: "Parking Department",

        editable: [
            "parking"
        ]

    },


    healthcare: {

        employeeId: "HLT001",

        password: "health123",

        name: "Healthcare Officer",

        department: "Healthcare Department",

        editable: [
            "hospital",
            "healthcare"
        ]

    },


    police: {

        employeeId: "POL001",

        password: "police123",

        name: "Police Officer",

        department: "Police Department",

        editable: [
            "police"
        ]

    },


    admin: {

        employeeId: "ADMIN001",

        password: "admin123",

        name: "City Administrator",

        department: "Administration",

        editable: [

            "traffic",

            "waste",

            "water",

            "emergency",

            "parking",

            "hospital",

            "healthcare",

            "police",

            "places"

        ]

    }

};


/* =========================================================
   AUTH CHECK AFTER 15 SECONDS
========================================================= */

function checkExistingLogin() {

    const saved =
        localStorage.getItem(
            "smartCityCurrentUser"
        );


    if (saved) {

        try {

            currentAuthUser =
                JSON.parse(saved);


            updateUserBar();

            applyStaffPermissions();


            return;

        }

        catch (error) {

            localStorage.removeItem(
                "smartCityCurrentUser"
            );

        }

    }


    openAuthPopup();

}


/* =========================================================
   OPEN AUTH POPUP
========================================================= */

function openAuthPopup() {

    const overlay =
        document.getElementById(
            "authOverlay"
        );


    if (!overlay) return;


    overlay.style.display =
        "flex";


    document.body.style.overflow =
        "hidden";


    showLogin();

}


/* =========================================================
   LOGIN PANEL
========================================================= */

function showLogin() {

    const login =
        document.getElementById(
            "loginPanel"
        );


    const create =
        document.getElementById(
            "createPanel"
        );


    const staff =
        document.getElementById(
            "staffPanel"
        );


    if (login)
        login.style.display = "block";


    if (create)
        create.style.display = "none";


    if (staff)
        staff.style.display = "none";


    clearAuthMessages();

}


/* =========================================================
   CREATE ACCOUNT PANEL
========================================================= */

function showCreateAccount() {

    const login =
        document.getElementById(
            "loginPanel"
        );


    const create =
        document.getElementById(
            "createPanel"
        );


    const staff =
        document.getElementById(
            "staffPanel"
        );


    if (login)
        login.style.display = "none";


    if (create)
        create.style.display = "block";


    if (staff)
        staff.style.display = "none";


    clearAuthMessages();

}


/* =========================================================
   STAFF LOGIN PANEL
========================================================= */

function showStaffLogin() {

    const login =
        document.getElementById(
            "loginPanel"
        );


    const create =
        document.getElementById(
            "createPanel"
        );


    const staff =
        document.getElementById(
            "staffPanel"
        );


    if (login)
        login.style.display = "none";


    if (create)
        create.style.display = "none";


    if (staff)
        staff.style.display = "block";


    clearAuthMessages();

}


/* =========================================================
   CLEAR AUTH MESSAGES
========================================================= */

function clearAuthMessages() {

    [

        "loginMessage",

        "createMessage",

        "staffMessage"

    ].forEach((id) => {

        const element =
            document.getElementById(id);


        if (element) {

            element.textContent = "";

        }

    });

}


/* =========================================================
   REGISTER - BACKEND
========================================================= */

async function createUserAccount() {

    const name =
        document.getElementById(
            "createName"
        )?.value.trim();


    const mobile =
        document.getElementById(
            "createMobile"
        )?.value.trim();


    const email =
        document.getElementById(
            "createEmail"
        )?.value.trim();


    const password =
        document.getElementById(
            "createPassword"
        )?.value;


    const confirmPassword =
        document.getElementById(
            "createConfirmPassword"
        )?.value;


    const message =
        document.getElementById(
            "createMessage"
        );


    if (message) {

        message.textContent = "";

    }


    if (
        !name ||
        !mobile ||
        !email ||
        !password ||
        !confirmPassword
    ) {

        if (message)
            message.textContent =
                "Please fill all fields.";

        return;

    }


    if (
        !/^[0-9]{10}$/.test(mobile)
    ) {

        if (message)
            message.textContent =
                "Enter a valid 10 digit mobile number.";

        return;

    }


    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {

        if (message)
            message.textContent =
                "Enter a valid email.";

        return;

    }


    if (password.length < 6) {

        if (message)
            message.textContent =
                "Password must be at least 6 characters.";

        return;

    }


    if (password !== confirmPassword) {

        if (message)
            message.textContent =
                "Passwords do not match.";

        return;

    }


    try {

        const response =
            await fetch(

                `${BACKEND_URL}/api/register`,

                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            name,

                            mobile,

                            email,

                            password

                        })

                }

            );


        const data =
            await response.json();


        if (!response.ok) {

            if (message)
                message.textContent =
                    data.message ||
                    "Registration failed.";

            return;

        }


        alert(

            "Account created successfully!\n\n" +

            "Your User ID: " +
            data.user.userId

        );


        const loginId =
            document.getElementById(
                "loginId"
            );


        if (loginId) {

            loginId.value =
                email;

        }


        showLogin();

    }

    catch (error) {

        console.error(
            "Register Error:",
            error
        );


        if (message) {

            message.textContent =
                "Backend connection failed. Is server running?";

        }

    }

}


/* =========================================================
   LOGIN - BACKEND
========================================================= */

async function userLogin() {

    const loginId =
        document.getElementById(
            "loginId"
        )?.value.trim();


    const password =
        document.getElementById(
            "loginPassword"
        )?.value;


    const message =
        document.getElementById(
            "loginMessage"
        );


    if (message) {

        message.textContent = "";

    }


    if (
        !loginId ||
        !password
    ) {

        if (message)
            message.textContent =
                "Enter your email/mobile and password.";

        return;

    }


    try {

        const response =
            await fetch(

                `${BACKEND_URL}/api/login`,

                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            loginId,

                            password

                        })

                }

            );


        const data =
            await response.json();


        if (!response.ok) {

            if (message)
                message.textContent =
                    data.message ||
                    "Invalid login.";

            return;

        }


        currentAuthUser = {

            type:
                "citizen",

            userId:
                data.user.userId,

            name:
                data.user.name,

            email:
                data.user.email,

            mobile:
                data.user.mobile

        };


        saveCurrentLogin();

    }

    catch (error) {

        console.error(
            "Login Error:",
            error
        );


        if (message) {

            message.textContent =
                "Backend connection failed. Is server running?";

        }

    }

}


/* =========================================================
   STAFF LOGIN
========================================================= */

async function staffLogin() {

    const department =
        document.getElementById("staffDepartment")?.value;

    const employeeId =
        document.getElementById("staffId")?.value.trim();

    const password =
        document.getElementById("staffPassword")?.value;

    const message =
        document.getElementById("staffMessage");

    if (message) {
        message.textContent = "";
    }

    if (!department || !employeeId || !password) {

        if (message) {
            message.textContent =
                "Please fill all staff login fields.";
        }

        return;
    }

    try {

        const response = await fetch(
            `${BACKEND_URL}/api/staff-login`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    staffId: employeeId,
                    password: password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            if (message) {
                message.textContent =
                    data.message ||
                    "Staff login failed.";
            }

            return;
        }

        // Check selected department
        if (
            data.user.department.toLowerCase() !==
            department.toLowerCase()
        ) {

            if (message) {
                message.textContent =
                    "Selected department does not match your staff account.";
            }

            return;
        }

        // Save logged-in staff
        currentAuthUser = {

            type: "staff",

            department:
                data.user.department,

            employeeId:
                data.user.staffId,

            name:
                data.user.name,

            departmentName:
                data.user.department,
            editable:
               data.user.editable || []
          };

        saveCurrentLogin();

        console.log(
            "✅ Staff Login Successful:",
            currentAuthUser
        );

    }
    catch (error) {

        console.error(
            "Staff Login Error:",
            error
        );

        if (message) {
            message.textContent =
                "Backend connection failed. Is server running?";
        }
    }
}


/* =========================================================
   SAVE LOGIN
========================================================= */

function saveCurrentLogin() {

    localStorage.setItem(

        "smartCityCurrentUser",

        JSON.stringify(
            currentAuthUser
        )

    );


    closeAuthPopup();

    updateUserBar();

    applyStaffPermissions();


    console.log(
        "Logged in:",
        currentAuthUser
    );

}


/* =========================================================
   CLOSE AUTH POPUP
========================================================= */

function closeAuthPopup() {

    const overlay =
        document.getElementById(
            "authOverlay"
        );


    if (overlay) {

        overlay.style.display =
            "none";

    }


    document.body.style.overflow =
        "";

}


/* =========================================================
   USER BAR
========================================================= */

function updateUserBar() {

    if (!currentAuthUser) return;


    const bar =
        document.getElementById(
            "authUserBar"
        );


    const name =
        document.getElementById(
            "authUserName"
        );


    const role =
        document.getElementById(
            "authUserRole"
        );


    if (!bar) return;


    if (
        currentAuthUser.type ===
        "citizen"
    ) {

        if (name)
            name.textContent =
                currentAuthUser.name;


        if (role)
            role.textContent =
                "Citizen • " +
                currentAuthUser.userId;

    }

    else {

        if (name)
            name.textContent =
                currentAuthUser.name;


        if (role)
            role.textContent =
                currentAuthUser.departmentName +
                " • " +
                currentAuthUser.employeeId;

    }


    bar.style.display =
        "flex";

}


/* =========================================================
   STAFF PERMISSION
========================================================= */

function canStaffEdit(feature) {

    if (!currentAuthUser) {

        return false;

    }


    if (
        currentAuthUser.type !==
        "staff"
    ) {

        return false;

    }


    if (
        currentAuthUser.department ===
        "admin"
    ) {

        return true;

    }


    return currentAuthUser.editable
        .includes(feature);

}


/* =========================================================
   VIEW ONLY MESSAGE
========================================================= */

function showViewOnlyMessage(feature) {

    const name =
        feature.charAt(0).toUpperCase() +
        feature.slice(1);


    alert(

        "🔒 VIEW ONLY\n\n" +

        "You are logged in as " +

        (
            currentAuthUser?.departmentName ||
            "Citizen"
        ) +

        ".\n\n" +

        name +

        " can only be edited by its own department."

    );

}


/* =========================================================
   REQUIRE EDIT PERMISSION
========================================================= */

function requireEditPermission(feature) {

    if (!currentAuthUser) {

        openAuthPopup();

        return false;

    }


    if (
        currentAuthUser.type ===
        "citizen"
    ) {

        alert(

            "Citizens can view this section.\n" +

            "Staff access is required for editing."

        );

        return false;

    }


    if (!canStaffEdit(feature)) {

        showViewOnlyMessage(
            feature
        );

        return false;

    }


    return true;

}


/* =========================================================
   APPLY STAFF PERMISSIONS
========================================================= */

function applyStaffPermissions() {

    if (!currentAuthUser) return;


    const features = [

        "traffic",

        "waste",

        "water",

        "emergency",

        "parking",

        "hospital",

        "police",

        "healthcare"

    ];


    features.forEach((feature) => {

        const elements =
            document.querySelectorAll(

                `[data-department="${feature}"]`

            );


        elements.forEach((element) => {

            if (
                currentAuthUser.type ===
                "citizen"
            ) {

                element.classList.add(
                    "staff-view-only"
                );

            }

            else if (
                !canStaffEdit(feature)
            ) {

                element.classList.add(
                    "staff-view-only"
                );

            }

            else {

                element.classList.remove(
                    "staff-view-only"
                );

            }

        });

    });

}


/* =========================================================
   LOGOUT
========================================================= */

function logoutSmartCity() {

    if (
        !confirm(
            "Are you sure you want to logout?"
        )
    ) {

        return;

    }


    currentAuthUser = null;


    localStorage.removeItem(
        "smartCityCurrentUser"
    );


    const bar =
        document.getElementById(
            "authUserBar"
        );


    if (bar) {

        bar.style.display =
            "none";

    }


    openAuthPopup();

}

function closeHealthModal(modalId) {

    const modal =
        document.getElementById(modalId);

    if (modal) {

        modal.classList.remove("show");

    }

}
/* =========================================================
   GLOBAL FUNCTIONS
=========================================================

   These make HTML onclick=""
   buttons work correctly.
========================================================= */

window.getMyLocation =
    getMyLocation;

window.showFeature =
    showFeature;

window.searchLocation =
    searchLocation;

window.refreshMapData =
    refreshMapData;

window.startNavigation =
    startNavigation;

window.openPatientRegistration =
    openPatientRegistration;

window.openDoctorBooking =
    openDoctorBooking;

window.openHospitalContacts =
    openHospitalContacts;

window.closeHealthModal =
    closeHealthModal;

window.bookDoctorSlot =
    bookDoctorSlot;

window.trackAmbulance =
    trackAmbulance;

window.openHospitalBooking =
    openHospitalBooking;

window.openPatientFile =
    openPatientFile;

window.openAuthPopup =
    openAuthPopup;

window.showLogin =
    showLogin;

window.showCreateAccount =
    showCreateAccount;

window.showStaffLogin =
    showStaffLogin;

window.createUserAccount =
    createUserAccount;

window.userLogin =
    userLogin;

window.staffLogin =
    staffLogin;

window.logoutSmartCity =
    logoutSmartCity;

window.requireEditPermission =
    requireEditPermission;


/* =========================================================
   READY
========================================================= */

console.log(
    "🚀 SmartCity AI Frontend Ready"
);
async function loadCityStatus() {
    try {
        const response = await fetch("http://localhost:5000/api/city-status");

        if (!response.ok) {
            throw new Error("City status API failed");
        }

        const data = await response.json();

        console.log("✅ City Data:", data);

        // Traffic
        const traffic = document.getElementById("trafficValue");
        if (traffic) {
            traffic.textContent = data.traffic;
        }

        // Temperature
        const temperature = document.getElementById("temperatureValue");
        if (temperature) {
            temperature.textContent = `${data.temperature}°C`;
        }

        // Hospitals
        const hospitals = document.getElementById("hospitalValue");
        if (hospitals) {
            hospitals.textContent = data.hospitals;
        }

        // Ambulances
        const ambulances = document.getElementById("ambulanceValue");
        if (ambulances) {
            ambulances.textContent = data.ambulances;
        }

        // AQI
        const aqi = document.getElementById("aqiValue");
        if (aqi) {
            aqi.textContent = `${data.aqi} AQI`;
        }

    } catch (error) {
        console.error("❌ City Status Error:", error);
    }
}

loadCityStatus();
function searchPatientFile() {

    const patientId =
        document.getElementById("patientFileId").value.trim();

    if (!patientId) {

        alert("Please enter Patient ID.");

        return;
    }


    fetch(
        `${BACKEND_URL}/api/patients/${encodeURIComponent(patientId)}`
    )

    .then(response => response.json())

    .then(data => {

        console.log("Patient Data:", data);


        if (!data.patient) {

            alert(
                data.message || "Patient not found."
            );

            return;
        }


        const patient = data.patient;


        // Hide empty message
        document.getElementById(
            "patientFileEmpty"
        ).style.display = "none";


        // Show patient data
        document.getElementById(
            "patientFileData"
        ).style.display = "block";


        // Patient information

        document.getElementById(
            "filePatientName"
        ).textContent =
            patient.name || "Unknown";


        document.getElementById(
            "filePatientId"
        ).textContent =
            patient.patient_id || patientId;


        document.getElementById(
            "filePatientIdValue"
        ).textContent =
            patient.patient_id || patientId;


        document.getElementById(
            "filePatientNameValue"
        ).textContent =
            patient.name || "N/A";


        document.getElementById(
            "filePatientDOB"
        ).textContent =
            patient.dob || patient.date_of_birth || "N/A";


        document.getElementById(
            "filePatientGender"
        ).textContent =
            patient.gender || "N/A";


        document.getElementById(
            "filePatientPhone"
        ).textContent =
            patient.mobile ||
            patient.phone ||
            "N/A";


        // Generate QR

        const qrBox =
            document.getElementById("fileQRCode");


        qrBox.innerHTML = "";


        if (
            typeof QRCode !== "undefined"
        ) {

            new QRCode(
                qrBox,
                {
                    text: patient.patient_id || patientId,

                    width: 180,

                    height: 180,

                    correctLevel:
                        QRCode.CorrectLevel.H
                }
            );

        } else {

            qrBox.innerHTML =
                "<p>QR library not loaded.</p>";

        }

    })

    .catch(error => {

        console.error(
            "Patient File Error:",
            error
        );

        alert(
            "Backend connection failed."
        );

    });

}