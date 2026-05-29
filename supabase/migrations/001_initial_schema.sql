-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  github_id TEXT UNIQUE NOT NULL,
  github_username TEXT NOT NULL,
  github_avatar_url TEXT,
  email TEXT,
  github_access_token_encrypted TEXT,
  github_installation_id TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  suspension_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Analysis jobs (tracks pipeline status for frontend polling)
CREATE TABLE public.analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_url TEXT NOT NULL,
  requested_by_user_id UUID REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'complete', 'failed')),
  error_message TEXT,
  report_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Reports (cached analysis results, publicly readable)
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_url TEXT NOT NULL,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  repo_description TEXT,
  repo_language TEXT,
  repo_stars INTEGER,
  repo_forks INTEGER,
  is_private BOOLEAN NOT NULL DEFAULT false,
  final_imposter_score INTEGER NOT NULL,
  verdict_label TEXT NOT NULL,
  commit_quality_score INTEGER,
  authorship_score INTEGER,
  pr_review_score INTEGER,
  repo_hygiene_score INTEGER,
  consistency_score INTEGER,
  testing_cicd_score INTEGER,
  findings_json JSONB,
  ai_summary TEXT,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cached_until TIMESTAMPTZ NOT NULL
);

-- Search logs (admin only, never exposed to users)
CREATE TABLE public.search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  searcher_user_id UUID REFERENCES public.users(id),
  target_repo_url TEXT NOT NULL,
  target_repo_owner TEXT,
  report_id UUID REFERENCES public.reports(id),
  final_imposter_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash TEXT,
  user_agent TEXT
);

-- Auth logs (admin only, never exposed to users)
CREATE TABLE public.auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash TEXT,
  user_agent TEXT
);

-- -------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_logs ENABLE ROW LEVEL SECURITY;

-- users: each user can only read and update their own row
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- analysis_jobs: users can insert and read their own jobs
CREATE POLICY "jobs_select_own" ON public.analysis_jobs
  FOR SELECT USING (requested_by_user_id = auth.uid());
CREATE POLICY "jobs_insert_own" ON public.analysis_jobs
  FOR INSERT WITH CHECK (requested_by_user_id = auth.uid());

-- reports: anyone can read (public shareable reports)
CREATE POLICY "reports_select_public" ON public.reports
  FOR SELECT USING (true);

-- search_logs: no user access — service role only
-- (no policies = no access for authenticated or anon roles)

-- auth_logs: no user access — service role only
-- (no policies = no access for authenticated or anon roles)
