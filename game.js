/* ============================================================
   game.js - OUTROMANCE メインループ ＆ ライフサイクル制御
   ============================================================ */

const PixelAvatarEngine = {
  generate(idStr) {
    const cvs = document.createElement("canvas");
    cvs.width = 48; cvs.height = 48;
    const ctx = cvs.getContext("2d");
    const isMale = idStr.startsWith("M");
    const num = parseInt(idStr.slice(1)) || 1;
    const isSenior = (num === 17 || num === 18);

    ctx.fillStyle = isMale ? "#0d1b2a" : "#2b1022";
    ctx.fillRect(0, 0, 48, 48);

    const skinColors = ["#ffd7ba", "#fec89a", "#fcd5ce", "#f8edeb"];
    ctx.fillStyle = skinColors[num % skinColors.length];
    ctx.fillRect(14, 15, 20, 21);

    const hairColors = isSenior ? ["#cbd5e1", "#94a3b8", "#e2e8f0"] : (isMale ? ["#1e293b", "#334155", "#475569", "#78350f"] : ["#451a03", "#78350f", "#831843", "#172554"]);
    ctx.fillStyle = hairColors[num % hairColors.length];
    ctx.fillRect(12, 10, 24, 9);
    if (!isMale) { ctx.fillRect(10, 16, 4, 16); ctx.fillRect(34, 16, 4, 16); }

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(18, 22, 3, 4);
    ctx.fillRect(27, 22, 3, 4);

    ctx.fillStyle = isMale ? "#334155" : "#be185d";
    ctx.fillRect(8, 36, 32, 12);
    return cvs.toDataURL("image/png");
  }
};

const AvatarCacheManager = {
  cache: {},
  init() {
    const fSource = window.FEMALE_AVATARS_DATA || {};
    for (const [k, v] of Object.entries(fSource)) this.cache[k] = v;
    const mSource = window.MALE_AVATARS_DATA || {};
    for (const [k, v] of Object.entries(mSource)) this.cache[k] = v;
  },
  get(idStr) {
    if (!idStr) return PixelAvatarEngine.generate("F01");
    const clean = idStr.trim().toUpperCase();
    if (this.cache[clean]) return this.cache[clean];
    const generated = PixelAvatarEngine.generate(clean);
    this.cache[clean] = generated;
    return generated;
  },
  getMeta(idStr) {
    const meta = window.AVATARS_METADATA || {};
    return meta[idStr] || { label: "パートナー", cat: "normal", quote: "「秘密の時間を大切にしましょう。」" };
  }
};

let simTimer = null;
let simSpeedMs = 3000;

function toggleSpeed() {
  if (simSpeedMs === 3000) {
    simSpeedMs = 1500;
    document.getElementById("speedToggleBtn").innerText = "⏩ 2.0x";
    document.getElementById("stickySpeedText").innerText = "1.5秒/月 (早送り)";
  } else {
    simSpeedMs = 3000;
    document.getElementById("speedToggleBtn").innerText = "⏩ 1.0x";
    document.getElementById("stickySpeedText").innerText = "3.0秒/月 進行中";
  }
  triggerVibrate(15);
  if (!appState.sim.isPaused && !appState.sim.isSkipping) {
    clearTimeout(simTimer);
    simTimer = setTimeout(simulationTick, simSpeedMs);
  }
}

function startSimulation() {
  if (appState.tempPoints > 0) {
    autoAllocateRemainingPoints();
    renderStep1B();
  }

  AvatarCacheManager.init();
  appState.stats.maxPartners = parseInt(document.getElementById("userMaxConcurrent").value) || 2;
  appState.stats.targetAgePref = document.getElementById("targetAgePref").value;
  appState.sim.currentMonth = 0;
  appState.sim.currentAge = appState.user.startAge;
  appState.sim.lastMilestoneMonth = -1;
  appState.sim.isPaused = false;
  appState.sim.isSkipping = false;
  appState.sim.partners = [];
  appState.sim.activePartnerIds = [];
  appState.sim.totalPartnerCounter = 0;
  appState.sim.monthlyHistory = [];
  appState.sim.isRetired = false;
  appState.sim.isDivorced = false;
  appState.sim.globalMaxSexScore = 0;
  appState.sim.highestScorePartner = null;
  appState.sim.metOlder20Plus = false;
  appState.sim.metYounger20Plus = false;
  appState.sim.crisisCountIn2Years = 0;
  appState.sim.breakupCountIn2Years = 0;
  appState.sim.lawsuitCount = 0;

  document.getElementById("step1b").classList.add("hidden");
  document.getElementById("step2").classList.remove("hidden");
  document.getElementById("stickyController").classList.remove("hidden");
  document.getElementById("headerAssetBadge").classList.remove("hidden");
  updateLiveStats();
  window.scrollTo({ top: 0, behavior: "smooth" });

  initScreenTapHandler();
  refresh24MatrixGrid();
  startSimLoop();
}

function startSimLoop() {
  clearTimeout(simTimer);
  simTimer = setTimeout(simulationTick, simSpeedMs);
}

function pauseSimulationInternal() {
  clearTimeout(simTimer);
  appState.sim.isPaused = true;
  document.getElementById("pausePlayBtn").innerText = "▶️";
}

function resumeSimulationInternal() {
  appState.sim.isPaused = false;
  document.getElementById("pausePlayBtn").innerText = "⏸️";
  startSimLoop();
}

function togglePauseSimulation() {
  if (appState.sim.isPaused) resumeSimulationInternal();
  else pauseSimulationInternal();
}

function simulationTick() {
  if (appState.sim.isPaused) return;
  if (appState.sim.currentMonth >= 120) { finishSimulation(); return; }
  if (appState.sim.currentMonth > 0 && appState.sim.currentMonth % 24 === 0 && appState.sim.currentMonth !== appState.sim.lastMilestoneMonth) {
    pauseForTwoYearMilestone();
    return;
  }
  simulateOneMonth(false);
  if (appState.sim.isDivorced) return;
  appState.sim.currentMonth++;
  startSimLoop();
}

function skipToEndOfTwoYears() {
  pauseSimulationInternal();
  appState.sim.isSkipping = true;
  document.getElementById("flashOverlay").className = "fixed inset-0 pointer-events-none z-50 transition-colors";

  let nextMile = (Math.floor(appState.sim.currentMonth / 24) + 1) * 24;
  if (nextMile <= appState.sim.currentMonth) nextMile += 24;
  nextMile = Math.min(120, nextMile);

  while (appState.sim.currentMonth < nextMile) {
    simulateOneMonth(true);
    if (appState.sim.isDivorced) {
      appState.sim.isSkipping = false;
      return;
    }
    appState.sim.currentMonth++;
  }
  appState.sim.isSkipping = false;

  if (appState.sim.currentMonth % 24 === 0 && appState.sim.currentMonth < 120) pauseForTwoYearMilestone();
  else if (appState.sim.currentMonth >= 120) finishSimulation();
}

function triggerDivorceGameOver(mIdx, isSilent = false) {
  clearTimeout(simTimer);
  appState.sim.isDivorced = true;
  const overlay = document.getElementById("flashOverlay");
  overlay.classList.add("red-flash-active");
  playAlarm();
  triggerVibrate([200, 100, 200, 100, 200]);

  appState.sim.partners.forEach(p => {
    if (!p.endAge || appState.sim.activePartnerIds.includes(p.id)) {
      p.endMonth = mIdx;
      p.endAge = p.age;
    }
  });
  appState.sim.activePartnerIds = [];

  setTimeout(() => {
    document.getElementById("step2").classList.add("hidden");
    document.getElementById("stickyController").classList.add("hidden");
    document.getElementById("step3").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
    calculateAndRenderResult();
  }, isSilent ? 0 : 800);
}

function pauseForTwoYearMilestone() {
  pauseSimulationInternal();
  document.getElementById("flashOverlay").classList.remove("red-flash-active");
  closeClickDetail();

  const mIdx = appState.sim.currentMonth;
  appState.sim.lastMilestoneMonth = mIdx;
  const currentAge = getRealAge(mIdx);
  appState.sim.currentAge = currentAge;

  document.getElementById("twoYearSummaryTotal").innerText = `${appState.sim.partners.length}人`;
  const sortedByDur = [...appState.sim.partners].sort((a,b) => b.durationMonths - a.durationMonths);
  document.getElementById("twoYearSummaryLongest").innerText = sortedByDur[0] ? `${sortedByDur[0].durationMonths}ヶ月` : "0ヶ月";
  document.getElementById("twoYearSummaryScore").innerText = `${appState.sim.globalMaxSexScore} pt`;

  const youngest = [...appState.sim.partners].sort((a,b) => a.startAge - b.startAge)[0];
  const oldest = [...appState.sim.partners].sort((a,b) => b.startAge - a.startAge)[0];

  document.getElementById("twoYearSummaryYoungest").innerText = youngest ? `${youngest.startAge}歳` : "―";
  document.getElementById("twoYearSummaryOldest").innerText = oldest ? `${oldest.startAge}歳` : "―";

  const r = Math.random();
  let dropTotal = 2;
  if (r < 0.05) dropTotal = 0;
  else if (r < 0.30) dropTotal = 1;
  else if (r < 0.70) dropTotal = 2;
  else if (r < 0.95) dropTotal = 3;
  else dropTotal = 4;

  const prevLooks = appState.stats.looks;
  const prevStamina = appState.stats.stamina;
  const prevLibido = appState.stats.libido;
  let looksDrop = 0, staminaDrop = 0, libidoDrop = 0;
  const isFemale = (appState.user.gender === "female");

  if (isFemale) {
    let remain = dropTotal;
    looksDrop = Math.min(remain, Math.max(0, appState.stats.looks - 1));
    remain -= looksDrop;
    while (remain > 0) {
      if (appState.stats.stamina - staminaDrop > 1 && Math.random() < 0.5) staminaDrop++;
      else if (appState.stats.libido - libidoDrop > 1) libidoDrop++;
      else if (appState.stats.stamina - staminaDrop > 1) staminaDrop++;
      else break;
      remain--;
    }
  } else {
    for (let i = 0; i < dropTotal; i++) {
      const pick = Math.floor(Math.random() * 3);
      if (pick === 0 && appState.stats.looks - looksDrop > 1) looksDrop++;
      else if (pick === 1 && appState.stats.stamina - staminaDrop > 1) staminaDrop++;
      else if (pick === 2 && appState.stats.libido - libidoDrop > 1) libidoDrop++;
      else if (appState.stats.stamina - staminaDrop > 1) staminaDrop++;
    }
  }

  appState.stats.looks = Math.max(1, appState.stats.looks - looksDrop);
  appState.stats.stamina = Math.max(1, appState.stats.stamina - staminaDrop);
  appState.stats.libido = Math.max(1, appState.stats.libido - libidoDrop);

  document.getElementById("twoYearTotalDropText").innerText = `-${dropTotal} pt`;
  document.getElementById("dropDetailLooks").innerText = `${prevLooks} → ${appState.stats.looks}`;
  document.getElementById("dropDetailStamina").innerText = `${prevStamina} → ${appState.stats.stamina}`;
  document.getElementById("dropDetailLibido").innerText = `${prevLibido} → ${appState.stats.libido}`;

  let bonus = 0, penalty = 0;
  if (appState.sim.globalMaxSexScore >= 95) bonus++;
  if (appState.sim.crisisCountIn2Years >= 2) penalty++;
  if (appState.sim.breakupCountIn2Years >= 2) penalty++;

  const prevIncome = appState.stats.income;
  let incomeDelta = 0;
  const rollIncome = Math.random();

  if (!isFemale) {
    let pPlus2 = 0.03 + bonus * 0.03 - penalty * 0.02;
    let pPlus1 = 0.25 + bonus * 0.05 - penalty * 0.04;
    let pSame = 0.52;
    if (rollIncome < pPlus2) incomeDelta = 2;
    else if (rollIncome < pPlus2 + pPlus1) incomeDelta = 1;
    else if (rollIncome < pPlus2 + pPlus1 + pSame) incomeDelta = 0;
    else incomeDelta = -1;
  } else {
    let pPlus1 = 0.15 + bonus * 0.04 - penalty * 0.03;
    let pSame = 0.65;
    if (rollIncome < pPlus1) incomeDelta = 1;
    else if (rollIncome < pPlus1 + pSame) incomeDelta = 0;
    else incomeDelta = -1;
  }

  appState.stats.income = Math.max(2, Math.min(8, appState.stats.income + incomeDelta));
  document.getElementById("incomeChangeReport").innerText = `Lv.${prevIncome} → Lv.${appState.stats.income}`;

  appState.stats.budget = 0;
  const reallocPoints = Math.max(2, appState.stats.income + 1 + bonus - penalty);

  appState.twoYearTemp.points = reallocPoints;
  appState.twoYearTemp.budget = 0;
  appState.twoYearTemp.looks = appState.stats.looks;
  appState.twoYearTemp.stamina = appState.stats.stamina;
  appState.twoYearTemp.libido = appState.stats.libido;
  appState.twoYearTemp.spouseAlert = appState.stats.spouseAlert;
  appState.twoYearTemp.min_looks = appState.stats.looks;
  appState.twoYearTemp.min_stamina = appState.stats.stamina;
  appState.twoYearTemp.min_libido = appState.stats.libido;

  appState.sim.crisisCountIn2Years = 0;
  appState.sim.breakupCountIn2Years = 0;

  const yearIndex = (mIdx / 24) * 2;
  document.getElementById("twoYearHeaderTag").innerText = `${mIdx}ヶ月目の節目`;
  document.getElementById("twoYearTitle").innerText = `${yearIndex}年目の節目：${currentAge}歳の現在`;
  document.getElementById("twoYearMaxPartners").value = String(appState.stats.maxPartners || 2);
  document.getElementById("twoYearTargetAgePref").value = appState.stats.targetAgePref || "same";

  renderTwoYearModal();
  renderTwoYearChronicle(mIdx);
  document.getElementById("twoYearModal").classList.remove("hidden");
  if (isSoundOn) playTone(440, 0.2);
}

function resumeNextTwoYears() {
  if (appState.twoYearTemp.points > 0) {
    autoAllocateTwoYearPoints();
  }

  appState.stats.looks = appState.twoYearTemp.looks;
  appState.stats.stamina = appState.twoYearTemp.stamina;
  appState.stats.libido = appState.twoYearTemp.libido;
  appState.stats.budget = appState.twoYearTemp.budget;
  appState.stats.spouseAlert = appState.twoYearTemp.spouseAlert;

  appState.stats.maxPartners = parseInt(document.getElementById("twoYearMaxPartners").value) || 2;
  appState.stats.targetAgePref = document.getElementById("twoYearTargetAgePref").value;

  document.getElementById("twoYearModal").classList.add("hidden");
  updateLiveStats();
  refresh24MatrixGrid();
  resumeSimulationInternal();
}

function retireFromTwoYear() {
  clearTimeout(simTimer);
  document.getElementById("twoYearModal").classList.add("hidden");
  appState.sim.isRetired = true;
  const mIdx = appState.sim.currentMonth;
  appState.sim.partners.forEach(p => {
    if (appState.sim.activePartnerIds.includes(p.id)) {
      p.endMonth = mIdx;
      p.endAge = p.age;
    }
  });
  appState.sim.activePartnerIds = [];
  finishSimulation();
}

function finishSimulation() {
  clearTimeout(simTimer);
  const mIdx = appState.sim.currentMonth;
  appState.sim.partners.forEach(p => {
    if (!p.endAge || appState.sim.activePartnerIds.includes(p.id)) {
      p.endMonth = mIdx;
      p.endAge = p.age;
    }
  });
  appState.sim.activePartnerIds = [];

  document.getElementById("step2").classList.add("hidden");
  document.getElementById("stickyController").classList.add("hidden");
  document.getElementById("step3").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });

  calculateAndRenderResult();
}

function restartApp() {
  document.getElementById("step3").classList.add("hidden");
  document.getElementById("step0").classList.remove("hidden");
  document.getElementById("headerAssetBadge").classList.add("hidden");
  runCinematicPrologue();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initApp() {
  document.getElementById("stepDisclaimer").classList.remove("hidden");
  onPrefChange();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
