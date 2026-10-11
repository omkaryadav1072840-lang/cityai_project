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

// =========================================================
// TIME & SCHEDULE UTILITIES FOR DYNAMIC 20-MINUTE SLOTS
// =========================================================

/**
 * Normalizes any time string (e.g. "09:00", "09:00:00", "09:00 AM",
 * "09:00 AM – 09:20 AM", "09:00 - 09:20") into a clean 24h "HH:mm" start time.
 */
function normalizeToHHMM(timeStr) {
    if (!timeStr) return "";
    let s = String(timeStr).trim().toUpperCase();
    if (s.includes("–") || s.includes("-")) {
        s = s.split(/[-–]/)[0].trim();
    }
    const isPM = s.includes("PM");
    const isAM = s.includes("AM");
    const digits = s.replace(/[^\d:]/g, "");
    let [h, m = "00"] = digits.split(":");
    let hour = parseInt(h, 10);
    if (isNaN(hour)) return "";
    if (isPM && hour < 12) hour += 12;
    if (isAM && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Formats 24h minutes into 12-hour AM/PM string, e.g. 540 -> "09:00 AM"
 */
function formatMinutesTo12h(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Determines doctor working hours (in minutes from midnight) from:
 * 1) doctor_schedules table
 * 2) doctors.consultation_timings
 * 3) Default clinical standard 09:00 - 14:00 (9:00 AM – 2:00 PM)
 */
function parseDoctorWorkingHours(doc, schedule) {
    let startMinutes = 9 * 60;  // 09:00 AM (540m)
    let endMinutes = 14 * 60;   // 02:00 PM (840m)

    if (schedule && schedule.start_time && schedule.end_time) {
        const [sh, sm] = String(schedule.start_time).split(":").map(Number);
        const [eh, em] = String(schedule.end_time).split(":").map(Number);
        if (!isNaN(sh) && !isNaN(eh)) {
            startMinutes = sh * 60 + (sm || 0);
            endMinutes = eh * 60 + (em || 0);
            return { startMinutes, endMinutes, source: "schedule" };
        }
    }

    if (doc && doc.consultation_timings) {
        const parts = String(doc.consultation_timings).split(/[-–—to]+/i);
        if (parts.length === 2) {
            const parseTimePart = (str) => {
                const s = str.trim().toUpperCase();
                const isPM = s.includes("PM");
                const isAM = s.includes("AM");
                const digits = s.replace(/[^\d:]/g, "");
                let [h, m = 0] = digits.split(":").map(Number);
                if (isPM && h < 12) h += 12;
                if (isAM && h === 12) h = 0;
                return h * 60 + (m || 0);
            };
            const sMin = parseTimePart(parts[0]);
            const eMin = parseTimePart(parts[1]);
            if (!isNaN(sMin) && !isNaN(eMin) && eMin > sMin) {
                return { startMinutes: sMin, endMinutes: eMin, source: "timings" };
            }
        }
    }

    return { startMinutes, endMinutes, source: "default" };
}

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
            SELECT d.id, d.doctor_id, d.name, d.status, d.hospital_id, d.department, d.specialization,
                   d.consultation_timings, d.available_days, d.consultation_fee,
                   h.hospital_name, h.status AS hospital_status
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

        // Validate date
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                message: "Invalid date format. Expected YYYY-MM-DD."
            });
        }

        const [year, month, day] = date.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day);
        const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const fullDayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const targetDayName = fullDayNames[dayOfWeek];

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const isToday = (todayStr === date);
        const isPastDate = (date < todayStr);
        const currentDayMinutes = now.getHours() * 60 + now.getMinutes();

        if (isPastDate) {
            return res.json({
                success: false,
                message: "Cannot book appointments for past dates. Please select today or a future date."
            });
        }

        // 2. Check doctor's recurring weekly schedule or consultation timings
        const [schedRows] = await p.query(`
            SELECT start_time, end_time, slot_duration, is_active
            FROM doctor_schedules 
            WHERE doctor_id = ? 
              AND (hospital_id = ? OR hospital_id IS NULL OR hospital_id = '')
              AND (day_of_week = ? OR day_of_week = ? OR day_of_week = ?)
              AND is_active = 1
            LIMIT 1
        `, [doc.doctor_id, hospitalId, dayOfWeek, dayNames[dayOfWeek], targetDayName]);

        const schedule = schedRows[0] || null;

        // Check if doctor is closed on this day
        if (!schedule) {
            if (doc.available_days) {
                const availStr = String(doc.available_days).toLowerCase();
                const shortMatches = availStr.includes(dayNames[dayOfWeek].toLowerCase());
                const fullMatches = availStr.includes(targetDayName.toLowerCase());
                if (!shortMatches && !fullMatches) {
                    return res.json({
                        success: false,
                        message: `Dr. ${doc.name} OPD is closed on ${targetDayName}s.`
                    });
                }
            } else if (dayOfWeek === 0) {
                // Sunday closed by default unless explicitly scheduled
                return res.json({
                    success: false,
                    message: `Dr. ${doc.name} OPD is closed on Sundays.`
                });
            }
        }

        // Determine working hours in minutes
        const { startMinutes, endMinutes } = parseDoctorWorkingHours(doc, schedule);

        // 3. Fetch existing booked appointments for this doctor on this date
        const [bookedRows] = await p.query(`
            SELECT appointment_time 
            FROM appointments 
            WHERE (doctor_id = ? OR doctor_id = ? OR doctor = ?) 
              AND appointment_date = ? 
              AND status NOT IN ('Cancelled', 'Rejected')
        `, [doc.doctor_id, doctorId, doc.name, date]);

        const bookedSet = new Set(
            (bookedRows || []).map(b => normalizeToHHMM(b.appointment_time)).filter(Boolean)
        );

        // 4. Check doctor_slots table for matching date slots / capacities
        const [dbSlots] = await p.query(`
            SELECT id, start_time, end_time, max_patients, booked_patients, status
            FROM doctor_slots
            WHERE doctor_id = ? AND slot_date = ?
        `, [doc.doctor_id, date]);

        const slotMap = new Map();
        for (const s of (dbSlots || [])) {
            const cleanT = normalizeToHHMM(s.start_time);
            if (cleanT) slotMap.set(cleanT, s);
        }

        // 5. GENERATE DYNAMIC EXACT 20-MINUTE SLOTS
        const SLOT_DURATION = 20; // Exactly 20 minutes
        const slots = [];
        let currentMinutes = startMinutes;

        while (currentMinutes + SLOT_DURATION <= endMinutes) {
            const slotStart = currentMinutes;
            const slotEnd = currentMinutes + SLOT_DURATION;

            const startH = Math.floor(slotStart / 60);
            const startM = slotStart % 60;
            const startTime24 = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;

            const endH = Math.floor(slotEnd / 60);
            const endM = slotEnd % 60;
            const endTime24 = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

            const startDisplay = formatMinutesTo12h(slotStart);
            const endDisplay = formatMinutesTo12h(slotEnd);
            const displayTimeRange = `${startDisplay} – ${endDisplay}`;

            // Check if slot has already passed today
            const isPast = isToday && (slotStart <= currentDayMinutes);

            // Check if slot is booked in appointments table
            let isBooked = bookedSet.has(startTime24);

            // Check if doctor_slots has booked/full status
            const dbSlotMatch = slotMap.get(startTime24);
            let slotId = null;
            if (dbSlotMatch) {
                slotId = dbSlotMatch.id;
                const maxP = Number(dbSlotMatch.max_patients || 1);
                const bookedP = Number(dbSlotMatch.booked_patients || 0);
                if (bookedP >= maxP || ["booked", "full"].includes(String(dbSlotMatch.status || "").toLowerCase())) {
                    isBooked = true;
                }
            }

            let slotStatus = "available";
            if (isBooked) {
                slotStatus = "booked";
            } else if (isPast) {
                slotStatus = "unavailable";
            }

            slots.push({
                slotId,
                time: startTime24,
                startTime: startTime24,
                endTime: endTime24,
                duration: SLOT_DURATION,
                timeLabel: startDisplay,
                displayTime: displayTimeRange,
                status: slotStatus
            });

            currentMinutes += SLOT_DURATION;
        }

        const availableSlots = slots.filter(s => s.status === "available");
        const allBooked = slots.length > 0 && slots.every(s => s.status === "booked");
        const allPast = isToday && slots.length > 0 && slots.every(s => s.status === "unavailable");

        let advisoryMessage = null;
        if (allPast) {
            advisoryMessage = "All appointment slots for today have already passed. Please select a future date.";
        } else if (allBooked) {
            advisoryMessage = "All appointment slots are currently booked for this doctor on the selected date.";
        } else if (slots.length === 0) {
            advisoryMessage = "No consultation slots scheduled for this doctor on the selected date.";
        }

        res.json({
            success: true,
            hospitalId,
            hospitalName: doc.hospital_name,
            doctorId: doc.doctor_id,
            doctorName: doc.name,
            department: doc.department || "General Medicine",
            specialization: doc.specialization || "Consultant",
            consultationFee: doc.consultation_fee || 0,
            date,
            dayOfWeek: targetDayName,
            workingHours: `${formatMinutesTo12h(startMinutes)} – ${formatMinutesTo12h(endMinutes)}`,
            slotDuration: SLOT_DURATION,
            count: slots.length,
            availableCount: availableSlots.length,
            allBooked,
            message: advisoryMessage,
            slots
        });

    } catch (err) {
        console.error("[APPOINTMENT AVAILABILITY ERROR]", err);
        res.status(500).json({ success: false, message: "Server error loading appointment availability." });
    }
});

// =========================================================
// STRICT APPOINTMENT BOOKING API (With 20-Min Validation & Double Booking Prevention)
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
            message: "Patient ID, Hospital ID, Doctor ID, Date, and 20-minute Time Slot are required."
        });
    }

    try {
        const p = db.promise();

        // 1. Validate Patient ID in registry
        const [pRows] = await p.query(
            "SELECT id, name, patient_id, mobile, age, gender FROM patients WHERE patient_id = ? OR id = ? LIMIT 1",
            [patientId, isNaN(patientId) ? -1 : parseInt(patientId, 10)]
        );
        if (!pRows.length) {
            return res.status(404).json({
                success: false,
                message: `Patient ID "${patientId}" not found in patient registry. Please enter a valid registered Patient ID.`
            });
        }
        const resolvedPatientId = pRows[0].patient_id || patientId;
        const resolvedPatientName = pRows[0].name || patientName || "Patient";

        // 2. Fetch Doctor and validate exact Hospital relationship
        const [dRows] = await p.query(`
            SELECT d.id, d.doctor_id, d.name AS doctor_name, d.hospital_id, d.department, d.specialization,
                   d.status AS doctor_status,
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

        // STRICT RELATIONSHIP VALIDATION: doctor belongs to selected hospital
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

        // 3. Normalize 20-minute slot times & validate date
        const cleanStartTime = normalizeToHHMM(appointmentTime);
        if (!cleanStartTime) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment time slot specified."
            });
        }

        const [startH, startM] = cleanStartTime.split(":").map(Number);
        const slotStartMin = startH * 60 + startM;
        const slotEndMin = slotStartMin + 20; // 20-minute slot duration
        const endH = Math.floor(slotEndMin / 60);
        const endM = slotEndMin % 60;
        const cleanEndTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

        const startPeriod = startH >= 12 ? "PM" : "AM";
        const startH12 = startH % 12 || 12;
        const startDisplay = `${String(startH12).padStart(2, "0")}:${String(startM).padStart(2, "0")} ${startPeriod}`;

        const endPeriod = endH >= 12 ? "PM" : "AM";
        const endH12 = endH % 12 || 12;
        const endDisplay = `${String(endH12).padStart(2, "0")}:${String(endM).padStart(2, "0")} ${endPeriod}`;

        // Exactly "10:00 AM – 10:20 AM"
        const displayTimeRange = `${startDisplay} – ${endDisplay}`;

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const currentDayMinutes = now.getHours() * 60 + now.getMinutes();

        if (appointmentDate < todayStr) {
            return res.status(400).json({
                success: false,
                message: "Cannot book appointments for past dates."
            });
        }

        if (appointmentDate === todayStr && slotStartMin <= currentDayMinutes) {
            return res.status(400).json({
                success: false,
                message: "Cannot book an appointment slot that has already passed."
            });
        }

        // 4. Validate Slot in doctor_slots if slotId provided
        if (slotId) {
            const [sRows] = await p.query(
                "SELECT * FROM doctor_slots WHERE id = ? LIMIT 1",
                [slotId]
            );
            if (sRows.length > 0) {
                const slot = sRows[0];
                const maxP = Number(slot.max_patients || 1);
                const bookedP = Number(slot.booked_patients || 0);
                if (bookedP >= maxP || ["full", "booked"].includes(String(slot.status).toLowerCase())) {
                    return res.status(409).json({
                        success: false,
                        conflict: true,
                        message: "This appointment slot is already fully booked. Please select another slot."
                    });
                }
            }
        }

        // 5. PREVENT DOUBLE BOOKING: doctor + date + 20-minute slot
        const [existingAppts] = await p.query(`
            SELECT id, patient_id, appointment_time FROM appointments 
            WHERE (doctor_id = ? OR doctor_id = ? OR doctor = ?) 
              AND appointment_date = ? 
              AND status NOT IN ('Cancelled', 'Rejected')
        `, [doc.doctor_id, doctorId, doc.doctor_name, appointmentDate]);

        const conflictAppt = existingAppts.find(a => normalizeToHHMM(a.appointment_time) === cleanStartTime);

        if (conflictAppt) {
            if (conflictAppt.patient_id === resolvedPatientId) {
                return res.status(200).json({
                    success: true,
                    message: "Appointment already confirmed for this patient.",
                    appointment: {
                        appointmentId: `APT-${100000 + conflictAppt.id}`,
                        tokenNumber: `T-${String(conflictAppt.id).padStart(2, "0")}`,
                        patientId: resolvedPatientId,
                        patientName: resolvedPatientName,
                        hospitalName: doc.hospital_name,
                        doctorName: doc.doctor_name,
                        date: appointmentDate,
                        time: displayTimeRange,
                        startTime: cleanStartTime,
                        endTime: cleanEndTime,
                        duration: 20
                    }
                });
            }
            return res.status(409).json({
                success: false,
                conflict: true,
                message: "Sorry, this 20-minute slot has already been booked by another patient. Please select another available slot."
            });
        }

        // 6. Generate token number
        const [tokCount] = await p.query(
            "SELECT COUNT(*) AS total FROM appointments WHERE (doctor_id = ? OR doctor_id = ?) AND appointment_date = ?",
            [doc.doctor_id, doctorId, appointmentDate]
        );
        const tokenNum = (tokCount[0]?.total || 0) + 1;
        const tokenString = `T-${String(tokenNum).padStart(2, "0")}`;

        // 7. Insert Appointment with proper 20-minute duration time representation
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
            doc.department || doc.specialization || "General Medicine",
            slotId || null,
            appointmentDate,
            displayTimeRange,
            tokenString
        ]);

        const appointmentId = `APT-${100000 + insRes.insertId}`;

        // 8. Update doctor_slots capacity if matching row exists
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
            `, [doc.doctor_id, appointmentDate, cleanStartTime, `${cleanStartTime}%`]);
        }

        // 9. Broadcast real-time appointment event for Doctor & Hospital Dashboards
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
                department: doc.department || "General Medicine",
                date: appointmentDate,
                time: displayTimeRange,
                startTime: cleanStartTime,
                endTime: cleanEndTime,
                duration: 20,
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
                patientName: resolvedPatientName,
                hospitalName: doc.hospital_name,
                doctorName: doc.doctor_name,
                date: appointmentDate,
                time: displayTimeRange,
                startTime: cleanStartTime,
                endTime: cleanEndTime,
                duration: 20
            }
        });

    } catch (err) {
        console.error("[BOOK STRICT ERROR]", err);
        if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
            return res.status(409).json({
                success: false,
                conflict: true,
                message: "Sorry, this 20-minute slot has already been booked by another patient. Please select another available slot."
            });
        }
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
            if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
                return res.status(409).json({
                    success: false,
                    conflict: true,
                    message: "Sorry, this appointment slot has already been booked by another patient. Please select another available slot."
                });
            }
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
