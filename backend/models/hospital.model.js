/**
 * SmartCity AI - Healthcare & Hospital Domain Model
 * Encapsulates MySQL queries for Hospitals, Beds, Doctors, Appointments, and Patient Records.
 */

const pool = require("../config/db").promise();

class HospitalModel {
    static async getAllHospitals() {
        const [rows] = await pool.query(`
            SELECT h.id, h.hospital_id, h.hospital_name AS name, h.address, h.latitude, h.longitude,
                   h.phone, h.emergency_number, h.total_beds, h.icu_beds, h.emergency_beds,
                   h.ambulance_count, (CASE WHEN h.ambulance_count > 0 THEN 1 ELSE 0 END) AS ambulance_available,
                   COALESCE(SUM(c.total_beds - c.occupied_beds), ROUND(h.total_beds * 0.75), 100) AS available_beds,
                   h.status, h.updated_at
            FROM hospitals h
            LEFT JOIN hospital_bed_categories c ON (h.id = c.hospital_id OR h.hospital_id = c.hospital_id)
            WHERE h.status = 'Active' OR h.status IS NULL
            GROUP BY h.id
            ORDER BY h.hospital_name ASC
        `);
        return rows;
    }

    static async getHospitalById(identifier) {
        const [rows] = await pool.query(`
            SELECT id, hospital_id, hospital_name AS name, hospital_name, address, latitude, longitude,
                   phone, emergency_number, email, website, hospital_type, total_beds, icu_beds, emergency_beds,
                   doctors_count, ambulance_count, status, updated_at
            FROM hospitals
            WHERE id = ? OR hospital_id = ?
            LIMIT 1
        `, [identifier, identifier]);
        return rows[0] || null;
    }

    static async getBedCategories(hospitalId = null) {
        let sql = `
            SELECT c.*, h.hospital_name AS hospital_name
            FROM hospital_bed_categories c
            LEFT JOIN hospitals h ON (c.hospital_id = h.id OR c.hospital_id = h.hospital_id)
        `;
        const params = [];
        if (hospitalId) {
            sql += ` WHERE c.hospital_id = ? OR h.hospital_id = ?`;
            params.push(hospitalId, hospitalId);
        }
        sql += ` ORDER BY c.id ASC`;
        const [rows] = await pool.query(sql, params);
        return rows;
    }

    static async getDoctors(hospitalId = null, department = null) {
        let sql = `
            SELECT d.*, h.hospital_name AS hospital_name, h.address AS hospital_address
            FROM doctors d
            LEFT JOIN hospitals h ON (d.hospital_id = h.id OR d.hospital_id = h.hospital_id)
            WHERE d.status = 'Active' OR d.status IS NULL
        `;
        const params = [];
        if (hospitalId) {
            sql += ` AND (d.hospital_id = ? OR h.hospital_id = ?)`;
            params.push(hospitalId, hospitalId);
        }
        if (department) {
            sql += ` AND d.department = ?`;
            params.push(department);
        }
        sql += ` ORDER BY d.name ASC`;
        const [rows] = await pool.query(sql, params);
        return rows;
    }

    static async getDoctorById(identifier) {
        const [rows] = await pool.query(`
            SELECT d.*, h.name AS hospital_name
            FROM doctors d
            LEFT JOIN hospitals h ON d.hospital_id = h.id OR d.hospital_code = h.hospital_code
            WHERE d.id = ? OR d.doctor_code = ?
            LIMIT 1
        `, [identifier, identifier]);
        return rows[0] || null;
    }

    static async bookAppointment({ appointmentNumber, patientId, doctorId, hospitalId, appointmentDate, slotTime, symptom, tokenNumber }) {
        const [result] = await pool.query(`
            INSERT INTO appointments
            (appointment_number, patient_id, doctor_id, hospital_id, appointment_date, slot_time, symptom, token_number, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed', NOW())
        `, [appointmentNumber, patientId, doctorId, hospitalId, appointmentDate, slotTime, symptom, tokenNumber]);
        return result.insertId;
    }

    static async getPatientById(identifier) {
        const [rows] = await pool.query(`
            SELECT * FROM patients
            WHERE id = ? OR patient_id = ? OR qr_token = ?
            LIMIT 1
        `, [identifier, identifier, identifier]);
        return rows[0] || null;
    }

    static async createPatient({ patientId, userId, name, mobile, age, gender, bloodGroup, address, emergencyContact, qrToken, abhaStatus, abhaId }) {
        const [result] = await pool.query(`
            INSERT INTO patients
            (patient_id, user_id, name, mobile, age, gender, blood_group, address, emergency_contact, qr_token, abha_status, abha_id, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', NOW())
        `, [patientId, userId || null, name, mobile, age, gender, bloodGroup, address, emergencyContact, qrToken, abhaStatus || 'Not Linked', abhaId || null]);
        return result.insertId;
    }

    static async getPatientRecords(patientId) {
        const [rows] = await pool.query(`
            SELECT * FROM patient_records
            WHERE patient_id = ?
            ORDER BY created_at DESC
        `, [patientId]);
        return rows;
    }

    static async getPatientReports(patientId) {
        const [rows] = await pool.query(`
            SELECT * FROM patient_reports
            WHERE patient_id = ?
            ORDER BY created_at DESC
        `, [patientId]);
        return rows;
    }
}

module.exports = HospitalModel;
