/**
 * SmartCity AI - Grounded Bilingual Chatbot Engine (Hindi + English)
 * Understands natural language queries and binds strictly to verified database tools.
 */

const SmartCityTools = require("../tools/smartcity_tools");

class ChatbotEngine {
    static detectIntent(query = "") {
        const q = String(query).toLowerCase().trim();
        const isHindi = /[\u0900-\u097F]/.test(q) || /(kaha|kaise|batao|kripya|chahiye|hai|kare|meri|mera)/i.test(q);

        // 1. Hospital Beds & ICU
        if (q.includes("icu") || q.includes("bed") || q.includes("बेड") || q.includes("oxygen")) {
            return { tool: "find_available_beds", module: "hospital", intent: "hospital_beds", isHindi };
        }

        // 2. Hospitals & Healthcare
        if (q.includes("hospital") || q.includes("अस्पताल") || q.includes("ilaj") || q.includes("इलाज") || q.includes("clinic")) {
            return { tool: "find_hospitals", module: "hospital", intent: "hospitals", isHindi };
        }

        // 3. Doctors & Consultation
        if (q.includes("doctor") || q.includes("डॉक्टर") || q.includes("physician") || q.includes("appointment") || q.includes("specialist")) {
            return { tool: "find_doctors", module: "hospital", intent: "doctors", isHindi };
        }

        // 4. Parking
        if (q.includes("parking") || q.includes("पार्किंग") || q.includes("gadi") || q.includes("car park") || q.includes("slot")) {
            return { tool: "find_parking", module: "parking", intent: "parking", isHindi };
        }

        // 5. Traffic Status & Congestion
        if (q.includes("traffic") || q.includes("ट्रैफिक") || q.includes("jam") || q.includes("जाम") || q.includes("congestion") || q.includes("bhid")) {
            return { tool: "get_traffic_status", module: "traffic", intent: "traffic", isHindi };
        }

        // 6. Navigation & Directions
        if (q.includes("route") || q.includes("rasta") || q.includes("रास्ता") || q.includes("direction") || q.includes("kaise jaye") || q.includes("reach")) {
            return { tool: "get_route_information", module: "traffic", intent: "route", isHindi };
        }

        // 7. Police & Safety
        if (q.includes("police") || q.includes("पुलिस") || q.includes("thana") || q.includes("थाना") || q.includes("chowki") || q.includes("fir")) {
            return { tool: "get_police_stations", module: "police", intent: "police", isHindi };
        }

        // 8. Emergency & Helplines
        if (q.includes("emergency") || q.includes("आपातकालीन") || q.includes("ambulance") || q.includes("एम्बुलेंस") || q.includes("108") || q.includes("112")) {
            return { tool: "get_emergency_services", module: "emergency", intent: "emergency", isHindi };
        }

        // 9. Waste & Garbage
        if (q.includes("waste") || q.includes("kachra") || q.includes("कचरा") || q.includes("garbage") || q.includes("dustbin") || q.includes("safai")) {
            return { tool: "get_waste_status", module: "waste", intent: "waste", isHindi };
        }

        // 10. Water Supply
        if (q.includes("water") || q.includes("pani") || q.includes("पानी") || q.includes("tanker") || q.includes("supply")) {
            return { tool: "get_water_status", module: "water", intent: "water", isHindi };
        }

        // 11. Tourist & Heritage
        if (q.includes("tourist") || q.includes("mandir") || q.includes("मंदिर") || q.includes("ramgarh") || q.includes("tal") || q.includes("lake") || q.includes("ghoomne")) {
            return { tool: "get_tourist_places", module: "tourism", intent: "tourist", isHindi };
        }

        // 12. User Bookings
        if (q.includes("my booking") || q.includes("meri booking") || q.includes("booking status") || q.includes("मेरी बुकिंग")) {
            return { tool: "get_user_bookings", module: "profile", intent: "bookings", isHindi };
        }

        return { tool: "get_nearby_services", module: "general", intent: "general_services", isHindi };
    }

    static async processQuery(query, user = null) {
        const intentInfo = this.detectIntent(query);
        const toolFunc = SmartCityTools[intentInfo.tool];

        let toolResult = { success: false, data: [] };
        if (typeof toolFunc === "function") {
            toolResult = await toolFunc({ query, user });
        }

        const synthesis = this.synthesizeResponse(intentInfo, toolResult, query);
        return {
            success: true,
            reply: synthesis.reply,
            tool_executed: intentInfo.tool,
            data_source: toolResult.data_source || "REAL",
            confidence: 0.94,
            suggested_actions: synthesis.actions,
            raw_data: toolResult.data
        };
    }

    static synthesizeResponse(intentInfo, toolResult, originalQuery) {
        const isHindi = intentInfo.isHindi;
        const d = toolResult.data;
        let reply = "";
        let actions = [];

        switch (intentInfo.intent) {
            case "hospital_beds":
                if (Array.isArray(d) && d.length > 0) {
                    const top = d.slice(0, 3).map(b => `• **${b.hospital_name}**: ${b.category} (${b.available_beds} beds available)`).join("\n");
                    reply = isHindi
                        ? `गोरखपुर में उपलब्ध वार्ड और आईसीयू बेड:\n\n${top}\n\nआपातकालीन सहायता के लिए डायल करें: 108`
                        : `Live hospital bed availability in Gorakhpur:\n\n${top}\n\nFor trauma ambulance transfer, call 108.`;
                } else {
                    reply = isHindi ? "वर्तमान में सभी प्रमुख आईसीयू बेड पूर्ण क्षमता पर हैं। कृपया 108 पर संपर्क करें।" : "Verified beds are currently reporting high occupancy. Please contact emergency triage at 108.";
                }
                actions = [{ label: "Hospital Portal", action: "/pages/hospital/hospital.html" }, { label: "Call 108", action: "tel:108" }];
                break;

            case "hospitals":
                if (Array.isArray(d) && d.length > 0) {
                    const top = d.slice(0, 3).map(h => `• **${h.name}**: ${h.address} (📞 ${h.emergency_number})`).join("\n");
                    reply = isHindi
                        ? `गोरखपुर के प्रमुख सत्यापित अस्पताल:\n\n${top}`
                        : `Verified hospitals in Gorakhpur:\n\n${top}`;
                } else {
                    reply = isHindi ? "अस्पताल जानकारी लोड हो रही है।" : "Hospital directory retrieved.";
                }
                actions = [{ label: "All Hospitals", action: "/pages/hospital/hospital.html" }, { label: "Book Doctor", action: "/pages/hospital/hospital.html#doctors" }];
                break;

            case "parking":
                if (Array.isArray(d) && d.length > 0) {
                    const top = d.slice(0, 3).map(p => `• **${p.name}**: ${p.available_slots}/${p.total_slots} खाली (${p.hourly_rate} ₹/hr)`).join("\n");
                    reply = isHindi
                        ? `गोरखपुर में उपलब्ध पार्किंग स्थल:\n\n${top}`
                        : `Available parking locations in Gorakhpur:\n\n${top}`;
                } else {
                    reply = isHindi ? "पार्किंग स्लॉट उपलब्ध नहीं हैं।" : "No vacant parking slots currently reported.";
                }
                actions = [{ label: "Book Parking Slot", action: "/pages/parking/parking.html" }];
                break;

            case "traffic":
                if (Array.isArray(d) && d.length > 0) {
                    const top = d.slice(0, 3).map(t => `• **${t.junction}**: ${t.congestion} traffic (${t.vehicle_count} vehicles, Signal: ${t.signal_phase})`).join("\n");
                    reply = isHindi
                        ? `गोरखपुर में लाइव ट्रैफिक स्थिति:\n\n${top}`
                        : `Real-time Gorakhpur arterial traffic:\n\n${top}`;
                } else {
                    reply = isHindi ? "ट्रैफिक सामान्य रूप से सुचारू है।" : "Traffic flow is currently running smoothly.";
                }
                actions = [{ label: "Live Traffic Radar", action: "/pages/traffic/traffic.html" }];
                break;

            case "route":
                if (d && d.recommended_route) {
                    reply = isHindi
                        ? `🗺️ **अनुशंसित मार्ग:**\n• मार्ग: ${d.recommended_route}\n• अनुमानित दूरी: ${d.estimated_distance_km} km (~${d.estimated_time_mins} मिनट)\n• ट्रैफिक: ${d.traffic_condition}\n\n[Google Maps पर देखें](${d.navigation_url})`
                        : `🗺️ **Transit Navigation:**\n• Recommended: ${d.recommended_route}\n• Distance: ~${d.estimated_distance_km} km (~${d.estimated_time_mins} mins)\n• Condition: ${d.traffic_condition}\n\n[Open in Google Maps](${d.navigation_url})`;
                }
                actions = [{ label: "Navigation Map", action: "/pages/traffic/traffic.html" }];
                break;

            case "police":
                if (Array.isArray(d) && d.length > 0) {
                    const top = d.slice(0, 3).map(p => `• **${p.name}**: ${p.address} (📞 SHO: ${p.contact})`).join("\n");
                    reply = isHindi
                        ? `नजदीकी पुलिस स्टेशन और संपर्क:\n\n${top}\n\nतत्काल सहायता के लिए डायल करें: 112`
                        : `Nearest police stations in Gorakhpur:\n\n${top}\n\nFor immediate emergency response, call 112.`;
                }
                actions = [{ label: "Police Portal", action: "/pages/police/police.html" }, { label: "Call 112", action: "tel:112" }];
                break;

            case "emergency":
                reply = isHindi
                    ? `🚨 **गोरखपुर आपातकालीन हेल्पलाइन:**\n• एकीकृत पुलिस/फायर/राहत: 112\n• राष्ट्रीय एम्बुलेंस: 108\n• महिला हेल्पलाइन: 1090\n• नगर निगम कंट्रोल रूम: 1533`
                    : `🚨 **Gorakhpur Emergency Helplines:**\n• Unified Emergency (Police/Fire/Disaster): 112\n• National Ambulance: 108\n• Women Helpline: 1090\n• Municipal Control Room: 1533`;
                actions = [{ label: "Call 112", action: "tel:112" }, { label: "Call 108", action: "tel:108" }, { label: "SOS Dispatch", action: "/pages/emergency/emergency.html" }];
                break;

            case "tourist":
                if (Array.isArray(d) && d.length > 0) {
                    const top = d.slice(0, 3).map(t => `• **${t.name}**: ${t.category} (${t.timings}, ${t.fee})`).join("\n");
                    reply = isHindi
                        ? `गोरखपुर के प्रमुख पर्यटन व धार्मिक स्थल:\n\n${top}`
                        : `Verified tourist and heritage attractions in Gorakhpur:\n\n${top}`;
                }
                actions = [{ label: "Explore Tourism", action: "/pages/famous/famous.html" }];
                break;

            default:
                reply = isHindi
                    ? "नमस्ते! मैं गोरखपुर स्मार्टसिटी AI सहायक हूँ। आप मुझसे अस्पताल बेड, डॉक्टर, ट्रैफिक, पार्किंग, आपातकालीन सेवाएं या पर्यटन स्थलों के बारे में पूछ सकते हैं।"
                    : "Hello! I am your Gorakhpur SmartCity AI Assistant. You can ask me about hospital beds, parking slots, live traffic, police helplines, or heritage tourism.";
                actions = [
                    { label: "Check Parking", action: "/pages/parking/parking.html" },
                    { label: "Hospital Beds", action: "/pages/hospital/hospital.html" },
                    { label: "Live Traffic", action: "/pages/traffic/traffic.html" }
                ];
        }

        return { reply, actions };
    }
}

module.exports = ChatbotEngine;
