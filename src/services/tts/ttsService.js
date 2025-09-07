const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * TTS 서비스 메인 클래스
 * 다양한 TTS 제공자를 추상화하고 통합 인터페이스 제공
 */
class TTSService {
  constructor() {
    this.providers = new Map();
    this.currentProvider = null;
    this.cacheDir = path.join(__dirname, 'audioCache');
    this.voiceTemplates = {
      boss5MinWarning: (bossName) => `${bossName} 리젠 5분 전입니다.`,
      boss1MinWarning: (bossName) => `${bossName} 리젠 1분 전입니다.`,
      eventWarning: (eventName, minutes) => `${eventName} ${minutes}분 전입니다.`,
      custom: (text) => text
    };

    this.initializeCache();
    this.loadProviders();
  }

  /**
   * 캐시 디렉토리 초기화
   */
  initializeCache() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      console.log(`✅ TTS 오디오 캐시 디렉토리 생성: ${this.cacheDir}`);
    }
  }

  /**
   * 사용 가능한 TTS 제공자 로드
   */
  async loadProviders() {
    try {
      // ResponsiveVoice TTS 제공자 로드 (유일한 제공자)
      const { ResponsiveVoiceTTS } = require('./providers/responsiveVoiceTTS');
      const responsiveVoiceProvider = new ResponsiveVoiceTTS();
      
      if (responsiveVoiceProvider.isAvailable()) {
        this.providers.set('responsivevoice', responsiveVoiceProvider);
        this.currentProvider = responsiveVoiceProvider;
        console.log('✅ ResponsiveVoice TTS 제공자 로드 완료 (완전 무료, 게임 길드 최적화)');
      } else {
        console.error('❌ ResponsiveVoice TTS 제공자를 사용할 수 없습니다');
      }
      
      if (!this.currentProvider) {
        console.error('❌ 사용 가능한 TTS 제공자가 없습니다');
      } else {
        console.log(`🎵 현재 TTS 제공자: ${this.getCurrentProviderName()}`);
      }

    } catch (error) {
      console.error('❌ TTS 제공자 로드 실패:', error);
    }
  }

  /**
   * TTS 제공자 변경
   * @param {string} providerName - 제공자 이름 (responsivevoice)
   * @returns {boolean} 변경 성공 여부
   */
  setProvider(providerName) {
    if (this.providers.has(providerName)) {
      this.currentProvider = this.providers.get(providerName);
      console.log(`🔄 TTS 제공자 변경: ${providerName}`);
      return true;
    }
    
    console.warn(`⚠️ TTS 제공자를 찾을 수 없음: ${providerName}`);
    return false;
  }

  /**
   * 현재 제공자 이름 반환
   */
  getCurrentProviderName() {
    for (const [name, provider] of this.providers) {
      if (provider === this.currentProvider) {
        return name;
      }
    }
    return 'unknown';
  }

  /**
   * 사용 가능한 제공자 목록 반환
   */
  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * 텍스트를 음성 파일로 변환
   * @param {string} text - 변환할 텍스트
   * @param {Object} options - TTS 옵션
   * @returns {Promise<string>} 생성된 오디오 파일 경로
   */
  async generateSpeech(text, options = {}) {
    if (!this.currentProvider) {
      throw new Error('사용 가능한 TTS 제공자가 없습니다');
    }

    const startTime = Date.now();
    
    try {
      // 캐시 확인
      const cacheKey = this.generateCacheKey(text, options);
      const cachedFile = await this.getCachedAudio(cacheKey);
      
      if (cachedFile) {
        console.log(`🎵 [TTS] 캐시된 오디오 사용: ${Date.now() - startTime}ms`);
        return cachedFile;
      }

      // TTS 생성
      console.log(`🎵 [TTS] 음성 생성 시작: "${text.substring(0, 30)}..."`);
      const audioBuffer = await this.currentProvider.synthesize(text, options);
      
      // 파일 저장
      const audioFile = await this.saveAudioToCache(cacheKey, audioBuffer);
      
      console.log(`✅ [TTS] 음성 생성 완료: ${Date.now() - startTime}ms`);
      return audioFile;

    } catch (error) {
      console.error(`❌ [TTS] 음성 생성 실패:`, error);
      
      // fallback 시도
      if (this.providers.size > 1) {
        return await this.tryFallbackProvider(text, options);
      }
      
      throw error;
    }
  }

  /**
   * 템플릿을 사용한 음성 생성
   * @param {string} template - 템플릿 이름
   * @param {...any} args - 템플릿 인자
   * @returns {Promise<string>} 생성된 오디오 파일 경로
   */
  async generateFromTemplate(template, ...args) {
    if (!this.voiceTemplates[template]) {
      throw new Error(`존재하지 않는 TTS 템플릿: ${template}`);
    }

    const text = this.voiceTemplates[template](...args);
    return await this.generateSpeech(text);
  }

  /**
   * fallback 제공자 시도
   */
  async tryFallbackProvider(text, options) {
    const currentProviderName = this.getCurrentProviderName();
    
    for (const [name, provider] of this.providers) {
      if (name !== currentProviderName) {
        try {
          console.log(`🔄 [TTS] Fallback 시도: ${name}`);
          const audioBuffer = await provider.synthesize(text, options);
          const cacheKey = this.generateCacheKey(text, options, name);
          return await this.saveAudioToCache(cacheKey, audioBuffer);
        } catch (fallbackError) {
          console.warn(`⚠️ [TTS] Fallback 실패 (${name}):`, fallbackError.message);
        }
      }
    }
    
    throw new Error('모든 TTS 제공자에서 실패했습니다');
  }

  /**
   * 캐시 키 생성
   */
  generateCacheKey(text, options = {}, providerName = null) {
    const provider = providerName || this.getCurrentProviderName();
    const data = JSON.stringify({ text, options, provider });
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * 캐시된 오디오 파일 확인
   */
  async getCachedAudio(cacheKey) {
    const filePath = path.join(this.cacheDir, `${cacheKey}.mp3`);
    
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    
    return null;
  }

  /**
   * 오디오를 캐시에 저장
   */
  async saveAudioToCache(cacheKey, audioBuffer) {
    const filePath = path.join(this.cacheDir, `${cacheKey}.mp3`);
    
    await fs.promises.writeFile(filePath, audioBuffer);
    
    return filePath;
  }

  /**
   * 캐시 정리 (24시간 이상 된 파일 삭제)
   */
  async cleanupCache() {
    try {
      const files = await fs.promises.readdir(this.cacheDir);
      const now = Date.now();
      let cleanedFiles = 0;

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = await fs.promises.stat(filePath);
        const age = now - stats.mtime.getTime();

        // 24시간 = 24 * 60 * 60 * 1000ms
        if (age > 24 * 60 * 60 * 1000) {
          await fs.promises.unlink(filePath);
          cleanedFiles++;
        }
      }

      if (cleanedFiles > 0) {
        console.log(`🧹 [TTS] 캐시 정리 완료: ${cleanedFiles}개 파일 삭제`);
      }

    } catch (error) {
      console.error('❌ [TTS] 캐시 정리 실패:', error);
    }
  }

  /**
   * TTS 서비스 상태 정보 반환
   */
  getStatus() {
    return {
      currentProvider: this.getCurrentProviderName(),
      availableProviders: this.getAvailableProviders(),
      cacheDir: this.cacheDir,
      templates: Object.keys(this.voiceTemplates)
    };
  }
}

// 싱글톤 패턴으로 내보내기
const ttsService = new TTSService();
module.exports = { ttsService };