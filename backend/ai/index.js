/**
 * SMARTCITY AI - AI ARCHITECTURE UNIFIED FACADE
 * 
 * Cleanly organizes and exports:
 * - chatbot: Bilingual Grounded Assistant
 * - tools: Allowlisted MySQL-grounded tool registry
 * - models: AI Models Catalog & Predictions Ledger
 * - predictions: Multi-horizon ML and statistical forecast engines
 * - recommendations: Multi-criteria Explainable Recommenders
 * - tourist: Verified Gorakhpur Itinerary & Landmark Guide
 */

const chatbot = require("./chatbot/chatbot_engine");
const tools = require("./tools/smartcity_tools");
const models = require("./models");
const trafficPredictor = require("./predictions/traffic/traffic_predictor");
const parkingPredictor = require("./predictions/parking/parking_predictor");
const hospitalPredictor = require("./predictions/hospital/hospital_predictor");
const wastePredictor = require("./predictions/waste/waste_predictor");
const aqiPredictor = require("./predictions/aqi/aqi_predictor");
const hospitalRecommender = require("./recommendations/hospital_recommender");
const parkingRecommender = require("./recommendations/parking_recommender");
const touristGuide = require("./tourist/tourist_guide");

module.exports = {
    chatbot,
    tools,
    models,
    predictions: {
        traffic: trafficPredictor,
        parking: parkingPredictor,
        hospital: hospitalPredictor,
        waste: wastePredictor,
        aqi: aqiPredictor
    },
    recommendations: {
        hospital: hospitalRecommender,
        parking: parkingRecommender
    },
    tourist: touristGuide
};
