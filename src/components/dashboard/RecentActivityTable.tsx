'use client';

import { useEffect, useState } from 'react';

interface ActivityItem {
  id: string;
  agent: string;
  provider: string;
  action: string;
  endpoint: string;
  status: 'success' | 'error' | 'pending';
  statusCode?: number;
  responseTime: string;
  timestamp: string;
  relativeTime: string;
}

const providerColors: Record<string, string> = {
  OpenAI: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Anthropic: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  Google: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Perplexity: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  Custom: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  Unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export default function RecentActivityTable() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const response = await fetch('/api/dashboard/activity?limit=5');
        const data = await response.json();
        
        if (data.success) {
          setActivities(data.data);
        } else {
          setError(data.error?.message || 'Failed to load activity');
        }
      } catch (err) {
        setError('네트워크 오류');
        console.error('Activity fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
    
    // 15초마다 갱신
    const interval = setInterval(fetchActivity, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="agent-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            최근 활동
          </h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="agent-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-onyx-100">최근 활동</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <svg className="w-12 h-12 text-onyx-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-onyx-400 mb-2">활동을 불러올 수 없습니다</p>
          <p className="text-xs text-onyx-500">{error}</p>
        </div>
      </div>
    );
  }

  // 데이터가 없는 경우
  if (activities.length === 0) {
    return (
      <div className="agent-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-onyx-100">최근 활동</h3>
          <a href="/dashboard/logs" className="text-sm text-agent-600 hover:text-agent-700 dark:text-agent-400">
            전체 보기 →
          </a>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg className="w-16 h-16 text-onyx-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-onyx-400 mb-1">아직 활동 기록이 없습니다</p>
          <p className="text-xs text-onyx-500">API 요청이 들어오면 여기에 표시됩니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          최근 활동
        </h3>
        <a
          href="/dashboard/logs"
          className="text-sm text-agent-600 hover:text-agent-700 dark:text-agent-400"
        >
          전체 보기 →
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                에이전트
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                액션
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                상태
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                시간
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {activities.map((activity) => (
              <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-agent-500 to-gateway-500 flex items-center justify-center text-white text-xs font-bold">
                      {activity.agent.charAt(0)}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.agent}
                      </p>
                      <span className={`inline-flex text-xs px-2 py-0.5 rounded-full ${providerColors[activity.provider] || providerColors.Unknown}`}>
                        {activity.provider}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <p className="text-sm text-gray-900 dark:text-white">{activity.action}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-32" title={activity.endpoint}>
                    {activity.endpoint}
                  </p>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    activity.status === 'success'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : activity.status === 'error'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {activity.status === 'success' ? '성공' : activity.status === 'error' ? '실패' : '대기'}
                    {activity.statusCode && activity.status === 'error' && (
                      <span className="ml-1">({activity.statusCode})</span>
                    )}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {activity.responseTime}
                  </p>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {activity.relativeTime}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {activities.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            최근 활동이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}