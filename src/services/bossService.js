const googleSheetsService = require('./googleSheetsService');

// 보스 데이터 검증
const validateBossData = (bossData) => {
  const { bossName, score, regenType, regenSettings, scheduleVisible } = bossData;
  
  // 보스명 검증
  if (!bossName || bossName.trim().length === 0) {
    throw new Error('보스명을 입력해주세요.');
  }
  
  if (bossName.length > 50) {
    throw new Error('보스명은 50자 이내로 입력해주세요.');
  }
  
  // 점수 검증
  if (!score || isNaN(score) || score < 1 || score > 100) {
    throw new Error('점수는 1-100 사이의 숫자로 입력해주세요.');
  }
  
  // 리젠타입 검증
  if (!['시간마다', '특정요일'].includes(regenType)) {
    throw new Error('리젠타입은 "시간마다" 또는 "특정요일"만 가능합니다.');
  }
  
  // 리젠설정 검증
  if (!regenSettings) {
    throw new Error('리젠설정을 입력해주세요.');
  }
  
  try {
    const settings = JSON.parse(regenSettings);
    
    if (regenType === '시간마다') {
      if (!settings.hours || isNaN(settings.hours) || settings.hours < 1 || settings.hours > 168) {
        throw new Error('시간마다 리젠은 1-168시간 사이로 설정해주세요.');
      }
    } else if (regenType === '특정요일') {
      const validDays = ['월', '화', '수', '목', '금', '토', '일'];
      if (!settings.days || !Array.isArray(settings.days) || settings.days.length === 0) {
        throw new Error('특정요일 리젠은 최소 1개의 요일을 선택해주세요.');
      }
      
      for (const day of settings.days) {
        if (!validDays.includes(day)) {
          throw new Error('올바른 요일을 선택해주세요. (월, 화, 수, 목, 금, 토, 일)');
        }
      }
      
      if (!settings.time || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(settings.time)) {
        throw new Error('시간은 HH:MM 형식으로 입력해주세요. (예: 21:00)');
      }
    }
  } catch (parseError) {
    if (parseError.message.includes('JSON')) {
      throw new Error('리젠설정 형식이 올바르지 않습니다.');
    }
    throw parseError;
  }
  
  // 스케줄노출여부 검증
  if (!['노출', '비노출'].includes(scheduleVisible)) {
    throw new Error('스케줄노출여부는 "노출" 또는 "비노출"만 가능합니다.');
  }
  
  return true;
};

// 리젠설정을 읽기 쉬운 형태로 변환
const formatRegenSettings = (regenType, regenSettings) => {
  try {
    const settings = JSON.parse(regenSettings);
    
    if (regenType === '시간마다') {
      return `${settings.hours}시간마다`;
    } else if (regenType === '특정요일') {
      return `${settings.days.join(', ')} ${settings.time}`;
    }
    
    return regenSettings;
  } catch (error) {
    return regenSettings;
  }
};

// 보스 추가
const addBoss = async (bossData, registrar) => {
  try {
    // 데이터 검증
    validateBossData(bossData);
    
    // 중복 보스명 검사
    const existingBoss = await getBossByName(bossData.bossName);
    if (existingBoss) {
      throw new Error('이미 등록된 보스명입니다.');
    }
    
    // 현재 시간
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    // 보스 데이터 생성
    const rowData = [
      bossData.bossName,
      parseInt(bossData.score),
      bossData.regenType,
      bossData.regenSettings,
      bossData.scheduleVisible,
      registrar,
      now,
      now
    ];
    
    // Google Sheets에 추가
    await googleSheetsService.addBoss(rowData);
    
    return {
      success: true,
      message: '보스가 성공적으로 등록되었습니다.',
      boss: {
        name: bossData.bossName,
        score: parseInt(bossData.score),
        regenDisplay: formatRegenSettings(bossData.regenType, bossData.regenSettings),
        visible: bossData.scheduleVisible
      }
    };
  } catch (error) {
    throw new Error(`보스 추가 실패: ${error.message}`);
  }
};

// 보스 목록 조회
const getBossList = async (includeHidden = false) => {
  try {
    const bossList = await googleSheetsService.getBossList();
    
    if (!bossList || bossList.length === 0) {
      return [];
    }
    
    // 스케줄 노출 여부에 따라 필터링
    const filteredBosses = includeHidden 
      ? bossList 
      : bossList.filter(boss => boss.scheduleVisible === '노출');
    
    return filteredBosses.map(boss => ({
      name: boss.bossName,
      score: boss.score,
      regenType: boss.regenType,
      regenSettings: boss.regenSettings,
      regenDisplay: formatRegenSettings(boss.regenType, boss.regenSettings),
      scheduleVisible: boss.scheduleVisible,
      registrar: boss.registrar,
      createdAt: boss.createdAt,
      updatedAt: boss.updatedAt
    }));
  } catch (error) {
    throw new Error(`보스 목록 조회 실패: ${error.message}`);
  }
};

// 보스명으로 개별 조회
const getBossByName = async (bossName) => {
  try {
    const boss = await googleSheetsService.getBossByName(bossName);
    
    if (!boss) {
      return null;
    }
    
    return {
      name: boss.bossName,
      score: boss.score,
      regenType: boss.regenType,
      regenSettings: boss.regenSettings,
      regenDisplay: formatRegenSettings(boss.regenType, boss.regenSettings),
      scheduleVisible: boss.scheduleVisible,
      registrar: boss.registrar,
      createdAt: boss.createdAt,
      updatedAt: boss.updatedAt
    };
  } catch (error) {
    throw new Error(`보스 정보 조회 실패: ${error.message}`);
  }
};

// 보스 삭제
const deleteBoss = async (bossName) => {
  try {
    // 보스 존재 여부 확인
    const existingBoss = await getBossByName(bossName);
    if (!existingBoss) {
      throw new Error('존재하지 않는 보스입니다.');
    }
    
    // Google Sheets에서 삭제
    await googleSheetsService.deleteBoss(bossName);
    
    return {
      success: true,
      message: `'${bossName}' 보스가 성공적으로 삭제되었습니다.`,
      deletedBoss: existingBoss
    };
  } catch (error) {
    throw new Error(`보스 삭제 실패: ${error.message}`);
  }
};

// 한글 글자 수를 고려한 패딩 함수
const padKoreanString = (str, length) => {
  let realLength = 0;
  for (let i = 0; i < str.length; i++) {
    // 한글, 중국어, 일본어 등은 2칸, 나머지는 1칸으로 계산
    if (str.charCodeAt(i) > 127) {
      realLength += 2;
    } else {
      realLength += 1;
    }
  }
  
  const padding = Math.max(0, length - realLength);
  return str + ' '.repeat(padding);
};

// 보스 목록을 Discord 메시지 형태로 포맷
const formatBossListForDiscord = (bossList, includeHidden = false) => {
  if (!bossList || bossList.length === 0) {
    return '등록된 보스가 없습니다.';
  }
  
  let message = '**보스목록**\n```\n';
  
  bossList.forEach((boss) => {
    // 한글 고려하여 패딩: 보스명 20칸, 리젠정보 25칸
    const name = padKoreanString(boss.name, 20);
    const regen = padKoreanString(boss.regenDisplay, 25);
    const visibility = boss.scheduleVisible;
    
    message += `${name} ${regen} ${visibility}\n`;
  });
  
  message += '```';
  
  return message;
};

// 보스 상세 정보를 Discord 메시지 형태로 포맷
const formatBossInfoForDiscord = (boss) => {
  if (!boss) {
    return '해당 보스를 찾을 수 없습니다.';
  }
  
  const visibilityIcon = boss.scheduleVisible === '노출' ? '👁️' : '🔒';
  
  return {
    color: 0x00ff00,
    title: `🐉 ${boss.name} 정보`,
    fields: [
      {
        name: '💰 참여 점수',
        value: `${boss.score}점`,
        inline: true
      },
      {
        name: '⏰ 리젠 정보',
        value: `${boss.regenDisplay}`,
        inline: true
      },
      {
        name: `${visibilityIcon} 노출 상태`,
        value: boss.scheduleVisible,
        inline: true
      },
      {
        name: '👤 등록자',
        value: boss.registrar,
        inline: true
      },
      {
        name: '📅 등록일시',
        value: boss.createdAt,
        inline: true
      },
      {
        name: '🔄 수정일시',
        value: boss.updatedAt,
        inline: true
      }
    ],
    timestamp: new Date().toISOString()
  };
};

const bossService = {
  validateBossData,
  formatRegenSettings,
  addBoss,
  getBossList,
  getBossByName,
  deleteBoss,
  formatBossListForDiscord,
  formatBossInfoForDiscord
};

module.exports = { bossService };