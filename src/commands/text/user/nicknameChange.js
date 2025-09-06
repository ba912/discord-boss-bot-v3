const characterService = require('../../../services/characterService');
const { getUserPermissionFromSheet } = require('../../../utils/permissions');

module.exports = {
  name: 'nicknamechange',
  aliases: ['닉네임변경', '닉변'],
  description: '캐릭터명을 변경합니다 (연결된 모든 계정에 동기화)',
  usage: '!닉네임변경 <새로운캐릭터명>',
  cooldown: 10, // 10초 쿨다운 (시트 업데이트 작업이므로)
  
  async execute(message, args) {
    // 즉시 처리 중 메시지 표시
    const processingMessage = await message.reply('⏳ 캐릭터명을 변경하는 중...');
    
    try {
      // 1. 입력 검증
      if (args.length === 0) {
        return processingMessage.edit('❌ 새로운 캐릭터명을 입력해주세요.\n**사용법:** `!닉네임변경 <새로운캐릭터명>`');
      }

      const newCharacterName = args.join(' ').trim();
      
      // 2. 캐릭터명 유효성 검사
      const nameValidation = await characterService.validateCharacterName(newCharacterName);
      if (!nameValidation.valid) {
        return processingMessage.edit(`❌ ${nameValidation.error}`);
      }

      // 3. 사용자 권한 및 캐릭터 확인
      const userPermission = await getUserPermissionFromSheet(message.author.id);
      if (!userPermission) {
        return processingMessage.edit('❌ 시트에 등록되지 않은 사용자입니다. 관리자에게 문의해주세요.');
      }

      // 4. 사용자의 현재 캐릭터 정보 조회
      const currentCharacter = await characterService.getCharacterByUserId(message.author.id);
      if (!currentCharacter) {
        return processingMessage.edit('❌ 캐릭터 정보를 찾을 수 없습니다. 관리자에게 문의해주세요.');
      }

      // 5. 이미 같은 이름인지 확인
      if (currentCharacter.characterName === newCharacterName) {
        return processingMessage.edit(`❌ 이미 "${newCharacterName}"으로 설정되어 있습니다.`);
      }

      // 6. 중복된 캐릭터명 확인 (선택적 - 부주 개념상 허용할 수도 있음)
      const existingCharacter = await characterService.getCharacterByName(newCharacterName);
      if (existingCharacter && existingCharacter.characterId !== currentCharacter.characterId) {
        // 중복 캐릭터명 존재 - 사용자에게 확인 요청
        const confirmMessage = await processingMessage.edit(
          `⚠️ 이미 "${newCharacterName}" 캐릭터가 존재합니다.\n` +
          `부주 시스템으로 인해 같은 캐릭터명 사용이 가능하지만, 혼동을 방지하기 위해 다른 이름을 권장합니다.\n\n` +
          `그래도 변경하시겠습니까? 10초 내에 ✅를 클릭하시면 진행됩니다.`
        );

        try {
          await confirmMessage.react('✅');
          
          // 사용자의 반응 대기 (10초 제한)
          const filter = (reaction, user) => {
            return reaction.emoji.name === '✅' && user.id === message.author.id;
          };
          
          const collected = await confirmMessage.awaitReactions({ 
            filter, 
            max: 1, 
            time: 10000, 
            errors: ['time'] 
          });

          // 확인 완료 - 계속 진행
          await confirmMessage.reactions.removeAll();
          await confirmMessage.edit('⏳ 캐릭터명을 변경하는 중...');
          
        } catch (error) {
          // 시간 초과 또는 취소
          return confirmMessage.edit('❌ 시간이 초과되어 캐릭터명 변경이 취소되었습니다.');
        }
      }

      // 7. 캐릭터명 변경 실행
      const changeResult = await characterService.changeCharacterNameByUserId(message.author.id, newCharacterName);

      // 8. 성공 메시지 생성
      const successEmbed = {
        color: 0x00ff00,
        title: '✅ 캐릭터명 변경 완료!',
        fields: [
          {
            name: '이전 캐릭터명',
            value: changeResult.oldName,
            inline: true,
          },
          {
            name: '새 캐릭터명',
            value: changeResult.newName,
            inline: true,
          },
          {
            name: '변경일시',
            value: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
            inline: true,
          },
        ],
      };

      await processingMessage.edit({ content: null, embeds: [successEmbed] });

      // 9. 로그 출력 (서버 콘솔)
      console.log(`✅ 캐릭터명 변경: ${message.author.tag} (${message.author.id}) - "${changeResult.oldName}" → "${changeResult.newName}"`);

    } catch (error) {
      console.error('[닉네임변경] 오류:', error);
      
      // 구체적인 오류 메시지 생성
      let errorMessage = '❌ 캐릭터명 변경 중 오류가 발생했습니다.';
      
      if (error.message.includes('존재하지 않는')) {
        errorMessage = '❌ ' + error.message;
      } else if (error.message.includes('권한')) {
        errorMessage = '❌ ' + error.message;
      } else if (error.message.includes('시트')) {
        errorMessage = '❌ Google Sheets 연결 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      }

      const errorEmbed = {
        color: 0xff0000,
        title: '❌ 캐릭터명 변경 실패',
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
              '• 캐릭터명이 올바른 형식인지 확인해주세요\n' +
              '• 잠시 후 다시 시도해주세요\n' +
              '• 문제가 계속되면 관리자에게 문의해주세요',
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      
      await processingMessage.edit({ content: null, embeds: [errorEmbed] });
    }
  },
};
