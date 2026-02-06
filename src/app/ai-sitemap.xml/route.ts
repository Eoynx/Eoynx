import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'edge';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eoynx.com';
  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  let items: Array<{ slug: string; updated_at?: string; created_at?: string }> = [];

  const { data, error } = await sb
    .from('services')
    .select('slug, updated_at, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (!error && Array.isArray(data)) {
    items = data.filter((item: { slug?: string }) => Boolean(item.slug));
  }

  const urls = items.flatMap((item) => {
    const lastmod = item.updated_at || item.created_at;
    return [
      {
        loc: `${baseUrl}/s/${item.slug}/json-ld`,
        lastmod,
      },
      {
        loc: `${baseUrl}/s/${item.slug}/ai.txt`,
        lastmod,
      },
    ];
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}