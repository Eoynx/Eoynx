# 🌅 Eoynx (이오닉스)

> **"어둠을 가르고 시작되는 새벽"** — AI와 웹의 새로운 전환점을 열다

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 Eoynx란?

**Eoynx**는 웹사이트를 AI 에이전트 친화적으로 만드는 **차세대 게이트웨이 플랫폼**입니다.

- **Eos**: 그리스 신화의 새벽의 여신 🌅
- **Onyx**: 강인함과 희소성을 상징하는 검은 보석 💎
- **의미**: AI 시대의 새로운 출발점, 완전히 새로운 국면의 전환점

```
기존 방식:     https://example.com/products/123       → 복잡한 HTML (AI가 이해하기 어려움)
Eoynx 방식:   https://example.com/products/123/agent → 구조화된 JSON-LD (AI가 즉시 이해)
```

## ✨ 핵심 기능

### 🎛️ 에이전트 대시보드
AI가 바로 이해할 수 있는 텍스트 기반 API 명세서 자동 생성. 복잡한 UI를 걷어내고 순수한 데이터만 전달합니다.

### 🛡️ 권한 제어 (Guardrail)
- AI 에이전트별 정보 노출 범위 설정
- 액션(결제, 예약 등) 허용 수준 관리
- 악성 봇 차단, 승인된 에이전트만 통과

### 📡 실시간 컨텍스트 브리핑
"인기 상품은 X, 배송 2일 지연" 등 실시간 요약 정보 제공. 에이전트가 현재 사이트 상황을 즉시 파악합니다.

### 🧠 Dynamic Prompt Generator
사이트 구조 분석 후 최적의 System Prompt 자동 생성. 에이전트가 크롤링 없이 바로 작업 수행 가능합니다.

### 🔐 M2M (Machine to Machine) 인증
ID/PW 대신 AI 에이전트 고유 토큰으로 인증. JWT 기반 보안 프로토콜을 사용합니다.

### 🤖 MCP (Model Context Protocol) 지원
Claude, GPT 등 AI 에이전트가 표준화된 프로토콜로 도구를 호출할 수 있습니다.

## 🛠️ 기술 스택

| 카테고리 | 기술 |
|---------|-----|
| **Framework** | Next.js 14 (App Router) |
| **Runtime** | Edge Runtime (전 세계 빠른 응답) |
| **Language** | TypeScript 5.3 (Strict Mode) |
| **Styling** | Tailwind CSS 3.4 |
| **Database** | Supabase (PostgreSQL) |
| **Data Format** | JSON-LD, Schema.org |
| **Auth** | JWT (jose 라이브러리) |
| **Protocol** | MCP (Model Context Protocol) |
| **Testing** | Jest + Testing Library |
| **Deployment** | Vercel Edge Functions |

## 🚀 빠른 시작

```bash
# 저장소 클론
git clone https://github.com/eoynx/eoynx.git
cd eoynx

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local

# 개발 서버 실행
npm run dev
```

🌐 http://localhost:3000 에서 확인

## 📁 프로젝트 구조

```
eoynx/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── agent/           # 에이전트 API 엔드포인트
│   │   │       ├── route.ts     # 메인 게이트웨이
│   │   │       ├── auth/        # M2M 인증
│   │   │       ├── extract/     # 데이터 추출
│   │   │       ├── mcp/         # MCP 프로토콜
│   │   │       ├── stream/      # SSE 스트리밍
│   │   │       ├── search/      # 검색 API
│   │   │       ├── action/      # 액션 실행
│   │   │       └── health/      # 헬스 체크
│   │   ├── dashboard/           # 관리자 대시보드
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/              # UI 컴포넌트
│   ├── lib/
│   │   ├── auth/                # 인증 로직
│   │   ├── extractor/           # 데이터 추출
│   │   ├── prompt/              # 프롬프트 생성
│   │   └── supabase/            # DB 서비스
│   └── types/                   # TypeScript 타입
├── supabase/
│   └── schema.sql               # 데이터베이스 스키마
├── scripts/                     # 테스트 스크립트
├── docs/                        # 문서
│   ├── API_GUIDE.md
│   ├── MCP_GUIDE.md
│   └── CONTRIBUTING.md
└── public/
    ├── ai.txt                   # AI용 설명
    └── llms.txt                 # LLM용 설명
```

## 🔌 API 엔드포인트

### 📋 AI Manifest
```http
GET /api/ai-manifest.json
```
AI가 접속하자마자 읽어야 할 전체 기능 명세서

### 📡 메인 게이트웨이
```http
GET /api/agent
```
사이트의 구조화된 데이터, 사용 가능한 액션, 실시간 컨텍스트 반환

### 🔐 토큰 발급
```http
POST /api/agent/auth/token
{
  "agentId": "your-agent-id",
  "agentSecret": "your-secret"
}
```

### 🔍 AI 친화적 검색
```http
GET /api/agent/search?q=키워드&sort=price_asc&limit=10
```

### ⚡ 액션 실행
```http
POST /api/agent/action
Authorization: Bearer <token>
{
  "action": "add_to_cart",
  "params": { "productId": "prod-001", "quantity": 2 }
}
```

### 🤖 MCP (Model Context Protocol)
```http
POST /api/agent/mcp
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

### 📡 실시간 스트리밍 (SSE)
```http
GET /api/agent/stream
```

### ❤️ 헬스 체크
```http
GET /api/agent/health
```

## 📝 응답 예시

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "gateway": {
    "version": "1.0.0",
    "provider": "Eoynx",
    "timestamp": "2025-01-15T10:00:00Z"
  },
  "siteContext": {
    "name": "Example Shop",
    "url": "https://example.com",
    "description": "온라인 쇼핑몰"
  },
  "availableActions": [
    {
      "type": "search",
      "name": "검색",
      "endpoint": "/api/agent/search",
      "method": "GET"
    }
  ],
  "contextBriefing": {
    "summary": "현재 겨울 세일 진행 중",
    "highlights": ["인기 상품: 패딩 자켓"]
  }
}
```

## 🔐 인증 플로우

```
1. 에이전트 등록 → 대시보드에서 시크릿 발급
2. 토큰 요청     → POST /api/agent/auth/token
3. API 호출     → Authorization: Bearer <token>
```

## 🧪 테스트

```bash
# 전체 테스트 실행
npm test

# 타입 체크
npm run type-check

# 커버리지 확인
npm run test:coverage
```

## 🚧 로드맵

- [x] ~~Step 1: 데이터 추상화 레이어~~
- [x] ~~Step 2: 에이전트 통신 프로토콜~~
- [x] ~~Step 3: 관리자 대시보드~~
- [x] ~~MCP (Model Context Protocol) 지원~~
- [x] ~~Supabase 데이터베이스 연동~~
- [x] ~~Jest 테스트 코드~~
- [x] ~~Vercel 배포 설정~~
- [ ] 웹소켓 실시간 통신
- [ ] 다국어 프롬프트 지원
- [ ] Agent Reputation 고도화
- [ ] 플러그인 시스템

## 📚 문서

- [API 가이드](docs/API_GUIDE.md) - 상세 API 레퍼런스
- [MCP 가이드](docs/MCP_GUIDE.md) - Model Context Protocol 통합
- [기여 가이드](docs/CONTRIBUTING.md) - 프로젝트 기여 방법

## 📄 라이선스

[MIT License](LICENSE) © 2025 Eoynx Team

## 🤝 기여

이슈와 PR을 환영합니다! [CONTRIBUTING.md](docs/CONTRIBUTING.md)를 참고해주세요.

---

<div align="center">

**🌅 Eoynx — Where Dawn Breaks Through the Darkness**

AI와 웹의 새로운 시대를 함께 열어갑니다.

[Website](https://eoynx.com) · [Documentation](docs/) · [Issues](https://github.com/eoynx/eoynx/issues)

</div>
