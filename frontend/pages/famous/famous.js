/* =====================================================
   SMARTCITY AI - GORAKHPUR: SMART TOURISM & HERITAGE EXPLORER
   Client-side GIS, Directory, AI Assistant, Planner & Smart Services
===================================================== */

// Global State
let allPlaces = [];
let activeCategory = "All";
let searchQuery = "";
let sortOption = "default";
let userCoords = null;
let currentSelectedPlace = null;
let userFavorites = new Set();
let placeMap = null;
let placeMarkers = [];
let nearbyLayerGroups = {
    hospitals: null,
    police: null,
    parking: null,
    atms: null,
    food: null,
    route: null
};
let activeLayers = {
    hospitals: false,
    police: false,
    parking: false,
    atms: false,
    food: false
};
let aiChatHistory = [];

const GORAKHPUR_CENTER = {
    lat: 26.7606,
    lng: 83.3732
};

// Category SVG Icons and Color Tokens
const CATEGORY_META = {
    "Religious": { icon: "🕉️", color: "#ea580c", badgeClass: "badge-Religious" },
    "Nature": { icon: "🌿", color: "#059669", badgeClass: "badge-Nature" },
    "Cultural": { icon: "🎨", color: "#7c3aed", badgeClass: "badge-Cultural" },
    "Historical": { icon: "📜", color: "#b45309", badgeClass: "badge-Historical" },
    "Educational": { icon: "🔭", color: "#2563eb", badgeClass: "badge-Educational" },
    "Family & Recreation": { icon: "🎡", color: "#db2777", badgeClass: "badge-Family" },
    "Heritage": { icon: "🏛️", color: "#0891b2", badgeClass: "badge-Heritage" }
};

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener("DOMContentLoaded", function () {
    initializeMap();
    setupAuthBadge();
    checkStaffAccess();
    loadAllPlaces();
    loadCategoryStats();
    loadUserFavorites();
    loadNearbyParking();
    updateLiveTime();

    // Check URL query parameters for direct place inspection (e.g. ?place=ramgarh-taal)
    const urlParams = new URLSearchParams(window.location.search);
    const placeSlug = urlParams.get("place");
    if (placeSlug) {
        setTimeout(() => {
            const found = allPlaces.find(p => p.slug === placeSlug);
            if (found) {
                selectPlaceSpotlight(found);
                openPlaceDetails(found.id);
            }
        }, 800);
    }
});

// Setup user auth header and check staff portal visibility
function setupAuthBadge() {
    if (typeof SmartCityAuth !== "undefined" && typeof SmartCityAuth.renderUserHeader === "function") {
        SmartCityAuth.renderUserHeader();
    }
}

function checkStaffAccess() {
    if (typeof SmartCityAuth !== "undefined" && typeof SmartCityAuth.isStaff === "function") {
        const isStaff = SmartCityAuth.isStaff();
        const adminBtn = document.getElementById("adminPortalBtn");
        if (adminBtn) {
            adminBtn.style.display = isStaff ? "inline-flex" : "none";
        }
    }
}

// =====================================================
// LEAFLET MAP INITIALIZATION & GIS CONTROLS
// =====================================================
function initializeMap() {
    const mapEl = document.getElementById("placeMap");
    if (!mapEl || typeof L === "undefined") return;

    placeMap = L.map("placeMap", {
        scrollWheelZoom: true
    }).setView([GORAKHPUR_CENTER.lat, GORAKHPUR_CENTER.lng], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Gorakhpur SmartCity AI'
    }).addTo(placeMap);

    // Initialize Layer Groups for Nearby Smart Services
    nearbyLayerGroups.hospitals = L.layerGroup().addTo(placeMap);
    nearbyLayerGroups.police = L.layerGroup().addTo(placeMap);
    nearbyLayerGroups.parking = L.layerGroup().addTo(placeMap);
    nearbyLayerGroups.atms = L.layerGroup().addTo(placeMap);
    nearbyLayerGroups.food = L.layerGroup().addTo(placeMap);
    nearbyLayerGroups.route = L.layerGroup().addTo(placeMap);
}

function createCategoryPin(category) {
    const meta = CATEGORY_META[category] || { icon: "📍", color: "#0284c7" };
    return L.divIcon({
        className: "custom-marker-wrapper",
        html: `
            <div class="custom-category-pin" style="background: ${meta.color}; width: 38px; height: 38px;">
                ${meta.icon}
            </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -20]
    });
}

function renderMapMarkers(placesToRender) {
    if (!placeMap) return;

    // Clear existing place markers
    placeMarkers.forEach(m => placeMap.removeLayer(m));
    placeMarkers = [];

    placesToRender.forEach(place => {
        const pinIcon = createCategoryPin(place.category);
        const marker = L.marker([place.latitude, place.longitude], { icon: pinIcon }).addTo(placeMap);

        const popupHtml = `
            <div class="map-popup-card">
                <img src="${place.image_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'}" class="map-popup-img" alt="${place.name}">
                <div class="map-popup-cat">${place.category}</div>
                <div class="map-popup-title">${place.name}</div>
                <div class="map-popup-loc">📍 ${place.locality || place.address}</div>
                <div class="map-popup-actions">
                    <button class="map-popup-btn primary" onclick="openPlaceDetails(${place.id})">
                        View Details
                    </button>
                    <button class="map-popup-btn secondary" onclick="navigateCoordinates(${place.latitude}, ${place.longitude})">
                        🧭 Directions
                    </button>
                </div>
            </div>
        `;

        marker.bindPopup(popupHtml);
        marker.on("click", () => {
            selectPlaceSpotlight(place);
        });

        placeMarkers.push(marker);
    });
}

function fitAllPlaces() {
    if (!placeMap || placeMarkers.length === 0) return;
    const group = new L.featureGroup(placeMarkers);
    placeMap.fitBounds(group.getBounds().pad(0.15));
}

function centerGorakhpur() {
    if (!placeMap) return;
    placeMap.flyTo([GORAKHPUR_CENTER.lat, GORAKHPUR_CENTER.lng], 13, { duration: 1.2 });
    showToast("📍 Centered on Gorakhpur");
}

function getUserCurrentLocation() {
    if (!navigator.geolocation) {
        showToast("⚠️ Geolocation is not supported by your browser.");
        return;
    }

    showToast("🛰️ Detecting your current location...");
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            userCoords = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            };

            const userIcon = L.divIcon({
                className: "user-loc-pin",
                html: `
                    <div style="background:#10b981; width:22px; height:22px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px rgba(16,185,129,0.8);"></div>
                `,
                iconSize: [22, 22],
                iconAnchor: [11, 11]
            });

            L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
                .addTo(placeMap)
                .bindPopup("<strong>📍 You are here</strong>")
                .openPopup();

            placeMap.flyTo([userCoords.lat, userCoords.lng], 14, { duration: 1.2 });
            showToast("✅ Location detected!");

            // Re-render place cards to show distances
            renderPlacesGrid(getFilteredPlaces());
        },
        (err) => {
            console.warn("Geolocation denied or error:", err.message);
            showToast("ℹ️ Location access not granted. Standard view applied.");
        },
        { timeout: 10000, enableHighAccuracy: true }
    );
}

// Toggle Nearby Infrastructure Layers on Map
async function toggleMapLayer(layerName) {
    if (!placeMap) return;
    const btn = document.getElementById(`layer${layerName.charAt(0).toUpperCase() + layerName.slice(1)}Btn`);
    activeLayers[layerName] = !activeLayers[layerName];

    if (btn) {
        btn.classList.toggle("active", activeLayers[layerName]);
    }

    if (!activeLayers[layerName]) {
        if (nearbyLayerGroups[layerName]) {
            nearbyLayerGroups[layerName].clearLayers();
        }
        showToast(`Layer hidden: ${layerName}`);
        return;
    }

    showToast(`Loading ${layerName} on map...`);
    const place = currentSelectedPlace || allPlaces[0];
    const placeId = place ? place.id : 1;

    if (layerName === "hospitals") {
        try {
            const res = await fetch(`/api/famous-places/${placeId}/nearby-services`);
            const data = await res.json();
            let hospitals = (data.services && data.services.hospitals) ? data.services.hospitals : [];

            if (hospitals.length === 0) {
                const hRes = await fetch("/api/hospitals");
                const hData = await hRes.json();
                hospitals = hData.hospitals || [];
            }

            nearbyLayerGroups.hospitals.clearLayers();
            hospitals.forEach(h => {
                if (h.latitude && h.longitude) {
                    const icon = L.divIcon({
                        html: `<div style="background:#ef4444; width:30px; height:30px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; font-size:15px; box-shadow:0 2px 8px rgba(0,0,0,0.35);">🏥</div>`,
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    });
                    const popup = `
                        <div style="min-width: 200px;">
                            <strong style="color: #ef4444; font-size: 13px;">🏥 ${h.hospital_name}</strong>
                            <p style="margin: 4px 0 6px 0; font-size: 11.5px; color: #475569;">📍 ${h.address || ''}</p>
                            <div style="font-size: 11px; color: #334155; margin-bottom: 6px;">
                                <span>🛏️ Beds: ${h.total_beds || 'N/A'}</span> • <span>🚨 ICU: ${h.icu_beds || 0}</span>
                            </div>
                            <div style="font-size: 11px; margin-bottom: 8px;">
                                📞 <a href="tel:${h.emergency_number || h.phone || '112'}" style="color: #ef4444; font-weight: 700;">${h.emergency_number || h.phone || '112'}</a>
                            </div>
                            <a href="${h.booking_url || `../hospital/hospital.html?hospital=${h.id}`}" class="primary-small" style="display: block; text-align: center; text-decoration: none; padding: 4px 8px; font-size: 11px;">
                                Open Healthcare Module →
                            </a>
                        </div>
                    `;
                    L.marker([h.latitude, h.longitude], { icon })
                        .addTo(nearbyLayerGroups.hospitals)
                        .bindPopup(popup);
                }
            });
            showToast(`✅ ${hospitals.length} Hospitals displayed on map`);
        } catch (e) {
            showToast("Error loading hospitals layer");
        }
    } else if (layerName === "police") {
        try {
            const res = await fetch("/api/police/stations");
            const data = await res.json();
            const stations = data.stations || [];

            nearbyLayerGroups.police.clearLayers();
            stations.forEach(p => {
                if (p.latitude && p.longitude) {
                    const icon = L.divIcon({
                        html: `<div style="background:#1e40af; width:30px; height:30px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; font-size:15px; box-shadow:0 2px 8px rgba(0,0,0,0.35);">🚔</div>`,
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    });
                    L.marker([p.latitude, p.longitude], { icon })
                        .addTo(nearbyLayerGroups.police)
                        .bindPopup(`
                            <div style="min-width: 190px;">
                                <strong style="color: #1e40af; font-size: 13px;">🚔 ${p.name}</strong>
                                <p style="margin: 4px 0 6px 0; font-size: 11.5px; color: #475569;">📍 ${p.location || ''}</p>
                                <div style="font-size: 11px; margin-bottom: 6px;">
                                    📞 <a href="tel:${p.phone || '112'}" style="color: #1e40af; font-weight: 700;">${p.phone || '112'}</a>
                                </div>
                                <a href="../police/police.html" class="primary-small" style="display: block; text-align: center; text-decoration: none; padding: 4px 8px; font-size: 11px;">
                                    Open Police Module →
                                </a>
                            </div>
                        `);
                }
            });
            showToast(`✅ ${stations.length} Police stations displayed on map`);
        } catch (e) {
            showToast("Error loading police layer");
        }
    } else if (layerName === "parking") {
        try {
            const res = await fetch(`/api/famous-places/${placeId}/nearby-services`);
            const data = await res.json();
            let lots = (data.services && data.services.parking) ? data.services.parking : [];

            if (lots.length === 0) {
                const pRes = await fetch("/api/parking");
                const pData = await pRes.json();
                lots = (pData.lots || pData.parking || []);
            }

            nearbyLayerGroups.parking.clearLayers();
            lots.forEach(pk => {
                if (pk.latitude && pk.longitude) {
                    const icon = L.divIcon({
                        html: `<div style="background:#0284c7; width:30px; height:30px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; font-size:15px; box-shadow:0 2px 8px rgba(0,0,0,0.35);">🅿️</div>`,
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    });
                    const bookUrl = pk.booking_url || `../parking/parking.html?lot=${pk.parking_code}&book=true`;
                    L.marker([pk.latitude, pk.longitude], { icon })
                        .addTo(nearbyLayerGroups.parking)
                        .bindPopup(`
                            <div style="min-width: 190px;">
                                <strong style="color: #0284c7; font-size: 13px;">🅿️ ${pk.name}</strong>
                                <p style="margin: 4px 0 6px 0; font-size: 11.5px; color: #475569;">📍 ${pk.address || pk.area || 'Gorakhpur'}</p>
                                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px;">
                                    <span style="color: #16a34a; font-weight: 700;">${pk.available_slots || 0} vacant</span>
                                    <span style="color: #64748b;">₹${pk.hourly_rate || 20}/hr</span>
                                </div>
                                <a href="${bookUrl}" class="primary-small" style="display: block; text-align: center; text-decoration: none; padding: 4px 8px; font-size: 11px;">
                                    ⚡ E-Book Slot in Parking Module →
                                </a>
                            </div>
                        `);
                }
            });
            showToast(`✅ ${lots.length} Smart parking lots displayed`);
        } catch (e) {
            showToast("Error loading parking layer");
        }
    } else if (layerName === "atms") {
        try {
            const res = await fetch(`/api/famous-places/${placeId}/nearby-atms`);
            const data = await res.json();
            const atms = data.atms || [];

            nearbyLayerGroups.atms.clearLayers();
            atms.forEach(atm => {
                if (atm.latitude && atm.longitude) {
                    const icon = L.divIcon({
                        html: `<div style="background:#059669; width:30px; height:30px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; font-size:15px; box-shadow:0 2px 8px rgba(0,0,0,0.35);">🏧</div>`,
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    });
                    L.marker([atm.latitude, atm.longitude], { icon })
                        .addTo(nearbyLayerGroups.atms)
                        .bindPopup(`
                            <div style="min-width: 190px;">
                                <strong style="color: #059669; font-size: 13px;">🏧 ${atm.bank_name || atm.name}</strong>
                                <p style="margin: 4px 0 6px 0; font-size: 11.5px; color: #475569;">📍 ${atm.address || atm.locality}</p>
                                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px;">
                                    <span style="color: #16a34a; font-weight: 700;">${atm.is_24_7 ? '🟢 24/7 Open' : '🟡 Limited Hours'}</span>
                                    <span style="color: #0284c7; font-weight: 700;">${atm.distance_km} km away</span>
                                </div>
                                <button class="primary-small" style="width: 100%; padding: 4px 8px; font-size: 11px;" onclick="drawServiceRoute(${place.latitude}, ${place.longitude}, ${atm.latitude}, ${atm.longitude}, '${atm.bank_name.replace(/'/g, "\\'")}', ${atm.distance_km}, '🏧')">
                                    🧭 Trace Route on Map
                                </button>
                            </div>
                        `);
                }
            });
            showToast(`✅ ${atms.length} ATMs displayed near ${place.name}`);
        } catch (e) {
            showToast("Error loading ATMs layer");
        }
    } else if (layerName === "food") {
        try {
            const res = await fetch(`/api/famous-places/${placeId}/nearby-food`);
            const data = await res.json();
            const foods = data.restaurants || data.food || [];

            nearbyLayerGroups.food.clearLayers();
            foods.forEach(f => {
                if (f.latitude && f.longitude) {
                    const icon = L.divIcon({
                        html: `<div style="background:#ea580c; width:30px; height:30px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; font-size:15px; box-shadow:0 2px 8px rgba(0,0,0,0.35);">🍴</div>`,
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    });
                    L.marker([f.latitude, f.longitude], { icon })
                        .addTo(nearbyLayerGroups.food)
                        .bindPopup(`
                            <div style="min-width: 210px;">
                                <strong style="color: #ea580c; font-size: 13px;">🍴 ${f.name}</strong>
                                <div style="font-size: 11px; color: #64748b; margin: 2px 0;">${f.cuisine}</div>
                                <p style="margin: 4px 0 6px 0; font-size: 11.5px; color: #475569;">📍 ${f.address || f.locality}</p>
                                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px;">
                                    <span style="color: #f59e0b; font-weight: 700;">⭐ ${f.rating}</span>
                                    <span style="color: #0284c7; font-weight: 700;">${f.distance_km} km away</span>
                                </div>
                                <button class="primary-small" style="width: 100%; padding: 4px 8px; font-size: 11px;" onclick="drawServiceRoute(${place.latitude}, ${place.longitude}, ${f.latitude}, ${f.longitude}, '${f.name.replace(/'/g, "\\'")}', ${f.distance_km}, '🍴')">
                                    🧭 Trace Route on Map
                                </button>
                            </div>
                        `);
                }
            });
            showToast(`✅ ${foods.length} Restaurants displayed near ${place.name}`);
        } catch (e) {
            showToast("Error loading dining layer");
        }
    }
}

// =====================================================
// GIS SERVICE ROUTING & INTERACTIVE NAVIGATION
// =====================================================
function drawServiceRoute(originLat, originLng, destLat, destLng, serviceName, distanceKm, iconEmoji = "📍") {
    if (!placeMap) return;

    if (nearbyLayerGroups.route) {
        nearbyLayerGroups.route.clearLayers();
    }

    const latlngs = [
        [Number(originLat), Number(originLng)],
        [Number(destLat), Number(destLng)]
    ];

    const routeLine = L.polyline(latlngs, {
        color: "#0284c7",
        weight: 5,
        opacity: 0.85,
        dashArray: "8, 10",
        lineCap: "round",
        lineJoin: "round"
    }).addTo(nearbyLayerGroups.route);

    // Target waypoint marker
    const targetIcon = L.divIcon({
        html: `<div style="background: #0284c7; color: white; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 12px rgba(2,132,199,0.5);">${iconEmoji}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
    });
    L.marker([Number(destLat), Number(destLng)], { icon: targetIcon })
        .addTo(nearbyLayerGroups.route)
        .bindPopup(`<strong>${iconEmoji} ${serviceName}</strong><br>Distance: <strong>${distanceKm} km</strong>`)
        .openPopup();

    placeMap.fitBounds(routeLine.getBounds().pad(0.3));

    const banner = document.getElementById("serviceRouteBanner");
    const iconEl = document.getElementById("routeBannerIcon");
    const textEl = document.getElementById("routeBannerText");
    const navBtn = document.getElementById("routeNavExternalBtn");

    if (iconEl) iconEl.textContent = iconEmoji;
    if (textEl) {
        const estWalk = Math.max(2, Math.round(distanceKm * 12));
        textEl.innerHTML = `Route: <strong>${serviceName}</strong> (${distanceKm} km • ~${estWalk} mins walk)`;
    }
    if (navBtn) {
        navBtn.onclick = () => {
            window.open(`https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}`, "_blank");
        };
    }
    if (banner) banner.style.display = "flex";
}

function clearServiceRoute() {
    if (nearbyLayerGroups.route) {
        nearbyLayerGroups.route.clearLayers();
    }
    const banner = document.getElementById("serviceRouteBanner");
    if (banner) banner.style.display = "none";
}

// =====================================================
// NEARBY SERVICES ACTIONS (HOSPITALS, PARKING, ATMS, FOOD)
// =====================================================
async function openNearbyHospitals() {
    const place = currentSelectedPlace || allPlaces[0];
    const placeId = place ? place.id : 1;
    const placeName = place ? place.name : "Destination";

    showToast(`🏥 Fetching verified hospitals near ${placeName}...`);

    try {
        const res = await fetch(`/api/famous-places/${placeId}/nearby-services`);
        const data = await res.json();
        const hospitals = (data.services && data.services.hospitals) ? data.services.hospitals : [];

        if (hospitals.length === 0) {
            window.location.href = "../hospital/hospital.html";
            return;
        }

        const listEl = document.getElementById("nearbyServicesModalList");
        const titleEl = document.getElementById("nearbyServicesModalTitle");
        const subEl = document.getElementById("nearbyServicesModalSub");

        if (titleEl) titleEl.innerHTML = `🏥 Hospitals Near ${placeName}`;
        if (subEl) subEl.textContent = `Direct integration with Gorakhpur Healthcare Module (${hospitals.length} verified hospitals found)`;

        if (listEl) {
            listEl.innerHTML = hospitals.map(h => `
                <div style="background: #f8fafc; border: 1px solid var(--border); border-left: 4px solid #ef4444; border-radius: 8px; padding: 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <span style="font-size: 11px; font-weight: 700; color: #ef4444; text-transform: uppercase;">${h.hospital_type || 'Hospital'}</span>
                            <h4 style="font-size: 15px; margin: 2px 0 4px 0; color: #0f172a;">${h.hospital_name}</h4>
                            <p style="font-size: 12px; color: #64748b; margin: 0 0 6px 0;">📍 ${h.address}</p>
                        </div>
                        <span style="background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 12px; font-size: 11.5px; font-weight: 700;">
                            📍 ${h.distance_km} km
                        </span>
                    </div>

                    <div style="display: flex; gap: 14px; font-size: 12px; color: #334155; margin-bottom: 12px; flex-wrap: wrap;">
                        <span>🛏️ Total Beds: <strong>${h.total_beds || 'N/A'}</strong></span>
                        <span>🚨 ICU: <strong>${h.icu_beds || 0}</strong></span>
                        <span>🚑 Emergency: <strong>${h.emergency_beds || 0}</strong></span>
                        <span>📞 <strong>${h.emergency_number || h.phone || '112'}</strong></span>
                    </div>

                    <div style="display: flex; gap: 8px;">
                        <a href="${h.booking_url || `../hospital/hospital.html?hospital=${h.id}`}" class="primary-btn" style="flex: 1; text-decoration: none; justify-content: center; font-size: 12px; padding: 8px; display: flex; align-items: center;">
                            🏥 Open in Healthcare Module →
                        </a>
                        <button class="secondary-btn" style="padding: 8px 12px; font-size: 12px;" onclick="navigateCoordinates(${h.latitude}, ${h.longitude})">
                            🧭 Navigate
                        </button>
                    </div>
                </div>
            `).join("");
        }

        openModal("nearbyServicesModal");
    } catch (e) {
        window.location.href = "../hospital/hospital.html";
    }
}

async function openNearbyParking() {
    const place = currentSelectedPlace || allPlaces[0];
    const placeId = place ? place.id : 1;
    const placeName = place ? place.name : "Destination";

    showToast(`🅿️ Finding nearest smart parking lot for ${placeName}...`);

    try {
        const res = await fetch(`/api/famous-places/${placeId}/nearby-services`);
        const data = await res.json();
        const lots = (data.services && data.services.parking) ? data.services.parking : [];

        if (lots.length > 0) {
            const nearest = lots[0];
            showToast(`🅿️ Nearest Parking: ${nearest.name} (${nearest.available_slots} slots available). Opening parking module...`);
            setTimeout(() => {
                window.location.href = nearest.booking_url || `../parking/parking.html?lot=${nearest.parking_code}&book=true`;
            }, 600);
        } else {
            window.location.href = "../parking/parking.html";
        }
    } catch (e) {
        window.location.href = "../parking/parking.html";
    }
}

async function showNearbyATMsOnMap() {
    if (!placeMap) return;
    const place = currentSelectedPlace || allPlaces[0];
    if (!place) {
        showToast("Please select a destination first.");
        return;
    }

    scrollToMap();
    showToast(`🏧 Finding nearest ATMs around ${place.name}...`);

    try {
        const res = await fetch(`/api/famous-places/${place.id}/nearby-atms`);
        const data = await res.json();
        const atms = data.atms || [];

        if (atms.length === 0) {
            showToast("No ATMs found within search radius.");
            return;
        }

        activeLayers.atms = true;
        const btn = document.getElementById("layerAtmsBtn");
        if (btn) btn.classList.add("active");

        nearbyLayerGroups.atms.clearLayers();
        atms.forEach(atm => {
            if (atm.latitude && atm.longitude) {
                const icon = L.divIcon({
                    html: `<div style="background:#059669; width:30px; height:30px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; font-size:15px; box-shadow:0 2px 8px rgba(0,0,0,0.35);">🏧</div>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });
                L.marker([atm.latitude, atm.longitude], { icon })
                    .addTo(nearbyLayerGroups.atms)
                    .bindPopup(`
                        <div style="min-width: 190px;">
                            <strong style="color: #059669; font-size: 13px;">🏧 ${atm.bank_name || atm.name}</strong>
                            <p style="margin: 4px 0 6px 0; font-size: 11.5px; color: #475569;">📍 ${atm.address || atm.locality}</p>
                            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px;">
                                <span style="color: #16a34a; font-weight: 700;">${atm.is_24_7 ? '🟢 24/7 Open' : '🟡 Limited Hours'}</span>
                                <span style="color: #0284c7; font-weight: 700;">${atm.distance_km} km away</span>
                            </div>
                            <button class="primary-small" style="width: 100%; padding: 4px 8px; font-size: 11px;" onclick="drawServiceRoute(${place.latitude}, ${place.longitude}, ${atm.latitude}, ${atm.longitude}, '${atm.bank_name.replace(/'/g, "\\'")}', ${atm.distance_km}, '🏧')">
                                🧭 Trace Route on Map
                            </button>
                        </div>
                    `);
            }
        });

        const nearest = atms[0];
        drawServiceRoute(place.latitude, place.longitude, nearest.latitude, nearest.longitude, nearest.bank_name || nearest.name, nearest.distance_km, "🏧");
        showToast(`🏧 Nearest ATM: ${nearest.bank_name || nearest.name} (${nearest.distance_km} km away)`);
    } catch (e) {
        console.error("ATM route error:", e);
        showToast("Error locating nearby ATMs.");
    }
}

async function showNearbyFoodOnMap() {
    if (!placeMap) return;
    const place = currentSelectedPlace || allPlaces[0];
    if (!place) {
        showToast("Please select a destination first.");
        return;
    }

    scrollToMap();
    showToast(`🍴 Finding restaurants & dining around ${place.name}...`);

    try {
        const res = await fetch(`/api/famous-places/${place.id}/nearby-food`);
        const data = await res.json();
        const foods = data.restaurants || data.food || [];

        if (foods.length === 0) {
            showToast("No eateries found within search radius.");
            return;
        }

        activeLayers.food = true;
        const btn = document.getElementById("layerFoodBtn");
        if (btn) btn.classList.add("active");

        nearbyLayerGroups.food.clearLayers();
        foods.forEach(f => {
            if (f.latitude && f.longitude) {
                const icon = L.divIcon({
                    html: `<div style="background:#ea580c; width:30px; height:30px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; font-size:15px; box-shadow:0 2px 8px rgba(0,0,0,0.35);">🍴</div>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });
                L.marker([f.latitude, f.longitude], { icon })
                    .addTo(nearbyLayerGroups.food)
                    .bindPopup(`
                        <div style="min-width: 210px;">
                            <strong style="color: #ea580c; font-size: 13px;">🍴 ${f.name}</strong>
                            <div style="font-size: 11px; color: #64748b; margin: 2px 0;">${f.cuisine}</div>
                            <p style="margin: 4px 0 6px 0; font-size: 11.5px; color: #475569;">📍 ${f.address || f.locality}</p>
                            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px;">
                                <span style="color: #f59e0b; font-weight: 700;">⭐ ${f.rating}</span>
                                <span style="color: #0284c7; font-weight: 700;">${f.distance_km} km away</span>
                            </div>
                            <button class="primary-small" style="width: 100%; padding: 4px 8px; font-size: 11px;" onclick="drawServiceRoute(${place.latitude}, ${place.longitude}, ${f.latitude}, ${f.longitude}, '${f.name.replace(/'/g, "\\'")}', ${f.distance_km}, '🍴')">
                                🧭 Trace Route on Map
                            </button>
                        </div>
                    `);
            }
        });

        const nearest = foods[0];
        drawServiceRoute(place.latitude, place.longitude, nearest.latitude, nearest.longitude, nearest.name, nearest.distance_km, "🍴");
        showToast(`🍴 Nearest dining: ${nearest.name} (${nearest.distance_km} km away)`);
    } catch (e) {
        console.error("Food route error:", e);
        showToast("Error locating nearby restaurants.");
    }
}

async function showNearbyPoliceOnMap() {
    if (!placeMap) return;
    scrollToMap();
    showToast("🚔 Showing police stations on map...");
    if (!activeLayers.police) {
        await toggleMapLayer("police");
    }
}

// =====================================================
// TRAFFIC ANALYSIS & CONGESTION TELEMETRY
// =====================================================
async function fetchTrafficAnalysis(placeId) {
    try {
        const res = await fetch(`/api/famous-places/${placeId}/traffic-analysis`);
        const data = await res.json();
        if (!data.success || !data.traffic) return;

        const t = data.traffic;
        const flowColor = t.percentage > 70 ? "#ef4444" : (t.percentage > 40 ? "#f59e0b" : "#16a34a");

        const spotTraffic = document.getElementById("spotlightTraffic");
        const spotSpeed = document.getElementById("spotlightSpeed");
        const spotDelay = document.getElementById("spotlightDelay");
        const spotWeather = document.getElementById("spotlightWeather");
        const spotWeatherSub = document.getElementById("spotlightWeatherSub");

        if (spotTraffic) {
            spotTraffic.textContent = `${t.level} (${t.percentage}%)`;
            spotTraffic.style.color = flowColor;
        }
        if (spotSpeed) spotSpeed.textContent = `${t.averageSpeedKmH} km/h`;
        if (spotDelay) spotDelay.textContent = t.expectedDelay;
        if (spotWeather && t.weather) {
            const tempMatch = t.weather.match(/(\d+°C)/);
            if (tempMatch) spotWeather.textContent = tempMatch[1];
        }
        if (spotWeatherSub && t.weather) {
            spotWeatherSub.textContent = t.weather;
        }

        const modName = document.getElementById("modalTrafficPlaceName");
        const modBadge = document.getElementById("modalTrafficBadge");
        const modSpeed = document.getElementById("modalTrafficSpeed");
        const modDelay = document.getElementById("modalTrafficDelay");
        const modPeak = document.getElementById("modalTrafficPeak");
        const modCorr = document.getElementById("modalTrafficCorridors");
        const modAdv = document.getElementById("modalTrafficAdvisory");

        if (modName && currentSelectedPlace) modName.textContent = currentSelectedPlace.name;
        if (modBadge) {
            modBadge.textContent = `${t.level} (${t.percentage}%)`;
            modBadge.style.background = flowColor;
            modBadge.style.color = flowColor === "#f59e0b" ? "#0f172a" : "#ffffff";
        }
        if (modSpeed) modSpeed.textContent = `${t.averageSpeedKmH} km/h`;
        if (modDelay) modDelay.textContent = t.expectedDelay;
        if (modPeak) modPeak.textContent = t.peakHours;
        if (modCorr) modCorr.textContent = t.corridors;
        if (modAdv) modAdv.textContent = t.advisory;
    } catch (e) {
        console.warn("Traffic telemetry fetch error:", e);
    }
}

function openTrafficAnalysisModal() {
    if (currentSelectedPlace) {
        fetchTrafficAnalysis(currentSelectedPlace.id);
    }
    openModal("trafficAnalysisModal");
}

function openGoogleTraffic() {
    const place = currentSelectedPlace ? currentSelectedPlace.name : "Gorakhpur";
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(place + " Gorakhpur traffic")}`, "_blank");
}


// =====================================================
// DATA LOADING & DIRECTORY RENDERING
// =====================================================
async function loadAllPlaces() {
    try {
        const res = await fetch("/api/famous-places");
        const data = await res.json();
        if (data.success && Array.isArray(data.places)) {
            allPlaces = data.places;

            // Populate place dropdowns in modals
            populatePlaceDropdowns(allPlaces);

            // Render directory grid & map
            renderPlacesGrid(allPlaces);
            renderMapMarkers(allPlaces);

            // Default spotlight to Ramgarh Taal (id 2) or first place
            const ramgarh = allPlaces.find(p => p.slug === "ramgarh-taal") || allPlaces[0];
            if (ramgarh) {
                selectPlaceSpotlight(ramgarh);
            }

            const statCount = document.getElementById("statPlacesCount");
            if (statCount) statCount.textContent = allPlaces.length;
        }
    } catch (err) {
        console.error("Error loading places:", err);
        showToast("⚠️ Could not load places database.");
    }
}

async function loadCategoryStats() {
    try {
        const res = await fetch("/api/famous-places/categories");
        const data = await res.json();
        if (data.success && Array.isArray(data.categories)) {
            const countAllEl = document.getElementById("countAll");
            if (countAllEl) countAllEl.textContent = data.totalPlaces || allPlaces.length;

            data.categories.forEach(c => {
                let id = "";
                if (c.category === "Religious") id = "countReligious";
                else if (c.category === "Historical") id = "countHistorical";
                else if (c.category === "Cultural") id = "countCultural";
                else if (c.category === "Nature") id = "countNature";
                else if (c.category === "Educational") id = "countEducational";
                else if (c.category === "Family & Recreation") id = "countFamily";
                else if (c.category === "Heritage") id = "countHeritage";

                if (id) {
                    const el = document.getElementById(id);
                    if (el) el.textContent = c.count;
                }
            });
        }
    } catch (e) {
        // Graceful fallback
    }
}

async function loadUserFavorites() {
    if (typeof SmartCityAuth === "undefined" || !SmartCityAuth.isAuthenticated()) return;
    try {
        const res = await SmartCityAuth.fetch("/api/famous-places/user/favorites");
        const data = await res.json();
        if (data.success && Array.isArray(data.favorites)) {
            userFavorites = new Set(data.favorites.map(f => f.place_id));
            renderPlacesGrid(getFilteredPlaces());
        }
    } catch (e) {
        console.warn("Favorites load error:", e);
    }
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
}

function renderPlacesGrid(places) {
    const grid = document.getElementById("placesGrid");
    const resultsSub = document.getElementById("directoryResultsSub");
    if (!grid) return;

    if (resultsSub) {
        resultsSub.textContent = `Showing ${places.length} verified destination${places.length === 1 ? '' : 's'} in Gorakhpur`;
    }

    if (places.length === 0) {
        grid.innerHTML = `
            <div class="empty-places-box">
                <div style="font-size: 42px; margin-bottom: 12px;">🔍</div>
                <h3>No destinations match your filters</h3>
                <p>Try searching for a different landmark or clearing category filters.</p>
                <button class="primary-btn" onclick="resetFilters()">Reset All Filters</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = places.map(place => {
        const isFav = userFavorites.has(place.id);
        const meta = CATEGORY_META[place.category] || { badgeClass: "badge-Heritage" };
        let distanceText = "";
        if (userCoords) {
            const dist = calculateDistanceKm(userCoords.lat, userCoords.lng, place.latitude, place.longitude);
            if (dist) distanceText = `<span class="info-chip">📍 ${dist} km away</span>`;
        }

        return `
            <div class="place-card" data-id="${place.id}">
                <div class="place-card-media">
                    <img src="${place.image_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'}" alt="${place.name}" loading="lazy">
                    <span class="place-badge ${meta.badgeClass}">${place.category}</span>
                    <button class="fav-btn ${isFav ? 'is-fav' : ''}" onclick="toggleFavorite(${place.id}, this)" title="${isFav ? 'Remove from Saved' : 'Save to Favorites'}">
                        ${isFav ? '❤️' : '🤍'}
                    </button>
                </div>

                <div class="place-card-content">
                    <div class="place-meta-top">
                        <span class="place-locality">📍 ${place.locality || 'Gorakhpur'}</span>
                        <span class="place-rating-pill">⭐ ${place.avg_rating > 0 ? place.avg_rating : '4.5'}</span>
                    </div>

                    <h3 class="place-title">${place.name}</h3>
                    <p class="place-short-desc">${place.short_description}</p>

                    <div class="place-info-chips">
                        <span class="info-chip">🕒 ${place.opening_time || 'Check timings'}</span>
                        <span class="info-chip">🎫 ${place.entry_fee || 'Free'}</span>
                        ${distanceText}
                    </div>

                    <div class="place-card-actions">
                        <button class="explore-btn" onclick="openPlaceDetails(${place.id})">
                            View Full Details →
                        </button>
                        <button class="dir-btn" onclick="navigateCoordinates(${place.latitude}, ${place.longitude})">
                            🧭 Directions
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

// =====================================================
// SEARCH & CATEGORY FILTERING LOGIC
// =====================================================
function getFilteredPlaces() {
    return allPlaces.filter(place => {
        const matchesCategory = activeCategory === "All" || place.category === activeCategory;
        const matchesSearch = !searchQuery || 
            place.name.toLowerCase().includes(searchQuery) ||
            place.short_description.toLowerCase().includes(searchQuery) ||
            (place.locality && place.locality.toLowerCase().includes(searchQuery)) ||
            (place.address && place.address.toLowerCase().includes(searchQuery));
        return matchesCategory && matchesSearch;
    }).sort((a, b) => {
        if (sortOption === "rating") return (b.avg_rating || 0) - (a.avg_rating || 0);
        if (sortOption === "name") return a.name.localeCompare(b.name);
        return a.id - b.id;
    });
}

function handleSearchInput(val) {
    searchQuery = (val || "").toLowerCase().trim();
    updateFilterDisplay();
}

function selectCategory(cat) {
    activeCategory = cat;
    document.querySelectorAll(".cat-chip").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.cat === cat);
    });
    updateFilterDisplay();
}

function handleSortChange(val) {
    sortOption = val;
    updateFilterDisplay();
}

function updateFilterDisplay() {
    const filtered = getFilteredPlaces();
    renderPlacesGrid(filtered);
    renderMapMarkers(filtered);

    const clearBtn = document.getElementById("clearFiltersBtn");
    if (clearBtn) {
        clearBtn.style.display = (activeCategory !== "All" || searchQuery) ? "inline-block" : "none";
    }
}

function resetFilters() {
    searchQuery = "";
    activeCategory = "All";
    sortOption = "default";

    const searchInput = document.getElementById("placeSearchInput");
    if (searchInput) searchInput.value = "";

    const sortSelect = document.getElementById("sortSelect");
    if (sortSelect) sortSelect.value = "default";

    document.querySelectorAll(".cat-chip").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.cat === "All");
    });

    updateFilterDisplay();
    showToast("Filters reset to default.");
}

function scrollToMap() {
    const el = document.getElementById("mapSection");
    if (el) el.scrollIntoView({ behavior: "smooth" });
}

// =====================================================
// PLACE SPOTLIGHT (TELEMETRY & SMART SERVICES)
// =====================================================
function selectPlaceSpotlight(place) {
    currentSelectedPlace = place;

    const titleEl = document.getElementById("featuredPlaceTitle");
    const aboutTitleEl = document.getElementById("spotlightAboutTitle");
    const aboutDescEl = document.getElementById("spotlightAboutDesc");
    const localityEl = document.getElementById("spotlightLocality");
    const timingsEl = document.getElementById("spotlightTimings");
    const feeEl = document.getElementById("spotlightFee");
    const ratingEl = document.getElementById("spotlightRating");

    if (titleEl) titleEl.textContent = `${place.name} – Live Status & Telemetry`;
    if (aboutTitleEl) aboutTitleEl.textContent = `About ${place.name}`;
    if (aboutDescEl) aboutDescEl.textContent = place.description || place.short_description;
    if (localityEl) localityEl.textContent = place.locality || "Gorakhpur";
    if (timingsEl) timingsEl.textContent = place.opening_time ? `${place.opening_time} - ${place.closing_time}` : "Information unavailable";
    if (feeEl) feeEl.textContent = place.entry_fee || "Please verify before visiting";
    if (ratingEl) ratingEl.textContent = `${place.avg_rating > 0 ? place.avg_rating : '4.5'} / 5`;

    // Load place reviews
    loadPlaceReviews(place.id);

    // Fetch live traffic analysis from traffic module
    fetchTrafficAnalysis(place.id);

    // Load nearby smart parking specific to this destination
    loadNearbyParking(place.id);

    // Update Services card labels
    updateSpotlightServicesLabels(place.id);

    // Clear previous service route banner
    clearServiceRoute();

    // Pan map to place
    if (placeMap && place.latitude && place.longitude) {
        placeMap.panTo([place.latitude, place.longitude]);
    }
}

async function updateSpotlightServicesLabels(placeId) {
    try {
        const res = await fetch(`/api/famous-places/${placeId}/nearby-services`);
        const data = await res.json();
        if (!data.success || !data.services) return;
        const { hospitals, parking, atms, food } = data.services;

        const hospDesc = document.getElementById("serviceHospDesc");
        const parkDesc = document.getElementById("serviceParkDesc");
        const atmDesc = document.getElementById("serviceAtmDesc");
        const foodDesc = document.getElementById("serviceFoodDesc");

        if (hospDesc && hospitals && hospitals[0]) {
            hospDesc.textContent = `${hospitals[0].hospital_name} (${hospitals[0].distance_km} km)`;
        }
        if (parkDesc && parking && parking[0]) {
            parkDesc.textContent = `${parking[0].name} (${parking[0].available_slots} slots)`;
        }
        if (atmDesc && atms && atms[0]) {
            atmDesc.textContent = `${atms[0].bank_name || atms[0].name} (${atms[0].distance_km} km)`;
        }
        if (foodDesc && food && food[0]) {
            foodDesc.textContent = `${food[0].name} (${food[0].distance_km} km)`;
        }
    } catch (e) {
        // Fallback gracefully
    }
}

async function loadNearbyParking(placeId = null) {
    const grid = document.getElementById("nearbyParkingGrid");
    if (!grid) return;

    try {
        let lots = [];
        const id = placeId || (currentSelectedPlace ? currentSelectedPlace.id : null);
        if (id) {
            const res = await fetch(`/api/famous-places/${id}/nearby-services`);
            const data = await res.json();
            if (data.services && Array.isArray(data.services.parking)) {
                lots = data.services.parking;
            }
        }

        if (lots.length === 0) {
            const res = await fetch("/api/parking");
            const data = await res.json();
            lots = (data.lots || data.parking || []);
        }

        const topLots = lots.slice(0, 3);
        if (topLots.length === 0) {
            grid.innerHTML = `<p style="color:#64748b;">No active smart parking lots currently registered in database.</p>`;
            return;
        }

        grid.innerHTML = topLots.map(lot => `
            <div class="parking-card">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-size: 11px; font-weight: 700; color: #0284c7;">${lot.parking_code || 'SMART-LOT'}</span>
                        ${lot.distance_km ? `<span style="font-size: 11px; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 700;">📍 ${lot.distance_km} km</span>` : ''}
                    </div>
                    <h3>🅿️ ${lot.name}</h3>
                    <p>📍 ${lot.address || lot.area || 'Gorakhpur'}</p>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin: 8px 0;">
                    <strong class="green">${lot.available_slots || lot.availableSlots || 0} spots open</strong>
                    <span style="font-size:12px; color:#64748b;">₹${lot.hourly_rate || 20}/hr</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <a href="${lot.booking_url || `../parking/parking.html?lot=${lot.parking_code}&book=true`}" class="primary-btn" style="flex: 1; text-decoration: none; justify-content: center; font-size: 12px; padding: 7px; display: flex; align-items: center;">
                        ⚡ E-Book Slot Now
                    </a>
                    <button class="secondary-btn" style="padding: 7px 10px; font-size: 12px;" onclick="navigateCoordinates(${lot.latitude}, ${lot.longitude})">
                        🧭
                    </button>
                </div>
            </div>
        `).join("");

        // Also update spotlight parking text
        const totalAvail = topLots.reduce((sum, l) => sum + Number(l.available_slots || l.availableSlots || 0), 0);
        const spotParking = document.getElementById("spotlightParkingSlots");
        if (spotParking) {
            spotParking.textContent = topLots[0] ? `${topLots[0].name} (${topLots[0].available_slots || 0} slots open)` : `${totalAvail} city slots vacant`;
        }
    } catch (e) {
        grid.innerHTML = `<p style="color:#64748b;">Parking telemetry currently synchronizing...</p>`;
    }
}

async function loadPlaceReviews(placeId) {
    const container = document.getElementById("reviewsContainer");
    if (!container) return;

    try {
        const res = await fetch(`/api/famous-places/${placeId}/reviews`);
        const data = await res.json();
        const reviews = data.reviews || [];

        if (reviews.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; padding: 20px; background: #f8fafc; border-radius: 8px; text-align: center; color: #64748b;">
                    No visitor reviews yet for this destination. Be the first to share your experience!
                </div>
            `;
            return;
        }

        container.innerHTML = reviews.slice(0, 6).map(r => `
            <div class="review">
                <div class="review-top">
                    <strong>${r.user_name || 'Visitor'}</strong>
                    <span>${'⭐'.repeat(r.rating || 5)}</span>
                </div>
                <p>${r.review_text}</p>
            </div>
        `).join("");
    } catch (e) {
        console.warn("Reviews load error:", e);
    }
}

// =====================================================
// PLACE DETAILS MODAL & SMART SERVICES EXPANSION
// =====================================================
async function openPlaceDetails(placeId) {
    showToast("Loading place details...");
    try {
        const res = await fetch(`/api/famous-places/${placeId}`);
        const data = await res.json();
        if (!data.success || !data.place) {
            showToast("Place details not found.");
            return;
        }

        const place = data.place;
        currentSelectedPlace = place;

        document.getElementById("modalPlaceName").textContent = place.name;
        document.getElementById("modalPlaceHeroTitle").textContent = place.name;
        document.getElementById("modalPlaceLocality").textContent = `📍 ${place.address || place.locality}`;
        document.getElementById("modalFullDescription").textContent = place.description || place.short_description;
        document.getElementById("modalTimings").textContent = place.opening_time ? `${place.opening_time} - ${place.closing_time}` : "Information unavailable";
        document.getElementById("modalEntryFee").textContent = place.entry_fee || "Please verify before visiting";
        document.getElementById("modalBestTime").textContent = place.best_time_to_visit || "October to March";

        const badge = document.getElementById("modalCategoryBadge");
        if (badge) {
            badge.textContent = place.category;
            const meta = CATEGORY_META[place.category] || {};
            badge.className = `place-badge ${meta.badgeClass || ''}`;
        }

        const heroCover = document.getElementById("modalHeroCover");
        if (heroCover) {
            heroCover.style.backgroundImage = `url('${place.image_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'}')`;
        }

        // Calculate distance from user coords if available
        const distEl = document.getElementById("modalDistance");
        if (distEl) {
            if (userCoords) {
                const d = calculateDistanceKm(userCoords.lat, userCoords.lng, place.latitude, place.longitude);
                distEl.textContent = `${d} km (Direct)`;
            } else {
                distEl.textContent = "Enable GPS to calculate";
            }
        }

        // Update modal favorite button state
        const favBtn = document.getElementById("modalFavBtn");
        if (favBtn) {
            const isFav = userFavorites.has(place.id);
            favBtn.textContent = isFav ? "❤️ Saved in Favorites" : "🤍 Save to Favorites";
        }

        // Fetch Nearby Smart City Services for this place
        fetchAndRenderModalNearbyServices(place.id);

        openModal("placeDetailsModal");
    } catch (err) {
        console.error("Place details load error:", err);
        showToast("Error loading place details.");
    }
}

async function fetchAndRenderModalNearbyServices(placeId) {
    const grid = document.getElementById("modalNearbyServicesGrid");
    if (!grid) return;
    grid.innerHTML = `<p style="font-size:12px; color:#64748b;">Finding nearest hospitals, police stations, smart parking, ATMs, and dining...</p>`;

    try {
        const res = await fetch(`/api/famous-places/${placeId}/nearby-services`);
        const data = await res.json();
        if (!data.success || !data.services) return;

        const { hospitals, police, parking, atms, food } = data.services;
        const nearestHosp = hospitals ? hospitals[0] : null;
        const nearestPol = police ? police[0] : null;
        const nearestPark = parking ? parking[0] : null;
        const nearestAtm = atms ? atms[0] : null;
        const nearestFood = food ? food[0] : null;

        grid.innerHTML = `
            ${nearestHosp ? `
                <div class="spec-box" style="border-left: 4px solid #ef4444;">
                    <span>🏥 Nearest Hospital (${nearestHosp.distance_km} km)</span>
                    <strong>${nearestHosp.hospital_name}</strong>
                    <small style="color:#64748b; display:block; margin-top:2px;">📞 ${nearestHosp.emergency_number || nearestHosp.phone || '112'} • Beds: ${nearestHosp.total_beds || 'N/A'}</small>
                    <a href="${nearestHosp.booking_url || `../hospital/hospital.html?hospital=${nearestHosp.id}`}" style="font-size:11px; color:#ef4444; text-decoration:none; font-weight:700; margin-top:4px; display:inline-block;">Open Healthcare Module →</a>
                </div>
            ` : ''}

            ${nearestPark ? `
                <div class="spec-box" style="border-left: 4px solid #0284c7;">
                    <span>🅿️ Nearest Smart Parking (${nearestPark.distance_km} km)</span>
                    <strong>${nearestPark.name}</strong>
                    <small style="color:#16a34a; font-weight:700; display:block; margin-top:2px;">${nearestPark.available_slots || 0} slots vacant • ₹${nearestPark.hourly_rate || 20}/hr</small>
                    <a href="${nearestPark.booking_url || `../parking/parking.html?lot=${nearestPark.parking_code}&book=true`}" style="font-size:11px; color:#0284c7; text-decoration:none; font-weight:700; margin-top:4px; display:inline-block;">⚡ E-Book Parking Slot →</a>
                </div>
            ` : ''}

            ${nearestAtm ? `
                <div class="spec-box" style="border-left: 4px solid #059669;">
                    <span>🏧 Nearest ATM (${nearestAtm.distance_km} km)</span>
                    <strong>${nearestAtm.bank_name || nearestAtm.name}</strong>
                    <small style="color:#64748b; display:block; margin-top:2px;">📍 ${nearestAtm.address || nearestAtm.locality}</small>
                    <button class="primary-small" style="font-size:10px; padding:3px 6px; margin-top:4px;" onclick="closeModal('placeDetailsModal'); showNearbyATMsOnMap();">Trace Route on Map →</button>
                </div>
            ` : ''}

            ${nearestFood ? `
                <div class="spec-box" style="border-left: 4px solid #ea580c;">
                    <span>🍴 Nearest Food & Dining (${nearestFood.distance_km} km)</span>
                    <strong>${nearestFood.name}</strong>
                    <small style="color:#64748b; display:block; margin-top:2px;">⭐ ${nearestFood.rating} • ${nearestFood.cuisine}</small>
                    <button class="primary-small" style="font-size:10px; padding:3px 6px; margin-top:4px;" onclick="closeModal('placeDetailsModal'); showNearbyFoodOnMap();">Trace Route on Map →</button>
                </div>
            ` : ''}

            ${nearestPol ? `
                <div class="spec-box" style="border-left: 4px solid #1e40af;">
                    <span>🚔 Nearest Police Station (${nearestPol.distance_km} km)</span>
                    <strong>${nearestPol.name}</strong>
                    <small style="color:#64748b; display:block; margin-top:2px;">📞 ${nearestPol.phone || '112'}</small>
                    <a href="../police/police.html" style="font-size:11px; color:#1e40af; text-decoration:none; font-weight:700; margin-top:4px; display:inline-block;">Open Police Module →</a>
                </div>
            ` : ''}
        `;
    } catch (e) {
        grid.innerHTML = `<p style="font-size:12px; color:#64748b;">Nearby services synchronizing...</p>`;
    }
}

function openSelectedPlaceModal() {
    if (currentSelectedPlace && currentSelectedPlace.id) {
        openPlaceDetails(currentSelectedPlace.id);
    }
}

function navigateCurrentModalPlace() {
    if (currentSelectedPlace && currentSelectedPlace.latitude) {
        navigateCoordinates(currentSelectedPlace.latitude, currentSelectedPlace.longitude);
    }
}

function navigateCoordinates(lat, lng) {
    const destination = `${lat},${lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    window.open(url, "_blank");
}

function shareCurrentPlace() {
    if (!currentSelectedPlace) return;
    const url = `${window.location.origin}${window.location.pathname}?place=${currentSelectedPlace.slug}`;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
            showToast("🔗 Place link copied to clipboard!");
        });
    } else {
        prompt("Copy place link:", url);
    }
}

// =====================================================
// FAVORITES / SAVED PLACES
// =====================================================
async function toggleFavorite(placeId, btnEl) {
    if (typeof SmartCityAuth === "undefined" || !SmartCityAuth.isAuthenticated()) {
        showToast("⚠️ Please login to save places to your account.");
        return;
    }

    try {
        const res = await SmartCityAuth.fetch(`/api/famous-places/${placeId}/favorite`, { method: "POST" });
        const data = await res.json();
        if (data.success) {
            if (data.isFavorite) {
                userFavorites.add(placeId);
                if (btnEl) {
                    btnEl.classList.add("is-fav");
                    btnEl.textContent = "❤️";
                }
            } else {
                userFavorites.delete(placeId);
                if (btnEl) {
                    btnEl.classList.remove("is-fav");
                    btnEl.textContent = "🤍";
                }
            }
            showToast(data.message);
        }
    } catch (e) {
        showToast("Error updating favorites.");
    }
}

function toggleFavoriteFromModal() {
    if (currentSelectedPlace) {
        toggleFavorite(currentSelectedPlace.id, document.getElementById("modalFavBtn"));
        const favBtn = document.getElementById("modalFavBtn");
        if (favBtn) {
            const isFav = userFavorites.has(currentSelectedPlace.id);
            favBtn.textContent = isFav ? "❤️ Saved in Favorites" : "🤍 Save to Favorites";
        }
    }
}

async function openSavedPlacesModal() {
    if (typeof SmartCityAuth === "undefined" || !SmartCityAuth.isAuthenticated()) {
        showToast("⚠️ Please login to view your saved places.");
        return;
    }

    const list = document.getElementById("savedPlacesList");
    if (!list) return;
    list.innerHTML = `<p style="color:#64748b;">Loading saved places...</p>`;

    openModal("savedPlacesModal");

    try {
        const res = await SmartCityAuth.fetch("/api/famous-places/user/favorites");
        const data = await res.json();
        const favs = data.favorites || [];

        if (favs.length === 0) {
            list.innerHTML = `
                <div style="text-align: center; padding: 24px; color: #64748b;">
                    <div style="font-size: 36px; margin-bottom: 8px;">🤍</div>
                    <p>You haven't saved any places yet.</p>
                    <small>Click the heart icon on any destination card to bookmark it.</small>
                </div>
            `;
            return;
        }

        list.innerHTML = favs.map(f => `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:#f8fafc; border:1px solid var(--border); border-radius:8px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <img src="${f.image_url || ''}" style="width:48px; height:48px; object-fit:cover; border-radius:6px;">
                    <div>
                        <strong style="font-size:14px; color:#0f172a; display:block;">${f.name}</strong>
                        <small style="color:#64748b;">📍 ${f.locality || 'Gorakhpur'}</small>
                    </div>
                </div>
                <button class="primary-btn" style="padding:6px 12px; font-size:12px;" onclick="closeModal('savedPlacesModal'); openPlaceDetails(${f.place_id});">
                    View
                </button>
            </div>
        `).join("");
    } catch (e) {
        list.innerHTML = `<p style="color:#ef4444;">Error loading saved places.</p>`;
    }
}

// =====================================================
// SMART TRIP PLANNER
// =====================================================
function openTripPlannerModal() {
    openModal("tripPlannerModal");
}

async function generateTripPlan() {
    const startPoint = document.getElementById("planStartPoint").value;
    const duration = document.getElementById("planDuration").value;
    const transport = document.getElementById("planTransport").value;

    const checkedCats = [];
    document.querySelectorAll("input[name='planCat']:checked").forEach(cb => {
        checkedCats.push(cb.value);
    });

    const payload = {
        startPoint,
        duration,
        transport,
        interests: checkedCats.length > 0 ? checkedCats : ["Religious", "Nature", "Heritage"],
        userLat: userCoords ? userCoords.lat : null,
        userLng: userCoords ? userCoords.lng : null
    };

    showToast("✨ Generating optimized itinerary...");

    try {
        const res = await fetch("/api/famous-places/trip-planner", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success || !data.plan) {
            showToast("Error planning trip.");
            return;
        }

        renderTripPlanOutput(data.plan);
    } catch (e) {
        showToast("Trip planner request failed.");
    }
}

function renderTripPlanOutput(plan) {
    const area = document.getElementById("plannerResultsArea");
    const timeline = document.getElementById("plannerTimeline");
    const summary = document.getElementById("planStatsSummary");

    if (!area || !timeline) return;

    area.style.display = "block";
    summary.textContent = `Total: ~${plan.totalDistanceKm} km (${plan.totalEstimatedTravelTime})`;

    timeline.innerHTML = plan.itinerary.map(step => `
        <div class="timeline-item">
            <div class="timeline-dot">${step.step}</div>
            <div class="timeline-content">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <span style="font-size:11px; font-weight:700; color:#0284c7; text-transform:uppercase;">${step.place.category}</span>
                        <h4>${step.place.name}</h4>
                        <small style="color:#64748b;">📍 ${step.place.address}</small>
                    </div>
                    <button class="primary-small" style="font-size:11px; padding:4px 8px;" onclick="navigateCoordinates(${step.place.latitude}, ${step.place.longitude})">
                        Navigate
                    </button>
                </div>
                <div class="timeline-stats-row">
                    <span>🚗 Leg: ~${step.estimatedDistanceKm} km (~${step.estimatedTravelTimeMinutes} mins)</span>
                    <span>⏱️ Suggested Stay: ~${step.suggestedVisitDurationMinutes} mins</span>
                </div>
            </div>
        </div>
    `).join("");

    showToast("✅ Trip itinerary created!");
}

// =====================================================
// CIVIC ISSUE REPORTING
// =====================================================
function openCivicIssueModal(placeId) {
    const select = document.getElementById("issuePlaceSelect");
    if (select && placeId) {
        select.value = placeId;
    }
    openModal("civicIssueModal");
}

function reportIssueFromModal() {
    if (currentSelectedPlace) {
        closeModal("placeDetailsModal");
        openCivicIssueModal(currentSelectedPlace.id);
    }
}

async function submitCivicIssue() {
    const placeId = document.getElementById("issuePlaceSelect").value;
    const category = document.getElementById("issueCategory").value;
    const description = document.getElementById("issueDescription").value;
    const citizen_name = document.getElementById("issueCitizenName").value;
    const citizen_mobile = document.getElementById("issueCitizenMobile").value;
    const photo_url = document.getElementById("issuePhotoUrl").value;

    if (!description || description.trim().length < 10) {
        showToast("⚠️ Description must be at least 10 characters long.");
        return;
    }
    if (!citizen_name || !citizen_mobile) {
        showToast("⚠️ Citizen name and mobile number are required.");
        return;
    }

    const payload = {
        category,
        description,
        citizen_name,
        citizen_mobile,
        photo_url,
        latitude: userCoords ? userCoords.lat : null,
        longitude: userCoords ? userCoords.lng : null
    };

    showToast("Submitting civic issue...");

    try {
        const fetchMethod = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.isAuthenticated()) 
            ? SmartCityAuth.fetch 
            : fetch;

        const res = await fetchMethod(`/api/famous-places/${placeId}/issues`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
            closeModal("civicIssueModal");
            showToast(`✅ Report lodged: ${data.issueCode}`);
            document.getElementById("issueDescription").value = "";
        } else {
            showToast(`Error: ${data.message}`);
        }
    } catch (e) {
        showToast("Error submitting issue report.");
    }
}

// =====================================================
// REVIEWS & RATINGS
// =====================================================
function openWriteReviewModal() {
    if (typeof SmartCityAuth === "undefined" || !SmartCityAuth.isAuthenticated()) {
        showToast("⚠️ Please login to your citizen account to write a review.");
        return;
    }
    const select = document.getElementById("reviewPlaceSelect");
    if (select && currentSelectedPlace) {
        select.value = currentSelectedPlace.id;
    }
    openModal("reviewModal");
}

async function submitPlaceReview() {
    const placeId = document.getElementById("reviewPlaceSelect").value;
    const rating = document.getElementById("reviewRatingSelect").value;
    const review_text = document.getElementById("reviewCommentInput").value;

    if (!review_text || review_text.trim().length < 5) {
        showToast("⚠️ Review comments cannot be empty.");
        return;
    }

    try {
        const res = await SmartCityAuth.fetch(`/api/famous-places/${placeId}/reviews`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rating, review_text })
        });

        const data = await res.json();
        if (data.success) {
            closeModal("reviewModal");
            showToast("⭐ Thank you! Review submitted successfully.");
            document.getElementById("reviewCommentInput").value = "";
            loadPlaceReviews(placeId);
        } else {
            showToast(`Error: ${data.message}`);
        }
    } catch (e) {
        showToast("Failed to submit review.");
    }
}

// =====================================================
// AI TOURIST ASSISTANT DRAWER
// =====================================================
function openAIDrawer() {
    const drawer = document.getElementById("aiDrawer");
    if (drawer) drawer.classList.add("active");
}

function closeAIDrawer() {
    const drawer = document.getElementById("aiDrawer");
    if (drawer) drawer.classList.remove("active");
}

function handleAIInputKey(e) {
    if (e.key === "Enter") {
        sendAIChatMessage();
    }
}

function sendQuickAIPrompt(promptText) {
    const input = document.getElementById("aiUserMsgInput");
    if (input) {
        input.value = promptText;
        sendAIChatMessage();
    }
}

async function sendAIChatMessage() {
    const input = document.getElementById("aiUserMsgInput");
    const chatBody = document.getElementById("aiChatBody");
    if (!input || !input.value.trim() || !chatBody) return;

    const userText = input.value.trim();
    input.value = "";

    // Append user message
    const userMsg = document.createElement("div");
    userMsg.className = "ai-msg user";
    userMsg.textContent = userText;
    chatBody.appendChild(userMsg);

    // Append typing indicator
    const botTyping = document.createElement("div");
    botTyping.className = "ai-msg bot";
    botTyping.id = "aiTypingIndicator";
    botTyping.innerHTML = "Thinking... 🤖";
    chatBody.appendChild(botTyping);
    chatBody.scrollTop = chatBody.scrollHeight;

    aiChatHistory.push({ sender: "user", text: userText });

    try {
        const res = await fetch("/api/famous-places/ai-assistant", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: userText,
                history: aiChatHistory.slice(-6)
            })
        });

        const data = await res.json();
        const indicator = document.getElementById("aiTypingIndicator");
        if (indicator) indicator.remove();

        const botMsg = document.createElement("div");
        botMsg.className = "ai-msg bot";

        // Convert simple markdown bold/bullet to HTML
        let formattedReply = (data.reply || "Information currently unavailable.")
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');

        botMsg.innerHTML = formattedReply;
        chatBody.appendChild(botMsg);
        chatBody.scrollTop = chatBody.scrollHeight;

        aiChatHistory.push({ sender: "bot", text: data.reply });
    } catch (e) {
        const indicator = document.getElementById("aiTypingIndicator");
        if (indicator) indicator.remove();

        const botMsg = document.createElement("div");
        botMsg.className = "ai-msg bot";
        botMsg.textContent = "I am currently unable to reach the knowledge service. Please check your internet or try again shortly.";
        chatBody.appendChild(botMsg);
    }
}

// =====================================================
// STAFF / ADMIN CIVIC PORTAL
// =====================================================
async function openAdminModal() {
    if (typeof SmartCityAuth === "undefined" || !SmartCityAuth.isStaff()) {
        showToast("⚠️ Staff permissions required.");
        return;
    }

    const tbody = document.getElementById("adminIssuesTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="padding:15px; text-align:center;">Loading issues...</td></tr>`;

    openModal("adminModal");

    try {
        const res = await SmartCityAuth.fetch("/api/admin/famous-places/issues");
        const data = await res.json();
        const issues = data.issues || [];

        if (issues.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding:15px; text-align:center; color:#64748b;">No open civic issues reported.</td></tr>`;
            return;
        }

        tbody.innerHTML = issues.map(iss => `
            <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:10px; font-weight:700;">${iss.issue_code}</td>
                <td style="padding:10px;">${iss.place_name}</td>
                <td style="padding:10px;">${iss.category}</td>
                <td style="padding:10px;">${iss.citizen_name} (${iss.citizen_mobile})</td>
                <td style="padding:10px;">
                    <select onchange="updateAdminIssueStatus(${iss.id}, this.value)" style="padding:4px 8px; border-radius:4px; font-size:12px;">
                        <option value="Submitted" ${iss.status === 'Submitted' ? 'selected' : ''}>Submitted</option>
                        <option value="In Review" ${iss.status === 'In Review' ? 'selected' : ''}>In Review</option>
                        <option value="Resolved" ${iss.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                    </select>
                </td>
                <td style="padding:10px;">
                    <button class="primary-small" style="font-size:11px;" onclick="showAdminIssueDetails('${iss.issue_code}', '${encodeURIComponent(iss.description)}')">
                        Inspect
                    </button>
                </td>
            </tr>
        `).join("");
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding:15px; text-align:center; color:#ef4444;">Error loading issues.</td></tr>`;
    }
}

async function updateAdminIssueStatus(issueId, newStatus) {
    try {
        const res = await SmartCityAuth.fetch(`/api/admin/famous-places/issues/${issueId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`✅ Issue status updated to ${newStatus}`);
        }
    } catch (e) {
        showToast("Error updating status.");
    }
}

function showAdminIssueDetails(code, encodedDesc) {
    alert(`Report Code: ${code}\n\nDescription:\n${decodeURIComponent(encodedDesc)}`);
}

// =====================================================
// UTILITIES & LEGACY BACKWARDS COMPATIBILITY
// =====================================================
function populatePlaceDropdowns(places) {
    const issueSelect = document.getElementById("issuePlaceSelect");
    const reviewSelect = document.getElementById("reviewPlaceSelect");

    const options = places.map(p => `<option value="${p.id}">${p.name} (${p.locality})</option>`).join("");
    if (issueSelect) issueSelect.innerHTML = options;
    if (reviewSelect) reviewSelect.innerHTML = options;
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add("active");
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("active");
}

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}

function updateLiveTime() {
    const liveEl = document.querySelector(".green");
    if (liveEl) {
        setInterval(() => {
            liveEl.title = "Live GIS link active: " + new Date().toLocaleTimeString();
        }, 1000);
    }
}

// Backwards compatibility legacy functions
function getDirections() {
    if (currentSelectedPlace && currentSelectedPlace.latitude) {
        navigateCoordinates(currentSelectedPlace.latitude, currentSelectedPlace.longitude);
    } else {
        navigateCoordinates(26.7428, 83.4197);
    }
}

function planVisit() {
    openTripPlannerModal();
}

function showPlaceInfo() {
    openSelectedPlaceModal();
}

function findNearby(type) {
    const names = {
        hospital: "Hospitals",
        police: "Police Stations",
        restaurant: "Restaurants",
        atm: "ATMs",
        parking: "Parking Areas",
        washroom: "Public Washrooms"
    };
    const placeName = currentSelectedPlace ? currentSelectedPlace.name : "Ramgarh Taal";
    const name = names[type] || "Nearby Services";

    showToast(`🔎 Finding ${name} near ${placeName}...`);
    setTimeout(() => {
        const url = `https://www.google.com/maps/search/${encodeURIComponent(name + " near " + placeName + " Gorakhpur")}`;
        window.open(url, "_blank");
    }, 400);
}

function openTraffic() {
    const placeName = currentSelectedPlace ? currentSelectedPlace.name : "Ramgarh Taal";
    showToast("🚦 Opening live traffic information...");
    setTimeout(() => {
        window.open(`https://www.google.com/maps/search/${encodeURIComponent(placeName + " Gorakhpur traffic")}`, "_blank");
    }, 400);
}

function navigateParking() {
    const placeName = currentSelectedPlace ? currentSelectedPlace.name : "Ramgarh Taal";
    window.open(`https://www.google.com/maps/search/${encodeURIComponent("Parking near " + placeName + " Gorakhpur")}`, "_blank");
}

function callEmergency(number) {
    if (confirm(`Call Gorakhpur Emergency Helpline ${number}?`)) {
        window.location.href = `tel:${number}`;
    }
}

function writeReview() {
    openWriteReviewModal();
}

function openAI() {
    openAIDrawer();
}

function goToMainApp() {
    window.location.href = "../../index.html";
}