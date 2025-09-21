// 점검 모드 상태 관리 서비스 (Google Sheets 기반)

const googleSheetsService = require('./googleSheetsService');

// 설정명 상수
const MAINTENANCE_MODE_SETTING = '점검모드_활성화여부';

/**
 * 점검 모드 활성화
 */
const activateMaintenanceMode = async () => {
  try {
    await googleSheetsService.updateSettingValue(MAINTENANCE_MODE_SETTING, 'true');
    console.log('[점검모드] 활성화됨');
    return true;
  } catch (error) {
    console.error('[점검모드] 활성화 실패:', error);
    throw new Error('점검모드 활성화 실패');
  }
};

/**
 * 점검 모드 비활성화
 */
const deactivateMaintenanceMode = async () => {
  try {
    await googleSheetsService.updateSettingValue(MAINTENANCE_MODE_SETTING, 'false');
    console.log('[점검모드] 비활성화됨');
    return true;
  } catch (error) {
    console.error('[점검모드] 비활성화 실패:', error);
    throw new Error('점검모드 비활성화 실패');
  }
};

/**
 * 점검 모드 활성 상태 확인
 * @returns {Promise<boolean>} 점검 모드 활성 여부
 */
const isMaintenanceModeActive = async () => {
  try {
    const value = await googleSheetsService.getSettingValue(MAINTENANCE_MODE_SETTING);

    // 값이 없으면 기본값 false로 설정
    if (value === null || value === undefined) {
      console.log('[점검모드] 설정값이 없음, 기본값 false로 초기화');
      await googleSheetsService.updateSettingValue(MAINTENANCE_MODE_SETTING, 'false');
      return false;
    }

    // 문자열을 boolean으로 변환
    const isActive = value.toLowerCase() === 'true';
    return isActive;
  } catch (error) {
    console.error('[점검모드] 상태 확인 실패:', error);
    // 에러 발생 시 안전하게 false 반환
    return false;
  }
};

/**
 * 점검 모드 상태를 강제로 설정 (디버깅/관리 용도)
 * @param {boolean} isActive - 활성화 여부
 */
const setMaintenanceMode = async (isActive) => {
  try {
    const value = isActive ? 'true' : 'false';
    await googleSheetsService.updateSettingValue(MAINTENANCE_MODE_SETTING, value);
    console.log(`[점검모드] 강제 설정됨: ${value}`);
    return true;
  } catch (error) {
    console.error('[점검모드] 강제 설정 실패:', error);
    throw new Error('점검모드 설정 실패');
  }
};

/**
 * 점검 후 첫 리젠인지 확인
 * 점검 모드가 활성화되어 있으면 첫 리젠으로 간주
 * @returns {Promise<boolean>} 점검 후 첫 리젠 여부
 */
const isFirstRegenAfterMaintenance = async () => {
  return await isMaintenanceModeActive();
};

module.exports = {
  activateMaintenanceMode,
  deactivateMaintenanceMode,
  isMaintenanceModeActive,
  setMaintenanceMode,
  isFirstRegenAfterMaintenance
};