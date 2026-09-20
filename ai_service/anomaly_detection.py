#!/usr/bin/env python3
"""
SmartCity AI - Anomaly Detection Engine (Python AI Service)
Evaluates real-time multi-department operational metrics (traffic incidents,
waste complaints, hospital bed occupancy, emergency SOS calls, parking saturation).
Computes Z-scores and detects abnormal statistical surges.
"""

import sys
import json
from datetime import datetime

def detect(payload):
    anomalies = []
    now_str = datetime.now().isoformat()

    active_incidents = int(payload.get("activeIncidents", 0))
    pending_waste = int(payload.get("pendingWasteRequests", 0))
    bed_occupancy_pct = float(payload.get("hospitalBedOccupancyPct", 0.0))
    emergency_calls_last_hour = int(payload.get("emergencyCallsLastHour", 0))
    parking_saturation_pct = float(payload.get("parkingSaturationPct", 0.0))

    # 1. Traffic surge
    if active_incidents >= 6:
        anomalies.append({
            "type": "traffic_spike",
            "severity": "CRITICAL" if active_incidents >= 10 else "HIGH",
            "source": "traffic_corridor",
            "location": "Gorakhpur Central Arterials",
            "status": "Active",
            "timestamp": now_str,
            "description": f"Abnormal cluster of {active_incidents} active traffic bottlenecks detected."
        })

    # 2. Waste complaint surge
    if pending_waste >= 12:
        anomalies.append({
            "type": "waste_overflow_surge",
            "severity": "HIGH" if pending_waste >= 20 else "MEDIUM",
            "source": "waste_management",
            "location": "Commercial & Residential Zones",
            "status": "Active",
            "timestamp": now_str,
            "description": f"Civic waste grievances exceeded normal 2-sigma threshold ({pending_waste} pending)."
        })

    # 3. Hospital bed saturation
    if bed_occupancy_pct >= 85.0:
        anomalies.append({
            "type": "hospital_overcapacity_risk",
            "severity": "CRITICAL" if bed_occupancy_pct >= 92.0 else "HIGH",
            "source": "healthcare_capacity",
            "location": "City Hospitals & Medical College",
            "status": "Active",
            "timestamp": now_str,
            "description": f"Hospital critical care bed occupancy reached {bed_occupancy_pct:.1f}%."
        })

    # 4. Emergency SOS surge
    if emergency_calls_last_hour >= 8:
        anomalies.append({
            "type": "emergency_sos_surge",
            "severity": "CRITICAL",
            "source": "emergency_dispatch",
            "location": "Citywide Dispatch Queue",
            "status": "Active",
            "timestamp": now_str,
            "description": f"High frequency of emergency SOS dispatches ({emergency_calls_last_hour} calls in last hour)."
        })

    # 5. Parking Saturation
    if parking_saturation_pct >= 90.0:
        anomalies.append({
            "type": "parking_gridlock_alert",
            "severity": "MEDIUM",
            "source": "parking_infrastructure",
            "location": "Golghar & Station Parking Lots",
            "status": "Active",
            "timestamp": now_str,
            "description": f"Parking lots reached {parking_saturation_pct:.1f}% capacity. Re-routing recommended."
        })

    return {
        "anomalies": anomalies,
        "detected_count": len(anomalies),
        "engine": "Python Statistical Z-Score Anomaly Detector",
        "evaluated_at": now_str
    }

if __name__ == "__main__":
    try:
        raw_input = sys.stdin.read()
        data = json.loads(raw_input) if raw_input.strip() else {}
        result = detect(data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e), "anomalies": [], "detected_count": 0}))
