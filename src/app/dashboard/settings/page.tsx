'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/components/ThemeProvider';

interface User {
  id: string;
  email: string;
  name: string;
  provider?: string;
  role?: string;
}

interface Settings {
  notifications: {
    email: boolean;
    webhook: boolean;
    slack: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    sessionTimeout: number;
  };
  display: {
    theme: 'light' | 'dark' | 'system';
    language: 'ko' | 'en';
  };
}

const defaultSettings: Settings = {
  notifications: {
    email: true,
    webhook: false,
    slack: false,
  },
  security: {
    twoFactorEnabled: false,
    sessionTimeout: 30,
  },
  display: {
    theme: 'dark',
    language: 'ko',
  },
};

export default function SettingsPage() {
  const { theme: currentTheme, setTheme: setGlobalTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'api'>('profile');
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; key_prefix: string; created_at: string; last_used_at: string | null }[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // 전역 테마와 동기화
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      display: { ...prev.display, theme: currentTheme },
    }));
  }, [currentTheme]);

  useEffect(() => {
    fetchUserData();
    loadSettings();
    fetchApiKeys();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = () => {
    const saved = localStorage.getItem('userSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      localStorage.setItem('userSettings', JSON.stringify(settings));
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setSaving(false);
    }
  };

  const fetchApiKeys = async () => {
    try {
      setApiLoading(true);
      setApiError(null);
      const response = await fetch('/api/dashboard/api-keys');
      const data = await response.json();
      
      if (data.success) {
        setApiKeys(data.data || []);
      } else {
        setApiError(data.error || 'API 키 목록을 불러올 수 없습니다');
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      setApiError('API 키 목록을 불러올 수 없습니다');
    } finally {
      setApiLoading(false);
    }
  };

  const generateApiKey = async () => {
    if (!newKeyName.trim()) return;
    
    try {
      setApiLoading(true);
      setApiError(null);
      
      const response = await fetch('/api/dashboard/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setGeneratedKey(data.data.apiKey);
        setNewKeyName('');
        // 목록 새로고침
        await fetchApiKeys();
      } else {
        setApiError(data.error || 'API 키 생성에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to generate API key:', error);
      setApiError('API 키 생성에 실패했습니다');
    } finally {
      setApiLoading(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    try {
      setApiLoading(true);
      setApiError(null);
      
      const response = await fetch(`/api/dashboard/api-keys?id=${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 목록에서 제거
        setApiKeys(apiKeys.filter(k => k.id !== id));
      } else {
        setApiError(data.error || 'API 키 삭제에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
      setApiError('API 키 삭제에 실패했습니다');
    } finally {
      setApiLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-dawn-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-onyx-100">설정</h1>
        <p className="text-onyx-400 mt-1">계정 및 애플리케이션 설정을 관리합니다</p>
      </div>

      {/* 탭 */}
      <div className="border-b border-onyx-700">
        <div className="flex gap-8 overflow-x-auto">
          {[
            { id: 'profile', name: '프로필' },
            { id: 'notifications', name: '알림' },
            { id: 'security', name: '보안' },
            { id: 'api', name: 'API 키' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-4 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-dawn-500 text-dawn-500'
                  : 'border-transparent text-onyx-400 hover:text-onyx-200'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* 프로필 탭 */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-onyx-900 rounded-xl border border-onyx-800 p-6">
            <h2 className="text-lg font-semibold text-onyx-100 mb-6">프로필 정보</h2>
            
            <div className="flex items-start gap-6">
              {/* 아바타 */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-dawn-500 to-dawn-600 flex items-center justify-center text-2xl font-bold text-onyx-950">
                {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-onyx-300 mb-1">이름</label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    readOnly
                    className="w-full px-4 py-2 bg-onyx-800 border border-onyx-700 rounded-lg text-onyx-100 cursor-not-allowed"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-onyx-300 mb-1">이메일</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    readOnly
                    className="w-full px-4 py-2 bg-onyx-800 border border-onyx-700 rounded-lg text-onyx-100 cursor-not-allowed"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-onyx-300 mb-1">로그인 방식</label>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      user?.provider === 'google' ? 'bg-blue-100 text-blue-800' :
                      user?.provider === 'github' ? 'bg-gray-100 text-gray-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user?.provider === 'google' ? 'Google' :
                       user?.provider === 'github' ? 'GitHub' :
                       '이메일'}
                    </span>
                  </div>
                </div>

                {user?.role && (
                  <div>
                    <label className="block text-sm font-medium text-onyx-300 mb-1">역할</label>
                    <span className="px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-800">
                      {user.role}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 테마 설정 */}
          <div className="bg-onyx-900 rounded-xl border border-onyx-800 p-6">
            <h2 className="text-lg font-semibold text-onyx-100 mb-4">디스플레이 설정</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-onyx-300 mb-2">테마</label>
                <div className="flex gap-3">
                  {[
                    { value: 'light', label: '라이트' },
                    { value: 'dark', label: '다크' },
                    { value: 'system', label: '시스템' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        const newTheme = option.value as 'light' | 'dark' | 'system';
                        setGlobalTheme(newTheme);
                        setSettings({ ...settings, display: { ...settings.display, theme: newTheme } });
                      }}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        settings.display.theme === option.value
                          ? 'border-dawn-500 bg-dawn-500/10 text-dawn-500'
                          : 'border-onyx-700 text-onyx-300 hover:border-onyx-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-onyx-300 mb-2">언어</label>
                <select
                  value={settings.display.language}
                  onChange={(e) => setSettings({ ...settings, display: { ...settings.display, language: e.target.value as 'ko' | 'en' } })}
                  className="px-4 py-2 bg-onyx-800 border border-onyx-700 rounded-lg text-onyx-100"
                >
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 알림 탭 */}
      {activeTab === 'notifications' && (
        <div className="bg-onyx-900 rounded-xl border border-onyx-800 p-6">
          <h2 className="text-lg font-semibold text-onyx-100 mb-6">알림 설정</h2>
          
          <div className="space-y-6">
            {[
              { key: 'email', name: '이메일 알림', description: '중요한 업데이트를 이메일로 받습니다' },
              { key: 'webhook', name: 'Webhook 알림', description: '이벤트 발생 시 Webhook URL로 알림을 전송합니다' },
              { key: 'slack', name: 'Slack 알림', description: 'Slack 채널로 알림을 전송합니다' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-4 border-b border-onyx-800 last:border-0">
                <div>
                  <h3 className="text-onyx-100 font-medium">{item.name}</h3>
                  <p className="text-sm text-onyx-400">{item.description}</p>
                </div>
                <button
                  onClick={() => setSettings({
                    ...settings,
                    notifications: {
                      ...settings.notifications,
                      [item.key]: !settings.notifications[item.key as keyof typeof settings.notifications],
                    },
                  })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.notifications[item.key as keyof typeof settings.notifications]
                      ? 'bg-dawn-500'
                      : 'bg-onyx-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.notifications[item.key as keyof typeof settings.notifications]
                        ? 'translate-x-6'
                        : ''
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 보안 탭 */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-onyx-900 rounded-xl border border-onyx-800 p-6">
            <h2 className="text-lg font-semibold text-onyx-100 mb-6">보안 설정</h2>
            
            <div className="space-y-6">
              {/* 2FA */}
              <div className="flex items-center justify-between py-4 border-b border-onyx-800">
                <div>
                  <h3 className="text-onyx-100 font-medium">2단계 인증</h3>
                  <p className="text-sm text-onyx-400">추가 보안을 위해 2단계 인증을 활성화합니다</p>
                </div>
                <button
                  onClick={() => setSettings({
                    ...settings,
                    security: { ...settings.security, twoFactorEnabled: !settings.security.twoFactorEnabled },
                  })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.security.twoFactorEnabled ? 'bg-dawn-500' : 'bg-onyx-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.security.twoFactorEnabled ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>

              {/* 세션 타임아웃 */}
              <div>
                <label className="block text-sm font-medium text-onyx-300 mb-2">세션 타임아웃 (분)</label>
                <select
                  value={settings.security.sessionTimeout}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, sessionTimeout: Number(e.target.value) },
                  })}
                  className="px-4 py-2 bg-onyx-800 border border-onyx-700 rounded-lg text-onyx-100"
                >
                  <option value={15}>15분</option>
                  <option value={30}>30분</option>
                  <option value={60}>1시간</option>
                  <option value={120}>2시간</option>
                  <option value={480}>8시간</option>
                </select>
              </div>
            </div>
          </div>

          {/* 비밀번호 변경 */}
          {user?.provider !== 'google' && user?.provider !== 'github' && (
            <div className="bg-onyx-900 rounded-xl border border-onyx-800 p-6">
              <h2 className="text-lg font-semibold text-onyx-100 mb-4">비밀번호 변경</h2>
              <p className="text-sm text-onyx-400 mb-4">정기적으로 비밀번호를 변경하여 계정을 안전하게 보호하세요.</p>
              <button className="px-4 py-2 bg-onyx-800 border border-onyx-700 text-onyx-200 rounded-lg hover:bg-onyx-700 transition-colors">
                비밀번호 변경
              </button>
            </div>
          )}
        </div>
      )}

      {/* API 키 탭 */}
      {activeTab === 'api' && (
        <div className="space-y-6">
          {/* 새 API 키 생성 */}
          <div className="bg-onyx-900 rounded-xl border border-onyx-800 p-6">
            <h2 className="text-lg font-semibold text-onyx-100 mb-4">새 API 키 생성</h2>
            
            <div className="flex gap-3">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="API 키 이름 (예: 개발용)"
                className="flex-1 px-4 py-2 bg-onyx-800 border border-onyx-700 rounded-lg text-onyx-100 placeholder-onyx-500"
              />
              <button
                onClick={generateApiKey}
                disabled={!newKeyName.trim()}
                className="px-6 py-2 bg-dawn-500 text-onyx-950 font-semibold rounded-lg hover:bg-dawn-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                생성
              </button>
            </div>

            {/* 생성된 키 표시 */}
            {generatedKey && (
              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">API 키가 생성되었습니다</span>
                </div>
                <p className="text-sm text-onyx-400 mb-2">이 키는 다시 표시되지 않으니 안전한 곳에 저장하세요.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-4 py-2 bg-onyx-800 rounded-lg text-sm text-onyx-200 font-mono">
                    {generatedKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(generatedKey)}
                    className="px-3 py-2 bg-onyx-700 text-onyx-200 rounded-lg hover:bg-onyx-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* API 키 목록 */}
          <div className="bg-onyx-900 rounded-xl border border-onyx-800">
            <div className="p-6 border-b border-onyx-800">
              <h2 className="text-lg font-semibold text-onyx-100">API 키 목록</h2>
              <p className="text-sm text-onyx-400 mt-1">생성된 API 키를 관리합니다</p>
            </div>
            
            {/* 에러 표시 */}
            {apiError && (
              <div className="p-4 bg-red-500/10 border-b border-onyx-800">
                <p className="text-sm text-red-400">{apiError}</p>
              </div>
            )}

            {/* 로딩 표시 */}
            {apiLoading && (
              <div className="p-6 flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-dawn-500"></div>
              </div>
            )}
            
            {!apiLoading && apiKeys.length === 0 ? (
              <div className="p-12 text-center text-onyx-500">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <p>생성된 API 키가 없습니다</p>
              </div>
            ) : !apiLoading && (
              <div className="divide-y divide-onyx-800">
                {apiKeys.map((key) => (
                  <div key={key.id} className="p-6 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-onyx-100">{key.name}</h3>
                        <code className="text-xs px-2 py-1 bg-onyx-800 rounded text-onyx-400 font-mono">
                          {key.key_prefix}
                        </code>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-onyx-400">
                        <span>생성: {new Date(key.created_at).toLocaleDateString('ko-KR')}</span>
                        <span>마지막 사용: {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString('ko-KR') : '없음'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteApiKey(key.id)}
                      disabled={apiLoading}
                      className="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 저장 버튼 */}
      {(activeTab === 'profile' || activeTab === 'notifications' || activeTab === 'security') && (
        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-dawn-500 to-dawn-600 text-onyx-950 font-semibold rounded-lg hover:from-dawn-400 hover:to-dawn-500 disabled:opacity-50 transition-all"
          >
            {saving ? '저장 중...' : '변경사항 저장'}
          </button>
        </div>
      )}
    </div>
  );
}
