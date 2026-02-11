/**
 * 서비스 등록 자동화 스크립트
 * 사용법: node scripts/register-services.js
 */

const puppeteer = require('puppeteer');

// 등록할 서비스 목록
const SERVICES = [
  {
    name: 'Musinsa',
    nameKo: '무신사',
    description: 'Korea largest online fashion select shop',
    descriptionKo: '대한민국 대표 패션 편집샵',
    homepage: 'https://www.musinsa.com',
    apiBase: 'https://www.musinsa.com',
    sampleUrl: 'https://www.musinsa.com/category/001006',
  },
  {
    name: 'Gmarket',
    nameKo: 'G마켓',
    description: 'Korea popular online marketplace',
    descriptionKo: '대한민국 대표 온라인 마켓플레이스',
    homepage: 'https://www.gmarket.co.kr',
    apiBase: 'https://www.gmarket.co.kr',
    sampleUrl: 'https://browse.gmarket.co.kr/search?keyword=니트',
  },
  {
    name: 'SSG',
    nameKo: '신세계몰',
    description: 'Shinsegae online shopping mall',
    descriptionKo: '신세계 온라인 쇼핑몰',
    homepage: 'https://www.ssg.com',
    apiBase: 'https://www.ssg.com',
    sampleUrl: 'https://www.ssg.com/search.ssg?target=all&query=니트',
  },
  {
    name: 'WConcept',
    nameKo: 'W컨셉',
    description: 'Premium fashion select shop',
    descriptionKo: '프리미엄 패션 편집샵',
    homepage: 'https://www.wconcept.co.kr',
    apiBase: 'https://www.wconcept.co.kr',
    sampleUrl: 'https://www.wconcept.co.kr/Women/Product?filterID2=3405',
  },
  {
    name: '11Street',
    nameKo: '11번가',
    description: 'Korea major online marketplace',
    descriptionKo: '대한민국 대표 온라인 쇼핑몰',
    homepage: 'https://www.11st.co.kr',
    apiBase: 'https://www.11st.co.kr',
    sampleUrl: 'https://search.11st.co.kr/Search.tmall?kwd=니트',
  },
  {
    name: 'Hiver',
    nameKo: '하이버',
    description: 'Mens fashion select shop',
    descriptionKo: '남성 패션 편집샵',
    homepage: 'https://www.hiver.co.kr',
    apiBase: 'https://www.hiver.co.kr',
    sampleUrl: 'https://www.hiver.co.kr/category/list/10211/',
  },
];

const BASE_URL = 'http://localhost:3000';

async function registerServices() {
  console.log('🚀 서비스 등록 자동화를 시작합니다...\n');

  const browser = await puppeteer.launch({
    headless: false, // 화면 표시 (디버깅용)
    args: ['--no-sandbox', '--window-size=1400,900'],
    defaultViewport: { width: 1400, height: 900 },
  });

  const page = await browser.newPage();

  try {
    // 1. 로그인 페이지 이동
    console.log('📝 로그인 페이지로 이동...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    
    // 로그인이 필요한지 확인 (이미 로그인 상태일 수 있음)
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('\n⚠️  로그인이 필요합니다.');
      console.log('👉 브라우저에서 로그인을 완료하면 자동으로 계속됩니다...\n');
      
      // 로그인 완료 대기 (dashboard나 다른 페이지로 이동할 때까지)
      await page.waitForFunction(
        () => !window.location.href.includes('/login'),
        { timeout: 120000 } // 2분 대기
      );
      console.log('✅ 로그인 완료!\n');
    }

    // 2. 서비스 등록 페이지로 이동
    console.log('📦 서비스 목록 페이지로 이동...');
    await page.goto(`${BASE_URL}/dashboard/services`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // 3. 각 서비스 등록
    for (let i = 0; i < SERVICES.length; i++) {
      const service = SERVICES[i];
      console.log(`\n[${i + 1}/${SERVICES.length}] ${service.nameKo} (${service.name}) 등록 중...`);

      try {
        // 새 서비스 추가 버튼 찾기
        const addBtn = await page.$('button:has-text("새 서비스"), button:has-text("Add"), [data-action="add-service"]');
        if (addBtn) {
          await addBtn.click();
          await new Promise(r => setTimeout(r, 1000));
        }

        // 폼 필드 채우기
        await fillFormField(page, 'name', service.name);
        await fillFormField(page, 'nameKo', service.nameKo);
        await fillFormField(page, 'description', service.description);
        await fillFormField(page, 'descriptionKo', service.descriptionKo);
        await fillFormField(page, 'homepage', service.homepage);
        await fillFormField(page, 'apiBase', service.apiBase);
        
        // sampleUrl 필드가 있으면 채우기
        const sampleUrlInput = await page.$('input[name="sampleUrl"], input[placeholder*="sample"]');
        if (sampleUrlInput) {
          await sampleUrlInput.click({ clickCount: 3 });
          await sampleUrlInput.type(service.sampleUrl);
        }

        // 저장 버튼 클릭
        const saveBtn = await page.$('button[type="submit"], button:has-text("저장"), button:has-text("Save")');
        if (saveBtn) {
          await saveBtn.click();
          await new Promise(r => setTimeout(r, 2000));
        }

        console.log(`   ✅ ${service.nameKo} 등록 완료`);

      } catch (error) {
        console.log(`   ❌ ${service.nameKo} 등록 실패: ${error.message}`);
      }
    }

    console.log('\n🎉 모든 서비스 등록 완료!\n');
    console.log('브라우저는 10초 후 자동으로 닫힙니다...');
    await new Promise(r => setTimeout(r, 10000));

  } catch (error) {
    console.error('오류 발생:', error.message);
  } finally {
    await browser.close();
  }
}

async function fillFormField(page, fieldName, value) {
  const selectors = [
    `input[name="${fieldName}"]`,
    `input[id="${fieldName}"]`,
    `input[placeholder*="${fieldName}"]`,
    `textarea[name="${fieldName}"]`,
  ];

  for (const selector of selectors) {
    const input = await page.$(selector);
    if (input) {
      await input.click({ clickCount: 3 });
      await input.type(value);
      return;
    }
  }
}

// 실행
registerServices().catch(console.error);
