import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@/types';

export async function requireAuth(): Promise<User> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');
  if (profile.is_suspended) redirect('/suspended');

  return profile as User;
}

export async function requireAdmin(): Promise<User> {
  const profile = await requireAuth();

  if (profile.role !== 'admin') redirect('/dashboard');

  return profile;
}
