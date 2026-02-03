'use client';

import React, { useState } from 'react';

// 샘플 에이전트 데이터
const SAMPLE_AGENTS = [
  {
    id: 'agent-gpt4-001',
    name: 'GPT-4 Shopping Assistant',
    provider: 'OpenAI',
    status: 'active',
    reputation: 850,
    level: 'verified',
    permissions: ['read', 'search', 'cart', 'execute'],
    lastActive: '2024-01-15T10:30:00Z',
    totalRequests: 15420,
    successRate: 98.5,
  },
  {
    id: 'agent-claude-002',
    name: 'Claude Commerce Agent',
    provider: 'Anthropic',
    status: 'active',
    reputation: 920,
    level: 'elite',
    permissions: ['read', 'search', 'cart', 'execute', 'admin'],
    lastActive: '2024-01-15T09:45:00Z',
    totalRequests: 28350,
    successRate: 99.1,
  },
  {
    id: 'agent-gemini-003',
    name: 'Gemini Product Finder',
    provider: 'Google',
    status: 'active',
    reputation: 680,
    level: 'trusted',
    permissions: ['read', 'search', 'cart'],
    lastActive: '2024-01-15T08:20:00Z',
    totalRequests: 8920,
    successRate: 97.2,
  },
  {
    id: 'agent-custom-004',
    name: 'Internal Bot v2',
    provider: 'Custom',
    status: 'suspended',
    reputation: 320,
    level: 'basic',
    permissions: ['read'],
    lastActive: '2024-01-10T14:00:00Z',
    totalRequests: 1250,
    successRate: 85.0,
  },
  {
    id: 'agent-test-005',
    name: 'Test Agent',
    provider: 'Internal',
    status: 'pending',
    reputation: 100,
    level: 'new',
    permissions: ['read'],
    lastActive: null,
    totalRequests: 0,
    successRate: 0,
  },
];

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

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<typeof SAMPLE_AGENTS[0] | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAgents = SAMPLE_AGENTS.filter(agent => {
    const matchesStatus = filterStatus === 'all' || agent.status === filterStatus;
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.id.toLowerCase().includes(searchQuery.toLowerCase());
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
        <button className="btn-primary flex items-center gap-2">
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
                      <div className="text-sm text-gray-500">{agent.provider} · {agent.id}</div>
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
                  <button className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium">
                    정지하기
                  </button>
                ) : (
                  <button className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium">
                    활성화
                  </button>
                )}
                <button className="flex-1 py-2 px-4 bg-agent-600 text-white rounded-lg hover:bg-agent-700 font-medium">
                  권한 수정
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
