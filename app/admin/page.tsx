import { adminSupabase } from '@/lib/supabase/admin';
import StatsPanel from '@/components/admin/StatsPanel';

export default async function AdminPage() {
  const [usersRes, searchLogsRes, suspended7dRes] = await Promise.all([
    adminSupabase.from('users').select('id, is_suspended'),
    adminSupabase.from('search_logs').select('id, searcher_user_id, target_repo_url, final_imposter_score, created_at'),
    adminSupabase
      .from('search_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString()),
  ]);

  const allUsers = usersRes.data ?? [];
  const allLogs = searchLogsRes.data ?? [];

  const totalUsers = allUsers.length;
  const totalAnalyses = allLogs.length;
  const analysesLast7Days = suspended7dRes.count ?? 0;
  const suspendedUsers = allUsers.filter((u) => u.is_suspended).length;

  // Top repos
  const repoMap = new Map<string, { count: number; scores: number[] }>();
  for (const log of allLogs) {
    const entry = repoMap.get(log.target_repo_url) ?? { count: 0, scores: [] };
    entry.count++;
    if (log.final_imposter_score != null) entry.scores.push(log.final_imposter_score);
    repoMap.set(log.target_repo_url, entry);
  }
  const topRepos = Array.from(repoMap.entries())
    .map(([url, { count, scores }]) => ({
      target_repo_url: url,
      count,
      avg_score: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top users
  const userCountMap = new Map<string, number>();
  const userLastMap = new Map<string, string>();
  for (const log of allLogs) {
    if (!log.searcher_user_id) continue;
    userCountMap.set(log.searcher_user_id, (userCountMap.get(log.searcher_user_id) ?? 0) + 1);
    const prev = userLastMap.get(log.searcher_user_id);
    if (!prev || log.created_at > prev) userLastMap.set(log.searcher_user_id, log.created_at);
  }

  const { data: topUserProfiles } = await adminSupabase
    .from('users')
    .select('id, github_username, github_avatar_url, is_suspended')
    .in('id', Array.from(userCountMap.keys()).slice(0, 50));

  const topUsers = (topUserProfiles ?? [])
    .map((u) => ({
      github_username: u.github_username,
      github_avatar_url: u.github_avatar_url,
      search_count: userCountMap.get(u.id) ?? 0,
      last_active: userLastMap.get(u.id) ?? null,
      is_suspended: u.is_suspended,
    }))
    .sort((a, b) => b.search_count - a.search_count)
    .slice(0, 10);

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-zinc-100">Overview</h1>
      <StatsPanel
        totalUsers={totalUsers}
        totalAnalyses={totalAnalyses}
        analysesLast7Days={analysesLast7Days}
        suspendedUsers={suspendedUsers}
        topRepos={topRepos}
        topUsers={topUsers}
      />
    </div>
  );
}
