# CredNexa — Features, Panels & End-to-End Workflow

**Status:** Reconciled against the live Supabase project (`juayfkmjjzxhjiytjqoi`), checked 2026-10-03.  
Where this document differs from the earlier architecture report, the live database wins — those differences are called out explicitly in Section 1.

---

## 0. How to read this document

This document has three jobs:
1. **Reconcile** what was reported as built against what is actually in the database (Section 1).
2. **Specify** the complete feature set for the User Panel and Admin Panel, including the approve/reject loop (Sections 3–5).
3. **Flag risks** that need attention before this goes further (Section 2).

Everything in Sections 3 onward uses the **real column and status names** from the live schema, not the names used in the original design doc. If your frontend/backend code uses different names, that mismatch needs fixing in code, not in this document.

---

## 1. Reconciliation: Report vs. Live Database

| Claim in architecture report | Live database reality | Verdict |
|---|---|---|
| Calibrated LogReg: 81.97% acc, 0.8227 AUC, 0.8830 F1, threshold 0.414522 | `model_runs` row `v1.0`: accuracy 0.8197, roc_auc 0.8227, f1_score 0.8830, threshold 0.414522 | ✅ Matches exactly |
| K-Means k=2 clustering | `applications.segment_cluster_id` / `segment_label` columns exist | ✅ Columns present, not yet populated in any of the 5 live rows (all null in the sample pulled) — **verify clustering actually runs at predict time** |
| Dual-LLM: Gemini → Groq → local template | `applications.llm_explanation` (jsonb) + separate `explanations` table with `llm_provider` default `'Gemini'` | ⚠️ Two places LLM output could land. 0 rows in `explanations`, and the 5 live applications need checking for whether `llm_explanation` is populated. **Confirm which one the backend actually writes to** — see Section 2. |
| Dual-database: SQLite primary (sync write) + Supabase (async best-effort) | Confirmed by data shape: `audit_logs.ip_address` is `text` not `inet`, `applications` has app-specific fields like `applicant_name` not in the original schema design — consistent with a backend-driven schema rather than a pure Supabase-first design | ✅ Plausible, consistent |
| Demo credentials `admin@crednexa.com` / `admin123`, `user@crednexa.com` / `user123` | `profiles` has exactly these two emails, plus two extra test accounts (`testprofile@crednexa.com`, `newuser179...@crednexa.com`) from what look like E2E test runs | ⚠️ Passwords can't be verified from the DB (correctly — they're hashed in `auth.users`, not `profiles`). **Leftover test accounts should be cleaned up before any real demo/review.** |
| `status` lifecycle implied: pending → approved/rejected (with admin override states) | Actual CHECK constraint: `status IN ('pending','reviewed','approved','rejected')` | ⚠️ No separate "admin_approved" vs "ml_approved" distinction — a reviewed-and-approved application and an auto-approved one look the same unless `reviews` table is joined |
| `reviews.final_decision` | CHECK constraint: `IN ('approved','rejected','deferred')` | Note: **`deferred`**, not `pending` — different word than `applications.status` uses. Keep this distinction straight in code. |
| 12 API endpoints under `/api/v1` | Not independently verifiable from the database — this is a code-level claim | Not verified here; verify against `backend/main.py` directly |
| All 5 live applications | `status = 'pending'` for every row, `reviews` table is empty (0 rows) | The review/approve-reject loop described in the report has **never actually been exercised** in this environment yet |

**Net assessment:** the ML metrics and dual-DB claims check out against the database. The LLM explanation storage location and the review workflow are unverified/unused — treat those two as "built but not yet proven" rather than "done."

---

## 2. Risks to Resolve Before Going Further

### 2.1 Supabase RLS policies allow unrestricted public access

Every table's RLS policy is:
```sql
USING (true) WITH CHECK (true)   -- role: public
```

This means **anyone holding the Supabase anon key can read and write every row in every table** — all users' applications, all profiles (including which accounts are admin), all audit logs, directly, bypassing FastAPI entirely.

- **If the React frontend never calls Supabase directly** (i.e., it only calls your FastAPI backend, which then talks to Supabase with its own credentials), this is **low risk today** but still bad practice — anyone who extracts the anon key from your frontend bundle can read the whole database.
- **If the frontend calls Supabase directly for anything** (e.g., using `supabase-js` in the browser), this is **a live data breach waiting to happen** — confirm this is not the case.

**Action:** Tighten RLS policies to match the role-based access actually intended (user reads own rows, admin reads all), or confirm and document that Supabase is backend-only and the anon key is never shipped to the browser.

### 2.2 Duplicate application rows

Applications `id=2`/`id=3` and `id=4`/`id=5` are identical in applicant name, income, and loan amount, submitted minutes apart by the same user. Likely E2E test retries, but worth confirming the frontend isn't double-submitting on click.

### 2.3 Segment/cluster fields are empty on live data

`segment_cluster_id` and `segment_label` were null on every row checked. If clustering is supposed to run on every prediction, confirm `ml/cluster.py` or the predict path is actually calling it and writing back.

### 2.4 Leftover test accounts in `profiles`

`testprofile@crednexa.com` and `newuser1791010076@crednexa.com` look like automated test artifacts. Clean these up before a demo, or clearly separate seed/test accounts from real ones.

---

## 3. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CREDNEXA SYSTEM                         │
└─────────────────────────────────────────────────────────────────┘

   React Frontend (Vite, Tailwind)
            │
            │  JWT Bearer token (24h expiry, HS256)
            ▼
   FastAPI Backend  ──────────────┐
            │                     │
            ▼                     ▼
    ML Engine                Dual-LLM Service
    (ml/predict.py)          Gemini → Groq → Local template
            │                     │
            └──────────┬──────────┘
                        ▼
              Dual Database Write
         ┌──────────────┴──────────────┐
         ▼                              ▼
   SQLite (crednexa.db)          Supabase PostgreSQL
   Synchronous, guaranteed       Async, best-effort
```

**Two user roles**, enforced by FastAPI (`get_current_user`, `get_current_admin`), backed by `profiles.role`:
- `user` — applies for loans, sees own history and dashboard
- `admin` — sees everything, reviews and decides on applications, manages users and models

---

## 4. User Panel — Complete Feature Set

### 4.1 Account

| Feature | Behavior | Backed by |
|---|---|---|
| Register | Email + password → account created with `role='user'` by default | `profiles` insert, `auth.users` |
| Login | Email + password → JWT (24h expiry) | `audit_logs.action = 'USER_LOGIN'` confirmed in live data |
| View profile | Name, email, role, account status | `profiles` row (own, via `id = auth.uid()` once RLS is fixed) |
| Logout | Clears token client-side | — |

### 4.2 Loan Application ("Assess" tab)

**Form fields** (match `applications` table columns):

| Field | Type | Notes |
|---|---|---|
| `applicant_name` | text | Present in live schema — not in the original design doc |
| `married` | Yes/No | |
| `dependents` | text | "0", "1", "2", "3+" |
| `education` | text | Graduate / Undergraduate |
| `self_employed` | Yes/No | |
| `applicant_income` | numeric | |
| `coapplicant_income` | numeric | defaults 0 |
| `loan_amount` | numeric | |
| `loan_amount_term` | int | defaults 360 |
| `credit_history` | text | defaults '1'; supports '1'/'0'/'Unknown' |
| `property_area` | text | Urban / Semiurban / Rural |

**On submit:**
1. Form data sent to `POST /api/predict` (or `/api/v1/predict` per the report — confirm the actual route in code).
2. Backend runs feature engineering (TotalIncome, EMI, LoanToIncome, BalanceIncome, Has_Coapplicant, Log_* transforms).
3. ML model returns `predicted_decision` and `predicted_prob`.
4. Clustering assigns `segment_cluster_id` / `segment_label` (confirm this is actually wired — see Section 2.3).
5. Explainability returns `top_factors` and `suggestions` (counterfactual "what-if" scenarios).
6. LLM service generates a narrative, written to either `applications.llm_explanation` or the `explanations` table (confirm which — see Section 2).
7. Row inserted into `applications` with `status = 'pending'`.
8. Row inserted into `audit_logs` (`action = 'APPLICATION_CREATED'`, confirmed in live data).
9. Result returned to the user immediately — the user does **not** wait for admin review to see their ML result.

**Result screen shows:**
- Decision (Approved/Rejected) and probability
- Risk tier (Very Low / Low / Moderate / High / Very High, per the report's 5-tier breakdown)
- Top positive and negative factors
- Counterfactual suggestions ("add a co-applicant", "increase down payment 15%", "extend term")
- AI narrative explanation (from the LLM drawer)
- Current status: **pending admin review** (status stays `pending` until an admin acts — see Section 5)

### 4.3 Application History ("History" tab)

- List of all the user's own past applications
- Search and filter by status, date, decision
- Status badges: `pending`, `reviewed`, `approved`, `rejected`
- Click into any application for full detail (same payload as the original result screen, replayed from stored data)

### 4.4 Personal Dashboard ("Dashboard" tab)

- Personal approval rate (own applications only)
- Average loan size applied for
- Cluster/segment placement (once populated)
- Risk trend over time, if the user has applied more than once

### 4.5 What-If Scenarios (`what_if_sessions` table)

- User can take any past application and simulate changed inputs (e.g., "what if my income was ₹2,000 higher?")
- Shows `baseline_prob` vs `simulated_prob` and `prob_delta`
- `target_achieved` flag if the simulated change crosses the approval threshold
- **Currently 0 rows in the live database** — feature exists in schema but hasn't been used/tested yet

### 4.6 Suggested Additional User Features

- [ ] Email/in-app notification when an admin reviews their application (currently nothing tells the user their status changed)
- [ ] Download application result as PDF
- [ ] Re-apply with pre-filled values from a past application
- [ ] Appeal a rejected decision (currently no path back once rejected)
- [ ] EMI calculator independent of a full application

---

## 5. Admin Panel — Complete Feature Set

### 5.1 Global Metrics Dashboard

Per the report, `GET /api/v1/admin/metrics` returns:
- Total application count
- Approval rate (%)
- Total approved loan amount (exposure)
- Average risk score across all applications

**Recommended additions** based on what's in the schema but not mentioned in the report:
- Breakdown by `segment_label` (once populated) — approval rate per cluster, for fairness monitoring
- Count of applications stuck in `pending` beyond N days (currently **all 5 live applications are pending** — this would show "5" today)
- Model version currently active, pulled from `model_runs.is_active`

### 5.2 Applications Table + Review Workflow (the approve/reject loop)

This is the core admin-facing loop. Here is exactly how it should work against the live schema:

**Step 1 — Admin views the queue**
```sql
SELECT a.id, a.applicant_name, a.applicant_income, a.loan_amount,
       a.predicted_decision, a.predicted_prob, a.status, a.created_at,
       p.email AS applicant_email
FROM applications a
JOIN profiles p ON a.user_id = p.id
WHERE a.status = 'pending'
ORDER BY a.created_at ASC;
```

**Step 2 — Admin opens one application**
- Full form data, ML decision, probability, risk tier
- Top factors and counterfactual suggestions
- AI narrative explanation
- (No existing review yet — `reviews.application_id` is unique, so there's at most one review per application)

**Step 3 — Admin decides: Approve / Reject / Defer**
```sql
-- Insert the admin's decision
INSERT INTO reviews (application_id, admin_id, final_decision, review_note)
VALUES ($1, $2, $3, $4);  -- final_decision IN ('approved','rejected','deferred')

-- Update the application's status to match
UPDATE applications
SET status = CASE $3
    WHEN 'approved' THEN 'approved'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'deferred' THEN 'reviewed'   -- note: applications.status has no 'deferred' value
  END,
  updated_at = NOW()
WHERE id = $1;
```

> **Naming mismatch to fix in code:** `reviews.final_decision` allows `'deferred'`, but `applications.status` does not. If an admin defers, the application status needs to land on `'reviewed'` (the only non-terminal value left in its CHECK constraint) or the `applications.status` CHECK constraint needs a 4th value added to match. Pick one and make it consistent — right now this mapping has to be handled carefully in application code or it will throw a constraint violation.

**Step 4 — Log the action**
```sql
INSERT INTO audit_logs (actor_id, actor_role, action, resource_type, resource_id, before_state, after_state)
VALUES ($admin_id, 'admin', 'APPLICATION_REVIEWED', 'application', $application_id,
        jsonb_build_object('status','pending'),
        jsonb_build_object('status', $new_status, 'decision', $final_decision, 'note', $review_note));
```

**Step 5 — User sees updated status**
- Next time the user opens History or Dashboard, the application reflects the new status
- (Suggested addition: push a notification instead of making them check — see Section 4.6)

### 5.3 User Management

Per the report: `GET /api/v1/admin/users` lists all registered users and roles.

**Should also support (not yet confirmed in code):**
- Promote a user to admin / demote an admin to user (`UPDATE profiles SET role = ...`)
- Deactivate a user (`profiles.is_active = false`) — column exists, confirm it's enforced at login
- View a specific user's full application history from the admin side

### 5.4 Audit Log Viewer

`GET /api/v1/admin/audit` — confirmed working against live data. Current action types seen in the database:
- `USER_LOGIN`
- `USER_REGISTERED`
- `APPLICATION_CREATED`

**Missing action types that should exist once the review loop is used:**
- `APPLICATION_REVIEWED`
- `USER_ROLE_CHANGED`
- `USER_DEACTIVATED`
- `MODEL_DEPLOYED`

### 5.5 Model Management

- `model_runs` table currently holds one row (`v1.0`, active)
- Admin console should show: current active model, its metrics, and ideally the comparison table from the report (Logistic Regression vs Random Forest vs Gradient Boosting vs Decision Tree)
- **Not yet in the schema:** a way to switch which model is active, or to trigger retraining from the admin UI. If this is a planned feature, it needs either a `POST /api/admin/model/retrain` endpoint or a manual process documented for the team.

### 5.6 LLM Provider Test Tools

Per the report, the admin console includes "LLM provider toggle test tools" — presumably to manually test Gemini vs Groq vs the local fallback. Confirm this writes test calls to `explanations` with a clearly-flagged test marker, so test LLM calls don't get confused with real application explanations in reporting.

### 5.7 Suggested Additional Admin Features

- [ ] Bulk actions (approve/reject multiple pending applications at once)
- [ ] Fairness report: approval rate by `segment_label`, by `property_area`, flagging any gap over a threshold
- [ ] SLA tracking: average time from `created_at` to review (`reviews.reviewed_at`)
- [ ] Export applications/audit log as CSV
- [ ] Rule configuration UI (currently any auto-approve/reject thresholds are presumably hardcoded in `ml/predict.py`)

---

## 6. End-to-End Flow Diagram (Real Status Values)

```
USER                                    SYSTEM                              ADMIN
 │                                         │                                   │
 ├─ Fill loan form ──────────────────────▶│                                   │
 │                                         ├─ Feature engineering              │
 │                                         ├─ ML predict (prob, decision)      │
 │                                         ├─ Cluster assign (segment_*)       │
 │                                         ├─ Explainability (top_factors)     │
 │                                         ├─ LLM narrative (Gemini→Groq→local)│
 │                                         ├─ INSERT applications              │
 │                                         │    status = 'pending'             │
 │                                         ├─ INSERT audit_logs                │
 │                                         │    action = APPLICATION_CREATED   │
 │◀─ Show result (decision, factors, ─────┤                                   │
 │   suggestions, narrative)              │                                   │
 │                                         │                                   │
 │   [application sits in 'pending']      │                                   │
 │                                         │                                   │
 │                                         │◀────── View pending queue ───────┤
 │                                         │◀────── Open application ─────────┤
 │                                         │◀────── Decide: approve/reject/ ──┤
 │                                         │        defer + note              │
 │                                         ├─ INSERT reviews                  │
 │                                         ├─ UPDATE applications.status      │
 │                                         │    → 'approved' / 'rejected' /   │
 │                                         │      'reviewed' (if deferred)    │
 │                                         ├─ INSERT audit_logs               │
 │                                         │    action = APPLICATION_REVIEWED │
 │                                         │                                   │
 │◀─ (should be notified — not yet built) │                                   │
 │                                         │                                   │
 ├─ Check History tab ───────────────────▶│                                   │
 │◀─ See updated status ───────────────────┤                                   │
```

---

## 7. Status Value Reference (Authoritative)

Use these exact strings in code — they are enforced by database CHECK constraints, so anything else will fail the insert/update.

**`applications.status`:**
```
'pending' | 'reviewed' | 'approved' | 'rejected'
```

**`reviews.final_decision`:**
```
'approved' | 'rejected' | 'deferred'
```

**`profiles.role`:**
```
'user' | 'admin'
```

**`explanations.llm_provider`** (default shown, not a CHECK constraint — confirm values are consistent):
```
'Gemini' (default) — confirm 'Groq' and a local-fallback marker are also used consistently
```

---

## 8. Open Questions to Resolve With the Dev Team

1. Which field does the LLM narrative actually land in — `applications.llm_explanation` or the `explanations` table? Pick one as the source of truth.
2. Is `ml/cluster.py` actually invoked during `/predict`, given all live `segment_*` fields are null?
3. How does `reviews.final_decision = 'deferred'` map onto `applications.status`, given status has no `'deferred'` value?
4. Does the frontend ever call Supabase directly, or only through FastAPI? This determines how urgent the open RLS policies are.
5. Is there a notification mechanism planned for when an admin reviews an application, or does the user have to keep checking?

---

**Document Status:** Reconciled against live Supabase data as of 2026-10-03.  
**Next recommended step:** Have one admin manually approve/reject one of the 5 pending applications end-to-end, then re-check `reviews`, `audit_logs`, and `applications.status` to confirm the loop works as designed in Section 5.2 before building further features on top of it.
