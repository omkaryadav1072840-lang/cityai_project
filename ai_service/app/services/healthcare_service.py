"""
SmartCity AI - Healthcare & Clinical Capacity Intelligence Service
Provides hospital bed capacity forecasting and department search with strict medical disclaimers.
"""

from app.schemas import HospitalCapacityRequest, HospitalCapacityResponse

class HealthcareService:
    MODEL_VERSION = "hospital-capacity-v2.0"

    @classmethod
    def evaluate_capacity(cls, req: HospitalCapacityRequest) -> HospitalCapacityResponse:
        total = max(1, req.total_beds)
        occupied = req.occupied_beds
        occupancy_pct = round((occupied / total) * 100.0, 1)

        icu_total = max(1, req.icu_beds)
        icu_occupied = req.occupied_icu
        icu_pct = round((icu_occupied / icu_total) * 100.0, 1)

        is_near_saturation = occupancy_pct >= 85.0 or icu_pct >= 90.0

        if icu_pct >= 92.0:
            icu_status = "CRITICAL_ICU_SHORTAGE"
        elif icu_pct >= 75.0:
            icu_status = "ELEVATED_ICU_LOAD"
        else:
            icu_status = "ADEQUATE_ICU_CAPACITY"

        return HospitalCapacityResponse(
            hospital_id=req.hospital_id,
            projected_bed_occupancy_pct=occupancy_pct,
            is_near_saturation=is_near_saturation,
            critical_care_status=icu_status,
            model_version=cls.MODEL_VERSION,
            safety_disclaimer="Decision support only. Clinical triage and admissions remain strictly with hospital medical superintendents."
        )
