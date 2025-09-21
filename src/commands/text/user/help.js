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
          value: '• `!명령어` - 사용 가능한 모든 명령어 확인\n• `!내정보` - 내 캐릭터 정보 확인\n• `!닉네임변경 <새닉네임>` - 캐릭터명 변경\n• `!보스목록` - 등록된 보스 목록 확인\n• `!보스정보 <보스명>` - 특정 보스의 상세 정보 확인\n• `!보스일정` - 보스 리젠 일정 확인\n• `!컷 <보스명> [시간]` - 보스 컷타임 등록 (!컷, !컷 HHMM, !컷 MMDDHHMM)\n• `!젠 <보스명> <젠타임>` - 젠타임 기반 컷타임 역산 (!젠 보스명 HHMM, !젠 보스명 MMDDHHMM)',
          inline: false,
        },
        {
          name: '운영진 이상',
          value: '• `!보스추가` - 새로운 보스 등록 (참여점수 0-100점)\n• `!계정추가 @사용자 [캐릭터명] [권한]` - 길드원 추가 (멘션 방식)',
          inline: false,
        },
        {
          name: '관리자 전용',
          value: '• `!보스삭제 <보스명>` - 등록된 보스 삭제',
          inline: false,
        },
      ]
    };

    await message.reply({ embeds: [embed] });
  },
};