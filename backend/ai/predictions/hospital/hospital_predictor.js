/**
 * SMARTCITY AI - HOSPITAL BED SURGE PREDICTOR
 * 
 * Forecasts hospital bed occupancy, ICU demand, and OPD waiting times.
 * STRICT DISCLAIMER: This predictor is strictly for resource and operational
 * planning; it NEVER diagnoses patients or offers clinical guidance.
 */

const pool = require("../../../config/db").promise();
const healthcareAIService = require("../../../services/healthcare_ai_service");

class HospitalPredictor {
    /**
     * Forecast bed surge and operational capacity
     * @param {Object} params
     * @param {string|number} [params.hospital_id="HOSP-01"]
     * @returns {Promise<Object>}
     */
    static async forecastBedSurge({ hospital_id = "HOSP-01" } = {}) {
        return await healthcareAIService.forecastBedSurge({ hospital_id });
    }
}

module.exports = HospitalPredictor;
