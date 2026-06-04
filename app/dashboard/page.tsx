import { requireAuth } from '@/lib/auth/helpers';
import { sql } from '@/lib/db/client';
import RepoSearchBar from '@/components/RepoSearchBar';
import GitHubAppStatusWidget from '@/components/GitHubAppStatusWidget';
import SearchHistoryTable, { type SearchHistoryItem } from '@/components/SearchHistoryTable';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const profile = await requireAuth();

  const rawHistory = await sql`
    SELECT
      sl.id, sl.target_repo_url, sl.target_repo_owner, sl.report_id,
      sl.final_imposter_score, sl.created_at,
      r.verdict_label, r.cached_until
    FROM search_logs sl
    LEFT JOIN reports r ON r.id = sl.report_id
    WHERE sl.searcher_user_id = ${profile.id}
    ORDER BY sl.created_at DESC
    LIMIT 50
  `;

  const history = rawHistory.map((row) => ({
    id: row.id,
    target_repo_url: row.target_repo_url,
    target_repo_owner: row.target_repo_owner,
    report_id: row.report_id,
    final_imposter_score: row.final_imposter_score,
    created_at: row.created_at,
    reports: { verdict_label: row.verdict_label, cached_until: row.cached_until },
  })) as unknown as SearchHistoryItem[];

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold text-zinc-100">Dashboard</h1>

      <section className="mb-6">
        <RepoSearchBar />
      </section>

      {!profile.github_installation_id && (
        <section className="mb-6">
          <GitHubAppStatusWidget installationId={null} />
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">Analysis History</h2>
        <SearchHistoryTable history={history} />
      </section>
    </main>
  );
}
