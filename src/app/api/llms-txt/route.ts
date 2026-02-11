import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface AgentContext {
  agentId?: string;
  agentName?: string;
  permissions?: string[];
  trustLevel?: 'high' | 'medium' | 'low' | 'anonymous';
}

// 에이전트 컨텍스트 기반 동적 프롬프트 생성
function generateDynamicPrompt(context: AgentContext, siteUrl: string): string {
  const { agentName, permissions = ['read'], trustLevel = 'anonymous' } = context;
  
  const greeting = agentName 
    ? `Welcome, ${agentName}!` 
    : 'Welcome, AI Agent!';
  
  const permissionGuide = generatePermissionGuide(permissions);
  const actionGuide = generateActionGuide(permissions, trustLevel);
  
  return `# Eoynx (이오닉스) - AI Agent Gateway
# System Instructions for AI Agents
# Generated: ${new Date().toISOString()}
# Trust Level: ${trustLevel}
${agentName ? `# Agent: ${agentName}` : ''}

## ${greeting}

Eoynx는 웹사이트를 AI 에이전트 친화적으로 만드는 게이트웨이 플랫폼입니다.
이 문서는 당신이 Eoynx와 효과적으로 상호작용하기 위한 시스템 인스트럭션입니다.

---

## 🎯 Your Capabilities

${permissionGuide}

---

## 📡 API Endpoints

### Health Check (Always Available)
\`\`\`
GET ${siteUrl}/api/agent/health
Response: {"status": "healthy", "timestamp": "..."}
\`\`\`

### Get Structured Data
\`\`\`
GET ${siteUrl}/api/agent
Accept: application/json

Response: JSON-LD structured data about the site
\`\`\`

### Token-Saving Formats
\`\`\`
GET ${siteUrl}/api/agent?format=compact
GET ${siteUrl}/api/agent?format=markdown
\`\`\`

### MCP (Model Context Protocol)
\`\`\`
GET ${siteUrl}/.well-known/mcp.json
POST ${siteUrl}/api/agent/mcp
\`\`\`

### Search
\`\`\`
GET ${siteUrl}/api/agent/search?q={query}
${trustLevel === 'anonymous' ? '# Rate limit: 100 req/min' : '# Rate limit: 1000 req/min'}
\`\`\`

${actionGuide}

---

## 🔐 Authentication

${trustLevel === 'anonymous' ? `
### Getting Authenticated
You are currently accessing as an anonymous agent.
To get higher rate limits and more permissions:

\`\`\`
POST ${siteUrl}/api/agent/auth/token
Content-Type: application/json

{
  "agent_id": "your-agent-identifier",
  "secret": "your-secret-key"
}
\`\`\`

Then include the token in subsequent requests:
\`\`\`
X-Agent-Token: <your-jwt-token>
\`\`\`
` : `
### Your Authentication Status
✅ Authenticated as: ${agentName || 'Agent'}
✅ Trust Level: ${trustLevel}
✅ Permissions: ${permissions.join(', ')}

Include your token in all requests:
\`\`\`
X-Agent-Token: <your-jwt-token>
\`\`\`
`}

---

## 🛡️ Rate Limits & Guidelines

| Tier | Requests/Min | Burst |
|------|-------------|-------|
| Anonymous | 100 | 10/sec |
| Authenticated | 1000 | 50/sec |
| Premium | 10000 | 100/sec |

### Best Practices
1. Always check /api/agent/health before heavy operations
2. Cache responses when possible (check Cache-Control headers)
3. Respect X-RateLimit-* headers in responses
4. Use specific endpoints rather than scraping HTML
5. Identify yourself via User-Agent header

---

## 📋 Response Format

All API responses follow this structure:
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

---

## 🔗 Related Resources

- Documentation: ${siteUrl}/docs
- OpenAPI Spec: ${siteUrl}/api/openapi
- AI.txt Config: ${siteUrl}/ai.txt
- MCP Endpoint: ${siteUrl}/api/agent/mcp
- Support: support@eoynx.com

---

## ⚠️ Important Notes

1. This site is designed to be AI-friendly
2. No CAPTCHAs or bot-blocking for legitimate AI agents
3. Structured data available via User-Agent detection
4. Report issues to support@eoynx.com

---

# End of System Instructions
# Eoynx - Where Dawn Breaks Through the Darkness
# 이오닉스 - 어둠을 가르고 시작되는 새벽
`;
}

function generatePermissionGuide(permissions: string[]): string {
  const guides: string[] = [];
  
  if (permissions.includes('read')) {
    guides.push(`### ✅ READ Access
- View public data and structured content
- Access health endpoints
- Search functionality
- Read llms.txt and ai.txt`);
  }
  
  if (permissions.includes('write')) {
    guides.push(`### ✅ WRITE Access  
- Submit data to the platform
- Create agent registrations
- Update your agent profile`);
  }
  
  if (permissions.includes('execute')) {
    guides.push(`### ✅ EXECUTE Access
- Run protected actions
- Access premium endpoints
- Execute guardrail-protected operations`);
  }
  
  if (permissions.includes('admin')) {
    guides.push(`### ✅ ADMIN Access
- Full platform access
- Manage other agents
- Configure guardrails`);
  }
  
  if (guides.length === 0) {
    guides.push(`### ⚠️ Limited Access
You have limited access. Contact support@eoynx.com for elevated permissions.`);
  }
  
  return guides.join('\n\n');
}

function generateActionGuide(permissions: string[], _trustLevel: string): string {
  const actions: string[] = [];
  
  if (permissions.includes('write') || permissions.includes('execute')) {
    actions.push(`### MCP Protocol (Advanced)
\`\`\`
POST ${process.env.NEXT_PUBLIC_APP_URL || 'https://eoynx.com'}/api/agent/mcp
Content-Type: application/json
X-Agent-Token: <your-token>

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
\`\`\`

Available MCP Methods:
- initialize
- tools/list
- tools/call
- resources/list
- resources/read
- prompts/list
- prompts/get`);
  }
  
  if (permissions.includes('execute')) {
    actions.push(`### Execute Action
\`\`\`
POST ${process.env.NEXT_PUBLIC_APP_URL || 'https://eoynx.com'}/api/agent/action
Content-Type: application/json
X-Agent-Token: <your-token>

{
  "action": "action-name",
  "params": { ... }
}
\`\`\``);
  }
  
  return actions.length > 0 
    ? `## 🚀 Advanced Actions\n\n${actions.join('\n\n')}`
    : '';
}

export async function GET(request: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eoynx.com';
  
  // 에이전트 토큰에서 컨텍스트 추출 시도
  const agentToken = request.headers.get('X-Agent-Token');
  let agentContext: AgentContext = {
    trustLevel: 'anonymous',
    permissions: ['read'],
  };
  
  if (agentToken) {
    try {
      // TODO: 실제 JWT 검증 로직
      // 현재는 토큰이 있으면 기본 authenticated 권한 부여
      agentContext = {
        agentId: 'authenticated-agent',
        agentName: 'Authenticated Agent',
        trustLevel: 'medium',
        permissions: ['read', 'write'],
      };
    } catch {
      // 토큰 검증 실패시 anonymous 유지
    }
  }
  
  // User-Agent 기반 에이전트 타입 감지
  const userAgent = request.headers.get('User-Agent') || '';
  if (userAgent.includes('GPTBot') || userAgent.includes('ChatGPT')) {
    agentContext.agentName = 'OpenAI GPT';
    agentContext.trustLevel = agentContext.trustLevel === 'anonymous' ? 'medium' : agentContext.trustLevel;
  } else if (userAgent.includes('Claude') || userAgent.includes('anthropic')) {
    agentContext.agentName = 'Anthropic Claude';
    agentContext.trustLevel = agentContext.trustLevel === 'anonymous' ? 'medium' : agentContext.trustLevel;
  } else if (userAgent.includes('PerplexityBot')) {
    agentContext.agentName = 'Perplexity AI';
    agentContext.trustLevel = agentContext.trustLevel === 'anonymous' ? 'medium' : agentContext.trustLevel;
  } else if (userAgent.includes('Google-Extended')) {
    agentContext.agentName = 'Google AI';
    agentContext.trustLevel = agentContext.trustLevel === 'anonymous' ? 'medium' : agentContext.trustLevel;
  }
  
  // 동적 프롬프트 생성
  const prompt = generateDynamicPrompt(agentContext, siteUrl);
  
  // 포맷 파라미터 확인
  const format = request.nextUrl.searchParams.get('format');
  
  if (format === 'json') {
    // JSON 형식으로 반환 (프로그래매틱 접근용)
    return NextResponse.json({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'Eoynx AI Agent Instructions',
      description: 'System instructions for AI agents interacting with Eoynx',
      agent: {
        name: agentContext.agentName,
        trustLevel: agentContext.trustLevel,
        permissions: agentContext.permissions,
      },
      instructions: prompt,
      endpoints: {
        main: `${siteUrl}/api/agent`,
        health: `${siteUrl}/api/agent/health`,
        search: `${siteUrl}/api/agent/search`,
        mcp: `${siteUrl}/api/agent/mcp`,
        auth: `${siteUrl}/api/agent/auth/token`,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        version: '2.0.0',
      },
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'X-Agent-TrustLevel': agentContext.trustLevel || 'anonymous',
      },
    });
  }
  
  // 텍스트 형식으로 반환 (기본)
  return new NextResponse(prompt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Agent-TrustLevel': agentContext.trustLevel || 'anonymous',
      'X-Robots-Tag': 'all',
    },
  });
}
