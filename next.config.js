/** @type {import('next').NextConfig} */
const nextConfig = {
  // Edge Runtime 최적화
  experimental: {
    // 서버 액션 활성화
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // 에이전트 API 라우트 헤더 설정
  async headers() {
    return [
      {
        // /api/agent, /api/ai 경로에 대한 CORS 및 캐시 헤더
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Agent-Token, X-Agent-ID' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        // AI 에이전트 전용 엔드포인트
        source: '/:path*/agent',
        headers: [
          { key: 'Content-Type', value: 'application/ld+json' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/:path*/ai',
        headers: [
          { key: 'Content-Type', value: 'application/ld+json' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },

  // 리다이렉트 설정
  async redirects() {
    return [];
  },

  // 리라이트 설정 (프록시)
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    };
  },
};

module.exports = nextConfig;
