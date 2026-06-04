import { requireAdmin } from '@/lib/auth/helpers';
import { sql } from '@/lib/db/client';
import UsersTable, { type UserRow } from '@/components/admin/UsersTable';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const admin = await requireAdmin();

  const [usersData, logsData] = await Promise.all([
    sql`SELECT * FROM users ORDER BY created_at DESC`,
    sql`SELECT searcher_user_id FROM search_logs WHERE searcher_user_id IS NOT NULL`,
  ]);

  const searchCounts = new Map<string, number>();
  for (const log of logsData) {
    if (log.searcher_user_id) {
      searchCounts.set(log.searcher_user_id, (searchCounts.get(log.searcher_user_id) ?? 0) + 1);
    }
  }

  const users: UserRow[] = usersData.map((u) => ({
    id: u.id,
    github_username: u.github_username,
    github_avatar_url: u.github_avatar_url,
    email: u.email,
    role: u.role,
    is_suspended: u.is_suspended,
    suspension_reason: u.suspension_reason,
    created_at: u.created_at,
    last_login_at: u.last_login_at,
    search_count: searchCounts.get(u.id) ?? 0,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-100">Users</h1>
      <UsersTable users={users} currentAdminId={admin.id} />
    </div>
  );
}
