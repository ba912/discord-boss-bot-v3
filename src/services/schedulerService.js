const cron = require('node-cron');
const { bossScheduleService } = require('./bossScheduleService');
const { voiceChannelService } = require('./voiceChannelService');
const maintenanceService = require('./maintenanceService');

/**
 * 보스 알림 스케줄러 서비스
 * 1분마다 실행되어 보스 리젠 시간을 체크하고 알림을 발송합니다.
 */
class SchedulerService {
  constructor() {
    this.client = null;
    this.notificationChannelId = null;
    this.voiceChannelId = process.env.TTS_VOICE_CHANNEL_ID || null;
    this.isRunning = false;
    this.task = null;
    this.ttsEnabled = process.env.TTS_PROVIDER && this.voiceChannelId;
    
    // 알림 중복 방지용 캐시 (키: '보스명_리젠시간_알림타입', 값: 발송시간)
    this.notificationCache = new Map();
    
    console.log('✅ SchedulerService 초기화 완료');
    if (this.ttsEnabled) {
      console.log(`🎵 TTS 기능 활성화: ${process.env.TTS_PROVIDER} (채널: ${this.voiceChannelId})`);
    } else {
      console.log('🔇 TTS 기능 비활성화 (환경 변수 미설정)');
    }
  }

  /**
   * 스케줄러 초기화 및 시작
   * @param {Client} client - Discord 클라이언트
   * @param {string} channelId - 알림을 발송할 채널 ID
   */
  start(client, channelId) {
    if (this.isRunning) {
      console.log('⚠️ 스케줄러가 이미 실행 중입니다.');
      return;
    }

    this.client = client;
    this.notificationChannelId = channelId;

    if (!channelId) {
      console.error('❌ 알림 채널 ID가 설정되지 않았습니다. NOTIFICATION_CHANNEL_ID를 확인하세요.');
      return;
    }

    // 1분마다 실행되는 크론 작업 생성
    this.task = cron.schedule('* * * * *', async () => {
      await this.checkBossNotifications();
    }, {
      scheduled: false // 수동으로 시작
    });

    // 크론 작업 시작
    this.task.start();
    this.isRunning = true;

    console.log(`✅ 보스 알림 스케줄러 시작 (채널: ${channelId})`);
    console.log('📅 1분마다 보스 리젠 시간을 확인합니다.');
  }

  /**
   * 스케줄러 중지
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ 스케줄러가 실행 중이 아닙니다.');
      return;
    }

    if (this.task) {
      this.task.stop();
      this.task = null;
    }

    this.isRunning = false;
    this.client = null;
    this.notificationChannelId = null;

    console.log('⏹️ 보스 알림 스케줄러 중지');
  }

  /**
   * 보스 알림 체크 및 발송 (메인 로직)
   */
  async checkBossNotifications() {
    try {
      const startTime = Date.now();
      console.log(`[스케줄러] 알림 체크 시작 - ${new Date().toLocaleString()}`);

      // 보스 스케줄 목록 조회
      const result = await bossScheduleService.getBossSchedules();

      if (!result.success || !result.schedules) {
        console.log('[스케줄러] 조회할 보스 스케줄이 없습니다.');
        return;
      }

      const currentTime = new Date();
      let notificationCount = 0;

      // 점검 모드 확인
      const isMaintenanceMode = await maintenanceService.isMaintenanceModeActive();

      if (isMaintenanceMode) {
        // 점검 모드: 개별 텍스트 + 통합 음성 알림 처리
        notificationCount = await this.handleMaintenanceModeNotifications(result.schedules, currentTime);
      } else {
        // 일반 모드: 개별 보스 알림 처리
        for (const schedule of result.schedules) {
          if (schedule.schedule.hasSchedule) {
            const notified = await this.checkAndSendNotification(schedule, currentTime);
            if (notified) notificationCount++;
          }
        }
      }

      // 실행 결과 로깅
      const duration = Date.now() - startTime;
      console.log(`[스케줄러] 체크 완료: ${result.schedules.length}개 보스 확인, ${notificationCount}개 알림 발송 (${duration}ms)`);

      // 캐시 정리 (1시간 이상 된 항목 삭제)
      this.cleanupNotificationCache();

    } catch (error) {
      console.error('[스케줄러] 오류 발생:', error);
    }
  }

  /**
   * 점검 모드에서 개별 텍스트 + 통합 음성 알림 처리
   * @param {Array} schedules - 보스 스케줄 목록
   * @param {Date} currentTime - 현재 시간
   * @returns {number} 발송된 알림 수
   */
  async handleMaintenanceModeNotifications(schedules, currentTime) {
    let notificationCount = 0;

    // 5분전 및 1분전 알림이 필요한 보스들 수집
    const fiveMinuteWarnings = [];
    const oneMinuteWarnings = [];

    for (const schedule of schedules) {
      if (!schedule.schedule.hasSchedule) continue;

      const { bossName, schedule: bossSchedule } = schedule;
      const { nextRegen, remainingMs } = bossSchedule;

      if (!nextRegen || remainingMs <= 0) continue;

      // 5분전 알림 체크 (4.5분 ~ 5.5분 범위)
      if (remainingMs >= 270000 && remainingMs <= 330000) {
        fiveMinuteWarnings.push({ bossName, nextRegen });
      }

      // 1분전 알림 체크 (0.5분 ~ 1.5분 범위)
      if (remainingMs >= 30000 && remainingMs <= 90000) {
        oneMinuteWarnings.push({ bossName, nextRegen });
      }
    }

    // 5분전 알림 처리
    if (fiveMinuteWarnings.length > 0) {
      // 통합 음성 알림 먼저 발송
      await this.sendMaintenanceTTSIfNew(fiveMinuteWarnings, '5분전');

      // 개별 텍스트 메시지 발송 (TTS 제외)
      for (const boss of fiveMinuteWarnings) {
        const sent = await this.sendNotificationIfNew(boss.bossName, boss.nextRegen, '5분전', true);
        if (sent) notificationCount++;
      }
    }

    // 1분전 알림 처리
    if (oneMinuteWarnings.length > 0) {
      // 통합 음성 알림 먼저 발송
      await this.sendMaintenanceTTSIfNew(oneMinuteWarnings, '1분전');

      // 개별 텍스트 메시지 발송 (TTS 제외)
      for (const boss of oneMinuteWarnings) {
        const sent = await this.sendNotificationIfNew(boss.bossName, boss.nextRegen, '1분전', true);
        if (sent) notificationCount++;
      }
    }

    return notificationCount;
  }

  /**
   * 점검 모드에서 통합 TTS 알림의 중복 방지 및 발송
   * @param {Array} bossList - 알림 대상 보스 목록
   * @param {string} notificationType - 알림 타입 ('5분전' | '1분전')
   */
  async sendMaintenanceTTSIfNew(bossList, notificationType) {
    // 캐시 키 생성 (점검모드_TTS_알림타입_가장빠른리젠시간)
    const earliestRegenTime = Math.min(...bossList.map(b => b.nextRegen.getTime()));
    const cacheKey = `maintenance_tts_${notificationType}_${earliestRegenTime}`;

    // 이미 발송한 알림인지 확인
    if (this.notificationCache.has(cacheKey)) {
      return;
    }

    try {
      let ttsTemplate = null;

      if (notificationType === '5분전') {
        ttsTemplate = 'maintenanceMode5Min';
      } else if (notificationType === '1분전') {
        ttsTemplate = 'maintenanceMode1Min';
      }

      // TTS 음성 알림 발송 (비동기로 처리)
      if (this.ttsEnabled && ttsTemplate) {
        this.sendTTSNotification('보스런', ttsTemplate).catch(error => {
          console.warn(`[스케줄러] 점검 모드 TTS 알림 실패 (보스런 ${notificationType}):`, error.message);
        });

        // 성공 시 캐시에 저장
        this.notificationCache.set(cacheKey, new Date());
        console.log(`[스케줄러] 점검 모드 TTS 통합 알림 발송: 보스런 ${notificationType} (${bossList.length}개 보스)`);
      }

    } catch (error) {
      console.error(`[스케줄러] 점검 모드 TTS 알림 발송 실패 (보스런 ${notificationType}):`, error);
    }
  }

  /**
   * 개별 보스의 알림 조건 체크 및 발송
   * @param {Object} schedule - 보스 스케줄 정보
   * @param {Date} currentTime - 현재 시간
   * @returns {boolean} 알림 발송 여부
   */
  async checkAndSendNotification(schedule, currentTime) {
    const { bossName, schedule: bossSchedule } = schedule;
    const { nextRegen, remainingMs } = bossSchedule;

    if (!nextRegen || remainingMs <= 0) {
      return false;
    }

    // 5분전 알림 체크 (4.5분 ~ 5.5분 범위)
    if (remainingMs >= 270000 && remainingMs <= 330000) { // 4.5분 ~ 5.5분
      return await this.sendNotificationIfNew(bossName, nextRegen, '5분전');
    }

    // 1분전 알림 체크 (0.5분 ~ 1.5분 범위)
    if (remainingMs >= 30000 && remainingMs <= 90000) { // 0.5분 ~ 1.5분
      return await this.sendNotificationIfNew(bossName, nextRegen, '1분전');
    }

    return false;
  }

  /**
   * 중복되지 않은 알림만 발송
   * @param {string} bossName - 보스명
   * @param {Date} regenTime - 리젠 시간
   * @param {string} notificationType - 알림 타입 ('5분전' | '1분전')
   * @param {boolean} skipTTS - TTS 재생 건너뛰기 (점검 모드용)
   * @returns {boolean} 발송 성공 여부
   */
  async sendNotificationIfNew(bossName, regenTime, notificationType, skipTTS = false) {
    // 캐시 키 생성 (보스명_리젠시간_알림타입)
    const regenTimeKey = regenTime.getTime().toString();
    const cacheKey = `${bossName}_${regenTimeKey}_${notificationType}`;

    // 이미 발송한 알림인지 확인
    if (this.notificationCache.has(cacheKey)) {
      return false;
    }

    try {
      // 알림 메시지 발송
      const success = await this.sendNotification(bossName, notificationType, skipTTS);

      if (success) {
        // 성공 시 캐시에 저장
        this.notificationCache.set(cacheKey, new Date());
        console.log(`[스케줄러] 알림 발송 완료: ${bossName} ${notificationType}`);
        return true;
      }

    } catch (error) {
      console.error(`[스케줄러] 알림 발송 실패 (${bossName} ${notificationType}):`, error);
    }

    return false;
  }

  /**
   * Discord 채널로 개별 보스 알림 메시지 발송
   * @param {string} bossName - 보스명
   * @param {string} notificationType - 알림 타입 ('5분전' | '1분전')
   * @param {boolean} skipTTS - TTS 재생 건너뛰기 (점검 모드용)
   * @returns {boolean} 발송 성공 여부
   */
  async sendNotification(bossName, notificationType, skipTTS = false) {
    try {
      const channel = await this.client.channels.fetch(this.notificationChannelId);

      if (!channel) {
        console.error(`[스케줄러] 채널을 찾을 수 없습니다: ${this.notificationChannelId}`);
        return false;
      }

      let messageContent;
      let components = [];
      let ttsTemplate = null;

      // 개별 보스 알림
      if (notificationType === '5분전') {
        messageContent = `${bossName} 5분전`;
        ttsTemplate = 'boss5MinWarning';
      } else if (notificationType === '1분전') {
        messageContent = `${bossName} 1분전`;
        ttsTemplate = 'boss1MinWarning';

        components = [{
          type: 1, // ACTION_ROW
          components: [{
            type: 2, // BUTTON
            style: 1, // PRIMARY
            label: '컷',
            custom_id: `cut_${bossName}_${Date.now()}`
          }]
        }];
      }

      const messageOptions = {
        content: messageContent
      };

      if (components.length > 0) {
        messageOptions.components = components;
      }

      // 텍스트 메시지 발송
      await channel.send(messageOptions);

      // TTS 음성 알림 발송 (점검 모드에서는 건너뛰기)
      if (!skipTTS && this.ttsEnabled && ttsTemplate) {
        this.sendTTSNotification(bossName, ttsTemplate).catch(error => {
          console.warn(`[스케줄러] TTS 알림 실패 (${bossName} ${notificationType}):`, error.message);
        });
      }

      return true;

    } catch (error) {
      console.error(`[스케줄러] 메시지 발송 오류:`, error);
      return false;
    }
  }

  /**
   * TTS 음성 알림 발송
   * @param {string} bossName - 보스명
   * @param {string} ttsTemplate - TTS 템플릿 이름
   */
  async sendTTSNotification(bossName, ttsTemplate) {
    if (!this.ttsEnabled) {
      return;
    }

    try {
      console.log(`🎵 [TTS] 음성 알림 시작: ${bossName} (${ttsTemplate})`);

      // 음성 채널 가져오기
      const voiceChannel = await this.client.channels.fetch(this.voiceChannelId);
      
      if (!voiceChannel || voiceChannel.type !== 2) { // 2 = GUILD_VOICE
        console.error(`[TTS] 음성 채널을 찾을 수 없음: ${this.voiceChannelId}`);
        return;
      }

      // 음성 채널 연결
      const connected = await voiceChannelService.joinChannel(voiceChannel);
      
      if (!connected) {
        console.error(`[TTS] 음성 채널 연결 실패: ${voiceChannel.name}`);
        return;
      }

      // TTS 템플릿으로 음성 재생
      const playSuccess = await voiceChannelService.playTTSTemplate(ttsTemplate, [bossName]);
      
      if (playSuccess) {
        console.log(`✅ [TTS] 음성 알림 완료: ${bossName}`);
        
        // 봇이 음성 채널에 상주하도록 자동 퇴장 타이머 설정하지 않음
        // voiceChannelService.setAutoLeaveTimer(); // 주석 처리 - 상주 목적
      } else {
        console.error(`[TTS] 음성 재생 실패: ${bossName}`);
      }

    } catch (error) {
      console.error(`[TTS] 음성 알림 오류:`, error);
    }
  }

  /**
   * 알림 캐시 정리 (1시간 이상 된 항목 삭제)
   */
  cleanupNotificationCache() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [key, timestamp] of this.notificationCache.entries()) {
      if (timestamp < oneHourAgo) {
        this.notificationCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[스케줄러] 캐시 정리 완료: ${cleanedCount}개 항목 삭제`);
    }
  }

  /**
   * 스케줄러 상태 조회
   * @returns {Object} 스케줄러 상태 정보
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      channelId: this.notificationChannelId,
      voiceChannelId: this.voiceChannelId,
      ttsEnabled: this.ttsEnabled,
      ttsProvider: process.env.TTS_PROVIDER || null,
      cacheSize: this.notificationCache.size,
      client: !!this.client,
      voiceStatus: voiceChannelService.getStatus()
    };
  }
}

// 싱글톤으로 내보내기
const schedulerService = new SchedulerService();
module.exports = { schedulerService };