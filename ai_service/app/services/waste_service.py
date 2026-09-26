"""
SmartCity AI - Waste Management Intelligence Service
Provides smart bin fill-rate forecasting, collection priority ranking, and data readiness checks.
Dynamically utilizes trained Scikit-learn joblib model artifacts with resilient baseline fallback.
"""

import os
import joblib
from app.schemas import WastePredictionRequest, WastePredictionResponse

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "artifacts", "models", "waste_model.joblib")

class WasteService:
    MODEL_VERSION = "waste-priority-v2.0"
    _model = None
    _model_loaded = False

    @classmethod
    def _load_model(cls):
        if not cls._model_loaded:
            if os.path.exists(MODEL_PATH):
                try:
                    cls._model = joblib.load(MODEL_PATH)
                except Exception as e:
                    print(f"[WasteService] Warning loading joblib model: {e}")
                    cls._model = None
            cls._model_loaded = True
        return cls._model

    @classmethod
    def predict_fill_and_priority(cls, req: WastePredictionRequest) -> WastePredictionResponse:
        days = req.days_since_collection
        samples = req.historical_samples_count or 0

        # Assess data readiness
        data_readiness = "SUFFICIENT_DATA" if samples >= 20 else "LOW_DATA_HEURISTIC_BASELINE"

        # Baseline accumulation rate: ~24.5% per day
        fill_pct = min(100.0, round(days * 24.5, 1))

        model = cls._load_model()
        priority = None

        if model is not None:
            try:
                import pandas as pd
                ward_density = 1.4 if "golghar" in (req.ward or "").lower() else 1.1
                capacity = 660.0
                complaints = samples
                features = pd.DataFrame([{
                    "days_since_collection": days,
                    "ward_density": ward_density,
                    "capacity_liters": capacity,
                    "complaints_count": complaints
                }])
                predicted_priority = model.predict(features)[0]
                priority = str(predicted_priority)
            except Exception as e:
                print(f"[WasteService] Model inference error: {e}")
                priority = None

        if priority is None:
            if fill_pct >= 85.0:
                priority = "IMMEDIATE_DISPATCH"
            elif fill_pct >= 65.0:
                priority = "HIGH"
            elif fill_pct >= 40.0:
                priority = "MEDIUM"
            else:
                priority = "NORMAL"

        recommend_collect = priority in ["HIGH", "IMMEDIATE_DISPATCH"]

        return WastePredictionResponse(
            bin_id=req.bin_id,
            estimated_fill_pct=fill_pct,
            priority_rank=priority,
            collection_recommended=recommend_collect,
            data_readiness_status=data_readiness,
            model_version=cls.MODEL_VERSION
        )
