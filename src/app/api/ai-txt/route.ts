import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface AgentContext {
  agentId?: string;
  agentName?: string;
  permissions?: string[];
  trustLevel?: 'high' | 'medium' | 'low' | 'anonymous';
  authenticated?: boolean;
}

// AI 봇 User-Agent 패턴
const AI_BOT_PATTERNS: Record<string, string> = {
  'gptbot': 'OpenAI GPT',
  'chatgpt': 'ChatGPT',
  'openai': 'OpenAI',
  'claude': 'Anthropic Claude',
  'anthropic': 'Anthropic',
  'perplexity': 'Perplexity AI',
  'google-extended': 'Google AI',
  'bingbot': 'Microsoft Bing',
  'cohere': 'Cohere AI',
  'meta-external': 'Meta AI',
};

function detectAgentFromUserAgent(userAgent: string): string | null {
  const ua = userAgent.toLowerCase();
  for (const [pattern, name] of Object.entries(AI_BOT_PATTERNS)) {
    if (ua.includes(pattern)) {
      return name;
    }
  }
  return null;
}

function generateAiTxt(context: AgentContext, siteUrl: string, systemStatus: Record<string, string>): string {
  const { agentName, permissions = ['read'], trustLevel = 'anonymous', authenticated = false } = context;
  const timestamp = new Date().toISOString();
  
  return `# =============================================================================
# Eoynx AI Interaction Specification (ai.txt)
# Version: 2.0.0
# Generated: ${timestamp}
# Trust Level: ${trustLevel}
${agentName ? `# Agent: ${agentName}` : '# Agent: Anonymous'}
# =============================================================================

[System.Context]
Name: Eoynx Agent Gateway
Name_KO: 이오닉스
Description: AI 에이전트를 위한 통합 데이터 액세스 및 액션 실행 레이어.
Tagline: 어둠을 가르고 시작되는 새벽 (Where Dawn Breaks Through)
Homepage: ${siteUrl}
Documentation: ${siteUrl}/docs
Contact: support@eoynx.com

[System.Status]
Gateway: ${systemStatus.gateway || 'operational'}
API: ${systemStatus.api || 'operational'}
Database: ${systemStatus.database || 'operational'}
MCP: ${systemStatus.mcp || 'operational'}
LastCheck: ${timestamp}

[System.Capabilities]
- Web_Parsing: 구조화된 웹 데이터 제공 (JSON-LD, Schema.org)
- Agent_Auth: M2M(Machine-to-Machine) 전용 인증 관리
- MCP_Server: Model Context Protocol 기반의 컨텍스트 서빙
- Guardrail: 에이전트 권한 및 액션 제어
- Dynamic_Prompt: 에이전트별 맞춤 시스템 프롬프트

[Your.Access]
Agent: ${agentName || 'Anonymous'}
Authenticated: ${authenticated ? 'Yes' : 'No'}
TrustLevel: ${trustLevel}
Permissions: ${permissions.join(', ')}
RateLimit: ${trustLevel === 'anonymous' ? '100/min' : trustLevel === 'low' ? '300/min' : trustLevel === 'medium' ? '1000/min' : '10000/min'}

# =============================================================================
# API ENDPOINTS
# =============================================================================

[API.Endpoints]

## 1. 메인 엔드포인트 (Main)
Endpoint: GET ${siteUrl}/api/agent
Description: 사이트의 구조화된 데이터를 JSON-LD 형식으로 반환합니다.
Auth: Optional
Response: application/json (JSON-LD)

## 1-1. 토큰 절약 포맷 (Compact)
Endpoint: GET ${siteUrl}/api/agent?format=compact
Description: 필드 중심의 압축 JSON 응답을 반환합니다.
Auth: Optional

## 1-2. 토큰 절약 포맷 (Markdown)
Endpoint: GET ${siteUrl}/api/agent?format=markdown
Description: 압축된 마크다운 응답을 반환합니다.
Auth: Optional

## 2. 헬스 체크 (Health Check)
Endpoint: GET ${siteUrl}/api/agent/health
Description: 게이트웨이 및 연결된 서비스의 상태를 확인합니다.
Auth: Not Required
Response: {"status": "healthy", "services": {...}}

## 2-1. MCP 메타데이터
Endpoint: GET ${siteUrl}/.well-known/mcp.json
Description: MCP 서버 메타데이터를 제공합니다.
Auth: Not Required

## 2-2. MCP JSON-RPC
Endpoint: POST ${siteUrl}/api/agent/mcp
Description: MCP 도구 호출을 위한 JSON-RPC 엔드포인트
Auth: Optional

## 3. 검색 (Search)
Endpoint: GET ${siteUrl}/api/agent/search
Description: Eoynx 인덱스 내의 데이터를 검색합니다.
Parameters:
  - q (string, required): 검색어
  - limit (int, optional): 결과 수 제한 (default: 10)
  - format (string, optional): json | markdown (default: json)
Auth: Optional (인증시 더 많은 결과)
Example: GET ${siteUrl}/api/agent/search?q=authentication&limit=5

## 4. 컨텍스트 조회 (Context)
Endpoint: GET ${siteUrl}/api/agent/context
Description: 특정 URL의 컨텍스트 정보를 조회합니다.
Parameters:
  - url (string, required): 분석할 URL
Auth: ${permissions.includes('read') ? 'Available' : 'Requires Authentication'}

## 5. 토큰 발급 (Authentication)
Endpoint: POST ${siteUrl}/api/agent/auth/token
Description: 에이전트 인증 토큰을 발급합니다.
Body: {"agent_id": "your-id", "secret": "your-secret"}
Response: {"token": "jwt-token", "expires_in": 3600}

## 6. 토큰 검증 (Verify)
Endpoint: GET ${siteUrl}/api/agent/auth/verify
Description: 현재 토큰의 유효성을 확인합니다.
Header: X-Agent-Token: <your-token>

${permissions.includes('execute') ? `## 7. 액션 실행 (Execute) - 권한 있음
Endpoint: POST ${siteUrl}/api/agent/action
Description: 보호된 액션을 실행합니다.
Auth: Required (X-Agent-Token)
Body: {"action": "action-name", "params": {...}}` : `## 7. 액션 실행 (Execute) - 권한 없음
Note: execute 권한이 필요합니다. 대시보드에서 권한을 요청하세요.`}

## 8. MCP 프로토콜 (Model Context Protocol)
Endpoint: POST ${siteUrl}/api/agent/mcp
Description: MCP JSON-RPC 요청을 처리합니다.
Auth: ${permissions.includes('write') ? 'Available' : 'Optional'}
Protocol: JSON-RPC 2.0
Methods: initialize, tools/list, tools/call, resources/list, resources/read

# =============================================================================
# AUTHENTICATION
# =============================================================================

[Authentication.Policy]
Type: JWT Bearer Token
Header: X-Agent-Token
AlternateHeader: Authorization: Bearer <token>
TokenEndpoint: POST ${siteUrl}/api/agent/auth/token
TokenExpiry: 3600 seconds (1 hour)
RefreshEndpoint: POST ${siteUrl}/api/agent/auth/refresh

[Authentication.Flow]
1. POST /api/agent/auth/token with {"agent_id": "...", "secret": "..."}
2. Receive {"token": "jwt-token", "expires_in": 3600}
3. Include token in subsequent requests: X-Agent-Token: <token>
4. Token auto-refreshes on valid requests

# =============================================================================
# RESPONSE STANDARDS
# =============================================================================

[Response.Standards]
Format: application/json
Encoding: UTF-8
SuccessCode: 200, 201
ErrorCodes: 400, 401, 403, 404, 429, 500

[Response.Structure]
\`\`\`json
{
  "@context": "https://schema.org",
  "@type": "...",
  "data": { ... },
  "meta": {
    "timestamp": "ISO-8601",
    "requestId": "uuid",
    "rateLimit": {
      "remaining": 99,
      "reset": "ISO-8601"
    }
  }
}
\`\`\`

[Response.RateLimitHeaders]
X-RateLimit-Limit: 요청 제한
X-RateLimit-Remaining: 남은 요청 수
X-RateLimit-Reset: 리셋 시간 (Unix timestamp)

# =============================================================================
# ACTION RULES
# =============================================================================

[Action.Rules]
- User-Agent 헤더에 에이전트 식별자를 포함해야 합니다.
- POST 요청시 Content-Type: application/json을 사용하세요.
- 모든 요청에 Accept: application/json을 권장합니다.
- Rate Limit 초과시 Retry-After 헤더를 참조하세요.

[Action.BestPractices]
1. 먼저 /api/agent/health로 서비스 상태를 확인하세요.
2. 응답의 Cache-Control 헤더를 확인하고 캐싱하세요.
3. X-RateLimit-* 헤더를 모니터링하세요.
4. HTML 스크래핑 대신 전용 API를 사용하세요.
5. 에러 발생시 지수 백오프를 적용하세요.

# =============================================================================
# RELATED RESOURCES
# =============================================================================

[Resources]
LLMs.txt: ${siteUrl}/llms.txt
AI.txt: ${siteUrl}/ai.txt
Documentation: ${siteUrl}/docs
OpenAPI: ${siteUrl}/api/openapi
Dashboard: ${siteUrl}/dashboard
Support: support@eoynx.com
Security: security@eoynx.com

# =============================================================================
# AI POLICY
# =============================================================================

[AI.Policy]
Welcome: AI 에이전트를 환영합니다!
Training: 본 사이트의 공개 데이터는 AI 학습에 사용될 수 있습니다.
Crawling: 적절한 User-Agent 식별과 Rate Limit 준수를 요청합니다.
CAPTCHA: AI 에이전트에 대한 CAPTCHA 없음
Blocking: 악의적 행위가 아닌 한 AI 봇을 차단하지 않습니다.

# =============================================================================
# End of Specification
# Eoynx - Where Dawn Breaks Through the Darkness
# 이오닉스 - 어둠을 가르고 시작되는 새벽
# =============================================================================
`;
}

export async function GET(request: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eoynx.com';
  
  // 에이전트 토큰에서 컨텍스트 추출
  const agentToken = request.headers.get('X-Agent-Token');
  let agentContext: AgentContext = {
    trustLevel: 'anonymous',
    permissions: ['read'],
    authenticated: false,
  };
  
  if (agentToken) {
    try {
      // TODO: 실제 JWT 검증 및 DB 조회
      agentContext = {
        agentId: 'authenticated-agent',
        agentName: 'Authenticated Agent',
        trustLevel: 'medium',
        permissions: ['read', 'write'],
        authenticated: true,
      };
    } catch {
      // 토큰 검증 실패시 anonymous 유지
    }
  }
  
  // User-Agent 기반 에이전트 감지
  const userAgent = request.headers.get('User-Agent') || '';
  const detectedAgent = detectAgentFromUserAgent(userAgent);
  if (detectedAgent) {
    agentContext.agentName = detectedAgent;
    if (agentContext.trustLevel === 'anonymous') {
      agentContext.trustLevel = 'medium'; // 알려진 AI 봇은 medium으로 승격
    }
  }
  
  // 시스템 상태 (실제로는 헬스체크 API 호출)
  const systemStatus = {
    gateway: 'operational',
    api: 'operational',
    database: 'operational',
    mcp: 'operational',
  };
  
  // 동적 ai.txt 생성
  const aiTxt = generateAiTxt(agentContext, siteUrl, systemStatus);
  
  // 포맷 파라미터 확인
  const format = request.nextUrl.searchParams.get('format');
  
  if (format === 'json') {
    return NextResponse.json({
      '@context': 'https://schema.org',
      '@type': 'APIReference',
      name: 'Eoynx AI Interaction Specification',
      version: '2.0.0',
      agent: {
        name: agentContext.agentName || 'Anonymous',
        authenticated: agentContext.authenticated,
        trustLevel: agentContext.trustLevel,
        permissions: agentContext.permissions,
      },
      system: {
        name: 'Eoynx Agent Gateway',
        status: systemStatus,
        capabilities: ['Web_Parsing', 'Agent_Auth', 'MCP_Server', 'Guardrail', 'Dynamic_Prompt'],
      },
      endpoints: {
        main: `${siteUrl}/api/agent`,
        health: `${siteUrl}/api/agent/health`,
        search: `${siteUrl}/api/agent/search`,
        context: `${siteUrl}/api/agent/context`,
        auth: `${siteUrl}/api/agent/auth/token`,
        mcp: `${siteUrl}/api/agent/mcp`,
        action: `${siteUrl}/api/agent/action`,
      },
      resources: {
        llmsTxt: `${siteUrl}/llms.txt`,
        aiTxt: `${siteUrl}/ai.txt`,
        documentation: `${siteUrl}/docs`,
        openapi: `${siteUrl}/api/openapi`,
      },
      meta: {
        generatedAt: new Date().toISOString(),
      },
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'X-Agent-TrustLevel': agentContext.trustLevel || 'anonymous',
      },
    });
  }
  
  // 텍스트 형식으로 반환 (기본)
  return new NextResponse(aiTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Agent-TrustLevel': agentContext.trustLevel || 'anonymous',
      'X-Robots-Tag': 'all',
    },
  });
}
