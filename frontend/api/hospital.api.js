/**
 * SMARTCITY AI - HOSPITAL & HEALTHCARE API CLIENT
 */

(function () {
    const client = window.SmartCityClient;

    window.HospitalAPI = {
        getHospitals: () => client.get("/api/hospitals"),
        getHospitalDetails: (id) => client.get(`/api/hospitals/${id}`),
        getBedCategories: (hospitalId) => client.get("/api/hospital/bed-categories", { hospitalId }),
        getDoctors: (hospitalId, department) => client.get("/api/doctors", { hospitalId, department }),
        bookAppointment: (payload) => client.post("/api/appointments/book", payload),
        getMyAppointments: () => client.get("/api/appointments/my"),
        recommendHospital: (params) => client.get("/api/ai/hospital/recommend", params),
        forecastBedSurge: (params) => client.get("/api/ai/hospital/bed-surge", params)
    };
})();
