const messageHandler = require('../handlers/messageHandler');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    // 봇이 보낸 메시지 무시
    if (message.author.bot) return;
    
    // 명령어 접두사 확인
    const prefix = process.env.COMMAND_PREFIX || '!';
    if (!message.content.startsWith(prefix)) return;
    
    try {
      await messageHandler.handleMessage(message, prefix);
    } catch (error) {
      console.error('[MessageCreate] 메시지 처리 중 오류:', error);
      
      // 사용자에게 오류 메시지 전송
      try {
        await message.reply('❌ 명령어 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } catch (replyError) {
        console.error('[MessageCreate] 오류 메시지 전송 실패:', replyError);
      }
    }
  },
};