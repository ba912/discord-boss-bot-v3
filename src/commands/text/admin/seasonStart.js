const googleSheetsService = require('../../../services/googleSheetsService');
const { checkCommandPermission } = require('../../../utils/permissions');

/**
 * !시즌시작 명령어 - 점수 집계 시작일 설정
 */
module.exports = {
  name: 'seasonstart',
  aliases: ['시즌시작'],
  description: '점수 집계 시작일을 설정합니다 (시즌제)',
  usage: '!시즌시작 <YYYYMMDD>',
  cooldown: 5,

  async execute(message, args) {
    try {
      console.log(`[시즌시작] 명령어 실행 - 사용자: ${message.author.username}`);

      // 권한 체크 (운영진 이상)
      const hasPermission = await checkCommandPermission(message);
      if (!hasPermission) {
        return await message.reply('이 명령어는 운영진 이상만 사용할 수 있습니다.');
      }

      // 인자 체크
      if (args.length === 0) {
        // 현재 설정 조회
        const currentSetting = await this.getCurrentSeasonStart();
        if (currentSetting) {
          const startDate = new Date(currentSetting);
          return await message.reply(
            `현재 점수 집계 시작일: ${this.formatDisplayDate(startDate)}\n` +
            `사용법: !시즌시작 YYYYMMDD`
          );
        } else {
          return await message.reply(
            `점수 집계 시작일이 설정되지 않았습니다.\n` +
            `사용법: !시즌시작 YYYYMMDD`
          );
        }
      }

      const dateArg = args[0];

      // 처리 중 메시지 표시
      const processingMessage = await message.reply('설정 중...');

      // 날짜 파싱 (YYYYMMDD 형식)
      let startDate;
      try {
        startDate = this.parseDateArgument(dateArg);
      } catch (parseError) {
        return await processingMessage.edit(parseError.message);
      }

      // 미래 날짜 체크
      const today = new Date();
      today.setHours(23, 59, 59, 999); // 오늘 끝까지
      if (startDate > today) {
        return await processingMessage.edit('시작일은 오늘 이전이어야 합니다.');
      }

      // 설정값 저장 (YYYY-MM-DD 00:00:00 형식)
      const startDateString = this.formatDateTimeForDB(startDate);
      await googleSheetsService.updateSettingValue('점수_집계_시작일', startDateString);

      // 성공 응답
      const displayDate = this.formatDisplayDate(startDate);
      await processingMessage.edit(
        `점수 집계 시작일 설정 완료. ${displayDate}\n` +
        `!점수 명령어는 이 날짜 이후의 참여 기록만 집계합니다.`
      );

      console.log(`✅ [시즌시작] 시작일 설정 완료: ${startDateString} - ${message.author.username}`);

    } catch (error) {
      console.error('❌ [시즌시작] 오류 발생:', error);
      // 에러 발생 시에도 메시지 편집 시도 (processingMessage가 존재하는 경우)
      try {
        if (args.length > 0) {
          // 처리 중 메시지가 있는 경우
          const processingMessage = await message.reply('시즌 시작일 설정 중 오류가 발생했습니다.');
        } else {
          await message.reply('시즌 시작일 설정 중 오류가 발생했습니다.');
        }
      } catch (replyError) {
        console.error('[시즌시작] 에러 응답 실패:', replyError);
      }
    }
  },

  /**
   * YYYYMMDD 형식 날짜 파싱
   * @param {string} dateArg - YYYYMMDD 형식 문자열
   * @returns {Date} 파싱된 Date 객체
   */
  parseDateArgument(dateArg) {
    // 숫자만 확인
    if (!/^\d{8}$/.test(dateArg)) {
      throw new Error('날짜는 YYYYMMDD 형식 8자리 숫자로 입력해주세요. (예: 20240921)');
    }

    const year = parseInt(dateArg.substring(0, 4));
    const month = parseInt(dateArg.substring(4, 6));
    const day = parseInt(dateArg.substring(6, 8));

    // 유효성 검사
    if (year < 2020 || year > 2030) {
      throw new Error('연도는 2020-2030 사이로 입력해주세요.');
    }
    if (month < 1 || month > 12) {
      throw new Error('월은 01-12 사이로 입력해주세요.');
    }
    if (day < 1 || day > 31) {
      throw new Error('일은 01-31 사이로 입력해주세요.');
    }

    const date = new Date(year, month - 1, day, 0, 0, 0, 0);

    // 날짜 유효성 검사 (존재하지 않는 날짜 체크)
    if (date.getMonth() !== month - 1 || date.getDate() !== day) {
      throw new Error('올바르지 않은 날짜입니다.');
    }

    return date;
  },

  /**
   * DB 저장용 날짜 포맷 (YYYY-MM-DD 00:00:00)
   * @param {Date} date - Date 객체
   * @returns {string} 포맷된 문자열
   */
  formatDateTimeForDB(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day} 00:00:00`;
  },

  /**
   * 표시용 날짜 포맷 (YYYY년 MM월 DD일)
   * @param {Date} date - Date 객체
   * @returns {string} 포맷된 문자열
   */
  formatDisplayDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}년 ${month}월 ${day}일`;
  },

  /**
   * 현재 시즌 시작일 조회
   * @returns {Promise<string|null>} 시작일 문자열
   */
  async getCurrentSeasonStart() {
    try {
      const startDate = await googleSheetsService.getSettingValue('점수_집계_시작일');
      return startDate || null;
    } catch (error) {
      console.error('시즌 시작일 조회 실패:', error);
      return null;
    }
  }
};