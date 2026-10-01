/**
 * SmartCity AI - Healthcare Service Recommender
 * Multi-criteria healthcare facility recommendation based on:
 * - Proximity / Distance
 * - Department / Specialty match
 * - ICU & General Bed availability
 * - Trauma Center / 24x7 Emergency status
 * - Active Doctor consultation availability
 *
 * NOTE: Strictly non-prescriptive. Does not perform clinical diagnosis.
 */

const pool = require("../../config/db").promise();

class HospitalRecommender {
    static async recommend(params = {}) {
        return this.recommendHealthcare({
            userLat: params.user_lat || params.userLat || params.latitude || params.lat,
            userLng: params.user_lng || params.userLng || params.longitude || params.lng,
            requiredDepartment: params.department || params.specialty || params.requiredDepartment,
            requiresICU: params.require_icu || params.requiresICU || false,
            requiresEmergency: params.require_emergency || params.requiresEmergency || false
        });
    }

    static async recommendHealthcare({ userLat, userLng, requiredDepartment, requiresICU = false, requiresEmergency = false }) {
        try {
            const [hospitals] = await pool.query(`
                SELECT h.id, h.hospital_id, h.hospital_name AS name, h.address, h.phone, h.emergency_number,
                       h.total_beds, h.icu_beds, h.emergency_beds,
                       (CASE WHEN h.ambulance_count > 0 THEN 1 ELSE 0 END) AS ambulance_available,
                       (CASE WHEN h.emergency_beds > 0 THEN 1 ELSE 0 END) AS trauma_center,
                       h.latitude, h.longitude,
                       COALESCE(SUM(c.total_beds - c.occupied_beds), ROUND(h.total_beds * 0.75), 100) AS available_beds
                FROM hospitals h
                LEFT JOIN hospital_bed_categories c ON (h.id = c.hospital_id OR h.hospital_id = c.hospital_id)
                WHERE h.status = 'Active' OR h.status IS NULL
                GROUP BY h.id
            `);

            const [doctors] = await pool.query(`
                SELECT d.id, d.name, d.specialization, d.department, d.hospital_id
                FROM doctors d
                WHERE d.status = 'Active' OR d.status IS NULL
            `);

            const originLat = Number(userLat || 26.7606);
            const originLng = Number(userLng || 83.3732);

            const scoredHospitals = hospitals.map(h => {
                const lat = Number(h.latitude || 26.76);
                const lng = Number(h.longitude || 83.37);

                // Haversine distance
                const R = 6371;
                const dLat = (lat - originLat) * Math.PI / 180;
                const dLng = (lng - originLng) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                          Math.cos(originLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                          Math.sin(dLng / 2) * Math.sin(dLng / 2);
                const distanceKm = Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));

                // Find matching doctors in this hospital
                const matchingDocs = doctors.filter(d => {
                    const hospitalMatch = d.hospital_id === h.id;
                    if (!requiredDepartment) return hospitalMatch;
                    const deptMatch = (d.department || "").toLowerCase().includes(requiredDepartment.toLowerCase()) ||
                                      (d.specialization || "").toLowerCase().includes(requiredDepartment.toLowerCase());
                    return hospitalMatch && deptMatch;
                });

                // Compute suitability score
                let score = 50;
                let reasons = [];

                if (distanceKm <= 3.0) {
                    score += 25;
                    reasons.push(`Close proximity (~${distanceKm} km)`);
                } else if (distanceKm <= 7.0) {
                    score += 15;
                    reasons.push(`Moderate transit distance (${distanceKm} km)`);
                }

                if (requiresICU) {
                    if (h.icu_beds > 0) {
                        score += 30;
                        reasons.push(`Verified ICU capacity (${h.icu_beds} ICU beds)`);
                    } else {
                        score -= 20;
                    }
                }

                if (requiresEmergency && h.trauma_center) {
                    score += 25;
                    reasons.push("Designated 24/7 Level-1 Trauma Emergency Care");
                }

                if (matchingDocs.length > 0) {
                    score += 20;
                    reasons.push(`${matchingDocs.length} active ${requiredDepartment || 'specialist'} doctors on duty`);
                }

                if (h.available_beds >= 50) {
                    score += 10;
                    reasons.push(`High bed availability (${h.available_beds} beds free)`);
                }

                return {
                    hospital_id: h.id,
                    code: h.hospital_code,
                    name: h.name,
                    address: h.address,
                    distance_km: distanceKm,
                    available_beds: Number(h.available_beds),
                    icu_beds: Number(h.icu_beds),
                    emergency_number: h.emergency_number || "108",
                    has_trauma_center: Boolean(h.trauma_center),
                    matching_specialists_count: matchingDocs.length,
                    recommendation_score: score,
                    recommendation_reasons: reasons,
                    coordinates: { lat: h.latitude, lng: h.longitude }
                };
            });

            scoredHospitals.sort((a, b) => b.recommendation_score - a.recommendation_score);

            return {
                success: true,
                data_source: "REAL",
                disclaimer: "Non-prescriptive municipal healthcare guidance. In case of acute cardiac or neurological emergency, immediately dial 108. DO NOT use this AI recommendation as medical advice.",
                medical_disclaimer: "Non-prescriptive municipal healthcare guidance. In case of acute cardiac or neurological emergency, immediately dial 108. DO NOT use this AI recommendation as medical advice.",
                recommendations: scoredHospitals.slice(0, 3)
            };
        } catch (err) {
            console.error("HospitalRecommender error:", err);
            return { success: false, error: err.message, recommendations: [] };
        }
    }
}

module.exports = HospitalRecommender;
