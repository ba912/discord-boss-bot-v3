# Discord 보스 타이머 봇 🎮

로드나인(Road Nine) 게임을 위한 Discord 보스 관리 봇입니다.

## 📖 문서

- **[사용 설명서](USER_GUIDE.md)** - 봇 설정 및 사용법 (일반 사용자용)
- **[개발 문서](CLAUDE.md)** - 기술 문서 및 아키텍처 (개발자용)  
- **[개발 가이드라인](DEVELOPMENT.md)** - 코딩 스타일 및 개발 규칙

## 🚀 빠른 시작

1. **환경설정**
   ```bash
   cp .env.example .env
   # .env 파일에서 Discord 토큰 및 Google Sheets 설정
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **봇 시작**
   ```bash
   npm start
   ```

4. **초기 설정**
   - Discord에서 `!시트생성` 명령어 실행 (관리자 권한 필요)
   - Google Sheets에서 길드원 정보 및 권한 설정

## 🎯 주요 기능

- ✅ **권한 관리** - Google Sheets 기반 3단계 권한 시스템
- ✅ **사용자 정보** - 개인 점수 및 권한 조회
- ✅ **시트 관리** - 자동 시트 생성 및 연결 확인
- 🚧 **보스 관리** - 보스 추가/삭제/스케줄링 (개발 중)
- 🚧 **알림 시스템** - 자동 보스 알림 (개발 중)
- 🚧 **점수 시스템** - 참여도 기반 점수 관리 (개발 중)

## 📋 명령어

### 일반 사용자
- `!명령어` - 사용 가능한 명령어 목록
- `!내정보` - 개인 정보 및 점수 확인

### 관리자 전용  
- `!시트연결확인` - Google Sheets 연결 상태 확인
- `!시트생성` - 봇 전용 시트 생성

자세한 사용법은 **[USER_GUIDE.md](USER_GUIDE.md)**를 참고하세요.

## 🛠 기술 스택

- **Node.js** + **Discord.js v14**
- **Google Sheets API** (서비스 계정 인증)
- **CommonJS** 모듈 시스템

## 📂 프로젝트 구조

```
src/
├── commands/           # 명령어 처리기
│   ├── text/          # 텍스트 기반 명령어
│   └── interactions/  # 버튼/모달 인터랙션
├── events/            # Discord 이벤트 핸들러  
├── services/          # 비즈니스 로직
├── utils/             # 유틸리티 함수
└── config/            # 설정 및 상수
```

## 🤝 기여

이 프로젝트는 길드 전용으로 개발되었습니다. 

## 📄 라이선스

MIT License

---

**문제가 발생했나요?** [USER_GUIDE.md](USER_GUIDE.md)의 문제 해결 섹션을 확인해보세요!