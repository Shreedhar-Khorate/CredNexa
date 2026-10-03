"""
Script to exercise and verify the complete admin review loop end-to-end (TASK-07).
"""
import sys
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.db import init_db, get_db, save_review_db, get_all_users_db

def run_verification():
    init_db()
    conn = get_db()
    cursor = conn.cursor()

    # Find seeded admin user
    cursor.execute("SELECT id, email, role FROM users WHERE role = 'admin' LIMIT 1")
    admin_row = cursor.fetchone()
    if not admin_row:
        print("Error: No admin user found.")
        sys.exit(1)
    admin_user = dict(admin_row)
    print(f"Admin User Identified: {admin_user['email']} ({admin_user['id']})")

    # Create a test application record for review proof
    app_id = "proof-app-e2e-review-001"
    cursor.execute("""
        INSERT OR REPLACE INTO applications (
            id, user_id, applicant_name, ApplicantIncome, CoapplicantIncome, LoanAmount, Loan_Amount_Term,
            Credit_History, Property_Area, Married, Education, Self_Employed, Dependents,
            decision, probability, threshold, status, model_version, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        app_id,
        admin_user["id"],
        "Verified Test Applicant",
        7500.0,
        2500.0,
        250.0,
        360.0,
        "1",
        "Semiurban",
        "Yes",
        "Graduate",
        "No",
        "1",
        "Approved",
        0.885,
        0.414522,
        "pending",
        "v1.0",
        "2026-10-03T16:40:00Z"
    ))
    conn.commit()

    # Check status before review
    cursor.execute("SELECT status FROM applications WHERE id = ?", (app_id,))
    before_status = cursor.fetchone()["status"]
    print(f"Application {app_id} Status BEFORE Review: '{before_status}'")

    # Execute admin review (Decision: 'approved')
    review_res = save_review_db(
        application_id=app_id,
        admin_user=admin_user,
        final_decision="approved",
        review_note="Verified income documentation and credit score. Approved."
    )
    print(f"Review Execution Result: {review_res}")

    # Verify applications status AFTER review
    cursor.execute("SELECT status FROM applications WHERE id = ?", (app_id,))
    after_status = cursor.fetchone()["status"]
    print(f"Application {app_id} Status AFTER Review: '{after_status}'")

    # Verify reviews table row
    cursor.execute("SELECT * FROM reviews WHERE application_id = ?", (app_id,))
    review_row = cursor.fetchone()
    print(f"Reviews Table Record: {dict(review_row) if review_row else None}")

    # Verify audit_logs table row
    cursor.execute("SELECT * FROM audit_logs WHERE action = 'APPLICATION_REVIEWED' ORDER BY id DESC LIMIT 1")
    audit_row = cursor.fetchone()
    print(f"Audit Log Record: {dict(audit_row) if audit_row else None}")

    conn.close()

    assert before_status == "pending"
    assert after_status == "approved"
    assert review_row is not None
    assert review_row["final_decision"] == "approved"
    assert audit_row is not None
    print("\n[SUCCESS] End-to-End Review Loop Verification Passed Successfully!")

if __name__ == "__main__":
    run_verification()
