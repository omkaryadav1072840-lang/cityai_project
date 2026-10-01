/**
 * SMARTCITY AI - PARKING API CLIENT
 */

(function () {
    const client = window.SmartCityClient;

    window.ParkingAPI = {
        getLots: () => client.get("/api/parking/lots"),
        getLotDetails: (id) => client.get(`/api/parking/lots/${id}`),
        getSlots: (lotId, status) => client.get("/api/parking/slots", { lot_id: lotId, status }),
        bookSlot: (bookingData) => client.post("/api/parking/book", bookingData),
        getMyBookings: () => client.get("/api/parking/my-bookings"),
        cancelBooking: (id) => client.post(`/api/parking/cancel/${id}`),
        verifyEntry: (verificationData) => client.post("/api/parking/verify-entry", verificationData),
        recommendParking: (params) => client.get("/api/ai/parking/recommend", params),
        forecastOccupancy: (params) => client.get("/api/ai/parking/forecast", params)
    };
})();
