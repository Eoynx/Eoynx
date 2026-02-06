import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { load } from 'cheerio';

export const runtime = 'nodejs';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-for-development-only'
);

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

    const { url, selectors } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const edgeParseUrl = process.env.EDGE_PARSE_URL || 'https://api.eoynx.com/parse';
    try {
      const response = await fetch(edgeParseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, selectors: selectors || {}, render: true }),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          success: true,
          extracted: data?.extracted || null,
        });
      }
    } catch {
      // ignore and fallback
    }

    // Fallback: direct fetch + local parse
    const htmlResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Eoynx-Parse-Sample/1.0 (+https://eoynx.com)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!htmlResponse.ok) {
      return NextResponse.json(
        { error: 'Parse failed', status: htmlResponse.status },
        { status: 400 }
      );
    }

    const html = await htmlResponse.text();
    const $ = load(html);
    const meta = (key: string) => $(
      `meta[property="${key}"], meta[name="${key}"]`
    ).attr('content') || null;

    const jsonLdProduct = (() => {
      const script = $('script[type="application/ld+json"]').first().text();
      if (!script) return null;
      try {
        const parsed = JSON.parse(script);
        const blocks = Array.isArray(parsed) ? parsed : [parsed];
        return blocks.find((block) => block?.['@type'] === 'Product' || (Array.isArray(block?.['@type']) && block['@type'].includes('Product')));
      } catch {
        return null;
      }
    })();

    const selectorsMap = selectors || {};
    const extractText = (selector?: string) => selector ? $(selector).first().text().trim() : '';
    const extractAttr = (selector?: string, attr?: string) => selector ? ($(selector).first().attr(attr || '') || '') : '';

    const extracted = {
      title: extractText(selectorsMap.title) || meta('og:title') || (jsonLdProduct?.name as string | undefined) || $('title').first().text().trim(),
      description: extractText(selectorsMap.description) || meta('og:description') || (jsonLdProduct?.description as string | undefined) || meta('description'),
      price: extractText(selectorsMap.price) || meta('product:price:amount') || (jsonLdProduct?.offers?.price as string | undefined) || '',
      image: extractAttr(selectorsMap.image, 'src') || meta('og:image') || (Array.isArray(jsonLdProduct?.image) ? jsonLdProduct?.image?.[0] : jsonLdProduct?.image as string | undefined) || null,
    };

    return NextResponse.json({
      success: true,
      extracted,
    });
  } catch (error) {
    console.error('Parse sample error:', error);
    return NextResponse.json(
      { error: 'Failed to parse sample' },
      { status: 500 }
    );
  }
}
