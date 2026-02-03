/**
 * 로깅 데이터베이스 서비스
 * API 요청 및 액션 로그 기록
 * 
 * Note: Supabase 타입은 `npx supabase gen types typescript` 명령으로 생성 가능
 */

import { getSupabaseAdmin } from './client';
import type { Database } from './client';

type RequestLog = Database['public']['Tables']['request_logs']['Row'];
type RequestLogInsert = Database['public']['Tables']['request_logs']['Insert'];
type ActionLog = Database['public']['Tables']['action_logs']['Row'];
type ActionLogInsert = Database['public']['Tables']['action_logs']['Insert'];
type RecentActivity = Database['public']['Views']['recent_activity']['Row'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export const logService = {
  /**
   * API 요청 로그 기록
   */
  async logRequest(data: RequestLogInsert): Promise<string | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    
    const { data: log, error } = await supabase
      .from('request_logs')
      .insert(data)
      .select('id')
      .single();
    
    if (error) {
      console.error('[LogService] Failed to log request:', error);
      return null;
    }
    
    return (log as AnyRecord)?.id || null;
  },

  /**
   * 액션 실행 로그 기록
   */
  async logAction(data: ActionLogInsert): Promise<string | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    
    const { data: log, error } = await supabase
      .from('action_logs')
      .insert(data)
      .select('id')
      .single();
    
    if (error) {
      console.error('[LogService] Failed to log action:', error);
      return null;
    }
    
    return (log as AnyRecord)?.id || null;
  },

  /**
   * 액션 로그 업데이트 (결과 기록)
   */
  async updateActionLog(
    logId: string,
    data: Partial<ActionLog>
  ): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    
    const { error } = await supabase
      .from('action_logs')
      .update(data)
      .eq('id', logId);
    
    if (error) {
      console.error('[LogService] Failed to update action log:', error);
      return false;
    }
    
    return true;
  },

  /**
   * 최근 활동 조회
   */
  async getRecentActivity(limit = 100): Promise<RecentActivity[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    
    const { data, error } = await supabase
      .from('recent_activity')
      .select('*')
      .limit(limit);
    
    if (error) {
      console.error('[LogService] Failed to get recent activity:', error);
      return [];
    }
    
    return data || [];
  },

  /**
   * 에이전트별 요청 로그 조회
   */
  async getAgentLogs(
    agentId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<RequestLog[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    
    let query = supabase
      .from('request_logs')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });
    
    if (options?.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }
    
    if (options?.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[LogService] Failed to get agent logs:', error);
      return [];
    }
    
    return data || [];
  },

  /**
   * 에이전트별 액션 로그 조회
   */
  async getAgentActions(
    agentId: string,
    options?: {
      limit?: number;
      status?: 'success' | 'failed' | 'pending' | 'cancelled';
    }
  ): Promise<ActionLog[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    
    let query = supabase
      .from('action_logs')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });
    
    if (options?.status) {
      query = query.eq('status', options.status);
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[LogService] Failed to get agent actions:', error);
      return [];
    }
    
    return data || [];
  },

  /**
   * 통계: 일별 요청 수
   */
  async getDailyRequestStats(days = 7): Promise<{ date: string; count: number }[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('request_logs')
      .select('created_at')
      .gte('created_at', startDate.toISOString());
    
    if (error) {
      console.error('[LogService] Failed to get daily stats:', error);
      return [];
    }
    
    // 일별로 그룹화
    const logs = data as AnyRecord[] || [];
    const dailyCounts = logs.reduce((acc, log) => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  /**
   * 통계: 상태 코드별 요청 수
   */
  async getStatusCodeStats(): Promise<{ statusCode: number; count: number }[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    
    const { data, error } = await supabase
      .from('request_logs')
      .select('status_code');
    
    if (error) {
      console.error('[LogService] Failed to get status stats:', error);
      return [];
    }
    
    const logs = data as AnyRecord[] || [];
    const statusCounts = logs.reduce((acc, log) => {
      const code = log.status_code || 0;
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    return Object.entries(statusCounts)
      .map(([statusCode, count]) => ({ statusCode: parseInt(statusCode), count }))
      .sort((a, b) => b.count - a.count);
  },

  /**
   * 오래된 로그 정리 (30일 이상)
   */
  async cleanupOldLogs(daysToKeep = 30): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const { data, error } = await supabase
      .from('request_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id');
    
    if (error) {
      console.error('[LogService] Failed to cleanup logs:', error);
      return 0;
    }
    
    return data?.length || 0;
  },
};

export default logService;
