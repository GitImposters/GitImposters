export type UserRole = 'user' | 'admin';

export type JobStatus = 'pending' | 'running' | 'complete' | 'failed';

export type VerdictLabel =
  | '✅ Solid Engineer'
  | '🟡 Some Concerns'
  | '🟠 Suspicious'
  | '🔴 Likely Imposter'
  | '🚨 Almost Certainly an Imposter';

export interface User {
  id: string;
  github_id: string;
  github_username: string;
  github_avatar_url: string | null;
  email: string | null;
  github_installation_id: string | null;
  role: UserRole;
  is_suspended: boolean;
  suspension_reason: string | null;
  created_at: string;
  last_login_at: string | null;
}

export interface AnalysisJob {
  id: string;
  repo_url: string;
  requested_by_user_id: string;
  status: JobStatus;
  error_message: string | null;
  report_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface CategoryFindings {
  score: number;
  findings: string[];
}

export interface ReportFindings {
  commit_quality: CategoryFindings;
  authorship: CategoryFindings;
  pr_review: CategoryFindings;
  repo_hygiene: CategoryFindings;
  consistency: CategoryFindings;
  testing_cicd: CategoryFindings;
}

export interface Report {
  id: string;
  repo_url: string;
  repo_owner: string;
  repo_name: string;
  repo_description: string | null;
  repo_language: string | null;
  repo_stars: number | null;
  repo_forks: number | null;
  is_private: boolean;
  final_imposter_score: number;
  verdict_label: VerdictLabel;
  commit_quality_score: number | null;
  authorship_score: number | null;
  pr_review_score: number | null;
  repo_hygiene_score: number | null;
  consistency_score: number | null;
  testing_cicd_score: number | null;
  findings_json: ReportFindings | null;
  ai_summary: string | null;
  analyzed_at: string;
  cached_until: string;
}

export interface SearchLog {
  id: string;
  searcher_user_id: string | null;
  target_repo_url: string;
  target_repo_owner: string | null;
  report_id: string | null;
  final_imposter_score: number | null;
  created_at: string;
  ip_hash: string | null;
  user_agent: string | null;
}

export interface AuthLog {
  id: string;
  user_id: string | null;
  event_type: string;
  created_at: string;
  ip_hash: string | null;
  user_agent: string | null;
}
