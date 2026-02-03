import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

interface SitemapParseResult {
  sitemapUrl: string;
  totalUrls: number;
  parsedUrls: number;
  urls: {
    url: string;
    title: string;
    description: string;
    contentLength: number;
    status: 'success' | 'error' | 'skipped';
    error?: string;
  }[];
  parseTime: number;
  summary: {
    avgContentLength: number;
    successRate: number;
    totalCharacters: number;
  };
}

// 사이트맵 XML 파싱
function parseSitemapXml(xml: string): SitemapUrl[] {
  const urls: SitemapUrl[] = [];
  
  // <url> 태그 추출
  const urlPattern = /<url>([\s\S]*?)<\/url>/gi;
  let match;
  
  while ((match = urlPattern.exec(xml)) !== null) {
    const urlContent = match[1];
    
    // loc (필수)
    const locMatch = urlContent.match(/<loc>([^<]*)<\/loc>/i);
    if (!locMatch) continue;
    
    const url: SitemapUrl = {
      loc: locMatch[1].trim(),
    };
    
    // lastmod (선택)
    const lastmodMatch = urlContent.match(/<lastmod>([^<]*)<\/lastmod>/i);
    if (lastmodMatch) url.lastmod = lastmodMatch[1].trim();
    
    // changefreq (선택)
    const changefreqMatch = urlContent.match(/<changefreq>([^<]*)<\/changefreq>/i);
    if (changefreqMatch) url.changefreq = changefreqMatch[1].trim();
    
    // priority (선택)
    const priorityMatch = urlContent.match(/<priority>([^<]*)<\/priority>/i);
    if (priorityMatch) url.priority = priorityMatch[1].trim();
    
    urls.push(url);
  }
  
  return urls;
}

// 단일 페이지 파싱 (간략 버전)
async function parsePageQuick(url: string): Promise<{
  title: string;
  description: string;
  contentLength: number;
}> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Eoynx-Sitemap-Crawler/1.0 (+https://eoynx.com)',
      'Accept': 'text/html',
    },
    signal: AbortSignal.timeout(5000), // 5초 타임아웃 (빠른 처리)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const html = await response.text();
  
  // 제목 추출
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  
  // 설명 추출
  const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
  const description = descMatch ? descMatch[1] : '';
  
  // 콘텐츠 길이 (script/style 제거 후)
  const cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return {
    title,
    description,
    contentLength: cleanHtml.length,
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { sitemapUrl, limit = 10, concurrent = 3 } = await request.json();
    
    if (!sitemapUrl) {
      return NextResponse.json(
        { error: 'sitemapUrl is required' },
        { status: 400 }
      );
    }
    
    // 사이트맵 URL 검증
    let parsedSitemapUrl: URL;
    try {
      parsedSitemapUrl = new URL(sitemapUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid sitemap URL' },
        { status: 400 }
      );
    }
    
    // 사이트맵 페치
    const sitemapResponse = await fetch(sitemapUrl, {
      headers: {
        'User-Agent': 'Eoynx-Sitemap-Crawler/1.0 (+https://eoynx.com)',
        'Accept': 'application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!sitemapResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch sitemap: ${sitemapResponse.status}` },
        { status: 502 }
      );
    }
    
    const sitemapXml = await sitemapResponse.text();
    
    // 사이트맵 파싱
    const sitemapUrls = parseSitemapXml(sitemapXml);
    
    if (sitemapUrls.length === 0) {
      return NextResponse.json(
        { error: 'No URLs found in sitemap' },
        { status: 400 }
      );
    }
    
    // 제한된 수의 URL만 파싱 (속도 최적화)
    const urlsToProcess = sitemapUrls.slice(0, Math.min(limit, 50)); // 최대 50개
    const parsedPages: SitemapParseResult['urls'] = [];
    
    // 동시 처리 (concurrent 수만큼 병렬)
    const chunks: SitemapUrl[][] = [];
    for (let i = 0; i < urlsToProcess.length; i += concurrent) {
      chunks.push(urlsToProcess.slice(i, i + concurrent));
    }
    
    for (const chunk of chunks) {
      const results = await Promise.allSettled(
        chunk.map(async (sitemapUrl) => {
          try {
            const pageData = await parsePageQuick(sitemapUrl.loc);
            return {
              url: sitemapUrl.loc,
              ...pageData,
              status: 'success' as const,
            };
          } catch (error) {
            return {
              url: sitemapUrl.loc,
              title: '',
              description: '',
              contentLength: 0,
              status: 'error' as const,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        })
      );
      
      for (const result of results) {
        if (result.status === 'fulfilled') {
          parsedPages.push(result.value);
        }
      }
    }
    
    // 통계 계산
    const successfulPages = parsedPages.filter(p => p.status === 'success');
    const totalCharacters = successfulPages.reduce((sum, p) => sum + p.contentLength, 0);
    
    const result: SitemapParseResult = {
      sitemapUrl,
      totalUrls: sitemapUrls.length,
      parsedUrls: parsedPages.length,
      urls: parsedPages,
      parseTime: Date.now() - startTime,
      summary: {
        avgContentLength: successfulPages.length > 0 
          ? Math.round(totalCharacters / successfulPages.length) 
          : 0,
        successRate: parsedPages.length > 0 
          ? Math.round((successfulPages.length / parsedPages.length) * 100) 
          : 0,
        totalCharacters,
      },
    };
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Sitemap parse error:', error);
    
    return NextResponse.json(
      { error: 'Failed to parse sitemap' },
      { status: 500 }
    );
  }
}

// GET: 사용법 안내
export async function GET() {
  return NextResponse.json({
    description: 'Eoynx Sitemap Parser API',
    usage: {
      method: 'POST',
      body: {
        sitemapUrl: 'https://example.com/sitemap.xml (required)',
        limit: 'Number of URLs to parse (default: 10, max: 50)',
        concurrent: 'Concurrent requests (default: 3, max: 5)',
      },
    },
    example: 'POST /api/proxy/sitemap with {"sitemapUrl": "https://example.com/sitemap.xml", "limit": 10}',
    notes: [
      'Large sitemaps are limited to 50 URLs per request',
      'Each page has a 5-second timeout',
      'Use smaller limits for faster responses',
    ],
  });
}
