import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // Supabase 세션 로그아웃 (에러 무시)
    try {
      await supabase.auth.signOut();
    } catch {
      // 무시
    }

    // 쿠키 삭제 후 로그인 페이지로 리다이렉트
    const response = NextResponse.json({
      success: true,
      message: '로그아웃되었습니다.',
    });

    // 모든 인증 쿠키 삭제
    response.cookies.delete('session');
    response.cookies.delete('auth-token');
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: '로그아웃 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // Supabase 세션 로그아웃 (에러 무시)
    try {
      await supabase.auth.signOut();
    } catch {
      // 무시
    }

    // 쿠키 삭제 후 로그인 페이지로 리다이렉트
    const response = NextResponse.redirect(new URL('/login', request.url));

    // 모든 인증 쿠키 삭제
    response.cookies.delete('session');
    response.cookies.delete('auth-token');
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.redirect(new URL('/login?error=로그아웃 실패', request.url));
  }
}
