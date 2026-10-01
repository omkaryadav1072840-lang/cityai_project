/**
 * SMARTCITY AI - POLICE & CIVIC SAFETY API CLIENT
 */

(function () {
    const client = window.SmartCityClient;

    window.PoliceAPI = {
        getStations: () => client.get("/api/police/stations"),
        getComplaints: (params) => client.get("/api/police/complaints", params),
        fileComplaint: (payload) => client.post("/api/police/complaints", payload),
        updateComplaintStatus: (id, payload) => client.put(`/api/police/complaints/${id}/status`, payload),
        getEmergencyContacts: () => client.get("/api/police/emergency-contacts"),
        getPatrolUnits: () => client.get("/api/police/patrols")
    };
})();
