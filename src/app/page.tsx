import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-onyx-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-onyx-900 via-onyx-950 to-onyx-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-dawn-500/20 via-transparent to-transparent" />
        
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="text-center">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="flex items-center gap-3">
                <div className="text-5xl">🌅</div>
              </div>
            </div>

            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
              <span className="text-dawn-500">Eo</span>
              <span className="text-onyx-100">ynx</span>
            </h1>
            
            <p className="mt-2 text-xl text-onyx-400 tracking-wide">
              이오닉스
            </p>

            <p className="mt-8 text-2xl leading-relaxed text-onyx-300 max-w-3xl mx-auto font-light">
              <span className="text-dawn-400">&ldquo;어둠을 가르고 시작되는 새벽&rdquo;</span>
              <br />
              AI와 웹의 새로운 전환점을 열다
            </p>

            <p className="mt-6 text-lg text-onyx-400 max-w-2xl mx-auto">
              웹사이트 URL에{' '}
              <code className="text-sm bg-onyx-800 text-dawn-400 px-2 py-1 rounded">/ai</code> 또는{' '}
              <code className="text-sm bg-onyx-800 text-dawn-400 px-2 py-1 rounded">/agent</code>를 
              붙이면 AI가 즉시 이해할 수 있는 구조화된 데이터가 제공됩니다.
            </p>

            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link 
                href="/dashboard" 
                className="rounded-full bg-gradient-to-r from-dawn-500 to-dawn-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-dawn-500/30 hover:from-dawn-400 hover:to-dawn-500 transition-all duration-300"
              >
                시작하기 →
              </Link>
              <Link 
                href="/docs" 
                className="rounded-full border border-onyx-600 px-8 py-4 text-lg font-semibold text-onyx-200 hover:bg-onyx-800 hover:border-onyx-500 transition-all duration-300"
              >
                문서 보기
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative sunrise line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-dawn-500/50 to-transparent" />
      </section>

      {/* Brand Story Section */}
      <section className="py-20 bg-onyx-900/50">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-sm uppercase tracking-widest text-dawn-500 mb-4">About the Name</h2>
          <div className="grid md:grid-cols-2 gap-8 mt-8">
            <div className="p-6 bg-onyx-800/50 rounded-2xl border border-onyx-700">
              <div className="text-4xl mb-4">☀️</div>
              <h3 className="text-xl font-bold text-onyx-100 mb-2">Eos (에오스)</h3>
              <p className="text-onyx-400">그리스 신화의 새벽의 여신. 매일 새로운 시작을 알리는 존재.</p>
            </div>
            <div className="p-6 bg-onyx-800/50 rounded-2xl border border-onyx-700">
              <div className="text-4xl mb-4">💎</div>
              <h3 className="text-xl font-bold text-onyx-100 mb-2">Onyx (오닉스)</h3>
              <p className="text-onyx-400">강인함과 희소성을 상징하는 검은 보석. 변치 않는 신뢰.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-onyx-950">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-sm uppercase tracking-widest text-dawn-500 mb-4">Features</h2>
            <p className="text-3xl font-bold tracking-tight text-onyx-100 sm:text-4xl">
              AI 에이전트를 위한 완벽한 게이트웨이
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="group p-6 bg-onyx-900 rounded-2xl border border-onyx-800 hover:border-dawn-500/50 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-dawn-500/10 rounded-lg">
                  <span className="text-2xl">📋</span>
                </div>
                <h3 className="text-lg font-semibold text-onyx-100">
                  에이전트 대시보드
                </h3>
              </div>
              <p className="text-onyx-400">
                AI가 바로 이해할 수 있는 텍스트 기반 API 명세서를 자동 생성합니다.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-6 bg-onyx-900 rounded-2xl border border-onyx-800 hover:border-dawn-500/50 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-dawn-500/10 rounded-lg">
                  <span className="text-2xl">🛡️</span>
                </div>
                <h3 className="text-lg font-semibold text-onyx-100">
                  권한 제어 (Guardrail)
                </h3>
              </div>
              <p className="text-onyx-400">
                AI 에이전트별 정보 노출 범위와 허용 액션을 세밀하게 제어합니다.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-6 bg-onyx-900 rounded-2xl border border-onyx-800 hover:border-dawn-500/50 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-dawn-500/10 rounded-lg">
                  <span className="text-2xl">📡</span>
                </div>
                <h3 className="text-lg font-semibold text-onyx-100">
                  실시간 컨텍스트
                </h3>
              </div>
              <p className="text-onyx-400">
                현재 사이트 상황 요약 정보를 에이전트에게 실시간으로 전달합니다.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-6 bg-onyx-900 rounded-2xl border border-onyx-800 hover:border-dawn-500/50 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-dawn-500/10 rounded-lg">
                  <span className="text-2xl">🧠</span>
                </div>
                <h3 className="text-lg font-semibold text-onyx-100">
                  Dynamic Prompt
                </h3>
              </div>
              <p className="text-onyx-400">
                사이트 구조 분석 후 최적의 System Prompt를 자동 생성합니다.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group p-6 bg-onyx-900 rounded-2xl border border-onyx-800 hover:border-dawn-500/50 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-dawn-500/10 rounded-lg">
                  <span className="text-2xl">🔐</span>
                </div>
                <h3 className="text-lg font-semibold text-onyx-100">
                  M2M 인증
                </h3>
              </div>
              <p className="text-onyx-400">
                AI 에이전트 고유 토큰을 통한 JWT 기반 인증 프로토콜.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group p-6 bg-onyx-900 rounded-2xl border border-onyx-800 hover:border-dawn-500/50 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-dawn-500/10 rounded-lg">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="text-lg font-semibold text-onyx-100">
                  MCP 지원
                </h3>
              </div>
              <p className="text-onyx-400">
                Model Context Protocol로 Claude, GPT 등과 표준화된 통신.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Example Section */}
      <section className="py-24 bg-onyx-900/50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-sm uppercase tracking-widest text-dawn-500 mb-4">How it Works</h2>
            <p className="text-3xl font-bold tracking-tight text-onyx-100 sm:text-4xl">
              간단한 동작 원리
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-onyx-300 flex items-center gap-2">
                <span className="text-red-400">✕</span> 일반 웹페이지 요청
              </h3>
              <div className="bg-onyx-900 rounded-xl p-6 border border-onyx-800">
                <pre className="text-sm text-onyx-400 overflow-x-auto">{`GET https://example.com/products/123

→ 복잡한 HTML, CSS, JavaScript
→ AI가 파싱하기 어려움
→ 불필요한 데이터 포함`}</pre>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-onyx-300 flex items-center gap-2">
                <span className="text-dawn-400">✓</span> Eoynx 게이트웨이 요청
              </h3>
              <div className="bg-onyx-900 rounded-xl p-6 border border-dawn-500/30">
                <pre className="text-sm text-onyx-300 overflow-x-auto">{`GET https://example.com/products/123/agent

{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "프리미엄 노트북",
  "price": "1,200,000원",
  "availability": "InStock",
  "gateway": { "provider": "Eoynx" },
  "actions": [
    { "type": "addToCart" },
    { "type": "purchase" }
  ]
}`}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-b from-onyx-950 to-onyx-900">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="text-6xl mb-6">🌅</div>
          <h2 className="text-3xl font-bold text-onyx-100 mb-4">
            AI의 새로운 새벽을 함께 열어가세요
          </h2>
          <p className="text-lg text-onyx-400 mb-8">
            Eoynx와 함께 웹사이트를 차세대 AI 에이전트 친화적으로 만들어보세요.
          </p>
          <Link 
            href="/dashboard" 
            className="inline-flex rounded-full bg-gradient-to-r from-dawn-500 to-dawn-600 px-10 py-5 text-xl font-semibold text-white shadow-lg shadow-dawn-500/30 hover:from-dawn-400 hover:to-dawn-500 transition-all duration-300"
          >
            무료로 시작하기 →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-onyx-800 py-12 bg-onyx-950">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌅</span>
              <span className="text-xl font-bold">
                <span className="text-dawn-500">Eo</span>
                <span className="text-onyx-100">ynx</span>
              </span>
            </div>
            
            <div className="flex gap-8">
              <Link href="/docs" className="text-onyx-400 hover:text-dawn-400 transition-colors">
                문서
              </Link>
              <Link href="/api/agent" className="text-onyx-400 hover:text-dawn-400 transition-colors">
                API
              </Link>
              <Link href="/dashboard" className="text-onyx-400 hover:text-dawn-400 transition-colors">
                대시보드
              </Link>
              <a href="https://github.com/eoynx/eoynx" className="text-onyx-400 hover:text-dawn-400 transition-colors">
                GitHub
              </a>
            </div>

            <p className="text-onyx-500 text-sm">
              © 2025 Eoynx. Where Dawn Breaks Through.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
