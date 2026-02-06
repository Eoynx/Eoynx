import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { load } from 'cheerio';

export const runtime = 'nodejs';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-for-development-only'
);

// 사용자 역할별 최대 limit 설정
const ROLE_LIMITS: Record<string, number> = {
  free: 5,
  pro: 20,
  admin: 50,
};

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

// 가격 문자열에서 숫자 추출
function extractPriceNumber(price?: string | null): number {
  if (!price) return 0;
  const matches = price.replace(/[,]/g, '').match(/[\d.]+/);
  return matches ? parseFloat(matches[0]) : 0;
}

// 중복 제거 함수 (URL 기준)
function removeDuplicates<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    // URL에서 쿼리 파라미터 제거한 기본 경로로 중복 체크
    const baseUrl = item.url.split('?')[0];
    if (seen.has(baseUrl)) return false;
    seen.add(baseUrl);
    return true;
  });
}

// 정렬 함수
type SortType = 'none' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc';

function sortItems<T extends { title?: string | null; price?: string | null }>(
  items: T[],
  sortBy: SortType
): T[] {
  if (sortBy === 'none') return items;
  
  return [...items].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        return extractPriceNumber(a.price) - extractPriceNumber(b.price);
      case 'price-desc':
        return extractPriceNumber(b.price) - extractPriceNumber(a.price);
      case 'name-asc':
        return (a.title || '').localeCompare(b.title || '', 'ko');
      case 'name-desc':
        return (b.title || '').localeCompare(a.title || '', 'ko');
      default:
        return 0;
    }
  });
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

    let userRole = 'free';
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      userRole = (payload.role as string) || 'free';
    } catch {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { url, selectors = {}, limit = 3, sortBy = 'none' as SortType, removeDuplicatesEnabled = true } = await request.json();
    
    // 사용자 역할에 따른 최대 limit 적용
    const maxLimit = ROLE_LIMITS[userRole] || ROLE_LIMITS.free;
    const effectiveLimit = Math.min(Number(limit), maxLimit);
    
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
      if (!href) return;
      try {
        const resolved = new URL(href, origin).toString();
        if (!resolved.startsWith(origin)) return;
        if (!isLikelyProductUrl(resolved)) return;
        // 현재 페이지와 동일한 URL은 제외
        if (resolved === parsedUrl.toString()) return;
        links.add(resolved);
      } catch {
        // ignore
      }
    });

    console.log(`Found ${links.size} product links`);
    const targetLinks = Array.from(links).slice(0, effectiveLimit);
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
        // 최소한 title 또는 image가 있으면 유효
        const hasValidTitle = extracted.title && extracted.title.length >= 2;
        const hasValidImage = Boolean(extracted.image);
        const valid = hasValidTitle || hasValidImage;
        if (valid) {
          results.push({ url: link, ...extracted });
        }
      } catch (err) {
        console.error(`Error parsing ${link}:`, err);
        // ignore item errors
      }
    }

    // 중복 제거 적용
    let processedItems = removeDuplicatesEnabled ? removeDuplicates(results) : results;
    
    // 정렬 적용
    processedItems = sortItems(processedItems, sortBy as SortType);

    return NextResponse.json({
      success: true,
      urls: targetLinks,
      items: processedItems,
      meta: {
        requestedLimit: Number(limit),
        appliedLimit: effectiveLimit,
        maxLimit,
        userRole,
        sortBy,
        removeDuplicatesEnabled,
        originalCount: results.length,
        processedCount: processedItems.length,
      },
    });
  } catch (error) {
    console.error('Related parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse related items' },
      { status: 500 }
    );
  }
}
