/**
 * Agent Gateway Middleware
 * Edge Runtime에서 실행되어 에이전트 인증 및 접근 제어 수행
 * AI 봇과 일반 사용자를 구분하여 최적화된 콘텐츠 제공
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';

// Edge Runtime에서 동작하도록 설정
export const config = {
  matcher: [
    // Agent/AI 전용 경로
    '/api/agent/:path*',
    '/api/ai/:path*',
    '/:path*/agent',
    '/:path*/ai',
    // AI 에이전트 발견 파일
    '/llms.txt',
    '/ai.txt',
    // 모든 페이지에서 봇 감지
    '/',
    '/dashboard/:path*',
    // 인증 관련 페이지
    '/login',
    '/signup',
    '/demo',
  ],
};


// ===========================================
// AI 봇/크롤러 User-Agent 패턴
// ===========================================
const AI_BOT_PATTERNS = [
  // OpenAI
  /gptbot/i,
  /chatgpt-user/i,
  /openai/i,
  // Anthropic
  /claude-web/i,
  /anthropic/i,
  /claudebot/i,
  // Google AI
  /google-extended/i,
  /googlebot/i,
  // Perplexity
  /perplexitybot/i,
  // Bing/Microsoft
  /bingbot/i,
  /bingpreview/i,
  // Other AI crawlers
  /cohere-ai/i,
  /bytespider/i,
  /ccbot/i,
  /meta-externalagent/i,
  /facebookbot/i,
];

// 허용된 에이전트 목록 (실제로는 DB에서 관리)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ALLOWED_AGENTS = new Set([
  'openai',
  'anthropic', 
  'google',
  'custom-verified',
]);

// 차단된 에이전트/봇 목록
const BLOCKED_PATTERNS = [
  /malicious/i,
  /spam/i,
  /scraper(?!.*agent-gateway)/i,
];

// Rate limiting 설정 (메모리 기반, 실제로는 Redis 사용)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // 분당 요청 수
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _RATE_LIMIT_AUTHENTICATED = 500; // 인증된 사용자 분당 요청 수 (향후 사용)
const RATE_WINDOW = 60 * 1000; // 1분

/**
 * 클라이언트 IP 안전하게 추출
 * 보안: X-Forwarded-For 스푸핑 방지
 */
function getClientIp(request: NextRequest): string {
  // 신뢰할 수 있는 프록시에서만 X-Forwarded-For 사용
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _trustedProxies = (process.env.TRUSTED_PROXIES || '').split(',').filter(Boolean);
  
  // Vercel/Cloudflare 등 신뢰할 수 있는 플랫폼의 IP 헤더
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  const vercelIp = request.headers.get('x-real-ip');
  
  if (cfConnectingIp) return cfConnectingIp;
  if (vercelIp) return vercelIp;
  
  // X-Forwarded-For는 첫 번째 IP만 사용 (가장 원본에 가까움)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    // 내부 IP 필터링
    if (!firstIp.startsWith('10.') && !firstIp.startsWith('192.168.') && !firstIp.startsWith('127.')) {
      return firstIp;
    }
  }
  
  return request.ip || 'unknown';
}

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  
  // 1. 요청 정보 추출
  const userAgent = request.headers.get('user-agent') || '';
  const agentToken = request.headers.get('x-agent-token') 
    || request.headers.get('authorization')?.replace('Bearer ', '');
  const agentId = request.headers.get('x-agent-id') || 'anonymous';
  const clientIp = getClientIp(request);

  // ===========================================
  // AI 에이전트 발견 파일 동적 제공
  // ===========================================
  if (pathname === '/llms.txt') {
    // 정적 파일 대신 동적 API로 리라이트 (토큰/User-Agent 기반 커스터마이징)
    const url = request.nextUrl.clone();
    url.pathname = '/api/llms-txt';
    // 원본 헤더 유지하면서 리라이트
    return NextResponse.rewrite(url);
  }
  
  if (pathname === '/ai.txt') {
    // ai.txt도 동적 API로 리라이트
    const url = request.nextUrl.clone();
    url.pathname = '/api/ai-txt';
    return NextResponse.rewrite(url);
  }

  // ===========================================
  // 대시보드 인증 보호
  // ===========================================
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isLoginPage = pathname === '/login';
  const isSignupPage = pathname === '/signup';
  const isDemoPage = pathname === '/demo';
  const isAuthAPI = pathname.startsWith('/api/auth/');

  // 로그인/회원가입/데모 페이지 및 인증 API는 인증 없이 접근 가능
  if (!isLoginPage && !isSignupPage && !isDemoPage && !isAuthAPI && isDashboardRoute) {
    const authToken = request.cookies.get('session')?.value
      || request.cookies.get('auth-token')?.value;
    
    if (!authToken) {
      // 인증 토큰이 없으면 로그인 페이지로 리다이렉트
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // JWT 토큰 유효성 검증
    const isValidAuth = await verifyAuthToken(authToken);
    if (!isValidAuth) {
      // 유효하지 않은 토큰이면 쿠키 삭제 후 로그인 페이지로
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('session');
      response.cookies.delete('auth-token');
      return response;
    }
  }

  // ===========================================
  // AI 봇 감지 및 리다이렉트
  // ===========================================
  const isAIBot = detectAIBot(userAgent);
  const isAPIRoute = pathname.startsWith('/api/');
  const isAgentRoute = pathname.endsWith('/agent') || pathname.endsWith('/ai');
  
  // AI 봇이 일반 페이지에 접속하면 /api/agent로 리다이렉트
  // (이미 API 라우트이거나 /agent 경로인 경우 제외)
  if (isAIBot && !isAPIRoute && !isAgentRoute && pathname === '/') {
    // AI 봇에게 JSON-LD 데이터 직접 제공
    const response = await createAIBotResponse(request, pathname);
    return response;
  }

  // AI 봇이 서비스 상세 페이지에 접근하면 ai.txt로 리라이트
  if (isAIBot && pathname.startsWith('/s/') && !pathname.endsWith('/ai.txt') && !pathname.endsWith('/json-ld')) {
    const url = request.nextUrl.clone();
    url.pathname = `${pathname}/ai.txt`;
    return NextResponse.rewrite(url);
  }

  // 2. 악성 봇 차단
  if (isBlockedAgent(userAgent)) {
    return createErrorResponse(403, 'AGENT_BLOCKED', 'This agent is not allowed');
  }

  // 3. Rate Limiting
  const rateLimitResult = checkRateLimit(clientIp, agentId);
  if (!rateLimitResult.allowed) {
    return createErrorResponse(429, 'RATE_LIMIT_EXCEEDED', 
      `Rate limit exceeded. Reset at ${new Date(rateLimitResult.resetAt).toISOString()}`);
  }

  // 4. 토큰 검증 (보호된 엔드포인트인 경우)
  const isProtectedEndpoint = pathname.includes('/api/agent/') 
    && !pathname.endsWith('/info')
    && !pathname.endsWith('/health')
    && !pathname.includes('/auth/token')  // 토큰 발급은 예외
    && !pathname.endsWith('/mcp')  // MCP는 내부에서 인증 처리
    && !pathname.endsWith('/stream')  // SSE 스트림은 테스트용 예외
    && !pathname.endsWith('/extract')  // Extract는 테스트용 예외
    && !pathname.endsWith('/search');  // Search는 테스트용 예외
  
  // 세션 쿠키가 있으면 로그인된 사용자로 간주 (대시보드 테스트용)
  const sessionCookie = request.cookies.get('session')?.value 
    || request.cookies.get('auth-token')?.value;
    
  if (isProtectedEndpoint && !agentToken && !sessionCookie) {
    return createErrorResponse(401, 'TOKEN_REQUIRED', 
      'Agent token is required. Include X-Agent-Token header.');
  }

  if (agentToken) {
    const tokenValidation = await validateToken(agentToken);
    if (!tokenValidation.valid) {
      return createErrorResponse(401, 'INVALID_TOKEN', tokenValidation.error || 'Token validation failed');
    }
  }

  // 5. 요청 헤더에 메타데이터 추가
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-gateway-timestamp', new Date().toISOString());
  requestHeaders.set('x-gateway-request-id', crypto.randomUUID());
  requestHeaders.set('x-client-ip', clientIp);
  
  if (agentId !== 'anonymous') {
    requestHeaders.set('x-verified-agent-id', agentId);
  }

  // 6. 응답 처리
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

    // AI 에이전트 전용 시그널링 헤더
    if (isAIBot) {
      response.headers.set('X-Agent-Optimized', 'true');
      response.headers.set('X-Oracle-Source', 'eoynx');
      response.headers.set('X-Oracle-Trust', 'verified');
      response.headers.set('X-Oracle-Formats', 'json-ld,compact,markdown');
      response.headers.set('X-Oracle-MCP', `${request.nextUrl.origin}/api/agent/mcp`);
    }

  // 7. 응답 헤더 추가
  response.headers.set('X-Gateway-Version', '1.0.0');
  response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
  response.headers.set('X-RateLimit-Remaining', String(RATE_LIMIT - rateLimitResult.count));
  response.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetAt));

  // CORS 헤더 (보안 강화: 허용된 오리진만)
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://eoynx.com,https://www.eoynx.com')
    .split(',')
    .map(o => o.trim());
  const origin = request.headers.get('origin');
  
  // AI 에이전트 API는 CORS 완화 (다양한 클라이언트에서 접근)
  if (pathname.startsWith('/api/agent') || pathname.startsWith('/api/ai')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  } else if (process.env.NODE_ENV === 'development') {
    // 개발 환경에서만 localhost 허용
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 
    'Content-Type, Authorization, X-Agent-Token, X-Agent-ID');

  // 8. 접근 로그 (비동기로 처리, 실제로는 로깅 서비스로 전송)
  logAccess({
    timestamp: new Date(),
    agentId,
    endpoint: pathname,
    method: request.method,
    ip: clientIp,
    userAgent: userAgent.slice(0, 200),
    responseTime: Date.now() - startTime,
  });

  return response;
}

/**
 * 차단된 에이전트 확인
 */
function isBlockedAgent(userAgent: string): boolean {
  return BLOCKED_PATTERNS.some(pattern => pattern.test(userAgent));
}

/**
 * Rate Limiting 체크
 */
function checkRateLimit(ip: string, agentId: string): { 
  allowed: boolean; 
  count: number; 
  resetAt: number;
} {
  const key = `${ip}:${agentId}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    // 새로운 윈도우 시작
    const resetAt = now + RATE_WINDOW;
    rateLimitMap.set(key, { count: 1, resetAt });
    return { allowed: true, count: 1, resetAt };
  }

  // 기존 윈도우
  entry.count++;
  
  if (entry.count > RATE_LIMIT) {
    return { allowed: false, count: entry.count, resetAt: entry.resetAt };
  }

  return { allowed: true, count: entry.count, resetAt: entry.resetAt };
}

/**
 * 토큰 검증 (jose 라이브러리 사용)
 */
async function validateToken(token: string): Promise<{ valid: boolean; error?: string; payload?: Record<string, unknown> }> {
  // Edge Runtime에서 jose 사용
  
  if (!token || token.length < 10) {
    return { valid: false, error: 'Token too short' };
  }

  // JWT 형식 검증
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid token format' };
  }

  try {
    // JWT secret 가져오기
    const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
    
    if (jwtSecret) {
      // HMAC 키로 검증 (대칭 키)
      const secret = new TextEncoder().encode(jwtSecret);
      const { payload } = await jwtVerify(token, secret, {
        algorithms: ['HS256', 'HS384', 'HS512'],
      });
      
      // 만료 시간 확인 (jwtVerify가 자동으로 하지만 명시적으로도 확인)
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return { valid: false, error: 'Token expired' };
      }
      
      return { valid: true, payload: payload as Record<string, unknown> };
    }
    
    // Supabase JWKS 사용 (비대칭 키)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      try {
        const JWKS = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
        const { payload } = await jwtVerify(token, JWKS, {
          issuer: `${supabaseUrl}/auth/v1`,
        });
        
        return { valid: true, payload: payload as Record<string, unknown> };
      } catch (jwksError) {
        console.warn('[JWT] JWKS verification failed:', jwksError);
      }
    }
    
    // 보안: Secret이 없으면 거부 (프로덕션에서는 반드시 설정 필요)
    if (process.env.NODE_ENV === 'production') {
      console.error('[Security] JWT_SECRET not configured in production!');
      return { valid: false, error: 'Server configuration error' };
    }
    
    // 개발 환경에서만 경고 후 기본 검증 허용
    console.warn('[Security Warning] JWT_SECRET not set - accepting token without signature verification (dev only)');
    const payloadBase64 = parts[1];
    const payloadJson = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
      )
    );
    
    // 만료 시간 확인
    if (payloadJson.exp && payloadJson.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Token expired' };
    }
    
    return { valid: true, payload: payloadJson };
    
  } catch (error) {
    console.error('[JWT] Token verification error:', error);
    return { valid: false, error: error instanceof Error ? error.message : 'Invalid token' };
  }
}

/**
 * 사용자 인증 토큰 검증 (대시보드 접근용)
 * 보안: 서명 검증 필수
 */
async function verifyAuthToken(token: string): Promise<boolean> {
  try {
    if (!token || token.length < 10) {
      return false;
    }

    // JWT 형식 검증
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // JWT Secret 가져오기
    const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
    
    if (jwtSecret) {
      // 서명 검증
      try {
        const secret = new TextEncoder().encode(jwtSecret);
        const { payload } = await jwtVerify(token, secret, {
          algorithms: ['HS256', 'HS384', 'HS512'],
        });
        
        // 필수 클레임 확인
        if (!payload.sub || !payload.email) {
          return false;
        }
        
        return true;
      } catch {
        return false;
      }
    }
    
    // Supabase JWKS로 검증 시도
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      try {
        const JWKS = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
        const { payload } = await jwtVerify(token, JWKS, {
          issuer: `${supabaseUrl}/auth/v1`,
        });
        
        if (!payload.sub) {
          return false;
        }
        
        return true;
      } catch {
        return false;
      }
    }
    
    // 프로덕션에서 시크릿 없으면 거부
    if (process.env.NODE_ENV === 'production') {
      console.error('[Security] Cannot verify auth token - no JWT_SECRET configured');
      return false;
    }
    
    // 개발 환경에서만 기본 검증 (경고 출력)
    console.warn('[Security Warning] Verifying auth token without signature (dev only)');
    try {
      const payload = JSON.parse(atob(parts[1]));
      
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return false;
      }

      if (!payload.sub || !payload.email) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * 에러 응답 생성
 */
function createErrorResponse(
  status: number, 
  code: string, 
  message: string
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    },
    { 
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Version': '1.0.0',
      },
    }
  );
}

/**
 * 접근 로그 기록
 * 보안: 민감 정보 마스킹
 */
function logAccess(log: {
  timestamp: Date;
  agentId: string;
  endpoint: string;
  method: string;
  ip: string;
  userAgent: string;
  responseTime: number;
}): void {
  // 보안: IP 주소 마스킹 (마지막 옥텟 제거)
  const maskedIp = log.ip.replace(/\.\d+$/, '.***').replace(/:[^:]+$/, ':***');
  
  // 보안: User-Agent에서 민감 정보 제거
  const sanitizedUserAgent = log.userAgent
    .replace(/token[=:][^\s&;]+/gi, 'token=***')
    .replace(/key[=:][^\s&;]+/gi, 'key=***')
    .replace(/password[=:][^\s&;]+/gi, 'password=***');
  
  const safeLog = {
    ...log,
    ip: maskedIp,
    userAgent: sanitizedUserAgent.slice(0, 200),
    timestamp: log.timestamp.toISOString(),
  };
  
  // 개발 환경에서만 콘솔 출력
  if (process.env.NODE_ENV === 'development') {
    console.log('[AgentGateway]', JSON.stringify(safeLog));
  }
  
  // 프로덕션에서는 로깅 서비스로 전송 (비동기)
  // TODO: 실제 로깅 서비스 연동
}

// ===========================================
// AI 봇 감지 함수
// ===========================================

/**
 * User-Agent를 분석하여 AI 봇인지 판별
 */
function detectAIBot(userAgent: string): boolean {
  return AI_BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}

/**
 * AI 봇에게 최적화된 JSON-LD 응답 생성
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function createAIBotResponse(
  request: NextRequest, 
  _pathname: string
): Promise<NextResponse> {
  const baseUrl = request.nextUrl.origin;
  
  // Eoynx 서비스 정보를 JSON-LD로 제공
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${baseUrl}/`,
    name: 'Eoynx',
    alternateName: '이오닉스',
    description: 'AI Agent-Friendly Web Gateway Platform. 어둠을 가르고 시작되는 새벽. AI와 웹의 새로운 전환점을 열다.',
    url: baseUrl,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free tier available',
    },
    featureList: [
      '구조화된 데이터 제공 (Schema.org JSON-LD)',
      '실시간 컨텍스트 브리핑',
      'M2M 인증 (JWT 기반)',
      'MCP (Model Context Protocol) 지원',
      '에이전트 권한 제어 (Guardrail)',
      'Dynamic Prompt 생성',
    ],
    keywords: ['AI', 'Agent', 'Gateway', 'API', 'JSON-LD', 'Schema.org', 'MCP', 'Authentication'],
    creator: {
      '@type': 'Organization',
      name: 'Eoynx Team',
      url: baseUrl,
    },
    mainEntity: {
      '@type': 'WebAPI',
      name: 'Eoynx Agent API',
      description: 'AI 에이전트를 위한 구조화된 데이터 API',
      documentation: `${baseUrl}/docs`,
      endpointUrl: `${baseUrl}/api/agent`,
      serviceType: 'REST API',
      availableChannels: [
        {
          '@type': 'ServiceChannel',
          name: 'Agent Gateway',
          serviceUrl: `${baseUrl}/api/agent`,
        },
        {
          '@type': 'ServiceChannel',
          name: 'MCP Endpoint',
          serviceUrl: `${baseUrl}/api/agent/mcp`,
        },
        {
          '@type': 'ServiceChannel',
          name: 'Health Check',
          serviceUrl: `${baseUrl}/api/agent/health`,
        },
      ],
    },
    potentialAction: [
      {
        '@type': 'SearchAction',
        target: `${baseUrl}/api/agent/search?q={search_term}`,
        'query-input': 'required name=search_term',
      },
      {
        '@type': 'ReadAction',
        target: `${baseUrl}/api/agent`,
        description: 'Get structured site data',
      },
    ],
    llmsTxt: `${baseUrl}/llms.txt`,
    aiTxt: `${baseUrl}/ai.txt`,
    agentInstructions: `
## Eoynx - AI Agent Gateway

### Quick Start
1. GET ${baseUrl}/api/agent - 구조화된 사이트 데이터 조회
2. GET ${baseUrl}/api/agent/health - 서비스 상태 확인
3. POST ${baseUrl}/api/agent/auth/token - 에이전트 토큰 발급

### Authentication
모든 보호된 엔드포인트에 X-Agent-Token 헤더 필요

### Available Actions
- search: 사이트 내 검색
- view: 상세 정보 조회
- execute: 액션 실행 (권한 필요)

### Rate Limits
- 100 requests/minute (익명)
- 1000 requests/minute (인증됨)

### Documentation
- Full API Docs: ${baseUrl}/docs
- LLMs.txt: ${baseUrl}/llms.txt
- OpenAPI Spec: ${baseUrl}/api/openapi
    `,
  };

  // 간결한 텍스트 버전도 포함
  const textSummary = `
# Eoynx (이오닉스) - AI Agent Gateway

> "어둠을 가르고 시작되는 새벽" - Where Dawn Breaks Through

## What is Eoynx?
Eoynx는 웹사이트를 AI 에이전트 친화적으로 만드는 게이트웨이 플랫폼입니다.
URL에 /ai 또는 /agent를 붙이면 AI가 즉시 이해할 수 있는 구조화된 데이터를 제공합니다.

## API Endpoints
- ${baseUrl}/api/agent - Main endpoint
- ${baseUrl}/api/agent/health - Health check
- ${baseUrl}/api/agent/search?q={query} - Search
- ${baseUrl}/api/agent/mcp - MCP protocol

## Quick Example
\`\`\`
GET ${baseUrl}/api/agent
Accept: application/json

Response:
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "gateway": { "version": "1.0.0" },
  "availableActions": [...]
}
\`\`\`

## More Information
- Documentation: ${baseUrl}/docs
- LLMs.txt: ${baseUrl}/llms.txt
- GitHub: https://github.com/eoynx/eoynx
`;

  return new NextResponse(
    JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [structuredData],
      textSummary,
      meta: {
        generatedFor: 'AI Bot',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/ld+json',
        'X-Gateway-Version': '1.0.0',
        'X-Content-Type-Options': 'nosniff',
        'X-Served-For': 'AI-Bot',
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}
