'use client';

import { useEffect, useState } from 'react';

interface ChartDataPoint {
  hour: string;
  openai: number;
  anthropic: number;
  google: number;
  other: number;
  total: number;
}

interface ChartSummary {
  totalRequests: number;
  avgResponseTime: number;
  peakHour: string;
  peakCount: number;
}

interface ChartData {
  data: ChartDataPoint[];
  summary: ChartSummary;
}

export default function AgentChart() {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    async function fetchChartData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/dashboard/chart?period=${period}`);
        const data = await response.json();
        
        if (data.success) {
          setChartData(data.data);
        } else {
          setError(data.error?.message || 'Failed to load chart data');
        }
      } catch (err) {
        setError('네트워크 오류');
        console.error('Chart fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchChartData();
    
    // 1분마다 갱신
    const interval = setInterval(fetchChartData, 60000);
    return () => clearInterval(interval);
  }, [period]);

  const maxValue = chartData 
    ? Math.max(...chartData.data.flatMap(d => [d.openai, d.anthropic, d.google, d.other]))
    : 100;

  if (loading && !chartData) {
    return (
      <div className="agent-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            시간대별 요청 추이
          </h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center">
              <div className="w-8 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded ml-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !chartData) {
    return (
      <div className="agent-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-onyx-100">시간대별 요청 추이</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <svg className="w-12 h-12 text-onyx-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-onyx-400 mb-2">차트를 불러올 수 없습니다</p>
          <p className="text-xs text-onyx-500">{error}</p>
        </div>
      </div>
    );
  }

  // 데이터가 없거나 모든 값이 0인 경우
  const hasNoData = !chartData || chartData.data.every(d => d.total === 0);

  if (hasNoData) {
    return (
      <div className="agent-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-onyx-100">시간대별 요청 추이</h3>
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'today' | 'week' | 'month')}
            className="text-sm border border-onyx-700 rounded-lg px-2 py-1 bg-onyx-800 text-onyx-200"
          >
            <option value="today">오늘</option>
            <option value="week">이번 주</option>
            <option value="month">이번 달</option>
          </select>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg className="w-16 h-16 text-onyx-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-onyx-400 mb-1">아직 요청 데이터가 없습니다</p>
          <p className="text-xs text-onyx-500">API 요청이 들어오면 차트가 표시됩니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          시간대별 요청 추이
        </h3>
        <select 
          value={period}
          onChange={(e) => setPeriod(e.target.value as 'today' | 'week' | 'month')}
          className="text-sm border border-gray-300 rounded-lg px-2 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="today">오늘</option>
          <option value="week">이번 주</option>
          <option value="month">이번 달</option>
        </select>
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center">
          <span className="w-3 h-3 bg-green-500 rounded mr-2"></span>
          <span className="text-sm text-gray-600 dark:text-gray-400">OpenAI</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 bg-purple-500 rounded mr-2"></span>
          <span className="text-sm text-gray-600 dark:text-gray-400">Anthropic</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 bg-blue-500 rounded mr-2"></span>
          <span className="text-sm text-gray-600 dark:text-gray-400">Google</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 bg-gray-400 rounded mr-2"></span>
          <span className="text-sm text-gray-600 dark:text-gray-400">기타</span>
        </div>
      </div>

      {/* 바 차트 */}
      <div className="space-y-3">
        {chartData?.data.map((data) => (
          <div key={data.hour} className="flex items-center">
            <span className="w-8 text-xs text-gray-500 dark:text-gray-400">
              {data.hour}시
            </span>
            <div className="flex-1 flex h-6 gap-0.5 ml-2">
              {data.openai > 0 && (
                <div
                  className="bg-green-500 rounded-l transition-all"
                  style={{ width: `${(data.openai / maxValue) * 100}%` }}
                  title={`OpenAI: ${data.openai}`}
                />
              )}
              {data.anthropic > 0 && (
                <div
                  className="bg-purple-500 transition-all"
                  style={{ width: `${(data.anthropic / maxValue) * 100}%` }}
                  title={`Anthropic: ${data.anthropic}`}
                />
              )}
              {data.google > 0 && (
                <div
                  className="bg-blue-500 transition-all"
                  style={{ width: `${(data.google / maxValue) * 100}%` }}
                  title={`Google: ${data.google}`}
                />
              )}
              {data.other > 0 && (
                <div
                  className="bg-gray-400 rounded-r transition-all"
                  style={{ width: `${(data.other / maxValue) * 100}%` }}
                  title={`기타: ${data.other}`}
                />
              )}
              {data.total === 0 && (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded" />
              )}
            </div>
            <span className="w-16 text-right text-xs text-gray-500 dark:text-gray-400 ml-2">
              {data.total.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* 요약 */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {chartData?.summary.totalRequests.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {period === 'today' ? '오늘' : period === 'week' ? '이번 주' : '이번 달'} 총 요청
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {chartData?.summary.avgResponseTime || 0}ms
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">평균 응답 시간</p>
          </div>
        </div>
        {chartData?.summary.peakCount && chartData.summary.peakCount > 0 && (
          <div className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
            피크 시간: {chartData.summary.peakHour}시 ({chartData.summary.peakCount.toLocaleString()}건)
          </div>
        )}
      </div>
    </div>
  );
}
