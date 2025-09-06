const characterService = require('../../services/characterService');
const googleSheetsService = require('../../services/googleSheetsService');

module.exports = {
  name: 'score_button',
  
  async execute(interaction) {
    try {
      const customId = interaction.customId;
      let buttonUserId, isCharacterScore = false;
      
      // 버튼 ID 유형 확인 및 사용자 ID 추출
      if (customId.startsWith('character_score_')) {
        // 새로운 캐릭터 점수 버튼 (character_score_123456789)
        buttonUserId = customId.split('_')[2];
        isCharacterScore = true;
      } else if (customId.startsWith('score_')) {
        // 기존 점수 버튼 (score_123456789) - 호환성 유지
        buttonUserId = customId.split('_')[1];
        isCharacterScore = false;
      } else {
        return await interaction.reply({
          content: '❌ 알 수 없는 버튼 유형입니다.',
          ephemeral: true
        });
      }
      
      const clickUserId = interaction.user.id;
      
      // 본인만 버튼 클릭 가능
      if (buttonUserId !== clickUserId) {
        return await interaction.reply({
          content: '❌ 본인의 정보만 확인할 수 있습니다.',
          ephemeral: true
        });
      }
      
      // 로딩 응답
      await interaction.deferReply({ ephemeral: true });
      
      if (isCharacterScore) {
        // 새로운 캐릭터 시스템 - 캐릭터 통합 점수 및 상세 정보
        await this.handleCharacterScore(interaction, clickUserId);
      } else {
        // 기존 레거시 시스템 - 호환성 유지
        await this.handleLegacyScore(interaction, clickUserId);
      }
      
    } catch (error) {
      console.error('[점수보기 버튼] 오류:', error);
      
      const errorMessage = '❌ 점수 정보를 조회하는 중 오류가 발생했습니다.';
      
      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ 
          content: errorMessage, 
          ephemeral: true 
        });
      }
    }
  },

  // 새로운 캐릭터 시스템 점수 처리
  async handleCharacterScore(interaction, userId) {
    try {
      // 사용자의 캐릭터 정보 조회
      const characterInfo = await characterService.getCharacterByUserId(userId);
      
      if (!characterInfo) {
        return await interaction.editReply({
          content: '❌ 캐릭터 정보를 찾을 수 없습니다. `!내정보` 명령어를 먼저 실행해보세요.',
        });
      }

      // 캐릭터 상세 정보 조회 (모든 계정 정보 포함)
      const characterDetails = await characterService.getCharacterDetails(characterInfo.characterId);
      
      // 최근 참여 이력 조회
      const recentHistory = await characterService.getCharacterParticipationHistory(characterInfo.characterId, 10);

      // 권한에 따른 색상 설정
      const permission = characterInfo.userPermission;
      let color;
      if (permission === '관리자') {
        color = 0xff0000;
      } else if (permission === '운영진') {
        color = 0xff6b6b;
      } else {
        color = 0x4ecdc4;
      }

      const scoreEmbed = {
        color: color,
        title: `🏆 ${characterInfo.characterName} - 상세 점수 정보`,
        fields: [
          {
            name: '💯 총 점수',
            value: `**${characterInfo.totalScore}점**`,
            inline: true,
          },
          {
            name: '👥 계정 수',
            value: `${characterDetails.accounts.length}개`,
            inline: true,
          },
          {
            name: '📊 참여 기록',
            value: `${recentHistory.length}회 참여`,
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      };

      // 연결된 모든 계정 정보
      if (characterDetails.accounts.length > 1) {
        const accountList = characterDetails.accounts.map(acc => {
          const icon = acc.accountType === '본주' ? '👤' : '🔗';
          return `${icon} ${acc.accountType}: <@${acc.userId}>`;
        }).join('\n');
        
        scoreEmbed.fields.push({
          name: '👥 연결된 계정들',
          value: accountList,
          inline: false,
        });
      }

      // 최근 참여 이력 표시
      if (recentHistory.length > 0) {
        const historyText = recentHistory
          .slice(0, 5) // 최근 5개만 표시
          .map(record => {
            const date = record.timestamp.substring(5, 10); // MM-DD
            const time = record.timestamp.substring(11, 16); // HH:mm
            return `• ${date} ${time} - **${record.bossName}** (+${record.earnedScore}점)`;
          })
          .join('\n');
          
        scoreEmbed.fields.push({
          name: '📋 최근 참여 이력',
          value: historyText,
          inline: false,
        });
      } else {
        scoreEmbed.fields.push({
          name: '📋 참여 이력',
          value: '아직 참여 기록이 없습니다.',
          inline: false,
        });
      }

      // 부주 시스템 안내
      if (characterInfo.accountType !== '본주') {
        scoreEmbed.fields.push({
          name: '💡 부주 시스템',
          value: `이 계정은 ${characterInfo.accountType}입니다.\n표시된 점수는 모든 연결된 계정의 통합 점수입니다.`,
          inline: false,
        });
      }

      await interaction.editReply({ embeds: [scoreEmbed] });

    } catch (error) {
      console.error('❌ 캐릭터 점수 조회 실패:', error);
      await interaction.editReply({
        content: '❌ 캐릭터 점수 정보를 조회하는 중 오류가 발생했습니다.',
      });
    }
  },

  // 기존 레거시 시스템 점수 처리 (호환성 유지)
  async handleLegacyScore(interaction, userId) {
    try {
      // Google Sheets에서 사용자 정보 조회
      const memberInfo = await googleSheetsService.getMemberByUserId(userId);
      
      if (!memberInfo) {
        return await interaction.editReply({
          content: '❌ 시트에서 사용자 정보를 찾을 수 없습니다.\n\n**안내:** 시스템이 새로운 캐릭터 중심으로 업데이트되었습니다. `!시트동기화` 명령어를 통해 데이터를 최신화해주세요.',
        });
      }
      
      const permission = memberInfo['권한'] || '일반길드원';
      const nickname = memberInfo['닉네임'] || interaction.user.displayName;
      const totalScore = memberInfo['총점수'] || 0;
      const joinedAt = memberInfo['가입일시'] || '정보 없음';
      
      // 권한에 따른 색상 설정
      let color;
      if (permission === '관리자') {
        color = 0xff0000;
      } else if (permission === '운영진') {
        color = 0xff6b6b;
      } else {
        color = 0x4ecdc4;
      }
      
      const scoreEmbed = {
        color: color,
        title: `📊 ${nickname} - 점수 정보 (레거시)`,
        fields: [
          {
            name: '💯 총 점수',
            value: `**${totalScore}점**`,
            inline: true,
          },
          {
            name: '📅 가입일시',
            value: joinedAt.substring(0, 10) || '정보 없음',
            inline: true,
          },
          {
            name: '🔄 시스템 업데이트',
            value: '새로운 캐릭터 시스템으로 마이그레이션이 필요합니다.',
            inline: false,
          },
        ],
        footer: {
          text: '💡 관리자가 !시트동기화를 실행하면 새로운 시스템으로 전환됩니다.',
        },
        timestamp: new Date().toISOString(),
      };
      
      await interaction.editReply({ embeds: [scoreEmbed] });
      
    } catch (error) {
      console.error('❌ 레거시 점수 조회 실패:', error);
      await interaction.editReply({
        content: '❌ 점수 정보를 조회하는 중 오류가 발생했습니다.',
      });
    }
  },
};