'use client';

const recentActivity = [
  {
    id: 1,
    agent: 'GPT-4',
    provider: 'OpenAI',
    action: 'search',
    endpoint: '/api/agent/search',
    status: 'success',
    responseTime: '32ms',
    timestamp: '2분 전',
  },
  {
    id: 2,
    agent: 'Claude-3',
    provider: 'Anthropic',
    action: 'view',
    endpoint: '/api/agent/items/123',
    status: 'success',
    responseTime: '45ms',
    timestamp: '5분 전',
  },
  {
    id: 3,
    agent: 'Custom Bot',
    provider: 'Custom',
    action: 'purchase',
    endpoint: '/api/agent/orders',
    status: 'error',
    responseTime: '120ms',
    timestamp: '8분 전',
  },
  {
    id: 4,
    agent: 'Gemini',
    provider: 'Google',
    action: 'extract',
    endpoint: '/api/agent/extract',
    status: 'success',
    responseTime: '89ms',
    timestamp: '12분 전',
  },
  {
    id: 5,
    agent: 'GPT-4',
    provider: 'OpenAI',
    action: 'addToCart',
    endpoint: '/api/agent/cart',
    status: 'success',
    responseTime: '28ms',
    timestamp: '15분 전',
  },
];

const providerColors: Record<string, string> = {
  OpenAI: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Anthropic: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  Google: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Custom: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export default function RecentActivityTable() {
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
            {recentActivity.map((activity) => (
              <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.agent}
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${providerColors[activity.provider]}`}>
                        {activity.provider}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {activity.action}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {activity.endpoint}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span
                    className={`agent-badge ${
                      activity.status === 'success'
                        ? 'agent-badge-success'
                        : 'agent-badge-error'
                    }`}
                  >
                    {activity.status === 'success' ? '성공' : '실패'}
                  </span>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {activity.responseTime}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {activity.timestamp}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
