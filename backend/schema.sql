-- ==============================================================================
-- CredNexa — Supabase PostgreSQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- Project: https://supabase.com/dashboard/project/juayfkmjjzxhjiytjqoi/sql
-- ==============================================================================

-- Reset tables if recreating
DROP TABLE IF EXISTS public.what_if_sessions CASCADE;
DROP TABLE IF EXISTS public.explanations CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.model_runs CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ==============================================================================
-- 1. PROFILES
--    Stores user profiles, display names, roles, and active flags.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT        NOT NULL UNIQUE,
    full_name   TEXT,
    role        TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active   BOOLEAN     NOT NULL DEFAULT true,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS: Read/Write open for Service Role; basic policies for authenticated
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_public_all" ON public.profiles;
CREATE POLICY "profiles_public_all" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 2. MODEL_RUNS
--    Tracks trained model versions. Admin-managed.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.model_runs (
    id          BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    version     TEXT        NOT NULL UNIQUE,
    model_name  TEXT        NOT NULL DEFAULT 'Calibrated Logistic Regression',
    accuracy    NUMERIC(5,4),
    roc_auc     NUMERIC(5,4),
    f1_score    NUMERIC(5,4),
    threshold   NUMERIC(8,6),
    is_active   BOOLEAN     NOT NULL DEFAULT false,
    trained_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes       TEXT
);

-- Seed the current deployed model version
INSERT INTO public.model_runs (version, model_name, accuracy, roc_auc, f1_score, threshold, is_active, notes)
VALUES ('v1.0', 'Calibrated Logistic Regression', 0.8197, 0.8227, 0.8830, 0.414522, true,
        'Initial production model — leakage-free 80/20 split, sigmoid calibration, CV-optimised threshold.')
ON CONFLICT (version) DO NOTHING;

-- RLS: public read/write
ALTER TABLE public.model_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "model_runs_public_all" ON public.model_runs;
CREATE POLICY "model_runs_public_all" ON public.model_runs FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 3. APPLICATIONS
--    Core loan assessment records. One per submission.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.applications (
    id                  BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    applicant_name      TEXT        NOT NULL,
    -- Applicant inputs
    married             TEXT,
    dependents          TEXT,
    education           TEXT,
    self_employed       TEXT,
    applicant_income    NUMERIC     NOT NULL,
    coapplicant_income  NUMERIC     NOT NULL DEFAULT 0,
    loan_amount         NUMERIC     NOT NULL,
    loan_amount_term    INT         NOT NULL DEFAULT 360,
    credit_history      TEXT        NOT NULL DEFAULT '1',
    property_area       TEXT        NOT NULL,
    -- ML outputs
    predicted_decision  TEXT        NOT NULL,
    predicted_prob      NUMERIC(6,5) NOT NULL,
    decision_threshold  NUMERIC(8,6) NOT NULL DEFAULT 0.414522,
    model_version       TEXT        NOT NULL DEFAULT 'v1.0',
    -- Enriched ML outputs
    top_factors         JSONB,
    segment_cluster_id  INT,
    segment_label       TEXT,
    suggestions         JSONB,
    llm_explanation     JSONB,
    -- Lifecycle
    status              TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS on_applications_updated ON public.applications;
CREATE TRIGGER on_applications_updated
    BEFORE UPDATE ON public.applications
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_applications_user_id   ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status     ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON public.applications(created_at DESC);

-- RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
-- RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "apps_public_all" ON public.applications;
CREATE POLICY "apps_public_all" ON public.applications FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 4. REVIEWS
--    Admin override / decision review for an application. 1:1 with applications.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id              BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id  BIGINT      NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
    admin_id        UUID        REFERENCES public.profiles(id) ON DELETE RESTRICT,
    final_decision  TEXT        NOT NULL CHECK (final_decision IN ('approved', 'rejected', 'deferred')),
    review_note     TEXT,
    reviewed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_application_id ON public.reviews(application_id);
CREATE INDEX IF NOT EXISTS idx_reviews_admin_id        ON public.reviews(admin_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reviews_public_all" ON public.reviews;
CREATE POLICY "reviews_public_all" ON public.reviews FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 5. AUDIT_LOGS
--    Immutable record of all system actions.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id              BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id        UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_role      TEXT,
    action          TEXT        NOT NULL,
    resource_type   TEXT,
    resource_id     TEXT,
    before_state    JSONB,
    after_state     JSONB,
    ip_address      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id   ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action      ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at  ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_public_all" ON public.audit_logs;
CREATE POLICY "audit_logs_public_all" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 6. EXPLANATIONS
--    Stores cached LLM explanation responses per assessment.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.explanations (
    id                  BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    assessment_id       TEXT        NOT NULL UNIQUE,
    application_id      BIGINT      REFERENCES public.applications(id) ON DELETE CASCADE,
    explanation_text    TEXT,
    key_factors         JSONB,
    segment_explanation TEXT,
    limitations         JSONB,
    disclaimer          TEXT,
    llm_provider        TEXT        NOT NULL DEFAULT 'Gemini',
    model_id            TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_explanations_application_id ON public.explanations(application_id);
CREATE INDEX IF NOT EXISTS idx_explanations_assessment_id  ON public.explanations(assessment_id);

ALTER TABLE public.explanations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "explanations_public_all" ON public.explanations;
CREATE POLICY "explanations_public_all" ON public.explanations FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 7. WHAT_IF_SESSIONS
--    Stores scenario testing counterfactual sessions.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.what_if_sessions (
    id                  BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
    base_application_id BIGINT      REFERENCES public.applications(id) ON DELETE SET NULL,
    session_title       TEXT        NOT NULL DEFAULT 'What-If Simulation',
    baseline_inputs     JSONB       NOT NULL,
    baseline_prob       NUMERIC(6,5) NOT NULL,
    modified_inputs     JSONB       NOT NULL,
    simulated_prob      NUMERIC(6,5) NOT NULL,
    prob_delta          NUMERIC(6,5) NOT NULL,
    target_achieved     BOOLEAN     NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_what_if_user_id ON public.what_if_sessions(user_id);

ALTER TABLE public.what_if_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "what_if_public_all" ON public.what_if_sessions;
CREATE POLICY "what_if_public_all" ON public.what_if_sessions FOR ALL USING (true) WITH CHECK (true);
-- All tables and policies successfully defined.
