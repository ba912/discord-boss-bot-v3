const { Client, GatewayIntentBits, Collection } = require('discord.js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// 환경변수 로드
dotenv.config();

// Discord 클라이언트 생성
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates, // TTS 기능을 위해 필요
  ],
});

// 명령어 컬렉션 초기화
client.commands = new Collection();

// 이벤트 핸들러 로드
const eventsPath = path.join(__dirname, 'src', 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
}

// 에러 처리
client.on('error', error => {
  console.error('[Discord Client] 오류 발생:', error);
});

process.on('unhandledRejection', error => {
  console.error('[Process] 처리되지 않은 Promise 거부:', error);
});

process.on('uncaughtException', error => {
  console.error('[Process] 처리되지 않은 예외:', error);
  process.exit(1);
});

// 봇 시작
client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error('[봇 시작] 로그인 실패:', error);
  process.exit(1);
});