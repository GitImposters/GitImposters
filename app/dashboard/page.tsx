import { requireAuth } from '@/lib/supabase/auth';
import { createServiceClient } from '@/lib/supabase/service';
import RepoSearchBar from '@/components/RepoSearchBar';
import GitHubAppStatusWidget from '@/components/GitHubAppStatusWidget';
import SearchHistoryTable, { type SearchHistoryItem } from '@/components/SearchHistoryTable';

export default async function DashboardPage() {
  const profile = await requireAuth();
  const serviceClient = createServiceClient();

  const { data: rawHistory } = await serviceClient
    .from('search_logs')
    .select(
      'id, target_repo_url, target_repo_owner, report_id, final_imposter_score, created_at, reports(verdict_label, cached_until)'
    )
    .eq('searcher_user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const history = (rawHistory ?? []) as unknown as SearchHistoryItem[];

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold text-zinc-100">Dashboard</h1>

      {/* Section 1 — Repo search */}
      <section className="mb-6">
        <RepoSearchBar />
      </section>

      {/* Section 2 — GitHub App status (only when not installed) */}
      {!profile.github_installation_id && (
        <section className="mb-6">
          <GitHubAppStatusWidget installationId={null} />
        </section>
      )}

      {/* Section 3 — Analysis history */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">Analysis History</h2>
        <SearchHistoryTable history={history} />
      </section>
    </main>
  );
}
