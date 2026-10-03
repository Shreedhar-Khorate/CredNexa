"""
CredNexa — Supabase Client
Handles all cloud database operations via the Supabase REST API.
Uses the service-role key to bypass RLS for server-side writes.
"""
import os
import logging
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from supabase import create_client, Client

logger = logging.getLogger("crednexa_supabase")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(ENV_PATH):
    load_dotenv(dotenv_path=ENV_PATH)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://juayfkmjjzxhjiytjqoi.supabase.co")
# Always prefer the service-role key for backend operations (bypasses RLS)
SUPABASE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_KEY")
    or os.getenv("SUPABASE_ANON_KEY", "")
)

_supabase_client: Optional[Client] = None


def get_supabase() -> Optional[Client]:
    """Return a cached Supabase client initialised with the service-role key."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client
    try:
        if SUPABASE_URL and SUPABASE_KEY:
            _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            logger.info("Supabase client initialised → %s", SUPABASE_URL)
            return _supabase_client
    except Exception as exc:
        logger.warning("Failed to initialise Supabase client: %s", exc)
    return None


# ---------------------------------------------------------------------------
# User / Profile sync
# ---------------------------------------------------------------------------

def sync_user_to_supabase(user: Dict[str, Any]) -> bool:
    """
    Upsert a user row into public.profiles so applications can be linked.
    The profile id mirrors the SQLite user UUID so they stay in sync.
    """
    client = get_supabase()
    if not client or not user:
        return False
    try:
        payload = {
            "id": user["id"],
            "email": user["email"],
            "full_name": user.get("full_name", user["email"].split("@")[0]),
            "role": user.get("role", "user"),
            "is_active": True,
        }
        client.table("profiles").upsert(payload, on_conflict="id").execute()
        logger.info("Profile synced to Supabase for user %s", user["email"])
        return True
    except Exception as exc:
        logger.warning("Profile sync failed (non-critical): %s", exc)
        return False


def get_or_create_supabase_profile_id(user: Dict[str, Any]) -> Optional[str]:
    """Return the Supabase profile UUID for a user, syncing it first if needed."""
    user_id = user.get("id")
    if not user_id:
        return None
    sync_user_to_supabase(user)
    return user_id


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------

def save_application_supabase(app_data: Dict[str, Any], user_id: str, user: Optional[Dict[str, Any]] = None) -> bool:
    """
    Persist a loan assessment to Supabase public.applications.
    If a user object is provided the profile is synced first so the FK resolves.
    Returns True on success, False on failure (SQLite acts as fallback).
    """
    client = get_supabase()
    if not client:
        return False

    # Resolve the Supabase profile UUID — sync the user if we have their info
    supabase_uid: Optional[str] = None
    if user and user.get("id"):
        supabase_uid = get_or_create_supabase_profile_id(user)
    elif user_id and len(user_id) == 36 and "-" in user_id:
        # Try using the ID directly (may already be in profiles)
        supabase_uid = user_id

    try:
        # Decompose segment dict into flat columns
        segment = app_data.get("segment", {})
        cluster_id = segment.get("id") if isinstance(segment, dict) else None
        cluster_label = segment.get("name") if isinstance(segment, dict) else str(segment)

        payload: Dict[str, Any] = {
            "applicant_name": app_data.get("applicant_name", "Applicant"),
            "applicant_income": float(app_data.get("ApplicantIncome", 0)),
            "coapplicant_income": float(app_data.get("CoapplicantIncome", 0)),
            "loan_amount": float(app_data.get("LoanAmount", 0)),
            "loan_amount_term": int(float(app_data.get("Loan_Amount_Term", 360))),
            "credit_history": str(app_data.get("Credit_History", "1")),
            "property_area": str(app_data.get("Property_Area", "Semiurban")),
            "married": str(app_data.get("Married", "Yes")),
            "education": str(app_data.get("Education", "Graduate")),
            "self_employed": str(app_data.get("Self_Employed", "No")),
            "dependents": str(app_data.get("Dependents", "0")),
            "predicted_decision": app_data.get("decision", "Rejected"),
            "predicted_prob": float(app_data.get("probability", 0.0)),
            "decision_threshold": float(app_data.get("threshold", 0.414522)),
            "segment_cluster_id": cluster_id,
            "segment_label": cluster_label,
            "top_factors": app_data.get("top_factors", []),
            "suggestions": app_data.get("suggestions", []),
            "llm_explanation": app_data.get("llm_explanation"),
            "model_version": app_data.get("model_version", "v1.0"),
            "status": app_data.get("status", "pending"),
        }

        if supabase_uid:
            payload["user_id"] = supabase_uid

        res = client.table("applications").insert(payload).execute()
        if res.data:
            logger.info(
                "✅ Application saved to Supabase (id=%s, decision=%s)",
                res.data[0].get("id"),
                payload["predicted_decision"],
            )
            # Store the Supabase bigint ID back on app_data for cross-reference
            app_data["supabase_id"] = res.data[0].get("id")
            return True
        return False
    except Exception as exc:
        logger.warning("Supabase application insert failed → %s", exc)
        return False


def get_applications_supabase(
    user_id: Optional[str] = None, limit: int = 100
) -> Optional[List[Dict[str, Any]]]:
    """
    Fetch applications from Supabase, normalising column names for frontend compatibility.
    Returns None on error so callers can fall back to SQLite.
    """
    client = get_supabase()
    if not client:
        return None
    try:
        query = (
            client.table("applications")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
        )
        if user_id and len(user_id) == 36 and "-" in user_id:
            query = query.eq("user_id", user_id)

        res = query.execute()
        if res.data is None:
            return None

        results: List[Dict[str, Any]] = []
        for item in res.data:
            record = dict(item)
            # Normalise to camelCase/original keys expected by the frontend
            record["id"] = str(record.get("id", ""))
            record["ApplicantIncome"] = float(record.get("applicant_income", 0))
            record["CoapplicantIncome"] = float(record.get("coapplicant_income", 0))
            record["LoanAmount"] = float(record.get("loan_amount", 0))
            record["Loan_Amount_Term"] = float(record.get("loan_amount_term", 360))
            record["Credit_History"] = record.get("credit_history", "1")
            record["Property_Area"] = record.get("property_area", "Semiurban")
            record["Married"] = record.get("married", "Yes")
            record["Education"] = record.get("education", "Graduate")
            record["Self_Employed"] = record.get("self_employed", "No")
            record["Dependents"] = record.get("dependents", "0")
            record["decision"] = record.get("predicted_decision", "Rejected")
            record["probability"] = float(record.get("predicted_prob", 0.0))
            record["threshold"] = float(record.get("decision_threshold", 0.414522))
            record["segment"] = {
                "id": record.get("segment_cluster_id", 0),
                "name": record.get("segment_label", "Standard Risk Profile"),
            }
            results.append(record)
        return results
    except Exception as exc:
        logger.warning("Supabase applications fetch failed → %s", exc)
        return None


# ---------------------------------------------------------------------------
# Audit Logs
# ---------------------------------------------------------------------------

def save_audit_log_supabase(
    actor: Optional[Dict[str, Any]],
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    after_state: Optional[Dict[str, Any]] = None,
) -> bool:
    """Write an audit-log entry to Supabase public.audit_logs."""
    client = get_supabase()
    if not client:
        return False
    try:
        payload: Dict[str, Any] = {
            "action": action,
            "actor_role": actor.get("role") if actor else None,
            "resource_type": resource_type,
            "resource_id": str(resource_id) if resource_id else None,
            "after_state": after_state,
        }
        if actor and actor.get("id"):
            payload["actor_id"] = actor["id"]

        client.table("audit_logs").insert(payload).execute()
        return True
    except Exception as exc:
        logger.debug("Audit log sync failed (non-critical): %s", exc)
        return False
