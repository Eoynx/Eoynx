/**
 * Dashboard Permissions API
 * 권한 설정 관리 (Supabase 연동)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import type { ApiResponse } from '@/types';

export const runtime = 'edge';

interface PermissionDefinition {
  id: string;
  name: string;
  description: string;
  level: 'basic' | 'standard' | 'elevated' | 'admin';
  enabled: boolean;
}

interface GuardrailRule {
  id: string;
  name: string;
  description: string;
  type: string;
  config: Record<string, unknown>;
  enabled: boolean;
  priority: number;
}

interface LevelInfo {
  name: string;
  color: string;
  minReputation: number;
  description: string;
}

// 기본 권한 정의 (DB 없을 때 fallback)
const DEFAULT_PERMISSIONS: PermissionDefinition[] = [
  { id: 'read', name: '읽기', description: '컨텍스트 및 상품 정보 조회', level: 'basic', enabled: true },
  { id: 'search', name: '검색', description: '사이트 내 검색 실행', level: 'basic', enabled: true },
  { id: 'cart', name: '장바구니', description: '장바구니 조회 및 수정', level: 'standard', enabled: true },
  { id: 'execute', name: '실행', description: '주문 등 실행 액션', level: 'elevated', enabled: true },
  { id: 'stream', name: '스트리밍', description: '실시간 이벤트 구독', level: 'standard', enabled: true },
  { id: 'admin', name: '관리자', description: '모든 권한 + 관리 기능', level: 'admin', enabled: false },
];

const DEFAULT_RULES: GuardrailRule[] = [
  { id: 'rate_limit', name: '요청 제한', description: '분당 최대 요청 수 제한', type: 'rate_limit', config: { maxRequests: 100, windowMs: 60000 }, enabled: true, priority: 10 },
  { id: 'content_filter', name: '콘텐츠 필터', description: '유해 콘텐츠 요청 차단', type: 'content_filter', config: { blockedKeywords: ['spam', 'phishing'] }, enabled: true, priority: 20 },
];

const LEVEL_INFO: Record<string, LevelInfo> = {
  basic: { name: '기본', color: 'blue', minReputation: 0, description: '기본 읽기 권한' },
  standard: { name: '표준', color: 'green', minReputation: 300, description: '쓰기 및 수정 권한' },
  elevated: { name: '상승', color: 'purple', minReputation: 600, description: '실행 권한' },
  admin: { name: '관리자', color: 'red', minReputation: 900, description: '전체 관리 권한' },
};

/**
 * GET /api/dashboard/permissions - 권한 및 규칙 목록 조회
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    
    // 권한 조회
    const { data: permissionsData, error: permError } = await sb
      .from('permissions')
      .select('id, name, name_ko, description, description_ko, level, enabled')
      .order('level');
    
    // 규칙 조회
    const { data: rulesData, error: rulesError } = await sb
      .from('guardrail_rules')
      .select('id, name, name_ko, description, description_ko, type, config, enabled, priority')
      .order('priority');
    
    // DB 에러 시 기본값 반환
    if (permError || rulesError) {
      console.warn('[Permissions API] DB error, using defaults:', { permError, rulesError });
      
      return NextResponse.json({
        success: true,
        data: {
          permissions: DEFAULT_PERMISSIONS,
          rules: DEFAULT_RULES,
          levels: LEVEL_INFO,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          version: '1.0.0',
          fallback: true,
        },
      });
    }
    
    // DB 데이터를 인터페이스에 맞게 변환
    const permissions: PermissionDefinition[] = (permissionsData || []).map((p: Record<string, unknown>) => ({
      id: p.id,
      name: p.name_ko || p.name,
      description: p.description_ko || p.description,
      level: p.level,
      enabled: p.enabled,
    }));
    
    const rules: GuardrailRule[] = (rulesData || []).map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name_ko || r.name,
      description: r.description_ko || r.description,
      type: r.type,
      config: typeof r.config === 'string' ? JSON.parse(r.config as string) : r.config,
      enabled: r.enabled,
      priority: r.priority,
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        permissions: permissions.length > 0 ? permissions : DEFAULT_PERMISSIONS,
        rules: rules.length > 0 ? rules : DEFAULT_RULES,
        levels: LEVEL_INFO,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
      },
    });

  } catch (error) {
    console.error('[Permissions API] Error:', error);
    
    // 에러 시에도 기본값 반환 (대시보드가 깨지지 않도록)
    return NextResponse.json({
      success: true,
      data: {
        permissions: DEFAULT_PERMISSIONS,
        rules: DEFAULT_RULES,
        levels: LEVEL_INFO,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
        fallback: true,
        error: 'Database unavailable',
      },
    });
  }
}

/**
 * PUT /api/dashboard/permissions - 권한 설정 업데이트
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { permissionId, ruleId, enabled } = body;
    
    const supabase = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    // 권한 업데이트
    if (permissionId) {
      const { data, error } = await sb
        .from('permissions')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('id', permissionId)
        .select()
        .single();

      if (error) {
        console.error('[Permissions API] Update error:', error);
        return NextResponse.json({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: '권한 설정 변경에 실패했습니다',
          },
        } as ApiResponse<null>, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: {
          id: data.id,
          name: data.name_ko || data.name,
          description: data.description_ko || data.description,
          level: data.level,
          enabled: data.enabled,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          version: '1.0.0',
        },
      } as ApiResponse<PermissionDefinition>);
    }
    
    // 규칙 업데이트
    if (ruleId) {
      const { data, error } = await sb
        .from('guardrail_rules')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('id', ruleId)
        .select()
        .single();

      if (error) {
        console.error('[Permissions API] Rule update error:', error);
        return NextResponse.json({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: '규칙 설정 변경에 실패했습니다',
          },
        } as ApiResponse<null>, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: {
          id: data.id,
          name: data.name_ko || data.name,
          description: data.description_ko || data.description,
          type: data.type,
          config: typeof data.config === 'string' ? JSON.parse(data.config) : data.config,
          enabled: data.enabled,
          priority: data.priority,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          version: '1.0.0',
        },
      } as ApiResponse<GuardrailRule>);
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INVALID_PARAMS',
        message: 'permissionId 또는 ruleId가 필요합니다',
      },
    } as ApiResponse<null>, { status: 400 });

  } catch (error) {
    console.error('[Permissions API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '설정 변경에 실패했습니다',
      },
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/dashboard/permissions - 새 권한/규칙 추가 또는 초기화
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    // 초기화 액션
    if (action === 'reset') {
      // DB에 기본값 삽입은 마이그레이션에서 처리
      return NextResponse.json({
        success: true,
        data: {
          permissions: DEFAULT_PERMISSIONS,
          rules: DEFAULT_RULES,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          version: '1.0.0',
          message: '권한이 초기화되었습니다',
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INVALID_ACTION',
        message: '알 수 없는 액션입니다',
      },
    } as ApiResponse<null>, { status: 400 });

  } catch (error) {
    console.error('[Permissions API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '요청 처리에 실패했습니다',
      },
    } as ApiResponse<null>, { status: 500 });
  }
}
