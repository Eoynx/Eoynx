import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import { SignJWT } from 'jose';

export const runtime = 'edge';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-for-development-only'
);

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');
    const errorDescription = requestUrl.searchParams.get('error_description');

    // OAuth 에러 처리
    if (error) {
      console.error('OAuth callback error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errorDescription || 'OAuth 인증에 실패했습니다.')}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/login?error=인증 코드가 없습니다.', request.url)
      );
    }

    const supabase = getSupabaseClient();

    // OAuth 코드를 세션으로 교환
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent('인증 처리에 실패했습니다.')}`, request.url)
      );
    }

    if (!data.user || !data.session) {
      return NextResponse.redirect(
        new URL('/login?error=사용자 정보를 가져올 수 없습니다.', request.url)
      );
    }

    // 사용자 정보 추출
    const user = data.user;
    const provider = user.app_metadata?.provider || 'unknown';
    const name = user.user_metadata?.full_name 
      || user.user_metadata?.name 
      || user.user_metadata?.user_name
      || user.email?.split('@')[0]
      || 'User';

    // 프로필 테이블에 사용자 정보 저장/업데이트 (있는 경우)
    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        name,
        avatar_url: user.user_metadata?.avatar_url,
        provider,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });
    } catch {
      // 프로필 테이블이 없어도 로그인은 성공으로 처리
      console.log('Profile table not available, skipping profile update');
    }

    // JWT 토큰 생성
    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      name,
      provider,
      role: user.role || 'user',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    // 대시보드로 리다이렉트하면서 쿠키 설정
    const response = NextResponse.redirect(new URL('/dashboard', request.url));

    // HTTP-only 쿠키로 토큰 저장
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24시간
      path: '/',
    });

    // Supabase 세션 토큰도 저장
    response.cookies.set('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24시간
      path: '/',
    });

    // 리프레시 토큰 저장
    if (data.session.refresh_token) {
      response.cookies.set('sb-refresh-token', data.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7일
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/login?error=서버 오류가 발생했습니다.', request.url)
    );
  }
}
