/* ============================================================
   sim.js - OUTROMANCE コアシミュレーション（完全版）
   ============================================================ */

window.appState = window.appState || {
  user: { name: "ユウスケ", gender: "male", pref: "tokyo", startAge: 40, birthMonth: 1, selectedStyle: "balanced" },
  stats: { looks: 5, libido: 5, stamina: 5, budget: 4, income: 5, childBurden: 5, spouseAffection: 5, spouseAlert: 1, targetAgePref: "same", maxPartners: 2 },
  tempPoints: 0,
  sim: {
    currentMonth: 0, currentAge: 40, isPaused: false, isSkipping: false,
    partners: [], activePartnerIds: [], totalPartnerCounter: 0,
    monthlyHistory: [], isRetired: false, isDivorced: false, lastMilestoneMonth: -1,
    globalMaxSexScore: 0, highestScorePartner: null,
    metOlder20Plus: false, metYounger20Plus: false,
    crisisCountIn2Years: 0, breakupCountIn2Years: 0, lawsuitCount: 0
  }
};
var appState = window.appState;

function getRealAge(mIdx) {
  const startAge = appState.user.startAge || 40;
  return startAge + Math.floor(mIdx / 12);
}

function rollIncomeLevel() {
  const r = (Math.random() + Math.random()) / 2;
  return Math.min(6, Math.max(4, Math.round(4 + r * 2)));
}

function rollInitialStatsTotal() {
  const r = (Math.random() + Math.random()) / 2;
  return Math.min(16, Math.max(13, Math.round(13 + r * 3)));
}

function calculateSexScore(partner, month, isCrisis, prefBonus = 0) {
  let base = 50;
  if (partner.chemistry === "S") base = 85;
  else if (partner.chemistry === "A") base = 72;
  else if (partner.chemistry === "B") base = 55;
  else if (partner.chemistry === "C") base = 35;

  base += (Math.random() * 8) - 4;
  const libidoBonus = (appState.stats.libido - 4) * 3.8;
  const masteryBonus = Math.min(14, Math.floor(partner.durationMonths / 12) * 3.5);

  let eventBonus = 0;
  if (month === 12 || month === 2 || month === 4 || month === 8 || month === 1) {
    eventBonus = 10 + Math.floor(Math.random() * 8);
  }
  const thrillBonus = isCrisis ? 15 : 0;
  return Math.max(10, Math.round(base + libidoBonus + masteryBonus + eventBonus + thrillBonus + prefBonus));
}

function rollPartnerAgeWithDecay(playerAge, targetPref, isTargetMale) {
  const userGender = appState.user.gender;
  const looks = appState.stats.looks || 5;
  const budget = appState.stats.budget || 2;

  let spreadBonus = 0;
  if (userGender === "male") {
    spreadBonus = (budget - 2) * 1.5 + (looks - 4) * 1.0;
  } else {
    spreadBonus = (looks - 4) * 2.0 + (budget - 2) * 0.8;
  }
  spreadBonus = Math.max(0, Math.min(12, spreadBonus));

  if (targetPref === "same") {
    if (Math.random() < 0.85) {
      const delta = Math.floor(Math.random() * 7) - 3;
      return Math.max(18, Math.min(85, playerAge + delta));
    } else {
      const sign = Math.random() < 0.5 ? 1 : -1;
      const delta = 4 + Math.floor(Math.random() * 3);
      return Math.max(18, Math.min(85, playerAge + sign * delta));
    }
  }

  function rollDecayedGap() {
    let gap = 3;
    const continueRate = 0.68 + (spreadBonus / 12) * 0.14;
    if (Math.random() < 0.12) {
      gap += 6 + Math.floor(Math.random() * 7);
    }
    while (Math.random() < continueRate && gap < 70) {
      gap += 1 + Math.floor(Math.random() * 3);
    }
    return gap;
  }

  if (targetPref === "younger") {
    const gap = rollDecayedGap();
    return Math.max(18, playerAge - gap);
  }

  if (targetPref === "older") {
    const gap = rollDecayedGap();
    return Math.min(85, playerAge + gap);
  }

  return playerAge;
}

function createSynthesizedPartner(startMonth, playerAge) {
  const isTargetMale = (appState.user.gender === "female");
  const prefix = isTargetMale ? "M" : "F";
  const targetGender = isTargetMale ? "male" : "female";
  const jobPool = isTargetMale ? MALE_JOBS_POOL : FEMALE_JOBS_POOL;
  const job = jobPool[Math.floor(Math.random() * jobPool.length)];

  const rPref = Math.random();
  let prefKey = "tokyo";
  let prefLabel = "東京";
  if (rPref < 0.45) {
    prefKey = "tokyo";
    prefLabel = "東京";
  } else if (rPref < 0.70) {
    prefKey = "kanagawa";
    prefLabel = "神奈川";
  } else if (rPref < 0.85) {
    prefKey = "saitama";
    prefLabel = "埼玉";
  } else {
    prefKey = "chiba";
    prefLabel = "千葉";
  }

  const areaPool = (typeof AREAS_NO_STATION !== "undefined" && AREAS_NO_STATION[prefKey]) 
    ? AREAS_NO_STATION[prefKey] 
    : ["銀座", "中目黒", "恵比寿"];
  const area = `${prefLabel}・${areaPool[Math.floor(Math.random() * areaPool.length)]}`;

  const targetPref = appState.stats.targetAgePref || "same";
  const partnerAge = rollPartnerAgeWithDecay(playerAge, targetPref, isTargetMale);

  const name = pickGenerationalName(targetGender, partnerAge);
  const tag = pickPartnerTag(partnerAge, job);

  let avatarNum, category = "normal";
  if (partnerAge <= 25) {
    avatarNum = 19 + Math.floor(Math.random() * 2);
    category = "youth";
  } else if (partnerAge >= 65) {
    avatarNum = 17 + Math.floor(Math.random() * 2);
    category = "senior";
  } else {
    avatarNum = 1 + Math.floor(Math.random() * 16);
  }

  const avatarId = prefix + String(avatarNum).padStart(2, '0');
  const quote = (typeof pickPartnerQuote === "function") 
    ? pickPartnerQuote(targetGender, tag) 
    : "「はじめまして。落ち着いた大人の関係になれたら嬉しいです。」";

  const rChem = Math.random();
  let chemistry = "B";
  if (partnerAge >= 60) {
    if (rChem < 0.04) chemistry = "S";
    else if (rChem < 0.18) chemistry = "A";
    else if (rChem < 0.65) chemistry = "B";
    else chemistry = "C";
  } else {
    if (rChem < 0.14) chemistry = "S";
    else if (rChem < 0.38) chemistry = "A";
    else if (rChem < 0.80) chemistry = "B";
    else chemistry = "C";
  }

  const currentActive = appState.sim.partners.filter(p => appState.sim.activePartnerIds.includes(p.id));
  const usedColors = currentActive.map(p => p.color);
  const availableColor = PARTNER_COLORS.find(c => !usedColors.includes(c)) || PARTNER_COLORS[appState.sim.totalPartnerCounter % PARTNER_COLORS.length];

  return {
    id: "p_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    name, job, area, avatarId, category, tag,
    quote,
    startAge: partnerAge,
    age: partnerAge,
    endAge: partnerAge,
    startMonth,
    endMonth: null,
    durationMonths: 1,
    datesCount: 1,
    chemistry,
    color: availableColor,
    maxSexScore: 0,
    lastSexScore: 0,
    lastLine: "",
    lastActionText: null,
    giftProtectedUntil: null
  };
}

function simulateOneMonth(isSilent = false) {
  const mIdx = appState.sim.currentMonth;
  const calMonth = (mIdx % 12) + 1;
  const currentRealAge = getRealAge(mIdx);
  appState.sim.currentAge = currentRealAge;

  let activePartners = appState.sim.partners.filter(p => appState.sim.activePartnerIds.includes(p.id));
  let isCrisisHappened = false;

  // 【修正】家庭崩壊度（spouseAlert）の上昇・下降バランス調整
  const stamina = appState.stats.stamina || 4;
  const activeCount = activePartners.length;

  if (activeCount > 0) {
    // 交際人数に応じたベース上昇率（1人:6%、2人:13%、3人:21%、4人:28%）
    let alertUpChance = [0, 0.06, 0.13, 0.21, 0.28][Math.min(4, activeCount)];
    // 体力が高いほど家庭での振る舞いに余裕が出てバレにくい
    alertUpChance -= (stamina - 4) * 0.015;
    // パートナーの特性によるリスク増減
    if (activePartners.some(p => p.tag === "夜間遠征" || p.tag === "年下独身")) alertUpChance += 0.04;
    if (activePartners.every(p => p.tag === "秘密厳守")) alertUpChance -= 0.03;

    alertUpChance = Math.max(0.02, Math.min(0.45, alertUpChance));

    if (Math.random() < alertUpChance) {
      appState.stats.spouseAlert = Math.min(5, appState.stats.spouseAlert + 1);
    } else if (Math.random() < 0.04) {
      // 交際中は自然鎮静は低確率（4%）
      appState.stats.spouseAlert = Math.max(1, appState.stats.spouseAlert - 1);
    }
  } else {
    // パートナー0人の月は家庭に専念するため鎮静しやすい（25%）
    if (Math.random() < 0.25) {
      appState.stats.spouseAlert = Math.max(1, appState.stats.spouseAlert - 1);
    }
  }

  const prefProp = PREF_PROPERTIES.tokyo;

  let staminaProtection = (stamina - 4) * 0.018;
  let riskRate = (appState.stats.spouseAlert * 0.028) + (activeCount * 0.018) + (prefProp.crisisBonus || 0) - staminaProtection;
  riskRate = Math.max(0.005, Math.min(0.40, riskRate));

  if (Math.random() < riskRate && activeCount > 0) {
    isCrisisHappened = true;
    appState.sim.crisisCountIn2Years++;
  }

  const isFirstYear = (mIdx < 12);
  const divorceChance = isFirstYear ? 0.0 : (isCrisisHappened ? 0.30 : 0.05);

  if (appState.stats.spouseAlert >= 5 && Math.random() < divorceChance) {
    if (typeof triggerDivorceGameOver === "function") {
      triggerDivorceGameOver(mIdx, isSilent);
    }
    return;
  }

  const concurrentPenalty = { 1: 0.6, 2: 1.0, 3: 1.5, 4: 2.1 }[appState.stats.maxPartners] || 1.0;
  const isUserMale = (appState.user.gender === "male");

  activePartners.forEach(p => {
    p.lastActionText = null;
    p.durationMonths++;
    p.datesCount++;
    p.age = p.startAge + Math.floor(p.durationMonths / 12);

    let tagScoreBonus = 0;
    if (p.tag === "年下独身") tagScoreBonus += 8;
    if (p.tag === "割り切り") tagScoreBonus += 5;
    if (p.tag === "冷えきり" && p.durationMonths >= 12) tagScoreBonus += 6;
    if (p.tag === "秘密厳守" && appState.stats.income >= 5) tagScoreBonus += 5;

    const score = calculateSexScore(p, calMonth, isCrisisHappened, (prefProp.scoreBonus || 0) + tagScoreBonus);
    p.lastSexScore = score;
    if (score > p.maxSexScore) p.maxSexScore = score;
    if (score > appState.sim.globalMaxSexScore) {
      appState.sim.globalMaxSexScore = score;
      appState.sim.highestScorePartner = p;
    }
  });

  // 慰謝料被請求判定
  let lawsuitPartner = null;
  for (const p of activePartners) {
    let lawsuitRate = 0.003;
    if (p.tag === "冷えきり") lawsuitRate = 0.006;
    if (p.tag === "秘密厳守") lawsuitRate = 0.0;
    if (stamina >= 7) lawsuitRate *= 0.5;

    if (Math.random() < lawsuitRate) {
      lawsuitPartner = p;
      break;
    }
  }

  if (lawsuitPartner) {
    appState.sim.activePartnerIds = appState.sim.activePartnerIds.filter(pid => pid !== lawsuitPartner.id);
    lawsuitPartner.endMonth = mIdx;
    lawsuitPartner.endAge = lawsuitPartner.age;
    appState.sim.breakupCountIn2Years++;
    appState.sim.lawsuitCount++;

    appState.stats.income = Math.max(2, appState.stats.income - 1);
    if (typeof updateLiveStats === "function") updateLiveStats();

    if (!isSilent) {
      if (typeof showLawsuitToast === "function") showLawsuitToast(lawsuitPartner);
      if (typeof playAlarm === "function") playAlarm();
      if (typeof triggerVibrate === "function") triggerVibrate([100, 80, 100]);
    }
    activePartners = activePartners.filter(p => p.id !== lawsuitPartner.id);
  }

  // 自然破局判定
  let breakCandidate = null;
  let highestBreakRoll = 0;

  activePartners.forEach(p => {
    let breakRate = 0.05;
    if (p.chemistry === "S") breakRate = (appState.stats.libido >= 6) ? 0.012 : 0.025;
    else if (p.chemistry === "A") breakRate = 0.035;
    else if (p.chemistry === "C") breakRate = (appState.stats.libido >= 6) ? 0.22 : 0.16;

    if (isUserMale) {
      if (appState.stats.budget >= 6) breakRate *= 0.7;
      if (appState.stats.budget <= 2) breakRate *= 1.3;
    } else {
      if (appState.stats.looks >= 7) breakRate *= 0.65;
      if (appState.stats.looks <= 3) breakRate *= 1.35;
    }

    if (p.age >= currentRealAge + 10) breakRate *= 0.8;
    if (p.age <= currentRealAge - 10) breakRate *= 1.25;
    breakRate *= concurrentPenalty;

    if (p.tag === "夜間遠征" && appState.stats.budget <= 2) breakRate *= 1.4;
    if (p.tag === "割り切り") {
      breakRate *= 0.85;
      if (appState.stats.libido <= 3) breakRate *= 1.6;
    }

    if (p.giftProtectedUntil && p.giftProtectedUntil >= mIdx) {
      breakRate *= 0.15;
    }

    breakRate += (prefProp.breakBonus || 0);
    breakRate = Math.max(0.005, breakRate);

    if (p.durationMonths >= 3) {
      const roll = Math.random();
      if (roll < breakRate && roll > highestBreakRoll) {
        highestBreakRoll = roll;
        breakCandidate = p;
      }
    }
  });

  if (breakCandidate && !lawsuitPartner) {
    appState.sim.activePartnerIds = appState.sim.activePartnerIds.filter(pid => pid !== breakCandidate.id);
    breakCandidate.endMonth = mIdx;
    breakCandidate.endAge = breakCandidate.age;
    appState.sim.breakupCountIn2Years++;

    if (!isSilent) {
      if (typeof showBreakupPartnerToast === "function") showBreakupPartnerToast(breakCandidate, isUserMale, false);
      if (typeof playBreakupChime === "function") playBreakupChime();
      if (typeof triggerVibrate === "function") triggerVibrate([60, 40]);
    }
  }

  // 出会い抽選ロジック
  const maxAllowed = appState.stats.maxPartners || 2;
  let emptySlots = maxAllowed - appState.sim.activePartnerIds.length;
  let matchedPartners = [];

  const isFirstMonthGuaranteed = (mIdx === 0 && appState.sim.activePartnerIds.length === 0);

  if (emptySlots > 0 && appState.stats.spouseAlert < 5) {
    let meetBase = 0.45;
    if (isUserMale) {
      meetBase = 0.44 + (appState.stats.budget - 3) * 0.04 + (appState.stats.looks - 4) * 0.03;
    } else {
      meetBase = 0.52 + (appState.stats.looks - 4) * 0.065;
    }

    if (appState.stats.targetAgePref === "younger") meetBase *= 0.88;
    if (appState.stats.targetAgePref === "older") meetBase *= 1.15;
    if (appState.stats.spouseAlert === 4) meetBase *= 0.65;

    meetBase = Math.max(0.25, Math.min(0.88, meetBase));

    if (isFirstMonthGuaranteed || Math.random() < meetBase) {
      const p1 = createSynthesizedPartner(mIdx, currentRealAge);
      p1.lastSexScore = calculateSexScore(p1, calMonth, isCrisisHappened, (prefProp.scoreBonus || 0));
      p1.maxSexScore = p1.lastSexScore;

      appState.sim.partners.push(p1);
      appState.sim.activePartnerIds.push(p1.id);
      appState.sim.totalPartnerCounter++;
      matchedPartners.push(p1);

      if (p1.startAge >= currentRealAge + 20) appState.sim.metOlder20Plus = true;
      if (p1.startAge <= currentRealAge - 20) appState.sim.metYounger20Plus = true;

      if (emptySlots >= 2) {
        let doubleRate = isUserMale
          ? (0.35 + (appState.stats.budget - 2) * 0.06 + (appState.stats.looks - 4) * 0.04)
          : (0.38 + (appState.stats.looks - 4) * 0.075);

        doubleRate = Math.max(0.25, Math.min(0.82, doubleRate));

        if (Math.random() < doubleRate) {
          const p2 = createSynthesizedPartner(mIdx, currentRealAge);
          p2.lastSexScore = calculateSexScore(p2, calMonth, isCrisisHappened, (prefProp.scoreBonus || 0));
          p2.maxSexScore = p2.lastSexScore;

          appState.sim.partners.push(p2);
          appState.sim.activePartnerIds.push(p2.id);
          appState.sim.totalPartnerCounter++;
          matchedPartners.push(p2);

          if (p2.startAge >= currentRealAge + 20) appState.sim.metOlder20Plus = true;
          if (p2.startAge <= currentRealAge - 20) appState.sim.metYounger20Plus = true;

          if (emptySlots >= 3 && Math.random() < (doubleRate * 0.45)) {
            const p3 = createSynthesizedPartner(mIdx, currentRealAge);
            p3.lastSexScore = calculateSexScore(p3, calMonth, isCrisisHappened, (prefProp.scoreBonus || 0));
            p3.maxSexScore = p3.lastSexScore;

            appState.sim.partners.push(p3);
            appState.sim.activePartnerIds.push(p3.id);
            appState.sim.totalPartnerCounter++;
            matchedPartners.push(p3);

            if (p3.startAge >= currentRealAge + 20) appState.sim.metOlder20Plus = true;
            if (p3.startAge <= currentRealAge - 20) appState.sim.metYounger20Plus = true;
          }
        }
      }
    }
  }

  if (!isSilent && matchedPartners.length > 0) {
    let baseDelay = (breakCandidate || lawsuitPartner) ? 2800 : 0;
    setTimeout(() => {
      if (typeof showNewPartnerToast === "function") showNewPartnerToast(matchedPartners[0], false);
      if (typeof playRareChime === "function") playRareChime();
      if (typeof triggerVibrate === "function") triggerVibrate([40, 50, 40]);
    }, baseDelay);

    if (matchedPartners.length > 1) {
      setTimeout(() => {
        if (typeof showNewPartnerToast === "function") showNewPartnerToast(matchedPartners[1], true);
        if (typeof playLimitBreakChime === "function") playLimitBreakChime();
        if (typeof triggerVibrate === "function") triggerVibrate([50, 60, 50, 60]);
      }, baseDelay + 2800);
    }
  }

  if (typeof renderAlertAndFlash === "function") renderAlertAndFlash(isCrisisHappened, isSilent);
  if (typeof updateMatrixDot === "function") updateMatrixDot(mIdx);
  if (typeof renderRealtimeMonthlyLog === "function") renderRealtimeMonthlyLog(mIdx, calMonth);
  if (typeof updateLiveStats === "function") updateLiveStats();
}
