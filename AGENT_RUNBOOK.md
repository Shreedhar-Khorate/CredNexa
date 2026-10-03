# CredNexa — Agent Runbook

**Purpose:** Give a coding agent (Claude Code or similar) a fixed, ordered list of tasks to execute against the CredNexa repo and live Supabase project, with a logging protocol and explicit rules so the agent keeps working instead of stopping mid-task.

**This file is instructions FOR the agent. Read this entire file before doing anything.**

---

## 0. Non-Negotiable Operating Rules

Read this section first. These rules override any habit of pausing to "think out loud," asking for permission on non-destructive steps, or stopping after one task.

1. **Never end your turn just because you finished one step.** After completing a step and logging it, immediately move to the next step in the task list. Only stop when:
   - All tasks are `DONE` or `BLOCKED`, or
   - You hit a genuinely destructive action (deleting data, dropping a table, force-pushing) that Section 4 requires confirmation for, or
   - You are truly blocked and need information only the human can provide (e.g., an API key, a business decision).
2. **Never go silent to "think."** If you need to reason through something complex, do it, but the output of that reasoning must be an action or a log entry — not a pause waiting for the human to prompt you again. A long task is not a reason to stop; it's a reason to log progress and keep going.
3. **Log before and after every step**, not just at the end. If you are interrupted (context limit, crash, disconnect), the log must show exactly which step was in progress and what was done so far.
4. **At the start of every session, read `logs.md` first**, before touching any code. Resume from the last incomplete step. Do not restart finished work. Do not ask the human "should I continue?" — the presence of an incomplete step in the log is your answer: yes, continue.
5. **If you are running low on context**, write a `## CHECKPOINT` entry to `logs.md` summarizing exactly what's done, what's in progress, and what's next, in enough detail that a fresh agent session could resume from the log alone without re-reading this whole runbook from scratch. Then continue working until you actually run out of room — do not stop early "to be safe."
6. **Do not ask clarifying questions for things this runbook already answers.** Only ask when a task is genuinely ambiguous or requires a decision outside your authority (see Section 4).
7. **One task at a time, fully, before moving on.** Don't partially do three tasks in parallel and leave all three half-finished.

---

## 1. Logging Protocol (`logs.md`)

The human has already created `logs.md`. Append to it — never overwrite or delete existing entries.

### 1.1 Format for every log entry

```markdown
## [TASK-ID] <short task name>
**Status:** IN_PROGRESS | DONE | BLOCKED | FAILED
**Started:** <ISO timestamp>
**Finished:** <ISO timestamp or "—" if still in progress>

### What I did
- <bullet per concrete action: file edited, SQL run, command executed>

### Result
- <what changed, what the output was, what you verified>

### Next
- <immediate next step, even if it's just "proceed to TASK-02">
```

### 1.2 Rules for log entries

- **Write the `IN_PROGRESS` entry BEFORE starting the task**, not after. This is what makes resumption possible if you're cut off mid-task.
- **Update the same entry to `DONE`/`BLOCKED`/`FAILED` when finished** — don't create a duplicate entry; edit the status line and fill in `Finished`, `Result`, `Next`.
- If a task fails, log `FAILED`, log exactly what error occurred, and move to the next task unless later tasks depend on this one (check Section 3 dependencies). Do not silently retry forever — try once, log the failure clearly, move on, and surface it in your final summary.
- Every SQL statement you run against Supabase must be logged verbatim in the entry, along with the row count or error returned.
- Every file you edit must be logged with its path.

### 1.3 Checkpoint entries (for context limits, not task boundaries)

If you must stop mid-task because you're running out of context, write:

```markdown
## CHECKPOINT — <ISO timestamp>
**Current task:** [TASK-ID]
**State:** <precise description of exactly what has been changed so far, what has NOT been changed yet, and any SQL/commands already run vs. still pending>
**Resume instructions:** <exact next action for the next agent session to take>
```

A fresh agent reading only this checkpoint (and the task list below) must be able to continue with zero ambiguity.

---

## 2. Context the Agent Needs

Before starting, the agent should have read (or should read now):
- `FEATURES_AND_WORKFLOW.md` — the authoritative feature/workflow spec, already reconciled against the live database
- `DATABASE.md` — SQL schema reference (note: some of it is now stale; this runbook's tasks fix the staleness)
- The live Supabase project: `juayfkmjjzxhjiytjqoi` (CredNexa)
- The repo: `github.com/Shreedhar-Khorate/CredNexa`

Do not re-derive facts already established in `FEATURES_AND_WORKFLOW.md` Sections 1–2. Treat its findings as ground truth.

---

## 3. Task List (Execute in Order)

Dependencies are noted. Do not skip ahead past a blocked dependency — log it as `BLOCKED` and move to the next independent task instead.

---

### TASK-01: Confirm Supabase access scope (frontend vs. backend-only)

**Goal:** Resolve Open Question #4 from `FEATURES_AND_WORKFLOW.md` — does the frontend ever call Supabase directly?

**Steps:**
1. Search `frontend/src` for any import of `@supabase/supabase-js` or usage of a Supabase client.
2. Search for `VITE_SUPABASE` environment variable usage in frontend code.
3. If found: note every file and call site.
4. If not found: confirm all data access goes through `frontend/src/lib/api.ts` → FastAPI only.

**Acceptance:** Log entry states definitively "frontend calls Supabase directly: YES (list files)" or "NO, backend-only," with evidence.

**Dependency:** None. Do this first — it determines urgency of TASK-02.

---

### TASK-02: Tighten Supabase RLS policies

**Goal:** Replace the current `USING (true) WITH CHECK (true)` public policies with real role-based policies.

**Steps:**
1. Based on TASK-01's result: if frontend never touches Supabase directly, this is lower urgency but should still be done — log that context before starting.
2. For each table, write and apply the correct RLS policy via `mcp__Supabase__apply_migration` (not raw `execute_sql`, since this is DDL):
   - `profiles`: user reads own row; admin reads/updates all; nobody deletes except admin
   - `applications`: user reads/inserts own rows (`user_id = auth.uid()`); admin reads/updates all
   - `reviews`: admin-only read/insert/update
   - `model_runs`: all authenticated users can read active model; admin-only insert/update
   - `audit_logs`: admin-only read; system/backend inserts (service role bypasses RLS automatically)
   - `explanations`: user reads explanations tied to their own applications; admin reads all
   - `what_if_sessions`: user reads/inserts own; admin reads all
3. Drop the old `*_public_all` policies as part of the same migration.
4. After applying, re-run `SELECT tablename, policyname, cmd, roles FROM pg_policies WHERE schemaname='public'` and log the full before/after comparison.
5. **Do not drop and recreate tables. Only touch policies.**

**Acceptance:** `pg_policies` no longer shows any `USING (true)` policy with `roles = {public}` except where genuinely intended (e.g., `model_runs` read for active model).

**Dependency:** TASK-01 should inform urgency but does not block this — do it regardless.

**Caution:** This is schema-affecting (DDL) but not destructive to data. No confirmation needed from the human before applying — proceed.

---

### TASK-03: Fix the `deferred` / `reviewed` status mapping

**Goal:** Resolve Open Question #3 — `reviews.final_decision` allows `'deferred'` but `applications.status` has no matching value.

**Steps:**
1. Find the backend code path that handles `POST /api/admin/applications/{id}/review` (or equivalent route — search for where `reviews` rows are inserted).
2. Check whether it currently maps `'deferred'` → `'reviewed'` explicitly, or whether this would currently throw a CHECK constraint violation.
3. If unmapped: fix the code so `final_decision = 'deferred'` correctly sets `applications.status = 'reviewed'`, while `'approved'`/`'rejected'` map 1:1.
4. Add a one-line comment in the code explaining the mapping, since the two enums use different words for the same non-terminal state.
5. Write a quick test (or manual check) submitting a deferred review against one of the pending applications in a way that doesn't corrupt real demo data — prefer testing against a newly inserted throwaway application row, not the existing 5 live ones, unless the human has said it's fine to use live data.

**Acceptance:** Deferring an application no longer throws a constraint error, and `applications.status` ends up `'reviewed'`.

**Dependency:** None.

---

### TASK-04: Verify clustering is actually invoked at predict time

**Goal:** Resolve Open Question #2 — all live `segment_cluster_id`/`segment_label` values are null.

**Steps:**
1. Find the predict route handler in the backend (search for where `applications` rows are inserted after a prediction).
2. Check whether it calls into `ml/cluster.py` (or `ml/predict.py` if clustering is folded in there) and whether the result is included in the INSERT statement.
3. If clustering is called but the result isn't persisted: fix the INSERT to include it.
4. If clustering is never called: add the call and wire the result through.
5. Confirm `cluster_v1.joblib` (or equivalent artifact) is loaded at backend startup, not per-request (performance).
6. Test: submit one new application via the API (not a direct DB insert) and confirm `segment_cluster_id`/`segment_label` are populated in the resulting row.

**Acceptance:** A freshly submitted application has non-null `segment_cluster_id` and `segment_label`.

**Dependency:** None.

---

### TASK-05: Resolve the LLM explanation storage split

**Goal:** Resolve Open Question #1 — narrative lands in `applications.llm_explanation` or the separate `explanations` table, pick one source of truth.

**Steps:**
1. Find the LLM service call site in the backend (`backend/services/llm_service.py` per the architecture report, or wherever it actually lives).
2. Check which of the two locations it currently writes to. It's possible it writes to neither yet (both show no confirmed data) — check both table/column states for all 5 live applications to be sure.
3. Recommend and implement: **use the `explanations` table as source of truth** (it has `llm_provider`, `model_id`, `created_at`, and supports caching/multiple regenerations per application), and either:
   - (a) deprecate `applications.llm_explanation` entirely (leave the column but stop writing to it, document why), or
   - (b) keep `applications.llm_explanation` as a denormalized "latest explanation" cache for fast reads, explicitly kept in sync with the newest `explanations` row.
   Pick (a) unless there's a clear performance reason for (b) — log your reasoning either way.
4. Update backend code accordingly.
5. Test: trigger one explanation generation and confirm it lands exactly where documented.

**Acceptance:** One documented source of truth for LLM narratives, backend code consistent with it, confirmed via a live test call.

**Dependency:** None.

---

### TASK-06: Clean up test/seed accounts

**Goal:** Resolve the leftover E2E test accounts flagged in `FEATURES_AND_WORKFLOW.md` Section 2.4.

**Steps:**
1. Query `profiles` for `testprofile@crednexa.com` and `newuser1791010076@crednexa.com`.
2. Check whether either has associated `applications` rows that are meaningful to keep (they do — rows `id=1` and `id=4`/`5`).
3. **Do not delete these without explicit human confirmation** — this is a destructive action per Section 4. Log a `BLOCKED` entry with a clear recommendation (e.g., "recommend deleting these 2 accounts and their 3 associated application rows; awaiting confirmation") and move to the next task.

**Acceptance:** Either cleaned up (if separately confirmed) or clearly logged as blocked pending human decision.

**Dependency:** None. This task is expected to end `BLOCKED` unless the human has pre-authorized cleanup — don't let it stall the rest of the list.

---

### TASK-07: Prove the review loop end-to-end

**Goal:** The approve/reject loop has schema support but has never been exercised (0 rows in `reviews`).

**Steps:**
1. Pick ONE of the 5 live pending applications (prefer `id=1`, the "Full Flow Test" row, since it reads like an intentional test record rather than real user data — confirm this assumption is reasonable before proceeding, but don't block on it).
2. As if acting as an admin, run the full flow from `FEATURES_AND_WORKFLOW.md` Section 5.2:
   - Insert into `reviews` with a real `admin_id` (use `c5e984aa-78fe-4c06-ba9c-2265ff31ea3d`, the confirmed admin profile), `final_decision = 'approved'`, a review note.
   - Update `applications.status` to `'approved'`.
   - Insert an `audit_logs` row with `action = 'APPLICATION_REVIEWED'`.
3. Verify all three writes landed correctly with a follow-up SELECT.
4. Log the exact before/after state of the application row.

**Acceptance:** `reviews` has 1 row, the target application shows `status = 'approved'`, and `audit_logs` has a new `APPLICATION_REVIEWED` entry — proving the full loop works at the database level.

**Dependency:** TASK-03 should be done first if possible (so the status-mapping fix is in place before you test), but if TASK-03 is blocked for some reason, proceed with `'approved'` (not `'deferred'`) for this test since that path is unambiguous either way.

---

### TASK-08: Add missing audit action types to documentation

**Goal:** `audit_logs` currently only shows `USER_LOGIN`, `USER_REGISTERED`, `APPLICATION_CREATED` in live data. After TASK-07, `APPLICATION_REVIEWED` will also exist.

**Steps:**
1. Find every place in the backend that should be (but might not be) writing an audit log entry: user role changes, user deactivation, model deployment/activation.
2. For any action type that's referenced in `FEATURES_AND_WORKFLOW.md` Section 5.4 but has no corresponding code path, add the missing `INSERT INTO audit_logs` call at the right point in the backend.
3. Log which action types were already implemented vs. which you added.

**Acceptance:** `USER_ROLE_CHANGED`, `USER_DEACTIVATED`, `MODEL_DEPLOYED` all have corresponding code paths that will fire when those actions happen (doesn't require testing all of them live, just confirming the code exists and is correct).

**Dependency:** None.

---

### TASK-09: Final summary report

**Goal:** Produce a human-readable wrap-up once all tasks above are DONE or BLOCKED.

**Steps:**
1. Read back through the entire `logs.md`.
2. Write a final `## SUMMARY` entry at the bottom of `logs.md`:
   - Table of all tasks with final status
   - List of anything BLOCKED and exactly what decision/input is needed from the human
   - List of any files changed, with paths
   - List of any SQL/migrations applied
   - Any new risks discovered that weren't in the original `FEATURES_AND_WORKFLOW.md`

**Acceptance:** A human can read just the `## SUMMARY` section and know exactly what happened without reading the full log.

**Dependency:** All prior tasks attempted (DONE or BLOCKED, not left IN_PROGRESS).

---

## 4. When You MUST Stop and Ask

Only these situations require pausing for human input instead of proceeding autonomously:

1. **Deleting data** (TASK-06 — test account cleanup) — always confirm first.
2. **Dropping or renaming a table/column** that existing code depends on, where you can't verify nothing else references it.
3. **An API key, secret, or credential is missing** and required to proceed (e.g., you need `GEMINI_API_KEY` to test TASK-05 but it's not in the environment).
4. **A task's acceptance criteria conflict with each other** in a way this runbook didn't anticipate.
5. **You discover the live Supabase project has changed unexpectedly** since this runbook was written (e.g., tables missing, schema drifted) — stop, log it clearly, and ask before assuming which version of reality is correct.

Everything else: proceed, log, move to the next task.

---

## 5. Quick Reference — Starting a Session

```
1. Read this file (AGENT_RUNBOOK.md) in full.
2. Read logs.md in full.
3. Find the last entry. If it's IN_PROGRESS or a CHECKPOINT, resume exactly there.
4. If the last entry is DONE/BLOCKED/FAILED, move to the next task in Section 3's order.
5. Write the next task's IN_PROGRESS log entry BEFORE doing anything.
6. Do the work.
7. Update the log entry to its final status.
8. Immediately proceed to the next task. Do not stop and wait to be told to continue.
9. Repeat until all tasks are DONE/BLOCKED, then execute TASK-09.
```

---

**Runbook Status:** Ready for agent execution.  
**Tasks:** 9, ordered, mostly independent, one requires human confirmation (TASK-06).  
**Expected stopping points:** TASK-06 (blocked pending confirmation), Section 4 triggers, or TASK-09 completion.
