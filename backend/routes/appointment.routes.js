const express = require("express");
const router = express.Router();
const db = require("../config/db");

// =========================================================
// DYNAMIC APPOINTMENT AVAILABILITY ENGINE
// =========================================================

router.get("/api/appointments/availability", (req, res) => {
    const { hospitalId, doctorId, date } = req.query;

    console.log(`[APPOINTMENT AVAILABILITY] Hospital: ${hospitalId} | Doctor: ${doctorId} | Date: ${date}`);

    if (!hospitalId || !doctorId || !date) {
        return res.status(400).json({
            success: false,
            message: "Hospital ID, Doctor ID, and Date (YYYY-MM-DD) are required."
        });
    }

    // Parse date safely without timezone shift
    const [year, month, day] = date.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const dayOfWeek = targetDate.getDay();

    // 1. Fetch Doctor Schedule
    const scheduleSql = `
        SELECT start_time, end_time, slot_duration 
        FROM doctor_schedules 
        WHERE doctor_id = ? AND hospital_id = ? AND day_of_week = ? AND is_active = 1
    `;

    db.query(scheduleSql, [doctorId, hospitalId, dayOfWeek], (schedErr, schedRows) => {
        if (schedErr) {
            console.error("[SCHEDULE ERROR]", schedErr);
            return res.status(500).json({ success: false, message: "Unable to load appointment availability." });
        }

        if (!schedRows || !schedRows.length) {
            return res.json({ success: false, message: "Doctor is not available on this date." });
        }

        const { start_time, end_time, slot_duration } = schedRows[0];

        // 2. Fetch existing appointments for this doctor on the date
        const bookedSql = `
            SELECT appointment_time 
            FROM appointments 
            WHERE doctor_id = ? AND appointment_date = ? AND status != 'Cancelled'
        `;

        db.query(bookedSql, [doctorId, date], (bookErr, bookRows) => {
            if (bookErr) {
                console.error("[BOOKING LOOKUP ERROR]", bookErr);
                return res.status(500).json({ success: false, message: "Unable to load appointment availability." });
            }

            const bookedTimes = (bookRows || []).map(b => String(b.appointment_time).substring(0, 5));

            // 3. Generate slots
            const slots = [];
            let [startH, startM] = start_time.split(':').map(Number);
            let [endH, endM] = end_time.split(':').map(Number);

            let currentMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;

            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const isToday = (todayStr === date);
            const currentDayMinutes = now.getHours() * 60 + now.getMinutes();

            while (currentMinutes < endMinutes) {
                const h = Math.floor(currentMinutes / 60);
                const m = currentMinutes % 60;
                const time24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

                const period = h >= 12 ? 'PM' : 'AM';
                const h12 = h % 12 || 12;
                const displayTime = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;

                const isPast = isToday && (currentMinutes <= currentDayMinutes);
                const isBooked = bookedTimes.includes(time24);

                let status = "available";
                if (isBooked) status = "booked";
                else if (isPast) status = "unavailable";

                slots.push({
                    time: time24,
                    displayTime,
                    status
                });

                currentMinutes += (slot_duration || 30);
            }

            console.log(`Generated: ${slots.length} | Booked: ${bookedTimes.length}`);

            const remaining = slots.filter(s => s.status === "available");
            if (isToday && remaining.length === 0 && slots.every(s => s.status === 'unavailable')) {
                return res.json({ success: false, message: "No remaining slots for today." });
            }
            if (slots.length > 0 && slots.every(s => s.status === 'booked')) {
                return res.json({ success: false, message: "All slots are already booked." });
            }

            res.json({
                success: true,
                hospitalId,
                doctorId,
                date,
                slots
            });
        });
    });
});

// =========================================================
// STRICT APPOINTMENT BOOKING API (With Validation & Double Booking Prevention)
// =========================================================

router.post("/api/appointments/book-strict", (req, res) => {
    const { patientId, hospitalId, doctorId, appointmentDate, appointmentTime } = req.body;

    if (!patientId || !hospitalId || !doctorId || !appointmentDate || !appointmentTime) {
        return res.status(400).json({
            success: false,
            message: "Patient ID, Hospital ID, Doctor ID, Date, and Time are required."
        });
    }

    // 1. Validate Patient ID
    db.query("SELECT id, name FROM patients WHERE patient_id = ?", [patientId], (pErr, pRows) => {
        if (pErr) return res.status(500).json({ success: false, message: "Database error." });
        if (!pRows || !pRows.length) {
            return res.status(404).json({
                success: false,
                message: "Patient ID not found. Please register the patient first."
            });
        }

        // 2. Fetch Doctor and Hospital Name for reference
        const docSql = `
            SELECT d.name AS doctor_name, h.hospital_name 
            FROM doctors d 
            JOIN hospitals h ON h.hospital_id = ? 
            WHERE d.doctor_id = ?
        `;
        db.query(docSql, [hospitalId, doctorId], (dErr, dRows) => {
            if (dErr || !dRows.length) {
                return res.status(404).json({ success: false, message: "Doctor or Hospital mapping not found." });
            }

            const { doctor_name, hospital_name } = dRows[0];

            // 3. Insert Appointment with Duplicate Catch
            const insertSql = `
                INSERT INTO appointments 
                (patient_id, hospital_id, doctor_id, doctor, appointment_date, appointment_time, status)
                VALUES (?, ?, ?, ?, ?, ?, 'Confirmed')
            `;

            db.query(insertSql, [patientId, hospitalId, doctorId, doctor_name, appointmentDate, appointmentTime], (insErr, insRes) => {
                if (insErr) {
                    if (insErr.code === 'ER_DUP_ENTRY') {
                        return res.status(409).json({
                            success: false,
                            message: "This appointment slot has already been booked."
                        });
                    }
                    console.error("[BOOKING INSERT ERROR]", insErr);
                    return res.status(500).json({ success: false, message: "Appointment booking failed." });
                }

                const appointmentId = `APT-${100000 + insRes.insertId}`;

                // Broadcast real-time appointment event for Doctor Dashboard
                const io = req.app.get("io");
                if (io) {
                    io.emit("appointment:new", {
                        id: insRes.insertId,
                        appointmentId,
                        patientId,
                        patientName: pRows[0]?.name || "Patient",
                        hospitalName: hospital_name,
                        doctorName: doctor_name,
                        doctorId,
                        date: appointmentDate,
                        time: appointmentTime,
                        status: "Confirmed"
                    });
                }

                res.status(201).json({
                    success: true,
                    message: "Appointment confirmed successfully.",
                    appointment: {
                        appointmentId,
                        patientId,
                        hospitalName: hospital_name,
                        doctorName: doctor_name,
                        date: appointmentDate,
                        time: appointmentTime
                    }
                });
            });
        });
    });
});

// =========================================================
// BOOK APPOINTMENT VIA doctor_slots (slot-based booking)
// =========================================================

router.post("/api/appointments", (req, res) => {
    const { patientId, doctor, slotId } = req.body;

    if (!patientId || !slotId) {
        return res.status(400).json({
            success: false,
            message: "Patient ID and a time slot are required."
        });
    }

    db.beginTransaction((txErr) => {
        if (txErr) {
            console.error("Transaction start error:", txErr);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        db.query(
            "SELECT id FROM patients WHERE patient_id = ? LIMIT 1",
            [patientId],
            (pErr, pRows) => {
                if (pErr) {
                    console.error("Patient lookup error:", pErr);
                    return db.rollback(() =>
                        res.status(500).json({ success: false, message: "Database error." })
                    );
                }

                if (!pRows.length) {
                    return db.rollback(() =>
                        res.status(404).json({
                            success: false,
                            message: "Patient ID not found. Please register the patient first."
                        })
                    );
                }

                db.query(
                    "SELECT * FROM doctor_slots WHERE id = ? FOR UPDATE",
                    [slotId],
                    (sErr, sRows) => {
                        if (sErr) {
                            console.error("Slot lookup error:", sErr);
                            return db.rollback(() =>
                                res.status(500).json({ success: false, message: "Database error." })
                            );
                        }

                        if (!sRows.length) {
                            return db.rollback(() =>
                                res.status(404).json({ success: false, message: "Slot not found." })
                            );
                        }

                        const slot = sRows[0];
                        const maxPatients = Number(slot.max_patients || 1);
                        const bookedPatients = Number(slot.booked_patients || 0);
                        const slotFull =
                            bookedPatients >= maxPatients ||
                            String(slot.status || "").toLowerCase() === "full";

                        if (slotFull) {
                            return db.rollback(() =>
                                res.status(409).json({
                                    success: false,
                                    message: "This slot is already fully booked. Please choose another."
                                })
                            );
                        }

                        db.query(
                            "SELECT name, hospital_id FROM doctors WHERE doctor_id = ? LIMIT 1",
                            [slot.doctor_id],
                            (dErr, dRows) => {
                                if (dErr) {
                                    console.error("Doctor lookup error:", dErr);
                                    return db.rollback(() =>
                                        res.status(500).json({ success: false, message: "Database error." })
                                    );
                                }

                                const doctorName = dRows[0]?.name || doctor || null;
                                const hospitalId = dRows[0]?.hospital_id || null;

                                const insertSql = `
                                    INSERT INTO appointments
                                    (patient_id, hospital_id, doctor_id, doctor, slot_id, appointment_date, appointment_time, status)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, 'Confirmed')
                                `;

                                db.query(
                                    insertSql,
                                    [
                                        patientId,
                                        hospitalId,
                                        slot.doctor_id,
                                        doctorName,
                                        slotId,
                                        slot.slot_date,
                                        slot.start_time
                                    ],
                                    (iErr, iRes) => {
                                        if (iErr) {
                                            console.error("Slot-based booking insert error:", iErr);
                                            if (iErr.code === "ER_DUP_ENTRY") {
                                                return db.rollback(() =>
                                                    res.status(409).json({
                                                        success: false,
                                                        message: "This appointment slot has already been booked."
                                                    })
                                                );
                                            }
                                            return db.rollback(() =>
                                                res.status(500).json({
                                                    success: false,
                                                    message: "Appointment booking failed."
                                                })
                                            );
                                        }

                                        const newBookedCount = bookedPatients + 1;
                                        const newStatus =
                                            newBookedCount >= maxPatients ? "Full" : "Available";

                                        db.query(
                                            "UPDATE doctor_slots SET booked_patients = ?, status = ? WHERE id = ?",
                                            [newBookedCount, newStatus, slotId],
                                            (uErr) => {
                                                if (uErr) {
                                                    console.error("Slot update error:", uErr);
                                                    return db.rollback(() =>
                                                        res.status(500).json({
                                                            success: false,
                                                            message: "Appointment booking failed."
                                                        })
                                                    );
                                                }

                                                db.commit((cErr) => {
                                                    if (cErr) {
                                                        console.error("Commit error:", cErr);
                                                        return db.rollback(() =>
                                                            res.status(500).json({
                                                                success: false,
                                                                message: "Appointment booking failed."
                                                            })
                                                        );
                                                    }

                                                    // Broadcast real-time appointment event for Doctor Dashboard
                                                    const io = req.app.get("io");
                                                    if (io) {
                                                        io.emit("appointment:new", {
                                                            id: iRes.insertId,
                                                            patientId,
                                                            doctorName,
                                                            doctorId: slot.doctor_id,
                                                            hospitalId,
                                                            date: slot.slot_date,
                                                            time: slot.start_time,
                                                            status: "Confirmed"
                                                        });
                                                    }

                                                    res.status(201).json({
                                                        success: true,
                                                        message: "Appointment confirmed successfully.",
                                                        appointment: {
                                                            id: iRes.insertId,
                                                            patientId,
                                                            doctorName,
                                                            hospitalId,
                                                            appointmentDate: slot.slot_date,
                                                            appointmentTime: slot.start_time,
                                                            slotId
                                                        }
                                                    });
                                                });
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    });
});

// =========================================================
// CANCEL APPOINTMENT (releases the slot seat back)
// =========================================================

router.put("/api/appointments/:id/cancel", (req, res) => {
    const appointmentId = req.params.id;

    db.getConnection((connErr, conn) => {
        if (connErr) {
            console.error("Connection acquire error:", connErr);
            return res.status(500).json({ message: "Database connection error." });
        }

        conn.beginTransaction((txErr) => {
            if (txErr) {
                conn.release();
                console.error("Transaction start error:", txErr);
                return res.status(500).json({ message: "Database error." });
            }

            const findSql = `
                SELECT id, slot_id, status
                FROM appointments
                WHERE id = ?
                FOR UPDATE
            `;

            conn.query(findSql, [appointmentId], (findErr, rows) => {
                if (findErr) {
                    console.error("Appointment lookup error:", findErr);
                    return conn.rollback(() => {
                        conn.release();
                        res.status(500).json({ message: "Database error." });
                    });
                }

                if (!rows.length) {
                    return conn.rollback(() => {
                        conn.release();
                        res.status(404).json({ message: "Appointment not found." });
                    });
                }

                const appointment = rows[0];

                if (["Cancelled", "Completed"].includes(appointment.status)) {
                    return conn.rollback(() => {
                        conn.release();
                        res.status(400).json({
                            message: `Appointment is already ${appointment.status}.`
                        });
                    });
                }

                const cancelSql = `
                    UPDATE appointments SET status = 'Cancelled' WHERE id = ?
                `;

                conn.query(cancelSql, [appointmentId], (cancelErr) => {
                    if (cancelErr) {
                        console.error("Appointment cancel error:", cancelErr);
                        return conn.rollback(() => {
                            conn.release();
                            res.status(500).json({ message: "Cancellation failed." });
                        });
                    }

                    if (!appointment.slot_id) {
                        return conn.commit((commitErr) => {
                            if (commitErr) {
                                return conn.rollback(() => {
                                    conn.release();
                                    res.status(500).json({ message: "Cancellation failed." });
                                });
                            }
                            conn.release();
                            res.json({ message: "Appointment cancelled successfully." });
                        });
                    }

                    const freeSlotSql = `
                        UPDATE doctor_slots
                        SET booked_patients = GREATEST(booked_patients - 1, 0),
                            status = 'Available'
                        WHERE id = ?
                    `;

                    conn.query(freeSlotSql, [appointment.slot_id], (slotErr) => {
                        if (slotErr) {
                            console.error("Slot release error:", slotErr);
                            return conn.rollback(() => {
                                conn.release();
                                res.status(500).json({ message: "Cancellation failed." });
                            });
                        }

                        conn.commit((commitErr) => {
                            if (commitErr) {
                                console.error("Commit error:", commitErr);
                                return conn.rollback(() => {
                                    conn.release();
                                    res.status(500).json({ message: "Cancellation failed." });
                                });
                            }
                            conn.release();
                            res.json({ message: "Appointment cancelled successfully." });
                        });
                    });
                });
            });
        });
    });
});

// =========================================================
// GET ALL APPOINTMENTS (General / Admin / Staff query)
// =========================================================

router.get("/api/appointments", (req, res) => {
    const { hospital_id, doctor_id, date, status } = req.query;
    let sql = `
        SELECT 
            a.*,
            p.name AS patient_name,
            p.mobile AS patient_mobile,
            d.name AS doctor_name,
            h.hospital_name
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.patient_id
        LEFT JOIN doctors d ON a.doctor_id = d.doctor_id
        LEFT JOIN hospitals h ON a.hospital_id = h.hospital_id
        WHERE 1=1
    `;
    const params = [];

    if (hospital_id) {
        sql += ` AND a.hospital_id = ?`;
        params.push(hospital_id);
    }
    if (doctor_id) {
        sql += ` AND a.doctor_id = ?`;
        params.push(doctor_id);
    }
    if (date) {
        sql += ` AND a.appointment_date = ?`;
        params.push(date);
    }
    if (status) {
        sql += ` AND a.status = ?`;
        params.push(status);
    }

    sql += ` ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT 200`;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("All appointments fetch error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }
        res.json({ success: true, count: results.length, appointments: results });
    });
});

// =========================================================
// GET PATIENT APPOINTMENTS
// =========================================================

router.get("/api/appointments/:patientId", (req, res) => {
    const patientId = req.params.patientId;

    if (!patientId) {
        return res.status(400).json({
            message: "Patient ID is required."
        });
    }

    const sql = `
        SELECT
            id,
            patient_id,
            doctor,
            slot_id,
            doctor_id,
            appointment_date,
            appointment_time,
            status,
            created_at
        FROM appointments
        WHERE patient_id = ?
        ORDER BY
            appointment_date DESC,
            appointment_time DESC
    `;

    db.query(sql, [patientId], (err, results) => {
        if (err) {
            console.error("Appointment fetch error:", err);
            return res.status(500).json({
                message: "Database error."
            });
        }

        res.json({
            message: "Appointments fetched successfully.",
            appointments: results
        });
    });
});

module.exports = router;
