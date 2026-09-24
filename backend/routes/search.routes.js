const express = require("express");
const router = express.Router();
const pool = require("../config/db").promise();
const { optionalToken } = require("../middleware/auth.middleware");

// =========================================================
// GLOBAL MULTI-ENTITY SEARCH
// =========================================================

router.get("/api/search", optionalToken, async (req, res) => {
    try {
        const query = (req.query.q || "").trim();
        if (!query || query.length < 2) {
            return res.json({
                success: true,
                query,
                results: []
            });
        }

        const searchTerm = `%${query}%`;
        const results = [];

        // Determine user identity securely from verified JWT
        const user = req.user;
        const role = (user && (user.role || user.type) ? String(user.role || user.type) : "").toLowerCase();
        const userDept = (user && user.department ? String(user.department) : "").toLowerCase();

        // 1. Search Hospitals
        const [hospitals] = await pool.query(
            "SELECT id, hospital_name AS name, address, latitude, longitude FROM hospitals WHERE hospital_name LIKE ? OR address LIKE ? LIMIT 4",
            [searchTerm, searchTerm]
        );
        hospitals.forEach(h => {
            results.push({
                type: "hospital",
                category: "Healthcare",
                id: h.id,
                title: h.name,
                subtitle: h.address,
                latitude: h.latitude,
                longitude: h.longitude,
                url: "/pages/hospital/hospital.html"
            });
        });

        // 2. Search Parking Lots
        const [parking] = await pool.query(
            "SELECT id, parking_code, name, address, latitude, longitude FROM parking_lots WHERE name LIKE ? OR address LIKE ? LIMIT 4",
            [searchTerm, searchTerm]
        );
        parking.forEach(p => {
            results.push({
                type: "parking",
                category: "Parking",
                id: p.id,
                title: p.name,
                subtitle: p.address,
                latitude: p.latitude,
                longitude: p.longitude,
                url: "/pages/parking/parking.html"
            });
        });

        // 3. Search Famous Places / Tourism
        const [places] = await pool.query(
            "SELECT id, name, category, address, locality, latitude, longitude FROM famous_places WHERE name LIKE ? OR category LIKE ? OR address LIKE ? OR locality LIKE ? LIMIT 4",
            [searchTerm, searchTerm, searchTerm, searchTerm]
        );
        places.forEach(p => {
            results.push({
                type: "place",
                category: "Tourism",
                id: p.id,
                title: p.name,
                subtitle: `${p.category || 'Attraction'} • ${p.address || p.locality || 'Gorakhpur'}`,
                latitude: p.latitude,
                longitude: p.longitude,
                url: "/pages/famous_places/famous_places.html"
            });
        });

        // 4. Search Police Stations
        const [police] = await pool.query(
            "SELECT id, name, location, latitude, longitude FROM police_stations WHERE name LIKE ? OR location LIKE ? LIMIT 4",
            [searchTerm, searchTerm]
        );
        police.forEach(p => {
            results.push({
                type: "police",
                category: "Police",
                id: p.id,
                title: p.name,
                subtitle: p.location,
                latitude: p.latitude,
                longitude: p.longitude,
                url: "/pages/police/police.html"
            });
        });

        // 5. Search Street Lights
        const [lights] = await pool.query(
            "SELECT id, light_code, name, location, status, latitude, longitude FROM street_lights WHERE name LIKE ? OR location LIKE ? OR light_code LIKE ? LIMIT 3",
            [searchTerm, searchTerm, searchTerm]
        );
        lights.forEach(l => {
            results.push({
                type: "street_light",
                category: "Street Lights",
                id: l.id,
                title: l.name,
                subtitle: `${l.light_code} • ${l.location} (${l.status})`,
                latitude: l.latitude,
                longitude: l.longitude,
                url: "/index.html"
            });
        });

        // 6. Search Service Requests (Staff/Admin only)
        if (role === "admin" || role === "staff") {
            let reqQuery = "SELECT id, request_code, department, category, status, priority FROM service_requests WHERE (request_code LIKE ? OR category LIKE ? OR description LIKE ?)";
            const reqParams = [searchTerm, searchTerm, searchTerm];
            if (role === "staff") {
                reqQuery += " AND LOWER(department) = ?";
                reqParams.push(userDept);
            }
            reqQuery += " LIMIT 4";
            const [requests] = await pool.query(reqQuery, reqParams);
            requests.forEach(r => {
                results.push({
                    type: "service_request",
                    category: `Service Request (${r.department})`,
                    id: r.id,
                    title: `${r.request_code}: ${r.category}`,
                    subtitle: `Status: ${r.status} • Priority: ${r.priority}`,
                    url: "/index.html"
                });
            });
        }

        res.json({
            success: true,
            query,
            totalCount: results.length,
            results
        });
    } catch (err) {
        console.error("Global search error:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

module.exports = router;
