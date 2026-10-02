"""Prediction API module for CredNexa ML model."""

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import numpy as np
import pandas as pd
import joblib

from ml.config import (
    CLUSTER_PATH,
    DEFAULT_THRESHOLD,
    METRICS_PATH,
    MODEL_PATH,
)


class ValidationError(Exception):
    """Exception raised when input payload fails schema validation."""

    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(f"Validation error on field '{field}': {message}")


def validate_input(form: dict) -> dict:
    """Validate raw form dictionary and set defaults."""
    if not isinstance(form, dict):
        raise ValidationError("form", "Input must be a dictionary.")

    clean_form = {}

    # Required numeric fields
    for field in ["ApplicantIncome", "LoanAmount"]:
        if field not in form or form[field] is None:
            raise ValidationError(field, f"Field '{field}' is required.")
        try:
            val = float(form[field])
            if val < 0:
                raise ValidationError(field, f"Field '{field}' cannot be negative.")
            clean_form[field] = val
        except (ValueError, TypeError):
            raise ValidationError(field, f"Field '{field}' must be a numeric value.")

    # Optional / defaulted numeric fields
    for field, default_val in [("CoapplicantIncome", 0.0), ("Loan_Amount_Term", 360.0)]:
        val = form.get(field, default_val)
        if val is None:
            val = default_val
        try:
            f_val = float(val)
            if f_val < 0:
                raise ValidationError(field, f"Field '{field}' cannot be negative.")
            clean_form[field] = f_val
        except (ValueError, TypeError):
            raise ValidationError(field, f"Field '{field}' must be a numeric value.")

    # Categorical fields
    for field in ["Married", "Education", "Self_Employed", "Dependents", "Property_Area", "Credit_History"]:
        val = form.get(field, "Unknown")
        if val is None or str(val).strip() == "":
            val = "Unknown"
        clean_form[field] = str(val).strip()

    return clean_form


def load_artifacts():
    """Load model, clusterer, and metrics metadata."""
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}. Train model first.")

    model = joblib.load(MODEL_PATH)

    clusterer = None
    if CLUSTER_PATH.exists():
        try:
            clusterer = joblib.load(CLUSTER_PATH)
        except Exception:
            pass

    threshold = DEFAULT_THRESHOLD
    if METRICS_PATH.exists():
        try:
            with open(METRICS_PATH, "r", encoding="utf-8") as f:
                metrics_data = json.load(f)
                threshold = float(metrics_data.get("chosen_threshold", DEFAULT_THRESHOLD))
        except Exception:
            pass

    return model, clusterer, threshold


def compute_explainability(model, raw_df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Compute feature importances / contributions for single record."""
    try:
        base_pipeline = model.calibrated_classifiers_[0].estimator
        preprocessor = base_pipeline.named_steps["pre"]
        clf = base_pipeline.named_steps["clf"]

        from ml.preprocess import add_features
        df_feat = add_features(raw_df)
        X_trans = preprocessor.transform(df_feat)[0]
        coefs = clf.coef_[0]

        num_cols = list(preprocessor.transformers_[0][2])
        cat_cols = list(preprocessor.transformers_[1][2])
        cat_oh = preprocessor.named_transformers_["cat"].named_steps["oh"]
        cat_names = list(cat_oh.get_feature_names_out(cat_cols))
        feature_names = num_cols + cat_names

        contributions = X_trans * coefs

        readable_map = {
            "Credit_History_1": "Positive Credit History",
            "Credit_History_0": "Negative Credit History",
            "Credit_History_Unknown": "Unknown Credit History",
            "LoanToIncome": "Loan Size relative to Income",
            "Log_ApplicantIncome": "Applicant Income Level",
            "Log_CoapplicantIncome": "Co-applicant Income Level",
            "Log_LoanAmount": "Requested Loan Amount",
            "EMI": "Monthly Repayment EMI",
            "Loan_Amount_Term": "Loan Tenure",
            "Property_Area_Semiurban": "Semiurban Property Location",
            "Property_Area_Rural": "Rural Property Location",
            "Property_Area_Urban": "Urban Property Location",
            "Education_Not Graduate": "Education Status (Not Graduate)",
            "Education_Graduate": "Education Status (Graduate)",
            "Married_Yes": "Applicant Married",
            "Married_No": "Applicant Single",
            "Dependents_0": "No Dependents",
            "Dependents_1": "1 Dependent",
            "Dependents_2": "2 Dependents",
            "Dependents_3+": "3+ Dependents",
        }

        factors = []
        for name, impact in zip(feature_names, contributions):
            if abs(impact) > 0.05:
                direction = "positive" if impact > 0 else "negative"
                label = readable_map.get(name, name.replace("_", " "))
                factors.append({
                    "feature": label,
                    "direction": direction,
                    "impact": round(float(impact), 3)
                })

        factors.sort(key=lambda x: abs(x["impact"]), reverse=True)
        return factors[:4]
    except Exception as e:
        return []


def generate_suggestions(model, clean_form: dict, current_prob: float, threshold: float) -> List[Dict[str, Any]]:
    """Generate actionable suggestions if approval probability is low or rejected."""
    suggestions = []
    if current_prob >= threshold + 0.15:
        return suggestions

    # Suggestion 1: Reduce loan amount by 15%
    if clean_form["LoanAmount"] > 20:
        alt_form = clean_form.copy()
        alt_form["LoanAmount"] = round(clean_form["LoanAmount"] * 0.85, 1)
        alt_prob = float(model.predict_proba(pd.DataFrame([alt_form]))[0, 1])
        if alt_prob > current_prob + 0.01:
            suggestions.append({
                "change": f"Reduce loan amount by 15% (to INR {alt_form['LoanAmount']}k)",
                "new_probability": round(alt_prob, 2)
            })

    # Suggestion 2: Extend term to 360 months if less
    if clean_form["Loan_Amount_Term"] < 360:
        alt_form = clean_form.copy()
        alt_form["Loan_Amount_Term"] = 360.0
        alt_prob = float(model.predict_proba(pd.DataFrame([alt_form]))[0, 1])
        if alt_prob > current_prob + 0.01:
            suggestions.append({
                "change": "Extend loan term to 360 months (30 years)",
                "new_probability": round(alt_prob, 2)
            })

    # Suggestion 3: Add co-applicant income if 0
    if clean_form["CoapplicantIncome"] <= 0:
        alt_form = clean_form.copy()
        alt_form["CoapplicantIncome"] = 15000.0
        alt_prob = float(model.predict_proba(pd.DataFrame([alt_form]))[0, 1])
        if alt_prob > current_prob + 0.01:
            suggestions.append({
                "change": "Add a co-applicant income (e.g. INR 15,000/mo)",
                "new_probability": round(alt_prob, 2)
            })

    return suggestions


def predict(form: dict) -> dict:
    """Predict loan eligibility contract for a raw form payload."""
    clean_form = validate_input(form)
    raw_df = pd.DataFrame([clean_form])

    model, clusterer, threshold = load_artifacts()

    prob = float(model.predict_proba(raw_df)[0, 1])
    decision = "Approved" if prob >= threshold else "Rejected"

    segment_info = {"id": 0, "name": "Standard Profile"}
    if clusterer is not None:
        try:
            cids, names = clusterer.predict(raw_df)
            segment_info = {"id": int(cids[0]), "name": names[0]}
        except Exception:
            pass

    top_factors = compute_explainability(model, raw_df)
    suggestions = generate_suggestions(model, clean_form, prob, threshold)

    return {
        "decision": decision,
        "probability": round(prob, 2),
        "threshold": round(threshold, 2),
        "segment": segment_info,
        "top_factors": top_factors,
        "suggestions": suggestions,
        "model_version": "v1",
    }
