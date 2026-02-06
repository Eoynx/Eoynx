# 🌅 Eoynx API 사용 가이드

이 문서는 Eoynx (이오닉스) AI Agent Gateway의 API를 사용하는 방법을 설명합니다.

## 목차

1. [시작하기](#시작하기)
2. [인증](#인증)
3. [기본 API](#기본-api)
4. [MCP 프로토콜](#mcp-프로토콜)
5. [실시간 스트리밍](#실시간-스트리밍)
6. [에러 처리](#에러-처리)

---

## 시작하기

### 기본 URL

```
Production: https://eoynx.com
Development: http://localhost:3000
```

### 필수 헤더

```http
Content-Type: application/json
Accept: application/json
User-Agent: YourAgent/1.0 (https://your-agent.com)
```

### AI Manifest 조회

모든 AI 에이전트는 먼저 AI Manifest를 조회하여 사용 가능한 기능을 파악해야 합니다.

```bash
curl https://eoynx.com/api/ai-manifest.json
```

응답:
```json
{
  "@context": "https://schema.org",
  "@type": "WebAPI",
  "name": "Eoynx",
  "version": "1.0.0",
  "endpoints": [...],
  "authentication": {...},
  "rateLimits": {...}
}
```

---

## 인증

### 1. 토큰 발급

```bash
curl -X POST https://your-domain.com/api/agent/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "your-agent-id",
    "agentSecret": "your-secret-key",
    "scopes": ["read", "search", "execute"]
  }'
```

응답:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresAt": "2026-02-04T00:00:00Z",
  "permissions": ["read", "write", "execute"],
  "scopes": ["read", "search", "execute"]
}
```

### 2. 토큰 사용

모든 인증이 필요한 API 요청에 토큰을 포함합니다:

```bash
curl https://your-domain.com/api/agent/action \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

또는 커스텀 헤더 사용:
```bash
curl https://your-domain.com/api/agent/action \
  -H "X-Agent-Token: eyJhbGciOiJIUzI1NiIs..."
```

### 권한 수준

| 권한 | 설명 | 허용 액션 |
|------|------|----------|
| `read` | 읽기 전용 | 조회, 검색 |
| `write` | 쓰기 가능 | 장바구니 관리 |
| `execute` | 실행 가능 | 주문, 결제 |
| `admin` | 관리자 | 모든 기능 |

---

## 기본 API

### 메인 게이트웨이

```bash
GET /api/agent
```

현재 사이트의 전체 컨텍스트를 반환합니다.

**응답 예시:**
```json
{
  "@context": "https://schema.org",
  "siteContext": {
    "name": "Example Shop",
    "url": "https://example.com",
    "description": "온라인 쇼핑몰"
  },
  "availableActions": [
    {
      "name": "search_products",
      "method": "POST",
      "endpoint": "/api/agent/search"
    }
  ],
  "contextBriefing": {
    "summary": "현재 봄 세일 진행 중",
    "highlights": ["인기 상품: 스니커즈", "평균 배송: 2-3일"]
  }
}
```

### 검색

```bash
GET /api/agent/search?q=노트북&sort=price_asc&limit=10
```

**파라미터:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|-----|------|
| `q` | string | Yes | 검색어 |
| `sort` | string | No | 정렬 (price_asc, price_desc, name_asc, relevance) |
| `limit` | number | No | 결과 수 (기본: 10, 최대: 100) |
| `page` | number | No | 페이지 번호 |

**응답:**
```json
{
  "@type": "SearchResultsPage",
  "query": "노트북",
  "totalResults": 150,
  "results": [
    {
      "@type": "Product",
      "name": "MacBook Pro 14",
      "price": 2490000,
      "currency": "KRW"
    }
  ],
  "facets": {
    "categories": [...],
    "priceRanges": [...]
  }
}
```

### 액션 실행

```bash
POST /api/agent/action
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "add_to_cart",
  "params": {
    "productId": "prod-001",
    "quantity": 2
  }
}
```

**지원 액션:**

| 액션 | 설명 | 필요 권한 |
|-----|------|----------|
| `add_to_cart` | 장바구니 추가 | write |
| `view_cart` | 장바구니 조회 | read |
| `clear_cart` | 장바구니 비우기 | write |
| `create_order` | 주문 생성 | execute |
| `check_order` | 주문 조회 | read |

### 데이터 추출

외부 URL에서 구조화된 데이터를 추출합니다.

```bash
POST /api/agent/extract
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://example.com/products/123",
  "selectors": {
    "title": "h1.product-title",
    "price": ".product-price"
  }
}
```

---

## MCP 프로토콜

Agent Gateway는 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)을 지원합니다.

### 세션 초기화

```bash
POST /api/agent/mcp
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "YourAgent",
      "version": "1.0.0"
    }
  }
}
```

### 도구 목록 조회

```bash
POST /api/agent/mcp
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

**응답:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "search_products",
        "description": "상품을 검색합니다",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": { "type": "string" },
            "limit": { "type": "number" }
          },
          "required": ["query"]
        }
      }
    ]
  }
}
```

### 도구 호출

```bash
POST /api/agent/mcp
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "search_products",
    "arguments": {
      "query": "노트북",
      "limit": 5
    }
  }
}
```

### 지원 도구 목록

| 도구 | 설명 |
|-----|------|
| `search_products` | 상품 검색 |
| `get_product_details` | 상품 상세 조회 |
| `add_to_cart` | 장바구니 추가 |
| `view_cart` | 장바구니 조회 |
| `create_order` | 주문 생성 |
| `get_site_status` | 사이트 상태 조회 |
| `subscribe_notification` | 알림 구독 |

### 배치 요청

여러 요청을 한 번에 보낼 수 있습니다:

```bash
POST /api/agent/mcp
Content-Type: application/json

[
  {"jsonrpc": "2.0", "id": 1, "method": "tools/list"},
  {"jsonrpc": "2.0", "id": 2, "method": "resources/list"}
]
```

---

## 실시간 스트리밍

Server-Sent Events (SSE)를 통해 실시간 이벤트를 수신합니다.

### 연결

```javascript
const eventSource = new EventSource('/api/agent/stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

eventSource.addEventListener('price_update', (event) => {
  const data = JSON.parse(event.data);
  console.log('Price changed:', data);
});
```

### 이벤트 타입

| 이벤트 | 설명 | 데이터 |
|-------|------|-------|
| `price_update` | 가격 변동 | `{ productId, oldPrice, newPrice }` |
| `stock_update` | 재고 변동 | `{ productId, status, quantity }` |
| `system_alert` | 시스템 알림 | `{ level, message }` |
| `heartbeat` | 연결 확인 | `{ timestamp }` |

---

## 에러 처리

### HTTP 상태 코드

| 코드 | 의미 | 설명 |
|-----|------|------|
| 200 | OK | 성공 |
| 400 | Bad Request | 잘못된 요청 |
| 401 | Unauthorized | 인증 필요 |
| 403 | Forbidden | 권한 부족 |
| 404 | Not Found | 리소스 없음 |
| 429 | Too Many Requests | Rate Limit 초과 |
| 500 | Server Error | 서버 오류 |

### 에러 응답 형식

```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "토큰이 만료되었습니다",
    "details": {
      "expiredAt": "2026-02-01T00:00:00Z"
    }
  }
}
```

### 일반 에러 코드

| 코드 | 설명 | 해결 방법 |
|-----|------|----------|
| `INVALID_TOKEN` | 토큰 무효 | 새 토큰 발급 |
| `EXPIRED_TOKEN` | 토큰 만료 | 토큰 갱신 |
| `PERMISSION_DENIED` | 권한 부족 | 필요 권한 확인 |
| `RATE_LIMIT_EXCEEDED` | 요청 한도 초과 | 잠시 후 재시도 |
| `INVALID_PARAMETERS` | 파라미터 오류 | 요청 파라미터 확인 |
| `RESOURCE_NOT_FOUND` | 리소스 없음 | ID 확인 |

---

## Rate Limits

| 티어 | 분당 요청 | 일일 요청 |
|-----|---------|---------|
| Free | 60 | 1,000 |
| Standard | 300 | 10,000 |
| Premium | 1,000 | 100,000 |

Rate Limit 헤더:
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1707004800
```

---

## SDK 예시

### JavaScript/TypeScript

```typescript
import { AgentGatewayClient } from 'agent-gateway-sdk';

const client = new AgentGatewayClient({
  baseUrl: 'https://your-domain.com',
  agentId: 'your-agent-id',
  agentSecret: 'your-secret',
});

// 검색
const results = await client.search('노트북', { limit: 10 });

// 액션 실행
await client.execute('add_to_cart', { productId: 'prod-001' });

// MCP 도구 호출
const tools = await client.mcp.listTools();
const result = await client.mcp.callTool('search_products', { query: '노트북' });
```

### Python

```python
from agent_gateway import AgentGatewayClient

client = AgentGatewayClient(
    base_url="https://your-domain.com",
    agent_id="your-agent-id",
    agent_secret="your-secret"
)

# 검색
results = client.search("노트북", limit=10)

# 액션 실행
client.execute("add_to_cart", {"productId": "prod-001"})
```

---

## 지원

- 📧 이메일: support@agent-gateway.io
- 🐛 버그 리포트: [GitHub Issues](https://github.com/your-org/agent-gateway/issues)
- 📖 문서: [https://docs.agent-gateway.io](https://docs.agent-gateway.io)
