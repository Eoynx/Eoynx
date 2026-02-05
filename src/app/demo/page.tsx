'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SunriseIcon } from '@/components/brand/EoynxLogo';

// 데모용 고정 데이터
const DEMO_STATS = [
  { label: '오늘 요청', value: '12,847', change: '+12.5%', changeType: 'positive' },
  { label: '활성 에이전트', value: '156', change: '+8', changeType: 'positive' },
  { label: '평균 응답시간', value: '45ms', change: '-5ms', changeType: 'positive' },
  { label: '에러율', value: '0.12%', change: '-0.03%', changeType: 'positive' },
];

const DEMO_AGENTS = [
  { id: 1, name: 'GPT-4 Shopping Assistant', provider: 'openai', status: 'active', requests: '3,421' },
  { id: 2, name: 'Claude Order Manager', provider: 'anthropic', status: 'active', requests: '2,156' },
  { id: 3, name: 'Gemini Search Bot', provider: 'google', status: 'active', requests: '1,892' },
  { id: 4, name: 'Custom Inventory Agent', provider: 'custom', status: 'pending', requests: '534' },
];

const DEMO_ACTIVITY = [
  { time: '방금 전', agent: 'GPT-4 Shopping', action: '상품 검색', status: 'success' },
  { time: '1분 전', agent: 'Claude Order', action: '장바구니 추가', status: 'success' },
  { time: '2분 전', agent: 'Gemini Search', action: '카테고리 조회', status: 'success' },
  { time: '3분 전', agent: 'GPT-4 Shopping', action: '주문 생성', status: 'success' },
  { time: '5분 전', agent: 'Custom Agent', action: '재고 확인', status: 'pending' },
];

const DEMO_CHART_DATA = [
  { time: '00:00', openai: 120, anthropic: 80, google: 60, other: 20 },
  { time: '04:00', openai: 80, anthropic: 60, google: 40, other: 15 },
  { time: '08:00', openai: 200, anthropic: 150, google: 100, other: 40 },
  { time: '12:00', openai: 350, anthropic: 280, google: 180, other: 60 },
  { time: '16:00', openai: 420, anthropic: 320, google: 220, other: 80 },
  { time: '20:00', openai: 280, anthropic: 200, google: 140, other: 50 },
];

export default function DemoPage() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-500' : status === 'pending' ? 'bg-yellow-500' : 'bg-gray-500';
  };

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      openai: 'bg-emerald-500/20 text-emerald-400',
      anthropic: 'bg-orange-500/20 text-orange-400',
      google: 'bg-blue-500/20 text-blue-400',
      custom: 'bg-purple-500/20 text-purple-400',
    };
    return colors[provider] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-onyx-950 via-onyx-900 to-onyx-950">
      {/* 데모 배너 */}
      <div className="bg-gradient-to-r from-dawn-500 to-purple-500 text-white text-center py-2 text-sm">
        🎯 데모 모드로 보고 있습니다. 실제 데이터를 사용하려면{' '}
        <Link href="/login" className="underline font-semibold hover:text-white/90">
          로그인
        </Link>
        하세요.
      </div>

      {/* 헤더 */}
      <header className="border-b border-onyx-800 bg-onyx-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SunriseIcon className="w-8 h-8 text-dawn-500" />
            <span className="text-xl font-bold text-white">Eoynx</span>
            <span className="px-2 py-0.5 bg-dawn-500/20 text-dawn-400 text-xs rounded-full">Demo</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-onyx-400">
              {currentTime.toLocaleString('ko-KR')}
            </span>
            <Link
              href="/login"
              className="px-4 py-2 bg-dawn-500 hover:bg-dawn-400 text-white rounded-lg transition-colors text-sm font-medium"
            >
              로그인
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* 타이틀 */}
        <div>
          <h1 className="text-3xl font-bold text-white">대시보드 데모</h1>
          <p className="text-onyx-400 mt-1">AI 에이전트 게이트웨이의 실시간 모니터링 예시</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {DEMO_STATS.map((stat, index) => (
            <div
              key={index}
              className="bg-onyx-900/50 border border-onyx-800 rounded-xl p-6 hover:border-onyx-700 transition-colors"
            >
              <p className="text-onyx-400 text-sm">{stat.label}</p>
              <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
              <p className={`text-sm mt-2 ${stat.changeType === 'positive' ? 'text-green-400' : 'text-red-400'}`}>
                {stat.change} vs 어제
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 차트 영역 */}
          <div className="lg:col-span-2 bg-onyx-900/50 border border-onyx-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">요청 트래픽</h2>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-dawn-500/20 text-dawn-400 rounded-lg text-sm">오늘</span>
                <span className="px-3 py-1 bg-onyx-800 text-onyx-400 rounded-lg text-sm">이번 주</span>
                <span className="px-3 py-1 bg-onyx-800 text-onyx-400 rounded-lg text-sm">이번 달</span>
              </div>
            </div>
            
            {/* 간단한 막대 차트 시각화 */}
            <div className="h-64 flex items-end justify-around gap-4">
              {DEMO_CHART_DATA.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col gap-1">
                    <div 
                      className="w-full bg-emerald-500/60 rounded-t"
                      style={{ height: `${data.openai / 5}px` }}
                    />
                    <div 
                      className="w-full bg-orange-500/60"
                      style={{ height: `${data.anthropic / 5}px` }}
                    />
                    <div 
                      className="w-full bg-blue-500/60"
                      style={{ height: `${data.google / 5}px` }}
                    />
                    <div 
                      className="w-full bg-purple-500/60 rounded-b"
                      style={{ height: `${data.other / 5}px` }}
                    />
                  </div>
                  <span className="text-xs text-onyx-500">{data.time}</span>
                </div>
              ))}
            </div>
            
            {/* 범례 */}
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded" />
                <span className="text-xs text-onyx-400">OpenAI</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded" />
                <span className="text-xs text-onyx-400">Anthropic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-xs text-onyx-400">Google</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded" />
                <span className="text-xs text-onyx-400">Other</span>
              </div>
            </div>
          </div>

          {/* 최근 활동 */}
          <div className="bg-onyx-900/50 border border-onyx-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">최근 활동</h2>
            <div className="space-y-4">
              {DEMO_ACTIVITY.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <div className={`w-2 h-2 rounded-full ${activity.status === 'success' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <div className="flex-1">
                    <p className="text-onyx-200">{activity.agent}</p>
                    <p className="text-onyx-500 text-xs">{activity.action}</p>
                  </div>
                  <span className="text-onyx-500 text-xs">{activity.time}</span>
                </div>
              ))}
            </div>
            <Link
              href="/login"
              className="mt-4 block text-center text-sm text-dawn-400 hover:text-dawn-300"
            >
              전체 로그 보기 →
            </Link>
          </div>
        </div>

        {/* 에이전트 목록 */}
        <div className="bg-onyx-900/50 border border-onyx-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-onyx-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">등록된 에이전트</h2>
            <Link
              href="/login"
              className="px-4 py-2 bg-dawn-500/20 hover:bg-dawn-500/30 text-dawn-400 rounded-lg transition-colors text-sm"
            >
              + 에이전트 등록
            </Link>
          </div>
          <table className="w-full">
            <thead className="bg-onyx-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-onyx-400 uppercase">에이전트</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-onyx-400 uppercase">프로바이더</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-onyx-400 uppercase">상태</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-onyx-400 uppercase">오늘 요청</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-onyx-400 uppercase">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-onyx-800">
              {DEMO_AGENTS.map((agent) => (
                <tr key={agent.id} className="hover:bg-onyx-800/30">
                  <td className="px-6 py-4">
                    <span className="text-white font-medium">{agent.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${getProviderColor(agent.provider)}`}>
                      {agent.provider}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
                      <span className="text-onyx-300 text-sm capitalize">{agent.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-onyx-300">{agent.requests}</td>
                  <td className="px-6 py-4">
                    <button className="text-onyx-500 hover:text-onyx-300 text-sm">
                      상세보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CTA 섹션 */}
        <div className="bg-gradient-to-r from-dawn-500/10 to-purple-500/10 border border-dawn-500/20 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">지금 바로 시작하세요</h2>
          <p className="text-onyx-400 mb-6">
            무료로 시작하고, 실제 AI 에이전트와 연동해보세요.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/login"
              className="px-6 py-3 bg-dawn-500 hover:bg-dawn-400 text-white rounded-lg font-semibold transition-colors"
            >
              무료로 시작하기
            </Link>
            <Link
              href="/"
              className="px-6 py-3 bg-onyx-800 hover:bg-onyx-700 text-white rounded-lg font-semibold transition-colors"
            >
              더 알아보기
            </Link>
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="border-t border-onyx-800 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-onyx-500 text-sm">
          © 2024 Eoynx. AI 에이전트를 위한 표준 인터페이스.
        </div>
      </footer>
    </div>
  );
}
