import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { verifySessionToken } from '@/lib/auth/jwt-config';

export const runtime = 'nodejs';

function isLikelyProductUrl(url: string): boolean {
  return /\/product\//i.test(url)
    || /product_no=/i.test(url)
    || /\/products\//i.test(url)
    || /\/item\//i.test(url);
}

const TITLE_BLACKLIST = ['related', '확대보기', '게시글', '신고', '카테고리'];

function isValidTitle(title?: string | null): boolean {
  if (!title) return false;
  const trimmed = title.trim();
  if (trimmed.length < 3) return false;
  return !TITLE_BLACKLIST.some((word) => trimmed.toLowerCase().includes(word.toLowerCase()));
}

function hasPrice(value?: string | null): boolean {
  if (!value) return false;
  return /\d/.test(value);
}

function parsePrice(value?: string | null): number {
  if (!value) return Infinity;
  const cleaned = value.replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? Infinity : num;
}

function extractFromHtml(html: string, selectors: Record<string, string>) {
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

  const extractText = (selector?: string) => selector ? $(selector).first().text().trim() : '';
  const extractAttr = (selector?: string, attr?: string) => selector ? ($(selector).first().attr(attr || '') || '') : '';

  return {
    title: extractText(selectors.title) || meta('og:title') || (jsonLdProduct?.name as string | undefined) || $('title').first().text().trim(),
    description: extractText(selectors.description) || meta('og:description') || (jsonLdProduct?.description as string | undefined) || meta('description'),
    price: extractText(selectors.price) || meta('product:price:amount') || (jsonLdProduct?.offers?.price as string | undefined) || '',
    image: extractAttr(selectors.image, 'src') || meta('og:image') || (Array.isArray(jsonLdProduct?.image) ? jsonLdProduct?.image?.[0] : jsonLdProduct?.image as string | undefined) || null,
  };
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

    const authResult = await verifySessionToken(token);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { url, selectors = {}, limit = 3, sortBy = 'none' } = await request.json();
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
        'User-Agent': 'Eoynx-Related-Parse/1.0 (+https://eoynx.com)',
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
      const text = $(el).text().trim();
      if (!href) return;
      try {
        const resolved = new URL(href, origin).toString();
        if (!resolved.startsWith(origin)) return;
        if (!isLikelyProductUrl(resolved)) return;
        if (!isValidTitle(text)) return;
        links.add(resolved);
      } catch {
        // ignore
      }
    });

    const targetLinks = Array.from(links).slice(0, Number(limit));
    const results = [] as Array<{ url: string; title?: string | null; price?: string | null; image?: string | null }>;

    for (const link of targetLinks) {
      try {
        const itemResponse = await fetch(link, {
          headers: {
            'User-Agent': 'Eoynx-Related-Parse/1.0 (+https://eoynx.com)',
            'Accept': 'text/html,application/xhtml+xml',
          },
        });
        if (!itemResponse.ok) continue;
        const itemHtml = await itemResponse.text();
        const extracted = extractFromHtml(itemHtml, selectors);
        const valid = isValidTitle(extracted.title) && (hasPrice(extracted.price) || Boolean(extracted.image));
        if (valid) {
          results.push({ url: link, ...extracted });
        }
      } catch {
        // ignore item errors
      }
    }

    // Sort results based on sortBy parameter
    if (sortBy === 'price-asc') {
      results.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    } else if (sortBy === 'price-desc') {
      results.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    } else if (sortBy === 'name') {
      results.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ko'));
    }

    return NextResponse.json({
      success: true,
      urls: targetLinks,
      items: results,
    });
  } catch (error) {
    console.error('Related parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse related items' },
      { status: 500 }
    );
  }
}
