import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { load } from 'cheerio';

export const runtime = 'nodejs';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-for-development-only'
);

function isLikelyProductUrl(url: string): boolean {
  return /\/product\//i.test(url)
    || /product_no=/i.test(url)
    || /\/products\//i.test(url)
    || /\/item\//i.test(url);
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value || request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    try {
      await jwtVerify(token, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      );
    }

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Eoynx-Related-Parser/1.0 (+https://eoynx.com)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch URL' },
        { status: 400 }
      );
    }

    const html = await response.text();
    const $ = load(html);
    const origin = parsedUrl.origin;

    const links = new Set<string>();
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      try {
        const resolved = new URL(href, origin).toString();
        if (!resolved.startsWith(origin)) return;
        if (!isLikelyProductUrl(resolved)) return;
        links.add(resolved);
      } catch {
        // ignore
      }
    });

    return NextResponse.json({
      success: true,
      urls: Array.from(links).slice(0, 12),
    });
  } catch (error) {
    console.error('Related parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse related links' },
      { status: 500 }
    );
  }
}
