import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import { validatePassword, DEFAULT_PASSWORD_POLICY } from '@/lib/auth/password-policy';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    // 필수 필드 검증
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: '모든 필드를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // 이름 길이 검증
    if (name.length < 2 || name.length > 50) {
      return NextResponse.json(
        { error: '이름은 2자 이상 50자 이하로 입력해주세요.' },
        { status: 400 }
      );
    }

    // 비밀번호 정책 검증
    const passwordValidation = validatePassword(password, DEFAULT_PASSWORD_POLICY, {
      email,
      name,
    });

    if (!passwordValidation.valid) {
      return NextResponse.json(
        { 
          error: passwordValidation.errors[0],
          errors: passwordValidation.errors,
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    
    // Supabase Auth로 회원가입
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          full_name: name,
        },
        // 이메일 인증 후 리다이렉트 URL
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login?verified=true`,
      },
    });

    if (error) {
      // 일반적인 에러 메시지로 변환
      let errorMessage = '회원가입에 실패했습니다.';
      
      if (error.message.includes('User already registered')) {
        errorMessage = '이미 가입된 이메일입니다.';
      } else if (error.message.includes('Password')) {
        errorMessage = '비밀번호가 보안 요구사항을 충족하지 않습니다.';
      } else if (error.message.includes('Email')) {
        errorMessage = '이메일 형식이 올바르지 않습니다.';
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: '회원가입에 실패했습니다.' },
        { status: 400 }
      );
    }

    // 사용자 프로필 테이블에 추가 정보 저장 (있는 경우)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      await sb.from('profiles').insert({
        id: data.user.id,
        email: data.user.email,
        name,
        created_at: new Date().toISOString(),
      });
    } catch {
      // 프로필 테이블이 없어도 회원가입은 성공으로 처리
      console.log('Profile table not available, skipping profile creation');
    }

    return NextResponse.json({
      success: true,
      message: '회원가입이 완료되었습니다. 이메일을 확인해주세요.',
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
