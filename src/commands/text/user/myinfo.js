const { getUserPermissionFromSheet } = require('../../../utils/permissions');
const characterService = require('../../../services/characterService');
const googleSheetsService = require('../../../services/googleSheetsService');

module.exports = {
  name: 'myinfo',
  aliases: ['내정보', '정보확인'],
  description: '자신의 캐릭터 정보를 확인합니다 (권한, 점수 등)',
  usage: '!내정보',
  cooldown: 5,
  
  async execute(message, args) {
    const loadingMsg = await message.reply('⏳ 내 캐릭터 정보를 조회하는 중...');
    
    try {
      const userId = message.author.id;
      const displayName = message.author.displayName || message.author.username;
      
      // 새로운 캐릭터 시스템에서 사용자 정보 조회
      let characterInfo = await characterService.getCharacterByUserId(userId);
      
      if (!characterInfo) {
        // 레거시 시스템에서도 확인 (마이그레이션 전 사용자)
        let memberInfo = null;
        try {
          memberInfo = await googleSheetsService.getMemberByUserId(userId);
        } catch (error) {
          // 레거시 시트가 없거나 조회 실패 시 (예: "Unable to parse range: 보탐봇-길드원정보!A:Z")
          console.log('레거시 시트 조회 실패 (정상):', error.message);
          memberInfo = null;
        }
        
        if (!memberInfo) {
          // 완전히 등록되지 않은 사용자
          const notRegisteredEmbed = {
            color: 0xffa500,
            // title: '📋 내 정보',
            // description: `**${displayName}**님의 정보입니다.`,
            fields: [
              {
                name: '🔍 등록 상태',
                value: '시트에 등록되지 않은 사용자입니다.',
                inline: false,
              },
              {
                name: '💡 안내',
                value: '운영진에게 계정 추가 요청 해주세요.',
                inline: false,
              },
            ]
          };
          
          return await loadingMsg.edit({ content: null, embeds: [notRegisteredEmbed] });
        } else {
          // 레거시 데이터 존재 - 마이그레이션 안내
          const migrationNeededEmbed = {
            color: 0xffa500,
            title: '🔄 시스템 업데이트 필요',
            description: `**${displayName}**님의 정보를 찾았지만, 새로운 캐릭터 시스템으로 마이그레이션이 필요합니다.`,
            fields: [
              {
                name: '📊 현재 정보 (레거시)',
                value: `• 닉네임: ${memberInfo['닉네임'] || displayName}\n• 권한: ${memberInfo['권한'] || '일반길드원'}\n• 총점수: ${memberInfo['총점수'] || '0'}점`,
                inline: false,
              },
              {
                name: '🔄 해결 방법',
                value: '관리자가 `!시트동기화` 명령어를 실행하여 새로운 시스템으로 데이터를 이전해야 합니다.',
                inline: false,
              },
            ],
            timestamp: new Date().toISOString(),
          };
          
          return await loadingMsg.edit({ content: null, embeds: [migrationNeededEmbed] });
        }
      }
      
      // 새로운 캐릭터 시스템 - 정상 정보 표시
      const permission = characterInfo.userPermission || '일반길드원';
      const characterName = characterInfo.characterName;
      
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
      
      // 계정 유형에 따른 아이콘
      const accountTypeIcon = characterInfo.accountType === '본주' ? '👤' : '🔗';
      
      const characterInfoEmbed = {
        color: color,
        title: `📋 ${characterName} 캐릭터 정보`,
        fields: [
          {
            name: '🎮 캐릭터명',
            value: characterName,
            inline: true,
          },
          {
            name: `${permissionIcon} 권한`,
            value: permission,
            inline: true,
          },
          {
            name: '🏆 총 점수',
            value: `${characterInfo.totalScore}점`,
            inline: true,
          },
        ],
      };
      
      // 권한별 사용 가능한 명령어 안내
      if (permission === '관리자') {
        characterInfoEmbed.fields.push({
          name: '🔧 관리자 명령어',
          value: '• `!시트동기화` - 시트 구조 최신화\n• `!시트연결확인` - Google Sheets 연결 상태 확인\n• `!보스삭제` - 보스 삭제',
          inline: false,
        });
      } else if (permission === '운영진') {
        characterInfoEmbed.fields.push({
          name: '⭐ 운영진 명령어',
          value: '• `!보스추가` - 새로운 보스 등록',
          inline: false,
        });
      }
      
      await loadingMsg.edit({ 
        content: null, 
        embeds: [characterInfoEmbed]
      });
      
    } catch (error) {
      console.error('[내정보] 오류:', error);
      
      const errorEmbed = {
        color: 0xff0000,
        title: '❌ 캐릭터 정보 조회 실패',
        description: '캐릭터 정보를 조회하는 중 오류가 발생했습니다.',
        fields: [
          {
            name: '🔍 오류 내용',
            value: error.message || '알 수 없는 오류',
          },
          {
            name: '💡 해결 방안',
            value: '• 시스템이 새로 업데이트되었습니다. `!시트동기화`가 필요할 수 있습니다.\n• 잠시 후 다시 시도해주세요\n• 문제가 계속되면 관리자에게 문의해주세요',
          },
        ],
        timestamp: new Date().toISOString(),
      };
      
      await loadingMsg.edit({ content: null, embeds: [errorEmbed] });
    }
  }
};