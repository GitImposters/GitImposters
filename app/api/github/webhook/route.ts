import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { sql } from '@/lib/db/client';

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
    const githubLogin: string = payload.sender.login;
    const githubNumericId: string = String(payload.sender.id);
    const action: string = payload.action;

    if (action === 'created' || action === 'unsuspend') {
      // Match by neon_auth.account.accountId (GitHub numeric user ID) for reliable lookup
      await sql`
        UPDATE users u
        SET github_installation_id = ${installationId},
            github_username = ${githubLogin}
        FROM neon_auth.account a
        WHERE a."userId" = u.id
          AND a."providerId" = 'github'
          AND a."accountId" = ${githubNumericId}
      `;
    }

    if (action === 'deleted' || action === 'suspend') {
      await sql`
        UPDATE users u
        SET github_installation_id = NULL
        FROM neon_auth.account a
        WHERE a."userId" = u.id
          AND a."providerId" = 'github'
          AND a."accountId" = ${githubNumericId}
      `;
    }
  }

  return NextResponse.json({ ok: true });
}
