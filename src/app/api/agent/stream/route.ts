/**
 * SSE (Server-Sent Events) 실시간 스트리밍 API
 * AI 에이전트에게 실시간 이벤트를 푸시합니다
 * 
 * 사용 사례:
 * - 재고 변동 알림
 * - 가격 변동 알림
 * - 주문 상태 업데이트
 * - 시스템 상태 변경
 */

import { NextRequest } from 'next/server';

export const runtime = 'edge';

// 이벤트 타입 정의
interface StreamEvent {
  type: 'price_update' | 'stock_update' | 'order_status' | 'system_alert' | 'heartbeat';
  data: unknown;
  timestamp: string;
}

/**
 * GET /api/agent/stream - SSE 스트림 연결
 * 
 * Query params:
 * - events: 구독할 이벤트 유형 (comma-separated)
 * - productIds: 모니터링할 상품 ID (comma-separated)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // 구독 설정
  const eventTypes = searchParams.get('events')?.split(',') || ['all'];
  const productIds = searchParams.get('productIds')?.split(',') || [];
  const agentId = request.headers.get('x-agent-id') || 'anonymous';

  console.log(`[Stream] Agent ${agentId} connected, events: ${eventTypes.join(',')}`);

  // ReadableStream 생성
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // 연결 확인 이벤트
      const welcomeEvent: StreamEvent = {
        type: 'system_alert',
        data: {
          message: 'Connected to Agent-Gateway stream',
          agentId,
          subscribedEvents: eventTypes,
          monitoredProducts: productIds,
        },
        timestamp: new Date().toISOString(),
      };
      controller.enqueue(encoder.encode(formatSSE(welcomeEvent)));

      // 시뮬레이션용 이벤트 생성기
      let eventCount = 0;
      const maxEvents = 100; // 최대 이벤트 수 (데모용)
      
      const interval = setInterval(() => {
        if (eventCount >= maxEvents) {
          clearInterval(interval);
          controller.close();
          return;
        }

        const event = generateSimulatedEvent(eventTypes, productIds);
        if (event) {
          controller.enqueue(encoder.encode(formatSSE(event)));
          eventCount++;
        }
      }, 5000); // 5초마다 이벤트 발생 (데모용)

      // Heartbeat - 30초마다
      const heartbeat = setInterval(() => {
        const heartbeatEvent: StreamEvent = {
          type: 'heartbeat',
          data: { status: 'alive' },
          timestamp: new Date().toISOString(),
        };
        controller.enqueue(encoder.encode(formatSSE(heartbeatEvent)));
      }, 30000);

      // 연결 종료 시 정리
      request.signal.addEventListener('abort', () => {
        console.log(`[Stream] Agent ${agentId} disconnected`);
        clearInterval(interval);
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx용
    },
  });
}

/**
 * SSE 포맷으로 변환
 */
function formatSSE(event: StreamEvent): string {
  const lines = [
    `event: ${event.type}`,
    `data: ${JSON.stringify(event.data)}`,
    `id: ${Date.now()}`,
    '', // 빈 줄로 이벤트 구분
    '',
  ];
  return lines.join('\n');
}

/**
 * 시뮬레이션 이벤트 생성 (데모용)
 */
function generateSimulatedEvent(
  eventTypes: string[],
  productIds: string[]
): StreamEvent | null {
  const shouldAll = eventTypes.includes('all');
  const eventPool: StreamEvent[] = [];

  // 가격 변동 이벤트
  if (shouldAll || eventTypes.includes('price_update')) {
    const products = [
      { id: 'prod-001', name: '프리미엄 노트북 Pro 16', oldPrice: 2490000, newPrice: 2290000 },
      { id: 'prod-002', name: '무선 노이즈캔슬링 헤드폰', oldPrice: 389000, newPrice: 349000 },
      { id: 'prod-003', name: '스마트 워치 시리즈 9', oldPrice: 599000, newPrice: 569000 },
    ];
    const product = products[Math.floor(Math.random() * products.length)];
    
    if (productIds.length === 0 || productIds.includes(product.id)) {
      eventPool.push({
        type: 'price_update',
        data: {
          productId: product.id,
          productName: product.name,
          oldPrice: product.oldPrice,
          newPrice: product.newPrice,
          changePercent: Math.round((1 - product.newPrice / product.oldPrice) * 100),
          currency: 'KRW',
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 재고 변동 이벤트
  if (shouldAll || eventTypes.includes('stock_update')) {
    const stockChanges = [
      { id: 'prod-003', name: '스마트 워치 시리즈 9', stock: 5, status: 'low_stock' },
      { id: 'prod-005', name: '4K 웹캠 Pro', stock: 50, status: 'restocked' },
      { id: 'prod-001', name: '프리미엄 노트북 Pro 16', stock: 0, status: 'out_of_stock' },
    ];
    const change = stockChanges[Math.floor(Math.random() * stockChanges.length)];
    
    if (productIds.length === 0 || productIds.includes(change.id)) {
      eventPool.push({
        type: 'stock_update',
        data: {
          productId: change.id,
          productName: change.name,
          currentStock: change.stock,
          status: change.status,
          alert: change.stock < 10 ? '재고가 얼마 남지 않았습니다' : null,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 시스템 알림 이벤트
  if (shouldAll || eventTypes.includes('system_alert')) {
    const alerts = [
      { level: 'info', message: '새로운 상품이 입고되었습니다', action: 'check_new_arrivals' },
      { level: 'warning', message: '일부 서비스 점검 중입니다', action: 'retry_later' },
      { level: 'info', message: '특별 할인 이벤트가 진행 중입니다', action: 'check_promotions' },
    ];
    const alert = alerts[Math.floor(Math.random() * alerts.length)];
    
    eventPool.push({
      type: 'system_alert',
      data: {
        level: alert.level,
        message: alert.message,
        suggestedAction: alert.action,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // 랜덤하게 하나 선택 또는 null 반환 (50% 확률로 이벤트 발생)
  if (eventPool.length === 0 || Math.random() > 0.5) {
    return null;
  }
  
  return eventPool[Math.floor(Math.random() * eventPool.length)];
}

/**
 * POST /api/agent/stream - 이벤트 발행 (내부용)
 */
export async function POST(request: NextRequest) {
  // 인증 확인
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const event: StreamEvent = await request.json();
    
    // 실제 구현에서는 Redis Pub/Sub 또는 유사한 시스템을 통해 
    // 연결된 모든 클라이언트에게 이벤트를 브로드캐스트합니다
    
    console.log(`[Stream] Event published: ${event.type}`);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Event published',
      event: event.type,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid event format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
