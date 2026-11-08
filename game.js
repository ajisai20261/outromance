/* ============================================================
   game.js - OUTROMANCE ゲームループ・ライフサイクル制御（5年制完全版）
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  if (typeof initScreenTapHandler === "function") {
    initScreenTapHandler();
  }
});

// シミュレーション開始
function startSimulation() {
  initAudio();
  triggerVibrate(30);

  const startAgeVal = parseInt(document.getElementById("userAge")?.value || "40", 10);
  appState.user.startAge = startAgeVal;
  appState.stats.targetAgePref = document.getElementById("targetAgePref")?.value || "same";

  // シミュレーション進行用ステート初期化
  appState.sim.currentMonth = 0;
  appState.sim.currentAge = startAgeVal;
  appState.sim.isPaused = false;
  appState.sim.isSkipping = false;
  appState.sim.partners = [];
  appState.sim.activePartnerIds = [];
  appState.sim.totalPartnerCounter = 0;
  appState.sim.monthlyHistory = [];
  appState.sim.isRetired = false;
  appState.sim.isDivorced = false;
  appState.sim.lastMilestoneMonth = -1;
  appState.sim.globalMaxSexScore = 0;
  appState.sim.highestScorePartner = null;
  appState.sim.metOlder20Plus = false;
  appState.sim.metYounger20Plus = false;
  appState.sim.crisisCountIn2Years = 0;
  appState.sim.breakupCountIn2Years = 0;
  appState.sim.lawsuitCount = 0;

  // 画面遷移
  document.getElementById("step1b")?.classList.add("hidden");
  document.getElementById("step2")?.classList.remove("hidden");
  document.getElementById("headerControls")?.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });

  refresh12MatrixGrid();
  updateLiveStats();

  // 初月実行
  simulationTick();
}

// 1ヶ月分の進行ティック
function simulationTick() {
  clearTimeout(simTimer);
  if (appState.sim.isPaused || appState.sim.isRetired || appState.sim.isDivorced) return;

  const mIdx = appState.sim.currentMonth;

  // 5年完走判定（計60ヶ月 = 0〜59ヶ月終了時）
  if (mIdx >= 60) {
    finishSimulation();
    return;
  }

  // 1年（12ヶ月）ごとの決算マイルストーン判定（12, 24, 36, 48ヶ月終了時）
  if (mIdx > 0 && mIdx % 12 === 0 && appState.sim.lastMilestoneMonth !== mIdx) {
    appState.sim.lastMilestoneMonth = mIdx;
    pauseSimulationInternal();

    // 加齢に伴うステータス自然減衰処理
    applyYearlyAgingDecay();

    // 決算モーダル表示
    renderYearlyMilestoneModal();
    document.getElementById("twoYearModal")?.classList.remove("hidden");
    return;
  }

  // 1ヶ月のシミュレーション計算実行
  simulateOneMonth(false);

  // 翌月インデックスへ進める
  appState.sim.currentMonth++;

  // 次のティック予約（一時停止中でなければ）
  if (!appState.sim.isPaused && !appState.sim.isSkipping) {
    simTimer = setTimeout(simulationTick, simSpeedMs);
  }
}

// 加齢減衰（1年ごとの体力・外見等の微減衰）
function applyYearlyAgingDecay() {
  const currentAge = getRealAge(appState.sim.currentMonth);
  if (currentAge >= 45 && Math.random() < 0.35) {
    appState.stats.stamina = Math.max(2, appState.stats.stamina - 1);
  }
  if (currentAge >= 50 && Math.random() < 0.40) {
    appState.stats.looks = Math.max(2, appState.stats.looks - 1);
  }
  if (currentAge >= 55 && Math.random() < 0.30) {
    appState.stats.libido = Math.max(2, appState.stats.libido - 1);
  }
}

// 一時停止・再開の切り替え
function togglePauseSimulation() {
  initAudio();
  triggerVibrate(15);
  const btn = document.getElementById("pausePlayBtn");

  if (appState.sim.isPaused) {
    appState.sim.isPaused = false;
    if (btn) btn.innerText = "⏸️";
    simulationTick();
  } else {
    appState.sim.isPaused = true;
    clearTimeout(simTimer);
    if (btn) btn.innerText = "▶️";
  }
}

function pauseSimulationInternal() {
  appState.sim.isPaused = true;
  clearTimeout(simTimer);
  const btn = document.getElementById("pausePlayBtn");
  if (btn) btn.innerText = "▶️";
}

function resumeSimulationInternal() {
  appState.sim.isPaused = false;
  const btn = document.getElementById("pausePlayBtn");
  if (btn) btn.innerText = "⏸️";
  simulationTick();
}

// 1年後へスキップ（次の12ヶ月の節目または60ヶ月まで超高速シミュレート）
function skipToEndOfYear() {
  if (appState.sim.isSkipping) return;
  initAudio();
  triggerVibrate([30, 40, 50]);

  clearTimeout(simTimer);
  appState.sim.isSkipping = true;
  appState.sim.isPaused = false;

  const currentYearIdx = Math.floor(appState.sim.currentMonth / 12);
  const targetMonth = Math.min(60, (currentYearIdx + 1) * 12);

  while (appState.sim.currentMonth < targetMonth && !appState.sim.isDivorced) {
    simulateOneMonth(true);
    appState.sim.currentMonth++;
  }

  appState.sim.isSkipping = false;

  if (appState.sim.isDivorced) return;

  // 年次マイルストーンまたは完走へ合流
  if (appState.sim.currentMonth >= 60) {
    finishSimulation();
  } else {
    appState.sim.lastMilestoneMonth = appState.sim.currentMonth;
    pauseSimulationInternal();
    applyYearlyAgingDecay();
    renderYearlyMilestoneModal();
    document.getElementById("twoYearModal")?.classList.remove("hidden");
  }
}

// 離婚ゲームオーバー発生処理
function triggerDivorceGameOver(mIdx, isSilent = false) {
  clearTimeout(simTimer);
  appState.sim.isDivorced = true;
  appState.sim.isPaused = true;

  // 交際中のパートナー全員を強制関係解消
  appState.sim.partners.forEach(p => {
    if (appState.sim.activePartnerIds.includes(p.id)) {
      p.endMonth = mIdx;
      p.endAge = p.age;
    }
  });
  appState.sim.activePartnerIds = [];

  if (!isSilent) {
    playAlarm();
    triggerVibrate([150, 100, 150, 100, 200]);
  }

  finishSimulation();
}

// 5年完走または強制終了時の結果画面遷移
function finishSimulation() {
  clearTimeout(simTimer);
  appState.sim.isPaused = true;

  // 完走時に継続中だったパートナーの終了月を確定
  appState.sim.partners.forEach(p => {
    if (appState.sim.activePartnerIds.includes(p.id)) {
      p.endMonth = 60;
      p.endAge = p.age;
    }
  });

  // UI切り替え
  document.getElementById("step2")?.classList.add("hidden");
  document.getElementById("headerControls")?.classList.add("hidden");
  document.getElementById("twoYearModal")?.classList.add("hidden");
  document.getElementById("step3")?.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (typeof calculateAndRenderResult === "function") {
    calculateAndRenderResult();
  }

  if (typeof playRareChime === "function" && !appState.sim.isDivorced) {
    playRareChime();
  }
}

// もう一度最初からプレイする
function restartApp() {
  clearTimeout(simTimer);
  initAudio();
  triggerVibrate(20);

  // 初期画面（Step 1-A）へ巻き戻し
  document.getElementById("step3")?.classList.add("hidden");
  document.getElementById("step2")?.classList.add("hidden");
  document.getElementById("step1b")?.classList.add("hidden");
  document.getElementById("headerControls")?.classList.add("hidden");
  document.getElementById("step1a")?.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
