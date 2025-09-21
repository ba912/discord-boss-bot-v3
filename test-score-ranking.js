// !점수 명령어 기본 로직 테스트
const scoreCommand = require('./src/commands/text/user/scoreRanking');

// 실제 테스트 데이터
const sampleRanking = [
  { rank: 1, characterName: '방똥', totalScore: 6, participationRate: 100.0 },
  { rank: 2, characterName: '달려죠', totalScore: 2, participationRate: 33.3 },
  { rank: 3, characterName: '성동일성동일', totalScore: 0, participationRate: 0.0 }
];

console.log('=== !점수 명령어 포맷 테스트 ===\n');

// 개별 라인 포맷 테스트
console.log('개별 라인 포맷:');
sampleRanking.forEach(item => {
  const line = scoreCommand.formatRankingLine(item);
  console.log(`"${line.slice(0, -1)}"`); // 마지막 \n 제거해서 표시
});

console.log('\n전체 메시지 포맷:');
const messages = scoreCommand.formatRankingMessages(sampleRanking);
messages.forEach((msg, index) => {
  console.log(`--- 메시지 ${index + 1} ---`);
  console.log(msg);
  console.log(`길이: ${msg.length}자\n`);
});

console.log('테스트 완료!');