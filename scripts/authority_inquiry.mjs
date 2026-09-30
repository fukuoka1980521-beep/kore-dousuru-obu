import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function loadDraftSeeds(root) {
  const dir = path.join(root, "tools", "municipality-packs", "drafts");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const file = path.join(dir, entry.name, "source-seeds.draft.json");
      return fs.existsSync(file) ? readJson(file) : [];
    });
}

export function loadSeeds(root = repoRoot) {
  const dir = path.join(root, "tools", "coverage");
  const published = fs.readdirSync(dir)
    .filter((name) => name === "official-source-seeds.json" || name.endsWith("-source-seeds.json"))
    .sort()
    .flatMap((name) => readJson(path.join(dir, name)));
  const byKey = new Map();
  for (const seed of loadDraftSeeds(root)) byKey.set(seed.municipality_id + ":" + seed.need_id, seed);
  for (const seed of published) byKey.set(seed.municipality_id + ":" + seed.need_id, seed);
  return [...byKey.values()];
}

export function pendingAuthoritySeeds(root = repoRoot) {
  return loadSeeds(root)
    .filter((seed) => seed.local_gate === "NEEDS_AUTHORITY_CONFIRMATION")
    .sort((a, b) =>
      String(a.municipality_id).localeCompare(String(b.municipality_id), "ja") ||
      String(a.need_id).localeCompare(String(b.need_id), "ja")
    );
}

function parseArgs(argv) {
  const out = { command: argv[0] || "queue" };
  for (const arg of argv.slice(1)) {
    if (!arg.startsWith("--")) continue;
    const [rawKey, ...rest] = arg.slice(2).split("=");
    out[rawKey.replace(/-/g, "_")] = rest.join("=");
  }
  return out;
}

function requireSeed(args, root = repoRoot) {
  if (!args.municipality || !args.need) {
    throw new Error("prepare/record requires --municipality=<id> and --need=<need_id>");
  }
  const seed = pendingAuthoritySeeds(root).find(
    (item) => item.municipality_id === args.municipality && item.need_id === args.need
  );
  if (!seed) throw new Error(`No pending authority-confirmation item: ${args.municipality}/${args.need}`);
  return seed;
}

export function inquiryPacket(seed) {
  const body = [
    "ご担当者様",
    "",
    "自治体の公式情報をもとに、住民が困りごとから適切な行政窓口へたどり着ける非公式ナビゲーションサービスを開発しています。",
    "公式ページだけでは以下の点を安全に確定できなかったため、確認をお願いいたします。",
    "",
    `【確認事項】${seed.authority_question}`,
    "",
    `【確認が必要な理由】${seed.why_needed}`,
    "",
    "回答いただきたい内容：",
    "1. 正式な相談・受付窓口",
    "2. 住民へ案内する際の条件・例外・対象外",
    "3. 公式に参照すべきページが別にある場合はそのURL",
    "",
    "個人案件の判断ではなく、一般的な案内ルールの確認です。",
    "よろしくお願いいたします。"
  ].join("\n");

  return {
    developer_only: true,
    state: "PENDING",
    municipality_id: seed.municipality_id,
    need_id: seed.need_id,
    checked_at: seed.checked_at,
    authority_contact: seed.authority_contact,
    authority_question: seed.authority_question,
    why_needed: seed.why_needed,
    required_context: seed.required_context || [],
    official_sources: seed.official_sources || [],
    phone_script: [
      "自治体の公式情報を住民向けに案内する非公式サービスの開発確認です。",
      `確認したい点は「${seed.authority_question}」です。`,
      "公式ページに掲載されている範囲を超えて推測したくないため、住民へ案内してよい正式な窓口・条件・例外を確認したいです。",
      "回答内容を制度案内の根拠として記録してよい範囲も確認します。"
    ].join(" "),
    message_subject: `行政案内ルート確認：${seed.municipality_id} / ${seed.need_id}`,
    message_body: body,
    evidence_to_record: [
      "contacted_at",
      "channel (phone/email/web_form/in_person)",
      "authority_department",
      "answer_summary",
      "scope_and_exceptions",
      "official_url_if_provided",
      "evidence_location"
    ],
    safety: [
      "不要な個人情報は保存しない",
      "口頭回答だけで制度要件を拡張しない",
      "回答取得後も LOCAL_ADMIN_SPECIAL_RULE_CHECK を更新するまで公開実装しない",
      "SOURCE_CONFLICT が生じた場合は推測で公開側を上書きしない"
    ]
  };
}

export function queueMarkdown(seeds) {
  const lines = [
    "# 行政問い合わせキュー（開発者専用）",
    "",
    "> 公開サイトの利用者向け機能ではありません。公式情報だけで住民向け導線を確定できない項目だけを列挙します。",
    "",
    `未解決: ${seeds.length}件`,
    ""
  ];
  for (const seed of seeds) {
    lines.push(
      `## ${seed.municipality_id} / ${seed.need_id}`,
      "",
      `- 確認先: ${seed.authority_contact}`,
      `- 確認事項: ${seed.authority_question}`,
      `- 必要理由: ${seed.why_needed}`,
      `- 最終調査日: ${seed.checked_at}`,
      ""
    );
  }
  return lines.join("\n");
}

function packetMarkdown(packet) {
  return [
    "# 行政問い合わせ票（開発者専用）",
    "",
    `- 自治体ID: ${packet.municipality_id}`,
    `- ニーズID: ${packet.need_id}`,
    `- 確認先: ${packet.authority_contact}`,
    `- 状態: ${packet.state}`,
    "",
    "## 確認事項", packet.authority_question, "",
    "## なぜ確認が必要か", packet.why_needed, "",
    "## 既存の公式根拠",
    ...packet.official_sources.map((source) => `- [${source.title}](${source.url})`),
    "",
    "## 電話用スクリプト", packet.phone_script, "",
    "## メール／問い合わせフォーム用",
    `件名: ${packet.message_subject}`, "", packet.message_body, "",
    "## 回答取得後に必ず記録",
    ...packet.evidence_to_record.map((item) => `- ${item}`),
    "",
    "## 安全境界",
    ...packet.safety.map((item) => `- ${item}`), ""
  ].join("\n");
}

function writeMaybe(file, content) {
  if (!file) {
    process.stdout.write(content + (content.endsWith("\n") ? "" : "\n"));
    return;
  }
  const resolved = path.resolve(file);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, content.endsWith("\n") ? content : content + "\n");
  process.stdout.write(`WROTE ${resolved}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "queue") {
    const seeds = pendingAuthoritySeeds();
    writeMaybe(args.out, args.format === "json" ? JSON.stringify(seeds.map(inquiryPacket), null, 2) : queueMarkdown(seeds));
  } else if (args.command === "prepare") {
    const packet = inquiryPacket(requireSeed(args));
    writeMaybe(args.out, args.format === "json" ? JSON.stringify(packet, null, 2) : packetMarkdown(packet));
  } else if (args.command === "record") {
    const seed = requireSeed(args);
    const required = ["channel", "contacted_at", "authority_department", "answer_file", "evidence_location"];
    const missing = required.filter((key) => !args[key]);
    if (missing.length) throw new Error(`record missing: ${missing.join(", ")}`);
    const allowedChannels = new Set(["phone", "email", "web_form", "in_person"]);
    if (!allowedChannels.has(args.channel)) throw new Error("channel must be phone/email/web_form/in_person");
    const answerPath = path.resolve(args.answer_file);
    if (!fs.existsSync(answerPath)) throw new Error(`answer file not found: ${answerPath}`);
    const answerSummary = fs.readFileSync(answerPath, "utf8").trim();
    if (answerSummary.length < 20) throw new Error("answer summary is too short");
    const record = {
      developer_only: true,
      municipality_id: seed.municipality_id,
      need_id: seed.need_id,
      state: "ANSWER_RECORDED",
      contacted_at: args.contacted_at,
      channel: args.channel,
      authority_department: args.authority_department,
      answer_summary: answerSummary,
      scope_and_exceptions: args.scope || "",
      official_url_if_provided: args.official_url || "",
      evidence_location: args.evidence_location,
      source_seed_checked_at: seed.checked_at,
      recorded_at: new Date().toISOString(),
      gate_after_recording: "REVIEW_REQUIRED",
      note: "回答記録だけでは公開実装しない。LOCAL_ADMIN_SPECIAL_RULE_CHECK更新と再テストが必要。"
    };
    const defaultOut = path.join(repoRoot, "tools", "authority-inquiry", "evidence", `${seed.municipality_id}--${seed.need_id}.json`);
    writeMaybe(args.out || defaultOut, JSON.stringify(record, null, 2));
  } else {
    throw new Error(`Unknown command: ${args.command}`);
  }
}
