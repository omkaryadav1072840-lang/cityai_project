/**
 * SmartCity AI - Artificial Intelligence Controller
 * Mediates between AI routes, services, and models.
 */

const aiOrchestrator = require("../services/ai_orchestrator");
const groundedTools = require("../services/grounded_tools");
const modelMonitoringService = require("../services/model_monitoring_service");
const AIModel = require("../models/ai.model");
const { apiSuccess, apiError } = require("../utils/response");

class AIController {
    static async chat(req, res) {
        try {
            const message = req.body.message || req.body.question || req.body.query || "";
            const sessionId = req.body.session_id || req.body.sessionId || "sess-" + Date.now();
            const user = req.user || null;

            if (!message || message.trim().length === 0) {
                return apiError(res, "Message or query text is required.", 400, "VALIDATION_FAILED");
            }

            const response = await aiOrchestrator.processQuery(message, sessionId, user);

            return apiSuccess(res, response, "AI query processed successfully.", 200, {
                reply: response.reply,
                prediction_id: response.prediction_id,
                data_source: response.data_source,
                tool_executed: response.tool_executed,
                confidence: response.confidence,
                suggested_actions: response.suggested_actions
            });
        } catch (err) {
            console.error("AIController.chat error:", err);
            return apiError(res, "Failed to process AI chat query.", 500, "AI_ERROR", err.message);
        }
    }

    static async executeTool(req, res) {
        try {
            const toolName = req.params.tool || req.body.tool;
            const params = req.body.parameters || req.body.params || req.body;

            if (!toolName || typeof groundedTools[toolName] !== "function") {
                return apiError(res, `Allowlisted tool '${toolName}' not found.`, 404, "TOOL_NOT_FOUND");
            }

            const result = await groundedTools[toolName](params);
            return apiSuccess(res, result, `Tool '${toolName}' executed successfully.`, 200, {
                tool: toolName,
                data_source: result.data_source || "REAL"
            });
        } catch (err) {
            console.error("AIController.executeTool error:", err);
            return apiError(res, "Tool execution failed.", 500, "TOOL_ERROR", err.message);
        }
    }

    static async getModelsHealth(req, res) {
        try {
            const healthReport = await modelMonitoringService.generateModelHealthReport();
            return apiSuccess(res, healthReport, "AI Models catalog and health status retrieved.", 200, {
                models: healthReport.models,
                overall_status: healthReport.overall_status
            });
        } catch (err) {
            console.error("AIController.getModelsHealth error:", err);
            return apiError(res, "Failed to retrieve model health.", 500, "AI_MONITOR_ERROR", err.message);
        }
    }

    static async getPredictions(req, res) {
        try {
            const moduleFilter = req.query.module || null;
            const limit = Number(req.query.limit || 50);
            const predictions = await AIModel.getPredictions(moduleFilter, limit);
            return apiSuccess(res, predictions, "AI predictions ledger retrieved.", 200, {
                count: predictions.length,
                predictions: predictions
            });
        } catch (err) {
            console.error("AIController.getPredictions error:", err);
            return apiError(res, "Failed to retrieve predictions ledger.", 500, "DB_ERROR", err.message);
        }
    }

    static async submitFeedback(req, res) {
        try {
            const predictionId = req.params.id || req.body.prediction_id;
            const { module, model_name, modelName, predicted_value, actual_value, accuracy_score, comments } = req.body;

            await AIModel.recordFeedback({
                predictionId,
                module: module || "general",
                modelName: modelName || model_name || "general-v2.0",
                predictedValue: predicted_value || "",
                actualValue: actual_value || "",
                accuracyScore: accuracy_score || 1.0,
                feedbackType: "STAFF_REVIEW",
                submittedBy: req.user ? (req.user.name || req.user.username) : "staff_reviewer",
                comments
            });

            return apiSuccess(res, { predictionId }, "Feedback recorded for model continuous improvement.", 200);
        } catch (err) {
            console.error("AIController.submitFeedback error:", err);
            return apiError(res, "Failed to submit feedback.", 500, "FEEDBACK_ERROR", err.message);
        }
    }

    static async explainPrediction(req, res) {
        try {
            const predictionId = req.params.prediction_id || req.params.id;
            const explanation = await modelMonitoringService.getPredictionExplainability(predictionId);
            return apiSuccess(res, explanation, "Model prediction explainability breakdown retrieved.", 200, {
                explanation: explanation
            });
        } catch (err) {
            console.error("AIController.explainPrediction error:", err);
            return apiError(res, "Failed to generate prediction explanation.", 500, "XAI_ERROR", err.message);
        }
    }

    static async predictTraffic(req, res) {
        try {
            const trafficPredictor = require("../ai/predictions/traffic/traffic_predictor");
            const params = { ...(req.query || {}), ...(req.body || {}) };
            const result = await trafficPredictor.predictTraffic({
                junction_id: params.junction_id || "JNC-01",
                horizon_minutes: Number(params.horizon_minutes || params.horizon || 15),
                vehicle_count: params.vehicle_count ? Number(params.vehicle_count) : null,
                avg_speed_kmh: params.avg_speed_kmh ? Number(params.avg_speed_kmh) : null,
                weather: params.weather || "CLEAR"
            });
            return apiSuccess(res, result, "Traffic prediction generated successfully.", 200);
        } catch (err) {
            console.error("AIController.predictTraffic error:", err);
            return apiError(res, "Failed to generate traffic prediction.", 500, "AI_TRAFFIC_ERROR", err.message);
        }
    }

    static async predictWaste(req, res) {
        try {
            const wastePredictor = require("../ai/predictions/waste/waste_predictor");
            const params = { ...(req.query || {}), ...(req.body || {}) };
            const result = await wastePredictor.predictBinOverflow({
                bin_id: params.bin_id ? Number(params.bin_id) : null,
                bin_code: params.bin_code || null,
                ward: params.ward || null
            });
            return apiSuccess(res, result, "Waste overflow prediction generated successfully.", 200);
        } catch (err) {
            console.error("AIController.predictWaste error:", err);
            return apiError(res, "Failed to generate waste prediction.", 500, "AI_WASTE_ERROR", err.message);
        }
    }

    static async predictAQI(req, res) {
        try {
            const aqiPredictor = require("../ai/predictions/aqi/aqi_predictor");
            const params = { ...(req.query || {}), ...(req.body || {}) };
            const result = await aqiPredictor.predictAQI({
                station_code: params.station_code || "AQI-01",
                locality: params.locality || null
            });
            return apiSuccess(res, result, "AQI environmental prediction generated successfully.", 200);
        } catch (err) {
            console.error("AIController.predictAQI error:", err);
            return apiError(res, "Failed to generate AQI prediction.", 500, "AI_AQI_ERROR", err.message);
        }
    }

    static async recommendParking(req, res) {
        try {
            const parkingRecommender = require("../ai/recommendations/parking_recommender");
            const params = { ...(req.query || {}), ...(req.body || {}) };
            const result = await parkingRecommender.recommend({
                user_lat: params.latitude || params.lat,
                user_lng: params.longitude || params.lng,
                vehicle_type: params.vehicle_type,
                max_price: params.max_price,
                preferred_area: params.preferred_area || params.area
            });
            return apiSuccess(res, result, "Parking recommendations generated.", 200);
        } catch (err) {
            console.error("AIController.recommendParking error:", err);
            return apiError(res, "Failed to generate parking recommendations.", 500, "AI_PARKING_ERROR", err.message);
        }
    }

    static async recommendHospital(req, res) {
        try {
            const hospitalRecommender = require("../ai/recommendations/hospital_recommender");
            const params = { ...(req.query || {}), ...(req.body || {}) };
            const result = await hospitalRecommender.recommend({
                user_lat: params.latitude || params.lat,
                user_lng: params.longitude || params.lng,
                department: params.department || params.specialty,
                require_icu: params.require_icu === "true" || params.require_icu === true,
                require_emergency: params.require_emergency === "true" || params.require_emergency === true
            });
            return apiSuccess(res, result, "Hospital recommendations generated.", 200);
        } catch (err) {
            console.error("AIController.recommendHospital error:", err);
            return apiError(res, "Failed to generate hospital recommendations.", 500, "AI_HOSPITAL_ERROR", err.message);
        }
    }

    static async getTouristGuide(req, res) {
        try {
            const touristGuide = require("../ai/tourist/tourist_guide");
            const category = req.query.category || null;
            const attractions = await touristGuide.getAttractions({ category });
            return apiSuccess(res, attractions, "Verified Gorakhpur tourist attractions retrieved.", 200, {
                count: attractions.length,
                attractions
            });
        } catch (err) {
            console.error("AIController.getTouristGuide error:", err);
            return apiError(res, "Failed to retrieve tourist guide.", 500, "AI_TOURIST_ERROR", err.message);
        }
    }

    static async generateItinerary(req, res) {
        try {
            const touristGuide = require("../ai/tourist/tourist_guide");
            const theme = (req.query && req.query.theme) || (req.body && req.body.theme) || "Heritage & Culture";
            const itinerary = await touristGuide.generateOneDayItinerary({ theme });
            return apiSuccess(res, itinerary, "1-day Gorakhpur itinerary generated successfully.", 200);
        } catch (err) {
            console.error("AIController.generateItinerary error:", err);
            return apiError(res, "Failed to generate itinerary.", 500, "AI_TOURIST_ERROR", err.message);
        }
    }
}

module.exports = AIController;
