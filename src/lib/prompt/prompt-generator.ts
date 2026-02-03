/**
 * Dynamic Prompt Generator
 * 사이트 구조를 분석해 AI 에이전트에게 최적의 System Prompt를 생성
 */

import type { 
  AgentGatewayResponse, 
  AgentAction, 
  SiteContext,
  ContextBriefing 
} from '@/types';

interface PromptGeneratorOptions {
  maxLength?: number;
  includeExamples?: boolean;
  language?: 'ko' | 'en';
  verbosity?: 'minimal' | 'standard' | 'detailed';
}

const DEFAULT_OPTIONS: PromptGeneratorOptions = {
  maxLength: 2000,
  includeExamples: true,
  language: 'ko',
  verbosity: 'standard',
};

/**
 * 사이트 컨텍스트 기반 System Prompt 생성
 */
export function generateSystemPrompt(
  siteContext: SiteContext,
  availableActions: AgentAction[],
  briefing?: ContextBriefing,
  options: PromptGeneratorOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const parts: string[] = [];

  // 1. 사이트 소개
  parts.push(generateSiteIntro(siteContext, opts));

  // 2. 현재 컨텍스트 (실시간 정보)
  if (briefing) {
    parts.push(generateContextSection(briefing, opts));
  }

  // 3. 사용 가능한 액션
  parts.push(generateActionsSection(availableActions, opts));

  // 4. 사용 가이드라인
  parts.push(generateGuidelines(opts));

  const fullPrompt = parts.join('\n\n');

  // 길이 제한 적용
  if (opts.maxLength && fullPrompt.length > opts.maxLength) {
    return truncatePrompt(fullPrompt, opts.maxLength);
  }

  return fullPrompt;
}

/**
 * 사이트 소개 섹션 생성
 */
function generateSiteIntro(
  context: SiteContext,
  options: PromptGeneratorOptions
): string {
  const isKorean = options.language === 'ko';

  if (options.verbosity === 'minimal') {
    return isKorean
      ? `[${context.name}] ${context.description}`
      : `[${context.name}] ${context.description}`;
  }

  const lines = [
    isKorean ? `## 사이트 정보` : `## Site Information`,
    '',
    isKorean
      ? `당신은 "${context.name}" 웹사이트의 AI 에이전트 게이트웨이에 접속했습니다.`
      : `You are connected to the AI agent gateway of "${context.name}".`,
    '',
    `- **URL**: ${context.url}`,
    isKorean 
      ? `- **설명**: ${context.description}`
      : `- **Description**: ${context.description}`,
    isKorean
      ? `- **주요 언어**: ${context.primaryLanguage}`
      : `- **Primary Language**: ${context.primaryLanguage}`,
  ];

  if (context.categories?.length) {
    lines.push(
      isKorean
        ? `- **카테고리**: ${context.categories.join(', ')}`
        : `- **Categories**: ${context.categories.join(', ')}`
    );
  }

  if (context.features?.length) {
    lines.push(
      isKorean
        ? `- **주요 기능**: ${context.features.join(', ')}`
        : `- **Features**: ${context.features.join(', ')}`
    );
  }

  return lines.join('\n');
}

/**
 * 실시간 컨텍스트 섹션 생성
 */
function generateContextSection(
  briefing: ContextBriefing,
  options: PromptGeneratorOptions
): string {
  const isKorean = options.language === 'ko';
  const lines = [
    isKorean ? `## 현재 상황` : `## Current Context`,
    '',
    briefing.summary,
    '',
  ];

  // 하이라이트
  if (briefing.highlights.length > 0) {
    lines.push(isKorean ? `### 주요 정보` : `### Highlights`);
    briefing.highlights.forEach(h => lines.push(`- ${h}`));
    lines.push('');
  }

  // 알림
  if (briefing.alerts?.length) {
    lines.push(isKorean ? `### ⚠️ 알림` : `### ⚠️ Alerts`);
    briefing.alerts.forEach(alert => {
      const icon = alert.type === 'error' ? '🔴' : alert.type === 'warning' ? '🟡' : '🔵';
      lines.push(`${icon} ${alert.message}`);
    });
    lines.push('');
  }

  // 트렌딩
  if (briefing.trending?.length && options.verbosity !== 'minimal') {
    lines.push(isKorean ? `### 🔥 인기 항목` : `### 🔥 Trending`);
    briefing.trending.slice(0, 5).forEach(item => {
      lines.push(`${item.rank}. ${item.name} (${item.type})`);
    });
  }

  return lines.join('\n');
}

/**
 * 사용 가능한 액션 섹션 생성
 */
function generateActionsSection(
  actions: AgentAction[],
  options: PromptGeneratorOptions
): string {
  const isKorean = options.language === 'ko';
  const lines = [
    isKorean ? `## 사용 가능한 액션` : `## Available Actions`,
    '',
  ];

  if (actions.length === 0) {
    lines.push(
      isKorean 
        ? `현재 사용 가능한 액션이 없습니다.`
        : `No actions are currently available.`
    );
    return lines.join('\n');
  }

  // 권한별로 그룹화
  const grouped = actions.reduce((acc, action) => {
    const perm = action.requiredPermission;
    if (!acc[perm]) acc[perm] = [];
    acc[perm].push(action);
    return acc;
  }, {} as Record<string, AgentAction[]>);

  for (const [permission, permActions] of Object.entries(grouped)) {
    lines.push(`### ${getPermissionLabel(permission, isKorean)}`);
    lines.push('');

    for (const action of permActions) {
      if (options.verbosity === 'minimal') {
        lines.push(`- **${action.name}**: \`${action.method} ${action.endpoint}\``);
      } else {
        lines.push(`#### ${action.name}`);
        lines.push(`- ${action.description}`);
        lines.push(`- Endpoint: \`${action.method} ${action.endpoint}\``);
        
        if (action.parameters?.length && options.verbosity === 'detailed') {
          lines.push(isKorean ? `- 파라미터:` : `- Parameters:`);
          action.parameters.forEach(param => {
            const required = param.required 
              ? (isKorean ? '(필수)' : '(required)') 
              : (isKorean ? '(선택)' : '(optional)');
            lines.push(`  - \`${param.name}\` (${param.type}) ${required}: ${param.description || ''}`);
          });
        }
        
        lines.push('');
      }
    }
  }

  // 예시 추가
  if (options.includeExamples && actions.length > 0) {
    lines.push(generateExampleSection(actions[0], isKorean));
  }

  return lines.join('\n');
}

/**
 * 가이드라인 섹션 생성
 */
function generateGuidelines(options: PromptGeneratorOptions): string {
  const isKorean = options.language === 'ko';

  if (options.verbosity === 'minimal') {
    return '';
  }

  const lines = [
    isKorean ? `## 사용 가이드라인` : `## Usage Guidelines`,
    '',
  ];

  if (isKorean) {
    lines.push(
      `1. 모든 요청에는 유효한 인증 토큰이 필요합니다.`,
      `2. Rate limit을 초과하면 429 에러가 반환됩니다.`,
      `3. 실행 액션(execute)은 사용자 확인 후 수행해 주세요.`,
      `4. 에러 발생 시 error.code와 error.message를 확인하세요.`,
    );
  } else {
    lines.push(
      `1. All requests require a valid authentication token.`,
      `2. Exceeding rate limits will return a 429 error.`,
      `3. Execute actions should be confirmed with the user first.`,
      `4. Check error.code and error.message when errors occur.`,
    );
  }

  return lines.join('\n');
}

/**
 * 예시 섹션 생성
 */
function generateExampleSection(action: AgentAction, isKorean: boolean): string {
  const lines = [
    isKorean ? `### 사용 예시` : `### Example Usage`,
    '',
    '```json',
    JSON.stringify({
      method: action.method,
      endpoint: action.endpoint,
      headers: {
        'Authorization': 'Bearer <your-token>',
        'Content-Type': 'application/json',
      },
      body: action.parameters?.reduce((acc, param) => {
        if (param.required) {
          acc[param.name] = param.default ?? `<${param.type}>`;
        }
        return acc;
      }, {} as Record<string, unknown>),
    }, null, 2),
    '```',
  ];

  return lines.join('\n');
}

/**
 * 권한 레이블 변환
 */
function getPermissionLabel(permission: string, isKorean: boolean): string {
  const labels: Record<string, { ko: string; en: string }> = {
    read: { ko: '📖 읽기 전용', en: '📖 Read Only' },
    write: { ko: '✏️ 쓰기 가능', en: '✏️ Write Access' },
    execute: { ko: '⚡ 실행 가능', en: '⚡ Execute Access' },
    admin: { ko: '👑 관리자', en: '👑 Admin Access' },
  };

  return labels[permission]?.[isKorean ? 'ko' : 'en'] ?? permission;
}

/**
 * 프롬프트 길이 제한
 */
function truncatePrompt(prompt: string, maxLength: number): string {
  if (prompt.length <= maxLength) return prompt;

  const truncated = prompt.slice(0, maxLength - 100);
  const lastNewline = truncated.lastIndexOf('\n\n');
  
  return truncated.slice(0, lastNewline) + '\n\n... (truncated for length)';
}

/**
 * Agent Gateway 응답에서 전체 프롬프트 생성
 */
export function generatePromptFromResponse(
  response: AgentGatewayResponse,
  options?: PromptGeneratorOptions
): string {
  return generateSystemPrompt(
    response.siteContext,
    response.availableActions,
    response.contextBriefing,
    options
  );
}
