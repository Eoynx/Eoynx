# Eoynx 환경변수 설정 가이드

## 📋 필수 환경변수 목록

### 1. Supabase 설정
```env
# Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co

# Supabase 익명 키 (클라이언트 사이드에서 사용, 공개 가능)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase 서비스 롤 키 (서버 사이드 전용, 절대 공개 금지!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. 인증 설정
```env
# JWT 시크릿 키 (에이전트 토큰 서명용)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# 토큰 만료 시간 (초 단위, 기본 24시간)
JWT_EXPIRES_IN=86400
```

### 3. 선택적 설정
```env
# Node 환경 설정
NODE_ENV=production

# Rate Limiting (분당 요청 수)
RATE_LIMIT_PER_MINUTE=60

# 허용된 오리진 (CORS)
ALLOWED_ORIGINS=https://eoynx.com,https://www.eoynx.com
```

---

## 🔧 Vercel 환경변수 설정 방법

### 방법 1: Vercel CLI 사용

```bash
# Supabase URL 설정
vercel env add NEXT_PUBLIC_SUPABASE_URL

# Supabase Anon Key 설정
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# Supabase Service Role Key 설정 (프로덕션 전용)
vercel env add SUPABASE_SERVICE_ROLE_KEY

# JWT Secret 설정
vercel env add JWT_SECRET
```

각 명령어 실행 시:
1. 값 입력 프롬프트가 나타남
2. 환경 선택: Production / Preview / Development (모두 선택 권장)

### 방법 2: Vercel 대시보드 사용

1. [Vercel Dashboard](https://vercel.com/eundaegis-projects/eoynx) 접속
2. **Settings** → **Environment Variables**
3. 각 변수 추가:
   - Name: 변수명
   - Value: 값
   - Environments: Production, Preview, Development 모두 체크

### 방법 3: vercel.json 사용 (권장하지 않음)

⚠️ vercel.json에 환경변수를 직접 작성하면 Git에 노출됩니다!
대신 Vercel 대시보드나 CLI를 사용하세요.

---

## 📍 Supabase 키 찾기

1. [Supabase Dashboard](https://supabase.com/dashboard) 로그인
2. 프로젝트 선택 또는 새 프로젝트 생성
3. **Settings** → **API** 메뉴
4. 키 복사:
   - **URL**: Project URL
   - **anon public**: NEXT_PUBLIC_SUPABASE_ANON_KEY
   - **service_role**: SUPABASE_SERVICE_ROLE_KEY (⚠️ 절대 공개 금지!)

---

## 🔐 JWT Secret 생성

### 방법 1: OpenSSL (권장)
```bash
openssl rand -base64 32
```

### 방법 2: Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 방법 3: PowerShell
```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

생성된 값을 `JWT_SECRET`으로 사용하세요.

---

## ✅ 환경변수 설정 확인

```bash
# 설정된 환경변수 목록 확인
vercel env ls

# 특정 환경변수 값 확인
vercel env pull .env.vercel
```

---

## 🚀 설정 완료 후

환경변수 설정 후 재배포가 필요합니다:

```bash
vercel --prod
```

---

## 🚨 보안 주의사항

1. **SUPABASE_SERVICE_ROLE_KEY**는 절대 클라이언트 코드에 노출하지 마세요
2. **JWT_SECRET**은 최소 32자 이상의 랜덤 문자열을 사용하세요
3. `.env.local` 파일은 `.gitignore`에 포함되어 있는지 확인하세요
4. 환경변수를 코드에 직접 하드코딩하지 마세요

---

## 📊 현재 프로젝트 환경변수 상태

| 변수명 | 상태 | 필수 |
|--------|------|------|
| NEXT_PUBLIC_SUPABASE_URL | ⏳ 설정 필요 | ✅ |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ⏳ 설정 필요 | ✅ |
| SUPABASE_SERVICE_ROLE_KEY | ⏳ 설정 필요 | ✅ |
| JWT_SECRET | ⏳ 설정 필요 | ✅ |
| NODE_ENV | 자동 설정 | - |
