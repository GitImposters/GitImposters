'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Search, BarChart2, Share2 } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Search,
    title: '6-Point Analysis',
    description:
      'Commit quality, code authorship, PR habits, repo hygiene, consistency, and test coverage.',
  },
  {
    icon: BarChart2,
    title: 'Instant Scores',
    description:
      'Category scores plus a final Imposter Score with a plain-English verdict label.',
  },
  {
    icon: Share2,
    title: 'Shareable Reports',
    description: 'Public report links you can send to anyone — no account required to view.',
  },
];

export default function HomePage() {
  const [ctaHref, setCtaHref] = useState('/login');

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (data?.user) setCtaHref('/dashboard');
    });
  }, []);

  return (
    <main className="flex min-h-screen flex-col bg-background">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-32 text-center">
        <h1 className="max-w-3xl text-5xl font-bold tracking-tight md:text-7xl">
          Is that developer{' '}
          <span className="text-primary">for real?</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
          GitImposters analyzes GitHub repos and tells you if someone actually knows how to code.
        </p>
        <Button asChild size="lg" className="mt-10 gap-2 px-8 py-6 text-base">
          <Link href={ctaHref}>
            Analyze a Repo <ArrowRight className="h-5 w-5" />
          </Link>
        </Button>
      </section>

      {/* Feature highlights */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-24">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <Icon className="mb-4 h-8 w-8 text-primary" />
              <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
