/**
 * Dashboard Actions API
 * 에이전트가 실행할 수 있는 액션 정의 관리
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';

export const runtime = 'edge';

export interface ActionParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  required: boolean;
  default?: unknown;
  description?: string;
}

export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  requiredPermission: 'read' | 'write' | 'execute' | 'admin';
  confirmationRequired: boolean;
  category: string;
  params: ActionParam[];
  enabled: boolean;
  usageCount?: number;
}

// 기본 액션 정의 (추후 DB로 이전 가능)
const DEFAULT_ACTIONS: ActionDefinition[] = [
  {
    id: 'add_to_cart',
    name: '장바구니 추가',
    description: '상품을 장바구니에 추가합니다',
    requiredPermission: 'write',
    confirmationRequired: false,
    category: 'cart',
    enabled: true,
    params: [
      { name: 'productId', type: 'string', required: true, description: '상품 ID' },
      { name: 'quantity', type: 'number', required: false, default: 1, description: '수량' },
    ],
  },
  {
    id: 'view_cart',
    name: '장바구니 조회',
    description: '현재 장바구니 내용을 조회합니다',
    requiredPermission: 'read',
    confirmationRequired: false,
    category: 'cart',
    enabled: true,
    params: [],
  },
  {
    id: 'clear_cart',
    name: '장바구니 비우기',
    description: '장바구니의 모든 상품을 삭제합니다',
    requiredPermission: 'write',
    confirmationRequired: false,
    category: 'cart',
    enabled: true,
    params: [],
  },
  {
    id: 'purchase',
    name: '구매',
    description: '장바구니 상품을 구매합니다 (사용자 확인 필요)',
    requiredPermission: 'execute',
    confirmationRequired: true,
    category: 'order',
    enabled: true,
    params: [
      { name: 'confirmed', type: 'boolean', required: true, description: '사용자 확인 여부' },
      { name: 'paymentMethod', type: 'string', required: false, description: '결제 수단' },
      { name: 'shippingAddress', type: 'object', required: false, description: '배송지 정보' },
    ],
  },
  {
    id: 'check_order',
    name: '주문 상태 확인',
    description: '주문 상태를 조회합니다',
    requiredPermission: 'read',
    confirmationRequired: false,
    category: 'order',
    enabled: true,
    params: [
      { name: 'orderId', type: 'string', required: true, description: '주문 ID' },
    ],
  },
  {
    id: 'subscribe_alert',
    name: '알림 구독',
    description: '가격 변동, 재입고 등의 알림을 구독합니다',
    requiredPermission: 'write',
    confirmationRequired: false,
    category: 'notification',
    enabled: true,
    params: [
      { name: 'event', type: 'string', required: true, description: '이벤트 타입 (price_drop, restock)' },
      { name: 'targetId', type: 'string', required: false, description: '대상 상품 ID' },
      { name: 'threshold', type: 'number', required: false, description: '알림 기준값' },
    ],
  },
  {
    id: 'search_products',
    name: '상품 검색',
    description: '키워드로 상품을 검색합니다',
    requiredPermission: 'read',
    confirmationRequired: false,
    category: 'search',
    enabled: true,
    params: [
      { name: 'q', type: 'string', required: true, description: '검색어' },
      { name: 'limit', type: 'number', required: false, default: 10, description: '결과 개수' },
      { name: 'category', type: 'string', required: false, description: '카테고리 필터' },
    ],
  },
  {
    id: 'get_product_details',
    name: '상품 상세 조회',
    description: '특정 상품의 상세 정보를 조회합니다',
    requiredPermission: 'read',
    confirmationRequired: false,
    category: 'search',
    enabled: true,
    params: [
      { name: 'productId', type: 'string', required: true, description: '상품 ID' },
    ],
  },
];

/**
 * GET /api/dashboard/actions - 액션 목록 조회
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const enabled = searchParams.get('enabled');

  try {
    let actions = [...DEFAULT_ACTIONS];

    // 카테고리 필터
    if (category && category !== 'all') {
      actions = actions.filter(a => a.category === category);
    }

    // 활성화 상태 필터
    if (enabled !== null) {
      const isEnabled = enabled === 'true';
      actions = actions.filter(a => a.enabled === isEnabled);
    }

    // 카테고리 목록 생성
    const categories = [...new Set(DEFAULT_ACTIONS.map(a => a.category))];

    return NextResponse.json({
      success: true,
      data: {
        actions,
        categories,
        total: actions.length,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
      },
    } as ApiResponse<{ actions: ActionDefinition[]; categories: string[]; total: number }>);

  } catch (error) {
    console.error('[Actions API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '액션 목록을 불러오는데 실패했습니다',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
      },
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * PUT /api/dashboard/actions - 액션 활성화/비활성화
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { actionId, enabled } = body;

    if (!actionId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: 'actionId가 필요합니다',
        },
      } as ApiResponse<null>, { status: 400 });
    }

    const action = DEFAULT_ACTIONS.find(a => a.id === actionId);
    if (!action) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '액션을 찾을 수 없습니다',
        },
      } as ApiResponse<null>, { status: 404 });
    }

    // 메모리에서 상태 변경 (실제로는 DB 업데이트 필요)
    action.enabled = enabled;

    return NextResponse.json({
      success: true,
      data: action,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
      },
    } as ApiResponse<ActionDefinition>);

  } catch (error) {
    console.error('[Actions API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '액션 상태 변경에 실패했습니다',
      },
    } as ApiResponse<null>, { status: 500 });
  }
}
