import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "municipalities", "tokai", "config.json"), "utf8"));
const procedures = JSON.parse(fs.readFileSync(path.join(root, "municipalities", "tokai", "data", "procedures.json"), "utf8"));
const app = fs.readFileSync(path.join(root, "src", "app", "app.js"), "utf8");
const page = fs.readFileSync(path.join(root, "tokai", "index.html"), "utf8");

test("Tokai uses the shared application with municipality config override", () => {
  assert.equal(config.municipality_id, "tokai");
  assert.equal(config.features.waste_enabled, false);
  assert.match(app, /window\.KORE_DOUSURU_CONFIG_PATH/);
  assert.match(page, /KORE_DOUSURU_CONFIG_PATH="\.\.\/municipalities\/tokai\/config\.json"/);
  assert.match(page, /\.\.\/src\/app\/app\.js/);
  assert.doesNotMatch(page, /support-overlay|coverage-gap-overlay/);
});

test("Tokai UI exposes resident-language entry points without a waste catalog", () => {
  assert.equal(procedures.length, 27);
  assert.deepEqual(config.quick_queries, ["家賃払えない", "子どもが熱", "高額療養費", "騒音"]);
  assert.match(app, /features\?\.waste_enabled === false/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, "municipalities", "tokai", "data", "waste_items.json"), "utf8")).length, 0);
});
test("Tokai verified routes include high-risk and daily-life queries", () => {
  const aliases = new Map();
  for (const record of procedures) {
    for (const alias of record.aliases || []) aliases.set(alias, record.procedure_id);
  }
  assert.equal(aliases.get("騒音"), "tokai-proc-noise-odor");
  assert.equal(aliases.get("子どもが熱"), "tokai-proc-pediatric-emergency");
  assert.equal(aliases.get("高額療養費"), "tokai-proc-high-cost-medical");
  assert.equal(aliases.get("家賃払えない"), "tokai-proc-livelihood");
});

test("Tokai does not expose unverified road-damage or outage routes", () => {
  assert.equal(procedures.some((x) => x.procedure_id.includes("roads")), false);
  assert.equal(procedures.some((x) => x.procedure_id.includes("outage")), false);
});

test("shared app keeps Obu as the fallback config", () => {
  assert.match(app, /KORE_DOUSURU_CONFIG_PATH \|\| "\.\.\/\.\.\/municipalities\/obu\/config\.json"/);
});
