/* ============================================================
   ui.js - OUTROMANCE UI描画・演出・音響制御（完全版）
   ============================================================ */

/* --- AvatarCacheManager ブリッジ（avatars.js の実データを直接バインド） --- */
window.AvatarCacheManager = window.AvatarCacheManager || {
  get: function(id) {
    if (!id) return "";
    if (id.startsWith("F") && window.FEMALE_AVATARS_DATA) {
      return window.FEMALE_AVATARS_DATA[id] || "";
    }
    if (id.startsWith("M") && window.MALE_AVATARS_DATA) {
      return window.MALE_AVATARS_DATA[id] || "";
    }
    return "";
  },
  getMeta: function(id) {
    if (window.AVATARS_METADATA && window.AVATARS_METADATA[id]) {
      return window.AVATARS_METADATA[id];
    }
    return { name: id, label: "", cat: "", quote: "「はじめまして。落ち着いた大人の関係になれたら嬉しいです。」" };
  }
};

// アバター画像安全取得（未取得時のフォールバック保護）
function getSafeAvatarSrc(avatarId, name, color) {
  try {
    if (typeof AvatarCacheManager !== "undefined" && AvatarCacheManager.get) {
      let src = AvatarCacheManager.get(avatarId);
      if (!src && avatarId) {
        const altId = avatarId.replace(/0(?=\d)/, '');
        src = AvatarCacheManager.get(altId);
      }
      if (src && src.length > 20) return src;
    }
  } catch(e) {}
  
  const char = (name && name.length > 0) ? name[0] : "♥";
  const bg = color || "#8b5cf6";
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="${encodeURIComponent(bg)}"/><text x="24" y="31" font-size="22" font-weight="bold" fill="%23ffffff" text-anchor="middle" font-family="sans-serif">${encodeURIComponent(char)}</text></svg>`;
}

var isSoundOn = false;
var audioCtx = null;
var prologueStep = 0;
var prologueAutoTimer = null;
var tapStartX = 0, tapStartY = 0;
var isTapInitialized = false;
var lastTapAdvanceTime = 0;
var currentHistorySortType = "duration";

var simSpeedMs = 5000;
var simTimer = null;

function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function toggleSound() {
  try { initAudio(); } catch(e) {}
  isSoundOn = !isSoundOn;
  const icon = document.getElementById("soundIcon");
  const text = document.getElementById("soundText");
  if (icon) icon.innerText = isSoundOn ? "🔊" : "🔇";
  if (text) text.innerText = isSoundOn ? "BGM: ON" : "BGM: OFF";
  
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
  const btn = document.getElementById("speedToggleBtn");
  if (simSpeedMs === 5000) {
    simSpeedMs = 2500;
    if (btn) btn.innerText = "2.0x";
  } else if (simSpeedMs === 2500) {
    simSpeedMs = 10000;
    if (btn) btn.innerText = "0.5x";
  } else {
    simSpeedMs = 5000;
    if (btn) btn.innerText = "1.0x";
  }
  triggerVibrate(15);
  if (typeof appState !== "undefined" && appState.sim && !appState.sim.isPaused && !appState.sim.isSkipping) {
    clearTimeout(simTimer);
    if (typeof simulationTick === "function") {
      simTimer = setTimeout(simulationTick, simSpeedMs);
    }
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
  try { initAudio(); } catch(e) {}
  triggerVibrate(20);

  const stepDisc = document.getElementById("stepDisclaimer");
  const step0 = document.getElementById("step0");
  if (stepDisc) stepDisc.classList.add("hidden");
  if (step0) step0.classList.remove("hidden");

  window.scrollTo({ top: 0, behavior: "smooth" });
  runCinematicPrologue();
}

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
  try { initAudio(); } catch(e) {}
  if (isSoundOn) playTone(440, 0.15);
  triggerVibrate(20);

  document.getElementById("step0")?.classList.add("hidden");
  document.getElementById("step1a")?.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function onGenderChange() {
  const g = document.getElementById("userGender")?.value;
  const nameEl = document.getElementById("userName");
  if (g === "female") {
    if (nameEl) nameEl.value = "マイ";
  } else {
    if (nameEl) nameEl.value = "ユウスケ";
  }
}

function onStartAgeChange() {
  const age = document.getElementById("userAge")?.value || "40";
  const name = appState.user.name || "ユウスケ";
  const badge = document.getElementById("step1bUserBadge");
  if (badge) badge.innerText = `${name}（${age}歳スタート）`;
}

function goToStep1B() {
  const nameVal = document.getElementById("userName")?.value.trim();
  appState.user.name = (nameVal && nameVal.length > 0) ? nameVal.slice(0, 5) : "名無し";
  appState.user.gender = document.getElementById("userGender")?.value || "male";
  appState.user.pref = "tokyo";
  appState.user.birthMonth = 1;

  rerollStats();
  applyStylePreset("balanced");
  onStartAgeChange();

  document.getElementById("step1a")?.classList.add("hidden");
  document.getElementById("step1b")?.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function backToStep1A() {
  document.getElementById("step1b")?.classList.add("hidden");
  document.getElementById("step1a")?.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function rerollStats() {
  const income = rollIncomeLevel();
  appState.stats.income = income;

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
  appState.stats.spouseAlert = 3;
}

function applyStylePreset(presetType) {
  try { initAudio(); } catch(e) {}
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

  appState.user.selectedStyle = presetType;
  const isMale = (appState.user.gender === "male");
  let points = appState.stats.income + 1;

  appState.stats.looks = appState.baseLooks || 4;
  appState.stats.libido = appState.baseLibido || 4;
  appState.stats.stamina = appState.baseStamina || 4;
  appState.stats.budget = 0;

  if (presetType === "pure") {
    appState.stats.maxPartners = 1;
    appState.stats.budget = isMale ? 2 : 0;
    points -= isMale ? 1 : 0;
    while (points > 0) {
      if (appState.stats.stamina < 9) { appState.stats.stamina++; points--; }
      else if (appState.stats.looks < 9) { appState.stats.looks++; points--; }
      else if (appState.stats.libido < 9) { appState.stats.libido++; points--; }
      else break;
    }
  } else if (presetType === "carnage") {
    appState.stats.maxPartners = 4;
    while (points > 0 && appState.stats.budget < 8) {
      appState.stats.budget = Math.min(10, appState.stats.budget + 2);
      points--;
    }
    while (points > 0) {
      if (appState.stats.looks < 9) { appState.stats.looks++; points--; }
      else if (appState.stats.stamina < 9) { appState.stats.stamina++; points--; }
      else break;
    }
  } else {
    appState.stats.maxPartners = 2;
    appState.stats.budget = 4;
    points -= 2;
    while (points > 0) {
      if (appState.stats.stamina < 8) { appState.stats.stamina++; points--; }
      else if (appState.stats.looks < 8) { appState.stats.looks++; points--; }
      else if (appState.stats.libido < 8) { appState.stats.libido++; points--; }
      else break;
    }
  }

  const pl = document.getElementById("prevStatLooks");
  if (pl) pl.innerText = appState.stats.looks;
  const ps = document.getElementById("prevStatStamina");
  if (ps) ps.innerText = appState.stats.stamina;
  const plib = document.getElementById("prevStatLibido");
  if (plib) plib.innerText = appState.stats.libido;
  const pb = document.getElementById("prevStatBudget");
  if (pb) pb.innerText = "Lv." + appState.stats.budget;
  const pInc = document.getElementById("lblPreviewIncome");
  if (pInc) pInc.innerText = "本業年収: Lv." + appState.stats.income;
}

function updateLiveStats() {
  const looksEl = document.getElementById("liveStatLooks");
  if (looksEl) looksEl.innerText = `${appState.stats.looks}`;
  const staEl = document.getElementById("liveStatStamina");
  if (staEl) staEl.innerText = `${appState.stats.stamina}`;
  const libEl = document.getElementById("liveStatLibido");
  if (libEl) libEl.innerText = `${appState.stats.libido}`;
  const budEl = document.getElementById("liveStatBudget");
  if (budEl) budEl.innerText = `Lv.${appState.stats.budget}`;
  const alertEl = document.getElementById("largeSpouseAlertVal");
  if (alertEl) alertEl.innerText = `Lv.${appState.stats.spouseAlert}/5`;

  const maxP = appState.stats.maxPartners || 2;
  const activeCount = appState.sim.activePartnerIds.length;
  const activeCountEl = document.getElementById("simActiveCount");
  if (activeCountEl) {
    activeCountEl.innerText = `${activeCount}/${maxP}人`;
  }
  const totalCountEl = document.getElementById("simTotalPartners");
  if (totalCountEl) {
    totalCountEl.innerText = `${appState.sim.partners.length}人`;
  }

  const btnBoost = document.getElementById("btnBoostMatching");
  if (btnBoost) {
    const canBoost = (appState.stats.budget >= 2 && activeCount < 4);
    btnBoost.disabled = !canBoost;
    if (!canBoost) {
      btnBoost.className = "px-2.5 py-0.5 rounded-full font-bold text-[10.5px] bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed opacity-50 flex items-center gap-1 shadow-none";
    } else {
      btnBoost.className = "px-2.5 py-0.5 rounded-full font-black text-[10.5px] bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)] border border-pink-300 transition active:scale-95 flex items-center gap-1 cursor-pointer";
    }
  }

  const btnCare = document.getElementById("btnLiveFamilyCare");
  if (btnCare) {
    const canCare = (appState.stats.budget >= 2 && appState.stats.spouseAlert > 1);
    btnCare.disabled = !canCare;
    if (!canCare) {
      btnCare.className = "px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-600 font-bold text-[10px] cursor-not-allowed opacity-50 flex items-center gap-1 shadow-none";
    } else {
      btnCare.className = "px-2 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-300 font-bold text-[10px] transition active:scale-95 flex items-center gap-1 cursor-pointer";
    }
  }
}

// 🆙ブースト機能：マチアプ高額プラン仕様
function triggerBoostMatching(e) {
  if (e) e.stopPropagation();
  if (appState.stats.budget < 2) return;
  if (appState.sim.activePartnerIds.length >= 4) return;

  try { initAudio(); } catch(e) {}
  triggerVibrate([50, 60, 50, 60, 80]);
  appState.stats.budget = Math.max(0, appState.stats.budget - 2);

  const emptySlots = 4 - appState.sim.activePartnerIds.length;
  const currentRealAge = getRealAge(appState.sim.currentMonth);
  const isUserMale = (appState.user.gender === "male");
  const matchedList = [];

  // ① 基本1人確定マッチング（高額プラン保証枠）
  const p1 = createSynthesizedPartner(appState.sim.currentMonth, currentRealAge);
  p1.lastSexScore = (typeof calculateSexScore === "function") ? calculateSexScore(p1, (appState.sim.currentMonth % 12) + 1, false, 0) : 60;
  p1.maxSexScore = p1.lastSexScore;
  appState.sim.partners.push(p1);
  appState.sim.activePartnerIds.push(p1.id);
  appState.sim.totalPartnerCounter++;
  matchedList.push(p1);

  if (p1.startAge >= currentRealAge + 20) appState.sim.metOlder20Plus = true;
  if (p1.startAge <= currentRealAge - 20) appState.sim.metYounger20Plus = true;

  // ② 追加枠の確率計算（ステータス反映）
  const extraSlots = emptySlots - 1;
  if (extraSlots > 0) {
    let extraChance = 0.40;
    if (isUserMale) {
      extraChance += (appState.stats.budget - 2) * 0.08;
      extraChance += (appState.stats.looks - 4) * 0.05;
    } else {
      extraChance += (appState.stats.looks - 4) * 0.10;
      extraChance += (appState.stats.budget - 2) * 0.03;
    }
    extraChance = Math.max(0.20, Math.min(0.85, extraChance));

    for (let i = 0; i < extraSlots; i++) {
      if (Math.random() < extraChance) {
        const extraP = createSynthesizedPartner(appState.sim.currentMonth, currentRealAge);
        extraP.lastSexScore = (typeof calculateSexScore === "function") ? calculateSexScore(extraP, (appState.sim.currentMonth % 12) + 1, false, 0) : 60;
        extraP.maxSexScore = extraP.lastSexScore;
        appState.sim.partners.push(extraP);
        appState.sim.activePartnerIds.push(extraP.id);
        appState.sim.totalPartnerCounter++;
        matchedList.push(extraP);

        if (extraP.startAge >= currentRealAge + 20) appState.sim.metOlder20Plus = true;
        if (extraP.startAge <= currentRealAge - 20) appState.sim.metYounger20Plus = true;
      }
    }
  }

  playLimitBreakChime();
  showBoostToast(matchedList);

  updateLiveStats();
  const calMonth = (appState.sim.currentMonth % 12) + 1;
  renderRealtimeMonthlyLog(appState.sim.currentMonth, calMonth);
  updateMatrixDot(appState.sim.currentMonth);
}

function showBoostToast(matchedList) {
  const toast = document.getElementById("boostToast");
  if (!toast) return;

  const countEl = document.getElementById("boostToastCount");
  if (countEl) countEl.innerText = `${matchedList.length}人マッチング成立！`;

  const container = document.getElementById("boostAvatarsContainer");
  if (container) {
    let avatarsHtml = "";
    matchedList.forEach(p => {
      const avatarSrc = getSafeAvatarSrc(p.avatarId, p.name, p.color);
      avatarsHtml += `
        <div class="flex flex-col items-center space-y-1">
          <div class="avatar-frame ring-2 ring-amber-400 shadow-md">
            <img src="${avatarSrc}" alt="${p.name}">
          </div>
          <span class="text-[9.5px] font-bold text-white truncate max-w-[56px] text-center">${p.name}</span>
          <span class="px-1 py-0.2 rounded text-[8.5px] font-black bg-pink-950 border border-pink-500 text-pink-200">相性${p.chemistry}</span>
        </div>
      `;
    });
    container.innerHTML = avatarsHtml;
  }

  toast.classList.remove("hidden");
  setTimeout(() => { toast.classList.remove("scale-95", "opacity-0"); toast.classList.add("scale-100", "opacity-100"); }, 10);
  setTimeout(() => {
    toast.classList.remove("scale-100", "opacity-100");
    toast.classList.add("scale-95", "opacity-0");
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, 3800);
}

function buyLiveFamilyCare(e) {
  if (e) e.stopPropagation();
  if (appState.stats.budget < 2) return;
  if (appState.stats.spouseAlert <= 1) return;

  try { initAudio(); } catch(e) {}
  appState.stats.budget = Math.max(0, appState.stats.budget - 2);
  appState.stats.spouseAlert = Math.max(1, appState.stats.spouseAlert - 2);

  if (isSoundOn) playTone(659.25, 0.12);
  triggerVibrate(20);

  const sitEl = document.getElementById("spouseSituationLog");
  if (sitEl) sitEl.innerText = "週末に家族サービスを奮発。パートナーの機嫌が目に見えて和らいだ。";

  updateLiveStats();
  renderAlertAndFlash(false, true);
}

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
  if (typeof simulationTick === "function") {
    simulationTick();
  }
}

function refresh12MatrixGrid() {
  const currentYear = Math.floor(appState.sim.currentMonth / 12) + 1;
  const startM = (currentYear - 1) * 12 + 1;
  const endM = currentYear * 12;

  const titleEl = document.getElementById("matrixPhaseTitle");
  if (titleEl) titleEl.innerText = `${currentYear}年目（${startM}〜${endM}ヶ月）`;

  const row = document.getElementById("matrixGridRow");
  if (!row) return;
  row.innerHTML = "";

  for (let i = 0; i < 12; i++) {
    const absMonth = (currentYear - 1) * 12 + i;
    const calMonth = i + 1;

    const dot = document.createElement("div");
    dot.id = "grid-dot-" + i;
    dot.className = "w-full aspect-square rounded-full transition-all duration-300 cursor-pointer hover:scale-115 flex items-center justify-center p-[2px] bg-slate-800 border border-slate-700/60";
    dot.onclick = (e) => { e.stopPropagation(); showClickMonthDetail(absMonth); };

    const centerCircle = document.createElement("div");
    centerCircle.className = "w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-xs sm:text-[13px] select-none";
    const monthEmoji = (typeof MONTH_EMOJIS !== "undefined" && MONTH_EMOJIS[calMonth]) ? MONTH_EMOJIS[calMonth] : "🌸";
    centerCircle.innerText = monthEmoji;
    dot.appendChild(centerCircle);

    row.appendChild(dot);
  }
}

function updateMatrixDot(mIdx) {
  const dotIndex = mIdx % 12;
  const dot = document.getElementById("grid-dot-" + dotIndex);
  if (!dot) return;

  for (let i = 0; i < 12; i++) {
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

function showNewPartnerToast(p, isDouble = false) {
  const toast = document.getElementById("newPartnerToast");
  if (!toast) return;
  document.getElementById("toastPartnerImg").src = getSafeAvatarSrc(p.avatarId, p.name, p.color);
  document.getElementById("toastPartnerName").innerText = `${p.name} (${p.startAge}歳)`;
  document.getElementById("toastPartnerAreaJob").innerText = `${p.area} ｜ ${p.job}`;
  document.getElementById("toastPartnerChem").innerText = `相性 ${p.chemistry}`;

  document.getElementById("toastHeaderTitle").innerText = isDouble ? "✨ DOUBLE MATCHED! (2/2)" : "💖 NEW MATCHED!";

  const badgeEl = document.getElementById("toastPartnerBadge");
  let badges = `<span class="px-1.5 py-0.2 text-[9px] bg-indigo-950 text-indigo-300 rounded border border-indigo-700/60 font-bold">🏷️${p.tag}</span>`;
  if (p.category === "senior") badges += ' <span class="px-1.5 py-0.2 text-[9px] bg-purple-900 text-purple-200 rounded border border-purple-500/40 font-bold">シニア</span>';
  else if (p.category === "youth") badges += ' <span class="px-1.5 py-0.2 text-[9px] bg-emerald-900 text-emerald-200 rounded border border-emerald-500/30 font-bold">若手</span>';
  badgeEl.innerHTML = badges;

  // パートナーのプロフセリフ（p.quote）を最優先で表示
  document.getElementById("toastPartnerQuote").innerText = p.quote || "「はじめまして。落ち着いてお話しできる大人の関係になれたら嬉しいです。」";

  toast.classList.remove("hidden");
  setTimeout(() => { toast.classList.remove("scale-95", "opacity-0"); toast.classList.add("scale-100", "opacity-100"); }, 10);
  setTimeout(() => {
    toast.classList.remove("scale-100", "opacity-100");
    toast.classList.add("scale-95", "opacity-0");
    setTimeout(() => toast.classList.add("hidden"), 3200);
  }, 3200);
}

function showBreakupPartnerToast(p, isUserMale, isManual = false, isTroubled = false) {
  const toast = document.getElementById("breakupPartnerToast");
  if (!toast) return;
  document.getElementById("toastBreakupImg").src = getSafeAvatarSrc(p.avatarId, p.name, p.color);
  document.getElementById("toastBreakupName").innerText = `${p.name} (${p.age}歳)`;
  document.getElementById("toastBreakupPeriod").innerText = `${p.durationMonths}ヶ月で関係解消`;

  if (isManual) {
    document.getElementById("toastBreakupTag").innerText = isTroubled ? "⚠️ FADEOUT（別れ話で揉めて怪しまれた！）" : "👋 FADEOUT（関係解消）";
    const quote = isTroubled
      ? "「本気だったのに！家庭にバラしてやる！」と激昂され、背筋が凍った。"
      : (typeof MANUAL_BREAKUP_QUOTES !== "undefined" ? MANUAL_BREAKUP_QUOTES[Math.floor(Math.random() * MANUAL_BREAKUP_QUOTES.length)] : "「今までありがとう。日常に戻らなきゃいけないの。」");
    document.getElementById("toastBreakupQuote").innerText = quote;
  } else {
    document.getElementById("toastBreakupTag").innerText = "🍂 PARTNER BREAKUP（関係解消）";
    const quotePool = isUserMale 
      ? (typeof BREAKUP_QUOTES_FEMALE_PARTNER !== "undefined" ? BREAKUP_QUOTES_FEMALE_PARTNER : ["「今までありがとう。日常に戻るね。」"])
      : (typeof BREAKUP_QUOTES_MALE_PARTNER !== "undefined" ? BREAKUP_QUOTES_MALE_PARTNER : ["「ごめん、家庭に戻らなきゃいけない。」"]);
    const quote = quotePool[Math.floor(Math.random() * quotePool.length)];
    document.getElementById("toastBreakupQuote").innerText = quote;
  }

  toast.classList.remove("hidden");
  setTimeout(() => { toast.classList.remove("scale-95", "opacity-0"); toast.classList.add("scale-100", "opacity-100"); }, 10);
  setTimeout(() => {
    toast.classList.remove("scale-100", "opacity-100");
    toast.classList.add("scale-95", "opacity-0");
    setTimeout(() => toast.classList.add("hidden"), 3200);
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
    setTimeout(() => toast.classList.add("hidden"), 3600);
  }, 3600);
}

function renderAlertAndFlash(isCrisis, isSilent = false) {
  const alertBadge = document.getElementById("alertStateText");
  const alertLv = appState.stats.spouseAlert;
  const largeVal = document.getElementById("largeSpouseAlertVal");
  const largeBadge = document.getElementById("largeSpouseAlertBadge");
  const sitEl = document.getElementById("spouseSituationLog");

  if (largeVal) {
    largeVal.innerText = `Lv.${alertLv}/5`;
  }

  if (alertLv >= 5) {
    if (alertBadge) {
      alertBadge.innerText = "🚨 離婚危機";
      alertBadge.className = "text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500 font-black animate-ping";
    }
    if (largeBadge) {
      largeBadge.className = "flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500 animate-pulse flex-shrink-0";
    }
    if (largeVal) {
      largeVal.className = "text-[10.5px] font-black text-rose-300";
    }
    if (sitEl) sitEl.innerText = "家庭内は完全な臨戦態勢。スマホの着信音ひとつで怒号が飛ぶ。";
  } else if (isCrisis || alertLv === 4) {
    if (!isSilent && !appState.sim.isSkipping && !appState.sim.isPaused) {
      const overlay = document.getElementById("flashOverlay");
      if (overlay) {
        overlay.classList.add("red-flash-active");
        setTimeout(() => overlay.classList.remove("red-flash-active"), 650);
      }
      playAlarm();
      triggerVibrate([100, 50, 100]);
    }
    if (alertBadge) {
      alertBadge.innerText = "⚠️ 身バレ危機";
      alertBadge.className = "text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 animate-pulse";
    }
    if (largeBadge) {
      largeBadge.className = "flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/60 border border-rose-600 flex-shrink-0";
    }
    if (largeVal) {
      largeVal.className = "text-[10.5px] font-black text-rose-400";
    }
    const spouseEvents = [
      "休日の夕方、スマホの通知を凝視され冷や汗が流れた。",
      "「最近、怪しい用事多くない？」と真顔で問い詰められた。",
      "手帳を見咎められ、必死に仕事の言い訳を重ねた。"
    ];
    if (sitEl) sitEl.innerText = spouseEvents[Math.floor(Math.random() * spouseEvents.length)];
  } else {
    const activeCount = appState.sim.activePartnerIds.length;
    if (alertBadge) {
      alertBadge.innerText = (activeCount > 2) ? "多忙密会" : "平穏";
      alertBadge.className = "text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40";
    }
    if (largeBadge) {
      largeBadge.className = "flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 flex-shrink-0";
    }
    if (largeVal) {
      largeVal.className = "text-[10.5px] font-black text-amber-400";
    }
    if (sitEl && sitEl.innerText.indexOf("家族サービス") === -1) {
      sitEl.innerText = "平穏な週末。特に怪しまれる様子はない。";
    }
  }
}

function renderRealtimeMonthlyLog(mIdx, calMonth) {
  try {
    const seasons = ["", "新春の気配", "初春・バレンタイン", "桃の節句・春の兆し", "夜桜の季節", "初夏の大型連休", "梅雨の雨宿り", "盛夏の気配", "お盆の帰省・酷暑", "初秋の哀愁", "秋晴れ・味覚", "木枯らしの街角", "聖夜・年末の慌ただしさ"];
    
    const seasonBadge = document.getElementById("seasonBadge");
    if (seasonBadge) {
      const emoji = (typeof MONTH_EMOJIS !== "undefined" && MONTH_EMOJIS[calMonth]) ? MONTH_EMOJIS[calMonth] : "🌸";
      seasonBadge.innerText = `${emoji} ${calMonth}月`;
    }

    const monthTitle = document.getElementById("monthTitleLog");
    if (monthTitle) monthTitle.innerText = seasons[calMonth] || "穏やかな午後の逢瀬";

    const simAgeEl = document.getElementById("simCurrentAge");
    if (simAgeEl) {
      const currentAge = typeof getRealAge === "function" ? getRealAge(mIdx) : (appState.user.startAge || 40);
      const passedY = Math.floor(mIdx / 12);
      const passedM = (mIdx % 12) + 1;
      const elapsedStr = passedY > 0 ? `${passedY}年${passedM}ヶ月` : `${passedM}ヶ月`;
      simAgeEl.innerHTML = `<span class="text-purple-300 font-black text-sm">${appState.user.name}</span> <span class="font-bold text-white text-xs ml-1">${currentAge}歳</span> <span class="text-slate-400 text-[10.5px] font-normal">（婚外開始 ${elapsedStr}）</span>`;
    }

    const maxP = appState.stats.maxPartners || 2;
    const activeCountEl = document.getElementById("simActiveCount");
    if (activeCountEl) activeCountEl.innerText = `${appState.sim.activePartnerIds.length}/${maxP}人`;
    const totalCountEl = document.getElementById("simTotalPartners");
    if (totalCountEl) totalCountEl.innerText = `${appState.sim.partners.length}人`;

    const listContainer = document.getElementById("currentMonthPartnersLog");
    if (!listContainer) return;
    const currentPartners = appState.sim.partners.filter(p => appState.sim.activePartnerIds.includes(p.id));

    if (currentPartners.length === 0) {
      listContainer.innerHTML = `<div class="text-xs text-slate-500 italic py-2 text-center">今月はアポなし。家庭と仕事に専念中……</div>`;
      return;
    }

    let html = "";
    const usedTexts = new Set();
    const monthLogRecord = [];
    const hasBudget = (appState.stats.budget > 0);

    const stimBtnClass = hasBudget
      ? "bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold shadow-[0_2px_4px_rgba(219,39,119,0.4)] border border-pink-400/60 active:translate-y-0.5 cursor-pointer"
      : "bg-slate-900 border border-slate-800 text-slate-600 shadow-none cursor-not-allowed opacity-50";

    const giftBtnClass = hasBudget
      ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow-[0_2px_4px_rgba(124,58,237,0.4)] border border-purple-400/60 active:translate-y-0.5 cursor-pointer"
      : "bg-slate-900 border border-slate-800 text-slate-600 shadow-none cursor-not-allowed opacity-50";

    const breakBtnClass = "bg-gradient-to-r from-slate-800 to-slate-900 hover:from-rose-900 hover:to-rose-800 text-slate-200 hover:text-white font-bold shadow-[0_2px_4px_rgba(0,0,0,0.5)] border border-slate-700 hover:border-rose-500 active:translate-y-0.5 cursor-pointer";

    currentPartners.forEach(p => {
      let actionText = p.lastActionText;
      if (!actionText && typeof generateMonthlyActionText === "function") {
        actionText = generateMonthlyActionText(p, calMonth, usedTexts);
      }
      if (!actionText) actionText = "隠れ家ホテルで濃密な午後を過ごした。";
      usedTexts.add(actionText);

      const score = p.lastSexScore || 50;
      let scoreBadge = "";
      if (score >= 150) {
        scoreBadge = `<span class="limit-break-badge bg-gradient-to-r from-amber-400 via-pink-400 to-purple-400 text-slate-950 font-black px-1.5 py-0.5 rounded text-[9.5px] shadow-lg flex-shrink-0">⚡${score}pt</span>`;
      } else if (score >= 120) {
        scoreBadge = `<span class="bg-amber-950 text-amber-300 border border-amber-600 font-bold px-1.5 py-0.5 rounded text-[9.5px] flex-shrink-0">${score}pt</span>`;
      } else if (score >= 80) {
        scoreBadge = `<span class="bg-pink-950 text-pink-300 border border-pink-700 font-bold px-1.5 py-0.5 rounded text-[9.5px] flex-shrink-0">${score}pt</span>`;
      } else {
        scoreBadge = `<span class="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[9.5px] flex-shrink-0">${score}pt</span>`;
      }

      let catBadge = `<span class="px-1.5 py-0.5 text-[9px] bg-indigo-950/80 text-indigo-300 rounded border border-indigo-700/60 font-medium">🏷️${p.tag || "平日昼"}</span>`;
      if (p.category === "senior") catBadge += ' <span class="px-1.5 py-0.5 text-[9px] bg-purple-950/80 text-purple-300 rounded border border-purple-600/40 font-medium">シニア</span>';
      if (p.category === "youth") catBadge += ' <span class="px-1.5 py-0.5 text-[9px] bg-emerald-950/80 text-emerald-300 rounded border border-emerald-600/40 font-medium">若手</span>';

      let chemBadge = `<span class="px-1.5 py-0.5 text-[9px] bg-pink-950/80 text-pink-300 rounded border border-pink-600/60 font-black">相性 ${p.chemistry || "B"}</span>`;

      monthLogRecord.push({ id: p.id, name: p.name, avatarId: p.avatarId, color: p.color, action: actionText, score, tag: p.tag });
      
      const avatarSrc = getSafeAvatarSrc(p.avatarId, p.name, p.color);

      html += `
        <div class="p-2 sm:p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-2.5 text-xs shadow-md">
          <div class="avatar-frame mt-0.5"><img src="${avatarSrc}" alt="${p.name}"></div>
          <div class="flex-1 min-w-0 space-y-1.5">
            <div class="flex items-center justify-between gap-1 min-w-0">
              <div class="flex items-center gap-1.5 min-w-0 truncate">
                <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${p.color || '#a855f7'}"></span>
                <span class="font-bold text-slate-200 text-xs sm:text-[13px] truncate">${p.name}</span>
                <span class="text-[10px] text-purple-300 truncate">(${p.age}歳 / ${p.area || "東京"})</span>
              </div>
              <div class="flex items-center gap-1 flex-shrink-0">
                ${chemBadge}
                ${scoreBadge}
              </div>
            </div>

            <div class="flex items-center justify-between gap-1 pt-0.5">
              <div class="flex items-center gap-1 flex-wrap min-w-0">
                ${catBadge}
              </div>
              <div class="flex items-center gap-1.5 flex-shrink-0">
                <button type="button" onclick="giveStimulus('${p.id}', event)" ${!hasBudget ? 'disabled' : ''} title="活動費1消費：大人のおもちゃで密会度を急上昇" class="px-2 py-0.5 rounded-lg text-[10px] transition ${stimBtnClass} flex items-center gap-0.5">
                  <span>💓</span><span>刺激</span>
                </button>
                <button type="button" onclick="giveGift('${p.id}', event)" ${!hasBudget ? 'disabled' : ''} title="活動費1消費：プレゼントで関係継続・破局防止" class="px-2 py-0.5 rounded-lg text-[10px] transition ${giftBtnClass} flex items-center gap-0.5">
                  <span>🎁</span><span>贈物</span>
                </button>
                <button type="button" onclick="manualBreakup('${p.id}', event)" title="関係を解消する" class="px-2 py-0.5 rounded-lg text-[10px] transition ${breakBtnClass} flex items-center gap-0.5">
                  <span>👋</span><span>別れ</span>
                </button>
              </div>
            </div>

            <div class="text-slate-300 text-[10.5px] sm:text-[11px] leading-snug break-words pt-1 border-t border-slate-800/60">${actionText}</div>
          </div>
        </div>
      `;
    });
    listContainer.innerHTML = html;
    appState.sim.monthlyHistory[mIdx] = { month: mIdx, calMonth, partners: monthLogRecord };
  } catch(err) {
    console.error("renderRealtimeMonthlyLog error:", err);
  }
}

function giveStimulus(partnerId, e) {
  if (e) e.stopPropagation();
  if (appState.stats.budget <= 0) return;

  const partner = appState.sim.partners.find(p => p.id === partnerId);
  if (!partner) return;

  try { initAudio(); } catch(e) {}
  triggerVibrate([40, 60, 40]);
  appState.stats.budget = Math.max(0, appState.stats.budget - 1);

  partner.lastSexScore = (partner.lastSexScore || 50) + 25;
  if (partner.lastSexScore > partner.maxSexScore) {
    partner.maxSexScore = partner.lastSexScore;
  }
  if (partner.lastSexScore > appState.sim.globalMaxSexScore) {
    appState.sim.globalMaxSexScore = partner.lastSexScore;
    appState.sim.highestScorePartner = partner;
  }

  playLimitBreakChime();

  const textList = (typeof STIMULUS_TEXTS !== "undefined") ? STIMULUS_TEXTS : ["理性を吹き飛ばすほどの悦楽に溺れた。"];
  partner.lastActionText = textList[Math.floor(Math.random() * textList.length)];

  const mIdx = appState.sim.currentMonth;
  const calMonth = (mIdx % 12) + 1;
  updateLiveStats();
  renderRealtimeMonthlyLog(mIdx, calMonth);
}

function giveGift(partnerId, e) {
  if (e) e.stopPropagation();
  if (appState.stats.budget <= 0) return;

  const partner = appState.sim.partners.find(p => p.id === partnerId);
  if (!partner) return;

  try { initAudio(); } catch(e) {}
  triggerVibrate(30);
  appState.stats.budget = Math.max(0, appState.stats.budget - 1);

  partner.giftProtectedUntil = appState.sim.currentMonth + 6;
  playRareChime();

  const textList = (typeof GIFT_TEXTS !== "undefined") ? GIFT_TEXTS : ["二人の絆がより確固たるものになった。"];
  partner.lastActionText = textList[Math.floor(Math.random() * textList.length)];

  const mIdx = appState.sim.currentMonth;
  const calMonth = (mIdx % 12) + 1;
  updateLiveStats();
  renderRealtimeMonthlyLog(mIdx, calMonth);
}

function showClickMonthDetail(mIdx) {
  const history = appState.sim.monthlyHistory[mIdx];
  const box = document.getElementById("clickMonthDetail");
  if (!box) return;
  const age = getRealAge(mIdx);
  const yearNum = Math.floor(mIdx / 12) + 1;
  const m = (mIdx % 12) + 1;
  document.getElementById("detailMonthHeader").innerText = `${age}歳（${yearNum}年目 ${m}月）の記憶`;

  if (!history || history.partners.length === 0) {
    document.getElementById("detailMonthContent").innerHTML = `<div>この月はパートナーはおらず、家庭と仕事に専念していました。</div>`;
  } else {
    let txt = "";
    history.partners.forEach(p => {
      const avatarSrc = getSafeAvatarSrc(p.avatarId, p.name, p.color);
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

function closeClickDetail() { document.getElementById("clickMonthDetail")?.classList.add("hidden"); }

function manualBreakup(partnerId, e) {
  if (e) e.stopPropagation();
  try { initAudio(); } catch(e) {}
  triggerVibrate(20);

  const idx = appState.sim.activePartnerIds.indexOf(partnerId);
  if (idx === -1) return;

  const partner = appState.sim.partners.find(p => p.id === partnerId);
  if (!partner) return;

  appState.sim.activePartnerIds.splice(idx, 1);
  partner.endMonth = appState.sim.currentMonth;

  let isTroubled = false;
  if (partner.tag === "年下独身" && Math.random() < 0.35) {
    isTroubled = true;
  } else if (partner.tag === "割り切り") {
    isTroubled = false;
  } else if (Math.random() < 0.12) {
    isTroubled = true;
  }

  if (isTroubled) {
    appState.stats.spouseAlert = Math.min(5, appState.stats.spouseAlert + 1);
    if (!appState.sim.isSkipping) playAlarm();
  }

  showBreakupPartnerToast(partner, (appState.user.gender === "male"), true, isTroubled);

  const calMonth = (appState.sim.currentMonth % 12) + 1;
  renderRealtimeMonthlyLog(appState.sim.currentMonth, calMonth);
  updateLiveStats();
}

function onMilestoneStyleChange() {
  const styleSel = document.getElementById("milestoneStyleSelect");
  if (!styleSel) return;
  const newStyle = styleSel.value;
  appState.user.selectedStyle = newStyle;

  if (newStyle === "carnage") {
    appState.stats.maxPartners = 4;
    appState.stats.budget = Math.min(10, appState.stats.income);
  } else if (newStyle === "pure") {
    appState.stats.maxPartners = 1;
    appState.stats.budget = 2;
    if (appState.stats.stamina < 9) appState.stats.stamina++;
  } else {
    appState.stats.maxPartners = 2;
    appState.stats.budget = Math.max(2, appState.stats.income - 1);
  }

  const statRep = document.getElementById("milestoneStatReport");
  if (statRep) {
    statRep.innerText = `✨外見: ${appState.stats.looks} ｜ ⚡体力: ${appState.stats.stamina} ｜ 🔥性欲: ${appState.stats.libido} ｜ 💳今期活動費: Lv.${appState.stats.budget}`;
  }
}

function renderYearlyMilestoneModal() {
  const mIdx = appState.sim.currentMonth;
  const currentAge = getRealAge(mIdx);
  const yearIndex = mIdx / 12;

  const titleEl = document.getElementById("twoYearTitle");
  if (titleEl) {
    titleEl.innerHTML = `<span class="text-purple-300 font-black">${appState.user.name}</span> <span>${yearIndex}年目の決算：${currentAge}歳の現在</span>`;
  }
  const tagEl = document.getElementById("milestoneHeaderTag");
  if (tagEl) tagEl.innerText = `${yearIndex}年目（${mIdx}ヶ月）の節目`;

  const totalEl = document.getElementById("twoYearSummaryTotal");
  if (totalEl) totalEl.innerText = `${appState.sim.partners.length}人`;
  const sortedByDur = [...appState.sim.partners].sort((a,b) => b.durationMonths - a.durationMonths);
  const longestEl = document.getElementById("twoYearSummaryLongest");
  if (longestEl) longestEl.innerText = sortedByDur[0] ? `${sortedByDur[0].durationMonths}ヶ月` : "0ヶ月";
  const scoreEl = document.getElementById("twoYearSummaryScore");
  if (scoreEl) scoreEl.innerText = `${appState.sim.globalMaxSexScore} pt`;

  renderActivePartnersListInMilestone();

  const incEl = document.getElementById("milestoneIncomeReport");
  if (incEl) incEl.innerText = `年収: Lv.${appState.stats.income}`;

  const styleSel = document.getElementById("milestoneStyleSelect");
  if (styleSel) styleSel.value = appState.user.selectedStyle || "balanced";
  const agePrefSel = document.getElementById("milestoneAgePrefSelect");
  if (agePrefSel) agePrefSel.value = appState.stats.targetAgePref || "same";

  onMilestoneStyleChange();

  const btnResume = document.getElementById("btnResumeNextYear");
  if (btnResume) {
    btnResume.disabled = true;
    btnResume.classList.add("opacity-50", "pointer-events-none");
    setTimeout(() => {
      btnResume.disabled = false;
      btnResume.classList.remove("opacity-50", "pointer-events-none");
    }, 600);
  }
}

function renderActivePartnersListInMilestone() {
  const activeList = document.getElementById("twoYearActivePartnersList");
  const active = appState.sim.partners.filter(p => appState.sim.activePartnerIds.includes(p.id));
  if (!activeList) return;
  if (active.length === 0) {
    activeList.innerHTML = `<div class="text-[11px] text-slate-500 py-1">現在交際中のパートナーはいません。</div>`;
  } else {
    let h = "";
    active.forEach(p => {
      const avatarSrc = getSafeAvatarSrc(p.avatarId, p.name, p.color);
      h += `
        <div class="flex items-center justify-between p-1 rounded-lg bg-slate-900 border border-slate-800 gap-2">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <div class="avatar-frame-sm flex-shrink-0"><img src="${avatarSrc}" alt="${p.name}"></div>
            <div class="min-w-0 flex-1">
              <div class="font-bold text-white text-xs truncate flex items-center gap-1">
                <span>${p.name}</span>
                <span class="text-slate-400 text-[10px]">(${p.age}歳)</span>
                <span class="text-[9px] text-indigo-300 font-normal px-1 rounded bg-indigo-950 border border-indigo-800/50 flex-shrink-0">🏷️${p.tag}</span>
              </div>
            </div>
          </div>
          <div class="text-right flex-shrink-0">
            <span class="text-purple-300 font-bold text-[10.5px]">${p.durationMonths}ヶ月</span>
            <span class="px-1 py-0.5 rounded bg-pink-950/80 border border-pink-700/80 text-pink-300 text-[9px] font-bold">相性${p.chemistry}</span>
          </div>
        </div>
      `;
    });
    activeList.innerHTML = h;
  }
}

function resumeNextYear() {
  const styleSel = document.getElementById("milestoneStyleSelect");
  if (styleSel) {
    const newStyle = styleSel.value;
    appState.user.selectedStyle = newStyle;
    appState.stats.maxPartners = (newStyle === "pure") ? 1 : (newStyle === "carnage" ? 4 : 2);
  }
  const agePrefSel = document.getElementById("milestoneAgePrefSelect");
  if (agePrefSel) {
    appState.stats.targetAgePref = agePrefSel.value;
  }

  document.getElementById("twoYearModal")?.classList.add("hidden");
  updateLiveStats();
  refresh12MatrixGrid();
  resumeSimulationInternal();
}

function retireFromTwoYear() {
  clearTimeout(simTimer);
  document.getElementById("twoYearModal")?.classList.add("hidden");
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

function sortPartnersHistory(type) {
  currentHistorySortType = type;
  const btnDur = document.getElementById("sortBtnDuration");
  const btnAge = document.getElementById("sortBtnAge");
  const btnScore = document.getElementById("sortBtnScore");

  [btnDur, btnAge, btnScore].forEach(b => {
    if (b) b.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 transition";
  });

  if (type === "duration" && btnDur) {
    btnDur.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-purple-900 text-purple-200 border border-purple-500 transition";
  } else if (type === "age" && btnAge) {
    btnAge.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-purple-900 text-purple-200 border border-purple-500 transition";
  } else if (type === "score" && btnScore) {
    btnScore.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-purple-900 text-purple-200 border border-purple-500 transition";
  }

  renderAllPartnersList(type);
}

function renderAllPartnersList(sortType = "duration") {
  let sorted = [...appState.sim.partners];
  if (sortType === "duration") {
    sorted.sort((a, b) => b.durationMonths - a.durationMonths);
  } else if (sortType === "age") {
    sorted.sort((a, b) => a.startAge - b.startAge);
  } else if (sortType === "score") {
    sorted.sort((a, b) => (b.maxSexScore || 0) - (a.maxSexScore || 0));
  }

  let allHtml = "";
  sorted.forEach((p, idx) => {
    const avatarSrc = getSafeAvatarSrc(p.avatarId, p.name, p.color);
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
          <div class="text-amber-300 font-bold text-[11px] mt-0.5">${p.maxSexScore}pt (${p.durationMonths}ヶ月)</div>
        </div>
      </div>
    `;
  });
  const allList = document.getElementById("allPartnersList");
  if (allList) allList.innerHTML = allHtml;
}

function calculateAndRenderResult() {
  const isTargetPartnerMale = (appState.user.gender === "female");
  const totalPartners = appState.sim.partners.length;
  const startAge = appState.user.startAge;
  const finalAge = getRealAge(appState.sim.currentMonth);
  const isDivorced = appState.sim.isDivorced;

  document.getElementById("headerControls")?.classList.add("hidden");

  const resName = document.getElementById("resPlayerNameHeader");
  if (resName) resName.innerText = appState.user.name;

  const resAgeTrack = document.getElementById("resAgeTrackHeader");
  if (resAgeTrack) {
    if (isDivorced) {
      const passedY = Math.floor(appState.sim.currentMonth / 12);
      const passedM = (appState.sim.currentMonth % 12) + 1;
      resAgeTrack.innerText = `${startAge}歳から${finalAge}歳へ――${passedY}年${passedM}ヶ月で家庭崩壊・離婚`;
    } else {
      resAgeTrack.innerText = `${startAge}歳から${finalAge}歳へ――駆け抜けた逢瀬の軌跡`;
    }
  }

  let totalSex = 0, totalDates = 0;
  appState.sim.partners.forEach(p => {
    totalDates += p.datesCount;
    totalSex += (p.chemistry === "S" ? p.datesCount * 2 : p.datesCount);
  });
  const totalHours = Math.round(totalDates * 3.5);

  const resTotalCount = document.getElementById("resTotalCount");
  if (resTotalCount) resTotalCount.innerText = `${totalPartners}人`;
  const resSexCount = document.getElementById("resSexCount");
  if (resSexCount) resSexCount.innerText = `${totalSex}回`;
  const resTotalHours = document.getElementById("resTotalHours");
  if (resTotalHours) resTotalHours.innerText = `${totalHours}時間`;

  let hasOlder20 = appState.sim.metOlder20Plus;
  let hasYounger20 = appState.sim.metYounger20Plus;

  appState.sim.partners.forEach(p => {
    const playerAgeAtMeet = getRealAge(p.startMonth);
    const diff = p.startAge - playerAgeAtMeet;
    if (diff >= 20) hasOlder20 = true;
    if (diff <= -20) hasYounger20 = true;
  });

  const ach100Kills = totalPartners >= 100;
  const ach5Years = appState.sim.partners.some(p => p.durationMonths >= 60);
  const achScore150 = appState.sim.globalMaxSexScore >= 150;
  const achGrandSlam = (!isDivorced && ach100Kills && ach5Years && achScore150 && hasOlder20 && hasYounger20);

  updateAchievementCard("achieveCard100", ach100Kills, "bg-rose-950/40 border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.5)]");
  updateAchievementCard("achieveCard5Y", ach5Years, "bg-amber-950/40 border-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.5)]");
  updateAchievementCard("achieveCardScore120", achScore150, "bg-purple-950/40 border-purple-500/80 shadow-[0_0_10px_rgba(157,78,221,0.5)]");
  updateAchievementCard("achieveCardAgeOlder", hasOlder20, "bg-indigo-950/40 border-indigo-500/80 shadow-[0_0_10px_rgba(99,102,241,0.5)]");
  updateAchievementCard("achieveCardAgeYounger", hasYounger20, "bg-pink-950/40 border-pink-500/80 shadow-[0_0_10px_rgba(236,72,153,0.5)]");
  updateAchievementCard("achieveCardGrandSlam", achGrandSlam, "bg-gradient-to-r from-amber-900/50 via-purple-900/50 to-pink-900/50 border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.8)]");

  const unlocked = [ach100Kills, ach5Years, achScore150, hasOlder20, hasYounger20, achGrandSlam].filter(Boolean).length;
  const achUnlocked = document.getElementById("achieveUnlockedCount");
  if (achUnlocked) achUnlocked.innerText = unlocked;

  let badgesHtml = "";
  if (isDivorced) badgesHtml += '<span class="px-2 py-0.5 rounded-full text-[10px] bg-rose-950 text-rose-300 border border-rose-600 font-bold">🚨 離婚・家庭崩壊</span>';
  if (appState.sim.lawsuitCount > 0) badgesHtml += `<span class="px-2 py-0.5 rounded-full text-[10px] bg-amber-950 text-amber-300 border border-amber-600 font-bold">⚖️ 慰謝料被請求 (${appState.sim.lawsuitCount}回)</span>`;
  if (ach100Kills) badgesHtml += '<span class="px-2 py-0.5 rounded-full text-[10px] bg-rose-950 text-rose-300 border border-rose-600 font-bold">⚔️ 100人斬り達成</span>';
  if (ach5Years) badgesHtml += '<span class="px-2 py-0.5 rounded-full text-[10px] bg-amber-950 text-amber-300 border border-amber-600 font-bold">💍 5年継続達成</span>';
  if (achScore150) badgesHtml += '<span class="px-2 py-0.5 rounded-full text-[10px] bg-purple-950 text-purple-300 border border-purple-500 font-bold">⚡ 密会150pt突破</span>';
  if (hasOlder20) badgesHtml += '<span class="px-2 py-0.5 rounded-full text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-500 font-bold">🍷 +20歳年上愛</span>';
  if (hasYounger20) badgesHtml += '<span class="px-2 py-0.5 rounded-full text-[10px] bg-pink-950 text-pink-300 border border-pink-500 font-bold">🍓 -20歳年下愛</span>';

  const badgeListEl = document.getElementById("resAchieveBadgeList");
  if (badgeListEl) badgeListEl.innerHTML = badgesHtml;

  let title = "『首都圏の彷徨い人』";
  let desc = "首都圏の喧騒の中、家庭と日常の狭間で静かに駆け抜けた5年間。";

  if (isDivorced) {
    title = "『泥沼の家庭崩壊』";
    desc = "監視警戒を甘く見続けた代償としてすべてが露見。配偶者に離婚届を突きつけられ、日常そのものを喪失した。";
  } else if (achGrandSlam) {
    title = "『完全制覇・全能の覇皇』";
    desc = "100人斬り、5年の純愛、スコア150超え、20歳上下両制覇。婚外のすべてを極め尽くした究極の伝説。";
  } else if (ach100Kills && ach5Years) {
    title = "『多重純愛の矛盾王』";
    desc = "100人以上の異性と逢瀬を重ねながら、特定の伴侶と5年間愛を深め抜いた驚異の二重生活者。";
  } else if (hasOlder20 && hasYounger20) {
    title = "『世代超越の覇王』";
    desc = "20歳以上年上の品格と、20歳以上年下の情熱。極限の年齢差を双方魅了し尽くした奇跡の存在。";
  } else if (hasYounger20) {
    title = "『若き情熱の略奪者』";
    desc = "親子ほど年の離れた若き熱情に溺れ、加齢の現実を忘れ去るほどの背徳的な逢瀬を駆け抜けた。";
  } else if (hasOlder20) {
    title = "『深淵の包擁者』";
    desc = "人生の酸いも甘いも噛み分けた年長者の深い包容力に身を委ね、成熟した大人の関係を紡ぎ抜いた。";
  } else if (ach100Kills) {
    title = "『首都圏の婚外修羅』";
    desc = "5年間で100人以上の異性と関係を紡ぎ、夜の首都圏を完全に支配した伝説のアチーブメント。";
  } else if (ach5Years) {
    title = "『奇跡の純白伴侶』";
    desc = "加齢や家庭の波を共に乗り越え、5年間（60ヶ月）一度も別れずに愛を深め抜いた至高の純愛。";
  } else if (achScore150) {
    title = "『歓喜の特異点』";
    desc = "理性を完全に吹き飛ばす150pt超えの密会を達成し、官能の極致に到達した者。";
  } else if (appState.sim.isRetired) {
    title = "『静寂の帰還者』";
    desc = "泥沼に呑まれる前に自らアプリを消し、平穏な家庭の日常へと生還した賢明な選択者。";
  }

  const titleBadge = document.getElementById("resTitleBadge");
  if (titleBadge) titleBadge.innerText = title;
  const endingDesc = document.getElementById("resEndingDesc");
  if (endingDesc) endingDesc.innerText = desc;

  const sortedByDuration = [...appState.sim.partners].sort((a,b) => b.durationMonths - a.durationMonths);
  const longestP = sortedByDuration[0] || { name: "なし", startAge: 40, endAge: 40, durationMonths: 0, chemistry: "A", avatarId: "F01", tag: "平日昼", endMonth: null, color: "#a855f7" };
  
  const isLongestActive = (longestP.endMonth === null || longestP.endMonth >= 60);
  longestP.lastLine = (typeof generateLastLineText === "function") 
    ? generateLastLineText(longestP, isTargetPartnerMale, isLongestActive) 
    : "「今までありがとう。日常に戻るね。」";

  const longImg = document.getElementById("longestPartnerImg");
  if (longImg) longImg.src = getSafeAvatarSrc(longestP.avatarId, longestP.name, longestP.color);
  const longName = document.getElementById("longestPartnerNameAge");
  if (longName) longName.innerHTML = `${longestP.name} (${longestP.endAge || longestP.startAge}歳 / ${longestP.job || "一般事務"} / ${longestP.area || "東京"})<br><span class="text-[10px] text-indigo-300">🏷️${longestP.tag} ｜ 相性 ${longestP.chemistry}</span>`;
  const longPeriod = document.getElementById("longestPartnerPeriod");
  if (longPeriod) longPeriod.innerText = `交際${longestP.durationMonths}ヶ月（約${(longestP.durationMonths/12).toFixed(1)}年）${isLongestActive ? " 【現在も継続中】" : ""}`;
  const longLine = document.getElementById("longestPartnerLineText");
  if (longLine) longLine.innerText = longestP.lastLine;

  const highestScoreP = appState.sim.highestScorePartner || longestP;
  const highImg = document.getElementById("highestScorePartnerImg");
  if (highImg) highImg.src = getSafeAvatarSrc(highestScoreP.avatarId, highestScoreP.name, highestScoreP.color);
  const highName = document.getElementById("highestScorePartnerNameAge");
  if (highName) highName.innerHTML = `${highestScoreP.name} (${highestScoreP.startAge}歳 / ${highestScoreP.job || "一般事務"} / ${highestScoreP.area || "東京"})<br><span class="text-[10px] text-indigo-300">🏷️${highestScoreP.tag} ｜ 相性 ${highestScoreP.chemistry}</span>`;
  const highDetail = document.getElementById("highestScoreDetail");
  if (highDetail) highDetail.innerText = `最高密会スコア: ${appState.sim.globalMaxSexScore || highestScoreP.maxSexScore} pt`;

  renderAllPartnersList(currentHistorySortType);

  const toggleBtn = document.getElementById("toggleAllPartnersBtn");
  if (toggleBtn) toggleBtn.innerText = `すべての交際履歴（全${totalPartners}人）を確認する ▼`;

  let epilogueHtml = "";
  if (isDivorced) {
    epilogueHtml = `
      <p class="text-rose-400 font-bold">背徳の果てに訪れたのは、日常そのものの完全崩壊だった。</p>
      <p>家庭の警戒を甘く見積もり続けた結果、決定的な証拠を握られ離婚届を突きつけられた。</p>
    `;
  } else {
    epilogueHtml = `
      <p>家庭と仕事の狭間、電車の乗り換えのわずかな隙間に息を潜めて愛を求めた5年間。</p>
      <p>甘美な逢瀬も、胸を締め付ける別れも、すべてを飲み込んであなたの人生の糧となった。誰にも知られない裏の歴史を胸に抱えたまま、今日も何食わぬ顔で日常を歩き続ける。</p>
    `;
  }
  const epiEl = document.getElementById("epilogueText");
  if (epiEl) epiEl.innerHTML = epilogueHtml;
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
  if (!wrap || !btn) return;
  if (wrap.classList.contains("hidden")) {
    wrap.classList.remove("hidden");
    btn.innerText = "交際履歴を閉じる ▲";
  } else {
    wrap.classList.add("hidden");
    btn.innerText = `すべての交際履歴（全${appState.sim.partners.length}人）を確認する ▼`;
  }
}
