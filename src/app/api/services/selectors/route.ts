import { NextRequest, NextResponse } from 'next/server';
import { load, CheerioAPI } from 'cheerio';
import { verifySessionToken } from '@/lib/auth/jwt-config';

export const runtime = 'nodejs';

function deriveUrlPattern(pathname: string): string {
  if (!pathname || pathname === '/') return '/products/:id';
  return pathname
    .replace(/\d{3,}/g, ':id')
    .replace(/\/[^/]+$/, '/:id');
}

function pickSelector($: CheerioAPI, selectorList: string[]): string {
  for (const selector of selectorList) {
    if ($(selector).length > 0) return selector;
  }
  return '';
}

function bestSelector($: CheerioAPI, elementSelector: string): string {
  const el = $(elementSelector).first();
  if (!el.length) return '';
  const id = el.attr('id');
  if (id) return `#${id}`;
  const className = (el.attr('class') || '').split(' ').filter(Boolean)[0];
  if (className) return `.${className}`;
  return elementSelector;
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
        'User-Agent': 'Eoynx-Selector-Detector/1.0 (+https://eoynx.com)',
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

    const hasProductJsonLd = $('script[type="application/ld+json"]').toArray().some((el) => {
      try {
        const parsed = JSON.parse($(el).text());
        const blocks = Array.isArray(parsed) ? parsed : [parsed];
        return blocks.some((block) => {
          const type = block?.['@type'];
          return Array.isArray(type) ? type.includes('Product') : type === 'Product';
        });
      } catch {
        return false;
      }
    });

    const selectors = {
      title: pickSelector($, ['[itemprop=name]', 'h1', '.product-title', '.title', '.product-name']) || bestSelector($, 'h1'),
      price: pickSelector($, ['[itemprop=price]', '.price', '.product-price', '[data-price]']),
      currency: pickSelector($, ['[itemprop=priceCurrency]', '[data-currency]']),
      image: pickSelector($, ['[itemprop=image]', '.product-image img', 'img']),
      description: pickSelector($, ['[itemprop=description]', '.product-description', '.description']),
      sku: pickSelector($, ['[itemprop=sku]', '.sku', '[data-sku]']),
      brand: pickSelector($, ['[itemprop=brand]', '.brand', '[data-brand]']),
      availability: pickSelector($, ['[itemprop=availability]', '.availability', '[data-availability]']),
      rating: pickSelector($, ['[itemprop=ratingValue]', '.rating', '.product-rating']),
      reviewCount: pickSelector($, ['[itemprop=reviewCount]', '.review-count', '.reviews-count']),
    };

    return NextResponse.json({
      success: true,
      productPage: {
        urlPattern: deriveUrlPattern(parsedUrl.pathname),
        sampleUrl: parsedUrl.toString(),
        dataSource: hasProductJsonLd ? 'json-ld' : 'dom',
        selectors,
        notes: hasProductJsonLd
          ? 'JSON-LD가 감지되었습니다. JSON-LD 우선 사용 권장'
          : 'DOM 기반 셀렉터 자동 탐지 결과',
      },
    });
  } catch (error) {
    console.error('Selector detect error:', error);
    return NextResponse.json(
      { error: 'Failed to detect selectors' },
      { status: 500 }
    );
  }
}