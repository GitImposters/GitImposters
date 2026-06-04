-- GitImposters schema for Neon Postgres
-- Run this in your Neon project SQL editor after provisioning Neon Auth.
-- No Supabase-specific dependencies (no auth.uid(), no RLS with auth.uid()).
-- Access control is enforced at the application layer.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users — id matches neon_auth.user.id from Neon Auth (Better Auth)
CREATE TABLE public.users (
  id UUID PRIMARY KEY,
  github_id TEXT NOT NULL DEFAULT '',
  github_username TEXT NOT NULL DEFAULT '',
  github_avatar_url TEXT,
  email TEXT,
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

-- Search logs (admin only)
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

-- Auth logs (admin only)
CREATE TABLE public.auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash TEXT,
  user_agent TEXT
);

-- Set yourself as admin after first login:
-- UPDATE public.users SET role = 'admin' WHERE github_username = 'your-github-username';
