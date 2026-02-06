'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardIcon } from '@/components/brand/FeatureIcons';

interface Service {
  id: string;
  slug: string;
  name: string;
  name_ko?: string;
  description: string;
  homepage: string;
  api_base: string;
  created_at: string;
}

export default function MyServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/services?my=true');
      const data = await response.json();
      
      if (data.success) {
        setServices(data.services || []);
      } else {
        setError(data.error || '서비스 목록을 불러오는데 실패했습니다.');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 서비스를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/services?id=${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setServices(services.filter(s => s.id !== id));
      } else {
        const data = await response.json();
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-onyx-100 flex items-center gap-2">
            <DashboardIcon className="w-7 h-7 text-dawn-500" />
            내 서비스
          </h1>
          <p className="mt-1 text-sm text-onyx-400">
            등록한 서비스를 관리합니다.
          </p>
        </div>
        <Link
          href="/dashboard/services"
          className="px-4 py-2 bg-gradient-to-r from-dawn-500 to-dawn-600 text-white font-medium rounded-lg hover:from-dawn-400 hover:to-dawn-500 transition-all"
        >
          + 새 서비스 등록
        </Link>
      </div>

      {/* 서비스 목록 */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-onyx-900/50 border border-onyx-800 rounded-xl p-6 animate-pulse">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-6 bg-onyx-700 rounded w-48" />
                  <div className="h-4 bg-onyx-700 rounded w-96" />
                </div>
                <div className="h-8 bg-onyx-700 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button 
            onClick={fetchServices}
            className="mt-2 text-sm text-dawn-400 hover:text-dawn-300"
          >
            다시 시도
          </button>
        </div>
      ) : services.length === 0 ? (
        <div className="bg-onyx-900/50 border border-onyx-800 rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">
            <svg className="w-12 h-12 mx-auto text-onyx-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-onyx-200 mb-2">등록된 서비스가 없습니다</h3>
          <p className="text-onyx-400 mb-6">첫 번째 서비스를 등록해보세요!</p>
          <Link
            href="/dashboard/services"
            className="inline-block px-6 py-3 bg-gradient-to-r from-dawn-500 to-dawn-600 text-white font-medium rounded-lg hover:from-dawn-400 hover:to-dawn-500 transition-all"
          >
            서비스 등록하기
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-onyx-900/50 border border-onyx-800 rounded-xl p-6 hover:border-onyx-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-onyx-100">
                      {service.name}
                      {service.name_ko && (
                        <span className="text-onyx-400 text-sm ml-2">({service.name_ko})</span>
                      )}
                    </h3>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                      활성
                    </span>
                  </div>
                  <p className="text-sm text-onyx-400 mb-3 line-clamp-2">{service.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-onyx-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      {service.api_base}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(service.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Link
                    href={`/dashboard/services?edit=${service.id}`}
                    className="px-3 py-1.5 text-sm bg-onyx-800 text-onyx-300 hover:text-onyx-100 rounded-lg transition-colors"
                  >
                    수정
                  </Link>
                  <a
                    href={`/s/${service.slug}`}
                    target="_blank"
                    className="px-3 py-1.5 text-sm bg-onyx-800 text-onyx-300 hover:text-onyx-100 rounded-lg transition-colors"
                  >
                    미리보기
                  </a>
                  <button
                    onClick={() => navigator.clipboard.writeText(`https://eoynx.com/s/${service.slug}`)}
                    className="px-3 py-1.5 text-sm bg-onyx-800 text-onyx-300 hover:text-onyx-100 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    URL 복사
                  </button>
                  <button
                    onClick={() => handleDelete(service.id, service.name)}
                    disabled={deletingId === service.id}
                    className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deletingId === service.id ? '삭제 중...' : '삭제'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 사용량 정보 */}
      <div className="bg-onyx-900/50 border border-onyx-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-onyx-300 mb-3">사용량</h3>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-onyx-100">{services.length}</span>
            <span className="text-onyx-400 text-sm ml-1">/ 5 서비스</span>
          </div>
          <div className="text-xs text-onyx-500">
            Free Tier
          </div>
        </div>
        <div className="mt-3 w-full bg-onyx-700 rounded-full h-2">
          <div 
            className="bg-dawn-500 h-2 rounded-full transition-all"
            style={{ width: `${Math.min((services.length / 5) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
