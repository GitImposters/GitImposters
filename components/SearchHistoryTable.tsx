'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ImposterScoreBadge from './ImposterScoreBadge';

export interface SearchHistoryItem {
  id: string;
  target_repo_url: string;
  target_repo_owner: string | null;
  report_id: string | null;
  final_imposter_score: number | null;
  created_at: string;
  reports: {
    verdict_label: string | null;
    cached_until: string | null;
  } | null;
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function repoLabel(url: string): string {
  return url.replace('https://github.com/', '');
}

interface Props {
  history: SearchHistoryItem[];
}

export default function SearchHistoryTable({ history }: Props) {
  const router = useRouter();

  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-16 text-center">
        <p className="text-zinc-400">No analyses yet.</p>
        <p className="mt-1 text-sm text-zinc-600">
          Paste a GitHub repo URL above to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900">
            {['Repository', 'Imposter Score', 'Verdict', 'Analyzed', 'Actions'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left font-medium text-zinc-400 first:pl-5 last:pr-5 last:text-right"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.map((row) => {
            const expired =
              row.reports?.cached_until
                ? new Date(row.reports.cached_until) < new Date()
                : true;

            return (
              <tr
                key={row.id}
                className="border-b border-zinc-800/50 bg-zinc-950 transition-colors hover:bg-zinc-900/60"
              >
                <td className="pl-5 py-3 pr-4">
                  <Link
                    href={row.target_repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 font-mono text-zinc-300 hover:text-zinc-100"
                  >
                    {repoLabel(row.target_repo_url)}
                    <ExternalLink className="h-3 w-3 shrink-0 text-zinc-600" />
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {row.final_imposter_score != null ? (
                    <ImposterScoreBadge score={row.final_imposter_score} />
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {row.reports?.verdict_label ?? '—'}
                </td>
                <td className="px-4 py-3 text-zinc-500">{timeAgo(row.created_at)}</td>
                <td className="py-3 pl-4 pr-5">
                  <div className="flex items-center justify-end gap-2">
                    {row.report_id && (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      >
                        <Link href={`/report/${row.report_id}`}>View Report</Link>
                      </Button>
                    )}
                    {expired && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-zinc-600 hover:text-zinc-300"
                        title="Re-analyze"
                        onClick={() =>
                          router.push(
                            `/dashboard?prefill=${encodeURIComponent(row.target_repo_url)}`
                          )
                        }
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
