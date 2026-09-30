import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const taxonomyPath = path.join(repoRoot, "tools", "coverage", "need-taxonomy.json");

export function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/[\s　。、！？「」『』（）()・･／/・:：,，.．\-ー]/g, "");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readJsonIfExists(file) {
  return fs.existsSync(file) ? readJson(file) : [];
}

function idOf(record) {
  return record.procedure_id || record.guide_id || record.event_id || record.item_id || "unknown";
}

function labelOf(record) {
  return record.name || record.display_name || record.summary || idOf(record);
}
function searchableText(record) {
  const fields = [
    record.name, record.display_name, record.category, record.summary, record.conclusion,
    ...(record.aliases || []), ...(record.intent_tags || [])
  ];
  return normalize(fields.filter(Boolean).join(" "));
}

export function matchNeed(need, records) {
  let best = null;
  for (const record of records) {
    const text = searchableText(record);
    let score = 0;
    let matchedTerm = null;
    let matchLevel = null;
    for (const term of need.strong_terms || []) {
      const n = normalize(term);
      if (n && text.includes(n) && 100 + n.length > score) {
        score = 100 + n.length;
        matchedTerm = term;
        matchLevel = "STRONG";
      }
    }
    for (const term of need.weak_terms || []) {
      const n = normalize(term);
      if (n && text.includes(n) && 40 + n.length > score) {
        score = 40 + n.length;
        matchedTerm = term;
        matchLevel = "WEAK";
      }
    }
    if (score && (!best || score > best.score)) {
      best = { score, matchedTerm, matchLevel, record };
    }
  }
  if (!best) return { status: "MISSING_IN_APP", score: 0, hit: null };
  const confirmed = best.record.status === "CONFIRMED_OFFICIAL";
  const status = best.score >= 100 && confirmed ? "COVERED" : "PARTIAL";
  return {
    status,
    score: best.score,
    hit: {
      id: idOf(best.record),
      label: labelOf(best.record),
      source_type: best.record.__source_type,
      source_file: best.record.__source_file,
      source_status: best.record.status || "NOT_STATED",
      matched_term: best.matchedTerm,
      match_level: best.matchLevel
    }
  };
}

function tagged(records, sourceType, sourceFile) {
  return records.map((record) => ({ ...record, __source_type: sourceType, __source_file: sourceFile }));
}
function extractJsonArray(text, regex, label) {
  const match = text.match(regex);
  if (!match) throw new Error(`Could not extract ${label}`);
  return JSON.parse(match[1]);
}

function loadHanda(root) {
  const file = path.join(root, "handa", "index.html");
  const html = fs.readFileSync(file, "utf8");
  const procedures = extractJsonArray(html, /procedures:(\[[\s\S]*?\]),\s*events:/, "Handa procedures");
  const events = extractJsonArray(html, /events:(\[[\s\S]*?\]),\s*schedule:/, "Handa events");
  return [
    ...tagged(procedures, "procedure", "handa/index.html#embedded-procedures"),
    ...tagged(events, "life_event", "handa/index.html#embedded-events")
  ];
}

function loadObu(root) {
  const proceduresFile = path.join(root, "municipalities", "obu", "data", "procedures.json");
  const overlayFile = path.join(root, "src", "app", "support-overlay.js");
  const procedures = readJson(proceduresFile);
  const overlay = fs.readFileSync(overlayFile, "utf8");
  const supports = extractJsonArray(
    overlay,
    /const SUPPORT_PROCEDURES=(\[[\s\S]*?\]);\s*function norm/,
    "Obu support overlay"
  );
  const eventsFile = path.join(root, "municipalities", "obu", "data", "life_events.json");
  return [
    ...tagged(procedures, "procedure", path.relative(root, proceduresFile)),
    ...tagged(supports, "support_overlay", path.relative(root, overlayFile)),
    ...tagged(readJsonIfExists(eventsFile), "life_event", path.relative(root, eventsFile))
  ];
}

function loadNagoya(root) {
  const base = path.join(root, "municipalities", "nagoya", "data");
  const files = [
    ["procedures.json", "procedure"],
    ["support_guides.json", "support_guide"],
    ["life_events.json", "life_event"]
  ];
  return files.flatMap(([name, type]) => tagged(readJsonIfExists(path.join(base, name)), type, path.join("municipalities", "nagoya", "data", name)));
}
function riskWeight(risk) {
  return ({ SAFETY: 5, FINANCIAL: 4, DEADLINE: 4, CARE: 3, QUALITY_OF_LIFE: 2, BUSINESS: 2, ADMIN: 1 })[risk] || 1;
}

export function buildMatrix(taxonomy, sources) {
  return taxonomy.map((need) => {
    const coverage = {};
    let gapScore = 0;
    for (const [municipality, records] of Object.entries(sources)) {
      coverage[municipality] = matchNeed(need, records);
      if (coverage[municipality].status === "MISSING_IN_APP") gapScore += 3;
      else if (coverage[municipality].status === "PARTIAL") gapScore += 1;
    }
    const priority_score = gapScore * riskWeight(need.risk);
    return {
      ...need,
      coverage,
      gap_count: Object.values(coverage).filter((x) => x.status !== "COVERED").length,
      priority_score,
      research_required: Object.values(coverage).some((x) => x.status !== "COVERED")
    };
  }).sort((a, b) => b.priority_score - a.priority_score || b.gap_count - a.gap_count || a.label.localeCompare(b.label, "ja"));
}

function statusShort(status) {
  return ({ COVERED: "○", PARTIAL: "△", MISSING_IN_APP: "×" })[status] || "?";
}

function toMarkdown(result) {
  const lines = [
    "# 自治体別 行政ニーズ・カバレッジ差分",
    "",
    `生成: ${result.generated_at}`,
    "",
    "> × は「行政制度が存在しない」ではなく「現在のアプリ収録データで確認できない」の意味です。実装前に公式情報を調査します。",
    "",
    "| 優先 | 共通ニーズ | 半田 | 名古屋 | 大府 | 次工程 |",
    "|---:|---|:---:|:---:|:---:|---|"
  ];
  result.matrix.forEach((row, index) => {
    const next = row.research_required ? "公式調査" : "維持";
    lines.push(`| ${index + 1} | ${row.label} | ${statusShort(row.coverage.handa.status)} | ${statusShort(row.coverage.nagoya.status)} | ${statusShort(row.coverage.obu.status)} | ${next} |`);
  });
  lines.push("", "## 優先調査バックログ", "");
  for (const row of result.matrix.filter((x) => x.research_required)) {
    const gaps = Object.entries(row.coverage)
      .filter(([, value]) => value.status !== "COVERED")
      .map(([key, value]) => `${key}=${value.status}`)
      .join(", ");
    lines.push(`- **${row.label}** — ${gaps}; 必要Context: ${(row.required_context || []).join(" / ") || "なし"}`);
  }
  lines.push("", "## 判定凡例", "", "- ○ COVERED: 公式確認済みレコードに強一致", "- △ PARTIAL: 弱一致、または公式確認状態が十分でない", "- × MISSING_IN_APP: 現在の収録データに一致なし", "");
  return lines.join("\n");
}

function parseArgs(argv) {
  const out = { nagoyaRoot: path.resolve(repoRoot, "..", "kore-dousuru-nagoya"), outDir: path.join(repoRoot, "artifacts", "coverage") };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--nagoya-root") out.nagoyaRoot = path.resolve(argv[++i]);
    else if (argv[i] === "--out") out.outDir = path.resolve(argv[++i]);
  }
  return out;
}

export function run({ nagoyaRoot, outDir }) {
  const taxonomy = readJson(taxonomyPath);
  const sources = {
    handa: loadHanda(repoRoot),
    nagoya: loadNagoya(nagoyaRoot),
    obu: loadObu(repoRoot)
  };
  const result = {
    generated_at: new Date().toISOString(),
    taxonomy_version: "v0.1",
    source_counts: Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, v.length])),
    semantics: { missing: "MISSING_IN_APP means not found in current app data, not that the public service does not exist." },
    matrix: buildMatrix(taxonomy, sources)
  };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "coverage-matrix.json"), JSON.stringify(result, null, 2) + "\n");
  fs.writeFileSync(path.join(outDir, "coverage-matrix.md"), toMarkdown(result) + "\n");
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = run(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify({
    source_counts: result.source_counts,
    top_gaps: result.matrix.slice(0, 10).map((x) => ({
      need_id: x.need_id,
      label: x.label,
      handa: x.coverage.handa.status,
      nagoya: x.coverage.nagoya.status,
      obu: x.coverage.obu.status,
      priority_score: x.priority_score
    }))
  }, null, 2));
}
