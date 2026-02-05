'use client';

import React, { useState, useEffect } from 'react';

interface AgentData {
  id: string;
  agentId: string;
  name: string;
  provider: string;
  description?: string;
  status: 'active' | 'suspended' | 'pending';
  reputation: number;
  level: 'new' | 'basic' | 'trusted' | 'verified' | 'elite';
  permissions: string[];
  lastActive: string | null;
  totalRequests: number;
  successRate: number;
  createdAt: string;
}

const PERMISSION_COLORS: Record<string, string> = {
  read: 'bg-blue-100 text-blue-800',
  search: 'bg-green-100 text-green-800',
  cart: 'bg-yellow-100 text-yellow-800',
  execute: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  suspended: 'bg-red-500',
  pending: 'bg-yellow-500',
};

const LEVEL_COLORS: Record<string, string> = {
  new: 'text-gray-500',
  basic: 'text-blue-500',
  trusted: 'text-green-500',
  verified: 'text-purple-500',
  elite: 'text-yellow-500',
};

const PROVIDERS = ['OpenAI', 'Anthropic', 'Google', 'Custom', 'Internal'];
const ALL_PERMISSIONS = ['read', 'search', 'cart', 'execute', 'stream', 'admin'];

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 등록 모달 상태
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: '',
    provider: 'Custom',
    description: '',
    permissions: ['read'] as string[],
  });
  const [registering, setRegistering] = useState(false);
  const [registerResult, setRegisterResult] = useState<{ apiKey?: string; error?: string } | null>(null);

  // 에이전트 목록 조회
  useEffect(() => {
    fetchAgents();
  }, [filterStatus, searchQuery]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await fetch(`/api/dashboard/agents?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setAgents(data.data);
      }
    } catch (error) {
      console.error('에이전트 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 에이전트 등록
  const handleRegister = async () => {
    if (!registerForm.name || !registerForm.provider) return;
    
    setRegistering(true);
    setRegisterResult(null);
    
    try {
      const response = await fetch('/api/dashboard/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRegisterResult({ apiKey: data.data.apiKey });
        fetchAgents(); // 목록 새로고침
      } else {
        setRegisterResult({ error: data.error?.message || '등록 실패' });
      }
    } catch (error) {
      setRegisterResult({ error: '네트워크 오류' });
    } finally {
      setRegistering(false);
    }
  };

  // 에이전트 상태 변경
  const handleStatusChange = async (agentId: string, newStatus: 'active' | 'suspended') => {
    try {
      const response = await fetch('/api/dashboard/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, status: newStatus }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchAgents();
        setSelectedAgent(null);
      }
    } catch (error) {
      console.error('상태 변경 실패:', error);
    }
  };

  // 권한 토글
  const togglePermission = (perm: string) => {
    setRegisterForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const filteredAgents = agents.filter(agent => {
    const matchesStatus = filterStatus === 'all' || agent.status === filterStatus;
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.agentId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">에이전트 관리</h1>
          <p className="text-gray-600 mt-1">등록된 AI 에이전트를 관리하고 권한을 설정합니다</p>
        </div>
        <button 
          onClick={() => {
            setShowRegisterModal(true);
            setRegisterForm({ name: '', provider: 'Custom', description: '', permissions: ['read'] });
            setRegisterResult(null);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 에이전트 등록
        </button>
      </div>

      {/* 필터 및 검색 */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="에이전트 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-agent-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-agent-500 focus:border-transparent"
        >
          <option value="all">모든 상태</option>
          <option value="active">활성</option>
          <option value="suspended">정지됨</option>
          <option value="pending">대기 중</option>
        </select>
      </div>

      {/* 에이전트 목록 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-agent-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-500">로딩 중...</p>
          </div>
        ) : (
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">에이전트</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">상태</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">평판</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">권한</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">활동</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAgents.map((agent) => (
              <tr 
                key={agent.id} 
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedAgent(agent)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-agent-500 to-gateway-500 flex items-center justify-center text-white font-bold">
                      {agent.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{agent.name}</div>
                      <div className="text-sm text-gray-500">{agent.provider} · {agent.agentId}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[agent.status]}`}></span>
                    <span className="text-sm capitalize">{agent.status}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{agent.reputation}</span>
                    <span className={`text-sm font-medium ${LEVEL_COLORS[agent.level]}`}>
                      ({agent.level})
                    </span>
                  </div>
                  <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1">
                    <div 
                      className="h-full bg-agent-500 rounded-full" 
                      style={{ width: `${(agent.reputation / 1000) * 100}%` }}
                    ></div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {agent.permissions.slice(0, 3).map((perm) => (
                      <span 
                        key={perm} 
                        className={`px-2 py-0.5 text-xs font-medium rounded ${PERMISSION_COLORS[perm]}`}
                      >
                        {perm}
                      </span>
                    ))}
                    {agent.permissions.length > 3 && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600">
                        +{agent.permissions.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <div className="text-gray-900">{agent.totalRequests.toLocaleString()} 요청</div>
                    <div className="text-gray-500">성공률 {agent.successRate}%</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    className="text-agent-600 hover:text-agent-800 font-medium text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAgent(agent);
                    }}
                  >
                    상세
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
        {!loading && filteredAgents.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            등록된 에이전트가 없습니다.
          </div>
        )}
      </div>

      {/* 상세 모달 */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 overflow-hidden shadow-xl">
            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-agent-600 to-gateway-600 px-6 py-8 text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                  {selectedAgent.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedAgent.name}</h2>
                  <p className="text-white/80">{selectedAgent.provider} · {selectedAgent.id}</p>
                </div>
              </div>
            </div>

            {/* 모달 내용 */}
            <div className="p-6 space-y-6">
              {/* 상태 및 평판 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500">상태</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-3 h-3 rounded-full ${STATUS_COLORS[selectedAgent.status]}`}></span>
                    <span className="font-medium capitalize">{selectedAgent.status}</span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500">평판 점수</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-xl">{selectedAgent.reputation}</span>
                    <span className={`text-sm font-medium ${LEVEL_COLORS[selectedAgent.level]}`}>
                      {selectedAgent.level}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500">성공률</div>
                  <div className="font-bold text-xl mt-1">{selectedAgent.successRate}%</div>
                </div>
              </div>

              {/* 권한 */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">권한</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedAgent.permissions.map((perm) => (
                    <span 
                      key={perm} 
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg ${PERMISSION_COLORS[perm]}`}
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>

              {/* 활동 통계 */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">활동 통계</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-500">총 요청 수</div>
                    <div className="font-bold text-2xl text-agent-600">
                      {selectedAgent.totalRequests.toLocaleString()}
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-500">마지막 활동</div>
                    <div className="font-medium">
                      {selectedAgent.lastActive 
                        ? new Date(selectedAgent.lastActive).toLocaleString('ko-KR')
                        : '활동 없음'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button 
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                  onClick={() => setSelectedAgent(null)}
                >
                  닫기
                </button>
                {selectedAgent.status === 'active' ? (
                  <button 
                    className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
                    onClick={() => handleStatusChange(selectedAgent.agentId, 'suspended')}
                  >
                    정지하기
                  </button>
                ) : (
                  <button 
                    className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
                    onClick={() => handleStatusChange(selectedAgent.agentId, 'active')}
                  >
                    활성화
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 에이전트 등록 모달 */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-xl">
            <div className="bg-gradient-to-r from-agent-600 to-gateway-600 px-6 py-6 text-white">
              <h2 className="text-xl font-bold">새 에이전트 등록</h2>
              <p className="text-white/80 text-sm mt-1">AI 에이전트를 등록하고 API 키를 발급받으세요</p>
            </div>

            <div className="p-6 space-y-4">
              {registerResult?.apiKey ? (
                // 등록 성공 - API 키 표시
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      에이전트가 등록되었습니다!
                    </div>
                    <p className="text-sm text-green-700">아래 API 키를 안전하게 보관하세요. 다시 확인할 수 없습니다.</p>
                  </div>
                  
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-1">API 키</div>
                    <code className="text-sm font-mono break-all text-gray-900">{registerResult.apiKey}</code>
                  </div>
                  
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(registerResult.apiKey!);
                    }}
                    className="w-full py-2 px-4 bg-agent-600 text-white rounded-lg hover:bg-agent-700 font-medium"
                  >
                    클립보드에 복사
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowRegisterModal(false);
                      setRegisterResult(null);
                    }}
                    className="w-full py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    닫기
                  </button>
                </div>
              ) : (
                // 등록 폼
                <>
                  {registerResult?.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
                      {registerResult.error}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">에이전트 이름 *</label>
                    <input
                      type="text"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="My AI Agent"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-agent-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">프로바이더 *</label>
                    <select
                      value={registerForm.provider}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, provider: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-agent-500 focus:border-transparent"
                    >
                      {PROVIDERS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                    <textarea
                      value={registerForm.description}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="에이전트에 대한 간단한 설명"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-agent-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">초기 권한</label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_PERMISSIONS.map(perm => (
                        <button
                          key={perm}
                          onClick={() => togglePermission(perm)}
                          className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                            registerForm.permissions.includes(perm)
                              ? PERMISSION_COLORS[perm]
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {perm}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowRegisterModal(false)}
                      className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleRegister}
                      disabled={registering || !registerForm.name}
                      className="flex-1 py-2 px-4 bg-agent-600 text-white rounded-lg hover:bg-agent-700 font-medium disabled:opacity-50"
                    >
                      {registering ? '등록 중...' : '등록하기'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}