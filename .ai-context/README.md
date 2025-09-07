# AI Context System

이 디렉토리는 AI 도구 간의 매끄러운 작업 전환을 위한 컨텍스트 시스템입니다.

## 🎯 목적
- Claude Code ↔ Cursor ↔ 기타 AI 도구 간 매끄러운 전환
- 작업 컨텍스트 손실 방지
- 일관된 개발 환경 제공

## 📁 파일 구조

### `current-work.md` 
**가장 중요한 파일** - 현재 작업 상황
- 방금 완료한 작업
- 다음에 할 작업 
- 현재 시스템 상태
- 주의사항 및 이슈

### `codebase-overview.md`
프로젝트 전체 구조와 핵심 시스템 설명
- 주요 기능별 코드 위치
- 데이터 흐름
- 개발 가이드라인

### `ai-session-start.md`
AI가 새 세션을 시작할 때의 체크리스트
- 필수 확인 사항
- 환경 설정 체크
- 작업 시작 전 준비사항

### `status.sh`
현재 상태를 빠르게 파악하는 스크립트
```bash
./.ai-context/status.sh
```

## 🔄 사용법

### AI 세션 시작 시
1. `status.sh` 실행으로 현재 상태 파악
2. `current-work.md` 읽어서 작업 컨텍스트 이해
3. 필요시 `codebase-overview.md`로 전체 구조 파악
4. `ai-session-start.md`의 체크리스트 확인

### 작업 완료 시
1. `current-work.md` 업데이트
   - "방금 완료한 작업"에 완료 내용 추가
   - "다음에 할 작업" 업데이트
   - 새로운 이슈나 주의사항 추가

### Git 커밋 시 
커밋 메시지에 컨텍스트 정보 포함:
```
feat: implement boss notification system

CONTEXT: Working on automated boss alerts
NEXT: Need to add participation tracking
AI-NOTES: Scheduler runs every 1 minute, uses KST timezone
```

## 🚨 중요 규칙

1. **상태 파일 최신화**: 작업 후 반드시 `current-work.md` 업데이트
2. **명확한 기록**: 다음 AI가 이해할 수 있게 구체적으로 작성
3. **이슈 추적**: 문제점이나 주의사항은 반드시 기록
4. **일관성**: 기존 패턴과 스타일 유지

## 💡 팁

- 복잡한 작업은 단계별로 세분화해서 기록
- 에러나 해결책은 구체적으로 문서화
- 테스트 결과나 확인 사항도 기록
- 다음 작업자가 바로 이해할 수 있게 작성