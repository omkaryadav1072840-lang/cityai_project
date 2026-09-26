#!/usr/bin/env python3
"""
SmartCity AI - City Assistant NLP Intent Detector & Tool Selector
Location: Gorakhpur, Uttar Pradesh
Maps citizen natural language questions to allowlisted backend tools with zero hallucination.
"""

import sys
import json
import re

ALLOWLISTED_TOOLS = [
    {
        "intent": "hospital_beds",
        "tool_called": "find_hospitals",
        "module": "healthcare",
        "patterns": [r"hospital", r"bed", r"doctor", r"icu", r"medical", r"clinic", r"emergency care", r"opd", r"brd", r"aiims"],
        "action": "find_available_beds"
    },
    {
        "intent": "find_parking",
        "tool_called": "find_parking",
        "module": "parking",
        "patterns": [r"parking", r"park car", r"slot", r"park vehicle", r"parking lot", r"bay", r"fastag"],
        "action": "find_nearest_parking"
    },
    {
        "intent": "traffic_status",
        "tool_called": "get_traffic_status",
        "module": "traffic",
        "patterns": [r"traffic", r"congestion", r"jam", r"road", r"crossing", r"signal", r"junction", r"shastri chowk", r"golghar"],
        "action": "get_traffic_conditions"
    },
    {
        "intent": "report_waste",
        "tool_called": "create_waste_request",
        "module": "waste",
        "patterns": [r"garbage", r"waste", r"trash", r"dustbin", r"overflow", r"dump", r"cleanliness", r"safai"],
        "action": "guide_waste_report"
    },
    {
        "intent": "police_station",
        "tool_called": "get_public_services",
        "module": "police",
        "patterns": [r"police", r"fir", r"theft", r"cop", r"security", r"thana", r"station", r"helpline 112"],
        "action": "find_police_station"
    },
    {
        "intent": "emergency_sos",
        "tool_called": "dispatch_emergency",
        "module": "emergency",
        "patterns": [r"emergency", r"ambulance", r"fire", r"sos", r"urgent help", r"hazard", r"108"],
        "action": "trigger_emergency_guidance"
    },
    {
        "intent": "famous_places",
        "tool_called": "find_nearby_places",
        "module": "places",
        "patterns": [r"famous", r"place", r"temple", r"tourist", r"visit", r"monument", r"lake", r"park", r"sightseeing", r"gorakhnath", r"ramgarh"],
        "action": "explore_places"
    },
    {
        "intent": "user_bookings",
        "tool_called": "get_my_bookings",
        "module": "activity",
        "patterns": [r"my booking", r"my reservation", r"my pass", r"my ticket", r"my slot"],
        "action": "get_user_bookings"
    },
    {
        "intent": "hospital_services",
        "tool_called": "get_hospital_services",
        "module": "healthcare",
        "patterns": [r"diagnostic", r"lab test", r"pathology", r"blood test", r"x-ray", r"mri", r"ultrasound", r"prescription"],
        "action": "get_diagnostic_services"
    },
    {
        "intent": "aqi_environment",
        "tool_called": "analyze_environment",
        "module": "environment",
        "patterns": [r"aqi", r"air quality", r"pollution", r"smog", r"weather", r"pm2\.5", r"environment"],
        "action": "get_environmental_stats"
    },
    {
        "intent": "street_light",
        "tool_called": "report_street_light",
        "module": "street_lights",
        "patterns": [r"street light", r"lamp", r"pole", r"dark street", r"light out"],
        "action": "report_street_light"
    }
]

def detect_intent(text):
    clean_text = text.lower().strip()
    matched_intents = []

    for rule in ALLOWLISTED_TOOLS:
        match_count = sum(1 for p in rule["patterns"] if re.search(r"\b" + p, clean_text))
        if match_count > 0:
            matched_intents.append((rule, match_count))

    if not matched_intents:
        return {
            "intent": "general_inquiry",
            "tool_called": None,
            "module": "general",
            "action": "general_assistance",
            "confidence": 0.5,
            "raw_query": text
        }

    # Pick the intent with most pattern matches
    matched_intents.sort(key=lambda x: x[1], reverse=True)
    best_rule = matched_intents[0][0]

    return {
        "intent": best_rule["intent"],
        "tool_called": best_rule["tool_called"],
        "module": best_rule["module"],
        "action": best_rule["action"],
        "confidence": 0.92,
        "raw_query": text
    }

if __name__ == "__main__":
    try:
        raw_input = sys.stdin.read()
        data = json.loads(raw_input) if raw_input.strip() else {}
        query = data.get("query") or data.get("question") or data.get("message") or ""
        result = detect_intent(query)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"intent": "general_inquiry", "tool_called": None, "module": "general", "error": str(e)}))
