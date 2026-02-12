import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth/jwt-config';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // session 쿠키 먼저 확인 (OAuth 로그인), 없으면 auth-token 확인 (이메일 로그인)
    const token = request.cookies.get('session')?.value || request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // JWT 토큰 검증 및 디코딩
    const result = await verifySessionToken(token);
    
    if (!result.valid) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: result.userId,
        email: result.email,
      },
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}
