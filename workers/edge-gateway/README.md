# Eoynx Edge Gateway (Cloudflare Workers)

## 목적
- MCP 서버
- 실시간 프록시 파싱
- 에이전트 전용 API

## 실행
```bash
wrangler dev
```

## 환경 설정
- D1 바인딩: `DB`
- Browser Rendering API 바인딩: `BROWSER`

## 엔드포인트
- `GET /mcp` MCP 메타데이터
- `POST /mcp` MCP JSON-RPC
- `POST /parse` (TODO)
