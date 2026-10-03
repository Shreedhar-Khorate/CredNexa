import os
import json
import sqlite3
import hashlib
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
from backend.supabase_client import (
    save_application_supabase,
    get_applications_supabase,
    sync_user_to_supabase,
    save_audit_log_supabase,
)

logger = logging.getLogger("crednexa_db")
DB_PATH = Path(__file__).resolve().parent / "crednexa.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str) -> str:
    salt = "crednexa_salt_2026"
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()

def init_db():
    """Initialize database tables and seed default users if empty."""
    conn = get_db()
    cursor = conn.cursor()
    
    # Create Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL
    )
    """)
    
    # Create Applications table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        applicant_name TEXT NOT NULL,
        ApplicantIncome REAL NOT NULL,
        CoapplicantIncome REAL NOT NULL,
        LoanAmount REAL NOT NULL,
        Loan_Amount_Term REAL NOT NULL,
        Credit_History TEXT NOT NULL,
        Property_Area TEXT NOT NULL,
        Married TEXT NOT NULL,
        Education TEXT NOT NULL,
        Self_Employed TEXT NOT NULL,
        Dependents TEXT NOT NULL,
        decision TEXT NOT NULL,
        probability REAL NOT NULL,
        threshold REAL NOT NULL,
        segment TEXT,
        top_factors TEXT,
        suggestions TEXT,
        llm_explanation TEXT,
        model_version TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)
    
    # Create Audit Logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        action TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL
    )
    """)
    
    conn.commit()
    
    # Check if admin user exists, if not seed demo accounts
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        now = datetime.now(timezone.utc).isoformat()
        admin_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        
        cursor.execute(
            "INSERT INTO users (id, email, full_name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (admin_id, "admin@crednexa.com", "System Admin", hash_password("admin123"), "admin", now)
        )
        cursor.execute(
            "INSERT INTO users (id, email, full_name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, "user@crednexa.com", "Demo Applicant", hash_password("user123"), "user", now)
        )
        conn.commit()
        
        # Log initialization
        cursor.execute(
            "INSERT INTO audit_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)",
            (admin_id, "SYSTEM_INIT", "Seeded default Admin and User accounts", now)
        )
        conn.commit()

    conn.close()

# Operations for Applications
def save_application_db(app_data: Dict[str, Any], user_id: str, calling_user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    app_id = app_data.get("id") or str(uuid.uuid4())
    
    app_data["id"] = app_id
    app_data["user_id"] = user_id
    if not app_data.get("created_at"):
        app_data["created_at"] = now

    # 1. Save to SQLite (local fallback)
    try:
        cursor.execute("""
        INSERT OR REPLACE INTO applications (
            id, user_id, applicant_name, ApplicantIncome, CoapplicantIncome, LoanAmount, Loan_Amount_Term,
            Credit_History, Property_Area, Married, Education, Self_Employed, Dependents,
            decision, probability, threshold, segment, top_factors, suggestions, llm_explanation, model_version, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            app_id,
            user_id,
            app_data.get("applicant_name", "Applicant"),
            float(app_data.get("ApplicantIncome", 0)),
            float(app_data.get("CoapplicantIncome", 0)),
            float(app_data.get("LoanAmount", 0)),
            float(app_data.get("Loan_Amount_Term", 360)),
            str(app_data.get("Credit_History", "1")),
            str(app_data.get("Property_Area", "Semiurban")),
            str(app_data.get("Married", "Yes")),
            str(app_data.get("Education", "Graduate")),
            str(app_data.get("Self_Employed", "No")),
            str(app_data.get("Dependents", "0")),
            app_data.get("decision", "Rejected"),
            float(app_data.get("probability", 0.0)),
            float(app_data.get("threshold", 0.4145)),
            json.dumps(app_data.get("segment", {})),
            json.dumps(app_data.get("top_factors", [])),
            json.dumps(app_data.get("suggestions", [])),
            json.dumps(app_data.get("llm_explanation")),
            app_data.get("model_version", "v1"),
            app_data.get("status", "pending"),
            app_data["created_at"]
        ))
        cursor.execute(
            "INSERT INTO audit_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)",
            (user_id, "APPLICATION_CREATED", f"Application {app_id} for {app_data.get('applicant_name')}", now)
        )
        conn.commit()
    except Exception as sqlite_err:
        logger.warning("SQLite save warning: %s", sqlite_err)
    finally:
        conn.close()

    # 2. Sync to Supabase Cloud DB (primary storage)
    try:
        sup_saved = save_application_supabase(app_data, user_id=user_id, user=calling_user)
        if sup_saved:
            logger.info("✅ Application %s synced to Supabase", app_id)
            # Mirror audit log to Supabase
            save_audit_log_supabase(
                actor=calling_user,
                action="APPLICATION_CREATED",
                resource_type="application",
                resource_id=app_id,
                after_state={"decision": app_data.get("decision"), "probability": app_data.get("probability")},
            )
        else:
            logger.warning("⚠️  Supabase sync failed — data saved to SQLite only")
    except Exception as sup_err:
        logger.warning("Supabase sync error: %s", sup_err)

    return app_data

def get_applications_db(user_id: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    # Try fetching from Supabase DB first
    sup_apps = get_applications_supabase(user_id=user_id, limit=limit)
    if sup_apps is not None and len(sup_apps) > 0:
        return sup_apps

    # SQLite fallback
    conn = get_db()
    cursor = conn.cursor()
    
    if user_id:
        cursor.execute("SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?", (user_id, limit))
    else:
        cursor.execute("SELECT * FROM applications ORDER BY created_at DESC LIMIT ?", (limit,))
        
    rows = cursor.fetchall()
    conn.close()
    
    result = []
    for r in rows:
        item = dict(r)
        item["segment"] = json.loads(item["segment"]) if item["segment"] else {}
        item["top_factors"] = json.loads(item["top_factors"]) if item["top_factors"] else []
        item["suggestions"] = json.loads(item["suggestions"]) if item["suggestions"] else []
        item["llm_explanation"] = json.loads(item["llm_explanation"]) if item["llm_explanation"] else None
        result.append(item)
    return result

def get_application_by_id_db(app_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM applications WHERE id = ?", (app_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
    item = dict(row)
    item["segment"] = json.loads(item["segment"]) if item["segment"] else {}
    item["top_factors"] = json.loads(item["top_factors"]) if item["top_factors"] else []
    item["suggestions"] = json.loads(item["suggestions"]) if item["suggestions"] else []
    item["llm_explanation"] = json.loads(item["llm_explanation"]) if item["llm_explanation"] else None
    return item

# Auth operations
def create_user_db(full_name: str, email: str, password: str, role: str = "user") -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users WHERE email = ?", (email.lower().strip(),))
    if cursor.fetchone():
        conn.close()
        raise ValueError("User with this email already exists")
        
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    pwd_hash = hash_password(password)
    
    cursor.execute(
        "INSERT INTO users (id, email, full_name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, email.lower().strip(), full_name, pwd_hash, role, now)
    )
    cursor.execute(
        "INSERT INTO audit_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)",
        (user_id, "USER_REGISTERED", f"Registered user {email}", now)
    )
    conn.commit()
    conn.close()
    
    user = {
        "id": user_id,
        "email": email.lower().strip(),
        "full_name": full_name,
        "role": role,
        "created_at": now
    }

    # Sync to Supabase profiles so applications can be linked
    try:
        sync_user_to_supabase(user)
        save_audit_log_supabase(actor=user, action="USER_REGISTERED", resource_type="user", resource_id=user_id)
    except Exception as sup_err:
        logger.warning("Supabase user sync (register) failed: %s", sup_err)

    return user

def authenticate_user_db(email: str, password: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    pwd_hash = hash_password(password)
    
    cursor.execute("SELECT id, email, full_name, role, created_at FROM users WHERE email = ? AND password_hash = ?", (email.lower().strip(), pwd_hash))
    row = cursor.fetchone()
    
    if row:
        user = dict(row)
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            "INSERT INTO audit_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)",
            (user["id"], "USER_LOGIN", f"Successful login for {user['email']}", now)
        )
        conn.commit()
        conn.close()

        # Sync to Supabase profiles on every login (keeps data current)
        try:
            sync_user_to_supabase(user)
            save_audit_log_supabase(actor=user, action="USER_LOGIN", resource_type="user", resource_id=user["id"])
        except Exception as sup_err:
            logger.warning("Supabase user sync (login) failed: %s", sup_err)

        return user
    
    conn.close()
    return None

def get_user_by_id_db(user_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, full_name, role, created_at FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_all_users_db() -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, full_name, role, created_at FROM users ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_audit_logs_db(limit: int = 100) -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]
