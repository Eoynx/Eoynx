/**
 * HTML에서 구조화된 데이터(JSON-LD)를 추출하는 유틸리티
 * Cheerio를 사용하여 웹페이지의 핵심 데이터를 Schema.org 형식으로 변환
 */

import * as cheerio from 'cheerio';
import type { 
  SchemaOrgBase, 
  SchemaOrgProduct, 
  SchemaOrgOffer,
  ExtractedData,
  ExtractionRule,
  ExtractionConfig 
} from '@/types';

/**
 * HTML 문자열에서 기존 JSON-LD 데이터 추출
 */
export function extractExistingJsonLd(html: string): SchemaOrgBase[] {
  const $ = cheerio.load(html);
  const jsonLdScripts: SchemaOrgBase[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const content = $(element).html();
      if (content) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          jsonLdScripts.push(...parsed);
        } else {
          jsonLdScripts.push(parsed);
        }
      }
    } catch {
      // JSON 파싱 실패 시 무시
    }
  });

  return jsonLdScripts;
}

/**
 * 메타 태그에서 기본 정보 추출
 */
export function extractMetadata(html: string): ExtractedData['metadata'] {
  const $ = cheerio.load(html);

  return {
    title: $('title').text() || $('meta[property="og:title"]').attr('content'),
    description: $('meta[name="description"]').attr('content') 
      || $('meta[property="og:description"]').attr('content'),
    keywords: $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()),
    canonical: $('link[rel="canonical"]').attr('href'),
  };
}

/**
 * 제품 정보 추출 (e-commerce 사이트용)
 */
export function extractProductData(html: string): SchemaOrgProduct | null {
  const $ = cheerio.load(html);

  // 일반적인 e-commerce 사이트 패턴들
  const selectors = {
    name: [
      'h1[itemprop="name"]',
      '.product-title',
      '.product-name',
      '#product-name',
      'h1.title',
      '[data-product-name]',
    ],
    price: [
      '[itemprop="price"]',
      '.product-price',
      '.price',
      '#product-price',
      '[data-price]',
      '.sale-price',
    ],
    description: [
      '[itemprop="description"]',
      '.product-description',
      '#product-description',
      '.description',
    ],
    image: [
      '[itemprop="image"]',
      '.product-image img',
      '#product-image',
      '.main-image img',
    ],
    sku: [
      '[itemprop="sku"]',
      '.product-sku',
      '[data-sku]',
    ],
    availability: [
      '[itemprop="availability"]',
      '.availability',
      '.stock-status',
    ],
  };

  const findFirst = (selectorList: string[], attr?: string): string | undefined => {
    for (const selector of selectorList) {
      const element = $(selector).first();
      if (element.length) {
        if (attr) {
          return element.attr(attr) || element.text().trim();
        }
        return element.text().trim() || element.attr('content');
      }
    }
    return undefined;
  };

  const name = findFirst(selectors.name);
  if (!name) return null;

  const priceText = findFirst(selectors.price);
  const price = priceText ? parsePrice(priceText) : undefined;

  const availabilityText = findFirst(selectors.availability);
  const availability = parseAvailability(availabilityText);

  const offer: SchemaOrgOffer | undefined = price ? {
    '@context': 'https://schema.org',
    '@type': 'Offer',
    price: price.amount,
    priceCurrency: price.currency,
    availability,
  } : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: findFirst(selectors.description),
    image: findFirst(selectors.image, 'src'),
    sku: findFirst(selectors.sku),
    offers: offer,
  };
}

/**
 * 가격 문자열 파싱
 */
function parsePrice(priceText: string): { amount: number; currency: string } {
  // 통화 기호 매핑
  const currencySymbols: Record<string, string> = {
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    '₩': 'KRW',
    '원': 'KRW',
  };

  let currency = 'KRW'; // 기본값
  let amountStr = priceText;

  // 통화 기호 찾기
  for (const [symbol, code] of Object.entries(currencySymbols)) {
    if (priceText.includes(symbol)) {
      currency = code;
      amountStr = priceText.replace(symbol, '');
      break;
    }
  }

  // 숫자만 추출
  const amount = parseFloat(amountStr.replace(/[^\d.]/g, '')) || 0;

  return { amount, currency };
}

/**
 * 재고 상태 파싱
 */
function parseAvailability(text?: string): SchemaOrgOffer['availability'] {
  if (!text) return 'InStock';

  const lower = text.toLowerCase();
  
  if (lower.includes('out of stock') || lower.includes('품절') || lower.includes('sold out')) {
    return 'OutOfStock';
  }
  if (lower.includes('pre-order') || lower.includes('예약')) {
    return 'PreOrder';
  }
  if (lower.includes('limited') || lower.includes('한정')) {
    return 'LimitedAvailability';
  }

  return 'InStock';
}

/**
 * 커스텀 규칙을 사용한 데이터 추출
 */
export function extractWithRules(
  html: string,
  rules: ExtractionRule[]
): Record<string, unknown> {
  const $ = cheerio.load(html);
  const result: Record<string, unknown> = {};

  for (const rule of rules) {
    const element = $(rule.selector).first();
    
    if (!element.length) continue;

    let value: string | number | Date | undefined;
    
    if (rule.attribute) {
      value = element.attr(rule.attribute);
    } else {
      value = element.text();
    }

    if (value && rule.transform) {
      value = applyTransform(value.toString(), rule.transform);
    }

    if (value !== undefined) {
      setNestedValue(result, rule.mapping, value);
    }
  }

  return result;
}

/**
 * 값 변환 적용
 */
function applyTransform(
  value: string,
  transform: ExtractionRule['transform']
): string | number | Date {
  switch (transform) {
    case 'trim':
      return value.trim();
    case 'lowercase':
      return value.toLowerCase();
    case 'uppercase':
      return value.toUpperCase();
    case 'number':
      return parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
    case 'date':
      return new Date(value);
    default:
      return value;
  }
}

/**
 * 중첩된 객체에 값 설정 (예: "offers.price" -> { offers: { price: value } })
 */
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * 전체 페이지에서 모든 구조화된 데이터 추출
 */
export async function extractStructuredData(
  html: string,
  url: string,
  config?: ExtractionConfig
): Promise<ExtractedData> {
  const existingJsonLd = extractExistingJsonLd(html);
  const metadata = extractMetadata(html);
  
  // 기존 JSON-LD가 있으면 사용, 없으면 자동 추출 시도
  let structuredData: SchemaOrgBase;
  
  if (existingJsonLd.length > 0) {
    // 가장 상세한 데이터 선택
    structuredData = existingJsonLd.reduce((best, current) => {
      const currentKeys = Object.keys(current).length;
      const bestKeys = Object.keys(best).length;
      return currentKeys > bestKeys ? current : best;
    });
  } else {
    // 자동 추출 시도
    const product = extractProductData(html);
    
    if (product) {
      structuredData = product;
    } else if (config?.rules) {
      // 커스텀 규칙 적용
      const extracted = extractWithRules(html, config.rules);
      structuredData = {
        '@context': 'https://schema.org',
        '@type': config.defaultSchema || 'WebPage',
        ...extracted,
      };
    } else {
      // 기본 WebPage 스키마
      structuredData = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: metadata.title,
        description: metadata.description,
        url,
      };
    }
  }

  return {
    url,
    extractedAt: new Date().toISOString(),
    structuredData,
    metadata,
  };
}

/**
 * URL에서 데이터 가져와서 추출
 */
export async function fetchAndExtract(
  url: string,
  config?: ExtractionConfig
): Promise<ExtractedData> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AgentGateway/1.0 (Data Extraction Bot)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const html = await response.text();
  return extractStructuredData(html, url, config);
}
