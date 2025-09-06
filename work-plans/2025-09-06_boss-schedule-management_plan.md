# 보스 스케줄 관리 기능 작업 계획서

**작업 일시:** 2025-09-06  
**담당자:** Claude Code  
**작업 유형:** 새로운 기능 구현

## 📋 요구사항 분석

### 사용자 요구사항
- 보스 스케줄 관리 기능 구현 필요
- 보스의 컷타임(처치시간) 관리 기능
- 리젠 시간 계산 및 표시
- 시간이 얼마 안남은 보스 순으로 정렬
- 깔끔한 표시 형태 (`{시간}\t{보스이름}`)
- 젠시간은 HH:mm 형태로 표시

### 기술적 요구사항
- 보스 컷타임 빈값 허용 (최초 등록시 유지)
- 시간마다 리젠: 컷타임 기준으로 남은 시간 계산
- 특정 요일 리젠: 다음 리젠 시간까지 남은 시간 계산
- 스케줄 노출 여부가 '노출'인 보스만 표시

## 🏗️ 기술 구조

### 1. 데이터 구조 변경
- **보스정보 시트**: 컷타임 컬럼 추가, 불필요한 컬럼 제거
  - 기존: `보스명, 점수, 리젠타입, 리젠설정, 스케줄노출여부, 등록자, 생성일시, 수정일시` (8개 컬럼)
  - 변경: `보스명, 점수, 리젠타입, 리젠설정, 스케줄노출여부, 컷타임` (6개 컬럼)
  - **제거되는 컬럼**: 등록자, 생성일시, 수정일시 (관리상 불필요)

### 2. 구현할 컴포넌트
```
src/services/
├── bossScheduleService.js    # 스케줄 계산 로직
├── bossService.js           # 기존 보스 관리 (컷타임 추가)
└── googleSheetsService.js   # 시트 구조 업데이트

src/commands/text/user/
└── bossSchedule.js          # !보스스케줄 명령어

src/commands/text/admin/
└── bossCutTime.js           # !컷타임 명령어 (관리자용)
```

## 🎯 구현 계획

### Phase 1: 데이터 구조 변경 (1단계)
1. **보스정보 시트 구조 업데이트**
   - 컷타임 컬럼 추가 
   - 등록자, 생성일시, 수정일시 컬럼 제거
   - Google Sheets 헤더 업데이트: 8개 → 6개 컬럼

2. **사이드 이펙트 해결**
   - bossService.js: addBoss() 파라미터 조정, 반환 객체 수정
   - bossModal.js: registrar 파라미터 제거  
   - googleSheetsService.js: 배열 인덱스 조정 (row[5]→row[3], row[6]→row[4], row[7]→row[5])
   - formatBossInfoForDiscord(): 등록자/일시 필드 제거

### Phase 2: 스케줄 계산 로직 (2단계)
3. **보스 스케줄 계산 서비스 구현**
   - 시간마다 리젠 계산 로직
   - 특정 요일 리젠 계산 로직
   - **정렬 우선순위**: 
     1. 컷타임이 있는 보스: 가장 빨리 젠되는 시간 순
     2. 컷타임이 없는 보스: 가장 아래로 (계산 불가능)

### Phase 3: 사용자 인터페이스 (3단계)  
4. **!보스일정 명령어 구현**
   - 노출 설정된 보스만 조회
   - 깔끔한 테이블 형태 표시 (HH:mm \t 보스이름)
   - 컷타임 있는 보스 우선, 없는 보스는 아래

5. **!컷 관리자 명령어 구현**
   - `!컷`: 현재 시간으로 컷타임 설정
   - `!컷 HHMM`: 오늘 해당 시간으로 설정  
   - `!컷 MMDDHHMM`: 해당 월일시간으로 설정
   - 즉시 피드백 제공

## 📋 단계별 진행 방식
- **1단계 완료 후 검토**: 데이터 구조 변경 및 사이드 이펙트 해결
- **2단계 검토 후 진행**: 스케줄 계산 로직 구현  
- **3단계 검토 후 진행**: 명령어 구현

## 📊 데이터 플로우

```
1. 관리자가 !컷 명령어로 보스 처치시간 기록
   - !컷: 현재 시간
   - !컷 HHMM: 오늘 해당 시간  
   - !컷 MMDDHHMM: 해당 월일시간
   ↓
2. bossScheduleService.updateCutTime() 호출
   ↓  
3. Google Sheets에 컷타임 저장
   ↓
4. 사용자가 !보스일정 명령어 실행
   ↓
5. bossScheduleService에서 리젠시간 계산
   ↓
6. 정렬: 컷타임 있는 보스(시간순) → 컷타임 없는 보스
```

## 🔧 리젠 계산 로직

### 시간마다 리젠
```javascript
// 예: 3시간마다 리젠, 컷타임: 2025-09-06 14:30
if (cutTime) {
  const nextRegen = cutTime + regenHours
  const remainingTime = nextRegen - now
} else {
  // 컷타임 없음 → 가장 아래로
}
```

### 특정 요일 리젠  
```javascript
// 예: 화,목,토 21:00 리젠 (컷타임 무관)
const nextRegenDays = getNextOccurrence(['화','목','토'], '21:00')
const remainingTime = nextRegenDays - now
```

### 정렬 로직
```javascript
schedules.sort((a, b) => {
  // 1. 컷타임 있는 보스가 위로
  if (a.hasSchedule && !b.hasSchedule) return -1;
  if (!a.hasSchedule && b.hasSchedule) return 1;
  
  // 2. 둘 다 스케줄 있으면 시간 순
  if (a.hasSchedule && b.hasSchedule) {
    return a.remainingMs - b.remainingMs;
  }
  
  // 3. 둘 다 없으면 이름 순
  return a.bossName.localeCompare(b.bossName);
});
```

## ✅ 완료 기준

1. **기능 완전성**
   - [ ] 모든 리젠 타입에서 정확한 시간 계산
   - [ ] 컷타임 빈값 처리
   - [ ] 스케줄 노출 설정 준수

2. **사용자 경험**
   - [ ] 깔끔한 테이블 형태 출력
   - [ ] 즉시 피드백 제공  
   - [ ] 에러 처리

3. **코드 품질**
   - [ ] 기존 코드 스타일 준수
   - [ ] 에러 핸들링
   - [ ] 로깅

## 🚨 주의사항

- **1단계**: 컬럼 제거 시 기존 데이터 보존, 모든 관련 코드 인덱스 조정 필수
- 기존 보스 데이터 호환성 유지
- 컷타임이 없는 보스도 정상 표시되어야 함
- 한국 시간대 기준으로 계산
- 이모티콘 덕지덕지 붙이지 말고 깔끔하게 표시

## 🔍 사이드 이펙트 상세 분석

### 영향받는 파일 및 수정사항
1. **bossService.js**:
   - `addBoss(bossData, registrar)` → `addBoss(bossData)` (registrar 파라미터 제거)
   - `getBossList()` 반환 객체에서 `registrar`, `createdAt`, `updatedAt` 필드 제거
   - `getBossByName()` 반환 객체에서 동일 필드 제거
   - `formatBossInfoForDiscord()` 임베드에서 등록자/일시 필드 제거

2. **googleSheetsService.js**:
   - 헤더 정의 수정: 8개 → 6개 컬럼
   - `getBossList()` 매핑: row[5]→row[3] (cutTime), row[6,7,8] 제거
   - `getBossByName()` 매핑: 동일 인덱스 조정
   - `updateBoss()` 메서드: 배열 크기 및 인덱스 조정

3. **bossModal.js**:
   - `addBoss()` 호출 시 registrar 파라미터 제거
   - 등록자 정보 수집 코드 제거

## 📝 검증 계획

1. **단위 테스트**
   - 시간 계산 로직 정확성 검증
   - 다양한 리젠 타입별 테스트

2. **통합 테스트**  
   - Google Sheets 연동 테스트
   - 명령어 실행 테스트

3. **사용자 시나리오 테스트**
   - 컷타임 등록 → 스케줄 조회 플로우
   - 빈 컷타임 처리 확인