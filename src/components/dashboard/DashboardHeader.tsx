'use client';

import { SunriseIcon } from '@/components/brand/EoynxLogo';

export default function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 bg-onyx-900 border-b border-onyx-800">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* 모바일 로고 */}
        <div className="lg:hidden flex items-center gap-1">
          <SunriseIcon size={20} className="text-dawn-500" />
          <span className="text-lg font-bold">
            <span className="text-dawn-500">E</span>
            <span className="text-onyx-100">o</span>
          </span>
        </div>

        {/* 검색 */}
        <div className="flex-1 max-w-md mx-4 lg:mx-0">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="w-5 h-5 text-onyx-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="에이전트, 로그 검색..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-onyx-700 bg-onyx-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-dawn-500 focus:border-transparent text-onyx-100 placeholder-onyx-500"
            />
          </div>
        </div>

        {/* 우측 액션들 */}
        <div className="flex items-center space-x-4">
          {/* 알림 */}
          <button className="relative p-2 text-onyx-400 hover:text-onyx-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {/* 알림 뱃지 */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-dawn-500 rounded-full"></span>
          </button>

          {/* API 상태 */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-green-900/30 border border-green-700/50 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-medium text-green-400">API 정상</span>
          </div>

          {/* 프로필 */}
          <button className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-dawn-500 to-dawn-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              A
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
