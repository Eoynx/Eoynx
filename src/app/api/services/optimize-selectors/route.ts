import { NextRequest, NextResponse } from 'next/server';
import { load, CheerioAPI } from 'cheerio';
import { verifySessionToken } from '@/lib/auth/jwt-config';

export const runtime = 'nodejs';

interface SelectorCandidate {
  selector: string;
  score: number;
  sample?: string;
}

interface ExtractResult {
  title: SelectorCandidate[];
  price: SelectorCandidate[];
  image: SelectorCandidate[];
  description: SelectorCandidate[];
}

const TITLE_CANDIDATES = [
  '[itemprop="name"]',
  'h1',
  '.product-title',
  '.product-name',
  '.title',
  '[data-product-name]',
  '.item-title',
  '.goods-name',
  '.prd-name',
];

const PRICE_CANDIDATES = [
  '[itemprop="price"]',
  '.price',
  '.product-price',
  '[data-price]',
  '.sale-price',
  '.current-price',
  '.selling-price',
  '.cost',
  '.prd-price',
];

const IMAGE_CANDIDATES = [
  '[itemprop="image"]',
  '.product-image img',
  '.main-image img',
  '.detail-image img',
  '.thumbnail img',
  '[data-image]',
  'img.product',
];

const DESCRIPTION_CANDIDATES = [
  '[itemprop="description"]',
  '.product-description',
  '.description',
  '.detail-description',
  '[data-description]',
  '.content',
];

function scoreSelector($: CheerioAPI, selector: string, type: string): SelectorCandidate | null {
  try {
    const element = $(selector).first();
    if (!element.length) return null;

    let value = '';
    let score = 0;

    if (type === 'image') {
      value = element.attr('src') || element.attr('data-src') || '';
      if (!value) return null;
      score = 50;
      // Prefer larger images
      const width = parseInt(element.attr('width') || '0', 10);
      if (width > 200) score += 20;
      // Prefer absolute URLs
      if (value.startsWith('http')) score += 10;
    } else {
      value = element.text().trim();
      if (!value) return null;
      score = 50;

      if (type === 'title') {
        // Title should be moderate length
        if (value.length > 5 && value.length < 200) score += 20;
        // Avoid generic titles
        if (/^\d+$/.test(value)) score -= 30;
      }

      if (type === 'price') {
        // Price should contain numbers
        if (/\d/.test(value)) score += 30;
        // Price should contain currency symbols or Korean won
        if (/[₩$€¥원]/.test(value)) score += 20;
      }

      if (type === 'description') {
        // Description should be longer
        if (value.length > 50) score += 20;
        if (value.length > 200) score += 10;
      }
    }

    // Prefer specific selectors over generic ones
    if (selector.includes('[itemprop=')) score += 15;
    if (selector.startsWith('.')) score += 10;
    if (selector.startsWith('#')) score += 12;

    return { selector, score, sample: value.slice(0, 100) };
  } catch {
    return null;
  }
}

function findBestSelector(
  $: CheerioAPI,
  candidates: string[],
  type: string
): SelectorCandidate | null {
  const results: SelectorCandidate[] = [];

  for (const selector of candidates) {
    const result = scoreSelector($, selector, type);
    if (result && result.score > 0) {
      results.push(result);
    }
  }

  // Also try to find by common attribute patterns
  if (type === 'title') {
    const h1 = $('h1').first();
    if (h1.length) {
      const id = h1.attr('id');
      const cls = (h1.attr('class') || '').split(' ').filter(Boolean)[0];
      if (id) results.push({ selector: `#${id}`, score: 70, sample: h1.text().trim().slice(0, 100) });
      else if (cls) results.push({ selector: `.${cls}`, score: 65, sample: h1.text().trim().slice(0, 100) });
    }
  }

  if (results.length === 0) return null;
  
  // Sort by score descending and return best
  results.sort((a, b) => b.score - a.score);
  return results[0];
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

    const { urls, currentSelectors = {} } = await request.json();
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'URLs array is required' },
        { status: 400 }
      );
    }

    // Limit to first 5 URLs for performance
    const targetUrls = urls.slice(0, 5);
    const allResults: ExtractResult[] = [];

    for (const url of targetUrls) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Eoynx-Selector-Optimizer/1.0 (+https://eoynx.com)',
            'Accept': 'text/html,application/xhtml+xml',
          },
        });

        if (!response.ok) continue;

        const html = await response.text();
        const $ = load(html);

        const result: ExtractResult = {
          title: [],
          price: [],
          image: [],
          description: [],
        };

        const titleResult = findBestSelector($, TITLE_CANDIDATES, 'title');
        if (titleResult) result.title.push(titleResult);

        const priceResult = findBestSelector($, PRICE_CANDIDATES, 'price');
        if (priceResult) result.price.push(priceResult);

        const imageResult = findBestSelector($, IMAGE_CANDIDATES, 'image');
        if (imageResult) result.image.push(imageResult);

        const descResult = findBestSelector($, DESCRIPTION_CANDIDATES, 'description');
        if (descResult) result.description.push(descResult);

        allResults.push(result);
      } catch {
        // Continue with other URLs
      }
    }

    if (allResults.length === 0) {
      return NextResponse.json(
        { error: 'Could not analyze any URLs' },
        { status: 400 }
      );
    }

    // Aggregate results and find most common/highest scoring selectors
    const aggregateBest = (type: keyof ExtractResult): { selector: string; confidence: number; sample?: string } | null => {
      const selectorScores: Record<string, { total: number; count: number; sample?: string }> = {};
      
      for (const result of allResults) {
        for (const candidate of result[type]) {
          if (!selectorScores[candidate.selector]) {
            selectorScores[candidate.selector] = { total: 0, count: 0, sample: candidate.sample };
          }
          selectorScores[candidate.selector].total += candidate.score;
          selectorScores[candidate.selector].count += 1;
        }
      }

      let bestSelector = '';
      let bestScore = 0;
      let sample = '';

      for (const [selector, data] of Object.entries(selectorScores)) {
        // Combine frequency and score
        const combinedScore = data.total * (data.count / allResults.length);
        if (combinedScore > bestScore) {
          bestScore = combinedScore;
          bestSelector = selector;
          sample = data.sample || '';
        }
      }

      if (!bestSelector) return null;
      
      return {
        selector: bestSelector,
        confidence: Math.min(100, Math.round(bestScore)),
        sample,
      };
    };

    const optimizedSelectors = {
      title: aggregateBest('title'),
      price: aggregateBest('price'),
      image: aggregateBest('image'),
      description: aggregateBest('description'),
    };

    // Compare with current selectors
    const improvements: string[] = [];
    
    if (optimizedSelectors.title && optimizedSelectors.title.selector !== currentSelectors.title) {
      improvements.push(`title: "${currentSelectors.title || '(없음)'}" → "${optimizedSelectors.title.selector}"`);
    }
    if (optimizedSelectors.price && optimizedSelectors.price.selector !== currentSelectors.price) {
      improvements.push(`price: "${currentSelectors.price || '(없음)'}" → "${optimizedSelectors.price.selector}"`);
    }
    if (optimizedSelectors.image && optimizedSelectors.image.selector !== currentSelectors.image) {
      improvements.push(`image: "${currentSelectors.image || '(없음)'}" → "${optimizedSelectors.image.selector}"`);
    }
    if (optimizedSelectors.description && optimizedSelectors.description.selector !== currentSelectors.description) {
      improvements.push(`description: "${currentSelectors.description || '(없음)'}" → "${optimizedSelectors.description.selector}"`);
    }

    return NextResponse.json({
      success: true,
      analyzedUrls: allResults.length,
      optimizedSelectors: {
        title: optimizedSelectors.title?.selector || currentSelectors.title || '',
        price: optimizedSelectors.price?.selector || currentSelectors.price || '',
        image: optimizedSelectors.image?.selector || currentSelectors.image || '',
        description: optimizedSelectors.description?.selector || currentSelectors.description || '',
      },
      details: optimizedSelectors,
      improvements,
      hasChanges: improvements.length > 0,
    });
  } catch (error) {
    console.error('Selector optimize error:', error);
    return NextResponse.json(
      { error: 'Failed to optimize selectors' },
      { status: 500 }
    );
  }
}
