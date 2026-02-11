'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ActionParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  required: boolean;
  default?: unknown;
  description?: string;
}

interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  requiredPermission: 'read' | 'write' | 'execute' | 'admin';
  confirmationRequired: boolean;
  category: string;
  params: ActionParam[];
  enabled?: boolean;
}

const PERMISSION_COLORS: Record<string, string> = {
  read: 'bg-blue-100 text-blue-800',
  write: 'bg-green-100 text-green-800',
  execute: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
};

const CATEGORY_INFO: Record<string, { name: string; color: string; icon: React.ReactNode }> = {
  cart: {
    name: '장바구니',
    color: 'bg-yellow-100 text-yellow-800',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  order: {
    name: '주문',
    color: 'bg-purple-100 text-purple-800',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  notification: {
    name: '알림',
    color: 'bg-blue-100 text-blue-800',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  search: {
    name: '검색',
    color: 'bg-green-100 text-green-800',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
};

interface ActionTestResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
  error?: {
    code?: string;
    message?: string;
  } | string;
}

export default function ActionsPage() {
  const [actions, setActions] = useState<ActionDefinition[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'list' | 'test'>('list');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<ActionTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const fetchActions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/actions');
      const result = await response.json();

      if (result.success) {
        setActions(result.data.actions);
        setCategories(result.data.categories);
        setError(null);
      } else {
        setError('액션 목록을 불러오는데 실패했습니다');
      }
    } catch (err) {
      console.error('액션 조회 오류:', err);
      setError('서버 연결에 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const filteredActions = filterCategory === 'all' 
    ? actions 
    : actions.filter(a => a.category === filterCategory);

  const handleTest = async () => {
    if (!selectedAction) return;
    
    setTesting(true);
    setTestResult(null);

    try {
      // 파라미터 변환
      const action = actions.find(a => a.id === selectedAction);
      const params: Record<string, unknown> = {};
      
      if (action) {
        action.params.forEach(p => {
          const value = testParams[p.name];
          if (value !== undefined && value !== '') {
            if (p.type === 'number') {
              params[p.name] = Number(value);
            } else if (p.type === 'boolean') {
              params[p.name] = value === 'true';
            } else {
              params[p.name] = value;
            }
          }
        });
      }

      const response = await fetch('/api/agent/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: selectedAction,
          params,
        }),
      });

      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      });
    } finally {
      setTesting(false);
    }
  };

  const selectedActionDef = actions.find(a => a.id === selectedAction);

  // 로딩 상태
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-onyx-100">액션 설정</h1>
          <p className="text-onyx-400 mt-1">AI 에이전트가 실행할 수 있는 액션을 관리하고 테스트합니다</p>
        </div>
        <div className="bg-onyx-900 rounded-xl p-12 text-center border border-onyx-800">
          <div className="animate-spin w-8 h-8 border-2 border-dawn-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-onyx-400">액션 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-onyx-100">액션 설정</h1>
          <p className="text-onyx-400 mt-1">AI 에이전트가 실행할 수 있는 액션을 관리하고 테스트합니다</p>
        </div>
        <div className="bg-red-900/30 border border-red-700/50 text-red-400 px-4 py-3 rounded-lg">
          {error}
          <button onClick={fetchActions} className="ml-4 underline">다시 시도</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-onyx-100">액션 설정</h1>
        <p className="text-onyx-400 mt-1">AI 에이전트가 실행할 수 있는 액션을 관리하고 테스트합니다</p>
      </div>

      {/* 탭 */}
      <div className="border-b border-onyx-700">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-4 font-medium border-b-2 transition-colors ${
              activeTab === 'list'
                ? 'border-dawn-500 text-dawn-500'
                : 'border-transparent text-onyx-400 hover:text-onyx-200'
            }`}
          >
            액션 목록
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`pb-4 font-medium border-b-2 transition-colors ${
              activeTab === 'test'
                ? 'border-dawn-500 text-dawn-500'
                : 'border-transparent text-onyx-400 hover:text-onyx-200'
            }`}
          >
            액션 테스트
          </button>
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="space-y-6">
          {/* 필터 */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterCategory === 'all'
                  ? 'bg-dawn-500 text-onyx-950'
                  : 'bg-onyx-800 text-onyx-300 hover:bg-onyx-700'
              }`}
            >
              전체 ({actions.length})
            </button>
            {categories.map((key) => {
              const info = CATEGORY_INFO[key];
              const count = actions.filter(a => a.category === key).length;
              return (
                <button
                  key={key}
                  onClick={() => setFilterCategory(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    filterCategory === key
                      ? 'bg-dawn-500 text-onyx-950'
                      : 'bg-onyx-800 text-onyx-300 hover:bg-onyx-700'
                  }`}
                >
                  {info?.icon}
                  {info?.name || key} ({count})
                </button>
              );
            })}
          </div>

          {/* 액션 목록 */}
          <div className="bg-onyx-900 rounded-xl border border-onyx-800">
            <div className="p-6 border-b border-onyx-800">
              <h2 className="text-lg font-semibold text-onyx-100">사용 가능한 액션</h2>
              <p className="text-sm text-onyx-400 mt-1">에이전트가 호출할 수 있는 모든 액션입니다</p>
            </div>
            <div className="divide-y divide-onyx-800">
              {filteredActions.map((action) => (
                <div key={action.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-dawn-500 to-dawn-600 flex items-center justify-center text-onyx-950">
                        {CATEGORY_INFO[action.category].icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-onyx-100">{action.name}</span>
                          <span className="text-sm font-mono bg-onyx-800 px-2 py-0.5 rounded text-onyx-300">
                            {action.id}
                          </span>
                          {action.confirmationRequired && (
                            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                              확인 필요
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-onyx-400 mt-1">{action.description}</p>
                        
                        {/* 파라미터 */}
                        {action.params.length > 0 && (
                          <div className="mt-3">
                            <span className="text-xs text-onyx-500">파라미터:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {action.params.map((param) => (
                                <span
                                  key={param.name}
                                  className={`text-xs px-2 py-1 rounded ${
                                    param.required
                                      ? 'bg-onyx-700 text-onyx-200'
                                      : 'bg-onyx-800 text-onyx-400'
                                  }`}
                                >
                                  {param.name}: {param.type}
                                  {param.required && <span className="text-red-400">*</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${CATEGORY_INFO[action.category].color}`}>
                        {CATEGORY_INFO[action.category].name}
                      </span>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${PERMISSION_COLORS[action.requiredPermission]}`}>
                        {action.requiredPermission}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'test' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 액션 선택 및 파라미터 입력 */}
          <div className="bg-onyx-900 rounded-xl border border-onyx-800 p-6">
            <h2 className="text-lg font-semibold text-onyx-100 mb-4">액션 테스트</h2>
            
            {/* 액션 선택 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-onyx-300 mb-2">
                액션 선택
              </label>
              <select
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value);
                  setTestParams({});
                  setTestResult(null);
                }}
                className="w-full px-4 py-2 bg-onyx-800 border border-onyx-700 rounded-lg text-onyx-100 focus:ring-2 focus:ring-dawn-500 focus:border-transparent"
              >
                <option value="">액션을 선택하세요</option>
                {actions.map((action) => (
                  <option key={action.id} value={action.id}>
                    {action.name} ({action.id})
                  </option>
                ))}
              </select>
            </div>

            {/* 파라미터 입력 */}
            {selectedActionDef && selectedActionDef.params.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-onyx-300">파라미터</h3>
                {selectedActionDef.params.map((param) => (
                  <div key={param.name}>
                    <label className="block text-sm text-onyx-400 mb-1">
                      {param.name}
                      {param.required && <span className="text-red-400">*</span>}
                      <span className="text-onyx-500 ml-2">({param.type})</span>
                    </label>
                    {param.type === 'boolean' ? (
                      <select
                        value={testParams[param.name] || ''}
                        onChange={(e) => setTestParams({ ...testParams, [param.name]: e.target.value })}
                        className="w-full px-4 py-2 bg-onyx-800 border border-onyx-700 rounded-lg text-onyx-100 focus:ring-2 focus:ring-dawn-500 focus:border-transparent"
                      >
                        <option value="">선택하세요</option>
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : (
                      <input
                        type={param.type === 'number' ? 'number' : 'text'}
                        value={testParams[param.name] || ''}
                        onChange={(e) => setTestParams({ ...testParams, [param.name]: e.target.value })}
                        placeholder={param.default !== undefined ? `기본값: ${param.default}` : ''}
                        className="w-full px-4 py-2 bg-onyx-800 border border-onyx-700 rounded-lg text-onyx-100 placeholder-onyx-500 focus:ring-2 focus:ring-dawn-500 focus:border-transparent"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 테스트 버튼 */}
            <button
              onClick={handleTest}
              disabled={!selectedAction || testing}
              className="mt-6 w-full px-4 py-3 bg-gradient-to-r from-dawn-500 to-dawn-600 text-onyx-950 font-semibold rounded-lg hover:from-dawn-400 hover:to-dawn-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {testing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  테스트 중...
                </span>
              ) : (
                '액션 실행'
              )}
            </button>
          </div>

          {/* 결과 표시 */}
          <div className="bg-onyx-900 rounded-xl border border-onyx-800 p-6">
            <h2 className="text-lg font-semibold text-onyx-100 mb-4">실행 결과</h2>
            
            {testResult ? (
              <div className="space-y-4">
                {/* 상태 */}
                <div className={`p-4 rounded-lg ${
                  testResult.success 
                    ? 'bg-green-500/10 border border-green-500/20' 
                    : 'bg-red-500/10 border border-red-500/20'
                }`}>
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className={testResult.success ? 'text-green-400' : 'text-red-400'}>
                      {testResult.success ? '성공' : '실패'}
                    </span>
                  </div>
                  {testResult.message && (
                    <p className="mt-2 text-sm text-onyx-300">{testResult.message}</p>
                  )}
                  {testResult.error && (
                    <p className="mt-2 text-sm text-red-400">
                      {typeof testResult.error === 'string' 
                        ? testResult.error 
                        : testResult.error.message || JSON.stringify(testResult.error)}
                    </p>
                  )}
                </div>

                {/* 데이터 */}
                {testResult.data && (
                  <div>
                    <h3 className="text-sm font-medium text-onyx-300 mb-2">응답 데이터</h3>
                    <pre className="p-4 bg-onyx-800 rounded-lg text-sm text-onyx-200 overflow-auto max-h-96">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-onyx-500">
                <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p>액션을 선택하고 테스트해보세요</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* API 문서 링크 */}
      <div className="bg-onyx-900 rounded-xl border border-onyx-800 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-onyx-800 flex items-center justify-center text-dawn-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-onyx-100">API 문서</h3>
            <p className="text-sm text-onyx-400 mt-1">
              액션 API에 대한 자세한 문서는 API 문서 페이지에서 확인하세요.
            </p>
            <code className="block mt-3 p-3 bg-onyx-800 rounded-lg text-sm text-onyx-200">
              POST /api/agent/action<br />
              {`{ "action": "action_id", "params": { ... } }`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
