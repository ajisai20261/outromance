/**
 * ui.js — アウトロマンス 〜既婚者たちの裏歴史〜
 * UI描画・年次決算モーダル・リザルト成績表カード生成・男女別アフィリエイトPR自動出し分け
 */

// グローバル状態（既存の game.js が定義済みならそれを尊重し、未定義なら初期化）
window.state = window.state || {
  gender: 'male',        // 'male' | 'female'
  name: 'ユウジ',
  age: 40,
  targetAge: 'same',     // 'younger' | 'same' | 'older'
  playstyle: 'balanced', // 'pure' (1) | 'balanced' (2) | 'chaos' (4)
  maxPartners: 2,
  month: 0,
  maxMonths: 60,
  looks: 60,
  stamina: 80,
  budget: 50,            // 単位：万円
  alertLevel: 0,         // 最大5で離婚ゲームオーバー
  partners: [],
  totalMatched: 0,
  totalDates: 0,
  longestMonths: 0,
  hadBreakup: false,
  alimonyPaid: 0,
  speed: 1,
  timerId: null,
  isGameOver: false
};

const MALE_NAMES = ['ユウジ', 'ケンジ', 'タカシ', 'マコト', 'ダイスケ', 'シンジ', 'ナオキ', 'リョウ'];
const FEMALE_NAMES = ['ミホ', 'ユカリ', 'サオリ', 'アヤカ', 'ナオミ', 'カオリ', 'レイコ', 'マユミ'];
const PARTNER_POOL_F = ['ミサキ', 'カホ', 'エリナ', 'チナツ', 'ハルカ', 'アスカ', 'ユイ', 'マリナ', 'リサ', 'シオリ', 'カナ', 'モモコ'];
const PARTNER_POOL_M = ['タクヤ', 'コウジ', 'シュン', 'ヒデキ', 'ケイスケ', 'ユウト', 'トモヤ', 'ハヤト', 'マサキ', 'ジュン', 'ソラ', 'レン'];
const TOKYO_SPOTS = ['恵比寿', '銀座', '新宿三丁目', '赤坂', '渋谷', '池袋', '品川', '六本木', '神楽坂', '表参道', '横浜みなとみらい', '大宮'];

// =========================================================================
// ★ 男女別アフィリエイトPR自動出し分け（男性：カドル／女性：ヒールメイト） ★
// =========================================================================
function renderAffiliatePR(targetId, isCompact = false) {
  const container = document.getElementById(targetId);
  if (!container) return;

  const isMale = (window.state && window.state.gender === 'male');

  const offer = isMale ? {
    badge: 'PR ｜ 既婚者限定マッチング',
    accentBorder: 'border-sky-400/35',
    accentBg: 'bg-[#0f192e]/90',
    badgeColor: 'text-sky-300 bg-sky-500/20',
    btnGradient: 'from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500',
    title: 'Cuddle（カドル）— 現実の首都圏で大人の出会いを',
    shortText: 'AIが相性の良い相手を毎日提案。登録者100万人超・アプリ不要のブラウザ完結。',
    desc: 'AIがあなたに合う相手を毎日自動で提案。登録者数100万人超・アプリ不要のブラウザ完結で身バレ防止機能も充実した2020年代の定番サイト。',
    btnText: 'Cuddle（カドル）を無料で試す ▶',
    url: 'https://www.cuddle-jp.com/?utm_source=07441a48-50e1-70cb-f914-09e0176f9c8d&utm_medium=affiliate&utm_campaign=affiliate'
  } : {
    badge: 'PR ｜ 既婚者専用マッチング',
    accentBorder: 'border-rose-400/35',
    accentBg: 'bg-[#241026]/90',
    badgeColor: 'text-rose-300 bg-rose-500/20',
    btnGradient: 'from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500',
    title: 'Healmate（ヒールメイト）— 心安らぐ大人の恋愛を',
    shortText: '女性完全無料・アプリ不要。写真のぼかし機能などプライバシー重視の安心設計。',
    desc: '女性は完全無料・アプリ不要のブラウザ完結。プロフィール写真のぼかし機能やニックネーム制など、プライバシーを重視したい女性に選ばれています。',
    btnText: 'Healmate（ヒールメイト）を無料で覗く ▶',
    url: 'https://healmate.jp/?utm_source=affiliate_hlmt&utm_medium=affiliate&utm_campaign=Vm7q9n7fgjep1u7'
  };

  if (isCompact) {
    // 年次決算モーダル用（スリムなバナーカード）
    container.innerHTML = `
      <a href="${offer.url}" target="_blank" rel="noopener noreferrer sponsored"
         class="block rounded-xl border ${offer.accentBorder} ${offer.accentBg} p-3 text-left transition hover:brightness-110">
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="rounded px-1.5 py-0.5 text-[10px] font-bold ${offer.badgeColor}">${offer.badge}</span>
          <span class="text-[11px] font-bold text-white/90">公式サイト ▶</span>
        </div>
        <div class="text-xs font-bold text-white">${offer.title}</div>
        <p class="text-[11px] text-purple-100/75 mt-0.5 leading-snug">${offer.shortText}</p>
      </a>
    `;
  } else {
    // リザルト画面用（しっかり訴求するフルカード）
    container.innerHTML = `
      <div class="rounded-2xl border ${offer.accentBorder} ${offer.accentBg} p-4 sm:p-5 text-left shadow-xl space-y-3">
        <div class="flex items-center justify-between">
          <span class="rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider ${offer.badgeColor}">
            ${offer.badge}
          </span>
          <span class="text-[10px] text-purple-200/50">18歳未満利用不可</span>
        </div>
        <div class="space-y-1">
          <h3 class="text-sm sm:text-base font-bold text-white">${offer.title}</h3>
          <p class="text-xs text-purple-100/80 leading-relaxed">${offer.desc}</p>
        </div>
        <a href="${offer.url}" target="_blank" rel="noopener noreferrer sponsored"
           class="block w-full rounded-xl bg-gradient-to-r ${offer.btnGradient} py-3 text-center text-xs sm:text-sm font-bold text-white shadow-md transition hover:scale-[1.01]">
          ${offer.btnText}
        </a>
      </div>
    `;
  }
}

// =========================================================================
// 画面遷移・プロフィール設定操作
// =========================================================================
function switchScreen(screenId) {
  ['step-title', 'step-setup', 'step-play', 'step-result'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', id !== screenId);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToSetup() {
  switchScreen('step-setup');
}

function resetToTitle() {
  stopLoop();
  switchScreen('step-title');
}

function selectGender(gender) {
  state.gender = gender;
  const maleBtn = document.getElementById('btn-gender-male');
  const femaleBtn = document.getElementById('btn-gender-female');
  if (maleBtn && femaleBtn) {
    maleBtn.className = gender === 'male'
      ? 'rounded-xl border-2 border-sky-400 bg-sky-500/20 p-3 text-left transition'
      : 'rounded-xl border border-white/15 bg-white/5 p-3 text-left transition';
    femaleBtn.className = gender === 'female'
      ? 'rounded-xl border-2 border-rose-400 bg-rose-500/20 p-3 text-left transition'
      : 'rounded-xl border border-white/15 bg-white/5 p-3 text-left transition';
  }
  randomizeName();
}

function randomizeName() {
  const pool = state.gender === 'male' ? MALE_NAMES : FEMALE_NAMES;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  const input = document.getElementById('input-name');
  if (input) input.value = picked;
}

function selectTargetAge(target) {
  state.targetAge = target;
  ['younger', 'same', 'older'].forEach(key => {
    const btn = document.getElementById(`btn-target-${key}`);
    if (!btn) return;
    btn.className = key === target
      ? 'rounded-xl border-2 border-amber-400 bg-amber-500/20 p-2.5 text-center transition'
      : 'rounded-xl border border-white/15 bg-white/5 p-2.5 text-center transition';
  });
}

function selectPlaystyle(style) {
  state.playstyle = style;
  state.maxPartners = style === 'pure' ? 1 : (style === 'chaos' ? 4 : 2);
  ['pure', 'balanced', 'chaos'].forEach(key => {
    const btn = document.getElementById(`btn-style-${key}`);
    if (!btn) return;
    btn.className = key === style
      ? 'w-full rounded-xl border-2 border-amber-400 bg-amber-500/15 p-3 text-left transition flex items-center justify-between'
      : 'w-full rounded-xl border border-white/15 bg-white/5 p-3 text-left transition flex items-center justify-between';
  });
}

function toggleBgm() {
  const audio = document.getElementById('bgm-audio');
  const btn = document.getElementById('bgm-toggle-btn');
  if (!audio || !btn) return;
  if (audio.paused) {
    audio.volume = 0.35;
    audio.play().then(() => {
      btn.textContent = '🔊 BGM';
    }).catch(() => {});
  } else {
    audio.pause();
    btn.textContent = '🔇 BGM';
  }
}

// =========================================================================
// ゲーム開始・進行エンジン（game.js があれば委譲、なければ内蔵エンジン動作）
// =========================================================================
function startGame() {
  const nameInput = document.getElementById('input-name');
  const ageInput = document.getElementById('input-age');
  const rawName = (nameInput && nameInput.value.trim()) ? nameInput.value.trim().slice(0, 5) : (state.gender === 'male' ? 'ユウジ' : 'ミホ');

  Object.assign(state, {
    name: rawName,
    age: ageInput ? parseInt(ageInput.value, 10) : 40,
    maxPartners: state.playstyle === 'pure' ? 1 : (state.playstyle === 'chaos' ? 4 : 2),
    month: 0,
    maxMonths: 60,
    looks: state.gender === 'female' ? 72 : 62,
    stamina: 85,
    budget: state.gender === 'male' ? 60 : 40,
    alertLevel: 0,
    partners: [],
    totalMatched: 0,
    totalDates: 0,
    longestMonths: 0,
    hadBreakup: false,
    alimonyPaid: 0,
    isGameOver: false
  });

  const logEl = document.getElementById('event-log');
  if (logEl) logEl.innerHTML = '';

  switchScreen('step-play');
  appendLog(`🌃 ${state.name}（${state.age}歳）の5年間の裏歴史が幕を開けた。`);
  updateHUD();

  if (typeof window.onExternalGameStart === 'function') {
    window.onExternalGameStart(state);
  } else {
    setGameSpeed(1);
  }
}

function setGameSpeed(speed) {
  state.speed = speed;
  [
    { id: 'speed-pause', val: 0 },
    { id: 'speed-05', val: 0.5 },
    { id: 'speed-1', val: 1 },
    { id: 'speed-2', val: 2 }
  ].forEach(item => {
    const btn = document.getElementById(item.id);
    if (!btn) return;
    btn.className = item.val === speed
      ? 'rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-bold text-white'
      : 'rounded-lg px-2 py-1 text-[11px] font-bold text-purple-200 hover:bg-white/10';
  });

  stopLoop();
  if (speed > 0 && !state.isGameOver) {
    const interval = speed === 2 ? 550 : (speed === 0.5 ? 1800 : 1000);
    state.timerId = setInterval(() => {
      stepOneMonth();
    }, interval);
  }
}

function stopLoop() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function stepOneMonth() {
  if (state.isGameOver) return;

  if (typeof window.externalStepMonth === 'function') {
    window.externalStepMonth();
    return;
  }

  state.month += 1;
  if (state.month % 12 === 1 && state.month > 1) {
    state.age += 1;
  }

  // 毎月の基礎回復・収入
  state.budget += state.gender === 'male' ? 6 : 4;
  state.stamina = Math.min(100, state.stamina + 6);

  // 1. 新規マッチング判定
  if (state.partners.length < state.maxPartners) {
    const baseProb = state.gender === 'male'
      ? Math.min(0.75, 0.25 + state.budget * 0.004)
      : Math.min(0.80, 0.30 + state.looks * 0.005);
    const ageMod = state.targetAge === 'older' ? 0.12 : (state.targetAge === 'younger' ? -0.08 : 0);

    if (Math.random() < baseProb + ageMod) {
      createNewPartner();
    }
  }

  // 2. 既存パートナーとの密会・関係進行
  for (let i = state.partners.length - 1; i >= 0; i--) {
    const p = state.partners[i];
    p.months += 1;
    if (p.months > state.longestMonths) state.longestMonths = p.months;

    const cost = state.gender === 'male' ? 3 : 1;
    if (state.budget >= cost && state.stamina >= 10) {
      state.budget -= cost;
      state.stamina -= 8;
      state.totalDates += 1;
      p.intimacy = Math.min(100, p.intimacy + 6);

      const spot = TOKYO_SPOTS[Math.floor(Math.random() * TOKYO_SPOTS.length)];
      if (state.month % 3 === 0) {
        appendLog(`🍷 ${spot}で${p.name}（${p.age}歳）と密会を重ねた。（交際${p.months}ヶ月目）`);
      }
    } else {
      p.intimacy -= 12;
    }

    // 同時進行による家庭崩壊リスク
    if (state.partners.length >= 2 && Math.random() < 0.09 * (state.partners.length - 1)) {
      state.alertLevel = Math.min(5, state.alertLevel + 1);
      showToast(`🚨 帰宅時間やスマホの通知から配偶者に疑われ始めた…（家庭崩壊度 ${state.alertLevel}/5）`);
      appendLog(`🚨 【警戒】複数交際の歪みで家庭崩壊度が上昇（現在 ${state.alertLevel}/5）`);
    }

    // Lv.3以上で慰謝料リスク
    if (state.alertLevel >= 3 && Math.random() < 0.08) {
      const penalty = 25;
      state.budget = Math.max(0, state.budget - penalty);
      state.alimonyPaid += penalty;
      showToast(`⚖️ 相手の配偶者から内容証明郵便！示談金 ${penalty}万円を支払った…`);
      appendLog(`⚖️ 【慰謝料】トラブル解決のため ${penalty}万円を支出。`);
    }

    // 破局判定
    const breakChance = state.targetAge === 'younger' ? 0.08 : (state.targetAge === 'older' ? 0.02 : 0.04);
    if (p.intimacy <= 15 || (p.months > 4 && Math.random() < breakChance)) {
      state.hadBreakup = true;
      appendLog(`💔 ${p.name}（${p.age}歳）との関係が自然消滅・破局となった。`);
      if (state.targetAge === 'younger' && Math.random() < 0.25) {
        state.alertLevel = Math.min(5, state.alertLevel + 1);
        showToast(`⚠️ 別れ話がこじれ、家庭崩壊度が上昇した！（${state.alertLevel}/5）`);
      }
      state.partners.splice(i, 1);
    }
  }

  updateHUD();

  // ゲームオーバー判定（家庭崩壊度5）
  if (state.alertLevel >= 5) {
    state.isGameOver = true;
    stopLoop();
    appendLog(`💥 家庭崩壊度が限界に到達。離婚・家庭崩壊エンドとなった……。`);
    showResult(true);
    return;
  }

  // 60ヶ月完走判定
  if (state.month >= state.maxMonths) {
    state.isGameOver = true;
    stopLoop();
    appendLog(`✨ 60ヶ月（5年間）の秘密の恋愛を完走した！`);
    showResult(false);
    return;
  }

  // 12ヶ月ごとの年次決算モーダル
  if (state.month % 12 === 0) {
    openAnnualModal(state.month / 12);
  }
}

function createNewPartner() {
  const pool = state.gender === 'male' ? PARTNER_POOL_F : PARTNER_POOL_M;
  const used = state.partners.map(p => p.name);
  const available = pool.filter(n => !used.includes(n));
  const name = available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : pool[Math.floor(Math.random() * pool.length)];

  let ageOffset = 0;
  if (state.targetAge === 'younger') ageOffset = -Math.floor(Math.random() * 8 + 4);
  else if (state.targetAge === 'older') ageOffset = Math.floor(Math.random() * 8 + 3);
  else ageOffset = Math.floor(Math.random() * 5) - 2;

  const pAge = Math.max(24, state.age + ageOffset);
  const spot = TOKYO_SPOTS[Math.floor(Math.random() * TOKYO_SPOTS.length)];

  state.partners.push({
    id: Date.now() + Math.random(),
    name,
    age: pAge,
    intimacy: 55,
    months: 1
  });
  state.totalMatched += 1;

  showToast(`💖 NEW MATCHED! ${spot}で ${name}（${pAge}歳）と出会った！`);
  appendLog(`💖 【成立】${name}（${pAge}歳）と秘密の関係が始まった。`);
}

// =========================================================================
// プレイヤー介入アクション
// =========================================================================
function triggerBoost() {
  if (state.budget < 5) {
    showToast('💳 活動費が不足しています（必要：5万円）');
    return;
  }
  state.budget -= 5;
  appendLog(`🚀 ブーストを実行！首都圏ネットワークでの露出を高めた（-5万）`);
  if (state.partners.length < state.maxPartners) {
    createNewPartner();
  } else {
    state.partners.forEach(p => { p.intimacy = Math.min(100, p.intimacy + 10); });
    showToast('🚀 魅力が高まり、交際中の相手との親密度がアップ！');
  }
  updateHUD();
}

function partnerAction(id, type) {
  const idx = state.partners.findIndex(p => p.id === id);
  if (idx === -1) return;
  const p = state.partners[idx];

  if (type === 'stimulate') {
    if (state.stamina < 12) {
      showToast('⚡ 体力が不足しています');
      return;
    }
    state.stamina -= 12;
    p.intimacy = Math.min(100, p.intimacy + 18);
    appendLog(`💓 ${p.name}に刺激的なデートを提案し、親密度が大きく上昇！`);
  } else if (type === 'gift') {
    if (state.budget < 5) {
      showToast('💳 活動費が不足しています（必要：5万）');
      return;
    }
    state.budget -= 5;
    p.intimacy = Math.min(100, p.intimacy + 22);
    appendLog(`🎁 ${p.name}にサプライズの贈物を渡し、満足度が回復した（-5万）`);
  } else if (type === 'breakup') {
    state.hadBreakup = true;
    appendLog(`💔 ${p.name}（${p.age}歳）に別れを告げ、関係を精算した。`);
    state.partners.splice(idx, 1);
  }
  updateHUD();
}

// =========================================================================
// HUD・パートナーリスト・ログ描画
// =========================================================================
function updateHUD() {
  const styleLabel = state.playstyle === 'pure' ? '💍 純愛継続型' : (state.playstyle === 'chaos' ? '⚔️ 修羅乱舞型' : '🍷 分散余裕型');
  const year = Math.floor(state.month / 12) + 1;
  const rem = Math.max(0, state.maxMonths - state.month);

  const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  setText('hud-name', state.name);
  setText('hud-age', `(${state.age}歳)`);
  setText('hud-style-badge', styleLabel);
  setText('hud-date', `${Math.min(5, year)}年目 ${(state.month % 12) + 1}ヶ月目（残り${rem}ヶ月）`);
  setText('stat-looks', state.looks);
  setText('stat-stamina', state.stamina);
  setText('stat-budget', `${state.budget}万`);
  setText('stat-alert', `${state.alertLevel} / 5`);
  setText('hud-partner-count', `${state.partners.length} / ${state.maxPartners}人`);

  const bar = document.getElementById('hud-progress-bar');
  if (bar) bar.style.width = `${Math.min(100, (state.month / state.maxMonths) * 100)}%`;

  renderPartners();
}

function renderPartners() {
  const list = document.getElementById('partners-list');
  if (!list) return;

  if (state.partners.length === 0) {
    list.innerHTML = `
      <div class="rounded-xl border border-dashed border-white/15 py-5 text-center text-xs text-purple-300/60">
        現在交際中の相手はいません（時間経過または🚀ブーストで出会いを探します）
      </div>`;
    return;
  }

  list.innerHTML = state.partners.map(p => `
    <div class="rounded-xl border border-white/10 bg-black/35 p-3 space-y-2">
      <div class="flex items-center justify-between">
        <div>
          <span class="text-sm font-bold text-white">${p.name}</span>
          <span class="text-xs text-purple-200/75 ml-1">(${p.age}歳)</span>
          <span class="ml-2 rounded bg-pink-500/20 px-1.5 py-0.5 text-[10px] font-bold text-pink-300">交際${p.months}ヶ月</span>
        </div>
        <div class="text-xs font-bold text-rose-300">親密度 ${p.intimacy}%</div>
      </div>
      <div class="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div class="h-full bg-gradient-to-r from-pink-500 to-rose-400" style="width: ${p.intimacy}%"></div>
      </div>
      <div class="grid grid-cols-3 gap-1.5 pt-0.5">
        <button type="button" onclick="partnerAction(${p.id}, 'stimulate')"
          class="rounded-lg bg-pink-500/15 border border-pink-400/30 py-1.5 text-[11px] font-bold text-pink-200 hover:bg-pink-500/25">
          💓 刺激
        </button>
        <button type="button" onclick="partnerAction(${p.id}, 'gift')"
          class="rounded-lg bg-purple-500/15 border border-purple-400/30 py-1.5 text-[11px] font-bold text-purple-200 hover:bg-purple-500/25">
          🎁 贈物(-5万)
        </button>
        <button type="button" onclick="partnerAction(${p.id}, 'breakup')"
          class="rounded-lg bg-white/5 border border-white/15 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-white/15">
          💔 別れ
        </button>
      </div>
    </div>
  `).join('');
}

function appendLog(text) {
  const log = document.getElementById('event-log');
  if (!log) return;
  const row = document.createElement('div');
  row.className = 'border-b border-white/5 pb-1';
  row.textContent = `[${state.month}ヶ月目] ${text}`;
  log.prepend(row);
}

let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast-banner');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}

// =========================================================================
// 年次決算モーダル（アフィリエイトPR枠連動）
// =========================================================================
function openAnnualModal(yearNum) {
  stopLoop();
  const modal = document.getElementById('annual-modal');
  const title = document.getElementById('annual-modal-title');
  const summary = document.getElementById('annual-modal-summary');
  if (!modal) return;

  if (title) title.textContent = `${yearNum}年目 年次決算レポート`;
  if (summary) {
    summary.innerHTML = `
      <div>・現在の交際人数：<strong class="text-white">${state.partners.length}人</strong>（累計マッチング：${state.totalMatched}人）</div>
      <div>・累計密会回数：<strong class="text-white">${state.totalDates}回</strong> ／ 残高：<strong class="text-sky-300">${state.budget}万円</strong></div>
      <div>・現在の家庭崩壊度：<strong class="text-rose-400">${state.alertLevel} / 5</strong></div>
    `;
  }

  // ★ 年次決算モーダル内の性別別PR枠を描画 ★
  renderAffiliatePR('annual-pr-slot', true);

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function applyAnnualCare(type) {
  if (type === 'family') {
    if (state.budget < 10) {
      showToast('💳 活動費が不足しています（必要：10万円）');
      return;
    }
    state.budget -= 10;
    state.alertLevel = Math.max(0, state.alertLevel - 1);
    appendLog(`🏠 年次決算で家族サービスを実施。家庭崩壊度が軽減された（-10万）`);
  } else if (type === 'looks') {
    if (state.budget < 8) {
      showToast('💳 活動費が不足しています（必要：8万円）');
      return;
    }
    state.budget -= 8;
    state.looks = Math.min(100, state.looks + 10);
    state.stamina = Math.min(100, state.stamina + 15);
    appendLog(`✨ 年次決算で自分磨きに投資。外見と体力が回復した（-8万）`);
  }
  updateHUD();
  openAnnualModal(Math.floor(state.month / 12));
}

function closeAnnualModal() {
  const modal = document.getElementById('annual-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  setGameSpeed(state.speed || 1);
}

// =========================================================================
// リザルト画面（STEP 3）＆ 1080×1080 成績表カード生成
// =========================================================================
function evaluateResult(isDivorced) {
  const achievements = [];
  if (!isDivorced && !state.hadBreakup && state.longestMonths >= 50) achievements.push('💍 五年の絆');
  if (state.totalMatched >= 10) achievements.push('⚔️ 首都圏のハンター');
  if (!isDivorced && state.alertLevel === 0) achievements.push('🛡️ 無傷の帰還');
  if (!isDivorced && state.alertLevel >= 3) achievements.push('🔥 修羅場の生還者');
  if (state.budget >= 80) achievements.push('💳 余裕の資産家');
  if (state.totalDates >= 40) achievements.push('🍷 逢瀬の達人');
  if (achievements.length === 0) achievements.push('🌃 首都圏の目撃者');

  let title = '首都圏の旅人';
  let epilogue = '';

  if (isDivorced) {
    title = '離婚・家庭崩壊';
    epilogue = `${state.month}ヶ月目、積み重なった違和感と綻びがついに決壊した。2020年代の東京首都圏で築いた秘密の物語は、高い代償とともに幕を閉じることとなった……。`;
  } else if (achievements.includes('💍 五年の絆')) {
    title = '五年の絆';
    epilogue = `60ヶ月という長い歳月を、たった一人の特別な相手と一度も別れることなく駆け抜けた。日常のすぐ隣で育まれた静かで深い絆は、誰にも知られないまま二人の裏歴史に刻まれた。`;
  } else if (state.totalMatched >= 8) {
    title = '首都圏の覇者';
    epilogue = `網の目のように走る鉄道網と大都市の匿名性を味方につけ、数多の出会いと別れを華麗に渡り歩いた5年間。あなたの名前は夜の街の伝説として静かに語り継がれる。`;
  } else {
    title = '大人の二重生活';
    epilogue = `家庭の平穏を守り抜きながら、5年間（60ヶ月）の秘密の恋愛を無事に完走した。日常と非日常を鮮やかに切り替えるその手腕は、まさに現代の首都圏が生んだ大人の流儀だった。`;
  }

  return { title, epilogue, achievements };
}

function showResult(isDivorced = false) {
  const { title, epilogue, achievements } = evaluateResult(isDivorced);

  const badgeEl = document.getElementById('result-badge');
  const titleEl = document.getElementById('result-title');
  const epilogueEl = document.getElementById('result-epilogue');
  const achEl = document.getElementById('result-achievements');

  if (badgeEl) badgeEl.textContent = isDivorced ? `途中終了（${state.month}ヶ月目）` : '60ヶ月（5年間）完走達成';
  if (titleEl) titleEl.textContent = `称号：${title}`;
  if (epilogueEl) epilogueEl.textContent = epilogue;
  if (achEl) {
    achEl.innerHTML = achievements.map(a =>
      `<span class="rounded-full border border-amber-400/35 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-200">${a}</span>`
    ).join('');
  }

  switchScreen('step-result');

  // 1080x1080 成績表カード描画
  generateScorecardCanvas(title, achievements, isDivorced);

  // ★ リザルト画面内の性別別PR枠を描画（男性：カドル／女性：ヒールメイト） ★
  renderAffiliatePR('result-pr-slot', false);
}

function generateScorecardCanvas(title, achievements, isDivorced) {
  const canvas = document.getElementById('scorecard-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // 背景グラデーション
  const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
  grad.addColorStop(0, '#120924');
  grad.addColorStop(0.5, '#1e1038');
  grad.addColorStop(1, '#090512');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1080);

  // 外枠ゴールドライン
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
  ctx.lineWidth = 6;
  ctx.strokeRect(42, 42, 996, 996);

  // ヘッダー
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 28px "Noto Sans JP", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OUTROMANCE — 婚外5年シミュレーター成績表', 540, 125);

  // プレイヤー情報
  const genderStr = state.gender === 'male' ? '既婚男性' : '既婚女性';
  ctx.fillStyle = '#e9d5ff';
  ctx.font = 'bold 34px "Noto Sans JP", sans-serif';
  ctx.fillText(`${state.name}（${state.age}歳・${genderStr}）`, 540, 200);

  // 称号ボックス
  ctx.fillStyle = 'rgba(244, 63, 94, 0.16)';
  ctx.fillRect(110, 250, 860, 180);
  ctx.strokeStyle = 'rgba(244, 63, 94, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(110, 250, 860, 180);

  ctx.fillStyle = '#fda4af';
  ctx.font = 'bold 26px "Noto Sans JP", sans-serif';
  ctx.fillText(isDivorced ? `記録：${state.month}ヶ月目で家庭崩壊` : '記録：60ヶ月（5年間）完走', 540, 305);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 62px "Noto Serif JP", serif';
  ctx.fillText(`『${title}』`, 540, 390);

  // 戦績グリッド
  const stats = [
    { label: '累計マッチング人数', value: `${state.totalMatched} 人` },
    { label: '累計密会回数', value: `${state.totalDates} 回` },
    { label: '最長交際期間', value: `${state.longestMonths} ヶ月` },
    { label: '最終家庭崩壊度', value: `${state.alertLevel} / 5` }
  ];

  stats.forEach((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 110 + col * 445;
    const y = 480 + row * 165;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(x, y, 415, 140);

    ctx.fillStyle = '#c4b5fd';
    ctx.font = 'bold 24px "Noto Sans JP", sans-serif';
    ctx.fillText(item.label, x + 207, y + 52);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 44px "Noto Sans JP", sans-serif';
    ctx.fillText(item.value, x + 207, y + 112);
  });

  // 獲得実績
  ctx.fillStyle = '#fcd34d';
  ctx.font = 'bold 28px "Noto Sans JP", sans-serif';
  ctx.fillText(`獲得実績：${achievements.join('  ')}`, 540, 880);

  // フッターURL
  ctx.fillStyle = 'rgba(233, 213, 255, 0.65)';
  ctx.font = 'bold 24px "Noto Sans JP", sans-serif';
  ctx.fillText('Ajisai Game Studio ｜ https://outromance.vercel.app/', 540, 985);
}

function downloadScorecard() {
  const canvas = document.getElementById('scorecard-canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `outromance_${state.name}_scorecard.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function shareOnX() {
  const titleEl = document.getElementById('result-title');
  const titleText = titleEl ? titleEl.textContent : '称号：五年の絆';
  const text = `『アウトロマンス 〜既婚者たちの裏歴史〜』をプレイしました！\n${titleText}（累計マッチング${state.totalMatched}人／密会${state.totalDates}回）\n#アウトロマンス #婚外恋愛 #フリーゲーム\nhttps://outromance.vercel.app/`;
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(shareUrl, '_blank', 'noopener,noreferrer');
}

// =========================================================================
// 外部 game.js とのフック用エイリアス（関数名揺れ吸収）
// =========================================================================
window.renderAffiliatePR = renderAffiliatePR;
window.openAnnualModal = openAnnualModal;
window.showYearlySettlement = openAnnualModal;
window.showResult = showResult;
window.renderResult = showResult;
