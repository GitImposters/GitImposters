import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { parseRepoUrl } from '@/lib/github/api';
import { hashIP, decryptToken } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check suspension and fetch tokens
  const { data: profile } = await supabase
    .from('users')
    .select('is_suspended, github_access_token_encrypted, github_installation_id')
    .eq('id', user.id)
    .single();

  if (profile?.is_suspended) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
  }

  // Validate repo URL — strict character-class regex applied before any DB/API call
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

  // Rate limit: max 10 analyses per user per hour
  // Uses service client — search_logs has no user-accessible RLS policies
  const serviceClient = createServiceClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await serviceClient
    .from('search_logs')
    .select('*', { count: 'exact', head: true })
    .eq('searcher_user_id', user.id)
    .gte('created_at', oneHourAgo);

  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: 'Rate limit: 10 analyses per hour' }, { status: 429 });
  }

  // Check for cached report (cached_until in the future = still valid)
  const { data: cached } = await supabase
    .from('reports')
    .select('*')
    .eq('repo_url', repo_url)
    .gte('cached_until', new Date().toISOString())
    .single();

  if (cached) {
    await serviceClient.from('search_logs').insert({
      searcher_user_id: user.id,
      target_repo_url: repo_url,
      target_repo_owner: parsed.owner,
      report_id: cached.id,
      final_imposter_score: cached.final_imposter_score,
      ip_hash: hashIP(request.headers.get('x-forwarded-for') ?? ''),
      user_agent: request.headers.get('user-agent') ?? '',
    });
    return NextResponse.json({ report_id: cached.id, cached: true });
  }

  // Create a new analysis job (jobs_insert_own policy allows this)
  const { data: job } = await supabase
    .from('analysis_jobs')
    .insert({
      repo_url,
      requested_by_user_id: user.id,
      status: 'pending',
    })
    .select()
    .single();

  // Decrypt the stored GitHub OAuth token before passing to Edge Function
  // (token is AES-256-CBC encrypted at rest in public.users)
  let decryptedToken: string | null = null;
  if (profile?.github_access_token_encrypted) {
    try {
      decryptedToken = decryptToken(profile.github_access_token_encrypted);
    } catch {
      decryptedToken = null;
    }
  }

  // Trigger Supabase Edge Function — fire and forget
  // Do NOT await: the analysis runs for 20–45s; frontend polls job status
  fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-repo`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        job_id: job!.id,
        repo_url,
        owner: parsed.owner,
        repo: parsed.repo,
        user_id: user.id,
        installation_id: profile?.github_installation_id ?? null,
        user_token: decryptedToken,
      }),
    }
  ).catch(() => {
    // Edge Function errors are surfaced via job status in analysis_jobs table
  });

  return NextResponse.json({ job_id: job!.id, cached: false });
}
