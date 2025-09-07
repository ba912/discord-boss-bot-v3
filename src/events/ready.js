const { ActivityType } = require('discord.js');
const { schedulerService } = require('../services/schedulerService');
const { voiceChannelService } = require('../services/voiceChannelService');

module.exports = {
  name: 'clientReady',  // ready → clientReady로 변경
  once: true,
  async execute(client) {
    console.log(`✅ [${new Date().toLocaleString('ko-KR')}] ${client.user.tag} 봇이 준비되었습니다!`);
    console.log(`📊 서버 수: ${client.guilds.cache.size}`);
    console.log(`👥 사용자 수: ${client.users.cache.size}`);
    
    // 봇 상태 설정 (Discord.js v14+ 호환)
    client.user.setActivity('로드나인 보스 관리', { type: ActivityType.Watching });
    
    console.log('🎯 환경:', process.env.NODE_ENV || 'development');
    console.log('⚡ 명령어 접두사:', process.env.COMMAND_PREFIX || '!');
    console.log('🔄 새로운 캐릭터 시스템 활성화됨');

    // 보스 알림 스케줄러 시작
    const notificationChannelId = process.env.NOTIFICATION_CHANNEL_ID;
    const notificationEnabled = process.env.NOTIFICATION_ENABLED === 'true';

    if (notificationEnabled && notificationChannelId) {
      try {
        schedulerService.start(client, notificationChannelId);
        console.log('✅ 보스 알림 스케줄러 시작됨');
      } catch (error) {
        console.error('❌ 스케줄러 시작 실패:', error);
      }
    } else {
      console.log('📴 보스 알림 시스템 비활성화됨 (NOTIFICATION_ENABLED 또는 NOTIFICATION_CHANNEL_ID 미설정)');
    }

    // TTS 음성 채널 자동 참여
    const voiceChannelId = process.env.TTS_VOICE_CHANNEL_ID;
    const ttsEnabled = process.env.TTS_PROVIDER && voiceChannelId;

    if (ttsEnabled) {
      try {
        console.log('🎵 TTS 음성 채널 연결 시도 중...');
        
        // 음성 채널 조회
        const voiceChannel = await client.channels.fetch(voiceChannelId);
        
        if (voiceChannel && voiceChannel.type === 2) { // 2 = GUILD_VOICE
          const connected = await voiceChannelService.joinChannel(voiceChannel);
          
          if (connected) {
            console.log(`✅ TTS 음성 채널 연결 완료: ${voiceChannel.name}`);
            
            // 연결 유지를 위한 자동 퇴장 타이머 설정하지 않음 (상주 목적)
            // voiceChannelService.setAutoLeaveTimer(); // 주석 처리
            
            console.log('🎤 봇이 음성 채널에 상주하며 TTS 알림 대기 중...');
          } else {
            console.error('❌ TTS 음성 채널 연결 실패');
          }
        } else {
          console.error(`❌ 올바르지 않은 음성 채널 ID: ${voiceChannelId}`);
        }
        
      } catch (error) {
        console.error('❌ TTS 음성 채널 자동 연결 실패:', error);
        console.log('💡 봇이 음성 채널에 참여할 권한이 있는지 확인하세요.');
      }
    } else {
      console.log('🔇 TTS 기능 비활성화됨 (TTS_PROVIDER 또는 TTS_VOICE_CHANNEL_ID 미설정)');
    }

    console.log('🚀 봇 초기화 완료 - 모든 시스템 준비됨!');
  },
};