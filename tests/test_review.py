"""
Unit tests for Admin Application Review & Status Mapping (TASK-03)
"""
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.db import init_db, save_review_db, get_db
from backend.auth import create_access_token

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def test_status_mapping_deferred():
    """Verify that final_decision='deferred' maps to applications.status='reviewed'."""
    admin_user = {"id": "test_admin_id", "email": "admin@crednexa.com", "role": "admin"}
    
    # Save test application in SQLite
    conn = get_db()
    cursor = conn.cursor()
    app_id = "test-app-deferred-001"
    cursor.execute("""
        INSERT OR REPLACE INTO applications (
            id, user_id, applicant_name, ApplicantIncome, CoapplicantIncome, LoanAmount, Loan_Amount_Term,
            Credit_History, Property_Area, Married, Education, Self_Employed, Dependents,
            decision, probability, threshold, status, model_version, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (app_id, "test_user_id", "Test Applicant", 5000, 0, 150, 360, "1", "Urban", "Yes", "Graduate", "No", "0", "Approved", 0.85, 0.4145, "pending", "v1", "2026-10-03T10:00:00Z"))
    conn.commit()
    conn.close()

    # Execute review with 'deferred'
    res = save_review_db(app_id, admin_user, "deferred", "Need further income documentation")
    assert res["status"] == "reviewed"
    assert res["final_decision"] == "deferred"

    # Verify database state
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM applications WHERE id = ?", (app_id,))
    row = cursor.fetchone()
    conn.close()
    assert row["status"] == "reviewed"

def test_admin_review_api_endpoint():
    """Verify POST /api/v1/admin/applications/{id}/review endpoint authorization & mapping."""
    # Fetch seeded admin user from database
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, role FROM users WHERE role = 'admin' LIMIT 1")
    admin_row = dict(cursor.fetchone())
    admin_token = create_access_token(admin_row["id"], admin_row["email"], admin_row["role"])
    
    # Save test application
    app_id = "test-app-approved-001"
    cursor.execute("""
        INSERT OR REPLACE INTO applications (
            id, user_id, applicant_name, ApplicantIncome, CoapplicantIncome, LoanAmount, Loan_Amount_Term,
            Credit_History, Property_Area, Married, Education, Self_Employed, Dependents,
            decision, probability, threshold, status, model_version, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (app_id, admin_row["id"], "Test Applicant 2", 6000, 2000, 200, 360, "1", "Urban", "Yes", "Graduate", "No", "0", "Approved", 0.90, 0.4145, "pending", "v1", "2026-10-03T10:00:00Z"))
    conn.commit()
    conn.close()

    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {"final_decision": "approved", "review_note": "Approved by senior underwriter"}
    
    response = client.post(f"/api/v1/admin/applications/{app_id}/review", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["review"]["status"] == "approved"
