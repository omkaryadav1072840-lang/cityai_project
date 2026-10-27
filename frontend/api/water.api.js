/**
 * SMARTCITY AI - SMART WATER MANAGEMENT API CLIENT
 */

(function () {
    const client = window.SmartCityClient;

    window.WaterAPI = {
        getTanks: () => client.get("/api/water/tanks"),
        getSchedules: () => client.get("/api/water/schedules"),
        getComplaints: (params) => client.get("/api/water/complaints", params),
        reportComplaint: (payload) => client.post("/api/water/complaints", payload),
        updateComplaintStatus: (id, payload) => client.put(`/api/water/reports/${id}/status`, payload),
        getTankers: () => client.get("/api/water/tanker-bookings"),
        requestTanker: (payload) => client.post("/api/water/tanker-bookings", payload),
        analyzeAnomalies: (params) => client.get("/api/ai/water/anomalies", params)
    };
})();
