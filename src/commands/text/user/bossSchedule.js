const { bossScheduleService } = require('../../../services/bossScheduleService');

module.exports = {
  name: 'bossschedule',
  aliases: ['보스일정'],
  description: '보스 리젠 일정을 확인합니다',
  usage: '!보스일정',
  cooldown: 5,
  
  async execute(message, args) {
    try {
      // 즉시 조회 중 메시지 표시
      const processingMessage = await message.reply('⏳ 일정 조회 중...');

      // 보스 스케줄 목록 조회
      const result = await bossScheduleService.getBossSchedules();

      if (!result.success) {
        return processingMessage.edit('❌ 일정 조회 실패');
      }

      if (!result.schedules || result.schedules.length === 0) {
        return processingMessage.edit('노출된 보스가 없습니다.');
      }

      // Discord 메시지 형태로 포맷
      const formattedSchedule = bossScheduleService.formatScheduleForDiscord(result.schedules);

      await processingMessage.edit(formattedSchedule);

    } catch (error) {
      console.error('[보스일정] 오류:', error);
      await message.reply('❌ 조회 실패');
    }
  },
};