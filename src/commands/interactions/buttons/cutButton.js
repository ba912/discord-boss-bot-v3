const { bossService } = require('../../../services/bossService');
const maintenanceService = require('../../../services/maintenanceService');

/**
 * 컷 버튼 인터랙션 핸들러
 * 1분전 알림의 [컷] 버튼 클릭 시 실행됩니다.
 */
module.exports = {
  // 버튼 custom_id 패턴: cut_베나투스_1733456789123
  pattern: /^cut_(.+)_(\d+)$/,
  
  async execute(interaction) {
    try {
      const startTime = Date.now();
      console.log(`[컷버튼] 버튼 클릭 - 사용자: ${interaction.user.username}`);

      // 즉시 응답 (3초 제한 때문에)
      await interaction.deferUpdate();

      // custom_id에서 보스명 추출
      const match = interaction.customId.match(this.pattern);
      if (!match) {
        console.error('[컷버튼] 잘못된 custom_id:', interaction.customId);
        return;
      }

      const [, bossName, timestamp] = match;
      console.log(`[컷버튼] 보스: ${bossName}, 타임스탬프: ${timestamp}`);

      // 현재 시간으로 컷타임 설정
      const now = new Date();
      const cutTimeString = this.formatDateTime(now);
      
      console.log(`[컷버튼] 컷타임 등록 시작: ${cutTimeString}`);

      // 보스 컷타임 업데이트
      const updateStart = Date.now();
      await bossService.updateBoss(bossName, { cutTime: cutTimeString });
      console.log(`[컷버튼] 컷타임 업데이트 완료: ${Date.now() - updateStart}ms`);

      // 점검 모드 자동 해제 체크
      let maintenanceDeactivated = false;
      const isMaintenanceActive = await maintenanceService.isMaintenanceModeActive();
      if (isMaintenanceActive) {
        try {
          await maintenanceService.deactivateMaintenanceMode();
          maintenanceDeactivated = true;
          console.log(`[컷버튼] 점검 모드 자동 해제됨 - 첫 컷: ${bossName}`);
        } catch (error) {
          console.error('[컷버튼] 점검 모드 해제 실패:', error);
        }
      }

      // 메시지를 참여 버튼으로 변경
      let newContent = `${bossName} 컷 완료`;
      if (maintenanceDeactivated) {
        newContent += '\n점검 모드가 해제되었습니다.';
      }
      const newComponents = [{
        type: 1, // ACTION_ROW
        components: [
          {
            type: 2, // BUTTON
            style: 3, // SUCCESS (녹색)
            label: '참여',
            custom_id: `participate_${bossName}_${timestamp}`
          },
          {
            type: 2, // BUTTON  
            style: 2, // SECONDARY (회색)
            label: '참여자 확인',
            custom_id: `participants_${bossName}_${timestamp}`
          }
        ]
      }];

      // 메시지 업데이트
      await interaction.editReply({
        content: newContent,
        components: newComponents
      });

      console.log(`[컷버튼] 처리 완료: ${Date.now() - startTime}ms`);

      // 성공 로그
      console.log(`✅ [컷버튼] ${bossName} 컷타임 등록 및 UI 업데이트 완료 - ${interaction.user.username}`);

    } catch (error) {
      console.error(`❌ [컷버튼] 오류 발생:`, error);

      try {
        // 에러 발생 시 사용자에게 알림 (ephemeral)
        const errorContent = error.message.includes('존재하지 않는 보스') 
          ? '❌ 존재하지 않는 보스입니다.'
          : '❌ 컷타임 등록 중 오류가 발생했습니다.';

        await interaction.followUp({
          content: errorContent,
          ephemeral: true
        });
      } catch (followUpError) {
        console.error('[컷버튼] 에러 응답 실패:', followUpError);
      }
    }
  },

  /**
   * 시간을 YYYY-MM-DD HH:MM:SS 형식으로 포맷 (TZ=Asia/Seoul 설정으로 자동 KST)
   */
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