/* ============================================================
   ui.js - OUTROMANCE UI描画・演出・音響制御
   ============================================================ */

let isSoundOn = false;
let audioCtx = null;
let prologueStep = 0;
let prologueAutoTimer = null;
let tapStartX = 0, tapStartY = 0;
let isTapInitialized = false;
let lastTapAdvanceTime = 0;

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

function updateLiveStats() {
  document.getElementById("liveStatLooks").innerText = `${appState.stats.looks}`;
  document.getElementById("liveStatStamina").innerText = `${appState.stats.stamina}`;
  document.getElementById("liveStatLibido").innerText = `${appState.stats.libido}`;
  document.getElementById("liveStatBudget").innerText = `Lv.${appState.stats.budget}`;
  document.getElementById("headerAssetVal").innerText = `Lv.${appState.stats.income}`;
  document.getElementById("statSummaryText").innerText = `本業年収水準: Lv.${appState.stats.income}`;
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
      case 1: pool = ["年始の家族時間を終え、隠れ家で飢えたように抱き合った。", "「今年もよろしくね」とそっと指を絡めた。"]; break;
      case 2: pool = ["人目を盗んで小さなチョコを手渡され、甘い密会へ。", "「本命にはあげられないから」とホテルでチョコを渡された。"]; break;
      case 3: pool = ["年度末の繁忙期、仕事帰りに駆け込みでホテルへ。", "春風の冷たい夜、お互いの仕事の愚痴をホテルで癒やし合う。"]; break;
      case 4: pool = ["人通りの少ない通りで、息を潜めて夜桜散歩。", "隠れ家ホテルで春の午後を過ごした。"]; break;
      case 5: pool = ["連休明けの平日昼下がり、久しぶりの逢瀬に飢えたように抱き合う。"]; break;
      case 6: pool = ["ゲリラ豪雨を口実に、急遽シティホテルのデイユースへ。"]; break;
      case 7: pool = ["薄着の季節。「肌が綺麗だね」とホテルで囁かれた。"]; break;
      case 8: pool = ["お盆の帰省期間。全パートナーと連絡自粛の沈黙週間。"]; break;
      case 9: pool = ["少し涼しくなった夜、当てもなく夜風に吹かれドライブ。"]; break;
      case 10: pool = ["平日に有休を合わせ、隠れ家個室の和食ランチへ。"]; break;
      case 11: pool = ["寒くなった手を、コートのポケットの中でそっと握られた。"]; break;
      case 12: pool = ["忘年会の口実で、終電を気にせずホテルで今年最後の密会。"]; break;
      default: pool = ["個室ディナーのあと、いつものホテルで濃密な2時間。"];
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