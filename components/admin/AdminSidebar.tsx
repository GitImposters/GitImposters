import Link from 'next/link';
import { BarChart2, Users, Search, ShieldCheck, ArrowLeft } from 'lucide-react';
import type { User } from '@/types';

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: BarChart2 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/search-logs', label: 'Search Logs', icon: Search },
  { href: '/admin/auth-logs', label: 'Auth Logs', icon: ShieldCheck },
];

interface Props {
  profile: User;
}

export default function AdminSidebar({ profile }: Props) {
  return (
    <aside className="fixed left-0 top-0 flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Admin Panel
        </p>
        <p className="mt-0.5 text-base font-bold text-zinc-100">GitImposters</p>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-zinc-800 px-3 py-4 space-y-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3 px-3">
          {profile.github_avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.github_avatar_url}
              alt={profile.github_username}
              className="h-8 w-8 rounded-full border border-zinc-700"
            />
          )}
          <div>
            <p className="text-sm font-medium text-zinc-200">{profile.github_username}</p>
            <p className="text-xs text-zinc-600">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
