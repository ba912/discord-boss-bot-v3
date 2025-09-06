const fs = require('fs');
const path = require('path');
const bossModal = require('../commands/interactions/bossModal');
const { MessageFlags } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  
  async execute(interaction) {
    try {
      // 모달 제출 인터랙션 처리
      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('boss_add_modal_')) {
          return await bossModal.handleBossAddModal(interaction);
        }
      }
      
      // 버튼 인터랙션 처리
      if (interaction.isButton()) {
        const customId = interaction.customId;
        
        // 보스 등록 모달 버튼
        if (customId.startsWith('boss_add_modal_')) {
          return await bossModal.handleBossAddButton(interaction);
        }
        
        
        // 새로운 버튼 핸들러 시스템
        const handled = await module.exports.handleButtonInteraction(interaction);
        if (!handled) {
          console.warn(`버튼 핸들러를 찾을 수 없음: ${interaction.customId}`);
          return await interaction.reply({
            content: '❌ 알 수 없는 버튼입니다.',
            flags: MessageFlags.Ephemeral
          });
        }
      }
      
      // 셀렉트 메뉴나 다른 인터랙션 타입 처리 (추후 확장 가능)
      if (interaction.isStringSelectMenu()) {
        // TODO: 셀렉트 메뉴 핸들러 구현
        return await interaction.reply({
          content: '❌ 셀렉트 메뉴 기능은 아직 구현되지 않았습니다.',
          flags: MessageFlags.Ephemeral
        });
      }
      
    } catch (error) {
      console.error('인터랙션 처리 중 오류:', error);
      
      const errorMessage = '❌ 요청을 처리하는 중 오류가 발생했습니다.';
      
      try {
        if (interaction.deferred) {
          await interaction.editReply({ content: errorMessage });
        } else if (interaction.replied) {
          await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
        }
      } catch (replyError) {
        console.error('인터랙션 응답 중 오류:', replyError);
      }
    }
  },

  /**
   * 버튼 인터랙션 핸들러 찾기 및 실행
   * @param {ButtonInteraction} interaction - 버튼 인터랙션
   * @returns {boolean} 핸들러가 실행되었는지 여부
   */
  async handleButtonInteraction(interaction) {
    try {
      // buttons 폴더에서 핸들러 찾기
      const buttonsPath = path.join(__dirname, '..', 'commands', 'interactions', 'buttons');
      
      if (!fs.existsSync(buttonsPath)) {
        return false;
      }

      const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'));
      
      for (const file of buttonFiles) {
        const buttonHandler = require(path.join(buttonsPath, file));
        
        // 패턴 매칭 방식으로 핸들러 찾기
        if (buttonHandler.pattern && buttonHandler.pattern.test(interaction.customId)) {
          await buttonHandler.execute(interaction);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('버튼 핸들러 실행 중 오류:', error);
      return false;
    }
  }
};