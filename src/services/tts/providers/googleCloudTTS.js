const textToSpeech = require('@google-cloud/text-to-speech');

/**
 * Google Cloud Text-to-Speech 제공자
 * 고품질 한국어 Neural2/WaveNet 음성 지원
 */
class GoogleCloudTTS {
  constructor() {
    this.client = null;
    this.defaultConfig = {
      voice: {
        languageCode: 'ko-KR',
        name: process.env.GOOGLE_TTS_VOICE || 'ko-KR-Neural2-A',
        ssmlGender: 'NEUTRAL'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: parseFloat(process.env.GOOGLE_TTS_SPEAKING_RATE) || 1.0,
        pitch: 0.0,
        volumeGainDb: 0.0
      }
    };

    this.initializeClient();
  }

  /**
   * Google Cloud TTS 클라이언트 초기화
   */
  async initializeClient() {
    try {
      // 서비스 계정 키 파일 또는 환경 변수로 인증
      const options = {};
      
      if (process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
        options.keyFilename = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
      }
      
      if (process.env.GOOGLE_TTS_PROJECT_ID) {
        options.projectId = process.env.GOOGLE_TTS_PROJECT_ID;
      }

      this.client = new textToSpeech.TextToSpeechClient(options);
      
      console.log('✅ Google Cloud TTS 클라이언트 초기화 완료');
      
    } catch (error) {
      console.error('❌ Google Cloud TTS 초기화 실패:', error);
      this.client = null;
    }
  }

  /**
   * 제공자 사용 가능 여부 확인
   */
  async isAvailable() {
    if (!this.client) {
      return false;
    }

    try {
      // 간단한 테스트 요청으로 서비스 상태 확인
      await this.client.listVoices({ languageCode: 'ko-KR' });
      return true;
    } catch (error) {
      console.warn('⚠️ Google Cloud TTS 서비스 연결 실패:', error.message);
      return false;
    }
  }

  /**
   * 텍스트를 음성으로 변환
   * @param {string} text - 변환할 텍스트
   * @param {Object} options - TTS 옵션 설정
   * @returns {Promise<Buffer>} 오디오 데이터 버퍼
   */
  async synthesize(text, options = {}) {
    if (!this.client) {
      throw new Error('Google Cloud TTS 클라이언트가 초기화되지 않았습니다');
    }

    const startTime = Date.now();

    try {
      // 요청 설정 구성
      const request = {
        input: { text: text },
        voice: { 
          ...this.defaultConfig.voice,
          ...options.voice 
        },
        audioConfig: {
          ...this.defaultConfig.audioConfig,
          ...options.audioConfig
        }
      };

      console.log(`🎵 [Google TTS] 음성 생성 요청: "${text.substring(0, 50)}..." (${request.voice.name})`);

      // TTS API 호출
      const [response] = await this.client.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new Error('Google Cloud TTS에서 오디오 데이터를 받지 못했습니다');
      }

      console.log(`✅ [Google TTS] 음성 생성 완료: ${Date.now() - startTime}ms`);
      
      return Buffer.from(response.audioContent, 'binary');

    } catch (error) {
      console.error(`❌ [Google TTS] 음성 생성 실패:`, error);
      
      // API 에러 세부 정보 로깅
      if (error.code) {
        console.error(`   - 에러 코드: ${error.code}`);
      }
      if (error.details) {
        console.error(`   - 에러 세부사항: ${error.details}`);
      }
      
      throw new Error(`Google Cloud TTS 오류: ${error.message}`);
    }
  }

  /**
   * 사용 가능한 한국어 음성 목록 조회
   * @returns {Promise<Array>} 음성 목록
   */
  async getAvailableKoreanVoices() {
    if (!this.client) {
      throw new Error('Google Cloud TTS 클라이언트가 초기화되지 않았습니다');
    }

    try {
      const [result] = await this.client.listVoices({
        languageCode: 'ko-KR',
      });

      const voices = result.voices
        .filter(voice => voice.languageCodes.includes('ko-KR'))
        .map(voice => ({
          name: voice.name,
          gender: voice.ssmlGender,
          naturalSampleRate: voice.naturalSampleRateHertz,
          type: this.getVoiceType(voice.name)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      console.log(`📋 사용 가능한 한국어 음성: ${voices.length}개`);
      voices.forEach(voice => {
        console.log(`   - ${voice.name} (${voice.gender}, ${voice.type})`);
      });

      return voices;

    } catch (error) {
      console.error('❌ 한국어 음성 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * 음성 타입 분류 (Standard, WaveNet, Neural2)
   */
  getVoiceType(voiceName) {
    if (voiceName.includes('Neural2')) return 'Neural2';
    if (voiceName.includes('WaveNet')) return 'WaveNet';
    if (voiceName.includes('Standard')) return 'Standard';
    return 'Unknown';
  }

  /**
   * 음성 설정 유효성 검사
   */
  validateVoiceConfig(config) {
    const errors = [];

    // 언어 코드 확인
    if (config.voice?.languageCode && !config.voice.languageCode.startsWith('ko-')) {
      errors.push('한국어가 아닌 언어 코드입니다');
    }

    // 속도 범위 확인 (0.25 - 4.0)
    if (config.audioConfig?.speakingRate) {
      const rate = config.audioConfig.speakingRate;
      if (rate < 0.25 || rate > 4.0) {
        errors.push('음성 속도는 0.25 ~ 4.0 범위여야 합니다');
      }
    }

    // 피치 범위 확인 (-20.0 - 20.0)
    if (config.audioConfig?.pitch) {
      const pitch = config.audioConfig.pitch;
      if (pitch < -20.0 || pitch > 20.0) {
        errors.push('음성 피치는 -20.0 ~ 20.0 범위여야 합니다');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * SSML 텍스트 지원 여부 확인
   */
  isSSMLSupported() {
    return true;
  }

  /**
   * 제공자 정보 반환
   */
  getProviderInfo() {
    return {
      name: 'Google Cloud Text-to-Speech',
      version: '6.3.0',
      supportedLanguages: ['ko-KR', 'en-US', 'ja-JP'], // 주요 언어만 표시
      supportedFormats: ['MP3', 'LINEAR16', 'OGG_OPUS'],
      maxTextLength: 5000, // characters
      ssmlSupported: true,
      defaultVoice: this.defaultConfig.voice.name
    };
  }
}

module.exports = { GoogleCloudTTS };