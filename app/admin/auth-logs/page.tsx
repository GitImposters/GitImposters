import { sql } from '@/lib/db/client';
import { AuthLogsTable, type AuthLogRow } from '@/components/admin/LogsTable';

export const dynamic = 'force-dynamic';

export default async function AdminAuthLogsPage() {
  const data = await sql`
    SELECT
      al.id, al.user_id, al.event_type, al.created_at, al.ip_hash,
      u.github_username, u.github_avatar_url
    FROM auth_logs al
    LEFT JOIN users u ON u.id = al.user_id
    ORDER BY al.created_at DESC
    LIMIT 1000
  `;

  const logs = data.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    event_type: row.event_type,
    created_at: row.created_at,
    ip_hash: row.ip_hash,
    users: { github_username: row.github_username, github_avatar_url: row.github_avatar_url },
  })) as unknown as AuthLogRow[];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-100">Auth Logs</h1>
      <AuthLogsTable logs={logs} />
    </div>
  );
}
