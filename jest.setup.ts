import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// TextEncoder/TextDecoder polyfill
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// 전역 fetch mock
global.fetch = jest.fn();

// 환경 변수 설정
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-minimum-32-chars';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// jose 모듈 mock
jest.mock('jose', () => ({
  SignJWT: jest.fn().mockImplementation((payload) => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    setJti: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue(`mock.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`),
  })),
  jwtVerify: jest.fn().mockImplementation(async (token) => {
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'mock') {
      throw new Error('Invalid token');
    }
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return { payload };
    } catch {
      throw new Error('Invalid token');
    }
  }),
}));

// console.error 억제 (필요시)
// jest.spyOn(console, 'error').mockImplementation(() => {});

// 각 테스트 후 mock 리셋
beforeEach(() => {
  jest.clearAllMocks();
});
