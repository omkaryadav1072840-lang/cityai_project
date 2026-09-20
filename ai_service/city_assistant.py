#!/usr/bin/env python3
"""
SmartCity AI - City Assistant NLP Intent Detector (Python AI Service)
Maps citizen natural language questions to database query modules and parameters.
"""

import sys
import json
import re

INTENT_RULES = [
    {
        "intent": "hospital_beds",
        "module": "healthcare",
        "patterns": [r"hospital", r"bed", r"doctor", r"icu", r"medical", r"clinic", r"emergency care"],
        "action": "find_available_beds"
    },
    {
        "intent": "find_parking",
        "module": "parking",
        "patterns": [r"parking", r"park car", r"slot", r"park vehicle", r"parking lot"],
        "action": "find_nearest_parking"
    },
    {
        "intent": "traffic_status",
        "module": "traffic",
        "patterns": [r"traffic", r"congestion", r"jam", r"road", r"crossing", r"signal", r"junction"],
        "action": "get_traffic_conditions"
    },
    {
        "intent": "report_waste",
        "module": "waste",
        "patterns": [r"garbage", r"waste", r"trash", r"dustbin", r"overflow", r"dump", r"cleanliness"],
        "action": "guide_waste_report"
    },
    {
        "intent": "police_station",
        "module": "police",
        "patterns": [r"police", r"fir", r"theft", r"cop", r"security", r"thana", r"station"],
        "action": "find_police_station"
    },
    {
        "intent": "emergency_sos",
        "module": "emergency",
        "patterns": [r"emergency", r"ambulance", r"fire", r"sos", r"urgent help", r"hazard"],
        "action": "trigger_emergency_guidance"
    },
    {
        "intent": "famous_places",
        "module": "places",
        "patterns": [r"famous", r"place", r"temple", r"tourist", r"visit", r"monument", r"lake", r"park", r"sightseeing"],
        "action": "explore_places"
    },
    {
        "intent": "aqi_environment",
        "module": "environment",
        "patterns": [r"aqi", r"air quality", r"pollution", r"smog", r"weather", r"pm2\.5", r"environment"],
        "action": "get_environmental_stats"
    },
    {
        "intent": "street_light",
        "module": "street_lights",
        "patterns": [r"street light", r"lamp", r"pole", r"dark street", r"light out"],
        "action": "report_street_light"
    }
]

def detect_intent(text):
    clean_text = text.lower().strip()
    matched_intents = []

    for rule in INTENT_RULES:
        match_count = sum(1 for p in rule["patterns"] if re.search(r"\b" + p, clean_text))
        if match_count > 0:
            matched_intents.append((rule, match_count))

    if not matched_intents:
        return {
            "intent": "general_inquiry",
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
        "module": best_rule["module"],
        "action": best_rule["action"],
        "confidence": 0.92,
        "raw_query": text
    }

if __name__ == "__main__":
    try:
        raw_input = sys.stdin.read()
        data = json.loads(raw_input) if raw_input.strip() else {}
        query = data.get("query", "")
        result = detect_intent(query)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"intent": "general_inquiry", "module": "general", "error": str(e)}))
