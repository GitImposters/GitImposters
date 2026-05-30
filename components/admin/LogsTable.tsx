'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import ImposterScoreBadge from '@/components/ImposterScoreBadge';

// ─── Search Logs ──────────────────────────────────────────────────────────────

export interface SearchLogRow {
  id: string;
  searcher_user_id: string | null;
  target_repo_url: string;
  target_repo_owner: string | null;
  report_id: string | null;
  final_imposter_score: number | null;
  created_at: string;
  users: { github_username: string; github_avatar_url: string | null } | null;
  reports: { verdict_label: string | null } | null;
}

interface SearchLogsTableProps {
  logs: SearchLogRow[];
  initialUser?: string;
}

const PAGE_SIZE = 50;

export function SearchLogsTable({ logs, initialUser = '' }: SearchLogsTableProps) {
  const [userFilter, setUserFilter] = useState(initialUser);
  const [repoFilter, setRepoFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return logs.filter((r) => {
      if (userFilter && !r.users?.github_username.toLowerCase().includes(userFilter.toLowerCase())) return false;
      if (repoFilter && !r.target_repo_url.toLowerCase().includes(repoFilter.toLowerCase())) return false;
      if (dateFrom && r.created_at < dateFrom) return false;
      if (dateTo && r.created_at > dateTo + 'T23:59:59') return false;
      return true;
    });
  }, [logs, userFilter, repoFilter, dateFrom, dateTo]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setPage(1); }} placeholder="Filter by username…" className="w-48 border-zinc-700 bg-zinc-900 text-sm text-zinc-100 placeholder:text-zinc-600" />
        <Input value={repoFilter} onChange={(e) => { setRepoFilter(e.target.value); setPage(1); }} placeholder="Filter by repo URL…" className="w-56 border-zinc-700 bg-zinc-900 text-sm text-zinc-100 placeholder:text-zinc-600" />
        <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-36 border-zinc-700 bg-zinc-900 text-sm text-zinc-100" />
        <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-36 border-zinc-700 bg-zinc-900 text-sm text-zinc-100" />
        <span className="self-center text-xs text-zinc-600">{total} result{total !== 1 ? 's' : ''}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              {['Searcher', 'Target Repo', 'Score', 'Verdict', 'Searched At'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-zinc-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr key={r.id} className="border-b border-zinc-800/50 bg-zinc-950 hover:bg-zinc-900/40">
                <td className="px-4 py-2.5">
                  {r.users ? (
                    <div className="flex items-center gap-2">
                      {r.users.github_avatar_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.users.github_avatar_url} alt="" className="h-5 w-5 rounded-full" />
                      )}
                      <span className="text-zinc-300">@{r.users.github_username}</span>
                    </div>
                  ) : <span className="text-zinc-600">anonymous</span>}
                </td>
                <td className="px-4 py-2.5">
                  {r.report_id ? (
                    <Link href={`/report/${r.report_id}`} className="font-mono text-xs text-zinc-400 hover:text-primary">
                      {r.target_repo_url.replace('https://github.com/', '').slice(0, 35)}
                    </Link>
                  ) : (
                    <span className="font-mono text-xs text-zinc-600">
                      {r.target_repo_url.replace('https://github.com/', '').slice(0, 35)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {r.final_imposter_score != null ? <ImposterScoreBadge score={r.final_imposter_score} /> : <span className="text-zinc-600">—</span>}
                </td>
                <td className="px-4 py-2.5 text-zinc-500 text-xs">{r.reports?.verdict_label ?? '—'}</td>
                <td className="px-4 py-2.5 text-zinc-500 text-xs">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {slice.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-600">No results.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 disabled:opacity-40">← Prev</button>
          <span className="text-zinc-500">Page {page} of {pages}</span>
          <button onClick={() => setPage(Math.min(pages, page + 1))} disabled={page === pages} className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}

// ─── Auth Logs ────────────────────────────────────────────────────────────────

export interface AuthLogRow {
  id: string;
  user_id: string | null;
  event_type: string;
  created_at: string;
  ip_hash: string | null;
  users: { github_username: string; github_avatar_url: string | null } | null;
}

interface AuthLogsTableProps {
  logs: AuthLogRow[];
}

export function AuthLogsTable({ logs }: AuthLogsTableProps) {
  const [userFilter, setUserFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return logs.filter((r) => {
      if (userFilter && !r.users?.github_username.toLowerCase().includes(userFilter.toLowerCase())) return false;
      if (eventFilter && r.event_type !== eventFilter) return false;
      if (dateFrom && r.created_at < dateFrom) return false;
      if (dateTo && r.created_at > dateTo + 'T23:59:59') return false;
      return true;
    });
  }, [logs, userFilter, eventFilter, dateFrom, dateTo]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const EVENT_TYPES = ['login', 'logout'];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setPage(1); }} placeholder="Filter by username…" className="w-48 border-zinc-700 bg-zinc-900 text-sm text-zinc-100 placeholder:text-zinc-600" />
        <select value={eventFilter} onChange={(e) => { setEventFilter(e.target.value); setPage(1); }} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
          <option value="">All events</option>
          {EVENT_TYPES.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-36 border-zinc-700 bg-zinc-900 text-sm text-zinc-100" />
        <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-36 border-zinc-700 bg-zinc-900 text-sm text-zinc-100" />
        <span className="self-center text-xs text-zinc-600">{total} result{total !== 1 ? 's' : ''}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              {['User', 'Event', 'Timestamp'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-zinc-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr key={r.id} className="border-b border-zinc-800/50 bg-zinc-950 hover:bg-zinc-900/40">
                <td className="px-4 py-2.5">
                  {r.users ? (
                    <div className="flex items-center gap-2">
                      {r.users.github_avatar_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.users.github_avatar_url} alt="" className="h-5 w-5 rounded-full" />
                      )}
                      <span className="text-zinc-300">@{r.users.github_username}</span>
                    </div>
                  ) : <span className="text-zinc-600">unknown</span>}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.event_type === 'login' ? 'bg-green-900/40 text-green-400' : 'bg-zinc-800 text-zinc-400'}`}>
                    {r.event_type}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-zinc-500">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {slice.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-zinc-600">No results.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 disabled:opacity-40">← Prev</button>
          <span className="text-zinc-500">Page {page} of {pages}</span>
          <button onClick={() => setPage(Math.min(pages, page + 1))} disabled={page === pages} className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}

// Default export to satisfy placeholder contract
export default function LogsTable() { return null; }
