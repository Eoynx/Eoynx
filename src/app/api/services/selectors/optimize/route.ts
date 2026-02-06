import { NextRequest, NextResponse } from 'next/server';
import { load, CheerioAPI } from 'cheerio';
import { jwtVerify } from 'jose';

export const runtime = 'nodejs';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-for-development-only'
);

interface ParsedItem {
  url: string;
  title?: string | null;
  price?: string | null;
  image?: string | null;
}

interface SelectorCandidate {
  selector: string;
  score: number;
  matchCount: number;
  sampleValue?: string;
}

// 요소의 고유 셀렉터 생성
function generateSelectors($: CheerioAPI, el: ReturnType<CheerioAPI>): string[] {
  const selectors: string[] = [];
  
  const id = el.attr('id');
  if (id) {
    selectors.push(`#${id}`);
  }
  
  const classes = (el.attr('class') || '').split(' ').filter(Boolean);
  for (const cls of classes) {
    selectors.push(`.${cls}`);
  }
  
  const itemprop = el.attr('itemprop');
  if (itemprop) {
    selectors.push(`[itemprop="${itemprop}"]`);
  }
  
  const dataAttrs = Object.keys(el.attr() || {}).filter(k => k.startsWith('data-'));
  for (const attr of dataAttrs) {
    selectors.push(`[${attr}]`);
  }
  
  const tag = el.prop('tagName')?.toLowerCase();
  if (tag) {
    selectors.push(tag);
    
    // 부모 요소와 조합
    const parent = el.parent();
    const parentClass = (parent.attr('class') || '').split(' ').filter(Boolean)[0];
    if (parentClass) {
      selectors.push(`.${parentClass} ${tag}`);
    }
  }
  
  return selectors;
}

// 텍스트 유사도 계산 (간단한 버전)
function textSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const normalizedA = a.toLowerCase().trim();
  const normalizedB = b.toLowerCase().trim();
  
  if (normalizedA === normalizedB) return 1;
  if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) return 0.8;
  
  // 숫자만 비교 (가격용)
  const numsA = normalizedA.replace(/[^0-9]/g, '');
  const numsB = normalizedB.replace(/[^0-9]/g, '');
  if (numsA && numsB && numsA === numsB) return 0.9;
  
  return 0;
}

// 최적 셀렉터 찾기
function findBestSelectors(
  $: CheerioAPI,
  targetValue: string,
  type: 'text' | 'price' | 'image'
): SelectorCandidate[] {
  const candidates: Map<string, SelectorCandidate> = new Map();
  
  if (type === 'image') {
    // 이미지는 src 속성으로 찾기
    $('img').each((_, el) => {
      const $el = $(el);
      const src = $el.attr('src') || '';
      const similarity = textSimilarity(src, targetValue);
      
      if (similarity > 0.5) {
        const selectors = generateSelectors($, $el);
        for (const selector of selectors) {
          const existing = candidates.get(selector);
          if (!existing || existing.score < similarity) {
            candidates.set(selector, {
              selector,
              score: similarity,
              matchCount: 1,
              sampleValue: src.slice(0, 100),
            });
          }
        }
      }
    });
  } else {
    // 텍스트 요소 찾기
    $('*').each((_, el) => {
      const $el = $(el);
      const text = $el.clone().children().remove().end().text().trim();
      
      if (!text) return;
      
      const similarity = textSimilarity(text, targetValue);
      
      if (similarity > 0.5) {
        const selectors = generateSelectors($, $el);
        for (const selector of selectors) {
          // 가격의 경우 더 구체적인 셀렉터 선호
          let bonus = 0;
          if (type === 'price' && (selector.includes('price') || selector.includes('금액'))) {
            bonus = 0.2;
          }
          
          const existing = candidates.get(selector);
          const score = similarity + bonus;
          if (!existing || existing.score < score) {
            candidates.set(selector, {
              selector,
              score,
              matchCount: 1,
              sampleValue: text.slice(0, 100),
            });
          }
        }
      }
    });
  }
  
  return Array.from(candidates.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
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

    try {
      await jwtVerify(token, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { url, parsedItems, currentSelectors } = await request.json() as {
      url: string;
      parsedItems: ParsedItem[];
      currentSelectors?: Record<string, string>;
    };

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    if (!parsedItems || !Array.isArray(parsedItems) || parsedItems.length === 0) {
      return NextResponse.json(
        { error: 'parsedItems array is required' },
        { status: 400 }
      );
    }

    // 가장 좋은 결과를 가진 아이템의 URL로 분석
    const bestItem = parsedItems.find(item => item.title && item.price && item.image)
      || parsedItems.find(item => item.title && item.price)
      || parsedItems[0];

    if (!bestItem) {
      return NextResponse.json(
        { error: 'No valid parsed items' },
        { status: 400 }
      );
    }

    // 해당 페이지 HTML 가져오기
    const response = await fetch(bestItem.url, {
      headers: {
        'User-Agent': 'Eoynx-Selector-Optimizer/1.0 (+https://eoynx.com)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch the item URL' },
        { status: 400 }
      );
    }

    const html = await response.text();
    const $ = load(html);

    // 각 필드별 최적 셀렉터 찾기
    const recommendations: Record<string, SelectorCandidate[]> = {};

    if (bestItem.title) {
      recommendations.title = findBestSelectors($, bestItem.title, 'text');
    }

    if (bestItem.price) {
      recommendations.price = findBestSelectors($, bestItem.price, 'price');
    }

    if (bestItem.image) {
      recommendations.image = findBestSelectors($, bestItem.image, 'image');
    }

    // 현재 셀렉터와 비교
    const improvements: Record<string, { current: string; recommended: string; reason: string }> = {};

    for (const [field, candidates] of Object.entries(recommendations)) {
      if (candidates.length > 0) {
        const best = candidates[0];
        const current = currentSelectors?.[field];
        
        if (!current || best.score > 0.8) {
          if (current !== best.selector) {
            improvements[field] = {
              current: current || '(없음)',
              recommended: best.selector,
              reason: best.score >= 0.9 
                ? '정확히 일치하는 값을 찾았습니다'
                : '유사한 값을 포함하는 요소를 찾았습니다',
            };
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      analyzedUrl: bestItem.url,
      recommendations,
      improvements,
      suggestedSelectors: {
        title: recommendations.title?.[0]?.selector || currentSelectors?.title || '',
        price: recommendations.price?.[0]?.selector || currentSelectors?.price || '',
        image: recommendations.image?.[0]?.selector || currentSelectors?.image || '',
      },
    });
  } catch (error) {
    console.error('Selector optimize error:', error);
    return NextResponse.json(
      { error: 'Failed to optimize selectors' },
      { status: 500 }
    );
  }
}
