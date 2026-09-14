/**
 * SmartCity AI - AI Engine Routes
 * Handles citizen AI conversations, suggestions, and health status
 */

const express = require("express");
const router = express.Router();
const { processAIChat, getQuickSuggestions, getLiveCitySnapshot } = require("../services/ai_engine");

// =========================================================
// AI CONVERSATIONAL CHAT ENDPOINT
// =========================================================

router.post("/api/ai/chat", async (req, res) => {
    const { message, history } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({
            success: false,
            message: "Message string is required."
        });
    }

    try {
        const aiResponse = await processAIChat(message.trim(), history || []);
        res.json(aiResponse);
    } catch (err) {
        console.error("AI chat processing error:", err);
        res.status(500).json({
            success: false,
            message: "AI Engine encountered an unexpected error.",
            error: err.message
        });
    }
});

// =========================================================
// QUICK PROMPTS & SUGGESTIONS
// =========================================================

router.get("/api/ai/suggestions", (req, res) => {
    try {
        const suggestions = getQuickSuggestions();
        res.json({
            success: true,
            suggestions
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error loading suggestions." });
    }
});

// =========================================================
// AI ENGINE STATUS & HEALTH
// =========================================================

router.get("/api/ai/status", (req, res) => {
    const hasGeminiKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10);
    res.json({
        success: true,
        service: "SmartCity AI Engine",
        status: "OPERATIONAL",
        configuredProvider: hasGeminiKey ? "Google Gemini API" : "Gorakhpur Smart City Knowledge Engine (Offline Mode)",
        geminiKeyConfigured: hasGeminiKey,
        supportedIntents: [
            "EMERGENCY_SOS",
            "PARKING_AVAILABILITY",
            "HEALTHCARE_BEDS",
            "WATER_SUPPLY",
            "TRAFFIC_AQI",
            "CITY_TOURISM",
            "GENERAL_ASSISTANCE"
        ]
    });
});

// =========================================================
// LIVE CITY CONTEXT DEBUG ENDPOINT
// =========================================================

router.get("/api/ai/city-context", async (req, res) => {
    try {
        const snapshot = await getLiveCitySnapshot();
        res.json({
            success: true,
            city: "Gorakhpur, Uttar Pradesh",
            snapshot
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error fetching city context." });
    }
});

module.exports = router;
