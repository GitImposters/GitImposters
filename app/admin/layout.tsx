import { requireAdmin } from '@/lib/supabase/auth';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();

  return (
    <div className="min-h-screen bg-zinc-950">
      <AdminSidebar profile={profile} />
      <main className="ml-64 p-8">{children}</main>
    </div>
  );
}
