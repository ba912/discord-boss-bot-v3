const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { bossService } = require('../../services/bossService');
const { checkAdminPermission } = require('../../utils/permissions');

module.exports = {
  // 보스 등록 버튼 처리
  async handleBossAddButton(interaction) {
    try {
      // 권한 재확인
      const hasPermission = await checkAdminPermission(interaction.user.id);
      if (!hasPermission) {
        return interaction.reply({
          content: '❌ 이 기능은 운영진 이상만 사용할 수 있습니다.',
          flags: MessageFlags.Ephemeral
        });
      }

      // 사용자 ID 검증 (버튼을 누른 사용자만 사용 가능)
      const buttonUserId = interaction.customId.split('_').pop();
      if (interaction.user.id !== buttonUserId) {
        return interaction.reply({
          content: '❌ 본인이 요청한 버튼만 사용할 수 있습니다.',
          flags: MessageFlags.Ephemeral
        });
      }

      // 모달 생성
      const modal = new ModalBuilder()
        .setCustomId(`boss_add_modal_${interaction.user.id}`)
        .setTitle('📋 보스 정보 등록');

      // 보스명 입력
      const bossNameInput = new TextInputBuilder()
        .setCustomId('boss_name')
        .setLabel('보스명')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('예: 데스나이트')
        .setRequired(true)
        .setMaxLength(50);

      // 참여점수 입력
      const scoreInput = new TextInputBuilder()
        .setCustomId('boss_score')
        .setLabel('참여점수 (1-100)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('예: 15')
        .setRequired(true);

      // 리젠타입 입력 (개선된 안내)
      const regenTypeInput = new TextInputBuilder()
        .setCustomId('regen_type')
        .setLabel('리젠타입 (1 또는 2 입력)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1: 시간마다, 2: 특정요일')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(1);

      // 리젠설정 입력 (개선된 안내)
      const regenSettingsInput = new TextInputBuilder()
        .setCustomId('regen_settings')
        .setLabel('리젠설정')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('시간마다: 3 (숫자만)\n특정요일: 화,목,토 21:00 (요일과 시간)')
        .setRequired(true);

      // 스케줄노출여부 입력 (개선된 안내)
      const visibilityInput = new TextInputBuilder()
        .setCustomId('schedule_visible')
        .setLabel('스케줄노출여부 (1 또는 2 입력)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1: 노출, 2: 비노출')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(1);

      // ActionRow로 감싸서 모달에 추가
      const firstRow = new ActionRowBuilder().addComponents(bossNameInput);
      const secondRow = new ActionRowBuilder().addComponents(scoreInput);
      const thirdRow = new ActionRowBuilder().addComponents(regenTypeInput);
      const fourthRow = new ActionRowBuilder().addComponents(regenSettingsInput);
      const fifthRow = new ActionRowBuilder().addComponents(visibilityInput);

      modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

      // 모달 표시
      await interaction.showModal(modal);

    } catch (error) {
      console.error('[보스 등록 버튼] 오류:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ 모달 표시 중 오류가 발생했습니다.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  },

  // 보스 등록 모달 제출 처리
  async handleBossAddModal(interaction) {
    try {
      // 권한 재확인
      const hasPermission = await checkAdminPermission(interaction.user.id);
      if (!hasPermission) {
        return interaction.reply({
          content: '❌ 이 기능은 운영진 이상만 사용할 수 있습니다.',
          flags: MessageFlags.Ephemeral
        });
      }

      // 사용자 ID 검증
      const modalUserId = interaction.customId.split('_').pop();
      if (interaction.user.id !== modalUserId) {
        return interaction.reply({
          content: '❌ 본인이 요청한 모달만 제출할 수 있습니다.',
          flags: MessageFlags.Ephemeral
        });
      }

      // 모달에서 입력된 데이터 추출
      const bossName = interaction.fields.getTextInputValue('boss_name').trim();
      const scoreText = interaction.fields.getTextInputValue('boss_score').trim();
      const regenTypeInput = interaction.fields.getTextInputValue('regen_type').trim();
      const regenSettingsInput = interaction.fields.getTextInputValue('regen_settings').trim();
      const visibilityInput = interaction.fields.getTextInputValue('schedule_visible').trim();

      // 리젠타입 변환 (1: 시간마다, 2: 특정요일)
      let regenType;
      if (regenTypeInput === '1') {
        regenType = '시간마다';
      } else if (regenTypeInput === '2') {
        regenType = '특정요일';
      } else {
        return interaction.reply({
          content: '❌ 리젠타입은 1(시간마다) 또는 2(특정요일)만 입력 가능합니다.',
          flags: MessageFlags.Ephemeral
        });
      }

      // 스케줄노출여부 변환 (1: 노출, 2: 비노출)
      let scheduleVisible;
      if (visibilityInput === '1') {
        scheduleVisible = '노출';
      } else if (visibilityInput === '2') {
        scheduleVisible = '비노출';
      } else {
        return interaction.reply({
          content: '❌ 스케줄노출여부는 1(노출) 또는 2(비노출)만 입력 가능합니다.',
          flags: MessageFlags.Ephemeral
        });
      }

      // 점수를 숫자로 변환
      const score = parseInt(scoreText);
      if (isNaN(score)) {
        return interaction.reply({
          content: '❌ 점수는 숫자로 입력해주세요.',
          flags: MessageFlags.Ephemeral
        });
      }

      // 리젠설정을 JSON 형태로 변환
      let regenSettings;
      try {
        if (regenType === '시간마다') {
          // 단순한 숫자 입력을 JSON으로 변환
          const hours = parseInt(regenSettingsInput);
          if (isNaN(hours) || hours < 1 || hours > 168) {
            return interaction.reply({
              content: '❌ 시간마다 리젠은 1~168시간 사이의 숫자를 입력해주세요.',
              flags: MessageFlags.Ephemeral
            });
          }
          regenSettings = JSON.stringify({ hours });
        } else if (regenType === '특정요일') {
          // "화,목,토 21:00" 형태를 파싱
          const parts = regenSettingsInput.split(' ');
          if (parts.length !== 2) {
            return interaction.reply({
              content: '❌ 특정요일 형식: "화,목,토 21:00" (요일들과 시간을 공백으로 구분)',
              flags: MessageFlags.Ephemeral
            });
          }
          
          const daysStr = parts[0];
          const time = parts[1];
          
          // 시간 형식 검증
          if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
            return interaction.reply({
              content: '❌ 시간은 HH:MM 형식으로 입력해주세요. (예: 21:00)',
              flags: MessageFlags.Ephemeral
            });
          }
          
          // 요일 파싱 및 검증
          const days = daysStr.split(',').map(day => day.trim());
          const validDays = ['월', '화', '수', '목', '금', '토', '일'];
          const invalidDays = days.filter(day => !validDays.includes(day));
          
          if (invalidDays.length > 0) {
            return interaction.reply({
              content: `❌ 올바르지 않은 요일: ${invalidDays.join(', ')}\n올바른 요일: ${validDays.join(', ')}`,
              flags: MessageFlags.Ephemeral
            });
          }
          
          if (days.length === 0) {
            return interaction.reply({
              content: '❌ 최소 1개의 요일을 선택해주세요.',
              flags: MessageFlags.Ephemeral
            });
          }
          
          regenSettings = JSON.stringify({ days, time });
        }
      } catch (error) {
        return interaction.reply({
          content: '❌ 리젠설정 형식이 올바르지 않습니다.',
          flags: MessageFlags.Ephemeral
        });
      }

      // 보스 데이터 구성
      const bossData = {
        bossName,
        score,
        regenType,
        regenSettings,
        scheduleVisible
      };

      // 임시 응답 (처리 중 메시지)
      await interaction.reply({
        content: '⏳ 보스 정보를 등록 중입니다...',
        flags: MessageFlags.Ephemeral
      });

      // 보스 추가 실행
      await bossService.addBoss(bossData);

      // 간단한 성공 응답
      await interaction.editReply({
        content: '✅ 보스 등록 완료'
      });

    } catch (error) {
      console.error('[보스 등록 모달] 오류:', error);
      
      // 간단한 실패 응답
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ 보스 등록 실패',
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.editReply({
          content: '❌ 보스 등록 실패'
        });
      }
    }
  }
};