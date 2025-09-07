const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * ResponsiveVoice TTS 제공자 (완전 무료)
 * 한국어 여성 음성 지원, API 키 필요 없음
 */
class ResponsiveVoiceTTS {
  constructor() {
    this.apiKey = 'cy08LzuY'; // 기존에 사용하던 API 키
    this.baseUrl = 'https://texttospeech.responsivevoice.org/v1/text:synthesize';
    
    // 기본 설정
    this.defaultConfig = {
      voice: 'Korean Female',
      lang: 'ko-KR',
      rate: 0.8, // 더 느리게 설정
      pitch: 1.0,
      volume: 1.0,
      gender: 'female'
    };
    
    console.log('✅ ResponsiveVoice TTS 제공자 초기화 (완전 무료)');
  }

  /**
   * 사용 가능 여부 확인
   */
  isAvailable() {
    return true; // API 키가 있으므로 항상 사용 가능
  }

  /**
   * 텍스트를 음성으로 변환
   * @param {string} text - 변환할 텍스트
   * @param {Object} options - TTS 옵션
   * @returns {Promise<Buffer>} 오디오 데이터 버퍼
   */
  async synthesize(text, options = {}) {
    try {
      console.log(`🎵 [ResponsiveVoice] TTS 요청: "${text.substring(0, 50)}..."`);

      // 옵션 병합
      const ttsOptions = { ...this.defaultConfig, ...options };
      
      // 남성 목소리 효과를 위한 음높이와 속도 조절
      if (ttsOptions.gender === 'male') {
        ttsOptions.pitch = Math.min(ttsOptions.pitch, 0.8);
        ttsOptions.rate = Math.min(ttsOptions.rate, 0.9);
      }

      // API URL 파라미터 구성
      const params = new URLSearchParams({
        text: text,
        key: this.apiKey,
        src: 'ResponsiveVoiceNode',
        hl: 'ko-KR',
        r: ttsOptions.rate,
        p: ttsOptions.pitch,
        v: ttsOptions.volume,
        c: 'mp3',
        f: '44khz_16bit_stereo',
        sv: 'g3', // 한국어 지원 서버
        gender: ttsOptions.gender,
        voice: 'Korean Female',
        lang: 'ko'
      });

      const apiUrl = `${this.baseUrl}?${params.toString()}`;
      
      // API 호출
      const response = await axios.get(apiUrl, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30초 타임아웃
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.status !== 200) {
        throw new Error(`ResponsiveVoice API 오류: ${response.status}`);
      }

      console.log(`✅ [ResponsiveVoice] TTS 변환 완료: ${response.data.byteLength} bytes`);
      return Buffer.from(response.data);

    } catch (error) {
      if (error.response) {
        throw new Error(`ResponsiveVoice API 오류 (${error.response.status}): ${error.response.statusText}`);
      }
      throw new Error(`ResponsiveVoice TTS 실패: ${error.message}`);
    }
  }

  /**
   * 사용 가능한 한국어 음성 목록 조회
   */
  async getAvailableKoreanVoices() {
    // ResponsiveVoice는 한국어에 대해 Korean Female만 지원
    return [
      {
        name: 'Korean Female',
        voice_id: 'Korean Female',
        locale: 'ko-KR',
        gender: 'Female',
        type: 'Standard',
        description: '한국어 여성 음성 (기본)',
        options: {
          rate_range: '0.1-2.0',
          pitch_range: '0.1-2.0',
          volume_range: '0.1-1.0'
        }
      }
    ];
  }

  /**
   * 사용량 정보 조회 (무제한)
   */
  async getUsageInfo() {
    return {
      characters_used: 0,
      characters_limit: '무제한',
      reset_date: null,
      free: true,
      provider: 'ResponsiveVoice'
    };
  }

  /**
   * 제공자 정보
   */
  getInfo() {
    return {
      name: 'ResponsiveVoice',
      version: '1.0.0',
      description: '완전 무료, 한국어 여성 음성 지원 (게임 길드 최적화)',
      features: ['korean', 'female_voice', 'completely_free', 'unlimited', 'game_optimized'],
      limitations: {
        free_characters_per_month: '무제한',
        max_text_length: '제한 없음',
        requires_api_key: false,
        supported_voices: ['Korean Female']
      },
      recommended_settings: {
        rate: 0.8, // 게임 길드원들이 듣기 편한 속도
        pitch: 1.0,
        volume: 1.0
      }
    };
  }

  /**
   * 게임 길드 최적화된 설정 적용
   * @param {string} text - 변환할 텍스트
   * @returns {Promise<Buffer>} 최적화된 설정으로 생성된 오디오
   */
  async synthesizeForGaming(text) {
    const gamingOptions = {
      rate: 0.8,    // 조금 느리게 (명확한 전달)
      pitch: 1.0,   // 자연스러운 음높이
      volume: 1.0,  // 최대 볼륨
      gender: 'female'
    };

    return await this.synthesize(text, gamingOptions);
  }
}

module.exports = { ResponsiveVoiceTTS };