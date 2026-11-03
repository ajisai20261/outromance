/* ============================================================
   軽量内蔵フォールバックエンジン ＆ AvatarCacheManager
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

let isSoundOn = false;
let audioCtx = null;
let simTimer = null;
let simSpeedMs = 3000;

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

function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function toggleSound() {
  initAudio();
  isSoundOn = !isSoundOn;
  document.getElementById("soundIcon").innerText = isSoundOn ? "🔊" : "🔇";
  document.getElementById("soundText").innerText = isSoundOn ? "音響: ON" : "音響: OFF";
  
  const bgm = document.getElementById("bgmAudio");
  if (bgm) {
    if (isSoundOn) {
      bgm.volume = 0.35;
      bgm.play().catch(e => {});
    } else {
      bgm.pause();
    }
  }
  if (isSoundOn) playTone(587.33, 0.12);
}

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

function playTone(freq, duration, type="sine") {
  if (!isSoundOn || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch(e) {}
}

function playAlarm() { if (isSoundOn && audioCtx) playTone(180, 0.35, "sawtooth"); }
function playRareChime() {
  if (!isSoundOn || !audioCtx) return;
  playTone(523.25, 0.12, "triangle");
  setTimeout(() => playTone(659.25, 0.12, "triangle"), 90);
  setTimeout(() => playTone(783.99, 0.22, "triangle"), 180);
}
function playBreakupChime() {
  if (!isSoundOn || !audioCtx) return;
  playTone(440.00, 0.15, "sine");
  setTimeout(() => playTone(349.23, 0.25, "sine"), 120);
}
function playLimitBreakChime() {
  if (!isSoundOn || !audioCtx) return;
  playTone(587.33, 0.15, "triangle");
  setTimeout(() => playTone(739.99, 0.15, "triangle"), 80);
  setTimeout(() => playTone(880.00, 0.15, "triangle"), 160);
  setTimeout(() => playTone(1174.66, 0.35, "sine"), 240);
}

function triggerVibrate(pat) {
  if ("vibrate" in navigator) try { navigator.vibrate(pat); } catch(e) {}
}

function acceptDisclaimer() {
  initAudio();
  triggerVibrate(20);
  document.getElementById("stepDisclaimer").classList.add("hidden");
  document.getElementById("step0").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
  runCinematicPrologue();
}

let prologueStep = 0;
let prologueAutoTimer = null;

function runCinematicPrologue() {
  clearTimeout(prologueAutoTimer);
  prologueStep = 0;
  ["pText1", "pText2", "pText3", "pTitleCard", "pText4", "pActionBtn"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("visible");
  });
  const kvBg = document.getElementById("keyVisualBg");
  if (kvBg) {
    kvBg.classList.remove("dimmed");
    setTimeout(() => kvBg.classList.add("dimmed"), 800);
  }
  advancePrologue();
}

function advancePrologue(e) {
  if (e) e.stopPropagation();
  clearTimeout(prologueAutoTimer);
  prologueStep++;
  if (prologueStep === 1) document.getElementById("pText1")?.classList.add("visible");
  else if (prologueStep === 2) document.getElementById("pText2")?.classList.add("visible");
  else if (prologueStep === 3) document.getElementById("pText3")?.classList.add("visible");
  else if (prologueStep === 4) document.getElementById("pTitleCard")?.classList.add("visible");
  else if (prologueStep === 5) document.getElementById("pText4")?.classList.add("visible");
  else if (prologueStep >= 6) {
    document.getElementById("pActionBtn")?.classList.add("visible");
    return;
  }
  prologueAutoTimer = setTimeout(() => advancePrologue(), 1300);
}

function goToStep1A(e) {
  if (e) e.stopPropagation();
  initAudio();
  if (isSoundOn) playTone(440, 0.15);
  triggerVibrate(20);
  document.getElementById("step0").classList.add("hidden");
  document.getElementById("step1a").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function onGenderChange() {
  const g = document.getElementById("userGender").value;
  if (g === "female") {
    document.getElementById("userName").value = "マイ";
    document.getElementById("lblBudgetDesc").innerText = "女性は活動費の効果は控えめ（外見が絶大な効果）";
  } else {
    document.getElementById("userName").value = "ユウスケ";
    document.getElementById("lblBudgetDesc").innerText = "男性は出会い・継続に絶大な効果（活動費必須）";
  }
}

function updateConcurrentDesc() {
  const val = document.getElementById("userMaxConcurrent").value;
  const descMap = { "1": "一途・破局率激減", "2": "分散満喫", "3": "多重密会", "4": "限界突破・100人斬り狙い" };
  document.getElementById("lblConcurrentDesc").innerText = descMap[val] || "";
}

function rollIncomeLevel() {
  const r = (Math.random() + Math.random() + Math.random() + Math.random()) / 4;
  return Math.max(2, Math.min(7, Math.round(2 + r * 5)));
}

function rollInitialStatsTotal() {
  const r = (Math.random() + Math.random() + Math.random() + Math.random()) / 4;
  return Math.max(10, Math.min(18, Math.round(10 + r * 8)));
}

function goToStep1B() {
  appState.user.name = document.getElementById("userName").value.trim() || "名無し";
  appState.user.gender = document.getElementById("userGender").value;
  appState.user.pref = document.getElementById("userPref").value;
  appState.user.startAge = parseInt(document.getElementById("userAge").value);
  appState.user.birthMonth = parseInt(document.getElementById("userBirthMonth").value);

  onGenderChange();
  rerollStats();

  document.getElementById("step1a").classList.add("hidden");
  document.getElementById("step1b").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function applyStylePreset(presetType) {
  initAudio();
  triggerVibrate(15);
  if (isSoundOn) playTone(659.25, 0.1);

  const pBtns = {
    pure: document.getElementById("presetBtnPure"),
    balanced: document.getElementById("presetBtnBalanced"),
    carnage: document.getElementById("presetBtnCarnage")
  };
  Object.keys(pBtns).forEach(k => {
    if (!pBtns[k]) return;
    if (k === presetType) {
      pBtns[k].className = "p-2 sm:p-2.5 rounded-xl border text-left transition-all bg-purple-950/60 border-purple-500 ring-1 ring-purple-500/50 scale-[1.02]";
    } else {
      pBtns[k].className = "p-2 sm:p-2.5 rounded-xl border text-left transition-all bg-slate-900 border-slate-700/80 hover:border-purple-500 opacity-80 scale-100";
    }
  });

  const isMale = (appState.user.gender === "male");
  const concSelect = document.getElementById("userMaxConcurrent");
  const agePrefSelect = document.getElementById("targetAgePref");

  appState.tempPoints = appState.stats.income + 1;
  appState.stats.budget = 0;
  appState.stats.looks = appState.baseLooks || 4;
  appState.stats.libido = appState.baseLibido || 4;
  appState.stats.stamina = appState.baseStamina || 4;

  if (presetType === "pure") {
    concSelect.value = "1";
    agePrefSelect.value = "same";
    while (appState.tempPoints > 0) {
      if (appState.stats.stamina < 9) { appState.stats.stamina++; appState.tempPoints--; }
      else if (appState.stats.looks < 9) { appState.stats.looks++; appState.tempPoints--; }
      else if (appState.stats.libido < 9) { appState.stats.libido++; appState.tempPoints--; }
      else break;
    }
  } else if (presetType === "carnage") {
    concSelect.value = "4";
    agePrefSelect.value = isMale ? "younger" : "same";
    if (isMale) {
      while (appState.tempPoints > 0 && appState.stats.budget < 10) {
        appState.stats.budget = Math.min(10, appState.stats.budget + 2);
        appState.tempPoints--;
      }
      while (appState.tempPoints > 0) {
        if (appState.stats.stamina < 9) { appState.stats.stamina++; appState.tempPoints--; }
        else if (appState.stats.looks < 9) { appState.stats.looks++; appState.tempPoints--; }
        else break;
      }
    } else {
      while (appState.tempPoints > 0 && appState.stats.looks < 10) {
        appState.stats.looks++;
        appState.tempPoints--;
      }
      while (appState.tempPoints > 0) {
        if (appState.stats.stamina < 9) { appState.stats.stamina++; appState.tempPoints--; }
        else if (appState.stats.libido < 9) { appState.stats.libido++; appState.tempPoints--; }
        else break;
      }
    }
  } else {
    concSelect.value = "2";
    agePrefSelect.value = "same";
    if (isMale && appState.tempPoints >= 2) {
      appState.stats.budget = Math.min(10, appState.stats.budget + 2);
      appState.tempPoints--;
    }
    autoAllocateRemainingPoints();
  }

  updateConcurrentDesc();
  renderStep1B();
}

function rerollStats() {
  const income = rollIncomeLevel();
  appState.stats.income = income;
  appState.tempPoints = income + 1;

  const totalTarget = rollInitialStatsTotal();
  let remain = totalTarget - 9;
  appState.stats.looks = 3;
  appState.stats.libido = 3;
  appState.stats.stamina = 3;

  while (remain > 0) {
    const pick = Math.floor(Math.random() * 3);
    if (pick === 0 && appState.stats.looks < 9) { appState.stats.looks++; remain--; }
    else if (pick === 1 && appState.stats.libido < 9) { appState.stats.libido++; remain--; }
    else if (pick === 2 && appState.stats.stamina < 9) { appState.stats.stamina++; remain--; }
    else {
      if (appState.stats.stamina < 9) { appState.stats.stamina++; remain--; }
      else if (appState.stats.looks < 9) { appState.stats.looks++; remain--; }
      else if (appState.stats.libido < 9) { appState.stats.libido++; remain--; }
      else break;
    }
  }

  appState.baseLooks = appState.stats.looks;
  appState.baseLibido = appState.stats.libido;
  appState.baseStamina = appState.stats.stamina;

  appState.stats.budget = 0;
  appState.stats.childBurden = Math.max(2, Math.min(8, 10 - Math.floor((appState.user.startAge - 35) / 3)));
  appState.stats.spouseAffection = 5;
  appState.stats.spouseAlert = 3;

  applyStylePreset('balanced');
  if (isSoundOn) playTone(523.25, 0.12);
}

function renderStep1B() {
  document.getElementById("remainPoints").innerText = appState.tempPoints;
  document.getElementById("valBudget").innerText = "Lv." + appState.stats.budget;
  document.getElementById("barBudget").style.width = (appState.stats.budget * 10) + "%";

  document.getElementById("valLooks").innerText = appState.stats.looks + " / 10";
  document.getElementById("barLooks").style.width = (appState.stats.looks * 10) + "%";

  document.getElementById("valLibido").innerText = appState.stats.libido + " / 10";
  document.getElementById("barLibido").style.width = (appState.stats.libido * 10) + "%";

  document.getElementById("valStamina").innerText = appState.stats.stamina + " / 10";
  document.getElementById("barStamina").style.width = (appState.stats.stamina * 10) + "%";

  document.getElementById("lblStatsTotal").innerText = (appState.stats.looks + appState.stats.libido + appState.stats.stamina);
  document.getElementById("lblIncome").innerText = "Lv." + appState.stats.income;
  document.getElementById("lblChildBurden").innerText = "Lv." + appState.stats.childBurden;
  document.getElementById("lblSpouseAffection").innerText = "Lv." + appState.stats.spouseAffection;
  document.getElementById("lblSpouseAlert").innerText = "Lv." + appState.stats.spouseAlert;
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

function updateLiveStats() {
  document.getElementById("liveStatLooks").innerText = `${appState.stats.looks}`;
  document.getElementById("liveStatStamina").innerText = `${appState.stats.stamina}`;
  document.getElementById("liveStatLibido").innerText = `${appState.stats.libido}`;
  document.getElementById("liveStatBudget").innerText = `Lv.${appState.stats.budget}`;
  document.getElementById("headerAssetVal").innerText = `Lv.${appState.stats.income}`;
  document.getElementById("statSummaryText").innerText = `本業年収水準: Lv.${appState.stats.income}`;
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

let tapStartX = 0, tapStartY = 0;
let isTapInitialized = false;
let lastTapAdvanceTime = 0;

function initScreenTapHandler() {
  if (isTapInitialized) return;
  isTapInitialized = true;

  document.addEventListener("pointerdown", e => {
    tapStartX = e.clientX;
    tapStartY = e.clientY;
  });
  document.addEventListener("pointerup", e => {
    const step2 = document.getElementById("step2");
    if (!step2 || step2.classList.contains("hidden")) return;
    if (e.target.closest("button, select, input, a, #twoYearModal, #clickMonthDetail, [id^='grid-dot-']")) return;
    const dx = Math.abs(e.clientX - tapStartX);
    const dy = Math.abs(e.clientY - tapStartY);
    if (dx < 10 && dy < 10) triggerScreenTapAdvance();
  });
}

function triggerScreenTapAdvance() {
  if (appState.sim.isPaused || appState.sim.isSkipping) return;

  const now = performance.now();
  if (now - lastTapAdvanceTime < 250) return;
  lastTapAdvanceTime = now;

  clearTimeout(simTimer);
  simulationTick();
}

function refresh24MatrixGrid() {
  const cycleIndex = Math.floor(appState.sim.currentMonth / 24);
  const startYearNum = cycleIndex * 2 + 1;
  const endYearNum = startYearNum + 1;
  const userBirthMonth = appState.user.birthMonth || 4;

  document.getElementById("matrixPhaseTitle").innerText = `第${cycleIndex + 1}期：${startYearNum}〜${endYearNum}年目（${cycleIndex * 24 + 1}〜${(cycleIndex + 1) * 24}ヶ月）`;
  document.getElementById("matrixRow1Label").innerText = `${startYearNum}年目`;
  document.getElementById("matrixRow2Label").innerText = `${endYearNum}年目`;

  const r1 = document.getElementById("matrixGridRow1");
  const r2 = document.getElementById("matrixGridRow2");
  r1.innerHTML = "";
  r2.innerHTML = "";

  for (let i = 0; i < 24; i++) {
    const absMonth = cycleIndex * 24 + i;
    const calMonth = (i % 12) + 1;

    const dot = document.createElement("div");
    dot.id = "grid-dot-" + i;
    dot.className = "w-full aspect-square rounded-full transition-all duration-300 cursor-pointer hover:scale-125 flex items-center justify-center p-[2px] bg-slate-800 border border-slate-700/60";
    dot.onclick = (e) => { e.stopPropagation(); showClickMonthDetail(absMonth); };

    const centerCircle = document.createElement("div");
    centerCircle.className = "w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-[9px] select-none";
    const monthEmoji = (calMonth === userBirthMonth) ? "🎂" : (MONTH_EMOJIS[calMonth] || "🌸");
    centerCircle.innerText = monthEmoji;
    dot.appendChild(centerCircle);

    if (i < 12) r1.appendChild(dot);
    else r2.appendChild(dot);
  }
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

function showNewPartnerToast(p, isDouble = false) {
  const toast = document.getElementById("newPartnerToast");
  if (!toast) return;
  document.getElementById("toastPartnerImg").src = AvatarCacheManager.get(p.avatarId);
  document.getElementById("toastPartnerName").innerText = `${p.name} (${p.startAge}歳)`;
  document.getElementById("toastPartnerAreaJob").innerText = `${p.area} ｜ ${p.job}`;
  document.getElementById("toastPartnerChem").innerText = `相性 ${p.chemistry}`;

  document.getElementById("toastHeaderTitle").innerText = isDouble ? "✨ DOUBLE MATCHED! (2/2)" : "💖 NEW PARTNER MATCHED!";

  const badgeEl = document.getElementById("toastPartnerBadge");
  let badges = `<span class="px-1.5 py-0.2 text-[9px] bg-indigo-950 text-indigo-300 rounded border border-indigo-700/60 font-bold">🏷️${p.tag}</span>`;
  if (p.category === "senior") badges += ' <span class="px-1.5 py-0.2 text-[9px] bg-purple-900 text-purple-200 rounded border border-purple-500/40 font-bold">シニア</span>';
  else if (p.category === "youth") badges += ' <span class="px-1.5 py-0.2 text-[9px] bg-emerald-900 text-emerald-200 rounded border border-emerald-500/30 font-bold">若手</span>';
  badgeEl.innerHTML = badges;

  document.getElementById("toastPartnerQuote").innerText = p.quote || "「はじめまして。落ち着いてお話しできる大人の関係になれたら嬉しいです。」";
  toast.classList.remove("hidden");
  setTimeout(() => { toast.classList.remove("scale-95", "opacity-0"); toast.classList.add("scale-100", "opacity-100"); }, 10);
  setTimeout(() => {
    toast.classList.remove("scale-100", "opacity-100");
    toast.classList.add("scale-95", "opacity-0");
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, 3200);
}

function showBreakupPartnerToast(p, isUserMale, isManual = false, isTroubled = false) {
  const toast = document.getElementById("breakupPartnerToast");
  if (!toast) return;
  document.getElementById("toastBreakupImg").src = AvatarCacheManager.get(p.avatarId);
  document.getElementById("toastBreakupName").innerText = `${p.name} (${p.age}歳)`;
  document.getElementById("toastBreakupPeriod").innerText = `${p.durationMonths}ヶ月で関係解消`;

  if (isManual) {
    document.getElementById("toastBreakupTag").innerText = isTroubled ? "⚠️ FADEOUT（別れ話で揉めて怪しまれた！）" : "👋 FADEOUT（自ら手放した逢瀬）";
    const quote = isTroubled
      ? "「本気だったのに嘘つき！家庭にバラしてやる！」と激昂され、背筋が凍った。"
      : MANUAL_BREAKUP_QUOTES[Math.floor(Math.random() * MANUAL_BREAKUP_QUOTES.length)];
    document.getElementById("toastBreakupQuote").innerText = quote;
  } else {
    document.getElementById("toastBreakupTag").innerText = "🍂 PARTNER BREAKUP（逢瀬の終焉）";
    const quotePool = isUserMale ? BREAKUP_QUOTES_FEMALE_PARTNER : BREAKUP_QUOTES_MALE_PARTNER;
    const quote = quotePool[Math.floor(Math.random() * quotePool.length)];
    document.getElementById("toastBreakupQuote").innerText = quote;
  }

  toast.classList.remove("hidden");
  setTimeout(() => { toast.classList.remove("scale-95", "opacity-0"); toast.classList.add("scale-100", "opacity-100"); }, 10);
  setTimeout(() => {
    toast.classList.remove("scale-100", "opacity-100");
    toast.classList.add("scale-95", "opacity-0");
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, 3200);
}

function showLawsuitToast(p) {
  const toast = document.getElementById("lawsuitToast");
  if (!toast) return;
  document.getElementById("toastLawsuitPartnerName").innerText = `${p.name} (${p.age}歳) の配偶者に発覚`;
  toast.classList.remove("hidden");
  setTimeout(() => { toast.classList.remove("scale-95", "opacity-0"); toast.classList.add("scale-100", "opacity-100"); }, 10);
  setTimeout(() => {
    toast.classList.remove("scale-100", "opacity-100");
    toast.classList.add("scale-95", "opacity-0");
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, 3600);
}

function renderAlertAndFlash(isCrisis, isSilent = false) {
  const alertBadge = document.getElementById("alertStateText");
  const alertLv = appState.stats.spouseAlert;

  if (alertLv >= 5) {
    alertBadge.innerText = "🚨 離婚危機・監視MAX";
    alertBadge.className = "text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500 font-black animate-ping";
    document.getElementById("spouseStatusLabel").innerText = "配偶者と冷戦・修羅場中";
    document.getElementById("spouseSituationLog").innerText = "家庭内は完全な臨戦態勢。スマホの着信音ひとつで怒号が飛ぶ極限状態。";
  } else if (isCrisis || alertLv === 4) {
    if (!isSilent && !appState.sim.isSkipping && !appState.sim.isPaused) {
      const overlay = document.getElementById("flashOverlay");
      overlay.classList.add("red-flash-active");
      setTimeout(() => overlay.classList.remove("red-flash-active"), 650);
      playAlarm();
      triggerVibrate([100, 50, 100]);
    }
    alertBadge.innerText = "⚠️ 身バレ危機！";
    alertBadge.className = "text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 animate-pulse";
    const spouseEvents = [
      `休日の夕方、スマホのポップアップ通知を配偶者に凝視され冷や汗が流れた。`,
      `「最近、残業や怪しい用事多くない？」と配偶者から真顔で問い詰められた。`,
      `手帳のスケジュール帳を見咎められ、必死に仕事の言い訳を重ねた。`
    ];
    document.getElementById("spouseSituationLog").innerText = spouseEvents[Math.floor(Math.random() * spouseEvents.length)];
  } else {
    const activeCount = appState.sim.activePartnerIds.length;
    alertBadge.innerText = (activeCount > 2) ? "多忙密会" : "平穏";
    alertBadge.className = "text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40";
    document.getElementById("spouseSituationLog").innerText = "配偶者は平穏に日常を過ごしている。怪しまれる様子はない。";
  }
}

function updateMatrixDot(mIdx) {
  const dotIndex = mIdx % 24;
  const dot = document.getElementById("grid-dot-" + dotIndex);
  if (!dot) return;

  for (let i = 0; i < 24; i++) {
    const d = document.getElementById("grid-dot-" + i);
    if (d) d.classList.remove("ring-pulse-rare");
  }

  const currentPartners = appState.sim.partners.filter(p => appState.sim.activePartnerIds.includes(p.id));
  if (currentPartners.length === 0) {
    dot.style.background = "#1e293b";
  } else if (currentPartners.length === 1) {
    dot.style.background = currentPartners[0].color;
  } else {
    const step = 100 / currentPartners.length;
    let grad = "conic-gradient(";
    currentPartners.forEach((p, idx) => { grad += `${p.color} ${idx * step}% ${(idx + 1) * step}%, `; });
    dot.style.background = grad.slice(0, -2) + ")";
  }
  dot.classList.add("ring-pulse-rare");
}

function renderRealtimeMonthlyLog(mIdx, calMonth) {
  const seasons = ["", "新春の気配", "初春・バレンタイン", "桃の節句・春の兆し", "夜桜の季節", "初夏の大型連休", "梅雨の雨宿り", "盛夏の気配", "お盆の帰省・酷暑", "初秋の哀愁", "秋晴れ・味覚", "木枯らしの街角", "聖夜・年末の慌ただしさ"];
  const userBirthMonth = appState.user.birthMonth || 4;
  
  if (calMonth === userBirthMonth) {
    document.getElementById("seasonBadge").innerText = `🎂 ${calMonth}月（誕生月）`;
  } else {
    document.getElementById("seasonBadge").innerText = `${MONTH_EMOJIS[calMonth] || "🌸"} ${calMonth}月`;
  }
  document.getElementById("monthTitleLog").innerText = seasons[calMonth];

  const listContainer = document.getElementById("currentMonthPartnersLog");
  const currentPartners = appState.sim.partners.filter(p => appState.sim.activePartnerIds.includes(p.id));

  if (currentPartners.length === 0) {
    listContainer.innerHTML = `<div class="text-xs text-slate-500 italic py-2.5 text-center">今月はアポなし。家庭と仕事に専念中……</div>`;
    return;
  }

  let html = "";
  const usedTexts = new Set();
  const monthLogRecord = [];

  currentPartners.forEach(p => {
    const actionText = generateMonthlyActionText(p, calMonth, usedTexts);
    usedTexts.add(actionText);

    const score = p.lastSexScore;
    let scoreBadge = "";
    if (score >= 120) {
      scoreBadge = `<span class="limit-break-badge bg-gradient-to-r from-amber-400 via-pink-400 to-purple-400 text-slate-950 font-black px-1.5 py-0.5 rounded text-[9.5px] sm:text-[10px] shadow-lg flex-shrink-0">⚡${score}pt</span>`;
      if (!appState.sim.isSkipping) playLimitBreakChime();
    } else if (score >= 100) {
      scoreBadge = `<span class="bg-amber-950 text-amber-300 border border-amber-600 font-bold px-1.5 py-0.5 rounded text-[9.5px] sm:text-[10px] flex-shrink-0">${score}pt</span>`;
    } else if (score >= 80) {
      scoreBadge = `<span class="bg-pink-950 text-pink-300 border border-pink-700 font-bold px-1.5 py-0.5 rounded text-[9.5px] sm:text-[10px] flex-shrink-0">${score}pt</span>`;
    } else {
      scoreBadge = `<span class="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[9.5px] sm:text-[10px] flex-shrink-0">${score}pt</span>`;
    }

    let catBadge = `<span class="px-1.5 py-0.5 text-[9px] bg-indigo-950 text-indigo-300 rounded border border-indigo-700/60 font-bold">🏷️${p.tag}</span>`;
    if (p.category === "senior") catBadge += ' <span class="px-1.5 py-0.5 text-[9px] bg-purple-900 text-purple-200 rounded border border-purple-500/30 font-bold">シニア</span>';
    if (p.category === "youth") catBadge += ' <span class="px-1.5 py-0.5 text-[9px] bg-emerald-900 text-emerald-200 rounded border border-emerald-500/30 font-bold">若手</span>';

    monthLogRecord.push({ id: p.id, name: p.name, avatarId: p.avatarId, color: p.color, action: actionText, score, tag: p.tag });
    const avatarSrc = AvatarCacheManager.get(p.avatarId);

    html += `
      <div class="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-2.5 text-xs">
        <div class="avatar-frame mt-0.5"><img src="${avatarSrc}" alt="${p.name}"></div>
        <div class="flex-1 min-w-0 space-y-1">
          <div class="flex items-center justify-between gap-1">
            <div class="flex items-center gap-1.5 min-w-0 truncate">
              <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${p.color}"></span>
              <span class="font-bold text-slate-200 text-xs sm:text-[13px] truncate">${p.name}</span>
              <span class="text-[10px] text-purple-300 truncate">(${p.age}歳 / ${p.area})</span>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0 ml-1">
              ${scoreBadge}
              <button type="button" onclick="manualBreakup('${p.id}', event)" title="関係を解消する" class="px-1.5 py-0.5 rounded text-[9.5px] bg-slate-800 hover:bg-rose-900/80 border border-slate-700 hover:border-rose-600 text-slate-300 hover:text-rose-200 transition active:scale-95 flex items-center gap-0.5 flex-shrink-0">
                <span>👋</span><span>別れる</span>
              </button>
            </div>
          </div>
          <div class="flex items-center gap-1 flex-wrap">
            ${catBadge}
          </div>
          <div class="text-slate-300 text-[10.5px] sm:text-[11px] leading-snug break-words">${actionText}</div>
        </div>
      </div>
    `;
  });
  listContainer.innerHTML = html;
  appState.sim.monthlyHistory[mIdx] = { month: mIdx, calMonth, partners: monthLogRecord };
}

function generateMonthlyActionText(partner, month, usedTexts = new Set()) {
  let pool = [];
  const userPref = appState.user.pref || "tokyo";
  const userBirthMonth = appState.user.birthMonth || 4;
  const isRemoteDate = (partner.tag === "夜間遠征") ? (Math.random() < 0.30) : (Math.random() < 0.15);

  if (partner.durationMonths <= 2) {
    if (userPref === "kanagawa") {
      pool = [
        "初アポ。たまプラの落ち着いたカフェで、人目を気にしつつ乾杯。",
        "あざみ野の静かな住宅街の隠れ家和食。指輪を外した日焼け跡を見つめ合う。",
        "初ホテル。二子玉川から田園都市線で少し移動し、誰にも言えない午後へ。",
        "みなとみらいの海風を感じるバーで合流。「怪しい人じゃなくて安心した」と笑い合う。",
        "武蔵小杉のカフェで短時間ランチ。お互いの家庭の詮索はしないルールで抱き合った."
      ];
    } else if (userPref === "saitama") {
      pool = [
        "初アポ。大宮駅東口の落ち着いた個室で安堵の笑顔。",
        "浦和の閑静な和食ランチ。「知り合いに見つかりにくいね」と笑い合う。",
        "初ホテル。湘南新宿ラインで新宿まで足を伸ばし、歌舞伎町を避けてホテルへ。",
        "戸田の静かなホテルデイユース。平日の静けさの中で抱き合った."
      ];
    } else if (userPref === "chiba") {
      pool = [
        "初アポ。西船橋の個室ダイニングで秘密の乾杯。",
        "幕張ベイエリアのテラス席で待ち合わせ。穏やかな笑顔に惹かれる。",
        "初ホテル。東西線で都内方面へ移動し、人目を忍んでデイユースへ。",
        "新浦安の静かなホテルラウンジから、そのまま人目のない客室へ."
      ];
    } else {
      pool = [
        "初アポ。三軒茶屋の路地裏個室バルで乾杯。渋谷を避けるのが二人の暗黙ルール。",
        "二子玉川のテラス席で平日ランチ。そのまま隣駅の静かなデイユースへ。",
        "初ホテル。神楽坂の静かな隠れ家ホテルで、お互いの家庭を詮索せず抱き合った。",
        "恵比寿の目立たないバーから、タクシーで隠れ家ホテルへ直行。"
      ];
    }
  } else if (month === userBirthMonth) {
    pool = [
      "「お誕生日おめでとう」とホテルで小さな包みを渡され、熱く深く抱き合った。",
      "誕生日の夜。家族への言い訳を作り、わずか1時間の熱い逢瀬にすべてを捧げた。",
      "誰にも言えない特別なバースデー。ホテルのワインを開け、二人きりで祝杯を交わす。"
    ];
  } else if (isRemoteDate) {
    pool = [
      "有休を重ねて急遽、ロマンスカーで箱根温泉へ日帰り逃避行。",
      "熱海のオーシャンビューホテル。波音を聞きながら誰にも言えない午後を過ごした。",
      "レンタカーで湘南・三浦半島へ海沿いドライブ。夕暮れの車内で手を重ねた。",
      "人目を避けて舞浜・お台場のリゾートホテルへ。現実を忘れて深く肌を重ねた。",
      "新幹線で軽井沢へ。避暑地の冷たい空気の中、コートに隠れて指を絡め合った。"
    ];
  } else {
    switch (month) {
      case 1:
        pool = ["年始の家族時間を終え、隠れ家で飢えたように抱き合った。", "「今年もよろしくね」とそっと指を絡めた。"];
        break;
      case 2:
        pool = ["人目を盗んで小さなチョコを手渡され、甘い密会へ。", "「本命にはあげられないから」とホテルでチョコを渡された。"];
        break;
      case 3:
        pool = ["年度末の繁忙期、仕事帰りに駆け込みでホテルへ。", "春風の冷たい夜、お互いの仕事の愚痴をホテルで癒やし合う。"];
        break;
      case 4:
        pool = ["人通りの少ない通りで、息を潜めて夜桜散歩。", "隠れ家ホテルで春の午後を過ごした。"];
        break;
      case 5:
        pool = ["連休明けの平日昼下がり、久しぶりの逢瀬に飢えたように抱き合う。"];
        break;
      case 6:
        pool = ["ゲリラ豪雨を口実に、急遽シティホテルのデイユースへ。"];
        break;
      case 7:
        pool = ["薄着の季節。「肌が綺麗だね」とホテルで囁かれた。"];
        break;
      case 8:
        pool = ["お盆の帰省期間。全パートナーと連絡自粛の沈黙週間。"];
        break;
      case 9:
        pool = ["少し涼しくなった夜、当てもなく夜風に吹かれドライブ。"];
        break;
      case 10:
        pool = ["平日に有休を合わせ、隠れ家個室の和食ランチへ。"];
        break;
      case 11:
        pool = ["寒くなった手を、コートのポケットの中でそっと握られた。"];
        break;
      case 12:
        pool = ["忘年会の口実で、終電を気にせずホテルで今年最後の密会。"];
        break;
      default:
        pool = ["個室ディナーのあと、いつものホテルで濃密な2時間。"];
    }
  }

  const choices = pool.filter(t => !usedTexts.has(t));
  return choices.length > 0 ? choices[Math.floor(Math.random() * choices.length)] : pool[0];
}

function showClickMonthDetail(mIdx) {
  const history = appState.sim.monthlyHistory[mIdx];
  const box = document.getElementById("clickMonthDetail");
  const age = getRealAge(mIdx);
  const yearNum = Math.floor(mIdx / 12) + 1;
  const m = (mIdx % 12) + 1;
  const userBirthMonth = appState.user.birthMonth || 4;
  const birthTag = (m === userBirthMonth) ? "🎂 誕生月の記憶" : "の記憶";
  document.getElementById("detailMonthHeader").innerText = `${age}歳（${yearNum}年目 ${m}月）${birthTag}`;

  if (!history || history.partners.length === 0) {
    document.getElementById("detailMonthContent").innerHTML = `<div>この月はパートナーはおらず、家庭と仕事に専念していました。</div>`;
  } else {
    let txt = "";
    history.partners.forEach(p => {
      const avatarSrc = AvatarCacheManager.get(p.avatarId);
      txt += `
        <div class="flex items-center gap-2 border-b border-purple-900/50 pb-1.5">
          <div class="avatar-frame-sm"><img src="${avatarSrc}" alt="${p.name}"></div>
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center">
              <span class="font-bold text-slate-200">${p.name} <span class="text-[9px] text-indigo-300 font-normal">🏷️${p.tag}</span></span>
              <span class="text-amber-300 font-bold">${p.score}pt</span>
            </div>
            <div class="text-[10px] text-slate-300 truncate">${p.action}</div>
          </div>
        </div>
      `;
    });
    document.getElementById("detailMonthContent").innerHTML = txt;
  }
  box.classList.remove("hidden");
}

function closeClickDetail() { document.getElementById("clickMonthDetail").classList.add("hidden"); }

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

function renderTwoYearModal() {
  document.getElementById("twoYearRemainPoints").innerText = appState.twoYearTemp.points;
  document.getElementById("twoYearValBudget").innerText = "Lv." + appState.twoYearTemp.budget;
  document.getElementById("twoYearBarBudget").style.width = (appState.twoYearTemp.budget * 10) + "%";
  document.getElementById("twoYearValLooks").innerText = appState.twoYearTemp.looks;
  document.getElementById("twoYearValStamina").innerText = appState.twoYearTemp.stamina;
  document.getElementById("twoYearValLibido").innerText = appState.twoYearTemp.libido;
  document.getElementById("modalAlertVal").innerText = "Lv." + appState.twoYearTemp.spouseAlert;

  const btnCare = document.getElementById("btnFamilyCare");
  if (btnCare) {
    if (appState.twoYearTemp.spouseAlert <= 1) {
      btnCare.disabled = true;
      btnCare.innerText = "警戒度 最小 (不要)";
      btnCare.className = "px-2.5 py-1 rounded-lg bg-slate-800 text-slate-500 font-bold text-xs cursor-not-allowed";
    } else if (appState.twoYearTemp.points <= 0) {
      btnCare.disabled = true;
      btnCare.innerText = "ポイント不足";
      btnCare.className = "px-2.5 py-1 rounded-lg bg-slate-800 text-slate-500 font-bold text-xs cursor-not-allowed";
    } else {
      btnCare.disabled = false;
      btnCare.innerText = "ケア実行 (-1pt)";
      btnCare.className = "px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition active:scale-95";
    }
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

function renderTwoYearChronicle(currentMonth) {
  const activeList = document.getElementById("twoYearActivePartnersList");
  const active = appState.sim.partners.filter(p => appState.sim.activePartnerIds.includes(p.id));
  if (active.length === 0) {
    activeList.innerHTML = `<div class="text-[11px] text-slate-500 py-1">現在交際中のパートナーはいません。</div>`;
  } else {
    let h = "";
    active.forEach(p => {
      const avatarSrc = AvatarCacheManager.get(p.avatarId);
      h += `
        <div class="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800">
          <div class="flex items-center gap-2">
            <div class="avatar-frame-sm"><img src="${avatarSrc}" alt="${p.name}"></div>
            <div>
              <div class="font-bold text-white text-xs">${p.name} (${p.age}歳) <span class="text-[9px] text-indigo-300 font-normal">🏷️${p.tag}</span></div>
              <div class="text-slate-400 text-[10px]">${p.job} / ${p.area}</div>
            </div>
          </div>
          <div class="text-right">
            <span class="text-purple-300 font-bold text-[10px]">${p.durationMonths}ヶ月</span>
            <span class="px-1.5 py-0.5 rounded bg-pink-950 border border-pink-700 text-pink-300 text-[9px] ml-1 font-bold">最高 ${p.maxSexScore}pt</span>
          </div>
        </div>
      `;
    });
    activeList.innerHTML = h;
  }

  const scrollBox = document.getElementById("twoYearChronicleScroll");
  let scrollHtml = "";
  const startM = Math.max(0, currentMonth - 24);
  for (let m = startM; m < currentMonth; m++) {
    const hist = appState.sim.monthlyHistory[m];
    const age = getRealAge(m);
    const yearNum = Math.floor(m / 12) + 1;
    const calM = (m % 12) + 1;
    if (hist && hist.partners.length > 0) {
      scrollHtml += `<div class="border-b border-slate-900 pb-1 mb-1"><span class="font-bold text-slate-400">【${age}歳（${yearNum}年目 ${calM}月）】</span>`;
      hist.partners.forEach(p => {
        scrollHtml += `<div class="pl-2 text-slate-300">・${p.name}: ${p.action} (${p.score}pt)</div>`;
      });
      scrollHtml += `</div>`;
    }
  }
  scrollBox.innerHTML = scrollHtml || `<div class="text-slate-500">直近の記録はありません。</div>`;
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

function generateLastLineText(partner, isPartnerMale, isStillActive) {
  if (isStillActive) {
    return isPartnerMale
      ? "「10年経った今でも、あなたといる時間が一番落ち着くよ。これからもずっとよろしくね。」"
      : "「10年経った今でも、あなたと過ごす温もりは少しも色褪せないよ。これからもずっと一緒にいようね。」";
  }
  if (partner.durationMonths >= 60) {
    return isPartnerMale
      ? "「5年もの長い間、俺だけを想い続けてくれてありがとう。お前は俺の裏の人生最高の誇りだよ。」"
      : "「5年以上もの長い月日、私の人生のすべてを彩ってくれて本当にありがとう。あなたに出会えた奇跡を一生忘れません。」";
  }
  if (partner.maxSexScore >= 120) {
    return isPartnerMale
      ? "「お前と過ごしたベッドの熱気、生涯墓場まで持っていく最高の宝物だ。女として幸せにしてくれてありがとう。」"
      : "「あんなに激しく魂まで奪われたのは、後にも先にもあなただけでした。一生消えない甘い傷痕を残してくれてありがとう。」";
  }
  if (partner.chemistry === "S") {
    return isPartnerMale
      ? "「生まれ変わったら、必ず俺がお前を一番に見つける。男としての自信を取り戻せた最高の宝物だった。」"
      : "「生まれ変わったら奥さんより先に私を一番に見つけてね……本当に幸せだったよ。」";
  }
  return isPartnerMale
    ? "「父親・夫の役目に戻るよ。短い間だったけど、本当に楽しかった。ありがとう。」"
    : "「ごめんね、今は母親に戻らなきゃいけないの。今まで本当にありがとう。」";
}

function calculateAndRenderResult() {
  const isTargetPartnerMale = (appState.user.gender === "female");
  const totalPartners = appState.sim.partners.length;
  const startAge = appState.user.startAge;
  const finalAge = getRealAge(appState.sim.currentMonth);
  const isDivorced = appState.sim.isDivorced;

  document.getElementById("resPlayerNameHeader").innerText = appState.user.name;
  if (isDivorced) {
    const passedY = Math.floor(appState.sim.currentMonth / 12);
    const passedM = (appState.sim.currentMonth % 12) + 1;
    document.getElementById("resAgeTrackHeader").innerText = `${startAge}歳から${finalAge}歳へ――${passedY}年${passedM}ヶ月で家庭崩壊・離婚`;
  } else {
    document.getElementById("resAgeTrackHeader").innerText = `${startAge}歳から${finalAge}歳へ――駆け抜けた逢瀬の軌跡`;
  }

  let totalSex = 0, totalDates = 0;
  appState.sim.partners.forEach(p => {
    totalDates += p.datesCount;
    totalSex += (p.chemistry === "S" ? p.datesCount * 2 : p.datesCount);
  });
  const totalHours = totalDates * 3.5;

  document.getElementById("resTotalCount").innerText = `${totalPartners}人`;
  document.getElementById("resSexCount").innerText = `${totalSex}回`;
  document.getElementById("resTotalHours").innerText = `${Math.round(totalHours)}時間`;
  document.getElementById("resFinalIncome").innerText = `Lv.${appState.stats.income}`;

  let hasOlder20 = appState.sim.metOlder20Plus;
  let hasYounger20 = appState.sim.metYounger20Plus;
  let hasOlder10 = false, hasYounger10 = false;

  appState.sim.partners.forEach(p => {
    const playerAgeAtMeet = getRealAge(p.startMonth);
    const diff = p.startAge - playerAgeAtMeet;
    if (diff >= 20) hasOlder20 = true;
    if (diff <= -20) hasYounger20 = true;
    if (diff >= 10) hasOlder10 = true;
    if (diff <= -10) hasYounger10 = true;
  });

  const ach100Kills = totalPartners >= 100;
  const ach5Years = appState.sim.partners.some(p => p.durationMonths >= 60);
  const achScore120 = appState.sim.globalMaxSexScore >= 120;
  const achGrandSlam = (!isDivorced && ach100Kills && ach5Years && achScore120 && hasOlder20 && hasYounger20);

  const ach50Kills = totalPartners >= 50;
  const ach3Years = appState.sim.partners.some(p => p.durationMonths >= 36);
  const achScore100 = appState.sim.globalMaxSexScore >= 100;
  const achDiff10 = (hasOlder10 || hasYounger10);

  updateAchievementCard("achieveCard100", ach100Kills, "bg-rose-950/40 border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.5)]");
  updateAchievementCard("achieveCard5Y", ach5Years, "bg-amber-950/40 border-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.5)]");
  updateAchievementCard("achieveCardScore120", achScore120, "bg-purple-950/40 border-purple-500/80 shadow-[0_0_10px_rgba(157,78,221,0.5)]");
  updateAchievementCard("achieveCardAgeOlder", hasOlder20, "bg-indigo-950/40 border-indigo-500/80 shadow-[0_0_10px_rgba(99,102,241,0.5)]");
  updateAchievementCard("achieveCardAgeYounger", hasYounger20, "bg-pink-950/40 border-pink-500/80 shadow-[0_0_10px_rgba(236,72,153,0.5)]");
  updateAchievementCard("achieveCardGrandSlam", achGrandSlam, "bg-gradient-to-r from-amber-900/50 via-purple-900/50 to-pink-900/50 border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.8)]");

  const unlocked = [ach100Kills, ach5Years, achScore120, hasOlder20, hasYounger20, achGrandSlam].filter(Boolean).length;
  document.getElementById("achieveUnlockedCount").innerText = unlocked;

  let badgesHtml = "";
  if (isDivorced) badgesHtml += '<span class="px-2 py-0.5 rounded-full text-[10px] bg-rose-950 text-rose-300 border border-rose-600 font-bold">🚨 離婚・家庭崩壊</span>';
  if (appState.sim.lawsuitCount > 0) badgesHtml += `<span class="px-2 py-0.5 rounded-full text-[10px] bg-amber-950 text-amber-300 border border-amber-600 font-bold">⚖️ 慰謝料被請求 (${appState.sim.lawsuitCount}回)</span>`;
  if (ach100Kills) badgesHtml += '<span class="px-2 py-0.5 rounded-full text-[10px] bg-rose-950 text-rose-300 border border-rose-600 font-bold">⚔️ 100人斬り達成</span>';
  else if (ach50Kills) badgesHtml += '<span class="px-2 py-0.5 rounded-full text-[10px] bg-rose-950/60 text-rose-300 border border-rose-800 font-bold">⚔️ 50人斬り達成</span>';

  if (ach5Years) badgesHtml += '<span class="px-2 py-0.5 rounded-full text-[10px] bg-amber-950 text-amber-300 border border-amber-600 font-bold">💍 5年継続達成</span>';
  else if (ach3Years) badgesHtml += '<span class="px-2 py-0.5 rounded-full text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800 font-bold">💍 3年継続達成</span>';

  if (achScore120) badgesHtml += '<span class="px-2 py-0.5 rounded-full text-[10px] bg-purple-950 text-purple-300 border border-purple-500 font-bold">⚡ 密会120pt突破</span>';
  else if (achScore100) badgesHtml += '<span class="px-2 py-0.5 rounded-full text-[10px] bg-purple-950/60 text-purple-300 border border-purple-800 font-bold">⚡ 密会100pt突破</span>';

  if (hasOlder20) badgesHtml += '<span class="px-2 py-0.5 rounded-full text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-500 font-bold">🍷 +20歳年上愛</span>';
  if (hasYounger20) badgesHtml += '<span class="px-2 py-0.5 rounded-full text-[10px] bg-pink-950 text-pink-300 border border-pink-500 font-bold">🍓 -20歳年下愛</span>';
  if (!hasOlder20 && !hasYounger20 && achDiff10) badgesHtml += '<span class="px-2 py-0.5 rounded-full text-[10px] bg-slate-900 text-slate-300 border border-slate-700 font-bold">🧭 ±10歳差愛</span>';

  document.getElementById("resAchieveBadgeList").innerHTML = badgesHtml;

  let title = "『首都圏の彷徨い人』";
  let desc = "首都圏の喧騒の中、家庭と日常の狭間で静かに駆け抜けた10年間。";

  if (isDivorced) {
    title = "『泥沼の家庭崩壊』";
    desc = "監視警戒を甘く見続けた代償としてすべてが露見。配偶者に離婚届を突きつけられ、日常そのものを喪失した。";
  } else if (achGrandSlam) {
    title = "『完全制覇・全能の覇皇』";
    desc = "100人斬り、5年の純愛、スコア120超え、20歳上下両制覇。婚外のすべてを極め尽くした究極の伝説。";
  } else if (ach100Kills && ach5Years) {
    title = "『多重純愛の矛盾王』";
    desc = "100人以上の異性と逢瀬を重ねながら、特定の伴侶と5年以上愛を深めた驚異の二重生活者。";
  } else if (hasOlder20 && hasYounger20) {
    title = "『世代超越の覇王』";
    desc = "20歳以上年上の品格と、20歳以上年下の情熱。極限の年齢差を双方魅了し尽くした奇跡の存在。";
  } else if (ach100Kills && achScore120) {
    title = "『夜の絶対帝王』";
    desc = "圧倒的な出逢いの母数と、理性を焼き尽くす極限の密会スコアを両立させた夜の支配者。";
  } else if (ach5Years && achScore120) {
    title = "『生涯唯一の絶頂伴侶』";
    desc = "5年以上の歳月を共に重ね、心身ともにこれ以上ない絶頂共鳴へと至った至高の純白パートナー。";
  } else if (ach100Kills) {
    title = "『首都圏の婚外修羅』";
    desc = "10年間で100人以上の異性と関係を紡ぎ、夜の首都圏を完全に支配した伝説のアチーブメント。";
  } else if (ach5Years) {
    title = "『五年の絆・純白伴侶』";
    desc = "加齢や家庭の波を共に乗り越え、5年（60ヶ月）以上愛を深め抜いた至高の純愛。";
  } else if (achScore120) {
    title = "『歓喜の特異点』";
    desc = "理性を完全に吹き飛ばす120pt超えの密会を達成し、官能の極致に到達した者。";
  } else if (appState.sim.isRetired) {
    title = "『静寂の帰還者』";
    desc = "泥沼に呑まれる前に自らアプリを消し、平穏な家庭の日常へと生還した賢明な選択者。";
  }

  document.getElementById("resTitleBadge").innerText = title;
  document.getElementById("resEndingDesc").innerText = desc;

  const sortedByDuration = [...appState.sim.partners].sort((a,b) => b.durationMonths - a.durationMonths);
  const longestP = sortedByDuration[0] || { name: "なし", startAge: 40, endAge: 40, durationMonths: 0, chemistry: "A", avatarId: "F01", tag: "平日昼", endMonth: null };
  
  const isLongestActive = (longestP.endMonth === null || longestP.endMonth >= 120);
  longestP.lastLine = generateLastLineText(longestP, isTargetPartnerMale, isLongestActive);

  document.getElementById("longestPartnerImg").src = AvatarCacheManager.get(longestP.avatarId);
  document.getElementById("longestPartnerNameAge").innerHTML = `${longestP.name} (${longestP.endAge || longestP.startAge}歳 / ${longestP.job || "一般事務"} / ${longestP.area || "東京"})<br><span class="text-[10px] text-indigo-300">🏷️${longestP.tag} ｜ 相性 ${longestP.chemistry}</span>`;
  document.getElementById("longestPartnerPeriod").innerText = `交際${longestP.durationMonths}ヶ月（約${(longestP.durationMonths/12).toFixed(1)}年）${isLongestActive ? " 【現在も継続中】" : ""}`;
  document.getElementById("longestPartnerChem").innerText = `相性 ${longestP.chemistry}`;
  document.getElementById("longestPartnerLineText").innerText = longestP.lastLine;

  const highestScoreP = appState.sim.highestScorePartner || longestP;
  document.getElementById("highestScorePartnerImg").src = AvatarCacheManager.get(highestScoreP.avatarId);
  document.getElementById("highestScorePartnerNameAge").innerHTML = `${highestScoreP.name} (${highestScoreP.startAge}歳 / ${highestScoreP.job || "一般事務"} / ${highestScoreP.area || "東京"})<br><span class="text-[10px] text-indigo-300">🏷️${highestScoreP.tag} ｜ 相性 ${highestScoreP.chemistry}</span>`;
  document.getElementById("highestScoreDetail").innerText = `最高密会スコア: ${appState.sim.globalMaxSexScore || highestScoreP.maxSexScore} pt`;
  document.getElementById("highestScoreChem").innerText = `相性 ${highestScoreP.chemistry}`;

  document.getElementById("resStatLooks").innerText = "Lv." + appState.stats.looks;
  document.getElementById("resStatStamina").innerText = "Lv." + appState.stats.stamina;
  document.getElementById("resStatLibido").innerText = "Lv." + appState.stats.libido;
  document.getElementById("resStatBudget").innerText = "Lv." + appState.stats.budget;

  let allHtml = "";
  appState.sim.partners.forEach((p, idx) => {
    const avatarSrc = AvatarCacheManager.get(p.avatarId);
    allHtml += `
      <div class="p-2.5 rounded bg-slate-950/50 border border-slate-850 flex justify-between items-center text-xs">
        <div class="flex items-center gap-2">
          <div class="avatar-frame-sm"><img src="${avatarSrc}" alt="${p.name}"></div>
          <div>
            <div class="font-bold text-white">${idx + 1}. ${p.name} (${p.startAge}歳) <span class="text-indigo-300 text-[10px]">🏷️${p.tag}</span></div>
            <div class="text-slate-400 text-[10px]">${p.job} / ${p.area}</div>
          </div>
        </div>
        <div class="text-right">
          <span class="px-1.5 py-0.5 rounded bg-pink-950 text-pink-300 border border-pink-700 text-[10px] font-bold">相性 ${p.chemistry}</span>
          <div class="text-amber-300 font-bold text-[11px] mt-0.5">最高: ${p.maxSexScore}pt (${p.durationMonths}ヶ月)</div>
        </div>
      </div>
    `;
  });
  document.getElementById("allPartnersList").innerHTML = allHtml;
  document.getElementById("toggleAllPartnersBtn").innerText = `すべての交際履歴（全${totalPartners}人）を確認する ▼`;

  let epilogueHtml = "";
  if (isDivorced) {
    epilogueHtml = `
      <p class="text-rose-400 font-bold">背徳の果てに訪れたのは、日常そのものの完全崩壊だった。</p>
      <p>家庭の警戒を甘く見積もり続けた結果、決定的な証拠を握られ離婚届を突きつけられた。</p>
    `;
  } else {
    epilogueHtml = `
      <p>家庭と仕事の狭間、電車の乗り換えのわずかな隙間に息を潜めて愛を求めた10年間。</p>
      <p>甘美な逢瀬も、胸を締め付ける別れも、すべてを飲み込んであなたの人生の糧となった。誰にも知られない裏の歴史を胸に抱えたまま、今日も何食わぬ顔で日常を歩き続ける。</p>
    `;
  }
  document.getElementById("epilogueText").innerHTML = epilogueHtml;
}

function updateAchievementCard(elId, isAchieved, activeClass) {
  const card = document.getElementById(elId);
  if (!card) return;
  if (isAchieved) card.className = `p-2 rounded-xl border text-center transition-all ${activeClass} opacity-100 scale-105`;
  else card.className = `p-2 rounded-xl border text-center transition-all bg-slate-950/60 border-slate-800 opacity-30`;
}

function toggleAllPartners() {
  const wrap = document.getElementById("allHistoryWrapper");
  const btn = document.getElementById("toggleAllPartnersBtn");
  if (wrap.classList.contains("hidden")) {
    wrap.classList.remove("hidden");
    btn.innerText = "交際履歴を閉じる ▲";
  } else {
    wrap.classList.add("hidden");
    btn.innerText = `すべての交際履歴（全${appState.sim.partners.length}人）を確認する ▼`;
  }
}

async function generateSquareCard() {
  if (document.fonts) try { await document.fonts.ready; } catch(e) {}
  const cvs = document.getElementById("exportCanvas");
  const ctx = cvs.getContext("2d");

  const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
  bgGrad.addColorStop(0, "#07080d");
  bgGrad.addColorStop(0.5, "#121422");
  bgGrad.addColorStop(1, "#090912");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.strokeStyle = "rgba(157, 78, 221, 0.4)";
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, 1008, 1008);

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 16px 'Cinzel', serif";
  ctx.textAlign = "right";
  ctx.fillText("AJISAI GAME STUDIO PRESENTS", 1008, 76);
  ctx.textAlign = "left";

  ctx.fillStyle = "#c084fc";
  ctx.font = "900 20px 'Cinzel', serif";
  ctx.fillText("OUTROMANCE : SECRET CHRONICLE", 72, 88);

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 50px 'Noto Sans JP', sans-serif";
  ctx.fillText("婚外10年シミュレーター", 72, 146);

  ctx.font = "bold 24px 'Noto Sans JP', sans-serif";
  ctx.fillStyle = "#f472b6";
  ctx.fillText("〜既婚者たちの", 72, 186);
  const preW = ctx.measureText("〜既婚者たちの").width;
  ctx.fillStyle = "#fb7185";
  ctx.font = "900 28px 'Noto Sans JP', sans-serif";
  ctx.fillText("裏", 72 + preW, 186);
  const uraW = ctx.measureText("裏").width;
  ctx.fillStyle = "#f472b6";
  ctx.font = "bold 24px 'Noto Sans JP', sans-serif";
  ctx.fillText("歴史〜", 72 + preW + uraW, 186);

  const title = document.getElementById("resTitleBadge").innerText;
  ctx.fillStyle = "#fef08a";
  ctx.font = "900 52px 'Noto Sans JP', sans-serif";
  ctx.fillText(title, 72, 264);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "20px 'Noto Sans JP', sans-serif";
  const prefName = { tokyo: "東京", kanagawa: "神奈川", saitama: "埼玉", chiba: "千葉" }[appState.user.pref] || "東京";
  const finalAge = getRealAge(appState.sim.currentMonth);
  const familyStatusStr = appState.sim.isDivorced ? "家庭崩壊・離婚" : "配偶者と同居中";
  ctx.fillText(`観測者: ${appState.user.name}（${appState.user.startAge}歳→${finalAge}歳 / ${prefName}） ${familyStatusStr}`, 72, 306);

  const stats = [
    { label: "累計交際人数", val: document.getElementById("resTotalCount").innerText, col: "#f472b6" },
    { label: "肌を重ねた回数", val: document.getElementById("resSexCount").innerText, col: "#fb7185" },
    { label: "密会・正味時間", val: document.getElementById("resTotalHours").innerText, col: "#38bdf8" },
    { label: "最終本業年収", val: document.getElementById("resFinalIncome").innerText, col: "#4ade80" }
  ];

  stats.forEach((s, i) => {
    const x = 72 + (i % 2) * 480;
    const y = 345 + Math.floor(i / 2) * 125;
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.fillRect(x, y, 440, 105);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 440, 105);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "16px 'Noto Sans JP', sans-serif";
    ctx.fillText(s.label, x + 24, y + 34);

    ctx.fillStyle = s.col;
    ctx.font = "900 38px 'Noto Sans JP', sans-serif";
    ctx.fillText(s.val, x + 24, y + 84);
  });

  const achs = [
    { name: "100人斬り", ok: appState.sim.partners.length >= 100 },
    { name: "五年の絆", ok: appState.sim.partners.some(p => p.durationMonths >= 60) },
    { name: "密会120pt", ok: appState.sim.globalMaxSexScore >= 120 },
    { name: "+20歳年上", ok: appState.sim.metOlder20Plus },
    { name: "-20歳年下", ok: appState.sim.metYounger20Plus }
  ];

  achs.forEach((a, i) => {
    const ax = 72 + i * 190;
    const ay = 600;
    ctx.fillStyle = a.ok ? "rgba(245, 158, 11, 0.15)" : "rgba(30, 41, 59, 0.4)";
    ctx.fillRect(ax, ay, 175, 45);
    ctx.strokeStyle = a.ok ? "#f59e0b" : "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ax, ay, 175, 45);

    ctx.fillStyle = a.ok ? "#fde047" : "#64748b";
    ctx.font = "bold 13px 'Noto Sans JP', sans-serif";
    ctx.fillText((a.ok ? "★ " : "☆ ") + a.name, ax + 14, ay + 28);
  });

  const sortedByDuration = [...appState.sim.partners].sort((a,b) => b.durationMonths - a.durationMonths);
  const longestP = sortedByDuration[0] || { name: "なし", durationMonths: 0, area: "東京", avatarId: "F01", tag: "平日昼", endMonth: null };
  const highestScoreP = appState.sim.highestScorePartner || longestP;

  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = "rgba(24, 18, 43, 0.85)";
  ctx.fillRect(72, 670, 440, 240);
  ctx.strokeStyle = "rgba(168, 85, 247, 0.45)";
  ctx.strokeRect(72, 670, 440, 240);

  const longestImg = new Image();
  longestImg.src = AvatarCacheManager.get(longestP.avatarId);
  ctx.drawImage(longestImg, 92, 692, 56, 56);

  ctx.fillStyle = "#f472b6";
  ctx.font = "bold 15px 'Noto Sans JP', sans-serif";
  ctx.fillText(`👑 最長交際パートナー 🏷️${longestP.tag}`, 160, 712);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px 'Noto Sans JP', sans-serif";
  ctx.fillText(`${longestP.name} (${longestP.durationMonths}ヶ月)`, 160, 742);

  ctx.fillStyle = "#a7f3d0";
  ctx.font = "italic 15px 'Noto Sans JP', sans-serif";
  wrapCanvasText(ctx, longestP.lastLine || "「……」", 92, 786, 400, 23);

  ctx.fillStyle = "rgba(30, 18, 25, 0.85)";
  ctx.fillRect(532, 670, 476, 240);
  ctx.strokeStyle = "rgba(244, 63, 94, 0.45)";
  ctx.strokeRect(532, 670, 476, 240);

  const highestImg = new Image();
  highestImg.src = AvatarCacheManager.get(highestScoreP.avatarId);
  ctx.drawImage(highestImg, 552, 692, 56, 56);

  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 15px 'Noto Sans JP', sans-serif";
  ctx.fillText(`🔥 歴代最高密会スコア 🏷️${highestScoreP.tag}`, 620, 712);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px 'Noto Sans JP', sans-serif";
  ctx.fillText(`${highestScoreP.name} (${appState.sim.globalMaxSexScore || highestScoreP.maxSexScore} pt)`, 620, 742);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "italic 15px 'Noto Sans JP', sans-serif";
  wrapCanvasText(ctx, "「ホテルのシーツを掴んだまま息が止まりそうになったあの夜は、一生忘れられない。」", 552, 786, 436, 23);

  ctx.fillStyle = "#475569";
  ctx.font = "16px 'Noto Sans JP', sans-serif";
  ctx.fillText("OUTROMANCE | 10-Year Simulation 〜既婚者たちの裏歴史〜", 72, 980);

  const dataUrl = cvs.toDataURL("image/png");
  document.getElementById("generatedCardImage").src = dataUrl;
  document.getElementById("imageSaveModal").classList.remove("hidden");

  try {
    const link = document.createElement("a");
    link.download = `OUTROMANCE_${appState.user.name}_婚外10年成績表.png`;
    link.href = dataUrl;
    link.click();
  } catch(e) {}
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  let line = "";
  for (let n = 0; n < text.length; n++) {
    const testLine = line + text[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = text[n];
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

function closeImageModal() { document.getElementById("imageSaveModal").classList.add("hidden"); }

function shareOnX() {
  const title = document.getElementById("resTitleBadge").innerText;
  const count = document.getElementById("resTotalCount").innerText;
  const longestM = document.getElementById("twoYearSummaryLongest").innerText || "0ヶ月";
  const score = appState.sim.globalMaxSexScore || 0;
  const youngest = document.getElementById("twoYearSummaryYoungest").innerText || "―";
  const oldest = document.getElementById("twoYearSummaryOldest").innerText || "―";

  const text = encodeURIComponent(`【婚外10年シミュレーター 〜既婚者たちの裏歴史〜】\n私の称号は ${title} でした。\n\n累計交際 ${count}\n最長期間 ${longestM}\n最高密会度 ${score} pt\n最年少/最年長:${youngest}/${oldest}\n\n#婚外恋愛 #不倫 #婚外10年シミュレーター`);
  window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
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