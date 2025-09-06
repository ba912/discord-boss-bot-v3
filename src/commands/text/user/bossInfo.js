const { bossService } = require('../../../services/bossService');
const { getUserPermissionFromSheet } = require('../../../utils/permissions');
const { BOT_CONFIG } = require('../../../config/constants');

module.exports = {
  name: 'bossinfo',
  aliases: ['보스정보'],
  description: '특정 보스의 상세 정보를 확인합니다',
  usage: '!보스정보 <보스명>',
  cooldown: 3,
  
  async execute(message, args) {
    try {
      // 보스명 입력 확인
      if (args.length === 0) {
        return message.reply('❌ 보스명을 입력해주세요.\n**사용법:** `!보스정보 <보스명>`');
      }

      const bossName = args.join(' ');

      // 즉시 조회 중 메시지 표시
      const processingMessage = await message.reply('⏳ 조회 중...');

      // 기본 권한 확인 (일반길드원 이상)
      const userPermission = await getUserPermissionFromSheet(message.author.id);
      if (!userPermission) {
        return processingMessage.edit('❌ 시트에 등록되지 않은 사용자입니다. 관리자에게 문의해주세요.');
      }

      // 보스 정보 조회
      const boss = await bossService.getBossByName(bossName);

      if (!boss) {
        return processingMessage.edit(`${bossName} 보스를 찾을 수 없습니다.`);
      }

      // 운영진 이상인지 확인 (비노출 보스도 볼 수 있음)
      const isStaff = [BOT_CONFIG.PERMISSIONS.SUPER_ADMIN, BOT_CONFIG.PERMISSIONS.ADMIN].includes(userPermission);

      // 비노출 보스인데 운영진이 아니면 접근 차단
      if (boss.scheduleVisible === '비노출' && !isStaff) {
        return processingMessage.edit('해당 보스는 운영진만 확인할 수 있습니다.');
      }

      // Discord 임베드 형태로 포맷
      const embed = bossService.formatBossInfoForDiscord(boss);

      // 운영진 권한 표시 추가
      if (isStaff && boss.scheduleVisible === '비노출') {
        embed.footer = {
          text: '🔒 비노출 보스 - 운영진 권한으로 확인 중'
        };
      }

      await processingMessage.edit({ embeds: [embed] });

    } catch (error) {
      console.error('[보스정보] 오류:', error);
      await message.reply('❌ 조회 실패');
    }
  },
};