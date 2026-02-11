/**
 * AI Agent Search API - AI 친화적 검색 엔드포인트
 * 서비스 내부 콘텐츠(관광지, 상품, 맛집 등) 검색
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'edge';

// Fallback 샘플 데이터 (DB 연결 실패 시)
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

interface SearchItem {
  id: string;
  service_id?: string;
  name: string;
  name_ko?: string;
  description: string;
  description_ko?: string;
  category: string;
  tags: string[];
  price: number | null;
  currency: string;
  availability: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  metadata?: Record<string, unknown>;
}

interface SearchFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  availability?: string;
  tags?: string[];
  minRating?: number;
  serviceId?: string;
}

interface SearchResult {
  items: SearchItem[];
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
  source: 'database' | 'fallback';
}

/**
 * Supabase에서 서비스 아이템 검색
 */
async function searchFromDatabase(
  query: string,
  filters: SearchFilters,
  sort: string,
  page: number,
  limit: number
): Promise<{ items: SearchItem[]; totalCount: number } | null> {
  try {
    const supabase = getSupabaseAdmin();
    
    let dbQuery = supabase
      .from('service_items')
      .select('*', { count: 'exact' });
    
    // 키워드 검색 (이름, 설명)
    if (query) {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,name_ko.ilike.%${query}%,description.ilike.%${query}%,description_ko.ilike.%${query}%`);
    }
    
    // 서비스 필터
    if (filters.serviceId) {
      dbQuery = dbQuery.eq('service_id', filters.serviceId);
    }
    
    // 카테고리 필터
    if (filters.category) {
      dbQuery = dbQuery.eq('category', filters.category);
    }
    
    // 가격 필터
    if (filters.minPrice !== undefined) {
      dbQuery = dbQuery.gte('price', filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      dbQuery = dbQuery.lte('price', filters.maxPrice);
    }
    
    // 평점 필터
    if (filters.minRating !== undefined) {
      dbQuery = dbQuery.gte('rating', filters.minRating);
    }
    
    // 정렬
    switch (sort) {
      case 'price_asc':
        dbQuery = dbQuery.order('price', { ascending: true });
        break;
      case 'price_desc':
        dbQuery = dbQuery.order('price', { ascending: false });
        break;
      case 'rating':
        dbQuery = dbQuery.order('rating', { ascending: false });
        break;
      case 'newest':
        dbQuery = dbQuery.order('created_at', { ascending: false });
        break;
      default:
        dbQuery = dbQuery.order('rating', { ascending: false });
    }
    
    // 페이지네이션
    const offset = (page - 1) * limit;
    dbQuery = dbQuery.range(offset, offset + limit - 1);
    
    const { data, count, error } = await dbQuery;
    
    if (error) {
      console.error('Supabase search error:', error);
      return null;
    }
    
    // DB 결과를 SearchItem 형식으로 변환
    const rows = (data || []) as Record<string, unknown>[];
    const items: SearchItem[] = rows.map(row => ({
      id: row.id as string,
      service_id: row.service_id as string | undefined,
      name: (row.name_ko || row.name) as string,
      name_ko: row.name_ko as string | undefined,
      description: (row.description_ko || row.description || '') as string,
      description_ko: row.description_ko as string | undefined,
      category: (row.category || 'general') as string,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []) as string[],
      price: row.price as number | null,
      currency: (row.currency || 'KRW') as string,
      availability: (row.availability || 'available') as string,
      rating: (row.rating || 0) as number,
      reviewCount: (row.review_count || 0) as number,
      imageUrl: (row.image_url || '') as string,
      location: row.location ? (typeof row.location === 'string' ? JSON.parse(row.location) : row.location) as SearchItem['location'] : undefined,
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) as Record<string, unknown> : undefined,
    }));
    
    return { items, totalCount: count || 0 };
  } catch (err) {
    console.error('Database search error:', err);
    return null;
  }
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
  
  if (searchParams.get('service_id')) {
    filters.serviceId = searchParams.get('service_id')!;
  }
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
  
  // 먼저 데이터베이스 검색 시도
  const dbResult = await searchFromDatabase(query, filters, sort, page, limit);
  
  let items: SearchItem[];
  let totalCount: number;
  let source: 'database' | 'fallback';
  
  if (dbResult && dbResult.items.length > 0) {
    // 데이터베이스 결과 사용
    items = dbResult.items;
    totalCount = dbResult.totalCount;
    source = 'database';
  } else {
    // Fallback: 샘플 데이터 사용
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
    }
    
    totalCount = results.length;
    const startIndex = (page - 1) * limit;
    items = results.slice(startIndex, startIndex + limit).map(p => ({
      ...p,
      reviewCount: p.reviewCount,
      imageUrl: p.imageUrl,
    }));
    source = 'fallback';
  }
  
  // Facets 계산 (샘플 기준)
  const allItems = source === 'database' ? items : sampleProducts;
  const facets = {
    categories: calculateFacets(allItems, 'category'),
    priceRanges: [
      { range: '0-100000', count: allItems.filter(p => (p.price || 0) < 100000).length },
      { range: '100000-500000', count: allItems.filter(p => (p.price || 0) >= 100000 && (p.price || 0) < 500000).length },
      { range: '500000-1000000', count: allItems.filter(p => (p.price || 0) >= 500000 && (p.price || 0) < 1000000).length },
      { range: '1000000+', count: allItems.filter(p => (p.price || 0) >= 1000000).length },
    ],
    availability: [
      { status: 'available', count: allItems.filter(p => p.availability === 'available' || p.availability === 'in_stock').length },
      { status: 'limited', count: allItems.filter(p => p.availability === 'limited' || p.availability === 'low_stock').length },
      { status: 'unavailable', count: allItems.filter(p => p.availability === 'unavailable' || p.availability === 'out_of_stock').length },
    ],
  };
  
  // 검색 제안
  const suggestions = query && items.length === 0 
    ? ['노트북', '헤드폰', '스마트워치', '관광지', '맛집']
    : undefined;
  
  const searchResult: SearchResult = {
    items,
    totalCount,
    filters,
    sort,
    pagination: {
      page,
      limit,
      hasMore: (page - 1) * limit + items.length < totalCount,
    },
    facets,
    suggestions,
    source,
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
      'X-Data-Source': source,
    },
  });
}

function calculateFacets(
  items: SearchItem[], 
  field: keyof SearchItem
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  
  items.forEach(item => {
    const value = item[field] as string;
    if (value) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  });
  
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
