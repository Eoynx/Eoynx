# 🤝 Eoynx 기여 가이드

Eoynx (이오닉스) 프로젝트에 기여해 주셔서 감사합니다! 

> "어둠을 가르고 시작되는 새벽" - AI와 웹의 새로운 전환점을 함께 열어가요.

## 📋 목차

1. [행동 강령](#행동-강령)
2. [기여 방법](#기여-방법)
3. [개발 환경 설정](#개발-환경-설정)
4. [코드 스타일](#코드-스타일)
5. [커밋 규칙](#커밋-규칙)
6. [Pull Request 프로세스](#pull-request-프로세스)
7. [이슈 보고](#이슈-보고)

---

## 행동 강령

이 프로젝트의 모든 참여자는 서로를 존중하고 건설적인 환경을 유지해야 합니다.

- 모든 배경과 경험 수준의 사람들을 환영합니다
- 건설적이고 존중하는 피드백을 제공합니다
- 괴롭힘이나 차별적 언어를 용납하지 않습니다

## 기여 방법

### 코드 기여

1. 이슈 확인 또는 생성
2. 저장소 포크
3. 기능 브랜치 생성 (`feature/amazing-feature`)
4. 변경사항 커밋
5. 브랜치 푸시
6. Pull Request 생성

### 문서 기여

문서 개선, 번역, 예제 추가도 환영합니다!

### 버그 리포트

버그를 발견하셨나요? [이슈](https://github.com/eoynx/eoynx/issues)를 열어주세요.

## 개발 환경 설정

### 필수 요구사항

- Node.js 18.x 이상
- npm 또는 yarn
- Git

### 설치

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

### 테스트

```bash
# 전체 테스트
npm test

# 타입 체크
npm run type-check

# 린트
npm run lint
```

## 코드 스타일

### TypeScript

- 엄격한 타입 사용 (`strict: true`)
- 명시적 반환 타입 선언
- `any` 사용 최소화

```typescript
// ✅ 좋음
function greet(name: string): string {
  return `Hello, ${name}!`;
}

// ❌ 나쁨
function greet(name) {
  return `Hello, ${name}!`;
}
```

### React/Next.js

- 함수형 컴포넌트 사용
- 클라이언트 컴포넌트는 `'use client'` 명시
- Props는 명시적 타입 정의

### 파일 구조

```
src/
├── app/           # Next.js App Router
├── components/    # 재사용 컴포넌트
├── lib/           # 유틸리티 함수
└── types/         # TypeScript 타입
```

## 커밋 규칙

[Conventional Commits](https://www.conventionalcommits.org/) 형식을 따릅니다.

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Type

- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 스타일 변경 (포맷팅 등)
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드, 설정 변경

### 예시

```
feat(auth): add JWT token refresh

Implement automatic token refresh before expiration.
Closes #123
```

## Pull Request 프로세스

1. **브랜치 명명**: `feature/기능명`, `fix/버그명`, `docs/문서명`

2. **PR 템플릿** 작성:
   - 변경 내용 설명
   - 관련 이슈 링크
   - 테스트 방법
   - 스크린샷 (UI 변경 시)

3. **체크리스트**:
   - [ ] 테스트 통과
   - [ ] 타입 체크 통과
   - [ ] 린트 통과
   - [ ] 문서 업데이트 (필요 시)

4. **리뷰**: 최소 1명의 승인 필요

## 이슈 보고

### 버그 리포트

```markdown
### 버그 설명
[명확하고 간결한 버그 설명]

### 재현 방법
1. '...'로 이동
2. '...'를 클릭
3. '...'까지 스크롤
4. 에러 확인

### 예상 동작
[예상했던 동작]

### 스크린샷
[해당되는 경우 스크린샷 첨부]

### 환경
- OS: [예: macOS 14]
- Browser: [예: Chrome 120]
- Node: [예: 18.x]
```

### 기능 요청

```markdown
### 기능 설명
[원하는 기능에 대한 명확한 설명]

### 문제 해결
[이 기능이 해결하는 문제]

### 대안
[고려한 다른 대안들]
```

---

## 🌅 감사합니다!

Eoynx 프로젝트에 관심을 가져주셔서 감사합니다. 여러분의 기여가 AI와 웹의 새로운 시대를 여는 데 도움이 됩니다.

질문이 있으시면 언제든 [이슈](https://github.com/eoynx/eoynx/issues)를 열거나 [Discussions](https://github.com/eoynx/eoynx/discussions)에서 대화해 주세요.

**Where Dawn Breaks Through the Darkness** 🌅
