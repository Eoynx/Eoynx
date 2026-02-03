/**
 * Dynamic Prompt Generator 테스트
 */

import { 
  generateSystemPrompt, 
  generatePromptFromResponse 
} from '@/lib/prompt/prompt-generator';
import type { SiteContext, AgentAction, ContextBriefing, AgentGatewayResponse } from '@/types';

describe('Dynamic Prompt Generator', () => {
  const mockSiteContext: SiteContext = {
    name: 'Test Shop',
    url: 'https://test-shop.com',
    description: '온라인 테스트 쇼핑몰',
    primaryLanguage: 'ko',
    categories: ['전자제품', '의류'],
    features: ['상품 검색', '장바구니', '주문'],
  };

  const mockActions: AgentAction[] = [
    {
      type: 'search',
      name: 'search_products',
      description: '상품 검색',
      method: 'POST',
      endpoint: '/api/agent/search',
      requiredPermission: 'read',
      parameters: [
        { name: 'query', type: 'string', required: true, description: '검색어' },
      ],
    },
    {
      type: 'addToCart',
      name: 'add_to_cart',
      description: '장바구니 추가',
      method: 'POST',
      endpoint: '/api/agent/cart',
      requiredPermission: 'write',
      parameters: [
        { name: 'productId', type: 'string', required: true, description: '상품 ID' },
        { name: 'quantity', type: 'number', required: false, description: '수량' },
      ],
    },
  ];

  const mockBriefing: ContextBriefing = {
    summary: '현재 테스트 쇼핑몰에서 활동 중입니다.',
    highlights: ['오늘의 특가 상품 10개', '신상품 20개 입고'],
    alerts: [
      { type: 'info', message: '봄 시즌 세일 진행 중' },
    ],
    trending: [
      { rank: 1, name: '무선 이어폰', type: 'product' },
      { rank: 2, name: '스마트워치', type: 'product' },
    ],
    lastUpdated: new Date().toISOString(),
  };

  describe('generateSystemPrompt', () => {
    it('should generate a prompt string', () => {
      const prompt = generateSystemPrompt(mockSiteContext, mockActions);

      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should include site name in prompt', () => {
      const prompt = generateSystemPrompt(mockSiteContext, mockActions);

      expect(prompt).toContain('Test Shop');
    });

    it('should include action names in prompt', () => {
      const prompt = generateSystemPrompt(mockSiteContext, mockActions);

      expect(prompt).toContain('search_products');
      expect(prompt).toContain('add_to_cart');
    });

    it('should include site description', () => {
      const prompt = generateSystemPrompt(mockSiteContext, mockActions);

      expect(prompt).toContain('온라인 테스트 쇼핑몰');
    });

    it('should include context briefing when provided', () => {
      const prompt = generateSystemPrompt(mockSiteContext, mockActions, mockBriefing);

      expect(prompt).toContain('현재 테스트 쇼핑몰에서 활동 중입니다.');
      expect(prompt).toContain('오늘의 특가 상품 10개');
    });

    it('should respect language option', () => {
      const promptKo = generateSystemPrompt(mockSiteContext, mockActions, undefined, { language: 'ko' });
      const promptEn = generateSystemPrompt(mockSiteContext, mockActions, undefined, { language: 'en' });

      expect(promptKo).toContain('사이트 정보');
      expect(promptEn).toContain('Site Information');
    });

    it('should handle minimal verbosity', () => {
      const minimalPrompt = generateSystemPrompt(mockSiteContext, mockActions, undefined, { verbosity: 'minimal' });
      const standardPrompt = generateSystemPrompt(mockSiteContext, mockActions, undefined, { verbosity: 'standard' });

      expect(minimalPrompt.length).toBeLessThan(standardPrompt.length);
    });

    it('should truncate prompt when exceeding maxLength', () => {
      const shortPrompt = generateSystemPrompt(mockSiteContext, mockActions, mockBriefing, { maxLength: 500 });

      expect(shortPrompt.length).toBeLessThanOrEqual(500);
    });
  });

  describe('generatePromptFromResponse', () => {
    it('should generate prompt from full response object', () => {
      const response: AgentGatewayResponse = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': 'https://test-shop.com/',
        gateway: {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          responseTime: 50,
        },
        siteContext: mockSiteContext,
        structuredData: [],
        availableActions: mockActions,
        contextBriefing: mockBriefing,
      };

      const prompt = generatePromptFromResponse(response);

      expect(prompt).toContain('Test Shop');
      expect(prompt).toContain('search_products');
    });

    it('should pass options to underlying generator', () => {
      const response: AgentGatewayResponse = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': 'https://test-shop.com/',
        gateway: {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          responseTime: 50,
        },
        siteContext: mockSiteContext,
        structuredData: [],
        availableActions: mockActions,
      };

      const prompt = generatePromptFromResponse(response, { language: 'en' });

      expect(prompt).toContain('Site Information');
    });
  });

  describe('Action permissions grouping', () => {
    it('should group actions by permission level', () => {
      const prompt = generateSystemPrompt(mockSiteContext, mockActions);

      // read와 write 권한이 각각 그룹화되어야 함
      expect(prompt).toContain('읽기 전용');
      expect(prompt).toContain('쓰기 가능');
    });

    it('should handle empty actions array', () => {
      const prompt = generateSystemPrompt(mockSiteContext, []);

      expect(prompt).toContain('사용 가능한 액션이 없습니다');
    });
  });

  describe('Parameter descriptions', () => {
    it('should include required parameter info in detailed mode', () => {
      const prompt = generateSystemPrompt(mockSiteContext, mockActions, undefined, { verbosity: 'detailed' });

      expect(prompt).toContain('query');
      expect(prompt).toContain('필수');
    });

    it('should include example section when includeExamples is true', () => {
      const prompt = generateSystemPrompt(mockSiteContext, mockActions, undefined, { includeExamples: true });

      expect(prompt).toContain('사용 예시');
    });
  });

  describe('Guidelines section', () => {
    it('should include usage guidelines in standard mode', () => {
      const prompt = generateSystemPrompt(mockSiteContext, mockActions, undefined, { verbosity: 'standard' });

      expect(prompt).toContain('사용 가이드라인');
    });

    it('should exclude guidelines in minimal mode', () => {
      const prompt = generateSystemPrompt(mockSiteContext, mockActions, undefined, { verbosity: 'minimal' });

      expect(prompt).not.toContain('가이드라인');
    });
  });
});
