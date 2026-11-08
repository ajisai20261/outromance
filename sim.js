/* ============================================================
   sim.js - OUTROMANCE コアシミュレーション（抜粋: createSynthesizedPartner部）
   ============================================================ */

function createSynthesizedPartner(startMonth, playerAge) {
  const isTargetMale = (appState.user.gender === "female");
  const prefix = isTargetMale ? "M" : "F";
  const targetGender = isTargetMale ? "male" : "female";
  const jobPool = isTargetMale ? MALE_JOBS_POOL : FEMALE_JOBS_POOL;
  const job = jobPool[Math.floor(Math.random() * jobPool.length)];

  const areaList = AREAS_NO_STATION.tokyo;
  const area = `東京・${areaList[Math.floor(Math.random() * areaList.length)]}`;

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

  // 【改修点】アバター固定セリフを廃止し、裏事情タグ×性別の動的ランダム抽選へ移行
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
