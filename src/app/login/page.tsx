'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// 클라이언트 측 Supabase 인스턴스
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // URL에서 에러 메시지 확인 및 세션 체크
  useEffect(() => {
    const errorParam = searchParams.get('error');
    const verifiedParam = searchParams.get('verified');
    
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
    
    if (verifiedParam === 'true') {
      setError('');
    }

    // OAuth 콜백 처리 - URL 해시에서 토큰 추출
    const handleAuthCallback = async () => {
      const hash = window.location.hash;
      
      // URL 해시에 access_token이 있으면 처리
      if (hash && hash.includes('access_token')) {
        console.log('OAuth callback detected, processing...');
        
        // 해시에서 토큰 추출
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken) {
          try {
            // 서버 측 쿠키 설정을 위해 API 호출
            const response = await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: accessToken,
                refresh_token: refreshToken,
              }),
            });
            
            if (response.ok) {
              console.log('Session set successfully, redirecting...');
              // URL 해시 제거 후 대시보드로 이동
              window.history.replaceState({}, '', '/login');
              router.push('/dashboard');
              return;
            } else {
              const data = await response.json();
              console.error('Session API error:', data);
              setError(data.error || '세션 설정에 실패했습니다.');
            }
          } catch (e) {
            console.error('Session set failed:', e);
            setError('세션 설정 중 오류가 발생했습니다.');
          }
        }
      }
      
      setCheckingSession(false);
    };

    handleAuthCallback();
  }, [searchParams, router]);

  // 세션 체크 중 로딩 표시
  if (checkingSession && window.location.hash.includes('access_token')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-onyx-900 via-onyx-800 to-onyx-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dawn-500 mx-auto mb-4"></div>
          <p className="text-onyx-400">로그인 확인 중...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Supabase Auth 로그인 요청
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '로그인에 실패했습니다.');
      }

      // 로그인 성공 - 대시보드로 이동
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Supabase가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/login`,
          queryParams: provider === 'google' ? {
            access_type: 'offline',
            prompt: 'consent',
          } : undefined,
        },
      });

      if (error) {
        throw error;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth 로그인에 실패했습니다.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-onyx-900 via-onyx-800 to-onyx-900 flex items-center justify-center p-4">
      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-dawn-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-dawn-400 to-dawn-600 bg-clip-text text-transparent">
              eoynx
            </h1>
          </Link>
          <p className="text-onyx-400 mt-2">Agent Gateway에 로그인하세요</p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-onyx-800/50 backdrop-blur-sm border border-onyx-700 rounded-2xl p-8">
          {/* 데모 안내 배너 */}
          <div className="bg-dawn-500/10 border border-dawn-500/20 rounded-lg p-3 mb-6 text-center">
            <p className="text-sm text-dawn-400">
              계정이 없으신가요?{' '}
              <Link href="/demo" className="underline font-semibold hover:text-dawn-300">
                데모 먼저 둘러보기 →
              </Link>
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6 text-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* 로그인 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-onyx-300 mb-2">
                이메일
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-onyx-900/50 border border-onyx-600 rounded-lg text-onyx-100 placeholder-onyx-500 focus:outline-none focus:border-dawn-500 focus:ring-1 focus:ring-dawn-500 transition-colors"
                placeholder="your@email.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-onyx-300 mb-2">
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-onyx-900/50 border border-onyx-600 rounded-lg text-onyx-100 placeholder-onyx-500 focus:outline-none focus:border-dawn-500 focus:ring-1 focus:ring-dawn-500 transition-colors"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-onyx-400">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-onyx-600 bg-onyx-900 text-dawn-500 focus:ring-dawn-500"
                />
                로그인 상태 유지
              </label>
              <Link href="/forgot-password" className="text-dawn-400 hover:text-dawn-300 transition-colors">
                비밀번호 찾기
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-dawn-500 to-dawn-600 text-white font-semibold rounded-lg hover:from-dawn-600 hover:to-dawn-700 focus:outline-none focus:ring-2 focus:ring-dawn-500 focus:ring-offset-2 focus:ring-offset-onyx-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  로그인 중...
                </span>
              ) : (
                '로그인'
              )}
            </button>
          </form>

          {/* 구분선 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-onyx-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-onyx-800/50 text-onyx-500">또는</span>
            </div>
          </div>

          {/* OAuth 버튼들 */}
          <div className="space-y-3">
            <button
              onClick={() => handleOAuthLogin('google')}
              disabled={isLoading}
              className="w-full py-3 bg-onyx-700/50 border border-onyx-600 text-onyx-200 font-medium rounded-lg hover:bg-onyx-700 focus:outline-none focus:ring-2 focus:ring-onyx-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google로 계속하기
            </button>

            <button
              onClick={() => handleOAuthLogin('github')}
              disabled={isLoading}
              className="w-full py-3 bg-onyx-700/50 border border-onyx-600 text-onyx-200 font-medium rounded-lg hover:bg-onyx-700 focus:outline-none focus:ring-2 focus:ring-onyx-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              GitHub로 계속하기
            </button>
          </div>

          {/* 회원가입 링크 */}
          <p className="mt-6 text-center text-sm text-onyx-400">
            아직 계정이 없으신가요?{' '}
            <Link href="/signup" className="text-dawn-400 hover:text-dawn-300 font-medium transition-colors">
              회원가입
            </Link>
          </p>
        </div>

        {/* 푸터 */}
        <p className="mt-8 text-center text-xs text-onyx-500">
          로그인함으로써{' '}
          <Link href="/terms" className="underline hover:text-onyx-400">이용약관</Link>
          {' '}및{' '}
          <Link href="/privacy" className="underline hover:text-onyx-400">개인정보처리방침</Link>
          에 동의합니다.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-onyx-900 via-onyx-800 to-onyx-900 flex items-center justify-center">
        <div className="text-onyx-400">로딩 중...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
