const { bossService } = require('./bossService');

// 보스 스케줄 계산 및 관리 서비스
class BossScheduleService {
  
  // 다음 리젠 시간 계산
  calculateNextRegen(boss) {
    const now = new Date();
    
    // 컷타임이 없으면 계산 불가능
    if (!boss.cutTime) {
      return {
        hasSchedule: false,
        message: '미등록'
      };
    }
    
    const cutTime = new Date(boss.cutTime);
    
    // 컷타임이 유효하지 않으면 계산 불가능
    if (isNaN(cutTime.getTime())) {
      return {
        hasSchedule: false,
        message: '미등록'
      };
    }
    
    if (boss.regenType === '시간마다') {
      return this.calculateHourlyRegen(cutTime, boss.regenSettings, now);
    } else if (boss.regenType === '특정요일') {
      return this.calculateWeeklyRegen(boss.regenSettings, now);
    }
    
    return {
      hasSchedule: false,
      message: '알수없는 리젠타입'
    };
  }
  
  // 시간마다 리젠 계산 (컷타임 기준)
  calculateHourlyRegen(cutTime, regenSettings, now) {
    try {
      const settings = JSON.parse(regenSettings);
      const regenHours = settings.hours;
      
      if (!regenHours || regenHours <= 0) {
        return { hasSchedule: false, message: '리젠설정 오류' };
      }
      
      // 다음 리젠 시간 계산
      let nextRegen = new Date(cutTime.getTime() + (regenHours * 60 * 60 * 1000));
      
      // 이미 지난 시간이면 다음 리젠까지 계속 더하기
      while (nextRegen <= now) {
        nextRegen = new Date(nextRegen.getTime() + (regenHours * 60 * 60 * 1000));
      }
      
      const remainingMs = nextRegen.getTime() - now.getTime();
      
      return {
        hasSchedule: true,
        nextRegen: nextRegen,
        remainingMs: remainingMs,
        timeString: this.formatTime(nextRegen)
      };
      
    } catch (error) {
      return { hasSchedule: false, message: '리젠설정 파싱 오류' };
    }
  }
  
  // 특정 요일 리젠 계산 (컷타임 무관)
  calculateWeeklyRegen(regenSettings, now) {
    try {
      const settings = JSON.parse(regenSettings);
      const days = settings.days;
      const time = settings.time;
      
      if (!days || !Array.isArray(days) || !time) {
        return { hasSchedule: false, message: '리젠설정 오류' };
      }
      
      const dayMap = {
        '일': 0, '월': 1, '화': 2, '수': 3, 
        '목': 4, '금': 5, '토': 6
      };
      
      const [hours, minutes] = time.split(':').map(Number);
      
      // 시간 형식 검증
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return { hasSchedule: false, message: '시간 형식 오류' };
      }
      
      // 다음 리젠 요일 찾기
      let nextRegen = null;
      
      // 오늘부터 7일간 체크
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(now.getTime() + (i * 24 * 60 * 60 * 1000));
        const checkDay = checkDate.getDay();
        
        // 해당 요일인지 확인
        if (days.some(day => dayMap[day] === checkDay)) {
          const regenTime = new Date(checkDate);
          regenTime.setHours(hours, minutes, 0, 0);
          
          // 미래 시간인 경우
          if (regenTime > now) {
            nextRegen = regenTime;
            break;
          }
        }
      }
      
      if (!nextRegen) {
        return { hasSchedule: false, message: '다음 리젠일 찾기 실패' };
      }
      
      const remainingMs = nextRegen.getTime() - now.getTime();
      
      return {
        hasSchedule: true,
        nextRegen: nextRegen,
        remainingMs: remainingMs,
        timeString: this.formatTime(nextRegen)
      };
      
    } catch (error) {
      return { hasSchedule: false, message: '리젠설정 파싱 오류' };
    }
  }
  
  // 시간 포맷팅 (HH:mm)
  formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  // 시간을 YYYY-MM-DD HH:MM:SS 형식으로 포맷 (TZ=Asia/Seoul 설정으로 자동 KST) 
  formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
  
  // 보스 스케줄 목록 조회 (노출된 보스만, 우선순위 정렬)
  async getBossSchedules() {
    try {
      const bossList = await bossService.getBossList(false); // 노출된 보스만
      const schedules = [];
      
      for (const boss of bossList) {
        if (boss.scheduleVisible === '노출') {
          const schedule = this.calculateNextRegen(boss);
          
          schedules.push({
            bossName: boss.name,
            schedule: schedule,
            boss: boss
          });
        }
      }
      
      // 정렬: 1) 컷타임 있는 보스(시간순) → 2) 컷타임 없는 보스(이름순)
      schedules.sort((a, b) => {
        // 1. 컷타임 있는 보스가 위로
        if (a.schedule.hasSchedule && !b.schedule.hasSchedule) return -1;
        if (!a.schedule.hasSchedule && b.schedule.hasSchedule) return 1;
        
        // 2. 둘 다 스케줄이 있으면 남은 시간 순
        if (a.schedule.hasSchedule && b.schedule.hasSchedule) {
          return a.schedule.remainingMs - b.schedule.remainingMs;
        }
        
        // 3. 둘 다 스케줄이 없으면 이름 순 (가장 아래)
        return a.bossName.localeCompare(b.bossName);
      });
      
      return {
        success: true,
        schedules: schedules,
        totalCount: schedules.length
      };
      
    } catch (error) {
      console.error('❌ 보스 스케줄 조회 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Discord 메시지 형태로 포맷 (HH:mm \t 보스이름)
  formatScheduleForDiscord(schedules) {
    if (!schedules || schedules.length === 0) {
      return '노출된 보스가 없습니다.';
    }
    
    let message = '**보스 스케줄**\n```\n';
    
    schedules.forEach((item) => {
      const { bossName, schedule } = item;
      
      if (schedule.hasSchedule) {
        // 시간이 있는 경우: HH:mm \t 보스이름
        message += `${schedule.timeString}\t${bossName}\n`;
      } else {
        // 시간이 없는 경우: 상태메시지 \t 보스이름 (가장 아래)
        message += `${schedule.message}\t${bossName}\n`;
      }
    });
    
    message += '```';
    
    return message;
  }
  
  // 컷타임 업데이트 (관리자용)
  async updateCutTime(bossName, cutTimeString) {
    try {
      const methodStart = Date.now();
      console.log(`[컷] updateCutTime 시작 - 보스: ${bossName}`);
      
      // 보스 존재 여부 확인
      const bossCheckStart = Date.now();
      const boss = await bossService.getBossByName(bossName);
      console.log(`[컷] 보스 존재 확인 완료: ${Date.now() - bossCheckStart}ms`);
      
      if (!boss) {
        throw new Error('존재하지 않는 보스입니다.');
      }
      
      // 컷타임 문자열을 Date 객체로 변환
      let cutTime = null;
      
      if (cutTimeString && cutTimeString.trim() !== '') {
        // "지금" 또는 "now" 입력시 현재 시간 사용 (TZ=Asia/Seoul 설정으로 자동 KST)
        if (cutTimeString.toLowerCase() === '지금' || cutTimeString.toLowerCase() === 'now') {
          const now = new Date();
          cutTime = this.formatDateTime(now);
        } else {
          // 다른 형식의 시간 문자열 파싱
          const parsedDate = new Date(cutTimeString);
          if (isNaN(parsedDate.getTime())) {
            throw new Error('올바르지 않은 시간 형식입니다. (예: 2025-09-06 14:30 또는 "지금")');
          }
          cutTime = this.formatDateTime(parsedDate);
        }
      }
      
      // 구글시트 업데이트
      const sheetUpdateStart = Date.now();
      await bossService.updateBoss(bossName, { cutTime });
      console.log(`[컷] 구글시트 실제 업데이트 완료: ${Date.now() - sheetUpdateStart}ms`);
      
      console.log(`[컷] updateCutTime 전체 완료: ${Date.now() - methodStart}ms`);
      
      return {
        success: true,
        message: cutTime 
          ? `'${bossName}' 컷타임이 ${cutTime}로 설정되었습니다.`
          : `'${bossName}' 컷타임이 삭제되었습니다.`,
        cutTime: cutTime
      };
      
    } catch (error) {
      console.error('❌ 컷타임 업데이트 실패:', error);
      throw new Error(`컷타임 업데이트 실패: ${error.message}`);
    }
  }
}

// 싱글톤으로 내보내기
const bossScheduleService = new BossScheduleService();
module.exports = { bossScheduleService };