import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // 리다이렉트 URL 설정
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback`;
    
    // Google OAuth 로그인 시작
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        scopes: 'email profile',
      },
    });

    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent('Google 로그인에 실패했습니다.')}`, request.url)
      );
    }

    if (data.url) {
      return NextResponse.redirect(data.url);
    }

    return NextResponse.redirect(
      new URL('/login?error=OAuth URL not generated', request.url)
    );
  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(
      new URL('/login?error=서버 오류가 발생했습니다.', request.url)
    );
  }
}
