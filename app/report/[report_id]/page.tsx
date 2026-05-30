import Link from 'next/link';
import {
  ExternalLink, Star, GitFork, Lock, Globe, Bot,
  GitCommit, Code2, GitPullRequest, FolderOpen, Activity, TestTube2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import type { Report, ReportFindings } from '@/types';
import RadarChart from '@/components/RadarChart';
import CategoryScoreCard from '@/components/CategoryScoreCard';
import ReportActions from '@/components/ReportActions';

// ─── Score styling helpers ────────────────────────────────────────────────────

function getScoreCardStyle(score: number) {
  if (score <= 20) return { card: 'bg-green-950 border-green-900', text: 'text-green-400', radar: '#22c55e' };
  if (score <= 40) return { card: 'bg-yellow-950 border-yellow-900', text: 'text-yellow-400', radar: '#eab308' };
  if (score <= 60) return { card: 'bg-orange-950 border-orange-900', text: 'text-orange-400', radar: '#f97316' };
  if (score <= 80) return { card: 'bg-red-950 border-red-900', text: 'text-red-400', radar: '#ef4444' };
  return { card: 'bg-rose-950 border-rose-900', text: 'text-red-300', radar: '#b91c1c' };
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Category configuration ───────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'commit_quality' as const, title: 'Commit Quality', icon: <GitCommit className="h-4 w-4" /> },
  { key: 'authorship' as const, title: 'Code Authorship', icon: <Code2 className="h-4 w-4" /> },
  { key: 'pr_review' as const, title: 'PR & Review Habits', icon: <GitPullRequest className="h-4 w-4" /> },
  { key: 'repo_hygiene' as const, title: 'Repo Hygiene', icon: <FolderOpen className="h-4 w-4" /> },
  { key: 'consistency' as const, title: 'Contribution Consistency', icon: <Activity className="h-4 w-4" /> },
  { key: 'testing_cicd' as const, title: 'Testing & CI/CD', icon: <TestTube2 className="h-4 w-4" /> },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReportPage({
  params,
}: {
  params: Promise<{ report_id: string }>;
}) {
  const { report_id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('reports')
    .select('*')
    .eq('id', report_id)
    .single();

  if (!data) {
    return (
      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-5xl font-bold text-zinc-700">404</p>
          <h1 className="mt-4 text-2xl font-bold text-zinc-100">Report not found</h1>
          <p className="mt-2 text-zinc-400">
            This report doesn&apos;t exist or has been removed.
          </p>
          <Link href="/" className="mt-6 inline-block text-primary hover:underline">
            ← Back to home
          </Link>
        </div>
      </main>
    );
  }

  const report = data as Report;
  const findings = report.findings_json as ReportFindings | null;
  const style = getScoreCardStyle(report.final_imposter_score);

  // Auth check for re-analyze button (no redirect — public page)
  const { data: { user } } = await supabase.auth.getUser();
  const isExpired = new Date(report.cached_until) < new Date();
  const canReanalyze = isExpired && !!user;

  // Radar chart data (practice scores — higher = better)
  const radarData = [
    { category: 'Commit Quality', score: report.commit_quality_score ?? 0 },
    { category: 'Code Authorship', score: report.authorship_score ?? 0 },
    { category: 'PR & Review', score: report.pr_review_score ?? 0 },
    { category: 'Repo Hygiene', score: report.repo_hygiene_score ?? 0 },
    { category: 'Consistency', score: report.consistency_score ?? 0 },
    { category: 'Testing & CI/CD', score: report.testing_cicd_score ?? 0 },
  ];

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-12">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://github.com/${report.repo_owner}.png`}
            alt={report.repo_owner}
            className="h-14 w-14 rounded-full border border-zinc-700"
          />
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">
              {report.repo_owner}{' '}
              <span className="text-zinc-500">/</span>{' '}
              {report.repo_name}
            </h1>
            {report.repo_description && (
              <p className="mt-1 text-sm text-zinc-400">{report.repo_description}</p>
            )}
          </div>
        </div>

        {/* Metadata pills */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {report.repo_language && (
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-300">
              {report.repo_language}
            </span>
          )}
          {report.repo_stars != null && (
            <span className="flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-300">
              <Star className="h-3.5 w-3.5" /> {report.repo_stars.toLocaleString()}
            </span>
          )}
          {report.repo_forks != null && (
            <span className="flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-300">
              <GitFork className="h-3.5 w-3.5" /> {report.repo_forks.toLocaleString()}
            </span>
          )}
          <span className="flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-300">
            {report.is_private ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
            {report.is_private ? 'Private' : 'Public'}
          </span>
          <Link
            href={report.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            View on GitHub <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* ── Final Imposter Score ─────────────────────────────────────────────── */}
      <section
        className={cn(
          'rounded-2xl border p-8 text-center',
          style.card
        )}
      >
        <p className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Imposter Score
        </p>
        <p className={cn('mt-3 font-mono text-8xl font-bold', style.text)}>
          {report.final_imposter_score}
          <span className="text-4xl text-zinc-600"> / 100</span>
        </p>
        <p className="mt-4 text-2xl font-semibold text-zinc-200">
          {report.verdict_label}
        </p>
        <ReportActions repoUrl={report.repo_url} canReanalyze={canReanalyze} />
      </section>

      {/* ── Radar Chart ─────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">Practice Scores Radar</h2>
        <RadarChart data={radarData} radarColor={style.radar} />
      </section>

      {/* ── Category Score Cards ─────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">Category Breakdown</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {CATEGORIES.map(({ key, title, icon }) => {
            const scoreKey = `${key}_score` as keyof Report;
            const score = report[scoreKey] as number | null;
            const catFindings = findings?.[key]?.findings ?? [];
            return (
              <CategoryScoreCard
                key={key}
                title={title}
                icon={icon}
                score={score}
                findings={catFindings}
              />
            );
          })}
        </div>
      </section>

      {/* ── AI Summary ──────────────────────────────────────────────────────── */}
      {report.ai_summary && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-3 flex items-center gap-2 text-zinc-400">
            <Bot className="h-4 w-4" />
            <span className="text-sm font-semibold">AI Analysis Summary</span>
            <span className="ml-auto text-xs italic text-zinc-600">
              Generated by Groq LLaMA 3.3 70B
            </span>
          </div>
          <p className="text-zinc-300 leading-relaxed">{report.ai_summary}</p>
        </section>
      )}

      {/* ── Report Metadata Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800 pt-6 text-xs text-zinc-600">
        <p>Analyzed on {formatDate(report.analyzed_at)}</p>
        <p>Report cached until {formatDate(report.cached_until)}</p>
        <p className="mt-1 font-mono">Report ID: {report.id}</p>
      </footer>
    </main>
  );
}
