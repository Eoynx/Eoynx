# Smithery.ai MCP 등록 가이드

## 🎯 Smithery.ai란?

[Smithery.ai](https://smithery.ai)는 MCP(Model Context Protocol) 서버를 위한 마켓플레이스입니다. Claude, GPT 등 AI 에이전트가 사용할 수 있는 도구를 발견하고 설치할 수 있습니다.

## 📋 등록 전 필수 요건

### 1. MCP 엔드포인트 확인

Eoynx의 MCP 엔드포인트가 공개적으로 접근 가능한지 확인:

```bash
# 서버 정보 확인
curl https://your-domain.com/api/agent/mcp \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"mcp/serverInfo","id":1}'
```

예상 응답:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "name": "eoynx-mcp",
    "version": "1.0.0",
    "capabilities": {
      "tools": true,
      "resources": true,
      "prompts": true
    }
  },
  "id": 1
}
```

### 2. smithery.json 파일

프로젝트 루트에 이미 생성된 `smithery.json`:

```json
{
  "name": "eoynx-agent-gateway",
  "displayName": "Eoynx Agent Gateway",
  "description": "E-commerce 데이터 파싱 및 통합 API",
  "version": "1.0.0",
  "author": "Eoynx Team",
  "homepage": "https://eoynx.com",
  "repository": "https://github.com/eoynx/agent-gateway",
  "license": "MIT",
  
  "mcp": {
    "endpoint": "https://eoynx.com/api/agent/mcp",
    "transport": "http",
    "authentication": {
      "type": "bearer",
      "header": "Authorization"
    }
  },
  ...
}
```

## 🚀 등록 단계

### Step 1: Smithery.ai 가입

1. [smithery.ai](https://smithery.ai) 방문
2. GitHub 계정으로 로그인
3. 대시보드 접근

### Step 2: 새 MCP 서버 등록

1. 대시보드에서 **"Publish Server"** 클릭
2. GitHub 저장소 선택 또는 URL 입력
3. `smithery.json` 파일 자동 감지

### Step 3: 메타데이터 확인

Smithery가 `smithery.json`에서 다음 정보를 읽어옵니다:

| 필드 | 값 | 용도 |
|------|-----|------|
| `displayName` | Eoynx Agent Gateway | 마켓플레이스 표시명 |
| `description` | E-commerce 데이터 파싱... | 검색 및 설명 |
| `mcp.endpoint` | https://eoynx.com/api/agent/mcp | 실제 서버 주소 |
| `mcp.tools` | 6개 도구 | AI가 사용 가능한 기능 |
| `mcp.resources` | 3개 리소스 | 데이터 접근 기능 |

### Step 4: 검증 테스트

Smithery가 자동으로 다음을 검증합니다:

- ✅ MCP 엔드포인트 응답 확인
- ✅ `mcp/serverInfo` 호출 성공
- ✅ `mcp/listTools` 호출 성공
- ✅ `mcp/listResources` 호출 성공

### Step 5: 게시

검증 통과 후:
1. **"Publish"** 버튼 클릭
2. 공개 범위 선택 (Public/Private)
3. 태그 및 카테고리 추가

## 🔧 smithery.json 상세 설정

### 인증 설정

```json
{
  "mcp": {
    "authentication": {
      "type": "bearer",
      "header": "Authorization",
      "instructions": "https://eoynx.com/dashboard/api-keys 에서 API 키 발급"
    }
  }
}
```

### 도구 정의

```json
{
  "mcp": {
    "tools": [
      {
        "name": "parse_url",
        "description": "URL에서 상품/콘텐츠 데이터 추출",
        "inputSchema": {
          "type": "object",
          "properties": {
            "url": { "type": "string", "description": "파싱할 URL" },
            "format": { "type": "string", "enum": ["json", "markdown"] }
          },
          "required": ["url"]
        }
      }
    ]
  }
}
```

### 리소스 정의

```json
{
  "mcp": {
    "resources": [
      {
        "uri": "eoynx://services",
        "name": "등록된 서비스 목록",
        "mimeType": "application/json"
      }
    ]
  }
}
```

## 🔍 등록 후 확인

### 마켓플레이스 URL
```
https://smithery.ai/servers/eoynx-agent-gateway
```

### Claude Desktop 연동

사용자가 Smithery에서 설치 시 자동으로 Claude Desktop 설정에 추가:

`~/.claude/mcp_servers.json`:
```json
{
  "mcpServers": {
    "eoynx-agent-gateway": {
      "url": "https://eoynx.com/api/agent/mcp",
      "transport": "http",
      "headers": {
        "Authorization": "Bearer <user-api-key>"
      }
    }
  }
}
```

## 📊 분석 및 모니터링

Smithery 대시보드에서 확인 가능:

- 📈 일일/주간/월간 설치 수
- 🔍 검색 노출 수
- ⭐ 사용자 리뷰 및 평점
- 🐛 에러 리포트

## ✅ 최종 체크리스트

- [ ] MCP 엔드포인트 공개 접근 가능
- [ ] HTTPS 적용됨
- [ ] `smithery.json` 프로젝트 루트에 존재
- [ ] GitHub 저장소와 연동
- [ ] 인증 설명문 작성
- [ ] 스크린샷/데모 영상 준비 (선택)
- [ ] Smithery.ai 계정 생성
- [ ] 검증 테스트 통과
- [ ] 게시 완료

## 🎉 등록 완료 후

1. **Badge 추가** - README에 Smithery 배지 추가:
   ```markdown
   [![Smithery](https://img.shields.io/badge/MCP-Smithery-blue)](https://smithery.ai/servers/eoynx-agent-gateway)
   ```

2. **Changelog** - 버전 업데이트 시 Smithery에도 반영

3. **지원** - GitHub Issues로 사용자 문의 관리
