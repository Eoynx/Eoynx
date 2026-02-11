/**
 * MCP (Model Context Protocol) Handler
 * AI 에이전트가 사이트 내의 '도구(Tool)'를 직접 호출하는 표준 프로토콜
 * 
 * JSON-RPC 2.0 기반으로 구현
 * 참조: https://modelcontextprotocol.io/
 */

import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import puppeteer from 'puppeteer';

export const runtime = 'nodejs';

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
  {
    name: 'parse_webpage',
    description: '외부 웹페이지를 파싱하여 구조화된 데이터를 추출합니다. 제목, 설명, 본문, 이미지, 링크 등을 JSON-LD 형식으로 반환합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '파싱할 웹페이지 URL' },
        selectors: { type: 'object', description: '커스텀 CSS 셀렉터 (선택)' },
      },
      required: ['url'],
    },
  },
  {
    name: 'search_daejeon_tourism',
    description: '대전 관광 정보를 검색합니다. 관광지, 맛집, 축제, 숙박 정보를 제공합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '검색어 (예: 유성온천, 성심당, 대전엑스포)' },
        category: { type: 'string', description: '카테고리', enum: ['tourist_spot', 'restaurant', 'festival', 'accommodation', 'all'] },
        limit: { type: 'number', description: '결과 수 제한 (기본: 10)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'parse_webpage_headless',
    description: 'CSR/SPA 사이트를 헤드리스 브라우저로 파싱합니다. JavaScript 렌더링 후 데이터를 추출합니다. 프록시 및 쿠키 설정 지원.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '파싱할 웹페이지 URL' },
        waitFor: { type: 'string', description: '대기할 CSS 셀렉터 (선택)' },
        timeout: { type: 'number', description: '타임아웃 밀리초 (기본: 10000)' },
        proxy: { 
          type: 'object', 
          description: '프록시 서버 설정',
          properties: {
            server: { type: 'string', description: '프록시 서버 URL (예: http://proxy.example.com:8080)' },
            username: { type: 'string', description: '프록시 인증 아이디' },
            password: { type: 'string', description: '프록시 인증 비밀번호' },
          },
        },
        cookies: {
          type: 'array',
          description: '설정할 쿠키 배열',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: '쿠키 이름' },
              value: { type: 'string', description: '쿠키 값' },
              domain: { type: 'string', description: '쿠키 도메인' },
            },
          },
        },
        headers: {
          type: 'object',
          description: '추가 HTTP 헤더',
        },
        localStorage: {
          type: 'object',
          description: '설정할 localStorage 데이터',
        },
      },
      required: ['url'],
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

const SERVICE_TOOL_PREFIX = 'parse_service_';

function extractProductPage(jsonLd: unknown): Record<string, unknown> | null {
  if (!jsonLd || typeof jsonLd !== 'object') return null;
  const additional = (jsonLd as Record<string, unknown>).additionalProperty;
  if (!Array.isArray(additional)) return null;
  const productProperty = additional.find((item) => (item as Record<string, unknown>)?.name === 'productPage');
  const value = (productProperty as Record<string, unknown> | undefined)?.value;
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  return null;
}

async function getServiceTools(): Promise<McpTool[]> {
  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data, error } = await sb
    .from('services')
    .select('slug, name, description, json_ld')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error || !Array.isArray(data)) return [];

  return data.map((service: Record<string, unknown>) => {
    const slug = service.slug as string;
    const name = (service.name as string) || slug;
    const description = (service.description as string) || '서비스 상품 페이지 파싱';
    const productPage = extractProductPage(service.json_ld);

    return {
      name: `${SERVICE_TOOL_PREFIX}${slug}`,
      description: `${name}: ${description}`,
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '상품 페이지 URL' },
          mode: { type: 'string', description: '파싱 모드', enum: ['auto', 'json-ld', 'dom'] },
        },
        required: ['url'],
      },
      ...(productPage ? {} : {}),
    };
  });
}

async function fetchServiceBySlug(slug: string): Promise<Record<string, unknown> | null> {
  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb
    .from('services')
    .select('slug, name, description, json_ld')
    .eq('slug', slug)
    .single();
  if (error || !data) return null;
  return data as Record<string, unknown>;
}

function extractJsonLdProduct(html: string): Record<string, unknown> | null {
  const $ = load(html);
  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const el of scripts) {
    try {
      const parsed = JSON.parse($(el).text());
      const blocks = Array.isArray(parsed) ? parsed : [parsed];
      for (const block of blocks) {
        const type = block?.['@type'];
        if (Array.isArray(type) ? type.includes('Product') : type === 'Product') {
          return block as Record<string, unknown>;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function selectText($: ReturnType<typeof load>, selector: string): string | null {
  if (!selector) return null;
  const el = $(selector).first();
  return el.length ? el.text().trim() : null;
}

function selectAttr($: ReturnType<typeof load>, selector: string, attr: string): string | null {
  if (!selector) return null;
  const el = $(selector).first();
  return el.length ? (el.attr(attr) || null) : null;
}

async function parseProductPage(
  url: string,
  productPage: Record<string, unknown> | null,
  mode: 'auto' | 'json-ld' | 'dom'
) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Eoynx-MCP/1.0 (+https://eoynx.com)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    return { error: 'Failed to fetch page', status: response.status };
  }

  const html = await response.text();
  const parsedMode = mode === 'auto' ? (productPage?.dataSource as string || 'dom') : mode;

  if (parsedMode === 'json-ld') {
    const product = extractJsonLdProduct(html);
    if (!product) return { error: 'JSON-LD product not found' };

    return {
      source: 'json-ld',
      name: product.name,
      description: product.description,
      image: product.image,
      sku: product.sku,
      brand: (product.brand as Record<string, unknown>)?.name || product.brand,
      offers: product.offers,
      aggregateRating: product.aggregateRating,
      url,
    };
  }

  const $ = load(html);
  const selectors = (productPage?.selectors as Record<string, string>) || {};

  return {
    source: 'dom',
    name: selectText($, selectors.title),
    price: selectText($, selectors.price),
    currency: selectText($, selectors.currency),
    image: selectAttr($, selectors.image, 'src'),
    description: selectText($, selectors.description),
    sku: selectText($, selectors.sku),
    brand: selectText($, selectors.brand),
    availability: selectText($, selectors.availability),
    rating: selectText($, selectors.rating),
    reviewCount: selectText($, selectors.reviewCount),
    url,
  };
}

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
    const acceptsSSE = (request.headers.get('accept') || '').includes('text/event-stream');
    
    // 배치 요청 처리
    if (Array.isArray(body)) {
      const responses = await Promise.all(body.map(req => handleRequest(req, request)));
      if (acceptsSSE) {
        const payload = `event: message\ndata: ${JSON.stringify(responses)}\n\n`;
        return new NextResponse(payload, {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      }
      return NextResponse.json(responses, {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 단일 요청 처리
    const response = await handleRequest(body, request);
    if (acceptsSSE) {
      const payload = `event: message\ndata: ${JSON.stringify(response)}\n\n`;
      return new NextResponse(payload, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }
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
        return createResult(id, { tools: [...(await getServiceTools()), ...TOOLS] });

      case 'tools/call':
        if ((params.name as string)?.startsWith(SERVICE_TOOL_PREFIX)) {
          const toolResult = await executeServiceTool(
            params.name as string,
            params.arguments as Record<string, unknown>
          );
          return createResult(id, toolResult);
        }
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
            {
              name: 'price_comparison',
              description: '가격 비교 도우미',
              arguments: [
                { name: 'product_name', description: '비교할 상품명', required: true },
                { name: 'min_sellers', description: '최소 판매자 수', required: false },
              ],
            },
            {
              name: 'order_tracker',
              description: '주문 추적 도우미',
              arguments: [
                { name: 'order_id', description: '주문 번호', required: false },
              ],
            },
            {
              name: 'smart_search',
              description: '대화형 스마트 검색',
              arguments: [
                { name: 'query', description: '검색 쿼리', required: true },
                { name: 'context', description: '이전 대화 맥락', required: false },
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
  if (toolName.startsWith(SERVICE_TOOL_PREFIX)) {
    return executeServiceTool(toolName, args);
  }

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

      const cart = carts.get(agentId) || [];
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

    case 'parse_webpage': {
      const url = args.url as string;
      if (!url) {
        return {
          content: [{ type: 'text', text: 'URL이 필요합니다.' }],
          isError: true,
        };
      }

      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Eoynx-Agent-Gateway/1.0 (MCP Tool)',
            'Accept': 'text/html,application/xhtml+xml',
          },
        });

        if (!response.ok) {
          return {
            content: [{ type: 'text', text: `페이지 로드 실패: ${response.status}` }],
            isError: true,
          };
        }

        const html = await response.text();
        const $ = load(html);

        // 구조화된 데이터 추출
        const title = $('title').text().trim();
        const description = $('meta[name="description"]').attr('content') || '';
        const keywords = $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()) || [];
        const ogImage = $('meta[property="og:image"]').attr('content') || '';

        // 본문 추출
        const mainContent = $('main, article, .content, #content, .main-content').text().trim().substring(0, 2000);
        
        // 헤딩 구조
        const headings = $('h1, h2, h3').map((_, el) => ({
          level: parseInt(el.tagName.replace('h', ''), 10),
          text: $(el).text().trim().substring(0, 100),
        })).get().slice(0, 20);

        // 이미지 추출
        const images = $('img').map((_, el) => ({
          src: $(el).attr('src'),
          alt: $(el).attr('alt') || '',
        })).get().filter(img => img.src && !img.src.startsWith('data:')).slice(0, 10);

        // 링크 추출
        const links = $('a[href]').map((_, el) => ({
          text: $(el).text().trim().substring(0, 50),
          href: $(el).attr('href'),
        })).get().filter(link => link.text && link.href).slice(0, 20);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              url,
              name: title,
              description,
              keywords,
              image: ogImage,
              mainEntity: {
                content: mainContent,
                headings,
                images,
                links,
              },
              dateExtracted: new Date().toISOString(),
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `파싱 오류: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }

    case 'search_daejeon_tourism': {
      const query = (args.query as string || '').toLowerCase();
      const category = args.category as string || 'all';
      const limit = (args.limit as number) || 10;

      // 대전 관광 정보 데이터 (샘플)
      const daejeonData = [
        // 관광지
        { id: 'djt-001', name: '대전엑스포과학공원', category: 'tourist_spot', description: '1993년 엑스포 개최지, 한빛탑과 과학체험관', address: '유성구 엑스포로 1', rating: 4.3, keywords: ['엑스포', '과학', '한빛탑'] },
        { id: 'djt-002', name: '국립중앙과학관', category: 'tourist_spot', description: '국내 최대 과학관, 천체관 운영', address: '유성구 대덕대로 481', rating: 4.5, keywords: ['과학관', '천체관', '체험'] },
        { id: 'djt-003', name: '한밭수목원', category: 'tourist_spot', description: '도심 속 대규모 수목원, 사계절 아름다움', address: '서구 둔산대로 169', rating: 4.4, keywords: ['수목원', '산책', '자연'] },
        { id: 'djt-004', name: '유성온천', category: 'tourist_spot', description: '600년 전통의 온천지구', address: '유성구 봉명동 일원', rating: 4.2, keywords: ['온천', '휴양', '족욕'] },
        { id: 'djt-005', name: '계족산황톳길', category: 'tourist_spot', description: '맨발 걷기 명소, 황토길 14.5km', address: '대덕구 장동 산 1-1', rating: 4.6, keywords: ['맨발', '황톳길', '걷기'] },
        // 맛집
        { id: 'djr-001', name: '성심당 본점', category: 'restaurant', description: '대전 대표 빵집, 튀김소보로/부추빵 유명', address: '중구 대종로480번길 15', rating: 4.8, keywords: ['빵', '튀김소보로', '부추빵'] },
        { id: 'djr-002', name: '두부두루치기골목', category: 'restaurant', description: '대전 전통 두부요리 거리', address: '동구 중앙로 일원', rating: 4.3, keywords: ['두부', '두루치기', '전통'] },
        { id: 'djr-003', name: '궁동칼국수거리', category: 'restaurant', description: '궁동 먹자골목의 칼국수 명소', address: '유성구 궁동', rating: 4.2, keywords: ['칼국수', '먹자골목'] },
        // 축제
        { id: 'djf-001', name: '대전사이언스페스티벌', category: 'festival', description: '과학도시 대전의 대표 축제', period: '매년 10월', address: '엑스포과학공원', rating: 4.4, keywords: ['과학', '축제', '체험'] },
        { id: 'djf-002', name: '계족산맨발축제', category: 'festival', description: '황톳길 맨발걷기 축제', period: '매년 5-6월', address: '계족산', rating: 4.5, keywords: ['맨발', '축제', '건강'] },
        // 숙박
        { id: 'dja-001', name: '유성호텔', category: 'accommodation', description: '유성온천 지구 대표 호텔', address: '유성구 봉명동', rating: 4.1, keywords: ['온천', '호텔', '숙박'] },
      ];

      // 필터링
      let results = daejeonData.filter(item => {
        const matchQuery = item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.keywords.some(k => k.includes(query));
        const matchCategory = category === 'all' || item.category === category;
        return matchQuery && matchCategory;
      });

      results = results.slice(0, limit);

      const categoryNames: Record<string, string> = {
        tourist_spot: '관광지',
        restaurant: '맛집',
        festival: '축제',
        accommodation: '숙박',
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `대전 ${category === 'all' ? '관광' : categoryNames[category]} 검색: "${query}"`,
            numberOfItems: results.length,
            itemListElement: results.map((item, index) => ({
              '@type': item.category === 'tourist_spot' ? 'TouristAttraction' :
                       item.category === 'restaurant' ? 'Restaurant' :
                       item.category === 'festival' ? 'Event' : 'LodgingBusiness',
              position: index + 1,
              identifier: item.id,
              name: item.name,
              description: item.description,
              address: item.address,
              aggregateRating: { ratingValue: item.rating },
              keywords: item.keywords.join(', '),
            })),
            source: 'letsgodaejeon.kr',
            searchedAt: new Date().toISOString(),
          }, null, 2),
        }],
      };
    }

    case 'parse_webpage_headless': {
      const url = args.url as string;
      const waitFor = args.waitFor as string | undefined;
      const timeout = (args.timeout as number) || 10000;
      const proxy = args.proxy as { server?: string; username?: string; password?: string } | undefined;
      const cookies = args.cookies as Array<{ name: string; value: string; domain?: string }> | undefined;
      const headers = args.headers as Record<string, string> | undefined;
      const localStorage = args.localStorage as Record<string, string> | undefined;

      if (!url) {
        return {
          content: [{ type: 'text', text: 'URL이 필요합니다.' }],
          isError: true,
        };
      }

      let browser;
      try {
        // 브라우저 실행 옵션
        const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        };

        // 프록시 설정
        if (proxy?.server) {
          launchOptions.args = [...(launchOptions.args || []), `--proxy-server=${proxy.server}`];
        }

        browser = await puppeteer.launch(launchOptions);

        const page = await browser.newPage();
        
        // 프록시 인증
        if (proxy?.username && proxy?.password) {
          await page.authenticate({ username: proxy.username, password: proxy.password });
        }

        // User-Agent 설정
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // 추가 헤더 설정
        if (headers) {
          await page.setExtraHTTPHeaders(headers);
        }

        // 쿠키 설정
        if (cookies && cookies.length > 0) {
          const urlObj = new URL(url);
          const cookiesToSet = cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain || urlObj.hostname,
            path: '/',
          }));
          await page.setCookie(...cookiesToSet);
        }

        await page.goto(url, { waitUntil: 'networkidle2', timeout });

        // localStorage 설정 (페이지 로드 후)
        if (localStorage) {
          await page.evaluate((data) => {
            Object.entries(data).forEach(([key, value]) => {
              window.localStorage.setItem(key, value);
            });
          }, localStorage);
          // localStorage 설정 후 페이지 새로고침이 필요할 수 있음
        }

        if (waitFor) {
          await page.waitForSelector(waitFor, { timeout: 5000 }).catch(() => {});
        }

        // 페이지 데이터 추출
        const data = await page.evaluate(() => {
          const title = document.title;
          const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
          const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

          // 본문 추출
          const mainContent = (document.querySelector('main, article, .content, #content, .main-content') as HTMLElement)?.innerText?.substring(0, 3000) || '';

          // 헤딩 추출
          const headings = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 30).map(el => ({
            level: parseInt(el.tagName.replace('H', ''), 10),
            text: el.textContent?.trim().substring(0, 100) || '',
          }));

          // 이미지 추출
          const images = Array.from(document.querySelectorAll('img')).slice(0, 20).map(img => ({
            src: img.src,
            alt: img.alt || '',
          })).filter(img => img.src && !img.src.startsWith('data:'));

          // 상품 정보 추출 (쇼핑몰용)
          const products = Array.from(document.querySelectorAll('[class*="product"], [class*="item"], [data-product]')).slice(0, 20).map(el => {
            const nameEl = el.querySelector('[class*="name"], [class*="title"], h2, h3, a');
            const priceEl = el.querySelector('[class*="price"]');
            const imgEl = el.querySelector('img');
            return {
              name: nameEl?.textContent?.trim().substring(0, 100) || '',
              price: priceEl?.textContent?.trim() || '',
              image: imgEl?.src || '',
            };
          }).filter(p => p.name);

          // 링크 추출
          const links = Array.from(document.querySelectorAll('a[href]')).slice(0, 30).map(a => ({
            text: a.textContent?.trim().substring(0, 50) || '',
            href: a.getAttribute('href') || '',
          })).filter(link => link.text && link.href);

          return { title, description, ogImage, mainContent, headings, images, products, links };
        });

        await browser.close();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              url,
              name: data.title,
              description: data.description,
              image: data.ogImage,
              renderMode: 'headless',
              mainEntity: {
                content: data.mainContent,
                headings: data.headings,
                images: data.images,
                products: data.products,
                links: data.links,
              },
              dateExtracted: new Date().toISOString(),
            }, null, 2),
          }],
        };
      } catch (error) {
        if (browser) await browser.close();
        return {
          content: [{ type: 'text', text: `헤드리스 파싱 오류: ${(error as Error).message}` }],
          isError: true,
        };
      }
    }

    default:
      return {
        content: [{ type: 'text', text: `알 수 없는 도구: ${toolName}` }],
        isError: true,
      };
  }
}

async function executeServiceTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[]; isError?: boolean }> {
  const slug = toolName.replace(SERVICE_TOOL_PREFIX, '');
  const url = args.url as string | undefined;
  const mode = (args.mode as 'auto' | 'json-ld' | 'dom' | undefined) || 'auto';

  if (!url) {
    return {
      content: [{ type: 'text', text: 'URL 파라미터가 필요합니다.' }],
      isError: true,
    };
  }

  const service = await fetchServiceBySlug(slug);
  if (!service) {
    return {
      content: [{ type: 'text', text: `서비스를 찾을 수 없습니다: ${slug}` }],
      isError: true,
    };
  }

  const productPage = extractProductPage(service.json_ld);
  const result = await parseProductPage(url, productPage, mode);

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        service: {
          slug: service.slug,
          name: service.name,
        },
        result,
      }, null, 2),
    }],
    isError: Boolean((result as { error?: string }).error),
  };
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

    case 'price_comparison':
      return {
        description: '가격 비교 도우미',
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `여러 판매처에서 "${args.product_name}" 상품의 가격을 비교해주세요.

최소 ${args.min_sellers || 3}개의 판매처를 비교하고, 다음 정보를 포함해주세요:
- 최저가 판매처
- 평균 가격
- 배송비 포함 실제 가격
- 각 판매처의 리뷰 평점

search_products와 get_product_details 도구를 사용하세요.`,
          },
        }],
      };

    case 'order_tracker':
      return {
        description: '주문 추적 도우미',
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `${args.order_id ? `주문번호 ${args.order_id}의 배송 상태를 추적합니다.` : '최근 주문 내역을 조회합니다.'}

다음 정보를 제공해주세요:
- 현재 배송 상태
- 예상 도착일
- 배송 업체 및 운송장 번호
- 배송 추적 링크`,
          },
        }],
      };

    case 'smart_search':
      return {
        description: '대화형 스마트 검색',
        messages: [{
          role: 'system',
          content: {
            type: 'text',
            text: `당신은 Agent-Gateway의 스마트 검색 어시스턴트입니다.
사용자의 자연어 질문을 분석하여 적절한 검색을 수행하세요.

이전 맥락: ${args.context || '없음'}`,
          },
        }, {
          role: 'user',
          content: {
            type: 'text',
            text: args.query as string || '상품을 검색해주세요',
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
