const axios = require('axios');

/**
 * ElevenLabs TTS 제공자 (무료 계층)
 * 월 10,000 문자 무료, 자연스러운 한국어 음성 지원
 */
class ElevenLabsTTS {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || null;
    this.voiceId = process.env.ELEVENLABS_VOICE_ID || 'pFZP5JQG7iQjIQuC4Br8'; // 기본 여성 음성
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    
    // 무료 계층에서도 사용 가능한 기본 설정
    this.defaultConfig = {
      model_id: 'eleven_multilingual_v2', // 한국어 지원 모델
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true
      }
    };
    
    console.log('✅ ElevenLabs TTS 제공자 초기화');
  }

  /**
   * 사용 가능 여부 확인
   */
  isAvailable() {
    // API 키가 없어도 무료 계층으로 사용 가능
    return true;
  }

  /**
   * 텍스트를 음성으로 변환
   * @param {string} text - 변환할 텍스트
   * @param {Object} options - TTS 옵션
   * @returns {Promise<Buffer>} 오디오 데이터 버퍼
   */
  async synthesize(text, options = {}) {
    try {
      // 텍스트 길이 제한 (무료 계층 고려)
      if (text.length > 500) {
        throw new Error('텍스트가 너무 깁니다 (최대 500자)');
      }

      const voiceId = options.voiceId || this.voiceId;
      const url = `${this.baseUrl}/text-to-speech/${voiceId}`;
      
      const requestData = {
        text: text,
        model_id: options.modelId || this.defaultConfig.model_id,
        voice_settings: {
          ...this.defaultConfig.voice_settings,
          ...options.voice_settings
        }
      };

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      };

      // API 키가 있으면 헤더에 추가 (무료 계층에서는 선택사항)
      if (this.apiKey) {
        headers['xi-api-key'] = this.apiKey;
      }

      console.log(`🎵 [ElevenLabs] TTS 요청: "${text.substring(0, 50)}..."`);

      const response = await axios.post(url, requestData, {
        headers: headers,
        responseType: 'arraybuffer',
        timeout: 30000 // 30초 타임아웃
      });

      if (response.status !== 200) {
        throw new Error(`ElevenLabs API 오류: ${response.status}`);
      }

      console.log(`✅ [ElevenLabs] TTS 변환 완료: ${response.data.byteLength} bytes`);
      return Buffer.from(response.data);

    } catch (error) {
      if (error.response) {
        const errorMsg = error.response.data?.detail?.message || error.response.statusText;
        throw new Error(`ElevenLabs API 오류 (${error.response.status}): ${errorMsg}`);
      }
      throw new Error(`ElevenLabs TTS 실패: ${error.message}`);
    }
  }

  /**
   * 사용 가능한 한국어 음성 목록 조회
   */
  async getAvailableKoreanVoices() {
    try {
      const headers = {
        'Accept': 'application/json'
      };

      if (this.apiKey) {
        headers['xi-api-key'] = this.apiKey;
      }

      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: headers,
        timeout: 10000
      });

      // 한국어 지원 음성 필터링 (기본 음성들만)
      const koreanVoices = response.data.voices.filter(voice => 
        voice.labels && (
          voice.labels.language?.includes('korean') || 
          voice.labels.accent?.includes('korean') ||
          voice.name.toLowerCase().includes('korean')
        )
      );

      return koreanVoices.map(voice => ({
        name: voice.name,
        voice_id: voice.voice_id,
        category: voice.category || 'general',
        gender: voice.labels?.gender || 'unknown',
        description: voice.labels?.description || '',
        preview_url: voice.preview_url
      }));

    } catch (error) {
      console.warn('[ElevenLabs] 음성 목록 조회 실패:', error.message);
      
      // 기본 음성 목록 반환 (오프라인 대체)
      return [
        {
          name: 'Rachel (Korean)',
          voice_id: 'pFZP5JQG7iQjIQuC4Br8',
          category: 'premade',
          gender: 'female',
          description: '자연스러운 여성 한국어 음성'
        }
      ];
    }
  }

  /**
   * 사용량 정보 조회 (API 키가 있을 때만)
   */
  async getUsageInfo() {
    if (!this.apiKey) {
      return {
        characters_used: 0,
        characters_limit: 10000,
        reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/user/subscription`, {
        headers: {
          'xi-api-key': this.apiKey,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      return {
        characters_used: response.data.character_count || 0,
        characters_limit: response.data.character_limit || 10000,
        reset_date: response.data.next_character_count_reset_unix ? 
          new Date(response.data.next_character_count_reset_unix * 1000).toISOString() : 
          null
      };

    } catch (error) {
      console.warn('[ElevenLabs] 사용량 조회 실패:', error.message);
      return null;
    }
  }

  /**
   * 제공자 정보
   */
  getInfo() {
    return {
      name: 'ElevenLabs',
      version: '1.0.0',
      description: '자연스러운 한국어 음성 지원 (무료 월 10,000자)',
      features: ['korean', 'natural', 'free_tier'],
      limitations: {
        free_characters_per_month: 10000,
        max_text_length: 500,
        requires_api_key: false
      }
    };
  }
}

module.exports = { ElevenLabsTTS };