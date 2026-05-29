import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { hashIP, encryptToken } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const githubUser = data.user;
  const metadata = githubUser.user_metadata;
  const serviceClient = createServiceClient();

  // Encrypt the GitHub OAuth token before storing
  const rawToken = data.session?.provider_token;
  const encryptedToken = rawToken ? encryptToken(rawToken) : null;

  await serviceClient.from('users').upsert(
    {
      id: githubUser.id,
      github_id: String(metadata.provider_id ?? metadata.sub),
      github_username: metadata.user_name ?? metadata.preferred_username,
      github_avatar_url: metadata.avatar_url ?? null,
      email: githubUser.email ?? null,
      github_access_token_encrypted: encryptedToken,
      last_login_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  await serviceClient.from('auth_logs').insert({
    user_id: githubUser.id,
    event_type: 'login',
    ip_hash: hashIP(request.headers.get('x-forwarded-for') ?? ''),
    user_agent: request.headers.get('user-agent') ?? '',
  });

  const { data: profile } = await serviceClient
    .from('users')
    .select('is_suspended')
    .eq('id', githubUser.id)
    .single();

  if (profile?.is_suspended) {
    return NextResponse.redirect(`${origin}/suspended`);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
