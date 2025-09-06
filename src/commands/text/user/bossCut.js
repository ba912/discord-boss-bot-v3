const { bossScheduleService } = require('../../../services/bossScheduleService');
const { bossService } = require('../../../services/bossService');

module.exports = {
  name: 'cut',
  aliases: ['컷'],
  description: '보스 컷타임을 등록합니다',
  usage: '!컷 [보스명] [시간]\n- !컷 [보스명]: 현재 시간\n- !컷 [보스명] HHMM: 오늘 해당시간\n- !컷 [보스명] MMDDHHMM: 해당 월일시간',
  cooldown: 3,
  
  async execute(message, args) {
    try {
      const startTime = Date.now();
      console.log(`[컷] 명령어 시작 - ${message.author.username}`);
      
      // 즉시 처리 중 메시지 표시
      const processingMessage = await message.reply('⏳ 처리 중...');
      console.log(`[컷] Discord 응답 완료: ${Date.now() - startTime}ms`);

      // 인자 확인 (먼저 체크)
      if (args.length === 0) {
        return processingMessage.edit(
          '❌ 보스명을 입력해주세요.\n' +
          '**사용법:**\n' +
          '- `!컷 보스명`: 현재 시간\n' +
          '- `!컷 보스명 HHMM`: 오늘 해당시간\n' +
          '- `!컷 보스명 MMDDHHMM`: 해당 월일시간'
        );
      }

      const bossName = args[0];
      const timeArg = args[1];

      // 시간 파싱 (빠른 작업)
      const parseStart = Date.now();
      const cutTime = this.parseCutTime(timeArg);
      console.log(`[컷] 시간 파싱 완료: ${Date.now() - parseStart}ms`);

      // 구글시트 업데이트 (존재하지 않는 보스면 에러 발생)
      const updateStart = Date.now();
      await bossService.updateBoss(bossName, { cutTime });
      console.log(`[컷] 구글시트 업데이트 완료: ${Date.now() - updateStart}ms`);

      const successMessage = cutTime 
        ? `✅ '${bossName}' 컷타임이 ${cutTime}로 설정되었습니다.`
        : `✅ '${bossName}' 컷타임이 삭제되었습니다.`;
      
      await processingMessage.edit(successMessage);
      
      console.log(`[컷] 전체 처리 완료: ${Date.now() - startTime}ms`);

    } catch (error) {
      console.error('[컷] 오류:', error);
      const errorMessage = error.message.includes('존재하지 않는 보스') 
        ? '❌ 존재하지 않는 보스입니다.'
        : `❌ ${error.message}`;
      
      // 이미 응답한 processingMessage가 있으면 수정, 없으면 새 응답
      try {
        await processingMessage.edit(errorMessage);
      } catch {
        await message.reply(errorMessage);
      }
    }
  },

  // 시간 파싱 로직
  parseCutTime(timeArg) {
    // 현재 시간 생성 (TZ=Asia/Seoul 설정으로 자동으로 KST)
    const now = new Date();
    
    // 시간 인자가 없으면 현재 시간
    if (!timeArg) {
      return this.formatDateTime(now);
    }

    // 숫자만 확인
    if (!/^\d+$/.test(timeArg)) {
      throw new Error('시간은 숫자만 입력해주세요. (HHMM 또는 MMDDHHMM)');
    }

    let targetTime;

    if (timeArg.length === 4) {
      // HHMM 형식 - 오늘 해당 시간
      const hours = parseInt(timeArg.substring(0, 2));
      const minutes = parseInt(timeArg.substring(2, 4));

      if (hours < 0 || hours > 23) {
        throw new Error('시간은 00-23 사이로 입력해주세요.');
      }
      if (minutes < 0 || minutes > 59) {
        throw new Error('분은 00-59 사이로 입력해주세요.');
      }

      targetTime = new Date(now);
      targetTime.setHours(hours, minutes, 0, 0);

    } else if (timeArg.length === 8) {
      // MMDDHHMM 형식 - 해당 월일시간
      const month = parseInt(timeArg.substring(0, 2));
      const day = parseInt(timeArg.substring(2, 4));
      const hours = parseInt(timeArg.substring(4, 6));
      const minutes = parseInt(timeArg.substring(6, 8));

      if (month < 1 || month > 12) {
        throw new Error('월은 01-12 사이로 입력해주세요.');
      }
      if (day < 1 || day > 31) {
        throw new Error('일은 01-31 사이로 입력해주세요.');
      }
      if (hours < 0 || hours > 23) {
        throw new Error('시간은 00-23 사이로 입력해주세요.');
      }
      if (minutes < 0 || minutes > 59) {
        throw new Error('분은 00-59 사이로 입력해주세요.');
      }

      targetTime = new Date(now.getFullYear(), month - 1, day, hours, minutes, 0, 0);

      // 날짜 유효성 검사
      if (targetTime.getMonth() !== month - 1 || targetTime.getDate() !== day) {
        throw new Error('올바르지 않은 날짜입니다.');
      }

    } else {
      throw new Error('시간 형식이 올바르지 않습니다. (HHMM 또는 MMDDHHMM)');
    }

    return this.formatDateTime(targetTime);
  },

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
};