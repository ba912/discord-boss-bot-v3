# TTS 시스템 구현 계획

## 📋 프로젝트 개요
Discord Boss Bot v3에 다중 제공자 지원 TTS 시스템을 구현하여 보스/이벤트 알림에 고품질 한국어 음성을 제공합니다.

## 🎯 주요 요구사항

### 핵심 기능
- **다중 TTS 제공자 지원** (Google Cloud, Azure, ElevenLabs, 로컬)
- **고품질 한국어 음성** (Neural2, WaveNet 우선)
- **음성 채널 참여** 후 TTS 재생
- **스케줄러 통합** (5분전/1분전 보스 알림)
- **미래 확장성** (길드전 등 이벤트 지원)

### 사용 시나리오
1. **현재**: 보스 리젠 5분전/1분전 음성 알림
2. **미래**: 길드전, 이벤트 등 다양한 알림 지원

## 🏗️ 시스템 아키텍처

### 1. TTS Service Layer (추상화)
```javascript
// src/services/tts/
├── ttsService.js          # 메인 TTS 서비스 (제공자 추상화)
├── providers/
│   ├── googleCloudTTS.js  # Google Cloud TTS 구현
│   ├── azureTTS.js        # Microsoft Azure TTS 구현
│   ├── elevenLabsTTS.js   # ElevenLabs TTS 구현
│   └── localTTS.js        # 로컬 fallback TTS
└── audioCache/            # 오디오 파일 캐싱
```

### 2. Voice Channel Service
```javascript
// src/services/voiceChannelService.js
// Discord 음성 채널 참여/재생/퇴장 관리
```

### 3. Event System (확장성)
```javascript
// src/services/eventService.js (미래 구현)
// 보스 외 이벤트 관리 (길드전, 정기 이벤트 등)
```

## 📊 구현 단계

### Phase 1: TTS 서비스 기반 구조 (1-2시간)
- [ ] TTS 추상화 인터페이스 설계
- [ ] Google Cloud TTS 제공자 구현
- [ ] 오디오 파일 캐싱 시스템
- [ ] 환경 변수 및 설정 관리

### Phase 2: Voice Channel 통합 (1-2시간)
- [ ] Discord 음성 채널 서비스 구현
- [ ] 음성 채널 참여/퇴장 로직
- [ ] TTS 오디오 재생 기능
- [ ] 에러 핸들링 및 복구

### Phase 3: 스케줄러 통합 (30분-1시간)
- [ ] schedulerService에 TTS 통합
- [ ] 5분전/1분전 알림 시 음성 재생
- [ ] 텍스트 + 음성 동시 알림

### Phase 4: 다중 제공자 지원 (1-2시간)
- [ ] Azure TTS 제공자 추가
- [ ] 제공자 fallback 로직
- [ ] 설정을 통한 제공자 선택

### Phase 5: 최적화 및 확장성 (1시간)
- [ ] 오디오 캐싱 최적화
- [ ] 이벤트 시스템 기반 설계
- [ ] 관리자 TTS 설정 명령어

## 🔧 기술 스택

### 의존성 추가 필요
```json
{
  "@google-cloud/text-to-speech": "^5.0.0",
  "@azure/cognitiveservices-speech-sdk": "^1.34.0", 
  "discord.js": "^14.22.1", // voice connection 지원
  "@discordjs/voice": "^0.16.0",
  "ffmpeg-static": "^5.2.0",
  "prism-media": "^1.3.5"
}
```

### 환경 변수 추가
```env
# TTS 설정
TTS_PROVIDER=google  # google, azure, elevenlabs, local
TTS_VOICE_CHANNEL_ID=your_voice_channel_id

# Google Cloud TTS
GOOGLE_TTS_PROJECT_ID=your_project_id
GOOGLE_TTS_VOICE=ko-KR-Neural2-A
GOOGLE_TTS_SPEAKING_RATE=1.0

# Azure TTS (선택)
AZURE_TTS_KEY=your_azure_key
AZURE_TTS_REGION=your_region
AZURE_TTS_VOICE=ko-KR-SunHiNeural

# ElevenLabs (선택)
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_VOICE_ID=korean_voice_id
```

## 🎵 한국어 음성 설정

### Google Cloud TTS 권장 설정
```javascript
const ttsConfig = {
  voice: {
    languageCode: 'ko-KR',
    name: 'ko-KR-Neural2-A', // 또는 ko-KR-Neural2-B
    ssmlGender: 'NEUTRAL'
  },
  audioConfig: {
    audioEncoding: 'MP3',
    speakingRate: 1.0,
    pitch: 0.0,
    volumeGainDb: 0.0
  }
};
```

### 음성 메시지 템플릿
```javascript
const voiceTemplates = {
  boss5MinWarning: (bossName) => `${bossName} 리젠 5분 전입니다.`,
  boss1MinWarning: (bossName) => `${bossName} 리젠 1분 전입니다.`,
  eventWarning: (eventName, minutes) => `${eventName} ${minutes}분 전입니다.`
};
```

## 🚀 성공 지표

### 기능 검증
- [ ] Google Cloud TTS로 한국어 음성 생성 성공
- [ ] Discord 음성 채널 참여/재생 정상 동작
- [ ] 보스 5분전/1분전 알림 시 음성 재생
- [ ] 여러 TTS 제공자 간 fallback 동작
- [ ] 오디오 캐싱으로 응답 시간 단축

### 품질 기준
- **음성 품질**: 자연스러운 한국어 발음
- **응답 시간**: TTS 생성 3초 이내
- **안정성**: 99% 이상 정상 재생
- **확장성**: 새 제공자 30분 내 추가 가능

## 📝 추후 확장 계획

### 이벤트 시스템 (Phase 6)
- 길드전, 정기 이벤트 스케줄 관리
- 1회성, 고정요일, N시간마다 이벤트 지원
- 이벤트별 커스텀 TTS 메시지

### 고급 기능 (Phase 7)
- 사용자별 음성 설정
- TTS 음성 속도/톤 조절
- 여러 언어 지원 (영어, 일본어 등)

## ⚠️ 주의사항

1. **API 비용**: Google Cloud TTS는 유료 서비스 (월 100만 문자 $16)
2. **Discord 제한**: 봇이 이미 다른 음성 채널에 있으면 이동 필요
3. **ffmpeg 의존성**: Discord 오디오 재생을 위해 필수
4. **캐싱 전략**: 동일한 메시지는 캐시된 오디오 재사용

## 🔍 테스트 계획

### 단위 테스트
- TTS 제공자별 음성 생성 테스트
- 오디오 파일 생성/저장 테스트
- Discord 음성 채널 연결 테스트

### 통합 테스트
- 스케줄러 → TTS → Discord 전체 플로우
- 여러 보스 동시 알림 처리
- 제공자 장애 시 fallback 동작

### 수동 테스트 시나리오
1. 보스 등록 → 5분 전 음성 알림 확인
2. 컷버튼 클릭 → 1분 전 음성 알림 확인
3. 여러 제공자 설정 변경 테스트
4. 음성 품질 및 자연스러움 평가