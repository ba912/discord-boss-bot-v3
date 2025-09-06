module.exports = {
  name: 'help',
  aliases: ['명령어'],
  description: '사용 가능한 명령어 목록을 보여줍니다',
  usage: '!명령어',
  cooldown: 3,
  
  async execute(message, args) {
    const embed = {
      color: 0x0099ff,
      title: '📋 사용 가능한 명령어',
      fields: [
        {
          name: '일반 사용자',
          value: '• `!명령어` - 사용 가능한 모든 명령어 확인',
          inline: false,
        },
        {
          name: '운영진 전용',
          value: '• `!시트연결확인` - Google Sheets 연결 상태 확인\n• `!시트생성` - 봇 전용 시트 생성',
          inline: false,
        },
      ],
    };

    await message.reply({ embeds: [embed] });
  },
};