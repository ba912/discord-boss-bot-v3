// 전역 상수 정의
const BOT_CONFIG = {
  // 명령어 설정
  COMMAND_PREFIX: process.env.COMMAND_PREFIX || '!',
  COMMAND_COOLDOWN: 3000, // 3초
  
  // 권한 설정
  PERMISSIONS: {
    SUPER_ADMIN: '관리자',
    ADMIN: '운영진', 
    MEMBER: '일반길드원',
  },
  
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
  MIN_BOSS_SCORE: 1,
  MAX_BOSS_SCORE: 100,
  MAX_BOSS_NAME_LENGTH: 50,
  MAX_PARTICIPANTS: 100,
  
  // 리젠 타입
  REGEN_TYPES: {
    HOURLY: '시간마다',        // N시간마다 리젠
    WEEKLY: '특정요일',       // 특정 요일 특정 시간
  },
  
  // 스케줄 노출 여부
  VISIBILITY: {
    VISIBLE: '노출',          // 길드원들에게 표시
    HIDDEN: '비노출',         // 운영진만 관리
  },
  
  // 리젠 설정 제한
  MIN_HOURS: 1,             // 최소 1시간
  MAX_HOURS: 168,           // 최대 168시간 (7일)
  VALID_DAYS: ['월', '화', '수', '목', '금', '토', '일'],
  
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
      REGEN_TYPE: 2,
      REGEN_SETTINGS: 3,
      SCHEDULE_VISIBLE: 4,
      REGISTRAR: 5,
      CREATED_AT: 6,
      UPDATED_AT: 7,
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
    BOSS_ALREADY_EXISTS: '❌ 이미 등록된 보스명입니다.',
    ALREADY_PARTICIPATED: '❌ 이미 참여하셨습니다.',
    SYSTEM_ERROR: '❌ 시스템 오류가 발생했습니다. 관리자에게 문의해주세요.',
    INVALID_BOSS_NAME: '❌ 보스명을 올바르게 입력해주세요.',
    INVALID_SCORE: '❌ 점수는 1-100 사이의 숫자로 입력해주세요.',
    INVALID_REGEN_TYPE: '❌ 리젠타입은 "시간마다" 또는 "특정요일"만 가능합니다.',
    INVALID_VISIBILITY: '❌ 스케줄노출여부는 "노출" 또는 "비노출"만 가능합니다.',
  },
  
  SUCCESS: {
    BOSS_ADDED: '✅ 보스가 성공적으로 추가되었습니다!',
    BOSS_DELETED: '✅ 보스가 성공적으로 삭제되었습니다!',
    PARTICIPATION_RECORDED: '✅ 참여가 완료되었습니다!',
    SCORE_UPDATED: '✅ 점수가 업데이트되었습니다!',
  },
  
  INFO: {
    LOADING: '⏳ 처리 중입니다...',
    NO_UPCOMING_BOSS: 'ℹ️ 예정된 보스가 없습니다.',
    NO_BOSS_REGISTERED: '📋 등록된 보스가 없습니다.',
    BOSS_HIDDEN_ADMIN_ONLY: '❌ 해당 보스는 운영진만 확인할 수 있습니다.',
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