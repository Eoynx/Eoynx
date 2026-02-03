/**
 * AI Agent Search API - AI 친화적 검색 엔드포인트
 * 파라미터 기반의 구조화된 검색 결과 제공
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';

export const runtime = 'edge';

// 데모용 샘플 데이터
const sampleProducts = [
  {
    id: 'prod-001',
    name: '프리미엄 노트북 Pro 16',
    description: '고성능 M3 칩 탑재, 16인치 Liquid Retina 디스플레이',
    price: 2490000,
    currency: 'KRW',
    category: 'electronics',
    tags: ['laptop', 'premium', 'business'],
    availability: 'in_stock',
    stock: 45,
    rating: 4.8,
    reviewCount: 234,
    imageUrl: '/images/laptop-pro.jpg',
  },
  {
    id: 'prod-002',
    name: '무선 노이즈캔슬링 헤드폰',
    description: '40시간 배터리, 액티브 노이즈 캔슬링',
    price: 389000,
    currency: 'KRW',
    category: 'electronics',
    tags: ['headphone', 'wireless', 'audio'],
    availability: 'in_stock',
    stock: 120,
    rating: 4.6,
    reviewCount: 892,
    imageUrl: '/images/headphone.jpg',
  },
  {
    id: 'prod-003',
    name: '스마트 워치 시리즈 9',
    description: '건강 모니터링, GPS, 항상 켜진 디스플레이',
    price: 599000,
    currency: 'KRW',
    category: 'wearables',
    tags: ['watch', 'smart', 'health'],
    availability: 'low_stock',
    stock: 8,
    rating: 4.7,
    reviewCount: 1567,
    imageUrl: '/images/smartwatch.jpg',
  },
  {
    id: 'prod-004',
    name: '기계식 키보드 RGB',
    description: '체리 MX 스위치, RGB 백라이트, 알루미늄 바디',
    price: 189000,
    currency: 'KRW',
    category: 'accessories',
    tags: ['keyboard', 'mechanical', 'gaming'],
    availability: 'in_stock',
    stock: 200,
    rating: 4.5,
    reviewCount: 445,
    imageUrl: '/images/keyboard.jpg',
  },
  {
    id: 'prod-005',
    name: '4K 웹캠 Pro',
    description: '4K 해상도, AI 자동 프레이밍, 노이즈 캔슬링 마이크',
    price: 279000,
    currency: 'KRW',
    category: 'accessories',
    tags: ['webcam', '4k', 'streaming'],
    availability: 'out_of_stock',
    stock: 0,
    rating: 4.4,
    reviewCount: 178,
    imageUrl: '/images/webcam.jpg',
  },
];

interface SearchFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  availability?: string;
  tags?: string[];
  minRating?: number;
}

interface SearchResult {
  items: typeof sampleProducts;
  totalCount: number;
  filters: SearchFilters;
  sort: string;
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
  facets: {
    categories: { name: string; count: number }[];
    priceRanges: { range: string; count: number }[];
    availability: { status: string; count: number }[];
  };
  suggestions?: string[];
}

/**
 * GET /api/agent/search - AI 친화적 검색
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  
  // 파라미터 추출
  const query = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || 'relevance';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100);
  
  // 필터 파싱
  const filters: SearchFilters = {};
  
  if (searchParams.get('category')) {
    filters.category = searchParams.get('category')!;
  }
  if (searchParams.get('minPrice')) {
    filters.minPrice = parseInt(searchParams.get('minPrice')!, 10);
  }
  if (searchParams.get('maxPrice')) {
    filters.maxPrice = parseInt(searchParams.get('maxPrice')!, 10);
  }
  if (searchParams.get('availability')) {
    filters.availability = searchParams.get('availability')!;
  }
  if (searchParams.get('tags')) {
    filters.tags = searchParams.get('tags')!.split(',');
  }
  if (searchParams.get('minRating')) {
    filters.minRating = parseFloat(searchParams.get('minRating')!);
  }
  
  // 검색 및 필터링 수행
  let results = [...sampleProducts];
  
  // 키워드 검색
  if (query) {
    const lowerQuery = query.toLowerCase();
    results = results.filter(item => 
      item.name.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
  
  // 필터 적용
  if (filters.category) {
    results = results.filter(item => item.category === filters.category);
  }
  if (filters.minPrice !== undefined) {
    results = results.filter(item => item.price >= filters.minPrice!);
  }
  if (filters.maxPrice !== undefined) {
    results = results.filter(item => item.price <= filters.maxPrice!);
  }
  if (filters.availability) {
    results = results.filter(item => item.availability === filters.availability);
  }
  if (filters.tags?.length) {
    results = results.filter(item => 
      filters.tags!.some(tag => item.tags.includes(tag))
    );
  }
  if (filters.minRating !== undefined) {
    results = results.filter(item => item.rating >= filters.minRating!);
  }
  
  // 정렬
  switch (sort) {
    case 'price_asc':
      results.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      results.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      results.sort((a, b) => b.rating - a.rating);
      break;
    case 'newest':
      // 샘플 데이터에는 날짜 없음, 기본 순서 유지
      break;
    case 'relevance':
    default:
      // 기본 순서 (검색어 관련성)
      break;
  }
  
  // 페이지네이션
  const totalCount = results.length;
  const startIndex = (page - 1) * limit;
  const paginatedResults = results.slice(startIndex, startIndex + limit);
  
  // Facets 계산
  const facets = {
    categories: calculateFacets(sampleProducts, 'category'),
    priceRanges: [
      { range: '0-100000', count: sampleProducts.filter(p => p.price < 100000).length },
      { range: '100000-500000', count: sampleProducts.filter(p => p.price >= 100000 && p.price < 500000).length },
      { range: '500000-1000000', count: sampleProducts.filter(p => p.price >= 500000 && p.price < 1000000).length },
      { range: '1000000+', count: sampleProducts.filter(p => p.price >= 1000000).length },
    ],
    availability: [
      { status: 'in_stock', count: sampleProducts.filter(p => p.availability === 'in_stock').length },
      { status: 'low_stock', count: sampleProducts.filter(p => p.availability === 'low_stock').length },
      { status: 'out_of_stock', count: sampleProducts.filter(p => p.availability === 'out_of_stock').length },
    ],
  };
  
  // 검색 제안
  const suggestions = query && results.length === 0 
    ? ['노트북', '헤드폰', '스마트워치', '키보드']
    : undefined;
  
  const searchResult: SearchResult = {
    items: paginatedResults,
    totalCount,
    filters,
    sort,
    pagination: {
      page,
      limit,
      hasMore: startIndex + limit < totalCount,
    },
    facets,
    suggestions,
  };

  const response: ApiResponse<SearchResult> = {
    success: true,
    data: searchResult,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      version: '1.0.0',
    },
  };

  return NextResponse.json(response, {
    headers: {
      'Content-Type': 'application/json',
      'X-Response-Time': `${Date.now() - startTime}ms`,
      'X-Total-Count': String(totalCount),
    },
  });
}

function calculateFacets(
  items: typeof sampleProducts, 
  field: keyof typeof sampleProducts[0]
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  
  items.forEach(item => {
    const value = item[field] as string;
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
