/**
 * 권한 관리 유틸리티
 * Google Sheets 기반 권한 체크
 */

const googleSheetsService = require('../services/googleSheetsService');
const { BOT_CONFIG } = require('../config/constants');

/**
 * Google Sheets에서 사용자 권한 조회
 * @param {string} userId - Discord 사용자 ID
 * @returns {Promise<string|null>} 권한 정보 ('운영진' 또는 '일반길드원' 또는 null)
 */
const getUserPermissionFromSheet = async (userId) => {
  try {
    const member = await googleSheetsService.getMemberByUserId(userId);
    if (!member || !member['권한']) {
      return null;
    }
    
    const permission = member['권한'];
    // 유효한 권한인지 확인
    const validPermissions = Object.values(BOT_CONFIG.PERMISSIONS);
    return validPermissions.includes(permission) ? permission : null;
  } catch (error) {
    console.error('❌ 시트에서 권한 조회 중 오류:', error);
    return null;
  }
};

/**
 * 관리자 권한 체크 (시트 관리 명령어용 - 관리자만 가능)
 * @param {string} userId - Discord 사용자 ID  
 * @returns {Promise<boolean>} 관리자 권한 여부
 */
const checkSuperAdminPermission = async (userId) => {
  try {
    // Google Sheets에서 권한 조회
    const userPermission = await getUserPermissionFromSheet(userId);
    return userPermission === BOT_CONFIG.PERMISSIONS.SUPER_ADMIN;
  } catch (error) {
    console.error('❌ 관리자 권한 체크 중 오류:', error);
    return false;
  }
};

/**
 * 운영진 이상 권한 체크 (운영진 + 관리자) - 시트 권한만 체크
 * @param {string} userId - Discord 사용자 ID
 * @returns {Promise<boolean>} 운영진 이상 권한 여부
 */
const checkAdminPermission = async (userId) => {
  try {
    // Google Sheets에서 권한 조회만 수행
    const userPermission = await getUserPermissionFromSheet(userId);
    return userPermission === BOT_CONFIG.PERMISSIONS.SUPER_ADMIN || 
           userPermission === BOT_CONFIG.PERMISSIONS.ADMIN;
  } catch (error) {
    console.error('❌ 권한 체크 중 오류:', error);
    return false;
  }
};

/**
 * 관리자 전용 명령어 권한 체크 (시트 권한만 체크)
 * @param {Message} message - Discord 메시지 객체
 * @returns {Promise<boolean>} 권한 여부
 */
const checkSuperAdminCommandPermission = async (message) => {
  try {
    // DM에서는 권한 체크 불가
    if (!message.guild) {
      return false;
    }

    const userId = message.author.id;
    
    // Google Sheets에서 관리자 권한 체크만 수행
    return await checkSuperAdminPermission(userId);
  } catch (error) {
    console.error('❌ 관리자 명령어 권한 체크 중 오류:', error);
    return false;
  }
};

/**
 * 운영진 이상 명령어 권한 체크 (시트 권한만 체크)
 * @param {Message} message - Discord 메시지 객체  
 * @returns {Promise<boolean>} 권한 여부
 */
const checkCommandPermission = async (message) => {
  try {
    // DM에서는 권한 체크 불가
    if (!message.guild) {
      return false;
    }

    const userId = message.author.id;
    
    // Google Sheets에서 운영진 이상 권한 체크만 수행
    return await checkAdminPermission(userId);
  } catch (error) {
    console.error('❌ 명령어 권한 체크 중 오류:', error);
    return false;
  }
};

/**
 * 권한 부족 에러 메시지 생성
 * @returns {Object} Discord embed 객체
 */
const getPermissionDeniedEmbed = () => {
  return {
    color: 0xff0000,
    title: '❌ 권한 부족',
    description: '이 명령어를 사용할 권한이 없습니다.',
    fields: [
      {
        name: '💡 문의',
        value: '권한이 필요하시면 서버 관리자에게 문의해주세요.',
        inline: false,
      },
    ],
  };
};

module.exports = {
  getUserPermissionFromSheet,
  checkSuperAdminPermission,
  checkAdminPermission,
  checkSuperAdminCommandPermission,
  checkCommandPermission,
  getPermissionDeniedEmbed,
};