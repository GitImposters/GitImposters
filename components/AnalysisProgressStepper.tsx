'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = [
  'Fetching commits',
  'Analyzing code',
  'Checking PRs',
  'Running AI checks',
  'Compiling score',
];

const POLL_MS = 3_000;
const STEP_MS = 6_000;
const TIMEOUT_MS = 120_000;

interface Props {
  jobId: string;
}

export default function AnalysisProgressStepper({ jobId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [gone, setGone] = useState(false);
  const startRef = useRef(Date.now());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    stepRef.current = setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, STEP_MS);

    const poll = async () => {
      if (Date.now() - startRef.current >= TIMEOUT_MS) {
        clearInterval(pollRef.current!);
        clearInterval(stepRef.current!);
        setGone(true);
        toast.error('Analysis timed out after 2 minutes. Please try again.');
        return;
      }
      try {
        const res = await fetch(`/api/report/${jobId}`);
        const data = await res.json();
        if (data.status === 'complete' && data.report_id) {
          clearInterval(pollRef.current!);
          clearInterval(stepRef.current!);
          router.push(`/report/${data.report_id}`);
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current!);
          clearInterval(stepRef.current!);
          setGone(true);
          toast.error(data.error ?? 'Analysis failed. Please try again.');
        }
      } catch { /* network hiccup — keep polling */ }
    };

    pollRef.current = setInterval(poll, POLL_MS);
    poll();

    return () => {
      clearInterval(pollRef.current!);
      clearInterval(stepRef.current!);
    };
  }, [jobId, router]);

  if (gone) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <p className="mb-6 text-sm text-zinc-400">
        Analysis in progress — this takes 20–45 seconds…
      </p>
      <div className="flex items-start">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <div className="flex flex-1 justify-center">
                {i < step ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : i === step ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <Circle className="h-6 w-6 text-zinc-700" />
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 ${i < step ? 'bg-green-500' : 'bg-zinc-700'}`}
                />
              )}
            </div>
            <span
              className={`mt-2 px-1 text-center text-xs ${
                i === step ? 'text-zinc-100' : i < step ? 'text-zinc-500' : 'text-zinc-700'
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
