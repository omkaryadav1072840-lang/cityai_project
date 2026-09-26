"""
SmartCity AI - Waste Collection Priority Classification Training Pipeline
Location: Gorakhpur, Uttar Pradesh
Framework: Scikit-learn, Pandas, NumPy, Joblib
Evaluates classification model with Precision, Recall, F1-score, and Confusion Matrix.
"""

import os
import json
import numpy as np
import pandas as pd
from datetime import datetime
import joblib
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, precision_recall_fscore_support

ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "..", "artifacts", "models")
os.makedirs(ARTIFACT_DIR, exist_ok=True)

MODEL_VERSION = "waste-priority-v2.0"
CLASSES = ["NORMAL", "MEDIUM", "HIGH", "IMMEDIATE_DISPATCH"]

def generate_benchmark_waste_dataset(samples=800):
    np.random.seed(42)
    data = []
    
    # Ward density factors (Ward 14 Golghar = high, Ward 4 Asuran = medium, etc.)
    ward_densities = [1.2, 1.5, 0.9, 1.8, 1.1]
    
    for _ in range(samples):
        days_since = float(np.random.exponential(scale=1.8))
        density = float(np.random.choice(ward_densities))
        capacity_liters = float(np.random.choice([240, 660, 1100]))
        complaints = int(np.random.poisson(lam=0.8 * density))
        
        # Calculate accumulation
        fill_pct = min(100.0, max(5.0, (days_since * 35.0 * density) + (complaints * 10.0) + np.random.normal(0, 5)))
        
        # Ground truth class
        if fill_pct >= 85.0 or complaints >= 3:
            priority = "IMMEDIATE_DISPATCH"
        elif fill_pct >= 65.0 or complaints >= 2:
            priority = "HIGH"
        elif fill_pct >= 40.0:
            priority = "MEDIUM"
        else:
            priority = "NORMAL"
            
        data.append({
            "days_since_collection": round(days_since, 2),
            "ward_density": round(density, 2),
            "capacity_liters": capacity_liters,
            "complaints_count": complaints,
            "fill_pct": round(fill_pct, 1),
            "priority": priority
        })
        
    return pd.DataFrame(data)

def train_and_evaluate_waste_model():
    print("--- 1. Generating & Validating Waste Priority Dataset ---")
    df = generate_benchmark_waste_dataset(samples=1000)
    print(f"Dataset shape: {df.shape}")
    print(f"Class distribution:\n{df['priority'].value_counts()}")
    
    feature_cols = ["days_since_collection", "ward_density", "capacity_liters", "complaints_count"]
    X = df[feature_cols]
    y = df["priority"]
    
    # Stratified Train/Test Split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    # Classifier Training
    clf = GradientBoostingClassifier(
        n_estimators=80,
        learning_rate=0.1,
        max_depth=4,
        random_state=42
    )
    clf.fit(X_train, y_train)
    
    # Evaluation on Held-Out Test Set
    y_pred = clf.predict(X_test)
    
    precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average="weighted")
    cm = confusion_matrix(y_test, y_pred, labels=CLASSES).tolist()
    report = classification_report(y_test, y_pred, output_dict=True)
    
    print("\n--- 2. Held-Out Classification Performance ---")
    print(f"  Weighted Precision: {precision:.3f}")
    print(f"  Weighted Recall:    {recall:.3f}")
    print(f"  Weighted F1-Score:  {f1:.3f}")
    print(f"  Confusion Matrix:\n{confusion_matrix(y_test, y_pred, labels=CLASSES)}")
    
    # Save Model Artifact
    artifact_path = os.path.join(ARTIFACT_DIR, "waste_model.joblib")
    joblib.dump(clf, artifact_path)
    print(f"\nSaved model artifact to: {artifact_path}")
    
    meta_path = os.path.join(ARTIFACT_DIR, "waste_model_meta.json")
    metadata = {
        "model_identifier": MODEL_VERSION,
        "framework": "scikit-learn (GradientBoostingClassifier)",
        "features": feature_cols,
        "classes": CLASSES,
        "metrics": {
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1_score": round(float(f1), 4),
            "confusion_matrix": cm
        },
        "evaluation_timestamp": datetime.now().isoformat(),
        "limitations": "Calibrated against municipal container volume models; actual fill sensor telemetry will supplement continuous online retraining."
    }
    
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to: {meta_path}")
    
    return metadata

if __name__ == "__main__":
    train_and_evaluate_waste_model()
