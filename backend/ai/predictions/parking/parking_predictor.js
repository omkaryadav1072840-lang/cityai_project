/**
 * SMARTCITY AI - PARKING PREDICTOR
 * 
 * Predicts parking slot occupancy across multiple time horizons,
 * flags saturation risk, and evaluates dynamic surge pricing eligibility.
 */

const pool = require("../../../config/db").promise();
const parkingAIService = require("../../../services/parking_ai_service");

class ParkingPredictor {
    /**
     * Forecast occupancy for a parking lot
     * @param {Object} params
     * @param {number|string} [params.lot_id=1]
     * @returns {Promise<Object>}
     */
    static async predictLotOccupancy({ lot_id = 1 } = {}) {
        return await parkingAIService.predictOccupancy({ lot_id });
    }
}

module.exports = ParkingPredictor;
