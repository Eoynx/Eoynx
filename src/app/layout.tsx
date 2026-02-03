import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Eoynx (이오닉스) - AI Agent Gateway Platform',
  description: '어둠을 가르고 시작되는 새벽. AI와 웹의 새로운 전환점을 열다. 웹사이트를 AI 에이전트 친화적으로 만드는 차세대 게이트웨이 플랫폼.',
  keywords: ['Eoynx', '이오닉스', 'AI', 'agent', 'gateway', 'JSON-LD', 'Schema.org', 'MCP', 'Model Context Protocol'],
  authors: [{ name: 'Eoynx Team' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://eoynx.com'),
  openGraph: {
    title: 'Eoynx - Where Dawn Breaks Through the Darkness',
    description: 'AI Agent Gateway Platform - AI와 웹의 새로운 전환점',
    type: 'website',
    siteName: 'Eoynx',
    locale: 'ko_KR',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Eoynx - AI Agent Gateway',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Eoynx - AI Agent Gateway Platform',
    description: '어둠을 가르고 시작되는 새벽. AI와 웹의 새로운 전환점.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={inter.variable}>
      <body className="antialiased bg-onyx-950 text-onyx-100">
        {children}
      </body>
    </html>
  );
}
