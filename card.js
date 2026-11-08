/* ============================================================
   card.js - OUTROMANCE 成績表カード生成 ＆ SNS連携（安全化完全版）
   ============================================================ */

async function generateSquareCard() {
  if (document.fonts) {
    try { await document.fonts.ready; } catch(e) {}
  }
  const cvs = document.getElementById("exportCanvas");
  if (!cvs) return;
  const ctx = cvs.getContext("2d");

  // 背景グラデーション
  const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
  bgGrad.addColorStop(0, "#07080d");
  bgGrad.addColorStop(0.5, "#121422");
  bgGrad.addColorStop(1, "#090912");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1080);

  // 外枠
  ctx.strokeStyle = "rgba(157, 78, 221, 0.4)";
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, 1008, 1008);

  // ヘッダー情報
  ctx.fillStyle = "#64748b";
  ctx.font = "bold 16px 'Cinzel', serif";
  ctx.textAlign = "right";
  ctx.fillText("AJISAI GAME STUDIO PRESENTS", 1008, 76);
  ctx.textAlign = "left";

  ctx.fillStyle = "#c084fc";
  ctx.font = "bold 18px 'Noto Sans JP', sans-serif";
  ctx.fillText("婚外5年シミュレーター", 72, 86);

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 52px 'Noto Sans JP', sans-serif";
  ctx.fillText("アウトロマンス", 72, 144);

  ctx.font = "bold 22px 'Noto Sans JP', sans-serif";
  ctx.fillStyle = "#f472b6";
  ctx.fillText("〜既婚者たちの", 72, 182);
  const preW = ctx.measureText("〜既婚者たちの").width;
  ctx.fillStyle = "#fb7185";
  ctx.font = "900 26px 'Noto Sans JP', sans-serif";
  ctx.fillText("裏", 72 + preW, 182);
  const uraW = ctx.measureText("裏").width;
  ctx.fillStyle = "#f472b6";
  ctx.font = "bold 22px 'Noto Sans JP', sans-serif";
  ctx.fillText("歴史〜", 72 + preW + uraW, 182);

  // 称号表示（リザルト画面のバッジテキストを同期反映）
  const titleEl = document.getElementById("resTitleBadge");
  const title = titleEl ? titleEl.innerText : "『首都圏の彷徨い人』";
  ctx.fillStyle = "#fef08a";
  ctx.font = "900 48px 'Noto Sans JP', sans-serif";
  ctx.fillText(title, 72, 260);

  // プレイヤー情報
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "20px 'Noto Sans JP', sans-serif";
  const finalAge = typeof getRealAge === "function" ? getRealAge(appState.sim.currentMonth) : appState.sim.currentAge;
  const familyStatusStr = appState.sim.isDivorced ? "家庭崩壊・離婚" : "配偶者と同居中";
  ctx.fillText(`${appState.user.name}（${appState.user.startAge}歳→${finalAge}歳 / 東京） ${familyStatusStr}`, 72, 304);

  // 主要記録（画面と同じ3項目横並びレイアウト）
  const totalCountStr = document.getElementById("resTotalCount")?.innerText || `${appState.sim.partners.length}人`;
  const sexCountStr = document.getElementById("resSexCount")?.innerText || "0回";
  const totalHoursStr = document.getElementById("resTotalHours")?.innerText || "0時間";

  const stats = [
    { label: "累計交際人数", val: totalCountStr, col: "#f472b6" },
    { label: "肌を重ねた回数", val: sexCountStr, col: "#fb7185" },
    { label: "密会時間", val: totalHoursStr, col: "#38bdf8" }
  ];

  const cardW = 296;
  const cardGap = 24;
  stats.forEach((s, i) => {
    const x = 72 + i * (cardW + cardGap);
    const y = 350;
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.fillRect(x, y, cardW, 110);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cardW, 110);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "16px 'Noto Sans JP', sans-serif";
    ctx.fillText(s.label, x + 20, y + 36);

    ctx.fillStyle = s.col;
    ctx.font = "900 38px 'Noto Sans JP', sans-serif";
    ctx.fillText(s.val, x + 20, y + 86);
  });

  // アチーブメント判定（±20歳差、150pt対応）
  let hasOlder20 = appState.sim.metOlder20Plus;
  let hasYounger20 = appState.sim.metYounger20Plus;
  appState.sim.partners.forEach(p => {
    const pAge = typeof getRealAge === "function" ? getRealAge(p.startMonth) : appState.user.startAge;
    if (p.startAge - pAge >= 20) hasOlder20 = true;
    if (p.startAge - pAge <= -20) hasYounger20 = true;
  });

  const achs = [
    { name: "100人斬り", ok: appState.sim.partners.length >= 100 },
    { name: "五年の絆", ok: appState.sim.partners.some(p => p.durationMonths >= 60) },
    { name: "密会150pt", ok: appState.sim.globalMaxSexScore >= 150 },
    { name: "+20歳年上", ok: hasOlder20 },
    { name: "-20歳年下", ok: hasYounger20 }
  ];

  achs.forEach((a, i) => {
    const ax = 72 + i * 190;
    const ay = 585;
    ctx.fillStyle = a.ok ? "rgba(245, 158, 11, 0.15)" : "rgba(30, 41, 59, 0.4)";
    ctx.fillRect(ax, ay, 175, 45);
    ctx.strokeStyle = a.ok ? "#f59e0b" : "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ax, ay, 175, 45);

    ctx.fillStyle = a.ok ? "#fde047" : "#64748b";
    ctx.font = "bold 13px 'Noto Sans JP', sans-serif";
    ctx.fillText((a.ok ? "★ " : "☆ ") + a.name, ax + 14, ay + 28);
  });

  // パートナー枠（最長交際 ＆ 最高密会度スコア）
  const sortedByDuration = [...appState.sim.partners].sort((a,b) => b.durationMonths - a.durationMonths);
  const longestP = sortedByDuration[0] || { name: "なし", durationMonths: 0, area: "東京", avatarId: "F01", tag: "平日昼", endMonth: null, color: "#a855f7" };
  const highestScoreP = appState.sim.highestScorePartner || longestP;

  ctx.imageSmoothingEnabled = false;

  // 最長交際パートナー枠
  ctx.fillStyle = "rgba(24, 18, 43, 0.85)";
  ctx.fillRect(72, 660, 440, 245);
  ctx.strokeStyle = "rgba(168, 85, 247, 0.45)";
  ctx.strokeRect(72, 660, 440, 245);

  const longestImg = new Image();
  longestImg.src = (typeof getSafeAvatarSrc === "function") 
    ? getSafeAvatarSrc(longestP.avatarId, longestP.name, longestP.color) 
    : (AvatarCacheManager.get(longestP.avatarId) || "");
  ctx.drawImage(longestImg, 92, 682, 56, 56);

  ctx.fillStyle = "#f472b6";
  ctx.font = "bold 15px 'Noto Sans JP', sans-serif";
  ctx.fillText(`👑 最長交際パートナー 🏷️${longestP.tag}`, 160, 702);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px 'Noto Sans JP', sans-serif";
  ctx.fillText(`${longestP.name} (${longestP.durationMonths}ヶ月)`, 160, 732);

  ctx.fillStyle = "#a7f3d0";
  ctx.font = "italic 15px 'Noto Sans JP', sans-serif";
  wrapCanvasText(ctx, longestP.lastLine || "「……」", 92, 776, 400, 23);

  // 最高密会度パートナー枠
  ctx.fillStyle = "rgba(30, 18, 25, 0.85)";
  ctx.fillRect(532, 660, 476, 245);
  ctx.strokeStyle = "rgba(244, 63, 94, 0.45)";
  ctx.strokeRect(532, 660, 476, 245);

  const highestImg = new Image();
  highestImg.src = (typeof getSafeAvatarSrc === "function") 
    ? getSafeAvatarSrc(highestScoreP.avatarId, highestScoreP.name, highestScoreP.color) 
    : (AvatarCacheManager.get(highestScoreP.avatarId) || "");
  ctx.drawImage(highestImg, 552, 682, 56, 56);

  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 15px 'Noto Sans JP', sans-serif";
  ctx.fillText(`🔥 歴代最高密会スコア 🏷️${highestScoreP.tag}`, 620, 702);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px 'Noto Sans JP', sans-serif";
  ctx.fillText(`${highestScoreP.name} (${appState.sim.globalMaxSexScore || highestScoreP.maxSexScore} pt)`, 620, 732);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "italic 15px 'Noto Sans JP', sans-serif";
  wrapCanvasText(ctx, "「ホテルのシーツを掴んだまま息が止まりそうになったあの夜は、一生忘れられない。」", 552, 776, 436, 23);

  // フッター
  ctx.fillStyle = "#64748b";
  ctx.font = "15px 'Noto Sans JP', sans-serif";
  ctx.fillText("OUTROMANCE : 婚外5年シミュレーター 〜既婚者たちの裏歴史〜", 72, 980);
  ctx.textAlign = "right";
  ctx.fillText(window.location.origin + window.location.pathname, 1008, 980);
  ctx.textAlign = "left";

  const dataUrl = cvs.toDataURL("image/png");
  const saveImg = document.getElementById("generatedCardImage");
  if (saveImg) saveImg.src = dataUrl;
  const modal = document.getElementById("imageSaveModal");
  if (modal) modal.classList.remove("hidden");

  try {
    const link = document.createElement("a");
    link.download = `OUTROMANCE_${appState.user.name}_婚外5年成績表.png`;
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

function closeImageModal() {
  document.getElementById("imageSaveModal")?.classList.add("hidden");
}

function shareOnX() {
  const name = appState.user.name || "名無し";
  const title = document.getElementById("resTitleBadge")?.innerText || "『首都圏の彷徨い人』";
  const count = document.getElementById("resTotalCount")?.innerText || `${appState.sim.partners.length}人`;
  const sexCount = document.getElementById("resSexCount")?.innerText || "0回";
  const score = appState.sim.globalMaxSexScore || 0;
  const url = window.location.href;

  let outcomeLine = "";
  if (appState.sim.isDivorced) {
    const passedY = Math.floor(appState.sim.currentMonth / 12);
    outcomeLine = `結末：${passedY}年目に決定打を握られ離婚…`;
  } else if (appState.sim.isRetired) {
    outcomeLine = "結末：破滅の手前で自らアプリ消去";
  } else {
    outcomeLine = "結末：家庭を守り切り完全生還";
  }

  const textBody = 
`【アウトロマンス 〜既婚者たちの裏歴史〜】
${name}の5年が終了。

称号：${title}
${outcomeLine}
累計交際：${count}（逢瀬${sexCount}）
最高密会度：${score}pt

▼5年後の裏歴史をシミュレート
${url}
#アウトロマンス #婚外恋愛 #フリーゲーム`;

  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(textBody)}`, "_blank");
}
