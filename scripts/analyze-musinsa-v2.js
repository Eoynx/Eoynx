const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  await page.goto('https://www.musinsa.com/category/001006', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000));
  
  // 스크롤
  await page.evaluate(() => window.scrollBy(0, 1000));
  await new Promise(r => setTimeout(r, 2000));
  
  // 상품 항목 구조 분석
  const analysis = await page.evaluate(() => {
    // 상품 링크 찾기
    const productLinks = Array.from(document.querySelectorAll('a[href*="/products/"]')).slice(0, 5);
    
    const results = productLinks.map((link, i) => {
      // 부모 요소들을 탐색
      let parent = link.parentElement;
      const parents = [];
      
      for (let j = 0; j < 5 && parent; j++) {
        parents.push({
          level: j,
          tag: parent.tagName,
          class: parent.className,
          childCount: parent.children.length,
          hasPrice: /\d{1,3}(,\d{3})*원|\d{4,}/.test(parent.textContent || ''),
          textPreview: parent.textContent?.substring(0, 100)
        });
        parent = parent.parentElement;
      }
      
      return {
        href: link.getAttribute('href'),
        linkText: link.textContent?.substring(0, 50),
        parents
      };
    });
    
    // 전체 상품 관련 컨테이너 찾기
    const possibleContainers = [
      '[class*="sc-u940qw"]',
      '[class*="gtm-"]',
      '[data-gtm-cd4]',
      '[class*="product"]',
      '[class*="item"]',
      'article',
      '[class*="goods"]'
    ];
    
    const containers = {};
    possibleContainers.forEach(sel => {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) {
        containers[sel] = {
          count: els.length,
          sample: els[0]?.className || els[0]?.outerHTML?.substring(0, 100)
        };
      }
    });
    
    return { productLinks: results, containers };
  });
  
  console.log('무신사 DOM 분석 결과:\n');
  console.log('=== 상품 링크 구조 ===');
  analysis.productLinks.forEach((item, i) => {
    console.log(`\n[${i+1}] ${item.href?.substring(0, 40)}`);
    console.log(`   링크 텍스트: "${item.linkText}"`);
    item.parents.forEach(p => {
      if (p.hasPrice) {
        console.log(`   Level ${p.level}: [${p.tag}] class="${p.class?.substring(0, 60)}" (가격있음)`);
      }
    });
  });
  
  console.log('\n=== 가능한 컨테이너 ===');
  Object.entries(analysis.containers).forEach(([sel, info]) => {
    console.log(`${sel}: ${info.count}개 - ${info.sample?.substring(0, 80)}`);
  });
  
  await browser.close();
})();
