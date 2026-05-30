import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  // Try as job ID first
  const { data: job } = await supabase
    .from('analysis_jobs')
    .select('status, report_id, error_message')
    .eq('id', id)
    .single();

  if (job) {
    return NextResponse.json({
      status: job.status,
      report_id: job.report_id,
      error: job.error_message,
    });
  }

  // Fall back to report ID
  const { data: report } = await supabase
    .from('reports')
    .select('id, final_imposter_score, verdict_label, cached_until')
    .eq('id', id)
    .single();

  if (report) {
    return NextResponse.json({ status: 'complete', report_id: report.id });
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
