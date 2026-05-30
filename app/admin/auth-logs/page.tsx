import { adminSupabase } from '@/lib/supabase/admin';
import { AuthLogsTable, type AuthLogRow } from '@/components/admin/LogsTable';

export default async function AdminAuthLogsPage() {
  const { data } = await adminSupabase
    .from('auth_logs')
    .select('id, user_id, event_type, created_at, ip_hash, users(github_username, github_avatar_url)')
    .order('created_at', { ascending: false })
    .limit(1000);

  const logs = (data ?? []) as unknown as AuthLogRow[];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-100">Auth Logs</h1>
      <AuthLogsTable logs={logs} />
    </div>
  );
}
