import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Edge Gateway URL (Cloudflare Workers)
const EDGE_GATEWAY_URL = process.env.EDGE_GATEWAY_URL;

interface ParseResult {
  url: string;
  title: string;
  description: string;
  content: string;
  metadata: {
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogType?: string;
    canonical?: string;
    author?: string;
    publishedTime?: string;
    keywords?: string[];
  };
  structuredData: object[];
  links: { text: string; href: string }[];
  headings: { level: number; text: string }[];
  parseTime: number;
  contentLength: number;
  cached: boolean;
  source: 'edge-gateway' | 'fallback';
}

// 간단한 메모리 캐시 (프로덕션에서는 Redis 사용)
const cache = new Map<string, { data: ParseResult; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5분

// HTML에서 텍스트 추출 (간단한 버전)
function extractText(html: string): string {
  // script, style, noscript 태그 제거
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  
  // nav, header, footer, aside, advertisement 관련 요소 제거
  text = text
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<div[^>]*class="[^"]*(?:ad|advertisement|banner|sidebar)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  
  // HTML 태그 제거하고 텍스트만 추출
  text = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  
  return text;
}

// 메타데이터 추출
function extractMetadata(html: string): ParseResult['metadata'] {
  const metadata: ParseResult['metadata'] = {};
  
  // Open Graph 메타 태그
  const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i);
  if (ogTitleMatch) metadata.ogTitle = ogTitleMatch[1];
  
  const ogDescMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i);
  if (ogDescMatch) metadata.ogDescription = ogDescMatch[1];
  
  const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/i);
  if (ogImageMatch) metadata.ogImage = ogImageMatch[1];
  
  const ogTypeMatch = html.match(/<meta[^>]*property="og:type"[^>]*content="([^"]*)"[^>]*>/i);
  if (ogTypeMatch) metadata.ogType = ogTypeMatch[1];
  
  // Canonical URL
  const canonicalMatch = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"[^>]*>/i);
  if (canonicalMatch) metadata.canonical = canonicalMatch[1];
  
  // Author
  const authorMatch = html.match(/<meta[^>]*name="author"[^>]*content="([^"]*)"[^>]*>/i);
  if (authorMatch) metadata.author = authorMatch[1];
  
  // Published Time
  const publishedMatch = html.match(/<meta[^>]*property="article:published_time"[^>]*content="([^"]*)"[^>]*>/i);
  if (publishedMatch) metadata.publishedTime = publishedMatch[1];
  
  // Keywords
  const keywordsMatch = html.match(/<meta[^>]*name="keywords"[^>]*content="([^"]*)"[^>]*>/i);
  if (keywordsMatch) {
    metadata.keywords = keywordsMatch[1].split(',').map(k => k.trim()).filter(Boolean);
  }
  
  return metadata;
}

// 제목 추출
function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : '';
}

// 설명 추출
function extractDescription(html: string): string {
  const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
  return descMatch ? descMatch[1] : '';
}

// JSON-LD 구조화 데이터 추출
function extractStructuredData(html: string): object[] {
  const structuredData: object[] = [];
  const jsonLdPattern = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  
  while ((match = jsonLdPattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      structuredData.push(data);
    } catch {
      // JSON 파싱 실패시 무시
    }
  }
  
  return structuredData;
}

// 헤딩 추출
function extractHeadings(html: string): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = [];
  const headingPattern = /<h([1-6])[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/h\1>/gi;
  let match;
  
  while ((match = headingPattern.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    if (text) {
      headings.push({ level, text });
    }
  }
  
  return headings.slice(0, 20); // 최대 20개
}

// 링크 추출 (외부 링크만)
function extractLinks(html: string, baseUrl: string): { text: string; href: string }[] {
  const links: { text: string; href: string }[] = [];
  const linkPattern = /<a[^>]*href="([^"]*)"[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/a>/gi;
  let match;
  
  const baseDomain = new URL(baseUrl).hostname;
  
  while ((match = linkPattern.exec(html)) !== null) {
    try {
      const href = match[1];
      const text = match[2].replace(/<[^>]+>/g, '').trim();
      
      if (text && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        // 절대 URL로 변환
        const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
        const linkDomain = new URL(fullUrl).hostname;
        
        // 외부 링크만 포함 (또는 중요 내부 링크)
        if (linkDomain !== baseDomain || href.includes('/api/') || href.includes('/docs/')) {
          links.push({ text: text.substring(0, 100), href: fullUrl });
        }
      }
    } catch {
      // URL 파싱 실패시 무시
    }
  }
  
  return links.slice(0, 30); // 최대 30개
}

/**
 * Edge Gateway를 통한 파싱 시도
 */
async function parseWithEdgeGateway(url: string, selectors?: Record<string, string>): Promise<ParseResult | null> {
  if (!EDGE_GATEWAY_URL) {
    console.log('[Proxy] Edge Gateway URL not configured, using fallback');
    return null;
  }
  
  try {
    const startTime = Date.now();
    const response = await fetch(`${EDGE_GATEWAY_URL}/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.EDGE_GATEWAY_API_KEY || '',
      },
      body: JSON.stringify({ url, selectors, render: true }),
      signal: AbortSignal.timeout(15000), // 15초 타임아웃 (브라우저 렌더링 고려)
    });
    
    if (!response.ok) {
      console.warn(`[Proxy] Edge Gateway returned ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.warn('[Proxy] Edge Gateway error:', data.error);
      return null;
    }
    
    // Edge Gateway 응답을 ParseResult 형식으로 변환
    const result: ParseResult = {
      url: data.url || url,
      title: data.extracted?.title || '',
      description: data.extracted?.description || '',
      content: data.extracted?.description || '', // Edge Gateway는 간단한 추출만 제공
      metadata: {
        ogTitle: data.extracted?.title,
        ogDescription: data.extracted?.description,
        ogImage: data.extracted?.image,
      },
      structuredData: [],
      links: [],
      headings: [],
      parseTime: Date.now() - startTime,
      contentLength: data.extracted?.description?.length || 0,
      cached: false,
      source: 'edge-gateway',
    };
    
    console.log(`[Proxy] Edge Gateway parse success: ${url} (${result.parseTime}ms)`);
    return result;
    
  } catch (error) {
    console.error('[Proxy] Edge Gateway error:', error);
    return null;
  }
}

/**
 * Fallback: 자체 파싱 로직
 */
async function parseWithFallback(url: string, startTime: number): Promise<ParseResult> {
  // URL 페치
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Eoynx-Proxy/1.0 (+https://eoynx.com)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    signal: AbortSignal.timeout(10000), // 10초 타임아웃
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }
  
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    throw new Error('URL does not return HTML content');
  }
  
  const html = await response.text();
  
  // 파싱
  const title = extractTitle(html);
  const description = extractDescription(html);
  const content = extractText(html);
  const metadata = extractMetadata(html);
  const structuredData = extractStructuredData(html);
  const headings = extractHeadings(html);
  const links = extractLinks(html, url);
  
  return {
    url,
    title,
    description,
    content: content.substring(0, 10000), // 최대 10000자
    metadata,
    structuredData,
    headings,
    links,
    parseTime: Date.now() - startTime,
    contentLength: content.length,
    cached: false,
    source: 'fallback',
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { url, options, selectors } = await request.json();
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }
    
    // URL 유효성 검사
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }
    
    // 캐시 확인
    const cacheKey = url;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiry > Date.now() && !options?.noCache) {
      return NextResponse.json({
        ...cached.data,
        cached: true,
        parseTime: Date.now() - startTime,
      });
    }
    
    let result: ParseResult | null = null;
    
    // 1단계: Edge Gateway 시도
    if (!options?.fallbackOnly) {
      result = await parseWithEdgeGateway(url, selectors);
    }
    
    // 2단계: Fallback (자체 파싱)
    if (!result) {
      console.log('[Proxy] Using fallback parser for:', url);
      result = await parseWithFallback(url, startTime);
    }
    
    // 캐시 저장
    cache.set(cacheKey, {
      data: result,
      expiry: Date.now() + CACHE_TTL,
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Proxy parse error:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse URL' },
      { status: 500 }
    );
  }
}

// GET 메서드도 지원 (간단한 테스트용)
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({
      description: 'Eoynx Proxy Parser API',
      usage: {
        method: 'POST',
        body: '{ "url": "https://example.com" }',
        options: {
          noCache: 'Skip cache and fetch fresh content',
          fallbackOnly: 'Skip Edge Gateway and use fallback parser only',
        },
        selectors: {
          title: 'Custom CSS selector for title',
          description: 'Custom CSS selector for description',
          price: 'Custom CSS selector for price',
          image: 'Custom CSS selector for image',
        },
      },
      edgeGateway: {
        configured: !!EDGE_GATEWAY_URL,
        url: EDGE_GATEWAY_URL ? 'Configured' : 'Not configured',
      },
      example: 'POST /api/proxy/parse with {"url": "https://example.com"}',
    });
  }
  
  // GET으로 URL 전달시 POST로 처리
  const fakeRequest = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
  
  return POST(fakeRequest);
}
