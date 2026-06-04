import { redirect } from 'next/navigation';
import { auth } from './server';
import { sql } from '@/lib/db/client';
import type { User } from '@/types';

export async function requireAuth(): Promise<User> {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect('/login');

  // Upsert app profile on first GitHub login; keep github_username/avatar fresh
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

  if (!profile) redirect('/login');
  if (profile.is_suspended) redirect('/suspended');
  return profile as User;
}

export async function requireAdmin(): Promise<User> {
  const profile = await requireAuth();
  if (profile.role !== 'admin') redirect('/dashboard');
  return profile;
}
