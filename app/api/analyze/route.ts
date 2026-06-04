import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/db/client';
import { parseRepoUrl } from '@/lib/github/api';
import { hashIP } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  const [profile] = await sql`
    SELECT is_suspended, github_installation_id FROM users WHERE id = ${userId}
  `;
  if (profile?.is_suspended) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
  }

  // Strict URL validation before any DB/API call
  const body = await request.json();
  const { repo_url } = body;
  const GITHUB_REPO_REGEX = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
  if (!GITHUB_REPO_REGEX.test(repo_url)) {
    return NextResponse.json({ error: 'Invalid GitHub repo URL format' }, { status: 400 });
  }
  const parsed = parseRepoUrl(repo_url);
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid GitHub repo URL' }, { status: 400 });
  }

  // Per-user rate limit: 10 analyses per hour
  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count FROM search_logs
    WHERE searcher_user_id = ${userId} AND created_at >= NOW() - INTERVAL '1 hour'
  `;
  if ((count as number) >= 10) {
    return NextResponse.json({ error: 'Rate limit: 10 analyses per hour' }, { status: 429 });
  }

  // Return cached report if still valid
  const [cached] = await sql`
    SELECT * FROM reports WHERE repo_url = ${repo_url} AND cached_until > NOW() LIMIT 1
  `;
  if (cached) {
    await sql`
      INSERT INTO search_logs
        (searcher_user_id, target_repo_url, target_repo_owner, report_id, final_imposter_score, ip_hash, user_agent)
      VALUES
        (${userId}, ${repo_url}, ${parsed.owner}, ${cached.id}, ${cached.final_imposter_score},
         ${hashIP(request.headers.get('x-forwarded-for') ?? '')},
         ${request.headers.get('user-agent') ?? ''})
    `;
    return NextResponse.json({ report_id: cached.id, cached: true });
  }

  // Create a new analysis job
  const [job] = await sql`
    INSERT INTO analysis_jobs (repo_url, requested_by_user_id, status)
    VALUES (${repo_url}, ${userId}, 'pending')
    RETURNING *
  `;

  // Fetch GitHub OAuth token from Neon Auth account table
  const [account] = await sql`
    SELECT "accessToken" FROM neon_auth.account
    WHERE "userId" = ${userId}::uuid AND "providerId" = 'github'
    ORDER BY "updatedAt" DESC LIMIT 1
  `;

  // Fire-and-forget: worker handles the long-running analysis
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/analyze-worker`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job_id: job.id,
      repo_url,
      owner: parsed.owner,
      repo: parsed.repo,
      user_id: userId,
      installation_id: profile?.github_installation_id ?? null,
      user_token: account?.accessToken ?? null,
    }),
  }).catch(() => {});

  return NextResponse.json({ job_id: job.id, cached: false });
}
