import { cn } from '@/lib/utils';

function getProgressColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

function getScoreBadgeClass(score: number): string {
  if (score >= 80) return 'bg-green-900 text-green-300 border-green-700';
  if (score >= 60) return 'bg-yellow-900 text-yellow-300 border-yellow-700';
  if (score >= 40) return 'bg-orange-900 text-orange-300 border-orange-700';
  return 'bg-red-900 text-red-300 border-red-700';
}

interface Props {
  title: string;
  icon: React.ReactNode;
  score: number | null;
  findings: string[];
}

export default function CategoryScoreCard({ title, icon, score, findings }: Props) {
  const s = score ?? 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-300">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-sm font-semibold',
            getScoreBadgeClass(s)
          )}
        >
          {s}
        </span>
      </div>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={cn('h-full rounded-full transition-all', getProgressColor(s))}
          style={{ width: `${s}%` }}
        />
      </div>

      {findings.length > 0 ? (
        <ul className="space-y-1.5">
          {findings.map((finding, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span
                className={cn(
                  'mt-0.5 shrink-0 text-xs',
                  finding.startsWith('✓') ? 'text-green-500' : 'text-red-400'
                )}
              >
                ●
              </span>
              <span className="text-zinc-400">{finding}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-600">No findings recorded.</p>
      )}
    </div>
  );
}
