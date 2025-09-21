# Discord 인터랙션 에러 해결 가이드

## 개요
Discord 봇에서 발생하던 인터랙션 에러(40060, 10062)를 해결하고 안정성을 개선한 작업 내용입니다.

## 발생했던 문제

### 1. Discord API 레이트 리밋 문제
- **현상**: 동시에 여러 보스 알림 발송 시 일부 인터랙션 실패
- **원인**: 스케줄러에서 보스 루프 시 API 호출이 동시에 집중됨
- **에러**: `40060 (already acknowledged)`, `10062 (unknown interaction)`

### 2. 비즈니스 로직 실행 실패
- **현상**: 인터랙션 에러 발생 시 점검모드 해제가 안됨
- **원인**: 인터랙션 응답 실패 시 early return으로 핵심 로직 미실행
- **영향**: 점검모드가 해제되지 않아 수동 개입 필요

## 해결 방안

### 1. API 레이트 리밋 방지 (schedulerService.js)

**문제 코드:**
```javascript
// 동시에 모든 보스 알림 발송
for (const boss of fiveMinuteWarnings) {
  const sent = await this.sendNotificationIfNew(boss.bossName, boss.nextRegen, '5분전', true);
  if (sent) notificationCount++;
}
```

**해결 코드:**
```javascript
// 200ms 지연으로 순차 발송
for (let i = 0; i < fiveMinuteWarnings.length; i++) {
  const boss = fiveMinuteWarnings[i];
  const sent = await this.sendNotificationIfNew(boss.bossName, boss.nextRegen, '5분전', true);
  if (sent) notificationCount++;

  // 다음 알림까지 200ms 지연 (레이트 리밋 방지)
  if (i < fiveMinuteWarnings.length - 1) {
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}
```

**적용 범위:**
- 점검 모드: 5분전/1분전 알림
- 일반 모드: 개별 보스 알림
- 모든 알림 발송에 200ms 간격 적용

### 2. 비즈니스 로직과 인터랙션 응답 분리 (cutButton.js)

**문제 구조:**
```javascript
// 인터랙션 응답 → 비즈니스 로직 순서
if (interaction.replied || interaction.deferred) {
  return; // ← 여기서 끝나면 점검모드 해제 안됨
}

await interaction.deferUpdate();
await bossService.updateBoss(); // 실행 안됨
await maintenanceService.deactivateMaintenanceMode(); // 실행 안됨
```

**해결 구조:**
```javascript
// 비즈니스 로직 → 인터랙션 응답 순서
// === 핵심 비즈니스 로직 (반드시 실행) ===
await bossService.updateBoss(bossName, { cutTime: cutTimeString });
await maintenanceService.deactivateMaintenanceMode(); // 점검모드 해제 보장

// === 인터랙션 응답 (실패해도 됨) ===
if (interaction.replied || interaction.deferred) {
  console.log('비즈니스 로직은 완료됨');
  return;
}
try {
  await interaction.deferUpdate();
} catch (error) {
  console.warn('인터랙션 실패하지만 비즈니스 로직은 완료됨');
  return;
}
```

### 3. 참여 버튼 안정성 강화 (participationButton.js)

**추가된 안전 장치:**
```javascript
// 중복 처리 방지
if (interaction.replied || interaction.deferred) {
  console.log('인터랙션이 이미 처리됨, 무시');
  return;
}

// 에러 코드별 처리
try {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
} catch (deferError) {
  if (deferError.code === 40060) {
    console.log('인터랙션이 이미 acknowledged됨, 무시');
    return;
  }
  throw deferError;
}
```

## 기대 효과

### 1. 안정성 개선
- **API 레이트 리밋**: 200ms 지연으로 동시 호출 방지
- **점검모드 해제**: 인터랙션 실패와 무관하게 보장
- **에러 처리**: 40060, 10062 에러에 대한 적절한 대응

### 2. 사용자 경험 개선
- **버튼 응답성**: 인터랙션 중복 처리 방지로 더 안정적인 응답
- **점검모드**: 첫 컷 등록 시 자동 해제 보장
- **에러 메시지**: 사용자에게 적절한 피드백 제공

### 3. 운영 편의성
- **자동화**: 수동 개입 없이 점검모드 해제
- **로깅**: 상세한 에러 로그로 디버깅 용이
- **복구**: 인터랙션 실패 시에도 데이터 일관성 유지

## 테스트 방법

### 1. 동시 알림 테스트
```bash
# 여러 보스가 동시에 알림되는 시간대에 확인
# 로그에서 200ms 지연 확인
[스케줄러] 알림 발송 완료: 베나투스 5분전
[지연] 200ms 대기
[스케줄러] 알림 발송 완료: 에고 5분전
```

### 2. 점검모드 해제 테스트
```bash
# 점검모드 활성화 후 컷 버튼 클릭
!점검 활성화
# 1분전 알림에서 컷 버튼 클릭
# 인터랙션 실패해도 점검모드 해제 확인
```

### 3. 중복 클릭 테스트
```bash
# 참여 버튼을 빠르게 여러 번 클릭
# "이미 처리됨" 로그 확인
# 중복 참여 방지 확인
```

## 모니터링 지표

### 1. 에러 감소
- **40060 에러**: 중복 처리 방지로 감소 예상
- **10062 에러**: 여전히 발생 가능하지만 기능적 영향 최소화

### 2. 성능 개선
- **알림 발송 시간**: 200ms × 보스 수만큼 증가하지만 안정성 확보
- **점검모드 해제**: 100% 보장

### 3. 사용자 만족도
- **버튼 응답성**: 개선된 인터랙션 처리
- **자동화**: 수동 개입 감소

---

## 기술적 세부사항

### API 레이트 리밋 정책
- Discord API: 초당 50회 요청 제한
- 구현: 200ms 지연으로 초당 5회로 제한하여 여유 확보

### 에러 코드 의미
- **40060**: Interaction has already been acknowledged
- **10062**: Unknown interaction (15분 후 만료)

### 비즈니스 로직 분리 원칙
1. **데이터 일관성**: 먼저 실행
2. **사용자 피드백**: 나중에 실행
3. **에러 격리**: 각각 독립적으로 처리

*작업 완료일: 2025-09-21*