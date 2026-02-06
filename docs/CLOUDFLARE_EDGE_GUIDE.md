# Cloudflare Edge Gateway 가이드

## 1) 서브도메인
- api.eoynx.com → Workers Route
- mcp.eoynx.com → Workers Route

Cloudflare DNS에서 A/AAAA 또는 CNAME을 사용하고, Workers 라우팅으로 연결합니다.

## 2) Workers 배포
```bash
cd workers/edge-gateway
wrangler deploy
```

## 3) 라우팅 설정 (Wrangler)
`wrangler.toml`에 routes 추가 예시:
```toml
routes = [
  "https://api.eoynx.com/*",
  "https://mcp.eoynx.com/*"
]
```

## 4) D1 연결
- Cloudflare D1 생성 후 database_id를 wrangler.toml에 입력
- 마이그레이션 실행:
```bash
wrangler d1 migrations apply eoynx --local
wrangler d1 migrations apply eoynx
```

## 5) Browser Rendering API
- Workers 대시보드에서 Browser Rendering 활성화
- wrangler.toml의 `[[browser]]` 바인딩 확인

## 6) 테스트
- GET https://api.eoynx.com/mcp
- POST https://api.eoynx.com/mcp (JSON-RPC)

