/**
 * Dashboard Stats API
 * 대시보드 통계 데이터 제공
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import type { ApiResponse } from '@/types';

export const runtime = 'edge';

export interface DashboardStats {
  todayRequests: {
    value: number;
    change: number;
    changeType: 'positive' | 'negative' | 'neutral';
  };
  activeAgents: {
    value: number;
    change: number;
    changeType: 'positive' | 'negative' | 'neutral';
  };
  avgResponseTime: {
    value: number;
    change: number;
    changeType: 'positive' | 'negative' | 'neutral';
  };
  errorRate: {
    value: number;
    change: number;
    changeType: 'positive' | 'negative' | 'neutral';
  };
}

/**
 * GET /api/dashboard/stats - 대시보드 통계 조회
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    
    // 오늘 날짜 계산
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    
    // 어제 날짜 계산
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString();

    // 1. 오늘 요청 수 조회
    const { count: todayCount, error: todayError } = await sb
      .from('request_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO);

    // 2. 어제 요청 수 조회 (비교용)
    const { count: yesterdayCount, error: yesterdayError } = await sb
      .from('request_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterdayISO)
      .lt('created_at', todayISO);

    // 3. 활성 에이전트 수 조회 (현재)
    const { count: activeAgentCount, error: agentError } = await sb
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    
    // 3-1. 어제 활성 에이전트 수 조회 (어제 마지막 기록 기준)
    const { count: yesterdayAgentCount } = await sb
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .lt('created_at', todayISO);

    // 4. 평균 응답 시간 조회 (오늘)
    const { data: avgTimeData, error: avgTimeError } = await sb
      .from('request_logs')
      .select('duration_ms')
      .gte('created_at', todayISO)
      .not('duration_ms', 'is', null);
    
    // 4-1. 평균 응답 시간 조회 (어제)
    const { data: yesterdayAvgTimeData } = await sb
      .from('request_logs')
      .select('duration_ms')
      .gte('created_at', yesterdayISO)
      .lt('created_at', todayISO)
      .not('duration_ms', 'is', null);

    // 5. 에러율 계산 (오늘)
    const { count: errorCount, error: errorCountError } = await sb
      .from('request_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO)
      .gte('status_code', 400);
    
    // 5-1. 어제 에러 수 조회
    const { count: yesterdayErrorCount } = await sb
      .from('request_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterdayISO)
      .lt('created_at', todayISO)
      .gte('status_code', 400);

    // DB 연결 실패 또는 테이블 없음 - 빈 데이터 반환
    if (todayError || yesterdayError || agentError || avgTimeError || errorCountError) {
      console.warn('[Stats API] DB 에러:', { todayError, yesterdayError, agentError });
      
      // 개발 환경 또는 테이블이 없는 경우 - 빈 데이터 반환
      return NextResponse.json({
        success: true,
        data: getEmptyStats(),
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          version: '1.0.0',
          empty: true,
          reason: 'DB 연결 실패 또는 테이블 없음',
        },
      } as ApiResponse<DashboardStats>);
    }

    // 통계 계산
    const todayRequestCount = todayCount || 0;
    const yesterdayRequestCount = yesterdayCount || 0;
    const requestChange = yesterdayRequestCount > 0 
      ? ((todayRequestCount - yesterdayRequestCount) / yesterdayRequestCount * 100)
      : 0;

    // 활성 에이전트 변화 계산
    const currentAgents = activeAgentCount || 0;
    const previousAgents = yesterdayAgentCount || 0;
    const agentChange = previousAgents > 0
      ? currentAgents - previousAgents
      : 0;

    // 평균 응답 시간 계산
    const avgResponseTime = avgTimeData && avgTimeData.length > 0
      ? Math.round((avgTimeData as { duration_ms: number }[]).reduce((sum: number, r: { duration_ms: number }) => sum + (r.duration_ms || 0), 0) / avgTimeData.length)
      : 0;
    
    // 어제 평균 응답 시간 계산
    const yesterdayAvgResponseTime = yesterdayAvgTimeData && yesterdayAvgTimeData.length > 0
      ? Math.round((yesterdayAvgTimeData as { duration_ms: number }[]).reduce((sum: number, r: { duration_ms: number }) => sum + (r.duration_ms || 0), 0) / yesterdayAvgTimeData.length)
      : 0;
    
    // 응답 시간 변화율 (ms 차이)
    const responseTimeChange = yesterdayAvgResponseTime > 0
      ? ((avgResponseTime - yesterdayAvgResponseTime) / yesterdayAvgResponseTime * 100)
      : 0;

    // 에러율 계산
    const errorRateValue = todayRequestCount > 0
      ? (((errorCount || 0) / todayRequestCount) * 100)
      : 0;
    
    // 어제 에러율 계산
    const yesterdayErrorRate = yesterdayRequestCount > 0
      ? (((yesterdayErrorCount || 0) / yesterdayRequestCount) * 100)
      : 0;
    
    // 에러율 변화 (포인트 차이)
    const errorRateChange = yesterdayErrorRate > 0
      ? errorRateValue - yesterdayErrorRate
      : 0;

    const stats: DashboardStats = {
      todayRequests: {
        value: todayRequestCount,
        change: Math.round(requestChange * 10) / 10,
        changeType: requestChange >= 0 ? 'positive' : 'negative',
      },
      activeAgents: {
        value: currentAgents,
        change: agentChange,
        changeType: agentChange > 0 ? 'positive' : agentChange < 0 ? 'negative' : 'neutral',
      },
      avgResponseTime: {
        value: avgResponseTime,
        change: Math.round(responseTimeChange * 10) / 10,
        // 응답 시간은 줄어들면 긍정적
        changeType: responseTimeChange <= 0 ? 'positive' : 'negative',
      },
      errorRate: {
        value: Math.round(errorRateValue * 100) / 100,
        change: Math.round(errorRateChange * 100) / 100,
        // 에러율은 줄어들면 긍정적
        changeType: errorRateChange <= 0 ? 'positive' : 'negative',
      },
    };

    return NextResponse.json({
      success: true,
      data: stats,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
      },
    } as ApiResponse<DashboardStats>);

  } catch (error) {
    console.error('[Stats API] Error:', error);
    
    // 에러 시 빈 데이터 반환 (대시보드가 깨지지 않도록)
    return NextResponse.json({
      success: true,
      data: getEmptyStats(),
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
        empty: true,
        reason: '서버 오류',
      },
    } as ApiResponse<DashboardStats>);
  }
}

/**
 * 빈 통계 데이터 (데이터가 없을 때)
 */
function getEmptyStats(): DashboardStats {
  return {
    todayRequests: {
      value: 0,
      change: 0,
      changeType: 'neutral',
    },
    activeAgents: {
      value: 0,
      change: 0,
      changeType: 'neutral',
    },
    avgResponseTime: {
      value: 0,
      change: 0,
      changeType: 'neutral',
    },
    errorRate: {
      value: 0,
      change: 0,
      changeType: 'neutral',
    },
  };
}
