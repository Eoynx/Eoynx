# 🎨 Eoynx 브랜드 에셋 생성 가이드

이 문서는 Eoynx 프로젝트에 필요한 로고, 파비콘, OG 이미지를 생성하는 방법을 안내합니다.

## 📋 필요한 이미지 목록

| 파일명 | 크기 | 용도 |
|--------|------|------|
| `favicon.ico` | 16x16, 32x32 | 브라우저 탭 아이콘 |
| `favicon-16x16.png` | 16x16 | 소형 파비콘 |
| `favicon-32x32.png` | 32x32 | 표준 파비콘 |
| `apple-touch-icon.png` | 180x180 | iOS 홈 화면 아이콘 |
| `icon-192.png` | 192x192 | PWA 아이콘 |
| `icon-512.png` | 512x512 | PWA 스플래시 |
| `og-image.png` | 1200x630 | 소셜 미디어 공유 |

## 🎨 브랜드 컬러

```
Dawn (새벽 오렌지)
- Primary: #f97316 (dawn-500)
- Light: #fb923c (dawn-400)
- Dark: #ea580c (dawn-600)

Onyx (다크 그레이)
- Primary: #0f172a (onyx-900)
- Light: #1e293b (onyx-800)
- Dark: #020617 (onyx-950)
```

## 🛠️ 생성 방법

### 방법 1: Figma/Canva 사용 (권장)

1. **Figma** 또는 **Canva**에서 새 프로젝트 생성
2. 아래 디자인 가이드 참고하여 로고 제작
3. 각 크기별로 내보내기

#### 로고 디자인 컨셉
```
🌅 Eoynx

- 일출(새벽) 아이콘 + 타이포그래피
- 그라데이션: onyx → dawn (아래에서 위로)
- 심볼: 지평선 위로 떠오르는 태양
```

### 방법 2: AI 이미지 생성 (DALL-E, Midjourney)

**프롬프트 예시:**
```
Logo design for "Eoynx" - a tech startup.
Minimalist sunrise over horizon, dark background (#0f172a) 
transitioning to orange gradient (#f97316).
Modern, clean, vector style. No text, icon only.
```

### 방법 3: SVG 수동 제작

```svg
<!-- 간단한 로고 예시 -->
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sunrise" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="50%" style="stop-color:#334155"/>
      <stop offset="100%" style="stop-color:#f97316"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" fill="url(#sunrise)"/>
  <circle cx="50" cy="60" r="20" fill="#f97316" opacity="0.9"/>
  <line x1="10" y1="70" x2="90" y2="70" stroke="#f97316" stroke-width="2"/>
</svg>
```

### 방법 4: 온라인 도구

- **favicon.io**: https://favicon.io/favicon-generator/
- **realfavicongenerator.net**: https://realfavicongenerator.net/
- **og-image.vercel.app**: Vercel OG Image 생성기

## 📁 파일 위치

모든 이미지는 `/public` 폴더에 저장:

```
public/
├── favicon.ico
├── favicon-16x16.png
├── favicon-32x32.png
├── apple-touch-icon.png
├── icon-192.png
├── icon-512.png
├── og-image.png
└── site.webmanifest (이미 생성됨)
```

## 🔧 임시 텍스트 파비콘 (SVG)

이미지 생성 전 임시로 사용할 수 있는 텍스트 기반 파비콘:

```bash
# public/favicon.svg 생성
```

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#0f172a"/>
  <text x="50" y="65" font-size="50" text-anchor="middle" fill="#f97316">🌅</text>
</svg>
```

## ✅ 적용 확인

이미지 생성 후:

1. 파일을 `/public` 폴더에 복사
2. `npm run dev`로 개발 서버 실행
3. 브라우저 탭에서 파비콘 확인
4. https://cards-dev.twitter.com/validator 에서 OG 이미지 확인

## 📱 PWA 테스트

```bash
# Lighthouse로 PWA 테스트
npm run build
npm run start
# Chrome DevTools > Lighthouse > Generate Report
```

---

## 빠른 시작: 이모지 파비콘

가장 빠른 방법으로, 이모지를 파비콘으로 사용:

1. https://favicon.io/emoji-favicons/ 접속
2. "🌅" (sunrise) 이모지 선택
3. 다운로드 후 `/public`에 복사

---

**참고**: 정식 출시 전에는 전문 디자이너와 협업하여 고품질 브랜드 에셋을 제작하는 것을 권장합니다.
