/* ============================================================
   sim.js - OUTROMANCE コアシミュレーション・計算ロジック
   ============================================================ */

let appState = {
  user: { name: "ユウスケ", gender: "male", pref: "tokyo", startAge: 40, birthMonth: 4 },
  stats: { looks: 4, libido: 4, stamina: 4, budget: 0, income: 4, childBurden: 5, spouseAffection: 5, spouseAlert: 3, targetAgePref: "same", maxPartners: 2 },
  tempPoints: 5,
  sim: {
    currentMonth: 0, currentAge: 40, isPaused: false, isSkipping: false,
    partners: [], activePartnerIds: [], totalPartnerCounter: 0,
    monthlyHistory: [], isRetired: false, isDivorced: false, lastMilestoneMonth: -1,
    globalMaxSexScore: 0, highestScorePartner: null,
    metOlder20Plus: false, metYounger20Plus: false,
    crisisCountIn2Years: 0, breakupCountIn2Years: 0, lawsuitCount: 0
  },
  twoYearTemp: { points: 5, looks: 4, libido: 4, stamina: 4, budget: 0, spouseAlert: 3 }
};

function getRealAge(mIdx) {
  const b = appState.user.birthMonth || 4;
  const startAge = appState.user.startAge || 40;
  if (b === 1) return startAge + Math.floor(mIdx / 12);
  return mIdx < b - 1 ? startAge : startAge + 1 + Math.floor((mIdx - (b - 1)) / 12);
}

function rollIncomeLevel() {
  const r = (Math.random() + Math.random() + Math.random() + Math.random()) / 4;
  return Math.max(2, Math.min(7, Math.round(2 + r * 5)));
}

function rollInitialStatsTotal() {
  const r = (Math.random() + Math.random() + Math.random() + Math.random()) / 4;
  return Math.max(10, Math.min(18, Math.round(10 + r * 8)));
}

function adjustStat(type, delta) {
  if (delta > 0) {
    if (appState.tempPoints <= 0) return;
    if (type === "budget") {
      if (appState.stats.budget >= 10) return;
      appState.stats.budget = Math.min(10, appState.stats.budget + 2);
      appState.tempPoints -= 1;
    } else {
      if (appState.stats[type] >= 10) return;
      appState.stats[type] += 1;
      appState.tempPoints -= 1;
    }
  } else {
    if (type === "budget") {
      if (appState.stats.budget <= 0) return;
      appState.stats.budget = Math.max(0, appState.stats.budget - 2);
      appState.tempPoints += 1;
    } else {
      if (appState.stats[type] <= 1) return;
      appState.stats[type] -= 1;
      appState.tempPoints += 1;
    }
  }
  renderStep1B();
  triggerVibrate(12);
}

function autoAllocateRemainingPoints() {
  if (appState.tempPoints <= 0) return;
  const isMale = (appState.user.gender === "male");
  const order = isMale ? ["budget", "stamina", "looks", "libido"] : ["stamina", "looks", "libido", "budget"];
  let loopCount = 0;
  while (appState.tempPoints > 0 && loopCount < 30) {
    let allocatedThisRound = false;
    for (const stat of order) {
      if (appState.tempPoints <= 0) break;
      if (stat === "budget") {
        if (appState.stats.budget < 10) {
          appState.stats.budget = Math.min(10, appState.stats.budget + 2);
          appState.tempPoints--;
          allocatedThisRound = true;
        }
      } else {
        if (appState.stats[stat] < 10) {
          appState.stats[stat]++;
          appState.tempPoints--;
          allocatedThisRound = true;
        }
      }
    }
    if (!allocatedThisRound) break;
    loopCount++;
  }
}

function autoAllocateTwoYearPoints() {
  if (appState.twoYearTemp.points <= 0) return;
  const isMale = (appState.user.gender === "male");
  const order = isMale ? ["budget", "stamina", "looks", "libido"] : ["stamina", "looks", "libido", "budget"];
  let loopCount = 0;
  while (appState.twoYearTemp.points > 0 && loopCount < 30) {
    let allocatedThisRound = false;
    for (const stat of order) {
      if (appState.twoYearTemp.points <= 0) break;
      if (stat === "budget") {
        if (appState.twoYearTemp.budget < 10) {
          appState.twoYearTemp.budget = Math.min(10, appState.twoYearTemp.budget + 2);
          appState.twoYearTemp.points--;
          allocatedThisRound = true;
        }
      } else {
        if (appState.twoYearTemp[stat] < 10) {
          appState.twoYearTemp[stat]++;
          appState.twoYearTemp.points--;
          allocatedThisRound = true;
        }
      }
    }
    if (!allocatedThisRound) break;
    loopCount++;
  }
}

function buyFamilyCare() {
  if (appState.twoYearTemp.points <= 0) return;
  if (appState.twoYearTemp.spouseAlert <= 1) return;

  appState.twoYearTemp.points -= 1;
  appState.twoYearTemp.spouseAlert = Math.max(1, appState.twoYearTemp.spouseAlert - 2);

  triggerVibrate(20);
  playRareChime();
  renderTwoYearModal();

  const btn = document.getElementById("btnFamilyCare");
  if (btn) {
    btn.classList.add("ring-2", "ring-white");
    setTimeout(() => btn.classList.remove("ring-2", "ring-white"), 300);
  }
}

function adjustTwoYearStat(type, delta) {
  if (delta > 0) {
    if (appState.twoYearTemp.points <= 0) return;
    if (type === "budget") {
      if (appState.twoYearTemp.budget >= 10) return;
      appState.twoYearTemp.budget = Math.min(10, appState.twoYearTemp.budget + 2);
      appState.twoYearTemp.points -= 1;
    } else {
      if (appState.twoYearTemp[type] >= 10) return;
      appState.twoYearTemp[type] += 1;
      appState.twoYearTemp.points -= 1;
    }
  } else {
    if (type === "budget") {
      if (appState.twoYearTemp.budget <= 0) return;
      appState.twoYearTemp.budget = Math.max(0, appState.twoYearTemp.budget - 2);
      appState.twoYearTemp.points += 1;
    } else {
      const minVal = appState.twoYearTemp["min_" + type] || 1;
      if (appState.twoYearTemp[type] <= minVal) return;
      appState.twoYearTemp[type] -= 1;
      appState.twoYearTemp.points += 1;
    }
  }
  renderTwoYearModal();
  triggerVibrate(12);
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
  if (month === 12 || month === 2 || month === 4 || month === 8 || month === appState.user.birthMonth) {
    eventBonus = 10 + Math.floor(Math.random() * 8);
  }
  const thrillBonus = isCrisis ? 15 : 0;
  return Math.max(10, Math.round(base + libidoBonus + masteryBonus + eventBonus + thrillBonus + prefBonus));
}

function createSynthesizedPartner(startMonth, playerAge) {
  const isTargetMale = (appState.user.gender === "female");
  const prefix = isTargetMale ? "M" : "F";
  const targetGender = isTargetMale ? "male" : "female";
  const jobPool = isTargetMale ? MALE_JOBS_POOL : FEMALE_JOBS_POOL;
  const job = jobPool[Math.floor(Math.random() * jobPool.length)];

  const prefKey = appState.user.pref;
  const areaList = AREAS_NO_STATION[prefKey] || AREAS_NO_STATION.tokyo;
  const prefNameMap = { tokyo: "東京", kanagawa: "神奈川", saitama: "埼玉", chiba: "千葉" };
  const area = `${prefNameMap[prefKey] || "東京"}・${areaList[Math.floor(Math.random() * areaList.length)]}`;

  let partnerAge = playerAge;
  const targetPref = appState.stats.targetAgePref;

  if (targetPref === "younger") {
    if (Math.random() < 0.70) partnerAge = Math.max(18, playerAge - Math.floor(3 + Math.random() * 6));
    else if (Math.random() < 0.60) partnerAge = Math.max(18, playerAge - Math.floor(9 + Math.random() * 10));
    else partnerAge = Math.max(18, playerAge - Math.floor(20 + Math.random() * 8));
  } else if (targetPref === "older") {
    if (Math.random() < 0.70) partnerAge = Math.min(85, playerAge + Math.floor(3 + Math.random() * 6));
    else if (Math.random() < 0.60) partnerAge = Math.min(85, playerAge + Math.floor(9 + Math.random() * 10));
    else partnerAge = Math.min(85, playerAge + Math.floor(20 + Math.random() * 8));
  } else {
    if (Math.random() < 0.75) partnerAge = Math.max(18, Math.min(85, playerAge + Math.floor(Math.random() * 7) - 3));
    else partnerAge = Math.max(18, Math.min(85, playerAge + Math.floor(Math.random() * 11) - 5));
  }

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
  const meta = AvatarCacheManager.getMeta(avatarId);

  const rChem = Math.random();
  let chemistry = "B";
  if (partnerAge >= 60) {
    if (rChem < 0.03) chemistry = "S";
    else if (rChem < 0.15) chemistry = "A";
    else if (rChem < 0.60) chemistry = "B";
    else chemistry = "C";
  } else {
    if (rChem < 0.12) chemistry = "S";
    else if (rChem < 0.35) chemistry = "A";
    else if (rChem < 0.78) chemistry = "B";
    else chemistry = "C";
  }

  const currentActive = appState.sim.partners.filter(p => appState.sim.activePartnerIds.includes(p.id));
  const usedColors = currentActive.map(p => p.color);
  const availableColor = PARTNER_COLORS.find(c => !usedColors.includes(c)) || PARTNER_COLORS[appState.sim.totalPartnerCounter % PARTNER_COLORS.length];

  return {
    id: "p_" + Date.now() + "_" + Math.floor(Math.random()*1000),
    name, job, area, avatarId, category, tag,
    quote: meta.quote,
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
    lastLine: ""
  };
}

function simulateOneMonth(isSilent = false) {
  const mIdx = appState.sim.currentMonth;
  const calMonth = (mIdx % 12) + 1;
  const yearNum = Math.floor(mIdx / 12) + 1;
  const currentRealAge = getRealAge(mIdx);
  appState.sim.currentAge = currentRealAge;

  document.getElementById("simCurrentAge").innerText = `${currentRealAge}歳（${yearNum}年目 ${calMonth}月）`;
  document.getElementById("stickyMonthText").innerText = `${currentRealAge}歳（${yearNum}年目 ${calMonth}月）`;

  let activePartners = appState.sim.partners.filter(p => appState.sim.activePartnerIds.includes(p.id));
  let isCrisisHappened = false;

  const stamina = appState.stats.stamina || 4;
  let alertUpChance = (stamina >= 7) ? 0.05 : (stamina <= 3 ? 0.18 : 0.10);

  if (activePartners.length >= 3 && Math.random() < alertUpChance) {
    appState.stats.spouseAlert = Math.min(5, appState.stats.spouseAlert + 1);
  }
  if (stamina <= 3 && activePartners.length >= 2 && Math.random() < 0.12) {
    appState.stats.spouseAlert = Math.min(5, appState.stats.spouseAlert + 1);
  }

  let alertDownChance = (stamina >= 7) ? 0.40 : (activePartners.length === 0 ? 0.30 : 0.08);
  if (Math.random() < alertDownChance) {
    appState.stats.spouseAlert = Math.max(1, appState.stats.spouseAlert - 1);
  }

  const prefProp = PREF_PROPERTIES[appState.user.pref] || PREF_PROPERTIES.tokyo;

  const activeCount = activePartners.length;
  let staminaProtection = (stamina - 4) * 0.018;
  let riskRate = (appState.stats.spouseAlert * 0.03) + (activeCount * 0.02) + (prefProp.crisisBonus || 0) - staminaProtection;
  riskRate = Math.max(0.005, Math.min(0.45, riskRate));

  if (Math.random() < riskRate && activeCount > 0) {
    isCrisisHappened = true;
    appState.sim.crisisCountIn2Years++;
  }

  const divorceChance = isCrisisHappened ? 0.33 : 0.06;
  if (appState.stats.spouseAlert >= 5 && Math.random() < divorceChance) {
    triggerDivorceGameOver(mIdx, isSilent);
    return;
  }

  const concurrentPenalty = { 1: 0.6, 2: 1.0, 3: 1.8, 4: 2.6 }[appState.stats.maxPartners] || 1.0;
  const isUserMale = (appState.user.gender === "male");

  activePartners.forEach(p => {
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

  let lawsuitPartner = null;
  for (const p of activePartners) {
    let lawsuitRate = 0.0033;
    if (p.tag === "冷えきり") lawsuitRate = 0.008;
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
    updateLiveStats();

    if (!isSilent) {
      showLawsuitToast(lawsuitPartner);
      playAlarm();
      triggerVibrate([100, 80, 100]);
    }
    activePartners = activePartners.filter(p => p.id !== lawsuitPartner.id);
  }

  let breakCandidate = null;
  let highestBreakRoll = 0;

  activePartners.forEach(p => {
    let breakRate = 0.07;
    if (p.chemistry === "S") breakRate = (appState.stats.libido >= 6) ? 0.015 : 0.03;
    else if (p.chemistry === "A") breakRate = 0.04;
    else if (p.chemistry === "C") breakRate = (appState.stats.libido >= 6) ? 0.32 : 0.22;

    if (isUserMale) {
      if (appState.stats.budget >= 6) breakRate *= 0.65;
      if (appState.stats.budget <= 2) breakRate *= 1.4;
    } else {
      if (appState.stats.looks >= 7) breakRate *= 0.6;
      if (appState.stats.looks <= 3) breakRate *= 1.4;
    }

    if (p.age >= currentRealAge + 10) breakRate *= 0.75;
    if (p.age <= currentRealAge - 10) breakRate *= 1.35;
    breakRate *= concurrentPenalty;

    if (p.tag === "夜間遠征" && appState.stats.budget <= 2) breakRate *= 1.5;
    if (p.tag === "割り切り") {
      breakRate *= 0.8;
      if (appState.stats.libido <= 3) breakRate *= 1.8;
    }

    breakRate += (prefProp.breakBonus || 0);
    breakRate = Math.max(0.008, breakRate);

    if (p.durationMonths >= 2) {
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
      showBreakupPartnerToast(breakCandidate, isUserMale, false);
      playBreakupChime();
      triggerVibrate([60, 40]);
    }
  }

  const maxAllowed = appState.stats.maxPartners || 2;
  let emptySlots = maxAllowed - appState.sim.activePartnerIds.length;
  let matchedPartners = [];

  if (emptySlots > 0 && appState.stats.spouseAlert < 5) {
    let meetBase = isUserMale ? 0.28 : 0.42;
    if (isUserMale) {
      meetBase += (appState.stats.budget - 4) * 0.05;
      meetBase += (appState.stats.looks - 5) * 0.02;
    } else {
      meetBase += (appState.stats.looks - 5) * 0.06;
      meetBase += (appState.stats.budget - 4) * 0.01;
    }

    if (appState.stats.targetAgePref === "younger") meetBase *= 0.65;
    if (appState.stats.targetAgePref === "older") meetBase *= 1.25;

    if (appState.stats.spouseAlert === 4) meetBase *= 0.5;

    meetBase += (prefProp.meetBonus || 0);
    meetBase = Math.max(0.12, Math.min(0.85, meetBase));

    if (Math.random() < meetBase) {
      const p1 = createSynthesizedPartner(mIdx, currentRealAge);
      appState.sim.partners.push(p1);
      appState.sim.activePartnerIds.push(p1.id);
      appState.sim.totalPartnerCounter++;
      matchedPartners.push(p1);

      if (p1.startAge >= currentRealAge + 20) appState.sim.metOlder20Plus = true;
      if (p1.startAge <= currentRealAge - 20) appState.sim.metYounger20Plus = true;

      if (emptySlots >= 2) {
        let doubleRate = 0.10;
        if (isUserMale) {
          if (appState.stats.budget >= 8) doubleRate += 0.20;
          else if (appState.stats.budget >= 6) doubleRate += 0.10;
          if (appState.stats.looks >= 7) doubleRate += 0.10;
        } else {
          if (appState.stats.looks >= 8) doubleRate += 0.25;
          else if (appState.stats.looks >= 6) doubleRate += 0.15;
          if (appState.stats.libido >= 7) doubleRate += 0.10;
        }

        if (Math.random() < doubleRate) {
          const p2 = createSynthesizedPartner(mIdx, currentRealAge);
          appState.sim.partners.push(p2);
          appState.sim.activePartnerIds.push(p2.id);
          appState.sim.totalPartnerCounter++;
          matchedPartners.push(p2);

          if (p2.startAge >= currentRealAge + 20) appState.sim.metOlder20Plus = true;
          if (p2.startAge <= currentRealAge - 20) appState.sim.metYounger20Plus = true;
        }
      }
    }
  }

  if (!isSilent && matchedPartners.length > 0) {
    let baseDelay = (breakCandidate || lawsuitPartner) ? 2800 : 0;
    setTimeout(() => {
      showNewPartnerToast(matchedPartners[0], false);
      playRareChime();
      triggerVibrate([40, 50, 40]);
    }, baseDelay);

    if (matchedPartners.length > 1) {
      setTimeout(() => {
        showNewPartnerToast(matchedPartners[1], true);
        playLimitBreakChime();
        triggerVibrate([50, 60, 50, 60]);
      }, baseDelay + 2800);
    }
  }

  renderAlertAndFlash(isCrisisHappened, isSilent);
  updateMatrixDot(mIdx);
  renderRealtimeMonthlyLog(mIdx, calMonth);

  document.getElementById("simActiveCount").innerText = `${appState.sim.activePartnerIds.length} / ${maxAllowed}人`;
  document.getElementById("simTotalPartners").innerText = `${appState.sim.totalPartnerCounter}人`;
}

function manualBreakup(partnerId, event) {
  if (event) event.stopPropagation();
  const p = appState.sim.partners.find(item => item.id === partnerId);
  if (!p) return;

  const mIdx = appState.sim.currentMonth;
  p.endMonth = mIdx;
  p.endAge = p.age;
  appState.sim.activePartnerIds = appState.sim.activePartnerIds.filter(pid => pid !== partnerId);
  appState.sim.breakupCountIn2Years++;

  let isTroubled = false;
  if (p.tag === "年下独身" && appState.stats.stamina < 7 && Math.random() < 0.50) {
    appState.stats.spouseAlert = Math.min(5, appState.stats.spouseAlert + 1);
    isTroubled = true;
  }

  showBreakupPartnerToast(p, appState.user.gender === "male", true, isTroubled);
  playBreakupChime();
  triggerVibrate([50, 40]);

  const calMonth = (mIdx % 12) + 1;
  updateMatrixDot(mIdx);
  renderRealtimeMonthlyLog(mIdx, calMonth);

  const maxAllowed = appState.stats.maxPartners || 2;
  document.getElementById("simActiveCount").innerText = `${appState.sim.activePartnerIds.length} / ${maxAllowed}人`;
}