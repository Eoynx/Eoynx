# 🏪 서비스 등록 가이드

이 문서는 Eoynx Agent Gateway에 새로운 서비스(쇼핑몰)를 등록하고 관리하는 방법을 설명합니다.

## 개요

서비스 등록을 통해 AI 에이전트가 해당 쇼핑몰의 상품을 검색하고 정보를 추출할 수 있게 됩니다.

## 등록 방법

### 1. 대시보드를 통한 등록

가장 쉬운 방법은 웹 대시보드를 사용하는 것입니다:

1. `https://your-domain.com/dashboard/services` 접속
2. "새 서비스 등록" 버튼 클릭
3. 필수 정보 입력
4. 저장

### 2. API를 통한 등록

```bash
curl -X POST https://your-domain.com/api/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "G마켓",
    "slug": "gmarket",
    "url": "https://www.gmarket.co.kr",
    "category": "shopping",
    "selectors": {
      "productContainer": ".box__item-container",
      "name": ".text__item-title",
      "price": ".box__price-seller"
    }
  }'
```

### 3. Supabase 직접 등록

개발 환경에서는 Supabase에 직접 데이터를 삽입할 수 있습니다:

```javascript
// scripts/seed-services.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const services = [
  {
    name: 'G마켓',
    url: 'https://www.gmarket.co.kr',
    category: 'shopping',
    selectors: {
      productContainer: '.box__item-container',
      name: '.text__item-title',
      price: '.box__price-seller'
    }
  }
];

async function seedServices() {
  for (const service of services) {
    const slug = `${service.name.toLowerCase()}-${Date.now().toString(36)}`;
    
    const { data, error } = await supabase
      .from('services')
      .insert({
        ...service,
        slug,
        user_id: 'YOUR_USER_ID',
        ai_txt: `# ${service.name}\n\n${service.url}`,
        json_ld: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: service.name,
          url: service.url
        })
      });
    
    if (error) console.error('Error:', error);
    else console.log('Created:', data);
  }
}

seedServices();
```

실행:
```bash
node scripts/seed-services.js
```

---

## 서비스 스키마

### 필수 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `name` | string | 서비스 이름 (예: "G마켓") |
| `url` | string | 서비스 기본 URL |
| `slug` | string | URL-safe 식별자 |

### 선택 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `category` | string | 카테고리 (shopping, fashion, etc.) |
| `description` | string | 서비스 설명 |
| `logo` | string | 로고 이미지 URL |
| `selectors` | object | CSS 셀렉터 설정 |
| `ai_txt` | string | AI 에이전트용 텍스트 정보 |
| `json_ld` | string | Schema.org JSON-LD |
| `user_id` | string | 소유자 ID |

### selectors 구조

```json
{
  "selectors": {
    "productContainer": ".product-item",
    "name": ".product-name",
    "price": ".product-price",
    "originalPrice": ".original-price",
    "discount": ".discount-rate",
    "link": "a.product-link",
    "image": "img.product-image"
  }
}
```

---

## 등록된 서비스 예시

현재 등록된 쇼핑몰 서비스 목록:

| 서비스 | Slug | 상태 |
|--------|------|------|
| 무신사 | musinsa-mlh9hazt | ⚠️ 봇 감지 |
| G마켓 | gmarket-mlh9hbfl | ✅ 정상 |
| 신세계몰 | ssg-mlh9hbpn | ✅ 정상 |
| W컨셉 | wconcept-mlh9hbt5 | ⚠️ React SPA |
| 11번가 | 11street-mlh9hbw5 | ⚠️ 봇 감지 |
| 하이버 | hiver-mlh9hbzz | ⚠️ React SPA |

---

## 서비스 활용

### MCP를 통한 상품 검색

등록된 서비스에서 상품을 검색합니다:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_products",
    "arguments": {
      "query": "니트",
      "serviceSlug": "gmarket-mlh9hbfl"
    }
  }
}
```

### Category Parser 사용

등록된 셀렉터로 상품 목록을 파싱합니다:

```bash
curl -X POST http://localhost:3000/api/services/category-parse \
  -H "Content-Type: application/json" \
  -d '{
    "serviceSlug": "gmarket-mlh9hbfl",
    "url": "https://www.gmarket.co.kr/search/Search?keyword=니트",
    "options": {
      "maxProducts": 30
    }
  }'
```

### 서비스 상태 확인

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_site_status",
    "arguments": {}
  }
}
```

---

## 셀렉터 찾는 방법

### 1. 브라우저 개발자 도구

1. 쇼핑몰 검색 페이지 접속
2. F12로 개발자 도구 열기
3. Elements 탭에서 상품 요소 찾기
4. 우클릭 → Copy → Copy selector

### 2. analyze 스크립트 사용

```javascript
// scripts/analyze-site.js
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('https://www.gmarket.co.kr/search/Search?keyword=니트');
  await page.waitForTimeout(3000);
  
  // 잠재적 셀렉터 분석
  const analysis = await page.evaluate(() => {
    const selectors = [];
    
    // 반복되는 요소 찾기
    document.querySelectorAll('[class*="item"], [class*="product"]')
      .forEach(el => {
        if (el.querySelectorAll('a, img, [class*="price"]').length > 2) {
          selectors.push({
            tag: el.tagName,
            class: el.className,
            childCount: el.children.length
          });
        }
      });
    
    return selectors;
  });
  
  console.log('잠재적 상품 컨테이너:', analysis);
  await browser.close();
})();
```

---

## 문제 해결

### 봇 감지 차단

일부 사이트는 봇 감지로 차단됩니다:

1. **Stealth 모드 활성화**
   ```json
   {
     "botBypass": {
       "stealth": true,
       "useRandomUserAgent": true
     }
   }
   ```

2. **사이트별 설정 추가** ([category-parse/route.ts](../src/app/api/services/category-parse/route.ts))
   ```typescript
   'example.com': {
     waitTime: 5000,
     scrollCount: 5,
     cookies: [{ name: 'verified', value: 'true', domain: '.example.com' }]
   }
   ```

### React SPA 사이트

W컨셉, 하이버 등 React 기반 SPA 사이트:

1. **API 엔드포인트 직접 호출** (가장 안정적)
2. **waitForSelector 사용** (렌더링 완료 대기)
3. **scrollCount 증가** (지연 로딩 대응)

### 셀렉터가 동작하지 않을 때

1. 페이지 구조 변경 확인
2. 동적 클래스 이름 주의 (예: `class="sc-abc123"`)
3. iframe 내 콘텐츠 확인
4. Shadow DOM 확인

---

## 관련 문서

- [카테고리 파서 가이드](./CATEGORY_PARSER_GUIDE.md)
- [MCP 가이드](./MCP_GUIDE.md)
- [API 가이드](./API_GUIDE.md)
