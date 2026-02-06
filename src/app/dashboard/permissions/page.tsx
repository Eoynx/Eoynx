'use client';

import React, { useState, useEffect } from 'react';

// 권한 정의
const PERMISSIONS = [
  { id: 'read', name: '읽기', description: '컨텍스트 및 상품 정보 조회', level: 'basic' },
  { id: 'search', name: '검색', description: '사이트 내 검색 실행', level: 'basic' },
  { id: 'cart', name: '장바구니', description: '장바구니 조회 및 수정', level: 'standard' },
  { id: 'execute', name: '실행', description: '주문 등 실행 액션', level: 'elevated' },
  { id: 'stream', name: '스트리밍', description: '실시간 이벤트 구독', level: 'standard' },
  { id: 'admin', name: '관리자', description: '모든 권한 + 관리 기능', level: 'admin' },
];

const LEVEL_INFO: Record<string, { name: string; color: string; minReputation: number }> = {
  basic: { name: '기본', color: 'bg-blue-100 text-blue-800', minReputation: 0 },
  standard: { name: '표준', color: 'bg-green-100 text-green-800', minReputation: 300 },
  elevated: { name: '상승', color: 'bg-purple-100 text-purple-800', minReputation: 600 },
  admin: { name: '관리자', color: 'bg-red-100 text-red-800', minReputation: 900 },
};

interface GuardrailRule {
  id: string;
  name: string;
  description: string;
  type: string;
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PermissionsPage() {
  const [activeTab, setActiveTab] = useState<'permissions' | 'guardrails'>('permissions');
  const [rules, setRules] = useState<GuardrailRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // 가드레일 규칙 로드
  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/guardrails');
      const data = await response.json();
      
      if (data.success) {
        setRules(data.data);
      }
    } catch (error) {
      console.error('규칙 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    
    setSaving(ruleId);
    
    // 낙관적 업데이트
    setRules(rules.map(r => 
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    ));
    
    try {
      const response = await fetch('/api/dashboard/guardrails', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ruleId, enabled: !rule.enabled }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        // 실패 시 롤백
        setRules(rules.map(r => 
          r.id === ruleId ? { ...r, enabled: rule.enabled } : r
        ));
      }
    } catch (error) {
      // 에러 시 롤백
      setRules(rules.map(r => 
        r.id === ruleId ? { ...r, enabled: rule.enabled } : r
      ));
      console.error('규칙 업데이트 실패:', error);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">권한 및 가드레일</h1>
        <p className="text-gray-600 mt-1">에이전트 권한과 보안 규칙을 관리합니다</p>
      </div>

      {/* 탭 */}
      <div className="border-b border-gray-200">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('permissions')}
            className={`pb-4 font-medium border-b-2 transition-colors ${
              activeTab === 'permissions'
                ? 'border-agent-500 text-agent-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            권한 설정
          </button>
          <button
            onClick={() => setActiveTab('guardrails')}
            className={`pb-4 font-medium border-b-2 transition-colors ${
              activeTab === 'guardrails'
                ? 'border-agent-500 text-agent-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            가드레일 규칙
          </button>
        </div>
      </div>

      {activeTab === 'permissions' && (
        <div className="space-y-6">
          {/* 권한 레벨 설명 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">권한 레벨</h2>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(LEVEL_INFO).map(([key, info]) => (
                <div key={key} className="border border-gray-200 rounded-lg p-4">
                  <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${info.color}`}>
                    {info.name}
                  </span>
                  <div className="mt-3 text-sm text-gray-600">
                    최소 평판: <span className="font-semibold">{info.minReputation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 권한 목록 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">권한 정의</h2>
              <p className="text-sm text-gray-500 mt-1">각 권한이 허용하는 작업을 확인합니다</p>
            </div>
            <div className="divide-y divide-gray-100">
              {PERMISSIONS.map((permission) => (
                <div key={permission.id} className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-agent-500 to-gateway-500 flex items-center justify-center text-white">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{permission.name}</span>
                        <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">
                          {permission.id}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{permission.description}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${LEVEL_INFO[permission.level].color}`}>
                    {LEVEL_INFO[permission.level].name} 이상
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 권한 매트릭스 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">레벨별 권한 매트릭스</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 pr-4 font-semibold">레벨</th>
                    {PERMISSIONS.map(p => (
                      <th key={p.id} className="text-center py-3 px-2 font-medium text-sm">
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {['new', 'basic', 'trusted', 'verified', 'elite'].map((level) => (
                    <tr key={level} className="border-b border-gray-100">
                      <td className="py-3 pr-4 font-medium capitalize">{level}</td>
                      {PERMISSIONS.map(p => {
                        const levelOrder = ['basic', 'standard', 'elevated', 'admin'];
                        const agentLevelOrder = ['new', 'basic', 'trusted', 'verified', 'elite'];
                        const requiredIndex = levelOrder.indexOf(p.level);
                        const agentIndex = agentLevelOrder.indexOf(level);
                        const hasPermission = agentIndex >= requiredIndex;
                        
                        return (
                          <td key={p.id} className="text-center py-3 px-2">
                            {hasPermission ? (
                              <svg className="w-5 h-5 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'guardrails' && (
        <div className="space-y-6">
          {/* 가드레일 통계 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-sm text-gray-500">활성 규칙</div>
              <div className="text-3xl font-bold text-agent-600 mt-1">
                {rules.filter(r => r.enabled).length}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-sm text-gray-500">오늘 차단된 요청</div>
              <div className="text-3xl font-bold text-red-500 mt-1">127</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-sm text-gray-500">확인 대기 중</div>
              <div className="text-3xl font-bold text-yellow-500 mt-1">3</div>
            </div>
          </div>

          {/* 가드레일 규칙 목록 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">가드레일 규칙</h2>
                <p className="text-sm text-gray-500 mt-1">보안 및 제한 규칙을 관리합니다</p>
              </div>
              <button className="btn-primary flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                새 규칙 추가
              </button>
            </div>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-agent-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-2 text-gray-500">로딩 중...</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {rules.map((rule) => (
                  <div key={rule.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          rule.enabled ? 'bg-agent-100 text-agent-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{rule.name}</span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {rule.type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{rule.description}</p>
                          <div className="mt-2 font-mono text-xs bg-gray-50 p-2 rounded border border-gray-200">
                            {JSON.stringify(rule.config)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => toggleRule(rule.id)}
                          disabled={saving === rule.id}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            rule.enabled ? 'bg-agent-600' : 'bg-gray-300'
                          } ${saving === rule.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span 
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              rule.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
