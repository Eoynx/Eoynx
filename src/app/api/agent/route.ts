/**
 * Agent Gateway - 메인 에이전트 API 엔드포인트
 * Edge Runtime에서 실행되어 빠른 응답 제공
 */

import { NextRequest, NextResponse } from 'next/server';
import type { 
  AgentGatewayResponse, 
  AgentAction, 
  SiteContext,
  ContextBriefing,
  ApiResponse 
} from '@/types';

// Edge Runtime 활성화
export const runtime = 'edge';

// 기본 사이트 컨텍스트 (실제로는 DB에서 로드)
const DEFAULT_SITE_CONTEXT: SiteContext = {
  name: 'Agent Gateway Demo',
  url: 'https://agent-gateway.example.com',
  description: 'AI 에이전트를 위한 웹 게이트웨이 서비스 데모',
  primaryLanguage: 'ko',
  categories: ['Technology', 'AI', 'API'],
  features: ['구조화된 데이터 제공', '실시간 컨텍스트', 'M2M 인증'],
};

// 사용 가능한 액션 목록 (실제로는 설정에서 로드)
const AVAILABLE_ACTIONS: AgentAction[] = [
  {
    type: 'search',
    name: '검색',
    description: '사이트 내 콘텐츠를 검색합니다',
    endpoint: '/api/agent/search',
    method: 'GET',
    requiredPermission: 'read',
    parameters: [
      { name: 'q', type: 'string', required: true, description: '검색 쿼리' },
      { name: 'limit', type: 'number', required: false, default: 10, description: '결과 수 제한' },
    ],
    rateLimit: { maxRequests: 100, windowSeconds: 60 },
  },
  {
    type: 'view',
    name: '상세 조회',
    description: '특정 항목의 상세 정보를 조회합니다',
    endpoint: '/api/agent/items/:id',
    method: 'GET',
    requiredPermission: 'read',
    parameters: [
      { name: 'id', type: 'string', required: true, description: '항목 ID' },
    ],
  },
  {
    type: 'addToCart',
    name: '장바구니 추가',
    description: '상품을 장바구니에 추가합니다',
    endpoint: '/api/agent/cart',
    method: 'POST',
    requiredPermission: 'write',
    parameters: [
      { name: 'productId', type: 'string', required: true, description: '상품 ID' },
      { name: 'quantity', type: 'number', required: false, default: 1, description: '수량' },
    ],
  },
  {
    type: 'purchase',
    name: '구매 진행',
    description: '주문을 생성하고 결제를 진행합니다',
    endpoint: '/api/agent/orders',
    method: 'POST',
    requiredPermission: 'execute',
    parameters: [
      { name: 'items', type: 'array', required: true, description: '주문 항목 목록' },
      { name: 'paymentMethod', type: 'string', required: true, description: '결제 방식' },
    ],
  },
  {
    type: 'subscribe',
    name: '알림 구독',
    description: '특정 이벤트에 대한 알림을 구독합니다',
    endpoint: '/api/agent/subscriptions',
    method: 'POST',
    requiredPermission: 'write',
    parameters: [
      { name: 'event', type: 'string', required: true, description: '이벤트 유형', enum: ['price_drop', 'restock', 'new_arrival'] },
      { name: 'targetId', type: 'string', required: false, description: '대상 ID' },
    ],
  },
];

// 실시간 컨텍스트 브리핑 (실제로는 동적으로 생성)
const CONTEXT_BRIEFING: ContextBriefing = {
  summary: 'Agent Gateway 데모 사이트입니다. 현재 모든 시스템이 정상 운영 중입니다.',
  highlights: [
    'API 응답 평균 시간: 45ms',
    '오늘 등록된 신규 에이전트: 23개',
    '현재 활성 세션: 156개',
  ],
  alerts: [
    {
      type: 'info',
      message: '2026년 2월 5일 02:00-04:00 예정 점검이 있습니다.',
      expiresAt: '2026-02-05T04:00:00Z',
    },
  ],
  trending: [
    { name: 'OpenAI GPT-4', type: 'agent', rank: 1 },
    { name: 'Anthropic Claude', type: 'agent', rank: 2 },
    { name: '/api/agent/search', type: 'endpoint', rank: 3 },
  ],
  lastUpdated: new Date().toISOString(),
};

/**
 * GET /api/agent - 에이전트 게이트웨이 메인 엔드포인트
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get('x-gateway-request-id') || crypto.randomUUID();
  
  try {
    // URL 파라미터 처리
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'full';
    const includePrompt = searchParams.get('includePrompt') !== 'false';

    // 에이전트 정보 확인
    const agentId = request.headers.get('x-verified-agent-id') || 'anonymous';
    const agentPermissions = getAgentPermissions(agentId);

    // 권한에 따른 액션 필터링
    const filteredActions = AVAILABLE_ACTIONS.filter(action => 
      hasPermission(agentPermissions, action.requiredPermission)
    );

    // Dynamic Prompt 생성
    let suggestedPrompt: string | undefined;
    if (includePrompt) {
      suggestedPrompt = generateQuickPrompt(
        DEFAULT_SITE_CONTEXT, 
        filteredActions, 
        CONTEXT_BRIEFING
      );
    }

    // 응답 생성
    const response: AgentGatewayResponse = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': request.url,
      
      gateway: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      },
      
      siteContext: DEFAULT_SITE_CONTEXT,
      
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: DEFAULT_SITE_CONTEXT.name,
          url: DEFAULT_SITE_CONTEXT.url,
          description: DEFAULT_SITE_CONTEXT.description,
        },
      ],
      
      availableActions: filteredActions,
      contextBriefing: CONTEXT_BRIEFING,
      suggestedPrompt,
    };

    // 간략한 형식 요청 처리
    if (format === 'minimal') {
      return NextResponse.json({
        siteContext: response.siteContext,
        availableActions: response.availableActions.map(a => ({
          type: a.type,
          name: a.name,
          endpoint: a.endpoint,
          method: a.method,
        })),
      }, {
        headers: getResponseHeaders(requestId, startTime),
      });
    }

    return NextResponse.json(response, {
      headers: getResponseHeaders(requestId, startTime),
    });

  } catch (error) {
    console.error('[AgentGateway] Error:', error);
    
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: '1.0.0',
      },
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: getResponseHeaders(requestId, startTime),
    });
  }
}

/**
 * POST /api/agent - 에이전트 액션 실행
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get('x-gateway-request-id') || crypto.randomUUID();

  try {
    const body = await request.json();
    const { action, params } = body;

    if (!action) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_ACTION',
          message: 'Action type is required',
        },
      }, {
        status: 400,
        headers: getResponseHeaders(requestId, startTime),
      });
    }

    // 액션 찾기
    const actionDef = AVAILABLE_ACTIONS.find(a => a.type === action);
    if (!actionDef) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNKNOWN_ACTION',
          message: `Unknown action type: ${action}`,
          details: {
            availableActions: AVAILABLE_ACTIONS.map(a => a.type),
          },
        },
      }, {
        status: 400,
        headers: getResponseHeaders(requestId, startTime),
      });
    }

    // 권한 확인
    const agentId = request.headers.get('x-verified-agent-id') || 'anonymous';
    const agentPermissions = getAgentPermissions(agentId);
    
    if (!hasPermission(agentPermissions, actionDef.requiredPermission)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `This action requires '${actionDef.requiredPermission}' permission`,
        },
      }, {
        status: 403,
        headers: getResponseHeaders(requestId, startTime),
      });
    }

    // 액션 실행 (데모용 응답)
    return NextResponse.json({
      success: true,
      data: {
        action,
        status: 'executed',
        message: `Action '${actionDef.name}' executed successfully`,
        params,
        executedAt: new Date().toISOString(),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: '1.0.0',
      },
    }, {
      headers: getResponseHeaders(requestId, startTime),
    });

  } catch (error) {
    console.error('[AgentGateway] POST Error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process action',
      },
    }, {
      status: 500,
      headers: getResponseHeaders(requestId, startTime),
    });
  }
}

/**
 * OPTIONS - CORS Preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Agent-Token, X-Agent-ID',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// ============================================
// Helper Functions
// ============================================

function getResponseHeaders(requestId: string, startTime: number): HeadersInit {
  return {
    'Content-Type': 'application/ld+json',
    'X-Gateway-Version': '1.0.0',
    'X-Request-ID': requestId,
    'X-Response-Time': `${Date.now() - startTime}ms`,
    'Cache-Control': 'public, max-age=60',
  };
}

function getAgentPermissions(agentId: string): string[] {
  // 실제로는 DB에서 에이전트 권한 조회
  const permissionMap: Record<string, string[]> = {
    'openai': ['read', 'write', 'execute'],
    'anthropic': ['read', 'write', 'execute'],
    'google': ['read', 'write'],
    'anonymous': ['read'],
  };

  return permissionMap[agentId] || permissionMap['anonymous'];
}

function hasPermission(permissions: string[], required: string): boolean {
  const hierarchy: Record<string, number> = {
    'read': 1,
    'write': 2,
    'execute': 3,
    'admin': 4,
  };

  const requiredLevel = hierarchy[required] || 0;
  return permissions.some(p => (hierarchy[p] || 0) >= requiredLevel);
}

function generateQuickPrompt(
  context: SiteContext, 
  actions: AgentAction[],
  briefing: ContextBriefing
): string {
  const actionList = actions
    .map(a => `- ${a.name}: ${a.method} ${a.endpoint}`)
    .join('\n');

  return `## ${context.name}

${context.description}

### 현재 상황
${briefing.summary}

### 사용 가능한 액션
${actionList}

### 인증
모든 요청에 X-Agent-Token 헤더를 포함하세요.`;
}
