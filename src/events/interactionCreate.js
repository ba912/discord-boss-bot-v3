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
        
        
        // 기존 버튼 처리 로직
        const buttonType = interaction.customId.split('_')[0];
        
        // interactions 폴더에서 해당 버튼 핸들러 찾기
        const interactionsPath = path.join(__dirname, '..', 'commands', 'interactions');
        const interactionFiles = fs.readdirSync(interactionsPath).filter(file => file.endsWith('.js'));
        
        for (const file of interactionFiles) {
          const interactionHandler = require(path.join(interactionsPath, file));
          
          // 버튼 타입과 핸들러 이름이 매칭되는지 확인
          if (interactionHandler.name === `${buttonType}_button`) {
            return await interactionHandler.execute(interaction);
          }
        }
        
        // 해당하는 핸들러를 찾지 못한 경우
        console.warn(`버튼 핸들러를 찾을 수 없음: ${interaction.customId}`);
        return await interaction.reply({
          content: '❌ 알 수 없는 버튼입니다.',
          flags: MessageFlags.Ephemeral
        });
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
};