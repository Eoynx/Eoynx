export interface Env {
  DB: D1Database;
  BROWSER: Fetcher;
  ENVIRONMENT: string;
}

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
  error?: { code: number; message: string; data?: unknown };
}

const MCP_VERSION = '2024-11-05';
const SERVER_NAME = 'eoynx-edge-gateway';
const SERVER_VERSION = '1.0.0';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/mcp' && request.method === 'GET') {
      return Response.json({
        name: SERVER_NAME,
        version: SERVER_VERSION,
        protocolVersion: MCP_VERSION,
        description: 'Eoynx MCP Server (Cloudflare Workers)',
        capabilities: {
          tools: true,
          resources: false,
          prompts: false,
        },
      });
    }

    if (url.pathname === '/mcp' && request.method === 'POST') {
      const body = (await request.json()) as JsonRpcRequest | JsonRpcRequest[];
      if (Array.isArray(body)) {
        const responses = await Promise.all(body.map((req) => handleMcpRequest(req, env)));
        return Response.json(responses);
      }
      const response = await handleMcpRequest(body, env);
      return Response.json(response);
    }

    if (url.pathname === '/parse' && request.method === 'POST') {
      try {
        const { url: targetUrl, selectors = {}, render = false } = await request.json() as { url: string; selectors?: Record<string, string>; render?: boolean };
        if (!targetUrl) {
          return Response.json({ error: 'URL is required' }, { status: 400 });
        }

        let response = await fetch(targetUrl, { headers: { 'User-Agent': 'Eoynx-Edge-Parser/1.0' } });
        if (!response.ok && env.BROWSER && render) {
          response = await env.BROWSER.fetch(targetUrl);
        }

        if (!response.ok) {
          return Response.json({ error: 'Failed to fetch URL', status: response.status }, { status: 400 });
        }

        const html = await response.text();
        const extracted = extractFields(html, selectors);
        if (extracted.image && extracted.image.startsWith('/')) {
          try {
            const origin = new URL(targetUrl).origin;
            extracted.image = `${origin}${extracted.image}`;
          } catch {
            // ignore
          }
        }

        return Response.json({
          url: targetUrl,
          extracted,
        });
      } catch (error) {
        return Response.json({ error: 'Parse failed', details: String(error) }, { status: 500 });
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function handleMcpRequest(request: JsonRpcRequest, env: Env): Promise<JsonRpcResponse> {
  const { jsonrpc, id, method, params = {} } = request;

  if (jsonrpc !== '2.0') {
    return createError(id, -32600, 'Invalid Request');
  }

  switch (method) {
    case 'initialize':
      return createResult(id, {
        protocolVersion: MCP_VERSION,
        capabilities: {
          tools: { listChanged: true },
        },
        serverInfo: {
          name: SERVER_NAME,
          version: SERVER_VERSION,
        },
      });

    case 'tools/list':
      return createResult(id, { tools: await listServiceTools(env) });

    case 'tools/call':
      return createResult(id, await callServiceTool(params, env));

    default:
      return createError(id, -32601, `Method not found: ${method}`);
  }
}

async function listServiceTools(env: Env) {
  // 기본 도구 목록
  const builtInTools = [
    {
      name: 'fetch_url',
      description: 'URL의 HTML 콘텐츠를 가져옵니다.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '가져올 웹페이지 URL' },
          headers: { type: 'object', description: '추가 HTTP 헤더 (선택)' },
        },
        required: ['url'],
      },
    },
    {
      name: 'parse_product',
      description: '상품 페이지에서 제목, 설명, 가격, 이미지 정보를 추출합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '상품 페이지 URL' },
          selectors: {
            type: 'object',
            description: '커스텀 CSS 셀렉터 (선택)',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              price: { type: 'string' },
              image: { type: 'string' },
            },
          },
        },
        required: ['url'],
      },
    },
    {
      name: 'extract_links',
      description: '웹페이지에서 모든 링크를 추출합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '웹페이지 URL' },
          filter: { type: 'string', description: '링크 필터 패턴 (선택, 예: /product/)' },
        },
        required: ['url'],
      },
    },
    {
      name: 'extract_text',
      description: '웹페이지에서 지정한 셀렉터의 텍스트를 추출합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '웹페이지 URL' },
          selector: { type: 'string', description: 'CSS 셀렉터 (예: h1, .title, #main)' },
        },
        required: ['url', 'selector'],
      },
    },
  ];

  // DB에서 서비스 기반 도구 조회
  try {
    const result = await env.DB.prepare(
      'SELECT slug, name, description FROM services ORDER BY created_at DESC LIMIT 200'
    ).all();

    const rows = (result?.results || []) as Array<{ slug: string; name?: string; description?: string }>;

    const serviceTools = rows.map((service) => ({
      name: `parse_service_${service.slug}`,
      description: `${service.name || service.slug}: ${service.description || '서비스 상품 페이지 파싱'}`,
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '상품 페이지 URL' },
        },
        required: ['url'],
      },
    }));

    return [...builtInTools, ...serviceTools];
  } catch {
    // DB 연결 실패 시 기본 도구만 반환
    return builtInTools;
  }
}

async function callServiceTool(params: Record<string, unknown>, env: Env) {
  const toolName = params.name as string;
  const args = (params.arguments || {}) as Record<string, unknown>;

  const url = args.url as string | undefined;

  switch (toolName) {
    case 'fetch_url': {
      if (!url) {
        return { content: [{ type: 'text', text: 'URL is required' }], isError: true };
      }
      try {
        const customHeaders = (args.headers || {}) as Record<string, string>;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Eoynx-Edge-Gateway/1.0',
            ...customHeaders,
          },
        });
        if (!response.ok) {
          return {
            content: [{ type: 'text', text: `Failed to fetch: ${response.status} ${response.statusText}` }],
            isError: true,
          };
        }
        const html = await response.text();
        // 너무 긴 경우 잘라냄
        const truncated = html.length > 50000 ? html.slice(0, 50000) + '\n... (truncated)' : html;
        return { content: [{ type: 'text', text: truncated }] };
      } catch (error) {
        return { content: [{ type: 'text', text: `Fetch error: ${String(error)}` }], isError: true };
      }
    }

    case 'parse_product': {
      if (!url) {
        return { content: [{ type: 'text', text: 'URL is required' }], isError: true };
      }
      try {
        const selectors = (args.selectors || {}) as Record<string, string>;
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Eoynx-Edge-Parser/1.0' },
        });
        if (!response.ok) {
          return {
            content: [{ type: 'text', text: `Failed to fetch: ${response.status}` }],
            isError: true,
          };
        }
        const html = await response.text();
        const extracted = extractFields(html, selectors);
        // 상대 경로 이미지 처리
        if (extracted.image && extracted.image.startsWith('/')) {
          try {
            const origin = new URL(url).origin;
            extracted.image = `${origin}${extracted.image}`;
          } catch {
            // ignore
          }
        }
        return {
          content: [{ type: 'text', text: JSON.stringify({ url, ...extracted }, null, 2) }],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: `Parse error: ${String(error)}` }], isError: true };
      }
    }

    case 'extract_links': {
      if (!url) {
        return { content: [{ type: 'text', text: 'URL is required' }], isError: true };
      }
      try {
        const filter = args.filter as string | undefined;
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Eoynx-Edge-Gateway/1.0' },
        });
        if (!response.ok) {
          return {
            content: [{ type: 'text', text: `Failed to fetch: ${response.status}` }],
            isError: true,
          };
        }
        const html = await response.text();
        const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
        const links: string[] = [];
        let match;
        while ((match = linkRegex.exec(html)) !== null) {
          const href = match[1];
          if (!filter || href.includes(filter)) {
            links.push(href);
          }
        }
        const uniqueLinks = [...new Set(links)];
        return {
          content: [{ type: 'text', text: JSON.stringify({ url, count: uniqueLinks.length, links: uniqueLinks.slice(0, 100) }, null, 2) }],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: `Extract error: ${String(error)}` }], isError: true };
      }
    }

    case 'extract_text': {
      if (!url) {
        return { content: [{ type: 'text', text: 'URL is required' }], isError: true };
      }
      const selector = args.selector as string | undefined;
      if (!selector) {
        return { content: [{ type: 'text', text: 'Selector is required' }], isError: true };
      }
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Eoynx-Edge-Gateway/1.0' },
        });
        if (!response.ok) {
          return {
            content: [{ type: 'text', text: `Failed to fetch: ${response.status}` }],
            isError: true,
          };
        }
        const html = await response.text();
        const text = extractBySelector(html, selector);
        return {
          content: [{ type: 'text', text: JSON.stringify({ url, selector, text }, null, 2) }],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: `Extract error: ${String(error)}` }], isError: true };
      }
    }

    default:
      // 서비스 기반 도구 처리
      if (toolName.startsWith('parse_service_')) {
        if (!url) {
          return { content: [{ type: 'text', text: 'URL is required' }], isError: true };
        }
        return {
          content: [{ type: 'text', text: JSON.stringify({ tool: toolName, url }, null, 2) }],
        };
      }
      return {
        content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
        isError: true,
      };
  }
}

function createResult(id: string | number, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

function createError(id: string | number | null, code: number, message: string, data?: unknown): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id: id ?? 0,
    error: { code, message, data },
  };
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function extractBySelector(html: string, selector: string, attr?: string): string | null {
  if (!selector) return null;
  if (selector.startsWith('#')) {
    const id = selector.slice(1);
    const match = html.match(new RegExp(`<[^>]*id=["']${id}["'][^>]*>([\s\S]*?)<\/[^>]+>`, 'i'));
    return match ? stripTags(match[1]) : null;
  }
  if (selector.startsWith('.')) {
    const className = selector.slice(1);
    const match = html.match(new RegExp(`<[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>`, 'i'));
    return match ? stripTags(match[1]) : null;
  }
  const tag = selector;
  if (attr) {
    const match = html.match(new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["'][^>]*>`, 'i'));
    return match ? match[1] : null;
  }
  const match = html.match(new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, 'i'));
  return match ? stripTags(match[1]) : null;
}

function extractFields(html: string, selectors: Record<string, string>) {
  const meta = (key: string) => {
    const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i'));
    return match ? match[1] : null;
  };

  const jsonLdProduct = (() => {
    const match = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[1]);
      const blocks = Array.isArray(parsed) ? parsed : [parsed];
      return blocks.find((block) => block?.['@type'] === 'Product' || (Array.isArray(block?.['@type']) && block['@type'].includes('Product')));
    } catch {
      return null;
    }
  })();

  const title = extractBySelector(html, selectors.title || 'h1')
    || meta('og:title')
    || (jsonLdProduct?.name as string | undefined)
    || extractBySelector(html, 'title');
  const description = extractBySelector(html, selectors.description || '.description')
    || meta('og:description')
    || (jsonLdProduct?.description as string | undefined)
    || meta('description');
  const price = extractBySelector(html, selectors.price || '.price')
    || meta('product:price:amount')
    || (jsonLdProduct?.offers?.price as string | undefined)
    || '';
  const image = extractBySelector(html, selectors.image || 'img', 'src')
    || meta('og:image')
    || (Array.isArray(jsonLdProduct?.image) ? jsonLdProduct?.image?.[0] : jsonLdProduct?.image as string | undefined)
    || null;

  return {
    title,
    description,
    price,
    image,
    raw: {
      titleSelector: selectors.title || 'h1',
      descriptionSelector: selectors.description || '.description',
      priceSelector: selectors.price || '.price',
      imageSelector: selectors.image || 'img',
    },
  };
}
