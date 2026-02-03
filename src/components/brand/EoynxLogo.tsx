/**
 * Eoynx 브랜드 아이콘 및 로고 SVG 컴포넌트
 */

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * 새벽(일출) 로고 아이콘
 */
export function SunriseIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 지평선 */}
      <path
        d="M2 15h20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* 태양 */}
      <path
        d="M12 10a5 5 0 0 1 5 5H7a5 5 0 0 1 5-5z"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <path
        d="M12 10a5 5 0 0 1 5 5H7a5 5 0 0 1 5-5z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* 광선 */}
      <path
        d="M12 3v3M18.36 6.64l-2.12 2.12M21 12h-3M5.64 6.64l2.12 2.12M3 12h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Eoynx 전체 로고 (아이콘 + 텍스트)
 */
export function EoynxLogo({ className = '', size = 32 }: IconProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <SunriseIcon size={size} className="text-dawn-500" />
      <span className="font-bold" style={{ fontSize: size * 0.7 }}>
        <span className="text-dawn-500">Eo</span>
        <span className="text-current">ynx</span>
      </span>
    </div>
  );
}

/**
 * 로고 아이콘만 (파비콘/아바타용)
 */
export function EoynxIconOnly({ className = '', size = 24 }: IconProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="eoynx-bg" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="70%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <radialGradient id="eoynx-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f97316" />
          </radialGradient>
        </defs>
        {/* 배경 */}
        <rect width="100" height="100" rx="12" fill="url(#eoynx-bg)" />
        {/* 지평선 */}
        <rect x="0" y="55" width="100" height="2" fill="#f97316" opacity="0.6" />
        {/* 태양 */}
        <circle cx="50" cy="45" r="22" fill="url(#eoynx-sun)" />
        {/* 광선 */}
        <g stroke="#f97316" strokeWidth="2" opacity="0.4">
          <line x1="50" y1="15" x2="50" y2="8" />
          <line x1="70" y1="25" x2="76" y2="20" />
          <line x1="78" y1="45" x2="85" y2="45" />
          <line x1="22" y1="45" x2="15" y2="45" />
          <line x1="30" y1="25" x2="24" y2="20" />
        </g>
      </svg>
    </div>
  );
}

/**
 * 홈페이지 히어로 섹션용 대형 로고
 */
export function EoynxHeroLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <SunriseIcon size={64} className="text-dawn-500 mb-4" />
      <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
        <span className="text-dawn-500">Eo</span>
        <span className="text-onyx-100">ynx</span>
      </h1>
      <p className="mt-2 text-xl text-onyx-400 tracking-wide">
        이오닉스
      </p>
    </div>
  );
}

export default { SunriseIcon, EoynxLogo, EoynxIconOnly, EoynxHeroLogo };
