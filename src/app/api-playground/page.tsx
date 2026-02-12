'use client';

import { useEffect, useRef } from 'react';

export default function ApiPlaygroundPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Scalar API Reference 스크립트 로드
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest';
    script.async = true;
    
    script.onload = () => {
      if (containerRef.current && (window as unknown as { Scalar?: { createApiReference: (config: object) => void } }).Scalar) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).Scalar.createApiReference(containerRef.current, {
          spec: {
            url: '/api/openapi',
          },
          theme: 'purple',
          hideModels: false,
          darkMode: true,
          layout: 'modern',
          showSidebar: true,
          searchHotKey: 'k',
          metaData: {
            title: 'Eoynx API Playground',
            description: 'Interactive API documentation for Eoynx Agent Gateway',
          },
          authentication: {
            preferredSecurityScheme: 'BearerAuth',
            http: {
              bearer: {
                token: '',
              },
            },
          },
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-onyx-950">
      {/* Header */}
      <div className="bg-onyx-900 border-b border-onyx-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
              Eoynx
            </a>
            <span className="text-onyx-400">|</span>
            <span className="text-onyx-200 font-medium">API Playground</span>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="/docs" 
              className="text-onyx-400 hover:text-onyx-200 transition-colors"
            >
              Documentation
            </a>
            <a 
              href="/dashboard" 
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Dashboard
            </a>
          </div>
        </div>
      </div>

      {/* Scalar Container */}
      <div 
        ref={containerRef} 
        className="scalar-container"
        style={{ minHeight: 'calc(100vh - 73px)' }}
      />

      {/* Custom Styles */}
      <style jsx global>{`
        .scalar-container {
          --scalar-font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          --scalar-color-1: #f97316;
          --scalar-color-2: #ea580c;
          --scalar-color-3: #c2410c;
          --scalar-color-accent: #f97316;
          --scalar-background-1: #0a0a0f;
          --scalar-background-2: #111118;
          --scalar-background-3: #1a1a24;
          --scalar-border-color: #2a2a3a;
        }
        
        .scalar-app {
          font-family: var(--scalar-font);
        }
      `}</style>
    </div>
  );
}
