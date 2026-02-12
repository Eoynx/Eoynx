/**
 * M2M (Machine to Machine) 인증 시스템
 * AI 에이전트의 고유 토큰을 통한 인증 처리
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import type { 
  AgentIdentity, 
  AgentToken, 
  AgentPermissionLevel,
  AgentProvider 
} from '@/types';
import { getJWTSecretKey } from './jwt-config';

// 보안: 환경 변수에서 시크릿 키 로드 (하드코딩 제거됨)
const getJWTSecret = () => getJWTSecretKey();

const TOKEN_EXPIRY_HOURS = 24;

// 등록된 에이전트 목록 (실제로는 DB에서 관리)
const registeredAgents: Map<string, AgentIdentity> = new Map();

// 에이전트 권한 설정 (실제로는 DB에서 관리)
const agentPermissions: Map<string, AgentPermissionLevel[]> = new Map([
  ['openai-gpt4', ['read', 'write', 'execute']],
  ['anthropic-claude', ['read', 'write', 'execute']],
  ['google-gemini', ['read', 'write']],
  ['default', ['read']],
]);

interface TokenPayload extends JWTPayload {
  agentId: string;
  provider: AgentProvider;
  permissions: AgentPermissionLevel[];
  scopes: string[];
}

/**
 * 에이전트 토큰 생성
 */
export async function generateAgentToken(
  agent: AgentIdentity,
  scopes: string[] = ['*']
): Promise<AgentToken> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + (TOKEN_EXPIRY_HOURS * 60 * 60);
  
  // 권한 결정
  const permissionKey = `${agent.provider}-${agent.name}`.toLowerCase();
  const permissions = agentPermissions.get(permissionKey) 
    || agentPermissions.get('default') 
    || ['read'];

  const payload: TokenPayload = {
    agentId: agent.id,
    provider: agent.provider,
    permissions: permissions as AgentPermissionLevel[],
    scopes,
    iat: now,
    exp: expiresAt,
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_EXPIRY_HOURS}h`)
    .setJti(uuidv4())
    .sign(getJWTSecret());

  return {
    token,
    agentId: agent.id,
    issuedAt: now,
    expiresAt,
    permissions: permissions as AgentPermissionLevel[],
    scopes,
  };
}

/**
 * 에이전트 토큰 검증
 */
export async function verifyAgentToken(token: string): Promise<{
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
}> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecret());
    
    return {
      valid: true,
      payload: payload as TokenPayload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message.includes('expired')) {
      return { valid: false, error: 'Token expired' };
    }
    if (message.includes('signature')) {
      return { valid: false, error: 'Invalid signature' };
    }
    
    return { valid: false, error: 'Token verification failed' };
  }
}

/**
 * 에이전트 등록
 */
export function registerAgent(agent: AgentIdentity): void {
  registeredAgents.set(agent.id, agent);
}

/**
 * 에이전트 조회
 */
export function getRegisteredAgent(agentId: string): AgentIdentity | undefined {
  return registeredAgents.get(agentId);
}

/**
 * User-Agent 헤더에서 에이전트 정보 추출
 */
export function parseAgentFromUserAgent(userAgent: string): Partial<AgentIdentity> {
  const providers: Record<string, AgentProvider> = {
    'openai': 'openai',
    'gpt': 'openai',
    'chatgpt': 'openai',
    'anthropic': 'anthropic',
    'claude': 'anthropic',
    'google': 'google',
    'gemini': 'google',
    'bard': 'google',
  };

  const lowerUA = userAgent.toLowerCase();
  
  for (const [keyword, provider] of Object.entries(providers)) {
    if (lowerUA.includes(keyword)) {
      // 버전 추출 시도
      const versionMatch = userAgent.match(/(\d+\.?\d*\.?\d*)/);
      
      return {
        provider,
        version: versionMatch ? versionMatch[1] : undefined,
      };
    }
  }

  return { provider: 'unknown' };
}

/**
 * 권한 검사
 */
export function hasPermission(
  agentPermissions: AgentPermissionLevel[],
  requiredPermission: AgentPermissionLevel
): boolean {
  const permissionHierarchy: Record<AgentPermissionLevel, number> = {
    'read': 1,
    'write': 2,
    'execute': 3,
    'admin': 4,
  };

  const requiredLevel = permissionHierarchy[requiredPermission];
  
  return agentPermissions.some(
    perm => permissionHierarchy[perm] >= requiredLevel
  );
}

/**
 * 스코프 검사
 */
export function hasScope(
  tokenScopes: string[],
  requiredScope: string
): boolean {
  // 와일드카드 스코프
  if (tokenScopes.includes('*')) return true;
  
  // 정확한 매칭
  if (tokenScopes.includes(requiredScope)) return true;
  
  // 계층적 스코프 (예: 'products:*'는 'products:read', 'products:write' 포함)
  const _scopeParts = requiredScope.split(':');
  for (const scope of tokenScopes) {
    if (scope.endsWith(':*')) {
      const scopePrefix = scope.slice(0, -2);
      if (requiredScope.startsWith(scopePrefix)) return true;
    }
  }
  
  return false;
}

/**
 * 에이전트 식별 정보 생성
 */
export function createAgentIdentity(
  name: string,
  provider: AgentProvider,
  options?: Partial<AgentIdentity>
): AgentIdentity {
  return {
    id: uuidv4(),
    name,
    provider,
    ...options,
  };
}

// 기본 에이전트 초기화
function initializeDefaultAgents() {
  const defaultAgents: AgentIdentity[] = [
    createAgentIdentity('GPT-4', 'openai', { version: '4.0' }),
    createAgentIdentity('Claude', 'anthropic', { version: '3.0' }),
    createAgentIdentity('Gemini', 'google', { version: '1.5' }),
  ];

  defaultAgents.forEach(agent => registerAgent(agent));
}

// 모듈 로드 시 기본 에이전트 초기화
initializeDefaultAgents();
