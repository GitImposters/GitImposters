import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/db/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: session } = await auth.getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [caller] = await sql`SELECT role FROM users WHERE id = ${session.user.id}`;
  if (caller?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const reason: string | null = body.reason ?? null;

  await sql`UPDATE users SET is_suspended = true, suspension_reason = ${reason} WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
