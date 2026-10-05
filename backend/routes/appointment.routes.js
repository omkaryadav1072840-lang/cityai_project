const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken, optionalToken, requireRole } = require("../middleware/auth.middleware");

// =========================================================
// DYNAMIC APPOINTMENT AVAILABILITY ENGINE
// =========================================================

// =========================================================
// DYNAMIC APPOINTMENT AVAILABILITY ENGINE
// =========================================================

router.get("/api/appointments/availability", async (req, res) => {
    const { hospitalId, doctorId, date } = req.query;

    console.log(`[APPOINTMENT AVAILABILITY] Hospital: ${hospitalId} | Doctor: ${doctorId} | Date: ${date}`);

    if (!hospitalId || !doctorId || !date) {
        return res.status(400).json({
            success: false,
            message: "Hospital ID, Doctor ID, and Date (YYYY-MM-DD) are required."
        });
    }

    try {
        const p = db.promise();

        // 1. Verify doctor exists, belongs to this hospital, and is active
        const [docRows] = await p.query(`
            SELECT d.id, d.doctor_id, d.name, d.status, d.hospital_id, h.hospital_name, h.status AS hospital_status
            FROM doctors d
            LEFT JOIN hospitals h ON (d.hospital_id = h.hospital_id OR d.hospital_id = CAST(h.id AS CHAR))
            WHERE (d.doctor_id = ? OR d.id = ?)
            LIMIT 1
        `, [doctorId, isNaN(doctorId) ? -1 : parseInt(doctorId, 10)]);

        if (!docRows.length) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found in registry."
            });
        }

        const doc = docRows[0];

        // Validate doctor belongs to selected hospital
        const targetHosp = String(hospitalId).trim().toLowerCase();
        const docHosp = String(doc.hospital_id || "").trim().toLowerCase();
        if (docHosp && docHosp !== targetHosp) {
            return res.status(400).json({
                success: false,
                message: `Doctor ${doc.name} (${doc.doctor_id}) belongs to ${doc.hospital_id}, not ${hospitalId}.`
            });
        }

        // Validate doctor is active
        const docStatus = String(doc.status || "available").toLowerCase();
        if (!["active", "available"].includes(docStatus)) {
            return res.json({
                success: false,
                message: `Doctor ${doc.name} is currently inactive or unavailable.`
            });
        }

        // Parse date safely
        const [year, month, day] = date.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day);
        const dayOfWeek = targetDate.getDay();

        // 2. Fetch existing booked appointments for this doctor on this date
        const [bookedRows] = await p.query(`
            SELECT appointment_time 
            FROM appointments 
            WHERE (doctor_id = ? OR doctor_id = ?) AND appointment_date = ? AND status NOT IN ('Cancelled', 'Rejected')
        `, [doc.doctor_id, doctorId, date]);
        const bookedTimes = (bookedRows || []).map(b => String(b.appointment_time).substring(0, 5));

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const isToday = (todayStr === date);
        const currentDayMinutes = now.getHours() * 60 + now.getMinutes();

        // 3. Check for specific date slots in doctor_slots first
        const [dbSlots] = await p.query(`
            SELECT id, slot_date, start_time, end_time, max_patients, booked_patients, status
            FROM doctor_slots
            WHERE doctor_id = ? AND slot_date = ?
            ORDER BY start_time ASC
        `, [doc.doctor_id, date]);

        let slots = [];

        if (dbSlots.length > 0) {
            // Use database slots from doctor_slots
            slots = dbSlots.map(s => {
                const startTimeStr = String(s.start_time).substring(0, 5);
                const [hStr, mStr] = startTimeStr.split(':');
                const h = parseInt(hStr, 10);
                const m = parseInt(mStr, 10);
                const currentMinutes = h * 60 + m;

                const period = h >= 12 ? 'PM' : 'AM';
                const h12 = h % 12 || 12;
                const displayTime = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;

                const isPast = isToday && (currentMinutes <= currentDayMinutes);
                const isBooked = bookedTimes.includes(startTimeStr) || 
                                 s.booked_patients >= s.max_patients || 
                                 ['booked', 'full'].includes(String(s.status).toLowerCase());

                let slotStatus = "available";
                if (isBooked) slotStatus = "booked";
                else if (isPast) slotStatus = "unavailable";

                return {
                    slotId: s.id,
                    time: startTimeStr,
                    displayTime,
                    status: slotStatus,
                    maxPatients: s.max_patients,
                    bookedPatients: s.booked_patients
                };
            });
        } else {
            // 4. Check doctor_schedules for recurring weekly schedule
            const [schedRows] = await p.query(`
                SELECT start_time, end_time, slot_duration 
                FROM doctor_schedules 
                WHERE doctor_id = ? AND hospital_id = ? AND day_of_week = ? AND is_active = 1
                LIMIT 1
            `, [doc.doctor_id, hospitalId, dayOfWeek]);

            let start_time = "09:00:00";
            let end_time = "14:00:00";
            let slot_duration = 30;

            if (schedRows.length > 0) {
                start_time = schedRows[0].start_time;
                end_time = schedRows[0].end_time;
                slot_duration = schedRows[0].slot_duration || 30;
            } else if (dayOfWeek === 0) {
                // Sunday closed unless scheduled
                return res.json({ success: false, message: "Doctor OPD is closed on Sundays." });
            }

            let [startH, startM] = start_time.split(':').map(Number);
            let [endH, endM] = end_time.split(':').map(Number);
            let currentMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;

            while (currentMinutes < endMinutes) {
                const h = Math.floor(currentMinutes / 60);
                const m = currentMinutes % 60;
                const time24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

                const period = h >= 12 ? 'PM' : 'AM';
                const h12 = h % 12 || 12;
                const displayTime = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;

                const isPast = isToday && (currentMinutes <= currentDayMinutes);
                const isBooked = bookedTimes.includes(time24);

                let slotStatus = "available";
                if (isBooked) slotStatus = "booked";
                else if (isPast) slotStatus = "unavailable";

                slots.push({
                    time: time24,
                    displayTime,
                    status: slotStatus
                });

                currentMinutes += (slot_duration || 30);
            }
        }

        const remaining = slots.filter(s => s.status === "available");
        if (isToday && remaining.length === 0 && slots.every(s => s.status === 'unavailable')) {
            return res.json({ success: false, message: "No remaining slots for today." });
        }
        if (slots.length > 0 && slots.every(s => s.status === 'booked')) {
            return res.json({ success: false, message: "All slots are already booked for this date." });
        }

        res.json({
            success: true,
            hospitalId,
            doctorId: doc.doctor_id,
            doctorName: doc.name,
            date,
            count: slots.length,
            slots
        });

    } catch (err) {
        console.error("[APPOINTMENT AVAILABILITY ERROR]", err);
        res.status(500).json({ success: false, message: "Server error loading appointment availability." });
    }
});

// =========================================================
// STRICT APPOINTMENT BOOKING API (With Validation & Double Booking Prevention)
// =========================================================

router.post("/api/appointments/book-strict", optionalToken, async (req, res) => {
    let { patientId, hospitalId, doctorId, appointmentDate, appointmentTime, slotId, patientName, patientMobile } = req.body;
    patientId = patientId || req.body.patient_id;
    appointmentDate = appointmentDate || req.body.date;
    appointmentTime = appointmentTime || req.body.timeSlot || req.body.time;
    slotId = slotId || req.body.slot_id;

    // Auto-resolve patient if not provided but user is logged in
    if (!patientId && req.user) {
        try {
            const userId = req.user.id || req.user.userId;
            const mobile = (req.user.mobile || patientMobile || "").replace(/\D/g, "");
            const [pRows] = await db.promise().query(
                "SELECT patient_id FROM patients WHERE user_id = ? OR mobile = ? OR RIGHT(mobile, 10) = RIGHT(?, 10) LIMIT 1",
                [userId || 0, mobile || "", mobile || ""]
            );
            if (pRows.length > 0) {
                patientId = pRows[0].patient_id;
            }
        } catch (e) {
            console.warn("Patient auto-resolve warning:", e.message);
        }
    }

    if (!patientId || !hospitalId || !doctorId || !appointmentDate || !appointmentTime) {
        return res.status(400).json({
            success: false,
            message: "Patient ID, Hospital ID, Doctor ID, Date, and Time are required."
        });
    }

    try {
        const p = db.promise();

        // 1. Validate Patient ID
        const [pRows] = await p.query(
            "SELECT id, name, patient_id FROM patients WHERE patient_id = ? OR id = ? LIMIT 1",
            [patientId, isNaN(patientId) ? -1 : parseInt(patientId, 10)]
        );
        if (!pRows.length) {
            return res.status(404).json({
                success: false,
                message: "Patient ID not found. Please register the patient first."
            });
        }
        const resolvedPatientId = pRows[0].patient_id || patientId;
        const resolvedPatientName = pRows[0].name || patientName || "Patient";

        // 2. Fetch Doctor and validate exact Hospital relationship
        const [dRows] = await p.query(`
            SELECT d.id, d.doctor_id, d.name AS doctor_name, d.hospital_id, d.department, d.status AS doctor_status,
                   h.hospital_id AS validated_hosp_id, h.hospital_name, h.status AS hospital_status
            FROM doctors d
            LEFT JOIN hospitals h ON (d.hospital_id = h.hospital_id OR d.hospital_id = CAST(h.id AS CHAR))
            WHERE (d.doctor_id = ? OR d.id = ?)
            LIMIT 1
        `, [doctorId, isNaN(doctorId) ? -1 : parseInt(doctorId, 10)]);

        if (!dRows.length) {
            return res.status(404).json({ success: false, message: "Doctor not found in medical registry." });
        }

        const doc = dRows[0];
        const targetHosp = String(hospitalId).trim().toLowerCase();
        const docHosp = String(doc.hospital_id || "").trim().toLowerCase();

        // STRICT RELATIONSHIP VALIDATION: doctor.hospital_id === selectedHospitalId
        if (docHosp && docHosp !== targetHosp) {
            return res.status(400).json({
                success: false,
                message: `Cross-hospital appointment rejected. Doctor ${doc.doctor_name} belongs to ${doc.hospital_id}, not ${hospitalId}.`
            });
        }

        // STRICT DOCTOR STATUS: doctor is active
        const docStatus = String(doc.doctor_status || "available").toLowerCase();
        if (!["active", "available"].includes(docStatus)) {
            return res.status(400).json({
                success: false,
                message: `Doctor ${doc.doctor_name} is currently inactive and cannot accept appointments.`
            });
        }

        // STRICT HOSPITAL STATUS
        if (doc.hospital_status && !["active", "operational"].includes(String(doc.hospital_status).toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: `Hospital ${doc.hospital_name} is currently not accepting appointments.`
            });
        }

        // 3. Validate Slot if slotId provided
        if (slotId) {
            const [sRows] = await p.query(
                "SELECT * FROM doctor_slots WHERE id = ? LIMIT 1",
                [slotId]
            );
            if (!sRows.length) {
                return res.status(404).json({ success: false, message: "Specified appointment slot not found." });
            }
            const slot = sRows[0];

            // Validate slot.doctor_id === selectedDoctorId
            if (String(slot.doctor_id).toLowerCase() !== String(doc.doctor_id).toLowerCase()) {
                return res.status(400).json({
                    success: false,
                    message: "Slot does not belong to the selected doctor."
                });
            }

            // Validate slot.hospital_id === selectedHospitalId
            if (slot.hospital_id && String(slot.hospital_id).toLowerCase() !== targetHosp) {
                return res.status(400).json({
                    success: false,
                    message: "Slot does not belong to the selected hospital."
                });
            }

            // Validate slot is available
            const maxP = Number(slot.max_patients || 1);
            const bookedP = Number(slot.booked_patients || 0);
            if (bookedP >= maxP || ["full", "booked"].includes(String(slot.status).toLowerCase())) {
                return res.status(409).json({
                    success: false,
                    message: "This appointment slot is already fully booked."
                });
            }
        }

        // 4. Check for double booking for this doctor on this date/time
        const cleanTime = String(appointmentTime).substring(0, 5);
        const [existingAppt] = await p.query(`
            SELECT id, patient_id FROM appointments 
            WHERE (doctor_id = ? OR doctor_id = ?) 
              AND hospital_id = ? 
              AND appointment_date = ? 
              AND (appointment_time = ? OR appointment_time LIKE ?) 
              AND status NOT IN ('Cancelled', 'Rejected')
            LIMIT 1
        `, [doc.doctor_id, doctorId, doc.hospital_id, appointmentDate, cleanTime, `${cleanTime}%`]);

        if (existingAppt.length > 0) {
            if (existingAppt[0].patient_id === resolvedPatientId) {
                return res.status(200).json({
                    success: true,
                    message: "Appointment already confirmed for this patient.",
                    appointment: {
                        appointmentId: `APT-${100000 + existingAppt[0].id}`,
                        patientId: resolvedPatientId,
                        hospitalName: doc.hospital_name,
                        doctorName: doc.doctor_name,
                        date: appointmentDate,
                        time: appointmentTime
                    }
                });
            }
            return res.status(409).json({
                success: false,
                message: "This appointment slot has already been booked for this doctor."
            });
        }

        // 5. Generate token number
        const [tokCount] = await p.query(
            "SELECT COUNT(*) AS total FROM appointments WHERE doctor_id = ? AND appointment_date = ?",
            [doc.doctor_id, appointmentDate]
        );
        const tokenNum = (tokCount[0]?.total || 0) + 1;
        const tokenString = `T-${String(tokenNum).padStart(2, "0")}`;

        // 6. Insert Appointment
        const insertSql = `
            INSERT INTO appointments 
            (patient_id, hospital_id, doctor_id, doctor, department, slot_id, appointment_date, appointment_time, status, token_number, checkin_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed', ?, 'Scheduled')
        `;

        const [insRes] = await p.query(insertSql, [
            resolvedPatientId,
            doc.hospital_id,
            doc.doctor_id,
            doc.doctor_name,
            doc.department || "General Medicine",
            slotId || null,
            appointmentDate,
            cleanTime,
            tokenString
        ]);

        const appointmentId = `APT-${100000 + insRes.insertId}`;

        // 7. Update doctor_slots if slotId provided or matching by doctor, date, time
        if (slotId) {
            await p.query(`
                UPDATE doctor_slots 
                SET booked_patients = booked_patients + 1,
                    status = CASE WHEN booked_patients + 1 >= max_patients THEN 'Full' ELSE status END
                WHERE id = ?
            `, [slotId]);
        } else {
            await p.query(`
                UPDATE doctor_slots 
                SET booked_patients = booked_patients + 1,
                    status = CASE WHEN booked_patients + 1 >= max_patients THEN 'Full' ELSE status END
                WHERE doctor_id = ? AND slot_date = ? AND (start_time = ? OR start_time LIKE ?)
                LIMIT 1
            `, [doc.doctor_id, appointmentDate, cleanTime, `${cleanTime}%`]);
        }

        // Broadcast real-time appointment event for Doctor Dashboard
        const io = req.app.get("io");
        if (io) {
            io.emit("appointment:new", {
                id: insRes.insertId,
                appointmentId,
                patientId: resolvedPatientId,
                patientName: resolvedPatientName,
                hospitalName: doc.hospital_name,
                doctorName: doc.doctor_name,
                doctorId: doc.doctor_id,
                date: appointmentDate,
                time: cleanTime,
                tokenNumber: tokenString,
                status: "Confirmed"
            });
        }

        res.status(201).json({
            success: true,
            message: "Appointment confirmed successfully.",
            appointment: {
                appointmentId,
                tokenNumber: tokenString,
                patientId: resolvedPatientId,
                hospitalName: doc.hospital_name,
                doctorName: doc.doctor_name,
                date: appointmentDate,
                time: cleanTime
            }
        });

    } catch (err) {
        console.error("[BOOK STRICT ERROR]", err);
        res.status(500).json({ success: false, message: "Appointment booking failed due to server error." });
    }
});

// =========================================================
// BOOK APPOINTMENT VIA doctor_slots (slot-based booking)
// =========================================================

router.post("/api/appointments", async (req, res) => {
    let { patientId, doctor, slotId } = req.body;
    patientId = patientId || req.body.patient_id;

    // Branch 1: If slotId is NOT provided, handle direct appointment booking
    if (!slotId) {
        try {
            const p = db.promise();
            let patient_id = patientId;
            const patientName = req.body.patient_name || req.body.patientName || req.body.name || "Patient";
            const patientPhone = req.body.patient_phone || req.body.patientMobile || req.body.mobile || req.body.phone;
            const doctorId = req.body.doctor_id || req.body.doctorId;
            let doctorName = req.body.doctor_name || req.body.doctorName || doctor;
            let hospitalId = req.body.hospital_id || req.body.hospitalId;
            let department = req.body.department || "General Medicine";
            const appointmentDate = req.body.appointment_date || req.body.appointmentDate || req.body.date || new Date().toISOString().split("T")[0];
            const appointmentTime = req.body.time_slot || req.body.timeSlot || req.body.appointment_time || req.body.appointmentTime || req.body.time || "10:00 AM";
            const age = req.body.age ? parseInt(req.body.age, 10) : null;
            const gender = req.body.gender || null;

            // Auto-resolve or create patient if not supplied
            if (!patient_id) {
                if (patientPhone) {
                    const [pRows] = await p.query("SELECT patient_id, name FROM patients WHERE mobile = ? OR mobile LIKE ? LIMIT 1", [
                        patientPhone,
                        `%${String(patientPhone).slice(-10)}`
                    ]);
                    if (pRows.length > 0) {
                        patient_id = pRows[0].patient_id;
                    }
                }
                if (!patient_id && (patientName || patientPhone)) {
                    const year = new Date().getFullYear();
                    const genId = `P-${year}-${Date.now().toString().slice(-6)}`;
                    await p.query(
                        "INSERT INTO patients (patient_id, name, age, gender, mobile, hospital_id, status) VALUES (?, ?, ?, ?, ?, ?, 'Active')",
                        [genId, patientName, age, gender, patientPhone || '0000000000', hospitalId || null]
                    );
                    patient_id = genId;
                } else if (!patient_id) {
                    return res.status(400).json({
                        success: false,
                        message: "Patient identification (patientId or patient_name with mobile) is required."
                    });
                }
            }

            // Resolve doctor and hospital if possible
            if (doctorId) {
                const [docRows] = await p.query(
                    "SELECT doctor_id, name, hospital_id, department FROM doctors WHERE doctor_id = ? OR id = ? LIMIT 1",
                    [doctorId, isNaN(doctorId) ? -1 : parseInt(doctorId, 10)]
                );
                if (docRows.length > 0) {
                    doctorName = doctorName || docRows[0].name;
                    hospitalId = hospitalId || docRows[0].hospital_id;
                    department = department || docRows[0].department;
                }
            }

            // Generate token number
            const [tokCount] = await p.query(
                "SELECT COUNT(*) AS total FROM appointments WHERE (doctor_id = ? OR doctor = ?) AND appointment_date = ?",
                [doctorId || doctorName, doctorName || doctorId, appointmentDate]
            );
            const tokenNum = (tokCount[0]?.total || 0) + 1;
            const tokenString = `T-${String(tokenNum).padStart(2, "0")}`;

            // Insert appointment
            const [insRes] = await p.query(`
                INSERT INTO appointments
                (patient_id, hospital_id, doctor_id, doctor, department, appointment_date, appointment_time, status, token_number, checkin_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'Confirmed', ?, 'Scheduled')
            `, [
                patient_id,
                hospitalId || null,
                doctorId || null,
                doctorName || "Consultant Doctor",
                department,
                appointmentDate,
                appointmentTime,
                tokenString
            ]);

            const apptId = `APT-${100000 + insRes.insertId}`;

            // Broadcast real-time appointment event
            const io = req.app.get("io");
            if (io) {
                io.emit("appointment:new", {
                    id: insRes.insertId,
                    appointmentId: apptId,
                    patientId: patient_id,
                    patientName,
                    doctorName: doctorName || "Consultant Doctor",
                    doctorId,
                    hospitalId,
                    date: appointmentDate,
                    time: appointmentTime,
                    tokenNumber: tokenString,
                    status: "Confirmed"
                });
            }

            return res.status(201).json({
                success: true,
                message: "Appointment confirmed successfully.",
                id: insRes.insertId,
                appointmentId: apptId,
                appointment: {
                    id: insRes.insertId,
                    appointmentId: apptId,
                    tokenNumber: tokenString,
                    patientId: patient_id,
                    patientName,
                    doctorName: doctorName || "Consultant Doctor",
                    doctorId,
                    hospitalId,
                    appointmentDate,
                    appointmentTime,
                    department,
                    status: "Confirmed"
                }
            });
        } catch (err) {
            console.error("[DIRECT APPOINTMENT BOOKING ERROR]", err);
            return res.status(500).json({ success: false, message: "Appointment booking failed due to server error." });
        }
    }

    // Branch 2: Slot-based booking (requires patientId and slotId)
    if (!patientId) {
        return res.status(400).json({
            success: false,
            message: "Patient ID is required."
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
                            "SELECT name, hospital_id, status, department FROM doctors WHERE doctor_id = ? LIMIT 1",
                            [slot.doctor_id],
                            (dErr, dRows) => {
                                if (dErr) {
                                    console.error("Doctor lookup error:", dErr);
                                    return db.rollback(() =>
                                        res.status(500).json({ success: false, message: "Database error." })
                                    );
                                }

                                if (!dRows.length) {
                                    return db.rollback(() =>
                                        res.status(404).json({ success: false, message: "Doctor not found." })
                                    );
                                }

                                const doc = dRows[0];
                                const docStatus = String(doc.status || "available").toLowerCase();
                                if (!["active", "available"].includes(docStatus)) {
                                    return db.rollback(() =>
                                        res.status(400).json({ success: false, message: "Doctor is currently inactive or unavailable." })
                                    );
                                }

                                const requestedHosp = req.body.hospitalId || req.body.hospital_id;
                                if (requestedHosp && String(doc.hospital_id).toLowerCase() !== String(requestedHosp).toLowerCase()) {
                                    return db.rollback(() =>
                                        res.status(400).json({ success: false, message: "Cross-hospital booking rejected. Doctor belongs to a different hospital." })
                                    );
                                }

                                const doctorName = doc.name || doctor || null;
                                const hospitalId = doc.hospital_id || null;

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

router.put("/api/appointments/:id/cancel", optionalToken, (req, res) => {
    const appointmentId = req.params.id;

    if (!req.user && process.env.REQUIRE_AUTH !== "false") {
        return res.status(401).json({ success: false, message: "Authentication required to cancel an appointment." });
    }

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
                SELECT a.id, a.slot_id, a.status, a.patient_id, p.user_id, p.mobile
                FROM appointments a
                LEFT JOIN patients p ON a.patient_id = p.patient_id
                WHERE a.id = ?
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

                // Ownership / Authorization verification
                if (req.user) {
                    const role = (req.user.role || req.user.type || "").toLowerCase();
                    if (role === "citizen") {
                        const userId = req.user.id || req.user.userId;
                        const mobile = req.user.mobile ? req.user.mobile.replace(/\D/g, "") : null;
                        const patientMobile = appointment.mobile ? String(appointment.mobile).replace(/\D/g, "") : null;
                        const isOwner = (userId && appointment.user_id && Number(userId) === Number(appointment.user_id)) ||
                                        (mobile && patientMobile && mobile === patientMobile) ||
                                        (req.user.patientId && req.user.patientId === appointment.patient_id);
                        if (!isOwner) {
                            return conn.rollback(() => {
                                conn.release();
                                res.status(403).json({ message: "Access denied. You can only cancel your own appointments." });
                            });
                        }
                    }
                }

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

router.get(["/api/appointments", "/api/appointments/my-appointments"], authenticateToken, (req, res) => {
    const { hospital_id, doctor_id, date, status } = req.query;
    const role = (req.user.role || req.user.type || "").toLowerCase();

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

    // If caller is citizen, strictly restrict to their own records
    if (role === "citizen") {
        const userId = req.user.id || req.user.userId || -1;
        const mobile = req.user.mobile ? req.user.mobile.replace(/\D/g, "") : null;
        if (mobile) {
            sql += ` AND (p.user_id = ? OR p.mobile = ? OR RIGHT(p.mobile, 10) = RIGHT(?, 10))`;
            params.push(userId, mobile, mobile);
        } else {
            sql += ` AND p.user_id = ?`;
            params.push(userId);
        }
    } else if (role === "doctor") {
        const docId = req.user.doctorId || req.user.staffId;
        if (docId) {
            sql += ` AND (a.doctor_id = ? OR d.doctor_id = ?)`;
            params.push(docId, docId);
        }
    } else if (!["admin", "staff"].includes(role)) {
        return res.status(403).json({ success: false, message: "Access denied." });
    }

    if (hospital_id) {
        sql += ` AND a.hospital_id = ?`;
        params.push(hospital_id);
    }
    if (doctor_id && role !== "doctor") {
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

router.get("/api/appointments/:patientId", optionalToken, (req, res) => {
    const patientId = req.params.patientId;

    if (!patientId) {
        return res.status(400).json({
            message: "Patient ID is required."
        });
    }

    // Verify patient access
    db.query(
        "SELECT id, patient_id, user_id, mobile FROM patients WHERE patient_id = ? OR id = ? LIMIT 1",
        [patientId, isNaN(patientId) ? -1 : parseInt(patientId, 10)],
        (pErr, pRows) => {
            if (pErr) {
                console.error("Patient query error:", pErr);
                return res.status(500).json({ message: "Database error." });
            }

            if (!pRows.length) {
                return res.status(404).json({ message: "Patient not found." });
            }

            const patient = pRows[0];

            if (req.user) {
                const role = (req.user.role || req.user.type || "").toLowerCase();
                if (role === "citizen") {
                    const userId = req.user.id || req.user.userId;
                    const mobile = req.user.mobile ? req.user.mobile.replace(/\D/g, "") : null;
                    const patMobile = patient.mobile ? String(patient.mobile).replace(/\D/g, "") : null;
                    const isOwner = (userId && patient.user_id && Number(userId) === Number(patient.user_id)) ||
                                    (mobile && patMobile && mobile === patMobile) ||
                                    (req.user.patientId && req.user.patientId === patient.patient_id);
                    if (!isOwner) {
                        return res.status(403).json({ message: "Access denied. You can only view your own appointments." });
                    }
                }
            }

            const sql = `
                SELECT
                    a.id,
                    a.patient_id,
                    a.hospital_id,
                    COALESCE(h.hospital_name, a.hospital_id, 'Gorakhpur Healthcare Center') AS hospital_name,
                    a.doctor,
                    COALESCE(a.department, d.specialization, 'General Medicine') AS department,
                    a.slot_id,
                    a.doctor_id,
                    a.appointment_date,
                    a.appointment_time,
                    a.status,
                    a.token_number,
                    a.checkin_status,
                    a.created_at
                FROM appointments a
                LEFT JOIN hospitals h ON a.hospital_id = h.hospital_id
                LEFT JOIN doctors d ON a.doctor_id = d.doctor_id OR a.doctor_id = CAST(d.id AS CHAR) OR a.doctor = d.name
                WHERE a.patient_id = ?
                ORDER BY
                    a.appointment_date DESC,
                    a.appointment_time DESC
            `;

            db.query(sql, [patient.patient_id], (err, results) => {
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
        }
    );
});

module.exports = router;
