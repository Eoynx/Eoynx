/**
 * 에이전트 데이터베이스 서비스
 * 에이전트 CRUD 및 관련 작업
 * 
 * Note: Supabase 타입은 `npx supabase gen types typescript` 명령으로 생성 가능
 * 현재는 로컬 타입 정의를 사용하며, 일부 any 타입 단언이 필요할 수 있음
 */

import { getSupabaseAdmin, Database } from './client';

type Agent = Database['public']['Tables']['agents']['Row'];
type AgentInsert = Database['public']['Tables']['agents']['Insert'];
type AgentReputation = Database['public']['Tables']['agent_reputation']['Row'];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type AgentPermission = Database['public']['Tables']['agent_permissions']['Row'];
type AgentSummary = Database['public']['Views']['agent_summary']['Row'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export const agentService = {
  /**
   * 에이전트 등록
   */
  async registerAgent(data: AgentInsert): Promise<Agent | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    
    const { data: agent, error } = await supabase
      .from('agents')
      .insert(data)
      .select()
      .single();
    
    if (error) {
      console.error('[AgentService] Failed to register agent:', error);
      return null;
    }
    
    return agent as Agent;
  },

  /**
   * 에이전트 조회 (agent_id로)
   */
  async getAgentById(agentId: string): Promise<Agent | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('agent_id', agentId)
      .single();
    
    if (error) {
      console.error('[AgentService] Failed to get agent:', error);
      return null;
    }
    
    return data as Agent;
  },

  /**
   * 에이전트 상태 업데이트
   */
  async updateAgentStatus(
    agentId: string, 
    status: 'active' | 'suspended' | 'pending'
  ): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    
    const { error } = await supabase
      .from('agents')
      .update({ status })
      .eq('agent_id', agentId);
    
    if (error) {
      console.error('[AgentService] Failed to update status:', error);
      return false;
    }
    
    return true;
  },

  /**
   * 에이전트 목록 조회 (요약 뷰)
   */
  async listAgents(options?: {
    status?: 'active' | 'suspended' | 'pending';
    limit?: number;
    offset?: number;
  }): Promise<AgentSummary[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    
    let query = supabase
      .from('agent_summary')
      .select('*');
    
    if (options?.status) {
      query = query.eq('status', options.status);
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[AgentService] Failed to list agents:', error);
      return [];
    }
    
    return data || [];
  },

  /**
   * 에이전트 삭제
   */
  async deleteAgent(agentId: string): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('agent_id', agentId);
    
    if (error) {
      console.error('[AgentService] Failed to delete agent:', error);
      return false;
    }
    
    return true;
  },

  /**
   * 에이전트 평판 조회
   */
  async getReputation(agentId: string): Promise<AgentReputation | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    
    const { data, error } = await supabase
      .from('agent_reputation')
      .select('*')
      .eq('agent_id', agentId)
      .single();
    
    if (error) {
      console.error('[AgentService] Failed to get reputation:', error);
      return null;
    }
    
    return data;
  },

  /**
   * 평판 점수 업데이트
   */
  async updateReputationScore(
    agentId: string,
    eventType: string,
    impact: number,
    reason?: string
  ): Promise<{ newScore: number; newLevel: string } | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    
    const { data, error } = await supabase
      .rpc('update_reputation_score', {
        p_agent_id: agentId,
        p_event_type: eventType,
        p_impact: impact,
        p_reason: reason,
      });
    
    if (error) {
      console.error('[AgentService] Failed to update reputation:', error);
      return null;
    }
    
    const result = (data as AnyRecord[])?.[0];
    return result ? { newScore: result.new_score, newLevel: result.new_level } : null;
  },

  /**
   * 에이전트 권한 조회
   */
  async getPermissions(agentId: string): Promise<string[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    
    const { data, error } = await supabase
      .from('agent_permissions')
      .select('permission')
      .eq('agent_id', agentId);
    
    if (error) {
      console.error('[AgentService] Failed to get permissions:', error);
      return [];
    }
    
    return (data as AnyRecord[])?.map(p => p.permission) || [];
  },

  /**
   * 권한 부여
   */
  async grantPermission(
    agentId: string,
    permission: 'read' | 'search' | 'cart' | 'execute' | 'stream' | 'admin',
    grantedBy?: string,
    expiresAt?: Date
  ): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    
    const { error } = await supabase
      .from('agent_permissions')
      .upsert({
        agent_id: agentId,
        permission,
        granted_by: grantedBy,
        expires_at: expiresAt?.toISOString(),
      });
    
    if (error) {
      console.error('[AgentService] Failed to grant permission:', error);
      return false;
    }
    
    return true;
  },

  /**
   * 권한 취소
   */
  async revokePermission(
    agentId: string,
    permission: string
  ): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    
    const { error } = await supabase
      .from('agent_permissions')
      .delete()
      .eq('agent_id', agentId)
      .eq('permission', permission);
    
    if (error) {
      console.error('[AgentService] Failed to revoke permission:', error);
      return false;
    }
    
    return true;
  },

  /**
   * 마지막 활동 시간 업데이트
   */
  async updateLastActive(agentId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    
    await supabase
      .from('agent_reputation')
      .update({ last_active_at: new Date().toISOString() })
      .eq('agent_id', agentId);
  },

  /**
   * 요청 통계 증가
   */
  async incrementRequestStats(agentId: string, success: boolean): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    
    // 현재 값 조회
    const { data: current } = await supabase
      .from('agent_reputation')
      .select('total_requests, successful_requests, failed_requests')
      .eq('agent_id', agentId)
      .single();
    
    const currentData = current as AnyRecord | null;
    if (currentData) {
      await supabase
        .from('agent_reputation')
        .update({
          total_requests: currentData.total_requests + 1,
          successful_requests: success 
            ? currentData.successful_requests + 1 
            : currentData.successful_requests,
          failed_requests: !success 
            ? currentData.failed_requests + 1 
            : currentData.failed_requests,
          last_active_at: new Date().toISOString(),
        })
        .eq('agent_id', agentId);
    }
  },
};

export default agentService;
