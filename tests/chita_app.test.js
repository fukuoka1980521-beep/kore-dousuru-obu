import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "municipalities", "chita", "config.json"), "utf8"));
const procedures = JSON.parse(fs.readFileSync(path.join(root, "municipalities", "chita", "data", "procedures.json"), "utf8"));
const page = fs.readFileSync(path.join(root, "chita", "index.html"), "utf8");

test("Chita uses the shared application with config override", () => {
  assert.equal(config.municipality_id, "chita");
  assert.equal(config.features.waste_enabled, false);
  assert.match(page, /KORE_DOUSURU_CONFIG_PATH="\.\.\/municipalities\/chita\/config\.json"/);
  assert.match(page, /\.\.\/src\/app\/app\.js/);
});

test("Chita UI exposes resident-language entry points without waste catalog", () => {
  assert.equal(procedures.length, 27);
  assert.deepEqual(config.quick_queries, ["粗大ごみ", "子どもが熱", "高額療養費", "家賃払えない"]);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, "municipalities", "chita", "data", "waste_items.json"), "utf8")).length, 0);
});

test("Chita verified routes include safety and daily-life queries", () => {
  const aliases = new Map();
  for (const record of procedures) for (const alias of record.aliases || []) aliases.set(alias, record.procedure_id);
  assert.equal(aliases.get("道路の穴"), "chita-proc-roads");
  assert.equal(aliases.get("子どもが熱"), "chita-proc-pediatric-emergency");
  assert.equal(aliases.get("高額療養費"), "chita-proc-high-cost-medical");
  assert.equal(aliases.get("家賃払えない"), "chita-proc-livelihood");
  assert.equal(aliases.get("粗大ごみ"), "chita-proc-oversized-waste");
});
