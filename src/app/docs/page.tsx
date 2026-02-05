'use client';

import { useState } from 'react';
import Link from 'next/link';

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
            <span className="text-onyx-400 text-sm">API 문서</span>
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
        {/* 헤더 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">API 문서</h1>
          <p className="text-onyx-400 max-w-2xl mx-auto">
            Agent Gateway API를 통해 AI 에이전트와 웹 서비스를 연결하세요.
            REST API와 SDK를 지원합니다.
          </p>
        </div>

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
