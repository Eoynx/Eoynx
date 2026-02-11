const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  await page.goto('https://www.musinsa.com/search/goods?keyword=남자옷', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  
  const html = await page.content();
  const $ = cheerio.load(html);
  
  console.log('Analyzing product card structure...\n');
  
  // gtm-select-item의 부모 요소 분석
  const productLinks = $('a[href*="/products/"]');
  console.log('Total product links:', productLinks.length);
  
  productLinks.each((i, el) => {
    if (i < 2) {
      // 부모를 따라 올라가면서 가격 패턴 찾기
      let current = $(el);
      for (let level = 0; level < 5; level++) {
        const parent = current.parent();
        const parentText = parent.text().replace(/\s+/g, ' ').trim();
        const hasPrice = /\d{1,3}(,\d{3})*\s*원/.test(parentText);
        
        if (hasPrice && level > 0) {
          console.log('\nProduct ' + (i+1) + ' - Found price at level ' + level);
          console.log('  Parent tag:', parent.prop('tagName'));
          console.log('  Parent classes:', parent.attr('class')?.substring(0, 60));
          
          // 가격 추출
          const priceMatch = parentText.match(/(\d{1,3}(,\d{3})*)\s*원/);
          const discountMatch = parentText.match(/(\d{1,2})%/);
          console.log('  Price:', priceMatch ? priceMatch[1] + '원' : 'N/A');
          console.log('  Discount:', discountMatch ? discountMatch[1] + '%' : 'N/A');
          break;
        }
        current = parent;
      }
    }
  });
  
  await browser.close();
})();
