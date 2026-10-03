import os
import json
import logging
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from supabase import create_client, Client

logger = logging.getLogger("crednexa_supabase")

# Load environment variables
ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(ENV_PATH):
    load_dotenv(dotenv_path=ENV_PATH)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://juayfkmjjzxhjiytjqoi.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY", "sb_publishable__TxFRVLnsBbiKNNNs3002w_2x77emwq")

_supabase_client: Optional[Client] = None

def get_supabase() -> Optional[Client]:
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client
    try:
        if SUPABASE_URL and SUPABASE_KEY:
            _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            logger.info("Supabase client initialized with URL: %s", SUPABASE_URL)
            return _supabase_client
    except Exception as e:
        logger.warning("Failed to initialize Supabase client: %s", e)
    return None

def save_application_supabase(app_data: Dict[str, Any], user_id: str) -> bool:
    client = get_supabase()
    if not client:
        return False
    try:
        payload = {
            "id": app_data.get("id"),
            "user_id": user_id,
            "applicant_name": app_data.get("applicant_name", "Applicant"),
            "applicant_income": float(app_data.get("ApplicantIncome", 0)),
            "coapplicant_income": float(app_data.get("CoapplicantIncome", 0)),
            "loan_amount": float(app_data.get("LoanAmount", 0)),
            "loan_term": float(app_data.get("Loan_Amount_Term", 360)),
            "credit_history": str(app_data.get("Credit_History", "1")),
            "property_area": str(app_data.get("Property_Area", "Semiurban")),
            "married": str(app_data.get("Married", "Yes")),
            "education": str(app_data.get("Education", "Graduate")),
            "self_employed": str(app_data.get("Self_Employed", "No")),
            "dependents": str(app_data.get("Dependents", "0")),
            "decision": app_data.get("decision", "Rejected"),
            "probability": float(app_data.get("probability", 0.0)),
            "threshold": float(app_data.get("threshold", 0.4145)),
            "segment": json.dumps(app_data.get("segment", {})),
            "top_factors": json.dumps(app_data.get("top_factors", [])),
            "suggestions": json.dumps(app_data.get("suggestions", [])),
            "llm_explanation": json.dumps(app_data.get("llm_explanation")),
            "model_version": app_data.get("model_version", "v1"),
            "status": app_data.get("status", "pending"),
            "created_at": app_data.get("created_at")
        }
        res = client.table("applications").upsert(payload).execute()
        logger.info("Successfully saved application %s to Supabase DB", app_data.get("id"))
        return True
    except Exception as e:
        logger.warning("Supabase insert error (falling back to SQLite): %s", e)
        return False

def get_applications_supabase(user_id: Optional[str] = None, limit: int = 100) -> Optional[List[Dict[str, Any]]]:
    client = get_supabase()
    if not client:
        return None
    try:
        query = client.table("applications").select("*").order("created_at", desc=True).limit(limit)
        if user_id:
            query = query.eq("user_id", user_id)
        res = query.execute()
        if res.data is not None:
            results = []
            for item in res.data:
                record = dict(item)
                # Map field names if stored in snake_case
                record["ApplicantIncome"] = record.get("applicant_income", record.get("ApplicantIncome", 0))
                record["CoapplicantIncome"] = record.get("coapplicant_income", record.get("CoapplicantIncome", 0))
                record["LoanAmount"] = record.get("loan_amount", record.get("LoanAmount", 0))
                record["Loan_Amount_Term"] = record.get("loan_term", record.get("Loan_Amount_Term", 360))
                record["Credit_History"] = record.get("credit_history", record.get("Credit_History", "1"))
                record["Property_Area"] = record.get("property_area", record.get("Property_Area", "Semiurban"))
                
                for json_field in ["segment", "top_factors", "suggestions", "llm_explanation"]:
                    val = record.get(json_field)
                    if isinstance(val, str):
                        try: record[json_field] = json.loads(val)
                        except: pass
                results.append(record)
            return results
    except Exception as e:
        logger.warning("Supabase query error (falling back to SQLite): %s", e)
    return None
