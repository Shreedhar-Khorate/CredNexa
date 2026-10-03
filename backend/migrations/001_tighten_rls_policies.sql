-- CredNexa Migration 001: Tighten Supabase RLS Policies
-- Enables RLS on all tables and replaces permissive `USING (true)` policies with fine-grained RBAC rules.

-- 1. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.what_if_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing overly permissive policies
DROP POLICY IF EXISTS "profiles_public_all" ON public.profiles;
DROP POLICY IF EXISTS "applications_public_all" ON public.applications;
DROP POLICY IF EXISTS "reviews_public_all" ON public.reviews;
DROP POLICY IF EXISTS "model_runs_public_all" ON public.model_runs;
DROP POLICY IF EXISTS "audit_logs_public_all" ON public.audit_logs;
DROP POLICY IF EXISTS "explanations_public_all" ON public.explanations;
DROP POLICY IF EXISTS "what_if_sessions_public_all" ON public.what_if_sessions;

-- 3. Profiles Policies
CREATE POLICY "profiles_user_read_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Applications Policies
CREATE POLICY "applications_user_read_own" ON public.applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "applications_user_insert_own" ON public.applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "applications_admin_all" ON public.applications FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 5. Reviews Policies (Admin Only)
CREATE POLICY "reviews_admin_all" ON public.reviews FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 6. Model Runs Policies
CREATE POLICY "model_runs_read_active" ON public.model_runs FOR SELECT USING (
  is_active = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "model_runs_admin_write" ON public.model_runs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "model_runs_admin_update" ON public.model_runs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 7. Audit Logs Policies (Admin Read Only; Service Role bypasses RLS for inserts)
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 8. Explanations Policies
CREATE POLICY "explanations_user_read_own" ON public.explanations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.applications WHERE applications.id = explanations.application_id AND applications.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 9. What-If Sessions Policies
CREATE POLICY "what_if_sessions_user_read_own" ON public.what_if_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "what_if_sessions_user_insert_own" ON public.what_if_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "what_if_sessions_admin_all" ON public.what_if_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
