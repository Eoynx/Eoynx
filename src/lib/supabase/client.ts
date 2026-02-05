/**
 * Supabase 클라이언트 초기화
 * Edge Runtime 및 서버 사이드에서 사용
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 환경 변수 타입
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 타입 정의 (Supabase CLI에서 생성된 타입과 호환)
export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string;
          agent_id: string;
          name: string;
          provider: string;
          description: string | null;
          status: 'active' | 'suspended' | 'pending';
          api_key_hash: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          name: string;
          provider: string;
          description?: string | null;
          status?: 'active' | 'suspended' | 'pending';
          api_key_hash?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          name?: string;
          provider?: string;
          description?: string | null;
          status?: 'active' | 'suspended' | 'pending';
          api_key_hash?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      agent_reputation: {
        Row: {
          id: string;
          agent_id: string;
          score: number;
          level: 'new' | 'basic' | 'trusted' | 'verified' | 'elite';
          total_requests: number;
          successful_requests: number;
          failed_requests: number;
          last_active_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          score?: number;
          level?: 'new' | 'basic' | 'trusted' | 'verified' | 'elite';
          total_requests?: number;
          successful_requests?: number;
          failed_requests?: number;
          last_active_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          score?: number;
          level?: 'new' | 'basic' | 'trusted' | 'verified' | 'elite';
          total_requests?: number;
          successful_requests?: number;
          failed_requests?: number;
          last_active_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      agent_permissions: {
        Row: {
          id: string;
          agent_id: string;
          permission: 'read' | 'search' | 'cart' | 'execute' | 'stream' | 'admin';
          granted_at: string;
          granted_by: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          agent_id: string;
          permission: 'read' | 'search' | 'cart' | 'execute' | 'stream' | 'admin';
          granted_at?: string;
          granted_by?: string | null;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          agent_id?: string;
          permission?: 'read' | 'search' | 'cart' | 'execute' | 'stream' | 'admin';
          granted_at?: string;
          granted_by?: string | null;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      request_logs: {
        Row: {
          id: string;
          agent_id: string | null;
          method: string;
          endpoint: string;
          status_code: number | null;
          duration_ms: number | null;
          request_body: Record<string, unknown> | null;
          response_summary: Record<string, unknown> | null;
          ip_address: string | null;
          user_agent: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id?: string | null;
          method: string;
          endpoint: string;
          status_code?: number | null;
          duration_ms?: number | null;
          request_body?: Record<string, unknown> | null;
          response_summary?: Record<string, unknown> | null;
          ip_address?: string | null;
          user_agent?: string | null;
          error_message?: string;
        };
        Update: Partial<Database['public']['Tables']['request_logs']['Insert']>;
      };
      action_logs: {
        Row: {
          id: string;
          agent_id: string;
          action_name: string;
          action_params: Record<string, unknown> | null;
          result: Record<string, unknown> | null;
          status: 'success' | 'failed' | 'pending' | 'cancelled';
          execution_time_ms: number | null;
          requires_confirmation: boolean;
          confirmed_at: string | null;
          created_at: string;
        };
        Insert: {
          agent_id: string;
          action_name: string;
          action_params?: Record<string, unknown>;
          result?: Record<string, unknown>;
          status?: 'success' | 'failed' | 'pending' | 'cancelled';
          execution_time_ms?: number;
          requires_confirmation?: boolean;
        };
        Update: Partial<Database['public']['Tables']['action_logs']['Insert']>;
      };
      guardrail_rules: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          rule_type: string;
          config: Record<string, unknown>;
          enabled: boolean;
          priority: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          description?: string;
          rule_type: string;
          config: Record<string, unknown>;
          enabled?: boolean;
          priority?: number;
        };
        Update: Partial<Database['public']['Tables']['guardrail_rules']['Insert']>;
      };
      violations: {
        Row: {
          id: string;
          agent_id: string;
          rule_id: string | null;
          violation_type: string;
          details: Record<string, unknown> | null;
          severity: 'low' | 'medium' | 'high' | 'critical';
          resolved: boolean;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          agent_id: string;
          rule_id?: string;
          violation_type: string;
          details?: Record<string, unknown>;
          severity?: 'low' | 'medium' | 'high' | 'critical';
        };
        Update: Partial<Database['public']['Tables']['violations']['Insert']>;
      };
    };
    Views: {
      agent_summary: {
        Row: {
          id: string;
          agent_id: string;
          name: string;
          provider: string;
          status: string;
          created_at: string;
          reputation_score: number;
          reputation_level: string;
          total_requests: number;
          successful_requests: number;
          last_active_at: string | null;
          success_rate: number;
          permissions: string[];
        };
      };
      recent_activity: {
        Row: {
          id: string;
          agent_id: string;
          agent_name: string;
          method: string;
          endpoint: string;
          status_code: number;
          duration_ms: number;
          created_at: string;
        };
      };
    };
    Functions: {
      update_reputation_score: {
        Args: {
          p_agent_id: string;
          p_event_type: string;
          p_impact: number;
          p_reason?: string;
        };
        Returns: {
          new_score: number;
          new_level: string;
        };
      };
    };
  };
};

// 싱글톤 인스턴스
let supabaseClient: SupabaseClient<Database> | null = null;
let supabaseAdminClient: SupabaseClient<Database> | null = null;

// 더미 클라이언트 (빌드 타임 또는 환경 변수 없을 때 사용)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createDummyClient = (): SupabaseClient<Database> => {
  console.warn('[Supabase] Environment variables not configured, using dummy client');
  return {
    from: () => ({
      select: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      update: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      delete: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
};

/**
 * 일반 클라이언트 (anon key)
 * 클라이언트 사이드 및 RLS가 적용된 쿼리용
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  // 환경 변수가 없으면 더미 클라이언트 반환 (빌드 타임 안전 처리)
  if (!supabaseUrl || !supabaseAnonKey) {
    return createDummyClient();
  }
  
  if (!supabaseClient) {
    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    });
  }
  return supabaseClient;
}

/**
 * 관리자 클라이언트 (service role key)
 * 서버 사이드 전용, RLS 우회
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  // 환경 변수가 없으면 더미 클라이언트 반환 (빌드 타임 안전 처리)
  if (!supabaseUrl || !supabaseServiceKey) {
    return createDummyClient();
  }
  
  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseAdminClient;
}

// 편의를 위한 기본 export - 빌드 타임 안전 처리
export const supabase = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return createDummyClient();
  }
  return typeof window === 'undefined' && supabaseServiceKey
    ? getSupabaseAdmin()
    : getSupabaseClient();
})();
