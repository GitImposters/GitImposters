import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/db/client';
import { hashIP } from '@/lib/crypto';

// Called by Neon Auth as callbackURL after GitHub OAuth completes.
// Logs the login event and checks for suspension before redirecting.
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Upsert the app profile row (first login creates it)
  const [profile] = await sql`
    INSERT INTO users (id, github_username, github_avatar_url, email, last_login_at)
    VALUES (
      ${session.user.id},
      ${session.user.name ?? ''},
      ${session.user.image ?? null},
      ${session.user.email ?? null},
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      github_username = EXCLUDED.github_username,
      github_avatar_url = EXCLUDED.github_avatar_url,
      last_login_at = EXCLUDED.last_login_at
    RETURNING *
  `;

  await sql`
    INSERT INTO auth_logs (user_id, event_type, ip_hash, user_agent)
    VALUES (
      ${session.user.id},
      'login',
      ${hashIP(request.headers.get('x-forwarded-for') ?? '')},
      ${request.headers.get('user-agent') ?? ''}
    )
  `;

  if (profile?.is_suspended) {
    return NextResponse.redirect(`${origin}/suspended`);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
