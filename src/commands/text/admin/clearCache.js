const characterService = require('../../../services/characterService');
const { checkSuperAdminCommandPermission } = require('../../../utils/permissions');

/**
 * !캐시초기화 명령어 - 점수 랭킹 캐시 초기화
 */
module.exports = {
  name: 'clearcache',
  aliases: ['캐시초기화'],
  description: '점수 랭킹 캐시를 초기화합니다 (!점수 명령어 문제 해결용)',
  usage: '!캐시초기화',
  cooldown: 5,

  async execute(message, args) {
    try {
      console.log(`[캐시초기화] 명령어 실행 - 사용자: ${message.author.username}`);

      // 권한 체크 (관리자 전용)
      const hasPermission = await checkSuperAdminCommandPermission(message);
      if (!hasPermission) {
        return await message.reply('이 명령어는 관리자만 사용할 수 있습니다.');
      }

      // 처리 중 메시지 표시
      const processingMessage = await message.reply('캐시 초기화 중...');

      // 캐시 초기화 실행
      characterService.clearRankingCache();

      await processingMessage.edit(
        '점수 랭킹 캐시가 초기화되었습니다.\n' +
        '다음 !점수 명령어 실행 시 최신 데이터로 다시 계산됩니다.'
      );

      console.log(`✅ [캐시초기화] 캐시 초기화 완료 - ${message.author.username}`);

    } catch (error) {
      console.error('❌ [캐시초기화] 오류 발생:', error);
      try {
        await message.reply('캐시 초기화 중 오류가 발생했습니다.');
      } catch (replyError) {
        console.error('[캐시초기화] 에러 응답 실패:', replyError);
      }
    }
  }
};