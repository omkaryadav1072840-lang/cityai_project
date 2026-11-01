#!/usr/bin/env python3
"""
SmartCity AI - IoT Smart Dustbin Telemetry Simulator
Simulates real-world sensor streams (Ultrasonic distance, PIR Footfall, Weight)
and posts to the SmartCity AI backend API.
"""

import sys
import time
import json
import urllib.request
import urllib.error

API_URL = "http://localhost:5000/api/waste/dustbin-terminal/sensor-data"
BIN_CODE = "BIN-GOL-01"
API_KEY = "BIN@2026"

def send_telemetry(distance_cm=20.0, weight_kg=120.0, people_count=3, temperature=30.0, battery=95):
    payload = {
        "bin_code": BIN_CODE,
        "api_key": API_KEY,
        "distance_cm": float(distance_cm),
        "weight_kg": float(weight_kg),
        "people_count_delta": int(people_count),
        "temperature_c": float(temperature),
        "battery_pct": int(battery),
        "lid_status": "Closed"
    }

    req = urllib.request.Request(
        API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            res_body = response.read().decode("utf-8")
            data = json.loads(res_body)
            print(f"✅ Ingested: Fill={data.get('fill_percentage')}% | Status={data.get('status')} | AI Time-to-Full={data.get('ai_prediction', {}).get('formatted_time_until_full')} | Auto-Alert={data.get('auto_alert_dispatched')}")
            return data
    except urllib.error.URLError as e:
        print(f"⚠️ Error sending telemetry to {API_URL}: {e}")
        return None

if __name__ == "__main__":
    print("==========================================================")
    print("  🌱 SmartCity AI - IoT Dustbin Sensor Telemetry Simulator")
    print(f"  Target: {API_URL} | Bin: {BIN_CODE}")
    print("==========================================================\n")

    if len(sys.argv) > 1 and sys.argv[1] == "--loop":
        print("Starting continuous live sensor simulation (Ctrl+C to stop)...")
        dist = 80.0
        while True:
            # Gradually fill up bin
            dist = max(8.0, dist - 2.5)
            weight = round((120.0 - dist) * 1.25, 1)
            send_telemetry(distance_cm=dist, weight_kg=weight, people_count=2)
            time.sleep(5)
    else:
        print("Sending single test packet (Distance: 14.5 cm = ~88% Full)...")
        send_telemetry(distance_cm=14.5, weight_kg=132.0, people_count=4)
        print("\nTip: Run with '--loop' to simulate continuous sensor stream.")

