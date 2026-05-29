import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { hashIP } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const serviceClient = createServiceClient();
    await serviceClient.from('auth_logs').insert({
      user_id: user.id,
      event_type: 'logout',
      ip_hash: hashIP(request.headers.get('x-forwarded-for') ?? ''),
      user_agent: request.headers.get('user-agent') ?? '',
    });
  }

  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/login`);
}
