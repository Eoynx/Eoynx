/**
 * 자동 페이지 파싱 유틸리티
 * Puppeteer를 사용하여 웹 페이지를 파싱하고 셀렉터를 자동 추출합니다.
 */

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export interface ParsedPageData {
  url: string;
  title: string;
  description: string;
  image: string;
  content: {
    text: string;
    headings: { level: number; text: string }[];
    images: { src: string; alt: string }[];
    links: { text: string; href: string }[];
  };
  jsonLd: object[];
  meta: Record<string, string>;
  suggestedSelectors: {
    title?: string;
    price?: string;
    currency?: string;
    image?: string;
    description?: string;
    sku?: string;
    brand?: string;
    availability?: string;
    rating?: string;
    reviewCount?: string;
  };
  products: {
    name: string;
    price?: string;
    image?: string;
    url?: string;
  }[];
  parsedAt: string;
}

export interface AutoParseOptions {
  url: string;
  timeout?: number;
  waitFor?: string;
  isProductPage?: boolean;
}

/**
 * Puppeteer를 사용하여 페이지를 파싱합니다.
 */
export async function autoParsePage(options: AutoParseOptions): Promise<ParsedPageData> {
  const { url, timeout = 15000, waitFor, isProductPage = false } = options;
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
      ],
    });

    const page = await browser.newPage();
    
    // User-Agent 설정
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // 뷰포트 설정
    await page.setViewport({ width: 1920, height: 1080 });

    // 페이지 로드
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout,
    });

    // 특정 셀렉터 대기
    if (waitFor) {
      await page.waitForSelector(waitFor, { timeout: 5000 }).catch(() => {});
    }

    // JavaScript 렌더링 대기
    await page.waitForTimeout(2000);

    // HTML 가져오기
    const html = await page.content();
    const $ = cheerio.load(html);

    // 기본 메타 데이터 추출
    const title = $('title').text().trim() || $('meta[property="og:title"]').attr('content') || '';
    const description = $('meta[name="description"]').attr('content') 
      || $('meta[property="og:description"]').attr('content') || '';
    const image = $('meta[property="og:image"]').attr('content') || '';

    // 모든 메타 태그 추출
    const meta: Record<string, string> = {};
    $('meta').each((_, el) => {
      const name = $(el).attr('name') || $(el).attr('property');
      const content = $(el).attr('content');
      if (name && content) {
        meta[name] = content;
      }
    });

    // JSON-LD 데이터 추출
    const jsonLd: object[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || '');
        if (Array.isArray(data)) {
          jsonLd.push(...data);
        } else {
          jsonLd.push(data);
        }
      } catch {
        // JSON 파싱 실패 무시
      }
    });

    // 헤딩 추출
    const headings: { level: number; text: string }[] = [];
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const level = parseInt(el.tagName.substring(1));
      const text = $(el).text().trim();
      if (text) {
        headings.push({ level, text });
      }
    });

    // 이미지 추출 (최대 20개)
    const images: { src: string; alt: string }[] = [];
    $('img').each((_, el) => {
      if (images.length >= 20) return false;
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
      const alt = $(el).attr('alt') || '';
      if (src && src.startsWith('http')) {
        images.push({ src, alt });
      }
    });

    // 링크 추출 (최대 30개)
    const links: { text: string; href: string }[] = [];
    $('a[href]').each((_, el) => {
      if (links.length >= 30) return false;
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && text && href.startsWith('http')) {
        links.push({ text, href });
      }
    });

    // 본문 텍스트 추출
    $('script, style, noscript').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 5000);

    // 상품 정보 자동 추출 시도
    const products = extractProducts($, jsonLd);

    // 셀렉터 자동 추천
    const suggestedSelectors = suggestSelectors($, jsonLd, isProductPage);

    return {
      url,
      title,
      description,
      image,
      content: {
        text,
        headings,
        images,
        links,
      },
      jsonLd,
      meta,
      suggestedSelectors,
      products,
      parsedAt: new Date().toISOString(),
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * 상품 정보 자동 추출
 */
function extractProducts($: cheerio.CheerioAPI, jsonLd: object[]): ParsedPageData['products'] {
  const products: ParsedPageData['products'] = [];

  // JSON-LD에서 상품 정보 추출
  for (const data of jsonLd) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = data as any;
    
    if (item['@type'] === 'Product' || item['@type'] === 'ItemList') {
      if (item.name) {
        products.push({
          name: item.name,
          price: item.offers?.price || item.offers?.lowPrice,
          image: item.image?.[0] || item.image,
          url: item.url,
        });
      }
      
      // ItemList의 경우 개별 아이템 추출
      if (item.itemListElement) {
        for (const listItem of item.itemListElement) {
          if (listItem.item?.name) {
            products.push({
              name: listItem.item.name,
              price: listItem.item.offers?.price,
              image: listItem.item.image,
              url: listItem.item.url,
            });
          }
        }
      }
    }
  }

  // HTML에서 상품 정보 추출 (일반적인 패턴)
  if (products.length === 0) {
    // 상품 카드 패턴 탐지
    const productPatterns = [
      '.product-card',
      '.product-item',
      '[data-product]',
      '.goods-item',
      '.item-card',
      '.product-list-item',
      '.prd-item',
    ];

    for (const pattern of productPatterns) {
      $(pattern).each((_, el) => {
        if (products.length >= 20) return false;
        
        const $el = $(el);
        const name = $el.find('.product-name, .item-name, .prd-name, h3, h4').first().text().trim();
        const price = $el.find('.price, .product-price, .prd-price').first().text().trim();
        const image = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src');
        const url = $el.find('a').first().attr('href');
        
        if (name) {
          products.push({ name, price, image, url });
        }
      });
      
      if (products.length > 0) break;
    }
  }

  return products.slice(0, 20);
}

/**
 * 셀렉터 자동 추천
 */
function suggestSelectors(
  $: cheerio.CheerioAPI, 
  jsonLd: object[],
  isProductPage: boolean
): ParsedPageData['suggestedSelectors'] {
  const selectors: ParsedPageData['suggestedSelectors'] = {};

  // JSON-LD 기반 추천
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productData = jsonLd.find((d: any) => d['@type'] === 'Product') as any;
  
  if (productData) {
    // JSON-LD가 있으면 DOM 셀렉터 대신 JSON-LD 사용 권장
    selectors.title = 'json-ld:Product.name';
    selectors.price = 'json-ld:Product.offers.price';
    selectors.currency = 'json-ld:Product.offers.priceCurrency';
    selectors.image = 'json-ld:Product.image';
    selectors.description = 'json-ld:Product.description';
    selectors.sku = 'json-ld:Product.sku';
    selectors.brand = 'json-ld:Product.brand.name';
    selectors.availability = 'json-ld:Product.offers.availability';
    selectors.rating = 'json-ld:Product.aggregateRating.ratingValue';
    selectors.reviewCount = 'json-ld:Product.aggregateRating.reviewCount';
    
    return selectors;
  }

  // DOM 기반 셀렉터 추천
  if (isProductPage) {
    // 제목 셀렉터 탐지
    const titlePatterns = [
      'h1.product-title',
      'h1.product-name',
      '.product-title',
      '.product-name',
      '[data-product-title]',
      'h1',
    ];
    for (const pattern of titlePatterns) {
      if ($(pattern).length > 0) {
        selectors.title = pattern;
        break;
      }
    }

    // 가격 셀렉터 탐지
    const pricePatterns = [
      '.product-price .current',
      '.product-price .sale-price',
      '.price .current',
      '.price-value',
      '[data-price]',
      '.prd-price',
    ];
    for (const pattern of pricePatterns) {
      if ($(pattern).length > 0) {
        selectors.price = pattern;
        break;
      }
    }

    // 이미지 셀렉터 탐지
    const imagePatterns = [
      '.product-image img',
      '.product-gallery img',
      '.main-image img',
      '[data-product-image]',
      '.prd-img img',
    ];
    for (const pattern of imagePatterns) {
      if ($(pattern).length > 0) {
        selectors.image = pattern;
        break;
      }
    }

    // 설명 셀렉터 탐지
    const descPatterns = [
      '.product-description',
      '.product-detail',
      '.prd-desc',
      '[data-product-description]',
    ];
    for (const pattern of descPatterns) {
      if ($(pattern).length > 0) {
        selectors.description = pattern;
        break;
      }
    }
  }

  return selectors;
}

/**
 * URL 패턴 자동 추출
 */
export function extractUrlPattern(sampleUrls: string[]): string {
  if (sampleUrls.length === 0) return '';
  if (sampleUrls.length === 1) {
    // 단일 URL에서 패턴 추출
    const url = new URL(sampleUrls[0]);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // 숫자로 보이는 부분을 {id}로 대체
    const patternParts = pathParts.map(part => {
      if (/^\d+$/.test(part)) return '{id}';
      if (/^[a-f0-9]{8,}$/i.test(part)) return '{id}';
      return part;
    });
    
    return '/' + patternParts.join('/');
  }
  
  // 여러 URL에서 공통 패턴 추출
  const urls = sampleUrls.map(u => new URL(u));
  const pathArrays = urls.map(u => u.pathname.split('/').filter(Boolean));
  
  if (pathArrays.length === 0) return '';
  
  const pattern: string[] = [];
  const maxLength = Math.max(...pathArrays.map(p => p.length));
  
  for (let i = 0; i < maxLength; i++) {
    const parts = pathArrays.map(p => p[i]).filter(Boolean);
    const uniqueParts = new Set(parts);
    
    if (uniqueParts.size === 1) {
      pattern.push(parts[0]);
    } else {
      pattern.push('{id}');
    }
  }
  
  return '/' + pattern.join('/');
}
