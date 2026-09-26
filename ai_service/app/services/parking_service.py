"""
SmartCity AI - Parking Demand Intelligence Service
Provides parking occupancy forecasting, peak probability calculation, and lot recommendations.
"""

from datetime import datetime
from app.schemas import ParkingDemandRequest, ParkingDemandResponse

class ParkingService:
    MODEL_VERSION = "parking-occupancy-v2.0"

    @classmethod
    def forecast_demand(cls, req: ParkingDemandRequest) -> ParkingDemandResponse:
        now = datetime.now()
        hour = req.hour if req.hour is not None else now.hour
        day_of_week = req.day_of_week if req.day_of_week is not None else now.weekday()

        total = max(1, req.total_slots)
        occupied = req.current_occupied
        current_pct = (occupied / total) * 100.0

        # Peak hours: 11 AM - 2 PM (shopping/office) and 5 PM - 9 PM (evening market/dining)
        is_peak = (11 <= hour <= 14) or (17 <= hour <= 21)
        weekend_boost = 10.0 if day_of_week in (5, 6) else 0.0

        if is_peak:
            projected_pct = min(98.0, max(current_pct, 75.0 + weekend_boost))
            peak_prob = 0.88
        else:
            projected_pct = max(15.0, min(current_pct, 45.0))
            peak_prob = 0.25

        projected_available = max(0, int(total * (1.0 - (projected_pct / 100.0))))

        if projected_pct >= 90.0:
            rec = "Near full capacity expected. Recommend redirecting overflow vehicles to Railway Station Multi-Level Lot."
        elif projected_pct >= 70.0:
            rec = "Moderate availability. Contactless Fastag reservation recommended."
        else:
            rec = "Ample parking slots available across all tiers."

        return ParkingDemandResponse(
            lot_id=req.lot_id,
            projected_occupancy_pct=round(projected_pct, 1),
            projected_available_slots=projected_available,
            peak_probability=peak_prob,
            recommendation=rec,
            model_version=cls.MODEL_VERSION
        )
