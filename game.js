/* ============================================================
   game.js - OUTROMANCE メインループ ＆ ライフサイクル制御（5年制）
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

function startSimulation() {
  AvatarCacheManager.init();

  appState.user.startAge = parseInt(document.getElementById("userAge")?.value) || 50;
  appState.stats.targetAgePref = document.getElementById("targetAgePref")?.value || "same";

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

  document.getElementById("step1b")?.classList.add("hidden");
  document.getElementById("step2")?.classList.remove("hidden");
  document.getElementById("headerControls")?.classList.remove("hidden");

  updateLiveStats();
  window.scrollTo({ top: 0, behavior: "smooth" });

  initScreenTapHandler();
  refresh12MatrixGrid();
  startSimLoop();
}

function startSimLoop() {
  clearTimeout(simTimer);
  simTimer = setTimeout(simulationTick, simSpeedMs);
}

function pauseSimulationInternal() {
  clearTimeout(simTimer);
  appState.sim.isPaused = true;
  const btn = document.getElementById("pausePlayBtn");
  if (btn) btn.innerText = "▶️";
}

function resumeSimulationInternal() {
  appState.sim.isPaused = false;
  const btn = document.getElementById("pausePlayBtn");
  if (btn) btn.innerText = "⏸️";
  startSimLoop();
}

function togglePauseSimulation() {
  if (appState.sim.isPaused) resumeSimulationInternal();
  else pauseSimulationInternal();
}

// 5年（60ヶ月）で終了、1年ごと（12, 24, 36, 48ヶ月）にマイルストーン
function simulationTick() {
  if (appState.sim.isPaused) return;

  if (appState.sim.currentMonth >= 60) {
    finishSimulation();
    return;
  }

  if (appState.sim.currentMonth > 0 && appState.sim.currentMonth % 12 === 0 && appState.sim.currentMonth !== appState.sim.lastMilestoneMonth) {
    pauseForYearlyMilestone();
    return;
  }

  simulateOneMonth(false);
  if (appState.sim.isDivorced) return;
  appState.sim.currentMonth++;
  startSimLoop();
}

// 1年後へスキップ
function skipToEndOfYear() {
  pauseSimulationInternal();
  appState.sim.isSkipping = true;
  const overlay = document.getElementById("flashOverlay");
  if (overlay) overlay.className = "fixed inset-0 pointer-events-none z-50 transition-colors";

  let nextMile = (Math.floor(appState.sim.currentMonth / 12) + 1) * 12;
  if (nextMile <= appState.sim.currentMonth) nextMile += 12;
  nextMile = Math.min(60, nextMile);

  while (appState.sim.currentMonth < nextMile) {
    simulateOneMonth(true);
    if (appState.sim.isDivorced) {
      appState.sim.isSkipping = false;
      return;
    }
    appState.sim.currentMonth++;
  }
  appState.sim.isSkipping = false;

  if (appState.sim.currentMonth % 12 === 0 && appState.sim.currentMonth < 60) {
    pauseForYearlyMilestone();
  } else if (appState.sim.currentMonth >= 60) {
    finishSimulation();
  }
}

function triggerDivorceGameOver(mIdx, isSilent = false) {
  clearTimeout(simTimer);
  appState.sim.isDivorced = true;
  const overlay = document.getElementById("flashOverlay");
  if (overlay) overlay.classList.add("red-flash-active");
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
    document.getElementById("step2")?.classList.add("hidden");
    document.getElementById("headerControls")?.classList.add("hidden");
    document.getElementById("step3")?.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
    calculateAndRenderResult();
  }, isSilent ? 0 : 800);
}

// 1年ごとの自動加齢・決算処理
function pauseForYearlyMilestone() {
  pauseSimulationInternal();
  const overlay = document.getElementById("flashOverlay");
  if (overlay) overlay.classList.remove("red-flash-active");
  closeClickDetail();

  const mIdx = appState.sim.currentMonth;
  appState.sim.lastMilestoneMonth = mIdx;
  const currentAge = getRealAge(mIdx);
  appState.sim.currentAge = currentAge;

  // 1年加齢によるステータス微減（1pt減少）
  const dropPick = Math.floor(Math.random() * 3);
  if (dropPick === 0 && appState.stats.looks > 2) appState.stats.looks--;
  else if (dropPick === 1 && appState.stats.stamina > 2) appState.stats.stamina--;
  else if (dropPick === 2 && appState.stats.libido > 2) appState.stats.libido--;

  // 本業年収水準の自然推移（たまに昇給）
  if (Math.random() < 0.25) {
    appState.stats.income = Math.min(7, appState.stats.income + 1);
  }

  // 自動リカバリー＆次期活動費チャージ
  const style = appState.user.selectedStyle || "balanced";
  if (style === "carnage") {
    appState.stats.budget = Math.min(10, appState.stats.income);
  } else if (style === "pure") {
    appState.stats.budget = 2;
    if (appState.stats.stamina < 8) appState.stats.stamina++;
  } else {
    appState.stats.budget = Math.max(2, appState.stats.income - 1);
  }

  renderYearlyMilestoneModal();
  document.getElementById("twoYearModal")?.classList.remove("hidden");
  if (isSoundOn) playTone(440, 0.2);
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

  document.getElementById("step2")?.classList.add("hidden");
  document.getElementById("headerControls")?.classList.add("hidden");
  document.getElementById("step3")?.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });

  calculateAndRenderResult();
}

function restartApp() {
  document.getElementById("step3")?.classList.add("hidden");
  document.getElementById("step0")?.classList.remove("hidden");
  runCinematicPrologue();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initApp() {
  document.getElementById("stepDisclaimer")?.classList.remove("hidden");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
