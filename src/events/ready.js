const { ActivityType } = require('discord.js');

module.exports = {
  name: 'clientReady',  // ready → clientReady로 변경
  once: true,
  execute(client) {
    console.log(`✅ [${new Date().toLocaleString('ko-KR')}] ${client.user.tag} 봇이 준비되었습니다!`);
    console.log(`📊 서버 수: ${client.guilds.cache.size}`);
    console.log(`👥 사용자 수: ${client.users.cache.size}`);
    
    // 봇 상태 설정 (Discord.js v14+ 호환)
    client.user.setActivity('로드나인 보스 관리', { type: ActivityType.Watching });
    
    console.log('🎯 환경:', process.env.NODE_ENV || 'development');
    console.log('⚡ 명령어 접두사:', process.env.COMMAND_PREFIX || '!');
    console.log('🔄 새로운 캐릭터 시스템 활성화됨');
  },
};