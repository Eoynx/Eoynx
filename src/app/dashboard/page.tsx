import StatsCards from '@/components/dashboard/StatsCards';
import RecentActivityTable from '@/components/dashboard/RecentActivityTable';
import AgentChart from '@/components/dashboard/AgentChart';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* 페이지 제목 */}
      <div>
        <h1 className="text-2xl font-bold text-onyx-100">
          대시보드
        </h1>
        <p className="mt-1 text-sm text-onyx-400">
          AI 에이전트 접근 현황을 모니터링합니다.
        </p>
      </div>

      {/* 통계 카드 */}
      <StatsCards />

      {/* 차트 및 활동 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AgentChart />
        <RecentActivityTable />
      </div>
    </div>
  );
}
