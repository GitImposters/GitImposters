'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Share2, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface Props {
  repoUrl: string;
  canReanalyze: boolean;
}

export default function ReportActions({ repoUrl, canReanalyze }: Props) {
  const router = useRouter();
  const [reanalyzing, setReanalyzing] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied!');
    } catch {
      toast.error('Could not copy link — please copy the URL manually.');
    }
  };

  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl }),
      });
      const data = await res.json();

      if (data.cached && data.report_id) {
        router.push(`/report/${data.report_id}`);
      } else if (data.job_id) {
        router.push(`/dashboard?prefill=${encodeURIComponent(repoUrl)}`);
      } else {
        toast.error(data.error ?? 'Failed to start re-analysis.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setReanalyzing(false);
    }
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Button variant="outline" className="gap-2 border-zinc-700" onClick={handleShare}>
        <Share2 className="h-4 w-4" />
        Share Report
      </Button>
      {canReanalyze && (
        <Button
          variant="ghost"
          className="gap-2 text-zinc-400 hover:text-zinc-200"
          onClick={handleReanalyze}
          disabled={reanalyzing}
        >
          {reanalyzing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Re-analyze
        </Button>
      )}
    </div>
  );
}
