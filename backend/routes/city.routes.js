const express = require("express");
const router = express.Router();

// =========================================================
// TEST BACKEND
// =========================================================

router.get("/", (req, res) => {
    res.json({
        message: "SmartCity AI Backend is running"
    });
});

// =========================================================
// CITY STATUS
// =========================================================

router.get("/api/city-status", (req, res) => {
    res.json({
        traffic: "Moderate",
        aqi: 82,
        ambulances: 12,
        temperature: 31,
        hospitals: 8
    });
});

module.exports = router;
