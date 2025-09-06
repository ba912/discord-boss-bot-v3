const characterService = require('../../../services/characterService');
const { bossService } = require('../../../services/bossService');
const { MessageFlags } = require('discord.js');

// 동시 참여 처리를 위한 뮤텍스 (메모리 기반)
const participationLocks = new Map();

/**
 * 참여 버튼 인터랙션 핸들러
 * 컷 완료 후 [참여] 버튼 클릭 시 실행됩니다.
 */
module.exports = {
  // 버튼 custom_id 패턴: participate_베나투스_1733456789123
  pattern: /^participate_(.+)_(\d+)$/,
  
  async execute(interaction) {
    try {
      const startTime = Date.now();
      console.log(`[참여버튼] 버튼 클릭 - 사용자: ${interaction.user.username}`);

      // 즉시 응답 (3초 제한 때문에)
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // custom_id에서 보스명과 타임스탬프 추출
      const match = interaction.customId.match(this.pattern);
      if (!match) {
        console.error('[참여버튼] 잘못된 custom_id:', interaction.customId);
        return await interaction.editReply({
          content: '❌ 잘못된 참여 요청입니다.'
        });
      }

      const [, bossName, timestamp] = match;
      console.log(`[참여버튼] 보스: ${bossName}, 타임스탬프: ${timestamp}`);

      // 보스 정보 조회 (컷타임 확인용)
      const bossInfo = await bossService.getBossByName(bossName);
      if (!bossInfo || !bossInfo.cutTime) {
        return await interaction.editReply({
          content: `❌ ${bossName}의 컷타임이 설정되지 않았습니다.`
        });
      }

      // 동시성 제어를 위한 락 키 생성 (보스명 + 컷타임)
      const lockKey = `${bossName}_${bossInfo.cutTime}`;
      
      // 이미 처리 중인 요청이 있다면 대기
      if (participationLocks.has(lockKey)) {
        console.log(`[참여버튼] 락 대기 중: ${lockKey}`);
        await interaction.editReply({
          content: '⏳ 다른 참여 요청 처리 중입니다. 잠시만 기다려주세요...'
        });
        
        // 락이 해제될 때까지 대기 (최대 10초)
        const maxWait = 10000;
        const waitStart = Date.now();
        
        while (participationLocks.has(lockKey) && Date.now() - waitStart < maxWait) {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms 대기
        }
        
        if (participationLocks.has(lockKey)) {
          return await interaction.editReply({
            content: '❌ 처리 시간이 초과되었습니다. 다시 시도해주세요.'
          });
        }
      }
      
      // 락 설정
      participationLocks.set(lockKey, true);
      console.log(`[참여버튼] 락 설정: ${lockKey}`);

      try {
        // 사용자 캐릭터 정보 조회
        const characterInfo = await characterService.getCharacterByUserId(interaction.user.id);
        if (!characterInfo) {
          return await interaction.editReply({
            content: '❌ 등록된 캐릭터 정보가 없습니다. 관리자에게 문의해주세요.'
          });
        }

        const bossScore = parseInt(bossInfo.score) || 0;
        if (bossScore <= 0) {
          return await interaction.editReply({
            content: `❌ ${bossName}의 점수가 설정되지 않았습니다. 관리자에게 문의해주세요.`
          });
        }

        const cutTime = bossInfo.cutTime;

        // 중복 참여 체크 (새로운 캐릭터 시스템) - 컷타임 기반
        const isDuplicate = await characterService.checkDuplicateParticipation(
          characterInfo.characterId, 
          bossName, 
          cutTime
        );

        if (isDuplicate) {
          return await interaction.editReply({
            content: `❌ 이미 ${bossName}에 참여하셨습니다.`
          });
        }

        // 실시간 점수 계산 (정확한 현재 점수)
        const oldScore = await characterService.calculateCharacterTotalScore(characterInfo.characterId);
        
        await characterService.addParticipation(
          characterInfo.characterId,
          interaction.user.id,
          bossName,
          bossScore,
          cutTime
        );
        
        const newScore = oldScore + bossScore;

        // 성공 응답
        await interaction.editReply({
          content: `✅ 참여완료!\n점수변경: ${oldScore} + ${bossScore} = ${newScore}`
        });

        console.log(`✅ [참여버튼] ${characterInfo.characterName} → ${bossName} 참여 완료 (${Date.now() - startTime}ms)`);

      } finally {
        // 락 해제 (항상 실행됨)
        participationLocks.delete(lockKey);
        console.log(`[참여버튼] 락 해제: ${lockKey}`);
      }

    } catch (error) {
      console.error(`❌ [참여버튼] 오류 발생:`, error);
      
      // 외부 catch에서 락 키 확인 후 해제
      const match = interaction.customId.match(this.pattern);
      if (match) {
        const [, bossName] = match;
        try {
          const { bossService } = require('../../../services/bossService');
          const bossInfo = await bossService.getBossByName(bossName);
          if (bossInfo && bossInfo.cutTime) {
            const lockKey = `${bossName}_${bossInfo.cutTime}`;
            participationLocks.delete(lockKey);
            console.log(`[참여버튼] 에러 시 락 해제: ${lockKey}`);
          }
        } catch (lockError) {
          console.error('[참여버튼] 락 해제 실패:', lockError);
        }
      }
      
      try {
        await interaction.editReply({
          content: '❌ 참여 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
        });
      } catch (editError) {
        console.error('[참여버튼] 에러 응답 실패:', editError);
      }
    }
  }
};