/**
 * AI Agent Manifest - 사이트 취급 설명서
 * AI가 접속하자마자 읽어야 할 전체 기능 명세
 * 
 * 역할:
 * 1. 사용 가능한 모든 API 엔드포인트 나열
 * 2. 각 액션의 파라미터, 제약사항, 권한 정보 제공
 * 3. 현재 서비스 상태 및 제한 사항 안내
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Manifest 버전 관리
const MANIFEST_VERSION = '1.0.0';
const LAST_UPDATED = '2026-02-03T00:00:00Z';

interface AIManifest {
  // 메타 정보
  $schema: string;
  version: string;
  lastUpdated: string;
  
  // 사이트 기본 정보
  site: {
    name: string;
    description: string;
    baseUrl: string;
    supportedLanguages: string[];
    timezone: string;
  };
  
  // AI를 위한 안내
  instructions: {
    overview: string;
    quickStart: string[];
    doNotDo: string[];
  };
  
  // 인증 정보
  authentication: {
    required: boolean;
    methods: AuthMethod[];
    tokenEndpoint: string;
    tokenLifetime: number;
  };
  
  // API 엔드포인트 목록
  endpoints: APIEndpoint[];
  
  // 실행 가능한 액션 목록
  actions: ActionDefinition[];
  
  // 제약 사항 및 규칙
  constraints: Constraint[];
  
  // 현재 서비스 상태
  status: ServiceStatus;
  
  // Rate Limiting 정보
  rateLimit: RateLimitInfo;
  
  // 웹훅/알림 설정
  webhooks?: WebhookConfig;
}

interface AuthMethod {
  type: 'bearer' | 'api_key' | 'oauth2';
  header: string;
  description: string;
}

interface APIEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  category: string;
  authRequired: boolean;
  requiredPermission: string;
  parameters?: Parameter[];
  responseSchema?: object;
  exampleRequest?: object;
  exampleResponse?: object;
}

interface Parameter {
  name: string;
  in: 'query' | 'body' | 'path' | 'header';
  type: string;
  required: boolean;
  description: string;
  default?: unknown;
  enum?: string[];
  constraints?: string[];
}

interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  category: 'read' | 'write' | 'execute';
  endpoint: string;
  method: string;
  confirmationRequired: boolean;
  reversible: boolean;
  parameters: Parameter[];
  preconditions?: string[];
  postconditions?: string[];
  errorCodes?: { code: string; description: string }[];
}

interface Constraint {
  type: 'quantity' | 'time' | 'authentication' | 'permission' | 'custom';
  rule: string;
  description: string;
  enforcedAt: 'request' | 'action' | 'global';
}

interface ServiceStatus {
  operational: boolean;
  message: string;
  components: {
    name: string;
    status: 'operational' | 'degraded' | 'outage';
    latency?: number;
  }[];
  plannedMaintenance?: {
    start: string;
    end: string;
    description: string;
  };
}

interface RateLimitInfo {
  requestsPerMinute: number;
  requestsPerDay: number;
  burstLimit: number;
  retryAfterHeader: string;
  upgradeInfo?: string;
}

interface WebhookConfig {
  supported: boolean;
  events: string[];
  registrationEndpoint: string;
}

/**
 * GET /api/ai-manifest.json - AI 에이전트용 취급 설명서
 */
export async function GET(request: NextRequest) {
  const baseUrl = new URL(request.url).origin;
  
  const manifest: AIManifest = {
    $schema: 'https://agent-gateway.dev/schemas/manifest-v1.json',
    version: MANIFEST_VERSION,
    lastUpdated: LAST_UPDATED,
    
    // =========================================
    // 사이트 기본 정보
    // =========================================
    site: {
      name: 'Agent Gateway Demo',
      description: 'AI 에이전트를 위한 웹 게이트웨이 서비스. 구조화된 데이터와 실행 가능한 액션을 제공합니다.',
      baseUrl,
      supportedLanguages: ['ko', 'en'],
      timezone: 'Asia/Seoul',
    },
    
    // =========================================
    // AI를 위한 안내
    // =========================================
    instructions: {
      overview: `이 서비스는 AI 에이전트가 웹사이트와 효율적으로 상호작용할 수 있도록 설계되었습니다. 
HTML 크롤링 없이 JSON 기반 API를 통해 모든 기능에 접근할 수 있습니다.`,
      
      quickStart: [
        '1. POST /api/agent/auth/token으로 인증 토큰을 발급받습니다.',
        '2. GET /api/agent로 현재 사이트 상태와 사용 가능한 액션을 확인합니다.',
        '3. 필요한 액션의 endpoint로 요청을 보냅니다.',
        '4. 응답의 success 필드로 성공 여부를 확인합니다.',
      ],
      
      doNotDo: [
        '❌ HTML을 파싱하여 데이터를 추출하지 마세요. 항상 JSON API를 사용하세요.',
        '❌ Rate Limit을 초과하는 요청을 보내지 마세요.',
        '❌ 인증 없이 보호된 엔드포인트에 접근하지 마세요.',
        '❌ execute 권한이 필요한 액션은 사용자 확인 없이 실행하지 마세요.',
        '❌ 동일한 요청을 무한 반복하지 마세요.',
      ],
    },
    
    // =========================================
    // 인증 정보
    // =========================================
    authentication: {
      required: true,
      methods: [
        {
          type: 'bearer',
          header: 'Authorization',
          description: 'Bearer <token> 형식으로 JWT 토큰을 전달합니다.',
        },
        {
          type: 'api_key',
          header: 'X-Agent-Token',
          description: '발급받은 에이전트 토큰을 직접 전달합니다.',
        },
      ],
      tokenEndpoint: `${baseUrl}/api/agent/auth/token`,
      tokenLifetime: 86400, // 24시간 (초)
    },
    
    // =========================================
    // API 엔드포인트 목록
    // =========================================
    endpoints: [
      {
        id: 'agent-gateway',
        path: '/api/agent',
        method: 'GET',
        description: '사이트의 전체 컨텍스트와 사용 가능한 액션 목록을 반환합니다.',
        category: 'core',
        authRequired: false,
        requiredPermission: 'read',
        parameters: [
          {
            name: 'format',
            in: 'query',
            type: 'string',
            required: false,
            description: '응답 형식',
            default: 'full',
            enum: ['full', 'minimal'],
          },
          {
            name: 'includePrompt',
            in: 'query',
            type: 'boolean',
            required: false,
            description: 'System Prompt 포함 여부',
            default: true,
          },
        ],
        exampleResponse: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          siteContext: { name: '...', description: '...' },
          availableActions: ['...'],
        },
      },
      {
        id: 'auth-token',
        path: '/api/agent/auth/token',
        method: 'POST',
        description: '에이전트 인증 토큰을 발급합니다.',
        category: 'auth',
        authRequired: false,
        requiredPermission: 'none',
        parameters: [
          {
            name: 'agentId',
            in: 'body',
            type: 'string',
            required: true,
            description: '등록된 에이전트 ID',
          },
          {
            name: 'agentSecret',
            in: 'body',
            type: 'string',
            required: true,
            description: '에이전트 시크릿 키',
          },
        ],
        exampleRequest: {
          agentId: 'my-agent',
          agentSecret: 'secret-key',
        },
        exampleResponse: {
          success: true,
          data: {
            token: 'ag_eyJ...',
            expiresAt: 1738713600,
          },
        },
      },
      {
        id: 'search',
        path: '/api/agent/search',
        method: 'GET',
        description: 'AI 친화적인 파라미터 기반 검색을 수행합니다.',
        category: 'query',
        authRequired: true,
        requiredPermission: 'read',
        parameters: [
          {
            name: 'q',
            in: 'query',
            type: 'string',
            required: true,
            description: '검색 키워드',
          },
          {
            name: 'filters',
            in: 'query',
            type: 'object',
            required: false,
            description: '필터 조건 (JSON)',
          },
          {
            name: 'sort',
            in: 'query',
            type: 'string',
            required: false,
            description: '정렬 기준',
            enum: ['relevance', 'price_asc', 'price_desc', 'newest'],
          },
          {
            name: 'limit',
            in: 'query',
            type: 'number',
            required: false,
            description: '결과 수 제한',
            default: 10,
            constraints: ['min: 1', 'max: 100'],
          },
        ],
      },
      {
        id: 'extract',
        path: '/api/agent/extract',
        method: 'POST',
        description: '외부 URL에서 구조화된 데이터를 추출합니다.',
        category: 'utility',
        authRequired: true,
        requiredPermission: 'read',
        parameters: [
          {
            name: 'url',
            in: 'body',
            type: 'string',
            required: true,
            description: '추출할 웹페이지 URL',
          },
        ],
      },
      {
        id: 'action',
        path: '/api/agent/action',
        method: 'POST',
        description: '지정된 액션을 실행합니다.',
        category: 'execution',
        authRequired: true,
        requiredPermission: 'execute',
        parameters: [
          {
            name: 'action',
            in: 'body',
            type: 'string',
            required: true,
            description: '실행할 액션 ID',
          },
          {
            name: 'params',
            in: 'body',
            type: 'object',
            required: false,
            description: '액션 파라미터',
          },
          {
            name: 'confirmed',
            in: 'body',
            type: 'boolean',
            required: false,
            description: '사용자 확인 완료 여부',
          },
        ],
      },
      {
        id: 'health',
        path: '/api/agent/health',
        method: 'GET',
        description: '서비스 상태를 확인합니다.',
        category: 'system',
        authRequired: false,
        requiredPermission: 'none',
      },
    ],
    
    // =========================================
    // 실행 가능한 액션 정의
    // =========================================
    actions: [
      {
        id: 'search',
        name: '검색',
        description: '키워드로 콘텐츠를 검색합니다.',
        category: 'read',
        endpoint: '/api/agent/search',
        method: 'GET',
        confirmationRequired: false,
        reversible: true,
        parameters: [
          { name: 'q', in: 'query', type: 'string', required: true, description: '검색어' },
        ],
      },
      {
        id: 'view_item',
        name: '상세 조회',
        description: '특정 항목의 상세 정보를 조회합니다.',
        category: 'read',
        endpoint: '/api/agent/items/{id}',
        method: 'GET',
        confirmationRequired: false,
        reversible: true,
        parameters: [
          { name: 'id', in: 'path', type: 'string', required: true, description: '항목 ID' },
        ],
      },
      {
        id: 'add_to_cart',
        name: '장바구니 추가',
        description: '상품을 장바구니에 추가합니다.',
        category: 'write',
        endpoint: '/api/agent/cart',
        method: 'POST',
        confirmationRequired: false,
        reversible: true,
        parameters: [
          { name: 'productId', in: 'body', type: 'string', required: true, description: '상품 ID' },
          { name: 'quantity', in: 'body', type: 'number', required: false, description: '수량', default: 1 },
        ],
        preconditions: ['상품이 재고 있음', '유효한 인증 토큰'],
        postconditions: ['장바구니에 상품 추가됨'],
        errorCodes: [
          { code: 'OUT_OF_STOCK', description: '재고 없음' },
          { code: 'QUANTITY_EXCEEDED', description: '최대 수량 초과' },
        ],
      },
      {
        id: 'purchase',
        name: '구매',
        description: '주문을 생성하고 결제를 진행합니다.',
        category: 'execute',
        endpoint: '/api/agent/orders',
        method: 'POST',
        confirmationRequired: true, // ⚠️ 사용자 확인 필수
        reversible: false,
        parameters: [
          { name: 'items', in: 'body', type: 'array', required: true, description: '주문 항목' },
          { name: 'paymentMethod', in: 'body', type: 'string', required: true, description: '결제 방식', enum: ['card', 'bank_transfer', 'mobile'] },
          { name: 'shippingAddress', in: 'body', type: 'object', required: true, description: '배송 주소' },
        ],
        preconditions: ['장바구니에 상품이 있음', '유효한 결제 수단', '사용자 확인 완료'],
        postconditions: ['주문 생성됨', '결제 진행됨'],
        errorCodes: [
          { code: 'INSUFFICIENT_STOCK', description: '재고 부족' },
          { code: 'PAYMENT_FAILED', description: '결제 실패' },
          { code: 'CONFIRMATION_REQUIRED', description: '사용자 확인 필요' },
        ],
      },
      {
        id: 'subscribe_alert',
        name: '알림 구독',
        description: '가격 변동, 재입고 등의 알림을 구독합니다.',
        category: 'write',
        endpoint: '/api/agent/subscriptions',
        method: 'POST',
        confirmationRequired: false,
        reversible: true,
        parameters: [
          { name: 'event', in: 'body', type: 'string', required: true, description: '이벤트 유형', enum: ['price_drop', 'restock', 'new_arrival'] },
          { name: 'targetId', in: 'body', type: 'string', required: false, description: '대상 ID' },
          { name: 'threshold', in: 'body', type: 'number', required: false, description: '임계값 (가격 등)' },
        ],
      },
    ],
    
    // =========================================
    // 제약 사항 및 규칙
    // =========================================
    constraints: [
      {
        type: 'quantity',
        rule: 'max_cart_items <= 50',
        description: '장바구니에는 최대 50개 항목까지 추가할 수 있습니다.',
        enforcedAt: 'action',
      },
      {
        type: 'quantity',
        rule: 'max_quantity_per_item <= 10',
        description: '한 상품당 최대 10개까지 구매할 수 있습니다.',
        enforcedAt: 'action',
      },
      {
        type: 'authentication',
        rule: 'token_required_for_write_actions',
        description: 'write/execute 액션은 반드시 인증 토큰이 필요합니다.',
        enforcedAt: 'request',
      },
      {
        type: 'permission',
        rule: 'execute_requires_confirmation',
        description: 'execute 카테고리 액션은 사용자 확인이 필요합니다.',
        enforcedAt: 'action',
      },
      {
        type: 'time',
        rule: 'order_cutoff_time = 23:00 KST',
        description: '23:00 이후 주문은 다음 날 처리됩니다.',
        enforcedAt: 'action',
      },
    ],
    
    // =========================================
    // 현재 서비스 상태
    // =========================================
    status: {
      operational: true,
      message: '모든 시스템이 정상 운영 중입니다.',
      components: [
        { name: 'API Gateway', status: 'operational', latency: 45 },
        { name: 'Authentication', status: 'operational', latency: 12 },
        { name: 'Search Service', status: 'operational', latency: 78 },
        { name: 'Order Processing', status: 'operational', latency: 120 },
      ],
      plannedMaintenance: {
        start: '2026-02-05T02:00:00+09:00',
        end: '2026-02-05T04:00:00+09:00',
        description: '정기 시스템 점검',
      },
    },
    
    // =========================================
    // Rate Limiting 정보
    // =========================================
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerDay: 10000,
      burstLimit: 20,
      retryAfterHeader: 'Retry-After',
      upgradeInfo: '더 높은 Rate Limit이 필요하시면 support@agent-gateway.dev로 문의하세요.',
    },
    
    // =========================================
    // 웹훅 설정
    // =========================================
    webhooks: {
      supported: true,
      events: [
        'order.created',
        'order.shipped',
        'order.delivered',
        'price.changed',
        'stock.low',
        'stock.restocked',
      ],
      registrationEndpoint: `${baseUrl}/api/agent/webhooks`,
    },
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // 1시간 캐시
      'X-Manifest-Version': MANIFEST_VERSION,
    },
  });
}
