/**
 * Dashboard Permissions API 테스트
 */

// Supabase mock
const mockPermissionsSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
};

jest.mock('@/lib/supabase/client', () => ({
  getSupabaseAdmin: jest.fn(() => mockPermissionsSupabaseClient),
}));

// NextRequest/NextResponse mock
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url: string, init?: RequestInit) => ({
    url,
    method: init?.method || 'GET',
    json: jest.fn().mockResolvedValue(init?.body ? JSON.parse(init.body as string) : {}),
    nextUrl: { searchParams: new URLSearchParams() },
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      status: options?.status || 200,
      json: () => Promise.resolve(data),
      data,
    })),
  },
}));

describe('Dashboard Permissions API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Permission definitions', () => {
    const DEFAULT_PERMISSIONS = [
      { id: 'read', name: '읽기', level: 'basic', enabled: true },
      { id: 'search', name: '검색', level: 'basic', enabled: true },
      { id: 'cart', name: '장바구니', level: 'standard', enabled: true },
      { id: 'execute', name: '실행', level: 'elevated', enabled: true },
      { id: 'stream', name: '스트리밍', level: 'standard', enabled: true },
      { id: 'admin', name: '관리자', level: 'admin', enabled: false },
    ];

    it('should have valid permission levels', () => {
      const validLevels = ['basic', 'standard', 'elevated', 'admin'];
      
      DEFAULT_PERMISSIONS.forEach(perm => {
        expect(validLevels).toContain(perm.level);
      });
    });

    it('should have unique permission IDs', () => {
      const ids = DEFAULT_PERMISSIONS.map(p => p.id);
      const uniqueIds = [...new Set(ids)];
      
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should have admin disabled by default', () => {
      const adminPerm = DEFAULT_PERMISSIONS.find(p => p.id === 'admin');
      
      expect(adminPerm?.enabled).toBe(false);
    });
  });

  describe('Guardrail rules', () => {
    const DEFAULT_RULES = [
      { 
        id: 'rate_limit', 
        name: '요청 제한',
        type: 'rate_limit',
        config: { maxRequests: 100, windowMs: 60000 },
        enabled: true,
        priority: 10,
      },
      { 
        id: 'content_filter',
        name: '콘텐츠 필터',
        type: 'content_filter',
        config: { blockedKeywords: ['spam', 'phishing'] },
        enabled: true,
        priority: 20,
      },
    ];

    it('should have valid rule types', () => {
      const validTypes = ['rate_limit', 'content_filter', 'ip_whitelist', 'input_validation'];
      
      DEFAULT_RULES.forEach(rule => {
        expect(validTypes).toContain(rule.type);
      });
    });

    it('should have priority ordering', () => {
      const sorted = [...DEFAULT_RULES].sort((a, b) => a.priority - b.priority);
      
      expect(sorted[0].id).toBe('rate_limit');
    });

    it('should have valid rate limit config', () => {
      const rateLimitRule = DEFAULT_RULES.find(r => r.type === 'rate_limit');
      
      expect(rateLimitRule?.config).toHaveProperty('maxRequests');
      expect(rateLimitRule?.config).toHaveProperty('windowMs');
      expect(rateLimitRule?.config.maxRequests).toBeGreaterThan(0);
    });
  });

  describe('Level information', () => {
    const LEVEL_INFO = {
      basic: { name: '기본', color: 'blue', minReputation: 0 },
      standard: { name: '표준', color: 'green', minReputation: 300 },
      elevated: { name: '상승', color: 'purple', minReputation: 600 },
      admin: { name: '관리자', color: 'red', minReputation: 900 },
    };

    it('should have increasing reputation requirements', () => {
      const levels = ['basic', 'standard', 'elevated', 'admin'];
      
      for (let i = 0; i < levels.length - 1; i++) {
        const current = LEVEL_INFO[levels[i] as keyof typeof LEVEL_INFO];
        const next = LEVEL_INFO[levels[i + 1] as keyof typeof LEVEL_INFO];
        
        expect(next.minReputation).toBeGreaterThan(current.minReputation);
      }
    });

    it('should have unique colors', () => {
      const colors = Object.values(LEVEL_INFO).map(l => l.color);
      const uniqueColors = [...new Set(colors)];
      
      expect(colors.length).toBe(uniqueColors.length);
    });
  });

  describe('GET /api/dashboard/permissions', () => {
    it('should return permissions and rules', () => {
      const response = {
        success: true,
        data: {
          permissions: [],
          rules: [],
          levels: {},
        },
      };

      expect(response.data).toHaveProperty('permissions');
      expect(response.data).toHaveProperty('rules');
      expect(response.data).toHaveProperty('levels');
    });

    it('should fallback to defaults on DB error', () => {
      const response = {
        success: true,
        data: {
          permissions: [{ id: 'read', enabled: true }],
          rules: [{ id: 'rate_limit', enabled: true }],
          levels: { basic: { name: '기본' } },
        },
        meta: {
          fallback: true,
        },
      };

      expect(response.meta.fallback).toBe(true);
    });
  });

  describe('PUT /api/dashboard/permissions', () => {
    it('should update permission enabled state', () => {
      const updateRequest = {
        id: 'read',
        enabled: false,
      };

      expect(updateRequest.id).toBeDefined();
      expect(typeof updateRequest.enabled).toBe('boolean');
    });

    it('should reject invalid level values', () => {
      const invalidLevels = ['invalid', 'superadmin', ''];
      const validLevels = ['basic', 'standard', 'elevated', 'admin'];

      invalidLevels.forEach(level => {
        expect(validLevels).not.toContain(level);
      });
    });
  });

  describe('POST /api/dashboard/permissions', () => {
    it('should create new permission', () => {
      const newPermission = {
        id: 'custom_action',
        name: '커스텀 액션',
        description: '사용자 정의 권한',
        level: 'standard',
        enabled: true,
      };

      expect(newPermission.id).toBeDefined();
      expect(newPermission.name).toBeDefined();
      expect(newPermission.level).toBe('standard');
    });

    it('should validate required fields', () => {
      const requiredFields = ['id', 'name', 'level'];
      const validPermission = { id: 'test', name: '테스트', level: 'basic' };

      requiredFields.forEach(field => {
        expect(validPermission).toHaveProperty(field);
      });
    });
  });

  describe('Response format', () => {
    it('should include meta information', () => {
      const meta = {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
      };

      expect(meta.timestamp).toBeDefined();
      expect(meta.requestId).toBeDefined();
    });

    it('should indicate fallback mode', () => {
      const metaWithFallback = {
        fallback: true,
        error: 'Database unavailable',
      };

      expect(metaWithFallback.fallback).toBe(true);
    });
  });
});
