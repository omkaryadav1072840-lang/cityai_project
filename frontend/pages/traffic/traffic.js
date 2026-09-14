/* =========================================================
   SMARTCITY AI - GORAKHPUR TRAFFIC SYSTEM
   traffic.js (FIXED)
   ========================================================= */

const API = {
    MAP_TILES: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    GEOCODING: "https://nominatim.openstreetmap.org/search",
    ORS_KEY: "",
    ORS_ROUTE: "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
};

const GORAKHPUR = {
    lat: 26.7606,
    lng: 83.3732,
    zoom: 13
};

let map = null;
let userMarker = null;
let destinationMarker = null;
let routeLayer = null;

let userLocation = {
    lat: GORAKHPUR.lat,
    lng: GORAKHPUR.lng
};

document.addEventListener("DOMContentLoaded", () => {
    initializeMap();
    setupButtons();
    detectUserLocation();
    fetchCityStatus();
    startClock();
    initTrafficRealtime();
    setInterval(fetchCityStatus, 60000);
});


function initializeMap() {
    const mapElement = document.getElementById("map");
    if (!mapElement) return;

    map = L.map("map", { zoomControl: false }).setView([GORAKHPUR.lat, GORAKHPUR.lng], GORAKHPUR.zoom);

    L.tileLayer(API.MAP_TILES, {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    addGorakhpurMarker();
}

function addGorakhpurMarker() {
    L.marker([GORAKHPUR.lat, GORAKHPUR.lng])
        .addTo(map)
        .bindPopup(`
        <div class="map-popup">
            <strong>SmartCity AI</strong><br>
            Gorakhpur Traffic Center
        </div>
        `);
}

function detectUserLocation() {
    if (!navigator.geolocation) {
        showToast("Location service available nahi hai.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        position => {
            userLocation.lat = position.coords.latitude;
            userLocation.lng = position.coords.longitude;
            showUserLocation();
        },
        error => {
            console.warn("Location permission denied.");
            userLocation.lat = GORAKHPUR.lat;
            userLocation.lng = GORAKHPUR.lng;
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
}

function showUserLocation() {
    if (!map) return;

    if (userMarker) {
        userMarker.setLatLng([userLocation.lat, userLocation.lng]);
        return;
    }

    userMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 9,
        fillColor: "#2563eb",
        color: "#ffffff",
        weight: 3,
        fillOpacity: 1
    }).addTo(map).bindPopup("📍 Your Current Location");
}

async function searchDestination(query) {
    if (!query) {
        showToast("Destination enter karo.");
        return null;
    }

    try {
        const url = API.GEOCODING + "?format=json&q=" + encodeURIComponent(query + ", Gorakhpur, India") + "&limit=5";
        const response = await fetch(url, { headers: { "Accept": "application/json" } });

        if (!response.ok) throw new Error("Geocoding failed");

        const data = await response.json();

        if (!data.length) {
            showToast("Location nahi mili.");
            return null;
        }

        return {
            name: data[0].display_name,
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
        };
    } catch (error) {
        console.error("SEARCH ERROR:", error);
        showToast("Location search failed.");
        return null;
    }
}

async function findRoute() {
    const input = document.getElementById("destinationInput");
    if (!input) return;

    const query = input.value.trim();
    const destination = await searchDestination(query);

    if (!destination) return;
    showDestination(destination);

    if (API.ORS_KEY.trim() !== "") {
        await getRealRoute(destination);
    } else {
        drawFallbackRoute(destination);
        showToast("Demo route active. ORS key add karne par road navigation milega.");
    }
}

function showDestination(destination) {
    if (destinationMarker) map.removeLayer(destinationMarker);

    destinationMarker = L.marker([destination.lat, destination.lng])
        .addTo(map)
        .bindPopup(`<strong>Destination</strong><br>${destination.name}`)
        .openPopup();

    map.setView([destination.lat, destination.lng], 14);
}

async function getRealRoute(destination) {
    try {
        showToast("Real road route calculate ho raha hai...");

        const response = await fetch(API.ORS_ROUTE, {
            method: "POST",
            headers: {
                "Authorization": API.ORS_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                coordinates: [
                    [userLocation.lng, userLocation.lat],
                    [destination.lng, destination.lat]
                ],
                instructions: true,
                instructions_format: "text"
            })
        });

        if (!response.ok) throw new Error(`ORS Error: ${response.status}`);

        const route = await response.json();
        drawRealRoute(route);
        showRouteInformation(route);

    } catch (error) {
        console.error(error);
        drawFallbackRoute(destination);
        showToast("Routing API unavailable. Fallback route shown.");
    }
}

function drawRealRoute(route) {
    if (routeLayer) map.removeLayer(routeLayer);

    routeLayer = L.geoJSON(route, {
        style: { color: "#2563eb", weight: 6, opacity: 0.9 }
    }).addTo(map);

    map.fitBounds(routeLayer.getBounds(), { padding: [40, 40] });
}

function drawFallbackRoute(destination) {
    if (routeLayer) map.removeLayer(routeLayer);

    routeLayer = L.polyline(
        [[userLocation.lat, userLocation.lng], [destination.lat, destination.lng]],
        { color: "#2563eb", weight: 5, dashArray: "10 8", opacity: 0.8 }
    ).addTo(map);

    map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
}

function showRouteInformation(route) {
    try {
        const summary = route.features[0].properties.summary;
        const distanceVal = (summary.distance / 1000).toFixed(1);
        const durationVal = Math.round(summary.duration / 60);

        // Fixed HTML ID Matching
        updateElement("distance", `${distanceVal} km`);
        updateElement("routeTime", `${durationVal} min`);

    } catch (error) {
        console.warn("Route information unavailable.");
    }
}

function setupButtons() {
    // Fixed: Was searchRouteBtn, HTML has routeBtn
    const searchButton = document.getElementById("routeBtn");
    if (searchButton) {
        searchButton.addEventListener("click", findRoute);
    }

    const input = document.getElementById("destinationInput");
    if (input) {
        input.addEventListener("keydown", event => {
            if (event.key === "Enter") findRoute();
        });
    }

    // Fixed: Was locateMeBtn, HTML has locationBtn
    const locateButton = document.getElementById("locationBtn");
    if (locateButton) {
        locateButton.addEventListener("click", () => {
            detectUserLocation();
            if (userMarker) {
                map.setView([userLocation.lat, userLocation.lng], 16);
            }
        });
    }
    // Wire refresh button
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            fetchCityStatus();
            showToast("Traffic & city status refreshed.");
        });
    }
}

async function fetchCityStatus() {
    try {
        const res = await fetch("http://localhost:5000/api/city-status");
        if (!res.ok) throw new Error("Status code: " + res.status);
        const data = await res.json();
        updateTrafficStatusUI(data);
    } catch (err) {
        console.warn("Could not fetch city status from backend:", err);
    }
}

function updateTrafficStatusUI(data) {
    if (!data) return;
    const traffic = data.traffic || "Moderate";
    const temp = data.temperature !== undefined ? `${data.temperature}°C` : "31°C";
    const aqi = data.aqi || 82;

    updateElement("trafficLevel", traffic);
    updateElement("trafficResult", `${traffic} Traffic`);
    updateElement("temperature", temp);
    updateElement("weather", `${temp} (AQI ${aqi})`);
    updateElement("weatherText", `Gorakhpur • ${temp}`);

    const desc = document.getElementById("trafficDescription");
    if (desc) {
        desc.textContent = `Live status: ${traffic} traffic flow. Real-time AQI is ${aqi}.`;
    }

    const warning = document.getElementById("weatherWarning");
    if (warning) {
        warning.textContent = `AQI: ${aqi} (Satisfactory). Active emergency ambulances: ${data.ambulances || 12}.`;
    }

    const meter = document.getElementById("trafficMeter");
    if (meter) {
        let width = "50%";
        let bg = "#f59e0b";
        const lower = traffic.toLowerCase();
        if (lower.includes("low") || lower.includes("clear") || lower.includes("light")) {
            width = "25%";
            bg = "#10b981";
        } else if (lower.includes("mod")) {
            width = "50%";
            bg = "#f59e0b";
        } else if (lower.includes("heavy")) {
            width = "75%";
            bg = "#f97316";
        } else if (lower.includes("severe") || lower.includes("jam")) {
            width = "95%";
            bg = "#ef4444";
        }
        meter.style.width = width;
        meter.style.backgroundColor = bg;
    }
}

function startClock() {
    const clockEl = document.getElementById("clock");
    if (!clockEl) return;
    function tick() {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }
    tick();
    setInterval(tick, 1000);
}

function showToast(message) {
    // Fixed: Map to existing UI HTML toast ID
    const toast = document.getElementById("toast");
    if (toast) {
        toast.textContent = message;
        toast.classList.add("show");

        clearTimeout(window.smartToastTimer);
        window.smartToastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 3500);
    }
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

/* =========================================================
   REAL-TIME TRAFFIC & CORRIDOR SOCKETS
========================================================= */

let trafficAmbulanceMarkers = {};

function initTrafficRealtime() {
    if (typeof SmartCityRealtime === "undefined") return;

    SmartCityRealtime.init();
    SmartCityRealtime.renderLiveIndicator(".nav-brand");

    SmartCityRealtime.onAmbulanceLocation((amb) => {
        if (!amb || !amb.latitude || !amb.longitude || !map) return;

        const ambKey = String(amb.id || amb.ambulance_id || amb.vehicle_number);
        const lat = Number(amb.latitude);
        const lng = Number(amb.longitude);

        if (trafficAmbulanceMarkers[ambKey]) {
            trafficAmbulanceMarkers[ambKey].setLatLng([lat, lng]);
        } else {
            const ambIcon = L.divIcon({
                className: "traffic-amb-marker",
                html: `<div style="background:#ef4444; color:#fff; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 10px rgba(239,68,68,0.8); border:2px solid #fff; font-size:14px;">🚑</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });
            const marker = L.marker([lat, lng], { icon: ambIcon }).addTo(map);
            marker.bindPopup(`<b>🚑 Emergency Vehicle En Route</b><br>${amb.vehicle_number || ambKey}<br>Priority Transit Corridor Active`);
            trafficAmbulanceMarkers[ambKey] = marker;
        }
    });

    SmartCityRealtime.onEmergencyAlert((alert) => {
        SmartCityRealtime.playAlertSound("emergency");
        SmartCityRealtime.showBroadcastBanner(
            "🚨 EMERGENCY TRAFFIC ADVISORY",
            `Urgent emergency reported at ${alert.location || 'Gorakhpur'}. Emergency services dispatched. Please yield right of way.`,
            "danger"
        );
    });
}
