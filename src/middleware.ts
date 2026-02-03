/**
 * Agent Gateway Middleware
 * Edge Runtime에서 실행되어 에이전트 인증 및 접근 제어 수행
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Edge Runtime에서 동작하도록 설정
export const config = {
  matcher: [
    // Agent/AI 전용 경로
    '/api/agent/:path*',
    '/api/ai/:path*',
    '/:path*/agent',
    '/:path*/ai',
  ],
};

// 허용된 에이전트 목록 (실제로는 DB에서 관리)
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
const RATE_WINDOW = 60 * 1000; // 1분

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const { pathname, searchParams } = request.nextUrl;
  
  // 1. 요청 정보 추출
  const userAgent = request.headers.get('user-agent') || '';
  const agentToken = request.headers.get('x-agent-token') 
    || request.headers.get('authorization')?.replace('Bearer ', '');
  const agentId = request.headers.get('x-agent-id') || 'anonymous';
  const clientIp = request.ip || request.headers.get('x-forwarded-for') || 'unknown';

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
    && !pathname.endsWith('/health');
    
  if (isProtectedEndpoint && !agentToken) {
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

  // 7. 응답 헤더 추가
  response.headers.set('X-Gateway-Version', '1.0.0');
  response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
  response.headers.set('X-RateLimit-Remaining', String(RATE_LIMIT - rateLimitResult.count));
  response.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetAt));

  // CORS 헤더
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
 * 토큰 검증 (간단한 구현, 실제로는 jose 라이브러리 사용)
 */
async function validateToken(token: string): Promise<{ valid: boolean; error?: string }> {
  // Edge Runtime에서는 jose 사용
  // 여기서는 간단한 형식 검증만 수행
  
  if (!token || token.length < 10) {
    return { valid: false, error: 'Token too short' };
  }

  // JWT 형식 검증
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid token format' };
  }

  // TODO: 실제 JWT 검증 로직 구현
  // const { payload } = await jwtVerify(token, secret);
  
  return { valid: true };
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
  // 실제로는 로깅 서비스로 비동기 전송
  // 여기서는 콘솔 출력 (개발용)
  if (process.env.NODE_ENV === 'development') {
    console.log('[AgentGateway]', JSON.stringify(log));
  }
}
