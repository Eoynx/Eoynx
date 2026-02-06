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
  const result = await env.DB.prepare(
    'SELECT slug, name, description FROM services ORDER BY created_at DESC LIMIT 200'
  ).all();

  const rows = (result?.results || []) as Array<{ slug: string; name?: string; description?: string }>;

  return rows.map((service) => ({
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
}

async function callServiceTool(params: Record<string, unknown>, env: Env) {
  const toolName = params.name as string;
  const args = (params.arguments || {}) as Record<string, unknown>;

  if (!toolName || !toolName.startsWith('parse_service_')) {
    return {
      content: [{ type: 'text', text: 'Unknown tool' }],
      isError: true,
    };
  }

  const url = args.url as string | undefined;
  if (!url) {
    return { content: [{ type: 'text', text: 'URL is required' }], isError: true };
  }

  return {
    content: [{ type: 'text', text: JSON.stringify({ tool: toolName, url }, null, 2) }],
  };
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
