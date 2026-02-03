# Agent Gateway에 기여하기

Agent Gateway 프로젝트에 관심을 가져주셔서 감사합니다! 이 문서는 프로젝트에 기여하는 방법을 안내합니다.

## 기여 방법

### 1. 버그 리포트

버그를 발견하셨다면 [GitHub Issues](https://github.com/your-org/agent-gateway/issues)에 새 이슈를 등록해주세요.

이슈 작성 시 포함해야 할 정보:
- 버그에 대한 명확한 설명
- 재현 단계
- 예상 동작 vs 실제 동작
- 환경 정보 (OS, Node.js 버전, 브라우저 등)
- 스크린샷 (해당되는 경우)
- 에러 로그 (해당되는 경우)

### 2. 기능 제안

새로운 기능 아이디어가 있으시다면:
1. 먼저 [Issues](https://github.com/your-org/agent-gateway/issues)에서 유사한 제안이 있는지 확인해주세요.
2. 없다면 새 이슈를 열어 기능에 대해 설명해주세요.
3. 커뮤니티와 논의 후 구현을 시작해주세요.

### 3. 코드 기여

#### 개발 환경 설정

```bash
# 저장소 포크 & 클론
git clone https://github.com/your-username/agent-gateway.git
cd agent-gateway

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local

# 개발 서버 실행
npm run dev
```

#### 브랜치 전략

- `main`: 프로덕션 브랜치
- `develop`: 개발 브랜치
- `feature/*`: 새 기능 개발
- `fix/*`: 버그 수정
- `docs/*`: 문서 수정

```bash
# 새 기능 브랜치 생성
git checkout -b feature/your-feature-name

# 버그 수정 브랜치 생성
git checkout -b fix/bug-description
```

#### 코드 스타일

이 프로젝트는 다음 규칙을 따릅니다:

- **TypeScript**: 엄격 모드 사용
- **ESLint**: Next.js 기본 설정
- **Prettier**: 코드 포맷팅
- **명명 규칙**:
  - 변수/함수: camelCase
  - 컴포넌트: PascalCase
  - 상수: UPPER_SNAKE_CASE
  - 타입/인터페이스: PascalCase

```bash
# 린트 검사
npm run lint

# 타입 검사
npm run type-check
```

#### 커밋 메시지

[Conventional Commits](https://www.conventionalcommits.org/) 형식을 따릅니다:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**타입:**
- `feat`: 새 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 스타일 변경 (포맷팅 등)
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드 설정, 의존성 업데이트 등

**예시:**
```
feat(mcp): add batch request support

Add support for JSON-RPC batch requests in MCP handler.
Multiple requests can now be sent in a single API call.

Closes #123
```

#### 테스트

모든 코드 변경에는 적절한 테스트가 필요합니다:

```bash
# 테스트 실행
npm test

# 특정 테스트 파일 실행
npm test -- src/lib/auth/__tests__/m2m-auth.test.ts

# 커버리지 확인
npm run test:coverage

# API 테스트
npm run test:api
```

#### Pull Request

1. 변경 사항을 커밋합니다.
2. 원본 저장소의 `develop` 브랜치를 기준으로 PR을 생성합니다.
3. PR 템플릿을 작성합니다.
4. 리뷰를 기다립니다.

**PR 체크리스트:**
- [ ] 코드가 린트 검사를 통과합니다
- [ ] 타입 검사를 통과합니다
- [ ] 모든 테스트가 통과합니다
- [ ] 새 기능에 대한 테스트를 추가했습니다
- [ ] 필요한 경우 문서를 업데이트했습니다

---

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── api/agent/         # API 라우트
│   ├── dashboard/         # 대시보드 페이지
│   └── page.tsx           # 메인 페이지
├── components/            # React 컴포넌트
├── lib/                   # 유틸리티 라이브러리
│   ├── auth/              # 인증 로직
│   ├── extractor/         # 데이터 추출
│   ├── prompt/            # 프롬프트 생성
│   └── supabase/          # DB 클라이언트
└── types/                 # TypeScript 타입
```

## 주요 모듈

### M2M 인증 (`src/lib/auth/`)

JWT 기반 에이전트 인증을 처리합니다.

```typescript
import { generateAgentToken, verifyAgentToken } from '@/lib/auth/m2m-auth';
```

### MCP 핸들러 (`src/app/api/agent/mcp/`)

Model Context Protocol 요청을 처리합니다.

### 프롬프트 생성기 (`src/lib/prompt/`)

사이트 컨텍스트를 기반으로 AI 에이전트용 프롬프트를 생성합니다.

---

## 커뮤니티 가이드라인

- 서로를 존중하고 건설적인 피드백을 제공해주세요.
- 질문은 언제든 환영합니다.
- 다양한 의견을 존중해주세요.

## 라이선스

이 프로젝트에 기여하면 MIT 라이선스 하에 코드가 배포됩니다.

---

감사합니다! 🙏
