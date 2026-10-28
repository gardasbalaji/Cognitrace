
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "cognitrace_confusion_xgboost.pkl"
FEATURE_PATH = BASE_DIR / "cognitrace_confusion_features.txt"

FEATURES = [
    "Pause_Count",
    "Resume_Count",
    "Rewind_Count",
    "Forward_Seek_Count",
    "Playback_Speed_Num",
    "Completion_Num",
]

print("=" * 60)
print("COGNITRACE CONFUSION MODEL DIAGNOSTIC")
print("=" * 60)

# 1. Check model file
if not MODEL_PATH.exists():
    raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

model = joblib.load(MODEL_PATH)
print("\n[PASS] Model loaded:", type(model).__name__)

# 2. Check feature order
if FEATURE_PATH.exists():
    saved_features = FEATURE_PATH.read_text().splitlines()
    print("\nSaved feature order:", saved_features)
    assert saved_features == FEATURES, (
        "Feature order mismatch between training and test!"
    )
else:
    print("\n[WARNING] Feature metadata file is missing.")

model_features = getattr(model, "feature_names_in_", None)
if model_features is not None:
    print("Model feature names:", list(model_features))
    assert list(model_features) == FEATURES, (
        "Model expects a different feature order!"
    )

model_count = getattr(model, "n_features_in_", None)
print("Expected feature count:", model_count)

assert model_count == 6, (
    f"Expected six model features, got {model_count}"
)

# 3. Controlled test scenarios
cases = pd.DataFrame([
    # Pause, Resume, Rewind, Forward, Speed, Completion
    [0,  1,  0, 0, 1.0, 0.10],
    [1,  2,  0, 0, 1.0, 0.20],
    [2,  3,  2, 0, 1.0, 0.30],
    [3,  5,  4, 2, 0.75, 0.40],
    [4,  8,  8, 5, 1.0, 0.50],
], columns=FEATURES)

# 4. Run actual model inference
probabilities = model.predict_proba(cases)
predictions = model.predict(cases)

print("\nModel classes:", model.classes_)
print("\nTest results:")

for i, (_, row) in enumerate(cases.iterrows()):
    probability_map = dict(
        zip(model.classes_.tolist(), probabilities[i].tolist())
    )

    print(f"\nScenario {i + 1}")
    print("Input:", row.to_dict())
    print("Predicted class:", predictions[i])
    print("Class probabilities:", probability_map)

    # Only interpret class 1 as confusion if class 1 exists.
    if 1 in probability_map:
        score = probability_map[1] * 100
        print(f"Class-1 probability score: {score:.2f}%")

        if score >= 70:
            status = "High Confusion"
        elif score >= 35:
            status = "Medium Confusion"
        else:
            status = "Low Confusion"

        print("Threshold-based status:", status)

# 5. Basic probability sanity checks
assert probabilities.shape == (len(cases), len(model.classes_))
assert np.isfinite(probabilities).all()
assert np.allclose(probabilities.sum(axis=1), 1.0)
assert np.isfinite(predictions).all()

print("\n[PASS] All direct inference and probability checks completed.")
