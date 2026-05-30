import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Lazy singleton — not evaluated at module load time, so safe during build.
// NEVER import this in any client component or 'use client' file.
let _instance: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (!_instance) {
    _instance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _instance;
}

// Convenience alias matching the spec name — all method calls proxy through to the lazy client
export const adminSupabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return (getAdminClient() as unknown as Record<string, unknown>)[prop as string];
  },
});
