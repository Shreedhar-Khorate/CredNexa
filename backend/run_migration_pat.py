"""
CredNexa — Supabase schema migration via Personal Access Token (PAT).
This is the only reliable programmatic way to run DDL when direct DB
connections are blocked at the network level.

Usage:
    python backend/run_migration_pat.py <your-personal-access-token>

Get your PAT at: https://supabase.com/dashboard/account/tokens
"""
import sys, os, requests, json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

PAT = sys.argv[1] if len(sys.argv) > 1 else os.getenv("SUPABASE_PAT", "")
if not PAT:
    print("ERROR: Provide your Supabase Personal Access Token as an argument.")
    print("  Get it at: https://supabase.com/dashboard/account/tokens")
    print("  Usage: python backend/run_migration_pat.py <pat>")
    sys.exit(1)

PROJECT_REF = "juayfkmjjzxhjiytjqoi"
SQL_PATH = Path(__file__).parent / "schema.sql"

with open(SQL_PATH, "r", encoding="utf-8") as f:
    full_sql = f.read()

headers = {
    "Authorization": f"Bearer {PAT}",
    "Content-Type": "application/json",
}

url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
print(f"[INFO] Running migration via Supabase Management API...")
print(f"[INFO] Endpoint: {url}\n")

resp = requests.post(url, headers=headers, json={"query": full_sql}, timeout=60)

print(f"[STATUS] {resp.status_code}")
if resp.status_code in (200, 201, 204):
    print("[SUCCESS] ✅ All CredNexa tables created in Supabase!")
    try:
        print(json.dumps(resp.json(), indent=2)[:500])
    except:
        print(resp.text[:300])
else:
    print(f"[ERROR] {resp.text[:500]}")
    print("\nMake sure your PAT has 'read', 'write' scopes for database.")
