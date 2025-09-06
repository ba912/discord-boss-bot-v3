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

  // 시트 구조 동기화 (개발용 - 기존 시트 업데이트)
  async syncSheetStructure(progressCallback = null) {
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
        if (progressCallback) {
          await progressCallback(`🔄 ${sheetName} 시트 동기화 중...`);
        }

        if (!existingSheets.includes(sheetName)) {
          // 시트가 없으면 새로 생성
          await this.createSheet(sheetName);
          await this.setHeaders(sheetName, headers[sheetName]);
          const message = `✅ ${sheetName} 시트 새로 생성됨`;
          results.push(message);
          if (progressCallback) {
            await progressCallback(message);
          }
        } else {
          // 기존 시트 헤더 및 구조 업데이트
          const updateResult = await this.updateSheetStructure(sheetName, headers[sheetName]);
          results.push(`🔄 ${sheetName} ${updateResult}`);
          if (progressCallback) {
            await progressCallback(`🔄 ${sheetName} ${updateResult}`);
          }
        }

        // API 레이트 리밋 방지 딜레이
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      return results;
    } catch (error) {
      console.error('❌ 시트 구조 동기화 실패:', error);
      throw error;
    }
  }

  // 개별 시트 구조 업데이트
  async updateSheetStructure(sheetName, expectedHeaders) {
    try {
      // 현재 헤더 확인
      const existingData = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:Z1`,
      });

      const currentHeaders = existingData.data.values?.[0] || [];
      
      // 헤더 비교 및 업데이트
      let headerUpdated = false;
      if (JSON.stringify(currentHeaders) !== JSON.stringify(expectedHeaders)) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A1:${String.fromCharCode(64 + expectedHeaders.length)}1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [expectedHeaders],
          },
        });
        headerUpdated = true;
      }

      // 시트별 드롭다운 설정
      if (sheetName === SHEET_CONFIG.SHEET_NAMES.MEMBERS) {
        await this.setPermissionDropdown(sheetName);
        return headerUpdated ? '헤더 업데이트 + 드롭다운 재설정' : '드롭다운 재설정';
      } else if (sheetName === SHEET_CONFIG.SHEET_NAMES.BOSS_INFO) {
        await this.setBossInfoDropdowns(sheetName);
        return headerUpdated ? '헤더 업데이트 + 드롭다운 설정' : '드롭다운 설정';
      }

      return headerUpdated ? '헤더 업데이트됨' : '최신 상태 유지';
    } catch (error) {
      console.error(`❌ ${sheetName} 구조 업데이트 실패:`, error);
      return '업데이트 실패';
    }
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
        '보스명', '점수', '리젠타입', '리젠설정', '스케줄노출여부', '등록자', '생성일시', '수정일시'
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
        
        // 길드원정보 시트의 경우 권한 컬럼 드롭다운 설정
        if (sheetName === SHEET_CONFIG.SHEET_NAMES.MEMBERS) {
          await this.setPermissionDropdown(sheetName);
        }
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
      
      // 시트별 드롭다운 설정
      if (sheetName === SHEET_CONFIG.SHEET_NAMES.MEMBERS) {
        await this.setPermissionDropdown(sheetName);
      } else if (sheetName === SHEET_CONFIG.SHEET_NAMES.BOSS_INFO) {
        await this.setBossInfoDropdowns(sheetName);
      }
    } catch (error) {
      console.error(`❌ 헤더 설정 실패: ${sheetName}`, error);
      throw error;
    }
  }

  // 권한 컬럼에 드롭다운 설정
  async setPermissionDropdown(sheetName) {
    try {
      // 시트의 sheetId 가져오기
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      const sheet = response.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) {
        throw new Error(`시트를 찾을 수 없음: ${sheetName}`);
      }
      
      const sheetId = sheet.properties.sheetId;
      
      // 권한 컬럼 (D열, 0-based index로 3)에 데이터 유효성 검사 설정
      const validPermissions = ['관리자', '운영진', '일반길드원'];
      
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [{
            setDataValidation: {
              range: {
                sheetId: sheetId,
                startRowIndex: 1, // 헤더 제외하고 2번째 행부터
                endRowIndex: 1000, // 충분히 큰 수로 설정 (1000행까지)
                startColumnIndex: 3, // D열 (권한 컬럼)
                endColumnIndex: 4, // D열만
              },
              rule: {
                condition: {
                  type: 'ONE_OF_LIST',
                  values: validPermissions.map(permission => ({ userEnteredValue: permission })),
                },
                inputMessage: '권한을 선택해주세요',
                strict: true, // 목록에 없는 값 입력 차단
                showCustomUi: true, // 드롭다운 UI 표시
              },
            },
          }],
        },
      });
      
      console.log(`✅ [${sheetName}] 권한 드롭다운 설정 완료`);
    } catch (error) {
      console.error(`❌ 권한 드롭다운 설정 실패: ${sheetName}`, error);
      // 드롭다운 설정 실패는 치명적이지 않으므로 에러를 throw하지 않음
    }
  }

  // 보스정보 시트에 드롭다운 설정
  async setBossInfoDropdowns(sheetName) {
    try {
      // 시트의 sheetId 가져오기
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      const sheet = response.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) {
        throw new Error(`시트를 찾을 수 없음: ${sheetName}`);
      }
      
      const sheetId = sheet.properties.sheetId;
      
      // 리젠타입 드롭다운 (C열, index 2)
      const regenTypes = ['시간마다', '특정요일'];
      
      // 스케줄노출여부 드롭다운 (E열, index 4)
      const visibilityOptions = ['노출', '비노출'];
      
      const requests = [
        // 리젠타입 드롭다운 설정
        {
          setDataValidation: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1, // 헤더 제외
              endRowIndex: 1000,
              startColumnIndex: 2, // C열 (리젠타입)
              endColumnIndex: 3,
            },
            rule: {
              condition: {
                type: 'ONE_OF_LIST',
                values: regenTypes.map(type => ({ userEnteredValue: type })),
              },
              inputMessage: '리젠타입을 선택해주세요 (시간마다 또는 특정요일)',
              strict: true,
              showCustomUi: true,
            },
          },
        },
        // 스케줄노출여부 드롭다운 설정
        {
          setDataValidation: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1, // 헤더 제외
              endRowIndex: 1000,
              startColumnIndex: 4, // E열 (스케줄노출여부)
              endColumnIndex: 5,
            },
            rule: {
              condition: {
                type: 'ONE_OF_LIST',
                values: visibilityOptions.map(option => ({ userEnteredValue: option })),
              },
              inputMessage: '스케줄노출여부를 선택해주세요 (노출 또는 비노출)',
              strict: true,
              showCustomUi: true,
            },
          },
        },
      ];
      
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests },
      });
      
      console.log(`✅ [${sheetName}] 보스정보 드롭다운 설정 완료 (리젠타입, 스케줄노출여부)`);
    } catch (error) {
      console.error(`❌ 보스정보 드롭다운 설정 실패: ${sheetName}`, error);
      // 드롭다운 설정 실패는 치명적이지 않으므로 에러를 throw하지 않음
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
  async addMember(userId, nickname, role = '일반길드원') {
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

  // ====== 보스 관련 메서드들 ======
  
  // 보스 추가
  async addBoss(bossData) {
    return await this.appendData(SHEET_CONFIG.SHEET_NAMES.BOSS_INFO, bossData);
  }

  // 보스 목록 조회
  async getBossList() {
    try {
      const result = await this.getData(SHEET_CONFIG.SHEET_NAMES.BOSS_INFO);
      if (!result.success || result.data.length === 0) return [];

      return result.data.map(row => ({
        bossName: row[0] || '',
        score: parseInt(row[1]) || 0,
        regenType: row[2] || '',
        regenSettings: row[3] || '',
        scheduleVisible: row[4] || '',
        registrar: row[5] || '',
        createdAt: row[6] || '',
        updatedAt: row[7] || ''
      }));
    } catch (error) {
      console.error('❌ 보스 목록 조회 실패:', error);
      throw error;
    }
  }

  // 보스명으로 개별 조회
  async getBossByName(bossName) {
    try {
      const result = await this.getData(SHEET_CONFIG.SHEET_NAMES.BOSS_INFO);
      if (!result.success) return null;

      const bossRow = result.data.find(row => row[0] === bossName);
      if (!bossRow) return null;

      return {
        bossName: bossRow[0] || '',
        score: parseInt(bossRow[1]) || 0,
        regenType: bossRow[2] || '',
        regenSettings: bossRow[3] || '',
        scheduleVisible: bossRow[4] || '',
        registrar: bossRow[5] || '',
        createdAt: bossRow[6] || '',
        updatedAt: bossRow[7] || ''
      };
    } catch (error) {
      console.error('❌ 보스 조회 실패:', error);
      throw error;
    }
  }

  // 보스 삭제
  async deleteBoss(bossName) {
    try {
      const result = await this.getData(SHEET_CONFIG.SHEET_NAMES.BOSS_INFO);
      if (!result.success) throw new Error('시트 데이터 조회 실패');

      const bossIndex = result.data.findIndex(row => row[0] === bossName);
      if (bossIndex === -1) throw new Error('존재하지 않는 보스');

      // 시트에서 행 삭제 (헤더 다음 행부터 시작하므로 +2)
      const rowNumber = bossIndex + 2;
      
      // 행 삭제를 위한 batch update 요청
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      const sheet = response.data.sheets.find(s => s.properties.title === SHEET_CONFIG.SHEET_NAMES.BOSS_INFO);
      if (!sheet) throw new Error('보스정보 시트를 찾을 수 없음');
      
      const sheetId = sheet.properties.sheetId;
      
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowNumber - 1, // 0-based index
                endIndex: rowNumber
              }
            }
          }]
        }
      });

      return { success: true };
    } catch (error) {
      console.error('❌ 보스 삭제 실패:', error);
      throw error;
    }
  }

  // 보스 정보 업데이트
  async updateBoss(bossName, updateData) {
    try {
      const result = await this.getData(SHEET_CONFIG.SHEET_NAMES.BOSS_INFO);
      if (!result.success) throw new Error('시트 데이터 조회 실패');

      const bossIndex = result.data.findIndex(row => row[0] === bossName);
      if (bossIndex === -1) throw new Error('존재하지 않는 보스');

      const rowNumber = bossIndex + 2; // 헤더 다음 행부터
      
      // 현재 데이터와 업데이트 데이터 병합
      const currentData = result.data[bossIndex];
      const updatedRow = [
        updateData.bossName || currentData[0],
        updateData.score || currentData[1],
        updateData.regenType || currentData[2],
        updateData.regenSettings || currentData[3],
        updateData.scheduleVisible || currentData[4],
        updateData.registrar || currentData[5],
        currentData[6], // 생성일시 유지
        new Date().toISOString().replace('T', ' ').substring(0, 19) // 수정일시 업데이트
      ];

      await this.updateData(
        SHEET_CONFIG.SHEET_NAMES.BOSS_INFO,
        `A${rowNumber}:H${rowNumber}`,
        [updatedRow]
      );

      return { success: true };
    } catch (error) {
      console.error('❌ 보스 업데이트 실패:', error);
      throw error;
    }
  }
}

// 싱글톤 패턴으로 내보내기
module.exports = new GoogleSheetsService();