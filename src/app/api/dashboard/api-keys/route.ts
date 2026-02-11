/**
 * API 키 관리 엔드포인트
 * 사용자별 API 키의 생성, 조회, 삭제 기능
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'edge';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-for-development-only'
);

// 사용자 인증 헬퍼
async function authenticateUser(request: NextRequest): Promise<{ userId: string } | null> {
  const token = request.cookies.get('session')?.value || request.cookies.get('auth-token')?.value;
  
  if (!token) return null;
  
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { userId: payload.sub as string };
  } catch {
    return null;
  }
}

// API 키 해시 생성 (SHA-256)
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 안전한 API 키 생성
function generateApiKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const key = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  return `eoynx_${key}`;
}

/**
 * GET /api/dashboard/api-keys - API 키 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('user_api_keys')
      .select('id, name, key_prefix, created_at, last_used_at, expires_at, revoked_at')
      .eq('user_id', auth.userId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('API keys fetch error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch API keys' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('API keys error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/api-keys - 새 API 키 생성
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, expiresIn } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    // API 키 생성
    const apiKey = generateApiKey();
    const keyPrefix = apiKey.substring(0, 12) + '...';
    const keyHash = await hashApiKey(apiKey);

    // 만료 시간 계산
    let expiresAt = null;
    if (expiresIn) {
      const expires = new Date();
      expires.setDate(expires.getDate() + expiresIn);
      expiresAt = expires.toISOString();
    }

    const supabase = getSupabaseAdmin();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('user_api_keys')
      .insert({
        user_id: auth.userId,
        name: name.trim(),
        key_prefix: keyPrefix,
        key_hash: keyHash,
        expires_at: expiresAt,
      })
      .select('id, name, key_prefix, created_at, expires_at')
      .single();

    if (error) {
      console.error('API key creation error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create API key' },
        { status: 500 }
      );
    }

    // 원본 키는 이 응답에서만 반환 (저장되지 않음)
    return NextResponse.json({
      success: true,
      data: {
        ...data,
        apiKey, // 원본 키 (한 번만 표시)
      },
      message: 'API key created successfully. Save this key - it will not be shown again.',
    });
  } catch (error) {
    console.error('API key creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dashboard/api-keys - API 키 삭제 (revoke)
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json(
        { success: false, error: 'Key ID is required' },
        { status: 400 }
      );
    }

    console.log('[API Keys] DELETE request:', { keyId, userId: auth.userId });

    const supabase = getSupabaseAdmin();
    
    // 먼저 키가 존재하는지 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingKey, error: findError } = await (supabase as any)
      .from('user_api_keys')
      .select('id, user_id, revoked_at')
      .eq('id', keyId)
      .single();

    console.log('[API Keys] Existing key:', existingKey, 'Error:', findError);

    if (findError || !existingKey) {
      return NextResponse.json(
        { success: false, error: 'API key not found' },
        { status: 404 }
      );
    }

    // 소유권 확인
    if (existingKey.user_id !== auth.userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to delete this key' },
        { status: 403 }
      );
    }

    // 이미 취소된 키인지 확인
    if (existingKey.revoked_at) {
      return NextResponse.json(
        { success: false, error: 'API key already revoked' },
        { status: 400 }
      );
    }

    // revoke 실행
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('user_api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', keyId);

    console.log('[API Keys] Update error:', updateError);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Failed to revoke API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    console.error('API key deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
