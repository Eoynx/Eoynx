# 🤖 MCP (Model Context Protocol) 가이드

Eoynx는 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)을 완벽히 지원합니다. 이 가이드는 MCP를 통해 Eoynx와 상호작용하는 방법을 설명합니다.

## MCP란?

MCP(Model Context Protocol)는 AI 에이전트와 외부 도구/서비스 간의 표준화된 통신 프로토콜입니다. JSON-RPC 2.0을 기반으로 하며, AI 에이전트가 다양한 도구와 리소스에 일관된 방식으로 접근할 수 있게 해줍니다.

## MCP 서버 종류

Eoynx는 두 가지 MCP 서버를 제공합니다:

| 서버 | URL | 인증 | 용도 |
|------|-----|------|------|
| **Next.js MCP** | `https://eoynx.com/api/agent/mcp` | 필요 (X-Agent-Token) | 이커머스 기능 (검색, 장바구니, 주문) |
| **Edge MCP** | `https://api.eoynx.com/mcp` | 불필요 | 범용 웹 스크래핑/파싱 |

---

## Edge MCP 서버 (api.eoynx.com)

Cloudflare Workers 기반의 고성능 MCP 서버입니다. 인증 없이 사용 가능합니다.

### 엔드포인트

```
GET  https://api.eoynx.com/mcp     # 서버 정보
POST https://api.eoynx.com/mcp     # MCP JSON-RPC
```

### 서버 정보 조회

```bash
curl https://api.eoynx.com/mcp
```

응답:
```json
{
  "name": "eoynx-edge-gateway",
  "version": "1.0.0",
  "protocolVersion": "2024-11-05",
  "description": "Eoynx MCP Server (Cloudflare Workers)",
  "capabilities": {
    "tools": true,
    "resources": false,
    "prompts": false
  }
}
```

### Edge MCP 도구 목록

| 도구 | 설명 | 파라미터 |
|-----|------|----------|
| `fetch_url` | URL의 HTML 콘텐츠를 가져옵니다 | `url` (필수), `headers` (선택) |
| `parse_product` | 상품 페이지에서 제목, 설명, 가격, 이미지를 추출합니다 | `url` (필수), `selectors` (선택) |
| `extract_links` | 웹페이지에서 모든 링크를 추출합니다 | `url` (필수), `filter` (선택) |
| `extract_text` | 웹페이지에서 지정한 셀렉터의 텍스트를 추출합니다 | `url` (필수), `selector` (필수) |

### Edge MCP 도구 호출 예시

```bash
# fetch_url - URL 콘텐츠 가져오기
curl -X POST https://api.eoynx.com/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "fetch_url",
      "arguments": { "url": "https://httpbin.org/get" }
    }
  }'

# extract_links - 링크 추출 (필터 적용)
curl -X POST https://api.eoynx.com/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "extract_links",
      "arguments": {
        "url": "https://news.ycombinator.com",
        "filter": "item"
      }
    }
  }'

# parse_product - 상품 정보 파싱
curl -X POST https://api.eoynx.com/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "parse_product",
      "arguments": {
        "url": "https://shop.example.com/product/123",
        "selectors": {
          "title": "h1.product-name",
          "price": ".product-price"
        }
      }
    }
  }'

# extract_text - 특정 요소 텍스트 추출
curl -X POST https://api.eoynx.com/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "extract_text",
      "arguments": {
        "url": "https://example.com",
        "selector": "title"
      }
    }
  }'
```

---

## Next.js MCP 서버 (eoynx.com)

이커머스 기능을 제공하는 인증 기반 MCP 서버입니다.

### 엔드포인트

```
GET  /api/agent/mcp     # 서버 정보
POST /api/agent/mcp     # MCP JSON-RPC

# 인증 헤더 필수
X-Agent-Token: ag_xxx...
```

### 토큰 발급

```bash
curl -X POST https://eoynx.com/api/agent/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "demo-agent",
    "agentSecret": "demo-secret-123"
  }'
```

## 기본 구조

### 요청 형식

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "method_name",
  "params": { ... }
}
```

### 응답 형식

**성공:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { ... }
}
```

**에러:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32600,
    "message": "Invalid Request"
  }
}
```

---

## 메서드 목록

### 1. initialize

세션을 초기화합니다. MCP 통신의 첫 번째 단계입니다.

**요청:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "roots": { "listChanged": true },
      "sampling": {}
    },
    "clientInfo": {
      "name": "YourAgent",
      "version": "1.0.0"
    }
  }
}
```

**응답:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "resources": {},
      "prompts": {}
    },
    "serverInfo": {
      "name": "Agent Gateway MCP Server",
      "version": "1.0.0"
    }
  }
}
```

### 2. tools/list

사용 가능한 도구 목록을 조회합니다.

**요청:**
```json
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
            "query": {
              "type": "string",
              "description": "검색 키워드"
            },
            "limit": {
              "type": "number",
              "description": "결과 수 (기본: 10)"
            },
            "sort": {
              "type": "string",
              "enum": ["relevance", "price_asc", "price_desc", "newest"],
              "description": "정렬 방식"
            }
          },
          "required": ["query"]
        }
      }
    ]
  }
}
```

### 3. tools/call

특정 도구를 호출하여 작업을 수행합니다.

**요청:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "search_products",
    "arguments": {
      "query": "무선 이어폰",
      "limit": 5,
      "sort": "price_asc"
    }
  }
}
```

**응답:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "검색 결과: 5개의 상품을 찾았습니다."
      },
      {
        "type": "resource",
        "resource": {
          "uri": "shop://products/search?q=무선이어폰",
          "mimeType": "application/json",
          "text": "[{\"id\":\"prod-001\",\"name\":\"AirPods Pro\",\"price\":329000}]"
        }
      }
    ]
  }
}
```

### 4. resources/list

사용 가능한 리소스 목록을 조회합니다.

**요청:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "resources/list"
}
```

**응답:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "resources": [
      {
        "uri": "shop://products/catalog",
        "name": "상품 카탈로그",
        "description": "전체 상품 카탈로그",
        "mimeType": "application/json"
      },
      {
        "uri": "shop://cart/current",
        "name": "현재 장바구니",
        "description": "현재 세션의 장바구니 내용",
        "mimeType": "application/json"
      }
    ]
  }
}
```

### 5. resources/read

특정 리소스의 내용을 읽어옵니다.

**요청:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "resources/read",
  "params": {
    "uri": "shop://products/catalog"
  }
}
```

**응답:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "contents": [
      {
        "uri": "shop://products/catalog",
        "mimeType": "application/json",
        "text": "{\"categories\":[...],\"totalProducts\":1500}"
      }
    ]
  }
}
```

### 6. prompts/list

사용 가능한 프롬프트 템플릿 목록을 조회합니다.

**요청:**
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "prompts/list"
}
```

**응답:**
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {
    "prompts": [
      {
        "name": "product_recommendation",
        "description": "사용자 선호도 기반 상품 추천 프롬프트",
        "arguments": [
          {
            "name": "category",
            "description": "상품 카테고리",
            "required": true
          },
          {
            "name": "budget",
            "description": "예산 범위",
            "required": false
          }
        ]
      }
    ]
  }
}
```

---

## 사용 가능한 도구

### search_products

상품을 검색합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|-----|------|
| query | string | ✅ | 검색 키워드 |
| limit | number | | 결과 수 (기본: 10) |
| sort | string | | 정렬 (relevance, price_asc, price_desc, newest) |

### get_product_details

특정 상품의 상세 정보를 조회합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|-----|------|
| productId | string | ✅ | 상품 ID |

### add_to_cart

장바구니에 상품을 추가합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|-----|------|
| productId | string | ✅ | 상품 ID |
| quantity | number | | 수량 (기본: 1) |

### view_cart

현재 장바구니 내용을 조회합니다.

파라미터 없음.

### create_order

주문을 생성합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|-----|------|
| items | array | ✅ | 주문 상품 목록 |
| shippingAddress | object | | 배송 주소 |

### get_site_status

현재 사이트 상태를 조회합니다.

파라미터 없음.

### subscribe_notification

알림을 구독합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|-----|------|
| eventType | string | ✅ | 이벤트 타입 |
| filter | object | | 필터 조건 |

---

## 배치 요청

여러 요청을 한 번에 보낼 수 있습니다:

```json
[
  {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  },
  {
    "jsonrpc": "2.0",
    "id": 2,
    "method": "resources/list"
  },
  {
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get_site_status",
      "arguments": {}
    }
  }
]
```

응답도 배열로 반환됩니다:

```json
[
  { "jsonrpc": "2.0", "id": 1, "result": { "tools": [...] } },
  { "jsonrpc": "2.0", "id": 2, "result": { "resources": [...] } },
  { "jsonrpc": "2.0", "id": 3, "result": { "content": [...] } }
]
```

---

## 에러 코드

| 코드 | 이름 | 설명 |
|-----|------|------|
| -32700 | Parse error | JSON 파싱 실패 |
| -32600 | Invalid Request | 요청 형식 오류 |
| -32601 | Method not found | 존재하지 않는 메서드 |
| -32602 | Invalid params | 파라미터 오류 |
| -32603 | Internal error | 서버 내부 오류 |

---

## 테스트

MCP 테스트 스크립트를 실행하여 연동을 확인할 수 있습니다:

```bash
npm run test:mcp
# 또는
node scripts/test-mcp.js
```

---

## 참고 자료

- [MCP 공식 사이트](https://modelcontextprotocol.io/)
- [MCP 스펙 문서](https://spec.modelcontextprotocol.io/)
- [JSON-RPC 2.0 스펙](https://www.jsonrpc.org/specification)
