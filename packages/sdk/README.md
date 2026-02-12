# @eoynx/sdk

Official SDK for Eoynx Agent Gateway - Web parsing and AI agent integration.

## Installation

```bash
npm install @eoynx/sdk
# or
yarn add @eoynx/sdk
# or
pnpm add @eoynx/sdk
```

## Quick Start

```typescript
import { EoynxClient } from '@eoynx/sdk';

// Initialize client
const client = new EoynxClient({
  agentId: 'your-agent-id',
  agentSecret: 'your-agent-secret',
});

// Authenticate
await client.authenticate();

// Parse a webpage
const result = await client.parse('https://example.com/products/123');
console.log(result.title, result.description);

// Search products
const products = await client.search('wireless headphones', { maxPrice: 100 });
console.log(products.products);

// Add to cart
await client.addToCart('product-123', 2);

// View cart
const cart = await client.viewCart();
console.log(cart.items, cart.total);
```

## React Hooks

```tsx
import { useEoynxParser, useEoynxSearch, useEoynxCart } from '@eoynx/sdk/react';

// Parse a URL
function ProductPage({ url }) {
  const { data, loading, error } = useEoynxParser(url, { headless: true });
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h1>{data?.title}</h1>
      <p>{data?.description}</p>
    </div>
  );
}

// Search products
function SearchPage() {
  const { data, loading, search } = useEoynxSearch({ limit: 20 });
  
  return (
    <div>
      <input onChange={e => search(e.target.value)} />
      {data?.products.map(p => (
        <div key={p.id}>{p.name} - ${p.price}</div>
      ))}
    </div>
  );
}

// Shopping cart
function CartPage() {
  const { items, total, addItem, clearCart } = useEoynxCart();
  
  return (
    <div>
      {items.map(item => (
        <div key={item.productId}>
          {item.name} x {item.quantity}
        </div>
      ))}
      <div>Total: ${total}</div>
    </div>
  );
}
```

## API Reference

### EoynxClient

#### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | string | `https://eoynx.com` | Eoynx API base URL |
| `agentId` | string | - | Agent ID for authentication |
| `agentSecret` | string | - | Agent secret for authentication |
| `token` | string | - | Pre-obtained token |
| `timeout` | number | `30000` | Request timeout in ms |

#### Methods

##### `authenticate(): Promise<string>`
Authenticate with agent credentials and obtain a token.

##### `parse(url, options?): Promise<ParseResult>`
Parse a webpage and extract structured data.

Options:
- `headless?: boolean` - Use headless browser (for JS-rendered pages)
- `waitFor?: string` - CSS selector to wait for
- `selectors?: Record<string, string>` - Custom CSS selectors

##### `search(query, options?): Promise<SearchResult>`
Search for products.

Options:
- `category?: string` - Filter by category
- `minPrice?: number` - Minimum price
- `maxPrice?: number` - Maximum price
- `limit?: number` - Number of results

##### `action(name, params?): Promise<ActionResult>`
Execute an action.

##### `addToCart(productId, quantity?): Promise<ActionResult>`
Add item to cart.

##### `viewCart(): Promise<{ items: CartItem[]; total: number }>`
View current cart.

##### `clearCart(): Promise<ActionResult>`
Clear the cart.

##### `mcpCall(toolName, args?): Promise<unknown>`
Call MCP tool directly.

##### `mcpListTools(): Promise<Array<{ name: string; description: string }>>`
List available MCP tools.

##### `health(): Promise<{ status: string; services: Record<string, string> }>`
Check gateway health.

## MCP Integration

Use the SDK with MCP clients:

```typescript
const client = new EoynxClient({ token: 'your-token' });

// List available tools
const tools = await client.mcpListTools();
console.log(tools);

// Call a tool directly
const result = await client.mcpCall('parse_webpage', {
  url: 'https://example.com',
});
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import { 
  EoynxClient, 
  EoynxConfig,
  ParseResult,
  SearchResult,
  CartItem,
  ActionResult 
} from '@eoynx/sdk';
```

## License

MIT
