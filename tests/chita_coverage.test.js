import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchNeed } from "../scripts/build_coverage_matrix.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "..");
const records = JSON.parse(fs.readFileSync(path.join(root, "municipalities", "chita", "data", "procedures.json"), "utf8"));
const seeds = JSON.parse(fs.readFileSync(path.join(root, "tools", "coverage", "chita-source-seeds.json"), "utf8"));
const taxonomy = JSON.parse(fs.readFileSync(path.join(root, "tools", "coverage", "need-taxonomy.json"), "utf8"));

test("Chita horizontal pack has 27 verified routes and 29 local-rule checks", () => {
  assert.equal(records.length, 27);
  assert.equal(seeds.length, 29);
  assert.equal(new Set(records.map((x) => x.procedure_id)).size, 27);
  assert.equal(seeds.filter((x) => x.local_gate === "NEEDS_AUTHORITY_CONFIRMATION").length, 2);
  assert.equal(seeds.filter((x) => x.local_gate === "PASS_RULES_MODELED").length, 27);
});

test("Chita records only use current official city sources", () => {
  for (const record of records) {
    assert.equal(record.status, "CONFIRMED_OFFICIAL");
    assert.match(record.official_url, /^https:\/\/www\.city\.chita\.lg\.jp\//);
    assert.equal(record.source_checked_at, "2026-10-01");
  }
});

test("Chita intentionally leaves sudden outage and noise/odor fail-closed", () => {
  const pending = seeds.filter((x) => x.local_gate === "NEEDS_AUTHORITY_CONFIRMATION").map((x) => x.need_id).sort();
  assert.deepEqual(pending, ["noise_odor_neighbor", "water_outage"]);
  assert.equal(records.some((x) => /断水|水が出ない/.test(x.name)), false);
  assert.equal(records.some((x) => /騒音|悪臭/.test(x.name)), false);
});

test("Chita high-cost medical route asks for insurer context", () => {
  const record = records.find((x) => x.procedure_id === "chita-proc-high-cost-medical");
  assert.match(record.conclusion, /加入している健康保険/);
  assert.match(record.conclusion, /国保以外/);
});

test("Chita covers 27 of 29 common needs without taxonomy changes", () => {
  const results = taxonomy.map((need) => [need.need_id, matchNeed(need, records)]);
  const covered = results.filter(([, result]) => result.status === "COVERED").map(([id]) => id);
  const missing = results.filter(([, result]) => result.status !== "COVERED").map(([id]) => id).sort();
  assert.equal(covered.length, 27);
  assert.deepEqual(missing, ["noise_odor_neighbor", "water_outage"]);
});

test("Chita road damage is already official-routable by LINE", () => {
  const road = records.find((x) => x.procedure_id === "chita-proc-roads");
  assert.match(road.conclusion, /公式LINE/);
  assert.equal(road.phone, "0562-36-2670");
});

test("Chita bulky waste retains current fee and deadline", () => {
  const bulky = records.find((x) => x.procedure_id === "chita-proc-oversized-waste");
  assert.match(bulky.fee, /550円/);
  assert.match(bulky.deadline, /2営業日前/);
});

test("Chita source seeds stay municipality-bound", () => {
  for (const seed of seeds) {
    assert.equal(seed.municipality_id, "chita");
    assert.ok(seed.official_sources.length >= 1);
    for (const source of seed.official_sources) {
      assert.equal(new URL(source.url).hostname, "www.city.chita.lg.jp");
    }
  }
});
