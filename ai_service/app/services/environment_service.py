"""
SmartCity AI - Environmental & AQI Telemetry Analysis Service
Computes standard CPCB AQI breakpoints, health advisories, and trend classification.
"""

from app.schemas import AQIAnalysisRequest, AQIAnalysisResponse

class EnvironmentService:
    @staticmethod
    def _calculate_sub_index(pm: float, breakpoints: list) -> int:
        for b_lo, b_hi, i_lo, i_hi in breakpoints:
            if b_lo <= pm <= b_hi:
                return int(((i_hi - i_lo) / (b_hi - b_lo)) * (pm - b_lo) + i_lo)
        return 500

    @classmethod
    def analyze_aqi(cls, req: AQIAnalysisRequest) -> AQIAnalysisResponse:
        # CPCB PM2.5 Breakpoints (24hr avg in ug/m3)
        pm25_bp = [
            (0, 30, 0, 50),
            (30, 60, 51, 100),
            (60, 90, 101, 200),
            (90, 120, 201, 300),
            (120, 250, 301, 400),
            (250, 500, 401, 500)
        ]
        
        # CPCB PM10 Breakpoints
        pm10_bp = [
            (0, 50, 0, 50),
            (50, 100, 51, 100),
            (100, 250, 101, 200),
            (250, 350, 201, 300),
            (350, 430, 301, 400),
            (430, 600, 401, 500)
        ]

        sub_pm25 = cls._calculate_sub_index(req.pm25, pm25_bp)
        sub_pm10 = cls._calculate_sub_index(req.pm10, pm10_bp)

        calculated_aqi = max(sub_pm25, sub_pm10)
        dominant = "PM2.5" if sub_pm25 >= sub_pm10 else "PM10"

        if calculated_aqi <= 50:
            category = "GOOD"
            advisory = "Minimal health impact. Ideal for outdoor recreation."
        elif calculated_aqi <= 100:
            category = "SATISFACTORY"
            advisory = "Minor breathing discomfort to sensitive individuals."
        elif calculated_aqi <= 200:
            category = "MODERATE"
            advisory = "Breathing discomfort to people with lungs, asthma, and heart diseases."
        elif calculated_aqi <= 300:
            category = "POOR"
            advisory = "Breathing discomfort to most people on prolonged exposure."
        elif calculated_aqi <= 400:
            category = "VERY_POOR"
            advisory = "Respiratory illness on prolonged exposure. N95 masks advised."
        else:
            category = "SEVERE"
            advisory = "Affects healthy people and seriously impacts those with existing diseases."

        trend = "Stable within seasonal winter inversion bounds" if req.temperature_c and req.temperature_c < 20 else "Normal daytime dispersion"

        return AQIAnalysisResponse(
            sensor_id=req.sensor_id,
            calculated_aqi=calculated_aqi,
            aqi_category=category,
            dominant_pollutant=dominant,
            health_advisory=advisory,
            trend_24h=trend
        )
