"""FastAPI Backend Server for CredNexa Loan Eligibility System."""

import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import pandas as pd
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ml.config import ARTIFACTS_DIR, COEFFS_PATH, METRICS_PATH, MODEL_PATH
from ml.predict import ValidationError, predict

app = FastAPI(
    title="CredNexa API",
    description="Backend Machine Learning Inference & Analytics Service for CredNexa Loan Screening",
    version="1.0.0",
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for applications log (or SQLite fallback)
APPLICATIONS_DB: List[Dict[str, Any]] = []


# --- Pydantic Data Schemas ---
class LoanApplicationRequest(BaseModel):
    applicant_name: str = Field(..., example="Jane Doe", description="Applicant full name")
    ApplicantIncome: float = Field(..., ge=0, example=55000, description="Monthly applicant income in INR")
    CoapplicantIncome: float = Field(0.0, ge=0, example=15000, description="Monthly co-applicant income in INR")
    LoanAmount: float = Field(..., gt=0, example=250, description="Requested loan amount in thousands (INR)")
    Loan_Amount_Term: float = Field(360.0, gt=0, example=360, description="Loan term in months")
    Credit_History: str = Field("1", example="1", description="Credit history flag: '1', '0', or 'Unknown'")
    Property_Area: str = Field("Semiurban", example="Semiurban", description="Urban, Semiurban, Rural, or Metro")
    Married: str = Field("Yes", example="Yes", description="Married status: Yes, No, Unknown")
    Education: str = Field("Graduate", example="Graduate", description="Graduate, Not Graduate, Unknown")
    Self_Employed: str = Field("No", example="No", description="Yes, No, Unknown")
    Dependents: str = Field("0", example="0", description="0, 1, 2, 3+, Unknown")


class TopFactor(BaseModel):
    feature: str
    direction: str
    impact: float


class Suggestion(BaseModel):
    change: str
    new_probability: float


class SegmentInfo(BaseModel):
    id: int
    name: str


class PredictionResponse(BaseModel):
    id: str
    applicant_name: str
    decision: str
    probability: float
    threshold: float
    segment: SegmentInfo
    top_factors: List[TopFactor]
    suggestions: List[Suggestion]
    model_version: str
    created_at: str


# --- Endpoints ---
@app.get("/api/v1/health", summary="Health Status")
def health_check():
    """Return backend health, model artifact existence, and active version."""
    model_loaded = MODEL_PATH.exists()
    metrics_loaded = METRICS_PATH.exists()
    return {
        "status": "healthy",
        "service": "CredNexa Backend API",
        "model_loaded": model_loaded,
        "metrics_loaded": metrics_loaded,
        "active_version": "v1",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/api/v1/predict", response_model=PredictionResponse, summary="Submit Loan Application")
def predict_loan_eligibility(payload: LoanApplicationRequest):
    """Execute ML prediction pipeline for an incoming loan application payload."""
    try:
        raw_dict = payload.model_dump()
        applicant_name = raw_dict.pop("applicant_name", "Anonymous Applicant")

        # Call core ML prediction engine
        res = predict(raw_dict)

        app_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()

        record = {
            "id": app_id,
            "applicant_name": applicant_name,
            **raw_dict,
            "decision": res["decision"],
            "probability": res["probability"],
            "threshold": res["threshold"],
            "segment": res["segment"],
            "top_factors": res["top_factors"],
            "suggestions": res["suggestions"],
            "model_version": res.get("model_version", "v1"),
            "created_at": created_at,
        }

        # Store in historical log
        APPLICATIONS_DB.insert(0, record)

        return record

    except ValidationError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=ve.message)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.get("/api/v1/applications", summary="List Application History")
def list_applications(limit: int = Query(50, ge=1, le=200)):
    """Retrieve history of submitted applications."""
    return {
        "total": len(APPLICATIONS_DB),
        "applications": APPLICATIONS_DB[:limit],
    }


@app.get("/api/v1/applications/{application_id}", summary="Get Application Detail")
def get_application(application_id: str):
    """Retrieve detailed assessment report by application UUID."""
    for app_record in APPLICATIONS_DB:
        if app_record["id"] == application_id:
            return app_record
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application record not found")


@app.get("/api/v1/admin/metrics", summary="Admin Analytics & Model Monitoring")
def get_admin_metrics():
    """Retrieve system benchmark metrics, coefficients, ROC curve data, and confusion matrix."""
    if not METRICS_PATH.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Metrics artifact not found")

    with open(METRICS_PATH, "r", encoding="utf-8") as f:
        metrics_data = json.load(f)

    coeffs = []
    if COEFFS_PATH.exists():
        df_coef = pd.read_csv(COEFFS_PATH)
        coeffs = df_coef.to_dict(orient="records")

    return {
        "unified_model_comparison": metrics_data.get("unified_model_comparison", {}),
        "final_calibrated_holdout": metrics_data.get("final_calibrated_holdout", {}),
        "chosen_threshold": metrics_data.get("chosen_threshold", 0.4145),
        "threshold_selection_source": metrics_data.get("threshold_selection_source", ""),
        "model_choice_rationale": metrics_data.get("model_choice_rationale", ""),
        "coefficients": coeffs,
        "metadata": metrics_data.get("metadata", {}),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
