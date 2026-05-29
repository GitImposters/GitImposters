import { AlertOctagon } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export default async function SuspendedPage() {
  let suspensionReason: string | null = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('suspension_reason')
        .eq('id', user.id)
        .single();

      suspensionReason = profile?.suspension_reason ?? null;
    }
  } catch {
    // No session or DB error — show generic message
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <AlertOctagon className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold text-foreground">
          Your account has been suspended.
        </h1>
        {suspensionReason && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {suspensionReason}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Contact support if you believe this is an error.
        </p>
      </div>
    </main>
  );
}
