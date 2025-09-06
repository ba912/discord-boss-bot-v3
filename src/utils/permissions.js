/**
 * 권한 관리 유틸리티
 * Discord 역할 기반 및 사용자 ID 기반 권한 체크
 */

/**
 * 관리자 권한 체크
 * @param {GuildMember} member - Discord 길드 멤버 객체
 * @returns {boolean} 관리자 권한 여부
 */
const checkAdminPermission = (member) => {
  try {
    // 1. 환경변수에서 관리자 사용자 ID 목록 체크
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || [];
    if (adminUserIds.includes(member.user.id)) {
      return true;
    }

    // 2. 환경변수에서 관리자 역할 ID 체크
    const adminRoleId = process.env.ADMIN_ROLE_ID;
    if (adminRoleId && member.roles.cache.has(adminRoleId)) {
      return true;
    }

    // 3. Discord 서버 관리자 권한 체크 (기본 권한)
    if (member.permissions.has('Administrator')) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ 권한 체크 중 오류:', error);
    return false;
  }
};

/**
 * 명령어 권한 체크 (관리자 명령어용)
 * @param {Message} message - Discord 메시지 객체
 * @returns {Promise<boolean>} 권한 여부
 */
const checkCommandPermission = async (message) => {
  try {
    // DM에서는 권한 체크 불가
    if (!message.guild) {
      return false;
    }

    // 길드 멤버 정보 가져오기 (이미 캐시된 경우)
    const member = message.member;
    if (!member) {
      // 캐시에 없으면 fetch
      try {
        const fetchedMember = await message.guild.members.fetch(message.author.id);
        return checkAdminPermission(fetchedMember);
      } catch (fetchError) {
        console.error('❌ 멤버 정보 가져오기 실패:', fetchError);
        return false;
      }
    }

    return checkAdminPermission(member);
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
        name: '📋 필요 권한',
        value: '• 서버 관리자 권한\n• 봇 관리자 역할\n• 등록된 관리자 사용자',
        inline: false,
      },
      {
        name: '💡 문의',
        value: '권한이 필요하시면 서버 관리자에게 문의해주세요.',
        inline: false,
      },
    ],
  };
};

module.exports = {
  checkAdminPermission,
  checkCommandPermission,
  getPermissionDeniedEmbed,
};