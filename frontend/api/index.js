/**
 * SMARTCITY AI - CENTRALIZED API CLIENT MASTER ENTRY
 * Bundles all domain sub-clients into window.SmartCityAPI.
 */

(function () {
    window.SmartCityAPI = {
        client: window.SmartCityClient,
        auth: window.AuthAPI,
        traffic: window.TrafficAPI,
        parking: window.ParkingAPI,
        hospital: window.HospitalAPI,
        waste: window.WasteAPI,
        water: window.WaterAPI,
        emergency: window.EmergencyAPI,
        police: window.PoliceAPI,
        ai: window.SmartAI_API
    };
})();
