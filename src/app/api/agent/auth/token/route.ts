/**
 * Agent Gateway - 토큰 발급 엔드포인트
 * AI 에이전트 인증 토큰 생성
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { AgentProvider, ApiResponse, AgentToken } from '@/types';

export const runtime = 'edge';

// 보안: 데모 에이전트 자격증명은 환경 변수에서 로드 (개발 환경 전용)
function getDemoAgents(): Map<string, { secret: string; permissions: string[] }> {
  const demoAgents = new Map<string, { secret: string; permissions: string[] }>();
  
  // 환경 변수에서 데모 에이전트 설정 로드 (형식: agentId:secret)
  const demoAgentConfig = process.env.DEMO_AGENT_CREDENTIALS;
  if (demoAgentConfig && process.env.NODE_ENV !== 'production') {
    try {
      // "demo-agent:secret123,test-agent:secret456" 형식
      demoAgentConfig.split(',').forEach(pair => {
        const [agentId, secret] = pair.split(':');
        if (agentId && secret) {
          demoAgents.set(agentId.trim(), { 
            secret: secret.trim(), 
            permissions: ['read'] 
          });
        }
      });
    } catch {
      console.warn('[Security] Failed to parse DEMO_AGENT_CREDENTIALS');
    }
  }
  
  return demoAgents;
}

// 토큰 저장소 (메모리)
const tokenStore = new Map<string, { agentId: string; expiresAt: number }>();

// DB에서 에이전트 조회
async function getAgentFromDB(agentId: string): Promise<{ secret: string; permissions: string[] } | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('agents')
      .select('api_key, permissions')
      .eq('id', agentId)
      .single();
    
    if (error || !data) {
      // 프로덕션에서는 DB에서만 조회
      if (process.env.NODE_ENV === 'production') {
        return null;
      }
      // 개발 환경에서만 데모 에이전트 허용
      return getDemoAgents().get(agentId) || null;
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as any;
    return {
      secret: d.api_key,
      permissions: d.permissions || ['read'],
    };
  } catch {
    if (process.env.NODE_ENV === 'production') {
      return null;
    }
    return getDemoAgents().get(agentId) || null;
  }
}

// 토큰 저장
async function saveTokenToDB(token: string, agentId: string, expiresAt: number): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('agent_tokens')
      .upsert({
        token,
        agent_id: agentId,
        expires_at: new Date(expiresAt * 1000).toISOString(),
        created_at: new Date().toISOString(),
      });
    
    if (error) {
      console.warn('Token save to DB failed:', error.message);
      tokenStore.set(token, { agentId, expiresAt });
    }
  } catch {
    tokenStore.set(token, { agentId, expiresAt });
  }
}

// 토큰 검증
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function validateTokenFromDB(token: string): Promise<{ valid: boolean; agentId?: string }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('agent_tokens' as never)
      .select('agent_id, expires_at')
      .eq('token', token)
      .single();
    
    if (error || !data) {
      const memoryToken = tokenStore.get(token);
      if (memoryToken) {
        const now = Math.floor(Date.now() / 1000);
        return {
          valid: memoryToken.expiresAt > now,
          agentId: memoryToken.agentId,
        };
      }
      return { valid: false };
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as any;
    const now = new Date();
    const expiresAt = new Date(d.expires_at);
    return {
      valid: expiresAt > now,
      agentId: d.agent_id,
    };
  } catch {
    return { valid: false };
  }
}

/**
 * POST /api/agent/auth/token - 토큰 발급
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, agentSecret, provider, name: _name } = body;

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

    // DB에서 에이전트 인증
    const agent = await getAgentFromDB(agentId);
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
    const fullToken = `ag_${token}`;

    // DB에 토큰 저장
    await saveTokenToDB(fullToken, agentId, expiresAt);

    const tokenResponse: AgentToken = {
      token: fullToken,
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
