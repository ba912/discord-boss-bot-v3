/**
 * 사용자별 명령어 실행 잠금 관리자
 * 동시성 문제 해결을 위한 사용자별 잠금 시스템
 */
class UserLockManager {
  constructor() {
    this.userLocks = new Map(); // userId -> { command, timestamp }
    this.lockTimeout = 30 * 1000; // 30초 타임아웃

    // 5분마다 만료된 잠금 정리
    setInterval(() => {
      this.cleanupExpiredLocks();
    }, 5 * 60 * 1000);
  }

  /**
   * 사용자의 명령어 실행 잠금 시도
   * @param {string} userId - Discord 사용자 ID
   * @param {string} command - 명령어 이름
   * @returns {boolean} 잠금 성공 여부
   */
  acquireLock(userId, command) {
    const now = Date.now();
    const existingLock = this.userLocks.get(userId);

    // 기존 잠금이 있는 경우
    if (existingLock) {
      // 타임아웃 확인
      if (now - existingLock.timestamp > this.lockTimeout) {
        console.warn(`[UserLock] 만료된 잠금 제거: ${userId} - ${existingLock.command}`);
        this.userLocks.delete(userId);
      } else {
        // 아직 유효한 잠금
        console.log(`[UserLock] 이미 실행 중: ${userId} - ${existingLock.command}`);
        return false;
      }
    }

    // 새로운 잠금 설정
    this.userLocks.set(userId, {
      command: command,
      timestamp: now
    });

    console.log(`[UserLock] 잠금 획득: ${userId} - ${command}`);
    return true;
  }

  /**
   * 사용자의 명령어 실행 잠금 해제
   * @param {string} userId - Discord 사용자 ID
   */
  releaseLock(userId) {
    const existingLock = this.userLocks.get(userId);
    if (existingLock) {
      console.log(`[UserLock] 잠금 해제: ${userId} - ${existingLock.command}`);
      this.userLocks.delete(userId);
    }
  }

  /**
   * 특정 사용자의 잠금 상태 확인
   * @param {string} userId - Discord 사용자 ID
   * @returns {Object|null} 잠금 정보 또는 null
   */
  getLockInfo(userId) {
    const lock = this.userLocks.get(userId);
    if (!lock) return null;

    const now = Date.now();
    const elapsed = now - lock.timestamp;

    // 만료된 잠금
    if (elapsed > this.lockTimeout) {
      this.userLocks.delete(userId);
      return null;
    }

    return {
      command: lock.command,
      elapsedSeconds: Math.floor(elapsed / 1000),
      remainingSeconds: Math.floor((this.lockTimeout - elapsed) / 1000)
    };
  }

  /**
   * 만료된 잠금들 정리
   */
  cleanupExpiredLocks() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [userId, lock] of this.userLocks.entries()) {
      if (now - lock.timestamp > this.lockTimeout) {
        console.warn(`[UserLock] 만료된 잠금 정리: ${userId} - ${lock.command}`);
        this.userLocks.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[UserLock] ${cleanedCount}개의 만료된 잠금 정리 완료`);
    }
  }

  /**
   * 현재 활성 잠금 상태 조회 (디버깅용)
   * @returns {Array} 활성 잠금 목록
   */
  getActiveLocks() {
    const now = Date.now();
    const activeLocks = [];

    for (const [userId, lock] of this.userLocks.entries()) {
      const elapsed = now - lock.timestamp;
      if (elapsed <= this.lockTimeout) {
        activeLocks.push({
          userId,
          command: lock.command,
          elapsedSeconds: Math.floor(elapsed / 1000)
        });
      }
    }

    return activeLocks;
  }

  /**
   * 모든 잠금 강제 해제 (비상용)
   */
  clearAllLocks() {
    const count = this.userLocks.size;
    this.userLocks.clear();
    console.warn(`[UserLock] 모든 잠금 강제 해제: ${count}개`);
    return count;
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const userLockManager = new UserLockManager();

module.exports = userLockManager;