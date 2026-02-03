/**
 * Agent Gateway - URL 데이터 추출 엔드포인트
 * 외부 URL의 HTML을 분석하여 구조화된 데이터 반환
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, ExtractedData, SchemaOrgBase } from '@/types';

export const runtime = 'edge';

/**
 * POST /api/agent/extract - URL에서 구조화된 데이터 추출
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, selectors } = body;

    if (!url) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'URL_REQUIRED',
          message: 'URL parameter is required',
        },
      } as ApiResponse<null>, { status: 400 });
    }

    // URL 유효성 검증
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'Invalid URL format',
        },
      } as ApiResponse<null>, { status: 400 });
    }

    // HTML 가져오기
    const fetchResponse = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'AgentGateway/1.0 (Data Extraction Service)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!fetchResponse.ok) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: `Failed to fetch URL: ${fetchResponse.status} ${fetchResponse.statusText}`,
        },
      } as ApiResponse<null>, { status: 502 });
    }

    const html = await fetchResponse.text();

    // 간단한 메타데이터 추출 (Edge에서는 cheerio 대신 정규식 사용)
    const metadata = extractMetadataFromHtml(html);
    const jsonLd = extractJsonLdFromHtml(html);

    const defaultStructuredData: SchemaOrgBase = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: metadata.title,
      description: metadata.description,
      url: targetUrl.toString(),
    };

    const extractedData: ExtractedData = {
      url: targetUrl.toString(),
      extractedAt: new Date().toISOString(),
      structuredData: jsonLd || defaultStructuredData,
      metadata,
    };

    return NextResponse.json({
      success: true,
      data: extractedData,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
      },
    } as ApiResponse<ExtractedData>);

  } catch (error) {
    console.error('[Extract] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'EXTRACTION_FAILED',
        message: 'Failed to extract data from URL',
      },
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * HTML에서 메타데이터 추출 (정규식 기반)
 */
function extractMetadataFromHtml(html: string): ExtractedData['metadata'] {
  const getMatch = (pattern: RegExp): string | undefined => {
    const match = html.match(pattern);
    return match ? match[1]?.trim() : undefined;
  };

  return {
    title: getMatch(/<title[^>]*>([^<]+)<\/title>/i)
      || getMatch(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i),
    description: getMatch(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
      || getMatch(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i),
    keywords: getMatch(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i)
      ?.split(',').map(k => k.trim()),
    canonical: getMatch(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i),
  };
}

/**
 * HTML에서 JSON-LD 추출
 */
function extractJsonLdFromHtml(html: string): SchemaOrgBase | null {
  const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const matches = [...html.matchAll(pattern)];

  for (const match of matches) {
    try {
      const jsonContent = match[1].trim();
      const parsed = JSON.parse(jsonContent);
      
      // 가장 상세한 데이터 반환
      if (Array.isArray(parsed)) {
        return parsed[0] as SchemaOrgBase;
      }
      return parsed as SchemaOrgBase;
    } catch {
      continue;
    }
  }

  return null;
}
