/**
 * SMARTCITY AI - UNIFIED REUSABLE MAP CONTROLLER
 * Single Leaflet / OpenStreetMap controller for all SmartCity modules.
 * Grounded in Gorakhpur coordinates [26.7606, 83.3732].
 */

(function () {
    const GKP_CENTER = [26.7606, 83.3732];
    const DEFAULT_ZOOM = 13;

    class SmartCityMap {
        /**
         * Initialize map on container
         * @param {string|HTMLElement} containerId 
         * @param {Object} [options] 
         */
        constructor(containerId, options = {}) {
            this.containerId = typeof containerId === "string" ? containerId : containerId.id;
            this.center = options.center || GKP_CENTER;
            this.zoom = options.zoom || DEFAULT_ZOOM;
            this.map = null;
            this.layers = {};
            this.markers = new Map();
            this.userMarker = null;
            this.userCircle = null;

            this.initMap();
        }

        initMap() {
            const container = document.getElementById(this.containerId);
            if (!container) {
                console.error(`[SmartCityMap] Map container #${this.containerId} not found.`);
                return;
            }

            if (typeof L === "undefined") {
                console.error("[SmartCityMap] Leaflet.js (L) library is required.");
                container.innerHTML = `<div class="sc-state-box"><div class="sc-state-icon">🗺️</div><div class="sc-state-title">Leaflet Map Loading Error</div><div class="sc-state-desc">Unable to load map tiles. Please verify internet connection.</div></div>`;
                return;
            }

            // Clean previous instance if re-initializing
            if (container._leaflet_id) {
                container._leaflet_id = null;
            }

            this.map = L.map(this.containerId, {
                center: this.center,
                zoom: this.zoom,
                zoomControl: true,
                attributionControl: true
            });

            // Standard OSM free tile layer with CartoDB fallback
            const osmTileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
            L.tileLayer(osmTileUrl, {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Gorakhpur SmartCity AI'
            }).addTo(this.map);

            // Initialize standard layer groups
            const standardCategories = [
                "hospitals", "police", "fire", "parking", "pharmacy", 
                "fuel", "restaurant", "school", "tourist", "waste", "traffic", "emergency"
            ];

            standardCategories.forEach(cat => {
                this.layers[cat] = L.layerGroup().addTo(this.map);
            });
        }

        /**
         * Get SVG pin icon for category
         */
        getIcon(category) {
            const colorMap = {
                hospitals: "#ef4444",
                emergency: "#dc2626",
                police: "#2563eb",
                fire: "#f97316",
                parking: "#059669",
                waste: "#10b981",
                traffic: "#f59e0b",
                tourist: "#8b5cf6",
                pharmacy: "#06b6d4",
                fuel: "#d97706",
                restaurant: "#ec4899",
                school: "#3b82f6"
            };

            const emojiMap = {
                hospitals: "🏥",
                emergency: "🚑",
                police: "👮",
                fire: "🚒",
                parking: "🅿️",
                waste: "🗑️",
                traffic: "🚦",
                tourist: "🏛️",
                pharmacy: "💊",
                fuel: "⛽",
                restaurant: "🍽️",
                school: "🏫"
            };

            const color = colorMap[category] || "#3b82f6";
            const emoji = emojiMap[category] || "📍";

            return L.divIcon({
                className: "sc-map-pin-custom",
                html: `
                    <div style="
                        background: ${color};
                        color: #fff;
                        width: 32px;
                        height: 32px;
                        border-radius: 50% 50% 50% 0;
                        transform: rotate(-45deg);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 4px 10px rgba(0,0,0,0.4);
                        border: 2px solid #ffffff;
                    ">
                        <span style="transform: rotate(45deg); font-size: 14px; line-height: 1;">${emoji}</span>
                    </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            });
        }

        /**
         * Add pin marker to map
         */
        addMarker({
            id,
            category = "tourist",
            latitude,
            longitude,
            title,
            description = "",
            actionText = null,
            onAction = null,
            metadata = {}
        }) {
            if (!this.map || !latitude || !longitude) return null;

            const targetLayer = this.layers[category] || this.map;
            const icon = this.getIcon(category);

            const marker = L.marker([latitude, longitude], { icon });

            // Standard rich popup
            const popupContent = document.createElement("div");
            popupContent.className = "sc-map-popup";
            popupContent.innerHTML = `
                <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: #0f172a;">${title}</div>
                ${description ? `<div style="font-size: 12px; color: #475569; margin-bottom: 8px;">${description}</div>` : ""}
                <div style="display: flex; gap: 6px; margin-top: 6px;">
                    <a href="https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}" target="_blank" 
                       style="background: #3b82f6; color: #fff; text-decoration: none; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                       🧭 Directions
                    </a>
                    ${actionText ? `<button class="sc-popup-action-btn" style="background: #0f172a; color: #fff; border: none; padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer;">${actionText}</button>` : ""}
                </div>
            `;

            if (actionText && typeof onAction === "function") {
                const actionBtn = popupContent.querySelector(".sc-popup-action-btn");
                if (actionBtn) actionBtn.addEventListener("click", () => onAction(metadata));
            }

            marker.bindPopup(popupContent);
            marker.addTo(targetLayer);

            const key = id || `${category}-${latitude}-${longitude}`;
            this.markers.set(key, marker);
            return marker;
        }

        /**
         * Clear markers in category layer or all
         */
        clearLayer(category = null) {
            if (category && this.layers[category]) {
                this.layers[category].clearLayers();
            } else {
                Object.values(this.layers).forEach(layer => layer.clearLayers());
                this.markers.clear();
            }
        }

        /**
         * Track and focus on user location
         */
        locateUser(callback = null) {
            if (!navigator.geolocation) {
                if (window.SmartCityUI) SmartCityUI.toast("Geolocation is not supported by your browser.", "warning");
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    const accuracy = pos.coords.accuracy;

                    if (this.userMarker) this.map.removeLayer(this.userMarker);
                    if (this.userCircle) this.map.removeLayer(this.userCircle);

                    const userIcon = L.divIcon({
                        className: "sc-user-marker",
                        html: `<div style="background: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px rgba(59,130,246,0.8);"></div>`,
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                    });

                    this.userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(this.map);
                    this.userMarker.bindPopup("<b>Your Current Location</b>").openPopup();
                    this.userCircle = L.circle([lat, lng], { radius: accuracy, color: "#3b82f6", fillOpacity: 0.15 }).addTo(this.map);

                    this.map.setView([lat, lng], 15);
                    if (typeof callback === "function") callback({ latitude: lat, longitude: lng });
                },
                (err) => {
                    console.warn("[SmartCityMap] Geolocation denied or unavailable:", err.message);
                    if (window.SmartCityUI) SmartCityUI.toast("Unable to retrieve GPS location.", "info");
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        }
    }

    window.SmartCityMap = SmartCityMap;
})();
