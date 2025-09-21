const { bossService } = require('../../../services/bossService');
const maintenanceService = require('../../../services/maintenanceService');
const { checkAdminPermission } = require('../../../utils/permissions');
const {
  parseTimeArgument,
  formatDisplayTime,
  isHourlyRegenBoss,
  calculateCutTimeFromMaintenance
} = require('../../../utils/timeCalculator');

module.exports = {
  name: 'maintenance',
  aliases: ['점검'],
  description: '점검 완료 시간을 입력하여 시간마다 리젠되는 모든 보스의 컷타임을 일괄 설정합니다 (운영진 이상)',
  usage: '!점검 MMDDHHMM\n- !점검 09211400: 9월 21일 14:00에 점검 완료',
  cooldown: 10,

  async execute(message, args) {
    try {
      const startTime = Date.now();
      console.log(`[점검] 명령어 시작 - ${message.author.username}`);

      // 즉시 처리 중 메시지 표시
      const processingMessage = await message.reply('처리 중...');
      console.log(`[점검] Discord 응답 완료: ${Date.now() - startTime}ms`);

      // 권한 확인 (운영진 이상)
      const hasPermission = await checkAdminPermission(message.author.id);
      if (!hasPermission) {
        return processingMessage.edit('운영진 이상만 사용 가능한 명령어입니다.');
      }

      // 인자 확인
      if (args.length === 0) {
        return processingMessage.edit(
          '점검완료시간을 입력해주세요.\n' +
          '**사용법:**\n' +
          '- `!점검 MMDDHHMM`: 해당 월일시간에 점검 완료\n' +
          '- 예시: `!점검 09211400` (9월 21일 14:00 점검 완료)'
        );
      }

      const maintenanceTimeArg = args[0];

      // 점검완료시간 파싱 (MMDDHHMM 형식만 지원)
      const parseStart = Date.now();
      let maintenanceTime;
      try {
        // MMDDHHMM 형식 강제 (8자리 확인)
        if (!/^\d{8}$/.test(maintenanceTimeArg)) {
          throw new Error('점검완료시간은 MMDDHHMM 형식으로 입력해주세요. (예: 09211400)');
        }
        maintenanceTime = parseTimeArgument(maintenanceTimeArg);
      } catch (error) {
        return processingMessage.edit(`${error.message}`);
      }
      console.log(`[점검] 시간 파싱 완료: ${Date.now() - parseStart}ms`);

      // 시간마다 리젠되는 보스 목록 조회
      const bossListStart = Date.now();
      const allBosses = await bossService.getBossList(true); // 관리자는 모든 보스 조회
      const hourlyRegenBosses = allBosses.filter(boss => isHourlyRegenBoss(boss.regenType));

      if (hourlyRegenBosses.length === 0) {
        return processingMessage.edit('시간마다 리젠되는 보스가 없습니다.');
      }

      console.log(`[점검] 대상 보스 조회 완료: ${hourlyRegenBosses.length}개 (${Date.now() - bossListStart}ms)`);

      // 각 보스의 컷타임을 점검완료시간 기준으로 역산하여 설정
      const updateStart = Date.now();
      let successCount = 0;
      let failedBosses = [];

      for (const boss of hourlyRegenBosses) {
        try {
          // 점검완료시간을 젠타임으로 보고 컷타임 역산
          const cutTime = calculateCutTimeFromMaintenance(maintenanceTime, boss.regenSettings);
          await bossService.updateBoss(boss.name, { cutTime });
          successCount++;
        } catch (error) {
          console.error(`[점검] ${boss.name} 업데이트 실패:`, error);
          failedBosses.push(boss.name);
        }
      }

      console.log(`[점검] 보스 컷타임 일괄 업데이트 완료: ${Date.now() - updateStart}ms`);

      // 점검 모드 활성화
      try {
        await maintenanceService.activateMaintenanceMode();
        console.log('[점검] 점검 모드 활성화 완료');
      } catch (error) {
        console.error('[점검] 점검 모드 활성화 실패:', error);
        // 점검 모드 활성화 실패해도 보스 업데이트는 완료되었으므로 계속 진행
      }

      // 성공 메시지 생성
      let successMessage = `점검 업데이트 완료. ${formatDisplayTime(maintenanceTime)}`;

      if (successCount === hourlyRegenBosses.length) {
        successMessage += `\n시간마다 리젠 보스 ${successCount}개 일괄 설정됨.`;
      } else {
        successMessage += `\n성공: ${successCount}개, 실패: ${failedBosses.length}개`;
        if (failedBosses.length > 0) {
          successMessage += `\n실패한 보스: ${failedBosses.join(', ')}`;
        }
      }

      await processingMessage.edit(successMessage);

      console.log(`[점검] 전체 처리 완료: ${Date.now() - startTime}ms`);

    } catch (error) {
      console.error('[점검] 오류:', error);
      const errorMessage = `${error.message}`;

      try {
        await processingMessage.edit(errorMessage);
      } catch {
        await message.reply(errorMessage);
      }
    }
  },

};