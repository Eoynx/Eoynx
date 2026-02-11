import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eoynx.com';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f97316' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export const metadata: Metadata = {
  // Basic Metadata
  title: {
    default: 'Eoynx (이오닉스) - AI Agent Gateway Platform',
    template: '%s | Eoynx',
  },
  description: '어둠을 가르고 시작되는 새벽. AI와 웹의 새로운 전환점을 열다. 웹사이트를 AI 에이전트 친화적으로 만드는 차세대 게이트웨이 플랫폼.',
  keywords: [
    'Eoynx', '이오닉스', 'AI Agent', 'Gateway', 'JSON-LD', 'Schema.org', 
    'MCP', 'Model Context Protocol', 'AI-friendly', 'Structured Data',
    'Web API', 'Agent Authentication', 'llms.txt', 'ai.txt'
  ],
  authors: [{ name: 'Eoynx Team', url: siteUrl }],
  creator: 'Eoynx Team',
  publisher: 'Eoynx',
  
  // Base URL for relative paths
  metadataBase: new URL(siteUrl),
  
  // Alternate languages
  alternates: {
    canonical: siteUrl,
    languages: {
      'ko-KR': siteUrl,
      'en-US': `${siteUrl}/en`,
    },
  },
  
  // OpenGraph Metadata
  openGraph: {
    type: 'website',
    siteName: 'Eoynx (이오닉스)',
    title: 'Eoynx - Where Dawn Breaks Through the Darkness',
    description: 'AI Agent Gateway Platform - 웹사이트를 AI 에이전트 친화적으로 만드는 차세대 게이트웨이. URL에 /ai를 붙이면 구조화된 데이터를 즉시 제공합니다.',
    url: siteUrl,
    locale: 'ko_KR',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Eoynx - AI Agent Gateway Platform',
        type: 'image/svg+xml',
      },
      {
        url: '/logo.svg',
        width: 512,
        height: 512,
        alt: 'Eoynx Logo',
        type: 'image/svg+xml',
      }
    ],
  },
  
  // Twitter Card Metadata
  twitter: {
    card: 'summary_large_image',
    site: '@eoynx',
    creator: '@eoynx',
    title: 'Eoynx - AI Agent Gateway Platform',
    description: '어둠을 가르고 시작되는 새벽. AI와 웹의 새로운 전환점을 열다.',
    images: {
      url: '/og-image.svg',
      alt: 'Eoynx - AI Agent Gateway',
    },
  },
  
  // Icons & Manifest
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: [
      { url: '/apple-touch-icon.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
  },
  manifest: '/site.webmanifest',
  
  // Robots & Indexing
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Verification (add your IDs when available)
  // verification: {
  //   google: 'google-site-verification-id',
  //   yandex: 'yandex-verification-id',
  // },
  
  // App Links
  appLinks: {
    web: {
      url: siteUrl,
      should_fallback: true,
    },
  },
  
  // Category
  category: 'technology',
  
  // Classification for AI/Web tools
  other: {
    'ai-friendly': 'true',
    'llms-txt': `${siteUrl}/llms.txt`,
    'ai-txt': `${siteUrl}/ai.txt`,
    'agent-api': `${siteUrl}/api/agent`,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={inter.variable}>
      <head>
        {/* JSON-LD Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Eoynx',
              alternateName: '이오닉스',
              description: 'AI Agent-Friendly Web Gateway Platform',
              url: siteUrl,
              applicationCategory: 'DeveloperApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              creator: {
                '@type': 'Organization',
                name: 'Eoynx Team',
                url: siteUrl,
              },
            }),
          }}
        />
        {/* AI Discovery Links */}
        <link rel="alternate" type="text/plain" href="/llms.txt" title="LLMs.txt - AI Instructions" />
        <link rel="alternate" type="text/plain" href="/ai.txt" title="AI.txt - Agent Configuration" />
      </head>
      <body className="antialiased bg-onyx-950 text-onyx-100 dark:bg-onyx-950 dark:text-onyx-100">
        <ThemeProvider defaultTheme="dark">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
