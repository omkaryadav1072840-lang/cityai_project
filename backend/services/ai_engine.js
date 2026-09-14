/**
 * SmartCity AI - Master AI Assistant & City Grounding Engine
 * Supports Google Gemini API (gemini-1.5-flash) with live MySQL city data grounding,
 * alongside a high-fidelity Gorakhpur Smart City Knowledge & Intent Engine fallback.
 */

const https = require("https");
const db = require("../config/db");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

/**
 * Fetch snapshot of live city database to ground the AI in real-time reality
 */
async function getLiveCitySnapshot() {
    return new Promise((resolve) => {
        const snapshot = {
            parking: [],
            emergencyDepts: [],
            ambulances: { total: 0, available: 0 },
            waterTanks: [],
            cityStatus: { traffic: "Moderate", aqi: 128, temperature: "31°C" }
        };

        // Query parking lots
        db.query(
            "SELECT parking_code, name, address, total_slots, available_slots, hourly_rate, status FROM parking_lots WHERE active = 1",
            (pErr, pRows) => {
                if (!pErr && pRows) {
                    snapshot.parking = pRows.map(p => ({
                        code: p.parking_code,
                        name: p.name,
                        available: p.available_slots,
                        total: p.total_slots,
                        rate: `₹${p.hourly_rate}/hr`,
                        status: p.status
                    }));
                }

                // Query emergency departments
                db.query(
                    "SELECT hospital_name, emergency_number, available_doctors, available_beds, ambulances_available, status FROM emergency_departments",
                    (eErr, eRows) => {
                        if (!eErr && eRows) {
                            snapshot.emergencyDepts = eRows.map(e => ({
                                hospital: e.hospital_name,
                                phone: e.emergency_number,
                                beds: e.available_beds,
                                doctors: e.available_doctors,
                                status: e.status
                            }));
                        }

                        // Query ambulances
                        db.query(
                            "SELECT status FROM ambulances",
                            (aErr, aRows) => {
                                if (!aErr && aRows) {
                                    snapshot.ambulances.total = aRows.length;
                                    snapshot.ambulances.available = aRows.filter(a => (a.status || "").toLowerCase() === "available").length;
                                }

                                // Query water tanks
                                db.query(
                                    "SELECT tank_id, name, zone, current_level_percent, status FROM water_tanks",
                                    (wErr, wRows) => {
                                        if (!wErr && wRows) {
                                            snapshot.waterTanks = wRows.map(w => ({
                                                tank: w.name,
                                                zone: w.zone,
                                                level: `${w.current_level_percent}%`,
                                                status: w.status
                                            }));
                                        }

                                        resolve(snapshot);
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    });
}

/**
 * Make an HTTPS POST request to Google Gemini API
 */
function callGeminiAPI(systemPrompt, userPrompt, history = []) {
    return new Promise((resolve, reject) => {
        if (!GEMINI_API_KEY) {
            return reject(new Error("No GEMINI_API_KEY configured"));
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

        // Build contents array with conversation history
        const contents = [];

        // Insert conversation history if available
        if (Array.isArray(history) && history.length > 0) {
            history.slice(-6).forEach(msg => {
                contents.push({
                    role: msg.sender === "user" ? "user" : "model",
                    parts: [{ text: msg.text || "" }]
                });
            });
        }

        // Add current user prompt
        contents.push({
            role: "user",
            parts: [{ text: userPrompt }]
        });

        const requestBody = JSON.stringify({
            contents: contents,
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 600
            }
        });

        const req = https.request(
            url,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(requestBody)
                },
                timeout: 10000
            },
            (res) => {
                let data = "";
                res.on("data", chunk => data += chunk);
                res.on("end", () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (res.statusCode >= 400 || parsed.error) {
                            return reject(new Error((parsed.error && parsed.error.message) || `Gemini API HTTP ${res.statusCode}`));
                        }

                        const text = parsed.candidates &&
                                     parsed.candidates[0] &&
                                     parsed.candidates[0].content &&
                                     parsed.candidates[0].content.parts &&
                                     parsed.candidates[0].content.parts[0] &&
                                     parsed.candidates[0].content.parts[0].text;

                        if (!text) {
                            return reject(new Error("Empty response from Gemini"));
                        }

                        resolve(text.trim());
                    } catch (err) {
                        reject(err);
                    }
                });
            }
        );

        req.on("error", reject);
        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Gemini API call timed out"));
        });

        req.write(requestBody);
        req.end();
    });
}

/**
 * Intelligent Gorakhpur Smart City Knowledge Engine (Offline / Fallback)
 * Analyzes citizen query with contextual intent matching and live DB data.
 */
function handleLocalKnowledgeEngine(message, liveData) {
    const text = (message || "").toLowerCase().trim();

    // 1. EMERGENCY & SOS INTENT
    if (
        text.includes("help") || text.includes("emergency") || text.includes("accident") ||
        text.includes("sos") || text.includes("ambulance") || text.includes("fire") ||
        text.includes("police") || text.includes("danger") || text.includes("heart attack") ||
        text.includes("collapsed") || text.includes("bleeding") || text.includes("trauma")
    ) {
        const availableAmbs = liveData.ambulances.available;
        const traumaDepts = liveData.emergencyDepts.map(d => `${d.hospital}: 📞 ${d.phone} (${d.beds} emergency beds free)`).join("\n• ");

        return {
            intent: "EMERGENCY",
            reply: `🚨 **EMERGENCY ASSISTANCE INITIATED**\n\nIf someone is in critical danger, please remain calm. Emergency response units in Gorakhpur are ready to assist:\n\n• **National Emergency Helpline:** 📞 112\n• **Direct Ambulance Dispatch:** 📞 108\n• **Currently Available Ambulances:** ${availableAmbs} units active\n\n**Trauma & Hospital Emergency Centers:**\n• ${traumaDepts}\n\n*Click below to trigger a live SOS dispatch with your exact GPS location.*`,
            actions: [
                { label: "🚨 Trigger Live SOS Dispatch", action: "trigger_sos", type: "danger" },
                { label: "📞 Call Ambulance (108)", action: "call", value: "108", type: "primary" },
                { label: "🏥 View Hospitals on Map", action: "navigate", url: "/pages/emergency/emergency.html", type: "secondary" }
            ],
            suggestedQuestions: [
                "Track moving ambulances",
                "Find nearest hospital with ICU beds",
                "Where is the nearest police station?"
            ]
        };
    }

    // 2. PARKING AVAILABILITY INTENT
    if (text.includes("park") || text.includes("car") || text.includes("vehicle") || text.includes("slot")) {
        const lotSummary = liveData.parking.map(p =>
            `• **${p.name}** (${p.code}): **${p.available} / ${p.total} vacant** (${p.rate}, Status: ${p.status})`
        ).join("\n");

        return {
            intent: "PARKING",
            reply: `🅿️ **Live Parking Availability in Gorakhpur**\n\nHere is the real-time slot occupancy across city smart parking lots:\n\n${lotSummary}\n\nAll lots include active CCTV surveillance and automated ticketing. Would you like to reserve a parking spot now?`,
            actions: [
                { label: "🅿️ Open Smart Parking Page", action: "navigate", url: "/pages/parking/parking.html", type: "primary" },
                { label: "📍 View Lots on Map", action: "navigate", url: "/pages/traffic/traffic.html", type: "secondary" }
            ],
            suggestedQuestions: [
                "Is Railway Station parking full?",
                "Parking charges at Golghar",
                "How to book a parking slot?"
            ]
        };
    }

    // 3. HOSPITALS, DOCTORS & BEDS INTENT
    if (
        text.includes("hospital") || text.includes("doctor") || text.includes("bed") ||
        text.includes("medical") || text.includes("aiims") || text.includes("brd") ||
        text.includes("opd") || text.includes("medicine") || text.includes("pharmacy")
    ) {
        const bedInfo = liveData.emergencyDepts.map(h =>
            `• **${h.hospital}**: ${h.beds} free beds, ${h.doctors} doctors on duty (Helpline: ${h.phone})`
        ).join("\n");

        return {
            intent: "HEALTHCARE",
            reply: `🏥 **Gorakhpur Healthcare & Bed Directory**\n\nHere is the current live hospital emergency and trauma bed availability:\n\n${bedInfo}\n\n• **AIIMS Gorakhpur**: Super-speciality OPD & Cardiology, Kunraghat\n• **BRD Medical College**: 24x7 Level-1 Trauma, Medical Road\n• **District Hospital Gorakhpur**: General Emergency & Pediatric care\n\nYou can book doctor appointments and view live pharmacy stocks on our healthcare portal.`,
            actions: [
                { label: "🩺 Book Doctor Appointment", action: "navigate", url: "/pages/hospital/hospital.html", type: "primary" },
                { label: "💊 Browse 24/7 Pharmacy", action: "navigate", url: "/pages/hospital/hospital.html", type: "secondary" },
                { label: "🚑 Ambulance Tracking", action: "navigate", url: "/pages/emergency/emergency.html", type: "secondary" }
            ],
            suggestedQuestions: [
                "Find cardiologist at AIIMS",
                "Check emergency beds at BRD Medical College",
                "Order medicines online"
            ]
        };
    }

    // 4. WATER SUPPLY & TANKS INTENT
    if (text.includes("water") || text.includes("tank") || text.includes("leak") || text.includes("tanker") || text.includes("supply")) {
        const tankInfo = liveData.waterTanks.map(t =>
            `• **${t.tank}** (${t.zone}): Water Level **${t.level}** (Status: ${t.status})`
        ).join("\n");

        return {
            intent: "WATER_SUPPLY",
            reply: `💧 **Municipal Water Supply & Tank Telemetry**\n\nCurrent water reservoir levels monitored across Gorakhpur city zones:\n\n${tankInfo}\n\n• **Regular Supply Windows**: 06:00 AM – 09:00 AM and 05:00 PM – 08:00 PM\n• Need emergency water tankers or wish to report pipe leakages / contaminated supply? You can file a citizen complaint instantly.`,
            actions: [
                { label: "💧 Water Portal & Tanker Booking", action: "navigate", url: "/pages/water/water.html", type: "primary" },
                { label: "📝 Report Water Issue", action: "navigate", url: "/pages/water/water.html#reportSection", type: "secondary" }
            ],
            suggestedQuestions: [
                "Book emergency water tanker",
                "Water supply timings for Golghar",
                "Report pipeline leakage"
            ]
        };
    }

    // 5. TRAFFIC & AQI INTENT
    if (text.includes("traffic") || text.includes("aqi") || text.includes("pollution") || text.includes("route") || text.includes("jam")) {
        return {
            intent: "TRAFFIC",
            reply: `🚦 **Gorakhpur Live Traffic & Air Quality**\n\n• **Current Traffic Flow:** Moderate (Normal flow on Medical Road & Mohaddipur)\n• **Air Quality Index (AQI):** ${liveData.cityStatus.aqi} (Moderate — Sensitive individuals should wear masks outdoors)\n• **Temperature:** ${liveData.cityStatus.temperature} (Partly cloudy with light breeze)\n• **Active Green Corridors:** Emergency corridors operational between Golghar and AIIMS.\n\nCheck our interactive traffic map for live congestion heatmaps and GPS navigation.`,
            actions: [
                { label: "🗺️ Open Live Traffic Map", action: "navigate", url: "/pages/traffic/traffic.html", type: "primary" }
            ],
            suggestedQuestions: [
                "Fastest route to AIIMS Gorakhpur",
                "Is there a traffic jam on Medical Road?",
                "Air quality forecast for today"
            ]
        };
    }

    // 6. GORAKHPUR TOURISM & CITY GUIDE INTENT
    if (
        text.includes("temple") || text.includes("gorakhnath") || text.includes("lake") ||
        text.includes("ramgarh") || text.includes("visit") || text.includes("tourist") ||
        text.includes("about gorakhpur") || text.includes("places")
    ) {
        return {
            intent: "CITY_GUIDE",
            reply: `🏛️ **Gorakhpur City Highlights & Attractions**\n\nWelcome to Gorakhpur, the spiritual and cultural hub of eastern Uttar Pradesh!\n\n1. **Gorakhnath Mandir:** Sacred temple dedicated to Guru Gorakhnath. Temple gates open daily 04:00 AM – 10:00 PM. Known for the grand Khichdi Mela.\n2. **Ramgarh Tal Lake:** Picturesque 1,800-acre natural lake with musical fountains, boating, cruise rides, and evening waterfront promenade.\n3. **Gorakhpur Junction:** Historic railway hub, formerly featuring the world's longest platform (1,366m).\n4. **Gita Press:** World's largest publisher of sacred Hindu texts (founded 1923), located in Gita Press Road.\n5. **Veer Bahadur Singh Planetarium:** Dome astronomy shows daily at 1:00 PM, 3:00 PM, and 5:00 PM.`,
            actions: [
                { label: "🗺️ View City Map", action: "navigate", url: "#cityMap", type: "primary" }
            ],
            suggestedQuestions: [
                "Find parking near Gorakhnath Mandir",
                "How to reach Ramgarh Tal Lake?",
                "Gorakhpur police emergency contacts"
            ]
        };
    }

    // 7. DEFAULT HELPFUL SMART CITY RESPONSE
    return {
        intent: "GENERAL_ASSISTANCE",
        reply: `👋 Hello! I am your **Smart City AI Assistant** for Gorakhpur.\n\nI can help you with live city operations and services:\n\n• 🚨 **Emergency:** Ambulance dispatch, trauma centers, 108/112 helplines\n• 🅿️ **Smart Parking:** Real-time vacant slots at Railway Station, Golghar, AIIMS, and Medical College\n• 🏥 **Healthcare:** Hospital ICU/emergency bed counts, doctor appointments, pharmacy search\n• 💧 **Water Supply:** Tank water levels, supply timings, and tanker bookings\n• 🚦 **Traffic & AQI:** Live congestion updates and air quality reports\n\nHow may I assist you today?`,
        actions: [
            { label: "🅿️ Check Parking", action: "navigate", url: "/pages/parking/parking.html", type: "secondary" },
            { label: "🏥 Find Hospitals", action: "navigate", url: "/pages/hospital/hospital.html", type: "secondary" },
            { label: "🚨 Emergency SOS", action: "navigate", url: "/pages/emergency/emergency.html", type: "danger" }
        ],
        suggestedQuestions: [
            "Find vacant parking near Golghar",
            "Emergency ambulance numbers",
            "Check hospital bed availability",
            "Current traffic condition in Gorakhpur"
        ]
    };
}

/**
 * Main AI query processor
 * @param {string} userMessage Citizen query
 * @param {Array} history Conversation history
 */
async function processAIChat(userMessage, history = []) {
    const startTime = Date.now();
    const liveData = await getLiveCitySnapshot();

    // Check if query is an emergency
    const lower = (userMessage || "").toLowerCase();
    const isEmergency = lower.includes("help") || lower.includes("accident") || lower.includes("sos") || lower.includes("collapsed");

    // If configured with Gemini API key, try Google Gemini with ground-truth system prompt
    if (GEMINI_API_KEY && GEMINI_API_KEY.trim().length > 10) {
        try {
            const systemPrompt = `You are the official Smart City AI Officer for Gorakhpur, Uttar Pradesh, India.
You provide accurate, helpful, and concise information to citizens and municipal staff.
Always ground your answers in this real-time city data:
- Parking Lots: ${JSON.stringify(liveData.parking)}
- Emergency Departments: ${JSON.stringify(liveData.emergencyDepts)}
- Active Ambulances: ${liveData.ambulances.available} available out of ${liveData.ambulances.total}
- Water Reservoirs: ${JSON.stringify(liveData.waterTanks)}
- City Status: Traffic=${liveData.cityStatus.traffic}, AQI=${liveData.cityStatus.aqi}, Temp=${liveData.cityStatus.temperature}

Key City Locations: BRD Medical College (Medical Road), AIIMS Gorakhpur (Kunraghat), Gorakhnath Mandir, Ramgarh Tal Lake, Gorakhpur Junction, Golghar commercial area.
Emergency Helplines: 112 (Police & Emergency), 108 (Ambulance), 101 (Fire).

Style Guidelines:
- Format response with clear markdown headings, bullet points, and bold text.
- If citizen describes an emergency, urgently highlight 108/112 and nearest trauma center first.
- Keep answers professional, empathetic, and under 250 words.`;

            const geminiReply = await callGeminiAPI(systemPrompt, userMessage, history);

            // Determine intent from response/query
            let intent = "GENERAL";
            let actions = [];

            if (isEmergency) {
                intent = "EMERGENCY";
                actions.push({ label: "🚨 Trigger Live SOS Dispatch", action: "trigger_sos", type: "danger" });
                actions.push({ label: "📞 Call 108", action: "call", value: "108", type: "primary" });
            } else if (lower.includes("park")) {
                intent = "PARKING";
                actions.push({ label: "🅿️ Reserve Slot", action: "navigate", url: "/pages/parking/parking.html", type: "primary" });
            } else if (lower.includes("hospital") || lower.includes("doctor")) {
                intent = "HEALTHCARE";
                actions.push({ label: "🩺 Book Doctor", action: "navigate", url: "/pages/hospital/hospital.html", type: "primary" });
            } else if (lower.includes("water")) {
                intent = "WATER_SUPPLY";
                actions.push({ label: "💧 Water Portal", action: "navigate", url: "/pages/water/water.html", type: "primary" });
            }

            return {
                success: true,
                provider: "gemini",
                model: GEMINI_MODEL,
                intent,
                reply: geminiReply,
                actions,
                latencyMs: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };
        } catch (geminiError) {
            console.warn("⚠️ Gemini API failed, falling back to Smart City Knowledge Engine:", geminiError.message);
        }
    }

    // Fallback: Smart City Knowledge Engine
    const localResult = handleLocalKnowledgeEngine(userMessage, liveData);
    return {
        success: true,
        provider: "local_engine",
        model: "SmartCity-Gorakhpur-v2",
        ...localResult,
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString()
    };
}

/**
 * Get popular city quick suggestion prompts
 */
function getQuickSuggestions() {
    return [
        { label: "🅿️ Available Parking in Golghar", query: "Where can I find vacant parking near Golghar?" },
        { label: "🚨 Emergency Contacts & Trauma", query: "Emergency ambulance numbers and hospital trauma centers" },
        { label: "🏥 AIIMS & BRD Hospital Beds", query: "Check ICU and emergency bed availability in Gorakhpur" },
        { label: "💧 Water Supply Timings", query: "What are the city water supply timings and tank levels?" },
        { label: "🏛️ Gorakhpur City Attractions", query: "Tell me about Ramgarh Tal and Gorakhnath Temple" },
        { label: "🚦 Live Traffic & AQI", query: "What is the current traffic and AQI status in Gorakhpur?" }
    ];
}

module.exports = {
    processAIChat,
    getQuickSuggestions,
    getLiveCitySnapshot
};
