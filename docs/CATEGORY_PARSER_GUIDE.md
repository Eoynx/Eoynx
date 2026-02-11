# 🛒 카테고리 파서 API 가이드

이 문서는 쇼핑몰 카테고리/검색 페이지에서 상품 정보를 추출하는 Category Parser API 사용법을 설명합니다.

## 개요

Category Parser는 Puppeteer 기반의 헤드리스 브라우저를 사용하여 다양한 쇼핑몰의 상품 목록 페이지를 파싱합니다. 봇 감지 우회 기능과 사이트별 최적화 설정을 포함합니다.

## 엔드포인트

```
POST /api/services/category-parse
Content-Type: application/json
```

## 요청 형식

```json
{
  "url": "https://www.gmarket.co.kr/search/Search?keyword=니트",
  "selectors": {
    "productContainer": ".box__item-container",
    "name": ".text__item-title",
    "price": ".box__price-seller",
    "link": "a.link__item",
    "image": "img.image__item"
  },
  "options": {
    "maxProducts": 30,
    "botBypass": {
      "stealth": true,
      "useRandomUserAgent": true
    }
  }
}
```

## 응답 형식

```json
{
  "success": true,
  "url": "https://www.gmarket.co.kr/search/Search?keyword=니트",
  "productCount": 30,
  "products": [
    {
      "name": "트래드클럽 베이직 니트 5컬러",
      "price": 30820,
      "originalPrice": 33500,
      "discount": "8%",
      "link": "https://item.gmarket.co.kr/item?goodscode=...",
      "image": "https://gdimg.gmarket.co.kr/..."
    }
  ],
  "timestamp": "2026-02-11T00:00:00.000Z"
}
```

---

## 지원 쇼핑몰

| 쇼핑몰 | 상태 | 비고 |
|--------|------|------|
| G마켓 | ✅ 정상 | 30개 상품, 가격 추출 완벽 |
| 신세계몰 (SSG) | ✅ 정상 | 30개 상품, 가격 추출 완벽 |
| 무신사 | ⚠️ 제한적 | 봇 감지로 가격 0원 표시 |
| 11번가 | ⚠️ 제한적 | 봇 감지로 차단 |
| 쿠팡 | ❌ 차단 | Access Denied |
| 옥션 | ❌ 차단 | CAPTCHA 필요 |
| W컨셉 | ⚠️ 제한적 | React SPA, 별도 처리 필요 |
| 하이버 | ⚠️ 제한적 | React SPA, 별도 처리 필요 |

---

## 셀렉터 가이드

### G마켓

```json
{
  "productContainer": ".box__item-container",
  "name": ".text__item-title",
  "price": ".box__price-seller",
  "link": "a.link__item",
  "image": "img.image__item",
  "originalPrice": ".text__original-price",
  "discount": ".text__discount-rate"
}
```

### 신세계몰 (SSG)

```json
{
  "productContainer": ".cunit_t232",
  "name": ".cunit_info .title",
  "price": ".cunit_price .ssg_price",
  "link": "a.clickable",
  "image": "img.cunit_prod_img"
}
```

### 무신사

```json
{
  "productContainer": "a[data-item-id]",
  "name": ".article_info .list_info a",
  "price": ".price, .article_price",
  "link": "a[data-item-id]",
  "image": "img.lazyload, img.list_img"
}
```

---

## 봇 우회 옵션

### botBypass 파라미터

```json
{
  "botBypass": {
    "stealth": true,
    "useRandomUserAgent": true,
    "cookies": [
      {
        "name": "session_id",
        "value": "abc123",
        "domain": ".example.com"
      }
    ],
    "headers": {
      "Accept-Language": "ko-KR,ko;q=0.9"
    }
  }
}
```

### 지원 기능

| 기능 | 설명 |
|------|------|
| Stealth Mode | `navigator.webdriver` 숨김, Chrome 플러그인 에뮬레이션 |
| User-Agent 로테이션 | 6개 브라우저 User-Agent 랜덤 선택 |
| 사이트별 쿠키 | 로그인 세션 유지용 쿠키 설정 |
| 커스텀 헤더 | Referer, Accept-Language 등 설정 |
| 랜덤 딜레이 | 인간 행동 시뮬레이션 (500-1500ms) |
| 페이지 스크롤 | 무한 스크롤 페이지 대응 |

### 사이트별 기본 설정

```typescript
const SITE_SPECIFIC_CONFIGS = {
  'musinsa.com': {
    waitTime: 5000,
    scrollCount: 5,
    cookies: [{ name: 'age_verified', value: 'true', domain: '.musinsa.com' }]
  },
  'gmarket.co.kr': {
    waitTime: 3000,
    scrollCount: 3
  },
  'ssg.com': {
    waitTime: 3000,
    scrollCount: 3
  },
  // ...
}
```

---

## 사용 예시

### cURL

```bash
curl -X POST http://localhost:3000/api/services/category-parse \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.gmarket.co.kr/search/Search?keyword=니트",
    "selectors": {
      "productContainer": ".box__item-container",
      "name": ".text__item-title",
      "price": ".box__price-seller"
    },
    "options": {
      "maxProducts": 30,
      "botBypass": {
        "stealth": true,
        "useRandomUserAgent": true
      }
    }
  }'
```

### JavaScript

```javascript
const response = await fetch('/api/services/category-parse', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://www.gmarket.co.kr/search/Search?keyword=니트',
    selectors: {
      productContainer: '.box__item-container',
      name: '.text__item-title',
      price: '.box__price-seller'
    },
    options: {
      maxProducts: 30,
      botBypass: { stealth: true }
    }
  })
});

const data = await response.json();
console.log(`${data.productCount}개 상품 추출됨`);
```

---

## 가격 추출 패턴

### G마켓 특수 처리

G마켓은 "판매가" 패턴으로 가격을 표시하므로 별도 처리가 필요합니다:

```typescript
// "판매가 30,820원" 패턴 매칭
const priceMatch = priceText.match(/판매가\s*(\d{1,3}(,\d{3})*)\s*원/);
if (priceMatch) {
  price = parseInt(priceMatch[1].replace(/,/g, ''));
}
```

### 무신사 data 속성

무신사는 `data-price` 속성으로 가격 정보를 제공합니다:

```typescript
const dataPrice = $(el).attr('data-price');
if (dataPrice && dataPrice !== '0') {
  price = parseInt(dataPrice);
}
```

---

## 에러 처리

### 일반적인 에러

| 에러 코드 | 설명 | 해결 방법 |
|-----------|------|-----------|
| `TIMEOUT` | 페이지 로드 시간 초과 | waitTime 증가 |
| `NO_PRODUCTS` | 상품을 찾을 수 없음 | 셀렉터 확인 |
| `ACCESS_DENIED` | 봇 감지로 차단됨 | 다른 IP 또는 프록시 사용 |
| `CAPTCHA` | CAPTCHA 요구 | 수동 인증 필요 |

### 응답 예시 (에러)

```json
{
  "success": false,
  "error": "ACCESS_DENIED",
  "message": "사이트에서 접근을 차단했습니다",
  "url": "https://www.coupang.com/..."
}
```

---

## 제한사항

1. **봇 감지**: 일부 사이트(쿠팡, 옥션)는 강력한 봇 감지로 우회 불가
2. **React SPA**: W컨셉, 하이버 등은 별도의 API 엔드포인트 파싱 필요
3. **요청 제한**: 과도한 요청 시 IP 차단 가능
4. **동적 콘텐츠**: 무한 스크롤 페이지는 scrollCount 조정 필요

## 관련 API

- [MCP parse_webpage_headless](./MCP_GUIDE.md#parse_webpage_headless) - MCP 프로토콜을 통한 헤드리스 파싱
- [MCP parse_webpage](./MCP_GUIDE.md#parse_webpage) - 간단한 Cheerio 기반 파싱
