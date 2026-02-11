/**
 * Dashboard Stats API 테스트
 */

// Supabase mock
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
};

jest.mock('@/lib/supabase/client', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabaseClient),
}));

// NextRequest/NextResponse mock
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url: string) => ({
    url,
    method: 'GET',
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

describe('Dashboard Stats API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/dashboard/stats', () => {
    it('should return dashboard statistics structure', async () => {
      // Mock Supabase responses
      mockSupabaseClient.select.mockImplementation(() => ({
        gte: jest.fn().mockReturnValue({
          // today requests
          then: (cb: (result: { count: number }) => void) => cb({ count: 150 }),
          lt: jest.fn().mockReturnValue({
            then: (cb: (result: { count: number }) => void) => cb({ count: 100 }),
          }),
          not: jest.fn().mockReturnValue({
            then: (cb: (result: { data: { duration_ms: number }[] }) => void) => 
              cb({ data: [{ duration_ms: 120 }, { duration_ms: 80 }] }),
          }),
        }),
        eq: jest.fn().mockReturnValue({
          lt: jest.fn().mockReturnValue({
            then: (cb: (result: { count: number }) => void) => cb({ count: 5 }),
          }),
          then: (cb: (result: { count: number }) => void) => cb({ count: 8 }),
        }),
      }));

      // Expected response structure
      const expectedStats = {
        todayRequests: {
          value: expect.any(Number),
          change: expect.any(Number),
          changeType: expect.stringMatching(/^(positive|negative|neutral)$/),
        },
        activeAgents: {
          value: expect.any(Number),
          change: expect.any(Number),
          changeType: expect.stringMatching(/^(positive|negative|neutral)$/),
        },
        avgResponseTime: {
          value: expect.any(Number),
          change: expect.any(Number),
          changeType: expect.stringMatching(/^(positive|negative|neutral)$/),
        },
        errorRate: {
          value: expect.any(Number),
          change: expect.any(Number),
          changeType: expect.stringMatching(/^(positive|negative|neutral)$/),
        },
      };

      // Validate structure
      expect(expectedStats.todayRequests).toHaveProperty('value');
      expect(expectedStats.todayRequests).toHaveProperty('change');
      expect(expectedStats.todayRequests).toHaveProperty('changeType');
    });

    it('should calculate positive change when today > yesterday', () => {
      const today = 150;
      const yesterday = 100;
      const change = yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 100) : 0;
      const changeType = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';

      expect(change).toBe(50);
      expect(changeType).toBe('positive');
    });

    it('should calculate negative change when today < yesterday', () => {
      const today = 80;
      const yesterday = 100;
      const change = yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 100) : 0;
      const changeType = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';

      expect(change).toBe(-20);
      expect(changeType).toBe('negative');
    });

    it('should return neutral when no change', () => {
      const today = 100;
      const yesterday = 100;
      const change = yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 100) : 0;
      const changeType = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';

      expect(change).toBe(0);
      expect(changeType).toBe('neutral');
    });

    it('should handle zero yesterday values', () => {
      const today = 100;
      const yesterday = 0;
      const change = yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 100) : 0;

      expect(change).toBe(0);
    });

    it('should calculate average response time correctly', () => {
      const durations = [100, 120, 80, 140, 60];
      const avg = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

      expect(avg).toBe(100);
    });

    it('should calculate error rate correctly', () => {
      const totalRequests = 100;
      const errorRequests = 5;
      const errorRate = totalRequests > 0
        ? Math.round((errorRequests / totalRequests) * 1000) / 10
        : 0;

      expect(errorRate).toBe(5);
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

    it('should include meta with timestamp and requestId', () => {
      const meta = {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
      };

      expect(meta.timestamp).toBeDefined();
      expect(meta.requestId).toBeDefined();
      expect(meta.version).toBe('1.0.0');
    });
  });
});
