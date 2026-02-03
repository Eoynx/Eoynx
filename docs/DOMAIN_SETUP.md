# Eoynx 커스텀 도메인 설정 가이드

## 📍 현재 상태
- **Vercel 도메인:** eoynx.vercel.app ✅ (활성화)
- **커스텀 도메인:** eoynx.com ⏳ (DNS 설정 필요)

## 🔧 DNS 설정 방법

### 옵션 A: A 레코드 설정 (권장)

호스팅 업체(hosting.co.kr) DNS 관리에서 다음 레코드를 추가하세요:

| 타입 | 호스트 | 값 | TTL |
|------|--------|-----|-----|
| **A** | `@` 또는 빈칸 | `76.76.21.21` | 3600 (또는 자동) |
| **A** | `www` | `76.76.21.21` | 3600 (또는 자동) |

### 옵션 B: CNAME 설정 (대안)

| 타입 | 호스트 | 값 | TTL |
|------|--------|-----|-----|
| **CNAME** | `www` | `cname.vercel-dns.com` | 3600 |
| **A** | `@` | `76.76.21.21` | 3600 |

> ⚠️ 루트 도메인(@)에는 CNAME을 사용할 수 없으므로 A 레코드를 사용해야 합니다.

## 📝 hosting.co.kr 설정 단계

1. [hosting.co.kr](https://hosting.co.kr) 로그인
2. **도메인 관리** → **eoynx.com** 선택
3. **DNS 관리** 또는 **네임서버 설정** 메뉴
4. 기존 A 레코드가 있다면 삭제 또는 수정
5. 위의 A 레코드 추가
6. 저장 후 최대 48시간 대기 (보통 몇 분 ~ 몇 시간)

## ✅ 확인 방법

```bash
# DNS 전파 확인
nslookup eoynx.com
# 또는
dig eoynx.com

# 예상 결과:
# Address: 76.76.21.21
```

```bash
# Vercel 도메인 상태 확인
vercel domains ls
vercel domains inspect eoynx.com
```

## 🌐 SSL 인증서

Vercel이 자동으로 Let's Encrypt SSL 인증서를 발급합니다.
- DNS 설정 완료 후 자동 발급 (몇 분 소요)
- `https://eoynx.com` 자동 활성화

## 🔄 리다이렉트 설정

vercel.json에 다음을 추가하면 www → 루트 도메인 리다이렉트:

```json
{
  "redirects": [
    {
      "source": "/(.*)",
      "has": [{ "type": "host", "value": "www.eoynx.com" }],
      "destination": "https://eoynx.com/$1",
      "permanent": true
    }
  ]
}
```

## 🚨 문제 해결

### DNS 전파가 안 되는 경우
- 최대 48시간 대기
- DNS 캐시 삭제: `ipconfig /flushdns` (Windows)
- [DNS Checker](https://dnschecker.org) 에서 전파 상태 확인

### SSL 인증서 오류
- DNS 설정이 올바른지 확인
- Vercel 대시보드에서 도메인 상태 확인
- 24시간 대기 후 재시도

### "Domain not verified" 오류
- TXT 레코드 추가 필요할 수 있음
- `vercel domains verify eoynx.com` 실행

## 📊 현재 DNS 상태

```
현재 네임서버 (hosting.co.kr):
- ns1.hosting.co.kr
- ns2.hosting.co.kr
- ns3.hosting.co.kr
- ns4.hosting.co.kr

→ A 레코드만 추가하면 됨 (네임서버 변경 불필요)
```

---

DNS 설정 완료 후 Vercel이 자동으로 확인 이메일을 보내드립니다.
