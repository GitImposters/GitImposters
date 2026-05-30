import Link from 'next/link';
import ImposterScoreBadge from '@/components/ImposterScoreBadge';

interface StatCard {
  label: string;
  value: string | number;
  sub?: string;
}

function StatCard({ label, value, sub }: StatCard) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-zinc-100">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-600">{sub}</p>}
    </div>
  );
}

interface TopRepo {
  target_repo_url: string;
  count: number;
  avg_score: number;
}

interface TopUser {
  github_username: string;
  github_avatar_url: string | null;
  search_count: number;
  last_active: string | null;
  is_suspended: boolean;
}

interface Props {
  totalUsers: number;
  totalAnalyses: number;
  analysesLast7Days: number;
  suspendedUsers: number;
  topRepos: TopRepo[];
  topUsers: TopUser[];
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const ms = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export default function StatsPanel({
  totalUsers, totalAnalyses, analysesLast7Days,
  suspendedUsers, topRepos, topUsers,
}: Props) {
  return (
    <div className="space-y-8">
      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Users" value={totalUsers} />
        <StatCard label="Analyses (All Time)" value={totalAnalyses} />
        <StatCard label="Analyses (7 Days)" value={analysesLast7Days} />
        <StatCard label="Suspended Users" value={suspendedUsers} />
      </div>

      {/* Top repos */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-zinc-100">Top 10 Most Analyzed Repos</h2>
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Repository</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Analyses</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {topRepos.map((r) => (
                <tr key={r.target_repo_url} className="border-b border-zinc-800/50 bg-zinc-950">
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-300">
                    {r.target_repo_url.replace('https://github.com/', '')}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">{r.count}</td>
                  <td className="px-4 py-2.5">
                    <ImposterScoreBadge score={Math.round(r.avg_score)} />
                  </td>
                </tr>
              ))}
              {topRepos.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-zinc-600">No data yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Most active users */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-zinc-100">Most Active Users (Top 10)</h2>
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-4 py-3 text-left font-medium text-zinc-400">User</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Searches</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Last Active</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((u) => (
                <tr key={u.github_username} className="border-b border-zinc-800/50 bg-zinc-950">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/users`}
                      className="flex items-center gap-2 text-zinc-300 hover:text-zinc-100"
                    >
                      {u.github_avatar_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.github_avatar_url} alt="" className="h-5 w-5 rounded-full" />
                      )}
                      @{u.github_username}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">{u.search_count}</td>
                  <td className="px-4 py-2.5 text-zinc-500">{timeAgo(u.last_active)}</td>
                  <td className="px-4 py-2.5">
                    {u.is_suspended ? (
                      <span className="rounded-full bg-red-900/40 px-2 py-0.5 text-xs text-red-400">Suspended</span>
                    ) : (
                      <span className="rounded-full bg-green-900/40 px-2 py-0.5 text-xs text-green-400">Active</span>
                    )}
                  </td>
                </tr>
              ))}
              {topUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-zinc-600">No data yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
