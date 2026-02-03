'use client';

// 간단한 차트 컴포넌트 (실제로는 Chart.js나 Recharts 사용)
const chartData = [
  { hour: '00', openai: 120, anthropic: 80, google: 45, other: 20 },
  { hour: '04', openai: 85, anthropic: 60, google: 30, other: 15 },
  { hour: '08', openai: 250, anthropic: 180, google: 90, other: 40 },
  { hour: '12', openai: 420, anthropic: 300, google: 150, other: 70 },
  { hour: '16', openai: 380, anthropic: 270, google: 120, other: 55 },
  { hour: '20', openai: 290, anthropic: 200, google: 100, other: 45 },
];

const maxValue = Math.max(...chartData.flatMap(d => [d.openai, d.anthropic, d.google, d.other]));

export default function AgentChart() {
  return (
    <div className="agent-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          시간대별 요청 추이
        </h3>
        <select className="text-sm border border-gray-300 rounded-lg px-2 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          <option>오늘</option>
          <option>이번 주</option>
          <option>이번 달</option>
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

      {/* 간단한 바 차트 */}
      <div className="space-y-3">
        {chartData.map((data) => (
          <div key={data.hour} className="flex items-center">
            <span className="w-8 text-xs text-gray-500 dark:text-gray-400">
              {data.hour}시
            </span>
            <div className="flex-1 flex h-6 gap-0.5 ml-2">
              <div
                className="bg-green-500 rounded-l transition-all"
                style={{ width: `${(data.openai / maxValue) * 100}%` }}
                title={`OpenAI: ${data.openai}`}
              />
              <div
                className="bg-purple-500 transition-all"
                style={{ width: `${(data.anthropic / maxValue) * 100}%` }}
                title={`Anthropic: ${data.anthropic}`}
              />
              <div
                className="bg-blue-500 transition-all"
                style={{ width: `${(data.google / maxValue) * 100}%` }}
                title={`Google: ${data.google}`}
              />
              <div
                className="bg-gray-400 rounded-r transition-all"
                style={{ width: `${(data.other / maxValue) * 100}%` }}
                title={`기타: ${data.other}`}
              />
            </div>
            <span className="w-16 text-right text-xs text-gray-500 dark:text-gray-400 ml-2">
              {data.openai + data.anthropic + data.google + data.other}
            </span>
          </div>
        ))}
      </div>

      {/* 요약 */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">2,485</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">오늘 총 요청</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">47ms</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">평균 응답 시간</p>
          </div>
        </div>
      </div>
    </div>
  );
}
