# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드라인을 제공합니다.

## 프로젝트 개요

**로드나인** 게임의 길드 관리를 위한 Discord 봇입니다. 보스 스케줄 관리, 참여도 추적, 아이템 루팅 관리 등 종합적인 길드 운영 기능을 제공합니다.

### 주요 기능
- **보스 타이머**: 고정시간/리젠시간 기반 보스 스케줄 관리
- **이벤트 관리**: 길드전 등 정기 이벤트 알림
- **참여도 시스템**: 점수 기반 길드원 활동 추적
- **음성 알림**: TTS를 통한 사전 알림 (5분전, 1분전 등)
- **아이템 관리**: 루팅 이력 및 분배 관리 (확장 예정)

### 기술 스택
- `discord.js` (v14.22.1) - Discord API 라이브러리
- `dotenv` (v17.2.2) - 환경변수 관리  
- `googleapis` (v159.0.0) - Google Sheets API 연동
- `node-cron` - 스케줄링 (추가 예정)
- **TTS API** - Azure Speech Services 또는 Google Cloud TTS (추가 예정)

## 시스템 아키텍처

### 도메인 모델
```
길드 (Guild) 
├── 보스 정보 (Boss Data)
│   ├── 고정 스케줄 (매주 화,목 16:30)
│   └── 리젠 스케줄 (처치 후 N시간)
├── 이벤트 정보 (Event Data) 
│   └── 길드전 등 정기 이벤트
├── 길드원 정보 (Members)
│   ├── 권한 (관리자/일반)
│   └── 참여 점수
├── 참여 이력 (Participation History)
└── 루팅 이력 (Loot History)
```

### 폴더 구조
```
/
├── src/
│   ├── commands/
│   │   ├── text/              # !명령어 처리
│   │   │   ├── admin/         # 관리자 전용 (!보스추가, !점수설정)
│   │   │   └── user/          # 일반 사용자 (!보스, !참여, !내점수)
│   │   └── interactions/      # 모달, 버튼 처리
│   │       ├── modals/        # 복잡한 데이터 입력용
│   │       └── buttons/       # 참여 버튼 등
│   ├── handlers/
│   │   ├── messageHandler.js  # !명령어 파싱 및 라우팅
│   │   └── interactionHandler.js  # 모달/버튼 라우팅
│   ├── services/              # 비즈니스 로직
│   │   ├── bossService.js     # 보스 데이터 관리
│   │   ├── participationService.js  # 참여도 관리
│   │   ├── ttsService.js      # 음성 알림
│   │   └── googleSheetsService.js   # 데이터 저장
│   ├── utils/
│   │   ├── scheduler.js       # 스케줄 관리
│   │   ├── permissions.js     # 권한 체크
│   │   ├── messageParser.js   # 명령어 파싱
│   │   └── validator.js       # 입력 검증
│   ├── events/
│   │   ├── messageCreate.js   # 텍스트 명령어 처리
│   │   └── interactionCreate.js  # 모달/버튼 처리
│   └── config/
│       └── constants.js       # 상수 정의
├── data/                      # 로컬 캐시
└── index.js                   # 메인 파일
```

## 명령어 시스템

### 텍스트 명령어 (Prefix: `!`)
**일반 사용자:**
- `!보스` - 전체 보스 목록 및 다음 스케줄
- `!보스 [보스명]` - 특정 보스 정보  
- `!참여 [보스명]` - 보스 참여 (점수 획득)
- `!내점수` - 개인 점수 조회

**관리자 전용:**
- `!보스추가` - 보스 등록 모달 팝업
- `!보스수정 [보스명]` - 보스 정보 수정
- `!점수설정 [보스명] [점수]` - 보스별 점수 설정
- `!관리자추가 @사용자` - 관리자 권한 부여
- `!처치완료 [보스명]` - 처치 시간 기록 (리젠 계산용)

### 인터랙션 시스템
- **모달**: 복잡한 데이터 입력 (보스 추가/수정)
- **버튼**: 참여 확인, 알림 설정 등

## Google Sheets 데이터 구조

### Sheet 구성
1. **보스정보** - 보스명, 점수, 스케줄 타입, 스케줄 정보
2. **길드원정보** - 사용자ID, 닉네임, 총점수, 권한
3. **참여이력** - 참여일시, 사용자ID, 보스명, 획득점수
4. **루팅이력** - 루팅일시, 보스명, 아이템명, 획득자 (추가 예정)

## 개발 환경 설정

### 환경변수 (.env)
```
DISCORD_TOKEN=your_discord_bot_token
GOOGLE_SHEETS_API_KEY=your_google_api_key  
GOOGLE_SHEET_ID=your_spreadsheet_id
GUILD_ID=your_discord_server_id
COMMAND_PREFIX=!
```

### 개발 명령어
```bash
# 의존성 설치
npm install

# 봇 실행
node index.js

# 개발모드 (변경사항 자동 재시작)
nodemon index.js
```

## 개발 시 고려사항

### 확장성
- **멀티 길드 지원**: 복잡성이 크지 않다면 구현
- **모듈화**: 기능별 독립적인 모듈 설계
- **최신 개발 패턴**: ES6+, async/await, 에러 처리

### 성능 및 안정성
- **Discord API 레이트 리밋** 처리
- **Google Sheets API 오류** 처리 및 재시도 로직
- **정확한 스케줄링**: 한국 시간(KST) 기준
- **메모리 관리**: 50~100명 사용자 고려

### 사용자 경험
- **음성 알림**: 고품질 TTS 사용
- **직관적 UI**: 버튼, 모달 등 인터랙션 활용
- **에러 메시지**: 사용자 친화적인 한국어 메시지

## 권한 시스템

### 권한 체크 방식
봇의 관리자 명령어는 다음 3가지 방식으로 권한을 체크합니다:

1. **환경변수 사용자 ID**: `ADMIN_USER_IDS`에 등록된 사용자
2. **Discord 역할**: `ADMIN_ROLE_ID`에 지정된 역할을 가진 사용자
3. **Discord 기본 권한**: 서버 관리자(Administrator) 권한을 가진 사용자

### 환경변수 설정
```bash
# 관리자 사용자 ID (쉼표로 구분)
ADMIN_USER_IDS=123456789012345678,987654321098765432

# 관리자 역할 ID (단일 역할)
ADMIN_ROLE_ID=456789123456789123
```

### 관리자 명령어 목록
- `!시트연결확인`: Google Sheets 연결 상태 확인
- `!시트생성`: 봇 전용 시트 생성

### 권한 관리 파일
- **위치**: `src/utils/permissions.js`
- **주요 함수**:
  - `checkCommandPermission(message)`: 명령어 권한 체크
  - `getPermissionDeniedEmbed()`: 권한 부족 에러 메시지 생성

---
*이 문서는 개발 진행에 따라 지속적으로 업데이트됩니다.*