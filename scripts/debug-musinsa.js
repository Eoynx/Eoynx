const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  console.log('무신사 페이지 로딩 중...');
  await page.goto('https://www.musinsa.com/category/001006', { waitUntil: 'networkidle2', timeout: 30000 });
  
  // 대기
  console.log('대기 중...');
  await new Promise(r => setTimeout(r, 5000));
  
  // 스크롤
  console.log('스크롤 중...');
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, 500));
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // 추가 대기
  await new Promise(r => setTimeout(r, 3000));
  
  // HTML 저장
  const html = await page.content();
  fs.writeFileSync('test-results/musinsa-debug.html', html, 'utf8');
  console.log('HTML 저장: test-results/musinsa-debug.html');
  
  // 간단 분석
  const analysis = await page.evaluate(() => {
    const productLinks = document.querySelectorAll('a[href*="/products/"]');
    const goodsRows = document.querySelectorAll('[class*="GoodsList"]');
    const allDivs = document.querySelectorAll('div');
    
    // 상품 관련 클래스 찾기
    const productClasses = new Set();
    allDivs.forEach(div => {
      if (div.className && (div.className.includes('product') || div.className.includes('goods') || div.className.includes('item'))) {
        productClasses.add(div.className.split(' ')[0]);
      }
    });
    
    return {
      productLinkCount: productLinks.length,
      goodsRowCount: goodsRows.length,
      sampleClasses: Array.from(productClasses).slice(0, 10)
    };
  });
  
  console.log('\n=== 분석 결과 ===');
  console.log('상품 링크 수:', analysis.productLinkCount);
  console.log('GoodsList 요소:', analysis.goodsRowCount);
  console.log('상품 관련 클래스:', analysis.sampleClasses.join(', '));
  
  await browser.close();
})();
