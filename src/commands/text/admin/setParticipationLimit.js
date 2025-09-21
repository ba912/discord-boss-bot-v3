const googleSheetsService = require('../../../services/googleSheetsService');
const { checkSuperAdminCommandPermission } = require('../../../utils/permissions');

/**
 * !참여제한설정 명령어 - 참여제한(분) 설정
 */
module.exports = {
  name: 'setparticipationlimit',
  aliases: ['참여제한설정'],
  description: '보스 참여 제한 시간을 설정합니다 (분 단위, 0 이상)',
  usage: '!참여제한설정 <분>',
  cooldown: 5,

  async execute(message, args) {
    try {
      console.log(`[참여제한설정] 명령어 실행 - 사용자: ${message.author.username}`);

      // 권한 체크 (관리자 전용)
      const hasPermission = await checkSuperAdminCommandPermission(message);
      if (!hasPermission) {
        return await message.reply('이 명령어는 관리자만 사용할 수 있습니다.');
      }

      // 인자 체크
      if (args.length === 0) {
        // 현재 설정 조회
        const currentSetting = await this.getCurrentParticipationLimit();
        if (currentSetting) {
          return await message.reply(
            `현재 참여 제한 시간: ${currentSetting}분\n` +
            `사용법: !참여제한설정 <분>`
          );
        } else {
          return await message.reply(
            `참여 제한 시간이 설정되지 않았습니다.\n` +
            `사용법: !참여제한설정 <분>`
          );
        }
      }

      const limitArg = args[0];

      // 처리 중 메시지 표시
      const processingMessage = await message.reply('설정 중...');

      // 숫자 유효성 검증
      const limitMinutes = parseInt(limitArg);
      if (isNaN(limitMinutes) || limitMinutes < 0) {
        return await processingMessage.edit('참여 제한 시간은 0 이상의 숫자로 입력해주세요.');
      }

      // 설정값 저장
      await googleSheetsService.updateSettingValue('참여 제한 시간(분)', limitMinutes.toString());

      // 성공 응답
      await processingMessage.edit(
        `참여 제한 시간 설정 완료: ${limitMinutes}분\n` +
        `보스 처치 후 ${limitMinutes}분 이내에만 참여 가능합니다.`
      );

      console.log(`✅ [참여제한설정] 제한 시간 설정 완료: ${limitMinutes}분 - ${message.author.username}`);

    } catch (error) {
      console.error('❌ [참여제한설정] 오류 발생:', error);
      try {
        await message.reply('참여 제한 시간 설정 중 오류가 발생했습니다.');
      } catch (replyError) {
        console.error('[참여제한설정] 에러 응답 실패:', replyError);
      }
    }
  },

  /**
   * 현재 참여 제한 시간 조회
   * @returns {Promise<string|null>} 제한 시간 (분)
   */
  async getCurrentParticipationLimit() {
    try {
      const limit = await googleSheetsService.getSettingValue('참여 제한 시간(분)');
      return limit || null;
    } catch (error) {
      console.error('참여 제한 시간 조회 실패:', error);
      return null;
    }
  }
};