/**
 * MCP (Model Context Protocol) 도구 호출 테스트
 * 
 * 실행: node scripts/test-mcp.js
 */

const BASE_URL = 'http://localhost:3000';
const MCP_ENDPOINT = `${BASE_URL}/api/agent/mcp`;

// JSON-RPC 2.0 요청 헬퍼
async function jsonRpc(method, params = {}, id = 1) {
  const response = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Agent-Id': 'test-agent-mcp',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params,
    }),
  });
  return response.json();
}

async function testMCP() {
  console.log('🔧 MCP (Model Context Protocol) 도구 호출 테스트\n');
  console.log('='.repeat(60));

  // 1. MCP 서버 정보 (GET)
  console.log('\n📍 1. MCP 서버 정보 조회 (GET)');
  try {
    const serverInfo = await fetch(MCP_ENDPOINT).then(r => r.json());
    console.log('✅ 서버 이름:', serverInfo.name);
    console.log('   프로토콜 버전:', serverInfo.protocolVersion);
    console.log('   도구:', serverInfo.capabilities?.tools?.join(', '));
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  // 2. MCP 초기화
  console.log('\n📍 2. MCP 초기화 (initialize)');
  try {
    const initResult = await jsonRpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0',
      },
    });
    console.log('✅ 프로토콜 버전:', initResult.result?.protocolVersion);
    console.log('   서버 정보:', initResult.result?.serverInfo?.name);
    console.log('   기능:', Object.keys(initResult.result?.capabilities || {}));
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  // 3. 도구 목록 조회
  console.log('\n📍 3. 사용 가능한 도구 목록 (tools/list)');
  try {
    const toolsResult = await jsonRpc('tools/list');
    const tools = toolsResult.result?.tools || [];
    console.log(`✅ 총 ${tools.length}개 도구 사용 가능:`);
    tools.forEach((tool, i) => {
      console.log(`   ${i + 1}. ${tool.name}`);
      console.log(`      설명: ${tool.description?.substring(0, 50)}...`);
      console.log(`      필수 파라미터: ${tool.inputSchema?.required?.join(', ') || '없음'}`);
    });
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  // 4. 상품 검색 도구 호출
  console.log('\n📍 4. 상품 검색 (tools/call: search_products)');
  try {
    const searchResult = await jsonRpc('tools/call', {
      name: 'search_products',
      arguments: { query: '노트북', limit: 3 },
    });
    const content = searchResult.result?.content?.[0]?.text;
    if (content) {
      const data = JSON.parse(content);
      console.log(`✅ 검색 결과: ${data.results?.length || 0}개`);
      data.results?.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} - ${p.price?.toLocaleString()}원 (재고: ${p.stock})`);
      });
    }
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  // 5. 상품 상세 조회
  console.log('\n📍 5. 상품 상세 조회 (tools/call: get_product_details)');
  try {
    const detailResult = await jsonRpc('tools/call', {
      name: 'get_product_details',
      arguments: { productId: 'prod-001' },
    });
    const content = detailResult.result?.content?.[0]?.text;
    if (content) {
      const product = JSON.parse(content);
      console.log('✅ 상품 정보:');
      console.log(`   ID: ${product.id}`);
      console.log(`   이름: ${product.name}`);
      console.log(`   가격: ${product.price?.toLocaleString()}원`);
      console.log(`   재고: ${product.stock}개 (${product.availability})`);
    }
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  // 6. 장바구니 추가
  console.log('\n📍 6. 장바구니 추가 (tools/call: add_to_cart)');
  try {
    const cartResult = await jsonRpc('tools/call', {
      name: 'add_to_cart',
      arguments: { productId: 'prod-002', quantity: 2 },
    });
    const content = cartResult.result?.content?.[0]?.text;
    if (content) {
      const result = JSON.parse(content);
      console.log('✅', result.message);
      console.log(`   장바구니 항목 수: ${result.cartItemCount}`);
    }
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  // 7. 장바구니 조회
  console.log('\n📍 7. 장바구니 조회 (tools/call: view_cart)');
  try {
    const viewCartResult = await jsonRpc('tools/call', {
      name: 'view_cart',
      arguments: {},
    });
    const content = viewCartResult.result?.content?.[0]?.text;
    if (content) {
      const cart = JSON.parse(content);
      console.log(`✅ 장바구니 (${cart.itemCount}개 항목):`);
      cart.items?.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.name} x${item.quantity} = ${item.subtotal?.toLocaleString()}원`);
      });
      console.log(`   총액: ${cart.total?.toLocaleString()}원`);
    }
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  // 8. 리소스 목록 조회
  console.log('\n📍 8. 리소스 목록 (resources/list)');
  try {
    const resourcesResult = await jsonRpc('resources/list');
    const resources = resourcesResult.result?.resources || [];
    console.log(`✅ 총 ${resources.length}개 리소스:`);
    resources.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.name} (${r.uri})`);
    });
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  // 9. 리소스 읽기
  console.log('\n📍 9. 리소스 읽기 (resources/read: 상품 카탈로그)');
  try {
    const readResult = await jsonRpc('resources/read', {
      uri: 'gateway://catalog/products',
    });
    const content = readResult.result?.contents?.[0]?.text;
    if (content) {
      const products = JSON.parse(content);
      console.log(`✅ 카탈로그에 ${products.length}개 상품:`);
      products.slice(0, 3).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} - ${p.category}`);
      });
    }
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  // 10. 프롬프트 목록
  console.log('\n📍 10. 프롬프트 목록 (prompts/list)');
  try {
    const promptsResult = await jsonRpc('prompts/list');
    const prompts = promptsResult.result?.prompts || [];
    console.log(`✅ 총 ${prompts.length}개 프롬프트:`);
    prompts.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name}: ${p.description}`);
    });
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  // 11. 주문 생성 시도 (확인 없이)
  console.log('\n📍 11. 주문 생성 시도 (확인 없음)');
  try {
    const orderResult = await jsonRpc('tools/call', {
      name: 'create_order',
      arguments: { paymentMethod: 'card', confirmed: false },
    });
    const content = orderResult.result?.content?.[0]?.text;
    console.log('⚠️ 응답:', content);
    console.log('   (예상: 사용자 확인 필요 에러)');
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  // 12. 배치 요청 테스트
  console.log('\n📍 12. 배치 요청 테스트 (여러 요청 동시 전송)');
  try {
    const batchResponse = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Id': 'test-agent-mcp',
      },
      body: JSON.stringify([
        { jsonrpc: '2.0', id: 1, method: 'tools/list' },
        { jsonrpc: '2.0', id: 2, method: 'resources/list' },
        { jsonrpc: '2.0', id: 3, method: 'prompts/list' },
      ]),
    });
    const results = await batchResponse.json();
    console.log('✅ 배치 응답 수:', results.length);
    results.forEach((r, i) => {
      const type = r.result?.tools ? 'tools' : r.result?.resources ? 'resources' : 'prompts';
      const count = r.result?.tools?.length || r.result?.resources?.length || r.result?.prompts?.length;
      console.log(`   응답 ${i + 1} (id=${r.id}): ${type} ${count}개`);
    });
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 MCP 테스트 완료!\n');
}

testMCP().catch(console.error);
