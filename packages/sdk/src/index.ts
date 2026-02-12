/**
 * Eoynx SDK - Official client library for Eoynx Agent Gateway
 * @packageDocumentation
 */

export interface EoynxConfig {
  /** Base URL of the Eoynx API (default: https://eoynx.com) */
  baseUrl?: string;
  /** Agent ID for authentication */
  agentId?: string;
  /** Agent secret for authentication */
  agentSecret?: string;
  /** Pre-obtained token */
  token?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

export interface ParseResult {
  success: boolean;
  title?: string;
  description?: string;
  content?: string;
  images?: string[];
  links?: Array<{ text: string; href: string }>;
  headings?: Array<{ level: number; text: string }>;
  jsonLd?: Record<string, unknown>;
  meta?: Record<string, string>;
  error?: string;
}

export interface SearchResult {
  products: Array<{
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    discountRate?: number;
    image?: string;
    url?: string;
    brand?: string;
    rating?: number;
  }>;
  total: number;
  page: number;
  hasMore: boolean;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface ActionResult {
  success: boolean;
  action: string;
  message?: string;
  data?: unknown;
  error?: string;
}

/**
 * Main Eoynx client class
 * 
 * @example
 * ```typescript
 * import { EoynxClient } from '@eoynx/sdk';
 * 
 * const client = new EoynxClient({
 *   agentId: 'my-agent',
 *   agentSecret: 'my-secret',
 * });
 * 
 * // Parse a webpage
 * const result = await client.parse('https://example.com/products/123');
 * console.log(result.title, result.description);
 * 
 * // Search products
 * const products = await client.search('wireless headphones', { maxPrice: 100 });
 * console.log(products.products);
 * ```
 */
export class EoynxClient {
  private baseUrl: string;
  private token: string | null = null;
  private agentId?: string;
  private agentSecret?: string;
  private timeout: number;

  constructor(config: EoynxConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://eoynx.com';
    this.agentId = config.agentId;
    this.agentSecret = config.agentSecret;
    this.token = config.token || null;
    this.timeout = config.timeout || 30000;
  }

  /**
   * Authenticate and obtain a token
   */
  async authenticate(): Promise<string> {
    if (!this.agentId || !this.agentSecret) {
      throw new Error('Agent ID and secret are required for authentication');
    }

    const response = await this.fetch('/api/agent/auth/token', {
      method: 'POST',
      body: JSON.stringify({
        agent_id: this.agentId,
        agent_secret: this.agentSecret,
      }),
    });

    if (!response.success) {
      throw new Error(response.error || 'Authentication failed');
    }

    this.token = response.token;
    return response.token;
  }

  /**
   * Parse a webpage and extract structured data
   */
  async parse(url: string, options: {
    headless?: boolean;
    waitFor?: string;
    selectors?: Record<string, string>;
  } = {}): Promise<ParseResult> {
    const endpoint = options.headless 
      ? '/api/agent/extract'
      : '/api/proxy/parse';

    return this.fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        url,
        headless: options.headless,
        waitFor: options.waitFor,
        selectors: options.selectors,
      }),
    });
  }

  /**
   * Search for products
   */
  async search(query: string, options: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
  } = {}): Promise<SearchResult> {
    const params = new URLSearchParams({ 
      q: query,
      ...(options.category && { category: options.category }),
      ...(options.minPrice && { minPrice: String(options.minPrice) }),
      ...(options.maxPrice && { maxPrice: String(options.maxPrice) }),
      ...(options.limit && { limit: String(options.limit) }),
    });

    return this.fetch(`/api/agent/search?${params}`);
  }

  /**
   * Execute an action (add to cart, purchase, etc.)
   */
  async action(actionName: string, params: Record<string, unknown> = {}): Promise<ActionResult> {
    return this.fetch('/api/agent/action', {
      method: 'POST',
      body: JSON.stringify({
        action: actionName,
        params,
      }),
    });
  }

  /**
   * Add item to cart
   */
  async addToCart(productId: string, quantity: number = 1): Promise<ActionResult> {
    return this.action('add_to_cart', { productId, quantity });
  }

  /**
   * View current cart
   */
  async viewCart(): Promise<{ items: CartItem[]; total: number }> {
    const result = await this.action('view_cart');
    return result.data as { items: CartItem[]; total: number };
  }

  /**
   * Clear cart
   */
  async clearCart(): Promise<ActionResult> {
    return this.action('clear_cart');
  }

  /**
   * Call MCP tool directly
   */
  async mcpCall(toolName: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const response = await this.fetch('/api/agent/mcp', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
      }),
    });

    if (response.error) {
      throw new Error(response.error.message || 'MCP call failed');
    }

    return response.result;
  }

  /**
   * List available MCP tools
   */
  async mcpListTools(): Promise<Array<{ name: string; description: string }>> {
    const response = await this.fetch('/api/agent/mcp', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/list',
      }),
    });

    return response.result?.tools || [];
  }

  /**
   * Check gateway health
   */
  async health(): Promise<{ status: string; services: Record<string, string> }> {
    return this.fetch('/api/agent/health');
  }

  // Private fetch helper
  private async fetch(path: string, options: RequestInit = {}): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (this.token) {
        headers['X-Agent-Token'] = this.token;
      }

      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.error || 'Request failed');
      }

      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// Default export
export default EoynxClient;
