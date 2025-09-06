const googleSheetsService = require('./googleSheetsService');
const { SHEET_CONFIG } = require('../config/constants');

/**
 * 캐릭터 중심 서비스 클래스
 * 부주 시스템을 지원하는 캐릭터 관리 기능을 제공합니다
 */
class CharacterService {
  
  // ========================================
  // 캐릭터 조회 기능
  // ========================================

  /**
   * Discord 사용자 ID로 캐릭터 정보 조회
   * @param {string} userId - Discord 사용자 ID
   * @returns {Promise<Object|null>} 캐릭터 정보
   */
  async getCharacterByUserId(userId) {
    try {
      // 1. 계정정보에서 사용자의 캐릭터명 조회
      const accountsResult = await googleSheetsService.getData(SHEET_CONFIG.SHEET_NAMES.ACCOUNTS);
      if (!accountsResult.success) {
        return null;
      }

      const userAccount = accountsResult.data.find(row => row[0] === userId);
      if (!userAccount) {
        return null;
      }

      // 새로운 구조: [사용자ID, 닉네임, 태그, 캐릭터ID, 캐릭터명(수식), 권한, 계정유형, 가입일시]
      const [, discordNickname, discordTag, characterId, characterName, permission, accountType, joinedAt] = userAccount;

      // 2. 캐릭터정보에서 캐릭터 세부정보 조회 (캐릭터ID로 조회)
      const charactersResult = await googleSheetsService.getData(SHEET_CONFIG.SHEET_NAMES.CHARACTERS);
      if (!charactersResult.success) {
        return null;
      }

      // 새로운 구조: [ID, 캐릭터명, 총점수, 생성일시, 수정일시]
      const character = charactersResult.data.find(row => row[0] == characterId); // ID로 조회
      if (!character) {
        return null;
      }

      const [, actualCharacterName, totalScore, createdAt, updatedAt] = character;

      return {
        characterId, // 캐릭터 ID 추가
        characterName: actualCharacterName, // 캐릭터정보에서 가져온 실제 이름 
        totalScore: parseInt(totalScore) || 0,
        userPermission: permission,
        accountType,
        joinedAt,
        createdAt,
        updatedAt,
        discordNickname,
        discordTag
      };

    } catch (error) {
      console.error('❌ 사용자 캐릭터 조회 실패:', error);
      return null;
    }
  }

  /**
   * 캐릭터 상세 정보 조회 (모든 계정 포함) - ID 또는 이름으로 조회 가능
   * @param {string} characterIdOrName - 캐릭터 ID 또는 캐릭터명
   * @returns {Promise<Object|null>} 캐릭터 상세 정보
   */
  async getCharacterDetails(characterIdOrName) {
    try {
      // 캐릭터 기본 정보 조회
      const charactersResult = await googleSheetsService.getData(SHEET_CONFIG.SHEET_NAMES.CHARACTERS);
      if (!charactersResult.success) {
        return null;
      }

      // 새로운 구조: [ID, 캐릭터명, 총점수, 생성일시, 수정일시]
      // ID가 숫자인지 확인하여 ID로 조회할지 이름으로 조회할지 결정
      const isNumericId = !isNaN(parseInt(characterIdOrName));
      
      const character = charactersResult.data.find(row => {
        if (isNumericId) {
          // ID로 조회 (ID는 숫자로 비교)
          return parseInt(row[0]) === parseInt(characterIdOrName);
        } else {
          // 캐릭터명으로 조회
          return row[1] === characterIdOrName;
        }
      });
      
      if (!character) {
        return null;
      }

      const [characterId, characterName, totalScore, createdAt, updatedAt] = character;

      // 연결된 모든 계정 조회
      const accountsResult = await googleSheetsService.getData(SHEET_CONFIG.SHEET_NAMES.ACCOUNTS);
      if (!accountsResult.success) {
        return { characterId, characterName, totalScore: parseInt(totalScore) || 0, accounts: [] };
      }

      // 새로운 구조: [사용자ID, 닉네임, 태그, 캐릭터ID, 캐릭터명(수식), 권한, 계정유형, 가입일시]
      const accounts = accountsResult.data
        .filter(row => row[3] == characterId)  // 캐릭터ID로 필터링
        .map(row => ({
          userId: row[0],
          discordNickname: row[1],
          discordTag: row[2],
          permission: row[5],  // F열
          accountType: row[6], // G열
          joinedAt: row[7]     // H열
        }));

      return {
        characterId,
        characterName,
        totalScore: parseInt(totalScore) || 0,
        createdAt,
        updatedAt,
        accounts
      };

    } catch (error) {
      console.error('❌ 캐릭터 상세정보 조회 실패:', error);
      return null;
    }
  }

  /**
   * 캐릭터명으로 캐릭터 조회
   * @param {string} characterName - 캐릭터명
   * @returns {Promise<Object|null>} 캐릭터 정보
   */
  async getCharacterByName(characterName) {
    try {
      const charactersResult = await googleSheetsService.getData(SHEET_CONFIG.SHEET_NAMES.CHARACTERS);
      if (!charactersResult.success) {
        return null;
      }

      const character = charactersResult.data.find(row => row[1] === characterName);
      if (!character) {
        return null;
      }

      const characterId = character[0];
      return await this.getCharacterDetails(characterId);

    } catch (error) {
      console.error('❌ 캐릭터명으로 조회 실패:', error);
      return null;
    }
  }

  // ========================================
  // 캐릭터 관리 기능
  // ========================================

  /**
   * 캐릭터명 변경 (모든 연결된 계정에 동기화)
   * @param {string} characterId - 캐릭터 ID
   * @param {string} newCharacterName - 새로운 캐릭터명
   * @returns {Promise<{success: boolean, oldName?: string}>}
   */
  async updateCharacterName(characterId, newCharacterName) {
    try {
      // 1. 현재 캐릭터 정보 조회
      const currentCharacter = await this.getCharacterDetails(characterId);
      
      if (!currentCharacter) {
        throw new Error('존재하지 않는 캐릭터입니다');
      }

      const oldName = currentCharacter.characterName;

      // 2. 캐릭터 정보 시트에서 캐릭터명 업데이트
      const charactersResult = await googleSheetsService.getData(SHEET_CONFIG.SHEET_NAMES.CHARACTERS);
      if (!charactersResult.success) {
        throw new Error('캐릭터정보 시트 조회 실패');
      }

      const characterIndex = charactersResult.data.findIndex(row => row[0] === characterId);
      if (characterIndex === -1) {
        throw new Error('캐릭터를 찾을 수 없습니다');
      }

      // 수정일시 업데이트
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const updatedRow = [
        characterId,
        newCharacterName,
        currentCharacter.totalScore,
        currentCharacter.createdAt,
        now // 수정일시
      ];

      await googleSheetsService.updateData(
        SHEET_CONFIG.SHEET_NAMES.CHARACTERS,
        `A${characterIndex + 2}:E${characterIndex + 2}`,
        [updatedRow]
      );

      return {
        success: true,
        oldName,
        newName: newCharacterName,
        affectedAccounts: currentCharacter.accounts.length
      };

    } catch (error) {
      console.error('❌ 캐릭터명 변경 실패:', error);
      throw error;
    }
  }

  /**
   * Discord 사용자의 캐릭터명 변경 (사용자 관점)
   * @param {string} userId - Discord 사용자 ID
   * @param {string} newCharacterName - 새로운 캐릭터명
   * @returns {Promise<Object>} 변경 결과
   */
  async changeCharacterNameByUserId(userId, newCharacterName) {
    try {
      // 사용자의 캐릭터 정보 조회
      const userCharacter = await this.getCharacterByUserId(userId);
      if (!userCharacter) {
        throw new Error('시트에 등록되지 않은 사용자입니다');
      }

      // 캐릭터명 변경
      const result = await this.updateCharacterName(userCharacter.characterId, newCharacterName);

      return {
        ...result,
        userAccountType: userCharacter.accountType,
        userPermission: userCharacter.userPermission
      };

    } catch (error) {
      console.error('❌ 사용자 캐릭터명 변경 실패:', error);
      throw error;
    }
  }

  // ========================================
  // 점수 관리 기능
  // ========================================

  /**
   * 캐릭터 총 점수 조회 (실시간 계산)
   * @param {string} characterId - 캐릭터 ID
   * @returns {Promise<number>} 총 점수
   */
  async calculateCharacterTotalScore(characterId) {
    try {
      // 참여이력에서 해당 캐릭터의 모든 점수 합산
      const participationsResult = await googleSheetsService.getData(SHEET_CONFIG.SHEET_NAMES.PARTICIPATIONS);
      
      if (!participationsResult.success) {
        return 0;
      }

      const totalScore = participationsResult.data
        .filter(row => row[1] === characterId) // 캐릭터ID로 필터링
        .reduce((sum, row) => {
          const score = parseInt(row[4]) || 0; // 획득점수
          return sum + score;
        }, 0);

      return totalScore;

    } catch (error) {
      console.error('❌ 캐릭터 총점수 계산 실패:', error);
      return 0;
    }
  }

  /**
   * 캐릭터 총 점수 업데이트 (캐릭터정보 시트)
   * @param {string} characterId - 캐릭터 ID
   * @returns {Promise<{success: boolean, totalScore: number}>}
   */
  async updateCharacterTotalScore(characterId) {
    try {
      // 실제 점수 계산
      const calculatedScore = await this.calculateCharacterTotalScore(characterId);

      // 캐릭터정보 시트에서 해당 행 업데이트
      const charactersResult = await googleSheetsService.getData(SHEET_CONFIG.SHEET_NAMES.CHARACTERS);
      if (!charactersResult.success) {
        throw new Error('캐릭터정보 시트 조회 실패');
      }

      const characterIndex = charactersResult.data.findIndex(row => row[0] === characterId);
      if (characterIndex === -1) {
        throw new Error('캐릭터를 찾을 수 없습니다');
      }

      const currentData = charactersResult.data[characterIndex];
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      const updatedRow = [
        currentData[0], // 캐릭터ID
        currentData[1], // 캐릭터명
        calculatedScore, // 업데이트된 총점수
        currentData[3], // 생성일시 유지
        now // 수정일시 업데이트
      ];

      await googleSheetsService.updateData(
        SHEET_CONFIG.SHEET_NAMES.CHARACTERS,
        `A${characterIndex + 2}:E${characterIndex + 2}`,
        [updatedRow]
      );

      return {
        success: true,
        totalScore: calculatedScore
      };

    } catch (error) {
      console.error('❌ 캐릭터 총점수 업데이트 실패:', error);
      throw error;
    }
  }

  // ========================================
  // 참여 이력 관리
  // ========================================

  /**
   * 보스 참여 기록 추가
   * @param {string} characterId - 캐릭터 ID
   * @param {string} actualParticipantId - 실제 참여한 Discord 사용자 ID
   * @param {string} bossName - 보스명
   * @param {number} earnedScore - 획득점수
   * @returns {Promise<{success: boolean}>}
   */
  async addParticipation(characterId, actualParticipantId, bossName, earnedScore) {
    try {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      // 참여이력에 새 레코드 추가
      const participationRow = [
        now, // 참여일시
        characterId, // 캐릭터ID
        actualParticipantId, // 실제참여자ID
        bossName, // 보스명
        earnedScore // 획득점수
      ];

      // 시트에 데이터 추가
      await googleSheetsService.addData(SHEET_CONFIG.SHEET_NAMES.PARTICIPATIONS, [participationRow]);

      // 캐릭터 총점수 업데이트
      await this.updateCharacterTotalScore(characterId);

      return { success: true };

    } catch (error) {
      console.error('❌ 참여 기록 추가 실패:', error);
      throw error;
    }
  }

  /**
   * 중복 참여 체크 (캐릭터 기준)
   * @param {string} characterId - 캐릭터 ID
   * @param {string} bossName - 보스명
   * @param {string} dateString - 날짜 (YYYY-MM-DD 형식)
   * @returns {Promise<boolean>} 중복 여부 (true: 이미 참여함)
   */
  async checkDuplicateParticipation(characterId, bossName, dateString = null) {
    try {
      // 오늘 날짜 기준으로 체크 (dateString이 없으면)
      const targetDate = dateString || new Date().toISOString().substring(0, 10);

      const participationsResult = await googleSheetsService.getData(SHEET_CONFIG.SHEET_NAMES.PARTICIPATIONS);
      
      if (!participationsResult.success) {
        return false; // 데이터 조회 실패시 중복 없음으로 간주
      }

      // 해당 캐릭터가 오늘 해당 보스에 참여했는지 확인
      const duplicate = participationsResult.data.some(row => {
        const participationDate = row[0].substring(0, 10); // 참여일시에서 날짜 부분만
        const participationCharacterId = row[1];
        const participationBossName = row[3];

        return (
          participationCharacterId === characterId &&
          participationBossName === bossName &&
          participationDate === targetDate
        );
      });

      return duplicate;

    } catch (error) {
      console.error('❌ 중복 참여 체크 실패:', error);
      return false; // 오류시 중복 없음으로 간주
    }
  }

  /**
   * 캐릭터의 참여 이력 조회
   * @param {string} characterId - 캐릭터 ID
   * @param {number} limit - 조회할 최대 개수 (기본값: 50)
   * @returns {Promise<Array>} 참여 이력 배열
   */
  async getCharacterParticipationHistory(characterId, limit = 50) {
    try {
      const participationsResult = await googleSheetsService.getData(SHEET_CONFIG.SHEET_NAMES.PARTICIPATIONS);
      
      if (!participationsResult.success) {
        return [];
      }

      // 해당 캐릭터의 참여 이력 필터링 및 최신순 정렬
      const history = participationsResult.data
        .filter(row => row[1] === characterId)
        .map(row => ({
          timestamp: row[0],
          actualParticipantId: row[2],
          bossName: row[3],
          earnedScore: parseInt(row[4]) || 0
        }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

      return history;

    } catch (error) {
      console.error('❌ 참여 이력 조회 실패:', error);
      return [];
    }
  }

  // ========================================
  // 부주 관리 기능
  // ========================================

  /**
   * 캐릭터에 새로운 계정 추가 (부주 추가)
   * @param {string} characterId - 캐릭터 ID
   * @param {string} userId - 추가할 Discord 사용자 ID
   * @param {string} permission - 권한
   * @returns {Promise<{success: boolean, accountType: string}>}
   */
  async addAccountToCharacter(characterId, userId, permission) {
    try {
      // 1. 해당 사용자가 이미 다른 캐릭터에 등록되어 있는지 확인
      const existingAccount = await this.getCharacterByUserId(userId);
      if (existingAccount) {
        throw new Error(`사용자가 이미 캐릭터 "${existingAccount.characterName}"에 등록되어 있습니다`);
      }

      // 2. 캐릭터 존재 확인
      const characterDetails = await this.getCharacterDetails(characterId);
      if (!characterDetails) {
        throw new Error('존재하지 않는 캐릭터입니다');
      }

      // 3. 계정 유형 결정 (부주 번호 자동 할당)
      const existingAccountTypes = characterDetails.accounts.map(acc => acc.accountType);
      let accountType = '본주';
      
      if (existingAccountTypes.includes('본주')) {
        // 부주 번호 찾기
        let subAccountNum = 1;
        while (existingAccountTypes.includes(`부주${subAccountNum}`)) {
          subAccountNum++;
        }
        accountType = `부주${subAccountNum}`;
      }

      // 4. 계정정보 시트에 새 계정 추가
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const newAccountRow = [
        userId,
        characterId,
        permission,
        accountType,
        now
      ];

      await googleSheetsService.addData(SHEET_CONFIG.SHEET_NAMES.ACCOUNTS, [newAccountRow]);

      return {
        success: true,
        accountType,
        characterName: characterDetails.characterName
      };

    } catch (error) {
      console.error('❌ 계정 추가 실패:', error);
      throw error;
    }
  }

  /**
   * 캐릭터에서 계정 제거
   * @param {string} userId - 제거할 Discord 사용자 ID
   * @returns {Promise<{success: boolean}>}
   */
  async removeAccountFromCharacter(userId) {
    try {
      // 1. 사용자 계정 정보 조회
      const userCharacter = await this.getCharacterByUserId(userId);
      if (!userCharacter) {
        throw new Error('등록되지 않은 사용자입니다');
      }

      // 2. 본주인 경우 제거 불가 (부주들이 있을 때)
      if (userCharacter.accountType === '본주') {
        const characterDetails = await this.getCharacterDetails(userCharacter.characterId);
        const subAccounts = characterDetails.accounts.filter(acc => acc.accountType !== '본주');
        
        if (subAccounts.length > 0) {
          throw new Error('부주가 있는 상태에서는 본주를 제거할 수 없습니다. 먼저 부주들을 이전하거나 제거해주세요.');
        }
      }

      // 3. 계정정보 시트에서 해당 행 제거
      const accountsResult = await googleSheetsService.getData(SHEET_CONFIG.SHEET_NAMES.ACCOUNTS);
      if (!accountsResult.success) {
        throw new Error('계정정보 시트 조회 실패');
      }

      const accountIndex = accountsResult.data.findIndex(row => row[0] === userId);
      if (accountIndex === -1) {
        throw new Error('계정을 찾을 수 없습니다');
      }

      // TODO: 실제 행 삭제 로직은 googleSheetsService에 deleteRow 메서드 추가 필요
      // 현재는 빈 데이터로 업데이트
      const emptyRow = ['', '', '', '', '', '', ''];
      await googleSheetsService.updateData(
        SHEET_CONFIG.SHEET_NAMES.ACCOUNTS,
        `A${accountIndex + 2}:G${accountIndex + 2}`,
        [emptyRow]
      );

      return { success: true };

    } catch (error) {
      console.error('❌ 계정 제거 실패:', error);
      throw error;
    }
  }

  // ========================================
  // 새 계정/캐릭터 생성 기능
  // ========================================

  /**
   * 새로운 캐릭터 생성
   * @param {string} characterName - 캐릭터명
   * @param {string} userId - Discord 사용자 ID
   * @param {string} discordNickname - Discord 닉네임
   * @param {string} discordTag - Discord 태그
   * @param {string} permission - 권한 (기본값: 일반길드원)
   * @returns {Promise<{success: boolean, characterName: string}>}
   */
  async createNewCharacter(characterName, userId, discordNickname, discordTag, permission = '일반길드원') {
    try {
      // 1. 캐릭터명 중복 확인
      const existingCharacter = await this.getCharacterByName(characterName);
      if (existingCharacter) {
        throw new Error(`이미 존재하는 캐릭터명입니다: ${characterName}`);
      }

      // 2. 사용자가 이미 다른 캐릭터에 등록되어 있는지 확인
      const existingAccount = await this.getCharacterByUserId(userId);
      if (existingAccount) {
        throw new Error(`사용자가 이미 캐릭터 "${existingAccount.characterName}"에 등록되어 있습니다`);
      }

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      // 3. Auto-increment ID 생성
      const characterID = await googleSheetsService.getNextCharacterID();

      // 4. 캐릭터 정보 생성 (ID 포함)
      const characterRow = [
        characterID,     // Auto-increment ID
        characterName,   // 캐릭터명
        0,              // 초기 점수
        now,            // 생성일시
        now             // 수정일시
      ];

      await googleSheetsService.appendData(SHEET_CONFIG.SHEET_NAMES.CHARACTERS, characterRow);

      // 5. 계정 정보 생성 (본주로 설정, 수식 포함)
      const characterNameFormula = googleSheetsService.generateCharacterNameFormula(characterID);
      const accountRow = [
        userId,
        discordNickname,
        discordTag,
        characterID,                  // 캐릭터ID (숫자)
        characterNameFormula,         // 캐릭터명 (수식)
        permission,
        '본주',
        now
      ];

      await googleSheetsService.appendData(SHEET_CONFIG.SHEET_NAMES.ACCOUNTS, accountRow);

      return {
        success: true,
        characterName,
        accountType: '본주'
      };

    } catch (error) {
      console.error('❌ 새 캐릭터 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 기존 캐릭터에 사용자 추가 (부주 추가)
   * @param {string} characterName - 캐릭터명
   * @param {string} userId - Discord 사용자 ID
   * @param {string} discordNickname - Discord 닉네임
   * @param {string} discordTag - Discord 태그
   * @param {string} permission - 권한
   * @returns {Promise<{success: boolean, accountType: string}>}
   */
  async addUserToExistingCharacter(characterName, userId, discordNickname, discordTag, permission) {
    try {
      // 1. 캐릭터 존재 확인
      const existingCharacter = await this.getCharacterDetails(characterName);
      if (!existingCharacter) {
        throw new Error(`존재하지 않는 캐릭터입니다: ${characterName}`);
      }

      // 2. 사용자가 이미 다른 캐릭터에 등록되어 있는지 확인
      const existingAccount = await this.getCharacterByUserId(userId);
      if (existingAccount) {
        throw new Error(`사용자가 이미 캐릭터 "${existingAccount.characterName}"에 등록되어 있습니다`);
      }

      // 3. 계정 유형 결정 (부주 번호 자동 할당)
      const existingAccountTypes = existingCharacter.accounts.map(acc => acc.accountType);
      let accountType = '본주';
      
      if (existingAccountTypes.includes('본주')) {
        // 부주 번호 찾기
        let subAccountNum = 1;
        while (existingAccountTypes.includes(`부주${subAccountNum}`)) {
          subAccountNum++;
        }
        accountType = `부주${subAccountNum}`;
      }

      // 4. 기존 캐릭터의 ID 찾기
      const charactersResult = await googleSheetsService.getData(SHEET_CONFIG.SHEET_NAMES.CHARACTERS);
      if (!charactersResult.success) {
        throw new Error('캐릭터 데이터 조회 실패');
      }

      const characterRow = charactersResult.data.find(row => row[1] === characterName); // B열이 캐릭터명
      if (!characterRow) {
        throw new Error(`캐릭터 데이터에서 "${characterName}"을 찾을 수 없습니다`);
      }

      const characterID = characterRow[0]; // A열이 ID

      // 5. 계정정보 시트에 새 계정 추가 (수식 포함)
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const characterNameFormula = googleSheetsService.generateCharacterNameFormula(characterID);
      const newAccountRow = [
        userId,
        discordNickname,
        discordTag,
        characterID,                  // 캐릭터ID (숫자)
        characterNameFormula,         // 캐릭터명 (수식)
        permission,
        accountType,
        now
      ];

      await googleSheetsService.appendData(SHEET_CONFIG.SHEET_NAMES.ACCOUNTS, newAccountRow);

      return {
        success: true,
        characterName,
        accountType
      };

    } catch (error) {
      console.error('❌ 기존 캐릭터에 사용자 추가 실패:', error);
      throw error;
    }
  }

  // ========================================
  // 유틸리티 기능
  // ========================================

  /**
   * 모든 캐릭터 목록 조회
   * @returns {Promise<Array>} 캐릭터 목록
   */
  async getAllCharacters() {
    try {
      const charactersResult = await googleSheetsService.getData(SHEET_CONFIG.SHEET_NAMES.CHARACTERS);
      
      if (!charactersResult.success) {
        return [];
      }

      return charactersResult.data.map(row => ({
        characterName: row[0],
        totalScore: parseInt(row[1]) || 0,
        createdAt: row[2],
        updatedAt: row[3]
      }));

    } catch (error) {
      console.error('❌ 전체 캐릭터 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * 캐릭터명 유효성 검사
   * @param {string} characterName - 캐릭터명
   * @returns {Promise<{valid: boolean, error?: string}>}
   */
  async validateCharacterName(characterName) {
    if (!characterName || characterName.trim().length === 0) {
      return { valid: false, error: '캐릭터명을 입력해주세요' };
    }

    const trimmedName = characterName.trim();

    if (trimmedName.length < 2) {
      return { valid: false, error: '캐릭터명은 최소 2자 이상이어야 합니다' };
    }

    if (trimmedName.length > 20) {
      return { valid: false, error: '캐릭터명은 최대 20자까지 가능합니다' };
    }

    // 특수문자 제한 (기본적인 한글, 영문, 숫자, 공백만 허용)
    const allowedPattern = /^[가-힣a-zA-Z0-9\s]+$/;
    if (!allowedPattern.test(trimmedName)) {
      return { valid: false, error: '캐릭터명에는 한글, 영문, 숫자, 공백만 사용할 수 있습니다' };
    }

    return { valid: true };
  }

  /**
   * 캐릭터 정보를 Discord 임베드 형식으로 포맷
   * @param {Object} character - 캐릭터 정보
   * @param {Object} userAccount - 사용자 계정 정보 (선택)
   * @returns {Object} Discord 임베드 객체
   */
  formatCharacterInfoForDiscord(character, userAccount = null) {
    const color = userAccount?.userPermission === '관리자' ? 0xff0000 : 
                  userAccount?.userPermission === '운영진' ? 0xff6b6b : 0x4ecdc4;

    const fields = [
      {
        name: '👤 캐릭터명',
        value: character.characterName,
        inline: true,
      },
      {
        name: '🏆 총 점수',
        value: `${character.totalScore}점`,
        inline: true,
      }
    ];

    if (userAccount) {
      fields.push({
        name: '🔰 계정 유형',
        value: userAccount.accountType,
        inline: true,
      });

      const permissionIcon = userAccount.userPermission === '관리자' ? '👑' : 
                           userAccount.userPermission === '운영진' ? '⭐' : '👤';
      
      fields.push({
        name: `${permissionIcon} 권한`,
        value: userAccount.userPermission,
        inline: true,
      });
    }

    if (character.accounts && character.accounts.length > 1) {
      const accountList = character.accounts
        .map(acc => `${acc.accountType}: <@${acc.userId}>`)
        .join('\n');
      
      fields.push({
        name: '👥 연결된 계정들',
        value: accountList,
        inline: false,
      });
    }

    return {
      color: color,
      title: `📋 ${character.characterName} 정보`,
      fields: fields,
      timestamp: new Date().toISOString(),
    };
  }
}

// 싱글톤 패턴으로 내보내기
module.exports = new CharacterService();
