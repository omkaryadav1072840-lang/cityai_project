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

const BACKEND_URL = (typeof window !== "undefined" && window.API_BASE_URL !== undefined)
    ? window.API_BASE_URL
    : (typeof window !== "undefined" && window.location && window.location.origin && window.location.origin.startsWith("http"))
        ? (window.location.port === "5000" || window.location.protocol === "file:" ? (window.location.port === "5000" ? window.location.origin : "http://localhost:5000") : "")
        : "http://localhost:5000";


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

    initDashboardRealtime();

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



    if (type === "parking" || type === "all") {
        loadLiveParkingOnCityMap();
    }

    loadLiveIncidentsOnCityMap(type);

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

async function loadLiveIncidentsOnCityMap(layerType) {
    try {
        const actualLayer = layerType === "lights" ? "street_lights" : layerType;
        const queryLayer = (actualLayer === "all" || !actualLayer) ? "" : `?layers=${actualLayer}`;
        const res = await fetch(`${BACKEND_URL}/api/map/incidents${queryLayer}`);
        if (!res.ok) return;
        const geojson = await res.json();
        const features = geojson.features || [];

        features.forEach(feat => {
            if (!feat.geometry || !feat.geometry.coordinates) return;
            const [lng, lat] = feat.geometry.coordinates;
            const props = feat.properties || {};

            // Skip parking as loadLiveParkingOnCityMap handles it
            if (props.layer === "parking") return;

            const iconMap = {
                "traffic": "🚦",
                "waste": "🗑️",
                "emergency": "🚨",
                "hospital": "🏥",
                "street_lights": props.status === "FAULT" ? "⚠️" : "💡",
                "aqi": "🌱",
                "places": "⭐"
            };

            const emoji = iconMap[props.layer] || "📍";
            const customIcon = L.divIcon({
                className: "custom-div-icon",
                html: `<div style="font-size: 20px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${emoji}</div>`,
                iconSize: [26, 26],
                iconAnchor: [13, 13]
            });

            const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
            if (Array.isArray(allMarkers)) allMarkers.push(marker);
            if (typeof markers !== "undefined" && Array.isArray(markers)) markers.push(marker);

            const title = escapeHTML(props.title || "Smart City Asset");
            const desc = escapeHTML(props.description || "");

            // Rich customized popup for Street Lights and AQI Sensors
            let extraDetails = "";
            if (props.layer === "street_lights") {
                extraDetails = `
                    <div style="font-size:11px; margin:4px 0; color:#cbd5e1; background:rgba(0,0,0,0.25); padding:6px; border-radius:4px;">
                        <div>⚡ <b>Status:</b> <span style="color:${props.status === 'FAULT' ? '#f87171' : '#4ade80'}; font-weight:700;">${props.status || 'FUNCTIONAL'}</span></div>
                        <div>💡 <b>Brightness:</b> ${props.brightness || 100}%</div>
                        <div>🔌 <b>Power Consumption:</b> ${props.power_consumption || 120}W</div>
                    </div>
                `;
            } else if (props.layer === "aqi") {
                const aqiVal = props.aqi || 0;
                const aqiCol = aqiVal > 200 ? '#ef4444' : (aqiVal > 100 ? '#f59e0b' : '#10b981');
                extraDetails = `
                    <div style="font-size:11px; margin:4px 0; color:#cbd5e1; background:rgba(0,0,0,0.25); padding:6px; border-radius:4px;">
                        <div>🌫️ <b>Air Quality:</b> <span style="font-weight:700; color:${aqiCol}">${aqiVal} AQI</span></div>
                        <div>🌡️ <b>Temperature:</b> ${props.temperature || 28}°C | 💧 <b>Humidity:</b> ${props.humidity || 65}%</div>
                        <div>🔬 <b>PM2.5:</b> ${props.pm25 || 45} µg/m³ | <b>PM10:</b> ${props.pm10 || 80} µg/m³</div>
                    </div>
                `;
            }

            marker.bindPopup(`
                <div class="map-popup" style="font-family: inherit;">
                    <div style="display:inline-block; padding:2px 8px; margin-bottom:6px; border-radius:4px; background:rgba(30,41,59,0.9); color:#38bdf8; font-size:10px; font-weight:800; text-transform:uppercase;">
                        ${props.layer} • ${props.subType || 'Verified'}
                    </div>
                    <h3 style="margin:2px 0 6px; font-size:14px;">${title}</h3>
                    <p style="margin:2px 0; font-size:12px; color:#475569;">${desc}</p>
                    ${extraDetails}
                    <div style="margin-top:8px;">
                        <button class="navigate-btn" onclick="startNavigation(${lat}, ${lng}, '${title}')" style="padding:4px 8px; font-size:11px; cursor:pointer; background:#0284c7; color:#fff; border:none; border-radius:4px;">Directions ➔</button>
                    </div>
                </div>
            `);
        });
    } catch (err) {
        console.warn("Live incidents map fetch error:", err);
    }
}

async function loadLiveParkingOnCityMap() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/parking`);
        if (!res.ok) return;
        const json = await res.json();
        const lots = json.parkingLots || [];
        lots.forEach(lot => {
            const lat = Number(lot.latitude || 26.758);
            const lng = Number(lot.longitude || 83.395);
            const total = Number(lot.total_slots || 24);
            const avail = Number(lot.available_slots || 0);
            const pct = total > 0 ? (avail / total) * 100 : 0;
            const statusColor = pct <= 10 ? '#ef4444' : (pct <= 40 ? '#f59e0b' : '#10b981');

            const marker = L.marker([lat, lng]).addTo(map);
            if (Array.isArray(allMarkers)) allMarkers.push(marker);
            if (typeof markers !== "undefined" && Array.isArray(markers)) markers.push(marker);

            marker.bindPopup(`
                <div class="map-popup">
                    <div style="display:inline-block; padding:3px 8px; margin-bottom:6px; border-radius:4px; background:${statusColor}; color:#fff; font-size:11px; font-weight:800;">
                        🟢 LIVE PARKING • ${avail} / ${total} VACANT
                    </div>
                    <h3 style="margin:4px 0 6px;">🅿️ ${escapeHTML(lot.name)}</h3>
                    <p style="margin:2px 0;"><b>Address:</b> ${escapeHTML(lot.address || lot.area || "Gorakhpur")}</p>
                    <p style="margin:2px 0;"><b>Tariff:</b> ₹${lot.hourly_rate || 20}/hour</p>
                    <div style="margin-top:8px; display:flex; gap:6px;">
                        <a href="pages/parking/parking.html" style="padding:5px 10px; background:#0284c7; color:#fff; border-radius:4px; text-decoration:none; font-size:12px; font-weight:700;">
                            Reserve Bay
                        </a>
                        <button class="navigate-btn" onclick="startNavigation(${lat}, ${lng}, '${escapeHTML(lot.name)}')">Navigate</button>
                    </div>
                </div>
            `);
        });
    } catch (e) {
        console.warn("Live parking map fetch error:", e);
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

/* =========================================================
   SMART CITY AI ASSISTANT CHAT CONTROLLER
========================================================= */

let aiConversationHistory = [];
let isAIBusy = false;

function initializeAIButton() {
    const sendButton = document.getElementById("sendButton");
    const userInput = document.getElementById("userInput");
    const clearBtn = document.getElementById("clearChatBtn");

    if (sendButton && userInput) {
        sendButton.addEventListener("click", sendAIMessage);

        userInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendAIMessage();
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            const container = document.getElementById("aiChatMessages");
            if (container) {
                container.innerHTML = `
                    <div class="ai-msg ai-msg-bot">
                        <div class="ai-msg-bubble">
                            <div style="font-weight: 700; color: #1e293b; margin-bottom: 4px;">Conversation cleared 🧹</div>
                            <p style="margin: 0; color: #475569; font-size: 13px;">
                                Ready for your next query! How can Smart City AI assist you?
                            </p>
                        </div>
                    </div>
                `;
            }
            aiConversationHistory = [];
        });
    }

    // Initialize Voice Speech Recognition & Synthesis
    if (typeof initVoiceAssistant === "function") {
        initVoiceAssistant();
    }

    // Check AI Engine Status
    fetch(`${BACKEND_URL}/api/ai/status`)
        .then(r => r.json())
        .then(data => {
            const badge = document.getElementById("aiModelBadge");
            if (badge && data.success) {
                if (data.geminiKeyConfigured) {
                    badge.textContent = "● GEMINI AI";
                    badge.style.background = "rgba(16, 185, 129, 0.15)";
                    badge.style.color = "#10b981";
                    badge.style.borderColor = "rgba(16, 185, 129, 0.3)";
                } else {
                    badge.textContent = "● CITY AI";
                    badge.style.background = "rgba(37, 99, 235, 0.1)";
                    badge.style.color = "#2563eb";
                }
            }
        })
        .catch(() => {});
}

async function sendAIMessage() {
    const input = document.getElementById("userInput");
    if (!input || isAIBusy) return;

    const message = input.value.trim();
    if (!message) return;

    input.value = "";
    isAIBusy = true;

    // 1. Render User Message Bubble
    appendChatMessage("user", message);
    aiConversationHistory.push({ sender: "user", text: message });

    // 2. Render Typing Indicator
    const typingId = showAITypingIndicator();

    try {
        const res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: message,
                history: aiConversationHistory
            })
        });

        removeAITypingIndicator(typingId);

        if (!res.ok) throw new Error("HTTP error " + res.status);
        const data = await res.json();

        // 3. Render AI Response Bubble
        appendChatMessage("bot", data.reply, data.actions);
        aiConversationHistory.push({ sender: "bot", text: data.reply });

        // Speak response aloud if speaker enabled
        if (typeof speakAIText === "function" && isVoiceSpeakerEnabled) {
            speakAIText(data.reply);
        }

        // Play soft chime on response
        if (typeof SmartCityRealtime !== "undefined" && SmartCityRealtime.playAlertSound) {
            SmartCityRealtime.playAlertSound(data.intent === "EMERGENCY" ? "emergency" : "chime");
        }
    } catch (err) {
        removeAITypingIndicator(typingId);
        appendChatMessage("bot", "⚠️ Sorry, I could not connect to the Smart City AI Engine. Please ensure the backend server is running.");
    } finally {
        isAIBusy = false;
        if (input) input.focus();
    }
}

function handleQuickPrompt(promptText) {
    const input = document.getElementById("userInput");
    if (input) {
        input.value = promptText;
        sendAIMessage();
    }
}

function showAITypingIndicator() {
    const container = document.getElementById("aiChatMessages");
    if (!container) return null;

    const id = "typing-" + Date.now();
    const typingEl = document.createElement("div");
    typingEl.id = id;
    typingEl.className = "ai-msg ai-msg-bot";
    typingEl.innerHTML = `
        <div class="ai-msg-bubble">
            <div class="ai-typing-indicator">
                <span class="ai-typing-dot"></span>
                <span class="ai-typing-dot"></span>
                <span class="ai-typing-dot"></span>
            </div>
        </div>
    `;
    container.appendChild(typingEl);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeAITypingIndicator(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
}

function appendChatMessage(sender, text, actions = []) {
    const container = document.getElementById("aiChatMessages");
    if (!container) return;

    const msgEl = document.createElement("div");
    msgEl.className = `ai-msg ai-msg-${sender}`;

    const formattedText = formatAIMarkdown(text);

    let actionsHtml = "";
    if (Array.isArray(actions) && actions.length > 0) {
        actionsHtml = `<div class="ai-actions-row">` +
            actions.map(act => {
                if (act.action === "trigger_sos") {
                    return `<button class="ai-action-btn danger" onclick="triggerQuickSOSFromChat()">🚨 Emergency SOS Dispatch</button>`;
                } else if (act.action === "call") {
                    return `<a class="ai-action-btn primary" href="tel:${act.value || '108'}">📞 Call ${act.value || '108'}</a>`;
                } else if (act.url) {
                    return `<a class="ai-action-btn ${act.type || 'primary'}" href="${act.url}">${act.label || 'View Details'}</a>`;
                }
                return "";
            }).join("") +
        `</div>`;
    }

    msgEl.innerHTML = `
        <div class="ai-msg-bubble">
            <div>${formattedText}</div>
            ${actionsHtml}
        </div>
    `;

    container.appendChild(msgEl);
    container.scrollTop = container.scrollHeight;
}

function formatAIMarkdown(text) {
    if (!text) return "";
    let clean = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Bold **text**
    clean = clean.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Bullet points • or -
    clean = clean.replace(/^[•\-\*]\s+(.*)$/gm, "<li style='margin-left:14px;'>$1</li>");

    // Line breaks
    clean = clean.replace(/\n\n/g, "<div style='height:8px;'></div>");
    clean = clean.replace(/\n/g, "<br>");

    return clean;
}

function triggerQuickSOSFromChat() {
    if (!confirm("🚨 Are you sure you want to trigger a CRITICAL EMERGENCY SOS signal to Gorakhpur dispatchers?")) return;

    fetch(`${BACKEND_URL}/api/emergency/sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            latitude: (userLocation && userLocation.lat) ? userLocation.lat : 26.7606,
            longitude: (userLocation && userLocation.lng) ? userLocation.lng : 83.3732,
            address: "Reported via Smart City AI Assistant",
            type: "CRITICAL SOS (AI Assistant)"
        })
    })
    .then(r => r.json())
    .then(data => {
        alert("🚨 Critical SOS broadcasted successfully! Emergency dispatch and nearby response units have been alerted.");
        appendChatMessage("bot", "🚨 **Emergency SOS Dispatched.**\n\nIncident code: `" + (data.sos ? data.sos.incidentCode : 'EMG') + "`\nResponse units have received your signal. Keep your line open.", [
            { label: "Track on Emergency Map", action: "navigate", url: "/pages/emergency/emergency.html", type: "danger" }
        ]);
    })
    .catch(err => alert("Error dispatching SOS: " + err.message));
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

    const result =
        document.getElementById(
            "appointmentResult"
        );

    if (!result) return;

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
    const input = document.getElementById("patientFileId") || document.getElementById("searchPatientId");
    const patientId = input ? input.value.trim() : "";

    const result = document.getElementById("patientFileResult");
    const emptyEl = document.getElementById("patientFileEmpty");
    const dataEl = document.getElementById("patientFileData");

    if (!patientId) {
        alert("Please enter Patient ID.");
        if (input) input.focus();
        return;
    }

    if (emptyEl) {
        emptyEl.style.display = "block";
        emptyEl.innerHTML = `
            <span>⏳</span>
            <h3>Loading Patient File...</h3>
            <p>Please wait while we retrieve records for <b>${escapeHTML(patientId)}</b>.</p>
        `;
    }
    if (dataEl) dataEl.style.display = "none";
    if (result) {
        result.innerHTML = `
            <div class="empty-patient">
                <span>⏳</span>
                <h3>Loading Patient File...</h3>
                <p>Please wait.</p>
            </div>
        `;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/patients/${encodeURIComponent(patientId)}`);
        const data = await response.json();

        if (!response.ok || !data.patient) {
            const notFoundHtml = `
                <span>❌</span>
                <h3>Patient Not Found</h3>
                <p>No patient record exists with ID: <b>${escapeHTML(patientId)}</b></p>
            `;
            if (emptyEl) {
                emptyEl.style.display = "block";
                emptyEl.innerHTML = notFoundHtml;
            }
            if (dataEl) dataEl.style.display = "none";
            if (result) {
                result.innerHTML = `<div class="empty-patient">${notFoundHtml}</div>`;
            }
            return;
        }

        const patient = data.patient;

        // 1. Populate dedicated fields in index.html if present
        if (emptyEl) emptyEl.style.display = "none";
        if (dataEl) {
            dataEl.style.display = "block";
            const elName = document.getElementById("filePatientName");
            const elId = document.getElementById("filePatientId");
            const elIdVal = document.getElementById("filePatientIdValue");
            const elNameVal = document.getElementById("filePatientNameValue");
            const elDob = document.getElementById("filePatientDOB");
            const elGen = document.getElementById("filePatientGender");
            const elPh = document.getElementById("filePatientPhone");
            const elQr = document.getElementById("fileQRCode");

            if (elName) elName.textContent = patient.name || "Patient";
            if (elId) elId.textContent = patient.patient_id || patientId;
            if (elIdVal) elIdVal.textContent = patient.patient_id || patientId;
            if (elNameVal) elNameVal.textContent = patient.name || "Patient";
            if (elDob) elDob.textContent = patient.dob || "N/A";
            if (elGen) elGen.textContent = patient.gender || "N/A";
            if (elPh) elPh.textContent = patient.mobile || "N/A";

            if (elQr) {
                elQr.innerHTML = "";
                if (typeof QRCode !== "undefined") {
                    new QRCode(elQr, {
                        text: patient.patient_id || patientId,
                        width: 140,
                        height: 140
                    });
                }
            }
        }

        // 2. Populate patientFileResult container if present
        if (result) {
            result.innerHTML = `
                <div class="patient-card">
                    <div class="patient-card-top">
                        <div>
                            <h3>👤 ${escapeHTML(patient.name)}</h3>
                        </div>
                        <span class="patient-id">${escapeHTML(patient.patient_id)}</span>
                    </div>

                    <div class="patient-details">
                        <div class="patient-detail"><small>Patient ID</small><strong>${escapeHTML(patient.patient_id)}</strong></div>
                        <div class="patient-detail"><small>Name</small><strong>${escapeHTML(patient.name)}</strong></div>
                        <div class="patient-detail"><small>Date of Birth</small><strong>${patient.dob || "N/A"}</strong></div>
                        <div class="patient-detail"><small>Gender</small><strong>${patient.gender || "N/A"}</strong></div>
                        <div class="patient-detail"><small>Mobile</small><strong>${patient.mobile || "N/A"}</strong></div>
                        <div class="patient-detail"><small>Blood Group</small><strong>${patient.blood_group || "N/A"}</strong></div>
                        <div class="patient-detail"><small>Address</small><strong>${patient.address || "N/A"}</strong></div>
                    </div>

                    <div class="patient-file-qr">
                        <h4>📱 Patient QR Code</h4>
                        <div id="fileQRCodeDynamic"></div>
                        <p>Scan this QR code to identify the patient.</p>
                    </div>
                </div>
            `;

            const dynQr = document.getElementById("fileQRCodeDynamic");
            if (dynQr && typeof QRCode !== "undefined") {
                new QRCode(dynQr, {
                    text: patient.patient_id || patientId,
                    width: 140,
                    height: 140
                });
            }
        }

    } catch (error) {
        console.error("Patient File Error:", error);
        const errHtml = `
            <span>⚠️</span>
            <h3>Backend Connection Failed</h3>
            <p>Make sure your SmartCity AI backend server is running.</p>
        `;
        if (emptyEl) {
            emptyEl.style.display = "block";
            emptyEl.innerHTML = errHtml;
        }
        if (dataEl) dataEl.style.display = "none";
        if (result) {
            result.innerHTML = `<div class="empty-patient">${errHtml}</div>`;
        }
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

        // Save JWT token for authorized API calls
        if (data.token && typeof SmartCityAuth !== "undefined") {
            SmartCityAuth.setSession(data.token, currentAuthUser);
        }

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

        // Save JWT token for authorized API calls
        if (data.token && typeof SmartCityAuth !== "undefined") {
            SmartCityAuth.setSession(data.token, currentAuthUser);
        }

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

    // Clear JWT token
    if (typeof SmartCityAuth !== "undefined") {
        SmartCityAuth.logout();
    }

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

/* =========================================================
   REAL-TIME DASHBOARD SOCKETS
========================================================= */

let dashboardAmbulanceMarkers = {};

function initDashboardRealtime() {
    if (typeof SmartCityRealtime === "undefined") return;

    SmartCityRealtime.init();
    SmartCityRealtime.renderLiveIndicator(".nav-left");

    // Real-time moving ambulance markers on cityMap
    SmartCityRealtime.onAmbulanceLocation((amb) => {
        if (!amb || !amb.latitude || !amb.longitude || !map) return;

        const ambKey = String(amb.id || amb.ambulance_id || amb.vehicle_number);
        const lat = Number(amb.latitude);
        const lng = Number(amb.longitude);

        if (dashboardAmbulanceMarkers[ambKey]) {
            dashboardAmbulanceMarkers[ambKey].setLatLng([lat, lng]);
        } else {
            const ambIcon = L.divIcon({
                className: "dashboard-amb-icon",
                html: `<div style="background:#ef4444; color:#fff; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 10px rgba(239,68,68,0.8); border:2px solid #fff; font-size:15px;">🚑</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            const marker = L.marker([lat, lng], { icon: ambIcon }).addTo(map);
            marker.bindPopup(`
                <div style="font-size:12px; line-height:1.4;">
                    <strong style="color:#dc2626;">🚑 Live Ambulance Telemetry</strong><br>
                    <b>Vehicle:</b> ${amb.vehicle_number || ambKey}<br>
                    <b>Status:</b> ${amb.status || 'Active'}<br>
                    <b>Driver:</b> ${amb.driver_name || 'Active'}<br>
                    <b>Hospital:</b> ${amb.hospital_name || 'Gorakhpur'}
                </div>
            `);
            dashboardAmbulanceMarkers[ambKey] = marker;
        }
    });

    // Real-time Emergency SOS broadcast alerts
    SmartCityRealtime.onEmergencyAlert((alert) => {
        SmartCityRealtime.playAlertSound("emergency");
        SmartCityRealtime.showBroadcastBanner(
            `🚨 CRITICAL SOS: ${alert.type || 'EMERGENCY'}`,
            `Location: ${alert.location || 'Reported area'}. Response units dispatched.`,
            "danger"
        );
    });
}

loadCityStatus();

/* ==========================================================================
   SMARTCITY AI - MASTER EXPANSION CLIENT MODULE
   - Voice Assistant (Speech Recognition & Voice Synthesis)
   - Citizen Grievance Portal & Live SLA Countdown Ticker
   - Executive Smart City Command Center (ICCC Dashboard)
   - Simulated WhatsApp / SMS Dispatch Alert Previews
   - Interactive 5-Star Grievance Feedback Redressal
   ========================================================================== */

let isVoiceSpeakerEnabled = true;
let voiceRecognition = null;
let isVoiceListening = false;
let slaTickInterval = null;

// --------------------------------------------------------------------------
// 1. VOICE ASSISTANT (Speech-to-Text & Speech Synthesis)
// --------------------------------------------------------------------------

function initVoiceAssistant() {
    const voiceBtn = document.getElementById("aiVoiceBtn");
    const speakerBtn = document.getElementById("aiSpeakerBtn");
    const userInput = document.getElementById("userInput");

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (voiceBtn) {
        if (!SpeechRec) {
            voiceBtn.title = "Voice recognition not supported in this browser";
            voiceBtn.style.opacity = "0.5";
        } else {
            voiceRecognition = new SpeechRec();
            voiceRecognition.continuous = false;
            voiceRecognition.interimResults = false;
            voiceRecognition.lang = "hi-IN"; // Supports Hindi and English mixed input

            voiceRecognition.onstart = () => {
                isVoiceListening = true;
                voiceBtn.classList.add("listening");
                if (userInput) userInput.placeholder = "Listening... बोलिए...";
            };

            voiceRecognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (userInput) {
                    userInput.value = transcript;
                }
                sendAIMessage();
            };

            voiceRecognition.onerror = (e) => {
                console.warn("Voice error:", e);
                stopVoiceListening();
            };

            voiceRecognition.onend = () => {
                stopVoiceListening();
            };

            voiceBtn.addEventListener("click", () => {
                if (!voiceRecognition) return;
                if (isVoiceListening) {
                    voiceRecognition.stop();
                    stopVoiceListening();
                } else {
                    try {
                        voiceRecognition.start();
                    } catch (err) {
                        console.warn("Could not start recognition:", err);
                    }
                }
            });
        }
    }

    if (speakerBtn) {
        speakerBtn.addEventListener("click", () => {
            isVoiceSpeakerEnabled = !isVoiceSpeakerEnabled;
            if (isVoiceSpeakerEnabled) {
                speakerBtn.classList.remove("muted");
                speakerBtn.title = "Voice Response: Enabled";
                speakerBtn.textContent = "🔊";
            } else {
                speakerBtn.classList.add("muted");
                speakerBtn.title = "Voice Response: Muted";
                speakerBtn.textContent = "🔇";
                if (window.speechSynthesis) window.speechSynthesis.cancel();
            }
        });
    }
}

function stopVoiceListening() {
    isVoiceListening = false;
    const voiceBtn = document.getElementById("aiVoiceBtn");
    const userInput = document.getElementById("userInput");
    if (voiceBtn) voiceBtn.classList.remove("listening");
    if (userInput && userInput.placeholder.startsWith("Listening")) {
        userInput.placeholder = "Ask Smart City AI (or speak in Hindi/English)...";
    }
}

function speakAIText(text) {
    if (!window.speechSynthesis || !isVoiceSpeakerEnabled || !text) return;
    try {
        window.speechSynthesis.cancel();
        // Clean markdown symbols or asterisks for natural speech
        const cleanText = text.replace(/[*#_`>]/g, "").trim();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        // Prefer Hindi or Indian English voice if present
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => (v.lang && (v.lang.includes("IN") || v.lang.includes("hi")))) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;

        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.warn("Speech synthesis error:", e);
    }
}

// --------------------------------------------------------------------------
// 2. CITIZEN GRIEVANCE PORTAL & LIVE SLA TICKER
// --------------------------------------------------------------------------

function openGrievanceModal() {
    const modal = document.getElementById("scGrievanceModal");
    if (!modal) return;
    modal.classList.add("active");

    // Pre-fill user information if logged in
    const user = (typeof SmartCityAuth !== "undefined") ? SmartCityAuth.getUser() : null;
    const nameInput = document.getElementById("grievanceName");
    const phoneInput = document.getElementById("grievancePhone");
    if (user) {
        if (nameInput && !nameInput.value) nameInput.value = user.name || user.fullName || "";
        if (phoneInput && !phoneInput.value) phoneInput.value = user.phone || user.mobile || "";
    }

    startSlaTickTimer();
}

function closeGrievanceModal() {
    const modal = document.getElementById("scGrievanceModal");
    if (modal) modal.classList.remove("active");
}

function switchGrievanceTab(tab) {
    const btnLodge = document.getElementById("tabBtnLodge");
    const btnTrack = document.getElementById("tabBtnTrack");
    const contentLodge = document.getElementById("tabContentLodge");
    const contentTrack = document.getElementById("tabContentTrack");

    if (tab === "lodge") {
        if (btnLodge) btnLodge.classList.add("active");
        if (btnTrack) btnTrack.classList.remove("active");
        if (contentLodge) contentLodge.style.display = "block";
        if (contentTrack) contentTrack.style.display = "none";
    } else {
        if (btnTrack) btnTrack.classList.add("active");
        if (btnLodge) btnLodge.classList.remove("active");
        if (contentTrack) contentTrack.style.display = "block";
        if (contentLodge) contentLodge.style.display = "none";
        loadMyGrievances();
    }
}

function handleDeptChange() {
    const dept = document.getElementById("grievanceDept").value;
    const catSelect = document.getElementById("grievanceCategory");
    if (!catSelect) return;

    const categoryMap = {
        waste: [
            { val: "Garbage Overflow", label: "Garbage Bin Overflow" },
            { val: "Illegal Dumping", label: "Illegal Roadside Dumping" },
            { val: "Missed Collection", label: "Missed Daily Collection" },
            { val: "Hazardous Waste", label: "Hazardous Waste Spillage" }
        ],
        traffic: [
            { val: "Signal Failure", label: "Traffic Signal Failure / Red Lock" },
            { val: "Severe Congestion", label: "Gridlock & Jam Hotspot" },
            { val: "Illegal Parking", label: "Vehicle Blocking Thoroughfare" },
            { val: "Pothole Road Hazard", label: "Major Road Crater / Pothole" }
        ],
        water: [
            { val: "Main Pipeline Burst", label: "High Pressure Pipeline Leak" },
            { val: "Contaminated Supply", label: "Discolored / Turbid Water" },
            { val: "Low Pressure", label: "Zero Water Pressure" },
            { val: "Sewage Overflow", label: "Stormwater Drainage Clogging" }
        ],
        street_lights: [
            { val: "Complete Blackout", label: "Entire Street Light Circuit Off" },
            { val: "Single Lamp Out", label: "Individual Pole Lamp Fault" },
            { val: "Daytime On", label: "Energy Waste / Lights On in Daylight" },
            { val: "Flickering / Damaged", label: "Damaged Cable / Flickering Pole" }
        ],
        healthcare: [
            { val: "ICU Bed Emergency", label: "Urgent ICU / Ventilator Search" },
            { val: "Ambulance Delay", label: "Delayed Ambulance Dispatch" },
            { val: "Medicine Shortage", label: "Hospital Pharmacy Stock Out" },
            { val: "Sanitation Hazard", label: "Medical Facility Sanitation" }
        ],
        emergency: [
            { val: "Structural Collapse", label: "Building / Wall Collapse Risk" },
            { val: "Fire Hazard", label: "Electrical Spark / Open Flame" },
            { val: "Flood Waterlogging", label: "Submerged Roadway Hazard" },
            { val: "Public Safety Risk", label: "Urgent Police Intervention" }
        ]
    };

    const options = categoryMap[dept] || categoryMap.waste;
    catSelect.innerHTML = options.map(o => `<option value="${escapeHTML(o.val)}">${escapeHTML(o.label)}</option>`).join("");
}

function fillCurrentLocationForGrievance() {
    const locInput = document.getElementById("grievanceLocation");
    if (!locInput) return;

    if (userLocation && userLocation.lat) {
        locInput.value = `Near ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)} (GPS Verified)`;
        return;
    }

    if (navigator.geolocation) {
        locInput.value = "Locating via GPS...";
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                locInput.value = `Near ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (GPS Verified)`;
            },
            () => {
                locInput.value = "Golghar, Gorakhpur (Near Town Hall)";
            },
            { timeout: 5000 }
        );
    } else {
        locInput.value = "Golghar, Gorakhpur (Near Town Hall)";
    }
}

async function handleGrievanceSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById("grievanceSubmitBtn");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "⏳ Calculating SLA & Routing...";
    }

    const payload = {
        department: document.getElementById("grievanceDept").value,
        category: document.getElementById("grievanceCategory").value,
        priority: document.getElementById("grievancePriority").value,
        location: document.getElementById("grievanceLocation").value,
        citizen_name: document.getElementById("grievanceName").value,
        citizen_phone: document.getElementById("grievancePhone").value,
        description: document.getElementById("grievanceDesc").value
    };

    try {
        const token = (typeof SmartCityAuth !== "undefined") ? SmartCityAuth.getToken() : localStorage.getItem("sc_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${BACKEND_URL}/api/requests`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to create service request");

        // Show Simulated SMS / WhatsApp Dispatch Alert
        showSimulatedDispatchAlert({
            tracking_id: data.data ? data.data.tracking_id : `REQ-${Date.now().toString().slice(-6)}`,
            department: payload.department,
            priority: payload.priority,
            phone: payload.citizen_phone,
            sla_hours: payload.priority === "CRITICAL" ? 2 : (payload.priority === "HIGH" ? 6 : (payload.priority === "MEDIUM" ? 24 : 48))
        });

        // Reset form
        document.getElementById("scGrievanceForm").reset();

        // Switch to Track tab and view
        switchGrievanceTab("track");
        const searchInput = document.getElementById("grievanceSearchInput");
        if (searchInput && data.data && data.data.tracking_id) {
            searchInput.value = data.data.tracking_id;
        }
        loadMyGrievances();

    } catch (err) {
        alert("⚠️ " + (err.message || "Could not submit grievance. Please try again."));
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "🚀 Submit Grievance with Instant SLA";
        }
    }
}

async function loadMyGrievances() {
    const container = document.getElementById("grievanceListContainer");
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding:20px; color:#38bdf8;">🔄 Fetching active grievances & live SLA clocks...</div>`;

    const searchInput = document.getElementById("grievanceSearchInput");
    const query = searchInput ? searchInput.value.trim() : "";

    try {
        const token = (typeof SmartCityAuth !== "undefined") ? SmartCityAuth.getToken() : localStorage.getItem("sc_token");
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const url = query 
            ? `${BACKEND_URL}/api/requests?search=${encodeURIComponent(query)}&limit=15` 
            : `${BACKEND_URL}/api/requests?limit=15`;

        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error("HTTP error " + res.status);
        const data = await res.json();
        const list = data.data || [];

        if (list.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:36px 20px; color:#94a3b8;">
                    <div style="font-size:32px; margin-bottom:8px;">📭</div>
                    <div style="font-weight:600; color:#e2e8f0; margin-bottom:4px;">No Grievances Found</div>
                    <p style="font-size:12px; margin:0;">No complaints match your search query. Submit a new grievance using the tab above!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = list.map(req => renderGrievanceCard(req)).join("");
        updateAllSlaClocks();

    } catch (err) {
        container.innerHTML = `<div style="text-align:center; padding:20px; color:#f87171;">⚠️ Failed to load grievances. Please ensure backend is running.</div>`;
    }
}

function renderGrievanceCard(req) {
    const deptEmojis = {
        waste: "🗑️", traffic: "🚦", water: "💧",
        street_lights: "💡", healthcare: "🏥", emergency: "🚨"
    };
    const emoji = deptEmojis[req.department] || "📋";

    const statusColors = {
        OPEN: "#38bdf8",
        ASSIGNED: "#f59e0b",
        IN_PROGRESS: "#3b82f6",
        RESOLVED: "#10b981",
        CLOSED: "#64748b",
        ESCALATED: "#ef4444"
    };
    const statusCol = statusColors[req.status] || "#94a3b8";

    const targetTime = req.sla_target ? new Date(req.sla_target).getTime() : (new Date(req.created_at).getTime() + 24 * 3600 * 1000);
    const isResolved = req.status === "RESOLVED" || req.status === "CLOSED";

    return `
        <div class="sc-sla-card" id="reqCard-${req.id}">
            <div class="sc-sla-card-header">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:18px;">${emoji}</span>
                    <div>
                        <div style="font-weight:700; color:#f8fafc; font-size:14px;">
                            ${escapeHTML(req.category || req.department)}
                            <span style="font-size:11px; font-weight:600; color:#94a3b8; margin-left:6px;">#${escapeHTML(req.tracking_id || 'ID-' + req.id)}</span>
                        </div>
                        <div style="font-size:11px; color:#94a3b8;">📍 ${escapeHTML(req.location || 'Gorakhpur')}</div>
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                    <span style="padding:2px 8px; border-radius:4px; font-size:10px; font-weight:800; background:rgba(255,255,255,0.08); color:${statusCol}; border:1px solid ${statusCol}40;">
                        ${req.status}
                    </span>
                    <span style="font-size:10px; color:#94a3b8; font-weight:600;">Priority: ${req.priority || 'MEDIUM'}</span>
                </div>
            </div>

            <!-- SLA Live Countdown Banner -->
            ${!isResolved ? `
                <div style="display:flex; justify-content:space-between; align-items:center; margin:8px 0 4px 0;">
                    <span style="font-size:11px; color:#94a3b8; font-weight:600;">⏱️ SLA Resolution Clock:</span>
                    <span class="sc-sla-timer-pill normal" data-sla-target="${targetTime}" id="slaPill-${req.id}">
                        Calculating...
                    </span>
                </div>
                <div class="sc-sla-progress-track">
                    <div class="sc-sla-progress-fill" id="slaBar-${req.id}" style="width: 70%;"></div>
                </div>
            ` : `
                <div style="padding:6px 10px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:6px; margin:8px 0; font-size:12px; color:#34d399; display:flex; align-items:center; justify-content:space-between;">
                    <span>✅ Resolved by Municipal Staff</span>
                    <span style="font-size:10px; color:#94a3b8;">${new Date(req.resolved_at || req.updated_at).toLocaleDateString()}</span>
                </div>
            `}

            <div style="font-size:12px; color:#cbd5e1; line-height:1.4; margin-bottom:8px; background:rgba(0,0,0,0.2); padding:8px 10px; border-radius:6px;">
                ${escapeHTML(req.description || 'No additional details provided.')}
            </div>

            <!-- Staff Assignment & 5-Star Feedback Section -->
            <div style="display:flex; align-items:center; justify-content:space-between; border-top:1px solid rgba(255,255,255,0.06); padding-top:8px; margin-top:6px; font-size:11px;">
                <div style="color:#94a3b8;">
                    ${req.assigned_staff_name ? `👷 Assigned: <b style="color:#e2e8f0;">${escapeHTML(req.assigned_staff_name)}</b>` : `👷 Field Dispatch: <span style="color:#f59e0b;">Auto-Routing</span>`}
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="color:#94a3b8;">Rate Service:</span>
                    <div class="sc-rating-stars" data-req-id="${req.id}">
                        <span class="sc-star" onclick="rateGrievance(${req.id}, 1)">★</span>
                        <span class="sc-star" onclick="rateGrievance(${req.id}, 2)">★</span>
                        <span class="sc-star" onclick="rateGrievance(${req.id}, 3)">★</span>
                        <span class="sc-star" onclick="rateGrievance(${req.id}, 4)">★</span>
                        <span class="sc-star" onclick="rateGrievance(${req.id}, 5)">★</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function startSlaTickTimer() {
    if (slaTickInterval) return;
    slaTickInterval = setInterval(updateAllSlaClocks, 1000);
}

function updateAllSlaClocks() {
    const pills = document.querySelectorAll("[data-sla-target]");
    const now = Date.now();

    pills.forEach(pill => {
        const target = Number(pill.getAttribute("data-sla-target"));
        if (!target) return;

        const diff = target - now;
        const id = pill.id.replace("slaPill-", "");
        const bar = document.getElementById(`slaBar-${id}`);

        if (diff <= 0) {
            pill.className = "sc-sla-timer-pill breached";
            pill.textContent = "⚠️ SLA BREACHED";
            if (bar) {
                bar.style.width = "100%";
                bar.style.background = "#ef4444";
            }
        } else {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            if (hours < 1) {
                pill.className = "sc-sla-timer-pill warning";
            } else {
                pill.className = "sc-sla-timer-pill normal";
            }
            pill.textContent = `⏳ ${hours}h ${minutes}m ${seconds}s`;

            if (bar) {
                const totalWindow = 24 * 3600 * 1000;
                const pct = Math.max(5, Math.min(100, (diff / totalWindow) * 100));
                bar.style.width = `${pct}%`;
                bar.style.background = hours < 2 ? "#f59e0b" : "linear-gradient(90deg, #10b981, #3b82f6)";
            }
        }
    });
}

async function rateGrievance(requestId, rating) {
    const starContainer = document.querySelector(`.sc-rating-stars[data-req-id="${requestId}"]`);
    if (starContainer) {
        const stars = starContainer.querySelectorAll(".sc-star");
        stars.forEach((s, idx) => {
            if (idx < rating) s.classList.add("active");
            else s.classList.remove("active");
        });
    }

    try {
        const token = (typeof SmartCityAuth !== "undefined") ? SmartCityAuth.getToken() : localStorage.getItem("sc_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        await fetch(`${BACKEND_URL}/api/requests/${requestId}/feedback`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                rating: rating,
                comments: `Citizen rated ${rating} Stars via Grievance Portal`
            })
        });

        alert(`⭐ Thank you! Your ${rating}-star feedback has been registered.`);
    } catch (e) {
        console.warn("Feedback submit error:", e);
    }
}

// --------------------------------------------------------------------------
// 3. EXECUTIVE SMART CITY COMMAND CENTER (ICCC)
// --------------------------------------------------------------------------

function openCommandCenterModal() {
    const modal = document.getElementById("scCommandCenterModal");
    if (!modal) return;
    modal.classList.add("active");
    fetchCommandCenterData();
}

function closeCommandCenterModal() {
    const modal = document.getElementById("scCommandCenterModal");
    if (modal) modal.classList.remove("active");
}

async function fetchCommandCenterData() {
    try {
        const token = (typeof SmartCityAuth !== "undefined") ? SmartCityAuth.getToken() : localStorage.getItem("sc_token");
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${BACKEND_URL}/api/admin/command-center`, { headers });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();

        // Update KPI tiles
        const elActive = document.getElementById("ccMetricActiveReqs");
        const elCrit = document.getElementById("ccMetricCritical");
        const elBreach = document.getElementById("ccMetricBreached");
        const elLights = document.getElementById("ccMetricLights");
        const elAQI = document.getElementById("ccMetricAQI");
        const elAQIStatus = document.getElementById("ccMetricAQIStatus");
        const elICU = document.getElementById("ccMetricICUBeds");

        if (elActive) elActive.textContent = data.activeRequestsCount ?? "12";
        if (elCrit) elCrit.textContent = data.criticalRequestsCount ?? "2";
        if (elBreach) elBreach.textContent = data.slaBreachedCount ?? "0";
        if (elLights) elLights.textContent = `${data.streetLightsUptimePct ?? 98}%`;
        
        const aqi = data.averageAQI ?? 124;
        if (elAQI) elAQI.textContent = aqi;
        if (elAQIStatus) {
            elAQIStatus.textContent = aqi > 200 ? "Poor / Unhealthy" : (aqi > 100 ? "Moderate" : "Good");
            elAQIStatus.style.color = aqi > 200 ? "#f87171" : (aqi > 100 ? "#fbbf24" : "#34d399");
        }

        if (elICU) elICU.textContent = `${data.availableICUBeds ?? 28} Free`;

        // Update Anomaly Stream
        const anomalyContainer = document.getElementById("ccAnomalyList");
        if (anomalyContainer) {
            const anomalies = data.aiAnomalies || [
                { type: "TRAFFIC", message: "Asuran Chowk: Signal cycle delay detected (+14m queue)", severity: "HIGH" },
                { type: "ENVIRONMENT", message: "Golghar Commercial: PM2.5 surge (112 µg/m³)", severity: "MEDIUM" },
                { type: "WASTE", message: "Medical College Ward 4: Bin #22 fill-level reached 94%", severity: "HIGH" }
            ];

            anomalyContainer.innerHTML = anomalies.map(a => `
                <div class="sc-feed-item">
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                        <b style="color:${a.severity === 'HIGH' ? '#f87171' : '#fbbf24'}; font-size:11px;">⚠️ ${escapeHTML(a.type || 'ANOMALY')}</b>
                        <span style="font-size:10px; color:#94a3b8;">${a.severity || 'ALERT'}</span>
                    </div>
                    <div style="color:#e2e8f0;">${escapeHTML(a.message || a.description || '')}</div>
                </div>
            `).join("");
        }

        // Update SLA Escalation Queue
        const escContainer = document.getElementById("ccEscalationList");
        if (escContainer) {
            const escalations = data.urgentGrievances || [
                { id: "REQ-9021", dept: "waste", category: "Hospital Biohazard Overflow", sla_hours: 2, status: "CRITICAL" },
                { id: "REQ-8843", dept: "traffic", category: "Mohaddipur Red Light Failure", sla_hours: 4, status: "HIGH" },
                { id: "REQ-7612", dept: "water", category: "Town Hall Pipeline Burst", sla_hours: 6, status: "HIGH" }
            ];

            escContainer.innerHTML = escalations.map(e => `
                <div class="sc-feed-item">
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                        <b style="color:#38bdf8; font-size:11px;">#${escapeHTML(e.tracking_id || e.id)} • ${escapeHTML(e.category || e.dept)}</b>
                        <span style="font-size:10px; font-weight:700; color:${e.status === 'CRITICAL' ? '#f87171' : '#fbbf24'}">${e.status}</span>
                    </div>
                    <div style="color:#94a3b8; font-size:11px;">Department: ${escapeHTML(e.dept || e.department)} | Window: ${e.sla_hours || 6}h SLA</div>
                </div>
            `).join("");
        }

    } catch (err) {
        console.warn("Command center data fetch fallback:", err);
    }
}

// --------------------------------------------------------------------------
// 4. SIMULATED SMS / WHATSAPP DISPATCH ALERT PREVIEWS
// --------------------------------------------------------------------------

function showSimulatedDispatchAlert(ticket) {
    const existing = document.getElementById("scDispatchToast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "scDispatchToast";
    toast.className = "sc-dispatch-toast";
    toast.innerHTML = `
        <div style="font-size:24px;">📱</div>
        <div style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <b style="color:#10b981; font-size:12px;">SmartCity UP SMS Dispatch</b>
                <span style="font-size:10px; color:#94a3b8;">Just Now</span>
            </div>
            <div style="font-size:12px; line-height:1.4; color:#e2e8f0;">
                Dear Citizen, your complaint <b>#${escapeHTML(ticket.tracking_id)}</b> has been registered. 
                Field response SLA target: <b>${ticket.sla_hours} Hours</b>.
            </div>
            <div style="font-size:10px; color:#94a3b8; margin-top:4px;">
                Sent to: +91-${escapeHTML(ticket.phone.slice(-10))} • Verified Municipal Broadcast
            </div>
        </div>
        <button onclick="this.parentElement.remove()" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; font-size:14px; padding:0;">✕</button>
    `;

    document.body.appendChild(toast);

    if (typeof SmartCityRealtime !== "undefined" && SmartCityRealtime.playAlertSound) {
        SmartCityRealtime.playAlertSound("chime");
    }

    setTimeout(() => {
        if (toast && toast.parentElement) toast.remove();
    }, 7000);
}

// --------------------------------------------------------------------------
// 5. GLOBAL EXPORTS
// --------------------------------------------------------------------------

window.openGrievanceModal = openGrievanceModal;
window.closeGrievanceModal = closeGrievanceModal;
window.switchGrievanceTab = switchGrievanceTab;
window.handleDeptChange = handleDeptChange;
window.fillCurrentLocationForGrievance = fillCurrentLocationForGrievance;
window.handleGrievanceSubmit = handleGrievanceSubmit;
window.loadMyGrievances = loadMyGrievances;
window.rateGrievance = rateGrievance;
window.openCommandCenterModal = openCommandCenterModal;
window.closeCommandCenterModal = closeCommandCenterModal;
window.fetchCommandCenterData = fetchCommandCenterData;
window.showSimulatedDispatchAlert = showSimulatedDispatchAlert;
window.initVoiceAssistant = initVoiceAssistant;
window.speakAIText = speakAIText;