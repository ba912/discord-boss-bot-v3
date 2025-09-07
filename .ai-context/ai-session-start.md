# 🤖 AI 세션 시작 가이드

## 필수 체크리스트 (AI가 새 세션을 시작할 때)

### 1. 프로젝트 파악하기
- [ ] `.ai-context/current-work.md` - 현재 작업 상황 확인
- [ ] `.ai-context/codebase-overview.md` - 코드베이스 전체 구조 파악
- [ ] `CLAUDE.md` - 개발 가이드 및 명령어 확인

### 2. 현재 상태 확인하기
```bash
# 최근 커밋 확인
git log --oneline -5

# 변경된 파일 확인  
git status

# 브랜치 상태 확인
git branch -v
```

### 3. 환경 설정 확인
- [ ] `.env` 파일 존재 여부
- [ ] `package.json` 의존성 확인
- [ ] Node.js 버전: v18+ 권장

### 4. 작업 시작 전 확인사항
- 현재 진행 중인 이슈가 있는지 체크
- 테스트가 필요한 기능이 있는지 확인
- 사용자가 별도 요청사항이 있는지 확인

## 🚨 중요 규칙

1. **컨텍스트 우선**: 사용자가 요청하기 전에 먼저 현재 상황을 파악
2. **상태 업데이트**: 작업 완료 후 `current-work.md` 업데이트
3. **일관성 유지**: 기존 코드 스타일과 패턴 준수
4. **시간대 주의**: 모든 시간 처리는 KST (Asia/Seoul) 기준

## 🔄 세션 종료 시 할 일

작업 완료 후 다음 AI를 위해:
```bash
# current-work.md 업데이트
echo "## 마지막 업데이트: $(date)" >> .ai-context/current-work.md
echo "## 완료한 작업: [작업 내용]" >> .ai-context/current-work.md
echo "## 다음 할 일: [다음 작업]" >> .ai-context/current-work.md
```

## 💡 AI 도구별 팁

### Claude Code 사용 시
- TodoWrite 도구로 진행상황 추적
- WebFetch로 문서 참조
- 다양한 도구 활용 가능

### Cursor 사용 시  
- IDE 통합 기능 활용
- 파일 탐색기로 구조 파악
- 터미널 통합 사용

### 공통 사항
- Git 히스토리 적극 활용
- 마크다운 파일로 상태 공유
- 명확한 커밋 메시지 작성