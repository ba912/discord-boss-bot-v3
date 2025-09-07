const { MessageFlags } = require('discord.js');
const { checkAdminPermission } = require('../../../utils/permissions');
const { voiceChannelService } = require('../../../services/voiceChannelService');

module.exports = {
  name: 'speak',
  aliases: ['말', '음성', 'say'],
  description: 'TTS로 텍스트를 음성으로 재생합니다',
  usage: '!말 <텍스트>',
  cooldown: 3,
  
  async execute(message, args) {
    try {
      // 관리자 권한 확인
      const hasPermission = await checkAdminPermission(message.author.id);
      if (!hasPermission) {
        return message.reply('❌ 이 명령어는 운영진 이상만 사용할 수 있습니다.');
      }

      // 텍스트 입력 확인
      if (args.length === 0) {
        return message.reply('❌ 음성으로 변환할 텍스트를 입력하세요.\n예시: `!말 베나투스 리젠이 5분 남았어요`');
      }

      // 전체 텍스트 조합 (띄어쓰기 포함)
      const text = args.join(' ');
      
      // 텍스트 길이 제한 (너무 긴 텍스트 방지)
      if (text.length > 200) {
        return message.reply('❌ 텍스트가 너무 깁니다. 200자 이하로 입력해주세요.');
      }

      // 현재 채널에서 확인 메시지 발송
      await message.reply(`🎵 음성 재생: "${text}"`);

      try {
        // TTS 음성 재생 (보스 알림과 동일한 방식)
        const success = await this.playTTSAnnouncement(text, message.client);

        if (success) {
          // 성공 시에는 추가 메시지 없이 조용히 완료
          console.log(`✅ [!말 명령어] TTS 재생 완료: "${text}"`);
        } else {
          await message.reply('❌ 음성 재생에 실패했습니다. TTS 설정을 확인하세요.');
        }

      } catch (error) {
        console.error(`❌ [!말 명령어] TTS 재생 오류:`, error);
        await message.reply('❌ 음성 재생 중 오류가 발생했습니다.');
      }

    } catch (error) {
      console.error('[!말 명령어] 오류:', error);
      return message.reply('❌ 명령어 처리 중 오류가 발생했습니다.');
    }
  },

  /**
   * TTS 음성 알림 재생 (스케줄러의 sendTTSNotification과 동일한 로직)
   * @param {string} text - 재생할 텍스트
   * @param {Client} client - Discord 클라이언트
   * @returns {boolean} 재생 성공 여부
   */
  async playTTSAnnouncement(text, client) {
    const voiceChannelId = process.env.TTS_VOICE_CHANNEL_ID;
    const ttsEnabled = process.env.TTS_PROVIDER && voiceChannelId;
    
    if (!ttsEnabled) {
      console.warn('[!말 명령어] TTS 기능이 비활성화되어 있습니다.');
      return false;
    }

    try {
      console.log(`🎵 [!말 명령어] 음성 알림 시작: "${text}"`);

      // 음성 채널 가져오기 (스케줄러와 동일)
      const voiceChannel = await client.channels.fetch(voiceChannelId);
      
      if (!voiceChannel || voiceChannel.type !== 2) { // 2 = GUILD_VOICE
        console.error(`[!말 명령어] 음성 채널을 찾을 수 없음: ${voiceChannelId}`);
        return false;
      }

      // 음성 채널 연결 (스케줄러와 동일)
      const connected = await voiceChannelService.joinChannel(voiceChannel);
      
      if (!connected) {
        console.error(`[!말 명령어] 음성 채널 연결 실패: ${voiceChannel.name}`);
        return false;
      }

      // TTS 음성 재생 (스케줄러와 동일 - playTTS 사용)
      const playSuccess = await voiceChannelService.playTTS(text);
      
      if (playSuccess) {
        console.log(`✅ [!말 명령어] 음성 알림 완료: "${text}"`);
        
        // 봇이 음성 채널에 상주하도록 자동 퇴장 타이머 설정하지 않음
        // voiceChannelService.setAutoLeaveTimer(); // 주석 처리 - 상주 목적
        return true;
      } else {
        console.error(`[!말 명령어] 음성 재생 실패: "${text}"`);
        return false;
      }

    } catch (error) {
      console.error(`[!말 명령어] 음성 알림 오류:`, error);
      return false;
    }
  }
};