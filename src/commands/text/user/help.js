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
          value: '• `!명령어` - 사용 가능한 모든 명령어 확인\n• `!내정보` - 내 캐릭터 정보 확인 (권한, 점수 등)\n• `!닉네임변경 <새닉네임>` - 캐릭터명 변경 (부주 동기화)\n• `!보스목록` - 등록된 보스 목록 확인\n• `!보스정보 <보스명>` - 특정 보스의 상세 정보 확인',
          inline: false,
        },
        {
          name: '운영진 이상',
          value: '• `!보스추가` - 새로운 보스 등록 (모달 인터페이스)',
          inline: false,
        },
        {
          name: '관리자 전용',
          value: '• `!시트연결확인` - Google Sheets 연결 상태 확인\n• `!시트생성` - 봇 전용 시트 생성\n• `!시트동기화` - 시트 구조 최신화 + 모든 데이터 구조 문제 자동 해결\n• `!보스삭제 <보스명>` - 등록된 보스 삭제\n• `!계정추가 @사용자 [캐릭터명] [권한]` - 길드원 추가 (멘션 방식)\n• `!운영진가이드` - 수동 캐릭터 추가 가이드',
          inline: false,
        },
      ],
      footer: {
        text: '💡 별칭: !보스목록 = !보스, !보스추가 = !보스등록, !보스정보 = !bossinfo, !보스삭제 = !bossdelete, !계정추가 = !accountadd'
      }
    };

    await message.reply({ embeds: [embed] });
  },
};