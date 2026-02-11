# 배포 가이드

Agent-Gateway는 **Vercel** (Next.js 앱) + **Cloudflare Workers** (Edge Gateway)로 배포됩니다.

---

## 🚀 Part 1: Vercel 배포 (Next.js)

### 1.1 Vercel CLI 설치

```bash
npm install -g vercel
```

### 1.2 프로젝트 연결

```bash
vercel link
```

### 1.3 환경 변수 설정

Vercel 대시보드 또는 CLI에서 환경 변수를 설정합니다:

#### 필수 환경 변수

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `NEXT_PUBLIC_APP_URL` | 앱 URL | `https://eoynx.com` |
| `JWT_SECRET` | JWT 서명 키 (32자 이상) | 랜덤 문자열 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | Supabase 대시보드 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | Supabase 대시보드 |

#### 선택 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `EDGE_GATEWAY_URL` | Cloudflare Workers URL | - |
| `GITHUB_CLIENT_ID` | GitHub OAuth | - |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | - |
| `GOOGLE_CLIENT_ID` | Google OAuth | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | - |

#### CLI로 환경 변수 추가

```bash
# Production 환경
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add JWT_SECRET production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

### 1.4 배포

```bash
# Preview 배포
vercel

# Production 배포
vercel --prod
```

### 1.5 배포 확인

| 엔드포인트 | 설명 |
|-----------|------|
| `/` | 홈페이지 |
| `/api/agent/health` | 헬스 체크 |
| `/api/ai-manifest.json` | AI 매니페스트 |
| `/api/agent/mcp` | MCP 서버 |
| `/api/openapi` | OpenAPI 스펙 |
| `/dashboard` | 관리 대시보드 |

---

## ⚡ Part 2: Cloudflare Workers 배포 (Edge Gateway)

### 2.1 Wrangler CLI 설치

```bash
npm install -g wrangler
```

### 2.2 Cloudflare 로그인

```bash
wrangler login
```

### 2.3 D1 데이터베이스 생성

```bash
cd workers/edge-gateway

# D1 데이터베이스 생성
wrangler d1 create agent-gateway-db

# 출력된 database_id를 wrangler.toml에 추가
```

`wrangler.toml` 업데이트:
```toml
[[d1_databases]]
binding = "DB"
database_name = "agent-gateway-db"
database_id = "<출력된 ID>"
```

### 2.4 마이그레이션 실행

```bash
# 로컬 테스트
wrangler d1 execute agent-gateway-db --local --file=./migrations/001_init.sql
wrangler d1 execute agent-gateway-db --local --file=./migrations/002_service_items.sql

# Production 적용
wrangler d1 execute agent-gateway-db --file=./migrations/001_init.sql
wrangler d1 execute agent-gateway-db --file=./migrations/002_service_items.sql
```

### 2.5 환경 변수 (Secrets) 설정

```bash
# Supabase 연동 (로그 저장용)
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
```

### 2.6 Workers 배포

```bash
# 배포
wrangler deploy

# 배포 확인
curl https://edge-gateway.<your-subdomain>.workers.dev/health
```

### 2.7 Browser Rendering 활성화 (선택)

Cloudflare Dashboard에서 Browser Rendering을 활성화하면 JavaScript 렌더링이 필요한 페이지도 파싱할 수 있습니다.

1. Workers & Pages → 프로젝트 선택
2. Settings → Bindings
3. Browser 바인딩 추가: `BROWSER`

---

## 🗄️ Part 3: Supabase 설정

### 3.1 프로젝트 생성

1. [Supabase](https://supabase.com) 로그인
2. New Project 생성
3. API Settings에서 URL과 Keys 복사

### 3.2 테이블 생성

SQL Editor에서 다음 파일들을 순서대로 실행:

```sql
-- 1. 권한 테이블 (003_permissions.sql)
CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ko TEXT,
  description TEXT,
  description_ko TEXT,
  level TEXT NOT NULL DEFAULT 'basic',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE guardrail_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ko TEXT,
  description TEXT,
  description_ko TEXT,
  type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

전체 스키마는 `supabase/migrations/` 폴더를 참조하세요.

### 3.3 RLS (Row Level Security) 설정

```sql
-- agents 테이블 RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- 읽기 허용
CREATE POLICY "Allow read" ON agents FOR SELECT USING (true);

-- 서비스 키로만 쓰기 허용
CREATE POLICY "Allow service write" ON agents FOR ALL 
USING (auth.role() = 'service_role');
```

---

## 🌐 Part 4: 커스텀 도메인

### Vercel 커스텀 도메인

```bash
vercel domains add eoynx.com
vercel domains add www.eoynx.com
```

DNS 설정:
- `A` 레코드: `76.76.21.21`
- `CNAME` 레코드: `cname.vercel-dns.com`

### Cloudflare Workers 커스텀 도메인

1. Workers & Pages → 프로젝트 선택
2. Triggers → Custom Domains
3. 도메인 추가: `edge.eoynx.com`

---

## ✅ 배포 체크리스트

### Vercel
- [ ] 환경 변수 모두 설정됨
- [ ] `vercel --prod` 성공
- [ ] `/api/agent/health` 200 응답
- [ ] `/dashboard` 접근 가능

### Cloudflare Workers
- [ ] D1 데이터베이스 생성됨
- [ ] 마이그레이션 적용됨
- [ ] Secrets 설정됨
- [ ] `wrangler deploy` 성공
- [ ] `/health` 200 응답

### Supabase
- [ ] 테이블 생성됨
- [ ] RLS 정책 적용됨
- [ ] 연결 테스트 성공

---

## 🔧 트러블슈팅

### Edge Runtime 에러
```
Error: The edge runtime does not support Node.js 'xxx'
```
→ `export const runtime = 'nodejs'`로 변경하거나 Edge 호환 API 사용

### D1 에러: "table already exists"
```bash
wrangler d1 execute agent-gateway-db --command "DROP TABLE IF EXISTS table_name"
```

### Supabase 연결 실패
→ URL/Key 확인, 테이블 존재 여부 확인

### CORS 에러
→ `vercel.json` headers 설정 확인:
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ]
}
```

### Workers 배포 실패
```bash
# 로그 확인
wrangler tail

# 로컬 테스트
wrangler dev
```

---

## 📊 모니터링

### Vercel Analytics
- Vercel Dashboard → Analytics 탭

### Cloudflare Analytics
- Workers & Pages → 프로젝트 → Analytics

### Supabase Logs
- Supabase Dashboard → Logs

---

## 🔄 CI/CD (GitHub Actions)

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  vercel:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  cloudflare:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          workingDirectory: workers/edge-gateway
```

---

## 📝 환경별 설정 요약

| 환경 | Vercel | Cloudflare | Supabase |
|------|--------|------------|----------|
| **개발** | `vercel dev` | `wrangler dev` | Local / Remote |
| **스테이징** | Preview Deploy | - | 별도 프로젝트 |
| **프로덕션** | `vercel --prod` | `wrangler deploy` | Production DB |

---

**문의**: GitHub Issues 또는 [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) 참조
