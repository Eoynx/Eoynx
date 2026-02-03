import { Metadata } from 'next';
import DashboardNav from '@/components/dashboard/DashboardNav';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

export const metadata: Metadata = {
  title: 'Dashboard | Eoynx',
  description: 'Eoynx AI 에이전트 관리 대시보드',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-onyx-950">
      <DashboardNav />
      <div className="lg:pl-64">
        <DashboardHeader />
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
