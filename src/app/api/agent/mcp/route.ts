/**
 * MCP (Model Context Protocol) Handler
 * AI 에이전트가 사이트 내의 '도구(Tool)'를 직접 호출하는 표준 프로토콜
 * 
 * JSON-RPC 2.0 기반으로 구현
 * 참조: https://modelcontextprotocol.io/
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// MCP 프로토콜 버전
const MCP_VERSION = '2024-11-05';
const SERVER_NAME = 'agent-gateway';
const SERVER_VERSION = '1.0.0';

// JSON-RPC 2.0 타입 정의
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// MCP Tool 정의
interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

// MCP Resource 정의
interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// 사용 가능한 도구 목록
const TOOLS: McpTool[] = [
  {
    name: 'search_products',
    description: '상품을 검색합니다. 키워드, 카테고리, 가격 범위로 필터링 가능합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '검색 키워드' },
        category: { type: 'string', description: '카테고리 필터', enum: ['electronics', 'wearables', 'accessories'] },
        minPrice: { type: 'number', description: '최소 가격' },
        maxPrice: { type: 'number', description: '최대 가격' },
        limit: { type: 'number', description: '결과 수 제한 (기본: 10)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_product_details',
    description: '특정 상품의 상세 정보를 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: '상품 ID' },
      },
      required: ['productId'],
    },
  },
  {
    name: 'add_to_cart',
    description: '상품을 장바구니에 추가합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: '상품 ID' },
        quantity: { type: 'number', description: '수량 (기본: 1)' },
      },
      required: ['productId'],
    },
  },
  {
    name: 'view_cart',
    description: '현재 장바구니 내용을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_order',
    description: '주문을 생성합니다. 사용자 확인이 필요합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        paymentMethod: { type: 'string', description: '결제 방식', enum: ['card', 'bank_transfer', 'mobile'] },
        confirmed: { type: 'boolean', description: '사용자 확인 여부 (필수: true)' },
      },
      required: ['paymentMethod', 'confirmed'],
    },
  },
  {
    name: 'get_site_status',
    description: '현재 사이트 상태와 주요 정보를 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'subscribe_notification',
    description: '특정 이벤트에 대한 알림을 구독합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        event: { type: 'string', description: '이벤트 유형', enum: ['price_drop', 'restock', 'new_arrival'] },
        productId: { type: 'string', description: '대상 상품 ID (선택)' },
        threshold: { type: 'number', description: '가격 임계값 (price_drop 이벤트용)' },
      },
      required: ['event'],
    },
  },
];

// 사용 가능한 리소스 목록
const RESOURCES: McpResource[] = [
  {
    uri: 'gateway://catalog/products',
    name: '상품 카탈로그',
    description: '전체 상품 목록',
    mimeType: 'application/json',
  },
  {
    uri: 'gateway://catalog/categories',
    name: '카테고리 목록',
    description: '상품 카테고리 계층 구조',
    mimeType: 'application/json',
  },
  {
    uri: 'gateway://user/cart',
    name: '장바구니',
    description: '현재 사용자의 장바구니',
    mimeType: 'application/json',
  },
  {
    uri: 'gateway://site/status',
    name: '사이트 상태',
    description: '현재 서비스 상태 및 알림',
    mimeType: 'application/json',
  },
];

// 샘플 데이터
const SAMPLE_PRODUCTS = [
  { id: 'prod-001', name: '프리미엄 노트북 Pro 16', price: 2490000, category: 'electronics', stock: 45 },
  { id: 'prod-002', name: '무선 노이즈캔슬링 헤드폰', price: 389000, category: 'electronics', stock: 120 },
  { id: 'prod-003', name: '스마트 워치 시리즈 9', price: 599000, category: 'wearables', stock: 8 },
  { id: 'prod-004', name: '기계식 키보드 RGB', price: 189000, category: 'accessories', stock: 200 },
  { id: 'prod-005', name: '4K 웹캠 Pro', price: 279000, category: 'accessories', stock: 0 },
];

// 인메모리 장바구니
const carts = new Map<string, { productId: string; quantity: number }[]>();

/**
 * POST /api/agent/mcp - MCP JSON-RPC 핸들러
 */
export async function POST(request: NextRequest) {
  try {
    const body: JsonRpcRequest | JsonRpcRequest[] = await request.json();
    
    // 배치 요청 처리
    if (Array.isArray(body)) {
      const responses = await Promise.all(body.map(req => handleRequest(req, request)));
      return NextResponse.json(responses, {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 단일 요청 처리
    const response = await handleRequest(body, request);
    return NextResponse.json(response, {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[MCP] Parse error:', error);
    
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error',
      },
    } as JsonRpcResponse, { status: 400 });
  }
}

/**
 * 개별 JSON-RPC 요청 처리
 */
async function handleRequest(
  request: JsonRpcRequest,
  httpRequest: NextRequest
): Promise<JsonRpcResponse> {
  const { jsonrpc, id, method, params = {} } = request;

  // JSON-RPC 2.0 검증
  if (jsonrpc !== '2.0') {
    return createError(id, -32600, 'Invalid Request: jsonrpc must be "2.0"');
  }

  // 에이전트 ID 추출
  const agentId = httpRequest.headers.get('x-agent-id') 
    || httpRequest.headers.get('x-verified-agent-id') 
    || 'anonymous';

  try {
    switch (method) {
      // ========== MCP 초기화 ==========
      case 'initialize':
        return createResult(id, {
          protocolVersion: MCP_VERSION,
          capabilities: {
            tools: { listChanged: true },
            resources: { subscribe: true, listChanged: true },
            prompts: { listChanged: true },
            logging: {},
          },
          serverInfo: {
            name: SERVER_NAME,
            version: SERVER_VERSION,
          },
        });

      case 'initialized':
        return createResult(id, {});

      // ========== 도구 관련 ==========
      case 'tools/list':
        return createResult(id, { tools: TOOLS });

      case 'tools/call':
        const toolResult = await executeTool(
          params.name as string,
          params.arguments as Record<string, unknown>,
          agentId
        );
        return createResult(id, toolResult);

      // ========== 리소스 관련 ==========
      case 'resources/list':
        return createResult(id, { resources: RESOURCES });

      case 'resources/read':
        const resourceContent = await readResource(params.uri as string, agentId);
        return createResult(id, resourceContent);

      // ========== 프롬프트 관련 ==========
      case 'prompts/list':
        return createResult(id, {
          prompts: [
            {
              name: 'shopping_assistant',
              description: '쇼핑 도우미 프롬프트',
              arguments: [
                { name: 'user_intent', description: '사용자 의도', required: true },
              ],
            },
            {
              name: 'product_recommendation',
              description: '상품 추천 프롬프트',
              arguments: [
                { name: 'category', description: '카테고리', required: false },
                { name: 'budget', description: '예산', required: false },
              ],
            },
          ],
        });

      case 'prompts/get':
        const promptContent = getPrompt(
          params.name as string,
          params.arguments as Record<string, unknown>
        );
        return createResult(id, promptContent);

      // ========== 알 수 없는 메서드 ==========
      default:
        return createError(id, -32601, `Method not found: ${method}`);
    }
  } catch (error) {
    console.error(`[MCP] Error in ${method}:`, error);
    return createError(id, -32603, 'Internal error');
  }
}

/**
 * 도구 실행
 */
async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  agentId: string
): Promise<{ content: { type: string; text: string }[]; isError?: boolean }> {
  switch (toolName) {
    case 'search_products': {
      const query = (args.query as string || '').toLowerCase();
      const category = args.category as string | undefined;
      const minPrice = args.minPrice as number | undefined;
      const maxPrice = args.maxPrice as number | undefined;
      const limit = (args.limit as number) || 10;

      let results = SAMPLE_PRODUCTS.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.category.includes(query)
      );

      if (category) results = results.filter(p => p.category === category);
      if (minPrice) results = results.filter(p => p.price >= minPrice);
      if (maxPrice) results = results.filter(p => p.price <= maxPrice);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            results: results.slice(0, limit),
            totalCount: results.length,
            query,
            filters: { category, minPrice, maxPrice },
          }, null, 2),
        }],
      };
    }

    case 'get_product_details': {
      const productId = args.productId as string;
      const product = SAMPLE_PRODUCTS.find(p => p.id === productId);

      if (!product) {
        return {
          content: [{ type: 'text', text: `상품을 찾을 수 없습니다: ${productId}` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            ...product,
            availability: product.stock > 0 ? 'in_stock' : 'out_of_stock',
            lowStock: product.stock > 0 && product.stock < 10,
          }, null, 2),
        }],
      };
    }

    case 'add_to_cart': {
      const productId = args.productId as string;
      const quantity = (args.quantity as number) || 1;

      const product = SAMPLE_PRODUCTS.find(p => p.id === productId);
      if (!product) {
        return {
          content: [{ type: 'text', text: `상품을 찾을 수 없습니다: ${productId}` }],
          isError: true,
        };
      }

      if (product.stock < quantity) {
        return {
          content: [{ type: 'text', text: `재고 부족: ${product.stock}개 남음` }],
          isError: true,
        };
      }

      let cart = carts.get(agentId) || [];
      const existingItem = cart.find(item => item.productId === productId);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.push({ productId, quantity });
      }
      carts.set(agentId, cart);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: `${product.name} x${quantity} 장바구니에 추가됨`,
            cartItemCount: cart.length,
            addedItem: { productId, quantity, price: product.price },
          }, null, 2),
        }],
      };
    }

    case 'view_cart': {
      const cart = carts.get(agentId) || [];
      const items = cart.map(item => {
        const product = SAMPLE_PRODUCTS.find(p => p.id === item.productId);
        return {
          ...item,
          name: product?.name || 'Unknown',
          price: product?.price || 0,
          subtotal: (product?.price || 0) * item.quantity,
        };
      });

      const total = items.reduce((sum, item) => sum + item.subtotal, 0);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            items,
            itemCount: items.length,
            total,
            currency: 'KRW',
          }, null, 2),
        }],
      };
    }

    case 'create_order': {
      const confirmed = args.confirmed as boolean;
      const paymentMethod = args.paymentMethod as string;

      if (!confirmed) {
        return {
          content: [{
            type: 'text',
            text: '⚠️ 주문을 생성하려면 사용자 확인이 필요합니다. confirmed: true를 전달하세요.',
          }],
          isError: true,
        };
      }

      const cart = carts.get(agentId) || [];
      if (cart.length === 0) {
        return {
          content: [{ type: 'text', text: '장바구니가 비어있습니다.' }],
          isError: true,
        };
      }

      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      carts.delete(agentId);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: '주문이 생성되었습니다.',
            orderId,
            paymentMethod,
            status: 'confirmed',
            estimatedDelivery: '2-3 영업일',
          }, null, 2),
        }],
      };
    }

    case 'get_site_status': {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'operational',
            message: '모든 시스템 정상 운영 중',
            alerts: [
              { type: 'info', message: '겨울 세일 진행 중 - 최대 30% 할인' },
            ],
            trending: ['프리미엄 노트북', '무선 헤드폰'],
            lastUpdated: new Date().toISOString(),
          }, null, 2),
        }],
      };
    }

    case 'subscribe_notification': {
      const event = args.event as string;
      const productId = args.productId as string | undefined;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: `${event} 알림 구독 완료`,
            subscriptionId: `SUB-${Date.now()}`,
            event,
            productId,
            status: 'active',
          }, null, 2),
        }],
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `알 수 없는 도구: ${toolName}` }],
        isError: true,
      };
  }
}

/**
 * 리소스 읽기
 */
async function readResource(
  uri: string,
  agentId: string
): Promise<{ contents: { uri: string; mimeType: string; text: string }[] }> {
  switch (uri) {
    case 'gateway://catalog/products':
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(SAMPLE_PRODUCTS, null, 2),
        }],
      };

    case 'gateway://catalog/categories':
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify([
            { id: 'electronics', name: '전자기기', count: 2 },
            { id: 'wearables', name: '웨어러블', count: 1 },
            { id: 'accessories', name: '액세서리', count: 2 },
          ], null, 2),
        }],
      };

    case 'gateway://user/cart':
      const cart = carts.get(agentId) || [];
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ items: cart }, null, 2),
        }],
      };

    case 'gateway://site/status':
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            status: 'operational',
            timestamp: new Date().toISOString(),
          }, null, 2),
        }],
      };

    default:
      return {
        contents: [{
          uri,
          mimeType: 'text/plain',
          text: `리소스를 찾을 수 없습니다: ${uri}`,
        }],
      };
  }
}

/**
 * 프롬프트 가져오기
 */
function getPrompt(
  name: string,
  args: Record<string, unknown>
): { description: string; messages: { role: string; content: { type: string; text: string } }[] } {
  switch (name) {
    case 'shopping_assistant':
      return {
        description: '쇼핑 도우미 프롬프트',
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `당신은 Agent-Gateway 쇼핑몰의 AI 어시스턴트입니다.
사용자 의도: ${args.user_intent}

다음 도구를 사용할 수 있습니다:
- search_products: 상품 검색
- get_product_details: 상품 상세 조회
- add_to_cart: 장바구니 추가
- create_order: 주문 생성 (사용자 확인 필요)

사용자의 의도에 맞게 적절한 도구를 사용하여 도움을 주세요.`,
          },
        }],
      };

    case 'product_recommendation':
      return {
        description: '상품 추천 프롬프트',
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `사용자에게 맞는 상품을 추천해주세요.
카테고리: ${args.category || '전체'}
예산: ${args.budget || '제한 없음'}

search_products 도구를 사용하여 적합한 상품을 찾고 추천해주세요.`,
          },
        }],
      };

    default:
      return {
        description: '알 수 없는 프롬프트',
        messages: [],
      };
  }
}

/**
 * JSON-RPC 성공 응답 생성
 */
function createResult(id: string | number, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

/**
 * JSON-RPC 에러 응답 생성
 */
function createError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id: id ?? 0,
    error: { code, message, data },
  };
}

/**
 * GET - MCP 서버 정보
 */
export async function GET() {
  return NextResponse.json({
    name: SERVER_NAME,
    version: SERVER_VERSION,
    protocolVersion: MCP_VERSION,
    description: 'Agent-Gateway MCP Server - AI 에이전트가 사이트 기능을 직접 호출하는 인터페이스',
    capabilities: {
      tools: TOOLS.map(t => t.name),
      resources: RESOURCES.map(r => r.uri),
    },
    documentation: '/api/ai-manifest.json',
  });
}
