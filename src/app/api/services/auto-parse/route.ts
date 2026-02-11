/**
 * 서비스 자동 파싱 API
 * 서비스 등록 시 sampleUrl을 Puppeteer로 파싱하여 셀렉터 자동 추출
 */

import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import * as jose from 'jose';

// Node.js runtime 사용 (Puppeteer 필요)
export const runtime = 'nodejs';
export const maxDuration = 60;

interface ParsedServiceData {
  url: string;
  title: string;
  description: string;
  image: string;
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
  urlPattern?: string;
  dataSource: 'json-ld' | 'meta' | 'dom';
  content: {
    headings: { level: number; text: string }[];
    images: { src: string; alt: string }[];
    links: { text: string; href: string }[];
    textSample: string;
  };
  parsedAt: string;
}

// JWT 검증
async function verifyAuth(request: NextRequest): Promise<{ id: string } | null> {
  try {
    const token = request.cookies.get('session')?.value
      || request.cookies.get('auth-token')?.value;
    if (!token) return null;
    
    const decoded = jose.decodeJwt(token);
    const id = decoded.sub as string | undefined;
    if (!id) return null;
    return { id };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 인증 확인 (선택적 - 개발 환경에서는 건너뛰기 가능)
    const user = await verifyAuth(request);
    if (!user && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { url, timeout = 20000, isProductPage = false } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Puppeteer로 페이지 파싱
    const result = await parseServicePage(url, timeout, isProductPage);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Auto-parse error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to parse page',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function parseServicePage(
  url: string, 
  timeout: number,
  isProductPage: boolean
): Promise<ParsedServiceData> {
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

    await page.setViewport({ width: 1920, height: 1080 });

    // 페이지 로드
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout,
    });

    // JavaScript 렌더링 대기
    await new Promise(resolve => setTimeout(resolve, 3000));

    // HTML 가져오기
    const html = await page.content();
    const $ = cheerio.load(html);

    // 기본 메타 데이터 추출
    const title = $('title').text().trim() 
      || $('meta[property="og:title"]').attr('content') || '';
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
    $('h1, h2, h3').each((_, el) => {
      const level = parseInt(el.tagName.substring(1));
      const text = $(el).text().trim().substring(0, 100);
      if (text && headings.length < 20) {
        headings.push({ level, text });
      }
    });

    // 이미지 추출 (최대 20개)
    const images: { src: string; alt: string }[] = [];
    $('img').each((_, el) => {
      if (images.length >= 20) return false;
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
      const alt = $(el).attr('alt') || '';
      if (src && (src.startsWith('http') || src.startsWith('//'))) {
        const fullSrc = src.startsWith('//') ? 'https:' + src : src;
        images.push({ src: fullSrc, alt });
      }
    });

    // 링크 추출 (최대 30개)
    const links: { text: string; href: string }[] = [];
    $('a[href]').each((_, el) => {
      if (links.length >= 30) return false;
      const href = $(el).attr('href');
      const text = $(el).text().trim().substring(0, 100);
      if (href && text && (href.startsWith('http') || href.startsWith('/'))) {
        const fullHref = href.startsWith('/') ? new URL(href, url).href : href;
        links.push({ text, href: fullHref });
      }
    });

    // 본문 텍스트 샘플
    $('script, style, noscript, header, footer, nav').remove();
    const textSample = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 2000);

    // 상품 정보 자동 추출
    const products = extractProducts($, jsonLd);

    // 셀렉터 자동 추천
    const suggestedSelectors = suggestSelectors($, jsonLd, isProductPage);

    // 데이터 소스 결정
    let dataSource: 'json-ld' | 'meta' | 'dom' = 'dom';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (jsonLd.some((d: any) => d['@type'] === 'Product' || d['@type'] === 'ItemList')) {
      dataSource = 'json-ld';
    } else if (meta['product:price:amount'] || meta['og:product:price:amount']) {
      dataSource = 'meta';
    }

    // URL 패턴 추출
    const urlPattern = extractUrlPattern(url);

    return {
      url,
      title,
      description,
      image,
      jsonLd,
      meta,
      suggestedSelectors,
      products,
      urlPattern,
      dataSource,
      content: {
        headings,
        images,
        links,
        textSample,
      },
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
function extractProducts($: cheerio.CheerioAPI, jsonLd: object[]): ParsedServiceData['products'] {
  const products: ParsedServiceData['products'] = [];

  // JSON-LD에서 상품 정보 추출
  for (const data of jsonLd) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = data as any;
    
    if (item['@type'] === 'Product') {
      products.push({
        name: item.name || '',
        price: item.offers?.price || item.offers?.lowPrice,
        image: Array.isArray(item.image) ? item.image[0] : item.image,
        url: item.url,
      });
    }
    
    // ItemList의 경우 개별 아이템 추출
    if (item['@type'] === 'ItemList' && item.itemListElement) {
      for (const listItem of item.itemListElement.slice(0, 20)) {
        if (listItem.item?.name || listItem.name) {
          products.push({
            name: listItem.item?.name || listItem.name,
            price: listItem.item?.offers?.price || listItem.offers?.price,
            image: listItem.item?.image || listItem.image,
            url: listItem.item?.url || listItem.url,
          });
        }
      }
    }
  }

  // HTML에서 상품 정보 추출 (JSON-LD가 없는 경우)
  if (products.length === 0) {
    // 쇼핑몰별 DOM 패턴 (한국 + 글로벌)
    const productPatterns = [
      // 일반 패턴
      '.product-card',
      '.product-item',
      '[data-product]',
      '.goods-item',
      '.item-card',
      '.product-list-item',
      '.prd-item',
      '.goods_list li',
      '.item_list li',
      // 무신사
      '.n-search-product-list__content > li',
      '.n-search-contents__inner .n-card',
      // 하이버
      '.product-list .product',
      '.item-wrap',
      // G마켓/옥션
      '.section__module .link__item',
      '.box__item-container',
      '.itemcard_item',
      // 11번가
      '.c-card-item',
      '.c_card_wrap',
      '.l_product_cont li',
      // 쿠팡
      '.search-product',
      '.baby-product-wrap',
      '[data-product-id]',
      // 유니클로
      '.fr-ec-product-tile',
      '.product-tile',
      // 신세계/SSG
      '.cunit_t232',
      '.cunit_t216',
      '.mndtl_unit',
      // ASOS
      '.productTile_U0clN',
      '[data-auto-id="productTile"]',
      '.product_card',
      // 자라
      '.product-grid-product',
      '.product-grid__product-item',
      // W컨셉
      '.product-item',
      '.prd-list-item',
      // 29CM
      '.css-1a2xv9b',
      '[data-testid="product-item"]',
    ];

    for (const pattern of productPatterns) {
      $(pattern).each((_, el) => {
        if (products.length >= 20) return false;
        
        const $el = $(el);
        
        // 쇼핑몰별 상품명 셀렉터
        const nameSelectors = [
          '.product-name', '.item-name', '.prd-name', '.goods_name',
          'h3', 'h4', '[class*="name"]', '[class*="title"]',
          '.n-card__name', '.item_name', '.c-card-item__name',
          '.product__name', '.itemcard_name', '.prd_name',
          '.product-tile__name', '.cunit_info .title',
        ];
        let name = '';
        for (const sel of nameSelectors) {
          const found = $el.find(sel).first().text().trim();
          if (found && found.length > 2) {
            name = found.substring(0, 200);
            break;
          }
        }
        
        // 쇼핑몰별 가격 셀렉터
        const priceSelectors = [
          '.price', '.product-price', '.prd-price', '[class*="price"]',
          '.n-card__price', '.item_price', '.c-card-item__price',
          '.product__price', '.itemcard_price', '.price_num',
          '.product-tile__price', '.cunit_info .price', '.sale-price',
          '.discount-price', '.final-price',
        ];
        let price = '';
        for (const sel of priceSelectors) {
          const priceText = $el.find(sel).first().text().trim();
          const match = priceText.match(/[\d,]+/);
          if (match) {
            price = match[0];
            break;
          }
        }
        const image = $el.find('img').first().attr('src') 
          || $el.find('img').first().attr('data-src');
        const href = $el.find('a').first().attr('href');
        
        if (name) {
          products.push({ name, price, image: image || undefined, url: href || undefined });
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
): ParsedServiceData['suggestedSelectors'] {
  const selectors: ParsedServiceData['suggestedSelectors'] = {};

  // JSON-LD 기반 추천
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productData = jsonLd.find((d: any) => d['@type'] === 'Product') as any;
  
  if (productData) {
    // JSON-LD가 있으면 JSON-LD 사용 권장
    selectors.title = 'json-ld:Product.name';
    selectors.price = 'json-ld:Product.offers.price';
    selectors.currency = 'json-ld:Product.offers.priceCurrency';
    selectors.image = 'json-ld:Product.image';
    selectors.description = 'json-ld:Product.description';
    selectors.sku = 'json-ld:Product.sku';
    selectors.brand = 'json-ld:Product.brand.name';
    selectors.availability = 'json-ld:Product.offers.availability';
    
    if (productData.aggregateRating) {
      selectors.rating = 'json-ld:Product.aggregateRating.ratingValue';
      selectors.reviewCount = 'json-ld:Product.aggregateRating.reviewCount';
    }
    
    return selectors;
  }

  // DOM 기반 셀렉터 추천 (상품 상세 페이지)
  if (isProductPage) {
    // 제목 셀렉터 탐지
    const titlePatterns = [
      { sel: 'h1.product-title', priority: 1 },
      { sel: 'h1.product-name', priority: 1 },
      { sel: '.product-title h1', priority: 2 },
      { sel: '.product-name', priority: 3 },
      { sel: '[data-product-title]', priority: 2 },
      { sel: '.prd_name', priority: 3 },
      { sel: 'h1', priority: 5 },
    ];
    for (const { sel } of titlePatterns) {
      if ($(sel).length > 0 && $(sel).text().trim()) {
        selectors.title = sel;
        break;
      }
    }

    // 가격 셀렉터 탐지
    const pricePatterns = [
      '.product-price .sale-price',
      '.product-price .current',
      '.price .current-price',
      '.price-value',
      '[data-price]',
      '.prd-price',
      '.sale_price',
      '.total_price',
    ];
    for (const sel of pricePatterns) {
      if ($(sel).length > 0) {
        selectors.price = sel;
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
      '.thumb_box img',
    ];
    for (const sel of imagePatterns) {
      if ($(sel).length > 0) {
        selectors.image = sel;
        break;
      }
    }

    // 설명 셀렉터 탐지
    const descPatterns = [
      '.product-description',
      '.product-detail',
      '.prd-desc',
      '[data-product-description]',
      '.detail_cont',
    ];
    for (const sel of descPatterns) {
      if ($(sel).length > 0) {
        selectors.description = sel;
        break;
      }
    }
  }

  return selectors;
}

/**
 * URL 패턴 자동 추출
 */
function extractUrlPattern(sampleUrl: string): string {
  try {
    const url = new URL(sampleUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // 숫자, 긴 해시, URL 인코딩된 한글 등을 {id}로 대체
    const patternParts = pathParts.map(part => {
      // 순수 숫자
      if (/^\d+$/.test(part)) return '{id}';
      // 긴 해시값 (8자 이상의 영숫자)
      if (/^[a-f0-9]{8,}$/i.test(part)) return '{id}';
      // URL 인코딩된 문자열 (예: %ED%95%9C%EA%B8%80)
      if (/%[0-9A-Fa-f]{2}/.test(part)) return '{keyword}';
      return part;
    });
    
    return '/' + patternParts.join('/');
  } catch {
    return '';
  }
}
