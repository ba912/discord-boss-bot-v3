const { bossService } = require('../../../services/bossService');
const { checkSuperAdminPermission } = require('../../../utils/permissions');
const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  name: 'bossdelete',
  aliases: ['보스삭제'],
  description: '등록된 보스를 삭제합니다 (관리자 전용)',
  usage: '!보스삭제 <보스명>',
  cooldown: 15,
  
  async execute(message, args) {
    try {
      // 보스명 입력 확인
      if (args.length === 0) {
        return message.reply('❌ 삭제할 보스명을 입력해주세요.\n**사용법:** `!보스삭제 <보스명>`');
      }

      const bossName = args.join(' ');

      // 즉시 "삭제 중" 메시지 표시
      const processingMessage = await message.reply('⏳ 삭제 중...');

      // 관리자 권한 확인
      const hasPermission = await checkSuperAdminPermission(message.author.id);
      if (!hasPermission) {
        return processingMessage.edit('❌ 이 명령어는 관리자만 사용할 수 있습니다.');
      }

      // 보스 존재 확인 및 삭제 실행
      const existingBoss = await bossService.getBossByName(bossName);
      if (!existingBoss) {
        return processingMessage.edit(`${bossName} 보스를 찾을 수 없습니다.`);
      }

      await bossService.deleteBoss(bossName);
      await processingMessage.edit('✅ 보스 삭제 완료');

    } catch (error) {
      console.error('[보스삭제] 오류:', error);
      await message.reply('❌ 삭제 실패');
    }
  },
};