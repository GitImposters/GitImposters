import { cn } from '@/lib/utils';

function getScoreClass(score: number): string {
  if (score <= 20) return 'bg-green-900 text-green-300 border-green-700';
  if (score <= 40) return 'bg-yellow-900 text-yellow-300 border-yellow-700';
  if (score <= 60) return 'bg-orange-900 text-orange-300 border-orange-700';
  if (score <= 80) return 'bg-red-900 text-red-300 border-red-700';
  return 'bg-red-950 text-red-200 border-red-800';
}

interface Props {
  score: number;
  size?: 'sm' | 'lg';
}

export default function ImposterScoreBadge({ score, size = 'sm' }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-mono font-semibold',
        getScoreClass(score),
        size === 'sm' ? 'px-2.5 py-0.5 text-sm' : 'px-4 py-1.5 text-lg'
      )}
    >
      {score}
    </span>
  );
}
