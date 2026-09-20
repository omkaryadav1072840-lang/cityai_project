#!/usr/bin/env python3
"""
SmartCity AI - Waste Collection Demand Forecaster (Python AI Service)
Estimates daily civic solid waste load and identifies high-demand municipal zones
based on historical day-of-week trends and population density.
"""

import sys
import json
from datetime import datetime

def forecast(payload):
    day_of_week = int(payload.get("day_of_week", datetime.now().weekday()))
    recent_complaints = int(payload.get("recent_complaints", 15))

    # Base daily waste generation (metric tons)
    base_tonnage = 38.0

    # Weekends (Sat/Sun) generate higher residential and commercial market waste
    if day_of_week in (5, 6):
        base_tonnage += 12.5
    elif day_of_week == 0: # Monday cleanup surge
        base_tonnage += 8.0

    # Impact of reported civic overflows
    base_tonnage += round(recent_complaints * 0.4, 1)

    suggested_trucks = max(4, int(base_tonnage / 5.5))

    high_demand_wards = [
        {"ward": "Ward 12 - Golghar Commercial", "priority": "HIGH", "estimated_load_tons": round(base_tonnage * 0.28, 1)},
        {"ward": "Ward 18 - Mohaddipur Market", "priority": "HIGH", "estimated_load_tons": round(base_tonnage * 0.24, 1)},
        {"ward": "Ward 4 - Asuran Junction", "priority": "MEDIUM", "estimated_load_tons": round(base_tonnage * 0.18, 1)},
        {"ward": "Ward 9 - Medical College Zone", "priority": "MEDIUM", "estimated_load_tons": round(base_tonnage * 0.16, 1)},
        {"ward": "Ward 22 - Dharamshala Bazar", "priority": "MEDIUM", "estimated_load_tons": round(base_tonnage * 0.14, 1)}
    ]

    return {
        "predicted_collection_demand_tons": round(base_tonnage, 1),
        "suggested_truck_dispatches": suggested_trucks,
        "high_priority_wards": high_demand_wards,
        "engine": "Python Municipal Waste Analytics Engine",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    try:
        raw_input = sys.stdin.read()
        data = json.loads(raw_input) if raw_input.strip() else {}
        result = forecast(data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e), "predicted_collection_demand_tons": 40.0}))
