const googleSheetsService = require('../../services/googleSheetsService');

module.exports = {
  name: 'score_button',
  
  async execute(interaction) {
    try {
      // 버튼 ID에서 사용자 ID 추출 (score_123456789)
      const buttonUserId = interaction.customId.split('_')[1];
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
      
      // Google Sheets에서 사용자 정보 조회
      const memberInfo = await googleSheetsService.getMemberByUserId(clickUserId);
      
      if (!memberInfo) {
        return await interaction.editReply({
          content: '❌ 시트에서 사용자 정보를 찾을 수 없습니다.',
        });
      }
      
      const permission = memberInfo['권한'] || '일반길드원';
      const nickname = memberInfo['닉네임'] || interaction.user.displayName;
      const totalScore = memberInfo['총점수'] || 0;
      const joinedAt = memberInfo['가입일시'] || '정보 없음';
      
      // 권한에 따른 색상 설정
      const color = permission === '운영진' ? 0xff6b6b : 0x4ecdc4;
      
      const scoreEmbed = {
        color: color,
        title: `총 점수: ${totalScore}점`,
      };
      
      // 참여 이력이 있다면 최근 활동 표시 (추후 구현 예정)
      // TODO: 최근 보스 참여 이력 조회 기능 추가
      
      await interaction.editReply({ embeds: [scoreEmbed] });
      
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
};