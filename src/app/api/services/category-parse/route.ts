/**
 * 카테고리/검색 페이지용 상품 파서
 * React/Vue 등 SPA 사이트에서도 상품 목록을 추출
 */

import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ProductItem {
  name: string;
  price?: string;
  originalPrice?: string;
  discount?: string;
  image?: string;
  url?: string;
  brand?: string;
  rating?: string;
  reviewCount?: string;
}

interface CategoryParseResult {
  url: string;
  title: string;
  totalProducts?: number;
  products: ProductItem[];
  pagination?: {
    currentPage: number;
    totalPages?: number;
    hasNext: boolean;
  };
  parsedAt: string;
}

// User-Agent 풀 (봇 탐지 우회용)
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

// 쇼핑몰별 필수 쿠키/헤더 설정
const SITE_SPECIFIC_CONFIGS: Record<string, {
  cookies?: Array<{ name: string; value: string; domain: string }>;
  headers?: Record<string, string>;
  waitTime?: number;
  scrollCount?: number;
}> = {
  'musinsa.com': {
    waitTime: 4000,
    scrollCount: 3,
  },
  'hiver.co.kr': {
    waitTime: 4000,
    scrollCount: 3,
  },
  'wconcept.co.kr': {
    waitTime: 4000,
    scrollCount: 3,
  },
  'gmarket.co.kr': {
    cookies: [
      { name: 'shipnation', value: 'KR', domain: '.gmarket.co.kr' },
    ],
    headers: {
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    waitTime: 3000,
  },
  'coupang.com': {
    headers: {
      'Accept-Language': 'ko-KR,ko;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    },
    waitTime: 4000,
  },
  'auction.co.kr': {
    cookies: [
      { name: 'shipnation', value: 'KR', domain: '.auction.co.kr' },
    ],
    headers: {
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    waitTime: 3000,
  },
  '11st.co.kr': {
    waitTime: 2500,
  },
};

interface BotBypassOptions {
  proxy?: string;
  cookies?: Array<{ name: string; value: string }>;
  headers?: Record<string, string>;
  stealth?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { 
      url, 
      timeout = 25000, 
      scrollToLoad = true,
      botBypass = true,  // 봇 차단 우회 기본 활성화
      proxy,
      cookies,
      headers,
    } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const bypassOptions: BotBypassOptions = {
      proxy,
      cookies,
      headers,
      stealth: botBypass,
    };

    const result = await parseCategoryPage(url, timeout, scrollToLoad, bypassOptions);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Category parse error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to parse category page',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function parseCategoryPage(
  url: string,
  timeout: number,
  scrollToLoad: boolean,
  bypassOptions: BotBypassOptions = {}
): Promise<CategoryParseResult> {
  let browser;
  const { proxy, cookies, headers, stealth = true } = bypassOptions;

  // URL에서 도메인 추출
  const urlObj = new URL(url);
  const domain = urlObj.hostname;

  // 사이트별 설정 가져오기
  const siteConfig = Object.entries(SITE_SPECIFIC_CONFIGS).find(([key]) => 
    domain.includes(key)
  )?.[1] || {};

  // 랜덤 User-Agent 선택
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  try {
    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1920x1080',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--disable-background-timer-throttling',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
    ];

    // 프록시 설정
    if (proxy) {
      launchArgs.push(`--proxy-server=${proxy}`);
    }

    browser = await puppeteer.launch({
      headless: 'new', // 새로운 headless 모드 (더 나은 스텔스)
      args: launchArgs,
    });

    const page = await browser.newPage();

    // 스텔스 모드 적용
    if (stealth) {
      await applyStealthMode(page);
    }
    
    await page.setUserAgent(userAgent);
    await page.setViewport({ width: 1920, height: 1080 });

    // 기본 헤더 설정
    const defaultHeaders: Record<string, string> = {
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'Upgrade-Insecure-Requests': '1',
      ...siteConfig.headers,
      ...headers,
    };
    await page.setExtraHTTPHeaders(defaultHeaders);

    // 쿠키 설정
    const allCookies = [
      ...(siteConfig.cookies || []),
      ...(cookies || []).map(c => ({ ...c, domain })),
    ];
    if (allCookies.length > 0) {
      await page.setCookie(...allCookies);
    }

    // 요청 간 랜덤 지연 (인간 행동 모방)
    await randomDelay(500, 1500);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout,
    });

    // React SPA 사이트용 상품 요소 대기 (강화된 버전)
    if (domain.includes('musinsa.com')) {
      console.log('[Category Parse] 무신사 - 상품 요소 대기 중...');
      try {
        // data-price 속성이 있는 요소 대기
        await page.waitForSelector('a[data-price], a[data-item-id]', { timeout: 15000 });
        console.log('[Category Parse] 무신사 - 상품 요소 발견');
      } catch {
        console.log('[Category Parse] 무신사 - 상품 요소 대기 타임아웃, 스크롤 시도');
        // 스크롤로 강제 로딩 시도
        await page.evaluate(() => window.scrollBy(0, 500));
        await new Promise(r => setTimeout(r, 3000));
      }
    }
    
    if (domain.includes('wconcept.co.kr') || domain.includes('hiver.co.kr')) {
      try {
        await page.waitForSelector('a[href*="/products/"], a[href*="/goods/"], [class*="product"]', { timeout: 10000 });
      } catch {
        // 타임아웃 무시
      }
    }

    // 11번가 상품 요소 대기
    if (domain.includes('11st.co.kr')) {
      try {
        await page.waitForSelector('[class*="c-card"], [class*="product"], .l_product_cont', { timeout: 10000 });
      } catch {
        // 타임아웃 무시
      }
    }

    // 사이트별 대기 시간
    const waitTime = siteConfig.waitTime || 2000;
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // 무한 스크롤 페이지 처리 (사이트별 스크롤 횟수 적용)
    if (scrollToLoad) {
      const scrollCount = siteConfig.scrollCount || 5;
      await autoScroll(page, scrollCount);
    }

    const html = await page.content();
    const $ = cheerio.load(html);

    const title = $('title').text().trim();
    
    // 디버그: data-price 속성이 있는 요소 수
    const dataPriceCount = $('a[data-price]').length;
    const productLinksCount = $('a[href*="/products/"]').length;
    console.log(`[Category Parse] URL: ${url}`);
    console.log(`[Category Parse] data-price 요소: ${dataPriceCount}, /products/ 링크: ${productLinksCount}`);

    // 상품 목록 추출 (다양한 전략 시도)
    let products = extractProductsFromDOM($, url);
    
    console.log(`[Category Parse] extractProductsFromDOM 결과: ${products.length}개`);
    
    // DOM에서 못 찾으면 텍스트+이미지 매칭 시도
    if (products.length === 0) {
      products = extractProductsFromTextAndImages($, url);
    }

    // 그래도 못 찾으면 반복 패턴 분석
    if (products.length === 0) {
      products = extractProductsFromRepeatingPattern($, url);
    }

    // 총 상품 수 추출 시도
    const totalProducts = extractTotalCount($);

    // 페이지네이션 정보
    const pagination = extractPagination($, url);

    return {
      url,
      title,
      totalProducts,
      products,
      pagination,
      parsedAt: new Date().toISOString(),
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * 랜덤 지연 (인간 행동 모방)
 */
async function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * 스텔스 모드 적용 (봇 탐지 우회)
 */
async function applyStealthMode(page: puppeteer.Page): Promise<void> {
  // navigator.webdriver 숨기기
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
  });

  // Chrome 플러그인 모방
  await page.evaluateOnNewDocument(() => {
    (window as any).chrome = {
      runtime: {},
      loadTimes: function() { },
      csi: function() { },
      app: {},
    };
  });

  // permissions API 수정
  await page.evaluateOnNewDocument(() => {
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters: any) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
        : originalQuery(parameters);
  });

  // plugins 배열 수정
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', filename: 'internal-nacl-plugin' },
      ],
    });
  });

  // languages 배열 수정
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'languages', {
      get: () => ['ko-KR', 'ko', 'en-US', 'en'],
    });
  });

  // WebGL 렌더러 정보 수정
  await page.evaluateOnNewDocument(() => {
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter: number) {
      if (parameter === 37445) {
        return 'Intel Inc.';
      }
      if (parameter === 37446) {
        return 'Intel Iris OpenGL Engine';
      }
      return getParameter.call(this, parameter);
    };
  });
}

/**
 * 페이지 자동 스크롤 (무한 스크롤 대응)
 */
async function autoScroll(page: puppeteer.Page, maxScrolls: number = 5): Promise<void> {
  await page.evaluate(async (scrollCount: number) => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      let scrolls = 0;
      
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        scrolls++;
        
        if (scrolls >= scrollCount || totalHeight >= document.body.scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 500);
    });
  }, maxScrolls);
  
  // 스크롤 후 추가 렌더링 대기
  await new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * DOM 기반 상품 추출 (강화된 버전)
 */
function extractProductsFromDOM($: cheerio.CheerioAPI, baseUrl: string): ProductItem[] {
  const products: ProductItem[] = [];

  // 전략 0: 무신사 data 속성 기반 추출 (data-price, data-item-id 등)
  const musinsaLinks = $('a[data-price], a[data-item-id]');
  if (musinsaLinks.length > 5) {
    const seenIds = new Set<string>();
    
    musinsaLinks.each((_, el) => {
      if (products.length >= 30) return false;
      
      const $link = $(el);
      const itemId = $link.attr('data-item-id');
      const price = $link.attr('data-price');
      const originalPrice = $link.attr('data-original-price');
      const discountRate = $link.attr('data-discount-rate');
      const href = $link.attr('href') || '';
      
      // 중복 제거
      if (!itemId || seenIds.has(itemId)) return;
      seenIds.add(itemId);
      
      // 상품명 찾기 (링크의 형제/자식에서)
      let name = $link.find('span[class*="Typography"]').text().trim();
      if (!name) {
        name = $link.attr('aria-label')?.replace('상품상세로 이동', '').trim() || '';
      }
      
      if (name && price) {
        const url = href.startsWith('http') ? href : new URL(href, baseUrl).href;
        products.push({
          name,
          price: Number(price).toLocaleString(),
          originalPrice: originalPrice ? Number(originalPrice).toLocaleString() : undefined,
          discount: discountRate ? `${discountRate}%` : undefined,
          url,
        });
      }
    });
    
    if (products.length >= 10) {
      return products;
    }
  }

  // 전략 1: 상품 링크 기반 추출 (무신사, React 사이트 대응)
  const productLinks = $('a[href*="/products/"], a[href*="/item/"], a[href*="/goods/"]');
  if (productLinks.length > 5) {
    const seenUrls = new Set<string>();
    
    productLinks.each((_, el) => {
      if (products.length >= 30) return false;
      
      const $link = $(el);
      const href = $link.attr('href') || '';
      
      // 중복 URL 제거
      if (seenUrls.has(href)) return;
      seenUrls.add(href);
      
      // 부모 요소에서 상품 정보 찾기 (최대 3단계)
      let $container = $link;
      let foundPrice = false;
      
      for (let level = 0; level < 3; level++) {
        const $parent = $container.parent();
        const parentText = $parent.text().replace(/\s+/g, ' ').trim();
        
        // 가격 패턴이 있는지 확인
        if (/\d{1,3}(,\d{3})*\s*원/.test(parentText)) {
          const product = extractProductFromParent($parent, $link, $, baseUrl);
          if (product.name && !products.some(p => p.url === product.url)) {
            products.push(product);
          }
          foundPrice = true;
          break;
        }
        $container = $parent;
      }
      
      // 가격 없이 이름만 있어도 추가
      if (!foundPrice) {
        const linkText = $link.text().trim();
        if (linkText && linkText.length > 3 && linkText.length < 200) {
          const url = href.startsWith('http') ? href : new URL(href, baseUrl).href;
          if (!products.some(p => p.url === url)) {
            products.push({
              name: linkText,
              url,
              image: $link.find('img').first().attr('src') || undefined,
            });
          }
        }
      }
    });
  }
  
  // 전략 1에서 충분히 찾았으면 반환
  if (products.length >= 10) {
    return products;
  }

  // 전략 2: 쇼핑몰별 상품 컨테이너 패턴
  const containerPatterns = [
    // 무신사 (최신 DOM 구조)
    '[class*="GoodsList__Row"]',
    '[class*="sc-hdBJTi"]',
    '.sc-u940qw-0', '.sc-1y072ns-0', 'a[data-gtm-cd4]',
    // 하이버/W컨셉
    '[class*="prd_info"]',
    '[class*="item-info"]',
    // 일반
    '[class*="product-card"]',
    '[class*="product-item"]',
    '[class*="goods-item"]',
    '[class*="item-card"]',
    '[data-product]',
    '[data-item-id]',
    // G마켓/옥션
    '.box__item-container',
    '[class*="box__item"]',
    '.itemcard_item',
    // 11번가
    '.c-card-item',
    '.l_product_cont li',
    '[class*="c-card"]',
    // 쿠팡
    '.search-product a',
    '[data-product-id]',
    // 유니클로
    '.fr-ec-product-tile',
    // SSG
    '.cunit_t232, .cunit_t216',
    // 기타
    'li[class*="product"]',
    'div[class*="product"]',
    'article[class*="product"]',
  ];

  for (const pattern of containerPatterns) {
    $(pattern).each((_, el) => {
      if (products.length >= 30) return false;
      
      const $el = $(el);
      const product = extractProductInfo($el, $, baseUrl);
      
      if (product.name && product.name.length > 2) {
        // 중복 체크
        if (!products.some(p => p.name === product.name && p.price === product.price)) {
          products.push(product);
        }
      }
    });
    
    if (products.length >= 5) break;
  }

  return products;
}

/**
 * 상품명 정제 함수
 */
function cleanProductName(rawName: string): { name: string; brand?: string } {
  let name = rawName.trim();
  let brand: string | undefined;
  
  // 불필요한 키워드 제거
  const removePatterns = [
    /아울렛/g, /옵션/g, /공용/g, /남성/g, /여성/g,
    /설날\s*빅세일/g, /타임세일/g, /단독/g,
    /천$/g, /만$/g, // 숫자 뒤의 단위
    /\d+\.\d+천?만?/g, // 숫자.숫자천/만 패턴
    /\(\d{1,3}(,\d{3})*\+?\)/g, // (123) 또는 (1,234+) 형식
  ];
  
  for (const pattern of removePatterns) {
    name = name.replace(pattern, '');
  }
  
  // 연속된 공백 정리
  name = name.replace(/\s+/g, ' ').trim();
  
  // 브랜드 분리 시도 (앞에 한글 브랜드명이 있는 경우)
  // 예: "어반드레스V-neck Overfit" → 브랜드: 어반드레스, 상품명: V-neck Overfit
  const koreanBrandMatch = name.match(/^([가-힣]{2,10})([A-Za-z\[\(])/);
  if (koreanBrandMatch) {
    brand = koreanBrandMatch[1];
    name = name.substring(brand.length).trim();
  }
  
  // 영문 브랜드 분리 시도
  // 예: "NIKE Air Max" - 첫 단어가 대문자만이면 브랜드
  const englishBrandMatch = name.match(/^([A-Z][A-Z]+)\s+(.+)$/);
  if (englishBrandMatch && !brand) {
    brand = englishBrandMatch[1];
    name = englishBrandMatch[2].trim();
  }
  
  // 최대 길이 제한
  if (name.length > 100) {
    name = name.substring(0, 100) + '...';
  }
  
  return { name, brand };
}

/**
 * 부모 요소에서 상품 정보 추출 (상품 링크 기반)
 */
function extractProductFromParent(
  $parent: cheerio.Cheerio<cheerio.Element>,
  $link: cheerio.Cheerio<cheerio.Element>,
  $: cheerio.CheerioAPI,
  baseUrl: string
): ProductItem {
  const parentText = $parent.text().replace(/\s+/g, ' ').trim();
  
  // 상품명: 링크 텍스트 또는 부모의 첫 번째 의미 있는 텍스트
  let rawName = $link.text().trim();
  if (!rawName || rawName.length < 3) {
    // 부모에서 상품명 찾기 (가격/할인율 제외)
    const textWithoutPrice = parentText
      .replace(/\d{1,3}(,\d{3})*\s*원/g, '')
      .replace(/\d{1,2}%/g, '')
      .replace(/\d+\.\d+/g, '')
      .replace(/\(\d+\)/g, '')
      .trim();
    
    // 첫 번째 의미 있는 텍스트 조각
    const parts = textWithoutPrice.split(/\s{2,}/).filter(p => p.length > 3);
    rawName = parts[0]?.substring(0, 150) || '';
  }
  
  // 상품명 정제
  const { name, brand: extractedBrand } = cleanProductName(rawName);
  
  // 가격 추출
  const priceMatch = parentText.match(/(\d{1,3}(,\d{3})+)\s*원/);
  const price = priceMatch ? priceMatch[1] : undefined;
  
  // 할인율 추출
  const discountMatch = parentText.match(/(\d{1,2})%/);
  const discount = discountMatch ? discountMatch[1] + '%' : undefined;
  
  // 평점 추출
  const ratingMatch = parentText.match(/(\d\.\d)\s*점?/);
  const rating = ratingMatch ? ratingMatch[1] : undefined;
  
  // 리뷰 수 추출
  const reviewMatch = parentText.match(/\((\d{1,3}(,\d{3})*|\d+)\)/);
  const reviewCount = reviewMatch ? reviewMatch[1] : undefined;
  
  // 이미지 추출
  let image = $link.find('img').first().attr('src') 
    || $link.find('img').first().attr('data-src')
    || $parent.find('img').first().attr('src')
    || $parent.find('img').first().attr('data-src');
  if (image?.startsWith('//')) image = 'https:' + image;
  if (image?.startsWith('/')) image = new URL(image, baseUrl).href;
  
  // URL
  const href = $link.attr('href') || '';
  const url = href.startsWith('http') ? href : new URL(href, baseUrl).href;
  
  return {
    name,
    brand: extractedBrand,
    price,
    discount,
    image,
    url,
    rating,
    reviewCount,
  };
}

/**
 * 개별 상품 정보 추출
 */
function extractProductInfo(
  $el: cheerio.Cheerio<cheerio.Element>,
  $: cheerio.CheerioAPI,
  baseUrl: string
): ProductItem {
  // 상품명 추출
  const nameSelectors = [
    '[class*="name"]', '[class*="title"]', '[class*="goods"]',
    'h3', 'h4', 'h5', '.tit', '.prd_name', '.item_name',
    'span:not([class*="price"]):not([class*="discount"])',
  ];
  let name = '';
  for (const sel of nameSelectors) {
    const found = $el.find(sel).first().text().trim();
    if (found && found.length > 3 && found.length < 200 && !/^\d/.test(found)) {
      name = found;
      break;
    }
  }
  if (!name) {
    name = $el.text().split('\n')[0]?.trim().substring(0, 100) || '';
  }

  // 브랜드 추출
  const brandSelectors = ['[class*="brand"]', '.brand', '.maker'];
  let brand = '';
  for (const sel of brandSelectors) {
    const found = $el.find(sel).first().text().trim();
    if (found && found.length > 1 && found.length < 50) {
      brand = found;
      break;
    }
  }

  // 가격 추출
  const priceSelectors = [
    '.price', '[class*="price"]', '[class*="cost"]',
    '.price_num', '.final-price', '.sale-price',
  ];
  let price = '';
  let originalPrice = '';
  let discount = '';
  
  for (const sel of priceSelectors) {
    $el.find(sel).each((_, priceEl) => {
      const priceText = $(priceEl).text().trim();
      const numbers = priceText.match(/[\d,]+/g);
      
      if (numbers && numbers.length > 0) {
        // 할인가/원가 구분
        if ($(priceEl).is('[class*="sale"], [class*="final"], [class*="current"]')) {
          price = numbers[0];
        } else if ($(priceEl).is('[class*="origin"], [class*="before"]')) {
          originalPrice = numbers[0];
        } else if (!price) {
          price = numbers[0];
        }
      }
      
      // 할인율 추출
      const discountMatch = priceText.match(/(\d+)%/);
      if (discountMatch) {
        discount = discountMatch[1] + '%';
      }
    });
    
    if (price) break;
  }

  // 전체 텍스트에서 가격 패턴 찾기 (개선된 버전)
  const fullText = $el.text();
  
  if (!price) {
    // 패턴 0: G마켓 "판매가30,820원" 형식
    const gmarketMatch = fullText.match(/판매가\s*(\d{1,3}(,\d{3})*)\s*원/);
    if (gmarketMatch) {
      price = gmarketMatch[1];
    }
    
    // 패턴 0-1: "할인가30,820원" 형식
    if (!price) {
      const discountPriceMatch = fullText.match(/할인가\s*(\d{1,3}(,\d{3})*)\s*원/);
      if (discountPriceMatch) {
        price = discountPriceMatch[1];
      }
    }
    
    // 패턴 1: "14,700원" 형식
    if (!price) {
      const priceMatch = fullText.match(/(\d{1,3}(,\d{3})+)\s*원/);
      if (priceMatch) {
        price = priceMatch[1];
      }
    }
    
    // 패턴 2: 할인율% 가격원 형식 (예: "70% 14,700원")
    if (!price) {
      const discountPriceMatch = fullText.match(/(\d{1,2})%\s*(\d{1,3}(,\d{3})+)\s*원/);
      if (discountPriceMatch) {
        discount = discountPriceMatch[1] + '%';
        price = discountPriceMatch[2];
      }
    }
    
    // 패턴 3: 연속된 숫자와 원 (4자리 이상)
    if (!price) {
      const simpleMatch = fullText.match(/(\d{4,})\s*원/);
      if (simpleMatch) {
        price = simpleMatch[1];
      }
    }
  }
  
  // G마켓 원가 추출 (아직 없으면)
  if (!originalPrice) {
    const originalMatch = fullText.match(/원가\s*(\d{1,3}(,\d{3})*)\s*원/);
    if (originalMatch) {
      originalPrice = originalMatch[1];
    }
  }
  
  // G마켓/11번가 할인율 추출
  if (!discount) {
    const gmarketDiscMatch = fullText.match(/할인률\s*(\d{1,2})%/);
    if (gmarketDiscMatch) {
      discount = gmarketDiscMatch[1] + '%';
    }
  }
  
  // 할인율 추출 (아직 없으면)
  if (!discount) {
    const discMatch = fullText.match(/(\d{1,2})%/);
    if (discMatch) {
      discount = discMatch[1] + '%';
    }
  }

  // 이미지 추출
  const imgSelectors = ['img', '[style*="background-image"]'];
  let image = '';
  for (const sel of imgSelectors) {
    const imgEl = $el.find(sel).first();
    image = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-lazy-src') || '';
    
    if (!image) {
      const style = imgEl.attr('style') || '';
      const bgMatch = style.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (bgMatch) image = bgMatch[1];
    }
    
    if (image) {
      if (image.startsWith('//')) image = 'https:' + image;
      if (image.startsWith('/')) image = new URL(image, baseUrl).href;
      break;
    }
  }

  // URL 추출
  let url = $el.attr('href') || $el.find('a').first().attr('href') || '';
  if (url && !url.startsWith('http')) {
    url = new URL(url, baseUrl).href;
  }

  // 평점/리뷰 추출
  let rating = '';
  let reviewCount = '';
  const ratingMatch = $el.text().match(/(\d\.\d)\s*\/\s*5|(\d\.\d)점|(\d\.\d)/);
  if (ratingMatch) {
    rating = ratingMatch[1] || ratingMatch[2] || ratingMatch[3] || '';
  }
  const reviewMatch = $el.text().match(/\((\d{1,3}(,\d{3})*|\d+)\)|리뷰\s*(\d+)/);
  if (reviewMatch) {
    reviewCount = reviewMatch[1] || reviewMatch[3] || '';
  }

  return {
    name,
    brand: brand || undefined,
    price: price || undefined,
    originalPrice: originalPrice || undefined,
    discount: discount || undefined,
    image: image || undefined,
    url: url || undefined,
    rating: rating || undefined,
    reviewCount: reviewCount || undefined,
  };
}

/**
 * 텍스트와 이미지 매칭으로 상품 추출
 */
function extractProductsFromTextAndImages(
  $: cheerio.CheerioAPI,
  baseUrl: string
): ProductItem[] {
  const products: ProductItem[] = [];
  
  // 가격 패턴을 포함하는 텍스트 블록 찾기
  const pricePattern = /(\d{1,3}(,\d{3})+|\d{4,})\s*원/g;
  
  // body 전체에서 가격 패턴 근처 텍스트 분석
  $('*').each((_, el) => {
    if (products.length >= 30) return false;
    
    const $el = $(el);
    const text = $el.clone().children().remove().end().text().trim();
    
    if (text && pricePattern.test(text)) {
      // 부모 요소에서 상품 정보 추출
      const $parent = $el.parent();
      const product = extractProductInfo($parent, $, baseUrl);
      
      if (product.name && !products.some(p => p.name === product.name)) {
        products.push(product);
      }
    }
  });

  return products;
}

/**
 * 반복 패턴 분석으로 상품 추출
 */
function extractProductsFromRepeatingPattern(
  $: cheerio.CheerioAPI,
  baseUrl: string
): ProductItem[] {
  const products: ProductItem[] = [];
  
  // 같은 클래스를 가진 요소가 여러 개 있으면 상품 목록일 가능성 높음
  const classCount = new Map<string, number>();
  
  $('*[class]').each((_, el) => {
    const classes = $(el).attr('class')?.split(/\s+/) || [];
    for (const cls of classes) {
      if (cls.length > 2) {
        classCount.set(cls, (classCount.get(cls) || 0) + 1);
      }
    }
  });
  
  // 5개 이상 반복되는 클래스 찾기
  const repeatingClasses = Array.from(classCount.entries())
    .filter(([, count]) => count >= 5 && count <= 50)
    .sort((a, b) => b[1] - a[1]);
  
  for (const [cls] of repeatingClasses.slice(0, 5)) {
    $(`.${cls}`).each((_, el) => {
      if (products.length >= 30) return false;
      
      const $el = $(el);
      const text = $el.text();
      
      // 가격 패턴이 있으면 상품일 가능성 높음
      if (/\d{1,3}(,\d{3})+\s*원|\$\d+/.test(text)) {
        const product = extractProductInfo($el, $, baseUrl);
        
        if (product.name && product.name.length > 3) {
          if (!products.some(p => p.name === product.name)) {
            products.push(product);
          }
        }
      }
    });
    
    if (products.length >= 5) break;
  }

  return products;
}

/**
 * 총 상품 수 추출
 */
function extractTotalCount($: cheerio.CheerioAPI): number | undefined {
  const patterns = [
    /총\s*(\d{1,3}(,\d{3})*|\d+)\s*개/,
    /(\d{1,3}(,\d{3})*|\d+)\s*개의?\s*상품/,
    /(\d{1,3}(,\d{3})*|\d+)\s*items?/i,
    /검색결과\s*(\d{1,3}(,\d{3})*|\d+)/,
  ];
  
  const bodyText = $('body').text();
  
  for (const pattern of patterns) {
    const match = bodyText.match(pattern);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''), 10);
    }
  }
  
  return undefined;
}

/**
 * 페이지네이션 정보 추출
 */
function extractPagination(
  $: cheerio.CheerioAPI,
  baseUrl: string
): CategoryParseResult['pagination'] {
  // 현재 페이지 번호
  let currentPage = 1;
  const activePageEl = $('.pagination .active, .paging .on, [class*="page"][class*="current"]');
  if (activePageEl.length) {
    const num = parseInt(activePageEl.text().trim(), 10);
    if (!isNaN(num)) currentPage = num;
  }

  // 다음 페이지 존재 여부
  const hasNext = $('a[class*="next"], button[class*="next"], .pagination a:last-child').length > 0;

  // 총 페이지 수
  let totalPages: number | undefined;
  const lastPageEl = $('.pagination a:last-child, .paging a:last-child');
  if (lastPageEl.length) {
    const num = parseInt(lastPageEl.text().trim(), 10);
    if (!isNaN(num)) totalPages = num;
  }

  return {
    currentPage,
    totalPages,
    hasNext,
  };
}
