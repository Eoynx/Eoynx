/**
 * Dashboard Chart API
 * 시간대별 요청 추이 데이터 제공
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import type { ApiResponse } from '@/types';

export const runtime = 'edge';

export interface ChartDataPoint {
  hour: string;
  openai: number;
  anthropic: number;
  google: number;
  other: number;
  total: number;
}

export interface ChartSummary {
  totalRequests: number;
  avgResponseTime: number;
  peakHour: string;
  peakCount: number;
}

export interface ChartData {
  data: ChartDataPoint[];
  summary: ChartSummary;
}

// DB 로그 레코드 타입
interface LogRecord {
  created_at: string;
  user_agent: string | null;
  duration_ms: number | null;
}

/**
 * GET /api/dashboard/chart - 시간대별 요청 추이 조회
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'today'; // today, week, month

  try {
    const supabase = getSupabaseAdmin();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    
    // 기간 계산
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default: // today
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
    }

    // 요청 로그 조회
    const { data: logs, error } = await sb
      .from('request_logs')
      .select('created_at, user_agent, duration_ms')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[Chart API] DB 에러:', error);
      
      // DB 연결 문제 시 빈 데이터 반환
      return NextResponse.json({
        success: true,
        data: getEmptyChartData(),
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          version: '1.0.0',
          empty: true,
          reason: 'DB 연결 실패 또는 테이블 없음',
        },
      } as ApiResponse<ChartData>);
    }

    // 시간대별 데이터 집계
    const hourlyData: Record<string, { openai: number; anthropic: number; google: number; other: number }> = {};
    
    // 24시간 초기화
    for (let i = 0; i < 24; i += 4) {
      const hour = i.toString().padStart(2, '0');
      hourlyData[hour] = { openai: 0, anthropic: 0, google: 0, other: 0 };
    }

    let totalDuration = 0;
    let durationCount = 0;

    const typedLogs = (logs || []) as LogRecord[];
    typedLogs.forEach((log: LogRecord) => {
      const logDate = new Date(log.created_at);
      const hour = Math.floor(logDate.getHours() / 4) * 4;
      const hourKey = hour.toString().padStart(2, '0');
      
      if (!hourlyData[hourKey]) {
        hourlyData[hourKey] = { openai: 0, anthropic: 0, google: 0, other: 0 };
      }

      const provider = detectProvider(log.user_agent);
      hourlyData[hourKey][provider]++;

      if (log.duration_ms) {
        totalDuration += log.duration_ms;
        durationCount++;
      }
    });

    // 차트 데이터 변환
    const chartData: ChartDataPoint[] = Object.entries(hourlyData)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([hour, data]) => ({
        hour,
        openai: data.openai,
        anthropic: data.anthropic,
        google: data.google,
        other: data.other,
        total: data.openai + data.anthropic + data.google + data.other,
      }));

    // 피크 시간 계산
    const peakData = chartData.reduce((max, curr) => 
      curr.total > max.total ? curr : max, 
      chartData[0] || { hour: '00', total: 0 }
    );

    const summary: ChartSummary = {
      totalRequests: logs?.length || 0,
      avgResponseTime: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
      peakHour: peakData.hour,
      peakCount: peakData.total,
    };

    return NextResponse.json({
      success: true,
      data: {
        data: chartData,
        summary,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
        period,
      },
    } as ApiResponse<ChartData>);

  } catch (error) {
    console.error('[Chart API] Error:', error);
    
    // 에러 시 빈 데이터 반환 (대시보드가 깨지지 않도록)
    return NextResponse.json({
      success: true,
      data: getEmptyChartData(),
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
        empty: true,
        reason: '서버 오류',
      },
    } as ApiResponse<ChartData>);
  }
}

/**
 * User-Agent에서 프로바이더 감지
 */
function detectProvider(userAgent: string | null): 'openai' | 'anthropic' | 'google' | 'other' {
  if (!userAgent) return 'other';
  
  const ua = userAgent.toLowerCase();
  if (ua.includes('gpt') || ua.includes('openai') || ua.includes('chatgpt')) return 'openai';
  if (ua.includes('claude') || ua.includes('anthropic')) return 'anthropic';
  if (ua.includes('gemini') || ua.includes('google') || ua.includes('bard')) return 'google';
  
  return 'other';
}

/**
 * 빈 차트 데이터 (데이터가 없을 때)
 */
function getEmptyChartData(): ChartData {
  return {
    data: [
      { hour: '00', openai: 0, anthropic: 0, google: 0, other: 0, total: 0 },
      { hour: '04', openai: 0, anthropic: 0, google: 0, other: 0, total: 0 },
      { hour: '08', openai: 0, anthropic: 0, google: 0, other: 0, total: 0 },
      { hour: '12', openai: 0, anthropic: 0, google: 0, other: 0, total: 0 },
      { hour: '16', openai: 0, anthropic: 0, google: 0, other: 0, total: 0 },
      { hour: '20', openai: 0, anthropic: 0, google: 0, other: 0, total: 0 },
    ],
    summary: {
      totalRequests: 0,
      avgResponseTime: 0,
      peakHour: '00',
      peakCount: 0,
    },
  };
}
