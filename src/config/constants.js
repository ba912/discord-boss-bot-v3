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
    // 기존 시트들 (유지)
    BOSS_INFO: '보탐봇-보스정보',
    LOOT_HISTORY: '보탐봇-루팅이력',
    
    // 새로운 캐릭터 중심 시트들
    CHARACTERS: '보탐봇-캐릭터정보',
    ACCOUNTS: '보탐봇-계정정보', 
    PARTICIPATIONS: '보탐봇-참여이력',
    SETTINGS: '보탐봇-설정',
    
    // 레거시 시트들 (호환성 유지)
    MEMBERS_LEGACY: '보탐봇-길드원정보_백업',
    PARTICIPATION_LEGACY: '보탐봇-참여이력_백업',
    
    // 호환성을 위한 별칭 (기존 코드와 호환) - 레거시용
    MEMBERS: '보탐봇-길드원정보',
    PARTICIPATION_LEGACY_ALIAS: '보탐봇-참여이력_레거시',
  },

  // 시트 생성 시 필요한 기본 시트들 (백업 제외)
  PRIMARY_SHEETS: [
    '보탐봇-보스정보',      // BOSS_INFO
    '보탐봇-루팅이력',      // LOOT_HISTORY  
    '보탐봇-캐릭터정보',    // CHARACTERS
    '보탐봇-계정정보',      // ACCOUNTS
    '보탐봇-참여이력',      // PARTICIPATIONS
    '보탐봇-설정',          // SETTINGS
  ],
  
  // 컬럼 인덱스 (0부터 시작)
  COLUMNS: {
    // 기존 보스 정보 (유지)
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
    
    // 새로운 캐릭터 정보 시트 (auto-increment ID 방식)
    CHARACTERS: {
      ID: 0,
      CHARACTER_NAME: 1,
      TOTAL_SCORE: 2,
      CREATED_AT: 3,
      UPDATED_AT: 4,
    },
    
    // 새로운 계정 정보 시트
    ACCOUNTS: {
      USER_ID: 0,
      DISCORD_NICKNAME: 1,
      DISCORD_TAG: 2,
      CHARACTER_ID: 3,
      CHARACTER_NAME: 4,
      PERMISSION: 5,
      ACCOUNT_TYPE: 6,
      JOINED_AT: 7,
    },
    
    // 새로운 참여 이력 시트
    PARTICIPATIONS: {
      TIMESTAMP: 0,
      CHARACTER_ID: 1,
      CHARACTER_NAME: 2,
      ACTUAL_PARTICIPANT_ID: 3,
      BOSS_NAME: 4,
      EARNED_SCORE: 5,
      CUT_TIME: 6,
    },
    
    // 설정 시트
    SETTINGS: {
      SETTING_NAME: 0,
      SETTING_VALUE: 1,
      DESCRIPTION: 2,
      UPDATED_AT: 3,
    },
    
    // 레거시 시트들 (호환성)
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
  
  // 드롭다운 옵션들 (데이터 일관성 확보)
  DROPDOWN_OPTIONS: {
    // 계정 유형 (부주는 필요시 동적 확장)
    ACCOUNT_TYPES: ['본주', '부주'],
    
    // 권한 레벨 (3단계 고정)
    PERMISSIONS: ['일반길드원', '운영진', '관리자'],
    
    // 보스 리젠 타입
    REGEN_TYPES: ['고정시간', '랜덤시간', '수동관리', '일회성'],
    
    // 스케줄 노출 여부
    SCHEDULE_VISIBILITY: ['노출', '비노출'],
    
    // 참여 상태 (확장 가능)
    PARTICIPATION_STATUS: ['참여완료', '참여취소', '지각', '결석'],
    
    // 동적 참조 (다른 시트 데이터 참조)
    CHARACTER_NAMES_REF: "범위참조:'보탐봇-캐릭터정보'!A2:A1000", // 캐릭터정보 시트의 캐릭터명 참조 (헤더 제외)
  },
  
  // 드롭다운 적용 컬럼 매핑 (실제 시트명을 키로 사용)
  DROPDOWN_COLUMNS: {
    '보탐봇-보스정보': {
      2: 'REGEN_TYPES',           // 리젠타입
      4: 'SCHEDULE_VISIBILITY',   // 스케줄노출여부
    },
    '보탐봇-계정정보': {
      5: 'PERMISSIONS',           // 권한  
      6: 'ACCOUNT_TYPES',         // 계정유형
    },
    // 참여이력 시트는 드롭다운이 필요 없으므로 제외됨
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