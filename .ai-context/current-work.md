# 현재 작업 상태

## 방금 완료한 작업 (2025-09-07)
- ✅ **TTS 시스템 구현 완료**: ResponsiveVoice 단일 제공자로 간소화
- ✅ **음성 채널 서비스**: Discord 음성 채널 자동 참여/퇴장, 오디오 재생, 대기열 관리
- ✅ **스케줄러 TTS 통합**: 보스 5분전/1분전 알림 시 자동 음성 안내
- ✅ **무료 TTS 제공자**: ResponsiveVoice 완전 무료, 한국어 여성 음성 지원
- ✅ **TTS 관리 명령어**: !tts 명령어로 테스트, 상태 확인, 음성 재생 등
- ✅ **!말 명령어**: 수동 TTS 테스트용 명령어, 스케줄러와 동일한 음성 재생
- ✅ **코드 정리**: 사용하지 않는 TTS 제공자들 제거, 코드 간소화
- ✅ **보탐봇-설정 시트**: 참여 제한 시간 등 봇 설정 관리 시트 구현
- ✅ **채널 제한 시스템**: NOTIFICATION_CHANNEL_ID 채널에서만 명령어 실행 가능

## 다음에 할 작업
- [ ] **참여 버튼 제한 시간 적용**: 컷 후 N분간만 참여 버튼 활성화 로직 구현
- [ ] **이벤트 시스템 설계**: 길드전 등 다양한 이벤트 지원 구조

## 현재 시스템 상태
- **보스 알림 시스템**: ✅ 완료 (1분 스케줄러, 5분전/1분전 알림, 컷버튼, 참여/참여자확인 버튼)
- **TTS 음성 시스템**: ✅ 완료 (ResponsiveVoice 단일 제공자, 완전 무료, 한국어 여성 음성, 오디오 캐시 시스템)
- **참여 시스템**: ✅ 완료 (캐릭터/계정 분리, 부주 시스템 지원, 점수 자동 계산)
- **보스 등록 시스템**: ✅ 완료 (시간마다/특정요일 리젠 지원)
- **스케줄 조회 시스템**: ✅ 완료 (특정요일 보스도 올바른 다음 리젠 시간 표시)
- **설정 관리 시스템**: ✅ 완료 (보탐봇-설정 시트, 참여 제한 시간 등 봇 설정 관리)
- **보안 시스템**: ✅ 완료 (지정된 채널에서만 명령어 실행, 권한 관리)

## 주요 파일 구조
```
src/
├── commands/interactions/buttons/
│   ├── cutButton.js           # 컷 버튼 (컷타임 등록 + UI 변환)
│   ├── participationButton.js # 참여 버튼 (참여 기록 + 점수 업데이트)
│   └── participantListButton.js # 참여자 확인 버튼
├── services/
│   ├── schedulerService.js    # 1분 스케줄러 (알림 발송 + TTS 통합)
│   ├── bossScheduleService.js # 리젠 시간 계산
│   ├── characterService.js    # 캐릭터/계정 관리
│   ├── bossService.js        # 보스 정보 관리
│   ├── googleSheetsService.js # Google Sheets 연동
│   ├── voiceChannelService.js # Discord 음성 채널 관리
│   └── tts/                   # TTS 시스템
│       ├── ttsService.js      # TTS 메인 서비스 (ResponsiveVoice 통합)
│       ├── audioCache/        # TTS 오디오 캐시 디렉토리 (24시간 자동 정리)
│       └── providers/         # TTS 제공자 구현
│           └── responsiveVoiceTTS.js # ResponsiveVoice TTS (유일한 제공자)
├── commands/interactions/bossModal.js # 보스 등록 모달
├── commands/text/admin/tts.js # TTS 관리 명령어
├── commands/text/admin/speak.js # !말 명령어 (TTS 테스트용)
├── commands/text/admin/sheetInit.js # !시트생성 명령어
└── commands/text/admin/sheetSync.js # !시트동기화 명령어
```

## 주의사항
- **시간대**: TZ=Asia/Seoul 설정으로 KST 자동 처리
- **특정요일 보스**: 컷타임 없이도 다음 리젠 시간 계산 가능
- **참여 시스템**: 캐릭터ID 기반으로 중복 참여 체크 (컷타임 기준)
- **부주 시스템**: 한 캐릭터에 여러 Discord 계정 연결 가능
- **TTS 시스템**: ResponsiveVoice 완전 무료 사용, 추가 비용 없음
- **오디오 캐시**: 생성된 TTS 파일 자동 캐시 (성능 최적화, 24시간 자동 정리)
- **음성 채널**: ffmpeg 의존성 필요, 봇이 음성 채널 참여 권한 필요

## 현재 이슈
- **TTS 테스트 필요**: 실제 환경에서 ResponsiveVoice TTS 설정 및 동작 확인 필요
- **!말 명령어 추가**: TTS 테스트를 위한 수동 음성 재생 명령어 구현 완료

## TTS 시스템 설정 방법 (무료 버전)
1. .env 파일에 다음 변수 설정 (기본값으로 바로 사용 가능):
   ```env
   TTS_PROVIDER=responsivevoice
   TTS_VOICE_CHANNEL_ID=음성채널ID
   RESPONSIVEVOICE_RATE=0.8
   ```
2. !tts status 명령어로 설정 확인
3. !tts test 명령어로 동작 테스트

### TTS 제공자
- **ResponsiveVoice** (완전 무료, 게임 길드 최적화): 한국어 여성 음성, 속도 조절 가능

## 데이터베이스 구조 (Google Sheets)
- `보탐봇-보스정보`: 보스 정보 (이름, 점수, 리젠타입, 리젠설정, 노출여부, 컷타임)
- `보탐봇-캐릭터정보`: 캐릭터 정보 (ID, 캐릭터명, 총점수, 생성일시, 수정일시)
- `보탐봇-계정정보`: 계정 정보 (사용자ID, 닉네임, 태그, 캐릭터ID, 캐릭터명, 권한, 계정유형)
- `보탐봇-참여이력`: 참여 기록 (참여일시, 캐릭터ID, 캐릭터명, 실제참여자ID, 보스명, 획득점수, 컷타임)