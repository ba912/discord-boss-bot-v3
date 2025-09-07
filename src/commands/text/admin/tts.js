const { MessageFlags } = require('discord.js');
const { checkAdminPermission } = require('../../../utils/permissions');
const { ttsService } = require('../../../services/tts/ttsService');
const { voiceChannelService } = require('../../../services/voiceChannelService');

module.exports = {
  name: 'tts',
  aliases: ['음성'],
  description: 'TTS 시스템 관리 및 테스트',
  usage: '!tts <하위명령어> [옵션]',
  cooldown: 3,
  
  async execute(message, args) {
    try {
      // 관리자 권한 확인
      const hasPermission = await checkAdminPermission(message.author.id);
      if (!hasPermission) {
        return message.reply('❌ 이 명령어는 운영진 이상만 사용할 수 있습니다.');
      }

      if (args.length === 0) {
        return message.reply(this.getHelpMessage());
      }

      const subCommand = args[0].toLowerCase();

      switch (subCommand) {
        case 'status':
        case '상태':
          return await this.handleStatusCommand(message);
          
        case 'test':
        case '테스트':
          return await this.handleTestCommand(message, args.slice(1));
          
        case 'join':
        case '참여':
          return await this.handleJoinCommand(message, args.slice(1));
          
        case 'leave':
        case '나가기':
          return await this.handleLeaveCommand(message);
          
        case 'speak':
        case '말하기':
          return await this.handleSpeakCommand(message, args.slice(1));
          
        case 'voices':
        case '음성목록':
          return await this.handleVoicesCommand(message);
          
        case 'provider':
        case '제공자':
          return await this.handleProviderCommand(message, args.slice(1));
          
        case 'help':
        case '도움말':
          return message.reply(this.getHelpMessage());
          
        default:
          return message.reply('❌ 알 수 없는 하위 명령어입니다. `!tts help`로 도움말을 확인하세요.');
      }

    } catch (error) {
      console.error('[TTS 명령어] 오류:', error);
      return message.reply('❌ 명령어 처리 중 오류가 발생했습니다.');
    }
  },

  /**
   * TTS 시스템 상태 확인
   */
  async handleStatusCommand(message) {
    try {
      const ttsStatus = ttsService.getStatus();
      const voiceStatus = voiceChannelService.getStatus();

      let statusMessage = '📊 **TTS 시스템 상태**\n\n';
      
      // TTS 서비스 상태
      statusMessage += `🎵 **TTS 서비스**\n`;
      statusMessage += `• 현재 제공자: ${ttsStatus.currentProvider}\n`;
      statusMessage += `• 사용 가능한 제공자: ${ttsStatus.availableProviders.join(', ') || '없음'}\n`;
      statusMessage += `• 캐시 디렉토리: ${ttsStatus.cacheDir}\n`;
      statusMessage += `• 사용 가능한 템플릿: ${ttsStatus.templates.length}개\n\n`;

      // 음성 채널 상태
      statusMessage += `🔊 **음성 채널 서비스**\n`;
      statusMessage += `• 연결 상태: ${voiceStatus.connected ? '✅ 연결됨' : '❌ 연결되지 않음'}\n`;
      
      if (voiceStatus.currentChannel) {
        statusMessage += `• 현재 채널: ${voiceStatus.currentChannel.name} (${voiceStatus.currentChannel.guild})\n`;
      }
      
      statusMessage += `• 재생 상태: ${voiceStatus.isPlaying ? '🎵 재생 중' : '⏸️ 정지'}\n`;
      statusMessage += `• 대기열: ${voiceStatus.queueLength}개\n`;
      statusMessage += `• 연결 상태: ${voiceStatus.connectionStatus}\n\n`;

      // 환경 설정
      statusMessage += `⚙️ **환경 설정**\n`;
      statusMessage += `• TTS_PROVIDER: ${process.env.TTS_PROVIDER || '미설정'}\n`;
      statusMessage += `• TTS_VOICE_CHANNEL_ID: ${process.env.TTS_VOICE_CHANNEL_ID || '미설정'}\n`;
      statusMessage += `• GOOGLE_TTS_VOICE: ${process.env.GOOGLE_TTS_VOICE || '미설정'}\n`;

      await message.reply({ content: statusMessage });

    } catch (error) {
      console.error('[TTS 상태] 오류:', error);
      await message.reply('❌ 상태 조회 중 오류가 발생했습니다.');
    }
  },

  /**
   * TTS 테스트
   */
  async handleTestCommand(message, args) {
    try {
      const testText = args.join(' ') || '테스트 음성입니다';
      
      await message.reply(`🎵 TTS 테스트 시작: "${testText}"`);

      const success = await voiceChannelService.playTTS(testText);

      if (success) {
        await message.reply('✅ TTS 테스트 완료');
      } else {
        await message.reply('❌ TTS 테스트 실패');
      }

    } catch (error) {
      console.error('[TTS 테스트] 오류:', error);
      await message.reply('❌ TTS 테스트 중 오류가 발생했습니다.');
    }
  },

  /**
   * 음성 채널 참여
   */
  async handleJoinCommand(message, args) {
    try {
      let targetChannel = null;

      if (args.length > 0) {
        // 채널 ID 또는 이름으로 찾기
        const channelQuery = args.join(' ');
        targetChannel = message.guild.channels.cache.find(channel => 
          channel.type === 2 && // GUILD_VOICE
          (channel.id === channelQuery || channel.name.includes(channelQuery))
        );
      } else {
        // 사용자가 현재 있는 음성 채널
        targetChannel = message.member.voice.channel;
      }

      if (!targetChannel) {
        return message.reply('❌ 음성 채널을 찾을 수 없습니다. 음성 채널에 입장하거나 채널 이름/ID를 지정하세요.');
      }

      await message.reply(`🎵 음성 채널 참여 시도: ${targetChannel.name}`);

      const success = await voiceChannelService.joinChannel(targetChannel);

      if (success) {
        await message.reply(`✅ 음성 채널 참여 완료: ${targetChannel.name}`);
      } else {
        await message.reply(`❌ 음성 채널 참여 실패: ${targetChannel.name}`);
      }

    } catch (error) {
      console.error('[TTS 참여] 오류:', error);
      await message.reply('❌ 음성 채널 참여 중 오류가 발생했습니다.');
    }
  },

  /**
   * 음성 채널에서 나가기
   */
  async handleLeaveCommand(message) {
    try {
      await voiceChannelService.leaveChannel();
      await message.reply('✅ 음성 채널에서 나갔습니다.');

    } catch (error) {
      console.error('[TTS 나가기] 오류:', error);
      await message.reply('❌ 음성 채널 나가기 중 오류가 발생했습니다.');
    }
  },

  /**
   * 사용자 정의 텍스트 음성 재생
   */
  async handleSpeakCommand(message, args) {
    try {
      if (args.length === 0) {
        return message.reply('❌ 음성으로 변환할 텍스트를 입력하세요. 예: `!tts speak 안녕하세요`');
      }

      const text = args.join(' ');
      
      if (text.length > 200) {
        return message.reply('❌ 텍스트가 너무 깁니다. 200자 이하로 입력해주세요.');
      }

      await message.reply(`🎵 음성 재생: "${text}"`);

      const success = await voiceChannelService.playTTS(text);

      if (!success) {
        await message.reply('❌ 음성 재생에 실패했습니다. 음성 채널 연결을 확인하세요.');
      }

    } catch (error) {
      console.error('[TTS 말하기] 오류:', error);
      await message.reply('❌ 음성 재생 중 오류가 발생했습니다.');
    }
  },

  /**
   * 사용 가능한 음성 목록 조회
   */
  async handleVoicesCommand(message) {
    try {
      await message.reply('🔍 사용 가능한 음성 목록을 조회하는 중...');

      const currentProvider = ttsService.getCurrentProviderName();
      
      if (currentProvider === 'google') {
        const { ttsService: tts } = require('../../../services/tts/ttsService');
        const provider = tts.providers.get('google');
        
        if (provider && provider.getAvailableKoreanVoices) {
          const voices = await provider.getAvailableKoreanVoices();
          
          let voiceList = `📋 **Google Cloud TTS 한국어 음성 목록** (${voices.length}개)\n\n`;
          
          voices.forEach(voice => {
            voiceList += `• **${voice.name}**\n`;
            voiceList += `  - 성별: ${voice.gender}\n`;
            voiceList += `  - 타입: ${voice.type}\n`;
            voiceList += `  - 샘플링: ${voice.naturalSampleRate}Hz\n\n`;
          });

          voiceList += `\n현재 사용 중: **${process.env.GOOGLE_TTS_VOICE || 'ko-KR-Neural2-A'}**`;

          await message.reply({ content: voiceList });
        } else {
          await message.reply('❌ 음성 목록을 조회할 수 없습니다.');
        }
      } else {
        await message.reply(`❌ 현재 제공자 '${currentProvider}'는 음성 목록 조회를 지원하지 않습니다.`);
      }

    } catch (error) {
      console.error('[TTS 음성목록] 오류:', error);
      await message.reply('❌ 음성 목록 조회 중 오류가 발생했습니다.');
    }
  },

  /**
   * TTS 제공자 관리
   */
  async handleProviderCommand(message, args) {
    try {
      if (args.length === 0) {
        const status = ttsService.getStatus();
        let providerInfo = `📋 **TTS 제공자 정보**\n\n`;
        providerInfo += `• 현재 제공자: **${status.currentProvider}**\n`;
        providerInfo += `• 사용 가능한 제공자: ${status.availableProviders.join(', ')}\n\n`;
        providerInfo += `제공자를 변경하려면: \`!tts provider <이름>\``;
        
        return message.reply({ content: providerInfo });
      }

      const newProvider = args[0].toLowerCase();
      const success = ttsService.setProvider(newProvider);

      if (success) {
        await message.reply(`✅ TTS 제공자가 '${newProvider}'로 변경되었습니다.`);
      } else {
        await message.reply(`❌ '${newProvider}' 제공자를 찾을 수 없습니다.\n사용 가능한 제공자: ${ttsService.getAvailableProviders().join(', ')}`);
      }

    } catch (error) {
      console.error('[TTS 제공자] 오류:', error);
      await message.reply('❌ TTS 제공자 설정 중 오류가 발생했습니다.');
    }
  },

  /**
   * 도움말 메시지
   */
  getHelpMessage() {
    return `🎵 **TTS 명령어 도움말**

**기본 명령어:**
\`!tts status\` - TTS 시스템 상태 확인
\`!tts test [텍스트]\` - TTS 테스트 (기본: "테스트 음성입니다")

**음성 채널 관리:**
\`!tts join [채널명/ID]\` - 음성 채널 참여 (없으면 현재 채널)
\`!tts leave\` - 음성 채널에서 나가기

**음성 재생:**
\`!tts speak <텍스트>\` - 사용자 정의 텍스트 음성 재생

**고급 기능:**
\`!tts voices\` - 사용 가능한 음성 목록 조회
\`!tts provider [이름]\` - TTS 제공자 확인/변경

**예시:**
\`!tts test 베나투스 5분 전입니다\`
\`!tts join 보스알림\`
\`!tts speak 안녕하세요 길드원 여러분\``;
  }
};