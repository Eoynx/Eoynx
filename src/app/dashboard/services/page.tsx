'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardIcon } from '@/components/brand/FeatureIcons';

interface ServiceData {
  name: string;
  nameKo: string;
  description: string;
  descriptionKo: string;
  homepage: string;
  apiBase: string;
  productPage: ProductPageConfig;
  endpoints: EndpointConfig[];
  authType: 'none' | 'api_key' | 'jwt' | 'oauth2';
  rateLimit: string;
  contactEmail: string;
}

interface ProductPageSelectors {
  title: string;
  price: string;
  currency: string;
  image: string;
  description: string;
  sku: string;
  brand: string;
  availability: string;
  rating: string;
  reviewCount: string;
}

interface ProductPageConfig {
  urlPattern: string;
  sampleUrl: string;
  dataSource: 'json-ld' | 'meta' | 'dom' | 'api';
  selectors: ProductPageSelectors;
  notes: string;
}

interface EndpointConfig {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  auth: boolean;
  params: string;
}

const defaultEndpoint: EndpointConfig = {
  id: crypto.randomUUID(),
  path: '/api/data',
  method: 'GET',
  description: '',
  auth: false,
  params: '',
};

const initialServiceData: ServiceData = {
  name: '',
  nameKo: '',
  description: '',
  descriptionKo: '',
  homepage: '',
  apiBase: '',
  productPage: {
    urlPattern: '',
    sampleUrl: '',
    dataSource: 'json-ld',
    selectors: {
      title: '',
      price: '',
      currency: '',
      image: '',
      description: '',
      sku: '',
      brand: '',
      availability: '',
      rating: '',
      reviewCount: '',
    },
    notes: '',
  },
  endpoints: [{ ...defaultEndpoint }],
  authType: 'none',
  rateLimit: '100/min',
  contactEmail: '',
};

function ServicesContent() {
  const searchParams = useSearchParams();
  const [serviceData, setServiceData] = useState<ServiceData>(initialServiceData);
  const [previewMode, setPreviewMode] = useState<'ai.txt' | 'llms.txt' | 'json-ld'>('ai.txt');
  const [isSaving, setIsSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [showAdvancedProduct, setShowAdvancedProduct] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoadingService, setIsLoadingService] = useState(false);
  const [autoUrl, setAutoUrl] = useState('');
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [isDetectingSelectors, setIsDetectingSelectors] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [sampleResult, setSampleResult] = useState<{ title?: string | null; description?: string | null; price?: string | null; image?: string | null } | null>(null);
  const [isSampleLoading, setIsSampleLoading] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [relatedLinks, setRelatedLinks] = useState<string[]>([]);
  const [isRelatedLoading, setIsRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState<string | null>(null);
  const [relatedItems, setRelatedItems] = useState<Array<{ url: string; title?: string | null; price?: string | null; image?: string | null }>>([]);
  const [isRelatedParsing, setIsRelatedParsing] = useState(false);
  const [relatedParseError, setRelatedParseError] = useState<string | null>(null);
  const [relatedLimit, setRelatedLimit] = useState(3);
  const [relatedSortBy, setRelatedSortBy] = useState<'none' | 'price-asc' | 'price-desc' | 'name'>('none');
  const [relatedSavedAt, setRelatedSavedAt] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<{ improvements: string[]; hasChanges: boolean } | null>(null);

  const updateField = <K extends keyof ServiceData>(field: K, value: ServiceData[K]) => {
    setServiceData(prev => ({ ...prev, [field]: value }));
  };

  const updateProductPageField = <K extends keyof ProductPageConfig>(field: K, value: ProductPageConfig[K]) => {
    setServiceData(prev => ({
      ...prev,
      productPage: {
        ...prev.productPage,
        [field]: value,
      },
    }));
  };

  const updateProductSelector = <K extends keyof ProductPageSelectors>(field: K, value: ProductPageSelectors[K]) => {
    setServiceData(prev => ({
      ...prev,
      productPage: {
        ...prev.productPage,
        selectors: {
          ...prev.productPage.selectors,
          [field]: value,
        },
      },
    }));
  };

  const applyProductPreset = (preset: 'json-ld' | 'dom') => {
    const selectors = preset === 'json-ld'
      ? {
          title: 'jsonld.name',
          price: 'jsonld.offers.price',
          currency: 'jsonld.offers.priceCurrency',
          image: 'jsonld.image',
          description: 'jsonld.description',
          sku: 'jsonld.sku',
          brand: 'jsonld.brand.name',
          availability: 'jsonld.offers.availability',
          rating: 'jsonld.aggregateRating.ratingValue',
          reviewCount: 'jsonld.aggregateRating.reviewCount',
        }
      : {
          title: 'h1',
          price: '[itemprop=price], .price',
          currency: '[itemprop=priceCurrency]',
          image: 'img[itemprop=image], .product-image img',
          description: '[itemprop=description], .product-description',
          sku: '[itemprop=sku], .sku',
          brand: '[itemprop=brand], .brand',
          availability: '[itemprop=availability], .availability',
          rating: '[itemprop=ratingValue], .rating',
          reviewCount: '[itemprop=reviewCount], .review-count',
        };

    setServiceData(prev => ({
      ...prev,
      productPage: {
        ...prev.productPage,
        dataSource: preset,
        selectors: {
          ...prev.productPage.selectors,
          ...selectors,
        },
      },
    }));
  };

  const addEndpoint = () => {
    setServiceData(prev => ({
      ...prev,
      endpoints: [...prev.endpoints, { ...defaultEndpoint, id: crypto.randomUUID() }],
    }));
  };

  const updateEndpoint = (id: string, field: keyof EndpointConfig, value: string | boolean) => {
    setServiceData(prev => ({
      ...prev,
      endpoints: prev.endpoints.map(ep =>
        ep.id === id ? { ...ep, [field]: value } : ep
      ),
    }));
  };

  const removeEndpoint = (id: string) => {
    setServiceData(prev => ({
      ...prev,
      endpoints: prev.endpoints.filter(ep => ep.id !== id),
    }));
  };

  const generatePreview = (): string => {
    const { name, nameKo, description, descriptionKo, homepage, apiBase, endpoints, authType, rateLimit, contactEmail, productPage } = serviceData;
    const displayName = name || nameKo || 'Your Service Name';
    const displayDescription = description || descriptionKo || 'Your service description';
    const hasProductInfo = Boolean(
      productPage.urlPattern
      || productPage.sampleUrl
      || productPage.notes
      || Object.values(productPage.selectors).some(Boolean)
    );
    
    if (previewMode === 'ai.txt') {
      return `# =============================================================================
# ${displayName} AI Interaction Specification (ai.txt)
# Generated by Eoynx Agent Gateway
# =============================================================================

[System.Context]
Name: ${displayName}
${nameKo ? `Name_KO: ${nameKo}` : ''}
Description: ${displayDescription}
${descriptionKo ? `Description_KO: ${descriptionKo}` : ''}
Homepage: ${homepage || 'https://your-domain.com'}
Contact: ${contactEmail || 'support@your-domain.com'}

[API.Base]
URL: ${apiBase || 'https://your-domain.com/api'}

[API.Endpoints]
${endpoints.map((ep, i) => `
## ${i + 1}. ${ep.description || 'Endpoint'}
Endpoint: ${ep.method} ${ep.path}
Auth: ${ep.auth ? 'Required' : 'Not Required'}
${ep.params ? `Parameters: ${ep.params}` : ''}`).join('\n')}

[Authentication.Policy]
Type: ${authType === 'none' ? 'None' : authType === 'api_key' ? 'API Key' : authType === 'jwt' ? 'JWT Bearer Token' : 'OAuth 2.0'}
${authType !== 'none' ? `Header: ${authType === 'api_key' ? 'X-API-Key' : 'Authorization: Bearer <token>'}` : ''}

[Rate.Limits]
Default: ${rateLimit}

${hasProductInfo ? `
[Product.Page]
URL_Pattern: ${productPage.urlPattern}
Sample_URL: ${productPage.sampleUrl}
Data_Source: ${productPage.dataSource}
Selectors:
  Title: ${productPage.selectors.title}
  Price: ${productPage.selectors.price}
  Currency: ${productPage.selectors.currency}
  Image: ${productPage.selectors.image}
  Description: ${productPage.selectors.description}
  SKU: ${productPage.selectors.sku}
  Brand: ${productPage.selectors.brand}
  Availability: ${productPage.selectors.availability}
  Rating: ${productPage.selectors.rating}
  ReviewCount: ${productPage.selectors.reviewCount}
${productPage.notes ? `Notes: ${productPage.notes}` : ''}
` : ''}

# Generated via https://eoynx.com
# Powered by Eoynx Agent Gateway`;
    }
    
    if (previewMode === 'llms.txt') {
      return `# ${displayName} - AI Agent Instructions
# Generated by Eoynx

## About
${displayDescription}

## API Base URL
${apiBase || 'https://your-domain.com/api'}

## Available Endpoints
${endpoints.map(ep => `
### ${ep.method} ${ep.path}
${ep.description || 'No description'}
${ep.auth ? '⚠️ Authentication required' : '✓ No authentication needed'}
${ep.params ? `Parameters: ${ep.params}` : ''}`).join('\n')}

## Authentication
${authType === 'none' ? 'No authentication required.' : 
  authType === 'api_key' ? 'Include X-API-Key header with your API key.' :
  authType === 'jwt' ? 'Include Authorization: Bearer <token> header.' :
  'Use OAuth 2.0 flow for authentication.'}

## Rate Limits
${rateLimit}

${hasProductInfo ? `## Product Page Parsing
URL Pattern: ${productPage.urlPattern}
Sample URL: ${productPage.sampleUrl}
Data Source: ${productPage.dataSource}

Selectors:
- Title: ${productPage.selectors.title}
- Price: ${productPage.selectors.price}
- Currency: ${productPage.selectors.currency}
- Image: ${productPage.selectors.image}
- Description: ${productPage.selectors.description}
- SKU: ${productPage.selectors.sku}
- Brand: ${productPage.selectors.brand}
- Availability: ${productPage.selectors.availability}
- Rating: ${productPage.selectors.rating}
- ReviewCount: ${productPage.selectors.reviewCount}

${productPage.notes ? `Notes: ${productPage.notes}
` : ''}` : ''}

## Contact
${contactEmail || 'support@your-domain.com'}

---
Generated via https://eoynx.com`;
    }
    
    // JSON-LD
    return JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebAPI',
      name: displayName,
      alternateName: nameKo || undefined,
      description: displayDescription,
      url: homepage || 'https://your-domain.com',
      documentation: `${homepage}/docs`,
      provider: {
        '@type': 'Organization',
        name: displayName,
        email: contactEmail,
      },
      endpointUrl: apiBase,
      additionalProperty: hasProductInfo ? [
        {
          '@type': 'PropertyValue',
          name: 'productPage',
          value: productPage,
        },
      ] : undefined,
      availableChannels: endpoints.map(ep => ({
        '@type': 'ServiceChannel',
        name: ep.description || ep.path,
        serviceUrl: `${apiBase}${ep.path}`,
        httpMethod: ep.method,
      })),
    }, null, 2);
  };

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleAutoFill = async () => {
    if (!autoUrl) {
      setAutoError('URL을 입력해주세요.');
      return;
    }

    setAutoError(null);
    setIsAutoLoading(true);
    try {
      const response = await fetch('/api/services/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: autoUrl }),
      });

      const data = await response.json();
      if (!response.ok || !data?.service) {
        setAutoError(data?.error || '자동 등록에 실패했습니다.');
        return;
      }

      const service = data.service;
      const hasKorean = /[가-힣]/.test(`${service.name || ''} ${service.description || ''} ${service.nameKo || ''} ${service.descriptionKo || ''}`);
      const shouldFillEnglish = !hasKorean;
      const endpoints = (service.endpoints || []).map((ep: EndpointConfig) => ({
        ...ep,
        id: ep.id || crypto.randomUUID(),
      }));

      setServiceData(prev => ({
        ...prev,
        name: shouldFillEnglish ? (service.name || prev.name) : prev.name,
        nameKo: service.nameKo || (hasKorean ? service.name : '') || prev.nameKo,
        description: shouldFillEnglish ? (service.description || prev.description) : prev.description,
        descriptionKo: service.descriptionKo || (hasKorean ? service.description : '') || prev.descriptionKo,
        homepage: service.homepage || prev.homepage,
        apiBase: service.apiBase || prev.apiBase,
        productPage: {
          ...prev.productPage,
          ...(service.productPage || {}),
          selectors: {
            ...prev.productPage.selectors,
            ...(service.productPage?.selectors || {}),
          },
        },
        endpoints: endpoints.length ? endpoints : prev.endpoints,
        authType: service.authType || prev.authType,
        rateLimit: service.rateLimit || prev.rateLimit,
        contactEmail: service.contactEmail || prev.contactEmail,
      }));

      setShowAdvancedProduct(true);
    } catch {
      setAutoError('자동 등록에 실패했습니다.');
    } finally {
      setIsAutoLoading(false);
    }
  };

  const handleDetectSelectors = async () => {
    const targetUrl = serviceData.productPage.sampleUrl || autoUrl;
    if (!targetUrl) {
      setDetectError('상품 URL을 입력해주세요.');
      return;
    }

    setDetectError(null);
    setIsDetectingSelectors(true);
    try {
      const response = await fetch('/api/services/selectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await response.json();
      if (!response.ok || !data?.productPage) {
        setDetectError(data?.error || '셀렉터 자동 탐지에 실패했습니다.');
        return;
      }

      setServiceData(prev => ({
        ...prev,
        productPage: {
          ...prev.productPage,
          ...data.productPage,
          selectors: {
            ...prev.productPage.selectors,
            ...(data.productPage.selectors || {}),
          },
        },
      }));
      setShowAdvancedProduct(true);
    } catch {
      setDetectError('셀렉터 자동 탐지에 실패했습니다.');
    } finally {
      setIsDetectingSelectors(false);
    }
  };

  const handleSampleParse = async () => {
    const targetUrl = serviceData.productPage.sampleUrl || autoUrl;
    if (!targetUrl) {
      setSampleError('상품 URL을 입력해주세요.');
      return;
    }

    setSampleError(null);
    setIsSampleLoading(true);
    try {
      const response = await fetch('/api/services/parse-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          selectors: serviceData.productPage.selectors,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.extracted) {
        setSampleError(data?.error || '샘플 파싱에 실패했습니다.');
        return;
      }

      setSampleResult({
        title: data.extracted.title,
        description: data.extracted.description,
        price: data.extracted.price,
        image: data.extracted.image,
      });
    } catch {
      setSampleError('샘플 파싱에 실패했습니다.');
    } finally {
      setIsSampleLoading(false);
    }
  };

  const handleRelatedExtract = async () => {
    const targetUrl = serviceData.productPage.sampleUrl || autoUrl;
    if (!targetUrl) {
      setRelatedError('상품 URL을 입력해주세요.');
      return;
    }

    setRelatedError(null);
    setIsRelatedLoading(true);
    try {
      const response = await fetch('/api/services/related', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await response.json();
      if (!response.ok || !data?.urls) {
        setRelatedError(data?.error || '관련 상품 추출에 실패했습니다.');
        return;
      }

      setRelatedLinks(data.urls);
    } catch {
      setRelatedError('관련 상품 추출에 실패했습니다.');
    } finally {
      setIsRelatedLoading(false);
    }
  };

  const handleRelatedParse = async () => {
    const targetUrl = serviceData.productPage.sampleUrl || autoUrl;
    if (!targetUrl) {
      setRelatedParseError('상품 URL을 입력해주세요.');
      return;
    }

    setRelatedParseError(null);
    setIsRelatedParsing(true);
    try {
      const response = await fetch('/api/services/related-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          selectors: serviceData.productPage.selectors,
          limit: relatedLimit,
          sortBy: relatedSortBy,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.items) {
        setRelatedParseError(data?.error || '관련 상품 파싱에 실패했습니다.');
        return;
      }

      setRelatedItems(data.items || []);
      // Auto-save to localStorage
      if (data.items?.length > 0) {
        const savedAt = new Date().toISOString();
        localStorage.setItem('relatedItems', JSON.stringify({ items: data.items, savedAt }));
        setRelatedSavedAt(savedAt);
      }
    } catch {
      setRelatedParseError('관련 상품 파싱에 실패했습니다.');
    } finally {
      setIsRelatedParsing(false);
    }
  };

  useEffect(() => {
    // Load saved related items from localStorage on mount
    try {
      const saved = localStorage.getItem('relatedItems');
      if (saved) {
        const { items, savedAt } = JSON.parse(saved);
        if (items?.length > 0) {
          setRelatedItems(items);
          setRelatedSavedAt(savedAt);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const clearRelatedItems = () => {
    setRelatedItems([]);
    setRelatedSavedAt(null);
    localStorage.removeItem('relatedItems');
  };

  const handleOptimizeSelectors = async () => {
    const urls = relatedItems.map(item => item.url).filter(Boolean);
    if (urls.length === 0) {
      setRelatedParseError('최적화할 관련 상품 URL이 없습니다. 먼저 관련 상품을 파싱해주세요.');
      return;
    }

    setIsOptimizing(true);
    setOptimizeResult(null);
    try {
      const response = await fetch('/api/services/optimize-selectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls,
          currentSelectors: serviceData.productPage.selectors,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.optimizedSelectors) {
        setRelatedParseError(data?.error || '셀렉터 최적화에 실패했습니다.');
        return;
      }

      // Apply optimized selectors
      setServiceData(prev => ({
        ...prev,
        productPage: {
          ...prev.productPage,
          selectors: {
            ...prev.productPage.selectors,
            title: data.optimizedSelectors.title || prev.productPage.selectors.title,
            price: data.optimizedSelectors.price || prev.productPage.selectors.price,
            image: data.optimizedSelectors.image || prev.productPage.selectors.image,
            description: data.optimizedSelectors.description || prev.productPage.selectors.description,
          },
        },
      }));

      setOptimizeResult({
        improvements: data.improvements || [],
        hasChanges: data.hasChanges || false,
      });
    } catch {
      setRelatedParseError('셀렉터 최적화에 실패했습니다.');
    } finally {
      setIsOptimizing(false);
    }
  };

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId) return;

    const loadService = async () => {
      try {
        setIsLoadingService(true);
        const response = await fetch(`/api/services?id=${editId}`);
        const data = await response.json();
        if (!response.ok || !data?.service) {
          setSaveError(data?.error || '서비스 정보를 불러오는데 실패했습니다.');
          return;
        }

        const service = data.service;
        const endpoints = (service.endpoints || []).map((ep: EndpointConfig) => ({
          ...ep,
          id: ep.id || crypto.randomUUID(),
        }));

        setServiceData({
          name: service.name || '',
          nameKo: service.name_ko || '',
          description: service.description || '',
          descriptionKo: service.description_ko || '',
          homepage: service.homepage || '',
          apiBase: service.api_base || '',
          productPage: {
            ...initialServiceData.productPage,
            ...(service.productPage || {}),
            selectors: {
              ...initialServiceData.productPage.selectors,
              ...(service.productPage?.selectors || {}),
            },
          },
          endpoints: endpoints.length ? endpoints : [{ ...defaultEndpoint, id: crypto.randomUUID() }],
          authType: service.auth_type || 'none',
          rateLimit: service.rate_limit || '100/min',
          contactEmail: service.contact_email || '',
        });

        setEditingId(editId);
        if (service.slug) {
          setSavedUrl(`https://eoynx.com/s/${service.slug}`);
        }
      } catch {
        setSaveError('서비스 정보를 불러오는데 실패했습니다.');
      } finally {
        setIsLoadingService(false);
      }
    };

    loadService();
  }, [searchParams]);

  const handleSave = async () => {
    // 필수 필드 검증
    if ((!serviceData.name && !serviceData.nameKo) || !serviceData.apiBase || (!serviceData.description && !serviceData.descriptionKo)) {
      setSaveError('필수 필드를 모두 입력해주세요: 서비스명, API Base URL, 설명');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const payload = {
        ...serviceData,
        name: serviceData.name || serviceData.nameKo,
        description: serviceData.description || serviceData.descriptionKo,
      };

      const response = await fetch('/api/services', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (data.slug) {
          setSavedUrl(`https://eoynx.com/s/${data.slug}`);
        }
        if (!data.slug && savedUrl) {
          setSavedUrl(savedUrl);
        }
      } else {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : (data.error || '저장에 실패했습니다.');
        setSaveError(errorMsg);
      }
    } catch (error) {
      console.error('Failed to save:', error);
      setSaveError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 페이지 제목 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-onyx-100 flex items-center gap-2">
            <DashboardIcon className="w-7 h-7 text-dawn-500" />
            {editingId ? '서비스 수정' : '서비스 등록'}
          </h1>
          <p className="mt-1 text-sm text-onyx-400">
            {editingId ? '기존 서비스를 업데이트합니다.' : 'AI 에이전트가 이해할 수 있는 구조화된 데이터를 생성합니다.'}
          </p>
        </div>
        <div className="text-xs text-onyx-500 bg-onyx-800/50 px-3 py-1 rounded-full">
          {isLoadingService ? '불러오는 중...' : 'Free Tier'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 입력 폼 */}
        <div className="space-y-6">
          {/* Pro 자동 등록 */}
          <div className="bg-onyx-900/50 border border-onyx-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-onyx-100">Pro 자동 등록</h2>
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">Pro</span>
            </div>
            <p className="text-sm text-onyx-400 mb-4">
              페이지 URL을 넣으면 서비스 정보를 자동으로 채웁니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                value={autoUrl}
                onChange={(e) => setAutoUrl(e.target.value)}
                placeholder="https://example.com/products/123"
                className="flex-1 bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAutoFill}
                disabled={isAutoLoading}
                className="px-4 py-2 bg-purple-600/90 hover:bg-purple-500 text-white text-sm font-medium rounded-lg disabled:opacity-50"
              >
                {isAutoLoading ? '분석 중...' : '자동 채우기'}
              </button>
            </div>
            {autoError && (
              <p className="text-sm text-red-400 mt-2">{autoError}</p>
            )}
          </div>

          {/* 기본 정보 */}
          <div className="bg-onyx-900/50 border border-onyx-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-onyx-100 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-dawn-500/20 text-dawn-400 rounded-full flex items-center justify-center text-sm">1</span>
              기본 정보
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-onyx-300 mb-1">서비스명 (영문) *</label>
                  <input
                    type="text"
                    value={serviceData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="My Awesome API"
                    className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-onyx-300 mb-1">서비스명 (한글)</label>
                  <input
                    type="text"
                    value={serviceData.nameKo}
                    onChange={(e) => updateField('nameKo', e.target.value)}
                    placeholder="나의 멋진 API"
                    className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-onyx-300 mb-1">설명 (영문) *</label>
                <textarea
                  value={serviceData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="A comprehensive API for..."
                  rows={2}
                  className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-onyx-300 mb-1">설명 (한글)</label>
                <textarea
                  value={serviceData.descriptionKo}
                  onChange={(e) => updateField('descriptionKo', e.target.value)}
                  placeholder="종합 API 서비스로..."
                  rows={2}
                  className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-onyx-300 mb-1">홈페이지 URL *</label>
                  <input
                    type="url"
                    value={serviceData.homepage}
                    onChange={(e) => updateField('homepage', e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-onyx-300 mb-1">API Base URL *</label>
                  <input
                    type="url"
                    value={serviceData.apiBase}
                    onChange={(e) => updateField('apiBase', e.target.value)}
                    placeholder="https://api.example.com"
                    className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* API 엔드포인트 */}
          <div className="bg-onyx-900/50 border border-onyx-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-onyx-100 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-dawn-500/20 text-dawn-400 rounded-full flex items-center justify-center text-sm">2</span>
              API 엔드포인트
            </h2>
            <div className="space-y-4">
              {serviceData.endpoints.map((endpoint, index) => (
                <div key={endpoint.id} className="bg-onyx-800/50 border border-onyx-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-onyx-400">엔드포인트 #{index + 1}</span>
                    {serviceData.endpoints.length > 1 && (
                      <button
                        onClick={() => removeEndpoint(endpoint.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-1">
                      <select
                        value={endpoint.method}
                        onChange={(e) => updateEndpoint(endpoint.id, 'method', e.target.value)}
                        className="w-full bg-onyx-700 border border-onyx-600 rounded-lg px-2 py-2 text-onyx-100 focus:border-dawn-500 focus:outline-none text-sm"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={endpoint.path}
                        onChange={(e) => updateEndpoint(endpoint.id, 'path', e.target.value)}
                        placeholder="/api/endpoint"
                        className="w-full bg-onyx-700 border border-onyx-600 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <input
                      type="text"
                      value={endpoint.description}
                      onChange={(e) => updateEndpoint(endpoint.id, 'description', e.target.value)}
                      placeholder="이 엔드포인트의 설명..."
                      className="w-full bg-onyx-700 border border-onyx-600 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-onyx-300">
                      <input
                        type="checkbox"
                        checked={endpoint.auth}
                        onChange={(e) => updateEndpoint(endpoint.id, 'auth', e.target.checked)}
                        className="rounded bg-onyx-700 border-onyx-600 text-dawn-500 focus:ring-dawn-500"
                      />
                      인증 필요
                    </label>
                    <input
                      type="text"
                      value={endpoint.params}
                      onChange={(e) => updateEndpoint(endpoint.id, 'params', e.target.value)}
                      placeholder="파라미터 (예: q, limit, page)"
                      className="flex-1 bg-onyx-700 border border-onyx-600 rounded-lg px-3 py-1.5 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none text-sm"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={addEndpoint}
                className="w-full py-2 border border-dashed border-onyx-600 rounded-lg text-onyx-400 hover:text-onyx-200 hover:border-onyx-500 transition-colors text-sm"
              >
                + 엔드포인트 추가
              </button>
            </div>
          </div>

          {/* 상품 페이지 파싱 정보 */}
          <div className="bg-onyx-900/50 border border-onyx-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-onyx-100 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-dawn-500/20 text-dawn-400 rounded-full flex items-center justify-center text-sm">3</span>
              상품 페이지 파싱 정보
            </h2>
            <p className="text-sm text-onyx-400 mb-4">
              AI가 상품 페이지를 쉽게 파싱할 수 있도록 URL 패턴과 셀렉터 정보를 등록하세요.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={() => applyProductPreset('json-ld')}
                className="px-3 py-1.5 text-xs bg-onyx-800 text-onyx-300 hover:text-onyx-100 rounded-lg transition-colors"
              >
                JSON-LD 기본 채우기
              </button>
              <button
                type="button"
                onClick={() => applyProductPreset('dom')}
                className="px-3 py-1.5 text-xs bg-onyx-800 text-onyx-300 hover:text-onyx-100 rounded-lg transition-colors"
              >
                DOM 기본 채우기
              </button>
              <button
                type="button"
                onClick={handleDetectSelectors}
                disabled={isDetectingSelectors}
                className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-300 hover:text-purple-200 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDetectingSelectors ? '자동 탐지 중...' : '셀렉터 자동 탐지'}
              </button>
              <button
                type="button"
                onClick={handleSampleParse}
                disabled={isSampleLoading}
                className="px-3 py-1.5 text-xs bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSampleLoading ? '샘플 파싱 중...' : '샘플 파싱'}
              </button>
              <button
                type="button"
                onClick={handleRelatedExtract}
                disabled={isRelatedLoading}
                className="px-3 py-1.5 text-xs bg-blue-500/20 text-blue-300 hover:text-blue-200 rounded-lg transition-colors disabled:opacity-50"
              >
                {isRelatedLoading ? '관련 상품 추출 중...' : '관련 상품 추출'}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRelatedParse}
                  disabled={isRelatedParsing}
                  className="px-3 py-1.5 text-xs bg-sky-500/20 text-sky-300 hover:text-sky-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isRelatedParsing ? '관련 상품 파싱 중...' : '관련 상품 파싱'}
                </button>
                <select
                  value={relatedLimit}
                  onChange={(e) => setRelatedLimit(Number(e.target.value))}
                  className="px-2 py-1.5 text-xs bg-onyx-800 border border-onyx-600 text-onyx-200 rounded-lg"
                >
                  <option value={3}>3개</option>
                  <option value={5}>5개</option>
                  <option value={10}>10개</option>
                  <option value={15}>15개</option>
                  <option value={20}>20개</option>
                </select>
                <select
                  value={relatedSortBy}
                  onChange={(e) => setRelatedSortBy(e.target.value as 'none' | 'price-asc' | 'price-desc' | 'name')}
                  className="px-2 py-1.5 text-xs bg-onyx-800 border border-onyx-600 text-onyx-200 rounded-lg"
                >
                  <option value="none">정렬 없음</option>
                  <option value="price-asc">가격 낮은순</option>
                  <option value="price-desc">가격 높은순</option>
                  <option value="name">이름순</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleOptimizeSelectors}
                disabled={isOptimizing || relatedItems.length === 0}
                className="px-3 py-1.5 text-xs bg-amber-500/20 text-amber-300 hover:text-amber-200 rounded-lg transition-colors disabled:opacity-50"
                title={relatedItems.length === 0 ? '관련 상품 파싱 후 사용 가능' : '파싱된 상품 기반으로 셀렉터 최적화'}
              >
                {isOptimizing ? '최적화 중...' : '셀렉터 자동 최적화'}
              </button>
              <button
                type="button"
                onClick={() => setShowAdvancedProduct(prev => !prev)}
                className="px-3 py-1.5 text-xs bg-dawn-500/10 text-dawn-400 hover:text-dawn-300 rounded-lg transition-colors"
              >
                {showAdvancedProduct ? '상세 셀렉터 숨기기' : '상세 셀렉터 입력'}
              </button>
            </div>
            {detectError && (
              <p className="text-sm text-red-400 mb-3">{detectError}</p>
            )}
            {sampleError && (
              <p className="text-sm text-red-400 mb-3">{sampleError}</p>
            )}
            {relatedError && (
              <p className="text-sm text-red-400 mb-3">{relatedError}</p>
            )}
            {relatedParseError && (
              <p className="text-sm text-red-400 mb-3">{relatedParseError}</p>
            )}
            {optimizeResult && (
              <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3 mb-3">
                {optimizeResult.hasChanges ? (
                  <>
                    <div className="text-sm text-amber-300 font-medium mb-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      셀렉터가 최적화되었습니다
                    </div>
                    <ul className="text-xs text-amber-200/80 space-y-1">
                      {optimizeResult.improvements.map((imp, i) => (
                        <li key={i}>• {imp}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="text-sm text-amber-300 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    현재 셀렉터가 이미 최적 상태입니다
                  </div>
                )}
              </div>
            )}
            {relatedLinks.length > 0 && (
              <div className="bg-onyx-800/50 border border-onyx-700 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-semibold text-onyx-200 mb-2">관련 상품 링크</h3>
                <ul className="text-xs text-onyx-300 space-y-1 max-h-40 overflow-auto">
                  {relatedLinks.map((link) => (
                    <li key={link} className="truncate">
                      {link}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {relatedItems.length > 0 && (
              <div className="bg-onyx-800/50 border border-onyx-700 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-onyx-200">관련 상품 파싱 결과</h3>
                  <div className="flex items-center gap-2">
                    {relatedSavedAt && (
                      <span className="text-xs text-onyx-500">
                        저장됨: {new Date(relatedSavedAt).toLocaleString('ko-KR')}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={clearRelatedItems}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {relatedItems.map((item) => (
                    <div key={item.url} className="flex items-center gap-3">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt="related"
                          className="w-12 h-12 object-cover rounded border border-onyx-700"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded border border-onyx-700 bg-onyx-700/40" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm text-onyx-200 truncate">{item.title || item.url}</div>
                        <div className="text-xs text-onyx-400">{item.price || '-'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {sampleResult && (
              <div className="bg-onyx-800/50 border border-onyx-700 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-semibold text-onyx-200 mb-3">샘플 파싱 결과</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-onyx-500">상품명</div>
                    <div className="text-onyx-200 break-words">{sampleResult.title || '-'}</div>
                  </div>
                  <div>
                    <div className="text-onyx-500">가격</div>
                    <div className="text-onyx-200">{sampleResult.price || '-'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-onyx-500">설명</div>
                    <div className="text-onyx-200 break-words">{sampleResult.description || '-'}</div>
                  </div>
                  <div>
                    <div className="text-onyx-500">이미지</div>
                    {sampleResult.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sampleResult.image}
                        alt="sample"
                        className="mt-2 w-28 h-28 object-cover rounded-lg border border-onyx-700"
                      />
                    ) : (
                      <div className="text-onyx-400">-</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-onyx-300 mb-1">상품 URL 패턴</label>
                  <input
                    type="text"
                    value={serviceData.productPage.urlPattern}
                    onChange={(e) => updateProductPageField('urlPattern', e.target.value)}
                    placeholder="/products/* 또는 /product/:id"
                    className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-onyx-300 mb-1">예시 URL</label>
                  <input
                    type="url"
                    value={serviceData.productPage.sampleUrl}
                    onChange={(e) => updateProductPageField('sampleUrl', e.target.value)}
                    placeholder="https://example.com/products/123"
                    className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-onyx-300 mb-1">데이터 소스</label>
                <select
                  value={serviceData.productPage.dataSource}
                  onChange={(e) => updateProductPageField('dataSource', e.target.value as ProductPageConfig['dataSource'])}
                  className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 focus:border-dawn-500 focus:outline-none"
                >
                  <option value="json-ld">JSON-LD (구조화 데이터)</option>
                  <option value="meta">Meta/OpenGraph</option>
                  <option value="dom">DOM 셀렉터</option>
                  <option value="api">API 응답</option>
                </select>
              </div>

              {showAdvancedProduct && (
                <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-onyx-300 mb-1">상품명 셀렉터</label>
                  <input
                    type="text"
                    value={serviceData.productPage.selectors.title}
                    onChange={(e) => updateProductSelector('title', e.target.value)}
                    placeholder=".product-title 또는 jsonld.name"
                    className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-onyx-300 mb-1">가격 셀렉터</label>
                  <input
                    type="text"
                    value={serviceData.productPage.selectors.price}
                    onChange={(e) => updateProductSelector('price', e.target.value)}
                    placeholder=".product-price 또는 jsonld.offers.price"
                    className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-onyx-300 mb-1">통화</label>
                  <input
                    type="text"
                    value={serviceData.productPage.selectors.currency}
                    onChange={(e) => updateProductSelector('currency', e.target.value)}
                    placeholder="KRW 또는 jsonld.offers.priceCurrency"
                    className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-onyx-300 mb-1">이미지</label>
                  <input
                    type="text"
                    value={serviceData.productPage.selectors.image}
                    onChange={(e) => updateProductSelector('image', e.target.value)}
                    placeholder=".product-image img 또는 jsonld.image"
                    className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-onyx-300 mb-1">설명</label>
                  <input
                    type="text"
                    value={serviceData.productPage.selectors.description}
                    onChange={(e) => updateProductSelector('description', e.target.value)}
                    placeholder=".product-desc 또는 jsonld.description"
                    className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-onyx-300 mb-1">SKU</label>
                  <input
                    type="text"
                    value={serviceData.productPage.selectors.sku}
                    onChange={(e) => updateProductSelector('sku', e.target.value)}
                    placeholder=".sku 또는 jsonld.sku"
                    className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-onyx-300 mb-1">브랜드</label>
                  <input
                    type="text"
                    value={serviceData.productPage.selectors.brand}
                    onChange={(e) => updateProductSelector('brand', e.target.value)}
                    placeholder=".brand 또는 jsonld.brand.name"
                    className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-onyx-300 mb-1">재고 상태</label>
                  <input
                    type="text"
                    value={serviceData.productPage.selectors.availability}
                    onChange={(e) => updateProductSelector('availability', e.target.value)}
                    placeholder=".availability 또는 jsonld.offers.availability"
                    className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-onyx-300 mb-1">평점</label>
                  <input
                    type="text"
                    value={serviceData.productPage.selectors.rating}
                    onChange={(e) => updateProductSelector('rating', e.target.value)}
                    placeholder=".rating 또는 jsonld.aggregateRating.ratingValue"
                    className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-onyx-300 mb-1">리뷰 수</label>
                  <input
                    type="text"
                    value={serviceData.productPage.selectors.reviewCount}
                    onChange={(e) => updateProductSelector('reviewCount', e.target.value)}
                    placeholder=".review-count 또는 jsonld.aggregateRating.reviewCount"
                    className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none"
                  />
                </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-onyx-300 mb-1">추가 메모</label>
                <textarea
                  value={serviceData.productPage.notes}
                  onChange={(e) => updateProductPageField('notes', e.target.value)}
                  placeholder="예: 가격은 데이터 레이어(window.__PRODUCT__)에서 제공됨"
                  rows={3}
                  className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 인증 & 설정 */}
          <div className="bg-onyx-900/50 border border-onyx-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-onyx-100 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-dawn-500/20 text-dawn-400 rounded-full flex items-center justify-center text-sm">4</span>
              인증 & 설정
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-onyx-300 mb-1">인증 방식</label>
                  <select
                    value={serviceData.authType}
                    onChange={(e) => updateField('authType', e.target.value as ServiceData['authType'])}
                    className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 focus:border-dawn-500 focus:outline-none"
                  >
                    <option value="none">인증 없음</option>
                    <option value="api_key">API Key</option>
                    <option value="jwt">JWT Bearer Token</option>
                    <option value="oauth2">OAuth 2.0</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-onyx-300 mb-1">Rate Limit</label>
                  <select
                    value={serviceData.rateLimit}
                    onChange={(e) => updateField('rateLimit', e.target.value)}
                    className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 focus:border-dawn-500 focus:outline-none"
                  >
                    <option value="10/min">10 req/min</option>
                    <option value="60/min">60 req/min</option>
                    <option value="100/min">100 req/min</option>
                    <option value="1000/min">1000 req/min</option>
                    <option value="unlimited">Unlimited</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-onyx-300 mb-1">연락처 이메일</label>
                <input
                  type="email"
                  value={serviceData.contactEmail}
                  onChange={(e) => updateField('contactEmail', e.target.value)}
                  placeholder="api-support@example.com"
                  className="w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2 text-onyx-100 placeholder-onyx-500 focus:border-dawn-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 저장 버튼 */}
          <button
            onClick={handleSave}
            disabled={isSaving || isLoadingService || !serviceData.name || !serviceData.apiBase || !serviceData.description}
            className="w-full py-3 bg-gradient-to-r from-dawn-500 to-dawn-600 hover:from-dawn-400 hover:to-dawn-500 disabled:from-onyx-700 disabled:to-onyx-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-dawn-500/20 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                저장 중...
              </>
            ) : (editingId ? '수정 저장하기' : '서비스 등록하기')}
          </button>

          {saveError && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {saveError}
              </p>
            </div>
          )}

          {savedUrl && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <p className="text-green-400 text-sm mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {editingId ? '서비스가 업데이트되었습니다!' : '서비스가 등록되었습니다!'}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-green-300 bg-green-500/10 px-2 py-1 rounded truncate">{savedUrl}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(savedUrl)}
                  className="text-green-400 hover:text-green-300 p-1"
                  title="URL 복사"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 미리보기 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-onyx-100">미리보기</h2>
            <div className="flex gap-2">
              {(['ai.txt', 'llms.txt', 'json-ld'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPreviewMode(mode)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    previewMode === mode
                      ? 'bg-dawn-500 text-white'
                      : 'bg-onyx-800 text-onyx-400 hover:text-onyx-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-onyx-900/50 border border-onyx-800 rounded-xl p-4 h-[calc(100vh-300px)] overflow-auto">
            <pre className="text-sm text-onyx-300 font-mono whitespace-pre-wrap">
              {generatePreview()}
            </pre>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(generatePreview())}
              className="flex-1 py-2 bg-onyx-800 hover:bg-onyx-700 text-onyx-300 rounded-lg transition-colors text-sm flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              복사하기
            </button>
            <button
              onClick={() => {
                const blob = new Blob([generatePreview()], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = previewMode === 'json-ld' ? 'agent-data.json' : previewMode;
                a.click();
              }}
              className="flex-1 py-2 bg-onyx-800 hover:bg-onyx-700 text-onyx-300 rounded-lg transition-colors text-sm flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              다운로드
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-onyx-950 via-onyx-900 to-onyx-950 p-8 flex items-center justify-center">
        <div className="text-onyx-400">로딩 중...</div>
      </div>
    }>
      <ServicesContent />
    </Suspense>
  );
}
