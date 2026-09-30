import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const taxonomyPath = path.join(repoRoot, "tools", "coverage", "need-taxonomy.json");
const sourceSeedsPath = path.join(repoRoot, "tools", "coverage", "official-source-seeds.json");
const tokaiSeedsPath = path.join(repoRoot, "tools", "coverage", "tokai-source-seeds.json");

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

function gitIdentity(root) {
  const run = (...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  try {
    return {
      root: path.resolve(root),
      head: run("rev-parse", "HEAD"),
      branch: run("rev-parse", "--abbrev-ref", "HEAD"),
      dirty: run("status", "--porcelain").length > 0
    };
  } catch {
    return { root: path.resolve(root), head: null, branch: null, dirty: null };
  }
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
    const confirmed = record.status === "CONFIRMED_OFFICIAL";
    const bestConfirmed = best?.record?.status === "CONFIRMED_OFFICIAL";
    const levelRank = matchLevel === "STRONG" ? 2 : matchLevel === "WEAK" ? 1 : 0;
    const bestLevelRank = best?.matchLevel === "STRONG" ? 2 : best?.matchLevel === "WEAK" ? 1 : 0;
    if (
      score &&
      (
        !best ||
        levelRank > bestLevelRank ||
        (
          levelRank === bestLevelRank &&
          confirmed &&
          !bestConfirmed
        ) ||
        (
          levelRank === bestLevelRank &&
          confirmed === bestConfirmed &&
          score > best.score
        )
      )
    ) {
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

function loadBrowserScriptRecords(file, globalName) {
  if (!fs.existsSync(file)) return [];
  const context = {
    window: {
      KoreDousuruCore: {
        loadMunicipality: async () => ({ config: {}, wasteItems: [], procedures: [], lifeEvents: [], offices: [], branchJurisdiction: [] }),
        searchProcedures: () => []
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
  const value = context.window[globalName];
  const records = Array.isArray(value) ? value : value?.records;
  return records ? JSON.parse(JSON.stringify(records)) : [];
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
  const gapFile = path.join(root, "handa", "coverage-gap-records.js");
  const gaps = loadBrowserScriptRecords(gapFile, "__HANDA_COVERAGE_GAP_RECORDS__");
  return [
    ...tagged(procedures, "procedure", "handa/index.html#embedded-procedures"),
    ...tagged(events, "life_event", "handa/index.html#embedded-events"),
    ...tagged(gaps, "coverage_gap_record", path.relative(root, gapFile))
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
  const gapFile = path.join(root, "src", "app", "coverage-gap-overlay.js");
  const gaps = loadBrowserScriptRecords(gapFile, "__KORE_DOUSURU_COVERAGE_GAP_OVERLAY__");
  return [
    ...tagged(procedures, "procedure", path.relative(root, proceduresFile)),
    ...tagged(supports, "support_overlay", path.relative(root, overlayFile)),
    ...tagged(readJsonIfExists(eventsFile), "life_event", path.relative(root, eventsFile)),
    ...tagged(gaps, "coverage_gap_overlay", path.relative(root, gapFile))
  ];
}

function loadNagoya(root) {
  const base = path.join(root, "municipalities", "nagoya", "data");
  const files = [
    ["procedures.json", "procedure"],
    ["support_guides.json", "support_guide"],
    ["life_events.json", "life_event"]
  ];
  const records = files.flatMap(([name, type]) => tagged(readJsonIfExists(path.join(base, name)), type, path.join("municipalities", "nagoya", "data", name)));
  const supportFile = path.join(root, "src", "app", "support-overlay.js");
  const supports = loadBrowserScriptRecords(supportFile, "__KORE_DOUSURU_SUPPORT_OVERLAY__");
  const gapFile = path.join(root, "src", "app", "coverage-gap-overlay.js");
  const gaps = loadBrowserScriptRecords(gapFile, "__KORE_DOUSURU_COVERAGE_GAP_OVERLAY__");
  return [
    ...records,
    ...tagged(supports, "support_overlay", path.relative(root, supportFile)),
    ...tagged(gaps, "coverage_gap_overlay", path.relative(root, gapFile))
  ];
}

function loadTokai(root) {
  const base = path.join(root, "municipalities", "tokai", "data");
  const files = [
    ["procedures.json", "procedure"],
    ["life_events.json", "life_event"]
  ];
  return files.flatMap(([name, type]) =>
    tagged(readJsonIfExists(path.join(base, name)), type, path.join("municipalities", "tokai", "data", name))
  );
}
function riskWeight(risk) {
  return ({ SAFETY: 5, FINANCIAL: 4, DEADLINE: 4, CARE: 3, QUALITY_OF_LIFE: 2, BUSINESS: 2, ADMIN: 1 })[risk] || 1;
}

function seedIndex(seeds) {
  return new Map(seeds.map((seed) => [`${seed.need_id}:${seed.municipality_id}`, seed]));
}

function nextAction(cell, seed) {
  if (cell.status === "COVERED") return "MAINTAIN";
  if (!seed) return "OFFICIAL_RESEARCH_REQUIRED";
  if (seed.local_gate === "NEEDS_AUTHORITY_CONFIRMATION") return "AUTHORITY_CONFIRMATION_REQUIRED";
  if (seed.local_gate === "SOURCE_CONFLICT") return "SOURCE_CONFLICT";
  if (seed.local_gate === "PASS_NONE_FOUND" || seed.local_gate === "PASS_RULES_MODELED") return "IMPLEMENTATION_READY";
  return "OFFICIAL_RESEARCH_REQUIRED";
}

export function buildMatrix(taxonomy, sources, seeds = []) {
  const seedsByKey = seedIndex(seeds);
  return taxonomy.map((need) => {
    const coverage = {};
    let gapScore = 0;
    for (const [municipality, records] of Object.entries(sources)) {
      const cell = matchNeed(need, records);
      const seed = seedsByKey.get(`${need.need_id}:${municipality}`) || null;
      cell.next_action = nextAction(cell, seed);
      cell.research = seed;
      coverage[municipality] = cell;
      if (cell.status === "MISSING_IN_APP") gapScore += 3;
      else if (cell.status === "PARTIAL") gapScore += 1;
    }
    const priority_score = gapScore * riskWeight(need.risk);
    return {
      ...need,
      coverage,
      gap_count: Object.values(coverage).filter((x) => x.status !== "COVERED").length,
      implementation_ready_count: Object.values(coverage).filter((x) => x.next_action === "IMPLEMENTATION_READY").length,
      authority_confirmation_count: Object.values(coverage).filter((x) => x.next_action === "AUTHORITY_CONFIRMATION_REQUIRED").length,
      priority_score,
      research_required: Object.values(coverage).some((x) => x.next_action === "OFFICIAL_RESEARCH_REQUIRED")
    };
  }).sort((a, b) => b.priority_score - a.priority_score || b.implementation_ready_count - a.implementation_ready_count || b.gap_count - a.gap_count || a.label.localeCompare(b.label, "ja"));
}

function statusShort(status) {
  return ({ COVERED: "○", PARTIAL: "△", MISSING_IN_APP: "×" })[status] || "?";
}

function actionShort(action) {
  return ({ MAINTAIN: "維持", IMPLEMENTATION_READY: "実装可", AUTHORITY_CONFIRMATION_REQUIRED: "要行政確認", OFFICIAL_RESEARCH_REQUIRED: "要公式調査", SOURCE_CONFLICT: "情報矛盾" })[action] || action;
}

function cellShort(cell) {
  const base = statusShort(cell.status);
  return cell.next_action === "MAINTAIN" ? base : `${base}→${actionShort(cell.next_action)}`;
}

function toMarkdown(result) {
  const labels = result.municipality_labels || {};
  const order = result.municipality_order || Object.keys(result.source_counts || {});
  const headerNames = order.map((key) => labels[key] || key);
  const lines = [
    "# 自治体別 行政ニーズ・カバレッジ差分",
    "",
    `生成: ${result.generated_at}`,
    "",
    "> × は「行政制度が存在しない」ではなく「現在のアプリ収録データで確認できない」の意味です。実装前に公式情報を調査します。",
    "",
    `| 優先 | 共通ニーズ | ${headerNames.join(" | ")} | 次工程 |`,
    `|---:|---|${order.map(() => ":---:|").join("")}---|`
  ];
  result.matrix.forEach((row, index) => {
    const actions = [...new Set(Object.values(row.coverage).map((cell) => cell.next_action).filter((x) => x !== "MAINTAIN"))];
    const next = actions.length ? actions.map(actionShort).join(" / ") : "維持";
    const cells = order.map((key) => cellShort(row.coverage[key]));
    lines.push(`| ${index + 1} | ${row.label} | ${cells.join(" | ")} | ${next} |`);
  });
  lines.push("", "## 優先調査バックログ", "");
  for (const row of result.matrix.filter((x) => Object.values(x.coverage).some((cell) => cell.next_action !== "MAINTAIN"))) {
    const gaps = Object.entries(row.coverage)
      .filter(([, value]) => value.next_action !== "MAINTAIN")
      .map(([key, value]) => `${key}=${value.status}/${value.next_action}`)
      .join(", ");
    lines.push(`- **${row.label}** — ${gaps}; 必要Context: ${(row.required_context || []).join(" / ") || "なし"}`);
  }
  if (result.authority_confirmation_candidates.length) {
    lines.push("", "## 行政確認候補", "");
    for (const item of result.authority_confirmation_candidates) {
      lines.push(`- **${item.municipality_id} / ${item.need_id}** — ${item.question}（確認先: ${item.contact}）`);
    }
  }
  lines.push("", "## 判定凡例", "", "- ○ COVERED: 公式確認済みレコードに強一致", "- △ PARTIAL: 弱一致、または公式確認状態が十分でない", "- × MISSING_IN_APP: 現在の収録データに一致なし", "- 実装可: 公式根拠と自治体固有ルール確認が揃い、実装候補に進める", "- 要行政確認: 公式情報だけでは住民向け導線を安全に確定できない", "- 要公式調査: 公式根拠の調査が未完了", "");
  return lines.join("\n");
}

function parseArgs(argv) {
  const out = { nagoyaRoot: path.resolve(repoRoot, "..", "kore-dousuru-nagoya"), outDir: path.join(repoRoot, "artifacts", "coverage") };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--nagoya-root") out.nagoyaRoot = path.resolve(argv[++i]);
    else if (argv[i].startsWith("--nagoya-root=")) out.nagoyaRoot = path.resolve(argv[i].slice("--nagoya-root=".length));
    else if (argv[i] === "--out") out.outDir = path.resolve(argv[++i]);
    else if (argv[i].startsWith("--out=")) out.outDir = path.resolve(argv[i].slice("--out=".length));
  }
  return out;
}

export function run({ nagoyaRoot, outDir }) {
  const taxonomy = readJson(taxonomyPath);
  const seeds = [...readJson(sourceSeedsPath), ...readJsonIfExists(tokaiSeedsPath)];
  const sources = {
    handa: loadHanda(repoRoot),
    nagoya: loadNagoya(nagoyaRoot),
    obu: loadObu(repoRoot),
    tokai: loadTokai(repoRoot)
  };
  const municipalityLabels = { handa: "半田", nagoya: "名古屋", obu: "大府", tokai: "東海" };
  const municipalityOrder = Object.keys(sources);
  const result = {
    generated_at: new Date().toISOString(),
    taxonomy_version: "v0.2",
    municipality_labels: municipalityLabels,
    municipality_order: municipalityOrder,
    source_identity: {
      obu_handa_tokai: gitIdentity(repoRoot),
      nagoya: gitIdentity(nagoyaRoot)
    },
    source_counts: Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, v.length])),
    semantics: { missing: "MISSING_IN_APP means not found in current app data, not that the public service does not exist." },
    research_seed_count: seeds.length,
    authority_confirmation_candidates: seeds
      .filter((seed) => seed.local_gate === "NEEDS_AUTHORITY_CONFIRMATION")
      .map((seed) => ({
        need_id: seed.need_id,
        municipality_id: seed.municipality_id,
        question: seed.authority_question,
        contact: seed.authority_contact,
        why_needed: seed.why_needed
      })),
    matrix: buildMatrix(taxonomy, sources, seeds)
  };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "coverage-matrix.json"), JSON.stringify(result, null, 2) + "\n");
  fs.writeFileSync(path.join(outDir, "coverage-matrix.md"), toMarkdown(result) + "\n");
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = run(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify({
    source_identity: result.source_identity,
    source_counts: result.source_counts,
    authority_confirmation_candidates: result.authority_confirmation_candidates,
    top_gaps: result.matrix.slice(0, 10).map((x) => ({
      need_id: x.need_id,
      label: x.label,
      coverage: Object.fromEntries(Object.entries(x.coverage).map(([k, v]) => [k, v.status])),
      next_actions: Object.fromEntries(Object.entries(x.coverage).map(([k, v]) => [k, v.next_action])),
      priority_score: x.priority_score
    }))
  }, null, 2));
}
