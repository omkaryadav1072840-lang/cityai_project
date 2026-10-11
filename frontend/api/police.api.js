/**
 * SMARTCITY AI - POLICE & CIVIC SAFETY API CLIENT
 */

(function () {
    const client = window.SmartCityClient || {
        get: async (url, params) => {
            const query = params ? "?" + new URLSearchParams(params).toString() : "";
            const res = await fetch(url + query);
            return res.json();
        },
        post: async (url, body) => {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            return res.json();
        },
        put: async (url, body) => {
            const res = await fetch(url, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            return res.json();
        }
    };

    window.PoliceAPI = {
        getStations: () => client.get("/api/police/stations"),
        getStats: () => client.get("/api/police/stats"),
        getComplaints: (params) => client.get("/api/police/complaints", params),
        trackComplaint: (ref) => client.get("/api/police/complaints/track/" + encodeURIComponent(ref)),
        fileComplaint: (payload) => client.post("/api/police/complaint", payload),
        updateComplaintStatus: (id, payload) => client.put(`/api/police/complaints/${id}/status`, payload),
        getEmergencyContacts: () => client.get("/api/police/emergency-contacts"),
        triggerEmergencySOS: (payload) => client.post("/api/police/emergency-sos", payload),
        getPrvUnits: () => client.get("/api/police/prv-units"),
        registerSafeRide: (payload) => client.post("/api/police/safe-ride", payload),
        getSafeRides: () => client.get("/api/police/safe-rides"),
        reportCyberFreeze: (payload) => client.post("/api/police/cyber-freeze", payload),
        searchHotlist: (q) => client.get("/api/police/hotlist-search?q=" + encodeURIComponent(q)),
        submitVerification: (payload) => client.post("/api/police/verification-request", payload),
        getVerifications: (q) => client.get("/api/police/verifications" + (q ? "?query=" + encodeURIComponent(q) : ""))
    };
})();
