const googleSheetsService = require('../../../services/googleSheetsService');
const { MessageFlags } = require('discord.js');

/**
 * 참여자 확인 버튼 인터랙션 핸들러
 * 컷 완료 후 [참여자 확인] 버튼 클릭 시 실행됩니다.
 */
module.exports = {
  // 버튼 custom_id 패턴: participants_베나투스_1733456789123
  pattern: /^participants_(.+)_(\d+)$/,
  
  async execute(interaction) {
    try {
      const startTime = Date.now();
      console.log(`[참여자확인] 버튼 클릭 - 사용자: ${interaction.user.username}, ID: ${interaction.id}`);
      console.log(`[참여자확인] 인터랙션 상태 - replied: ${interaction.replied}, deferred: ${interaction.deferred}`);

      // 인터랙션이 이미 응답되었는지 확인
      if (interaction.replied || interaction.deferred) {
        console.log('[참여자확인] 인터랙션이 이미 처리됨, 무시');
        return;
      }

      // 즉시 응답 (3초 제한 때문에) - 동시성 이슈 대응
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      } catch (deferError) {
        if (deferError.code === 40060) {
          console.log('[참여자확인] 인터랙션이 이미 acknowledged됨, 무시');
          return;
        }
        throw deferError;
      }

      // custom_id에서 보스명과 타임스탬프 추출
      const match = interaction.customId.match(this.pattern);
      if (!match) {
        console.error('[참여자확인] 잘못된 custom_id:', interaction.customId);
        return await interaction.editReply({
          content: '❌ 잘못된 요청입니다.'
        });
      }

      const [, bossName, timestamp] = match;
      console.log(`[참여자확인] 보스: ${bossName}, 타임스탬프: ${timestamp}`);

      // 참여자 목록 조회
      const participantsStart = Date.now();
      const participants = await this.getParticipantsList(bossName, timestamp);
      console.log(`[참여자확인] 참여자 조회 완료: ${Date.now() - participantsStart}ms`);

      // 응답 메시지 생성 (내 이름 강조 포함)
      const responseMessage = this.formatParticipantsList(bossName, participants, interaction.user.id);
      
      await interaction.editReply({
        content: responseMessage
      });

      console.log(`✅ [참여자확인] ${bossName} 참여자 목록 전송 완료 (${participants.length}명, ${Date.now() - startTime}ms)`);

    } catch (error) {
      console.error(`❌ [참여자확인] 오류 발생:`, error);

      try {
        const errorContent = '❌ 참여자 목록 조회 중 오류가 발생했습니다.';
        await interaction.editReply({ content: errorContent });
      } catch (editError) {
        console.error('[참여자확인] 에러 응답 실패:', editError);
      }
    }
  },

  /**
   * 특정 보스의 참여자 목록 조회 (컷타임 기반)
   * @param {string} bossName - 보스명
   * @param {string} timestamp - 타임스탬프
   * @returns {Array} 참여자 목록
   */
  async getParticipantsList(bossName, timestamp) {
    try {
      // 먼저 보스 정보에서 컷타임을 가져와야 합니다
      const { bossService } = require('../../../services/bossService');
      const bossInfo = await bossService.getBossByName(bossName);
      
      if (!bossInfo || !bossInfo.cutTime) {
        console.error('[참여자확인] 보스 컷타임 정보 없음:', bossName);
        return [];
      }

      const targetCutTime = bossInfo.cutTime;
      const result = await googleSheetsService.getParticipationHistory();
      
      if (!result.success || !result.data) {
        return [];
      }

      // 7컬럼 구조: [참여일시, 캐릭터ID, 캐릭터명, 실제참여자ID, 보스명, 획득점수, 컷타임]
      const participants = [];

      for (const record of result.data) {
        const [participationTime, characterId, characterName, actualParticipantId, recordBossName, earnedScore, cutTime] = record;
        
        // 같은 보스, 같은 컷타임으로 필터링
        if (recordBossName === bossName && cutTime === targetCutTime) {
          participants.push({
            characterName,
            userId: actualParticipantId,
            score: parseInt(earnedScore) || 0,
            participationTime
          });
        }
      }

      // 참여 순서대로 정렬
      participants.sort((a, b) => new Date(a.participationTime) - new Date(b.participationTime));
      
      return participants;

    } catch (error) {
      console.error('[참여자확인] 참여자 목록 조회 오류:', error);
      return [];
    }
  },

  /**
   * 참여자 목록을 Discord 메시지 형태로 포맷
   * @param {string} bossName - 보스명
   * @param {Array} participants - 참여자 목록
   * @param {string} requestUserId - 요청한 사용자 ID (내 이름 강조용)
   * @returns {string} 포맷된 메시지
   */
  formatParticipantsList(bossName, participants, requestUserId = null) {
    if (participants.length === 0) {
      return `📋 ${bossName} 참여자 목록\n\n아직 참여한 사용자가 없습니다.`;
    }

    // {참여자1},{참여자2},{참여자3}... 형식으로 생성
    const participantNames = participants.map(participant => {
      const name = participant.characterName;
      // 내 이름인 경우 진하게 표시 (타입 안전한 비교)
      const isMyCharacter = requestUserId && String(participant.userId) === String(requestUserId);
      
      if (isMyCharacter) {
        return `**${name}**`;
      }
      return name;
    });

    const participantsString = participantNames.join(', ');
    
    let message = `📋 ${bossName} 참여자 목록\n\n${participantsString}\n\n**총 참여자: ${participants.length}명**`;
    
    // 메시지가 너무 길면 자르기 (Discord 2000자 제한)
    if (message.length > 1900) {
      message = message.substring(0, 1900) + '...\n\n*목록이 길어서 일부만 표시됩니다.*';
    }
    
    return message;
  }
};