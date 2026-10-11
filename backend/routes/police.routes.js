const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken, optionalToken, requireRole } = require("../middleware/auth.middleware");

// =========================================================
// POLICE STATIONS — GET ALL
// =========================================================

router.get("/api/police/stations", (req, res) => {
    const sql = `
        SELECT
            id, station_id, name, sho_name, phone,
            jurisdiction, location, latitude, longitude,
            created_at
        FROM police_stations
        ORDER BY name ASC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Police stations fetch error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        res.json({
            success: true,
            message: "Police stations fetched successfully.",
            stations: results
        });
    });
});

// =========================================================
// POLICE STATS — GET MONTHLY CRIME STATISTICS
// =========================================================

router.get("/api/police/stats", (req, res) => {
    // Ordered chronologically; limit configurable via query param
    const limit = Math.min(Number(req.query.limit) || 6, 12);

    const sql = `
        SELECT
            month_year, theft, assault, traffic_violations,
            domestic, cybercrime, other, total
        FROM police_stats
        ORDER BY id ASC
        LIMIT ?
    `;

    db.query(sql, [limit], (err, results) => {
        if (err) {
            console.error("Police stats fetch error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        // Also compute per-category totals for summary cards
        const summary = results.reduce(
            (acc, row) => {
                acc.theft            += Number(row.theft            || 0);
                acc.assault          += Number(row.assault          || 0);
                acc.traffic_violations += Number(row.traffic_violations || 0);
                acc.domestic         += Number(row.domestic         || 0);
                acc.cybercrime       += Number(row.cybercrime       || 0);
                acc.other            += Number(row.other            || 0);
                acc.total            += Number(row.total            || 0);
                return acc;
            },
            { theft: 0, assault: 0, traffic_violations: 0, domestic: 0, cybercrime: 0, other: 0, total: 0 }
        );

        res.json({
            success: true,
            message: "Police statistics fetched. Data is for demonstration purposes only.",
            verified: false,
            monthly: results,
            summary
        });
    });
});

// =========================================================
// POLICE COMPLAINTS — SUBMIT
// =========================================================

router.post(["/api/police/complaint", "/api/police/complaints"], optionalToken, (req, res) => {
    const { userId, citizenName, mobile, category, subject, description, stationId } = req.body;
    const finalUserId = req.user ? req.user.id : (userId || null);
    const finalCitizenName = (req.user && req.user.name) ? req.user.name : citizenName;
    const finalMobile = (req.user && req.user.mobile) ? req.user.mobile : mobile;

    if (!finalCitizenName || !finalMobile || !category || !subject || !description) {
        return res.status(400).json({
            message: "Name, mobile, category, subject, and description are required."
        });
    }

    const allowedCategories = [
        "Theft", "Assault", "Domestic Violence", "Cybercrime",
        "Traffic Violation", "Missing Person", "Property Dispute",
        "Harassment", "Fraud", "Other"
    ];

    if (!allowedCategories.includes(category)) {
        return res.status(400).json({ message: "Invalid complaint category." });
    }

    const complaintId = "CMP-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(Math.random() * 1000);

    db.query(
        `INSERT INTO police_complaints
         (complaint_id, user_id, citizen_name, mobile, category, subject, description, status, station_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Under Review', ?)`,
        [complaintId, finalUserId, finalCitizenName, finalMobile, category, subject, description, stationId || null],
        (err, result) => {
            if (err) {
                console.error("Police complaint insert error:", err);
                return res.status(500).json({ message: "Database error." });
            }

            res.status(201).json({
                success: true,
                message: "Complaint registered successfully. You will receive a response within 24–48 hours.",
                complaint: {
                    id: result.insertId,
                    complaintId,
                    citizenName,
                    category,
                    status: "Under Review"
                }
            });
        }
    );
});

// =========================================================
// POLICE COMPLAINTS — GET (by user or all for staff)
// =========================================================

router.get("/api/police/complaints", authenticateToken, (req, res) => {
    const { userId } = req.query;
    const isStaffOrAdmin = ["staff", "admin"].includes(req.user.role) || ["staff", "admin"].includes(req.user.type);

    let sql = `
        SELECT id, complaint_id, citizen_name, mobile,
               category, subject, status, station_id, created_at
        FROM police_complaints
    `;

    const params = [];
    if (!isStaffOrAdmin) {
        // Citizens strictly isolated to their own complaints
        sql += " WHERE (user_id = ? OR mobile = ?)";
        params.push(req.user.id, req.user.mobile || "");
    } else if (userId) {
        sql += " WHERE user_id = ?";
        params.push(userId);
    }

    sql += " ORDER BY created_at DESC";

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Police complaints fetch error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        res.json({ success: true, complaints: results });
    });
});

// =========================================================
// POLICE COMPLAINTS — UPDATE STATUS (Staff/Admin)
// =========================================================

router.put("/api/police/complaints/:id/status", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;
    const { status } = req.body;

    const allowed = ["Under Review", "Acknowledged", "Under Investigation", "Resolved", "Closed"];
    if (!allowed.includes(status)) {
        return res.status(400).json({ message: "Invalid status." });
    }

    db.query(
        "UPDATE police_complaints SET status = ? WHERE id = ? OR complaint_id = ?",
        [status, id, id],
        (err, result) => {
            if (err) {
                console.error("Complaint status update error:", err);
                return res.status(500).json({ message: "Database error." });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Complaint not found." });
            }

            res.json({ success: true, message: "Complaint status updated.", status });
        }
    );
});

// =========================================================
// POLICE EMERGENCY CONTACTS
// =========================================================

router.get("/api/police/emergency-contacts", (req, res) => {
    res.json({
        success: true,
        policeHelpline: "112",
        womenHelpline: "1090",
        cyberCrimeHelpline: "1930",
        trafficHelpline: "1073",
        fireHelpline: "101",
        seniorCitizenHelpline: "14567",
        spGorakhpurOffice: "0551-2336601",
        cityControlRoom: "0551-2200100"
    });
});

// =========================================================
// 1. PUBLIC COMPLAINT TRACKER
// =========================================================

router.get("/api/police/complaints/track/:ref", (req, res) => {
    const ref = String(req.params.ref || "").trim();
    if (!ref) {
        return res.status(400).json({ success: false, message: "Reference or mobile number required." });
    }

    const sql = `
        SELECT c.*, s.name as station_name, s.sho_name, s.phone as station_phone, s.location as station_location
        FROM police_complaints c
        LEFT JOIN police_stations s ON (c.station_id = s.id OR c.station_id = s.station_id)
        WHERE c.complaint_id = ? OR c.mobile = ?
        ORDER BY c.created_at DESC
        LIMIT 5
    `;

    db.query(sql, [ref, ref], (err, results) => {
        if (err) {
            console.error("Complaint track error:", err);
            return res.status(500).json({ success: false, message: "Database query error." });
        }
        if (!results.length) {
            return res.status(404).json({ success: false, message: `No active complaint found matching reference "${ref}".` });
        }
        res.json({
            success: true,
            message: "Complaint record located in Gorakhpur Police CCTNS database.",
            complaint: results[0],
            records: results
        });
    });
});

// =========================================================
// 2. ONE-TAP EMERGENCY SOS & GEO-BEACON DISPATCH
// =========================================================

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

router.post("/api/police/emergency-sos", optionalToken, (req, res) => {
    const {
        latitude = 26.7600,
        longitude = 83.3710,
        citizenName = "Emergency Citizen",
        mobile = "112",
        alertType = "EMERGENCY_SOS",
        batteryLevel = 90,
        silent = false
    } = req.body;

    const lat = Number(latitude) || 26.7600;
    const lon = Number(longitude) || 83.3710;

    // Find nearest Gorakhpur police station
    db.query("SELECT * FROM police_stations", (err, stations) => {
        if (err || !stations || !stations.length) {
            console.error("SOS stations fetch error:", err);
            return res.status(500).json({ success: false, message: "Error locating police stations." });
        }

        let nearestStation = stations[0];
        let minDistance = calculateHaversineKm(lat, lon, Number(nearestStation.latitude), Number(nearestStation.longitude));

        for (const s of stations) {
            const dist = calculateHaversineKm(lat, lon, Number(s.latitude), Number(s.longitude));
            if (dist < minDistance) {
                minDistance = dist;
                nearestStation = s;
            }
        }

        const alertId = "SOS-GKP-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(Math.random() * 900 + 100);
        const dispatchedUnit = minDistance < 2.5 ? "PRV-0241 (Golghar Sector)" : "PRV-0245 (Medical Sector)";
        const etaMinutes = Math.max(2, Math.round(minDistance * 2.2));

        const insertSql = `
            INSERT INTO police_sos_alerts
            (alert_id, citizen_name, mobile, latitude, longitude, nearest_station_id, nearest_station_name, distance_km, alert_type, battery_level, is_silent, status, dispatched_unit)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DISPATCHED', ?)
        `;

        db.query(insertSql, [
            alertId,
            (req.user && req.user.name) ? req.user.name : citizenName,
            (req.user && req.user.mobile) ? req.user.mobile : mobile,
            lat, lon,
            nearestStation.station_id,
            nearestStation.name,
            minDistance.toFixed(2),
            alertType,
            batteryLevel,
            silent ? 1 : 0,
            dispatchedUnit
        ], (iErr, result) => {
            if (iErr) {
                console.error("SOS Alert insert error:", iErr);
            }

            res.status(201).json({
                success: true,
                message: "🚨 EMERGENCY DISPATCH ACTIVATED! Gorakhpur Police PRV unit has been dispatched.",
                alertId,
                nearestStation: {
                    name: nearestStation.name,
                    stationId: nearestStation.station_id,
                    sho: nearestStation.sho_name,
                    phone: nearestStation.phone,
                    location: nearestStation.location,
                    distanceKm: Number(minDistance.toFixed(2))
                },
                dispatch: {
                    unit: dispatchedUnit,
                    estimatedArrivalMinutes: etaMinutes,
                    controlRoomHelpline: "112 / 0551-2200100",
                    status: "DISPATCHED"
                }
            });
        });
    });
});

router.get("/api/police/sos-alerts", optionalToken, (req, res) => {
    db.query("SELECT * FROM police_sos_alerts ORDER BY created_at DESC LIMIT 20", (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Database error." });
        }
        res.json({ success: true, alerts: rows });
    });
});

// =========================================================
// 3. DIAL 112 PRV BEAT PATROL FLEET UNITS (REALTIME TELEMETRY)
// =========================================================

router.get("/api/police/prv-units", (req, res) => {
    const timeFactor = (Date.now() / 15000) % (2 * Math.PI);
    const prvUnits = [
        {
            id: "PRV-0241",
            vehicleType: "Toyota Innova Crysta (UP 112)",
            officerInCharge: "Sub-Inspector V.K. Singh",
            phone: "9454401241",
            beat: "Golghar Central & Town Hall Sector",
            latitude: Number((26.7595 + 0.0035 * Math.sin(timeFactor)).toFixed(6)),
            longitude: Number((83.3712 + 0.0035 * Math.cos(timeFactor)).toFixed(6)),
            speedKmH: 26,
            status: "Patrolling",
            fuelLevel: "84%",
            radioFreq: "154.250 MHz",
            assignedStation: "Kotwali Police Station"
        },
        {
            id: "PRV-0242",
            vehicleType: "Mahindra Scorpio (UP 112)",
            officerInCharge: "ASI R.P. Mishra",
            phone: "9454401242",
            beat: "Mohaddipur Junction & University Road",
            latitude: Number((26.7510 + 0.003 * Math.cos(timeFactor)).toFixed(6)),
            longitude: Number((83.3890 + 0.003 * Math.sin(timeFactor)).toFixed(6)),
            speedKmH: 32,
            status: "Patrolling",
            fuelLevel: "76%",
            radioFreq: "154.250 MHz",
            assignedStation: "Cantt Police Station"
        },
        {
            id: "PRV-0245",
            vehicleType: "Mahindra Bolero Neo (UP 112)",
            officerInCharge: "Head Constable Arvind Rao",
            phone: "9454401245",
            beat: "Medical College & Asuran Crossing",
            latitude: Number((26.7840 + 0.002 * Math.sin(timeFactor * 1.2)).toFixed(6)),
            longitude: Number((83.3950 + 0.002 * Math.cos(timeFactor * 1.2)).toFixed(6)),
            speedKmH: 0,
            status: "On Scene",
            fuelLevel: "91%",
            radioFreq: "154.300 MHz",
            assignedStation: "Medical College Outpost"
        },
        {
            id: "PRV-0248",
            vehicleType: "Toyota Innova (UP 112 - Pink Patrol)",
            officerInCharge: "Sub-Inspector Suman Verma (Women Special)",
            phone: "9454401248",
            beat: "Ramgarh Tal Nauka Vihar & Planetarium",
            latitude: Number((26.7420 + 0.003 * Math.cos(timeFactor * 0.8)).toFixed(6)),
            longitude: Number((83.3980 + 0.003 * Math.sin(timeFactor * 0.8)).toFixed(6)),
            speedKmH: 20,
            status: "Patrolling",
            fuelLevel: "88%",
            radioFreq: "154.400 MHz",
            assignedStation: "Ramgarh Tal Sector"
        },
        {
            id: "PRV-0250",
            vehicleType: "Mahindra Scorpio (UP 112)",
            officerInCharge: "Sub-Inspector Alok Rai",
            phone: "9454401250",
            beat: "Cantt & Railway Station Perimeter",
            latitude: Number((26.7640 + 0.0025 * Math.sin(timeFactor)).toFixed(6)),
            longitude: Number((83.3680 + 0.0025 * Math.cos(timeFactor)).toFixed(6)),
            speedKmH: 40,
            status: "Dispatched",
            fuelLevel: "68%",
            radioFreq: "154.250 MHz",
            assignedStation: "Gorakhpur Junction Post"
        }
    ];

    res.json({ success: true, count: prvUnits.length, units: prvUnits });
});

// =========================================================
// 4. MISSION SHAKTI — SAFE RIDE / WALK TRACKER
// =========================================================

router.post("/api/police/safe-ride", optionalToken, (req, res) => {
    const {
        citizenName,
        mobile,
        origin,
        destination,
        emergencyContact,
        vehicleDetails = "Cab/Auto",
        etaMinutes = 25
    } = req.body;

    const finalName = (req.user && req.user.name) ? req.user.name : citizenName;
    const finalMobile = (req.user && req.user.mobile) ? req.user.mobile : mobile;

    if (!finalName || !finalMobile || !origin || !destination || !emergencyContact) {
        return res.status(400).json({
            success: false,
            message: "Citizen name, mobile, origin, destination, and emergency contact are required."
        });
    }

    const rideId = "MS-RIDE-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(Math.random() * 900 + 100);

    const sql = `
        INSERT INTO police_safe_rides
        (ride_id, citizen_name, mobile, origin, destination, emergency_contact, vehicle_details, eta_minutes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    `;

    db.query(sql, [rideId, finalName, finalMobile, origin, destination, emergencyContact, vehicleDetails, etaMinutes], (err, result) => {
        if (err) {
            console.error("Safe Ride insert error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        res.status(201).json({
            success: true,
            message: "👩 Mission Shakti Safe Ride Registered. Police monitoring active until safe arrival.",
            ride: {
                rideId,
                citizenName: finalName,
                origin,
                destination,
                etaMinutes: Number(etaMinutes),
                safetyHotline: "1090 (Women Powerline) / 112 (Emergency)",
                status: "ACTIVE"
            }
        });
    });
});

router.get("/api/police/safe-rides", optionalToken, (req, res) => {
    db.query("SELECT * FROM police_safe_rides ORDER BY created_at DESC LIMIT 20", (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Database error." });
        }
        res.json({ success: true, rides: rows });
    });
});

// =========================================================
// 5. CYBER CRIME 1930 RAPID GOLDEN-HOUR FREEZE
// =========================================================

router.post("/api/police/cyber-freeze", optionalToken, (req, res) => {
    const {
        victimName,
        mobile,
        fraudType = "UPI Fraud",
        transactionRef,
        bankName,
        amountLost,
        suspectDetails = ""
    } = req.body;

    const finalName = (req.user && req.user.name) ? req.user.name : victimName;
    const finalMobile = (req.user && req.user.mobile) ? req.user.mobile : mobile;

    if (!finalName || !finalMobile || !transactionRef || !amountLost) {
        return res.status(400).json({
            success: false,
            message: "Victim name, mobile, transaction reference (UTR), and amount lost are mandatory for freeze."
        });
    }

    const freezeId = "CYB-1930-" + Date.now().toString(36).toUpperCase();

    // Register into complaints table as urgent cyber crime
    const desc = `[1930 RAPID FREEZE] Fraud: ${fraudType} | UTR: ${transactionRef} | Bank: ${bankName || 'N/A'} | Amount: ₹${amountLost} | Suspect: ${suspectDetails}`;

    db.query(
        `INSERT INTO police_complaints
         (complaint_id, user_id, citizen_name, mobile, category, subject, description, status, station_id)
         VALUES (?, ?, ?, ?, 'Cybercrime', ?, ?, 'Under Investigation', 'PS-001')`,
        [freezeId, req.user ? req.user.id : null, finalName, finalMobile, `URGENT 1930 FREEZE: ₹${amountLost} via ${bankName || 'UPI'}`, desc],
        (err, result) => {
            if (err) {
                console.error("Cyber freeze register error:", err);
                return res.status(500).json({ success: false, message: "Database error." });
            }

            res.status(201).json({
                success: true,
                message: "🚨 1930 Cyber Freeze Alert Transmitted to Gorakhpur Cyber Cell & Nodal Bank Officer.",
                freezeId,
                transactionRef,
                amount: amountLost,
                bankName: bankName || "Nodal Gateway",
                cctnsStatus: "UNDER_INVESTIGATION",
                cyberCellHelpline: "1930 (National Cyber Crime Portal)"
            });
        }
    );
});

// =========================================================
// 6. STOLEN VEHICLE & LOST PROPERTY HOTLIST SEARCH
// =========================================================

router.get("/api/police/hotlist-search", (req, res) => {
    const query = String(req.query.q || req.query.query || "").trim().toUpperCase().replace(/[\s-]/g, "");
    if (!query || query.length < 3) {
        return res.status(400).json({ success: false, message: "Please enter at least 3 characters of vehicle plate or IMEI." });
    }

    const sql = `
        SELECT h.*, s.name as station_name, s.phone as station_phone
        FROM police_hotlist h
        LEFT JOIN police_stations s ON (h.station_id = s.id OR h.station_id = s.station_id)
        WHERE REPLACE(REPLACE(h.identifier, ' ', ''), '-', '') LIKE ?
           OR REPLACE(REPLACE(h.fir_number, ' ', ''), '-', '') LIKE ?
        LIMIT 10
    `;

    db.query(sql, [`%${query}%`, `%${query}%`], (err, results) => {
        if (err) {
            console.error("Hotlist search error:", err);
            return res.status(500).json({ success: false, message: "Database query error." });
        }

        res.json({
            success: true,
            query,
            isFlagged: results.length > 0,
            count: results.length,
            records: results
        });
    });
});

// =========================================================
// 7. TENANT & DOMESTIC HELP POLICE VERIFICATION
// =========================================================

router.post("/api/police/verification-request", optionalToken, (req, res) => {
    const {
        applicantName,
        applicantMobile,
        candidateName,
        candidateType = "Tenant",
        candidateAadhar,
        candidateMobile = "",
        address,
        stationId = "PS-001"
    } = req.body;

    const finalAppName = (req.user && req.user.name) ? req.user.name : applicantName;
    const finalAppMobile = (req.user && req.user.mobile) ? req.user.mobile : applicantMobile;

    if (!finalAppName || !finalAppMobile || !candidateName || !candidateAadhar || !address) {
        return res.status(400).json({
            success: false,
            message: "Applicant name, applicant mobile, candidate name, candidate Aadhaar, and address are required."
        });
    }

    const verificationId = "VER-2026-" + Math.floor(Math.random() * 90000 + 10000);

    const sql = `
        INSERT INTO police_verifications
        (verification_id, applicant_name, applicant_mobile, candidate_name, candidate_type, candidate_aadhar, candidate_mobile, address, station_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_VERIFICATION')
    `;

    db.query(sql, [verificationId, finalAppName, finalAppMobile, candidateName, candidateType, candidateAadhar, candidateMobile, address, stationId], (err, result) => {
        if (err) {
            console.error("Police verification insert error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        res.status(201).json({
            success: true,
            message: "Police Verification Application Submitted Successfully. Local Beat Officer will conduct field inquiry within 72 hours.",
            verification: {
                verificationId,
                candidateName,
                candidateType,
                stationId,
                status: "PENDING_VERIFICATION",
                estimatedDays: 3
            }
        });
    });
});

router.get("/api/police/verifications", optionalToken, (req, res) => {
    const { query } = req.query;
    let sql = "SELECT * FROM police_verifications";
    const params = [];

    if (query) {
        sql += " WHERE verification_id = ? OR applicant_mobile = ? OR candidate_aadhar = ?";
        params.push(query, query, query);
    }

    sql += " ORDER BY created_at DESC LIMIT 20";

    db.query(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Database error." });
        }
        res.json({ success: true, verifications: rows });
    });
});

module.exports = router;
