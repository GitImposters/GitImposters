'use client';

import { CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Props {
  installationId: string | null;
}

export default function GitHubAppStatusWidget({ installationId }: Props) {
  if (installationId) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">GitHub App installed</p>
          <p className="text-xs text-muted-foreground">
            Private repository access is enabled.
          </p>
        </div>
        <Badge variant="secondary" className="text-green-500 border-green-500/30 bg-green-500/10">
          Active
        </Badge>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">GitHub App not installed</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Install the GitImposters GitHub App to analyze private repositories.
          </p>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="mt-3 gap-1.5 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
          >
            <a
              href="https://github.com/apps/gitimposters/installations/new"
              target="_blank"
              rel="noopener noreferrer"
            >
              Install GitHub App
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
