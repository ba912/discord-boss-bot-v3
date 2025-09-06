module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`✅ [${new Date().toLocaleString('ko-KR')}] ${client.user.tag} 봇이 준비되었습니다!`);
    console.log(`📊 서버 수: ${client.guilds.cache.size}`);
    console.log(`👥 사용자 수: ${client.users.cache.size}`);
    
    // 봇 상태 설정
    client.user.setActivity('로드나인 보스 관리', { type: 'WATCHING' });
    
    console.log('🎯 환경:', process.env.NODE_ENV || 'development');
    console.log('⚡ 명령어 접두사:', process.env.COMMAND_PREFIX || '!');
  },
};