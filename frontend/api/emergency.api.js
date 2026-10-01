/**
 * SMARTCITY AI - EMERGENCY & SOS API CLIENT
 */

(function () {
    const client = window.SmartCityClient;

    window.EmergencyAPI = {
        triggerSOS: (payload) => client.post("/api/emergency/sos", payload),
        getIncidents: (params) => client.get("/api/emergency/incidents", params),
        updateIncidentStatus: (id, payload) => client.put(`/api/emergency/incidents/${id}/status`, payload),
        getAmbulances: () => client.get("/api/emergency/ambulances"),
        getContacts: () => client.get("/api/emergency/contacts"),
        requestPreemption: (payload) => client.post("/api/emergency/green-wave", payload)
    };
})();
