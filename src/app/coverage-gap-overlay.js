/* 大府市版 Coverage Gap Overlay: 公式調査済みの未収録ニーズだけを追加する。 */
(function () {
  "use strict";
  if (!window.KoreDousuruCore) return;

  const GAP_PROCEDURES = [
    {
      procedure_id: "obu-gap-roads-damage",
      municipality_id: "obu",
      name: "道路・側溝・街路灯などの損傷通報",
      aliases: ["道路の穴", "道路に穴", "道路陥没", "道路が壊れている", "側溝が壊れた", "カーブミラーが壊れた", "ガードレールが壊れた", "街路灯が消えている", "防犯灯が消えている"],
      conclusion: "大府市が管理する道路・側溝・カーブミラー・照明などの損傷は、市公式LINEの「損傷通報」から写真と場所を送って知らせることができます。",
      deadline: "危険箇所を見つけたら、できるだけ早めに通報してください。",
      how_to: "大府市公式LINEを開き、「損傷通報」から対象を選び、損傷状況の写真と位置が分かる情報を送ってください。",
      required_documents: ["損傷状況が分かる写真", "場所が分かる情報"],
      fee: "通報自体は無料",
      window_office: "大府市公式LINE「損傷通報」",
      district_dependent: false,
      department_name: "大府市 道路等損傷通報",
      phone: "電話連絡が必要な場合は公式ページで担当窓口を確認",
      business_hours: "LINE通報の利用方法は公式ページで確認",
      online_available: true,
      related_procedures: [],
      official_url: "https://www.city.obu.aichi.jp/shisei/koho/1028695/index.html",
      official_page_title: "市公式LINEから「損傷通報」ができます｜大府市",
      source_checked_at: "2026-09-30",
      status: "CONFIRMED_OFFICIAL",
      notes: "市が管理していない道路等は別の管理者になる場合があります。"
    },
    {
      procedure_id: "obu-gap-water-leak",
      municipality_id: "obu",
      name: "水漏れ・漏水",
      aliases: ["水漏れ", "漏水", "水道管が破裂", "道路から水が出ている", "家の水道が漏れている", "水道管から水"],
      conclusion: "水漏れは、道路側か宅地内かで連絡先が違います。宅地内は大府市指定の給水装置工事事業者、道路などの漏水は水道工務課へ連絡します。",
      deadline: "漏水を見つけたら早めに対応してください。",
      how_to: "宅地内の給水管や器具の修理は大府市指定給水装置工事事業者へ依頼してください。道路などで水が漏れている場合は水道工務課へ知らせてください。",
      required_documents: [],
      fee: "宅地内の修理費は自己負担。道路上の漏水は市へ通報",
      window_office: "指定給水装置工事事業者／大府市水道工務課",
      district_dependent: false,
      department_name: "水道部 水道工務課",
      phone: "0562-45-6319",
      business_hours: "公式ページで確認",
      online_available: false,
      related_procedures: [],
      official_url: "https://www.city.obu.aichi.jp/kurashi/dourokasen/1032479/1033127/1032570/1032844.html",
      official_page_title: "水道の修理｜大府市",
      source_checked_at: "2026-09-30",
      status: "CONFIRMED_OFFICIAL",
      notes: "宅地内と道路上で対応先が異なります。"
    },
    {
      procedure_id: "obu-gap-water-outage",
      municipality_id: "obu",
      name: "断水・急に水が出ない",
      aliases: ["断水", "水が出ない", "急に水が出ない", "蛇口から水が出ない", "近所も水が出ない"],
      conclusion: "まず止水栓と近隣の状況を確認します。近隣も断水なら水道管の突発事故の可能性があるため水道工務課へ、受水槽のある集合住宅なら管理会社へ相談します。",
      deadline: "突然水が出なくなった場合は、原因を確認して早めに連絡してください。",
      how_to: "①メータ器前の止水栓を確認 ②近隣も断水しているか確認 ③近隣も断水なら水道工務課へ連絡。集合住宅で受水槽がある場合は管理会社へ相談してください。",
      required_documents: [],
      fee: "相談は無料。修理が必要な場合の費用は原因・管理区分により異なる",
      window_office: "大府市水道工務課／集合住宅の管理会社",
      district_dependent: false,
      department_name: "水道部 水道工務課",
      phone: "0562-45-6319",
      business_hours: "公式ページで確認",
      online_available: false,
      related_procedures: [],
      official_url: "https://www.city.obu.aichi.jp/faq/machizukuri/suido/1001402.html",
      official_page_title: "よくある質問 水が出ないのですがどうしたらよいですか｜大府市",
      source_checked_at: "2026-09-30",
      status: "CONFIRMED_OFFICIAL",
      notes: "集合住宅では受水槽・ポンプ側の故障も確認します。"
    },
    {
      procedure_id: "obu-gap-pension-exemption",
      municipality_id: "obu",
      name: "国民年金保険料の免除・納付猶予",
      aliases: ["年金免除", "国民年金が払えない", "年金払えない", "国民年金保険料免除", "納付猶予", "失業して年金が払えない", "学生納付特例"],
      conclusion: "収入減少や失業などで国民年金保険料の納付が難しい場合、申請により免除・納付猶予を受けられる可能性があります。学生は別の学生納付特例を確認します。",
      deadline: "対象年度やさかのぼって申請できる期間があります。現在の対象期間は日本年金機構の公式ページで確認してください。",
      how_to: "まず学生かどうかを確認してください。学生以外で納付が難しい場合は、所得・失業等の状況を確認し、大府市の国保年金窓口、年金事務所、または対応する電子申請で手続します。",
      required_documents: ["本人確認書類", "失業等の特例を使う場合は事実を確認できる書類（詳細は公式案内で確認）"],
      fee: "申請手数料は通常不要",
      window_office: "大府市保険医療課 国保年金係／年金事務所",
      district_dependent: false,
      department_name: "保険医療課 国保年金係",
      phone: "公式ページで確認",
      business_hours: "公式ページで確認",
      online_available: true,
      related_procedures: [],
      official_url: "https://www.nenkin.go.jp/service/kokunen/menjo/20150428.html",
      official_page_title: "国民年金保険料の免除制度・納付猶予制度｜日本年金機構",
      source_checked_at: "2026-09-30",
      status: "CONFIRMED_OFFICIAL",
      notes: "制度条件・対象年度は日本年金機構の現行情報を正本とし、大府市ページは窓口確認に用います。"
    },
    {
      procedure_id: "obu-gap-high-cost-medical",
      municipality_id: "obu",
      name: "高額療養費・医療費が高い",
      aliases: ["高額療養費", "医療費が高い", "入院費が高い", "病院代が高い", "限度額適用認定", "手術代が高い"],
      conclusion: "最初に「どの健康保険に加入しているか」を確認してください。大府市の国民健康保険なら市の高額療養費制度、職場の健康保険なら勤務先・加入している健康保険の窓口が手続先です。",
      deadline: "保険者ごとに手続時期・期限があります。該当する保険者の最新案内を確認してください。",
      how_to: "①資格確認書・マイナ保険証等で加入している健康保険を確認 ②大府市国保なら市公式の高額療養費案内を確認 ③職場の保険なら職場の健康保険担当者等へ確認してください。",
      required_documents: ["加入している健康保険が分かるもの", "申請に必要な書類は保険者の案内で確認"],
      fee: "申請手数料は通常不要",
      window_office: "加入している健康保険の窓口",
      district_dependent: false,
      department_name: "大府市国保の場合：保険医療課 国保年金係",
      phone: "大府市国保年金係 0562-45-6330",
      business_hours: "公式ページで確認",
      online_available: true,
      related_procedures: [],
      official_url: "https://www.city.obu.aichi.jp/faq/kurashi/hoken/1001127.html",
      official_page_title: "よくある質問 ひと月の医療費が高額になってしまうので…｜大府市",
      source_checked_at: "2026-09-30",
      status: "CONFIRMED_OFFICIAL",
      notes: "大府市ページは市国保加入者向け。職場の保険加入者は職場の健康保険担当へ。"
    },
    {
      procedure_id: "obu-gap-public-housing",
      municipality_id: "obu",
      name: "市営住宅を探したい",
      aliases: ["市営住宅", "公営住宅", "市営住宅に入りたい", "安い住宅", "住宅募集", "入居募集", "家を借りたい"],
      conclusion: "住宅に困っていて所得等の条件を満たす場合、大府市営住宅へ申し込める可能性があります。定期募集は原則1月・7月で、空室状況により先着順募集が行われる場合があります。",
      deadline: "募集時期・対象住戸は変わるため、申込前に最新の募集案内を確認してください。",
      how_to: "①入居資格を確認 ②最新の募集住戸・募集方法を公式ページで確認 ③募集案内に従って申し込んでください。",
      required_documents: ["必要書類は最新の募集案内で確認"],
      fee: "入居時の敷金・家賃等があります。金額・条件は募集案内で確認",
      window_office: "大府市 建設総務課 市営住宅施設係",
      district_dependent: false,
      department_name: "都市整備部 建設総務課 市営住宅施設係",
      phone: "0562-85-3896",
      business_hours: "市役所開庁時間。最新情報は公式ページで確認",
      online_available: true,
      related_procedures: [],
      official_url: "https://www.city.obu.aichi.jp/shisetsu/shisetsu_kurashi/shieijyutaku/1005386.html",
      official_page_title: "市営住宅｜大府市",
      source_checked_at: "2026-09-30",
      status: "CONFIRMED_OFFICIAL",
      notes: "個別の募集期間は画面に固定せず、公式の最新募集案内へ誘導します。"
    }
  ];

  function norm(s) {
    return (s || "").toString().normalize("NFKC").toLowerCase()
      .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
      .replace(/[\s　。、！？「」『』（）()・･]/g, "");
  }

  function score(p, query) {
    const q = norm(query);
    if (!q) return 0;
    let best = 0;
    for (const raw of [p.name, ...(p.aliases || [])]) {
      const t = norm(raw);
      if (!t) continue;
      if (q === t) best = Math.max(best, 140 + t.length);
      else if (q.includes(t) && t.length >= 2) best = Math.max(best, 110 + t.length);
      else if (t.includes(q) && q.length >= 2) best = Math.max(best, 75 + q.length);
    }
    return best;
  }

  function add(items) {
    const ids = new Set(items.map((x) => x.procedure_id));
    for (const p of GAP_PROCEDURES) if (!ids.has(p.procedure_id)) items.push({ ...p });
    return items;
  }

  const load0 = window.KoreDousuruCore.loadMunicipality;
  window.KoreDousuruCore.loadMunicipality = async function (path) {
    const bundle = await load0(path);
    add(bundle.procedures);
    return bundle;
  };

  const search0 = window.KoreDousuruCore.searchProcedures;
  window.KoreDousuruCore.searchProcedures = function (query, procedures) {
    add(procedures);
    const priority = GAP_PROCEDURES
      .map((p) => ({ p, score: score(p, query) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => procedures.find((p) => p.procedure_id === x.p.procedure_id) || x.p);
    const normal = search0(query, procedures);
    const seen = new Set();
    return [...priority, ...normal].filter((p) => p && !seen.has(p.procedure_id) && (seen.add(p.procedure_id), true));
  };

  window.__KORE_DOUSURU_COVERAGE_GAP_OVERLAY__ = {
    version: "coverage-gap-v0.1-20260930",
    records: GAP_PROCEDURES,
    search(query) {
      return GAP_PROCEDURES
        .map((p) => ({ id: p.procedure_id, name: p.name, score: score(p, query) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score);
    }
  };
})();
