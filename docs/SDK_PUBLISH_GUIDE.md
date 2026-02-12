# @eoynx/sdk npm 배포 가이드

## 📦 패키지 정보

- **패키지명**: `@eoynx/sdk`
- **버전**: `0.1.0`
- **크기**: ~15.6 KB (gzipped)
- **지원**: CJS, ESM, TypeScript

## 🚀 배포 방법

### 1. npm 계정 준비

```bash
# npm 로그인 (없다면 https://www.npmjs.com 에서 가입)
npm login

# scoped 패키지를 위한 npm 조직 생성 필요
# https://www.npmjs.com/org/create 에서 'eoynx' 조직 생성
```

### 2. 패키지 배포

```bash
cd packages/sdk

# 빌드 (이미 완료됨)
npm run build

# 공개 배포 (scoped 패키지는 기본 비공개)
npm publish --access public
```

### 3. 버전 업데이트

```bash
# 패치 버전 (버그 수정): 0.1.0 → 0.1.1
npm version patch

# 마이너 버전 (기능 추가): 0.1.0 → 0.2.0
npm version minor

# 메이저 버전 (Breaking Changes): 0.1.0 → 1.0.0
npm version major

# 변경 후 배포
npm publish --access public
```

## 📁 패키지 구조

```
@eoynx/sdk
├── dist/
│   ├── index.js        # CJS 메인
│   ├── index.mjs       # ESM 메인
│   ├── index.d.ts      # TypeScript 타입
│   └── react/
│       ├── index.js    # React hooks CJS
│       ├── index.mjs   # React hooks ESM
│       └── index.d.ts  # React hooks 타입
├── package.json
└── README.md
```

## 🔧 사용법

### 설치

```bash
npm install @eoynx/sdk
# 또는
yarn add @eoynx/sdk
```

### 기본 사용

```typescript
import EoynxClient from '@eoynx/sdk';

const client = new EoynxClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.eoynx.com' // 선택사항
});

// 웹페이지 파싱
const products = await client.parse('https://example.com/products');
console.log(products);

// 서비스 검색
const services = await client.search({ category: 'shopping' });
console.log(services);
```

### React 훅

```tsx
import { useEoynxParser, useEoynxSearch } from '@eoynx/sdk/react';

function ProductList() {
  const { data, loading, error, parse } = useEoynxParser();
  
  useEffect(() => {
    parse('https://example.com/products');
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <ul>
      {data?.items?.map(item => (
        <li key={item.id}>{item.name} - {item.price}</li>
      ))}
    </ul>
  );
}
```

## ✅ 배포 체크리스트

- [ ] npm 조직 `@eoynx` 생성됨
- [ ] npm 로그인 완료
- [ ] `npm run build` 성공
- [ ] `npm pack --dry-run` 확인
- [ ] CHANGELOG.md 업데이트
- [ ] Git 태그 생성 (`git tag v0.1.0`)
- [ ] `npm publish --access public` 실행

## 🔄 CI/CD 자동화 (GitHub Actions)

`.github/workflows/publish-sdk.yml`:

```yaml
name: Publish SDK

on:
  push:
    tags:
      - 'sdk-v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install & Build
        working-directory: packages/sdk
        run: |
          npm ci
          npm run build
      
      - name: Publish
        working-directory: packages/sdk
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### GitHub Secrets 설정

1. npmjs.com → Account → Access Tokens → Generate New Token (Automation)
2. GitHub Repo → Settings → Secrets → New repository secret
3. Name: `NPM_TOKEN`, Value: 위에서 생성한 토큰

## 📊 패키지 통계

배포 후 확인:
- https://www.npmjs.com/package/@eoynx/sdk
- https://bundlephobia.com/package/@eoynx/sdk
