import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Try as job ID first
    const [job] = await sql`
      SELECT status, report_id, error_message FROM analysis_jobs WHERE id = ${id}::uuid
    `;
    if (job) {
      return NextResponse.json({
        status: job.status,
        report_id: job.report_id,
        error: job.error_message,
      });
    }

    // Fall back to report ID
    const [report] = await sql`
      SELECT id FROM reports WHERE id = ${id}::uuid
    `;
    if (report) {
      return NextResponse.json({ status: 'complete', report_id: report.id });
    }
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
