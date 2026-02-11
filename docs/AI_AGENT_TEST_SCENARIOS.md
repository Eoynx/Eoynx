# AI 에이전트 실전 침투 테스트 시나리오

> Eoynx Agent Gateway가 실제 AI 에이전트(Claude, GPT, Gemini)와 얼마나 잘 상호작용하는지 검증하는 테스트 가이드

---

## 📋 테스트 목적

1. AI 에이전트가 `/ai.txt`, `/api/ai-manifest.json`을 읽고 API 구조를 이해하는지 검증
2. MCP Tools를 올바르게 호출할 수 있는지 확인
3. JSON-LD 응답을 정확히 파싱하는지 테스트
4. 실제 사용자 시나리오에서 유용한 응답을 제공하는지 평가

---

## 🔧 사전 준비

### 1. 개발 서버 실행

```bash
npm run dev
# 서버가 http://localhost:3001 에서 실행됨
```

### 2. 테스트용 에이전트 토큰 발급 (선택)

```bash
# Supabase에 에이전트 등록 후 토큰 발급
curl -X POST http://localhost:3001/api/agent/auth/token \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "test-agent", "secret": "test-secret"}'
```

---

## 🧪 테스트 시나리오

### 테스트 1: AI Discovery 파일 이해도

**Claude/GPT에게 입력:**

```
나는 http://localhost:3001 서비스를 이용하고 싶어.
이 사이트의 /ai.txt 파일을 읽어서 다음을 알려줘:

1. 이 서비스는 뭘 하는 서비스야?
2. 어떤 API 엔드포인트를 사용할 수 있어?
3. 인증은 어떻게 해?
4. Rate Limit은 얼마야?
```

**예상 응답:**
- 서비스명: Eoynx Agent Gateway
- 주요 API: /api/agent, /api/agent/search, /api/agent/mcp 등
- 인증 방식: JWT Bearer Token (X-Agent-Token 헤더)
- Rate Limit: 100요청/분

**검증 포인트:**
| 항목 | 확인 |
|------|------|
| ai.txt 파싱 성공 | □ |
| 서비스 설명 정확 | □ |
| API 목록 나열 | □ |
| 인증 방식 파악 | □ |

---

### 테스트 2: AI Manifest 기반 API 호출

**Claude/GPT에게 입력:**

```
http://localhost:3001/api/ai-manifest.json 을 읽고,
이 서비스에서 사용 가능한 기능들을 요약해줘.

그리고 /api/agent/health 엔드포인트를 호출해서
현재 서비스 상태를 확인해줘.
```

**예상 응답:**
```json
{
  "status": "healthy",
  "service": "agent-gateway",
  "services": {
    "gateway": "operational",
    "authentication": "operational",
    "mcp": "operational",
    "streaming": "operational"
  }
}
```

**검증 포인트:**
| 항목 | 확인 |
|------|------|
| Manifest JSON 파싱 | □ |
| endpoints 배열 해석 | □ |
| health API 호출 성공 | □ |
| 상태 정보 정확히 보고 | □ |

---

### 테스트 3: MCP 프로토콜 이해

**Claude/GPT에게 입력:**

```
Eoynx 서비스는 MCP(Model Context Protocol)을 지원해.
/api/agent/mcp 엔드포인트에서 사용 가능한 Tools, Resources, Prompts를 조회해줘.

JSON-RPC 형식으로 tools/list, resources/list, prompts/list를 호출해.
```

**기대하는 호출:**
```json
POST /api/agent/mcp
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

**검증 포인트:**
| 항목 | 확인 |
|------|------|
| JSON-RPC 프로토콜 이해 | □ |
| Tools 목록 나열 | □ |
| Resources 목록 나열 | □ |
| Prompts 목록 나열 | □ |

---

### 테스트 4: 검색 기능 활용 (토큰 필요)

**Claude/GPT에게 입력:**

```
Eoynx의 /api/agent/search 엔드포인트를 사용해서
"대전 관광지" 관련 정보를 검색해줘.

검색 결과를 JSON-LD 형식으로 받아서 
사용자가 이해하기 쉽게 정리해줘.
```

**기대하는 응답 형식:**
```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "itemListElement": [
    {
      "@type": "TouristAttraction",
      "name": "...",
      "address": "...",
      "rating": "..."
    }
  ]
}
```

**검증 포인트:**
| 항목 | 확인 |
|------|------|
| 인증 토큰 포함 | □ |
| 검색 파라미터 구성 | □ |
| JSON-LD 응답 파싱 | □ |
| 사용자 친화적 정리 | □ |

---

### 테스트 5: 액션 실행 시뮬레이션

**Claude/GPT에게 입력:**

```
Eoynx의 Sandbox 기능(/api/agent/sandbox)을 사용해서
"장바구니에 상품 추가" 액션을 시뮬레이션해줘.

실제로 실행하지 말고 미리보기로 확인해.
```

**기대하는 호출:**
```json
POST /api/agent/sandbox
{
  "action": "add_to_cart",
  "parameters": {
    "product_id": "sample-001",
    "quantity": 1
  }
}
```

**검증 포인트:**
| 항목 | 확인 |
|------|------|
| Sandbox 개념 이해 | □ |
| 미리보기 vs 실행 구분 | □ |
| 응답 시뮬레이션 파싱 | □ |
| 사이드 이펙트 없음 확인 | □ |

---

### 테스트 6: 실시간 스트림 구독

**Claude/GPT에게 입력:**

```
Eoynx의 /api/agent/stream 엔드포인트를 구독해서
실시간 이벤트를 받고 싶어.

어떤 이벤트 타입이 있고, 어떻게 구독해야 해?
SSE(Server-Sent Events) 형식인지 확인해줘.
```

**기대하는 정보:**
- SSE 프로토콜 사용
- 이벤트 타입: price.changed, stock.updated, order.status
- Accept: text/event-stream 헤더 필요

**검증 포인트:**
| 항목 | 확인 |
|------|------|
| SSE 프로토콜 이해 | □ |
| 이벤트 타입 파악 | □ |
| 헤더 요구사항 이해 | □ |
| 실시간 데이터 흐름 설명 | □ |

---

## 📊 테스트 결과 기록표

| 테스트 | Claude | GPT-4 | Gemini | 비고 |
|--------|--------|-------|--------|------|
| 1. AI Discovery | □ | □ | □ | |
| 2. Manifest + Health | □ | □ | □ | |
| 3. MCP Protocol | □ | □ | □ | |
| 4. Search API | □ | □ | □ | 토큰 필요 |
| 5. Sandbox | □ | □ | □ | 토큰 필요 |
| 6. SSE Stream | □ | □ | □ | |

---

## 🔍 검증 기준

### 점수 기준

| 점수 | 기준 |
|------|------|
| ⭐⭐⭐⭐⭐ (5점) | 완벽한 이해, 정확한 API 호출, 유용한 응답 |
| ⭐⭐⭐⭐ (4점) | 대부분 정확, 사소한 오류 |
| ⭐⭐⭐ (3점) | 기본 이해, 일부 파라미터 누락 |
| ⭐⭐ (2점) | 부분적 이해, 주요 기능 누락 |
| ⭐ (1점) | 거의 이해 못함 |

### 성공 기준

- **Pass**: 평균 4점 이상
- **Conditional Pass**: 평균 3점 이상
- **Fail**: 평균 3점 미만

---

## 💡 트러블슈팅

### 문제 1: ai.txt를 읽지 못함

**원인:** 일부 AI는 임의의 URL을 직접 접근할 수 없음

**해결책:**
```
ai.txt 내용을 직접 복사하여 프롬프트에 포함:

"다음은 Eoynx 서비스의 ai.txt 내용이야:
[ai.txt 내용 붙여넣기]

이 내용을 바탕으로..."
```

### 문제 2: JSON-RPC 형식을 모름

**해결책:**
```
JSON-RPC 2.0 형식을 명시적으로 알려줌:

"MCP는 JSON-RPC 2.0 형식을 사용해. 예시:
{
  \"jsonrpc\": \"2.0\",
  \"id\": 1,
  \"method\": \"tools/list\"
}

이 형식으로 요청을 만들어줘."
```

### 문제 3: 인증 토큰이 필요한 엔드포인트

**해결책:**
```
토큰 발급 과정을 안내:

"먼저 /api/agent/auth/token에 POST 요청으로 토큰을 발급받고,
이후 요청에 X-Agent-Token: <token> 헤더를 포함해."
```

---

## 📝 테스트 보고서 템플릿

```markdown
# Eoynx AI 에이전트 테스트 보고서

**테스트 일시:** YYYY-MM-DD
**테스트 환경:** localhost:3001
**테스트 AI:** Claude 3.5 / GPT-4 / Gemini Pro

## 결과 요약

| 테스트 | 결과 | 점수 |
|--------|------|------|
| AI Discovery | ✅/❌ | X/5 |
| Manifest + Health | ✅/❌ | X/5 |
| MCP Protocol | ✅/❌ | X/5 |
| Search API | ✅/❌ | X/5 |
| Sandbox | ✅/❌ | X/5 |
| SSE Stream | ✅/❌ | X/5 |

**총점:** XX/30
**평균:** X.X점
**판정:** Pass / Conditional Pass / Fail

## 상세 내용

### 테스트 1 상세
[응답 내용...]

### 발견된 문제점
1. ...
2. ...

### 개선 제안
1. ...
2. ...
```

---

## 🎯 다음 단계

테스트 완료 후:
1. 테스트 결과를 기반으로 문서 보완
2. 자주 실패하는 시나리오에 대한 가이드 추가
3. Edge Gateway와의 통합 테스트 수행
4. 프로덕션 환경에서 재테스트

---

*Eoynx - Where Dawn Breaks Through the Darkness*
