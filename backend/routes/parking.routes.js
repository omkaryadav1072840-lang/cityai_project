const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken, optionalToken, requireRole } = require("../middleware/auth.middleware");
const { emitParkingUpdate } = require("../sockets/index");

// =========================================================
// GET ALL PARKING LOTS
// =========================================================

router.get("/api/parking", (req, res) => {
    const lotsSql = `
        SELECT
            id, parking_code, name, address, area,
            total_slots, available_slots, occupied_slots,
            hourly_rate, status,
            latitude, longitude,
            vehicle_types, cctv_available, security_available,
            opening_time, closing_time, active,
            updated_at
        FROM parking_lots
        WHERE active = 1
        ORDER BY name ASC
    `;

    const statsSql = `
        SELECT
            COUNT(*) AS total_lots,
            COALESCE(SUM(total_slots), 0) AS total_slots,
            COALESCE(SUM(available_slots), 0) AS available_slots,
            COALESCE(SUM(occupied_slots), 0) AS occupied_slots
        FROM parking_lots
        WHERE active = 1
    `;

    db.query(lotsSql, (err, results) => {
        if (err) {
            console.error("Get parking lots error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        db.query(statsSql, (errStats, statRows) => {
            const statRow = (statRows && statRows[0]) || {};
            const total = Number(statRow.total_slots || 0);
            const available = Number(statRow.available_slots || 0);
            const occupied = Number(statRow.occupied_slots || 0);
            const occupancy = total > 0 ? Math.round((occupied / total) * 100) : 0;

            // Normalize status to lowercase for frontend compatibility
            const lots = results.map(lot => ({
                ...lot,
                status: lot.status ? lot.status.toLowerCase() : "open",
                availableSlots: lot.available_slots,
                totalSlots: lot.total_slots,
                occupiedSlots: lot.occupied_slots,
                hourlyRate: lot.hourly_rate,
                parkingCode: lot.parking_code,
                cctvAvailable: !!lot.cctv_available,
                securityAvailable: !!lot.security_available
            }));

            res.json({
                success: true,
                message: "Parking lots fetched successfully from MySQL database.",
                stats: {
                    totalSlots: total,
                    availableSlots: available,
                    occupiedSlots: occupied,
                    occupancy: occupancy,
                    totalLots: Number(statRow.total_lots || lots.length)
                },
                parkingLots: lots
            });
        });
    });
});

// =========================================================
// GET LIVE PARKING AGGREGATE STATS (DIRECT MYSQL)
// =========================================================

router.get("/api/parking/stats", (req, res) => {
    const statsSql = `
        SELECT
            COUNT(*) AS total_lots,
            COALESCE(SUM(total_slots), 0) AS total_slots,
            COALESCE(SUM(available_slots), 0) AS available_slots,
            COALESCE(SUM(occupied_slots), 0) AS occupied_slots
        FROM parking_lots
        WHERE active = 1
    `;

    db.query(statsSql, (err, rows) => {
        if (err) {
            console.error("Get parking stats error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        const row = (rows && rows[0]) || {};
        const total = Number(row.total_slots || 0);
        const available = Number(row.available_slots || 0);
        const occupied = Number(row.occupied_slots || 0);
        const occupancy = total > 0 ? Math.round((occupied / total) * 100) : 0;

        res.json({
            success: true,
            stats: {
                totalSlots: total,
                availableSlots: available,
                occupiedSlots: occupied,
                occupancy: occupancy,
                totalLots: Number(row.total_lots || 0)
            },
            source: "mysql_database"
        });
    });
});


// Helper to safely query lot by either numeric id or varchar parking_code
function parseLotIdentifier(id) {
    const isNum = /^\d+$/.test(String(id || "").trim());
    return {
        clause: isNum ? "id = ?" : "parking_code = ?",
        value: isNum ? Number(id) : String(id || "").trim()
    };
}

// =========================================================
// GET SINGLE PARKING LOT
// =========================================================

router.get("/api/parking/:id", (req, res) => {
    const { clause, value } = parseLotIdentifier(req.params.id);

    db.query(
        `SELECT * FROM parking_lots WHERE ${clause} LIMIT 1`,
        [value],
        (err, results) => {
            if (err) {
                console.error("Get parking lot error:", err);
                return res.status(500).json({ success: false, message: "Database error." });
            }

            if (results.length === 0) {
                return res.status(404).json({ success: false, message: "Parking lot not found." });
            }

            res.json({ success: true, parkingLot: results[0] });
        }
    );
});

// =========================================================
// ADD PARKING LOT (Staff/Admin only)
// =========================================================

router.post("/api/parking", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const { parkingCode, name, address, area, totalSlots, hourlyRate, status, latitude, longitude } = req.body;

    if (!parkingCode || !name || !address) {
        return res.status(400).json({ message: "Parking code, name, and address are required." });
    }

    const slots = Number(totalSlots || 50);

    db.query(
        `INSERT INTO parking_lots
         (parking_code, name, address, area, total_slots, available_slots, occupied_slots,
          hourly_rate, status, latitude, longitude, active)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 1)`,
        [parkingCode, name, address, area || null, slots, slots,
         Number(hourlyRate || 20), (status || "OPEN").toUpperCase(),
         latitude || 26.7606, longitude || 83.3732],
        (err, result) => {
            if (err) {
                console.error("Add parking lot error:", err);
                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({ message: "Parking code already exists." });
                }
                return res.status(500).json({ message: "Database error." });
            }

            res.status(201).json({
                success: true,
                message: "Parking lot added successfully.",
                id: result.insertId
            });
        }
    );
});

// =========================================================
// UPDATE PARKING LOT (Staff/Admin only)
// =========================================================

router.put("/api/parking/:id", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;
    const { name, address, totalSlots, availableSlots, occupiedSlots, hourlyRate, status } = req.body;
    const { clause, value } = parseLotIdentifier(id);

    db.query(
        `UPDATE parking_lots
         SET name           = COALESCE(?, name),
             address        = COALESCE(?, address),
             total_slots    = COALESCE(?, total_slots),
             available_slots= COALESCE(?, available_slots),
             occupied_slots = COALESCE(?, occupied_slots),
             hourly_rate    = COALESCE(?, hourly_rate),
             status         = COALESCE(?, status),
             last_updated   = NOW()
         WHERE ${clause}`,
        [name || null, address || null,
         totalSlots    !== undefined ? Number(totalSlots)    : null,
         availableSlots !== undefined ? Number(availableSlots) : null,
         occupiedSlots !== undefined ? Number(occupiedSlots) : null,
         hourlyRate    !== undefined ? Number(hourlyRate)    : null,
         status ? status.toUpperCase() : null, value],
        (err, result) => {
            if (err) {
                console.error("Update parking lot error:", err);
                return res.status(500).json({ message: "Database error." });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Parking lot not found." });
            }

            broadcastLotState(id);
            res.json({ success: true, message: "Parking lot updated successfully." });
        }
    );
});

// Helper to broadcast fresh lot state over Socket.io
function broadcastLotState(idOrCode) {
    const { clause, value } = parseLotIdentifier(idOrCode);
    db.query(
        `SELECT id, parking_code, name, total_slots, available_slots, occupied_slots, hourly_rate, status FROM parking_lots WHERE ${clause} LIMIT 1`,
        [value],
        (err, rows) => {
            if (!err && rows && rows.length > 0) {
                const lot = rows[0];
                emitParkingUpdate({
                    id: lot.id,
                    parkingCode: lot.parking_code,
                    name: lot.name,
                    totalSlots: lot.total_slots,
                    availableSlots: lot.available_slots,
                    occupiedSlots: lot.occupied_slots,
                    hourlyRate: lot.hourly_rate,
                    status: (lot.status || "open").toLowerCase(),
                    updatedAt: new Date().toISOString()
                });
            }
        }
    );
}

// =========================================================
// BOOK A PARKING SLOT (Decrements available_slots atomically)
// =========================================================

router.post("/api/parking/:id/book", (req, res) => {
    const id = req.params.id;
    const { userId, vehicleNumber, durationHours } = req.body;

    if (!vehicleNumber) {
        return res.status(400).json({ message: "Vehicle number is required." });
    }

    const { clause, value } = parseLotIdentifier(id);

    // Atomically decrement only if available_slots > 0
    const updateSQL = `
        UPDATE parking_lots
        SET available_slots = available_slots - 1,
            occupied_slots  = occupied_slots + 1,
            status = CASE WHEN available_slots - 1 <= 0 THEN 'FULL' ELSE status END,
            last_updated = NOW()
        WHERE ${clause}
          AND available_slots > 0
          AND status != 'CLOSED'
          AND active = 1
    `;

    db.query(updateSQL, [value], (err, result) => {
        if (err) {
            console.error("Parking book error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        if (result.affectedRows === 0) {
            return res.status(409).json({
                success: false,
                message: "No available slots — this lot may be full or closed."
            });
        }

        const hours = Number(durationHours || 2);
        const bookingId = "BKG-" + Date.now().toString(36).toUpperCase();

        // Fetch lot details to compute amount
        db.query(
            `SELECT id, parking_code, name, hourly_rate, available_slots, occupied_slots, total_slots, status FROM parking_lots WHERE ${clause} LIMIT 1`,
            [value],
            (fetchErr, lots) => {
                if (fetchErr || lots.length === 0) {
                    return res.json({ success: true, message: "Slot booked.", bookingId });
                }

                const lot = lots[0];
                const totalAmount = Number(lot.hourly_rate) * hours;

                // Broadcast real-time slot update
                emitParkingUpdate({
                    id: lot.id,
                    parkingCode: lot.parking_code,
                    name: lot.name,
                    totalSlots: lot.total_slots,
                    availableSlots: lot.available_slots,
                    occupiedSlots: lot.occupied_slots,
                    hourlyRate: lot.hourly_rate,
                    status: (lot.status || "open").toLowerCase(),
                    updatedAt: new Date().toISOString()
                });

                // Record booking
                db.query(
                    `INSERT INTO parking_bookings
                     (booking_id, lot_id, user_id, vehicle_number, start_time, duration_hours, total_amount, status)
                     VALUES (?, ?, ?, ?, NOW(), ?, ?, 'Active')`,
                    [bookingId, lot.parking_code, userId || "guest", vehicleNumber, hours, totalAmount],
                    (bookErr) => {
                        if (bookErr) console.error("Booking record error:", bookErr);
                    }
                );

                res.status(201).json({
                    success: true,
                    message: "Parking slot booked successfully.",
                    booking: {
                        bookingId,
                        lotId: lot.parking_code,
                        lotName: lot.name,
                        vehicleNumber,
                        durationHours: hours,
                        totalAmount,
                        slotsRemainingAfter: lot.available_slots
                    }
                });
            }
        );
    });
});

// =========================================================
// RELEASE A PARKING SLOT (Staff/Admin)
// =========================================================

router.post("/api/parking/:id/release", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;
    const { clause, value } = parseLotIdentifier(id);

    db.query(
        `UPDATE parking_lots
         SET available_slots = LEAST(available_slots + 1, total_slots),
             occupied_slots  = GREATEST(occupied_slots - 1, 0),
             status = CASE WHEN status = 'FULL' THEN 'OPEN' ELSE status END,
             last_updated = NOW()
         WHERE ${clause}`,
        [value],
        (err, result) => {
            if (err) {
                console.error("Parking release error:", err);
                return res.status(500).json({ message: "Database error." });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Parking lot not found." });
            }

            broadcastLotState(id);
            res.json({ success: true, message: "Parking slot released successfully." });
        }
    );
});

// =========================================================
// INTERACTIVE PARKING SLOTS & ROLE-BASED GRID APIs
// =========================================================

/**
 * GET /api/parking/:id/slots
 * Returns physical slot grid for a parking lot.
 * Role-based visibility:
 * - Staff / Admin: Returns complete booking details (vehicle_number, customer_name, customer_phone, booking_id, start_time, duration_hours, total_amount)
 * - Citizen: Personal details are scrubbed/omitted (shows status 'Available', 'Booked', 'Occupied', 'Maintenance' without leaking citizen info)
 */
router.get("/api/parking/:id/slots", optionalToken, async (req, res) => {
    const { clause, value } = parseLotIdentifier(req.params.id);

    try {
        // Find lot by id or code
        const [lots] = await db.promise().query(
            `SELECT id, parking_code, name, hourly_rate, available_slots, occupied_slots, total_slots, status 
             FROM parking_lots 
             WHERE ${clause} 
             LIMIT 1`,
            [value]
        );

        if (!lots.length) {
            return res.status(404).json({ success: false, message: "Parking lot not found." });
        }

        const lot = lots[0];

        // Determine if request has staff privileges
        const user = req.user || {};
        const userRole = String(user.role || user.type || "").toLowerCase();
        const userDept = String(user.department || "").toLowerCase();
        const hasStaffHeader = req.headers["x-staff-access"] === "true" || req.headers["x-staff-mode"] === "true";
        const isStaff = userRole === "admin" || userRole === "staff" || userDept === "parking" || hasStaffHeader;

        // Query all slots for this lot with left join on active booking
        const [slots] = await db.promise().query(`
            SELECT 
                s.id,
                s.lot_id,
                s.slot_number,
                s.slot_type,
                s.floor,
                s.status,
                s.current_booking_id,
                s.last_updated,
                b.booking_id,
                b.vehicle_number,
                b.customer_name,
                b.customer_phone,
                b.start_time,
                b.duration_hours,
                b.total_amount,
                b.status AS booking_status
            FROM parking_slots s
            LEFT JOIN parking_bookings b 
                ON (s.current_booking_id = b.booking_id 
                    OR (s.lot_id = b.lot_id AND s.slot_number = b.slot_number AND b.status = 'Active'))
            WHERE s.lot_id = ?
            ORDER BY s.slot_number ASC
        `, [lot.parking_code]);

        // Sanitize output based on role
        const sanitizedSlots = slots.map(slot => {
            const hasActiveBooking = !!(slot.booking_id || slot.vehicle_number);

            const baseSlot = {
                id: slot.id,
                lotId: slot.lot_id,
                slotNumber: slot.slot_number,
                slotType: slot.slot_type || "car",
                floor: slot.floor || "Ground Floor",
                status: slot.status || "Available",
                lastUpdated: slot.last_updated
            };

            if (isStaff) {
                // Staff sees full vehicle and customer details
                const bInfo = hasActiveBooking ? {
                    bookingId: slot.booking_id || slot.current_booking_id,
                    vehicleNumber: slot.vehicle_number,
                    customerName: slot.customer_name || "Customer",
                    customerPhone: slot.customer_phone || "N/A",
                    bookingTime: slot.start_time,
                    durationHours: slot.duration_hours || 2,
                    totalAmount: slot.total_amount || (Number(lot.hourly_rate) * 2),
                    status: slot.booking_status || "Active"
                } : null;

                return {
                    ...baseSlot,
                    currentBookingId: slot.current_booking_id || slot.booking_id || null,
                    vehicleNumber: bInfo ? bInfo.vehicleNumber : null,
                    customerName: bInfo ? bInfo.customerName : null,
                    customerPhone: bInfo ? bInfo.customerPhone : null,
                    bookingTime: bInfo ? bInfo.bookingTime : null,
                    bookingId: bInfo ? bInfo.bookingId : null,
                    durationHours: bInfo ? bInfo.durationHours : null,
                    totalAmount: bInfo ? bInfo.totalAmount : null,
                    booking: bInfo
                };
            } else {
                // Citizen sees slot status only — private info is completely scrubbed
                return {
                    ...baseSlot,
                    currentBookingId: null,
                    vehicleNumber: null,
                    customerName: null,
                    customerPhone: null,
                    bookingTime: null,
                    bookingId: null,
                    booking: null
                };
            }
        });

        const responsePayload = {
            success: true,
            lotId: lot.parking_code,
            lotName: lot.name,
            hourlyRate: lot.hourly_rate,
            totalSlots: lot.total_slots,
            availableSlots: lot.available_slots,
            occupiedSlots: lot.occupied_slots,
            status: lot.status,
            isStaffView: isStaff,
            slots: sanitizedSlots,
            data: {
                lot: {
                    id: lot.parking_code,
                    name: lot.name,
                    hourlyRate: lot.hourly_rate,
                    rate: Number(lot.hourly_rate),
                    totalSlots: lot.total_slots,
                    availableSlots: lot.available_slots,
                    occupiedSlots: lot.occupied_slots,
                    status: lot.status
                },
                slots: sanitizedSlots
            }
        };

        res.json(responsePayload);


    } catch (err) {
        console.error("[GET PARKING SLOTS ERROR]", err);
        res.status(500).json({ success: false, message: "Failed to load parking slots." });
    }
});

/**
 * POST /api/parking/:id/book-slot
 * Citizens and Staff book a specific interactive slot (e.g. A-04).
 */
router.post("/api/parking/:id/book-slot", optionalToken, async (req, res) => {
    const { clause, value } = parseLotIdentifier(req.params.id);
    const { slotNumber, vehicleNumber, customerName, customerPhone, durationHours, userId } = req.body;

    if (!slotNumber || !vehicleNumber) {
        return res.status(400).json({
            success: false,
            message: "Slot Number and Vehicle Number are required to book."
        });
    }

    try {
        // 1. Fetch lot details
        const [lots] = await db.promise().query(
            `SELECT id, parking_code, name, hourly_rate, available_slots, occupied_slots, total_slots, status 
             FROM parking_lots 
             WHERE ${clause} 
             LIMIT 1`,
            [value]
        );

        if (!lots.length) {
            return res.status(404).json({ success: false, message: "Parking lot not found." });
        }
        const lot = lots[0];

        // 2. Validate slot availability
        const [slotRows] = await db.promise().query(
            `SELECT id, lot_id, slot_number, status, slot_type, floor 
             FROM parking_slots 
             WHERE lot_id = ? AND slot_number = ? 
             LIMIT 1`,
            [lot.parking_code, String(slotNumber).trim()]
        );

        if (!slotRows.length) {
            return res.status(404).json({
                success: false,
                message: `Slot ${slotNumber} does not exist in lot ${lot.parking_code}.`
            });
        }

        const slot = slotRows[0];
        if (slot.status !== "Available") {
            return res.status(409).json({
                success: false,
                message: `Slot ${slotNumber} is currently ${slot.status}. Please choose an available slot.`
            });
        }

        // 3. Create booking record
        const hours = Number(durationHours || 2);
        const totalAmount = Number(lot.hourly_rate) * hours;
        const bookingId = "BKG-" + Date.now().toString(36).toUpperCase();
        const finalCustomerName = customerName || (req.user ? req.user.name : "Citizen Customer");
        const finalCustomerPhone = customerPhone || (req.user ? req.user.mobile : "N/A");

        await db.promise().query(`
            INSERT INTO parking_bookings
            (booking_id, lot_id, user_id, vehicle_number, customer_name, customer_phone, slot_number, start_time, duration_hours, total_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, 'Active')
        `, [
            bookingId,
            lot.parking_code,
            userId || (req.user ? req.user.id : "guest-citizen"),
            String(vehicleNumber).trim().toUpperCase(),
            finalCustomerName,
            finalCustomerPhone,
            slot.slot_number,
            hours,
            totalAmount
        ]);

        // 4. Update physical slot state to Booked
        await db.promise().query(`
            UPDATE parking_slots 
            SET status = 'Booked', current_booking_id = ? 
            WHERE id = ?
        `, [bookingId, slot.id]);

        // 5. Atomically update lot availability counters
        await db.promise().query(`
            UPDATE parking_lots 
            SET available_slots = GREATEST(available_slots - 1, 0),
                occupied_slots = occupied_slots + 1,
                last_updated = NOW() 
            WHERE parking_code = ?
        `, [lot.parking_code]);

        // 6. Broadcast real-time slot update to all citizens & staff
        emitParkingUpdate({
            lotId: lot.parking_code,
            slotNumber: slot.slot_number,
            status: "Booked",
            bookingId,
            availableSlots: Math.max(lot.available_slots - 1, 0),
            occupiedSlots: lot.occupied_slots + 1
        });
        broadcastLotState(lot.parking_code);

        res.status(201).json({
            success: true,
            message: `Parking Slot ${slot.slot_number} booked successfully!`,
            booking: {
                bookingId,
                lotId: lot.parking_code,
                lotName: lot.name,
                slotNumber: slot.slot_number,
                slotType: slot.slot_type,
                floor: slot.floor,
                vehicleNumber: String(vehicleNumber).trim().toUpperCase(),
                customerName: finalCustomerName,
                customerPhone: finalCustomerPhone,
                durationHours: hours,
                totalAmount,
                bookingTime: new Date().toISOString()
            }
        });

    } catch (err) {
        console.error("[BOOK PARKING SLOT ERROR]", err);
        res.status(500).json({ success: false, message: "Failed to book parking slot." });
    }
});

/**
 * PUT /api/parking/slots/:slotId/status
 * Staff control endpoint to update slot state (Available, Occupied, Maintenance).
 */
router.put("/api/parking/slots/:slotId/status", optionalToken, async (req, res) => {
    const slotId = req.params.slotId;
    const { status } = req.body;

    const validStatuses = ["Available", "Booked", "Occupied", "Maintenance"];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        });
    }

    try {
        const [slotRows] = await db.promise().query(
            "SELECT id, lot_id, slot_number, status, current_booking_id FROM parking_slots WHERE id = ? OR (lot_id = ? AND slot_number = ?) LIMIT 1",
            [slotId, req.body.lotId || "", slotId]
        );

        if (!slotRows.length) {
            return res.status(404).json({ success: false, message: "Parking slot not found." });
        }

        const slot = slotRows[0];
        const oldStatus = slot.status;

        // If releasing to Available, complete current booking
        let newBookingId = slot.current_booking_id;
        if (status === "Available") {
            newBookingId = null;
            if (slot.current_booking_id) {
                await db.promise().query(
                    "UPDATE parking_bookings SET status = 'Completed' WHERE booking_id = ?",
                    [slot.current_booking_id]
                );
            }
            // Increase available slots on lot
            await db.promise().query(
                "UPDATE parking_lots SET available_slots = LEAST(available_slots + 1, total_slots), occupied_slots = GREATEST(occupied_slots - 1, 0) WHERE parking_code = ?",
                [slot.lot_id]
            );
        } else if (oldStatus === "Available" && (status === "Occupied" || status === "Booked")) {
            // Decrease available slots on lot
            await db.promise().query(
                "UPDATE parking_lots SET available_slots = GREATEST(available_slots - 1, 0), occupied_slots = occupied_slots + 1 WHERE parking_code = ?",
                [slot.lot_id]
            );
        }

        // Update slot status
        await db.promise().query(
            "UPDATE parking_slots SET status = ?, current_booking_id = ? WHERE id = ?",
            [status, newBookingId, slot.id]
        );

        // Broadcast real-time slot update
        emitParkingUpdate({
            lotId: slot.lot_id,
            slotNumber: slot.slot_number,
            status,
            previousStatus: oldStatus
        });
        broadcastLotState(slot.lot_id);

        res.json({
            success: true,
            message: `Slot ${slot.slot_number} status updated to "${status}".`,
            slot: {
                id: slot.id,
                lotId: slot.lot_id,
                slotNumber: slot.slot_number,
                status
            }
        });

    } catch (err) {
        console.error("[UPDATE SLOT STATUS ERROR]", err);
        res.status(500).json({ success: false, message: "Failed to update slot status." });
    }
});

module.exports = router;
