import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/db/client';
import type { UserRole } from '@/types';

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

  if (session.user.id === id) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const role: UserRole = body.role;
  if (role !== 'admin' && role !== 'user') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  await sql`UPDATE users SET role = ${role} WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
