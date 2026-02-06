# ⚡ Cloudflare Edge Gateway 가이드

Eoynx Edge Gateway는 Cloudflare Workers 기반의 고성능 API 서버입니다.

## 목차

1. [개요](#개요)
2. [아키텍처](#아키텍처)
3. [설정](#설정)
4. [배포](#배포)
5. [API 엔드포인트](#api-엔드포인트)
6. [MCP 도구](#mcp-도구)
7. [테스트](#테스트)
8. [문제 해결](#문제-해결)

---

## 개요

### Edge Gateway 특징

| 특징 | 설명 |
|------|------|
| **글로벌 배포** | Cloudflare의 300+ 데이터센터에서 실행 |
| **저지연** | 사용자와 가장 가까운 엣지에서 응답 |
| **무료 티어** | 하루 100,000 요청 무료 |
| **자동 스케일링** | 트래픽에 따라 자동 확장 |
| **인증 불필요** | 공개 API로 누구나 사용 가능 |

### 서브도메인 구성

| 도메인 | 용도 |
|--------|------|
| `api.eoynx.com` | 범용 Edge API |
| `mcp.eoynx.com` | MCP 전용 엔드포인트 |

---

## 아키텍처

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   AI Agent      │────▶│  Cloudflare Edge │────▶│  Target Website │
│   (클라이언트)   │     │   (Workers)      │     │   (스크래핑 대상) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │   Cloudflare D1  │
                        │   (데이터베이스)  │
                        └──────────────────┘
```

### 바인딩

| 이름 | 타입 | 설명 |
|------|------|------|
| `DB` | D1 Database | 서비스 정보 저장 |
| `BROWSER` | Browser Rendering | 동적 페이지 렌더링 |
| `ENVIRONMENT` | Environment Variable | 환경 설정 |

---

## 설정

### 1. Cloudflare DNS 설정

Cloudflare 대시보드에서 DNS 레코드 추가:

```
Type: A
Name: api
Content: 192.0.2.1 (임의 IP, Proxied 상태)
Proxy status: Proxied (오렌지 구름)

Type: A
Name: mcp
Content: 192.0.2.1 (임의 IP, Proxied 상태)
Proxy status: Proxied (오렌지 구름)
```

### 2. wrangler.toml 설정

```toml
name = "eoynx-edge-gateway"
main = "src/index.ts"
compatibility_date = "2024-01-01"
account_id = "your-account-id"

# 라우팅 설정
routes = [
  { pattern = "api.eoynx.com/*", zone_name = "eoynx.com" },
  { pattern = "mcp.eoynx.com/*", zone_name = "eoynx.com" }
]

# D1 데이터베이스 바인딩
[[d1_databases]]
binding = "DB"
database_name = "eoynx"
database_id = "your-database-id"

# Browser Rendering 바인딩
[[browser]]
binding = "BROWSER"

# 환경 변수
[vars]
ENVIRONMENT = "production"
```

### 3. D1 데이터베이스 생성

```bash
# 데이터베이스 생성
wrangler d1 create eoynx

# 마이그레이션 실행
wrangler d1 migrations apply eoynx --local  # 로컬 테스트
wrangler d1 migrations apply eoynx          # 프로덕션
```

---

## 배포

### 기본 배포

```bash
cd workers/edge-gateway
npm install
npx wrangler deploy
```

### 배포 확인

```bash
# 배포 상태 확인
npx wrangler deployments list

# 로그 확인
npx wrangler tail
```

### 환경별 배포

```bash
# 스테이징
npx wrangler deploy --env staging

# 프로덕션
npx wrangler deploy --env production
```

---

## API 엔드포인트

### MCP 서버 정보 (GET /mcp)

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

### MCP JSON-RPC (POST /mcp)

```bash
curl -X POST https://api.eoynx.com/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

### Parse API (POST /parse)

```bash
curl -X POST https://api.eoynx.com/parse \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "selectors": {
      "title": "h1",
      "description": "p"
    }
  }'
```

---

## MCP 도구

### fetch_url

URL의 HTML 콘텐츠를 가져옵니다.

```json
{
  "name": "fetch_url",
  "arguments": {
    "url": "https://example.com",
    "headers": { "User-Agent": "Custom/1.0" }
  }
}
```

### parse_product

상품 페이지에서 정보를 추출합니다.

```json
{
  "name": "parse_product",
  "arguments": {
    "url": "https://shop.example.com/product/123",
    "selectors": {
      "title": "h1.product-name",
      "price": ".product-price",
      "description": ".product-desc",
      "image": "img.main-image"
    }
  }
}
```

### extract_links

웹페이지에서 링크를 추출합니다.

```json
{
  "name": "extract_links",
  "arguments": {
    "url": "https://news.ycombinator.com",
    "filter": "item"
  }
}
```

### extract_text

특정 셀렉터의 텍스트를 추출합니다.

```json
{
  "name": "extract_text",
  "arguments": {
    "url": "https://example.com",
    "selector": "h1"
  }
}
```

---

## 테스트

### Node.js 테스트 스크립트

```javascript
async function testEdgeMCP() {
  // 1. 서버 정보
  const info = await fetch('https://api.eoynx.com/mcp').then(r => r.json());
  console.log('서버:', info.name, info.version);

  // 2. 도구 목록
  const tools = await fetch('https://api.eoynx.com/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    })
  }).then(r => r.json());
  console.log('도구:', tools.result.tools.map(t => t.name));

  // 3. 도구 호출
  const result = await fetch('https://api.eoynx.com/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'extract_links',
        arguments: { url: 'https://news.ycombinator.com', filter: 'item' }
      }
    })
  }).then(r => r.json());
  console.log('결과:', JSON.parse(result.result.content[0].text));
}

testEdgeMCP();
```

### curl 테스트

```bash
# 서버 정보
curl https://api.eoynx.com/mcp

# 도구 목록
curl -X POST https://api.eoynx.com/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# 링크 추출
curl -X POST https://api.eoynx.com/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"extract_links","arguments":{"url":"https://news.ycombinator.com"}}}'
```

---

## 문제 해결

### DNS 문제

로컬에서 DNS 해석이 안 되는 경우:

```bash
# Windows hosts 파일에 추가 (관리자 권한)
# C:\Windows\System32\drivers\etc\hosts
104.21.19.231 api.eoynx.com
104.21.19.231 mcp.eoynx.com

# DNS 캐시 초기화
ipconfig /flushdns
```

### 403 에러

일부 사이트는 봇 접근을 차단합니다:

- Cloudflare가 보호하는 사이트
- 강력한 봇 방지가 있는 사이트 (쿠팡, 네이버 등)

이 경우 Browser Rendering API를 사용하거나 직접 API를 사용하세요.

### 로그 확인

```bash
# 실시간 로그
npx wrangler tail

# 특정 필터
npx wrangler tail --filter error
```

---

## 참고 자료

- [Cloudflare Workers 문서](https://developers.cloudflare.com/workers/)
- [D1 문서](https://developers.cloudflare.com/d1/)
- [Browser Rendering API](https://developers.cloudflare.com/browser-rendering/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

