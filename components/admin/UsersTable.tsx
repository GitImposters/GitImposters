'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface UserRow {
  id: string;
  github_username: string;
  github_avatar_url: string | null;
  email: string | null;
  role: string;
  is_suspended: boolean;
  suspension_reason: string | null;
  created_at: string;
  last_login_at: string | null;
  search_count: number;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface Props {
  users: UserRow[];
  currentAdminId: string;
}

export default function UsersTable({ users, currentAdminId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<UserRow | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const act = async (url: string, body?: object) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Action failed');
    return data;
  };

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    setLoading(suspendTarget.id);
    try {
      await act(`/api/admin/users/${suspendTarget.id}/suspend`, { reason: suspendReason || null });
      toast.success(`@${suspendTarget.github_username} suspended.`);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(null);
      setSuspendTarget(null);
      setSuspendReason('');
    }
  };

  const handleUnsuspend = async (user: UserRow) => {
    setLoading(user.id);
    try {
      await act(`/api/admin/users/${user.id}/unsuspend`);
      toast.success(`@${user.github_username} unsuspended.`);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(null);
    }
  };

  const handleRole = async (user: UserRow, role: 'admin' | 'user') => {
    setLoading(user.id);
    try {
      await act(`/api/admin/users/${user.id}/role`, { role });
      toast.success(`@${user.github_username} is now ${role}.`);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              {['', 'Username', 'Email', 'Role', 'Status', 'Joined', 'Last Login', 'Searches', 'Actions'].map((h) => (
                <th key={h} className="px-3 py-3 text-left font-medium text-zinc-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-zinc-800/50 bg-zinc-950 hover:bg-zinc-900/40 transition-colors">
                <td className="px-3 py-2.5">
                  {u.github_avatar_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.github_avatar_url} alt="" className="h-6 w-6 rounded-full" />
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={`https://github.com/${u.github_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-300 hover:text-primary"
                  >
                    @{u.github_username}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-zinc-500">{u.email ?? '—'}</td>
                <td className="px-3 py-2.5">
                  {u.role === 'admin' ? (
                    <span className="rounded-full bg-purple-900/40 px-2 py-0.5 text-xs font-medium text-purple-300">admin</span>
                  ) : (
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">user</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {u.is_suspended ? (
                    <span className="rounded-full bg-red-900/40 px-2 py-0.5 text-xs text-red-400">Suspended</span>
                  ) : (
                    <span className="rounded-full bg-green-900/40 px-2 py-0.5 text-xs text-green-400">Active</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-zinc-500">{formatDate(u.created_at)}</td>
                <td className="px-3 py-2.5 text-zinc-500">{formatDate(u.last_login_at)}</td>
                <td className="px-3 py-2.5 text-zinc-400">{u.search_count}</td>
                <td className="px-3 py-2.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-200"
                        disabled={loading === u.id}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {u.is_suspended ? (
                        <DropdownMenuItem onClick={() => handleUnsuspend(u)}>
                          Unsuspend
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          className="text-red-400 focus:text-red-300"
                          onClick={() => { setSuspendTarget(u); setSuspendReason(''); }}
                        >
                          Suspend…
                        </DropdownMenuItem>
                      )}
                      {u.role !== 'admin' && (
                        <DropdownMenuItem onClick={() => handleRole(u, 'admin')}>
                          Promote to Admin
                        </DropdownMenuItem>
                      )}
                      {u.role === 'admin' && u.id !== currentAdminId && (
                        <DropdownMenuItem onClick={() => handleRole(u, 'user')}>
                          Demote to User
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/search-logs?user=${u.github_username}`}>
                          View Search History
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-zinc-600">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Suspend dialog */}
      <Dialog open={!!suspendTarget} onOpenChange={() => setSuspendTarget(null)}>
        <DialogContent className="border-zinc-700 bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              Suspend @{suspendTarget?.github_username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Reason (optional)</label>
            <Input
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Describe why this account is being suspended…"
              className="border-zinc-700 bg-zinc-800 text-zinc-100"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-zinc-700" onClick={() => setSuspendTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSuspend}>
              Suspend Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
