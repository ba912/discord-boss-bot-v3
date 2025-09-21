const { bossService } = require('../../../services/bossService');
const { getUserPermissionFromSheet } = require('../../../utils/permissions');
const { BOT_CONFIG } = require('../../../config/constants');

module.exports = {
  name: 'bosslist',
  aliases: ['보스목록', '보스'],
  description: '등록된 보스 목록을 확인합니다',
  usage: '!보스목록',
  cooldown: 5,
  
  async execute(message, args) {
    try {
      // 즉시 조회 중 메시지 표시
      const processingMessage = await message.reply('⏳ 조회 중...');

      // 기본 권한 확인 (일반길드원 이상)
      const userPermission = await getUserPermissionFromSheet(message.author.id);
      if (!userPermission) {
        return processingMessage.edit('❌ 시트에 등록되지 않은 사용자입니다. 관리자에게 문의해주세요.');
      }

      // 운영진 이상인지 확인 (비노출 보스도 볼 수 있음)
      const isStaff = [BOT_CONFIG.PERMISSIONS.SUPER_ADMIN, BOT_CONFIG.PERMISSIONS.ADMIN].includes(userPermission);

      // 보스 목록 조회
      const bossList = await bossService.getBossList(isStaff);

      if (!bossList || bossList.length === 0) {
        return processingMessage.edit('등록된 보스가 없습니다.');
      }

      // Discord 메시지 형태로 포맷 (스마트 분할 지원)
      const result = bossService.formatBossListForDiscord(bossList);

      if (result.needsSplit) {
        // 분할이 필요한 경우
        const headerMessage = `**보스목록** (총 ${result.totalBosses}개)\n\n글자수 제한때문에 메시지를 ${result.totalChunks}개로 나눠서 보내드릴게요.`;
        await processingMessage.edit(headerMessage);

        // 각 분할 메시지를 순차적으로 전송
        for (let i = 0; i < result.chunks.length; i++) {
          await message.channel.send(result.chunks[i]);

          // 연속 전송 시 너무 빠르지 않도록 약간의 딜레이
          if (i < result.chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      } else {
        // 분할이 필요없는 경우 (기존 방식)
        await processingMessage.edit(result.content);
      }

    } catch (error) {
      console.error('[보스목록] 오류:', error);
      await message.reply('❌ 조회 실패');
    }
  },
};