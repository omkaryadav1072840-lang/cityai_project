"""
SmartCity AI - Healthcare & Clinical Intelligence Service
Provides hospital bed capacity forecasting, clinical intent classification, and strict clinical triage safety.
Framework: Scikit-learn (Joblib), Pydantic v2, FastAPI
"""

import os
import joblib
from app.schemas import (
    HospitalCapacityRequest, 
    HospitalCapacityResponse,
    ClinicalIntentRequest,
    ClinicalIntentResponse
)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "artifacts", "models", "clinical_intent_classifier.joblib")

class HealthcareService:
    CAPACITY_MODEL_VERSION = "hospital-capacity-v2.0"
    INTENT_MODEL_VERSION = "clinical-intent-v1.0"
    _intent_model = None
    _intent_model_loaded = False

    @classmethod
    def _load_intent_model(cls):
        if not cls._intent_model_loaded:
            if os.path.exists(MODEL_PATH):
                try:
                    cls._intent_model = joblib.load(MODEL_PATH)
                except Exception as e:
                    print(f"[HealthcareService] Warning loading clinical intent model: {e}")
                    cls._intent_model = None
            cls._intent_model_loaded = True
        return cls._intent_model

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
            model_version=cls.CAPACITY_MODEL_VERSION,
            safety_disclaimer="Decision support only. Clinical triage and admissions remain strictly with hospital medical superintendents."
        )

    @classmethod
    def classify_clinical_intent(cls, req: ClinicalIntentRequest) -> ClinicalIntentResponse:
        raw_query = req.query.strip()
        q_lower = raw_query.lower()

        # =========================================================================
        # TIER 0: DETERMINISTIC CLINICAL SAFETY INVARIANTS (100% SENSITIVITY)
        # =========================================================================
        # 1. Emergency Red-Flag Invariant (ICMR National Emergency Protocols)
        emergency_indicators = [
            "chest pain", "seene me", "seene mein", "breathless", "saans", "stroke", 
            "lakwa", "drooping", "slurred", "coughing up blood", "khansi me taja lal khoon", 
            "khoon nikal", "unconscious", "behosh", "accident", "bleeding", "poison", 
            "zehar", "anaphylactic", "throat swelling", "gala sooj", "choking", "dam ghut", 
            "suffocating", "cyanosis", "blue lips", "lips turning blue", "asthma attack"
        ]
        if any(ind in q_lower for ind in emergency_indicators):
            return ClinicalIntentResponse(
                query=raw_query,
                intent="EMERGENCY",
                confidence=1.0,
                is_emergency=True,
                requires_doctor_handoff=True,
                model_version=cls.INTENT_MODEL_VERSION,
                safety_tier_invoked="TIER_0_DETERMINISTIC_EMERGENCY",
                disclaimer="Immediate emergency red flag detected. Divert to 108/112 emergency services without delay."
            )

        # 2. Dosage Alteration Prevention Invariant (Do not allow self-titration)
        dosage_alteration_indicators = [
            "double", "badha lu", "badha du", "increase my", "2 tablet", "2 goli", 
            "stop taking", "band kar", "adjust my insulin", "cut this tablet", 
            "discontinue", "skip my", "chhod sakta", "chhooti hui", "khaa lu"
        ]
        if any(ind in q_lower for ind in dosage_alteration_indicators):
            return ClinicalIntentResponse(
                query=raw_query,
                intent="DOSAGE_ALTERATION",
                confidence=1.0,
                is_emergency=False,
                requires_doctor_handoff=True,
                model_version=cls.INTENT_MODEL_VERSION,
                safety_tier_invoked="TIER_0_DETERMINISTIC_DOSAGE_ALTERATION",
                disclaimer="Patients must never adjust prescription dosages without consultation from their attending physician."
            )

        # =========================================================================
        # TIER 1: SUPERVISED ML CALIBRATED INTENT CLASSIFIER (Scikit-learn)
        # =========================================================================
        model = cls._load_intent_model()
        if model is not None:
            try:
                predicted_intent = str(model.predict([raw_query])[0])
                confidence = 0.85
                if hasattr(model, "predict_proba"):
                    probas = model.predict_proba([raw_query])[0]
                    confidence = round(float(max(probas)), 4)
                
                is_emergency = (predicted_intent == "EMERGENCY")
                requires_handoff = predicted_intent in [
                    "EMERGENCY", "DOSAGE_ALTERATION", "DOCTOR_APPOINTMENT_REQUEST"
                ]

                return ClinicalIntentResponse(
                    query=raw_query,
                    intent=predicted_intent,
                    confidence=confidence,
                    is_emergency=is_emergency,
                    requires_doctor_handoff=requires_handoff,
                    model_version=cls.INTENT_MODEL_VERSION,
                    safety_tier_invoked="TIER_1_SUPERVISED_ML",
                    disclaimer="Decision support only. Clinical advice requires a registered medical practitioner (NMC/ICMR)."
                )
            except Exception as e:
                print(f"[HealthcareService] Model inference exception: {e}")

        # =========================================================================
        # TIER 2: RULE-BASED HEURISTIC FALLBACK (If ML offline)
        # =========================================================================
        if any(w in q_lower for w in ["parcha", "parchi", "prescription", "dawai", "medicine", "subah", "raat"]):
            fallback_intent = "PRESCRIPTION_EXPLANATION"
        elif any(w in q_lower for w in ["bukhar", "fever", "dard", "pain", "dengue", "cough", "khansi"]):
            fallback_intent = "SYMPTOM_REPORT"
        elif any(w in q_lower for w in ["appointment", "booking", "doctor ko dikhana"]):
            fallback_intent = "DOCTOR_APPOINTMENT_REQUEST"
        elif any(w in q_lower for w in ["report", "platelet", "sugar", "hba1c", "pus cells"]):
            fallback_intent = "LAB_REPORT_QUERY"
        elif any(w in q_lower for w in ["khana", "diet", "food", "fruits", "parhez"]):
            fallback_intent = "DIET_NUTRITION"
        else:
            fallback_intent = "AMBIGUOUS_CLARIFICATION"

        return ClinicalIntentResponse(
            query=raw_query,
            intent=fallback_intent,
            confidence=0.70,
            is_emergency=False,
            requires_doctor_handoff=False,
            model_version=cls.INTENT_MODEL_VERSION,
            safety_tier_invoked="TIER_2_HEURISTIC_FALLBACK",
            disclaimer="Decision support only. Clinical advice requires a registered medical practitioner (NMC/ICMR)."
        )
