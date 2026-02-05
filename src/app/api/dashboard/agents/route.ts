/**
 * Dashboard Agents API
 * 에이전트 CRUD 및 관리
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import type { ApiResponse, AgentProvider } from '@/types';

export const runtime = 'edge';

export interface AgentData {
  id: string;
  agentId: string;
  name: string;
  provider: string;
  description?: string;
  status: 'active' | 'suspended' | 'pending';
  reputation: number;
  level: 'new' | 'basic' | 'trusted' | 'verified' | 'elite';
  permissions: string[];
  lastActive: string | null;
  totalRequests: number;
  successRate: number;
  createdAt: string;
}

// DB 레코드 타입
interface AgentRecord {
  id: string;
  agent_id: string;
  name: string;
  provider: string;
  description: string | null;
  status: 'active' | 'suspended' | 'pending';
  created_at: string;
  updated_at: string;
}

interface ReputationRecord {
  agent_id: string;
  score: number;
  level: string;
  last_active_at: string | null;
  total_requests: number;
  successful_requests: number;
}

interface PermissionRecord {
  agent_id: string;
  permission: string;
}

/**
 * GET /api/dashboard/agents - 에이전트 목록 조회
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const supabase = getSupabaseAdmin();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    
    // 에이전트 목록 조회 (뷰 사용 또는 조인)
    let query = sb
      .from('agents')
      .select(`
        id,
        agent_id,
        name,
        provider,
        description,
        status,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,agent_id.ilike.%${search}%,provider.ilike.%${search}%`);
    }

    const { data: agents, error: agentsError } = await query;

    if (agentsError) {
      console.warn('[Agents API] DB 연결 실패, 더미 데이터 반환:', agentsError);
      return NextResponse.json({
        success: true,
        data: getFallbackAgents(),
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          version: '1.0.0',
          fallback: true,
        },
      } as ApiResponse<AgentData[]>);
    }

    const typedAgents = agents as AgentRecord[];

    // 평판 정보 조회
    const agentIds = typedAgents?.map((a: AgentRecord) => a.agent_id) || [];
    const { data: reputations } = await sb
      .from('agent_reputation')
      .select('*')
      .in('agent_id', agentIds);

    // 권한 정보 조회
    const { data: permissions } = await sb
      .from('agent_permissions')
      .select('agent_id, permission')
      .in('agent_id', agentIds);

    // 데이터 병합
    const typedReputations = (reputations || []) as ReputationRecord[];
    const typedPermissions = (permissions || []) as PermissionRecord[];
    
    const agentData: AgentData[] = (typedAgents || []).map((agent: AgentRecord) => {
      const rep = typedReputations.find((r: ReputationRecord) => r.agent_id === agent.agent_id);
      const perms = typedPermissions
        .filter((p: PermissionRecord) => p.agent_id === agent.agent_id)
        .map((p: PermissionRecord) => p.permission);
      
      return {
        id: agent.id,
        agentId: agent.agent_id,
        name: agent.name,
        provider: agent.provider,
        description: agent.description || undefined,
        status: agent.status,
        reputation: rep?.score || 100,
        level: (rep?.level || 'new') as AgentData['level'],
        permissions: perms.length > 0 ? perms : ['read'],
        lastActive: rep?.last_active_at || null,
        totalRequests: rep?.total_requests || 0,
        successRate: rep?.total_requests 
          ? Math.round((rep.successful_requests / rep.total_requests) * 100 * 10) / 10
          : 0,
        createdAt: agent.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: agentData,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
        total: agentData.length,
      },
    } as ApiResponse<AgentData[]>);

  } catch (error) {
    console.error('[Agents API] Error:', error);
    
    return NextResponse.json({
      success: true,
      data: getFallbackAgents(),
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
        fallback: true,
      },
    } as ApiResponse<AgentData[]>);
  }
}

/**
 * POST /api/dashboard/agents - 에이전트 등록
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, provider, description, permissions } = body;

    // 필수 파라미터 검증
    if (!name || !provider) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'name과 provider는 필수입니다.',
        },
      } as ApiResponse<null>, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    
    // 에이전트 ID 생성
    const agentId = `agent-${provider.toLowerCase()}-${Date.now().toString(36)}`;
    
    // 에이전트 API 키 생성 (실제로는 더 안전한 방식 사용)
    const apiKey = `agk_${crypto.randomUUID().replace(/-/g, '')}`;
    const apiKeyHash = await hashApiKey(apiKey);

    // 에이전트 등록
    const { data: agent, error: agentError } = await sb
      .from('agents')
      .insert({
        agent_id: agentId,
        name,
        provider,
        description: description || null,
        status: 'pending',
        api_key_hash: apiKeyHash,
      })
      .select()
      .single();

    if (agentError) {
      console.error('[Agents API] 등록 실패:', agentError);
      return NextResponse.json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: '에이전트 등록에 실패했습니다.',
        },
      } as ApiResponse<null>, { status: 500 });
    }

    // 평판 초기화
    await sb.from('agent_reputation').insert({
      agent_id: agentId,
      score: 100,
      level: 'new',
    });

    // 권한 부여
    const defaultPermissions = permissions || ['read'];
    for (const perm of defaultPermissions) {
      await sb.from('agent_permissions').insert({
        agent_id: agentId,
        permission: perm,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: agent.id,
        agentId: agentId,
        name,
        provider,
        apiKey, // 최초 1회만 반환
        status: 'pending',
        message: '에이전트가 등록되었습니다. API 키를 안전하게 보관하세요.',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
      },
    });

  } catch (error) {
    console.error('[Agents API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * PUT /api/dashboard/agents - 에이전트 상태 업데이트
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, status, permissions } = body;

    if (!agentId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'agentId는 필수입니다.',
        },
      } as ApiResponse<null>, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    // 상태 업데이트
    if (status) {
      const { error } = await sb
        .from('agents')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('agent_id', agentId);

      if (error) {
        throw error;
      }
    }

    // 권한 업데이트
    if (permissions && Array.isArray(permissions)) {
      // 기존 권한 삭제
      await sb.from('agent_permissions').delete().eq('agent_id', agentId);
      
      // 새 권한 추가
      for (const perm of permissions) {
        await sb.from('agent_permissions').insert({
          agent_id: agentId,
          permission: perm,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { agentId, updated: true },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
      },
    });

  } catch (error) {
    console.error('[Agents API] Update error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'UPDATE_FAILED',
        message: '업데이트에 실패했습니다.',
      },
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * DELETE /api/dashboard/agents - 에이전트 삭제
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId');

  if (!agentId) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'agentId는 필수입니다.',
      },
    } as ApiResponse<null>, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    // 권한 삭제
    await sb.from('agent_permissions').delete().eq('agent_id', agentId);
    
    // 평판 삭제
    await sb.from('agent_reputation').delete().eq('agent_id', agentId);
    
    // 에이전트 삭제
    const { error } = await sb.from('agents').delete().eq('agent_id', agentId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: { agentId, deleted: true },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
      },
    });

  } catch (error) {
    console.error('[Agents API] Delete error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: '삭제에 실패했습니다.',
      },
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * API 키 해시
 */
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * DB 연결 실패 시 반환할 더미 데이터
 */
function getFallbackAgents(): AgentData[] {
  return [
    {
      id: '1',
      agentId: 'agent-gpt4-001',
      name: 'GPT-4 Shopping Assistant',
      provider: 'OpenAI',
      status: 'active',
      reputation: 850,
      level: 'verified',
      permissions: ['read', 'search', 'cart', 'execute'],
      lastActive: new Date(Date.now() - 30 * 60000).toISOString(),
      totalRequests: 15420,
      successRate: 98.5,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      agentId: 'agent-claude-002',
      name: 'Claude Commerce Agent',
      provider: 'Anthropic',
      status: 'active',
      reputation: 920,
      level: 'elite',
      permissions: ['read', 'search', 'cart', 'execute', 'admin'],
      lastActive: new Date(Date.now() - 45 * 60000).toISOString(),
      totalRequests: 28350,
      successRate: 99.1,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      agentId: 'agent-gemini-003',
      name: 'Gemini Product Finder',
      provider: 'Google',
      status: 'active',
      reputation: 680,
      level: 'trusted',
      permissions: ['read', 'search', 'cart'],
      lastActive: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
      totalRequests: 8920,
      successRate: 97.2,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      agentId: 'agent-custom-004',
      name: 'Internal Bot v2',
      provider: 'Custom',
      status: 'suspended',
      reputation: 320,
      level: 'basic',
      permissions: ['read'],
      lastActive: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      totalRequests: 1250,
      successRate: 85.0,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '5',
      agentId: 'agent-test-005',
      name: 'Test Agent',
      provider: 'Internal',
      status: 'pending',
      reputation: 100,
      level: 'new',
      permissions: ['read'],
      lastActive: null,
      totalRequests: 0,
      successRate: 0,
      createdAt: new Date().toISOString(),
    },
  ];
}
