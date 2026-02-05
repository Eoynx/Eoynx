/**
 * AI Agent Action Execution API
 * AI 에이전트가 명령어를 던지는 컨트롤 타워
 * 
 * 클릭 대신 구조화된 명령으로 액션 실행
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { ApiResponse, AgentPermissionLevel } from '@/types';

export const runtime = 'edge';

// 액션 정의
interface ActionDefinition {
  id: string;
  name: string;
  requiredPermission: AgentPermissionLevel;
  confirmationRequired: boolean;
  handler: (params: Record<string, unknown>, context: ActionContext) => Promise<ActionResult>;
}

interface ActionContext {
  agentId: string;
  permissions: AgentPermissionLevel[];
  requestId: string;
  timestamp: Date;
}

interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
  nextSteps?: string[];
  warnings?: string[];
}

// 메모리 저장소 (DB 미연결 시 폴백)
const carts = new Map<string, { items: { productId: string; quantity: number }[] }>();
const orders = new Map<string, {
  orderId: string;
  items: { productId: string; quantity: number; price: number }[];
  total: number;
  status: string;
  createdAt: string;
}>();

// Supabase 헬퍼 함수들
async function getCartFromDB(agentId: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('agent_carts' as never)
      .select('*')
      .eq('agent_id', agentId)
      .single();
    
    if (error || !data) {
      // 메모리에서 가져오기
      return carts.get(agentId) || { items: [] };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { items: (data as any).items || [] };
  } catch {
    return carts.get(agentId) || { items: [] };
  }
}

async function saveCartToDB(agentId: string, items: { productId: string; quantity: number }[]) {
  try {
    const supabase = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('agent_carts')
      .upsert({
        agent_id: agentId,
        items,
        updated_at: new Date().toISOString(),
      });
    
    if (error) {
      // 메모리에 저장
      carts.set(agentId, { items });
    }
  } catch {
    carts.set(agentId, { items });
  }
}

async function saveOrderToDB(order: {
  orderId: string;
  agentId: string;
  items: { productId: string; quantity: number; price: number }[];
  total: number;
  status: string;
}) {
  try {
    const supabase = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('agent_orders')
      .insert({
        id: order.orderId,
        agent_id: order.agentId,
        items: order.items,
        total: order.total,
        status: order.status,
        created_at: new Date().toISOString(),
      });
    
    if (error) {
      // 메모리에 저장
      orders.set(order.orderId, {
        ...order,
        createdAt: new Date().toISOString(),
      });
    }
  } catch {
    orders.set(order.orderId, {
      ...order,
      createdAt: new Date().toISOString(),
    });
  }
}

async function getOrderFromDB(orderId: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('agent_orders' as never)
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (error || !data) {
      return orders.get(orderId);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as any;
    return {
      orderId: d.id,
      items: d.items,
      total: d.total,
      status: d.status,
      createdAt: d.created_at,
    };
  } catch {
    return orders.get(orderId);
  }
}

async function clearCartInDB(agentId: string) {
  try {
    const supabase = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('agent_carts')
      .delete()
      .eq('agent_id', agentId);
    
    if (error) {
      carts.delete(agentId);
    }
  } catch {
    carts.delete(agentId);
  }
}

// 액션 핸들러 정의
const actionHandlers: Record<string, ActionDefinition> = {
  // 장바구니 추가
  add_to_cart: {
    id: 'add_to_cart',
    name: '장바구니 추가',
    requiredPermission: 'write',
    confirmationRequired: false,
    handler: async (params, context) => {
      const { productId, quantity = 1 } = params as { productId: string; quantity?: number };
      
      if (!productId) {
        return {
          success: false,
          message: 'productId가 필요합니다.',
        };
      }

      // DB에서 장바구니 가져오기
      const cart = await getCartFromDB(context.agentId);

      // 기존 항목 확인
      const existingItem = cart.items.find((item: { productId: string; quantity: number }) => item.productId === productId);
      if (existingItem) {
        existingItem.quantity += quantity as number;
      } else {
        cart.items.push({ productId, quantity: quantity as number });
      }

      // DB에 저장
      await saveCartToDB(context.agentId, cart.items);

      return {
        success: true,
        message: `${productId}를 장바구니에 ${quantity}개 추가했습니다.`,
        data: {
          cartId: context.agentId,
          itemCount: cart.items.length,
          items: cart.items,
        },
        nextSteps: [
          '장바구니 조회: action=view_cart',
          '결제 진행: action=purchase (사용자 확인 필요)',
        ],
      };
    },
  },

  // 장바구니 조회
  view_cart: {
    id: 'view_cart',
    name: '장바구니 조회',
    requiredPermission: 'read',
    confirmationRequired: false,
    handler: async (_params, context) => {
      // DB에서 장바구니 가져오기
      const cart = await getCartFromDB(context.agentId);
      
      if (!cart || cart.items.length === 0) {
        return {
          success: true,
          message: '장바구니가 비어있습니다.',
          data: { items: [], total: 0 },
          nextSteps: ['상품 검색: GET /api/agent/search?q=키워드'],
        };
      }

      // 가격 계산 (데모용 고정 가격)
      const priceMap: Record<string, number> = {
        'prod-001': 2490000,
        'prod-002': 389000,
        'prod-003': 599000,
        'prod-004': 189000,
        'prod-005': 279000,
      };

      const itemsWithPrice = cart.items.map((item: { productId: string; quantity: number }) => ({
        ...item,
        price: priceMap[item.productId] || 100000,
        subtotal: (priceMap[item.productId] || 100000) * item.quantity,
      }));

      const total = itemsWithPrice.reduce((sum: number, item: { subtotal: number }) => sum + item.subtotal, 0);

      return {
        success: true,
        message: `장바구니에 ${cart.items.length}개 종류의 상품이 있습니다.`,
        data: {
          items: itemsWithPrice,
          itemCount: cart.items.length,
          total,
          currency: 'KRW',
        },
        nextSteps: [
          '결제 진행: action=purchase, confirmed=true',
          '장바구니 비우기: action=clear_cart',
        ],
      };
    },
  },

  // 장바구니 비우기
  clear_cart: {
    id: 'clear_cart',
    name: '장바구니 비우기',
    requiredPermission: 'write',
    confirmationRequired: false,
    handler: async (_params, context) => {
      // DB에서 삭제
      await clearCartInDB(context.agentId);
      
      return {
        success: true,
        message: '장바구니를 비웠습니다.',
        data: { items: [], total: 0 },
      };
    },
  },

  // 구매 (사용자 확인 필요)
  purchase: {
    id: 'purchase',
    name: '구매',
    requiredPermission: 'execute',
    confirmationRequired: true,
    handler: async (params, context) => {
      const { confirmed, paymentMethod, shippingAddress } = params as {
        confirmed?: boolean;
        paymentMethod?: string;
        shippingAddress?: object;
      };

      // 확인 여부 체크
      if (!confirmed) {
        return {
          success: false,
          message: '구매 액션은 사용자 확인이 필요합니다.',
          data: {
            requiresConfirmation: true,
            confirmationMessage: '정말 구매를 진행하시겠습니까?',
            retryWith: { action: 'purchase', confirmed: true, paymentMethod, shippingAddress },
          },
          warnings: ['이 액션은 되돌릴 수 없습니다.'],
        };
      }

      // DB에서 장바구니 가져오기
      const cart = await getCartFromDB(context.agentId);
      if (!cart || cart.items.length === 0) {
        return {
          success: false,
          message: '장바구니가 비어있습니다.',
          nextSteps: ['먼저 상품을 장바구니에 추가하세요: action=add_to_cart'],
        };
      }

      // 주문 생성
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const priceMap: Record<string, number> = {
        'prod-001': 2490000,
        'prod-002': 389000,
        'prod-003': 599000,
        'prod-004': 189000,
        'prod-005': 279000,
      };

      const orderItems = cart.items.map((item: { productId: string; quantity: number }) => ({
        ...item,
        price: priceMap[item.productId] || 100000,
      }));

      const total = orderItems.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0);

      // DB에 주문 저장
      await saveOrderToDB({
        orderId,
        agentId: context.agentId,
        items: orderItems,
        total,
        status: 'confirmed',
      });
      
      // 장바구니 비우기
      await clearCartInDB(context.agentId);

      return {
        success: true,
        message: `주문이 완료되었습니다. 주문번호: ${orderId}`,
        data: {
          orderId,
          items: orderItems,
          total,
          currency: 'KRW',
          status: 'confirmed',
          estimatedDelivery: '2-3 영업일',
        },
        nextSteps: [
          `주문 상태 확인: action=check_order, orderId=${orderId}`,
          '새로운 검색: GET /api/agent/search',
        ],
      };
    },
  },

  // 주문 상태 확인
  check_order: {
    id: 'check_order',
    name: '주문 상태 확인',
    requiredPermission: 'read',
    confirmationRequired: false,
    handler: async (params) => {
      const { orderId } = params as { orderId: string };
      
      if (!orderId) {
        return {
          success: false,
          message: 'orderId가 필요합니다.',
        };
      }

      // DB에서 주문 가져오기
      const order = await getOrderFromDB(orderId);
      if (!order) {
        return {
          success: false,
          message: `주문을 찾을 수 없습니다: ${orderId}`,
        };
      }

      return {
        success: true,
        message: `주문 ${orderId}의 상태: ${order.status}`,
        data: order,
      };
    },
  },

  // 알림 구독
  subscribe_alert: {
    id: 'subscribe_alert',
    name: '알림 구독',
    requiredPermission: 'write',
    confirmationRequired: false,
    handler: async (params, context) => {
      const { event, targetId, threshold } = params as {
        event: string;
        targetId?: string;
        threshold?: number;
      };

      if (!event) {
        return {
          success: false,
          message: 'event 파라미터가 필요합니다.',
          data: {
            availableEvents: ['price_drop', 'restock', 'new_arrival'],
          },
        };
      }

      const subscriptionId = `SUB-${Date.now()}`;

      return {
        success: true,
        message: `알림 구독이 완료되었습니다.`,
        data: {
          subscriptionId,
          event,
          targetId,
          threshold,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        nextSteps: [
          '구독 취소: action=unsubscribe, subscriptionId=' + subscriptionId,
        ],
      };
    },
  },
};

/**
 * POST /api/agent/action - 액션 실행
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get('x-gateway-request-id') || crypto.randomUUID();

  try {
    const body = await request.json();
    const { action, params = {}, confirmed } = body;

    // 액션 파라미터 검증
    if (!action) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_ACTION',
          message: 'action 파라미터가 필요합니다.',
          availableActions: Object.keys(actionHandlers),
        },
      } as ApiResponse<null>, { status: 400 });
    }

    // 액션 핸들러 찾기
    const actionDef = actionHandlers[action];
    if (!actionDef) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNKNOWN_ACTION',
          message: `알 수 없는 액션: ${action}`,
          availableActions: Object.keys(actionHandlers).map(id => ({
            id,
            name: actionHandlers[id].name,
            requiredPermission: actionHandlers[id].requiredPermission,
            confirmationRequired: actionHandlers[id].confirmationRequired,
          })),
        },
      } as ApiResponse<null>, { status: 400 });
    }

    // 권한 확인 (간단한 구현)
    const agentId = request.headers.get('x-verified-agent-id') || 'anonymous';
    const permissions: AgentPermissionLevel[] = getAgentPermissions(agentId);

    if (!hasPermission(permissions, actionDef.requiredPermission)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `이 액션은 '${actionDef.requiredPermission}' 권한이 필요합니다.`,
          yourPermissions: permissions,
        },
      } as ApiResponse<null>, { status: 403 });
    }

    // 컨텍스트 생성
    const context: ActionContext = {
      agentId,
      permissions,
      requestId,
      timestamp: new Date(),
    };

    // confirmed 파라미터 병합
    const fullParams = { ...params, confirmed };

    // 액션 실행
    const result = await actionDef.handler(fullParams, context);

    // 응답 생성
    const response: ApiResponse<ActionResult> = {
      success: result.success,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: '1.0.0',
      },
    };

    if (!result.success) {
      return NextResponse.json(response, {
        status: result.data && (result.data as any).requiresConfirmation ? 428 : 400,
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': `${Date.now() - startTime}ms`,
        },
      });
    }

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
        'X-Response-Time': `${Date.now() - startTime}ms`,
        'X-Action-Id': action,
      },
    });

  } catch (error) {
    console.error('[Action] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'ACTION_EXECUTION_FAILED',
        message: '액션 실행 중 오류가 발생했습니다.',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: '1.0.0',
      },
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * GET /api/agent/action - 사용 가능한 액션 목록
 */
export async function GET() {
  const actions = Object.values(actionHandlers).map(action => ({
    id: action.id,
    name: action.name,
    requiredPermission: action.requiredPermission,
    confirmationRequired: action.confirmationRequired,
  }));

  return NextResponse.json({
    success: true,
    data: {
      actions,
      usage: {
        method: 'POST',
        endpoint: '/api/agent/action',
        body: {
          action: 'action_id',
          params: { '...': 'action-specific parameters' },
          confirmed: 'boolean (required for some actions)',
        },
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      version: '1.0.0',
    },
  });
}

// 헬퍼 함수
function getAgentPermissions(agentId: string): AgentPermissionLevel[] {
  const permissionMap: Record<string, AgentPermissionLevel[]> = {
    'openai': ['read', 'write', 'execute'],
    'anthropic': ['read', 'write', 'execute'],
    'google': ['read', 'write'],
    'demo-agent': ['read', 'write'],
    'anonymous': ['read'],
  };
  return permissionMap[agentId] || permissionMap['anonymous'];
}

function hasPermission(
  permissions: AgentPermissionLevel[],
  required: AgentPermissionLevel
): boolean {
  const hierarchy: Record<AgentPermissionLevel, number> = {
    'read': 1,
    'write': 2,
    'execute': 3,
    'admin': 4,
  };
  const requiredLevel = hierarchy[required];
  return permissions.some(p => hierarchy[p] >= requiredLevel);
}
