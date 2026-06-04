import { auth } from '@/lib/auth/server';
import { NextResponse, type NextRequest } from 'next/server';

// In-memory rate limiter — resets on cold start
const ipMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 30) return true;
  entry.count++;
  return false;
}

const pageGuard = auth.middleware({ loginUrl: '/login' });

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate-limit all non-auth API calls (30 req/min per IP)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
  }

  // Protect page routes — redirect to login if no session
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    return pageGuard(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/api/:path*'],
};
