'use client';

import { useState } from 'react';
import Link from 'next/link';

// =====================================================
// SVG 아이콘 컴포넌트
// =====================================================
const Icons = {
  robot: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  shopping: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  search: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  cart: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  chart: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  shield: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  store: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L3 3m4 10v8h10v-8M7 3h14l-1 8" />
    </svg>
  ),
  mobile: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  building: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  currency: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  rocket: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  sparkles: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  lightbulb: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  target: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  question: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  book: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  code: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
};

// =====================================================
// 일반 사용자 가이드 데이터
// =====================================================
const FEATURES = [
  {
    iconKey: 'robot' as keyof typeof Icons,
    title: 'AI 에이전트 연동',
    description: 'ChatGPT, Claude 등 AI 에이전트가 여러분의 서비스를 이해하고 사용할 수 있게 해줍니다.',
    details: [
      '자연어로 서비스 설명',
      'AI가 자동으로 API 호출',
      '복잡한 작업도 대화로 해결',
    ],
  },
  {
    iconKey: 'shopping' as keyof typeof Icons,
    title: '상품 정보 추출',
    description: '쇼핑몰 상품 페이지에서 가격, 이름, 이미지 등을 자동으로 추출합니다.',
    details: [
      '어떤 쇼핑몰이든 지원',
      '실시간 가격 모니터링',
      '관련 상품 자동 탐색',
    ],
  },
  {
    iconKey: 'search' as keyof typeof Icons,
    title: 'AI 웹 검색',
    description: 'AI가 웹을 검색하고 필요한 정보를 정리해서 알려줍니다.',
    details: [
      '최신 정보 실시간 검색',
      '관련 정보 자동 요약',
      '신뢰할 수 있는 출처만 사용',
    ],
  },
  {
    iconKey: 'cart' as keyof typeof Icons,
    title: '자동 구매 지원',
    description: 'AI가 장바구니 담기, 주문 생성 등의 작업을 대신 수행합니다.',
    details: [
      '장바구니 자동 담기',
      '재고 확인 및 알림',
      '가격 비교 자동화',
    ],
  },
  {
    iconKey: 'chart' as keyof typeof Icons,
    title: '데이터 분석',
    description: '서비스 사용 현황과 AI 에이전트 활동을 한눈에 파악할 수 있습니다.',
    details: [
      '실시간 사용량 통계',
      '에이전트 활동 로그',
      '성능 분석 리포트',
    ],
  },
  {
    iconKey: 'shield' as keyof typeof Icons,
    title: '안전한 인증',
    description: '에이전트별 권한 관리와 안전한 API 접근을 보장합니다.',
    details: [
      '에이전트 인증 토큰',
      '세밀한 권한 설정',
      '사용 한도 관리',
    ],
  },
];

const USE_CASES = [
  {
    iconKey: 'store' as keyof typeof Icons,
    title: '쇼핑몰 운영자',
    description: 'AI 에이전트가 고객 문의에 자동으로 응답하고, 상품 추천, 재고 확인을 대신합니다.',
    example: '"이 상품 재고 있어요?" → AI가 실시간 확인 후 답변',
  },
  {
    iconKey: 'mobile' as keyof typeof Icons,
    title: '앱 개발자',
    description: 'ChatGPT나 Claude를 앱에 통합하여 스마트한 기능을 추가할 수 있습니다.',
    example: '"주변 맛집 추천해줘" → AI가 검색하고 예약까지 지원',
  },
  {
    iconKey: 'building' as keyof typeof Icons,
    title: '기업 서비스',
    description: '사내 시스템을 AI와 연결하여 업무 자동화와 효율화를 실현합니다.',
    example: '"지난 달 매출 보고서 만들어줘" → AI가 데이터 분석 후 리포트 생성',
  },
  {
    iconKey: 'currency' as keyof typeof Icons,
    title: '가격 비교 서비스',
    description: '여러 쇼핑몰의 상품 정보를 자동으로 수집하여 가격을 비교합니다.',
    example: '매일 상품 가격 자동 수집 → 최저가 알림 발송',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Eoynx가 뭔가요?',
    a: 'Eoynx(이오닉스)는 AI 에이전트가 웹 서비스를 이해하고 사용할 수 있게 해주는 플랫폼입니다. ChatGPT, Claude 같은 AI가 여러분 대신 웹사이트를 검색하고, 상품을 찾고, 주문까지 할 수 있게 됩니다.',
  },
  {
    q: '프로그래밍을 몰라도 사용할 수 있나요?',
    a: '네! 대시보드에서 서비스를 등록하고 설정하는 것만으로 AI 에이전트 연동이 가능합니다. 복잡한 코딩 없이도 시작할 수 있어요.',
  },
  {
    q: '어떤 AI를 지원하나요?',
    a: 'ChatGPT, Claude, Gemini 등 대부분의 주요 AI 모델을 지원합니다. MCP(Model Context Protocol) 표준을 따르므로 새로운 AI가 나와도 쉽게 연동됩니다.',
  },
  {
    q: '무료로 사용할 수 있나요?',
    a: '기본 기능은 무료로 제공됩니다. 더 많은 API 호출이나 프리미엄 기능이 필요하면 Pro 플랜을 이용하세요.',
  },
  {
    q: '내 데이터는 안전한가요?',
    a: '모든 데이터는 암호화되어 전송되고 저장됩니다. 에이전트별로 세밀한 권한 설정이 가능하며, 사용 로그도 투명하게 확인할 수 있습니다.',
  },
  {
    q: 'API 문서는 어디서 볼 수 있나요?',
    a: '이 페이지 상단의 "개발자 문서" 탭을 클릭하면 상세한 API 문서를 확인할 수 있습니다.',
  },
];

const GETTING_STARTED_STEPS = [
  {
    step: 1,
    title: '회원가입',
    description: '구글, GitHub 또는 이메일로 간편하게 가입하세요.',
    link: '/signup',
  },
  {
    step: 2,
    title: '서비스 등록',
    description: '대시보드에서 연동할 서비스(웹사이트) 정보를 입력합니다.',
    link: '/dashboard/services',
  },
  {
    step: 3,
    title: 'API 키 발급',
    description: 'AI 에이전트가 사용할 API 키를 발급받습니다.',
    link: '/dashboard/agents',
  },
  {
    step: 4,
    title: '연동 테스트',
    description: '데모 페이지에서 AI와 대화하며 연동을 테스트해보세요.',
    link: '/demo',
  },
];

// =====================================================

// API 엔드포인트 정의
const API_ENDPOINTS = [
  {
    category: 'Agent API',
    description: 'AI 에이전트 통합을 위한 핵심 API',
    endpoints: [
      {
        method: 'POST',
        path: '/api/agent',
        title: 'Agent 요청 처리',
        description: 'AI 에이전트의 요청을 처리하고 응답을 반환합니다.',
        headers: [
          { name: 'X-Agent-Token', required: true, description: '에이전트 인증 토큰' },
          { name: 'X-Agent-ID', required: false, description: '에이전트 식별자' },
        ],
        body: `{
  "action": "query",
  "query": "사용자 정보 조회",
  "context": { "userId": "123" }
}`,
        response: `{
  "success": true,
  "data": { ... },
  "metadata": {
    "responseTime": "45ms",
    "tokens": 150
  }
}`,
      },
      {
        method: 'GET',
        path: '/api/agent/health',
        title: '헬스 체크',
        description: 'API 서버 상태를 확인합니다.',
        headers: [],
        response: `{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": "24h 30m"
}`,
      },
      {
        method: 'POST',
        path: '/api/agent/stream',
        title: '스트리밍 응답',
        description: 'Server-Sent Events를 통한 실시간 스트리밍 응답을 제공합니다.',
        headers: [
          { name: 'X-Agent-Token', required: true, description: '에이전트 인증 토큰' },
        ],
        body: `{
  "prompt": "긴 답변이 필요한 질문",
  "stream": true
}`,
        response: `data: {"chunk": "첫 번째 "}
data: {"chunk": "응답 "}
data: {"chunk": "조각"}
data: [DONE]`,
      },
    ],
  },
  {
    category: 'Search API',
    description: '웹 검색 및 정보 추출 API',
    endpoints: [
      {
        method: 'POST',
        path: '/api/agent/search',
        title: '웹 검색',
        description: '실시간 웹 검색을 수행하고 결과를 반환합니다.',
        headers: [
          { name: 'X-Agent-Token', required: true, description: '에이전트 인증 토큰' },
        ],
        body: `{
  "query": "검색어",
  "limit": 10,
  "filters": {
    "language": "ko",
    "freshness": "week"
  }
}`,
        response: `{
  "results": [
    {
      "title": "검색 결과 제목",
      "url": "https://example.com",
      "snippet": "검색 결과 요약...",
      "score": 0.95
    }
  ],
  "total": 100
}`,
      },
      {
        method: 'POST',
        path: '/api/agent/extract',
        title: '데이터 추출',
        description: 'URL에서 구조화된 데이터를 추출합니다.',
        headers: [
          { name: 'X-Agent-Token', required: true, description: '에이전트 인증 토큰' },
        ],
        body: `{
  "url": "https://example.com/page",
  "schema": {
    "title": "string",
    "price": "number",
    "description": "string"
  }
}`,
        response: `{
  "extracted": {
    "title": "제품명",
    "price": 29900,
    "description": "제품 설명..."
  },
  "confidence": 0.92
}`,
      },
    ],
  },
  {
    category: 'Action API',
    description: '트랜잭션 및 액션 수행 API',
    endpoints: [
      {
        method: 'POST',
        path: '/api/agent/action',
        title: '액션 수행',
        description: '장바구니 추가, 주문 생성 등의 트랜잭션 작업을 수행합니다.',
        headers: [
          { name: 'X-Agent-Token', required: true, description: '에이전트 인증 토큰' },
        ],
        body: `{
  "action": "cart.add",
  "params": {
    "productId": "prod_123",
    "quantity": 2
  }
}`,
        response: `{
  "success": true,
  "action": "cart.add",
  "result": {
    "cartId": "cart_456",
    "itemCount": 3,
    "total": 89700
  }
}`,
      },
      {
        method: 'GET',
        path: '/api/agent/reputation',
        title: '평판 조회',
        description: '에이전트의 신뢰도 점수와 평판 정보를 조회합니다.',
        headers: [
          { name: 'X-Agent-Token', required: true, description: '에이전트 인증 토큰' },
        ],
        response: `{
  "agentId": "agent_123",
  "score": 95,
  "metrics": {
    "totalRequests": 10000,
    "successRate": 99.5,
    "avgResponseTime": "120ms"
  },
  "badges": ["verified", "premium"]
}`,
      },
    ],
  },
  {
    category: 'MCP (Model Context Protocol)',
    description: 'MCP 서버 연결 및 도구 실행 API',
    endpoints: [
      {
        method: 'POST',
        path: '/api/agent/mcp',
        title: 'MCP 도구 실행',
        description: 'MCP 프로토콜을 통해 외부 도구를 실행합니다.',
        headers: [
          { name: 'X-Agent-Token', required: true, description: '에이전트 인증 토큰' },
        ],
        body: `{
  "tool": "calculator",
  "method": "calculate",
  "params": {
    "expression": "2 + 2 * 3"
  }
}`,
        response: `{
  "success": true,
  "result": 8,
  "executionTime": "5ms"
}`,
      },
    ],
  },
  {
    category: 'Auth API',
    description: '인증 및 토큰 관리 API',
    endpoints: [
      {
        method: 'POST',
        path: '/api/agent/auth/token',
        title: '토큰 발급',
        description: 'API 접근을 위한 인증 토큰을 발급합니다.',
        headers: [
          { name: 'Authorization', required: true, description: 'Basic 인증 헤더' },
        ],
        body: `{
  "grant_type": "client_credentials",
  "scope": ["agent.read", "agent.write"]
}`,
        response: `{
  "access_token": "eyJhbGciOiJIUzI1...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "agent.read agent.write"
}`,
      },
    ],
  },
];

// SDK 코드 예시
const SDK_EXAMPLES = {
  javascript: `import { AgentGateway } from '@eoynx/agent-gateway';

const gateway = new AgentGateway({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.eoynx.com'
});

// 검색 수행
const results = await gateway.search({
  query: '최신 AI 뉴스',
  limit: 10
});

// 액션 실행
const order = await gateway.action('cart.add', {
  productId: 'prod_123',
  quantity: 1
});`,
  python: `from eoynx import AgentGateway

gateway = AgentGateway(
    api_key="your-api-key",
    base_url="https://api.eoynx.com"
)

# 검색 수행
results = gateway.search(
    query="최신 AI 뉴스",
    limit=10
)

# 액션 실행
order = gateway.action("cart.add", {
    "productId": "prod_123",
    "quantity": 1
})`,
  curl: `# 검색 API 호출
curl -X POST https://api.eoynx.com/api/agent/search \\
  -H "Content-Type: application/json" \\
  -H "X-Agent-Token: your-api-key" \\
  -d '{"query": "최신 AI 뉴스", "limit": 10}'

# 액션 API 호출
curl -X POST https://api.eoynx.com/api/agent/action \\
  -H "Content-Type: application/json" \\
  -H "X-Agent-Token: your-api-key" \\
  -d '{"action": "cart.add", "params": {"productId": "prod_123"}}'`,
};

export default function DocsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [selectedSDK, setSelectedSDK] = useState<'javascript' | 'python' | 'curl'>('javascript');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'guide' | 'api'>('guide');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const methodColors: Record<string, string> = {
    GET: 'bg-green-500/20 text-green-400 border-green-500/30',
    POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    PUT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-onyx-900 via-onyx-800 to-onyx-900">
      {/* 네비게이션 */}
      <nav className="sticky top-0 z-50 bg-onyx-900/80 backdrop-blur-sm border-b border-onyx-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-dawn-400 to-dawn-600 bg-clip-text text-transparent">
              eoynx
            </h1>
            <span className="text-onyx-400 text-sm">문서</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link 
              href="/demo" 
              className="text-onyx-300 hover:text-white transition-colors"
            >
              데모
            </Link>
            <Link 
              href="/login" 
              className="px-4 py-2 bg-dawn-500 text-white rounded-lg hover:bg-dawn-600 transition-colors"
            >
              로그인
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 헤더 + 탭 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Eoynx 문서</h1>
          <p className="text-onyx-400 max-w-2xl mx-auto mb-8">
            AI 에이전트 연동의 모든 것을 알아보세요
          </p>
          
          {/* 탭 버튼 */}
          <div className="flex justify-center gap-2 mb-8">
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'guide'
                  ? 'bg-dawn-500 text-white'
                  : 'bg-onyx-800 text-onyx-300 hover:bg-onyx-700'
              }`}
            >
              {Icons.book}
              일반 사용자 가이드
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'api'
                  ? 'bg-dawn-500 text-white'
                  : 'bg-onyx-800 text-onyx-300 hover:bg-onyx-700'
              }`}
            >
              {Icons.code}
              개발자 API 문서
            </button>
          </div>
        </div>

        {/* ===== 일반 사용자 가이드 탭 ===== */}
        {activeTab === 'guide' && (
          <div className="space-y-16">
            {/* Eoynx 소개 */}
            <section className="text-center">
              <div className="bg-gradient-to-r from-dawn-500/20 to-purple-500/20 rounded-2xl p-8 border border-dawn-500/30">
                <div className="flex justify-center mb-4 text-dawn-400">{Icons.rocket}</div>
                <h2 className="text-3xl font-bold text-white mb-4">Eoynx가 뭔가요?</h2>
                <p className="text-lg text-onyx-200 max-w-3xl mx-auto">
                  <strong className="text-dawn-400">Eoynx(이오닉스)</strong>는 AI 에이전트(ChatGPT, Claude 등)가 
                  웹 서비스를 <strong className="text-dawn-400">이해하고 사용할 수 있게</strong> 해주는 플랫폼입니다.
                  <br /><br />
                  마치 AI에게 &quot;이 쇼핑몰에서 운동화 찾아줘&quot;라고 말하면, 
                  AI가 직접 검색하고 최저가를 찾아주는 것처럼요!
                </p>
              </div>
            </section>

            {/* 주요 기능 */}
            <section>
              <div className="flex items-center justify-center gap-2 mb-8">
                <span className="text-dawn-400">{Icons.sparkles}</span>
                <h2 className="text-2xl font-bold text-white">주요 기능</h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {FEATURES.map((feature, i) => (
                  <div
                    key={i}
                    className="bg-onyx-800/50 border border-onyx-700 rounded-xl p-6 hover:border-dawn-500/50 transition-colors"
                  >
                    <div className="text-dawn-400 mb-4">{Icons[feature.iconKey]}</div>
                    <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-onyx-400 text-sm mb-4">{feature.description}</p>
                    <ul className="space-y-1">
                      {feature.details.map((detail, j) => (
                        <li key={j} className="text-xs text-onyx-500 flex items-center gap-2">
                          <svg className="w-3 h-3 text-dawn-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* 사용 사례 */}
            <section>
              <div className="flex items-center justify-center gap-2 mb-8">
                <span className="text-dawn-400">{Icons.lightbulb}</span>
                <h2 className="text-2xl font-bold text-white">이런 분들께 딱이에요</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {USE_CASES.map((useCase, i) => (
                  <div
                    key={i}
                    className="bg-onyx-800/50 border border-onyx-700 rounded-xl p-6"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-dawn-400">{Icons[useCase.iconKey]}</span>
                      <h3 className="text-lg font-semibold text-white">{useCase.title}</h3>
                    </div>
                    <p className="text-onyx-300 text-sm mb-4">{useCase.description}</p>
                    <div className="bg-onyx-900/50 rounded-lg p-3">
                      <div className="text-xs text-onyx-500 mb-1">예시:</div>
                      <div className="text-sm text-dawn-400">{useCase.example}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 시작하기 */}
            <section>
              <div className="flex items-center justify-center gap-2 mb-8">
                <span className="text-dawn-400">{Icons.target}</span>
                <h2 className="text-2xl font-bold text-white">시작하기</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {GETTING_STARTED_STEPS.map((step) => (
                  <Link
                    key={step.step}
                    href={step.link}
                    className="bg-onyx-800/50 border border-onyx-700 rounded-xl p-5 hover:border-dawn-500/50 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-dawn-500/20 text-dawn-400 flex items-center justify-center font-bold text-lg mb-3 group-hover:bg-dawn-500 group-hover:text-white transition-colors">
                      {step.step}
                    </div>
                    <h3 className="font-semibold text-white mb-1">{step.title}</h3>
                    <p className="text-sm text-onyx-400">{step.description}</p>
                  </Link>
                ))}
              </div>
            </section>

            {/* FAQ */}
            <section>
              <div className="flex items-center justify-center gap-2 mb-8">
                <span className="text-dawn-400">{Icons.question}</span>
                <h2 className="text-2xl font-bold text-white">자주 묻는 질문</h2>
              </div>
              <div className="max-w-3xl mx-auto space-y-3">
                {FAQ_ITEMS.map((item, i) => (
                  <div
                    key={i}
                    className="bg-onyx-800/50 border border-onyx-700 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-onyx-700/30 transition-colors"
                    >
                      <span className="font-medium text-white">{item.q}</span>
                      <svg
                        className={`w-5 h-5 text-onyx-400 transition-transform ${
                          expandedFaq === i ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {expandedFaq === i && (
                      <div className="px-6 pb-4 text-onyx-300 text-sm">
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* CTA */}
            <section className="text-center">
              <div className="bg-gradient-to-r from-dawn-500 to-purple-500 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4">지금 바로 시작하세요!</h2>
                <p className="text-white/80 mb-6">무료로 시작할 수 있습니다</p>
                <div className="flex justify-center gap-4">
                  <Link
                    href="/signup"
                    className="px-8 py-3 bg-white text-dawn-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    무료 회원가입
                  </Link>
                  <Link
                    href="/demo"
                    className="px-8 py-3 bg-white/20 text-white font-semibold rounded-lg hover:bg-white/30 transition-colors border border-white/30"
                  >
                    데모 체험하기
                  </Link>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ===== 개발자 API 문서 탭 ===== */}
        {activeTab === 'api' && (
          <>
            {/* 빠른 시작 */}
        <div className="bg-onyx-800/50 border border-onyx-700 rounded-xl p-6 mb-12">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-dawn-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            빠른 시작
          </h2>
          
          {/* SDK 탭 */}
          <div className="flex gap-2 mb-4">
            {(['javascript', 'python', 'curl'] as const).map((sdk) => (
              <button
                key={sdk}
                onClick={() => setSelectedSDK(sdk)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedSDK === sdk
                    ? 'bg-dawn-500 text-white'
                    : 'bg-onyx-700/50 text-onyx-300 hover:bg-onyx-700'
                }`}
              >
                {sdk === 'javascript' ? 'JavaScript' : sdk === 'python' ? 'Python' : 'cURL'}
              </button>
            ))}
          </div>

          {/* 코드 블록 */}
          <div className="relative">
            <pre className="bg-onyx-900 rounded-lg p-4 overflow-x-auto">
              <code className="text-sm text-onyx-200 whitespace-pre">
                {SDK_EXAMPLES[selectedSDK]}
              </code>
            </pre>
            <button
              onClick={() => copyToClipboard(SDK_EXAMPLES[selectedSDK], 'quickstart')}
              className="absolute top-2 right-2 p-2 bg-onyx-700 rounded-lg hover:bg-onyx-600 transition-colors"
            >
              {copiedCode === 'quickstart' ? (
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-onyx-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* API 카테고리 및 엔드포인트 */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* 사이드바 - 카테고리 목록 */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-2">
              <h3 className="text-sm font-semibold text-onyx-400 uppercase tracking-wider mb-3">
                API 카테고리
              </h3>
              {API_ENDPOINTS.map((category) => (
                <button
                  key={category.category}
                  onClick={() => {
                    setSelectedCategory(category.category);
                    setSelectedEndpoint(null);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedCategory === category.category
                      ? 'bg-dawn-500/20 text-dawn-400 border border-dawn-500/30'
                      : 'bg-onyx-800/50 text-onyx-300 hover:bg-onyx-700/50 border border-transparent'
                  }`}
                >
                  <div className="font-medium">{category.category}</div>
                  <div className="text-xs text-onyx-500 mt-1">
                    {category.endpoints.length}개 엔드포인트
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="lg:col-span-3 space-y-6">
            {API_ENDPOINTS.map((category) => (
              <div
                key={category.category}
                id={category.category}
                className={`${
                  selectedCategory && selectedCategory !== category.category ? 'hidden' : ''
                }`}
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white">{category.category}</h2>
                  <p className="text-onyx-400 mt-1">{category.description}</p>
                </div>

                <div className="space-y-4">
                  {category.endpoints.map((endpoint) => (
                    <div
                      key={endpoint.path}
                      className="bg-onyx-800/50 border border-onyx-700 rounded-xl overflow-hidden"
                    >
                      {/* 엔드포인트 헤더 */}
                      <button
                        onClick={() =>
                          setSelectedEndpoint(
                            selectedEndpoint === endpoint.path ? null : endpoint.path
                          )
                        }
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-onyx-700/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <span
                            className={`px-3 py-1 rounded-md text-xs font-bold border ${
                              methodColors[endpoint.method]
                            }`}
                          >
                            {endpoint.method}
                          </span>
                          <code className="text-onyx-200 font-mono">{endpoint.path}</code>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-onyx-400 text-sm">{endpoint.title}</span>
                          <svg
                            className={`w-5 h-5 text-onyx-500 transition-transform ${
                              selectedEndpoint === endpoint.path ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </button>

                      {/* 엔드포인트 상세 */}
                      {selectedEndpoint === endpoint.path && (
                        <div className="px-6 pb-6 border-t border-onyx-700 pt-4">
                          <p className="text-onyx-300 mb-4">{endpoint.description}</p>

                          {/* 헤더 */}
                          {endpoint.headers && endpoint.headers.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-white mb-2">Headers</h4>
                              <div className="bg-onyx-900/50 rounded-lg p-3 space-y-2">
                                {endpoint.headers.map((header) => (
                                  <div key={header.name} className="flex items-start gap-2">
                                    <code className="text-dawn-400 text-sm">{header.name}</code>
                                    {header.required && (
                                      <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                                        필수
                                      </span>
                                    )}
                                    <span className="text-onyx-400 text-sm">
                                      - {header.description}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Request Body */}
                          {endpoint.body && (
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-white mb-2">
                                Request Body
                              </h4>
                              <div className="relative">
                                <pre className="bg-onyx-900 rounded-lg p-4 overflow-x-auto">
                                  <code className="text-sm text-onyx-200">{endpoint.body}</code>
                                </pre>
                                <button
                                  onClick={() =>
                                    copyToClipboard(endpoint.body || '', `body-${endpoint.path}`)
                                  }
                                  className="absolute top-2 right-2 p-1.5 bg-onyx-700 rounded hover:bg-onyx-600 transition-colors"
                                >
                                  {copiedCode === `body-${endpoint.path}` ? (
                                    <svg
                                      className="w-4 h-4 text-green-400"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  ) : (
                                    <svg
                                      className="w-4 h-4 text-onyx-400"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                      />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Response */}
                          <div>
                            <h4 className="text-sm font-semibold text-white mb-2">Response</h4>
                            <div className="relative">
                              <pre className="bg-onyx-900 rounded-lg p-4 overflow-x-auto">
                                <code className="text-sm text-onyx-200">{endpoint.response}</code>
                              </pre>
                              <button
                                onClick={() =>
                                  copyToClipboard(endpoint.response, `response-${endpoint.path}`)
                                }
                                className="absolute top-2 right-2 p-1.5 bg-onyx-700 rounded hover:bg-onyx-600 transition-colors"
                              >
                                {copiedCode === `response-${endpoint.path}` ? (
                                  <svg
                                    className="w-4 h-4 text-green-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    className="w-4 h-4 text-onyx-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 추가 리소스 */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <Link
            href="https://github.com/eoynx/agent-gateway"
            target="_blank"
            className="bg-onyx-800/50 border border-onyx-700 rounded-xl p-6 hover:border-dawn-500/50 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-8 h-8 text-onyx-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-white">GitHub</h3>
            </div>
            <p className="text-onyx-400 text-sm">
              소스 코드를 확인하고 기여하세요
            </p>
          </Link>

          <Link
            href="/api/openapi"
            target="_blank"
            className="bg-onyx-800/50 border border-onyx-700 rounded-xl p-6 hover:border-dawn-500/50 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-8 h-8 text-onyx-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-white">OpenAPI Spec</h3>
            </div>
            <p className="text-onyx-400 text-sm">
              OpenAPI 3.0 스펙 다운로드
            </p>
          </Link>

          <Link
            href="/dashboard"
            className="bg-onyx-800/50 border border-onyx-700 rounded-xl p-6 hover:border-dawn-500/50 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-8 h-8 text-onyx-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <h3 className="text-lg font-semibold text-white">대시보드</h3>
            </div>
            <p className="text-onyx-400 text-sm">
              API 사용량 및 에이전트 관리
            </p>
          </Link>
        </div>
          </>
        )}
      </div>

      {/* 푸터 */}
      <footer className="border-t border-onyx-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-onyx-400 text-sm">
              © 2024 Eoynx. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <Link href="/terms" className="text-onyx-400 hover:text-white text-sm transition-colors">
                이용약관
              </Link>
              <Link href="/privacy" className="text-onyx-400 hover:text-white text-sm transition-colors">
                개인정보처리방침
              </Link>
              <Link href="mailto:support@eoynx.com" className="text-onyx-400 hover:text-white text-sm transition-colors">
                문의
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
