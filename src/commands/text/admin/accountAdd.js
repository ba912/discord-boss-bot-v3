const characterService = require('../../../services/characterService');
const { checkSuperAdminCommandPermission, checkCommandPermission, getPermissionDeniedEmbed } = require('../../../utils/permissions');

module.exports = {
  name: 'accountadd',
  aliases: ['계정추가'],
  description: 'Discord 멘션을 통해 길드원을 추가합니다',
  usage: '!계정추가 @사용자 [캐릭터명] [권한]',
  cooldown: 10,
  
  async execute(message, args) {
    // 운영진 이상 권한 체크
    const hasPermission = await checkCommandPermission(message);
    if (!hasPermission) {
      const permissionEmbed = getPermissionDeniedEmbed();
      return await message.reply({ embeds: [permissionEmbed] });
    }

    // 즉시 처리 중 메시지 표시
    const processingMessage = await message.reply('⏳ 계정을 추가하는 중...');

    try {
      // 1. 멘션 확인
      const mentionedUser = message.mentions.users.first();
      if (!mentionedUser) {
        return processingMessage.edit('❌ 사용자를 멘션해주세요.\n**사용법:** `!계정추가 @사용자 [캐릭터명] [권한]`');
      }

      const userId = mentionedUser.id;
      const discordNickname = mentionedUser.displayName || mentionedUser.username;
      const discordTag = `${mentionedUser.username}#${mentionedUser.discriminator}`;

      // 2. 이미 등록된 사용자인지 확인
      const existingAccount = await characterService.getCharacterByUserId(userId);
      if (existingAccount) {
        return processingMessage.edit(
          `❌ **${discordNickname}**님은 이미 등록되어 있습니다.\n` +
          `🎮 현재 캐릭터: **${existingAccount.characterName}**\n` +
          `🔰 계정 유형: **${existingAccount.accountType}**\n` +
          `👑 권한: **${existingAccount.userPermission}**`
        );
      }

      // 3. 인수 파싱
      const remainingArgs = args.slice(1); // 첫 번째 인수(멘션)를 제외한 나머지
      const characterName = remainingArgs.length > 0 ? remainingArgs[0] : null;
      const permission = remainingArgs.length > 1 ? remainingArgs[1] : '일반길드원';

      // 4. 권한 유효성 검사
      const { DROPDOWN_OPTIONS } = require('../../../config/constants').SHEET_CONFIG;
      const validPermissions = DROPDOWN_OPTIONS.PERMISSIONS;
      if (!validPermissions.includes(permission)) {
        return processingMessage.edit(
          `❌ 올바르지 않은 권한입니다.\n` +
          `**사용 가능한 권한:** ${validPermissions.join(', ')}`
        );
      }

      let result;

      if (characterName) {
        // 5a. 캐릭터 존재 여부 확인 후 처리
        const existingCharacter = await characterService.getCharacterDetails(characterName);
        
        if (existingCharacter) {
          // 기존 캐릭터에 부주로 추가
          result = await characterService.addUserToExistingCharacter(
            characterName, 
            userId, 
            discordNickname, 
            discordTag, 
            permission
          );

          const successEmbed = {
            color: 0x00ff00,
            title: '✅ 계정 추가 완료!',
            fields: [
              {
                name: '👤 추가된 사용자',
                value: `**${discordNickname}** (${discordTag})`,
                inline: true,
              },
              {
                name: '🎮 캐릭터',
                value: `**${characterName}**`,
                inline: true,
              }
            ]
          };

          await processingMessage.edit({ content: null, embeds: [successEmbed] });
          
        } else {
          // 새로운 캐릭터 생성 (캐릭터명 지정)
          result = await characterService.createNewCharacter(
            characterName,
            userId, 
            discordNickname, 
            discordTag, 
            permission
          );

          const successEmbed = {
            color: 0x00ff00,
            title: '✅ 새 캐릭터 생성 완료!',
            fields: [
              {
                name: '👤 추가된 사용자',
                value: `**${discordNickname}** (${discordTag})`,
                inline: true,
              },
              {
                name: '🎮 새로 생성된 캐릭터',
                value: `**${characterName}**`,
                inline: true,
              }
            ]
          };

          await processingMessage.edit({ content: null, embeds: [successEmbed] });
        }

      } else {
        // 5b. 새 캐릭터 생성 (Discord 닉네임을 캐릭터명으로 사용)
        result = await characterService.createNewCharacter(
          discordNickname, 
          userId, 
          discordNickname, 
          discordTag, 
          permission
        );

        const successEmbed = {
          color: 0x00ff00,
          title: '✅ 새 계정 생성 완료!',
          fields: [
            {
              name: '👤 추가된 사용자',
              value: `**${discordNickname}** (${discordTag})`,
              inline: true,
            },
            {
              name: '🎮 생성된 캐릭터',
              value: `**${discordNickname}**`,
              inline: true,
            }
          ]
        };

        await processingMessage.edit({ content: null, embeds: [successEmbed] });
      }

      // 6. 로그 출력
      console.log(`✅ 계정 추가: ${message.author.tag} → ${discordNickname} (${userId})`);
      console.log(`   캐릭터: ${result.characterName}, 유형: ${result.accountType}`);

    } catch (error) {
      console.error('[계정추가] 오류:', error);

      let errorMessage = '❌ 계정 추가 중 오류가 발생했습니다.';
      
      if (error.message.includes('이미 존재하는 캐릭터명')) {
        errorMessage = `❌ **"${args[1]}"** 캐릭터는 이미 존재합니다.\n` +
                     `다른 캐릭터명을 사용하거나, 해당 캐릭터에 부주로 추가해주세요.`;
      } else if (error.message.includes('이미 등록되어 있습니다')) {
        errorMessage = '❌ ' + error.message;
      } else if (error.message.includes('시트')) {
        errorMessage = '❌ Google Sheets 연결 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      }

      const errorEmbed = {
        color: 0xff0000,
        title: '❌ 계정 추가 실패',
        description: errorMessage,
        fields: [
          {
            name: '🔍 오류 내용',
            value: error.message || '알 수 없는 오류',
            inline: false,
          },
          {
            name: '💡 해결 방안',
            value: 
              '• 사용자가 이미 등록되어 있는지 확인해주세요\n' +
              '• 캐릭터명이 중복되지 않는지 확인해주세요\n' +
              '• 잠시 후 다시 시도해주세요\n' +
              '• 문제가 계속되면 시스템 관리자에게 문의해주세요',
            inline: false,
          },
          {
            name: '📋 사용법',
            value: 
              '• `!계정추가 @사용자` - 새 캐릭터 생성\n' +
              '• `!계정추가 @사용자 캐릭터명` - 기존 캐릭터에 부주 추가\n' +
              '• `!계정추가 @사용자 캐릭터명 권한` - 권한 지정',
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      
      await processingMessage.edit({ content: null, embeds: [errorEmbed] });
    }
  },
};
