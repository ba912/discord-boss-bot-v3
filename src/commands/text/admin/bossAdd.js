const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { checkAdminPermission } = require('../../../utils/permissions');

module.exports = {
  name: 'bossadd',
  aliases: ['보스추가', '보스등록'],
  description: '새로운 보스를 등록합니다 (모달 인터페이스)',
  usage: '!보스추가',
  cooldown: 10,
  
  async execute(message, args) {
    try {
      // 즉시 처리 중 메시지 표시
      const processingMessage = await message.reply('⏳ 권한 확인 중...');

      // 권한 확인 (운영진 이상)
      const hasPermission = await checkAdminPermission(message.author.id);
      if (!hasPermission) {
        return processingMessage.edit('❌ 이 명령어는 운영진 이상만 사용할 수 있습니다.');
      }

      // 모달 생성
      const modal = new ModalBuilder()
        .setCustomId(`boss_add_${message.author.id}`)
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
        .setLabel('참여점수 (0-100)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('예: 15')
        .setRequired(true);

      // 리젠타입 입력
      const regenTypeInput = new TextInputBuilder()
        .setCustomId('regen_type')
        .setLabel('리젠타입')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('시간마다 또는 특정요일')
        .setRequired(true);

      // 리젠설정 입력
      const regenSettingsInput = new TextInputBuilder()
        .setCustomId('regen_settings')
        .setLabel('리젠설정')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('시간마다: {"hours": 3}\n특정요일: {"days": ["화", "목", "토"], "time": "21:00"}')
        .setRequired(true);

      // 스케줄노출여부 입력
      const visibilityInput = new TextInputBuilder()
        .setCustomId('schedule_visible')
        .setLabel('스케줄노출여부')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('노출 또는 비노출')
        .setRequired(true);

      // ActionRow로 감싸서 모달에 추가
      const firstRow = new ActionRowBuilder().addComponents(bossNameInput);
      const secondRow = new ActionRowBuilder().addComponents(scoreInput);
      const thirdRow = new ActionRowBuilder().addComponents(regenTypeInput);
      const fourthRow = new ActionRowBuilder().addComponents(regenSettingsInput);
      const fifthRow = new ActionRowBuilder().addComponents(visibilityInput);

      modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

      // 보스 등록 버튼 생성
      const addBossButton = new ButtonBuilder()
        .setCustomId(`boss_add_modal_${message.author.id}`)
        .setLabel('📋 보스등록')
        .setStyle(ButtonStyle.Primary);

      const buttonRow = new ActionRowBuilder().addComponents(addBossButton);

      // 모달 표시 (이를 위해 interaction이 필요하므로 대신 안내 메시지 표시)
      await processingMessage.edit({
        content: '📋 **보스 등록 안내** (개선된 입력 방식)\n\n' +
                '**1. 보스명:** 등록할 보스의 이름\n' +
                '**2. 참여점수:** 0-100점 사이의 숫자\n' +
                '**3. 리젠타입:** `1` (시간마다) 또는 `2` (특정요일)\n' +
                '**4. 리젠설정:**\n' +
                '   • 시간마다 선택시: `3` (숫자만 입력, 3시간마다)\n' +
                '   • 특정요일 선택시: `화,목,토 21:00` (요일과 시간)\n' +
                '**5. 스케줄노출:** `1` (노출) 또는 `2` (비노출)\n\n' +
                '🎯 **입력 예시:**\n' +
                '• 3시간마다 리젠하는 보스: 리젠타입 `1`, 리젠설정 `3`\n' +
                '• 화목토 21시 리젠하는 보스: 리젠타입 `2`, 리젠설정 `화,목,토 21:00`\n\n' +
                '💡 준비되었다면 **"보스등록"** 버튼을 클릭하세요!',
        components: [buttonRow]
      });

    } catch (error) {
      console.error('[보스추가] 오류:', error);
      await message.reply('❌ 처리 실패');
    }
  },
};