/**
 * 서비스 시드 스크립트 (개발용)
 * Supabase에 직접 서비스를 등록합니다.
 * 
 * 사용법: node scripts/seed-services.js
 */

// dotenv로 .env.local 로드
require('dotenv').config({ path: '.env.local' });

// 등록할 서비스 목록
const SERVICES = [
  {
    name: 'Musinsa',
    name_ko: '무신사',
    description: 'Korea largest online fashion select shop',
    description_ko: '대한민국 대표 패션 편집샵',
    homepage: 'https://www.musinsa.com',
    api_base: 'https://www.musinsa.com',
    category: 'fashion',
    product_page: {
      urlPattern: '/products/{id}',
      sampleUrl: 'https://www.musinsa.com/products/4086629',
      dataSource: 'json-ld',
    },
    category_page: {
      urlPattern: '/category/{id}',
      sampleUrl: 'https://www.musinsa.com/category/001006',
    },
  },
  {
    name: 'Gmarket',
    name_ko: 'G마켓',
    description: 'Korea popular online marketplace',
    description_ko: '대한민국 대표 온라인 마켓플레이스',
    homepage: 'https://www.gmarket.co.kr',
    api_base: 'https://www.gmarket.co.kr',
    category: 'marketplace',
    product_page: {
      urlPattern: '/Item?itemno={id}',
      sampleUrl: 'https://www.gmarket.co.kr/Item?itemno=123456789',
      dataSource: 'dom',
    },
    category_page: {
      urlPattern: '/search?keyword={query}',
      sampleUrl: 'https://browse.gmarket.co.kr/search?keyword=니트',
    },
  },
  {
    name: 'SSG',
    name_ko: '신세계몰',
    description: 'Shinsegae online shopping mall',
    description_ko: '신세계 온라인 쇼핑몰',
    homepage: 'https://www.ssg.com',
    api_base: 'https://www.ssg.com',
    category: 'department',
    product_page: {
      urlPattern: '/item/itemView.ssg?itemId={id}',
      sampleUrl: 'https://www.ssg.com/item/itemView.ssg?itemId=1000012345',
      dataSource: 'dom',
    },
    category_page: {
      urlPattern: '/search.ssg?target=all&query={query}',
      sampleUrl: 'https://www.ssg.com/search.ssg?target=all&query=니트',
    },
  },
  {
    name: 'WConcept',
    name_ko: 'W컨셉',
    description: 'Premium fashion select shop',
    description_ko: '프리미엄 패션 편집샵',
    homepage: 'https://www.wconcept.co.kr',
    api_base: 'https://www.wconcept.co.kr',
    category: 'fashion',
    product_page: {
      urlPattern: '/Product/{id}',
      sampleUrl: 'https://www.wconcept.co.kr/Product/123456',
      dataSource: 'json-ld',
    },
    category_page: {
      urlPattern: '/Women/Product?filterID2={id}',
      sampleUrl: 'https://www.wconcept.co.kr/Women/Product?filterID2=3405',
    },
  },
  {
    name: '11Street',
    name_ko: '11번가',
    description: 'Korea major online marketplace',
    description_ko: '대한민국 대표 온라인 쇼핑몰',
    homepage: 'https://www.11st.co.kr',
    api_base: 'https://www.11st.co.kr',
    category: 'marketplace',
    product_page: {
      urlPattern: '/products/{id}',
      sampleUrl: 'https://www.11st.co.kr/products/123456789',
      dataSource: 'json-ld',
    },
    category_page: {
      urlPattern: '/Search.tmall?kwd={query}',
      sampleUrl: 'https://search.11st.co.kr/Search.tmall?kwd=니트',
    },
  },
  {
    name: 'Hiver',
    name_ko: '하이버',
    description: 'Mens fashion select shop',
    description_ko: '남성 패션 편집샵',
    homepage: 'https://www.hiver.co.kr',
    api_base: 'https://www.hiver.co.kr',
    category: 'fashion',
    product_page: {
      urlPattern: '/goods/{id}',
      sampleUrl: 'https://www.hiver.co.kr/goods/123456',
      dataSource: 'dom',
    },
    category_page: {
      urlPattern: '/category/list/{id}/',
      sampleUrl: 'https://www.hiver.co.kr/category/list/10211/',
    },
  },
];

async function seedServices() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('\n⚠️  Supabase 환경 변수가 설정되지 않았습니다.');
    console.log('\n대신 JSON 파일로 서비스 설정을 저장합니다...');
    
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, '../test-results/services-config.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(SERVICES, null, 2), 'utf8');
    
    console.log(`\n✅ 서비스 설정이 저장되었습니다: ${outputPath}`);
    console.log('\n서비스 목록:');
    SERVICES.forEach((s, i) => {
      console.log(`  ${i+1}. ${s.name_ko} (${s.name}) - ${s.homepage}`);
    });
    return;
  }

  console.log('🚀 서비스 시드를 시작합니다...\n');
  
  for (const service of SERVICES) {
    try {
      const slug = service.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      // AI.txt 생성
      const aiTxt = `# ${service.name} AI Interaction Specification
Name: ${service.name}
Name_KO: ${service.name_ko}
Description: ${service.description}
Description_KO: ${service.description_ko}
Homepage: ${service.homepage}
API_Base: ${service.api_base}

[Product.Page]
URL_Pattern: ${service.product_page?.urlPattern || ''}
Sample_URL: ${service.product_page?.sampleUrl || ''}
Data_Source: ${service.product_page?.dataSource || ''}

[Category.Page]
URL_Pattern: ${service.category_page?.urlPattern || ''}
Sample_URL: ${service.category_page?.sampleUrl || ''}
`;

      // JSON-LD 생성
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": service.name,
        "alternateName": service.name_ko,
        "description": service.description,
        "url": service.homepage,
      };
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          id,
          slug,
          name: service.name,
          name_ko: service.name_ko,
          description: service.description,
          description_ko: service.description_ko,
          homepage: service.homepage,
          api_base: service.api_base,
          endpoints: [],
          auth_type: 'none',
          rate_limit: '100/min',
          contact_email: '',
          ai_txt: aiTxt,
          json_ld: jsonLd,
          created_at: now,
        }),
      });

      if (response.ok || response.status === 201) {
        console.log(`✅ ${service.name_ko} (${service.name}) 등록 완료 - slug: ${slug}`);
      } else {
        const error = await response.text();
        console.log(`❌ ${service.name_ko} 등록 실패: ${error}`);
      }
    } catch (error) {
      console.log(`❌ ${service.name_ko} 등록 오류: ${error.message}`);
    }
  }

  console.log('\n🎉 서비스 시드 완료!');
}

seedServices().catch(console.error);
