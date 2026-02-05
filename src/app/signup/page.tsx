'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  validatePassword, 
  getStrengthColor, 
  getStrengthLabel,
  getPasswordRequirements,
  DEFAULT_PASSWORD_POLICY,
  type PasswordValidationResult 
} from '@/lib/auth/password-policy';

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidationResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // 비밀번호 검증 실시간 업데이트
  useEffect(() => {
    if (formData.password) {
      const result = validatePassword(formData.password, DEFAULT_PASSWORD_POLICY, {
        email: formData.email,
        name: formData.name,
      });
      setPasswordValidation(result);
    } else {
      setPasswordValidation(null);
    }
  }, [formData.password, formData.email, formData.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // 비밀번호 유효성 검증
    if (passwordValidation && !passwordValidation.valid) {
      setError(passwordValidation.errors[0]);
      setIsLoading(false);
      return;
    }

    // 비밀번호 확인 검증
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '회원가입에 실패했습니다.');
      }

      setSuccess(true);
      // 3초 후 로그인 페이지로 이동
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRequirements = getPasswordRequirements();

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-onyx-900 via-onyx-800 to-onyx-900 flex items-center justify-center p-4">
        <div className="bg-onyx-800/50 backdrop-blur-sm border border-onyx-700 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">회원가입 완료!</h2>
          <p className="text-onyx-400 mb-4">
            이메일 인증 링크를 발송했습니다.<br />
            이메일을 확인해주세요.
          </p>
          <p className="text-sm text-onyx-500">
            잠시 후 로그인 페이지로 이동합니다...
          </p>
        </div>
      </div>
    );
  }

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
          <p className="text-onyx-400 mt-2">Agent Gateway 계정 생성</p>
        </div>

        {/* 회원가입 카드 */}
        <div className="bg-onyx-800/50 backdrop-blur-sm border border-onyx-700 rounded-2xl p-8">
          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6 text-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* 회원가입 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-onyx-300 mb-2">
                이름
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-onyx-900/50 border border-onyx-600 rounded-lg text-onyx-100 placeholder-onyx-500 focus:outline-none focus:border-dawn-500 focus:ring-1 focus:ring-dawn-500 transition-colors"
                placeholder="홍길동"
                required
                disabled={isLoading}
              />
            </div>

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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-onyx-900/50 border border-onyx-600 rounded-lg text-onyx-100 placeholder-onyx-500 focus:outline-none focus:border-dawn-500 focus:ring-1 focus:ring-dawn-500 transition-colors pr-12"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-onyx-500 hover:text-onyx-300 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* 비밀번호 강도 표시 */}
              {passwordValidation && (
                <div className="mt-3 space-y-2">
                  {/* 강도 바 */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-onyx-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordValidation.strength === 'weak' ? 'bg-red-500 w-1/4' :
                          passwordValidation.strength === 'medium' ? 'bg-yellow-500 w-2/4' :
                          passwordValidation.strength === 'strong' ? 'bg-green-500 w-3/4' :
                          'bg-emerald-500 w-full'
                        }`}
                      />
                    </div>
                    <span className={`text-xs font-medium ${getStrengthColor(passwordValidation.strength)}`}>
                      {getStrengthLabel(passwordValidation.strength)}
                    </span>
                  </div>

                  {/* 에러 메시지 */}
                  {passwordValidation.errors.length > 0 && (
                    <ul className="text-xs text-red-400 space-y-1">
                      {passwordValidation.errors.map((err, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          {err}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* 비밀번호 요구사항 */}
              <div className="mt-3 p-3 bg-onyx-900/30 rounded-lg">
                <p className="text-xs text-onyx-500 mb-2">비밀번호 요구사항:</p>
                <ul className="text-xs text-onyx-400 space-y-1">
                  {passwordRequirements.map((req, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <span className="text-onyx-600">•</span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-onyx-300 mb-2">
                비밀번호 확인
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={`w-full px-4 py-3 bg-onyx-900/50 border rounded-lg text-onyx-100 placeholder-onyx-500 focus:outline-none focus:ring-1 transition-colors ${
                  formData.confirmPassword && formData.confirmPassword !== formData.password
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : formData.confirmPassword && formData.confirmPassword === formData.password
                    ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                    : 'border-onyx-600 focus:border-dawn-500 focus:ring-dawn-500'
                }`}
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
              {formData.confirmPassword && formData.confirmPassword !== formData.password && (
                <p className="mt-1 text-xs text-red-400">비밀번호가 일치하지 않습니다.</p>
              )}
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                required
                className="mt-1 w-4 h-4 rounded border-onyx-600 bg-onyx-900 text-dawn-500 focus:ring-dawn-500"
              />
              <label htmlFor="terms" className="text-sm text-onyx-400">
                <Link href="/terms" className="text-dawn-400 hover:text-dawn-300 underline">이용약관</Link>
                {' '}및{' '}
                <Link href="/privacy" className="text-dawn-400 hover:text-dawn-300 underline">개인정보처리방침</Link>
                에 동의합니다.
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || (passwordValidation && !passwordValidation.valid)}
              className="w-full py-3 bg-gradient-to-r from-dawn-500 to-dawn-600 text-white font-semibold rounded-lg hover:from-dawn-600 hover:to-dawn-700 focus:outline-none focus:ring-2 focus:ring-dawn-500 focus:ring-offset-2 focus:ring-offset-onyx-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  가입 중...
                </span>
              ) : (
                '회원가입'
              )}
            </button>
          </form>

          {/* 로그인 링크 */}
          <p className="mt-6 text-center text-sm text-onyx-400">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-dawn-400 hover:text-dawn-300 font-medium transition-colors">
              로그인
            </Link>
          </p>
        </div>

        {/* 데모 안내 */}
        <p className="mt-6 text-center text-sm text-onyx-500">
          먼저 둘러보고 싶으신가요?{' '}
          <Link href="/demo" className="text-dawn-400 hover:text-dawn-300 underline">
            데모 보기 →
          </Link>
        </p>
      </div>
    </div>
  );
}
