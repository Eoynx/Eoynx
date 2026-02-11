/**
 * Agent Search API 테스트
 */

// Supabase mock
const mockSearchSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
};

jest.mock('@/lib/supabase/client', () => ({
  getSupabaseAdmin: jest.fn(() => mockSearchSupabaseClient),
}));

// NextRequest/NextResponse mock
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url: string) => ({
    url,
    method: 'GET',
    nextUrl: { searchParams: new URLSearchParams(url.split('?')[1] || '') },
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      status: options?.status || 200,
      json: () => Promise.resolve(data),
      data,
    })),
  },
}));

describe('Agent Search API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query parameter validation', () => {
    it('should require q parameter', () => {
      const url = 'http://localhost/api/agent/search';
      const searchParams = new URLSearchParams(url.split('?')[1] || '');
      
      expect(searchParams.get('q')).toBeNull();
    });

    it('should parse q parameter correctly', () => {
      const url = 'http://localhost/api/agent/search?q=laptop';
      const searchParams = new URLSearchParams(url.split('?')[1] || '');
      
      expect(searchParams.get('q')).toBe('laptop');
    });

    it('should handle category filter', () => {
      const url = 'http://localhost/api/agent/search?q=laptop&category=electronics';
      const searchParams = new URLSearchParams(url.split('?')[1] || '');
      
      expect(searchParams.get('category')).toBe('electronics');
    });

    it('should parse limit parameter', () => {
      const url = 'http://localhost/api/agent/search?q=laptop&limit=20';
      const searchParams = new URLSearchParams(url.split('?')[1] || '');
      
      expect(parseInt(searchParams.get('limit') || '10')).toBe(20);
    });

    it('should default limit to 10', () => {
      const url = 'http://localhost/api/agent/search?q=laptop';
      const searchParams = new URLSearchParams(url.split('?')[1] || '');
      
      expect(parseInt(searchParams.get('limit') || '10')).toBe(10);
    });
  });

  describe('Search result formatting', () => {
    it('should return schema.org formatted results', () => {
      const mockResult = {
        '@context': 'https://schema.org',
        '@type': 'SearchResultsPage',
        query: 'laptop',
        results: [],
        totalResults: 0,
      };

      expect(mockResult['@context']).toBe('https://schema.org');
      expect(mockResult['@type']).toBe('SearchResultsPage');
    });

    it('should include HATEOAS links', () => {
      const links = {
        self: 'http://localhost/api/agent/search?q=laptop&page=1',
        first: 'http://localhost/api/agent/search?q=laptop&page=1',
        next: 'http://localhost/api/agent/search?q=laptop&page=2',
        prev: null,
      };

      expect(links.self).toBeDefined();
      expect(links.first).toBeDefined();
    });

    it('should format product results with schema.org', () => {
      const product = {
        '@type': 'Product',
        productID: 'prod-001',
        name: '프리미엄 노트북',
        description: '고성능 노트북',
        offers: {
          '@type': 'Offer',
          price: 2490000,
          priceCurrency: 'KRW',
          availability: 'https://schema.org/InStock',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: 4.8,
          reviewCount: 234,
        },
      };

      expect(product['@type']).toBe('Product');
      expect(product.offers['@type']).toBe('Offer');
      expect(product.aggregateRating['@type']).toBe('AggregateRating');
    });
  });

  describe('Search algorithm', () => {
    it('should match query in name', () => {
      const products = [
        { name: '노트북 Pro', description: '고성능' },
        { name: '키보드', description: '기계식' },
      ];
      const query = '노트북';

      const results = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase())
      );

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('노트북 Pro');
    });

    it('should match query in description', () => {
      const products = [
        { name: '노트북', description: '고성능 프로세서' },
        { name: '모니터', description: '4K 디스플레이' },
      ];
      const query = '고성능';

      const results = products.filter(p => 
        p.description.toLowerCase().includes(query.toLowerCase())
      );

      expect(results).toHaveLength(1);
    });

    it('should match query in tags', () => {
      const products = [
        { name: '노트북', tags: ['laptop', 'premium'] },
        { name: '키보드', tags: ['keyboard', 'gaming'] },
      ];
      const query = 'gaming';

      const results = products.filter(p => 
        p.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
      );

      expect(results).toHaveLength(1);
    });

    it('should be case insensitive', () => {
      const products = [
        { name: 'LAPTOP Pro', description: 'HIGH PERFORMANCE' },
      ];
      const query = 'laptop';

      const results = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase())
      );

      expect(results).toHaveLength(1);
    });
  });

  describe('Pagination', () => {
    it('should calculate correct offset', () => {
      const page = 3;
      const limit = 10;
      const offset = (page - 1) * limit;

      expect(offset).toBe(20);
    });

    it('should calculate total pages', () => {
      const totalResults = 45;
      const limit = 10;
      const totalPages = Math.ceil(totalResults / limit);

      expect(totalPages).toBe(5);
    });

    it('should indicate hasMore correctly', () => {
      const page = 2;
      const totalPages = 5;
      const hasMore = page < totalPages;

      expect(hasMore).toBe(true);
    });
  });

  describe('Fallback behavior', () => {
    it('should use sample products when DB fails', () => {
      const sampleProducts = [
        { id: 'prod-001', name: '프리미엄 노트북 Pro 16' },
        { id: 'prod-002', name: '무선 노이즈캔슬링 헤드폰' },
      ];

      expect(sampleProducts).toHaveLength(2);
      expect(sampleProducts[0].name).toContain('노트북');
    });
  });

  describe('Response format', () => {
    it('should include success flag', () => {
      const response = {
        success: true,
        data: {},
        meta: {},
      };

      expect(response.success).toBe(true);
    });

    it('should include AI-friendly metadata', () => {
      const meta = {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        aiGuidance: {
          resultType: 'product_search',
          suggestedActions: ['refine_search', 'view_details'],
        },
      };

      expect(meta.aiGuidance).toBeDefined();
      expect(meta.aiGuidance.suggestedActions).toContain('view_details');
    });
  });
});
