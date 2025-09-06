// 전역 상수 정의
const BOT_CONFIG = {
  // 명령어 설정
  COMMAND_PREFIX: process.env.COMMAND_PREFIX || '!',
  COMMAND_COOLDOWN: 3000, // 3초
  
  // 권한 설정
  ADMIN_PERMISSIONS: ['ADMINISTRATOR'],
  BOT_PERMISSIONS: [
    'SEND_MESSAGES',
    'EMBED_LINKS', 
    'USE_EXTERNAL_EMOJIS',
    'CONNECT',
    'SPEAK',
  ],
};

const BOSS_CONFIG = {
  // 보스 관련 설정
  DEFAULT_BOSS_SCORE: 10,
  MAX_BOSS_NAME_LENGTH: 50,
  MAX_PARTICIPANTS: 100,
  
  // 스케줄 타입
  SCHEDULE_TYPES: {
    FIXED: 'fixed',        // 고정 시간 (매주 화,목 16:30)
    RESPAWN: 'respawn',    // 리젠 시간 (처치 후 N시간)
  },
  
  // 알림 시간 (분 단위)
  NOTIFICATION_TIMES: [30, 10, 5, 1], // 30분전, 10분전, 5분전, 1분전
};

const SHEET_CONFIG = {
  // Google Sheets 설정
  SHEET_NAMES: {
    BOSS_INFO: '보탐봇-보스정보',
    MEMBERS: '보탐봇-길드원정보', 
    PARTICIPATION: '보탐봇-참여이력',
    LOOT_HISTORY: '보탐봇-루팅이력',
  },
  
  // 컬럼 인덱스 (0부터 시작)
  COLUMNS: {
    BOSS_INFO: {
      NAME: 0,
      SCORE: 1,
      SCHEDULE_TYPE: 2,
      SCHEDULE_DATA: 3,
      CREATED_AT: 4,
    },
    MEMBERS: {
      USER_ID: 0,
      NICKNAME: 1,
      TOTAL_SCORE: 2,
      ROLE: 3,
      JOINED_AT: 4,
    },
    PARTICIPATION: {
      TIMESTAMP: 0,
      USER_ID: 1,
      BOSS_NAME: 2,
      EARNED_SCORE: 3,
    },
  },
};

const MESSAGES = {
  // 사용자 메시지
  ERRORS: {
    NO_PERMISSION: '❌ 이 명령어를 사용할 권한이 없습니다.',
    INVALID_USAGE: '❌ 올바른 사용법을 확인해주세요.',
    BOSS_NOT_FOUND: '❌ 해당 보스를 찾을 수 없습니다.',
    ALREADY_PARTICIPATED: '❌ 이미 참여하셨습니다.',
    SYSTEM_ERROR: '❌ 시스템 오류가 발생했습니다. 관리자에게 문의해주세요.',
  },
  
  SUCCESS: {
    BOSS_ADDED: '✅ 보스가 성공적으로 추가되었습니다!',
    PARTICIPATION_RECORDED: '✅ 참여가 완료되었습니다!',
    SCORE_UPDATED: '✅ 점수가 업데이트되었습니다!',
  },
  
  INFO: {
    LOADING: '⏳ 처리 중입니다...',
    NO_UPCOMING_BOSS: 'ℹ️ 예정된 보스가 없습니다.',
  },
};

const TIMEZONE = 'Asia/Seoul';
const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

// CommonJS 방식으로 내보내기
module.exports = {
  BOT_CONFIG,
  BOSS_CONFIG,
  SHEET_CONFIG,
  MESSAGES,
  TIMEZONE,
  DATE_FORMAT,
};