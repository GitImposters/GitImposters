import { adminSupabase } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import UsersTable, { type UserRow } from '@/components/admin/UsersTable';

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [usersRes, logsRes] = await Promise.all([
    adminSupabase.from('users').select('*').order('created_at', { ascending: false }),
    adminSupabase.from('search_logs').select('searcher_user_id'),
  ]);

  const searchCounts = new Map<string, number>();
  for (const log of logsRes.data ?? []) {
    if (log.searcher_user_id) {
      searchCounts.set(log.searcher_user_id, (searchCounts.get(log.searcher_user_id) ?? 0) + 1);
    }
  }

  const users: UserRow[] = (usersRes.data ?? []).map((u) => ({
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
      <UsersTable users={users} currentAdminId={user?.id ?? ''} />
    </div>
  );
}
