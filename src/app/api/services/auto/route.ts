import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { verifySessionToken } from '@/lib/auth/jwt-config';

export const runtime = 'nodejs';

function deriveUrlPattern(pathname: string): string {
  if (!pathname || pathname === '/') return '/products/:id';
  return pathname
    .replace(/\d{3,}/g, ':id')
    .replace(/\/[^/]+$/, '/:id');
}

function extractFirstEmail(text: string): string | null {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : null;
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
        'User-Agent': 'Eoynx-Auto-Parser/1.0 (+https://eoynx.com)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch the URL' },
        { status: 400 }
      );
    }

    const html = await response.text();
    const $ = load(html);

    const title = $('meta[property="og:site_name"]').attr('content')
      || $('meta[name="application-name"]').attr('content')
      || $('title').first().text().trim();

    const description = $('meta[property="og:description"]').attr('content')
      || $('meta[name="description"]').attr('content')
      || '';

    const homepage = parsedUrl.origin;
    const apiBase = `${parsedUrl.origin}/api`;
    const email = extractFirstEmail(html) || '';

    // Edge parse (Cloudflare) for better extraction
    let parsedTitle: string | null = null;
    let parsedDescription: string | null = null;
    let parsedPrice: string | null = null;
    let parsedImage: string | null = null;
    try {
      const edgeParseUrl = process.env.EDGE_PARSE_URL || 'https://api.eoynx.com/parse';
      const parseResponse = await fetch(edgeParseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: parsedUrl.toString(), render: true }),
      });
      if (parseResponse.ok) {
        const parseData = await parseResponse.json();
        const extracted = parseData?.extracted || {};
        parsedTitle = extracted.title || null;
        parsedDescription = extracted.description || null;
        parsedPrice = extracted.price || null;
        parsedImage = extracted.image || null;
      }
    } catch {
      // ignore
    }

    // JSON-LD 탐색
    const jsonLdBlocks: Array<Record<string, unknown>> = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const text = $(el).text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          parsed.forEach((p) => typeof p === 'object' && p && jsonLdBlocks.push(p));
        } else if (typeof parsed === 'object' && parsed) {
          jsonLdBlocks.push(parsed);
        }
      } catch {
        // ignore
      }
    });

    const hasProductJsonLd = jsonLdBlocks.some((block) => {
      const type = (block['@type'] as string | string[] | undefined);
      if (Array.isArray(type)) return type.includes('Product');
      return type === 'Product';
    });

    const productPage = {
      urlPattern: deriveUrlPattern(parsedUrl.pathname),
      sampleUrl: parsedUrl.toString(),
      dataSource: hasProductJsonLd ? 'json-ld' : 'dom',
      selectors: hasProductJsonLd ? {
        title: 'jsonld.name',
        price: 'jsonld.offers.price',
        currency: 'jsonld.offers.priceCurrency',
        image: 'jsonld.image',
        description: 'jsonld.description',
        sku: 'jsonld.sku',
        brand: 'jsonld.brand.name',
        availability: 'jsonld.offers.availability',
        rating: 'jsonld.aggregateRating.ratingValue',
        reviewCount: 'jsonld.aggregateRating.reviewCount',
      } : {
        title: 'h1',
        price: '[itemprop=price], .price',
        currency: '[itemprop=priceCurrency]',
        image: 'img[itemprop=image], .product-image img',
        description: '[itemprop=description], .product-description',
        sku: '[itemprop=sku], .sku',
        brand: '[itemprop=brand], .brand',
        availability: '[itemprop=availability], .availability',
        rating: '[itemprop=ratingValue], .rating',
        reviewCount: '[itemprop=reviewCount], .review-count',
      },
      notes: [
        hasProductJsonLd ? 'JSON-LD 기반으로 자동 채움' : 'DOM 셀렉터 기본값으로 자동 채움',
        parsedPrice ? `샘플 가격: ${parsedPrice}` : '',
        parsedImage ? `샘플 이미지: ${parsedImage}` : '',
      ].filter(Boolean).join(' | '),
    };

    const nameValue = parsedTitle || title || parsedUrl.hostname;
    const descriptionValue = parsedDescription || description || `${parsedUrl.hostname} 서비스`;
    const hasKorean = /[가-힣]/.test(`${nameValue} ${descriptionValue}`);

    return NextResponse.json({
      success: true,
      service: {
        name: nameValue,
        nameKo: hasKorean ? nameValue : '',
        description: descriptionValue,
        descriptionKo: hasKorean ? descriptionValue : '',
        homepage,
        apiBase,
        endpoints: [],
        authType: 'none',
        rateLimit: '100/min',
        contactEmail: email,
        productPage,
      },
    });
  } catch (error) {
    console.error('Auto parse error:', error);
    return NextResponse.json(
      { error: 'Failed to auto-parse service' },
      { status: 500 }
    );
  }
}