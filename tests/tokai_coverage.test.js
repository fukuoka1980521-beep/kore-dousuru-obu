import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchNeed } from "../scripts/build_coverage_matrix.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "..");
const records = JSON.parse(fs.readFileSync(path.join(root, "municipalities", "tokai", "data", "procedures.json"), "utf8"));
const seeds = JSON.parse(fs.readFileSync(path.join(root, "tools", "coverage", "tokai-source-seeds.json"), "utf8"));
const taxonomy = JSON.parse(fs.readFileSync(path.join(root, "tools", "coverage", "need-taxonomy.json"), "utf8"));

test("Tokai horizontal pack has 27 verified routes and 29 local-rule checks", () => {
  assert.equal(records.length, 27);
  assert.equal(seeds.length, 29);
  assert.equal(new Set(records.map((x) => x.procedure_id)).size, 27);
  assert.equal(seeds.filter((x) => x.local_gate === "NEEDS_AUTHORITY_CONFIRMATION").length, 2);
  assert.equal(seeds.filter((x) => x.local_gate === "PASS_RULES_MODELED").length, 27);
});

test("Tokai records only use current official city sources", () => {
  for (const record of records) {
    assert.equal(record.status, "CONFIRMED_OFFICIAL");
    assert.match(record.official_url, /^https:\/\/www\.city\.tokai\.aichi\.jp\//);
    assert.equal(record.source_checked_at, "2026-10-01");
  }
});test("Tokai intentionally leaves roads and outage fail-closed", () => {
  const roadSeed = seeds.find((x) => x.need_id === "roads_damage");
  const outageSeed = seeds.find((x) => x.need_id === "water_outage");
  assert.equal(roadSeed.local_gate, "NEEDS_AUTHORITY_CONFIRMATION");
  assert.equal(outageSeed.local_gate, "NEEDS_AUTHORITY_CONFIRMATION");
  assert.equal(records.some((x) => /道路の穴|側溝/.test(x.name)), false);
  assert.equal(records.some((x) => /断水|水が出ない/.test(x.name)), false);
});

test("Tokai high-cost medical route is insurer-dependent", () => {
  const record = records.find((x) => x.procedure_id === "tokai-proc-high-cost-medical");
  assert.match(record.conclusion, /加入している健康保険/);
  assert.match(record.conclusion, /国保以外/);
});

test("Tokai can cover 27 of 29 common needs without municipality-specific taxonomy changes", () => {
  const results = taxonomy.map((need) => [need.need_id, matchNeed(need, records)]);
  const covered = results.filter(([, result]) => result.status === "COVERED").map(([id]) => id);
  const missing = results.filter(([, result]) => result.status !== "COVERED").map(([id]) => id).sort();
  assert.equal(covered.length, 27);
  assert.deepEqual(missing, ["roads_damage", "water_outage"]);
});

test("Tokai source seeds stay municipality-bound", () => {
  for (const seed of seeds) {
    assert.equal(seed.municipality_id, "tokai");
    assert.ok(seed.official_sources.length >= 1);
    for (const source of seed.official_sources) {
      assert.equal(new URL(source.url).hostname, "www.city.tokai.aichi.jp");
    }
  }
});
