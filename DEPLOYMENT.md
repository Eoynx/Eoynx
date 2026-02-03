# Vercel 배포 가이드

## 1. Vercel CLI 설치

```bash
npm install -g vercel
```

## 2. 프로젝트 연결

```bash
vercel link
```

## 3. 환경 변수 설정

Vercel 대시보드 또는 CLI에서 환경 변수를 설정합니다:

### 필수 환경 변수

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `NEXT_PUBLIC_APP_URL` | 앱 URL | `https://agent-gateway.vercel.app` |
| `JWT_SECRET` | JWT 서명 키 | 랜덤 문자열 (32자 이상) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | Supabase 대시보드에서 복사 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | Supabase 대시보드에서 복사 |

### CLI로 환경 변수 추가

```bash
# Production 환경
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add JWT_SECRET production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Preview 환경 (선택)
vercel env add NEXT_PUBLIC_APP_URL preview
# ... 동일하게 추가
```

## 4. 배포

```bash
# Preview 배포
vercel

# Production 배포
vercel --prod
```

## 5. 배포 확인

배포가 완료되면 다음 URL들을 테스트합니다:

- **홈페이지**: `https://your-domain.vercel.app`
- **헬스 체크**: `https://your-domain.vercel.app/api/agent/health`
- **AI 매니페스트**: `https://your-domain.vercel.app/api/ai-manifest.json`
- **MCP 서버**: `https://your-domain.vercel.app/api/agent/mcp`
- **OpenAPI 스펙**: `https://your-domain.vercel.app/api/openapi`

## 6. 커스텀 도메인 설정 (선택)

```bash
vercel domains add your-domain.com
```

## 7. Supabase 데이터베이스 설정

1. [Supabase](https://supabase.com) 프로젝트 생성
2. SQL 에디터에서 `supabase/schema.sql` 실행
3. 환경 변수에 Supabase URL과 키 추가

---

## 배포 체크리스트

- [ ] 환경 변수 모두 설정됨
- [ ] Supabase 데이터베이스 스키마 적용됨
- [ ] 헬스 체크 API 정상 응답
- [ ] CORS 설정 확인
- [ ] SSL 인증서 활성화
- [ ] Edge 함수 정상 동작

## 트러블슈팅

### Edge Runtime 에러
`process` 또는 Node.js 전용 API 사용 시 발생합니다.
- 해당 API를 Edge 호환 대안으로 교체
- 또는 `export const runtime = 'nodejs'`로 변경

### CORS 에러
vercel.json의 headers 설정 확인

### 환경 변수 미적용
`vercel env pull`로 로컬 환경과 동기화
