/**
 * Guardrail Rules API
 * 가드레일 규칙 CRUD
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, Database } from '@/lib/supabase/client';
import type { ApiResponse } from '@/types';

export const runtime = 'edge';

export interface GuardrailRule {
  id: string;
  name: string;
  description: string;
  type: 'limit' | 'rate_limit' | 'confirmation' | 'reputation' | 'sandbox' | 'blacklist';
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// 기본 가드레일 규칙 (DB에 없을 경우)
const DEFAULT_RULES: GuardrailRule[] = [
  {
    id: 'rule-001',
    name: '주문 금액 제한',
    description: '단일 주문의 최대 금액을 제한합니다',
    type: 'limit',
    config: { maxAmount: 1000000, currency: 'KRW' },
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-002',
    name: '일일 요청 제한',
    description: '에이전트당 일일 최대 요청 수를 제한합니다',
    type: 'rate_limit',
    config: { maxRequests: 10000, window: '24h' },
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-003',
    name: '실행 액션 확인 필수',
    description: 'execute 권한의 액션은 사용자 확인이 필요합니다',
    type: 'confirmation',
    config: { requiredFor: ['purchase', 'create_order'] },
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-004',
    name: '신규 에이전트 제한',
    description: '평판 점수 100 미만 에이전트의 기능 제한',
    type: 'reputation',
    config: { minReputation: 100, restrictedActions: ['cart', 'execute'] },
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-005',
    name: '샌드박스 우선',
    description: '위험 액션 실행 전 샌드박스 시뮬레이션 권장',
    type: 'sandbox',
    config: { recommendedFor: ['purchase', 'subscribe'] },
    enabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-006',
    name: '악성 에이전트 차단',
    description: '블랙리스트 에이전트 자동 차단',
    type: 'blacklist',
    config: { autoBlockThreshold: 5 },
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// DB 레코드 타입
interface GuardrailRecord {
  id: string;
  name: string;
  description: string;
  type: string;
  config: unknown;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// 인메모리 저장소 (DB 대체)
let inMemoryRules: GuardrailRule[] = [...DEFAULT_RULES];

/**
 * GET /api/dashboard/guardrails - 가드레일 규칙 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    
    // DB에서 규칙 조회 시도
    const { data, error } = await sb
      .from('guardrail_rules')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      // DB 오류 또는 데이터 없음 - 인메모리 데이터 반환
      return NextResponse.json({
        success: true,
        data: inMemoryRules,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          version: '1.0.0',
          source: 'memory',
        },
      } as ApiResponse<GuardrailRule[]>);
    }

    const typedData = data as GuardrailRecord[];
    const rules: GuardrailRule[] = typedData.map((row: GuardrailRecord) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type as GuardrailRule['type'],
      config: row.config as Record<string, unknown>,
      enabled: row.enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: rules,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
        source: 'database',
      },
    } as ApiResponse<GuardrailRule[]>);

  } catch (error) {
    console.error('[Guardrails API] Error:', error);
    
    return NextResponse.json({
      success: true,
      data: inMemoryRules,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
        source: 'memory',
      },
    } as ApiResponse<GuardrailRule[]>);
  }
}

/**
 * PUT /api/dashboard/guardrails - 가드레일 규칙 업데이트
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, enabled, config, name, description } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'id는 필수입니다.',
        },
      } as ApiResponse<null>, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    // DB 업데이트 시도
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    if (typeof enabled === 'boolean') updateData.enabled = enabled;
    if (config) updateData.config = config;
    if (name) updateData.name = name;
    if (description) updateData.description = description;

    const { error } = await sb
      .from('guardrail_rules')
      .update(updateData)
      .eq('id', id);

    if (error) {
      // DB 오류 - 인메모리 업데이트
      const ruleIndex = inMemoryRules.findIndex(r => r.id === id);
      if (ruleIndex >= 0) {
        inMemoryRules[ruleIndex] = {
          ...inMemoryRules[ruleIndex],
          ...updateData,
          enabled: typeof enabled === 'boolean' ? enabled : inMemoryRules[ruleIndex].enabled,
          config: config || inMemoryRules[ruleIndex].config,
          updatedAt: new Date().toISOString(),
        };
      }
    }

    // 인메모리도 동기화
    const ruleIndex = inMemoryRules.findIndex(r => r.id === id);
    if (ruleIndex >= 0) {
      inMemoryRules[ruleIndex] = {
        ...inMemoryRules[ruleIndex],
        enabled: typeof enabled === 'boolean' ? enabled : inMemoryRules[ruleIndex].enabled,
        config: config || inMemoryRules[ruleIndex].config,
        name: name || inMemoryRules[ruleIndex].name,
        description: description || inMemoryRules[ruleIndex].description,
        updatedAt: new Date().toISOString(),
      };
    }

    return NextResponse.json({
      success: true,
      data: { id, updated: true },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
      },
    });

  } catch (error) {
    console.error('[Guardrails API] Update error:', error);
    
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
 * POST /api/dashboard/guardrails - 새 가드레일 규칙 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, type, config, enabled = false } = body;

    if (!name || !type) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'name과 type은 필수입니다.',
        },
      } as ApiResponse<null>, { status: 400 });
    }

    const newRule: GuardrailRule = {
      id: `rule-${Date.now().toString(36)}`,
      name,
      description: description || '',
      type,
      config: config || {},
      enabled,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const supabase = getSupabaseAdmin();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    // DB에 추가 시도
    const { error } = await sb
      .from('guardrail_rules')
      .insert({
        id: newRule.id,
        name: newRule.name,
        description: newRule.description,
        type: newRule.type,
        config: newRule.config,
        enabled: newRule.enabled,
      });

    // 인메모리에도 추가
    inMemoryRules.push(newRule);

    return NextResponse.json({
      success: true,
      data: newRule,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
      },
    });

  } catch (error) {
    console.error('[Guardrails API] Create error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'CREATE_FAILED',
        message: '생성에 실패했습니다.',
      },
    } as ApiResponse<null>, { status: 500 });
  }
}
