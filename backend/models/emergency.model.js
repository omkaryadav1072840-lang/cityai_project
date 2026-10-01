/**
 * SmartCity AI - Emergency & Ambulance Domain Model
 * Encapsulates MySQL queries for Ambulances, SOS Incidents, and Green Waves.
 */

const pool = require("../config/db").promise();

class EmergencyModel {
    static async getAmbulances() {
        const [rows] = await pool.query(`
            SELECT id, vehicle_number, driver_name, driver_phone,
                   hospital_id, base_location, current_latitude, current_longitude,
                   type, status, current_speed_kmh, fuel_percent, updated_at
            FROM ambulances
            ORDER BY id ASC
        `);
        return rows;
    }

    static async getAmbulanceById(identifier) {
        const [rows] = await pool.query(`
            SELECT * FROM ambulances
            WHERE id = ? OR vehicle_number = ?
            LIMIT 1
        `, [identifier, identifier]);
        return rows[0] || null;
    }

    static async createIncident({ incidentCode, callerName, callerPhone, callerMobile, incidentType, type, latitude, longitude, address, location, description, severity, priority }) {
        const [result] = await pool.query(`
            INSERT INTO emergency_incidents
            (incident_code, caller_name, caller_mobile, type, latitude, longitude, location, description, priority, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', NOW())
        `, [
            incidentCode,
            callerName || 'Anonymous',
            callerMobile || callerPhone || '112',
            type || incidentType || 'Medical Emergency',
            latitude || 26.7606,
            longitude || 83.3732,
            location || address || 'Gorakhpur City Centre',
            description || 'Emergency reported via SmartCity Portal',
            priority || severity || 'HIGH'
        ]);
        return result.insertId;
    }

    static async getIncidents() {
        const [rows] = await pool.query(`
            SELECT id, incident_code, type, location, latitude, longitude, description,
                   caller_name, caller_mobile, priority, status, created_at, resolved_at
            FROM emergency_incidents
            ORDER BY id DESC LIMIT 50
        `);
        return rows;
    }

    static async recordGreenWave({ ambulanceId, junctionId, targetJunctionId, distanceMeters, latitude = 26.7606, longitude = 83.3732, corridorStatus = 'ACTIVE_PREEMPTION', urgency = 'CRITICAL' }) {
        const [result] = await pool.query(`
            INSERT INTO ambulance_green_waves
            (ambulance_id, patient_urgency, current_latitude, current_longitude, target_junction_id, distance_meters, corridor_status, preemption_green_given_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            ambulanceId || 'AMB-01',
            urgency || 'CRITICAL',
            latitude,
            longitude,
            targetJunctionId || junctionId || 'JNC-GOLGHAR-01',
            distanceMeters || 180,
            corridorStatus === 'GREEN_WAVE_ENGAGED' ? 'ACTIVE_PREEMPTION' : corridorStatus
        ]);
        return result.insertId;
    }
}

module.exports = EmergencyModel;
