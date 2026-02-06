import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'edge';

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data, error } = await sb
    .from('services')
    .select('json_ld')
    .eq('slug', params.slug)
    .single();

  if (error || !data?.json_ld) {
    return NextResponse.json(
      { error: 'Service not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(data.json_ld, {
    headers: {
      'Content-Type': 'application/ld+json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}