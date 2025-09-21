// 시간 계산 관련 공통 유틸리티
// !젠, !점검 명령어에서 공통으로 사용할 시간 역산 로직

/**
 * 시간 문자열을 Date 객체로 파싱
 * @param {string} timeArg - HHMM 또는 MMDDHHMM 형식
 * @returns {Date} 파싱된 Date 객체
 */
const parseTimeArgument = (timeArg) => {
  const now = new Date();

  // 숫자만 확인
  if (!/^\d+$/.test(timeArg)) {
    throw new Error('시간은 숫자만 입력해주세요. (HHMM 또는 MMDDHHMM)');
  }

  let targetTime;

  if (timeArg.length === 4) {
    // HHMM 형식 - 오늘 해당 시간
    const hours = parseInt(timeArg.substring(0, 2));
    const minutes = parseInt(timeArg.substring(2, 4));

    if (hours < 0 || hours > 23) {
      throw new Error('시간은 00-23 사이로 입력해주세요.');
    }
    if (minutes < 0 || minutes > 59) {
      throw new Error('분은 00-59 사이로 입력해주세요.');
    }

    targetTime = new Date(now);
    targetTime.setHours(hours, minutes, 0, 0);

  } else if (timeArg.length === 8) {
    // MMDDHHMM 형식 - 해당 월일시간
    const month = parseInt(timeArg.substring(0, 2));
    const day = parseInt(timeArg.substring(2, 4));
    const hours = parseInt(timeArg.substring(4, 6));
    const minutes = parseInt(timeArg.substring(6, 8));

    if (month < 1 || month > 12) {
      throw new Error('월은 01-12 사이로 입력해주세요.');
    }
    if (day < 1 || day > 31) {
      throw new Error('일은 01-31 사이로 입력해주세요.');
    }
    if (hours < 0 || hours > 23) {
      throw new Error('시간은 00-23 사이로 입력해주세요.');
    }
    if (minutes < 0 || minutes > 59) {
      throw new Error('분은 00-59 사이로 입력해주세요.');
    }

    targetTime = new Date(now.getFullYear(), month - 1, day, hours, minutes, 0, 0);

    // 날짜 유효성 검사
    if (targetTime.getMonth() !== month - 1 || targetTime.getDate() !== day) {
      throw new Error('올바르지 않은 날짜입니다.');
    }

  } else {
    throw new Error('시간 형식이 올바르지 않습니다. (HHMM 또는 MMDDHHMM)');
  }

  return targetTime;
};

/**
 * 젠타임에서 컷타임 역산 계산
 * @param {Date} genTime - 젠타임 (리젠 예정 시간)
 * @param {string} regenSettings - 리젠설정 JSON 문자열
 * @returns {string} 계산된 컷타임 (YYYY-MM-DD HH:MM:SS 형식)
 */
const calculateCutTimeFromGen = (genTime, regenSettings) => {
  try {
    // 리젠설정에서 시간 추출
    const settings = JSON.parse(regenSettings);
    const regenHours = settings.hours;

    if (!regenHours || isNaN(regenHours) || regenHours <= 0) {
      throw new Error('리젠시간 정보가 올바르지 않습니다.');
    }

    // 젠타임에서 리젠시간(밀리초)를 빼서 컷타임 계산
    // 젠타임 - 리젠시간 = 컷타임
    const cutTimeMs = genTime.getTime() - (regenHours * 60 * 60 * 1000);
    const cutTime = new Date(cutTimeMs);

    return formatDateTime(cutTime);

  } catch (parseError) {
    throw new Error('리젠설정 파싱 오류: ' + parseError.message);
  }
};

/**
 * 점검 시간을 기준으로 젠타임에서 컷타임 역산
 * @param {Date} maintenanceTime - 점검 완료 시간 (젠타임)
 * @param {string} regenSettings - 리젠설정 JSON 문자열
 * @returns {string} 계산된 컷타임 (YYYY-MM-DD HH:MM:SS 형식)
 */
const calculateCutTimeFromMaintenance = (maintenanceTime, regenSettings) => {
  try {
    const settings = JSON.parse(regenSettings);
    const regenHours = settings.hours;

    if (!regenHours || isNaN(regenHours) || regenHours <= 0) {
      throw new Error('리젠시간 정보가 올바르지 않습니다.');
    }

    // 점검 완료 시간을 젠타임으로 보고 컷타임 역산
    // 젠타임 - 리젠시간 = 컷타임
    const cutTimeMs = maintenanceTime.getTime() - (regenHours * 60 * 60 * 1000);
    const cutTime = new Date(cutTimeMs);

    return formatDateTime(cutTime);

  } catch (parseError) {
    throw new Error('리젠설정 파싱 오류: ' + parseError.message);
  }
};

/**
 * 시간마다 리젠되는 보스인지 확인
 * @param {string} regenType - 리젠타입
 * @returns {boolean} 시간마다 리젠 여부
 */
const isHourlyRegenBoss = (regenType) => {
  return regenType === '시간마다';
};

/**
 * 시간을 YYYY-MM-DD HH:MM:SS 형식으로 포맷
 * @param {Date} date - 포맷할 Date 객체
 * @returns {string} 포맷된 시간 문자열
 */
const formatDateTime = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * 표시용 시간 포맷 (초 제외, 사용자 친화적)
 * @param {Date} date - 포맷할 Date 객체
 * @returns {string} 표시용 시간 문자열 (예: "09월 21일 14:30")
 */
const formatDisplayTime = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${month}월 ${day}일 ${hours}:${minutes}`;
};

/**
 * 리젠시간(시간) 추출
 * @param {string} regenSettings - 리젠설정 JSON 문자열
 * @returns {number} 리젠시간 (시간 단위)
 */
const extractRegenHours = (regenSettings) => {
  try {
    const settings = JSON.parse(regenSettings);
    const regenHours = settings.hours;

    if (!regenHours || isNaN(regenHours) || regenHours <= 0) {
      throw new Error('리젠시간 정보가 올바르지 않습니다.');
    }

    return regenHours;
  } catch (parseError) {
    throw new Error('리젠설정 파싱 오류: ' + parseError.message);
  }
};

module.exports = {
  parseTimeArgument,
  calculateCutTimeFromGen,
  calculateCutTimeFromMaintenance,
  isHourlyRegenBoss,
  formatDateTime,
  formatDisplayTime,
  extractRegenHours
};