/* ============================================================
   events.js - OUTROMANCE 動的イベント・セリフ・自然な密会描写（完全版）
   ============================================================ */

window.STIMULUS_TEXTS = window.STIMULUS_TEXTS || [
  "秘密のアイテムを持ち込み、理性が吹き飛ぶほどの悦楽に溺れた。",
  "普段の遠慮が消え去り、シーツを強く握りしめるほどの快感に震えた。",
  "禁断の遊びに火がつき、時間が経つのも忘れて激しく求め合った。",
  "吐息が漏れるのも構わず、かつてない深い高みへと一気に駆け上がった。"
];

window.GIFT_TEXTS = window.GIFT_TEXTS || [
  "さりげないプレゼントに目を輝かせ、二人の絆がより確固たるものになった。",
  "「大事にされてるって実感する」と微笑まれ、関係が深く安定した。",
  "心のこもった贈り物に感激し、これまで以上に甘い時間を過ごした。",
  "小さなギフトが二人の距離を縮め、しばらく別れの心配はなさそうだ。"
];

window.MANUAL_BREAKUP_QUOTES = window.MANUAL_BREAKUP_QUOTES || [
  "「今までありがとう。お互い、元の日常に戻らなきゃいけないもんね。」",
  "「夢みたいな時間だったよ。元気でね、さようなら。」",
  "「いつかこんな日が来るって分かってた。最後に会えてよかった。」",
  "「無理は言わないよ。あなたと過ごした時間は一生の宝物だから。」"
];

window.BREAKUP_QUOTES_FEMALE_PARTNER = window.BREAKUP_QUOTES_FEMALE_PARTNER || [
  "「ごめんね、これ以上続けると家庭を壊しそう……今までありがとう。」",
  "「夫にスマホを見られそうになって怖くなったの。もう会えない。」",
  "「楽しかったけど、そろそろ日常に戻らなきゃ。元気でね。」",
  "「あなたに本気になりすぎて苦しいの。ここで終わりにしよう。」"
];

window.BREAKUP_QUOTES_MALE_PARTNER = window.BREAKUP_QUOTES_MALE_PARTNER || [
  "「悪い、急に転勤が決まってさ。これ以上はリスクが高すぎるんだ。」",
  "「妻の勘が鋭くなってきて……君に迷惑かける前に身を引くよ。」",
  "「仕事が修羅場でどうしても時間が作れない。いい思い出をありがとう。」",
  "「お互い家庭が一番大事だからな。この辺で綺麗なまま終わろう。」"
];

// 裏事情タグ × 性別連動の動的ランダムセリフ（スマホ向け30文字前後短縮版）
window.pickPartnerQuote = function(gender, tag) {
  const isMale = (gender === "male");
  const pool = {
    "平日昼": isMale
      ? [
          "「平日の昼間に抜け出せます。ランチから大人な時間を。」",
          "「外回り営業なので昼は自由です。密会しませんか？」",
          "「仕事の合間に息抜きしたいです。秘密は絶対に守ります。」"
        ]
      : [
          "「平日昼間なら動けます。日常を忘れて甘えたいな。」",
          "「夫が仕事の間に少しだけ…ランチからホテルもOKです。」",
          "「昼下がりのカフェで待ち合わせしませんか？秘密厳守で。」"
        ],
    "割り切り": isMale
      ? [
          "「家庭を壊す気はゼロ。お互い割り切って楽しみましょう。」",
          "「後腐れなく大人の関係になれる方を探しています。」",
          "「深入りせず、会う時だけ最高に盛り上がりたいです。」"
        ]
      : [
          "「家庭は大事なので割り切り希望。相性が合えば長く。」",
          "「重くならない大人の関係が理想です。ホテル直行も可。」",
          "「お互い様なので干渉なし。気持ちいい時間だけ共有したい。」"
        ],
    "秘密厳守": isMale
      ? [
          "「通知オフ・現金払い徹底。絶対にバレない配慮をします。」",
          "「リスク管理は万全。安心してお任せ下さい。」",
          "「人目のつかない場所で静かに会える方を探しています。」"
        ]
      : [
          "「絶対に身バレしたくないので、慎重な方だと嬉しいです。」",
          "「連絡はアプリ内のみ希望。お互いの日常を守りましょう。」",
          "「静かな場所が好きです。二人だけの秘密を共有しませんか？」"
        ],
    "年下独身": isMale
      ? [
          "「年上の落ち着いた色気に惹かれます。何でも合わせます。」",
          "「既婚者の方の方が余裕があって素敵。甘えさせて下さい。」",
          "「休日は暇してるので、いつでも呼び出して大丈夫です！」"
        ]
      : [
          "「年上の大人の男性がタイプです。たくさん教えてください。」",
          "「独身なので時間は自由です。寂しい夜にいつでもどうぞ。」",
          "「同世代より包容力のある既婚者さんに惹かれちゃいます。」"
        ],
    "冷えきり": isMale
      ? [
          "「家では完全に空気扱い。もう一度男として求められたい。」",
          "「妻とは何年もレス状態…温もりを思い出させてください。」",
          "「家庭に居場所がなくて。心も体も癒やし合える相手希望。」"
        ]
      : [
          "「夫とはもう何年も何もなくて…女として愛されたいです。」",
          "「仮面夫婦状態です。優しい腕の中で久しぶりに溶けたい。」",
          "「家では母親役ばかり。一人の女に戻れる時間が欲しいです。」"
        ],
    "夜間遠征": isMale
      ? [
          "「出張や残業が多いので、夜遅くでもフットワーク軽いです。」",
          "「終電前まで飲んだ後、そのまま朝まで過ごせたら最高。」",
          "「夜の街で待ち合わせて、非日常の夜を一緒に過ごしたい。」"
        ]
      : [
          "「夜に少しだけ外出できます。ネオンの街で密会したいな。」",
          "「飲み会の帰りに少しだけ…終電までのシンデレラタイム。」",
          "「夜のドライブやホテルで、昼とは違う顔を見せたいです。」"
        ]
  };

  const list = pool[tag] || pool["平日昼"];
  return list[Math.floor(Math.random() * list.length)];
};

// 都県別のリアルな密会スポット候補（本人の登録駅は自動除外して選出）
const MEET_SPOTS_BY_PREF = {
  "埼玉": ["池袋", "大宮", "赤羽", "上野", "新宿", "さいたま新都心", "川越"],
  "神奈川": ["渋谷", "横浜", "恵比寿", "川崎", "新横浜", "品川", "二子玉川", "みなとみらい"],
  "千葉": ["錦糸町", "東京", "上野", "船橋", "北千住", "海浜幕張", "舞浜", "柏"],
  "東京": ["新宿", "渋谷", "銀座", "五反田", "恵比寿", "池袋", "上野", "赤坂", "品川", "三軒茶屋"]
};

// 自然な密会ログ生成（説明臭さをなくし、本人の地元を外した街で自然に落ち合う描写）
window.generateMonthlyActionText = function(partner, calMonth, usedTexts) {
  const areaStr = (partner && partner.area) ? partner.area : "東京・中目黒";
  const parts = areaStr.split("・");
  const pref = parts[0] || "東京";
  const homeSpot = parts[1] || "";
  const tag = (partner && partner.tag) ? partner.tag : "平日昼";

  // 登録県に対応する密会候補から「本人の登録駅(homeSpot)」を除外
  const rawSpots = MEET_SPOTS_BY_PREF[pref] || MEET_SPOTS_BY_PREF["東京"];
  const filteredSpots = rawSpots.filter(s => s !== homeSpot);
  const spotPool = filteredSpots.length > 0 ? filteredSpots : rawSpots;
  const meetSpot = spotPool[Math.floor(Math.random() * spotPool.length)];

  const seasonPhrases = {
    1: "新年の慌ただしさを縫って",
    2: "冷たい北風を避けるように",
    3: "春の気配が漂い始めた午後に",
    4: "夜桜の喧騒から離れた裏通りで",
    5: "連休の合間のわずかな隙を突いて",
    6: "梅雨の雨音をBGMにしながら",
    7: "うだるような暑さから逃れて",
    8: "お盆の帰省ラッシュを横目に",
    9: "少し涼しくなった夕暮れ時に",
    10: "秋晴れの心地よい空気の中で",
    11: "木枯らしが吹き抜ける夜に",
    12: "年末のイルミネーションを背にして"
  };
  const sPhrase = seasonPhrases[calMonth] || "日常の隙間を縫って";

  // 説明くささを排した自然な密会描写プール
  let scenePool = [
    `${sPhrase}、${meetSpot}の路地裏ホテルへ別々に入室。限られた時間の中で激しく愛し合った。`,
    `${meetSpot}駅近くのカフェで軽くお茶をした後、静かなブティックホテルへ移動して濃密な時間を過ごした。`,
    `${meetSpot}の隠れ家ラウンジでグラスを傾け、そのままタクシーでシティホテルへ雪崩れ込んだ。`,
    `昼下がりの${meetSpot}で待ち合わせ。日常の仮面を脱ぎ捨てて深く溶け合った。`,
    `${meetSpot}の駅ビルでさりげなく合流し、人混みを抜けて裏通りのホテルで熱い午後を過ごした。`,
    `${sPhrase}、${meetSpot}のデザイナーズホテルへ直行。シーツを掴むほど深く求め合った。`,
    `${meetSpot}で軽く食事を済ませた後、人目のつかないホテルで時計の針を忘れて抱き合った。`,
    `仕事の合間を縫って${meetSpot}で密会。互いの体温を確かめるように何度も体を重ねた。`
  ];

  // 都県ごとの空気感をさりげなく混ぜる
  if (pref === "埼玉") {
    scenePool.push(`${meetSpot}駅東口のホテル街へ滑り込み、気兼ねない空気の中で昼下がりから深く溶け合った。`);
    scenePool.push(`${meetSpot}周辺のロードサイドホテルへ車で入り、日常を完全に忘れて肌を重ねた。`);
  } else if (pref === "神奈川") {
    scenePool.push(`${meetSpot}の海風を感じるベイエリアのホテルで、夜景を眺めながら背徳のひとときに溺れた。`);
    scenePool.push(`${meetSpot}駅近くの隠れ家バルからホテルへ移動し、洗練された空間で濃密な夜を過ごした。`);
  } else if (pref === "千葉") {
    scenePool.push(`${meetSpot}の湾岸エリアにあるリゾート感漂うホテルの部屋で、時間を忘れて溺れ合った。`);
    scenePool.push(`${meetSpot}駅前の喧騒を抜け、静かな裏通りのビジネスホテルでいつも以上に大胆に求め合った。`);
  } else {
    scenePool.push(`${meetSpot}の高級ホテルのバーで待ち合わせ、そのまま上層階の部屋で背徳の夜を過ごした。`);
  }

  // 裏事情タグ固有の自然なシチュエーションを追加
  if (tag === "平日昼") {
    scenePool.push(`平日の昼下がり、${meetSpot}のホテルでデイユース利用。背徳感に煽られいつも以上に燃え上がった。`);
  } else if (tag === "夜間遠征") {
    scenePool.push(`終電間際の${meetSpot}で合流し、そのまま朝までホテルに篭って何度も体を重ねた。`);
  } else if (tag === "割り切り") {
    scenePool.push(`${meetSpot}のホテル前で現地集合・現地解散。無駄な会話もなく本能のままに求め合った。`);
  } else if (tag === "冷えきり") {
    scenePool.push(`${meetSpot}の静かな部屋で「家ではこんなことできない」と吐息を漏らしながら強く抱き合った。`);
  } else if (tag === "年下独身") {
    scenePool.push(`${meetSpot}で待ち合わせた瞬間から無邪気に腕を絡められ、ホテルに入るなり激しく求められた。`);
  } else if (tag === "秘密厳守") {
    scenePool.push(`${meetSpot}の駅から少し歩いた人目のないホテルを厳選。徹底した秘密主義の中で深く愛し合った。`);
  }

  const candidates = scenePool.filter(txt => !usedTexts || !usedTexts.has(txt));
  const finalPool = candidates.length > 0 ? candidates : scenePool;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
};

// リザルト画面用：最長交際パートナーの記憶セリフ生成
window.generateLastLineText = function(partner, isTargetPartnerMale, isLongestActive) {
  const areaStr = (partner && partner.area) ? partner.area : "東京・銀座";
  const parts = areaStr.split("・");
  const pref = parts[0] || "東京";
  const homeSpot = parts[1] || "";
  const rawSpots = MEET_SPOTS_BY_PREF[pref] || MEET_SPOTS_BY_PREF["東京"];
  const filtered = rawSpots.filter(s => s !== homeSpot);
  const spot = (filtered.length > 0 ? filtered[0] : rawSpots[0]) || "あの街";

  if (isLongestActive) {
    return isTargetPartnerMale
      ? `「${spot}で初めて会った日から、ずっと君に夢中だよ。これからも秘密の時間を重ねよう。」`
      : `「${spot}で過ごした時間があるから毎日頑張れるの。これからもずっと私だけの秘密でいてね。」`;
  } else {
    return isTargetPartnerMale
      ? `「${spot}のホテルで過ごした日々は一生忘れない。お互い良い家庭を築こうな、ありがとう。」`
      : `「${spot}で待ち合わせするたび胸が高鳴ってたよ。夢みたいな5年間を本当にありがとう。」`;
  }
};
