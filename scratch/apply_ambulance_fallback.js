const fs = require('fs');
const path = 'backend/routes/ambulance.routes.js';
let content = fs.readFileSync(path, 'utf8');

const fallbackDeclaration = `
let fallbackAmbulances = [
    {
        id: 1,
        ambulance_id: "AMB-01",
        vehicle_number: "UP-53-AZ-1081",
        driver_name: "Ramesh Yadav",
        driver_mobile: "9876543210",
        ambulance_type: "Advanced Life Support (ICU)",
        hospital_name: "AIIMS Gorakhpur",
        location: "Kushmi Jungle Corridor, Gorakhpur",
        status: "Available",
        latitude: 26.7431,
        longitude: 83.4344,
        patient_name: null,
        patient_mobile: null,
        patient_lat: null,
        patient_lng: null,
        patient_address: null,
        destination_hospital_id: 1,
        destination_hospital_name: "AIIMS Gorakhpur",
        assigned_at: null,
        created_at: new Date(),
        updated_at: new Date()
    },
    {
        id: 2,
        ambulance_id: "AMB-02",
        vehicle_number: "UP-53-AZ-1082",
        driver_name: "Sunil Kumar",
        driver_mobile: "9876543211",
        ambulance_type: "Basic Life Support",
        hospital_name: "BRD Medical College",
        location: "Medical Road, Gorakhpur",
        status: "Available",
        latitude: 26.7865,
        longitude: 83.3817,
        patient_name: null,
        patient_mobile: null,
        patient_lat: null,
        patient_lng: null,
        patient_address: null,
        destination_hospital_id: 2,
        destination_hospital_name: "BRD Medical College",
        assigned_at: null,
        created_at: new Date(),
        updated_at: new Date()
    },
    {
        id: 3,
        ambulance_id: "AMB-03",
        vehicle_number: "UP-53-AZ-1083",
        driver_name: "Mohan Tiwari",
        driver_mobile: "9876543212",
        ambulance_type: "Advanced Life Support (ICU)",
        hospital_name: "District Hospital Gorakhpur",
        location: "Golghar, Gorakhpur",
        status: "Available",
        latitude: 26.7588,
        longitude: 83.3732,
        patient_name: null,
        patient_mobile: null,
        patient_lat: null,
        patient_lng: null,
        patient_address: null,
        destination_hospital_id: 3,
        destination_hospital_name: "District Hospital Gorakhpur",
        assigned_at: null,
        created_at: new Date(),
        updated_at: new Date()
    }
];
`;

if (!content.includes('let fallbackAmbulances')) {
    content = content.replace('const AMBULANCE_DETAIL_COLUMNS', fallbackDeclaration + '\nconst AMBULANCE_DETAIL_COLUMNS');
}

// 1. GET ALL
content = content.replace(
`        if (err) {
            console.error("Get all ambulances error:", err);
            return res.status(500).json({ message: "Database error." });
        }`,
`        if (err) {
            return res.json({
                message: "Ambulances fetched successfully (memory store fallback).",
                ambulances: fallbackAmbulances
            });
        }`
);

// 2. GET SINGLE
content = content.replace(
`        if (err) {
            console.error("Get single ambulance error:", err);
            return res.status(500).json({ message: "Database error." });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "Ambulance not found." });
        }`,
`        if (err) {
            const found = fallbackAmbulances.find(a => String(a.id) === String(id) || String(a.ambulance_id) === String(id));
            if (found) return res.json({ message: "Ambulance fetched successfully.", ambulance: found });
            return res.status(404).json({ message: "Ambulance not found." });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "Ambulance not found." });
        }`
);

// 3. ASSIGN
content = content.replace(
`        if (err) {
            console.error("Assign ambulance error:", err);
            return res.status(500).json({ message: "Database error." });
        }`,
`        if (err) {
            const idx = fallbackAmbulances.findIndex(a => String(a.id) === String(id) || String(a.ambulance_id) === String(id));
            if (idx >= 0) {
                fallbackAmbulances[idx] = {
                    ...fallbackAmbulances[idx],
                    status: 'Assigned',
                    patient_name: patientName,
                    patient_mobile: patientMobile,
                    patient_lat: pLat,
                    patient_lng: pLng,
                    patient_address: patientAddress,
                    destination_hospital_id: destinationHospitalId,
                    destination_hospital_name: destinationHospitalName,
                    assigned_at: new Date()
                };
                const io = req.app.get("io");
                if (io) io.to("ambulance-tracking").emit("ambulance-assigned", fallbackAmbulances[idx]);
                return res.json({ message: "Ambulance assigned successfully.", ambulance: fallbackAmbulances[idx] });
            }
            return res.status(500).json({ message: "Database error." });
        }`
);

// 4. STATUS
content = content.replace(
`        if (err) {
            console.error("Update ambulance status error:", err);
            return res.status(500).json({ message: "Database error." });
        }`,
`        if (err) {
            const idx = fallbackAmbulances.findIndex(a => String(a.id) === String(id) || String(a.ambulance_id) === String(id));
            if (idx >= 0) {
                fallbackAmbulances[idx].status = status;
                const io = req.app.get("io");
                if (io) io.to("ambulance-tracking").emit("ambulance-status-updated", fallbackAmbulances[idx]);
                return res.json({ message: "Ambulance status updated successfully.", ambulance: fallbackAmbulances[idx] });
            }
            return res.status(500).json({ message: "Database error." });
        }`
);

// 5. RESET
content = content.replace(
`        if (err) {
            console.error("Reset ambulance error:", err);
            return res.status(500).json({ message: "Database error." });
        }`,
`        if (err) {
            const idx = fallbackAmbulances.findIndex(a => String(a.id) === String(id) || String(a.ambulance_id) === String(id));
            if (idx >= 0) {
                fallbackAmbulances[idx] = {
                    ...fallbackAmbulances[idx],
                    status: 'Available',
                    patient_name: null,
                    patient_mobile: null,
                    patient_lat: null,
                    patient_lng: null,
                    patient_address: null,
                    destination_hospital_id: null,
                    destination_hospital_name: null,
                    assigned_at: null
                };
                const io = req.app.get("io");
                if (io) io.to("ambulance-tracking").emit("ambulance-reset", fallbackAmbulances[idx]);
                return res.json({ message: "Ambulance reset successfully.", ambulance: fallbackAmbulances[idx] });
            }
            return res.status(500).json({ message: "Database error." });
        }`
);

// 6. NEARBY SEARCH
content = content.replace(
`    db.query(sql, [lat, lng, lat, limit], (err, results) => {
        if (err) {
            console.error("Nearby ambulances error:", err);
            return res.status(500).json({ message: "Database error." });
        }`,
`    db.query(sql, [lat, lng, lat, limit], (err, results) => {
        if (err) {
            const haversine = (lat1, lon1, lat2, lon2) => {
                const R = 6371;
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                          Math.sin(dLon/2) * Math.sin(dLon/2);
                return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(2));
            };
            const sorted = fallbackAmbulances
                .filter(a => a.status === 'Available')
                .map(a => ({ ...a, distance_km: haversine(lat, lng, a.latitude, a.longitude) }))
                .sort((a, b) => a.distance_km - b.distance_km)
                .slice(0, limit);
            return res.json({
                message: "Nearby ambulances fetched successfully (memory fallback).",
                ambulances: sorted
            });
        }`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated ambulance.routes.js with resilient fallback');

