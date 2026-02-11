'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface PermissionDefinition {
  id: string;
  name: string;
  description: string;
  level: 'basic' | 'standard' | 'elevated' | 'admin';
  enabled: boolean;
}

interface LevelInfo {
  name: string;
  color: string;
  minReputation: number;
  description: string;
}

const LEVEL_COLORS: Record<string, string> = {
  basic: 'bg-blue-500/20 text-blue-400',
  standard: 'bg-green-500/20 text-green-400',
  elevated: 'bg-purple-500/20 text-purple-400',
  admin: 'bg-red-500/20 text-red-400',
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
  
  // 권한 상태
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([]);
  const [levels, setLevels] = useState<Record<string, LevelInfo>>({});
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [savingPermission, setSavingPermission] = useState<string | null>(null);
  
  // 가드레일 상태
  const [rules, setRules] = useState<GuardrailRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [savingRule, setSavingRule] = useState<string | null>(null);

  // 권한 목록 로드
  const fetchPermissions = useCallback(async () => {
    try {
      setPermissionsLoading(true);
      const response = await fetch('/api/dashboard/permissions');
      const data = await response.json();
      
      if (data.success) {
        setPermissions(data.data.permissions);
        setLevels(data.data.levels);
      }
    } catch (error) {
      console.error('권한 조회 실패:', error);
    } finally {
      setPermissionsLoading(false);
    }
  }, []);

  // 가드레일 규칙 로드
  const fetchRules = useCallback(async () => {
    try {
      setRulesLoading(true);
      const response = await fetch('/api/dashboard/guardrails');
      const data = await response.json();
      
      if (data.success) {
        setRules(data.data);
      }
    } catch (error) {
      console.error('규칙 조회 실패:', error);
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
    fetchRules();
  }, [fetchPermissions, fetchRules]);

  // 권한 토글
  const togglePermission = async (permissionId: string) => {
    const permission = permissions.find(p => p.id === permissionId);
    if (!permission) return;
    
    setSavingPermission(permissionId);
    
    // 낙관적 업데이트
    setPermissions(permissions.map(p => 
      p.id === permissionId ? { ...p, enabled: !p.enabled } : p
    ));
    
    try {
      const response = await fetch('/api/dashboard/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionId, enabled: !permission.enabled }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        // 실패 시 롤백
        setPermissions(permissions.map(p => 
          p.id === permissionId ? { ...p, enabled: permission.enabled } : p
        ));
      }
    } catch (error) {
      // 에러 시 롤백
      setPermissions(permissions.map(p => 
        p.id === permissionId ? { ...p, enabled: permission.enabled } : p
      ));
      console.error('권한 업데이트 실패:', error);
    } finally {
      setSavingPermission(null);
    }
  };

  // 가드레일 토글
  const toggleRule = async (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    
    setSavingRule(ruleId);
    
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
        setRules(rules.map(r => 
          r.id === ruleId ? { ...r, enabled: rule.enabled } : r
        ));
      }
    } catch (error) {
      setRules(rules.map(r => 
        r.id === ruleId ? { ...r, enabled: rule.enabled } : r
      ));
      console.error('규칙 업데이트 실패:', error);
    } finally {
      setSavingRule(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-onyx-100">권한 및 가드레일</h1>
        <p className="text-onyx-400 mt-1">에이전트 권한과 보안 규칙을 관리합니다</p>
      </div>

      {/* 탭 */}
      <div className="border-b border-onyx-700">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('permissions')}
            className={`pb-4 font-medium border-b-2 transition-colors ${
              activeTab === 'permissions'
                ? 'border-dawn-500 text-dawn-500'
                : 'border-transparent text-onyx-400 hover:text-onyx-200'
            }`}
          >
            권한 설정
          </button>
          <button
            onClick={() => setActiveTab('guardrails')}
            className={`pb-4 font-medium border-b-2 transition-colors ${
              activeTab === 'guardrails'
                ? 'border-dawn-500 text-dawn-500'
                : 'border-transparent text-onyx-400 hover:text-onyx-200'
            }`}
          >
            가드레일 규칙
          </button>
        </div>
      </div>

      {activeTab === 'permissions' && (
        <div className="space-y-6">
          {/* 권한 레벨 설명 */}
          <div className="bg-onyx-900 rounded-xl border border-onyx-800 p-6">
            <h2 className="text-lg font-semibold text-onyx-100 mb-4">권한 레벨</h2>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(levels).map(([key, info]) => (
                <div key={key} className="bg-onyx-800/50 border border-onyx-700 rounded-lg p-4">
                  <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${LEVEL_COLORS[key] || 'bg-gray-500/20 text-gray-400'}`}>
                    {info.name}
                  </span>
                  <div className="mt-3 text-sm text-onyx-400">
                    최소 평판: <span className="font-semibold text-onyx-200">{info.minReputation}</span>
                  </div>
                  <div className="mt-1 text-xs text-onyx-500">
                    {info.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 권한 목록 */}
          <div className="bg-onyx-900 rounded-xl border border-onyx-800">
            <div className="p-6 border-b border-onyx-800">
              <h2 className="text-lg font-semibold text-onyx-100">권한 정의</h2>
              <p className="text-sm text-onyx-400 mt-1">각 권한을 활성화/비활성화 할 수 있습니다</p>
            </div>
            {permissionsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-dawn-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-2 text-onyx-400">로딩 중...</p>
              </div>
            ) : (
              <div className="divide-y divide-onyx-800">
                {permissions.map((permission) => (
                  <div key={permission.id} className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        permission.enabled 
                          ? 'bg-gradient-to-br from-dawn-500 to-dawn-600 text-onyx-950' 
                          : 'bg-onyx-800 text-onyx-500'
                      }`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${permission.enabled ? 'text-onyx-100' : 'text-onyx-400'}`}>
                            {permission.name}
                          </span>
                          <span className="text-sm font-mono bg-onyx-800 px-2 py-0.5 rounded text-onyx-400">
                            {permission.id}
                          </span>
                        </div>
                        <p className="text-sm text-onyx-400 mt-1">{permission.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${LEVEL_COLORS[permission.level] || 'bg-gray-500/20 text-gray-400'}`}>
                        {levels[permission.level]?.name || permission.level} 이상
                      </span>
                      <button 
                        onClick={() => togglePermission(permission.id)}
                        disabled={savingPermission === permission.id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          permission.enabled ? 'bg-dawn-500' : 'bg-onyx-700'
                        } ${savingPermission === permission.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span 
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            permission.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 권한 매트릭스 */}
          <div className="bg-onyx-900 rounded-xl border border-onyx-800 p-6">
            <h2 className="text-lg font-semibold text-onyx-100 mb-4">레벨별 권한 매트릭스</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-onyx-700">
                    <th className="text-left py-3 pr-4 font-semibold text-onyx-200">레벨</th>
                    {permissions.map(p => (
                      <th key={p.id} className="text-center py-3 px-2 font-medium text-sm text-onyx-300">
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {['new', 'basic', 'trusted', 'verified', 'elite'].map((level) => (
                    <tr key={level} className="border-b border-onyx-800">
                      <td className="py-3 pr-4 font-medium capitalize text-onyx-200">{level}</td>
                      {permissions.map(p => {
                        const levelOrder = ['basic', 'standard', 'elevated', 'admin'];
                        const agentLevelOrder = ['new', 'basic', 'trusted', 'verified', 'elite'];
                        const requiredIndex = levelOrder.indexOf(p.level);
                        const agentIndex = agentLevelOrder.indexOf(level);
                        const hasPermission = p.enabled && agentIndex >= requiredIndex;
                        
                        return (
                          <td key={p.id} className="text-center py-3 px-2">
                            {hasPermission ? (
                              <svg className="w-5 h-5 mx-auto text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <span className="text-onyx-600">-</span>
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
            <div className="bg-onyx-900 rounded-xl border border-onyx-800 p-6">
              <div className="text-sm text-onyx-400">활성 규칙</div>
              <div className="text-3xl font-bold text-dawn-500 mt-1">
                {rules.filter(r => r.enabled).length}
              </div>
            </div>
            <div className="bg-onyx-900 rounded-xl border border-onyx-800 p-6">
              <div className="text-sm text-onyx-400">오늘 차단된 요청</div>
              <div className="text-3xl font-bold text-red-400 mt-1">127</div>
            </div>
            <div className="bg-onyx-900 rounded-xl border border-onyx-800 p-6">
              <div className="text-sm text-onyx-400">확인 대기 중</div>
              <div className="text-3xl font-bold text-yellow-400 mt-1">3</div>
            </div>
          </div>

          {/* 가드레일 규칙 목록 */}
          <div className="bg-onyx-900 rounded-xl border border-onyx-800">
            <div className="p-6 border-b border-onyx-800 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-onyx-100">가드레일 규칙</h2>
                <p className="text-sm text-onyx-400 mt-1">보안 및 제한 규칙을 관리합니다</p>
              </div>
              <button className="btn-primary flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                새 규칙 추가
              </button>
            </div>
            {rulesLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-dawn-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-2 text-onyx-400">로딩 중...</p>
              </div>
            ) : (
              <div className="divide-y divide-onyx-800">
                {rules.map((rule) => (
                  <div key={rule.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          rule.enabled ? 'bg-dawn-500/20 text-dawn-500' : 'bg-onyx-800 text-onyx-500'
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${rule.enabled ? 'text-onyx-100' : 'text-onyx-400'}`}>
                              {rule.name}
                            </span>
                            <span className="text-xs bg-onyx-800 text-onyx-400 px-2 py-0.5 rounded">
                              {rule.type}
                            </span>
                          </div>
                          <p className="text-sm text-onyx-400 mt-1">{rule.description}</p>
                          <div className="mt-2 font-mono text-xs bg-onyx-800/50 p-2 rounded border border-onyx-700 text-onyx-400">
                            {JSON.stringify(rule.config)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => toggleRule(rule.id)}
                          disabled={savingRule === rule.id}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            rule.enabled ? 'bg-dawn-500' : 'bg-onyx-700'
                          } ${savingRule === rule.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span 
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              rule.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <button className="p-2 text-onyx-500 hover:text-onyx-300">
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
