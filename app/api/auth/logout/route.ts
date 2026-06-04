import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/db/client';
import { hashIP } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  const { data: session } = await auth.getSession();

  if (session?.user) {
    await sql`
      INSERT INTO auth_logs (user_id, event_type, ip_hash, user_agent)
      VALUES (
        ${session.user.id},
        'logout',
        ${hashIP(request.headers.get('x-forwarded-for') ?? '')},
        ${request.headers.get('user-agent') ?? ''}
      )
    `;
  }

  await auth.signOut();
  return NextResponse.redirect(`${origin}/login`);
}
