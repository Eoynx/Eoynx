'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { SunriseIcon } from '@/components/brand/EoynxLogo';

interface ServiceData {
  id: string;
  slug: string;
  name: string;
  name_ko?: string;
  description: string;
  description_ko?: string;
  homepage: string;
  api_base: string;
  endpoints: {
    id: string;
    path: string;
    method: string;
    description: string;
    auth: boolean;
    params: string;
  }[];
  auth_type: string;
  rate_limit: string;
  contact_email: string;
  ai_txt?: string;
  json_ld?: object;
  created_at: string;
}

interface ProductPageConfig {
  urlPattern?: string;
  sampleUrl?: string;
  dataSource?: string;
  selectors?: {
    title?: string;
    price?: string;
    currency?: string;
    image?: string;
    description?: string;
    sku?: string;
    brand?: string;
    availability?: string;
    rating?: string;
    reviewCount?: string;
  };
  notes?: string;
}

export default function ServicePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [service, setService] = useState<ServiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'ai.txt' | 'json-ld'>('overview');

  useEffect(() => {
    async function fetchService() {
      try {
        const response = await fetch(`/api/services?slug=${slug}`);
        const data = await response.json();
        
        if (data.success && data.service) {
          setService(data.service);
        } else {
          setError('서비스를 찾을 수 없습니다.');
        }
      } catch {
        setError('서비스 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchService();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-onyx-900 via-onyx-800 to-onyx-900 flex items-center justify-center">
        <div className="text-center">
          <SunriseIcon size={48} className="text-dawn-500 mx-auto mb-4 animate-pulse" />
          <p className="text-onyx-400">서비스 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-onyx-900 via-onyx-800 to-onyx-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-onyx-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h1 className="text-2xl font-bold text-onyx-100 mb-2">서비스를 찾을 수 없습니다</h1>
          <p className="text-onyx-400 mb-6">{error || '요청하신 서비스가 존재하지 않습니다.'}</p>
          <Link href="/" className="text-dawn-400 hover:text-dawn-300">
            ← 홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-onyx-900 via-onyx-800 to-onyx-900">
      {/* 헤더 */}
      <header className="border-b border-onyx-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <SunriseIcon size={24} className="text-dawn-500" />
            <span className="text-lg font-bold">
              <span className="text-dawn-500">E</span>
              <span className="text-onyx-100">oynx</span>
            </span>
          </Link>
          <a
            href={service.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-dawn-400 hover:text-dawn-300"
          >
            서비스 홈페이지 →
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* 서비스 정보 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-onyx-100 mb-2">
            {service.name}
            {service.name_ko && <span className="text-onyx-400 text-xl ml-2">({service.name_ko})</span>}
          </h1>
          <p className="text-onyx-300">{service.description}</p>
          {service.description_ko && (
            <p className="text-onyx-400 text-sm mt-1">{service.description_ko}</p>
          )}
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-6 border-b border-onyx-800">
          {(['overview', 'ai.txt', 'json-ld'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-dawn-400 border-b-2 border-dawn-400'
                  : 'text-onyx-400 hover:text-onyx-200'
              }`}
            >
              {tab === 'overview' ? '개요' : tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 기본 정보 */}
            <div className="bg-onyx-900/50 border border-onyx-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-onyx-100 mb-4">기본 정보</h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-onyx-500">API Base URL</dt>
                  <dd className="text-onyx-200 font-mono text-sm">{service.api_base}</dd>
                </div>
                <div>
                  <dt className="text-sm text-onyx-500">인증 방식</dt>
                  <dd className="text-onyx-200">
                    {service.auth_type === 'none' ? '인증 없음' :
                     service.auth_type === 'api_key' ? 'API Key' :
                     service.auth_type === 'jwt' ? 'JWT' : 'OAuth 2.0'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-onyx-500">Rate Limit</dt>
                  <dd className="text-onyx-200">{service.rate_limit}</dd>
                </div>
                <div>
                  <dt className="text-sm text-onyx-500">문의</dt>
                  <dd className="text-dawn-400">{service.contact_email}</dd>
                </div>
              </dl>
            </div>

            {/* 엔드포인트 */}
            <div className="bg-onyx-900/50 border border-onyx-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-onyx-100 mb-4">API 엔드포인트</h2>
              <div className="space-y-3">
                {service.endpoints.map((ep, i) => (
                  <div key={ep.id || i} className="flex items-start gap-3 p-3 bg-onyx-800/50 rounded-lg">
                    <span className={`px-2 py-1 text-xs font-mono rounded ${
                      ep.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                      ep.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                      ep.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {ep.method}
                    </span>
                    <div className="flex-1">
                      <div className="font-mono text-sm text-onyx-200">{ep.path}</div>
                      {ep.description && <div className="text-xs text-onyx-400 mt-1">{ep.description}</div>}
                    </div>
                    {ep.auth && (
                      <span className="text-xs bg-dawn-500/20 text-dawn-400 px-2 py-1 rounded flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        인증필요
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 상품 페이지 파싱 정보 */}
            {(() => {
              const jsonLd = service.json_ld as Record<string, unknown> | undefined;
              const additional = (jsonLd?.additionalProperty as Array<Record<string, unknown>>) || [];
              const productProperty = additional.find((item) => item?.name === 'productPage');
              const productPage = (productProperty?.value as ProductPageConfig | undefined) || undefined;

              if (!productPage) return null;

              const selectors = productPage.selectors || {};

              return (
                <div className="bg-onyx-900/50 border border-onyx-800 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-onyx-100 mb-4">상품 페이지 파싱 정보</h2>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {productPage.urlPattern && (
                      <div>
                        <dt className="text-sm text-onyx-500">URL 패턴</dt>
                        <dd className="text-onyx-200 font-mono text-sm">{productPage.urlPattern}</dd>
                      </div>
                    )}
                    {productPage.sampleUrl && (
                      <div>
                        <dt className="text-sm text-onyx-500">예시 URL</dt>
                        <dd className="text-dawn-400 text-sm break-all">{productPage.sampleUrl}</dd>
                      </div>
                    )}
                    {productPage.dataSource && (
                      <div>
                        <dt className="text-sm text-onyx-500">데이터 소스</dt>
                        <dd className="text-onyx-200 text-sm">{productPage.dataSource}</dd>
                      </div>
                    )}
                  </dl>

                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {selectors.title && (
                      <div>
                        <span className="text-onyx-500">상품명</span>
                        <div className="text-onyx-200 font-mono">{selectors.title}</div>
                      </div>
                    )}
                    {selectors.price && (
                      <div>
                        <span className="text-onyx-500">가격</span>
                        <div className="text-onyx-200 font-mono">{selectors.price}</div>
                      </div>
                    )}
                    {selectors.currency && (
                      <div>
                        <span className="text-onyx-500">통화</span>
                        <div className="text-onyx-200 font-mono">{selectors.currency}</div>
                      </div>
                    )}
                    {selectors.image && (
                      <div>
                        <span className="text-onyx-500">이미지</span>
                        <div className="text-onyx-200 font-mono">{selectors.image}</div>
                      </div>
                    )}
                    {selectors.description && (
                      <div>
                        <span className="text-onyx-500">설명</span>
                        <div className="text-onyx-200 font-mono">{selectors.description}</div>
                      </div>
                    )}
                    {selectors.sku && (
                      <div>
                        <span className="text-onyx-500">SKU</span>
                        <div className="text-onyx-200 font-mono">{selectors.sku}</div>
                      </div>
                    )}
                    {selectors.brand && (
                      <div>
                        <span className="text-onyx-500">브랜드</span>
                        <div className="text-onyx-200 font-mono">{selectors.brand}</div>
                      </div>
                    )}
                    {selectors.availability && (
                      <div>
                        <span className="text-onyx-500">재고 상태</span>
                        <div className="text-onyx-200 font-mono">{selectors.availability}</div>
                      </div>
                    )}
                    {selectors.rating && (
                      <div>
                        <span className="text-onyx-500">평점</span>
                        <div className="text-onyx-200 font-mono">{selectors.rating}</div>
                      </div>
                    )}
                    {selectors.reviewCount && (
                      <div>
                        <span className="text-onyx-500">리뷰 수</span>
                        <div className="text-onyx-200 font-mono">{selectors.reviewCount}</div>
                      </div>
                    )}
                  </div>

                  {productPage.notes && (
                    <div className="mt-5 text-sm text-onyx-300">
                      <span className="text-onyx-500">메모:</span> {productPage.notes}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'ai.txt' && service.ai_txt && (
          <div className="bg-onyx-900/50 border border-onyx-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-onyx-100">ai.txt</h2>
              <button
                onClick={() => navigator.clipboard.writeText(service.ai_txt || '')}
                className="flex items-center gap-1 text-sm text-dawn-400 hover:text-dawn-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                복사
              </button>
            </div>
            <pre className="text-sm text-onyx-300 font-mono whitespace-pre-wrap bg-onyx-800 p-4 rounded-lg overflow-auto max-h-[600px]">
              {service.ai_txt}
            </pre>
          </div>
        )}

        {activeTab === 'json-ld' && service.json_ld && (
          <div className="bg-onyx-900/50 border border-onyx-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-onyx-100">JSON-LD</h2>
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(service.json_ld, null, 2))}
                className="flex items-center gap-1 text-sm text-dawn-400 hover:text-dawn-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                복사
              </button>
            </div>
            <pre className="text-sm text-onyx-300 font-mono whitespace-pre-wrap bg-onyx-800 p-4 rounded-lg overflow-auto max-h-[600px]">
              {JSON.stringify(service.json_ld, null, 2)}
            </pre>
          </div>
        )}
      </main>

      {/* 푸터 */}
      <footer className="border-t border-onyx-800 mt-12 py-6">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-onyx-500">
          <p>Powered by <Link href="/" className="text-dawn-400 hover:text-dawn-300">Eoynx Agent Gateway</Link></p>
        </div>
      </footer>
    </div>
  );
}
