/**
 * SmartCity AI - Parking Recommendation Engine
 * Multi-criteria parking recommendation based on:
 * - Available slots
 * - Price per hour
 * - Occupancy level
 * - Distance to destination
 * - Estimated travel time
 * Returns explainable recommendations based on real MySQL data.
 */

const pool = require("../../config/db").promise();

class ParkingRecommender {
    static async recommend(params = {}) {
        return this.recommendParking({
            destination: params.destination || params.preferred_area || params.area,
            destinationLat: params.destinationLat || params.user_lat || params.userLat || params.latitude || params.lat,
            destinationLng: params.destinationLng || params.user_lng || params.userLng || params.longitude || params.lng,
            vehicleType: params.vehicleType || params.vehicle_type || '4-wheeler',
            maxWalkingMins: params.maxWalkingMins || 15
        });
    }

    static async recommendParking({ destination, destinationLat, destinationLng, vehicleType = '4-wheeler', maxWalkingMins = 15 }) {
        try {
            const [lots] = await pool.query(`
                SELECT id, parking_code, name, address, area, total_slots,
                       available_slots, occupied_slots, hourly_rate, status,
                       latitude, longitude
                FROM parking_lots
                WHERE active = 1 AND available_slots > 0
            `);

            if (lots.length === 0) {
                return {
                    success: false,
                    data_source: "REAL",
                    message: "All verified parking lots are currently at full occupancy.",
                    recommendations: []
                };
            }

            const destLat = Number(destinationLat || 26.7606);
            const destLng = Number(destinationLng || 83.3732);

            const scoredLots = lots.map(lot => {
                const lat = Number(lot.latitude || 26.76);
                const lng = Number(lot.longitude || 83.37);

                // Haversine distance in km
                const R = 6371;
                const dLat = (lat - destLat) * Math.PI / 180;
                const dLng = (lng - destLng) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                          Math.cos(destLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                          Math.sin(dLng / 2) * Math.sin(dLng / 2);
                const distanceKm = Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
                const walkingMins = Math.round(distanceKm * 12);
                const occupancyPct = Math.round((lot.occupied_slots / Math.max(1, lot.total_slots)) * 100);

                // Multi-criteria score (higher is better)
                // Weights: 40% slots availability, 30% proximity, 20% price, 10% low occupancy
                const slotScore = Math.min(100, (lot.available_slots / lot.total_slots) * 100);
                const distScore = Math.max(0, 100 - (distanceKm * 20));
                const priceScore = Math.max(0, 100 - (Number(lot.hourly_rate || 20) * 2));
                const compositeScore = Math.round((slotScore * 0.4) + (distScore * 0.3) + (priceScore * 0.2) + ((100 - occupancyPct) * 0.1));

                let explanation = "";
                if (distanceKm <= 1.0 && lot.available_slots >= 10) {
                    explanation = `Closest to destination (~${walkingMins} mins walk) with ample vacancies (${lot.available_slots} slots).`;
                } else if (lot.hourly_rate <= 15) {
                    explanation = `Most economical option at ₹${lot.hourly_rate}/hr, located ${distanceKm} km away.`;
                } else {
                    explanation = `Balanced choice with ${lot.available_slots} slots available and low occupancy (${occupancyPct}%).`;
                }

                return {
                    lot_id: lot.id,
                    code: lot.parking_code,
                    name: lot.name,
                    address: lot.address,
                    available_slots: lot.available_slots,
                    hourly_rate: Number(lot.hourly_rate),
                    distance_km: distanceKm,
                    estimated_walk_mins: walkingMins,
                    occupancy_pct: occupancyPct,
                    composite_score: compositeScore,
                    score: compositeScore,
                    recommendation_reason: explanation,
                    reasons: [explanation],
                    coordinates: { lat: lot.latitude, lng: lot.longitude }
                };
            });

            // Sort by composite score descending
            scoredLots.sort((a, b) => b.composite_score - a.composite_score);

            return {
                success: true,
                data_source: "REAL",
                target_destination: destination || "Gorakhpur City Centre",
                recommendations: scoredLots.slice(0, 4)
            };
        } catch (err) {
            console.error("ParkingRecommender error:", err);
            return { success: false, error: err.message, recommendations: [] };
        }
    }
}

module.exports = ParkingRecommender;
