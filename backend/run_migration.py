"""
CredNexa — Direct Supabase PostgreSQL Migration Runner
Executes schema.sql against Supabase via psycopg2 direct connection.
"""
import os
import sys
import urllib.parse
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

# Encode password to safely handle special characters
password = urllib.parse.quote("CredNexa@2006", safe="")
conn_str = (
    f"postgresql://postgres.juayfkmjjzxhjiytjqoi:{password}"
    f"@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
)

print("[INFO] Connecting to Supabase PostgreSQL...")
try:
    conn = psycopg2.connect(conn_str, connect_timeout=20)
    conn.autocommit = False
    cur = conn.cursor()
    cur.execute("SELECT current_database(), current_user;")
    db, user = cur.fetchone()
    print(f"[OK] Connected — database: {db}, user: {user}")
except Exception as e:
    print(f"[ERROR] Cannot connect: {e}")
    sys.exit(1)

# Check existing tables before migration
cur.execute(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"
)
existing = [r[0] for r in cur.fetchall()]
print(f"[INFO] Existing tables ({len(existing)}): {existing or '(none)'}")

# Read schema SQL
sql_path = Path(__file__).parent / "schema.sql"
with open(sql_path, "r", encoding="utf-8") as f:
    full_sql = f.read()

print(f"\n[INFO] Running schema from: {sql_path}\n")

try:
    cur.execute(full_sql)
    conn.commit()
    print("[SUCCESS] All DDL statements executed and committed!")
except Exception as e:
    conn.rollback()
    print(f"[ERROR] Migration failed, rolling back.\nError: {e}")
    cur.close()
    conn.close()
    sys.exit(1)

# Verify created tables
cur.execute(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"
)
after = [r[0] for r in cur.fetchall()]
new_tables = [t for t in after if t not in existing]
print(f"\n[INFO] Tables after migration ({len(after)}): {after}")
print(f"[NEW] Newly created tables: {new_tables}")

cur.close()
conn.close()
print("\nCredNexa Supabase schema migration complete! ✅")
