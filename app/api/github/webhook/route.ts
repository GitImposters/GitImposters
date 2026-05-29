import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-hub-signature-256') ?? '';

  const expectedSig =
    'sha256=' +
    createHmac('sha256', process.env.GITHUB_APP_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

  if (signature !== expectedSig) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = request.headers.get('x-github-event');
  const payload = JSON.parse(body);

  if (event === 'installation') {
    const installationId = String(payload.installation.id);
    const githubUsername: string = payload.sender.login;
    const action: string = payload.action;
    const supabase = createServiceClient();

    if (action === 'created') {
      await supabase
        .from('users')
        .update({ github_installation_id: installationId })
        .eq('github_username', githubUsername);
    }

    if (action === 'deleted' || action === 'suspend') {
      await supabase
        .from('users')
        .update({ github_installation_id: null })
        .eq('github_username', githubUsername);
    }

    if (action === 'unsuspend') {
      await supabase
        .from('users')
        .update({ github_installation_id: installationId })
        .eq('github_username', githubUsername);
    }
  }

  return NextResponse.json({ ok: true });
}
