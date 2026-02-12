/**
 * JWT 설정 및 검증 유틸리티
 * 보안: 하드코딩된 시크릿 제거, 환경 변수 필수화
 */

import { jwtVerify, SignJWT, type JWTPayload } from 'jose';

// 환경 변수 검증
function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
  
  if (!secret) {
    // 프로덕션에서는 에러 발생
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL: JWT_SECRET environment variable is required in production');
    }
    // 개발 환경에서만 경고 후 임시 시크릿 사용
    console.warn('[Security Warning] JWT_SECRET not set. Using development-only secret.');
    return new TextEncoder().encode('dev-only-secret-' + Date.now());
  }
  
  // 시크릿 길이 검증 (최소 32자)
  if (secret.length < 32) {
    console.warn('[Security Warning] JWT_SECRET should be at least 32 characters');
  }
  
  return new TextEncoder().encode(secret);
}

// 캐시된 시크릿 (매번 환경 변수 읽기 방지)
let cachedSecret: Uint8Array | null = null;

export function getJWTSecretKey(): Uint8Array {
  if (!cachedSecret) {
    cachedSecret = getJWTSecret();
  }
  return cachedSecret;
}

// 시크릿 리로드 (테스트용)
export function reloadJWTSecret(): void {
  cachedSecret = null;
}

/**
 * JWT 토큰 검증
 */
export async function verifyJWT<T extends JWTPayload>(
  token: string
): Promise<{ valid: true; payload: T } | { valid: false; error: string }> {
  try {
    if (!token || token.length < 10) {
      return { valid: false, error: 'Token too short' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    const secret = getJWTSecretKey();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256', 'HS384', 'HS512'],
    });

    return { valid: true, payload: payload as T };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message.includes('expired')) {
      return { valid: false, error: 'Token expired' };
    }
    if (message.includes('signature')) {
      return { valid: false, error: 'Invalid signature' };
    }
    
    return { valid: false, error: message };
  }
}

/**
 * JWT 토큰 생성
 */
export async function signJWT(
  payload: Record<string, unknown>,
  options: { expiresIn?: string; jti?: string } = {}
): Promise<string> {
  const secret = getJWTSecretKey();
  const { expiresIn = '24h', jti } = options;

  let builder = new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn);

  if (jti) {
    builder = builder.setJti(jti);
  }

  return builder.sign(secret);
}

/**
 * 사용자 인증 토큰 검증 (세션 쿠키용)
 * 서명 검증 필수
 */
export async function verifySessionToken(
  token: string
): Promise<{ valid: true; userId: string; email: string } | { valid: false; error: string }> {
  const result = await verifyJWT<{ sub?: string; email?: string }>(token);
  
  if (!result.valid) {
    return result;
  }

  if (!result.payload.sub || !result.payload.email) {
    return { valid: false, error: 'Missing required claims (sub, email)' };
  }

  return {
    valid: true,
    userId: result.payload.sub,
    email: result.payload.email,
  };
}
