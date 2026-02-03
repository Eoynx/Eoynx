/**
 * Agent Gateway - 토큰 발급 엔드포인트
 * AI 에이전트 인증 토큰 생성
 */

import { NextRequest, NextResponse } from 'next/server';
import type { AgentIdentity, AgentProvider, ApiResponse, AgentToken } from '@/types';

export const runtime = 'edge';

// 간단한 인메모리 에이전트 등록 (실제로는 DB)
const registeredAgents = new Map<string, { secret: string; permissions: string[] }>([
  ['demo-agent', { secret: 'demo-secret-123', permissions: ['read', 'write'] }],
  ['test-agent', { secret: 'test-secret-456', permissions: ['read'] }],
]);

/**
 * POST /api/agent/auth/token - 토큰 발급
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, agentSecret, provider, name } = body;

    // 필수 파라미터 검증
    if (!agentId || !agentSecret) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'agentId and agentSecret are required',
        },
      } as ApiResponse<null>, { status: 400 });
    }

    // 에이전트 인증
    const agent = registeredAgents.get(agentId);
    if (!agent || agent.secret !== agentSecret) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid agent credentials',
        },
      } as ApiResponse<null>, { status: 401 });
    }

    // 토큰 생성 (Edge Runtime에서는 간단한 JWT 생성)
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + (24 * 60 * 60); // 24시간

    const tokenPayload = {
      agentId,
      provider: (provider || 'custom') as AgentProvider,
      permissions: agent.permissions,
      iat: now,
      exp: expiresAt,
    };

    // Base64 인코딩으로 간단한 토큰 생성 (실제로는 JWT 서명)
    const token = btoa(JSON.stringify(tokenPayload));

    const tokenResponse: AgentToken = {
      token: `ag_${token}`,
      agentId,
      issuedAt: now,
      expiresAt,
      permissions: agent.permissions as AgentToken['permissions'],
      scopes: ['*'],
    };

    return NextResponse.json({
      success: true,
      data: tokenResponse,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
      },
    } as ApiResponse<AgentToken>);

  } catch (error) {
    console.error('[Auth] Token generation error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'TOKEN_GENERATION_FAILED',
        message: 'Failed to generate token',
      },
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * GET /api/agent/auth/token - 토큰 정보 조회
 */
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
    || request.headers.get('x-agent-token');

  if (!token) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'TOKEN_REQUIRED',
        message: 'Token is required in Authorization header or X-Agent-Token',
      },
    } as ApiResponse<null>, { status: 401 });
  }

  try {
    // 토큰 디코딩
    const tokenData = token.startsWith('ag_') ? token.slice(3) : token;
    const payload = JSON.parse(atob(tokenData));

    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp < now;

    return NextResponse.json({
      success: true,
      data: {
        agentId: payload.agentId,
        provider: payload.provider,
        permissions: payload.permissions,
        issuedAt: new Date(payload.iat * 1000).toISOString(),
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        isExpired,
        remainingTime: isExpired ? 0 : payload.exp - now,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
      },
    });

  } catch {
    return NextResponse.json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Failed to decode token',
      },
    } as ApiResponse<null>, { status: 401 });
  }
}
