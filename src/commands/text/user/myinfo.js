const { getUserPermissionFromSheet } = require('../../../utils/permissions');
const googleSheetsService = require('../../../services/googleSheetsService');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'myinfo',
  aliases: ['내정보', '정보확인'],
  description: '자신의 길드 정보를 확인합니다 (권한, 점수 등)',
  usage: '!내정보',
  cooldown: 5,
  
  async execute(message, args) {
    const loadingMsg = await message.reply('⏳ 내 정보를 조회하는 중...');
    
    try {
      const userId = message.author.id;
      const displayName = message.author.displayName || message.author.username;
      
      // Google Sheets에서 사용자 정보 조회
      const memberInfo = await googleSheetsService.getMemberByUserId(userId);
      
      if (!memberInfo) {
        // 시트에 등록되지 않은 사용자
        const notRegisteredEmbed = {
          color: 0xffa500,
          title: '📋 내 정보',
          description: `**${displayName}**님의 정보입니다.`,
          fields: [
            {
              name: '🔍 등록 상태',
              value: '시트에 등록되지 않은 사용자입니다.',
              inline: false,
            },
            {
              name: '🔒 권한',
              value: '없음 (등록 필요)',
              inline: true,
            },
            {
              name: '💡 안내',
              value: '길드 관리자에게 등록을 요청해주세요.',
              inline: false,
            },
          ],
          timestamp: new Date().toISOString(),
        };
        
        return await loadingMsg.edit({ content: null, embeds: [notRegisteredEmbed] });
      }
      
      // 등록된 사용자 기본 정보 표시
      const permission = memberInfo['권한'] || '일반길드원';
      const nickname = memberInfo['닉네임'] || displayName;
      
      // 권한에 따른 색상과 아이콘 설정
      let color, permissionIcon;
      if (permission === '관리자') {
        color = 0xff0000; // 빨강 (최고 권한)
        permissionIcon = '👑';
      } else if (permission === '운영진') {
        color = 0xff6b6b; // 주황 (중간 권한)
        permissionIcon = '⭐';
      } else {
        color = 0x4ecdc4; // 청록 (일반)
        permissionIcon = '👤';
      }
      
      const basicInfoEmbed = {
        color: color,
        fields: [
          {
            name: '👤 닉네임',
            value: nickname,
            inline: true,
          },
          {
            name: `${permissionIcon} 권한`,
            value: permission,
            inline: true,
          },
        ],
      };
      
      // 권한별 사용 가능한 명령어 안내
      if (permission === '관리자') {
        basicInfoEmbed.fields.push({
          name: '🔧 관리자 명령어',
          value: '• `!시트연결확인` - Google Sheets 연결 상태 확인\n• `!시트생성` - 봇 전용 시트 생성',
          inline: false,
        });
      } else if (permission === '운영진') {
        basicInfoEmbed.fields.push({
          name: '⭐ 운영진 명령어',
          value: '운영진 전용 명령어는 추후 추가될 예정입니다.',
          inline: false,
        });
      }
      
      // 점수보기 버튼 생성
      const scoreButton = new ButtonBuilder()
        .setCustomId(`score_${userId}`)
        .setLabel('🏆 점수보기')
        .setStyle(ButtonStyle.Primary);
      
      const row = new ActionRowBuilder()
        .addComponents(scoreButton);
      
      await loadingMsg.edit({ 
        content: null, 
        embeds: [basicInfoEmbed],
        components: [row]
      });
      
    } catch (error) {
      console.error('[내정보] 오류:', error);
      
      const errorEmbed = {
        color: 0xff0000,
        title: '❌ 정보 조회 실패',
        description: '사용자 정보를 조회하는 중 오류가 발생했습니다.',
        fields: [
          {
            name: '🔍 오류 내용',
            value: error.message || '알 수 없는 오류',
          },
          {
            name: '💡 해결 방안',
            value: '• 잠시 후 다시 시도해주세요\n• 문제가 계속되면 관리자에게 문의해주세요',
          },
        ],
        timestamp: new Date().toISOString(),
      };
      
      await loadingMsg.edit({ content: null, embeds: [errorEmbed] });
    }
  },
};