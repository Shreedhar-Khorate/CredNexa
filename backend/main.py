import json
import logging
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

# Set up logging format and logger instance
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("crednexa_backend")

# Ensure project root is in sys.path and load environment variables
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

ENV_PATH = BASE_DIR / "backend" / ".env"
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)

import pandas as pd
from fastapi import FastAPI, HTTPException, Query, Header, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ml.config import ARTIFACTS_DIR, COEFFS_PATH, METRICS_PATH, MODEL_PATH
from ml.predict import ValidationError, predict
from backend.services.llm_service import explain_assessment
from backend.db import (
    init_db,
    save_application_db,
    get_applications_db,
    get_application_by_id_db,
    create_user_db,
    authenticate_user_db,
    get_user_by_id_db,
    get_all_users_db,
    get_audit_logs_db,
    save_review_db,
    save_explanation_db,
    update_user_role_db,
    set_user_active_db,
    log_model_deployment_db,
)

from backend.auth import (
    create_access_token,
    get_current_user,
    get_current_user_optional,
    get_admin_user,
)

app = FastAPI(
    title="CredNexa API",
    description="Backend Machine Learning Inference, Database & Analytics Service for CredNexa Loan Screening",
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


@app.on_event("startup")
def on_startup():
    """Initialize SQLite database tables and seed demo accounts on server boot."""
    init_db()
    logger.info("CredNexa SQLite database initialized and ready.")


# --- Pydantic Data Schemas ---
class UserRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, description="Full Name")
    email: str = Field(..., description="Email Address")
    password: str = Field(..., min_length=6, description="Password")


class UserLoginRequest(BaseModel):
    email: str = Field(..., description="Email Address")
    password: str = Field(..., description="Password")


class AuthResponse(BaseModel):
    token: str
    user: Dict[str, Any]


class LoanApplicationRequest(BaseModel):
    applicant_name: str = Field(..., description="Applicant full name")
    ApplicantIncome: float = Field(..., ge=0, description="Monthly applicant income in INR")
    CoapplicantIncome: float = Field(0.0, ge=0, description="Monthly co-applicant income in INR")
    LoanAmount: float = Field(..., gt=0, description="Requested loan amount in thousands (INR)")
    Loan_Amount_Term: float = Field(360.0, gt=0, description="Loan term in months")
    Credit_History: str = Field("1", description="Credit history flag: '1', '0', or 'Unknown'")
    Property_Area: str = Field("Semiurban", description="Urban, Semiurban, Rural, or Metro")
    Married: str = Field("Yes", description="Married status: Yes, No, Unknown")
    Education: str = Field("Graduate", description="Graduate, Not Graduate, Unknown")
    Self_Employed: str = Field("No", description="Yes, No, Unknown")
    Dependents: str = Field("0", description="0, 1, 2, 3+, Unknown")


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
    llm_explanation: Optional[Dict[str, Any]] = None
    model_version: str
    created_at: str


class ApplicationReviewRequest(BaseModel):
    final_decision: str = Field(..., description="Review decision: 'approved', 'rejected', or 'deferred'")
    review_note: Optional[str] = Field(None, description="Optional admin review notes")


class UserRoleUpdateRequest(BaseModel):
    role: str = Field(..., description="Role: 'user' or 'admin'")


class UserActiveUpdateRequest(BaseModel):
    is_active: bool = Field(..., description="Active status")


class ModelDeployRequest(BaseModel):
    model_version: str = Field(..., description="Model version tag e.g. 'v1.0'")
    notes: Optional[str] = Field(None, description="Optional release notes")


# --- Endpoints ---
@app.get("/api/v1/health", summary="Health Status")
def health_check():
    """Return backend health, model artifact existence, active version, and LLM configuration."""
    model_loaded = MODEL_PATH.exists()
    metrics_loaded = METRICS_PATH.exists()
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    return {
        "status": "healthy",
        "service": "CredNexa Backend API with SQLite Persistence",
        "model_loaded": model_loaded,
        "metrics_loaded": metrics_loaded,
        "active_version": "v1",
        "llm_config": {
            "gemini_configured": bool(gemini_key and gemini_key != "your_gemini_api_key_here"),
            "model": os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# --- Auth Endpoints ---
@app.post("/api/v1/auth/register", response_model=AuthResponse, summary="Register User")
def register_user(payload: UserRegisterRequest):
    """Register a new user account."""
    try:
        user = create_user_db(
            full_name=payload.full_name,
            email=payload.email,
            password=payload.password,
            role="user"
        )
        token = create_access_token(user_id=user["id"], email=user["email"], role=user["role"])
        return {"token": token, "user": user}
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/api/v1/auth/login", response_model=AuthResponse, summary="User Login")
def login_user(payload: UserLoginRequest):
    """Authenticate user with email and password."""
    user = authenticate_user_db(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token = create_access_token(user_id=user["id"], email=user["email"], role=user["role"])
    return {"token": token, "user": user}


@app.get("/api/v1/auth/me", summary="Get Current User Profile")
def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    """Fetch current user profile from bearer token."""
    return user


# --- Loan & Prediction Endpoints ---
@app.post("/api/v1/predict", response_model=PredictionResponse, summary="Submit Loan Application")
def predict_loan_eligibility(
    payload: LoanApplicationRequest,
    authorization: Optional[str] = Header(None)
):
    """Execute ML prediction pipeline, generate LLM reasoning, and persist application in SQLite DB."""
    try:
        raw_dict = payload.model_dump()
        applicant_name = raw_dict.pop("applicant_name", "Anonymous Applicant")

        # Get user ID if authenticated, else assign default system demo user
        current_user = get_current_user_optional(authorization)
        user_id = current_user["id"] if current_user else "anonymous_system_user"

        logger.info(f"Processing loan application for: {applicant_name} (user_id: {user_id})")

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

        # Generate evidence-grounded LLM explanation directly in prediction response
        try:
            explanation = explain_assessment(record)
            record["llm_explanation"] = explanation
        except Exception as llm_err:
            logger.warning("Failed to generate LLM explanation on predict: %s", llm_err)
            record["llm_explanation"] = None

        # Persist to SQLite + Supabase Cloud DB (Supabase is primary)
        save_application_db(record, user_id=user_id, calling_user=current_user)

        # Persist to explanations table as source of truth
        if record.get("llm_explanation"):
            try:
                save_explanation_db(
                    application_id=app_id,
                    explanation_data=record["llm_explanation"],
                    llm_provider=record["llm_explanation"].get("engine_used")
                )
            except Exception as exp_save_err:
                logger.warning("Failed to persist explanation to explanations table: %s", exp_save_err)

        logger.info(f"Application {app_id} saved — decision={res['decision']}, prob={res['probability']:.4f}")
        return record

    except ValidationError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=ve.message)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.get("/api/v1/applications", summary="List Application History")
def list_applications(
    limit: int = Query(50, ge=1, le=200),
    authorization: Optional[str] = Header(None)
):
    """Retrieve applications from Supabase (primary) with SQLite fallback."""
    current_user = get_current_user_optional(authorization)
    # get_applications_db already tries Supabase first, then falls back to SQLite
    if current_user and current_user.get("role") != "admin":
        apps = get_applications_db(user_id=current_user["id"], limit=limit)
    else:
        apps = get_applications_db(user_id=None, limit=limit)
    return {
        "total": len(apps),
        "applications": apps,
    }


@app.get("/api/v1/applications/{application_id}", summary="Get Application Detail")
def get_application(application_id: str):
    """Retrieve detailed assessment report by application UUID from database."""
    app_record = get_application_by_id_db(application_id)
    if not app_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application record not found")
    return app_record


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
        "coefficients": coeffs,
        "metadata": metrics_data.get("metadata", {}),
    }


@app.get("/api/v1/admin/users", summary="List All Users (Admin)")
def admin_list_users(admin: Dict[str, Any] = Depends(get_admin_user)):
    """List registered users from SQLite + Supabase profiles merged."""
    from backend.supabase_client import get_supabase

    sqlite_users = get_all_users_db()

    # Enrich with Supabase profiles (has extra fields like is_active, avatar_url)
    try:
        client = get_supabase()
        if client:
            sup_res = client.table("profiles").select("*").order("created_at", desc=True).execute()
            if sup_res.data:
                # Merge: prefer Supabase data but include any SQLite-only users
                sup_ids = {p["id"] for p in sup_res.data}
                sqlite_only = [u for u in sqlite_users if u["id"] not in sup_ids]
                merged = sup_res.data + sqlite_only
                return {"users": merged, "source": "supabase+sqlite"}
    except Exception as e:
        logger.warning("Supabase user fetch failed, using SQLite: %s", e)

    return {"users": sqlite_users, "source": "sqlite"}


@app.get("/api/v1/admin/audit", summary="Get Audit Logs (Admin)")
def admin_get_audit(
    limit: int = Query(200, ge=1, le=500),
    admin: Dict[str, Any] = Depends(get_admin_user)
):
    """List system audit logs from Supabase (primary) with SQLite fallback."""
    from backend.supabase_client import get_supabase

    try:
        client = get_supabase()
        if client:
            sup_res = (
                client.table("audit_logs")
                .select("*")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            if sup_res.data is not None:
                return {"audit_logs": sup_res.data, "source": "supabase"}
    except Exception as e:
        logger.warning("Supabase audit fetch failed, using SQLite: %s", e)

    return {"audit_logs": get_audit_logs_db(limit=limit), "source": "sqlite"}


@app.post("/api/v1/admin/applications/{application_id}/review", summary="Review Loan Application (Admin)")
def review_application(
    application_id: str,
    payload: ApplicationReviewRequest,
    admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Process administrative review of a pending loan application.
    Maps final_decision 'deferred' -> applications.status 'reviewed' due to schema CHECK constraint.
    """
    decision_clean = payload.final_decision.lower().strip()
    if decision_clean not in ["approved", "rejected", "deferred"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="final_decision must be one of: 'approved', 'rejected', 'deferred'"
        )

    review_result = save_review_db(
        application_id=application_id,
        admin_user=admin,
        final_decision=decision_clean,
        review_note=payload.review_note
    )
    return {
        "status": "success",
        "review": review_result
    }


@app.put("/api/v1/admin/users/{target_user_id}/role", summary="Update User Role (Admin)")
def admin_update_user_role(
    target_user_id: str,
    payload: UserRoleUpdateRequest,
    admin: Dict[str, Any] = Depends(get_admin_user)
):
    """Update user role and log USER_ROLE_CHANGED audit event."""
    try:
        res = update_user_role_db(target_user_id=target_user_id, new_role=payload.role.lower().strip(), admin_user=admin)
        return {"status": "success", "user": res}
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))


@app.put("/api/v1/admin/users/{target_user_id}/active", summary="Toggle User Active Status (Admin)")
def admin_toggle_user_active(
    target_user_id: str,
    payload: UserActiveUpdateRequest,
    admin: Dict[str, Any] = Depends(get_admin_user)
):
    """Activate or deactivate user account and log USER_ACTIVATED / USER_DEACTIVATED audit event."""
    res = set_user_active_db(target_user_id=target_user_id, is_active=payload.is_active, admin_user=admin)
    return {"status": "success", "user": res}


@app.post("/api/v1/admin/model/deploy", summary="Record Model Deployment (Admin)")
def admin_deploy_model(
    payload: ModelDeployRequest,
    admin: Dict[str, Any] = Depends(get_admin_user)
):
    """Log MODEL_DEPLOYED audit event upon activating a new ML model version."""
    res = log_model_deployment_db(model_version=payload.model_version, admin_user=admin, notes=payload.notes)
    return {"status": "success", "deployment": res}


@app.post("/api/v1/llm/explain", summary="Generate AI Explanation from Assessment Object")
def explain_assessment_payload(payload: Dict[str, Any]):
    """Generate structured AI explanation for an assessment object."""
    try:
        explanation = explain_assessment(payload)
        return {
            "status": "success",
            "explanation": explanation
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/api/v1/llm/explain/{application_id}", summary="Generate AI Explanation by Application UUID")
def explain_application_by_id(application_id: str):
    """Retrieve saved application from DB by ID, generate AI explanation, and persist to explanations table."""
    target_record = get_application_by_id_db(application_id)
    if not target_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application record not found")
        
    explanation = explain_assessment(target_record)
    save_explanation_db(
        application_id=application_id,
        explanation_data=explanation,
        llm_provider=explanation.get("engine_used")
    )
    return {
        "status": "success",
        "application_id": application_id,
        "explanation": explanation
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
