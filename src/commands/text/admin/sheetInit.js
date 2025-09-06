const googleSheetsService = require('../../../services/googleSheetsService');
const { checkSuperAdminCommandPermission, getPermissionDeniedEmbed } = require('../../../utils/permissions');

module.exports = {
  name: 'sheetcreate',
  aliases: ['시트생성'],
  description: '봇 전용 시트를 생성합니다 (중복된 시트는 건너뜀)',
  usage: '!시트생성',
  cooldown: 10, // 더 긴 쿨다운 (신중한 작업)
  
  async execute(message, args) {
    // 관리자 권한 체크 (관리자 전용)
    // const hasPermission = await checkSuperAdminCommandPermission(message);
    // if (!hasPermission) {
    //   const permissionEmbed = getPermissionDeniedEmbed();
    //   return await message.reply({ embeds: [permissionEmbed] });
    // }
    
    const loadingMsg = await message.reply('⏳ 봇 전용 시트를 생성하는 중...');
    
    try {
      // 실시간 진행상황을 표시하는 콜백 함수
      const progressCallback = async (progressMessage) => {
        await loadingMsg.edit(`⏳ ${progressMessage}`);
      };

      // 시트 생성 실행 (실시간 진행상황 표시)
      const createResults = await googleSheetsService.createSheets(progressCallback);
      
      // 최종 완료 메시지
      await loadingMsg.edit('✅ 시트 생성 작업 완료!');
      
      // 결과 요약을 별도 메시지로 전송
      const resultText = createResults.join('\n');
      await message.channel.send(`\`\`\`\n${resultText}\n\`\`\``);
      
    } catch (error) {
      console.error('[시트생성] 오류:', error);
      
      const errorEmbed = {
        color: 0xff0000,
        title: '❌ 시트 생성 실패',
        description: '시트 생성 중 오류가 발생했습니다.',
        fields: [
          {
            name: '🔍 오류 내용',
            value: error.message || '알 수 없는 오류',
          },
          {
            name: '💡 해결 방안',
            value: '• `!시트연결확인`으로 연결 상태 먼저 확인\n• Google Sheets 편집 권한 확인\n• 서비스 계정 키 파일 확인\n• 관리자에게 문의',
          },
        ],
        timestamp: new Date().toISOString(),
      };
      
      await loadingMsg.edit({ content: null, embeds: [errorEmbed] });
    }
  },
};