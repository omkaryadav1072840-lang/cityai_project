const express = require("express");
const router = express.Router();
const pool = require("../config/db").promise();

// =========================================================
// UNIFIED MULTI-LAYER INCIDENT & ASSET MAP API
// =========================================================

router.get("/api/map/incidents", async (req, res) => {
    try {
        const { layers } = req.query; // optional comma-separated filter: "traffic,waste,emergency,hospital,parking,street_lights,aqi,places"
        const requestedLayers = layers ? layers.split(",").map(l => l.trim().toLowerCase()) : null;

        const shouldInclude = (layerName) => !requestedLayers || requestedLayers.includes(layerName);

        const features = [];

        // 1. TRAFFIC INCIDENTS & SIGNALS
        if (shouldInclude("traffic")) {
            const [incidents] = await pool.query(
                "SELECT id, incident_type, severity, description, latitude, longitude, status, location_name FROM traffic_incidents WHERE status = 'Active'"
            );
            incidents.forEach(inc => {
                if (inc.latitude && inc.longitude) {
                    features.push({
                        type: "Feature",
                        geometry: { type: "Point", coordinates: [Number(inc.longitude), Number(inc.latitude)] },
                        properties: {
                            layer: "traffic",
                            subType: "incident",
                            id: inc.id,
                            title: `${inc.severity} Traffic: ${inc.incident_type}`,
                            description: inc.description || inc.location_name,
                            severity: inc.severity,
                            icon: "traffic-incident"
                        }
                    });
                }
            });

            const [signals] = await pool.query(
                "SELECT id, street_name, latitude, longitude, current_color, status FROM traffic_signals"
            );
            signals.forEach(sig => {
                if (sig.latitude && sig.longitude) {
                    features.push({
                        type: "Feature",
                        geometry: { type: "Point", coordinates: [Number(sig.longitude), Number(sig.latitude)] },
                        properties: {
                            layer: "traffic",
                            subType: "signal",
                            id: sig.id,
                            title: `Signal: ${sig.street_name || sig.id}`,
                            currentColor: sig.current_color,
                            status: sig.status,
                            icon: "traffic-signal"
                        }
                    });
                }
            });
        }

        // 2. WASTE REQUESTS
        if (shouldInclude("waste")) {
            const [waste] = await pool.query(
                "SELECT id, waste_type, status, location, latitude, longitude FROM waste_bin_requests WHERE status IN ('Pending', 'In Progress')"
            );
            waste.forEach(w => {
                if (w.latitude && w.longitude) {
                    features.push({
                        type: "Feature",
                        geometry: { type: "Point", coordinates: [Number(w.longitude), Number(w.latitude)] },
                        properties: {
                            layer: "waste",
                            subType: "waste_overflow",
                            id: w.id,
                            title: `Waste: ${w.waste_type || 'Civic Waste'}`,
                            description: w.location,
                            status: w.status,
                            icon: "waste-bin"
                        }
                    });
                }
            });
        }

        // 3. EMERGENCY INCIDENTS
        if (shouldInclude("emergency")) {
            const [emergency] = await pool.query(
                "SELECT id, type, priority, description, latitude, longitude, status FROM emergency_incidents WHERE status IN ('Reported', 'Dispatched', 'En Route')"
            );
            emergency.forEach(em => {
                if (em.latitude && em.longitude) {
                    features.push({
                        type: "Feature",
                        geometry: { type: "Point", coordinates: [Number(em.longitude), Number(em.latitude)] },
                        properties: {
                            layer: "emergency",
                            subType: "emergency_sos",
                            id: em.id,
                            title: `🚨 Emergency: ${em.type}`,
                            description: em.description,
                            severity: em.priority,
                            status: em.status,
                            icon: "emergency-sos"
                        }
                    });
                }
            });
        }

        // 4. HOSPITALS
        if (shouldInclude("hospital")) {
            const [hospitals] = await pool.query(`
                SELECT id, hospital_name, address, latitude, longitude, phone, total_beds, icu_beds
                FROM hospitals
            `);
            hospitals.forEach(h => {
                if (h.latitude && h.longitude) {
                    features.push({
                        type: "Feature",
                        geometry: { type: "Point", coordinates: [Number(h.longitude), Number(h.latitude)] },
                        properties: {
                            layer: "hospital",
                            subType: "healthcare_facility",
                            id: h.id,
                            title: h.hospital_name,
                            description: `${h.address} • Total Beds: ${h.total_beds || 0} (${h.icu_beds || 0} ICU)`,
                            availableBeds: Math.max(0, (h.total_beds || 100) - 35),
                            phone: h.phone,
                            icon: "hospital"
                        }
                    });
                }
            });
        }

        // 5. PARKING LOTS
        if (shouldInclude("parking")) {
            const [parking] = await pool.query(`
                SELECT id, parking_code, name, address, latitude, longitude, hourly_rate, total_slots, available_slots
                FROM parking_lots
            `);
            parking.forEach(p => {
                if (p.latitude && p.longitude) {
                    features.push({
                        type: "Feature",
                        geometry: { type: "Point", coordinates: [Number(p.longitude), Number(p.latitude)] },
                        properties: {
                            layer: "parking",
                            subType: "parking_lot",
                            id: p.id,
                            title: p.name,
                            description: `${p.address} • Available Slots: ${p.available_slots || 0}/${p.total_slots || 0} • ₹${p.hourly_rate || 20}/hr`,
                            availableSlots: p.available_slots || 0,
                            icon: "parking"
                        }
                    });
                }
            });
        }

        // 6. STREET LIGHTS
        if (shouldInclude("street_lights")) {
            const [lights] = await pool.query(
                "SELECT id, light_code, name, location, status, brightness, fault_type, latitude, longitude FROM street_lights"
            );
            lights.forEach(l => {
                if (l.latitude && l.longitude) {
                    features.push({
                        type: "Feature",
                        geometry: { type: "Point", coordinates: [Number(l.longitude), Number(l.latitude)] },
                        properties: {
                            layer: "street_lights",
                            subType: "street_light",
                            id: l.id,
                            title: `${l.name} (${l.status})`,
                            description: `${l.location} • Brightness: ${l.brightness}% ${l.fault_type ? '• Fault: ' + l.fault_type : ''}`,
                            status: l.status,
                            brightness: l.brightness,
                            icon: l.status === "FAULT" ? "light-fault" : (l.status === "ON" ? "light-on" : "light-off")
                        }
                    });
                }
            });
        }

        // 7. AQI SENSORS
        if (shouldInclude("aqi")) {
            const [sensors] = await pool.query(
                "SELECT id, sensor_code, location, zone, aqi, pm25, pm10, temp_c, humidity_pct, latitude, longitude FROM city_environmental_sensors WHERE status = 'Active'"
            );
            sensors.forEach(s => {
                if (s.latitude && s.longitude) {
                    features.push({
                        type: "Feature",
                        geometry: { type: "Point", coordinates: [Number(s.longitude), Number(s.latitude)] },
                        properties: {
                            layer: "aqi",
                            subType: "aqi_sensor",
                            id: s.id,
                            title: `AQI ${s.aqi} - ${s.location}`,
                            description: `Zone: ${s.zone} • PM2.5: ${s.pm25} • PM10: ${s.pm10} • Temp: ${s.temp_c}°C`,
                            aqi: s.aqi,
                            icon: "aqi-station"
                        }
                    });
                }
            });
        }

        // 8. FAMOUS PLACES
        if (shouldInclude("places")) {
            const [places] = await pool.query(
                "SELECT id, name, category, address, locality, latitude, longitude FROM famous_places"
            );
            places.forEach(pl => {
                if (pl.latitude && pl.longitude) {
                    features.push({
                        type: "Feature",
                        geometry: { type: "Point", coordinates: [Number(pl.longitude), Number(pl.latitude)] },
                        properties: {
                            layer: "places",
                            subType: "heritage_tourism",
                            id: pl.id,
                            title: pl.name,
                            description: `${pl.category} • ${pl.address || pl.locality || 'Gorakhpur'}`,
                            icon: "famous-place"
                        }
                    });
                }
            });
        }

        res.json({
            type: "FeatureCollection",
            totalFeatures: features.length,
            features
        });
    } catch (err) {
        console.error("Get map incidents error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

module.exports = router;
