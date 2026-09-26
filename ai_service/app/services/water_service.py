"""
SmartCity AI - Water Flow & Consumption Intelligence Service
Computes reservoir demand, statistical deviation (Z-score), and potential leak indicators.
"""

from app.schemas import WaterAnomalyRequest, WaterAnomalyResponse

class WaterService:
    @classmethod
    def evaluate_water_anomaly(cls, req: WaterAnomalyRequest) -> WaterAnomalyResponse:
        inflow = req.daily_inflow_liters
        outflow = req.daily_outflow_liters
        avg_outflow = req.historical_avg_outflow

        # Calculate deviation sigma
        if avg_outflow > 0:
            std_dev = avg_outflow * 0.15 # Assuming ~15% natural daily variance
            deviation_liters = outflow - avg_outflow
            z_score = round(deviation_liters / max(1.0, std_dev), 2)
        else:
            z_score = 0.0

        # Anomaly determination (Z-score > 2.2 sigma indicates statistical anomaly)
        is_anomaly = z_score >= 2.2 and outflow > inflow

        if z_score >= 3.0:
            risk = "SUSPECTED_LEAK_INDICATOR"
            msg = f"Outflow exceeds historical average by {z_score} standard deviations with net deficit."
            rec = "Dispatch field maintenance inspection crew to inspect sector distribution pipeline. DO NOT shut down main pipeline autonomously."
        elif z_score >= 2.0:
            risk = "ELEVATED"
            msg = f"Higher than normal consumption detected (Z-score: {z_score})."
            rec = "Monitor tank pressure and secondary reservoir replenishment cycle."
        else:
            risk = "NOMINAL"
            msg = "Flow dynamics are within standard operating distribution bounds."
            rec = "Maintain normal automated valve schedule."

        return WaterAnomalyResponse(
            tank_id=req.tank_id,
            is_anomaly_indicator=is_anomaly,
            deviation_sigma=z_score,
            risk_level=risk,
            message=msg,
            recommendation=rec
        )
