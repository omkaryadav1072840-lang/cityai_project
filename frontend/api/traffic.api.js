/**
 * SMARTCITY AI - TRAFFIC API CLIENT
 */

(function () {
    const client = window.SmartCityClient;

    window.TrafficAPI = {
        getJunctions: () => client.get("/api/traffic/junctions"),
        getSignals: () => client.get("/api/traffic/signals"),
        getCameras: () => client.get("/api/traffic/cameras"),
        getViolations: (params) => client.get("/api/traffic/violations", params),
        getEChallans: (vehicleNumber) => client.get("/api/traffic/echallan", { vehicle_number: vehicleNumber }),
        getDashboardMetrics: () => client.get("/api/traffic/dashboard-metrics"),
        overrideSignal: (id, payload) => client.post(`/api/traffic/signals/${id}/override`, payload),
        predictTraffic: (params) => client.get("/api/ai/traffic/predict", params),
        optimizeSignal: (payload) => client.post("/api/traffic/optimize-signal", payload)
    };
})();
