'use client';

import { useState } from 'react';

interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  title: string;
  description: string;
  headers?: { name: string; required: boolean; description: string }[];
  params?: { name: string; type: string; required: boolean; description: string }[];
  body?: { name: string; type: string; required: boolean; description: string }[];
  response: string;
  example?: { request?: string; response: string };
}

const API_ENDPOINTS: Record<string, APIEndpoint[]> = {
  'Core APIs': [
    {
      method: 'POST',
      path: '/api/agent',
      title: '에이전트 요청',
      description: 'AI 에이전트가 서비스에 요청을 보내는 메인 게이트웨이',
      headers: [
        { name: 'Authorization', required: true, description: 'Bearer {API_KEY}' },
        { name: 'X-Agent-ID', required: false, description: '에이전트 식별자' },
        { name: 'X-Provider', required: false, description: 'openai | anthropic | google | custom' },
      ],
      body: [
        { name: 'action', type: 'string', required: true, description: '수행할 액션 (search, extract, etc.)' },
        { name: 'params', type: 'object', required: false, description: '액션별 파라미터' },
      ],
      response: `{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "uuid",
    "processingTime": 123
  }
}`,
    },
    {
      method: 'GET',
      path: '/api/agent/search',
      title: '검색',
      description: '데이터 검색 API',
      headers: [
        { name: 'Authorization', required: true, description: 'Bearer {API_KEY}' },
      ],
      params: [
        { name: 'q', type: 'string', required: true, description: '검색 쿼리' },
        { name: 'category', type: 'string', required: false, description: '카테고리 필터' },
        { name: 'limit', type: 'number', required: false, description: '결과 수 제한 (기본: 10)' },
      ],
      response: `{
  "success": true,
  "data": {
    "results": [...],
    "total": 100,
    "page": 1
  }
}`,
    },
    {
      method: 'POST',
      path: '/api/agent/action',
      title: '액션 실행',
      description: '장바구니, 구매 등의 액션 실행',
      headers: [
        { name: 'Authorization', required: true, description: 'Bearer {API_KEY}' },
      ],
      body: [
        { name: 'action', type: 'string', required: true, description: 'add_to_cart | purchase | clear_cart | check_order' },
        { name: 'productId', type: 'string', required: false, description: '상품 ID (add_to_cart)' },
        { name: 'quantity', type: 'number', required: false, description: '수량 (기본: 1)' },
        { name: 'confirmed', type: 'boolean', required: false, description: '구매 확인 (purchase)' },
      ],
      response: `{
  "success": true,
  "data": {
    "message": "액션 완료",
    "nextSteps": [...]
  }
}`,
    },
  ],
  'MCP Protocol': [
    {
      method: 'POST',
      path: '/api/agent/mcp',
      title: 'MCP 요청',
      description: 'Model Context Protocol (JSON-RPC 2.0) 지원',
      headers: [
        { name: 'Authorization', required: true, description: 'Bearer {API_KEY}' },
        { name: 'Content-Type', required: true, description: 'application/json' },
      ],
      body: [
        { name: 'jsonrpc', type: 'string', required: true, description: '"2.0"' },
        { name: 'method', type: 'string', required: true, description: 'tools/list | tools/call | resources/list' },
        { name: 'params', type: 'object', required: false, description: '메서드별 파라미터' },
        { name: 'id', type: 'string | number', required: true, description: '요청 ID' },
      ],
      response: `{
  "jsonrpc": "2.0",
  "result": { ... },
  "id": 1
}`,
      example: {
        request: `{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}`,
        response: `{
  "jsonrpc": "2.0",
  "result": {
    "tools": [
      {
        "name": "search_products",
        "description": "상품 검색",
        "inputSchema": { ... }
      }
    ]
  },
  "id": 1
}`,
      },
    },
  ],
  'Authentication': [
    {
      method: 'POST',
      path: '/api/agent/auth/token',
      title: '토큰 발급',
      description: 'M2M 인증 토큰 발급',
      body: [
        { name: 'clientId', type: 'string', required: true, description: '클라이언트 ID' },
        { name: 'clientSecret', type: 'string', required: true, description: '클라이언트 시크릿' },
        { name: 'scope', type: 'string', required: false, description: '요청 스코프 (read write execute)' },
      ],
      response: `{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "tokenType": "Bearer",
    "expiresIn": 3600
  }
}`,
    },
  ],
  'Data Extraction': [
    {
      method: 'POST',
      path: '/api/agent/extract',
      title: '데이터 추출',
      description: 'URL에서 구조화된 데이터 추출',
      headers: [
        { name: 'Authorization', required: true, description: 'Bearer {API_KEY}' },
      ],
      body: [
        { name: 'url', type: 'string', required: true, description: '추출 대상 URL' },
        { name: 'selectors', type: 'object', required: false, description: 'CSS 셀렉터 지정' },
        { name: 'format', type: 'string', required: false, description: 'json | markdown | text' },
      ],
      response: `{
  "success": true,
  "data": {
    "title": "...",
    "content": "...",
    "metadata": { ... }
  }
}`,
    },
  ],
  'Reputation': [
    {
      method: 'GET',
      path: '/api/agent/reputation',
      title: '평판 조회',
      description: '에이전트 평판 점수 조회',
      params: [
        { name: 'agentId', type: 'string', required: true, description: '에이전트 ID' },
      ],
      response: `{
  "success": true,
  "data": {
    "score": 750,
    "level": "premium",
    "badges": [...],
    "permissions": ["read", "write", "execute"]
  }
}`,
    },
  ],
};

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('Core APIs');
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-green-500/20 text-green-400 border-green-500/30',
      POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      PUT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return colors[method] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  return (
    <div className="flex gap-6">
      {/* 사이드바 */}
      <div className="w-64 flex-shrink-0">
        <div className="sticky top-4 bg-onyx-900/50 border border-onyx-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-onyx-300 mb-3">API 섹션</h3>
          <nav className="space-y-1">
            {Object.keys(API_ENDPOINTS).map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === section
                    ? 'bg-dawn-500/20 text-dawn-400'
                    : 'text-onyx-400 hover:text-onyx-200 hover:bg-onyx-800'
                }`}
              >
                {section}
              </button>
            ))}
          </nav>
          
          <div className="mt-6 pt-4 border-t border-onyx-800">
            <h3 className="text-sm font-semibold text-onyx-300 mb-3">외부 링크</h3>
            <div className="space-y-2">
              <a
                href="/api/openapi"
                target="_blank"
                className="flex items-center gap-2 text-sm text-onyx-400 hover:text-dawn-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                OpenAPI Spec
              </a>
              <a
                href="/ai.txt"
                target="_blank"
                className="flex items-center gap-2 text-sm text-onyx-400 hover:text-dawn-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                ai.txt
              </a>
              <a
                href="/llms.txt"
                target="_blank"
                className="flex items-center gap-2 text-sm text-onyx-400 hover:text-dawn-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                llms.txt
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 space-y-6">
        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold text-onyx-100 flex items-center gap-2">
            <svg className="w-7 h-7 text-dawn-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            API 문서
          </h1>
          <p className="mt-1 text-sm text-onyx-400">
            Eoynx Agent Gateway API 레퍼런스
          </p>
        </div>

        {/* 시작하기 */}
        <div className="bg-gradient-to-r from-dawn-500/10 to-purple-500/10 border border-dawn-500/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-onyx-100 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-dawn-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            빠른 시작
          </h2>
          <div className="space-y-3 text-sm text-onyx-300">
            <p>1. 대시보드에서 에이전트를 등록하고 API 키를 발급받습니다.</p>
            <p>2. 요청 헤더에 <code className="px-2 py-1 bg-onyx-800 rounded">Authorization: Bearer YOUR_API_KEY</code>를 추가합니다.</p>
            <p>3. 아래 엔드포인트를 사용하여 API를 호출합니다.</p>
          </div>
          <div className="mt-4 p-4 bg-onyx-900/50 rounded-lg">
            <pre className="text-sm text-onyx-300 font-mono overflow-x-auto">{`curl -X POST https://eoynx.com/api/agent/search \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"q": "검색어"}'`}</pre>
          </div>
        </div>

        {/* API 엔드포인트 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-onyx-100">{activeSection}</h2>
          
          {API_ENDPOINTS[activeSection]?.map((endpoint) => (
            <div
              key={endpoint.path}
              className="bg-onyx-900/50 border border-onyx-800 rounded-xl overflow-hidden"
            >
              {/* 헤더 */}
              <button
                onClick={() => setExpandedEndpoint(
                  expandedEndpoint === endpoint.path ? null : endpoint.path
                )}
                className="w-full p-4 flex items-center justify-between hover:bg-onyx-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded border text-xs font-mono ${getMethodColor(endpoint.method)}`}>
                    {endpoint.method}
                  </span>
                  <code className="text-onyx-200 text-sm font-mono">{endpoint.path}</code>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-onyx-400 text-sm">{endpoint.title}</span>
                  <svg
                    className={`w-5 h-5 text-onyx-500 transition-transform ${
                      expandedEndpoint === endpoint.path ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* 상세 정보 */}
              {expandedEndpoint === endpoint.path && (
                <div className="border-t border-onyx-800 p-4 space-y-4">
                  <p className="text-onyx-300">{endpoint.description}</p>

                  {/* Headers */}
                  {endpoint.headers && endpoint.headers.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-onyx-200 mb-2">Headers</h4>
                      <div className="bg-onyx-800/50 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-onyx-800">
                            <tr>
                              <th className="px-3 py-2 text-left text-onyx-400">이름</th>
                              <th className="px-3 py-2 text-left text-onyx-400">필수</th>
                              <th className="px-3 py-2 text-left text-onyx-400">설명</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-onyx-700">
                            {endpoint.headers.map((header) => (
                              <tr key={header.name}>
                                <td className="px-3 py-2 font-mono text-dawn-400">{header.name}</td>
                                <td className="px-3 py-2">
                                  {header.required ? (
                                    <span className="text-red-400">필수</span>
                                  ) : (
                                    <span className="text-onyx-500">선택</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-onyx-300">{header.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Query Params */}
                  {endpoint.params && endpoint.params.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-onyx-200 mb-2">Query Parameters</h4>
                      <div className="bg-onyx-800/50 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-onyx-800">
                            <tr>
                              <th className="px-3 py-2 text-left text-onyx-400">이름</th>
                              <th className="px-3 py-2 text-left text-onyx-400">타입</th>
                              <th className="px-3 py-2 text-left text-onyx-400">필수</th>
                              <th className="px-3 py-2 text-left text-onyx-400">설명</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-onyx-700">
                            {endpoint.params.map((param) => (
                              <tr key={param.name}>
                                <td className="px-3 py-2 font-mono text-dawn-400">{param.name}</td>
                                <td className="px-3 py-2 font-mono text-purple-400">{param.type}</td>
                                <td className="px-3 py-2">
                                  {param.required ? (
                                    <span className="text-red-400">필수</span>
                                  ) : (
                                    <span className="text-onyx-500">선택</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-onyx-300">{param.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Request Body */}
                  {endpoint.body && endpoint.body.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-onyx-200 mb-2">Request Body</h4>
                      <div className="bg-onyx-800/50 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-onyx-800">
                            <tr>
                              <th className="px-3 py-2 text-left text-onyx-400">필드</th>
                              <th className="px-3 py-2 text-left text-onyx-400">타입</th>
                              <th className="px-3 py-2 text-left text-onyx-400">필수</th>
                              <th className="px-3 py-2 text-left text-onyx-400">설명</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-onyx-700">
                            {endpoint.body.map((field) => (
                              <tr key={field.name}>
                                <td className="px-3 py-2 font-mono text-dawn-400">{field.name}</td>
                                <td className="px-3 py-2 font-mono text-purple-400">{field.type}</td>
                                <td className="px-3 py-2">
                                  {field.required ? (
                                    <span className="text-red-400">필수</span>
                                  ) : (
                                    <span className="text-onyx-500">선택</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-onyx-300">{field.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Response */}
                  <div>
                    <h4 className="text-sm font-semibold text-onyx-200 mb-2">Response</h4>
                    <pre className="p-4 bg-onyx-800/50 rounded-lg text-sm font-mono text-onyx-300 overflow-x-auto">
                      {endpoint.response}
                    </pre>
                  </div>

                  {/* Example */}
                  {endpoint.example && (
                    <div>
                      <h4 className="text-sm font-semibold text-onyx-200 mb-2">예제</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {endpoint.example.request && (
                          <div>
                            <span className="text-xs text-onyx-500 mb-1 block">Request</span>
                            <pre className="p-4 bg-onyx-800/50 rounded-lg text-sm font-mono text-onyx-300 overflow-x-auto">
                              {endpoint.example.request}
                            </pre>
                          </div>
                        )}
                        <div>
                          <span className="text-xs text-onyx-500 mb-1 block">Response</span>
                          <pre className="p-4 bg-onyx-800/50 rounded-lg text-sm font-mono text-onyx-300 overflow-x-auto">
                            {endpoint.example.response}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 에러 코드 */}
        <div className="bg-onyx-900/50 border border-onyx-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-onyx-100 mb-4">에러 코드</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <code className="text-red-400">400</code>
                <span className="text-onyx-400">잘못된 요청</span>
              </div>
              <div className="flex justify-between">
                <code className="text-red-400">401</code>
                <span className="text-onyx-400">인증 실패</span>
              </div>
              <div className="flex justify-between">
                <code className="text-red-400">403</code>
                <span className="text-onyx-400">권한 없음</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <code className="text-red-400">404</code>
                <span className="text-onyx-400">리소스 없음</span>
              </div>
              <div className="flex justify-between">
                <code className="text-red-400">429</code>
                <span className="text-onyx-400">Rate Limit 초과</span>
              </div>
              <div className="flex justify-between">
                <code className="text-red-400">500</code>
                <span className="text-onyx-400">서버 오류</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
