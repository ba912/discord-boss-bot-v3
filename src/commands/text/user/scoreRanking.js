const characterService = require('../../../services/characterService');
const googleSheetsService = require('../../../services/googleSheetsService');

/**
 * !점수 명령어 - 길드원 점수 랭킹 조회
 */
module.exports = {
  name: '점수',
  description: '길드원들의 참여 점수 랭킹을 확인합니다',

  async execute(message, args) {
    try {
      console.log(`[점수랭킹] 명령어 실행 - 사용자: ${message.author.username}`);

      // 처리 중 메시지 표시
      const processingMessage = await message.reply('집계 중...');

      // 랭킹 데이터 조회 (캐싱 적용)
      const result = await characterService.getScoreRanking();
      const { ranking, fromCache, cacheAge } = result;

      if (ranking.length === 0) {
        return await processingMessage.edit('점수 데이터가 없습니다.');
      }

      // 메시지 생성 (캐시 정보 포함)
      const messages = await this.formatRankingMessages(ranking, fromCache, cacheAge);

      // 메시지 전송 (분할 처리)
      for (let i = 0; i < messages.length; i++) {
        if (i === 0) {
          await processingMessage.edit(messages[i]);
        } else {
          await message.channel.send(messages[i]);
          // 연속 메시지 간 300ms 지연
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      console.log(`✅ [점수랭킹] 랭킹 조회 완료 - ${ranking.length}명, ${messages.length}개 메시지`);

    } catch (error) {
      console.error('❌ [점수랭킹] 오류 발생:', error);
      // 에러 발생 시 처리 중 메시지 편집 시도
      try {
        await message.reply('점수 랭킹 조회 중 오류가 발생했습니다.');
      } catch (replyError) {
        console.error('[점수랭킹] 에러 응답 실패:', replyError);
      }
    }
  },

  /**
   * 랭킹 데이터를 Discord 메시지 형태로 포맷
   * @param {Array} ranking - 랭킹 데이터
   * @param {boolean} fromCache - 캐시에서 조회 여부
   * @param {number} cacheAge - 캐시 나이 (초)
   * @returns {Promise<Array>} 포맷된 메시지 배열
   */
  async formatRankingMessages(ranking, fromCache = false, cacheAge = 0) {
    const messages = [];
    let currentMessage = '';

    // 헤더 추가 (캐시 정보 포함)
    let header = '📊 길드 참여 점수 랭킹';
    if (fromCache && cacheAge > 0) {
      const cacheMinutes = Math.floor(cacheAge / 60);
      const cacheSeconds = cacheAge % 60;
      if (cacheMinutes > 0) {
        header += ` (캐시된 데이터: ${cacheMinutes}분 ${cacheSeconds}초 전)`;
      } else {
        header += ` (캐시된 데이터: ${cacheSeconds}초 전)`;
      }
    }
    header += '\n\n';
    currentMessage += header;

    // 각 랭킹 항목 포맷
    for (const item of ranking) {
      const rankingLine = this.formatRankingLine(item);

      // 메시지 길이 체크 (2000자 제한 고려)
      if (currentMessage.length + rankingLine.length > 1800) {
        // 현재 메시지를 완료하고 새 메시지 시작
        const footer = await this.getFooter(ranking, false, fromCache);
        messages.push(currentMessage + footer);

        // 새 메시지 시작 (페이지 표시 포함)
        const pageNum = messages.length + 1;
        currentMessage = `📊 길드 참여 점수 랭킹 (${pageNum}/${Math.ceil(ranking.length / 25)} 페이지)\n\n`;
        currentMessage += rankingLine;
      } else {
        currentMessage += rankingLine;
      }
    }

    // 마지막 메시지에 푸터 추가
    if (currentMessage.trim() !== '') {
      const isFirstMessage = messages.length === 0;
      const footer = await this.getFooter(ranking, isFirstMessage, fromCache);
      messages.push(currentMessage + footer);
    }

    return messages;
  },

  /**
   * 개별 랭킹 라인 포맷
   * @param {Object} item - 랭킹 항목
   * @returns {string} 포맷된 라인
   */
  formatRankingLine(item) {
    const { rank, characterName, totalScore, participationRate } = item;

    // 띄어쓰기를 전각 공백으로 치환
    const processedName = characterName.replace(/ /g, '　');

    // 순위 (4폭)
    const rankStr = `${rank}.`;

    // 점수 (6폭)
    const scoreStr = `${totalScore}점`;

    // 참여율 (8폭)
    const rateStr = `${participationRate.toFixed(1)}%`;

    // Discord용 폭 계산 및 패딩
    const rankPadded = this.padWithFullWidth(rankStr, 5);
    const namePadded = this.padWithFullWidth(processedName, 18);
    const scorePadded = this.padWithFullWidth(scoreStr, 8);
    const ratePadded = this.padWithFullWidth(rateStr, 8);

    return `${rankPadded}${namePadded}${scorePadded}${ratePadded}\n`;
  },

  /**
   * Discord용 실제 폭 계산 (모든 전각 문자=2, 반각 문자=1)
   */
  getDiscordWidth(str) {
    let width = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code > 127) {
        width += 2; // 전각 문자
      } else {
        width += 1; // 반각 문자
      }
    }
    return width;
  },

  /**
   * 전각 공백을 사용한 패딩 함수
   */
  padWithFullWidth(str, targetWidth) {
    const fullWidthSpace = "　"; // U+3000
    const currentWidth = this.getDiscordWidth(str);
    const diff = targetWidth - currentWidth;

    if (diff <= 0) return str;

    // 전각 공백(2폭)과 반각 공백(1폭) 조합으로 정확한 패딩
    const fullWidthSpaces = Math.floor(diff / 2);
    const halfWidthSpaces = diff % 2;

    return str + fullWidthSpace.repeat(fullWidthSpaces) + ' '.repeat(halfWidthSpaces);
  },

  /**
   * 메시지 푸터 생성
   * @param {Array} ranking - 전체 랭킹 데이터
   * @param {boolean} isFirstMessage - 첫 번째 메시지 여부
   * @param {boolean} fromCache - 캐시에서 조회 여부
   * @returns {Promise<string>} 푸터 문자열
   */
  async getFooter(ranking, isFirstMessage, fromCache = false) {
    if (!isFirstMessage) {
      return ''; // 첫 번째 메시지가 아니면 푸터 없음
    }

    const totalParticipants = ranking.length;
    const topScore = ranking.length > 0 ? ranking[0].totalScore : 0;

    // 시즌 시작일 조회
    let periodText = '전체 기간';
    try {
      const seasonStartDate = await googleSheetsService.getSettingValue('점수_집계_시작일');
      if (seasonStartDate) {
        const startDate = new Date(seasonStartDate);
        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');
        periodText = `${year}년 ${month}월 ${day}일 이후`;
      }
    } catch (error) {
      console.error('시즌 시작일 조회 실패:', error);
    }

    let footer = `\n📅 집계 기간: ${periodText}\n👥 총 참여자: ${totalParticipants}명\n🏆 최고 점수: ${topScore}점`;

    // 캐시 사용 시 업데이트 지연 안내 추가
    if (fromCache) {
      footer += '\n\n⏰ 점수 반영은 최대 5분 지연될 수 있습니다.';
    }

    return footer;
  }
};