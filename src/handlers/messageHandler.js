const fs = require('fs');
const path = require('path');

class MessageHandler {
  constructor() {
    this.commands = new Map();
    this.loadCommands();
  }

  // 명령어 파일들을 로드
  loadCommands() {
    const commandsPath = path.join(__dirname, '..', 'commands', 'text');
    this.loadCommandsFromDirectory(commandsPath);
  }

  // 디렉토리에서 명령어 재귀적으로 로드
  loadCommandsFromDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // 하위 디렉토리 재귀 탐색
        this.loadCommandsFromDirectory(itemPath);
      } else if (item.endsWith('.js')) {
        // 명령어 파일 로드
        try {
          const command = require(itemPath);
          if (command && command.name) {
            this.commands.set(command.name, command);
            
            // 별칭(aliases)도 등록
            if (command.aliases && Array.isArray(command.aliases)) {
              command.aliases.forEach(alias => {
                this.commands.set(alias, command);
              });
            }
            
            console.log(`📝 명령어 로드: ${command.name}${command.aliases ? ` (별칭: ${command.aliases.join(', ')})` : ''}`);
          }
        } catch (error) {
          console.error(`❌ 명령어 로드 실패: ${itemPath}`, error);
        }
      }
    }
  }

  // 메시지 파싱 및 명령어 실행
  async handleMessage(message, prefix) {
    const content = message.content.slice(prefix.length).trim();
    const args = content.split(/\s+/);
    const commandName = args.shift().toLowerCase();

    // 명령어 찾기
    const command = this.commands.get(commandName);
    if (!command) return;

    // 쿨다운 체크 (기본 3초)
    const now = Date.now();
    const cooldownKey = `${message.author.id}-${commandName}`;
    const cooldownTime = (command.cooldown || 3) * 1000;
    
    if (this.lastCommandTime && this.lastCommandTime[cooldownKey]) {
      const timePassed = now - this.lastCommandTime[cooldownKey];
      if (timePassed < cooldownTime) {
        const remaining = Math.ceil((cooldownTime - timePassed) / 1000);
        return message.reply(`⏰ 명령어 쿨다운: ${remaining}초 후에 다시 시도해주세요.`);
      }
    }

    // 쿨다운 기록
    if (!this.lastCommandTime) this.lastCommandTime = {};
    this.lastCommandTime[cooldownKey] = now;

    // 명령어 실행
    try {
      console.log(`🔧 [${message.author.tag}] 명령어 실행: ${prefix}${commandName} ${args.join(' ')}`);
      await command.execute(message, args);
    } catch (error) {
      console.error(`❌ [${commandName}] 명령어 실행 오류:`, error);
      throw error; // 상위로 에러 전파
    }
  }

  // 명령어 목록 반환
  getCommands() {
    const uniqueCommands = new Map();
    
    for (const [name, command] of this.commands) {
      if (name === command.name) { // 별칭이 아닌 원본 명령어만
        uniqueCommands.set(name, command);
      }
    }
    
    return uniqueCommands;
  }
}

// 싱글톤 패턴으로 내보내기
module.exports = new MessageHandler();