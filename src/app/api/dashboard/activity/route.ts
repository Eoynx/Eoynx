/**
 * Dashboard Activity API
 * 최근 활동 데이터 제공
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import type { ApiResponse } from '@/types';

export const runtime = 'edge';

export interface ActivityItem {
  id: string;
  agent: string;
  provider: string;
  action: string;
  endpoint: string;
  status: 'success' | 'error' | 'pending';
  statusCode?: number;
  responseTime: string;
  timestamp: string;
  relativeTime: string;
}

// DB 로그 레코드 타입
interface LogRecord {
  id: string;
  agent_id: string | null;
  method: string;
  endpoint: string;
  status_code: number | null;
  duration_ms: number | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * GET /api/dashboard/activity - 최근 활동 조회
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  const agentId = searchParams.get('agentId');

  try {
    const supabase = getSupabaseAdmin();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('request_logs')
      .select(`
        id,
        agent_id,
        method,
        endpoint,
        status_code,
        duration_ms,
        user_agent,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.warn('[Activity API] DB 에러:', error);
      
      // DB 연결 문제 시 빈 데이터 반환
      return NextResponse.json({
        success: true,
        data: [],
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          version: '1.0.0',
          empty: true,
          reason: 'DB 연결 실패 또는 테이블 없음',
        },
      } as ApiResponse<ActivityItem[]>);
    }

    const activities: ActivityItem[] = (logs as LogRecord[]).map((log: LogRecord) => ({
      id: log.id,
      agent: extractAgentName(log.agent_id, log.user_agent),
      provider: extractProvider(log.user_agent),
      action: extractAction(log.endpoint, log.method),
      endpoint: log.endpoint,
      status: log.status_code && log.status_code < 400 ? 'success' : 'error',
      statusCode: log.status_code || undefined,
      responseTime: log.duration_ms ? `${log.duration_ms}ms` : '-',
      timestamp: log.created_at,
      relativeTime: getRelativeTime(log.created_at),
    }));

    return NextResponse.json({
      success: true,
      data: activities,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
        total: activities.length,
      },
    } as ApiResponse<ActivityItem[]>);

  } catch (error) {
    console.error('[Activity API] Error:', error);
    
    // 에러 시 빈 데이터 반환 (대시보드가 깨지지 않도록)
    return NextResponse.json({
      success: true,
      data: [],
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
        empty: true,
        reason: '서버 오류',
      },
    } as ApiResponse<ActivityItem[]>);
  }
}

/**
 * User-Agent에서 에이전트 이름 추출
 */
function extractAgentName(agentId: string | null, userAgent: string | null): string {
  if (agentId && agentId !== 'anonymous') {
    return agentId;
  }
  
  if (!userAgent) return 'Unknown';
  
  const ua = userAgent.toLowerCase();
  if (ua.includes('gpt') || ua.includes('openai')) return 'GPT-4';
  if (ua.includes('claude') || ua.includes('anthropic')) return 'Claude-3';
  if (ua.includes('gemini') || ua.includes('google')) return 'Gemini';
  if (ua.includes('perplexity')) return 'Perplexity';
  
  return 'Custom Bot';
}

/**
 * User-Agent에서 프로바이더 추출
 */
function extractProvider(userAgent: string | null): string {
  if (!userAgent) return 'Unknown';
  
  const ua = userAgent.toLowerCase();
  if (ua.includes('gpt') || ua.includes('openai')) return 'OpenAI';
  if (ua.includes('claude') || ua.includes('anthropic')) return 'Anthropic';
  if (ua.includes('gemini') || ua.includes('google')) return 'Google';
  if (ua.includes('perplexity')) return 'Perplexity';
  
  return 'Custom';
}

/**
 * 엔드포인트에서 액션 추출
 */
function extractAction(endpoint: string, method: string): string {
  if (endpoint.includes('/search')) return 'search';
  if (endpoint.includes('/cart')) return method === 'POST' ? 'addToCart' : 'viewCart';
  if (endpoint.includes('/orders')) return 'purchase';
  if (endpoint.includes('/extract')) return 'extract';
  if (endpoint.includes('/mcp')) return 'mcp';
  if (endpoint.includes('/stream')) return 'stream';
  if (endpoint.includes('/items') || endpoint.includes('/products')) return 'view';
  if (endpoint.includes('/agent')) return 'gateway';
  
  return method.toLowerCase();
}

/**
 * 상대적 시간 문자열 생성
 */
function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  
  return then.toLocaleDateString('ko-KR');
}
