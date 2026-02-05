# OAuth 로그인 설정 가이드

Agent Gateway에서 Google 및 GitHub OAuth 로그인을 사용하기 위한 설정 가이드입니다.

## 📋 목차

1. [사전 요구사항](#사전-요구사항)
2. [Google OAuth 설정](#google-oauth-설정)
3. [GitHub OAuth 설정](#github-oauth-설정)
4. [Supabase 설정](#supabase-설정)
5. [환경 변수 설정](#환경-변수-설정)
6. [테스트](#테스트)
7. [문제 해결](#문제-해결)

---

## 사전 요구사항

- Supabase 프로젝트 (https://supabase.com에서 무료로 생성 가능)
- Google Cloud 계정 (Google OAuth 사용 시)
- GitHub 계정 (GitHub OAuth 사용 시)

---

## Google OAuth 설정

### 1단계: Google Cloud Console 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 프로젝트 선택 → **새 프로젝트** 클릭
3. 프로젝트 이름 입력 (예: `Agent Gateway`) → **만들기**

### 2단계: OAuth 동의 화면 설정

1. 왼쪽 메뉴에서 **API 및 서비스** → **OAuth 동의 화면** 선택
2. User Type: **외부** 선택 → **만들기**
3. 앱 정보 입력:
   - **앱 이름**: Agent Gateway
   - **사용자 지원 이메일**: 본인 이메일
   - **앱 로고**: (선택사항)
   - **앱 도메인**: 
     - 홈페이지: `https://yourdomain.com`
     - 개인정보처리방침: `https://yourdomain.com/privacy`
     - 서비스 약관: `https://yourdomain.com/terms`
   - **개발자 연락처 정보**: 본인 이메일
4. **저장 후 계속**

### 3단계: 범위(Scopes) 설정

1. **범위 추가 또는 삭제** 클릭
2. 다음 범위 선택:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `openid`
3. **업데이트** → **저장 후 계속**

### 4단계: 테스트 사용자 추가 (개발 중)

1. **+ ADD USERS** 클릭
2. 테스트할 이메일 주소 추가
3. **저장 후 계속**

### 5단계: OAuth 2.0 클라이언트 ID 생성

1. 왼쪽 메뉴에서 **API 및 서비스** → **사용자 인증 정보** 선택
2. **+ 사용자 인증 정보 만들기** → **OAuth 클라이언트 ID** 선택
3. 설정:
   - **애플리케이션 유형**: 웹 애플리케이션
   - **이름**: Agent Gateway Web Client
   - **승인된 JavaScript 원본**:
     - `http://localhost:3000` (개발용)
     - `https://yourdomain.com` (프로덕션)
   - **승인된 리디렉션 URI**:
     - `https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/auth/v1/callback`
4. **만들기** 클릭
5. **클라이언트 ID**와 **클라이언트 시크릿** 복사해두기

---

## GitHub OAuth 설정

### 1단계: GitHub OAuth App 생성

1. GitHub에 로그인
2. **Settings** → **Developer settings** → **OAuth Apps** 이동
3. **New OAuth App** 클릭

### 2단계: 앱 정보 입력

```
Application name: Agent Gateway
Homepage URL: https://yourdomain.com (또는 http://localhost:3000)
Application description: AI Agent Gateway for web services
Authorization callback URL: https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/auth/v1/callback
```

### 3단계: 클라이언트 정보 확인

1. **Register application** 클릭
2. **Client ID** 확인
3. **Generate a new client secret** 클릭하여 **Client Secret** 생성
4. 두 값 모두 복사해두기

> ⚠️ **주의**: Client Secret은 한 번만 표시됩니다. 반드시 안전한 곳에 저장하세요.

---

## Supabase 설정

### 1단계: Supabase 프로젝트 대시보드 접속

1. [Supabase Dashboard](https://supabase.com/dashboard)에 접속
2. 프로젝트 선택

### 2단계: Google Provider 활성화

1. 왼쪽 메뉴에서 **Authentication** → **Providers** 선택
2. **Google** 클릭
3. **Enable Sign in with Google** 토글 활성화
4. 입력:
   - **Client ID**: Google에서 복사한 클라이언트 ID
   - **Client Secret**: Google에서 복사한 클라이언트 시크릿
5. **Save** 클릭

### 3단계: GitHub Provider 활성화

1. **GitHub** 클릭
2. **Enable Sign in with GitHub** 토글 활성화
3. 입력:
   - **Client ID**: GitHub에서 복사한 Client ID
   - **Client Secret**: GitHub에서 복사한 Client Secret
4. **Save** 클릭

### 4단계: Redirect URL 확인

1. **URL Configuration** 섹션에서 **Site URL** 설정:
   - 개발: `http://localhost:3000`
   - 프로덕션: `https://yourdomain.com`
2. **Redirect URLs** 추가:
   - `http://localhost:3000/**` (개발용)
   - `https://yourdomain.com/**` (프로덕션)

---

## 환경 변수 설정

`.env.local` 파일을 프로젝트 루트에 생성하고 다음 환경 변수를 설정합니다:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# JWT Secret (임의의 긴 문자열)
JWT_SECRET=your-very-long-and-secure-jwt-secret-key-at-least-32-characters

# (선택사항) OAuth 직접 사용 시
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### 환경 변수 가져오는 위치

| 변수 | 위치 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role |

---

## 테스트

### 개발 서버에서 테스트

1. 개발 서버 시작:
```bash
npm run dev
```

2. 브라우저에서 `http://localhost:3000/login` 접속

3. **Google로 계속하기** 또는 **GitHub로 계속하기** 클릭

4. OAuth 인증 완료 후 `/dashboard`로 리다이렉트되면 성공!

### 확인 사항

- [ ] Google 로그인 버튼 클릭 시 Google 로그인 페이지로 이동
- [ ] Google 계정 선택 후 동의 화면 표시
- [ ] 동의 후 `/dashboard`로 리다이렉트
- [ ] GitHub 로그인도 동일하게 동작
- [ ] 로그아웃 후 다시 로그인 가능

---

## 문제 해결

### "redirect_uri_mismatch" 오류

**원인**: Google/GitHub에 등록된 Redirect URI와 실제 요청의 URI가 다름

**해결**:
1. Google Cloud Console 또는 GitHub OAuth App 설정에서 Redirect URI 확인
2. 정확히 `https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback` 형식이어야 함
3. http/https, 슬래시(/) 유무 등 정확히 일치해야 함

### "access_denied" 오류

**원인**: OAuth 동의 화면 설정 문제 또는 테스트 사용자 미등록

**해결**:
1. Google Cloud Console → OAuth 동의 화면 → 테스트 사용자에 이메일 추가
2. 또는 OAuth 동의 화면을 "프로덕션"으로 게시

### "invalid_client" 오류

**원인**: Client ID 또는 Client Secret이 잘못됨

**해결**:
1. Supabase Dashboard에서 입력한 값 재확인
2. 공백이나 줄바꿈이 없는지 확인

### 쿠키가 설정되지 않음

**원인**: sameSite 쿠키 정책 또는 HTTPS 문제

**해결**:
1. 개발 환경에서는 `http://localhost:3000` 사용
2. 프로덕션에서는 반드시 HTTPS 사용
3. `secure: true` 설정은 HTTPS에서만 동작

### "Email not confirmed" 오류

**원인**: Supabase에서 이메일 확인이 필요하도록 설정됨

**해결**:
1. Supabase Dashboard → Authentication → Settings
2. **Confirm email** 옵션 확인
3. OAuth 로그인은 일반적으로 자동 확인됨

---

## 프로덕션 체크리스트

배포 전 확인사항:

- [ ] 모든 OAuth Redirect URI를 프로덕션 도메인으로 업데이트
- [ ] Supabase Site URL을 프로덕션 도메인으로 변경
- [ ] 환경 변수를 프로덕션 값으로 설정
- [ ] Google OAuth 동의 화면을 "프로덕션"으로 게시
- [ ] HTTPS 인증서 설정
- [ ] JWT_SECRET을 강력한 랜덤 문자열로 설정

---

## 추가 리소스

- [Supabase Auth 공식 문서](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 가이드](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth 가이드](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Next.js Authentication 패턴](https://nextjs.org/docs/authentication)
