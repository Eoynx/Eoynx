# 헤드리스 파싱 테스트 리포트

> Eoynx Agent Gateway - MCP `parse_webpage_headless` 도구 테스트 결과
> 테스트 일시: 2026-02-10

---

## 📋 개요

### 테스트 목적
CSR/SPA 사이트의 JavaScript 렌더링 후 데이터 추출 검증

### 테스트 환경
- **Next.js**: 15.x
- **Puppeteer**: Latest
- **Runtime**: Node.js (Edge 미지원)
- **테스트 서버**: localhost:3002

---

## 🛠 도구 스펙

### `parse_webpage_headless`

```typescript
{
  url: string,           // 필수 - 파싱할 URL
  waitFor?: string,      // CSS 셀렉터 대기
  timeout?: number,      // 타임아웃 ms (기본: 10000)
  proxy?: {              // 프록시 설정
    server: string,
    username?: string,
    password?: string
  },
  cookies?: [{           // 쿠키 설정
    name: string,
    value: string,
    domain?: string
  }],
  headers?: object,      // 추가 HTTP 헤더
  localStorage?: object  // localStorage 데이터
}
```

### 추출 데이터
- 제목 (title)
- 설명 (meta description)
- OG 이미지
- 본문 콘텐츠 (최대 3000자)
- 헤딩 구조 (H1-H3, 최대 30개)
- 이미지 목록 (최대 20개)
- 상품 정보 (class*="product", class*="item")
- 링크 목록 (최대 30개)

---

## 📊 쇼핑몰 파싱 테스트 결과

### 메인 페이지 파싱

| 쇼핑몰 | Cheerio (fetch) | Puppeteer (headless) | 추출 데이터 |
|--------|-----------------|----------------------|-------------|
| **11번가** | ⚠️ 메타데이터만 | ✅ 성공 | 17 헤딩, 20 이미지, 9 상품 |
| **G마켓** | ❌ 403 차단 | ✅ 성공 | 19 헤딩, 20 이미지, 9 상품 |
| **쿠팡** | - | ✅ 성공 | 2 헤딩, 20 이미지, 11 상품 |
| **옥션** | - | ✅ 성공 | 13 헤딩, 20 이미지, 28 링크 |
| **페플 (fairplay142)** | - | ✅ 성공 | 30 헤딩, 20 이미지, 22 링크 |

### 상품 상세 페이지 파싱

| 쇼핑몰 | 결과 | 비고 |
|--------|------|------|
| 쿠팡 상품 | ❌ Access Denied | CAPTCHA 차단 |
| Amazon 상품 | ❌ 봇 차단 | CAPTCHA 페이지 |
| G마켓 상품 | ❌ 타임아웃 | 30초 초과 |
| 11번가 상품 | ❌ 타임아웃 | 20초 초과 |
| 페플 신상품 | ✅ 성공 | 26SS 상품 추출 |

---

## 🔍 상세 테스트 결과

### 1. 11번가 (11st.co.kr)

**URL:** `https://www.11st.co.kr/`

**추출 데이터:**
```json
{
  "name": "11번가",
  "description": "전 국민이 이용하는 대한민국 대표 쇼핑몰...",
  "headings": [
    "11번가",
    "나의 메뉴",
    "주요서비스 바로가기",
    "오늘의 브랜드",
    "타임딜",
    "긴급공수",
    "마트 플러스"
  ],
  "images": [
    "두바이쫀득 초코찹쌀떡",
    "첫 구매 프로모션",
    "LG전자 렌탈",
    "...20개"
  ],
  "products": [
    {"name": "올스탠다드 무형광 화장지", "price": "17,900원"}
  ]
}
```

### 2. G마켓 (gmarket.co.kr)

**URL:** `https://www.gmarket.co.kr/`  
**특이사항:** Cheerio(fetch)로는 403 차단, Puppeteer로 우회 성공

**추출 데이터:**
```json
{
  "name": "G마켓 - 지금부터의 마켓",
  "description": "대한민국 1등 온라인쇼핑, G마켓!",
  "headings": [
    "전체카테고리",
    "지금 제일 잘 나가는 상품",
    "이마트몰",
    "스타배송",
    "당일배송",
    "슈퍼딜",
    "해외직구"
  ],
  "products": [
    {"name": "브랜드패션"},
    {"name": "브랜드 여성의류"},
    {"name": "브랜드 남성의류"}
  ]
}
```

### 3. 쿠팡 (coupang.com)

**URL:** `https://www.coupang.com/`

**추출 데이터:**
```json
{
  "name": "로켓배송으로 빠르게, 로켓와우 멤버십...",
  "description": "쿠팡 로켓배송, 로켓프레시, 로켓직구...",
  "headings": [
    "오늘의 발견",
    "오늘 쿠팡이 엄선한 가장 HOT한 상품!"
  ],
  "products": [
    {"name": "쿠팡플레이", "image": "coupang-play.png"},
    {"name": "로켓배송", "image": "rocket-delivery.png"},
    {"name": "로켓프레시", "image": "rocket-fresh.png"},
    {"name": "2026 설", "image": "LNY_PC.png"},
    {"name": "골드박스", "image": "gold-box.png"}
  ]
}
```

### 4. 페플 (fairplay142.com)

**URL:** `https://www.fairplay142.com/`

**추출 데이터:**
```json
{
  "name": "대한민국 대표 SPA 페플",
  "headings": [
    "최근 검색어",
    "추천검색어",
    "인기검색어",
    "에즈카톤 데님 팬츠",
    "WV 신상 자켓 주목!",
    "빈티지 맛집 제멋",
    "데님 셔츠 하나만으로도"
  ],
  "brands": ["FP", "WV", "JM", "PS", "TWN", "EZ", "PL", "DY", "ST"],
  "popularKeywords": [
    "셔츠", "반팔", "후드집업", "니트", "후드",
    "피그먼트", "2523", "집업", "코트", "2392"
  ]
}
```

---

## 🌏 관광 사이트 파싱 테스트

### 대전으로 (letsgodaejeon.kr)

| 페이지 | URL | 결과 | 추출 데이터 |
|--------|-----|------|-------------|
| 메인 | `/` | ✅ | 8 헤딩, 메타 키워드 9개 |
| 관광지 | `/travel` | ✅ | 관광지 136개 목록, 주소, 이미지 |
| 맛집 | `/food` | ⚠️ | 메타데이터만 (CSR) |

**관광지 페이지 추출 예시 (waitFor="h3" 사용):**
```json
{
  "totalSpots": "136개의 관광지",
  "spots": [
    {"name": "3.8민주의거기념관", "district": "중구", "address": "선화서로 46"},
    {"name": "갈마공원", "district": "서구", "address": "한밭대로 664"},
    {"name": "갑천", "district": "유성구", "address": "구성동"},
    {"name": "국립 대전 현충원", "district": "유성구", "address": "현충원로 251"},
    {"name": "금강로하스대청공원", "district": "대덕구", "address": "미호동"}
  ],
  "images": [
    "https://tong.visitkorea.or.kr/cms/resource/76/3454576_image2_1.jpg",
    "https://tong.visitkorea.or.kr/cms/resource/35/3051735_image2_1.JPG"
  ]
}
```

---

## ⚙️ 고급 기능 테스트

### 프록시 설정

```json
{
  "url": "https://example.com",
  "proxy": {
    "server": "http://proxy.example.com:8080",
    "username": "user",
    "password": "pass"
  }
}
```
**결과:** ✅ 프록시 연결 지원 확인

### 쿠키 설정

```json
{
  "url": "https://httpbin.org/cookies",
  "cookies": [
    {"name": "session_id", "value": "abc123"},
    {"name": "user_token", "value": "xyz789"}
  ]
}
```
**결과:** ✅ 쿠키 설정 작동 확인

### 커스텀 헤더

```json
{
  "url": "https://httpbin.org/headers",
  "headers": {
    "X-Custom-Header": "TestValue123",
    "Authorization": "Bearer test_token"
  }
}
```
**결과:** ✅ 커스텀 헤더 설정 작동 확인

### waitFor 셀렉터

```json
{
  "url": "https://www.letsgodaejeon.kr/travel",
  "waitFor": "h3",
  "timeout": 20000
}
```
**결과:** ✅ 동적 콘텐츠 로딩 대기 후 추출 성공

---

## 📈 성능 지표

| 사이트 | 응답 시간 | 비고 |
|--------|----------|------|
| 11번가 | ~15초 | CSR 렌더링 포함 |
| G마켓 | ~10초 | 봇 차단 우회 |
| 쿠팡 | ~8초 | 메인 페이지만 |
| 페플 | ~8초 | 모든 페이지 |
| 대전으로 | ~6초 | waitFor 포함 |

---

## 🚧 한계점 및 개선 방안

### 현재 한계점

1. **상품 상세 페이지 차단**
   - 쿠팡, Amazon 등 대형 쇼핑몰의 상품 상세 페이지 접근 차단
   - CAPTCHA, IP 차단 등 봇 방어 시스템

2. **타임아웃**
   - 일부 사이트에서 25초 이상 소요
   - 복잡한 JavaScript 렌더링 지연

3. **동적 콘텐츠 제한**
   - 무한 스크롤 콘텐츠 미추출
   - API 호출로 로딩되는 데이터 제한

### 개선 방안

1. **Residential Proxy 연동**
   - 실제 가정용 IP로 차단 우회
   - Bright Data, Oxylabs 등 서비스 연동

2. **Browser Fingerprint 위장**
   - Puppeteer-extra-plugin-stealth 적용
   - Canvas, WebGL fingerprint 무력화

3. **세션 유지**
   - 로그인 세션 쿠키 저장/재사용
   - localStorage 데이터 유지

4. **API 직접 호출**
   - 쇼핑몰 내부 API 분석
   - GraphQL/REST API 직접 호출

---

## 📝 결론

### 성공적인 사용 사례
- ✅ 쇼핑몰 메인 페이지 상품 목록
- ✅ 관광 사이트 명소 목록
- ✅ 일반 웹사이트 콘텐츠 추출
- ✅ CSR/SPA 사이트 렌더링

### 추가 필요 기능
- ⚠️ 상품 상세 페이지 접근 (Proxy 필요)
- ⚠️ 로그인 필요 페이지 (세션 관리 필요)
- ⚠️ 무한 스크롤 콘텐츠 (스크롤 자동화 필요)

---

## 📞 관련 문서

- [Case Study: 대전으로](./CASE_STUDY_DAEJEON.md)
- [AI Agent 테스트 시나리오](./AI_AGENT_TEST_SCENARIOS.md)
- [MCP Guide](./MCP_GUIDE.md)

---

*본 리포트는 실제 테스트 결과를 기반으로 작성되었습니다.*
*테스트 일시: 2026-02-10*
