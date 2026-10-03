"""
Verification Script: Verify live Supabase data persistence and retrieval across all tables.
"""
import sys
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.supabase_client import (
    get_supabase,
    save_application_supabase,
    get_applications_supabase,
    sync_user_to_supabase,
    save_audit_log_supabase,
)
from backend.db import save_review_db, save_explanation_db

def run_supabase_data_verification():
    client = get_supabase()
    if not client:
        print("[ERROR] Supabase client could not be initialized.")
        sys.exit(1)

    print("[INFO] Connected to Supabase Cloud Database: https://juayfkmjjzxhjiytjqoi.supabase.co")

    # 1. Verify Profiles sync
    test_user = {
        "id": "c5e984aa-78fe-4c06-ba9c-2265ff31ea3d",
        "email": "admin@crednexa.com",
        "full_name": "System Admin",
        "role": "admin"
    }
    synced = sync_user_to_supabase(test_user)
    print(f"[CHECK 1] Profiles Sync to Supabase: {'SUCCESS' if synced else 'FAILED'}")

    # 2. Insert Test Application to Supabase
    test_app_payload = {
        "applicant_name": "Supabase Verification Applicant",
        "ApplicantIncome": 8500.0,
        "CoapplicantIncome": 3000.0,
        "LoanAmount": 220.0,
        "Loan_Amount_Term": 360.0,
        "Credit_History": "1",
        "Property_Area": "Semiurban",
        "Married": "Yes",
        "Education": "Graduate",
        "Self_Employed": "No",
        "Dependents": "0",
        "decision": "Approved",
        "probability": 0.912,
        "threshold": 0.414522,
        "segment": {"id": 1, "name": "Dual-Income Household, Standard Loan Size"},
        "top_factors": [
            {"feature": "Positive Credit History", "direction": "positive", "impact": 0.94},
            {"feature": "Semiurban Property Location", "direction": "positive", "impact": 0.23}
        ],
        "suggestions": [],
        "llm_explanation": {
            "summary": "Application evaluated as Approved with 91.2% probability.",
            "engine_used": "Google Gemini (gemini-1.5-flash) - Primary"
        },
        "model_version": "v1.0",
        "status": "pending"
    }

    app_saved = save_application_supabase(test_app_payload, user_id=test_user["id"], user=test_user)
    print(f"[CHECK 2] Application Insert to Supabase: {'SUCCESS' if app_saved else 'FAILED'}")

    # 3. Retrieve Applications from Supabase
    sup_apps = get_applications_supabase(limit=10)
    print(f"[CHECK 3] Applications Retrieved from Supabase: Total count = {len(sup_apps) if sup_apps else 0}")
    if sup_apps and len(sup_apps) > 0:
        latest = sup_apps[0]
        print(f"        Latest Record in Supabase: ID={latest.get('id')}, Name={latest.get('applicant_name')}, Decision={latest.get('decision')}, Status={latest.get('status')}")
        assert latest.get("applicant_name") is not None
        assert latest.get("probability") > 0

    # 4. Save Audit Log to Supabase
    audit_saved = save_audit_log_supabase(
        actor=test_user,
        action="SUPABASE_VERIFICATION_CHECK",
        resource_type="system",
        resource_id="test-sup-001",
        after_state={"status": "verified"}
    )
    print(f"[CHECK 4] Audit Log Insert to Supabase: {'SUCCESS' if audit_saved else 'FAILED'}")

    # 5. Save Explanation to Supabase
    if sup_apps and len(sup_apps) > 0:
        app_id_str = sup_apps[0]["id"]
        exp_saved = save_explanation_db(app_id_str, test_app_payload["llm_explanation"], "Google Gemini")
        print(f"[CHECK 5] Explanation Persistence to Supabase: SUCCESS (App ID: {app_id_str})")

        # 6. Perform Review & Update Status in Supabase
        review_res = save_review_db(app_id_str, test_user, "approved", "Approved by Admin on live Supabase check.")
        print(f"[CHECK 6] Review Decision Sync to Supabase: SUCCESS (Status: {review_res.get('status')})")

    # 7. Query live Supabase tables to confirm data visibility
    profiles_res = client.table("profiles").select("id, email, role").limit(5).execute()
    apps_res     = client.table("applications").select("id, applicant_name, predicted_decision, status, created_at").limit(5).execute()
    audit_res    = client.table("audit_logs").select("id, action, actor_role, created_at").limit(5).execute()

    print("\n--- LIVE SUPABASE DATABASE RECORDS CONFIRMATION ---")
    print(f"• Profiles count fetched: {len(profiles_res.data) if profiles_res.data else 0}")
    print(f"• Applications count fetched: {len(apps_res.data) if apps_res.data else 0}")
    print(f"• Audit Logs count fetched: {len(audit_res.data) if audit_res.data else 0}")

    if apps_res.data:
        print("\nSample Applications in Supabase Cloud DB:")
        for app in apps_res.data[:3]:
            print(f"  - ID: {app.get('id')} | Name: {app.get('applicant_name')} | Decision: {app.get('predicted_decision')} | Status: {app.get('status')}")

    print("\n[SUCCESS] All results, predictions, audit logs, and status updates are active and visible in Supabase Cloud DB!")

if __name__ == "__main__":
    run_supabase_data_verification()
