# Discord 보스 타이머 봇 - AI Context

## 🎯 프로젝트 개요
로드나인(Road Nine) 게임용 Discord 보스 관리 봇입니다. **캐릭터 중심 시스템**으로 설계되어 본주/부주 계정을 지원합니다.

## 📊 핵심 데이터 구조 (Google Sheets)
- **보탐봇-캐릭터정보**: ID 기반 캐릭터 관리 (핵심 시트)
- **보탐봇-계정정보**: Discord 계정과 캐릭터 연결 (본주/부주)
- **보탐봇-참여이력**: 컷타임 기반 참여 기록 (중복 체크)
- **보탐봇-보스정보**: 보스 스케줄 및 컷타임 관리
- **보탐봇-설정**: 봇 동작 설정값

## 🔑 핵심 설계 원칙
1. **캐릭터 중심**: 사용자가 아닌 캐릭터가 기본 단위
2. **ID 기반**: 모든 캐릭터는 고유 숫자 ID를 가짐
3. **수식 동기화**: 캐릭터명 변경 시 모든 시트에 자동 반영
4. **컷타임 정확성**: 보스 참여는 정확한 컷타임 기준으로 관리
5. **멀티 계정**: 같은 캐릭터에 여러 Discord 계정 연결 가능

## 📁 주요 파일 구조
```
src/
├── services/
│   ├── characterService.js      # 캐릭터 비즈니스 로직 (핵심)
│   ├── googleSheetsService.js   # Google Sheets API 통합
│   ├── bossService.js           # 보스 관리 로직
│   └── schedulerService.js      # 알림 스케줄러
├── commands/text/               # 텍스트 명령어
├── commands/interactions/       # 버튼/모달 인터랙션
├── config/constants.js          # 시트 구조 정의
└── utils/permissions.js         # 권한 체계
```

## 💾 인증 설정 (통일)
로컬/클라우드 모두 **GOOGLE_SERVICE_ACCOUNT_JSON** 환경변수 사용:
```bash
# 한 줄 JSON 변환 명령어
cat service-account-key.json | jq -c .
```

## 🔧 주요 명령어
- **일반**: !내정보, !닉네임변경, !보스목록, !보스일정, !컷
- **운영진**: !보스추가, !계정추가
- **관리자**: !보스삭제, !시트동기화 (숨겨진: !시트생성, !시트연결확인)

## ⚠️ 중요 주의사항
1. **!시트동기화**: 모든 데이터 구조 문제를 해결하는 핵심 명령어
2. **캐릭터ID**: 문자열/숫자 타입 변환에 주의 (String() 사용)
3. **참여 중복체크**: bossName + cutTime + characterId 조합
4. **권한 체크**: characterService 우선, 레거시 fallback
5. **Mutex 시스템**: 동시 참여 버튼 클릭 시 경합 방지

## 🚨 최근 주요 변경사항
- 환경변수 통일 (로컬/클라우드 동일)
- 명령어 도움말 간소화
- !운영진가이드 명령어 삭제
- !계정추가 권한을 운영진으로 하향
- 컷타임 기반 중복 체크 구현
- TTS 음성 알림 시스템 추가
- 동시 참여 방지 뮤텍스 추가

## 📋 개발 원칙
- 한국어 주석 사용
- 에러 핸들링 철저히
- 로그 메시지 명확히
- 사이드 이펙트 최소화
- 기존 명령어 재활용 우선

## 🎯 현재 상태: 완성도 95%
모든 핵심 기능 구현 완료. 안정적인 운영 가능한 상태.

## 🚀 배포 후 개발 가이드라인 (중요!)

### 브랜치 전략
**⚠️ main 브랜치 직접 수정 금지 - 모든 작업은 브랜치에서!**

```bash
# 새 기능/수정 작업 시
git checkout -b feature/기능명
git checkout -b fix/버그명  
git checkout -b hotfix/긴급수정명

# 작업 완료 후
git add .
git commit -m "feat: 새 기능 추가"
git push origin feature/기능명
# → Pull Request 생성 → 코드 리뷰 → 병합
```

### 배포 환경
- **main**: 프로덕션 (Cloudtype 자동 배포) 🔒
- **feature/***: 개별 기능 브랜치 ✅

### 브랜치 네이밍
- `feature/boss-notification-v2` - 새 기능
- `fix/participation-duplicate` - 버그 수정
- `hotfix/critical-crash` - 긴급 수정
- `docs/update-guide` - 문서 업데이트

---

## 📚 추가 문서
- **[USER_GUIDE.md](USER_GUIDE.md)**: 상세한 사용법 (일반 사용자용)
- **[DEVELOPMENT.md](DEVELOPMENT.md)**: 개발 가이드라인
- **[CLAUDE.md](CLAUDE.md)**: 기술 문서 및 아키텍처
- **[work-logs/](work-logs/)**: 개발 작업 이력
- **[work-plans/](work-plans/)**: 작업 계획서들
