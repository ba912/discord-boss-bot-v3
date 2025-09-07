# 코드베이스 개요

## 프로젝트 정보
- **프로젝트명**: Discord Boss Bot v3
- **목적**: Road Nine 게임의 보스 일정 관리 및 참여 시스템
- **주요 기능**: 보스 알림, 컷타임 등록, 참여 관리, 점수 계산

## 핵심 시스템

### 1. 보스 알림 시스템
```javascript
// src/services/schedulerService.js
// 1분마다 실행되는 스케줄러
// - 5분전 알림: "베나투스 5분전"
// - 1분전 알림: "베나투스 1분전" + [컷 버튼]
```

### 2. 컷 버튼 시스템
```javascript
// src/commands/interactions/buttons/cutButton.js
// - 컷타임 등록 (현재 시간)
// - UI 변환: [컷 버튼] → [참여] [참여자 확인]
```

### 3. 참여 시스템
```javascript
// src/commands/interactions/buttons/participationButton.js
// - 중복 참여 체크 (캐릭터ID + 보스명 + 컷타임 기준)
// - 자동 점수 계산 및 업데이트
// - 참여 기록 저장
```

### 4. 캐릭터/계정 시스템
```javascript
// src/services/characterService.js
// - 부주 시스템 지원 (한 캐릭터에 여러 Discord 계정)
// - 캐릭터ID 기반 데이터 관리
// - 실시간 점수 계산
```

## 환경 변수 (.env)
```env
DISCORD_TOKEN=your_discord_token
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_SERVICE_ACCOUNT_PATH=service-account-key.json
NOTIFICATION_CHANNEL_ID=your_channel_id
NOTIFICATION_ENABLED=true
TZ=Asia/Seoul
```

## 주요 명령어
- `!보스일정` - 보스 리젠 일정 조회
- `!보스추가` - 관리자용 보스 추가 (모달 방식)
- `!보스목록` - 등록된 보스 목록
- `!컷 보스명 [시간]` - 컷타임 등록

## 데이터 흐름
1. **알림 발송**: schedulerService → Discord 채널
2. **컷타임 등록**: cutButton → bossService → GoogleSheets
3. **참여 처리**: participationButton → characterService → GoogleSheets
4. **점수 계산**: characterService → 실시간 합산

## 개발 가이드라인
- 모든 시간은 KST 기준 (TZ=Asia/Seoul)
- 에러 핸들링: try-catch + 사용자 친화적 메시지
- 로깅: console.log with 타임스탬프 및 성능 측정
- 권한 체크: 관리자/운영진/일반길드원 구분
- Discord 응답: 3초 내 deferReply, ephemeral 사용

## 테스트 시나리오
1. 보스 등록 → 알림 발송 → 컷타임 등록 → 참여 → 점수 확인
2. 특정요일 보스의 자동 스케줄 계산
3. 중복 참여 방지 테스트
4. 부주 계정으로 본주 캐릭터 참여