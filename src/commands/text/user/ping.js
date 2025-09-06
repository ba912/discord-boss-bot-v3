module.exports = {
  name: 'ping',
  aliases: ['핑', 'pong'],
  description: '봇의 응답 시간을 확인합니다',
  usage: '!ping',
  cooldown: 3,
  
  async execute(message, args) {
    const sent = await message.reply('🏓 측정 중...');
    
    // 레이턴시 계산
    const roundtripLatency = sent.createdTimestamp - message.createdTimestamp;
    const wsLatency = message.client.ws.ping;
    
    // 임베드로 예쁘게 표시
    const embed = {
      color: 0x00ff00,
      title: '🏓 Pong!',
      fields: [
        {
          name: '📡 라운드트립 지연시간',
          value: `${roundtripLatency}ms`,
          inline: true,
        },
        {
          name: '💓 WebSocket 핑',
          value: `${wsLatency}ms`,
          inline: true,
        },
        {
          name: '⚡ 상태',
          value: getLatencyStatus(roundtripLatency),
          inline: true,
        },
      ],
    };
    
    await sent.edit({ content: null, embeds: [embed] });
  },
};

// 지연시간에 따른 상태 반환
function getLatencyStatus(latency) {
  if (latency < 100) return '🟢 매우 좋음';
  if (latency < 200) return '🟡 좋음';
  if (latency < 500) return '🟠 보통';
  return '🔴 느림';
}