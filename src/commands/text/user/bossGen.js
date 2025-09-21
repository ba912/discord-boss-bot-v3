const { bossService } = require('../../../services/bossService');
const { getUserPermissionFromSheet } = require('../../../utils/permissions');
const {
  parseTimeArgument,
  calculateCutTimeFromGen,
  isHourlyRegenBoss,
  formatDisplayTime
} = require('../../../utils/timeCalculator');

module.exports = {
  name: 'gen',
  aliases: ['젠'],
  description: '다음 젠타임을 입력하여 보스 컷타임을 역산합니다 (시간마다 리젠 보스만)',
  usage: '!젠 [보스명] [젠타임]\n- !젠 [보스명] HHMM: 오늘 해당시간에 젠\n- !젠 [보스명] MMDDHHMM: 해당 월일시간에 젠',
  cooldown: 3,

  async execute(message, args) {
    try {
      const startTime = Date.now();
      console.log(`[젠] 명령어 시작 - ${message.author.username}`);

      // 즉시 처리 중 메시지 표시
      const processingMessage = await message.reply('⏳ 처리 중...');
      console.log(`[젠] Discord 응답 완료: ${Date.now() - startTime}ms`);

      // 권한 확인 (시트에 등록된 사용자만)
      const userPermission = await getUserPermissionFromSheet(message.author.id);
      if (!userPermission) {
        return processingMessage.edit('❌ 시트에 등록되지 않은 사용자입니다. 관리자에게 문의해주세요.');
      }

      // 인자 확인
      if (args.length === 0) {
        return processingMessage.edit(
          '❌ 보스명을 입력해주세요.\n' +
          '**사용법:**\n' +
          '- `!젠 보스명 HHMM`: 오늘 해당시간에 젠\n' +
          '- `!젠 보스명 MMDDHHMM`: 해당 월일시간에 젠\n\n' +
          '💡 시간마다 리젠되는 보스만 지원됩니다.'
        );
      }

      if (args.length < 2) {
        return processingMessage.edit(
          '❌ 젠타임을 입력해주세요.\n' +
          '**사용법:**\n' +
          '- `!젠 보스명 HHMM`: 오늘 해당시간에 젠\n' +
          '- `!젠 보스명 MMDDHHMM`: 해당 월일시간에 젠'
        );
      }

      const bossName = args[0];
      const genTimeArg = args[1];

      // 보스 정보 조회 (리젠 시간 확인용)
      const bossInfo = await bossService.getBossByName(bossName);
      if (!bossInfo) {
        return processingMessage.edit('❌ 존재하지 않는 보스입니다.');
      }

      // 시간마다 리젠 보스인지 확인
      if (!isHourlyRegenBoss(bossInfo.regenType)) {
        return processingMessage.edit(
          `❌ '${bossName}'은(는) 시간마다 리젠되는 보스가 아닙니다.\n` +
          `현재 리젠타입: ${bossInfo.regenType}\n\n` +
          '💡 젠 명령어는 시간마다 리젠되는 보스만 지원됩니다.'
        );
      }

      // 젠타임 파싱
      const parseStart = Date.now();
      const genTime = parseTimeArgument(genTimeArg);
      console.log(`[젠] 젠타임 파싱 완료: ${Date.now() - parseStart}ms`);

      // 컷타임 역산 계산
      const calculateStart = Date.now();
      const cutTime = calculateCutTimeFromGen(genTime, bossInfo.regenSettings);
      console.log(`[젠] 컷타임 역산 완료: ${Date.now() - calculateStart}ms`);

      // 구글시트 업데이트
      const updateStart = Date.now();
      await bossService.updateBoss(bossName, { cutTime });
      console.log(`[젠] 구글시트 업데이트 완료: ${Date.now() - updateStart}ms`);

      const successMessage = `${bossName} 젠타임 업데이트 완료. ${formatDisplayTime(genTime)}`;

      await processingMessage.edit(successMessage);

      console.log(`[젠] 전체 처리 완료: ${Date.now() - startTime}ms`);

    } catch (error) {
      console.error('[젠] 오류:', error);
      const errorMessage = `❌ ${error.message}`;

      try {
        await processingMessage.edit(errorMessage);
      } catch {
        await message.reply(errorMessage);
      }
    }
  }
};