/* ============================================================
   card.js - OUTROMANCE 1080×1080 成績表画像生成 ＆ SNSシェア（完全版）
   ============================================================ */

function loadImageAsync(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    if (!src.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function truncateText(ctx, text, maxWidth) {
  if (!text) return "";
  if (ctx.measureText(text).width <= maxWidth) return text;
  let str = text;
  while (str.length > 0 && ctx.measureText(str + "…").width > maxWidth) {
    str = str.slice(0, -1);
  }
  return str + "…";
}

async function generateSquareCard() {
  const canvas = document.getElementById("exportCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = 1080;
  const H = 1080;

  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#090d16");
  bgGrad.addColorStop(0.5, "#170f29");
  bgGrad.addColorStop(1, "#0a0e1a");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const glow1 = ctx.createRadialGradient(220, 200, 10, 220, 200, 460);
  glow1.addColorStop(0, "rgba(168, 85, 247, 0.22)");
  glow1.addColorStop(1, "rgba(168, 85, 247, 0)");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(860, 840, 10, 860, 840, 480);
  glow2.addColorStop(0, "rgba(236, 72, 153, 0.20)");
  glow2.addColorStop(1, "rgba(236, 72, 153, 0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(192, 132, 252, 0.45)";
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, 28, 28, W - 56, H - 56, 28);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#c084fc";
  ctx.font = "bold 22px 'Noto Sans JP', sans-serif";
  ctx.fillText("OUTROMANCE : 婚外5年シミュレーター 〜既婚者たちの裏歴史〜", W / 2, 82);

  const userName = appState.user.name || "ユウスケ";
  const startAge = appState.user.startAge || 40;
  const finalAge = (typeof getRealAge === "function") ? getRealAge(appState.sim.currentMonth) : (startAge + 5);
  const isDivorced = appState.sim.isDivorced;

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 48px 'Noto Sans JP', sans-serif";
  ctx.fillText(`${userName} さんの5年間（${startAge}歳 → ${finalAge}歳）`, W / 2, 146);

  const titleEl = document.getElementById("resTitleBadge");
  const titleText = titleEl ? titleEl.innerText : "『首都圏の彷徨い人』";

  drawRoundedRect(ctx, 70, 176, W - 140, 118, 20);
  ctx.fillStyle = isDivorced ? "rgba(136, 19, 55, 0.55)" : "rgba(46, 16, 101, 0.65)";
  ctx.fill();
  ctx.strokeStyle = isDivorced ? "#f43f5e" : "#e879f9";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#fde047";
  ctx.font = "bold 22px 'Noto Sans JP', sans-serif";
  ctx.fillText("獲得称号", W / 2, 214);

  const titleGrad = ctx.createLinearGradient(200, 230, W - 200, 275);
  titleGrad.addColorStop(0, "#fef08a");
  titleGrad.addColorStop(0.5, "#f9a8d4");
  titleGrad.addColorStop(1, "#d8b4fe");
  ctx.fillStyle = titleGrad;
  ctx.font = "900 50px 'Noto Sans JP', sans-serif";
  ctx.fillText(truncateText(ctx, titleText, W - 180), W / 2, 272);

  const totalPartners = appState.sim.partners.length;
  let totalSex = 0, totalDates = 0;
  appState.sim.partners.forEach(p => {
    totalDates += p.datesCount;
    totalSex += (p.chemistry === "S" ? p.datesCount * 2 : p.datesCount);
  });
  const totalHours = Math.round(totalDates * 3.5);

  const statsBoxData = [
    { label: "累計交際人数", val: `${totalPartners}人`, color: "#f472b6" },
    { label: "肌を重ねた回数", val: `${totalSex}回`, color: "#fb7185" },
    { label: "密会時間", val: `${totalHours}時間`, color: "#22d3ee" }
  ];

  const boxW = 294;
  const boxGap = 29;
  const startX = 70;
  statsBoxData.forEach((item, idx) => {
    const bx = startX + idx * (boxW + boxGap);
    const by = 320;
    drawRoundedRect(ctx, bx, by, boxW, 126, 16);
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.fill();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 22px 'Noto Sans JP', sans-serif";
    ctx.fillText(item.label, bx + boxW / 2, by + 42);

    ctx.fillStyle = item.color;
    ctx.font = "900 46px 'Noto Sans JP', sans-serif";
    ctx.fillText(item.val, bx + boxW / 2, by + 100);
  });

  let hasOlder20 = appState.sim.metOlder20Plus;
  let hasYounger20 = appState.sim.metYounger20Plus;
  appState.sim.partners.forEach(p => {
    const playerAgeAtMeet = (typeof getRealAge === "function") ? getRealAge(p.startMonth) : startAge;
    const diff = p.startAge - playerAgeAtMeet;
    if (diff >= 20) hasOlder20 = true;
    if (diff <= -20) hasYounger20 = true;
  });

  const ach100 = totalPartners >= 100;
  const ach5Y = appState.sim.partners.some(p => p.durationMonths >= 60);
  const ach150 = appState.sim.globalMaxSexScore >= 150;
  const achGrand = (!isDivorced && ach100 && ach5Y && ach150 && hasOlder20 && hasYounger20);

  const activeBadges = [];
  if (isDivorced) activeBadges.push({ text: "🚨 離婚・家庭崩壊", bg: "#881337", border: "#f43f5e", color: "#fecdd3" });
  if (appState.sim.lawsuitCount > 0) activeBadges.push({ text: `⚖️ 慰謝料(${appState.sim.lawsuitCount}回)`, bg: "#78350f", border: "#f59e0b", color: "#fde68a" });
  if (achGrand) activeBadges.push({ text: "👑 全能の覇皇", bg: "#713f12", border: "#facc15", color: "#fef08a" });
  if (ach100) activeBadges.push({ text: "⚔️ 100人斬り達成", bg: "#881337", border: "#fb7185", color: "#ffe4e6" });
  if (ach5Y) activeBadges.push({ text: "💍 五年の絆(60ヶ月)", bg: "#78350f", border: "#fbbf24", color: "#fef3c7" });
  if (ach150) activeBadges.push({ text: "⚡ 歓喜の特異点(150pt+)", bg: "#581c87", border: "#c084fc", color: "#f3e8ff" });
  if (hasOlder20) activeBadges.push({ text: "🍷 +20歳年上愛", bg: "#312e81", border: "#818cf8", color: "#e0e7ff" });
  if (hasYounger20) activeBadges.push({ text: "🍓 -20歳年下愛", bg: "#831843", border: "#f472b6", color: "#fce7f3" });
  if (activeBadges.length === 0) {
    activeBadges.push({ text: appState.sim.isRetired ? "🚪 静寂の自主引退" : "🌃 首都圏の5年間完走", bg: "#1e293b", border: "#64748b", color: "#cbd5e1" });
  }

  const showBadges = activeBadges.slice(0, 4);
  ctx.font = "bold 20px 'Noto Sans JP', sans-serif";
  const badgeHeights = 42;
  const badgeWidths = showBadges.map(b => ctx.measureText(b.text).width + 36);
  const totalBadgesW = badgeWidths.reduce((a, b) => a + b, 0) + (showBadges.length - 1) * 14;
  let curBX = (W - totalBadgesW) / 2;
  const curBY = 472;

  showBadges.forEach((b, i) => {
    const bw = badgeWidths[i];
    drawRoundedRect(ctx, curBX, curBY, bw, badgeHeights, 21);
    ctx.fillStyle = b.bg;
    ctx.fill();
    ctx.strokeStyle = b.border;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = b.color;
    ctx.textAlign = "center";
    ctx.fillText(b.text, curBX + bw / 2, curBY + 28);
    curBX += bw + 14;
  });

  // 記憶のパートナー2枚カード（案A：年齢統一 ＋ 二冠達成表示）
  const sortedByDuration = [...appState.sim.partners].sort((a, b) => b.durationMonths - a.durationMonths);
  const longestP = sortedByDuration[0] || {
    id: "", name: "該当なし", startAge: startAge, endAge: startAge, durationMonths: 0,
    chemistry: "-", avatarId: "F01", tag: "なし", area: "東京", color: "#a855f7", maxSexScore: 0
  };
  const highestP = appState.sim.highestScorePartner || longestP;
  const isSameTopPartner = Boolean(longestP.id && highestP.id && longestP.id === highestP.id);

  const longImgSrc = (typeof getSafeAvatarSrc === "function") ? getSafeAvatarSrc(longestP.avatarId, longestP.name, longestP.color) : "";
  const highImgSrc = (typeof getSafeAvatarSrc === "function") ? getSafeAvatarSrc(highestP.avatarId, highestP.name, highestP.color) : "";
  const [longImg, highImg] = await Promise.all([loadImageAsync(longImgSrc), loadImageAsync(highImgSrc)]);

  const partnerCards = [
    {
      header: "👑 最長交際パートナー",
      borderColor: "rgba(192, 132, 252, 0.55)",
      headerColor: "#f472b6",
      partner: longestP,
      img: longImg,
      isLongest: true,
      sub1: `交際 ${longestP.durationMonths}ヶ月（約${(longestP.durationMonths / 12).toFixed(1)}年）`,
      sub2: `🏷️${longestP.tag || "平日昼"} ｜ 相性 ${longestP.chemistry || "B"}`,
      sub2Color: "#a5b4fc"
    },
    {
      header: "🔥 歴代最高密会スコア",
      borderColor: isSameTopPartner ? "rgba(250, 204, 21, 0.8)" : "rgba(251, 113, 133, 0.55)",
      headerColor: "#fbbf24",
      partner: highestP,
      img: highImg,
      isLongest: false,
      sub1: `最高スコア: ${appState.sim.globalMaxSexScore || highestP.maxSexScore || 0} pt`,
      sub2: isSameTopPartner
        ? `👑 最長交際と二冠達成！ ｜ 相性 ${highestP.chemistry || "B"}`
        : `🏷️${highestP.tag || "平日昼"} ｜ 相性 ${highestP.chemistry || "B"}`,
      sub2Color: isSameTopPartner ? "#fde047" : "#a5b4fc"
    }
  ];

  const pCardW = 455;
  const pCardH = 380;
  const pCardY = 545;

  partnerCards.forEach((card, idx) => {
    const cx = 70 + idx * (pCardW + 30);
    drawRoundedRect(ctx, cx, pCardY, pCardW, pCardH, 22);
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.fill();
    ctx.strokeStyle = card.borderColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = card.headerColor;
    ctx.font = "bold 23px 'Noto Sans JP', sans-serif";
    ctx.fillText(card.header, cx + pCardW / 2, pCardY + 42);

    const avSize = 132;
    const avX = cx + (pCardW - avSize) / 2;
    const avY = pCardY + 62;
    drawRoundedRect(ctx, avX - 4, avY - 4, avSize + 8, avSize + 8, 18);
    ctx.fillStyle = card.partner.color || "#a855f7";
    ctx.fill();

    if (card.img) {
      ctx.save();
      drawRoundedRect(ctx, avX, avY, avSize, avSize, 14);
      ctx.clip();
      ctx.drawImage(card.img, avX, avY, avSize, avSize);
      ctx.restore();
    }

    const p = card.partner;
    const dispAge = (card.isLongest && p.endAge && p.endAge > p.startAge)
      ? `${p.startAge}歳→${p.endAge}歳`
      : `${p.startAge}歳`;
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 28px 'Noto Sans JP', sans-serif";
    ctx.fillText(truncateText(ctx, `${p.name} (${dispAge})`, pCardW - 36), cx + pCardW / 2, avY + avSize + 44);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "500 20px 'Noto Sans JP', sans-serif";
    ctx.fillText(truncateText(ctx, `${p.area || "東京"} ｜ ${p.job || "一般事務"}`, pCardW - 36), cx + pCardW / 2, avY + avSize + 78);

    ctx.fillStyle = card.headerColor;
    ctx.font = "bold 24px 'Noto Sans JP', sans-serif";
    ctx.fillText(card.sub1, cx + pCardW / 2, avY + avSize + 118);

    ctx.fillStyle = card.sub2Color;
    ctx.font = "bold 19px 'Noto Sans JP', sans-serif";
    ctx.fillText(card.sub2, cx + pCardW / 2, avY + avSize + 150);
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 21px 'Noto Sans JP', sans-serif";
  ctx.fillText("Ajisai Game Studio  |  #アウトロマンス  #婚外5年シミュレーター", W / 2, 986);

  ctx.fillStyle = "#64748b";
  ctx.font = "18px 'Noto Sans JP', sans-serif";
  ctx.fillText("※本作はフィクションです。実在の人物・団体とは一切関係ありません。", W / 2, 1022);

  const dataUrl = canvas.toDataURL("image/png");
  const outImg = document.getElementById("generatedCardImage");
  if (outImg) outImg.src = dataUrl;
  document.getElementById("imageSaveModal")?.classList.remove("hidden");
}

function closeImageModal() {
  document.getElementById("imageSaveModal")?.classList.add("hidden");
}

if (typeof window.shareOnX !== "function") {
  window.shareOnX = function() {
    const userName = appState.user.name || "ユウスケ";
    const startAge = appState.user.startAge || 40;
    const finalAge = (typeof getRealAge === "function") ? getRealAge(appState.sim.currentMonth) : (startAge + 5);
    const titleEl = document.getElementById("resTitleBadge");
    const titleText = titleEl ? titleEl.innerText : "『首都圏の彷徨い人』";
    const totalPartners = appState.sim.partners.length;
    const maxScore = appState.sim.globalMaxSexScore || 0;

    const text = [
      `【婚外5年シミュレーター】`,
      `${userName}（${startAge}歳→${finalAge}歳）の称号は…`,
      `${titleText} でした！`,
      `累計交際：${totalPartners}人 ／ 最高密会度：${maxScore}pt`,
      `#アウトロマンス #婚外5年シミュレーター`
    ].join("\n");

    const url = window.location.href;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };
}
