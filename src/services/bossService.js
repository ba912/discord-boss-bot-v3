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
const addBoss = async (bossData) => {
  try {
    // 데이터 검증
    validateBossData(bossData);
    
    // 중복 보스명 검사
    const existingBoss = await getBossByName(bossData.bossName);
    if (existingBoss) {
      throw new Error('이미 등록된 보스명입니다.');
    }
    
    // 보스 데이터 생성
    const rowData = [
      bossData.bossName,
      parseInt(bossData.score),
      bossData.regenType,
      bossData.regenSettings,
      bossData.scheduleVisible,
      null // 컷타임 (초기값은 null)
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
      cutTime: boss.cutTime
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
      cutTime: boss.cutTime
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

// 더 정확한 문자 폭 계산 (Discord 고정폭 폰트 기준)
const getDisplayWidth = (str) => {
  let width = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const code = str.charCodeAt(i);

    // 한글 (가-힣)
    if (code >= 0xAC00 && code <= 0xD7AF) {
      width += 2;
    }
    // 기타 전각 문자 (중국어, 일본어 등)
    else if (code > 127) {
      width += 2;
    }
    // 영문, 숫자, 특수문자, 공백
    else {
      width += 1;
    }
  }
  return width;
};

// Discord용 실제 폭 계산 (모든 전각 문자=2, 반각 문자=1)
const getDiscordWidth = (str) => {
  let width = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // 전각 문자 (한글, 전각 공백 등)
    if (code > 127) {
      width += 2;
    }
    // 반각 문자 (영문/숫자/특수문자)
    else {
      width += 1;
    }
  }
  return width;
};

// 전각 공백을 사용한 패딩 함수
const padWithFullWidth = (str, targetWidth) => {
  const fullWidthSpace = "　"; // U+3000
  const currentWidth = getDiscordWidth(str);
  const diff = targetWidth - currentWidth;

  if (diff <= 0) return str;

  // 전각 공백(2폭)과 반각 공백(1폭) 조합으로 정확한 패딩
  const fullWidthSpaces = Math.floor(diff / 2);
  const halfWidthSpaces = diff % 2;

  return str + fullWidthSpace.repeat(fullWidthSpaces) + ' '.repeat(halfWidthSpaces);
};

// 보스 목록을 Discord 메시지 형태로 포맷
const formatBossListForDiscord = (bossList) => {
  if (!bossList || bossList.length === 0) {
    return '등록된 보스가 없습니다.';
  }

  // 데이터 구성 (띄어쓰기를 전각 공백으로 치환)
  const data = bossList.map(boss => [
    boss.name.replace(/ /g, '　'),
    boss.regenDisplay.replace(/ /g, '　'),
    boss.scheduleVisible.replace(/ /g, '　')
  ]);

  // 각 열의 최대 폭 계산 + 여유 공간 추가
  const colWidths = [0, 0, 0];
  for (const row of data) {
    row.forEach((cell, i) => {
      colWidths[i] = Math.max(colWidths[i], getDiscordWidth(cell));
    });
  }

  // 각 열에 여유 공간 10폭(전각 공백 5개) 추가
  colWidths[0] += 10;
  colWidths[1] += 10;
  colWidths[2] += 10;

  let message = '**보스목록**\n```';
  for (const row of data) {
    const line = row.map((cell, i) => padWithFullWidth(cell, colWidths[i])).join("　"); // 열 간격 전각 공백
    message += '\n' + line;
  }
  message += '\n```';

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
        name: '⏱️ 컷타임',
        value: boss.cutTime || '미등록',
        inline: true
      }
    ],
    timestamp: new Date().toISOString()
  };
};

// 보스 정보 업데이트 (컷타임 포함)
const updateBoss = async (bossName, updateData) => {
  try {
    return await googleSheetsService.updateBoss(bossName, updateData);
  } catch (error) {
    throw new Error(`보스 정보 업데이트 실패: ${error.message}`);
  }
};

const bossService = {
  validateBossData,
  formatRegenSettings,
  addBoss,
  getBossList,
  getBossByName,
  deleteBoss,
  updateBoss,
  formatBossListForDiscord,
  formatBossInfoForDiscord
};

module.exports = { bossService };