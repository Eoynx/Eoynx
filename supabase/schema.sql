/**
 * Supabase 데이터베이스 스키마 (SQL)
 * 
 * Supabase 대시보드 SQL 에디터에서 실행하세요:
 * https://app.supabase.com/project/[YOUR_PROJECT]/sql
 */

-- ============================================
-- 에이전트 테이블
-- AI 에이전트 등록 및 관리
-- ============================================
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'suspended', 'pending')),
  api_key_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 에이전트 인덱스
CREATE INDEX idx_agents_agent_id ON agents(agent_id);
CREATE INDEX idx_agents_status ON agents(status);

-- ============================================
-- 평판 테이블
-- 에이전트 신뢰도 점수 및 레벨 관리
-- ============================================
CREATE TABLE IF NOT EXISTS agent_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  score INTEGER DEFAULT 100 CHECK (score >= 0 AND score <= 1000),
  level TEXT DEFAULT 'new' CHECK (level IN ('new', 'basic', 'trusted', 'verified', 'elite')),
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 평판 인덱스
CREATE INDEX idx_reputation_agent_id ON agent_reputation(agent_id);
CREATE INDEX idx_reputation_score ON agent_reputation(score DESC);

-- ============================================
-- 평판 이벤트 로그
-- 점수 변화 추적
-- ============================================
CREATE TABLE IF NOT EXISTS reputation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  impact INTEGER NOT NULL,
  old_score INTEGER,
  new_score INTEGER,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 평판 이벤트 인덱스
CREATE INDEX idx_rep_events_agent_id ON reputation_events(agent_id);
CREATE INDEX idx_rep_events_created_at ON reputation_events(created_at DESC);

-- ============================================
-- 권한 테이블
-- 에이전트별 권한 부여
-- ============================================
CREATE TABLE IF NOT EXISTS agent_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('read', 'search', 'cart', 'execute', 'stream', 'admin')),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by TEXT,
  expires_at TIMESTAMPTZ,
  UNIQUE(agent_id, permission)
);

-- 권한 인덱스
CREATE INDEX idx_permissions_agent_id ON agent_permissions(agent_id);

-- ============================================
-- API 요청 로그
-- 모든 API 호출 기록
-- ============================================
CREATE TABLE IF NOT EXISTS request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT,
  method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status_code INTEGER,
  duration_ms INTEGER,
  request_body JSONB,
  response_summary JSONB,
  ip_address TEXT,
  user_agent TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 로그 인덱스 (최근 데이터 위주)
CREATE INDEX idx_logs_agent_id ON request_logs(agent_id);
CREATE INDEX idx_logs_created_at ON request_logs(created_at DESC);
CREATE INDEX idx_logs_status ON request_logs(status_code);
CREATE INDEX idx_logs_endpoint ON request_logs(endpoint);

-- 파티셔닝을 위한 시간 기반 인덱스 (옵션)
-- CREATE INDEX idx_logs_created_date ON request_logs(DATE(created_at));

-- ============================================
-- 액션 실행 로그
-- 실행된 액션 기록
-- ============================================
CREATE TABLE IF NOT EXISTS action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  action_name TEXT NOT NULL,
  action_params JSONB,
  result JSONB,
  status TEXT CHECK (status IN ('success', 'failed', 'pending', 'cancelled')),
  execution_time_ms INTEGER,
  requires_confirmation BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 액션 로그 인덱스
CREATE INDEX idx_action_logs_agent_id ON action_logs(agent_id);
CREATE INDEX idx_action_logs_action ON action_logs(action_name);
CREATE INDEX idx_action_logs_status ON action_logs(status);

-- ============================================
-- 가드레일 규칙
-- 보안 및 제한 규칙 설정
-- ============================================
CREATE TABLE IF NOT EXISTS guardrail_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL,
  config JSONB NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 가드레일 인덱스
CREATE INDEX idx_guardrails_enabled ON guardrail_rules(enabled);
CREATE INDEX idx_guardrails_type ON guardrail_rules(rule_type);

-- ============================================
-- 위반 기록
-- 가드레일 규칙 위반 로그
-- ============================================
CREATE TABLE IF NOT EXISTS violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  rule_id UUID REFERENCES guardrail_rules(id),
  violation_type TEXT NOT NULL,
  details JSONB,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 위반 인덱스
CREATE INDEX idx_violations_agent_id ON violations(agent_id);
CREATE INDEX idx_violations_severity ON violations(severity);

-- ============================================
-- 트리거: updated_at 자동 업데이트
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reputation_updated_at
  BEFORE UPDATE ON agent_reputation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guardrails_updated_at
  BEFORE UPDATE ON guardrail_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 트리거: 에이전트 생성 시 기본 평판 생성
-- ============================================
CREATE OR REPLACE FUNCTION create_default_reputation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO agent_reputation (agent_id, score, level)
  VALUES (NEW.agent_id, 100, 'new');
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_agent_reputation
  AFTER INSERT ON agents
  FOR EACH ROW EXECUTE FUNCTION create_default_reputation();

-- ============================================
-- 트리거: 에이전트 생성 시 기본 권한 부여
-- ============================================
CREATE OR REPLACE FUNCTION grant_default_permissions()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO agent_permissions (agent_id, permission, granted_by)
  VALUES 
    (NEW.agent_id, 'read', 'system'),
    (NEW.agent_id, 'search', 'system');
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER grant_agent_permissions
  AFTER INSERT ON agents
  FOR EACH ROW EXECUTE FUNCTION grant_default_permissions();

-- ============================================
-- 함수: 평판 점수 업데이트
-- ============================================
CREATE OR REPLACE FUNCTION update_reputation_score(
  p_agent_id TEXT,
  p_event_type TEXT,
  p_impact INTEGER,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (new_score INTEGER, new_level TEXT) AS $$
DECLARE
  v_old_score INTEGER;
  v_new_score INTEGER;
  v_new_level TEXT;
BEGIN
  -- 현재 점수 조회
  SELECT score INTO v_old_score
  FROM agent_reputation
  WHERE agent_id = p_agent_id;

  -- 새 점수 계산 (0-1000 범위)
  v_new_score := GREATEST(0, LEAST(1000, v_old_score + p_impact));

  -- 레벨 결정
  v_new_level := CASE
    WHEN v_new_score >= 900 THEN 'elite'
    WHEN v_new_score >= 700 THEN 'verified'
    WHEN v_new_score >= 500 THEN 'trusted'
    WHEN v_new_score >= 300 THEN 'basic'
    ELSE 'new'
  END;

  -- 평판 업데이트
  UPDATE agent_reputation
  SET score = v_new_score, level = v_new_level
  WHERE agent_id = p_agent_id;

  -- 이벤트 로그
  INSERT INTO reputation_events (agent_id, event_type, impact, old_score, new_score, reason)
  VALUES (p_agent_id, p_event_type, p_impact, v_old_score, v_new_score, p_reason);

  RETURN QUERY SELECT v_new_score, v_new_level;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 뷰: 에이전트 요약 (대시보드용)
-- ============================================
CREATE OR REPLACE VIEW agent_summary AS
SELECT 
  a.id,
  a.agent_id,
  a.name,
  a.provider,
  a.status,
  a.created_at,
  r.score AS reputation_score,
  r.level AS reputation_level,
  r.total_requests,
  r.successful_requests,
  r.last_active_at,
  CASE WHEN r.total_requests > 0 
    THEN ROUND(r.successful_requests::NUMERIC / r.total_requests * 100, 2)
    ELSE 0 
  END AS success_rate,
  ARRAY_AGG(p.permission) FILTER (WHERE p.permission IS NOT NULL) AS permissions
FROM agents a
LEFT JOIN agent_reputation r ON a.agent_id = r.agent_id
LEFT JOIN agent_permissions p ON a.agent_id = p.agent_id
GROUP BY a.id, a.agent_id, a.name, a.provider, a.status, a.created_at,
         r.score, r.level, r.total_requests, r.successful_requests, r.last_active_at;

-- ============================================
-- 뷰: 최근 활동 (대시보드용)
-- ============================================
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
  l.id,
  l.agent_id,
  a.name AS agent_name,
  l.method,
  l.endpoint,
  l.status_code,
  l.duration_ms,
  l.created_at
FROM request_logs l
LEFT JOIN agents a ON l.agent_id = a.agent_id
ORDER BY l.created_at DESC
LIMIT 100;

-- ============================================
-- Row Level Security (RLS) 정책
-- API 키로 인증된 사용자만 자신의 데이터 접근
-- ============================================

-- RLS 활성화
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;

-- 서비스 역할은 모든 접근 허용 (서버 사이드)
CREATE POLICY "Service role has full access to agents"
  ON agents FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to reputation"
  ON agent_reputation FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to permissions"
  ON agent_permissions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to logs"
  ON request_logs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to action_logs"
  ON action_logs FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 초기 데이터: 기본 가드레일 규칙
-- ============================================
INSERT INTO guardrail_rules (name, description, rule_type, config, priority) VALUES
  ('일일 요청 제한', '에이전트당 일일 최대 요청 수 제한', 'rate_limit', '{"maxRequests": 10000, "window": "24h"}', 1),
  ('주문 금액 제한', '단일 주문 최대 금액 제한', 'limit', '{"maxAmount": 1000000, "currency": "KRW"}', 2),
  ('실행 액션 확인 필수', 'execute 권한 액션은 사용자 확인 필요', 'confirmation', '{"requiredFor": ["purchase", "create_order"]}', 3),
  ('신규 에이전트 제한', '평판 100 미만 에이전트 기능 제한', 'reputation', '{"minReputation": 100, "restrictedActions": ["cart", "execute"]}', 4),
  ('악성 에이전트 차단', '블랙리스트 에이전트 자동 차단', 'blacklist', '{"autoBlockThreshold": 5}', 5);

-- ============================================
-- 완료 메시지
-- ============================================
SELECT 'Agent-Gateway 데이터베이스 스키마가 성공적으로 생성되었습니다!' AS message;
