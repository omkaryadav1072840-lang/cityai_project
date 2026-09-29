/**
 * SmartCity AI - Privacy-Conscious Client Telemetry & Analytics
 * Captures anonymous civic metrics (search counts, navigation) without storing personal identity
 */

(function () {
    const FORBIDDEN_METADATA_KEYS = ["password", "token", "jwt", "email", "phone", "mobile", "aadhaar", "address", "prescription", "disease", "diagnosis"];

    function sanitizeData(obj) {
        if (!obj || typeof obj !== "object") return {};
        const safe = {};
        for (const [k, v] of Object.entries(obj)) {
            const lowerK = k.toLowerCase();
            if (FORBIDDEN_METADATA_KEYS.some(f => lowerK.includes(f))) continue;
            if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
                safe[k] = String(v).slice(0, 100);
            }
        }
        return safe;
    }

    function canTrack() {
        // If disabled globally by admin configuration
        if (window.SMARTCITY_ANALYTICS_ENABLED === false) return false;
        // Check consent if consent manager is present
        if (window.SmartCityConsent && typeof window.SmartCityConsent.hasConsentForAnalytics === "function") {
            return window.SmartCityConsent.hasConsentForAnalytics();
        }
        return true;
    }

    async function sendEvent(eventName, metadata = {}) {
        if (!canTrack()) return;

        try {
            const payload = {
                event_name: eventName,
                page_path: window.location.pathname || "/",
                metadata: sanitizeData(metadata),
                timestamp: new Date().toISOString()
            };

            await fetch("/api/analytics/event", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(() => {});
        } catch (e) {}
    }

    // Auto-track page view on load
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            sendEvent("page_view", { title: document.title || "SmartCity AI" });
        });
    } else {
        sendEvent("page_view", { title: document.title || "SmartCity AI" });
    }

    // Expose global tracker
    window.SmartCityAnalytics = {
        track: sendEvent,
        trackHospitalSearch: (dept) => sendEvent("hospital_search", { department: dept }),
        trackParkingSearch: (area) => sendEvent("parking_search", { area: area }),
        trackTrafficSearch: (corridor) => sendEvent("traffic_search", { corridor: corridor }),
        trackAIChat: () => sendEvent("ai_chatbot_usage", { action: "prompt_sent" }),
        trackEmergencyAction: (type) => sendEvent("emergency_interaction", { type: type })
    };
})();
