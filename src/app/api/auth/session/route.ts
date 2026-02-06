import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, decodeJwt } from 'jose';

export const runtime = 'edge';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-for-development-only'
);

export async function POST(request: NextRequest) {
  try {
    const { access_token, refresh_token } = await request.json();

    if (!access_token) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }

    // JWT 토큰 디코딩하여 사용자 정보 추출
    let payload;
    try {
      payload = decodeJwt(access_token);
    } catch {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 401 }
      );
    }

    // 토큰 만료 확인
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return NextResponse.json(
        { error: 'Token expired' },
        { status: 401 }
      );
    }

    // 사용자 정보 추출
    const userMetadata = payload.user_metadata as Record<string, unknown> || {};
    const name = (userMetadata.full_name as string)
      || (userMetadata.name as string)
      || (userMetadata.user_name as string)
      || (payload.email as string)?.split('@')[0]
      || 'User';
    
    const provider = ((payload.app_metadata as Record<string, unknown>)?.provider as string) || 'unknown';

    // JWT 토큰 생성
    const token = await new SignJWT({
      sub: payload.sub,
      email: payload.email,
      name,
      provider,
      role: payload.role || 'user',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    // 응답에 쿠키 설정
    const response = NextResponse.json({
      success: true,
      user: {
        id: payload.sub,
        email: payload.email,
        name,
      },
    });

    // HTTP-only 쿠키로 토큰 저장 (session 쿠키 사용)
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24시간
      path: '/',
    });

    // 이전 호환을 위해 auth-token도 함께 설정
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24시간
      path: '/',
    });

    // Supabase 세션 토큰 저장
    response.cookies.set('sb-access-token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24시간
      path: '/',
    });

    // 리프레시 토큰 저장
    if (refresh_token) {
      response.cookies.set('sb-refresh-token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7일
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
