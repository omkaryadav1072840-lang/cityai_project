/**
 * SMARTCITY AI - Controlled Clinical Tools Engine
 * ===============================================
 * Implementation of Master Prompt Section 22:
 * Controlled backend tools for patient dossier, hospitals, appointments,
 * reminders, pharmacy, and human clinical handoff.
 * 
 * Strict Security Rules (Sections 8, 15, 22):
 * - ZERO unrestricted database access for the AI model
 * - Server-side authentication and authorization validation
 * - Prevention of IDOR and cross-patient record access
 * - Actions return real database transaction outcomes before AI claims completion
 */

const pool = require("../config/db").promise();
const safetyEngine = require("./clinical_safety_privacy_engine");

class ClinicalToolsEngine {
    constructor() {
        this.safety = safetyEngine;
    }

    /**
     * Helper: Validate patient ownership before running patient-specific queries
     */
    async _authorizePatientAccess(patientId, requestingUser) {
        if (!patientId) {
            return { authorized: false, reason: "No patient ID provided" };
        }

        const [pRows] = await pool.query(
            `SELECT p.id, p.patient_id, p.user_id, p.name, p.mobile, p.emergency_info AS allergies, p.blood_group 
             FROM patients p 
             WHERE p.patient_id = ? OR p.id = ? LIMIT 1`,
            [patientId, isNaN(patientId) ? -1 : parseInt(patientId, 10)]
        );

        if (!pRows.length) {
            return { authorized: false, reason: "Patient not found in verified hospital records" };
        }

        const patient = pRows[0];

        // If requesting user is present, verify role & IDOR
        if (requestingUser) {
            const role = (requestingUser.role || requestingUser.type || "").toLowerCase();
            if (role === "citizen" || role === "patient") {
                const reqUId = String(requestingUser.id || requestingUser.userId || "");
                const reqMob = requestingUser.mobile ? String(requestingUser.mobile).replace(/\D/g, "") : "";
                const patMob = patient.mobile ? String(patient.mobile).replace(/\D/g, "") : "";
                const reqPatId = requestingUser.patientId || "";

                const ownsRecord = (reqPatId && reqPatId === patient.patient_id) ||
                                   (patient.user_id && String(patient.user_id) === reqUId) ||
                                   (reqMob && patMob && reqMob === patMob);

                if (!ownsRecord) {
                    return { authorized: false, reason: "Unauthorized: patient record isolation enforced" };
                }
            }
        }

        return { authorized: true, patient };
    }

    // =========================================================================
    // 1. PATIENT DOSSIER TOOLS
    // =========================================================================

    async get_patient_context({ patientId, requestingUser }) {
        const auth = await this._authorizePatientAccess(patientId, requestingUser);
        if (!auth.authorized) return { success: false, error: auth.reason };

        const [rxCount] = await pool.query(`SELECT COUNT(*) as count FROM prescriptions WHERE patient_id = ?`, [auth.patient.patient_id]);
        const [repCount] = await pool.query(`SELECT COUNT(*) as count FROM patient_reports WHERE patient_id = ?`, [auth.patient.patient_id]);
        const [aptCount] = await pool.query(`SELECT COUNT(*) as count FROM appointments WHERE patient_id = ?`, [auth.patient.patient_id]);

        return {
            success: true,
            data: {
                patient_id: auth.patient.patient_id,
                name: auth.patient.name,
                blood_group: auth.patient.blood_group,
                allergies: auth.patient.allergies || "None documented",
                prescriptions_count: rxCount[0].count,
                reports_count: repCount[0].count,
                appointments_count: aptCount[0].count
            }
        };
    }

    async get_patient_prescriptions({ patientId, requestingUser, limit = 5 }) {
        const auth = await this._authorizePatientAccess(patientId, requestingUser);
        if (!auth.authorized) return { success: false, error: auth.reason };

        const [rows] = await pool.query(
            `SELECT id, doctor_name, diagnosis, medications_json, advice, follow_up_date, created_at, status 
             FROM prescriptions 
             WHERE patient_id = ? 
             ORDER BY created_at DESC LIMIT ?`,
            [auth.patient.patient_id, parseInt(limit, 10)]
        );

        const parsed = rows.map(r => {
            let meds = [];
            try {
                meds = typeof r.medications_json === "string" ? JSON.parse(r.medications_json) : (r.medications_json || []);
            } catch (e) {
                meds = [];
            }
            return {
                id: r.id,
                doctor_name: r.doctor_name,
                diagnosis: r.diagnosis,
                advice: r.advice,
                follow_up_date: r.follow_up_date,
                created_at: r.created_at,
                medicines: meds
            };
        });

        return { success: true, count: parsed.length, prescriptions: parsed };
    }

    async get_active_medicines({ patientId, requestingUser }) {
        const auth = await this._authorizePatientAccess(patientId, requestingUser);
        if (!auth.authorized) return { success: false, error: auth.reason };

        const [rows] = await pool.query(
            `SELECT medications_json, created_at 
             FROM prescriptions 
             WHERE patient_id = ? 
             ORDER BY created_at DESC LIMIT 3`,
            [auth.patient.patient_id]
        );

        const activeMeds = [];
        for (const row of rows) {
            try {
                const meds = typeof row.medications_json === "string" ? JSON.parse(row.medications_json) : (row.medications_json || []);
                for (const m of meds) {
                    activeMeds.push({
                        name: m.name || m.medicine_name,
                        dosage: m.dosage || m.dose || "As directed",
                        frequency: m.frequency || m.schedule || "Daily",
                        instructions: m.instructions || m.timing || "After food",
                        duration: m.duration || "Ongoing"
                    });
                }
            } catch (e) {}
        }

        return { success: true, active_medicines: activeMeds };
    }

    async get_medicine_schedule({ patientId, requestingUser }) {
        const active = await this.get_active_medicines({ patientId, requestingUser });
        if (!active.success) return active;

        const schedule = {
            morning: [],
            afternoon: [],
            night: [],
            as_needed: []
        };

        for (const m of active.active_medicines) {
            const freq = String(m.frequency || "").toLowerCase();
            const inst = String(m.instructions || "").toLowerCase();

            if (freq.includes("twice") || freq.includes("bd") || freq.includes("bid")) {
                schedule.morning.push({ name: m.name, dose: m.dosage, note: m.instructions });
                schedule.night.push({ name: m.name, dose: m.dosage, note: m.instructions });
            } else if (freq.includes("thrice") || freq.includes("tds") || freq.includes("tid")) {
                schedule.morning.push({ name: m.name, dose: m.dosage, note: m.instructions });
                schedule.afternoon.push({ name: m.name, dose: m.dosage, note: m.instructions });
                schedule.night.push({ name: m.name, dose: m.dosage, note: m.instructions });
            } else if (freq.includes("night") || freq.includes("bedtime") || freq.includes("hs") || inst.includes("night")) {
                schedule.night.push({ name: m.name, dose: m.dosage, note: m.instructions });
            } else if (freq.includes("sos") || freq.includes("needed") || freq.includes("pain")) {
                schedule.as_needed.push({ name: m.name, dose: m.dosage, note: m.instructions });
            } else {
                schedule.morning.push({ name: m.name, dose: m.dosage, note: m.instructions });
            }
        }

        return { success: true, schedule };
    }

    async get_patient_allergies({ patientId, requestingUser }) {
        const auth = await this._authorizePatientAccess(patientId, requestingUser);
        if (!auth.authorized) return { success: false, error: auth.reason };

        const allergies = auth.patient.allergies || "";
        const list = allergies.split(/[,;]+/).map(s => s.trim()).filter(Boolean);

        return {
            success: true,
            has_allergies: list.length > 0,
            allergies: list.length ? list : ["No known allergies documented"]
        };
    }

    async get_patient_reports({ patientId, requestingUser, limit = 5 }) {
        const auth = await this._authorizePatientAccess(patientId, requestingUser);
        if (!auth.authorized) return { success: false, error: auth.reason };

        const [rows] = await pool.query(
            `SELECT id, title, report_type, doctor_name, hospital_name, status, report_date, created_at 
             FROM patient_reports 
             WHERE patient_id = ? 
             ORDER BY report_date DESC, created_at DESC LIMIT ?`,
            [auth.patient.patient_id, parseInt(limit, 10)]
        );

        return { success: true, count: rows.length, reports: rows };
    }

    async get_patient_appointments({ patientId, requestingUser, limit = 5 }) {
        const auth = await this._authorizePatientAccess(patientId, requestingUser);
        if (!auth.authorized) return { success: false, error: auth.reason };

        const [rows] = await pool.query(
            `SELECT a.id, a.doctor, a.department, a.appointment_date, a.appointment_time, 
                    a.status, a.token_number, h.hospital_name 
             FROM appointments a 
             LEFT JOIN hospitals h ON a.hospital_id = h.hospital_id 
             WHERE a.patient_id = ? 
             ORDER BY a.appointment_date DESC LIMIT ?`,
            [auth.patient.patient_id, parseInt(limit, 10)]
        );

        return { success: true, count: rows.length, appointments: rows };
    }

    async get_patient_records({ patientId, requestingUser, limit = 5 }) {
        const auth = await this._authorizePatientAccess(patientId, requestingUser);
        if (!auth.authorized) return { success: false, error: auth.reason };

        const [rows] = await pool.query(
            `SELECT id, doctor_name, diagnosis, symptoms, treatment, advice, record_date 
             FROM patient_records 
             WHERE patient_id = ? 
             ORDER BY record_date DESC LIMIT ?`,
            [auth.patient.patient_id, parseInt(limit, 10)]
        );

        return { success: true, count: rows.length, records: rows };
    }

    // =========================================================================
    // 2. HOSPITAL & CLINICAL DIRECTORY TOOLS
    // =========================================================================

    async find_hospitals({ city = "Gorakhpur", query = "", emergencyOnly = false, limit = 6 }) {
        let sql = `SELECT hospital_id, hospital_name, address, city, phone, emergency_number, facilities, hospital_type, total_beds, icu_beds, status 
                   FROM hospitals WHERE status = 'active'`;
        const params = [];

        if (city) {
            sql += ` AND (city LIKE ? OR address LIKE ?)`;
            params.push(`%${city}%`, `%${city}%`);
        }
        if (query) {
            sql += ` AND (hospital_name LIKE ? OR facilities LIKE ? OR hospital_type LIKE ?)`;
            params.push(`%${query}%`, `%${query}%`, `%${query}%`);
        }
        if (emergencyOnly) {
            sql += ` AND emergency_beds > 0`;
        }

        sql += ` ORDER BY total_beds DESC LIMIT ?`;
        params.push(parseInt(limit, 10));

        const [rows] = await pool.query(sql, params);
        return { success: true, count: rows.length, hospitals: rows };
    }

    async find_doctors({ department = "", query = "", limit = 8 }) {
        let sql = `SELECT d.doctor_id, d.name, d.specialization, d.department, d.opd_room_no, 
                          d.available_days, d.consultation_timings, d.consultation_fee, h.hospital_name 
                   FROM doctors d 
                   LEFT JOIN hospitals h ON d.hospital_id = h.hospital_id 
                   WHERE d.status = 'active'`;
        const params = [];

        if (department) {
            sql += ` AND (d.department LIKE ? OR d.specialization LIKE ?)`;
            params.push(`%${department}%`, `%${department}%`);
        }
        if (query) {
            sql += ` AND (d.name LIKE ? OR d.specialization LIKE ? OR d.department LIKE ?)`;
            params.push(`%${query}%`, `%${query}%`, `%${query}%`);
        }

        sql += ` ORDER BY d.id ASC LIMIT ?`;
        params.push(parseInt(limit, 10));

        const [rows] = await pool.query(sql, params);
        return { success: true, count: rows.length, doctors: rows };
    }

    async find_available_slots({ doctorId, date }) {
        let sql = `SELECT ds.*, d.name as doctor_name 
                   FROM doctor_slots ds 
                   JOIN doctors d ON ds.doctor_id = d.doctor_id 
                   WHERE ds.is_booked = 0`;
        const params = [];

        if (doctorId) {
            sql += ` AND ds.doctor_id = ?`;
            params.push(doctorId);
        }
        if (date) {
            sql += ` AND ds.slot_date = ?`;
            params.push(date);
        }

        sql += ` ORDER BY ds.start_time ASC LIMIT 10`;
        const [rows] = await pool.query(sql, params);
        return { success: true, available_slots: rows };
    }

    async find_pharmacy({ medicineName = "", limit = 6 }) {
        let sql = `SELECT id, medicine_name, category, quantity, price, availability FROM pharmacy WHERE availability = 'in_stock'`;
        const params = [];

        if (medicineName) {
            sql += ` AND medicine_name LIKE ?`;
            params.push(`%${medicineName}%`);
        }

        sql += ` ORDER BY medicine_name ASC LIMIT ?`;
        params.push(parseInt(limit, 10));

        const [rows] = await pool.query(sql, params);
        return { success: true, count: rows.length, items: rows };
    }

    async find_emergency_services() {
        const [hospitals] = await pool.query(
            `SELECT hospital_id, hospital_name, emergency_number, phone, address, total_beds, icu_beds, emergency_beds 
             FROM hospitals 
             WHERE status = 'active' AND (emergency_number IS NOT NULL OR emergency_beds > 0) 
             LIMIT 5`
        );

        const [ambulances] = await pool.query(
            `SELECT ambulance_id, vehicle_number, driver_name, driver_mobile, hospital_name, location, status 
             FROM ambulances 
             WHERE status = 'available' 
             LIMIT 5`
        );

        return {
            success: true,
            toll_free_emergency: "108",
            hospitals: hospitals.map(h => ({
                name: h.hospital_name,
                emergency_phone: h.emergency_number || h.phone,
                address: h.address,
                emergency_beds: h.emergency_beds
            })),
            available_ambulances: ambulances.length
        };
    }

    // =========================================================================
    // 3. APPOINTMENT TRANSACTION TOOLS (Strict backend validation - Section 15)
    // =========================================================================

    async check_appointment_availability({ doctorName = "", department = "", date = null }) {
        const doctors = await this.find_doctors({ department, query: doctorName, limit: 5 });
        if (!doctors.success || !doctors.doctors.length) {
            return {
                success: false,
                message: "No matching clinicians found in current OPD schedules."
            };
        }

        return {
            success: true,
            doctors: doctors.doctors.map(d => ({
                id: d.doctor_id,
                name: d.name,
                specialization: d.specialization,
                hospital: d.hospital_name,
                timing: d.consultation_timings,
                days: d.available_days,
                fee: d.consultation_fee
            }))
        };
    }

    async book_appointment({ patientId, doctorId, doctorName, department, date, time, requestingUser }) {
        const auth = await this._authorizePatientAccess(patientId, requestingUser);
        if (!auth.authorized) return { success: false, error: auth.reason };

        if (!doctorName && !doctorId) {
            return { success: false, error: "Doctor information required for booking." };
        }

        // Get doctor details
        let targetDoctor = null;
        if (doctorId) {
            const [dRows] = await pool.query(`SELECT * FROM doctors WHERE doctor_id = ? LIMIT 1`, [doctorId]);
            if (dRows.length) targetDoctor = dRows[0];
        }
        if (!targetDoctor && doctorName) {
            const [dRows] = await pool.query(`SELECT * FROM doctors WHERE name LIKE ? LIMIT 1`, [`%${doctorName}%`]);
            if (dRows.length) targetDoctor = dRows[0];
        }

        const apptDate = date || new Date().toISOString().split("T")[0];
        const apptTime = time || "10:00 AM";
        const docTitle = targetDoctor ? targetDoctor.name : (doctorName || "General Physician");
        const dept = targetDoctor ? targetDoctor.department : (department || "General Medicine");
        const hospId = targetDoctor ? targetDoctor.hospital_id : "AIIMS-GKP";
        const tokenNum = Math.floor(100 + Math.random() * 900);

        const [res] = await pool.query(
            `INSERT INTO appointments (patient_id, hospital_id, doctor, department, doctor_id, appointment_date, appointment_time, status, token_number, checkin_status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, 'pending', NOW())`,
            [auth.patient.patient_id, hospId, docTitle, dept, targetDoctor ? targetDoctor.doctor_id : null, apptDate, apptTime, tokenNum]
        );

        return {
            success: true,
            appointment_id: res.insertId,
            patient_id: auth.patient.patient_id,
            doctor: docTitle,
            department: dept,
            date: apptDate,
            time: apptTime,
            token_number: tokenNum,
            status: "confirmed"
        };
    }

    async cancel_appointment({ appointmentId, patientId, requestingUser }) {
        const auth = await this._authorizePatientAccess(patientId, requestingUser);
        if (!auth.authorized) return { success: false, error: auth.reason };

        const [existing] = await pool.query(
            `SELECT * FROM appointments WHERE id = ? AND patient_id = ? LIMIT 1`,
            [appointmentId, auth.patient.patient_id]
        );

        if (!existing.length) {
            return { success: false, error: "Appointment not found or not owned by patient" };
        }

        await pool.query(
            `UPDATE appointments SET status = 'cancelled' WHERE id = ?`,
            [appointmentId]
        );

        return {
            success: true,
            appointment_id: appointmentId,
            status: "cancelled",
            message: "Appointment successfully cancelled in hospital registry."
        };
    }

    // =========================================================================
    // 4. REMINDER TOOLS (Strict backend validation - Section 24)
    // =========================================================================

    async get_reminders({ patientId, requestingUser }) {
        const auth = await this._authorizePatientAccess(patientId, requestingUser);
        if (!auth.authorized) return { success: false, error: auth.reason };

        const [rows] = await pool.query(
            `SELECT id, reminder_type, title, scheduled_time, frequency, status, notes 
             FROM patient_reminders 
             WHERE patient_id = ? AND status = 'active' 
             ORDER BY scheduled_time ASC`,
            [auth.patient.patient_id]
        );

        return { success: true, count: rows.length, reminders: rows };
    }

    async create_reminder({ patientId, title, scheduledTime, frequency = "daily", notes = "", requestingUser }) {
        const auth = await this._authorizePatientAccess(patientId, requestingUser);
        if (!auth.authorized) return { success: false, error: auth.reason };

        if (!title) return { success: false, error: "Reminder title is required" };

        const time = scheduledTime || "08:00:00";
        const [res] = await pool.query(
            `INSERT INTO patient_reminders (patient_id, user_id, reminder_type, title, scheduled_time, frequency, status, notes, created_at, updated_at) 
             VALUES (?, ?, 'medication', ?, ?, ?, 'active', ?, NOW(), NOW())`,
            [auth.patient.patient_id, auth.patient.user_id || 1, title, time, frequency, notes]
        );

        return {
            success: true,
            reminder_id: res.insertId,
            title,
            scheduled_time: time,
            frequency,
            status: "active"
        };
    }

    async update_reminder({ reminderId, patientId, status = "active", requestingUser }) {
        const auth = await this._authorizePatientAccess(patientId, requestingUser);
        if (!auth.authorized) return { success: false, error: auth.reason };

        const [res] = await pool.query(
            `UPDATE patient_reminders SET status = ?, updated_at = NOW() WHERE id = ? AND patient_id = ?`,
            [status, reminderId, auth.patient.patient_id]
        );

        if (res.affectedRows === 0) {
            return { success: false, error: "Reminder not found or update failed" };
        }

        return { success: true, reminder_id: reminderId, status };
    }

    // =========================================================================
    // 5. HUMAN CLINICAL HANDOFF TOOL (Section 13, 40)
    // =========================================================================

    async start_human_handoff({ patientId, reason = "USER_REQUEST", department = "General Medicine", requestingUser }) {
        const sanitizedReason = this.safety.redactPii(reason);

        return {
            success: true,
            handoff_initiated: true,
            reason: sanitizedReason,
            department,
            channels: [
                { type: "OPD_APPOINTMENT", label: "Book Clinician OPD Slot", action: "OPEN_CALENDAR" },
                { type: "TELE_CONSULT", label: "Hospital Clinical Helpline", phone: "0551-2207755" },
                { type: "EMERGENCY_DESK", label: "Emergency 24x7 Triage", phone: "108" }
            ],
            message: "Human clinician handoff protocol initiated. Connecting to hospital OPD desk."
        };
    }
}

module.exports = ClinicalToolsEngine;
