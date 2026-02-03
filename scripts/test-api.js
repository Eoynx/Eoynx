/**
 * Agent-Gateway API 테스트 스크립트
 * Node.js로 실행: node scripts/test-api.js
 */

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 Agent-Gateway API 테스트 시작\n');
  console.log('='.repeat(50));

  // 1. 헬스 체크
  console.log('\n📍 1. 헬스 체크 (/api/agent/health)');
  try {
    const healthRes = await fetch(`${BASE_URL}/api/agent/health`);
    const health = await healthRes.json();
    console.log('✅ 상태:', health.status);
    console.log('   버전:', health.version);
    console.log('   서비스:', health.services);
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  // 2. AI 매니페스트
  console.log('\n📍 2. AI 매니페스트 (/api/ai-manifest.json)');
  try {
    const manifestRes = await fetch(`${BASE_URL}/api/ai-manifest.json`);
    const manifest = await manifestRes.json();
    console.log('✅ 이름:', manifest.name);
    console.log('   버전:', manifest.version);
    console.log('   액션 수:', manifest.actions?.length || 0);
    console.log('   엔드포인트 수:', manifest.endpoints?.length || 0);
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  // 3. 메인 게이트웨이
  console.log('\n📍 3. 메인 게이트웨이 (/api/agent)');
  try {
    const gatewayRes = await fetch(`${BASE_URL}/api/agent`, {
      headers: { 'X-Agent-Id': 'test-agent-001' }
    });
    const gateway = await gatewayRes.json();
    console.log('✅ 사이트 이름:', gateway.siteContext?.name);
    console.log('   사용 가능 액션:', gateway.availableActions?.map(a => a.name).join(', '));
    console.log('   컨텍스트 브리핑 길이:', gateway.contextBriefing?.length || 0, '자');
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  // 4. 검색 API
  console.log('\n📍 4. 검색 API (/api/agent/search?q=노트북)');
  try {
    const searchRes = await fetch(`${BASE_URL}/api/agent/search?q=노트북`);
    const search = await searchRes.json();
    console.log('✅ 검색 결과 수:', search.results?.length || 0);
    if (search.results?.length > 0) {
      console.log('   첫 번째 결과:', search.results[0].name);
    }
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  // 5. MCP 서버 정보
  console.log('\n📍 5. MCP 서버 정보 (/api/agent/mcp GET)');
  try {
    const mcpRes = await fetch(`${BASE_URL}/api/agent/mcp`);
    const mcp = await mcpRes.json();
    console.log('✅ 서버 이름:', mcp.name);
    console.log('   프로토콜 버전:', mcp.protocolVersion);
    console.log('   사용 가능 도구:', mcp.capabilities?.tools?.join(', '));
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  // 6. MCP 도구 호출 (tools/list)
  console.log('\n📍 6. MCP tools/list 호출');
  try {
    const mcpToolsRes = await fetch(`${BASE_URL}/api/agent/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      })
    });
    const mcpTools = await mcpToolsRes.json();
    if (mcpTools.result?.tools) {
      console.log('✅ 사용 가능 도구 수:', mcpTools.result.tools.length);
      mcpTools.result.tools.forEach((tool, i) => {
        console.log(`   ${i + 1}. ${tool.name}: ${tool.description?.substring(0, 40)}...`);
      });
    }
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  // 7. MCP 도구 실행 (search_products)
  console.log('\n📍 7. MCP tools/call - search_products');
  try {
    const searchToolRes = await fetch(`${BASE_URL}/api/agent/mcp`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Agent-Id': 'test-agent-001'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'search_products',
          arguments: { query: '헤드폰', limit: 3 }
        }
      })
    });
    const searchTool = await searchToolRes.json();
    if (searchTool.result?.content?.[0]?.text) {
      const data = JSON.parse(searchTool.result.content[0].text);
      console.log('✅ 검색 결과 수:', data.results?.length || 0);
      data.results?.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} - ${p.price?.toLocaleString()}원`);
      });
    }
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  // 8. 샌드박스 시뮬레이션
  console.log('\n📍 8. 샌드박스 시뮬레이션 (/api/agent/sandbox)');
  try {
    const sandboxRes = await fetch(`${BASE_URL}/api/agent/sandbox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'purchase',
        params: { productId: 'prod-001', quantity: 1 }
      })
    });
    const sandbox = await sandboxRes.json();
    console.log('✅ 시뮬레이션 성공:', sandbox.simulation?.willSucceed);
    console.log('   예상 비용:', sandbox.simulation?.estimatedCost?.toLocaleString(), '원');
    console.log('   부작용:', sandbox.simulation?.sideEffects?.join(', '));
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  // 9. 평판 조회
  console.log('\n📍 9. 평판 조회 (/api/agent/reputation)');
  try {
    const repRes = await fetch(`${BASE_URL}/api/agent/reputation?agentId=test-agent-001`);
    const rep = await repRes.json();
    console.log('✅ 에이전트:', rep.agentId);
    console.log('   평판 점수:', rep.score);
    console.log('   레벨:', rep.level);
    console.log('   권한:', rep.permissions?.join(', '));
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  // 10. OpenAPI 스펙
  console.log('\n📍 10. OpenAPI 스펙 (/api/openapi)');
  try {
    const openapiRes = await fetch(`${BASE_URL}/api/openapi`);
    const openapi = await openapiRes.json();
    console.log('✅ OpenAPI 버전:', openapi.openapi);
    console.log('   API 제목:', openapi.info?.title);
    console.log('   엔드포인트 수:', Object.keys(openapi.paths || {}).length);
    console.log('   태그:', openapi.tags?.map(t => t.name).join(', '));
  } catch (e) {
    console.log('❌ 에러:', e.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 테스트 완료!\n');
}

testAPI().catch(console.error);
