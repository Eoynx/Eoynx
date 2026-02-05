/**
 * 비밀번호 정책 및 검증 유틸리티
 * Agent Gateway 보안 요구사항에 맞는 강력한 비밀번호 정책
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number; // 0-100
}

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  minSpecialChars: number;
  minNumbers: number;
  minUppercase: number;
  minLowercase: number;
  disallowCommonPasswords: boolean;
  disallowUserInfo: boolean;
  disallowRepeatingChars: number; // 연속 반복 허용 개수 (0 = 무제한)
  disallowSequentialChars: number; // 연속 순차 문자 허용 개수 (0 = 무제한)
}

// 기본 비밀번호 정책
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  minSpecialChars: 1,
  minNumbers: 1,
  minUppercase: 1,
  minLowercase: 1,
  disallowCommonPasswords: true,
  disallowUserInfo: true,
  disallowRepeatingChars: 3, // 같은 문자 3번 연속 불가
  disallowSequentialChars: 3, // abc, 123 같은 연속 3자 이상 불가
};

// 자주 사용되는 취약한 비밀번호 목록 (Top 100 기반)
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '123456', '12345678', '123456789',
  '1234567890', 'qwerty', 'qwerty123', 'abc123', 'monkey', 'master',
  'dragon', 'letmein', 'login', 'welcome', 'admin', 'administrator',
  'passw0rd', 'p@ssw0rd', 'p@ssword', 'pass123', 'test123', 'guest',
  'iloveyou', 'sunshine', 'princess', 'football', 'baseball', 'soccer',
  'hockey', 'batman', 'superman', 'trustno1', 'shadow', 'ashley',
  'michael', 'ninja', 'mustang', 'password1!', 'qwerty1', 'zaq12wsx',
  'asdfghjkl', 'zxcvbnm', 'qwertyuiop', '1q2w3e4r', '1qaz2wsx',
  'Passw0rd', 'Password1', 'Password123', 'P@ssw0rd!', 'Admin123',
  'Welcome1', 'Changeme1', 'Summer2024', 'Winter2024', 'Spring2024',
  '비밀번호', '암호123', 'test', 'root', 'toor', 'user', 'demo',
]);

// 키보드 순차 패턴
const KEYBOARD_SEQUENCES = [
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
  '1234567890', '0987654321',
  'qazwsxedc', 'rfvtgbyhn', 'ujmik,ol.',
];

// 순차 문자 패턴
const SEQUENTIAL_CHARS = 'abcdefghijklmnopqrstuvwxyz';
const SEQUENTIAL_NUMBERS = '0123456789';

/**
 * 비밀번호 유효성 검증
 */
export function validatePassword(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
  userInfo?: { email?: string; username?: string; name?: string }
): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // 1. 길이 검증
  if (password.length < policy.minLength) {
    errors.push(`비밀번호는 최소 ${policy.minLength}자 이상이어야 합니다.`);
  } else {
    score += Math.min(25, (password.length - policy.minLength + 1) * 3);
  }

  if (password.length > policy.maxLength) {
    errors.push(`비밀번호는 최대 ${policy.maxLength}자까지 가능합니다.`);
  }

  // 2. 대문자 검증
  const uppercaseCount = (password.match(/[A-Z]/g) || []).length;
  if (policy.requireUppercase && uppercaseCount < policy.minUppercase) {
    errors.push(`대문자를 최소 ${policy.minUppercase}개 이상 포함해야 합니다.`);
  } else if (uppercaseCount > 0) {
    score += Math.min(15, uppercaseCount * 5);
  }

  // 3. 소문자 검증
  const lowercaseCount = (password.match(/[a-z]/g) || []).length;
  if (policy.requireLowercase && lowercaseCount < policy.minLowercase) {
    errors.push(`소문자를 최소 ${policy.minLowercase}개 이상 포함해야 합니다.`);
  } else if (lowercaseCount > 0) {
    score += Math.min(15, lowercaseCount * 3);
  }

  // 4. 숫자 검증
  const numberCount = (password.match(/[0-9]/g) || []).length;
  if (policy.requireNumbers && numberCount < policy.minNumbers) {
    errors.push(`숫자를 최소 ${policy.minNumbers}개 이상 포함해야 합니다.`);
  } else if (numberCount > 0) {
    score += Math.min(15, numberCount * 5);
  }

  // 5. 특수문자 검증
  const specialChars = password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g) || [];
  if (policy.requireSpecialChars && specialChars.length < policy.minSpecialChars) {
    errors.push(`특수문자(!@#$%^&*...)를 최소 ${policy.minSpecialChars}개 이상 포함해야 합니다.`);
  } else if (specialChars.length > 0) {
    score += Math.min(20, specialChars.length * 10);
  }

  // 6. 일반적인 비밀번호 검증
  if (policy.disallowCommonPasswords) {
    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.has(lowerPassword) || COMMON_PASSWORDS.has(password)) {
      errors.push('너무 일반적인 비밀번호입니다. 다른 비밀번호를 사용하세요.');
      score = Math.max(0, score - 30);
    }
  }

  // 7. 사용자 정보 포함 여부 검증
  if (policy.disallowUserInfo && userInfo) {
    const lowerPassword = password.toLowerCase();
    const infoToCheck = [
      userInfo.email?.split('@')[0],
      userInfo.username,
      userInfo.name,
    ].filter(Boolean) as string[];

    for (const info of infoToCheck) {
      if (info.length >= 3 && lowerPassword.includes(info.toLowerCase())) {
        errors.push('비밀번호에 개인 정보(이메일, 이름 등)를 포함할 수 없습니다.');
        score = Math.max(0, score - 20);
        break;
      }
    }
  }

  // 8. 연속 반복 문자 검증
  if (policy.disallowRepeatingChars > 0) {
    const repeatingPattern = new RegExp(`(.)\\1{${policy.disallowRepeatingChars - 1},}`);
    if (repeatingPattern.test(password)) {
      errors.push(`같은 문자를 ${policy.disallowRepeatingChars}번 이상 연속 사용할 수 없습니다.`);
      score = Math.max(0, score - 15);
    }
  }

  // 9. 순차 문자/숫자 검증
  if (policy.disallowSequentialChars > 0) {
    if (hasSequentialChars(password, policy.disallowSequentialChars)) {
      errors.push(`연속된 문자나 숫자(abc, 123 등)를 ${policy.disallowSequentialChars}자 이상 사용할 수 없습니다.`);
      score = Math.max(0, score - 15);
    }

    // 키보드 순차 패턴 검증
    if (hasKeyboardSequence(password, policy.disallowSequentialChars)) {
      errors.push('키보드 순서대로 나열된 문자(qwerty 등)를 사용할 수 없습니다.');
      score = Math.max(0, score - 15);
    }
  }

  // 최종 점수 조정 (0-100)
  score = Math.min(100, Math.max(0, score));

  // 강도 결정
  let strength: PasswordValidationResult['strength'];
  if (score < 30) strength = 'weak';
  else if (score < 50) strength = 'medium';
  else if (score < 80) strength = 'strong';
  else strength = 'very-strong';

  return {
    valid: errors.length === 0,
    errors,
    strength,
    score,
  };
}

/**
 * 순차 문자/숫자 포함 여부 확인
 */
function hasSequentialChars(password: string, minLength: number): boolean {
  const lower = password.toLowerCase();
  
  // 정방향 순차
  for (let i = 0; i <= lower.length - minLength; i++) {
    const substr = lower.slice(i, i + minLength);
    if (SEQUENTIAL_CHARS.includes(substr) || SEQUENTIAL_NUMBERS.includes(substr)) {
      return true;
    }
  }

  // 역방향 순차
  const reversedChars = SEQUENTIAL_CHARS.split('').reverse().join('');
  const reversedNumbers = SEQUENTIAL_NUMBERS.split('').reverse().join('');
  
  for (let i = 0; i <= lower.length - minLength; i++) {
    const substr = lower.slice(i, i + minLength);
    if (reversedChars.includes(substr) || reversedNumbers.includes(substr)) {
      return true;
    }
  }

  return false;
}

/**
 * 키보드 순차 패턴 포함 여부 확인
 */
function hasKeyboardSequence(password: string, minLength: number): boolean {
  const lower = password.toLowerCase();
  
  for (const sequence of KEYBOARD_SEQUENCES) {
    for (let i = 0; i <= sequence.length - minLength; i++) {
      const pattern = sequence.slice(i, i + minLength);
      if (lower.includes(pattern)) {
        return true;
      }
    }
    
    // 역방향도 체크
    const reversed = sequence.split('').reverse().join('');
    for (let i = 0; i <= reversed.length - minLength; i++) {
      const pattern = reversed.slice(i, i + minLength);
      if (lower.includes(pattern)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 비밀번호 강도를 색상으로 반환
 */
export function getStrengthColor(strength: PasswordValidationResult['strength']): string {
  switch (strength) {
    case 'weak': return 'text-red-500';
    case 'medium': return 'text-yellow-500';
    case 'strong': return 'text-green-500';
    case 'very-strong': return 'text-emerald-500';
    default: return 'text-gray-500';
  }
}

/**
 * 비밀번호 강도를 한글로 반환
 */
export function getStrengthLabel(strength: PasswordValidationResult['strength']): string {
  switch (strength) {
    case 'weak': return '취약';
    case 'medium': return '보통';
    case 'strong': return '강함';
    case 'very-strong': return '매우 강함';
    default: return '알 수 없음';
  }
}

/**
 * 비밀번호 정책 요구사항 목록 생성
 */
export function getPasswordRequirements(policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY): string[] {
  const requirements: string[] = [];
  
  requirements.push(`최소 ${policy.minLength}자 이상`);
  
  if (policy.requireUppercase) {
    requirements.push(`대문자 ${policy.minUppercase}개 이상`);
  }
  
  if (policy.requireLowercase) {
    requirements.push(`소문자 ${policy.minLowercase}개 이상`);
  }
  
  if (policy.requireNumbers) {
    requirements.push(`숫자 ${policy.minNumbers}개 이상`);
  }
  
  if (policy.requireSpecialChars) {
    requirements.push(`특수문자 ${policy.minSpecialChars}개 이상`);
  }
  
  return requirements;
}
