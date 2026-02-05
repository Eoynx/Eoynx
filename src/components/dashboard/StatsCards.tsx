'use client';

import { useEffect, useState } from 'react';

interface StatItem {
  name: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
}

interface DashboardStats {
  todayRequests: { value: number; change: number; changeType: 'positive' | 'negative' | 'neutral' };
  activeAgents: { value: number; change: number; changeType: 'positive' | 'negative' | 'neutral' };
  avgResponseTime: { value: number; change: number; changeType: 'positive' | 'negative' | 'neutral' };
  errorRate: { value: number; change: number; changeType: 'positive' | 'negative' | 'neutral' };
}

const ICONS = {
  requests: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  agents: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  responseTime: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  errorRate: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR');
}

function formatChange(value: number, suffix: string = '%'): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value}${suffix}`;
}

export default function StatsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/dashboard/stats');
        const data = await response.json();
        
        if (data.success) {
          setStats(data.data);
        } else {
          setError(data.error?.message || 'Failed to load stats');
        }
      } catch (err) {
        setError('네트워크 오류');
        console.error('Stats fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    
    // 30초마다 갱신
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const statItems: StatItem[] = stats ? [
    {
      name: '오늘 요청 수',
      value: formatNumber(stats.todayRequests.value),
      change: formatChange(stats.todayRequests.change),
      changeType: stats.todayRequests.changeType,
      icon: ICONS.requests,
    },
    {
      name: '활성 에이전트',
      value: formatNumber(stats.activeAgents.value),
      change: formatChange(stats.activeAgents.change, ''),
      changeType: stats.activeAgents.changeType,
      icon: ICONS.agents,
    },
    {
      name: '평균 응답 시간',
      value: `${stats.avgResponseTime.value}ms`,
      change: formatChange(stats.avgResponseTime.change, 'ms'),
      changeType: stats.avgResponseTime.changeType,
      icon: ICONS.responseTime,
    },
    {
      name: '에러율',
      value: `${stats.errorRate.value}%`,
      change: formatChange(stats.errorRate.change, '%'),
      changeType: stats.errorRate.changeType,
      icon: ICONS.errorRate,
    },
  ] : [];

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="agent-card animate-pulse">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="ml-4 flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2" />
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="agent-card">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <svg className="w-12 h-12 text-onyx-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-onyx-400 mb-2">통계를 불러올 수 없습니다</p>
          <p className="text-xs text-onyx-500">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-3 text-xs text-dawn-500 hover:text-dawn-400"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  // 데이터가 없거나 모두 0인 경우
  const hasNoData = !stats || (
    stats.todayRequests.value === 0 &&
    stats.activeAgents.value === 0 &&
    stats.avgResponseTime.value === 0
  );

  if (hasNoData) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { name: '오늘 요청 수', icon: ICONS.requests },
          { name: '활성 에이전트', icon: ICONS.agents },
          { name: '평균 응답 시간', icon: ICONS.responseTime },
          { name: '에러율', icon: ICONS.errorRate },
        ].map((item) => (
          <div key={item.name} className="agent-card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-onyx-500">{item.icon}</span>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-onyx-400 truncate">{item.name}</p>
                <p className="text-lg font-semibold text-onyx-500">데이터 없음</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statItems.map((stat) => (
        <div
          key={stat.name}
          className="agent-card"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-dawn-500">
                {stat.icon}
              </span>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-onyx-400 truncate">
                {stat.name}
              </p>
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-onyx-100">
                  {stat.value}
                </p>
                <p
                  className={`ml-2 flex items-baseline text-sm font-semibold ${
                    stat.changeType === 'positive'
                      ? 'text-green-400'
                      : stat.changeType === 'negative'
                      ? 'text-red-400'
                      : 'text-gray-400'
                  }`}
                >
                  {stat.change}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
