const googleSheetsService = require('../../../services/googleSheetsService');
const { checkSuperAdminCommandPermission } = require('../../../utils/permissions');

/**
 * !점검모드설정 명령어 - 점검모드 활성화/비활성화
 */
module.exports = {
  name: 'setmaintenancemode',
  aliases: ['점검모드설정'],
  description: '점검모드 활성화/비활성화를 설정합니다',
  usage: '!점검모드설정 <on|off>',
  cooldown: 5,

  async execute(message, args) {
    try {
      console.log(`[점검모드설정] 명령어 실행 - 사용자: ${message.author.username}`);

      // 권한 체크 (관리자 전용)
      const hasPermission = await checkSuperAdminCommandPermission(message);
      if (!hasPermission) {
        return await message.reply('이 명령어는 관리자만 사용할 수 있습니다.');
      }

      // 인자 체크
      if (args.length === 0) {
        // 현재 설정 조회
        const currentSetting = await this.getCurrentMaintenanceMode();
        const statusText = currentSetting === 'true' ? '활성화' : '비활성화';
        return await message.reply(
          `현재 점검모드: ${statusText}\n` +
          `사용법: !점검모드설정 on (활성화) 또는 !점검모드설정 off (비활성화)`
        );
      }

      const modeArg = args[0].toLowerCase();

      // 처리 중 메시지 표시
      const processingMessage = await message.reply('설정 중...');

      // 입력값 검증
      let newMode;
      let statusText;
      if (modeArg === 'on' || modeArg === '활성화' || modeArg === 'true') {
        newMode = 'true';
        statusText = '활성화';
      } else if (modeArg === 'off' || modeArg === '비활성화' || modeArg === 'false') {
        newMode = 'false';
        statusText = '비활성화';
      } else {
        return await processingMessage.edit(
          '올바른 값을 입력해주세요.\n' +
          '사용법: !점검모드설정 on (활성화) 또는 !점검모드설정 off (비활성화)'
        );
      }

      // 설정값 저장
      await googleSheetsService.updateSettingValue('점검모드_활성화여부', newMode);

      // 성공 응답
      let responseMessage = `점검모드 설정 완료: ${statusText}`;
      if (newMode === 'true') {
        responseMessage += '\n점검모드가 활성화되어 보스 알림이 통합 형태로 발송됩니다.';
      } else {
        responseMessage += '\n점검모드가 비활성화되어 개별 보스 알림이 발송됩니다.';
      }

      await processingMessage.edit(responseMessage);

      console.log(`✅ [점검모드설정] 점검모드 ${statusText} 완료 - ${message.author.username}`);

    } catch (error) {
      console.error('❌ [점검모드설정] 오류 발생:', error);
      try {
        await message.reply('점검모드 설정 중 오류가 발생했습니다.');
      } catch (replyError) {
        console.error('[점검모드설정] 에러 응답 실패:', replyError);
      }
    }
  },

  /**
   * 현재 점검모드 활성화 상태 조회
   * @returns {Promise<string|null>} 활성화 여부 ('true' | 'false')
   */
  async getCurrentMaintenanceMode() {
    try {
      const mode = await googleSheetsService.getSettingValue('점검모드_활성화여부');
      return mode || 'false'; // 기본값은 비활성화
    } catch (error) {
      console.error('점검모드 상태 조회 실패:', error);
      return 'false';
    }
  }
};