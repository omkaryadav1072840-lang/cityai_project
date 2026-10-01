/**
 * SMARTCITY AI - SMART WASTE MANAGEMENT API CLIENT
 */

(function () {
    const client = window.SmartCityClient;

    window.WasteAPI = {
        getBins: () => client.get("/api/waste/bins"),
        getBinDetails: (id) => client.get(`/api/waste/bins/${id}`),
        getRequests: (params) => client.get("/api/waste/requests", params),
        createRequest: (payload) => client.post("/api/waste/requests", payload),
        updateRequestStatus: (id, payload) => client.put(`/api/waste/requests/${id}/status`, payload),
        getVehicles: () => client.get("/api/waste/vehicles"),
        predictBinFill: (params) => client.get("/api/ai/waste/predict", params),
        optimizeRoute: (payload) => client.post("/api/waste/optimize-route", payload)
    };
})();
