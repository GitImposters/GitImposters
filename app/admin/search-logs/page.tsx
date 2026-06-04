import { sql } from '@/lib/db/client';
import { SearchLogsTable, type SearchLogRow } from '@/components/admin/LogsTable';

export const dynamic = 'force-dynamic';

export default async function AdminSearchLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const { user: userParam } = await searchParams;

  const data = await sql`
    SELECT
      sl.id, sl.searcher_user_id, sl.target_repo_url, sl.target_repo_owner,
      sl.report_id, sl.final_imposter_score, sl.created_at,
      u.github_username, u.github_avatar_url,
      r.verdict_label
    FROM search_logs sl
    LEFT JOIN users u ON u.id = sl.searcher_user_id
    LEFT JOIN reports r ON r.id = sl.report_id
    ORDER BY sl.created_at DESC
    LIMIT 1000
  `;

  const logs = data.map((row) => ({
    id: row.id,
    searcher_user_id: row.searcher_user_id,
    target_repo_url: row.target_repo_url,
    target_repo_owner: row.target_repo_owner,
    report_id: row.report_id,
    final_imposter_score: row.final_imposter_score,
    created_at: row.created_at,
    users: { github_username: row.github_username, github_avatar_url: row.github_avatar_url },
    reports: { verdict_label: row.verdict_label },
  })) as unknown as SearchLogRow[];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-100">Search Logs</h1>
      <SearchLogsTable logs={logs} initialUser={userParam ?? ''} />
    </div>
  );
}
