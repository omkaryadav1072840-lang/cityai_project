/**
 * SMARTCITY AI - ARTIFICIAL INTELLIGENCE API CLIENT
 */

(function () {
    const client = window.SmartCityClient;

    window.SmartAI_API = {
        chat: (message, sessionId = null) => client.post("/api/ai/chat", { message, session_id: sessionId }),
        callTool: (tool, parameters = {}, sessionId = null) => client.post("/api/ai/tool-call", { tool, parameters, session_id: sessionId }),
        getModelsHealth: () => client.get("/api/ai/models/health"),
        getPredictions: (params) => client.get("/api/ai/predictions", params),
        submitFeedback: (predictionId, feedback) => client.post(`/api/ai/predictions/${predictionId}/feedback`, feedback),
        getExplainability: (predictionId) => client.get(`/api/ai/explainability/${predictionId}`),
        getTouristAttractions: (params) => client.get("/api/ai/tourist/attractions", params),
        getItinerary: (params) => client.get("/api/ai/tourist/itinerary", params),
        predictAQI: (params) => client.get("/api/environment/aqi-forecast", params)
    };
})();
