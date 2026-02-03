/**
 * AI Agent Sandbox API
 * 실제 실행 전 안전하게 시뮬레이션하는 가상 환경
 * 
 * 특징:
 * - 실제 DB/결제에 영향 없음
 * - 액션 결과 미리보기
 * - 에러 시나리오 테스트
 * - 비용 계산 시뮬레이션
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';

export const runtime = 'edge';

interface SandboxRequest {
  action: string;
  params: Record<string, unknown>;
  scenario?: 'success' | 'error' | 'partial' | 'timeout';
}

interface SimulationResult {
  wouldSucceed: boolean;
  predictedOutcome: {
    status: string;
    message: string;
    data?: unknown;
  };
  sideEffects: {
    description: string;
    reversible: boolean;
    impact: 'low' | 'medium' | 'high';
  }[];
  estimatedCost?: {
    amount: number;
    currency: string;
    breakdown?: { item: string; cost: number }[];
  };
  requiredConfirmations: string[];
  potentialErrors: {
    code: string;
    probability: 'low' | 'medium' | 'high';
    mitigation: string;
  }[];
  executionPlan: {
    step: number;
    action: string;
    description: string;
    canFail: boolean;
  }[];
  recommendations: string[];
}

// 샘플 가격 데이터
const PRODUCT_PRICES: Record<string, number> = {
  'prod-001': 2490000,
  'prod-002': 389000,
  'prod-003': 599000,
  'prod-004': 189000,
  'prod-005': 279000,
};

/**
 * POST /api/agent/sandbox - 샌드박스 시뮬레이션
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const body: SandboxRequest = await request.json();
    const { action, params, scenario = 'success' } = body;

    if (!action) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_ACTION',
          message: 'action 파라미터가 필요합니다.',
        },
      } as ApiResponse<null>, { status: 400 });
    }

    // 시뮬레이션 실행
    const simulation = await simulateAction(action, params, scenario);

    const response: ApiResponse<{
      sandbox: true;
      simulation: SimulationResult;
      disclaimer: string;
    }> = {
      success: true,
      data: {
        sandbox: true,
        simulation,
        disclaimer: '⚠️ 이것은 시뮬레이션 결과입니다. 실제 데이터나 결제에 영향을 주지 않습니다.',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: '1.0.0',
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
        'X-Response-Time': `${Date.now() - startTime}ms`,
        'X-Sandbox-Mode': 'true',
      },
    });

  } catch (error) {
    console.error('[Sandbox] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SIMULATION_FAILED',
        message: '시뮬레이션 중 오류가 발생했습니다.',
      },
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * 액션 시뮬레이션
 */
async function simulateAction(
  action: string,
  params: Record<string, unknown>,
  scenario: string
): Promise<SimulationResult> {
  
  switch (action) {
    case 'purchase':
      return simulatePurchase(params, scenario);
    
    case 'add_to_cart':
      return simulateAddToCart(params, scenario);
    
    case 'subscribe_alert':
      return simulateSubscribe(params, scenario);
    
    default:
      return createGenericSimulation(action, params, scenario);
  }
}

/**
 * 구매 시뮬레이션
 */
function simulatePurchase(
  params: Record<string, unknown>,
  scenario: string
): SimulationResult {
  const items = (params.items || []) as { productId: string; quantity: number }[];
  
  // 비용 계산
  const breakdown = items.map(item => ({
    item: item.productId,
    cost: (PRODUCT_PRICES[item.productId] || 100000) * (item.quantity || 1),
  }));
  const totalAmount = breakdown.reduce((sum, b) => sum + b.cost, 0);
  const shippingCost = totalAmount >= 50000 ? 0 : 3000;
  
  breakdown.push({ item: '배송비', cost: shippingCost });

  const wouldSucceed = scenario === 'success';

  return {
    wouldSucceed,
    predictedOutcome: {
      status: wouldSucceed ? 'order_created' : 'order_failed',
      message: wouldSucceed 
        ? `주문이 성공적으로 생성될 것입니다. 예상 주문번호: ORD-SIM-${Date.now()}`
        : '재고 부족 또는 결제 실패로 주문이 실패할 수 있습니다.',
      data: wouldSucceed ? {
        simulatedOrderId: `ORD-SIM-${Date.now()}`,
        items: items.length,
        estimatedDelivery: '2-3 영업일',
      } : undefined,
    },
    sideEffects: [
      {
        description: '결제 금액이 청구됩니다.',
        reversible: false,
        impact: 'high',
      },
      {
        description: '재고가 감소합니다.',
        reversible: true,
        impact: 'medium',
      },
      {
        description: '주문 확인 이메일이 발송됩니다.',
        reversible: false,
        impact: 'low',
      },
    ],
    estimatedCost: {
      amount: totalAmount + shippingCost,
      currency: 'KRW',
      breakdown,
    },
    requiredConfirmations: [
      '사용자가 구매에 동의했는지 확인하세요.',
      '결제 수단이 유효한지 확인하세요.',
      '배송 주소가 올바른지 확인하세요.',
    ],
    potentialErrors: [
      {
        code: 'INSUFFICIENT_STOCK',
        probability: 'low',
        mitigation: '재고 확인 API를 먼저 호출하세요.',
      },
      {
        code: 'PAYMENT_FAILED',
        probability: 'low',
        mitigation: '결제 수단 유효성을 사전에 검증하세요.',
      },
      {
        code: 'ADDRESS_INVALID',
        probability: 'medium',
        mitigation: '주소 검증 API를 사용하세요.',
      },
    ],
    executionPlan: [
      { step: 1, action: 'validate_cart', description: '장바구니 유효성 검증', canFail: true },
      { step: 2, action: 'check_inventory', description: '재고 확인', canFail: true },
      { step: 3, action: 'reserve_inventory', description: '재고 임시 예약', canFail: true },
      { step: 4, action: 'process_payment', description: '결제 처리', canFail: true },
      { step: 5, action: 'create_order', description: '주문 생성', canFail: false },
      { step: 6, action: 'send_confirmation', description: '확인 메일 발송', canFail: false },
    ],
    recommendations: [
      '💡 구매 전 view_cart 액션으로 장바구니를 확인하세요.',
      '💡 고가 상품의 경우 사용자에게 최종 확인을 받으세요.',
      '💡 결제 실패 시 재시도 전 5초 대기하세요.',
    ],
  };
}

/**
 * 장바구니 추가 시뮬레이션
 */
function simulateAddToCart(
  params: Record<string, unknown>,
  scenario: string
): SimulationResult {
  const productId = params.productId as string;
  const quantity = (params.quantity as number) || 1;
  const price = PRODUCT_PRICES[productId] || 100000;

  const wouldSucceed = scenario !== 'error';

  return {
    wouldSucceed,
    predictedOutcome: {
      status: wouldSucceed ? 'item_added' : 'add_failed',
      message: wouldSucceed
        ? `${productId} x ${quantity}개가 장바구니에 추가될 것입니다.`
        : '재고 부족으로 추가할 수 없습니다.',
    },
    sideEffects: [
      {
        description: '장바구니 상태가 변경됩니다.',
        reversible: true,
        impact: 'low',
      },
    ],
    estimatedCost: {
      amount: price * quantity,
      currency: 'KRW',
    },
    requiredConfirmations: [],
    potentialErrors: [
      {
        code: 'OUT_OF_STOCK',
        probability: 'low',
        mitigation: '재고 상태를 먼저 확인하세요.',
      },
      {
        code: 'MAX_QUANTITY_EXCEEDED',
        probability: 'medium',
        mitigation: '수량을 10개 이하로 제한하세요.',
      },
    ],
    executionPlan: [
      { step: 1, action: 'validate_product', description: '상품 유효성 검증', canFail: true },
      { step: 2, action: 'check_availability', description: '재고 확인', canFail: true },
      { step: 3, action: 'update_cart', description: '장바구니 업데이트', canFail: false },
    ],
    recommendations: [
      '💡 이 액션은 되돌릴 수 있습니다 (clear_cart 사용).',
      '💡 동일 상품 재추가 시 수량이 누적됩니다.',
    ],
  };
}

/**
 * 알림 구독 시뮬레이션
 */
function simulateSubscribe(
  params: Record<string, unknown>,
  scenario: string
): SimulationResult {
  const event = params.event as string;

  return {
    wouldSucceed: scenario !== 'error',
    predictedOutcome: {
      status: 'subscription_created',
      message: `${event} 이벤트에 대한 알림이 설정될 것입니다.`,
    },
    sideEffects: [
      {
        description: '이벤트 발생 시 알림이 전송됩니다.',
        reversible: true,
        impact: 'low',
      },
    ],
    requiredConfirmations: [],
    potentialErrors: [
      {
        code: 'DUPLICATE_SUBSCRIPTION',
        probability: 'low',
        mitigation: '기존 구독 여부를 확인하세요.',
      },
    ],
    executionPlan: [
      { step: 1, action: 'validate_event', description: '이벤트 유형 검증', canFail: true },
      { step: 2, action: 'create_subscription', description: '구독 생성', canFail: false },
    ],
    recommendations: [
      '💡 구독 취소는 unsubscribe 액션을 사용하세요.',
    ],
  };
}

/**
 * 일반 시뮬레이션 (알 수 없는 액션)
 */
function createGenericSimulation(
  action: string,
  params: Record<string, unknown>,
  scenario: string
): SimulationResult {
  return {
    wouldSucceed: scenario === 'success',
    predictedOutcome: {
      status: scenario === 'success' ? 'success' : 'failed',
      message: `'${action}' 액션의 시뮬레이션 결과입니다.`,
      data: params,
    },
    sideEffects: [],
    requiredConfirmations: ['액션 실행 전 파라미터를 확인하세요.'],
    potentialErrors: [
      {
        code: 'UNKNOWN_ERROR',
        probability: 'medium',
        mitigation: 'API 문서를 확인하세요.',
      },
    ],
    executionPlan: [
      { step: 1, action: 'execute', description: action, canFail: true },
    ],
    recommendations: [
      `💡 /api/ai-manifest.json에서 '${action}' 액션의 상세 스펙을 확인하세요.`,
    ],
  };
}

/**
 * GET - 샌드박스 사용법 안내
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      description: 'AI 에이전트 샌드박스 - 실제 실행 전 안전한 시뮬레이션',
      usage: {
        method: 'POST',
        endpoint: '/api/agent/sandbox',
        body: {
          action: '시뮬레이션할 액션 ID (예: purchase, add_to_cart)',
          params: '액션 파라미터',
          scenario: 'success | error | partial | timeout (선택, 기본: success)',
        },
      },
      benefits: [
        '✅ 실제 데이터에 영향 없음',
        '✅ 비용 미리 계산',
        '✅ 잠재적 에러 예측',
        '✅ 실행 계획 확인',
      ],
      example: {
        action: 'purchase',
        params: {
          items: [{ productId: 'prod-001', quantity: 1 }],
          paymentMethod: 'card',
        },
        scenario: 'success',
      },
    },
  });
}
