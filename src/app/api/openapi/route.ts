/**
 * OpenAPI 3.1 스펙 자동 생성
 * AI 에이전트와 개발자 모두를 위한 API 문서
 */

import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const openApiSpec = {
    openapi: '3.1.0',
    info: {
      title: 'Agent-Gateway API',
      description: 'AI 에이전트를 위한 구조화된 웹 데이터 및 액션 게이트웨이',
      version: '1.0.0',
      contact: {
        name: 'Agent-Gateway Support',
        url: 'https://agent-gateway.dev',
        email: 'support@agent-gateway.dev',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'https://api.agent-gateway.dev',
        description: 'Production server',
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'Discovery', description: '서비스 검색 및 탐색' },
      { name: 'Gateway', description: '메인 게이트웨이 API' },
      { name: 'Authentication', description: '인증 및 토큰 관리' },
      { name: 'Actions', description: '액션 실행' },
      { name: 'MCP', description: 'Model Context Protocol' },
      { name: 'Streaming', description: '실시간 이벤트 스트림' },
      { name: 'Governance', description: '권한 및 평판 관리' },
    ],
    paths: {
      // Discovery Layer
      '/api/ai-manifest.json': {
        get: {
          tags: ['Discovery'],
          summary: 'AI 매니페스트 조회',
          description: 'AI 에이전트를 위한 사이트 설명서. 모든 기능, 제약사항, 사용법을 포함합니다.',
          operationId: 'getAiManifest',
          responses: {
            '200': {
              description: 'AI 매니페스트',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AiManifest' },
                },
              },
            },
          },
        },
      },
      '/api/agent/search': {
        get: {
          tags: ['Discovery'],
          summary: '사이트 내 검색',
          description: 'AI 친화적인 검색 결과를 JSON-LD 형식으로 반환합니다.',
          operationId: 'searchSite',
          parameters: [
            {
              name: 'q',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              description: '검색 쿼리',
            },
            {
              name: 'type',
              in: 'query',
              schema: { type: 'string', enum: ['product', 'article', 'page', 'all'] },
              description: '검색 대상 유형',
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 10, maximum: 50 },
              description: '결과 수 제한',
            },
          ],
          responses: {
            '200': {
              description: '검색 결과',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SearchResults' },
                },
              },
            },
          },
        },
      },

      // Main Gateway
      '/api/agent': {
        get: {
          tags: ['Gateway'],
          summary: '사이트 컨텍스트 조회',
          description: '현재 사이트의 구조화된 데이터, 사용 가능한 액션, 시스템 프롬프트를 반환합니다.',
          operationId: 'getSiteContext',
          security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'url',
              in: 'query',
              schema: { type: 'string', format: 'uri' },
              description: '분석할 페이지 URL',
            },
          ],
          responses: {
            '200': {
              description: '사이트 컨텍스트',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AgentGatewayResponse' },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '429': { $ref: '#/components/responses/RateLimited' },
          },
        },
        post: {
          tags: ['Gateway'],
          summary: '액션 실행',
          description: '지정된 액션을 실행합니다. 일부 액션은 사용자 확인이 필요합니다.',
          operationId: 'executeAction',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ActionRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: '액션 실행 결과',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ActionResponse' },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
          },
        },
      },

      // Authentication
      '/api/agent/auth/token': {
        post: {
          tags: ['Authentication'],
          summary: '액세스 토큰 발급',
          description: 'M2M(Machine-to-Machine) 인증용 액세스 토큰을 발급합니다.',
          operationId: 'issueToken',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TokenRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: '토큰 발급 성공',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/TokenResponse' },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },

      // Actions
      '/api/agent/action': {
        post: {
          tags: ['Actions'],
          summary: '단일 액션 실행',
          description: '특정 액션을 실행하고 결과를 반환합니다.',
          operationId: 'executeSingleAction',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SingleActionRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: '실행 결과',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ActionResult' },
                },
              },
            },
          },
        },
      },
      '/api/agent/sandbox': {
        post: {
          tags: ['Actions'],
          summary: '샌드박스에서 시뮬레이션',
          description: '실제 실행 전에 액션의 결과를 시뮬레이션합니다.',
          operationId: 'simulateAction',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SimulationRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: '시뮬레이션 결과',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SimulationResult' },
                },
              },
            },
          },
        },
      },

      // MCP
      '/api/agent/mcp': {
        get: {
          tags: ['MCP'],
          summary: 'MCP 서버 정보',
          description: 'Model Context Protocol 서버 정보와 사용 가능한 도구 목록을 반환합니다.',
          operationId: 'getMcpInfo',
          responses: {
            '200': {
              description: 'MCP 서버 정보',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/McpServerInfo' },
                },
              },
            },
          },
        },
        post: {
          tags: ['MCP'],
          summary: 'MCP JSON-RPC 요청',
          description: 'JSON-RPC 2.0 형식의 MCP 요청을 처리합니다.',
          operationId: 'mcpJsonRpc',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/JsonRpcRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'JSON-RPC 응답',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/JsonRpcResponse' },
                },
              },
            },
          },
        },
      },

      // Streaming
      '/api/agent/stream': {
        get: {
          tags: ['Streaming'],
          summary: '실시간 이벤트 스트림',
          description: 'SSE(Server-Sent Events)를 통해 실시간 이벤트를 수신합니다.',
          operationId: 'subscribeEvents',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'events',
              in: 'query',
              schema: { type: 'string' },
              description: '구독할 이벤트 유형 (comma-separated)',
              example: 'price_update,stock_update',
            },
            {
              name: 'productIds',
              in: 'query',
              schema: { type: 'string' },
              description: '모니터링할 상품 ID (comma-separated)',
            },
          ],
          responses: {
            '200': {
              description: 'SSE 스트림',
              content: {
                'text/event-stream': {
                  schema: { type: 'string' },
                },
              },
            },
          },
        },
      },

      // Governance
      '/api/agent/reputation': {
        get: {
          tags: ['Governance'],
          summary: '에이전트 평판 조회',
          description: '특정 에이전트의 평판 점수와 권한을 조회합니다.',
          operationId: 'getReputation',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'agentId',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              description: '에이전트 ID',
            },
          ],
          responses: {
            '200': {
              description: '평판 정보',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ReputationInfo' },
                },
              },
            },
          },
        },
        post: {
          tags: ['Governance'],
          summary: '평판 이벤트 기록',
          description: '에이전트의 평판에 영향을 미치는 이벤트를 기록합니다.',
          operationId: 'recordReputationEvent',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ReputationEvent' },
              },
            },
          },
          responses: {
            '200': {
              description: '업데이트된 평판 정보',
            },
          },
        },
      },

      // Health
      '/api/agent/health': {
        get: {
          tags: ['Gateway'],
          summary: '헬스 체크',
          description: 'API 서버 상태를 확인합니다.',
          operationId: 'healthCheck',
          responses: {
            '200': {
              description: '정상',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthStatus' },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'M2M JWT 토큰',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Agent-Key',
          description: '에이전트 API 키',
        },
      },
      responses: {
        Unauthorized: {
          description: '인증 필요',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        Forbidden: {
          description: '권한 없음',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        RateLimited: {
          description: '요청 제한 초과',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'string' },
          },
        },
        AiManifest: {
          type: 'object',
          properties: {
            version: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            endpoints: { type: 'array' },
            actions: { type: 'array' },
            constraints: { type: 'object' },
          },
        },
        SearchResults: {
          type: 'object',
          properties: {
            '@context': { type: 'string' },
            '@type': { type: 'string' },
            query: { type: 'string' },
            results: { type: 'array' },
            totalResults: { type: 'integer' },
          },
        },
        AgentGatewayResponse: {
          type: 'object',
          properties: {
            siteContext: { type: 'object' },
            availableActions: { type: 'array' },
            contextBriefing: { type: 'string' },
            suggestedPrompt: { type: 'string' },
          },
        },
        ActionRequest: {
          type: 'object',
          properties: {
            action: { type: 'string' },
            params: { type: 'object' },
            confirmed: { type: 'boolean' },
          },
          required: ['action'],
        },
        ActionResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            result: { type: 'object' },
            message: { type: 'string' },
          },
        },
        TokenRequest: {
          type: 'object',
          properties: {
            agentId: { type: 'string' },
            agentName: { type: 'string' },
            provider: { type: 'string' },
          },
          required: ['agentId', 'agentName', 'provider'],
        },
        TokenResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' },
            permissions: { type: 'array' },
          },
        },
        SingleActionRequest: {
          type: 'object',
          properties: {
            actionId: { type: 'string' },
            parameters: { type: 'object' },
          },
          required: ['actionId'],
        },
        ActionResult: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['success', 'failed', 'pending_confirmation'] },
            data: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        SimulationRequest: {
          type: 'object',
          properties: {
            action: { type: 'string' },
            params: { type: 'object' },
          },
        },
        SimulationResult: {
          type: 'object',
          properties: {
            predictedOutcome: { type: 'object' },
            sideEffects: { type: 'array' },
            costEstimate: { type: 'object' },
            confidence: { type: 'number' },
          },
        },
        McpServerInfo: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            protocolVersion: { type: 'string' },
            capabilities: { type: 'object' },
          },
        },
        JsonRpcRequest: {
          type: 'object',
          properties: {
            jsonrpc: { type: 'string', const: '2.0' },
            id: { oneOf: [{ type: 'string' }, { type: 'number' }] },
            method: { type: 'string' },
            params: { type: 'object' },
          },
          required: ['jsonrpc', 'id', 'method'],
        },
        JsonRpcResponse: {
          type: 'object',
          properties: {
            jsonrpc: { type: 'string', const: '2.0' },
            id: { oneOf: [{ type: 'string' }, { type: 'number' }] },
            result: { type: 'object' },
            error: { type: 'object' },
          },
        },
        ReputationInfo: {
          type: 'object',
          properties: {
            agentId: { type: 'string' },
            score: { type: 'integer', minimum: 0, maximum: 1000 },
            level: { type: 'string', enum: ['new', 'basic', 'trusted', 'verified', 'elite'] },
            permissions: { type: 'array' },
            badges: { type: 'array' },
          },
        },
        ReputationEvent: {
          type: 'object',
          properties: {
            agentId: { type: 'string' },
            eventType: { type: 'string' },
            impact: { type: 'integer' },
          },
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            version: { type: 'string' },
          },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
