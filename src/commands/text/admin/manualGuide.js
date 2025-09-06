const { EmbedBuilder } = require('discord.js');
const googleSheetsService = require('../../../services/googleSheetsService');
const { checkSuperAdminCommandPermission } = require('../../../utils/permissions');

module.exports = {
  name: '운영진가이드',
  description: '운영진이 Google Sheets에서 수동으로 캐릭터를 추가할 때 사용하는 가이드',
  async execute(message, args) {
    try {
      // 권한 확인
      // const hasPermission = await checkSuperAdminCommandPermission(message);
      // if (!hasPermission) return;

      const template = googleSheetsService.getManualCharacterTemplate();

      // 기본 가이드 임베드
      const guideEmbed = new EmbedBuilder()
        .setTitle('📋 운영진 수동 캐릭터 추가 가이드')
        .setColor('#3498db')
        .setDescription('Google Sheets에서 직접 캐릭터를 추가할 때 사용하세요!')
        .addFields([
          {
            name: '🔧 단계별 가이드',
            value: template.instructions.join('\n'),
            inline: false
          },
          {
            name: '📝 A열 ID 수식 (복사용)',
            value: `\`\`\`\n${template.idFormula}\n\`\`\``,
            inline: false
          },
          {
            name: '🕒 D,E열 현재시간 수식 (복사용)',
            value: '```\n=NOW()\n```',
            inline: false
          },
          {
            name: '⚠️ 주의사항',
            value: [
              '• ID는 **반드시 숫자**여야 합니다',
              '• 중복 ID가 있으면 **빨간색**으로 표시됩니다', 
              '• 캐릭터명은 **유니크**해야 합니다',
              '• 점수는 숫자로만 입력하세요',
            ].join('\n'),
            inline: false
          }
        ])
        .setFooter({ text: '수식을 복사해서 붙여넣으세요!' })
        .setTimestamp();

      // 예제 임베드
      const exampleEmbed = new EmbedBuilder()
        .setTitle('📊 입력 예제')
        .setColor('#2ecc71')
        .addFields([
          {
            name: 'A열 (ID)',
            value: template.idFormula,
            inline: true
          },
          {
            name: 'B열 (캐릭터명)',
            value: '신규유저123',
            inline: true
          },
          {
            name: 'C열 (총점수)',
            value: '0',
            inline: true
          },
          {
            name: 'D열 (생성일시)',
            value: '=NOW()',
            inline: true
          },
          {
            name: 'E열 (수정일시)',
            value: '=NOW()',
            inline: true
          },
          {
            name: '\u200B',
            value: '\u200B',
            inline: true
          }
        ]);

      // 문제 해결 임베드
      const troubleshootEmbed = new EmbedBuilder()
        .setTitle('🔧 문제 해결')
        .setColor('#e74c3c')
        .addFields([
          {
            name: '🚨 빨간색 경고가 나타나는 경우',
            value: [
              '• **중복 ID**: 다른 행과 같은 번호',
              '• **해결법**: A열에서 중복된 값을 찾아 수정',
              '• **확인법**: 조건부서식으로 자동 감지'
            ].join('\n'),
            inline: false
          },
          {
            name: '❌ 수식이 오류를 보이는 경우',
            value: [
              '• **#NAME?**: 수식 문법 오류',
              '• **#REF!**: 잘못된 참조',
              '• **해결법**: 수식을 다시 복사해서 붙여넣기'
            ].join('\n'),
            inline: false
          }
        ]);

      await message.reply({ 
        embeds: [guideEmbed, exampleEmbed, troubleshootEmbed] 
      });

    } catch (error) {
      console.error('❌ 운영진가이드 명령어 실행 실패:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ 오류 발생')
        .setDescription('운영진가이드를 불러오는 중 오류가 발생했습니다.')
        .setColor('#e74c3c')
        .addFields([
          { name: '오류 내용', value: error.message, inline: false }
        ])
        .setTimestamp();

      await message.reply({ embeds: [errorEmbed] });
    }
  },
};
