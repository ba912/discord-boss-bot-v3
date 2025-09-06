const { google } = require('googleapis');
const { SHEET_CONFIG } = require('../config/constants');
const path = require('path');

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.auth = null;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
  }

  // Google Sheets API 초기화 (서비스 계정 방식)
  async initialize() {
    if (!this.spreadsheetId) {
      throw new Error('Google Sheets 스프레드시트 ID가 설정되지 않았습니다.');
    }

    try {
      // 서비스 계정 JSON 파일 경로 설정
      const serviceAccountPath = this.serviceAccountPath || path.join(__dirname, '..', '..', 'service-account-key.json');
      
      // JWT 인증 클라이언트 생성
      this.auth = new google.auth.GoogleAuth({
        keyFile: serviceAccountPath,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file',
        ],
      });

      // Sheets API 클라이언트 생성
      this.sheets = google.sheets({ 
        version: 'v4', 
        auth: this.auth,
      });
      
      console.log('✅ Google Sheets API 초기화 완료 (서비스 계정)');
      return true;
    } catch (error) {
      console.error('❌ Google Sheets API 초기화 실패:', error);
      throw error;
    }
  }

  // 연결 상태 테스트
  async testConnection() {
    if (!this.sheets) {
      await this.initialize();
    }

    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      return {
        success: true,
        title: response.data.properties.title,
        sheetCount: response.data.sheets.length,
        url: response.data.spreadsheetUrl,
      };
    } catch (error) {
      console.error('❌ Google Sheets 연결 테스트 실패:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // 시트 생성 (중복 시트 건너뛰기, 실시간 진행 표시)
  async createSheets(progressCallback = null) {
    if (!this.sheets) {
      await this.initialize();
    }

    const sheetNames = Object.values(SHEET_CONFIG.SHEET_NAMES);
    const headers = this.getSheetHeaders();
    const results = [];

    try {
      // 기존 시트 목록 가져오기
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      const existingSheets = response.data.sheets.map(sheet => sheet.properties.title);

      for (const sheetName of sheetNames) {
        // 진행상황 콜백 호출
        if (progressCallback) {
          await progressCallback(`🔄 ${sheetName} 시트 확인 중...`);
        }

        if (existingSheets.includes(sheetName)) {
          // 이미 존재하는 시트
          const message = `ℹ️ ${sheetName} 시트 이미 존재`;
          results.push(message);
          if (progressCallback) {
            await progressCallback(message);
          }
          continue;
        }

        // 시트 생성
        if (progressCallback) {
          await progressCallback(`⚙️ ${sheetName} 시트 생성 중...`);
        }
        
        await this.createSheet(sheetName);
        
        // 헤더 설정
        await this.setHeaders(sheetName, headers[sheetName]);
        
        const message = `✅ ${sheetName} 시트 생성 완료`;
        results.push(message);
        if (progressCallback) {
          await progressCallback(message);
        }

        // API 레이트 리밋 방지 딜레이
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      return results;
    } catch (error) {
      console.error('❌ 시트 생성 실패:', error);
      throw error;
    }
  }

  // 기존 initializeSheets 메서드는 호환성을 위해 유지
  async initializeSheets() {
    return await this.createSheets();
  }

  // 개별 시트 생성
  async createSheet(sheetName) {
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          }],
        },
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`ℹ️ 시트 이미 존재: ${sheetName}`);
      } else {
        throw error;
      }
    }
  }

  // 시트별 헤더 정의
  getSheetHeaders() {
    return {
      [SHEET_CONFIG.SHEET_NAMES.BOSS_INFO]: [
        '보스명', '점수', '스케줄타입', '스케줄정보', '생성일시'
      ],
      [SHEET_CONFIG.SHEET_NAMES.MEMBERS]: [
        '사용자ID', '닉네임', '총점수', '권한', '가입일시'
      ],
      [SHEET_CONFIG.SHEET_NAMES.PARTICIPATION]: [
        '참여일시', '사용자ID', '보스명', '획득점수'
      ],
      [SHEET_CONFIG.SHEET_NAMES.LOOT_HISTORY]: [
        '루팅일시', '보스명', '아이템명', '획득자', '분배일시'
      ],
    };
  }

  // 헤더 설정 (기존 헤더가 있으면 유지)
  async setHeaders(sheetName, headers) {
    try {
      // 기존 헤더 확인
      const existingData = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:Z1`,
      });

      const existingHeaders = existingData.data.values?.[0];
      
      // 기존 헤더가 있고 비어있지 않으면 유지
      if (existingHeaders && existingHeaders.length > 0 && existingHeaders[0] !== '') {
        console.log(`ℹ️ [${sheetName}] 기존 헤더 유지:`, existingHeaders);
        return;
      }

      // 기존 헤더가 없거나 비어있으면 새로 설정
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:${String.fromCharCode(64 + headers.length)}1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });
      
      console.log(`✅ [${sheetName}] 헤더 설정 완료:`, headers);
    } catch (error) {
      console.error(`❌ 헤더 설정 실패: ${sheetName}`, error);
      throw error;
    }
  }

  // 데이터 추가 (CREATE)
  async appendData(sheetName, data) {
    if (!this.sheets) {
      await this.initialize();
    }

    try {
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:A`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [data],
        },
      });

      return {
        success: true,
        updatedRows: response.data.updates.updatedRows,
        updatedRange: response.data.updates.updatedRange,
      };
    } catch (error) {
      console.error(`❌ 데이터 추가 실패: ${sheetName}`, error);
      throw error;
    }
  }

  // 데이터 조회 (READ)
  async getData(sheetName, range = 'A:Z') {
    if (!this.sheets) {
      await this.initialize();
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!${range}`,
      });

      const rows = response.data.values || [];
      const headers = rows.length > 0 ? rows[0] : [];
      const data = rows.slice(1); // 헤더 제외

      return {
        success: true,
        headers,
        data,
        totalRows: data.length,
      };
    } catch (error) {
      console.error(`❌ 데이터 조회 실패: ${sheetName}`, error);
      throw error;
    }
  }

  // 데이터 업데이트 (UPDATE)
  async updateData(sheetName, range, data) {
    if (!this.sheets) {
      await this.initialize();
    }

    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!${range}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: data,
        },
      });

      return { success: true };
    } catch (error) {
      console.error(`❌ 데이터 업데이트 실패: ${sheetName}`, error);
      throw error;
    }
  }

  // 길드원 추가 (특화 함수)
  async addMember(userId, nickname, role = 'member') {
    const memberData = [
      userId,
      nickname,
      0, // 초기 점수
      role,
      new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    ];

    return await this.appendData(SHEET_CONFIG.SHEET_NAMES.MEMBERS, memberData);
  }

  // 길드원 조회 (특화 함수)
  async getMembers() {
    return await this.getData(SHEET_CONFIG.SHEET_NAMES.MEMBERS);
  }

  // 특정 길드원 조회
  async getMemberByUserId(userId) {
    const result = await this.getMembers();
    if (!result.success) return null;

    const memberRow = result.data.find(row => row[0] === userId);
    if (!memberRow) return null;

    const headers = result.headers;
    const member = {};
    headers.forEach((header, index) => {
      member[header] = memberRow[index] || '';
    });

    return member;
  }

  // 닉네임 자동 동기화
  async syncMemberNickname(userId, currentNickname) {
    try {
      const result = await this.getMembers();
      if (!result.success) return false;

      // 해당 사용자 찾기
      const memberIndex = result.data.findIndex(row => row[0] === userId);
      if (memberIndex === -1) return false;

      const storedNickname = result.data[memberIndex][1];
      
      // 닉네임이 다르면 업데이트
      if (storedNickname !== currentNickname) {
        const rowNumber = memberIndex + 2; // 헤더 다음 행부터 시작
        await this.updateData(
          SHEET_CONFIG.SHEET_NAMES.MEMBERS, 
          `B${rowNumber}`, 
          [[currentNickname]]
        );
        
        console.log(`✅ 닉네임 동기화: ${storedNickname} → ${currentNickname} (${userId})`);
        return true;
      }
      
      return false; // 변경 없음
    } catch (error) {
      console.error('❌ 닉네임 동기화 실패:', error);
      return false;
    }
  }

  // 전체 길드원 닉네임 일괄 동기화 (시트 기준)
  async syncAllNicknames(guild) {
    try {
      const result = await this.getMembers();
      if (!result.success) return { updated: 0, errors: 0, notFound: 0 };

      let updated = 0;
      let errors = 0;
      let notFound = 0;

      for (let i = 0; i < result.data.length; i++) {
        const userId = result.data[i][0];
        const storedNickname = result.data[i][1];
        
        try {
          // 시트에 있는 사용자만 개별적으로 Discord에서 조회
          const guildMember = await guild.members.fetch(userId).catch(() => null);
          
          if (!guildMember) {
            console.log(`⚠️ Discord에서 사용자를 찾을 수 없음: ${userId}`);
            notFound++;
            continue;
          }

          const currentNickname = guildMember.displayName;
          
          // 닉네임이 다르면 업데이트
          if (storedNickname !== currentNickname) {
            const rowNumber = i + 2; // 헤더 다음 행부터
            await this.updateData(
              SHEET_CONFIG.SHEET_NAMES.MEMBERS, 
              `B${rowNumber}`, 
              [[currentNickname]]
            );
            
            console.log(`✅ 닉네임 동기화: ${storedNickname} → ${currentNickname} (${userId})`);
            updated++;
            
            // API 레이트 리밋 방지를 위한 딜레이
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`❌ 닉네임 동기화 실패 (${userId}):`, error);
          errors++;
        }
      }

      return { updated, errors, notFound, total: result.data.length };
    } catch (error) {
      console.error('❌ 전체 닉네임 동기화 실패:', error);
      return { updated: 0, errors: 1, notFound: 0, total: 0 };
    }
  }
}

// 싱글톤 패턴으로 내보내기
module.exports = new GoogleSheetsService();