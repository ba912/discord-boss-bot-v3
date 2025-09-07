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

    // 백업 시트 제외, 필요한 기본 시트들만 생성
    const sheetNames = SHEET_CONFIG.PRIMARY_SHEETS;
    console.log('📋 생성할 시트 목록:', sheetNames);
    const headers = this.getSheetHeaders();
    const results = [];

    try {
      // 기존 시트 목록 가져오기
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      const existingSheets = response.data.sheets.map(sheet => sheet.properties.title);
      console.log('📊 기존 시트 목록:', existingSheets);

      for (const sheetName of sheetNames) {
        console.log(`🔍 시트 확인 중: ${sheetName}`);
        
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
        
        // 설정 시트인 경우 기본 데이터 추가
        if (sheetName === SHEET_CONFIG.SHEET_NAMES.SETTINGS) {
          console.log(`🔧 설정 시트 초기화 시작: ${sheetName}`);
          await this.initializeSettingsSheet();
          console.log(`✅ 설정 시트 초기화 완료: ${sheetName}`);
        }
        
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

    try {
      // 1. 현재 구조 감지
      if (progressCallback) {
        await progressCallback('🔍 현재 시트 구조를 분석하는 중...');
      }
      
      const currentStructure = await this.detectCurrentStructure();
      
      if (currentStructure === 'legacy') {
        // 2. 마이그레이션 필요
        if (progressCallback) {
          await progressCallback('📋 레거시 구조 발견 - 마이그레이션을 시작합니다...');
        }
        
        return await this.migrateToNewStructure(progressCallback);
      } else {
        // 3. 일반 동기화
        if (progressCallback) {
          await progressCallback('🔄 최신 구조 감지 - 일반 동기화를 수행합니다...');
        }
        
        return await this.performNormalSync(progressCallback);
      }
      
    } catch (error) {
      console.error('❌ 시트 구조 동기화 실패:', error);
      throw error;
    }
  }

  // 일반 동기화 (새 구조 기반)
  async performNormalSync(progressCallback = null) {
    // 백업 시트 제외, 필요한 기본 시트들만 동기화
    const sheetNames = SHEET_CONFIG.PRIMARY_SHEETS;
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
          
          // 설정 시트인 경우 기본 데이터 추가
          if (sheetName === SHEET_CONFIG.SHEET_NAMES.SETTINGS) {
            await this.initializeSettingsSheet();
          }
          
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
      console.error('❌ 일반 동기화 실패:', error);
      throw error;
    }
  }

  // 개별 시트 구조 업데이트
  async updateSheetStructure(sheetName, expectedHeaders) {
    try {
      console.log(`🔍 ${sheetName} 시트 구조 업데이트 시작...`);
      
      // 현재 헤더 확인
      const existingData = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:Z1`,
      });

      const currentHeaders = existingData.data.values?.[0] || [];
      console.log(`📋 현재 헤더 (${sheetName}):`, currentHeaders);
      console.log(`📋 예상 헤더 (${sheetName}):`, expectedHeaders);
      
      // 헤더 비교 및 업데이트
      let headerUpdated = false;
      if (JSON.stringify(currentHeaders) !== JSON.stringify(expectedHeaders)) {
        console.log(`🔧 ${sheetName} 헤더 업데이트 중...`);
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A1:${String.fromCharCode(64 + expectedHeaders.length)}1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [expectedHeaders],
          },
        });
        headerUpdated = true;
        console.log(`✅ ${sheetName} 헤더 업데이트 완료`);
      } else {
        console.log(`ℹ️ ${sheetName} 헤더는 이미 최신 상태입니다`);
      }

      // 레거시 시트 특별 처리
      if (sheetName === SHEET_CONFIG.SHEET_NAMES.MEMBERS) {
        await this.setPermissionDropdown(sheetName);
        return headerUpdated ? '헤더 업데이트 + 드롭다운 재설정' : '드롭다운 재설정';
      }
      
      // 참여이력 시트는 드롭다운이 필요 없으므로 제외
      if (sheetName === SHEET_CONFIG.SHEET_NAMES.PARTICIPATIONS) {
        console.log(`ℹ️ ${sheetName} 시트는 드롭다운 적용 제외`);
        return headerUpdated ? '헤더 업데이트됨' : '최신 상태 유지';
      }
      
      // 드롭다운이 필요한 시트만 적용 (보스정보, 계정정보)
      const dropdownConfig = SHEET_CONFIG.DROPDOWN_COLUMNS[sheetName];
      if (dropdownConfig && Object.keys(dropdownConfig).length > 0) {
        console.log(`🔧 ${sheetName} 드롭다운 적용 중...`);
        await this.applyDropdownValidation(sheetName);
        return headerUpdated ? '헤더 업데이트 + 드롭다운 적용' : '드롭다운 적용';
      }

      return headerUpdated ? '헤더 업데이트됨' : '최신 상태 유지';
    } catch (error) {
      console.error(`❌ ${sheetName} 구조 업데이트 실패:`, error);
      return '업데이트 실패: ' + error.message;
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
      // 기존 시트들 (유지)
      [SHEET_CONFIG.SHEET_NAMES.BOSS_INFO]: [
        '보스명', '점수', '리젠타입', '리젠설정', '스케줄노출여부', '컷타임'
      ],
      [SHEET_CONFIG.SHEET_NAMES.LOOT_HISTORY]: [
        '루팅일시', '보스명', '아이템명', '획득자', '분배일시'
      ],
      
      // 새로운 캐릭터 중심 시트들 (auto-increment ID 방식)
      [SHEET_CONFIG.SHEET_NAMES.CHARACTERS]: [
        'ID', '캐릭터명', '총점수', '생성일시', '수정일시'
      ],
      [SHEET_CONFIG.SHEET_NAMES.ACCOUNTS]: [
        '사용자ID', '디스코드닉네임', '디스코드태그', '캐릭터ID', '캐릭터명', '권한', '계정유형', '가입일시'
      ],
      [SHEET_CONFIG.SHEET_NAMES.PARTICIPATIONS]: [
        '참여일시', '캐릭터ID', '캐릭터명', '실제참여자ID', '보스명', '획득점수', '컷타임'
      ],
      [SHEET_CONFIG.SHEET_NAMES.SETTINGS]: [
        '설정명', '설정값', '설명', '수정일시'
      ],
      
      // 레거시 시트들 (호환성 유지)
      [SHEET_CONFIG.SHEET_NAMES.MEMBERS]: [
        '사용자ID', '닉네임', '총점수', '권한', '가입일시'
      ],
      [SHEET_CONFIG.SHEET_NAMES.PARTICIPATION_LEGACY_ALIAS]: [
        '참여일시', '사용자ID', '보스명', '획득점수'
      ],
      [SHEET_CONFIG.SHEET_NAMES.MEMBERS_LEGACY]: [
        '사용자ID', '닉네임', '총점수', '권한', '가입일시'
      ],
      [SHEET_CONFIG.SHEET_NAMES.PARTICIPATION_LEGACY]: [
        '참여일시', '사용자ID', '보스명', '획득점수'
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
      
      // 새로운 구조 시트들에 범용 드롭다운 적용
      await this.applyDropdownValidation(sheetName);
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

  // 범용 드롭다운 유효성 검사 적용 (새로운 시트들용)
  async applyDropdownValidation(sheetName) {
    try {
      const dropdownColumns = SHEET_CONFIG.DROPDOWN_COLUMNS[sheetName];
      if (!dropdownColumns) {
        return; // 드롭다운이 설정되지 않은 시트
      }

      // 시트 ID 가져오기
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      const sheet = response.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) {
        console.log(`⚠️ 시트를 찾을 수 없습니다: ${sheetName}`);
        return;
      }

      const sheetId = sheet.properties.sheetId;
      const requests = [];

      // 각 컬럼에 드롭다운 적용
      for (const [columnIndex, optionKey] of Object.entries(dropdownColumns)) {
        const options = SHEET_CONFIG.DROPDOWN_OPTIONS[optionKey];
        if (!options) {
          console.log(`⚠️ 드롭다운 옵션을 찾을 수 없습니다: ${optionKey}`);
          continue;
        }

        let validationRequest;

        // 동적 참조인지 확인
        if (typeof options === 'string' && options.startsWith('범위참조:')) {
          // 동적 참조는 Google Sheets API 제약으로 인해 일단 비활성화
          // 운영진이 수동으로 Google Sheets에서 설정하도록 안내
          console.log(`⚠️ [${sheetName}] 동적 참조 드롭다운은 수동 설정 필요 (컬럼 ${columnIndex})`);
          console.log(`   Google Sheets에서 해당 컬럼 선택 → 데이터 → 데이터 확인 → 목록(범위) → '보탐봇-캐릭터정보'!A2:A1000 입력`);
          continue; // 이 컬럼은 건너뛰고 다음 컬럼으로
        } else if (Array.isArray(options)) {
          // 고정 옵션 드롭다운
          validationRequest = {
            setDataValidation: {
              range: {
                sheetId: sheetId,
                startRowIndex: 1, // 헤더 제외 (0부터 시작이므로 1)
                endRowIndex: 1000, // 충분히 큰 범위
                startColumnIndex: parseInt(columnIndex),
                endColumnIndex: parseInt(columnIndex) + 1,
              },
              rule: {
                condition: {
                  type: 'ONE_OF_LIST',
                  values: options.map(option => ({ userEnteredValue: option }))
                },
                inputMessage: `다음 옵션 중 선택: ${options.join(', ')}`,
                strict: true,
                showCustomUi: true
              }
            }
          };
        } else {
          console.log(`⚠️ 올바르지 않은 옵션 형식: ${optionKey}`);
          continue;
        }

        requests.push(validationRequest);
      }

      // 일괄 업데이트 실행
      if (requests.length > 0) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: requests
          }
        });

        const appliedColumns = Object.entries(dropdownColumns)
          .map(([col, opt]) => {
            const options = SHEET_CONFIG.DROPDOWN_OPTIONS[opt];
            const type = (typeof options === 'string' && options.startsWith('범위참조:')) ? '동적참조' : '고정옵션';
            return `${String.fromCharCode(65 + parseInt(col))}열(${opt}:${type})`;
          })
          .join(', ');

        console.log(`✅ [${sheetName}] 드롭다운 적용 완료: ${appliedColumns}`);
      }

      // 캐릭터정보 시트에 ID 중복 확인 조건부서식 적용
      if (sheetName === SHEET_CONFIG.SHEET_NAMES.CHARACTERS) {
        await this.applyIDDuplicationFormatting(sheetName, sheetId);
      }

    } catch (error) {
      console.error(`❌ [${sheetName}] 드롭다운 적용 실패:`, error);
      // 드롭다운 실패해도 시트 생성은 계속 진행
    }
  }

  // ID 중복 확인 조건부서식 적용
  async applyIDDuplicationFormatting(sheetName, sheetId) {
    try {
      const duplicateCheckRequest = {
        addConditionalFormatRule: {
          rule: {
            ranges: [{
              sheetId: sheetId,
              startRowIndex: 1, // 헤더 제외
              endRowIndex: 1000,
              startColumnIndex: 0, // A열 (ID)
              endColumnIndex: 1
            }],
            booleanRule: {
              condition: {
                type: 'CUSTOM_FORMULA',
                values: [{ userEnteredValue: '=COUNTIF($A$2:$A$1000,A2)>1' }]
              },
              format: {
                backgroundColor: {
                  red: 1.0,
                  green: 0.4,
                  blue: 0.4,
                  alpha: 0.8
                },
                textFormat: {
                  foregroundColor: {
                    red: 1.0,
                    green: 1.0,
                    blue: 1.0
                  },
                  bold: true
                }
              }
            }
          },
          index: 0
        }
      };

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [duplicateCheckRequest]
        }
      });

      console.log(`✅ [${sheetName}] ID 중복 확인 조건부서식 적용 완료`);
      
    } catch (error) {
      console.error(`❌ [${sheetName}] 조건부서식 적용 실패:`, error);
      // 조건부서식 실패해도 계속 진행
    }
  }

  // Auto-increment ID 생성 (캐릭터정보 시트용)
  async getNextCharacterID() {
    try {
      const charactersData = await this.getData(SHEET_CONFIG.SHEET_NAMES.CHARACTERS);
      if (!charactersData.success || charactersData.data.length === 0) {
        console.log('ℹ️ 캐릭터 데이터가 없음. 첫 번째 ID: 1');
        return 1; // 첫 번째 캐릭터
      }

      // 기존 ID들 추출 및 검증
      const rawIDs = charactersData.data.map((row, index) => {
        const rawValue = row[0];
        const parsedID = parseInt(rawValue);
        
        // 빈 값, null, undefined, 빈 문자열, NaN, 0 이하 값 필터링
        if (rawValue === null || rawValue === undefined || rawValue === '' || 
            isNaN(parsedID) || parsedID <= 0) {
          console.warn(`⚠️ 캐릭터정보 시트 ${index + 2}행에 잘못된 ID: "${rawValue}"`);
          return null;
        }
        
        return parsedID;
      }).filter(id => id !== null);
      
      if (rawIDs.length === 0) {
        console.log('ℹ️ 유효한 ID가 없음. 첫 번째 ID: 1');
        return 1;
      }

      // 중복 ID 검사 및 경고
      const uniqueIDs = [...new Set(rawIDs)];
      if (uniqueIDs.length !== rawIDs.length) {
        const duplicates = rawIDs.filter((id, index) => rawIDs.indexOf(id) !== index);
        console.warn(`🚨 중복된 ID 발견: ${[...new Set(duplicates)].join(', ')}`);
        console.warn('📋 운영진은 Google Sheets에서 조건부서식(빨간색)을 확인하세요!');
      }

      const maxID = Math.max(...uniqueIDs);
      const nextID = maxID + 1;
      
      console.log(`ℹ️ 현재 최대 ID: ${maxID}, 다음 ID: ${nextID}`);
      console.log(`ℹ️ 총 ${rawIDs.length}개 캐릭터, 유효한 ID ${uniqueIDs.length}개`);
      
      return nextID;
      
    } catch (error) {
      console.error('❌ Auto-increment ID 생성 실패:', error);
      console.log('🔧 기본값 ID: 1 사용');
      return 1; // 실패 시 기본값
    }
  }

  // 캐릭터명 수식 생성 (INDEX-MATCH 방식)
  generateCharacterNameFormula(characterID) {
    return `=IFERROR(INDEX('보탐봇-캐릭터정보'!B:B,MATCH(${characterID},'보탐봇-캐릭터정보'!A:A,0)),"ID${characterID} 찾을 수 없음")`;
  }

  // 계정정보 시트 구조 수정 (캐릭터명 → 캐릭터ID + 수식)
  async fixAccountDataStructure() {
    try {
      console.log('🔧 계정정보 시트 구조 수정 시작...');
      
      // 1. 캐릭터정보와 계정정보 데이터 조회
      const [charactersResult, accountsResult] = await Promise.all([
        this.getData(SHEET_CONFIG.SHEET_NAMES.CHARACTERS),
        this.getData(SHEET_CONFIG.SHEET_NAMES.ACCOUNTS)
      ]);

      if (!charactersResult.success || !accountsResult.success) {
        throw new Error('캐릭터정보 또는 계정정보 조회 실패');
      }

      if (accountsResult.data.length === 0) {
        console.log('ℹ️ 계정 데이터가 없습니다.');
        return { success: true, fixed: 0 };
      }

      // 2. 캐릭터명 → ID 매핑 생성
      const characterNameToIdMap = {};
      charactersResult.data.forEach(row => {
        if (row.length >= 2) {
          const id = parseInt(row[0]);
          const name = row[1];
          if (!isNaN(id) && name) {
            characterNameToIdMap[name] = id;
          }
        }
      });

      console.log('📋 캐릭터명-ID 매핑:', characterNameToIdMap);

      // 3. 계정정보 데이터 분석 및 변환
      const currentAccountData = accountsResult.data;
      const fixedAccountData = [];

      for (let i = 0; i < currentAccountData.length; i++) {
        const row = currentAccountData[i];
        console.log(`🔍 계정 ${i+1}행 분석:`, row);

        if (row.length < 4) {
          console.warn(`⚠️ 계정 ${i+1}행은 데이터가 부족합니다. 건너뜁니다.`);
          continue;
        }

        // 현재 구조 확인: [사용자ID, 닉네임, 태그, 캐릭터명, 권한, 유형, 일시]
        // 새 구조: [사용자ID, 닉네임, 태그, 캐릭터ID, 캐릭터명(수식), 권한, 유형, 일시]
        
        const userId = row[0];
        const discordNickname = row[1];
        const discordTag = row[2];
        const characterNameOrId = row[3];
        const permission = row[4] || '일반길드원';
        const accountType = row[5] || '본주';
        const joinedAt = row[6] || new Date().toISOString().replace('T', ' ').substring(0, 19);

        // 이미 새 구조인지 확인 (캐릭터ID가 숫자인 경우)
        if (!isNaN(parseInt(characterNameOrId))) {
          console.log(`✅ 계정 ${i+1}행은 이미 새 구조입니다.`);
          fixedAccountData.push(row);
          continue;
        }

        // 이전 구조 (캐릭터명이 문자열)인 경우
        const characterName = characterNameOrId;
        const characterId = characterNameToIdMap[characterName];

        if (!characterId) {
          console.error(`❌ 캐릭터 "${characterName}"의 ID를 찾을 수 없습니다. 건너뜁니다.`);
          continue;
        }

        console.log(`⚡ 계정 ${i+1}행 변환: ${characterName} → ID${characterId} + 수식`);

        // 새 구조로 변환
        const characterNameFormula = this.generateCharacterNameFormula(characterId);
        const fixedRow = [
          userId,
          discordNickname, 
          discordTag,
          characterId,              // 캐릭터ID (숫자)
          characterNameFormula,     // 캐릭터명 (수식)
          permission,
          accountType,
          joinedAt
        ];

        fixedAccountData.push(fixedRow);
      }

      if (fixedAccountData.length === 0) {
        console.log('ℹ️ 수정할 계정 데이터가 없습니다.');
        return { success: true, fixed: 0 };
      }

      // 4. 계정정보 시트 데이터 전체 교체
      console.log(`🔄 ${fixedAccountData.length}개 계정을 새 구조로 업데이트...`);
      
      // 기존 데이터 전체 삭제 (헤더 제외)
      const clearRange = `${SHEET_CONFIG.SHEET_NAMES.ACCOUNTS}!A2:Z`;
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: clearRange
      });

      // 새 데이터 삽입
      if (fixedAccountData.length > 0) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${SHEET_CONFIG.SHEET_NAMES.ACCOUNTS}!A2`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: fixedAccountData
          }
        });
      }

      console.log(`✅ 계정정보 시트 구조 수정 완료: ${fixedAccountData.length}개 계정`);
      return { success: true, fixed: fixedAccountData.length };
      
    } catch (error) {
      console.error('❌ 계정정보 시트 구조 수정 실패:', error);
      return { success: false, error: error.message };
    }
  }

  // 잘못된 캐릭터 데이터 수정 (헤더와 데이터 구조 불일치 해결)
  async fixCharacterDataStructure() {
    try {
      console.log('🔧 캐릭터정보 시트 구조 수정 시작...');
      
      // 1. 현재 캐릭터 데이터 조회
      const charactersResult = await this.getData(SHEET_CONFIG.SHEET_NAMES.CHARACTERS);
      if (!charactersResult.success || charactersResult.data.length === 0) {
        console.log('ℹ️ 캐릭터 데이터가 없습니다.');
        return { success: true, fixed: 0 };
      }

      console.log('📋 현재 캐릭터 데이터 구조 확인...');
      const currentData = charactersResult.data;
      const fixedData = [];
      let nextID = 1;

      // 2. 각 행 데이터 분석 및 수정
      for (let i = 0; i < currentData.length; i++) {
        const row = currentData[i];
        console.log(`🔍 ${i+1}행 분석:`, row);

        // 데이터 구조 정확한 분석
        console.log(`🔍 ${i+1}행 상세 분석:`, {
          row,
          types: row.map(cell => typeof cell),
          firstIsNumber: !isNaN(parseInt(row[0])),
          firstIsString: typeof row[0] === 'string' && row[0] !== '',
          secondIsNumber: !isNaN(parseInt(row[1])),
          secondIsString: typeof row[1] === 'string'
        });

        // 이미 새 구조인지 먼저 확인 (ID가 숫자인 경우)
        if (row.length >= 2 && !isNaN(parseInt(row[0])) && parseInt(row[0]) > 0 && typeof row[1] === 'string') {
          // 이미 올바른 구조 (ID가 첫 번째)인 경우
          console.log(`✅ ${i+1}행은 이미 올바른 새 구조입니다: ID=${row[0]}, 캐릭터명=${row[1]}`);
          fixedData.push(row);
          const currentID = parseInt(row[0]);
          if (currentID >= nextID) {
            nextID = currentID + 1;
          }
        }
        // 이전 구조인지 확인 (캐릭터명이 첫 번째이고, 두 번째가 숫자인 경우)
        else if (row.length >= 4 && 
                 typeof row[0] === 'string' && row[0] !== '' && 
                 !isNaN(parseInt(row[1])) && parseInt(row[1]) >= 0 &&
                 typeof row[2] === 'string' && row[2].includes('2025')) {
          
          // 이전 구조 (캐릭터명이 첫 번째)로 확인된 경우
          const characterName = row[0];
          const totalScore = parseInt(row[1]) || 0;
          const createdAt = row[2] || new Date().toISOString().replace('T', ' ').substring(0, 19);
          const updatedAt = row[3] || createdAt;

          console.log(`⚡ ${i+1}행을 이전→새 구조로 변환:`, {
            from: `${characterName}|${row[1]}|${row[2]}|${row[3]}`,
            to: `ID${nextID}|${characterName}|${totalScore}|${createdAt}|${updatedAt}`
          });
          
          // 새 구조로 변환: [ID, 캐릭터명, 총점수, 생성일시, 수정일시]
          fixedData.push([
            nextID,        // ID (새로 할당)
            characterName, // 캐릭터명
            totalScore,    // 총점수
            createdAt,     // 생성일시
            updatedAt      // 수정일시
          ]);
          
          nextID++;
        } else {
          console.warn(`⚠️ ${i+1}행은 알 수 없는 구조입니다. 건너뜁니다:`, row);
        }
      }

      if (fixedData.length === 0) {
        console.log('ℹ️ 수정할 데이터가 없습니다.');
        return { success: true, fixed: 0 };
      }

      // 3. 시트 데이터 전체 교체
      console.log(`🔄 ${fixedData.length}개 행을 올바른 구조로 업데이트...`);
      
      // 기존 데이터 전체 삭제 (헤더 제외)
      const clearRange = `${SHEET_CONFIG.SHEET_NAMES.CHARACTERS}!A2:Z`;
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: clearRange
      });

      // 새 데이터 삽입
      if (fixedData.length > 0) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${SHEET_CONFIG.SHEET_NAMES.CHARACTERS}!A2`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: fixedData
          }
        });
      }

      console.log(`✅ 캐릭터정보 시트 구조 수정 완료: ${fixedData.length}개 행`);
      return { success: true, fixed: fixedData.length };
      
    } catch (error) {
      console.error('❌ 캐릭터정보 시트 구조 수정 실패:', error);
      return { success: false, error: error.message };
    }
  }

  // 특정 컬럼의 드롭다운 제거
  async removeDataValidation(sheetName, columnIndex) {
    try {
      console.log(`🔧 ${sheetName} ${String.fromCharCode(65 + columnIndex)}열 드롭다운 제거 시작...`);

      // 시트 ID 조회
      const sheetsResponse = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      const sheet = sheetsResponse.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) {
        throw new Error(`시트를 찾을 수 없습니다: ${sheetName}`);
      }

      const sheetId = sheet.properties.sheetId;

      // 드롭다운 제거 요청
      const removeValidationRequest = {
        setDataValidation: {
          range: {
            sheetId: sheetId,
            startRowIndex: 1, // 헤더 제외
            endRowIndex: 1000,
            startColumnIndex: columnIndex,
            endColumnIndex: columnIndex + 1
          },
          rule: null // null로 설정하면 드롭다운 제거
        }
      };

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [removeValidationRequest]
        }
      });

      console.log(`✅ ${sheetName} ${String.fromCharCode(65 + columnIndex)}열 드롭다운 제거 완료`);
      return { success: true };

    } catch (error) {
      console.error(`❌ 드롭다운 제거 실패:`, error);
      return { success: false, error: error.message };
    }
  }

  // 계정정보 시트의 캐릭터명 컬럼 드롭다운 제거 및 수식 복구
  async fixAccountCharacterNameColumn() {
    try {
      console.log('🔧 계정정보 시트 캐릭터명 컬럼 수정 시작...');

      const sheetName = SHEET_CONFIG.SHEET_NAMES.ACCOUNTS;
      const characterNameColumnIndex = SHEET_CONFIG.COLUMNS.ACCOUNTS.CHARACTER_NAME; // 4

      // 1. 캐릭터명 컬럼 드롭다운 제거
      console.log(`🗑️ ${String.fromCharCode(65 + characterNameColumnIndex)}열 드롭다운 제거...`);
      const removeResult = await this.removeDataValidation(sheetName, characterNameColumnIndex);
      
      if (!removeResult.success) {
        throw new Error(`드롭다운 제거 실패: ${removeResult.error}`);
      }

      // 2. 현재 계정정보 데이터 조회
      const accountsResult = await this.getData(sheetName);
      if (!accountsResult.success || accountsResult.data.length === 0) {
        console.log('ℹ️ 계정 데이터가 없어서 수식 복구를 건너뜁니다.');
        return { success: true, fixed: 0, removed_dropdown: true };
      }

      // 3. 캐릭터명 컬럼을 수식으로 교체
      const accountData = accountsResult.data;
      const formulaUpdates = [];

      for (let i = 0; i < accountData.length; i++) {
        const row = accountData[i];
        if (row.length >= 5) { // 최소한 캐릭터ID까지 있어야 함
          const characterId = row[3]; // D열 (캐릭터ID)
          
          if (!isNaN(parseInt(characterId)) && parseInt(characterId) > 0) {
            // 수식 생성
            const formula = this.generateCharacterNameFormula(parseInt(characterId));
            const cellAddress = `${String.fromCharCode(65 + characterNameColumnIndex)}${i + 2}`; // E2, E3, ...
            
            formulaUpdates.push({
              range: `${sheetName}!${cellAddress}`,
              values: [[formula]]
            });
            
            console.log(`📝 ${cellAddress}에 수식 적용: 캐릭터ID=${characterId} → ${formula}`);
          }
        }
      }

      // 4. 수식 일괄 적용
      if (formulaUpdates.length > 0) {
        for (const update of formulaUpdates) {
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: update.range,
            valueInputOption: 'USER_ENTERED', // 수식으로 처리
            requestBody: {
              values: update.values
            }
          });
        }
        console.log(`✅ ${formulaUpdates.length}개 셀에 수식 적용 완료`);
      }

      return { 
        success: true, 
        fixed: formulaUpdates.length, 
        removed_dropdown: true 
      };

    } catch (error) {
      console.error('❌ 계정정보 캐릭터명 컬럼 수정 실패:', error);
      return { success: false, error: error.message };
    }
  }

  // 운영진 수동 추가용: 다음 ID 수식 생성
  generateNextIDFormula() {
    return `=IFERROR(MAX(A:A)+1,1)`;
  }

  // 운영진 가이드용: 캐릭터 수동 추가 템플릿
  getManualCharacterTemplate() {
    const nextIDFormula = this.generateNextIDFormula();
    return {
      idFormula: nextIDFormula,
      template: [
        nextIDFormula,        // A열: ID (수식)
        '캐릭터명입력',          // B열: 캐릭터명
        0,                   // C열: 총점수
        '=NOW()',            // D열: 생성일시 (현재시간 수식)
        '=NOW()'             // E열: 수정일시 (현재시간 수식)
      ],
      instructions: [
        '🔧 운영진 수동 추가 가이드:',
        '1. A열(ID): 위 수식을 복사 붙여넣기 → Enter → 자동으로 다음 번호',
        '2. B열(캐릭터명): 실제 캐릭터명 입력',
        '3. C열(총점수): 0으로 시작 (또는 기존 점수)',
        '4. D,E열(일시): =NOW() 수식 복사 → Enter → 현재시간 자동입력',
        '⚠️ 주의: A열에 중복된 숫자가 있으면 빨간색으로 표시됩니다!'
      ]
    };
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
        cutTime: row[5] || null
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
        cutTime: bossRow[5] || null
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

  // 보스 컷타임 업데이트
  async updateBossCutTime(bossName, cutTime) {
    try {
      return await this.updateBoss(bossName, { cutTime });
    } catch (error) {
      console.error('❌ 보스 컷타임 업데이트 실패:', error);
      throw error;
    }
  }

  // 참여 이력 조회
  async getParticipationHistory() {
    try {
      const result = await this.getData(SHEET_CONFIG.SHEET_NAMES.PARTICIPATIONS);
      return result;
    } catch (error) {
      console.error('❌ 참여 이력 조회 실패:', error);
      return { success: false, error: error.message };
    }
  }

  // 참여 기록 추가
  async addParticipationRecord(participationData) {
    try {
      return await this.appendData(SHEET_CONFIG.SHEET_NAMES.PARTICIPATIONS, participationData);
    } catch (error) {
      console.error('❌ 참여 기록 추가 실패:', error);
      throw error;
    }
  }

  // 캐릭터 점수 업데이트
  async updateCharacterScore(characterName, newScore) {
    try {
      const result = await this.getData(SHEET_CONFIG.SHEET_NAMES.CHARACTERS);
      if (!result.success) throw new Error('캐릭터 정보 시트 조회 실패');

      const characterIndex = result.data.findIndex(row => row[0] === characterName);
      if (characterIndex === -1) throw new Error('존재하지 않는 캐릭터');

      const rowNumber = characterIndex + 2; // 헤더 다음 행부터
      const currentData = result.data[characterIndex];
      
      // 점수만 업데이트 (캐릭터명, 새점수, 생성일시, 현재시간)
      const updatedRow = [
        currentData[0], // 캐릭터명
        newScore,       // 새 점수
        currentData[2], // 생성일시 유지
        new Date().toISOString().replace('T', ' ').substring(0, 19) // 수정일시 업데이트
      ];

      await this.updateData(
        SHEET_CONFIG.SHEET_NAMES.CHARACTERS,
        `A${rowNumber}:D${rowNumber}`,
        [updatedRow]
      );

      return { success: true };
    } catch (error) {
      console.error('❌ 캐릭터 점수 업데이트 실패:', error);
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
        updateData.cutTime !== undefined ? updateData.cutTime : currentData[5]
      ];

      await this.updateData(
        SHEET_CONFIG.SHEET_NAMES.BOSS_INFO,
        `A${rowNumber}:F${rowNumber}`,
        [updatedRow]
      );

      return { success: true };
    } catch (error) {
      console.error('❌ 보스 업데이트 실패:', error);
      throw error;
    }
  }

  // ========================================
  // 캐릭터 시스템 마이그레이션 메서드들
  // ========================================

  // 현재 시트 구조 감지
  async detectCurrentStructure() {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      const existingSheets = response.data.sheets.map(sheet => sheet.properties.title);
      
      console.log('🔍 현재 존재하는 시트들:', existingSheets);
      
      // 새로운 구조 시트들이 존재하는지 확인
      const hasCharacterSheet = existingSheets.includes(SHEET_CONFIG.SHEET_NAMES.CHARACTERS);
      const hasAccountSheet = existingSheets.includes(SHEET_CONFIG.SHEET_NAMES.ACCOUNTS);
      const hasParticipationSheet = existingSheets.includes(SHEET_CONFIG.SHEET_NAMES.PARTICIPATIONS);
      
      console.log('📊 새 구조 시트 확인:', {
        characters: hasCharacterSheet,
        accounts: hasAccountSheet,
        participations: hasParticipationSheet
      });
      
      if (hasCharacterSheet && hasAccountSheet && hasParticipationSheet) {
        return 'new'; // 새로운 구조
      } else {
        return 'legacy'; // 레거시 구조
      }
    } catch (error) {
      console.error('❌ 시트 구조 감지 실패:', error);
      return 'legacy'; // 오류시 레거시로 간주
    }
  }

  // 개선된 시트 동기화 (마이그레이션 지원)
  async syncSheetStructure(progressCallback = null) {
    if (!this.sheets) {
      await this.initialize();
    }

    try {
      // 현재 구조 감지
      if (progressCallback) {
        await progressCallback('🔍 시트 구조 감지 중...');
      }
      
      const currentStructure = await this.detectCurrentStructure();
      
      if (currentStructure === 'legacy') {
        // 마이그레이션 필요
        if (progressCallback) {
          await progressCallback('📋 레거시 구조 발견 - 마이그레이션을 시작합니다...');
        }
        
        return await this.migrateToNewStructure(progressCallback);
      } else {
        // 일반 동기화
        if (progressCallback) {
          await progressCallback('🔄 새로운 구조 감지 - 일반 동기화를 수행합니다...');
        }
        
        return await this.performNormalSync(progressCallback);
      }
    } catch (error) {
      console.error('❌ 시트 동기화 실패:', error);
      throw error;
    }
  }

  // 새로운 구조로 마이그레이션
  async migrateToNewStructure(progressCallback = null) {
    const results = [];
    
    try {
      // Step 1: 기존 데이터 백업
      if (progressCallback) {
        await progressCallback('📋 기존 데이터 백업 중...');
      }
      await this.backupLegacyData();
      results.push('✅ 기존 데이터 백업 완료');
      
      // Step 2: 새로운 시트 생성
      if (progressCallback) {
        await progressCallback('🆕 새로운 시트 구조 생성 중...');
      }
      await this.createNewSheetStructure();
      results.push('✅ 새로운 시트 구조 생성 완료');
      
      // Step 3: 데이터 변환 및 이전
      if (progressCallback) {
        await progressCallback('🔄 데이터 마이그레이션 중...');
      }
      
      // 길드원정보 → 캐릭터정보 + 계정정보
      const characterMigration = await this.migrateCharacterData();
      results.push(`✅ 캐릭터 데이터 마이그레이션 완료: ${characterMigration.characters}개 캐릭터, ${characterMigration.accounts}개 계정`);
      
      // 참여이력 변환
      const participationMigration = await this.migrateParticipationData();
      results.push(`✅ 참여이력 마이그레이션 완료: ${participationMigration.records}개 기록`);
      
      // Step 4: 데이터 검증
      if (progressCallback) {
        await progressCallback('✅ 마이그레이션 검증 중...');
      }
      const validation = await this.validateMigration();
      
      if (validation.success) {
        results.push('✅ 마이그레이션 검증 완료 - 모든 데이터 정상');
        
        // Step 5: 레거시 시트를 백업으로 이름 변경 (삭제하지 않음)
        await this.archiveLegacySheets();
        results.push('📦 기존 시트를 백업으로 이동 완료');
      } else {
        throw new Error(`마이그레이션 검증 실패: ${validation.errors.join(', ')}`);
      }
      
    } catch (error) {
      console.error('❌ 마이그레이션 실패:', error);
      // 실패시 롤백은 수동으로 처리하도록 안내
      results.push('❌ 마이그레이션 실패 - 기존 데이터는 백업으로 보존됩니다');
      throw error;
    }
    
    return results;
  }

  // 기존 데이터 백업
  async backupLegacyData() {
    // 실제 존재하는 시트 목록 먼저 확인
    const response = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
    });
    const existingSheets = response.data.sheets.map(sheet => sheet.properties.title);
    console.log('🔍 백업 대상 시트 확인:', existingSheets);
    
    // 백업할 레거시 시트들 실제 존재 확인
    const possibleLegacySheets = [
      '보탐봇-길드원정보',
      '보탐봇-참여이력'
    ];
    
    const legacySheets = possibleLegacySheets.filter(sheetName => 
      existingSheets.includes(sheetName)
    );
    
    console.log('📦 백업할 시트들:', legacySheets);
    
    for (const sheetName of legacySheets) {
      try {
        // 이미 존재 확인했으므로 바로 백업 진행
        // 백업용 이름으로 복사 생성
        const backupName = sheetName + '_백업_' + new Date().toISOString().substring(0, 10);
        
        // 원본 시트의 모든 데이터 조회
        const originalData = await this.getData(sheetName);
        
        if (originalData.success && originalData.data.length > 0) {
          // 백업 시트 생성
          await this.createSheet(backupName);
          
          // 헤더 설정
          const headers = this.getSheetHeaders()[sheetName];
          if (headers) {
            await this.setHeaders(backupName, headers);
            
            // 데이터 복사
            if (originalData.data.length > 0) {
              await this.updateData(
                backupName,
                `A2:${String.fromCharCode(65 + headers.length - 1)}${originalData.data.length + 1}`,
                originalData.data
              );
            }
          }
        }
        
        // API 레이트 리밋 방지 딜레이
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ ${sheetName} 백업 실패:`, error);
        // 백업 실패해도 마이그레이션은 계속 진행
      }
    }
  }

  // 새로운 시트 구조 생성
  async createNewSheetStructure() {
    const newSheets = [
      SHEET_CONFIG.SHEET_NAMES.CHARACTERS,
      SHEET_CONFIG.SHEET_NAMES.ACCOUNTS,
      SHEET_CONFIG.SHEET_NAMES.PARTICIPATIONS
    ];
    
    const headers = this.getSheetHeaders();
    
    for (const sheetName of newSheets) {
      try {
        // 시트 생성
        await this.createSheet(sheetName);
        
        // 헤더 설정
        if (headers[sheetName]) {
          await this.setHeaders(sheetName, headers[sheetName]);
        }
        
        // API 레이트 리밋 방지 딜레이
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        // 이미 존재하는 시트인 경우 무시
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }
  }

  // 캐릭터 데이터 마이그레이션
  async migrateCharacterData() {
    try {
      // 실제 존재하는 시트 목록 확인
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      const existingSheets = response.data.sheets.map(sheet => sheet.properties.title);
      console.log('🔍 캐릭터 마이그레이션: 존재하는 시트들', existingSheets);
      
      // 길드원정보 시트 이름 결정 (실제 존재하는 이름 찾기)
      let membersSheetName = null;
      const possibleNames = [
        '보탐봇-길드원정보',
        'MEMBERS',
        'members',
        'Members'
      ];
      
      for (const name of possibleNames) {
        if (existingSheets.includes(name)) {
          membersSheetName = name;
          break;
        }
      }
      
      if (!membersSheetName) {
        console.log('📝 기존 길드원정보 시트를 찾을 수 없습니다. 빈 마이그레이션으로 진행합니다.');
        return { characters: 0, accounts: 0 };
      }
      
      console.log(`👥 길드원정보 시트 발견: "${membersSheetName}"`);
      
      // 기존 길드원정보 데이터 조회
      const legacyMembersResult = await this.getData(membersSheetName);
      
      if (!legacyMembersResult.success || legacyMembersResult.data.length === 0) {
        console.log('📝 길드원정보 데이터가 없습니다.');
        return { characters: 0, accounts: 0 };
      }
      
      const legacyMembers = legacyMembersResult.data;
      const characterGroups = new Map();
      
      // 닉네임 기준으로 그룹핑
      for (const member of legacyMembers) {
        const [userId, nickname, totalScore, permission, joinedAt] = member;
        
        if (!nickname) continue; // 닉네임이 없는 경우 스킵
        
        if (!characterGroups.has(nickname)) {
          characterGroups.set(nickname, []);
        }
        
        characterGroups.get(nickname).push({
          userId,
          nickname,
          totalScore: parseInt(totalScore) || 0,
          permission: permission || '일반길드원',
          joinedAt: joinedAt || new Date().toISOString().replace('T', ' ').substring(0, 19)
        });
      }
      
      const charactersData = [];
      const accountsData = [];
      
      for (const [nickname, members] of characterGroups) {
        // 캐릭터명을 직접 키로 사용 (캐릭터 ID 불필요!)
        const characterName = nickname;
        
        // 총 점수 계산 (모든 계정의 점수 합산)
        const totalScore = members.reduce((sum, member) => sum + member.totalScore, 0);
        
        // 캐릭터 정보 생성 (캐릭터명이 Primary Key)
        charactersData.push([
          characterName,  // 캐릭터명이 바로 키!
          totalScore,
          new Date().toISOString().replace('T', ' ').substring(0, 19), // 생성일시
          new Date().toISOString().replace('T', ' ').substring(0, 19)  // 수정일시
        ]);
        
        // 권한 순으로 정렬하여 본주/부주 결정
        const sortedMembers = members.sort((a, b) => 
          this.getPermissionPriority(b.permission) - this.getPermissionPriority(a.permission)
        );
        
        // 계정 정보 생성
        sortedMembers.forEach((member, index) => {
          const accountType = index === 0 ? '본주' : `부주${index}`;
          
          accountsData.push([
            member.userId,
            member.nickname || '알수없음',  // 디스코드닉네임
            `@${member.userId}`,           // 디스코드태그 (임시)
            characterName,                 // 캐릭터명 직접 참조!
            member.permission,
            accountType,
            member.joinedAt
          ]);
        });
      }
      
      // 새 시트에 데이터 입력
      if (charactersData.length > 0) {
        await this.updateData(
          SHEET_CONFIG.SHEET_NAMES.CHARACTERS,
          `A2:D${charactersData.length + 1}`,  // 4개 컬럼
          charactersData
        );
      }
      
      if (accountsData.length > 0) {
        await this.updateData(
          SHEET_CONFIG.SHEET_NAMES.ACCOUNTS,
          `A2:G${accountsData.length + 1}`,  // 7개 컬럼
          accountsData
        );
      }
      
      return {
        characters: charactersData.length,
        accounts: accountsData.length
      };
      
    } catch (error) {
      console.error('❌ 캐릭터 데이터 마이그레이션 실패:', error);
      throw error;
    }
  }

  // 참여이력 데이터 마이그레이션
  async migrateParticipationData() {
    try {
      // 실제 존재하는 시트 목록 확인
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      const existingSheets = response.data.sheets.map(sheet => sheet.properties.title);
      console.log('🔍 참여이력 마이그레이션: 존재하는 시트들', existingSheets);
      
      // 참여이력 시트 이름 결정 (실제 존재하는 이름 찾기)
      let participationSheetName = null;
      const possibleNames = [
        '보탐봇-참여이력',
        'PARTICIPATION',
        'participations',
        'Participation'
      ];
      
      for (const name of possibleNames) {
        if (existingSheets.includes(name)) {
          participationSheetName = name;
          break;
        }
      }
      
      if (!participationSheetName) {
        console.log('📝 기존 참여이력 시트를 찾을 수 없습니다. 빈 마이그레이션으로 진행합니다.');
        return { records: 0 };
      }
      
      console.log(`📊 참여이력 시트 발견: "${participationSheetName}"`);
      
      // 기존 참여이력 데이터 조회
      const legacyParticipationResult = await this.getData(participationSheetName);
      
      if (!legacyParticipationResult.success || legacyParticipationResult.data.length === 0) {
        console.log('📝 참여이력 데이터가 없습니다.');
        return { records: 0 };
      }
      
      // 계정정보에서 userId → 캐릭터명 매핑 생성
      const accountsResult = await this.getData(SHEET_CONFIG.SHEET_NAMES.ACCOUNTS);
      if (!accountsResult.success) {
        throw new Error('계정정보 시트를 찾을 수 없습니다');
      }
      
      const userToCharacterMap = new Map();
      for (const account of accountsResult.data) {
        const [userId, , , characterName] = account;  // 캐릭터명을 직접 사용!
        userToCharacterMap.set(userId, characterName);
      }
      
      // 참여이력 데이터 변환
      const participationsData = [];
      
      for (const participation of legacyParticipationResult.data) {
        const [timestamp, userId, bossName, earnedScore] = participation;
        
        const characterName = userToCharacterMap.get(userId);
        
        if (characterName) {
          participationsData.push([
            timestamp,
            characterName,  // 캐릭터명 직접 사용!
            userId, // 실제참여자ID
            bossName,
            earnedScore
          ]);
        }
      }
      
      // 새 시트에 데이터 입력
      if (participationsData.length > 0) {
        await this.updateData(
          SHEET_CONFIG.SHEET_NAMES.PARTICIPATIONS,
          `A2:E${participationsData.length + 1}`,
          participationsData
        );
      }
      
      return { records: participationsData.length };
      
    } catch (error) {
      console.error('❌ 참여이력 데이터 마이그레이션 실패:', error);
      throw error;
    }
  }

  // 캐릭터 ID 생성 (더 이상 사용하지 않음 - 캐릭터명을 직접 키로 사용)
  // generateCharacterId() {
  //   const timestamp = Date.now().toString(36);
  //   const random = Math.random().toString(36).substring(2, 8);
  //   return `CHAR_${timestamp}_${random}`.toUpperCase();
  // }

  // 권한 우선순위 반환
  getPermissionPriority(permission) {
    const priorities = {
      '관리자': 3,
      '운영진': 2,
      '일반길드원': 1
    };
    return priorities[permission] || 0;
  }

  // 마이그레이션 검증
  async validateMigration() {
    const errors = [];
    
    try {
      // 캐릭터 수와 계정 수 확인
      const charactersResult = await this.getData(SHEET_CONFIG.SHEET_NAMES.CHARACTERS);
      const accountsResult = await this.getData(SHEET_CONFIG.SHEET_NAMES.ACCOUNTS);
      const participationsResult = await this.getData(SHEET_CONFIG.SHEET_NAMES.PARTICIPATIONS);
      
      if (!charactersResult.success) {
        errors.push('캐릭터정보 시트 조회 실패');
      }
      
      if (!accountsResult.success) {
        errors.push('계정정보 시트 조회 실패');
      }
      
      if (!participationsResult.success) {
        errors.push('참여이력 시트 조회 실패');
      }
      
      // 기본적인 데이터 일치 검증
      if (charactersResult.success && accountsResult.success) {
        const characterNames = new Set(charactersResult.data.map(row => row[0]));  // 캐릭터명들
        const accountCharacterNames = new Set(accountsResult.data.map(row => row[3]));  // 계정의 캐릭터명들
        
        // 캐릭터명 일치 확인
        for (const charName of characterNames) {
          if (!accountCharacterNames.has(charName)) {
            errors.push(`캐릭터 "${charName}"에 연결된 계정이 없습니다`);
          }
        }
      }
      
      return {
        success: errors.length === 0,
        errors: errors
      };
      
    } catch (error) {
      return {
        success: false,
        errors: [`검증 중 오류 발생: ${error.message}`]
      };
    }
  }

  // 레거시 시트 아카이브
  async archiveLegacySheets() {
    // 실제로는 시트명을 백업용으로 변경하는 것이 안전
    // 삭제하지 않고 보존
    console.log('📦 레거시 시트들을 백업으로 보존합니다');
  }

  // 일반 동기화 (새로운 구조용)
  async performNormalSync(progressCallback = null) {
    const sheetNames = [
      SHEET_CONFIG.SHEET_NAMES.BOSS_INFO,
      SHEET_CONFIG.SHEET_NAMES.CHARACTERS,
      SHEET_CONFIG.SHEET_NAMES.ACCOUNTS,
      SHEET_CONFIG.SHEET_NAMES.PARTICIPATIONS,
      SHEET_CONFIG.SHEET_NAMES.LOOT_HISTORY,
      SHEET_CONFIG.SHEET_NAMES.SETTINGS
    ];
    
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
          
          // 설정 시트인 경우 기본 데이터 추가
          if (sheetName === SHEET_CONFIG.SHEET_NAMES.SETTINGS) {
            await this.initializeSettingsSheet();
          }
          
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

      // 📋 모든 기본 시트 동기화 완료 후, 데이터 구조 문제 통합 해결
      
      // 1. 캐릭터정보 시트 데이터 구조 수정
      if (progressCallback) {
        await progressCallback('🔧 캐릭터정보 데이터 구조 검사 및 수정...');
      }
      try {
        const characterFixResult = await this.fixCharacterDataStructure();
        if (characterFixResult.success && characterFixResult.fixed > 0) {
          results.push(`🔧 캐릭터정보 구조 수정: ${characterFixResult.fixed}개 행`);
        }
      } catch (error) {
        console.warn('⚠️ 캐릭터정보 구조 수정 중 오류 (계속 진행):', error.message);
      }

      // 2. 계정정보 시트 데이터 구조 수정  
      if (progressCallback) {
        await progressCallback('🔧 계정정보 데이터 구조 검사 및 수정...');
      }
      try {
        const accountFixResult = await this.fixAccountDataStructure();
        if (accountFixResult.success && accountFixResult.fixed > 0) {
          results.push(`🔧 계정정보 구조 수정: ${accountFixResult.fixed}개 계정`);
        }
      } catch (error) {
        console.warn('⚠️ 계정정보 구조 수정 중 오류 (계속 진행):', error.message);
      }

      // 3. 계정정보 캐릭터명 컬럼 드롭다운 문제 해결
      if (progressCallback) {
        await progressCallback('🔧 계정정보 캐릭터명 컬럼 드롭다운 검사 및 수정...');
      }
      try {
        const dropdownFixResult = await this.fixAccountCharacterNameColumn();
        if (dropdownFixResult.success) {
          if (dropdownFixResult.removed_dropdown) {
            results.push('🗑️ 계정정보 캐릭터명 드롭다운 제거 완료');
          }
          if (dropdownFixResult.fixed > 0) {
            results.push(`📝 계정정보 캐릭터명 수식 적용: ${dropdownFixResult.fixed}개 셀`);
          }
        }
      } catch (error) {
        console.warn('⚠️ 드롭다운 수정 중 오류 (계속 진행):', error.message);
      }

      if (progressCallback) {
        await progressCallback('✅ 모든 시트 동기화 및 구조 수정 완료');
      }

      return results;
    } catch (error) {
      console.error('❌ 일반 시트 동기화 실패:', error);
      throw error;
    }
  }

  /**
   * 설정 시트 초기화 (기본 설정값들 추가)
   */
  async initializeSettingsSheet() {
    try {
      console.log('🔧 설정 시트 기본 데이터 초기화 중...');
      
      // 기본 설정 데이터
      const defaultSettings = [
        ['참여 제한 시간(분)', '120', '보스 컷 후 참여 버튼을 활성화할 시간 (분 단위)', new Date().toISOString().replace('T', ' ').substring(0, 19)]
      ];

      // 데이터 추가
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${SHEET_CONFIG.SHEET_NAMES.SETTINGS}!A2`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: defaultSettings
        }
      });

      console.log('✅ 설정 시트 기본 데이터 초기화 완료');
      
    } catch (error) {
      console.error('❌ 설정 시트 초기화 실패:', error);
      // 초기화 실패해도 시트 생성은 계속 진행
    }
  }

  /**
   * 설정값 조회
   * @param {string} settingName - 설정명
   * @returns {Promise<string|null>} 설정값
   */
  async getSettingValue(settingName) {
    try {
      const result = await this.getData(SHEET_CONFIG.SHEET_NAMES.SETTINGS);
      
      if (!result.success || !result.data) {
        return null;
      }

      // 설정명으로 찾기
      for (const row of result.data) {
        if (row.length >= 2 && row[0] === settingName) {
          return row[1]; // 설정값 반환
        }
      }

      return null;
    } catch (error) {
      console.error(`❌ 설정값 조회 실패 (${settingName}):`, error);
      return null;
    }
  }

  /**
   * 설정값 업데이트
   * @param {string} settingName - 설정명
   * @param {string} settingValue - 설정값
   * @returns {Promise<boolean>} 성공 여부
   */
  async updateSettingValue(settingName, settingValue) {
    try {
      const result = await this.getData(SHEET_CONFIG.SHEET_NAMES.SETTINGS);
      
      if (!result.success || !result.data) {
        return false;
      }

      // 설정명으로 행 찾기
      for (let i = 0; i < result.data.length; i++) {
        const row = result.data[i];
        if (row.length >= 2 && row[0] === settingName) {
          const rowNumber = i + 2; // 헤더 다음 행부터
          
          // 해당 행의 설정값과 수정일시 업데이트
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `${SHEET_CONFIG.SHEET_NAMES.SETTINGS}!B${rowNumber}:D${rowNumber}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
              values: [[
                settingValue,
                row[2] || '', // 설명 유지
                new Date().toISOString().replace('T', ' ').substring(0, 19) // 수정일시 업데이트
              ]]
            }
          });

          console.log(`✅ 설정 업데이트: ${settingName} = ${settingValue}`);
          return true;
        }
      }

      console.warn(`⚠️ 설정을 찾을 수 없음: ${settingName}`);
      return false;
      
    } catch (error) {
      console.error(`❌ 설정값 업데이트 실패 (${settingName}):`, error);
      return false;
    }
  }
}

// 싱글톤 패턴으로 내보내기
module.exports = new GoogleSheetsService();