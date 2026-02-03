/**
 * Agent Gateway - 핵심 타입 정의
 */

// ============================================
// AI 에이전트 관련 타입
// ============================================

export type AgentProvider = 
  | 'openai'      // GPT-4, GPT-3.5
  | 'anthropic'   // Claude
  | 'google'      // Gemini
  | 'custom'      // 사설 에이전트
  | 'unknown';

export type AgentPermissionLevel = 
  | 'read'        // 정보 조회만 가능
  | 'write'       // 데이터 수정 가능
  | 'execute'     // 액션 실행 가능 (주문, 결제 등)
  | 'admin';      // 전체 권한

export interface AgentIdentity {
  id: string;
  name: string;
  provider: AgentProvider;
  version?: string;
  signature?: string;         // 에이전트 고유 서명
  publicKey?: string;         // M2M 인증용 공개키
  capabilities?: string[];    // 에이전트가 수행 가능한 기능 목록
}

export interface AgentToken {
  token: string;
  agentId: string;
  issuedAt: number;
  expiresAt: number;
  permissions: AgentPermissionLevel[];
  scopes: string[];           // 허용된 API 스코프
}

export interface AgentSession {
  sessionId: string;
  agent: AgentIdentity;
  token: AgentToken;
  startedAt: Date;
  lastActivityAt: Date;
  requestCount: number;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================
// 구조화된 데이터 (JSON-LD / Schema.org)
// ============================================

export interface SchemaOrgBase {
  '@context': 'https://schema.org' | string;
  '@type': string;
  '@id'?: string;
  // 추가 속성 허용
  [key: string]: unknown;
}

export interface SchemaOrgProduct extends SchemaOrgBase {
  '@type': 'Product';
  name: string;
  description?: string;
  image?: string | string[];
  sku?: string;
  brand?: {
    '@type': 'Brand';
    name: string;
  };
  offers?: SchemaOrgOffer | SchemaOrgOffer[];
  aggregateRating?: {
    '@type': 'AggregateRating';
    ratingValue: number;
    reviewCount: number;
  };
}

export interface SchemaOrgOffer extends SchemaOrgBase {
  '@type': 'Offer';
  price: string | number;
  priceCurrency: string;
  availability: 'InStock' | 'OutOfStock' | 'PreOrder' | 'LimitedAvailability';
  seller?: {
    '@type': 'Organization';
    name: string;
  };
  validFrom?: string;
  validThrough?: string;
}

export interface SchemaOrgWebSite extends SchemaOrgBase {
  '@type': 'WebSite';
  name: string;
  url: string;
  description?: string;
  potentialAction?: SchemaOrgAction[];
}

export interface SchemaOrgAction extends SchemaOrgBase {
  '@type': 'Action' | 'SearchAction' | 'OrderAction' | 'ReserveAction';
  target?: string | { '@type': 'EntryPoint'; urlTemplate: string };
  name?: string;
  description?: string;
}

// ============================================
// Agent Gateway 전용 액션 타입
// ============================================

export type ActionType = 
  | 'search'
  | 'view'
  | 'addToCart'
  | 'purchase'
  | 'reserve'
  | 'subscribe'
  | 'contact'
  | 'custom';

export interface AgentAction {
  type: ActionType;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  requiredPermission: AgentPermissionLevel;
  parameters?: ActionParameter[];
  rateLimit?: {
    maxRequests: number;
    windowSeconds: number;
  };
}

export interface ActionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
  default?: unknown;
  enum?: string[] | number[];
}

// ============================================
// Agent Gateway 응답 타입
// ============================================

export interface AgentGatewayResponse {
  '@context': 'https://schema.org';
  '@type': 'WebPage';
  '@id': string;
  
  // 메타데이터
  gateway: {
    version: string;
    timestamp: string;
    responseTime: number;
  };
  
  // 사이트 컨텍스트
  siteContext: SiteContext;
  
  // 구조화된 데이터
  structuredData: SchemaOrgBase[];
  
  // 실행 가능한 액션
  availableActions: AgentAction[];
  
  // 실시간 컨텍스트 브리핑
  contextBriefing?: ContextBriefing;
  
  // Dynamic Prompt (선택적)
  suggestedPrompt?: string;
}

export interface SiteContext {
  name: string;
  url: string;
  description: string;
  primaryLanguage: string;
  categories?: string[];
  features?: string[];
}

export interface ContextBriefing {
  summary: string;
  highlights: string[];
  alerts?: Alert[];
  trending?: TrendingItem[];
  lastUpdated: string;
}

export interface Alert {
  type: 'info' | 'warning' | 'error';
  message: string;
  expiresAt?: string;
}

export interface TrendingItem {
  name: string;
  type: string;
  url?: string;
  rank: number;
}

// ============================================
// 데이터 추출 관련 타입
// ============================================

export interface ExtractionRule {
  id: string;
  name: string;
  selector: string;         // CSS 선택자
  attribute?: string;       // 추출할 속성 (없으면 텍스트)
  transform?: 'trim' | 'lowercase' | 'uppercase' | 'number' | 'date';
  mapping: string;          // JSON-LD 필드 매핑
}

export interface ExtractionConfig {
  siteId: string;
  baseUrl: string;
  rules: ExtractionRule[];
  defaultSchema: string;    // 기본 Schema.org 타입
  refreshInterval?: number; // 데이터 갱신 주기 (초)
}

export interface ExtractedData {
  url: string;
  extractedAt: string;
  rawHtml?: string;
  structuredData: SchemaOrgBase;
  metadata: {
    title?: string;
    description?: string;
    keywords?: string[];
    canonical?: string;
  };
}

// ============================================
// 접근 로그 및 분석
// ============================================

export interface AccessLog {
  id: string;
  timestamp: Date;
  agentId: string;
  agentProvider: AgentProvider;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  requestBody?: unknown;
  responseSize: number;
  ipAddress?: string;
  action?: string;
}

export interface AnalyticsSummary {
  period: {
    start: Date;
    end: Date;
  };
  totalRequests: number;
  uniqueAgents: number;
  topAgents: { agentId: string; count: number }[];
  topEndpoints: { endpoint: string; count: number }[];
  topActions: { action: string; count: number }[];
  avgResponseTime: number;
  errorRate: number;
}

// ============================================
// API 응답 래퍼
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}
