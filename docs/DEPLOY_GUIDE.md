# 🚀 Eoynx Vercel 배포 가이드

이 문서는 Eoynx를 Vercel에 배포하는 방법을 안내합니다.

## 📋 사전 준비

### 필수 사항
- [Vercel 계정](https://vercel.com/signup)
- [GitHub 계정](https://github.com) (GitHub 연동 시)
- Node.js 18+

### 환경 변수 준비
배포 전 다음 환경 변수를 준비하세요:

```env
# 필수
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Supabase (옵션 - 데이터베이스 사용 시)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 방법 1: GitHub 연동 (권장) 🌟

### Step 1: GitHub에 코드 푸시

```bash
# Git 초기화 (이미 되어있다면 스킵)
git init

# 원격 저장소 추가
git remote add origin https://github.com/YOUR_USERNAME/eoynx.git

# 커밋 및 푸시
git add .
git commit -m "🌅 Initial commit - Eoynx v0.1.0"
git push -u origin main
```

### Step 2: Vercel에서 Import

1. https://vercel.com/dashboard 접속
2. **"Add New Project"** 클릭
3. **"Import Git Repository"** 선택
4. GitHub 계정 연결 및 `eoynx` 저장소 선택

### Step 3: 환경 변수 설정

1. Import 화면에서 **"Environment Variables"** 섹션 찾기
2. 다음 변수들 추가:
   - `JWT_SECRET`: 안전한 랜덤 문자열 (최소 32자)
   - `NEXT_PUBLIC_APP_URL`: `https://your-project.vercel.app`
   
3. (선택) Supabase 변수들 추가

### Step 4: Deploy

**"Deploy"** 버튼 클릭하고 배포 완료까지 대기 (약 1-2분)

### Step 5: 커스텀 도메인 설정 (선택)

1. Project Settings > Domains
2. `eoynx.com` 입력
3. DNS 설정 안내에 따라 구성

---

## 방법 2: Vercel CLI

### Step 1: CLI 설치 및 로그인

```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login
```

### Step 2: 프로젝트 연결

```bash
# 프로젝트 디렉토리에서 실행
cd eoynx
vercel link
```

### Step 3: 환경 변수 설정

```bash
# 환경 변수 추가
vercel env add JWT_SECRET production
# 프롬프트에서 값 입력

vercel env add NEXT_PUBLIC_APP_URL production
# https://eoynx.vercel.app 입력
```

### Step 4: 배포

```bash
# Preview 배포 (테스트)
vercel

# Production 배포
vercel --prod
```

---

## 🔧 배포 후 설정

### 1. API 테스트

```bash
# Health Check
curl https://your-domain.vercel.app/api/agent/health

# AI Manifest
curl https://your-domain.vercel.app/api/ai-manifest.json

# MCP 테스트
curl -X POST https://your-domain.vercel.app/api/agent/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### 2. 커스텀 도메인 DNS 설정

**eoynx.com** 도메인 사용 시:

| Type | Name | Value |
|------|------|-------|
| A | @ | 76.76.21.21 |
| CNAME | www | cname.vercel-dns.com |

### 3. HTTPS 자동 설정

Vercel은 자동으로 Let's Encrypt SSL 인증서를 발급합니다.

---

## 🔄 자동 배포 (CI/CD)

GitHub 연동 시 자동 활성화:

- **Production**: `main` 브랜치 푸시 → 자동 배포
- **Preview**: PR 생성 → 프리뷰 URL 자동 생성

### Branch Protection (권장)

GitHub 저장소 Settings > Branches:
- `main` 브랜치 보호 규칙 추가
- PR 필수, 리뷰 승인 필요

---

## 🐛 문제 해결

### Build 실패

```bash
# 로컬에서 빌드 테스트
npm run build

# 타입 에러 확인
npm run type-check

# 린트 에러 확인
npm run lint
```

### 환경 변수 문제

- `NEXT_PUBLIC_` 접두사가 있는 변수는 클라이언트에 노출됨
- 민감한 정보는 접두사 없이 설정

### Edge Runtime 경고

이 프로젝트는 Edge Runtime을 사용합니다. 정상 동작이며 무시해도 됩니다.

---

## 📊 모니터링

Vercel Dashboard에서 확인 가능:
- **Analytics**: 트래픽 분석
- **Logs**: 실시간 로그
- **Speed Insights**: 성능 모니터링

---

## 🎉 배포 완료!

배포가 완료되면:

1. ✅ `https://eoynx.vercel.app` (또는 커스텀 도메인) 접속 확인
2. ✅ `/api/agent/health` 헬스 체크
3. ✅ `/dashboard` 대시보드 접근
4. ✅ MCP 도구 테스트

**축하합니다! 🌅 Eoynx가 세상에 배포되었습니다!**
