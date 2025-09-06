# 개발 가이드라인

## 코딩 스타일

### 네이밍 컨벤션
- **파일명**: camelCase (예: `bossService.js`, `messageHandler.js`)
- **폴더명**: lowercase (예: `commands`, `services`, `utils`)
- **변수/함수명**: camelCase (예: `bossName`, `getUserScore`)
- **상수명**: UPPER_SNAKE_CASE (예: `DEFAULT_BOSS_SCORE`, `MAX_PARTICIPANTS`)
- **클래스명**: PascalCase (예: `BossScheduler`, `ParticipationManager`)

### 주석 규칙
```javascript
// 한국어 주석 사용 (개발자 친화적)
// 함수 설명은 JSDoc 스타일로
/**
 * 보스 참여도 점수를 계산합니다
 * @param {string} userId - 사용자 ID
 * @param {string} bossName - 보스 이름
 * @returns {Promise<number>} 획득 점수
 */
async function calculateParticipationScore(userId, bossName) {
  // 구현...
}
```

### Import/Export 패턴
```javascript
// ES6 모듈 사용
import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

// Named exports 선호
export const bossService = {
  addBoss,
  getBossList,
  updateBossScore,
};

// Default export는 메인 클래스/함수만
export default class BossScheduler {
  // ...
}
```

## 프로젝트 구조 규칙

### 폴더별 역할
- `/src/commands/text/` - 텍스트 명령어 처리기
- `/src/commands/interactions/` - 모달, 버튼 처리기  
- `/src/services/` - 비즈니스 로직 (순수 함수 지향)
- `/src/utils/` - 공통 유틸리티 함수
- `/src/events/` - Discord 이벤트 핸들러
- `/src/config/` - 설정 파일 및 상수

### 파일 생성 규칙
1. **명령어 파일**: `commands/text/user/boss.js`
2. **서비스 파일**: `services/bossService.js`  
3. **유틸리티**: `utils/messageParser.js`
4. **이벤트**: `events/messageCreate.js`

## 에러 처리 패턴

### Discord 명령어 에러
```javascript
// 사용자 친화적 한국어 에러 메시지
try {
  const result = await bossService.addBoss(bossData);
  await message.reply('✅ 보스가 성공적으로 추가되었습니다!');
} catch (error) {
  console.error('[보스추가] 오류:', error);
  await message.reply('❌ 보스 추가 중 오류가 발생했습니다. 관리자에게 문의해주세요.');
}
```

### API 에러 처리
```javascript
// Google Sheets API 에러
try {
  await googleSheetsService.updateData(data);
} catch (error) {
  if (error.code === 429) {
    // 레이트 리밋 처리
    await new Promise(resolve => setTimeout(resolve, 1000));
    return retryOperation();
  }
  throw new Error(`데이터 저장 실패: ${error.message}`);
}
```

## Discord 봇 개발 규칙

### 명령어 구현 패턴
```javascript
// commands/text/user/boss.js
export default {
  name: 'boss',
  aliases: ['보스'],
  description: '보스 정보를 조회합니다',
  usage: '!보스 [보스명]',
  cooldown: 3,
  
  async execute(message, args) {
    // 권한 체크
    if (!await permissions.canUseCommand(message.author.id, 'boss')) {
      return message.reply('❌ 명령어 사용 권한이 없습니다.');
    }
    
    // 입력 검증
    if (args.length > 1) {
      return message.reply('❌ 사용법: !보스 [보스명]');
    }
    
    // 비즈니스 로직 실행
    try {
      const result = await bossService.getBossInfo(args[0]);
      await message.reply(formatBossInfo(result));
    } catch (error) {
      await handleCommandError(message, error);
    }
  },
};
```

### 권한 체크 패턴  
```javascript
// utils/permissions.js
export const checkAdminPermission = async (userId, guildId) => {
  const member = await guild.members.fetch(userId);
  return member.roles.cache.has(ADMIN_ROLE_ID) || 
         await isRegisteredAdmin(userId, guildId);
};
```

## 커밋 메시지 규칙

### 형식
```
type(scope): 간단한 설명

상세 설명 (선택사항)
```

### Type 종류
- `feat`: 새로운 기능 추가
- `fix`: 버그 수정  
- `docs`: 문서 수정
- `style`: 코드 포맷팅
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드 관련, 패키지 매니저 설정

### 예시
```
feat(boss): 보스 추가 명령어 구현

- !보스추가 명령어 추가
- 모달을 통한 보스 정보 입력
- Google Sheets 연동 완료

fix(participation): 참여 점수 중복 계산 오류 수정

refactor(utils): 메시지 파서 함수 분리
```

## 테스트 정책

### 테스트 범위
- **단위 테스트**: utils, services 함수
- **통합 테스트**: Google Sheets API 연동
- **수동 테스트**: Discord 명령어 (테스트 서버에서)

### 테스트 명명
```javascript
// tests/services/bossService.test.js
describe('BossService', () => {
  describe('addBoss', () => {
    it('유효한 보스 데이터로 보스를 추가해야 한다', async () => {
      // 테스트 코드
    });
    
    it('중복된 보스명일 때 오류를 반환해야 한다', async () => {
      // 테스트 코드  
    });
  });
});
```

## 작업 이력 관리

### 필수 규칙
1. **모든 개발 작업 전 작업 로그 생성** (`work-logs/` 폴더)
2. **한 번에 하나의 기능만 구현**
3. **명확하고 구체적인 요청 내용 기록**
4. **작업 완료 후 결과 상세 기록**

### 작업 세션 관리
- **하나의 작업 세션 = 하나의 작업 로그**
- 작업 중 추가 요청사항은 **기존 로그 업데이트** (새 로그 생성 X)
- Claude가 **"이번 작업을 마무리 처리하시겠어요?"** 확인 필수
- 사용자가 완료 확인한 후에만 새로운 작업 로그 생성

### 작업 로그 파일명
```
YYYY-MM-DD-HH-MM_작업명.md
```

### 작업 순서
1. **작업 로그 생성** (템플릿 사용)
2. **요청 사항 명확히 정의**
3. **구현 계획 수립**
4. **단계별 구현**
   - 추가 요청시 → 기존 로그의 "요청 사항" 섹션 업데이트
   - 구현 내용도 기존 로그에 누적 기록
5. **테스트 및 검증**
6. **작업 완료 확인** (Claude → 사용자)
   - "이번 작업을 마무리 처리하시겠어요?"
7. **작업 로그 최종 업데이트**
8. **다음 단계 작업 정의**

### 작업 완료 프로세스
1. Claude: "이번 작업을 마무리 처리하시겠어요?"
2. 사용자 응답 대기
   - "네" → 작업 로그 최종 정리 후 완료
   - 추가 요청 → 현재 로그에 요청사항 추가하여 계속 진행

### 작업 범위 관리
- **새로운 기능 요청 시 Claude는 현재 작업 범위를 벗어나는지 확인**
- 범위 초과 시: "⚠️ 이 기능은 현재 작업 범위를 벗어납니다. 이번 작업에 포함하시겠어요?"
- 사용자 결정 대기:
  - "포함" → 현재 작업 로그에 추가하여 진행
  - "별도 작업" → 다음 작업으로 미루고 현재 작업 계속

### 명령어 관리 규칙
- **모든 새 명령어는 `!도움말`에 자동 추가 필수**
- **명령어 변경/삭제 시 도움말도 함께 업데이트**
- **aliases 변경 시에도 도움말 반영**

## 개발 워크플로우

### 브랜치 전략
- `main`: 프로덕션 코드
- `develop`: 개발 중인 코드
- `feature/기능명`: 새로운 기능 개발
- `hotfix/버그명`: 긴급 버그 수정

### 개발 순서
1. **작업 로그 생성** (work-logs/template.md 사용)
2. 기능 설계 및 CLAUDE.md 업데이트
3. 브랜치 생성 (`feature/boss-command`)
4. 테스트 주도 개발 (TDD)
5. 코드 구현
6. 린트/포맷 검사 (`npm run lint`)
7. **작업 로그 업데이트** (구현 내용 기록)
8. 커밋 및 푸시
9. 코드 리뷰 (필요시)
10. 메인 브랜치 병합