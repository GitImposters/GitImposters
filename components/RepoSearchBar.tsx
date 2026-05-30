'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import AnalysisProgressStepper from './AnalysisProgressStepper';

const GITHUB_URL_REGEX = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/;

export default function RepoSearchBar() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  // Read ?prefill= param client-side (avoids Suspense requirement of useSearchParams)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefill = params.get('prefill');
    if (prefill) setUrl(decodeURIComponent(prefill));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = url.trim();
    if (!GITHUB_URL_REGEX.test(trimmed)) {
      setError('Enter a valid GitHub repo URL — e.g. https://github.com/owner/repo');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Analysis failed. Please try again.');
        return;
      }

      if (data.cached && data.report_id) {
        router.push(`/report/${data.report_id}`);
        return;
      }

      if (data.job_id) {
        setJobId(data.job_id);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (jobId) return <AnalysisProgressStepper jobId={jobId} />;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-3">
        <Input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(''); }}
          placeholder="https://github.com/owner/repo"
          className="h-12 border-zinc-700 bg-zinc-900 text-base text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-primary"
          disabled={loading}
          autoComplete="off"
        />
        <Button
          type="submit"
          size="lg"
          className="h-12 gap-2 px-6"
          disabled={loading || !url.trim()}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? 'Analyzing…' : 'Analyze'}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
