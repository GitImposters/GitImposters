import { adminSupabase } from '@/lib/supabase/admin';
import { SearchLogsTable, type SearchLogRow } from '@/components/admin/LogsTable';

export default async function AdminSearchLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const { user: userParam } = await searchParams;

  const { data } = await adminSupabase
    .from('search_logs')
    .select(
      'id, searcher_user_id, target_repo_url, target_repo_owner, report_id, final_imposter_score, created_at, users(github_username, github_avatar_url), reports(verdict_label)'
    )
    .order('created_at', { ascending: false })
    .limit(1000);

  const logs = (data ?? []) as unknown as SearchLogRow[];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-100">Search Logs</h1>
      <SearchLogsTable logs={logs} initialUser={userParam ?? ''} />
    </div>
  );
}
