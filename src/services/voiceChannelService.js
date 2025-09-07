let DiscordVoice;
try {
  DiscordVoice = require('@discordjs/voice');
} catch (error) {
  console.warn('⚠️ @discordjs/voice 패키지를 찾을 수 없습니다. TTS 기능이 비활성화됩니다.');
  DiscordVoice = null;
}

const fs = require('fs');

/**
 * Discord 음성 채널 관리 서비스
 * TTS 오디오 재생 및 음성 채널 연결 관리
 */
class VoiceChannelService {
  constructor() {
    this.connection = null;
    this.audioPlayer = null;
    this.currentChannel = null;
    this.isPlaying = false;
    this.queue = []; // 재생 대기열
    this.isAvailable = DiscordVoice !== null;
    
    if (this.isAvailable) {
      this.initializeAudioPlayer();
    } else {
      console.warn('🔇 TTS 서비스가 비활성화되었습니다 (음성 패키지 없음)');
    }
  }

  /**
   * 오디오 플레이어 초기화
   */
  initializeAudioPlayer() {
    if (!this.isAvailable) return;
    
    const { createAudioPlayer, AudioPlayerStatus } = DiscordVoice;
    this.audioPlayer = createAudioPlayer();

    // 오디오 플레이어 이벤트 처리
    this.audioPlayer.on(AudioPlayerStatus.Playing, () => {
      this.isPlaying = true;
      console.log('🎵 [Voice] 오디오 재생 시작');
    });

    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      this.isPlaying = false;
      console.log('🎵 [Voice] 오디오 재생 완료');
      
      // 대기열에 다음 오디오가 있으면 재생
      this.processQueue();
    });

    this.audioPlayer.on('error', (error) => {
      console.error('❌ [Voice] 오디오 플레이어 오류:', error);
      this.isPlaying = false;
      this.processQueue(); // 에러가 발생해도 다음 오디오 처리
    });
  }

  /**
   * 음성 채널에 연결
   * @param {Object} voiceChannel - Discord 음성 채널 객체
   * @returns {Promise<boolean>} 연결 성공 여부
   */
  async joinChannel(voiceChannel) {
    if (!this.isAvailable) {
      console.warn('🔇 [Voice] 음성 기능이 비활성화되어 있습니다');
      return false;
    }

    try {
      console.log(`🎵 [Voice] 음성 채널 연결 시도: ${voiceChannel.name}`);

      const { joinVoiceChannel, VoiceConnectionStatus, entersState } = DiscordVoice;

      // 이미 같은 채널에 연결되어 있으면 스킵
      if (this.connection && this.currentChannel?.id === voiceChannel.id) {
        console.log(`🎵 [Voice] 이미 연결된 채널: ${voiceChannel.name}`);
        return true;
      }

      // 기존 연결 해제
      if (this.connection) {
        await this.leaveChannel();
      }

      // 새 연결 생성
      this.connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      // 연결 상태 이벤트 처리
      this.connection.on(VoiceConnectionStatus.Ready, () => {
        console.log(`✅ [Voice] 음성 채널 연결 완료: ${voiceChannel.name}`);
        this.currentChannel = voiceChannel;
      });

      this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
        console.log('🔌 [Voice] 음성 채널 연결 해제됨');
        
        try {
          // 5초 내에 재연결 시도
          await Promise.race([
            entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch (error) {
          // 재연결 실패 시 정리
          console.warn('⚠️ [Voice] 재연결 실패, 연결 정리');
          this.connection.destroy();
          this.connection = null;
          this.currentChannel = null;
        }
      });

      this.connection.on('error', (error) => {
        console.error('❌ [Voice] 음성 연결 오류:', error);
      });

      // 오디오 플레이어를 연결에 구독
      this.connection.subscribe(this.audioPlayer);

      // 연결 완료까지 대기
      await entersState(this.connection, VoiceConnectionStatus.Ready, 30_000);
      
      return true;

    } catch (error) {
      console.error('❌ [Voice] 음성 채널 연결 실패:', error);
      
      // 실패한 연결 정리
      if (this.connection) {
        this.connection.destroy();
        this.connection = null;
      }
      
      return false;
    }
  }

  /**
   * 음성 채널에서 나가기
   */
  async leaveChannel() {
    try {
      if (this.connection) {
        console.log(`🔌 [Voice] 음성 채널 퇴장: ${this.currentChannel?.name || 'Unknown'}`);
        
        // 재생 중인 오디오 정지
        if (this.isPlaying) {
          this.audioPlayer.stop();
        }
        
        // 대기열 초기화
        this.queue = [];
        
        // 연결 해제
        this.connection.destroy();
        this.connection = null;
        this.currentChannel = null;
        this.isPlaying = false;
        
        console.log('✅ [Voice] 음성 채널 퇴장 완료');
      }
    } catch (error) {
      console.error('❌ [Voice] 음성 채널 퇴장 오류:', error);
    }
  }

  /**
   * 오디오 파일 재생
   * @param {string} audioFilePath - 재생할 오디오 파일 경로
   * @param {Object} options - 재생 옵션
   * @returns {Promise<boolean>} 재생 성공 여부
   */
  async playAudio(audioFilePath, options = {}) {
    try {
      // 파일 존재 여부 확인
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`오디오 파일을 찾을 수 없음: ${audioFilePath}`);
      }

      // 음성 채널 연결 확인
      if (!this.connection) {
        throw new Error('음성 채널에 연결되지 않았습니다');
      }

      const audioItem = {
        filePath: audioFilePath,
        options: options,
        id: Date.now() + Math.random()
      };

      // 즉시 재생 또는 대기열에 추가
      if (!this.isPlaying && this.queue.length === 0) {
        await this.playAudioItem(audioItem);
      } else {
        this.queue.push(audioItem);
        console.log(`📋 [Voice] 오디오 대기열 추가: ${this.queue.length}개 대기 중`);
      }

      return true;

    } catch (error) {
      console.error('❌ [Voice] 오디오 재생 실패:', error);
      return false;
    }
  }

  /**
   * 개별 오디오 아이템 재생
   */
  async playAudioItem(audioItem) {
    if (!this.isAvailable) return;

    try {
      const { createAudioResource } = DiscordVoice;
      const { filePath, options } = audioItem;
      
      console.log(`🎵 [Voice] 오디오 재생: ${filePath.split('/').pop()}`);

      // 오디오 리소스 생성
      const resource = createAudioResource(filePath, {
        inlineVolume: true,
        ...options
      });

      // 볼륨 설정
      if (resource.volume) {
        resource.volume.setVolume(options.volume || 1.0);
      }

      // 재생 시작
      this.audioPlayer.play(resource);

    } catch (error) {
      console.error('❌ [Voice] 오디오 아이템 재생 실패:', error);
      this.isPlaying = false;
    }
  }

  /**
   * 대기열 처리
   */
  async processQueue() {
    if (this.queue.length > 0 && !this.isPlaying) {
      const nextAudio = this.queue.shift();
      await this.playAudioItem(nextAudio);
    }
  }

  /**
   * TTS 텍스트를 음성으로 재생 (편의 메서드)
   * @param {string} text - TTS로 변환할 텍스트
   * @param {Object} ttsOptions - TTS 옵션
   * @param {Object} playOptions - 재생 옵션
   */
  async playTTS(text, ttsOptions = {}, playOptions = {}) {
    try {
      // TTS 서비스 동적 로드 (순환 의존성 방지)
      const { ttsService } = require('./tts/ttsService');
      
      // 텍스트를 오디오 파일로 변환
      const audioFilePath = await ttsService.generateSpeech(text, ttsOptions);
      
      // 생성된 오디오 파일 재생
      return await this.playAudio(audioFilePath, playOptions);

    } catch (error) {
      console.error('❌ [Voice] TTS 재생 실패:', error);
      return false;
    }
  }

  /**
   * TTS 템플릿을 사용한 음성 재생
   * @param {string} template - 템플릿 이름
   * @param {Array} args - 템플릿 인자
   * @param {Object} playOptions - 재생 옵션
   */
  async playTTSTemplate(template, args = [], playOptions = {}) {
    try {
      const { ttsService } = require('./tts/ttsService');
      
      const audioFilePath = await ttsService.generateFromTemplate(template, ...args);
      
      return await this.playAudio(audioFilePath, playOptions);

    } catch (error) {
      console.error('❌ [Voice] TTS 템플릿 재생 실패:', error);
      return false;
    }
  }

  /**
   * 현재 재생 중인 오디오 정지
   */
  stop() {
    if (this.isPlaying) {
      this.audioPlayer.stop();
      console.log('⏹️ [Voice] 오디오 재생 정지');
    }
  }

  /**
   * 대기열 초기화
   */
  clearQueue() {
    const queueSize = this.queue.length;
    this.queue = [];
    
    if (queueSize > 0) {
      console.log(`🗑️ [Voice] 대기열 초기화: ${queueSize}개 항목 삭제`);
    }
  }

  /**
   * 현재 상태 정보 반환
   */
  getStatus() {
    return {
      connected: !!this.connection,
      currentChannel: this.currentChannel ? {
        id: this.currentChannel.id,
        name: this.currentChannel.name,
        guild: this.currentChannel.guild.name
      } : null,
      isPlaying: this.isPlaying,
      queueLength: this.queue.length,
      connectionStatus: this.connection?.state?.status || 'disconnected'
    };
  }

  /**
   * 연결 상태 확인
   */
  isConnected() {
    return !!this.connection && this.connection.state.status === VoiceConnectionStatus.Ready;
  }

  /**
   * 자동 퇴장 타이머 설정 (5분 후 자동 퇴장)
   */
  setAutoLeaveTimer() {
    if (this.autoLeaveTimer) {
      clearTimeout(this.autoLeaveTimer);
    }

    this.autoLeaveTimer = setTimeout(() => {
      if (!this.isPlaying && this.queue.length === 0) {
        console.log('⏰ [Voice] 비활성 상태로 자동 퇴장');
        this.leaveChannel();
      }
    }, 5 * 60 * 1000); // 5분
  }

  /**
   * 자동 퇴장 타이머 취소
   */
  clearAutoLeaveTimer() {
    if (this.autoLeaveTimer) {
      clearTimeout(this.autoLeaveTimer);
      this.autoLeaveTimer = null;
    }
  }
}

// 싱글톤 패턴으로 내보내기
const voiceChannelService = new VoiceChannelService();
module.exports = { voiceChannelService };