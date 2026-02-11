const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  await page.goto('https://browse.gmarket.co.kr/search?keyword=니트', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  
  // 상품 항목 구조 분석
  const analysis = await page.evaluate(() => {
    // 전체 페이지에서 가격 패턴 찾기
    const allPrices = Array.from(document.querySelectorAll('[class*="price"]')).slice(0, 15).map(el => ({
      class: el.className,
      text: el.textContent?.trim().substring(0, 100),
      tag: el.tagName
    }));
    
    // 상품 링크 주변 요소 분석
    const productLinks = Array.from(document.querySelectorAll('a[href*="item.gmarket"], a[href*="Item?"]')).slice(0, 3);
    const linkAnalysis = productLinks.map(link => {
      const parent = link.closest('[class*="item"], [class*="box"], [class*="product"]') || link.parentElement?.parentElement;
      if (!parent) return null;
      
      const pricesInParent = Array.from(parent.querySelectorAll('[class*="price"], strong, em, span')).filter(el => 
        /\d{1,3}(,\d{3})*/.test(el.textContent || '')
      ).map(el => ({
        class: el.className,
        text: el.textContent?.trim().substring(0, 50),
        tag: el.tagName
      }));
      
      return {
        linkText: link.textContent?.trim().substring(0, 30),
        parentClass: parent.className,
        prices: pricesInParent.slice(0, 5)
      };
    });
    
    return { priceSamples: allPrices, linkAnalysis };
  });
  
  console.log('G마켓 DOM 분석 결과:\n');
  console.log('=== 가격 요소 샘플 ===');
  analysis.priceSamples.forEach((p, i) => {
    console.log(`${i+1}. [${p.tag}] class="${p.class}" text="${p.text}"`);
  });
  
  console.log('\n=== 상품 링크 주변 분석 ===');
  analysis.linkAnalysis.filter(Boolean).forEach((item, i) => {
    console.log(`${i+1}. Parent: "${item.parentClass}"`);
    console.log(`   Link: "${item.linkText}"`);
    item.prices.forEach(p => console.log(`   Price: [${p.tag}] ${p.class} = "${p.text}"`));
  });
  
  await browser.close();
})();
