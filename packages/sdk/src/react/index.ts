/**
 * Eoynx SDK - React Hooks
 * @packageDocumentation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { EoynxClient, EoynxConfig, ParseResult, SearchResult, CartItem } from '../index';

// Create a singleton client
let sharedClient: EoynxClient | null = null;

/**
 * Get or create the shared Eoynx client instance
 */
export function getEoynxClient(config?: EoynxConfig): EoynxClient {
  if (!sharedClient || config) {
    sharedClient = new EoynxClient(config);
  }
  return sharedClient;
}

/**
 * Hook to use the Eoynx client
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const client = useEoynxClient({
 *     agentId: 'my-agent',
 *     agentSecret: 'my-secret',
 *   });
 *   
 *   const handleSearch = async () => {
 *     const results = await client.search('laptop');
 *     console.log(results);
 *   };
 * }
 * ```
 */
export function useEoynxClient(config?: EoynxConfig): EoynxClient {
  const clientRef = useRef<EoynxClient | null>(null);

  if (!clientRef.current) {
    clientRef.current = config ? new EoynxClient(config) : getEoynxClient();
  }

  return clientRef.current;
}

interface UseParseOptions {
  headless?: boolean;
  waitFor?: string;
  selectors?: Record<string, string>;
  enabled?: boolean;
}

interface UseParseResult {
  data: ParseResult | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to parse a webpage
 * 
 * @example
 * ```tsx
 * function ProductPage({ url }: { url: string }) {
 *   const { data, loading, error } = useEoynxParser(url);
 *   
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   
 *   return (
 *     <div>
 *       <h1>{data?.title}</h1>
 *       <p>{data?.description}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useEoynxParser(
  url: string | null,
  options: UseParseOptions = {}
): UseParseResult {
  const client = useEoynxClient();
  const [data, setData] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { enabled = true, ...parseOptions } = options;

  const fetchData = useCallback(async () => {
    if (!url || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const result = await client.parse(url, parseOptions);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Parse failed'));
    } finally {
      setLoading(false);
    }
  }, [url, enabled, client, parseOptions.headless, parseOptions.waitFor]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

interface UseSearchOptions {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  enabled?: boolean;
}

interface UseSearchResult {
  data: SearchResult | null;
  loading: boolean;
  error: Error | null;
  search: (query: string) => Promise<void>;
}

/**
 * Hook to search products
 * 
 * @example
 * ```tsx
 * function SearchPage() {
 *   const { data, loading, search } = useEoynxSearch({ limit: 20 });
 *   const [query, setQuery] = useState('');
 *   
 *   const handleSearch = () => {
 *     search(query);
 *   };
 *   
 *   return (
 *     <div>
 *       <input value={query} onChange={e => setQuery(e.target.value)} />
 *       <button onClick={handleSearch} disabled={loading}>Search</button>
 *       {data?.products.map(p => (
 *         <div key={p.id}>{p.name} - ${p.price}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useEoynxSearch(options: UseSearchOptions = {}): UseSearchResult {
  const client = useEoynxClient();
  const [data, setData] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { enabled = true, ...searchOptions } = options;

  const search = useCallback(async (query: string) => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const result = await client.search(query, searchOptions);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Search failed'));
    } finally {
      setLoading(false);
    }
  }, [enabled, client, searchOptions]);

  return { data, loading, error, search };
}

interface UseCartResult {
  items: CartItem[];
  total: number;
  loading: boolean;
  error: Error | null;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook to manage shopping cart
 * 
 * @example
 * ```tsx
 * function CartPage() {
 *   const { items, total, addItem, clearCart, loading } = useEoynxCart();
 *   
 *   return (
 *     <div>
 *       {items.map(item => (
 *         <div key={item.productId}>
 *           {item.name} x {item.quantity} = ${item.price * item.quantity}
 *         </div>
 *       ))}
 *       <div>Total: ${total}</div>
 *       <button onClick={clearCart} disabled={loading}>Clear Cart</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useEoynxCart(): UseCartResult {
  const client = useEoynxClient();
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const cart = await client.viewCart();
      setItems(cart.items);
      setTotal(cart.total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load cart'));
    } finally {
      setLoading(false);
    }
  }, [client]);

  const addItem = useCallback(async (productId: string, quantity = 1) => {
    setLoading(true);
    try {
      await client.addToCart(productId, quantity);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add item'));
    } finally {
      setLoading(false);
    }
  }, [client, refresh]);

  const removeItem = useCallback(async (productId: string) => {
    setLoading(true);
    try {
      await client.action('remove_from_cart', { productId });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to remove item'));
    } finally {
      setLoading(false);
    }
  }, [client, refresh]);

  const clearCart = useCallback(async () => {
    setLoading(true);
    try {
      await client.clearCart();
      setItems([]);
      setTotal(0);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to clear cart'));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, total, loading, error, addItem, removeItem, clearCart, refresh };
}
