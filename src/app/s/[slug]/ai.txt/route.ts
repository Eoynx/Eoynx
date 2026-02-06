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
    .select('ai_txt')
    .eq('slug', params.slug)
    .single();

  if (error || !data?.ai_txt) {
    return NextResponse.json(
      { error: 'Service not found' },
      { status: 404 }
    );
  }

  return new NextResponse(data.ai_txt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}