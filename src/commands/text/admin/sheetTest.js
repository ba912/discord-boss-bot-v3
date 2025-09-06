const googleSheetsService = require('../../../services/googleSheetsService');
const { checkCommandPermission, getPermissionDeniedEmbed } = require('../../../utils/permissions');

module.exports = {
  name: 'sheetconnect',
  aliases: ['시트연결확인'],
  description: 'Google Sheets 연결 상태를 확인합니다 (읽기 전용)',
  usage: '!시트연결확인',
  cooldown: 5,
  
  async execute(message, args) {
    // 관리자 권한 체크
    const hasPermission = await checkCommandPermission(message);
    if (!hasPermission) {
      const permissionEmbed = getPermissionDeniedEmbed();
      return await message.reply({ embeds: [permissionEmbed] });
    }
    
    const loadingMsg = await message.reply('⏳ Google Sheets 연결 상태를 확인하는 중...');
    
    try {
      // 연결 테스트만 수행 (읽기 전용)
      const connectionTest = await googleSheetsService.testConnection();
      
      if (!connectionTest.success) {
        const errorEmbed = {
          color: 0xff0000,
          title: '❌ Google Sheets 연결 실패',
          description: `오류: ${connectionTest.error}`,
          fields: [
            {
              name: '🔧 해결 방법',
              value: '• Google Sheets API 설정 확인\n• 서비스 계정 키 파일 확인\n• 스프레드시트 공유 권한 확인',
            },
          ],
          timestamp: new Date().toISOString(),
        };
        
        return await loadingMsg.edit({ content: null, embeds: [errorEmbed] });
      }

      // 연결 성공 결과 표시 (공개)
      const successEmbed = {
        color: 0x00ff00,
        title: '✅ Google Sheets 연결 양호',
      };
      
      // DM으로 스프레드시트 링크 전송
      try {
        const dmEmbed = {
          color: 0x0099ff,
          title: '🔗 보탐봇 Google Sheets 링크',
          description: `**${message.author.displayName}**님, 스프레드시트 링크입니다.`,
          fields: [
            {
              name: '📋 스프레드시트',
              value: `**제목:** ${connectionTest.title}\n**링크:** ${connectionTest.url}`,
              inline: false,
            },
          ],
          footer: {
            text: '!시트연결확인 명령어 결과',
          },
          timestamp: new Date().toISOString(),
        };
        
        await message.author.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        // DM 전송 실패 시 제목에 표시
        successEmbed.title = '✅ Google Sheets 연결 양호 (DM 전송 실패)';
      }
      
      await loadingMsg.edit({ content: null, embeds: [successEmbed] });
      
    } catch (error) {
      console.error('[시트테스트] 오류:', error);
      
      const errorEmbed = {
        color: 0xff0000,
        title: '❌ 연결 테스트 중 오류 발생',
        description: '시스템 오류가 발생했습니다.',
        fields: [
          {
            name: '🔍 오류 내용',
            value: error.message || '알 수 없는 오류',
          },
          {
            name: '💡 해결 방안',
            value: '• .env 파일의 Google 설정 확인\n• 서비스 계정 키 파일 확인\n• 관리자에게 문의',
          },
        ],
        timestamp: new Date().toISOString(),
      };
      
      await loadingMsg.edit({ content: null, embeds: [errorEmbed] });
    }
  },
};