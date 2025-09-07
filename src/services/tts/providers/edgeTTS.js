const axios = require('axios');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

/**
 * Microsoft Edge TTS 제공자 (완전 무료)
 * Edge 브라우저에서 사용하는 TTS 엔진, 자연스러운 한국어 여성 음성 지원
 */
class EdgeTTS {
  constructor() {
    this.wsUrl = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
    this.voiceListUrl = 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list';
    
    // 기본 한국어 여성 음성 설정
    this.defaultVoice = process.env.EDGE_TTS_VOICE || 'ko-KR-SunHiNeural';
    this.defaultRate = '+0%'; // 말하기 속도
    this.defaultPitch = '+0Hz'; // 음높이
    
    console.log('✅ Microsoft Edge TTS 제공자 초기화');
  }

  /**
   * 사용 가능 여부 확인 (항상 사용 가능)
   */
  isAvailable() {
    return true;
  }

  /**
   * 텍스트를 음성으로 변환
   * @param {string} text - 변환할 텍스트
   * @param {Object} options - TTS 옵션
   * @returns {Promise<Buffer>} 오디오 데이터 버퍼
   */
  async synthesize(text, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const voice = options.voice || this.defaultVoice;
        const rate = options.rate || this.defaultRate;
        const pitch = options.pitch || this.defaultPitch;
        
        console.log(`🎵 [Edge TTS] TTS 요청: "${text.substring(0, 50)}..." (음성: ${voice})`);

        // WebSocket 연결
        const ws = new WebSocket(this.wsUrl, {
          headers: {
            'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36 Edg/91.0.864.41'
          }
        });

        let audioData = Buffer.alloc(0);
        let timeoutId;

        // 타임아웃 설정 (30초)
        timeoutId = setTimeout(() => {
          ws.close();
          reject(new Error('Edge TTS 요청 타임아웃'));
        }, 30000);

        ws.on('open', () => {
          console.log('🔗 [Edge TTS] WebSocket 연결됨');

          // 요청 ID 생성
          const requestId = uuidv4().replace(/-/g, '');
          
          // 설정 메시지 전송
          const configMessage = 
            `X-Timestamp:${new Date().toISOString()}\r\n` +
            `Content-Type:application/json; charset=utf-8\r\n` +
            `Path:speech.config\r\n\r\n` +
            JSON.stringify({
              context: {
                synthesis: {
                  audio: {
                    metadataoptions: {
                      sentenceBoundaryEnabled: 'false',
                      wordBoundaryEnabled: 'true'
                    },
                    outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
                  }
                }
              }
            });

          ws.send(configMessage);

          // SSML 생성
          const ssml = 
            `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ko-KR'>` +
            `<voice name='${voice}'>` +
            `<prosody rate='${rate}' pitch='${pitch}'>` +
            text.replace(/[<>&'"]/g, (c) => {
              switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case "'": return '&apos;';
                case '"': return '&quot;';
                default: return c;
              }
            }) +
            `</prosody></voice></speak>`;

          // TTS 요청 메시지 전송
          const ttsMessage = 
            `X-RequestId:${requestId}\r\n` +
            `Content-Type:application/ssml+xml\r\n` +
            `X-Timestamp:${new Date().toISOString()}Z\r\n` +
            `Path:ssml\r\n\r\n` +
            ssml;

          ws.send(ttsMessage);
        });

        ws.on('message', (data) => {
          const message = data.toString();
          
          // 바이너리 오디오 데이터 처리
          if (message.includes('Path:audio')) {
            const headerEnd = message.indexOf('\r\n\r\n') + 4;
            const audioBuffer = data.slice(headerEnd);
            audioData = Buffer.concat([audioData, audioBuffer]);
          }
          
          // 완료 메시지 확인
          if (message.includes('Path:turn.end')) {
            clearTimeout(timeoutId);
            ws.close();
            
            if (audioData.length > 0) {
              console.log(`✅ [Edge TTS] TTS 변환 완료: ${audioData.length} bytes`);
              resolve(audioData);
            } else {
              reject(new Error('오디오 데이터를 받지 못했습니다'));
            }
          }
        });

        ws.on('error', (error) => {
          clearTimeout(timeoutId);
          console.error('❌ [Edge TTS] WebSocket 오류:', error);
          reject(new Error(`Edge TTS WebSocket 오류: ${error.message}`));
        });

        ws.on('close', (code, reason) => {
          clearTimeout(timeoutId);
          if (audioData.length === 0) {
            console.error(`❌ [Edge TTS] 연결 종료: ${code} ${reason}`);
            reject(new Error(`Edge TTS 연결 종료: ${code}`));
          }
        });

      } catch (error) {
        reject(new Error(`Edge TTS 오류: ${error.message}`));
      }
    });
  }

  /**
   * 사용 가능한 한국어 음성 목록 조회
   */
  async getAvailableKoreanVoices() {
    try {
      console.log('🔍 [Edge TTS] 한국어 음성 목록 조회 중...');

      const response = await axios.get(this.voiceListUrl, {
        headers: {
          'Authority': 'speech.platform.bing.com',
          'Sec-CH-UA': '"Microsoft Edge";v="105", "Not)A;Brand";v="8", "Chromium";v="105"',
          'Sec-CH-UA-Mobile': '?0',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.27',
          'Sec-CH-UA-Platform': '"Windows"',
          'Accept': '*/*',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Dest': 'empty',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 10000
      });

      // 한국어 음성만 필터링
      const koreanVoices = response.data
        .filter(voice => voice.Locale.startsWith('ko-'))
        .map(voice => ({
          name: voice.FriendlyName || voice.ShortName,
          shortName: voice.ShortName,
          locale: voice.Locale,
          gender: voice.Gender,
          type: voice.VoiceType || 'Neural',
          description: `${voice.LocalName} (${voice.Gender}) - ${voice.VoiceType || 'Neural'}`
        }))
        .sort((a, b) => {
          // 여성 Neural 음성을 우선 정렬
          if (a.gender === 'Female' && b.gender !== 'Female') return -1;
          if (a.gender !== 'Female' && b.gender === 'Female') return 1;
          if (a.type === 'Neural' && b.type !== 'Neural') return -1;
          if (a.type !== 'Neural' && b.type === 'Neural') return 1;
          return a.name.localeCompare(b.name);
        });

      console.log(`✅ [Edge TTS] 한국어 음성 ${koreanVoices.length}개 조회 완료`);
      return koreanVoices;

    } catch (error) {
      console.warn('[Edge TTS] 음성 목록 조회 실패:', error.message);
      
      // 기본 한국어 음성 목록 반환
      return [
        {
          name: '선희 (여성, Neural)',
          shortName: 'ko-KR-SunHiNeural',
          locale: 'ko-KR',
          gender: 'Female',
          type: 'Neural',
          description: '선희 (여성) - Neural'
        },
        {
          name: '인준 (남성, Neural)',
          shortName: 'ko-KR-InJoonNeural',
          locale: 'ko-KR',
          gender: 'Male',
          type: 'Neural',
          description: '인준 (남성) - Neural'
        }
      ];
    }
  }

  /**
   * 사용량 정보 (무제한)
   */
  async getUsageInfo() {
    return {
      characters_used: 0,
      characters_limit: '무제한',
      reset_date: null,
      free: true
    };
  }

  /**
   * 제공자 정보
   */
  getInfo() {
    return {
      name: 'Microsoft Edge TTS',
      version: '1.0.0',
      description: '완전 무료, 자연스러운 한국어 Neural 음성 지원',
      features: ['korean', 'neural', 'completely_free', 'unlimited'],
      limitations: {
        free_characters_per_month: '무제한',
        max_text_length: '무제한',
        requires_api_key: false
      }
    };
  }
}

module.exports = { EdgeTTS };