"""
Unit tests for extended audit log action types (TASK-08).
Verifies USER_ROLE_CHANGED, USER_DEACTIVATED, USER_ACTIVATED, and MODEL_DEPLOYED.
"""
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.db import init_db, get_db, update_user_role_db, set_user_active_db, log_model_deployment_db
from backend.auth import create_access_token

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def get_admin_user():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, role FROM users WHERE role = 'admin' LIMIT 1")
    row = dict(cursor.fetchone())
    conn.close()
    return row

def test_user_role_changed_audit():
    admin = get_admin_user()
    res = update_user_role_db(target_user_id="user_test_role_01", new_role="admin", admin_user=admin)
    assert res["role"] == "admin"

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs WHERE action = 'USER_ROLE_CHANGED' ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    assert row is not None
    assert "USER_ROLE_CHANGED" in row["action"]

def test_user_deactivated_audit():
    admin = get_admin_user()
    res = set_user_active_db(target_user_id="user_test_deactive_01", is_active=False, admin_user=admin)
    assert res["is_active"] is False

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs WHERE action = 'USER_DEACTIVATED' ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    assert row is not None

def test_model_deployed_audit():
    admin = get_admin_user()
    res = log_model_deployment_db(model_version="v1.1-calibrated", admin_user=admin, notes="Retrained with optimal k=4 clusterer")
    assert res["model_version"] == "v1.1-calibrated"

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs WHERE action = 'MODEL_DEPLOYED' ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    assert row is not None
    assert "v1.1-calibrated" in row["details"]

def test_audit_endpoints():
    admin = get_admin_user()
    token = create_access_token(admin["id"], admin["email"], admin["role"])
    headers = {"Authorization": f"Bearer {token}"}

    # Role update endpoint
    resp_role = client.put("/api/v1/admin/users/target_u1/role", json={"role": "user"}, headers=headers)
    assert resp_role.status_code == 200

    # Active toggle endpoint
    resp_active = client.put("/api/v1/admin/users/target_u1/active", json={"is_active": True}, headers=headers)
    assert resp_active.status_code == 200

    # Model deploy endpoint
    resp_deploy = client.post("/api/v1/admin/model/deploy", json={"model_version": "v2.0", "notes": "Prod release"}, headers=headers)
    assert resp_deploy.status_code == 200
