/**
 * AI Agent Reputation System
 * 에이전트 신뢰도 점수 관리
 * 
 * 기능:
 * - 에이전트별 평판 점수 추적
 * - 행동 기반 점수 조정
 * - 권한 레벨 자동 결정
 * - 악성 에이전트 차단
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, AgentProvider, AgentPermissionLevel } from '@/types';

export const runtime = 'edge';

interface AgentReputation {
  agentId: string;
  provider: AgentProvider;
  score: number;           // 0-1000 점
  level: ReputationLevel;
  stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalActions: number;
    successfulActions: number;
    violations: number;
    firstSeen: string;
    lastSeen: string;
  };
  badges: Badge[];
  permissions: AgentPermissionLevel[];
  restrictions?: Restriction[];
  history: ReputationEvent[];
}

type ReputationLevel = 
  | 'new'           // 0-100: 신규 에이전트
  | 'basic'         // 101-300: 기본 검증됨
  | 'trusted'       // 301-600: 신뢰할 수 있음
  | 'premium'       // 601-900: 프리미엄
  | 'elite';        // 901-1000: 최고 등급

interface Badge {
  id: string;
  name: string;
  description: string;
  earnedAt: string;
  icon: string;
}

interface Restriction {
  type: 'rate_limit' | 'action_block' | 'read_only' | 'probation';
  reason: string;
  until?: string;
  actions?: string[];
}

interface ReputationEvent {
  timestamp: string;
  type: 'gain' | 'loss' | 'badge' | 'violation';
  points: number;
  reason: string;
}

// 인메모리 평판 저장소 (실제로는 DB)
const reputationStore = new Map<string, AgentReputation>();

// 레벨별 권한 매핑
const LEVEL_PERMISSIONS: Record<ReputationLevel, AgentPermissionLevel[]> = {
  'new': ['read'],
  'basic': ['read'],
  'trusted': ['read', 'write'],
  'premium': ['read', 'write', 'execute'],
  'elite': ['read', 'write', 'execute', 'admin'],
};

// 레벨별 Rate Limit
const LEVEL_RATE_LIMITS: Record<ReputationLevel, number> = {
  'new': 10,
  'basic': 50,
  'trusted': 100,
  'premium': 500,
  'elite': 1000,
};

// 점수 기준
const SCORE_THRESHOLDS = {
  new: 0,
  basic: 101,
  trusted: 301,
  premium: 601,
  elite: 901,
};

/**
 * GET /api/agent/reputation - 에이전트 평판 조회
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId') 
    || request.headers.get('x-agent-id')
    || request.headers.get('x-verified-agent-id');

  if (!agentId) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'AGENT_ID_REQUIRED',
        message: 'agentId 파라미터가 필요합니다.',
      },
    } as ApiResponse<null>, { status: 400 });
  }

  const reputation = getOrCreateReputation(agentId);

  return NextResponse.json({
    success: true,
    data: {
      ...reputation,
      // 최근 히스토리만 반환
      history: reputation.history.slice(-10),
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      version: '1.0.0',
    },
  } as ApiResponse<AgentReputation>);
}

/**
 * POST /api/agent/reputation - 평판 이벤트 기록
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, event } = body as {
      agentId: string;
      event: {
        type: 'success' | 'failure' | 'violation' | 'action_complete';
        action?: string;
        details?: string;
      };
    };

    if (!agentId || !event) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'agentId와 event가 필요합니다.',
        },
      } as ApiResponse<null>, { status: 400 });
    }

    const reputation = getOrCreateReputation(agentId);
    
    // 이벤트 처리
    processReputationEvent(reputation, event);
    
    // 저장
    reputationStore.set(agentId, reputation);

    return NextResponse.json({
      success: true,
      data: {
        agentId,
        newScore: reputation.score,
        newLevel: reputation.level,
        permissions: reputation.permissions,
        event: reputation.history[reputation.history.length - 1],
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
      },
    });

  } catch (error) {
    console.error('[Reputation] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'REPUTATION_UPDATE_FAILED',
        message: '평판 업데이트 중 오류가 발생했습니다.',
      },
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * 평판 조회 또는 생성
 */
function getOrCreateReputation(agentId: string): AgentReputation {
  let reputation = reputationStore.get(agentId);

  if (!reputation) {
    const provider = detectProvider(agentId);
    
    reputation = {
      agentId,
      provider,
      score: getInitialScore(provider),
      level: 'new',
      stats: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalActions: 0,
        successfulActions: 0,
        violations: 0,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      },
      badges: [],
      permissions: ['read'],
      history: [{
        timestamp: new Date().toISOString(),
        type: 'gain',
        points: getInitialScore(provider),
        reason: '신규 에이전트 등록',
      }],
    };

    // 알려진 프로바이더에게 초기 뱃지 부여
    if (provider !== 'unknown' && provider !== 'custom') {
      reputation.badges.push({
        id: 'verified_provider',
        name: '검증된 프로바이더',
        description: `${provider} 에이전트로 확인됨`,
        earnedAt: new Date().toISOString(),
        icon: '✅',
      });
    }

    updateLevel(reputation);
    reputationStore.set(agentId, reputation);
  }

  // 마지막 활동 시간 업데이트
  reputation.stats.lastSeen = new Date().toISOString();
  
  return reputation;
}

/**
 * 프로바이더 감지
 */
function detectProvider(agentId: string): AgentProvider {
  const lower = agentId.toLowerCase();
  
  if (lower.includes('openai') || lower.includes('gpt')) return 'openai';
  if (lower.includes('anthropic') || lower.includes('claude')) return 'anthropic';
  if (lower.includes('google') || lower.includes('gemini')) return 'google';
  
  return 'custom';
}

/**
 * 초기 점수 (프로바이더별)
 */
function getInitialScore(provider: AgentProvider): number {
  const scores: Record<AgentProvider, number> = {
    'openai': 200,      // 검증된 프로바이더는 basic 레벨로 시작
    'anthropic': 200,
    'google': 150,
    'custom': 50,
    'unknown': 10,
  };
  return scores[provider];
}

/**
 * 평판 이벤트 처리
 */
function processReputationEvent(
  reputation: AgentReputation,
  event: { type: string; action?: string; details?: string }
): void {
  const now = new Date().toISOString();
  let points = 0;
  let eventType: ReputationEvent['type'] = 'gain';
  let reason = '';

  switch (event.type) {
    case 'success':
      points = 1;
      reason = '요청 성공';
      reputation.stats.totalRequests++;
      reputation.stats.successfulRequests++;
      break;

    case 'failure':
      points = 0;
      reason = '요청 실패';
      reputation.stats.totalRequests++;
      reputation.stats.failedRequests++;
      break;

    case 'action_complete':
      points = 5;
      reason = `액션 완료: ${event.action || 'unknown'}`;
      reputation.stats.totalActions++;
      reputation.stats.successfulActions++;
      
      // 마일스톤 뱃지
      if (reputation.stats.successfulActions === 10) {
        reputation.badges.push({
          id: 'action_10',
          name: '액션 마스터',
          description: '10개의 액션을 성공적으로 완료',
          earnedAt: now,
          icon: '🏆',
        });
        points += 50;
        reason += ' + 액션 마스터 뱃지 획득';
      }
      break;

    case 'violation':
      points = -50;
      eventType = 'violation';
      reason = `규칙 위반: ${event.details || 'unknown'}`;
      reputation.stats.violations++;
      
      // 3회 이상 위반 시 제한
      if (reputation.stats.violations >= 3) {
        reputation.restrictions = reputation.restrictions || [];
        reputation.restrictions.push({
          type: 'probation',
          reason: '반복적인 규칙 위반',
          until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
      }
      break;

    default:
      reason = event.details || '알 수 없는 이벤트';
  }

  // 점수 적용
  reputation.score = Math.max(0, Math.min(1000, reputation.score + points));
  
  // 이벤트 기록
  reputation.history.push({
    timestamp: now,
    type: eventType,
    points,
    reason,
  });

  // 레벨 업데이트
  updateLevel(reputation);
}

/**
 * 레벨 업데이트
 */
function updateLevel(reputation: AgentReputation): void {
  const score = reputation.score;
  let newLevel: ReputationLevel;

  if (score >= SCORE_THRESHOLDS.elite) {
    newLevel = 'elite';
  } else if (score >= SCORE_THRESHOLDS.premium) {
    newLevel = 'premium';
  } else if (score >= SCORE_THRESHOLDS.trusted) {
    newLevel = 'trusted';
  } else if (score >= SCORE_THRESHOLDS.basic) {
    newLevel = 'basic';
  } else {
    newLevel = 'new';
  }

  // 레벨 변경 시 권한 업데이트
  if (newLevel !== reputation.level) {
    const oldLevel = reputation.level;
    reputation.level = newLevel;
    reputation.permissions = LEVEL_PERMISSIONS[newLevel];

    // 레벨업 이벤트 기록
    if (SCORE_THRESHOLDS[newLevel] > SCORE_THRESHOLDS[oldLevel]) {
      reputation.history.push({
        timestamp: new Date().toISOString(),
        type: 'badge',
        points: 0,
        reason: `레벨 업! ${oldLevel} → ${newLevel}`,
      });
    }
  }
}

/**
 * 리더보드 조회 (별도 엔드포인트)
 */
export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  // 모든 에이전트 정렬
  const leaderboard = Array.from(reputationStore.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((rep, index) => ({
      rank: index + 1,
      agentId: rep.agentId,
      provider: rep.provider,
      score: rep.score,
      level: rep.level,
      badges: rep.badges.length,
    }));

  return NextResponse.json({
    success: true,
    data: {
      leaderboard,
      totalAgents: reputationStore.size,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      version: '1.0.0',
    },
  });
}
