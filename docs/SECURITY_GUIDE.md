# 보안 가이드

## 목차
1. [필수 환경 변수](#필수-환경-변수)
2. [수정된 보안 취약점](#수정된-보안-취약점)
3. [프로덕션 배포 체크리스트](#프로덕션-배포-체크리스트)
4. [보안 모범 사례](#보안-모범-사례)

---

## 필수 환경 변수

프로덕션 배포 전 반드시 설정해야 하는 환경 변수입니다.

```bash
# 필수: JWT 서명 시크릿 (최소 32자)
JWT_SECRET=your-secure-random-secret-at-least-32-characters

# 필수: Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 권장: CORS 허용 오리진 (쉼표 구분)
ALLOWED_ORIGINS=https://eoynx.com,https://www.eoynx.com

# 권장: 신뢰할 수 있는 프록시 IP (Rate Limit 우회 방지)
TRUSTED_PROXIES=10.0.0.1,10.0.0.2

# 개발 환경 전용: 데모 에이전트 (형식: agentId:secret,agentId:secret)
DEMO_AGENT_CREDENTIALS=demo-agent:your-demo-secret
```

---

## 수정된 보안 취약점

### 🚨 심각 (Critical)

| # | 취약점 | 수정 내용 |
|---|--------|-----------|
| 1 | 하드코딩된 JWT Secret | `jwt-config.ts`로 중앙화, 환경 변수 필수화 |
| 2 | 서명 없는 JWT 검증 | 프로덕션에서 서명 검증 필수, 개발 환경만 경고 |
| 3 | 데모 자격증명 노출 | 환경 변수로 이동, 프로덕션에서 비활성화 |

### 🟠 높음 (High)

| # | 취약점 | 수정 내용 |
|---|--------|-----------|
| 4 | CORS 와일드카드 | `ALLOWED_ORIGINS` 환경 변수로 제한, Agent API만 와일드카드 |
| 5 | verifyAuthToken 취약 | HMAC/JWKS 서명 검증 추가 |
| 6 | 폴백 시크릿 중복 | 모든 파일에서 `jwt-config.ts` 사용으로 통일 |

### 🟡 중간 (Medium)

| # | 취약점 | 수정 내용 |
|---|--------|-----------|
| 7 | XSS 위험 | JSON-LD는 서버 사이드 렌더링으로 안전 |
| 8 | Rate Limit 우회 | `getClientIp()` 함수로 IP 스푸핑 방지 |
| 9 | 로그 민감정보 | IP 마스킹, 토큰/비밀번호 필터링 |

---

## 프로덕션 배포 체크리스트

### 환경 변수
- [ ] `JWT_SECRET` 설정됨 (최소 32자, 랜덤 생성)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 설정됨
- [ ] `ALLOWED_ORIGINS` 설정됨
- [ ] `NODE_ENV=production` 설정됨

### 보안 설정
- [ ] HTTPS 강제 적용됨
- [ ] 쿠키에 `secure: true` 설정됨
- [ ] 로그에 민감 정보 없음 확인

### 데이터베이스
- [ ] Supabase RLS(Row Level Security) 활성화됨
- [ ] 서비스 롤 키가 클라이언트에 노출되지 않음

### 모니터링
- [ ] 에러 로깅 서비스 연동됨
- [ ] Rate Limit 알림 설정됨

---

## 보안 모범 사례

### JWT Secret 생성
```bash
# Node.js로 안전한 시크릿 생성
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# OpenSSL로 생성
openssl rand -hex 64
```

### CORS 정책
```typescript
// ✅ 좋은 예: 특정 도메인만 허용
ALLOWED_ORIGINS=https://eoynx.com,https://api.eoynx.com

// ❌ 나쁜 예: 와일드카드 (Agent API 제외)
Access-Control-Allow-Origin: *
```

### Rate Limiting
```typescript
// IP 기반 + 토큰 기반 복합 사용 권장
const rateLimitKey = agentToken 
  ? `token:${agentToken}` 
  : `ip:${clientIp}`;
```

### 로깅
```typescript
// ✅ 좋은 예: 민감 정보 마스킹
const maskedIp = ip.replace(/\.\d+$/, '.***');

// ❌ 나쁜 예: 원본 IP 그대로 로깅
console.log(`IP: ${ip}`);
```

---

## 파일 변경 요약

### 새로 생성된 파일
- `src/lib/auth/jwt-config.ts` - JWT 중앙 설정

### 수정된 파일
- `src/middleware.ts` - CORS, Rate Limit, 로깅 보안 강화
- `src/lib/auth/m2m-auth.ts` - JWT 설정 통합
- `src/app/api/agent/auth/token/route.ts` - 데모 자격증명 제거
- `src/app/api/auth/*.ts` - JWT 설정 통합
- `src/app/api/services/*.ts` - JWT 설정 통합
- `src/app/api/dashboard/api-keys/route.ts` - JWT 설정 통합

---

## 추가 권장 사항

1. **정기 보안 감사**: 분기별 의존성 취약점 검사
2. **시크릿 로테이션**: JWT Secret 주기적 변경
3. **접근 로그 분석**: 이상 패턴 모니터링
4. **침투 테스트**: 연간 외부 보안 점검

---

*마지막 업데이트: 2026년 2월 12일*
