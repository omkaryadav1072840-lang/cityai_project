"""
SmartCity AI - Emergency & Rapid Dispatch Intelligence Service
Provides travel time estimation using geospatial distance and road incident weighting.
Maintains human-in-the-loop control for all emergency dispatches.
"""

import math
from app.schemas import EmergencyRouteRequest, EmergencyRouteResponse

class EmergencyService:
    @staticmethod
    def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        # Earth radius in kilometers
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2.0) ** 2 +
            math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return round(R * c, 2)

    @classmethod
    def estimate_travel_time(cls, req: EmergencyRouteRequest) -> EmergencyRouteResponse:
        dist_km = cls._haversine_distance(req.origin_lat, req.origin_lng, req.dest_lat, req.dest_lng)

        # Baseline urban emergency speed in Gorakhpur: ~35 km/h
        # Time (mins) = (Distance / Speed) * 60
        base_mins = (dist_km / 35.0) * 60.0

        # Adjust for road blocks / incidents
        blocks = req.active_road_blocks or 0
        incident_delay = blocks * 3.5

        total_mins = max(2.0, round(base_mins + incident_delay, 1))

        # Priority calculation
        severity = (req.incident_severity or "HIGH").upper()
        if severity in ("CRITICAL", "CODE_RED"):
            prio = "P1_IMMEDIATE_RED_LIGHT_PREEMPTION"
            corridor = "Gorakhpur AIIMS / Medical College Emergency Green Corridor"
        elif severity == "HIGH":
            prio = "P2_URGENT_DISPATCH"
            corridor = "Civil Lines - Shastri Chowk Arterial"
        else:
            prio = "P3_STANDARD_RESPONSE"
            corridor = "Standard Municipal Route"

        return EmergencyRouteResponse(
            incident_id=req.incident_id or "EM-SOS",
            estimated_travel_minutes=total_mins,
            distance_km=dist_km,
            priority_level=prio,
            suggested_corridor=corridor,
            human_in_the_loop_required=True,
            disclaimer="Dispatches remain strictly under human 108/112 operator authority. AI outputs decision support."
        )
